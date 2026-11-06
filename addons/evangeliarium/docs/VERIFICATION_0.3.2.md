# Verificação do candidato 0.3.2

- Artefato: `dist/releases/Evangeliarium-0.3.2.mcaddon`, **1.031.089 bytes**, **74 arquivos**.
- SHA-256: `469add4580d4a4af7a08052a5ec663b13df5899066d7c612f5b1715bc4c5fdc4`.
- Build, TypeScript estrito, **97 testes** e validação estrutural do add-on aprovados.
- Vinte e cinco testes de modelo em `tests/open-model.node.ts`: os vértices dos modelos `open` e `closed` coincidem com os endpoints animados dos três livros (tolerância 0,00001 unidade). Incluem capa, lombada comprimida e terminais das fitas; UVs dos caminhos estático/animado são idênticos.
- **51 fases por livro, 153 poses**: escala positiva, vértices sobre o apoio e dentro dos bounds existentes, cuboides positivos e UVs dentro do atlas. O cálculo usa a mesma convenção canônica de eixos do adaptador Bedrock local. Amostragem não é prova contínua nem substitui o motor nativo.
- Todos os 74 arquivos do ZIP foram comparados byte a byte com os packs atuais, incluindo 12 geometrias, animações, controller, mapas PBR e ícones. As 12 geometrias também coincidem com os exportadores autorais atuais. Ambos os manifests confirmam `[0,3,2]`.
- Microsoft Creator Tools 0.17.7: **zero Error/Failure e zero aviso inesperado**. Doze avisos documentados referem-se a ingredientes vanilla não resolvidos offline. Usada a mesma versão oficial fixada `MCT_TEST_PINNED_MC_VERSION=1.26.60.5` das revisões anteriores; consultas npm retornaram HTTP 502 sem falha estrutural.
- Nenhum teste foi excluído e nenhum limite foi reduzido. Os checks da raiz não foram repetidos; alterações desta revisão estão no Evangeliarium.

A inspeção baixa posterior identificou orientação incorreta das linhas do corte lateral do Evangeliário. O atlas ganhou um tile alto próprio, usado pelas faces east/west. O sétimo teste confirma associação, direção das linhas e padding sem sobreposição. Build, tipos, 97 testes, estrutura e Creator Tools foram reexecutados; o hash acima substitui o candidato anterior não entregue.

A revisão das fitas acrescentou três testes: nenhum vértice dos marcadores alcança o plano impresso e toda a aresta da dobra continua ligada ao corpo em 51 fases por livro. Marcadores estão entre folhas; pontas têm pivôs por profundidade. Abas laterais do Missal são finas e foscas. Os três ícones foram regenerados. O Gospel usa a composição quase frontal equivalente do fluxo Blender; iluminação PBR difere do renderizador Three.js. Proveniência em `assets-src/branding/gospel-icon-blender-manifest.json`. O manifesto antigo do renderizador de navegador descreve capturas históricas. O pacote anterior (`2fa40ab0…`) foi preservado em `out/superseded/0.3.2-before-stored-ribbons/` e substituído pelo hash acima.

A auditoria multiângulo seguinte removeu sobreposições coplanares do Evangeliário, reduziu ruído da normal e brilho do ouro, calibrou pivôs por espessura e restaurou oito faces laterais de nervuras do Missal/Pontifical. Oito regressões adicionais cobrem faces coplanares, pivôs/verso aberto e faces east das nervuras. Todos os checks acima foram repetidos com os ícones finais. O candidato anterior (`89e33749…`) está em `out/superseded/0.3.2-before-face-audit/`. Este registro encerra apenas esse ciclo técnico; a revisão de identidade/proporções baseada em livros reais prossegue separadamente.

O ciclo de proporções adotou plantas menores para Missal/Pontifical, espessuras autorais documentadas e poses específicas de terceira pessoa aprovadas na composição wide/slim. As caixas de seleção agora seguem livro/estado com margem 0,15, verificadas nas quatro orientações. Quatro testes adicionais cobrem seleção, orientação de capa e preservação de Gospel/primeira pessoa. O último check, ícones, export de mão e Creator Tools foram repetidos; os 74 arquivos do ZIP coincidem byte a byte com o build. O candidato anterior (`df7a08e0…`) está preservado em `out/superseded/0.3.2-before-proportions/`. Consulte [referências e limitações](BOOK_PROPORTIONS.md).

A revisão dos terminais da lombada corrigiu apenas UVs curtos up/down para couro, sem comprimir a arte vertical da lombada. Três regressões cobrem os quatro exports de cada livro. O build, tipos, 97 testes, estrutura e Creator Tools passaram novamente. O sync oficial do viewer foi refeito; suas 18 cópias de mapas color/MER/normal coincidem com o pack, inclusive Gospel MER/normal anteriormente desatualizados. A composição de mão foi reexportada e a proveniência atualizada. O candidato anterior (`babb1692…`) foi preservado em `out/superseded/0.3.2-before-spine-endcaps/`.

## Limites

A validação geométrica não prova ausência de todos os cruzamentos entre superfícies, adequação visual, descarte de faces traseiras, iluminação ou animação real do Minecraft. Os renders e verificações Blender complementares são documentados em `assets-src/liturgical-books/reports/` e não substituem o teste nativo.

Importação, Content Log, abertura/fechamento repetidos, quatro orientações, estado aberto após reload, culling e gráficos clássicos/Vibrant Visuals continuam pendentes. Ver [construção e roteiro](OPEN_BOOK_REBUILD.md). Nenhum mundo, Shared, servidor ou publicação foi alterado.
