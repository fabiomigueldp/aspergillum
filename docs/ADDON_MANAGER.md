# Gerenciador local do Aspergillum

## Papel da ferramenta

O gerenciador é infraestrutura de desenvolvimento do projeto, não conteúdo do Add-On. Nada de `tools/addon-manager*`, cache, catálogo operacional, logs ou mapas locais entra no `.mcaddon`, e uma mudança nessa ferramenta não exige elevar a versão do produto.

O comando canônico é:

```powershell
npm run addon -- <comando>
```

Ele instala exclusivamente um `.mcaddon` já produzido. Não executa build, testes, Creator Tools ou qualquer outro gate do pipeline.

## Uso rápido

```powershell
# artefatos disponíveis, identidade Bedrock, hash e procedência
npm run addon -- list

# Shared, todos os perfis e todos os mundos
npm run addon -- status

# instala a release do package.json em Shared + devtest
npm run addon -- install current

# instala uma release ou variante específica em Shared + devtest
npm run addon -- install 1.1.8b

# apenas mostra o plano
npm run addon -- install 1.1.8b --dry-run

# atualiza, em todos os perfis, somente mundos com o par exato X
npm run addon -- plan-upgrade 1.2.0 1.2.2
npm run addon -- upgrade 1.2.0 1.2.2

# mapa completo sob out/addon-manager, ignorado pelo Git
npm run addon -- map
```

`install` e `upgrade` aplicam por padrão. Use `--dry-run` quando quiser somente inspecionar. O Minecraft deve estar fechado na aplicação real.

Opções úteis:

- `--world <nome-ou-pasta>` seleciona um mundo; o padrão de `install` é `devtest`;
- `--profile <id>` resolve nomes repetidos dentro de um perfil específico;
- `--all-worlds` em `install` seleciona somente mundos com a identidade exata atualmente presente em Shared;
- `--no-shared` atualiza os mundos selecionados sem trocar a instalação compartilhada;
- `--bedrock-root <caminho>` permite apontar outra árvore Bedrock, principalmente em testes;
- `--json` produz saída estruturada;
- `--refresh` reconstrói o cache do catálogo.

## Semântica X → Y

O gerenciador identifica uma revisão pelo conjunto abaixo, extraído do próprio artefato:

```text
Behavior UUID + versão numérica
Resource UUID + versão numérica
dependência BP → RP
SHA-256 do .mcaddon
```

`upgrade X Y` percorre todos os perfis sob `Minecraft Bedrock/Users` e classifica cada mundo:

- par ativo exatamente X e cópia local ausente ou exatamente X: selecionado;
- par ativo exatamente Y: ignorado como já atualizado;
- outra revisão coerente: preservada;
- somente BP/RP, referência/local divergentes ou duplicação: conflito, sem aplicação;
- sem Aspergillum: ignorado.

Assim, versões oficiais com os mesmos UUIDs públicos continuam distintas pela trinca numérica, e variantes diagnósticas com UUIDs próprios não dependem de listas codificadas no instalador.

Somente Y precisa ter um `.mcaddon` disponível. Para uma origem oficial puramente numérica, como `1.0.2`, X pode ser inferida pelos UUIDs públicos estáveis e pela trinca informada; isso permite migrar mundos antigos mesmo quando o artefato histórico já não estiver em `dist`.

## Proteção de Shared

Cada mundo atualizado recebe cópias locais próprias de BP e RP. Antes de substituir Shared, a ferramenta procura mundos não selecionados cujo par ativo dependa exatamente do Shared atual.

Se um desses mundos não tiver cópia local, o par atual é fixado localmente nele. Se houver uma cópia local parcial ou divergente, a operação é bloqueada e o conflito é reportado. Shared é sempre a última escrita da transação.

Isso permite, por exemplo, instalar uma variante diagnóstica em `devtest` sem deixar outro mundo dependente da release anterior apontando para bytes incompatíveis.

## Integridade e velocidade

O fluxo de aplicação é curto e local:

1. verifica o SHA-256 do artefato e seu arquivo `.sha256`, quando presente;
2. reutiliza a extração por hash em `out/addon-manager/cache/<sha256>`;
3. adquire um lock exclusivo;
4. copia para diretórios temporários irmãos;
5. troca diretórios por rename e conserva o anterior apenas durante a transação;
6. grava referências/históricos por arquivo temporário + rename;
7. relê manifests e referências;
8. atualiza Shared por último e remove os diretórios temporários.

Não existe backup persistente. Se uma etapa falhar antes do commit, as trocas já realizadas são revertidas. O LevelDB do mundo nunca é aberto ou alterado.

Depois da primeira leitura, o catálogo fica em `out/addon-manager/catalog-cache.json`; instalações repetidas da mesma revisão reutilizam também a extração. O hot path não consulta AppX, não inventaria todos os arquivos dos packs e não reescreve documentação versionada.

Cada aplicação bem-sucedida grava:

```text
out/addon-manager/
├── state.json
├── installation-map.md
├── catalog-cache.json
├── cache/<sha256>/
└── runs/<timestamp>-<rótulo>.json
```

Todo esse estado é descartável e ignorado pelo Git.

## Catálogo e procedência

Novos empacotamentos publicam, ao lado do pacote:

```text
dist/releases/
├── Aspergillum-<rótulo>.mcaddon
├── Aspergillum-<rótulo>.mcaddon.sha256
├── Aspergillum-<rótulo>.mcaddon.artifact.json
└── catalog.json
```

O descritor inclui rótulo, versão Bedrock, canal, família diagnóstica, baseline, UUIDs, hash, tamanho, raízes internas e commit/estado sujo da origem. Artefatos históricos sem descritor continuam utilizáveis: o gerenciador deriva a identidade diretamente do ZIP e os marca como `legado`.

`current` e `latest` significam sempre `package.json > aspergillum.releaseLabel`; nunca significam “arquivo de modificação mais recente”. Se um descritor informar commit diferente do checkout, a seleção implícita é recusada. Um rótulo explícito continua sendo uma escolha deliberada.

As versões reservadas ficam em `tools/release/release-registry.json`. O empacotador oficial e as matrizes diagnósticas validam esse registro antes de publicar, impedindo reutilização acidental de rótulos ou trincas Bedrock conhecidas.

## Compatibilidade

`npm run sync:game` e `npm run sync:diagnostic` permanecem como fachadas finas para automações antigas. Eles traduzem os argumentos para o gerenciador novo e não mantêm lógica própria de UUID, cópia ou mundo. Código novo deve usar `npm run addon`.
