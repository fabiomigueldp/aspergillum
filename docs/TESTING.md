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
