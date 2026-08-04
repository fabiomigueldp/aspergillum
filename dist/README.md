# Artefatos gerados

Este diretório não contém fontes do projeto.

- `releases/`: pacotes `.mcaddon` e arquivos `.sha256` criados por `npm run package`.
- `validation/<versão>/`: CSV, JSON e HTML produzidos pelo Minecraft Creator Tools.

Essas subpastas são ignoradas pelo Git e podem ser recriadas. `npm run clean` remove somente os artefatos gerados conhecidos e preserva este arquivo.
