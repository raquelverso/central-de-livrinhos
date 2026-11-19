using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Win32;

namespace CentralDeLivrinhos
{
    public class RegraLivro
    {
        public string Id { get; set; }
        public string Nome { get; set; }
        public List<string> ArquivosMarcados { get; set; }
        public List<string> PalavrasChave { get; set; }
    }

    /// <summary>
    /// Programinha residente perto do relógio (Windows) que roda em silêncio em 127.0.0.1:8765.
    /// Confere SÓ O NOME do documento aberto no Word e só conta se o nome estiver na Estante.
    /// Zero internet, zero IA, zero texto salvo. Atende só a própria Central.
    /// </summary>
    public class ContextoBandeja : ApplicationContext
    {
        private const string HOST = "127.0.0.1";
        private const int PORTA = 8765;
        private const int INTERVALO_SEGUNDOS = 30;
        // Quando a Fase 4 publicar no GitHub Pages, coloque aqui APENAS o endereço oficial (ex.: "https://usuario.github.io").
        private static readonly string ORIGEM_GITHUB_PAGES = "";

        private readonly string _pastaBase;
        private readonly string _arquivoConfig;
        private readonly JavaScriptSerializer _json = new JavaScriptSerializer();
        private readonly object _lock = new object();

        private bool _pausado = false;
        private string _arquivoExtraManual = "";
        private List<RegraLivro> _livros = new List<RegraLivro>();
        private DateTime _ultimaLeituraUtc = DateTime.MinValue;
        private Dictionary<string, object> _statusAtual;
        private bool _janelinhaSemprePorCima = true;
        private int? _janelinhaPosX = null;
        private int? _janelinhaPosY = null;
        private int _janelinhaLargura = 330;
        private int _janelinhaAltura = 390;

        private TcpListener _listener;
        private volatile bool _rodando = true;
        private System.Threading.Timer _timerVigilancia;
        private Control _invokerUi;
        private NotifyIcon _trayIcon;
        private ToolStripMenuItem _itemPausar;
        private ToolStripMenuItem _itemSemprePorCima;
        private Icon _iconeBandeja;
        private JanelaAppWebView2 _janelaCentral;
        private JanelaAppWebView2 _janelaMini;
        private MotorWebView2 _motorWebView2;

        public ContextoBandeja(bool mostrarBoasVindas, bool abrirCentralAoIniciar)
        {
            _pastaBase = ResolverPastaBase();
            _arquivoConfig = Path.Combine(_pastaBase, ".contador_config.json");
            _invokerUi = new Control();
            _invokerUi.CreateControl();
            IntPtr garantirHandle = _invokerUi.Handle;
            if (garantirHandle == IntPtr.Zero) { }

            CarregarConfig();
            _statusAtual = CriarStatusBase(_pausado ? "pausado" : "aguardando", _pausado);
            _motorWebView2 = new MotorWebView2(ObterPastaDadosWebView2(), _invokerUi);

            CriarIconeBandeja(mostrarBoasVindas);
            IniciarServidorLocal();

            _timerVigilancia = new System.Threading.Timer(
                delegate { AtualizarSePreciso(true); },
                null,
                500,
                INTERVALO_SEGUNDOS * 1000
            );

            if (abrirCentralAoIniciar)
            {
                _invokerUi.BeginInvoke((MethodInvoker)delegate { AbrirJanelaCentral(); });
            }
        }

        private string ObterPastaDadosWebView2()
        {
            string baseLocal = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            if (string.IsNullOrEmpty(baseLocal))
            {
                baseLocal = _pastaBase;
            }
            return Path.Combine(baseLocal, "CentralDeLivrinhos", "WebView2Dados");
        }

        private Icon CarregarIconeTomatinho()
        {
            string baseExe = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
            string[] caminhosIco = new string[]
            {
                Path.Combine(baseExe, "icone.ico"),
                Path.Combine(_pastaBase, "icone.ico"),
                Path.Combine(_pastaBase, "windows", "icone.ico")
            };

            foreach (string caminho in caminhosIco)
            {
                if (!string.IsNullOrEmpty(caminho) && File.Exists(caminho))
                {
                    try
                    {
                        return new Icon(caminho);
                    }
                    catch
                    {
                        // Tenta próximo caminho ou ícone embutido.
                    }
                }
            }

            try
            {
                Icon associado = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
                if (associado != null) return associado;
            }
            catch
            {
                // Ignora e desenha tomatinho na mão.
            }

            return CriarDesenhoTomatinhoIcone();
        }

        private string ResolverPastaBase()
        {
            string exeDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
            if (File.Exists(Path.Combine(exeDir, "index.html")))
            {
                return exeDir;
            }
            DirectoryInfo pai = Directory.GetParent(exeDir);
            if (pai != null && File.Exists(Path.Combine(pai.FullName, "index.html")))
            {
                return pai.FullName;
            }
            return exeDir;
        }

        private Icon CriarDesenhoTomatinhoIcone()
        {
            Bitmap bmp = new Bitmap(32, 32);
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.Clear(Color.Transparent);
                using (Brush folha = new SolidBrush(Color.FromArgb(74, 134, 62)))
                {
                    g.FillRectangle(folha, 12, 3, 8, 5);
                    g.FillRectangle(folha, 9, 6, 14, 4);
                }
                using (Brush tomate = new SolidBrush(Color.FromArgb(216, 74, 64)))
                {
                    g.FillEllipse(tomate, 4, 8, 24, 21);
                }
                using (Brush brilho = new SolidBrush(Color.FromArgb(247, 178, 165)))
                {
                    g.FillEllipse(brilho, 9, 12, 5, 5);
                }
                using (Pen contorno = new Pen(Color.FromArgb(62, 42, 26), 2))
                {
                    g.DrawEllipse(contorno, 4, 8, 24, 21);
                }
            }
            return Icon.FromHandle(bmp.GetHicon());
        }

        private void CriarIconeBandeja(bool mostrarBoasVindas)
        {
            _iconeBandeja = CarregarIconeTomatinho();

            ContextMenuStrip menu = new ContextMenuStrip();

            ToolStripMenuItem itemAbrir = new ToolStripMenuItem("Abrir Central de Livrinhos");
            itemAbrir.Font = new Font(itemAbrir.Font, FontStyle.Bold);
            itemAbrir.Click += delegate { AbrirJanelaCentral(); };

            ToolStripMenuItem itemMini = new ToolStripMenuItem("Abrir Janelinha da Mesa");
            itemMini.Click += delegate { AbrirJanelinhaMesa(); };

            _itemSemprePorCima = new ToolStripMenuItem("Janelinha sempre por cima");
            _itemSemprePorCima.Checked = _janelinhaSemprePorCima;
            _itemSemprePorCima.Click += delegate { AlternarJanelinhaSemprePorCima(); };

            _itemPausar = new ToolStripMenuItem(_pausado ? "Retomar contador" : "Pausar contador");
            _itemPausar.Click += delegate { DefinirPausado(null); };

            ToolStripMenuItem itemEscolher = new ToolStripMenuItem("Escolher arquivo (opção extra)...");
            itemEscolher.Click += delegate { EscolherArquivoNaMaoUi(); };

            ToolStripMenuItem itemSair = new ToolStripMenuItem("Sair");
            itemSair.Click += delegate { EncerrarAplicativo(); };

            menu.Items.Add(itemAbrir);
            menu.Items.Add(itemMini);
            menu.Items.Add(_itemSemprePorCima);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add(_itemPausar);
            menu.Items.Add(itemEscolher);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add(itemSair);

            _trayIcon = new NotifyIcon();
            _trayIcon.Icon = _iconeBandeja;
            _trayIcon.Text = "Central de Livrinhos: Contador automático local";
            _trayIcon.ContextMenuStrip = menu;
            _trayIcon.Visible = true;
            _trayIcon.DoubleClick += delegate { AbrirJanelaCentral(); };

            if (mostrarBoasVindas)
            {
                _trayIcon.ShowBalloonTip(
                    7000,
                    "Central de Livrinhos",
                    "Estou aqui perto do relógio! Se eu sumir depois, clique na setinha ^ ao lado do relógio.",
                    ToolTipIcon.Info
                );
            }
        }

        private string ObterUrlBase()
        {
            return "http://" + HOST + ":" + PORTA + "/";
        }

        private void AbrirUrlNavegador(string url)
        {
            try
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch
            {
                // Ignora se nenhum navegador responder.
            }
        }

        private void AlternarJanelinhaSemprePorCima()
        {
            bool novoValor;
            lock (_lock)
            {
                _janelinhaSemprePorCima = !_janelinhaSemprePorCima;
                novoValor = _janelinhaSemprePorCima;
                SalvarConfig();
            }

            if (_itemSemprePorCima != null)
            {
                _itemSemprePorCima.Checked = novoValor;
            }
            if (_janelaMini != null && !_janelaMini.IsDisposed)
            {
                _janelaMini.TopMost = novoValor;
            }
        }

        private void AtualizarPosicaoJanelinha(int x, int y, int largura, int altura)
        {
            lock (_lock)
            {
                _janelinhaPosX = x;
                _janelinhaPosY = y;
                if (largura >= 300) _janelinhaLargura = largura;
                if (altura >= 340) _janelinhaAltura = altura;
                SalvarConfig();
            }
        }

        private Point ResolverPosicaoJanelinha(int? salvaX, int? salvaY, int largura, int altura)
        {
            if (salvaX.HasValue && salvaY.HasValue)
            {
                Rectangle faixaBarraTitulo = new Rectangle(
                    salvaX.Value + 40,
                    salvaY.Value,
                    Math.Max(80, largura - 80),
                    40
                );
                foreach (Screen tela in Screen.AllScreens)
                {
                    if (tela.WorkingArea.IntersectsWith(faixaBarraTitulo))
                    {
                        return new Point(salvaX.Value, salvaY.Value);
                    }
                }
            }

            Rectangle area = Screen.PrimaryScreen != null
                ? Screen.PrimaryScreen.WorkingArea
                : new Rectangle(0, 0, 1280, 800);
            int x = Math.Max(area.Left, area.Right - largura - 24);
            int y = Math.Max(area.Top, area.Top + (area.Height - altura) / 2);
            return new Point(x, y);
        }

        private void AbrirComFallbackExterno(string url, bool modoMini)
        {
            int larg;
            int alt;
            lock (_lock)
            {
                larg = _janelinhaLargura;
                alt = _janelinhaAltura;
            }
            if (AbrirEdgeEmModoAplicativo(url, modoMini, larg, alt))
            {
                return;
            }
            AbrirUrlNavegador(url);
        }

        internal static bool AbrirEdgeEmModoAplicativo(string url, bool modoMini, int largura, int altura)
        {
            List<string> candidatos = new List<string>();
            candidatos.Add(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"));
            candidatos.Add(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"));
            candidatos.Add(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe"));

            try
            {
                using (RegistryKey key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe"))
                {
                    if (key != null)
                    {
                        string val = key.GetValue("") as string;
                        if (!string.IsNullOrEmpty(val)) candidatos.Add(val.Trim('"'));
                    }
                }
            }
            catch
            {
                // Ignora erro de registro.
            }

            foreach (string exe in candidatos)
            {
                if (!string.IsNullOrEmpty(exe) && File.Exists(exe))
                {
                    try
                    {
                        ProcessStartInfo psi = new ProcessStartInfo();
                        psi.FileName = exe;
                        psi.Arguments = modoMini
                            ? string.Format("--app=\"{0}\" --window-size={1},{2}", url, Math.Max(300, largura), Math.Max(340, altura))
                            : string.Format("--app=\"{0}\"", url);
                        psi.UseShellExecute = false;
                        Process.Start(psi);
                        return true;
                    }
                    catch
                    {
                        // Tenta próximo candidato.
                    }
                }
            }
            return false;
        }

        private void AbrirJanelaCentral()
        {
            if (_invokerUi != null && _invokerUi.InvokeRequired)
            {
                try
                {
                    _invokerUi.BeginInvoke((MethodInvoker)delegate { AbrirJanelaCentral(); });
                }
                catch
                {
                    // Ignora se fechando.
                }
                return;
            }

            string url = ObterUrlBase();
            if (_janelaCentral != null && !_janelaCentral.IsDisposed)
            {
                if (_janelaCentral.WindowState == FormWindowState.Minimized)
                {
                    _janelaCentral.WindowState = FormWindowState.Normal;
                }
                _janelaCentral.Show();
                _janelaCentral.BringToFront();
                _janelaCentral.Activate();
                return;
            }

            if (_motorWebView2 == null || !_motorWebView2.WebView2Disponivel())
            {
                AbrirComFallbackExterno(url, false);
                return;
            }

            Rectangle area = Screen.PrimaryScreen != null
                ? Screen.PrimaryScreen.WorkingArea
                : new Rectangle(0, 0, 1280, 800);
            int larg = Math.Min(1180, Math.Max(780, area.Width - 60));
            int alt = Math.Min(820, Math.Max(580, area.Height - 60));
            if (larg > area.Width) larg = Math.Max(640, area.Width - 16);
            if (alt > area.Height) alt = Math.Max(480, area.Height - 16);

            _janelaCentral = new JanelaAppWebView2(
                _motorWebView2,
                "Central de Livrinhos",
                url,
                _iconeBandeja,
                new Size(larg, alt),
                new Size(640, 480),
                null,
                false,
                null,
                delegate { AbrirComFallbackExterno(url, false); }
            );
            _janelaCentral.FormClosed += delegate { _janelaCentral = null; };
            _janelaCentral.Show();
            _janelaCentral.BringToFront();
            _janelaCentral.Activate();
        }

        private void AbrirJanelinhaMesa()
        {
            if (_invokerUi != null && _invokerUi.InvokeRequired)
            {
                try
                {
                    _invokerUi.BeginInvoke((MethodInvoker)delegate { AbrirJanelinhaMesa(); });
                }
                catch
                {
                    // Ignora se fechando.
                }
                return;
            }

            string urlMini = "http://" + HOST + ":" + PORTA + "/?mini=1";
            bool semprePorCima;
            int? posX;
            int? posY;
            int larg;
            int alt;

            lock (_lock)
            {
                semprePorCima = _janelinhaSemprePorCima;
                posX = _janelinhaPosX;
                posY = _janelinhaPosY;
                larg = _janelinhaLargura >= 300 ? _janelinhaLargura : 330;
                alt = _janelinhaAltura >= 340 ? _janelinhaAltura : 390;
            }

            if (_janelaMini != null && !_janelaMini.IsDisposed)
            {
                _janelaMini.TopMost = semprePorCima;
                if (_janelaMini.WindowState == FormWindowState.Minimized)
                {
                    _janelaMini.WindowState = FormWindowState.Normal;
                }
                _janelaMini.Show();
                _janelaMini.BringToFront();
                _janelaMini.Activate();
                return;
            }

            if (_motorWebView2 == null || !_motorWebView2.WebView2Disponivel())
            {
                AbrirComFallbackExterno(urlMini, true);
                return;
            }

            Point posInicial = ResolverPosicaoJanelinha(posX, posY, larg, alt);
            _janelaMini = new JanelaAppWebView2(
                _motorWebView2,
                "Janelinha da Mesa: Central de Livrinhos",
                urlMini,
                _iconeBandeja,
                new Size(larg, alt),
                new Size(300, 340),
                posInicial,
                semprePorCima,
                delegate(Rectangle lim) { AtualizarPosicaoJanelinha(lim.X, lim.Y, lim.Width, lim.Height); },
                delegate { AbrirComFallbackExterno(urlMini, true); }
            );
            _janelaMini.FormClosed += delegate { _janelaMini = null; };
            _janelaMini.Show();
            _janelaMini.BringToFront();
            _janelaMini.Activate();
        }

        private string EscolherArquivoNaMaoUi()
        {
            string escolhido = null;
            Action abrir = delegate
            {
                using (Form dono = new Form())
                using (OpenFileDialog dlg = new OpenFileDialog())
                {
                    dono.TopMost = true;
                    dono.StartPosition = FormStartPosition.Manual;
                    dono.Location = new Point(-32000, -32000);
                    dono.ShowInTaskbar = false;
                    dlg.Title = "Escolha o arquivo do livro (opção extra, zero texto sai do PC)";
                    dlg.Filter = "Documentos de texto (*.docx;*.txt;*.md;*.odt)|*.docx;*.txt;*.md;*.markdown;*.odt|Todos os arquivos (*.*)|*.*";
                    if (dlg.ShowDialog(dono) == DialogResult.OK)
                    {
                        escolhido = dlg.FileName;
                    }
                }
            };

            if (_invokerUi.InvokeRequired)
            {
                _invokerUi.Invoke(abrir);
            }
            else
            {
                abrir();
            }

            if (!string.IsNullOrEmpty(escolhido))
            {
                DefinirFonte(escolhido);
            }
            return escolhido;
        }

        private void AtualizarTextoItemPausa()
        {
            Action atualizar = delegate
            {
                if (_itemPausar != null)
                {
                    _itemPausar.Text = _pausado ? "Retomar contador" : "Pausar contador";
                }
                if (_trayIcon != null)
                {
                    _trayIcon.Text = _pausado
                        ? "Central de Livrinhos: Contador pausado"
                        : "Central de Livrinhos: Contador automático local";
                }
            };

            try
            {
                if (_invokerUi != null && _invokerUi.IsHandleCreated)
                {
                    if (_invokerUi.InvokeRequired)
                    {
                        _invokerUi.BeginInvoke(atualizar);
                    }
                    else
                    {
                        atualizar();
                    }
                }
            }
            catch
            {
                // Ignora se fechando.
            }
        }

        private void EncerrarAplicativo()
        {
            _rodando = false;
            try
            {
                if (_janelaMini != null && !_janelaMini.IsDisposed) _janelaMini.Close();
            }
            catch
            {
                // Ignora ao fechar janela.
            }
            try
            {
                if (_janelaCentral != null && !_janelaCentral.IsDisposed) _janelaCentral.Close();
            }
            catch
            {
                // Ignora ao fechar janela.
            }
            if (_timerVigilancia != null) _timerVigilancia.Dispose();
            try
            {
                if (_listener != null) _listener.Stop();
            }
            catch
            {
                // Ignora ao encerrar.
            }
            if (_trayIcon != null)
            {
                _trayIcon.Visible = false;
                _trayIcon.Dispose();
            }
            ExitThread();
        }

        private Dictionary<string, object> CriarStatusBase(string estado, bool pausado)
        {
            Dictionary<string, object> d = new Dictionary<string, object>();
            d["ativo"] = true;
            d["pausado"] = pausado;
            d["estado"] = estado;
            d["modo"] = "";
            d["arquivoNome"] = "";
            d["livroId"] = null;
            d["livroNome"] = null;
            d["palavras"] = null;
            d["tamanhoBytes"] = null;
            d["modificadoEm"] = null;
            d["ultimaLeituraHora"] = DateTime.Now.ToString("HH:mm:ss");
            d["intervaloSegundos"] = INTERVALO_SEGUNDOS;
            d["erro"] = null;
            return d;
        }

        private void CarregarConfig()
        {
            try
            {
                if (!File.Exists(_arquivoConfig)) return;
                string bruto = File.ReadAllText(_arquivoConfig, Encoding.UTF8);
                Dictionary<string, object> obj = _json.Deserialize<Dictionary<string, object>>(bruto);
                if (obj == null) return;

                _pausado = ObterBool(obj, "pausado", false);
                _arquivoExtraManual = ObterString(obj, "arquivoExtraManual");
                _janelinhaSemprePorCima = ObterBool(obj, "janelinhaSemprePorCima", true);
                _janelinhaPosX = ObterIntNulo(obj, "janelinhaCompactaPosX");
                _janelinhaPosY = ObterIntNulo(obj, "janelinhaCompactaPosY");
                int largSalva = ObterInt(obj, "janelinhaCompactaLargura", 330);
                int altSalva = ObterInt(obj, "janelinhaCompactaAltura", 390);
                _janelinhaLargura = largSalva >= 300 ? largSalva : 330;
                _janelinhaAltura = altSalva >= 340 ? altSalva : 390;
                if (string.IsNullOrEmpty(_arquivoExtraManual))
                {
                    string fonteAntiga = ObterString(obj, "fonte");
                    if (!string.IsNullOrEmpty(fonteAntiga) && !fonteAntiga.StartsWith("@app:"))
                    {
                        _arquivoExtraManual = fonteAntiga;
                    }
                }

                if (obj.ContainsKey("livros"))
                {
                    _livros = NormalizarLivrosDeObjeto(obj["livros"]);
                }
            }
            catch
            {
                // Mantém valores padrão se arquivo estiver inválido.
            }
        }

        private void SalvarConfig()
        {
            try
            {
                List<Dictionary<string, object>> listaLivros = new List<Dictionary<string, object>>();
                foreach (RegraLivro l in _livros)
                {
                    Dictionary<string, object> item = new Dictionary<string, object>();
                    item["id"] = l.Id;
                    item["nome"] = l.Nome;
                    item["arquivosMarcados"] = l.ArquivosMarcados;
                    item["palavrasChave"] = l.PalavrasChave;
                    listaLivros.Add(item);
                }

                Dictionary<string, object> payload = new Dictionary<string, object>();
                payload["pausado"] = _pausado;
                payload["arquivoExtraManual"] = _arquivoExtraManual ?? "";
                payload["livros"] = listaLivros;
                payload["janelinhaSemprePorCima"] = _janelinhaSemprePorCima;
                payload["janelinhaCompactaPosX"] = _janelinhaPosX;
                payload["janelinhaCompactaPosY"] = _janelinhaPosY;
                payload["janelinhaCompactaLargura"] = _janelinhaLargura;
                payload["janelinhaCompactaAltura"] = _janelinhaAltura;

                File.WriteAllText(_arquivoConfig, _json.Serialize(payload), Encoding.UTF8);
            }
            catch
            {
                // Ignora erro de gravação em config.
            }
        }

        private List<RegraLivro> NormalizarLivrosDeObjeto(object bruto)
        {
            List<RegraLivro> saida = new List<RegraLivro>();
            IEnumerable seq = bruto as IEnumerable;
            if (seq == null || bruto is string) return saida;

            foreach (object obj in seq)
            {
                IDictionary dict = obj as IDictionary;
                if (dict == null) continue;
                string id = dict.Contains("id") ? Convert.ToString(dict["id"] ?? "").Trim() : "";
                string nome = dict.Contains("nome") ? Convert.ToString(dict["nome"] ?? "").Trim() : "";
                if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(nome)) continue;

                RegraLivro rl = new RegraLivro();
                rl.Id = id;
                rl.Nome = nome;
                rl.ArquivosMarcados = dict.Contains("arquivosMarcados") ? NormalizarListaTexto(dict["arquivosMarcados"]) : new List<string>();
                rl.PalavrasChave = dict.Contains("palavrasChave") ? NormalizarListaTexto(dict["palavrasChave"]) : new List<string>();
                saida.Add(rl);
            }
            return saida;
        }

        private List<string> NormalizarListaTexto(object bruto)
        {
            List<string> saida = new List<string>();
            HashSet<string> vistos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            IEnumerable seq = bruto as IEnumerable;
            if (seq == null || bruto is string) return saida;

            foreach (object o in seq)
            {
                string limpo = Convert.ToString(o ?? "").Trim();
                if (!string.IsNullOrEmpty(limpo) && !vistos.Contains(limpo))
                {
                    vistos.Add(limpo);
                    saida.Add(limpo);
                }
            }
            return saida;
        }

        private RegraLivro EncontrarLivroParaDocumento(string nomeDoc, List<RegraLivro> livros)
        {
            string baseNome = Path.GetFileName(nomeDoc ?? "").Trim();
            if (string.IsNullOrEmpty(baseNome)) return null;

            string baseLower = baseNome.ToLowerInvariant();
            string baseStem = Path.GetFileNameWithoutExtension(baseLower);
            string baseExt = Path.GetExtension(baseLower);

            // 1º: verifica lista explícita de arquivos marcados
            foreach (RegraLivro livro in livros)
            {
                foreach (string marcado in livro.ArquivosMarcados)
                {
                    string mBase = Path.GetFileName(marcado ?? "").Trim().ToLowerInvariant();
                    if (string.IsNullOrEmpty(mBase)) continue;
                    string mStem = Path.GetFileNameWithoutExtension(mBase);
                    string mExt = Path.GetExtension(mBase);

                    if (baseLower == mBase)
                    {
                        return livro;
                    }
                    if ((string.IsNullOrEmpty(baseExt) || string.IsNullOrEmpty(mExt)) && baseStem == mStem)
                    {
                        return livro;
                    }
                }
            }

            // 2º: verifica palavras-chave opcionais no nome do arquivo
            foreach (RegraLivro livro in livros)
            {
                foreach (string kw in livro.PalavrasChave)
                {
                    string kwLimpa = (kw ?? "").Trim().ToLowerInvariant();
                    if (!string.IsNullOrEmpty(kwLimpa) && baseLower.Contains(kwLimpa))
                    {
                        return livro;
                    }
                }
            }

            return null;
        }

        public Dictionary<string, object> AtualizarRegrasLivros(object livrosBrutos)
        {
            lock (_lock)
            {
                _livros = NormalizarLivrosDeObjeto(livrosBrutos);
                SalvarConfig();
                _ultimaLeituraUtc = DateTime.MinValue;
            }
            return AtualizarSePreciso(true);
        }

        public Dictionary<string, object> DefinirPausado(bool? novoValor)
        {
            lock (_lock)
            {
                _pausado = novoValor.HasValue ? novoValor.Value : !_pausado;
                SalvarConfig();
                _ultimaLeituraUtc = DateTime.MinValue;
            }
            AtualizarTextoItemPausa();
            return AtualizarSePreciso(true);
        }

        public Dictionary<string, object> DefinirFonte(string novaFonte)
        {
            lock (_lock)
            {
                if (novaFonte != null)
                {
                    string limpa = novaFonte.Trim();
                    _arquivoExtraManual = limpa.StartsWith("@app:") ? "" : limpa;
                }
                SalvarConfig();
                _ultimaLeituraUtc = DateTime.MinValue;
            }
            return AtualizarSePreciso(true);
        }

        public Dictionary<string, object> AtualizarSePreciso(bool forcar)
        {
            bool pausadoAtual;
            List<RegraLivro> livrosCopia;
            string extraAtual;

            lock (_lock)
            {
                if (!forcar && _ultimaLeituraUtc != DateTime.MinValue &&
                    (DateTime.UtcNow - _ultimaLeituraUtc).TotalSeconds < INTERVALO_SEGUNDOS)
                {
                    return new Dictionary<string, object>(_statusAtual);
                }
                pausadoAtual = _pausado;
                livrosCopia = new List<RegraLivro>(_livros);
                extraAtual = _arquivoExtraManual;
            }

            Dictionary<string, object> novoStatus;

            if (pausadoAtual)
            {
                novoStatus = CriarStatusBase("pausado", true);
            }
            else
            {
                string nomeDoc = null;
                string modo = "";
                string caminhoDisco = null;

                string docWord = ContarPalavras.ObterNomeDocumentoWordAberto();
                if (!string.IsNullOrEmpty(docWord))
                {
                    nomeDoc = Path.GetFileName(docWord);
                    modo = "word";
                }
                else if (!string.IsNullOrEmpty(extraAtual))
                {
                    nomeDoc = Path.GetFileName(extraAtual);
                    modo = "arquivo";
                    caminhoDisco = extraAtual;
                }

                if (string.IsNullOrEmpty(nomeDoc))
                {
                    novoStatus = CriarStatusBase("aguardando", false);
                }
                else
                {
                    RegraLivro livroCorresp = EncontrarLivroParaDocumento(nomeDoc, livrosCopia);
                    if (livroCorresp == null)
                    {
                        // REGRA MÁXIMA: documento não pertence a nenhum livro -> IGNORA sem ler texto.
                        novoStatus = CriarStatusBase("ignorado", false);
                        novoStatus["modo"] = modo;
                        novoStatus["arquivoNome"] = nomeDoc;
                    }
                    else
                    {
                        try
                        {
                            ResultadoContagem res = (modo == "word")
                                ? ContarPalavras.ContarPalavrasWordAberto()
                                : ContarPalavras.ContarPalavrasArquivoDisco(caminhoDisco);

                            novoStatus = CriarStatusBase("contando", false);
                            novoStatus["modo"] = modo;
                            novoStatus["arquivoNome"] = nomeDoc;
                            novoStatus["livroId"] = livroCorresp.Id;
                            novoStatus["livroNome"] = livroCorresp.Nome;
                            novoStatus["palavras"] = res.Palavras;
                            novoStatus["tamanhoBytes"] = res.TamanhoBytes;
                            novoStatus["modificadoEm"] = res.ModificadoEm;
                        }
                        catch (Exception ex)
                        {
                            novoStatus = CriarStatusBase("erro", false);
                            novoStatus["modo"] = modo;
                            novoStatus["arquivoNome"] = nomeDoc;
                            novoStatus["livroId"] = livroCorresp.Id;
                            novoStatus["livroNome"] = livroCorresp.Nome;
                            novoStatus["erro"] = ex.Message;
                        }
                    }
                }
            }

            lock (_lock)
            {
                _statusAtual = novoStatus;
                _ultimaLeituraUtc = DateTime.UtcNow;
                return new Dictionary<string, object>(_statusAtual);
            }
        }

        private void IniciarServidorLocal()
        {
            try
            {
                _listener = new TcpListener(IPAddress.Loopback, PORTA);
                _listener.Start();

                Thread t = new Thread(LoopAceitarConexoes);
                t.IsBackground = true;
                t.Start();
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Não consegui ligar o contador local na porta 8765.\nVerifique se ele já não está aberto perto do relógio.\n\nDetalhe: " + ex.Message,
                    "Central de Livrinhos",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
            }
        }

        private void LoopAceitarConexoes()
        {
            while (_rodando)
            {
                try
                {
                    TcpClient cliente = _listener.AcceptTcpClient();
                    ThreadPool.QueueUserWorkItem(delegate { ProcessarClienteHttp(cliente); });
                }
                catch
                {
                    if (!_rodando) break;
                    Thread.Sleep(200);
                }
            }
        }

        private void ProcessarClienteHttp(TcpClient cliente)
        {
            using (cliente)
            {
                cliente.ReceiveTimeout = 5000;
                cliente.SendTimeout = 5000;
                try
                {
                    NetworkStream stream = cliente.GetStream();
                    byte[] buffer = new byte[8192];
                    MemoryStream ms = new MemoryStream();
                    int idxFimCab = -1;

                    while (ms.Length < 131072)
                    {
                        int lidos = stream.Read(buffer, 0, buffer.Length);
                        if (lidos <= 0) break;
                        ms.Write(buffer, 0, lidos);
                        idxFimCab = EncontrarFimCabecalho(ms.GetBuffer(), (int)ms.Length);
                        if (idxFimCab >= 0) break;
                    }

                    if (idxFimCab < 0) return;

                    byte[] todos = ms.GetBuffer();
                    int totalLido = (int)ms.Length;
                    string cabecalhoTexto = Encoding.UTF8.GetString(todos, 0, idxFimCab);
                    string[] linhas = cabecalhoTexto.Split(new string[] { "\r\n" }, StringSplitOptions.None);
                    if (linhas.Length == 0) return;

                    string[] reqPartes = linhas[0].Split(' ');
                    if (reqPartes.Length < 2) return;
                    string metodo = reqPartes[0].ToUpperInvariant();
                    string urlBruta = reqPartes[1];

                    int contentLength = 0;
                    string cabHost = "";
                    string cabOrigin = "";
                    string cabReferer = "";
                    string cabSecFetchSite = "";

                    for (int i = 1; i < linhas.Length; i++)
                    {
                        int posDoisPontos = linhas[i].IndexOf(':');
                        if (posDoisPontos > 0)
                        {
                            string chave = linhas[i].Substring(0, posDoisPontos).Trim().ToLowerInvariant();
                            string val = linhas[i].Substring(posDoisPontos + 1).Trim();
                            if (chave == "content-length")
                            {
                                int parsedLen;
                                if (int.TryParse(val, out parsedLen) && parsedLen > 0)
                                {
                                    contentLength = Math.Min(parsedLen, 262144);
                                }
                            }
                            else if (chave == "host")
                            {
                                cabHost = val;
                            }
                            else if (chave == "origin")
                            {
                                cabOrigin = val;
                            }
                            else if (chave == "referer")
                            {
                                cabReferer = val;
                            }
                            else if (chave == "sec-fetch-site")
                            {
                                cabSecFetchSite = val;
                            }
                        }
                    }

                    int inicioBody = idxFimCab + 4;
                    MemoryStream bodyStream = new MemoryStream();
                    int jaNoBody = Math.Max(0, totalLido - inicioBody);
                    if (jaNoBody > 0)
                    {
                        bodyStream.Write(todos, inicioBody, Math.Min(jaNoBody, contentLength));
                    }
                    while (bodyStream.Length < contentLength)
                    {
                        int falta = contentLength - (int)bodyStream.Length;
                        int n = stream.Read(buffer, 0, Math.Min(buffer.Length, falta));
                        if (n <= 0) break;
                        bodyStream.Write(buffer, 0, n);
                    }

                    string bodyTexto = Encoding.UTF8.GetString(bodyStream.ToArray());
                    string caminhoUrl = urlBruta;
                    string query = "";
                    int idxQ = urlBruta.IndexOf('?');
                    if (idxQ >= 0)
                    {
                        caminhoUrl = urlBruta.Substring(0, idxQ);
                        query = urlBruta.Substring(idxQ + 1);
                    }

                    ResponderRequisicao(
                        stream,
                        metodo,
                        caminhoUrl,
                        query,
                        bodyTexto,
                        cabHost,
                        cabOrigin,
                        cabReferer,
                        cabSecFetchSite
                    );
                }
                catch
                {
                    // Ignora erro de socket individual.
                }
            }
        }

        private List<string> ObterOrigensPermitidas()
        {
            List<string> lista = new List<string>();
            lista.Add(string.Format("http://127.0.0.1:{0}", PORTA));
            lista.Add(string.Format("http://localhost:{0}", PORTA));
            string oficial = (ORIGEM_GITHUB_PAGES ?? "").Trim().TrimEnd('/');
            if (!string.IsNullOrEmpty(oficial))
            {
                lista.Add(oficial);
            }
            return lista;
        }

        private bool RequisicaoAutorizada(
            string metodo,
            string host,
            string origin,
            string referer,
            string secFetchSite,
            out string origemEco
        )
        {
            origemEco = "";
            string hostLimpo = (host ?? "").Trim().ToLowerInvariant();
            string host1 = string.Format("127.0.0.1:{0}", PORTA);
            string host2 = string.Format("localhost:{0}", PORTA);
            if (hostLimpo != host1 && hostLimpo != host2)
            {
                return false;
            }

            List<string> permitidas = ObterOrigensPermitidas();
            string originLimpo = (origin ?? "").Trim().TrimEnd('/');
            if (!string.IsNullOrEmpty(originLimpo))
            {
                foreach (string orig in permitidas)
                {
                    if (string.Equals(originLimpo, orig, StringComparison.OrdinalIgnoreCase))
                    {
                        origemEco = orig;
                        return true;
                    }
                }
                return false;
            }

            if (metodo == "OPTIONS")
            {
                return false;
            }

            string fetchSite = (secFetchSite ?? "").Trim().ToLowerInvariant();
            if (fetchSite == "cross-site" || fetchSite == "same-site")
            {
                return false;
            }

            bool refererOk = false;
            string refLimpo = (referer ?? "").Trim();
            if (!string.IsNullOrEmpty(refLimpo))
            {
                Uri refUri;
                if (!Uri.TryCreate(refLimpo, UriKind.Absolute, out refUri))
                {
                    return false;
                }
                string origRef = refUri.GetLeftPart(UriPartial.Authority).TrimEnd('/');
                foreach (string orig in permitidas)
                {
                    if (string.Equals(origRef, orig, StringComparison.OrdinalIgnoreCase))
                    {
                        refererOk = true;
                        break;
                    }
                }
                if (!refererOk)
                {
                    return false;
                }
            }

            if (metodo == "POST" && fetchSite != "same-origin" && !refererOk)
            {
                return false;
            }

            return true;
        }

        private void ResponderRequisicao(
            NetworkStream stream,
            string metodo,
            string caminho,
            string query,
            string body,
            string cabHost,
            string cabOrigin,
            string cabReferer,
            string cabSecFetchSite
        )
        {
            string origemEco;
            if (!RequisicaoAutorizada(metodo, cabHost, cabOrigin, cabReferer, cabSecFetchSite, out origemEco))
            {
                Dictionary<string, object> err403 = new Dictionary<string, object>();
                err403["erro"] = "Origem não autorizada.";
                EnviarJson(stream, 403, err403, "");
                return;
            }

            if (metodo == "OPTIONS")
            {
                EnviarResposta(stream, 204, "text/plain", new byte[0], origemEco);
                return;
            }

            if (metodo == "GET" && caminho == "/api/status")
            {
                bool forcar = query.Contains("agora=1");
                EnviarJson(stream, 200, AtualizarSePreciso(forcar), origemEco);
                return;
            }

            if (metodo == "GET")
            {
                string rel = caminho.TrimStart('/');
                if (string.IsNullOrEmpty(rel)) rel = "index.html";
                if (rel != "index.html" && rel != "style.css" && rel != "app.js")
                {
                    Dictionary<string, object> err404 = new Dictionary<string, object>();
                    err404["erro"] = "Caminho não encontrado.";
                    EnviarJson(stream, 404, err404, origemEco);
                    return;
                }

                string arq = Path.Combine(_pastaBase, rel);
                if (!File.Exists(arq))
                {
                    Dictionary<string, object> errArq = new Dictionary<string, object>();
                    errArq["erro"] = "Arquivo não encontrado.";
                    EnviarJson(stream, 404, errArq, origemEco);
                    return;
                }

                string mime = rel.EndsWith(".css") ? "text/css" : (rel.EndsWith(".js") ? "application/javascript" : "text/html");
                byte[] conteudo = File.ReadAllBytes(arq);
                EnviarResposta(stream, 200, mime + "; charset=utf-8", conteudo, origemEco);
                return;
            }

            if (metodo == "POST")
            {
                if (caminho == "/api/regras-livros")
                {
                    Dictionary<string, object> req = DeserializarDict(body);
                    object livrosObj = req.ContainsKey("livros") ? req["livros"] : null;
                    EnviarJson(stream, 200, AtualizarRegrasLivros(livrosObj), origemEco);
                    return;
                }

                if (caminho == "/api/pausar")
                {
                    Dictionary<string, object> req = DeserializarDict(body);
                    bool? val = req.ContainsKey("pausado") ? (bool?)ObterBool(req, "pausado", false) : null;
                    EnviarJson(stream, 200, DefinirPausado(val), origemEco);
                    return;
                }

                if (caminho == "/api/escolher-arquivo")
                {
                    string arq = EscolherArquivoNaMaoUi();
                    Dictionary<string, object> st = AtualizarSePreciso(true);
                    st["cancelado"] = string.IsNullOrEmpty(arq);
                    EnviarJson(stream, 200, st, origemEco);
                    return;
                }

                if (caminho == "/api/ler-agora")
                {
                    EnviarJson(stream, 200, AtualizarSePreciso(true), origemEco);
                    return;
                }

                if (caminho == "/api/abrir-central")
                {
                    AbrirJanelaCentral();
                    Dictionary<string, object> ok = new Dictionary<string, object>();
                    ok["ok"] = true;
                    EnviarJson(stream, 200, ok, origemEco);
                    return;
                }

                if (caminho == "/api/abrir-janelinha")
                {
                    AbrirJanelinhaMesa();
                    Dictionary<string, object> ok = new Dictionary<string, object>();
                    ok["ok"] = true;
                    EnviarJson(stream, 200, ok, origemEco);
                    return;
                }
            }

            Dictionary<string, object> notFound = new Dictionary<string, object>();
            notFound["erro"] = "Ação não encontrada.";
            EnviarJson(stream, 404, notFound, origemEco);
        }

        private void EnviarJson(NetworkStream stream, int status, object dados, string origemEco)
        {
            string json = _json.Serialize(dados);
            byte[] bytes = Encoding.UTF8.GetBytes(json);
            EnviarResposta(stream, status, "application/json; charset=utf-8", bytes, origemEco);
        }

        private void EnviarResposta(NetworkStream stream, int status, string contentType, byte[] corpo, string origemEco)
        {
            string statusTxt = status == 200 ? "OK" : (status == 204 ? "No Content" : (status == 403 ? "Forbidden" : "Not Found"));
            StringBuilder sb = new StringBuilder();
            sb.AppendFormat("HTTP/1.1 {0} {1}\r\n", status, statusTxt);
            sb.AppendFormat("Content-Type: {0}\r\n", contentType);
            sb.AppendFormat("Content-Length: {0}\r\n", corpo.Length);
            sb.Append("Vary: Origin\r\n");
            sb.Append("Cache-Control: no-store\r\n");
            if (!string.IsNullOrEmpty(origemEco))
            {
                sb.AppendFormat("Access-Control-Allow-Origin: {0}\r\n", origemEco);
                sb.Append("Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n");
                sb.Append("Access-Control-Allow-Headers: Content-Type\r\n");
                sb.Append("Access-Control-Allow-Private-Network: true\r\n");
            }
            sb.Append("Connection: close\r\n\r\n");

            byte[] cab = Encoding.UTF8.GetBytes(sb.ToString());
            stream.Write(cab, 0, cab.Length);
            if (corpo.Length > 0)
            {
                stream.Write(corpo, 0, corpo.Length);
            }
            stream.Flush();
        }

        private static int EncontrarFimCabecalho(byte[] buf, int len)
        {
            for (int i = 0; i <= len - 4; i++)
            {
                if (buf[i] == 13 && buf[i + 1] == 10 && buf[i + 2] == 13 && buf[i + 3] == 10)
                {
                    return i;
                }
            }
            return -1;
        }

        private Dictionary<string, object> DeserializarDict(string body)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(body)) return new Dictionary<string, object>();
                Dictionary<string, object> d = _json.Deserialize<Dictionary<string, object>>(body);
                return d ?? new Dictionary<string, object>();
            }
            catch
            {
                return new Dictionary<string, object>();
            }
        }

        private static string ObterString(Dictionary<string, object> d, string chave)
        {
            if (d == null || !d.ContainsKey(chave) || d[chave] == null) return "";
            return Convert.ToString(d[chave]).Trim();
        }

        private static bool ObterBool(Dictionary<string, object> d, string chave, bool padrao)
        {
            if (d == null || !d.ContainsKey(chave) || d[chave] == null) return padrao;
            try
            {
                return Convert.ToBoolean(d[chave]);
            }
            catch
            {
                return padrao;
            }
        }

        private static int ObterInt(Dictionary<string, object> d, string chave, int padrao)
        {
            if (d == null || !d.ContainsKey(chave) || d[chave] == null) return padrao;
            try
            {
                return Convert.ToInt32(d[chave]);
            }
            catch
            {
                return padrao;
            }
        }

        private static int? ObterIntNulo(Dictionary<string, object> d, string chave)
        {
            if (d == null || !d.ContainsKey(chave) || d[chave] == null) return null;
            try
            {
                return Convert.ToInt32(d[chave]);
            }
            catch
            {
                return null;
            }
        }
    }

    #region WebView2 Nativo (COM sem pacote externo)

    [StructLayout(LayoutKind.Sequential)]
    internal struct WebViewRect
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [ComImport]
    [Guid("4e8a3389-c9d8-4bd2-b6b5-124fee6cc14d")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler
    {
        [PreserveSig]
        int Invoke(int errorCode, IntPtr createdEnvironment);
    }

    [ComImport]
    [Guid("6c4819f3-c9b7-4260-8127-c9f5bde7f68c")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface ICoreWebView2CreateCoreWebView2ControllerCompletedHandler
    {
        [PreserveSig]
        int Invoke(int errorCode, IntPtr createdController);
    }

    [ComImport]
    [Guid("b96d755e-0319-4e92-a296-23436f46a1fc")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface ICoreWebView2Environment
    {
        [PreserveSig]
        int CreateCoreWebView2Controller(
            IntPtr parentWindow,
            [MarshalAs(UnmanagedType.Interface)] ICoreWebView2CreateCoreWebView2ControllerCompletedHandler handler);
    }

    [ComImport]
    [Guid("4d00c0d1-9434-4eb6-8078-8697a560334f")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface ICoreWebView2Controller
    {
        [PreserveSig] int get_IsVisible(out int isVisible);
        [PreserveSig] int put_IsVisible(int isVisible);
        [PreserveSig] int get_Bounds(out WebViewRect bounds);
        [PreserveSig] int put_Bounds(WebViewRect bounds);
        [PreserveSig] int get_ZoomFactor(out double zoomFactor);
        [PreserveSig] int put_ZoomFactor(double zoomFactor);
        [PreserveSig] int add_ZoomFactorChanged(IntPtr eventHandler, out long token);
        [PreserveSig] int remove_ZoomFactorChanged(long token);
        [PreserveSig] int SetBoundsAndZoomFactor(WebViewRect bounds, double zoomFactor);
        [PreserveSig] int MoveFocus(int reason);
        [PreserveSig] int add_MoveFocusRequested(IntPtr eventHandler, out long token);
        [PreserveSig] int remove_MoveFocusRequested(long token);
        [PreserveSig] int add_GotFocus(IntPtr eventHandler, out long token);
        [PreserveSig] int remove_GotFocus(long token);
        [PreserveSig] int add_LostFocus(IntPtr eventHandler, out long token);
        [PreserveSig] int remove_LostFocus(long token);
        [PreserveSig] int add_AcceleratorKeyPressed(IntPtr eventHandler, out long token);
        [PreserveSig] int remove_AcceleratorKeyPressed(long token);
        [PreserveSig] int get_ParentWindow(out IntPtr parentWindow);
        [PreserveSig] int put_ParentWindow(IntPtr parentWindow);
        [PreserveSig] int NotifyParentWindowPositionChanged();
        [PreserveSig] int Close();
        [PreserveSig] int get_CoreWebView2(out IntPtr coreWebView2);
    }

    [ComImport]
    [Guid("76eceacb-0462-4d94-ac83-423a6793775e")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface ICoreWebView2
    {
        [PreserveSig] int get_Settings(out IntPtr settings);
        [PreserveSig] int get_Source(out IntPtr uri);
        [PreserveSig] int Navigate([MarshalAs(UnmanagedType.LPWStr)] string uri);
    }

    [ComVisible(true)]
    [ClassInterface(ClassInterfaceType.None)]
    internal sealed class CallbackAmbienteWebView2 : ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler
    {
        private readonly Action<int, IntPtr> _aoConcluir;

        public CallbackAmbienteWebView2(Action<int, IntPtr> aoConcluir)
        {
            _aoConcluir = aoConcluir;
        }

        public int Invoke(int errorCode, IntPtr createdEnvironment)
        {
            try
            {
                if (_aoConcluir != null) _aoConcluir(errorCode, createdEnvironment);
            }
            catch
            {
                // Não propaga exceção gerenciada através da fronteira COM.
            }
            return 0;
        }
    }

    [ComVisible(true)]
    [ClassInterface(ClassInterfaceType.None)]
    internal sealed class CallbackControladorWebView2 : ICoreWebView2CreateCoreWebView2ControllerCompletedHandler
    {
        private readonly Action<int, IntPtr> _aoConcluir;

        public CallbackControladorWebView2(Action<int, IntPtr> aoConcluir)
        {
            _aoConcluir = aoConcluir;
        }

        public int Invoke(int errorCode, IntPtr createdController)
        {
            try
            {
                if (_aoConcluir != null) _aoConcluir(errorCode, createdController);
            }
            catch
            {
                // Não propaga exceção gerenciada através da fronteira COM.
            }
            return 0;
        }
    }

    internal sealed class MotorWebView2
    {
        private const uint LOAD_WITH_ALTERED_SEARCH_PATH = 0x00000008;

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern IntPtr LoadLibraryExW(string lpFileName, IntPtr hFile, uint dwFlags);

        [DllImport("kernel32.dll", CharSet = CharSet.Ansi, SetLastError = true)]
        private static extern IntPtr GetProcAddress(IntPtr hModule, string procName);

        [UnmanagedFunctionPointer(CallingConvention.StdCall, CharSet = CharSet.Unicode)]
        private delegate int CreateWebViewEnvDelegate(
            int unknown,
            int runtimeType,
            [MarshalAs(UnmanagedType.LPWStr)] string userDataDir,
            IntPtr environmentOptions,
            IntPtr environmentCompletedHandler);

        private readonly string _pastaDados;
        private readonly Control _invokerUi;
        private string _caminhoDllCache;
        private bool _buscaFeita = false;
        private bool _indisponivel = false;
        private bool _iniciando = false;
        private IntPtr _moduloDll = IntPtr.Zero;
        private CreateWebViewEnvDelegate _criarAmbienteFn;
        private ICoreWebView2Environment _ambiente;
        private CallbackAmbienteWebView2 _callbackEmVoo;
        private readonly List<Action<ICoreWebView2Environment>> _pendentes = new List<Action<ICoreWebView2Environment>>();

        public MotorWebView2(string pastaDados, Control invokerUi)
        {
            _pastaDados = pastaDados;
            _invokerUi = invokerUi;
        }

        public bool WebView2Disponivel()
        {
            if (_indisponivel) return false;
            return !string.IsNullOrEmpty(ObterCaminhoDll());
        }

        public void MarcarIndisponivel()
        {
            _indisponivel = true;
            _iniciando = false;
            DespacharPendentes(null);
        }

        public void ObterAmbienteAsync(Action<ICoreWebView2Environment> aoPronto)
        {
            if (_indisponivel)
            {
                if (aoPronto != null) aoPronto(null);
                return;
            }

            if (_ambiente != null)
            {
                if (aoPronto != null) aoPronto(_ambiente);
                return;
            }

            if (aoPronto != null)
            {
                _pendentes.Add(aoPronto);
            }

            if (_iniciando) return;
            _iniciando = true;

            if (!GarantirPontoEntrada())
            {
                MarcarIndisponivel();
                return;
            }

            try
            {
                if (!Directory.Exists(_pastaDados))
                {
                    Directory.CreateDirectory(_pastaDados);
                }

                _callbackEmVoo = new CallbackAmbienteWebView2(delegate(int hr, IntPtr envPtr)
                {
                    ICoreWebView2Environment envObtido = null;
                    if (hr == 0 && envPtr != IntPtr.Zero)
                    {
                        try
                        {
                            envObtido = (ICoreWebView2Environment)Marshal.GetObjectForIUnknown(envPtr);
                        }
                        catch
                        {
                            envObtido = null;
                        }
                    }

                    Action finalizar = delegate
                    {
                        _callbackEmVoo = null;
                        _iniciando = false;
                        if (envObtido != null)
                        {
                            _ambiente = envObtido;
                            DespacharPendentes(_ambiente);
                        }
                        else
                        {
                            MarcarIndisponivel();
                        }
                    };

                    if (_invokerUi != null && _invokerUi.InvokeRequired && !_invokerUi.IsDisposed)
                    {
                        try { _invokerUi.BeginInvoke((MethodInvoker)delegate { finalizar(); }); }
                        catch { finalizar(); }
                    }
                    else
                    {
                        finalizar();
                    }
                });

                IntPtr handlerPtr = Marshal.GetComInterfaceForObject(
                    _callbackEmVoo,
                    typeof(ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler));
                try
                {
                    int hrChamada = _criarAmbienteFn(1, 0, _pastaDados, IntPtr.Zero, handlerPtr);
                    if (hrChamada != 0)
                    {
                        _callbackEmVoo = null;
                        MarcarIndisponivel();
                    }
                }
                finally
                {
                    if (handlerPtr != IntPtr.Zero) Marshal.Release(handlerPtr);
                }
            }
            catch
            {
                _callbackEmVoo = null;
                MarcarIndisponivel();
            }
        }

        private void DespacharPendentes(ICoreWebView2Environment env)
        {
            if (_pendentes.Count == 0) return;
            List<Action<ICoreWebView2Environment>> copia = new List<Action<ICoreWebView2Environment>>(_pendentes);
            _pendentes.Clear();
            foreach (Action<ICoreWebView2Environment> cb in copia)
            {
                try
                {
                    cb(env);
                }
                catch
                {
                    // Isola falha de um assinante dos demais.
                }
            }
        }

        private bool GarantirPontoEntrada()
        {
            if (_criarAmbienteFn != null) return true;
            string dll = ObterCaminhoDll();
            if (string.IsNullOrEmpty(dll)) return false;

            _moduloDll = LoadLibraryExW(dll, IntPtr.Zero, LOAD_WITH_ALTERED_SEARCH_PATH);
            if (_moduloDll == IntPtr.Zero) return false;

            IntPtr proc = GetProcAddress(_moduloDll, "CreateWebViewEnvironmentWithOptionsInternal");
            if (proc == IntPtr.Zero) return false;

            _criarAmbienteFn = (CreateWebViewEnvDelegate)Marshal.GetDelegateForFunctionPointer(
                proc,
                typeof(CreateWebViewEnvDelegate));
            return _criarAmbienteFn != null;
        }

        private string ObterCaminhoDll()
        {
            if (_buscaFeita) return _caminhoDllCache;
            _buscaFeita = true;
            _caminhoDllCache = LocalizarEmbeddedBrowserDll();
            return _caminhoDllCache;
        }

        private static string LocalizarEmbeddedBrowserDll()
        {
            string arch = Environment.Is64BitProcess ? "x64" : "x86";
            string[] guids = new string[]
            {
                "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}", // Evergreen Runtime
                "{2CD8A007-E189-409D-A2C8-9AF4EF3C72AA}", // Edge Beta
                "{0D50BFEC-CD6A-4F9A-964C-C7416E3ACB10}", // Edge Dev
                "{65C35B14-6C1D-4122-AC46-7148CC9D6497}"  // Edge Canary
            };
            RegistryHive[] hives = new RegistryHive[] { RegistryHive.CurrentUser, RegistryHive.LocalMachine };
            RegistryView[] views = new RegistryView[] { RegistryView.Registry64, RegistryView.Registry32 };

            foreach (string guid in guids)
            {
                foreach (RegistryHive hive in hives)
                {
                    foreach (RegistryView view in views)
                    {
                        try
                        {
                            using (RegistryKey baseKey = RegistryKey.OpenBaseKey(hive, view))
                            using (RegistryKey sub = baseKey.OpenSubKey(@"SOFTWARE\Microsoft\EdgeUpdate\ClientState\" + guid))
                            {
                                if (sub == null) continue;
                                string eb = sub.GetValue("EBWebView") as string;
                                string encontrada = ResolverDllEmPasta(eb, arch);
                                if (!string.IsNullOrEmpty(encontrada)) return encontrada;
                            }
                        }
                        catch
                        {
                            // Continua na próxima entrada do registro.
                        }
                    }
                }
            }

            string[] raizes = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\EdgeWebView\Application"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\EdgeWebView\Application"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\EdgeWebView\Application"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application")
            };

            foreach (string raiz in raizes)
            {
                if (string.IsNullOrEmpty(raiz) || !Directory.Exists(raiz)) continue;
                try
                {
                    string[] subpastas = Directory.GetDirectories(raiz);
                    Array.Sort(subpastas, CompararVersoesPastaDesc);
                    foreach (string pastaVer in subpastas)
                    {
                        string encontrada = ResolverDllEmPasta(pastaVer, arch);
                        if (!string.IsNullOrEmpty(encontrada)) return encontrada;
                    }
                }
                catch
                {
                    // Ignora pasta sem acesso.
                }
            }

            return null;
        }

        private static string ResolverDllEmPasta(string pastaBase, string arch)
        {
            if (string.IsNullOrEmpty(pastaBase)) return null;
            string limpo = pastaBase.Trim().Trim('"');
            string[] tentativas = new string[]
            {
                Path.Combine(limpo, "EBWebView", arch, "EmbeddedBrowserWebView.dll"),
                Path.Combine(limpo, arch, "EmbeddedBrowserWebView.dll"),
                Path.Combine(limpo, "EmbeddedBrowserWebView.dll")
            };
            foreach (string caminho in tentativas)
            {
                try
                {
                    if (File.Exists(caminho)) return caminho;
                }
                catch
                {
                    // Ignora
                }
            }
            return null;
        }

        private static int CompararVersoesPastaDesc(string a, string b)
        {
            Version va;
            Version vb;
            bool oka = Version.TryParse(Path.GetFileName(a), out va);
            bool okb = Version.TryParse(Path.GetFileName(b), out vb);
            if (oka && okb) return vb.CompareTo(va);
            if (okb) return 1;
            if (oka) return -1;
            return string.Compare(b, a, StringComparison.OrdinalIgnoreCase);
        }
    }

    internal sealed class JanelaAppWebView2 : Form
    {
        private readonly MotorWebView2 _motor;
        private readonly string _url;
        private readonly Action<Rectangle> _aoSalvarLimites;
        private readonly Action _aoFalharParaFallback;
        private CallbackControladorWebView2 _callbackCtrlEmVoo;
        private ICoreWebView2Controller _controller;
        private ICoreWebView2 _core;
        private bool _fechando = false;
        private bool _disparouFallback = false;

        public JanelaAppWebView2(
            MotorWebView2 motor,
            string titulo,
            string url,
            Icon icone,
            Size tamanho,
            Size tamanhoMinimo,
            Point? posicaoInicial,
            bool semprePorCima,
            Action<Rectangle> aoSalvarLimites,
            Action aoFalharParaFallback)
        {
            _motor = motor;
            _url = url;
            _aoSalvarLimites = aoSalvarLimites;
            _aoFalharParaFallback = aoFalharParaFallback;

            this.Text = titulo;
            this.BackColor = Color.FromArgb(245, 236, 219);
            this.Size = tamanho;
            this.MinimumSize = tamanhoMinimo;
            this.ShowIcon = true;
            this.ShowInTaskbar = true;
            this.TopMost = semprePorCima;

            if (icone != null)
            {
                this.Icon = icone;
            }

            if (posicaoInicial.HasValue)
            {
                this.StartPosition = FormStartPosition.Manual;
                this.Location = posicaoInicial.Value;
            }
            else
            {
                this.StartPosition = FormStartPosition.CenterScreen;
            }

            this.HandleCreated += delegate { IniciarWebView2(); };
            this.Resize += delegate { AtualizarBoundsWebView2(); };
            this.LocationChanged += delegate { NotificarMovimento(); };
            this.Activated += delegate { FocarWebView2(); };
            this.ResizeEnd += delegate { NotificarLimitesAtuais(); };
            this.FormClosing += delegate
            {
                _fechando = true;
                NotificarLimitesAtuais();
                EncerrarWebView2();
            };
        }

        private void IniciarWebView2()
        {
            if (_fechando || this.IsDisposed || _controller != null) return;
            _motor.ObterAmbienteAsync(delegate(ICoreWebView2Environment env)
            {
                if (_fechando || this.IsDisposed || !this.IsHandleCreated) return;
                if (env == null)
                {
                    AcionarFallbackExterno();
                    return;
                }

                try
                {
                    _callbackCtrlEmVoo = new CallbackControladorWebView2(delegate(int hr, IntPtr ctrlPtr)
                    {
                        ICoreWebView2Controller ctrl = null;
                        if (hr == 0 && ctrlPtr != IntPtr.Zero)
                        {
                            try
                            {
                                ctrl = (ICoreWebView2Controller)Marshal.GetObjectForIUnknown(ctrlPtr);
                            }
                            catch
                            {
                                ctrl = null;
                            }
                        }

                        Action finalizar = delegate
                        {
                            _callbackCtrlEmVoo = null;
                            AnexarControlador(ctrl);
                        };

                        if (this.InvokeRequired && !this.IsDisposed)
                        {
                            try { this.BeginInvoke((MethodInvoker)delegate { finalizar(); }); }
                            catch { }
                        }
                        else
                        {
                            finalizar();
                        }
                    });

                    int hrCtrl = env.CreateCoreWebView2Controller(this.Handle, _callbackCtrlEmVoo);
                    if (hrCtrl != 0)
                    {
                        _callbackCtrlEmVoo = null;
                        _motor.MarcarIndisponivel();
                        AcionarFallbackExterno();
                    }
                }
                catch
                {
                    _callbackCtrlEmVoo = null;
                    _motor.MarcarIndisponivel();
                    AcionarFallbackExterno();
                }
            });
        }

        private void AnexarControlador(ICoreWebView2Controller ctrl)
        {
            if (ctrl == null)
            {
                _motor.MarcarIndisponivel();
                AcionarFallbackExterno();
                return;
            }

            if (_fechando || this.IsDisposed)
            {
                try { ctrl.Close(); } catch { }
                try { Marshal.ReleaseComObject(ctrl); } catch { }
                return;
            }

            try
            {
                _controller = ctrl;
                IntPtr corePtr = IntPtr.Zero;
                int hrCore = _controller.get_CoreWebView2(out corePtr);
                if (hrCore != 0 || corePtr == IntPtr.Zero)
                {
                    EncerrarWebView2();
                    _motor.MarcarIndisponivel();
                    AcionarFallbackExterno();
                    return;
                }

                try
                {
                    _core = (ICoreWebView2)Marshal.GetObjectForIUnknown(corePtr);
                }
                finally
                {
                    Marshal.Release(corePtr);
                }

                AtualizarBoundsWebView2();
                _controller.put_IsVisible(1);
                _core.Navigate(_url);
                FocarWebView2();
            }
            catch
            {
                EncerrarWebView2();
                _motor.MarcarIndisponivel();
                AcionarFallbackExterno();
            }
        }

        private void AcionarFallbackExterno()
        {
            if (_disparouFallback || _fechando) return;
            _disparouFallback = true;
            try
            {
                this.Close();
            }
            catch
            {
                // Ignora
            }
            if (_aoFalharParaFallback != null)
            {
                _aoFalharParaFallback();
            }
        }

        private void AtualizarBoundsWebView2()
        {
            if (_controller == null || this.IsDisposed) return;
            try
            {
                Rectangle cli = this.ClientRectangle;
                WebViewRect rect = new WebViewRect();
                rect.Left = 0;
                rect.Top = 0;
                rect.Right = Math.Max(1, cli.Width);
                rect.Bottom = Math.Max(1, cli.Height);
                _controller.put_Bounds(rect);
                _controller.put_IsVisible(this.WindowState == FormWindowState.Minimized ? 0 : 1);
            }
            catch
            {
                // Ignora ao encerrar.
            }
        }

        private void NotificarMovimento()
        {
            if (_controller == null || this.IsDisposed) return;
            try
            {
                _controller.NotifyParentWindowPositionChanged();
            }
            catch
            {
                // Ignora
            }
        }

        private void FocarWebView2()
        {
            if (_controller == null || this.IsDisposed) return;
            try
            {
                _controller.MoveFocus(0);
            }
            catch
            {
                // Ignora
            }
        }

        private void NotificarLimitesAtuais()
        {
            if (_aoSalvarLimites == null) return;
            try
            {
                Rectangle r = this.WindowState == FormWindowState.Normal ? this.Bounds : this.RestoreBounds;
                if (r.Width > 0 && r.Height > 0)
                {
                    _aoSalvarLimites(r);
                }
            }
            catch
            {
                // Ignora
            }
        }

        private void EncerrarWebView2()
        {
            if (_controller != null)
            {
                try { _controller.Close(); } catch { }
                try { Marshal.ReleaseComObject(_controller); } catch { }
                _controller = null;
            }
            if (_core != null)
            {
                try { Marshal.ReleaseComObject(_core); } catch { }
                _core = null;
            }
        }
    }

    #endregion

    internal static class Program
    {
        [STAThread]
        private static void Main(string[] args)
        {
            bool silencioso = false;
            bool boasVindas = false;
            foreach (string a in args)
            {
                if (a == "--silencioso") silencioso = true;
                if (a == "--boas-vindas") boasVindas = true;
            }

            bool criouNova;
            using (Mutex mutex = new Mutex(true, "CentralDeLivrinhosContadorLocal_v1", out criouNova))
            {
                if (!criouNova)
                {
                    // Se o contador já está ligado em silêncio perto do relógio, pede para abrir a Central na janela própria.
                    if (!silencioso)
                    {
                        if (!SolicitarAberturaCentralJaRodando())
                        {
                            if (!ContextoBandeja.AbrirEdgeEmModoAplicativo("http://127.0.0.1:8765/", false, 1180, 820))
                            {
                                try
                                {
                                    Process.Start(new ProcessStartInfo("http://127.0.0.1:8765/") { UseShellExecute = true });
                                }
                                catch
                                {
                                    // Ignora
                                }
                            }
                        }
                    }
                    return;
                }

                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                ContextoBandeja ctx = new ContextoBandeja(boasVindas, !silencioso);
                Application.Run(ctx);
            }
        }

        private static bool SolicitarAberturaCentralJaRodando()
        {
            try
            {
                using (TcpClient cli = new TcpClient())
                {
                    IAsyncResult ar = cli.BeginConnect("127.0.0.1", 8765, null, null);
                    if (!ar.AsyncWaitHandle.WaitOne(1500, false))
                    {
                        return false;
                    }
                    cli.EndConnect(ar);
                    cli.ReceiveTimeout = 2000;
                    cli.SendTimeout = 2000;

                    string req =
                        "POST /api/abrir-central HTTP/1.1\r\n" +
                        "Host: 127.0.0.1:8765\r\n" +
                        "Origin: http://127.0.0.1:8765\r\n" +
                        "Content-Type: application/json\r\n" +
                        "Content-Length: 2\r\n" +
                        "Connection: close\r\n\r\n{}";
                    byte[] dados = Encoding.UTF8.GetBytes(req);
                    NetworkStream ns = cli.GetStream();
                    ns.Write(dados, 0, dados.Length);
                    ns.Flush();

                    byte[] resp = new byte[128];
                    int n = ns.Read(resp, 0, resp.Length);
                    string cab = n > 0 ? Encoding.UTF8.GetString(resp, 0, n) : "";
                    return cab.Contains(" 200 ");
                }
            }
            catch
            {
                return false;
            }
        }
    }
}
