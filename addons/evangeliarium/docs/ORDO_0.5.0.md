# Ordo global 0.5.0

Contrato atualizado para a revisão 0.5.1; evidências e pacote em [Verificação 0.5.1](VERIFICATION_0.5.1.md).

## Acesso e uso

`evangeliarium:ordo` é um calendário de sacristia de madeira escura, papel claro e marcador vermelho. Use o item para abrir; agache e use sobre um bloco para colocá-lo. Use o calendário colocado para consultar. A receita usa papel, corante vermelho e três gravetos; o dev kit inclui o item. Quebrar o calendário entrega o item sem apagar a celebração. Exemplares não carregam configurações próprias.

Todos veem a celebração atual. Operadores têm Escolher data, Escolher formulário e, durante uma alteração, Voltar para hoje. Outros jogadores têm Consultar formulários. Outros jogadores podem consultar, mas não alterar. O campo de data conserva entradas inválidas para correção; Voltar ou cancelar a prévia de uma data digitada retorna ao campo preenchido. Amanhã apenas antecipa a data; nunca presume uma vigília. Missas distintas são escolhas explícitas; uma data única recebe Usar esta celebração. O Ordo mostra Até 00h · Brasília apenas na sua própria tela.

## Autoridade, expiração e concorrência

Uma propriedade dinâmica de mundo `evangeliarium:ordo_state` guarda schema, revisão e alteração com seleção e vencimento. A mudança grava uma única propriedade sincronamente, sem await entre comparação e commit. A revisão é conferida novamente após o formulário e a permissão Operator é revalidada no instante de aplicar. Custom, Member, Visitor ou Criativo sem Operator não concedem autoridade.

O vencimento é a próxima meia-noite civil de Brasília, UTC−03, calculada a partir do momento real de aplicar, não da data litúrgica escolhida nem dos ticks do mundo. Cada leitura revalida a propriedade. Expiração após reinício avança a revisão e retira a alteração antes de resolver a celebração. Uma tela que cruza a meia-noite pede nova escolha, mesmo quando ainda não havia alteração. Operadores com telas antigas recebem o estado atual e uma indicação concisa do conflito; nunca sobrescrevem silenciosamente a escolha alheia.

Versão desconhecida, conteúdo inválido e falha de persistência não são convertidos em um reset destrutivo. Escrita é conferida por releitura. Falha de confirmação não é apresentada como sucesso. Sessões antigas, troca do item, distância do bloco, dimensão, morte e saída impedem callbacks tardios; fechamento descarta rascunhos.

## Livros e marcas

Com uma alteração ativa, novas aberturas do Evangeliário, Lecionário e Missal seguem o Ordo, inclusive se o exemplar tiver uma marca. A marca continua gravada, acessível em Livro → Ler marca, e volta a ser a abertura normal quando a alteração vence. Escolher Celebração no leitor consulta o estado global mais recente. Hoje, Data, Índice e busca continuam consultas pessoais e não mudam o Ordo. Marcar página e Seguir hoje continuam mudanças explícitas do exemplar.

Uma leitura já aberta conserva texto e posição, inclusive após mudança global ou virada da data. Não há broadcast, popup ou alerta genérico durante proclamação. Pontifical não lê o Ordo; continua pelo rito e sua marca.

A escolha de uma Missa abre a posição correspondente dentro da seção original, sem recortar ou alterar seus textos, IDs, alternativas ou paginação persistida. As outras partes da seção continuam acessíveis. O Missal usa apenas mapeamentos explícitos de próprios existentes. Próprio ausente oferece o índice; não substitui por uma votiva, prefácio ou oração de nome semelhante. Essa limitação preexistente de cobertura não é escondida.

## Formulários e leituras escolhidos pelo operador

Escolher formulário reúne os 23 formulários votivos existentes e o próprio da memória de Santa Teresa do Menino Jesus. O último mantém seu título e texto originais; não é reclassificado como uma missa votiva oficialmente editada. A lista paginada conserva a posição ao consultar e voltar.

Quando a data atual tem uma única escolha diurna, Usar com leituras de hoje aplica diretamente o formulário e essas leituras. Se há Missas distintas, Leituras de hoje abre as escolhas reais. Escolher leituras permite indicar outra data e selecionar sua celebração ou Missa. O operador compõe explicitamente a seleção; o addon não presume um vínculo litúrgico entre o formulário e as leituras nem inventa textos ausentes.

O Missal abre o formulário escolhido. Lecionário e Evangeliário abrem o conjunto de leituras explicitamente escolhido, preservando a Missa da aurora, vigília ou outra divisão quando houver. O Ordo identifica o formulário e a data das leituras. Não há popups adicionais nos livros. A composição tem a mesma expiração à meia-noite de Brasília e as mesmas permissões das alterações por data. Consultar ou cancelar não altera o mundo.

A seleção persistida inclui ambos os componentes; uma votiva sem leituras, seção desconhecida ou data/celebração incompatível é rejeitada. Santa Teresa permanece disponível em qualquer data por escolha manual, sem ser imposta ao calendário automaticamente.

Este recurso não acrescenta textos nem afirma cobertura completa de próprios diários ou um Lecionário de Missas votivas. Utiliza somente o acervo já existente. Não foi executado no Minecraft nesta revisão.

## Compatibilidade

UUIDs, namespace, IDs dos quatro livros, schemas de item/bloco, marcas, armazenamento dos exemplares e poses permanecem intactos. O novo objeto usa identidade independente; não migra nem reescreve livros existentes. O Ordo foi introduzido no Evangeliarium 0.5.0 e refinado na 0.5.1; os demais add-ons permanecem em suas versões. APIs estáveis, sem rede nem experimentos.

## Verificação

Testes automatizados cobrem domínio, persistência, permissões, concorrência, virada civil, reload, formulários cancelados, respostas antigas, marcas, Pontifical e escolhas de Natal, Ascensão, Epifania e Pentecostes. O teste de chaves existentes de todas as datas 2026/2027 não é homologação litúrgica. `npm run check` e `npm run package` são os comandos de entrega; resultados exatos devem ser registrados junto do artefato.

### Reteste dentro do Minecraft (pendente)

1. Importar somente o `.mcaddon` 0.5.1 e executar `/function evangeliarium/dev_kit`. Conferir item, colocação agachado, frente nas quatro direções, seleção e quebra sem perda da escolha global.
2. Dois operadores abrem o Ordo; um aplica Amanhã e o outro tenta aplicar um rascunho anterior. Só o primeiro deve valer. Revogar Operator enquanto a tela está aberta impede aplicar. Membro apenas consulta.
3. Abrir um livro marcado antes da mudança; manter a página aberta, mudar o Ordo por outro jogador e conferir que a página não muda. Reabrir segue a celebração; Livro → Ler marca conserva a marca. Pontifical continua no rito.
4. Testar 24/12, 25/12, véspera de Pentecostes e Sábado Santo. As opções são explícitas; próprios ausentes não abrem textos substitutos. Verificar horários e títulos sem truncamento em janela estreita, controle e toque.
5. Trocar item, dimensão, morrer, fechar ou sair durante os formulários. Nenhum callback antigo aplica escolha. Reabrir o mundo após o vencimento restaura o dia real. Teste de relógio deve ocorrer em ambiente isolado, nunca alterando o relógio do servidor de produção.
6. Consultar os formulários como membro e operador: percorrer as quatro páginas, abrir e voltar à mesma lista. Como operador, aplicar com leituras de hoje e escolher outra data/Missa; confirmar os três livros e a expiração. Como membro, confirmar ausência dos controles de aplicação. Digitar uma data, abrir a prévia e usar Voltar ou cancelar: o campo conserva a entrada. Fechar o Ordo descarta o rascunho. Conferir o Content Log sem erros de componente, geometria, bloco ou UI.

Capturas Blender e testes de dados são evidência de preparação, não confirmação de renderização nativa Bedrock.
