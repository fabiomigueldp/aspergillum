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

Na versão diagnóstica 1.0.7, animações e partículas estão deliberadamente desativadas para que nenhuma transformação ou VFX interfira no teste do binding.

O modelo empunhado diagnóstico declara geometry `1.16.0` e possui apenas o osso `aspergillum_debug`. Esse mesmo osso contém o bastão 2×8×2 e o binding exato `q.item_slot_to_bone_name(context.item_slot)`. Não há parent, rotação, locator, escala nem animação. A estrutura reproduz literalmente o menor caso oficial necessário para distinguir suporte semântico ao binding de problemas artísticos.

Após o bastão acompanhar a mão em primeira e terceira pessoa, a malha real será restaurada diretamente nesse osso comprovado. Poses, animações e o emissor por locator voltarão incrementalmente, com uma variável por revisão.

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
