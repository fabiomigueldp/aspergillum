# Evidência do diagnóstico 0.1.3

Data: 30/10/2026. Status: **pronto para teste controlado; aprovação no Minecraft pendente**.

| Evidência | Resultado |
| --- | --- |
| Artefato | `Altare-0.1.3.mcaddon` |
| Manifests | BP/RP `[0,1,3]`, engine mínima `[1,26,40]` |
| Tamanho | 874.278 bytes |
| Arquivos | 72 |
| SHA-256 | `0510ec8ec66330a78760161f944c6dfbc52150a066b2d6957c7ec583447e676d` |
| `npm run check` do Altare | tipos, 13 testes, geração e validação estrutural aprovados |
| `npm run package` | Creator Tools 0.17.7: zero erros e zero avisos |
| `npm run check` da raiz | aprovado: 107 testes do Aspergillum, 54 do viewer e validadores existentes |
| Materiais | 40 capturas: cinco configurações, quatro vistas, com/sem mapas PBR |
| Orientações | 16 capturas: larguras 3/4, quatro direções, frente/oblíqua |
| Comparação | 16 capturas da baseline 0.1.2 com a mesma ponte de coordenadas, câmera e iluminação |
| Compatibilidade | bundle de gameplay e definições dos estados idênticos à 0.1.2, conferidos dentro dos dois ZIPs |
| Documentação | 19 links locais verificados |
| Content Log real da 0.1.3 | pendente de importação pelo usuário |

O relatório oficial fica em `dist/validation/0.1.3/`. `capture-parity.json` verifica cada arquivo do ZIP contra o build e as fontes/PNGs contra os manifests das 56 capturas novas. Arquivos gerados e evidências descartáveis permanecem ignorados pelo Git.

A [análise visual](VISUAL_POLISH_0.1.3.md) explica os defeitos reproduzidos, a base de coordenadas, o recorte da bainha, a mudança de orçamento das texturas e os limites da evidência. As capturas enviadas pelo usuário são da revisão anterior; não são aprovação automática desta revisão. O frontal permanece interpretação autoral, sem pretensão de reproduzir os retratos da referência pequena.

Nenhum mundo foi instalado, convertido ou alterado. Os IDs/UUIDs/states e o runtime de gameplay foram preservados. As mudanças preexistentes da raiz e os outros subprojetos não foram incorporados nem revertidos.

Importação e passos mínimos: [README](../README.md). Critérios físicos: [TESTING.md](TESTING.md).
