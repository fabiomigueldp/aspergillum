# Workspace e versionamento

O repositório `fabiomigueldp/aspergillum` contém os projetos e ferramentas abaixo. Cada add-on conserva versão, UUIDs, namespace, fontes e processo de empacotamento próprios.

| Projeto | Fontes |
| --- | --- |
| Aspergillum | `src/`, `assets-src/`, `packs/`, `tools/`, `tests/` e `docs/` da raiz |
| Altare | `addons/altare/` |
| Aurifrita | `addons/aurifrita/` |
| Evangeliário | `addons/evangeliarium/`, incluindo o protótipo e suas fontes |
| 3D Workbench e Render Studio | `viewer-3d/` |

O experimento de turíbulo está preservado na branch `codex/experimental-thurible` do mesmo repositório. Essa branch não foi integrada à `main`; seus contratos e estado experimental permanecem separados do Aspergillum principal.

## Preparar um clone

Requer Node.js 24 ou posterior e Python para os importadores que o utilizam. Na raiz:

```powershell
npm ci
npm --prefix viewer-3d ci
npm --prefix addons/evangeliarium ci
npm run addon -- register addons/altare
npm run addon -- register addons/aurifrita
npm run addon -- register addons/evangeliarium
npm run build
npm --prefix addons/altare run build
npm --prefix addons/aurifrita run build
npm --prefix addons/evangeliarium run build
```

O registro em `out/addon-manager-projects.json` é local, com caminhos absolutos; os comandos acima o recriam no computador atual. Ele não é publicado no Git. Para captura headless, instalar o Chromium do Playwright conforme [MODEL_CAPTURE_TOOL.md](MODEL_CAPTURE_TOOL.md). Para abrir o estúdio, usar `npm run studio:altare`.

Os objetos de outros packs usados na ornamentação do estúdio são dependências locais referenciadas por caminho/hash em `viewer-3d/assets-src/studio/props-sources.json`. Esses packs não passam a ser fontes próprias por estarem visíveis no renderer. O setup, caches e limites estão em [RENDER_STUDIO.md](RENDER_STUDIO.md). Atribuições e licenças das fontes externas permanecem nos respectivos projetos.

## O que fica no Git

Código, testes, configurações, documentação, receitas de geração, imagens autorais de produção, referências selecionadas e dados de entrada necessários para reprodução. Um ZIP usado como entrada de um importador e uma imagem de `assets-src/` são fontes; não são lixo de build. O protótipo do Evangeliário conserva o corpus e seus créditos para funcionar offline.

## O que fica local

`node_modules/`, caches, registros de instalação, credenciais, `.research/`, `out/`, `dist/`, packs gerados dos subprojetos e bibliotecas temporárias de assets do viewer são ignorados pelo Git. O Aspergillum principal mantém seu layout histórico, com os arquivos derivados específicos ignorados.

Pacotes finais e relatórios ficam em `dist/releases/` e `dist/validation/` de cada projeto. São saídas de entrega e evidências; devem ser preservados quando uma revisão for testada ou distribuída. Não fazem parte do backup das fontes no GitHub. Uma revisão importada deve ser identificada por versão/hash, conforme os documentos de QA.

Renders intermediários, cópias de pré-validação e logs descartáveis podem ser apagados. Não apagar em bloco `out/`: ali também ficam registros locais, referências e evidências de comparação. A limpeza deve usar alvos explícitos dentro do workspace e preservar fontes, registros, dependências locais e entregas finais.
