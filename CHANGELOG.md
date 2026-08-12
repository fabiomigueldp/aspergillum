# Changelog

## 1.2.5 — 2026-08-11 — compatibilidade runtime do inventário 3D

- corrige a falha de registro da 1.2.4: Bedrock 26.40 rejeita um descritor com states em `minecraft:block_placer.block`, apesar da tipagem genérica da referência atual; todos os itens passam a usar a forma string demonstrada no exemplo oficial;
- remove `minecraft:item_visual` de permutations, posição rejeitada pelo parser runtime, e substitui o proxy stateful por dezesseis proxies internos sem states ou permutations;
- cada proxy declara sua geometria, material PBR e `item_visual` exclusivamente em `components`, preservando o mesmo modelo 3D e o acabamento exato;
- restaura o registro completo dos itens, inclusive `minecraft:max_stack_size: 1` e o custom component; os erros secundários de propriedades dinâmicas em itens empilháveis deixam de existir;
- validadores passam a rejeitar descritores não-string, `item_visual` em permutations, proxies com states e ausência de qualquer uma das travas de colocação;
- pacote e manifests sobem para `1.2.5`/`[1,2,5]`; IDs persistidos dos itens, attachables, binding, gameplay, cargas, água e snapshots permanecem inalterados.
- o Avatar Lab corrige a conversão de eixos/ordem Euler do player e do attachable e separa os diagnósticos de binding, centralização do grip e colisões OBB por frame;
- a costura web passa a sobrepor exatamente o pivô do couro ao `rightItem`, com offset XYZ zero; vistas macro frontal/interna/externa/traseira e captura opcional de pivôs substituem o antigo teste permissivo de simples contato lateral;
- o viewmodel usa a pose/cinemática vanilla de primeira pessoa e a captura de avatar aceita `--width/--height` para provas `16:9`; nenhuma geometria ou animação distribuída foi alterada;
- artefato `Aspergillum-1.2.5.mcaddon`: `3.096.416` bytes, SHA-256 `e62551816aeac54d1b8c7bfcadac334a92857ea2ab8ad778dbd896fb67bde06a`; Creator Tools aceitou os onze warnings offline conhecidos e nenhum inesperado.

## Ferramentas de desenvolvimento não distribuídas — 2026-08-11

- adicionado Avatar Lab com a skin **Batina preta com pelerine** como preset wide `128 × 128`, importação de skins, rigs wide/slim, dezesseis acabamentos, materiais clássico/PBR e inspeção de pivôs, locators, hierarquia e matrizes;
- jogador e attachable passam a ser compostos pela cadeia `rightArm → rightItem → aspergillum_bound → presentation → action`, com hold, carga, swing vanilla, ponte de recuperação e ação local reproduzíveis sem alterar os packs;
- novo `npm run capture:avatars` gera sequências por ação/tempo/vista, pranchas rotuladas e manifest com hashes da skin, geometria, attachable, animações e configuração;
- o atlas de jogador é expandido em seis faces explícitas por cubo, alinhando rosto, costas e laterais ao referencial visual do aspersório sem alterar UVs ou geometria do pack;
- Model Lab, Fidelity Renderer e Avatar Lab passam a compartilhar um construtor Bedrock sem estado global; a auditoria de UV distingue faces autoralmente omitidas de `uv_size` inválido ou colapsado;
- a auditoria read-only do projeto Sacristia informou câmera, performance, acessibilidade e importação de skin, sem criar dependência em `skinview3d` ou modificar o outro repositório;
- mudança restrita ao toolchain e à documentação: versão, UUIDs, packs, geometria distribuída, binding, poses, animações e artefato `1.2.4` permanecem inalterados.

## 1.2.4 — 2026-08-11 — modelos 3D no inventário

- os dezesseis itens removem `minecraft:icon` e passam a ser renderizados pelo motor a partir de sua própria geometria e de seus mapas color/normal/MER;
- uma única ponte interna `aspergillum:inventory_visual` usa `minecraft:item_visual` e o state `aspergillum:inventory_cosmetic` `0..15`, evitando dezesseis novos IDs de bloco;
- a geometria de apresentação é derivada deterministicamente dos mesmos quatorze cubos e UVs do attachable, normalizada e inclinada somente para a GUI, sem tocar em `aspergillum_bound`, no binding ou nas poses equipadas;
- o `block_placer` exigido pela API fica restrito a ar; filtro de suporte, colisão/seleção nulas e custom component cancelável impedem colocação normal ou consumo do item;
- os PNGs 32×32 e aliases do atlas de itens deixam o pacote, reduzindo a textura distribuída para 149 arquivos; as fontes da 1.2.2 permanecem arquivadas como evidência histórica;
- validadores bloqueiam retorno do raster, drift de IDs/states/material, perda de cubos/UVs e remoção das travas de colocação;
- versões do pacote e dos packs elevadas para `1.2.4`/`[1,2,4]`, preservando UUIDs, IDs dos itens, attachables, estados existentes, cargas, água, sessões, snapshots e persistência.
- o artefato `Aspergillum-1.2.4.mcaddon` tem `3.087.734` bytes e SHA-256 `752f9ad393240a0d9af73a79fcd1d6c7b503cdd5e4e35bed87840953be34df52`; o Creator Tools aceitou somente os onze warnings offline conhecidos, sem warning inesperado, Error ou Failure.

## 1.2.3 — 2026-08-11 — identidade localizada e tooling de distribuição

- manifests passam a usar as chaves canônicas `pack.name` e `pack.description`, eliminando a exibição literal dos antigos tokens `pack.aspergillum.*` no seletor do Bedrock;
- nomes e descrições de Behavior e Resource Pack são definidos objetivamente em `pt_BR` e `en_US` por um contrato único em `assets-src/branding/pack-identity.json`;
- testes, validação estrutural, prontidão de release e QA documental passam a exigir paridade exata entre contrato, manifests, `languages.json` e arquivos `.lang` dos dois packs;
- as 48 fontes selecionadas de áudio migram para uma árvore neutra e autocontida, removendo registros, metadados e tooling do provedor anterior sem alterar masters, OGGs, receitas de processamento ou hashes de mídia distribuída;
- um gerenciador local transacional passa a inventariar, planejar, instalar e atualizar o Add-On por artefato/hash, com lock, rollback, cache verificado e proteção de mundos Shared;
- o empacotamento oficial e os diagnósticos compartilham um núcleo ZIP determinístico, um registro monotônico de releases, descritores de proveniência e catálogo de artefatos; limpeza de trabalho e limpeza de releases ficam explicitamente separadas;
- versões do pacote e dos packs elevadas para `1.2.3`/`[1,2,3]`, preservando UUIDs, namespace, IDs, states, índices `0..15`, binding, geometria, poses, animações, VFX, cargas, água, sessões e persistência.
- o artefato `Aspergillum-1.2.3.mcaddon` tem `3.105.394` bytes e SHA-256 `be689665739129f1fbff803eb51e64b451c3fd6f015b598b2d24f356e1164983`; duas construções foram idênticas e o Creator Tools aceitou somente os onze warnings offline conhecidos, sem warning inesperado, Error ou Failure.

## 1.2.2 — 2026-08-11 — polimento visual e material

- caldeirinha e Mesa do Sacristão passam a declarar `minecraft:destruction_particles`, eliminando a amostragem incidental dos atlas completos durante a mineração e a quebra;
- o gerador produz dois tiles opacos de `16 × 16` autorados pixel a pixel: metal martelado/patinado para a caldeirinha e madeira escura com acentos mínimos de veludo e latão para a mesa;
- água e aspergillum acomodado ficam deliberadamente fora dos fragmentos; a aparência dos blocos, seus modelos, states, persistência e gameplay permanecem inalterados;
- contagens explícitas de 56 partículas para a caldeirinha e 80 para a mesa adequam o volume visual à massa de cada objeto, usando `tint_method: "none"`;
- o validador bloqueia alterações de dimensão, transparência, paleta, orçamento material, aliases e componentes; o comportamento final continua sujeito ao QA dentro do Minecraft;
- os dezesseis ícones do item deixam de ser desenhos procedurais independentes e passam a ser renders `32 × 32` da geometria, texturas e materiais PBR reais do aspersório;
- um preset de luz dedicado, enquadramento oblíquo, rotação de apresentação e contorno mínimo preservam volume, perfurações e leitura dos quatro metais e quatro cabos na escala do inventário;
- o novo `render:inventory-icons` gera candidata, prancha e manifest sem alterar produção por padrão; `--apply` promove fontes autoritativas em `assets-src/inventory-icons/`, e o gerador apenas as republica byte a byte;
- a validação dos ícones agora confere proveniência, hashes, paridade fonte/pack, transparência, margens, cobertura, contraste e assinaturas semânticas de cabeça e cabo;
- versões do pacote e dos packs elevadas para `1.2.2`/`[1,2,2]`, preservando UUIDs, namespace, IDs, states, índices `0..15`, binding, geometria, poses, animações, VFX, áudio, cargas, água, sessões e persistência.
- o artefato `Aspergillum-1.2.2.mcaddon` tem `3.105.396` bytes e SHA-256 `e48f9124e109c3fcea768de6c37b0150cf1f288efd36781c32d80580f4937798`; o Creator Tools aceitou somente os onze warnings offline conhecidos, sem warning inesperado, Error ou Failure.

## 1.2.1 — 2026-08-11 — identidade visual oficial reproduzível

- adicionado um compositor de capa reproduzível que reaproveita a geometria, texturas, composição acomodada e materiais atuais do Resource Pack, sem redesenhar o produto nem alterar o gameplay;
- o Bedrock Fidelity Renderer agora oferece fundo transparente, enquadramento autoral e preset de luz cinematográfica, preservando o preset neutro das capturas diagnósticas;
- incluído o comando `npm run render:cover`, que produz uma fonte de até 4096 px, uma prova renderizada diretamente em 256 px e um manifest com câmera, geometrias resolvidas, acabamento, água e tipografia;
- adotada localmente a fonte Bowlby One SC sob SIL Open Font License 1.1, com binário e licença versionados para renders offline determinísticos;
- a captura aquece o pipeline WebGL e rejeita cobertura alfa inferior a 4%, protegendo contra frames transparentes incompletos;
- a candidata aprovada foi promovida para `assets-src/branding/`; o gerador publica o PNG nativo de 256 px de forma byte-idêntica nos Behavior e Resource Packs;
- o validador exige capa 2048 px e ícone 256 px opacos, confere manifest, bytes e SHA-256 e bloqueia qualquer divergência entre a fonte oficial e os dois `pack_icon.png`;
- versões do pacote e dos packs elevadas para `1.2.1`/`[1,2,1]`, preservando UUIDs, namespace, IDs, states, matriz 4×4, binding, geometria, poses, animações, VFX, áudio, cargas, água, sessões e persistência.
- o artefato `Aspergillum-1.2.1.mcaddon` tem `3.097.584` bytes e SHA-256 `edc10892a591fdda380c63afbe31c6d7fe81297d80bdbf9ef8ade0a6980ba693`; duas execuções foram idênticas e o Creator Tools aceitou somente os onze warnings offline conhecidos.

## 1.2.0 — 2026-08-10 — matriz de acabamentos 4×4

- adicionados bronze cerimonial e marfim vegetal como quarto metal e quarta empunhadura, formando dezesseis combinações gratuitas e localizadas;
- preservados sem reordenação `classic` e os pares publicados em `0..8`; prata/envelhecida/dourada + marfim ocupam `9..11`, e bronze ocupa `12..15`;
- gerados sete novos IDs de item/attachable e conjuntos color/normal/MER para mão, caldeirinha e mesa, sem qualquer variante geométrica;
- UI continua usando dois dropdowns independentes; viewer e capturador apresentam uma matriz cartesiana 4×4, embora a ordem persistente permaneça deliberadamente legacy-first;
- states da caldeirinha e da mesa passam respectivamente a `9.216` e `512` combinações, cada dimensão com no máximo dezesseis valores; o orçamento de 163 texturas é `27,07 MiB` decodificados;
- validadores bloqueiam qualquer mudança dos dezesseis pares/IDs/índices publicados — com proteção explícita da herança `0..8` —, exigem assets/localizações completos e medem contraste dos quatro metais e quatro grips;
- preservados UUIDs, nomes de states, binding, geometria `1.16.0`, poses, animações, VFX, áudio, cargas, água, sessões, snapshots e fallback clássico; packs publicados como `[1,2,0]`.

## 1.1.10 — 2026-08-10 — observabilidade visual e legibilidade dos acabamentos

- o Bedrock Fidelity Renderer passa a compor a geometria real `geometry.aspergillum.aspersorium_water_visual` sobre a caldeirinha, com os estados vazio/¼/½/¾/cheio e material translúcido separados do bloco;
- adicionada seleção explícita de acabamento ao viewer e `--cosmetic <id,...>|all` ao capturador; execuções multiacabamento geram pranchas comparativas e manifest schema 2 sem perder as vistas individuais;
- sete testes exercitam diretamente criação, atualização de nível, deduplicação determinística, recentralização, remoção diferida, órfãos e entity load; a recuperação de uma projeção carregada fora do bloco vinculado deixa de poder criar uma duplicata;
- ampliada a assinatura visual do grip nos nove ícones 32×32, elevada a separação de castanho/vinho/preto e de prata/envelhecido/dourado, e incluído gate quantitativo de contraste no build;
- color maps e materiais PBR recebem a mesma separação cromática sem alterar UVs, geometrias, poses ou superfícies; o pack icon foi atualizado para a composição cerimonial atual;
- preservados UUIDs, IDs públicos, nove índices cosméticos, block states, binding, primeira/terceira pessoa, animações, VFX, áudio, gameplay e persistência; revisão monotônica dos packs `[1,1,19]`.
- o artefato oficial `Aspergillum-1.1.10.mcaddon` tem `1.944.465` bytes e SHA-256 `f9c9fbdf313ed324d3ab02f2892d1bf9a0ae90220f92127a81fd0e4c3f09844f`; Creator Tools aceitou os onze warnings offline conhecidos e nenhum warning inesperado, Error ou Failure.

## 1.1.9 — 2026-08-10 — água translúcida em passe de entidade

- promovida a arquitetura fisicamente aprovada na diagnóstica 1.1.9c: bloco da caldeirinha e aspersório acomodado usam exclusivamente `opaque`, enquanto a água preserva a qualidade translúcida em uma entidade visual `entity_alphablend`;
- os quatro volumes continuam autorados uma única vez em `assets-src/models/aspersorium.model.json`; o gerador os deriva para a geometria da entidade e os exclui das dezessete geometrias rotacionadas do bloco, impedindo divergência manual;
- integrada ao build oficial a reconciliação imediata em colocação, mudança de state, quebra e entity load, com reparo distribuído a cada 80–120 ticks e sem varredura global ou autoridade de gameplay na entidade;
- promovida a Behavior Entity mínima validada em jogo, sem `minecraft:pushable`, gravidade, colisão, spawn egg, IA ou componentes cosméticos desnecessários;
- validadores oficiais passam a exigir bloco uniformemente opaco, entidade mínima, geometria derivada, material `entity_alphablend`, propriedade client-sync `1..4`, textura dedicada e lifecycle no JavaScript compilado;
- preservados UUIDs oficiais, IDs públicos, states `water_base + water_offset`, snapshots, poses, animações, VFX, áudio e todos os contratos de mundo; revisão dos packs elevada monotonicamente para `[1,1,18]`;
- o usuário confirmou resultado visual satisfatório, ausência de bugs nos testes em jogo realizados e Content Log sem erros; a revisão foi promovida à baseline estável por decisão GO registrada em `docs/releases/1.1.9.md`;
- upgrade direto de uma cópia persistente da 1.1.7 e profiler com 1/16/64/256 caldeirinhas permanecem monitoramento pós-release explicitamente não reivindicado como executado.
- o artefato oficial `Aspergillum-1.1.9.mcaddon` tem SHA-256 `b0f2a02440f6ef2e551e2cd69699f4fde29b49be0272287f41c750a5117192da`; Creator Tools aprovou com onze warnings offline conhecidos e zero warning inesperado, Error ou Failure.

## 1.1.9c — 2026-08-10 — entidade visual mínima compatível com schema 1.26.40

- o runtime da 1.1.9b revelou a causa primária: `minecraft:pushable` deixou de ser analisado a partir do formato 1.26.10, fazendo o JSON inteiro da entidade falhar e, por consequência, `Dimension.spawnEntity()` continuar reportando tipo inválido;
- removido o componente legado sem substituí-lo por `pushable_by_block` ou `pushable_by_entity`, pois a projeção não deve aceitar nenhuma forma de empurrão;
- reduzida a Behavior Entity aos quatro componentes necessários: persistência, bloqueio de ataques, física sem gravidade/colisão e caixa de colisão zero; respiração, imunidade a fogo, família e otimização de banda foram eliminadas por não participarem da apresentação ou do lifecycle;
- o empacotador agora aplica uma allowlist exata de componentes e testa explicitamente a rejeição de `minecraft:pushable`;
- distribuída com UUIDs novos e revisão `[1,1,17]`; `Aspergillum-1.1.9c.mcaddon` tem SHA-256 `4740e10161e9f699b9dd34c9be25d900b289c0954bcac03748f845a315eaba28`.

## 1.1.9b — 2026-08-10 — correção do registro da entidade visual

- o teste físico da 1.1.9a revelou que `Dimension.spawnEntity()` recusava `aspergillum:aspersorium_water_visual` como tipo inválido; a definição havia sido distribuída com `is_summonable: false`, embora todos os recursos de cliente estivessem presentes;
- a 1.1.9b preserva integralmente geometria, material `entity_alphablend`, lifecycle e autoridade do bloco, alterando somente a entidade para `is_summonable: true`; `is_spawnable` continua `false`, portanto nenhum ovo de invocação é exposto;
- o empacotador agora inspeciona o Behavior Entity efetivamente staged e rejeita identificador divergente, spawn egg habilitado ou entidade não invocável, cobrindo a lacuna que a validação offline da Creator Tools não detectou;
- distribuída com UUIDs novos e revisão monotônica `[1,1,16]`; `Aspergillum-1.1.9b.mcaddon` tem SHA-256 `8865ae14cecfb475751edb7022e6dd1a62079a3dc92acd8d1329cfccad7a658d`.
- o teste em jogo mostrou que essa hipótese era incompleta: habilitar `is_summonable` permitiu ao Content Log expor o erro anterior de parsing, mas a entidade continuou sem registro porque `minecraft:pushable` não pertence ao schema 1.26.40. Substituída pela 1.1.9c.

## 1.1.9a — 2026-08-10 — água translúcida por entidade visual

- implementada uma variante completa e isolada em que a caldeirinha e o aspersório acomodado usam somente `opaque`, enquanto a água preserva translucidez real pelo material vanilla `entity_alphablend` numa entidade visual própria;
- o bloco conserva autoridade exclusiva sobre `water_base + water_offset`; a entidade sincroniza somente os quatro quartos gráficos e não participa de carga, docking, persistência do item ou economia;
- adicionada reconciliação em colocação, mudança de state, quebra e carregamento da entidade, mais auditoria distribuída do próprio bloco a cada 80–120 ticks para migrar mundos existentes e reparar ausência, deslocamento ou duplicação sem varredura global;
- a projeção não possui gravidade, colisão, push, IA, spawn natural ou interação, é persistente e reutiliza exatamente a textura, área e alturas da água da 1.1.7;
- criado build diagnóstico por define, UUIDs próprios e revisão monotônica `[1,1,15]`; a release oficial permanece 1.1.7 e não recebe recursos de entidade;
- o pacote `Aspergillum-1.1.9a.mcaddon` tem SHA-256 `0c68a98f09f4ed06bfe12e45e66f978e09283f5475ba03aff432fc15f803e6bf`; Creator Tools aprovou com zero Error/Failure, quinze warnings offline conhecidos e nenhum warning novo relacionado ao candidato.
- o teste em jogo reprovou esta revisão antes do gate visual: nenhuma lâmina d'água foi criada e o script recebeu tipo inválido. A 1.1.9b mostrou depois que o diagnóstico inicial sobre `is_summonable` era insuficiente; a causa primária era a rejeição do componente legado `minecraft:pushable` e, portanto, do JSON inteiro.

## 1.1.8d — 2026-08-10 — correção diagnóstica da amostragem UV

- as capturas físicas de A/B demonstraram um quadrante transparente e três quadrantes opacos; a causa foi isolada no desacordo entre o atlas `256 × 256` declarado pela geometria e a textura de água `32 × 32`, que reduzia `uv_size: 16 × 16` a somente `2 × 2` texels físicos;
- a D preserva a cobertura nominal B de 81,25%, o método uniforme e a superfície top-only, mas usa textura `256 × 256` correspondente ao atlas e desloca a ilha para `[8,8]`, produzindo amostragem efetiva comprovada de `16 × 16`;
- o gerador repete a máscara ao redor da ilha para proteger filtragem/mipmaps, mantém RGB ciano sob alpha zero e adiciona teste explícito da fórmula `uv × textura / atlas`;
- distribuída como diagnóstico isolado `1.1.8d`/`[1,1,14]`, com UUIDs próprios; Creator Tools aprovou o pacote com quinze warnings offline conhecidos e zero Error/Failure;
- o teste no Minecraft confirmou o resultado tecnicamente esperado, mas visualmente inadequado: superfície ciano sólida com pixels inteiramente ausentes; a técnica foi rejeitada e o ramo alpha-test encerrado.

## 1.1.8a / 1.1.8b / 1.1.8c — 2026-08-10 — diagnósticos de água alpha-test

- produzida uma matriz isolada para avaliar a substituição do perfil misto da 1.1.7 por `alpha_test_single_sided_to_opaque` uniforme em toda a caldeirinha;
- a água passa a uma máscara binária estática `16 × 16`, com RGB ciano preservado sob pixels transparentes e coberturas aninhadas de 75%, 81,25% e 87,5%;
- os quatro níveis preservam origem e altura, mas usam somente a face superior, removendo dezessete conjuntos de faces inferiores/laterais encerradas no reservatório sem tocar na estrutura sólida;
- A/B/C usam revisões monotônicas `[1,1,11]`, `[1,1,12]` e `[1,1,13]`, nomes, ícones e UUIDs próprios; a 1.1.7 permanece a release oficial;
- scripts e gameplay são byte-idênticos nas três variantes; dentro da matriz, somente a cobertura de pixels visíveis muda;
- Creator Tools aprovou os três pacotes com quinze warnings offline conhecidos e zero Error/Failure; o teste físico de água, movimento, distância, estrutura e Content Log permanece pendente.

## 1.1.7 — 2026-08-08

- promovida a composição fisicamente aprovada na diagnóstica 1.1.7b: estrutura da caldeirinha e aspersório acomodado usam `opaque`, enquanto somente a água preserva `blend` e translucidez;
- o teste integral em jogo confirmou topo/base e quatro lados estáveis, eliminou também outras falhas de renderização da composição e preservou todas as funcionalidades do add-on;
- mantida integralmente a cabeça simples da 1.1.6, com seis volumes, quatro paredes por nível e uma tampa por junção; a topologia exterior complexa da diagnóstica C foi rejeitada;
- o runtime atual registra as mensagens conhecidas de métodos mistos em `MaterialInstances`; a revisão foi aceita conscientemente após validação física completa, com reavaliação obrigatória diante de regressão visual ou mudança de plataforma;
- validadores passam a exigir exatamente `opaque` para a estrutura e `blend` para a água em todas as variantes cosméticas;
- o rótulo distribuído é `1.1.7` e a revisão numérica monotônica dos packs é `[1,1,10]`.

## 1.1.7a / 1.1.7b / 1.1.7c — 2026-08-08 — diagnósticos de renderização

- produzida uma matriz controlada de três `.mcaddon` temporários para isolar o desaparecimento angular das faces horizontais da cabeça somente na caldeirinha;
- a `1.1.7a` (`[1,1,7]`) mantém a geometria 1.1.6 e move estrutura, aspersório e água para `opaque`;
- a `1.1.7b` (`[1,1,8]`) mantém a geometria 1.1.6, usa `opaque` na estrutura/aspersório e preserva `blend` somente na água;
- a `1.1.7c` (`[1,1,9]`) mantém `blend` uniforme e substitui apenas a cabeça por seis paredes integrais mais vinte faixas de terraço de face única, sem centros horizontais enterrados nem a otimização lateral da 1.1.5;
- cada diagnóstico recebe nomes, ícones, revisões e UUIDs próprios, mas conserva os mesmos IDs públicos; somente um par BP/RP pode ser ativado por mundo de teste;
- scripts de gameplay e textura da água são byte-idênticos nos três pacotes; A/B diferem da baseline somente por manifests, ícones e material da caldeirinha;
- Creator Tools aprovou A/B com os onze avisos offline conhecidos e nenhum aviso novo de `MaterialInstances`; C acrescenta 34 avisos esperados de mais de cinquenta cubos, aceitos somente no diagnóstico;
- os três pacotes permanecem artefatos diagnósticos; somente o perfil material comprovado da B foi promovido à release oficial 1.1.7.

## 1.1.6 — 2026-08-07

- corrigida a regressão da v1.1.5 em que as paredes `east`/`west` da cabeça, distribuídas entre aros finos, eram descartadas pelo renderizador de blocos do Bedrock e deixavam dois lados vazados na mesa e na caldeirinha;
- restaurados seis volumes estáveis para anel inferior, domo inferior, corpo perfurado, domo superior, anel superior e terminal, cada qual com quatro paredes laterais integrais e UV per-face inteiro;
- preservada a correção da competição original: em cada uma das cinco junções apenas um dos dois volumes fornece a tampa horizontal, portanto nenhuma dupla de faces renderizadas ocupa o mesmo plano;
- a malha compartilhada retorna a quatorze peças — oito no cabo e seis na cabeça — sem mudar envelope, acabamento, perfurações, pivô, locator, pose ou composição;
- o validador bloqueia tanto faces coplanares sobrepostas quanto a fragmentação futura das seis paredes estáveis, e exige a cobertura horizontal única de cada junção;
- o rótulo e a revisão numérica distribuídos são `1.1.6`/`[1,1,6]`.

## 1.1.5 — 2026-08-07

- eliminada na fonte a topologia que fazia as tampas superiores e inferiores da cabeça desaparecerem conforme o ângulo somente na composição `blend` da caldeirinha;
- substituídas cinco junções de cuboides fechados, que acumulavam aproximadamente `62.34` unidades quadradas de faces coplanares/ocultas, por coroas anulares de quatro peças e núcleos limitados às paredes exteriores;
- preservados os seis níveis, envelope `4.94`, altura, terminal, perfurações, pivô, locator, densidade UV e todas as variantes de acabamento da cabeça;
- a malha compartilhada passa a ter vinte e seis peças: oito no cabo e dezoito na cabeça exterior-only; os próprios aros carregam paredes e terraços, mantendo caldeirinha e mesa abaixo do aviso de cinquenta cubos do Creator Tools;
- o validador agora bloqueia sobreposição de área entre faces renderizadas da cabeça, restauração de tampas centrais ocultas, divergência de máscaras/UVs e drift das composições acomodadas;
- mantido o `blend` uniforme da caldeirinha para preservar a água translúcida e evitar a regressão do aviso de `MaterialInstances`; nenhuma mudança foi feita em gameplay, estado, poses ou materiais;
- o rótulo e a revisão numérica distribuídos são `1.1.5`/`[1,1,5]`.

## 1.1.4 — 2026-08-07

- eliminada na fonte a causa estrutural da cintilação observada exclusivamente na Mesa do Sacristão: couro, placa terminal e colar deixaram de ocupar volumes positivos simultâneos;
- reconstruído o colar como aro prateado realmente vazado, formado por quatro barras ao redor da empunhadura, com abertura interna de `1.75 × 1.75`, folga radial de `0.0625` e envelope externo de `2.15 × 2.15`;
- reduzida a placa terminal sólida para `2.25 × 0.6 × 2.25` e assentada a empunhadura em `y = 21.8`, preservando o comprimento total de `15.6`, o grip empírico, a silhueta em dois estágios e todos os pivôs/locators;
- introduzidas máscaras autorais de faces: tampas internas de couro, haste e aro não são mais geradas, enquanto todas as superfícies externas necessárias mantêm UV per-face inteiro, padding e color/normal/MER coerentes;
- item, caldeirinha e mesa passam a derivar a mesma malha de quatorze cubos; validadores bloqueiam interseção positiva na transição do pomo, divergência de máscaras e drift da réplica `0.72` da mesa;
- corrigidos os dois visualizadores para respeitar a semântica Bedrock de face UV omitida, com teste automatizado dedicado;
- preservados IDs, UUIDs, block states, binding, poses, animações, gameplay, persistência, perfis, acabamentos e custo zero;
- o rótulo e a revisão numérica distribuídos são `1.1.4`/`[1,1,4]`.

## 1.1.3 — 2026-08-07

- substituída a antiga lâmina única do pomo por uma construção metálica em dois estágios, com base `2.25 × 0.8 × 2.25` e colar `1.9 × 0.7 × 1.9`;
- o novo volume nasce em `assets-src/models/aspergillum.model.json` e, portanto, melhora de forma coerente o item empunhado, a caldeirinha e a Mesa do Sacristão;
- removida a compensação geométrica exclusiva da mesa introduzida na 1.1.2; todas as apresentações voltam a ser derivações diretas da mesma malha de onze cubos;
- preservados comprimento total, centro, grip, pivôs, binding, poses, locator, UVs explícitos e gameplay;
- o rótulo e a revisão numérica distribuídos são `1.1.3`/`[1,1,3]`.

## 1.1.2 — 2026-08-07

- reconstruído o ritmo vertical do `CustomForm` com cinco `spacer()` nativos: respiro abaixo do título da mesa, ao redor dos dois cabeçalhos e antes de **Restaurar padrão**;
- removido o divisor entre perfil e acabamento que era renderizado como uma seção vazia; somente o divisor legítimo do grupo final de ações permanece;
- preservado o respiro já aprovado de **Concluir e retirar**/**Fechar**, sem reintroduzir microcopy ou rolagem desnecessária;
- estabilizada a extremidade do cabo somente na réplica sobre a mesa: o pomo recebe profundidade axial de `0.56` e a emenda interna com o couro fica limitada a `0.04`, eliminando a competição subpixel observada no Bedrock;
- o attachable empunhado, a posição aprovada sobre o veludo, os dez cubos, UVs, acabamentos, perfis, estado e gameplay permanecem inalterados;
- adicionadas validações de regressão para a contagem de espaçadores/divisores e para a geometria anti-flicker da emenda;
- o rótulo e a revisão numérica distribuídos são `1.1.2`/`[1,1,2]`, evitando colisão de cache com a 1.1.1 já importada.

## 1.1.1 — 2026-08-07

- refinada a composição ocupada da Mesa do Sacristão após validação em jogo da 1.1.0: a réplica do aspersório agora usa escala uniforme `0.72`, centro geométrico coincidente com o pivô e posição contida no nicho do tampo;
- ampliado o veludo verde para preencher todo o interior de `13 × 13` entre as bordas elevadas, sem alterar a moldura já aprovada;
- removidos os dois apoios de latão do tampo; o latão permanece somente como acento funcional no puxador da gaveta e no próprio instrumento;
- destilada a interface nativa para perfil, metal, empunhadura, restauração, retirada e fechamento: removidos cabeçalho de item/cargas, texto de gratuidade, status persistente e demonstração encoberta pelo formulário;
- substituído o `closeButton()` nativo, que exibia `Close` em português, por uma ação explícita localizada como **Fechar**/**Close**;
- falhas de atualização continuam fail-soft e agora recebem action bar localizada; escolhas bem-sucedidas permanecem silenciosas e são confirmadas pela seleção e pela prévia física;
- preservados custo zero, aplicação reativa, nove cosméticos, três perfis, snapshots, identidade, cargas, sessões exclusivas, rollback, binding, animações e VFX autoritativos;
- o rótulo e a revisão numérica distribuídos são `1.1.1`/`[1,1,1]`, evitando colisão de cache com o pacote 1.1.0 já importado.

## 1.1.0 — 2026-08-07

- adicionada a **Mesa do Sacristão**, um bloco imutável de madeira escura, veludo verde e ferragens sóbrias, com dezesseis rotações, estado visual ocupado e recuperação transacional do item em retirada ou quebra;
- introduzida interface nativa estável com `CustomForm`: seções claras, dropdowns reativos, status ao vivo, restauração clássica, demonstração cosmética e ação explícita de concluir/retirar;
- toda configuração é gratuita: nenhuma escolha ou demonstração consome item, água ou carga; a receita cobra apenas a construção da estação;
- adicionados os perfis `standard`, `processional` e `contained`; todos preservam uma carga por aspersão, 36 gotas, seis pulsos, janela de release e cooldown, variando somente forma, velocidade e resposta do leque;
- adicionadas nove combinações estáveis de acabamento entre prata clássica, prata envelhecida e dourado festivo com couro castanho, vinho ou preto;
- preservado `aspergillum:aspergillum` como variante clássica e adicionados oito IDs públicos de item/attachable; a troca cosmética conserva `instance_id`, cargas, nome, schema e propriedades customizadas;
- a caldeirinha passa a refletir o acabamento do item acomodado por `aspergillum:cosmetic`; mundos existentes assumem índice `0` (clássico) e não exigem migração destrutiva;
- sessões de personalização são exclusivas por jogador e mesa, revalidam distância, dimensão, bloco e snapshot a cada mudança e liberam locks em fechamento, retirada, quebra, morte, saída ou troca de dimensão;
- a demonstração usa somente seis gotas limitadas e cooldown local de 20 ticks, sem alterar água, carga, inventário ou cooldown de gameplay;
- gerador e validadores agora cobrem o catálogo cosmético, nove conjuntos color/normal/MER, variantes de item/attachable/cal­deirinha/mesa, 288 estados da mesa e 5.184 estados da caldeirinha;
- a ferramenta de captura ganhou os assuntos `table` e `table-docked`; a composição foi revisada em cinco vistas PBR antes do gate físico;
- adotado o módulo estável `@minecraft/server-ui` `2.1.0`; `@minecraft/common` `1.3.0` fica somente no toolchain npm, pois não é módulo válido de manifest; não há Beta APIs, JSON UI customizado ou Creator Features experimentais;
- a 1.0.20, validada em jogo, permanece a baseline de economia, docking parcial, animação, VFX, áudio, binding e persistência;
- o rótulo e a revisão numérica distribuídos são `1.1.0`/`[1,1,0]`.

## 1.0.20 — 2026-08-07

- redefinido o docking como transferência parcial conservativa: a caldeirinha recebe `min(cargas, 16 - água)` e o restante permanece no aspersório acomodado;
- removida a recusa por overflow; todas as 85 combinações `0..16 × 0..4` agora podem ser acomodadas com conservação exata de `água + cargas` em Sobrevivência, Aventura e Criativo;
- elevado o snapshot interno do item acomodado para schema 2 com `charges` normalizadas; snapshots schema 1 migram para zero porque suas cargas já haviam sido devolvidas pela regra anterior;
- retirada, quebra e reload passam a restaurar exatamente as cargas remanescentes, preservando `instance_id`, nome, cosmético, perfil e propriedades customizadas;
- feedback localizado distingue transferência integral, parcial e caldeirinha cheia; áudio de água usa somente a quantidade efetivamente transferida;
- docking e retirada negam Espectador explicitamente, sem depender do bloqueio de input vanilla;
- preservados binding, geometria `1.16.0`, poses, animações, VFX, cargas finitas, codec 4/16, UUIDs, block states, sessões, locks e APIs estáveis;
- o rótulo distribuído é `1.0.20`; a revisão monotônica dos packs é `[1,0,36]`.

## 1.0.19b — 2026-08-07

- refinada a cabeça do aspersório de quatro para seis volumes graduais, preservando largura máxima, comprimento total de `15,6` unidades, grip, pivôs, binding, locator e poses aprovadas;
- elevado o atlas autoral do item para `128 × 128` e a densidade das ilhas para dois texels por unidade, mantendo UVs per-face inteiros e padding dilatado de dois texels;
- redesenhadas as superfícies de couro, prata, ouro e prata perfurada nos mapas color/normal/MER, com enrolamento do grip, relevo discreto, duas fileiras de aberturas por face e faixa equatorial limpa;
- introduzida a fonte autoral `assets-src/models/aspersorium.model.json`; a geometria distribuída da caldeirinha e suas dezesseis rotações passam a ser geradas a partir dela;
- removida a cópia simplificada de quatro cubos usada no estado acomodado: os dez cubos do item são agora transladados automaticamente para `resting_aspergillum`, com as mesmas dimensões e ilhas UV;
- o atlas da caldeirinha reserva e reutiliza os mapas do item acomodado, preservando couro escuro, pomo e haste prateados, férula dourada, cabeça perfurada, normal e MER na composição;
- substituído o padrão quadriculado agressivo da caldeirinha por metal martelado de menor contraste, sem alterar geometria externa, água, colisão, seleção, rotações ou block states;
- ampliado o validador para bloquear divergência de cubo ou face entre o item empunhado e o acomodado, além de fixar densidade 2× e os novos atlas `128 × 128`/`256 × 256`;
- registradas capturas PBR reproduzíveis em nove vistas para baseline e candidata; a aceitação final continua dependente do pacote importado e do Content Log;
- preservados gameplay, Script API estável, UUIDs, namespace, schemas, sessões, locks, persistência, áudio, animações e 36 gotas em seis pulsos;
- o rótulo distribuído é `1.0.19b`; a revisão monotônica dos packs é `[1,0,35]`.

## 1.0.19a — 2026-08-07

- adicionada uma ferramenta headless de evidência visual que captura aspersório, caldeirinha e composição acomodada em nove vistas reproduzíveis, exporta PNGs individuais, pranchas rotuladas e um manifesto da execução sem alterar os assets do pack;
- aprimorados os controles de viewport dos dois renderizadores: zoom no ponto sob o cursor, órbita no botão esquerdo, deslocamento no botão direito e barra Bedrock com grade, eixos, pivôs/locators e wireframe, incluindo atalhos de teclado;
- estabilizado o pan do botão direito: interação direta sem atraso de damping, bloqueio de menu contextual, recuperação em cancelamento/perda de foco e proteção contra seleção acidental durante o deslocamento;
- corrigido o desaparecimento lateral dos anéis, haste fina e terminal do aspersório no Minecraft: seis dos oito cubos usavam Box UV com ao menos uma dimensão física inferior a uma unidade, capaz de colapsar para zero texel no runtime;
- preservados exatamente os oito cubos, origins, sizes, envelope de `15,6` unidades, grip `[-6,24,1]`, locator, binding, poses e animações; nenhuma compensação geométrica foi aplicada ao osso vinculado;
- introduzida a fonte autoral `assets-src/models/aspergillum.model.json`, com nomes e superfícies semânticas por peça;
- o gerador passa a emitir seis UVs per-face explícitos por cubo, `uv_size` inteiro por `ceil` com mínimo de um texel, ilhas sem sobreposição e padding dilatado de dois texels para proteger mipmaps;
- color, normal e MER agora nascem do mesmo atlas semântico, eliminando a antiga mistura acidental de prata e ouro entre lados do pomo e do terminal;
- o pomo e a haste permanecem prata, o grip permanece couro, a férula sob a cabeça permanece ouro e a cabeça conserva prata perfurada coerente com a referência visual;
- o validador bloqueia Box UV subpixel, face ausente, footprint nulo, UV fracionário, divergência entre fonte e geometria gerada, sobreposição e extrapolação do atlas;
- os dois viewers passam a usar front-face culling nos sólidos; o catálogo sinaliza Box UV subpixel e faces per-face ausentes/colapsadas, evitando previews permissivos que escondam defeitos do pack;
- corrigida nos dois viewers a atribuição de UVs à topologia do `THREE.BoxGeometry`: os quatro vértices agora seguem a ordem por linhas, `south`/`north` acompanham `+Z`/`-Z` e `uv_size` negativo preserva espelhamento, eliminando texels cisalhados em triângulos/losangos;
- centralizado o adaptador Bedrock → Three.js e adicionados testes automatizados contra regressões de ordem dos vértices, faces, Box UV e UV per-face;
- adicionados diagnóstico reproduzível e gate manual de órbita completa em primeira/terceira pessoa, Steve/Alex/Persona e gráficos clássico/Vibrant Visuals;
- preservados áudio da 1.0.19, gameplay, Script API estável, UUIDs, namespace, block states, schemas e contratos persistentes;
- o rótulo distribuído é `1.0.19a`; a revisão monotônica dos packs é `[1,0,34]`.

## 1.0.19 — 2026-08-05

- substituído o mix provisório baseado em sons vanilla por 15 famílias semânticas e 48 variantes próprias em OGG Vorbis mono/48 kHz;
- introduzidos `AudioPort`, adaptador Bedrock fail-soft, catálogo tipado e shuffle bags por jogador/família sem repetição imediata;
- separadas pistas privadas do ator (`dry`, preparações de carga e aspersão) de eventos espaciais do mundo (fill, commits 1–4, dock, retorno de água, undock e release);
- migrados áudio e bridge do release para o commit autoritativo no tick 5; um único frame físico alimenta som, bridge e primeiro pulso, sem duplicação pela timeline do attachable;
- o cooldown nativo agora é pré-condição real: ausência ou falha cancela a sessão antes de preparar ou agendar o release;
- commits de fill/load/dock/undock só emitem áudio depois de suas transações válidas; fill não deixa mais bloco e balde divergirem em falha parcial;
- itens já inicializados deixam de ser regravados em interações comuns e cargas Creative inalteradas não produzem clones desnecessários;
- controller de ação rearma uma nova aspersão válida mesmo se o cooldown reiniciar durante recovery;
- adicionada cadeia reprodutível de fontes MP3 versionadas, masters WAV, 48 OGGs, catálogo, recipes, hashes e validação automatizada;
- registrada a cadeia reproduzível dos 48 SFX próprios, das fontes selecionadas aos masters, OGGs e hashes;
- preservados integralmente binding, poses, animações, steering, 36 gotas/seis pulsos, economia 4/16, schemas e identificadores públicos;
- o rótulo distribuído é `1.0.19`; a revisão monotônica dos packs é `[1,0,33]`.

## 1.0.18g — 2026-08-05

- corrigida a rejeição runtime da caldeirinha causada pelo state `aspergillum:water_level` com dezessete valores, acima do limite de dezesseis observado no Bedrock 26.40;
- preservada a capacidade lógica exata `0..16` por um codec radix-9 em dois states pequenos: `aspergillum:water_base` (`0|9`) e `aspergillum:water_offset` (`0..8`);
- centralizadas leitura, codificação e escrita da água na infraestrutura; application e domínio continuam trabalhando somente com unidades lógicas `0..16`;
- as duas parcelas são aplicadas à mesma `BlockPermutation` e gravadas uma única vez, preservando commit e rollback transacionais;
- o espaço cartesiano do bloco passa a 576 combinações, com gate automatizado de cardinalidade máxima de dezesseis valores por state;
- adicionados testes de round-trip para as dezessete quantidades e normalização defensiva da única combinação não canônica;
- preservados capacidade `4/16`, quatro quartos visuais, animação, VFX, binding, sessões, locks, docking e APIs estáveis da 1.0.18f;
- o rótulo distribuído é `1.0.18g`; a revisão monotônica dos packs é `[1,0,32]`.

## 1.0.18f — 2026-08-05

- alinhado o alvo dos manifests com o lançamento estável Minecraft Bedrock 26.40 (`min_engine_version` `1.26.40`);
- atualizado o módulo estável `@minecraft/server` de `2.8.0` para `2.9.0`, sem adotar a linha beta `2.10.0`;
- preservados integralmente binding, geometria `1.16.0`, poses, animações, VFX, cargas finitas, sessões, locks, docking e identificadores públicos;
- nenhuma API ou feature experimental foi introduzida; o add-on continua sem exigir experimentos;
- o rótulo distribuído é `1.0.18f`; a revisão monotônica dos packs é `[1,0,31]`.

## 1.0.18e — 2026-08-05

- ampliada a capacidade persistente do aspersório de `3` para `4` cargas e a capacidade exata da caldeirinha de `3` para `16` unidades de água benta;
- separados os conceitos de carga do item e água do reservatório em constantes e normalizadores independentes, eliminando o antigo acoplamento por `MAX_CHARGES`;
- um balde agora completa `16/16`, e uma caldeirinha cheia fornece exatamente quatro carregamentos completos de `4/4`;
- expandido `aspergillum:water_level` para `0..16`, sem migração de caldeirinhas já colocadas conforme decisão explícita de desenvolvimento;
- adicionada a superfície `water_high` e reorganizados os quatro quartos visuais: `1..4`, `5..8`, `9..12` e `13..16`;
- docking devolve até quatro cargas e recusa overflow somente acima de `16`, preservando a transação, o snapshot e os metadados existentes;
- elevado o schema do item para `3`; itens schema 2 preservam as cargas finitas e recebem lore/action bar `/4` ao serem inicializados;
- cobertura do domínio ampliada para as 85 combinações `0..4 × 0..16`, além de normalização independente do reservatório e contratos visuais/estruturais;
- preservados integralmente binding, poses, animações, partículas, sons, sessões, locks, Criativo contextual e VFX da 1.0.18d;
- o rótulo distribuído é `1.0.18e`; a revisão monotônica dos packs é `[1,0,30]`.

## 1.0.18d — 2026-08-05

- corrigidos os caracteres `%` residuais exibidos nas cargas da action bar e da lore em português e inglês;
- substituídos os placeholders `%%1`/`%%2`, incompatíveis com os caminhos runtime observados, por `%s` sequenciais preenchidos pelo mesmo `RawMessage.with`;
- adicionada a sequência explícita `§r` + cor em todas as mensagens e linhas de lore, removendo o itálico herdado e preservando a hierarquia cinza/azul/vermelho;
- mantidos textos, significados, cargas, schema e propriedades persistentes; itens existentes recebem a nova apresentação diretamente do Resource Pack, sem migração destrutiva;
- ampliados testes e release gate para validar contagem de placeholders, ausência de `%` residual, reset tipográfico e paridade dos dois idiomas;
- preservados integralmente binding, poses, animações, VFX, sons, estado, concorrência e docking da 1.0.18c;
- o rótulo distribuído é `1.0.18d`; a revisão monotônica dos packs é `[1,0,29]`.

## 1.0.18c — 2026-08-05

- corrigido o erro de runtime `Precomputed cubic interpolation requires keyframes have constant data` introduzido na carga da 1.0.18b;
- substituída somente a combinação incompatível Catmull-Rom + Molang dinâmico por um envelope Hermite analítico dirigido por `query.anim_time`, avaliado a cada frame;
- preservados amplitude, peso por perspectiva, dip, retenção, settle, ponte TP de `rightarm.y`, duração autoritativa, commit no tick 10 e todos os contratos de estado;
- adicionado gate que rejeita Catmull-Rom pré-computado dentro da animação dinâmica de carregamento e valida a curva analítica a 120 Hz;
- o rótulo distribuído é `1.0.18c`; a revisão monotônica dos packs é `[1,0,28]`.

## 1.0.18b — 2026-08-05

- corrigido o solavanco final do braço em terceira pessoa durante o carregamento, sem alterar a coreografia visível aprovada na 1.0.18a;
- incorporada à própria carga uma ponte Hermite exclusiva de `rightarm.y`, nula em primeira pessoa e dirigida pelo mesmo `variable.attack_time` da curva vanilla;
- o gesto continua assentando em `0,80 s`; o contêiner técnico permanece ativo até `1,10 s` apenas para cancelar a descontinuidade vanilla de aproximadamente `-30° → 0°`;
- mantidos `override_previous_animation: false`, ausência de canal `rightitem`, peso FP `0.32`, amplitude TP integral e fade defensivo reduzido para `0,05 s`;
- ampliado o validador para preservar os keyframes locais, conferir a expressão em cada amostra e medir a soma vanilla + ponte: costura Y inferior a `0,001°` e erro vetorial total pré-reset de aproximadamente `0,094°`;
- preservados binding, grip, poses, duração autoritativa de 16 ticks, commit no tick 10, cargas, água, sessões, partículas, sons e aspersão;
- o rótulo distribuído é `1.0.18b`; a revisão monotônica dos packs é `[1,0,27]`.

## 1.0.18a — 2026-08-04

- corrigido o desaparecimento do aspersório durante o carregamento em primeira pessoa, sem alterar binding, grip ou pose estática;
- removidos da carga o reset `override_previous_animation: true` e o canal absoluto de `rightitem`, que deslocavam toda a cadeia do attachable para fora do campo de visão;
- recomposta a carga sobre o movimento vanilla como correção aditiva exclusiva de `rightarm`, com peso `0.32` em primeira pessoa e amplitude integral em terceira;
- redesenhado o gesto de 0,8 s como arco Catmull-Rom único, com entrada neutra, desaceleração na imersão, retenção curta e settle antes do encerramento;
- mantidos o commit transacional no tick 10, água, cargas, sessões, locks, rollback, microgotas, sons e toda a aspersão aprovada;
- ampliado o validador de coreografia com contrato próprio para carregamento, envelope de movimento, limites de continuidade e proibição de `rightitem`;
- o rótulo distribuído é `1.0.18a`; a revisão monotônica dos packs é `[1,0,26]`.

## 1.0.18 — 2026-08-04

- promovida a baseline validada da 1.0.17a ao primeiro Release Candidate da V1, sem alterar binding, poses, animação, spray, steering ou persistência;
- substituída a seleção manual português/inglês por 25 mensagens `RawMessage` traduzidas pelo próprio cliente no action bar;
- lore ampliada com instruções explícitas de carregar, acomodar e retirar; itens existentes de três linhas são atualizados de forma lazy sem novo schema;
- texto do botão contextual alterado de “Examinar” para “Usar aspersório”, eliminando a impressão de que a caldeirinha possui menu ou inventário próprio;
- centralizados os seis cues sonoros script-side num mix tipado e fail-soft, mantendo exatamente os eventos, pitches e volumes já aprovados;
- adicionado feedback molhado mínimo de duas microgotas dentro da caldeirinha no commit válido do carregamento;
- adicionado gate automatizado de Release Candidate para paridade de localização, caminhos únicos de som/HUD, ausência de intervalos ilimitados, lore final e consistência de versões;
- adicionados testes de catálogo UX, envelope sonoro e orçamento do feedback molhado; LOD continua deliberadamente ausente até haver medição física com 1/4/8/16 jogadores;
- criado runbook de go/no-go da V1 e atualizado o plano de QA manual final;
- o rótulo distribuído é `1.0.18`; a revisão monotônica dos packs é `[1,0,25]`.

## 1.0.17a — 2026-08-04

- corrigido o docking que podia não receber nenhuma interação ao agachar e usar o aspersório na caldeirinha;
- adicionado `ItemCustomComponent.onUseOn`, rota estável específica para o item usado sobre o bloco, sem remover o fallback `onPlayerInteract` do custom component da caldeirinha;
- a intenção carregar/acomodar agora captura `Player.isSneaking` sincronicamente durante o evento, evitando que a leitura diferida observe outro estado de input;
- ambas as rotas convergem no mesmo dispatcher e usam uma claim curta por jogador/bloco para impedir execução duplicada quando o runtime emite os dois eventos;
- preservados integralmente snapshots, overflow, cargas, animações, partículas, poses e todos os identificadores públicos;
- o rótulo distribuído é `1.0.17a`; a revisão monotônica dos packs é `[1,0,24]`.

## 1.0.17 — 2026-08-04

- introduzido schema 2 para itens, preservando cargas finitas e adicionando `cosmetic_id`, `spray_profile_id` e migração real de schemas ausente/0/1;
- schemas futuros deixam de ser sobrescritos e operações mutáveis são recusadas com feedback explícito;
- lore convertida para `RawMessage` com tradução client-side em português e inglês;
- inicialização ampliada para todo o inventário, com reparo defensivo de `instance_id` duplicado;
- implementado `DockedItemRegistry` persistente em dynamic properties do mundo, com shards por dimensão/chunk e sanitização de dados;
- docking passa a preservar `nameTag`, identidade, perfil, cosmético e propriedades dinâmicas customizadas serializáveis;
- overflow de água é recusado sem alterar item ou bloco; retirada passa a exigir mão vazia e possui rollback defensivo;
- caldeirinha tornada imóvel por pistões; quebra, explosão e destruição recuperam o item real pelo `onBreak`, enquanto a loot table evita duplicação;
- adicionados testes exaustivos de docking, migração, corrupção de registry e invariantes de persistência no validador do pacote;
- incorporado o refinamento cromático solicitado após a 1.0.16c, reduzindo a saturação do azul sem alterar física, lifetime ou escala das gotas;
- o rótulo distribuído é `1.0.17`; a revisão monotônica dos packs é `[1,0,23]`.

## 1.0.16c — 2026-08-04

- diagnosticada a causa exata da regressão cromática da 1.0.16b: o runtime interpretou os oito dígitos dos gradientes como `#AARRGGBB`, convertendo as chaves finais `#2A66B000`/`#2F70BE00` em verde e a chave inicial `#CDEBFFFF` em quase branco;
- substituídas todas as chaves hexadecimais de oito dígitos por arrays RGBA normalizados `[r,g,b,a]`, removendo a ambiguidade entre referências antigas e atuais do schema;
- recalibradas gotas principais para azul aquático saturado desde `[0.12,0.52,0.88,1]`, com azul dominante em todas as fases da vida;
- recalibrados separadamente bridge e micro-splash para leitura azul natural, sem branco excessivo no nascimento nem amarelo/verde no impacto;
- preservados integralmente textura radial, material, física, trajetória, velocidade, lifetime, tamanho, colisão, 36 gotas, seis pulsos, steering, animação, locator e áudio;
- validadores agora rejeitam cores hexadecimais ambíguas, canais fora de `0..1` e qualquer keyframe onde azul não domine verde e vermelho;
- o rótulo distribuído é `1.0.16c`; a revisão monotônica dos packs é `[1,0,22]`.

## 1.0.16b — 2026-08-04

- corrigida a dominante verde/amarela percebida no fade das gotas e nos micro-respingos de impacto;
- substituída a dupla coloração ciano por um sprite-base neutro e gradientes azul-frio dedicados ao bridge, leque balístico e splash;
- removido `minecraft:particle_appearance_lighting` exclusivamente das partículas de água, impedindo que luz local colorida altere seu matiz; transparência e gradiente continuam controlando o desaparecimento;
- preservados integralmente quantidade, trajetória, velocidade, gravidade, lifetime, tamanho, colisão, steering, animação, locator e áudio da 1.0.16a;
- ampliada a validação para congelar a paleta aprovada, a neutralidade da textura-fonte e a independência cromática da iluminação local;
- o rótulo distribuído é `1.0.16b`; a revisão monotônica dos packs é `[1,0,21]`.

## 1.0.16a — 2026-08-04

- corrigido o erro de runtime de `minecraft:emitter_local_space`: o bridge agora herda posição e rotação juntas, combinação suportada pelo Bedrock;
- restaurados no leque principal o billboard `rotate_xyz` e o envelope `0.042 × 0.100` da 1.0.15d, revertendo a perda de visibilidade causada pelo streak menor e orientado pela velocidade;
- preservados velocidade, gravidade, lifetime, alcance, 36 gotas, seis pulsos e steering; a sensação excessivamente rápida era perceptual, não uma alteração da balística;
- desacelerado o bridge da ponta para `1.35–1.75` blocos/s, ampliado para `0.028 × 0.060` e estendido para `0.26–0.38 s`, criando uma conexão legível e suave sem formar um segundo leque;
- ampliado o validador para bloquear novamente a combinação inválida `rotation: true`/`position: false` e qualquer regressão do perfil visual aprovado;
- o rótulo distribuído é `1.0.16a`; a revisão monotônica dos packs é `[1,0,20]`.

## 1.0.16 — 2026-08-04

- congelada integralmente a animação 1.0.15d depois da confirmação física de que o solavanco final foi eliminado;
- adicionados o bone técnico `spray_aim` e o locator `aspergillum_tip`, uma unidade além da face da cabeça e sem qualquer alteração em binding, grip, malha ou poses;
- introduzido um bridge world-space de quatro microgotas no release do tick 5 para ligar visualmente a cabeça renderizada ao leque, sem criar uma segunda aspersão;
- preservadas as 36 gotas balísticas em seis pulsos, resposta de steering `0.8`, limite de `30°`, transporte paralelo e comportamento multiplayer do emissor script-side;
- orientadas as gotas principais pela velocidade, reduzido o billboard próximo da câmera e adicionada curva de escala ao longo da vida;
- adicionado micro-splash cosmético em colisões elegíveis, sem autoridade sobre gameplay;
- adicionados eventos sonoros próprios de preparação e release na timeline válida do attachable; removido o splash válido do script para impedir duplicação;
- criado `VFX_DESIGN_CONTRACT.md` e `validate-vfx.mjs`, bloqueando perda do locator, duplicação do leque, regressão das 36 gotas e inconsistências de timeline;
- o rótulo distribuído é `1.0.16`; a revisão monotônica dos packs é `[1,0,19]`.

## 1.0.15d — 2026-08-04

- identificado no `player.animation.json` oficial que o swing vanilla de terceira pessoa mantém `rightarm.y` próximo de `-30°` até o último instante e então o zera por um ramo condicional, explicando o teleporte que persistiu sem qualquer timeline corporal customizada;
- adicionada uma ponte de recuperação estritamente aditiva e limitada a `rightarm.y`, dirigida pelo mesmo `variable.attack_time` público usado pelo player vanilla;
- mantida a ponte neutra durante a primeira metade do swing; entre 50% e 100%, uma curva Hermite compensa progressivamente o viés de `-30°`, preservando follow-through e chegando ao repouso com velocidade nula;
- aplicada proteção explícita para primeira pessoa e para os endpoints `attack_time <= 0`/`>= 1`, de modo que a pose aprovada de câmera permaneça intocada e a animação finita expire já em zero;
- preservados integralmente binding, grip, poses estáticas, `aspergillum_action`, release no tick 5, 36 gotas, steering, carregamento, estado e concorrência;
- ampliado o validador de coreografia para reproduzir a costura vanilla de `30°`, comprovar a neutralização antes do reset, limitar a recuperação a `3,82°` por frame a 30 FPS e permitir somente uma reversão intencional entre follow-through e retorno;
- o rótulo distribuído é `1.0.15d`; a revisão monotônica dos packs é `[1,0,18]`.

## 1.0.15c — 2026-08-04

- preservados integralmente binding, geometria, poses estáticas, grip, carregamento, coreografias locais FP/TP, controller, release no tick 5, partículas, steering, sessões e políticas de estado da 1.0.15b;
- removida somente a correção corporal de aspersão disparada por `Entity.playAnimation()`, pois o teste físico confirmou que sua timeline tardia terminava fora de fase com o recovery vanilla e causava o solavanco final;
- tornado o swing vanilla o único proprietário do movimento e do retorno do braço, evitando disputa entre duas timelines sem reduzir a duração, a agilidade ou a amplitude do gesto nativo;
- mantido `aspergillum_action` como proprietário exclusivo da antecipação, flick, pose heroica, follow-through e settle do instrumento, com coreografias independentes em primeira e terceira pessoa;
- reforçados os validadores para rejeitar qualquer animação corporal de aspersão, referência compilada a `playSprinkleAnimation` ou retorno de `rightarm/rightitem` à coreografia local;
- preservada a animação one-shot de carregamento, que é um fluxo separado e não participou do defeito observado;
- o rótulo distribuído é `1.0.15c`; a revisão monotônica dos packs é `[1,0,17]`.

## 1.0.15b — 2026-08-04

- preservados integralmente binding, geometria, malha, grip, escala, poses estáticas, carregamento, estado, partículas, steering e build determinístico da 1.0.15;
- substituída a aspersão absoluta sobre `rightarm/rightitem` por uma correção corporal aditiva de baixa amplitude, limitada exclusivamente a `rightarm` e sem `override_previous_animation`;
- mantido o swing vanilla como fundação fluida, eliminando a sequência determinística “swing → reset → segundo começo” observada na 1.0.15;
- ativado o osso `aspergillum_action` como raiz real da coreografia do instrumento, sem mover `aspergillum_bound` ou `aspergillum_presentation`;
- adicionadas coreografias locais distintas: primeira pessoa compacta e camera-safe; terceira pessoa com antecipação, flick, pose heroica, follow-through e settle;
- adicionado controller `idle → sprinkle → recovery`, condicionado ao cooldown válido da mão principal, com crossfade de `0,08 s` e rotação pelo menor caminho;
- adotada interpolação Catmull-Rom com poses neutras duplicadas nas bordas e breakdown TP adicional para limitar a mudança a menos de `10°` por frame a 30 FPS;
- deslocados commit, som e primeiro pulso do tick 4 para o tick 5; os seis pulsos agora ocupam os ticks 5–10, preservando 36 gotas e a curvatura controlada;
- criado `validate-animation-choreography.mjs`, que amostra a 120 Hz e bloqueia `rightitem`, reset absoluto, amplitudes excessivas, translação local acima de `0,5`, endpoints não neutros e desalinhamento do release;
- o rótulo distribuído é `1.0.15b`; como manifests Bedrock aceitam somente trincas numéricas monotônicas, a revisão interna dos packs é `[1,0,16]`.

## 1.0.15 — 2026-08-03

- preservados integralmente geometry `1.16.0`, `aspergillum_bound`, item-slot binding, grip, escala e poses aprovadas de primeira/terceira pessoa;
- introduzida a hierarquia `aspergillum_presentation → aspergillum_action → handle/sprinkler_head`, sem translação no osso vinculado e sem locator prematuro;
- adicionadas animações one-shot próprias de carregamento (`0,8 s`) e aspersão (`0,9 s`), limitadas aos bones `rightarm` e `rightitem` e acionadas por `Entity.playAnimation()` estável;
- separada a aspersão em reserva no swing e commit no release do tick 4: cancelamento anterior não consome carga; cancelamento posterior interrompe pulsos sem reembolso;
- introduzidos `SprinkleSession` e `ActionLease`, impedindo concorrência entre carregamento e aspersão e limpando timers/leases no ciclo de vida do jogador;
- mantido o cooldown nativo somente para tentativas com carga real; tentativa vazia continua sem água e com feedback seco;
- externalizado o perfil físico `standard`, preservando 36 gotas, seis pulsos, velocidades, escala, dispersão, origem, resposta `0.8` e giro máximo de `30°`;
- o primeiro pulso agora é suavizado desde a direção capturada no início do gesto, em vez de saltar diretamente para a câmera no release;
- implementado transporte paralelo da base lateral entre pulsos, eliminando a troca abrupta de eixo ao atravessar pitches verticais;
- ampliados testes para 20 casos e validações estruturais para hierarquia, timelines, bones animados, perfil, reserva/commit e invariantes do pacote;
- tornado o `.mcaddon` reprodutível, com ordem de arquivos e timestamps ZIP determinísticos;

- consolidado o estado real da v1.0.14, separando baseline comprovada, limitações atuais e arquitetura-alvo;
- formalizados os contratos congelados de binding, poses, escala, estado e curvatura controlada da rajada;
- criado roadmap incremental da v1.0.15 à v1.0.18, com gates, riscos e Definition of Done da V1;
- documentadas políticas de carga por modo, identidade, sessões, release point, docking persistente, schema 2 e concorrência;
- ampliada a estratégia de testes automatizados e a matriz manual de release;
- organizados pacotes em `dist/releases/`, relatórios em `dist/validation/<versão>/` e pesquisa local em `.research/`;
- adicionados `AGENTS.md`, índice documental, referências, lições aprendidas e validação automática de links/documentos.

## 1.0.14 — 2026-08-03

- restaurado o acompanhamento da câmera entre os seis pulsos da aspersão, recuperando a sensação de condução e controle solicitada após o teste da 1.0.13;
- substituída a leitura bruta de direção por interpolação esférica determinística, com resposta de 80% e limite de 30° por pulso;
- a origem matemática volta a acompanhar a posição atual do jogador, enquanto cada gota já emitida continua livre em world-space;
- preservados os cancelamentos por troca de item/dimensão, impedindo que uma rajada continue sem o aspergillum autorizado;
- mantidos sem alteração binding, poses, escala, quantidade, dispersão, velocidade, gravidade e cooldown;
- adicionados testes de curva de 90° e reversão completa de 180°, garantindo vetores unitários e finitos em todos os pulsos.

## 1.0.13 — 2026-08-03

- preservados sem alteração o binding `rightItem`, a geometria `1.16.0`, o grip base e a pose aprovada de primeira pessoa;
- refinada apenas a apresentação de terceira pessoa para `position [5, -1.5, -2.25]` e `rotation [10, 0, 0]`, produzindo pose efetiva aproximada `[35, 0, -12]`;
- corrigida a soma de carregamento para usar sempre a carga normalizada, inclusive diante de propriedades persistidas inválidas;
- introduzidas políticas explícitas de consumo: Sobrevivência/Aventura consomem água e cargas, Criativo retém ambas e Espectador é negado;
- mantidas cargas persistentes finitas no Criativo: o símbolo `∞` é somente feedback contextual e nunca um valor gravado no item;
- adicionado `aspergillum:instance_id` persistente a cada ItemStack para impedir que um item diferente receba o resultado de um carregamento iniciado por outro;
- implementadas sessões únicas por jogador, lock temporário por caldeirinha e revalidação de dimensão, slot, identidade, distância, água, ocupação e modo no commit de dez ticks;
- adicionada escrita coordenada de item e bloco com rollback defensivo em caso de falha parcial;
- canceladas sessões e rajadas em troca de slot, dimensão, modo, morte, respawn, saída ou alteração do item autorizado;
- congeladas a origem e a base vetorial da rajada no instante da liberação, impedindo que os seis pulsos se curvem quando a câmera gira;
- ampliada a suíte pura para 14 testes, cobrindo as 16 combinações de carga/água, normalização corrompida e políticas de retenção.

## 1.0.12 — 2026-08-03

- congelada a pose de primeira pessoa aprovada na 1.0.11, sem qualquer translação, escala ou rotação adicional;
- aplicada exclusivamente à apresentação de terceira pessoa a correção medida `position [5, -2.5, -1]`, trazendo o cabo para dentro e para baixo no punho e ligeiramente à frente do torso;
- aplicado exclusivamente à terceira pessoa o pitch aditivo `[6, 0, 0]`, produzindo orientação efetiva aproximada `[31, 0, -12]` sem tocar no binding nem no pivô;
- deslocada a origem matemática da aspersão para `0,55` bloco à frente, `0,48` à direita e `0,15` abaixo dos olhos, aproximação derivada da posição final do punho e do vetor punho→cabeça do instrumento;
- substituído o leque radial por uma distribuição anisotrópica de 36 gotas: maior dispersão horizontal e menos de um terço da dispersão vertical anterior;
- limitada a abertura vertical a aproximadamente `5,2°`, eliminando o aspecto de halo, anel ou domo em torno da mira e do jogador;
- preservada abertura horizontal máxima de aproximadamente `14,5°`, mantendo uma aspersão ampla e direcional;
- reduzido em cerca de 12% o maior billboard próximo da câmera, ainda mantendo as gotas maiores que as da 1.0.6;
- mantidos o alcance, gravidade, arrasto, colisão, iluminação, fade, material e sprite azul/ciano aprovados na 1.0.11;
- documentada a viabilidade oficial de locator no attachable; sua integração continua isolada para a etapa seguinte, depois da validação física do grip e do gatilho carregado/vazio.

## 1.0.11 — 2026-08-03

- recuperados e comparados os arquivos efetivamente instalados da 1.0.6, em vez de reconstruir a trajetória por aproximação;
- restaurada a origem comprovada da aspersão: `0,72` bloco à frente, `0,30` à direita e `0,42` abaixo da cabeça, evitando o jato excessivamente alto da 1.0.10;
- restaurada a emissão em grupos contíguos de direções ao longo de seis frames, preservando a progressão espacial mais natural da rajada antiga;
- ampliada a rajada de 24 gotas na 1.0.6 e 30 na 1.0.10 para 36 gotas, seis por frame;
- aumentado o raio do leque para maior dispersão e elevada a velocidade para `12,70–13,98` blocos/s; a simulação determinística indica cerca de um bloco adicional de alcance mediano em relação à 1.0.6;
- restaurados gravidade `-7,2`, arrasto `0,035`, colisão de raio `0,025`, duração e elevação vertical da 1.0.6;
- restaurados o sprite radial cheio, o material nítido `particles_alpha` e o billboard sempre voltado para a câmera;
- aumentadas as dimensões visuais para `0,044 × 0,105`, com escala individual de `0,84–1,08`, tornando as gotas substancialmente mais legíveis sem reintroduzir névoa verde;
- preservados o fade por variáveis suportadas, a iluminação ambiental, a colisão, o som sincronizado e toda a arquitetura de binding/pose da 1.0.10.

## 1.0.10 — 2026-08-03

- restaurada a aspersão visível sem alterar binding, hierarquia, grip, escala ou poses da 1.0.9;
- implementada emissão autoritativa pelo Script API estável com `Dimension.spawnParticle` e `MolangVariableMap`, mantendo o efeito visível aos jogadores da dimensão;
- ampliada a rajada para 30 gotas distribuídas exatamente uma vez em seis frames equilibrados, iniciados quatro ticks após o ataque;
- substituída a origem fixa por um arco curto que avança e se aproxima do centro durante a liberação, recalculado a partir da cabeça e direção atuais do jogador;
- criado leque determinístico mais sustentado, com velocidades entre 11,4 e 13,2 blocos/s variadas dentro de cada frame, gravidade, arrasto e colisão com expiração no contato;
- orientado o eixo longo de cada gota pela própria velocidade e adotado material `particles_blend`, iluminação ambiental e fade por `variable.particle_age / variable.particle_lifetime`;
- recriada textura azul/ciano de gota com bordas suaves; a névoa verde continua ausente e uma validação impede sua regressão;
- restaurados o som de splash no instante de liberação e testes que garantem distribuição completa das gotas, origem móvel e vetores normalizados;
- substituídas as proibições diagnósticas por invariantes que exigem partícula, textura, colisão, orientação, fade e emissão compilada.

## 1.0.9 — 2026-08-03

- preservados integralmente o schema `1.16.0`, o osso vinculado e a expressão de item-slot que já seguem corretamente o braço;
- separado o osso vinculado, agora neutro e sem cubos, do filho artístico `aspergillum_visual`;
- deslocada toda a malha em `+9Y`, colocando o centro do cabo escuro no grip empírico `[-6, 24, 1]` indicado pelos testes das versões 1.0.7 e 1.0.8;
- invertidos de forma controlada os sinais da orientação de repouso para `[25, 0, -12]`, corrigindo pitch e roll que apontavam para trás e para dentro;
- adicionadas poses de apresentação separadas: terceira pessoa preserva a pose da geometria e primeira pessoa aplica inversão end-for-end de 180° ao filho visual;
- adotado `format_version` `1.10.0` para o documento de animação, formato recomendado pelo validador oficial e pela documentação de upgrade;
- auditadas automaticamente as oito peças: dimensões estritamente positivas, box UV completo e textura empunhada integralmente opaca;
- mantidas desativadas animações de ação, locator, efeito e textura de partículas, isolando o teste de grip, orientação, enquadramento e faces.

## 1.0.8 — 2026-08-03

- preservados sem alteração o schema `1.16.0` e a expressão de binding comprovados pela 1.0.7;
- substituído o bastão diagnóstico pela malha real reduzida de 15,6 unidades, diretamente no mesmo osso vinculado;
- transladado o ponto de pega da origem dos pés `[0, 0, 0]` para o pivô oficial do `rightItem` `[-6, 15, 1]`;
- posicionados todos os cubos em torno desse grip, em vez de tentar deslocar o binding ou compensar a posição do root;
- aplicada somente uma rotação neutra de `[-25, 0, 12]`, dentro dos limites recomendados de pitch e roll e com pivô no cabo;
- mantidos material opaco, ausência de hierarquia filha, animações, locator e partículas para que o teste isole encaixe, faces e swing vanilla da malha real.

## 1.0.7 — 2026-08-03

- confirmado no diretório real do mundo que a 1.0.6 instalada era byte a byte idêntica ao pacote e que nenhum Resource Pack concorrente estava ativo;
- identificado que a geometria empunhada ainda declarava `format_version` `1.12.0`, enquanto o campo `binding` só é documentado no schema `1.16.0` e todos os exemplos oficiais vinculados usam `1.16.0`;
- criado teste controlado com um único osso renderizável, binding oficial completo e um único bastão 2×8×2;
- removidos temporariamente filho visual, rotação, locator, animações, controllers de animação e partículas;
- substituído `entity_alphatest` por `entity` opaco para eliminar transparência e cutout como variáveis;
- adicionadas validações que impedem qualquer recurso extra de entrar no pacote diagnóstico.

## 1.0.6 — 2026-08-03

- descartadas as transformações incompatíveis do tridente usadas na 1.0.5;
- separado o attachable em uma âncora sem malha ligada diretamente a `rightItem` e um osso visual filho, garantindo herança da cadeia do braço sem sobrescrever o binding;
- movido o ponto de pega para a origem local do cabo e redimensionada fisicamente a geometria para 15,6 unidades de comprimento e 4,94 unidades de largura máxima;
- removidos controller e animações de exibição que aplicavam grandes compensações ao próprio osso vinculado; as animações cerimoniais continuam movendo `rightarm` e `rightitem` do jogador;
- unificado o método de renderização dos materiais da caldeirinha, eliminando o aviso de `MaterialInstances`;
- acrescentada uma corrente à receita da caldeirinha, diferenciando-a da receita vanilla do caldeirão;
- recalculada a origem das gotas a partir do envelope da nova malha e distribuídas 24 gotas por seis frames, formando um leque de 0,25 segundo em vez de uma nuvem instantânea;
- reforçadas as validações para a hierarquia âncora → malha, escala física, ausência de overrides do binding, material uniforme e receita exclusiva.

## 1.0.5 — 2026-08-03

- reconstruído o attachable com base no tridente vanilla, substituindo o osso colidente `root` pelo osso exclusivo `aspergillum`;
- substituído o pivô incorreto `[0, 2, 0]` pelo referencial `[0, 24, 0]` usado por itens vanilla longos de 31 unidades;
- substituídas as transformações copiadas de um modelo de cabeça pelas poses oficiais de primeira e terceira pessoa do tridente;
- adicionado um animation controller próprio para alternar perspectivas com blend curto e manter o modelo no slot correto;
- sincronizada `minecraft:swing_duration` com o cooldown de 0,9 segundo, permitindo que o binding acompanhe integralmente o gesto do braço;
- movida a origem calculada das gotas para 0,72 bloco à frente e 0,30 bloco à direita, aproximando-a da cabeça do aspersório em vez do centro do tórax;
- adicionadas validações que proíbem regressão ao osso `root`, ao pivô anterior e às poses inadequadas.

## 1.0.4 — 2026-08-03

- corrigida a empunhadura pela arquitetura própria de attachables vinculados: geometria em coordenadas locais e transformações de exibição distintas para primeira e terceira pessoa;
- normalizados os nomes dos ossos do jogador para `rightarm` e `leftarm` e adicionadas trilhas de `rightitem`, mantendo o aspersório sincronizado com as animações de carregamento e aspersão;
- removidas a névoa customizada e a chamada inválida ao `minecraft:water_splash_particle`, eliminando o efeito verde e os erros `variable.direction` do Content Log;
- aumentada a aspersão de 18 para 24 gotas e ampliados velocidade, duração e sustentação para aproximadamente triplicar o alcance;
- adicionadas validações de regressão para vínculo, poses de exibição, animação do osso do item e ausência dos emissores removidos.

## 1.0.3 — 2026-08-03

- removido o estado vanilla `minecraft:sixteen_way_rotation`, que o cliente 26.34 também restringe a Creator Features;
- adicionada rotação estável em 16 setores por `aspergillum:rotation`, definida pelo script antes da colocação do bloco;
- restaurado o carregamento da caldeirinha e, por consequência, da receita, do componente, do item de bloco e da função `aspergillum/dev_kit`;
- transferido o pivô do attachable para o centro físico do cabo e removida a rotação que colocava o modelo atrás e abaixo do jogador;
- adicionados testes unitários para normalização e quantização da rotação de colocação.

## 1.0.2 — 2026-08-03

- substituído `n_way_visual_rotation`, que o cliente 26.34 exige tratar como experimental, por 16 variantes geométricas estáveis selecionadas pelo estado de colocação;
- adicionado controlador de render exclusivo para o attachable, eliminando referências inexistentes a `material.enchanted` e `texture.enchanted`;
- corrigidos pivô e rotação de ligação do modelo empunhado conforme o padrão oficial do osso `rightItem`;
- adicionadas escalas e poses independentes para primeira e terceira pessoa;
- incrementadas as versões dos dois packs para impedir que o Minecraft aceite a revisão anterior como atual;
- separados os identificadores de tradução dos nomes dos packs, evitando que o Resource Pack renomeie o Behavior Pack no armazenamento;
- adicionadas validações para as 16 orientações e para o controlador de render dedicado.

## 1.0.1 — 2026-08-03

- corrigido o formato estrutural de `n_way_visual_rotation`; o teste no cliente revelou depois que esse recurso ainda exige o experimento Creator Features;
- adicionados dados obrigatórios de desbloqueio às receitas 1.20+;
- corrigidas variáveis Molang de idade e duração das partículas;
- removida a condição attachable `q.is_swinging`, indisponível nesse contexto;
- adicionadas validações de regressão para os erros encontrados no Content Log real.

## 1.0.0 — 2026-08-03

- aspersório 3D com três cargas persistentes;
- aspersão por Attack/Mine sem dano ou mineração final;
- animações próprias em primeira e terceira pessoa;
- partículas de água com gravidade, arrasto e colisão;
- caldeirinha com quatro níveis, encaixe decorativo e rotação em 16 direções;
- texturas fallback e PBR;
- receitas e localização em português e inglês;
- pipeline TypeScript, testes, validação oficial e empacotamento reproduzível.
