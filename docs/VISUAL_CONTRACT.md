# Contrato visual congelado

Este documento registra os valores comprovados até a v1.0.14. Eles são baseline, não sugestões de calibração.

## Attachable

```text
rightItem (holder)
└── aspergillum_bound
    └── aspergillum_visual
        └── malha atual
```

| Propriedade | Valor protegido |
| --- | --- |
| Geometry format | `1.16.0` |
| Binding | `q.item_slot_to_bone_name(context.item_slot)` |
| Osso vinculado | `aspergillum_bound`, neutro, sem cubos ou ajuste artístico |
| Grip/pivot empírico | `[-6, 24, 1]` |
| Rotação estrutural | `[25, 0, -12]` |
| Escala | `1` |
| Comprimento | `15.6` unidades de modelo (`0.975` bloco) |
| Primeira pessoa: posição aditiva | `[0, 0, 0]` |
| Primeira pessoa: rotação aditiva | `[180, 0, 0]` |
| Primeira pessoa: rotação efetiva | `[205, 0, -12]` |
| Terceira pessoa: posição aditiva | `[5, -1.5, -2.25]` |
| Terceira pessoa: rotação aditiva | `[10, 0, 0]` |
| Terceira pessoa: rotação efetiva | `[35, 0, -12]` |

### Regras de mudança

- `aspergillum_bound` recebe somente o binding.
- Ajuste de perspectiva pertence a `aspergillum_visual` ou à futura `aspergillum_presentation`.
- Movimento de ação pertence à futura `aspergillum_action`, com pivô no grip.
- Pivot altera o centro de rotação; não substitui a posição dos vértices.
- A pose de primeira pessoa não deve ser afetada por correções de terceira pessoa.
- Não se transplanta pose de tridente, lança ou outra malha vanilla como se fosse universal.

## Spray v1.0.14

| Propriedade | Baseline |
| --- | --- |
| Total | `36` gotas |
| Pulsos | `6`, com `6` gotas por pulso |
| Janela atual | ticks `+4` a `+9` |
| Resposta direcional | `0.8` |
| Giro máximo por atualização | `30°` |
| Espaço após emissão | world-space |
| Abertura horizontal máxima | aproximadamente `±14.5°` |
| Abertura vertical máxima | inferior a `5.2°` |
| Velocidade | `12.70–13.98` blocos/s |
| Cancelamento | troca de item ou dimensão |

A curvatura conforme a câmera é intencional e deve ser preservada. Ela oferece controle gestual durante a janela de liberação. O limite angular e a interpolação esférica impedem estalos; partículas já emitidas não mudam de trajetória.

## Hierarquia-alvo

```text
aspergillum_bound          binding, sempre neutro
└── aspergillum_presentation  pose estática por perspectiva
    └── aspergillum_action    movimento de carregar/aspergir
        ├── handle
        └── sprinkler_head
            └── spray_aim
                └── locator aspergillum_tip
```

Essa hierarquia é planejada. Ela deve ser introduzida incrementalmente e validada após cada camada. `spray_aim` permite que o locator preserve a direção gestual do usuário sem arrastar gotas já emitidas.

## Critérios de aceitação visual

- O cabo atravessa o centro do punho em terceira pessoa, com 1–2 unidades visíveis abaixo da mão.
- A cabeça não cruza ombro, peito, pescoço ou rosto em repouso e nas ações.
- Primeira pessoa permanece legível, sem bloquear a mira ou o plano próximo.
- Steve/wide, Alex/slim e Persona apresentam pose aceitável.
- O spray nasce a até `0.10` bloco da ponta renderizada, forma leque horizontal, não gera halo e não produz gotas gigantes próximas à câmera.
- Mover a câmera durante os pulsos curva o leque de modo suave, limitado e previsível.
