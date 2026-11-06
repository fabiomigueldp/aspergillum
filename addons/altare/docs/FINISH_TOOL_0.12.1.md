# Ferramenta de acabamento — 0.12.1

## Direção visual

A ferramenta `altare:finish_tool` abre o editor do altar. A arte anterior resumia uma amostra de tecido e uma agulha a duas áreas chapadas. A nova fonte `assets-src/finish-tool.mjs` preserva essa metáfora: três amostras sobrepostas em verde, bordô e linho, bainha dourada, pequena cruz bordada e agulha de latão com olho, bisel e ponta. As amostras representam possibilidades de acabamento, não mudam automaticamente a cor litúrgica do altar.

A silhueta tem contorno escuro e iluminação superior esquerda; borda dobrada, sombras entre amostras e poucos pontos de trama distinguem materiais sem ruído. O desenho foi autorado em pixels inteiros na resolução nativa de **32×32**, sem suavização ou dependência de PBR. O PNG distribuído é gerado, nunca retocado manualmente. A identidade é a do próprio catálogo Altare, sem nova referência figurativa externa.

## Escopo e custo

- Mesmo identificador, atlas, nome localizado, tamanho da pilha e definição de item.
- Mesma resolução e memória RGBA decodificada: 4.096 bytes.
- Nenhuma geometria, attachable, estado, comportamento, migração ou tick adicional.
- Demais texturas e modelos permanecem byte-idênticos; versões dos manifests e metadados passam a 0.12.1.

## Verificação

Os testes verificam geração determinística, dimensão, paleta explícita, alpha binário, margem transparente e conectividade da silhueta. Pontos de material protegem linho, bordô, verde, ouro e olho da agulha. O validador compara os bytes do PNG distribuído com a fonte geradora.

Inspeção visual de antes/depois em 32, 64 e 192 px, com ampliação por vizinho mais próximo, sobre fundos escuro e claro. Essa prancha inspeciona o asset, não simula iluminação/escala da mão nem comprova renderização Bedrock.

## Reteste no Minecraft

Importar somente o pacote **Altare-0.12.1.mcaddon**, sem pack anterior/cache concorrente. Obter `/give @s altare:finish_tool` ou usar `/function altare/dev_kit`.

1. Conferir inventário e hotbar, com slot selecionado e não selecionado e nas escalas de UI disponíveis: distinguir as amostras, a agulha diagonal e o contorno, sem fundo opaco ou franja.
2. Conferir item na mão em primeira e terceira pessoa e item dropado, com gráficos convencionais e Vibrant Visuals quando disponível. Não há novo modelo 3D; a apresentação continua a do item sprite.
3. Usar em um altar, alterar acabamento, Aplicar e Cancelar: o fluxo existente deve permanecer igual.
4. Conferir Content Log sem novos erros de textura, atlas ou item e registrar hash do pacote importado.

Importação, inspeção física e Content Log continuam **pendentes** até teste no jogo. Os testes automatizados não substituem esse gate.

## Evidência automatizada desta revisão

- `npm --prefix addons/altare run check`: aprovado, 142 testes.
- `npm run check`: aprovado, 123 testes do Aspergillum e 101 do viewer. Os outputs de áudio regenerados pela ferramenta foram restaurados à baseline para manter o escopo; `npm run validate:audio` aprovado novamente.
- Comparação dos arquivos dos pacotes 0.12.0 e 0.12.1: os mesmos 4.780 caminhos; apenas sete arquivos mudaram (ícone, dois manifests e quatro textos com versão). Item JSON, runtime, blocos, modelos e demais texturas byte-idênticos.
- Empacotamento gerou `Altare-0.12.1.mcaddon`, SHA-256 `07a6f00e5831fb552f4f7ca2652777c67853d29a6eb01b475d156f802620f18e`.
- **Validação oficial aprovada:** Creator Tools 0.17.7 concluiu com código 0, zero erros e zero avisos inesperados. Os 2.084 avisos GEOMETRY 501 das geometrias inalteradas são aceitos pela política existente, sem relaxamento. Consultas npm das APIs retornaram HTTP 502, sem falha estrutural.
- A primeira execução caiu no fallback obsoleto `1.26.0` e rejeitou os formatos `1.26.30` existentes. A repetição usou o fluxo já documentado, `HOME=<diretório temporário gravável> MCT_TEST_PINNED_MC_VERSION=1.26.60.5 node addons/altare/tools/package.mjs`, com a versão oficial da Mojang verificada nas revisões anteriores. Nenhum teste foi excluído, erro reclassificado ou formato reduzido. O hash do pacote não mudou entre as execuções. Importação e Content Log nativos permanecem pendentes.
