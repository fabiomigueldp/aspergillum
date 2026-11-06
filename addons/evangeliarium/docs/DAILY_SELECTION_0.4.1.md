# Seleção diária 0.4.1

## Contrato

Evangeliário, Lecionário e novos exemplares do Missal abrem a data civil de Brasília (UTC−03), com identificação automática da celebração nacional. Nos dias com formulário único, a leitura abre diretamente. Escolhas reais de Missa ou vigília usam uma lista curta. O leitor mantém Anterior / Seções / Próxima. Não decide qual Missa noturna está sendo celebrada pelo horário nem transforma alternativas em uma escolha obrigatória. O Pontifical continua organizado pelo rito, porque ordenações, dedicação e demais ações não são determinadas por uma data.

Hoje e Data são consultas privadas. Marcar página conserva uma seção e sua página; Seguir hoje é a ação explícita que restaura o modo diário. Livros existentes em modo índice continuam assim, sem migração silenciosa. Schemas, UUIDs, identificadores de livros, snapshots, sessões, bloqueios e revalidação tardia permanecem intactos.

## Calendário

`src/domain/daily-calendar.ts` é uma implementação própria, pura, sem Minecraft API. Lê datas válidas gregorianas e usa computus próprio, ciclo dominical na virada do Advento, ciclo ferial pelo ano civil e precedência de celebrações. Metadados do próprio nacional foram transcritos como dados, sem importar ou executar qualquer código do ZIP recebido.

**2026–2035** é a década revisada com fontes e provas específicas. O mesmo algoritmo admite datas gregorianas de **1583 a 9999** como **projeção pelas normas atuais**, identificada apenas por “Projeção” junto da data. Não reconstitui leis litúrgicas históricas, mudanças futuras do santoral nem Diretórios ainda não publicados. Antes de 1583 ou fora do formato de quatro algarismos, o campo mantém a entrada para correção; o índice permanece disponível. O mapeamento identifica as seções pela chave original e pela proveniência; nunca deduz um formulário inteiro pela igualdade de uma referência evangélica.

As vigílias próprias de Pentecostes, São Pedro e São Paulo, Assunção e São João Batista aparecem separadas da celebração diurna na véspera; só abrem por escolha explícita. No Missal, são oferecidas apenas vigílias identificadas no acervo.

Casos protegidos: Páscoa 05/04/2026 e 28/03/2027; início do Ano B em 29/11/2026 e do Ano C em 28/11/2027; Anunciação transferida para 05/04/2027; Assunção nacional 16/08/2026 e 15/08/2027; São Pedro e São Paulo no domingo; memórias coincidentes em 13/06/2026; Santa Família; Natal com Missas distintas; Sábado Santo sem Missa diurna; formas alternativas e possibilidade do Ano A nos escrutínios.

O calendário bíblico antigo permanece como fonte histórica de comparação do build, mas **não autoriza mais a seleção do dia no leitor**. Isso evita reutilizar o antigo rótulo de Natal à noite durante todo 24 de dezembro. Referências bíblicas digitadas e marcas anteriores continuam acessíveis.

## Limites explícitos

- Brasil nacional não incorpora patronos, titular/dedicação da igreja, calendários de institutos ou transferências autorizadas por bispos. A interface rotineira não repete alertas locais; o índice dá acesso natural às escolhas da comunidade.
- Avisos identificam memórias facultativas catalogadas e comemorações quaresmais, conservando leituras feriais. A lista não representa todos os próprios locais; o diretório e o índice continuam necessários para essas escolhas. Uma memória pode conservar leituras feriais; o texto ferial não recebe um título de próprio inexistente. Metadados detalhados ficam no domínio e nesta documentação, sem transformar a leitura diária em uma sequência de avisos.
- Missal não contém todos os próprios diários. O vínculo é uma lista explícita de seções verificadas; nenhum prefácio comum, Missa votiva ou rubrica de coleta substitui um próprio ausente. Ausência é informada com acesso ao índice.
- Vigílias, Missas múltiplas e alternativas reunidas no mesmo formulário continuam íntegra e claramente navegáveis pelas partes da leitura. A data não escolhe silenciosamente um horário de Missa.
- Consistência interna do ZIP não demonstra autenticação eclesiástica ou licença pública. Avisos editoriais e restrições de redistribuição continuam válidos.

## Extensão até 2035

As 3.652 datas de 2026–2035 têm chaves existentes. Tabela independente da conferência episcopal inglesa verifica literalmente Cinzas, Páscoa, Ascensão no domingo, Pentecostes, Advento e ciclos nos dez anos; a data inglesa de Corpus Christi não é aplicada ao Brasil.

São José em domingo da Quaresma segue o precedente brasileiro de antecipação ao sábado. **17/03/2035 é uma projeção de transferência, não uma certeza já publicada no Diretório desse ano**: a interface identifica a incerteza, oferece a féria e exige escolha. Em 19/03/2035 mantém a Semana Santa; a transferência permanece documentada nos metadados. João Batista/Coração em 2033 segue o precedente nacional de 2022 (João em 23/06, vigília em 22/06), com diferenças locais documentadas, sem alerta rotineiro para igrejas onde é padroeiro. Finados em domingo de 2031 conserva 02/11 e Todos os Santos fica em 01/11.

Testes gerais não validam antecipadamente leis futuras, Diretórios ainda não publicados, decretos diocesanos, evolução do santoral ou cobertura textual inexistente. A execução automática não é uma garantia absoluta para qualquer comunidade.

## Projeção ampla e fuso

O calendário não presume uma escolha em coincidências não resolvidas: em 2038, Corpus Christi permanece em 24/06, e 23/06 e 25/06 oferecem féria ou São João Batista com indicação mínima de transferência a confirmar. Não é inventada uma vigília na véspera de uma transferência incerta.

Hoje usa o relógio real do servidor com deslocamento fixo UTC−03. Todos os jogadores compartilham essa data de Brasília, independentemente do fuso pessoal; cada sessão conserva a consulta privada. Reabrir ou acionar Hoje recalcula a data. Não há conversão silenciosa para UTC, relógio do mundo ou horário de verão histórico. Uma eventual alteração legal futura do fuso exigirá atualização da política.

## Referências para auditoria

- Conferência Episcopal de Inglaterra e Gales, tabela 2026–2035: https://www.liturgyoffice.org.uk/Calendar/Info/2040.pdf
- CNBB, São José no Brasil em 18/03/2023: https://www.cnbb.org.br/sao-jose-4/
- CNBB, Imaculada Conceição e domingo do Advento: https://www.cnbb.org.br/imaculada-conceicao-2o-domingo-advento/
- CNBB, Todos os Santos e Fiéis Defuntos: https://www.cnbb.org.br/dia-2-de-novembro-todos-os-santos-ou-fieis-defuntos/
- USCCB, decreto 2671/98/L sobre memórias coincidentes do Imaculado Coração: https://www.usccb.org/resources/newsletter-2013-06.pdf
- Arquidiocese de Fortaleza, exceção local da Assunção em 2026: https://www.arquidiocesedefortaleza.org.br/arcebispo-divulga-carta-circular-da-24a-caminhada-com-maria-2026/

## Verificação e teste no cliente

A varredura reproduzível `npm run calendar:audit` percorre as 3.074.246 datas gregorianas de 1583–9999 e grava `out/calendar-coverage-1583-9999.json`. `FULL_CALENDAR_SWEEP=1 npm run check` inclui a mesma prova integral na suíte, sem skip. A prova é de integridade das chaves, não de validade histórica ou de decretos ainda não publicados.

Os testes percorrem todas as 3.652 datas contra as chaves presentes, conferem festas e fronteiras, impedem substituições indevidas no Missal e exercitam consulta por data, marcas, reabertura após meia-noite, calendário fora da cobertura, sessões antigas e persistência.

Antes de declarar validação visual: importar o pacote exato, abrir os quatro livros, conferir Hoje/Data/Índice, 24–25/12 e Sábado Santo, escolher alternativas, marcar e recolocar, fechar e reabrir, trocar de dimensão durante uma tela e conferir o Content Log. Repetir em janela estreita. Não foi realizado teste dentro do Minecraft nesta revisão.
