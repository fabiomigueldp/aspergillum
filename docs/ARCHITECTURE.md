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
4. A animação do jogador é iniciada.
5. Quatro ticks depois, som e 24 gotas de água são emitidos no vetor de visão.
6. `entityHurt` cancela qualquer dano de ataque enquanto o item estiver empunhado.
7. `playerBreakBlock` cancela a quebra final com o item.

Partículas são apenas representação. Não há entidade/projétil por gota nem polling global por tick.

O modelo empunhado usa o mesmo referencial de um item vanilla longo: extensão aproximada de 31 unidades e pivô `[0, 24, 0]`. Seu único osso se chama `aspergillum` — nunca `root`, `body` ou outro nome pertencente ao jogador — e é vinculado ao slot retornado por `q.item_slot_to_bone_name(c.item_slot)`. Um animation controller mantém poses independentes de primeira e terceira pessoa, derivadas das transformações estáveis do tridente. As animações cerimoniais movem `rightarm` e `rightitem` em conjunto; o binding faz o modelo herdar também a cadeia `rightArm → rightItem` do jogador.

As partículas criadas pela Script API usam uma aproximação autoritativa da ponta: 0,72 bloco à frente, 0,30 bloco para a direita e 0,42 bloco abaixo dos olhos, com correção pelo pitch. Locators de attachable não são expostos como coordenadas mundiais à Script API; por isso o locator `tip` permanece como referência visual, enquanto o emissor de gameplay usa essa transformação calculada.

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
