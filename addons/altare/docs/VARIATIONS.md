# Modelos, acabamentos e combinações de estados

O Altare prioriza construção e ornamentação no Criativo. “Acabamento” é uma combinação visual; não é receita de craft, ingrediente ou custo. Os comandos e a ferramenta continuam criando/configurando o altar diretamente.

Um **estado** é um dado guardado no bloco. `altare:edges`, por exemplo, informa quais lados pertencem ao perímetro e precisam de acabamento. Uma célula interna esconde a toalha nas faces de contato; uma extremidade mostra sua borda. Outras famílias também guardam a direção e a posição de um medalhão.

Uma **permutação** é uma combinação possível desses valores. Num formato com 16 contornos, quatro direções e quatro posições do motivo, o produto é 16×4×4 = 256 combinações por acabamento. Essa quantidade vem da declaração do bloco: colocar cem cópias não cria cem variantes novas, e mudar para Criativo não elimina as variantes registradas.

“**Orçamento**” é nosso controle de desenvolvimento dessa quantidade. A Microsoft usa 65.536 como referência compartilhada pelo mundo e documenta aviso de possível degradação de desempenho acima dela. Isso não significa que a engine pare imediatamente na próxima combinação. A revisão 0.12.0 volta a ficar abaixo dessa referência com os dois packs locais, sem retirar modelos ou escolhas. [Fonte oficial](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockstatesandpermutations?view=minecraft-bedrock-stable).

Na 0.12.0, são **397 blocos e 54.528 combinações**; com Aspergillum, **64.272**. O seletor único reúne dez escolhas de toalha nos sete modelos. Atelier e Mensa guardam poses visuais compactas. [Representação atual e testes](COMPACT_POSES_0.12.0.md).

Altare não foi distribuído: seu schema evolui diretamente durante o desenvolvimento. A discussão de migração nas revisões históricas abaixo não é requisito do desenvolvimento atual.

Histórico 0.7.0:

| Família | IDs | Combinações declaradas |
| --- | ---: | ---: |
| Clássico | 1 | 11.520 |
| Pilastras | 66 | 13.872 |
| Ogivas | 66 | 13.872 |
| Cavaletes | 66 | 13.872 |
| Arca | 12 | 1.296 |
| Balaústres | 12 | 1.296 |
| Colunata dourada | 2 | 32 |
| **Altare** | **225** | **55.760** |

Com Aspergillum local (9.744), a soma conhecida é 65.504; outros add-ons ainda precisam ser contabilizados. Isso não mede isoladamente FPS ou memória de texturas. A auditoria reproduzível é `node tools/audit-variations.mjs`, que produz `out/variation-audit.json`.

O novo modelo economiza informações redundantes: o painel e a renda se repetem nos quatro lados, sem medalhão direcional, então somente os 16 contornos são necessários. São dois acabamentos, com e sem renda, totalizando 32 combinações. As famílias antigas mantêm todos os valores publicados; reduzir o registro delas exigiria um plano explícito para mundos já construídos. A 0.7.0 não executa essa migração nem resolve o crescimento ilimitado do catálogo.
