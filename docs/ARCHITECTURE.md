# Arquitetura

## Decisões permanentes

- Namespace: `aspergillum`.
- Item funcional: `aspergillum:aspergillum`.
- Bloco colocável: `aspergillum:aspersorium`.
- Estados persistentes do bloco: `aspergillum:water_level` e `aspergillum:has_aspergillum`.
- Estado visual de colocação: `aspergillum:rotation`, com 16 setores definidos por script estável.
- Propriedade persistente do item: `aspergillum:charges`.
- UUIDs dos manifests não devem ser alterados após publicação.
- Nenhum arquivo vanilla é sobrescrito.
- Nenhuma API `beta`, preview ou feature experimental é usada.

## Fluxo de carregamento

1. O custom component do bloco recebe a interação.
2. A aplicação verifica item, água e capacidade.
3. A animação começa imediatamente.
4. Dez ticks depois, o bloco e o item são revalidados.
5. A transferência é confirmada de forma autoritativa.
6. O novo `ItemStack` recebe propriedade dinâmica e lore; o bloco recebe o nível restante.

A revalidação impede duplicação se dois jogadores usarem a mesma caldeirinha ou se o bloco/item mudar durante a animação.

Antes da colocação, `beforeOnPlayerPlace` converte o yaw do jogador em um dos 16 valores de `aspergillum:rotation`. Cada valor seleciona uma geometria já rotacionada; assim, a orientação precisa não depende de `minecraft:sixteen_way_rotation`, `n_way_visual_rotation` ou qualquer Creator Feature experimental.

## Fluxo de aspersão

1. `playerSwingStart` filtra somente `Attack` e `Mine` com o item correto.
2. O domínio valida cooldown e carga.
3. A carga é consumida no slot principal.
4. O feedback sonoro e textual é emitido.
5. `entityHurt` cancela qualquer dano de ataque enquanto o item estiver empunhado.
6. `playerBreakBlock` cancela a quebra final com o item.

Na versão 1.0.11, o consumo de carga agenda a liberação visual quatro ticks após o ataque. A rajada contém 36 gotas, divididas em seis frames consecutivos com seis gotas cada. A posição da cabeça e a direção do jogador são relidas a cada frame, mas a transformação local permanece a comprovada na 1.0.6: `0,72` bloco à frente, `0,30` à direita e `0,42` abaixo da cabeça. As direções de cada frame são contíguas na espiral determinística, recuperando a progressão espacial da rajada antiga.

O modelo empunhado declara geometry `1.16.0`. `aspergillum_bound` possui apenas o binding exato `q.item_slot_to_bone_name(context.item_slot)`: não contém cubos nem transformação artística. Seu filho `aspergillum_visual` contém a malha real, o pivô/grip empírico `[-6, 24, 1]` e a orientação `[25, 0, -12]`. Uma animação de apresentação contínua aplica apenas a inversão de 180° necessária na primeira pessoa; a terceira pessoa conserva a pose da geometria. Não há locator, escala ou animação de ação.

Cada chamada a `Dimension.spawnParticle` recebe velocidade e direção por `MolangVariableMap`. A definição do Resource Pack usa um billboard sempre voltado à câmera e um sprite radial cheio, como na 1.0.6, além de aceleração gravitacional, arrasto, iluminação e colisão com terreno. O leque é mais aberto, as gotas são maiores e a faixa de velocidade `12,70–13,98` produz aproximadamente um bloco adicional de alcance mediano no modelo balístico. Esse caminho é autoritativo, multiplayer e independente das transformações do attachable. Após confirmar definitivamente o grip, uma futura animação litúrgica e eventual locator poderão refinar a coincidência visual sem substituir este fallback robusto.

## Persistência

O item é não empilhável, requisito para propriedades dinâmicas independentes por stack. O bloco usa somente states, evitando block entities experimentais. O encaixe converte cargas restantes em água para que nenhum dado invisível precise ser guardado no bloco.

## Compatibilidade e evolução

Mudanças compatíveis incrementam a versão SemVer dos packs. Identificadores, states e UUIDs devem permanecer estáveis. Novos efeitos de gameplay — por exemplo, interação opcional com mobs — devem entrar como caso de uso separado e nunca transformar silenciosamente o comportamento cerimonial padrão.

Dependências e formatos atuais:

| Área | Versão |
| --- | --- |
| Engine mínima | `1.26.30` |
| Manifest | `2` |
| Script API | `@minecraft/server` `2.8.0` |
| TypeScript | `5.9.x` |
| Minecraft Creator Tools | `0.17.7` |
