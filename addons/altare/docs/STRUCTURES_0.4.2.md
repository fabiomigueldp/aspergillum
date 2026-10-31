# Cavaletes e construção 3D — 0.4.2

Revisão de 30/10/2026 motivada pela captura do usuário com `[Altare] write failed; rolled back`. Critério: a mesa aberta deve ser registrada e aceitar o acabamento em 7 × 2, altura 1, preservando vasos e o vão central. A construção visual precisa mostrar apoios e travessas conectados. A aplicação no Minecraft é um gate do usuário; os resultados offline não o substituem.

## Causa confirmada no Content Log

Fonte local: `ContentLog2026-10-30_17-07-55_1.txt`, 98.735 bytes, SHA256 `6667379ea243b510ab1f6cb365d69fc7a877e5eb7b1b943a92d90671dbdc24dc`. O log registra Altare 0.4.1 carregado e a promoção das APIs 2.9.0 → 2.11.0 e UI 2.1.0 → 2.3.0. A leitura não modificou o mundo nem seus packs.

Há **264 erros de definição relativos aos 66 blocos de cavaletes**, seguidos por avisos de IDs ausentes do registro. Exemplo reduzido, sem caminho/identificador do mundo:

```text
17:08:37 [Blocks][error] blocks/l_trestle_walnut_white.block.json
  minecraft:collision_box: invalid numeric value
  minecraft:collision_box: expected an object
  minecraft:collision_box[0] -> min: ... not present in the Schema
  minecraft:collision_box[0] -> max: ... not present in the Schema
17:10:44 [Scripting][warning] [Altare] write failed; rolled back
```

A falha ocorre no registro dos blocos, antes da configuração. A mensagem genérica de rollback era consequência; não há evidência de defeito na posição dos vasos ou no tecido causando esse erro. O Creator Tools 0.17.7 havia aceitado o pacote anterior, portanto sua aprovação isolada não era suficiente.

## Formato estável e evidência oficial

O build agora emite caixas `{origin, size}` com origem centrada na base, X/Z entre −8 e 8 e Y entre 0 e 16. Mantém arrays multipartes, formato de bloco 1.26.30, engine mínima 1.26.40 e APIs estáveis. Não habilita experimentos.

- [Tipos oficiais Mojang de MinecraftCollisionBox](https://raw.githubusercontent.com/Mojang/bedrock-schemas/main/types/bp/blocks/components/MinecraftCollisionBox.d.ts): `origin`/`size`, também presentes no schema e formulário instalados localmente.
- [Atualização oficial 1.26.0](https://github.com/MicrosoftDocs/minecraft-creator/blob/main/creator/Documents/Update1.26.0.md): arrays de colisões liberados sem experimento.
- [Preview oficial 26.60.28](https://feedback.minecraft.net/hc/en-us/articles/49076913532557-Minecraft-Beta-Preview-26-60-28): introdução de `min`/`max` associada a Upcoming Creator Features. Não serve como contrato do alvo atual.
- A [página collision_box do Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockcomponents/minecraftblock_collision_box?view=minecraft-bedrock-stable) consultada já descrevia `min`/`max`. A escolha foi corrigida pela combinação de log reproduzível, tipos locais/oficiais e notas de versão, preservando o formato compatível com o alvo.

`structureCollision` transforma os oito vértices de cada cubo, incluindo pivô e rotação das escoras, e produz AABBs conservadoras. Há no máximo 16 caixas; o tampo é exatamente `origin: [-8,14.2,-8], size: [16,1.8,16]`. O ponto central `[0,7,0]` permanece livre em todas as frentes/máscaras. Uma caixa conservadora ocupa pequeno espaço vazio junto à diagonal; não representa uma colisão triangular exata.

## Aplicação e diagnóstico

Depois de revalidar sessão e superfície, `SurfacePort.prepare` resolve as permutações únicas de destino e recuperação antes da primeira escrita. Falha de registro produz `prepare failed; no blocks changed`, com a causa `cannot resolve <id> states=...`. A preparação e a escrita são síncronas, sem yield entre elas.

O rollback defensivo permanece para falhas durante a escrita. `formatFailure` mantém até cinco causas, 300 caracteres por causa e 1.200 no total, eliminando quebras de linha e ciclos. Erros de escrita incluem ID e posição. Nenhum diagnóstico altera o estado do mundo; a mensagem ao jogador permanece localizada e curta.

## Construção visual

- **Cavaletes:** duas armações nas extremidades, sapatas de 1,5 unidade e cabeçotes de 1,7, montantes de 2,25 × 2,5, duas escoras diagonais por módulo de profundidade e travessa longitudinal ligada aos montantes. A sapata e o cabeçote continuam pelas células de profundidade; não há apoios adicionais no meio do comprimento.
- **Pilastras:** corpo recuado, base contínua, fuste de 2,25 unidades e bases/capitéis de 3 unidades. As junções internas prolongam o corpo até a célula adjacente.
- **Ogivas:** moldura com 1,05 unidade de profundidade e 0,72 de espessura, impostas nos ombros, fecho central e peitoril conectado à base. O tema da toalha continua definindo a altura disponível do arco.

As 180 geometrias arquitetônicas mudam apenas na estrutura. Bones de tampo, toalha e apliques permanecem iguais à 0.4.1. Todos os 142 mapas de material, os 66 texture sets e recursos clássicos/Guadalupe são preservados byte a byte. Mantêm-se 199 blocos, 53.136 estados, máximo 50 cubos, 31,75 MiB RGBA de mapas e todos os UUIDs/IDs/valores ordenados de states.

## Evidência e limites

Os testes regressivos de colisão, armação e preparação falharam antes da correção (`out/regression-before-0.4.2.log`). A suíte atual cobre todas as quatro frentes × 16 máscaras, formato estável, extremos, teto, vão livre, cobertura dos vértices das escoras, preparação sem escrita e diagnóstico limitado.

A matriz `structures` compara oito configurações com a 0.4.1: sete blocos com/sem toalha, 1 × 1, 3 × 3, oito blocos com aplique, pilastras e ogivas. São 32 pares, câmeras e enquadramentos iguais, cor/PBR, quatro frentes. Quatro vistas adicionais do verso e oito de Guadalupe completam 44 capturas atuais. O comparador confere os hashes contra ambos os arquivos distribuídos. [Comparação](../out/structure-comparison-0.4.2/index.html).

O renderer externo não prova que o Minecraft importou/registrou o bloco, nem comportamento de colisão, suporte ou iluminação. Reteste mínimo: importar 0.4.2 sem revisão concorrente, converter 7 × 2 para cavaletes/nogueira sem/com toalha, colocar pedra/caldeirinha acima, alternar estrutura e salvar/reabrir. Repetir 8 × 2, 1 × 1 e quatro frentes. O novo Content Log deve estar livre de erros `collision_box`, IDs de cavaletes ausentes do registro e mensagens de rollback no caminho normal. Ver [TESTING.md](TESTING.md) e [release](RELEASE_0.4.2.md).
