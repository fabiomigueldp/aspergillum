# Referências e política de pesquisa

## Fontes primárias

- [Attachables — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/documents/attachables?view=minecraft-bedrock-stable): binding por item slot, geometrias e poses distintas por perspectiva.
- [Particle effects in animations — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/particlesreference/particleentityintegration?view=minecraft-bedrock-stable): locators, controllers e timelines de partículas.
- [Script API: Entity — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable): animações e operações de entidade.
- [Comando playanimation — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/commandsreference/examples/commands/playanimation?view=minecraft-bedrock-stable): execução one-shot, blend, stop expression e controller.
- [Animation controllers — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/documents/animations/animationcontroller?view=minecraft-bedrock-stable): canais, keyframes e `override_previous_animation`.
- [Script API: ItemStack — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/itemstack?view=minecraft-bedrock-stable): clone, lore e propriedades de item.
- [Molang query functions — Microsoft Learn](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/molangreference/examples/molangconcepts/queryfunctions?view=minecraft-bedrock-stable): queries disponíveis no runtime.
- [Mojang Bedrock Samples](https://github.com/Mojang/bedrock-samples): conteúdo oficial de referência.
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
