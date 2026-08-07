import type { Player } from "@minecraft/server";
import {
  CustomForm,
  ObservableNumber,
  ObservableUIRawMessage,
  type UIRawMessage,
} from "@minecraft/server-ui";
import {
  GRIP_FINISH_IDS,
  METAL_FINISH_IDS,
  resolveCosmetic,
  resolveCosmeticSelection,
} from "../domain/customization";
import { SPRAY_PROFILES, resolveSprayProfile } from "../domain/spray-profile";

export interface CustomizationMenuModel {
  readonly charges: number;
  readonly cosmeticId: string;
  readonly sprayProfileId: string;
}

export interface CustomizationMenuActions {
  readonly applyCosmetic: (cosmeticId: string) => boolean;
  readonly applySprayProfile: (profileId: string) => boolean;
  readonly preview: () => void;
  readonly restoreClassic: () => boolean;
  readonly finishAndRetrieve: () => boolean;
  readonly close: () => void;
}

function translated(key: string, ...parameters: string[]): UIRawMessage {
  return parameters.length === 0 ? { translate: key } : { translate: key, with: parameters };
}

export function showCustomizationMenu(
  player: Player,
  model: CustomizationMenuModel,
  actions: CustomizationMenuActions,
): void {
  const initialCosmetic = resolveCosmetic(model.cosmeticId);
  const initialProfile = resolveSprayProfile(model.sprayProfileId);
  const profileSelection = new ObservableNumber(
    SPRAY_PROFILES.findIndex((profile) => profile.id === initialProfile.id),
    { clientWritable: true },
  );
  const metalSelection = new ObservableNumber(METAL_FINISH_IDS.indexOf(initialCosmetic.metal), {
    clientWritable: true,
  });
  const gripSelection = new ObservableNumber(GRIP_FINISH_IDS.indexOf(initialCosmetic.grip), {
    clientWritable: true,
  });
  const status = new ObservableUIRawMessage(translated("ui.aspergillum.table.status.ready"));
  let suppressReactiveWrites = false;

  const updateCosmetic = (): void => {
    if (suppressReactiveWrites) return;
    const cosmetic = resolveCosmeticSelection(
      METAL_FINISH_IDS[metalSelection.getData()],
      GRIP_FINISH_IDS[gripSelection.getData()],
    );
    status.setData(actions.applyCosmetic(cosmetic.id)
      ? translated("ui.aspergillum.table.status.applied")
      : translated("ui.aspergillum.table.status.failed"));
  };
  profileSelection.subscribe((index) => {
    if (suppressReactiveWrites) return;
    const profile = SPRAY_PROFILES[index] ?? SPRAY_PROFILES[0];
    status.setData(actions.applySprayProfile(profile.id)
      ? translated("ui.aspergillum.table.status.applied")
      : translated("ui.aspergillum.table.status.failed"));
  });
  metalSelection.subscribe(updateCosmetic);
  gripSelection.subscribe(updateCosmetic);

  const form = new CustomForm(player, translated("ui.aspergillum.table.title"));
  form
    .header(translated("ui.aspergillum.table.instrument"))
    .label(translated("ui.aspergillum.table.charges", String(model.charges), "4"))
    .divider()
    .header(translated("ui.aspergillum.table.spray.header"))
    .dropdown(
      translated("ui.aspergillum.table.spray.label"),
      profileSelection,
      SPRAY_PROFILES.map((profile, index) => ({
        label: translated(`ui.aspergillum.profile.${profile.id}.name`),
        description: translated(`ui.aspergillum.profile.${profile.id}.description`),
        value: index,
      })),
      { description: translated("ui.aspergillum.table.spray.description") },
    )
    .button(translated("ui.aspergillum.table.preview"), actions.preview, {
      tooltip: translated("ui.aspergillum.table.preview.tooltip"),
    })
    .divider()
    .header(translated("ui.aspergillum.table.appearance.header"))
    .dropdown(
      translated("ui.aspergillum.table.metal.label"),
      metalSelection,
      METAL_FINISH_IDS.map((id, index) => ({
        label: translated(`ui.aspergillum.metal.${id}.name`),
        description: translated(`ui.aspergillum.metal.${id}.description`),
        value: index,
      })),
    )
    .dropdown(
      translated("ui.aspergillum.table.grip.label"),
      gripSelection,
      GRIP_FINISH_IDS.map((id, index) => ({
        label: translated(`ui.aspergillum.grip.${id}.name`),
        description: translated(`ui.aspergillum.grip.${id}.description`),
        value: index,
      })),
    )
    .button(translated("ui.aspergillum.table.restore"), () => {
      if (!actions.restoreClassic()) {
        status.setData(translated("ui.aspergillum.table.status.failed"));
        return;
      }
      suppressReactiveWrites = true;
      try {
        profileSelection.setData(0);
        metalSelection.setData(0);
        gripSelection.setData(0);
      } finally {
        suppressReactiveWrites = false;
      }
      status.setData(translated("ui.aspergillum.table.status.restored"));
    })
    .divider()
    .label(status)
    .button(translated("ui.aspergillum.table.finish"), () => {
      if (actions.finishAndRetrieve()) form.close();
      else status.setData(translated("ui.aspergillum.table.status.failed"));
    })
    .closeButton();

  form.show()
    .catch((error: unknown) => {
      console.warn(`[Aspergillum] Unable to show customization menu for ${player.id}: ${String(error)}`);
    })
    .finally(actions.close);
}
