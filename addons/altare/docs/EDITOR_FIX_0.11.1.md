# Editor nativo — Altare 0.11.1

## Falha reproduzida

A captura enviada em 31/10/2026 mostra `[Altare] InvalidObservableError: Expect 'dropdown value' observable to be client writable.` ao usar **Acabamento do altar**, seguida da mensagem de operação não concluída. A captura não identifica a versão importada.

`presentation/menu.ts` compartilhava `new ObservableNumber(0)` entre três listas de valor fixo: nogueira da marcenaria, mármore da Colunata e ausência de aplique quando indisponível. O runtime valida o binding ao construir cada dropdown, inclusive controles desabilitados ou ocultos. A construção falhava antes de `show()` e antes de retornar um acabamento para o commit.

## Correção e contrato

O observável dessas listas recebe `{clientWritable:true}`. Os controles continuam desabilitados, com uma única opção e sem callback que altere o rascunho. Os observáveis de visibilidade permanecem controlados pelo servidor. **Aplicar**, **Cancelar**, **Restaurar escolhas**, revalidação, locks, timeout e rollback conservam sua semântica.

Os tipos instalados de `@minecraft/server-ui` 2.1.0 admitem `ObservableOptions` no construtor. A [referência de ObservableOptions](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/observableoptions?view=minecraft-bedrock-stable) define a escrita pelo cliente; o [exemplo oficial DDUI](https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/intro-to-ddui?view=minecraft-bedrock-stable) usa essa opção nos valores de entrada. A exigência também para listas desabilitadas é confirmada pela falha observada, não uma dispensa inferida a partir de `disabled`.

BP/RP passam a `[0,11,1]`, preservando UUIDs, IDs, estados, colisões, geometrias e texturas da árvore 0.11.0. O Aspergillum permanece 1.2.5 e o Estúdio permanece 2.2.0. A revisão continua diagnóstica; os limites de geometria e gates físicos de [Ogivas 0.11.0](OGIVE_REBUILD_0.11.0.md) permanecem aplicáveis.

## Evidência automatizada

O adaptador de teste agora respeita `clientWritable` e rejeita bindings de entrada somente de leitura, independentemente de `disabled`/`visible`. O novo teste falhou antes da correção com o mesmo nome e mensagem da captura e passou após ela. Também verifica que os valores fixos não autorizam mudanças no acabamento; os testes existentes preservam aplicação, restauração, cancelamento, seleções inválidas e liberação da sessão.

Tipos e 102 testes do Altare passaram. O `npm run check` da raiz também passou: 107 testes do Aspergillum, 83 das ferramentas, documentação, build e validadores. A comparação dos packs gerados preserva 4.773 de 4.780 arquivos byte a byte; somente script, dois manifests e quatro arquivos de tradução com a versão mudam.

```powershell
node --experimental-strip-types --test tests/menu.node.ts
npm run package
```

Artefato: [Altare-0.11.1.mcaddon](../dist/releases/Altare-0.11.1.mcaddon). Hash: [SHA-256](../dist/releases/Altare-0.11.1.mcaddon.sha256). Resultado oficial: [release-summary.json](../dist/validation/0.11.1/release-summary.json). A validação offline não executa a UI do Minecraft; avisos geométricos já aceitos continuam discriminados no relatório.

Empacotamento aprovado: **19.579.387 bytes**, SHA-256 `77304f21e17092a91921a82e46b5185be9dcc287a19611217d73465368481d7f`. Creator Tools: zero erros, zero avisos inesperados e 2.084 avisos de complexidade geométrica enquadrados na política diagnóstica existente. A [auditoria do arquivo final](../out/editor-fix-audit-0.11.1.json) confirma que as 4.780 entradas correspondem aos packs gerados; desfazer em memória somente o flag corrigido reproduz o hash do script anterior. Manifests e traduções diferem somente na versão.

## Reteste mínimo no Minecraft — pendente

1. Fechar o jogo e importar apenas a revisão Altare 0.11.1 em uma cópia do mundo, com BP/RP `[0,11,1]`, sem outra revisão ativa. Limpar o Content Log.
2. Usar **Acabamento do altar** no altar da reprodução. A tela deve abrir sem `InvalidObservableError` ou mensagem de operação não concluída.
3. Alternar Clássico, Pilastras, Ogivas, Cavaletes, Arca, Balaústres e Colunata. Nogueira/mármore fixos continuam desabilitados; Floral IHS em cor incompatível mostra o aplique indisponível sem fechar a tela.
4. Alterar uma escolha e cancelar: nada muda. Reabrir, alterar e restaurar: volta a configuração aberta. Aplicar uma escolha, reabrir e salvar/recarregar o mundo: o acabamento persiste. Objetos sobre o tampo conservam sua posição.
5. Fechar e reabrir algumas vezes; com dois jogadores, somente um edita o conjunto. Expiração/quebra libera a sessão sem aplicar rascunho. Content Log sem novos erros do Altare, em especial `InvalidObservableError`.

Registrar versão/hash e Content Log do arquivo importado antes de declarar o reteste aprovado.
