# Altare 0.13.0 — Cruzeta e Dois pedestais

Os dois modelos antes arquivados como estudos agora fazem parte do catálogo executável, do editor do add-on e do Studio. Esta implementação parte da main 0.12.1 e preserva as correções recentes do editor, poses Atelier/Mensa e ícone da ferramenta. Não restaura a consolidada experimental inteira.

## Uso

Monte os módulos, use **Acabamento do altar**, escolha **Cruzeta** ou **Dois pedestais** e aplique. Ambos usam nogueira, as dez toalhas compartilhadas e as oito cores do Floral IHS: 17 acabamentos por modelo. Não há novo item mestre, tela paralela nem requisito de outro add-on.

Cruzeta tem quadro aberto, diagonais duplas, cavilhas e marchetaria. Os apoios de quina/junta são compartilhados pelo contorno. Dois pedestais tem sapatas e capitéis escalonados, fustes octogonais e um vão inferior aberto. O plano do retângulo inteiro determina a posição dos dois apoios, em vez de inventar pés por bloco. O topo permanece em y=16 e não escreve nas células acima.

## Composição

Dois pedestais aceita as mesmas dimensões retangulares do editor: cada eixo até 16, pelo menos um eixo até 8 e no máximo 128 células, em quatro frentes. As 768 composições orientadas usam 448 poses básicas ou 504 poses com centro. Cada receita mantém aparência e colisão inteiramente nos blocos, sem entidades auxiliares.

Quebrar módulos conserva as geometrias dos fragmentos restantes. Uma extensão usa um módulo provisório simples; reaplicar o acabamento recompõe os dois apoios. O editor identifica o modelo mesmo ao abrir por esse módulo. Cancelar não aplica alterações. Trocar de modelo remove os dados de pose exclusivos dos pedestais.

## Estados e liberdade de desenvolvimento

Este add-on ainda não foi distribuído publicamente. A revisão evolui os schemas diretamente, sem migrador, exportador ou projeto de retrocompatibilidade. As verificações de aplicação/cancelamento e colisão testam o funcionamento atual, não são barreiras de compatibilidade com estudos anteriores.

Para acomodar os novos modelos, direções sem efeito visual são removidas de poses neutras simétricas de Pilastras, Ogivas, Colunata e tecidos clássicos. **Orçamento: 55.736 estados Altare + 9.744 Aspergillum = 65.480**, abaixo da referência de 65.536. Outros add-ons têm contagem própria e não estão incluídos nessa soma. Centros e metades direcionais continuam explícitos; materiais, escolhas, malhas e colisões não são reduzidos. Testes comparam as poses neutras visualmente equivalentes antes da normalização.

## Validação e limites

O build gera geometrias, texturas, BP/RP e runtime a partir das fontes. A geometria dos pedestais pode ter até 60 cubos/192 faces, em grande parte suportes de faces recortadas. A política de avisos reconhece somente o aviso de complexidade GEOMETRY 501 com identidade e contagem exatas; os demais avisos e erros continuam recusados.

A verificação automatizada cobre catálogo, todos os planos e poses nativas, malha/UV/colisão, textos, aplicação/cancelamento, seleção, extensões e abertura repetida. A prévia utiliza os arquivos gerados, mas não comprova renderização ou desempenho no Minecraft.

Teste nativo mínimo: aplicar os dois modelos em 3×2 e 8×2, alternar sem toalha/renda/Floral, girar a frente, cancelar uma edição e quebrar/recompor um módulo. Conferir apoios, costas, colisão, objetos no tampo e Content Log. Execução dentro do Minecraft não foi realizada nesta integração.

Resultados desta integração: 185 testes Altare, 123 testes raiz e 104 testes Studio aprovados. A comparação de poses neutras cobriu 7.440 equivalências de geometria, UV, materiais e colisão. Prévia CPU dos arquivos gerados inspecionada para ambos os modelos em 3×2. A captura WebGL não executou porque o Chromium disponível não iniciou neste ambiente; a prévia CPU não substitui o teste nativo.
