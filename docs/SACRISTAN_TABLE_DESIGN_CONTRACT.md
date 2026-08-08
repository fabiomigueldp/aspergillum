# Contrato da Mesa do Sacristão — v1.1.7

## Intenção

A Mesa do Sacristão é uma estação de preparo e conservação do instrumento, não uma bancada industrial. Ela deve parecer plausível numa sacristia, capela ou igreja: histórica, litúrgica e sóbria, com detalhe suficiente para ser bela sem se tornar um objeto estranho ao Minecraft.

A estação existe para tornar perfil e acabamento legíveis, reversíveis e gratuitos. A receita representa a construção do móvel; nenhuma configuração cobra materiais, água ou cargas.

## Linguagem visual

- corpo de madeira escura com variação calma, sem ruído quadriculado excessivo;
- moldura superior de madeira um pouco mais clara;
- superfície central de veludo verde profundo, lida como apoio cerimonial e não como tela tecnológica;
- gaveta frontal com inlay escuro e puxador de latão discreto;
- travessa inferior e quatro pernas robustas dentro do footprint de um bloco;
- veludo verde preenchendo todo o nicho interno, sem tocar ou competir com as bordas elevadas;
- aspersório ocupado centralizado e inteiramente contido sobre o veludo, derivado da mesma malha, máscaras de faces e conjunto color/normal/MER do item selecionado;
- transição do pomo composta por placa sólida e aro vazado sem interseção positiva com o couro, robusta à escala `0.72` e à renderização opaque da mesa.

Não usar glow, emissividade, hologramas, ícones flutuantes, neon, vidro de interface ou ornamento eclesial ostensivo. A beleza deve vir de proporção, material, contraste e composição.

## Contrato do bloco

- identificador: `aspergillum:sacristan_table`;
- custom component: `aspergillum:sacristan_table_interaction`;
- state de ocupação: `aspergillum:table_has_aspergillum = false|true`;
- state cosmético: `aspergillum:table_cosmetic = 0..8`;
- state de orientação: `aspergillum:table_rotation = 0..15`;
- `2 × 9 × 16 = 288` combinações totais;
- base `geometry.aspergillum.sacristan_table.rotation_0` e quinze geometrias rotacionadas geradas;
- bloco `immovable`, sem trait experimental de rotação;
- loot vazia/ocupada fornece somente a mesa; o aspersório é sempre recuperado pelo snapshot autoritativo.

`assets-src/models/sacristan_table.model.json` é a fonte humana. PNGs, texture sets, geometrias distribuídas e rotações são gerados; não devem ser editados manualmente.

## Catálogo de configuração

Perfis:

| ID | Leitura | Contrato preservado |
| --- | --- | --- |
| `standard` | leque equilibrado aprovado na 1.0.20 | 36 gotas, 6 pulsos, 1 carga, release tick 5, cooldown 18 |
| `processional` | leque mais aberto, lento e solene | mesma economia/timing; resposta e velocidade próprias |
| `contained` | leque estreito e preciso | mesma economia/timing; resposta e velocidade próprias |

Acabamentos metálicos: `silver`, `antique`, `gilded`.

Empunhaduras: `chestnut`, `oxblood`, `black`.

O catálogo cartesiano em `assets-src/customization/catalog.json` define os nove IDs/índices. `classic = silver + chestnut = 0` preserva o item histórico `aspergillum:aspergillum`; as outras oito combinações usam novos IDs públicos. Índices e IDs não podem ser reordenados depois da publicação sem migração explícita.

## Contrato da interface

A interface usa `CustomForm` estável e controles nativos. Ela deve pertencer visualmente ao Minecraft e continuar utilizável com teclado, controle e toque.

O ritmo usa exatamente cinco `spacer()` nativos: abaixo do título do formulário, abaixo de cada cabeçalho, entre o dropdown de perfil e **Acabamento**, e antes de **Restaurar padrão**. O único `divider()` separa o grupo final **Concluir e retirar**/**Fechar**. Divisores não podem ser usados como espaço vazio.

Ordem fixa:

1. título **Mesa do Sacristão**;
2. seção **Perfil de aspersão** e dropdown com descrição da opção;
3. seção **Acabamento**, dropdown de metal e dropdown de empunhadura;
4. botão **Restaurar padrão**;
5. botão primário **Concluir e retirar**;
6. botão **Fechar**, localizado em todos os idiomas suportados.

Mudanças de dropdown são aplicadas imediatamente. Não há botão genérico “Salvar”, moeda, slot de ingrediente, barra de progresso ou confirmação modal. Fechar o formulário encerra a sessão e deixa o item sobre a mesa; não reverte escolhas já aplicadas. A ação final retira o item.

Todos os textos usam `RawMessage`/translation keys em `pt_BR` e `en_US`. A UI não depende de imagens exclusivas de APIs pre-release. O menu não repete cargas, custo zero ou confirmação de sucesso; falhas são comunicadas por action bar localizada.

## Autoridade e custo zero

O servidor autoriza snapshot, item, perfil e cosmético. A UI apenas solicita alterações. Cada callback revalida sessão, jogador, dimensão, distância, bloco e snapshot.

Configuração gratuita significa:

- nenhum ingrediente consumido;
- nenhuma carga consumida;
- nenhuma água da caldeirinha tocada;
- nenhum custo XP/moeda;
- nenhuma alteração no cooldown de aspersão;
- restauração clássica igualmente gratuita.

Não há demonstração: com o formulário aberto sua resposta física ficava encoberta e não auxiliava a decisão. A prévia autoritativa é o modelo acomodado, atualizado sem custo pela seleção.

## Persistência e recuperação

A mesa guarda o mesmo `DockedAspergillumSnapshot` V2 usado pela caldeirinha. Alterações preservam:

- `instance_id`;
- `charges` finitas `0..4`;
- `nameTag`;
- schema V3;
- propriedades dinâmicas customizadas;
- `cosmeticId` e `sprayProfileId` atuais.

Somente `cosmeticId`/tipo visual ou `sprayProfileId` muda durante a edição. Retirada e quebra removem o snapshot somente depois que o item foi entregue ou dropado. Rollback restaura snapshot e permutação anterior em falha.

## Gates de aceitação

- captura reproduzível de `table` e `table-docked` sem cubos ausentes, item desproporcional ou UV fora do atlas;
- câmera em movimento junto ao pomo sem cintilação, faces concorrentes ou alternância subpixel;
- inspeção no `.mcaddon` final em clássico e Vibrant Visuals, nas dezesseis rotações;
- item clássico visualmente equivalente à baseline 1.0.20;
- nove combinações distinguíveis sem saturação, emissividade ou aparência plástica;
- formulário legível e navegável em `pt_BR`/`en_US`, teclado, controle e toque;
- nenhum consumo durante edição;
- exclusão multiplayer e cleanup de ciclo de vida;
- reload, quebra e inventário cheio sem perda ou duplicação;
- Content Log sem erro/warning atribuível ao add-on.

A captura web é evidência diagnóstica, não prova de paridade do renderer Bedrock. O gate final exige o pacote produzido em `dist/releases/`, sem revisão antiga ou cache concorrente.
