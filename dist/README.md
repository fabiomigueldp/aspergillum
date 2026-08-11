# Artefatos gerados

Este diretório não contém fontes do projeto.

- `releases/`: pacotes `.mcaddon`, hashes, descritores `.artifact.json` e `catalog.json` criados pelo empacotamento.
- `validation/<versão>/`: CSV, JSON e HTML produzidos pelo Minecraft Creator Tools.

Essas subpastas são ignoradas pelo Git e podem ser recriadas. `npm run clean` preserva releases; `npm run clean:artifacts` remove explicitamente releases, validações, diagnósticos e o cache local, sempre preservando este arquivo.
