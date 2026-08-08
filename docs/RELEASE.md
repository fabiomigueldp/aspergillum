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

Revisões com sufixo diagnóstico usam `package.json > aspergillum.releaseLabel` no nome do artefato e do relatório. Como o manifest Bedrock aceita apenas `[major, minor, patch]` numérico, `1.0.15b` corresponde a `[1,0,16]`, `1.0.15c` a `[1,0,17]`, `1.0.15d` a `[1,0,18]`, `1.0.16` a `[1,0,19]`, `1.0.16a` a `[1,0,20]`, `1.0.16b` a `[1,0,21]`, `1.0.16c` a `[1,0,22]`, `1.0.17` a `[1,0,23]`, `1.0.17a` a `[1,0,24]`, `1.0.18` a `[1,0,25]`, `1.0.18a` a `[1,0,26]`, `1.0.18b` a `[1,0,27]`, `1.0.18c` a `[1,0,28]`, `1.0.18d` a `[1,0,29]`, `1.0.18e` a `[1,0,30]`, `1.0.18f` a `[1,0,31]`, `1.0.18g` a `[1,0,32]`, `1.0.19` a `[1,0,33]`, `1.0.19a` a `[1,0,34]`, `1.0.19b` a `[1,0,35]`, `1.0.20` a `[1,0,36]`, `1.1.0` a `[1,1,0]`, `1.1.1` a `[1,1,1]`, `1.1.2` a `[1,1,2]`, `1.1.3` a `[1,1,3]` e `1.1.4` a `[1,1,4]`; o próximo pacote nunca deve reutilizar essas trincas.

### Avisos offline conhecidos

O Creator Tools em modo `--offline` não possui o catálogo completo do jogo nem resolve o item implícito de um custom block. Por isso, o relatório 1.1.4 contém exatamente onze avisos `UNLINK 323`: sete links de ingredientes vanilla (`stick`, `iron_nugget` em duas receitas, `chain`, `iron_ingot`, `dark_oak_planks`, `green_carpet`) e quatro referências aos itens implícitos dos blocos `aspergillum:aspersorium`/`aspergillum:sacristan_table` nas loot tables.

`validate-minecraft.mjs` aceita somente esses onze casos conhecidos e falha diante de qualquer warning novo, Error ou Failure. Eles não substituem o Content Log real, que deve permanecer limpo no teste do usuário.

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
