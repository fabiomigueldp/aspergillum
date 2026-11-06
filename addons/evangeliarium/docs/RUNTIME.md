# Implementação 0.3.0

A expansão acrescenta Missal Romano e Pontifical Romano com tipos físicos, conteúdo e índices próprios. [Contrato e verificação dos três livros](THREE_BOOKS_0.3.0.md). A evidência nativa descrita para 0.2.5 é histórica; a aceitação de 0.3.0 no Minecraft permanece pendente.

O carregamento e a consulta das entidades visuais verificam `Entity.isValid` antes de acessar propriedades. Uma referência já expirada é ignorada; a recuperação periódica do bloco continua responsável por recriar sua apresentação. Critério da API: [Entity.isValid](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable#isvalid). O teste de regressão reproduz o aviso capturado na 0.2.3.

Estado em 25/10/2026: revisão de UI e leitura no Minecraft 26.52. Os resultados executados e limites de aceitação estão em VERIFICATION.md. Este documento registra a implementação efetiva e prevalece sobre hipóteses ainda escritas no futuro nos documentos de concepção.

## Plataforma e identidade

Bedrock mínimo `1.26.50`, alvo instalado investigado `1.26.5203.0` (26.52), `@minecraft/server 2.10.0`, `@minecraft/server-ui 2.2.0`. Não exige Beta APIs, Creator Features experimentais ou acesso à rede. Não altera dependências nem packs do Aspergillum.

| Contrato | Identificador |
| --- | --- |
| Item | `evangeliarium:book` |
| Bloco | `evangeliarium:book_stand` |
| Entidade visual descartável | `evangeliarium:book_visual` |
| Behavior Pack | `363c1fb0-517e-4d3e-9423-fb29d7694612` |
| Resource Pack | `f30aeaf1-af34-436c-9037-e43b6a89ff76` |
| Estados públicos do bloco | `evangeliarium:open`, `evangeliarium:visual`, `evangeliarium:direction` |

UUIDs, namespace, states e schema passam a ser contratos de compatibilidade a partir da distribuição. Alterações exigirão migração explícita e outra versão.

## Organização e autoridade

`src/domain` valida referências, páginas, datas de Brasília, seleção e revisão sem importar Minecraft. `src/application/transfer.ts` coordena transferência por interfaces. `src/infrastructure` adapta inventário, mundo, registros e locks. `src/presentation` contém leitor e pose. `src/bootstrap` registra eventos/componentes e compõe essas camadas.

O estado do livro contém schema, `instanceId`, revisão e seleção. O Evangeliário usa `today` ou passagem fixa; os novos livros usam índice ou seção/página. O tipo físico é conferido pelo catálogo e snapshot em cada transferência. A consulta de um leitor não muda a marca pública. Registros de estado desconhecido permanecem intactos no mundo sem impedir a leitura de outros exemplares. Marcar incrementa a revisão; callbacks de uma tela antiga deixam de poder alterar a instância. O servidor valida jogador vivo, modo, dimensão capturada pela sessão, distância, slot, tipo, identidade e revisão antes de operações que exigem essa autoridade.

O item não empilha. Ao colocá-lo, um snapshot preserva tipo, nome, lore, propriedades dinâmicas, `canPlaceOn`, `canDestroy`, `keepOnDeath` e `lockMode`. O snapshot tem orçamento de 7.500 caracteres e é rejeitado antes da retirada do inventário se excedê-lo. Criativo move o item real; cópias detectadas recebem outra identidade e conservam a marca.

O registro por dimensão/coordenada usa fases `placing`, `placed`, `taking` e `dropping`. Transferências síncronas possuem locks de jogador/bloco e compensação diante de falhas. A retomada adia chunks descarregados e donos desconectados, reconhece itens já devolvidos e recria o visual a partir do registro. Processa até 16 registros a cada 10 ticks. Isso é recuperação defensiva, **não uma transação ACID entre saves do motor**; uma interrupção abrupta entre persistências independentes continua exigindo teste em mundo descartável.

Sobrevivência e Criativo podem colocar, marcar, abrir/fechar e retirar. Aventura permite consulta; Espectador é negado. Retirada com inventário cheio conserva o livro no mundo. Quebra direta pelo jogador usa a mesma retirada; perda de suporte ou remoção externa usa recuperação no chão. O loot table é vazio para não criar uma segunda cópia genérica.

## Interação física

Usar no ar abre o leitor; usar a face superior de um suporte aceito coloca aberto; agachar + usar deposita fechado. O suporte inicial é uma lista conservadora de famílias de blocos vanilla cheios, como pedra e tábuas. Lajes, escadas, folhas, superfícies parciais e blocos customizados não são suportes. Interações significativas, como baús, portas, mesas, blocos de notas e blocos de outros add-ons, preservam seu comportamento próprio.

Usar um livro colocado abre e lê; agachar + usar recolhe. `Retirar`, em `Leituras > Livro`, oferece a mesma ação. Fechar a UI não fecha nem recolhe o objeto. `Fechar livro`, no mesmo menu, muda somente o estado físico. A passagem permanece no item através da colocação e retirada.

O bloco é a autoridade. Uma entidade sem colisão apresenta a abertura com interpolação; é descartável e recriada quando necessário. O bloco tem geometria estática de fallback para um erro de criação do visual. Não há duas cópias visíveis deliberadamente sobrepostas.

## Modelo, texturas e braços

Evangeliário original: `assets-src/design.mjs`. São 31 cuboides, nove bones no attachable e oito no livro colocado, abaixo dos orçamentos de 80/20. Capas, lombada, miolo, relevos e fitas derivam do mesmo modelo. O livro é vinho e dourado, com papel marfim e iconografia autoral simplificada. Três mapas de 256 × 256 fornecem cor, normal e MER; metalness fica nas ferragens, emissão é zero e o acabamento base independe de PBR.

UVs são inteiros por face, com padding. Geometria `1.16.0`, raiz `evangeliarium_bound` neutra e binding exato `q.item_slot_to_bone_name(context.item_slot)`. O ajuste fica na camada de apresentação. A abertura gira a capa e seu conjunto de páginas ao redor da lombada. Os traços impressos são decorativos; o texto selecionado aparece no leitor.

`assets-src/pose.mjs` registra a pose dos braços e a transformação compensada do livro. `Player.playAnimation` inicia o porte para os observadores relevantes e novos observadores próximos. Um controller exclusivo é renovado a cada 60 ticks: o primeiro envio pode chegar antes de o cliente terminar de carregar, e mudanças de perspectiva também exigem recuperação. A pose não usa blend dependente de `q.anim_time`, evitando reiniciar a elevação em cada renovação. A pose para ao trocar de item, ocupar a mão secundária, nadar, planar, montar, dormir ou executar emote. Os braços vanilla são rígidos: não se inventou uma articulação de cotovelo inexistente no rig.

Primeira pessoa: o controller vanilla esconde os braços quando um item está equipado. A implementação estende condicionalmente **apenas** `controller.render.player.first_person`, preservando as expressões originais e mostrando os braços para o livro nas condições seguras. A base fixada é o [sample da Mojang, commit 7844835](https://github.com/Mojang/bedrock-samples/blob/7844835b6baad4c0010f46901a4accf87413a022/resource_pack/render_controllers/player.render_controllers.json). Não há override de `player.entity.json` ou do animation controller vanilla. Outro RP que altere esse render controller pode competir por prioridade. Essa é uma exceção documentada à intenção inicial de não substituir controllers do jogador. A integração separada de JSON UI está descrita na seção de leitura.

As capturas wide/slim e os ícones são reproduzíveis, mas usam Three.js. A calibração empírica do motor, o campo de visão, skins e a combinação com animações vanilla precisam de QA dentro do Minecraft. Não tratar o ajuste numérico ou a captura externa como pose aprovada.

## Leitura e licença

Texto: **Bíblia Livre**, © 2018 Diego Santos, Mario Sérgio e Marco Teles, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). [Página da edição](https://ebible.org/porbr2018/copyright.htm), [projeto](https://sites.google.com/site/biblialivre/) e [fonte VPL](https://ebible.org/Scriptures/porbr2018_vpl.zip). Arquivo de origem SHA-256 `1f71b7765795ae7cc416a9255c7d9c3a3932ce868206fa762606c7438c8fc682`. Extração reproduzível em `prototype/import_corpus.py`; a adaptação organiza referências e páginas, sem reescrever o texto.

O corpus contém Mateus 1.071, Marcos 678, Lucas 1.151 e João 879 versículos: 3.779 em 89 capítulos. É uma edição livre identificada, não a tradução da CNBB. A atribuição e os links também estão em `Créditos` dentro do pack.

O leitor usa `ActionFormData` e `ModalFormData` estáveis com JSON UI próprio. Cada página contém versículos inteiros, até 850 caracteres. O corpo rola quando necessário; título e navegação permanecem fixos. Continuação minúscula entre versículos contíguos permanece no mesmo parágrafo, sem alterar palavras. Referências muito longas passam integralmente à legenda rolável, preservando um título curto. Anterior/Próxima aparecem somente quando úteis, em posições fixas ao lado de Leituras.

Leituras reúne Hoje, Passagem, Data, Celebração quando existir alternativa e Livro. Passagem oferece os quatro Evangelhos/capítulo/versículos e referência digitada. Livro reúne marca, modo diário, fechamento físico, retirada e créditos. Voltar e cancelamento de busca conservam a página. Erros de entrada preservam o rascunho. Respostas assíncronas conferem a geração da sessão e a identidade/revisão do exemplar antes de alterar o estado.

O pack substitui o ponto compartilhado `server_form.main_screen_content` e condiciona a apresentação aos marcadores privados nos títulos. Formulários sem marcador seguem a apresentação vanilla. Não muda HUD, inventário nem fontes globais. Outros RPs que substituam o mesmo catálogo podem competir por prioridade; o isolamento visual não é garantia universal de composição. Fontes, medidas, limitações e diagnóstico: [UI_LAYOUT.md](UI_LAYOUT.md).

Referências aceitam capítulo inteiro, intervalos, partes descontínuas e passagem entre capítulos. A validação recusa livros fora dos quatro Evangelhos, referências inexistentes, intervalos invertidos, repetidos ou sobrepostos. A consulta manual recusa sufixos a/b/c sem mapa editorial. Páginas de uma sessão permanecem estáveis à meia-noite; `Hoje` consulta a data atual de Brasília novamente.

## Calendário brasileiro

Cobertura offline: 01/01/2026 a 31/12/2027, 730 datas consecutivas, 765 opções após normalização e deduplicação. Brasília é calculada como UTC−03:00 a partir do relógio civil do host; o tempo do mundo Minecraft não define o dia litúrgico.

Fonte de referências e títulos: API comunitária [Liturgia Diária v2](https://github.com/Dancrf/liturgia-diaria/blob/main/docs/v2/README.md), `https://liturgia.up.railway.app/v2/`. Os snapshots armazenam referências, data de obtenção, origem e hash da resposta. Não incorporam as traduções ou orações retornadas pela API. Não houve contorno do HTTP 403 da API CNBB.

O importador obteve 729 datas. A data 27/03/2027 recebeu registro manual explícito de Sábado Santo/Vigília, Mc 16,1–7: inferência do ciclo B apoiada pela [leitura da Vigília de 2024 no USCCB](https://bible.usccb.org/bible/readings/033024.cfm), também ciclo B. A procedência distinta está no snapshot. O relatório de cache completo contabiliza 730 datas.

Normalizações editoriais em `tools/content.mjs`:

- Sábado Santo distingue ausência de Missa diurna e a opção da Vigília.
- Ramos prioriza a Paixão, mantendo o Evangelho da entrada como alternativa.
- Páscoa prioriza Jo 20,1–9; a opção vespertina permanece disponível.
- Natal distingue Vigília, Noite, Aurora e Dia, com Jo 1,1–18 por padrão no dia 25. Referências conferidas na [fonte das Pontifícias Obras Missionárias](https://www.ppoomm.va/en/notizie-eventi/notizie/2021/nativity-2021.html).
- Entradas misturando ciclos em 06/08, 10/10 e 17/10/2027 preservam o primeiro conjunto compatível com B e excluem os conjuntos de outros ciclos; o snapshot original fica intacto.
- Um marcador residual no fim da referência de 31/10/2026 é removido. Espaços, travessões, alternativas `ou` e rótulos são normalizados.
- Trinta referências possuem segmentos a/b/c. Sem mapa compatível com Bíblia Livre, o calendário expande para os **versículos completos**, exibindo essa indicação. A referência original fica no manifest. Não afirma reproduzir o recorte litúrgico exato.

Testes verificam continuidade e existência de todas as referências, transferências brasileiras selecionadas, Aparecida, Natal, Ramos, Páscoa e Vigília. Isso não substitui revisão litúrgica humana integral dos 730 dias. Próprios diocesanos/paroquiais e cobertura posterior a 2027 não foram incorporados. Fora do período, o leitor informa a ausência de calendário e mantém a escolha livre.

## Build e evidência

`npm run check` gera assets e conteúdo, verifica tipos, executa 58 testes de domínio/aplicação/adaptadores simulados/UI e valida estrutura. `npm run package` acrescenta o `.mcaddon`, hashes e Microsoft Creator Tools offline. As referências a ingredientes vanilla das três receitas geram avisos offline conhecidos; qualquer outro warning, Error ou Failure interrompe o empacotamento.

Saídas: `dist/releases/` e `dist/validation/0.3.0/`. `release-summary.json` registra bytes, hash, arquivos e avisos. O Content Log começa pendente e só recebe aceitação por `runtime-audit.mjs --archive` após comprovar versão, hashes, referências únicas e ausência de erros. Nenhuma revisão já importada é substituída sob o mesmo número.

O [roteiro manual](TESTING.md) completa a evidência necessária. Um pacote que passa no validador não constitui aprovação de animação, input ou renderização.
