# Aspergillum

Add-On para Minecraft: Bedrock Edition 26.34/35 que adiciona um **aspersório litúrgico funcional** e uma **caldeirinha (aspersorium) colocável**. O projeto usa somente APIs estáveis, não substitui conteúdo vanilla e não exige experimentos.

> **Versão 1.0.9 de calibração controlada:** o binding comprovado permanece intocado. A malha real foi movida para o grip empírico do cabo, recebeu orientação corrigida e agora possui poses de apresentação separadas para primeira e terceira pessoa. Animações de ação, locator e partículas continuam temporariamente desativados até a confirmação física do encaixe.

## Instalação rápida

1. Se uma versão de desenvolvimento anterior estiver instalada, remova **Aspergillum — Comportamento** e **Aspergillum — Recursos** em **Configurações → Armazenamento** e feche o Minecraft.
2. Abra [`dist/Aspergillum-1.0.9.mcaddon`](dist/Aspergillum-1.0.9.mcaddon) com o Minecraft.
3. Ative **Aspergillum — Comportamento** no mundo. A dependência ativa o Resource Pack correspondente.
4. Não habilite Beta APIs nem Upcoming Creator Features; o add-on não precisa delas.

O alvo mínimo é Creator `1.26.30`, correspondente à linha pública Bedrock 26.34/35. O módulo estável é `@minecraft/server` `2.8.0`.

## Como usar

- Fabrique o **Aspersório** com gravetos e pepitas de ferro.
- Fabrique a **Caldeirinha** com lingotes de ferro e uma corrente, e coloque-a sobre uma superfície.
- Use um balde d'água na caldeirinha para enchê-la com três níveis.
- Com o aspersório na mão, use-o na caldeirinha para carregar até três aspersões. A transferência acontece no instante de contato da animação.
- Use a ação **Atacar/Minar** para aspergir. O gesto não causa dano nem quebra blocos.
- Agache e use o aspersório na caldeirinha para acomodá-lo como decoração. Interaja novamente para retirá-lo.
- Para testes rápidos com cheats: `/function aspergillum/dev_kit`.

As cargas permanecem gravadas no item. Ao acomodá-lo, cargas restantes retornam à caldeirinha até o limite de três. Ao quebrar uma caldeirinha com o aspersório acomodado, ambos os objetos são recuperados; a água é descartada intencionalmente.

## Arquitetura visual de integração

- geometria `1.16.0`, primeira versão cujo schema oficial documenta o campo `binding`;
- raiz sem malha `aspergillum_bound` com `q.item_slot_to_bone_name(context.item_slot)`, preservando exatamente o caminho comprovado na 1.0.7;
- filho `aspergillum_visual`, no qual ficam exclusivamente a malha e as correções artísticas;
- malha real de 15,6 unidades autorada ao redor do grip empírico `[-6, 24, 1]`, nove unidades acima da pose da 1.0.8;
- orientação de terceira pessoa `[25, 0, -12]` e inversão controlada de 180° apenas na primeira pessoa;
- sem animação de ação, locator ou VFX nesta etapa;
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
```

Veja também [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) e [`docs/TESTING.md`](docs/TESTING.md).

## Limite conhecido da plataforma

`playerSwingStart` é um after-event. O add-on cancela o dano antes que ele ocorra e cancela a quebra final, mas alguns dispositivos podem mostrar por um instante o feedback vanilla de mineração ao aspergir contra um bloco. Isso deve ser avaliado no teste físico de mouse/teclado, controle e toque descrito no plano de QA.

## Licença

Código e assets próprios sob a licença MIT. Minecraft é marca da Microsoft/Mojang; este projeto não é afiliado nem endossado por elas.
