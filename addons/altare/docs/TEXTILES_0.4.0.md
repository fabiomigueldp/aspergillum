# Toalhas e cores — contrato da 0.4.0

Objetivo autorizado: polir tecido, contornos e detalhes e oferecer cores litúrgicas nos modelos compatíveis. Critério de aceitação: fonte artística revisável, ouro/flores preservados na troca de cor, festão e bainha coincidentes, tampo branco em y=16, centro par/ímpar nas quatro direções, IDs anteriores preservados, teste de conversão/rollback, orçamento conjunto com Aspergillum, capturas e pacote oficial sem erros/avisos. Aprovação dentro do Minecraft pertence ao usuário.

A família floral IHS recebe branco, vermelho, verde, roxo, róseo, preto, dourado e prateado festivos nas três estruturas e três materiais, sem aplique adicional no corpo. O IHS bordado permanece central. Os demais temas e apliques da coleção anterior continuam disponíveis nas suas combinações originais. Não se aplicam cores indiscriminadamente a imagens figurativas ou metais.

Referência: [IGMR 304 e 346, edição com adaptações dos EUA](https://www.vatican.va/roman_curia/congregations/ccdds/documents/rc_con_ccdds_doc_20030317_ordinamento-messale_en.html). Seis cores usuais; ouro/prata são escolhas festivas cuja disciplina depende do lugar. A cobertura superior permanece branca. A interface é uma escolha artística, não calendário ou decisão litúrgica automática. Azul não é apresentado como cor universal.

A base vermelha reutiliza IDs da 0.3.0. As outras sete cores acrescentam 63 IDs com 112 estados cada. O codec registra 16 contornos de repetição e 12 combinações de contorno/centro necessárias aos retângulos, em duas parcelas (7×4), mais quatro direções. Totais verificados: 53.136 estados Altare + 9.744 Aspergillum = 62.880, abaixo do orçamento compartilhado de 65.536. A reserva de 2.656 não cobre automaticamente quaisquer outros packs. Tabela persistente e limites de downgrade: [MIGRATION_0.4.0.md](MIGRATION_0.4.0.md).

O estado 0 é um módulo isolado sem centro. Ao quebrar um vizinho, um papel central incompatível com o novo contorno volta à repetição; reaplicar acabamento recentraliza. A forma compacta só pertence aos novos IDs e não reinterpreta states publicados.

Os 28 color maps das sete cores novas compartilham os mesmos quatro normais e quatro MER do floral vermelho. A máscara atua somente no fundo do tecido, com transição nos pixels de antialiasing. Ouro e flores opacos são preservados; alpha e mapas de relevo/MER são idênticos entre as oito cores. Total: 66 texture sets, 142 PNGs e 33.292.288 bytes (31,75 MiB) RGBA únicos, excluindo ícones/mipmaps. O teto de 32 MiB é verificado pelo build; nova arte não deve simplesmente multiplicar mapas ou states.

## Tecido e encontros

A fonte [embroidery-plates-v2.png](../assets-src/atelier/embroidery-plates-v2.png) substitui v1 na coleção arquitetônica. [SOURCE_V2.md](../assets-src/atelier/SOURCE_V2.md) registra o prompt integral, ferramenta e SHA256. A compilação recorta a arte, reconstrói a transparência do festão e produz os mapas a partir da fonte; nenhum PNG distribuído foi retocado manualmente.

A cobertura superior usa uma lâmina branca de 0,09 unidade de modelo sobre tampo estrutural separado, terminando exatamente em y=16. As quedas têm facetas menos pronunciadas e espessura 0,05; encontros externos usam uma tira inclinada fina. Bainha e cordão acompanham a mesma curva de recorte, com relevo de fios e contraste próprio. O tecido permanece estático, sem solver por tick ou entidades auxiliares.

A espessura decorativa não muda o apoio do tampo, que continua na altura de um bloco. Normais, metal e rugosidade enriquecem a apresentação quando o renderizador usa PBR; silhueta, desenho e cor não dependem de PBR. As faces cortadas do festão usam alpha binário. A exigência de até 50 cubos por geometria permanece.

## Aceitação e evidências

Testes de domínio cobrem todas as cores, três estruturas/materiais, larguras 1–16, profundidades 1–2, quatro direções, centros pares/ímpares e reconciliação de contorno. Testes de textura verificam máscara, proteção de bordado, compartilhamento dos mapas e espessura do tampo. A validação estrutural enumera as 53.136 permutações do catálogo.

As matrizes reproduzíveis são [paleta](../out/palette-0.4.0/index.html), [coleção](../out/collection-0.4.0/index.html) e [Guadalupe](../out/legacy-0.4.0/index.html): 104 vistas, com materiais/modelos reais. Inspeção no capturador é diagnóstico offline; não prova equivalência com Bedrock. Artefato exato, verificações executadas e pendências no jogo: [RELEASE_0.4.0.md](RELEASE_0.4.0.md).
