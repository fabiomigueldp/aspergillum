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
│   └── rotation.ts
└── infrastructure/
    ├── constants.ts
    ├── game-mode-policy.ts
    ├── item-state.ts
    ├── loading-session.ts
    ├── messaging.ts
    └── minecraft-transaction.ts
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
3. Uma `LoadingSession` reserva jogador e bloco por dez ticks.
4. O commit revalida dimensão, slot, `instance_id`, distância, bloco, ocupação e água.
5. Domain resolve a transferência com política `consume` ou `retain`.
6. Infrastructure grava item e bloco com rollback defensivo.
7. Sessão e lock são liberados em sucesso, falha ou cancelamento.

O commit no tick 10 será sincronizado com a futura imersão visual. Consulte [Estado e concorrência](STATE_AND_CONCURRENCY.md).

## Fluxo de aspersão atual

1. `playerSwingStart` aceita apenas Attack/Mine com o item correto.
2. O domínio verifica carga, cooldown e política do modo.
3. A carga é consumida/preservada e o cooldown de 18 ticks é iniciado.
4. A liberação visual começa quatro ticks depois.
5. Seis pulsos atualizam uma direção suavizada em direção à câmera.
6. Cada gota passa a simular em world-space; troca de item/dimensão cancela apenas pulsos futuros.
7. `entityHurt` e `playerBreakBlock` impedem dano e quebra.

O alvo separa reserva no swing e commit no release, mantendo as mesmas garantias de steering. Partículas visuais permanecem independentes de qualquer cone lógico de gameplay futuro.

## Attachable e animação

O contrato atual e os valores numéricos estão em [Contrato visual](VISUAL_CONTRACT.md). A evolução adiciona duas camadas sem alterar `aspergillum_bound`:

- `aspergillum_presentation`: pose estática por perspectiva;
- `aspergillum_action`: carregar e aspergir ao redor do grip.

Timeline-alvo de carregamento (`0.70–0.80 s`): antecipação, avanço/descida, imersão, commit no tick 10, retenção e retorno.

Timeline-alvo de aspersão (`18 ticks/0.90 s`): preparação 0–2, arco 2–6, água 5–9, follow-through 9–12 e retorno 12–18. O braço conduz o gesto; o item adiciona apenas correção local, evitando rotação duplicada.

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

O comportamento do spray será externalizado em `SprayProfile`. O perfil `standard` registra quantidade, pulsos, janela, velocidades, dispersão, gravidade, steering e escala. Cosmético (`cosmeticId`) e regulagem (`sprayProfileId`) são IDs separados: aparência não deve mudar física implicitamente.

## Dependências fixadas

| Área | Versão |
| --- | --- |
| Engine mínima | `1.26.30` |
| Manifest | `2` |
| Geometry attachable | `1.16.0` |
| Script API | `@minecraft/server` `2.8.0` |
| TypeScript | `5.9.x` |
| Creator Tools | `0.17.7` |
