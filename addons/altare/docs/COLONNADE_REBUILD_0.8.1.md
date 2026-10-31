# Colunata — reconstrução 0.8.1

Revisão de 31/10/2026 sobre a 0.7.1. O alvo principal continua sendo 7 × 2 módulos com um bloco de altura. A mudança reconstrói o mobiliário e conserva os dois acabamentos publicados, com e sem renda.

## Construção

Os campos dos painéis foram recuados para ±6,9 unidades. As molduras são quatro membros de pedra com filetes de ouro separados, projetados até 7,57 unidades. A antiga moldura pintada foi removida da superfície do painel. Relevo e sombra passam a existir também sem PBR.

Cada fuste tem seção hexagonal real, composta por três prismas com somente as duas faces opostas visíveis, de y=2,35 a 11,85. As extremidades ficam cobertas pela base e pelo capitel. Caneluras menores continuam nos mapas de superfície. Bases têm pedestal de pedra e colar dourado; capitéis têm colo e ábaco. Nos cantos, cada par de fustes compartilha os apoios e recebe um montante de fechamento atrás deles.

O rodapé tem três cursos. A arquitrave tem dois níveis e retornos que se encontram sem sobreposição nas quinas. A gola inferior e a laje superior do tampo têm projeções distintas. Essas peças conservam suas cotas com e sem renda. As junções internas atingem a fronteira do módulo; as saliências pertencem ao perímetro externo.

As superfícies visíveis das saliências são fechadas acima e abaixo: pedestal sob colar mais estreito, capitel sobre fuste, arquitrave entre apoios e borda do tampo. A renda mantém seu desenho e seus mapas, mas acompanha a projeção maior do tampo, com duas facetas por face e fechamento fino de canto. O linho superior termina exatamente em y=16.

A fonte geométrica está em `assets-src/atelier/colonnade-model.mjs`. `ornate.mjs` mantém a pintura, os mapas e os exports anteriores. Nenhum PNG, geometria de pack ou conteúdo de release foi editado manualmente.

## Compatibilidade

Mesmos IDs, UUIDs, states ordenados/defaults, colisões, regras de suporte, nomes de geometria e runtime. Nenhuma entidade, callback ou estado adicional. O único acréscimo nos componentes dos dois blocos é o material `moulding`. Os demais modelos e texturas são protegidos byte a byte por `verify-colonnade-rebuild.mjs`.

São 225 blocos, 224 acabamentos, 560 geometrias e 55.760 combinações no Altare. O conjunto local com Aspergillum continua em 65.504; outros packs devem ser contados separadamente. Aspergillum permanece 1.2.5.

Um conjunto de moldura de 64² acrescenta 49.152 bytes RGBA. Total: 72 conjuntos, 160 PNGs únicos e 34.582.528 bytes, aproximadamente 32,9805 MiB antes de mipmaps e ícones, dentro do teto local de 33 MiB.

## Complexidade controlada

A Microsoft [recomenda mirar até 50 cubos por modelo](https://learn.microsoft.com/en-us/minecraft/creator/documents/practices/improvingperformanceandresourceusage?view=minecraft-bedrock-stable), considerando frequência e contexto de uso. Essa é uma recomendação de desempenho, não uma cota de crafts ou um limite rígido documentado para a geometria.

Os outros modelos conservam o teto interno de 50. Esta revisão diagnóstica admite, somente na Colunata, até 112 registros de cubo e 400 faces UV. A peça vestida isolada, com quatro lados expostos, usa 107 registros e 391 faces. Muitos registros são prismas com somente duas faces opostas; não são caixas com seis faces. O contorno é compilado, sem carregar colunas e molduras de lados internos.

No conjunto principal 7 × 2 vestido são 614 registros e 2.178 faces: média de 43,86 registros e 155,57 faces por módulo, antes de culling/batching. `verify-colonnade-rebuild.mjs` registra custos antigos/novos para larguras 1/3/7/8/16. Esses números não medem tempo de GPU. O custo adicional da peça isolada e a multiplicação de altares continuam sujeitos a profiling no Minecraft nos dispositivos de destino. O teto não deve ser ampliado genericamente para todo o catálogo.

## Validação oficial e exceção diagnóstica

O primeiro build isolado 0.8.0 foi retido pelo gate de empacotamento por avisos GEOMETRY 501, sem erros de schema. Seus registros de fuste foram agrupados na 0.8.1: a mesma casca de seis faces passa a usar três registros por coluna, reduzindo o altar vestido 7×2 de 722 para 614 registros, sem remover faces visíveis.

O Creator Tools continua avisando sobre geometrias acima de 50 registros. A política desta revisão mantém todos esses avisos no relatório oficial e aceita somente o código 501, mensagem exata, caminho Colunata válido, contagem igual ao arquivo emitido e limites 112 registros/400 faces. Qualquer erro ou outro aviso reprova o pacote. Três testes verificam que código, severidade, caminho, contagem, identidade e custo fora do contrato não entram na exceção. Isso permite o diagnóstico visual e não dispensa o profiling nativo ou constitui aprovação de desempenho.

## Evidência reproduzível

Antes: `out/colonnade-before-0.7.1/`. Depois: `out/colonnade-after-0.8.1/`. Mesmos conjuntos sem toalha 3×2, renda 7×2 e renda 1×1; frente, oblíqua, canto e detalhe; classic/PBR; 1600×1000. São 24 pares com câmeras e enquadramentos idênticos, comparados aos respectivos arquivos de release. As vistas adicionais de trás e de cima verificam retornos e tampo em tamanhos maiores.

```text
npm run check
npm run package
node tools/verify-colonnade-rebuild.mjs
node tools/verify-baseline.mjs
node tools/verify-world-compatibility.mjs dist/releases/Altare-0.7.1.mcaddon
node tools/capture.mjs --matrix ornate --presets colonnade-bare-3,colonnade-lace-7,colonnade-lace-1 --views front,oblique,corner,detail --profiles classic,pbr --width 1600 --height 1000 --output out/colonnade-after-0.8.1
node tools/verify-captures.mjs out/colonnade-after-0.8.1 out/colonnade-extra-0.8.1
node tools/compare-structures.mjs out/colonnade-before-0.7.1 out/colonnade-after-0.8.1
```

[Pacote](../dist/releases/Altare-0.8.1.mcaddon) · [Validação oficial](../dist/validation/0.8.1/release-summary.json) · [Auditoria](../dist/validation/0.8.1/colonnade-rebuild.json) · [Comparação](../out/colonnade-comparison-0.8.1/index.html).

## Resultado do pacote

O check do Altare passou com 67 testes. O Creator Tools registrou zero erros, 22 avisos GEOMETRY 501 conferidos pela política acima e zero avisos inesperados. Arquivo final: 11.172.533 bytes, 1.034 arquivos; SHA-256 `5d16af1b05293f5f6d2de429fdc21d7c15e5eea45add3d2789443728dab82c77`.

A auditoria contra 0.7.1 confirmou 986 arquivos anteriores idênticos, 44 mudanças permitidas e quatro arquivos do novo material. Os 225 blocos conservam IDs, estados/defaults, UUIDs e colisões. A comparação confirmou os 24 pares com câmeras idênticas; todas as 32 capturas atuais correspondem byte a byte aos arquivos do release. A regressão clássica mantém 89 arquivos iguais à 0.2.1. Relatórios em `dist/validation/0.8.1/`.

O check da raiz passou com 107 testes Aspergillum e 75 do viewer. Build do viewer, smoke do Workbench e smoke do estúdio compilado passaram. Estúdio 1.8.1, sete modelos, miniaturas atualizadas e render 1920×1080 da composição Colunata. A aceitação no Minecraft não foi executada por estas ferramentas.

## Reteste no Minecraft

Importar Altare 0.8.1 em uma cópia do mundo, sem revisão Altare concorrente. Montar 7×2, escolher Colunata e alternar renda. Conferir fustes, molduras, quinas, rodapé e parte inferior das saliências de perto e na distância de uso. Repetir em 1×1, 8×2 e 16×2, quebrar/recompor uma extremidade e reabrir o mundo. Os contornos devem se recompor sem frestas persistentes ou peças internas expostas.

Aplicar com vasos e blocos apoiados: o tampo mantém y+1 e os objetos permanecem. Verificar nos modos gráficos usados pelos jogadores. Conferir fluidez em cena com vários altares e comparar com 0.7.1 no mesmo aparelho, mundo, distância e configuração. Content Log esperado: nenhum novo erro de geometria/material/textura, state desconhecido ou rollback no uso normal.

O estúdio externo é evidência diagnóstica. Aprovação visual, apoio e desempenho no Minecraft permanecem pendentes do usuário.
