# Changelog

## 1.0.13 — 2026-08-03

- preservados sem alteração o binding `rightItem`, a geometria `1.16.0`, o grip base e a pose aprovada de primeira pessoa;
- refinada apenas a apresentação de terceira pessoa para `position [5, -1.5, -2.25]` e `rotation [10, 0, 0]`, produzindo pose efetiva aproximada `[35, 0, -12]`;
- corrigida a soma de carregamento para usar sempre a carga normalizada, inclusive diante de propriedades persistidas inválidas;
- introduzidas políticas explícitas de consumo: Sobrevivência/Aventura consomem água e cargas, Criativo retém ambas e Espectador é negado;
- mantidas cargas persistentes finitas no Criativo: o símbolo `∞` é somente feedback contextual e nunca um valor gravado no item;
- adicionado `aspergillum:instance_id` persistente a cada ItemStack para impedir que um item diferente receba o resultado de um carregamento iniciado por outro;
- implementadas sessões únicas por jogador, lock temporário por caldeirinha e revalidação de dimensão, slot, identidade, distância, água, ocupação e modo no commit de dez ticks;
- adicionada escrita coordenada de item e bloco com rollback defensivo em caso de falha parcial;
- canceladas sessões e rajadas em troca de slot, dimensão, modo, morte, respawn, saída ou alteração do item autorizado;
- congeladas a origem e a base vetorial da rajada no instante da liberação, impedindo que os seis pulsos se curvem quando a câmera gira;
- ampliada a suíte pura para 14 testes, cobrindo as 16 combinações de carga/água, normalização corrompida e políticas de retenção.

## 1.0.12 — 2026-08-03

- congelada a pose de primeira pessoa aprovada na 1.0.11, sem qualquer translação, escala ou rotação adicional;
- aplicada exclusivamente à apresentação de terceira pessoa a correção medida `position [5, -2.5, -1]`, trazendo o cabo para dentro e para baixo no punho e ligeiramente à frente do torso;
- aplicado exclusivamente à terceira pessoa o pitch aditivo `[6, 0, 0]`, produzindo orientação efetiva aproximada `[31, 0, -12]` sem tocar no binding nem no pivô;
- deslocada a origem matemática da aspersão para `0,55` bloco à frente, `0,48` à direita e `0,15` abaixo dos olhos, aproximação derivada da posição final do punho e do vetor punho→cabeça do instrumento;
- substituído o leque radial por uma distribuição anisotrópica de 36 gotas: maior dispersão horizontal e menos de um terço da dispersão vertical anterior;
- limitada a abertura vertical a aproximadamente `5,2°`, eliminando o aspecto de halo, anel ou domo em torno da mira e do jogador;
- preservada abertura horizontal máxima de aproximadamente `14,5°`, mantendo uma aspersão ampla e direcional;
- reduzido em cerca de 12% o maior billboard próximo da câmera, ainda mantendo as gotas maiores que as da 1.0.6;
- mantidos o alcance, gravidade, arrasto, colisão, iluminação, fade, material e sprite azul/ciano aprovados na 1.0.11;
- documentada a viabilidade oficial de locator no attachable; sua integração continua isolada para a etapa seguinte, depois da validação física do grip e do gatilho carregado/vazio.

## 1.0.11 — 2026-08-03

- recuperados e comparados os arquivos efetivamente instalados da 1.0.6, em vez de reconstruir a trajetória por aproximação;
- restaurada a origem comprovada da aspersão: `0,72` bloco à frente, `0,30` à direita e `0,42` abaixo da cabeça, evitando o jato excessivamente alto da 1.0.10;
- restaurada a emissão em grupos contíguos de direções ao longo de seis frames, preservando a progressão espacial mais natural da rajada antiga;
- ampliada a rajada de 24 gotas na 1.0.6 e 30 na 1.0.10 para 36 gotas, seis por frame;
- aumentado o raio do leque para maior dispersão e elevada a velocidade para `12,70–13,98` blocos/s; a simulação determinística indica cerca de um bloco adicional de alcance mediano em relação à 1.0.6;
- restaurados gravidade `-7,2`, arrasto `0,035`, colisão de raio `0,025`, duração e elevação vertical da 1.0.6;
- restaurados o sprite radial cheio, o material nítido `particles_alpha` e o billboard sempre voltado para a câmera;
- aumentadas as dimensões visuais para `0,044 × 0,105`, com escala individual de `0,84–1,08`, tornando as gotas substancialmente mais legíveis sem reintroduzir névoa verde;
- preservados o fade por variáveis suportadas, a iluminação ambiental, a colisão, o som sincronizado e toda a arquitetura de binding/pose da 1.0.10.

## 1.0.10 — 2026-08-03

- restaurada a aspersão visível sem alterar binding, hierarquia, grip, escala ou poses da 1.0.9;
- implementada emissão autoritativa pelo Script API estável com `Dimension.spawnParticle` e `MolangVariableMap`, mantendo o efeito visível aos jogadores da dimensão;
- ampliada a rajada para 30 gotas distribuídas exatamente uma vez em seis frames equilibrados, iniciados quatro ticks após o ataque;
- substituída a origem fixa por um arco curto que avança e se aproxima do centro durante a liberação, recalculado a partir da cabeça e direção atuais do jogador;
- criado leque determinístico mais sustentado, com velocidades entre 11,4 e 13,2 blocos/s variadas dentro de cada frame, gravidade, arrasto e colisão com expiração no contato;
- orientado o eixo longo de cada gota pela própria velocidade e adotado material `particles_blend`, iluminação ambiental e fade por `variable.particle_age / variable.particle_lifetime`;
- recriada textura azul/ciano de gota com bordas suaves; a névoa verde continua ausente e uma validação impede sua regressão;
- restaurados o som de splash no instante de liberação e testes que garantem distribuição completa das gotas, origem móvel e vetores normalizados;
- substituídas as proibições diagnósticas por invariantes que exigem partícula, textura, colisão, orientação, fade e emissão compilada.

## 1.0.9 — 2026-08-03

- preservados integralmente o schema `1.16.0`, o osso vinculado e a expressão de item-slot que já seguem corretamente o braço;
- separado o osso vinculado, agora neutro e sem cubos, do filho artístico `aspergillum_visual`;
- deslocada toda a malha em `+9Y`, colocando o centro do cabo escuro no grip empírico `[-6, 24, 1]` indicado pelos testes das versões 1.0.7 e 1.0.8;
- invertidos de forma controlada os sinais da orientação de repouso para `[25, 0, -12]`, corrigindo pitch e roll que apontavam para trás e para dentro;
- adicionadas poses de apresentação separadas: terceira pessoa preserva a pose da geometria e primeira pessoa aplica inversão end-for-end de 180° ao filho visual;
- adotado `format_version` `1.10.0` para o documento de animação, formato recomendado pelo validador oficial e pela documentação de upgrade;
- auditadas automaticamente as oito peças: dimensões estritamente positivas, box UV completo e textura empunhada integralmente opaca;
- mantidas desativadas animações de ação, locator, efeito e textura de partículas, isolando o teste de grip, orientação, enquadramento e faces.

## 1.0.8 — 2026-08-03

- preservados sem alteração o schema `1.16.0` e a expressão de binding comprovados pela 1.0.7;
- substituído o bastão diagnóstico pela malha real reduzida de 15,6 unidades, diretamente no mesmo osso vinculado;
- transladado o ponto de pega da origem dos pés `[0, 0, 0]` para o pivô oficial do `rightItem` `[-6, 15, 1]`;
- posicionados todos os cubos em torno desse grip, em vez de tentar deslocar o binding ou compensar a posição do root;
- aplicada somente uma rotação neutra de `[-25, 0, 12]`, dentro dos limites recomendados de pitch e roll e com pivô no cabo;
- mantidos material opaco, ausência de hierarquia filha, animações, locator e partículas para que o teste isole encaixe, faces e swing vanilla da malha real.

## 1.0.7 — 2026-08-03

- confirmado no diretório real do mundo que a 1.0.6 instalada era byte a byte idêntica ao pacote e que nenhum Resource Pack concorrente estava ativo;
- identificado que a geometria empunhada ainda declarava `format_version` `1.12.0`, enquanto o campo `binding` só é documentado no schema `1.16.0` e todos os exemplos oficiais vinculados usam `1.16.0`;
- criado teste controlado com um único osso renderizável, binding oficial completo e um único bastão 2×8×2;
- removidos temporariamente filho visual, rotação, locator, animações, controllers de animação e partículas;
- substituído `entity_alphatest` por `entity` opaco para eliminar transparência e cutout como variáveis;
- adicionadas validações que impedem qualquer recurso extra de entrar no pacote diagnóstico.

## 1.0.6 — 2026-08-03

- descartadas as transformações incompatíveis do tridente usadas na 1.0.5;
- separado o attachable em uma âncora sem malha ligada diretamente a `rightItem` e um osso visual filho, garantindo herança da cadeia do braço sem sobrescrever o binding;
- movido o ponto de pega para a origem local do cabo e redimensionada fisicamente a geometria para 15,6 unidades de comprimento e 4,94 unidades de largura máxima;
- removidos controller e animações de exibição que aplicavam grandes compensações ao próprio osso vinculado; as animações cerimoniais continuam movendo `rightarm` e `rightitem` do jogador;
- unificado o método de renderização dos materiais da caldeirinha, eliminando o aviso de `MaterialInstances`;
- acrescentada uma corrente à receita da caldeirinha, diferenciando-a da receita vanilla do caldeirão;
- recalculada a origem das gotas a partir do envelope da nova malha e distribuídas 24 gotas por seis frames, formando um leque de 0,25 segundo em vez de uma nuvem instantânea;
- reforçadas as validações para a hierarquia âncora → malha, escala física, ausência de overrides do binding, material uniforme e receita exclusiva.

## 1.0.5 — 2026-08-03

- reconstruído o attachable com base no tridente vanilla, substituindo o osso colidente `root` pelo osso exclusivo `aspergillum`;
- substituído o pivô incorreto `[0, 2, 0]` pelo referencial `[0, 24, 0]` usado por itens vanilla longos de 31 unidades;
- substituídas as transformações copiadas de um modelo de cabeça pelas poses oficiais de primeira e terceira pessoa do tridente;
- adicionado um animation controller próprio para alternar perspectivas com blend curto e manter o modelo no slot correto;
- sincronizada `minecraft:swing_duration` com o cooldown de 0,9 segundo, permitindo que o binding acompanhe integralmente o gesto do braço;
- movida a origem calculada das gotas para 0,72 bloco à frente e 0,30 bloco à direita, aproximando-a da cabeça do aspersório em vez do centro do tórax;
- adicionadas validações que proíbem regressão ao osso `root`, ao pivô anterior e às poses inadequadas.

## 1.0.4 — 2026-08-03

- corrigida a empunhadura pela arquitetura própria de attachables vinculados: geometria em coordenadas locais e transformações de exibição distintas para primeira e terceira pessoa;
- normalizados os nomes dos ossos do jogador para `rightarm` e `leftarm` e adicionadas trilhas de `rightitem`, mantendo o aspersório sincronizado com as animações de carregamento e aspersão;
- removidas a névoa customizada e a chamada inválida ao `minecraft:water_splash_particle`, eliminando o efeito verde e os erros `variable.direction` do Content Log;
- aumentada a aspersão de 18 para 24 gotas e ampliados velocidade, duração e sustentação para aproximadamente triplicar o alcance;
- adicionadas validações de regressão para vínculo, poses de exibição, animação do osso do item e ausência dos emissores removidos.

## 1.0.3 — 2026-08-03

- removido o estado vanilla `minecraft:sixteen_way_rotation`, que o cliente 26.34 também restringe a Creator Features;
- adicionada rotação estável em 16 setores por `aspergillum:rotation`, definida pelo script antes da colocação do bloco;
- restaurado o carregamento da caldeirinha e, por consequência, da receita, do componente, do item de bloco e da função `aspergillum/dev_kit`;
- transferido o pivô do attachable para o centro físico do cabo e removida a rotação que colocava o modelo atrás e abaixo do jogador;
- adicionados testes unitários para normalização e quantização da rotação de colocação.

## 1.0.2 — 2026-08-03

- substituído `n_way_visual_rotation`, que o cliente 26.34 exige tratar como experimental, por 16 variantes geométricas estáveis selecionadas pelo estado de colocação;
- adicionado controlador de render exclusivo para o attachable, eliminando referências inexistentes a `material.enchanted` e `texture.enchanted`;
- corrigidos pivô e rotação de ligação do modelo empunhado conforme o padrão oficial do osso `rightItem`;
- adicionadas escalas e poses independentes para primeira e terceira pessoa;
- incrementadas as versões dos dois packs para impedir que o Minecraft aceite a revisão anterior como atual;
- separados os identificadores de tradução dos nomes dos packs, evitando que o Resource Pack renomeie o Behavior Pack no armazenamento;
- adicionadas validações para as 16 orientações e para o controlador de render dedicado.

## 1.0.1 — 2026-08-03

- corrigido o formato estrutural de `n_way_visual_rotation`; o teste no cliente revelou depois que esse recurso ainda exige o experimento Creator Features;
- adicionados dados obrigatórios de desbloqueio às receitas 1.20+;
- corrigidas variáveis Molang de idade e duração das partículas;
- removida a condição attachable `q.is_swinging`, indisponível nesse contexto;
- adicionadas validações de regressão para os erros encontrados no Content Log real.

## 1.0.0 — 2026-08-03

- aspersório 3D com três cargas persistentes;
- aspersão por Attack/Mine sem dano ou mineração final;
- animações próprias em primeira e terceira pessoa;
- partículas de água com gravidade, arrasto e colisão;
- caldeirinha com quatro níveis, encaixe decorativo e rotação em 16 direções;
- texturas fallback e PBR;
- receitas e localização em português e inglês;
- pipeline TypeScript, testes, validação oficial e empacotamento reproduzível.
