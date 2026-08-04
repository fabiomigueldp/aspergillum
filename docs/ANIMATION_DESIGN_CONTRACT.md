# Contrato de design de animação

## Objetivo

A aspersão deve ser uma frase visual única — antecipação, condução, flick, release, follow-through e settle — sem lutar contra o swing iniciado pelo motor. Este contrato protege a v1.0.15d, aprovada fisicamente pelo usuário, e orienta refinamentos futuros.

## Composição obrigatória

```text
swing vanilla de 0,90 s
+ ponte de continuidade TP dirigida por attack_time
+ pose estática por perspectiva em aspergillum_presentation
+ coreografia local FP/TP em aspergillum_action
```

- `aspergillum_bound` contém somente o binding e nunca é animado.
- `aspergillum_presentation` contém somente a pose estática aprovada.
- O swing vanilla é o proprietário do arco amplo de `rightarm` e o único proprietário de `rightitem` durante a aspersão.
- Não existe `playSprinkleAnimation()`, animação corporal absoluta ou segunda timeline independente de recovery.
- `animation.aspergillum.player.sprinkle.recovery_bridge` pode somar somente a compensação Y documentada abaixo; ela não autoriza outros canais, bones ou keyframes artísticos.
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

Na v1.0.16, `som splash` e o bridge do locator são eventos da timeline em `0.25 s`; as 36 gotas script-side continuam iniciando no mesmo tick. Isso acrescenta VFX sem alterar qualquer keyframe, duração ou canal deste contrato.

## Envelopes

| Canal | Limite automatizado |
| --- | ---: |
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

## Controller e recuperação nativa

O controller `idle → sprinkle → recovery` é processado continuamente pelo attachable. Ele usa a categoria `aspergillum_sprinkle` na mão principal; tentativa vazia não inicia esse cooldown. Cada estado usa crossfade de `0,08 s` e menor caminho Euler.

O contexto Molang precisa ser confirmado no Content Log do cliente. Se o controller não resolver a categoria/slot, a lógica autoritativa e as gotas script-side continuam funcionando; a revisão deve retornar a um gatilho visual comprovado antes de remover qualquer fallback.

O isolamento da 1.0.15c comprovou que o snap remanescente pertence à própria curva vanilla: imediatamente antes do reset, o ramo Y do `rightarm` tende a `-30°`, não a zero. A 1.0.15d usa o mesmo `variable.attack_time` como relógio para fechar exclusivamente essa costura.

## Ponte de recuperação

A ponte é uma compensação matemática da curva-base, não uma coreografia adicional:

```text
p = clamp((attack_time - 0,50) / 0,50, 0, 1)
bridge_y = third_person && 0 < attack_time < 1
  ? 30° * hermite_blend(p)
  : 0°
```

Contratos:

- `animation_length: 1.10` apenas para sobreviver ao reset do swing; a saída visual já é zero;
- `override_previous_animation: false`;
- único bone: `rightarm`;
- único componente não zero: rotação Y;
- zero em primeira pessoa, `attack_time <= 0` e `attack_time >= 1`;
- zero durante a metade inicial para absorver a latência do after-event sem criar entrada visível;
- Hermite garante velocidade nula no início e no fim da compensação;
- `blendOutTime` é somente limpeza defensiva depois que a expressão já voltou a zero;
- falha da ponte não afeta item, carga, cooldown, água, partículas ou sessão.

O follow-through composto pode continuar até aproximadamente 60% do swing. A partir daí, o braço deve retornar uma única vez: sem overshoot, rebote ou segunda intenção. O validador reproduz a costura oficial de aproximadamente `30°`, exige erro inferior a `0,01°` antes do reset, no máximo uma reversão e variação inferior a `5°` por frame a 30 FPS durante o recovery.

O validador deve falhar se reaparecer `animation.aspergillum.player.sprinkle.body`, `playSprinkleAnimation()`, qualquer canal em `rightitem` ou qualquer expansão artística da ponte além de `rightarm.y`.

## Gate de revisão

Execute `npm run validate:animation` antes de empacotar. Qualquer mudança em bones, envelopes, release, controller ou interpolação exige atualização deste contrato e evidência física no pacote final importado.
