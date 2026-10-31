# Evolução orientada por evidência

## 0.11.2: chanfros de Ogivas

Perfil de abertura com mitras reais, rotação composta correta e relevos ajustados ao campo recuado. Mesmos recursos e custo geométrico; testes independentes de profundidade e preservação dos tecidos. [Evidência e gate nativo](OGIVE_DETAIL_0.11.2.md).

## 0.11.1: abertura do editor

Corrige o binding das listas fixas e reproduz a rejeição de observáveis somente de leitura nos testes. Preserva contratos de mundo e a árvore visual 0.11.0; abertura, aplicação e Content Log aguardam reteste do arquivo final. [Causa e gate](EDITOR_FIX_0.11.1.md).

## 0.11.0: reconstrução de Ogivas

Arcada cega com curva coerente, intradorso e pilares compartilhados; laterais, perfis contínuos e relevos dimensionados sob o teto ogival. Dez tecidos e três materiais, sem novos estados/IDs. A máscara compartilha PBR com o material existente; recorte, sombras em movimento e custo nativo exigem importação/profiling. [Contrato e evidência](OGIVE_REBUILD_0.11.0.md).

## 0.10.1: polimento dos perfis de Pilastras

Biséis reais das molduras, encontros diagonais fechados, apoios com proporções revistas e chanfros mais legíveis. Sem expansão do catálogo ou do custo geométrico. [Evidência e gate nativo](PILASTER_DETAIL_0.10.1.md).

## 0.10.0: construção de Pilastras

Painéis e apoios ritmados por módulo, fustes chanfrados e perfis com profundidade real. Mesmo corpo sob todos os tecidos, apoio correto dos relevos e veios da madeira orientados. Sem novos estados/texturas. O gate restante é a importação exata, Content Log e profiling, inclusive pelo custo dos contornos compilados. [Contrato e QA](PILASTERS_0.10.0.md).

## 0.9.0: tecidos universais e migração explícita

Coleção comum nos sete modelos, renda redesenhada, construtor compartilhado de caimento e editor com um seletor. Clássico aceita bordados/renda junto a Guadalupe; Colunata recebe todas as toalhas. 172 IDs aditivos e poses compactas preservam os registros antigos. A referência global de estados é excedida sob exceção diagnóstica, com profiling pendente; uma futura redução exige migração de mundo ou distribuição modular explícita. [Contrato e gates](UNIVERSAL_TEXTILES_0.9.0.md).


## 0.8.3: encaixe entre arquitetura e tecido

Perfil comum para cobertura, dobra, renda e bainha. Superfície superior única, retornos sem sobreposição e costura de quina ligada às duas faces. [Contrato e gates](COLONNADE_CLOTH_0.8.3.md).


## 0.8.2: perfis e apoios da colunata

Fustes octogonais, quinas com uma coluna, bases/capitéis em três níveis e caneluras interrompidas antes dos colares. Mesmos contratos e limites diagnósticos. [Construção e gates](COLONNADE_DETAIL_0.8.2.md).


## 0.8.1: reconstrução da colunata

Painéis recuados, molduras em volume, colunas facetadas e perfis de base/cornija. Complexidade controlada e comparação entre arquivos, sem novos estados ou runtime. [Contrato e reteste](COLONNADE_REBUILD_0.8.1.md).

## 0.7.1: refinamento da colunata

Capitéis escalonados, retornos de arquitrave, caneluras e renda curva, sem novos estados. [Comparação e reteste](COLONNADE_POLISH_0.7.1.md). A aceitação dentro do Minecraft permanece pendente.

## 0.7.0: Colunata dourada

Mármore claro, painéis emoldurados, colunas e renda branca vazada, com codec simétrico de 32 combinações. [Contrato e reteste](COLONNADE_0.7.0.md). O foco é construção no Criativo. A redução do catálogo antigo permanece uma migração futura explícita; a referência de permutações é um controle de desempenho, não um limite de crafts.

## 0.6.1: Arca e Balaústres

Duas famílias de marcenaria implementadas, com veios orientados, apoios por módulo e encontros de travessas adaptados ao contorno. [Critérios e limites](JOINERY_0.6.1.md). Reteste físico pendente. O orçamento conjunto conhecido chegou a 65.472: antes de outra coleção, planejar distribuição modular ou migração explícita; não ampliar o produto cartesiano atual.

## 0.5.0: organização antes de expansão

O editor reúne as escolhas numa tela e compartilha capacidades com o estúdio. Rubi/paleta passam a um desenho Floral IHS. As ogivas conservam a arquitetura ao trocar tecidos. A biblioteca e os orçamentos publicados não crescem. [Contrato e limites](CUSTOMIZATION_0.5.0.md). Próxima expansão: comprimento de queda independente, novos relevos e apoios adaptativos, somente com orçamento de estados e compatibilidade definidos.

## 0.4.2: colisão corrigida e estruturas refinadas; reteste físico pendente

O pedido de novas estruturas e as oito referências autorizam esta iteração diagnóstica. Três estruturas, três materiais, quatro tecidos ornamentados/sem toalha e três opções de aplique formam 135 receitas. Pilastras, ogivas, pés, travessas e apliques possuem volume; os festões são recortes alpha-test sobre quedas facetadas estáticas. Guadalupe permanece na coleção clássica.

A 0.4.0 acrescenta a família Floral IHS em oito cores, refina fonte/bainha/espessura/dobras/cantos e adiciona um codec de contorno compacto. As opções de paleta usam três estruturas e três materiais, sem aplique extra; as demais receitas continuam disponíveis.

Validar primeiro 7×2, depois centro par em 8×2, 3×2 e 1×1. Trocar famílias com blocos/vasos apoiados; conferir as quatro frentes, colisão multipartes da mesa, persistência, multiplayer e Content Log. Capturas e validação oficial não equivalem à aceitação dentro do jogo. As revisões 0.1.3/0.2.1 continuam documentadas como histórico, sem aprovação física inferida.

A 0.4.1 acrescenta inspeção aproximada e corrige superposição de desenhos, deformação da faixa verde, frestas nas facetas e resposta PBR do bordado prateado. A arte-fonte v2 é preservada; o compilador e os encontros geométricos são corrigidos sem aumentar catálogo, estados, cubos ou mapas. [Diagnóstico](CLOTH_POLISH_0.4.1.md).

O retorno da 0.4.1 confirmou a rejeição das colisões `min/max`, impedindo o registro dos cavaletes. A 0.4.2 corrige para `origin/size`, prepara as permutações antes de escrever e preserva a causa no log. Cavaletes recebem sapatas/montantes/cabeçotes/escoras conectados, ogivas ganham profundidade/impostas/fecho, e pilastras têm bases/capitéis definidos. Texturas, toalhas, IDs e states permanecem. [Evidência](STRUCTURES_0.4.2.md).

## Próximo polimento, guiado pelo retorno

Medir legibilidade dos bordados e símbolos a 1/4/8 blocos, mipmaps, normal/MER, cortes dos festões e cantos no renderizador real. Revisar contraste, profundidade dos arcos e os apoios da mesa conforme as capturas. A toalha tem queda fixa por tema; perfis de comprimentos independentes e pernas intermediárias adaptativas exigem outro orçamento/contrato.

A paleta compartilha normais/MER e reserva o orçamento conjunto com Aspergillum. O código compacto pode servir a futuras famílias, mas cada uma precisa de identidade, compatibilidade de máscara, revisão de contorno e orçamento próprio. Não recolorir iconografia indiscriminadamente.

Antes de ampliar a biblioteca, revisar os 53.136 estados possíveis, 31,75 MiB de mapas únicos e impacto em mundos com outros add-ons. Medir multiplayer/mobile. Renda fio a fio, franjas articuladas e malhas curvas precisam de diagnóstico próprio. A arte de Guadalupe continua sendo interpretação de referências, não escaneamento certificado.

## Ferramentas de construção

Converter um retângulo vanilla exige prévia, lista de blocos substituíveis, recusa de contêineres e rollback. Não apagar carpete/vasos silenciosamente. A conversão implementada na 0.3.0 opera exclusivamente entre módulos reconhecidos do Altare.

Ampliar para L, recortes, cantos internos e curvas com um compilador de contorno e testes topológicos. Tamanhos inteiros mantêm apoio nativo. Altura fracionária exige escolher entre apoio visual aproximado, objetos acomodados próprios ou slots internos; não prometer alinhamento arbitrário de blocos externos.

## Vasos e organização

Inventariar IDs, formatos e comportamento dos cálices, âmbulas e demais vasos usados pelo usuário. Testar os já colocáveis. Para itens de inventário, adaptar famílias explicitamente, preservando metadados sem interceptação genérica. Mais de um objeto por célula exige provar recuperação em quebra, explosão, chunks, reload, inventário cheio e concorrência.

## Produção

Receitas/economia, permissões/claims, controle/toque e profiling com muitos altares ainda precisam de implementação ou evidência. Medir no dispositivo mais limitado antes de fixar orçamento temporal. Promover para mundos persistentes somente após registrar os gates físicos e manter um plano de atualização/downgrade.
