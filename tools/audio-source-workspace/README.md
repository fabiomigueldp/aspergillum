# Audio source workspace

Workspace local e descartável para revisar candidatos de efeitos sonoros antes de promovê-los ao pipeline do Aspergillum.

Os candidatos ficam em `outputs/` e não são versionados. Depois da seleção, `tools/prepare-audio-sources.mjs` copia somente os arquivos enumerados por `assets-src/audio/generation-manifest.json` para `assets-src/audio/raw/selected/` e atualiza as receitas.
