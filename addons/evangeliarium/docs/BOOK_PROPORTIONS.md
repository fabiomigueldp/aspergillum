# Proporções e identidade dos livros

## Referências e limites

A revisão usa edições identificadas, não uma suposta dimensão universal de cada livro litúrgico:

- Evangeliário verde Paulus/CNBB, ISBN 9788515019564: 24 × 34 cm, 608 páginas. A ficha Loyola do mesmo ISBN informa 5,2 cm de espessura. [Paulus](https://loja.paulus.com.br/evangeliario-verde/p), [Loyola](https://www.livrarialoyola.com.br/produto/evangeliario-verde-edicao-luxo-180999).
- Missal Romano CNBB, tradução da 3ª edição típica, ISBN 9786559751730: 19 × 27,5 cm, 1264 páginas, capa dura, papel pólen natural 80 g. [Editora CNBB](https://www.edicoescnbb.com.br/missal-romano-traducao-da-3-edicao-tipica).
- Pontifical Romano Paulus, ISBN 9788534917339: 18 × 27 cm, 584 páginas. [Paulus](https://loja.paulus.com.br/pontifical-romano/p).

Foram inspecionadas as fotografias editoriais de capa dos três livros e do Missal aberto. Os metadados de espessura do Missal e do Pontifical encontrados no varejo são conflitantes; números de embalagem e sobrecapa também não equivalem à lombada do livro. Contagem de páginas ou gramatura isoladamente não determina espessura. Portanto, a espessura desses dois modelos é uma escolha visual autoral, não uma medição alegada.

Nenhuma fotografia, capa comercial ou texto litúrgico foi incorporado às texturas. O projeto conserva seus desenhos e cores autorais, sem afirmar reproduzir uma edição específica.

## Parâmetros adotados

Unidades do modelo Bedrock, 16 unidades por bloco. São proporções relativas, não uma conversão literal de centímetros para o mundo.

| Livro | Largura | Altura | Espessura entre capas | Critério |
| --- | ---: | ---: | ---: | --- |
| Evangeliário | 5,00 | 7,00 | 1,10 | Conserva a escala existente, próxima da proporção da referência medida. |
| Missal | 3,90 | 5,65 | 1,44 | Planta proporcional à edição CNBB; volume mais compacto e encorpado. |
| Pontifical | 3,70 | 5,55 | 0,96 | Planta proporcional à edição Paulus; volume mais estreito e menos espesso. |

Com a altura do Evangeliário normalizada para 7, as plantas documentadas resultam aproximadamente em 3,91 × 5,66 e 3,71 × 5,56. Os parâmetros foram arredondados discretamente. As espessuras do Missal e Pontifical são aproximações deliberadas e podem variar em outras edições.

## Construção e integração

O gerador mantém o desenho de capa, a hierarquia, os cuboides e o atlas; aplica escala proporcional X/Y ao layout e a seus pivôs. A espessura governa cadernos, capas e profundidades dos marcadores. O canal e as pontas continuam articulados, sem cobrir a superfície impressa.

A apresentação sobre apoio usa `thickness/2 + 0.08`; a centralização longitudinal usa `-height/2`. A compressão da lombada ocorre ao redor do pivô X efetivo, que também acompanha a largura. Não se reutiliza a constante antiga de um livro com planta diferente. A raiz vinculada, o grip e os nomes dos ossos permanecem preservados.

## Provas

- Comparação fechada/aberta em câmera e escala comuns, com renders nativos de 256, 128 e 64 pixels.
- Apoio de 2,4 × 1 × 0,5 blocos, régua de uma unidade de bloco, sem autoframing por livro: `source/render_proportions.py`.
- Verificação estrutural de faces, UVs, omissões e 153 poses de abertura; paridade entre geometria estática e animação.
- A prova de mão usa a composição do rig do projeto, não uma promessa de paridade com o cliente. As mãos foram aproximadas simetricamente e o livro reposicionado à frente das palmas nos dois volumes menores. A orientação da capa é preservada por compensação inversa. Os quatro casos wide/slim receberam inspeção frontal/lateral, com contato estilizado sem intervalo visível. A alternativa de apenas elevar o livro foi rejeitada porque ainda ocultava emblemas e cobria mais o rosto. Evangeliário e primeira pessoa não foram recalibrados nesta revisão.

As capturas Blender são diagnósticas. O teste no cliente Minecraft continua necessário para porte em primeira/terceira pessoa, skins wide/slim, colisão e interação reais, iluminação, mipmaps e culling em movimento.

## Caixa de seleção

A caixa fixa de 11 × 2 × 9 unidades excedia a planta dos livros abertos em aproximadamente 37% (Evangeliário), 114% (Missal) e 133% (Pontifical), considerando os bounds. Fechados, o excesso era ainda maior. O gerador agora calcula a caixa por livro e estado a partir de todos os vértices transformados, com margem de 0,15 unidade e arredondamento para fora. A base não desce abaixo do apoio. A transformação de direção do bloco gira a geometria e a caixa juntas, sem rotação duplicada. Testes verificam inclusão e margem nos quatro sentidos, aberto e fechado. Colisão permanece desativada; dados e IDs não mudam.

## Composição de mão reproduzível

`tools/export-hand-diagnostic.mjs` executa a composição de `tools/pose-viewer.mjs` com o adaptador Three.js do projeto, sem WebGL ou navegador. Exporta apenas grupos de faces visíveis, posições/triângulos/UV, referências de textura e configuração da pose, em unidades Bedrock (16 por bloco; Y para cima, frente -Z). `reports/hand-composition.json` e `hand-provenance.json` guardam bounds e hashes das fontes.

As poses de terceira pessoa dos livros menores aproximam os braços simetricamente, preservam a orientação da capa por rotação inversa e colocam o livro à frente das palmas. O candidato consolidado coincide vértice a vértice com a variante revisada nas quatro combinações de livro e skin (tolerância 1e-9). A pose do Evangeliário e todas as calibrações de primeira pessoa permanecem inalteradas. As condições Molang selecionam a pose específica pelo item, sem mudar o leitor ou o ciclo de persistência. Interseção de bounds é apenas um teste de regressão; a revisão frontal/lateral independente confirma o contato estilizado, não uma pega anatomicamente real nem equivalência ao motor Minecraft.
