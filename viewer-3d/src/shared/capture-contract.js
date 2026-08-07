export const CAPTURE_SUBJECTS = Object.freeze({
  aspergillum: Object.freeze({
    id: 'aspergillum',
    label: 'Aspersório',
    modelId: 'entity__aspergillum',
    docked: false,
    neutralPose: true,
  }),
  aspersorium: Object.freeze({
    id: 'aspersorium',
    label: 'Caldeirinha',
    modelId: 'blocks__aspersorium',
    docked: false,
    neutralPose: false,
  }),
  docked: Object.freeze({
    id: 'docked',
    label: 'Caldeirinha com aspersório',
    modelId: 'blocks__aspersorium',
    docked: true,
    neutralPose: false,
  }),
  table: Object.freeze({
    id: 'table',
    label: 'Mesa do sacristão',
    modelId: 'blocks__sacristan_table',
    docked: false,
    neutralPose: false,
  }),
  'table-docked': Object.freeze({
    id: 'table-docked',
    label: 'Mesa do sacristão com aspersório',
    modelId: 'blocks__sacristan_table',
    docked: true,
    neutralPose: false,
  }),
});

export const CAPTURE_VIEWS = Object.freeze([
  Object.freeze({ id: 'front', label: 'Frente', direction: [0, 0, 1], up: [0, 1, 0] }),
  Object.freeze({ id: 'front-right', label: 'Frente · direita', direction: [1, 0.55, 1], up: [0, 1, 0] }),
  Object.freeze({ id: 'right', label: 'Direita', direction: [1, 0, 0], up: [0, 1, 0] }),
  Object.freeze({ id: 'back-right', label: 'Trás · direita', direction: [1, 0.55, -1], up: [0, 1, 0] }),
  Object.freeze({ id: 'back', label: 'Trás', direction: [0, 0, -1], up: [0, 1, 0] }),
  Object.freeze({ id: 'left', label: 'Esquerda', direction: [-1, 0, 0], up: [0, 1, 0] }),
  Object.freeze({ id: 'front-left', label: 'Frente · esquerda', direction: [-1, 0.55, 1], up: [0, 1, 0] }),
  Object.freeze({ id: 'top', label: 'Superior', direction: [0, 1, 0], up: [0, 0, -1] }),
  Object.freeze({ id: 'bottom', label: 'Inferior', direction: [0, -1, 0], up: [0, 0, 1] }),
]);

export function getCaptureSubject(subjectId) {
  return CAPTURE_SUBJECTS[subjectId] ?? null;
}

export function getCaptureView(viewId) {
  return CAPTURE_VIEWS.find((view) => view.id === viewId) ?? null;
}

export function resolveCaptureViews(viewIds) {
  if (!viewIds?.length) return [...CAPTURE_VIEWS];
  const resolved = viewIds.map(getCaptureView);
  const missingIndex = resolved.findIndex((view) => !view);
  if (missingIndex >= 0) throw new Error(`Vista de captura desconhecida: ${viewIds[missingIndex]}`);
  return resolved;
}
