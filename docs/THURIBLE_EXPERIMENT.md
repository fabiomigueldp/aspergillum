# Experimental Thurible Branch

## Status

This document records the isolated experimental implementation of the ceremonial
thurible. The work is intentionally parked and is not approved for merge into
`main` or for production distribution.

| Field | Value |
| --- | --- |
| Branch | `codex/experimental-thurible` |
| Baseline branch | `main` |
| Baseline commit | `5f788adad7df5586d4a6bb2b86f18b1ba3958426` |
| Experimental package line | `1.2.0` → `1.2.1` → `1.2.2` |
| Current package metadata on this branch | `1.2.2`, pack revision `[1, 2, 2]` |
| Release posture | Experimental / parked / not production-approved |

## Why the work is isolated

The thurible did not meet the expected visual and ceremonial standard during
the physical review. In particular, the first smoke implementation was too
small, sparse, and short-lived to create the intended atmospheric presence.
The `1.2.1` revision corrected the presentation and animation-controller
issues discovered in the first gate, while `1.2.2` increased smoke density,
coverage, scale, and persistence. Those changes improve the hypothesis, but
they do not convert the feature into an approved release.

The feature is therefore preserved as a reversible research line instead of
being mixed into the protected `main` baseline. Returning to the baseline does
not delete the work; it simply keeps the experimental release out of the active
product line until a future decision authorizes further investigation.

## Experimental scope

The branch contains the complete pending thurible slice and its supporting
documentation/tooling:

- public item `aspergillum:thurible` with a stable crafting recipe and localized
  interaction text;
- independent semantic source geometry with a neutral
  `thurible_bound` root, articulated suspension, perforated lid, counterweighted
  bowl, and `thurible_smoke` locator;
- perspective-specific hold and incense animations with deterministic pendulum
  behavior and no experimental physics API;
- stable custom-component input for use in air and use-on-block, with a native
  `1.05 s` cooldown and transient duplicate-input protection;
- idle smoke, action trail, and residual smoke as presentation-only particles;
- a low-volume `aspergillum.thurible.swing` audio alias that reuses existing
  mechanical clips;
- behavior/resource-pack manifests, recipes, item mappings, localizations,
  development-kit provisioning, and generated-asset support;
- structural validation and release-readiness rules for the experimental
  geometry, animation, particle, input, and pack contracts;
- versioned release documentation for the `1.2.0`, `1.2.1`, and `1.2.2`
  iterations.

The thurible remains deliberately separate from the aspersorium's persistent
state model. It has no fuel, coal, inventory, durability, charges, water,
dynamic properties, block snapshot, entity interaction, status effect, or
gameplay effect. Its presentation must not modify the protected aspersorium
binding, geometry, poses, spray mathematics, docking, persistence, or
material-pipeline contracts.

## Version history preserved by this branch

### `1.2.0` — initial ceremonial instrument

Introduced the independent thurible item, articulated geometry, deterministic
pendulum animation, stable use input, localized recipe and interaction text,
three-layer smoke presentation, and a reused mechanical audio alias. The first
physical gate identified presentation issues that required a follow-up.

### `1.2.1` — first-gate corrections

Corrected the third-person presentation direction, reduced and reframed the
first-person presentation, and removed the invalid `bind_to_actor` property
from animation-controller particle effects. The revision kept the gameplay
boundary and the protected aspersorium contracts unchanged.

### `1.2.2` — smoke-presence candidate

Redesigned only the atmospheric VFX: denser action emission, larger and longer
residual veils, stronger idle smoke, and a dedicated eight-frame veil atlas.
The intended result is readable smoke at ceremonial distances without a ground
disk, collision, light emission, status effect, or opaque wall. The physical
cinematic gate remains the outstanding acceptance criterion.

## Acceptance boundary

This branch must not be treated as a production release merely because the
source files, generated pack definitions, or offline structural rules exist.
Before any merge or distribution decision, the future owner must repeat the
manual gate in [TESTING.md](TESTING.md) using the exact packaged artifact,
without older packs or cache competitors. The gate must cover:

1. first-person and third-person pose, suspension, silhouette, and six-side
   visibility;
2. idle column, continuous action trail, residual veil persistence, and
   readability at ceremonial distances;
3. observer/remote presentation, audio mix, and one-action-per-input behavior;
4. harmless attack/mining behavior, spectator denial, and no gameplay state
   mutation;
5. regression of the protected aspersorium and caldeirinha paths;
6. Content Log and performance evidence with the exact imported package.

The known `MaterialInstances` messages documented for the `1.1.7` caldeirinha
pipeline remain an explicit exception only for that existing material path.
They are not blanket permission to accept new errors from the thurible.

## Security and media provenance

No ElevenLabs API key, access token, secret, or credential is part of this
experimental branch. The thurible audio entry reuses already distributed
mechanical clips through a semantic alias. Existing project documentation
records that the current ElevenLabs-derived sound set is suitable only for
the non-commercial attributed RC; commercial distribution requires a separately
licensed regeneration and provenance review.

## Resuming the experiment

When the feature is revisited, start from this branch and compare it with the
then-current `main` rather than merging it automatically. Re-check the visual
contract, architecture, state/concurrency rules, release notes, and physical
acceptance gate before changing implementation. Any future promotion should be
an intentional release decision with a new version, a reproducible evidence
record, and an explicit review of the unresolved smoke-presence hypothesis.

This document is a record of intent and scope. It is not evidence that the
thurible has passed the Minecraft physical gate.
