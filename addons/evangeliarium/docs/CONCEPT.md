# Evangeliário: conceito e funcionamento

Documento de projeto, revisão 1, 24/10/2026. Requisitos do usuário: objeto convincente, leitura de verdade, colocação e retirada simples, braços elevados, movimento natural e interface limpa. Referência confirmada: rito romano, Brasil, horário de Brasília.

Implementação disponível: [versão 0.1.0](RUNTIME.md). Este documento preserva o conceito original; o runtime registra o que foi implementado e suas decisões explícitas sobre primeira pessoa, edição do texto e calendário. A aprovação física permanece sujeita ao [teste no Minecraft](TESTING.md).

## 1. Experiência principal

Um jogador entra numa igreja construída no Minecraft com o livro fechado nas duas mãos. A capa permanece voltada para a assembleia, o rosto fica livre e a marcha continua natural. Ao chegar ao local de leitura, coloca o livro sobre uma superfície. O miolo abre e repousa com espessura, lombada e fitas visíveis. Um uso mostra a passagem, sem uma tela de boas-vindas. Ao terminar, o jogador fecha a interface e recolhe o mesmo livro, com a mesma marcação.

O objeto comunica sua função pela forma e pelo gesto. O texto legível é apresentado pelo leitor nativo. As linhas da textura das páginas representam uma página impressa e não pretendem conter, em pixels microscópicos, o Evangelho selecionado. Texto no leitor será sempre extraído de um corpus verificado; não será inventado ou reescrito por IA.

O evangeliário litúrgico reúne perícopes para proclamação. O acesso integral a Mateus, Marcos, Lucas e João e aos dias úteis é uma ampliação digital deliberada. Ver a [pesquisa litúrgica](LITURGY_AND_CONTENT.md).

## 2. Forma e materiais

Direção escolhida: couro vinho profundo, aplicações douradas contidas, papel marfim, tinta escura e rubricas vermelhas. Couro e espessura são escolhas artísticas, não materiais/medidas atribuídos à edição física de referência. A cor da capa não precisa mudar com o tempo litúrgico.

A referência comercial de 34 × 24 cm fornece a proporção vertical. A escala no avatar será calibrada com um livro inicial de aproximadamente 7,0 unidades de altura, 5,0 de largura e 0,9 de espessura. Esses números são uma hipótese de produção, não uma pose aprovada nem uma reprodução métrica literal. A largura aberto fica próxima de 10,0 unidades, dentro de uma superfície de um bloco.

Hierarquia da capa:

1. Cruz central reconhecível a distância.
2. Quatro símbolos autorais: figura humana alada/Mateus, leão/Marcos, boi/Lucas e águia/João.
3. Moldura e cantoneiras com espessura real.
4. Textura de revestimento e gravações discretas, perceptíveis somente de perto.

O desenho é original. Referências de museus sustentam a tradição iconográfica; não autorizam copiar fotografias ou produtos comerciais. O verso recebe gravação simples, sem repetir a capa inteira. A lombada possui nervuras moderadas e continuidade com a encadernação. Não haverá pedras luminosas, partículas permanentes ou brilho emissivo.

### Geometria de produção

Uma fonte autoral descreve capas, lombada, dois volumes de folhas, folhas de transição e fitas. Estados fechado, aberto, transportado e ícone derivam dessa fonte. Não haverá um segundo livro simplificado ou deformado para o bloco.

- Capas com espessura e margens além do miolo.
- Miolo em planos graduais suficientes para sugerir curvatura, sem uma pilha de centenas de cubos.
- Dobra central com espaço e sombras naturais; folhas não atravessam a lombada.
- Relevos só onde alteram a silhueta ou a leitura do material.
- Faces internas omitidas; nenhuma superfície coplanar concorrente.
- Fitas com dois ou três segmentos, sem simulação física permanente.
- Abertura sustentada pela geometria do livro. Um atril baixo de madeira é acessório futuro, não um móvel que aparece automaticamente ao colocar o item.

Orçamento inicial de investigação: até 80 cuboides, até 20 bones e atlas de 256 × 256 para color/normal/MER, total aproximado de 768 KiB RGBA antes de mipmaps. São limites de projeto a medir, não alegações de desempenho. A iconografia deve continuar legível no atlas; se falhar, simplificar primeiro os desenhos. Elevar resolução exige comparação visual e memória medida.

UV por face, coordenadas inteiras, padding de pelo menos dois texels e dilatação coerente em todos os mapas. Cor base deve funcionar sozinha em gráficos clássicos; metalness/roughness complementam Vibrant Visuals. Papel e revestimento permanecem não metálicos. Não usar emissão para tornar ouro visível. Ícone deriva da malha final.

A [prancha](../assets-src/concept/evangeliarium-study.png) define intenção material e composição, não contagem de cubos, UV, precisão de encaixe ou shader Bedrock. Seus traços impressos são ilustrativos. O modelo final seguirá os limites acima.

## 3. Interações sem ambiguidade

“Usar” significa a ação equivalente de mouse, controle ou toque, não uma tecla fixa. A intenção de agachar é capturada no evento, antes de operações adiadas.

| Contexto | Ação | Resultado |
| --- | --- | --- |
| Livro selecionado, em pé | Equipar | Eleva suavemente para o porte cerimonial |
| Livro na mão, alvo sem interação própria e face superior válida | Usar | Coloca e abre; não abre UI automaticamente |
| Mesmo alvo | Agachar + usar | Deposita fechado, adequado à etapa no altar |
| Livro na mão, olhando para o ar | Usar | Abre o leitor privado, sem colocar o item |
| Livro fechado colocado | Usar | Abre fisicamente e mostra o leitor |
| Livro aberto colocado | Usar | Mostra o leitor na passagem do objeto |
| Livro colocado | Agachar + usar | Recolhe se houver espaço, sem exigir mão vazia |
| Leitor aberto de livro colocado | Retirar | Fecha a sessão e recolhe pela mesma transação |
| Leitor aberto | Fechar/voltar nativo | Fecha só a UI; livro permanece no mundo |
| Livro aberto colocado | Fechar livro, dentro de opções | Fecha fisicamente sem recolher |

Prioridade: bloco evangeliário existente, interação vanilla significativa, colocação, leitura no ar. Não interceptar baús, portas ou mesas de trabalho indiscriminadamente. Superfície inválida recebe um único aviso e não vira uma leitura acidental.

O gesto de recolher nunca troca ou apaga o item que o jogador já segura. Prefere slot selecionado vazio, depois slot livre. Se não existir slot, mantém o livro colocado e informa `Inventário cheio`. Não derruba silenciosamente um livro que o jogador tentou recolher. Quebra involuntária usa recuperação controlada no chão.

### Superfícies

O primeiro alvo distribuível é a face superior completa de blocos sólidos, incluindo mesas e altares construídos com esses blocos. O livro fica centralizado e voltado para quem o colocou. Não é necessário oferecer menu de rotação: recolher e colocar novamente resolve o caso comum.

Quatro orientações cardinais são suficientes para o primeiro diagnóstico. Dezesseis orientações só entram depois de provar hitbox, suporte e orçamento de permutations. Lajes inferiores, escadas, cercas, lectern vanilla e móveis de outros add-ons precisam de adaptadores explícitos de altura e ocupação; não se promete colocação universal baseada apenas no clique. Um clique na parede ou na face inferior não coloca o livro de lado. Não substituir líquidos, vegetação ou blocos existentes implicitamente.

Suporte removido encerra leituras e recupera uma única instância. Pistões não movem o bloco. Água/lava, explosões e comandos recebem políticas explícitas e testes; nenhuma física automática de entidade deve arrastar o livro.

## 4. Porte e animação

O rito pede o livro um pouco elevado. O padrão será diante do peito alto, abaixo dos olhos, sustentado nas duas margens inferiores. Não manter o livro acima da cabeça. A capa está voltada para a frente do jogador e o miolo protegido.

O rig vanilla tem braços rígidos, sem cotovelos ou dedos articulados. A naturalidade virá da posição dos ombros, orientação dos braços, apoio das mãos, peso e continuidade. Não haverá braços falsos, duplicação de mangas nem substituição do player inteiro para simular articulações que não existem.

O livro usa um único vínculo à mão principal. A mão secundária recebe pose coordenada para alcançar o apoio correspondente. Não dividir o livro entre duas raízes vinculadas. Raiz neutra de binding, apresentação por perspectiva e ação local permanecem separadas. Nenhuma calibração deste objeto altera `aspergillum_bound` ou a primeira pessoa aprovada do Aspergillum.

| Movimento | Intenção | Janela inicial a investigar |
| --- | --- | --- |
| Equipar | Mãos chegam ao apoio, livro assenta | 0,30–0,45 s |
| Repouso | Respiração quase imperceptível, sem drift de contato | Amplitude menor que 1° |
| Caminhar | Os dois braços e o livro acompanham o torso | Sem balanço alternado que solte o livro |
| Colocar | Aproxima, entrega ao suporte, abre após contato | 0,35–0,55 s |
| Abrir | Capas e miolo assentam sem elasticidade | 0,35–0,50 s |
| Recolher | Fecha e retorna à postura de porte | 0,35–0,50 s |
| Trocar de item | Libera a pose sem interferir no próximo item | 0,15–0,25 s |

Essas janelas são alvos de design. A transação de inventário tem um commit servidor independente, e nenhuma latência de animação pode duplicar o livro. Trocar slot, morrer, mudar de dimensão e desconectar cancela apenas fases ainda não confirmadas. Após commit, a propriedade física do objeto já foi transferida.

Primeira pessoa é calibrada separadamente: as mãos apoiam o livro na região inferior, com espaço de visão à frente. Não projetar literalmente a pose TP na câmera. Não criar ampliação/zoom involuntário. FP bimanual e transições só podem ser aprovadas no pacote importado.

Com a mão secundária ocupada, o porte bimanual cede a um transporte unilateral discreto até o jogador liberar o slot; não esconder escudo, mapa ou totem. Natação, elytra, uso de escudo, emotes e outros estados de alta prioridade suspendem a pose cerimonial e a restauram quando possível. A pose especial é cosmética: não altera velocidade, dano ou capacidade do jogador.

O [plano de rig](POSE_AND_MODEL_PLAN.md) registra os limites atuais do Avatar Lab e as provas necessárias antes de prometer esse resultado.

## 5. Leitor: texto primeiro

**Evolução de 25/10/2026:** a revisão 0.2 substitui a apresentação CustomForm inicial por ActionFormData/ModalFormData com JSON UI próprio. Margens, filete, rodapé fixo e cores são agora controlados pelo pack. O contrato atual de navegação e composição está em [UI_LAYOUT.md](UI_LAYOUT.md) e [RUNTIME.md](RUNTIME.md). A seção abaixo preserva as hipóteses originais; `Leituras` substitui `Escolher`, e marca/fechamento/retirada ficam em `Livro`.

Cena de uso: um jogador em cerimônia, com controle ou toque, precisa encontrar e ler uma passagem sem perder o lugar. A UI usa componentes do Minecraft e o tamanho de fonte/configuração do cliente. A personalidade está no objeto e na organização; não em substituir a interface global com texturas de pergaminho.

### Tela de leitura

Ordem vertical:

1. Referência, por exemplo `Lucas 13,1–9`.
2. Contexto compacto quando necessário: data/celebração, forma longa ou curta, edição `Bíblia Livre`.
3. Texto com parágrafos, sem uma caixa por versículo.
4. Navegação somente quando houver mais páginas: `Anterior`, `Próxima` e indicador discreto de progresso.
5. `Escolher`; `Retirar` somente se o livro estiver colocado.

Fechar é o controle nativo, sem outro botão redundante `Sair`, `Concluir` ou `OK`. Não exibir introduções como “Bem-vindo”, “Mergulhe na Palavra”, “Selecione abaixo” nem mensagens de sucesso após cada página.

A fonte é a nativa; fonte serifada própria, margens em pixels, footer fixo, duas colunas responsivas, botões lado a lado e animação de virada na UI não são promessas das APIs estáveis. Uma página visualmente sóbria pode ser excelente com uma coluna e controles nativos. Ver [pesquisa de UI](BEDROCK_RESEARCH.md).

### Paginação

Páginas por limite conservador de texto e fronteiras editoriais, nunca pelo número arbitrário de versículos. Calibrar inicialmente cerca de 650–900 caracteres em dispositivos reais; o tamanho final será o menor limite confortável encontrado. Um versículo excepcionalmente longo pode ser dividido em fronteira de frase sem cortar palavra, sempre preservando número e continuidade. Não usar limite de API não documentado como se fosse limite tipográfico.

Na leitura contínua, `Próxima` leva à próxima página do trecho escolhido, não muda silenciosamente para outro Evangelho. Ao escolher um capítulo inteiro, seu fim encerra a seleção; avançar de capítulo é uma escolha explícita. Partes descontínuas mantêm separação e referência corretas. A Paixão deve ser inteiramente navegável sem truncamento.

### Escolher

Três destinos principais: `Hoje`, `Data`, `Passagem`. Não abrir uma grade de 89 capítulos na primeira tela.

- **Hoje:** resolve a data no Brasil/Brasília e abre a leitura padrão validada. Se houver variantes de missa relevantes, mostra escolhas reais com nomes curtos.
- **Data:** campos Dia, Mês e Ano, com validação de calendário. Não presumir um date picker nativo inexistente.
- **Passagem:** `Evangelho` e `Capítulo`; `Versículos` opcional. Campo vazio significa capítulo inteiro. Um campo de referência direta, como `Jo 1,1–18`, fica disponível na mesma função para quem prefere digitar, sem obrigar teclado a usuários de controle.

Na implementação, não mostrar simultaneamente formulário completo e atalho redundante: uma ação `Referência` alterna a entrada direta com o seletor guiado. O parser aceitará Mt/Mateus, Mc/Marcos, Lc/Lucas e Jo/João, sem diferenciar caixa ou acentos.

Formatos obrigatórios: `Jo 3,16`, `Jo 1,1-18`, `Mt 5`, `Lc 2,1-5.8-14` e `Jo 7,53-8,11`. Intervalos fora do livro, invertidos ou incompletos são rejeitados com o menor erro útil. Partes `a/b/c` só serão aceitas quando o corpus editorial fornecer seus limites. Não inferir “metade do versículo”.

No mesmo menu ficam ações contextuais pouco frequentes: `Marcar no livro`, `Seguir hoje`, `Fechar livro` e `Créditos`. Só aparecem quando se aplicam. Não sobrecarregar a leitura com todas essas opções.

### Memória e leitores simultâneos

Cada objeto tem um modo persistente: **seguir hoje** ou **passagem marcada**. Livro novo segue hoje. Depois de `Marcar no livro`, retoma aquela referência mesmo no dia seguinte. `Seguir hoje` restaura a resolução diária. Essas decisões consolidadas prevalecem sobre alternativas exploratórias dos documentos de pesquisa.

Abrir uma UI cria uma sessão privada. Passar páginas, pesquisar e consultar outro Evangelho não muda a passagem de outros jogadores. `Marcar no livro` é uma edição explícita e curta, protegida por lock e revisão esperada. Dois leitores podem consultar ao mesmo tempo; uma retirada ou quebra invalida todas as sessões daquele objeto. Um leitor já aberto conserva seu trecho e data se virar meia-noite; nova leitura em modo diário usa a nova data. Nunca substituir palavras no meio da proclamação.

A ação `Fechar livro` muda somente a apresentação física compartilhada e incrementa a revisão. Consultas privadas já abertas conservam seu snapshot; qualquer escrita de uma UI com revisão antiga exige reabertura. Retirada, quebra ou perda de alcance encerram a sessão. A paginação privada não vira folhas no objeto de todos os leitores; abertura/fechamento e mudança pública de marca são os únicos candidatos a animação compartilhada.

A página de leitura fica na sessão e, opcionalmente, num marcador recente limitado por jogador/instância. Não gravar o texto inteiro nem um histórico infinito em propriedades do mundo. A marca pública guarda referência e edição, não a resolução ou fonte do cliente.

## 6. Evangelho de hoje e corpus

Fonte de data: relógio civil do host/servidor, convertido por um adaptador de calendário para `America/Sao_Paulo`. Não usar ticks solares, `/time set` ou a data do jogador remoto. O fuso é uma configuração do mundo e não muda de leitor para leitor.

O runtime precisa provar `Date.now()` e a conversão escolhida. Não presumir a presença completa de `Intl`/IANA no motor de scripts. Para a cobertura moderna inicial, uma política explícita UTC−03:00 pode ser usada com limites de validade e testes de virada de dia; não declarar que esse offset representa toda a história e todo o futuro de São Paulo.

Uma tabela anual offline, curada e versionada, contém data, celebração, resultado litúrgico, referência quando aplicável, opções, fonte e estado de revisão. Proposta inicial de cobertura de produto: 2026 e 2027 completos; essa cobertura ainda NÃO existe. Nenhuma tela deve alegar que está pronta antes de 730 registros de data válidos e suas alternativas terem sido revisados. Registro válido não significa obrigatoriamente uma referência diurna não vazia. Não gerar automaticamente anos indefinidos por uma fórmula incompleta de Páscoa.

O resolvedor distingue `reading`, `no_daytime_reading` e `outside_coverage`. No Sábado Santo, não inventa uma leitura de missa diurna: apresenta `Sábado Santo` e a opção explícita `Vigília Pascal`, quando catalogada, além da consulta livre. A celebração da Paixão na Sexta-feira Santa continua tendo leitura evangélica, embora não seja missa. Não confundir ausência de missa com ausência de Evangelho em qualquer celebração. A distinção entre o recolhimento do sábado e a Vigília está descrita pelo [Vaticano sobre o Tríduo Pascal](https://www.vatican.va/content/benedict-xvi/en/audiences/2010/documents/hf_ben-xvi_aud_20100331.html).

O ciclo A/B/C muda no Advento, não em janeiro. Os anos feriais I/II não devem ser confundidos com alternância dos Evangelhos. Brasil, celebrações próprias, transferências, memórias e missas de vigília/noite/aurora/dia recebem tratamento explícito. Não importar silenciosamente o calendário dos EUA. Não trocar universalmente a celebração às 18h; a seleção de vigília é consciente.

Calendário local da diocese/padroeiro é uma configuração futura. O primeiro produto deve declarar `Brasil` como perfil e permitir uma passagem manual para celebrações particulares, sem fingir que o calendário nacional cobre tudo.

Se a data estiver fora da cobertura validada: `Data fora do calendário` e `Escolher passagem`. A biblioteca inteira permanece disponível offline. Se houver uma fonte faltante ou contraditória, não escolher um Evangelho por similaridade ou por IA.

### Texto e licença

Proposta viável para protótipo: Bíblia Livre (`porbr2018`), CC BY 4.0, com crédito e proveniência. É uma edição Almeida/Textus Receptus, não a tradução litúrgica da CNBB. A UI identifica a edição discretamente; os créditos completos acompanham os arquivos e ficam acessíveis.

Para publicar a experiência como texto litúrgico brasileiro exato, incorporar somente uma edição autorizada e os recortes litúrgicos revistos, incluindo incipits e variantes. Licença aberta de software de calendário não concede automaticamente direitos sobre textos ou bases que ele consulta. Não remover ou fabricar versículos para forçar coincidência entre edições.

Conteúdo indexado por livro/capítulo/versículo, com segmentos de referência, edição, hash e origem. Compilação valida os 4 livros e 89 capítulos, IDs únicos, lacunas justificadas pela edição, acentos, pontuação e integridade de intervalos. Diferenças de versificação precisam de mapeamento documentado. Reprodução de texto e adaptação de formatação são registradas separadamente.

## 7. Estado, segurança e recuperação

Separar estado persistido, sessões de leitura e apresentação:

```text
Item único → reserva de colocação → livro colocado
Livro colocado → leitura privada (0..N leitores)
Livro colocado → edição curta da marca → livro colocado
Livro colocado → reserva de retirada → mesmo item único
Livro colocado → quebra/suporte perdido → recuperação única
```

Snapshot mínimo proposto:

```ts
type GospelSelection =
  | { kind: 'today'; calendarProfile: 'roman-br' }
  | { kind: 'passage'; editionId: string; ranges: VerseRange[] };

interface BookSnapshot {
  schemaVersion: 1;
  instanceId: string;
  revision: number;
  selection: GospelSelection;
  nameTag?: string;
  customProperties: Record<string, SerializableProperty>;
}
```

`VerseRange` e `SerializableProperty` são contratos de projeto, não APIs prontas. Ranges têm livro e início/fim completos. O snapshot completo pertence ao registry por dimensão/chunk; block states contêm apenas aparência/orientação. Propriedades dinâmicas de bloco poderão carregar uma chave compacta, sem depender de um limite de 1 KiB para metadados arbitrários do item.

Na colocação: validar suporte e espaço, adquirir lock de jogador/coordenada, capturar slot+instância, preparar snapshot, revalidar no commit, transferir inventário/bloco/registry defensivamente, depois emitir som e abertura. Na retirada: invalidar callbacks por revisão, reservar destino de inventário, entregar uma instância, remover estado colocado e só então liberar a posse. Ordem concreta das escritas e compensações será demonstrada por testes de falhas em cada etapa.

Não existe transação atômica nativa entre inventário, bloco e persistência. `try/catch` e rollback reduzem falhas comuns, mas não são prova de atomicidade num encerramento abrupto. Operações têm ID e registro de fase; a recuperação reconcilia localização e instância sem fabricar cópias diante de estado ambíguo. Se não puder provar onde está o item, preserva o registro para diagnóstico em vez de conceder outro automaticamente.

Survival transfere o item. Creative também move a instância selecionada para preservar unicidade; novas cópias obtidas do catálogo recebem novos IDs. Adventure respeita as permissões do mapa: leitura pode ser permitida, mas colocação/retirada não contorna bloqueios. Spectator não altera o mundo. Schema futuro desconhecido não é regravado.

Animação e entidade visual são descartáveis. Se o renderer perder a entidade, o registro e o bloco continuam autoritativos. Reconciliação local em carga/chunk e atualizações relevantes remove duplicatas e reconstitui a apresentação. Não varrer todos os chunks nem criar IA para cada livro. Renderização estática aberta e fechada precisa funcionar antes de acrescentar a projeção animada prevista para o produto final. Se o diagnóstico de entidade falhar, não declarar a abertura contínua concluída.

## 8. Mensagens e acessibilidade

| Situação excepcional | Texto proposto |
| --- | --- |
| Sem espaço para recolher | Inventário cheio |
| Superfície incompatível | Coloque sobre uma superfície plana |
| Endereço ocupado | Sem espaço para o livro |
| Referência inválida | Confira a referência |
| Capítulo inexistente | Capítulo inválido |
| Versículo inexistente | Versículo inválido |
| Edição não contém o segmento | Trecho indisponível nesta edição |
| Objeto removido durante a sessão | Livro recolhido |
| Edição concorrente | O livro foi alterado. Abra novamente |
| Calendário fora de cobertura | Data fora do calendário |

Textos localizados, curtos e emitidos uma vez por intenção. Sucesso normal é o próprio objeto ou a mudança de página. Não usar chat global para leitura, toast por versículo, mensagens repetidas de preparação ou instruções técnicas em UI.

Foco visível, ordem previsível, navegação completa por controle, fechamento nativo, sem função exclusiva de hover, duplo clique ou temporização de segurar botão. Toque consegue retirar pela UI. Informação não depende só de vermelho/dourado. Sem áudio de voz automático, música, brilho pulsante ou efeitos que atrapalhem cerimônia. Os sons de capa, página e apoio são curtos e discretos, somente após ações válidas.

## 9. Limites de aceitação

O conceito fica preservado quando o pacote final demonstra: livro reconhecível fechado/aberto; duas mãos em contato e rosto livre; leitura real sem truncamento; passagem marcada persistente; uso simples nos três tipos de input; concorrência sem duplicação; calendário declarado e verificável; Content Log sem novos erros.

Até esse teste, naturalidade do rig, paridade visual e qualidade do formulário são hipóteses a comprovar. Arte conceitual, render web, testes unitários e validação estrutural têm papéis complementares; nenhum substitui o Minecraft.
