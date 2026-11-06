# Três livros — candidato 0.3.0

## Uso

O add-on reúne três objetos distintos: `evangeliarium:book`, `evangeliarium:missal` e `evangeliarium:pontifical`. `/function evangeliarium/dev_kit` fornece os três. O Evangeliário conserva os quatro Evangelhos da Bíblia Livre, o calendário brasileiro 2026–2027 e sua marca de passagem. O Missal e o Pontifical abrem índices próprios, organizados segundo os sites da comunidade.

O catálogo contém **253 seções do Missal e 107 do Pontifical**, com 1.540.545 caracteres e 2.120 páginas nesta configuração. A página sem texto do sitemap do Missal permanece na auditoria, mas não cria uma seção vazia no leitor.

Cada índice oferece grupos, listas de dez seções, busca por título ou palavras do texto e acesso às informações do exemplar. A consulta é privada. `Seções > Livro > Marcar página` fixa a seção e página no exemplar. `Abrir pelo índice` remove essa marca. Rubricas aparecem em vermelho; partes proclamadas conservam sua formatação separada mesmo quando compartilham um parágrafo. O título integral continua na legenda quando não cabe no cabeçalho.

Colocar, abrir, fechar e recolher usam as mesmas regras do Evangeliário. Cada livro tem item, bloco e entidade visual próprios. O tipo, nome, lore, propriedades e marca sobrevivem à transferência e recuperação. O porte bimanual e as condições que o suspendem são compartilhados, sem nova coreografia especulativa.

## Organização direta

- `assets-src/catalog/items.json`: os três tipos, seus identificadores e nomes. O runtime e o build leem o mesmo catálogo.
- `assets-src/liturgy/catalog.json`: textos organizados e fontes. O arquivo conserva metadados de auditoria; o bundle recebe somente campos usados pelo leitor.
- `src/domain/liturgy.ts`: busca e paginação, sem Minecraft API. Divide parágrafos/runs longos sem perder caracteres ou interromper pares UTF-16; reaplica cores e ênfase em cada página.
- `src/domain/state.ts`: seleção do Evangelho (`today`/`passage`) e dos novos livros (`index`/`section`). O tipo físico vem do catálogo e do snapshot, não de um segundo campo redundante no estado.
- `src/infrastructure/books.ts`: uma única implementação de transferência, recuperação e locks. Handles também identificam o tipo para invalidar callbacks após uma troca de livro.
- `src/presentation/reader.ts`: um leitor com guarda de sessão comum, páginas bíblicas e páginas litúrgicas. Não duplica o controle assíncrono.
- `assets-src/design.mjs`: modelo original preservado. `assets-src/books-design.mjs`: entrada dos novos modelos autorais e respectivos atlas.
- `tools/liturgy.mjs`: valida fontes, unicidade, concatenação dos runs e integridade após paginação; produz o módulo gerado e manifesto de contagens/hash.

Não há framework de plugins, dependência de rede no jogo, novos packs, novo sistema de persistência nem migração em massa. UUIDs e identificadores do Evangeliário continuam os mesmos; seus registros existentes seguem legíveis. Os novos IDs não são aliases do Evangelho.

## Texto e proveniência

Os textos dos novos livros vêm de `https://missalromano-mine.blogspot.com/` e `https://pontificalromano-mine.blogspot.com/`, para a comunidade que mantém esses materiais. A autorização de uso foi informada pelo usuário no pedido. Isso não é apresentado como licença aberta geral, homologação institucional ou autorização independente da CNBB.

Os rótulos longos do índice têm linhas próprias e rolagem; o layout dos menus originais do Evangelho permanece intacto. A sessão de leitura também é cancelada ao trocar dimensão.

O conteúdo não é completado por geração de texto. Divergências de links e organização são documentadas sem reescrever as palavras. A auditoria registra que o índice do Pontifical apontava a instituição de acólitos para leitores; o catálogo usa a página própria correta. Também conserva textos publicados idênticos das Orações Eucarísticas para crianças II/III e duas URLs do Prefácio Comum IX, sem fabricar correções. Créditos ficam acessíveis em cada livro, e a proveniência acompanha o catálogo de produção.

## Verificação e limites

O comando de entrega é `npm run package` dentro deste add-on. Ele recompila as três famílias, verifica TypeScript, executa os testes, valida estrutura, empacota e executa Microsoft Creator Tools offline. A aprovação de testes simulados não comprova input, animação ou JSON UI dentro do Bedrock.

A validação nativa desta versão permanece pendente. Testar os três itens, o índice e busca com rótulos longos, rubricas, uma seção extensa até a última página, marca, colocar/retirar, inventário cheio, reload, troca de item com tela aberta e coexistência dos três livros. Verificar primeira/terceira pessoa e Content Log usando exatamente o pacote 0.3.0.

As restrições de suporte e coexistência com resource packs que substituem `server_form` ou o controller de primeira pessoa permanecem as documentadas em `RUNTIME.md`. Não foi presumida compatibilidade automática com a superfície dos altares de outros add-ons.
