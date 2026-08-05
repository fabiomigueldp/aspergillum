# Arquitetura

## Visão geral

O projeto separa regras puras, coordenação de casos de uso e integração Bedrock. A migração para a arquitetura-alvo é incremental: o layout atual continua válido enquanto cada caso de uso ganha limites mais explícitos.

```text
Entrada Bedrock
    │
    ▼
bootstrap ──► application ──► domain
                   │
                   ├──► infrastructure (item, bloco, mundo, sessões)
                   └──► presentation (mensagens, som, animação e VFX)
```

O servidor é autoritativo para carga, água, cooldown e permissões. Resource Pack, attachable, animações e partículas representam o resultado, mas nunca concedem estado.

## Identificadores e compatibilidade

- Namespace: `aspergillum`.
- Item: `aspergillum:aspergillum`.
- Bloco: `aspergillum:aspersorium`.
- Block states: `aspergillum:water_base`, `aspergillum:water_offset`, `aspergillum:has_aspergillum`, `aspergillum:rotation`.
- Item properties: `aspergillum:charges`, `aspergillum:schema_version`, `aspergillum:instance_id`, `aspergillum:cosmetic_id`, `aspergillum:spray_profile_id`.
- World properties: shards `aspergillum:docked_<dimensão>_<chunkX>_<chunkZ>` do registry persistente.
- UUIDs, identifiers públicos e states publicados permanecem estáveis.
- Nenhum conteúdo vanilla é sobrescrito; nenhuma feature experimental é requisito.

## Estrutura atual

```text
src/
├── bootstrap/main.ts
├── application/
│   ├── aspersorium.ts
│   └── sprinkle.ts
├── domain/
│   ├── aspergillum.ts
│   ├── aspersorium-water.ts
│   ├── cone.ts
│   ├── docking.ts
│   ├── rotation.ts
│   └── spray-profile.ts
├── infrastructure/
│   ├── action-lease.ts
│   ├── constants.ts
│   ├── docked-item-registry.ts
│   ├── game-mode-policy.ts
│   ├── item-state.ts
│   ├── loading-session.ts
│   ├── minecraft-transaction.ts
│   └── sprinkle-session.ts
└── presentation/
    ├── animation-coordinator.ts
    ├── messaging.ts
    ├── sound-coordinator.ts
    └── wet-feedback.ts
```

Essa estrutura já mantém o domínio testável, mas application e infrastructure ainda acumulam responsabilidades. Não é necessário mover arquivos antes de modificar um caso de uso; a mudança deve pagar por si mesma com uma fronteira, teste ou capacidade concreta.

## Arquitetura-alvo

```text
src/
├── domain/
│   ├── charges.ts
│   ├── charge-policy.ts
│   ├── load-resolution.ts
│   ├── docking-resolution.ts
│   ├── cooldown.ts
│   └── spray-profile.ts
├── application/
│   ├── load-aspergillum.ts
│   ├── sprinkle.ts
│   ├── dock-aspergillum.ts
│   ├── undock-aspergillum.ts
│   └── initialize-aspergillum.ts
├── infrastructure/
│   ├── item-state-repository.ts
│   ├── loading-session-repository.ts
│   ├── action-lease-repository.ts
│   ├── cooldown-repository.ts
│   ├── docked-item-registry.ts
│   ├── game-mode-policy.ts
│   └── minecraft-transaction.ts
├── presentation/
│   ├── messages.ts
│   ├── sounds.ts
│   ├── animation-coordinator.ts
│   └── spray-coordinator.ts
└── bootstrap/
    ├── components.ts
    ├── events.ts
    └── main.ts
```

Regras de dependência:

- Domain não conhece Minecraft API, timers, áudio ou partículas.
- Application depende de interfaces e coordena uma operação autoritativa.
- Infrastructure implementa leitura/escrita e ciclo de vida da plataforma.
- Presentation contém somente feedback; não muda carga ou água.
- Bootstrap registra e conecta dependências; não vira um “god file”.

Mensagens de gameplay usam um catálogo tipado de translation keys e `RawMessage`; o cliente resolve o idioma no momento da apresentação. Parâmetros dinâmicos usam `%s` sequenciais na mesma ordem de `with`. Cada mensagem e linha de lore começa com `§r` antes da cor, impedindo que estilo herdado altere peso ou inclinação. Sons passam por `AudioPort` e pelo adaptador Bedrock em `src/presentation/audio`; qualquer falha de HUD, áudio ou micro-VFX é fail-soft. A carga e a água já foram decididas antes desses recursos de apresentação e nunca dependem deles.

## Fluxo de carregamento atual

1. Usar o aspersório sobre a caldeirinha entra por `ItemCustomComponent.onUseOn`; o custom component do bloco mantém `onPlayerInteract` para balde, mão vazia e fallback entre dispositivos.
2. A intenção de carregar ou acomodar captura `isSneaking` sincronicamente e ambas as rotas passam por uma claim curta por jogador/bloco, impedindo commit duplicado.
3. Application valida item, capacidade, água e modo.
4. Uma `LoadingSession` e um `ActionLease` reservam jogador e bloco durante o gesto de 16 ticks.
5. O commit revalida dimensão, slot, `instance_id`, distância, bloco, ocupação e água.
6. Domain resolve a transferência com política `consume` ou `retain`.
7. Infrastructure grava item e bloco com rollback defensivo.
8. Sessão e lock são liberados em sucesso, falha ou cancelamento.

O commit no tick 10 coincide com a fase de imersão da animação one-shot. A falha visual não altera o resultado autoritativo. Consulte [Estado e concorrência](STATE_AND_CONCURRENCY.md).

## Fluxo de aspersão atual

1. `playerSwingStart` aceita apenas Attack/Mine com o item correto.
2. O domínio verifica carga, cooldown e política do modo.
3. Uma `SprinkleSession` e um `ActionLease` reservam a instância sem consumir carga; o cooldown de 18 ticks começa, o braço segue o arco nativo com uma ponte aditiva de continuidade no recovery e o controller inicia a ação local do instrumento.
4. No tick 5, item, slot, dimensão, modo e carga são revalidados; somente então a carga é consumida/preservada.
5. O commit calcula um único frame físico e nele dispara release espacial, bridge curto e primeiro pulso.
6. Seis pulsos script-side atualizam direção e base transportada em direção à câmera.
7. Cada gota passa a simular em world-space; troca de item/dimensão cancela apenas pulsos futuros e não reembolsa um release já confirmado.
8. Cancelamento anterior ao tick 5 não consome carga nem emite água.
9. `entityHurt` e `playerBreakBlock` impedem dano e quebra.

Partículas visuais permanecem independentes de qualquer cone lógico de gameplay futuro.

## Attachable e animação

O contrato atual e os valores numéricos estão em [Contrato visual](VISUAL_CONTRACT.md). A v1.0.15 adiciona duas camadas sem alterar `aspergillum_bound`:

- `aspergillum_presentation`: pose estática por perspectiva;
- `aspergillum_action`: raiz neutra das peças `handle` e `sprinkler_head`, responsável pela ação local;
- `spray_aim`: filho técnico da cabeça que hospeda `aspergillum_tip` sem malha.

Timeline autoritativa de carregamento (`0.80 s`): movimento vanilla como base, correção aditiva exclusiva de `rightarm`, antecipação curta, avanço/descida, imersão, commit no tick 10, retenção e settle. A contribuição usa peso `0.32` em primeira pessoa e `1.0` em terceira; `rightitem` nunca é animado. O gesto usa um envelope Hermite analítico dirigido por `query.anim_time`, sem keyframes cúbicos dinâmicos. O contêiner visual permanece até `1.10 s` somente para executar uma compensação TP dirigida por `attack_time`; depois de `0.80 s`, todos os canais artísticos já estão neutros.

Timeline de aspersão (`18 ticks/0.90 s`): o swing vanilla fornece o movimento amplo; uma animação finita de `1,10 s`, iniciada somente para aspersão autorizada, soma em terceira pessoa uma compensação Hermite a `rightarm.y` entre 50% e 100% de `variable.attack_time`. Ela cancela o ramo final de `-30°` da curva oficial sem resetar a pose, sem tocar em `rightitem` e sem alterar a primeira pessoa. Um controller do attachable seleciona a coreografia FP/TP de `aspergillum_action`; a ação local assenta em `0,82 s`, deixa `0,08 s` de buffer e libera água no tick 5. Falhas de apresentação continuam sem interferir no estado.

O controller usa a categoria de cooldown válida como ponte visual. Tentativa vazia não inicia o cooldown nativo e, portanto, não entra no estado `sprinkle`. Na v1.0.19, a timeline é somente animação: áudio e bridge dependem do commit server-side, impedindo efeitos molhados em tentativas inválidas. O estado `recovery` também rearma uma nova ação se outro cooldown válido já tiver começado.

## Áudio semântico

Application emite intenções (`AudioCue`) e não IDs Bedrock. `BedrockAudioAdapter` resolve 15 famílias, escolhe variantes por shuffle bag e roteia pistas privadas via `Player.playSound` ou eventos espaciais via `Dimension.playSound`. Fill, load, dock, undock e release só emitem depois do commit correspondente; `load.prepare` e `sprinkle.prepare` só após a sessão e o cooldown serem aceitos. O catálogo, pipeline, mix, licença e QA estão em [Contrato de áudio](AUDIO_DESIGN_CONTRACT.md).

## Partículas

A geometria mantém a arquitetura `sprinkler_head -> spray_aim -> aspergillum_tip` como referência visual, enquanto a v1.0.19 torna o commit server-side a única autoridade de emissão:

- o commit calcula uma vez origem, direção e base do leque; bridge, release sonoro e primeiro pulso compartilham esse frame;
- o bridge é criado em world-space e recebe velocidade/direção por `MolangVariableMap`, evitando a combinação runtime inválida de rotação local sem posição local;
- o script mantém as 36 gotas balísticas, seis pulsos e steering deliberado;
- gotas principais usam o billboard camera-readable aprovado, evitando que a área aparente colapse em vistas oblíquas;
- colisões elegíveis produzem um micro-splash cosmético;
- textura-base neutra e gradientes RGBA numéricos azul-frio tornam a cor inequívoca no Resource Pack; as partículas de água omitem lighting local para impedir dominantes verdes/amarelas;
- o cooldown válido e o commit impedem bridge e som molhado em tentativa vazia ou cancelada antes do tick 5.

O bridge não é um segundo leque e não substitui o emissor matemático. Não remover as 36 gotas atuais até locator, condição de disparo, primeira/terceira pessoa e multiplayer provarem equivalência. O contrato detalhado está em [Contrato de VFX](VFX_DESIGN_CONTRACT.md).

## Bloco

Antes da colocação, `beforeOnPlayerPlace` converte yaw em 16 setores e escolhe uma geometria pré-rotacionada. Isso evita traits experimentais. O bloco possui quatro níveis de água e variante visual ocupada.

O reservatório mantém `0..16` unidades lógicas exatas. A infraestrutura usa um codec radix-9: `water_base` vale `0` ou `9`, `water_offset` vale `0..8`, e a quantidade é a soma normalizada. Isso representa dezessete quantidades com apenas dezoito pares e 576 combinações totais do bloco, sem registry externo ou state acima do limite runtime. Application lê e grava somente por `readAspersoriumWater`/`withAspersoriumWater`; as duas parcelas entram na mesma permutação antes de uma única escrita. A capacidade do item (`4`) e a capacidade do bloco (`16`) têm constantes e normalizadores distintos. O docking converte carga em água somente quando a soma cabe integralmente. A ocupação booleana governa a aparência; um registry persistente por dimensão/chunk preserva o item real e futuras variantes. Consulte [Estado e concorrência](STATE_AND_CONCURRENCY.md).

## Schema e inicialização

O schema atual é 3. Itens brutos e schemas 0/1/2 são normalizados em todos os slots do inventário, preservando cargas e identidade válida; cosmético/perfil recebem defaults estáveis. A passagem 2→3 amplia a capacidade para quatro sem fabricar a quarta carga. Lore é uma apresentação `RawMessage` traduzida pelo cliente. Schemas futuros não são regravados e operações que mudariam seu estado são recusadas.

## Perfis e extensibilidade

O comportamento do spray está externalizado em `SprayProfile`. O perfil `standard` registra quantidade, pulsos, janela, velocidades, dispersão, origem, steering e escala. Cosmético (`cosmeticId`) e regulagem (`sprayProfileId`) continuam IDs separados na evolução do schema.

## Dependências fixadas

| Área | Versão |
| --- | --- |
| Engine mínima | `1.26.40` |
| Manifest | `2` |
| Geometry attachable | `1.16.0` |
| Script API | `@minecraft/server` `2.9.0` |
| TypeScript | `5.9.x` |
| Creator Tools | `0.17.7` |
