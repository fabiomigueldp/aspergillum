# Referências e política de pesquisa

## Fontes primárias

- [Manifest de packs — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/addonsreference/packmanifest?view=minecraft-bedrock-stable): identidade pública, versões, módulos, dependências, capabilities e metadata de Behavior e Resource Packs.
- [Conteúdo de Add-On packs — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/documents/comprehensivepackcontents?view=minecraft-bedrock-stable): estrutura oficial dos diretórios `texts`, `languages.json`, arquivos `.lang`, manifests e ícones.
- [Diretrizes para Add-Ons cooperativos — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/documents/practices/guidelinesforbuildingcooperativeaddons?view=minecraft-bedrock-stable): namespaces e chaves localizadas resistentes à convivência com outros packs.
- [Attachables — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/documents/attachables?view=minecraft-bedrock-stable): binding por item slot, geometrias e poses distintas por perspectiva.
- [Geometry schema 1.19.30 — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/schemasreference/schemas/minecraftschema_geometry_1.19.30?view=minecraft-bedrock-stable): `size`, Box UV, UV alternativo por face e `uv_size`; a v1.1.6 mantém UV explícito em densidade 2×, quatro paredes por nível e omissão seletiva de uma das tampas em cada junção.
- [Schemas do Bedrock Samples — Mojang](https://mojang.github.io/bedrock-samples/Schemas.html): geometria `1.12`/`1.14`, ordem de rotação x→y→z, rotação de cubo no próprio centro quando `pivot` é omitido e aviso de que o pivot `1.12` é serializado “upside-down” antes da correção em `1.14`; base do importador legado do Workbench 0.2.0.
- [Materials and Material Files — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/documents/material-files?view=minecraft-bedrock-stable): `entity` mantém culling normal e `entity_nocull` adiciona `DisableCulling`; a correção não depende de nocull.
- [Minecraft Style Guide — Blockbench](https://www.blockbench.net/wiki/guides/minecraft-style-guide/): relação de uma unidade de modelo por texel e risco estilístico de elementos menores que um pixel.
- [Bowlby One SC — Google Fonts](https://fonts.google.com/specimen/Bowlby+One+SC): espécime e distribuição pública da fonte display usada no título da capa.
- [Bowlby One SC — repositório oficial Google Fonts](https://github.com/google/fonts/tree/main/ofl/bowlbyonesc): binário original, metadados e licença SIL Open Font License 1.1 preservados localmente no Cover Renderer.
- [Particle effects in animations — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/particleentityintegration?view=minecraft-bedrock-stable): locators, controllers e timelines de partículas.
- [Particle appearance billboard — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/examples/particlecomponents/particle_appearance_billboard?view=minecraft-bedrock-stable): `direction_y` e orientação derivada da velocidade.
- [Particle appearance lighting — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/particlecomponents/minecraftparticle_appearance_lighting?view=minecraft-bedrock-stable): a presença do componente tinge a partícula pelas condições locais de iluminação; omitido na 1.0.16b para preservar o azul da água.
- [Particle appearance tinting — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/examples/particlecomponents/particle_appearance_tinting?view=minecraft-bedrock-stable): aceita arrays RGBA normalizados; a 1.0.16c usa essa forma para evitar a divergência histórica de ordem em hex de oito dígitos.
- [ItemStack — Script API estável](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/itemstack?view=minecraft-bedrock-stable): clone, propriedades dinâmicas e lore `RawMessage` usados pelo schema 3 e pelos snapshots.
- [ItemCustomComponent — Script API estável](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/itemcustomcomponent?view=minecraft-bedrock-stable): contrato de `onUseOn` usado como rota primária do aspersório sobre a caldeirinha.
- [ItemComponentUseOnEvent — Script API estável](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/itemcomponentuseonevent?view=minecraft-bedrock-stable): bloco e entidade de origem fornecidos ao custom component do item.
- [BlockComponentPlayerInteractEvent — Script API estável](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/blockcomponentplayerinteractevent?view=minecraft-bedrock-stable): fallback da interação do bloco para balde, mão vazia e compatibilidade entre inputs.
- [Raw Message JSON — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/rawmessagejson?view=minecraft-bedrock-stable): chaves `translate` e parâmetros renderizados no idioma do cliente.
- [ScreenDisplay — Script API estável](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/screendisplay?view=minecraft-bedrock-stable): `setActionBar` aceita `RawMessage`, base do catálogo localizado da 1.0.18.
- [Server UI module — Script API estável](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/minecraft-server-ui?view=minecraft-bedrock-stable): módulo estável fixado em `2.1.0` para a Mesa do Sacristão.
- [CustomForm — Script API estável](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/customform?view=minecraft-bedrock-stable): formulário reativo, headers, dropdowns, espaçadores, divisores, botões e observáveis usados pela interface da 1.1.2.
- [Player — Script API estável](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/player?view=minecraft-bedrock-stable): `playSound` estável e suas condições de erro fundamentam o coordenador sonoro fail-soft.
- [Block movable — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockcomponents/minecraftblock_movable?view=minecraft-bedrock-stable): `movement_type: immovable` protege o registry indexado por coordenadas.
- [Block states and permutations — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockstatesandpermutations?view=minecraft-bedrock-stable): arrays de valores numéricos e limite global de 65.536 permutações; a v1.0.18g codifica dezessete quantidades em states de cardinalidade 2 e 9.
- [BlockPermutation — Script API estável](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/blockpermutation?view=minecraft-bedrock-stable): composição imutável de `water_base` e `water_offset` por `withState` antes de uma única substituição transacional.
- [Emitter local space — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/examples/particlecomponents/emitter_local_space_proxy?view=minecraft-bedrock-stable): herança independente de posição, rotação e velocidade.
- [Particle motion collision — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/examples/particlecomponents/particle_motion_collision?view=minecraft-bedrock-stable): eventos de colisão e limiar de velocidade.
- [Emitter shape custom — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/examples/particlecomponents/emitter_shape_custom?view=minecraft-bedrock-stable): offset e direção Molang de emissão.
- [Script API: Entity — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable): animações e operações de entidade.
- [Comando playanimation — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/commandsreference/examples/commands/playanimation?view=minecraft-bedrock-stable): execução one-shot, blend, stop expression e controller.
- [Animation controllers — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/documents/animations/animationcontroller?view=minecraft-bedrock-stable): estados, transições, canais e crossfade.
- [Actor animation schema — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/visualreference/actor_animation.v1.8.0?view=minecraft-bedrock-stable): `blend_weight`, `override_previous_animation`, `pre`/`post` e Catmull-Rom.
- [Actor animation-controller schema — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/visualreference/actor_animation_controller.v1.10.0?view=minecraft-bedrock-stable): `blend_transition` e `blend_via_shortest_path`.
- [Item `minecraft:swing_duration` — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/itemreference/examples/itemcomponents/minecraft_swing_duration?view=minecraft-bedrock-stable): duração visual do swing carregada pelo item.
- [Item `minecraft:block_placer` — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/itemreference/examples/itemcomponents/minecraft_block_placer?view=minecraft-bedrock-stable): permite usar o bloco referenciado como ícone quando `minecraft:icon` é omitido; a 1.2.4 restringe e cancela a semântica de colocação.
- [Block `minecraft:item_visual` — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockcomponents/minecraftblock_item_visual?view=minecraft-bedrock-stable): geometria e material usados para renderizar o item de um bloco, estáveis desde o formato `1.21.60`.
- [Item Wizard — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/documents/minecraftitemwizard?view=minecraft-bedrock-stable): confirma que itens customizados usam o ícone na GUI mesmo quando possuem modelo 3D na mão, motivando a ponte de bloco da 1.2.4.
- [Molang `math.hermite_blend` — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/molangreference/examples/molangconcepts/mathfunctions/math_hermite_blend?view=minecraft-bedrock-stable): curva `3t² - 2t³` usada pela ponte de recuperação.
- [Molang `query.is_cooldown_category` — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/molangreference/examples/molangconcepts/queryfunctions/query_is_cooldown_category?view=minecraft-bedrock-stable): identificação estável de categoria/slot desde 1.20.60.
- [Molang `query.cooldown_time_remaining` — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/molangreference/examples/molangconcepts/queryfunctions/query_cooldown_time_remaining?view=minecraft-bedrock-stable): tempo restante por cooldown ou slot.
- [Script API: ItemStack — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/itemstack?view=minecraft-bedrock-stable): clone, lore e propriedades de item.
- [Molang query functions — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/molangreference/examples/molangconcepts/queryfunctions?view=minecraft-bedrock-stable): queries disponíveis no runtime.
- [Mojang Bedrock Samples](https://github.com/Mojang/bedrock-samples): conteúdo oficial de referência.
- [Animações oficiais do player — Mojang Bedrock Samples](https://github.com/Mojang/bedrock-samples/blob/main/resource_pack/animations/player.animation.json): fonte da curva vanilla de `rightarm` e da costura de aproximadamente `30°` diagnosticada na v1.0.15d.
- [Microsoft Minecraft Samples](https://github.com/microsoft/minecraft-samples): exemplos oficiais de Add-Ons e Script API.
- [Adding custom sounds — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/documents/addcustomsounds?view=minecraft-bedrock-stable): OGG customizado e `sound_definitions.json` `1.20.20` usados na 1.0.19.

## Pesquisa local

Clones locais podem existir em `.research/` para busca rápida e comparação histórica. Eles são caches descartáveis:

- não entram no pacote;
- não devem ser modificados como parte do produto;
- não substituem a documentação estável atual;
- devem registrar remoto e commit em `.research/README.md`;
- exemplos copiados precisam ser adaptados aos schemas e versões fixados no projeto.

Ao pesquisar uma API, prefira nesta ordem:

1. tipos instalados em `node_modules/@minecraft/server` para a versão fixada;
2. documentação Microsoft Learn na visão `minecraft-bedrock-stable`;
3. samples oficiais e schemas do `bedrock-samples`;
4. experimento mínimo local;
5. fontes comunitárias apenas como pista, nunca como autoridade final.

Registre no documento técnico afetado a data, versão/commit e conclusão relevante quando uma decisão depender de comportamento que possa mudar.

As referências de partículas acima foram reconfirmadas em `2026-08-04`; block states e `BlockPermutation` foram reconfirmados em `2026-08-05`; os schemas de geometria `1.12`/`1.14` foram reconfirmados em `2026-08-12`. Os schemas e samples locais oficiais confirmaram eventos de colisão e `bind_to_actor: false`; os samples que herdam rotação local também herdam posição. O Content Log da 1.0.16 tornou esse último vínculo um contrato explícito da 1.0.16a; a documentação de lighting fundamenta a independência cromática da 1.0.16b. A observação física da 1.0.16b e a divergência entre referências antigas/atuais fundamentam o uso exclusivo de arrays RGBA na 1.0.16c.
