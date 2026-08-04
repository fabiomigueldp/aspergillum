# Arquitetura

## Decisões permanentes

- Namespace: `aspergillum`.
- Item funcional: `aspergillum:aspergillum`.
- Bloco colocável: `aspergillum:aspersorium`.
- Estados persistentes do bloco: `aspergillum:water_level` e `aspergillum:has_aspergillum`.
- Estado visual de colocação: `aspergillum:rotation`, com 16 setores definidos por script estável.
- Propriedades persistentes do item: `aspergillum:charges`, `aspergillum:schema_version` e a identidade única `aspergillum:instance_id`.
- UUIDs dos manifests não devem ser alterados após publicação.
- Nenhum arquivo vanilla é sobrescrito.
- Nenhuma API `beta`, preview ou feature experimental é usada.

## Fluxo de carregamento

1. O custom component do bloco recebe a interação.
2. A aplicação verifica item, água e capacidade.
3. O feedback de preparação começa e uma sessão exclusiva reserva o jogador e a coordenada da caldeirinha.
4. Dez ticks depois, jogador, dimensão, slot, `instance_id`, bloco, ocupação, água e distância são revalidados.
5. A transferência é resolvida pela política do modo de jogo e confirmada de forma autoritativa.
6. Item e bloco são gravados por um helper coordenado com rollback defensivo; a sessão e o lock são liberados em qualquer término.

A revalidação impede duplicação se dois jogadores usarem a mesma caldeirinha ou se o bloco/item mudar durante a animação. Sobrevivência e Aventura consomem água; Criativo preserva o nível, mas transfere apenas a quantidade finita que realmente cabe no item. Espectador é negado.

Antes da colocação, `beforeOnPlayerPlace` converte o yaw do jogador em um dos 16 valores de `aspergillum:rotation`. Cada valor seleciona uma geometria já rotacionada; assim, a orientação precisa não depende de `minecraft:sixteen_way_rotation`, `n_way_visual_rotation` ou qualquer Creator Feature experimental.

## Fluxo de aspersão

1. `playerSwingStart` filtra somente `Attack` e `Mine` com o item correto.
2. O domínio valida cooldown e carga.
3. A política do modo autoriza a aspersão: Sobrevivência/Aventura consomem uma carga; Criativo preserva a carga finita; Espectador é negado.
4. O feedback sonoro e textual é emitido.
5. `entityHurt` cancela qualquer dano de ataque enquanto o item estiver empunhado.
6. `playerBreakBlock` cancela a quebra final com o item.

Na versão 1.0.14, uma aspersão válida agenda a liberação visual quatro ticks após o ataque. A rajada contém 36 gotas, divididas em seis frames consecutivos com seis gotas cada. A aproximação da ponta fica `0,55` bloco à frente, `0,48` à direita e `0,15` abaixo dos olhos. A cada pulso, posição e direção-alvo são relidas; a direção efetiva percorre o menor arco esférico com resposta de `0,8` e giro máximo de `30°`. Isso devolve controle ao jogador sem permitir mudanças descontínuas. Item ou dimensão diferentes ainda cancelam os pulsos restantes.

O modelo empunhado declara geometry `1.16.0`. `aspergillum_bound` possui apenas o binding exato `q.item_slot_to_bone_name(context.item_slot)`: não contém cubos nem transformação artística. Seu filho `aspergillum_visual` contém a malha real, o pivô/grip empírico `[-6, 24, 1]` e a orientação base `[25, 0, -12]`. A primeira pessoa conserva somente a inversão aprovada de 180°. A terceira pessoa acrescenta `position [5, -1.5, -2.25]` e `rotation [10, 0, 0]`, sem modificar a perspectiva já aprovada. Não há escala ou animação de ação.

Cada chamada a `Dimension.spawnParticle` recebe velocidade e direção por `MolangVariableMap`. A definição do Resource Pack usa um billboard sempre voltado à câmera e um sprite radial cheio, além de aceleração gravitacional, arrasto, iluminação e colisão. O leque deixou de ser circular: a abertura horizontal média é aproximadamente `7,5°`, chegando a `14,5°`, enquanto a abertura vertical média é `2,4°` e permanece abaixo de `5,2°`. A faixa de velocidade `12,70–13,98` preserva o alcance da 1.0.11. Esse caminho é autoritativo, multiplayer e independente das transformações do attachable.

O schema oficial de attachables admite `particle_effects`, e locators podem orientar emissores acionados por timelines. A integração final deve combinar o progresso do ataque com o cooldown iniciado apenas numa aspersão válida; usar somente `variable.attack_time` faria um item vazio emitir água. Por isso, o locator será introduzido como uma etapa isolada após a confirmação física desta pose, mantendo este emissor matemático como fallback até lá.

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
