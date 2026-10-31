# Frontal de Guadalupe: composição e produção

Referência prioritária: **sete blocos de largura, um de altura**. A imagem ampliada enviada pelo usuário orienta os elementos; sua procedência documental não foi inferida. A saída é um diagnóstico de implementação e arte, com validação final dentro do Bedrock ainda pendente.

## Programa visual e adaptação

A frente vista pelo observador é composta assim:

```text
7 módulos: [lua] [arabescos] [duas figuras] [Chi-Rho] [duas figuras] [arabescos] [sol]
5 módulos: [lua]            [duas figuras] [Chi-Rho] [duas figuras]            [sol]
3 módulos: [lua + figuras]                [Chi-Rho]                 [figuras + sol]
```

Larguras pares dividem somente o centro em duas células, com a mesma dimensão física do medalhão ímpar. Três/quatro blocos usam agrupamentos compactos, sem esmagar os círculos ou os seres alados. Um/dois blocos priorizam o monograma e o fundo: não há promessa de mostrar todo o programa legivelmente nesse espaço mínimo. De cinco a dezesseis, os motivos principais mantêm tamanho físico e os intervalos de folhagem acomodam a extensão. O formulário existente recompõe isso de uma vez; não há edição manual de cada trecho.

Os retratos laterais deixam de ser rosetas genéricas: lua com perfil, estrelas e borda flamejante; sol com face, raios, estrelas e ondas. As quatro figuras em esmalte escuro aparecem em dois pares. O centro tem tesselas vermelhas, raios dourados e moldura de contas. O fundo fica menos contrastado para preservar a hierarquia dos símbolos.

## Papéis persistidos

| Valor | Papel |
| --- | --- |
| 0 | sem frontal |
| 1 | fundo contínuo de arabescos |
| 2 | centro inteiro |
| 3 | primeira metade no percurso local; direita para o observador |
| 4 | segunda metade no percurso local; esquerda para o observador |
| 5 | roseta legada, para preservar mundos anteriores |
| 6 | lua |
| 7 | sol |
| 8 | par de figuras à esquerda |
| 9 | par de figuras à direita |
| 10 | lua e figuras, agrupamento compacto esquerdo |
| 11 | figuras e sol, agrupamento compacto direito |

`src/domain/frontal-layout.ts` decide os valores sem Minecraft API. `surface.ts` aplica o resultado apenas à face exposta escolhida. Todos os locks, comparação tardia de estados, cancelamentos e rollback continuam no mesmo caminho de aplicação. A extensão dos valores é documentada em [migração](MIGRATION_0.2.1.md); não há troca do identificador do bloco nem novos registros de entidades.

## Fonte e compilador de materiais

O arquivo [reference-plates-v1.png](../assets-src/guadalupe/reference-plates-v1.png) é a saída original da ferramenta image_gen, 1536×1024, seis células quadradas de 512 pixels. A [proveniência e o prompt integral](../assets-src/guadalupe/SOURCE.md) acompanham a fonte. O gerador não modifica esse PNG e não usa a imagem final de captura como textura.

`panels.mjs` amostra as placas por coordenadas normalizadas e monta um domínio físico de **128×84** unidades de arte. Os motivos usam escala igual em X/Y nesse domínio. O corpo geométrico tem 16×10,5 unidades; ambas as relações são 8 unidades de arte por unidade de modelo. A imagem distribuída 256×256 tem proporção diferente, mas o UV percorre a imagem inteira e reconverte para esse domínio: a diferença de densidade de pixels não distorce o círculo físico.

O fundo preserva seu desenho central; somente os 7,5% próximos a cada extremidade se misturam com a borda oposta. A função coincide em cor e derivada na emenda. O mesmo fundo e a mesma fase aparecem sob todos os papéis. Os recortes dos motivos têm transição suave; não trazem a moldura quadrada de registro da prancha. O teste de centro par usa os mesmos pixels lógicos de ambos os lados da emenda.

A cor guarda a maior parte da leitura. Máscaras cromáticas distinguem ouro, prata, esmalte e fundo; esmalte é não metálico e nenhum canal emite luz. O normal é derivado de um relevo pequeno e limitado, com passo físico corrigido por eixo. Isso é uma interpretação material, não um escaneamento PBR medido. A documentação da Microsoft confirma que a camada color é usada no modo clássico e descreve as camadas normal/MER: [Texture Sets](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/texturesetsreference/texturesetsconcepts/texturesetsintroduction?view=minecraft-bedrock-stable).

Todos os papéis novos compartilham 256×256, mantendo a mesma densidade de amostragem nas emendas; somente a roseta legada permanece em 256×128. A candidata interna 0.2.0 usava 512×256 e foi rejeitada pelo limite de 256 KiB por camada do atlas no Creator Tools. A 0.2.1 respeita esse limite. Nas bordas, as derivadas do normal usam a continuação da função de superfície, inclusive a metade vizinha do centro, em vez de buscar o extremo oposto do mesmo tile. A amostragem fica centrada nos pixels do domínio físico.

## Construção e custo

O painel recebe barras superior/inferior em geometria e fechamentos laterais somente nas duas pontas. Isso evita uma moldura vertical repetida a cada bloco. As faces frontais das barras ficam 0,17 unidade à frente do painel; a colisão continua sendo a célula original e a cota de apoio continua 16. As folhas, tesselas e relevos dos seres são materiais, não cubos individuais.

| Recurso | 0.2.1 |
| --- | --- |
| Modelos | 8, duas quedas × quatro frentes |
| Cubos por modelo, incluindo ocultos | 48; teto 50 |
| Conjuntos de materiais | 20 |
| PNGs de materiais | 60, todos opacos |
| Mapas decodificados RGBA | 12.386.304 bytes = 11,8125 MiB, antes de mipmaps/ícones |
| Limite automatizado de mapas | 12 MiB no total; 256 KiB por camada |
| Combinações de estados | 11.520 |
| Operação por tick | a mesma reconciliação local anterior |

Os dados não comprovam FPS ou uso real de VRAM. Os [limites de permutações documentados](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockstatesandpermutations?view=minecraft-bedrock-stable) são compartilhados com outros add-ons; não se afirma orçamento ilimitado. Não foi adotada API beta ou feature experimental para fazer o frontal.

## Evidência e aceitação

Os testes cobrem larguras 1–16, posição dos motivos nas quatro direções, centro par, emenda do fundo, distinção material do esmalte, exatamente dois fechamentos de moldura, limites geométricos e proteção do tampo. As capturas usam geometria e materiais distribuídos; a interface de diagnóstico distingue com/sem mapas PBR, sem afirmar equivalência de shader ao Minecraft.

No jogo, reaplicar o acabamento a um altar 7×2 existente, confirmar a ordem dos motivos, orbitar e verificar os objetos apoiados. Repetir em 8×2 e 3×2, salvar/reabrir e conferir Content Log. Toalha longa cobre parte do frontal intencionalmente; para a referência, usar a curta. Os demais critérios estão em [TESTING.md](TESTING.md).
