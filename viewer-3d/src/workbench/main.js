import {
  WORKBENCH_TOOLS,
  getWorkbenchTool,
  workbenchUrl,
} from '../shared/workbench-contract.js';
import {
  getSelectedProject,
  loadAssetWorkspace,
  setSelectedProject,
} from '../shared/project-context.js';

const MODULE_LOADERS = Object.freeze({
  model: () => import('../main.js'),
  bedrock: () => import('../bedrock-renderer/main.js'),
  avatar: () => import('../avatar-lab/main.js'),
});
const TOOL_DEFINITIONS = Object.freeze(Object.fromEntries(WORKBENCH_TOOLS.map((tool) => (
  [tool.id, Object.freeze({ ...tool, loadModule: MODULE_LOADERS[tool.id] })]
))));
const entries = new Map();
const markupPromises = new Map();
const ui = {
  host: document.querySelector('#tool-host'),
  runtimeSlot: document.querySelector('#workbench-runtime-slot'),
  actionsSlot: document.querySelector('#workbench-actions-slot'),
  routeStatus: document.querySelector('#workbench-route-status'),
  skipLink: document.querySelector('#workbench-skip-link'),
  projectSelect: document.querySelector('#workbench-project-select'),
  projectEyebrow: document.querySelector('#workbench-project-eyebrow'),
  projectVersion: document.querySelector('#workbench-project-version'),
  links: [...document.querySelectorAll('[data-tool-link]')],
  styles: new Map([...document.querySelectorAll('[data-tool-styles]')].map((link) => (
    [link.dataset.toolStyles, link]
  ))),
};

let activeTool = null;
let activeEntry = null;
let pendingNavigation = null;
let navigationDrain = null;
let currentProject = null;

function normalizeTool(value) {
  return getWorkbenchTool(value).id;
}

function toolFromLocation() {
  return normalizeTool(new URL(window.location.href).searchParams.get('tool'));
}

function toolUrl(tool) {
  return workbenchUrl(window.location.href, tool);
}

function announce(message) {
  ui.routeStatus.textContent = '';
  requestAnimationFrame(() => { ui.routeStatus.textContent = message; });
}

function setNavigationState(tool, busy = false) {
  for (const link of ui.links) {
    const current = link.dataset.toolLink === tool;
    if (current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
    link.toggleAttribute('data-loading', busy && current);
  }
}

function setActiveStyles(tool) {
  for (const [id, link] of ui.styles) {
    link.media = id === tool ? 'all' : 'not all';
    link.disabled = id !== tool;
  }
}

async function waitForStyles(tool) {
  const link = ui.styles.get(tool);
  if (!link) return;
  setActiveStyles(tool);
  if (!link.sheet) {
    await new Promise((resolve) => {
      const finish = () => resolve();
      link.addEventListener('load', finish, { once: true });
      link.addEventListener('error', finish, { once: true });
      setTimeout(finish, 1500);
    });
  }
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

function loadingView(label) {
  const loading = document.createElement('div');
  loading.className = 'workbench-loading';
  loading.setAttribute('role', 'status');
  loading.innerHTML = `
    <span class="workbench-loading-mark" aria-hidden="true"></span>
    <div><strong>Abrindo ${label}</strong><span>Preservando a sessão da bancada</span></div>`;
  return loading;
}

function errorView(definition, error) {
  const message = error instanceof Error ? error.message : String(error);
  const container = document.createElement('div');
  container.className = 'workbench-error';
  container.innerHTML = `
    <span aria-hidden="true">!</span>
    <div><strong>Não foi possível abrir ${definition.title}</strong><p></p></div>
    <button type="button">Tentar novamente</button>`;
  container.querySelector('p').textContent = message;
  container.querySelector('button').addEventListener('click', () => {
    entries.delete(definition.id);
    markupPromises.delete(definition.id);
    requestNavigation(definition.id, { replace: true });
  });
  return container;
}

async function fetchToolDocument(definition) {
  if (!markupPromises.has(definition.id)) {
    markupPromises.set(definition.id, fetch(definition.document).then(async (response) => {
      if (!response.ok) throw new Error(`Documento ${definition.document} indisponível (${response.status}).`);
      return response.text();
    }));
  }
  return markupPromises.get(definition.id);
}

async function createEntry(definition) {
  const source = await fetchToolDocument(definition);
  const parsed = new DOMParser().parseFromString(source, 'text/html');
  const sourceMain = parsed.querySelector(definition.main);
  if (!sourceMain) throw new Error(`A superfície ${definition.main} não existe em ${definition.document}.`);

  const node = document.createElement('section');
  node.className = 'tool-surface';
  node.dataset.toolRoot = definition.id;
  node.setAttribute('role', 'tabpanel');
  node.setAttribute('aria-label', definition.title);
  node.append(document.importNode(sourceMain, true));

  const toast = parsed.querySelector('#toast');
  if (toast) node.append(document.importNode(toast, true));

  const statusSource = parsed.querySelector(definition.status);
  const status = statusSource ? document.importNode(statusSource, true) : null;
  const actions = definition.actions.map((selector) => parsed.querySelector(selector))
    .filter(Boolean)
    .map((element) => document.importNode(element, true));
  const parking = document.createElement('div');
  parking.hidden = true;
  parking.dataset.toolParking = definition.id;
  node.append(parking);

  return {
    definition,
    node,
    status,
    actions,
    parking,
    initialized: false,
  };
}

async function getEntry(tool) {
  if (!entries.has(tool)) {
    entries.set(tool, createEntry(TOOL_DEFINITIONS[tool]).catch((error) => {
      entries.delete(tool);
      throw error;
    }));
  }
  return entries.get(tool);
}

function parkEntry(entry) {
  if (!entry) return;
  entry.node.remove();
  if (entry.status) entry.parking.append(entry.status);
  for (const action of entry.actions) entry.parking.append(action);
}

function attachEntry(entry) {
  ui.host.replaceChildren(entry.node);
  ui.runtimeSlot.replaceChildren(entry.status ?? document.createTextNode('Runtime local'));
  ui.actionsSlot.replaceChildren(...entry.actions);
}

async function initializeEntry(entry) {
  if (entry.initialized) return;
  await entry.definition.loadModule();
  entry.initialized = true;
}

async function navigate(requestedTool, { replace = false, fromHistory = false } = {}) {
  const tool = normalizeTool(requestedTool);
  if (activeTool === tool && ui.host.getAttribute('aria-busy') === 'false') {
    ui.host.querySelector('.workbench-error--overlay')?.remove();
    return;
  }
  const definition = TOOL_DEFINITIONS[tool];
  const previous = activeEntry;
  let entry = null;
  let loading = null;

  document.body.classList.add('is-tool-changing');
  ui.host.setAttribute('aria-busy', 'true');
  setNavigationState(tool, true);

  try {
    entry = await getEntry(tool);
    await waitForStyles(tool);

    parkEntry(previous);
    document.body.dataset.activeTool = tool;
    attachEntry(entry);

    if (!entry.initialized) {
      loading = loadingView(definition.title);
      ui.host.append(loading);
      await initializeEntry(entry);
      loading.remove();
    }

    activeTool = tool;
    activeEntry = entry;
    const main = entry.node.querySelector(definition.main);
    ui.skipLink.href = `#${main.id}`;
    document.title = `${currentProject?.displayName ?? 'Bedrock Add-ons'} / ${definition.title}`;
    setNavigationState(tool, false);
    ui.host.setAttribute('aria-busy', 'false');
    document.body.classList.remove('is-tool-changing');

    if (!fromHistory) {
      const method = replace ? 'replaceState' : 'pushState';
      window.history[method]({ tool }, '', toolUrl(tool));
    }
    announce(`${definition.title} aberto sem recarregar a página.`);
    window.dispatchEvent(new CustomEvent('aspergillum:toolchange', { detail: { tool } }));
  } catch (error) {
    console.error(error);
    loading?.remove();
    if (entry && entry !== previous) parkEntry(entry);

    const failure = errorView(definition, error);
    if (previous) {
      setActiveStyles(previous.definition.id);
      document.body.dataset.activeTool = previous.definition.id;
      attachEntry(previous);
      failure.classList.add('workbench-error--overlay');
      ui.host.append(failure);
      activeTool = previous.definition.id;
      activeEntry = previous;
      setNavigationState(previous.definition.id, false);
    } else {
      setActiveStyles(tool);
      document.body.dataset.activeTool = tool;
      ui.runtimeSlot.textContent = 'Falha ao abrir ferramenta';
      ui.actionsSlot.replaceChildren();
      ui.host.replaceChildren(failure);
      activeTool = null;
      activeEntry = null;
      setNavigationState(tool, false);
    }
    ui.host.setAttribute('aria-busy', 'false');
    document.body.classList.remove('is-tool-changing');
    announce(`Falha ao abrir ${definition.title}.`);
  }
}

function requestNavigation(tool, options = {}) {
  pendingNavigation = { tool, options };
  if (!navigationDrain) {
    navigationDrain = (async () => {
      while (pendingNavigation) {
        const request = pendingNavigation;
        pendingNavigation = null;
        await navigate(request.tool, request.options);
      }
    })().finally(() => { navigationDrain = null; });
  }
  return navigationDrain;
}

for (const link of ui.links) {
  link.addEventListener('click', (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    requestNavigation(link.dataset.toolLink);
  });
  const preload = () => { fetchToolDocument(TOOL_DEFINITIONS[link.dataset.toolLink]).catch(() => {}); };
  link.addEventListener('pointerenter', preload, { once: true });
  link.addEventListener('focus', preload, { once: true });
}

window.addEventListener('popstate', async () => {
  const requestedProject = new URL(window.location.href).searchParams.get('addon');
  if (requestedProject) {
    currentProject = await setSelectedProject(requestedProject, { updateHistory: false }).catch(() => currentProject);
    if (currentProject) updateProjectHeader(currentProject);
  }
  requestNavigation(toolFromLocation(), { fromHistory: true });
});
window.addEventListener('keydown', (event) => {
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const tool = { Digit1: 'model', Digit2: 'bedrock', Digit3: 'avatar' }[event.code];
  if (!tool) return;
  event.preventDefault();
  requestNavigation(tool);
});

function updateProjectHeader(project) {
  currentProject = project;
  ui.projectSelect.value = project.id;
  ui.projectEyebrow.textContent = `${project.displayName.toUpperCase()} / DEV`;
  ui.projectVersion.textContent = project.currentLabel;
  ui.projectVersion.title = `Versão de referência do ${project.displayName}`;
}

async function bootstrap() {
  const workspace = await loadAssetWorkspace();
  ui.projectSelect.innerHTML = workspace.projects.map((project) => (
    `<option value="${project.id}">${project.displayName}</option>`
  )).join('');
  ui.projectSelect.disabled = workspace.projects.length < 2;
  currentProject = await getSelectedProject();
  await setSelectedProject(currentProject.id);
  updateProjectHeader(currentProject);
  ui.projectSelect.addEventListener('change', async () => {
    ui.projectSelect.disabled = true;
    try {
      const project = await setSelectedProject(ui.projectSelect.value);
      updateProjectHeader(project);
      document.title = `${project.displayName} / ${activeEntry?.definition.title ?? 'Developer Workbench'}`;
      announce(`${project.displayName} selecionado. Recarregando o contexto das ferramentas.`);
    } finally {
      ui.projectSelect.disabled = workspace.projects.length < 2;
    }
  });
  await requestNavigation(toolFromLocation(), { replace: true });
}

bootstrap().catch((error) => {
  console.error(error);
  ui.runtimeSlot.textContent = 'Falha ao carregar workspace de add-ons';
  ui.host.replaceChildren(errorView(TOOL_DEFINITIONS.model, error));
  ui.host.setAttribute('aria-busy', 'false');
});
