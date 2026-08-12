export const WORKBENCH_TOOLS = Object.freeze([
  Object.freeze({
    id: 'model',
    title: 'Model Lab',
    document: './model-lab.html',
    main: '#viewer-main',
    status: '.topbar-context',
    actions: Object.freeze(['#import-button', '#file-input']),
  }),
  Object.freeze({
    id: 'bedrock',
    title: 'Bedrock Renderer',
    document: './bedrock-renderer.html',
    main: '#fidelity-main',
    status: '.runtime-badge',
    actions: Object.freeze([]),
  }),
  Object.freeze({
    id: 'avatar',
    title: 'Avatar Lab',
    document: './avatar-lab.html',
    main: '#avatar-main',
    status: '.runtime-status',
    actions: Object.freeze([]),
  }),
]);

export const WORKBENCH_TOOL_ALIASES = Object.freeze({
  fidelity: 'bedrock',
  renderer: 'bedrock',
});

export function getWorkbenchTool(value) {
  const requested = String(value ?? '').toLowerCase();
  const resolved = WORKBENCH_TOOL_ALIASES[requested] ?? requested;
  return WORKBENCH_TOOLS.find(({ id }) => id === resolved) ?? WORKBENCH_TOOLS[0];
}

export function workbenchUrl(currentUrl, toolId) {
  const url = new URL(currentUrl, 'http://localhost/');
  url.searchParams.set('tool', getWorkbenchTool(toolId).id);
  return `${url.pathname}${url.search}${url.hash}`;
}
