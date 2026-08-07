# Aspergillum

Add-On para Minecraft: Bedrock Edition 26.40 que adiciona um **aspersório litúrgico funcional**, uma **caldeirinha (aspersorium)** e uma **Mesa do Sacristão** para configuração gratuita. O projeto usa somente APIs estáveis, não substitui conteúdo vanilla e não exige experimentos.

> **Versão 1.1.2 RC:** conclui o segundo passe físico da Mesa do Sacristão: o menu ganha ritmo vertical consistente sem a seção vazia entre perfil e acabamento, e a extremidade do cabo recebe uma correção local contra cintilação. A personalização continua instantânea e gratuita, preservando cargas, identidade e propriedades do item. A 1.0.20 permanece a baseline funcional protegida.

## Instalação rápida

1. Se uma versão de desenvolvimento anterior estiver instalada, remova **Aspergillum — Comportamento** e **Aspergillum — Recursos** em **Configurações → Armazenamento** e feche o Minecraft.
2. Abra [`dist/releases/Aspergillum-1.1.2.mcaddon`](dist/releases/Aspergillum-1.1.2.mcaddon) com o Minecraft.
3. Ative **Aspergillum — Comportamento** no mundo. A dependência ativa o Resource Pack correspondente.
4. Não habilite Beta APIs nem Upcoming Creator Features; o add-on não precisa delas.

O alvo mínimo é Creator `1.26.40`, correspondente ao Bedrock 26.40. Os módulos estáveis do manifest são `@minecraft/server` `2.9.0` e `@minecraft/server-ui` `2.1.0`; `@minecraft/common` `1.3.0` permanece somente como dependência npm/tipos da UI.

## Como usar

- Fabrique o **Aspersório** com gravetos e pepitas de ferro.
- Fabrique a **Caldeirinha** com lingotes de ferro e uma corrente, e coloque-a sobre uma superfície.
- Fabrique a **Mesa do Sacristão** com carvalho escuro, carpete verde e uma pepita de ferro. A receita cria somente a estação; personalizar nunca consome materiais.
- Use um balde d'água na caldeirinha para enchê-la com dezesseis unidades, representadas em quatro quartos visuais.
- Com o aspersório na mão, use-o na caldeirinha para carregar até quatro aspersões. Uma caldeirinha cheia fornece quatro carregamentos completos; o gesto conduz o braço para baixo e para a frente, com transferência autoritativa no tick 10.
- Use a ação **Atacar/Minar** para aspergir. O gesto não causa dano nem quebra blocos.
- No modo Criativo, uma carga real já presente não é consumida e a caldeirinha não perde água ao carregar; ao voltar ao Sobrevivência, permanece apenas o número finito de cargas gravado no item.
- Agache e use o aspersório na caldeirinha para acomodá-lo como decoração. As cargas que couberem retornam à caldeirinha e qualquer restante permanece no item acomodado. Use a mão vazia para retirá-lo.
- A caldeirinha não possui menu ou inventário: carregar, acomodar e retirar são interações diretas no mundo.
- Use o aspersório na Mesa do Sacristão para acomodá-lo e abrir o menu. Escolha `Clássico`, `Processional` ou `Contido` e combine prata clássica/envelhecida/dourada com couro castanho/vinho/preto. **Concluir e retirar** devolve o mesmo item; **Fechar** deixa-o exposto sobre o veludo. Nenhuma configuração consome água, carga ou ingrediente.
- Para testes rápidos com cheats: `/function aspergillum/dev_kit`.

As cargas permanecem finitas e persistentes. Ao acomodar, a transferência satura a caldeirinha em `16/16` sem bloquear a ação; cargas excedentes, nome, identidade e propriedades ficam preservados num snapshot por chunk. Ao retirar ou quebrar uma caldeirinha ocupada, o script recupera exatamente o aspersório registrado; a água do bloco quebrado é descartada intencionalmente.

## Arquitetura visual de integração

- geometria `1.16.0`, primeira versão cujo schema oficial documenta o campo `binding`;
- raiz sem malha `aspergillum_bound` com `q.item_slot_to_bone_name(context.item_slot)`, preservando exatamente o caminho comprovado na 1.0.7;
- filho `aspergillum_presentation`, responsável somente pelas poses aprovadas por perspectiva;
- filho neutro `aspergillum_action`, com malha separada em `handle` e `sprinkler_head`; a cabeça hospeda `spray_aim` e o locator `aspergillum_tip` sem tocar no binding;
- malha real de 15,6 unidades autorada ao redor do grip empírico `[-6, 24, 1]`, nove unidades acima da pose da 1.0.8;
- geometria base `[25, 0, -12]`, correção de apresentação exclusiva da terceira pessoa `position [5, -1.5, -2.25]`/`rotation [10, 0, 0]` e primeira pessoa aprovada preservada sem translação;
- carregamento de 16 ticks recomposto como correção aditiva exclusiva de `rightarm`: peso `0.32` em primeira pessoa, amplitude integral em terceira, nenhum canal `rightitem`, envelope Hermite analítico até `0,8 s` e cauda matemática até `1,1 s` que neutraliza a costura vanilla de `rightarm.y`; a aspersão mantém sua ponte equivalente já aprovada;
- `aspergillum_action` executa um flick compacto de primeira pessoa ou uma silhueta mais ampla de terceira pessoa, selecionados por controller e pelo contexto da perspectiva;
- aspersão reservada no swing e confirmada no tick 5: cancelamento anterior não consome carga e cancelamento posterior não reembolsa;
- emissão balística de 36 gotas em seis grupos espaciais contínuos, sincronizada ao release e visível no multiplayer;
- bridge visual de quatro microgotas nasce no mesmo frame autoritativo calculado no tick 5 e confirma a ligação cabeça→leque sem formar uma segunda rajada;
- origem aproximada da ponta em `0,55` bloco à frente, `0,48` à direita e `0,15` abaixo dos olhos; inclusive o primeiro pulso parte da direção capturada no início do gesto, com resposta de 80% e no máximo 30° de giro;
- base lateral transportada paralelamente entre pulsos, evitando inversão do leque ao atravessar o olhar vertical;
- leque anisotrópico: abertura horizontal máxima aproximada de `14,5°`, vertical máxima inferior a `5,2°`, sem halo circular;
- gotas com billboard `rotate_xyz` e envelope `0.042 × 0.100`, restaurando a legibilidade aprovada em qualquer ângulo sem alterar velocidade, gravidade, arrasto ou alcance;
- micro-splash cosmético discreto no contato e áudio semanticamente separado entre pistas privadas do ator e eventos espaciais do mundo;
- 15 famílias e 48 variantes próprias em OGG Vorbis mono/48 kHz, selecionadas por shuffle bag sem repetição imediata; commits de fill/load/dock/undock/release só soam após a mutação correspondente ter sido validada;
- arquitetura híbrida deliberada: o servidor compartilha um único frame de release entre áudio, bridge e primeiro pulso, enquanto o script conserva o leque controlável; não há duplicação pela timeline nem emissão em tentativa vazia;
- material opaco `entity`, textura com alfa integral, cubos com espessura positiva e seis UVs per-face explícitos por cubo, sempre com footprint inteiro mínimo de um texel;
- atlas 64×64 gerado da fonte semântica `assets-src/models/aspergillum.model.json`, com superfícies coerentes de couro, prata, ouro e prata perfurada, padding dilatado de dois texels e mapas color/normal/MER derivados do mesmo layout;
- quatro níveis visuais de água e versão decorativa com o aspersório acomodado;
- mesa de madeira escura com tampo de veludo verde, ferragens discretas e réplica derivada da mesma malha/texturas do item; nove materiais acompanham o acabamento selecionado;
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
| `npm run typecheck` | Verifica TypeScript contra Script API 2.9.0 |
| `npm test` | Executa os testes unitários do domínio |
| `npm run build` | Gera assets, compila o script e valida o conteúdo |
| `npm run build:audio` | Reconstrói deterministicamente masters e 48 OGGs a partir das fontes versionadas |
| `npm run validate:animation` | Amostra a coreografia a 120 Hz e verifica envelopes/continuidade |
| `npm run validate:vfx` | Verifica locator, bridge, orientação, impacto, sons e fallback de 36 gotas |
| `npm run validate:audio` | Verifica catálogo, definitions, proveniência, mono/48 kHz/Vorbis e ausência de órfãos |
| `npm run package` | Cria e valida oficialmente o `.mcaddon` |
| `npm run clean` | Remove somente artefatos gerados conhecidos |

O modelo autoral fica em [`assets-src/models/aspergillum.model.json`](assets-src/models/aspergillum.model.json). [`tools/generate-assets.mjs`](tools/generate-assets.mjs) remove metadados de produção, empacota as seis faces, gera a geometria Bedrock distribuída e pinta deterministicamente color/normal/MER. A referência visual em [`assets-src/concept-art/aspergillum-concept.png`](assets-src/concept-art/aspergillum-concept.png) orienta proporções e materiais, mas não é distribuída no add-on.

Os SFX desta RC foram gerados com ElevenLabs no plano gratuito e, portanto, são **somente para validação não comercial e com atribuição**. Generated with ElevenLabs. Uma publicação comercial exige regenerar as fontes numa assinatura paga e substituir a proveniência antes do gate de release; veja [Contrato de áudio](docs/AUDIO_DESIGN_CONTRACT.md).

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
