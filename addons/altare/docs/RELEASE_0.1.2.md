# Evidência do diagnóstico 0.1.2

Data: 30/10/2026. Status: **pronto para teste controlado; não aprovado no Minecraft**.

| Evidência | Resultado |
| --- | --- |
| Artefato | `Altare-0.1.2.mcaddon` |
| Manifests | BP/RP `[0,1,2]`, engine mínima `[1,26,40]` |
| Tamanho | 318.267 bytes |
| Arquivos | 72; cada entrada do ZIP comparada byte a byte com o pack gerado |
| SHA-256 | `882ad61444d92aba302ae95d308dddfe04f58ba2f55167577ae829ba6f13a1f2` |
| `npm run check` do Altare | tipos, dez testes, build e validação estrutural aprovados |
| `npm run package` | aprovado; Creator Tools 0.17.7 com zero erros e zero avisos |
| `npm run check` da raiz | aprovado; 107 testes do Aspergillum, 54 do viewer e validadores existentes |
| Captura final | 16 PNGs, 1600 × 1000, quatro configurações × quatro vistas, material PBR |
| Conferência de fontes | hashes da geometria e dos materiais da captura correspondem ao pacote final |
| Links locais | documentação do subprojeto verificada |
| Content Log real | pendente de importação e teste pelo usuário |

Na inspeção das capturas, o frontal de largura par passou a ter um centro contínuo depois da correção de UV. Frente, costas e topo foram conferidos, juntamente com a queda longa e o módulo sem tecido. As imagens mostram os assets reais através do adaptador compartilhado do Workbench; não comprovam seleção, suporte de objetos, input ou renderização no Bedrock.

Nenhum mundo foi aberto, instalado, convertido ou alterado. As alterações preexistentes em `CHANGELOG.md`, `docs/PROJECT_STATUS.md`, `docs/TESTING.md` e nos outros subprojetos foram preservadas. As revisões 0.1.0 e 0.1.1 permanecem como candidatas rejeitadas no histórico; o único artefato indicado para teste é 0.1.2.

Critérios físicos e comandos mínimos: [QA](TESTING.md) e [README](../README.md).
