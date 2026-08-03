# Investigação do attachable empunhado

## Evidência e correção de hipótese

Os testes físicos das versões 1.0.4 e 1.0.5 mostraram que tornar a geometria semelhante ao tridente não torna seus referenciais intercambiáveis. Na 1.0.5, o modelo passou a aparecer em primeira pessoa, mas ficou enorme, sofreu clipping no plano próximo e permaneceu visualmente desacoplado do punho em terceira pessoa.

O erro foi tratar pivô, translação e rotação do tridente como uma pose universal. O pivô de um attachable pertence à geometria do próprio objeto: deve ficar no ponto em que a mão segura o cabo. O tridente usa `[0, 24, 0]` porque esse é o ponto de pega dentro de sua malha; o aspersório original tinha outro comprimento e outro ponto de pega.

## Evidência direta da 1.0.6

O mundo `FXi1BzZ8bkA=` continha a versão 1.0.6, e hashes SHA-256 confirmaram igualdade byte a byte entre a fonte e os arquivos efetivamente instalados de manifest, attachable, geometria, render controller e texturas. `world_resource_packs.json` continha somente o UUID correto na versão 1.0.6. O Content Log não registrou erro de carregamento.

Isso elimina cache, arquivo empacotado divergente e Resource Pack concorrente como causas do resultado observado.

## Causa candidata isolada

A geometria da 1.0.6 declarava `format_version: 1.12.0`. O schema oficial `geometry:1.16.0` documenta `binding` como Molang e todos os sete modelos vinculados encontrados nos repositórios oficiais usam `1.16.0`: crossbow, shield, spear, spyglass, trident, crown e wrench. O fallback silencioso ao root é compatível com um campo aceito pelo parser genérico, mas sem semântica ativa na versão antiga da geometria.

## Arquitetura diagnóstica 1.0.7

- geometry `1.16.0`;
- um único osso `aspergillum_debug`;
- binding `q.item_slot_to_bone_name(context.item_slot)`;
- pivô `[0, 0, 0]`;
- um único cubo com origin `[-1, 0, -1]` e size `[2, 8, 2]`;
- material opaco `entity`;
- nenhuma hierarquia filha, transformação, animação, partícula ou locator.

## Invariantes

- a versão da geometria permanece `1.16.0` ou superior;
- o binding e o cubo permanecem no mesmo e único osso durante o diagnóstico;
- não existem parent, rotation, locator, animações ou partículas;
- a expressão de binding não é abreviada nem substituída por literal;
- `minecraft:swing_duration` permanece igual à duração do cooldown de ataque.
