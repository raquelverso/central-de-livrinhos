#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * Representa APENAS o nome e o aplicativo de um documento aberto (nunca guarda texto).
 */
@interface CLDocumentoAberto : NSObject
@property (nonatomic, copy) NSString *nome;
@property (nonatomic, copy) NSString *modo; // @"pages" ou @"word"
@end

/**
 * Resultado numérico de uma contagem (nunca contém trechos nem palavras do livro).
 */
@interface CLResultadoContagem : NSObject
@property (nonatomic, assign) BOOL ok;
@property (nonatomic, assign) NSInteger palavras;
@property (nonatomic, assign) long long tamanhoBytes;
@property (nonatomic, copy, nullable) NSString *modificadoEm;
@property (nonatomic, copy, nullable) NSString *erro;
@end

/**
 * Módulo isolado de contagem de palavras para Mac (PRIVACIDADE MÁXIMA).
 * - Nunca guarda texto do livro em disco, variável global, log ou cache.
 * - Ao ler Pages/Word abertos, recebe apenas números inteiros do próprio app.
 * - Ao ler um arquivo salvo escolhido como opção extra, conta na RAM e descarta na hora.
 */
@interface CLContarPalavras : NSObject

+ (BOOL)aplicativoAberto:(NSString *)nomeProcesso;
+ (NSArray<CLDocumentoAberto *> *)listarDocumentosAbertosMac;
+ (CLResultadoContagem *)contarPalavrasPagesAberto:(nullable NSString *)nomeAlvo;
+ (CLResultadoContagem *)contarPalavrasWordAberto:(nullable NSString *)nomeAlvo;
+ (CLResultadoContagem *)contarPalavrasArquivoDisco:(NSString *)caminho;

@end

NS_ASSUME_NONNULL_END
