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
- [ ] `water_level + charges > 3` recusa o encaixe sem mudar bloco ou item;
- [ ] bloco ocupado + aspersório informa ocupação; bloco ocupado + outro item solicita mão vazia;
- [ ] inventário cheio faz o item ser entregue na mão vazia, inventário ou chão sem perda;
- [ ] quebrar a caldeirinha ocupada entrega uma caldeirinha e exatamente um aspersório preservado;
- [ ] explosão e `/setblock ... destroy` não duplicam nem perdem o snapshot;
- [ ] pistão não move a caldeirinha;
- [ ] reload do mundo preserva snapshots; retirada limpa o shard correspondente;
- [ ] dois itens com ID duplicado no mesmo inventário terminam com IDs distintos;
- [ ] item com schema maior que 2 permanece byte-logicamente intocado e ações mutáveis são recusadas;
- [ ] Content Log não contém erro/warning de dynamic property, `RawMessage`, custom component ou loot.

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

## Gate da correção v1.0.18c — compatibilidade runtime e recuperação do carregamento

- [ ] importar somente `Aspergillum-1.0.18c.mcaddon` após fechar o jogo e remover revisões antigas;
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

- [ ] importar somente `Aspergillum-1.0.18c.mcaddon`, fechar e reabrir o jogo antes do teste;
- [ ] em primeira pessoa, manter a câmera imóvel e carregar três vezes: item e mão permanecem visíveis do início ao settle;
- [ ] repetir olhando levemente para cima, em frente e para baixo: o item não cruza a mira, borda superior nem desaparece;
- [ ] confirmar que não existe reset, dupla partida ou pop no começo/fim;
- [ ] em terceira pessoa traseira, frontal e lateral, o arco de carga continua legível e não atravessa rosto/ombro;
- [ ] água e cargas mudam uma única vez no tick 10; cancelamento anterior não altera recursos;
- [ ] as duas microgotas e o som de commit continuam ocorrendo somente em carga válida;
- [ ] aspersão, docking, retirada e quebra permanecem idênticos à 1.0.18;
- [ ] Content Log não contém erro de Molang, animação, bone ou recurso do add-on.

## Gate do Release Candidate v1.0.18

- [ ] importar `Aspergillum-1.0.18c.mcaddon` após remover packs antigos;
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
