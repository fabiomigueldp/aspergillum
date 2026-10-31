# Evidência do diagnóstico 0.2.1

Data: 30/10/2026. Status: **pronto para teste controlado; aprovação dentro do Minecraft pendente**.

O frontal foi reconstruído a partir das referências ampliadas e da confirmação de sete blocos de largura por um de altura. A composição separa lua, sol, Chi-Rho, quatro figuras aladas e fundo; preserva proporções ao variar a largura. Molduras têm profundidade própria e fecham somente nas extremidades. O tampo e a operação de acabamento conservam seus contratos anteriores.

| Evidência | Resultado |
| --- | --- |
| Artefato | [Altare-0.2.1.mcaddon](../dist/releases/Altare-0.2.1.mcaddon) |
| Manifests | BP/RP `[0,2,1]`; engine mínima `[1,26,40]` |
| Tamanho | 3.125.538 bytes |
| Arquivos | 106 |
| SHA-256 | `5cec546f85930d61c7be7a59a72fec3dc90d65ac0e7e91bb390fabf86bb9c25e` |
| `npm run check` do Altare | tipos, 18 testes, geração e validação estrutural aprovados |
| `npm run package` | Creator Tools 0.17.7: zero erros e zero avisos |
| Regressão da raiz nesta sessão | 107 testes do Aspergillum, 54 do viewer e validadores aprovados |
| Geometria | oito variantes de 48 cubos, teto de 50; apoio em y=16 |
| Materiais | 20 conjuntos, 60 PNGs opacos, 11,8125 MiB RGBA antes de mipmaps/ícones |
| Limites de mapas | 12 MiB no total, 256 KiB por camada |
| Larguras | 22 capturas de 1/2/3/4/5/6/7/8/9/12/16 blocos |
| Orientações | 16 capturas de sete/oito blocos, quatro direções |
| Materiais e quedas | 12 capturas: 7×2, 8×2 e 7×2 com toalha longa, com/sem mapas PBR |
| Correspondência | todos os 106 arquivos do ZIP iguais ao build; fontes e PNGs das 50 capturas conferidos por SHA-256 |
| Compatibilidade | UUIDs, IDs, valores antigos/ordem dos estados, colisão, seleção, mobilidade e dependências conferidos contra o ZIP 0.1.3 |
| Content Log real da 0.2.1 | pendente de importação pelo usuário |

Relatórios: [validação oficial](../dist/validation/0.2.1/release-summary.json), [correspondência de capturas](../dist/validation/0.2.1/capture-parity.json) e [compatibilidade](../dist/validation/0.2.1/compatibility.json). Os arquivos gerados permanecem ignorados pelo Git. A verificação da raiz está registrada em `out/aspergillum-check-0.2.0.log`; o nome registra o momento anterior à otimização final, sem mudança posterior no produto da raiz.

A candidata interna 0.2.0 recebeu 32 avisos oficiais de custo e foi rejeitada. A 0.2.1 reduz o atlas e elimina, em cada modelo, três frontais que nunca poderiam aparecer. Mantém as seis dobras de cada lateral e os detalhes geométricos da moldura. Não há whitelist dos avisos nem substituição do arquivo anterior por bytes diferentes.

Foram inspecionadas vistas frontais/oblíquas de sete blocos, centro par de oito, compactos de três/quatro, quatro direções e sobreposição da toalha longa. As capturas mostram a nova geometria e os materiais do pacote, mas usam Three.js/SwiftShader. O perfil `classic` significa material sem mapas normal/MER; nenhum dos perfis comprova equivalência com a iluminação, filtragem ou desempenho do Bedrock.

A [prancha original e seu prompt](../assets-src/guadalupe/SOURCE.md) documentam a geração imagegen integrada. Trata-se de interpretação artística das referências fornecidas, sem pretensão de escaneamento ou autenticação histórica. A [tecnologia de composição](GUADALUPE_FRONTAL.md) descreve os elementos, máscaras materiais e limites de tamanhos.

Para o teste principal, importar somente esta revisão, reaplicar **Acabamento do altar** com frontal e toalha curta num altar 7×2 de um bloco de altura. Verificar objetos apoiados; repetir em 8×2 e 3×2, salvar/reabrir, testar quatro direções e exportar Content Log sem novos erros Altare. Passos completos no [README](../README.md), critérios em [TESTING.md](TESTING.md) e [migração/downgrade](MIGRATION_0.2.1.md).

Nenhum mundo foi aberto, instalado ou alterado. Não foi realizado teste de multiplayer ou dispositivo móvel; não se afirma FPS ou custo real por tick. As alterações preexistentes da raiz e os demais subprojetos foram preservados.
