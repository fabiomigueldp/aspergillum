# Nossa Senhora da Paz: arquivo histórico lossless

Este diretório preserva os bytes completos das cenas Blender históricas, incluindo checkpoints não aprovados, tentativas rejeitadas e backups com bytes únicos. Não é uma nova escultura aprovada, addon ou release. A V75 continua sendo o checkpoint retido de escultura; P85 é somente um controle técnico separado, não integrado.

## Como os bytes são preservados

`manifest.json` relaciona cada caminho original ao SHA-256 e tamanho exatos. Cada objeto possui um frame Zstandard em `objects/`: uma base independente ou um delta lossless que usa outro objeto do próprio arquivo como referência. Não é apenas uma lista de hashes. Todos os bytes necessários à restauração estão neste diretório. Arquivos iguais são guardados uma única vez e seus caminhos permanecem como aliases no manifesto.

O restaurador não depende do workspace original e nunca lê os .blend originais. Verifica o hash do payload comprimido, restaura as referências e confere o SHA-256 e tamanho de cada cena reconstruída. Não sobrescreve arquivos existentes. A decodificação não executa Blender nem scripts embarcados.

Requisitos: Python 3.10 ou superior e CLI Zstandard (`zstd`). Testado com zstd 1.5.7. O arquivo contém deltas `--patch-from`, não um ZIP comum. Para verificar todos os objetos sem manter os arquivos restaurados:

```
python restore.py verify --temp-dir /volume/com/espaco
```

Para restaurar todas as cenas e seus nomes originais em um diretório novo:

```
python restore.py restore --destination /caminho/novo/restore-paz
```

Para restaurar apenas o checkpoint V75:

```
python restore.py restore --destination /caminho/novo/restore-paz --source paz-refinement/gui-test/checkpoint-V75-20261102/V75-tunic-lower-trial.blend
```

A verificação integral usa temporariamente aproximadamente 4,9 GB para as cenas únicas. Use `--temp-dir` para escolher um volume com esse espaço; o `/tmp` padrão pode ser pequeno. A restauração completa precisa também de espaço para todos os aliases. Abrir cenas Blender com a execução de scripts desativada. Os scripts de desenvolvimento que acompanham as cenas em outra parte do repositório são registros históricos e podem conter caminhos absolutos antigos; sua portabilidade não é inferida a partir da restauração binária.

Nenhuma cena foi promovida por estar aqui. A seleção de uma tentativa para produto final exige revisão própria. Não há evidência de teste em Minecraft nem autorização visual de release.
