# Colunata — perfis e apoios 0.8.2

Revisão de 31/10/2026 sobre a 0.8.1. Refina os fustes e cada apoio da Colunata, mantendo um bloco de altura, os dois acabamentos publicados e o alvo principal 7×2.

## Construção

Cada fuste passa de seis para oito faces, emitidas por quatro prismas com apenas as duas faces opostas visíveis. Nos encontros de duas fachadas, uma única coluna octogonal atende os dois lados. Seu eixo fica a 7,35 unidades do centro nas duas direções e seu raio é 0,66; os demais fustes têm raio 0,5. O reforço de pedra atrás da quina diminui de 1,9 para 1,4 unidades, acompanhando o novo apoio. Não há dois fustes sobrepostos no canto.

As bases têm três peças: pedestal de pedra, filete dourado e colar de pedra mais estreito. O capitel também tem três: astrágalo dourado fino, ressalto de pedra e ábaco. As peças são centradas no próprio fuste; a base e o colo recebem integralmente os oito vértices de sua seção. A coluna vai de y=2,35 a 11,85; o capitel termina em 12,95 e encontra a arquitrave. As superfícies das saliências permanecem fechadas.

As caneluras menores continuam nos mapas de superfície, com terminação suave antes da base e do colo. Cor e normal derivam do mesmo perfil; a resposta é fosca, sem emissão ou metal na pedra. O detalhe não substitui a seção octogonal real. Os filetes verticais dos painéis deixam de emitir suas tampas nas junções internas com os filetes horizontais: os encontros são cobertos, sem faces coplanares duplicadas.

A estrutura é idêntica com e sem renda. Tampo, projeções da cornija, molduras dos painéis e desenho da renda são preservados. O topo continua exatamente em y=16.

## Compatibilidade e custo

Nenhum ID, UUID, block state/default, definição de bloco, colisão, nome de geometria, apoio ou script muda. São os mesmos 225 blocos, 224 acabamentos, 560 geometrias e 55.760 combinações no Altare. Aspergillum permanece 1.2.5.

Não há mapas ou materiais novos. Os dois mapas alterados são cor e normal de `ornate_column`; seu MER e todos os demais mapas são preservados. Permanecem 72 conjuntos, 160 PNGs únicos e 34.582.528 bytes RGBA antes de mipmaps/ícones, aproximadamente 32,9805 MiB.

O teto diagnóstico da Colunata continua em 112 registros/400 faces UV. O máximo atual é 107/399 na peça vestida isolada, contra 107/391 antes. No altar vestido 7×2, são 698 registros e 2.466 faces, média 49,86/176,14 por módulo; antes, 614/2.178, média 43,86/155,57. Esses números medem a geometria emitida antes de culling/batching, não o tempo de GPU. Os outros modelos mantêm o teto interno de 50 cubos.

A política diagnóstica de GEOMETRY 501 é a mesma da [0.8.1](COLONNADE_REBUILD_0.8.1.md): os avisos de complexidade são mantidos no relatório oficial e conferidos por código, mensagem, caminho, contagem real e orçamento. Erros e qualquer outro aviso continuam reprovando o pacote. O desempenho no Minecraft continua um gate físico.

## Verificação

Os testes conferem a casca octogonal fechada em todos os 16 contornos e nas quatro direções; unicidade dos eixos e um apoio por quina; continuidade vertical das três peças; contenção da seção nas superfícies de apoio; estrutura invariante ao tecido; cotas, UVs, limites laterais e custo da montagem 7×2.

`verify-colonnade-detail.mjs` compara o arquivo final com 0.8.1. Admite apenas manifests/versão, idiomas/versão, geometria da Colunata e os mapas de cor/normal dos fustes. Nenhum arquivo distribuído pode ser acrescentado ou removido. Todas as definições de bloco e os demais recursos devem permanecer byte a byte iguais.

A comparação usa as capturas 0.8.1 existentes como baseline: sem toalha 3×2, renda 7×2 e renda 1×1; frente, oblíqua, canto e detalhe; classic/PBR; 1600×1000. São 24 pares, com câmera/preset idênticos e hashes confrontados aos respectivos releases. Mais oito vistas de trás/superior cobrem 8×2 e 16×2.

```text
npm run check
npm run package
node tools/verify-colonnade-detail.mjs
node tools/verify-baseline.mjs
node tools/verify-world-compatibility.mjs dist/releases/Altare-0.8.1.mcaddon
node tools/verify-captures.mjs out/colonnade-after-0.8.2 out/colonnade-extra-0.8.2
node tools/compare-structures.mjs out/colonnade-after-0.8.1 out/colonnade-after-0.8.2
```

[Pacote](../dist/releases/Altare-0.8.2.mcaddon) · [Validação oficial](../dist/validation/0.8.2/release-summary.json) · [Auditoria](../dist/validation/0.8.2/colonnade-detail.json) · [Comparação](../out/colonnade-comparison-0.8.2/index.html).

## Resultado do pacote

69 testes Altare passaram. A validação oficial registrou zero erros, 22 avisos de complexidade GEOMETRY 501 dentro da política existente e zero avisos inesperados. Pacote: 11.180.197 bytes, 1.034 arquivos; SHA-256 `be1e3c5d82ea5368312ab6aef0e022a2cc341fdec3609809175e83ba12424993`.

A auditoria encontrou 996 arquivos anteriores idênticos, 38 mudanças permitidas e nenhum arquivo novo. Todos os 225 blocos mantêm seus contratos; as 32 capturas atuais correspondem aos bytes do release e os 24 pares têm câmeras idênticas. A regressão clássica conserva 89 arquivos da 0.2.1. Check da raiz aprovado: 107 testes Aspergillum e 75 do viewer, documentação e validações. Relatórios em `dist/validation/0.8.2/`.

Build do viewer e smokes do Workbench e do estúdio compilado aprovados. Estúdio 1.8.2 com miniaturas atualizadas, sete modelos e exportação PNG/JSON conferida. Render de detalhe 1920×1080 em `out/altar-renders/colonnade-detail-0.8.2/`. Esses resultados não substituem a validação dentro do jogo.

## Reteste no Minecraft

Importar o arquivo exato 0.8.2 em uma cópia do mundo, sem outra revisão Altare concorrente. Em 7×2 e 1×1, alternar renda e conferir a coluna única das quatro quinas, os degraus de base/capitel e as caneluras. Olhar também por baixo dos remates e de perto, em gráficos clássicos e nos modos usados pelos jogadores.

Repetir em 8×2 e 16×2; quebrar/recompor uma extremidade e salvar/reabrir. Aplicar com vasos e blocos sobre o tampo: devem manter posição e apoio em y+1. Comparar fluidez com 0.8.1 no mesmo mundo/aparelho/configuração, também com vários altares. Esperado no Content Log: nenhum novo erro de geometria/material, state desconhecido ou rollback no uso normal.

As capturas e o estúdio são diagnósticos externos. Aparência, apoio e desempenho no Minecraft continuam pendentes do usuário.
