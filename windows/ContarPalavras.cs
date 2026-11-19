using System;
using System.IO;
using System.IO.Compression;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml.Linq;

namespace CentralDeLivrinhos
{
    /// <summary>
    /// Resultado puramente numérico da contagem (zero texto guardado).
    /// </summary>
    public class ResultadoContagem
    {
        public int Palavras { get; set; }
        public long TamanhoBytes { get; set; }
        public string ModificadoEm { get; set; }
    }

    /// <summary>
    /// Módulo isolado de leitura e contagem de palavras (PRIVACIDADE MÁXIMA).
    ///
    /// Este arquivo faz UMA única coisa: devolve números inteiros
    /// (quantidade de palavras e tamanho numérico).
    /// - No Word aberto, o próprio Word responde só os números (nenhum texto entra aqui).
    /// - Em arquivo no disco (opção extra), o texto fica na memória só no instante da
    ///   contagem e as variáveis são zeradas (null) logo na linha seguinte.
    /// </summary>
    public static class ContarPalavras
    {
        // Trava simples para conversar com o Microsoft Word um comando por vez.
        private static readonly object _wordComLock = new object();

        // Expressão que conta blocos de letras/números separados por espaço ou quebra de linha.
        private static readonly Regex _regexPalavra = new Regex(@"\S+", RegexOptions.Compiled);

        /// <summary>
        /// Descobre SÓ O NOME do documento aberto agora no Microsoft Word (sem ler texto algum).
        /// </summary>
        public static string ObterNomeDocumentoWordAberto()
        {
            lock (_wordComLock)
            {
                object wordObj = null;
                object docsObj = null;
                object docObj = null;
                try
                {
                    // Procura um Microsoft Word já aberto neste computador (nunca abre janela nova).
                    wordObj = Marshal.GetActiveObject("Word.Application");
                    dynamic wordApp = wordObj;

                    // Verifica se há pelo menos um documento aberto dentro do Word.
                    docsObj = wordApp.Documents;
                    dynamic docs = docsObj;
                    int totalDocs = Convert.ToInt32(docs.Count);
                    if (totalDocs <= 0)
                    {
                        return null;
                    }

                    // Pega SOMENTE o nome do documento ativo (ex.: "Capítulo 4.docx").
                    docObj = wordApp.ActiveDocument;
                    dynamic doc = docObj;
                    string nomeDoc = Convert.ToString(doc.Name);
                    return string.IsNullOrWhiteSpace(nomeDoc) ? null : nomeDoc.Trim();
                }
                catch
                {
                    // Word fechado ou com janela de "Salvar como" aberta agora: devolve vazio sem erro.
                    return null;
                }
                finally
                {
                    // Libera as referências temporárias ao Word sem fechá-lo.
                    LiberarCom(docObj);
                    LiberarCom(docsObj);
                    LiberarCom(wordObj);
                }
            }
        }

        /// <summary>
        /// Pede ao Microsoft Word aberto SÓ os números de palavras e caracteres (zero texto lido).
        /// </summary>
        public static ResultadoContagem ContarPalavrasWordAberto()
        {
            lock (_wordComLock)
            {
                object wordObj = null;
                object docsObj = null;
                object docObj = null;
                try
                {
                    // Conecta ao Microsoft Word que já está aberto na tela.
                    wordObj = Marshal.GetActiveObject("Word.Application");
                    dynamic wordApp = wordObj;

                    docsObj = wordApp.Documents;
                    dynamic docs = docsObj;
                    if (Convert.ToInt32(docs.Count) <= 0)
                    {
                        throw new InvalidOperationException("Nenhum documento aberto no Microsoft Word agora.");
                    }

                    docObj = wordApp.ActiveDocument;
                    dynamic doc = docObj;

                    // Código 0 = wdStatisticWords (total de palavras calculado pelo próprio Word).
                    int qtdPalavras = Convert.ToInt32(doc.ComputeStatistics(0));

                    // Código 5 = wdStatisticCharactersWithSpaces (número puro para detectar edição na revisão).
                    long qtdCaracteres = Convert.ToInt64(doc.ComputeStatistics(5));

                    // Devolve exclusivamente os números; nenhuma frase passa por este programa.
                    ResultadoContagem resultado = new ResultadoContagem();
                    resultado.Palavras = Math.Max(0, qtdPalavras);
                    resultado.TamanhoBytes = Math.Max(0L, qtdCaracteres);
                    resultado.ModificadoEm = null;
                    return resultado;
                }
                finally
                {
                    LiberarCom(docObj);
                    LiberarCom(docsObj);
                    LiberarCom(wordObj);
                }
            }
        }

        /// <summary>
        /// Lê um arquivo do disco (opção extra), conta SÓ O NÚMERO de palavras e apaga o texto da memória.
        /// </summary>
        public static ResultadoContagem ContarPalavrasArquivoDisco(string caminho)
        {
            // Normaliza o caminho do arquivo e lê só tamanho em bytes e horário da última gravação.
            string caminhoAbs = Path.GetFullPath(caminho);
            if (!File.Exists(caminhoAbs))
            {
                throw new FileNotFoundException("Arquivo não encontrado.", Path.GetFileName(caminhoAbs));
            }

            FileInfo info = new FileInfo(caminhoAbs);
            long tamanhoBytes = info.Length;
            DateTime epoch = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            string modTs = Convert.ToString((long)(info.LastWriteTimeUtc - epoch).TotalSeconds);
            string ext = (info.Extension ?? "").ToLowerInvariant();
            int qtdPalavras = 0;

            // Caso 1: arquivo de texto simples (.txt ou .md).
            if (ext == ".txt" || ext == ".md" || ext == ".markdown")
            {
                string conteudo = LerTextoCompartilhado(caminhoAbs);
                // Transforma o texto em um número inteiro de palavras.
                qtdPalavras = ContarBlocosTexto(conteudo);
                // Apaga a variável de texto da memória na mesma hora.
                conteudo = null;
            }
            // Caso 2: arquivo .docx (lê só o XML interno do texto na RAM).
            else if (ext == ".docx")
            {
                qtdPalavras = ContarXmlDentroDeZip(caminhoAbs, "word/document.xml", false);
            }
            // Caso 3: arquivo LibreOffice .odt (lê só o content.xml interno na RAM).
            else if (ext == ".odt")
            {
                qtdPalavras = ContarXmlDentroDeZip(caminhoAbs, "content.xml", true);
            }
            else
            {
                throw new NotSupportedException("Formato não suportado para leitura direta no Windows. Use .docx, .txt, .md ou .odt.");
            }

            // Devolve exclusivamente os números calculados.
            ResultadoContagem resultado = new ResultadoContagem();
            resultado.Palavras = Math.Max(0, qtdPalavras);
            resultado.TamanhoBytes = Math.Max(0L, tamanhoBytes);
            resultado.ModificadoEm = modTs;
            return resultado;
        }

        private static int ContarBlocosTexto(string texto)
        {
            // Se não existe texto, devolve zero.
            if (string.IsNullOrEmpty(texto))
            {
                return 0;
            }
            // Conta blocos separados por espaços/quebras de linha.
            return _regexPalavra.Matches(texto).Count;
        }

        private static string LerTextoCompartilhado(string caminho)
        {
            // Abre permitindo escrita paralela para nunca travar o programa da autora.
            using (FileStream fs = new FileStream(caminho, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            using (StreamReader sr = new StreamReader(fs, Encoding.UTF8, true))
            {
                return sr.ReadToEnd();
            }
        }

        private static int ContarXmlDentroDeZip(string caminhoZip, string nomeEntradaInterna, bool incluirCabecalhos)
        {
            // Copia o arquivo para leitura sem bloquear quem estiver escrevendo nele.
            using (FileStream fs = new FileStream(caminhoZip, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            using (ZipArchive zip = new ZipArchive(fs, ZipArchiveMode.Read))
            {
                ZipArchiveEntry entrada = zip.GetEntry(nomeEntradaInterna);
                if (entrada == null)
                {
                    // Procura sem diferenciar maiúsculas/minúsculas caso o editor grave diferente.
                    foreach (ZipArchiveEntry item in zip.Entries)
                    {
                        if (string.Equals(item.FullName, nomeEntradaInterna, StringComparison.OrdinalIgnoreCase))
                        {
                            entrada = item;
                            break;
                        }
                    }
                }

                if (entrada == null)
                {
                    throw new InvalidDataException("Arquivo não contém a estrutura de texto esperada.");
                }

                using (Stream xmlStream = entrada.Open())
                {
                    // Carrega a árvore XML temporariamente só para contar parágrafos.
                    XDocument xdoc = XDocument.Load(xmlStream);
                    int total = 0;
                    bool achouBloco = false;

                    if (xdoc.Root != null)
                    {
                        foreach (XElement elem in xdoc.Root.Descendants())
                        {
                            string tag = elem.Name.LocalName;
                            if (tag == "p" || (incluirCabecalhos && tag == "h"))
                            {
                                achouBloco = true;
                                string trecho = elem.Value;
                                total += ContarBlocosTexto(trecho);
                                // Descarta imediatamente o trecho da memória após contar.
                                trecho = null;
                            }
                        }

                        if (!achouBloco)
                        {
                            string textoTodo = xdoc.Root.Value;
                            total = ContarBlocosTexto(textoTodo);
                            textoTodo = null;
                        }
                    }

                    xdoc = null;
                    return total;
                }
            }
        }

        private static void LiberarCom(object obj)
        {
            if (obj != null && Marshal.IsComObject(obj))
            {
                try
                {
                    Marshal.ReleaseComObject(obj);
                }
                catch
                {
                    // Ignora caso o objeto já tenha sido liberado.
                }
            }
        }
    }
}
