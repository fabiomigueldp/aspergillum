# Estado do projeto

## Baseline

- **Versão de referência:** `1.0.15`
- **Engine mínima:** Creator `1.26.30`
- **Script API:** `@minecraft/server` `2.8.0`, estável
- **Experimentos:** nenhum
- **Conteúdo:** aspersório funcional, caldeirinha colocável, carregamento, três cargas, docking decorativo e spray visual

A v1.0.14 encerrou a investigação estrutural do attachable. A v1.0.15 preserva essa base e inaugura a fase de produto: introduz hierarquia de apresentação/ação, gestos one-shot, commit da carga no release e transporte estável do leque. O projeto ainda não atingiu a V1 final: faltam validar fisicamente as novas animações, levar a origem visual ao locator e preservar integralmente o item acomodado.

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
- A carga é reservada no swing e consumida/preservada somente no release do tick 4.
- `ActionLease` impede que carregar e aspergir concorram para o mesmo jogador.
- Carregamento e aspersão acionam animações one-shot estáveis sobre `rightarm` e `rightitem`.
- Trocar item ou dimensão cancela os pulsos restantes.

## Limitações conhecidas

| Área | Situação atual | Consequência |
| --- | --- | --- |
| Carregamento | gesto próprio recém-integrado | trajetória e clipping ainda precisam de validação física em wide/slim e primeira/terceira pessoa |
| Aspersão | gesto litúrgico próprio recém-integrado | sobreposição com animações vanilla e leitura do arco ainda precisam do teste no runtime |
| Origem das gotas | aproximação por cabeça + direção do jogador | não coincide exatamente com a cabeça animada do modelo |
| Docking | bloco guarda apenas `has_aspergillum` | `nameTag`, identidade e futuras variantes podem se perder ao acomodar |
| Overflow | cargas podem exceder espaço livre ao acomodar | água pode ser descartada sem intenção se não for recusado |
| Schema/lore | schema ainda não é uma migração completa; lore é textual | compatibilidade futura e localização persistente ainda não estão concluídas |
| Entrada vanilla | `playerSwingStart` é after-event | alguns dispositivos podem mostrar feedback breve de mineração |

## Próxima mudança autorizada

O próximo marco de implementação é a v1.0.16 descrita em [ROADMAP.md](ROADMAP.md): validar o gatilho client-side, adicionar `spray_aim`/`aspergillum_tip` e aproximar a origem visual da cabeça real sem perder steering ou multiplayer.

Não faz parte do próximo marco:

- recalibrar as animações antes do relatório físico da v1.0.15;
- refazer a malha;
- trocar o binding;
- substituir toda a arquitetura de uma vez;
- remover o emissor matemático antes de um locator equivalente estar validado;
- adicionar efeitos de gameplay sobre mobs ou blocos.

## Evidência necessária para avançar

Cada revisão visual precisa registrar versão, perspectiva, modelo de jogador, ação, resultado esperado, resultado observado e Content Log. O pacote efetivamente importado deve ser o mesmo produzido em `dist/releases/`, e packs anteriores devem ser removidos antes do teste.
