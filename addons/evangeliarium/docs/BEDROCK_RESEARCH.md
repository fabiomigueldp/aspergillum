# Pesquisa de viabilidade — Minecraft Bedrock

Data de consulta: **24 de outubro de 2026**. Escopo: um add-on independente de evangeliário, com item cerimonial, colocação, retirada, abertura, leitura e seleção de passagens. Este documento registra capacidades documentadas e hipóteses que exigem diagnóstico no jogo; não certifica um pacote já implementado.

## 1. Versões verificadas

Foram consultados primeiro `package.json`, manifests, tipos instalados e implementação local de `CustomForm`. Depois, documentação e changelogs oficiais da Microsoft/Mojang. Não houve atualização de dependências nem alteração de packs nesta pesquisa.

| Superfície | Versão observada | Consequência |
| --- | --- | --- |
| Aspergillum no repositório | `1.2.5` | Referência existente; não é a versão do novo add-on. |
| Engine mínima do Aspergillum | `[1, 26, 40]` | Contrato já publicado deve permanecer isolado. |
| Tipos npm instalados | `@minecraft/server` `2.9.0`; `@minecraft/server-ui` `2.1.0` | Não contêm todos os membros estáveis mais recentes. |
| Minecraft instalado no Windows | `MICROSOFT.MINECRAFTUWP` `1.26.5203.0` | Verificado por `Get-AppxPackage`; corresponde à linha 26.52 disponível para diagnóstico local. |
| Última versão pública estável localizada | **26.52**, hotfix de 25/09/2026 | Distinguir release público de Preview/RC. [Changelog oficial 26.52](https://feedback.minecraft.net/hc/en-us/articles/49175370527501-Minecraft-Bedrock-Edition-26-52-Hotfix-Changelog). |
| Módulos estáveis recentes | `@minecraft/server` `2.10.0`; `@minecraft/server-ui` `2.2.0` | Liberados na linha 26.50; existência dessas versões npm também conferida com `npm view`. [Changelog oficial 26.50](https://feedback.minecraft.net/hc/en-us/articles/48826825649933-Minecraft-Bedrock-Edition-26-50-Changelog-Wilderness-Bound). |
| Documentação publicada mais recente | Contém também membros de Preview `1.26.70-preview.21` | Uma página com `view=minecraft-bedrock-stable` ainda pode mostrar sobrecargas ou propriedades marcadas como pré-lançamento. |

**Alvo proposto para Evangeliarium:** engine mínima `[1, 26, 50]`, Script API `2.10.0`, UI `2.2.0`, nenhum experimento. O runtime efetivamente testado deve ser registrado separadamente, começando pelo instalado `1.26.5203.0`. A opção permite pesquisar as melhorias recentes sem migrar o Aspergillum junto.

As páginas de módulos identificam os números estáveis e também listam versões beta/RC: [server](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/minecraft-server?view=minecraft-bedrock-stable), [server-ui](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/minecraft-server-ui?view=minecraft-bedrock-stable). Não declarar 26.60/26.70 como versões estáveis entregues a partir de material de Preview.

## 2. Matriz de recursos

| Necessidade | Capacidade verificada | Classificação e decisão |
| --- | --- | --- |
| Leitura com atualização sem fechar a tela | `CustomForm`, `ObservableString`, `ObservableUIRawMessage`, callbacks | Estáveis desde UI `2.1.0`; base recomendada. |
| Título, texto, separação e controles | `header`, `label`, `spacer`, `divider`, `button`, `dropdown`, `textField` | Estáveis; componentes nativos em sequência. Não equivalem a HTML/CSS. |
| Imagem dentro do formulário | `CustomForm.image`, `ImageOptions` | Estáveis em UI `2.2.0`; opcionais, sem depender delas para ler. |
| Botões lado a lado | `multiButtonRow` | RC `2.4.0-rc.1.26.70-preview.21`; fora da base estável pesquisada. |
| Opções adicionais no construtor | `new CustomForm(player, title, options)` | Sobrecarga de pré-lançamento; usar o construtor estável de dois argumentos. |
| Fonte arbitrária, margens em pixels, duas páginas diagramadas, CSS | Não expostos pelo contrato estável de `CustomForm` | Não prometer. Qualidade deve vir da seleção, hierarquia, ritmo e economia de controles. |
| Livro vanilla com páginas reais | `ItemBookComponent` | Estável e presente nos tipos instalados; alternativa limitada, não motor principal do acervo. |
| Item com identidade persistente | `ItemStack.setDynamicProperty`, `clone`, inventário | Estável; definir `max_stack_size: 1`. `clone` copia dados, mas não é serialização persistente por si só. |
| Estado persistente por bloco | `minecraft:block_entity` + `BlockDynamicPropertiesComponent` | API estável `2.10.0`; limite de **1 KiB por pack por bloco**. |
| Dados de bloco presentes em item | `ItemBlockDynamicPropertiesComponent` | Estável em `2.10.0`; não implica cópia automática de toda a identidade do item. |
| Carry-over automático por loot | `carry_over_block_entity_data`, `CarryOverBlockEntityDataFunction` | Introduzidos como experimentais; não foi localizada evidência suficiente de promoção integral do fluxo JSON. Não usar como requisito. |
| Interação/retirada | `onPlayerInteract`, eventos de item/bloco, inventário | Estáveis; autorizar e revalidar no servidor. |
| Destruição e recuperação | `onBreak`, `brokenBlockPermutation` | Estáveis, com restrições de evento documentadas; não pressupor snapshot de metadados anteriores. |
| Geometria colocada aberta/fechada | Bloco customizado, states, permutations, `bone_visibility` | Estável; adequado a estados discretos. |
| Abertura e virada contínuas | Entidade visual com bones, animações e propriedades sincronizadas | Caminho implementável; projeção sem autoridade sobre posse/conteúdo. Exige teste de lifecycle. |
| Orientação no chão | States de colocação; `n_way_visual_rotation` | Rotação visual disponível; colisão/seleção não acompanham automaticamente essa rotação. Testar sintaxe e bounds. |
| Contato com superfícies | `blockFace`, `faceLocation`, regras de suporte | Detectar contato é possível; encaixe correto em qualquer bloco de terceiros não é garantido. |
| Dia civil real | `Date.now()` no ambiente de script | Exemplo oficial usa a função. Data pertence ao host/servidor; fuso litúrgico precisa ser política explícita. |
| Dia do mundo | `getAbsoluteTime`, `getTimeOfDay`, ticks | Estáveis, mas não representam a data civil do calendário. |
| Download do Evangelho pela rede | `@minecraft/server-net` | Pré-lançamento e exclusivo do BDS; não funciona no cliente local ou em Realms. Fora do produto básico. |

O histórico por membro é decisivo: [changelog de server-ui](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/changelog?view=minecraft-bedrock-stable) e [changelog de server](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/changelog?view=minecraft-bedrock-stable). A presença de um nome numa página não substitui essa conferência.

## 3. Leitura: interface possível e limites

`CustomForm` é reativo: os textos e estados vinculados a observables podem mudar enquanto a tela permanece aberta. A composição dos controles é preparada antes de `show()`. Uma navegação pode usar slots de texto/controles existentes e visibilidade reativa; uma mudança estrutural precisa de outro formulário. [Introdução oficial ao DDUI](https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/intro-to-ddui?view=minecraft-bedrock-stable).

Proposta de leitor nativo: referência curta no título, data/celebração somente quando contextualizam a escolha, texto do Evangelho como conteúdo principal e ações somente quando têm função. Uma passagem curta não precisa de paginação. Uma longa precisa de segmentação sem truncamento, sempre por parágrafo ou limite de versículo. Controles de anterior/próxima só aparecem quando existe conteúdo nessa direção. A seleção de outra passagem fica numa ação única, sem repetir cabeçalhos, mensagens introdutórias ou confirmação de leitura.

O contrato de `ObservableString` tem máximo documentado de **5.000 caracteres por valor**. O limite não é um tamanho de página recomendado. Adotar orçamento menor validado em tela pequena, sem cortar frases e sem esconder texto. A referência e o identificador de segmento permanecem separados do texto; uma leitura nunca muda de passagem por uma atualização de relógio. [ObservableString](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/observablestring?view=minecraft-bedrock-stable).

Não há promessa documentada de largura exata, fonte por controle, restauração programática da rolagem, rodapé fixo ou leitura em duas colunas no contrato estável adotado. Esses detalhes devem ser medidos no formulário real. Usar os componentes de texto nativos preserva escala e acessibilidade melhor que rasterizar o Evangelho numa imagem. O recurso `image` aceita caminhos de imagens do Resource Pack; não é um webview. [CustomForm](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-ui/customform?view=minecraft-bedrock-stable).

`closeButton()` acrescenta fechamento inferior e um X; não acrescentar ainda outro botão manual de fechamento sem necessidade. Validar Escape/voltar, controle e toque no diagnóstico. O menu não deve depender de teclado textual: oferecer seleção de evangelista/capítulo/trecho; busca por referência como `Jo 1,1-18` é um atalho adicional.

O livro vanilla tem limite documentado de **50 páginas, 256 caracteres por página e título de 16 caracteres**. Além disso, a API age quando o componente existe; não comprova que um item customizado qualquer pode receber o leitor vanilla por simples declaração. Ele é uma alternativa para pequenos excertos exportados, após protótipo próprio, e não o repositório dos quatro Evangelhos. [ItemBookComponent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/itembookcomponent?view=minecraft-bedrock-stable).

## 4. Posse, colocação e retirada

O domínio deve definir uma única identidade do livro e uma única localização autoritativa: inventário, colocado ou entrega pendente. O snapshot contém versão do schema, `instance_id`, nome customizado, acabamento, seleção/marcador e propriedades que o contrato promete preservar. O acervo bíblico fica no pacote; o item armazena referências, não todo o texto.

`ItemStack.clone()` produz uma cópia exata em memória. Propriedades dinâmicas convencionais de item só podem ser gravadas em itens não empilháveis. Nada disso torna uma sequência de mutações inventário→bloco atomicamente transacional. Por isso, o adaptador precisa de revalidação tardia, exclusão por jogador/livro e rollback em falhas. [ItemStack](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/itemstack?view=minecraft-bedrock-stable).

Fluxo proposto:

1. Capturar slot, identidade, alvo, dimensão e orientação; verificar suporte, distância, modo de jogo e disponibilidade.
2. Adquirir sessão/lock; reler o item e o alvo imediatamente antes da escrita.
3. Preparar snapshot persistente e executar transferência com compensações para qualquer falha parcial.
4. Confirmar posse colocada; somente então iniciar efeitos de apresentação.
5. Na retirada voluntária, preparar um slot vazio real na mão/inventário e transferir exatamente uma identidade. Inventário cheio mantém o livro colocado; drop controlado fica reservado à recuperação após destruição.
6. Invalidar UI/sessões antigas antes de permitir nova mutação do mesmo livro.

Não há garantia de transação ACID entre saves de inventário, bloco e world properties. Projetar idempotência, estados recuperáveis e reconciliação de registros órfãos; ensaiar falhas controladas sem alegar imunidade a encerramento abrupto do processo.

### Propriedades de bloco versus snapshot

`BlockDynamicPropertiesComponent` permite `get`, `set` e medição de bytes, somente em blocos com block entity. Seu limite de 1 KiB comporta referências curtas e pequenos flags; não deve ser usado para guardar Evangelho, histórico de leitura ou snapshot arbitrário de propriedades externas. [BlockDynamicPropertiesComponent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/blockdynamicpropertiescomponent?view=minecraft-bedrock-stable).

O componente JSON `minecraft:block_entity` habilita dados por instância; isso não significa que todas as suas extensões atuais sejam estáveis. Particularmente, container arbitrário e armazenamento de entidades precisam de avaliação própria e não são necessários para este projeto. [Componente block_entity](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockcomponents/minecraftblock_block_entity?view=minecraft-bedrock-stable).

Recomendação inicial: adaptar o padrão já testado do repositório, com snapshot autoritativo em registro persistente por dimensão/chunk. Um pequeno identificador no bloco pode auxiliar a reconciliação na versão nova, mas não deve criar uma segunda fonte concorrente de verdade. A alternativa de manter tudo no bloco só é promovida após provar preservação em quebra, explosão, suporte removido, reload e item com nome longo.

O evento `onBreak` informa a permutation anterior, não um snapshot documentado das propriedades dinâmicas antigas. Se o bloco já tiver sido substituído, ler seus componentes não prova acesso à identidade anterior. O registro externo permite recuperar o livro nesses fluxos. [BlockComponentBlockBreakEvent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/blockcomponentblockbreakevent?view=minecraft-bedrock-stable).

Há uma distinção importante: a API `ItemBlockDynamicPropertiesComponent` foi promovida para estável, mas seu objetivo é acessar dados de bloco já presentes no item. A pesquisa não comprovou a promoção de todo o pipeline de loot que os transporta. Não confundir esse componente com `ItemStack` dynamic properties nem pressupor que preserva `nameTag` e quaisquer metadados. [ItemBlockDynamicPropertiesComponent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/itemblockdynamicpropertiescomponent?view=minecraft-bedrock-stable), [introdução experimental do carry-over](https://learn.microsoft.com/en-us/minecraft/creator/documents/update1.26.40?view=minecraft-bedrock-stable).

`onBreak` é acionável para destruição, mas mudanças de permutation não o disparam; `fill`/`setblock` só têm cobertura indicada quando usam `destroy`, e substituição de bloco `replaceable` não aciona esse evento. Esses limites exigem reconciliação conservadora, não promessa de recuperar itens após todo comando administrativo possível. [BlockCustomComponent](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/blockcustomcomponent?view=minecraft-bedrock-stable).

## 5. Modelo colocado, animação e superfícies

Separar o **bloco que autoriza interação** da **projeção que desenha a abertura** é o caminho recomendado para a etapa animada final. O primeiro diagnóstico usa estados estáticos aberto/fechado para provar posse e persistência. O bloco mantém estado lógico e bounds; o registry conserva a seleção. Na etapa animada, a entidade visual reproduz a malha e a abertura, sem inventário, drops ou autoridade para criar/remover um livro. Deve ser descartável e reconstruível pelo registro/bloco. Paginação privada da UI não anima a página pública de todos os leitores.

As propriedades de entidade `int`, `float`, `enum` e `bool` podem persistir e ser enviadas aos clientes com `client_sync`; os renderizadores/animações consultam esse estado. Isso oferece um canal apropriado para pose de abertura, sem transformar animação em confirmação da operação. [Entity Properties](https://learn.microsoft.com/en-us/minecraft/creator/documents/introductiontoentityproperties?view=minecraft-bedrock-stable).

A geometria de bloco pode alternar geometria ou visibilidade de bones por state. Não foi identificado, nesta pesquisa, um controlador de animação esquelética contínua de bloco comum equivalente ao das entidades. Antes de adotar a projeção permanente, medir: entidade faltante, duplicada, órfã, unload/reload, remoção por comando e observador entrando depois da abertura. Uma versão diagnóstica pode usar apenas a pose aberta estática para isolar persistência de apresentação.

Para orientação, `minecraft:transformation.rotation` trabalha em incrementos de 90°. Não gerar uma solução de 16 rotações simplesmente passando 22,5° a esse campo. [Transformation](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockcomponents/minecraftblock_transformation?view=minecraft-bedrock-stable).

`minecraft:geometry.n_way_visual_rotation` documenta rotação visual por state a partir de formato 1.26.30; não altera colisão/seleção. A documentação atual tem divergência de representação entre descrições de geometria, portanto a sintaxe efetivamente aceita em 26.52 deve ser ensaiada num bloco mínimo. O Aspergillum já usa geometrias rotacionadas geradas; reutilizar esse método é fallback conhecido, sem editar arquivos gerados à mão. [Geometry](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/blockcomponents/minecraftblock_geometry?view=minecraft-bedrock-stable).

Não oferecer a promessa “qualquer superfície” antes de definir o contrato. Uma laje inferior ocupa o mesmo voxel que a região vazia sobre ela; um livro como bloco não pode simplesmente ocupar esse voxel sem substituir a laje. Colocar um anchor no voxel seguinte e deslocar apenas o visual exige bounds e suporte específicos. Mesa de terceiros, escada, tapete, água e pistão são casos próprios.

Primeiro contrato adotado em `CONCEPT.md`: topo completo de blocos sólidos. Lajes superiores, outras superfícies e um eventual suporte/ambão próprio são ampliações posteriores, com testes de contato e remoção. `placement_filter` pode restringir colocação e sobrevivência; se o suporte desaparece, o mecanismo pode soltar o bloco, e esse caminho precisa manter a identidade exatamente uma vez. [Definição oficial de placement_filter](https://github.com/MicrosoftDocs/minecraft-creator/blob/main/content/forms/block/minecraft_placement_filter.form.json).

## 6. Dia litúrgico, fuso e funcionamento offline

Scripts executam no servidor, inclusive no mundo local hospedado pelo jogador. A documentação usa `Date.now()` em exemplos multiplayer, sustentando seu uso como fonte de relógio real. Ela não fornece o fuso individual de cada cliente. [Arquitetura multiplayer e exemplo de Date.now](https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/multiplayer-scripts?view=minecraft-bedrock-stable).

Proposta: `CivilDatePort` fornece uma data civil calculada a partir do instante do host e do fuso configurado para o calendário do mundo. Para a primeira configuração brasileira, adotar explicitamente UTC−03:00; não usar o fuso do processo implicitamente. Se o produto oferecer zonas com horário de verão, incluir regras verificáveis ou biblioteca compatível embarcada; não presumir disponibilidade de `Intl`/base IANA no runtime Bedrock.

Oferecer data manual apenas como ajuste de calendário/teste, separada da referência bíblica escolhida. Data litúrgica, país/calendário, tradução e seleção de celebração são decisões de conteúdo. O motor não deve deduzir uma única leitura universal só a partir do dia do mês.

Ao abrir em modo diário, resolver e congelar referência e texto para aquela sessão. A virada de meia-noite atualiza novas aberturas, não troca o texto durante a leitura. Usar ticks para animação/cooldown e relógio civil para calendário; dormir ou executar `/time set` não muda o Evangelho do dia real. Validar relógio inválido ou saltos de data sem corromper bookmarks.

O acervo autorizado e as tabelas/regras litúrgicas devem acompanhar o pacote para funcionar offline. `@minecraft/server-net` continua pré-lançamento, só funciona no Bedrock Dedicated Server e é explicitamente indisponível no cliente e em Realms. Uma integração de rede opcional futura deve ser outro adaptador e não requisito para abrir/ler o livro. [server-net](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server-net/minecraft-server-net?view=minecraft-bedrock-experimental).

## 7. Arquitetura recomendada

| Camada | Responsabilidades |
| --- | --- |
| Domínio puro | Identidade, localização do livro, referência canônica, seleção diária/livre, calendário, paginação sem perda, estados e invariantes. |
| Aplicação | Colocar, retirar, abrir, resolver leitura, navegar e encerrar sessão; portas para inventário, persistência, calendário e apresentação. |
| Infraestrutura Bedrock | Componentes/eventos, leitura de slot, snapshot/registro, block states, relógio do host e adaptação da UI. |
| Apresentação | Modelo/attachable, pose do portador, entidade visual, som discreto e formulário. |
| Conteúdo | Corpus licenciado, referências e calendário versionados; validação de cobertura e proveniência no build. |

Leitores simultâneos podem ter cursores privados, evitando que a paginação de um interrompa outro. A escolha persistente do livro e sua retirada continuam exigindo exclusão/revalidação. Uma sessão de leitura contém identidade, localização esperada, revisão da seleção e snapshot da passagem. Encerrar quando o objeto some, muda de dimensão ou deixa de satisfazer o alcance contratado. Fechar a UI não equivale a retirar o item.

## 8. Diagnósticos antes da implementação final

1. **Baseline sem experimentos:** pack mínimo isolado com engine/API propostas; importar no `1.26.5203.0`; registrar hash, manifests e Content Log. Não alterar UUIDs do Aspergillum.
2. **Leitor longo:** passagens curtas, maiores que 5.000 caracteres, mudança reativa, fontes/escala de UI, toque, controle, Escape/voltar, tela dividida, troca de formulário e cancelamento `UserBusy`. Verificar leitura completa e nenhum texto cortado.
3. **Seleção:** referência válida/inválida, limites de capítulo/versículo, intervalos múltiplos quando suportados, ausência de rede e idioma. Nenhuma busca vazia substitui a seleção anterior silenciosamente.
4. **Transferência:** colocar/retirar repetidamente, dois jogadores, troca de item/slot no intervalo, inventário cheio, drop e recolhimento, modos de jogo, morte, logout e falha injetada em cada escrita. Uma identidade resulta em um livro.
5. **Metadados:** nome com acentos e limite máximo, acabamento, bookmark, propriedade externa conhecida, reload e limite em bytes. Exercitar schema futuro preservado e dados inválidos isolados.
6. **Destruição:** quebrar, explodir, remover suporte, `setblock destroy`, substituição administrativa, pistão e unload. Definir e documentar explicitamente quais comandos destrutivos externos não têm garantia de recuperação.
7. **Visual colocado:** órbita de câmera em 16 ângulos, quatro orientações de colocação iniciais, bounds, seleção/click, abertura/fechamento, livros vizinhos e superfície aprovada; entidade visual perdida/duplicada e observador remoto entrando depois. Dezesseis orientações de colocação são uma ampliação distinta, ainda não assumida.
8. **Calendário:** 23:59→00:00 no fuso configurado, ano bissexto, mudança de ano, relógio do host diferente do cliente, seleção manual e sessão atravessando meia-noite. O modo diário resolve uma referência verificável.
9. **Desempenho:** comparar 1, 16 e 64 livros colocados, vários leitores e chunks alternando; registrar profiler e quantidade de entidades/registros antes de escolher frequência de reconciliação.

Passar validação JSON/tipos e capturas externas prova coerência estrutural, não renderização Bedrock. Aceitação visual, input, persistência física e Content Log permanecem gates do `.mcaddon` final importado pelo usuário.
