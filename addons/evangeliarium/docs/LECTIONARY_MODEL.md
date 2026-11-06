# Lecionário: modelo autoral e referências

## Pesquisa consultada em 5 de novembro de 2026

- [PAULUS, Palavra do Senhor I](https://loja.paulus.com.br/palavra-do-senhor-i-lecionario-dominical-abc/p): identidade editorial de um lecionário católico, distinto do Evangeliário.
- [Loyola, edição PAULUS](https://www.livrarialoyola.com.br/produto/palavra-do-senhor-i-lecionario-dominical-a-b-c-lecionario-dominical-a-b-c-179976): capa dura e proporção 18,5 × 26,5 cm. A espessura anunciada não foi tomada como medida confiável para o modelo.
- [Catholic Truth Society, Ambo Edition](https://www.ctsbooks.org/product/lectionary-ambo-edition/): 208 × 280 mm, couro acolchoado, gravação dourada, cortes dourados e fitas coloridas. Serve como referência de construção, não como arte copiada.
- [Michigan Church Supply, weekday chapel edition](https://www.michiganchurchsupply.com/collections/lectionaries/products/lectionary-weekday-mass-vol-ii-chapel-gf4522): encadernação verde e marcadores. Verde é uma escolha editorial existente, não uma cor universal ou obrigatória para lecionários.
- [CCCB, New Weekday Lectionary](https://www.cccb.ca/wp-content/uploads/2017/11/136-Liturgy-and-Creation.pdf): volumes costurados, impressão em duas cores, três fitas e capa dura com impressão dourada.

Nenhuma imagem, fonte tipográfica ou texto litúrgico dessas edições foi copiado. A arte de capa e as letras pixeladas são autorais. O padrão de linhas nas folhas é decorativo, não uma reprodução legível das leituras: o texto real pertence ao leitor do add-on.

## Design e integração

Capa verde escura, título `LECTIONARIUM / MISSAE`, cruz em relevo e livro aberto dourado. As ferragens, nervuras e guardas seguem a identidade dos livros existentes. Planta de 3,90 × 5,65 unidades, relação 0,690 (PAULUS: 0,698); espessura 1,18, menor que o Missal de 1,44. A escala estilizada não equivale a centímetros.

Três marcadores vermelhos, dourados e verdes ficam entre os cadernos. Só pontas curtas saem da borda inferior. A superfície de leitura é livre, com rubricas vermelhas, campo de texto escuro, margem e dobra interna. Não há abas de seções do Missal nem insígnias episcopais do Pontifical.

Osso vinculado, binding, origem de empunhadura e hierarquia são preservados. A planta é idêntica à do Missal, portanto a pose de terceira pessoa reaproveita seus ângulos com correção lateral de 0,0507 unidade para centralizar o livro sem as abas salientes do Missal; a primeira pessoa permanece compartilhada. Isso requer aceite nativo, especialmente em slim/Persona.

Abertura de 177°, lombada recolhida a 90°/escala 0,3, caudas articuladas a 18°. Não foi introduzida animação com autoridade sobre estado. O modelo possui 48 cuboides, 242 faces visíveis, 484 triângulos e um atlas 256² com color/MER/normal.

## Reprodução

1. `python assets-src/liturgical-books/source/build_assets.py --book lectionary`
2. `node assets-src/liturgical-books/source/validate.mjs`
3. `blender -b --python assets-src/liturgical-books/source/build_blender.py -- --book lectionary --views closed,open,top,low,mid`
4. `blender -b --python assets-src/liturgical-books/source/render_icons.py -- --book lectionary`
5. `python assets-src/liturgical-books/source/prepare_lectionary_delivery.py`
6. `blender -b --python assets-src/liturgical-books/source/validate_open_blender.py -- lectionary`
7. `blender -b --python assets-src/liturgical-books/source/audit_faces_blender.py -- lectionary`

Execute a partir de `addons/evangeliarium`. Fontes editáveis, atlas, blend com texturas empacotadas, cinco vistas, ícone e hashes ficam em `assets-src/liturgical-books/`. O ícone publicado fica em `assets-src/branding/lectionary-item-64.png`.

Validação: exportadores Python/JS idênticos, UVs e hierarquia válidos, marcadores abaixo das folhas; 51 poses acima do suporte, determinantes positivos e 9 raios de leitura atingindo papel antes de marcadores; 2.070 amostras de faces omitidas sem exposição indevida. Renders Blender são diagnósticos, não prova de paridade Bedrock. Importação do pacote final, observação FP/TP, abertura/fechamento, seleção e Content Log ainda devem ser testados no jogo.

Para a pose, `node tools/export-hand-diagnostic.mjs` exporta o rig canônico wide/slim dos quatro livros e verifica centralização, sobreposição dos volumes mãos/livro e capa à frente das palmas. Os PNGs do Lecionário estão em `renders/proportions/lectionary-hand-wide.png` e `lectionary-hand-slim.png`. Esses limites geométricos são guardas de regressão, não prova de contato exato ou aceitação no jogo.
