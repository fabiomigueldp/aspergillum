# Colunata dourada — Altare 0.7.0

Revisão de 31/10/2026, inspirada na foto enviada pelo usuário: [referência preservada](../assets-src/atelier/references/colonnade-user-reference.png). Interpretação para escala Minecraft de um bloco de altura, com frente principal de sete blocos. Não é reconstrução documental do edifício.

## Corpo e tecido

O corpo tem plinto, campo recuado em mármore claro, dupla moldura dourada nos painéis, pequenas colunas com bases/capitéis dourados e tampo contínuo. As colunas de módulos vizinhos formam pares. Painéis e molduras repetem sua escala por módulo; a textura não é esticada sobre sete blocos. A profundidade do corpo recuado, fustes e capitéis é geométrica; a moldura fina usa cor/normal/MER.

O acabamento vestido acrescenta linho branco de 0,09 unidade sobre a laje e renda vazada com treliça, flores e pontas. Dois planos por lateral dão uma dobra suave; a mitra fecha os cantos. A fonte procedural em `assets-src/atelier/ornate.mjs` mantém o domínio periódico e considera a proporção física 16×4,5 para as flores. O alpha é binário em todos os recortes. A mudança de tecido não altera as peças estruturais.

O tampo termina em y=16 com ou sem renda. A colisão é sólida, apropriada ao corpo fechado. A geometria específica por contorno omite colunas/toalha nas faces internas. Na célula isolada vestida são 44 cubos; o catálogo inteiro continua limitado a 50.

## Personalização

Modelo **Colunata dourada**, mármore claro e ouro, com a opção **Toalha de renda**. Esse desenho de renda é branco; as oito cores continuam nos modelos compatíveis com Floral IHS. Escolhas de tecido, material e relevo anteriores ficam suspensas ao trocar para a colunata e voltam ao selecionar o modelo anterior. As quatro faces têm o mesmo programa, por isso a interface dispensa orientação e medalhão direcional neste modelo.

O codec `symmetric` persiste só `altare:edges`, default 15, em dois IDs novos: `altare:s_colonnade_bare` e `altare:s_colonnade_lace`. O domínio normaliza frente e papel para zero, e a reconciliação local continua válida após quebra/comandos. Nenhuma definição antiga de bloco, state/default, colisão, textura ou geometria é modificada.

O estúdio 1.7.0 inclui uma sétima miniatura do modelo real e a composição Colunata e renda. Cenas permanecem schema 1; o novo valor de tecido `lace` é normalizado conforme a família. O rascunho e o histórico guardam a escolha de renda separadamente do tecido dos outros modelos.

## Orçamentos

225 blocos, 224 acabamentos arquitetônicos, 560 geometrias, até 50 cubos; 70 conjuntos de materiais, 154 PNGs únicos, 34.484.224 bytes (32,887 MiB) de mapas antes de mipmaps. O limite local de mapas passa de 32 a 33 MiB para os três conjuntos novos: painel, douramento e renda. Os mapas anteriores permanecem idênticos.

A colunata acrescenta 32 combinações de estados. Altare: 55.760; com Aspergillum: 65.504. [Explicação e auditoria das variações](VARIATIONS.md). Esse orçamento técnico não se refere a crafts nem à quantidade de altares colocados. Não foi realizada migração de mundos ou troca automática de instalações.

## Evidência e reteste

`npm run package` valida tipos, 56 testes, estrutura e pacote oficial. `verify-ornate.mjs` compara todos os recursos anteriores com o pacote 0.6.1; `verify-world-compatibility.mjs` protege os 223 IDs publicados. A matriz `ornate` captura larguras 1/3/7/8/16 com e sem renda; `verify-captures.mjs` relaciona cada PNG ao arquivo final.

O arquivo final tem 11.136.690 bytes e 1.026 arquivos, SHA-256 `788a5272d49c7b2d58d30196256d53d4f9be71df4be6e4a9bbd39996bec8eccc`. Creator Tools: zero erros e zero avisos. A comparação protege 971 arquivos anteriores byte a byte; os 46 recursos novos são os dois blocos, 32 geometrias e 12 arquivos de mapas/conjuntos. Os nove arquivos globais restantes mudam conforme manifesto, idioma, índices e bundle.

[Relatório oficial](../dist/validation/0.7.0/release-summary.json) · [Capturas de inspeção](../out/ornate-0.7.0/index.html) · [Render em cenário](../../../out/altar-renders/colonnade-0.7.0/index.html). As 24 capturas verificadas contra o ZIP final incluem 20 sem PBR e quatro com PBR. O check da raiz passou com 107 testes do Aspergillum e 75 do viewer; a versão distribuída do Aspergillum continua 1.2.5.

Build do viewer, smoke do Workbench e smoke do estúdio compilado passaram. A UI foi exercitada com seleção da colunata, retirada/recolocação da renda, recuperação de escolhas anteriores, cenas, exportação e mobile.

No Minecraft, importar o pacote exato e testar 7×2, 8×2 e 1×1: selecionar Colunata dourada, aplicar/retirar renda, cancelar/restaurar, reabrir, quebrar/recompor uma ponta e trocar acabamento com vasos apoiados. A estrutura deve permanecer com a mesma altura; a renda deve ter vazados e cantos fechados. Repetir após reload e com dois jogadores. Esperado no Content Log: nenhum novo erro de registro, geometria, material, CustomForm ou rollback no caminho normal. Capturas externas não aprovam o comportamento no jogo.
