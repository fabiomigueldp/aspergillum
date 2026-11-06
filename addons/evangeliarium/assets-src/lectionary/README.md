# Lecionário e formulários do Evangeliário

## Fonte preservada e reprodução

`source.zip` é a cópia byte a byte do arquivo entregue pelo usuário, `liturgia-brasileira-offline.zip` (SHA-256 `9ab62a75f5abe16fc6ddd1359f59e42eac96ea07b641c224e9bc8bf85c4a3618`). O arquivo original continua preservado. Sua edição declarada é `BR-CNBB-2026.11-r2`.

Execute `python3 tools/import_lectionary.py` na raiz deste add-on para reproduzir `catalog.json` e `provenance.json`. O importador é independente: lê ZIP, gzip e JSON, mas nunca importa, avalia ou executa os arquivos Python/JavaScript do pacote. O compilador `tools/lectionary.mjs` valida as seções e a preservação do texto na paginação e gera `src/generated/lectionary.ts`.

`provenance.json` guarda o inventário dos 15 arquivos com tamanho e hash, cada chave original, testemunhos, referências, complementos e seções de origem. Todos os quatro hashes das regras e os 756 hashes dos formulários foram conferidos. Isso verifica consistência interna, não autenticação independente da origem ou aprovação eclesiástica.

## Cobertura

- 766 chaves litúrgicas e 756 formulários deduplicados na fonte; um formulário vazio é preenchido por complementos específicos.
- 766 seções navegáveis em cada livro, com IDs estáveis derivados da chave. Seções de Missas múltiplas e alternativas são preservadas.
- 798 blocos de Evangelho e 24 alternativas de Evangelho nos formulários-base, além de oito Evangelhos em complementos. Chaves compartilhadas podem repetir o mesmo texto no índice.
- Próprio nacional com 53 chaves; Advento, Natal, Quaresma, Semana Santa, Tempo Pascal, Tempo Comum, ciclos dominicais A/B/C e feriais I/II.
- O acervo não é uma Bíblia completa nem um diretório diocesano; não supre automaticamente próprios locais, patronos, celebrações rituais ou toda memória facultativa.

## Calendário e associação automática

O código recebido nunca é executado. Desde 0.4.1, um calendário próprio revisado em 2026–2035, com projeções pelas normas atuais para 1583–9999, resolve as chaves originais pela proveniência. `days` permanece vazio no catálogo importado: regras e associação diária são uma camada separada e testada, não um resultado presumido do ZIP.

Veja `../../docs/DAILY_SELECTION_0.4.1.md` para cobertura, precedência, avisos, limites locais e fontes de auditoria. Correção do registro anterior: 29/11/2026 inicia o Ano B (A→B), e 28/11/2027 inicia o Ano C (B→C). As projeções declaradas pela fonte para 0001–9999 não são adotadas como calendário validado; a implementação independente usa 1583–9999 e distingue projeção de revisão específica da década.

## Complementos e direitos

Oito chaves dependem de complemento editorial: `comum/13/0/A`, `comum/20/0/A`, `comum/20/0/B`, `comum/31/0/A`, `comum/7/0/B`, `comum/8/0/B`, `comum/9/0/A` e `jan/7`. Sete usam textos da Paróquia Santíssima Trindade de Florianópolis e aclamações do hinário de Chapecó. O complemento de 7 de janeiro reúne textos atribuídos às Edições CNBB a partir de outras datas. Os avisos de complemento permanecem nas seções; a proveniência detalhada permanece neste acervo técnico, sem rotular todo o conteúdo como uma tradução homogênea.

O LEIA-ME da fonte declara direitos dos respectivos titulares. O ZIP não contém licença aberta nem autorização de redistribuição independente. A entrega do usuário permite trabalhar com o material solicitado; não comprova direitos para publicação pública irrestrita.

## Testes

`tests/lectionary-import.node.ts` verifica cobertura, IDs, ausência de datas presumidas, os oito avisos, preservação literal de todos os textos, filtro exclusivo de Evangelhos e suas alternativas e a montagem das Missas de 24 de dezembro. A compilação verifica toda a paginação. O teste dentro do Minecraft ainda é necessário para desempenho, formulários longos, persistência de marcas e comportamento visual real.
