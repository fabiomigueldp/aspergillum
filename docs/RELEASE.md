# Build, validação e release

## Requisitos

- Node.js `20.11` ou superior;
- dependências instaladas por `npm install` ou `npm ci`;
- Minecraft Bedrock compatível com Creator `1.26.40` para teste manual.

## Camadas do pipeline

Os comandos possuem responsabilidades separadas:

```powershell
# gera packs a partir das fontes e executa validação estrutural
npm run build

# empacota exatamente o estado atual de packs/, sem build nem validação
npm run package:artifact

# executa Creator Tools sobre o artefato atual
npm run verify:artifact

# gate completo: check + package:artifact + verify:artifact
npm run release

# alias histórico do gate completo
npm run package
```

`npm run check` cobre tipos, testes do add-on e do viewer, documentação, geração, bundle e validadores. `package:artifact` existe para permitir reempacotamento determinístico de uma árvore já aprovada. O comando de instalação nunca chama nenhuma dessas etapas.

Se já existir um artefato com o mesmo rótulo e bytes diferentes, o empacotador falha antes de sobrescrevê-lo. A ação normal é elevar a versão. Durante a construção deliberada de uma candidata ainda não publicada, `npm run package:artifact -- --replace` autoriza explicitamente a troca.

## Instalação local

Use o [Gerenciador local do Aspergillum](ADDON_MANAGER.md):

```powershell
npm run addon -- list
npm run addon -- status
npm run addon -- install current
npm run addon -- install 1.1.8b --dry-run
npm run addon -- plan-upgrade 1.2.0 1.2.2
npm run addon -- upgrade 1.2.0 1.2.2
npm run addon -- map
```

O gerenciador instala o `.mcaddon` exato, verifica o hash, extrai uma vez por SHA, atualiza todos os perfis quando solicitado e protege mundos dependentes de Shared. `install` e `upgrade` aplicam por padrão; feche o Minecraft antes de executá-los.

## Artefatos

```text
dist/
├── README.md
├── releases/
│   ├── Aspergillum-<rótulo>.mcaddon
│   ├── Aspergillum-<rótulo>.mcaddon.sha256
│   ├── Aspergillum-<rótulo>.mcaddon.artifact.json
│   └── catalog.json
└── validation/
    └── <rótulo>/
        ├── *.csv
        ├── *.mcr.json
        └── *.report.html
```

`dist/releases` e `dist/validation` são gerados e ignorados pelo Git. O código distribuído vem exclusivamente de `packs/behavior` e `packs/resource`; `src`, `tests`, `tools`, `docs`, `assets-src`, `out` e `.research` não entram no pacote.

O empacotador ordena caminhos e usa timestamps ZIP fixos. Duas execuções sobre a mesma árvore devem produzir bytes e SHA-256 idênticos. O descritor do artefato registra identidade Bedrock e procedência Git; o catálogo agrega os descritores publicados.

## Registro de versões

`tools/release/release-registry.json` é a fonte central das trincas reservadas a partir das matrizes 1.1.7. O empacotador falha se o rótulo atual não estiver registrado, se o canal divergir ou se a versão dos manifests não corresponder.

A matriz `1.1.7a/b/c` usa `[1,1,7]..[1,1,9]` e a release 1.1.7 usa `[1,1,10]`; a matriz 1.1.8 usa `[1,1,11]..[1,1,14]`; os diagnósticos 1.1.9a/b/c usam `[1,1,15]..[1,1,17]`; a release 1.1.9 usa `[1,1,18]` e a 1.1.10 usa `[1,1,19]`. A linha 1.2 usa `[1,2,0]`, `[1,2,1]`, `[1,2,2]` e `[1,2,3]`. O histórico anterior permanece definido pelos manifests e changelog correspondentes.

## Diagnósticos

Empacotar uma árvore já gerada:

```powershell
npm run package:render-diagnostics
npm run package:water-diagnostics
npm run package:entity-water-diagnostic
```

Gerar a baseline e então empacotar:

```powershell
npm run release:render-diagnostics
npm run release:water-diagnostics
npm run release:entity-water-diagnostic
```

Os empacotadores diagnósticos usam o mesmo núcleo de arquivo determinístico, hash, descritor, catálogo e procedência do pacote oficial. Cada variante conserva UUIDs próprios e somente um par deve ficar ativo por mundo.

## Limpeza

```powershell
# remove somente saídas de trabalho regeneráveis em packs/
npm run clean

# remove explicitamente releases, validações, diagnósticos e cache do gerenciador
npm run clean:artifacts

# combina os dois escopos
npm run clean:all
```

A limpeza padrão preserva artefatos. Isso evita apagar pacotes aprovados durante iteração ou troca de branch; a procedência do descritor impede que `current` selecione silenciosamente um pacote produzido por outro commit.

## Avisos offline conhecidos

O Creator Tools em modo `--offline` não possui o catálogo completo do jogo nem resolve o item implícito de um custom block. Por isso, o relatório oficial contém onze avisos `UNLINK 323`: sete links de ingredientes vanilla e quatro referências aos itens implícitos de `aspergillum:aspersorium` e `aspergillum:sacristan_table` nas loot tables.

`validate-minecraft.mjs` aceita somente os casos conhecidos e falha diante de warning novo, Error ou Failure. Eles não substituem o Content Log real.

## Release de desenvolvimento

1. Reserve o novo rótulo e a nova trinca em `tools/release/release-registry.json`.
2. Atualize `package.json`, `package-lock.json` e os dois manifests.
3. Atualize `CHANGELOG.md`, documentação de estado e checklist específico.
4. Execute `npm run check`.
5. Execute `npm run package:artifact` e confira pacote, hash e descritor.
6. Execute `npm run verify:artifact`.
7. Instale o artefato exato com `npm run addon -- install <rótulo>`.
8. Teste em mundo novo ou na cópia prevista, limpe o Content Log e registre a evidência manual.

## Gate de produção

- `git status` contém somente mudanças intencionais;
- rótulo e versão são monotônicos e coerentes no registro, manifests, pacote e docs;
- pacote contém exatamente um BP e um RP dependentes entre si;
- UUIDs e identifiers públicos permanecem estáveis;
- SHA-256 e descritor correspondem aos bytes testados;
- Minecraft Creator Tools não reporta erro atribuível ao add-on;
- teste de instalação limpa e smoke test foram executados;
- itens aplicáveis de [TESTING.md](TESTING.md) foram concluídos;
- limitações remanescentes estão explícitas.

## Cache e diagnóstico

Modelos e texturas não devem ser aprovados por hot reload. Se o Content Log mencionar expressão removida ou a pose não corresponder à revisão, feche o jogo, confirme o rótulo/hash em `npm run addon -- status`, remova packs concorrentes quando necessário, importe novamente e limpe o histórico do Content Log.

O relatório deve indicar jogo, plataforma, controle, perspectiva, modelo, versão do add-on, artefato/hash, passos, resultado esperado/observado e trecho do Content Log.
