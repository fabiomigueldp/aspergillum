# Chanfros de Ogivas — Altare 0.11.2 / Estúdio 2.2.1

## Resultado

Refina a [arcada da 0.11.1](OGIVE_REBUILD_0.11.0.md). As paredes perpendiculares do recesso dão lugar a um chanfro contínuo que liga a boca ogival ao campo recuado. O perfil é geometria: responde à luz e à câmera sem sombras pintadas. A leitura das bordas fica mais definida nos três materiais.

O contorno frontal não muda. O fundo da abertura recua 0,50 unidade de modelo para dentro, além da profundidade existente de 1,03. O comprimento inclinado do chanfro é aproximadamente 1,145 unidade. A ponta fecha em uma mitra única; as junções das facetas e dos montantes encontram a mesma linha no fundo. O piso permanece na cota 1,50.

Na nogueira, o veio acompanha o comprimento do montante e do arco, em vez de formar faixas horizontais nos montantes. Usa o material de travessa já publicado, com seu eixo orientado pela faceta; não cria outro mapa ou alias.

## Tecnologia e limites

`assets-src/atelier/opening-reveal.mjs` separa o perfil de abertura de sua orientação no mundo. Calcula as interseções das linhas deslocadas e transporta o referencial completo para cada lado. A conversão de matriz para Euler evita trocar canais de uma rotação composta, o que mudaria a posição física das facetas.

As quatorze faces retangulares existentes formam uma envoltória de planos inclinados. Faces vizinhas se cruzam em planos diferentes; seus excedentes ficam dentro do corpo sólido. A superfície externa é o primeiro plano atingido por um raio, fechando as mitras sem pontas expostas, tampas coplanares ou novos registros geométricos. O recesso continua cego, com fundo sólido; não depende de `poly_mesh`, animação ou entidade auxiliar.

O teste usa raios transformados independentemente contra as faces emitidas e compara a profundidade com as restrições analíticas da abertura. Também verifica os vértices de frente/fundo nas quatro orientações, normais voltadas para fora, limites pós-rotação e fechamento da ponta. Relevos ímpares passam a caber no campo do fundo, preservando a margem e as proporções; as metades pares continuam apoiadas no pilar central.

## Compatibilidade

As 397 definições de bloco, IDs, UUIDs, arrays ordenados de states/defaults, colisões e runtime da 0.11.1 permanecem byte-idênticos. A correção de abertura do editor permanece incluída. Só intradorsos e dimensionamento do relevo ímpar das geometrias Ogivas podem mudar. Corpo, apoios, base, mesa, dez tecidos e relevos pares são protegidos pelo auditor.

Não há arquivos de pack adicionais: 4.108 geometrias, 4.780 entradas, 84 conjuntos e 174 mapas de material. Todos os PNGs/texture sets/atlas são byte-idênticos. Memória RGBA única: 34.790.400 bytes antes de mipmaps/ícones. Estados: 78.432 Altare / 88.176 com Aspergillum. Máximo de Ogivas: os mesmos 110 registros/257 faces, sob o teto diagnóstico 112/300. As exceções e o gate de desempenho anteriores continuam válidos.

O payload descomprimido medido na candidata é 253.792.782 bytes: acréscimo de 80.220 bytes sobre a 0.11.1. A auditoria limita o aumento a 128 KiB e proíbe recursos adicionais. A alteração não afrouxa os tetos geométricos nem a política de avisos.

## Evidência reproduzível

- `npm run check`: tipos, 103 testes e validação de todas as combinações geradas.
- Baseline: `out/ogive-0.11.1`, 32 imagens já conferidas com o arquivo 0.11.1.
- Nova comparação: mesmos quatro presets `ogive-marble-bare-7,ogive-walnut-bare-5,ogive-limestone-agnus-8,ogive-marble-lace-7`; vistas `oblique,arch,peak,raking`; perfis `classic,pbr`; 1600×1000. Fixar `$env:ASPERGILLUM_RENDER_BACKEND='hardware'`, mesma Iris Xe/D3D11 e Chromium 145.0.7632.6. Saída `out/ogive-0.11.2`.
- Matriz `ogive`: 23 presets, vistas `oblique,corner,underside`, dois perfis, tamanhos 1×1 até 16×8, dez tecidos, três materiais e quatro frentes. Inclui dois casos extras de relevo ímpar, sem toalha e com bordado longo. Saída `out/ogive-matrix-0.11.2`, 138 vistas.
- `npm run package`; `node tools/verify-ogive-detail.mjs`; `node tools/verify-captures.mjs out/ogive-0.11.2 out/ogive-matrix-0.11.2`; `node tools/compare-structures.mjs out/ogive-0.11.1 out/ogive-0.11.2`.
- Raiz: `npm run check`. Estúdio: preparar/buildar, atualizar miniaturas e executar os dois smokes compilados. Não reconstruir packs durante capturas/sincronização.

## Resultado do pacote final

[Altare-0.11.2.mcaddon](../dist/releases/Altare-0.11.2.mcaddon): 19.612.578 bytes / 4.780 entradas. SHA-256 `29d3f6e8f38868355188cd7ea95529128a2e60fd17b718d5487ceb68ecf329ae`. Creator Tools: zero erros, os mesmos 2.084 avisos de complexidade conferidos pela política, zero avisos inesperados. [Relatório oficial](../dist/validation/0.11.2/release-summary.json).

A auditoria do arquivo final preserva byte a byte os 397 blocos, 174 mapas, runtime, 2.548 geometrias das outras famílias e o corpo/toalhas/relevos pares de Ogivas. Nenhum recurso foi adicionado; máximos permanecem 110/257. As 170 imagens finais conferem com o arquivo e as fontes. Os 32 pares controlados têm câmera, resolução, perfis, navegador e GPU idênticos. [Comparação](../out/ogive-comparison-0.11.2/index.html), [auditoria](../dist/validation/0.11.2/ogive-detail-compatibility.json) e [paridade](../dist/validation/0.11.2/capture-parity.json).

O pacote passou com 103 testes; a raiz com 107 e o viewer com 83. O Estúdio 2.2.1 foi preparado/buildado e serve Altare 0.11.2 em 4173, com miniaturas conferidas entre fontes e build. Os smokes compilados do estúdio e Workbench passaram: edição/troca de modelos, dez tecidos, quatro ambientes, iluminação, PNG/JSON, cenas antigas e viewport de 390 px. A comparação abre na vista rasante da nogueira para mostrar os perfis. O reteste nativo permanece pendente.

## Reteste no Minecraft — pendente

1. Importar somente `Altare-0.11.2.mcaddon`, BP/RP `[0,11,2]`, numa cópia do mundo, sem revisão/cache concorrente. Conferir um Ogivas existente antes de reaplicar.
2. Em 7×2×1, sem toalha, orbitar a ponta, os nascimentos e os encontros do chanfro. O perfil deve ser contínuo, sem pontas, frestas, cintilação ou faces desaparecendo; repetir nos três materiais.
3. Alternar renda, linho longo e Floral IHS nas quatro frentes. Conferir cruz/Cordeiro em 7×2 e 8×2: figura inteira, apoiada e sem atravessar o chanfro. Conferir 1×1, 1×8 e 16×8.
4. Conservar objetos sobre o tampo ao aplicar/cancelar/restaurar. Testar quebra/reposição, salvar/reabrir e sessão exclusiva com dois clientes. Content Log sem novos erros de Altare ou rollback.
5. Comparar os modos gráficos e medir carregamento/memória/FPS com 1/16/64 altares. Renders externos não confirmam desempenho, sombras ou paridade nativa.
