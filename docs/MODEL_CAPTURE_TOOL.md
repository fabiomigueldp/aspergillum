# Model Capture Tool for Agents

## Purpose

Use these tools to inspect model silhouette, face coverage, UV placement, materials, water states, and composed objects from stable camera directions. They drive the same Bedrock Renderer used by the web workbench in headless Chromium and produce clean PNGs plus labeled contact sheets.

For a player skin holding the attachable, coordinated player/item animation, grip close-ups, or first-person viewmodel evidence, use [Avatar Lab](AVATAR_LAB.md) and `npm run capture:avatars -- --help` instead.

The tool is diagnostic. It does not reproduce Minecraft's proprietary shader, world lighting, player/skin integration, complete camera behavior, particles, cache, or runtime culling. Final visual acceptance still requires the imported `.mcaddon` and the relevant gates in `docs/TESTING.md`.

## Canonical command

Run from the repository root:

```powershell
npm run capture:models -- --subject all
```

For all options:

```powershell
npm run capture:models -- --help
```

The command synchronizes the current Resource Pack into the temporary viewer catalog before capture.

`capture:models` remains the specialized Aspergillum matrix. For any registered project, model, or equipment, use the workspace-neutral command:

```powershell
npm run capture:assets -- --addon ornatum --equipment barretepadre --views front,front-right,back --size 1024
npm run capture:assets -- --addon ornatum --model entity__pa_baculodourado1 --views front,right,back
npm run capture:assets -- --addon ornatum --equipment all --views front-right
```

`--equipment` accepts the namespaced item ID or `localId`; `--model` accepts model ID or geometry identifier. Passing `all` is explicit because a project may contain many assets. Without either option, the first resolved equipment is used. Output defaults to `out/asset-captures/<addon>/<timestamp>/` and its schema 1 manifest records project, selection, geometry, cameras and paths.

## Prerequisites

Install the root and viewer dependencies. If Playwright cannot find Chromium, install it once:

```powershell
cd viewer-3d
npx playwright install chromium
cd ..
```

Do not install or use an unrelated browser automation path for this workflow; the checked-in CLI is the reproducible entry point.

## Subjects

| ID | Rendered subject | Default state |
| --- | --- | --- |
| `aspergillum` | Standalone aspergillum geometry | Neutral model pose |
| `aspersorium` | Aspersorium without the resting aspergillum | Full water |
| `docked` | Aspersorium with the resting aspergillum | Full water |
| `table` | Sacristan table without the resting aspergillum | Empty work surface |
| `table-docked` | Sacristan table with the resting aspergillum | Classic finish |
| `all` | All five subjects | Subject defaults |

The nine default views are `front`, `front-right`, `right`, `back-right`, `back`, `left`, `front-left`, `top`, and `bottom`. Their directions are fixed in `viewer-3d/src/shared/capture-contract.js`.

## Useful commands

Full visual baseline:

```powershell
npm run capture:models -- --subject all --size 768 --output out/model-captures/baseline
```

Focused face inspection:

```powershell
npm run capture:models -- --subject aspergillum --views front,right,back,left,top,bottom --size 1024
```

Docked composition without water:

```powershell
npm run capture:models -- --subject docked --water empty --size 768
```

Attachable animation frame:

```powershell
npm run capture:models -- --subject aspergillum --pose third --action sprinkle --timeline 0.25
```

Material comparison:

```powershell
npm run capture:models -- --subject all --material pbr --output out/model-captures/pbr
npm run capture:models -- --subject all --material classic --output out/model-captures/classic
```

Finish matrix:

```powershell
npm run capture:models -- --subject aspergillum,docked,table-docked --cosmetic all --views front-right --material pbr --output out/model-captures/finishes-pbr
```

When more than one finish is requested, each subject also receives `finish-matrix.png`; individual captures remain grouped by cosmetic ID.

## Main options

| Option | Values | Notes |
| --- | --- | --- |
| `--subject` | subject IDs, comma-separated, or `all` | Defaults to all subjects |
| `--views` | view IDs, comma-separated | Preserves the requested order |
| `--size` | `256..2048` | Square resolution of each clean view; default `640` |
| `--columns` | `1..6` | Contact-sheet columns; default `3` |
| `--material` | `pbr`, `classic` | PBR uses color, normal, and MERS when available |
| `--cosmetic` | cosmetic IDs, comma-separated, or `all` | Defaults to `classic`; order is preserved |
| `--water` | `empty`, `low`, `mid`, `high`, `full` | Controls the visible water bone |
| `--pose` | `neutral`, `first`, `third` | Use `first` or `third` for attachable animation evidence |
| `--action` | `idle`, `sprinkle` | `sprinkle` should be paired with a non-neutral pose |
| `--timeline` | seconds | Samples the selected action at a fixed time |
| `--wireframe` | flag | Useful for topology and cube-boundary diagnosis |
| `--grid` | flag | Adds the diagnostic grid |
| `--output` | path | Relative paths resolve from the repository root |

The generic `capture:assets` command shares `--views`, `--size`, `--columns`, `--material`, `--cosmetic`, `--wireframe`, `--grid` and `--output`, and adds `--addon`, `--equipment`, `--model` and `--transparent`. Project capabilities choose classic/PBR and the default cosmetic when those options are omitted.

## Output contract

Without `--output`, each run creates `out/model-captures/<timestamp>/`. The directory is ignored by Git.

```text
out/model-captures/<run>/
├── capture-manifest.json
├── aspergillum/
│   ├── classic/
│   │   ├── front.png
│   │   └── contact-sheet.png
│   ├── ...
│   └── finish-matrix.png
├── aspersorium/
│   └── ...
├── docked/
│   └── ...
├── table/
│   └── ...
└── table-docked/
    └── ...
```

With one finish, the legacy `subject/front.png` layout is preserved. With multiple finishes, individual PNGs live under `subject/<cosmetic>/`. Each `contact-sheet.png` labels the requested views, `finish-matrix.png` compares one fixed view across finishes, and schema 2 of `capture-manifest.json` records the pack version, geometry, composed water geometry, cosmetic, material, options, camera positions, targets, and relative paths.

## Agent workflow

1. Check Git state and identify the visual contract under review.
2. Capture a baseline with an explicit output name and the smallest view set that proves the hypothesis.
3. Change authoritative sources only. Never edit generated PNGs, distributed geometry, or capture output as product assets.
4. Capture the candidate with exactly the same subject, views, size, material, water, pose, action, and timeline.
5. Compare contact sheets for broad regressions, then inspect individual PNGs at full resolution for face, UV, seam, color, or culling defects.
6. Run `npm --prefix viewer-3d test`, `npm --prefix viewer-3d run smoke:workbench` and `npm --prefix viewer-3d run build` after modifying the renderer, capture contract, project sync, or model conversion.
7. Report the command, manifest path, relevant images, expected result, observed result, and remaining Minecraft-only validation.

Do not approve a visual correction solely from these images. When the Three.js preview and Minecraft disagree, treat the final imported pack and Content Log as authoritative and use the capture tool to isolate the discrepancy.

For authored brand artwork rather than diagnostic contact sheets, use the separate workflow in `docs/COVER_RENDERER.md`. It consumes the same real model pipeline, but adds transparent capture, cinematic lighting, typography, composition, a native 256 px proof, and an approval boundary before any `pack_icon.png` change.
