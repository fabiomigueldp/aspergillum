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
- Item clássico: `aspergillum:aspergillum`; oito variantes usam `aspergillum:aspergillum_<metal>_<grip>`.
- Blocos: `aspergillum:aspersorium` e `aspergillum:sacristan_table`.
- States da caldeirinha: `aspergillum:water_base`, `aspergillum:water_offset`, `aspergillum:has_aspergillum`, `aspergillum:cosmetic`, `aspergillum:rotation`.
- States da mesa: `aspergillum:table_has_aspergillum`, `aspergillum:table_cosmetic`, `aspergillum:table_rotation`.
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
│   ├── sacristan-table.ts
│   └── sprinkle.ts
├── domain/
│   ├── aspergillum.ts
│   ├── aspersorium-water.ts
│   ├── cone.ts
│   ├── docking.ts
│   ├── customization.ts
│   ├── rotation.ts
│   └── spray-profile.ts
├── infrastructure/
│   ├── action-lease.ts
│   ├── constants.ts
│   ├── docked-item-registry.ts
│   ├── game-mode-policy.ts
│   ├── item-state.ts
│   ├── item-variants.ts
│   ├── customization-session.ts
│   ├── loading-session.ts
│   ├── minecraft-transaction.ts
│   └── sprinkle-session.ts
└── presentation/
    ├── animation-coordinator.ts
    ├── customization-menu.ts
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

## Fluxo de personalização 1.1.2

1. Usar o aspersório numa Mesa do Sacristão livre captura e remove o ItemStack exato, grava um snapshot no mesmo registry persistente e publica o estado visual ocupado.
2. Uma sessão exclusiva reserva jogador e coordenada; outro jogador recebe feedback de mesa ocupada, sem mutação.
3. `CustomForm` recebe observáveis para perfil, metal e empunhadura. Cada mudança revalida jogador, distância, dimensão, bloco, sessão e snapshot antes de regravar a configuração.
4. A troca cosmética seleciona um dos nove IDs de item/attachable, mas preserva `instance_id`, cargas, schema, `nameTag` e propriedades dinâmicas.
5. **Concluir e retirar** reconstrói o item configurado e só remove o snapshot depois da entrega/drop bem-sucedido. **Fechar** encerra a sessão e mantém o item exposto na mesa.
6. Quebra, morte, saída, mudança de dimensão e bloco substituído liberam a sessão; a quebra recupera o snapshot com rollback defensivo.

A UI é apresentação e não é autoridade de estado. `@minecraft/server-ui` `2.1.0` é módulo estável do manifest; `@minecraft/common` `1.3.0` é somente a dependência npm/tipos correspondente e não pode aparecer no manifest. Não há JSON UI customizado, imagem preview nem polling por `runInterval`. O contrato visual e de interação está em [Mesa do Sacristão](SACRISTAN_TABLE_DESIGN_CONTRACT.md).

## Attachable e animação

O contrato atual e os valores numéricos estão em [Contrato visual](VISUAL_CONTRACT.md). A v1.0.15 adiciona duas camadas sem alterar `aspergillum_bound`:

- `aspergillum_presentation`: pose estática por perspectiva;
- `aspergillum_action`: raiz neutra das peças `handle` e `sprinkler_head`, responsável pela ação local;
- `spray_aim`: filho técnico da cabeça que hospeda `aspergillum_tip` sem malha.

Timeline autoritativa de carregamento (`0.80 s`): movimento vanilla como base, correção aditiva exclusiva de `rightarm`, antecipação curta, avanço/descida, imersão, commit no tick 10, retenção e settle. A contribuição usa peso `0.32` em primeira pessoa e `1.0` em terceira; `rightitem` nunca é animado. O gesto usa um envelope Hermite analítico dirigido por `query.anim_time`, sem keyframes cúbicos dinâmicos. O contêiner visual permanece até `1.10 s` somente para executar uma compensação TP dirigida por `attack_time`; depois de `0.80 s`, todos os canais artísticos já estão neutros.

Timeline de aspersão (`18 ticks/0.90 s`): o swing vanilla fornece o movimento amplo; uma animação finita de `1,10 s`, iniciada somente para aspersão autorizada, soma em terceira pessoa uma compensação Hermite a `rightarm.y` entre 50% e 100% de `variable.attack_time`. Ela cancela o ramo final de `-30°` da curva oficial sem resetar a pose, sem tocar em `rightitem` e sem alterar a primeira pessoa. Um controller do attachable seleciona a coreografia FP/TP de `aspergillum_action`; a ação local assenta em `0,82 s`, deixa `0,08 s` de buffer e libera água no tick 5. Falhas de apresentação continuam sem interferir no estado.

O controller usa a categoria de cooldown válida como ponte visual. Tentativa vazia não inicia o cooldown nativo e, portanto, não entra no estado `sprinkle`. Na v1.0.19, a timeline é somente animação: áudio e bridge dependem do commit server-side, impedindo efeitos molhados em tentativas inválidas. O estado `recovery` também rearma uma nova ação se outro cooldown válido já tiver começado.

### Pipeline autoral das malhas 1.0.19b

`assets-src/models/aspergillum.model.json` é a fonte humana do attachable. Ela preserva bones, pivôs, origins, sizes, binding e locators, mas acrescenta em produção nome, superfície semântica e, quando necessário, máscara de faces para cada cubo. `tools/generate-assets.mjs` remove esses metadados, calcula somente as faces selecionadas em densidade de dois texels por unidade, arredonda cada dimensão UV por `ceil` com mínimo de um texel, empacota ilhas sem sobreposição com padding e emite em conjunto a geometria distribuída e os mapas color/normal/MER `128 × 128`.

`assets-src/models/aspersorium.model.json` e `assets-src/models/sacristan_table.model.json` são fontes humanas dos blocos estáticos. Durante a geração, as quatorze peças de `handle`/`sprinkler_head`, suas máscaras e ilhas já empacotadas são transformadas para o bone `resting_aspergillum`; color, normal e MER da variante são copiados para uma região reservada dos atlas `256 × 256`. Assim, nenhum estado acomodado possui uma segunda malha artística independente.

Esse limite evita quatro classes de drift: geometria fracionária com Box UV que colapsa no runtime, mapas PBR que deixam de corresponder ao color map, réplica acomodada diferente do item e reintrodução de faces internas concorrentes. A silhueta continua autorada em unidades de modelo; a resolução da face é uma decisão independente do atlas. O validador compara origem/tamanho/máscara da fonte e do pack, bloqueia interseção volumétrica na transição do pomo e fiscaliza bounds, inteiros, footprints, sobreposição de UV e paridade completa entre item e composição.

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

O reservatório mantém `0..16` unidades lógicas exatas. A infraestrutura usa um codec radix-9: `water_base` vale `0` ou `9`, `water_offset` vale `0..8`, e a quantidade é a soma normalizada. Isso representa dezessete quantidades com apenas dezoito pares; ocupação, nove cosméticos e dezesseis rotações elevam o espaço publicado da caldeirinha de 576 para 5.184 combinações, mantendo cada state abaixo do limite runtime de dezesseis valores. Application lê e grava somente por `readAspersoriumWater`/`withAspersoriumWater`; as duas parcelas entram na mesma permutação antes de uma única escrita. A capacidade do item (`4`) e a capacidade do bloco (`16`) têm constantes e normalizadores distintos. O docking transfere somente o que cabe, preserva o restante no snapshot V2 e conserva exatamente `água + cargas`; snapshots V1 migram para carga zero. A ocupação booleana governa apenas a aparência, enquanto o registry persistente por dimensão/chunk preserva o item real e futuras variantes. Consulte [Estado e concorrência](STATE_AND_CONCURRENCY.md).

A Mesa do Sacristão possui `2 × 9 × 16 = 288` combinações. O índice cosmético é apenas projeção visual do snapshot; não substitui o `cosmeticId` persistido no item. Bloco colocado em revisão anterior não existe, e states ausentes/cosméticos legados da caldeirinha resolvem para índice `0`, a aparência clássica.

### Perfil material da caldeirinha 1.1.7

A estrutura metálica e o aspersório acomodado usam `opaque`; somente a superfície de água usa `blend`. A matriz física 1.1.7a/b/c demonstrou que essa separação estabiliza a composição e preserva a translucidez. O runtime 26.42 ainda registra duas mensagens conhecidas de `MaterialInstances` para métodos mistos. Esse débito é deliberado, restrito à apresentação e deve ser reavaliado se uma atualização, dispositivo, Vibrant Visuals ou aproximação de câmera voltar a produzir falha correlata. Estado, água lógica e gameplay não dependem do resultado do renderizador.

### Candidato híbrido da caldeirinha 1.1.9c

A 1.1.9c é um build diagnóstico isolado. Nas dezessete geometrias rotacionadas do bloco, os quatro bones de água são removidos e todos os nove grupos cosméticos usam exclusivamente `opaque`. Uma entidade persistente `aspergillum:aspersorium_water_visual` fornece somente a lâmina d'água com o material vanilla `entity_alphablend`.

O codec `water_base + water_offset` permanece a autoridade. A projeção recebe apenas `water_visual_level ∈ 1..4`, sincronizado ao cliente, e associa-se às coordenadas inteiras do bloco. Colocação, mudança de state, quebra e entity load reconciliam imediatamente a relação; um tick distribuído por bloco entre 80 e 120 ticks repara mundo existente, ausência, deslocamento e duplicata. O reconciliador não varre o mundo, não executa IA e só transmite posição/propriedade quando há divergência. Se a entidade falhar, nenhuma água, carga ou snapshot é alterado.

A 1.1.9a falhou com tipo inválido e a B tornou a entidade invocável, mas o log completo da B demonstrou a causa anterior: `minecraft:pushable` não é mais analisado em formatos a partir de 1.26.10, invalidando todo o actor JSON. A C remove o legado e limita a entidade a `persistent`, `cannot_be_attacked`, `physics` e `collision_box`; a ausência dos novos componentes opt-in de push preserva a imobilidade. `is_spawnable` continua `false`, sem spawn egg. Essa arquitetura ainda não substitui a 1.1.7. Equivalência visual, ordenação de transparência, ciclo de chunks, comandos, explosões e escala precisam do gate físico registrado no [diagnóstico 1.1.9c](diagnostics/1.1.9c-entity-water.md).

## Schema e inicialização

O schema atual é 3. Itens brutos e schemas 0/1/2 são normalizados em todos os slots do inventário, preservando cargas e identidade válida; cosmético/perfil recebem defaults estáveis. A passagem 2→3 amplia a capacidade para quatro sem fabricar a quarta carga. Lore é uma apresentação `RawMessage` traduzida pelo cliente. Schemas futuros não são regravados e operações que mudariam seu estado são recusadas.

## Perfis e extensibilidade

O comportamento do spray está externalizado em `SprayProfile`. `standard`, `processional` e `contained` registram quantidade, pulsos, janela, velocidades, dispersão, origem, steering e escala. Todos congelam o perfil normalizado dentro da `SprinkleSession`, impedindo que uma edição concorrente altere uma rajada já iniciada. Cosmético (`cosmeticId`) e regulagem (`sprayProfileId`) continuam IDs separados na evolução do schema.

## Dependências fixadas

| Área | Versão |
| --- | --- |
| Engine mínima | `1.26.40` |
| Manifest | `2` |
| Geometry attachable | `1.16.0` |
| Script API | `@minecraft/server` `2.9.0` |
| UI estável | `@minecraft/server-ui` `2.1.0` |
| Tipos/peer npm da UI | `@minecraft/common` `1.3.0` (fora do manifest) |
| TypeScript | `5.9.x` |
| Creator Tools | `0.17.7` |
