// ============================================================
// DRAW 3D: a second camera, using Three.js. Like draw.js, it only
// READS the game. physics.js has no idea which camera is on.
//
// Table spots are (x, y) on a flat table. In 3D the table lies on
// the floor, so table y becomes 3D z (depth), and 3D y means UP.
// ============================================================

let world3D = null;  // everything 3D, built the first time we draw

// Table spot (x, y) -> 3D floor spot, with the table's middle at 0.
function floorX(x) { return x - TABLE.width / 2; }
function floorZ(y) { return y - TABLE.height / 2; }

// A shiny material. "glow" makes it light up on its own, like neon.
function material3D(color, glow = 0x000000) {
  return new THREE.MeshStandardMaterial({ color: color, emissive: glow, metalness: 0.3, roughness: 0.5 });
}

// Build the whole 3D table once, from the same layout the 2D camera uses.
function build3D() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(pixelDensity());
  renderer.setSize(TABLE.width, TABLE.height, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05000a);

  // The camera stands past the near end, up high, looking down the table.
  const camera = new THREE.PerspectiveCamera(CAMERA_3D.fov, TABLE.width / TABLE.height, 1, 5000);
  camera.position.set(0, CAMERA_3D.height, TABLE.height / 2 + CAMERA_3D.back);
  camera.lookAt(0, 0, CAMERA_3D.lookAhead);

  scene.add(new THREE.AmbientLight(0x8080c0, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(-200, 800, 400);
  scene.add(sun);

  // The table surface.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(TABLE.width, TABLE.height), material3D(0x1a0d33));
  floor.rotation.x = -Math.PI / 2;  // lay it flat
  scene.add(floor);

  // Walls: a thin glowing box along each wall line.
  const wallMaterial = material3D(0x00f0ff, 0x005566);
  for (const wall of WALLS) {
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    const box = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(dx, dy), 20, 4), wallMaterial);
    box.position.set(floorX((wall.x1 + wall.x2) / 2), 10, floorZ((wall.y1 + wall.y2) / 2));
    box.rotation.y = -Math.atan2(dy, dx);
    scene.add(box);
  }

  // Dead-end tubes: a patch on the floor that lights up.
  const tubePatches = tubes.map((tube) => {
    const t = tube.layout;
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(t.right - t.left, t.bottom - t.top), material3D(0x281440));
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(floorX((t.left + t.right) / 2), 0.5, floorZ((t.top + t.bottom) / 2));
    scene.add(patch);
    return patch;
  });

  // Bumpers: navy posts with a yellowish ring on top.
  const bumperMeshes = bumpers.map((bumper) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(BUMPER_RADIUS, BUMPER_RADIUS, 24, 32), material3D(0x000080));
    post.position.set(floorX(bumper.layout.x), 12, floorZ(bumper.layout.y));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(BUMPER_RADIUS, 2.5, 8, 32), material3D(0xffb400, 0x664400));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 12;
    post.add(ring);
    scene.add(post);
    return post;
  });

  // Spinners: two crossed bars (4 arms) on a hub. The group turns.
  const spinnerGroups = spinners.map((spinner) => {
    const group = new THREE.Group();
    group.position.set(floorX(spinner.layout.x), 8, floorZ(spinner.layout.y));
    const armMaterial = material3D(0x00f0ff, 0x004455);
    group.add(new THREE.Mesh(new THREE.BoxGeometry(SPINNER_ARM * 2, 10, SPINNER_THICKNESS), armMaterial));
    group.add(new THREE.Mesh(new THREE.BoxGeometry(SPINNER_THICKNESS, 10, SPINNER_ARM * 2), armMaterial));
    group.add(new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 14, 16), material3D(0xffffff)));
    scene.add(group);
    return group;
  });

  // The moving target.
  const targetMesh = new THREE.Mesh(new THREE.BoxGeometry(TARGET.width, 16, TARGET.thickness), material3D(0x39ff14, 0x0a4400));
  targetMesh.position.set(0, 8, floorZ(TARGET.y));
  scene.add(targetMesh);

  // Flippers: a group sits on the pivot, and the paddle sticks out from it.
  const flipperGroups = flippers.map((flipper) => {
    const group = new THREE.Group();
    group.position.set(floorX(flipper.layout.x), 8, floorZ(flipper.layout.y));
    const paddle = new THREE.Mesh(new THREE.BoxGeometry(FLIPPER_LENGTH, 16, FLIPPER_THICKNESS), material3D(0xffdc00, 0x443300));
    paddle.position.x = FLIPPER_LENGTH / 2;  // so the group turns around one end
    group.add(paddle);
    scene.add(group);
    return group;
  });

  // The plunger. A 1-deep box we stretch to fill the lane below its top.
  const plungerMesh = new THREE.Mesh(new THREE.BoxGeometry(PLUNGER.x2 - PLUNGER.x1 - 8, 16, 1), material3D(0xffb400));
  scene.add(plungerMesh);

  // The ball: shiny silver. (Full metal would look black here, because
  // metal only reflects its surroundings, and our scene has nothing to reflect.)
  const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 32, 16),
    new THREE.MeshStandardMaterial({ color: 0xf0f0ff, emissive: 0x404050, metalness: 0.2, roughness: 0.2 }));
  scene.add(ballMesh);

  return { renderer, scene, camera, tubePatches, bumperMeshes, spinnerGroups,
           targetMesh, flipperGroups, plungerMesh, ballMesh };
}

// Every frame: move the 3D pieces to match the game, take a picture,
// and paste it onto the p5 canvas (so the score and screens draw on top).
function draw3D() {
  if (!world3D) world3D = build3D();
  const w = world3D;

  w.ballMesh.visible = !game.over;
  w.ballMesh.position.set(floorX(ball.x), BALL_RADIUS, floorZ(ball.y));

  // Angles turn from +x toward +y on the table, which is toward +z in 3D.
  // Three.js turns the other way around its up axis, so we flip the sign.
  flippers.forEach((flipper, i) => { w.flipperGroups[i].rotation.y = -flipper.angle; });
  spinners.forEach((spinner, i) => { w.spinnerGroups[i].rotation.y = -spinner.angle; });

  w.targetMesh.position.x = floorX(target.x);
  w.targetMesh.material.emissive.setHex(target.flashFrames > 0 ? 0xffffff : 0x0a4400);

  bumpers.forEach((bumper, i) => {
    w.bumperMeshes[i].material.emissive.setHex(bumper.flashFrames > 0 ? 0xffffff : 0x000000);
  });
  tubes.forEach((tube, i) => {
    w.tubePatches[i].material.color.setHex(tube.lit ? 0xff8c00 : 0x281440);
    w.tubePatches[i].material.emissive.setHex(tube.lit ? 0x663300 : 0x000000);
  });

  const top = plungerTopY();
  w.plungerMesh.scale.z = TABLE.height - top;
  w.plungerMesh.position.set(floorX((PLUNGER.x1 + PLUNGER.x2) / 2), 8, floorZ((top + TABLE.height) / 2));

  w.renderer.render(w.scene, w.camera);
  drawingContext.drawImage(w.renderer.domElement, 0, 0, TABLE.width, TABLE.height);
}
