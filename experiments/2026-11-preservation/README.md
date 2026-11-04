# Arquivo curado dos estudos de novembro de 2026

**Fontes e pesquisa selecionadas. Não é release, atualização de mundo nem aprovação visual.**

A main mantém Aspergillum **1.2.5**, Altare **0.11.2** e Studio **2.2.1**. Os estudos 2.0.0/0.13.0/2.4.0 continuam isolados e NO-GO para atualização de saves. Esta organização não muda runtime, áudio aprovado, identidades públicas, packs instalados ou mundos.

## O que permanece

- Os 12 snapshots Altare/Aspergillum, pedestais e workbench permanecem byte-idênticos. Incluem a consolidada UI-final e seus insumos.
- Nossa Senhora da Paz conserva o checkpoint editável **V75**, com avaliações e renders próprios; **P85** continua como controle técnico separado, não integrado.
- O add-on Paz **0.1.3** mantém os 15 arquivos originais, baseline, identidade, construtor determinístico, 78 testes e evidência de release ainda pendente.
- V14, a máscara compartilhada **V15 2048** e o diagnóstico local **V16 depth3**, com sua contraprova de transparências recolocadas, mantêm modelos, texturas, fontes congeladas, construtores e comparações selecionadas. Nenhum deles é arte final aprovada.
- Todos os registros `.py`, `.mjs`, `.sh`, `.md` e `.txt`, a fotografia fornecida pelo usuário, notas de referências e inventários de auditoria são conservados. Scripts históricos podem mencionar ensaios descartados; sua presença não promete a reprodução de todas as tentativas antigas.
- As **112 cenas Blender únicas, em 127 caminhos**, continuam completas no arquivo lossless de 56.814.848 bytes. Os deltas dependem entre si: V75 sozinho usa uma cadeia de 96 objetos. Nenhum payload, alias ou elo dessa cadeia foi removido.

O [resumo](SUMMARY.json) descreve os 13 snapshots. A [seleção auditável](CURATION.json) registra os insumos dos construtores retidos e cada caminho retirado, com seu tamanho e SHA-256.

## O que saiu do checkout

Foram retirados **2.169 caminhos** do snapshot Paz: renders intermediários não selecionados, dumps numéricos históricos, variantes de geometria geradas, logs e pacotes diagnósticos redundantes. A seleção parte do inventário mínimo anterior e acrescenta todos os registros de código/texto, a referência do usuário, notas e auditorias. Não é uma exclusão indiscriminada por extensão ou tamanho.

Exemplo verificado: os JSONs V16 `roi68-depth1`, `roi68-depth2` e `all-band-depth1` são saídas geradas. Os dois primeiros são níveis comparativos; `all-band-depth1` era explicitamente opcional e não usado no resultado causal. Os cinco JSONs V16, incluindo depth3 e sua contraprova retidos, foram reconstruídos com SHA-256 idêntico usando os seis insumos registrados em `CURATION.json`.

A poda remove **1.917 blobs exclusivos**, sem tocar em objetos ainda usados por outro snapshot:

- Blobs comuns: 1.790.157.519 → **441.961.961 bytes**.
- Economia nos payloads do checkout: **1.348.195.558 bytes**, aproximadamente 1,26 GiB.
- Com o arquivo Blender inalterado: **498.776.809 bytes** de payloads, mais os manifestos, scripts e documentos.

A limpeza posterior do histórico também retirou esses **1.917 blobs** da ancestralidade alcançável da main. Somente três IDs de commit mudaram; os 79 commits anteriores, a branch experimental e as oito tags permaneceram idênticos. A árvore do checkout curado foi preservada exatamente durante a reescrita; um commit posterior atualiza apenas estas referências, documentos e testes. O [registro da limpeza](HISTORY_REWRITE.json) contém o mapa de commits e os limites da verificação.

O repositório independente verificado antes deste ajuste de documentação ocupa **331.137.991 bytes em pack e índice** (aproximadamente 316 MiB). Esse é um resultado local, não uma promessa de tamanho no GitHub. Reflogs, caches, refs internas ou clones antigos podem conservar objetos; a coleta física no servidor não foi solicitada nem confirmada.

## Limite de recuperação após a limpeza

Os 2.169 caminhos retirados continuam inventariados em `CURATION.json`, mas seus 1.917 blobs exclusivos não estão disponíveis em um clone novo. O campo `previous_complete_commit` registra apenas a proveniência do arquivo anterior; não é um link de recuperação. Backups e clones antigos existentes não foram apagados ou alterados.

Os testes usam `comparison_commit` (`3c9820e8223a8be0d9849f98fb84089b8cb19462`), que preserva os manifestos anteriores para conferir a seleção, mas já não contém os payloads descartados. Documentos congelados dentro dos snapshots podem citar ensaios ausentes: essas referências históricas não prometem sua recuperação nem reprodução. Fontes históricas não substituem o runtime ou o áudio aprovado.

## Verificar e restaurar a seleção atual

Os manifestos `snapshots/*.json` registram caminho, tamanho e SHA-256. Bytes iguais à baseline `0c4645d1e67ffa0af1d014cd47722cedf02d26b2` são referenciados pelo objeto Git imutável; os outros ficam em `objects/<prefixo>/<sha256>.blob`. Cada arquivo retido permanece inteiro e byte-idêntico, com deduplicação entre snapshots. A `.gitattributes` preserva os bytes também no Windows.

Use um clone com histórico completo, Python 3.10+ e, para Blender, a CLI `zstd`. A verificação de Paz também valida automaticamente o [arquivo lossless](sculpture-lossless/README.md). Sua decodificação precisa de pelo menos 4,9 GB temporários, mais espaço para os arquivos restaurados. Use um volume adequado:

```sh
python -m unittest discover -s experiments/2026-11-preservation -p 'test_*.py'
python experiments/2026-11-preservation/archive.py list
python experiments/2026-11-preservation/archive.py verify --temp-dir ../
python experiments/2026-11-preservation/archive.py restore altare-aspergillum-consolidated-ui-final ../aspergillum-experimental-restored
```

O destino deve ser novo e fora deste checkout. A ferramenta verifica hashes antes de escrever e recusa sobrescrita. Uma interrupção durante a escrita pode deixar uma pasta parcial; não a trate como concluída e escolha novo destino ao repetir. As verificações não instalam conteúdo, executam Blender ou publicam pacotes.

Instale dependências de cada snapshot usando seus `package.json`/lockfiles. A reconstrução das geometrias V15/V16 usa Python, NumPy, SciPy e Pillow; os caminhos e hashes dos insumos estão em `CURATION.json`. Para repetir a prova com cópias temporárias, sem escrever no arquivo:

```sh
python experiments/2026-11-preservation/verify_retained_builders.py --report ../novo-relatorio-curadoria.json
```

O verificador recusa um relatório já existente e remove as cópias temporárias ao terminar. Se executar os construtores diretamente, use uma cópia descartável: eles escrevem relatórios e saídas locais. O checksum de geometria não implica render idêntico em outra versão do Blender ou comportamento aprovado no Minecraft.

## Limites e validação

`source-exclusions.json` conserva a seleção original da consolidada. Dependências, caches, packs gerados, bundles e ZIPs redundantes não são fontes autoritativas. Fotos/publicações externas baixadas e snapshots de terceiros sem licença não foram revendorizados; suas notas e URLs são preservadas.

Os testes de curadoria verificam omissões exatas, conservação dos registros e insumos, ausência de blobs órfãos, integridade dos manifestos e cadeia Blender. A [verificação da curadoria](VERIFICATION.json) registra a execução anterior à limpeza, incluindo os hashes originais daquele momento. A [verificação da limpeza](HISTORY_REWRITE.json) registra a etapa posterior e o novo commit de comparação. Aprovação visual, Minecraft, migração de saves e publicação continuam pendentes. Um teste automatizado não transforma esses estudos em release.
