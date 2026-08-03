# Investigação do attachable empunhado

## Evidência de runtime

Na versão 1.0.4, o aspersório não aparecia em primeira pessoa. Em terceira pessoa, a cabeça intersectava o crânio, o cabo atravessava face e tórax e o conjunto permanecia estático enquanto o braço direito se movia. O balde vanilla aparecia corretamente nas mesmas condições, isolando o defeito no attachable do projeto.

## Causa raiz

Três decisões incompatíveis se combinavam:

1. O osso do item chamava-se `root`, nome que já pertence à hierarquia visual do jogador. Animações de attachables vinculados podem atingir ossos do holder; portanto esse nome não é seguro para o modelo do item.
2. O pivô `[0, 2, 0]` não correspondia ao espaço em que as poses de exibição escolhidas tinham sido produzidas.
3. As posições `[0, 14.5, 2.4]` e `[0, 19, -4]` vieram de um modelo curto de cabeça. Aplicá-las a uma geometria longitudinal de cerca de 31 unidades colocou a cabeça do aspersório junto ao crânio do jogador.

## Referência adotada

O tridente vanilla também mede aproximadamente 31 unidades no eixo longitudinal. Sua geometria usa:

- osso próprio (`pole` no original, `aspergillum` neste projeto);
- binding `q.item_slot_to_bone_name(c.item_slot)`;
- pivô `[0, 24, 0]`;
- primeira pessoa: posição `[-7, -3, -2]`, rotação `[152, -9, 25]`;
- terceira pessoa: posição `[1.5, -2.5, -10.5]`, rotação `[97, -1.5, -49]`;
- controller separado para selecionar a pose por `c.is_first_person`.

Esses valores formam um conjunto: trocar apenas posição, pivô ou rotação quebra novamente o referencial. Ajustes artísticos futuros devem partir desse conjunto funcional e ser pequenos, medidos no jogo.

## Invariantes

- O osso que contém todos os cubos deve continuar sendo `aspergillum`.
- O binding deve permanecer no próprio osso que contém os cubos.
- A geometria não deve copiar a hierarquia inteira do jogador.
- Pivô e poses devem ser alterados em conjunto.
- `minecraft:swing_duration` deve permanecer igual à duração do cooldown de ataque.
