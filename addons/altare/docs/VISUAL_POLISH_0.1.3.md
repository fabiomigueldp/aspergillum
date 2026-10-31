# Polimento visual 0.1.3

Data: 30/10/2026. Revisão diagnóstica isolada. A evidência offline sustenta a correção proposta; aceitação no Minecraft continua aberta.

## Evidência recebida

O usuário enviou oito imagens: `f2636a5d`, `695f9058`, `117ce16c`, `aa7ad2d5`, `a6dac6d8`, `21c976ad`, `b1cee80e` e `f1735266` (prefixos dos arquivos `codex-clipboard` anexados ao chat). As imagens 4–6 mostram pedra exposta até o tampo em uma extremidade, apesar de haver queda na face longitudinal. As imagens 7–8 mostram a mesma família de falhas em um contorno alterado. O retângulo preto sob a mira é seleção do bloco e não foi tratado como fissura do tecido.

Também são visíveis veios regulares repetidos, trama quadriculada e uma barra dourada com interrupções. O pedido foi continuar o polimento. A preferência anterior permanece: caimento convincente com estabilidade multiplayer, atendido por dobras estáticas autoradas. Não foi solicitado um solver físico novo.

## Conversão de coordenadas

A regra de vizinhos já usa norte `(0,-1)`, leste `(1,0)`, sul `(0,1)` e oeste `(-1,0)` no plano XZ. O gerador anterior escrevia as mesmas coordenadas no JSON de geometria. O codec Bedrock do Blockbench importa o cubo com `from.x = -(origin.x + size.x)`, inverte X do pivô e X/Y da rotação. Portanto uma queda escrita em X positivo ficava do lado oposto ao bit de borda que a habilitava.

Fonte primária reproduzível: [Blockbench, commit 47e633e, parseCube e compileCube](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/formats/bedrock/bedrock.js#L650). O clone local foi consultado como evidência do codec, não incorporado ao produto. A Microsoft usa esse editor no fluxo oficial de [geometrias de blocos](https://learn.microsoft.com/en-us/minecraft/creator/documents/advancedcustomblocks?view=minecraft-bedrock-stable); essa página não documenta todos os sinais da conversão e não é usada como prova isolada deles.

O renderer compartilhado de attachables mantém posições autoradas e compõe sua própria base de apresentação. Reutilizá-lo diretamente para blocos escondia a divergência. A ponte local `tools/block-preview-basis.mjs` importa os cubos no espaço de blocos antes da renderização. Aplicada aos assets da 0.1.2, ela reproduziu o desaparecimento da queda lateral observado nas imagens. Esse é um diagnóstico consistente com as capturas, não execução do motor Bedrock.

A 0.1.3 conserva a autoria em eixos do mundo e serializa a conversão uma única vez ao gerar os modelos. `edges`, `facing`, UUIDs, namespace e identificadores mantêm os mesmos significados. Não se altera o renderer do Aspergillum, não se trocam bits persistidos e não se acrescenta compensação de pose. A regressão verifica centros das faces/cantos depois da importação independente e avalia todas as 16 máscaras.

Conferência direta nos dois `.mcaddon`: o primeiro segmento de `cloth_1` (leste) importava em X = **−8,27** na 0.1.2 e agora importa em X = **+8,27**. `out/orientation-regression.json` registra esses valores, a igualdade byte a byte do bundle de gameplay e a igualdade dos estados públicos entre os dois arquivos.

## Bainha e materiais

O V final de cada segmento variava conforme sua altura arredondada. Em segmentos curtos, isso cortava as últimas linhas da barra. Agora todos os segmentos leem a faixa completa (28 unidades UV na curta, 86 na longa); a geometria conserva o caimento e sua cota superior.

- Mármore: manchas minerais e veios suaves irregulares em ruído periódico. Calcário: grão e poros discretos. Pedra escura: grão próprio, sem reutilizar os veios de mármore.
- Linho: microtrama de baixo contraste, sem o antigo quadriculado dominante. Queda mantém seis segmentos, costura clara e barra inteira.
- Bordado: ramo dourado contínuo, folhas pequenas e ourelas. Frontal: folhagens com nervuras, volutas, filetes pontilhados, moldura dupla e medalhões mais definidos. O monograma cristológico conserva o centro único par/ímpar.
- O ornamento é autoral. Não se inventam retratos supostamente fiéis a partir da fotografia de 330 × 87 px.

Pedras/linho permanecem em 128²; quatro bainhas e cinco frontais passam a 256². São 13 conjuntos color/normal/MER, 39 PNGs opacos, **7.864.320 bytes (7,5 MiB)** RGBA decodificados, excluindo mipmaps e ícones. O build amostra a superfície uma vez por pixel e deriva normais com escala física consistente. O custo geométrico continua em 47 cubos por variante e o catálogo em 5.760 combinações de estados. Medição de FPS/GPU em dispositivos reais ainda é necessária; orçamento de bytes não comprova desempenho.

## Comparação reproduzível

A baseline está preservada em `out/baseline-0.1.2/`: fontes, imagens do capturador antigo e 16 novas imagens da 0.1.2 com a ponte de blocos. As comparações válidas de antes/depois usam **block-basis**, com direção, enquadramento, resolução 1600 × 1000, luz e materiais de diagnóstico iguais. As capturas antigas sem a ponte só documentam a limitação descoberta.

```powershell
# Executado com os packs 0.1.2 antes da geração da 0.1.3:
npm run capture -- --output out/baseline-0.1.2/block-basis --views front,oblique --presets guadalupe-5x2,guadalupe-4x2,linen-3x2,bare-1x1
# Pacote atual:
npm run capture -- --output out/captures-0.1.3
npm run capture -- --matrix orientations --profiles classic --views front,oblique --output out/orientations-0.1.3
node tools/verify-captures.mjs out/captures-0.1.3 out/orientations-0.1.3
```

`classic` é um material de diagnóstico com mapa de cor e sem normal/MER, não uma implementação do shader clássico do Minecraft. A visibilidade Molang é aproximada em JavaScript nas capturas. Esses limites constam no manifest. Não foram simulados interação, suporte, carregamento de chunks ou multiplayer.

Inspeção: as vistas novas mostram bainha inteira nas extremidades, barra de folhagens contínua e centro par unido nas quatro orientações; linho longo também foi conferido de frente/costas. O [QA físico](TESTING.md) exige repetir essas vistas no pacote importado, conservar os objetos apoiados e obter Content Log sem novos erros antes de aprovar a correção.
