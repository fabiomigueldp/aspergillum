# Aspergillum audio/SFX subsystem: forensic report and redesign specification

**Audit target:** Git commit `a04a9d8d33cfee5bd55567714365854bd41e6c94`, package `1.0.32`, release label `1.0.18g RC`, Bedrock `26.40` / installed Windows AppX `1.26.4005.0`, `@minecraft/server` `2.9.0` stable.  
**Audit date:** 2026-08-05.  
**Scope:** repository source, generated pack inputs, pinned TypeScript declarations, installed vanilla resources, local Content Logs, Microsoft Learn, official release notes, and clearly labelled community evidence.  
**Evidence labels:** **CODE** means verified in this commit; **LOCAL-RUNTIME-ASSET** means verified in the installed 26.40 AppX or Content Log but not exercised interactively; **OFFICIAL** means Microsoft/Mojang documentation or release notes; **COMMUNITY** means Bedrock Wiki/Minecraft Wiki/community reproduction; **INFERENCE** is a falsifiable conclusion from the preceding evidence; **UNKNOWN** means only a live-game experiment can settle it.

## 1. Executive summary

### Root cause ranking

| Rank | Finding | Verdict | Confidence | Why it matters |
|---:|---|---|---:|---|
| 1 | Held `ItemStack` replacement invalidates or resets the attachable timeline | **Probable root cause; code precondition confirmed, engine consequence requires live capture** | High (0.80) | Every swing replaces the equipped stack before cooldown, and every successful release replaces it again at tick 5, exactly when the release sound and four micro-droplets are due. If either inventory sync rebuilds the attachable after the 0.18 s entry gate, the controller cannot re-enter and all attachable-owned effects disappear while server droplets/gameplay continue. |
| 2 | The `idle -> sprinkle` gate has only 0.18 s of eligibility | **Confirmed design defect; causal contribution probable** | High (0.85) | It provides no durable action latch and depends on a client-render-frame observation of a server-started cooldown. A reset or replication delay of at least 180 ms guarantees a miss if the client sees the server's remaining value. |
| 3 | Release audio is client-timeline-owned although release authorization is server-owned | **Confirmed architectural defect** | Very high (0.98) | The server never emits either valid-sprinkle sound. It can commit a charge and 36 droplets while the client timeline is absent, or the client can play prepare/release while tick-5 revalidation cancels. |
| 4 | Missing offscreen update flag | **Possible amplifier, not a complete first-person explanation** | Medium-low (0.40) | The field is absent and officially documented, but a visible first-person held attachable is not ordinarily "offscreen." It is more credible for third-person camera framing, remote observers, and perspective changes. |
| 5 | Attachable locator failure | **Possible sound-only failure; current 26.40 behavior unknown** | Low-medium (0.30) | Bedrock Wiki records broken attachable locators in 1.21.1, but no primary source or 26.40 reproduction establishes whether unresolved sound locators drop, relocate, or work. The paired particle diagnostic separates this from controller loss. |
| 6 | Voice culling, event deduplication, or missing vanilla media | **Not supported as the primary explanation** | Low (0.15) | The exact raw files and all four vanilla event IDs exist in the installed 26.40 pack. No evidence was found for same-event deduplication at the observed cadence. Voice stealing remains possible only under a deliberately saturated mix. |

The strongest repository fact is not hypothetical: `initializeAspergillum()` **always returns a different `ItemStack` object**, including for an already-current item. It calls `writeAspergillumState()`, which clones the stack and rewrites five dynamic properties plus lore; even a future-schema item is cloned (`src/infrastructure/item-state.ts:74-85,100-102`). `trySprinkle()` then unconditionally equips that returned object (`src/application/sprinkle.ts:176-183`). At release, `writeAspergillumState()` clones again and `setMainhand()` equips that second object (`src/application/sprinkle.ts:109-140`). The pinned API describes `clone()` as creating an exact copy and `setEquipment()` as replacing the item (`node_modules/@minecraft/server/index.d.ts:14730-14738,10358-10370`). This write path is semantically almost idempotent when state is current, but it is **not idempotent at object identity, inventory write, client synchronization, or attachable lifetime level**.

The weaker “controller is stuck in `recovery`” explanation is refuted for the reported ten-second gap under normal evaluation. The action animation is 0.82 s (`packs/resource/animations/aspergillum.action.animation.json:31-32,77-78`), the cooldown is 0.90 s (`packs/behavior/items/aspergillum.item.json:25-32`), and `recovery -> idle` remains true continuously once remaining cooldown is `<= 0` (`packs/resource/animation_controllers/aspergillum.animation_controllers.json:33-40`). Missing one frame cannot lose a level-triggered predicate: every later evaluated frame still sees true. `recovery` can persist only while the controller is not evaluated at all, the held slot/query is invalid in a way that returns a positive non-decaying value, or an engine defect freezes cooldown state. None follows from the code. At most, recovery causes a one-render-frame delay at an exactly back-to-back 18-tick action because Bedrock processes one controller transition per frame; there is still approximately 0.18 s to take the next transition. It cannot explain failure after ten seconds.

### The decisive first QA observation

At animation time `0.25`, `holy_water_release` and `sprinkle_release` use the **same keyframe and the same `aspergillum_tip` locator** in both perspectives (`packs/resource/animations/aspergillum.action.animation.json:33-48,79-94`). Therefore the first live test must answer:

1. When release audio is missing, are the attachable's **four micro-droplets** also missing?
2. **Both missing:** controller/timeline/attachable-level failure — prioritize H1, H2, H3, H5.
3. **Micro-droplets present, only sound missing:** sound-engine/event/locator resolution — prioritize H4, H6, H7.

The script-side fan contains 36 separately spawned droplets (`src/domain/spray-profile.ts:24-45`; `src/application/sprinkle.ts:54-99,140-144`) and is not the diagnostic. The observer must distinguish the four short bridge droplets at the physical tip from the ballistic fan.

### Production recommendation

Make sprinkle audio server-authorized and script-emitted. Play `prepare` after the exclusive session is reserved; play `release` only after the tick-5 transaction commits. Remove audio keyframes from the attachable to prevent duplicates. Use only stable 2.9.0 `Player.playSound`/`Dimension.playSound`; do not use looping or advanced `SoundInstance` controls. Separately, stop the unconditional initialization write by calling `needsAspergillumInitialization()` first. This hotfix does not change UUIDs, identifiers, block states, persistent data, or world compatibility. The unavoidable charge write at release may still interrupt cosmetic attachable particles, so the medium-term design should move the four bridge droplets to a script-authorized emitter as well.

## 2. Method, evidence boundaries, and reproduced constants

The audit followed the repository contracts before code inspection (`docs/PROJECT_STATUS.md:1-72`; `docs/VISUAL_CONTRACT.md:1-114`; `docs/ARCHITECTURE.md:1-187`; `docs/STATE_AND_CONCURRENCY.md:1-160`; `docs/ROADMAP.md:1-355`; `docs/TESTING.md:1-359`). The architecture already declares sounds and HUD as fail-soft presentation and state as server-authoritative (`docs/ARCHITECTURE.md:99-107`). Manual release gates explicitly require first/third-person and multiplayer sound validation (`docs/TESTING.md:229-248,315-327`).

All timing values were re-derived:

| Quantity | Derivation | Source |
|---|---:|---|
| Native cooldown / swing | `0.9 s` = 18 ticks at 20 TPS | `packs/behavior/items/aspergillum.item.json:25-32`; `src/domain/aspergillum.ts:3-4` |
| Controller gate threshold | remaining `> 0.72 s` | `packs/resource/animation_controllers/aspergillum.animation_controllers.json:8-14` |
| Entry window | `0.90 - 0.72 = 0.18 s` = 3.6 nominal ticks | preceding two sources |
| Attachable action length | `0.82 s` | `packs/resource/animations/aspergillum.action.animation.json:31-32,77-78` |
| Prepare keyframe | `0.08 s` | same file `:40-43,86-89` |
| Release + bridge keyframe | `0.25 s` | same file `:33-48,79-94` |
| Server commit | tick 5 = nominal `0.25 s` | `src/application/sprinkle.ts:147-154`; standard 20 TPS is exposed as `TicksPerSecond = 20` in the stable module documentation |
| Server pulses | six, tick offsets 5 through 10; 36 / 6 = 6 droplets per pulse | `src/domain/spray-profile.ts:24-45`; `src/application/sprinkle.ts:140-144` |
| Session lockout | completion at tick 18 | `src/application/sprinkle.ts:155-161`; `src/domain/aspergillum.ts:4` |
| Curve steering | response `0.8`, max step `30 degrees` | `src/domain/spray-profile.ts:41-43`; `src/application/sprinkle.ts:65-83` |
| Default practical send/audibility radius | 16 blocks for volume at or below 1 absent a smaller explicit max | **OFFICIAL:** [Introduction to Sound](https://learn.microsoft.com/en-us/minecraft/creator/documents/introductiontosound?view=minecraft-bedrock-stable) says the engine attempts default playback only for listeners within 16 blocks; **COMMUNITY:** [Bedrock Wiki playsound](https://wiki.bedrock.dev/commands/playsound) documents 16 blocks at volume 1 and 16× volume above 1. Exact engine formula is not officially specified. |

No interactive game test was performed during this audit. Consequently, attachable destruction timing, first-person offscreen handling, perspective-switch clocks, locator failure behavior, and client cooldown replication semantics are explicitly left falsifiable rather than presented as facts.

## 3. Root-cause analysis by hypothesis

### H1 — attachable destruction/reset caused by held `ItemStack` replacement

**Claim.** A current item is cloned and re-equipped on every swing before cooldown, then cloned/re-equipped again at server release. Client processing of either replacement can rebuild the attachable and reset its controller to `idle`. A rebuild later than 0.18 s cannot re-enter `sprinkle`; a tick-5 rebuild can preempt the coincident release keyframe.

**Repository evidence (confirmed).** The identity trace is:

```ts
// src/infrastructure/item-state.ts:74-85
const updated = item.clone();
updated.setDynamicProperty(...); // charges, schema, instance, cosmetic, profile
updated.setLore(loreFor(state.charges));
return updated;

// src/infrastructure/item-state.ts:100-102
const migration = getAspergillumMigration(item);
return migration.status === "future" ? item.clone() : writeAspergillumState(item, migration.state);
```

There is no current-state fast path in `initializeAspergillum()`. A correct guard exists in `needsAspergillumInitialization()` (`src/infrastructure/item-state.ts:88-98`) and is used by background inventory initialization (`src/bootstrap/main.ts:86-106,113-131`), but not by `trySprinkle()`:

```ts
// src/application/sprinkle.ts:176-183,210-217
const rawItem = getMainhand(player);
...
const item = initializeAspergillum(rawItem);
setMainhand(player, item);
...
playSprinkleRecoveryBridge(player);
item.getComponent(ItemComponentTypes.Cooldown)?.startCooldown(player);
scheduleSprinkle(player, started.session);
```

At release:

```ts
// src/application/sprinkle.ts:131-140
setMainhand(player, writeAspergillumState(currentItem, resolution.state));
if (!markSprinkleReleased(session)) return;
action(...);
emitWaterFrame(player, session, 0);
```

`setMainhand()` delegates to `setEquipment()` (`src/infrastructure/item-state.ts:112-118`). The installed declaration states that `ItemStack.clone()` “creates an exact copy” and returns a copy (`node_modules/@minecraft/server/index.d.ts:14730-14738`) and that `setEquipment()` “replaces the item” (`node_modules/@minecraft/server/index.d.ts:10358-10370`). The inventory-change handler does not cancel the session when the new stack preserves type and `instance_id` (`src/bootstrap/main.ts:184-205`), so the server continues normally through a same-ID swap.

**Engine evidence and boundary.** Official attachable documentation says an attachable is the render model associated with an equipped item, and controllers begin in their initial state when a client entity is loaded ([Using Attachables](https://learn.microsoft.com/en-us/minecraft/creator/documents/attachables?view=minecraft-bedrock-stable); [Entity Modeling and Animation](https://learn.microsoft.com/en-us/minecraft/creator/documents/entitymodelingandanimation?view=minecraft-bedrock-stable)). Bedrock Wiki independently states animation controllers reset when an entity reloads ([Animation Controllers](https://wiki.bedrock.dev/animation-controllers/animation-controllers-intro)). No primary source found in this audit promises that replacing a same-type stack with changed NBT/dynamic properties always destroys the attachable, nor specifies client ordering. That last link is an **INFERENCE/UNKNOWN**, not a verified platform contract.

If a reset is processed at client time `r` after cooldown start, and the query reports server-relative remaining time, the new `idle` controller can re-enter only while `0.90 - r > 0.72`, i.e. `r < 0.18`. At `r >= 0.18`, no later frame can make the strictly decreasing remaining value exceed 0.72. At the server release `r ~= 0.25`, remaining is about 0.65, so a reset cannot recover for that action. Whether the `0.25` sound fires before or after the replacement on the same rendered frame is an ordering race.

**Verdict:** **Probable**, with its repository prerequisites **Confirmed**. Most likely explanation of “gameplay and 36 droplets continue, one or both attachable sounds disappear.”

**Settling experiment.** Build four isolated packages from the same commit: A=current; B=guard only the entry write; C=defer/disable only the tick-5 held-stack write in a non-production diagnostic while preserving a logged fake commit; D=move both sounds to script and remove attachable sound keyframes. Record 240 fps video plus Content Log, first-person bridge droplets, and a resource-pack controller debug particle on `on_entry`. Run 100 identical actions per build at 15/30/60/120 FPS caps. If B reduces prepare loss and C eliminates release/bridge loss, H1 is confirmed. A client-side attachable setup counter emitted as a harmless diagnostic particle would directly show rebuilds.

### H2 — fragility of the 0.18 s entry gate

**Claim.** The gate is too short and observes client-render state rather than a durable action token.

**Evidence.** The exact gate is in `packs/resource/animation_controllers/aspergillum.animation_controllers.json:8-14`. Resource-pack animation controllers decide what to play per client and state transitions are evaluated in order; Microsoft documents that only one transition is processed per frame ([Animation Controllers Reference](https://learn.microsoft.com/en-us/minecraft/creator/documents/animations/animationcontroller?view=minecraft-bedrock-stable)). `query.is_cooldown_category` and `query.cooldown_time_remaining` are stable Molang queries since 1.20.60 ([category query](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/molangreference/examples/molangconcepts/queryfunctions/query_is_cooldown_category?view=minecraft-bedrock-stable); [remaining query](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/molangreference/examples/molangconcepts/queryfunctions/query_cooldown_time_remaining?view=minecraft-bedrock-stable)). The latter returns seconds remaining for the held/worn slot. Neither page specifies replication latency, prediction, or whether a replicated start initializes the client at 0.90 or at the server's then-current remainder.

| Render rate | Frame period | Frames spanning 0.18 s | Normal no-lag conclusion |
|---:|---:|---:|---|
| 15 FPS | 66.67 ms | 2.7 | At least two evaluations; safe only absent a >180 ms gap/reset |
| 20 FPS | 50.00 ms | 3.6 | At least three evaluations |
| 30 FPS | 33.33 ms | 5.4 | At least five evaluations |
| 60 FPS | 16.67 ms | 10.8 | At least ten evaluations |
| 120 FPS | 8.33 ms | 21.6 | At least twenty-one evaluations |

With a uniformly random render phase, an eligibility interval of width `W` is sampled with probability `min(1, W/T)`, where `T=1/FPS`. If cooldown becomes visible after latency `L` and reports server-relative remaining, `W=max(0,0.18-L)`. At `L=150 ms`, hit probabilities are 45%/60%/90%/100%/100% at 15/20/30/60/120 FPS; at `L>=180 ms`, all are 0%. This is a mathematical model, not a measured network distribution. A single render stall longer than the residual window can likewise skip it. If instead the client starts its own 0.90 s clock on receipt, replication latency alone does not shorten the window; only attachable reset and frame stalls do. That platform ambiguity must be measured.

**Verdict:** **Confirmed design defect; Probable contributor; replication mechanism Unknown**.

**Settling experiment.** Add a diagnostic controller with threshold bands (`>0.80`, `>0.72`, `>0.60`) that emits distinct one-shot colored particles on entry. Inject 0/50/100/150/180/200/300 ms network delay, cap FPS at the five rates, and log server `system.currentTick` at `startCooldown`. The first observed band proves which remaining value reaches the client and quantifies miss probability.

### H3 — missing `should_update_bones_and_effects_offscreen`

**Claim.** Effects can stop when the attachable is culled/offscreen because the flag is absent.

**Evidence.** The attachable's `scripts` contains only the two hold animations and action controller (`packs/resource/attachables/aspergillum.attachable.json:32-41`). The stable generated attachable reference lists both `should_update_bones_and_effects_offscreen` and `should_update_effects_offscreen` and describes them as updating bones/effects offscreen ([official attachable reference](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/attachablereference/examples/attachabledefinitions/attachable?view=minecraft-bedrock-stable)). However, Creator Tools 0.17.7's locally installed attachable schema does not enumerate these fields, and no installed vanilla attachable uses them (**LOCAL-RUNTIME-ASSET**). This is a tooling/documentation conflict.

A held item is visibly rendered in first person even though the player's third-person body is not; therefore “the own player model is absent” does not prove the attachable is offscreen. In third person, for remote observers, and during camera switches, the equipped render entity can genuinely leave the frustum. The flag is therefore a plausible multiplayer/perspective hardening measure, not a sufficient explanation for repeated visible first-person failures.

**Verdict:** **Possible amplifier; Untestable-without-game for first-person semantics**.

**Settling experiment.** Compare otherwise identical packs with no flag, `should_update_effects_offscreen:true`, and `should_update_bones_and_effects_offscreen:true`. At the release keyframe, aim the third-person camera away, put the actor behind camera, switch F5, and test a remote observer. Check both paired micro-droplets and audio. Also confirm zero schema/Content Log errors on 26.40 before adopting either flag.

### H4 — attachable locator reliability

**Claim.** `locator:"aspergillum_tip"` may cause sound loss if attachable locators remain broken.

**Evidence.** Both sounds and the paired particle reference that locator (`packs/resource/animations/aspergillum.action.animation.json:33-48,79-94`). It exists on the technical `spray_aim` bone at `[-6,37.8,1]` (`packs/resource/models/entity/aspergillum.geo.json:42-58`), under the bound hierarchy whose root retains `q.item_slot_to_bone_name(context.item_slot)` (`packs/resource/models/entity/aspergillum.geo.json:14-18`). Bedrock Wiki says, specifically and historically, “Currently (1.21.1) locators are broken for attachables” ([Animation Effects](https://wiki.bedrock.dev/visuals/animation-effects)). That is **COMMUNITY** evidence, not a 26.40 result. No accessible official bug record or 26.x changelog found here states whether the issue was fixed or whether an unresolved sound locator falls back to actor position, world origin, or silence.

**Verdict:** **Possible; current behavior Untestable-without-game**. There is no evidence to choose outcomes (i)-(iv).

**Settling experiment.** Create four events at the same keyframe: valid locator, nonexistent locator, no locator, and a script `Dimension.playSound` at the actor location, each using distinguishable samples. Record local and remote listeners at actor, origin, 8, 16, and 20 blocks. Pair each with a distinct particle. This directly classifies fallback/drop behavior in 26.40.

### H5 — perspective switch and dual-animation ambiguity

**Claim.** Looping hold animations might keep `q.all_animations_finished` false, or perspective changes may restart/duplicate/abort effects.

**Evidence.** The `sprinkle` state contains two conditionally weighted animations (`packs/resource/animation_controllers/aspergillum.animation_controllers.json:17-30`); the hold animations loop (`packs/resource/animations/aspergillum.hold.animation.json:4-20`) but are invoked beside, not inside, the action controller (`packs/resource/attachables/aspergillum.attachable.json:32-41`). Official Molang documentation defines `q.all_animations_finished` over animations played by the **current controller state** ([query reference](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/molangreference/examples/molangconcepts/queryfunctions/query_all_animations_finished?view=minecraft-bedrock-stable)); the controller guide gives the same current-state scope ([Animation Controllers Reference](https://learn.microsoft.com/en-us/minecraft/creator/documents/animations/animationcontroller?view=minecraft-bedrock-stable)). Thus the looping `hold_*` animations cannot block this controller's exit.

The documentation does not define whether an animation whose conditional blend changes from 0 to 1 mid-state begins at state time, resumes a continuously advancing clock, or starts at local time zero. Therefore a perspective switch could theoretically (a) continue at shared state time, (b) stop one variant and start the other, losing release, or (c) start the second variant at zero and replay prepare/release. The JSON alone cannot select among these.

**Verdict:** looping-hold theory **Refuted**; perspective-switch double/abort **Possible and Unknown**.

**Settling experiment.** Give the FP and TP prepare/release aliases four different diagnostic tones and particles. Switch perspective at 0.15 and 0.30 s, 50 repetitions each at 30/60/120 FPS. Count event order and timestamps. The production solution should not depend on the outcome because server-authorized audio eliminates this ambiguity.

### H6 — culling, voice limits, and deduplication

**Claim.** The engine may steal/deduplicate voices or range-cull the timeline sounds.

**Evidence.** No primary 26.40 document found establishes a global/per-category voice count or same-event deduplication rule. Bedrock Wiki documents that `stream:true` limits simultaneous instances and streams data, but not a global ceiling ([Sounds](https://wiki.bedrock.dev/concepts/sounds)). Therefore “32 voices” must not be asserted as a verified Bedrock 26.40 limit. No code emits duplicate valid-sprinkle audio: the two valid cues are only in the attachable; the script coordinator has six other cues (`src/presentation/sound-coordinator.ts:3-18`), and release-readiness explicitly forbids direct script `playSound` elsewhere (`tools/validate-release-readiness.mjs:90-100`).

Both custom events use category `player`, which routes through the Player volume control; Mojang's 26.40.26 notes specifically fixed some sounds not obeying that slider ([26.40.26 preview notes](https://feedback.minecraft.net/hc/en-us/articles/46719091494797-Minecraft-Beta-Preview-26-40-26)). They omit min/max distance (`packs/resource/sounds/sound_definitions.json:3-27`). Official documentation says default engine admission is within 16 blocks and describes `min_distance`/`max_distance` attenuation ([Introduction to Sound](https://learn.microsoft.com/en-us/minecraft/creator/documents/introductiontosound?view=minecraft-bedrock-stable)). Community documentation gives an audible radius of `max(16,16*play-volume)` unless a smaller max applies; all current definition and call volumes are <=1, so 16 blocks is the best-supported practical radius. The exact curve and the user-supplied `min(max_distance,max(volume*16,16))` formula are not published in official Bedrock docs; treat the formula as **COMMUNITY/INFERENCE**, not primary fact.

**Verdict:** primary-cause theory **Not supported**; saturated-mix voice stealing **Possible/Unquantified**.

**Settling experiment.** In a diagnostic world, fire 1/8/16/24/32/48/64 simultaneous distinguishable voices, then the sprinkle event, across categories. Separately fire the same event 1-10 times at 0/1/2/5 ticks and positions 0/0.1/1 blocks apart. Capture audio and captions. This establishes cap, priority, and deduplication empirically.

### H7 — vanilla event and raw asset existence/stability

**Claim.** One of the six vanilla IDs or three raw paths may be absent or unstable.

**Evidence.** In the installed Windows 26.40 AppX vanilla `sounds/sound_definitions.json`, `bucket.empty_water`, `cauldron.takewater`, `armor.equip_chain`, and `random.click` exist at lines 923, 1060, 1442, and 5125 respectively (**LOCAL-RUNTIME-ASSET**). The physical files `sounds/armor/equip_chain1.fsb`, `sounds/armor/equip_chain2.fsb`, and `sounds/random/splash.fsb` also exist. Their definitions are: bucket category with three empty-water variants; block-category cauldron using splash at volume 0.1; neutral chain equip with six variants; and UI click at sample volume 0.2. The add-on's custom prepare bypasses the vanilla event and hard-codes only chain1/2; release hard-codes splash (`packs/resource/sounds/sound_definitions.json:3-27`).

This proves existence only for installed Windows AppX 1.26.4005.0. No platform-specific pack comparison was available for Xbox, PlayStation, Switch, Android, or iOS. Raw vanilla path references are tighter coupling than vanilla event IDs: a Mojang rename/repackage can silently invalidate an add-on definition even when the semantic event survives. No 26.x deprecation/rename was found in official release notes. Microsoft recommends using the vanilla pack as the current reference ([Creating and Adding Custom Sounds](https://learn.microsoft.com/en-us/minecraft/creator/documents/addcustomsounds?view=minecraft-bedrock-stable)).

No deliberately broken-path diagnostic was run, and the inspected logs contain no missing-file warning for these three paths. Whether a missing raw path is always reported or can fail silently is therefore **Unknown**, not inferred from the successful files. The cross-reference validator and live negative-control pack proposed below settle both build-time and runtime behavior.

**Verdict:** missing-on-installed-26.40 theory **Refuted**; future/cross-platform raw-path risk **Possible**.

**Settling experiment.** Run a startup diagnostic on each target platform that invokes all eight IDs individually and inspect the Content Log/captions. For CI on Windows, validate every raw path against the installed AppX. Long term, ship owned `.ogg` assets so Mojang paths are not a dependency.

### H8 — script/client divergence

**Claim.** Server release and client audio timeline are independently allowed to succeed or fail.

**Evidence.** No valid-sprinkle sound is played in `sprinkle.ts`; only dry click is script-owned (`src/application/sprinkle.ts:188-197`). The client begins its cooldown timeline after a reserved session (`src/application/sprinkle.ts:200-217`), while the server revalidates player, dimension, slot, item identity, mode, charge, and domain resolution at tick 5 (`src/application/sprinkle.ts:109-130`). It commits state before particles (`:131-144`). Client audio has no signal for any of those failure branches.

There are four divergence classes:

1. **Server commit, client timeline absent:** H1/H2/H3/H5 prevents entry/effects; server still writes charge and emits six pulses. This matches the reported symptom.
2. **Server commit, release keyframe interrupted:** prepare may play; tick-5 stack replacement or perspective/culling kills release and bridge; server emits 36 droplets.
3. **Client cue, server cancellation:** prepare at 0.08 necessarily precedes tick-5 revalidation. Release at 0.25 can race with or follow a failed commit. Game mode/dimension/slot/identity/range/charge changes can cancel while client audio continues.
4. **Client duplicate/restart, one server commit:** an early attachable reset while remaining `>0.72`, or a perspective clock restart, can replay one/both keyframes while the session's `phase` and action lease admit only one server release (`src/infrastructure/sprinkle-session.ts:26-40,56-75`; `src/infrastructure/action-lease.ts:17-43`).

A fifth concrete path is visible in code: `startCooldown()` is wrapped in a catch that only logs and then still schedules the sprinkle (`src/application/sprinkle.ts:210-217`). A transient API exception therefore guarantees server gameplay with no cooldown-gated client timeline. The warning text should be searched in the Content Log for every failed reproduction.

**Verdict:** **Confirmed architectural defect**.

**Settling experiment.** Add correlated action IDs to server debug logs and diagnostic subtitle keys for client keyframes; capture tick/frame timestamps over every cancellation condition. Production remediation is still to emit transaction-significant audio from the authorized server path.

### H9 — recovery bridge, swing duration, and `variable.attack_time`

**Claim.** The player animation bridge interferes with the attachable controller or sound effects.

**Evidence.** `playSprinkleRecoveryBridge()` calls player-level `playAnimation()` with a dedicated controller name and 0.05 s blend (`src/presentation/animation-coordinator.ts:3-24`). It is called before native cooldown start (`src/application/sprinkle.ts:210-216`). The player animation affects only `rightarm` and uses `variable.attack_time` for a 30-degree Hermite tail (`packs/resource/animations/aspergillum.action.animation.json:18-29`); loading has a similar tail (`:4-16`). The attachable action uses its own `aspergillum_action` bone and controller (`:31-131`; `packs/resource/animation_controllers/aspergillum.animation_controllers.json:1-45`). All attachable states have 0.08 s cross-fade (`:8-41`). Bedrock Wiki notes independently named play-animation controllers stack rather than replace one another ([Playanimation](https://wiki.bedrock.dev/commands/playanimation)). No shared variable write, controller name, effect keyframe, or state predicate was found.

`minecraft:swing_duration` and cooldown both equal 0.9 (`packs/behavior/items/aspergillum.item.json:25-32`); `variable.attack_time` shapes the arm tail but is not referenced by the attachable action controller. Blend transitions interpolate poses; official controller docs do not say they suppress effect keyframes ([Animation Controllers Reference](https://learn.microsoft.com/en-us/minecraft/creator/documents/animations/animationcontroller?view=minecraft-bedrock-stable)).

**Verdict:** direct-interference theory **Refuted by structure**, with generic engine interaction **Unproven**.

**Settling experiment.** A/B only `playSprinkleRecoveryBridge()` across 100 actions, keeping cooldown and attachable unchanged. Any significant event-count difference would reveal an engine interaction absent from the data model.

### H10 — `No sound found for block type 'normal'`

**Claim.** A custom aspersorium permutation lacks a valid block sound group.

**Evidence.** The resource pack maps the sole block identifier to `metal` (`packs/resource/blocks.json:1-6`). The behavior pack declares one identifier and state dimensions for water, docked state, and 16 rotations (`packs/behavior/blocks/aspersorium.block.json:3-50`); permutations alter loot/geometry/bone visibility, not the identifier or sound mapping (`:50-328`). Therefore every enumerated custom permutation resolves through the same `blocks.json` entry in source. The installed vanilla 26.40 `sounds.json` contains both `normal` and `metal` groups at lines 153/1566 and 164/1578 (**LOCAL-RUNTIME-ASSET**).

The warning is nevertheless real. Local Content Logs contain 371 occurrences in `ContentLog2026-08-04_19-10-03_1.txt` (pack 1.0.23), 13 in a 1.0.25 log, six across 1.0.28 logs, and one at line 3 of `ContentLog2026-08-05_02-17-29_1.txt` with installed pack 1.0.32 (**LOCAL-RUNTIME-ASSET**). The message contains no block identifier, coordinates, or pack attribution, so it cannot be causally assigned to Aspergillum. The fact that `normal` itself exists also argues against a simple missing group.

**Verdict:** “current aspersorium permutation falls through” **Refuted by source**; warning source **Unresolved**.

**Settling experiment.** New empty world, only final add-on, clear log, then separately place/break/step/hit/interact with each water band and docked state. Timestamp each action. Repeat without the add-on. If isolated, temporarily change `blocks.json` between `metal`, `normal`, and a deliberately invalid name to fingerprint the engine message.

## 4. Full audio inventory

There are exactly eight authored gameplay cues: six script calls to vanilla events and two attachable animation aliases. `SOUND_CUES` is the complete script catalogue (`src/presentation/sound-coordinator.ts:3-12`); the attachable maps exactly two effect shortnames (`packs/resource/attachables/aspergillum.attachable.json:18-24`). Validation rejects custom sprinkle audio from script in the current architecture (`tools/validate.mjs:287-292,456-477`; `tools/validate-vfx.mjs:81-103,154-167`).

| Cue | ID / alias -> sample | Effective configured mix | Trigger and order | Ownership | Audience/spatiality | Nominal radius | Suppression/failure behavior |
|---|---|---|---|---|---|---:|---|
| Aspersorium fill | `bucket.empty_water` | script pitch 1.08, volume 0.75; vanilla event has three variants | After block becomes full and, outside Creative, hand becomes empty bucket | Server script presentation after state writes | `Player.playSound`, private; no explicit location, so near recipient | Recipient only; range not a multiplayer selector | Denied mode/full block return before cue; if either state write throws, cue is not reached; audio exception is caught and gameplay remains committed (`src/application/aspersorium.ts:82-94`; `src/presentation/sound-coordinator.ts:14-22`) |
| Dock | `armor.equip_chain` | pitch 0.92, volume 0.58; vanilla event randomly selects six chain variants | After registry snapshot, hand clear, and docked block permutation succeed | Server script presentation after transaction | Private `Player.playSound`, no location | Recipient only | Overflow/schema/registry/busy failures suppress; rollback path suppresses; cue exception cannot roll back (`src/application/aspersorium.ts:175-224`) |
| Undock | `armor.equip_chain` | pitch 1.12, volume 0.55 | After block undocks, snapshot is deleted, and item is given/dropped | Server script presentation after transaction | Private, no location | Recipient only | Nonempty hand is blocked by routing; transaction failure suppresses; recovered “missing snapshot” item still produces cue after successful undock (`src/application/aspersorium.ts:227-255,306-313`) |
| Load prepare | `armor.equip_chain` | pitch 1.18, volume 0.32 | Immediately after exclusive loading session acquisition; before 10-tick commit | Server script, intent/reservation cue | Private, no location | Recipient only | Zero transfer, busy player/block, invalid schema, denied mode suppress; later cancellation does **not** retract it (`src/application/aspersorium.ts:128-172`) |
| Load commit | `cauldron.takewater` | pitch 1.32, volume 0.78; vanilla event maps splash at sample volume 0.1 | Tick 10, after late revalidation and atomic item+block commit | Server script, transaction-success cue | Private, no location | Recipient only | Every revalidation/zero-transfer/transaction failure suppresses; cue failure cannot roll back (`src/application/aspersorium.ts:96-125`; `src/infrastructure/loading-session.ts:39-69`) |
| Dry | `random.click` | pitch 0.72, volume 0.45; vanilla event sample volume 0.2/category UI | On a valid, supported empty aspergillum after logical cooldown check | Server script, rejected-action cue | Private; UI-category source semantics are non-positional in vanilla | Recipient only | Busy/denied/unsupported/not held/cooldown branches suppress before dry; dry starts no native cooldown/session (`src/application/sprinkle.ts:173-218`) |
| Sprinkle prepare | attachable alias `sprinkle_prepare` -> `aspergillum.sprinkle.prepare` -> raw `equip_chain1` (0.24×, 1.48×) or `equip_chain2` (0.22×, 1.56×), equal implicit weights | definition-only values; no script gain | Animation local time 0.08 after controller enters `sprinkle` | Client resource-pack timeline | Positional at `aspergillum_tip` if locator resolves; potentially synthesized independently on every observing client | Best-supported 16 blocks | Lost on no controller entry, attachable reset before 0.08, culling, locator/event/media failure, or voice stealing; can fire before server later cancels (`packs/resource/sounds/sound_definitions.json:3-18`; action animation `:40-43,86-89`) |
| Sprinkle release | alias `sprinkle_release` -> `aspergillum.sprinkle.release` -> raw `sounds/random/splash` (0.54×, 1.34×), one variant | definition-only values | Animation local time 0.25, coincident with bridge particle and nominal server tick-5 commit | Client resource-pack timeline | Positional at same locator if it resolves; potentially heard by local/remote observers whose clients run the timeline | Best-supported 16 blocks | All prepare-loss causes plus interruption between 0.08 and 0.25; can fire even if server tick-5 revalidation cancels (`packs/resource/sounds/sound_definitions.json:19-27`; action animation `:33-48,79-94`) |

The six private cues omit `PlayerSoundOptions.location` even though stable 2.9.0 supports it (`node_modules/@minecraft/server/index.d.ts:24658-24680`). They are therefore “near the player,” not explicitly attached to the basin or hand. `Player.playSound` is documented as audible only to that player (`node_modules/@minecraft/server/index.d.ts:16687-16729`). The two attachable cues are not calls to `Player.playSound`; they are resource animation effects. Their multiplayer audience is client-render dependent and must be measured.

### Recommended audience and space per cue

| Cue | Current | Recommended | Radius/design reason |
|---|---|---|---|
| Fill | Private | `Dimension.playSound` at aspersorium center | 12 blocks; a bucket emptied into a world object should be shared but restrained |
| Dock | Private | World at aspersorium center | 10 blocks; meaningful physical placement |
| Undock | Private | World at aspersorium center | 10 blocks; meaningful physical removal |
| Load prepare | Private | Keep private at player/hand, or very quiet world layer | 6-8 blocks if shared; primarily tactile feedback to actor |
| Load commit | Private | World at aspersorium center with magnitude encoding | 10-12 blocks; water transfer changes public block state |
| Dry | Private | Keep private | No world state changes; avoid multiplayer spam |
| Sprinkle prepare | Client timeline | Private stable `Player.playSound` after session reservation | Actor-only metallic handling cue; remote observers do not need the detail |
| Sprinkle release | Client timeline | `Dimension.playSound` at authoritative release origin after commit | 16 blocks; the release is an observable world action and should be identical for all listeners |

`Dimension.playSound` accepts an explicit `Vector3`, plays for all players, and returns `SoundInstance` (`node_modules/@minecraft/server/index.d.ts:7819-7842`). Its world options contain only pitch/volume (`:25488-25503`). These recommendations use no Beta API.

## 5. Complete call graphs and suppression matrix

### Sprinkle: input to gameplay and both client sounds

```text
world.afterEvents.playerSwingStart                         bootstrap/main.ts:152-156
  suppress unless source is Attack|Mine and held type matches
  -> trySprinkle(player)                                  application/sprinkle.ts:173-218
     -> validate current item/type/schema/mode
     -> initializeAspergillum(raw) -> clone/rewrite
     -> setMainhand(clone)                                tick 0 stack replacement A
     -> enforce logical 18-tick last-action gate
     -> if empty: Player.playSound(random.click); return  [dry only]
     -> derive instance/basis, acquire action lease/session
     -> record logical cooldown tick
     -> player.playAnimation(recovery bridge)
     -> ItemCooldownComponent.startCooldown(player)
        ~ client sees cooldown
        -> attachable controller idle -> sprinkle if remaining > .72
           -> FP or TP action animation
              local +.08: sprinkle_prepare effect
              local +.25: sprinkle_release + four bridge particles
     -> schedule tick 5 commit and tick 18 completion
        tick 5 -> commitSprinkleRelease                   sprinkle.ts:109-145
          late validate player/dimension/slot/type/instance/mode/charge
          resolveSprinkle(domain)
          setMainhand(writeState(clone))                  stack replacement B
          mark session released; HUD; emit pulse 0
          schedule pulses 1..5 at ticks 6..10
        tick 18 -> release lease/session
```

State is written before any script particle at release (`src/application/sprinkle.ts:131-144`). If `setMainhand()` throws, neither `markSprinkleReleased()` nor particles run; there is no catch inside the callback, so no sprinkle audio is emitted by script either. The client timeline is already independent. A lifecycle cancellation clears scheduled run IDs and lease (`src/infrastructure/sprinkle-session.ts:62-75`); hotbar, dimension, mode, death, spawn, and leave handlers invoke cancellation/clear (`src/bootstrap/main.ts:171-223`).

### Fill

```text
custom block onPlayerInteract OR item onUseOn
  -> scheduleAspersoriumInteraction (one-tick deferred, duplicate claim)
  -> reject active action/block lock
  -> water bucket -> fillFromBucket
     reject denied/full
     set block water=16
     survival: replace water bucket with bucket
     playSoundCue(aspersoriumFill)
     HUD
```

The interaction is deferred with `system.run()` after an event-level claim (`src/application/aspersorium.ts:50-69,282-342`). This suppresses duplicate callbacks, but the claim is not an audio deduplicator beyond the interaction. The two writes in `fillFromBucket()` are not wrapped in a rollback transaction (`:82-94`): an exception after the block write but before hand replacement/cue can leave a partial state and silence. That is a non-audio transactional smell.

### Load

```text
interaction route -> loadItem                           aspersorium.ts:128-173
  validate policy/item/schema
  initialize clone + unconditional setMainhand          stack replacement
  domain preview; reject zero transfer
  startLoadingSession (player lease + block lock)
  playSoundCue(loadPrepare)                             tick 0, can outlive cancellation
  playLoadingAnimation
  tick 10 -> commitLoading                              aspersorium.ts:96-126
     revalidate player/dimension/slot/range/block/dock/item identity/water/mode
     resolve quantitative transfer
     commitMainhandAndBlock                             transaction.ts:7-24
       set item; set block; defensive rollback on error
     playSoundCue(loadCommit)                           only after success
     wet VFX + quantitative HUD
  tick 16 -> release session/locks
```

`loadPrepare` deliberately describes accepted intent, not success. `loadCommit` cannot fire on a returned-false or rolled-back transaction. Audio exceptions are fail-soft and occur after commit.

### Dock

```text
interaction route with sneaking intent -> dockItem       aspersorium.ts:175-225
  validate item/schema/not already docked/capacity
  verify no orphan snapshot
  capture initialized item snapshot
  transaction try:
     registry snapshot -> clear mainhand -> set docked/water permutation
  catch: restore hand/block/delete registry; no sound
  success: playSoundCue(dock) -> HUD
```

The sound cannot fire before the success boundary. A sound exception cannot undo docking.

### Undock

```text
interaction route, docked + empty hand -> undockItem     aspersorium.ts:227-256
  read snapshot; construct restored or safe empty item
  transaction try:
     unset docked permutation -> delete snapshot -> give/drop item
  catch: restore permutation/snapshot; no sound
  success: playSoundCue(undock) -> HUD
```

The sound cannot fire on a caught rollback. If `giveOrDrop` adds the item and a later exception occurs, a perfect rollback is not guaranteed because inventory insertion itself is not reversed (`src/infrastructure/item-state.ts:190-203`), but there is no later operation inside the try after `giveOrDrop`; the normal sound follows success.

### Suppression and false-positive matrix

| Operation/cue | Deliberate suppression branches | Can sound fire though operation ultimately fails? | Can operation commit though sound is missing? |
|---|---|---|---|
| Fill | denied, full, busy interaction | No later revalidation; partial exception can occur before cue | Yes: audio throws; also block may write before later exception (`aspersorium.ts:82-94`) |
| Load prepare | denied, wrong item, future schema, zero preview, player/block busy | **Yes**: any tick-10 revalidation or transaction failure | N/A; it is intent cue |
| Load commit | all tick-10 validation/zero transfer/commit false | No, call follows successful transaction | Yes: caught audio exception (`aspersorium.ts:96-125`) |
| Dock | wrong/docked/future/overflow/registry/busy/transaction catch | No, call follows try success | Yes: caught audio exception (`:175-224`) |
| Undock | not docked, nonempty-hand route, registry/transaction catch | No, call follows try success | Yes: caught audio exception (`:227-255`) |
| Dry | wrong item/schema, denied, logical cooldown, nonempty charges, busy lease | No gameplay operation is expected | Yes: dry feedback can be silent on audio exception (`sprinkle.ts:173-218`) |
| Sprinkle prepare | controller gate/reset/culling/locator/media/mix | **Yes**: it fires at +0.08 before tick-5 validation | Yes, by all H1-H7 client paths |
| Sprinkle release | same, plus interruption before +0.25 | **Yes**: client keyframe can race/follow failed tick-5 validation | Yes, reported class |

## 6. Frame-accurate state-machine analysis

### Modeling assumptions and limits

The server is modeled at nominal 20 TPS; real ticks can take longer. `system.runTimeout` promises a future tick count, not a wall-clock deadline (`node_modules/@minecraft/server/index.d.ts:20795-20810`; [System reference](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/system?view=minecraft-bedrock-stable)). Render controllers evaluate per frame and process at most one transition per frame ([Animation Controllers Reference](https://learn.microsoft.com/en-us/minecraft/creator/documents/animations/animationcontroller?view=minecraft-bedrock-stable)). `E` denotes the frame when the client first enters `sprinkle`; action-local keyframes are measured from `E`. `R0`/`R5` denote the client frames that process entry/release stack replacements. Their timing is not specified by the API.

### Nominal server tick timeline for one sprinkle

| Server tick | Nominal time | Cooldown remaining | Session | Server action / item mutation | Script droplets | Client action if controller entered at time 0 |
|---:|---:|---:|---|---|---:|---|
| 0 | 0.00 | 0.90 | `reserved` | initialize clone; equip replacement A; lease/session; player bridge; start cooldown | 0 | `idle -> sprinkle`; action time 0 |
| 1 | 0.05 | 0.85 | reserved | none | 0 | action .05 |
| 2 | 0.10 | 0.80 | reserved | none | 0 | prepare crossed at .08 |
| 3 | 0.15 | 0.75 | reserved | none | 0 | action .15; gate would still be true if reset here |
| 4 | 0.20 | 0.70 | reserved | none | 0 | a reset now returns idle and permanently misses gate |
| 5 | 0.25 | 0.65 | `released` on success | late validation; consume/retain; clone/equip replacement B; mark release | 6 | release sound + 4 bridge particles are due on same client time |
| 6-10 | .30-.50 | .60-.40 | released | steering re-sampled per pulse | 6 each | action continues |
| 11-16 | .55-.80 | .35-.10 | released | none | 0 | action approaches .82 end |
| 17 | .85 | .05 | released | none | 0 | `q.all_animations_finished` transitions to recovery at first frame after .82 |
| 18 | .90 | 0 | completed | lease/session released | 0 | recovery predicate becomes true; next evaluated frame returns idle |

Code citations: session start/phase (`src/infrastructure/sprinkle-session.ts:26-40,56-59`), cooldown and schedules (`src/application/sprinkle.ts:200-217,147-161`), commit/pulses (`:109-145`), steering (`:54-99`), profiles (`src/domain/spray-profile.ts:24-45`).

### Render-frame crossing times when `E=0`

Effects execute on the first evaluated animation frame at or after their keyframe. Exact “equal timestamp” ordering against inventory sync is unknown.

| FPS | Frame times around prepare | First frame >= .08 | Frame times around release | First frame >= .25 | Frames in gate |
|---:|---|---:|---|---:|---:|
| 30 | .0667, .1000 | .1000 | .2333, .2667 | .2667 | 5.4 |
| 60 | .0667, .0833 | .0833 | .2333, .2500 | .2500 | 10.8 |
| 120 | .0750, .0833 | .0833 | .2417, .2500 | .2500 | 21.6 |

If entry occurs one frame late, add one frame period to every client keyframe. At 15 FPS, entry at 0 produces prepare at .1333 and release at .2667; entry at .0667 produces prepare at .2000 and release at .3333. Thus the server's tick-5 replacement can arrive before the client reaches release even with no network delay.

### Scenario 1 — single nominal sprinkle

| Phase | 30 FPS | 60 FPS | 120 FPS | Loss point |
|---|---|---|---|---|
| Controller entry | first eligible frame in [0,.18) | same | same | If no eligible evaluated frame, both sounds/bridge lost |
| Prepare | `E` rounded up to next frame after +.08 (normally .100) | normally .0833 | normally .0833 | Any attachable reset/cull before crossing |
| Server commit | tick 5, .250 | .250 | .250 | replacement B queued to client |
| Release | normally .2667 | normally .250 | normally .250 | At 30 FPS, commit precedes render crossing; at 60/120 FPS, same timestamp ordering race |
| End/recovery | first frame >= `E+.82` | same | same | Audio already completed |

Nominal success is possible and commonly observed. Intermittency arises because `R0`, `R5`, `E`, and render crossings vary independently.

### Scenario 2 — two sprinkles at the minimum 18-tick gap

| Time | First action | Controller | Second action |
|---:|---|---|---|
| 0-.82 | active | sprinkle | blocked by action lease/logical cooldown |
| .82-.90 | finished | recovery | still blocked |
| .90 | scheduled session completion and cooldown zero | recovery's `<=0` transition becomes true | next swing can acquire only if the tick-18 completion callback has already released the lease; same-tick callback/event ordering is not specified, so it may be transiently rejected until tick 19 |
| next render frame | — | if still recovery, transition to idle; only one transition processed this frame | cooldown remains about .88-.83 depending FPS |
| following render frame | — | idle can enter sprinkle while remaining >.72 | valid at all listed FPS absent stalls/reset |

The one-transition-per-frame rule can consume one frame, but at 15 FPS two frames cost about .133 s, still below .18 s if aligned favorably. A third delayed frame or replacement can miss. This is the only credible transient role for recovery. It does not persist across a long idle.

### Scenario 3 — two sprinkles separated by ten seconds

At .90 s the recovery predicate becomes permanently true, and every subsequent evaluated frame can return to idle (`packs/resource/animation_controllers/aspergillum.animation_controllers.json:33-40`). By 10 s there are about 136/191/291/591/1191 opportunities at 15/20/30/60/120 FPS after cooldown expiry. Pure recovery lock is therefore refuted. The second action has the same R0/R5/gate race as the first; a ten-second wait does not protect it because each action performs fresh stack replacements (`src/application/sprinkle.ts:182-183,131-132`).

### Scenario 4 — tick-5 revalidation fails

| Time | Server | Client timeline |
|---:|---|---|
| 0 | reserves session, starts cooldown | may enter sprinkle |
| .08 crossing | no commit yet | prepare plays — false-positive accepted-intent cue |
| .25 tick 5 | any check at `sprinkle.ts:110-129` fails; `cancelWaterSpray`; no charge write or 36 droplets | release may already play (60/120 ordering), or plays at .2667 at 30 FPS despite cancellation |
| .25-.82 | no session | controller has no cancellation input, so animation can finish |

Triggers include invalid/dead player, changed dimension/slot/item/`instance_id`, Spectator transition, external charge depletion, or domain denial. Some item/slot changes also destroy the attachable and can incidentally stop the client timeline, but that is not a contractual cancellation channel.

### Scenario 5 — perspective switches at .15 and .30

| Switch | Facts | Possible runtime A | Possible runtime B | Required interpretation |
|---|---|---|---|---|
| .15 | prepare normally already crossed; release pending | both variants share state clock: TP continues and release occurs once at .25 | TP starts at local 0: second prepare near .23 and release near .40; FP release is aborted | Unknown without diagnostic aliases |
| .30 | normal release already crossed at 60/120 and .2667 at 30 | new variant sees state time .30 and does not replay past effects | new variant starts at 0 and replays prepare/release at .38/.55 | Unknown; can create double sounds |

The current-state scoping of `all_animations_finished` is known; conditional animation-clock semantics are not. No production transaction cue should rely on them.

### Scenario 6 — 200 ms client latency

| Cooldown replication model | Client first sees | Gate result | Audio result |
|---|---:|---|---|
| Server-relative remaining | about .70 s | `.70 > .72` false | both timeline sounds and bridge lost; server release still succeeds |
| Start packet initializes local duration | .90 s at receipt | true for another .18 s | timeline delayed ~.20 s; its release at ~.45 no longer aligns with tick-5 stack write, but a later sync can still reset it |
| Client predicts attack cooldown | near .90 before server packet | likely enters early | later correction/reset behavior unknown |

The first model exactly produces the bug. Official query/API docs do not select a model, so this is a priority live experiment.

### Scenario 7 — 15 FPS

| Render frame | Time | If entry at 0 | If entry at first late frame .0667 |
|---:|---:|---|---|
| 0 | .0000 | enter, anim .000 | controller still idle |
| 1 | .0667 | anim .0667 | enter, anim .000 |
| 2 | .1333 | prepare fires | anim .0667 |
| 3 | .2000 | anim .2000 | prepare fires; gate is now closed for any reset |
| server tick 5 | .2500 | stack replacement B/commit | same |
| 4 | .2667 | release should fire, ordering after commit | anim .2000 |
| 5 | .3333 | — | release should fire well after commit |

This does not make low FPS intrinsically miss the original 0.18 s gate, because 2.7 frames are available. It does make the release keyframe much more likely to be reached after the tick-5 inventory replacement has been processed.

## 7. Script API 2.9.0 capability reference and stability delta

The repository's installed declaration is the target contract, not the rolling web page. `package.json` pins `@minecraft/server` to `2.9.0` (`package.json:30-38`), the behavior manifest requests `2.9.0` (`packs/behavior/manifest.json:25-38`), and `node_modules/@minecraft/server/package.json` reports 2.9.0. The exact local signatures are:

```ts
// node_modules/@minecraft/server/index.d.ts:7842
playSound(soundId: string, location: Vector3,
          soundOptions?: WorldSoundOptions): SoundInstance;

// :16729
playSound(soundId: string,
          soundOptions?: PlayerSoundOptions): SoundInstance;

// :20166-20175
export class SoundInstance {
  private constructor();
  stop(): void;
}

// :24661-24680
export interface PlayerSoundOptions {
  location?: Vector3;
  pitch?: number;
  volume?: number;
}

// :25491-25503
export interface WorldSoundOptions {
  pitch?: number;
  volume?: number;
}
```

### Stable-target comparison

| Capability | Local 2.9.0 declaration | Rolling Learn “stable” page as of audit | Safe for this add-on? |
|---|---|---|---|
| `Player.playSound(string, options)` | Present; private recipient; returns `SoundInstance` (`:16687-16729`) | Present, but current page also accepts pre-release `SoundDefinition|string` | **Yes**, string overload only |
| `Dimension.playSound(string, location, options)` | Present; all players; returns handle (`:7819-7842`) | Present | **Yes** |
| `PlayerSoundOptions.location` | Present (`:24661-24680`) | Present, not marked pre-release | **Yes** |
| `PlayerSoundOptions.pitch`, `volume` | Present | Present | **Yes** |
| `PlayerSoundOptions.loopCount` | Absent | Present but explicitly **pre-release** ([PlayerSoundOptions](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playersoundoptions?view=minecraft-bedrock-stable)) | **No** |
| `WorldSoundOptions.location` | Not a field; location is required positional argument | Same conceptual shape | N/A |
| World loop field | Absent | No stable field established | **No** |
| `SoundInstance.stop()` | Present; local comments have no beta/pre-release tag (`:20166-20175`) | Current page marks it **pre-release** | Avoid for redesign; version-document conflict |
| `pause`, `resume`, `fade`, `seekTo`, `setVolume`, `setPitch` | **Absent** despite prose at `:20158-20164` mentioning most of them | All present and explicitly **pre-release** ([SoundInstance](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/soundinstance?view=minecraft-bedrock-stable)) | **No** |
| `durationInfo`, `id`, `recipient`, `soundEventId` | **Absent** | All explicitly **pre-release** | **No** |
| `SoundDefinition` typed argument | Absent | Added to beta in 26.40.27 ([26.40.27 preview](https://www.minecraft.net/article/minecraft-preview-26-40-27)) | **No** |

Thus the mission premise that 2.9.0 stable provides the full advanced surface is contradicted by the installed typings. Only `stop()` is locally exposed; every listed property and every other control is absent. The rolling Learn page labels even `stop()` pre-release, so the production design should rely on none of them. One-shot sounds need no handle management.

`Player.playSound` can take a location. The current coordinator simply does not use it (`src/presentation/sound-coordinator.ts:14-18`). `Dimension.playSound` is world-audible at its positional argument; it is the appropriate stable primitive for shared physical actions. Neither stable options type supports looping.

### Scheduling guarantees

```ts
// node_modules/@minecraft/server/index.d.ts:20794
runJob(generator: Generator<void, void, void>): number;
// :20810
runTimeout(callback: () => void, tickDelay?: number): number;
```

The declaration says `runJob` receives a time slice each tick and runs until yield/completion (`node_modules/@minecraft/server/index.d.ts:20757-20794`). It is unsuitable for frame-accurate audio. `runTimeout` schedules after a tick count, not at an audio/sample clock (`:20795-20810`). Official docs additionally warn that general `system.run` same/next-tick behavior is not guaranteed under load ([System](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/system?view=minecraft-bedrock-stable)). The current tick-5 release is therefore transaction timing, not a guarantee of exactly 250 ms wall time. Audio should be emitted in the commit callback, not independently scheduled to a presumed wall-clock keyframe.

### Relevant identity/cooldown surfaces

`ItemCooldownComponent.startCooldown(player):void`, `getCooldownTicksRemaining(player):number`, and `isCooldownCategory(string):boolean` are stable local methods (`node_modules/@minecraft/server/index.d.ts:14060-14085`). They provide server-side facts but no direct durable Molang variable on the client. `ItemStack.clone()` returns a copy (`:14730-14738`) and `EntityEquippableComponent.setEquipment()` replaces the slot (`:10358-10370`). No 2.9.0 method promises an in-place persistent mutation of an equipped stack without replacement or an attachable-preserving write.

## 8. Sound definition and `sounds.json` schema on 26.40

### Source conflict and version choice

The add-on declares format `1.14.0` (`packs/resource/sounds/sound_definitions.json:1-3`). That legacy value remains widely used and is documented by Bedrock Wiki. The installed 26.40 vanilla pack declares `1.20.20`, and current Microsoft guidance uses `1.20.20` ([Creating and Adding Custom Sounds](https://learn.microsoft.com/en-us/minecraft/creator/documents/addcustomsounds?view=minecraft-bedrock-stable)). New authored work should use `1.20.20` after packaging validation; no experimental format is required. The 26.40 preview's `minecraft:server_sound_definitions` payload uses `"format_version":"beta"` and is explicitly preview/beta ([26.40.20 preview](https://feedback.minecraft.net/hc/en-us/articles/46333309174669-Minecraft-Beta-Preview-26-40-20)); it must not be adopted.

Creator Tools 0.17.7's local resource schema supports the following event fields: `category`, `sounds`, `min_distance`, `max_distance`, and legacy distance behavior. Per-sample objects support `name`, `is3D`, `pitch`, `volume`, `stream`, and integer `weight`. Installed vanilla files additionally use `load_on_low_memory` and event `subtitle`, even though the local Creator schema omits them. This is another schema/runtime skew. Field status:

| Field | 26.40 evidence and semantics | Current add-on | Production guidance |
|---|---|---|---|
| `format_version` | `1.14.0` accepted historically; installed vanilla/current Learn use `1.20.20` | `1.14.0` | Move to `1.20.20` with validation |
| `category` | Local enum: `ambient`, `block`, `music`, `weather`, `ui`, `bucket`, `neutral`, `player`, `hostile`, `record`, `bottle`; routes the corresponding category mix. `ui` ignores normal range per community docs. Exact bucket/bottle slider routing is not officially documented. | `player` on two custom events | Keep `player` for hand prep; use `player` or `neutral` for physical sprinkle after slider QA |
| `min_distance` | Distance at which attenuation begins; exact default conflicts: Learn describes 1.0 in its example discussion, Bedrock Wiki says 0.0 | absent | Author explicit float, e.g. 1.0, to remove ambiguity |
| `max_distance` | Far edge/cap for attenuation; current Learn examples allow `null` with legacy behavior | absent | Author explicit 10/12/16 floats per cue |
| event `pitch`/`volume` | Present in installed vanilla as scalars; local schema accepts scalar | absent | Prefer per-sample or `sounds.json` randomization; test event-level usage |
| sample `pitch`/`volume` | Local schema: scalar number; installed vanilla uses scalars | fixed scalar on all three current raw samples | Keep conservative fixed base; randomization belongs in `sounds.json` or authored variants |
| `[min,max]` pitch/volume | Officially demonstrated in `sounds.json` event mappings, **not accepted by the local `sound_definitions` sample schema** | absent | Do not put ranges in `sound_definitions.json`; use `sounds.json` mappings or pre-authored variants |
| `weight` | Nonnegative integer relative selection weight; default effectively 1 | absent (prepare has equal implicit weights; release one sample) | Explicit weights only when selection is intentionally unequal |
| `stream` | Streams rather than loading whole sample; intended for long audio and can limit concurrent instances | absent | False/omit for subsecond SFX |
| `load_on_low_memory` | Used by installed vanilla; Bedrock Wiki calls it deprecated since 1.16.0 | absent | Do not add |
| `is3D` | Directional/spatial by default; ignored for music/UI according to community docs | absent, therefore default | Explicit `true` for physical cues if schema accepts |
| `type` | Not in local 26.40 Creator schema and not found in installed vanilla definitions; often confused with Java's `sound`/`event` indirection | absent | **Unsupported for this target; do not use** |
| `subtitle` | Found in installed vanilla; community docs historically called it unused, but 26.20 introduced stable closed captions ([26.20 notes](https://feedback.minecraft.net/hc/en-us/articles/45400537384333-Minecraft-Bedrock-Edition-26-20-Changelog)) | absent | Add localization keys only after 26.40 custom-caption QA; schema omission is a tooling risk |
| `__use_legacy_max_distance` | Current Learn sample uses string `"true"` | absent | Prefer explicit distances; do not perpetuate legacy ambiguity |

The exact attenuation curve is not specified in the official schema. Bedrock community sources describe linear falloff over the rolloff distance and a 16-block minimum send radius, but the report treats this as community behavior, not a formal contract ([Bedrock Wiki Sounds](https://wiki.bedrock.dev/concepts/sounds); [Bedrock Wiki Playsound](https://wiki.bedrock.dev/commands/playsound)). Explicit distance tests at 0/1/4/8/12/16/17 blocks remain mandatory.

### `sounds.json`

The installed vanilla `sounds.json` contains four top-level mapping systems also represented by Creator Tools: `block_sounds`, `individual_event_sounds`, `interactive_sounds`, and `entity_sounds`. It supports event `sound`, scalar or `[min,max]` `pitch`/`volume`, plus context-specific mappings. Microsoft demonstrates a pitch range under `individual_event_sounds.events` ([Creating and Adding Custom Sounds](https://learn.microsoft.com/en-us/minecraft/creator/documents/addcustomsounds?view=minecraft-bedrock-stable)).

Aspergillum does not currently own `sounds.json`; its custom events are invoked directly by animation aliases. It should not add a broad `sounds.json` merely to randomize direct script calls if authored sample variants already provide variation. It should own one only for:

- automatic block interaction sounds that truly belong to the aspersorium's block group;
- explicit `[min,max]` event randomization that cannot be expressed safely in the validated definition schema;
- captions/interactive mappings verified against 26.40.

The add-on should not override vanilla block groups globally. Namespaced direct events plus explicit script pitch selection are easier to audit and avoid pack-stack collisions.

## 9. Repetition, fatigue, masking, and quantitative semantics

### Exact maximum-density use cycle

The capacities are 4 charges per aspergillum and 16 water units per basin/bucket (`src/domain/aspergillum.ts:3`; `src/domain/aspersorium-water.ts:1-2`). One full basin supports four loads of four and sixteen sprinklings. Current cue count is:

- one fill cue;
- four loads × (prepare + commit) = 8;
- sixteen sprinklings × (prepare + release) = 32;
- total = **41 sound events**.

Minimum action timeline is also reproducible. A load session lasts 16 ticks/0.8 s and commits at tick 10 (`src/infrastructure/loading-session.ts:39-69`; `src/application/aspersorium.ts:148-160`). Four sprinklings within a batch start 0.9 s apart; after the fourth, its 0.9 s action lease must finish before the next load. A batch therefore advances 4.4 s from load start to permission for the next load. The fourth batch's last sprinkle starts at 16.7 s and completes at **17.6 s**. Hence the 41-event figure in about 17.6 seconds is correct.

Current fatigue risks:

- release uses exactly one splash sample at fixed pitch/volume (`packs/resource/sounds/sound_definitions.json:19-27`), heard sixteen times;
- prepare selects only two high-pitched chain samples, no explicit weights, so each occurs about eight times;
- all six script cues have fixed pitch/volume (`src/presentation/sound-coordinator.ts:3-10`);
- prepare at 0.08 and release at 0.25 are only 170 ms apart (`packs/resource/animations/aspergillum.action.animation.json:40-48,86-94`), so a long bright chain transient can mask the splash onset;
- load prepare, dock, and undock reuse `armor.equip_chain` at three pitches, making distinct semantics share one timbral identity.

Recommended authored variation:

| Family | Variant count | Selection | Pitch envelope | Gain envelope | Mix purpose |
|---|---:|---|---:|---:|---|
| sprinkle prepare | 4 | equal weights, anti-repeat in future only if stable state is available | 0.97-1.04 around authored base | -1.5 to 0 dB / approx 0.84-1.0 multiplier | short metal/wood handling, <120 ms tail |
| sprinkle release | 6 | equal or weights 2,2,2,1,1,1 for core/rare alternates | 0.94-1.06 | -2 to 0 dB | watery transient with spectral gap around prepare |
| load prepare | 3 | equal | 0.97-1.03 | -1 dB | ceramic/metal dip, distinct from dock |
| load commit by amount | 4 base magnitude layers or variants | deterministic by transfer 1-4 | pitch ladder 0.94/1.00/1.06/1.12 | +0/+1/+2/+3 dB or extra slosh layer | communicates exact amount |
| dock/undock | 3 each | equal within separate families | dock 0.96-1.02; undock 1.02-1.08 | <=0 dB | directional semantic pair |
| fill | 4 | equal | 0.97-1.03 | -1 to 0 dB | full vessel, longer but <700 ms |
| dry | 3 | equal | 0.96-1.04 | -2 to 0 dB | quiet private rejection |

Pitch randomization should be authored through stable per-call selection or verified `sounds.json` ranges, not beta sound handles. Avoid more than about ±6% on water because pitch also changes duration and can make the release feel toy-like. Prepare should end or decay materially before 0.25 so the splash owns the release transient.

### Magnitude encoding

Current audio is categorical only. Domain results already expose exact quantities: loading returns `transferred` and `nextWater` (`src/domain/aspergillum.ts:28-31,81-112`); docking resolution moves `charges` into water (`src/domain/docking.ts:1-31`); fill always reaches 16 (`src/application/aspersorium.ts:82-94`). The architecture can encode magnitude without weakening transactions:

- **Load 1-4:** after `commitMainhandAndBlock` succeeds, select `aspergillum.load.commit.1` through `.4`, or use one base event with stable script pitch ladder `[0.94,1.00,1.06,1.12]` and a second slosh layer only for 3-4. The call remains after commit.
- **Dock returns 0-4:** play a mechanical dock for every success plus optional water-return plinks equal to charges, compressed into a single magnitude-specific event to avoid event spam. Pass `itemState.charges`/`resolution.nextWater` already available at `src/application/aspersorium.ts:183-210`.
- **Fill:** a single “full basin” event is semantically correct because transfer is always to capacity, but its timbre should be larger than partial load.
- **Undock:** snapshot restoration resets the carried aspergillum to zero under current docking design (`src/infrastructure/item-state.ts:172-187`); no magnitude layer is needed unless future rules preserve charges.

Do not schedule one plink per unit with `runTimeout`; that creates cancellation/latency complexity. Use one deterministic event ID per magnitude after the transaction's success boundary.

## 10. Multiplayer and spatial audit

All six script cues are private because `Player.playSound` is explicitly “only this particular player” (`node_modules/@minecraft/server/index.d.ts:16687-16729`). The absence of location means the sound plays near that player (`:24658-24668`). Consequently remote players cannot hear fill, dock, undock, load, or dry regardless of distance.

Attachable effects are evaluated by each client's resource animation system. A remote observer can hear them only if that observer's client (a) has the resource pack, (b) instantiates and evaluates the actor's attachable/controller, (c) receives cooldown state within the gate, (d) resolves locator/event/media, and (e) is within attenuation. This is not server-authoritative broadcast. H3/H4 can affect each observer differently, so one player may hear release while another does not. The nominal best-supported radius is 16 blocks because definitions have no explicit distances and values are below 1 (`packs/resource/sounds/sound_definitions.json:3-27`), but exact remote behavior requires measurement.

The target should use world audio only after committed public state changes: fill, dock, undock, load commit, and sprinkle release. Actor-only intent/rejection cues—load prepare, sprinkle prepare, dry—should remain private. This yields deterministic audience semantics and prevents one client's attachable lifecycle from deciding what every other player hears.

## 11. File-level audit: guarantees and omissions

This table covers every requested file/family. “No audio” means the file has no emission responsibility but can authorize, suppress, or time a cue.

| File | Relevant lines / role | What it guarantees | What it does not guarantee |
|---|---|---|---|
| `src/presentation/sound-coordinator.ts` | catalogue `:3-10`; typed dispatch/catch `:12-22` | Six script cues use bounded fixed mix and all exceptions are fail-soft | No custom sprinkle cues, audience/location semantics, transaction metadata, variants, correlation IDs, or testable adapter |
| `src/presentation/animation-coordinator.ts` | loading and recovery `playAnimation` `:3-24` | Dedicated controller names and small blends; failure is contained | No synchronization with attachable state or proof bridge succeeds |
| `src/presentation/messaging.ts` | catalogue `:3-29`; fail-soft HUD `:33-42` | User-visible cancellation/success feedback cannot mutate gameplay | No audio fallback or accessibility correlation |
| `src/presentation/wet-feedback.ts` | load splash offsets and caught particles `:1-31` | Loading VFX is post-commit/fail-soft | No audio coupling; not the sprinkle bridge diagnostic |
| `src/application/sprinkle.ts` | input case `:173-218`; late commit `:109-145`; schedule `:147-161`; emitter `:54-99` | Lease, identity, late validation, finite state write before 36 droplets, six pulses, lifecycle-cancellable runs | No valid-sprinkle sound; unconditional entry/release writes; caught cooldown failure still commits; client timeline can diverge |
| `src/application/aspersorium.ts` | fill `:82-94`; load `:96-173`; dock `:175-225`; undock `:227-256`; routing/dedupe `:282-342` | Commit cues occur after successful state changes; prepare occurs after reservation; duplicate callbacks are claimed | Fill is not rollback-wrapped; six cues are private/non-positional; no magnitude audio |
| `src/infrastructure/item-state.ts` | clone/write `:74-85`; initialization predicate `:88-102`; equip `:112-118`; docking restore `:148-187` | finite normalized persistent state, stable `instance_id`, lore, migration | `initializeAspergillum` is not identity-idempotent; no attachable-preserving mutation API |
| `src/infrastructure/sprinkle-session.ts` | session/phase `:5-40`; run tracking/release/cancel `:43-75` | one current session, one release phase, scheduled callbacks cleared, lease released | No client cue cancellation/latch or audio event journal |
| `src/infrastructure/action-lease.ts` | acquire/release `:17-43` | one action kind per player | No relationship to client controller state |
| `src/infrastructure/loading-session.ts` | block/player locks and tick 10/16 callbacks `:23-69` | exclusive player and basin, late commit, deterministic tick offsets, cleanup | Wall-clock/sample timing; prepare retraction |
| `src/infrastructure/minecraft-transaction.ts` | item then block, defensive rollback `:7-24` | load commit returns false on caught write failure | Cannot prove rollback writes themselves succeed; no audio transaction interface |
| `src/infrastructure/aspersorium-water-state.ts` | decode/encode water block states `:1-47` | water remains 0-16 across split published states | No audio; no magnitude mapping |
| `src/infrastructure/game-mode-policy.ts` | Creative retain, Spectator deny `:11-24` | no sentinel charge; contextual policy | Client timeline receives no policy cancellation signal |
| `src/infrastructure/block-state.ts`, `constants.ts`, `docked-item-registry.ts` | state adapters/IDs/registry | published identifiers and persistent snapshots remain centralized | No sound-group validation or audio ownership |
| `src/domain/aspergillum.ts` | capacity/cooldown `:3-4`; load result `:28-31,81-112`; sprinkle resolution `:114-130` | pure finite charge/water math and quantities for audio selection | No cue semantics; application currently discards transferred amount for sound |
| `src/domain/aspersorium-water.ts` | capacity/normalization `:1-6` | exact 16-unit bounds | No audio |
| `src/domain/spray-profile.ts` | standard profile `:24-45` | 36/6, release tick 5, duration 18, steering .8/30° | Client effect timing not derived or tested against it |
| `src/domain/cone.ts` | basis/steering/origin/directions `:1-192` | deterministic ballistic geometry independent of audio | Does not locate an audio source in world coordinates for script |
| `src/domain/docking.ts`, `rotation.ts` | quantitative dock transfer / visual rotation | provides dock magnitude and stable block orientation | Audio does not consume dock magnitude |
| `src/bootstrap/main.ts` | components `:51-74,143-150`; swing `:152-156`; cancellation `:171-223`; inventory initialization `:86-131` | single swing entry, event routing, lifecycle cancellation, guarded background initialization | Same-ID stack replacements do not cancel client effects; `onUse` also unconditionally re-equips at `:57-58`; no audio event tracing |
| `packs/resource/sounds/sound_definitions.json` | complete file `:1-28` | two resolvable custom IDs with conservative values on installed Windows 26.40 | Legacy format, owned media absent, one release variant, no distances/weights/captions/ranges |
| `packs/resource/attachables/aspergillum.attachable.json` | aliases `:18-31`; animate `:32-41` | exact particle/sound/controller shortname mapping | No offscreen update flag; no persistent action latch |
| `packs/resource/animations/aspergillum.action.animation.json` | player bridges `:4-29`; FP effects `:31-75`; TP effects `:77-131` | exact .08/.25 effects, .82 duration, paired release particle/sound | Effect delivery, perspective switching, attachable survival, server success |
| `packs/resource/animation_controllers/aspergillum.animation_controllers.json` | complete state machine `:1-45` | dry swings do not enter absent cooldown; current-state completion and recovery | 0.18 s gate is not durable; no cancellation, sequence number, or reset recovery |
| `packs/resource/animations/aspergillum.hold.animation.json` | loops `:4-20` | approved FP/TP presentation always applies | Not part of current-state completion; no cue role |
| `packs/resource/render_controllers/aspergillum.render_controllers.json` | material/texture/geometry selection `:1-17` | stable render binding | No effect/update policy |
| `packs/resource/models/entity/aspergillum.geo.json` | bound root `:14-18`; action/head/aim/locator hierarchy `:42-58` | exact binding and physical locator contract | Locator runtime support for attachable sound |
| `packs/resource/models/blocks/*.json` | base and rotated aspersorium geometry/bone names | visible water/docked variants | No sound groups; geometry cannot cause per-permutation audio fallback directly |
| `packs/resource/blocks.json` | mapping `:1-6` | sole identifier maps to `metal` | Cannot attribute engine's historic `normal` warning |
| `packs/behavior/items/aspergillum.item.json` | item/cooldown/swing `:1-36` | cooldown and swing both 0.9, attack-trigger type, max stack 1 | Client replication timing and attachable preservation |
| `packs/behavior/blocks/aspersorium.block.json` | identifier/states `:3-50`; dock/rotation permutations `:50-328`; base components `:329-384` | all visual permutations retain one public ID | Does not locally declare a sound; relies on RP mapping |
| both manifests | BP `:1-39`; RP `:1-24` | format 2, version 1.0.32, min engine 1.26.40, stable server 2.9.0, fixed UUID dependency | No platform/audio feature declaration; no experiments (correctly) |
| `tests/domain/**` | domain state/cone/docking/rotation tests | pure gameplay quantities and geometry stay correct | No cue mapping or client timeline |
| `tests/infrastructure/**` | action lease/water state tests | concurrency and state encoding | No ItemStack/equipment identity behavior |
| `tests/presentation/release-ux.test.ts` | mix bounds only `:81-88` | IDs nonempty, pitch (0,2], volume (0,1] for six script cues | Does not inspect custom definitions, counts, order, audience, transaction alignment, reset, FPS, or schema |
| `tools/validate-vfx.mjs` | locator/aliases/keyframes `:69-108`; definitions and no script duplication `:154-167` | exact current hybrid contract and 4/36 split | Checks presence, not behavioral state machine; actively prevents script release fallback |
| `tools/validate-animation-choreography.mjs` | controller/item checks around `:350-462` | lengths, query strings, cooldown/swing consistency | No frame simulation, reset, or effect count |
| `tools/validate-release-readiness.mjs` | direct-call ban `:90-100` and version/localization checks | all script audio passes coordinator; release metadata consistent | Does not enforce authoritative cue timing or event existence |
| `tools/validate.mjs` | locator/sound mapping/compiled safeguards `:197-292,442-477,529` | structural pack invariants | No runtime attachable/audio evidence |
| `tools/generate-assets.mjs` | generated PNGs, e.g. `:1-69` onward | reproducible visual assets | Generates no audio and validates no media |
| `tools/package.mjs` | deterministic pack collection/hash `:16-53` | sound JSON and future media under RP are packaged deterministically | Does not decode/play or cross-platform validate sounds |
| `package.json` | scripts `:13-28`; versions `:30-38` | `check` chains types/tests/docs/build; `package` validates final mcaddon | Current checks contain no audio behavior/schema simulator |
| `docs/PROJECT_STATUS.md`, `ROADMAP.md` | status gates `PROJECT_STATUS:23-52`; phase evidence `ROADMAP:129-148` | truthfully keeps in-game audio/locator as manual gates | No root-cause model or audio contract before this report |
| `docs/ARCHITECTURE.md`, `STATE_AND_CONCURRENCY.md` | fail-soft presentation `ARCHITECTURE:99-107`; transactions/sessions throughout state doc | correct authority, identity, late validation, rollback contracts | Current sprinkle audio violates semantic alignment despite not mutating state |
| `docs/VISUAL_CONTRACT.md`, `ANIMATION_DESIGN_CONTRACT.md`, `VFX_DESIGN_CONTRACT.md` | hierarchy `VISUAL:7-18,95-114`; timing `ANIMATION:54-70,101-105`; audio/VFX split `VFX:19-43,64-89` | precise visual/binding/timing invariants | JSON inspection cannot prove runtime delivery; current contract hard-codes vulnerable client audio |
| `docs/TESTING.md` | Content Log/audio/perspective/multiplayer checks `:193,229-248,315-327` | acknowledges manual validation | No repeated-run statistics, paired-particle diagnosis, latency/FPS matrix |
| `docs/ATTACHABLE_RESEARCH.md`, `REFERENCES.md`, `LOCAL_INSTALLATION_MAP.md` | hybrid history `ATTACHABLE:1-108`; links `REFERENCES:16-31`; installed map `LOCAL:6-43,113-146` | traceable design history and exact install paths | Prior evidence did not test same-stack replacement timing |
| `CHANGELOG.md` and release docs | release history/operational instructions | distributed changes are recorded | Must be updated with any implemented hotfix; this research report alone changes no pack |

## 12. Test-coverage gap and implementable suite

### Why current tests could not catch the bug

The only sound unit assertion iterates six script cues and checks nonempty IDs plus numeric bounds (`tests/presentation/release-ux.test.ts:81-88`). Structural validators assert that both attachable aliases/keyframes exist and that script does **not** duplicate release (`tools/validate-vfx.mjs:81-108,154-167`). They therefore encode the vulnerable architecture as success. No test executes the controller, advances a frame clock, models a stack reset, or correlates server commit with cue counts.

### Proposed Vitest modules

1. **`tests/presentation/animation-controller-simulator.test.ts`.** Parse the real controller/animation/attachable JSON. Implement only the Molang subset actually used: `&&`, comparisons, `q.is_cooldown_category`, `q.cooldown_time_remaining`, `q.all_animations_finished`, and `context.is_first_person`. Model one transition per render frame, animation-local clocks, keyframe crossing, initial-state reset, perspective condition, and offscreen suspension. Inputs: server tick clock, render frame times, cooldown-replication function, attachable reset events, perspective events. Output: ordered `{time,effect,perspective,locator}` events and states.

2. **Required scenario assertions.** Nominal action: one prepare, one release, one bridge. Reset at .19: zero future attachable effects after reset. Reset at .25-before-effects: prepare one, release/bridge zero. Ten-second second action: recovery is idle before action and does not cause failure. Tick-5 cancel: prepare may be one, server commit zero, exposing divergence. 200 ms server-relative latency: zero attachable effects. 15 FPS: release crossing at .2667 or .3333. Perspective diagnostics should allow current behavior to be declared only after a measured clock policy is selected.

3. **`tests/application/sprinkle-audio-contract.test.ts`.** Extract a pure orchestration function or inject `ItemPort`, `AudioPort`, `CooldownPort`, and scheduler fakes. Assert prepare only after lease acquisition, release only after successful state write/phase transition, exactly one release per session, zero release on every late-validation branch, and audio exceptions never change commit result.

4. **Item-write hazard assertion.** A literal “no ItemStack write anywhere inside the 0.82 s animation” conflicts with the required tick-5 authoritative charge commit: stable Script API persistence requires replacing the equipped stack. The enforceable invariant should be: **no gratuitous write between input and release; if any attachable timeline owns transaction-significant effects, no held-stack write may occur before its last keyframe.** Because the second half is impossible with the current tick-5 commit, the target test should require `sound_effects` to be absent from the attachable whenever a write occurs in that window. A spy should assert zero entry write for an initialized item and exactly one release write after successful validation.

5. **`tests/resource/sound-schema.test.ts`.** Load Creator Tools 0.17.7's 26.40/latest schema and validate `sound_definitions.json`; layer explicit assertions for installed-vanilla fields that the schema omits (`subtitle`, deprecated `load_on_low_memory`). Reject beta format/payload, `type`, ranges in definition sample pitch/volume, invalid category, noninteger/negative weight, absent/invalid distances, and missing owned files. Pin the schema snapshot/hash used by CI so an npm update cannot silently change rules.

6. **`tests/resource/audio-cross-reference.test.ts`.** Traverse every animation `sound_effects` entry; assert effect shortname exists in the owning attachable, mapped event exists in `sound_definitions`, every sample path resolves to an owned `.ogg` or configured vanilla root, no orphan aliases/events, and FP/TP event sets match unless explicitly waived. Also cross-reference subtitle keys in every locale.

7. **`tests/resource/installed-vanilla-audio.test.ts`.** On Windows, discover the AppX package version, require exactly target 1.26.4005.0 (or accept an explicit `MINECRAFT_VANILLA_RP` path), parse vanilla definitions, and check all borrowed event IDs and `.fsb` paths. Skip with a loud reason on CI hosts without AppX; never silently pass. Emit a JSON evidence report with AppX version and file hashes.

8. **`tests/presentation/audio-mix.test.ts`.** Validate all final namespaced cues, variant counts, weight sums/distribution, event-specific distance/category/audience policy, pitch/gain envelopes, and the 41-event stress cycle. Ensure no family has fewer variants than its contract.

9. **Static architecture check.** Replace the crude `.playSound(` text ban with an import boundary: application code may depend on `AudioPort`; only the Minecraft adapter imports/uses `Player`/`Dimension.playSound`. Fail if animation JSON contains transaction-significant audio aliases.

### In-game coverage automation cannot replace

Automation cannot establish attachable rebuild semantics, client cooldown replication, locator fallback, offscreen first-person behavior, conditional animation clocks, platform codecs, listener attenuation, category sliders, or voice stealing. The QA matrix in section 17 covers these across perspective, FPS, latency, local/remote observer, distance, and platform.

## 13. Defect and risk register

| ID | Severity | Defect / impact | Reproduction |
|---|---|---|---|
| AUD-001 | **High** | Unconditional initialized-stack clone/equip on every swing can rebuild the attachable before/after cooldown (`item-state.ts:74-102`; `sprinkle.ts:182-183`) | Repeated valid swings; instrument attachable setup; compare guarded build |
| AUD-002 | **High** | Required release clone/equip occurs at exact client release keyframe (`sprinkle.ts:131-140`; action animation `:33-48`) | 15/30 FPS repeated actions; observe sound and four bridge drops |
| AUD-003 | **High** | 180 ms one-way cooldown gate has no durable latch (`controller:8-14`) | Inject >=200 ms delay under server-relative replication; expect zero timeline cues |
| AUD-004 | **High** | Server commit and valid-sprinkle audio have independent authority (`sprinkle.ts:109-145,173-218`) | Fail tick-5 validation after prepare; or reset attachable while server commits |
| AUD-005 | **High** | Cooldown-start exception is logged but action still commits, guaranteeing no cooldown-gated timeline (`sprinkle.ts:210-217`) | Fault-inject cooldown component exception; verify server release/no timeline |
| AUD-006 | **High** | Tests validate presence of vulnerable timeline instead of behavior (`validate-vfx.mjs:81-108,154-167`) | Delete/reorder runtime semantics without changing JSON presence; checks still pass |
| AUD-007 | **Medium** | No offscreen effect flag; remote/third-person cues may be culled (`attachable:32-41`) | Aim camera away/switch F5; compare flagged diagnostic |
| AUD-008 | **Medium** | Historical attachable locator defect has no 26.40 resolution evidence | Valid/nonexistent/no-locator A/B test |
| AUD-009 | **Medium** | Custom events borrow raw vanilla files, creating unversioned platform coupling (`sound_definitions:3-27`) | Remove/rename path in diagnostic pack; compare platforms/Content Log |
| AUD-010 | **Medium** | Release has one fixed sample and all cues lack controlled variation; fatigue over 41 events/17.6 s | Execute full bucket cycle and blind-rate repetition |
| AUD-011 | **Medium** | Five physical world actions are private, causing multiplayer semantic asymmetry (`sound-coordinator:14-18`) | Observer at 2 blocks hears none of fill/load commit/dock/undock |
| AUD-012 | **Medium** | Load/dock quantity is not encoded despite domain exposing 1-4 | Load/dock different amounts; audio remains identical |
| AUD-013 | **Medium** | Fill writes block then inventory without defensive rollback (`aspersorium.ts:82-94`) | Fault-inject hand replacement after block write; basin fills silently/partial state |
| AUD-014 | **Medium** | Audio catch logs warnings but has no structured correlation/action ID (`sound-coordinator:17-21`) | Induce missing event; logs cannot correlate to session/frame |
| AUD-015 | **Low** | Definition format remains 1.14.0 while installed/current guidance uses 1.20.20 | Schema comparison/package validation |
| AUD-016 | **Low** | `subtitle`/closed-caption contract absent; accessibility feedback not authored | Enable captions and perform all cues |
| AUD-017 | **Low** | Historic `normal` warning unresolved, though current custom mapping is complete | Isolated world action fingerprint described in H10 |
| AUD-018 | **Low** | `onUse` inspection also clones/re-equips a current item (`bootstrap/main.ts:51-63`), potentially resetting cosmetic state | Inspect during/near animations; instrument setup counter |

No defect is classified Critical because no evidence shows world corruption, charge duplication, crash, or irreversible loss from the audio bug. The High defects materially break the core action's feedback and can misrepresent server outcome.

## 14. Ranked remediation plan

### Phase 0 — diagnostic release before claiming visual closure

Ship an isolated diagnostic package, not a speculative production compensation. Add an optional correlation log at swing, cooldown start/result, tick-5 validation result, and release commit. Give FP/TP prepare/release temporary distinct sounds/particles. Add an attachable `initialize` counter particle only if supported without experiments. Run the section 17 matrix. This changes no world schema or identifiers and uses no Beta API.

### Phase 1 — minimal safe SFX hotfix

Goals: stop gratuitous entry replacement; make valid-sprinkle sounds deterministic relative to the server session/commit; preserve gameplay, cooldown, animation, binding, geometry, particle fan, UUIDs, and persistent state.

Conceptual TypeScript diff:

```diff
 // src/application/sprinkle.ts
 import {
   initializeAspergillum,
+  needsAspergillumInitialization,
   ...
 } from "../infrastructure/item-state";

-const item = initializeAspergillum(rawItem);
-setMainhand(player, item);
+const item = needsAspergillumInitialization(rawItem)
+  ? initializeAspergillum(rawItem)
+  : rawItem;
+if (item !== rawItem) setMainhand(player, item);

 const started = startSprinkleSession(...);
 if (started.status === "busy") return;
 ...
 try {
   item.getComponent(ItemComponentTypes.Cooldown)?.startCooldown(player);
 } catch (error) {
   console.warn(...);
 }
+playSoundCue(player, "sprinklePrepare");
 scheduleSprinkle(...);

 // commitSprinkleRelease, after state write and successful phase mark
 setMainhand(player, writeAspergillumState(currentItem, resolution.state));
 if (!markSprinkleReleased(session)) return;
+playSoundCue(player, "sprinkleRelease");
 action(...);
 emitWaterFrame(...);
```

```diff
 // src/presentation/sound-coordinator.ts
 export const SOUND_CUES = {
   ...
+  sprinklePrepare: { id: "aspergillum.sprinkle.prepare", pitch: 1, volume: 1 },
+  sprinkleRelease: { id: "aspergillum.sprinkle.release", pitch: 1, volume: 1 },
 } as const;
```

```diff
 // packs/resource/animations/aspergillum.action.animation.json
-"sound_effects": {
-  "0.08": { "effect": "sprinkle_prepare", "locator": "aspergillum_tip" },
-  "0.25": { "effect": "sprinkle_release", "locator": "aspergillum_tip" }
-},
```

Remove the corresponding sound-keyframe assertions from `validate-vfx.mjs`; replace them with assertions that action animations contain no `sound_effects` and that the application emits prepare/release at reservation/commit boundaries. The attachable alias map may be removed or retained temporarily unused; removing it is cleaner. Keep the particle keyframe for the diagnostic bridge until the medium-term VFX change.

This hotfix deliberately keeps both sounds private to match existing audience and minimize behavioral change. It uses stable `Player.playSound`, requires **no Beta API**, changes no persistent format/public block or item ID/UUID, and therefore does **not break worlds**. Tests: injected orchestration tests, controller simulator showing audio counts independent of resets, `npm run check`, package/hash validation, then 100-action in-game matrix. Expected Content Log: no missing sound/particle/schema warning and no `[Aspergillum] Unable to start native cooldown` during reproductions.

One nuance: moving prepare to script makes it an accepted-intent cue even when tick-5 validation later cancels, which matches the existing semantics. Release becomes strictly success-only. If product design requires prepare to mean eventual success, omit it or replace it with a very quiet mechanical intent cue; future success cannot be known at t=0 without reserving persistent state.

### Phase 2 — correct medium-term audio redesign

Introduce a narrow application port and keep Minecraft APIs in an adapter:

```ts
export type AudioCue =
  | { kind: "dry" }
  | { kind: "load.prepare" }
  | { kind: "load.commit"; amount: 1 | 2 | 3 | 4; location: Vector3 }
  | { kind: "aspersorium.fill"; location: Vector3 }
  | { kind: "dock.commit"; amount: 0 | 1 | 2 | 3 | 4; location: Vector3 }
  | { kind: "undock.commit"; location: Vector3 }
  | { kind: "sprinkle.prepare" }
  | { kind: "sprinkle.release"; location: Vector3 };

export interface AudioPort {
  emit(player: PlayerRef, cue: AudioCue): void;
}
```

The real adapter maps private cues to `Player.playSound` and public cues to `Dimension.playSound`. Application use cases emit only after the semantic boundary documented in section 5. The adapter owns try/catch, namespaced registry, mix, location, and structured warnings including player/session/cue. Tests use a recording fake. Domain remains free of Minecraft API; the application depends on an interface; presentation/infrastructure performs playback, consistent with `docs/ARCHITECTURE.md:74-107`.

Move the four bridge droplets to the authorized release path or remove them if the 36-droplet fan already communicates origin. The safe approach is a script-side one-shot particle at a computed world origin after commit; never move or translate the bound bone. This eliminates tick-5 attachable-lifetime dependence while preserving the world-space particle contract (`docs/VFX_DESIGN_CONTRACT.md:19-34,64-89`).

Make physical state changes world-audible at explicit positions/radii. Add deterministic magnitude-specific load/dock IDs. Preserve the original two custom event IDs as aliases for one release cycle if external packs might call them. No Beta API is required. Adding namespaced sound events and owned media is not world-persistent and does not break saved worlds; changing existing UUIDs/identifiers/states is unnecessary. Increment pack/package versions and update `CHANGELOG.md`, architecture/audio contract, tests, and manual QA in the same distributable commit.

Representative stable adapter and definition diffs:

```ts
function playWorldCue(
  player: Player,
  id: string,
  location: Vector3,
  options: WorldSoundOptions,
): void {
  try {
    player.dimension.playSound(id, location, options);
  } catch (error) {
    console.warn(`[Aspergillum][audio] ${id} player=${player.id}: ${String(error)}`);
  }
}

// Called only after writeAspergillumState/setMainhand and markSprinkleReleased.
playWorldCue(player, "aspergillum.sprinkle.release", releaseOrigin, {
  pitch: selectStableVariantPitch(session),
  volume: 1,
});
```

```diff
 // packs/resource/sounds/sound_definitions.json
-"format_version": "1.14.0",
+"format_version": "1.20.20",
 "sound_definitions": {
   "aspergillum.sprinkle.release": {
     "category": "player",
+    "min_distance": 1.0,
+    "max_distance": 16.0,
     "sounds": [
-      { "name": "sounds/random/splash", "volume": 0.54, "pitch": 1.34 }
+      { "name": "sounds/aspergillum/sprinkle/release_01", "volume": 0.54, "pitch": 1.00, "weight": 1 },
+      { "name": "sounds/aspergillum/sprinkle/release_02", "volume": 0.53, "pitch": 1.02, "weight": 1 },
+      { "name": "sounds/aspergillum/sprinkle/release_03", "volume": 0.55, "pitch": 0.98, "weight": 1 },
+      { "name": "sounds/aspergillum/sprinkle/release_04", "volume": 0.52, "pitch": 1.04, "weight": 1 },
+      { "name": "sounds/aspergillum/sprinkle/release_05", "volume": 0.54, "pitch": 0.96, "weight": 1 },
+      { "name": "sounds/aspergillum/sprinkle/release_06", "volume": 0.53, "pitch": 1.01, "weight": 1 }
     ]
   }
 }
```

The adapter's pitch selector must be deterministic/testable or omitted because the sound definition already randomizes samples. It must not use advanced sound handles.

### Phase 3 — production authored library and tooling

Own every sample under `packs/resource/sounds/aspergillum/...`; store lossless production masters and licensing/normalization metadata under `assets-src/audio/`. Export Bedrock-compatible `.ogg` files reproducibly. Do not depend on vanilla raw paths. Define explicit distance/category/variant/weight values, caption keys after verification, and a loudness target per family. Add waveform peak, duration, channel-count, sample-rate, codec, clipping, and integrated loudness checks to build tooling. Produce a contact sheet equivalent for audio: JSON inventory with SHA-256, duration, peak, LUFS, and event references.

Use stable one-shot APIs only. Do not adopt `loopCount`, `SoundDefinition`, advanced `SoundInstance`, or beta `server_sound_definitions`. This phase does not break worlds; event aliases can retain backward compatibility. Release gates include Windows plus at least one mobile/console codec test and multiplayer listener validation.

| Proposal | Beta/experiments | Saved-world compatibility | Required proof |
|---|---|---|---|
| Diagnostic release | None | No persistent/public ID change | A/B failure statistics, paired-particle correlation, clean Content Log |
| Minimal hotfix | None; stable `Player.playSound` only | Compatible; same items/blocks/state/UUIDs | Unit counts, `npm run check`, packaged 100-action matrix |
| Medium redesign | None; stable `Player`/`Dimension.playSound` | Compatible; new RP events/media are not saved state | Transaction fake tests, distance/multiplayer/category QA |
| Authored end state | None | Compatible with legacy event aliases | Media validation, cross-platform codecs/captions, fatigue review |

### Changes explicitly not recommended

- Do not widen the cooldown threshold and call the bug fixed. A larger window reduces H2 but cannot survive tick-5 attachable replacement and increases false entries after resets.
- Do not add duplicate script fallback while keeping timeline audio; it will double-play on successful frames.
- Do not delay charge consumption to tick 18 merely to protect the attachable; that weakens authoritative gameplay and creates cancellation/exploit cases.
- Do not encode Creative infinity as item state; retain contextual policy (`src/infrastructure/game-mode-policy.ts:11-24`).
- Do not require experimental toggles, Beta APIs, preview sound payloads, or Creator Features.
- Do not change binding, geometry version, root bones, UUIDs, namespace, item/block IDs, or published block states.

## 15. Proposed final audio contract

All events are one-shot, namespaced, and backed by owned media. “Range” is explicit `max_distance`; `min_distance` should be 1.0 unless live attenuation testing selects another value. Pitch/gain envelopes are design targets implemented through authored variant scalars or stable per-call options, not unsupported ranges inside `sound_definitions.json`.

| Event family | Category | Range | Variants / weights | Pitch / gain envelope | Authority and audience | Intent |
|---|---|---:|---|---|---|---|
| `aspergillum.aspersorium.fill` | `block` | 12 | 4, equal | 0.97-1.03; -1..0 dB | After fill state+bucket commit; world at basin | Basin reaches full capacity |
| `aspergillum.load.prepare` | `player` | private | 3, equal | 0.97-1.03; quiet | After session/lock acquired; actor only | Tool contacts vessel; accepted intent, not success |
| `aspergillum.load.commit.1` | `block` | 10 | 3, equal | base 0.94; restrained | After item+block transaction; world at basin | One unit transferred |
| `aspergillum.load.commit.2` | `block` | 10 | 3, equal | base 1.00; +1 dB | Same | Two units |
| `aspergillum.load.commit.3` | `block` | 11 | 3, equal | base 1.06; +2 dB/layer | Same | Three units |
| `aspergillum.load.commit.4` | `block` | 12 | 4, equal | base 1.12; +3 dB/full slosh | Same | Tool reaches full charge |
| `aspergillum.dock.commit.0` | `block` | 10 | 3 mechanical, equal | 0.96-1.02 | After complete dock transaction; world | Empty tool seated |
| `aspergillum.dock.commit.1..4` | `block` | 10-12 | 3 per magnitude or mechanical+single precomposed water layer | ascending 0.98-1.10 | Same | Tool seated and 1-4 units returned |
| `aspergillum.undock.commit` | `block` | 10 | 3, equal | 1.02-1.08 | After complete undock; world | Tool removed |
| `aspergillum.sprinkle.prepare` | `player` | private | 4, equal | 0.97-1.04; short/quiet | After sprinkle session acquired; actor only | Grip/head preparation |
| `aspergillum.sprinkle.release` | `player` | 16 | 6, weights 1 each | 0.94-1.06; -2..0 dB | After tick-5 charge commit; world at release origin | Authorized holy-water release |
| `aspergillum.dry` | `player` or `ui` after slider QA | private | 3, equal | 0.96-1.04; quiet | Rejected empty attempt; actor only | Empty mechanical click, no cooldown |

Aliases `aspergillum.sprinkle.prepare` and `.release` already exist and can keep their IDs while media/ownership changes (`packs/resource/sounds/sound_definitions.json:3-27`). The other six vanilla IDs should be replaced by these namespaced families. Categories must be tested against 26.40 sliders: `player` is demonstrably routed through Player volume by current release notes; `block` mapping is conventional but still merits QA. `ui` ignores normal range per community documentation, so use it for dry only if that non-spatial behavior is desired.

Every event contract includes:

- semantic boundary (`intent`, `commit`, or `rejection`);
- audience (`actor` or `world`) and explicit origin;
- category and maximum distance;
- stable event ID, owned sample set, variant weights;
- magnitude where relevant;
- fail-soft behavior after state decision;
- no loop/handle dependency and no Beta API;
- a caption/localization key if custom captions validate on all target platforms.

## 16. External evidence and prior-art ledger

| Topic | Source | What it establishes / limitation |
|---|---|---|
| Attachables | [Microsoft: Using Attachables](https://learn.microsoft.com/en-us/minecraft/creator/documents/attachables?view=minecraft-bedrock-stable) | Equipped-item render model and standard animation structure; does not specify same-stack replacement lifetime |
| Attachable schema/offscreen | [Microsoft attachable reference](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/attachablereference/examples/attachabledefinitions/attachable?view=minecraft-bedrock-stable) | Lists offscreen bones/effects fields; conflicts with local Creator Tools omission |
| Controller state/frames/blending | [Microsoft Animation Controllers Reference](https://learn.microsoft.com/en-us/minecraft/creator/documents/animations/animationcontroller?view=minecraft-bedrock-stable) | One transition per frame, current state animations, lerped blend |
| Controller reload/initial state | [Microsoft Entity Modeling and Animation](https://learn.microsoft.com/en-us/minecraft/creator/documents/entitymodelingandanimation?view=minecraft-bedrock-stable) | Client entity load starts initial controller state |
| `all_animations_finished` | [Microsoft Molang query](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/molangreference/examples/molangconcepts/queryfunctions/query_all_animations_finished?view=minecraft-bedrock-stable) | Scope is animations in current controller state |
| Cooldown category | [Microsoft Molang category query](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/molangreference/examples/molangconcepts/queryfunctions/query_is_cooldown_category?view=minecraft-bedrock-stable) | Stable since 1.20.60, held/worn slot semantics |
| Cooldown remaining | [Microsoft Molang remaining query](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/molangreference/examples/molangconcepts/queryfunctions/query_cooldown_time_remaining?view=minecraft-bedrock-stable) | Returns seconds remaining; no replication/prediction guarantee |
| Item cooldown component | [Microsoft item cooldown](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/itemreference/examples/itemcomponents/minecraft_cooldown?view=minecraft-bedrock-stable) | Category/duration and attack type; no client timing guarantee |
| Script sound APIs | [Player](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/player?view=minecraft-bedrock-stable), [Dimension](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/dimension?view=minecraft-bedrock-stable) | Private vs all-player playback; rolling docs include newer/beta deltas |
| Advanced sound handle | [SoundInstance](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/soundinstance?view=minecraft-bedrock-stable) | Current page marks all properties/controls pre-release; conflicts with local stop-only declaration |
| Player options | [PlayerSoundOptions](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/playersoundoptions?view=minecraft-bedrock-stable) | Stable location/pitch/volume; loopCount explicitly pre-release |
| Scheduling | [System](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/system?view=minecraft-bedrock-stable) | Tick/generator semantics; no sample/frame deadline |
| Sound authoring | [Microsoft custom sounds](https://learn.microsoft.com/en-us/minecraft/creator/documents/addcustomsounds?view=minecraft-bedrock-stable) | 1.20.20 example, definitions plus `sounds.json` range example |
| Distance/category concepts | [Microsoft Introduction to Sound](https://learn.microsoft.com/en-us/minecraft/creator/documents/introductiontosound?view=minecraft-bedrock-stable) | attenuation fields, categories, default 16-block attempt; exact formula absent |
| Community sound schema | [Bedrock Wiki Sounds](https://wiki.bedrock.dev/concepts/sounds) | weights/is3D/stream/deprecated low-memory and community attenuation behavior |
| Community locator warning | [Bedrock Wiki Animation Effects](https://wiki.bedrock.dev/visuals/animation-effects) | Historical 1.21.1 broken-attachable-locator report only |
| Community controller reset | [Bedrock Wiki controller intro](https://wiki.bedrock.dev/animation-controllers/animation-controllers-intro) | Controllers reset on entity reload; not proof of same-stack replacement |
| 26.0 changes | [Official 26.0 changelog](https://feedback.minecraft.net/hc/en-us/articles/43274629736717-Minecraft-Bedrock-Edition-26-0-Changelog) | Attachable/render and Molang format fixes; no locator/audio reset fix |
| 26.20/captions | [Official 26.20 changelog](https://feedback.minecraft.net/hc/en-us/articles/45400537384333-Minecraft-Bedrock-Edition-26-20-Changelog) | Closed captions released and sound fixes; no attachable locator fix |
| 26.40 audio/API preview | [26.40.20](https://feedback.minecraft.net/hc/en-us/articles/46333309174669-Minecraft-Beta-Preview-26-40-20), [26.40.26](https://feedback.minecraft.net/hc/en-us/articles/46719091494797-Minecraft-Beta-Preview-26-40-26), [26.40.27](https://www.minecraft.net/article/minecraft-preview-26-40-27) | Beta server definitions/SoundDefinition must not be used; Player slider fix; no relevant attachable fix located |

The official Mojang bug tracker was searched for attachable `sound_effects`, locator, item-change reset, and offscreen-update reports. No accessible issue with evidence sufficient to determine 26.40 outcomes was found. The report therefore does not manufacture a bug ID or silently treat the 1.21.1 community statement as current. This is an explicit negative research result.

## 17. Open questions and exact live QA script

### Open questions

1. Does same-type `setEquipment()` rebuild this attachable on 26.40, and do dynamic property/lore-only changes differ from a fresh stack object?
2. Does the client receive server-relative cooldown remaining, restart a local duration, or predict the cooldown?
3. Does `should_update_*_offscreen` work on attachables in 26.40 stable despite the local schema omission, and what counts as offscreen in first person?
4. What happens to attachable sound locators: correct tip, actor fallback, origin, or drop?
5. How do conditional FP/TP animation clocks behave when perspective changes mid-state?
6. What are actual per-platform voice caps, priorities, identical-event handling, and raw vanilla asset parity?
7. Are custom `subtitle` values honored for add-on events in 26.40 without schema warnings?
8. What action produces the historic `No sound found for block type 'normal'` line?

### Preparation

1. Package the exact candidate with `npm run package`; record `.mcaddon` SHA-256 and pack version from `dist/releases/` and validation report from `dist/validation/1.0.32/` (`tools/package.mjs:44-53`; `docs/LOCAL_INSTALLATION_MAP.md:33-43`).
2. Remove old/global copies and competing caches; import only the candidate. Start a new test world with no experiments. Enable Content Log GUI/file and clear old log.
3. Put one initialized 4-charge aspergillum in selected mainhand and one full aspersorium nearby. Use a screen/audio recorder at 60 fps or higher; keep game FPS overlay visible if possible.
4. For multiplayer, use a second device/account with the same RP and stand at measured 2, 8, 12, 16, 17, and 20 blocks.

### Priority test A — paired release diagnostic (run first)

1. First person, quiet location, face a high-contrast wall so the tip bridge is visible.
2. Sprinkle once. In slow-motion playback identify: metallic prepare, watery release, **four tip micro-droplets at 0.25 s**, and the separate 36-droplet fan.
3. Wait ten seconds without switching slot or perspective. Repeat. Run 50-100 pairs.
4. For every missing sound, record whether four micro-droplets are missing:
   - both missing = H1/H2/H3/H5 timeline/controller/attachable class;
   - bridge present but sound absent = H4/H6/H7 sound-engine class.
5. Record whether prepare, release, both, animation, or only bridge failed. Search the same time window for `Unable to start native cooldown`, missing sound event, missing particle, schema, or attachable errors.

### Test B — stack replacement isolation

1. Run 100 actions on current build, then guarded-entry build, then diagnostic no-tick5-write build, same world/FPS.
2. Count prepare/release/bridge failures per 100 and report Wilson 95% intervals, not anecdotes.
3. If setup-counter instrumentation exists, correlate every failure with attachable initialization/reset.

### Test C — FPS/frame pacing

1. Cap at 15, 20, 30, 60, 120 FPS; 50 actions each.
2. Repeat with deliberate frame spikes crossing 0-.20 and .20-.35 s.
3. Expect release vulnerability to rise at 15/30 FPS if tick-5 replacement preempts the later rendered keyframe.

### Test D — latency

1. Host/client multiplayer; inject 0/50/100/150/180/200/300 ms one-way delay if the network harness supports it.
2. Record actor and observer separately. Use colored cooldown-threshold diagnostic particles.
3. Determine whether first client observation reports full .90 or server-relative remaining. A hard failure boundary around 180 ms confirms H2's replication model.

### Test E — perspective/offscreen

1. Sprinkle in first person, third-person rear/front, and switch at precisely about .15 and .30 s.
2. In third person, rotate camera so actor/hand is behind the camera before each keyframe.
3. Repeat for a remote observer looking toward and away from actor.
4. Compare absent/effects-only/bones+effects flags. Reject any flag that produces a Content Log warning.

### Test F — locator and distance

1. Use diagnostic valid locator, nonexistent locator, no locator, and script-positioned events with distinct tones.
2. Listeners stand at actor and world origin, then 2/8/12/16/17/20 blocks.
3. Determine fallback/drop behavior and attenuation. Repeat with Player category slider 0/50/100 and other sliders zeroed to prove routing.

### Test G — cancellation divergence

For separate actions, between t=0 and tick 5: switch slot, swap same-type item with different `instance_id`, change dimension, change game mode to Spectator, externally set charges to zero, die, disconnect. Expected server result is no commit/36 droplets under corresponding revalidation or lifecycle cancellation (`src/application/sprinkle.ts:109-130`; `src/bootstrap/main.ts:171-223`). Record whether prepare/release still plays. After redesign, release must be zero in every cancelled case.

### Test H — mix saturation and repetition

1. Fire controlled 1/8/16/24/32/48/64 simultaneous voices, then sprinkle; repeat by category.
2. Fire identical custom events at 0/1/2/5-tick spacing and same/near positions.
3. Run the 41-event full-bucket cycle four times. Rate fatigue, semantic clarity, masking, and loudness; inspect captions.

### Test I — block warning fingerprint

Start from a cleared log and individually place, walk on, hit, break, fill, load from, dock into, and undock from each empty/low/mid/high/full visual state. Timestamp actions verbally in recording. Repeat in a no-add-on control world. The warning is attributable only if it appears consistently after a specific isolated custom action.

### Acceptance criteria

- 100/100 valid actions: exactly one prepare and one authorized release for the actor; exactly one world release for each in-range observer after redesign.
- 0/100 cancelled releases emit release audio or 36 droplets; accepted-intent prepare behavior matches its documented semantics.
- Missing sound never correlates with attachable reset because production audio no longer depends on attachable lifetime.
- No add-on missing-event, missing-particle, schema, cooldown, or block-sound warning in Content Log.
- Distance/category/caption behavior matches the final contract on every supported platform tested.
- Final imported `.mcaddon`, not loose source JSON, is the tested artifact; no old pack/cache is active (`docs/TESTING.md:193,229-248,315-327`).

## 18. Final conclusion

The ten-second observation falsifies a pure recovery-lock explanation. The controller's recovery predicate is level-triggered and remains true after cooldown reaches zero; it cannot be missed forever. The recurrent per-action hazard is instead the combination of two proven stack replacements, a reset-sensitive attachable controller, a 180 ms one-way entry gate, and a second replacement at the release keyframe. The exact engine statement “same-stack replacement tears down the attachable” still requires the controlled 26.40 experiment, so H1 is **Probable**, not dishonestly labeled Confirmed. Regardless of that final runtime proof, the current ownership is incorrect: a client render timeline decides transaction-significant sound while the server independently authorizes charge and droplets.

The production-quality solution is consequently robust to every unresolved engine detail: server-authorized one-shot audio, emitted after reservation/commit through stable 2.9.0 APIs; explicit private/world audience and position; owned namespaced media; deterministic magnitude encoding; no Beta dependencies; no gratuitous item write; and behavioral simulation plus in-game statistical QA. That architecture fixes the confirmed symptom even if H1, H2, H3, H4, and H5 interact differently across clients or platforms.
