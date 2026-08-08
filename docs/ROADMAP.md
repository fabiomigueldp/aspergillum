# Roadmap para a V1

## Princípios de execução

- Preservar a baseline v1.0.14 e evoluir por integração controlada.
- Uma revisão deve responder a uma hipótese principal e ter critérios de saída observáveis.
- Não remover fallback comprovado antes de a alternativa estar validada no pacote final.
- Não misturar refatoração ampla, calibração visual e mudança de semântica na mesma revisão.
- Versionar sempre de forma monotônica; não reutilizar versões já importadas pelo Minecraft.

## v1.1.4 — transição topológica do pomo — implementada; reteste visual pendente

Hipótese: a faixa preto/prateada observada somente na mesa nasce das tampas internas e dos três volumes interpenetrados da v1.1.3, amplificados pela escala `0.72`, rotação horizontal e render opaque do bloco.

Escopo fechado:

- substituir o colar sólido por aro de quatro barras ao redor do couro, sem interseção positiva;
- assentar placa, aro e empunhadura em intervalos coerentes, mantendo o comprimento total e o grip aprovado;
- omitir somente tampas internas comprovadas e preservar as máscaras em item, caldeirinha, mesa e visualizadores;
- validar automaticamente topologia, máscara, UV e derivação da réplica reduzida.

Gate de saída:

- câmera lenta e oblíqua junto ao pomo da mesa não produz faixa alternante, moiré preto/prateado ou oscilação;
- placa e aro permanecem legíveis, sem buraco, face ausente ou linha escura, nos quatro contextos de apresentação;
- binding, poses, animações, gameplay, persistência e interface não sofrem regressão.

## v1.1.3 — pomo autoral em dois estágios — implementada; topologia substituída pela v1.1.4

Hipótese: eliminar a fragilidade subpixel refinando a peça metálica real, não acumulando compensações na composição da mesa.

Escopo fechado:

- substituir o pomo único por base larga e colar de transição, ambos prateados e com volume legível;
- propagar a mesma malha de onze cubos para item empunhado, caldeirinha e mesa;
- remover o ajuste exclusivo da mesa sem mudar comprimento, grip, pivôs, locator ou poses.

Gate de saída:

- câmera em movimento não produz faces concorrentes na extremidade do cabo;
- base e colar formam uma silhueta deliberada em primeira/terceira pessoa e nas duas composições acomodadas;
- nenhum gap ou mudança de alinhamento surge entre pomo, couro, mão e mobiliário.

## v1.1.2 — ritmo do formulário e estabilidade do pomo — implementada; correção local substituída pela v1.1.3

Hipótese: usar o componente nativo `spacer()` para construir respiro sem simular seções e eliminar a cintilação do pomo com uma correção restrita à réplica da mesa.

Escopo fechado:

- remover o divisor entre perfil e acabamento e manter apenas o divisor do grupo final de ações;
- inserir cinco espaçadores nativos nos pontos observados no teste 1.1.1;
- ampliar a profundidade axial do pomo da réplica para `0.56` e limitar sua emenda interna com o couro a `0.04`;
- preservar posição, escala global, attachable empunhado, UVs, estado, catálogos e gameplay.

Gate de saída:

- cabeçalhos, controles e restauração possuem ritmo consistente sem uma faixa vazia entre as seções;
- o formulário continua cabendo na resolução testada, com o grupo final claramente separado;
- mover a câmera perto do pomo não produz oscilação, pixels alternantes ou faces concorrentes;
- regressões da 1.1.1 e da baseline 1.0.20 permanecem verdes.

## v1.1.1 — refinamento físico e destilação da Mesa — implementada; refinada pela v1.1.2

Hipótese: corrigir a composição observada no primeiro teste em jogo sem tocar nas bordas aprovadas, e reduzir a interface aos controles que realmente auxiliam a personalização.

Escopo fechado:

- centralizar a réplica do aspersório pelo centro geométrico, reduzir a escala uniforme para `0.72` e mantê-la inteiramente dentro do nicho;
- expandir o veludo para `13 × 13`, respeitando a moldura elevada, e remover os dois apoios de latão do tampo;
- remover cabeçalho/cargas, microcopy de gratuidade, demonstração e status persistente da UI;
- fornecer **Fechar** localizado com botão regular, evitando o `Close` fixo do `closeButton()` nativo;
- manter dropdowns reativos, restauração, conclusão/retirada, custo zero, persistência, locks e os contratos da baseline.

Gate de saída:

- item inteiro, centralizado e apoiado sobre o veludo nas dezesseis rotações, sem atravessar bordas ou flutuar para fora da mesa;
- veludo preenche todo o interior sem z-fighting e nenhum apoio dourado permanece no tampo;
- menu compacto e sem informações redundantes, com **Fechar** em `pt_BR`, sem corte ou rolagem indevida na resolução já testada;
- nove acabamentos e três perfis continuam aplicando e persistindo gratuitamente; reload, quebra, inventário cheio e concorrência não perdem nem duplicam o item;
- regressão completa da 1.0.20 permanece verde.

## v1.1.0 — Mesa do Sacristão e personalização — implementada; refinada pela v1.1.1

Escopo fechado:

- adicionar um bloco de trabalho coerente com sacristias e igrejas: madeira escura, veludo verde, ferragens discretas, gaveta frontal e dezesseis rotações estáveis;
- acomodar o ItemStack exato sobre a mesa, preservando cargas, identidade, nome, schema e propriedades customizadas por snapshot persistente;
- oferecer interface nativa reativa com três perfis de aspersão, três metais, três empunhaduras, restauração clássica e conclusão/retirada;
- tornar toda configuração e a demonstração original gratuitas; a mesa é fabricável, mas nenhuma escolha consome ingrediente, água ou carga;
- manter `standard` idêntico à 1.0.20 e adicionar `processional`/`contained` sem alterar economia, seis pulsos ou janela de release;
- gerar nove itens/attachables/aparências de composição a partir de um catálogo semântico único;
- preservar o ID clássico, UUIDs, binding, geometry `1.16.0`, poses, snapshots, locks, rollback, áudio e VFX aprovados;
- usar `@minecraft/server-ui` `2.1.0` estável no manifest e `@minecraft/common` `1.3.0` somente no toolchain npm, sem JSON UI customizado ou APIs preview.

Gate de saída:

- os nove acabamentos e três perfis aplicam imediatamente e persistem após retirar, reload, quebra e reentrada;
- fechar a UI deixa o item exposto; concluir o retira; inventário cheio usa drop seguro; nenhuma rota duplica ou perde o item;
- a demonstração original produzia seis gotas sem custo; a v1.1.1 a remove porque o formulário impedia observar sua resposta;
- dois jogadores não editam a mesma mesa, e cleanup ocorre em morte, saída, dimensão e quebra;
- mesa vazia/ocupada, dezesseis rotações, clássico/Vibrant Visuals e UI em `pt_BR`/`en_US` passam no pacote final;
- regressão completa da 1.0.20 validada: carga 4/16, docking parcial, animação, 36 gotas/seis pulsos, áudio, identidade e Content Log.

## v1.0.20 — docking parcial conservativo — implementada e validada em jogo

Escopo fechado:

- substituir a recusa de overflow por transferência `min(cargas, 16 - água)` em todos os modos autorizados;
- persistir no snapshot V2 as cargas que não couberem e restaurá-las em retirada, quebra e reload;
- migrar snapshots V1 para zero sem duplicar água histórica;
- manter transação e rollback defensivos, identidade, shards, input duplo deduplicado e bloqueio de Espectador;
- comunicar no HUD transferência integral, parcial e zero; áudio de água representa somente a quantidade efetivamente devolvida;
- preservar integralmente UUIDs, block states, schema do ItemStack, binding, poses, animações, VFX e economia 4/16.

Gate de saída:

- as 85 combinações `0..16 × 0..4` acomodam e conservam exatamente `água + cargas`;
- `12+4→16+0`, `14+4→16+2` e `16+4→16+4` passam em Survival, Adventure e Creative;
- snapshots V1/V2, retirada, quebra, reload, rollback, inventário cheio e troca de modo não perdem nem duplicam cargas;
- teclado, controle e toque produzem um único commit e feedback localizado correto;
- pacote `1.0.20`, Content Log e regressões visuais/sonoras permanecem limpos.

## v1.0.19b — polimento de malha, materiais e composição — implementada; QA físico pendente

Escopo fechado:

- preservar binding, grip, comprimento de `15,6`, largura máxima de `4,94`, locator, poses e animações;
- substituir a cabeça de quatro volumes por seis camadas graduais dentro do mesmo envelope, aproximando a leitura esférica da referência sem aumentar a obstrução da câmera;
- elevar o item para atlas `128 × 128`, densidade 2×, perfurações garantidas nas quatro faces e mapas PBR sincronizados;
- tornar a geometria-base da caldeirinha uma fonte autoral e gerar dela as dezesseis rotações publicadas;
- gerar `resting_aspergillum` diretamente dos dez cubos do item e copiar suas ilhas color/normal/MER para o atlas do bloco;
- substituir o ruído quadriculado da caldeirinha por metal martelado mais calmo sem alterar forma, colisão, água, estados ou interação;
- bloquear automaticamente qualquer divergência futura entre item e composição acomodada.

Gate de saída:

- órbita completa mostra duas fileiras de perfurações em cada lado, faixa equatorial, domos graduais e todas as paredes contínuas;
- primeira pessoa mantém mira/plano próximo aprovados; terceira pessoa mantém grip e ausência de clipping com Steve/Alex/Persona;
- item empunhado e acomodado exibem couro, prata, ouro, perfurações, normal e MER coerentes nos mesmos componentes;
- caldeirinha conserva legibilidade em clássico/Vibrant Visuals e nos quatro níveis de água;
- Content Log limpo e nenhuma regressão em animação, locator, docking, 36 gotas/seis pulsos, áudio, economia ou persistência.

## v1.0.19a — integridade de superfícies e UV — implementada; QA físico pendente

Escopo fechado:

- corrigir paredes laterais ausentes sem alterar silhueta, grip, locator, poses ou animações;
- substituir Box UV fracionário por seis UVs per-face inteiros em cada um dos oito cubos;
- gerar geometria e mapas color/normal/MER a partir de uma fonte semântica única;
- preservar o idioma visual da referência: couro escuro, corpo prateado, férula dourada e cabeça perfurada;
- bloquear faces subpixel, ausentes, sobrepostas ou fora do atlas no pipeline;
- tornar os viewers front-face e capazes de denunciar UV incompatível, sem apresentá-los como prova final do runtime.

Gate de saída:

- órbita completa no Minecraft mostra paredes contínuas no pomo, haste, férula, base/topo da cabeça e terminal;
- primeira/terceira pessoa, Steve/Alex/Persona e clássico/Vibrant Visuals preservam escala e materiais;
- ouro aparece somente na férula, sem lado acidentalmente dourado no pomo ou terminal;
- Content Log limpo e nenhuma regressão em binding, poses, animações, locator, 36 gotas/seis pulsos ou áudio da 1.0.19.

## v1.0.19 — sistema de áudio próprio — implementada; QA auditivo pendente

Escopo fechado:

- substituir sons vanilla provisórios por 15 famílias semânticas e 48 variantes próprias mono/48 kHz/Vorbis;
- separar pistas privadas do ator de commits espaciais do mundo;
- mover release sonoro e bridge para o commit autoritativo e compartilhar um único frame com o primeiro pulso;
- impedir preparo/agendamento quando o cooldown nativo falhar;
- garantir variação sem repetição imediata por shuffle bag;
- versionar fontes, recipes, masters, OGGs, hashes e validar o inventário automaticamente;
- preservar binding, poses, animações, partículas, steering, economia 4/16 e persistência.

Gate de saída:

- 200 ações válidas produzem 200 releases, sem duplicação;
- 100 cancelamentos pré-release produzem zero releases;
- cues privados não vazam para observador e cues espaciais têm origem correta;
- todas as 48 variantes passam por escuta humana no Minecraft sem clipping, ruído, tom inadequado ou desequilíbrio;
- Content Log não registra arquivo ou evento desconhecido;
- mídia comercial é regenerada sob plano ElevenLabs pago antes de uma publicação comercial.

## v1.0.18g — codec compacto do reservatório — implementada; QA físico pendente

Escopo fechado:

- corrigir o blocker runtime da 1.0.18e, cujo `water_level` enumerava dezessete valores onde o Bedrock 26.40 aceita no máximo dezesseis por state;
- manter a semântica exata `0..16` no domínio e codificá-la em `water_base` (`0|9`) + `water_offset` (`0..8`) na infraestrutura;
- compor ambos os states numa única `BlockPermutation`, preservando commit, rollback, Creative, docking e locks;
- limitar o espaço cartesiano a 576 combinações e bloquear regressões de cardinalidade no validador;
- preservar integralmente a baseline visual/funcional e o alinhamento estável da 1.0.18f.

Gate de saída:

- bloco, item, receita, função e componente registrados sem erro ou warning no Content Log;
- round-trip `0..16`, sequência `16→12→8→4→0`, quartos visuais e 85 combinações de carga/água corretos;
- nenhuma referência runtime a `aspergillum:water_level` e nenhuma regressão de animação, VFX, docking ou persistência.

## v1.0.18f — alinhamento com Bedrock 26.40 — implementada; QA físico pendente

Escopo fechado:

- elevar o alvo mínimo dos manifests para Creator `1.26.40`;
- atualizar a dependência estável `@minecraft/server` para `2.9.0`, sem usar `2.10.0` beta;
- preservar integralmente a baseline funcional 4/16 da 1.0.18e e todos os contratos públicos;
- manter manifest v2, geometria `1.16.0`, rotação própria em 16 estados, nenhuma feature experimental e nenhuma alteração de gameplay.

Gate de saída:

- `npm run check`, `npm run package` e `validate:mcaddon` verdes;
- Content Log limpo no Bedrock 26.40;
- smoke test 4/16, aspersão, docking, persistência e matriz visual repetidos no pacote `1.0.18f`;
- nenhum aviso novo atribuído ao add-on.

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

## v1.0.18e — capacidade 4/16 e quartos visuais — implementada; QA físico pendente

Escopo fechado:

- separar capacidade do aspersório (`4`) e capacidade da caldeirinha (`16`) em domínios independentes;
- expandir `aspergillum:water_level` para `0..16`, sem migração de caldeirinhas antigas por decisão explícita;
- fazer um balde fornecer quatro carregamentos completos de quatro cargas;
- representar a quantidade exata em quatro quartos visuais, adicionando `water_high`;
- elevar o item ao schema 3, preservando cargas finitas de schemas anteriores e regenerando `/4`;
- adequar loading, Criativo, docking, overflow, textos, testes e documentação sem tocar em animação ou VFX.

Gate de saída: `0/4..4/4` corretos; sequência de reservatório `16→12→8→4→0`; quatro alturas visuais; overflow somente acima de 16; Content Log limpo.

## v1.0.18d — correção localizada e legibilidade da lore — implementada; sucedida pela revisão 1.0.18e

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
- identidade preservada e cargas sempre em `0..4`;
- carregamento e aspersão transacionais em seus respectivos release points;
- sessões, locks, cancelamentos e cleanup cobertos;
- docking preserva metadados e cargas restantes, transfere somente o que cabe e sobrevive a reload/quebra.

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
