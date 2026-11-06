# Santa Teresa do Menino Jesus: formulário da memória

Candidato local 0.5.2 de 05/11/2026 sobre a base 0.5.1. [Verificação do pacote](VERIFICATION_0.5.2.md). Sem teste no Minecraft.

## Escopo

O índice do Missal acrescenta Santa Teresa do Menino Jesus em Próprio dos Santos, com data/grau, entrada, coleta, oferendas, comunhão e pós-comunhão. Teresa e Teresinha encontram a mesma seção. A nota biográfica do PDF não foi incluída.

Não se acrescentaram mapeamento diário, leituras, Evangelho, vínculo votivo, prefácio presumido ou regra de elegibilidade. A consulta não aplica celebração ao mundo. Datas, seleções, armazenamento e allowlist de votivas do Ordo permanecem como em 0.5.1. Dt 32,10–12 e Mt 18,3 são referências das antífonas, não leituras próprias.

## Fonte e conferência

Base: páginas 816–817 do PDF do acervo de referência (endereço privado omitido), SHA-256 `b1545bef689a246bf0c9c5e43f22e075eef7da18cf35df583a705f6cf31c8e9f`. Os metadados o descrevem como reconstrução digital integral. A ficha reproduz identificação da tradução brasileira de 2023; o arquivo não foi autenticado como matriz editorial da CNBB.

Duas conferências visuais restauraram a ordem dos blocos e corrigiram erros de extração: `é\S` para `as`, `peguenos` para `pequenos`, ponto e vírgula após `humildes` para vírgula. A reconstrução começa a coleta com `O Deus`; o suplemento adota `Ó Deus`, com emenda e fundamento explicitamente registrados.

Os cinco textos concordam integralmente, normalizadas as quebras de linha, com as páginas de 01/10/2026 da [Paróquia São Pedro e São Paulo, Fortaleza](https://www.tercodoshomensspsp.com.br/liturgia/Liturgia-Diaria/ld-01-outubro) e da [Paróquia Nossa Senhora Aparecida, Porecatu](https://nossasenhoraporecatu.com.br/liturgia-diaria?data=01-10-2026). A segunda acrescenta `Cf.` à referência da comunhão; mantido `Mt 18,3` do PDF e da outra paróquia. Identidades paroquiais corroboradas nos respectivos cadastros arquidiocesanos, cujas URLs constam do suplemento.

A [Diocese de Limoeiro do Norte](https://diocesedelimoeirodonorte.org/?liturgia_data=2026-10-01) também corrobora a coleta integral com `Ó Deus`.

Isso é corroboração textual pastoral brasileira, não revisão contra exemplar editorial autorizado. Os sites podem partilhar fornecedores; não se afirma independência das cadeias de transcrição. Não se atribui licença pública ao material. Leituras feriais exibidas nesses sites não foram importadas nem classificadas como próprias da memória.

## Preservação e reprodução

`assets-src/liturgy/catalog.json`, seu manifesto, auditoria e snapshot de 04/11/2026 permanecem byte a byte inalterados. O acréscimo fica em `assets-src/liturgy/supplements/santa-teresinha.json`, com hash da fonte, páginas, emenda, correções e URLs de corroboração. O compilador importa somente esse complemento explicitamente nomeado e registra seu hash no manifesto gerado; não usa a rede.

A seção é acrescentada ao final do catálogo compilado, preservando IDs, textos, ordem e paginação das seções anteriores. Arquivos gerados não são editados manualmente.

## Verificação

Testes específicos: hash histórico e preservação integral das seções, cinco partes, referências das antífonas, emenda registrada, atribuição, busca, paginação sem perda e ausência de novos mapeamentos.

Reteste nativo do pacote 0.5.2: Missal → Índice → Próprio dos Santos; buscar Teresinha; conferir cinco partes e fim da pós-comunhão. Marcas antigas e consulta de votivas devem permanecer intactas. Não executado no Minecraft.
