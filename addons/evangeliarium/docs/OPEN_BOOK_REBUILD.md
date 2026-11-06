# Encadernação aberta — revisão de 05/11/2026

## Defeito corrigido

Os três livros abriam somente a capa da frente. A lombada exterior conservava a espessura do volume fechado e permanecia erguida no centro, como um separador. As fitas compridas eram cuboides retos que ultrapassavam o corte sem caimento. No Evangeliário, o ressalto de papel do canal também avançava sobre a face impressa.

## Construção atual

- `spine` permanece neutro e conserva a hierarquia das capas. A geometria exterior fica em `binding_shell`, com pivô autoral proporcional à largura e espessura: `[0.05,0,0.37]` no Evangeliário, `[0.039,0,0.54]` no Missal e `[0.037,0,0.30]` no Pontifical após a revisão de proporções. Ao abrir, gira 90° em Y e sua espessura local X passa a 0,3, acomodando o couro sob o miolo. O volume fechado continua em escala 1. É uma aproximação articulada de encadernação flexível para cuboides Bedrock, não simulação de couro.
- Uma tira estreita de tecido escuro recuado constitui o canal central, sem faixa vermelha saturada. Cada lado do papel converge em três planos rasos sem texto repetido. Os blocos de texto, símbolos e acabamentos permanecem os mesmos. No Evangeliário, um tile `edgeTall` dentro do atlas 256² orienta as linhas do corte lateral ao longo da espessura, eliminando as faixas verticais largas; não aumenta resolução ou número de mapas.
- Todos os marcadores ficam entre folhas, sem atravessar a superfície impressa. Apenas pontas curtas, 0,12–0,24 unidade além da capa, aparecem no corte inferior. Cada ponta tem seu próprio bone `ribbon_tip_<cor>` e pivô na profundidade exata da folha marcada, com inclinação aberta de 18° em X. `ribbon_tips` é somente um grupo neutro. As cinco fitas do Missal seguem a mesma construção.
- Os 177° da capa, os ossos de apresentação/ação, o binding, o grip, UUIDs, IDs públicos e dados persistentes não mudam.

As quatro abas laterais do Missal têm espessura de 0,025 unidade e tecido ocre fosco, em vez de placas de latão. Sua posição e projeção lateral são preservadas.

## Caminhos equivalentes de renderização

A entidade usa geometria `animated` e a animação compartilhada de abertura. O bloco fallback usa geometria `open`. Os dois caminhos aplicam o mesmo pivô, rotação e compressão. Como o formato de bone de geometria não precisa carregar escala, o exportador estático aplica a escala X aos cuboides da lombada em torno do pivô antes da rotação. A animação aplica a escala ao bone. Fechar redefine explicitamente rotações e escala.

Os limites de visibilidade existentes não foram ampliados. O leitor e as regras de transferência/persistência não fazem parte desta alteração.

## Fontes e reprodução

- Evangeliário: `assets-src/design.mjs`. `liturgical-books/source/prepare_gospel.mjs` materializa um adaptador descartável para inspeção Blender, sem criar uma segunda fonte de runtime.
- Missal/Pontifical: `liturgical-books/source/build_assets.py`, respectivos JSONs autorais e adaptador `design.mjs`.
- Blender: `liturgical-books/source/build_blender.py`, com câmeras aberta, superior, baixa, intermediária e fechada. A vista intermediária isola a abertura com apresentação fixa sobre a mesa.
- `tools/build.mjs`: gera as três famílias e as animações compartilhadas.

Sequência: gerar assets Python; preparar Gospel; construir add-on; executar Blender com `--book evangeliarium|missal|pontifical --views open,low,top,mid,closed`; validar/exportar as cenas pelo fluxo documentado. `--draft` serve apenas para iteração, não evidência final.

## Limites e aceitação nativa

As verificações incluem raios sobre cada marcador em três posições longitudinais: o primeiro objeto atingido deve ser papel, nunca fita. A junção de cada ponta acompanha a própria profundidade em toda a animação. Blender valida construção, UVs, normais, materiais e apresentação diagnóstica; não comprova paridade visual ou funcionamento no Minecraft. No pacote exato: abrir/fechar repetidamente os três tipos, observar transição de frente/lado/trás, conferir ausência de parede central e faces vazadas, queda das fitas, apoio na superfície, quatro orientações, culling ao mover câmera, porte em mãos fechado e Content Log. A abertura continua estilizada e articulada; não há curvatura contínua de páginas ou física de tecido.

### Gospel inventory icon fallback
The final Gospel inventory icon is regenerated from the packed Blender scene via `source/render_icons.py --book evangeliarium`, at 256 px and downsampled with Lanczos to 64 px. It retains the official near-frontal viewing direction, transparent background and recognizable cross; Blender PBR lighting is not identical to the former browser capture. Provenance is recorded in `branding/gospel-icon-blender-manifest.json`. The official Chromium pipeline was blocked by a socket restriction and was not bypassed. Historical `branding/render-manifest.json` describes the earlier browser captures, not the replaced icon.

### Auditoria de faces, capas e cortes
A revisão sistemática identificou 42 pares de faces coincidentes no Evangeliário, nas cantoneiras de ambas as capas, no cruzamento da cruz e nas quatro nervuras da lombada. As cantoneiras agora se encontram sem sobreposição, o braço da cruz é dividido ao redor da haste e as nervuras terminam na superfície lateral da lombada. A silhueta externa é preservada. Missal/Pontifical não apresentaram esse problema.

O grão normal do couro foi reduzido dez vezes, e o ouro recebeu normal lisa e rugosidade 110/255, eliminando o aspecto listrado e cintilante excessivo sem apagar os desenhos ou mudar a paleta. O Evangeliário passa a 39 cuboides, 234 quadriláteros e 468 triângulos.

A auditoria de faces omitidas cobre 4.185 amostras em cinco poses dos modelos que as utilizam; todas permanecem cobertas por outra peça, incluindo amostras a 0,1% das quinas. A amostragem de perímetro detectou tiras expostas nas faces traseiras das oito nervuras do Missal/Pontifical; essas faces foram restauradas, com custo de quatro quadriláteros por livro. O pequeno vão estilizado entre as duas metades do papel fechado permanece: sua projeção é inferior a um pixel a 128 px na câmera lateral de inspeção, e não houve evidência de benefício em alterar páginas e pivôs.

A vista inferior revelou a lombada exterior sobreposta à capa nos dois livros mais finos. O pivô da lombada agora acompanha a espessura de cada volume, recolhendo-a sem atravessar o plano de apoio. A geometria fechada, o grip, os bounds e os demais pivôs permanecem iguais; a alteração afeta somente a trajetória da lombada na abertura. Protótipos foram testados em 51 poses por livro antes de adotar a correção.
