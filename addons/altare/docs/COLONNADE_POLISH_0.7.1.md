# Colunata e renda — polimento 0.7.1

Revisão de 31/10/2026 sobre a 0.7.0. Mantém os mesmos modelos selecionáveis, os dois acabamentos da colunata, os IDs, os estados, as colisões e a cota de apoio. O trabalho é de geometria e superfície, com capturas controladas antes/depois.

## Arquitetura

Os capitéis deixam de ser uma caixa única: recebem colo e ábaco em dois níveis. Nos cantos, as duas faces compartilham um capitel; isso permite refinar o perfil sem multiplicar volumes coincidentes. Uma faixa de arquitrave liga os apoios ao tampo. As faixas das faces norte/sul recebem os retornos; as das faces leste/oeste terminam contra elas. As junções internas continuam até a borda do módulo, conservando a continuidade em altares compridos.

Os fustes usam um novo mapa de caneluras rasas, com resposta fosca e perfil periódico nas quatro faces. São detalhes em cor/normal/MER; a seção geométrica continua prismática. As tampas dos fustes e o topo oculto dos colos são omitidos quando a peça seguinte cobre a área. A estrutura permanece igual com e sem toalha.

As molduras dos painéis recebem perfil de relevo e contraste de bisel mais legíveis. O douramento tem variação suave e periódica, evitando ruído forte e descontinuidade nos mapas. A renda recebe bainha curva, treliça e flores mais encorpadas; preserva vazados, domínio periódico, escala física e alpha binário.

## Compatibilidade e orçamento

- 225 blocos, 224 acabamentos e 560 geometrias, com os mesmos 55.760 estados combinados do Altare e 65.504 no conjunto local Altare/Aspergillum.
- A célula isolada da colunata vestida usa 48 cubos, contra 44 antes; o máximo global do catálogo continua 50. O tampo permanece em y=16.
- Um conjunto adicional `ornate_column`, com mapas 64×64, acrescenta 49.152 bytes RGBA. São 71 conjuntos, 157 PNGs e 34.533.376 bytes (32,934 MiB) antes de mipmaps, dentro do teto local de 33 MiB.
- O runtime JavaScript é byte-idêntico à 0.7.0. As definições dos dois blocos da colunata mudam somente pela nova referência de material dos fustes. Estados/defaults, geometria selecionada, colisão, suporte e demais componentes são preservados. Os recursos dos outros modelos não mudam.

As fontes continuam em `assets-src/atelier/ornate.mjs`. Não há edição manual de PNGs, geometrias distribuídas ou artefatos em `dist/`.

## Evidência reproduzível

Antes: `out/colonnade-before-0.7.0/`. Depois: `out/colonnade-after-0.7.1/`. Mesmos três conjuntos: sem toalha 3×2, renda 7×2 e renda 1×1; frente, oblíqua, canto e detalhe; perfis classic/PBR; 1600×1000. São 24 pares. A câmera, preset, vista, dimensões e hashes são conferidos por `compare-structures.mjs`; os dois lados são comparados aos respectivos arquivos `.mcaddon`.

Comandos:

```text
npm run package
node tools/capture.mjs --matrix ornate --presets colonnade-bare-3,colonnade-lace-7,colonnade-lace-1 --views front,oblique,corner,detail --profiles classic,pbr --width 1600 --height 1000 --output out/colonnade-after-0.7.1
node tools/verify-colonnade-polish.mjs
node tools/verify-world-compatibility.mjs dist/releases/Altare-0.7.0.mcaddon
node tools/verify-captures.mjs out/colonnade-after-0.7.1
node tools/compare-structures.mjs out/colonnade-before-0.7.0 out/colonnade-after-0.7.1
```

[Pacote 0.7.1](../dist/releases/Altare-0.7.1.mcaddon) · [Validação oficial](../dist/validation/0.7.1/release-summary.json) · [Comparação](../out/colonnade-comparison-0.7.1/index.html) · [Render em cenário](../../../out/altar-renders/colonnade-0.7.1/index.html).

Resultado da revisão: 58 testes Altare, check da raiz (107 testes Aspergillum/75 viewer), build do viewer, smoke do Workbench e smoke do estúdio compilado passaram. Creator Tools: zero erros e zero avisos. Arquivo final: 11.144.337 bytes, 1.030 arquivos, SHA-256 `75bce77a91e717d6f3d2db2a4067986ed8fc3098fac547c177fc9210708874d0`. A comparação confirmou os 24 pares com câmeras exatamente iguais e hashes dos respectivos releases. A auditoria estrita encontrou 976 arquivos anteriores idênticos, 50 mudanças permitidas e quatro arquivos do novo material; o runtime permaneceu idêntico. Os 225 blocos conservam seus estados/defaults e UUIDs.

## Reteste dentro do Minecraft

Importar o pacote exato, sem revisão concorrente. Em 7×2, alternar a renda e conferir capitéis, faixa sob o tampo, caneluras, bainha e leitura do tecido de perto e na distância normal de jogo. Conferir os cantos em 1×1, as emendas em 8×2 e as faces internas após quebra/recomposição. Aplicar com vasos apoiados: a altura e o apoio devem permanecer. Reabrir o acabamento depois de reload. Esperado no Content Log: nenhum novo erro de material, textura, geometria ou rollback no uso normal.

O renderer externo é diagnóstico; a aceitação visual e o comportamento no Minecraft continuam pendentes do reteste do usuário.
