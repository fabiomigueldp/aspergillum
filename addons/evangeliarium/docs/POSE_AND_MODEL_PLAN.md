# Evangeliário — modelo, porte e validação

Pesquisa e especificação em **24/10/2026**. Este documento define o trabalho de produção e os diagnósticos necessários. Não constitui aprovação visual, implementação de pack ou comprovação de paridade com o Minecraft.

## Resultado pretendido

O objeto deve ser reconhecido como um livro cerimonial real: capa frontal legível, lombada com espessura, corte das folhas, ferragens restritas a regiões plausíveis e fitas que nascem da encadernação. Na procissão, o jogador sustenta o livro fechado e ligeiramente elevado com as duas mãos. A capa fica voltada para a frente da marcha; cabeça e olhar continuam legíveis. Ao ser colocado, o mesmo livro aparece aberto, apoiado e orientado para a pessoa que irá lê-lo. Retirar recupera o exemplar fechado, sem alterar sua identidade ou a passagem selecionada.

O porte elevado é o comportamento normal de um exemplar na mão principal quando ambas as mãos podem participar. Não se exige um menu de animações, botão de pose ou gesto adicional para cada passo. Leitura, escolha de passagem e colocação são estados funcionais; a apresentação acompanha esses estados.

O padrão de qualidade é o de um objeto com massa e apoio. Os braços não remam independentemente durante a caminhada, a mão esquerda não flutua ao lado do livro, o volume não atravessa o rosto e a capa não gira como uma ferramenta de ataque.

## Evidência técnica e limites

### O que já existe neste repositório

- A baseline do Aspergillum usa item-slot binding, geometria `1.16.0` e camadas separadas de binding, apresentação e ação. Seus valores de pose pertencem ao aspersório e **não** são coordenadas universais para outros objetos.
- `src/presentation/animation-coordinator.ts` aciona `Player.playAnimation` em produção. A animação correspondente modifica `rightarm`, sem substituir o arquivo vanilla do jogador.
- O perfil `aspergillum-held-v1` do Avatar Lab possui calibração específica e métricas específicas de empunhadura. Um livro novo deve usar composição própria sobre o perfil genérico, preservando integralmente o perfil protegido.
- `addons/aurifrita/` demonstra o padrão de subprojeto independente: identidade, namespace, UUIDs, versão, gerador, validadores, pacote e catálogo de viewer próprios. Reutilizar esse isolamento e a infraestrutura, sem tratar a mitra como modelo de rig para mãos.

### O que a plataforma documenta

A Microsoft recomenda o binding por slot para attachables. `q.item_slot_to_bone_name(context.item_slot)` resolve o osso associado ao slot; a documentação descreve, por exemplo, `main_hand → rightItem` e `off_hand → leftItem`. As poses FP e TP são separadas por `context.is_first_person`. Essa é a base para o objeto acompanhar sua mão âncora. [Using Attachables](https://learn.microsoft.com/en-us/minecraft/creator/documents/attachables?view=minecraft-bedrock-stable).

`PlayAnimationOptions` estável oferece `blendOutTime`, `controller`, `nextState`, `players` e `stopExpression`. Os tipos instalados de `@minecraft/server` `2.9.0` confirmam essas propriedades; não há necessidade demonstrada de Beta APIs para iniciar o diagnóstico dos braços. A documentação não garante, por si só, a prioridade dessa animação sobre todo comportamento vanilla ou outro pack. [PlayAnimationOptions](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playanimationoptions?view=minecraft-bedrock-stable).

O schema de animação permite loops, peso de blend e `override_previous_animation`. Este último reinicia os bones citados para a pose-base antes de aplicar a animação; portanto é uma ferramenta com efeito deliberado sobre a composição, não um remédio genérico para desalinhamento. Um diagnóstico deve comparar composição aditiva e controle restrito dos dois braços, sem tocar em corpo, pernas, cabeça ou item roots desnecessariamente. [Animation schema](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/schemasreference/schemas/minecraftschema_actor_animation_1.8.0?view=minecraft-bedrock-stable).

Controllers permitem transições e crossfade por `blend_transition`. A mistura documentada é linear entre estados; aceleração e desaceleração do gesto devem ser autoradas na curva correspondente. [Animation Controllers](https://learn.microsoft.com/en-us/minecraft/creator/documents/animations/animationcontroller?view=minecraft-bedrock-stable).

### O que as amostras vanilla comprovam

A cópia local `.research/bedrock-samples` inspecionada corresponde ao commit `7844835b6baad4c0010f46901a4accf87413a022`, release **1.26.40.5**, de 05/08/2026. É referência técnica versionada, não declaração da versão mais recente do cliente.

Em `resource_pack/models/entity/humanoid.custom.geo.json`, cada braço normal é um cubo rígido ligado a um único bone de ombro. `leftItem` e `rightItem` são filhos desses braços. Não há articulação vanilla de cotovelo, punho ou dedos nem um solver de IK exposto por esse rig. A solução deve parecer natural dentro dessa anatomia; reproduzir literalmente mãos e cotovelos humanos exigiria outra geometria corporal e introduziria problemas de skin, Persona e coexistência. [Rig oficial](https://github.com/Mojang/bedrock-samples/blob/7844835b6baad4c0010f46901a4accf87413a022/resource_pack/models/entity/humanoid.custom.geo.json).

A animação vanilla `animation.player.first_person.map_hold` usa os dois braços, com posições, rotações e uma escala específicas de seu viewmodel. Seu controller seleciona estados de uma ou duas mãos por condições de `filled_map` e `shield`. Isso demonstra que o cliente apresenta dois braços em FP; não demonstra que um attachable customizado recebe automaticamente a mesma renderização ou que copiar a pose do mapa resolve um livro. [Animações FP oficiais](https://github.com/Mojang/bedrock-samples/blob/7844835b6baad4c0010f46901a4accf87413a022/resource_pack/animations/player_firstperson.animation.json), [controller oficial](https://github.com/Mojang/bedrock-samples/blob/7844835b6baad4c0010f46901a4accf87413a022/resource_pack/animation_controllers/player.animation_controllers.json).

## Fonte geométrica única

Autorizar uma única fonte do livro, em `assets-src/`, com semântica de peças e materiais. Os nomes seguintes são um contrato proposto para produção, ainda não IDs distribuídos:

```text
evangeliarium_bound               binding neutro
└── evangeliarium_presentation    calibração FP/TP
    └── evangeliarium_action      gesto local, normalmente neutro
        └── book_spine            referência da encadernação
            ├── cover_front      pivô na dobradiça da capa
            ├── cover_back       pivô na dobradiça da contracapa
            ├── page_block_left
            ├── page_block_right
            ├── ribbon_a
            └── ribbon_b
```

A fonte deve incluir âncoras diagnósticas `grip_right`, `grip_left`, `support_plane` e `reading_front`. Âncoras servem para construir e verificar o encaixe; não concedem estado nem criam a ilusão de um segundo binding nativo para o mesmo livro.

As duas apresentações são derivadas:

1. **Fechado/empunhado:** capa, contracapa e corte formam um volume contínuo; a mão principal ancora o objeto e a outra sustenta uma região marcada da borda inferior/lateral. Não duplicar a malha para cada perspectiva.
2. **Aberto/colocado:** as capas e os dois volumes de folhas são transformados pelos pivôs da encadernação. A lombada permanece coerente; páginas não se interpenetram nem deixam um vão que atravessa o livro. O suporte inferior repousa no plano de apoio, sem flutuação ou faces coplanares concorrentes.

O exportador produz geometrias estáticas aberta e fechada para o bloco e a geometria fechada vinculada para o attachable a partir desses mesmos dados. A geometria fechada colocada não conserva o binding da mão. Uma transição animada de abertura no mundo exige mecanismo visual adicional; não confundir animação de entidade com animação arbitrária de bloco. O primeiro diagnóstico prova colocação estática nos dois estados. A etapa final prevê entidade visual descartável para abertura contínua, depois de demonstrar seu lifecycle sem duplicatas ou órfãos. Se essa prova falhar, o resultado estático continua diagnóstico e a animação permanece pendente.

O texto integral do Evangelho pertence ao leitor nativo. A superfície 3D pode comunicar papel, rubrica, início de parágrafo e fitas, mas não deve prometer representar milhares de passagens dinâmicas em uma textura. A passagem escolhida permanece dado persistente e é exibida de fato na interface.

Dimensões e ângulos definitivos dependem da referência litúrgica escolhida e do diagnóstico de rig. Antes do detalhamento, produzir um modelo cinza com proporção de capa, espessura e duas áreas de apoio. Não aumentar o livro ou alongar braços apenas para esconder um erro de binding.

## Pose e movimento propostos

### Terceira pessoa

- Livro fechado à frente do peito alto, elevado o suficiente para a leitura processional da capa, com o limite superior abaixo da linha dos olhos. A projeção frontal do livro deve deixar o rosto legível; esta é a direção definida em `CONCEPT.md`, sujeita à calibração física.
- Os dois braços partem de ombros naturais e terminam nas áreas de apoio. A posição do livro deve ser resolvida junto com o alcance dos braços; calibrar cada mão isoladamente deixa o conjunto inconsistente.
- Um único frame de porte governa os dois apoios e o livro. Respiração e passo têm amplitude pequena e coerente. Pernas, cabeça e deslocamento continuam vanilla.
- A inclinação do livro não segue integralmente cada movimento vertical da câmera. Olhar para cima ou para baixo não deve lançar o livro através da cabeça. Limitar apenas a apresentação, preservando o controle do jogador.
- Entrada e saída com aceleração/deceleração suaves; colocar/retirar com gesto curto, pausa de contato e soltura. Não prolongar o bloqueio da interação para exibir uma animação.

### Primeira pessoa

- Composição própria, ancorada nas mãos, mostrando a parte interior/traseira plausível do exemplar fechado. Não duplicar os ângulos TP.
- Preservar orientação do mundo e retículo. Como alvo inicial, reservar a região central de 20% da largura × 15% da altura da tela para visão livre em repouso; reavaliar por FOV e dispositivo. É critério de design proposto, não limitação ou garantia do motor.
- Verificar se ambos os braços da skin realmente são renderizados para esse item customizado. Não pintar braços genéricos na textura do livro para disfarçar a ausência da mão esquerda.
- Não usar a pose do mapa como solução pronta. Ela é uma referência de apresentação bimanual e deve ser confrontada com o pipeline de attachables e a câmera real.

### Mão secundária e outros estados

`minecraft:allow_off_hand` controla se o item pode ocupar o slot secundário; não reserva a outra mão nem cria um modo bimanual. O livro deve inicialmente ser de mão principal e não deve mover, apagar, esconder ou substituir o conteúdo do offhand. [Allow Off Hand](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/itemreference/examples/itemcomponents/minecraft_allow_off_hand?view=minecraft-bedrock-stable).

A especificação recomendada é porte cerimonial bimanual com a mão secundária livre e uma pose de transporte segura quando ela está ocupada. A leitura e a colocação permanecem disponíveis. Esvaziar o offhand restaura o porte cerimonial sem menu. Esse fallback deve ser visualmente deliberado e documentado; um escudo atravessando o livro não é uma solução aceitável.

Natação, elytra, montaria e emote precisam de precedência explícita. A primeira candidata deve deixar esses comportamentos corporais assumirem o rig e usar transporte compatível, retomando a pose cerimonial ao sair do estado. Nunca congelar o corpo inteiro, impedir movimento ou tomar controle da câmera para sustentar a pose.

O protótipo usa animações com namespace próprio e evita substituir `player.entity.json`, controllers e animações vanilla. Ainda assim, outro pack pode animar os mesmos braços; nomes diferentes de animação não eliminam colisão de canais. Registrar uma matriz com Aspergillum, Ornatum/Aurifrita, offhand vanilla e um pack que modifica o jogador quando disponível. Compatibilidade universal com substituições do player não está comprovada.

## Diagnóstico de animação antes da arte final

1. Criar um pack diagnóstico isolado, de identidade própria, com livro cinza, dois marcadores de apoio e uma única pose exagerada para provar alcance dos dois bones, FP/TP e observador remoto.
2. Comparar acionamento de pose pelo attachable e animação no player via API estável. Não supor que declarar `leftarm` no attachable afeta o jogador em todos os caminhos de renderização.
3. Para a via de script, reconciliar equipar/trocar slot, mudança de inventário, spawn e dimensão com os eventos estáveis disponíveis. A cópia instalada dos tipos contém `playerHotbarSelectedSlotChange`, `playerInventoryItemChange`, `playerSpawn` e `playerDimensionChange`. Evitar reenviar `playAnimation` a cada tick.
4. Validar início, loop e saída por condição de item/estado. Testar parada local, perda do item, morte, troca de dimensão, desconexão e jogador que passa a observar a cena durante uma pose já iniciada. `stopExpression` não dispensa testes de cleanup nem comprova sincronização para quem chegou depois.
5. Comparar uma camada aditiva com uma animação que controla somente os dois braços. Medir o resultado composto durante caminhada, agachar, usar e ataque; não aprovar apenas os keyframes isolados.
6. Fixar a abordagem que conserva mãos e livro durante todo o ciclo. Só então congelar dimensões, âncoras, pose, transições e orçamento de malha/textura.

## Workbench: o que é reutilizável e o que falta

O Workbench já descobre modelos, attachables, texturas e animações por projeto registrado. `capture:assets` serve para vistas estáticas fechadas/abertas, materiais e topologia; `capture:equipment` compõe o equipamento na skin wide/slim. Os manifestos e hashes permitem repetir comparações com os mesmos inputs. Ler também `docs/MODEL_CAPTURE_TOOL.md` e `docs/AVATAR_LAB.md` na raiz.

Limites concretos encontrados no código atual:

| Local | Comportamento atual | Consequência para este projeto |
| --- | --- | --- |
| `viewer-3d/src/avatar-lab/avatar-scene.js` | FP só mantém `rightarm` e `rightsleeve` visíveis | Não pode aprovar duas mãos em FP sem extensão explícita |
| `avatar-scene.js`, `applyPose` | Perfil genérico usa ação `idle` e amostra o hold no tempo zero | `--times` não comprova uma nova timeline processional genérica |
| `viewer-3d/src/shared/avatar-contract.js` | Ações catalogadas são `idle`, `load`, `sprinkle` | Não existem ainda `equip`, `carry`, `place`, `retrieve` genéricos |
| `viewer-3d/src/shared/avatar-motion.js` | Amostrador genérico converte componentes com `Number`; não interpreta Molang arbitrário | Uma expressão dinâmica pode virar zero na prévia |
| `avatar-scene.js`, `applyAnimation` | Soma canais e aplica escala; não implementa toda a semântica de controller, blend e override | Uma pose correta no viewer pode compor de forma diferente no jogo |
| Métricas do perfil genérico | Registra merge e binding; não possui contrato bilateral específico | Erro de binding zero não prova que ambas as mãos sustentam o livro |

A extensão necessária deve ser pequena e compartilhada: ações declaradas no catálogo do projeto, visibilidade bilateral FP, avaliação explícita das expressões realmente usadas, composição documentada e métricas das duas áreas de apoio. Não embutir o evangeliário no perfil protegido do Aspergillum nem apresentar simulação parcial como equivalência completa.

O viewer continuará sem reproduzir Persona, câmera/near plane proprietários, hand bob completo, shader final, culling do cliente, rede, competição real de packs e input de dispositivos. Essas provas pertencem ao `.mcaddon` importado.

## Capturas e gates propostos

Depois de existir catálogo registrado e geometria válida, os comandos abaixo usam capacidades que já existem. O `--equipment` deve corresponder ao ID efetivamente publicado pelo futuro catálogo:

```powershell
npm run capture:assets -- --addon evangeliarium --equipment evangeliarium --views front,front-right,right,back,left,top,bottom --size 1200 --material classic --output out/asset-captures/evangeliarium/closed-classic
npm run capture:equipment -- --addon evangeliarium --equipment evangeliarium --action idle --views front,front-right,right,back,left,equipment-front,equipment-back --model wide --size 1200 --output out/avatar-captures/evangeliarium/carry-wide
npm run capture:equipment -- --addon evangeliarium --equipment evangeliarium --action idle --views front,front-right,right,back,left,equipment-front,equipment-back --model slim --size 1200 --output out/avatar-captures/evangeliarium/carry-slim
```

Não executar esses comandos como se o add-on já existisse. O modelo aberto terá seu `--model` real registrado após o primeiro build. Repetir as mesmas vistas em PBR e usar câmera/material/tamanho idênticos para antes/depois. A frente canônica Bedrock e a nomenclatura das vistas do capturador isolado diferem da composição de avatar; registrar no manifest qual face representa a capa, sem inverter a malha para satisfazer um nome de câmera.

Os números seguintes são **metas iniciais de diagnóstico**, não resultados medidos ou valores finais aprovados:

| Propriedade | Gate inicial proposto |
| --- | --- |
| Binding da mão principal | Erro de composição ≤ `0,05` unidade de modelo no preview |
| Apoio bilateral | Centro de cada região de apoio dentro da respectiva região da mão e distância às superfícies de contato ≤ `0,25` unidade; verificar por macro, não só por interseção de caixas |
| Volume livro–cabeça/corpo | Sem interseção positiva; folga alvo ≥ `0,5` unidade da cabeça nas poses de repouso |
| Escala dos braços TP | `1`; não alongar braços ou mangas para alcançar o modelo |
| Continuidade do movimento | Início/fim sem salto; amostragem a 60 Hz; investigar variação > `10°` por frame e toda quebra de velocidade no contato |
| Assentamento no apoio | Folga visual ≤ `0,1` unidade e nenhuma penetração positiva do suporte |
| Abertura/fechamento | Mesmas peças, UVs e materiais derivados; sem faces renderizadas com área coplanar sobreposta |
| Visibilidade FP | Ambas as mãos verificadas no cliente; retículo/área central livre conforme alvo e nenhuma interseção com near plane |

O contato de volumes não é suficiente: uma mão que apenas toca a quina pode passar em uma OBB e continuar parecendo desconectada. Registrar `grip_right`, `grip_left`, matrizes mundiais, distância, contenção, colisões e imagens macro. Para o livro, avaliar contato na superfície de apoio em vez de reutilizar a métrica de um cabo que atravessa o punho.

Matriz física mínima no Minecraft:

- Steve/wide, Alex/slim e Persona separadamente; camadas da skin, Aurifrita e vestes disponíveis.
- FP, TP frontal/traseira/lateral e observador remoto; FOV mínimo/padrão/máximo, 16:9, ultrawide e toque quando disponíveis.
- Equipar, manter parado, caminhar, correr, agachar, saltar, olhar vertical/diagonal, colocar, retirar e trocar rapidamente de slot.
- Mão secundária vazia, escudo, mapa e totem; natação, elytra, montaria e emote, com retorno limpo ao porte normal.
- Colocar sobre suportes aceitos pelo contrato funcional, orientar os quatro lados e testar distância curta/ângulos rasantes; retirar não deixa cópia visual.
- Entrar em multiplayer durante o porte, sair/voltar, morrer, mudar dimensão e recarregar mundo; nenhum braço fica preso e nenhum livro duplica.
- Gráficos clássicos e Vibrant Visuals; Content Log sem novo erro de geometria, animação, Molang, textura, material ou identificador do add-on.

Cada prova física registra versão real do cliente, versão dos packs, SHA-256 do `.mcaddon`, skin/modelo, controle, FOV, perspectiva, cenário, esperado/observado e Content Log. Vídeo de 60 FPS ajuda a localizar saltos; captura estática não comprova continuidade. A aceitação visual final continua sendo do usuário no Minecraft.
