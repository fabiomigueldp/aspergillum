# Preservação integral dos estudos de novembro de 2026

**Arquivo de desenvolvimento. Não é release, atualização de mundo nem aprovação visual.**

A main mantém o runtime Aspergillum **1.2.5**, Altare **0.11.2** e Studio **2.2.1**. Somente os ajustes de fechamento das interfaces foram incorporados ao código ativo. Os estudos de Aspergillum **2.0.0**, Altare **0.13.0**, Studio **2.4.0**, modelo Nossa Senhora da Paz e seu add-on ficam isolados aqui.

Os schemas compactos são incompatíveis com saves anteriores. Migração integral, revisão de falhas transacionais e validação nativa continuam pendentes. Nenhum comando deste arquivo instala conteúdo, altera mundos, publica versões ou promove um diagnóstico.

## O que foi guardado

- Fonte consolidada original e uma cópia com o fechamento das interfaces atualizado, preservando `editorSeed(tiles)` dos pedestais.
- Fontes históricas de Cruzeta, editor, compactação de catálogo/snapshots, dois pedestais e Aspergillum compacto.
- Fontes antes ignoradas em `out/`: candidatos, auditorias, baselines têxteis, comparadores independentes, patches, controles anteriores e evidências.
- Modelo editável e histórico da Nossa Senhora da Paz, add-on original 0.1.3 com construtor/testes, estudos Bedrock e entradas necessárias às variantes preservadas. Candidatos rejeitados ou não integrados continuam identificados dessa forma.
- Proveniência e controles do segundo estudo dos pedestais.
- Fontes e evidências das duas frentes de workbench Paz, incluindo correção de UV/planos, sem aplicar esse estudo automaticamente ao viewer ativo.

O [resumo verificável](SUMMARY.json) lista os 13 snapshots e as contagens finais.

As fontes históricas podem conter tentativas abandonadas, inclusive reencodificações de áudio. Elas **não** substituem os arquivos de áudio aprovados do runtime.

## Estrutura e integridade

`snapshots/*.json` registra o caminho original, tamanho e SHA-256 de cada arquivo. Cada arquivo modificado é preservado inteiro, não como patch dependente de contexto. Bytes idênticos ao commit `0c4645d1e67ffa0af1d014cd47722cedf02d26b2` são referenciados pelo objeto Git imutável; os demais ficam em `objects/<prefixo-do-hash>/<sha256>.blob`, compartilhados entre snapshots quando idênticos.

As 112 cenas Blender únicas (127 caminhos, incluindo backups distintos) ocupam 56,8 MB em bases/deltas Zstandard e reconstituem 4,83 GB de bytes originais, todos conferidos por SHA-256. O manifesto comum remete ao manifesto desse arquivo complementar e valida seu hash. A `.gitattributes` preserva os bytes também em checkouts Windows.

A extensão `.blob` evita que scanners de testes e empacotadores tratem cópias experimentais como código ativo. Ao restaurar, os nomes e extensões originais são recuperados. Não editar objetos manualmente: o hash detecta qualquer alteração.

Use um clone com o histórico Git completo. Python 3.10 ou posterior basta para as fontes comuns. Para as cenas Blender, instale também a CLI `zstd`; a verificação e a restauração da Nossa Senhora da Paz executam automaticamente o [restaurador lossless](sculpture-lossless/README.md). A decodificação precisa de pelo menos 4,9 GB temporários e a restauração completa precisa de espaço adicional para os arquivos/aliases. Escolha um volume adequado com `--temp-dir`:

```sh
python experiments/2026-11-preservation/archive.py list
python experiments/2026-11-preservation/archive.py verify --temp-dir ../
python experiments/2026-11-preservation/archive.py restore altare-aspergillum-consolidated-ui-final ../aspergillum-experimental-restored
```

O destino deve ser novo e estar fora deste checkout. Uma interrupção ou falta de espaço durante a escrita pode deixar uma pasta parcial; não a trate como restauração concluída e escolha um novo destino ao repetir. A ferramenta valida todos os hashes antes de escrever e nunca sobrescreve uma pasta existente.

Depois da restauração, instale as dependências nos diretórios restaurados conforme os respectivos `package.json`/lockfiles. Para regenerar os outputs Altare e Studio, use os scripts `build`/`sync-assets` daquele snapshot. Os snapshots não substituem a documentação de reprodução de cada estudo.

## Exclusões intencionais

Dependências, caches, packs Altare gerados, bibliotecas sincronizadas do viewer, bundles Vite e ZIPs duplicados não são fontes autoritativas. `source-exclusions.json` registra essa seleção para a consolidada; os manifestos Paz incluem inventários de exclusões e suas razões. Fontes, entradas e observações únicas de `out/` foram preservadas expressamente, apesar do `.gitignore` original. Os inventários preliminares Paz foram ampliados: todos os inputs numéricos históricos, PNGs próprios, EXR, logs e os `.mcaddon` diagnósticos exatos são preservados. Restam excluídos os ZIPs redundantes, cenas Blender reconstruídas como cache e três snapshots de código de terceiros sem licença no workspace. As notas e URLs da pesquisa `nspaz-newrefs-20261102` foram preservadas; as cópias baixadas de publicação/fotografias externas não foram revendorizadas. A fotografia de referência fornecida pelo usuário está no arquivo. A lista efetiva é o manifesto final, não a seleção mínima preliminar.

Uma fonte arquivada não equivale a uma execução reproduzida. Scripts históricos podem precisar do toolchain ou do checkpoint indicado em sua documentação. Não se declara aprovação visual no Blender/Bedrock nem restauração de saves por ter passado em testes automatizados.

## Verificações

- Integridade SHA-256 e restauração para diretório independente.
- Testes do restaurador: caminhos inválidos, arquivos corrompidos, duplicação e recusa de sobrescrita/runtime.
- Runtime main: `npm run check`, `npm --prefix addons/altare run check` e revalidação do áudio aprovado após restaurar os outputs regenerados.
- Snapshot UI-final: typechecks raiz/Altare, 16 testes da Mesa e 22 testes do editor Altare. O restante dos gates históricos permanece documentado em cada snapshot.

Não houve release, instalação, publicação de pacote ou teste no Minecraft nesta consolidação.
