#!/usr/bin/env python3
"""Contador automático local da Central de Livrinhos.

Funciona 100% no computador da pessoa (127.0.0.1:8765), sem internet e sem IA.
Confere SÓ O NOME do documento aberto no Word/Pages (ou do arquivo extra)
contra os arquivos/palavras-chave marcados em cada livro da Estante.
Se não pertencer a nenhum livro, ignora sem nem ler o documento.
Quando pertence, pede apenas números ao módulo isolado `contar_palavras.py`.
"""

from __future__ import annotations

import argparse
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
import os
import subprocess
import sys
import threading
import time
from urllib.parse import urlparse
import webbrowser

import contar_palavras

HOST = "127.0.0.1"
PORTA = 8765
INTERVALO_SEGUNDOS = 30
# Quando a Fase 4 publicar no GitHub Pages, coloque aqui APENAS o endereço oficial (ex.: "https://usuario.github.io").
ORIGEM_GITHUB_PAGES = ""
PASTA_BASE = os.path.dirname(os.path.abspath(__file__))
ARQUIVO_CONFIG = os.path.join(PASTA_BASE, ".contador_config.json")


def origens_permitidas(porta: int = PORTA) -> tuple[str, ...]:
    """Lista exata de endereços da própria Central autorizados a falar com o contador local."""
    lista = [f"http://127.0.0.1:{porta}", f"http://localhost:{porta}"]
    oficial = ORIGEM_GITHUB_PAGES.strip().rstrip("/")
    if oficial:
        lista.append(oficial)
    return tuple(lista)


def _normalizar_lista_texto(valor: object) -> list[str]:
    if not isinstance(valor, list):
        return []
    saida: list[str] = []
    vistos: set[str] = set()
    for item in valor:
        limpo = str(item or "").strip()
        chave = limpo.lower()
        if limpo and chave not in vistos:
            vistos.add(chave)
            saida.append(limpo)
    return saida


def _normalizar_livros(livros_brutos: object) -> list[dict[str, object]]:
    if not isinstance(livros_brutos, list):
        return []
    saida: list[dict[str, object]] = []
    for item in livros_brutos:
        if not isinstance(item, dict):
            continue
        livro_id = str(item.get("id") or "").strip()
        nome = str(item.get("nome") or "").strip()
        if not livro_id or not nome:
            continue
        saida.append(
            {
                "id": livro_id,
                "nome": nome,
                "arquivosMarcados": _normalizar_lista_texto(item.get("arquivosMarcados")),
                "palavrasChave": _normalizar_lista_texto(item.get("palavrasChave")),
            }
        )
    return saida


def encontrar_livro_para_documento(nome_doc: str, livros: list[dict[str, object]]) -> dict[str, str] | None:
    """Confere SÓ O NOME do documento contra os arquivos marcados e palavras-chave da Estante."""
    base = os.path.basename(str(nome_doc or "")).strip()
    if not base:
        return None

    base_lower = base.lower()
    base_stem, base_ext = os.path.splitext(base_lower)

    # 1º: tenta correspondência com os arquivos explicitamente marcados em cada livro
    for livro in livros:
        for marcado in livro.get("arquivosMarcados") or []:
            marcado_base = os.path.basename(str(marcado)).strip().lower()
            if not marcado_base:
                continue
            marcado_stem, marcado_ext = os.path.splitext(marcado_base)
            if base_lower == marcado_base:
                return {"id": str(livro["id"]), "nome": str(livro["nome"])}
            if (not base_ext or not marcado_ext) and base_stem == marcado_stem:
                return {"id": str(livro["id"]), "nome": str(livro["nome"])}

    # 2º: tenta palavras-chave opcionais no nome do documento (ex.: "Trilha", "cap")
    for livro in livros:
        for kw in livro.get("palavrasChave") or []:
            kw_limpa = str(kw).strip().lower()
            if kw_limpa and kw_limpa in base_lower:
                return {"id": str(livro["id"]), "nome": str(livro["nome"])}

    return None


def abrir_seletor_arquivo_local() -> str | None:
    """Abre seletor de arquivo local apenas se a pessoa usar a opção extra."""
    if sys.platform != "darwin":
        return None
    script = '''
try
    set arq to choose file of type {"public.plain-text", "net.daringfireball.markdown", "org.openxmlformats.wordprocessingml.document", "org.oasis-open.opendocument.text", "com.apple.iwork.pages.pages", "com.apple.iwork.pages.sffpages", "txt", "md", "docx", "odt", "pages"} with prompt "Escolha um arquivo de livro (nenhum texto sai do computador):"
    return POSIX path of arq
on error number -128
    return "__CANCELADO__"
end try
'''
    saida = contar_palavras._rodar_applescript(script, timeout=120)
    if not saida or saida == "__CANCELADO__":
        return None
    return saida


class EstadoContador:
    """Mantém só regras de nomes de livros, pausa e números da última leitura."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        cfg = self._carregar_config()
        self.pausado: bool = bool(cfg.get("pausado", False))
        self.arquivo_extra_manual: str = str(cfg.get("arquivoExtraManual") or "")
        self.livros: list[dict[str, object]] = _normalizar_livros(cfg.get("livros"))
        self.ultima_leitura_ts = 0.0
        self.status: dict[str, object] = {
            "ativo": True,
            "pausado": self.pausado,
            "estado": "pausado" if self.pausado else "aguardando",
            "modo": "",
            "arquivoNome": "",
            "livroId": None,
            "livroNome": None,
            "palavras": None,
            "tamanhoBytes": None,
            "modificadoEm": None,
            "ultimaLeituraHora": None,
            "intervaloSegundos": INTERVALO_SEGUNDOS,
            "erro": None,
        }

    def _carregar_config(self) -> dict[str, object]:
        try:
            with open(ARQUIVO_CONFIG, "r", encoding="utf-8") as f:
                dados = json.load(f)
            if not isinstance(dados, dict):
                return {}
            # Migração suave caso exista config antiga só com "fonte"
            if "arquivoExtraManual" not in dados and isinstance(dados.get("fonte"), str):
                fonte_antiga = dados.get("fonte", "").strip()
                if fonte_antiga and not fonte_antiga.startswith("@app:"):
                    dados["arquivoExtraManual"] = fonte_antiga
            return dados
        except (OSError, ValueError, TypeError):
            return {}

    def _salvar_config(self) -> None:
        # Grava apenas configurações e nomes dos livros/arquivos (nunca texto de livros)
        payload: dict[str, object] = {
            "pausado": self.pausado,
            "arquivoExtraManual": self.arquivo_extra_manual,
            "livros": self.livros,
        }
        try:
            with open(ARQUIVO_CONFIG, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)
        except OSError:
            pass

    def atualizar_regras_livros(self, livros_brutos: object) -> dict[str, object]:
        with self._lock:
            self.livros = _normalizar_livros(livros_brutos)
            self._salvar_config()
            self.ultima_leitura_ts = 0.0
        return self.atualizar_se_preciso(forcar=True)

    def definir_pausado(self, pausado: bool | None = None) -> dict[str, object]:
        with self._lock:
            self.pausado = (not self.pausado) if pausado is None else bool(pausado)
            self._salvar_config()
            self.ultima_leitura_ts = 0.0
        return self.atualizar_se_preciso(forcar=True)

    def definir_fonte(self, nova_fonte: str | None = None) -> dict[str, object]:
        with self._lock:
            if nova_fonte is not None:
                limpa = str(nova_fonte).strip()
                if limpa.startswith("@app:"):
                    self.arquivo_extra_manual = ""
                else:
                    self.arquivo_extra_manual = limpa
            self._salvar_config()
            self.ultima_leitura_ts = 0.0
        return self.atualizar_se_preciso(forcar=True)

    def _descobrir_documento_ativo(
        self, livros_alvo: list[dict[str, object]] | None = None
    ) -> tuple[str, str, str | None] | None:
        """Retorna apenas (nome_exibicao, modo, caminho_disco) sem ler texto algum."""
        regras = self.livros if livros_alvo is None else livros_alvo
        docs_mac = (
            contar_palavras.obter_documentos_abertos_mac()
            if hasattr(contar_palavras, "obter_documentos_abertos_mac")
            else []
        )
        doc_frente = contar_palavras.obter_nome_documento_aberto_mac()

        candidatos: list[tuple[str, str]] = []
        if doc_frente and doc_frente not in docs_mac:
            candidatos.append(doc_frente)
        candidatos.extend(docs_mac)

        if candidatos:
            for nome_doc, modo in candidatos:
                if encontrar_livro_para_documento(nome_doc, regras):
                    return nome_doc, modo, None
            nome_doc, modo = candidatos[0]
            return nome_doc, modo, None

        if self.arquivo_extra_manual:
            return os.path.basename(self.arquivo_extra_manual), "arquivo", self.arquivo_extra_manual

        return None

    def atualizar_se_preciso(self, forcar: bool = False) -> dict[str, object]:
        with self._lock:
            agora = time.time()
            if (
                not forcar
                and (agora - self.ultima_leitura_ts) < INTERVALO_SEGUNDOS
                and self.status.get("ultimaLeituraHora")
            ):
                return dict(self.status)

            pausado_atual = self.pausado
            livros_copia = list(self.livros)
            extra_atual = self.arquivo_extra_manual

        hora = datetime.now().strftime("%H:%M:%S")

        if pausado_atual:
            novo_status: dict[str, object] = {
                "ativo": True,
                "pausado": True,
                "estado": "pausado",
                "modo": "",
                "arquivoNome": "",
                "livroId": None,
                "livroNome": None,
                "palavras": None,
                "tamanhoBytes": None,
                "modificadoEm": None,
                "ultimaLeituraHora": hora,
                "intervaloSegundos": INTERVALO_SEGUNDOS,
                "erro": None,
            }
        else:
            doc_ativo = self._descobrir_documento_ativo(livros_copia)
            if not doc_ativo:
                novo_status = {
                    "ativo": True,
                    "pausado": False,
                    "estado": "aguardando",
                    "modo": "",
                    "arquivoNome": "",
                    "livroId": None,
                    "livroNome": None,
                    "palavras": None,
                    "tamanhoBytes": None,
                    "modificadoEm": None,
                    "ultimaLeituraHora": hora,
                    "intervaloSegundos": INTERVALO_SEGUNDOS,
                    "erro": None,
                }
            else:
                nome_doc, modo, caminho_disco = doc_ativo
                livro_corresp = encontrar_livro_para_documento(nome_doc, livros_copia)

                # REGRA MÁXIMA: se o nome não está marcado em nenhum livro, IGNORA sem ler o texto.
                if not livro_corresp:
                    novo_status = {
                        "ativo": True,
                        "pausado": False,
                        "estado": "ignorado",
                        "modo": modo,
                        "arquivoNome": nome_doc,
                        "livroId": None,
                        "livroNome": None,
                        "palavras": None,
                        "tamanhoBytes": None,
                        "modificadoEm": None,
                        "ultimaLeituraHora": hora,
                        "intervaloSegundos": INTERVALO_SEGUNDOS,
                        "erro": None,
                    }
                else:
                    try:
                        if modo == "word":
                            try:
                                palavras = contar_palavras.contar_palavras_word_aberto_mac(nome_doc)
                            except TypeError:
                                palavras = contar_palavras.contar_palavras_word_aberto_mac()
                            try:
                                tamanho = contar_palavras.obter_tamanho_word_aberto_mac(nome_doc)
                            except TypeError:
                                tamanho = contar_palavras.obter_tamanho_word_aberto_mac()
                            mod_ts = None
                        elif modo == "pages":
                            palavras = contar_palavras.contar_palavras_pages_aberto_mac(nome_doc)
                            tamanho = contar_palavras.obter_tamanho_pages_aberto_mac(nome_doc)
                            mod_ts = None
                        else:
                            if not caminho_disco or not os.path.exists(caminho_disco):
                                raise FileNotFoundError(f"Arquivo não encontrado: {nome_doc}")
                            palavras, tamanho, mod_ts = contar_palavras.contar_palavras_arquivo_disco(caminho_disco)

                        novo_status = {
                            "ativo": True,
                            "pausado": False,
                            "estado": "contando",
                            "modo": modo,
                            "arquivoNome": nome_doc,
                            "livroId": livro_corresp["id"],
                            "livroNome": livro_corresp["nome"],
                            "palavras": palavras,
                            "tamanhoBytes": tamanho,
                            "modificadoEm": mod_ts,
                            "ultimaLeituraHora": hora,
                            "intervaloSegundos": INTERVALO_SEGUNDOS,
                            "erro": None,
                        }
                    except Exception as exc:  # noqa: BLE001 (devolve mensagem segura sem parar o loop)
                        novo_status = {
                            "ativo": True,
                            "pausado": False,
                            "estado": "erro",
                            "modo": modo,
                            "arquivoNome": nome_doc,
                            "livroId": livro_corresp["id"],
                            "livroNome": livro_corresp["nome"],
                            "palavras": None,
                            "tamanhoBytes": None,
                            "modificadoEm": None,
                            "ultimaLeituraHora": hora,
                            "intervaloSegundos": INTERVALO_SEGUNDOS,
                            "erro": str(exc),
                        }

        with self._lock:
            if (
                self.pausado == pausado_atual
                and self.arquivo_extra_manual == extra_atual
                and self.livros == livros_copia
            ):
                self.status = novo_status
                self.ultima_leitura_ts = time.time()
            return dict(self.status)


ESTADO = EstadoContador()


def loop_vigilancia(parar_evento: threading.Event) -> None:
    """Atualiza a leitura automaticamente a cada 30 segundos."""
    ESTADO.atualizar_se_preciso(forcar=True)
    while not parar_evento.wait(INTERVALO_SEGUNDOS):
        ESTADO.atualizar_se_preciso(forcar=True)


class ManipuladorContador(BaseHTTPRequestHandler):
    """Servidor estritamente local (127.0.0.1) que atende só a própria Central."""

    porta_servidor = PORTA

    def log_message(self, format: str, *args: object) -> None:  # noqa: A002
        return

    def _verificar_origem_autorizada(self, exigir_para_escrita: bool = False) -> tuple[bool, str]:
        """Aceita apenas pedidos vindos da própria Central (127.0.0.1/localhost ou GitHub Pages oficial)."""
        host_cab = (self.headers.get("Host") or "").strip().lower()
        hosts_validos = {f"127.0.0.1:{self.porta_servidor}", f"localhost:{self.porta_servidor}"}
        if host_cab not in hosts_validos:
            return False, ""

        permitidas = {orig.lower(): orig for orig in origens_permitidas(self.porta_servidor)}
        origin_bruto = (self.headers.get("Origin") or "").strip().rstrip("/")
        sec_fetch_site = (self.headers.get("Sec-Fetch-Site") or "").strip().lower()
        referer_bruto = (self.headers.get("Referer") or "").strip()

        if origin_bruto:
            origem_oficial = permitidas.get(origin_bruto.lower())
            if not origem_oficial:
                return False, ""
            return True, origem_oficial

        if sec_fetch_site in ("cross-site", "same-site"):
            return False, ""

        referer_ok = False
        if referer_bruto:
            parsed_ref = urlparse(referer_bruto)
            origem_ref = (
                f"{parsed_ref.scheme.lower()}://{parsed_ref.netloc.lower()}"
                if parsed_ref.scheme and parsed_ref.netloc
                else ""
            )
            if origem_ref not in permitidas:
                return False, ""
            referer_ok = True

        if exigir_para_escrita and sec_fetch_site != "same-origin" and not referer_ok:
            return False, ""

        return True, ""

    def _descartar_corpo_nao_lido(self) -> None:
        try:
            tamanho = int(self.headers.get("Content-Length") or "0")
        except ValueError:
            tamanho = 0
        if 0 < tamanho <= 131072:
            self.rfile.read(tamanho)

    def _enviar_cabecalhos_seguros(
        self,
        status: int,
        content_type: str,
        origem_autorizada: str = "",
        content_length: int | None = None,
    ) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        if content_length is not None:
            self.send_header("Content-Length", str(content_length))
        self.send_header("Vary", "Origin")
        self.send_header("Cache-Control", "no-store")
        if origem_autorizada:
            self.send_header("Access-Control-Allow-Origin", origem_autorizada)
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Allow-Private-Network", "true")
        self.end_headers()

    def _recusar_origem(self) -> None:
        self._descartar_corpo_nao_lido()
        corpo = json.dumps({"erro": "Origem não autorizada."}, ensure_ascii=False).encode("utf-8")
        self._enviar_cabecalhos_seguros(403, "application/json; charset=utf-8", "", len(corpo))
        self.wfile.write(corpo)

    def _enviar_json(self, dados: object, status: int = 200, origem_autorizada: str = "") -> None:
        corpo = json.dumps(dados, ensure_ascii=False).encode("utf-8")
        self._enviar_cabecalhos_seguros(status, "application/json; charset=utf-8", origem_autorizada, len(corpo))
        self.wfile.write(corpo)

    def _ler_corpo_json(self) -> dict[str, object]:
        try:
            tamanho = int(self.headers.get("Content-Length") or "0")
        except ValueError:
            tamanho = 0
        if tamanho <= 0 or tamanho > 131072:
            return {}
        bruto = self.rfile.read(tamanho).decode("utf-8", errors="ignore")
        try:
            obj = json.loads(bruto)
            return obj if isinstance(obj, dict) else {}
        except ValueError:
            return {}

    def do_OPTIONS(self) -> None:  # noqa: N802
        autorizado, origem = self._verificar_origem_autorizada(exigir_para_escrita=True)
        if not autorizado or not origem:
            self._recusar_origem()
            return
        self._enviar_cabecalhos_seguros(204, "text/plain", origem, 0)

    def do_GET(self) -> None:  # noqa: N802
        autorizado, origem = self._verificar_origem_autorizada(exigir_para_escrita=False)
        if not autorizado:
            self._recusar_origem()
            return

        parsed = urlparse(self.path)
        if parsed.path == "/api/status":
            forcar = "agora=1" in (parsed.query or "")
            self._enviar_json(ESTADO.atualizar_se_preciso(forcar=forcar), origem_autorizada=origem)
            return

        caminho_rel = parsed.path.lstrip("/") or "index.html"
        if caminho_rel not in ("index.html", "style.css", "app.js"):
            self._enviar_json({"erro": "Caminho não encontrado."}, status=404, origem_autorizada=origem)
            return

        arquivo = os.path.join(PASTA_BASE, caminho_rel)
        if not os.path.isfile(arquivo):
            self._enviar_json({"erro": "Arquivo não encontrado."}, status=404, origem_autorizada=origem)
            return

        mime, _ = mimetypes.guess_type(arquivo)
        with open(arquivo, "rb") as f:
            conteudo = f.read()
        self._enviar_cabecalhos_seguros(200, f"{mime or 'text/plain'}; charset=utf-8", origem, len(conteudo))
        self.wfile.write(conteudo)

    def do_POST(self) -> None:  # noqa: N802
        autorizado, origem = self._verificar_origem_autorizada(exigir_para_escrita=True)
        if not autorizado:
            self._recusar_origem()
            return

        parsed = urlparse(self.path)
        if parsed.path == "/api/regras-livros":
            body = self._ler_corpo_json()
            self._enviar_json(ESTADO.atualizar_regras_livros(body.get("livros")), origem_autorizada=origem)
            return

        if parsed.path == "/api/pausar":
            body = self._ler_corpo_json()
            valor = body.get("pausado") if "pausado" in body else None
            self._enviar_json(
                ESTADO.definir_pausado(bool(valor) if valor is not None else None),
                origem_autorizada=origem,
            )
            return

        if parsed.path == "/api/escolher-arquivo":
            caminho = abrir_seletor_arquivo_local()
            if caminho:
                dados = ESTADO.definir_fonte(nova_fonte=caminho)
                self._enviar_json({**dados, "cancelado": False}, origem_autorizada=origem)
            else:
                dados = ESTADO.atualizar_se_preciso(forcar=False)
                self._enviar_json({**dados, "cancelado": True}, origem_autorizada=origem)
            return

        if parsed.path == "/api/ler-agora":
            self._enviar_json(ESTADO.atualizar_se_preciso(forcar=True), origem_autorizada=origem)
            return

        if parsed.path == "/api/abrir-janelinha":
            url_mini = f"http://{HOST}:{self.porta_servidor}/?mini=1"
            try:
                webbrowser.open(url_mini)
            except Exception:
                pass
            self._enviar_json({"ok": True}, origem_autorizada=origem)
            return

        if parsed.path == "/api/abrir-central":
            url_central = f"http://{HOST}:{self.porta_servidor}/"
            try:
                webbrowser.open(url_central)
            except Exception:
                pass
            self._enviar_json({"ok": True}, origem_autorizada=origem)
            return

        self._descartar_corpo_nao_lido()
        self._enviar_json({"erro": "Ação não encontrada."}, status=404, origem_autorizada=origem)


def main() -> None:
    parser = argparse.ArgumentParser(description="Contador automático da Central de Livrinhos.")
    parser.add_argument(
        "--abrir-seletor-inicial",
        action="store_true",
        help="Mantido apenas por compatibilidade; o contador agora detecta o documento aberto sozinho.",
    )
    parser.add_argument("--porta", type=int, default=PORTA)
    args = parser.parse_args()

    ManipuladorContador.porta_servidor = args.porta

    class ServidorLocal(ThreadingHTTPServer):
        allow_reuse_address = True

    servidor = ServidorLocal((HOST, args.porta), ManipuladorContador)
    parar_evento = threading.Event()
    t = threading.Thread(target=loop_vigilancia, args=(parar_evento,), daemon=True)
    t.start()

    print("")
    print("=======================================================")
    print("  🌱 Contador Automático: Central de Livrinhos")
    print("=======================================================")
    print(f"  Ligado em: http://{HOST}:{args.porta}")
    print("  Privacidade: 100% local, sem internet e sem IA.")
    print("  Só lê documentos com nome marcado na sua Estante.")
    print("")
    print("  Para desligar depois, basta fechar esta janela ou Ctrl+C.")
    print("=======================================================")
    print("")

    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        parar_evento.set()
        servidor.server_close()


if __name__ == "__main__":
    main()
