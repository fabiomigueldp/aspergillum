# Estado, identidade e concorrência

## Modelo de carga

O estado persistido nunca representa infinito:

```text
charges ∈ {0, 1, 2, 3}
water_level ∈ {0, 1, 2, 3}
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
const water = normalizeWaterLevel(waterLevel);
const transferred = Math.min(water, MAX_CHARGES - charges);
const nextCharges = charges + transferred;
```

Somar sobre o valor bruto reintroduz valores inválidos mesmo quando a capacidade foi calculada corretamente.

## Identidade do item

Cada item possui `aspergillum:instance_id`. Operações atrasadas devem identificar uma instância pela composição de jogador, slot e ID — nunca apenas por `typeId`.

- Atualizar o mesmo item: clonar e preservar ID/propriedades.
- Criar uma cópia independente: gerar novo ID.
- Item bruto: inicializar de forma preguiçosa no primeiro acesso autoritativo; no futuro, também por evento de inventário com debounce.
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

`ActionLease` já unifica a exclusão entre carregar e aspergir. Docking e undocking serão incorporados quando ganharem snapshots transacionais; a migração continua incremental.

## Curvatura controlada

A direção deve continuar respondendo à câmera entre pulsos. Isso é um recurso de controle, não um defeito. As garantias são:

- interpolação pelo menor arco;
- resposta `0.8` e máximo `30°` por atualização;
- base capturada/transportada sem inversão de roll em pitch extremo;
- somente pulsos futuros respondem; gotas emitidas simulam em world-space;
- primeira direção também transita desde a orientação capturada no início do gesto.

A implementação transporta paralelamente o vetor lateral anterior. O eixo mundial menos alinhado com o forward é usado apenas no caso degenerado inicial.

## Docking e persistência-alvo

O estado booleano `has_aspergillum` é suficiente para renderização, mas não preserva um `ItemStack`. Antes da V1 final, o mundo deve manter um snapshot por bloco ocupado:

```ts
interface DockedAspergillumSnapshot {
  schemaVersion: 2;
  instanceId: string;
  nameTag?: string;
  cosmeticId: string;
  sprayProfileId: string;
  customProperties: Record<string, boolean | number | string>;
}
```

Use propriedades dinâmicas do mundo, preferencialmente agrupadas por dimensão/chunk. Ao retirar ou quebrar, reconstrua o item, restaure metadados, force `charges = 0` e remova o snapshot. Explosões precisam do mesmo caminho; para a V1, a caldeirinha deve ser imóvel por pistões.

Docking só é permitido se `water_level + charges <= 3`. Caso contrário, deve ser recusado sem alterar item ou bloco.

Prioridade de interação:

1. balde preenche;
2. ocupado + mão vazia retira;
3. ocupado + aspersório informa ocupação;
4. livre + aspersório + agachado acomoda;
5. livre + aspersório normal carrega.

## Schema 2 planejado

| Entrada | Migração |
| --- | --- |
| ausente/0 | normalizar carga, gerar ID, adicionar defaults e lore, gravar 2 |
| 1 | preservar carga e ID válido, adicionar defaults/lore, gravar 2 |
| 2 | validar e normalizar |
| maior que 2 | não fazer downgrade; retornar compatibilidade futura |

Estado V2 inclui `instanceId`, `charges`, `cosmeticId: "classic"` e `sprayProfileId: "standard"`. Lore deve usar `RawMessage` localizado e ser regenerada a partir do estado, nunca tratada como fonte de verdade.
