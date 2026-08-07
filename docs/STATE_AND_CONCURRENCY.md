# Estado, identidade e concorrência

## Modelo de carga

O estado persistido nunca representa infinito:

```text
charges ∈ {0, 1, 2, 3, 4}
water_units ∈ {0, 1, ..., 16}
```

As políticas dependem do modo atual do jogador:

| Modo | Carregamento | Água | Aspersão |
| --- | --- | --- | --- |
| Survival | transfere o que cabe | consome | consome uma carga |
| Adventure | transfere o que cabe | consome | consome uma carga |
| Creative | transfere o que cabe | preserva | preserva a carga finita |
| Spectator | negado | preserva | negado |

Criativo ainda exige `charges > 0` para aspergir e água real para carregar. Assim, voltar a Survival restaura exatamente o estoque finito existente, sem sentinelas como `-1`, `255` ou `Infinity`.

## Normalização obrigatória

Todo cálculo usa valores normalizados, inclusive a soma final:

```ts
const charges = normalizeCharges(state.charges);
const water = normalizeWaterUnits(waterLevel);
const transferred = Math.min(water, ASPERGILLUM_CAPACITY - charges);
const nextCharges = charges + transferred;
```

Somar sobre o valor bruto reintroduz valores inválidos mesmo quando a capacidade foi calculada corretamente.

## Identidade do item

Cada item possui `aspergillum:instance_id`. Operações atrasadas devem identificar uma instância pela composição de jogador, slot e ID — nunca apenas por `typeId`.

- Atualizar o mesmo item: clonar e preservar ID/propriedades.
- Criar uma cópia independente: gerar novo ID.
- Item bruto: inicializar no primeiro acesso autoritativo e por evento/varredura de inventário.
- IDs duplicados no inventário do mesmo jogador são detectados e a ocorrência recebida posteriormente ganha nova identidade.
- Schema futuro desconhecido: não sobrescrever destrutivamente.

## Carregamento atual

Uma `LoadingSession` reserva:

- jogador;
- `instance_id` e slot;
- dimensão e coordenada do bloco;
- água esperada e tick inicial;
- callback/timeout associado.

No commit, após dez ticks, o sistema revalida jogador, dimensão, distância, slot, identidade, tipo do item, bloco, ocupação, água e modo de jogo. Há no máximo uma sessão por jogador e um lock leve por caldeirinha. Todo término libera sessão e lock.

Item e bloco não formam uma transação atômica nativa. O helper de infraestrutura guarda valores originais, aplica ambas as escritas em `try` e restaura defensivamente em caso de falha.

Cancelamentos obrigatórios:

- mudança de slot ou item;
- mudança de dimensão ou modo incompatível;
- morte, respawn, saída;
- distância excessiva;
- bloco quebrado, substituído ou ocupado;
- sessão expirada.

## Aspersão atual

A v1.0.15 separa:

1. **reserva no tick 0**: cria `SprinkleSession` e impede ação concorrente;
2. **commit no tick 5**: revalida e consome/preserva a carga no instante físico de liberação;
3. **pulsos nos ticks 5–10**: continuam apenas se item e dimensão permanecerem válidos.

Semântica:

- cancelamento antes do release: nenhuma carga consumida, nenhuma água emitida;
- cancelamento depois do release: carga permanece consumida; apenas pulsos futuros são interrompidos;
- tentativa vazia: feedback seco e cooldown lógico, sem cooldown visual válido e sem água.

`ActionLease` unifica a exclusão entre carregar e aspergir. Docking e undocking usam escrita defensiva própria porque são operações imediatas: snapshot, ItemStack e permutação são restaurados quando uma etapa lança erro.

O `sprayProfileId` efetivo é resolvido e congelado na `SprinkleSession` no tick 0. Alterar o perfil posteriormente na Mesa do Sacristão só afeta a próxima ação; nenhuma rajada em andamento muda de quantidade, forma ou steering no meio do ciclo.

## Curvatura controlada

A direção deve continuar respondendo à câmera entre pulsos. Isso é um recurso de controle, não um defeito. As garantias são:

- interpolação pelo menor arco;
- resposta `0.8` e máximo `30°` por atualização;
- base capturada/transportada sem inversão de roll em pitch extremo;
- somente pulsos futuros respondem; gotas emitidas simulam em world-space;
- primeira direção também transita desde a orientação capturada no início do gesto.

A implementação transporta paralelamente o vetor lateral anterior. O eixo mundial menos alinhado com o forward é usado apenas no caso degenerado inicial.

## Docking e persistência atual

O estado booleano `has_aspergillum` continua responsável somente pela renderização. O mundo preserva o item num snapshot por bloco ocupado:

```ts
interface DockedAspergillumSnapshot {
  schemaVersion: 2; // schema independente do ItemStack V3
  instanceId: string;
  charges: number;
  nameTag?: string;
  cosmeticId: string;
  sprayProfileId: string;
  customProperties: Record<string, boolean | number | string | SerializedVector3>;
}
```

O `DockedItemRegistry` usa propriedades dinâmicas do mundo agrupadas por dimensão/chunk e limita cada blob a 30.000 caracteres. Ao retirar ou quebrar, reconstrói o item com as cargas e metadados do snapshot e remove o registro somente depois da recuperação. Snapshots V1 são normalizados como `charges = 0`, pois a regra anterior só permitia acomodar depois de devolver integralmente as cargas. A caldeirinha declara `minecraft:movable` como `immovable`, evitando deslocar o endereço persistente por pistões.

Docking é sempre quantitativamente permitido. Ele transfere `min(charges, 16 - water_units)`, satura o reservatório sem ultrapassar 16 e grava o restante `charges - transferred` no snapshot. A identidade `nextWater + remainingCharges = water_units + charges` deve permanecer verdadeira para todas as 85 combinações. A regra é igual em Survival, Adventure e Creative; Spectator é explicitamente negado.

Prioridade de interação:

1. balde preenche;
2. ocupado + mão vazia retira;
3. ocupado + aspersório informa ocupação;
4. livre + aspersório + agachado acomoda;
5. livre + aspersório normal carrega.

O input do aspersório sobre o bloco possui duas portas estáveis que convergem nessa mesma prioridade: `ItemCustomComponent.onUseOn` é a rota primária do item e `BlockCustomComponent.onPlayerInteract` permanece como fallback e como rota de balde/mão vazia. A intenção de agachamento é capturada antes de `system.run`; uma claim efêmera de dois ticks por jogador, dimensão e coordenada impede que os dois eventos executem a mesma operação duas vezes.

Ocupado com outro item na mão não retira nada; a interface solicita mão vazia. A loot table ocupada não fornece um aspersório genérico: `onBreak` restaura o snapshot, evitando duplicação e preservando metadados. Blocos ocupados legados sem snapshot recuperam um item V3 vazio como fallback compatível.

## Mesa do Sacristão e sessões de personalização

A mesa reutiliza o `DockedItemRegistry`, mas possui semântica própria de interação. O snapshot continua sendo a fonte autoritativa do item; `table_has_aspergillum` e `table_cosmetic` são projeções visuais.

Uma `CustomizationSession` contém jogador, dimensão, coordenada e tick inicial. Os índices são mantidos em dois mapas, por jogador e por bloco, garantindo:

- no máximo uma mesa aberta por jogador;
- no máximo um editor por mesa;
- rejeição imediata de segundo jogador;
- liberação por fechamento, conclusão, retirada, quebra, morte, respawn, saída ou mudança de dimensão.

Cada callback reativo revalida sessão corrente, validade/distância do jogador, dimensão, tipo/ocupação do bloco e existência do snapshot. A gravação preserva cargas, `instance_id`, `nameTag`, schema e todas as propriedades customizadas; só `cosmeticId` ou `sprayProfileId` muda. Se snapshot ou permutação falhar, o valor anterior é restaurado defensivamente.

Fechar o formulário não retira o item nem descarta a configuração já aplicada: encerra apenas a sessão e deixa o aspersório exposto. **Concluir e retirar** primeiro recupera/entrega o item e então remove o snapshot. Agachar com mão vazia oferece uma rota de recuperação sem depender da UI. Loot de mesa ocupada nunca contém um aspersório genérico.

Não existe transação de demonstração na v1.1.1. A única prévia é o próprio item acomodado, atualizado pela mesma escrita revalidada de perfil/cosmético; nenhuma ação paralela cria `SprinkleSession`, inicia `ActionLease` ou altera água/cooldown.

## Schema 3 implementado

| Entrada | Migração |
| --- | --- |
| ausente/0 | normalizar carga, gerar ID, adicionar defaults e lore, gravar 3 |
| 1 | preservar carga e ID válido, adicionar defaults/lore, gravar 3 |
| 2 | preservar `0..3`, ampliar capacidade e lore para `/4`, gravar 3 |
| 3 | validar e normalizar em `0..4` |
| maior que 3 | não fazer downgrade; retornar compatibilidade futura |

Estado V3 inclui `instanceId`, `charges`, `cosmeticId: "classic"` e `sprayProfileId: "standard"`. Lore usa `RawMessage` localizado e é regenerada a partir do estado, nunca tratada como fonte de verdade. Um schema maior que 3 é lido apenas para diagnóstico e bloqueado para operações mutáveis; o item não é regravado.

Na 1.1.0, `classic` permanece associado ao ID histórico `aspergillum:aspergillum`. As oito combinações adicionais possuem IDs públicos próprios porque attachables não selecionam textura por dynamic property. Ao mudar acabamento, a infraestrutura reconstrói o ItemStack no ID correspondente e copia todos os metadados antes de gravar o estado V3. Valores cosméticos/perfis desconhecidos continuam normalizados para a apresentação clássica/standard em vez de quebrar mundos.

## Capacidade visual do reservatório

O domínio conserva a quantidade exata e a infraestrutura a codifica canonicamente em dois block states:

```text
water_base ∈ {0, 9}
water_offset ∈ {0, 1, ..., 8}
water_units = normalize(water_base + water_offset)
```

Quantidades `0..8` usam base `0`; quantidades `9..16` usam base `9` e offset `0..7`. O par não canônico `9+8` falha de modo seguro para `16` e é canonicalizado na próxima escrita. Os dois states são montados numa única `BlockPermutation`, portanto nenhuma metade intermediária é publicada no mundo. A geometria apresenta quartos estáveis:

| Unidades | Superfície visível |
| --- | --- |
| `0` | vazia |
| `1..4` | `water_low` |
| `5..8` | `water_mid` |
| `9..12` | `water_high` |
| `13..16` | `water_full` |

Um balde define o reservatório como `16/16`. Cada carregamento completo transfere quatro unidades, de modo que uma caldeirinha cheia fornece exatamente quatro carregamentos. Não há migração de caldeirinhas já colocadas em revisões anteriores.

A 1.1.0 adiciona `aspergillum:cosmetic ∈ {0..8}` à caldeirinha. O valor default `0` representa o visual clássico e mantém caldeirinhas já colocadas legíveis. O índice é escrito somente ao acomodar um item e volta a `0` na retirada. Essa adição eleva o espaço cartesiano total para `5.184`, mas nenhum state individual excede dezesseis valores.
