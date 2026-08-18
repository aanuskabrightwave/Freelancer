import * as THREE from "three";

function createNoiseTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const val = Math.floor(Math.random() * 255);
      data[i] = val;     // R
      data[i + 1] = val; // G
      data[i + 2] = val; // B
      data[i + 3] = 255; // A
    }
    ctx.putImageData(imgData, 0, 0);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createLensTextTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, 512, 64);
    ctx.fillStyle = "#888888";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 32);
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export function createProceduralCamera(): THREE.Group {
  const cameraGroup = new THREE.Group();

  // --- 1. Sub-Groups for Exploded Animation ---
  const bodyGroup = new THREE.Group();
  const gripGroup = new THREE.Group();
  const viewfinderGroup = new THREE.Group();
  const controlsGroup = new THREE.Group();
  const mountGroup = new THREE.Group();
  const barrelGroup = new THREE.Group();
  const apertureGroup = new THREE.Group();
  const glassGroup = new THREE.Group();

  // --- 2. Dynamic Texture Map Generators ---
  const noiseTex = createNoiseTexture(256);
  noiseTex.repeat.set(4, 4);

  const gripTex = createNoiseTexture(256);
  gripTex.repeat.set(16, 16);

  const lensTextTex = createLensTextTexture("CREATIVE MARKET CO.  F/1.4 50mm  NANO AR");

  // --- 3. Advanced PBR Materials ---
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x161616,
    roughness: 0.5,
    metalness: 0.25,
    bumpMap: noiseTex,
    bumpScale: 0.003,
  });

  const gripMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f0f0f,
    roughness: 0.75,
    metalness: 0.1,
    bumpMap: gripTex,
    bumpScale: 0.008,
  });

  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.2,
    metalness: 0.95,
  });

  const accentMetalMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a,
    roughness: 0.25,
    metalness: 0.9,
  });

  const redButtonMaterial = new THREE.MeshStandardMaterial({
    color: 0xe62e2e,
    roughness: 0.3,
    metalness: 0.6,
  });

  const lensGlassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x051e28,
    transparent: true,
    opacity: 0.85,
    transmission: 0.95,
    ior: 1.52,
    roughness: 0.02,
    metalness: 0.1,
    thickness: 0.4,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
  });

  const innerGlassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x1a0528,
    transparent: true,
    opacity: 0.9,
    transmission: 0.9,
    ior: 1.6,
    roughness: 0.05,
    clearcoat: 0.8,
  });

  const innerLensMaterial = new THREE.MeshStandardMaterial({
    color: 0x030303,
    roughness: 0.95,
    metalness: 0.0,
  });

  // --- 4. Populate Body Group ---
  const bodyGeo = new THREE.BoxGeometry(2.3, 1.45, 0.76);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMaterial);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  bodyGroup.add(bodyMesh);

  const baseGeo = new THREE.BoxGeometry(2.3, 0.08, 0.8);
  const basePlate = new THREE.Mesh(baseGeo, accentMetalMaterial);
  basePlate.position.y = -0.73;
  bodyGroup.add(basePlate);

  const topCoverGeo = new THREE.BoxGeometry(2.3, 0.08, 0.78);
  const topCover = new THREE.Mesh(topCoverGeo, accentMetalMaterial);
  topCover.position.y = 0.73;
  bodyGroup.add(topCover);

  // --- 5. Populate Grip Group ---
  const gripGeo = new THREE.BoxGeometry(0.58, 1.34, 0.86);
  const grip = new THREE.Mesh(gripGeo, gripMaterial);
  grip.position.set(1.08, -0.05, 0.08);
  grip.castShadow = true;
  gripGroup.add(grip);

  // --- 6. Populate Viewfinder Group ---
  const viewfinderGeo = new THREE.BoxGeometry(0.55, 0.35, 0.55);
  const viewfinder = new THREE.Mesh(viewfinderGeo, bodyMaterial);
  viewfinder.position.set(0, 0.9, -0.05);
  viewfinder.castShadow = true;
  viewfinderGroup.add(viewfinder);

  const viewfinderBevelGeo = new THREE.BoxGeometry(0.55, 0.15, 0.4);
  const viewfinderBevel = new THREE.Mesh(viewfinderBevelGeo, bodyMaterial);
  viewfinderBevel.position.set(0, 1.05, -0.125);
  viewfinderBevel.rotation.x = -Math.PI / 6;
  viewfinderGroup.add(viewfinderBevel);

  const hotShoeGeo = new THREE.BoxGeometry(0.38, 0.04, 0.38);
  const hotShoe = new THREE.Mesh(hotShoeGeo, metalMaterial);
  hotShoe.position.set(0, 1.1, -0.05);
  viewfinderGroup.add(hotShoe);

  // --- 7. Populate Controls Group ---
  const dialGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.12, 32);
  const dial1 = new THREE.Mesh(dialGeo, metalMaterial);
  dial1.position.set(0.75, 0.82, 0.08);
  controlsGroup.add(dial1);

  const dial2 = new THREE.Mesh(dialGeo, bodyMaterial);
  dial2.position.set(1.05, 0.82, 0.12);
  controlsGroup.add(dial2);

  const notchGeo = new THREE.CylinderGeometry(0.245, 0.245, 0.11, 32);
  const notch = new THREE.Mesh(notchGeo, gripMaterial);
  notch.position.set(0.75, 0.82, 0.08);
  controlsGroup.add(notch);

  const shutterBaseGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.06, 24);
  const shutterBase = new THREE.Mesh(shutterBaseGeo, accentMetalMaterial);
  shutterBase.position.set(1.08, 0.78, 0.28);
  controlsGroup.add(shutterBase);

  const shutterGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.08, 24);
  const shutter = new THREE.Mesh(shutterGeo, metalMaterial);
  shutter.position.set(1.08, 0.82, 0.28);
  controlsGroup.add(shutter);

  const recordGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.04, 16);
  const recordBtn = new THREE.Mesh(recordGeo, redButtonMaterial);
  recordBtn.position.set(0.5, 0.81, 0.24);
  controlsGroup.add(recordBtn);

  // --- 8. Populate Mount Group (Offset to front face relative to body Z=0.38) ---
  const mountBaseGroup = new THREE.Group();
  mountBaseGroup.position.set(0, -0.05, 0.38);

  const mountGeo = new THREE.CylinderGeometry(0.74, 0.74, 0.08, 48);
  const mount = new THREE.Mesh(mountGeo, metalMaterial);
  mount.rotation.x = Math.PI / 2;
  mount.position.z = 0.04;
  mountBaseGroup.add(mount);

  const releaseBtnGeo = new THREE.BoxGeometry(0.12, 0.12, 0.06);
  const releaseBtn = new THREE.Mesh(releaseBtnGeo, metalMaterial);
  releaseBtn.position.set(0.82, -0.25, 0.04);
  mountBaseGroup.add(releaseBtn);
  
  mountGroup.add(mountBaseGroup);

  // --- 9. Populate Barrel Group ---
  const barrelBaseGroup = new THREE.Group();
  barrelBaseGroup.position.set(0, -0.05, 0.38);

  const barrelGeo = new THREE.CylinderGeometry(0.68, 0.68, 1.25, 48);
  const barrel = new THREE.Mesh(barrelGeo, bodyMaterial);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.665;
  barrel.castShadow = true;
  barrel.receiveShadow = true;
  barrelBaseGroup.add(barrel);

  const metalRingGeo = new THREE.CylinderGeometry(0.685, 0.685, 0.04, 48);
  const metalRing = new THREE.Mesh(metalRingGeo, metalMaterial);
  metalRing.rotation.x = Math.PI / 2;
  metalRing.position.z = 0.15;
  barrelBaseGroup.add(metalRing);

  const focusRingGeo = new THREE.CylinderGeometry(0.69, 0.69, 0.35, 48);
  const focusRing = new THREE.Mesh(focusRingGeo, gripMaterial);
  focusRing.rotation.x = Math.PI / 2;
  focusRing.position.z = 0.52;
  barrelBaseGroup.add(focusRing);

  const zoomRingGeo = new THREE.CylinderGeometry(0.69, 0.69, 0.22, 48);
  const zoomRing = new THREE.Mesh(zoomRingGeo, gripMaterial);
  zoomRing.rotation.x = Math.PI / 2;
  zoomRing.position.z = 0.95;
  barrelBaseGroup.add(zoomRing);

  barrelGroup.add(barrelBaseGroup);

  // --- 10. Populate Aperture Group ---
  const apertureBaseGroup = new THREE.Group();
  apertureBaseGroup.position.set(0, -0.05, 0.38);

  const innerGeo = new THREE.CylinderGeometry(0.56, 0.56, 0.05, 32);
  const inner = new THREE.Mesh(innerGeo, innerLensMaterial);
  inner.rotation.x = Math.PI / 2;
  inner.position.z = 1.25;
  apertureBaseGroup.add(inner);

  const apertureGeo = new THREE.TorusGeometry(0.35, 0.05, 8, 24);
  const apertureMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a,
    roughness: 0.95,
    metalness: 0.0,
  });
  const aperture = new THREE.Mesh(apertureGeo, apertureMat);
  aperture.position.z = 1.12;
  apertureBaseGroup.add(aperture);

  apertureGroup.add(apertureBaseGroup);

  // --- 11. Populate Glass Group ---
  const glassBaseGroup = new THREE.Group();
  glassBaseGroup.position.set(0, -0.05, 0.38);

  const rimTextGeo = new THREE.CylinderGeometry(0.682, 0.682, 0.08, 48);
  const rimTextMat = new THREE.MeshStandardMaterial({
    map: lensTextTex,
    roughness: 0.4,
    metalness: 0.1,
  });
  const rimText = new THREE.Mesh(rimTextGeo, rimTextMat);
  rimText.rotation.x = Math.PI / 2;
  rimText.position.z = 1.15;
  glassBaseGroup.add(rimText);

  const deepGlassGeo = new THREE.SphereGeometry(0.32, 24, 24, 0, Math.PI * 2, 0, Math.PI / 3);
  const deepGlass = new THREE.Mesh(deepGlassGeo, innerGlassMaterial);
  deepGlass.rotation.x = Math.PI / 2;
  deepGlass.position.set(0, 0, 1.02);
  glassBaseGroup.add(deepGlass);

  const glassGeo = new THREE.SphereGeometry(0.54, 32, 32, 0, Math.PI * 2, 0, Math.PI / 4);
  const glass = new THREE.Mesh(glassGeo, lensGlassMaterial);
  glass.rotation.x = Math.PI / 2;
  glass.position.set(0, 0, 1.16);
  glassBaseGroup.add(glass);

  glassGroup.add(glassBaseGroup);

  // --- 12. Add to Camera Root Group ---
  cameraGroup.add(bodyGroup);
  cameraGroup.add(gripGroup);
  cameraGroup.add(viewfinderGroup);
  cameraGroup.add(controlsGroup);
  cameraGroup.add(mountGroup);
  cameraGroup.add(barrelGroup);
  cameraGroup.add(apertureGroup);
  cameraGroup.add(glassGroup);

  // Attach named references for external GSAP manipulation
  cameraGroup.userData.explodedParts = {
    bodyGroup,
    gripGroup,
    viewfinderGroup,
    controlsGroup,
    mountGroup,
    barrelGroup,
    apertureGroup,
    glassGroup,
  };

  // Scale cameraGroup slightly down to fit scene coordinates nicely
  cameraGroup.scale.set(1.2, 1.2, 1.2);

  return cameraGroup;
}
