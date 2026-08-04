# Estado do projeto

## Baseline

- **Versão de referência:** `1.0.17a` (revisão numérica dos packs `[1, 0, 24]`)
- **Engine mínima:** Creator `1.26.30`
- **Script API:** `@minecraft/server` `2.8.0`, estável
- **Experimentos:** nenhum
- **Conteúdo:** aspersório funcional, caldeirinha colocável, carregamento, três cargas, docking decorativo e spray visual

A v1.0.17a mantém a persistência da 1.0.17 e corrige seu gate de entrada: usar o aspersório sobre a caldeirinha agora chega tanto pelo `onUseOn` estável do item quanto pelo `onPlayerInteract` do bloco. O agachamento é amostrado no evento, antes do callback diferido, e uma claim curta elimina a possível duplicidade entre as duas rotas. Overflow, snapshots, recuperação, baseline visual e VFX permanecem intactos. Esta revisão aguarda QA dentro do Minecraft antes da v1.0.18 Release Candidate.

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
- Bridge, gotas e micro-splash usam arrays RGBA explícitos e azul dominante em cada keyframe, sem hex de oito dígitos ambíguo nem tint por iluminação local.
- Preparação e release usam eventos sonoros próprios na timeline do attachable; o script não duplica o splash válido.
- Trocar item ou dimensão cancela os pulsos restantes.
- Itens brutos e schemas 0/1 migram para schema 2 em qualquer slot do inventário; schema futuro permanece intocado.
- Lore usa `RawMessage` e chaves `pt_BR`/`en_US`, sem congelar o idioma no ItemStack.
- Docking guarda `instance_id`, `nameTag`, cosmético, perfil e propriedades customizadas em shards persistentes por dimensão/chunk.
- Overflow é recusado sem alterar água ou item; retirada exige mão vazia e quebra recupera o snapshot real.

## Limitações conhecidas

| Área | Situação atual | Consequência |
| --- | --- | --- |
| Carregamento | gesto próprio recém-integrado | trajetória e clipping ainda precisam de validação física em wide/slim e primeira/terceira pessoa |
| Aspersão | composição 1.0.15d fisicamente aprovada e congelada | nenhuma limitação estrutural conhecida; manter testes de regressão FP/TP |
| Origem das gotas | bridge corrigido nasce em `aspergillum_tip`; leque balístico mantém origem matemática | QA recorrente deve confirmar ligação visual e comportamento remoto |
| Cor das gotas | RGBA explícito e azul dominante durante toda a vida | QA da 1.0.16c deve confirmar ausência de branco excessivo e de verde/amarelo em gotas e impactos |
| Persistência | registry por chunk é novo | precisa de QA de reload, quebra, explosão e inventário cheio no runtime |
| Recuperação | `onBreak` estável cobre destruição; água continua não sendo um item | confirmar fisicamente explosão e comandos `destroy` sem duplicação |
| Schema/lore | migração e `RawMessage` estão implementados | confirmar renderização `%%1/%%2` em clientes pt_BR e en_US |
| Input de docking | rota dupla `onUseOn` + `onPlayerInteract` implementada | confirmar agachar + usar em teclado/mouse, controle e toque sem execução duplicada |
| Entrada vanilla | `playerSwingStart` é after-event | alguns dispositivos podem mostrar feedback breve de mineração |

## Próxima mudança autorizada

A v1.0.17a está implementada e deve passar pelo gate de input e persistência descrito em [TESTING.md](TESTING.md). Depois da aprovação física, o próximo marco é a v1.0.18 de UX, desempenho e Release Candidate descrita em [ROADMAP.md](ROADMAP.md).

Não faz parte do próximo marco:

- recalibrar a animação aprovada da v1.0.15d;
- refazer a malha;
- trocar o binding;
- substituir toda a arquitetura de uma vez;
- remover o emissor matemático antes de o locator provar equivalência em FP, TP e multiplayer;
- adicionar efeitos de gameplay sobre mobs ou blocos.

## Evidência necessária para avançar

Cada revisão visual precisa registrar versão, perspectiva, modelo de jogador, ação, resultado esperado, resultado observado e Content Log. O pacote efetivamente importado deve ser o mesmo produzido em `dist/releases/`, e packs anteriores devem ser removidos antes do teste.
