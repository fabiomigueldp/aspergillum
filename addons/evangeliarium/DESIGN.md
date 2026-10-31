# Design

## Cena e direção

Um jogador para diante do ambão em uma igreja do Minecraft e precisa ler um trecho inteiro sem procurar os controles. Uma página clara e opaca mantém o texto legível mesmo quando o ambiente do mundo é escuro.

## Superfícies e cor

Estratégia contida. Papel marfim ocupa a área de leitura; vinho identifica a encadernação e os controles ativos. Ouro aparece somente no filete da moldura. Fontes autorais em `assets-src/ui/`; texturas são geradas, nunca retocadas no pack.

Tokens são definidos em OKLCH e convertidos para sRGB pelo gerador. Texto em tinta escura, sem branco/preto puros. Foco: fundo vinho e texto marfim, com moldura completa. Sem vidro, brilho emissivo, gradientes tipográficos ou ruído sob as letras.

## Texto e composição

Fonte nativa do jogo. Uma coluna com aproximadamente 60 caracteres por linha na escala de referência; título com contraste de escala e corpo com entrelinha. Cabeçalho fixo, corpo rolável e navegação inferior fixa na leitura. A tela respeita os limites da viewport.

## Navegação

Leitura: Anterior, Leituras, Próxima; os extremos sem destino ficam ocultos. Um X fecha o leitor. Leituras reúne Hoje, Passagem, Data e Livro. Passagem oferece quatro Evangelhos e entrada por referência. Livro concentra marca, modo diário, fechar fisicamente, retirar e créditos. Cancelar uma busca retorna à tela anterior com a página preservada.

## Integração

O acabamento usa JSON UI associado apenas a títulos com marcadores internos do evangeliário, através de ActionFormData/ModalFormData estáveis. A rota nativa é mantida para formulários de terceiros. Essa mudança substitui a limitação de CustomForm do conceito inicial; a compatibilidade do ponto compartilhado `server_form` deve ser testada no cliente. Não modifica fontes globais, HUD ou inventário.
