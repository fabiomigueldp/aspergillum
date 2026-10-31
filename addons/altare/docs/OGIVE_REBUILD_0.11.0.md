# Ogivas — construção 0.11.0 / distribuição 0.11.1 / Estúdio 2.2.0

A distribuição final integra a [correção do editor 0.11.1](EDITOR_FIX_0.11.1.md), preparada em paralelo. A geometria, texturas e contratos visuais desta reconstrução permanecem os mesmos. Usar o arquivo 0.11.1 nos retestes; a candidata 0.11.0 foi validada em ZIP temporário, sem promoção separada.

## Intenção e construção

O modelo anterior aplicava barras retas sobre um corpo liso, somente na frente selecionada. Os encontros das barras interrompiam a leitura do arco e as laterais não pertenciam à mesma construção. Esta revisão constrói uma arcada cega gótica em todo o perímetro exposto: campo recuado, intradorso, pilares de quina compartilhados, meios apoios entre módulos, impostas e perfis contínuos de embasamento/friso/mesa.

`assets-src/atelier/ogive-model.mjs` define duas curvas circulares simétricas, tangentes às pernas verticais e unidas em uma ponta única. Cada ramo tem seis segmentos; os doze planos do teto e os dois flancos verticais ligam a fachada ao campo recuado. Não há barras frontais sobrepostas ou fecho retangular cobrindo a ponta.

A fachada usa um único plano recortado por lado exposto. O recorte binário é calculado a partir do mesmo polígono que gera o intradorso. Uma margem de meio texel esconde a quantização junto à borda. O recorte fornece a silhueta; o intradorso e os apoios fornecem a profundidade. Não é uma imagem de arco pintada sobre um cubo. Usa somente cubos/UVs `1.16.0`; não depende de `poly_mesh`, de entidades auxiliares ou de APIs experimentais.

As três cores de recorte 128² preservam exatamente o RGB dos materiais distribuídos, inclusive sob os pixels transparentes. Compartilham seus normal/MER existentes, evitando novas cópias PBR e halos escuros. Nogueira usa veios verticais nos apoios/campo e horizontais nas travessas/tampo.

| Parte | Cota, em unidades de 1/16 bloco |
| --- | --- |
| Embasamento | 0–0,50; 0,50–1,10; 1,10–1,50 |
| Pés, fustes e coroamento dos pilares | 1,50–2,25; 2,25–12,875; 12,875–13,50 |
| Nascimento e ponta da ogiva | 5,25 / 12,625 |
| Meia largura livre | 4,625 |
| Campo / fachada / frente do pilar | 7,05 / 8,08 / 8,12 |
| Friso / borda / coroamento da mesa | 13,50–14,20 / 14,20–15,45 / 15,45–16 |

As impostas encontram o apoio realmente emitido, que é mais estreito nas emendas intermediárias. Cada quina tem um pilar único para as duas fachadas. Cursos horizontais chegam à fronteira dos módulos interiores sem faces de contato duplicadas. Só as faces externas recebem arcos e quedas de tecido.

## Toalhas e relevos

As dez escolhas usam a mesma arquitetura. Com toalha, a base superior termina em 15,91 e o linho em 16, mantendo livres as células de apoio acima. Materiais cardinais posicionam o centro bordado somente na frente escolhida; corpo, arcadas e quinas não giram quando se muda essa frente.

Relevos ímpares entram no campo recuado; os pares apoiam-se no pilar central compartilhado. A escala preserva as proporções. Nos ímpares, os quatro cantos do desenho também devem caber sob o teto ogival com margem, e não somente entre limites retangulares. Quedas longas reduzem o desenho completo. Não há recorte da figura ou placa flutuante.

## Compatibilidade e custo

Preserva os 397 IDs, UUIDs, arrays ordenados de states/defaults, codecs, colisões e runtime da 0.10.1. As 286 definições de bloco de outras famílias, suas geometrias e todos os 171 mapas anteriores devem ser byte-idênticos. Só geometria/materiais dos 111 blocos Ogivas mudam. O atlas acrescenta três aliases; versões dos manifests e textos acompanham a revisão.

Na distribuição 0.11.1, o runtime admite exclusivamente a alteração documentada do observável fixo para `clientWritable`. O auditor exige a substituição literal de uma única linha do bundle; demais regras, sessões e escritas permanecem preservadas.

O compilador acrescenta 1.440 contornos geométricos e seis arquivos de textura (três cores/três sets), sem estados novos. Frente sem relevo reutiliza geometria cardinal, com materiais de tecido direcionais. As geometrias genéricas publicadas são preservadas como fallback isolado. Só a família nova e Pilastras usam JSON compacto.

O limite diagnóstico de Ogivas é 112 registros/300 faces UV por módulo; os limites de Pilastras 80/300 e Colunata 112/400 continuam próprios. A referência de 50 cubos continua registrada no relatório oficial. A exceção aceita somente GEOMETRY 501 com caminho/identidade, contagem real e orçamento conferidos; erros e outros avisos reprovam. Não constitui aprovação de desempenho nativo.

Máximo medido de Ogivas: 110 registros/257 faces UV, contando todos os relevos autorados antes da seleção do papel visível. O 7×2 com renda e sem aplique tem 572 registros/1.080 faces no conjunto, média de 40,86/77,14 por módulo; o 1×1 vestido é o caso proporcionalmente mais caro. Os contornos limitam os arcos ao perímetro. A distribuição 0.11.1 tem 4.108 geometrias e 4.780 entradas, com 253.712.562 bytes descomprimidos, acréscimo de 10.201.607 sobre a 0.10.1. A auditoria limita esse acréscimo a 12 MiB.

Mapas únicos: 34.790.400 bytes RGBA (33,1787 MiB), acréscimo de 192 KiB. O teto explícito passa de 33 para 33,25 MiB, antes de mipmaps/ícones. Estados continuam 78.432 no Altare / 88.176 com Aspergillum; a exceção diagnóstica anterior permanece, sem expansão.

## Verificação reproduzível

- `npm run check`: tipos, 100 testes da reconstrução e validação de todas as combinações emitidas; distribuição 0.11.1 tem 102 testes, incluindo o editor. Regressões novas: continuidade da curva, máscara/intradorso/normais, quinas, encaixe das dez toalhas, relevos sob teto ogival, vértices rotacionados, orçamento, RGB doador/PBR compartilhado e política estrita de avisos.
- Baseline 0.10.1 capturada antes de reconstruir os packs, com a GPU Intel Iris Xe/D3D11 verificada, Chromium 145.0.7632.6, 1600×1000, presets `ogive-marble-bare-7,ogive-walnut-bare-5,ogive-limestone-agnus-8,ogive-marble-lace-7`, vistas `oblique,arch,peak,raking`, perfis `classic,pbr`.
- Repetir exatamente essas opções em `out/ogive-0.11.1`, fixando `$env:ASPERGILLUM_RENDER_BACKEND='hardware'`. Comparação exige mesmo backend, dispositivo, câmera, enquadramento e recursos correspondentes aos dois arquivos finais. A captura lê a versão dos packs gerados e rejeita mudança de versão durante a execução.
- Matriz `ogive`: materiais/tecidos, quatro frentes, tamanhos 1×1 a 16×8; conferir frente, quinas e vistas inferiores. Saída final em `out/ogive-matrix-0.11.1`. A matriz preliminar 0.11.0 não é a evidência da distribuição integrada.
- Antes da distribuição: ZIP temporário 0.11.0 validado com Creator Tools offline e `verify-ogive.mjs`; zero erros, 2.084 avisos geométricos estritamente conferidos. Depois de `npm run package` na distribuição 0.11.1: `node tools/verify-ogive.mjs` e `node tools/compare-structures.mjs out/ogive-before-0.10.1 out/ogive-0.11.1`.
- Raiz `npm run check`; preparar/buildar Studio e executar smokes compilados. Não regenerar packs enquanto capturas/sincronização os leem.

## Resultado da distribuição integrada

Arquivo: [Altare-0.11.1.mcaddon](../dist/releases/Altare-0.11.1.mcaddon), 19.579.387 bytes / 4.780 entradas. SHA-256 `77304f21e17092a91921a82e46b5185be9dcc287a19611217d73465368481d7f`. Creator Tools: zero erros, 2.084 avisos de complexidade conferidos pela política estrita, zero avisos inesperados. [Relatório oficial](../dist/validation/0.11.1/release-summary.json).

Auditoria final: 397 IDs/states, 171 mapas anteriores e 2.548 geometrias das outras famílias preservados; a única diferença de runtime é a opção fixa do editor documentada acima. As 158 imagens da distribuição final conferem com o arquivo e as fontes atuais. Os 32 pares controlados usam os mesmos presets, câmeras, resolução, navegador, GPU e driver da baseline 0.10.1. [Comparação](../out/ogive-comparison-0.11.1/index.html), [auditoria](../dist/validation/0.11.1/ogive-compatibility.json) e [paridade das capturas](../dist/validation/0.11.1/capture-parity.json).

O `npm run package` integrado passou com 102 testes. A raiz passou com 107 testes e os 83 do viewer; o build do Estúdio 2.2.0 serve Altare 0.11.1 em 4173, com miniaturas conferidas. Smokes compilados do estúdio e Workbench passaram: edição de Ogivas, troca dos sete modelos/dez tecidos, quatro ambientes, exportações PNG/JSON, cenas antigas e viewport de 390 px. O smoke do estúdio registrou 50,1 s em GPU verificada, sem erros. A aprovação dentro do jogo permanece pendente.

## Reteste no Minecraft

1. Importar somente `Altare-0.11.1.mcaddon`, BP/RP `[0,11,1]`, numa cópia do mundo sem cache/versão concorrente. Conferir também um Ogivas existente antes de reaplicar a ferramenta.
2. Usar Ogivas, sem toalha, 7×2×1, nos três materiais. Orbitar perto dos nascimentos, pontas, recessos, impostas, apoios centrais, cantos e perfis. Recorte e intradorso devem se encontrar sem fresta, halo, cintilação ou face desaparecendo.
3. Repetir com renda, linho longo, Cordeiro e Floral IHS; 7×2 e 8×2 com relevos, nas quatro frentes. As figuras completas devem caber sob o tecido e as ogivas. Conferir cobertura branca e afastamento dos cantos.
4. Conferir 1×1, 1×8 e 16×8; quebrar/repor módulo, reaplicar, cancelar/restaurar e salvar/reabrir. Manter pedra vanilla, cálice colocável e caldeirinha apoiados ao trocar acabamento. Nada acima do altar deve ser movido.
5. Com dois clientes, editar o mesmo conjunto e conferir exclusão/rollback. Content Log sem novos erros de Altare, registro ausente ou falha de escrita.
6. Comparar gráficos clássicos/PBR, sombras do recorte e estabilidade em movimento. Medir carregamento, memória e FPS com 1/16/64 altares no dispositivo de destino. Capturas externas não provam estes resultados.
