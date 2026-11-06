# Lecionário — 0.4.0

## Uso e escopo

Quarto item: `evangeliarium:lectionary`; bloco `evangeliarium:lectionary_stand`; visual `evangeliarium:lectionary_visual`. O kit de desenvolvimento fornece os quatro livros. A receita usa livro, couro, pepitas de ouro e corante verde, sem colidir com as outras três receitas.

O Lecionário abre pelo índice. O acervo contém 766 formulários navegáveis por tempo e ciclo, com grupos e listas paginadas em lotes de dez. O índice separa tempo, ciclo do Tempo Comum e semanas em ordem numérica. A busca funciona por título e conteúdo, sem exigir acentos. A consulta não altera o exemplar. `Seções > Livro > Marcar página` grava a seção e página; `Abrir pelo índice` remove a marca.

`Seções > Partes da leitura` localiza os títulos na mesma paginação usada para exibir o texto. Isso permite chegar diretamente ao Salmo, à segunda leitura, ao Evangelho ou à forma alternativa sem percorrer todo o formulário. `Ir para página` continua disponível. As notas editoriais permanecem acessíveis em Seções e sua presença é indicada na página.

O Evangeliário oferece `Leituras > Formulários`, com os mesmos 766 identificadores, contendo somente Evangelhos e alternativas relativas ao Evangelho. A marca de formulário/página reabre essa leitura; `Seguir hoje` volta ao comportamento diário existente. Não converte as leituras anteriores nem modifica silenciosamente marcas existentes de passagem.

## Calendário e precisão

O novo catálogo não tem associação automática por data. O calendário brasileiro 2026–2027 já existente no Evangeliário permanece inalterado e continua usando seu corpus anterior para Hoje, Data e Passagem. Os novos textos são selecionados explicitamente em Formulários. Uma referência isolada de Evangelho não identifica com segurança todo um formulário litúrgico; não se fez essa dedução.

O arquivo fornecido contém um motor de calendário, mas ele não foi executado. O importador próprio lê apenas dados do ZIP, valida caminhos e extrai os objetos JSON. Próprios diocesanos, escolhas locais, transferências e opções sem formulário completo não foram inventados. O Lecionário não afirma ser um Diretório anual.

Os oito complementos editoriais e as alternativas preservam os avisos que os distinguem do acervo-base. Missas noturnas e formulários com múltiplas Missas ficam agrupados como na fonte. A proveniência técnica, hashes, data de edição e limites de uso estão em `assets-src/lectionary/provenance.json` e no README do mesmo diretório, sem identificação de tradução nas telas de leitura.

## Contratos e custo

- Reutiliza Books, transações com rollback, sessão única por jogador e revalidação de item, tipo, revisão, slot, distância e dimensão.
- UUIDs e IDs existentes não mudam. A seleção `section` passa a ser aceita também no Evangeliário; saves antigos `today`/`passage` continuam válidos. Versões antigas não devem abrir exemplares marcados com a seleção nova.
- Os blocos do recorte evangélico apontam aos mesmos objetos do Lecionário, evitando uma segunda cópia literal do texto no bundle.
- Títulos do acervo novo ficam juntos com o início da leitura; separadores não poluem o índice de partes e Missas repetidas têm contexto. A paginação dos livros antigos não muda.
- O acervo é compilado no Script API offline, sem fetch, serviços, motor externo ou descompressão no jogo.
- A paginação ocorre apenas ao abrir uma seção. A busca no acervo novo monta seu índice de forma incremental, em lotes de até 32 seções por tick, preservados em WeakMap; cancelar ou substituir a sessão invalida o trabalho restante. Nenhum formulário lista centenas de opções de uma vez.
- Os 766 formulários correspondem a 3.866 páginas do Lecionário e 1.565 do recorte evangélico no limite de 850 caracteres. Não se criam 5.431 objetos de página na inicialização.
- Modelos e reteste gráfico: `LECTIONARY_MODEL.md`.

## Verificação nativa necessária

Os testes automatizados e Creator Tools não comprovam desempenho, abertura de telas ou Content Log no Bedrock. No pacote exato 0.4.0:

1. Importar os dois packs sem cópia antiga concorrente e obter os quatro livros pelo kit.
2. Abrir Lecionário; navegar grupos/listas, buscar, consultar Advento, Natal, Ramos e Pentecostes; conferir títulos, alternativas, nota editorial e última página.
3. Saltar entre partes e páginas; cancelar e voltar; marcar, colocar, reiniciar mundo e retirar. Conferir tipo, página, nome e propriedades preservados.
4. Repetir Formulários no Evangeliário; conferir ausência de primeiras leituras/salmos, presença de formas alternativas e retorno explícito a Hoje. Testar Sábado Santo: nenhuma missa diurna é inventada.
5. Trocar item/dimensão ou morrer com tela aberta; respostas antigas não podem marcar outro livro. Testar inventário cheio e outro jogador no mesmo exemplar colocado.
6. Medir primeira abertura, primeira busca, navegação e memória/watchdog no hardware-alvo; conferir sem erro novo no Content Log. O tempo de build e importação Node é diagnóstico, não garantia de carga Bedrock.

## Desempenho observado e orientação de pacote

Diagnóstico em Node 24 no executor cloud: importação do módulo TypeScript do acervo em cerca de 276 ms, incluindo strip-types; variação de heap de 29,3 MB após importação, buscas e paginação; primeira busca em 24 lotes, cerca de 59 ms de CPU total e maior lote de 12,2 ms. Buscas seguintes consumiram 3–5 ms de CPU total. A maior seção tem 38 páginas; a maior paginação observada consumiu cerca de 2,2 ms. O agendamento real em ticks não está incluído nesses tempos. Relatório reproduzível desta execução em `out/lectionary-performance.json` (diagnóstico descartável).

O JavaScript distribuído tem aproximadamente 9,1 MB; o pack descompactado completo aproximadamente 10,73 MB. A orientação oficial Microsoft recomenda até 25 MB descompactados e 2.500 arquivos para add-ons: [Pack Size & File Counts](https://learn.microsoft.com/en-us/minecraft/creator/documents/practices/improvingperformanceandresourceusage?view=minecraft-bedrock-stable#pack-size--file-counts). O candidato está abaixo de ambas as recomendações; isso não é aprovação automática de desempenho nem um limite rígido universal.

Não foi encontrado teto geral oficial por arquivo JavaScript. Tamanho em disco não representa memória de execução. O [Bedrock Dedicated Server](https://learn.microsoft.com/en-us/minecraft/creator/documents/bedrockserver/server-properties?view=minecraft-bedrock-stable) documenta alertas agregados do watchdog por memória e limites configuráveis. Não foi desativado watchdog nem alterada qualquer configuração de servidor. A inicialização e os picos de memória ainda precisam ser medidos dentro do Minecraft, especialmente quando há outros add-ons no mundo.
