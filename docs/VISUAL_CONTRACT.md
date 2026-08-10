# Contrato visual congelado

Este documento registra os valores estruturais comprovados até a v1.0.15d, a integração VFX corrigida até a v1.0.16c e o pipeline de superfície/coerência de composição atualizado na v1.0.19b. Eles são baseline, não sugestões de calibração.

A v1.1 adiciona variantes de superfície, perfis de spray, a transição limpa do pomo da v1.1.4, as junções de tampa única da cabeça da v1.1.6 e a água por entidade da caldeirinha na v1.1.9. Nenhum acabamento pode alterar bones, pivôs, grip, locator ou poses abaixo. `classic` mantém a linguagem material da 1.0.20; as oito variantes trocam apenas color/normal/MER derivados do catálogo. Item empunhado, caldeirinha e mesa derivam as mesmas quatorze peças, máscaras e UVs da fonte autoral, sem exceção geométrica local.

## Attachable

```text
rightItem (holder)
└── aspergillum_bound
    └── aspergillum_presentation
        └── aspergillum_action
            ├── handle
            └── sprinkler_head
                └── spray_aim
                    └── locator aspergillum_tip
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
| Largura máxima da cabeça | `4.94` unidades de modelo |
| Peças reais | `14`: oito no cabo e seis na cabeça |
| Fonte autoral | `assets-src/models/aspergillum.model.json` |
| UV distribuído | faces visíveis explícitas por cubo; faces internas omitidas; coordenadas e `uv_size` inteiros |
| Atlas do item | `128 × 128`, densidade de `2` texels por unidade de modelo |
| Footprint mínimo | `1 × 1` texel por face; dimensões usam `ceil(dimensão × 2)`, nunca Box UV implícito |
| Padding do atlas | `2` texels dilatados ao redor de cada ilha para proteger mipmaps |
| Superfícies | grip `leather`; pomo/haste/cabeça `silver`; férula `gold`; corpo da cabeça `perforated_silver` |
| Cabeça v1.1.6 | seis níveis preservados; quatro paredes integrais por volume e exatamente uma tampa horizontal renderizada por junção |
| Caldeirinha v1.1.9 | estrutura e réplica acomodada integralmente `opaque`; os quatro níveis autorados são gerados exclusivamente numa entidade mínima `entity_alphablend`, fisicamente aprovada na 1.1.9c |
| Fonte autoral do bloco | `assets-src/models/aspersorium.model.json` |
| Composição acomodada | as quatorze peças, máscaras e UVs do item são transformadas pelo gerador; não existe réplica simplificada |
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
- Dimensão física e resolução de UV são contratos distintos: cubos podem permanecer abaixo de uma unidade para preservar a silhueta, mas a densidade aprovada é de dois texels por unidade e nenhuma face pode receber menos de um texel.
- Box UV é proibido no attachable empunhado enquanto houver dimensão menor que uma unidade; cada face renderizada deve permanecer explícita e dentro do atlas, e uma face ausente deve representar omissão deliberada na fonte.
- Color, normal e MER devem nascer do mesmo layout gerado. Não se edita um PNG final ou a geometria distribuída isoladamente.
- O pomo usa placa sólida `2.25 × 0.6 × 2.25` em `[-7.125, 21.2, -0.125]` e aro externo `2.15 × 0.75 × 2.15`, composto por quatro barras ao redor de uma abertura `1.75 × 1.75`. O couro começa em `y = 21.8`, deixa folga radial de `0.0625` para o aro e não possui sobreposição positiva com nenhuma peça do pomo. O comprimento mínimo continua em `y = 21.2`.
- Tampas internas são omitidas por máscara autoral: `leather_grip.down`, `silver_shaft.down`, os quatro `collar.down` e as tampas norte/sul das duas barras laterais. O gerador, os visualizadores e as composições acomodadas devem preservar exatamente essas máscaras.
- Na cabeça, todos os seis volumes preservam `north/east/south/west`. Em cada junção, somente o volume de maior seção fornece a tampa visível: `lower_head_dome.down`, `perforated_head.down/up`, `upper_head_dome.up` e `upper_head_ring.up`; as faces opostas correspondentes são omitidas. Nenhum par de faces renderizadas pode compartilhar área positiva no mesmo plano.
- A aparência `resting_aspergillum` deve ser derivada do attachable: cada origin recebe somente a translação `[6,-17,-1]`, cada size permanece igual e cada ilha UV recebe somente o offset `[128,0]` no atlas `256 × 256` da caldeirinha.

## Spray v1.0.16c

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
| Origem visual | `aspergillum_tip`, `1` unidade além da tampa da cabeça |
| Bridge no release | `4` microgotas, `1.35–1.75` blocos/s, lifetime `0.26–0.38 s` |
| Local space do bridge | posição e rotação herdadas juntas; `velocity: false` |
| Billboard do bridge | `0.028 × 0.060`, `rotate_xyz` |
| Billboard principal | `0.042 × 0.100` bloco, `rotate_xyz`, escala do perfil |
| Impacto | `1` micro-splash cosmético por colisão elegível |
| Cor | arrays RGBA normalizados; azul permanece dominante até o fade |
| Textura-fonte | radial neutra `RGB [245,249,255]`; o gradiente é a única fonte cromática |
| Iluminação | sem `particle_appearance_lighting`; luz local não pode deslocar água para verde/amarelo |

A curvatura conforme a câmera é intencional e deve ser preservada. Ela oferece controle gestual durante a janela de liberação. O limite angular e a interpolação esférica impedem estalos; partículas já emitidas não mudam de trajetória.

A integração é híbrida por contrato: o bridge curto confirma a origem física na ponta, enquanto o script mantém exclusivamente o leque balístico de 36 gotas. O bridge não é uma segunda aspersão, não governa gameplay e não substitui o fallback antes do gate físico/multiplayer. Consulte [Contrato de VFX](VFX_DESIGN_CONTRACT.md).

## Contrato de animação 1.0.15d

- O swing vanilla de `0,9 s` fornece o arco principal do braço; sua costura final de aproximadamente `30°` em `rightarm.y` é neutralizada por uma ponte aditiva dirigida pelo mesmo `variable.attack_time`.
- A ponte não é uma segunda coreografia: permanece zero até 50% do swing, afeta somente `rightarm.y`, usa `override_previous_animation: false`, é nula em primeira pessoa e expira já neutra.
- Nem carga nem aspersão animam `rightitem`. A carga da 1.0.18a soma somente um arco moderado em `rightarm`, com 32% do peso em primeira pessoa e sem reset; a aspersão não restaura `animation.aspergillum.player.sprinkle.body` nem usa keyframes absolutos de braço.
- Durante a carga em primeira pessoa, mão e instrumento permanecem visíveis em todos os frames, à direita da mira e sem tocar a borda superior. A pose estática aprovada não recebe compensação.
- Em terceira pessoa, a mesma carga usa amplitude integral, descreve um único dip e assenta visualmente antes de `0,8 s`; uma cauda Hermite exclusiva de `rightarm.y` neutraliza a costura vanilla sem criar segunda intenção, atravessar rosto ou mover o item em primeira pessoa.
- `aspergillum_action` é o único bone da coreografia fina do instrumento.
- Primeira e terceira pessoa usam animações locais distintas e retornam a zero até `0,82 s`.
- O controller local cruza estados em `0,08 s` pelo menor caminho e só entra na ação diante do cooldown válido.
- O primeiro pulso, o commit e o som concordam no tick 5.
- Consulte [Contrato de design de animação](ANIMATION_DESIGN_CONTRACT.md) para envelopes e gates matemáticos.

## Feedback molhado do carregamento 1.0.18

No commit válido do tick 10, duas instâncias do `holy_water_micro_splash` aparecem dentro da área central da caldeirinha. Esse cue é deliberadamente mínimo, reutiliza a paleta azul validada e não representa uma segunda transferência de água. Falha de partícula ou som não reverte nem concede carga; pose, trajetória de carregamento e níveis visuais do bloco permanecem congelados.

## Hierarquia implementada

```text
aspergillum_bound          binding, sempre neutro
└── aspergillum_presentation  pose estática por perspectiva
    └── aspergillum_action    movimento de carregar/aspergir
        ├── handle
        └── sprinkler_head
            └── spray_aim
                └── locator aspergillum_tip
```

Toda a hierarquia existe na v1.0.16c. `spray_aim` é um bone técnico sem cubos, filho da cabeça; `aspergillum_tip` fica uma unidade além da face superior. O efeito herda posição e rotação juntas no instante de criação — combinação exigida pelo runtime — e o evento usa `bind_to_actor: false`, de modo que o emissor destacado não acompanha o braço.

## Critérios de aceitação visual

- O cabo atravessa o centro do punho em terceira pessoa, com 1–2 unidades visíveis abaixo da mão.
- A cabeça não cruza ombro, peito, pescoço ou rosto em repouso e nas ações.
- Primeira pessoa permanece legível, sem bloquear a mira ou o plano próximo.
- Steve/wide, Alex/slim e Persona apresentam pose aceitável.
- Pomo, haste, férula, anéis, domos, corpo perfurado e terminal superior mantêm paredes contínuas em órbita completa; nenhuma vista lateral depende de backface ou `entity_nocull`.
- As quatro faces laterais do corpo central mostram duas fileiras de perfurações separadas por uma faixa equatorial metálica; topo/base preservam uma grade legível sem transparência real.
- Item empunhado e composição acomodada conservam a mesma sequência de materiais e a mesma silhueta local, admitindo apenas a rotação/translação de encaixe no reservatório.
- A única peça dourada estrutural é a férula entre haste e cabeça; o pomo e o terminal permanecem prata em todas as faces.
- O spray nasce a até `0.10` bloco da ponta renderizada, forma leque horizontal, não gera halo e não produz gotas gigantes próximas à câmera.
- Mover a câmera durante os pulsos curva o leque de modo suave, limitado e previsível.
- Gotas distantes, fade e respingos no chão permanecem azuis sob sol, sombra, tochas e Vibrant Visuals, sem leitura verde/amarela.
