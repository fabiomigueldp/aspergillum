# Changelog

## 0.5.3 — 06/11/2026

- Ordo permite aplicar os 23 formulários votivos e o próprio de Santa Teresa com leituras escolhidas explicitamente: as de hoje em uma ação, ou de outra data/Missa. Missal, Lecionário e Evangeliário seguem a composição até a meia-noite de Brasília. Não presume leituras próprias nem altera os textos.

- Encaminhamento visual compartilhado com uma condição única e sua inversa, operações binárias explicitamente parentetizadas e painéis inicialmente ocultos. Evita a rota nativa concorrente nas telas próprias dos quatro livros.
- Grupos com uma única seção abrem diretamente a leitura, inclusive Saudação do Missal. O retorno preserva o índice de origem; resultados de busca continuam listados.
- Rótulos curtos usam linhas compactas; linhas multilinha ficam reservadas aos títulos extensos.
- Regressões de roteamento, busca, retorno e Missal real. Validação visual no Minecraft ainda pendente; ver [relatório](docs/READER_UI_0.5.3.md).


## 0.5.2 — 05/11/2026 — formulário de Santa Teresa

- Acrescenta ao índice do Missal o formulário da memória, com transcrição visual e corroboração paroquial brasileira documentadas.
- Snapshot anterior preservado; nenhuma leitura, seleção diária ou aplicação votiva acrescentada. Comportamento do Ordo e pacote 0.5.1 permanecem intactos.
- [Fontes, emenda e limites](docs/SANTA_TERESA_FORMULARY.md); [verificação do candidato local](docs/VERIFICATION_0.5.2.md). Validação Minecraft pendente.

## 0.5.1 — 05/11/2026 — polimento do Ordo

- Consulta das votivas disponível também para membros, com posição no catálogo e disponibilidade editorial apenas no detalhe. Voltar da prévia conserva a data digitada; fechar descarta o rascunho.
- Papel em folha fina sobre miolo revelado, grade mais legível e veios discretos na madeira. Grampos, marcador e bordas têm encaixe e UVs protegidos por testes.
- Mesmos UUIDs, IDs, schemas, permissão de escrita, marcas e poses; sem alterações nos outros add-ons. O pacote 0.5.0 é preservado.
- [Verificação e pacote](docs/VERIFICATION_0.5.1.md). Importação e Content Log no Minecraft permanecem pendentes.

## 0.5.0 — Ordo global

- Calendário de sacristia em item/bloco: um único Ordo por mundo, independente dos exemplares.
- Escolha explícita de data/Missa, somente para operadores, com revisão concorrente e expiração na próxima meia-noite de Brasília, inclusive após reload.
- Livros seguem a celebração ao reabrir, sem interromper páginas abertas ou apagar marcas. Pontifical permanece por rito.
- Catálogo votivo consultável; sincronização votiva aguarda vínculos brasileiros validados.
- [Contrato, limites e teste nativo](docs/ORDO_0.5.0.md).

## 0.4.1 — 05/11/2026 — seleção diária

- Calendário nacional próprio, revisado em 2026–2035 e projetável pelas normas atuais em 1583–9999, com chaves exatas de formulários, precedência, ciclos A/B/C e I/II e festas móveis.
- Evangeliário e Lecionário abrem a celebração da data de Brasília; dias simples abrem diretamente e escolhas necessárias permanecem disponíveis, sem escolher Missa noturna pelo relógio.
- Missal identifica apenas os próprios disponíveis; não substitui lacunas por textos votivos ou rubricas. Pontifical permanece por rito.
- Consulta privada de Hoje/Data não altera marcas. Seguir hoje restaura a abertura diária; exemplares antigos pelo índice e marcas são preservados.
- Não executa código do ZIP; não amplia sua licença. Calendários locais e validação Minecraft permanecem fora da verificação automatizada. Consulte `docs/DAILY_SELECTION_0.4.1.md`.

## 0.4.0 — 05/11/2026 — Lecionário

- Acrescenta Lecionário como quarto exemplar, com modelo, material, ícone, receita e persistência próprios.
- Importa 766 formulários do acervo fornecido, preservando leituras, salmos, aclamações, alternativas, Missas e notas editoriais.
- Evangeliário oferece os mesmos formulários filtrados para Evangelhos e alternativas; índice, busca, partes da leitura e marca por página.
- Leitura sem identificação da tradução na interface. A proveniência e os limites acompanham as fontes e a documentação.
- Calendário diário 2026–2027 existente preservado, sem deduzir formulários completos por uma referência isolada; não foi executado o motor do arquivo recebido.
- UUIDs, registros, transferências e demais add-ons preservados; teste no Minecraft pendente. Consulte `docs/LECTIONARY_0.4.0.md`.

## 0.3.2 — 05/11/2026 — encadernação aberta

- Reconstrói a abertura dos três livros: lombada articulada e comprimida sob o miolo, canal central raso e terminais de fitas com caimento.
- Preserva apresentação em mãos, binding, texto, identidades e persistência; reset explícito de escala/rotações ao fechar.
- Testes geométricos comparam endpoints estáticos/animados e 51 fases por livro, incluindo apoio, bounds e UVs. Fontes Blender dos três livros e roteiro em `docs/OPEN_BOOK_REBUILD.md`.
- Validação nativa no Minecraft permanece pendente.

## 0.3.1 — 04/11/2026 — navegação e acabamento

- Salto de página nos três livros, retorno à lista/busca na mesma posição e referências internas com retorno à página anterior.
- Grupos compartilhados preservados; nove rótulos desambiguados e 11 associações de grupo verificadas, mantendo títulos e textos originais. Duas referências incorretas do índice recebem correção explícita; destinos não verificados não são presumidos.
- Missal: abas e marcadores encaixados nas páginas e ícone regenerado a partir da geometria, sem alterar o binding ou a pose.
- Contrato, fontes editoriais e testes: `docs/POLISH_0.3.1.md`. Validação Minecraft pendente.

## 0.3.0 — 04/11/2026 — três livros litúrgicos

- A colocação recusa posições com diário persistente ilegível ou não reconhecido, mesmo com bloco vazio, preservando registro e novo livro; dois testes de regressão cobrem a guarda.

- Acrescenta Missal Romano e Pontifical Romano como itens, blocos e visuais distintos, com modelos autorais construídos em Blender e atlas próprios.
- Integra textos da comunidade em catálogo offline com fontes, índices por grupos, busca, rubricas e marca de seção/página.
- Compartilha o porte, leitor seguro e transferência persistente sem duplicar sistemas nem transformar os novos livros em Evangelhos.
- Preserva identidade, tipo, marca e metadados após colocação, reinício e retirada. Callbacks antigos também verificam o tipo do livro.
- Mantém UUIDs, modelo e conteúdo do Evangeliário; Aspergillum e outros add-ons não mudam.
- Expande testes de domínio, UI e mundo; validação nativa de 0.3.0 permanece pendente. Contrato e limites em `docs/THREE_BOOKS_0.3.0.md`.

## 0.2.5 — 25/10/2026 — página e navegação

- Substitui o leitor estreito por uma página em JSON UI com texto nativo, papel marfim, filete e moldura vinho. Margens, entrelinha e altura útil maiores; rolagem contida e navegação fixa.
- Separa Leituras, Passagem e Livro; preserva a página ao voltar, o rascunho após erro e a revalidação do exemplar em cada resposta assíncrona.
- Compacta formulários, mantém títulos longos completos na legenda e une somente a continuação minúscula entre versículos contíguos, sem reescrever palavras.
- Corrige a sobreposição vanilla observada na 0.2.0, o rodapé fora da moldura e as camadas de texto de botões identificadas na 0.2.1. Revisões anteriores preservadas como diagnósticos.
- Ajusta a altura do seletor de capítulo após o teste 0.2.2 e remove o espaço de descrições vazias nos menus.
- Simplifica os símbolos dos créditos após a fonte substituta observada na 0.2.3, preservando autores, ano, licença e fontes.
- Revalida a entidade visual antes de ler propriedades, após aviso de referência expirada no carregamento da 0.2.3. Teste reproduz a falha e verifica recuperação sem alterar identidade ou gerar outro item.
- Acrescenta diagnóstico de formulários sem marcador. Mantém a apresentação nativa desses formulários; a disputa com RPs que alterem `server_form` continua sendo um limite de compatibilidade.
- Tipos, 42 testes e validação estrutural. Modelos, poses, calendário, corpus e identidades persistentes permanecem os mesmos da 0.1.5.
- Confirmada no cliente 26.52 em janela pequena e maximizada, instalada no devtest; Content Log final sem erros ou avisos e hashes instalados correspondentes ao pacote. Evidências e limites em `docs/VERIFICATION.md`.

## 0.1.5 — 24/10/2026 — interface final

- Remove o fechamento duplicado do rodapé. A janela nativa conserva X, Escape e a ação voltar da plataforma.
- Conserva o modelo e a calibração da 0.1.4, que passou pela inspeção física e pelo Content Log sem erros ou avisos. Os mesmos UUIDs permitem retomar os livros colocados e suas marcas.
- Confirma no cliente 26.52 a persistência de Jo 3,16 entre sessões, a retirada com marca preservada, o retorno a Hoje e as poses. Content Log final sem erros ou avisos; arquivos instalados e referências do mundo conferidos.

## 0.1.4 — 24/10/2026 — correção após inspeção no cliente

- Corrige os schemas de material, entidade e receita, os tempos de keyframe e a geometria invisível do bloco. `bone_visibility` usa Molang `0.0`, pois o booleano foi recusado pelo cliente 26.52.
- Recupera a pose após carregamento e mudança de câmera, renovando um controller próprio a cada 60 ticks. Guarda erros de despacho; a telemetria distingue elegibilidade de comprovação visual.
- Eleva o livro verticalmente com apoio bimanual; calibração de primeira pessoa independente. O binding neutro, identidades e estados públicos permanecem iguais.
- Reproduz os ícones com SwiftShader e recusa capturas quase transparentes. Páginas de até 600 caracteres e fechamento em português.
- Acrescenta câmeras temporárias no jogo, relatório de log e hashes instalados, verificação da pilha de packs e cálculo reproduzível de encaixe. Evidências e limites: `docs/VERIFICATION.md`.

### Revisões diagnósticas 0.1.1–0.1.3

Pacotes numerados e preservados para rastrear os testes. A 0.1.1 isolou bounds inválidos da geometria vazia; 0.1.2/0.1.3 revelaram o booleano de visibilidade recusado. A 0.1.3 confirmou recuperação automática da pose, leitura e porte elevado no cliente, mas ainda não passou na aceitação do bloco. Esses pacotes não são a entrega final.

## 0.1.0 — 24/10/2026 — candidato de teste

- Modelo autoral de 31 cuboides, capas articuladas, lombada, miolo, fitas e iconografia dos quatro Evangelistas. Atlas color/normal/MER de 256 px; ícones derivados da malha distribuída.
- Porte com os dois braços, animações próprias de transporte e colocação, apresentação independente em primeira/terceira pessoa e suspensão durante movimentos incompatíveis.
- Colocação aberta ou fechada, leitura, fechamento físico, retirada com metadata preservada, locks, revalidação, compensação e recuperação de transferências interrompidas.
- Leitor nativo com paginação, seleção por referência/capítulo/data, consulta privada, marca persistente e retomada de Hoje.
- Quatro Evangelhos completos da Bíblia Livre: 89 capítulos e 3.779 versículos. Calendário brasileiro offline de 2026–2027 com data de Brasília e opções para celebrações com leituras distintas.
- Tipos estáveis, 31 testes automatizados, validação estrutural e empacotamento com Microsoft Creator Tools. Testes de input, braços, renderização e Content Log dentro do Minecraft permanecem pendentes.

### Decisões e limites desta versão

- A primeira pessoa requer uma extensão condicional de `controller.render.player.first_person`. Packs que substituam o mesmo controller precisam de teste conjunto; nenhum `player.entity.json` é distribuído.
- Trinta referências do calendário contêm recortes a/b/c. Como a edição livre não fornece esse mapa, o leitor mostra os versículos completos, identificados explicitamente. A consulta manual não aceita sufixos sem mapa.
- A tradução é Bíblia Livre CC BY 4.0, não o texto litúrgico CNBB. O calendário usa uma fonte comunitária e correções identificadas, sem homologação nem próprios locais.
- A cobertura diária termina em 31/12/2027. O leitor integral permanece disponível fora desse período.
