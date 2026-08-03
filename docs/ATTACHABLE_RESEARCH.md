# Investigação do attachable empunhado

## Evidência e correção de hipótese

Os testes físicos das versões 1.0.4 e 1.0.5 mostraram que tornar a geometria semelhante ao tridente não torna seus referenciais intercambiáveis. Na 1.0.5, o modelo passou a aparecer em primeira pessoa, mas ficou enorme, sofreu clipping no plano próximo e permaneceu visualmente desacoplado do punho em terceira pessoa.

O erro foi tratar pivô, translação e rotação do tridente como uma pose universal. O pivô de um attachable pertence à geometria do próprio objeto: deve ficar no ponto em que a mão segura o cabo. O tridente usa `[0, 24, 0]` porque esse é o ponto de pega dentro de sua malha; o aspersório original tinha outro comprimento e outro ponto de pega.

## Evidência direta da 1.0.6

O mundo `FXi1BzZ8bkA=` continha a versão 1.0.6, e hashes SHA-256 confirmaram igualdade byte a byte entre a fonte e os arquivos efetivamente instalados de manifest, attachable, geometria, render controller e texturas. `world_resource_packs.json` continha somente o UUID correto na versão 1.0.6. O Content Log não registrou erro de carregamento.

Isso elimina cache, arquivo empacotado divergente e Resource Pack concorrente como causas do resultado observado.

## Causa candidata isolada

A geometria da 1.0.6 declarava `format_version: 1.12.0`. O schema oficial `geometry:1.16.0` documenta `binding` como Molang e todos os sete modelos vinculados encontrados nos repositórios oficiais usam `1.16.0`: crossbow, shield, spear, spyglass, trident, crown e wrench. O fallback silencioso ao root é compatível com um campo aceito pelo parser genérico, mas sem semântica ativa na versão antiga da geometria.

## Arquitetura diagnóstica 1.0.7

- geometry `1.16.0`;
- um único osso `aspergillum_debug`;
- binding `q.item_slot_to_bone_name(context.item_slot)`;
- pivô `[0, 0, 0]`;
- um único cubo com origin `[-1, 0, -1]` e size `[2, 8, 2]`;
- material opaco `entity`;
- nenhuma hierarquia filha, transformação, animação, partícula ou locator.

O teste físico confirmou que o bastão herda integralmente o braço direito. Sua distância constante de aproximadamente 12–16 unidades abaixo do punho demonstrou que o binding transfere a transformação do holder, enquanto os vértices continuam no espaço de modelo do jogador. `[0, 0, 0]` corresponde à base do modelo, não ao centro da mão.

## Integração controlada 1.0.8

A malha real volta diretamente ao osso comprovado, sem introduzir child bones. O grip foi deslocado para `[-6, 15, 1]`, pivô documentado do `rightItem` na geometria humanoide. Todos os cubos foram transladados em torno desse ponto; assim, a mão deve fechar sobre o centro do cabo e a rotação `[-25, 0, 12]` deve afastar a cabeça do corpo sem criar um raio orbital.

Animações, locator e partículas permanecem ausentes. O objetivo desta revisão é validar três fatos isoladamente: contato do cabo com o punho, comportamento da malha real durante o swing vanilla e integridade de todas as faces sob material `entity` opaco.

## Calibração controlada 1.0.9

O teste físico da 1.0.8 confirmou o binding e a escala, mas mostrou o centro do cabo entre cinco e oito unidades abaixo do punho, com pitch/roll visualmente invertidos. A correção não toca no binding: `aspergillum_bound` passa a ser uma raiz neutra sem malha, enquanto `aspergillum_visual` herda esse transform e concentra todas as decisões artísticas.

Os oito cubos foram movidos em `+9Y`, de modo que o centro do cabo e o pivô visual ocupem `[-6, 24, 1]`. A pose de repouso foi invertida para `[25, 0, -12]`. A primeira pessoa recebe exclusivamente uma rotação end-for-end de 180° no filho visual; a terceira pessoa não acrescenta rotação de animação.

A auditoria de renderização agora é verificável: todos os cubos têm três dimensões positivas, todos usam box UV `[u, v]` — que gera as seis faces — e a textura entity tem alfa 255 em cada pixel. Isso elimina omissão per-face, plano de espessura zero e transparência como causas na fonte empacotada. Se a cabeça ainda desaparecer após sair de trás da manga, a próxima evidência necessária será um Content Log e imagens de órbita da 1.0.9.

## Restauração da aspersão 1.0.10

O VFX retorna sem modificar o attachable comprovado. Como o Script API não expõe ao servidor a transformação mundial de um locator interno da geometria empunhada, a emissão usa uma origem matemática próxima da ponta: parte à direita da câmera, avança 0,62 → 0,74 bloco e converge lateralmente 0,36 → 0,24 bloco ao longo dos seis frames. A origem é recalculada em cada tick, acompanhando movimento e rotação do jogador.

Trinta direções determinísticas formam um leque estreito e levemente elevado. Os índices são intercalados por frame, evitando anéis ou blocos espaciais perceptíveis. A partícula usa `direction_y` derivado da velocidade, material translúcido, textura exclusivamente azul/ciano, fade com variáveis próprias de partículas, gravidade, arrasto, iluminação e colisão.

Essa restauração não recupera a névoa verde nem as antigas queries `q.particle_age`/`q.particle_lifetime`. Também não reintroduz as animações do jogador que foram removidas durante o diagnóstico do binding.

## Recuperação balística 1.0.11

A observação física da 1.0.10 mostrou que sua reconstrução havia perdido qualidades visuais da 1.0.6. A auditoria do mundo instalado recuperou os parâmetros exatos antigos: origem baixa fixa em `0,72F + 0,30R`, deslocamento vertical `-0,42 + 0,24F.y`, 24 direções em grupos contíguos, leque com elevação `0,055`, velocidades de `11,50–12,78`, gravidade `-7,2`, arrasto `0,035`, billboard `rotate_xyz`, material `particles_alpha` e sprite radial de 16×16.

A 1.0.11 conserva esses fundamentos e os expande de forma controlada. São 36 gotas, seis por frame, raio de dispersão `0,04 + 0,19√t`, velocidades de `12,70–13,98`, dimensões `0,044 × 0,105` e escala individual `0,84–1,08`. A simulação determinística em terreno plano estima alcance mediano de aproximadamente `9,26` blocos, contra `8,28` na 1.0.6, além de um leque aproximadamente 20% mais aberto. O sprite radial tem alfa máximo 240 para permanecer visível, mas continua exclusivamente azul/ciano e sem névoa.

## Invariantes

- a versão da geometria permanece `1.16.0` ou superior;
- o binding permanece exclusivamente no root neutro e a malha exclusivamente no filho visual;
- o grip e pivô empíricos permanecem em `[-6, 24, 1]` durante esta calibração;
- não existem locator nem animações de ação; as partículas são emitidas autoritativamente pelo script;
- cada aspersão válida emite 36 gotas em seis frames contíguos e toca um único splash no primeiro frame;
- a partícula usa apenas variáveis suportadas `variable.particle_age` e `variable.particle_lifetime`;
- a expressão de binding não é abreviada nem substituída por literal;
- `minecraft:swing_duration` permanece igual à duração do cooldown de ataque.
