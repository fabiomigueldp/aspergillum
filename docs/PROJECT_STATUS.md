# Estado do projeto

## Aspergillum 2.0.0 — 06/11/2026

Integra o codec compacto e correções de identidade/sessão/recuperação preservadas no estudo. 5.008 estados do Aspergillum, sem alterações artísticas, áudio reencodado, migrador ou política que impeça quebra/explosão. Validação de jogo permanece distinta dos testes automatizados. [Entrega e limites](releases/2.0.0.md).

## Altare — integração de modelos — 06/11/2026

Altare 0.13.0 integra Cruzeta e Dois pedestais ao runtime/editor e Studio. São nove modelos e 430 acabamentos, incluindo 17 por modelo novo. A revisão mantém as correções atuais e a ferramenta 0.12.1; não incorpora a consolidada experimental inteira nem cria migração de saves. [Uso e limites](../addons/altare/docs/INTEGRATION_0.13.0.md). Validação nativa pendente.

## Ferramenta Altare — 05/11/2026

Altare 0.12.1 refina apenas o ícone da ferramenta de acabamento: amostras têxteis, bainha e agulha em pixel art nativa 32×32. Gameplay e catálogo preservados. [Contrato e reteste](../addons/altare/docs/FINISH_TOOL_0.12.1.md). Importação no Minecraft e Content Log pendentes.


## Altare compacto — 04/11/2026

Altare 0.12.0 evolui diretamente o schema de Atelier e Mensa: 54.528 estados, 64.272 junto com Aspergillum. O add-on não foi distribuído; não há requisito de migração ou preservação do schema anterior. Foram retirados o CLI e as barreiras de auditoria de compatibilidade acrescentados na revisão anterior. Modelos, materiais, colisão e escolhas do editor permanecem; quebras laterais dessas famílias preservam motivos. [Arquitetura e escopo](../addons/altare/docs/COMPACT_POSES_0.12.0.md). Aspergillum e Studio não mudam de versão.

## Curadoria do arquivo de trabalho — 04/11/2026

Fontes, modelos 3D, add-on Nossa Senhora da Paz e estudos selecionados estão no [arquivo curado de desenvolvimento](../experiments/2026-11-preservation/README.md), com hashes, insumos e restauração independente. A curadoria retira 1.348.195.558 bytes de outputs históricos exclusivos do checkout, conserva V75/P85 e toda a cadeia Blender, e mantém os outros 12 snapshots intactos. A limpeza posterior removeu do histórico alcançável da main os 1.917 blobs exclusivos descartados; o arquivo integral anterior não está disponível em clones novos. Os 79 commits anteriores à inclusão desses objetos, a branch experimental e as oito tags permaneceram idênticos. A main mantém Aspergillum 1.2.5, Altare 0.11.2 e Studio 2.2.1; somente as correções de fechamento das interfaces foram incorporadas ao runtime. Schemas compactos 2.0.0/0.13.0 continuam NO-GO para atualização de saves/release. Nenhuma instalação ou publicação de pacote foi realizada.

## Editor Altare — código em desenvolvimento — 04/11/2026

Clareza dos controles, dimensões reativas, identificação de Guadalupe e proteção contra callbacks após fechar. Mudança isolada de apresentação sobre o catálogo existente; sem novos modelos, codecs ou estados. [Contrato e reteste](../addons/altare/docs/NATIVE_EDITOR_UX.md). Não há novo pacote ou validação Minecraft, nem promoção dos estudos separados de compactação/migração.

## Chanfros de Ogivas Altare — 31/10/2026

Altare 0.11.2 / Estúdio 2.2.1 refina os recessos de Ogivas com planos inclinados e mitras fechadas, incluindo a ponta. Relevos ímpares cabem no campo do fundo; corpo, apoios, toalhas, mapas, definições de bloco e runtime/editor são preservados. Não aumenta registros/faces, arquivos ou estados. [Construção e reteste](../addons/altare/docs/OGIVE_DETAIL_0.11.2.md). Aspergillum permanece 1.2.5; importação e profiling pendentes.

## Editor Altare — 31/10/2026

Altare 0.11.1 corrige `InvalidObservableError` na abertura do editor: dropdowns fixos exigem valor `clientWritable` mesmo ocultos/desabilitados. Regressão reproduz o erro e preserva a autoridade do rascunho/commit. Geometrias, estados e recursos 0.11.0 preservados; Aspergillum 1.2.5 e Estúdio 2.2.0 permanecem. [Causa e reteste do pacote](../addons/altare/docs/EDITOR_FIX_0.11.1.md); confirmação no Minecraft pendente.

## Ogivas Altare — 31/10/2026

Altare 0.11.0 / Estúdio 2.2.0 reconstrói Ogivas como arcada cega com recessos, intradorso, pilares compartilhados e perfis contínuos em todo o perímetro. Mesmo corpo nas dez toalhas; relevos ajustados ao teto ogival. Contratos de mundo, runtime, colisões e demais famílias preservados. Três cores recortadas compartilham PBR existente, sem novos estados. [Construção, custo e reteste](../addons/altare/docs/OGIVE_REBUILD_0.11.0.md). Aspergillum permanece 1.2.5; importação, Content Log e profiling pendentes.

## Perfis de Pilastras Altare — 31/10/2026

Altare 0.10.1 / Estúdio 2.1.1 integra os painéis às pilastras por rebaixos chanfrados, com encontros diagonais, apoios e coroamento refinados. Mesmos cubos, catálogo, definições de bloco, mapas e runtime; menos faces. Testes independentes de rotação e cobertura dos cantos. [Contrato e reteste](../addons/altare/docs/PILASTER_DETAIL_0.10.1.md). Aspergillum permanece 1.2.5; validação nativa e profiling pendentes.

## Ferramentas gráficas — 31/10/2026

Seleção automática de GPU para os CLIs Playwright, fallback SwiftShader com prioridade/afinidade limitada no Windows, diagnóstico do backend e modo software explícito preservado. Smoke compilado completo: 17,7 s na Iris Xe, contra 102,3 s na execução anterior. [Contrato e limites](RENDER_PERFORMANCE.md).


## Pilastras Altare — 31/10/2026

Altare 0.10.0 / Estúdio 2.1.0 reconstrói Pilastras com campos recuados, apoios intermediários e de quina, chanfros, bases/capitéis e perfis em volume. Preserva blocos, estados, runtime, texturas e demais modelos; testa o encaixe das dez toalhas e relevos. Contornos compilados têm custo diagnóstico limitado; importação exata, Content Log e profiling continuam pendentes. [Contrato e reteste](../addons/altare/docs/PILASTERS_0.10.0.md). Aspergillum permanece 1.2.5.

## Toalhas universais Altare — 31/10/2026

Altare 0.9.0 e Estúdio 2.0.0 compartilham dez escolhas de toalha entre os sete modelos, renda floral redesenhada, caimento/cantos comuns e Guadalupe independente no Clássico. Os 225 blocos anteriores mantêm identidade e colisões; 172 IDs compactos completam as combinações. A expansão excede a referência global de estados sob exceção diagnóstica documentada, com teste nativo e profiling pendentes. [Contrato, migração e reteste](../addons/altare/docs/UNIVERSAL_TEXTILES_0.9.0.md). Aspergillum permanece 1.2.5.


## Encaixe têxtil Altare — 31/10/2026

Altare 0.8.3 corrige o encontro entre linho, dobra e renda da Colunata, remove sobreposições e liga as quinas por costuras geométricas. Perfil compartilhado e testes de cobertura/afastamento/preservação de rascunho. Estúdio 1.8.3. Mesmos blocos, texturas, estados e runtime; Aspergillum permanece 1.2.5. [Contrato e reteste](../addons/altare/docs/COLONNADE_CLOTH_0.8.3.md).


## Perfis da Colunata Altare — 31/10/2026

Altare 0.8.2 refina fustes octogonais, apoios únicos de canto, bases e capitéis em três níveis e terminações de caneluras. Estúdio 1.8.2. Mesmos contratos de mundo, runtime e limites diagnósticos; reteste visual/físico e desempenho continuam pendentes. [Contrato e reteste](../addons/altare/docs/COLONNADE_DETAIL_0.8.2.md). Aspergillum permanece 1.2.5.


## Reconstrução da Colunata Altare — 31/10/2026

Altare 0.8.1 reconstrói painéis, molduras, fustes, bases, capitéis e cornija, mantendo os mesmos contratos de mundo e runtime. Estúdio 1.8.1 com os sete modelos. A revisão controla a complexidade adicional por contorno e faces; o teste físico e o profiling permanecem pendentes. [Contrato e reteste](../addons/altare/docs/COLONNADE_REBUILD_0.8.1.md). Aspergillum permanece 1.2.5.


## Polimento Altare — 31/10/2026

Altare 0.7.1 refina colunata e renda: capitéis escalonados, retornos de arquitrave, caneluras e bainha curva. Estúdio 1.7.1 com os mesmos sete modelos. [Contrato e reteste](../addons/altare/docs/COLONNADE_POLISH_0.7.1.md). Não acrescenta estados; Aspergillum permanece 1.2.5.

## Colunata Altare — 31/10/2026

Altare 0.7.0 acrescenta Colunata dourada com ou sem renda branca vazada, inspirada na referência enviada. O codec simétrico acrescenta 32 combinações de estados; o estúdio 1.7.0 tem sete modelos. [Contrato e reteste](../addons/altare/docs/COLONNADE_0.7.0.md). [Variações e foco Criativo](../addons/altare/docs/VARIATIONS.md). Aspergillum permanece 1.2.5; gate Minecraft pendente.

## Marcenaria Altare — 31/10/2026

Altare 0.6.1 acrescenta Arca e Balaústres, com veios orientados, apoios por módulo e travessas recortadas nos cantos. Estúdio 1.6.0 com seis modelos. [Construção, orçamento e reteste](../addons/altare/docs/JOINERY_0.6.1.md). As 199 definições anteriores são preservadas; Aspergillum permanece 1.2.5. Gate Minecraft pendente.

## Personalização Altare — 30/10/2026

Altare 0.5.0 introduz editor nativo unificado e estruturas invariantes à troca de tecido. O estúdio 1.5.0 compartilha as regras, tem seleção visual, abas e desfazer/refazer. [Contrato e limites](../addons/altare/docs/CUSTOMIZATION_0.5.0.md). A validação física continua pendente; Aspergillum permanece 1.2.5.

## Render Studio local — histórico 1.4.0

A bancada existente inclui a aba de composição e exportação dos altares Altare, com domínio/modelos reais, ambientes em blocos e texturas vanilla verificadas, iluminação clássica e exportação PNG/JSON. O renderer 1.4.0 oferece presbitério com vitrais, capela de madeira e claustro com jardim, bancos, degraus, tetos e decoração; a vista superior oculta o teto. A montagem usa objetos de nove packs locais, verificados por hash e em escala nativa, com castiçais, crucifixo, vasos, flores, Aparecida e Evangeliário. Contagem de velas, montagem e ornamentação sazonal são configuráveis. [Uso, arquitetura e limites](RENDER_STUDIO.md). O presbitério possui piso contínuo, luzes embutidas, nicho, ambão e cadeiras com assentos vermelhos; as câmeras ajustam o enquadramento aos objetos e abrem cortes nas vistas de inspeção. A ferramenta não muda a baseline 1.2.5 nem o Altare 0.4.2 e não confirma paridade com o renderer do jogo.

## Baseline

- **Versão de referência:** `1.2.5` (revisão numérica dos packs `[1, 2, 5]`; gate visual/físico pendente)
- **Engine mínima:** Creator `1.26.40`
- **Script API:** manifest com `@minecraft/server` `2.9.0` e `@minecraft/server-ui` `2.1.0`, estáveis; `@minecraft/common` `1.3.0` somente no toolchain npm
- **Experimentos:** nenhum
- **Conteúdo:** aspersório funcional de quatro cargas, caldeirinha de dezesseis unidades, docking decorativo, três perfis de spray, dezesseis acabamentos e Mesa do Sacristão configurável

A v1.0.20 foi validada em jogo e é a baseline protegida de economia, docking parcial, persistência, animação, VFX e áudio. A v1.1.4 corrigiu a interseção do pomo; a v1.1.5 removeu as tampas coincidentes da cabeça, mas a decomposição em aros finos perdeu duas paredes no renderizador de blocos. A v1.1.6 conserva seis volumes com paredes integrais e apenas uma tampa por junção.

O reteste físico da v1.1.6 demonstrou que remover somente a segunda tampa coplanar não eliminava o desaparecimento angular no passe `blend` da caldeirinha. A matriz `1.1.7a/b/c` confirmou a composição B como a melhor resposta visual: estrutura/aspersório `opaque` e água `blend`. A v1.1.7 promove esse perfil sem alterar a geometria simples aprovada.

A matriz 1.1.8 rejeitou alpha-test por degradação visual. A 1.1.9c separou a água em uma entidade `entity_alphablend`, eliminou a mistura de render methods no bloco e foi aprovada em jogo pelo usuário com resultado visual satisfatório, funcionalidades sem bugs observados e Content Log limpo. A 1.1.9 promove essa arquitetura como baseline estável sem alterar a autoridade lógica da água; a decisão e a proveniência estão em [Release 1.1.9](releases/1.1.9.md).

A 1.1.10 mantém essa baseline byte/semanticamente protegida no gameplay e fecha a lacuna de observabilidade: o viewer compõe a mesma entidade de água, os nove acabamentos podem ser capturados explicitamente, o lifecycle visual recebe testes diretos e os ícones têm contraste validado. A promoção está registrada em [Release 1.1.10](releases/1.1.10.md).

A 1.2.0 expande somente a superfície de personalização: bronze cerimonial e marfim vegetal completam a matriz 4×4. Os índices `0..8` preservam seus pares históricos; os sete pares novos usam `9..15`. O registro da promoção e do orçamento está em [Release 1.2.0](releases/1.2.0.md).

A 1.2.1 promove a identidade visual aprovada: o ícone passa a ser uma composição autoral reproduzível da caldeirinha cheia com o aspersório acomodado e o título `ASPERGILLUM`. A fonte de produção, o manifest de captura e a capa em alta resolução ficam em `assets-src/branding/`; ambos os packs recebem exatamente o mesmo PNG nativo de 256 px. Nenhum contrato de mundo ou gameplay muda. O registro está em [Release 1.2.1](releases/1.2.1.md).

A 1.2.2 promove duas melhorias de apresentação: blocos usam tiles de destruição `16 × 16` dedicados, e os dezesseis itens usam ícones derivados do modelo, color maps e materiais PBR reais do aspersório. Água, geometria distribuída, binding, poses, states, gameplay e persistência não mudam. Evidência automatizada, compatibilidade e gates físicos estão em [Release 1.2.2](releases/1.2.2.md).

A 1.2.3 promove a identidade localizada dos packs: Behavior e Resource Pack usam `pack.name`/`pack.description` em escopos próprios, com textos objetivos em `pt_BR` e `en_US`. A revisão também torna a proveniência dos SFX autocontida e consolida empacotamento determinístico e instalação local transacional, sem alterar mídia distribuída, gameplay ou contratos de mundo. Contrato, evidências e gates físicos estão em [Identidade pública dos packs](PACK_IDENTITY.md) e [Release 1.2.3](releases/1.2.3.md).

A 1.2.4 tentou selecionar os dezesseis materiais em um proxy stateful, mas o Bedrock 26.40 rejeitou tanto o objeto com states em `block_placer.block` quanto `item_visual` dentro de permutations. Isso invalidou os itens e causou os erros secundários de stackability/dynamic properties. A 1.2.5 mantém a renderização 3D, mas usa a forma runtime comprovada: dezesseis proxies internos sem state/permutation, referências string e `item_visual` somente nos componentes-base. Diagnóstico e correção estão em [Release 1.2.5](releases/1.2.5.md).

## O que está resolvido

- O attachable usa a mão direita por item-slot binding e acompanha integralmente o braço.
- O modelo aparece em primeira e terceira pessoa, em escala física coerente.
- A pose de primeira pessoa está aprovada e deve permanecer congelada.
- A pose de terceira pessoa está suficientemente calibrada para iniciar a fase de animação.
- A malha candidata mantém comprimento, largura máxima, grip e locator aprovados; quatorze peças com UV per-face inteiro em densidade 2× produzem o cabo de oito peças e a cabeça de seis volumes com quatro paredes integrais, sem pares de faces renderizadas coincidentes.
- O estado acomodado não possui mais uma cópia simplificada: origem, tamanho e UV de cada cubo são derivados automaticamente do modelo empunhado e validados face a face.
- Na caldeirinha, estrutura e aspersório acomodado usam um bloco integralmente `opaque`; somente a projeção descartável da água usa `entity_alphablend`, preservando translucidez e estabilidade sem materiais mistos.
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
- Caldeirinha e Mesa do Sacristão possuem partículas de quebra explícitas e independentes dos atlas de variantes: 56 fragmentos metálicos e 80 fragmentos predominantemente de madeira, respectivamente, ambos sem tint contextual.
- Os dezesseis itens usam ícones `32 × 32` derivados da malha real em uma vista oblíqua reproduzível; `assets-src/inventory-icons/` preserva fontes e manifest, e o gerador publica cópias byte-idênticas sem redesenhar a silhueta.
- A interface nativa `CustomForm` organiza somente perfil, metal e empunhadura em seções reativas, usa espaçadores nativos para ritmo vertical, reserva o único divisor ao grupo final e oferece restauração, retirada e fechamento localizados sem custos.
- Os perfis `standard`, `processional` e `contained` mantêm 36 gotas, seis pulsos, uma carga, release e cooldown; somente geometria, velocidade e steering do leque variam.
- Nove combinações cosméticas têm item/attachable/textura próprios; a variante original continua em `aspergillum:aspergillum` e mundos/itens existentes permanecem clássicos por default.
- Sessões da mesa são exclusivas por jogador e bloco, com revalidação tardia, snapshot persistente, rollback e cleanup de ciclo de vida.
- Mensagens do action bar e lore são traduzidas pelo Resource Pack do próprio cliente; não há ramificação manual por locale.
- Mensagens dinâmicas usam `%s` sequenciais compatíveis com o runtime; lore e action bar reiniciam explicitamente a formatação antes de aplicar a cor.
- Cues passam por adaptador Bedrock fail-soft, catálogo tipado e shuffle bag sem repetição imediata; feedback de carga mantém somente duas microgotas limitadas à caldeirinha.
- O pipeline versiona fontes selecionadas, masters, recipes, OGGs e hashes; `validate:audio` garante 48 arquivos mono/48 kHz/Vorbis sem órfãos ou caminhos vanilla.
- Os 48 SFX próprios preservam fontes selecionadas, receitas, masters, OGGs e hashes reproduzíveis.
- O toolchain 3D possui uma bancada web persistente e não distribuída que integra Model Lab, Bedrock Renderer e Avatar Lab sem navegação de documento, flash de HTML sem estilo ou perda de estado. A skin padrão de batina, rigs wide/slim, `rightItem`, attachable real, hold/carga/aspersão, viewmodel FP, PBR, scene trace, testes OBB e capturas headless continuam compartilhando o mesmo adaptador geométrico. A reauditoria guiada pelo vídeo de 11/08/2026 exige centro do grip exatamente sobre `rightItem`, contenção bidirecional mão–cabo e vistas macro dedicadas, sem alterar o Resource Pack.
- O mesmo Workbench agora consome um workspace multi-add-on gerado pelo registro do gerenciador: Aspergillum publica 7 modelos/16 equipamentos e Ornatum 41 modelos/39 equipamentos resolvidos, selecionáveis sem reload nos três laboratórios. Geometrias modernas e legadas, attachables, slots, texturas e animações são descobertos por manifesto, e os CLIs `capture:assets`/`capture:equipment` usam as APIs neutras compartilhadas.
- A composição genérica de avatar possui contratos testados para merge-by-bone, transformação única entre a frente canônica Bedrock e a frente `+Z` da skin, pivôs de cubo `1.12` consumidos sem double flip e rotações geométricas separadas de canais de animação. Na amostra validada, a mitra fica com face frontal voltada ao rosto/câmera e ínfulas atrás, o báculo ocupa o plano frontal da mão direita e os painéis rotacionados do barrete permanecem montados. O perfil avançado do aspersório continua isolado e sem regressão visual observada.
- O gerenciador local de instalações administra múltiplos projetos por `addonId`; Aspergillum e Ornatum possuem catálogos, UUIDs, caminhos e estado separados, com visão agregada, upgrade X→Y, remoção isolada, ordem de referências preservada e transação global por árvore Bedrock.

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
| Input de docking | rota dupla `onUseOn` + `onPlayerInteract` validada pelo usuário na 1.0.17a | manter como regressão recorrente |
| UX localizada | catálogo tipado de 32 mensagens, UI com 27 chaves e lore de seis linhas | confirmar `pt_BR` e `en_US` dentro do jogo, incluindo **Fechar**, nomes de perfil/acabamento e docking |
| Desempenho | nenhum LOD sem evidência | medir profiler com 1, 4, 8 e 16 jogadores antes de autorizar alteração |
| Entrada vanilla | `playerSwingStart` é after-event | alguns dispositivos podem mostrar feedback breve de mineração |
| Docking 1.0.20 | validado em jogo pelo usuário; domínio e migração V1→V2 continuam cobertos automaticamente | manter `12+4`, `14+4`, `16+4`, reload, quebra e HUD como regressão da 1.1.2 |
| Polimento visual 1.0.19b | capturas PBR reproduzíveis aprovam coerência estrutural fora do jogo | confirmar silhueta, mipmaps, culling e materiais no `.mcaddon` importado, em clássico/Vibrant Visuals |
| Água por entidade 1.1.9 | perfil da C aprovado em jogo, sem bugs observados ou erros no Content Log; bloco opaco e projeção translúcida autorreparável | manter profiler com muitas caldeirinhas como monitoramento pós-release |
| Compatibilidade 1.1.9 | UUIDs oficiais, IDs, states, pivôs, locators e contratos de gameplay são preservados; somente a apresentação da água muda | manter upgrade de cópia persistente 1.1.7 como regressão pós-release |
| Partículas de quebra 1.2.2 | tiles dedicados, aliases e composição material são validados offline | confirmar no Minecraft partículas durante os golpes e no estouro final, em gráficos clássicos e Vibrant Visuals |
| Ícones de inventário 1.2.2 | 16 renders derivados do modelo são determinísticos, íntegros e distinguíveis por região semântica | confirmar escala, mipmapping, fundos de UI e cache no pacote final importado |
| Identidade localizada 1.2.3 | contrato, manifests, idiomas e gates usam `pack.name`/`pack.description` | confirmar ambos os packs em `pt_BR`/`en_US` no seletor real e registrar capturas/Content Log |
| Inventário 3D 1.2.5 | 16 itens/proxies string-addressed, geometria derivada, ausência de PNG e travas de colocação são validados offline | confirmar registro sem erros, enquadramento, PBR, inputs e ausência de colocação no Minecraft |
| Avatar Lab | binding, grip, animações, skins wide/slim e manifests com hash são verificáveis fora do jogo | câmera/shader proprietários, Persona, culling e aceitação visual final continuam exigindo o `.mcaddon` no Minecraft |
| Ornatum no Workbench | 39 equipamentos e 41 modelos são resolvidos; orientação, merge de bones e barrete 1.12 têm regressões automatizadas e capturas headless reais | a equivalência final de cada item, animação vanilla/armor offset e grip dos modelos legados ainda requer comparação dentro do Minecraft Ornatum |

## Próxima mudança autorizada

### Conteúdo complementar independente — Aurifrita

A solicitação de 19/10/2026 originou a [Mitra Aurifrita 0.1.1](../addons/aurifrita/README.md), em `addons/aurifrita/`. O subprojeto tem packs, versão, namespace, UUIDs, build e pacote próprios; usa o Workbench existente. O pacote passou na validação oficial sem erros/avisos. A aceitação dentro do Minecraft permanece pendente. Nenhum asset ou contrato distribuído do Aspergillum foi alterado.

### Aspergillum 1.2.5

Após a 1.2.5, importar somente o artefato final e primeiro confirmar ausência total dos erros de registro observados na 1.2.4. Depois comprovar os dezesseis acabamentos, confirmar que nenhum proxy é colocado e repetir o smoke `1.1.10 → 1.2.5`; qualquer ajuste de câmera deve permanecer exclusivo da geometria de inventário.

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
