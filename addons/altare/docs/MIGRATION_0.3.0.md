# Atualização e downgrade — Altare 0.3.0

## Compatibilidade

Os UUIDs BP `c139b210-8db8-4385-8541-4ee47a381796` e RP `41384022-51a6-4f55-a4c6-88d06544f212`, o namespace, `altare:mensa`, `altare:finish_tool` e todos os valores dos states clássicos são preservados. A versão de ambos os packs passa a `[0,3,0]`. Engine mínima 1.26.40 e módulos estáveis 2.9.0/2.1.0 permanecem.

A coleção adiciona 135 IDs `altare:a_<estrutura>_<material>_<tecido>_<frontal>`, enumerados em `src/domain/catalog.ts`. Cada um publica `altare:edges` (16 máscaras, default 15), `altare:facing` (0–3) e `altare:role` (0–3). Esses IDs e significados passam a ser compatibilidade persistente: futuras versões devem mantê-los ou oferecer migração explícita. Não são aliases transitórios de `altare:mensa`.

Os materiais/modelos clássicos de Guadalupe permanecem. O runtime reconhece ambos os tipos de identidade, inclusive conjuntos mistos durante construção. Não há varredura do mundo, conversão automática ao carregar chunks nem alteração de inventários.

## Aplicação testável

1. Guardar uma cópia do mundo com a revisão anterior e registrar os packs ativos.
2. Importar o arquivo 0.3.0 exato e selecionar BP/RP `[0,3,0]`, sem uma revisão Altare concorrente. Primeiro abrir uma cópia de teste.
3. Conferir um altar clássico antes de qualquer edição. Usar **Acabamento do altar**, escolher uma estrutura nova e sua aparência, e aplicar.
4. A edição substitui somente IDs/estados dos módulos reconhecidos no mesmo retângulo. Limites, lock, revalidação de identidade/estados, prazo e rollback defensivo continuam ativos. Blocos, itens e inventários acima não são capturados.
5. Conferir os objetos apoiados, salvar/reabrir e testar o Content Log. Repetir a conversão no sentido inverso pela opção **Clássico / Guadalupe**.

Os ticks locais ajustam contorno e apoios, não reposicionam o centro. Após ampliar, reduzir ou reconstruir, reaplicar o acabamento. Um módulo padrão colocado ao lado de uma receita herda o design vizinho; um item de receita explícita conserva o próprio ID. Quebrar um bloco novo não preserva seus states de centro/direção/contorno no item, embora o ID continue identificando a aparência.

## Downgrade

O caminho mais seguro é restaurar a cópia anterior. A 0.2.1 não conhece os IDs novos; desativar o pack ou voltar de versão diretamente pode deixar blocos e itens desconhecidos.

Se for necessário preservar construções feitas depois do upgrade, ainda na 0.3.0 aplicar **Clássico / Guadalupe** a cada conjunto novo e conferir sua persistência. Essa operação converte apenas blocos no mundo: **não procura nem converte itens de receitas novas em inventários, contêineres, estruturas salvas ou drops**. É necessário inventariá-los e removê-los/substituí-los conscientemente na cópia de trabalho antes de usar um pack antigo. Altare não fornece um scanner/migrador global nesta revisão.

Não tratar rollback de uma aplicação como restauração durável contra crash do processo entre escritas. Uma interrupção extrema pode deixar acabamentos mistos; reaplicar após diagnóstico. O add-on não possui custódia dos vasos, portanto não tenta restaurá-los ou duplicá-los. Downgrade anterior a 0.2.1 segue também [MIGRATION_0.2.1.md](MIGRATION_0.2.1.md).
