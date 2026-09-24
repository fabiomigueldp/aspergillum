const WORKSPACE_PATH = 'asset-library/workspace.json';
const STORAGE_KEY = 'bedrock-workbench.project';
const PROJECT_EVENT = 'bedrock-workbench:projectchange';

let workspacePromise = null;
let selectedProjectId = null;

function normalizedProjectId(value) {
  return String(value ?? '').trim().toLowerCase();
}

function queryProjectId() {
  return normalizedProjectId(new URL(window.location.href).searchParams.get('addon'));
}

function storedProjectId() {
  try {
    return normalizedProjectId(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return '';
  }
}

function projectExists(workspace, projectId) {
  return workspace.projects.some(({ id }) => id === projectId);
}

export async function loadAssetWorkspace() {
  if (!workspacePromise) {
    workspacePromise = fetch(new URL(`./${WORKSPACE_PATH}`, document.baseURI)).then(async (response) => {
      if (!response.ok) throw new Error(`Workspace de assets indisponível (${response.status}).`);
      const workspace = await response.json();
      if (!Array.isArray(workspace.projects) || !workspace.projects.length) {
        throw new Error('Workspace de assets não contém projetos registrados.');
      }
      const requested = queryProjectId() || storedProjectId();
      selectedProjectId = projectExists(workspace, requested)
        ? requested
        : workspace.defaultProjectId ?? workspace.projects[0].id;
      return workspace;
    });
  }
  return workspacePromise;
}

export async function getSelectedProject() {
  const workspace = await loadAssetWorkspace();
  return workspace.projects.find(({ id }) => id === selectedProjectId) ?? workspace.projects[0];
}

export function getSelectedProjectId() {
  return selectedProjectId;
}

export function projectAssetUrl(relativePath, projectId = selectedProjectId) {
  if (!projectId) throw new Error('Projeto de assets ainda não foi selecionado.');
  const normalized = String(relativePath ?? '').replaceAll('\\', '/').replace(/^\/+/, '');
  return new URL(`./asset-library/projects/${projectId}/${normalized}`, document.baseURI).href;
}

export async function setSelectedProject(projectId, { updateHistory = true } = {}) {
  const workspace = await loadAssetWorkspace();
  const normalized = normalizedProjectId(projectId);
  const project = workspace.projects.find(({ id }) => id === normalized);
  if (!project) throw new Error(`Add-on não registrado no workspace: ${projectId}`);
  const changed = selectedProjectId !== project.id;
  selectedProjectId = project.id;
  try { window.localStorage.setItem(STORAGE_KEY, project.id); } catch { /* armazenamento opcional */ }
  if (updateHistory) {
    const url = new URL(window.location.href);
    url.searchParams.set('addon', project.id);
    window.history.replaceState({ ...window.history.state, addon: project.id }, '', url);
  }
  if (changed) window.dispatchEvent(new CustomEvent(PROJECT_EVENT, { detail: { project, workspace } }));
  return project;
}

export function onSelectedProjectChange(listener) {
  const handler = (event) => listener(event.detail.project, event.detail.workspace);
  window.addEventListener(PROJECT_EVENT, handler);
  return () => window.removeEventListener(PROJECT_EVENT, handler);
}

export { PROJECT_EVENT, STORAGE_KEY, WORKSPACE_PATH };
