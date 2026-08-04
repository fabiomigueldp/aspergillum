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
                   └──► presentation (mensagens, som, animação, VFX — alvo)
```

O servidor é autoritativo para carga, água, cooldown e permissões. Resource Pack, attachable, animações e partículas representam o resultado, mas nunca concedem estado.

## Identificadores e compatibilidade

- Namespace: `aspergillum`.
- Item: `aspergillum:aspergillum`.
- Bloco: `aspergillum:aspersorium`.
- Block states: `aspergillum:water_level`, `aspergillum:has_aspergillum`, `aspergillum:rotation`.
- Item properties: `aspergillum:charges`, `aspergillum:schema_version`, `aspergillum:instance_id`.
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
│   ├── cone.ts
│   ├── rotation.ts
│   └── spray-profile.ts
├── infrastructure/
│   ├── action-lease.ts
│   ├── constants.ts
│   ├── game-mode-policy.ts
│   ├── item-state.ts
│   ├── loading-session.ts
│   ├── messaging.ts
│   ├── minecraft-transaction.ts
│   └── sprinkle-session.ts
└── presentation/
    └── animation-coordinator.ts
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

## Fluxo de carregamento atual

1. O custom component do bloco recebe a interação.
2. Application valida item, capacidade, água e modo.
3. Uma `LoadingSession` e um `ActionLease` reservam jogador e bloco durante o gesto de 16 ticks.
4. O commit revalida dimensão, slot, `instance_id`, distância, bloco, ocupação e água.
5. Domain resolve a transferência com política `consume` ou `retain`.
6. Infrastructure grava item e bloco com rollback defensivo.
7. Sessão e lock são liberados em sucesso, falha ou cancelamento.

O commit no tick 10 coincide com a fase de imersão da animação one-shot. A falha visual não altera o resultado autoritativo. Consulte [Estado e concorrência](STATE_AND_CONCURRENCY.md).

## Fluxo de aspersão atual

1. `playerSwingStart` aceita apenas Attack/Mine com o item correto.
2. O domínio verifica carga, cooldown e política do modo.
3. Uma `SprinkleSession` e um `ActionLease` reservam a instância sem consumir carga; o cooldown de 18 ticks e o gesto one-shot começam.
4. No tick 4, item, slot, dimensão, modo e carga são revalidados; somente então a carga é consumida/preservada.
5. Seis pulsos atualizam direção e base transportada em direção à câmera.
6. Cada gota passa a simular em world-space; troca de item/dimensão cancela apenas pulsos futuros e não reembolsa um release já confirmado.
7. Cancelamento anterior ao tick 4 não consome carga nem emite água.
8. `entityHurt` e `playerBreakBlock` impedem dano e quebra.

Partículas visuais permanecem independentes de qualquer cone lógico de gameplay futuro.

## Attachable e animação

O contrato atual e os valores numéricos estão em [Contrato visual](VISUAL_CONTRACT.md). A v1.0.15 adiciona duas camadas sem alterar `aspergillum_bound`:

- `aspergillum_presentation`: pose estática por perspectiva;
- `aspergillum_action`: raiz neutra das peças `handle` e `sprinkler_head`, preparada para ação/locator.

Timeline de carregamento (`0.80 s`): antecipação, avanço/descida, imersão, commit no tick 10, retenção e retorno.

Timeline de aspersão (`18 ticks/0.90 s`): preparação, arco, release no tick 4, follow-through e retorno. As animações one-shot atingem somente `rightarm` e `rightitem`, com `override_previous_animation`; falhas são capturadas pela camada de apresentação sem interferir no estado.

## Partículas

O emissor matemático atual é multiplayer e controlável, mas usa origem aproximada. A arquitetura final prefere `sprinkler_head -> spray_aim -> aspergillum_tip`:

- `aspergillum_tip` fornece posição visual exata;
- `spray_aim` mantém o steering deliberado entre pulsos;
- partículas emitidas abandonam o espaço local e seguem no mundo;
- cooldown válido ou uma ponte explícita impede VFX em tentativa vazia.

Não remover o emissor atual até locator, condição de disparo, primeira/terceira pessoa e multiplayer provarem equivalência. Uma solução híbrida — locator para origem/impacto e script para as 36 gotas guiadas — é aceitável se preservar melhor o controle.

## Bloco

Antes da colocação, `beforeOnPlayerPlace` converte yaw em 16 setores e escolhe uma geometria pré-rotacionada. Isso evita traits experimentais. O bloco possui quatro níveis de água e variante visual ocupada.

O docking atual converte carga em água e guarda ocupação booleana. A V1 final adicionará um registry persistente para preservar o item real e futuras variantes, conforme [Estado e concorrência](STATE_AND_CONCURRENCY.md).

## Perfis e extensibilidade

O comportamento do spray está externalizado em `SprayProfile`. O perfil `standard` registra quantidade, pulsos, janela, velocidades, dispersão, origem, steering e escala. Cosmético (`cosmeticId`) e regulagem (`sprayProfileId`) continuam IDs separados na evolução do schema.

## Dependências fixadas

| Área | Versão |
| --- | --- |
| Engine mínima | `1.26.30` |
| Manifest | `2` |
| Geometry attachable | `1.16.0` |
| Script API | `@minecraft/server` `2.8.0` |
| TypeScript | `5.9.x` |
| Creator Tools | `0.17.7` |
