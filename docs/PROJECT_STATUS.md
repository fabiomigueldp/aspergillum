# Estado do projeto

## Baseline

- **Versão de referência:** `1.1.3` Release Candidate (revisão numérica dos packs `[1, 1, 3]`)
- **Engine mínima:** Creator `1.26.40`
- **Script API:** manifest com `@minecraft/server` `2.9.0` e `@minecraft/server-ui` `2.1.0`, estáveis; `@minecraft/common` `1.3.0` somente no toolchain npm
- **Experimentos:** nenhum
- **Conteúdo:** aspersório funcional de quatro cargas, caldeirinha de dezesseis unidades, docking decorativo, três perfis de spray, nove acabamentos e Mesa do Sacristão configurável

A v1.0.20 foi validada em jogo e é a baseline protegida de economia, docking parcial, persistência, animação, VFX e áudio. Como a correção local da v1.1.2 não eliminou a cintilação do pomo no Bedrock, a v1.1.3 refina a própria malha autoral: base e colar metálicos agora possuem volume deliberado em todas as apresentações.

## O que está resolvido

- O attachable usa a mão direita por item-slot binding e acompanha integralmente o braço.
- O modelo aparece em primeira e terceira pessoa, em escala física coerente.
- A pose de primeira pessoa está aprovada e deve permanecer congelada.
- A pose de terceira pessoa está suficientemente calibrada para iniciar a fase de animação.
- A malha candidata mantém comprimento, largura máxima, grip e locator aprovados; onze cubos com UV per-face inteiro em densidade 2× produzem pomo metálico em dois estágios e cabeça escalonada/perfurada.
- O estado acomodado não possui mais uma cópia simplificada: origem, tamanho e UV de cada cubo são derivados automaticamente do modelo empunhado e validados face a face.
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
- Docking guarda cargas restantes, `instance_id`, `nameTag`, cosmético, perfil e propriedades customizadas em shards persistentes por dimensão/chunk.
- Todas as combinações 4/16 podem ser acomodadas: a água satura em 16, o restante fica no snapshot e retirada/quebra recuperam o item exato.
- A Mesa do Sacristão possui modelo próprio de madeira escura, nicho integral de veludo verde, ferragem restrita ao puxador, dezesseis rotações e apresentação centralizada do aspersório derivada da mesma malha autoral.
- A interface nativa `CustomForm` organiza somente perfil, metal e empunhadura em seções reativas, usa espaçadores nativos para ritmo vertical, reserva o único divisor ao grupo final e oferece restauração, retirada e fechamento localizados sem custos.
- Os perfis `standard`, `processional` e `contained` mantêm 36 gotas, seis pulsos, uma carga, release e cooldown; somente geometria, velocidade e steering do leque variam.
- Nove combinações cosméticas têm item/attachable/textura próprios; a variante original continua em `aspergillum:aspergillum` e mundos/itens existentes permanecem clássicos por default.
- Sessões da mesa são exclusivas por jogador e bloco, com revalidação tardia, snapshot persistente, rollback e cleanup de ciclo de vida.
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
| UX localizada | catálogo tipado de 32 mensagens, UI com 27 chaves e lore de seis linhas | confirmar `pt_BR` e `en_US` dentro do jogo, incluindo **Fechar**, nomes de perfil/acabamento e docking |
| Desempenho | nenhum LOD sem evidência | medir profiler com 1, 4, 8 e 16 jogadores antes de autorizar alteração |
| Entrada vanilla | `playerSwingStart` é after-event | alguns dispositivos podem mostrar feedback breve de mineração |
| Docking 1.0.20 | validado em jogo pelo usuário; domínio e migração V1→V2 continuam cobertos automaticamente | manter `12+4`, `14+4`, `16+4`, reload, quebra e HUD como regressão da 1.1.2 |
| Polimento visual 1.0.19b | capturas PBR reproduzíveis aprovam coerência estrutural fora do jogo | confirmar silhueta, mipmaps, culling e materiais no `.mcaddon` importado, em clássico/Vibrant Visuals |
| Modelo 1.1.3 | pomo redesenhado na fonte autoral e propagado às três apresentações | confirmar no Bedrock que os dois estágios permanecem estáveis em movimento e melhoram a silhueta empunhada |
| Compatibilidade 1.1.3 | IDs, states, UV layout, pivôs e locators publicados são preservados; somente a malha ganha um cubo prateado | validar mundo existente da 1.0.20/1.1.2 antes e depois do upgrade, sem cache concorrente |

## Próxima mudança autorizada

A v1.1.3 está pronta para um reteste visual curto pelo gate inicial de [TESTING.md](TESTING.md). A prioridade é verificar o pomo na mão, na caldeirinha e sobre a mesa enquanto a câmera se move; o restante permanece como regressão já coberta.

Não faz parte do próximo marco:

- recalibrar a animação aprovada da v1.0.15d;
- recalibrar novamente a malha antes do gate físico da 1.0.19b;
- trocar o binding;
- substituir toda a arquitetura de uma vez;
- remover o emissor matemático antes de o locator provar equivalência em FP, TP e multiplayer;
- adicionar efeitos de gameplay sobre mobs ou blocos.
- substituir a interface nativa por JSON UI customizado ou APIs preview;
- cobrar materiais por configuração ou adicionar uma prévia que fique encoberta pela própria interface.

## Evidência necessária para avançar

Cada revisão visual precisa registrar versão, perspectiva, modelo de jogador, ação, resultado esperado, resultado observado e Content Log. O pacote efetivamente importado deve ser o mesmo produzido em `dist/releases/`, e packs anteriores devem ser removidos antes do teste.
