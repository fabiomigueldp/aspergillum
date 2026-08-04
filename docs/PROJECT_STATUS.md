# Estado do projeto

## Baseline

- **Versão de referência:** `1.0.14`
- **Engine mínima:** Creator `1.26.30`
- **Script API:** `@minecraft/server` `2.8.0`, estável
- **Experimentos:** nenhum
- **Conteúdo:** aspersório funcional, caldeirinha colocável, carregamento, três cargas, docking decorativo e spray visual

A v1.0.14 encerrou a investigação estrutural do attachable. Binding, escala, primeira pessoa, herança do braço, geometria opaca e trajetória controlável constituem a base consolidada. O projeto ainda não atingiu a V1 final de excelência: faltam animações próprias, origem visual exata no modelo e persistência completa do item acomodado.

## O que está resolvido

- O attachable usa a mão direita por item-slot binding e acompanha integralmente o braço.
- O modelo aparece em primeira e terceira pessoa, em escala física coerente.
- A pose de primeira pessoa está aprovada e deve permanecer congelada.
- A pose de terceira pessoa está suficientemente calibrada para iniciar a fase de animação.
- A malha não apresenta o desaparecimento recorrente de faces observado em versões antigas.
- Sobrevivência e Aventura consomem cargas; Criativo preserva uma carga real já existente; Espectador é negado.
- O carregamento usa `instance_id`, uma sessão por jogador, lock leve por bloco, revalidação e rollback defensivo.
- A rajada usa 36 gotas em seis pulsos, leque anisotrópico, gravidade, colisão e direção suavizada conforme a câmera.
- Trocar item ou dimensão cancela os pulsos restantes.

## Limitações conhecidas

| Área | Situação atual | Consequência |
| --- | --- | --- |
| Carregamento | movimento vanilla genérico | a cabeça pode atravessar ombro/rosto e não mergulha de forma legível |
| Aspersão | swing vanilla genérico | o gesto ainda parece ataque, não uma ação litúrgica |
| Origem das gotas | aproximação por cabeça + direção do jogador | não coincide exatamente com a cabeça animada do modelo |
| Primeiro pulso | parte da direção lida no momento de liberação | a transição desde a direção no início do swing ainda pode ser refinada |
| Base do leque | reconstruída por pulso | pitches extremos ainda merecem transporte paralelo para eliminar roll descontínuo |
| Docking | bloco guarda apenas `has_aspergillum` | `nameTag`, identidade e futuras variantes podem se perder ao acomodar |
| Overflow | cargas podem exceder espaço livre ao acomodar | água pode ser descartada sem intenção se não for recusado |
| Schema/lore | schema ainda não é uma migração completa; lore é textual | compatibilidade futura e localização persistente ainda não estão concluídas |
| Entrada vanilla | `playerSwingStart` é after-event | alguns dispositivos podem mostrar feedback breve de mineração |

## Próxima mudança autorizada

O próximo marco é a fundação de animação descrita em [ROADMAP.md](ROADMAP.md): introduzir `aspergillum_action`, separar reserva e commit da aspersão no instante de liberação e criar animações próprias sem alterar binding, escala ou primeira pessoa.

Não faz parte do próximo marco:

- refazer a malha;
- trocar o binding;
- substituir toda a arquitetura de uma vez;
- remover o emissor matemático antes de um locator equivalente estar validado;
- adicionar efeitos de gameplay sobre mobs ou blocos.

## Evidência necessária para avançar

Cada revisão visual precisa registrar versão, perspectiva, modelo de jogador, ação, resultado esperado, resultado observado e Content Log. O pacote efetivamente importado deve ser o mesmo produzido em `dist/releases/`, e packs anteriores devem ser removidos antes do teste.
