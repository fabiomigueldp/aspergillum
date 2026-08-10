# Build, validação e release

## Requisitos

- Node.js `20.11` ou superior;
- dependências instaladas por `npm install`/`npm ci`;
- Minecraft Bedrock compatível com Creator `1.26.40` para teste manual.

## Comandos

```powershell
npm run check
npm run package
npm run sync:game -- --dry-run
npm run sync:game -- --apply
```

`check` executa tipos, testes, documentação, geração, bundle e validação estrutural. `package` repete o build, cria o `.mcaddon`, grava SHA-256 e executa o Minecraft Creator Tools em modo offline.

## Sincronização local rápida

Depois que o pipeline já aprovou a revisão atual, a troca local pode ser feita diretamente a partir de `packs/`:

```powershell
# mostra os quatro alvos sem alterar nada
npm run sync:game -- --dry-run

# substitui Shared e o mundo devtest, atualiza vínculos/históricos e regenera o mapa
npm run sync:game -- --apply

# opcional: aplica a revisão atual em todos os mundos que já usam Aspergillum
npm run sync:game -- --apply --all-worlds
```

A ferramenta é deliberadamente operacional: não faz backup, não extrai o `.mcaddon` e não executa o pipeline. Ela copia os packs aprovados de `packs/behavior` e `packs/resource`, atualiza as versões numéricas em `world_behavior_packs.json`, `world_resource_packs.json` e seus históricos, e reescreve `docs/LOCAL_INSTALLATION_MAP.md`. Feche o Minecraft antes de usar `--apply`. O rótulo vem de `package.json > aspergillum.releaseLabel` e a versão Bedrock vem de `package.json > version`.

## Artefatos

```text
dist/
├── README.md
├── releases/
│   ├── Aspergillum-<versão>.mcaddon
│   └── Aspergillum-<versão>.mcaddon.sha256
└── validation/
    └── <versão>/
        ├── *.csv
        ├── *.mcr.json
        └── *.report.html
```

`dist/releases` e `dist/validation` são gerados e ignorados pelo Git. O código distribuído vem exclusivamente de `packs/behavior` e `packs/resource`; `src`, `tests`, `docs`, `assets-src` e `.research` não entram no pacote.

O empacotador ordena todos os caminhos e usa timestamps ZIP fixos. Duas execuções sobre a mesma árvore devem produzir bytes e SHA-256 idênticos.

Revisões com sufixo diagnóstico usam `package.json > aspergillum.releaseLabel` no nome do artefato e do relatório. Como o manifest Bedrock aceita apenas `[major, minor, patch]` numérico, as revisões publicadas nunca reutilizam uma trinca. A matriz `1.1.7a/b/c` usa `[1,1,7]..[1,1,9]` e a release 1.1.7 usa `[1,1,10]`; a matriz 1.1.8 usa `[1,1,11]..[1,1,14]`; os diagnósticos 1.1.9a/b/c usam `[1,1,15]..[1,1,17]`; a release 1.1.9 usa `[1,1,18]` e a 1.1.10 usa `[1,1,19]`. A 1.2.0 inicia a linha `[1,2,0]`. O histórico anterior até 1.1.6 permanece monotônico conforme os manifests e changelog correspondentes.

Para instalar uma variante diagnóstica sem trocar o checkout oficial: `npm run sync:diagnostic -- --variant 1.1.7a --apply`. O comando substitui os packs compartilhados e do `devtest`, remove referências ativas das variantes Aspergillum anteriores, grava os UUIDs próprios do diagnóstico e atualiza `docs/LOCAL_INSTALLATION_MAP.md`.

Os três diagnósticos 1.1.7 são exceções deliberadas ao fluxo de uma única revisão em `package.json`: `npm run package:render-diagnostics` clona a baseline gerada, aplica uma variável por artefato e atribui nomes/UUIDs próprios sem modificar a versão oficial. Como preservam os mesmos IDs públicos de conteúdo, somente um par diagnóstico pode ser ativado por mundo.

### Avisos offline conhecidos

O Creator Tools em modo `--offline` não possui o catálogo completo do jogo nem resolve o item implícito de um custom block. Por isso, o relatório oficial contém exatamente onze avisos `UNLINK 323`: sete links de ingredientes vanilla (`stick`, `iron_nugget` em duas receitas, `chain`, `iron_ingot`, `dark_oak_planks`, `green_carpet`) e quatro referências aos itens implícitos dos blocos `aspergillum:aspersorium`/`aspergillum:sacristan_table` nas loot tables.

`validate-minecraft.mjs` aceita somente esses onze casos conhecidos e falha diante de qualquer warning novo, Error ou Failure. Eles não substituem o Content Log real.

### Exceção runtime histórica da 1.1.7

O Content Log do Bedrock 26.42 registrava duas mensagens de `MaterialInstances` porque a caldeirinha 1.1.7 usava estrutura `opaque` e água `blend` no mesmo bloco. A 1.1.9 encerra essa exceção ao transferir a água para um passe de entidade aprovado. Nenhuma dessas mensagens é aceita no gate atual; o histórico permanece no [diagnóstico 1.1.7](diagnostics/1.1.7-render-pipeline-matrix.md).

## Release de desenvolvimento

1. Atualize versão em `package.json`, `package-lock.json` e nos dois manifests.
2. Atualize `CHANGELOG.md`, `README.md`, `PROJECT_STATUS.md` e checklist específico.
3. Execute `npm run check`.
4. Execute `npm run package`.
5. Confira arquivo, hash e relatórios da versão correta.
6. Abra o `.mcaddon` gerado; não copie packs manualmente para o mundo.
7. Remova versões antigas em **Configurações → Armazenamento**, feche completamente o jogo e importe.
8. Teste em mundo novo sem experimentos e exporte o Content Log.

## Gate de produção

- `git status` contém apenas mudanças intencionais;
- versão é monotônica e consistente nos manifests/pacote/docs;
- pacote contém exatamente um Behavior Pack e um Resource Pack dependentes entre si;
- manifests, UUIDs e identifiers públicos permanecem estáveis;
- SHA-256 foi registrado junto ao artefato entregue;
- Minecraft Creator Tools não reporta erro atribuível ao add-on;
- teste de instalação limpa e smoke test foram executados;
- itens aplicáveis de `docs/TESTING.md` foram concluídos;
- limitações remanescentes estão explícitas no changelog.

## Cache e diagnóstico

Modelos e texturas não devem ser avaliados por hot reload. Se o Content Log mencionar expressões removidas ou a pose não corresponder à versão:

1. saia do mundo e feche o Minecraft;
2. remova Behavior e Resource Packs antigos no armazenamento;
3. confirme que o nome/versão do `.mcaddon` são os esperados;
4. importe novamente e abra um mundo limpo;
5. limpe o histórico do Content Log antes do teste.

O relatório deve sempre indicar jogo, plataforma, controle, perspectiva, modelo do jogador, versão do add-on, passos, resultado esperado/observado e trecho do Content Log.
