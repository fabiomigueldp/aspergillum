import type { Player } from "@minecraft/server";
import {
  CustomForm,
  ObservableNumber,
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
  readonly cosmeticId: string;
  readonly sprayProfileId: string;
}

export interface CustomizationMenuActions {
  readonly applyCosmetic: (cosmeticId: string) => boolean;
  readonly applySprayProfile: (profileId: string) => boolean;
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
  let suppressReactiveWrites = false;

  const updateCosmetic = (): void => {
    if (suppressReactiveWrites) return;
    const cosmetic = resolveCosmeticSelection(
      METAL_FINISH_IDS[metalSelection.getData()],
      GRIP_FINISH_IDS[gripSelection.getData()],
    );
    actions.applyCosmetic(cosmetic.id);
  };
  profileSelection.subscribe((index) => {
    if (suppressReactiveWrites) return;
    const profile = SPRAY_PROFILES[index] ?? SPRAY_PROFILES[0];
    actions.applySprayProfile(profile.id);
  });
  metalSelection.subscribe(updateCosmetic);
  gripSelection.subscribe(updateCosmetic);

  const form = new CustomForm(player, translated("ui.aspergillum.table.title"));
  form
    .spacer()
    .header(translated("ui.aspergillum.table.spray.header"))
    .spacer()
    .dropdown(
      translated("ui.aspergillum.table.spray.label"),
      profileSelection,
      SPRAY_PROFILES.map((profile, index) => ({
        label: translated(`ui.aspergillum.profile.${profile.id}.name`),
        description: translated(`ui.aspergillum.profile.${profile.id}.description`),
        value: index,
      })),
    )
    .spacer()
    .header(translated("ui.aspergillum.table.appearance.header"))
    .spacer()
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
    .spacer()
    .button(translated("ui.aspergillum.table.restore"), () => {
      if (!actions.restoreClassic()) return;
      suppressReactiveWrites = true;
      try {
        profileSelection.setData(0);
        metalSelection.setData(0);
        gripSelection.setData(0);
      } finally {
        suppressReactiveWrites = false;
      }
    })
    .divider()
    .button(translated("ui.aspergillum.table.finish"), () => {
      if (actions.finishAndRetrieve()) form.close();
    })
    .button(translated("ui.aspergillum.table.close"), () => form.close());

  form.show()
    .catch((error: unknown) => {
      console.warn(`[Aspergillum] Unable to show customization menu for ${player.id}: ${String(error)}`);
    })
    .finally(actions.close);
}
