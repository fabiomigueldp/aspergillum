# Estratégia de testes e QA

## Princípio

Automação prova regras e estrutura; somente o Minecraft prova input, cache, animação, câmera, skin, rendering e integração real. Uma revisão não é aprovada por inspeção de JSON ou por “não haver erro de build”.

## Gate visual da cabeça, do pomo e da Mesa do Sacristão — v1.1.5

- [ ] fechar o jogo, remover revisões anteriores e importar somente `Aspergillum-1.1.5.mcaddon` com manifests `[1,1,5]`;
- [ ] confirmar Content Log sem erro/warning de `@minecraft/server-ui`, `@minecraft/common`, custom component, formulário, item, attachable, geometria, textura, tradução ou block state;
- [ ] fabricar/obter a Mesa do Sacristão, colocá-la nos dezesseis setores e confirmar frente da gaveta, colisão, seleção, som de madeira e impossibilidade de movimento por pistão;
- [ ] usar um aspersório nomeado, com `instance_id`, carga parcial e propriedade customizada; ele sai da mão, repousa inteiro e centralizado sobre o veludo, sem ultrapassar bordas, e abre a UI exatamente uma vez;
- [ ] orbitar frente, lados, trás e topo: o veludo preenche todo o nicho sem z-fighting, as bordas elevadas permanecem intactas e não existem os dois antigos apoios dourados no tampo;
- [ ] confirmar respiro visível abaixo de **Mesa do Sacristão**, abaixo de **Perfil de aspersão**, abaixo de **Acabamento** e acima de **Restaurar padrão**;
- [ ] confirmar que perfil e acabamento pertencem ao mesmo fluxo contínuo, sem faixa/divisor que pareça uma seção vazia entre eles; somente o grupo final **Concluir e retirar**/**Fechar** mantém divisor próprio;
- [ ] confirmar hierarquia compacta da UI: perfil, acabamento, restauração, conclusão e **Fechar**; não aparecem item/cargas, texto genérico de gratuidade, demonstração ou status persistente;
- [ ] em `pt_BR`, confirmar **Fechar** em vez de `Close`; em `en_US`, confirmar `Close`; nenhum texto fica cortado e o menu não exige rolagem indevida na mesma resolução das capturas 1.1.1;
- [ ] alternar `Clássico`, `Processional` e `Contido`; a seleção aplica imediatamente, persiste na lore e só afeta a próxima rajada;
- [ ] combinar os três metais com as três empunhaduras; as nove aparências atualizam o item sobre a mesa, o ícone, a mão, a terceira pessoa e a composição na caldeirinha;
- [ ] aproximar a câmera da extremidade prateada do cabo e movê-la lentamente em ângulos oblíquos: a antiga faixa preto/prateada não aparece; placa, aro vazado e couro permanecem estáveis, sem pixels alternantes, faces duplicadas ou cintilação;
- [ ] observar o aro por cima, por baixo e pelos quatro lados: ele envolve o couro sem buraco central aparente, tampas internas, linha preta, barras desconectadas ou mudança brusca de espessura;
- [ ] repetir a órbita com o item empunhado em primeira/terceira pessoa, no suporte de armadura, acomodado na caldeirinha e sobre a mesa; os mesmos dois estágios metálicos e a mesma emenda limpa aparecem em todas as apresentações;
- [ ] acomodar na caldeirinha um aspersório clássico e um dourado; orbitar lentamente por cima, por baixo e em ângulos rasantes, confirmando que anel inferior, domo inferior, corpo, domo superior, anel superior e terminal permanecem contínuos em todos os quadros;
- [ ] durante a órbita da caldeirinha, nenhuma tampa prateada/metalizada desaparece para revelar o corpo dourado ou a superfície situada abaixo; não há cintilação, moiré, triângulo, fenda central ou troca conforme a distância;
- [ ] usar mão, suporte de armadura e mesa como controles: a nova cabeça preserva exatamente a silhueta, as duas fileiras de perfurações e a distribuição de acabamentos anterior;
- [ ] confirmar que prata clássica + couro castanho reproduz a aparência 1.0.20 e que **Restaurar padrão** volta a `standard/classic`;
- [ ] usar **Fechar**: configuração já aplicada persiste e o item permanece na mesa; reabrir mostra os valores atuais;
- [ ] **Concluir e retirar** devolve exatamente o mesmo item e libera a mesa; com inventário cheio, o item é dropado uma vez sem apagar o snapshot antes da recuperação;
- [ ] agachar com mão vazia recupera o item sem depender da UI; outro item na mão não retira;
- [ ] quebrar mesa ocupada, recarregar mundo e sair/reentrar recuperam/preservam exatamente um item, sem duplicação da loot table;
- [ ] dois jogadores tentam editar a mesma mesa: somente um abre/edita; morte, respawn, logout, troca de dimensão e quebra liberam o lock;
- [ ] acomodar cada aparência na caldeirinha preserva cargas restantes e projeta o acabamento correto; retirar volta o state cosmético a clássico;
- [ ] perfil `standard` reproduz a rajada aprovada; `processional` é mais aberto/lento e `contained` mais estreito/preciso, todos com uma carga, 36 gotas e seis pulsos;
- [ ] repetir smoke da 1.0.20: `12+4`, `14+4`, `16+4`, Creative finito, reload/quebra, FP/TP, áudio, bridge e cancelamento pré/pós-release;
- [ ] registrar hash do `.mcaddon`, plataforma, controles, gráficos, locale, resultado e Content Log antes de declarar GO.

## Gate de docking parcial — v1.0.20

- [ ] importar somente `Aspergillum-1.0.20.mcaddon` após fechar o jogo e remover revisões anteriores;
- [ ] confirmar manifests `[1,0,36]` e Content Log sem erro/warning de script, dynamic property, tradução, áudio ou block state;
- [ ] em Survival, Adventure e Creative, provar `12/16 + 4/4 → 16/16 + 0/4`, `14/16 + 4/4 → 16/16 + 2/4` e `16/16 + 4/4 → 16/16 + 4/4` após acomodar e retirar;
- [ ] confirmar HUD distinto para transferência integral, parcial, caldeirinha cheia e item vazio, sem `%` residual em `pt_BR`/`en_US`;
- [ ] confirmar que áudio molhado corresponde somente a `1..4` cargas efetivamente transferidas e zero transferência toca apenas o encaixe mecânico;
- [ ] reload, quebra, explosão e inventário cheio restauram exatamente as cargas restantes, nome, `instance_id`, cosmético, perfil e propriedades customizadas;
- [ ] snapshot V1 existente recupera item `0/4` sem duplicar a água previamente devolvida;
- [ ] falha/rollback não publica água, ocupação ou snapshot parcial; Espectador não acomoda nem retira;
- [ ] repetir agachar + usar e mão vazia em teclado/mouse, controle e toque; cada gesto produz um único commit;
- [ ] repetir smoke visual, animações, 36 gotas/seis pulsos, bridge e áudio da 1.0.19b.

## Gate de polimento visual — v1.0.19b

- [ ] importar somente `Aspergillum-1.0.19b.mcaddon` após fechar o jogo e remover revisões anteriores;
- [ ] confirmar nos manifests `[1,0,35]` e Content Log sem erro/warning de geometria, UV, textura, material ou tamanho de atlas;
- [ ] comparar item e composição acomodada em frente/trás/direita/esquerda/topo/base: couro, pomo, haste, férula, seis volumes da cabeça e terminal correspondem sem peça simplificada ou cor trocada;
- [ ] nas quatro faces laterais do corpo central, confirmar duas fileiras de perfurações retangulares e uma faixa equatorial metálica; nenhuma face pode ficar lisa ou depender de transparência;
- [ ] orbitar por cima e por baixo: anel inferior, domo inferior, corpo central, domo superior, anel superior e terminal mantêm paredes contínuas e mipmaps sem sangramento;
- [ ] em primeira pessoa, olhar para cima/frente/baixo com FOV mínimo/padrão/máximo: item permanece à direita da mira, não cresce perceptivelmente e não cruza o plano próximo;
- [ ] em terceira pessoa, repetir repouso/carregamento/aspersão com Steve/wide, Alex/slim e Persona: grip continua no punho e cabeça não cruza rosto, ombro ou tórax;
- [ ] inspecionar caldeirinha vazia e nos quatro níveis: metal martelado não vira ruído quadriculado, água não herda o material e bordas/handle conservam contraste;
- [ ] repetir em gráficos clássicos e Vibrant Visuals: prata, ouro e couro permanecem distinguíveis, sem dominante roxa, emissividade ou reflexo plástico excessivo;
- [ ] executar `npm run capture:models -- --subject all --size 1024 --material pbr` e comparar com `out/model-captures/polish-baseline-pbr` usando opções idênticas;
- [ ] repetir smoke 4/16, docking/undocking, reload/quebra, locator, 36 gotas/seis pulsos, animações e áudio da 1.0.19;
- [ ] registrar hash do `.mcaddon`, plataforma, FOV, skin, gráficos, resultado observado e Content Log antes de declarar GO.

## Gate visual — v1.0.19a

- [ ] importar somente `Aspergillum-1.0.19a.mcaddon` após fechar o jogo e remover revisões anteriores;
- [ ] confirmar nos manifests importados `[1,0,34]` e Content Log sem erro/warning de geometria, UV, textura ou material;
- [ ] em terceira pessoa, orbitar por baixo, por cima e pelos quatro lados: pomo, haste, férula, anel inferior da cabeça, anel superior e terminal mantêm paredes contínuas;
- [ ] repetir a órbita em repouso e durante carregamento/aspersão, sem face piscando, sumindo ou invertendo;
- [ ] repetir em primeira pessoa olhando para cima, frente e baixo; silhueta, mira e plano próximo permanecem idênticos à baseline aprovada;
- [ ] repetir com Steve/wide, Alex/slim e Persona; o cabo continua atravessando o punho e a cabeça não cruza corpo/rosto;
- [ ] confirmar couro somente no grip, prata no pomo/haste/cabeça e ouro somente na férula sob a cabeça;
- [ ] repetir em gráficos clássicos e Vibrant Visuals: PBR não altera a cor-base nem cria dominante roxa;
- [ ] confirmar que o Fidelity Renderer mostra `UV Bedrock-safe: per-face inteiro` e nenhuma incompatibilidade;
- [ ] nos dois viewers web, inspecionar especialmente os texels pretos da cabeça: cada região permanece retangular sobre a face, sem losango, triângulo, costura diagonal ou troca entre norte/sul;
- [ ] repetir smoke 4/16, docking, locator, 36 gotas/seis pulsos e áudio da 1.0.19 para provar ausência de regressão.

## Gate de áudio — v1.0.19

- [ ] importar somente `Aspergillum-1.0.19.mcaddon` após fechar o jogo e remover revisões anteriores;
- [ ] Content Log não contém erro/warning de evento, OGG, codec, caminho, definição ou chamada de áudio;
- [ ] ouvir todas as variantes por repetição suficiente de fill, load `1..4`, dock `0..4`, undock, dry, prepare e release;
- [ ] 200 aspersões válidas produzem exatamente 200 releases, nunca dois por ação;
- [ ] 100 cancelamentos antes do tick 5 produzem zero release molhado;
- [ ] 100 tentativas vazias produzem clique seco e zero release/água;
- [ ] `sprinkle.prepare`, `load.prepare` e `dry` são privados do executor em multiplayer;
- [ ] fill, commits, dock, retorno de água, undock e release são audíveis espacialmente por observadores;
- [ ] nenhuma família com mais de uma variante repete imediatamente na fronteira de ciclos;
- [ ] sons `1→4` comunicam magnitude crescente sem salto de volume desconfortável;
- [ ] troca de slot, dimensão, morte, logout e falha de cooldown não deixam cue tardio;
- [ ] animação, 36 gotas/seis pulsos, bridge, curvatura controlada, economia 4/16 e persistência não regrediram;
- [ ] registrar plataforma, saída de áudio, volume master, distância e resultado de cada família;
- [ ] antes de distribuição comercial, substituir os SFX free-tier por mídia gerada sob licença paga e repetir todo este gate.

## Pipeline automatizado

`npm run check` deve cobrir:

- TypeScript contra `@minecraft/server` estável fixado;
- testes unitários do domínio;
- links e invariantes básicos da documentação;
- geração determinística de assets;
- bundle ESM;
- sintaxe, referências, manifests, geometrias, animações, partículas e PNGs.

`npm run package` também cria o `.mcaddon`, SHA-256 e relatórios oficiais em `dist/validation/<versão>/`.

### Evidência visual automatizada

`npm run capture:models -- --subject all` gera nove vistas fixas e uma prancha composta para o aspersório, a caldeirinha e a Mesa do Sacristão, vazias ou com o aspersório acomodado. O `capture-manifest.json` registra câmera, geometria, material, versão e opções. Essas imagens servem para revisão de silhueta, faces, UVs e comparação entre revisões; o gate dentro do Minecraft continua obrigatório para culling, shader, câmera, cache e integração reais.

## Cobertura automatizada a expandir

### Cargas e políticas

- todas as 85 combinações de carga/água (`0..4 × 0..16`);
- normalização de negativos, frações, `NaN`, infinito, strings e valores acima do máximo;
- Survival/Adventure consomem; Creative retém; Spectator nega;
- zero cargas nunca asperge, inclusive em Creative;
- carga Creative parcial permanece parcial ao voltar a Survival;
- cálculo de load soma sobre o valor normalizado.

### Identidade e schema

- item bruto e schema ausente;
- migração `0 → 2` e `1 → 2`;
- schemas 2→3 e schema 3 normalizado;
- schema futuro preservado e sinalizado;
- clone de atualização preserva ID e propriedades;
- cópia independente recebe novo ID;
- lore `RawMessage` regenerada.

### Sessões e concorrência

- item A inicia e item B ocupa o slot;
- troca de slot, dimensão, modo, distância, morte e saída;
- bloco quebrado, substituído, esvaziado ou ocupado;
- duas tentativas do mesmo jogador;
- dois jogadores no mesmo bloco;
- rollback na falha da primeira e da segunda escrita;
- cleanup e expiração de sessões/locks.

### Aspersão e matemática

- reserva, commit no release e cancelamento pré/pós-release;
- cooldown vazio versus cooldown válido;
- 36 gotas, seis pulsos e valores finitos;
- leque horizontal simétrico e vertical limitado;
- slerp pelo menor arco, resposta e limite angular;
- primeiro pulso suavizado;
- transporte paralelo sem flip em olhar vertical;
- partículas emitidas não mudam com a câmera;
- troca de item/dimensão cancela apenas pulsos futuros.

### Docking

- transferência parcial conservativa nas 85 combinações `0..16 × 0..4`;
- snapshot V1 migra para zero e V2 preserva cargas restantes;
- nome, ID, cosmético, perfil e propriedades preservados;
- retirada com inventário cheio;
- quebra, explosão, reload e limpeza de snapshot;
- pistão recusado ou registro movido de forma íntegra.

### Personalização

- catálogo cartesiano `3 × 3`, resolução/fallback de IDs e paridade de índices;
- aquisição/liberação exclusiva por jogador e mesa;
- troca de tipo do ItemStack preservando ID, carga, nome e propriedades;
- atualização/rollback de snapshot e state visual;
- close versus concluir/retirar, quebra, inventário cheio e lifecycle cleanup;
- ausência da demonstração e invariantes de custo zero nas alterações reativas;
- freeze do perfil dentro de uma aspersão já iniciada.

## Gate de input v1.0.17a

- [ ] com caldeirinha livre, segurar o aspersório, agachar e usar acomoda o item e remove-o da mão;
- [ ] a confirmação “Aspersório acomodado na caldeirinha” aparece exatamente uma vez;
- [ ] usar sem agachar continua iniciando o carregamento e nunca acomoda acidentalmente;
- [ ] mão vazia numa caldeirinha ocupada retira exatamente um item preservado;
- [ ] repetir em teclado/mouse, controle e toque quando disponíveis;
- [ ] Content Log não registra erro de `onUseOn`, custom component ou acesso a `isSneaking`.

## Gate de persistência v1.0.17

- [ ] item antigo/schema 1 mantém carga e recebe lore traduzida após entrar no inventário;
- [ ] mudar o idioma do cliente entre `pt_BR` e `en_US` muda a lore sem recriar o item;
- [ ] item com nome customizado conserva nome e `instance_id` após acomodar, sair do mundo e retirar;
- [ ] cosmético/perfil e uma propriedade customizada de teste sobrevivem ao ciclo de docking;
- [ ] `water_level + charges > 16` recusa o encaixe sem mudar bloco ou item;
- [ ] bloco ocupado + aspersório informa ocupação; bloco ocupado + outro item solicita mão vazia;
- [ ] inventário cheio faz o item ser entregue na mão vazia, inventário ou chão sem perda;
- [ ] quebrar a caldeirinha ocupada entrega uma caldeirinha e exatamente um aspersório preservado;
- [ ] explosão e `/setblock ... destroy` não duplicam nem perdem o snapshot;
- [ ] pistão não move a caldeirinha;
- [ ] reload do mundo preserva snapshots; retirada limpa o shard correspondente;
- [ ] dois itens com ID duplicado no mesmo inventário terminam com IDs distintos;
- [ ] item com schema maior que 3 permanece byte-logicamente intocado e ações mutáveis são recusadas;
- [ ] Content Log não contém erro/warning de dynamic property, `RawMessage`, custom component ou loot.

## Smoke test por revisão

Antes de testes extensos:

1. remover packs antigos e fechar o jogo;
2. importar o `.mcaddon` exato da revisão;
3. criar mundo sem experimentos;
4. executar `/function aspergillum/dev_kit`;
5. confirmar item, bloco, receitas e Content Log sem erro;
6. preencher, carregar, aspergir quatro vezes, tentar vazio, acomodar, retirar e quebrar;
7. repetir uma vez em primeira pessoa e uma vez em terceira pessoa.

Se o smoke test falhar, interrompa a matriz e capture a menor reprodução possível.

## Gate de alinhamento Bedrock 26.40 — v1.0.18f

- [ ] importar somente `Aspergillum-1.0.18f.mcaddon` após fechar o jogo e remover revisões antigas;
- [ ] confirmar nos manifests importados `min_engine_version = [1, 26, 40]`, `@minecraft/server = 2.9.0` e `format_version = 2`;
- [ ] criar mundo sem Beta APIs, Upcoming Creator Features ou qualquer experimento;
- [ ] Content Log não contém erro de dependência, manifesto, custom component, Molang, animação, partícula ou som;
- [ ] repetir o smoke test 4/16 e as interações de aspersão, docking, retirada, quebra e reload;
- [ ] confirmar que binding, poses, grip, sessões, locks, snapshots, cooldown, 36 gotas/seis pulsos e bridge permanecem sem regressão;
- [ ] repetir primeira/terceira pessoa local e observador multiplayer disponível;
- [ ] registrar hash do `.mcaddon`, versão AppX/Bedrock e sinais observados antes de declarar GO.

## Gate do codec de água — v1.0.18g

- [ ] importar somente `Aspergillum-1.0.18g.mcaddon` após fechar o jogo e remover revisões anteriores;
- [ ] Content Log não contém `too many input elements`, `expected an object`, bloco/receita inexistente, componente não utilizado ou falha de `dev_kit`;
- [ ] `/function aspergillum/dev_kit` fornece item e caldeirinha sem erro;
- [ ] um balde produz 16 unidades e superfície cheia;
- [ ] quatro carregamentos completos produzem `16→12→8→4→0`, cada um concedendo `4/4`;
- [ ] docking com cargas parciais prova quantidades ímpares e atravessa corretamente a fronteira radix `8↔9`;
- [ ] quatro superfícies representam `1..4`, `5..8`, `9..12` e `13..16`;
- [ ] Criativo preserva água e carga; Survival/Adventure consomem; Spectator permanece negado;
- [ ] overflow acima de 16 é recusado sem alterar item, states ou snapshot;
- [ ] reload preserva exatamente a quantidade e não registra warning atribuível ao add-on;
- [ ] binding, poses, animações, 36 gotas/seis pulsos, bridge, sons e docking permanecem visualmente idênticos à 1.0.18f.

## Gate da revisão v1.0.18e — capacidade 4/16

- [ ] importar somente `Aspergillum-1.0.18e.mcaddon` após fechar o jogo e remover revisões antigas;
- [ ] um balde produz 16 unidades lógicas e a superfície cheia;
- [ ] quatro carregamentos completos produzem `16→12→8→4→0`, cada um concedendo `4/4`;
- [ ] as superfícies mudam em `13..16` cheia, `9..12` ¾, `5..8` ½, `1..4` ¼ e `0` vazia;
- [ ] aspersões mostram `4/4`, `3/4`, `2/4`, `1/4`, `0/4`, sem `%` residual;
- [ ] item schema 2 com três cargas torna-se schema 3 com `3/4`, sem receber carga gratuita;
- [ ] no Criativo, carregar preserva a água exata e aspergir preserva a carga finita;
- [ ] acomodar devolve `0..4` unidades; soma acima de 16 é recusada sem alterar item ou bloco;
- [ ] animações, partículas, sons, binding, grip, sessões e snapshots permanecem idênticos à 1.0.18d;
- [ ] Content Log não contém erro de block state, bone `water_high`, Molang, lore ou schema.

## Gate da correção v1.0.18d — placeholders e tipografia localizada

- [ ] importar somente `Aspergillum-1.0.18e.mcaddon` após fechar o jogo e remover revisões antigas;
- [ ] inspecionar itens com `0/4`, `1/4`, `2/4`, `3/4` e `4/4`: nenhum valor contém `%` antes do número;
- [ ] carregar e aspergir nas mesmas quatro cargas: action bar mostra somente `n/4`, sem `%` residual;
- [ ] as quatro linhas da lore usam peso normal, sem inclinação itálica herdada;
- [ ] cinza, cinza-escuro, azul-claro e vermelho preservam a hierarquia aprovada;
- [ ] repetir em `pt_BR` e `en_US`, incluindo item existente criado antes da atualização;
- [ ] “Tem Propriedades Personalizadas/Has Custom Properties” pode conservar o estilo vanilla, mas as quatro linhas do add-on devem permanecer normais;
- [ ] Content Log não contém `RawMessageError`, chave ausente ou erro de tradução.

## Gate da correção v1.0.18c — compatibilidade runtime e recuperação do carregamento

- [ ] importar somente `Aspergillum-1.0.18d.mcaddon` após fechar o jogo e remover revisões antigas;
- [ ] Content Log não contém `Precomputed cubic interpolation requires keyframes have constant data` nem outro erro em `animation.aspergillum.player.load`;
- [ ] confirmar novamente que item e mão permanecem visíveis em 100% da carga em primeira pessoa;
- [ ] em terceira pessoa frontal, traseira e lateral, gravar a 60 FPS o intervalo da saída da água até o repouso;
- [ ] o braço percorre um único retorno, desacelera e alcança a pose-base sem teleporte ou solavanco final;
- [ ] não há segundo extremo, overshoot, rebote nem prolongamento perceptível depois do settle;
- [ ] grip e cabeça permanecem solidários ao braço, sem atravessar rosto ou ombro;
- [ ] commit continua ocorrendo uma vez no tick 10 e o gesto autoritativo termina em 16 ticks;
- [ ] cancelar/trocar item ou dimensão continua sem duplicar água, carga, som ou microgotas;
- [ ] Content Log não acusa `query.anim_time`, `variable.attack_time`, `variable.is_first_person`, `math.hermite_blend` ou animação desconhecida.

## Gate da correção v1.0.18a — carregamento em primeira pessoa

- [ ] importar somente `Aspergillum-1.0.18e.mcaddon`, fechar e reabrir o jogo antes do teste;
- [ ] em primeira pessoa, manter a câmera imóvel e carregar três vezes: item e mão permanecem visíveis do início ao settle;
- [ ] repetir olhando levemente para cima, em frente e para baixo: o item não cruza a mira, borda superior nem desaparece;
- [ ] confirmar que não existe reset, dupla partida ou pop no começo/fim;
- [ ] em terceira pessoa traseira, frontal e lateral, o arco de carga continua legível e não atravessa rosto/ombro;
- [ ] água e cargas mudam uma única vez no tick 10; cancelamento anterior não altera recursos;
- [ ] as duas microgotas e o som de commit continuam ocorrendo somente em carga válida;
- [ ] aspersão, docking, retirada e quebra permanecem idênticos à 1.0.18;
- [ ] Content Log não contém erro de Molang, animação, bone ou recurso do add-on.

## Gate do Release Candidate v1.0.18

- [ ] importar `Aspergillum-1.0.18g.mcaddon` após remover packs antigos;
- [ ] selecionar o item mostra quatro linhas de lore, incluindo agachar + usar e mão vazia;
- [ ] `pt_BR` e `en_US` traduzem lore e todas as mensagens do action bar no cliente correspondente;
- [ ] carregar com sucesso mantém animação/estado anteriores e acrescenta apenas duas microgotas discretas dentro da caldeirinha;
- [ ] falha de apresentação nunca altera carga, água, snapshot ou cooldown;
- [ ] carregar, aspergir, vazio, encher, acomodar, retirar, overflow e concorrência mantêm um único feedback coerente;
- [ ] Content Log não contém `RawMessageError`, sound event ausente, particle effect ausente ou erro do add-on;
- [ ] profiler com 1, 4, 8 e 16 jogadores é registrado antes de qualquer decisão de LOD;
- [ ] SHA-256 do pacote testado coincide com o entregue;
- [ ] decisão go/no-go é registrada em `docs/RELEASE_CANDIDATE.md` ou relatório derivado.

## Baseline de animação v1.0.15d — aprovada fisicamente

- [ ] malha real aparece em escala correta nas duas perspectivas;
- [ ] bound root acompanha integralmente a mão direita;
- [ ] cabo atravessa o punho em terceira pessoa com pose efetiva `[35, 0, -12]`;
- [ ] primeira pessoa mantém posição inferior direita e não bloqueia a mira;
- [ ] nenhuma face desaparece durante órbita completa;
- [ ] cada ação válida emite uma única rajada de aproximadamente 36 gotas;
- [ ] leque é mais largo horizontalmente e não forma halo/domo;
- [ ] câmera lenta durante a emissão curva os pulsos de forma suave e controlável;
- [ ] giro rápido fica limitado, sem estalo, inversão ou vetor inválido;
- [ ] câmera imóvel produz trajetória reta e repetível;
- [ ] gotas já emitidas não giram com a câmera;
- [ ] troca de item/dimensão cancela pulsos futuros;
- [ ] Survival/Adventure consomem exatamente uma carga;
- [ ] Creative preserva carga real e água, mas zero continua vazio;
- [ ] Spectator não interage;
- [ ] troca de item/slot/dimensão durante carga cancela sem alterar recursos;
- [ ] dois jogadores não carregam simultaneamente no mesmo bloco.
- [ ] carregamento executa gesto próprio de 0,8 s e confirma a transferência na imersão do tick 10;
- [x] braço executa um único swing vanilla de 0,9 s, sem reset nem segunda coreografia corporal;
- [ ] ponte de recuperação permanece invisível em primeira pessoa e neutra durante a primeira metade do swing;
- [x] em terceira pessoa, o follow-through alcança um único extremo e retorna continuamente à neutralidade antes do reset nativo;
- [ ] Content Log não acusa `variable.attack_time`, `variable.is_first_person`, `math.hermite_blend` ou bone desconhecido;
- [ ] trocar de item antes do tick 5 não consome carga nem emite água;
- [ ] trocar depois do release conserva a carga consumida e cancela apenas pulsos restantes;
- [ ] atravessar o olhar vertical não inverte subitamente o leque;
- [ ] primeira pessoa mantém o item visível em 100% dos frames da aspersão;
- [x] terceira pessoa apresenta um único início e um único retorno, sem reset ou solavanco final;
- [ ] `aspergillum_action` produz flick curto sem o cabo abandonar o punho;
- [ ] o flick local preserva a agilidade e assenta naturalmente antes do fim do swing nativo;
- [ ] água, som e commit começam juntos no tick 5;
- [ ] controller não dispara em ataque vazio nem ao reequipar durante cooldown residual;

Esses três itens foram confirmados pelo usuário no pacote 1.0.15d. Os demais continuam como regressão manual recorrente, não como pendência estrutural da animação.

## Baseline VFX v1.0.16c

- [ ] `holy_water_release` nasce na face da cabeça em primeira pessoa;
- [ ] `holy_water_release` nasce na face da cabeça em terceira pessoa local;
- [ ] observador remoto vê a mesma origem e apenas uma aspersão;
- [ ] o bridge de quatro microgotas é uma conexão curta, não um segundo leque;
- [ ] cada ação válida mantém exatamente uma rajada balística de 36 gotas em seis pulsos;
- [ ] ataque vazio não toca splash, não cria bridge e não cria gotas;
- [ ] preparação e release têm um único som próprio cada, sem splash duplicado;
- [ ] gotas mantêm área aparente legível em trajetórias frontais, laterais e oblíquas;
- [ ] billboards próximos da câmera permanecem menores que a cabeça do avatar;
- [ ] micro-splash é discreto, aparece somente no contato e não cria gameplay;
- [ ] bridge, gota e splash já emitidos ficam em world-space;
- [ ] steering lento/rápido continua com resposta `0.8` e limite `30°`;
- [ ] Content Log não acusa locator, efeito, evento, som ou Molang desconhecido.
- [ ] Content Log não contém `We do not support rotation being true and position being false`;
- [ ] o leque principal recupera visibilidade e suavidade equivalentes à 1.0.15d;
- [ ] a velocidade aparente é agradável sem perda do alcance anterior;
- [ ] o bridge lento permanece subordinado ao leque e não parece uma segunda ação.
- [ ] bridge, gotas distantes e micro-splashes permanecem azuis, sem dominante verde/amarela;
- [ ] repetir o teste cromático em sol, sombra, junto a tocha/fonte quente e com Vibrant Visuals quando disponível;
- [ ] a retirada de lighting local não transforma a água em um efeito branco ou excessivamente emissivo no escuro;
- [ ] fade continua suave e natural, sem mudança de trajetória, velocidade, lifetime ou tamanho em relação à 1.0.16a.
- [ ] a gota nasce azul aquático saturado, não branca/cinza ou ciano lavado;
- [ ] observar especificamente os últimos frames: nenhuma chave pode ser interpretada como amarelo/verde;
- [ ] o micro-splash no chão usa o mesmo idioma azul e desaparece sem mudança de matiz;

## Matriz final manual

### Modelos e câmera

- [ ] Steve/wide, Alex/slim e Persona;
- [ ] primeira pessoa, terceira traseira, frontal e lateral exata;
- [ ] FOV mínimo, padrão e máximo;
- [ ] 16:9, ultrawide e tela mobile;
- [ ] mão canhota, se suportada pela configuração testada.

### Movimento

- [ ] repouso, caminhada, corrida, agachamento e salto;
- [ ] voo, queda, natação, elytra e montaria;
- [ ] carregar/aspergir olhando horizontalmente, verticalmente e em diagonais;
- [ ] girar câmera lenta e rapidamente durante os pulsos.

### Bloco e inventário

- [ ] colocar em bloco, laje, mesa e pedestal; validar 16 rotações;
- [ ] níveis exatos `0..16` e quartos visuais `0`, `1..4`, `5..8`, `9..12`, `13..16`;
- [ ] acomodar/retirar repetidamente com nome e propriedades;
- [ ] transferência parcial satura em 16 e preserva o restante sem perda;
- [ ] inventário cheio;
- [ ] quebrar vazio, cheio e ocupado;
- [ ] explosão, reload e tentativa de pistão.

### Gameplay e ciclo de vida

- [ ] ataque no ar, entidade e bloco sem dano, knockback ou quebra;
- [ ] Survival, Adventure, Creative, Spectator e troca de modo carregado;
- [ ] troca de slot, morte, respawn, logout e mudança de dimensão em cada fase;
- [ ] dois jogadores no mesmo bloco e aspersões simultâneas;
- [ ] mundo local, multiplayer e Realm quando disponível.

### Plataforma e desempenho

- [ ] mouse/teclado, controle e toque;
- [ ] gráficos convencionais e Vibrant Visuals;
- [ ] PC, console e celular de baixo desempenho;
- [ ] 1, 4, 8 e 16 jogadores: medir profiler antes de criar LOD;
- [ ] nenhuma emissão duplicada, vazamento de sessão ou crescimento persistente de registry.

## QA específico de animação

- [ ] carregamento conduz a cabeça para baixo/frente e confirma no tick de imersão;
- [ ] aspersão dura 18 ticks, tem preparação, arco, release, follow-through e retorno;
- [ ] braço e item começam/terminam juntos sem duplicar rotações;
- [ ] cabeça nunca cruza rosto, ombro, tórax ou câmera;
- [ ] cancelar antes do release não consome; depois do release não reembolsa;
- [ ] vazio toca feedback seco e nunca aciona partículas.
- [ ] captura a 60 FPS confirma variação aparente inferior a aproximadamente `10°` por frame;
- [ ] repetir três vezes em FP, TP frontal e TP lateral com Steve/wide e Alex/slim;

## QA específico de locator/VFX

- [ ] origem fica a no máximo `0.10` bloco da ponta renderizada;
- [ ] primeira e terceira pessoa usam origem correta;
- [ ] locator acompanha a ação, mas partículas emitidas ficam em world-space;
- [ ] steering entre pulsos é preservado;
- [ ] nenhuma gota nasce atrás do jogador ou dentro do corpo;
- [ ] tamanho próximo à câmera permanece menor que a cabeça do avatar;
- [ ] sprites não colapsam de perfil nem desaparecem em ângulos oblíquos;
- [ ] micro-splash é discreto e não duplica gameplay.
- [ ] bridge contém quatro microgotas e não duplica o leque de 36;
- [ ] sons próprios ocorrem uma vez nos tempos `0.08` e `0.25`;
- [ ] tentativa vazia conserva apenas o feedback seco.

## Content Log e profiler

Com cheats:

```text
/function aspergillum/dev_kit
/reload
/script profiler start
/script profiler stop
```

Limpe o histórico antes de cada revisão. Mensagens antigas como `q.particle_age`, `q.is_swinging` ou `controller.render.item_default` indicam pack antigo: essas expressões não existem na baseline atual.

## Formato mínimo do relatório

```text
Add-on: 1.0.x
Minecraft/plataforma:
Controle/FOV/modelo:
Perspectiva e modo:
Artefato/hash:
Pré-condição:
Passos mínimos:
Esperado:
Observado:
Timestamp/screenshot:
Content Log:
Reproduzibilidade:
```

Vídeo ajuda a medir pose e sincronização; o Content Log ajuda a identificar parsing/recursos; o pacote e seu hash provam qual artefato foi testado. Os três tipos de evidência se complementam.
