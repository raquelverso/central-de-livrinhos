/*
 * ContarPalavras.m: Módulo isolado de contagem de palavras para macOS.
 *
 * PRIVACIDADE MÁXIMA (regra do projeto):
 * 1. Este arquivo faz UMA única coisa: transforma documento em NÚMEROS inteiros.
 * 2. Quando consulta Apple Pages ou Microsoft Word abertos, pede SOMENTE
 *    "(count of words)" e "(count of characters)"; o texto nem entra neste app.
 * 3. Quando lê arquivo salvo no disco (.txt, .md, .docx, .odt), conta na memória RAM
 *    dentro de @autoreleasepool local e descarta na mesma fração de segundo.
 * 4. Nenhum trecho do livro é gravado em arquivo, log, histórico ou enviado pela rede.
 */

#import "ContarPalavras.h"

@implementation CLDocumentoAberto
@end

@implementation CLResultadoContagem
@end

#pragma mark - Contador em streaming na RAM para XML (.docx / .odt)

@interface CLXmlWordCounter : NSObject <NSXMLParserDelegate>
@property (nonatomic, assign) NSInteger palavrasBlocos;
@property (nonatomic, assign) NSInteger palavrasTotal;
@property (nonatomic, assign) BOOL viuBloco;
@end

@implementation CLXmlWordCounter {
    NSInteger _profundidadeBloco;
    BOOL _espacoAnteriorBloco;
    BOOL _espacoAnteriorTotal;
    NSCharacterSet *_setEspacos;
}

- (instancetype)init {
    self = [super init];
    if (self) {
        _espacoAnteriorBloco = YES;
        _espacoAnteriorTotal = YES;
        _setEspacos = [NSCharacterSet whitespaceAndNewlineCharacterSet];
    }
    return self;
}

+ (BOOL)tagEhBloco:(NSString *)elementName namespaceURI:(nullable NSString *)namespaceURI {
    (void)namespaceURI;
    // Remove prefixo XML ("w:p" -> "p", "text:h" -> "h") sem guardar conteúdo.
    NSRange doisPontos = [elementName rangeOfString:@":" options:NSBackwardsSearch];
    NSString *local = (doisPontos.location != NSNotFound)
        ? [elementName substringFromIndex:doisPontos.location + 1]
        : elementName;
    return [local isEqualToString:@"p"] || [local isEqualToString:@"h"];
}

- (void)parser:(NSXMLParser *)parser
didStartElement:(NSString *)elementName
  namespaceURI:(nullable NSString *)namespaceURI
 qualifiedName:(nullable NSString *)qName
    attributes:(NSDictionary<NSString *, NSString *> *)attributeDict {
    (void)parser;
    (void)qName;
    (void)attributeDict;
    if ([CLXmlWordCounter tagEhBloco:elementName namespaceURI:namespaceURI]) {
        _viuBloco = YES;
        _profundidadeBloco++;
        _espacoAnteriorBloco = YES;
        _espacoAnteriorTotal = YES;
    }
}

- (void)parser:(NSXMLParser *)parser
 didEndElement:(NSString *)elementName
  namespaceURI:(nullable NSString *)namespaceURI
 qualifiedName:(nullable NSString *)qName {
    (void)parser;
    (void)qName;
    if ([CLXmlWordCounter tagEhBloco:elementName namespaceURI:namespaceURI]) {
        if (_profundidadeBloco > 0) _profundidadeBloco--;
        _espacoAnteriorBloco = YES;
        _espacoAnteriorTotal = YES;
    }
}

- (void)parser:(NSXMLParser *)parser foundCharacters:(NSString *)string {
    (void)parser;
    // Percorre caractere por caractere contando apenas transições para não-espaço.
    // Nenhuma palavra é copiada para outra lista ou variável persistente.
    NSUInteger len = string.length;
    for (NSUInteger i = 0; i < len; i++) {
        unichar c = [string characterAtIndex:i];
        BOOL ehEspaco = [_setEspacos characterIsMember:c];
        if (ehEspaco) {
            if (_profundidadeBloco > 0) _espacoAnteriorBloco = YES;
            _espacoAnteriorTotal = YES;
        } else {
            if (_profundidadeBloco > 0 && _espacoAnteriorBloco) {
                _palavrasBlocos++;
                _espacoAnteriorBloco = NO;
            }
            if (_espacoAnteriorTotal) {
                _palavrasTotal++;
                _espacoAnteriorTotal = NO;
            }
        }
    }
}

@end

#pragma mark - Helpers internos (sem rede, sem shell, sem gravação de texto)

static NSInteger ContarPalavrasStringNaRAM(NSString *texto) {
    if (!texto || texto.length == 0) return 0;
    NSCharacterSet *espacos = [NSCharacterSet whitespaceAndNewlineCharacterSet];
    NSInteger contagem = 0;
    BOOL espacoAnterior = YES;
    NSUInteger len = texto.length;
    for (NSUInteger i = 0; i < len; i++) {
        unichar c = [texto characterAtIndex:i];
        if ([espacos characterIsMember:c]) {
            espacoAnterior = YES;
        } else if (espacoAnterior) {
            contagem++;
            espacoAnterior = NO;
        }
    }
    return contagem;
}

static NSData * _Nullable ExecutarProcessoSilencioso(
    NSString *executavel,
    NSArray<NSString *> *argumentos,
    NSTimeInterval timeoutSegundos,
    int * _Nullable codigoSaidaOut,
    NSString * _Nullable * _Nullable stderrOut
) {
    NSTask *task = [[NSTask alloc] init];
    task.executableURL = [NSURL fileURLWithPath:executavel];
    task.arguments = argumentos ?: @[];

    NSPipe *pipeStdout = [NSPipe pipe];
    NSPipe *pipeStderr = [NSPipe pipe];
    task.standardOutput = pipeStdout;
    task.standardError = pipeStderr;
    task.standardInput = [NSPipe pipe];

    NSError *erroLaunch = nil;
    if (![task launchAndReturnError:&erroLaunch]) {
        if (codigoSaidaOut) *codigoSaidaOut = -1;
        if (stderrOut) *stderrOut = erroLaunch.localizedDescription ?: @"Erro ao executar utilitário.";
        return nil;
    }

    // Lê stdout e stderr em threads concorrentes para nunca encher o buffer do pipe.
    __block NSData *dadosOut = nil;
    __block NSData *dadosErr = nil;
    dispatch_group_t grupoLeitura = dispatch_group_create();
    dispatch_queue_t filaLeitura = dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0);

    dispatch_group_async(grupoLeitura, filaLeitura, ^{
        dadosOut = [[pipeStdout fileHandleForReading] readDataToEndOfFile];
    });
    dispatch_group_async(grupoLeitura, filaLeitura, ^{
        dadosErr = [[pipeStderr fileHandleForReading] readDataToEndOfFile];
    });

    dispatch_semaphore_t semaTermino = dispatch_semaphore_create(0);
    task.terminationHandler = ^(NSTask * _Nonnull t) {
        (void)t;
        dispatch_semaphore_signal(semaTermino);
    };

    // Caso já tenha encerrado antes do handler registrar.
    if (!task.isRunning) {
        dispatch_semaphore_signal(semaTermino);
    }

    dispatch_time_t limite = dispatch_time(DISPATCH_TIME_NOW, (int64_t)(timeoutSegundos * NSEC_PER_SEC));
    if (dispatch_semaphore_wait(semaTermino, limite) != 0) {
        [task terminate];
        if (codigoSaidaOut) *codigoSaidaOut = -2;
        if (stderrOut) *stderrOut = @"Tempo limite atingido ao consultar aplicativo.";
        return nil;
    }

    dispatch_group_wait(grupoLeitura, dispatch_time(DISPATCH_TIME_NOW, (int64_t)(2 * NSEC_PER_SEC)));
    if (codigoSaidaOut) *codigoSaidaOut = task.terminationStatus;
    if (stderrOut) {
        NSString *errTxt = dadosErr.length > 0
            ? [[NSString alloc] initWithData:dadosErr encoding:NSUTF8StringEncoding]
            : @"";
        *stderrOut = errTxt ?: @"";
    }
    return dadosOut;
}

static NSString *RodarAppleScriptComArgs(
    NSString *script,
    NSArray<NSString *> *args,
    NSTimeInterval timeout,
    int * _Nullable codigoSaida,
    NSString * _Nullable * _Nullable stderrOut
) {
    NSMutableArray<NSString *> *osascriptArgs = [NSMutableArray arrayWithObjects:@"-e", script, nil];
    if (args.count > 0) {
        [osascriptArgs addObjectsFromArray:args];
    }
    int status = 0;
    NSString *err = nil;
    NSData *dados = ExecutarProcessoSilencioso(@"/usr/bin/osascript", osascriptArgs, timeout, &status, &err);
    if (codigoSaida) *codigoSaida = status;
    if (stderrOut) *stderrOut = err;
    if (!dados || status != 0) return @"";
    NSString *txt = [[NSString alloc] initWithData:dados encoding:NSUTF8StringEncoding];
    if (!txt) txt = [[NSString alloc] initWithData:dados encoding:NSISOLatin1StringEncoding];
    return [txt stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]] ?: @"";
}

static BOOL ErroPermissaoAutomacao(NSString * _Nullable stderrTxt, int codigoSaida) {
    if (codigoSaida == 0 || !stderrTxt) return NO;
    return ([stderrTxt containsString:@"-1743"] ||
            [stderrTxt containsString:@"Not authorized"] ||
            [stderrTxt containsString:@"not allowed"]);
}

#pragma mark - Implementação pública

@implementation CLContarPalavras

+ (BOOL)aplicativoAberto:(NSString *)nomeProcesso {
    if (nomeProcesso.length == 0) return NO;
    int status = -1;
    ExecutarProcessoSilencioso(@"/usr/bin/pgrep", @[@"-x", nomeProcesso], 2.0, &status, nil);
    return status == 0;
}

+ (NSArray<CLDocumentoAberto *> *)listarDocumentosAbertosMac {
    NSMutableArray<CLDocumentoAberto *> *lista = [NSMutableArray array];
    NSMutableSet<NSString *> *vistos = [NSMutableSet set];

    // 1º: Apple Pages (prioridade para quem escreve no Mac).
    // Pergunta SOMENTE caminho/nome dos documentos abertos (zero palavras lidas).
    if ([self aplicativoAberto:@"Pages"]) {
        NSString *scriptPages =
            @"tell application \"Pages\"\n"
            @"    if (count of documents) is 0 then return \"\"\n"
            @"    set listaNomes to {}\n"
            @"    repeat with docRef in documents\n"
            @"        set nomeItem to \"\"\n"
            @"        try\n"
            @"            set nomeItem to POSIX path of ((file of docRef) as alias)\n"
            @"        on error\n"
            @"            try\n"
            @"                set nomeItem to (name of docRef) as string\n"
            @"            end try\n"
            @"        end try\n"
            @"        if nomeItem is not \"\" then set end of listaNomes to nomeItem\n"
            @"    end repeat\n"
            @"    set AppleScript's text item delimiters to linefeed\n"
            @"    return listaNomes as string\n"
            @"end tell";

        NSString *saida = RodarAppleScriptComArgs(scriptPages, @[], 6.0, nil, nil);
        for (NSString *linha in [saida componentsSeparatedByCharactersInSet:[NSCharacterSet newlineCharacterSet]]) {
            NSString *limpa = [[linha stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]] lastPathComponent];
            if (limpa.length == 0) continue;
            NSString *chave = [NSString stringWithFormat:@"pages:%@", limpa.lowercaseString];
            if (![vistos containsObject:chave]) {
                [vistos addObject:chave];
                CLDocumentoAberto *doc = [[CLDocumentoAberto alloc] init];
                doc.nome = limpa;
                doc.modo = @"pages";
                [lista addObject:doc];
            }
        }
    }

    // 2º: Microsoft Word (só consulta se já estiver aberto).
    if ([self aplicativoAberto:@"Microsoft Word"]) {
        NSString *scriptWord =
            @"tell application \"Microsoft Word\"\n"
            @"    if (count of documents) is 0 then return \"\"\n"
            @"    set listaNomes to {}\n"
            @"    repeat with docRef in documents\n"
            @"        try\n"
            @"            set nomeItem to (name of docRef) as string\n"
            @"            if nomeItem is not \"\" then set end of listaNomes to nomeItem\n"
            @"        end try\n"
            @"    end repeat\n"
            @"    set AppleScript's text item delimiters to linefeed\n"
            @"    return listaNomes as string\n"
            @"end tell";

        NSString *saida = RodarAppleScriptComArgs(scriptWord, @[], 6.0, nil, nil);
        for (NSString *linha in [saida componentsSeparatedByCharactersInSet:[NSCharacterSet newlineCharacterSet]]) {
            NSString *limpa = [[linha stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]] lastPathComponent];
            if (limpa.length == 0) continue;
            NSString *chave = [NSString stringWithFormat:@"word:%@", limpa.lowercaseString];
            if (![vistos containsObject:chave]) {
                [vistos addObject:chave];
                CLDocumentoAberto *doc = [[CLDocumentoAberto alloc] init];
                doc.nome = limpa;
                doc.modo = @"word";
                [lista addObject:doc];
            }
        }
    }

    return lista;
}

+ (CLResultadoContagem *)contarPalavrasPagesAberto:(nullable NSString *)nomeAlvo {
    CLResultadoContagem *res = [[CLResultadoContagem alloc] init];
    if (![self aplicativoAberto:@"Pages"]) {
        res.erro = @"O Apple Pages está fechado.";
        return res;
    }

    NSString *limpo = [(nomeAlvo ?: @"") stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
    NSString *base = limpo.lastPathComponent ?: @"";
    NSString *stem = [base stringByDeletingPathExtension] ?: base;
    NSString *caminhoAbs = ([limpo hasPrefix:@"/"]) ? limpo : @"";

    // Pede ao Pages SOMENTE os dois números inteiros (palavras e caracteres).
    NSString *script =
        @"on run argv\n"
        @"    set baseAlvo to item 1 of argv\n"
        @"    set stemAlvo to item 2 of argv\n"
        @"    set caminhoAlvo to item 3 of argv\n"
        @"    tell application \"Pages\"\n"
        @"        if (count of documents) is 0 then return \"__SEM_DOC__\"\n"
        @"        set docAlvo to missing value\n"
        @"        if baseAlvo is \"\" then\n"
        @"            set docAlvo to front document\n"
        @"        else\n"
        @"            repeat with docRef in documents\n"
        @"                set achouDoc to false\n"
        @"                try\n"
        @"                    set docPath to POSIX path of ((file of docRef) as alias)\n"
        @"                    if caminhoAlvo is not \"\" and docPath is caminhoAlvo then set achouDoc to true\n"
        @"                    if not achouDoc and (docPath ends with (\"/\" & baseAlvo)) then set achouDoc to true\n"
        @"                end try\n"
        @"                if not achouDoc then\n"
        @"                    try\n"
        @"                        set docNome to (name of docRef) as string\n"
        @"                        ignoring case\n"
        @"                            if docNome is baseAlvo or docNome is stemAlvo then set achouDoc to true\n"
        @"                        end ignoring\n"
        @"                    end try\n"
        @"                end if\n"
        @"                if achouDoc then\n"
        @"                    set docAlvo to docRef\n"
        @"                    exit repeat\n"
        @"                end if\n"
        @"            end repeat\n"
        @"        end if\n"
        @"        if docAlvo is missing value then return \"__DOC_NAO_ABERTO__\"\n"
        @"        set qtdP to 0\n"
        @"        try\n"
        @"            set qtdP to count of words of body text of docAlvo\n"
        @"        on error\n"
        @"            set qtdP to count of words of docAlvo\n"
        @"        end try\n"
        @"        set qtdC to 0\n"
        @"        try\n"
        @"            set qtdC to count of characters of body text of docAlvo\n"
        @"        on error\n"
        @"            try\n"
        @"                set qtdC to count of characters of docAlvo\n"
        @"            on error\n"
        @"                set qtdC to 0\n"
        @"            end try\n"
        @"        end try\n"
        @"        return ((qtdP as string) & \"|\" & (qtdC as string))\n"
        @"    end tell\n"
        @"end run";

    int status = 0;
    NSString *err = nil;
    NSString *saida = RodarAppleScriptComArgs(script, @[base, stem, caminhoAbs], 10.0, &status, &err);

    if (ErroPermissaoAutomacao(err, status)) {
        res.erro = @"Permita o acesso ao Apple Pages em Ajustes do Sistema > Privacidade e Segurança > Automação.";
        return res;
    }
    if (saida.length == 0 || [saida isEqualToString:@"__SEM_DOC__"] || [saida isEqualToString:@"__DOC_NAO_ABERTO__"]) {
        res.erro = @"Nenhum documento correspondente aberto no Pages.";
        return res;
    }

    NSArray<NSString *> *partes = [saida componentsSeparatedByString:@"|"];
    res.ok = YES;
    res.palavras = MAX(0, [partes.firstObject integerValue]);
    res.tamanhoBytes = (partes.count > 1) ? MAX(0LL, [partes[1] longLongValue]) : 0LL;
    return res;
}

+ (CLResultadoContagem *)contarPalavrasWordAberto:(nullable NSString *)nomeAlvo {
    CLResultadoContagem *res = [[CLResultadoContagem alloc] init];
    if (![self aplicativoAberto:@"Microsoft Word"]) {
        res.erro = @"O Microsoft Word está fechado.";
        return res;
    }

    NSString *base = [(nomeAlvo ?: @"") stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]].lastPathComponent ?: @"";
    NSString *stem = [base stringByDeletingPathExtension] ?: base;

    // Pede ao Microsoft Word SOMENTE dois números inteiros (palavras e caracteres).
    NSString *script =
        @"on run argv\n"
        @"    set baseAlvo to item 1 of argv\n"
        @"    set stemAlvo to item 2 of argv\n"
        @"    tell application \"Microsoft Word\"\n"
        @"        if (count of documents) is 0 then return \"__SEM_DOC__\"\n"
        @"        set docAlvo to missing value\n"
        @"        if baseAlvo is \"\" then\n"
        @"            set docAlvo to active document\n"
        @"        else\n"
        @"            repeat with docRef in documents\n"
        @"                try\n"
        @"                    set docNome to (name of docRef) as string\n"
        @"                    ignoring case\n"
        @"                        if docNome is baseAlvo or docNome is stemAlvo then\n"
        @"                            set docAlvo to docRef\n"
        @"                            exit repeat\n"
        @"                        end if\n"
        @"                    end ignoring\n"
        @"                end try\n"
        @"            end repeat\n"
        @"        end if\n"
        @"        if docAlvo is missing value then return \"__DOC_NAO_ABERTO__\"\n"
        @"        set qtdP to count of words of docAlvo\n"
        @"        set qtdC to count of characters of docAlvo\n"
        @"        return ((qtdP as string) & \"|\" & (qtdC as string))\n"
        @"    end tell\n"
        @"end run";

    int status = 0;
    NSString *err = nil;
    NSString *saida = RodarAppleScriptComArgs(script, @[base, stem], 10.0, &status, &err);

    if (ErroPermissaoAutomacao(err, status)) {
        res.erro = @"Permita o acesso ao Microsoft Word em Ajustes do Sistema > Privacidade e Segurança > Automação.";
        return res;
    }
    if (saida.length == 0 || [saida isEqualToString:@"__SEM_DOC__"] || [saida isEqualToString:@"__DOC_NAO_ABERTO__"]) {
        res.erro = @"Nenhum documento correspondente aberto no Microsoft Word.";
        return res;
    }

    NSArray<NSString *> *partes = [saida componentsSeparatedByString:@"|"];
    res.ok = YES;
    res.palavras = MAX(0, [partes.firstObject integerValue]);
    res.tamanhoBytes = (partes.count > 1) ? MAX(0LL, [partes[1] longLongValue]) : 0LL;
    return res;
}

+ (CLResultadoContagem *)contarPalavrasArquivoDisco:(NSString *)caminho {
    @autoreleasepool {
        CLResultadoContagem *res = [[CLResultadoContagem alloc] init];
        if (caminho.length == 0) {
            res.erro = @"Nenhum arquivo selecionado.";
            return res;
        }

        NSString *caminhoAbs = [caminho stringByStandardizingPath];
        NSFileManager *fm = [NSFileManager defaultManager];
        NSDictionary<NSFileAttributeKey, id> *attrs = [fm attributesOfItemAtPath:caminhoAbs error:nil];
        if (!attrs) {
            res.erro = [NSString stringWithFormat:@"Arquivo não encontrado: %@", caminhoAbs.lastPathComponent];
            return res;
        }

        long long tamanhoDisco = [attrs[NSFileSize] longLongValue];
        NSDate *modDate = attrs[NSFileModificationDate];
        NSString *modTs = modDate ? [NSString stringWithFormat:@"%lld", (long long)modDate.timeIntervalSince1970] : @"0";
        NSString *ext = caminhoAbs.pathExtension.lowercaseString;

        // Caso 1: .pages (pergunta só o número ao Apple Pages aberto).
        if ([ext isEqualToString:@"pages"]) {
            CLResultadoContagem *pagesRes = [self contarPalavrasPagesAberto:caminhoAbs];
            if (!pagesRes.ok) {
                pagesRes.erro = @"Para arquivo .pages, deixe ele aberto no Apple Pages que eu conto direto de lá (só o número, sem abrir o arquivo).";
                return pagesRes;
            }
            pagesRes.modificadoEm = modTs;
            if (pagesRes.tamanhoBytes <= 0) pagesRes.tamanhoBytes = tamanhoDisco;
            return pagesRes;
        }

        // Caso 2: texto simples (.txt / .md / .markdown), lê só na RAM local e descarta ao sair do bloco.
        if ([ext isEqualToString:@"txt"] || [ext isEqualToString:@"md"] || [ext isEqualToString:@"markdown"]) {
            NSString *conteudo = [NSString stringWithContentsOfFile:caminhoAbs encoding:NSUTF8StringEncoding error:nil];
            if (!conteudo) {
                conteudo = [NSString stringWithContentsOfFile:caminhoAbs encoding:NSISOLatin1StringEncoding error:nil];
            }
            if (!conteudo) {
                res.erro = @"Não consegui abrir este arquivo de texto.";
                return res;
            }
            res.ok = YES;
            res.palavras = ContarPalavrasStringNaRAM(conteudo);
            res.tamanhoBytes = tamanhoDisco;
            res.modificadoEm = modTs;
            // O @autoreleasepool libera `conteudo` imediatamente ao terminar.
            return res;
        }

        // Caso 3: .docx / .odt (extrai apenas o XML interno na memória RAM sem criar arquivo temporário).
        NSString *entradaXml = nil;
        if ([ext isEqualToString:@"docx"]) {
            entradaXml = @"word/document.xml";
        } else if ([ext isEqualToString:@"odt"]) {
            entradaXml = @"content.xml";
        }

        if (entradaXml) {
            int status = 0;
            NSData *xmlDados = ExecutarProcessoSilencioso(
                @"/usr/bin/unzip",
                @[@"-p", caminhoAbs, entradaXml],
                12.0,
                &status,
                nil
            );
            if (status != 0 || xmlDados.length == 0) {
                res.erro = [NSString stringWithFormat:@"Não consegui ler o documento .%@ (feche ou salve se estiver sendo gravado).", ext];
                return res;
            }

            CLXmlWordCounter *contadorXml = [[CLXmlWordCounter alloc] init];
            NSXMLParser *parser = [[NSXMLParser alloc] initWithData:xmlDados];
            parser.delegate = contadorXml;
            if (![parser parse]) {
                res.erro = @"Estrutura do arquivo não reconhecida.";
                return res;
            }

            res.ok = YES;
            res.palavras = contadorXml.viuBloco ? contadorXml.palavrasBlocos : contadorXml.palavrasTotal;
            res.tamanhoBytes = tamanhoDisco;
            res.modificadoEm = modTs;
            return res;
        }

        res.erro = [NSString stringWithFormat:@"Formato .%@ não suportado. Use .pages, .docx, .txt, .md ou .odt.", ext];
        return res;
    }
}

@end
