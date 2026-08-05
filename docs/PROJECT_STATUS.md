# Estado do projeto

## Baseline

- **Versão de referência:** `1.0.18a` Release Candidate (revisão numérica dos packs `[1, 0, 26]`)
- **Engine mínima:** Creator `1.26.30`
- **Script API:** `@minecraft/server` `2.8.0`, estável
- **Experimentos:** nenhum
- **Conteúdo:** aspersório funcional, caldeirinha colocável, carregamento, três cargas, docking decorativo e spray visual

A v1.0.18a é a primeira correção do Release Candidate. A revisão elimina uma dívida herdada da 1.0.15 que podia retirar o item do viewport durante a carga em primeira pessoa: a animação deixou de resetar a pose e de controlar `rightitem`, passando a somar somente um arco moderado em `rightarm`, reduzido por perspectiva. Todo o estado da 1.0.18 e a baseline física aprovada da aspersão permanecem congelados.

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
- O carregamento usa uma correção aditiva de `rightarm`, sem reset ou canal `rightitem`; a contribuição cai para 32% em primeira pessoa e mantém o arco completo em terceira.
- A aspersão usa o swing vanilla como arco principal, uma ponte Hermite exclusiva de `rightarm.y` para continuidade final e flick local em `aspergillum_action`.
- `spray_aim` e `aspergillum_tip` acompanham a cabeça animada; uma emissão curta e world-space conecta visualmente a ponta ao leque no release válido.
- As gotas principais preservam o billboard camera-readable `0.042 × 0.100` fisicamente aprovado; micro-splash permanece puramente cosmético.
- Bridge, gotas e micro-splash usam arrays RGBA explícitos e azul dominante em cada keyframe, sem hex de oito dígitos ambíguo nem tint por iluminação local.
- Preparação e release usam eventos sonoros próprios na timeline do attachable; o script não duplica o splash válido.
- Trocar item ou dimensão cancela os pulsos restantes.
- Itens brutos e schemas 0/1 migram para schema 2 em qualquer slot do inventário; schema futuro permanece intocado.
- Lore usa `RawMessage` e chaves `pt_BR`/`en_US`, sem congelar o idioma no ItemStack.
- Docking guarda `instance_id`, `nameTag`, cosmético, perfil e propriedades customizadas em shards persistentes por dimensão/chunk.
- Overflow é recusado sem alterar água ou item; retirada exige mão vazia e quebra recupera o snapshot real.
- Mensagens do action bar e lore são traduzidas pelo Resource Pack do próprio cliente; não há ramificação manual por locale.
- Cues sonoros script-side passam por um único coordenador fail-soft; feedback de carga adiciona somente duas microgotas limitadas à caldeirinha.

## Limitações conhecidas

| Área | Situação atual | Consequência |
| --- | --- | --- |
| Carregamento | composição camera-safe da 1.0.18a implementada | confirmar no pacote final que o item permanece visível em 100% dos frames FP e que o dip TP continua legível |
| Aspersão | composição 1.0.15d fisicamente aprovada e congelada | nenhuma limitação estrutural conhecida; manter testes de regressão FP/TP |
| Origem das gotas | bridge corrigido nasce em `aspergillum_tip`; leque balístico mantém origem matemática | QA recorrente deve confirmar ligação visual e comportamento remoto |
| Cor das gotas | RGBA explícito e azul dominante durante toda a vida | QA da 1.0.16c deve confirmar ausência de branco excessivo e de verde/amarelo em gotas e impactos |
| Persistência | registry por chunk é novo | precisa de QA de reload, quebra, explosão e inventário cheio no runtime |
| Recuperação | `onBreak` estável cobre destruição; água continua não sendo um item | confirmar fisicamente explosão e comandos `destroy` sem duplicação |
| Schema/lore | migração e `RawMessage` estão implementados | confirmar renderização `%%1/%%2` em clientes pt_BR e en_US |
| Input de docking | rota dupla `onUseOn` + `onPlayerInteract` validada pelo usuário na 1.0.17a | manter como regressão no RC |
| UX localizada | catálogo tipado de 25 mensagens e lore de quatro linhas | confirmar `pt_BR` e `en_US` dentro do jogo |
| Desempenho | nenhum LOD sem evidência | medir profiler com 1, 4, 8 e 16 jogadores antes de autorizar alteração |
| Entrada vanilla | `playerSwingStart` é after-event | alguns dispositivos podem mostrar feedback breve de mineração |

## Próxima mudança autorizada

A v1.0.18a está implementada como correção do Release Candidate e deve passar pelo runbook [RELEASE_CANDIDATE.md](RELEASE_CANDIDATE.md), com prioridade para o gate de carregamento de [TESTING.md](TESTING.md). Se não houver novo blocker, o próximo passo é promover os mesmos bytes à V1.

Não faz parte do próximo marco:

- recalibrar a animação aprovada da v1.0.15d;
- refazer a malha;
- trocar o binding;
- substituir toda a arquitetura de uma vez;
- remover o emissor matemático antes de o locator provar equivalência em FP, TP e multiplayer;
- adicionar efeitos de gameplay sobre mobs ou blocos.

## Evidência necessária para avançar

Cada revisão visual precisa registrar versão, perspectiva, modelo de jogador, ação, resultado esperado, resultado observado e Content Log. O pacote efetivamente importado deve ser o mesmo produzido em `dist/releases/`, e packs anteriores devem ser removidos antes do teste.
