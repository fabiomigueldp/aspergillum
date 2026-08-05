# Contrato de design de animação

## Objetivo

A aspersão deve ser uma frase visual única — antecipação, condução, flick, release, follow-through e settle — sem lutar contra o swing iniciado pelo motor. Este contrato protege a v1.0.15d, aprovada fisicamente pelo usuário, e a composição camera-safe de carregamento concluída na v1.0.18b.

## Carregamento camera-safe

O carregamento é uma correção aditiva de `0,8 s` aplicada sobre o movimento de uso iniciado pelo motor. Ele obedece aos seguintes invariantes:

- `override_previous_animation: false`;
- único bone permitido: `rightarm`;
- `rightitem` pertence exclusivamente à hierarquia de item segurado e nunca é animado pela carga;
- `blend_weight` é `0.32` em primeira pessoa e `1.0` em terceira pessoa;
- curvas Catmull-Rom começam neutras em `0,00/0,04 s`, desaceleram na imersão e assentam visualmente em `0,76/0,80 s`;
- magnitude de rotação bruta `≤ 21,5°`, mudança `≤ 6°` por frame a 30 FPS e no máximo uma reversão principal;
- o commit transacional continua no tick 10 e não depende da animação ser reproduzida.

O peso reduzido em primeira pessoa é parte do envelope de câmera, não uma pose estática alternativa. O item deve permanecer visível em todos os frames; a terceira pessoa conserva o arco completo para comunicar o movimento de descida e imersão. Falha visual permanece fail-soft e não altera água, cargas, sessão ou lock.

### Recuperação composta da carga

A curva visível estar em zero não basta: `animation.player.attack.rotations` tende a aproximadamente `-30°` em `rightarm.y` imediatamente antes de `attack_time` zerar. A v1.0.18b mantém o contêiner da carga até `1,10 s` e soma, em cada keyframe Y, a compensação:

```text
p = clamp((attack_time - 0,50) / 0,50, 0, 1)
bridge_y = third_person && 0 < attack_time < 1
  ? 30° * hermite_blend(p)
  : 0°
```

O gesto local continua zero depois de `0,80 s`; somente essa expressão permanece. Em primeira pessoa ela é sempre zero. Em terceira, aproxima-se de `+30°` com velocidade nula e cancela a costura nativa antes que ambas as camadas desapareçam. O fade de `0,05 s` é limpeza defensiva, não proprietário do retorno.

O gate automatizado deve medir a soma nativa completa com a curva local, exigir erro pré-reset `< 0,11°`, no máximo uma reversão, variação composta `< 9°` durante o recovery expressivo e `< 5°` por frame no trecho terminal após `0,80 s`.

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

O validador deve falhar se reaparecer `animation.aspergillum.player.sprinkle.body`, `playSprinkleAnimation()`, qualquer canal em `rightitem` na aspersão ou carga, qualquer reset de pose no carregamento ou qualquer expansão artística da ponte além de `rightarm.y`.

## Gate de revisão

Execute `npm run validate:animation` antes de empacotar. Qualquer mudança em bones, envelopes, release, controller ou interpolação exige atualização deste contrato e evidência física no pacote final importado.
