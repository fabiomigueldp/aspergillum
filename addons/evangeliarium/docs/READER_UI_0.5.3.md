# Interface dos livros — 0.5.3

## Reprodução e alteração

As sete capturas enviadas em 06/11/2026 mostram a moldura vanilla sobre a moldura marfim na leitura do Evangelho, Lecionário, Missal e Pontifical, além de um segundo menu Saudação contendo somente Saudação e Voltar.

O histórico da fonte de JSON UI mostra que o terceiro marcador (`catalogPrefix`) foi acrescentado após a composição validada em 0.2.5. As condições nativa/modal passaram a encadear três operações no mesmo nível. Esta revisão substitui esse encadeamento por operações binárias parentetizadas, gera a rota nativa como inversa da rota própria e inicia os ramos ocultos até a avaliação. A limpeza do título usa a mesma disciplina de parênteses. Os arquivos distribuídos são regenerados da fonte; o formulário vanilla continua disponível exclusivamente para títulos sem os marcadores.

Grupos com uma única seção abrem o texto diretamente e mantêm o retorno ao índice de origem. Buscas continuam exibindo o resultado para o usuário conferir o título, sem perder a consulta. Menus de rótulos curtos usam linhas compactas; linhas maiores ficam reservadas a rótulos extensos.

## Escopo

A correção visual trata UI e navegação. A entrega final também inclui a composição explícita de formulários e leituras no [Ordo](ORDO_0.5.0.md): seleção global, resolução nos três livros e controles correspondentes. Textos, algoritmo do calendário, modelos e identidade dos itens não mudam. A revisão não instala packs nem altera mundos.

## Verificação

A verificação automatizada inclui build, TypeScript, suíte do addon e validação estrutural. Regressões novas cobrem seleção exclusiva das rotas, títulos e formulários alheios, sequência de títulos, acesso direto e retorno, busca de um resultado e a seção Saudação do acervo real.

O avaliador de testes cobre apenas o subconjunto parentetizado das expressões usadas nesta UI. Não é o parser nem o renderer do Minecraft; a causa visual deve ser confirmada no cliente com o pacote final. Não foram executados importação, foco, rolagem, controle/toque ou Content Log nativo nesta revisão. [Reteste curto](TESTING.md#reteste-de-interface-053).

### Resultado automatizado

- Build, TypeScript e validação estrutural passaram no código final combinado. Suíte: 242 testes, 241 aprovados e 1 skip deliberado já existente. Inclui composição de formulário/leituras, Santa Teresa, permissões, conflitos, expiração e abertura nos três livros.
- Creator Tools: zero erros e 19 avisos conhecidos de referências a itens vanilla. A consulta ao registry retornou HTTP 502; validação offline e tipos instalados foram usados.
- O pacote inicial apenas de UI foi substituído pela entrega combinada com o Ordo: `Evangeliarium-0.5.3.mcaddon`, 2.063.093 bytes, 99 arquivos.
- SHA-256 final: `881dbbdef480e19489a18a4eb026234657432dfc5996b3e2c95d94491536bec4`.
- Check da raiz/viewer executado pela frente de integração Altare; esta mudança não altera código desses componentes.
