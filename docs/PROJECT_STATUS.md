# Estado do projeto

## Baseline

- **Versão de referência:** `1.0.15c` (revisão numérica dos packs `[1, 0, 17]`)
- **Engine mínima:** Creator `1.26.30`
- **Script API:** `@minecraft/server` `2.8.0`, estável
- **Experimentos:** nenhum
- **Conteúdo:** aspersório funcional, caldeirinha colocável, carregamento, três cargas, docking decorativo e spray visual

A v1.0.14 encerrou a investigação estrutural do attachable. A v1.0.15 revelou que substituir tardiamente o swing vanilla causava dupla partida; a v1.0.15b removeu o reset e introduziu ação local por perspectiva, mas o teste físico mostrou que a timeline corporal aditiva ainda terminava fora de fase com o recovery nativo. A v1.0.15c executa o fallback arquitetural previsto: o swing vanilla é o único proprietário do braço e `aspergillum_action` é o único proprietário do flick do instrumento. O projeto ainda não atingiu a V1 final: essa composição precisa do teste físico, e continuam pendentes locator e docking persistente.

## O que está resolvido

- O attachable usa a mão direita por item-slot binding e acompanha integralmente o braço.
- O modelo aparece em primeira e terceira pessoa, em escala física coerente.
- A pose de primeira pessoa está aprovada e deve permanecer congelada.
- A pose de terceira pessoa está suficientemente calibrada para iniciar a fase de animação.
- A malha não apresenta o desaparecimento recorrente de faces observado em versões antigas.
- Sobrevivência e Aventura consomem cargas; Criativo preserva uma carga real já existente; Espectador é negado.
- O carregamento usa `instance_id`, uma sessão por jogador, lock leve por bloco, revalidação e rollback defensivo.
- A rajada usa 36 gotas em seis pulsos, leque anisotrópico, gravidade, colisão e direção suavizada conforme a câmera.
- O primeiro pulso transita desde a direção capturada no início do gesto; os demais transportam a base lateral sem flip vertical.
- A carga é reservada no swing e consumida/preservada somente no release do tick 5.
- `ActionLease` impede que carregar e aspergir concorram para o mesmo jogador.
- O carregamento preserva a trajetória anterior; a aspersão usa recovery vanilla íntegro no braço e flick exclusivamente local em `aspergillum_action`.
- Trocar item ou dimensão cancela os pulsos restantes.

## Limitações conhecidas

| Área | Situação atual | Consequência |
| --- | --- | --- |
| Carregamento | gesto próprio recém-integrado | trajetória e clipping ainda precisam de validação física em wide/slim e primeira/terceira pessoa |
| Aspersão | composição 1.0.15c sem timeline corporal concorrente | ausência do solavanco final e continuidade FP/TP ainda precisam do teste no runtime |
| Origem das gotas | aproximação por cabeça + direção do jogador | não coincide exatamente com a cabeça animada do modelo |
| Docking | bloco guarda apenas `has_aspergillum` | `nameTag`, identidade e futuras variantes podem se perder ao acomodar |
| Overflow | cargas podem exceder espaço livre ao acomodar | água pode ser descartada sem intenção se não for recusado |
| Schema/lore | schema ainda não é uma migração completa; lore é textual | compatibilidade futura e localização persistente ainda não estão concluídas |
| Entrada vanilla | `playerSwingStart` é after-event | alguns dispositivos podem mostrar feedback breve de mineração |

## Próxima mudança autorizada

Após a aprovação física da v1.0.15c, o próximo marco é a v1.0.16 descrita em [ROADMAP.md](ROADMAP.md): adicionar `spray_aim`/`aspergillum_tip` e aproximar a origem visual da cabeça real sem perder steering ou multiplayer.

Não faz parte do próximo marco:

- recalibrar as animações antes do relatório físico da v1.0.15;
- refazer a malha;
- trocar o binding;
- substituir toda a arquitetura de uma vez;
- remover o emissor matemático antes de um locator equivalente estar validado;
- adicionar efeitos de gameplay sobre mobs ou blocos.

## Evidência necessária para avançar

Cada revisão visual precisa registrar versão, perspectiva, modelo de jogador, ação, resultado esperado, resultado observado e Content Log. O pacote efetivamente importado deve ser o mesmo produzido em `dist/releases/`, e packs anteriores devem ser removidos antes do teste.
