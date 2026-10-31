# Altare 0.4.2 — cavaletes e construção 3D

Data: 30/10/2026. Corrige o formato de colisão rejeitado no Minecraft do usuário e refina os modelos de cavaletes, pilastras e ogivas. Pacote validado offline, pronto para reteste; aceitação no jogo, apoio, colisão, multiplayer e Content Log da 0.4.2 permanecem pendentes.

## Artefato exato

- [Altare-0.4.2.mcaddon](../dist/releases/Altare-0.4.2.mcaddon)
- SHA256: `a40cf55d42bfb9df098884cc98ed2e74abcd7b47e78de231f104999195762f06`
- 10.114.491 bytes; 612 arquivos; canal `diagnostic`, família `modular-altar`.
- BP/RP `[0,4,2]`, UUIDs preservados. Engine mínima 1.26.40, Script API 2.9.0/UI 2.1.0 estáveis, sem experimentos obrigatórios.
- [Resumo oficial](../dist/validation/0.4.2/release-summary.json), [relatório HTML](../dist/validation/0.4.2/altare-0.4.2.report.html), [correspondência das capturas](../dist/validation/0.4.2/capture-parity.json), [limites das alterações](../dist/validation/0.4.2/structure-parity.json).

## Correção e modelos

O Content Log da 0.4.1 mostrou 264 erros nos 66 blocos de cavaletes: `min/max` não era aceito em `collision_box`, os blocos não entravam no registro e a conversão falhava. A colisão agora usa `origin/size` estável e inclui caixas conservadoras para as escoras rotacionadas. O tampo termina em y=16 e o centro permanece livre. [Diagnóstico, evidência e fontes](STRUCTURES_0.4.2.md).

O editor resolve as permutações de destino e recuperação antes da primeira escrita. Definição ausente aborta sem alterar o conjunto. Falhas de escrita conservam o rollback defensivo; o log inclui a causa original, ID/states ou posição quando aplicável.

Os cavaletes recebem sapatas e cabeçotes contínuos, montantes, escoras diagonais e travessas ligadas na mesma cota. Pilastras têm base/fuste/capitel distintos; ogivas ganham relevo, impostas, fecho central e peitoril. Dois cavaletes ficam nas extremidades, com um montante por célula de profundidade em cada um. Não há suporte intermediário adaptativo ao comprimento.

Todos os 142 mapas de material, 66 texture sets e bones de tampo/toalha/aplique permanecem iguais à 0.4.1. Não há nova arte, cor, identidade ou estado. Mantêm-se 199 blocos, 53.136 combinações possíveis, 188 geometrias com no máximo 50 cubos e 31,75 MiB RGBA antes de mipmaps/ícones. Com o Aspergillum local são 62.880 estados, reserva de 2.656; demais add-ons não estão incluídos nesse cálculo.

## Verificação concluída

- `npm run package` executou `npm run check`: tipos, **38 testes**, geração e validação estrutural aprovados. Creator Tools **0.17.7: zero erros e zero avisos**. [Log](../out/package-0.4.2.log).
- Regressões para formato da colisão, apoio, vão livre, quatro frentes × 16 máscaras, vértices rotacionados, seleção dos cavaletes, preparação sem escrita e diagnóstico limitado. As regressões de colisão/armação/preparação falharam antes da correção.
- `npm run check` na raiz: **107 testes do Aspergillum + 54 do viewer**, build/validações aprovados. [Log](../out/aspergillum-check-0.4.2.log). Alterações preexistentes da raiz preservadas; nenhuma edição de produto fora do Altare.
- 199 contratos de bloco e UUIDs preservados; 89 arquivos clássicos idênticos à 0.2.1. [Compatibilidade de mundo](../out/world-compatibility-0.4.2.json).
- Comparação dos arquivos finais: 359 arquivos idênticos, incluindo todos os 145 PNGs (142 mapas, dois ícones de pack e ferramenta). Mudaram 180 geometrias, 66 definições de cavaletes, um bundle, dois manifests e quatro arquivos de idioma somente na versão. Bones de tecido/tampo/aplique e demais componentes de bloco conferidos separadamente.
- **44 capturas atuais**: 32 de estruturas, quatro do verso e oito de Guadalupe; hashes conferidos contra os 612 arquivos do ZIP final. O [comparador](../out/structure-comparison-0.4.2/index.html) contém 32 pares antes/depois com câmeras idênticas e verifica os dois arquivos distribuídos. Seletor, imagens locais, slider e largura móvel passaram no [smoke](../out/structure-comparison-0.4.2/smoke.json).

## Reteste mínimo no Minecraft

1. Importar este arquivo numa cópia do mundo, ativar BP/RP 0.4.2 sem versão/cache Altare concorrente. Não remover o pack de um mundo contendo seus blocos. O trabalho desta revisão não instalou packs nem modificou o mundo do usuário.
2. Em 7 × 2, altura 1, usar **Acabamento do altar**, mesa aberta/nogueira/sem toalha; depois branco/Cordeiro. A aplicação deve terminar sem rollback. Inspecionar sapatas, diagonais, travessas e vão central, incluindo o verso.
3. Colocar pedra vanilla e caldeirinha sobre o tampo. Alternar cavaletes/pilastras/ogivas, salvar e reabrir: posição e estado dos objetos superiores devem permanecer. Repetir 8 × 2, 1 × 1, quatro frentes e multiplayer conforme [TESTING.md](TESTING.md).
4. Exportar o novo Content Log. Esperado: nenhum erro `collision_box`, ID de cavaletes ausente do registro, falha de preparação/escrita ou rollback no caminho normal. Se houver falha, registrar versão do jogo, tamanho/frente e mensagem completa com a cadeia de causas.

As capturas são produzidas fora do Minecraft com modelos e materiais reais do pacote. Não comprovam paridade gráfica, registro, suporte, colisão ou desempenho no jogo. O reteste físico desta correção continua aberto.
