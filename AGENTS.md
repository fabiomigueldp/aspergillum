# AGENTS.md

## Missão

Desenvolver o **Aspergillum** como um Add-On Bedrock estável, cerimonialmente legível e seguro para mundos persistentes. A versão de referência é a indicada em `package.json`; o estado real, os contratos e o roadmap ficam em `docs/`.

## Leitura obrigatória

Antes de alterar código ou packs, leia nesta ordem:

1. `docs/PROJECT_STATUS.md`
2. `docs/VISUAL_CONTRACT.md`
3. `docs/ARCHITECTURE.md`
4. `docs/STATE_AND_CONCURRENCY.md`
5. `docs/ROADMAP.md`
6. `docs/TESTING.md`

Use `docs/ATTACHABLE_RESEARCH.md` para o histórico técnico e `docs/REFERENCES.md` para as fontes oficiais.

## Contratos que não podem regredir

- Preserve a raiz `aspergillum_bound`, a geometria `1.16.0` e o binding exato `q.item_slot_to_bone_name(context.item_slot)`.
- Nunca corrija a pose com translações no osso vinculado. Binding, apresentação e ação têm responsabilidades diferentes.
- Preserve a pose aprovada de primeira pessoa e aplique calibrações de terceira pessoa somente na camada de apresentação.
- Preserve cargas persistentes finitas (`0..3`). A infinitude do Criativo é uma política contextual, nunca um valor sentinela gravado no item.
- Preserve `instance_id`, revalidação tardia, sessões exclusivas, lock de bloco, cancelamento de ciclo de vida e rollback defensivo.
- Preserve a curvatura controlada da rajada: resposta `0.8`, limite de `30°`, seis pulsos e partículas já emitidas em world-space.
- Não adote Beta APIs, formatos preview ou Creator Features experimentais como dependência essencial.
- UUIDs, namespace, identificadores públicos e block states publicados são compatibilidade de mundo; não os altere sem plano explícito de migração.

Qualquer mudança nesses contratos exige evidência reproduzível, um build diagnóstico isolado e atualização da documentação no mesmo commit.

## Limites arquiteturais

- `src/domain`: regras puras; não importa Minecraft API.
- `src/application`: coordena casos de uso por interfaces.
- `src/infrastructure`: adapta inventário, mundo, modo de jogo, sessões e persistência.
- `src/presentation`: mensagens, sons, animações e VFX quando essa camada for introduzida.
- `src/bootstrap`: composição e registro de eventos/componentes; não concentra regra de negócio nova.
- O servidor autoriza estado e gameplay. Animações e partículas são apresentação e não podem conceder carga ou alterar água.

Não faça a reorganização-alvo inteira como mudança puramente mecânica. Migre por caso de uso, mantendo testes verdes e diffs revisáveis.

## Fluxo de trabalho

1. Confirme o estado Git e preserve alterações do usuário.
2. Identifique o contrato afetado e o critério de aceitação antes de editar.
3. Consulte primeiro tipos instalados e amostras locais; para comportamento atual da plataforma, valide na documentação oficial da Microsoft.
4. Escreva ou ajuste testes de domínio antes de integrar Script API quando aplicável.
5. Execute `npm run check`.
6. Para uma revisão testável, execute `npm run package` e inspecione `dist/releases/` e `dist/validation/<versão>/`.
7. O teste dentro do Minecraft é realizado pelo usuário. Entregue passos mínimos, versão exata e sinais esperados no Content Log.
8. Atualize `CHANGELOG.md`, documentação afetada e versão dos packs quando houver mudança distribuível.

## Arquivos gerados e evidências

- Não edite manualmente JavaScript compilado, PNGs gerados, geometrias rotacionadas nem conteúdo de `dist/`.
- `assets-src/` contém fontes e referências de produção; `packs/` contém o conteúdo distribuído ou gerado.
- `.research/` contém clones locais descartáveis e nunca é fonte autoritativa do produto.
- `dist/releases/` contém pacotes e hashes; `dist/validation/<versão>/` contém relatórios oficiais. Ambos são ignorados pelo Git.
- Não declare uma correção visual concluída apenas por inspeção de JSON. Valide o `.mcaddon` final importado, sem pack antigo ou cache concorrente.

## Agent model capture tool

- Use `npm run capture:models -- --subject all` to generate reproducible multi-angle PNGs, labeled contact sheets, and a capture manifest for the aspergillum, aspersorium, and docked composition.
- Read `docs/MODEL_CAPTURE_TOOL.md` before using capture output as evidence. Keep identical options for before/after comparisons and inspect individual views when the contact sheet reveals a defect.
- Capture output under `out/model-captures/` is disposable and ignored by Git. It is diagnostic evidence, not an authoritative asset and not proof of Minecraft Bedrock rendering parity.

## Critério de entrega

Uma mudança está pronta quando tipos, testes, validação estrutural e documentação estão coerentes; o pacote oficial valida; não há novos erros do add-on no Content Log; e os critérios manuais relevantes de `docs/TESTING.md` foram comunicados ao usuário. Se uma hipótese visual não puder ser provada fora do jogo, entregue um diagnóstico controlado, não uma sequência de compensações especulativas.
