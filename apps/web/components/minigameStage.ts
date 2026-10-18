// Low-poly arena dressing for the two mini-games. Original geometry only.
// The VRM itself stays the one CompanionCanvas already loaded.

import * as THREE from 'three';
import type { MiniGameView } from '../lib/minigames';

const KEY = 'amojiMiniStage';

interface Stage {
  group: THREE.Group;
  pad: THREE.Group;
  lane: THREE.Group;
  marker: THREE.Group;
  boxes: THREE.Mesh[];
}

function std(color: number, opacity = 1): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.92,
    metalness: 0,
    transparent: opacity < 1,
    opacity,
  });
}

function build(scene: THREE.Scene): Stage {
  const group = new THREE.Group();
  group.name = 'minigame-stage';

  const pad = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), std(0xb7e4c7));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  pad.add(floor);
  const rim = new THREE.Mesh(new THREE.RingGeometry(3.85, 4.05, 48), std(0x95d5b2));
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = -0.015;
  pad.add(rim);
  const wallMat = std(0xd8f3dc, 0.45);
  const wallGeo = new THREE.BoxGeometry(8.2, 0.38, 0.12);
  const walls: Array<[number, number, number]> = [
    [0, 4.06, 0],
    [0, -4.06, 0],
  ];
  for (const [x, z] of walls) {
    const w = new THREE.Mesh(wallGeo, wallMat);
    w.position.set(x, 0.16, z);
    pad.add(w);
  }
  const wallGeoZ = new THREE.BoxGeometry(0.12, 0.38, 8.2);
  for (const x of [4.06, -4.06]) {
    const w = new THREE.Mesh(wallGeoZ, wallMat);
    w.position.set(x, 0.16, 0);
    pad.add(w);
  }
  group.add(pad);

  const lane = new THREE.Group();
  const road = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 36), std(0x2b2d42));
  road.rotation.x = -Math.PI / 2;
  road.position.y = -0.02;
  lane.add(road);
  const stripeMat = std(0xf8f7ff, 0.85);
  for (const x of [-0.625, 0.625]) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 36), stripeMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(x, -0.01, 0);
    lane.add(stripe);
  }
  group.add(lane);

  const marker = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.34, 24), std(0xffe66d));
  ring.rotation.x = -Math.PI / 2;
  marker.add(ring);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 12), std(0xfff3bf));
  arrow.rotation.x = Math.PI / 2;
  arrow.position.set(0, 0.06, 0.28);
  marker.add(arrow);
  group.add(marker);

  const boxes: THREE.Mesh[] = [];
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const colors = [0xf4a261, 0xe9c46a, 0xe76f51, 0x90be6d];
  for (let i = 0; i < 16; i++) {
    const mesh = new THREE.Mesh(boxGeo, std(colors[i % colors.length]!));
    mesh.visible = false;
    mesh.castShadow = false;
    group.add(mesh);
    boxes.push(mesh);
  }

  scene.add(group);
  return { group, pad, lane, marker, boxes };
}

export function updateMiniGameStage(scene: THREE.Scene, view: MiniGameView | null): void {
  const existing = scene.userData[KEY] as Stage | undefined;
  if (!view) {
    if (existing) existing.group.visible = false;
    return;
  }
  const stage = existing ?? build(scene);
  if (!existing) scene.userData[KEY] = stage;
  stage.group.visible = true;
  const tag = view.kind === 'tag';
  stage.pad.visible = tag;
  stage.lane.visible = !tag;
  if (!tag) stage.lane.position.z = view.vrmZ;
  if (view.marker) {
    stage.marker.visible = true;
    stage.marker.position.set(view.marker.x, 0.04, view.marker.z);
    stage.marker.rotation.y = view.marker.yaw;
  } else {
    stage.marker.visible = false;
  }
  for (let i = 0; i < stage.boxes.length; i++) {
    const mesh = stage.boxes[i]!;
    const o = view.obstacles[i];
    if (!o) {
      mesh.visible = false;
      continue;
    }
    mesh.visible = true;
    mesh.position.set(o.x, o.h / 2, o.z);
    mesh.scale.set(o.w, o.h, o.d);
  }
}

export function disposeMiniGameStage(scene: THREE.Scene): void {
  const stage = scene.userData[KEY] as Stage | undefined;
  if (!stage) return;
  stage.group.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) m.dispose();
  });
  stage.group.removeFromParent();
  delete scene.userData[KEY];
}
