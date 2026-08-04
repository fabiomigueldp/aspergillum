# Mapa da instalação local

Snapshot auditado em **2026-08-04**. Este documento descreve o estado local do Minecraft Bedrock e do mundo `devtest`; não é uma fonte de distribuição do add-on e não substitui os manifests versionados em `packs/`.

## Instalação do Minecraft

```text
Executável:
C:\Program Files\WindowsApps\Microsoft.MinecraftUWP_1.26.3301.0_x64__8wekyb3d8bbwe\Minecraft.Windows.exe

Pacote AppX:
C:\Program Files\WindowsApps\Microsoft.MinecraftUWP_1.26.3301.0_x64__8wekyb3d8bbwe
Versão: 1.26.3301.0

Raiz de dados usada por esta instalação:
C:\Users\fabio\AppData\Roaming\Minecraft Bedrock
```

O caminho UWP clássico `C:\Users\fabio\AppData\Local\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang` não contém o armazenamento usado nesta instalação.

## Mapa principal dos dados

```text
C:\Users\fabio\AppData\Roaming\Minecraft Bedrock
└── Users
    ├── Shared
    │   └── games\com.mojang
    │       ├── behavior_packs
    │       │   └── pack.asper                 # Aspergillum — Comportamento
    │       ├── resource_packs
    │       │   └── pack.asper                 # Aspergillum — Recursos
    │       ├── development_behavior_packs    # vazio
    │       ├── development_resource_packs    # vazio
    │       ├── minecraftWorlds                # vazio neste perfil compartilhado
    │       ├── custom_skins
    │       └── skin_packs
    │
    └── 8414181078248597151
        └── games\com.mojang
            ├── minecraftWorlds
            │   ├── RYdEhTaa5t8=              # devtest
            │   └── ...                        # outros 17 mundos
            ├── minecraftpe
            ├── custom_skins
            ├── Screenshots
            ├── skin_packs
            └── world_templates
```

Os packs estão em `Users\Shared`; os mundos estão no perfil `8414181078248597151`. Portanto, um mundo pode manter uma cópia local de um pack mesmo quando o pack compartilhado também existe.

## Aspergillum compartilhado

### Behavior Pack

```text
C:\Users\fabio\AppData\Roaming\Minecraft Bedrock\Users\Shared\games\com.mojang\behavior_packs\pack.asper
```

- versão: `1.0.15`;
- UUID do pack: `bac9f8bc-71f5-4db7-a0ff-3c5a365749b4`;
- módulo data: `b28e5a1f-ce3e-44a4-91e4-14e5cb38f5b4`;
- módulo script: `66f0a25c-2851-4e27-939c-d1a1f01b2a99`;
- entrada do script: `scripts/main.js`;
- dependência de recurso: `fdb8a79c-8f77-4831-9a5c-8e2b8ecca29e`;
- dependência Script API: `@minecraft/server 2.8.0`;
- 13 arquivos, 72.873 bytes.

### Resource Pack

```text
C:\Users\fabio\AppData\Roaming\Minecraft Bedrock\Users\Shared\games\com.mojang\resource_packs\pack.asper
```

- versão: `1.0.15`;
- UUID do pack: `fdb8a79c-8f77-4831-9a5c-8e2b8ecca29e`;
- módulo resources: `6533fc09-b0f1-428f-981f-400874156547`;
- `pack_scope`: `world`;
- capability: `pbr`;
- 27 arquivos, 304.295 bytes.

Os manifests instalados são cópias dos manifests versionados em [`packs/behavior/manifest.json`](../packs/behavior/manifest.json) e [`packs/resource/manifest.json`](../packs/resource/manifest.json).

## Mundo `devtest`

### Identidade e localização

```text
Nome exibido: devtest
Pasta:
C:\Users\fabio\AppData\Roaming\Minecraft Bedrock\Users\8414181078248597151\games\com.mojang\minecraftWorlds\RYdEhTaa5t8=
```

O mundo contém 52 arquivos, 27 diretórios e 434.735 bytes no snapshot auditado.

### Árvore do mundo

```text
RYdEhTaa5t8=
├── behavior_packs
│   └── pack                         # cópia local do Behavior Pack, 13 arquivos
├── resource_packs
│   └── pack                         # cópia local do Resource Pack, 27 arquivos
├── db                               # LevelDB do estado persistente do mundo
│   ├── CURRENT
│   ├── MANIFEST-000001
│   ├── 000004.log
│   └── *.ldb
├── level.dat                        # 3.051 bytes
├── level.dat_old                    # 3.051 bytes
├── levelname.txt                    # contém `devtest`
├── world_icon.jpeg                  # 25.827 bytes
├── world_behavior_packs.json        # vínculo ativo do Behavior Pack
├── world_resource_packs.json        # vínculo ativo do Resource Pack
├── world_behavior_pack_history.json # histórico do Behavior Pack
└── world_resource_pack_history.json # histórico do Resource Pack
```

### Vínculos ativos

`world_behavior_packs.json` em `RYdEhTaa5t8=` contém:

```json
{
  "pack_id": "bac9f8bc-71f5-4db7-a0ff-3c5a365749b4",
  "version": [1, 0, 15]
}
```

`world_resource_packs.json` em `RYdEhTaa5t8=` contém:

```json
{
  "pack_id": "fdb8a79c-8f77-4831-9a5c-8e2b8ecca29e",
  "version": [1, 0, 15]
}
```

Os arquivos de histórico confirmam os mesmos UUIDs e versão `1.0.15`, com `can_be_redownloaded: false`.

### Cópias locais dos packs

No `devtest`, os packs carregados localmente ficam em:

```text
C:\Users\fabio\AppData\Roaming\Minecraft Bedrock\Users\8414181078248597151\games\com.mojang\minecraftWorlds\RYdEhTaa5t8=\behavior_packs\pack
C:\Users\fabio\AppData\Roaming\Minecraft Bedrock\Users\8414181078248597151\games\com.mojang\minecraftWorlds\RYdEhTaa5t8=\resource_packs\pack
```

As três cópias — fonte do projeto, pack compartilhado e cópia local do `devtest` — conferem por SHA-256:

| Pack | Fonte | Shared | `devtest` | Divergências |
| --- | ---: | ---: | ---: | ---: |
| Behavior | 13 arquivos | 13 arquivos | 13 arquivos | 0 |
| Resource | 27 arquivos | 27 arquivos | 27 arquivos | 0 |

### Inventário completo do Behavior Pack dentro do `devtest`

```text
behavior_packs\pack\manifest.json
behavior_packs\pack\pack_icon.png
behavior_packs\pack\blocks\aspersorium.block.json
behavior_packs\pack\functions\aspergillum\dev_kit.mcfunction
behavior_packs\pack\items\aspergillum.item.json
behavior_packs\pack\loot_tables\blocks\aspersorium.loot.json
behavior_packs\pack\loot_tables\blocks\aspersorium_docked.loot.json
behavior_packs\pack\recipes\aspergillum.recipe.json
behavior_packs\pack\recipes\aspersorium.recipe.json
behavior_packs\pack\scripts\main.js
behavior_packs\pack\texts\en_US.lang
behavior_packs\pack\texts\pt_BR.lang
behavior_packs\pack\texts\languages.json
```

### Inventário completo do Resource Pack dentro do `devtest`

```text
resource_packs\pack\manifest.json
resource_packs\pack\pack_icon.png
resource_packs\pack\blocks.json
resource_packs\pack\animations\aspergillum.action.animation.json
resource_packs\pack\animations\aspergillum.hold.animation.json
resource_packs\pack\attachables\aspergillum.attachable.json
resource_packs\pack\models\blocks\aspersorium.geo.json
resource_packs\pack\models\blocks\aspersorium.rotations.geo.json
resource_packs\pack\models\entity\aspergillum.geo.json
resource_packs\pack\particles\holy_water_droplet.particle.json
resource_packs\pack\render_controllers\aspergillum.render_controllers.json
resource_packs\pack\texts\en_US.lang
resource_packs\pack\texts\pt_BR.lang
resource_packs\pack\texts\languages.json
resource_packs\pack\textures\blocks\aspersorium.png
resource_packs\pack\textures\blocks\aspersorium_normal.png
resource_packs\pack\textures\blocks\aspersorium_mer.png
resource_packs\pack\textures\blocks\aspersorium.texture_set.json
resource_packs\pack\textures\blocks\holy_water.png
resource_packs\pack\textures\entity\aspergillum.png
resource_packs\pack\textures\entity\aspergillum_normal.png
resource_packs\pack\textures\entity\aspergillum_mer.png
resource_packs\pack\textures\entity\aspergillum.texture_set.json
resource_packs\pack\textures\items\aspergillum.png
resource_packs\pack\textures\particle\holy_water.png
resource_packs\pack\textures\item_texture.json
resource_packs\pack\textures\terrain_texture.json
```

## Uso do Aspergillum nos mundos do perfil

Os vínculos foram encontrados nos arquivos `world_behavior_packs.json` e `world_resource_packs.json` sob:

```text
C:\Users\fabio\AppData\Roaming\Minecraft Bedrock\Users\8414181078248597151\games\com.mojang\minecraftWorlds
```

- 18 mundos foram encontrados;
- 15 possuem os dois packs na versão `1.0.15`;
- 1 possui somente o Behavior Pack: `Small Medieval Church 1.0.4 (imported)`, pasta `vz5XjjBKc8k=`;
- 2 não possuem referência ao Aspergillum: pastas `Rk1N0Z9IRbU=` e `yIf27GNEKN0=`;
- `devtest`, pasta `RYdEhTaa5t8=`, possui os dois packs ativos e cópias locais completas.

## Relação com o projeto

```text
C:\Users\fabio\Projects\aspergillum
├── packs\behavior                 # fonte do Behavior Pack
├── packs\resource                 # fonte do Resource Pack
├── dist\releases\Aspergillum-1.0.15.mcaddon
├── dist\validation\1.0.15         # relatórios oficiais da versão
└── docs\LOCAL_INSTALLATION_MAP.md  # este mapa
```

O pacote distribuível mais recente é `dist\releases\Aspergillum-1.0.15.mcaddon`. A instalação compartilhada e o `devtest` correspondem à versão `1.0.15` e não apresentam divergência de arquivos em relação às fontes do projeto no momento da auditoria.

## Limite deste mapa

O diretório `db` é o banco LevelDB do mundo. Ele foi inventariado por tamanho e arquivos, mas não foi convertido para uma listagem de entidades, blocos ou itens; esses dados são binários e ficam sujeitos ao estado salvo no mundo. A presença do add-on no mundo é comprovada pelos manifests locais, pelos vínculos ativos, pelo histórico e pelas cópias completas dos packs.
