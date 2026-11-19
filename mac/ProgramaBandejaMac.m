/*
 * ProgramaBandejaMac.m: Aplicativo nativo de bandeja e janela própria para macOS.
 * Central de Livrinhos (100% local, sem internet, sem IA, privacidade máxima).
 *
 * Funcionalidades:
 * - Ícone de tomatinho pixelado na barra de menu (perto do relógio).
 * - Opção "Ligar sozinho com o Mac" (LaunchAgent em ~/Library/LaunchAgents com --silencioso).
 * - Abre a Central de Livrinhos e a Janelinha da Mesa em janelas nativas próprias (WKWebView).
 * - Janelinha com modo "sempre por cima" (flutuante sobre Pages/Word) e posição/tamanho lembrados.
 * - Servidor local estritamente em 127.0.0.1:8765 aceitando APENAS a própria Central (sem "*").
 * - Lê contagem numérica apenas de documentos cujos nomes estejam marcados na Estante.
 */

#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>
#import <arpa/inet.h>
#import <netinet/in.h>
#import <signal.h>
#import <sys/socket.h>
#import <unistd.h>

#import "ContarPalavras.h"

static NSString *const kHostLocal = @"127.0.0.1";
static const uint16_t kPortaServidor = 8765;
static const NSTimeInterval kIntervaloSegundos = 30.0;
// Quando a Fase 4 publicar no GitHub Pages, preencha APENAS o endereço oficial.
static NSString *const kOrigemGithubPages = @"";
static NSString *const kBundleIdLaunchAgent = @"com.raquel.centraldelivrinhos";

#pragma mark - Helpers de normalização e correspondência SÓ POR NOME

static NSArray<NSString *> *NormalizarListaTexto(id valor) {
    if (![valor isKindOfClass:[NSArray class]]) return @[];
    NSMutableArray<NSString *> *saida = [NSMutableArray array];
    NSMutableSet<NSString *> *vistos = [NSMutableSet set];
    for (id item in (NSArray *)valor) {
        NSString *txt = [[NSString stringWithFormat:@"%@", item ?: @""]
            stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
        if (txt.length == 0) continue;
        NSString *chave = txt.lowercaseString;
        if (![vistos containsObject:chave]) {
            [vistos addObject:chave];
            [saida addObject:txt];
        }
    }
    return saida;
}

static NSArray<NSDictionary *> *NormalizarRegrasLivros(id bruto) {
    if (![bruto isKindOfClass:[NSArray class]]) return @[];
    NSMutableArray<NSDictionary *> *saida = [NSMutableArray array];
    for (id item in (NSArray *)bruto) {
        if (![item isKindOfClass:[NSDictionary class]]) continue;
        NSDictionary *d = (NSDictionary *)item;
        NSString *livroId = [[NSString stringWithFormat:@"%@", d[@"id"] ?: @""]
            stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
        NSString *nome = [[NSString stringWithFormat:@"%@", d[@"nome"] ?: @""]
            stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
        if (livroId.length == 0 || nome.length == 0) continue;
        [saida addObject:@{
            @"id": livroId,
            @"nome": nome,
            @"arquivosMarcados": NormalizarListaTexto(d[@"arquivosMarcados"]),
            @"palavrasChave": NormalizarListaTexto(d[@"palavrasChave"]),
        }];
    }
    return saida;
}

/**
 * Confere SÓ O NOME do documento aberto contra os arquivos marcados e palavras-chave.
 * Nunca toca no texto de dentro do arquivo.
 */
static NSDictionary * _Nullable EncontrarLivroParaDocumento(NSString *nomeDoc, NSArray<NSDictionary *> *livros) {
    NSString *base = [[(nomeDoc ?: @"") stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]] lastPathComponent];
    if (base.length == 0) return nil;

    NSString *baseLower = base.lowercaseString;
    NSString *baseExt = baseLower.pathExtension;
    NSString *baseStem = [baseLower stringByDeletingPathExtension];

    // 1º: tenta correspondência com os arquivos explicitamente marcados em cada livro.
    for (NSDictionary *livro in livros) {
        for (NSString *marcado in (NSArray<NSString *> *)livro[@"arquivosMarcados"]) {
            NSString *marcadoBase = [[marcado stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]] lastPathComponent].lowercaseString;
            if (marcadoBase.length == 0) continue;
            NSString *marcadoExt = marcadoBase.pathExtension;
            NSString *marcadoStem = [marcadoBase stringByDeletingPathExtension];

            if ([baseLower isEqualToString:marcadoBase]) {
                return @{@"id": livro[@"id"], @"nome": livro[@"nome"]};
            }
            if ((baseExt.length == 0 || marcadoExt.length == 0) && [baseStem isEqualToString:marcadoStem]) {
                return @{@"id": livro[@"id"], @"nome": livro[@"nome"]};
            }
        }
    }

    // 2º: tenta palavras-chave opcionais no nome do documento (ex.: "Trilha", "cap").
    for (NSDictionary *livro in livros) {
        for (NSString *kw in (NSArray<NSString *> *)livro[@"palavrasChave"]) {
            NSString *kwLimpa = [kw stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]].lowercaseString;
            if (kwLimpa.length > 0 && [baseLower containsString:kwLimpa]) {
                return @{@"id": livro[@"id"], @"nome": livro[@"nome"]};
            }
        }
    }

    return nil;
}

static NSString *HoraAtualFormatada(void) {
    static NSDateFormatter *fmt = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        fmt = [[NSDateFormatter alloc] init];
        fmt.dateFormat = @"HH:mm:ss";
    });
    return [fmt stringFromDate:[NSDate date]];
}

static NSString *CaminhoLaunchAgentPlist(void) {
    NSString *dir = [NSHomeDirectory() stringByAppendingPathComponent:@"Library/LaunchAgents"];
    return [dir stringByAppendingPathComponent:[NSString stringWithFormat:@"%@.plist", kBundleIdLaunchAgent]];
}

static BOOL InicioAutomaticoAtivoNoMac(void) {
    return [[NSFileManager defaultManager] fileExistsAtPath:CaminhoLaunchAgentPlist()];
}

static BOOL DefinirInicioAutomaticoNoMac(BOOL ligar) {
    NSFileManager *fm = [NSFileManager defaultManager];
    NSString *plistPath = CaminhoLaunchAgentPlist();

    if (!ligar) {
        if ([fm fileExistsAtPath:plistPath]) {
            return [fm removeItemAtPath:plistPath error:nil];
        }
        return YES;
    }

    NSString *dir = [plistPath stringByDeletingLastPathComponent];
    [fm createDirectoryAtPath:dir withIntermediateDirectories:YES attributes:nil error:nil];

    NSString *exePath = [[NSBundle mainBundle] executablePath];
    if (exePath.length == 0) return NO;

    NSDictionary *plistDict = @{
        @"Label": kBundleIdLaunchAgent,
        @"ProgramArguments": @[exePath, @"--silencioso"],
        @"RunAtLoad": @YES,
        @"KeepAlive": @NO,
        @"ProcessType": @"Interactive",
    };

    NSData *xmlDados = [NSPropertyListSerialization dataWithPropertyList:plistDict
                                                                format:NSPropertyListXMLFormat_v1_0
                                                               options:0
                                                                 error:nil];
    if (!xmlDados) return NO;
    return [xmlDados writeToFile:plistPath atomically:YES];
}

#pragma mark - Desenho programático do ícone de tomatinho pixelado (menu bar + janela)

static NSImage *CriarIconeTomatinho(CGFloat tamanhoPontos, BOOL ehBarraDeMenu) {
    // Matriz 16x16 pixel-art do tomatinho fofo (vermelho vibrante + folhas verdes + brilho).
    static const char *const kMapa[16] = {
        "................",
        ".......GG.......",
        "......GGGG......",
        "....GGgGGgGG....",
        "....KKKKKKKK....",
        "..KKRRRRRRRRKK..",
        ".KRWWWRRRRRRRRK.",
        ".KRWWRRRRRRRRRK.",
        ".KRRRRRRRRRRRRK.",
        ".KRRRRRRRRRRRRK.",
        ".KRRRRRRRRRRRRK.",
        "..KRRRRRRRRDDK..",
        "..KRRRRRRDDDDK..",
        "...KKDDDDDDKK...",
        ".....KKKKKK.....",
        "................",
    };

    NSImage *img = [[NSImage alloc] initWithSize:NSMakeSize(tamanhoPontos, tamanhoPontos)];
    [img lockFocus];
    [[NSGraphicsContext currentContext] setImageInterpolation:NSImageInterpolationNone];

    CGFloat cell = tamanhoPontos / 16.0;
    NSColor *corVermelho = [NSColor colorWithSRGBRed:0.90 green:0.22 blue:0.27 alpha:1.0];
    NSColor *corEscuro   = [NSColor colorWithSRGBRed:0.72 green:0.11 blue:0.16 alpha:1.0];
    NSColor *corContorno = [NSColor colorWithSRGBRed:0.35 green:0.06 blue:0.09 alpha:1.0];
    NSColor *corBrilho   = [NSColor colorWithSRGBRed:1.00 green:0.78 blue:0.80 alpha:1.0];
    NSColor *corVerde    = [NSColor colorWithSRGBRed:0.18 green:0.65 blue:0.32 alpha:1.0];
    NSColor *corVerdeCl  = [NSColor colorWithSRGBRed:0.34 green:0.80 blue:0.42 alpha:1.0];

    if (!ehBarraDeMenu) {
        // Fundo cremoso arredondado quando usado como ícone grande da janela/app.
        NSBezierPath *bg = [NSBezierPath bezierPathWithRoundedRect:NSMakeRect(0, 0, tamanhoPontos, tamanhoPontos)
                                                           xRadius:tamanhoPontos * 0.22
                                                           yRadius:tamanhoPontos * 0.22];
        [[NSColor colorWithSRGBRed:0.99 green:0.95 blue:0.89 alpha:1.0] setFill];
        [bg fill];
    }

    for (int y = 0; y < 16; y++) {
        const char *linha = kMapa[y];
        for (int x = 0; x < 16; x++) {
            char ch = linha[x];
            if (ch == '.') continue;
            NSColor *cor = nil;
            switch (ch) {
                case 'R': cor = corVermelho; break;
                case 'D': cor = corEscuro; break;
                case 'K': cor = corContorno; break;
                case 'W': cor = corBrilho; break;
                case 'G': cor = corVerde; break;
                case 'g': cor = corVerdeCl; break;
                default: continue;
            }
            [cor setFill];
            CGFloat px = x * cell;
            CGFloat py = (15 - y) * cell;
            NSRectFill(NSMakeRect(px, py, ceil(cell), ceil(cell)));
        }
    }

    [img unlockFocus];
    [img setTemplate:NO];
    return img;
}

#pragma mark - Declaração adiantada do controlador principal

@class CLAppController;

#pragma mark - Estado do Contador Local (thread-safe, só números e regras de nomes)

@interface CLEstadoContador : NSObject
@property (nonatomic, assign) BOOL pausado;
@property (nonatomic, copy) NSString *arquivoExtraManual;
@property (nonatomic, copy) NSArray<NSDictionary *> *livros;
@property (nonatomic, assign) BOOL janelinhaSemprePorCima;
@property (nonatomic, assign) BOOL temPosicaoJanelinha;
@property (nonatomic, assign) NSRect frameJanelinha;
@property (nonatomic, assign) BOOL autoStartConfigurado;
@property (nonatomic, assign) BOOL temConfigAutoStart;
@property (nonatomic, copy, readonly) NSString *pastaBase;
@property (nonatomic, copy, readonly) NSString *pastaWebBundle;
@property (nonatomic, copy, readonly) NSString *caminhoConfig;

- (instancetype)initWithBundlePaths;
- (NSDictionary *)atualizarSePrecisoForcar:(BOOL)forcar;
- (NSDictionary *)atualizarRegrasLivros:(id)livrosBrutos;
- (NSDictionary *)definirPausado:(nullable NSNumber *)pausadoObj;
- (NSDictionary *)definirArquivoExtraManual:(NSString *)caminho;
- (void)salvarGeometriaJanelinha:(NSRect)frame semprePorCima:(BOOL)sempre;
- (void)salvarAutoStart:(BOOL)ativo;
- (nullable NSData *)lerArquivoWeb:(NSString *)nomeRelativo contentTypeOut:(NSString * _Nullable * _Nullable)ctOut;
@end

@implementation CLEstadoContador {
    NSLock *_lock;
    NSTimeInterval _ultimaLeituraTs;
    NSDictionary *_statusAtual;
}

- (instancetype)initWithBundlePaths {
    self = [super init];
    if (self) {
        _lock = [[NSLock alloc] init];
        _pausado = NO;
        _arquivoExtraManual = @"";
        _livros = @[];
        _janelinhaSemprePorCima = YES;
        _temPosicaoJanelinha = NO;
        _frameJanelinha = NSZeroRect;

        NSFileManager *fm = [NSFileManager defaultManager];
        NSString *bundlePath = [[NSBundle mainBundle] bundlePath];
        NSString *pastaMaeApp = [bundlePath hasSuffix:@".app"]
            ? [bundlePath stringByDeletingLastPathComponent]
            : [NSFileManager defaultManager].currentDirectoryPath;

        // Se a pasta ao lado do .app tiver index.html, usa os arquivos vivos da pasta;
        // caso a pessoa tenha arrastado só o .app para /Applications, usa o bundle interno.
        NSString *idxExterno = [pastaMaeApp stringByAppendingPathComponent:@"index.html"];
        NSString *webBundle = [[[NSBundle mainBundle] resourcePath] stringByAppendingPathComponent:@"web"];
        _pastaWebBundle = webBundle;
        _pastaBase = [fm fileExistsAtPath:idxExterno] ? pastaMaeApp : webBundle;

        if ([fm fileExistsAtPath:idxExterno] && [fm isWritableFileAtPath:pastaMaeApp]) {
            _caminhoConfig = [pastaMaeApp stringByAppendingPathComponent:@".contador_config.json"];
        } else {
            NSString *appSup = [NSSearchPathForDirectoriesInDomains(NSApplicationSupportDirectory, NSUserDomainMask, YES).firstObject
                stringByAppendingPathComponent:@"CentralDeLivrinhos"];
            [fm createDirectoryAtPath:appSup withIntermediateDirectories:YES attributes:nil error:nil];
            _caminhoConfig = [appSup stringByAppendingPathComponent:@".contador_config.json"];
        }

        _statusAtual = @{
            @"ativo": @YES,
            @"pausado": @NO,
            @"estado": @"aguardando",
            @"modo": @"",
            @"arquivoNome": @"",
            @"livroId": [NSNull null],
            @"livroNome": [NSNull null],
            @"palavras": [NSNull null],
            @"tamanhoBytes": [NSNull null],
            @"modificadoEm": [NSNull null],
            @"ultimaLeituraHora": [NSNull null],
            @"intervaloSegundos": @((NSInteger)kIntervaloSegundos),
            @"erro": [NSNull null],
        };

        [self carregarConfig];
    }
    return self;
}

- (void)carregarConfig {
    NSData *dados = [NSData dataWithContentsOfFile:_caminhoConfig];
    if (!dados) return;
    id obj = [NSJSONSerialization JSONObjectWithData:dados options:0 error:nil];
    if (![obj isKindOfClass:[NSDictionary class]]) return;
    NSDictionary *cfg = (NSDictionary *)obj;

    _pausado = [cfg[@"pausado"] boolValue];
    id extra = cfg[@"arquivoExtraManual"];
    if ([extra isKindOfClass:[NSString class]]) {
        _arquivoExtraManual = (NSString *)extra;
    } else if ([cfg[@"fonte"] isKindOfClass:[NSString class]]) {
        NSString *antiga = [(NSString *)cfg[@"fonte"] stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
        if (antiga.length > 0 && ![antiga hasPrefix:@"@app:"]) {
            _arquivoExtraManual = antiga;
        }
    }
    _livros = NormalizarRegrasLivros(cfg[@"livros"]);

    if (cfg[@"janelinhaSemprePorCima"] != nil) {
        _janelinhaSemprePorCima = [cfg[@"janelinhaSemprePorCima"] boolValue];
    }
    if ([cfg[@"janelinhaCompactaX"] isKindOfClass:[NSNumber class]] &&
        [cfg[@"janelinhaCompactaY"] isKindOfClass:[NSNumber class]] &&
        [cfg[@"janelinhaCompactaLargura"] isKindOfClass:[NSNumber class]] &&
        [cfg[@"janelinhaCompactaAltura"] isKindOfClass:[NSNumber class]]) {
        CGFloat x = [cfg[@"janelinhaCompactaX"] doubleValue];
        CGFloat y = [cfg[@"janelinhaCompactaY"] doubleValue];
        CGFloat w = MAX(280.0, [cfg[@"janelinhaCompactaLargura"] doubleValue]);
        CGFloat h = MAX(310.0, [cfg[@"janelinhaCompactaAltura"] doubleValue]);
        _frameJanelinha = NSMakeRect(x, y, w, h);
        _temPosicaoJanelinha = YES;
    }
    if (cfg[@"inicioAutomatico"] != nil) {
        _temConfigAutoStart = YES;
        _autoStartConfigurado = [cfg[@"inicioAutomatico"] boolValue];
    }
}

- (void)salvarConfigLocked {
    // Grava SOMENTE nomes de arquivos, regras de livros, pausa e posição da janela.
    // NUNCA grava qualquer trecho de livro.
    NSMutableDictionary *payload = [NSMutableDictionary dictionaryWithDictionary:@{
        @"pausado": @(_pausado),
        @"arquivoExtraManual": _arquivoExtraManual ?: @"",
        @"livros": _livros ?: @[],
        @"janelinhaSemprePorCima": @(_janelinhaSemprePorCima),
    }];
    if (_temPosicaoJanelinha) {
        payload[@"janelinhaCompactaX"] = @((NSInteger)llround(_frameJanelinha.origin.x));
        payload[@"janelinhaCompactaY"] = @((NSInteger)llround(_frameJanelinha.origin.y));
        payload[@"janelinhaCompactaLargura"] = @((NSInteger)llround(_frameJanelinha.size.width));
        payload[@"janelinhaCompactaAltura"] = @((NSInteger)llround(_frameJanelinha.size.height));
    }
    if (_temConfigAutoStart) {
        payload[@"inicioAutomatico"] = @(_autoStartConfigurado);
    }

    NSData *json = [NSJSONSerialization dataWithJSONObject:payload options:NSJSONWritingPrettyPrinted error:nil];
    if (json) {
        [json writeToFile:_caminhoConfig atomically:YES];
    }
}

- (void)salvarGeometriaJanelinha:(NSRect)frame semprePorCima:(BOOL)sempre {
    [_lock lock];
    _frameJanelinha = frame;
    _temPosicaoJanelinha = YES;
    _janelinhaSemprePorCima = sempre;
    [self salvarConfigLocked];
    [_lock unlock];
}

- (void)salvarAutoStart:(BOOL)ativo {
    [_lock lock];
    _temConfigAutoStart = YES;
    _autoStartConfigurado = ativo;
    [self salvarConfigLocked];
    [_lock unlock];
}

- (NSDictionary *)atualizarRegrasLivros:(id)livrosBrutos {
    [_lock lock];
    _livros = NormalizarRegrasLivros(livrosBrutos);
    [self salvarConfigLocked];
    _ultimaLeituraTs = 0.0;
    [_lock unlock];
    return [self atualizarSePrecisoForcar:YES];
}

- (NSDictionary *)definirPausado:(nullable NSNumber *)pausadoObj {
    [_lock lock];
    _pausado = (pausadoObj != nil) ? [pausadoObj boolValue] : !_pausado;
    [self salvarConfigLocked];
    _ultimaLeituraTs = 0.0;
    [_lock unlock];
    return [self atualizarSePrecisoForcar:YES];
}

- (NSDictionary *)definirArquivoExtraManual:(NSString *)caminho {
    [_lock lock];
    _arquivoExtraManual = [caminho stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]] ?: @"";
    [self salvarConfigLocked];
    _ultimaLeituraTs = 0.0;
    [_lock unlock];
    return [self atualizarSePrecisoForcar:YES];
}

- (NSDictionary *)atualizarSePrecisoForcar:(BOOL)forcar {
    [_lock lock];
    NSTimeInterval agora = [NSDate timeIntervalSinceReferenceDate];
    if (!forcar && (agora - _ultimaLeituraTs) < kIntervaloSegundos && _statusAtual[@"ultimaLeituraHora"] != [NSNull null]) {
        NSDictionary *copia = [_statusAtual copy];
        [_lock unlock];
        return copia;
    }
    BOOL pausadoAtual = _pausado;
    NSArray<NSDictionary *> *livrosCopia = [_livros copy];
    NSString *extraAtual = [_arquivoExtraManual copy];
    [_lock unlock];

    NSString *hora = HoraAtualFormatada();
    NSDictionary *novoStatus = nil;

    if (pausadoAtual) {
        novoStatus = @{
            @"ativo": @YES,
            @"pausado": @YES,
            @"estado": @"pausado",
            @"modo": @"",
            @"arquivoNome": @"",
            @"livroId": [NSNull null],
            @"livroNome": [NSNull null],
            @"palavras": [NSNull null],
            @"tamanhoBytes": [NSNull null],
            @"modificadoEm": [NSNull null],
            @"ultimaLeituraHora": hora,
            @"intervaloSegundos": @((NSInteger)kIntervaloSegundos),
            @"erro": [NSNull null],
        };
    } else {
        // 1º: descobre SÓ OS NOMES dos documentos abertos (Pages primeiro, depois Word).
        NSArray<CLDocumentoAberto *> *docsMac = [CLContarPalavras listarDocumentosAbertosMac];
        NSString *nomeDoc = nil;
        NSString *modo = nil;
        NSString *caminhoDisco = nil;

        if (docsMac.count > 0) {
            CLDocumentoAberto *escolhido = nil;
            for (CLDocumentoAberto *cand in docsMac) {
                if (EncontrarLivroParaDocumento(cand.nome, livrosCopia) != nil) {
                    escolhido = cand;
                    break;
                }
            }
            if (!escolhido) escolhido = docsMac.firstObject;
            nomeDoc = escolhido.nome;
            modo = escolhido.modo;
        } else if (extraAtual.length > 0) {
            nomeDoc = extraAtual.lastPathComponent;
            modo = @"arquivo";
            caminhoDisco = extraAtual;
        }

        if (nomeDoc.length == 0) {
            novoStatus = @{
                @"ativo": @YES,
                @"pausado": @NO,
                @"estado": @"aguardando",
                @"modo": @"",
                @"arquivoNome": @"",
                @"livroId": [NSNull null],
                @"livroNome": [NSNull null],
                @"palavras": [NSNull null],
                @"tamanhoBytes": [NSNull null],
                @"modificadoEm": [NSNull null],
                @"ultimaLeituraHora": hora,
                @"intervaloSegundos": @((NSInteger)kIntervaloSegundos),
                @"erro": [NSNull null],
            };
        } else {
            NSDictionary *livroCorresp = EncontrarLivroParaDocumento(nomeDoc, livrosCopia);
            // REGRA MÁXIMA DE PRIVACIDADE: se o nome não está em nenhum livro marcado,
            // IGNORA imediatamente sem ler uma única palavra.
            if (!livroCorresp) {
                novoStatus = @{
                    @"ativo": @YES,
                    @"pausado": @NO,
                    @"estado": @"ignorado",
                    @"modo": modo ?: @"",
                    @"arquivoNome": nomeDoc,
                    @"livroId": [NSNull null],
                    @"livroNome": [NSNull null],
                    @"palavras": [NSNull null],
                    @"tamanhoBytes": [NSNull null],
                    @"modificadoEm": [NSNull null],
                    @"ultimaLeituraHora": hora,
                    @"intervaloSegundos": @((NSInteger)kIntervaloSegundos),
                    @"erro": [NSNull null],
                };
            } else {
                CLResultadoContagem *res = nil;
                if ([modo isEqualToString:@"pages"]) {
                    res = [CLContarPalavras contarPalavrasPagesAberto:nomeDoc];
                } else if ([modo isEqualToString:@"word"]) {
                    res = [CLContarPalavras contarPalavrasWordAberto:nomeDoc];
                } else {
                    res = [CLContarPalavras contarPalavrasArquivoDisco:caminhoDisco ?: @""];
                }

                if (res.ok) {
                    novoStatus = @{
                        @"ativo": @YES,
                        @"pausado": @NO,
                        @"estado": @"contando",
                        @"modo": modo ?: @"",
                        @"arquivoNome": nomeDoc,
                        @"livroId": livroCorresp[@"id"],
                        @"livroNome": livroCorresp[@"nome"],
                        @"palavras": @(res.palavras),
                        @"tamanhoBytes": @(res.tamanhoBytes),
                        @"modificadoEm": res.modificadoEm ?: [NSNull null],
                        @"ultimaLeituraHora": hora,
                        @"intervaloSegundos": @((NSInteger)kIntervaloSegundos),
                        @"erro": [NSNull null],
                    };
                } else {
                    novoStatus = @{
                        @"ativo": @YES,
                        @"pausado": @NO,
                        @"estado": @"erro",
                        @"modo": modo ?: @"",
                        @"arquivoNome": nomeDoc,
                        @"livroId": livroCorresp[@"id"],
                        @"livroNome": livroCorresp[@"nome"],
                        @"palavras": [NSNull null],
                        @"tamanhoBytes": [NSNull null],
                        @"modificadoEm": [NSNull null],
                        @"ultimaLeituraHora": hora,
                        @"intervaloSegundos": @((NSInteger)kIntervaloSegundos),
                        @"erro": res.erro ?: @"Erro ao contar palavras.",
                    };
                }
            }
        }
    }

    [_lock lock];
    if (_pausado == pausadoAtual &&
        [_arquivoExtraManual isEqualToString:extraAtual] &&
        [_livros isEqualToArray:livrosCopia]) {
        _statusAtual = novoStatus;
        _ultimaLeituraTs = [NSDate timeIntervalSinceReferenceDate];
    }
    NSDictionary *retorno = [_statusAtual copy];
    [_lock unlock];
    return retorno;
}

- (nullable NSData *)lerArquivoWeb:(NSString *)nomeRelativo contentTypeOut:(NSString * _Nullable * _Nullable)ctOut {
    // Lista branca estrita de arquivos da interface (bloqueia travessia ../)
    NSDictionary<NSString *, NSString *> *mimes = @{
        @"index.html": @"text/html; charset=utf-8",
        @"style.css": @"text/css; charset=utf-8",
        @"app.js": @"application/javascript; charset=utf-8",
    };
    NSString *ct = mimes[nomeRelativo];
    if (!ct) return nil;
    if (ctOut) *ctOut = ct;

    NSString *caminho = [_pastaBase stringByAppendingPathComponent:nomeRelativo];
    NSData *dados = [NSData dataWithContentsOfFile:caminho];
    if (!dados && ![_pastaBase isEqualToString:_pastaWebBundle]) {
        NSString *fallback = [_pastaWebBundle stringByAppendingPathComponent:nomeRelativo];
        dados = [NSData dataWithContentsOfFile:fallback];
    }
    return dados;
}

@end

#pragma mark - Controlador da Bandeja, Servidor HTTP Local e Janelas WKWebView

@interface CLAppController : NSObject <
    NSApplicationDelegate,
    NSWindowDelegate,
    WKUIDelegate,
    WKNavigationDelegate,
    WKScriptMessageHandler
#if __MAC_OS_X_VERSION_MAX_ALLOWED >= 110300
    , WKDownloadDelegate
#endif
>
@property (nonatomic, strong) CLEstadoContador *estado;
@property (nonatomic, strong) NSStatusItem *statusItem;
@property (nonatomic, strong) NSMenuItem *itemStatusMenu;
@property (nonatomic, strong) NSMenuItem *itemPausarMenu;
@property (nonatomic, strong) NSMenuItem *itemSemprePorCimaMenu;
@property (nonatomic, strong) NSMenuItem *itemAutoStartMenu;
@property (nonatomic, strong, nullable) NSWindow *janelaCentral;
@property (nonatomic, strong, nullable) WKWebView *webCentral;
@property (nonatomic, strong, nullable) NSWindow *janelaMini;
@property (nonatomic, strong, nullable) WKWebView *webMini;
@property (nonatomic, assign) int socketServidor;
@property (nonatomic, assign) BOOL encerrando;
@property (nonatomic, assign) BOOL iniciarSilencioso;
@end

@implementation CLAppController {
    dispatch_source_t _timerVigilancia;
    NSImage *_iconeApp;
}

- (void)dealloc {
    if (_socketServidor >= 0) {
        close(_socketServidor);
        _socketServidor = -1;
    }
}

#pragma mark - Segurança HTTP estrita (auditoria local-only)

- (BOOL)verificarOrigemAutorizadaCabecalhos:(NSDictionary<NSString *, NSString *> *)headers
                            exigirParaEscrita:(BOOL)exigirParaEscrita
                                 origemOut:(NSString * _Nullable * _Nullable)origemOut {
    if (origemOut) *origemOut = @"";

    NSString *hostCab = [headers[@"host"] ?: @"" stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]].lowercaseString;
    NSString *host1 = [NSString stringWithFormat:@"127.0.0.1:%u", kPortaServidor];
    NSString *host2 = [NSString stringWithFormat:@"localhost:%u", kPortaServidor];
    if (![hostCab isEqualToString:host1] && ![hostCab isEqualToString:host2]) {
        return NO;
    }

    NSMutableDictionary<NSString *, NSString *> *permitidas = [NSMutableDictionary dictionary];
    NSString *orig1 = [NSString stringWithFormat:@"http://127.0.0.1:%u", kPortaServidor];
    NSString *orig2 = [NSString stringWithFormat:@"http://localhost:%u", kPortaServidor];
    permitidas[orig1.lowercaseString] = orig1;
    permitidas[orig2.lowercaseString] = orig2;
    NSString *oficial = [kOrigemGithubPages stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
    while ([oficial hasSuffix:@"/"]) {
        oficial = [oficial substringToIndex:oficial.length - 1];
    }
    if (oficial.length > 0) {
        permitidas[oficial.lowercaseString] = oficial;
    }

    NSString *originBruto = [headers[@"origin"] ?: @"" stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
    while ([originBruto hasSuffix:@"/"]) {
        originBruto = [originBruto substringToIndex:originBruto.length - 1];
    }
    NSString *secFetchSite = [headers[@"sec-fetch-site"] ?: @"" stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]].lowercaseString;
    NSString *refererBruto = [headers[@"referer"] ?: @"" stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];

    if (originBruto.length > 0) {
        NSString *origemOficial = permitidas[originBruto.lowercaseString];
        if (!origemOficial) return NO;
        if (origemOut) *origemOut = origemOficial;
        return YES;
    }

    if ([secFetchSite isEqualToString:@"cross-site"] || [secFetchSite isEqualToString:@"same-site"]) {
        return NO;
    }

    BOOL refererOk = NO;
    if (refererBruto.length > 0) {
        NSURL *uRef = [NSURL URLWithString:refererBruto];
        NSString *origemRef = @"";
        if (uRef.scheme.length > 0 && uRef.host.length > 0) {
            if (uRef.port) {
                origemRef = [NSString stringWithFormat:@"%@://%@:%@", uRef.scheme.lowercaseString, uRef.host.lowercaseString, uRef.port];
            } else {
                origemRef = [NSString stringWithFormat:@"%@://%@", uRef.scheme.lowercaseString, uRef.host.lowercaseString];
            }
        }
        if (!permitidas[origemRef]) return NO;
        refererOk = YES;
    }

    if (exigirParaEscrita && ![secFetchSite isEqualToString:@"same-origin"] && !refererOk) {
        return NO;
    }

    return YES;
}

- (void)enviarRespostaSocket:(int)fd
                      status:(int)status
                  motivoHTTP:(NSString *)motivo
                 contentType:(NSString *)contentType
                       corpo:(NSData *)corpo
           origemAutorizada:(NSString *)origemAutorizada {
    NSMutableString *cab = [NSMutableString stringWithFormat:
        @"HTTP/1.1 %d %@\r\n"
        @"Content-Type: %@\r\n"
        @"Content-Length: %lu\r\n"
        @"Vary: Origin\r\n"
        @"Cache-Control: no-store\r\n"
        @"Connection: close\r\n",
        status, motivo, contentType, (unsigned long)corpo.length];

    // Nunca envia Access-Control-Allow-Origin com curinga; só reflete a própria origem autorizada.
    if (origemAutorizada.length > 0) {
        [cab appendFormat:
            @"Access-Control-Allow-Origin: %@\r\n"
            @"Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
            @"Access-Control-Allow-Headers: Content-Type\r\n"
            @"Access-Control-Allow-Private-Network: true\r\n",
            origemAutorizada];
    }
    [cab appendString:@"\r\n"];

    NSMutableData *pacote = [[cab dataUsingEncoding:NSUTF8StringEncoding] mutableCopy];
    if (corpo.length > 0) [pacote appendData:corpo];

    const uint8_t *bytes = pacote.bytes;
    NSUInteger restante = pacote.length;
    while (restante > 0) {
        ssize_t n = send(fd, bytes, restante, 0);
        if (n <= 0) break;
        bytes += n;
        restante -= (NSUInteger)n;
    }
}

- (void)enviarJsonSocket:(int)fd
                  objeto:(id)obj
                  status:(int)status
              motivoHTTP:(NSString *)motivo
       origemAutorizada:(NSString *)origem {
    NSData *json = [NSJSONSerialization dataWithJSONObject:obj options:0 error:nil] ?: [NSData data];
    [self enviarRespostaSocket:fd
                        status:status
                    motivoHTTP:motivo
                   contentType:@"application/json; charset=utf-8"
                         corpo:json
             origemAutorizada:origem];
}

- (void)recusarOrigemSocket:(int)fd {
    [self enviarJsonSocket:fd
                    objeto:@{@"erro": @"Origem não autorizada."}
                    status:403
                motivoHTTP:@"Forbidden"
         origemAutorizada:@""];
}

- (void)atenderConexaoCliente:(int)clientFd {
    @autoreleasepool {
        int yes = 1;
        setsockopt(clientFd, SOL_SOCKET, SO_NOSIGPIPE, &yes, sizeof(yes));

        struct timeval tv;
        tv.tv_sec = 5;
        tv.tv_usec = 0;
        setsockopt(clientFd, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));

        NSMutableData *buffer = [NSMutableData data];
        char chunk[4096];
        NSRange rangeFimCab = NSMakeRange(NSNotFound, 0);
        NSData *sep = [@"\r\n\r\n" dataUsingEncoding:NSASCIIStringEncoding];

        while (buffer.length < 262144) {
            ssize_t n = recv(clientFd, chunk, sizeof(chunk), 0);
            if (n <= 0) break;
            [buffer appendBytes:chunk length:(NSUInteger)n];
            rangeFimCab = [buffer rangeOfData:sep options:0 range:NSMakeRange(0, buffer.length)];
            if (rangeFimCab.location != NSNotFound) break;
        }

        if (rangeFimCab.location == NSNotFound) {
            close(clientFd);
            return;
        }

        NSData *cabDados = [buffer subdataWithRange:NSMakeRange(0, rangeFimCab.location)];
        NSString *cabTexto = [[NSString alloc] initWithData:cabDados encoding:NSUTF8StringEncoding]
            ?: [[NSString alloc] initWithData:cabDados encoding:NSISOLatin1StringEncoding];
        NSArray<NSString *> *linhas = [cabTexto componentsSeparatedByString:@"\r\n"];
        if (linhas.count == 0) {
            close(clientFd);
            return;
        }

        NSArray<NSString *> *reqParts = [linhas.firstObject componentsSeparatedByString:@" "];
        if (reqParts.count < 2) {
            close(clientFd);
            return;
        }
        NSString *metodo = reqParts[0].uppercaseString;
        NSString *alvo = reqParts[1];

        NSMutableDictionary<NSString *, NSString *> *headers = [NSMutableDictionary dictionary];
        for (NSUInteger i = 1; i < linhas.count; i++) {
            NSRange doisPontos = [linhas[i] rangeOfString:@":"];
            if (doisPontos.location == NSNotFound) continue;
            NSString *k = [[linhas[i] substringToIndex:doisPontos.location]
                stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]].lowercaseString;
            NSString *v = [[linhas[i] substringFromIndex:doisPontos.location + 1]
                stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];
            headers[k] = v;
        }

        NSUInteger inicioCorpo = rangeFimCab.location + rangeFimCab.length;
        NSInteger contentLength = MAX(0, [headers[@"content-length"] integerValue]);
        if (contentLength > 262144) contentLength = 262144;

        NSMutableData *corpoReq = [NSMutableData data];
        if (buffer.length > inicioCorpo) {
            NSData *resto = [buffer subdataWithRange:NSMakeRange(inicioCorpo, buffer.length - inicioCorpo)];
            [corpoReq appendData:resto];
        }
        while ((NSInteger)corpoReq.length < contentLength) {
            ssize_t n = recv(clientFd, chunk, sizeof(chunk), 0);
            if (n <= 0) break;
            [corpoReq appendBytes:chunk length:(NSUInteger)n];
        }

        BOOL ehEscrita = ([metodo isEqualToString:@"POST"] || [metodo isEqualToString:@"OPTIONS"]);
        NSString *origemAutorizada = @"";
        if (![self verificarOrigemAutorizadaCabecalhos:headers exigirParaEscrita:ehEscrita origemOut:&origemAutorizada]) {
            [self recusarOrigemSocket:clientFd];
            close(clientFd);
            return;
        }

        if ([metodo isEqualToString:@"OPTIONS"]) {
            if (origemAutorizada.length == 0) {
                [self recusarOrigemSocket:clientFd];
            } else {
                [self enviarRespostaSocket:clientFd
                                    status:204
                                motivoHTTP:@"No Content"
                               contentType:@"text/plain"
                                     corpo:[NSData data]
                         origemAutorizada:origemAutorizada];
            }
            close(clientFd);
            return;
        }

        NSRange interr = [alvo rangeOfString:@"?"];
        NSString *caminhoUrl = (interr.location != NSNotFound) ? [alvo substringToIndex:interr.location] : alvo;
        NSString *queryUrl = (interr.location != NSNotFound) ? [alvo substringFromIndex:interr.location + 1] : @"";

        if ([metodo isEqualToString:@"GET"]) {
            if ([caminhoUrl isEqualToString:@"/api/status"]) {
                BOOL forcar = [queryUrl containsString:@"agora=1"];
                NSDictionary *st = [_estado atualizarSePrecisoForcar:forcar];
                [self enviarJsonSocket:clientFd objeto:st status:200 motivoHTTP:@"OK" origemAutorizada:origemAutorizada];
                [self atualizarMenuBarEmBackgroundComStatus:st];
                close(clientFd);
                return;
            }

            NSString *rel = [caminhoUrl hasPrefix:@"/"] ? [caminhoUrl substringFromIndex:1] : caminhoUrl;
            if (rel.length == 0) rel = @"index.html";

            NSString *ct = nil;
            NSData *arqDados = [_estado lerArquivoWeb:rel contentTypeOut:&ct];
            if (!arqDados) {
                [self enviarJsonSocket:clientFd
                                objeto:@{@"erro": @"Arquivo não encontrado."}
                                status:404
                            motivoHTTP:@"Not Found"
                     origemAutorizada:origemAutorizada];
            } else {
                [self enviarRespostaSocket:clientFd
                                    status:200
                                motivoHTTP:@"OK"
                               contentType:ct
                                     corpo:arqDados
                         origemAutorizada:origemAutorizada];
            }
            close(clientFd);
            return;
        }

        if ([metodo isEqualToString:@"POST"]) {
            NSDictionary *bodyJson = @{};
            if (corpoReq.length > 0 && contentLength > 0) {
                NSData *recorte = (corpoReq.length > (NSUInteger)contentLength)
                    ? [corpoReq subdataWithRange:NSMakeRange(0, (NSUInteger)contentLength)]
                    : corpoReq;
                id parsed = [NSJSONSerialization JSONObjectWithData:recorte options:0 error:nil];
                if ([parsed isKindOfClass:[NSDictionary class]]) bodyJson = (NSDictionary *)parsed;
            }

            if ([caminhoUrl isEqualToString:@"/api/regras-livros"]) {
                NSDictionary *st = [_estado atualizarRegrasLivros:bodyJson[@"livros"]];
                [self enviarJsonSocket:clientFd objeto:st status:200 motivoHTTP:@"OK" origemAutorizada:origemAutorizada];
                [self atualizarMenuBarEmBackgroundComStatus:st];
                close(clientFd);
                return;
            }

            if ([caminhoUrl isEqualToString:@"/api/pausar"]) {
                id val = bodyJson[@"pausado"];
                NSNumber *num = (val && val != [NSNull null]) ? @([val boolValue]) : nil;
                NSDictionary *st = [_estado definirPausado:num];
                [self enviarJsonSocket:clientFd objeto:st status:200 motivoHTTP:@"OK" origemAutorizada:origemAutorizada];
                [self atualizarMenuBarEmBackgroundComStatus:st];
                close(clientFd);
                return;
            }

            if ([caminhoUrl isEqualToString:@"/api/ler-agora"]) {
                NSDictionary *st = [_estado atualizarSePrecisoForcar:YES];
                [self enviarJsonSocket:clientFd objeto:st status:200 motivoHTTP:@"OK" origemAutorizada:origemAutorizada];
                [self atualizarMenuBarEmBackgroundComStatus:st];
                close(clientFd);
                return;
            }

            if ([caminhoUrl isEqualToString:@"/api/escolher-arquivo"]) {
                __block NSString *escolhido = nil;
                dispatch_sync(dispatch_get_main_queue(), ^{
                    escolhido = [self mostrarSeletorArquivoExtraNaMain];
                });
                NSMutableDictionary *resp = nil;
                if (escolhido.length > 0) {
                    NSDictionary *st = [_estado definirArquivoExtraManual:escolhido];
                    resp = [st mutableCopy];
                    resp[@"cancelado"] = @NO;
                    [self atualizarMenuBarEmBackgroundComStatus:st];
                } else {
                    NSDictionary *st = [_estado atualizarSePrecisoForcar:NO];
                    resp = [st mutableCopy];
                    resp[@"cancelado"] = @YES;
                }
                [self enviarJsonSocket:clientFd objeto:resp status:200 motivoHTTP:@"OK" origemAutorizada:origemAutorizada];
                close(clientFd);
                return;
            }

            if ([caminhoUrl isEqualToString:@"/api/abrir-janelinha"]) {
                dispatch_async(dispatch_get_main_queue(), ^{
                    [self abrirJanelaMini];
                });
                [self enviarJsonSocket:clientFd objeto:@{@"ok": @YES} status:200 motivoHTTP:@"OK" origemAutorizada:origemAutorizada];
                close(clientFd);
                return;
            }

            if ([caminhoUrl isEqualToString:@"/api/abrir-central"]) {
                dispatch_async(dispatch_get_main_queue(), ^{
                    [self abrirJanelaCentral];
                });
                [self enviarJsonSocket:clientFd objeto:@{@"ok": @YES} status:200 motivoHTTP:@"OK" origemAutorizada:origemAutorizada];
                close(clientFd);
                return;
            }
        }

        [self enviarJsonSocket:clientFd
                        objeto:@{@"erro": @"Ação não encontrada."}
                        status:404
                    motivoHTTP:@"Not Found"
             origemAutorizada:origemAutorizada];
        close(clientFd);
    }
}

- (BOOL)iniciarServidorHTTP {
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0) return NO;

    int yes = 1;
    setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &yes, sizeof(yes));

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_port = htons(kPortaServidor);
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK); // Estritamente 127.0.0.1

    if (bind(fd, (struct sockaddr *)&addr, sizeof(addr)) != 0 || listen(fd, 32) != 0) {
        close(fd);
        return NO;
    }

    _socketServidor = fd;
    dispatch_queue_t filaAccept = dispatch_queue_create("com.raquel.central.accept", DISPATCH_QUEUE_SERIAL);
    dispatch_queue_t filaClientes = dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0);

    dispatch_async(filaAccept, ^{
        while (!self.encerrando && self.socketServidor >= 0) {
            struct sockaddr_in cliAddr;
            socklen_t cliLen = sizeof(cliAddr);
            int clientFd = accept(self.socketServidor, (struct sockaddr *)&cliAddr, &cliLen);
            if (clientFd < 0) {
                if (self.encerrando) break;
                usleep(20000);
                continue;
            }
            dispatch_async(filaClientes, ^{
                [self atenderConexaoCliente:clientFd];
            });
        }
    });

    return YES;
}

#pragma mark - Ciclo de vida do aplicativo e Barra de Menu

- (void)configurarMainMenuComAtalhos {
    NSMenu *mainMenu = [[NSMenu alloc] init];

    NSMenuItem *appItem = [[NSMenuItem alloc] init];
    NSMenu *appSub = [[NSMenu alloc] init];
    [appSub addItemWithTitle:@"Ocultar janela" action:@selector(hide:) keyEquivalent:@"h"];
    [appSub addItemWithTitle:@"Sair da Central de Livrinhos" action:@selector(acaoSair:) keyEquivalent:@"q"];
    appItem.submenu = appSub;
    [mainMenu addItem:appItem];

    NSMenuItem *editItem = [[NSMenuItem alloc] init];
    NSMenu *editSub = [[NSMenu alloc] initWithTitle:@"Editar"];
    [editSub addItemWithTitle:@"Desfazer" action:@selector(undo:) keyEquivalent:@"z"];
    [editSub addItemWithTitle:@"Refazer" action:@selector(redo:) keyEquivalent:@"Z"];
    [editSub addItem:[NSMenuItem separatorItem]];
    [editSub addItemWithTitle:@"Recortar" action:@selector(cut:) keyEquivalent:@"x"];
    [editSub addItemWithTitle:@"Copiar" action:@selector(copy:) keyEquivalent:@"c"];
    [editSub addItemWithTitle:@"Colar" action:@selector(paste:) keyEquivalent:@"v"];
    [editSub addItemWithTitle:@"Selecionar Tudo" action:@selector(selectAll:) keyEquivalent:@"a"];
    editItem.submenu = editSub;
    [mainMenu addItem:editItem];

    NSMenuItem *winItem = [[NSMenuItem alloc] init];
    NSMenu *winSub = [[NSMenu alloc] initWithTitle:@"Janela"];
    [winSub addItemWithTitle:@"Fechar Janela" action:@selector(performClose:) keyEquivalent:@"w"];
    winItem.submenu = winSub;
    [mainMenu addItem:winItem];

    [NSApp setMainMenu:mainMenu];
}

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
    (void)notification;
    signal(SIGPIPE, SIG_IGN);

    _iconeApp = CriarIconeTomatinho(128.0, NO);
    [NSApp setApplicationIconImage:_iconeApp];
    [self configurarMainMenuComAtalhos];

    if (![self iniciarServidorHTTP]) {
        NSAlert *alerta = [[NSAlert alloc] init];
        alerta.messageText = @"A Central de Livrinhos já está aberta ou a porta local está ocupada";
        alerta.informativeText = @"Procure o tomatinho na barra lá em cima (perto do relógio) ou feche o outro contador antes de abrir de novo.";
        [alerta runModal];
        [NSApp terminate:nil];
        return;
    }

    // Configura início automático na 1ª execução dentro do .app (a menos que CL_NO_AUTOSTART=1 em testes).
    BOOL pularAutoStart = ([[[NSProcessInfo processInfo] environment][@"CL_NO_AUTOSTART"] isEqualToString:@"1"]);
    NSString *bundlePath = [[NSBundle mainBundle] bundlePath];
    if (!pularAutoStart && [bundlePath hasSuffix:@".app"]) {
        if (!_estado.temConfigAutoStart) {
            BOOL okAuto = DefinirInicioAutomaticoNoMac(YES);
            [_estado salvarAutoStart:okAuto];
        } else if (_estado.autoStartConfigurado) {
            // Mantém o caminho atualizado caso a pessoa tenha movido o .app para /Applications.
            DefinirInicioAutomaticoNoMac(YES);
        }
    }

    // Cria ícone fixo na barra de menu (perto do relógio).
    _statusItem = [[NSStatusBar systemStatusBar] statusItemWithLength:NSSquareStatusItemLength];
    NSImage *iconeBarra = CriarIconeTomatinho(18.0, YES);
    _statusItem.button.image = iconeBarra;
    _statusItem.button.toolTip = @"Central de Livrinhos: Contador automático local";

    NSMenu *menu = [[NSMenu alloc] init];
    _itemStatusMenu = [[NSMenuItem alloc] initWithTitle:@"⏳ Aguardando Pages ou Word..." action:nil keyEquivalent:@""];
    _itemStatusMenu.enabled = NO;
    [menu addItem:_itemStatusMenu];

    [menu addItem:[NSMenuItem separatorItem]];

    NSMenuItem *itemAbrirCentral = [[NSMenuItem alloc] initWithTitle:@"📖 Abrir Central de Livrinhos"
                                                              action:@selector(acaoAbrirCentral:)
                                                       keyEquivalent:@""];
    itemAbrirCentral.target = self;
    [menu addItem:itemAbrirCentral];

    NSMenuItem *itemAbrirMini = [[NSMenuItem alloc] initWithTitle:@"🪟 Abrir janelinha da mesa"
                                                            action:@selector(acaoAbrirMini:)
                                                     keyEquivalent:@""];
    itemAbrirMini.target = self;
    [menu addItem:itemAbrirMini];

    _itemSemprePorCimaMenu = [[NSMenuItem alloc] initWithTitle:@"📌 Janelinha sempre por cima"
                                                        action:@selector(acaoAlternarSemprePorCima:)
                                                 keyEquivalent:@""];
    _itemSemprePorCimaMenu.target = self;
    _itemSemprePorCimaMenu.state = _estado.janelinhaSemprePorCima ? NSControlStateValueOn : NSControlStateValueOff;
    [menu addItem:_itemSemprePorCimaMenu];

    [menu addItem:[NSMenuItem separatorItem]];

    _itemPausarMenu = [[NSMenuItem alloc] initWithTitle:_estado.pausado ? @"▶️ Retomar contador" : @"⏸️ Pausar contador"
                                                 action:@selector(acaoAlternarPausa:)
                                          keyEquivalent:@""];
    _itemPausarMenu.target = self;
    [menu addItem:_itemPausarMenu];

    NSMenuItem *itemArquivoExtra = [[NSMenuItem alloc] initWithTitle:@"📂 Escolher arquivo extra..."
                                                              action:@selector(acaoEscolherArquivo:)
                                                       keyEquivalent:@""];
    itemArquivoExtra.target = self;
    [menu addItem:itemArquivoExtra];

    _itemAutoStartMenu = [[NSMenuItem alloc] initWithTitle:@"🚀 Ligar sozinho com o Mac"
                                                    action:@selector(acaoAlternarAutoStart:)
                                             keyEquivalent:@""];
    _itemAutoStartMenu.target = self;
    _itemAutoStartMenu.state = InicioAutomaticoAtivoNoMac() ? NSControlStateValueOn : NSControlStateValueOff;
    [menu addItem:_itemAutoStartMenu];

    [menu addItem:[NSMenuItem separatorItem]];

    NSMenuItem *itemSair = [[NSMenuItem alloc] initWithTitle:@"❌ Sair do contador"
                                                      action:@selector(acaoSair:)
                                               keyEquivalent:@""];
    itemSair.target = self;
    [menu addItem:itemSair];

    _statusItem.menu = menu;

    // Dispara ciclo inicial e timer periódico de 30s.
    dispatch_queue_t filaVig = dispatch_queue_create("com.raquel.central.vigilancia", DISPATCH_QUEUE_SERIAL);
    _timerVigilancia = dispatch_source_create(DISPATCH_SOURCE_TYPE_TIMER, 0, 0, filaVig);
    dispatch_source_set_timer(_timerVigilancia,
                              dispatch_time(DISPATCH_TIME_NOW, 0),
                              (uint64_t)(kIntervaloSegundos * NSEC_PER_SEC),
                              1 * NSEC_PER_SEC);
    dispatch_source_set_event_handler(_timerVigilancia, ^{
        NSDictionary *st = [self.estado atualizarSePrecisoForcar:YES];
        [self atualizarMenuBarEmBackgroundComStatus:st];
    });
    dispatch_resume(_timerVigilancia);

    // Quando a pessoa clica duas vezes no app (sem --silencioso), já abre a Central.
    if (!_iniciarSilencioso) {
        [self abrirJanelaCentral];
    }
}

- (void)applicationWillTerminate:(NSNotification *)notification {
    (void)notification;
    _encerrando = YES;
    if (_timerVigilancia) {
        dispatch_source_cancel(_timerVigilancia);
    }
    if (_socketServidor >= 0) {
        close(_socketServidor);
        _socketServidor = -1;
    }
}

- (void)atualizarMenuBarEmBackgroundComStatus:(NSDictionary *)st {
    dispatch_async(dispatch_get_main_queue(), ^{
        NSString *estadoTxt = st[@"estado"] ?: @"aguardando";
        BOOL pausado = [st[@"pausado"] boolValue];
        NSString *tituloStatus = @"⏳ Aguardando você abrir um livro marcado no Pages/Word";

        if (pausado || [estadoTxt isEqualToString:@"pausado"]) {
            tituloStatus = @"⏸️ Contador pausado";
        } else if ([estadoTxt isEqualToString:@"contando"]) {
            NSString *arq = st[@"arquivoNome"] ?: @"Documento";
            NSString *livro = st[@"livroNome"] ?: @"Livro";
            NSInteger pal = [st[@"palavras"] integerValue];
            tituloStatus = [NSString stringWithFormat:@"🟢 %@ (%@) • %ld palavras", arq, livro, (long)pal];
        } else if ([estadoTxt isEqualToString:@"ignorado"]) {
            NSString *arq = st[@"arquivoNome"] ?: @"Documento";
            tituloStatus = [NSString stringWithFormat:@"💤 Ignorando \"%@\" (não marcado)", arq];
        } else if ([estadoTxt isEqualToString:@"erro"]) {
            NSString *err = [st[@"erro"] isKindOfClass:[NSString class]] ? st[@"erro"] : @"Aguardando acesso ao documento";
            tituloStatus = [NSString stringWithFormat:@"⚠️ %@", err];
        }

        if (tituloStatus.length > 74) {
            tituloStatus = [[tituloStatus substringToIndex:71] stringByAppendingString:@"..."];
        }
        self.itemStatusMenu.title = tituloStatus;
        self.itemPausarMenu.title = pausado ? @"▶️ Retomar contador" : @"⏸️ Pausar contador";
        self.statusItem.button.toolTip = [NSString stringWithFormat:@"Central de Livrinhos\n%@", tituloStatus];
    });
}

#pragma mark - Ações do Menu da Bandeja

- (void)acaoAbrirCentral:(id)sender {
    (void)sender;
    [self abrirJanelaCentral];
}

- (void)acaoAbrirMini:(id)sender {
    (void)sender;
    [self abrirJanelaMini];
}

- (void)acaoAlternarSemprePorCima:(id)sender {
    (void)sender;
    BOOL novoValor = !_estado.janelinhaSemprePorCima;
    [_estado salvarGeometriaJanelinha:(_janelaMini ? _janelaMini.frame : _estado.frameJanelinha)
                         semprePorCima:novoValor];
    _itemSemprePorCimaMenu.state = novoValor ? NSControlStateValueOn : NSControlStateValueOff;
    if (_janelaMini) {
        _janelaMini.level = novoValor ? NSFloatingWindowLevel : NSNormalWindowLevel;
    }
}

- (void)acaoAlternarPausa:(id)sender {
    (void)sender;
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
        NSDictionary *st = [self.estado definirPausado:nil];
        [self atualizarMenuBarEmBackgroundComStatus:st];
    });
}

- (void)acaoEscolherArquivo:(id)sender {
    (void)sender;
    NSString *escolhido = [self mostrarSeletorArquivoExtraNaMain];
    if (escolhido.length > 0) {
        dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
            NSDictionary *st = [self.estado definirArquivoExtraManual:escolhido];
            [self atualizarMenuBarEmBackgroundComStatus:st];
        });
    }
}

- (void)acaoAlternarAutoStart:(id)sender {
    (void)sender;
    BOOL desejaLigar = !InicioAutomaticoAtivoNoMac();
    BOOL ok = DefinirInicioAutomaticoNoMac(desejaLigar);
    BOOL estadoFinal = ok ? desejaLigar : InicioAutomaticoAtivoNoMac();
    [_estado salvarAutoStart:estadoFinal];
    _itemAutoStartMenu.state = estadoFinal ? NSControlStateValueOn : NSControlStateValueOff;
}

- (void)acaoSair:(id)sender {
    (void)sender;
    _encerrando = YES;
    [NSApp terminate:nil];
}

- (nullable NSString *)mostrarSeletorArquivoExtraNaMain {
    [NSApp activateIgnoringOtherApps:YES];
    NSOpenPanel *panel = [NSOpenPanel openPanel];
    panel.title = @"Escolher arquivo de livro (nenhum texto sai do computador)";
    panel.prompt = @"Contar este arquivo";
    panel.canChooseFiles = YES;
    panel.canChooseDirectories = NO;
    panel.allowsMultipleSelection = NO;
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    panel.allowedFileTypes = @[@"pages", @"docx", @"txt", @"md", @"markdown", @"odt"];
#pragma clang diagnostic pop

    if ([panel runModal] == NSModalResponseOK) {
        return panel.URL.path;
    }
    return nil;
}

#pragma mark - Janelas WKWebView (Central e Janelinha da Mesa)

- (WKWebViewConfiguration *)criarWebConfig {
    WKWebViewConfiguration *cfg = [[WKWebViewConfiguration alloc] init];
    cfg.websiteDataStore = [WKWebsiteDataStore defaultDataStore];

    WKUserContentController *ucc = [[WKUserContentController alloc] init];
    [ucc addScriptMessageHandler:self name:@"clSalvarArquivo"];

    // Intercepta <a download="..."> (backup .json e cartinha .png) para abrir o diálogo nativo "Salvar Como" do Mac.
    NSString *jsDownload =
        @"(function(){"
        @"  document.addEventListener('click', function(ev){"
        @"    var a = ev.target && ev.target.closest ? ev.target.closest('a[download]') : null;"
        @"    if (!a) return;"
        @"    var href = a.getAttribute('href') || a.href || '';"
        @"    var nome = a.getAttribute('download') || 'arquivo';"
        @"    if (href.indexOf('data:') === 0) {"
        @"      ev.preventDefault(); ev.stopPropagation();"
        @"      window.webkit.messageHandlers.clSalvarArquivo.postMessage({ nome: nome, dataUrl: href });"
        @"    } else if (href.indexOf('blob:') === 0) {"
        @"      ev.preventDefault(); ev.stopPropagation();"
        @"      fetch(href).then(function(r){ return r.blob(); }).then(function(blob){"
        @"        var reader = new FileReader();"
        @"        reader.onloadend = function(){"
        @"          window.webkit.messageHandlers.clSalvarArquivo.postMessage({ nome: nome, dataUrl: reader.result || '' });"
        @"        };"
        @"        reader.readAsDataURL(blob);"
        @"      });"
        @"    }"
        @"  }, true);"
        @"})();";

    WKUserScript *script = [[WKUserScript alloc] initWithSource:jsDownload
                                                  injectionTime:WKUserScriptInjectionTimeAtDocumentEnd
                                               forMainFrameOnly:NO];
    [ucc addUserScript:script];
    cfg.userContentController = ucc;
    return cfg;
}

- (NSRect)garantirRectVisivel:(NSRect)r padraoLargura:(CGFloat)wDef padraoAltura:(CGFloat)hDef {
    NSArray<NSScreen *> *telas = [NSScreen screens];
    for (NSScreen *tela in telas) {
        if (NSIntersectsRect(NSInsetRect(r, 40, 40), tela.visibleFrame)) {
            return r;
        }
    }
    NSRect vf = [NSScreen mainScreen] ? [NSScreen mainScreen].visibleFrame : NSMakeRect(0, 0, 1280, 800);
    CGFloat x = NSMidX(vf) - wDef / 2.0;
    CGFloat y = NSMidY(vf) - hDef / 2.0;
    return NSMakeRect(x, y, wDef, hDef);
}

- (void)abrirJanelaCentral {
    NSString *urlStr = [NSString stringWithFormat:@"http://%@:%u/", kHostLocal, kPortaServidor];
    NSURL *url = [NSURL URLWithString:urlStr];

    if (!_janelaCentral) {
        NSRect vis = [NSScreen mainScreen] ? [NSScreen mainScreen].visibleFrame : NSMakeRect(0, 0, 1280, 800);
        CGFloat w = MIN(1180.0, MAX(820.0, vis.size.width - 80.0));
        CGFloat h = MIN(820.0, MAX(600.0, vis.size.height - 60.0));
        NSRect frame = NSMakeRect(NSMidX(vis) - w / 2.0, NSMidY(vis) - h / 2.0, w, h);

        _janelaCentral = [[NSWindow alloc] initWithContentRect:frame
                                                     styleMask:(NSWindowStyleMaskTitled |
                                                                NSWindowStyleMaskClosable |
                                                                NSWindowStyleMaskMiniaturizable |
                                                                NSWindowStyleMaskResizable)
                                                       backing:NSBackingStoreBuffered
                                                         defer:NO];
        _janelaCentral.title = @"Central de Livrinhos";
        _janelaCentral.minSize = NSMakeSize(760.0, 520.0);
        _janelaCentral.delegate = self;
        _janelaCentral.releasedWhenClosed = NO;

        _webCentral = [[WKWebView alloc] initWithFrame:_janelaCentral.contentView.bounds configuration:[self criarWebConfig]];
        _webCentral.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
        _webCentral.UIDelegate = self;
        _webCentral.navigationDelegate = self;
        [_janelaCentral setContentView:_webCentral];
        [_webCentral loadRequest:[NSURLRequest requestWithURL:url]];
    } else if (!_webCentral.URL || ![_webCentral.URL.absoluteString hasPrefix:urlStr]) {
        [_webCentral loadRequest:[NSURLRequest requestWithURL:url]];
    }

    [NSApp activateIgnoringOtherApps:YES];
    [_janelaCentral makeKeyAndOrderFront:nil];
}

- (void)abrirJanelaMini {
    NSString *urlStr = [NSString stringWithFormat:@"http://%@:%u/?mini=1", kHostLocal, kPortaServidor];
    NSURL *url = [NSURL URLWithString:urlStr];

    if (!_janelaMini) {
        NSRect vis = [NSScreen mainScreen] ? [NSScreen mainScreen].visibleFrame : NSMakeRect(0, 0, 1280, 800);
        NSRect framePadrao = NSMakeRect(NSMaxX(vis) - 344.0, NSMaxY(vis) - 384.0, 320.0, 360.0);
        NSRect frameInicial = _estado.temPosicaoJanelinha
            ? [self garantirRectVisivel:_estado.frameJanelinha padraoLargura:320.0 padraoAltura:360.0]
            : framePadrao;

        _janelaMini = [[NSWindow alloc] initWithContentRect:frameInicial
                                                  styleMask:(NSWindowStyleMaskTitled |
                                                             NSWindowStyleMaskClosable |
                                                             NSWindowStyleMaskMiniaturizable |
                                                             NSWindowStyleMaskResizable)
                                                    backing:NSBackingStoreBuffered
                                                      defer:NO];
        _janelaMini.title = @"Janelinha da Mesa: Central de Livrinhos";
        _janelaMini.minSize = NSMakeSize(280.0, 310.0);
        _janelaMini.delegate = self;
        _janelaMini.releasedWhenClosed = NO;
        _janelaMini.level = _estado.janelinhaSemprePorCima ? NSFloatingWindowLevel : NSNormalWindowLevel;
        _janelaMini.collectionBehavior = NSWindowCollectionBehaviorCanJoinAllSpaces | NSWindowCollectionBehaviorFullScreenAuxiliary;

        _webMini = [[WKWebView alloc] initWithFrame:_janelaMini.contentView.bounds configuration:[self criarWebConfig]];
        _webMini.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
        _webMini.UIDelegate = self;
        _webMini.navigationDelegate = self;
        [_janelaMini setContentView:_webMini];
        [_webMini loadRequest:[NSURLRequest requestWithURL:url]];
    } else if (!_webMini.URL || ![_webMini.URL.absoluteString containsString:@"mini=1"]) {
        [_webMini loadRequest:[NSURLRequest requestWithURL:url]];
    }

    _janelaMini.level = _estado.janelinhaSemprePorCima ? NSFloatingWindowLevel : NSNormalWindowLevel;
    [NSApp activateIgnoringOtherApps:YES];
    [_janelaMini makeKeyAndOrderFront:nil];
}

#pragma mark - NSWindowDelegate (esconder sem encerrar e lembrar posição da janelinha)

- (BOOL)windowShouldClose:(NSWindow *)sender {
    if (sender == _janelaMini) {
        [_estado salvarGeometriaJanelinha:sender.frame semprePorCima:_estado.janelinhaSemprePorCima];
    }
    // Só esconde a janela; o contador continua ativo no tomatinho lá em cima.
    [sender orderOut:nil];
    return NO;
}

- (void)windowDidMove:(NSNotification *)notification {
    NSWindow *w = notification.object;
    if (w == _janelaMini && w.isVisible) {
        [_estado salvarGeometriaJanelinha:w.frame semprePorCima:_estado.janelinhaSemprePorCima];
    }
}

- (void)windowDidResize:(NSNotification *)notification {
    NSWindow *w = notification.object;
    if (w == _janelaMini && w.isVisible) {
        [_estado salvarGeometriaJanelinha:w.frame semprePorCima:_estado.janelinhaSemprePorCima];
    }
}

#pragma mark - WKScriptMessageHandler (salvar backup .json e cartinha .png localmente)

- (void)userContentController:(WKUserContentController *)userContentController
      didReceiveScriptMessage:(WKScriptMessage *)message {
    (void)userContentController;
    if (![message.name isEqualToString:@"clSalvarArquivo"] || ![message.body isKindOfClass:[NSDictionary class]]) {
        return;
    }
    NSDictionary *info = (NSDictionary *)message.body;
    NSString *nome = [info[@"nome"] isKindOfClass:[NSString class]] ? info[@"nome"] : @"arquivo";
    NSString *dataUrl = [info[@"dataUrl"] isKindOfClass:[NSString class]] ? info[@"dataUrl"] : @"";
    NSRange virgula = [dataUrl rangeOfString:@","];
    if (virgula.location == NSNotFound) return;

    NSString *cab = [dataUrl substringToIndex:virgula.location];
    NSString *conteudoStr = [dataUrl substringFromIndex:virgula.location + 1];
    NSData *dadosSalvar = nil;
    if ([cab containsString:@";base64"]) {
        dadosSalvar = [[NSData alloc] initWithBase64EncodedString:conteudoStr
                                                          options:NSDataBase64DecodingIgnoreUnknownCharacters];
    } else {
        NSString *dec = [conteudoStr stringByRemovingPercentEncoding] ?: conteudoStr;
        dadosSalvar = [dec dataUsingEncoding:NSUTF8StringEncoding];
    }
    if (!dadosSalvar || dadosSalvar.length == 0) return;

    NSSavePanel *sp = [NSSavePanel savePanel];
    sp.nameFieldStringValue = nome.lastPathComponent;
    sp.canCreateDirectories = YES;
    if ([sp runModal] == NSModalResponseOK && sp.URL) {
        [dadosSalvar writeToURL:sp.URL atomically:YES];
    }
}

#pragma mark - WKUIDelegate & WKNavigationDelegate (diálogos nativos e bloqueio externo)

- (void)webView:(WKWebView *)webView
runJavaScriptAlertPanelWithMessage:(NSString *)message
initiatedByFrame:(WKFrameInfo *)frame
completionHandler:(void (^)(void))completionHandler {
    (void)webView;
    (void)frame;
    NSAlert *alerta = [[NSAlert alloc] init];
    alerta.messageText = @"Central de Livrinhos";
    alerta.informativeText = message ?: @"";
    [alerta addButtonWithTitle:@"OK"];
    [alerta runModal];
    completionHandler();
}

- (void)webView:(WKWebView *)webView
runJavaScriptConfirmPanelWithMessage:(NSString *)message
initiatedByFrame:(WKFrameInfo *)frame
completionHandler:(void (^)(BOOL))completionHandler {
    (void)webView;
    (void)frame;
    NSAlert *alerta = [[NSAlert alloc] init];
    alerta.messageText = @"Central de Livrinhos";
    alerta.informativeText = message ?: @"";
    [alerta addButtonWithTitle:@"Confirmar"];
    [alerta addButtonWithTitle:@"Cancelar"];
    NSModalResponse resp = [alerta runModal];
    completionHandler(resp == NSAlertFirstButtonReturn);
}

- (void)webView:(WKWebView *)webView
runJavaScriptTextInputPanelWithPrompt:(NSString *)prompt
    defaultText:(nullable NSString *)defaultText
initiatedByFrame:(WKFrameInfo *)frame
completionHandler:(void (^)(NSString * _Nullable))completionHandler {
    (void)webView;
    (void)frame;
    NSAlert *alerta = [[NSAlert alloc] init];
    alerta.messageText = @"Central de Livrinhos";
    alerta.informativeText = prompt ?: @"";
    [alerta addButtonWithTitle:@"Salvar"];
    [alerta addButtonWithTitle:@"Cancelar"];

    NSTextField *campo = [[NSTextField alloc] initWithFrame:NSMakeRect(0, 0, 320, 24)];
    campo.stringValue = defaultText ?: @"";
    alerta.accessoryView = campo;
    alerta.window.initialFirstResponder = campo;

    NSModalResponse resp = [alerta runModal];
    completionHandler(resp == NSAlertFirstButtonReturn ? campo.stringValue : nil);
}

- (void)webView:(WKWebView *)webView
runOpenPanelWithParameters:(WKOpenPanelParameters *)parameters
initiatedByFrame:(WKFrameInfo *)frame
completionHandler:(void (^)(NSArray<NSURL *> * _Nullable))completionHandler {
    (void)webView;
    (void)frame;
    NSOpenPanel *op = [NSOpenPanel openPanel];
    op.canChooseFiles = YES;
    op.canChooseDirectories = NO;
    op.allowsMultipleSelection = parameters.allowsMultipleSelection;
    if ([op runModal] == NSModalResponseOK) {
        completionHandler(op.URLs);
    } else {
        completionHandler(nil);
    }
}

- (nullable WKWebView *)webView:(WKWebView *)webView
 createWebViewWithConfiguration:(WKWebViewConfiguration *)configuration
            forNavigationAction:(WKNavigationAction *)navigationAction
                 windowFeatures:(WKWindowFeatures *)windowFeatures {
    (void)webView;
    (void)configuration;
    (void)windowFeatures;
    NSURL *url = navigationAction.request.URL;
    if ([url.host isEqualToString:kHostLocal] || [url.host isEqualToString:@"localhost"]) {
        if ([url.query containsString:@"mini=1"]) {
            [self abrirJanelaMini];
        } else {
            [self abrirJanelaCentral];
        }
    }
    return nil;
}

- (void)webView:(WKWebView *)webView
decidePolicyForNavigationAction:(WKNavigationAction *)navigationAction
decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler {
    (void)webView;
    NSURL *url = navigationAction.request.URL;
    NSString *scheme = url.scheme.lowercaseString;
    if ([scheme isEqualToString:@"about"] || [scheme isEqualToString:@"data"] || [scheme isEqualToString:@"blob"]) {
        decisionHandler(WKNavigationActionPolicyAllow);
        return;
    }
    // Bloqueia qualquer navegação externa (zero tráfego fora de 127.0.0.1).
    BOOL hostLocal = ([url.host isEqualToString:kHostLocal] || [url.host isEqualToString:@"localhost"]) &&
                     (url.port.integerValue == kPortaServidor);
    if (!hostLocal) {
        decisionHandler(WKNavigationActionPolicyCancel);
        return;
    }

#if __MAC_OS_X_VERSION_MAX_ALLOWED >= 110300
    if (@available(macOS 11.3, *)) {
        if (navigationAction.shouldPerformDownload) {
            decisionHandler(WKNavigationActionPolicyDownload);
            return;
        }
    }
#endif
    decisionHandler(WKNavigationActionPolicyAllow);
}

#if __MAC_OS_X_VERSION_MAX_ALLOWED >= 110300
- (void)webView:(WKWebView *)webView
navigationAction:(WKNavigationAction *)navigationAction
didBecomeDownload:(WKDownload *)download API_AVAILABLE(macos(11.3)) {
    (void)webView;
    (void)navigationAction;
    download.delegate = self;
}

- (void)download:(WKDownload *)download
decideDestinationUsingResponse:(NSURLResponse *)response
         suggestedFilename:(NSString *)suggestedFilename
         completionHandler:(void (^)(NSURL * _Nullable))completionHandler API_AVAILABLE(macos(11.3)) {
    (void)download;
    (void)response;
    NSSavePanel *sp = [NSSavePanel savePanel];
    sp.nameFieldStringValue = suggestedFilename.length > 0 ? suggestedFilename : @"CentralDeLivrinhos";
    if ([sp runModal] == NSModalResponseOK && sp.URL) {
        completionHandler(sp.URL);
    } else {
        completionHandler(nil);
    }
}
#endif

@end

#pragma mark - Instância única & Ponto de entrada

static BOOL ServidorJaEstaAtivoEPedirCentral(BOOL abrirCentralSeRodando) {
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0) return NO;

    struct timeval tv;
    tv.tv_sec = 0;
    tv.tv_usec = 350000;
    setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
    setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, &tv, sizeof(tv));

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_port = htons(kPortaServidor);
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);

    if (connect(fd, (struct sockaddr *)&addr, sizeof(addr)) != 0) {
        close(fd);
        return NO;
    }

    if (abrirCentralSeRodando) {
        NSString *req = [NSString stringWithFormat:
            @"POST /api/abrir-central HTTP/1.1\r\n"
            @"Host: 127.0.0.1:%u\r\n"
            @"Origin: http://127.0.0.1:%u\r\n"
            @"Content-Type: application/json\r\n"
            @"Content-Length: 2\r\n"
            @"Connection: close\r\n\r\n{}",
            kPortaServidor, kPortaServidor];
        NSData *d = [req dataUsingEncoding:NSUTF8StringEncoding];
        send(fd, d.bytes, d.length, 0);
        char lixo[256];
        recv(fd, lixo, sizeof(lixo), 0);
    }
    close(fd);
    return YES;
}

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        BOOL silencioso = NO;
        for (int i = 1; i < argc; i++) {
            if (strcmp(argv[i], "--silencioso") == 0) {
                silencioso = YES;
            }
        }

        if (ServidorJaEstaAtivoEPedirCentral(!silencioso)) {
            return 0;
        }

        NSApplication *app = [NSApplication sharedApplication];
        // Fica discreto na barra de cima (sem poluir o Dock quando nenhuma janela está aberta).
        [app setActivationPolicy:NSApplicationActivationPolicyAccessory];

        CLAppController *controller = [[CLAppController alloc] init];
        controller.iniciarSilencioso = silencioso;
        controller.socketServidor = -1;
        controller.estado = [[CLEstadoContador alloc] initWithBundlePaths];

        app.delegate = controller;
        [app run];
    }
    return 0;
}
