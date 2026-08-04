# Referências e política de pesquisa

## Fontes primárias

- [Attachables — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/documents/attachables?view=minecraft-bedrock-stable): binding por item slot, geometrias e poses distintas por perspectiva.
- [Particle effects in animations — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/particleentityintegration?view=minecraft-bedrock-stable): locators, controllers e timelines de partículas.
- [Particle appearance billboard — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/examples/particlecomponents/particle_appearance_billboard?view=minecraft-bedrock-stable): `direction_y` e orientação derivada da velocidade.
- [Particle appearance lighting — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/particlecomponents/minecraftparticle_appearance_lighting?view=minecraft-bedrock-stable): a presença do componente tinge a partícula pelas condições locais de iluminação; omitido na 1.0.16b para preservar o azul da água.
- [Emitter local space — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/examples/particlecomponents/emitter_local_space_proxy?view=minecraft-bedrock-stable): herança independente de posição, rotação e velocidade.
- [Particle motion collision — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/examples/particlecomponents/particle_motion_collision?view=minecraft-bedrock-stable): eventos de colisão e limiar de velocidade.
- [Emitter shape custom — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/examples/particlecomponents/emitter_shape_custom?view=minecraft-bedrock-stable): offset e direção Molang de emissão.
- [Script API: Entity — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable): animações e operações de entidade.
- [Comando playanimation — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/commandsreference/examples/commands/playanimation?view=minecraft-bedrock-stable): execução one-shot, blend, stop expression e controller.
- [Animation controllers — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/documents/animations/animationcontroller?view=minecraft-bedrock-stable): estados, transições, canais e crossfade.
- [Actor animation schema — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/visualreference/actor_animation.v1.8.0?view=minecraft-bedrock-stable): `blend_weight`, `override_previous_animation`, `pre`/`post` e Catmull-Rom.
- [Actor animation-controller schema — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/visualreference/actor_animation_controller.v1.10.0?view=minecraft-bedrock-stable): `blend_transition` e `blend_via_shortest_path`.
- [Item `minecraft:swing_duration` — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/itemreference/examples/itemcomponents/minecraft_swing_duration?view=minecraft-bedrock-stable): duração visual do swing carregada pelo item.
- [Molang `math.hermite_blend` — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/molangreference/examples/molangconcepts/mathfunctions/math_hermite_blend?view=minecraft-bedrock-stable): curva `3t² - 2t³` usada pela ponte de recuperação.
- [Molang `query.is_cooldown_category` — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/molangreference/examples/molangconcepts/queryfunctions/query_is_cooldown_category?view=minecraft-bedrock-stable): identificação estável de categoria/slot desde 1.20.60.
- [Molang `query.cooldown_time_remaining` — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/molangreference/examples/molangconcepts/queryfunctions/query_cooldown_time_remaining?view=minecraft-bedrock-stable): tempo restante por cooldown ou slot.
- [Script API: ItemStack — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/itemstack?view=minecraft-bedrock-stable): clone, lore e propriedades de item.
- [Molang query functions — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/molangreference/examples/molangconcepts/queryfunctions?view=minecraft-bedrock-stable): queries disponíveis no runtime.
- [Mojang Bedrock Samples](https://github.com/Mojang/bedrock-samples): conteúdo oficial de referência.
- [Animações oficiais do player — Mojang Bedrock Samples](https://github.com/Mojang/bedrock-samples/blob/main/resource_pack/animations/player.animation.json): fonte da curva vanilla de `rightarm` e da costura de aproximadamente `30°` diagnosticada na v1.0.15d.
- [Microsoft Minecraft Samples](https://github.com/microsoft/minecraft-samples): exemplos oficiais de Add-Ons e Script API.

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

As referências de partículas acima foram reconfirmadas em `2026-08-04`. Os schemas e samples locais oficiais confirmaram eventos de colisão e `bind_to_actor: false`; os samples que herdam rotação local também herdam posição. O Content Log da 1.0.16 tornou esse último vínculo um contrato explícito da 1.0.16a; a documentação de lighting fundamenta a independência cromática da 1.0.16b.
