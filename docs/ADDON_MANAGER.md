# Gerenciador local de Add-Ons Bedrock

## Papel da ferramenta

O gerenciador é infraestrutura local de desenvolvimento, não conteúdo do Aspergillum ou do Ornatum. Nada de `tools/addon-manager*`, registros, cache, logs ou mapas entra em um `.mcaddon`; evoluir a ferramenta não exige elevar a versão dos packs.

O comando canônico continua sendo:

```powershell
npm run addon -- <comando>
```

Ele administra exclusivamente `.mcaddon` já produzidos. Nunca executa build, testes, Creator Tools ou gates do pipeline durante uma instalação.

## Projetos registrados

O projeto que contém a ferramenta é registrado automaticamente. Outros add-ons são acrescentados uma vez:

```powershell
npm run addon -- register C:\caminho\para\Ornatum
npm run addon -- projects
npm run addon -- unregister ornatum
```

`unregister` esquece somente o projeto; não remove packs do Minecraft. O registro local fica em `out/addon-manager-projects.json`, fora do Git e fora da limpeza de caches/artefatos do gerenciador.

Cada projeto declara sua integração em `package.json`:

```json
{
  "version": "0.1.1",
  "addonManager": {
    "schemaVersion": 1,
    "id": "ornatum",
    "displayName": "Ornatum",
    "artifactPrefix": "Ornatum",
    "sharedDirectory": "pack.ornatum",
    "worldDirectory": "ornatum.managed",
    "aliases": ["ornatum"],
    "publicIdentity": {
      "behaviorUuid": "94bf9f78-a880-40a6-b888-41d78f64113d",
      "resourceUuid": "6c31d1d6-ed74-45a4-97ba-546871afc45f"
    }
  }
}
```

O registro guarda apenas `id` e caminho local. UUIDs, versão atual, prefixo dos artefatos e nomes reservados pertencem ao próprio projeto. IDs, caminhos reservados ou UUIDs públicos repetidos entre projetos são recusados.

## Uso rápido

```powershell
# visão agregada
npm run addon -- projects
npm run addon -- list
npm run addon -- status
npm run addon -- map

# visão de um add-on
npm run addon -- list ornatum
npm run addon -- status aspergillum
npm run addon -- map ornatum

# instalação aditiva ou atualização pontual
npm run addon -- install aspergillum current
npm run addon -- install ornatum current
npm run addon -- install ornatum 0.1.1 --world devtest

# plano sem escrita
npm run addon -- install ornatum 0.1.1 --dry-run

# todos os mundos que usam exatamente X passam para Y
npm run addon -- plan-upgrade ornatum 0.1.0 0.1.1
npm run addon -- upgrade aspergillum 1.2.5 1.2.6

# remoção isolada; o add-on precisa ser explícito
npm run addon -- remove ornatum --world devtest --no-shared
npm run addon -- remove ornatum --all-worlds
```

Instalação, upgrade e remoção aplicam por padrão. Use `--dry-run` para apenas planejar. O Minecraft deve estar fechado durante a aplicação.

A sintaxe histórica permanece compatível e seleciona o projeto principal, Aspergillum:

```powershell
npm run addon -- install current
npm run addon -- install 1.1.8b
npm run addon -- upgrade 1.2.0 1.2.5
```

Opções comuns:

- `--addon <id>` oferece uma forma não posicional de selecionar o add-on;
- `--world <nome-ou-pasta>` seleciona um mundo; o padrão é `devtest`;
- `--profile <id>` resolve nomes repetidos dentro de um perfil;
- `--all-worlds` seleciona todos os mundos aplicáveis;
- `--no-shared` limita a operação aos mundos selecionados;
- `--bedrock-root <caminho>` aponta outra árvore Bedrock, principalmente em testes;
- `--json` produz saída estruturada;
- `--refresh` reconstrói os caches de catálogo.

## Isolamento entre add-ons

Toda inspeção e mutação recebe um contexto de projeto. O contexto contém os UUIDs conhecidos, aliases, catálogo e caminhos reservados daquele add-on. Assim:

- atualizar Ornatum não classifica, copia ou remove packs do Aspergillum;
- atualizar Aspergillum não altera bytes, referências, históricos ou diretórios do Ornatum;
- remover um add-on filtra somente seus UUIDs;
- a posição da primeira referência pertencente ao add-on é preservada durante uma atualização;
- referências de outros packs permanecem na mesma ordem relativa;
- o lock é global por árvore Bedrock, impedindo duas ferramentas de escreverem simultaneamente mesmo que operem add-ons diferentes.

O `status` agregado exibe uma linha Shared por add-on e somente mundos em que aquele add-on foi detectado. `status <id>` mantém a visão completa dos mundos, incluindo ausências e conflitos.

## Semântica X → Y

Uma revisão é identificada pelo conjunto extraído do artefato:

```text
addonId
Behavior UUID + versão numérica
Resource UUID + versão numérica
dependência BP → RP
SHA-256 do .mcaddon
```

`upgrade <add-on> X Y` percorre todos os perfis e classifica cada mundo exclusivamente sob a identidade daquele add-on:

- par ativo exatamente X e cópia local ausente ou exatamente X: selecionado;
- par ativo exatamente Y: ignorado como já atualizado;
- outra revisão coerente: preservada;
- somente BP/RP, referência/local divergentes ou duplicação: conflito;
- add-on ausente: ignorado.

Somente Y precisa ter `.mcaddon`. Quando o projeto declara `publicIdentity`, uma origem oficial puramente numérica pode ser inferida pelos UUIDs estáveis e pela trinca informada.

## Shared e mundos persistentes

Cada mundo atualizado recebe cópias locais próprias do add-on escolhido. Antes de substituir ou remover seu par em Shared, a ferramenta procura mundos não selecionados que dependam exatamente daquele par.

Se um mundo depender de Shared sem cópia local, a revisão atual desse add-on é fixada localmente. Se houver cópia parcial ou divergente, a operação é bloqueada. Outros add-ons presentes no mesmo mundo não participam desse cálculo. Shared é sempre a última mutação.

Na remoção, os diretórios e referências ativas do add-on selecionado são retirados na mesma transação. O histórico Bedrock é conservado para diagnóstico e compatibilidade; ele não mantém o pack ativo.

## Integridade e velocidade

O fluxo de aplicação é curto e local:

Comandos direcionados carregam somente o catálogo do add-on escolhido; comandos agregados carregam todos e executam a checagem cruzada de UUIDs. Assim, a manutenção pontual não paga o custo dos artefatos não envolvidos.

1. verifica SHA-256 do artefato e sidecar publicado;
2. reutiliza a extração por hash em `out/addon-manager/cache/<sha256>`;
3. adquire um lock exclusivo por raiz Bedrock;
4. copia para diretórios temporários irmãos;
5. troca ou retira diretórios por rename;
6. grava referências/históricos por arquivo temporário + rename;
7. relê manifests e referências do add-on selecionado;
8. atualiza ou remove Shared por último;
9. confirma ou reverte toda a transação.

Não existe backup persistente. Se uma etapa falhar antes do commit, diretórios e JSONs são restaurados. O LevelDB nunca é aberto ou alterado.

Estado operacional:

```text
out/
├── addon-manager-projects.json        # registro local persistente
└── addon-manager/
    ├── state/<addonId>.json
    ├── state.json                     # última operação global
    ├── installation-map.md
    ├── catalog-cache/<addonId>.json
    ├── cache/<sha256>/
    └── runs/<timestamp>-<addonId>-<rótulo>.json
```

Caches, mapas e logs são descartáveis. O registro de projetos fica fora da árvore apagada por `npm run clean:artifacts`.

## Contrato dos artefatos

Novos empacotamentos publicam descritor schema 2:

```json
{
  "schemaVersion": 2,
  "addonId": "ornatum",
  "label": "0.1.1",
  "bedrockVersion": [0, 1, 1],
  "channel": "official",
  "behavior": { "uuid": "...", "version": [0, 1, 1], "root": "Ornatum_BP" },
  "resource": { "uuid": "...", "version": [0, 1, 1], "root": "Ornatum_RP" },
  "sha256": "..."
}
```

Descritores schema 1 do Aspergillum e Ornatum são normalizados em memória e continuam instaláveis. `current` e `latest` significam sempre a versão declarada pelo projeto selecionado, nunca o arquivo mais recente por data. Quando há commit de origem, uma seleção implícita recusa divergência entre artefato e checkout; um rótulo explícito continua sendo uma decisão deliberada.

`sync:game` e `sync:diagnostic` permanecem fachadas compatíveis exclusivas do Aspergillum. Código e automações novas devem usar `npm run addon`.
