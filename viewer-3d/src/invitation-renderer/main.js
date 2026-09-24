import * as THREE from 'three';
import { AvatarScene } from '../avatar-lab/avatar-scene.js';
import { bedrockAnimationRotation, findBoneGroup } from '../shared/bedrock-geometry.js';
import './styles.css';

const RENDERER_VERSION = 3;

const ui = {
  art: document.querySelector('#invitation-art'),
  stage: document.querySelector('#avatar-stage'),
  canvas: document.querySelector('#avatar-canvas'),
  title: document.querySelector('#invitation-title'),
  first: document.querySelector('#title-first'),
  second: document.querySelector('#title-second'),
  celebrant: document.querySelector('#invitation-celebrant'),
  details: document.querySelector('#invitation-details'),
  feast: document.querySelector('#invitation-feast'),
  venue: document.querySelector('#invitation-venue'),
  time: document.querySelector('#invitation-time'),
  status: document.querySelector('#render-status'),
};

const api = {
  version: RENDERER_VERSION,
  ready: false,
  error: null,
  metadata: null,
};

window.__BEDROCK_INVITATION_RENDERER__ = api;

function readConfig() {
  const params = new URLSearchParams(window.location.search);
  const title = (params.get('title') ?? 'PRIMÍCIAS SACERDOTAIS').trim().replace(/\s+/g, ' ');
  const requestedEquipment = params.get('equipment') ?? 'barretepadre';
  const bareAvatar = requestedEquipment.toLowerCase() === 'none';
  const feast = (params.get('feast') ?? '').trim().replace(/\s+/g, ' ');
  const venue = (params.get('venue') ?? '').trim().replace(/\s+/g, ' ');
  const time = (params.get('time') ?? '').trim().replace(/\s+/g, ' ');
  const celebrant = (params.get('celebrant') ?? '').trim().replace(/\s+/g, ' ');
  const [first, ...remaining] = title.split(' ');
  return Object.freeze({
    title,
    first,
    second: remaining.join(' '),
    addon: params.get('addon') ?? 'ornatum',
    equipment: bareAvatar ? null : requestedEquipment,
    loaderEquipment: bareAvatar ? 'barretepadre' : requestedEquipment,
    bareAvatar,
    feast,
    venue,
    time,
    celebrant,
  });
}

function addAuthoredRotation(group, authoredRotation) {
  if (!group) return;
  const rotation = bedrockAnimationRotation(authoredRotation, 'third');
  group.rotation.x += THREE.MathUtils.degToRad(rotation[0]);
  group.rotation.y += THREE.MathUtils.degToRad(rotation[1]);
  group.rotation.z += THREE.MathUtils.degToRad(rotation[2]);
}

function setCeremonialText(element, value, preferredBreak) {
  element.replaceChildren();
  if (!value) return;
  const breakIndex = preferredBreak(value);
  if (breakIndex <= 0 || breakIndex >= value.length) {
    element.textContent = value;
    return;
  }
  element.append(
    document.createTextNode(value.slice(0, breakIndex).trim()),
    document.createElement('br'),
    document.createTextNode(value.slice(breakIndex).trim()),
  );
}

function setFeastText(element, value) {
  element.replaceChildren();
  if (!value) return;

  const prefixMatch = value.match(/^Festa de\s+/i);
  const kicker = prefixMatch ? prefixMatch[0].trim() : '';
  const name = prefixMatch ? value.slice(prefixMatch[0].length).trim() : value;
  const kickerElement = document.createElement('span');
  kickerElement.className = 'feast-kicker';
  kickerElement.textContent = kicker;

  const nameElement = document.createElement('span');
  nameElement.className = 'feast-name';
  const comma = name.indexOf(',');
  if (comma >= 0) {
    nameElement.append(
      document.createTextNode(name.slice(0, comma + 1).trim()),
      document.createElement('br'),
      document.createTextNode(name.slice(comma + 1).trim()),
    );
  } else {
    nameElement.textContent = name;
  }

  if (kicker) element.append(kickerElement);
  element.append(nameElement);
}

function createHost() {
  const group = new THREE.Group();
  group.name = 'invitation-host';

  const edgeMaterial = new THREE.MeshStandardMaterial({
    color: 0xb6a88e,
    roughness: 0.92,
    metalness: 0,
  });
  const faceMaterial = new THREE.MeshStandardMaterial({
    color: 0xdfd3bb,
    roughness: 0.86,
    metalness: 0,
  });
  const reliefMaterial = new THREE.MeshStandardMaterial({
    color: 0xbba98a,
    roughness: 0.94,
    metalness: 0,
  });

  const wafer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.145, 0.145, 0.022, 32),
    [edgeMaterial, faceMaterial, faceMaterial],
  );
  wafer.rotation.x = Math.PI / 2;
  group.add(wafer);

  const vertical = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.105, 0.006), reliefMaterial);
  const horizontal = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.012, 0.006), reliefMaterial);
  vertical.position.z = 0.014;
  horizontal.position.set(0, 0.012, 0.014);
  group.add(vertical, horizontal);

  group.position.set(0, 1.37, 0.51);
  group.rotation.y = THREE.MathUtils.degToRad(-2);
  group.userData.materials = [edgeMaterial, faceMaterial, reliefMaterial];
  return group;
}

function configureInvitationLighting(scene) {
  scene.renderer.toneMappingExposure = 0.86;
  scene.scene.environmentIntensity = 0.18;

  for (const light of scene.scene.children) {
    if (light.isHemisphereLight) {
      light.color.setHex(0xd8d0c1);
      light.groundColor.setHex(0x211e1b);
      light.intensity = 0.9;
      continue;
    }

    if (!light.isDirectionalLight) continue;

    if (light.position.z < 0) {
      light.color.setHex(0xd7ac78);
      light.intensity = 0.3;
    } else if (light.position.x < 0) {
      light.color.setHex(0xbcc5c3);
      light.intensity = 0.28;
    } else {
      light.color.setHex(0xffe4c4);
      light.intensity = 1.65;
    }
  }
}

function applyInvitationPose(scene, bareAvatar) {
  scene.applyPose();

  const rightArm = findBoneGroup(scene.playerBuilt, 'rightArm');
  const leftArm = findBoneGroup(scene.playerBuilt, 'leftArm');
  const head = findBoneGroup(scene.playerBuilt, 'head');

  addAuthoredRotation(rightArm, [-66, -4, -46]);
  addAuthoredRotation(leftArm, [-66, 4, 46]);
  addAuthoredRotation(head, [7, 0, 0]);

  scene.platform.visible = false;
  scene.grid.visible = false;
  if (bareAvatar) {
    for (const { mesh } of scene.itemBuilt?.meshRecords ?? []) mesh.visible = false;
  }
  configureInvitationLighting(scene);

  const host = createHost();
  scene.scene.add(host);
  scene.scene.updateMatrixWorld(true);

  scene.camera.fov = 27;
  scene.camera.up.set(0, 1, 0);
  scene.frameBounds(scene.getVisibleBounds(), [0.17, 0.09, 1], 1.12);
  scene.controls.target.y += 0.035;
  scene.camera.position.y += 0.035;
  scene.camera.lookAt(scene.controls.target);
  scene.camera.updateProjectionMatrix();
  scene.render(true);

  return { host };
}

async function initialize() {
  const config = readConfig();
  ui.first.textContent = config.first;
  ui.second.textContent = config.second;
  ui.title.setAttribute('aria-label', config.title);
  ui.art.setAttribute('aria-label', config.title);
  ui.celebrant.textContent = config.celebrant;
  ui.celebrant.hidden = !config.celebrant;
  setFeastText(ui.feast, config.feast);
  setCeremonialText(ui.venue, config.venue, (value) => {
    if (value.length < 24) return -1;
    return value.lastIndexOf(' de ') + 1;
  });
  ui.time.textContent = config.time;
  ui.details.hidden = !(config.feast || config.venue || config.time);

  const scene = new AvatarScene({
    canvas: ui.canvas,
    stage: ui.stage,
    onStatus: ({ message }) => {
      ui.status.textContent = message;
    },
  });

  await scene.initialize();
  const configured = await scene.configureCapture({
    equipment: config.loaderEquipment,
    model: 'wide',
    action: 'idle',
    perspective: 'third',
    material: 'classic',
    outerLayers: true,
    transparent: true,
    grid: false,
    pivots: false,
    wireframe: false,
  });

  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  scene.resize();
  const additions = applyInvitationPose(scene, config.bareAvatar);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  scene.render(true);

  api.metadata = {
    config,
    renderer: {
      version: RENDERER_VERSION,
      source: 'AvatarScene',
      geometry: config.bareAvatar ? null : configured.runtime.geometry,
      equipment: config.equipment,
      equipmentLabel: config.bareAvatar ? 'Sem barrete' : configured.runtime.equipmentLabel,
      binding: config.bareAvatar ? null : configured.runtime.binding,
      profile: configured.runtime.profile,
    },
    pose: {
      rightArm: [-66, -4, -46],
      leftArm: [-66, 4, 46],
      head: [7, 0, 0],
      host: [0, 1.37, 0.51],
    },
    typography: {
      family: 'Centaur',
      treatment: 'flat roman capitals',
      details: config.feast || config.venue || config.time
        ? 'large feast, supporting venue and isolated time'
        : null,
    },
    lighting: {
      exposure: 0.86,
      environmentIntensity: 0.18,
      hemisphere: 0.9,
      key: 1.65,
      fill: 0.28,
      rim: 0.3,
    },
  };
  api.scene = scene;
  api.additions = additions;
  document.body.classList.add('is-ready');
  ui.status.textContent = 'Composição pronta';
  api.ready = true;
}

initialize().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(error);
  api.error = message;
  ui.status.textContent = `Falha ao montar a composição: ${message}`;
  document.body.classList.add('has-error');
});
