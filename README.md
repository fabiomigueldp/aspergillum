# Aspergillum

Add-On para Minecraft: Bedrock Edition 26.34/35 que adiciona um **aspersório litúrgico funcional** e uma **caldeirinha (aspersorium) colocável**. O projeto usa somente APIs estáveis, não substitui conteúdo vanilla e não exige experimentos.

> **Versão 1.0.16c:** corrige definitivamente a ordem ambígua dos canais de cor com RGBA numérico explícito e usa azul aquático saturado, sem branco excessivo nem verde/amarelo no fim da vida ou nos impactos.

## Instalação rápida

1. Se uma versão de desenvolvimento anterior estiver instalada, remova **Aspergillum — Comportamento** e **Aspergillum — Recursos** em **Configurações → Armazenamento** e feche o Minecraft.
2. Abra [`dist/releases/Aspergillum-1.0.16c.mcaddon`](dist/releases/Aspergillum-1.0.16c.mcaddon) com o Minecraft.
3. Ative **Aspergillum — Comportamento** no mundo. A dependência ativa o Resource Pack correspondente.
4. Não habilite Beta APIs nem Upcoming Creator Features; o add-on não precisa delas.

O alvo mínimo é Creator `1.26.30`, correspondente à linha pública Bedrock 26.34/35. O módulo estável é `@minecraft/server` `2.8.0`.

## Como usar

- Fabrique o **Aspersório** com gravetos e pepitas de ferro.
- Fabrique a **Caldeirinha** com lingotes de ferro e uma corrente, e coloque-a sobre uma superfície.
- Use um balde d'água na caldeirinha para enchê-la com três níveis.
- Com o aspersório na mão, use-o na caldeirinha para carregar até três aspersões. Um gesto próprio conduz o braço para baixo e para a frente; a transferência continua sendo confirmada autoritativamente no tick 10.
- Use a ação **Atacar/Minar** para aspergir. O gesto não causa dano nem quebra blocos.
- No modo Criativo, uma carga real já presente não é consumida e a caldeirinha não perde água ao carregar; ao voltar ao Sobrevivência, permanece apenas o número finito de cargas gravado no item.
- Agache e use o aspersório na caldeirinha para acomodá-lo como decoração. Interaja novamente para retirá-lo.
- Para testes rápidos com cheats: `/function aspergillum/dev_kit`.

As cargas permanecem gravadas no item. Ao acomodá-lo, cargas restantes retornam à caldeirinha até o limite de três. Ao quebrar uma caldeirinha com o aspersório acomodado, ambos os objetos são recuperados; a água é descartada intencionalmente.

## Arquitetura visual de integração

- geometria `1.16.0`, primeira versão cujo schema oficial documenta o campo `binding`;
- raiz sem malha `aspergillum_bound` com `q.item_slot_to_bone_name(context.item_slot)`, preservando exatamente o caminho comprovado na 1.0.7;
- filho `aspergillum_presentation`, responsável somente pelas poses aprovadas por perspectiva;
- filho neutro `aspergillum_action`, com malha separada em `handle` e `sprinkler_head`; a cabeça hospeda `spray_aim` e o locator `aspergillum_tip` sem tocar no binding;
- malha real de 15,6 unidades autorada ao redor do grip empírico `[-6, 24, 1]`, nove unidades acima da pose da 1.0.8;
- geometria base `[25, 0, -12]`, correção de apresentação exclusiva da terceira pessoa `position [5, -1.5, -2.25]`/`rotation [10, 0, 0]` e primeira pessoa aprovada preservada sem translação;
- carregamento de 16 ticks preservado; na aspersão, o swing vanilla fornece o arco principal e uma ponte aditiva exclusiva de terceira pessoa neutraliza progressivamente sua costura final em `rightarm.y`, sem reset nem segunda coreografia absoluta;
- `aspergillum_action` executa um flick compacto de primeira pessoa ou uma silhueta mais ampla de terceira pessoa, selecionados por controller e pelo contexto da perspectiva;
- aspersão reservada no swing e confirmada no tick 5: cancelamento anterior não consome carga e cancelamento posterior não reembolsa;
- emissão balística de 36 gotas em seis grupos espaciais contínuos, sincronizada ao release e visível no multiplayer;
- bridge visual de quatro microgotas nasce exatamente no locator no tick 5, herda posição/rotação juntas, avança lentamente e confirma a ligação cabeça→leque sem formar uma segunda rajada;
- origem aproximada da ponta em `0,55` bloco à frente, `0,48` à direita e `0,15` abaixo dos olhos; inclusive o primeiro pulso parte da direção capturada no início do gesto, com resposta de 80% e no máximo 30° de giro;
- base lateral transportada paralelamente entre pulsos, evitando inversão do leque ao atravessar o olhar vertical;
- leque anisotrópico: abertura horizontal máxima aproximada de `14,5°`, vertical máxima inferior a `5,2°`, sem halo circular;
- gotas com billboard `rotate_xyz` e envelope `0.042 × 0.100`, restaurando a legibilidade aprovada em qualquer ângulo sem alterar velocidade, gravidade, arrasto ou alcance;
- micro-splash cosmético discreto no contato e sons próprios de preparação/liberação disparados pela mesma timeline válida do attachable;
- arquitetura híbrida deliberada: o locator governa a origem visual e o script conserva o leque controlável; não há uma segunda fan de 36 gotas nem emissão em tentativa vazia;
- material opaco `entity`, textura com alfa integral, cubos com espessura positiva e box UV completo nas seis faces;
- quatro níveis visuais de água e versão decorativa com o aspersório acomodado;
- rotação visual em 16 direções por estado próprio e geometrias estáveis, sem traits de rotação experimentais;
- texturas convencionais como fallback e texture sets PBR para Vibrant Visuals;
- localização `pt_BR` e `en_US`.

## Desenvolvimento

Requisitos: Node.js 20.11 ou superior (Node 22+ é recomendado pelo Minecraft Creator Tools).

```powershell
npm install
npm run check
npm run package
```

Comandos importantes:

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | Verifica TypeScript contra Script API 2.8.0 |
| `npm test` | Executa os testes unitários do domínio |
| `npm run build` | Gera assets, compila o script e valida o conteúdo |
| `npm run validate:animation` | Amostra a coreografia a 120 Hz e verifica envelopes/continuidade |
| `npm run validate:vfx` | Verifica locator, bridge, orientação, impacto, sons e fallback de 36 gotas |
| `npm run package` | Cria e valida oficialmente o `.mcaddon` |
| `npm run clean` | Remove somente artefatos gerados conhecidos |

Os PNGs finais são gerados deterministicamente por [`tools/generate-assets.mjs`](tools/generate-assets.mjs). A referência visual em [`assets-src/concept-art/aspergillum-concept.png`](assets-src/concept-art/aspergillum-concept.png) orienta proporções e materiais, mas não é distribuída no add-on.

## Estrutura

```text
packs/behavior/       Behavior Pack e JavaScript compilado
packs/resource/       Resource Pack, modelos, animações e partículas
src/domain/           regras puras e testáveis
src/application/      casos de uso de carga e aspersão
src/infrastructure/   adaptação para inventário, estados e feedback Bedrock
src/bootstrap/        registro único de componentes e eventos
tests/                testes unitários sem dependência do jogo
tools/                geração, validação e empacotamento
assets-src/           referências de produção não distribuídas
docs/                 estado, contratos, arquitetura, roadmap, QA e release
dist/releases/        pacotes e hashes gerados (ignorados pelo Git)
dist/validation/      relatórios oficiais por versão (ignorados pelo Git)
```

Comece pelo [índice da documentação](docs/README.md), pelo [estado atual](docs/PROJECT_STATUS.md) e pelo [roadmap da V1](docs/ROADMAP.md).

## Limite conhecido da plataforma

`playerSwingStart` é um after-event. O add-on cancela o dano antes que ele ocorra e cancela a quebra final, mas alguns dispositivos podem mostrar por um instante o feedback vanilla de mineração ao aspergir contra um bloco. Isso deve ser avaliado no teste físico de mouse/teclado, controle e toque descrito no plano de QA.

## Licença

Código e assets próprios sob a licença MIT. Minecraft é marca da Microsoft/Mojang; este projeto não é afiliado nem endossado por elas.
