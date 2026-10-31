# Altare 0.4.0 — compatibilidade e atualização

A revisão conserva os UUIDs dos packs, os 136 IDs de blocos publicados até 0.3.0, seus valores de states na mesma ordem e seus defaults. Não há conversão automática de blocos no mundo nem varredura de chunks. Materiais e geometrias da coleção arquitetônica são refinados ao carregar o novo resource pack; a família clássica/Guadalupe permanece idêntica à 0.2.1 nos 89 arquivos comparados.

## Paleta e identidade

O menu **Floral IHS · cores litúrgicas** oferece oito cores, três estruturas e três materiais, sempre sem aplique adicional no corpo: 72 escolhas. Vermelho reutiliza os nove IDs `altare:a_<estrutura>_<material>_ruby_none`. As sete outras cores usam 63 novos IDs `altare:l_<estrutura>_<material>_<cor>`.

Esses novos IDs têm apenas `altare:shape` (0–6), `altare:detail` (0–3) e `altare:facing` (0–3). Não recebem os states antigos `altare:edges` e `altare:role`. Cada ID comporta 112 permutações. A tabela persistente está em `src/domain/palette-layout.ts`; sua ordem é contrato de mundo e não pode ser reorganizada.

`código = shape × 4 + detail`. Máscaras locais usam bits norte=1, leste=2, sul=4, oeste=8 antes da rotação por `facing`.

| Códigos | Papel | Máscaras locais, na ordem |
| --- | --- | --- |
| 0–15 | Repetição, sem símbolo central | 15, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 |
| 16–19 | Centro inteiro, largura ímpar | 1, 5, 11, 15 |
| 20–23 | Metade esquerda, largura par | 1, 5, 9, 13 |
| 24–27 | Metade direita, largura par | 1, 5, 3, 7 |

O estado padrão 0/0/0 representa módulo isolado, sem símbolo central e com quatro bordas. A aplicação de acabamento calcula contorno e centro do retângulo. Se quebrar um vizinho tornar o papel central incompatível com a nova borda, o módulo retorna à repetição, preservando a cor. Reaplicar acabamento recentraliza a composição. Contornos não retangulares continuam recusados pelo menu.

A troca de cor/família usa a transação existente: revalidação após formulário, lock de componente, revalidação imediatamente antes de escrever, rollback defensivo. Somente as células do altar são modificadas; o espaço acima continua disponível para blocos. Não são criados entidades ou registros globais de altares.

## Atualização em cópia de teste

1. Guardar uma cópia do mundo. Importar o [arquivo 0.4.0](../dist/releases/Altare-0.4.0.mcaddon) e selecionar BP/RP `[0,4,0]`, sem revisão antiga concorrente.
2. Conferir um altar clássico/Guadalupe e outro arquitetônico já existentes, com objetos sobre o tampo.
3. Aplicar **Floral IHS · cores litúrgicas**, alternar as oito cores, salvar e reabrir. Conferir centro, direção, bordas, objetos e Content Log.
4. Repetir em sete e oito blocos de frente e em uma mesa 1×1. O roteiro completo está em [TESTING.md](TESTING.md).

## Downgrade

A 0.3.0 não reconhece os 63 IDs novos. Antes de voltar, converter todos os altares de paleta para vermelho ou outra receita da 0.3.0, em todos os chunks afetados, e retirar os novos itens de inventários/containers. A conversão do altar colocado não converte itens guardados. Restaurar uma cópia anterior é a alternativa verificável quando não há inventário completo desses usos. Remover o pack sem conversão não é migração suportada.

## Evidência

`node tools/verify-world-compatibility.mjs` compara IDs, schemas ordenados/defaults e identidade dos packs com o `.mcaddon` imutável 0.3.0. `node tools/verify-baseline.mjs` compara os 89 arquivos clássicos com 0.2.1. Esses testes não substituem a abertura do mundo e a avaliação do Content Log. Resultados e hashes: [RELEASE_0.4.0.md](RELEASE_0.4.0.md).
