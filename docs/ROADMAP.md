# Roadmap para a V1

## Princípios de execução

- Preservar a baseline v1.0.14 e evoluir por integração controlada.
- Uma revisão deve responder a uma hipótese principal e ter critérios de saída observáveis.
- Não remover fallback comprovado antes de a alternativa estar validada no pacote final.
- Não misturar refatoração ampla, calibração visual e mudança de semântica na mesma revisão.
- Versionar sempre de forma monotônica; não reutilizar versões já importadas pelo Minecraft.

## v1.0.15 — Fundação de animação e semântica de release — implementada

Escopo:

- introduzir `aspergillum_presentation`/`aspergillum_action` preservando o bound root;
- separar a malha em `handle` e `sprinkler_head` sem alterar a pose aprovada;
- implementar carregamento de 14–16 ticks com commit no tick 10;
- implementar gesto litúrgico de 18 ticks;
- introduzir `SprinkleSession` com reserva no tick 0 e commit no tick 4;
- iniciar `ActionLease` para exclusão de ações;
- suavizar também o primeiro pulso e usar transporte paralelo da base;
- externalizar constantes em `SprayProfile` (`standard`).

Gate de saída automatizado concluído; validação física pendente:

- primeira pessoa inalterada;
- cabo permanece no punho durante todo o gesto;
- cabeça não atravessa rosto, ombro ou tórax;
- cancelamento pré-release não consome carga;
- cancelamento pós-release não reembolsa;
- curvatura da câmera permanece controlável e suave.

## v1.0.15b — Redesign híbrido da aspersão — implementada; QA físico pendente

Escopo:

- preservar integralmente carregamento, binding, pose, estado e spray da 1.0.15;
- remover reset absoluto e `rightitem` da animação corporal de aspersão;
- manter o swing vanilla e adicionar correção pequena somente em `rightarm`;
- animar `aspergillum_action` com coreografias distintas FP/TP;
- acionar a ação local por cooldown válido num controller com crossfade;
- mover commit e seis pulsos para os ticks 5–10;
- validar matematicamente envelopes, endpoints, bones e continuidade.

Gate de saída físico:

- item permanece visível em todos os frames de primeira pessoa;
- existe apenas um começo, sem reset ou teleporte;
- cabeça não cruza rosto/ombro e grip permanece na mão;
- água começa durante o flick no tick 5;
- Content Log não acusa query, controller, animação ou bone desconhecido.

## v1.0.15c — Recovery nativo integral — implementada; gate físico não atendido

Hipótese confirmada no runtime:

- mesmo sem reset absoluto, a correção corporal iniciada pelo after-event possuía uma timeline independente;
- ao terminar fora de fase com o recovery vanilla, sua influência desaparecia e o braço saltava para a pose nativa corrente.

Escopo:

- remover exclusivamente a chamada e a definição da correção corporal de aspersão;
- deixar o swing vanilla como único proprietário de `rightarm` e `rightitem` durante toda a ação;
- preservar as coreografias FP/TP de `aspergillum_action`, o controller, o release no tick 5 e todo o perfil das gotas;
- tornar a ausência de animação corporal de aspersão um gate estrutural automatizado.

Gate de saída físico:

- braço completa o retorno sem solavanco ou teleporte no último quarto da ação;
- flick local continua ágil, dinâmico e legível nas duas perspectivas;
- não há regressão de viewport, grip, release, partículas ou steering;
- carregamento permanece idêntico à revisão anterior.

O teste físico demonstrou que remover a timeline concorrente não bastava: a própria animação oficial do player mantém `rightarm.y` próximo de `-30°` até o último instante de `variable.attack_time` e então salta para zero.

## v1.0.15d — Ponte de continuidade do swing — implementada e aprovada fisicamente

Escopo:

- preservar o swing vanilla como arco amplo e toda a coreografia local FP/TP da 1.0.15c;
- adicionar uma compensação aditiva somente em `rightarm.y`, sem `rightitem`, keyframes absolutos ou reset de pose;
- dirigir a compensação pelo `variable.attack_time` público do player, mantendo-a zero até 50% e em primeira pessoa;
- usar Hermite para cancelar progressivamente a costura de `-30°`, chegar neutro antes do reset e manter velocidade final nula;
- preservar release no tick 5, seis pulsos, steering, partículas, estado, carregamento e poses;
- validar numericamente a curva composta e bloquear regressão para a animação corporal absoluta.

Gate de saída físico:

- Content Log não acusa `variable.attack_time`, `variable.is_first_person` ou `math.hermite_blend` desconhecidos;
- terceira pessoa apresenta um único follow-through e retorno, sem teleporte no endpoint;
- primeira pessoa permanece visualmente idêntica à 1.0.15c;
- grip, flick, release, partículas e steering não regridem;
- carregamento permanece idêntico.

O usuário confirmou no runtime que o teleporte final foi eliminado. A composição do swing, a ponte de recovery e as coreografias locais ficam congeladas como baseline.

## v1.0.16/1.0.16a/1.0.16b/1.0.16c — Locator e VFX final — correções implementadas; QA cromático pendente

Escopo:

- adicionar `spray_aim` e `aspergillum_tip` à cabeça;
- provar o gatilho client-side somente para aspersão válida;
- emitir da ponta animada e orientar gotas pela velocidade;
- reduzir billboards próximos da câmera e adicionar micro-splash discreto;
- introduzir sons próprios;
- testar multiplayer e manter solução híbrida se o locator não preservar steering.

Implementação escolhida:

- `spray_aim`/`aspergillum_tip` integrados sem alterar binding, grip ou animação;
- bridge world-space de quatro microgotas no tick 5, em vez de um segundo leque;
- 36 gotas script-side preservadas com resposta `0.8`, limite `30°` e seis pulsos;
- billboards principais menores e orientados pela velocidade;
- micro-splash cosmético em colisão;
- áudio próprio de preparação e release na timeline válida;
- emissão molhada e splash script-side duplicado removidos.

Resultado físico da 1.0.16 e correção 1.0.16a:

- o runtime rejeitou `rotation: true` com `position: false`; a revisão passa a herdar ambas juntas;
- o billboard menor/orientado pela velocidade perdeu presença e fez a trajetória parecer excessivamente rápida;
- restaurados `rotate_xyz` e `0.042 × 0.100` da baseline aprovada, sem alterar a balística;
- desacelerado e ampliado somente o bridge para tornar a origem legível.

Correção cromática 1.0.16b:

- sprite radial convertido em fonte neutra para evitar multiplicação ciano sobre ciano;
- gradientes dedicados de azul frio aplicados ao bridge, leque e micro-splash;
- removido somente o tint por iluminação local das partículas de água, evitando verde/amarelo em luz colorida;
- movimento, escala, lifetime, colisão, quantidade e steering permanecem idênticos à 1.0.16a.

Correção cromática 1.0.16c:

- o teste físico demonstrou que o hex de oito dígitos foi lido como `AARRGGBB`, tornando verdes as chaves escritas como se fossem `RRGGBBAA` e quase branca a chave inicial;
- todos os gradientes passam a usar arrays `[r,g,b,a]` normalizados, sem ordem implícita de bytes;
- o azul nasce saturado, permanece dominante durante toda a vida e termina com alfa zero sem mudar para verde;
- a física e toda a apresentação não cromática permanecem idênticas à 1.0.16a.

Gate de saída:

- origem a até `0.10` bloco da cabeça visual;
- nenhum disparo vazio ou duplicado;
- 36 gotas e controle entre pulsos preservados, ou fallback híbrido documentado;
- nenhuma gota nasce no rosto/tórax e nenhuma acompanha o braço depois de emitida.
- gotas distantes e micro-splashes permanecem azuis em sol, sombra, luz quente e Vibrant Visuals.

## v1.0.17 — Persistência, schema e docking — implementada; QA físico pendente

Escopo:

- schema 2 e migrações reais;
- inicialização lazy + inventário, lore `RawMessage` localizada;
- `cosmeticId` e `sprayProfileId`;
- `DockedItemRegistry` persistente e snapshots;
- recusa de overflow e prioridade clara de interação;
- recuperação em quebra/explosão e política de pistão;
- testes de IDs duplicados, inventário cheio e reload.

Implementação:

- schema 2 preserva cargas finitas e adiciona `cosmeticId`/`sprayProfileId`, sem fazer downgrade de schema futuro;
- todo o inventário é inicializado/migrado e duplicatas locais de `instance_id` recebem nova identidade;
- lore usa `RawMessage` e chaves do Resource Pack;
- `DockedItemRegistry` usa propriedades dinâmicas do mundo agrupadas por dimensão/chunk;
- snapshots preservam nome, identidade, IDs de extensão e propriedades customizadas serializáveis;
- docking recusa overflow, retirada exige mão vazia, pistões são bloqueados e `onBreak` recupera o item real;
- a loot table ocupada entrega somente a caldeirinha, impedindo duplicação com a recuperação script-side.

Gate de saída:

- nenhum metadado perdido ao acomodar/retirar;
- nenhuma água criada ou destruída silenciosamente;
- mundos antigos migram sem regressão;
- schema futuro não é sobrescrito.

## v1.0.17a — Correção do input de docking — implementada; QA físico pendente

Escopo:

- receber uso do aspersório sobre a caldeirinha por `ItemCustomComponent.onUseOn`;
- capturar a intenção de agachamento durante o dispatch do evento;
- preservar `onPlayerInteract` como fallback e para balde/mão vazia;
- deduplicar as duas rotas sem tocar na transação persistente.

Gate de saída:

- agachar + usar acomoda em teclado/mouse, controle e toque;
- uso normal continua carregando;
- cada gesto produz no máximo uma operação, uma mensagem e um snapshot;
- Content Log permanece limpo.

## v1.0.18d — correção localizada e legibilidade da lore — implementada; QA físico pendente

Escopo fechado:

- eliminar `%` residual das quatro mensagens dinâmicas de carga em `pt_BR` e `en_US`;
- usar `%s` sequencial na mesma ordem de `RawMessage.with`;
- neutralizar o itálico herdado da lore por reset explícito antes da cor;
- manter a hierarquia semântica cinza/azul/vermelho e todos os textos existentes;
- bloquear regressão por testes de renderização substitutiva e release gate.

Gate de saída: `0/3`, `1/3`, `2/3` e `3/3` sem `%`; lore não itálica e legível; action bar com fonte normal; idiomas e Content Log limpos.

## v1.0.18c — curva de carregamento compatível com o runtime — implementada; sucedida pela correção de apresentação 1.0.18d

Escopo fechado:

- remover a combinação inválida de Molang dinâmico com Catmull-Rom pré-computado;
- preservar o mesmo envelope visual por uma curva Hermite analítica dirigida por `query.anim_time`;
- manter a ponte TP, peso FP, duração, commit e contratos autoritativos intactos;
- rejeitar automaticamente qualquer retorno de interpolação cúbica dinâmica à carga.

Gate de saída: Content Log sem `Precomputed cubic interpolation requires keyframes have constant data`; item visível em FP; retorno TP contínuo; transferência única no tick 10.

## v1.0.18b — recuperação composta do carregamento — implementada; sucedida pela correção runtime 1.0.18c

Escopo fechado:

- preservar integralmente o dip camera-safe da 1.0.18a e o settle local em `0,80 s`;
- identificar e neutralizar a descontinuidade vanilla de aproximadamente `30°` em `rightarm.y`;
- incorporar uma ponte Hermite TP à mesma animação, sem segundo `playAnimation()`, controller concorrente ou canal `rightitem`;
- manter a ponte nula em primeira pessoa e o contêiner finito em `1,10 s`;
- validar a pose composta, não apenas os keyframes isolados.

Gate de saída: retorno TP contínuo até a pose neutra, sem segundo extremo, overshoot ou pop; FP idêntica à 1.0.18a; estado e Content Log intactos.

## v1.0.18a — correção camera-safe do carregamento — implementada; sucedida pela recuperação 1.0.18b

Escopo fechado:

- eliminar o desaparecimento do item no carregamento em primeira pessoa sem tocar em binding, grip ou poses estáticas;
- remover reset de pose e qualquer canal `rightitem` da carga;
- recompor o gesto como correção aditiva de `rightarm`, reduzida em primeira pessoa e integral em terceira;
- preservar duração de 16 ticks, commit no tick 10, sessões, locks, água, cargas, som e micro-splash;
- validar automaticamente bones, peso por perspectiva, envelopes e settle.

Gate de saída: item visível em 100% dos frames FP, dip ainda legível em TP, nenhuma dupla partida ou pop, transferência única no tick 10 e Content Log limpo.

## v1.0.18 — UX, desempenho e Release Candidate — implementada; sucedida pela correção 1.0.18a

Escopo:

- mensagens e sons finais;
- feedback molhado mínimo, sem modelo persistentemente “encharcado” obrigatório;
- perfil/LOD somente se medições em 1, 4, 8 e 16 jogadores demonstrarem necessidade;
- matriz completa Steve/Alex/Persona, plataformas, FOVs e movimento;
- Content Log limpo, documentação de instalação, changelog e artefato final.

Implementação:

- catálogo tipado com 25 mensagens `RawMessage`, paridade obrigatória `pt_BR`/`en_US` e ausência de seleção manual de locale;
- lore final explica carregar, acomodar e retirar; botão contextual comunica uso direto, não menu;
- seis cues sonoros script-side passam por um coordenador único e fail-soft;
- commit de carregamento emite somente duas microgotas dentro da caldeirinha como feedback molhado mínimo;
- gate `validate:release` fiscaliza versão, catálogos, caminhos de apresentação, lore e ausência de `runInterval` ilimitado;
- LOD não foi introduzido porque ainda não há perfil físico demonstrando necessidade.

Gate de saída: runbook de [Release Candidate](RELEASE_CANDIDATE.md) e todos os itens aplicáveis da Definition of Done abaixo.

## Definition of Done da V1

### Renderização e gesto

- primeira pessoa aprovada e congelada;
- grip centralizado em terceira pessoa nos modelos wide e slim;
- animações próprias de carga e aspersão, blends suaves, sem clipping corporal;
- escala, faces, material e UV estáveis.

### Partículas

- origem na ponta real, leque horizontal e steering suave;
- sem halo, partículas duplicadas, gotas atrás do jogador ou billboards gigantes;
- primeira/terceira pessoa e multiplayer aprovados;
- VFX não governa gameplay.

### Estado e concorrência

- políticas Survival/Adventure/Creative/Spectator corretas;
- identidade preservada e cargas sempre em `0..3`;
- carregamento e aspersão transacionais em seus respectivos release points;
- sessões, locks, cancelamentos e cleanup cobertos;
- docking preserva metadados, recusa overflow e sobrevive a reload/quebra.

### Compatibilidade e release

- migração de schema e lore localizada;
- testes automatizados e matriz manual relevante concluídos;
- pacote final validado oficialmente e inspecionado;
- Content Log sem erro ou warning atribuível ao add-on;
- sem dependência essencial de API experimental;
- desempenho aceitável em mobile e multiplayer.

## Riscos que exigem protótipo isolado

| Risco | Estratégia |
| --- | --- |
| animar braço do jogador sem substituir controller vanilla | build diagnóstico com gesto exagerado e um único estado |
| detectar cooldown customizado no Molang do attachable | provar condição em pacote mínimo antes de remover VFX script-side |
| locator preservar steering gestual | comparar locator puro, híbrido e script em matriz FP/TP/multiplayer |
| snapshots por dynamic property crescerem demais | shard por chunk, limites de tamanho e testes de limpeza |
| eventos de quebra/explosão não cobrirem todos os drops | testes físicos separados e fallback de recuperação idempotente |

## Fora do escopo da V1

- bênçãos, dano ou efeitos automáticos em entidades;
- múltiplos modelos/cosméticos distribuídos;
- regulagem exposta ao jogador;
- block entity experimental;
- substituição de arquivos vanilla;
- sincronização das partículas como autoridade de colisão/gameplay.
