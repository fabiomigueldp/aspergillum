# Colunata — encaixe do linho e da renda 0.8.3

Revisão de 31/10/2026 sobre 0.8.2. Acabamentos existentes da Colunata: sem tecido e linho com renda branca. A revisão trata dos encontros entre o tampo, a dobra de borda, a renda e as quinas; conserva a estrutura octogonal e seus apoios.

## Problemas reproduzidos e correção

Na 0.8.2, a face superior da dobra terminava em y=16 e sobrepunha a cobertura de linho na mesma altura. Os retornos das dobras também se cruzavam nos cantos. A faixa diagonal de fechamento atravessava o encontro das duas faces da renda em vez de ligá-las pelas extremidades. Quatro testes geométricos novos reproduziram essas falhas antes da correção.

Agora o linho é a única cobertura superior, a y=16. Sua projeção termina em ±8,38 unidades no perímetro externo, cobrindo a dobra. A dobra vai de y=15,84 até a face inferior do linho, 15,91, e não emite a tampa escondida nesse contato. As faces verticais se encontram por uma aresta, sem compartilhar área coplanar. Nenhum tecido invade a célula acima.

Os retornos norte/sul recebem os cantos; os retornos leste/oeste terminam contra eles. O lado inferior e as pontas externas visíveis continuam fechados. As quinas não têm volumes sobrepostos. A renda acompanha uma ondulação mais suave e suas pontas ligam-se a uma pequena costura diagonal de linho. A costura termina na altura da mesma fase da bainha, sem esticar uma coluna do desenho da renda.

As cotas da cobertura, dobra, caimento e bainha estão em `assets-src/atelier/colonnade-textile.mjs`. A pintura e a geometria usam o mesmo perfil. `colonnade-model.mjs` compõe a arquitetura e o tecido sem alterar a geometria da versão sem toalha.

## Compatibilidade

Mesmos IDs, UUIDs, estados/defaults, definições de bloco, colisões, apoio e runtime. Os recursos dos demais altares, todas as texturas e todas as geometrias sem renda da Colunata devem permanecer byte a byte iguais à 0.8.2. Não há mapas, materiais ou estados adicionais. Aspergillum permanece 1.2.5.

O tampo mantém y+1 livre e sua cobertura é contínua nas células vizinhas. O tecido fica fora da envoltória da pedra, incluindo a cornija e os capitéis. A troca temporária para Colunata conserva os rascunhos de tecido, cor, relevo e material dos demais modelos; o teste cobre os acabamentos publicados e os cinco modos de toalha clássicos.

O catálogo continua com 225 blocos, 224 acabamentos, 560 geometrias e 55.760 combinações no Altare. São os mesmos 72 conjuntos/160 PNGs únicos, 34.582.528 bytes RGBA antes de mipmaps/ícones. O teto da Colunata permanece 112 registros/400 faces; o máximo vestido continua 107/399. A política dos avisos GEOMETRY 501 é preservada; desempenho nativo continua um gate físico.

## Evidências

Os testes conferem o encontro vertical entre cobertura/dobra, retornos sem interseção de volume, ligação exata da costura às duas faces da renda, terminação na bainha, afastamento da pedra e cobertura contínua. Matrizes 1×1, 1×8, 16×1, 3×2, 7×2, 2×7, 8×2 e 16×8; todos os 16 contornos e quatro direções. Os testes anteriores continuam verificando estrutura, UVs e perfis de coluna.

A comparação reutiliza as capturas 0.8.2 como baseline. São 24 pares, mesmos três conjuntos sem toalha 3×2, renda 7×2 e renda 1×1, quatro vistas e dois perfis de material, 1600×1000. Mais oito vistas de trás/superior cobrem 8×2 e 16×2. O comparador abre uma vista que mudou; os dois lados são conferidos contra os respectivos arquivos de release.

```text
npm run package
node tools/verify-colonnade-cloth.mjs
node tools/verify-world-compatibility.mjs dist/releases/Altare-0.8.2.mcaddon
node tools/verify-baseline.mjs
node tools/verify-captures.mjs out/colonnade-after-0.8.3 out/colonnade-extra-0.8.3
node tools/compare-structures.mjs out/colonnade-after-0.8.2 out/colonnade-after-0.8.3
```

[Pacote](../dist/releases/Altare-0.8.3.mcaddon) · [Validação](../dist/validation/0.8.3/release-summary.json) · [Auditoria](../dist/validation/0.8.3/colonnade-cloth.json) · [Antes/depois](../out/colonnade-comparison-0.8.3/index.html).

## Resultado do pacote

74 testes Altare passaram. O Creator Tools registrou zero erros, os mesmos 22 avisos GEOMETRY 501 dentro da política existente e zero avisos inesperados. Arquivo final: 11.178.614 bytes, 1.034 arquivos; SHA-256 `79cb5bd0dc668d849fe30b76571fc7324230c24ade55bcc3017f779f630e11e7`.

A auditoria contra 0.8.2 confirmou 1.013 arquivos anteriores idênticos e 21 alterações permitidas: 15 geometrias com renda e seis arquivos de versão/idioma. Nenhum arquivo novo. Todas as texturas, geometrias sem renda, definições dos 225 blocos e runtime são idênticos. As 32 capturas atuais correspondem aos bytes do release; os 24 pares têm câmera idêntica, com a quina da renda como vista inicial. A regressão clássica preserva 89 arquivos da 0.2.1. Check da raiz aprovado: 107 testes Aspergillum, 75 do viewer, documentação e validações.

Build do viewer e smokes do Workbench e do estúdio compilado aprovados. Estúdio 1.8.3 com miniaturas atualizadas, quatro ambientes e PNG/JSON conferidos. Render de detalhe 1920×1080 com os vasos da composição de apresentação: `out/altar-renders/colonnade-cloth-0.8.3/`. Essa montagem verifica a representação externa, não a colocação física no jogo.

## Reteste no Minecraft

Importar o arquivo exato 0.8.3, BP/RP [0,8,3], em uma cópia do mundo e sem revisão Altare concorrente. Montar 7×2 e 1×1, alternar renda e observar o tampo e as quinas de perto, por cima, de lado e em movimento. Não deve haver cintilação nas bordas, fresta persistente, tecido atravessando a pedra ou tira de renda deformada no canto.

Repetir em 8×2 e em uma mesa estreita, nas quatro orientações e nos modos gráficos usados pelo grupo. Quebrar/recompor um canto, salvar/reabrir e conferir o contorno. Aplicar com vasos e blocos apoiados: posição e apoio em y+1 devem permanecer. Alternar para outro modelo e voltar, conferindo o rascunho da toalha anterior. Content Log esperado: nenhum novo erro de geometria/material, state desconhecido ou rollback no uso normal. Conferir fluidez com vários altares no mesmo aparelho/configuração.

As capturas externas não confirmam o shader, o cache nem o comportamento de outros add-ons no Minecraft. A aceitação final no jogo continua pendente do usuário.
