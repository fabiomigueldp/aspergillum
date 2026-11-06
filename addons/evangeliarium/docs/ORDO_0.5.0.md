# Ordo global 0.5.0

Contrato atualizado para a revisão 0.5.1; evidências e pacote em [Verificação 0.5.1](VERIFICATION_0.5.1.md).

## Acesso e uso

`evangeliarium:ordo` é um calendário de sacristia de madeira escura, papel claro e marcador vermelho. Use o item para abrir; agache e use sobre um bloco para colocá-lo. Use o calendário colocado para consultar. A receita usa papel, corante vermelho e três gravetos; o dev kit inclui o item. Quebrar o calendário entrega o item sem apagar a celebração. Exemplares não carregam configurações próprias.

Todos veem a celebração atual e Consultar votivas. Operadores também têm Escolher data e, durante uma alteração, Voltar para hoje. Outros jogadores podem consultar, mas não alterar. O campo de data conserva entradas inválidas para correção; Voltar ou cancelar a prévia de uma data digitada retorna ao campo preenchido. Amanhã apenas antecipa a data; nunca presume uma vigília. Missas distintas são escolhas explícitas; uma data única recebe Usar esta celebração. O Ordo mostra Até 00h · Brasília apenas na sua própria tela.

## Autoridade, expiração e concorrência

Uma propriedade dinâmica de mundo `evangeliarium:ordo_state` guarda schema, revisão e alteração com seleção e vencimento. A mudança grava uma única propriedade sincronamente, sem await entre comparação e commit. A revisão é conferida novamente após o formulário e a permissão Operator é revalidada no instante de aplicar. Custom, Member, Visitor ou Criativo sem Operator não concedem autoridade.

O vencimento é a próxima meia-noite civil de Brasília, UTC−03, calculada a partir do momento real de aplicar, não da data litúrgica escolhida nem dos ticks do mundo. Cada leitura revalida a propriedade. Expiração após reinício avança a revisão e retira a alteração antes de resolver a celebração. Uma tela que cruza a meia-noite pede nova escolha, mesmo quando ainda não havia alteração. Operadores com telas antigas recebem o estado atual e uma indicação concisa do conflito; nunca sobrescrevem silenciosamente a escolha alheia.

Versão desconhecida, conteúdo inválido e falha de persistência não são convertidos em um reset destrutivo. Escrita é conferida por releitura. Falha de confirmação não é apresentada como sucesso. Sessões antigas, troca do item, distância do bloco, dimensão, morte e saída impedem callbacks tardios; fechamento descarta rascunhos.

## Livros e marcas

Com uma alteração ativa, novas aberturas do Evangeliário, Lecionário e Missal seguem o Ordo, inclusive se o exemplar tiver uma marca. A marca continua gravada, acessível em Livro → Ler marca, e volta a ser a abertura normal quando a alteração vence. Escolher Celebração no leitor consulta o estado global mais recente. Hoje, Data, Índice e busca continuam consultas pessoais e não mudam o Ordo. Marcar página e Seguir hoje continuam mudanças explícitas do exemplar.

Uma leitura já aberta conserva texto e posição, inclusive após mudança global ou virada da data. Não há broadcast, popup ou alerta genérico durante proclamação. Pontifical não lê o Ordo; continua pelo rito e sua marca.

A escolha de uma Missa abre a posição correspondente dentro da seção original, sem recortar ou alterar seus textos, IDs, alternativas ou paginação persistida. As outras partes da seção continuam acessíveis. O Missal usa apenas mapeamentos explícitos de próprios existentes. Próprio ausente oferece o índice; não substitui por uma votiva, prefácio ou oração de nome semelhante. Essa limitação preexistente de cobertura não é escondida.

## Votivas: limite editorial explícito

A tela apresenta os 23 formulários reais do Missal em catálogo paginado, com posição de página e retorno à mesma lista após a consulta. A aplicação global ainda não está habilitada: o acervo não contém remissões brasileiras verificadas para todas as leituras e Evangelhos. A informação de disponibilidade é curta, no detalhe de cada formulário. Ler formulário abre o texto do Missal para consulta paginada, sem aplicar a votiva ao mundo ou alterar marcas. Santa Teresinha não é inventada nem associada por semelhança de título.

Uma auditoria separada encontrou remissões oficiais portuguesas, mas elas não foram promovidas como vínculos brasileiros. Nenhuma hipótese externa autoriza a seleção de leituras no runtime. O allowlist de votivas é vazio por decisão editorial, não por falta de um mecanismo de persistência.

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
6. Consultar as votivas como membro e operador: percorrer as quatro páginas, abrir formulários e retornar à mesma página; não há botão de aplicação global para vínculos pendentes. Digitar uma data, abrir a prévia e usar Voltar ou cancelar: o campo conserva a entrada. Fechar o Ordo descarta o rascunho. Conferir o Content Log sem erros de componente, geometria, bloco ou UI.

Capturas Blender e testes de dados são evidência de preparação, não confirmação de renderização nativa Bedrock.
