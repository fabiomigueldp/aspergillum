# Poses compactas — 0.12.0

Altare está em desenvolvimento, sem distribuição pública. Esta revisão troca diretamente o schema dos 135 Atelier e da Mensa por poses visuais, sem camada legada, exportador ou migração. Os cinco arquivos de auditoria de compatibilidade introduzidos anteriormente foram removidos; as propriedades úteis agora são regressões normais do domínio.

## Representação

Uma pose contém contorno, motivo e direção. Quando não há motivo visível, Pilastras, Ogivas e Mensa não precisam guardar uma direção ornamental. Cavaletes mantém as quatro direções porque sua estrutura e UVs dependem delas. As escolhas de tecido, material e aplique continuam no mesmo catálogo e no mesmo editor.

| Grupo | Poses por receita |
| --- | ---: |
| Atelier nu, Pilastras/Ogivas | 16 |
| Atelier nu, Cavaletes | 64 |
| Atelier decorado, Pilastras/Ogivas | 112 |
| Atelier decorado, Cavaletes | 160 |
| Mensa | 368 úteis, 384 registradas × 15 acabamentos |

Os índices são divididos em estados com no máximo 16 valores. Os 16 índices excedentes da Mensa representam explicitamente a pose neutra isolada. Nenhum valor declarado resulta em erro de codec. Atelier soma 16.416 estados; Mensa soma 5.760. O restante do catálogo não mudou.

**Total: 54.528 Altare + 9.744 Aspergillum = 64.272**, reserva de 1.264 diante da referência de 65.536. A redução Altare é de 23.904 estados, aproximadamente 30,5%. Não representa custo de render medido nem reserva para qualquer outro pack.

## Construção e aparência

Quebrar qualquer vizinho lateral conserva o papel central ou meia figura enquanto sua frente permanece exposta. Colocar um módulo cobrindo a própria face frontal remove aquele motivo; retirar depois a cobertura não inventa um novo centro. Reaplicar o acabamento recompõe a composição. Peças novas herdam o acabamento, sem herdar centros.

Materiais, texturas, geometrias autorais, suporte em y=16 e colisões não são redesenhados. O compilador resolve a pose e emite a mesma aparência. Na Mensa, 96 regras geométricas e 180 materiais cobrem os 5.760 estados sem repetir todos os componentes em cada combinação. O compilador compartilha valores de componente idênticos e comprime seus conjuntos de poses em intervalos.

A interface não confunde direções neutras por módulo com acabamentos misturados. Ao abrir por cima, uma frente ornamental existente fornece a direção do conjunto; clicar numa lateral continua escolhendo essa frente.

## Escopo e testes

- Codecs: todos os estados declarados, defaults, aliases e recusa de entradas inválidas.
- Contorno: todas as poses novas × todos os 16 contornos, sem perda de motivo em quebra lateral.
- Composição: todas as 135 receitas em larguras pares/ímpares, quatro frentes e duas profundidades, com round trip e escolhas uniformes no editor.
- Sequências: quebra, serialização de dados, nova quebra, vizinho desconhecido e extensão; não são testes do salvamento Minecraft.
- Compilador: todas as 5.760 combinações Mensa, materiais, visibilidade e geometria comparadas à autoria; validação das 396 receitas e orçamento combinado.
- Interface: aplicar, cancelar, expirar e abrir novamente, sem escrever fora da superfície.

As famílias já compactadas por palette28/classic_textile54 conservam seu comportamento anterior: alguns contornos irregulares ainda fazem o motivo voltar à repetição. Esta etapa não é uma correção universal desses codecs. Sua expansão sem outras mudanças consumiria mais estados; não acrescentamos deduplicação entre identidades ou inferência de escolhas para esconder esse custo.

Teste nativo breve: construir 3×1, aplicar Cordeiro/Cruz ou Guadalupe, quebrar uma lateral e verificar que o centro restante continua visível; repetir em quatro frentes, em 4×1 para metades e em Cavaletes. Cobrir a face decorada, remover a cobertura e reaplicar para recompor. Conferir colisão, tampo e Content Log do arquivo 0.12.0 exato. A validação externa não demonstra paridade de render nem desempenho no Minecraft.

## Verificação desta implementação

O check completo passou com 137 testes, tipos, geração e validação estrutural. Após agrupar componentes, passaram mais dois testes específicos, novo build e validação completa dos arquivos emitidos. Os 101 testes do Studio e a validação de documentação também passaram.

Uma revisão independente comparou as 34.560 poses Atelier e 11.520 combinações Mensa anteriores: nenhuma diferença de geometria visível, UVs, materiais resolvidos ou colisão. Também conferiu abertura por topo/lateral em 24 casos do editor, sem escrita ao cancelar. Essas comparações são geométricas, não capturas ou execução Bedrock.

O agrupamento reduziu os JSONs de blocos da primeira implementação de 168.088.224 para 129.515.499 bytes. Com a mesma formatação, isso ainda é 2,42% acima dos 126.451.369 bytes anteriores; minificados, o crescimento é 1,86%. A economia comprovada é de estados registrados, não uma promessa de FPS ou menor memória total. Texturas e geometrias autorais não mudaram.

O arquivo final `Altare-0.12.0.mcaddon` tem 19.741.721 bytes e SHA-256 `6e9056899dfb4a80ecf01534ac05e1de41a9e224437242143fa2e012715e4384`. Creator Tools 0.17.7 terminou com zero erros, 2.084 avisos conhecidos de complexidade geométrica e zero avisos inesperados. A validação foi fixada ao alvo 1.26.40 com `MCT_TEST_PINNED_MC_VERSION`, opção do próprio validador, porque a consulta remota de versões retornou HTTP 502 e usou fallback antigo na tentativa anterior. Consultas remotas dos módulos também retornaram 502; os tipos locais fixados e os testes continuam independentes dessa consulta. Nenhuma execução Minecraft foi realizada.
