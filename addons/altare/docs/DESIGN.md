# Altare: altar, tecido e superfície útil

Decisão de 30/10/2026. Versão diagnóstica 0.4.2. O usuário enviou referências ampliadas e confirmou sete blocos de frente com um bloco de altura. A falha dos cavaletes da 0.4.1 foi confirmada no Content Log; aprovação física da correção continua pendente.

## Leitura das referências

O ZIP contém duas fotografias do altar atual no Minecraft, não um mundo nem modelos 3D. Mostram uma mesa baixa, larga e retangular, de pedra cinza, coberta por carpete branco. A fotografia real de 330 × 87 px mostra tampo branco, moldura clara, frontal dourado/oliva, motivo cristológico vermelho central e medalhões laterais. A resolução não permite reconstruir com fidelidade os retratos ou bordados. O estudo usa ornamentação autoral inspirada nessa organização; não é uma reprodução documental da basílica.

Para a 0.2.1 foi fornecida a imagem ampliada `Frontal do altar com medalhão Chi-Rho.png` e uma vista da basílica. A primeira orienta os detalhes da lua, sol, esmalte e figuras; sua autenticidade documental não foi inferida. Ela deu origem a uma prancha de produção imagegen registrada em [fonte e prompt](../assets-src/guadalupe/SOURCE.md). As rosetas da primeira revisão permanecem apenas como papel legado.

Preferência expressa: **caimento convincente, dobras e bordas detalhadas, com estabilidade no multiplayer**. A primeira versão congela a forma do tecido; não simula vento, partículas com colisão ou uma malha física por tick.

## Contrato principal

O altar ocupa células de base `(x,y,z)`; o topo visual e o apoio terminam exatamente em `y + 1`. A toalha está integrada à geometria dessas células e nunca ocupa `(x,y+1,z)`. As configurações escrevem somente a identidade/estados das células da base. Caldeirinhas, cálices e outros objetos que já sejam blocos colocáveis podem ocupar as células superiores pelas regras normais de cada add-on.

Um item de inventário não ganha automaticamente forma colocável. Objetos menores que uma célula, vários vasos na mesma célula e posicionamento livre pertencem a um futuro sistema de acomodação por adaptadores explícitos, com snapshots exatos de ItemStack. Não usar item dropado como decoração persistente: ele pode desaparecer ou ser coletado. Não interceptar genericamente os itens de outros add-ons.

## Composição clássica

1. **Estrutura:** corpo de pedra com friso e base; colisão e seleção em cubo completo. O friso pertence à estrutura, não à toalha.
2. **Tampo:** pedra ou linho, com cota superior comum de 16 unidades. Substituir a tampa visível evita duas faces coplanares.
3. **Toalha:** trama, costura, queda segmentada e bainha em relevo; corta a silhueta por geometria. Apenas os lados expostos recebem queda. Os cantos usam acabamento próprio e as emendas internas não repetem saias.
4. **Frontal:** programa iconográfico independente, com fundo brocado, ornamentação lateral e motivo central. Larguras pares dividem o motivo em duas metades; larguras ímpares têm centro único. Não esticar a textura ou repetir o monograma em todos os módulos.

O detalhe de trama deve sobreviver à aproximação sem parecer ruído de pedra. A leitura de conjunto vem primeiro: linha branca contínua, ornamentação concentrada abaixo e estrutura clara. Na família clássica, materiais opacos uniformes evitam a combinação de transparências que já falhou no Aspergillum. A coleção 0.3.0 usa um perfil alpha-test uniforme por bloco para recortes de festões; renda fio a fio ainda exige outro diagnóstico.

Na 0.1.3, mármore, calcário e pedra escura possuem linguagens minerais próprias. A trama de linho tem contraste baixo e o bordado usa ramo dourado contínuo, costura e filetes. O frontal recebe folhagens, pequenas volutas e medalhões com borda dupla; o monograma permanece único e dominante. As texturas ornamentais passam a 256²; pedra e linho permanecem em 128². Normais/MER complementam a cor, sem simulação ou dependência visual exclusiva de PBR.

Na 0.2.1, o frontal tem composição semântica: lua e sol externos, quatro figuras em pares próximos ao centro e Chi-Rho único. Em sete blocos, trechos de arabescos preenchem os dois intervalos. Tamanhos 3/4 usam grupos compactos; 1/2 priorizam o centro; 5–16 preservam o programa completo e variam os intervalos. As molduras têm espessura em geometria; o relevo fino pertence aos materiais. Não prometer que os detalhes minúsculos da fotografia são uma malha esculpida individualmente.

As texturas figurativas são 256×256. O domínio físico permanece 128×84, portanto o mapeamento do PNG para o painel preserva os círculos. A altura total segue um bloco, com espaço de apoio acima; os intervalos se adaptam à largura sem esticar os símbolos.

Contrato de autoria: desenhar em eixos do mundo, converter para Bedrock uma única vez na geração e manter `edges`/`facing` com significado norte/leste/sul/oeste. Os UVs são medidos em 128 unidades lógicas, independentemente da resolução do PNG. Cada segmento mostra a bainha inteira; variar a altura física não pode recortar sua barra. A validação desta conversão e seus limites estão no [diagnóstico visual](VISUAL_POLISH_0.1.3.md).

## Nova coleção 0.3.0

As oito novas referências orientam uma biblioteca de formas e tecidos: pilastras nas extremidades, arcadas ogivais, mesa de madeira com pés e travessas, branco com Cordeiro, vermelho floral/IHS, branco-verde/IHS e preto com cruzes. A prancha de bordados e o prompt estão em [SOURCE.md](../assets-src/atelier/SOURCE.md). Nenhuma marca d'água integra os materiais.

Estrutura, material, tecido e aplique são escolhas independentes. Pilastras, arcos, travessas, pés e apliques possuem geometria própria; bordados finos usam texturas. Os festões cortam a silhueta por alpha-test binário sobre uma queda facetada. O sistema não transforma cada fio em cubo e não simula a toalha a cada tick.

Há 135 combinações, compiladas em receitas estáveis. A altura de cada tema reserva espaço para a estrutura e o aplique; o Cordeiro pode aparecer tanto na toalha quanto na placa se ambos forem escolhidos. Para uma composição mais simples, selecionar apenas um. O desenho ornamental central preserva escala em larguras pares/ímpares; a repetição ocupa os intervalos. A coleção clássica continua independente, incluindo Guadalupe.

A mesa da 0.4.2 tem dois cavaletes de extremidade: sapatas e cabeçotes contínuos na profundidade, montantes e escoras diagonais. Cada montante recebe a travessa longitudinal na mesma cota. Há um montante por célula de profundidade em cada extremidade; comprimentos maiores não geram apoios intermediários. A colisão multipartes conserva o vão central e contém as escoras com caixas conservadoras. O tampo permanece inteiro. Corpo sólido mantém colisão completa. O roteiro físico no Minecraft continua obrigatório.

Ver [contrato e orçamento da coleção](COLLECTION_0.3.0.md).

## Polimento e cor na 0.4.0

O tampo distingue pedra/madeira estrutural de linho fino. As quedas têm menor ondulação e uma leve abertura para baixo; os encontros nos cantos são faces inclinadas finas em vez de pequenos prismas quadrados. A barra costurada acompanha o mesmo contorno do festão, com cordão e direção de fios. Essas formas são estáticas.

A família Floral IHS permite oito cores na faixa pendente: branco, vermelho, verde, roxo, róseo, preto, dourado e prateado festivos. É compatível com as três estruturas e três materiais, sem aplique adicional; as demais famílias conservam suas combinações próprias. A máscara mantém o ouro, as flores claras e a identidade do motivo, incluindo centro par/ímpar. A cobertura superior permanece branca. Ouro/prata são apresentados como opções festivas, sem automatizar a disciplina litúrgica.

O fluxo dedicado na ferramenta reduz escolhas inválidas: selecionar **Floral IHS · cores litúrgicas**, estrutura, material, cor e frente. Não se oferece uma recoloração universal de imagens figurativas como Guadalupe. [Referência, orçamento e critérios](TEXTILES_0.4.0.md).

## Correção dos desenhos e encontros na 0.4.1

Os motivos da repetição agora são construídos por reflexão de trechos autorados, sem sobrepor desenhos distintos. Faixas e símbolos usam coordenadas independentes do festão, reservando tecido livre antes da bainha. A faixa verde fica reta; o medalhão conserva proporções. O rubi usa um intervalo que mantém as pétalas inteiras. As facetas caem verticalmente e compartilham extremos com os cantos, conservando a ondulação lateral. Fios prateados têm resposta própria, sem tornar o fundo preto metálico. [Inspeção e critérios](CLOTH_POLISH_0.4.1.md).

## Construção na 0.4.2

As pilastras distinguem sapata, fuste e capitel, com corpo recuado e junções internas contínuas. As ogivas têm molduras mais profundas, impostas nos ombros, fecho central e peitoril ligado à base. Os cavaletes deixam de ser quatro pés soltos e passam a conjuntos conectados. Tampo, quedas, bordados e apliques preservam suas coordenadas e texturas; a revisão não ocupa células acima do altar nem aumenta o teto de 50 cubos. [Diagnóstico e limites](STRUCTURES_0.4.2.md).

## Uso e flexibilidade

Colocar módulos lado a lado define o tamanho. Usar a ferramenta **Acabamento do altar** sobre qualquer módulo abre uma única configuração para toda a superfície conectada: primeiro estrutura, depois material, toalha e frontal. Clicar uma lateral define a frente; clicar o tampo conserva a orientação atual. Usar qualquer outro item preserva a colocação nativa.

O diagnóstico aceita retângulos de até 16 × 8 módulos, em qualquer orientação, no máximo 128 células. A altura do tampo é inteira para manter o apoio nativo. Altar de 1 × 1, 3 × 2, 4 × 2 e 7 × 3 usam o mesmo sistema. Não existem modelos gigantes escalados em runtime. Formas em L, curvas, altura fracionária e edição de vários níveis são etapas posteriores com contratos próprios; não prometer tamanhos infinitos.

## Critério de aceitação da primeira revisão

- Compor 3 × 2 e 4 × 2; obter borda contínua, sem quedas internas e sem monogramas duplicados.
- Colocar um bloco vanilla e a caldeirinha do Aspergillum sobre a toalha, sem quebrá-la.
- Mudar pedra, comprimento de queda e frontal preserva os blocos superiores.
- Dois jogadores não editam simultaneamente o mesmo conjunto; cancelamento, morte, distância, dimensão, quebra e timeout encerram a edição.
- Recarregar o mundo preserva os acabamentos; quebrar um módulo atualiza apenas as bordas locais. Nenhum vaso é capturado ou recriado pelo add-on.
- Tipos, regras, estrutura, pacote e documentação coerentes; Content Log real pendente até importação pelo usuário.

## Organização 0.5.0

Modelo, material, desenho, cor e relevo usam um catálogo de edição comum no jogo e no estúdio. As ogivas mantêm cotas independentes da queda. O [contrato de personalização](CUSTOMIZATION_0.5.0.md) substitui o antigo fluxo de telas separadas por coleção/paleta.
