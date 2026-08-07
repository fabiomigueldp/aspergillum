# Estado do projeto

## Baseline

- **Versão de referência:** `1.0.19a` Release Candidate (revisão numérica dos packs `[1, 0, 34]`)
- **Engine mínima:** Creator `1.26.40`
- **Script API:** `@minecraft/server` `2.9.0`, estável
- **Experimentos:** nenhum
- **Conteúdo:** aspersório funcional de quatro cargas, caldeirinha colocável de dezesseis unidades, docking decorativo e spray visual

A v1.0.19a preserva a baseline física 4/16, o áudio semântico da 1.0.19 e o alinhamento ao Bedrock 26.40/Script API 2.9.0. A revisão corrige faces laterais que colapsavam por Box UV subpixel sem alterar a silhueta: a fonte autoral gera seis UVs inteiros por cubo e um atlas único para color/normal/MER.

## O que está resolvido

- O attachable usa a mão direita por item-slot binding e acompanha integralmente o braço.
- O modelo aparece em primeira e terceira pessoa, em escala física coerente.
- A pose de primeira pessoa está aprovada e deve permanecer congelada.
- A pose de terceira pessoa está suficientemente calibrada para iniciar a fase de animação.
- A malha mantém exatamente a silhueta aprovada e usa UV per-face inteiro com mínimo de um texel, impedindo o colapso lateral observado no runtime.
- Sobrevivência e Aventura consomem cargas; Criativo preserva uma carga real já existente; Espectador é negado.
- O carregamento usa `instance_id`, uma sessão por jogador, lock leve por bloco, revalidação e rollback defensivo.
- A rajada usa 36 gotas em seis pulsos, leque anisotrópico, gravidade, colisão e direção suavizada conforme a câmera.
- O primeiro pulso transita desde a direção capturada no início do gesto; os demais transportam a base lateral sem flip vertical.
- A carga é reservada no swing e consumida/preservada somente no release do tick 5.
- `ActionLease` impede que carregar e aspergir concorram para o mesmo jogador.
- O carregamento usa uma correção aditiva analítica de `rightarm`, sem reset, canal `rightitem` ou interpolação cúbica pré-computada; a contribuição cai para 32% em primeira pessoa, mantém o arco completo em terceira e fecha a costura vanilla com uma cauda Hermite invisível.
- A aspersão usa o swing vanilla como arco principal, uma ponte Hermite exclusiva de `rightarm.y` para continuidade final e flick local em `aspergillum_action`.
- `spray_aim` e `aspergillum_tip` acompanham a cabeça animada; uma emissão curta e world-space conecta visualmente a ponta ao leque no release válido.
- As gotas principais preservam o billboard camera-readable `0.042 × 0.100` fisicamente aprovado; micro-splash permanece puramente cosmético.
- Bridge, gotas e micro-splash usam arrays RGBA explícitos e azul dominante em cada keyframe, sem hex de oito dígitos ambíguo nem tint por iluminação local.
- Preparação e release passam pelo `AudioPort`; o release ocorre no commit autoritativo e compartilha um único frame físico com bridge e primeiro pulso.
- Trocar item ou dimensão cancela os pulsos restantes.
- Itens brutos e schemas 0/1/2 migram para schema 3 em qualquer slot do inventário; schema futuro permanece intocado.
- Lore usa `RawMessage` e chaves `pt_BR`/`en_US`, sem congelar o idioma no ItemStack.
- Docking guarda `instance_id`, `nameTag`, cosmético, perfil e propriedades customizadas em shards persistentes por dimensão/chunk.
- Overflow é recusado sem alterar água ou item; retirada exige mão vazia e quebra recupera o snapshot real.
- Mensagens do action bar e lore são traduzidas pelo Resource Pack do próprio cliente; não há ramificação manual por locale.
- Mensagens dinâmicas usam `%s` sequenciais compatíveis com o runtime; lore e action bar reiniciam explicitamente a formatação antes de aplicar a cor.
- Cues passam por adaptador Bedrock fail-soft, catálogo tipado e shuffle bag sem repetição imediata; feedback de carga mantém somente duas microgotas limitadas à caldeirinha.
- O pipeline versiona fontes selecionadas, masters, recipes, OGGs e hashes; `validate:audio` garante 48 arquivos mono/48 kHz/Vorbis sem órfãos ou caminhos vanilla.
- Os SFX atuais foram gerados no plano free ElevenLabs: servem à RC não comercial com atribuição e precisam ser regenerados sob assinatura paga antes de distribuição comercial.

## Limitações conhecidas

| Área | Situação atual | Consequência |
| --- | --- | --- |
| Carregamento | composição camera-safe e recuperação TP da 1.0.18c implementadas em curva runtime-safe | confirmar no pacote final ausência do erro cúbico, visibilidade FP e retorno TP contínuo |
| Aspersão | composição 1.0.15d fisicamente aprovada e congelada | nenhuma limitação estrutural conhecida; manter testes de regressão FP/TP |
| Origem das gotas | bridge corrigido nasce em `aspergillum_tip`; leque balístico mantém origem matemática | QA recorrente deve confirmar ligação visual e comportamento remoto |
| Cor das gotas | RGBA explícito e azul dominante durante toda a vida | QA da 1.0.16c deve confirmar ausência de branco excessivo e de verde/amarelo em gotas e impactos |
| Persistência | registry por chunk é novo | precisa de QA de reload, quebra, explosão e inventário cheio no runtime |
| Recuperação | `onBreak` estável cobre destruição; água continua não sendo um item | confirmar fisicamente explosão e comandos `destroy` sem duplicação |
| Schema/lore | schema 3, `RawMessage`, placeholders `%s` e reset tipográfico implementados | confirmar `0/4..4/4`, ausência de `%` e lore não itálica em pt_BR/en_US |
| Input de docking | rota dupla `onUseOn` + `onPlayerInteract` validada pelo usuário na 1.0.17a | manter como regressão no RC |
| UX localizada | catálogo tipado de 25 mensagens e lore de quatro linhas | confirmar `pt_BR` e `en_US` dentro do jogo |
| Desempenho | nenhum LOD sem evidência | medir profiler com 1, 4, 8 e 16 jogadores antes de autorizar alteração |
| Entrada vanilla | `playerSwingStart` é after-event | alguns dispositivos podem mostrar feedback breve de mineração |

## Próxima mudança autorizada

A v1.0.19a está pronta para QA físico pelo runbook [RELEASE_CANDIDATE.md](RELEASE_CANDIDATE.md). O gate visual prioritário é uma órbita completa que confirme paredes contínuas no pomo, haste, férula, anéis da cabeça e terminal, em primeira/terceira pessoa e gráficos clássico/Vibrant Visuals. Permanecem os gates de Content Log, economia 4/16 e áudio da 1.0.19. A mídia atual bloqueia apenas publicação comercial, não o teste técnico da RC.

Não faz parte do próximo marco:

- recalibrar a animação aprovada da v1.0.15d;
- refazer a malha;
- trocar o binding;
- substituir toda a arquitetura de uma vez;
- remover o emissor matemático antes de o locator provar equivalência em FP, TP e multiplayer;
- adicionar efeitos de gameplay sobre mobs ou blocos.

## Evidência necessária para avançar

Cada revisão visual precisa registrar versão, perspectiva, modelo de jogador, ação, resultado esperado, resultado observado e Content Log. O pacote efetivamente importado deve ser o mesmo produzido em `dist/releases/`, e packs anteriores devem ser removidos antes do teste.
