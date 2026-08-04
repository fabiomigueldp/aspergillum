# Roadmap para a V1

## Princípios de execução

- Preservar a baseline v1.0.14 e evoluir por integração controlada.
- Uma revisão deve responder a uma hipótese principal e ter critérios de saída observáveis.
- Não remover fallback comprovado antes de a alternativa estar validada no pacote final.
- Não misturar refatoração ampla, calibração visual e mudança de semântica na mesma revisão.
- Versionar sempre de forma monotônica; não reutilizar versões já importadas pelo Minecraft.

## v1.0.15 — Fundação de animação e semântica de release — implementada

Escopo:

- introduzir `aspergillum_presentation`/`aspergillum_action` preservando o bound root;
- separar a malha em `handle` e `sprinkler_head` sem alterar a pose aprovada;
- implementar carregamento de 14–16 ticks com commit no tick 10;
- implementar gesto litúrgico de 18 ticks;
- introduzir `SprinkleSession` com reserva no tick 0 e commit no tick 4;
- iniciar `ActionLease` para exclusão de ações;
- suavizar também o primeiro pulso e usar transporte paralelo da base;
- externalizar constantes em `SprayProfile` (`standard`).

Gate de saída automatizado concluído; validação física pendente:

- primeira pessoa inalterada;
- cabo permanece no punho durante todo o gesto;
- cabeça não atravessa rosto, ombro ou tórax;
- cancelamento pré-release não consome carga;
- cancelamento pós-release não reembolsa;
- curvatura da câmera permanece controlável e suave.

## v1.0.15b — Redesign híbrido da aspersão — implementada; QA físico pendente

Escopo:

- preservar integralmente carregamento, binding, pose, estado e spray da 1.0.15;
- remover reset absoluto e `rightitem` da animação corporal de aspersão;
- manter o swing vanilla e adicionar correção pequena somente em `rightarm`;
- animar `aspergillum_action` com coreografias distintas FP/TP;
- acionar a ação local por cooldown válido num controller com crossfade;
- mover commit e seis pulsos para os ticks 5–10;
- validar matematicamente envelopes, endpoints, bones e continuidade.

Gate de saída físico:

- item permanece visível em todos os frames de primeira pessoa;
- existe apenas um começo, sem reset ou teleporte;
- cabeça não cruza rosto/ombro e grip permanece na mão;
- água começa durante o flick no tick 5;
- Content Log não acusa query, controller, animação ou bone desconhecido.

## v1.0.16 — Locator e VFX final

Escopo:

- adicionar `spray_aim` e `aspergillum_tip` à cabeça;
- provar o gatilho client-side somente para aspersão válida;
- emitir da ponta animada e orientar gotas pela velocidade;
- reduzir billboards próximos da câmera e adicionar micro-splash discreto;
- introduzir sons próprios;
- testar multiplayer e manter solução híbrida se o locator não preservar steering.

Gate de saída:

- origem a até `0.10` bloco da cabeça visual;
- nenhum disparo vazio ou duplicado;
- 36 gotas e controle entre pulsos preservados, ou fallback híbrido documentado;
- nenhuma gota nasce no rosto/tórax e nenhuma acompanha o braço depois de emitida.

## v1.0.17 — Persistência, schema e docking

Escopo:

- schema 2 e migrações reais;
- inicialização lazy + inventário, lore `RawMessage` localizada;
- `cosmeticId` e `sprayProfileId`;
- `DockedItemRegistry` persistente e snapshots;
- recusa de overflow e prioridade clara de interação;
- recuperação em quebra/explosão e política de pistão;
- testes de IDs duplicados, inventário cheio e reload.

Gate de saída:

- nenhum metadado perdido ao acomodar/retirar;
- nenhuma água criada ou destruída silenciosamente;
- mundos antigos migram sem regressão;
- schema futuro não é sobrescrito.

## v1.0.18 — UX, desempenho e Release Candidate

Escopo:

- mensagens e sons finais;
- feedback molhado mínimo, sem modelo persistentemente “encharcado” obrigatório;
- perfil/LOD somente se medições em 1, 4, 8 e 16 jogadores demonstrarem necessidade;
- matriz completa Steve/Alex/Persona, plataformas, FOVs e movimento;
- Content Log limpo, documentação de instalação, changelog e artefato final.

Gate de saída: todos os itens da Definition of Done abaixo.

## Definition of Done da V1

### Renderização e gesto

- primeira pessoa aprovada e congelada;
- grip centralizado em terceira pessoa nos modelos wide e slim;
- animações próprias de carga e aspersão, blends suaves, sem clipping corporal;
- escala, faces, material e UV estáveis.

### Partículas

- origem na ponta real, leque horizontal e steering suave;
- sem halo, partículas duplicadas, gotas atrás do jogador ou billboards gigantes;
- primeira/terceira pessoa e multiplayer aprovados;
- VFX não governa gameplay.

### Estado e concorrência

- políticas Survival/Adventure/Creative/Spectator corretas;
- identidade preservada e cargas sempre em `0..3`;
- carregamento e aspersão transacionais em seus respectivos release points;
- sessões, locks, cancelamentos e cleanup cobertos;
- docking preserva metadados, recusa overflow e sobrevive a reload/quebra.

### Compatibilidade e release

- migração de schema e lore localizada;
- testes automatizados e matriz manual relevante concluídos;
- pacote final validado oficialmente e inspecionado;
- Content Log sem erro ou warning atribuível ao add-on;
- sem dependência essencial de API experimental;
- desempenho aceitável em mobile e multiplayer.

## Riscos que exigem protótipo isolado

| Risco | Estratégia |
| --- | --- |
| animar braço do jogador sem substituir controller vanilla | build diagnóstico com gesto exagerado e um único estado |
| detectar cooldown customizado no Molang do attachable | provar condição em pacote mínimo antes de remover VFX script-side |
| locator preservar steering gestual | comparar locator puro, híbrido e script em matriz FP/TP/multiplayer |
| snapshots por dynamic property crescerem demais | shard por chunk, limites de tamanho e testes de limpeza |
| eventos de quebra/explosão não cobrirem todos os drops | testes físicos separados e fallback de recuperação idempotente |

## Fora do escopo da V1

- bênçãos, dano ou efeitos automáticos em entidades;
- múltiplos modelos/cosméticos distribuídos;
- regulagem exposta ao jogador;
- block entity experimental;
- substituição de arquivos vanilla;
- sincronização das partículas como autoridade de colisão/gameplay.
