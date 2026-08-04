# Contrato visual congelado

Este documento registra os valores estruturais comprovados até a v1.0.14 e preservados na v1.0.15c. Eles são baseline, não sugestões de calibração.

## Attachable

```text
rightItem (holder)
└── aspergillum_bound
    └── aspergillum_presentation
        └── aspergillum_action
            ├── handle
            └── sprinkler_head
```

| Propriedade | Valor protegido |
| --- | --- |
| Geometry format | `1.16.0` |
| Binding | `q.item_slot_to_bone_name(context.item_slot)` |
| Osso vinculado | `aspergillum_bound`, neutro, sem cubos ou ajuste artístico |
| Apresentação | `aspergillum_presentation`, poses por perspectiva |
| Ação | `aspergillum_action`, neutro e centrado no grip |
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
- Ajuste de perspectiva pertence a `aspergillum_presentation`.
- A raiz local de ação é `aspergillum_action`, neutra e com pivô no grip; a coreografia fina move somente esse bone, enquanto o holder segue exclusivamente o swing nativo.
- Pivot altera o centro de rotação; não substitui a posição dos vértices.
- A pose de primeira pessoa não deve ser afetada por correções de terceira pessoa.
- Não se transplanta pose de tridente, lança ou outra malha vanilla como se fosse universal.

## Spray v1.0.15c

| Propriedade | Baseline |
| --- | --- |
| Total | `36` gotas |
| Pulsos | `6`, com `6` gotas por pulso |
| Janela atual | ticks `+5` a `+10` |
| Resposta direcional | `0.8` |
| Giro máximo por atualização | `30°` |
| Espaço após emissão | world-space |
| Abertura horizontal máxima | aproximadamente `±14.5°` |
| Abertura vertical máxima | inferior a `5.2°` |
| Velocidade | `12.70–13.98` blocos/s |
| Cancelamento | troca de item ou dimensão |
| Release transacional | reserva no tick 0; commit no tick 5 |
| Base do leque | transporte paralelo entre pulsos |

A curvatura conforme a câmera é intencional e deve ser preservada. Ela oferece controle gestual durante a janela de liberação. O limite angular e a interpolação esférica impedem estalos; partículas já emitidas não mudam de trajetória.

## Contrato de animação 1.0.15c

- O swing vanilla de `0,9 s` é o único proprietário do braço e completa seu próprio recovery sem timeline corporal concorrente.
- A aspersão não chama `Entity.playAnimation()` nem anima `rightarm`/`rightitem`; a animação one-shot permanece exclusiva do carregamento.
- `aspergillum_action` é o único bone da coreografia fina do instrumento.
- Primeira e terceira pessoa usam animações locais distintas e retornam a zero até `0,82 s`.
- O controller local cruza estados em `0,08 s` pelo menor caminho e só entra na ação diante do cooldown válido.
- O primeiro pulso, o commit e o som concordam no tick 5.
- Consulte [Contrato de design de animação](ANIMATION_DESIGN_CONTRACT.md) para envelopes e gates matemáticos.

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

Até `sprinkler_head`, essa hierarquia existe na v1.0.15. `spray_aim` e o locator permanecem planejados para a v1.0.16, permitindo preservar a direção gestual sem arrastar gotas já emitidas.

## Critérios de aceitação visual

- O cabo atravessa o centro do punho em terceira pessoa, com 1–2 unidades visíveis abaixo da mão.
- A cabeça não cruza ombro, peito, pescoço ou rosto em repouso e nas ações.
- Primeira pessoa permanece legível, sem bloquear a mira ou o plano próximo.
- Steve/wide, Alex/slim e Persona apresentam pose aceitável.
- O spray nasce a até `0.10` bloco da ponta renderizada, forma leque horizontal, não gera halo e não produz gotas gigantes próximas à câmera.
- Mover a câmera durante os pulsos curva o leque de modo suave, limitado e previsível.
