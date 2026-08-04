# Estado do projeto

## Baseline

- **Versão de referência:** `1.0.16b` (revisão numérica dos packs `[1, 0, 21]`)
- **Engine mínima:** Creator `1.26.30`
- **Script API:** `@minecraft/server` `2.8.0`, estável
- **Experimentos:** nenhum
- **Conteúdo:** aspersório funcional, caldeirinha colocável, carregamento, três cargas, docking decorativo e spray visual

A v1.0.15d encerrou a fase de animação. A v1.0.16 integrou `spray_aim`/`aspergillum_tip`; a v1.0.16a corrigiu a herança local e restaurou o billboard legível. Depois da aprovação física dessa correção, a v1.0.16b elimina a dominante verde/amarela percebida no fim das gotas e nos impactos: a textura-fonte é neutra, os três efeitos usam azul frio e a luz local não altera mais o matiz. O emissor script-side continua preservando 36 gotas, steering e multiplayer. O projeto ainda não atingiu a V1 final: esta revisão cromática aguarda QA físico e docking persistente permanece pendente.

## O que está resolvido

- O attachable usa a mão direita por item-slot binding e acompanha integralmente o braço.
- O modelo aparece em primeira e terceira pessoa, em escala física coerente.
- A pose de primeira pessoa está aprovada e deve permanecer congelada.
- A pose de terceira pessoa está suficientemente calibrada para iniciar a fase de animação.
- A malha não apresenta o desaparecimento recorrente de faces observado em versões antigas.
- Sobrevivência e Aventura consomem cargas; Criativo preserva uma carga real já existente; Espectador é negado.
- O carregamento usa `instance_id`, uma sessão por jogador, lock leve por bloco, revalidação e rollback defensivo.
- A rajada usa 36 gotas em seis pulsos, leque anisotrópico, gravidade, colisão e direção suavizada conforme a câmera.
- O primeiro pulso transita desde a direção capturada no início do gesto; os demais transportam a base lateral sem flip vertical.
- A carga é reservada no swing e consumida/preservada somente no release do tick 5.
- `ActionLease` impede que carregar e aspergir concorram para o mesmo jogador.
- O carregamento preserva a trajetória anterior; a aspersão usa o swing vanilla como arco principal, uma ponte Hermite exclusiva de `rightarm.y` para continuidade final e flick local em `aspergillum_action`.
- `spray_aim` e `aspergillum_tip` acompanham a cabeça animada; uma emissão curta e world-space conecta visualmente a ponta ao leque no release válido.
- As gotas principais preservam o billboard camera-readable `0.042 × 0.100` fisicamente aprovado; micro-splash permanece puramente cosmético.
- Bridge, gotas e micro-splash usam paleta azul-frio estável, sem multiplicação ciano dupla nem tint por iluminação local.
- Preparação e release usam eventos sonoros próprios na timeline do attachable; o script não duplica o splash válido.
- Trocar item ou dimensão cancela os pulsos restantes.

## Limitações conhecidas

| Área | Situação atual | Consequência |
| --- | --- | --- |
| Carregamento | gesto próprio recém-integrado | trajetória e clipping ainda precisam de validação física em wide/slim e primeira/terceira pessoa |
| Aspersão | composição 1.0.15d fisicamente aprovada e congelada | nenhuma limitação estrutural conhecida; manter testes de regressão FP/TP |
| Origem das gotas | bridge corrigido nasce em `aspergillum_tip`; leque balístico mantém origem matemática | QA recorrente deve confirmar ligação visual e comportamento remoto |
| Cor das gotas | paleta azul-frio independente da iluminação local | QA da 1.0.16b deve confirmar ausência de verde/amarelo em luz diurna, sombra e luz quente |
| Docking | bloco guarda apenas `has_aspergillum` | `nameTag`, identidade e futuras variantes podem se perder ao acomodar |
| Overflow | cargas podem exceder espaço livre ao acomodar | água pode ser descartada sem intenção se não for recusado |
| Schema/lore | schema ainda não é uma migração completa; lore é textual | compatibilidade futura e localização persistente ainda não estão concluídas |
| Entrada vanilla | `playerSwingStart` é after-event | alguns dispositivos podem mostrar feedback breve de mineração |

## Próxima mudança autorizada

A v1.0.16b está implementada e deve passar pelo gate cromático descrito em [TESTING.md](TESTING.md). Após sua aprovação, o próximo marco autorizado é a v1.0.17 de persistência, schema e docking descrita em [ROADMAP.md](ROADMAP.md).

Não faz parte do próximo marco:

- recalibrar a animação aprovada da v1.0.15d;
- refazer a malha;
- trocar o binding;
- substituir toda a arquitetura de uma vez;
- remover o emissor matemático antes de o locator provar equivalência em FP, TP e multiplayer;
- adicionar efeitos de gameplay sobre mobs ou blocos.

## Evidência necessária para avançar

Cada revisão visual precisa registrar versão, perspectiva, modelo de jogador, ação, resultado esperado, resultado observado e Content Log. O pacote efetivamente importado deve ser o mesmo produzido em `dist/releases/`, e packs anteriores devem ser removidos antes do teste.
