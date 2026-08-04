# Plano de testes

## Testes automatizados

`npm run check` cobre:

- tipos da Script API estável;
- transições de carga e cooldown;
- limites e normalização do estado persistente;
- geometria matemática do cone e dispersão determinística;
- sintaxe e referências essenciais dos packs;
- dimensões válidas dos PNGs;
- bundle JavaScript ESM;
- schemas, manifests, geometrias, animações, partículas e compatibilidade estrita pelo Minecraft Creator Tools.

## Checklist dentro do Minecraft

O teste físico ainda é obrigatório porque entrada, câmera e feedback vanilla variam por plataforma.

### Critério exclusivo da versão 1.0.14

- [ ] ao selecionar o item, aparece a malha real em escala reduzida;
- [ ] em terceira pessoa, o centro do cabo escuro atravessa o centro do punho direito após `position [5, -1.5, -2.25]`;
- [ ] em terceira pessoa, a cabeça aponta para frente e para fora com pose efetiva próxima de `[35, 0, -12]`, sem ficar atrás da manga;
- [ ] um ataque vanilla leva a malha junto com a mão sem arco orbital remoto;
- [ ] em primeira pessoa, o cabo fica na região inferior direita e a cabeça aparece acima/à frente, sem inversão;
- [ ] trocar de primeira para terceira pessoa não produz um frame de pose errada ou salto persistente;
- [ ] nenhuma face da cabeça desaparece em órbita frontal, lateral ou traseira;
- [ ] cada carga produz uma única rajada contínua, sem aparecer como uma nuvem instantânea;
- [ ] aproximadamente 36 gotas azul/ciano, bem legíveis mas sem crescer excessivamente junto à câmera, aparecem por aspersão;
- [ ] a liberação começa perto do avanço do swing e o som de splash coincide com as primeiras gotas;
- [ ] em primeira e terceira pessoa, a origem permanece próxima do lado direito/ponta visual e não no centro do tórax ou nos pés;
- [ ] as gotas formam um leque horizontal, não um halo, anel, círculo, domo ou nuvem em torno da mira;
- [ ] a largura horizontal é claramente maior que a altura vertical, preservando alcance, gravidade e colisão;
- [ ] a emissão parte aproximadamente da cabeça visível do instrumento, à direita e à frente, sem nascer no rosto, torso ou pés;
- [ ] as gotas permanecem legíveis de frente, de lado e durante a queda, sem ficarem finas ou desaparecerem conforme o ângulo da câmera;
- [ ] girar a câmera lentamente durante a rajada curva o leque de maneira contínua e controlável;
- [ ] um giro rápido produz transição limitada, sem salto instantâneo, inversão ou vetor inválido;
- [ ] manter a câmera imóvel preserva uma trajetória reta e repetível;
- [ ] trocar de item ou dimensão cancela os pulsos restantes;
- [ ] não aparece animação litúrgica própria — ela continua fora do escopo desta revisão;
- [ ] em Sobrevivência e Aventura, cada aspersão consome exatamente uma carga;
- [ ] em Criativo, uma carga finita já presente permite aspersões sem consumo e o carregamento não reduz a água da caldeirinha;
- [ ] um aspergillum com zero cargas continua sem emitir água no Criativo;
- [ ] ao voltar do Criativo ao Sobrevivência, reaparece exatamente a quantidade finita anteriormente preservada;
- [ ] trocar de slot, item, dimensão ou modo durante os dez ticks cancela o carregamento sem alterar item ou água;
- [ ] duas pessoas não conseguem iniciar carregamento simultâneo na mesma caldeirinha;

### Instalação e conteúdo

- [ ] remover dos Armazenamentos do Minecraft os dois packs de desenvolvimento anteriores antes de importar uma revisão;
- [ ] importar o `.mcaddon` sem erro;
- [ ] ativar apenas o Behavior Pack e confirmar carregamento automático do Resource Pack;
- [ ] abrir mundo sem experimentos;
- [ ] encontrar os dois objetos no inventário criativo;
- [ ] fabricar ambas as receitas em sobrevivência.

### Caldeirinha

- [ ] colocar em bloco completo, laje, mesa de outro add-on e pedestal;
- [ ] confirmar rotação em 16 direções;
- [ ] encher com balde em sobrevivência e criativo;
- [ ] confirmar níveis 3 → 2 → 1 → 0 ao carregar;
- [ ] agachar + usar para acomodar;
- [ ] retirar com mão vazia e com inventário cheio;
- [ ] quebrar vazia, cheia e com aspersório acomodado;
- [ ] testar dois jogadores carregando simultaneamente.

### Aspersão

- [ ] ataque no ar, em entidade e contra bloco;
- [ ] confirmar ausência de dano, knockback e quebra;
- [ ] conferir gesto vazio, cooldown e consumo exato;
- [ ] inspecionar origem, leque, queda e colisão das gotas;
- [ ] verificar primeira e terceira pessoa;
- [ ] correr, agachar, nadar, voar e usar elytra durante o gesto;
- [ ] trocar de slot, morrer, desconectar ou mudar de dimensão durante a animação.

### Plataformas e gráficos

- [ ] mouse e teclado;
- [ ] controle;
- [ ] toque clássico e controles novos;
- [ ] personagem canhoto;
- [ ] FOV mínimo e máximo;
- [ ] gráficos convencionais e Vibrant Visuals;
- [ ] celular de baixo desempenho, console e PC;
- [ ] mundo local, multiplayer e Realm.

## Diagnóstico

Ative o Content Log nas configurações de Creator. Com cheats, use:

```text
/function aspergillum/dev_kit
/reload
/script profiler start
/script profiler stop
```

O Content Log preserva mensagens antigas durante a sessão. Antes de validar uma correção, feche completamente o jogo, remova os dois packs antigos em **Configurações → Armazenamento**, importe a nova versão e limpe o Content Log. Se ainda aparecer `q.particle_age`, `q.is_swinging` ou `controller.render.item_default`, o jogo carregou uma cópia antiga do Resource Pack: essas expressões não existem mais nos arquivos atuais.

Erros devem ser registrados com versão do jogo, plataforma, esquema de controle, perspectiva, passos mínimos e trecho correspondente do Content Log.
