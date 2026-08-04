# Contrato de design de VFX

## Objetivo

A água deve nascer da cabeça visível do aspergillum, formar um leque litúrgico legível e conservar o steering deliberado da câmera sem gerar uma segunda rajada, governar gameplay ou seguir o braço depois da emissão.

## Arquitetura híbrida da v1.0.16b

```text
sprinkler_head
└── spray_aim
    └── aspergillum_tip
        └── holy_water_release (4 microgotas, world-space)

SprinkleSession
└── 6 pulsos × 6 holy_water_droplet (36 gotas balísticas)
```

- O Resource Pack é autoritativo apenas para o bridge visual da ponta, micro-splash e áudio.
- O script continua autoritativo para autorização, commit, cooldown, 36 gotas e steering.
- Nenhuma partícula concede carga, consome água ou aplica efeito de gameplay.
- O emissor script-side só poderá ser removido depois de equivalência física em primeira pessoa, terceira pessoa local e observador remoto.

## Locator

| Elemento | Contrato |
| --- | --- |
| Bone | `spray_aim`, filho de `sprinkler_head`, sem cubos |
| Pivot | `[-6, 36.8, 1]` |
| Locator | `aspergillum_tip` em `[-6, 37.8, 1]` |
| Release | `0.25 s` / tick 5 |
| Espaço pós-emissão | world-space por `bind_to_actor: false` |

O bridge contém quatro partículas, herda `position: true` e `rotation: true`, avança a `1.35–1.75` blocos/s e vive `0.26–0.38 s`. A combinação anterior `position: false`/`rotation: true` é proibida porque o runtime Bedrock a rejeita. A função do bridge é tornar contínua a leitura ponta→leque, não acrescentar um segundo leque.

## Gatilho e áudio

O controller do attachable entra em `sprinkle` somente quando a categoria válida `aspergillum_sprinkle` começa. A timeline por perspectiva dispara:

- `0.08 s`: `aspergillum.sprinkle.prepare`;
- `0.25 s`: `aspergillum.sprinkle.release` e `holy_water_release` em `aspergillum_tip`.

Tentativa vazia não inicia a categoria válida e não pode emitir bridge ou som molhado. O script mantém apenas o feedback seco da tentativa vazia; o splash válido foi removido do script para não duplicar o áudio da timeline.

## Gota principal

- billboard `0.042 × 0.100` bloco antes do multiplicador por perfil;
- `rotate_xyz`, que preserva a área aparente e a leitura suave em todos os ângulos;
- velocidade, lifetime, gravidade, arrasto e alcance idênticos à baseline aprovada;
- gravidade, arrasto, collision radius e balística existentes preservados;
- ao colidir com velocidade mínima `2.0`, dispara um único `holy_water_micro_splash` cosmético.

## Contrato cromático

- a textura radial é neutra (`RGB [245,249,255]`) e não impõe um segundo ciano sobre o tint;
- `holy_water_droplet`, `holy_water_release` e `holy_water_micro_splash` têm gradientes próprios de azul frio, com azul dominante até alfa zero;
- os três efeitos omitem `minecraft:particle_appearance_lighting`: esse componente tinge a partícula pelas condições locais e pode deslocar água clara para verde/amarelo sob iluminação colorida;
- o fade continua sendo produzido por `variable.particle_age / variable.particle_lifetime` e pelo canal alfa, sem alterar lifetime, tamanho ou movimento;
- a água pode variar em luminosidade perceptual pelo fundo e transparência, mas não em identidade cromática.

## Invariantes

- exatamente 36 gotas balísticas em seis pulsos por aspersão válida;
- exatamente um bridge de quatro microgotas no release;
- nenhuma emissão molhada em ataque vazio;
- gotas emitidas permanecem em world-space;
- steering conserva resposta `0.8` e limite de `30°`;
- nenhum segundo leque, som splash duplicado ou autoridade de gameplay no cliente;
- origem visual a até `0.10` bloco da cabeça renderizada no pacote final.
- nenhuma fase da gota ou do impacto pode adquirir dominante verde/amarela por iluminação local.

## Gate físico

Validar no `.mcaddon` final:

1. ponta e bridge coincidem em FP e TP;
2. o bridge não é percebido como rajada adicional;
3. um observador remoto vê uma única aspersão;
4. giro da câmera ainda curva apenas pulsos futuros;
5. gotas não nascem no rosto/tórax nem ficam presas ao braço;
6. impacto é discreto e billboards próximos nunca superam a cabeça do avatar;
7. Content Log não acusa locator, efeito, evento, som ou Molang desconhecido.
8. em luz diurna, sombra e junto a fontes quentes, gotas distantes e micro-splashes permanecem inequivocamente azuis.

Execute `npm run validate:vfx` antes de empacotar. Mudanças no locator, gatilho, quantidade, escala, orientação, impacto ou divisão de responsabilidades exigem atualização deste contrato.
