# Changelog

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
