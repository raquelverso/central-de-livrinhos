#!/usr/bin/env python3
"""Funções isoladas de contagem de palavras (PRIVACIDADE MÁXIMA).

Este arquivo faz UMA única coisa: transforma um documento em NÚMEROS
(quantidade de palavras e tamanho numérico).

Garantias:
- Nenhum trecho do livro é salvo em arquivo, log, histórico ou cache.
- Quando lê um arquivo do disco, o texto fica na memória só pela fração
  de segundo da contagem e é apagado logo em seguida.
- Quando consulta o Word ou o Pages abertos, o próprio aplicativo responde
  apenas o número de palavras (o texto nem entra neste programa).
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
import zipfile


def _app_mac_aberto(nome_processo: str) -> bool:
    """Confere rapidinho se o aplicativo (Word ou Pages) está aberto neste Mac."""
    # Só faz sentido no macOS.
    if sys.platform != "darwin":
        return False
    # O pgrep confere em milissegundos se o processo existe, sem acordar o app.
    try:
        proc = subprocess.run(
            ["pgrep", "-x", nome_processo],
            capture_output=True,
            timeout=2,
            check=False,
        )
        return proc.returncode == 0
    except (subprocess.TimeoutExpired, OSError):
        return False


def _rodar_applescript(script: str, timeout: int = 8) -> str:
    """Roda um comando rápido no Mac para perguntar só o nome ou um número ao Word/Pages."""
    # Se não estiver num Mac, não chama nada do macOS.
    if sys.platform != "darwin":
        return ""
    # Executa o script e captura apenas a resposta curta de texto/número.
    try:
        proc = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except (subprocess.TimeoutExpired, OSError):
        # Se o aplicativo estiver ocupado com outra janela, espera em silêncio até o próximo ciclo.
        return ""
    # Se deu erro de permissão ou o aplicativo recusou responder, devolve vazio.
    if proc.returncode != 0:
        return ""
    # Limpa espaços extras da resposta e devolve.
    return (proc.stdout or "").strip()


def obter_documentos_abertos_mac() -> list[tuple[str, str]]:
    """Lista SÓ OS NOMES dos documentos abertos (Pages primeiro, depois Word), sem ler textos."""
    encontrados: list[tuple[str, str]] = []
    vistos: set[tuple[str, str]] = set()

    # 1º: pergunta ao Apple Pages (prioridade para quem escreve no Mac).
    if _app_mac_aberto("Pages"):
        script_pages = '''
tell application "Pages"
    if (count of documents) is 0 then return ""
    set listaNomes to {}
    repeat with docRef in documents
        set nomeItem to ""
        try
            set nomeItem to POSIX path of ((file of docRef) as alias)
        on error
            try
                set nomeItem to (name of docRef) as string
            end try
        end try
        if nomeItem is not "" then set end of listaNomes to nomeItem
    end repeat
    set AppleScript's text item delimiters to linefeed
    return listaNomes as string
end tell
'''
        saida_pages = _rodar_applescript(script_pages)
        for linha in saida_pages.splitlines():
            base = os.path.basename(linha.strip())
            if base and (base.lower(), "pages") not in vistos:
                vistos.add((base.lower(), "pages"))
                encontrados.append((base, "pages"))

    # 2º: pergunta ao Microsoft Word (só se o Word já estiver aberto).
    if _app_mac_aberto("Microsoft Word"):
        script_word = '''
tell application "Microsoft Word"
    if (count of documents) is 0 then return ""
    set listaNomes to {}
    repeat with docRef in documents
        try
            set nomeItem to (name of docRef) as string
            if nomeItem is not "" then set end of listaNomes to nomeItem
        end try
    end repeat
    set AppleScript's text item delimiters to linefeed
    return listaNomes as string
end tell
'''
        saida_word = _rodar_applescript(script_word)
        for linha in saida_word.splitlines():
            base = os.path.basename(linha.strip())
            if base and (base.lower(), "word") not in vistos:
                vistos.add((base.lower(), "word"))
                encontrados.append((base, "word"))

    return encontrados


def obter_nome_documento_aberto_mac() -> tuple[str, str] | None:
    """Descobre SÓ O NOME do primeiro documento aberto (Pages primeiro, depois Word)."""
    docs = obter_documentos_abertos_mac()
    return docs[0] if docs else None


def contar_palavras_word_aberto_mac(nome_documento: str | None = None) -> int:
    """Pede ao Word (Mac) SÓ o número de palavras do documento aberto."""
    # O próprio Word conta as palavras internamente e devolve só o número.
    if nome_documento:
        base = os.path.basename(nome_documento).strip().replace('"', '\\"')
        stem = os.path.splitext(base)[0].replace('"', '\\"')
        script = f'''
tell application "System Events"
    if not (exists process "Microsoft Word") then return "__APP_FECHADO__"
end tell
tell application "Microsoft Word"
    if (count of documents) is 0 then return "__SEM_DOC__"
    repeat with docRef in documents
        try
            set docNome to (name of docRef) as string
            ignoring case
                if docNome is "{base}" or docNome is "{stem}" then
                    return (count of words of docRef) as string
                end if
            end ignoring
        end try
    end repeat
    return "__DOC_NAO_ABERTO__"
end tell
'''
    else:
        script = '''
tell application "System Events"
    if not (exists process "Microsoft Word") then return "__APP_FECHADO__"
end tell
tell application "Microsoft Word"
    if (count of documents) is 0 then return "__SEM_DOC__"
    return (count of words of active document) as string
end tell
'''
    # Recebe a resposta numérica do Word.
    saida = _rodar_applescript(script, timeout=12)
    # Se o Word não estava pronto, avisa de forma amigável.
    if not saida or saida == "__APP_FECHADO__":
        raise RuntimeError("O Microsoft Word está fechado.")
    if saida in ("__SEM_DOC__", "__DOC_NAO_ABERTO__"):
        raise RuntimeError("Nenhum documento correspondente aberto no Microsoft Word agora.")
    # Converte o número recebido em inteiro e garante que nunca seja negativo.
    return max(0, int(saida))


def obter_tamanho_word_aberto_mac(nome_documento: str | None = None) -> int:
    """Pede ao Word (Mac) SÓ a quantidade de caracteres (número puro para revisão)."""
    # Pergunta apenas o total de caracteres ao próprio Word, sem trazer nenhum texto.
    if nome_documento:
        base = os.path.basename(nome_documento).strip().replace('"', '\\"')
        stem = os.path.splitext(base)[0].replace('"', '\\"')
        script = f'''
tell application "Microsoft Word"
    if (count of documents) is 0 then return "0"
    repeat with docRef in documents
        try
            set docNome to (name of docRef) as string
            ignoring case
                if docNome is "{base}" or docNome is "{stem}" then
                    return (count of characters of docRef) as string
                end if
            end ignoring
        end try
    end repeat
    return "0"
end tell
'''
    else:
        script = '''
tell application "Microsoft Word"
    if (count of documents) is 0 then return "0"
    return (count of characters of active document) as string
end tell
'''
    # Recebe o número e devolve inteiro.
    saida = _rodar_applescript(script, timeout=10)
    try:
        return max(0, int(saida))
    except ValueError:
        return 0


def contar_palavras_pages_aberto_mac(caminho_arquivo: str | None = None) -> int:
    """Pede ao Apple Pages (Mac) SÓ o número de palavras do documento aberto."""
    # Se recebeu caminho ou nome de um documento, procura ele entre os abertos no Pages.
    if caminho_arquivo:
        limpo = str(caminho_arquivo).strip()
        eh_caminho = os.path.isabs(limpo) or os.sep in limpo
        caminho_norm = os.path.abspath(limpo).replace('"', '\\"') if eh_caminho else limpo.replace('"', '\\"')
        base_norm = os.path.basename(limpo).replace('"', '\\"')
        stem_norm = os.path.splitext(base_norm)[0].replace('"', '\\"')
        script = f'''
tell application "System Events"
    if not (exists process "Pages") then return "__APP_FECHADO__"
end tell
tell application "Pages"
    if (count of documents) is 0 then return "__SEM_DOC__"
    repeat with docRef in documents
        set achouDoc to false
        try
            set docPath to POSIX path of ((file of docRef) as alias)
            if docPath is "{caminho_norm}" or docPath ends with "/{base_norm}" then set achouDoc to true
        end try
        if not achouDoc then
            try
                set docNome to (name of docRef) as string
                ignoring case
                    if docNome is "{base_norm}" or docNome is "{stem_norm}" then set achouDoc to true
                end ignoring
            end try
        end if
        if achouDoc then
            try
                return (count of words of body text of docRef) as string
            on error
                return (count of words of docRef) as string
            end try
        end if
    end repeat
    return "__DOC_NAO_ABERTO__"
end tell
'''
    else:
        # Caso contrário, pergunta apenas os números do documento da frente no Pages.
        script = '''
tell application "System Events"
    if not (exists process "Pages") then return "__APP_FECHADO__"
end tell
tell application "Pages"
    if (count of documents) is 0 then return "__SEM_DOC__"
    try
        return (count of words of body text of front document) as string
    on error
        return (count of words of front document) as string
    end try
end tell
'''
    # Recebe só o número de palavras calculado pelo Pages.
    saida = _rodar_applescript(script, timeout=12)
    # Trata os casos em que o Pages ou o arquivo ainda não estão abertos.
    if not saida or saida == "__APP_FECHADO__":
        raise RuntimeError("O Pages está fechado.")
    if saida in ("__SEM_DOC__", "__DOC_NAO_ABERTO__"):
        raise RuntimeError("Nenhum documento correspondente aberto no Pages.")
    # Devolve apenas o número inteiro de palavras.
    return max(0, int(saida))


def obter_tamanho_pages_aberto_mac(caminho_arquivo: str | None = None) -> int:
    """Pede ao Pages (Mac) SÓ a quantidade de caracteres (número puro para revisão)."""
    # Pede ao Pages só a contagem numérica de caracteres, sem copiar texto nenhum.
    if caminho_arquivo:
        limpo = str(caminho_arquivo).strip()
        eh_caminho = os.path.isabs(limpo) or os.sep in limpo
        caminho_norm = os.path.abspath(limpo).replace('"', '\\"') if eh_caminho else limpo.replace('"', '\\"')
        base_norm = os.path.basename(limpo).replace('"', '\\"')
        stem_norm = os.path.splitext(base_norm)[0].replace('"', '\\"')
        script = f'''
tell application "Pages"
    repeat with docRef in documents
        set achouDoc to false
        try
            set docPath to POSIX path of ((file of docRef) as alias)
            if docPath is "{caminho_norm}" or docPath ends with "/{base_norm}" then set achouDoc to true
        end try
        if not achouDoc then
            try
                set docNome to (name of docRef) as string
                ignoring case
                    if docNome is "{base_norm}" or docNome is "{stem_norm}" then set achouDoc to true
                end ignoring
            end try
        end if
        if achouDoc then
            try
                return (count of characters of body text of docRef) as string
            on error
                return (count of characters of docRef) as string
            end try
        end if
    end repeat
    return "0"
end tell
'''
    else:
        script = '''
tell application "Pages"
    if (count of documents) is 0 then return "0"
    try
        return (count of characters of body text of front document) as string
    on error
        return (count of characters of front document) as string
    end try
end tell
'''
    # Converte o número recebido e devolve.
    saida = _rodar_applescript(script, timeout=10)
    try:
        return max(0, int(saida))
    except ValueError:
        return 0


def _contar_blocos_texto(texto: str) -> int:
    """Conta quantos blocos de palavra existem e não guarda nada do texto."""
    # Se não há texto, devolve zero imediatamente.
    if not texto:
        return 0
    # Conta blocos separados por espaços/quebras e devolve só o número inteiro.
    return len(re.findall(r"\S+", texto))


def _contar_em_xml(xml_bytes: bytes, tags_bloco: tuple[str, ...]) -> int:
    """Extrai contagem numérica de um XML interno (.docx/.odt) e descarta os bytes."""
    # Interpreta a estrutura XML apenas na memória RAM.
    raiz = ET.fromstring(xml_bytes)
    # Separa cada parágrafo para não colar a última palavra de um bloco na primeira do seguinte.
    total_palavras = 0
    encontrou_bloco = False
    for elem in raiz.iter():
        nome_tag = elem.tag.split("}")[-1]
        if nome_tag in tags_bloco:
            encontrou_bloco = True
            # Monta o texto do parágrafo só pelo instante da contagem.
            trecho = "".join(elem.itertext())
            # Soma a quantidade numérica de palavras deste parágrafo.
            total_palavras += _contar_blocos_texto(trecho)
            # Apaga imediatamente a variável de texto da memória.
            del trecho

    # Caso algum XML raro não use as tags de parágrafo esperadas, conta tudo de uma vez e apaga.
    if not encontrou_bloco:
        texto_unico = " ".join(raiz.itertext())
        total_palavras = _contar_blocos_texto(texto_unico)
        del texto_unico

    # Libera a árvore XML e devolve só o número.
    del raiz
    return total_palavras


def contar_palavras_arquivo_disco(caminho: str) -> tuple[int, int, str]:
    """Lê um arquivo salvo no computador, conta SÓ O NÚMERO de palavras e apaga o texto da memória.

    Retorna exclusivamente números: (qtd_palavras, tamanho_em_bytes, timestamp_modificacao).
    """
    # Normaliza o caminho e pega apenas tamanho em bytes e data de modificação do disco.
    caminho_abs = os.path.abspath(caminho)
    ext = os.path.splitext(caminho_abs)[1].lower()
    tamanho_bytes = int(os.path.getsize(caminho_abs))
    mod_ts = str(int(os.path.getmtime(caminho_abs)))

    # Caso 1: arquivo de texto simples (.txt ou .md).
    if ext in (".txt", ".md", ".markdown"):
        try:
            with open(caminho_abs, "r", encoding="utf-8") as arq:
                conteudo = arq.read()
        except UnicodeDecodeError:
            with open(caminho_abs, "r", encoding="latin-1", errors="ignore") as arq:
                conteudo = arq.read()
        # Converte o texto em número de palavras.
        qtd = _contar_blocos_texto(conteudo)
        # Apaga o texto da memória na mesma hora.
        del conteudo
        return qtd, tamanho_bytes, mod_ts

    # Caso 2: documento do Word (.docx), lê só o XML interno do texto na RAM.
    if ext == ".docx":
        with zipfile.ZipFile(caminho_abs, "r") as zf:
            if "word/document.xml" not in zf.namelist():
                raise ValueError("Arquivo .docx sem word/document.xml válido.")
            xml_bytes = zf.read("word/document.xml")
        # Conta as palavras direto do XML em memória e apaga os bytes logo depois.
        qtd = _contar_em_xml(xml_bytes, ("p",))
        del xml_bytes
        return qtd, tamanho_bytes, mod_ts

    # Caso 3: documento LibreOffice/Writer (.odt).
    if ext == ".odt":
        with zipfile.ZipFile(caminho_abs, "r") as zf:
            if "content.xml" not in zf.namelist():
                raise ValueError("Arquivo .odt sem content.xml válido.")
            xml_bytes = zf.read("content.xml")
        # Conta as palavras direto do XML em memória e apaga os bytes logo depois.
        qtd = _contar_em_xml(xml_bytes, ("p", "h"))
        del xml_bytes
        return qtd, tamanho_bytes, mod_ts

    # Caso 4: arquivo .pages, pergunta só o número ao Apple Pages aberto.
    if ext == ".pages":
        qtd = contar_palavras_pages_aberto_mac(caminho_abs)
        tam_chars = obter_tamanho_pages_aberto_mac(caminho_abs)
        return qtd, tam_chars or tamanho_bytes, mod_ts

    raise ValueError(f"Formato {ext or '(sem extensão)'} não suportado. Use .docx, .txt, .md, .odt ou .pages.")
