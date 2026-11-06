# Interface do leitor

Fontes: `assets-src/ui/design.mjs` e `contract.json`. `tools/build-ui.mjs` gera JSON UI e cinco pequenas texturas nine-slice. Nenhum PNG distribuído é editado à mão.

## Composição

- Uma coluna, alinhada à esquerda. A largura máxima da leitura é 400 unidades de UI; menus e formulários têm 330. A largura disponível continua limitada a 92% da viewport, e a altura a 90%.
- Título fixo, margens laterais de 25 unidades, filete discreto e corpo com entrelinha. O texto é nativo, não uma imagem. As cores de fundo são opacas para manter a leitura sobre qualquer cenário.
- A passagem conserva palavras, acentos e versículos inteiros. A paginação limita a quantidade de conteúdo; a rolagem cobre variações de viewport e texto. O fim de uma página não avança silenciosamente para outro capítulo.
- O rodapé da leitura reserva três posições iguais. Anterior e Próxima desaparecem quando não têm destino; Leituras permanece ao centro. Nenhum botão altera a largura da coluna de texto.
- Menus não repetem instruções como “escolha uma opção”. Livro reúne marca, modo diário, fechamento físico, retirada e créditos. Campos inválidos mantêm o conteúdo digitado e acrescentam somente o erro útil.
- Descrições vazias não ocupam uma linha no menu. A leitura tem até 340 unidades de altura; formulários, 230, para acomodar capítulo, versículos e envio. Em janelas menores, a rolagem mantém os controles alcançáveis.
- Os créditos usam o mesmo conjunto de glifos das outras telas. Símbolos que acionavam uma fonte substituta pequena no cliente foram simplificados sem remover autores, ano, licença ou fontes. Referência e texto bíblico permanecem intactos.

## Integração e limites

O servidor usa `ActionFormData` e `ModalFormData` estáveis. Os títulos levam marcadores de formatação privados, removidos do título visível. O ponto compartilhado `server_form.main_screen_content` encaminha formulários do livro para a apresentação própria e mantém controles vanilla para os demais.

Isso é uma alteração de JSON UI, com risco de disputa de prioridade se outro resource pack substituir o mesmo ponto de entrada. Não equivale a uma extensão cooperativa universal. Não são modificados HUD, inventário ou arquivos de fontes globais. A aparência e o foco devem ser conferidos no cliente final; o validador de packs não prova esses comportamentos.

`/scriptevent evangeliarium:inspect ui-native` abre uma ActionFormData sem os marcadores e, pela primeira opção, uma ModalFormData nativa. Serve para verificar a rota comum sem criar ou alterar itens e blocos. Fechar o chat antes de o formulário aparecer.

## Evidência exigida

Conferir leitura curta e longa, primeira/última página, retorno de busca, referência inválida, seleção de capítulo, data, créditos e formulários sem marcador. Repetir numa janela menor. Registrar o pacote, as capturas reais e o Content Log completo após encerrar o cliente.

A 0.2.0 revelou no jogo uma janela vanilla sobre a página do livro e um rodapé fora da moldura, embora o Content Log não tivesse erros. Essas capturas são exemplos de por que checks estruturais não bastam.

Referências primárias: [elementos JSON UI](https://github.com/MicrosoftDocs/minecraft-creator/blob/main/creator/Reference/Content/JsonUiReference/Examples/JsonUiComponents/ui_element.md), [catálogo de assets e overrides](https://learn.microsoft.com/en-us/minecraft/creator/documents/overwritingassets?view=minecraft-bedrock-stable), [formulários vanilla](https://github.com/Mojang/bedrock-samples/blob/7844835b6baad4c0010f46901a4accf87413a022/resource_pack/ui/server_form.json) e [compatibilidade entre add-ons](https://learn.microsoft.com/en-us/minecraft/creator/documents/practices/guidelinesforbuildingcooperativeaddons?view=minecraft-bedrock-stable).

## Seleção diária 0.4.1

Hoje identifica a celebração nacional e oferece somente formulários disponíveis; Data conserva rascunhos inválidos. Índice e busca continuam secundários. Consulta não grava a seleção; Livro concentra Marcar página, Seguir hoje e Abrir pelo índice. O Pontifical não ganha falsa seleção por data. Ausências no Missal e escolhas de Missa são explícitas. Rótulos de instrução redundantes foram retirados das listas e os exemplos de busca correspondem a cada livro.

## Correção de encaminhamento 0.5.3

A inclusão de `catalogPrefix` havia introduzido condições com três operadores no mesmo nível na rota nativa/modal. A revisão gera uma expressão binária parentetizada a partir da lista de marcadores, deriva sua negação para a rota nativa e inicia cada ramo oculto até receber o título. Também parentetiza cada remoção de marcador do título. Os testes percorrem os três marcadores, títulos sem marcador e mudanças sucessivas de formulário, exigindo uma única rota visível. São testes da definição, não um emulador de Bedrock.

Índices com rótulos curtos reutilizam as linhas de 32 unidades do menu. Catálogos que precisam de quebra de linha usam linhas de 44 unidades, com 30 reservadas ao texto. Grupos de uma seção abrem diretamente a leitura; buscas preservam a lista e a consulta. O retorno do grupo direto volta ao índice de origem.

As capturas do usuário de 06/11 demonstram a sobreposição na versão anterior. Não extrapolar a aceitação nativa da 0.2.5 para as mudanças posteriores: o pacote 0.5.3 precisa ser observado no jogo.
