## Reteste de interface 0.5.3

- Em Missal > Índice > Saudação, um clique abre o texto; Seções > Voltar ao índice retorna ao mesmo índice, sem uma lista repetindo Saudação.
- Abrir leitura e Seções no Evangeliário, Lecionário, Missal e Pontifical: somente a moldura marfim, sem janela cinza ou texto duplicado. Avançar/voltar páginas e rolar até o fim.
- Abrir Data, digitar uma data inválida e corrigir. Campos e envio continuam acessíveis; Escape volta ao menu anterior.
- Buscar um único resultado, ler e voltar: a lista e a consulta continuam disponíveis. Testar também lista com várias seções e retorno da segunda página.
- `/scriptevent evangeliarium:inspect ui-native` continua exibindo somente a aparência vanilla para formulários sem marcador.
- Repetir em janela menor e conferir o Content Log. O teste automatizado de expressões não comprova renderização, foco ou comportamento do cliente.

## Composição de formulário e leituras — 0.5.3

- Como operador, Ordo → Escolher formulário → Santíssima Trindade → Usar com leituras de hoje. Abrir Missal (formulário), Lecionário e Evangeliário (leituras identificadas pela data).
- Escolher leituras → 25/12/2026 → Missa da aurora. Conferir que ambos os livros de leituras abrem essa Missa, e o Missal permanece no formulário escolhido.
- Selecionar Santa Teresa na última página da lista. Consultar como membro não permite aplicar; Voltar para hoje remove a composição. A mudança não interrompe uma leitura já aberta e expira na meia-noite de Brasília.

## Santa Teresa — histórico 0.5.2

Importar `Evangeliarium-0.5.2.mcaddon`, sem cópia antiga/cache concorrente. No Missal, abrir Índice → Próprio dos Santos e buscar `Teresa` e `Teresinha`; ambas as buscas devem encontrar a mesma memória. Conferir entrada, coleta, oferendas, comunhão e pós-comunhão, incluindo o texto final. Marcar a página, fechar, reabrir e verificar retorno. Marcas antigas e consulta das votivas do Ordo devem continuar intactas; a nova seção não aplica celebração nem escolhe leituras. Registrar Content Log e hash do pacote. [Evidências e limites](VERIFICATION_0.5.2.md).

## Lecionário 0.4.0

Retestar os quatro livros e o índice por tempo/ciclo/semana; busca incremental, cancelamento, partes com Missas/alternativas, marca e retorno à mesma lista. Conferir leitura e Content Log no pacote exato 0.4.0, inclusive custo de primeira abertura e busca. Escopo completo: [LECTIONARY_0.4.0](LECTIONARY_0.4.0.md); evidências e hash: [VERIFICATION_0.4.0](VERIFICATION_0.4.0.md).

# Teste no Minecraft — Evangeliarium 0.3.0

Este é o roteiro de aceitação do candidato integrado. Checks automatizados e capturas externas já existem; **input, renderização, encaixe dos braços e Content Log ainda precisam deste teste no jogo**.

## Teste inicial

1. Use Minecraft Bedrock **26.52**, a versão instalada identificada durante a pesquisa. O mínimo do manifest é 26.50. Crie um mundo de teste, com comandos habilitados para obter o item.
2. Importe `dist/releases/Evangeliarium-0.3.0.mcaddon`. Ative **Evangeliarium — Comportamento** e **Evangeliarium — Recursos**. Não é necessário habilitar experimentos. Não ative cópias antigas ou diagnósticos do mesmo pack.
3. Execute `/give @s evangeliarium:book`. Selecione o item e observe a elevação dos dois braços, a capa vertical, o contato das mãos e a linha de visão utilizável, em primeira pessoa e nas duas câmeras de terceira pessoa.
4. Olhe para o ar e use. O leitor deve abrir diretamente na passagem de hoje em Brasília. Navegue por todas as páginas. Em `Leituras > Passagem > Digitar referência`, leia `Jo 3,16-21`; marque e reabra.
5. Use sobre a face superior de um bloco cheio de **pedra ou tábuas**, com ar acima. O item deve sair do inventário e aparecer aberto sobre o bloco. Use-o para ler a referência marcada.
6. Agache e use o livro colocado. O mesmo exemplar deve voltar ao inventário. Repita usando `Retirar` dentro do leitor. Com inventário cheio, a retirada deve falhar e o livro permanecer no mundo.
7. Agache ao colocar: ele deve ficar fechado. Use-o para abrir e ler. Em `Leituras > Livro > Fechar livro`, confirme fechamento físico. Fechar apenas a janela deve deixar o livro no mundo.
8. Deixe o livro colocado, salve, saia e reentre. Leia, recolha e confirme a mesma marcação. Caminhe, corra, agache, pule e troque de item para conferir entrada, movimento e saída da pose.

O item também possui receita na bancada: cinco pepitas de ouro, dois corantes vermelhos, um livro e um couro, no padrão `GGG / RBR / GLG`.

## Missal e Pontifical — expansão 0.3.0

1. Execute `/function evangeliarium/dev_kit`. Os três itens devem ser distintos no inventário e ter capa/modelo próprios. Confirme título e ícone antes de usar.
2. Abra o Missal: índice por grupos, lista de dez seções e próximos resultados. Leia um título de 72 caracteres; o rótulo não pode ficar cortado. Abra o Pontifical e confirme seu conteúdo próprio.
3. Busque `bênção` e `ordenacao` (sem acento). Valide resultados, ausência de resultados e campo curto inválido preservado. Escape retorna ao índice; no índice inicial, fecha o livro.
4. Leia uma seção com parágrafos de rubrica e fala misturadas. Vermelho e texto normal devem acompanhar somente os trechos certos. Avance até o fim de uma seção longa, incluindo divisão de um parágrafo entre páginas, sem perda de palavras.
5. Em `Seções > Livro`, marque uma página posterior à primeira. Navegue privadamente para outra seção, feche e reabra: a marca permanece. `Abrir pelo índice` remove a marca explícita.
6. Coloque, feche, abra, recolha, salve e recarregue cada tipo, também com nome customizado e inventário cheio. Nunca deve retornar um Evangeliário no lugar do Missal/Pontifical.
7. Com a tela de marcação aberta, troque Missal por Pontifical, slot ou dimensão. A resposta antiga não pode marcar o novo exemplar; morrer/sair também encerra a sessão.
8. Observe porte bimanual, cancelamentos e recuperação nas três câmeras. Os novos livros usam a mesma animação, mas os modelos ainda precisam da validação nativa de clipping/encaixe.
9. Confira `Livro > Créditos` nos três livros. Bíblia Livre pertence somente ao Evangeliário; os outros dois identificam as fontes da comunidade.

Nenhum render Blender/Three.js substitui esses passos. Fontes, limitações e inconsistências conhecidas: [Três livros](THREE_BOOKS_0.3.0.md).

## Content Log

Ative o log de conteúdo nas opções de Criador. Ao carregar o mundo, deve aparecer uma única mensagem informativa:

```text
[Evangeliarium] 0.3.0 ready; 3 books; 3779 verses; Brazil 2026-2027; stable APIs.
```

Não devem aparecer erros de script, módulo indisponível, custom component não registrado, Molang inválido, geometria/textura não encontrada, render controller ausente ou exceção de formulário. Os avisos de links vanilla descritos no relatório são do **validador offline**, não erros que se espera aceitar no Content Log do jogo.

Para relatar um problema, registre a versão exata do Minecraft, versão do pack, perspectiva, skin wide/slim, gráficos, modo de jogo, outros RPs ativos e o trecho correspondente do Content Log. Para ajuste de pose, vistas frontal, lateral e primeira pessoa do mesmo estado permitem distinguir binding, apresentação e animação.

## Matriz de aceitação

### Revisão de interface 0.2.5

1. Abrir o livro: deve haver apenas uma moldura marfim, sem janela cinza sobreposta. Título, filete, corpo e rodapé não se cruzam.
2. Conferir todos os botões sem passar o mouse: os rótulos precisam estar visíveis. Ao focar, fundo vinho e letras claras. Os extremos da paginação sem destino ficam ocultos, conservando Leituras ao centro.
3. Abrir Passagem, selecionar João e consultar capítulo/versículos. Voltar de Data ou Referência deve conservar a página anterior. Digitar `Jo 99` deve mostrar erro curto com o campo preservado.
4. Ler uma passagem curta, um capítulo inteiro e a Paixão. Rolar até o fim e avançar/voltar: nenhum trecho perdido, cortado permanentemente ou sobreposto ao rodapé. Testar também uma referência descontínua longa.
5. Abrir Livro e Créditos. Marcar, Seguir hoje, Fechar livro e Retirar ficam fora da página principal e conservam os contratos de persistência.
6. Repetir leitura, menu e formulário numa janela menor e com a escala usada pelo jogador. Mouse/teclado verificados não equivalem a certificação para toque/gamepad.
7. Executar `/scriptevent evangeliarium:inspect ui-native`: a primeira janela e seu campo de texto devem usar a aparência vanilla, sem moldura ou texto duplicado do Evangeliário.

O X e Escape fecham a leitura; em uma busca ou menu, voltam ao nível anterior. O fechamento da UI nunca fecha fisicamente o objeto.

| Área | Exercício | Resultado esperado |
| --- | --- | --- |
| Leitura | `Jo 3`, `Mt 5,1-12`, `Mc 14,1-15,47`, `Lc 1,1-4;4,14-21` | Texto completo, páginas consecutivas, nenhuma perda ou repetição |
| Referências inválidas | `Jo 99`, `Jo 3,21-16`, `Jo 3,16a` | Erro curto, campo preservado e nenhum texto fabricado |
| Marca | Consultar outra passagem sem marcar, recolher, reabrir | A marca original continua no objeto |
| Hoje | Trocar marca por `Seguir hoje` | Data civil de Brasília, independentemente do tempo do mundo |
| Virada de dia | Manter uma leitura aberta à meia-noite de Brasília | Paginação permanece estável; `Hoje`/`Seguir hoje` consulta o novo dia |
| Datas | 12/10/2026, 25/12/2026, 27/03/2027 e uma data em 2028 | Aparecida; opções de Natal; Sábado Santo/Vigília; aviso de falta de cobertura |
| Versículos parciais | 01/11/2026 ou outra referência indicada no manifest | A legenda identifica expansão para versículos completos quando aplicável |
| Superfícies | Pedra/tábuas; laje/escada; baú/porta; bloco de outro add-on | Coloca somente no suporte aceito; preserva interações próprias dos demais |
| Metadata | Nomear livro em bigorna, marcar, colocar e retirar | Nome e referência conservados |
| Recuperação | Retirar o suporte; descarregar e recarregar chunk | Um exemplar recuperado, sem visual órfão ou duplicação observada |
| Concorrência | Dois jogadores leem e tentam retirar o mesmo livro | Consultas privadas; somente uma retirada válida |
| Callback antigo | Trocar de slot, dimensão, morrer ou substituir livro com UI aberta | Sessão deixa de alterar a instância anterior |
| Modos | Sobrevivência, Criativo, Aventura e Espectador | Os dois primeiros movem item real; Aventura lê; Espectador não opera |
| Primeira pessoa | Olhar cima/baixo, FOV usual e amplo, caminhar e agachar | Livro legível como objeto, mãos encaixadas, visão utilizável |
| Terceira pessoa | Wide/slim; frente/lado/costas; caminhada e salto | Livro vertical, mãos sustentam a base, porte erguido diante do rosto, sem clipping grave |
| Cancelamento | Escudo na mão secundária, nadar, planar, montar, dormir, emote | Suspende porte bimanual; ao retornar, retoma sem braços presos |
| Multiplayer | Observador chega perto ou entra após o porte já começar | Pose e livro aparecem coerentes no cliente observador |
| Gráficos | Clássicos e Vibrant Visuals | Couro/papel legíveis; ouro sem emissão; nenhuma face piscando |
| UI | Mouse/teclado, controle, toque e escalas de UI | Texto acessível, foco correto, navegação e fechamento funcionam |
| Compatibilidade RP | Outros packs que alteram braços/controller FP | Registrar conflito de prioridade; testar também com apenas este RP |

A Bíblia Livre é identificada no leitor e em Créditos. Ela não deve aparecer rotulada como tradução CNBB. O calendário cobre 2026–2027 e não incorpora próprios diocesanos ou paroquiais.

## Critério para promoção

O candidato só recebe aceitação de runtime depois de importado, com o percurso inicial aprovado, os casos relevantes da matriz executados e ausência de novos erros do add-on no Content Log. Uma pose que falhe deve gerar uma calibração controlada e **outra versão**; não substituir silenciosamente o arquivo já testado.

Relatórios automáticos: `dist/validation/0.3.0/`. Hash e tamanho exatos do pacote: `release-summary.json` e `dist/releases/Evangeliarium-0.3.0.mcaddon.sha256`. Capturas Three.js não comprovam paridade Bedrock.


Ferramentas de inspeção: [RUNTIME_DIAGNOSTICS.md](RUNTIME_DIAGNOSTICS.md). Após entrar ou trocar a câmera, aguarde até três segundos para a renovação do porte. Registre o tronco além da cabeça: o jogador vanilla pode manter a cabeça girada em relação ao corpo.
