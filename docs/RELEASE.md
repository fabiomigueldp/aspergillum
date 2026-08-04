# Build, validação e release

## Requisitos

- Node.js `20.11` ou superior;
- dependências instaladas por `npm install`/`npm ci`;
- Minecraft Bedrock compatível com Creator `1.26.30` para teste manual.

## Comandos

```powershell
npm run check
npm run package
```

`check` executa tipos, testes, documentação, geração, bundle e validação estrutural. `package` repete o build, cria o `.mcaddon`, grava SHA-256 e executa o Minecraft Creator Tools em modo offline.

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
