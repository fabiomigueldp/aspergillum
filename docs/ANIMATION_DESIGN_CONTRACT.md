# Contrato de design de animação

## Objetivo

A aspersão deve ser uma frase visual única — antecipação, condução, flick, release, follow-through e settle — sem lutar contra o swing iniciado pelo motor. Este contrato protege a v1.0.15b e orienta refinamentos futuros.

## Composição obrigatória

```text
swing vanilla de 0,90 s
+ correção corporal aditiva de baixa amplitude em rightarm
+ pose estática por perspectiva em aspergillum_presentation
+ coreografia local FP/TP em aspergillum_action
```

- `aspergillum_bound` contém somente o binding e nunca é animado.
- `aspergillum_presentation` contém somente a pose estática aprovada.
- A correção corporal não usa `override_previous_animation` e não contém `rightitem`.
- `aspergillum_action` contém antecipação, flick, follow-through e settle do instrumento.
- Falha de animação nunca muda carga, cooldown, água ou sessão.

## Timeline e release

| Tempo | Tick | Fase |
| --- | ---: | --- |
| `0,00–0,08 s` | 0–1,6 | entrada aditiva sem reset |
| `0,08–0,18 s` | 2–3,6 | antecipação curta |
| `0,18–0,28 s` | 4–5,6 | preparação e início do avanço |
| `0,25 s` | 5 | commit, som e primeiro pulso |
| `0,28–0,42 s` | 6–8,4 | flick e pose heroica |
| `0,42–0,50 s` | 8,4–10 | release; último pulso no tick 10 |
| `0,50–0,66 s` | 10–13,2 | follow-through curto |
| `0,66–0,82 s` | 13,2–16,4 | recuperação e settle |
| `0,82–0,90 s` | 16,4–18 | buffer de cooldown |

O contrato transacional é indivisível: `commit da carga = som splash = primeiro pulso = tick 5`.

## Envelopes

| Canal | Limite automatizado |
| --- | ---: |
| Correção total de `rightarm` | magnitude `≤ 25°` |
| Rotação local de `aspergillum_action` | magnitude `≤ 18°` |
| Translação local | magnitude `≤ 0,5` unidade de modelo |
| Mudança por frame a 30 FPS | `≤ 10°` |
| Erro de rotação final | `≤ 0,1°` |
| Erro de posição final | `≤ 0,01` unidade |

O validador amostra curvas Catmull-Rom a 120 Hz. Poses neutras duplicadas em `0,00/0,04` e no settle reduzem overshoot nas bordas.

## Perspectivas

### Primeira pessoa

- item visível em todos os frames;
- arco compacto e sempre à direita da mira;
- nenhuma alteração na pose estática;
- se necessário, reduzir apenas a amplitude da ação FP.

### Terceira pessoa

- uma única partida, sem reset;
- cabo permanece no punho;
- pose heroica projeta a cabeça para frente/fora;
- nenhuma interseção com rosto, ombro ou tórax;
- silhueta legível em wide, slim, frontal, traseira e lateral.

## Controller e fallback

O controller `idle → sprinkle → recovery` é processado continuamente pelo attachable. Ele usa a categoria `aspergillum_sprinkle` na mão principal; tentativa vazia não inicia esse cooldown. Cada estado usa crossfade de `0,08 s` e menor caminho Euler.

O contexto Molang precisa ser confirmado no Content Log do cliente. Se o controller não resolver a categoria/slot, a lógica autoritativa e as gotas script-side continuam funcionando; a revisão deve retornar a um gatilho visual comprovado antes de remover qualquer fallback.

Se a correção corporal ainda produzir solavanco no runtime, remova somente `playSprinkleAnimation()`: mantenha swing vanilla e ação local FP/TP. Não reintroduza reset absoluto nem `rightitem`.

## Gate de revisão

Execute `npm run validate:animation` antes de empacotar. Qualquer mudança em bones, envelopes, release, controller ou interpolação exige atualização deste contrato e evidência física no pacote final importado.
