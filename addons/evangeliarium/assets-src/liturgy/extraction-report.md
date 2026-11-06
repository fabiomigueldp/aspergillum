# Extração e organização dos textos litúrgicos

Snapshot de 4 de novembro de 2026. Respostas das páginas coletadas entre 2026-11-04T19:56:43.769890+00:00 e 2026-11-04T20:03:34.228791+00:00.

## Resultado

- 361 páginas públicas arquivadas: 254 do Missal Romano e 107 do Pontifical Romano.
- 360 seções textuais prontas para o addon: 253 do Missal e 107 do Pontifical.
- 16.779 blocos ordenados; 1,540,545 caracteres de texto nos blocos (1,573,383 com separadores de parágrafo).
- 13.058 segmentos originalmente em vermelho, conservados como rubricas. 288 seções têm parágrafos com mistura de rubrica e texto proclamado.
- 361/361 hashes SHA-256 das respostas conferidos. Retenção textual verificada em todas as páginas, desconsiderando apenas espaços de HTML.
- Todos os runs concatenam exatamente ao texto de seus blocos. O catálogo conserva exatamente o texto de cada bloco do corpus.
- 9/9 testes unitários e de integração do corpus passaram.
- Nenhum erro de coleta e nenhum link interno de conteúdo sem destino coletado nos dois domínios.

## Arquivo de integração

`catalog.json`, 4,988,497 bytes.

SHA-256: `70537564ae8a772b5945e1cc1344c6bf84735e8f5ea0a2ea7eccfd4c18c32167`.

Contrato: `books.missal` e `books.pontifical`, cada livro com título e seções; cada seção contém ID estável `livro--slug`, título, grupo, `sourceId`, `sourceUrl` e blocos. Blocos contêm tipo, texto e runs de formatação. O leitor deve usar os runs para preservar rubricas parciais; um bloco é tipado `rubric` somente quando todos os runs são rubricas.

Metadados adicionais são úteis para auditoria e podem ser omitidos da projeção TypeScript usada dentro do jogo. O catálogo original deve ser conservado. Maior título: 72 caracteres; maior nome de grupo: 30 caracteres; maior bloco: 4.329 caracteres. A paginação deve dividir blocos longos, sem truncar ou perder o estilo de continuação.

## Inconsistências preservadas e sinalizadas

1. O índice inicial do Pontifical rotula “Instituição de Vários Acólitos”, mas aponta para a página de Leitores. A página verdadeira de Acólitos foi encontrada no sitemap e incluída no grupo de instituições. A navegação original foi preservada em `sourceNavigation` no catálogo.
   - [Índice original](https://pontificalromano-mine.blogspot.com/)
   - [Página correta de Acólitos](https://pontificalromano-mine.blogspot.com/p/instituicao-de-varios-acolitos.html)
2. As páginas intituladas Oração Eucarística para missas com crianças II e III possuem corpos textuais idênticos na fonte. Ambas foram conservadas com seus títulos e URLs publicados; nenhuma oração substituta foi inventada.
   - [II](https://missalromano-mine.blogspot.com/p/oracao-eucaristica-para-missas-com_29.html)
   - [III](https://missalromano-mine.blogspot.com/p/oracao-eucaristica-para-missas-com_38.html)
3. Duas URLs de Prefácio Comum IX têm texto e título iguais. Foram mantidas por procedência, não deduplicadas silenciosamente.
   - [Primeira URL](https://missalromano-mine.blogspot.com/p/prefacio-comum-ix.html)
   - [Segunda URL](https://missalromano-mine.blogspot.com/p/prefacio-comum-ix_28.html)
4. [Uma página do Missal](https://missalromano-mine.blogspot.com/p/blog-page.html) contém apenas imagem e nenhum texto no corpo HTML. Ela permanece na auditoria, mas foi excluída do leitor textual com o motivo registrado em `coverage.excludedNonTextDocuments`. Nenhum texto litúrgico foi descartado.

## Limites e autorização

O solicitante declarou autorização para o addon da comunidade. Não foi afirmada uma licença pública específica, nem uma edição litúrgica oficial. A cobertura abrange os sitemaps públicos e os links internos de conteúdo encontrados nos dois sites na coleta, sem presumir acesso a textos não publicados ou a outros sites. Imagens externas foram apenas referenciadas, não incorporadas ao addon.

Os testes aqui verificam extração, estrutura, integridade e procedência. A execução dentro do Minecraft e a navegação visual são verificações separadas da integração do addon.

Este relatório registra a coleta original. O repositório conserva o catálogo completo, o manifesto, os resultados e as ferramentas de extração; os caches brutos e intermediários daquela coleta não são versionados. Uma nova coleta depende das páginas disponíveis no momento e deve ser revisada antes de substituir o snapshot.
