# Estratégia de testes e QA

## Princípio

Automação prova regras e estrutura; somente o Minecraft prova input, cache, animação, câmera, skin, rendering e integração real. Uma revisão não é aprovada por inspeção de JSON ou por “não haver erro de build”.

## Pipeline automatizado

`npm run check` deve cobrir:

- TypeScript contra `@minecraft/server` estável fixado;
- testes unitários do domínio;
- links e invariantes básicos da documentação;
- geração determinística de assets;
- bundle ESM;
- sintaxe, referências, manifests, geometrias, animações, partículas e PNGs.

`npm run package` também cria o `.mcaddon`, SHA-256 e relatórios oficiais em `dist/validation/<versão>/`.

## Cobertura automatizada a expandir

### Cargas e políticas

- todas as 16 combinações de carga/água (`0..3 × 0..3`);
- normalização de negativos, frações, `NaN`, infinito, strings e valores acima do máximo;
- Survival/Adventure consomem; Creative retém; Spectator nega;
- zero cargas nunca asperge, inclusive em Creative;
- carga Creative parcial permanece parcial ao voltar a Survival;
- cálculo de load soma sobre o valor normalizado.

### Identidade e schema

- item bruto e schema ausente;
- migração `0 → 2` e `1 → 2`;
- schema 2 normalizado;
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

- overflow recusado;
- nome, ID, cosmético, perfil e propriedades preservados;
- retirada com inventário cheio;
- quebra, explosão, reload e limpeza de snapshot;
- pistão recusado ou registro movido de forma íntegra.

## Smoke test por revisão

Antes de testes extensos:

1. remover packs antigos e fechar o jogo;
2. importar o `.mcaddon` exato da revisão;
3. criar mundo sem experimentos;
4. executar `/function aspergillum/dev_kit`;
5. confirmar item, bloco, receitas e Content Log sem erro;
6. preencher, carregar, aspergir três vezes, tentar vazio, acomodar, retirar e quebrar;
7. repetir uma vez em primeira pessoa e uma vez em terceira pessoa.

Se o smoke test falhar, interrompa a matriz e capture a menor reprodução possível.

## Baseline v1.0.15b

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
- [ ] aspersão executa gesto próprio de 0,9 s, distinto do ataque vanilla;
- [ ] trocar de item antes do tick 5 não consome carga nem emite água;
- [ ] trocar depois do release conserva a carga consumida e cancela apenas pulsos restantes;
- [ ] atravessar o olhar vertical não inverte subitamente o leque;
- [ ] primeira pessoa mantém o item visível em 100% dos frames da aspersão;
- [ ] terceira pessoa apresenta um único início, sem reset entre swing vanilla e correção aditiva;
- [ ] `aspergillum_action` produz flick curto sem o cabo abandonar o punho;
- [ ] água, som e commit começam juntos no tick 5;
- [ ] controller não dispara em ataque vazio nem ao reequipar durante cooldown residual;

Ainda é esperado na baseline: origem matemática aproximada. O locator permanece fora do escopo desta revisão.

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
- [ ] níveis de água 0, 1, 2 e 3;
- [ ] acomodar/retirar repetidamente com nome e propriedades;
- [ ] overflow recusado sem perda;
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
- [ ] sprites alongados alinham-se à velocidade;
- [ ] micro-splash é discreto e não duplica gameplay.

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
