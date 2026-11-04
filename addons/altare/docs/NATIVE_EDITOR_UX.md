# Editor nativo: clareza e fechamento

Revisão de código sobre Altare 0.11.2, sem nova release de pacote. A apresentação usa o catálogo de sete modelos da main. IDs, estados, codecs, geometrias, colisões, dados salvos, locks, prazo e transação permanecem iguais. Estudos separados de compactação, migração e novas famílias não integram esta mudança nem recebem aprovação por ela.

## Abertura, interrupção e conjuntos mistos — 04/11/2026

A abertura do editor apenas lê e valida o conjunto. A reconciliação prévia escrevia contornos antes de adquirir o lock, inclusive ao Cancelar ou encontrar outro editor ocupado. Ela foi removida: **Aplicar** calcula os contornos com `planFinish` e os grava pela transação existente, após a revalidação. A manutenção independente por colocação/quebra/tick continua inalterada; uma mudança concorrente continua recusando um snapshot obsoleto.

A liberação da sessão informa encerramento uma única vez quando interrompe uma tela aberta ou uma aplicação ainda não confirmada. Cancelar/fechar nativamente permanece silencioso, inclusive se a sessão for liberada antes da continuação da Promise. Uma sessão antiga não libera o lock de uma nova sessão. Jogador inválido não recebe mensagem tardia. O texto não afirma rollback ou alteração de blocos.

Acabamentos diferentes exibem um aviso junto ao escopo: aplicar uniformiza o conjunto com as escolhas mostradas, inicialmente as do módulo clicado. A detecção compara acabamentos canônicos, incluindo frente, material, tecido e receita; ignora contorno, papéis de centro e a distribuição espacial da imagem de Guadalupe. Não acrescenta confirmação modal nem altera saves. A frente inicial continua sendo a lateral clicada; usar topo/base conserva a frente armazenada.

Testes direcionados: 34 passaram, incluindo dez testes do adaptador de infraestrutura e uma matriz de uniformidade para todos os desenhos existentes. Oito regressões falham contra o editor/menu da base. O check completo do Altare passou com os 130 testes então presentes, typecheck, build e validação; o teste adicional de revalidação tardia passou na rodada direcionada final. A validação de documentação da raiz também passou. Isso não valida layout, foco ou lifecycle exato do Minecraft.

## Escolhas e organização

- Uma frase inicial explica que a edição alcança o altar inteiro e só muda o mundo ao aplicar.
- Materiais fixos são texto, sem dropdown que aparente uma escolha. No Floral IHS de outra cor, o aviso informa que vermelho permite relevo. A escolha suspensa volta ao selecionar uma combinação compatível.
- **Frente e detalhes** substitui **Frontal**. A seção e seu espaçador somem juntos quando a configuração é simétrica.
- **Desfazer alterações** restaura todas as escolhas do rascunho de abertura, inclusive as que ficaram ocultas. O botão só fica ativo quando esse rascunho mudou. Não significa recuperar um padrão global nem editar o altar salvo.
- **Aplicar no altar** permanece ativo sem diferenças: reaplicar também recompõe os centros após colocação. **Cancelar** não retorna acabamento.
- **Sem relevo**, **Imagem de Guadalupe** e direções sem repetir o rótulo são coerentes em pt_BR e en_US.

## Defeitos corrigidos

O título anterior congelava largura/profundidade na abertura. Agora acompanha a frente escolhida no rascunho e volta corretamente ao desfazer, sem escrever no mundo. A orientação temporariamente escondida por uma combinação simétrica continua preservada.

O campo `frontal` representa Guadalupe no Clássico, mas tem outra semântica nos modelos arquitetônicos. Abrir uma receita arquitetônica e voltar ao Clássico não pode ativar Guadalupe por interpretar um papel de centro como imagem. A apresentação agora consulta a estrutura do desenho antes de inferir essa escolha. O codec não muda.

O fechamento agora invalida os callbacks antes de chamar `close()`. Escolhas e ações exigem tela aberta e sessão válida. Isso impede fechamento duplicado, Aplicar após Cancelar e aplicação tardia após o fechamento nativo. Se o fechamento falha deixando a tela aberta, é possível tentar novamente; uma falha em Aplicar não deixa um acabamento pendente para Cancelar ou fechar nativamente depois. O resultado ainda passa pela revalidação e pelo commit existentes.

## API e verificação

Somente controles e observables dos tipos estáveis instalados de `@minecraft/server-ui` 2.1.0 são usados. Valores editáveis são `clientWritable`; título, visibilidade e estado do botão são de escrita do servidor. Não há HTML, CSS, abas, prévia que escreva no mundo ou API preview.

Fonte primária: [CustomForm](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/customform?view=minecraft-bedrock-stable), consultada em 04/11/2026, conferida contra os tipos locais. A página também apresenta funções em pré-lançamento; elas não são usadas.

`tests/helpers/native-ui.ts` executa o menu real com um adaptador de controles. Os testes cobrem cancelamento, cliques repetidos, fechamento nativo, erros síncronos antes e depois de ocultar a tela, expiração, escolhas ocultas, dimensões nas quatro frentes, round-trip de Guadalupe nas receitas existentes e material/seções nos sete modelos e dez toalhas. As regressões foram reproduzidas contra a main anterior antes de portar a correção.

Validação do porte inicial: check completo do Altare e da raiz aprovados; 116 testes do Altare (19 de apresentação), 107 testes da raiz e 83 do viewer, sem falhas. A mídia regenerada pelo pipeline raiz foi excluída da mudança e restaurada ao HEAD. A recuperação de falhas de fechamento acrescenta quatro testes de apresentação, reproduzidos com falha antes da correção.

Validação do fechamento revisado: check completo do Altare aprovado, com 120 testes (23 de apresentação); raiz com 123 testes, typecheck, bundle, validações estruturais e documentação aprovados. Os 83 testes do viewer passaram no check completo anterior desta rodada. Nenhum asset de áudio regenerado foi mantido no diff.

O adaptador não prova aparência, foco, toque, controle ou o comportamento exato do host Bedrock. O teste no Minecraft continua reservado ao usuário. Não foi gerado nem publicado um pacote novo; o próximo empacotamento deve usar uma versão inédita, sem reutilizar uma versão já importada.

## Reteste nativo

1. Em pt_BR e en_US, abrir um altar 7×2. Mudar a frente entre norte/leste/sul/oeste, conferir o título e usar **Desfazer alterações**.
2. Alternar Clássico/Guadalupe, Ogivas com relevo, madeira e Colunata/Renda. Material fixo não deve parecer campo editável; a seção de frente não pode deixar um espaço vazio.
3. Escolher relevo no Floral IHS vermelho, mudar para roxo e voltar. A escolha deve reaparecer. Desfazer também deve recuperar opções escondidas.
4. Reaplicar sem mudar seleções após estender o altar. O botão Aplicar deve continuar disponível.
5. Testar cliques rápidos e fechar pela interface nativa. Cancelar/fechar não pode aplicar o rascunho; nenhum `FormVisibilityError` ou lock deve permanecer.
6. Conferir rolagem e foco com mouse, controle e toque na escala de UI usada. Exceder o prazo da sessão e invalidá-la durante a edição; aplicar uma tela obsoleta deve continuar impossível. Registrar Content Log sem novos erros do add-on.

### Reteste adicional deste fluxo

- Abrir e Cancelar com contornos desatualizados: o editor não deve escrever nem girar blocos. Repetir enquanto outro jogador possui o editor.
- Aplicar sem mudar escolhas: recompõe os contornos/centros e mantém a frente explicitamente mostrada. Cancelar nunca faz essa recomposição.
- Deixar a sessão expirar ou invalidar o altar enquanto aberta: fecha e informa encerramento; reabrir deve funcionar. Repetir com Aplicar imediatamente antes da invalidação.
- Abrir um conjunto com pedras/tecidos/frentes diferentes: aviso de uniformização presente; Cancelar preserva diferenças. Um altar uniforme com Guadalupe/centros distribuídos não deve mostrar aviso falso.
