// ============================================================
//  GOLD RUSH SIM - the game
//  Input -> Update -> Draw -> Repeat
//  All the dials are in data.js
// ============================================================
import { THREE, EffectComposer, RenderPass, UnrealBloomPass, OutputPass, Sky, mergeGeometries } from '../lib/three.bundle.js';
import { TUNING as T, UPGRADES, ITEMS, BIOMES, ZONE_SUFFIX } from './data.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const fmt = (n) => {
  n = Math.floor(n);
  if (n < 1e4) return n.toLocaleString();
  const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi'];
  let i = -1; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
  return n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0) + u[i];
};

// ============================================================
//  GAME STATE (the brain). Nothing in here knows about drawing.
// ============================================================
const SAVE_KEY = 'goldrush_save_v1', LB_KEY = 'goldrush_scores_v1', NAME_KEY = 'goldrush_name';
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: play without saving */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};
function newState(name) {
  return { name, money: T.START_MONEY, xp: 0, bag: {}, up: { tool: 0, luck: 0, bag: 0, stam: 0 },
    rations: T.START_RATIONS, food: 100, energy: 100, t: 0, zone: 1, found: [], x: 0, z: 30, h: Math.PI };
}
let S = newState('');
let mode = 'title';            // title | play | menu | dead
let panProg = 0, saveTimer = 0, lastDay = 1;

const ZONES = 50;
const xpNeed = (lvl) => Math.round(T.LEVEL_XP_BASE * Math.pow(T.LEVEL_XP_GROWTH, lvl - 1));
function levelInfo(xp) { let lvl = 1, need = xpNeed(1); while (xp >= need) { xp -= need; lvl++; need = xpNeed(lvl); } return { lvl, into: xp, need }; }
const zoneReq = (z) => 1 + (z - 1) * T.LEVELS_PER_ZONE;
const maxZone = (lvl) => Math.min(ZONES, 1 + Math.floor((lvl - 1) / T.LEVELS_PER_ZONE));
const zoneName = (z) => BIOMES[Math.floor((z - 1) / 5)].name + ' ' + ZONE_SUFFIX[(z - 1) % 5];
const itemValue = (i) => Math.ceil(T.ITEM_VALUE_BASE * Math.pow(T.ITEM_VALUE_GROWTH, i));
const itemXp = (i) => Math.ceil(T.ITEM_XP_BASE * Math.pow(T.ITEM_XP_GROWTH, i));
const cssCol = (i) => '#' + ITEMS[i][1].toString(16).padStart(6, '0');
const panTime = () => Math.max(0.35, T.PAN_TIME * Math.pow(0.88, S.up.tool));
const panEnergy = () => Math.max(1, T.PAN_ENERGY * Math.pow(0.9, S.up.stam));
const bagCap = () => 8 + 5 * S.up.bag;
const rareChance = () => Math.min(0.65, T.RARE_CHANCE + 0.035 * S.up.luck);
const emptyChance = () => Math.max(0.03, T.EMPTY_CHANCE - 0.012 * S.up.luck);
const bagCount = () => Object.values(S.bag).reduce((a, b) => a + b, 0);
const bagWorth = () => Object.entries(S.bag).reduce((a, [i, q]) => a + itemValue(+i) * q, 0);
const dayNow = () => Math.floor(S.t / T.DAY_LENGTH) + 1;
const rationPrice = (day = dayNow()) => Math.ceil(T.RATION_BASE_PRICE * Math.pow(T.FOOD_INFLATION, day - 1));
const upCost = (u) => Math.ceil(u.baseCost * Math.pow(u.growth, S.up[u.id]));
const tierName = (u, l) => l < u.tiers.length ? u.tiers[l] : u.tiers[u.tiers.length - 1] + ' +' + (l - u.tiers.length + 1);

function saveGame() { if (mode === 'play' || mode === 'menu') { S.x = player.position.x; S.z = player.position.z; S.h = heading; store.set(SAVE_KEY, S); } }

// ============================================================
//  SOUND (tiny synth, no files)
// ============================================================
let actx = null, muted = false, riverGain = null;
function initAudio() {
  if (actx) return;
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    const len = actx.sampleRate * 2, buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = actx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = actx.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 700; lp.Q.value = 0.4;
    riverGain = actx.createGain(); riverGain.gain.value = 0;
    src.connect(lp); lp.connect(riverGain); riverGain.connect(actx.destination); src.start();
  } catch (e) { actx = null; }
}
function beep(freq, dur = 0.12, type = 'sine', vol = 0.12, delay = 0) {
  if (!actx || muted) return;
  const o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
const sfx = {
  find: (rare) => { beep(rare ? 880 : 660, 0.15, 'triangle', 0.14); beep(rare ? 1320 : 990, 0.2, 'triangle', 0.12, 0.08); if (rare) beep(1760, 0.3, 'triangle', 0.1, 0.16); },
  empty: () => beep(160, 0.12, 'sawtooth', 0.05),
  coin: () => { beep(1200, 0.08, 'square', 0.06); beep(1600, 0.15, 'square', 0.06, 0.07); },
  buy: () => { beep(520, 0.1, 'triangle', 0.1); beep(780, 0.16, 'triangle', 0.1, 0.09); },
  eat: () => { beep(300, 0.08, 'sine', 0.12); beep(360, 0.08, 'sine', 0.12, 0.1); },
  level: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.22, 'triangle', 0.12, i * 0.1)),
  no: () => beep(140, 0.18, 'square', 0.05),
  dead: () => [392, 330, 262, 196].forEach((f, i) => beep(f, 0.4, 'sawtooth', 0.07, i * 0.25)),
};

// ============================================================
//  3D WORLD (the camera side). Reads the state, never changes it.
// ============================================================
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.62;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xbcd6ea, 0.0021);
const camera = new THREE.PerspectiveCamera(58, 1, 0.3, 4000);

let composer, bloom, quality = 1;
function setupComposer() {
  const pr = quality ? Math.min(window.devicePixelRatio, 1.5) : 1;
  renderer.setPixelRatio(pr);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  const rt = new THREE.WebGLRenderTarget(window.innerWidth * pr, window.innerHeight * pr, { type: THREE.HalfFloatType, samples: 4 });
  if (composer) composer.dispose();
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.5, 0.5, 2.4);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  renderer.shadowMap.enabled = !!quality;
}
window.addEventListener('resize', setupComposer);

// ---------- lights and sky ----------
const sky = new Sky(); sky.scale.setScalar(3000); scene.add(sky);
// keep the sky from being so bright that the glow effect washes out the whole screen
sky.material.fragmentShader = sky.material.fragmentShader.replace('gl_FragColor = vec4( texColor, 1.0 );', 'gl_FragColor = vec4( min(texColor, vec3(1.5)), 1.0 );');
const sun = new THREE.DirectionalLight(0xfff4e0, 3);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 400 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
scene.add(sun, sun.target);
const moon = new THREE.DirectionalLight(0x8fa8ff, 0); moon.position.set(60, 160, 80); scene.add(moon);
const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x6a5a40, 1); scene.add(hemi);
const starGeo = new THREE.BufferGeometry();
{ const p = []; for (let i = 0; i < 1800; i++) { const a = Math.random() * Math.PI * 2, e = Math.acos(Math.random()); p.push(Math.sin(e) * Math.cos(a) * 1400, Math.cos(e) * 1400 + 20, Math.sin(e) * Math.sin(a) * 1400); } starGeo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); }
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
scene.add(stars);

// ---------- noise and terrain shape ----------
function hash(x, y, s) { const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); }
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s) { let t = 0, a = 0.5, f = 1; for (let i = 0; i < 4; i++) { t += a * vnoise(x * f, y * f, s + i * 13); a *= 0.5; f *= 2; } return t; }
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const TOWN = { x: 0, z: 58, r: 32, y: 4 };
const WATER_Y = -0.35;
const BOUNDS = { x: 108, zMin: -42, zMax: 92 };
let biome = BIOMES[0], seed = 1;
const riverZ = (x) => 8 * Math.sin(x * 0.03) + 4 * Math.sin(x * 0.071 + 1.3);
function heightAt(x, z) {
  const d = Math.abs(z - riverZ(x));
  let h = -1.7 + 1.7 * sstep(2.5, 10, d) + 4 * sstep(10, 36, d);
  h += (fbm(x * 0.03, z * 0.03, seed) - 0.45) * biome.roll * sstep(14, 40, d);
  const far = Math.max(sstep(60, 210, d), sstep(115, 240, Math.abs(x)));
  h += far * (0.25 + fbm(x * 0.011, z * 0.011, seed + 50)) * biome.mtn;
  const tm = 1 - sstep(TOWN.r - 8, TOWN.r + 8, Math.hypot(x - TOWN.x, z - TOWN.z));
  return h * (1 - tm) + TOWN.y * tm;
}

// ---------- textures made in code ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
}
const grainTex = canvasTex(256, 256, (g, w, h) => {
  const im = g.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const v = 222 + Math.random() * 33; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
  g.putImageData(im, 0, 0);
}, 90);
const woodTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#b08a5a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${60 + Math.random() * 60},${35 + Math.random() * 40},15,${Math.random() * 0.18})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 20 + Math.random() * 80); }
  g.fillStyle = 'rgba(30,15,5,.55)'; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 2, h);
}, 0);
woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping; woodTex.repeat.set(2, 1);
const sparkTex = canvasTex(64, 64, (g) => {
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,240,180,.8)'); r.addColorStop(1, 'rgba(255,200,80,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
});

// ---------- terrain ----------
const terrainGeo = new THREE.PlaneGeometry(680, 680, 256, 256); terrainGeo.rotateX(-Math.PI / 2);
terrainGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(terrainGeo.attributes.position.count * 3), 3));
const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshStandardMaterial({ vertexColors: true, map: grainTex, roughness: 0.95, metalness: 0 }));
terrain.receiveShadow = true; scene.add(terrain);

// ---------- water (custom shader: moving waves, sky reflection, sun glitter, foam) ----------
const waterMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: {
    uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunColor: { value: new THREE.Color(1, 1, 1) },
    uSky: { value: new THREE.Color(0x5d8fd6) }, uHorizon: { value: new THREE.Color(0xbcd6ea) },
    uShallow: { value: new THREE.Color(0x3aa7a0) }, uDeep: { value: new THREE.Color(0x0f4d5a) },
    uAmbient: { value: 1 }, uFogD: { value: 0.0021 },
  },
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `
    uniform float uTime, uAmbient, uFogD; uniform vec3 uSunDir, uSunColor, uSky, uHorizon, uShallow, uDeep; varying vec3 vW;
    float wave(vec2 q, float t, float k){
      return sin(q.x*0.7+q.y*1.9-t*1.6)*0.3*mix(0.35,1.0,k) + sin(q.x*1.9-q.y*2.6-t*2.3)*0.28*k + sin(q.x*3.1+q.y*0.6-t*2.9)*0.18*k + (sin(q.x*5.1+q.y*4.3-t*3.4)*0.12 + sin(q.y*7.7-q.x*6.1-t*4.2)*0.06)*k*k + sin(q.x*13.0+q.y*11.0-t*6.0)*0.03*k*k*k;
    }
    void main(){
      vec2 p = vW.xz; float e = 0.12; float t = uTime;
      float dist = length(cameraPosition - vW); float k = exp(-dist*0.035);
      float c = wave(p,t,k), dx = wave(p+vec2(e,0.),t,k)-c, dz = wave(p+vec2(0.,e),t,k)-c;
      vec3 n = normalize(vec3(-dx/e*0.16, 1.0, -dz/e*0.16));
      vec3 v = normalize(cameraPosition - vW);
      float fres = pow(1.0 - max(dot(n,v),0.0), 4.0)*0.9 + 0.06;
      vec3 r = reflect(-v, n);
      vec3 skyc = mix(uHorizon, uSky, pow(clamp(r.y,0.,1.), 0.5));
      float sd = max(dot(r, uSunDir), 0.0);
      float spec = pow(sd, 380.0)*9.0 + pow(sd, 40.0)*0.22;
      float d = abs(vW.z - (8.0*sin(vW.x*0.03) + 4.0*sin(vW.x*0.071+1.3)));
      float depth = 1.0 - smoothstep(2.0, 8.6, d);
      vec3 base = mix(uShallow, uDeep, depth) * uAmbient;
      vec3 col = mix(base, skyc, fres) + uSunColor*spec;
      float foam = smoothstep(7.4, 8.5, d + c*0.5) * (0.55 + 0.45*sin(p.x*3.0 - t*2.0 + c*4.0));
      col = mix(col, vec3(0.9,0.95,1.0)*uAmbient, clamp(foam,0.,1.)*0.55);
      float f = 1.0 - exp(-uFogD*uFogD*dist*dist);
      col = mix(col, uHorizon, f);
      gl_FragColor = vec4(col, mix(0.7, 0.97, fres) + foam*0.2);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const water = new THREE.Mesh(new THREE.PlaneGeometry(680, 680), waterMat); water.rotation.x = -Math.PI / 2; water.position.y = WATER_Y; scene.add(water);

// ---------- props that change per zone (trees, rocks, glitter spots) ----------
const props = new THREE.Group(); scene.add(props);
const dummy = new THREE.Object3D(), tmpC = new THREE.Color();
function treeGeos(type) {
  const cyl = (rt, rb, h, x = 0, y = 0, z = 0, rz = 0) => { const g = new THREE.CylinderGeometry(rt, rb, h, 7); g.rotateZ(rz); g.translate(x, y, z); return g; };
  if (type === 'pine') return { trunk: cyl(0.22, 0.38, 2.4, 0, 1.2), leaf: mergeGeometries([[1.9, 3, 3.2], [1.5, 2.6, 4.8], [1.0, 2.2, 6.3]].map(([r, h, y]) => { const g = new THREE.ConeGeometry(r, h, 7); g.translate(0, y, 0); return g; })) };
  if (type === 'oak') return { trunk: cyl(0.3, 0.48, 2.8, 0, 1.4), leaf: mergeGeometries([[2.2, 0, 4.4, 0], [1.6, 1.4, 3.7, 0.4], [1.5, -1.2, 3.9, -0.6], [1.3, 0.2, 5.6, 0.5]].map(([r, x, y, z]) => { const g = new THREE.IcosahedronGeometry(r, 1); g.translate(x, y, z); return g; })) };
  if (type === 'cactus') return { trunk: null, leaf: mergeGeometries([cyl(0.42, 0.46, 4.2, 0, 2.1), cyl(0.24, 0.24, 1.7, 1.0, 2.9), cyl(0.24, 0.24, 1.0, 0.6, 2.2, 0, Math.PI / 2), cyl(0.22, 0.22, 1.3, -0.95, 2.3), cyl(0.22, 0.22, 0.9, -0.55, 1.75, 0, Math.PI / 2)]) };
  if (type === 'dead') return { trunk: mergeGeometries([cyl(0.14, 0.36, 4.2, 0, 2.1), cyl(0.06, 0.12, 1.8, 0.7, 3.2, 0, -0.9), cyl(0.05, 0.1, 1.4, -0.55, 2.6, 0, 0.9)]), leaf: null };
  if (type === 'crystal') { const g = new THREE.OctahedronGeometry(1, 0); g.scale(0.7, 2.7, 0.7); g.translate(0, 2.0, 0); const g2 = new THREE.OctahedronGeometry(1, 0); g2.scale(0.4, 1.5, 0.4); g2.rotateZ(0.5); g2.translate(0.8, 1.0, 0.2); return { trunk: null, leaf: mergeGeometries([g, g2]) }; }
  return { trunk: null, leaf: null };
}
let hotspots = [];
const hotGeo = new THREE.BufferGeometry();
{ const p = []; for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 2.4; p.push(Math.cos(a) * r, Math.random() * 0.5, Math.sin(a) * r); } hotGeo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); }
const hotMat = new THREE.PointsMaterial({ map: sparkTex, size: 0.9, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
hotMat.color.setRGB(9, 6.5, 1.8);
function placeHotspot(hs) { const x = (Math.random() * 2 - 1) * 85; hs.x = x; hs.z = riverZ(x) + (Math.random() * 2 - 1) * 4; hs.left = T.HOTSPOT_PANS; hs.obj.position.set(hs.x, WATER_Y + 0.08, hs.z); }

function buildZone() {
  biome = BIOMES[Math.floor((S.zone - 1) / 5)]; seed = S.zone * 17.3;
  const sub = (S.zone - 1) % 5, R = rng(S.zone * 7919);
  // --- terrain heights ---
  const pos = terrainGeo.attributes.position, col = terrainGeo.attributes.color;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  pos.needsUpdate = true; terrainGeo.computeVertexNormals();
  // --- terrain colors ---
  const nor = terrainGeo.attributes.normal;
  const C = (hex) => new THREE.Color(hex).offsetHSL(sub * 0.012, 0, sub * 0.008);
  const g1 = C(biome.g1), g2 = C(biome.g2), rock = C(biome.rock), gravel = new THREE.Color(biome.gravel), sand = new THREE.Color(biome.sand), snow = new THREE.Color(0xf4f8ff), dirt = new THREE.Color(0x8a6a48);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ny = nor.getY(i);
    const n = fbm(x * 0.07, z * 0.07, seed + 9);
    tmpC.copy(g1).lerp(g2, sstep(0.3, 0.7, n));
    if (y < 1.6) tmpC.lerp(sand, 1 - sstep(0.5, 1.6, y));
    if (y < 0.5) tmpC.lerp(gravel, 1 - sstep(-0.2, 0.5, y));
    if (y < -0.4) tmpC.multiplyScalar(lerp(0.55, 1, sstep(-1.7, -0.4, y)));
    tmpC.lerp(rock, sstep(0.86, 0.62, ny));
    if (y > biome.snow) tmpC.lerp(snow, sstep(biome.snow, biome.snow + 10, y) * sstep(0.45, 0.75, ny));
    const tm = 1 - sstep(TOWN.r - 12, TOWN.r + 2, Math.hypot(x - TOWN.x, z - TOWN.z));
    if (tm > 0) tmpC.lerp(dirt, tm * 0.85);
    // dirt trail from town down to the river
    const trail = (1 - sstep(1.5, 4, Math.abs(x))) * (z > 8 && z < TOWN.z ? 1 : 0);
    if (trail > 0 && y > 0.3) tmpC.lerp(dirt, trail * 0.8);
    tmpC.multiplyScalar(0.85 + n * 0.3);
    col.setXYZ(i, tmpC.r, tmpC.g, tmpC.b);
  }
  col.needsUpdate = true;
  // --- clear old props ---
  for (const o of [...props.children]) { props.remove(o); if (o.geometry && o.geometry !== hotGeo) o.geometry.dispose(); if (o.material && o.material !== hotMat) o.material.dispose(); }
  // --- trees ---
  const tg = treeGeos(biome.tree), spots = [];
  for (let tries = 0; spots.length < biome.treeN && tries < biome.treeN * 6; tries++) {
    const x = (R() * 2 - 1) * 290, z = (R() * 2 - 1) * 290;
    if (Math.abs(z - riverZ(x)) < 13 || Math.hypot(x - TOWN.x, z - TOWN.z) < TOWN.r + 8 || (Math.abs(x) < 5 && z > 0 && z < TOWN.z)) continue;
    const y = heightAt(x, z); if (biome.tree !== 'crystal' && y > biome.snow + 22) continue;
    spots.push([x, y, z, 0.7 + R() * 0.9, R() * 6.28]);
  }
  const addInst = (geo, mat, colorVar) => {
    if (!geo || !spots.length) return;
    const m = new THREE.InstancedMesh(geo, mat, spots.length); m.castShadow = true; m.receiveShadow = true;
    spots.forEach(([x, y, z, s, r], i) => {
      dummy.position.set(x, y - 0.15, z); dummy.rotation.set(0, r, 0); dummy.scale.set(s, s * (0.85 + (i % 7) * 0.05), s); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
      if (colorVar) { tmpC.set(0xffffff).multiplyScalar(0.75 + ((i * 37) % 10) * 0.05); if (biome.tree === 'crystal') tmpC.offsetHSL(0, 0, 0).setHSL(((i * 53) % 100) / 100 * 0.12 + 0.94, 0.25, 0.8); m.setColorAt(i, tmpC); }
    });
    props.add(m);
  };
  addInst(tg.trunk, new THREE.MeshStandardMaterial({ color: biome.tree === 'dead' ? biome.treeCol : 0x5a3d28, roughness: 1 }), false);
  const leafMat = new THREE.MeshStandardMaterial({ color: biome.treeCol, roughness: biome.tree === 'crystal' ? 0.15 : 0.85, flatShading: true });
  if (biome.tree === 'crystal') { leafMat.emissive.set(biome.treeCol); leafMat.emissiveIntensity = 4.5; leafMat.metalness = 0.2; }
  addInst(tg.leaf, leafMat, true);
  // --- rocks ---
  const rockGeo = new THREE.DodecahedronGeometry(1, 0), RN = 320;
  const rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: biome.rock, roughness: 0.9, flatShading: true }), RN);
  rocks.castShadow = true; rocks.receiveShadow = true;
  for (let i = 0; i < RN; i++) {
    let x, z;
    do {
      x = (R() * 2 - 1) * 250;
      z = i < 150 ? riverZ(x) + (R() < 0.5 ? -1 : 1) * (5 + R() * 12) : (R() * 2 - 1) * 250;
    } while (Math.hypot(x - TOWN.x, z - TOWN.z) < TOWN.r + 4 || (Math.abs(x) < 4 && z > 0 && z < TOWN.z));
    const s = i < 150 ? 0.3 + R() * 1.1 : 0.5 + R() * 2.6;
    dummy.position.set(x, heightAt(x, z) + s * 0.15, z); dummy.rotation.set(R() * 6, R() * 6, R() * 6); dummy.scale.set(s, s * (0.5 + R() * 0.5), s * (0.7 + R() * 0.5)); dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix);
    tmpC.set(0xffffff).multiplyScalar(0.7 + R() * 0.5); rocks.setColorAt(i, tmpC);
  }
  props.add(rocks);
  // --- glittering rich spots in the river ---
  hotspots = [];
  for (let i = 0; i < 3; i++) { const hs = { obj: new THREE.Points(hotGeo, hotMat) }; placeHotspot(hs); props.add(hs.obj); hotspots.push(hs); }
  // --- water and sky for this biome ---
  waterMat.uniforms.uShallow.value.set(biome.shallow); waterMat.uniforms.uDeep.value.set(biome.deep);
  const su = sky.material.uniforms; su.turbidity.value = biome.turb; su.rayleigh.value = biome.ray; su.mieCoefficient.value = 0.005; su.mieDirectionalG.value = 0.8;
}

// ---------- town ----------
const town = new THREE.Group(); scene.add(town);
const windowMat = new THREE.MeshStandardMaterial({ color: 0x332211, emissive: 0xffb04a, emissiveIntensity: 0.2 });
const lampMat = new THREE.MeshStandardMaterial({ color: 0x332211, emissive: 0xffa040, emissiveIntensity: 0.2 });
const lampLights = [];
const interacts = [];      // { x, z, r, label, open }
const blockers = [];       // { x0, x1, z0, z1 } boxes the player cannot walk through
function signTex(text, bg = '#3a2616', fg = '#ffd76a') {
  return canvasTex(512, 128, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 512, 128); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, 496, 112); g.fillStyle = fg; g.font = 'bold 62px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 68, 470); });
}
function box(w, h, d, mat, x, y, z, parent) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
function makeBuilding(name, tint, x, z, label, open) {
  const g = new THREE.Group(); g.position.set(x, TOWN.y, z); town.add(g);
  const w = 10, d = 8, h = 5.5;
  const wall = new THREE.MeshStandardMaterial({ map: woodTex, color: tint, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ map: woodTex, color: 0x6a4a30, roughness: 0.95 });
  box(w, h, d, wall, 0, h / 2, 0, g);
  box(w + 0.6, h + 2.4, 0.35, wall, 0, (h + 2.4) / 2, -d / 2 - 0.18, g);        // tall false front
  box(w + 0.5, 0.3, d + 0.5, dark, 0, h + 0.15, 0, g);                          // roof
  box(w + 0.6, 0.3, 3.2, dark, 0, 0.15, -d / 2 - 1.8, g);                       // porch floor
  const pr = box(w + 0.8, 0.18, 3.4, dark, 0, 3.5, -d / 2 - 1.8, g); pr.rotation.x = -0.1;
  for (const px of [-w / 2, -w / 6, w / 6, w / 2]) box(0.22, 3.4, 0.22, dark, px, 1.75, -d / 2 - 3.2, g);
  box(1.7, 3, 0.12, new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 1 }), 0, 1.7, -d / 2 - 0.4, g);
  for (const wx of [-3, 3]) box(1.7, 1.6, 0.12, windowMat, wx, 2.5, -d / 2 - 0.4, g);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshStandardMaterial({ map: signTex(name), roughness: 0.8 }));
  sign.position.set(0, h + 1.1, -d / 2 - 0.38); sign.rotation.y = Math.PI; g.add(sign);
  blockers.push({ x0: x - w / 2 - 0.9, x1: x + w / 2 + 0.9, z0: z - d / 2 - 3.6, z1: z + d / 2 + 0.8 });
  interacts.push({ x, z: z - d / 2 - 5, r: 4.2, label, open });
}
function makeLamp(x, z) {
  const g = new THREE.Group(); g.position.set(x, TOWN.y, z); town.add(g);
  const post = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.8 });
  box(0.2, 4, 0.2, post, 0, 2, 0, g);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), lampMat); bulb.position.y = 4.2; g.add(bulb);
  const l = new THREE.PointLight(0xffa550, 0, 34, 1.6); l.position.y = 4.2; g.add(l); lampLights.push(l);
}
function makeTrailBoard(x, z, open) {
  const g = new THREE.Group(); g.position.set(x, TOWN.y, z); g.rotation.y = -0.5; town.add(g);
  const dark = new THREE.MeshStandardMaterial({ map: woodTex, color: 0x6a4a30, roughness: 0.95 });
  box(0.3, 4.4, 0.3, dark, -2.2, 2.2, 0, g); box(0.3, 4.4, 0.3, dark, 2.2, 2.2, 0, g);
  const b = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.25), new THREE.MeshStandardMaterial({ map: signTex('TRAIL MAP', '#1f3a2a', '#f4e6b0'), side: THREE.DoubleSide })); b.position.set(0, 3.6, 0); b.rotation.y = Math.PI; g.add(b);
  const b2 = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.9), new THREE.MeshStandardMaterial({ color: 0xe8d8a8, roughness: 1, side: THREE.DoubleSide })); b2.position.set(0, 1.9, 0); g.add(b2);
  blockers.push({ x0: x - 1.2, x1: x + 1.2, z0: z - 1.2, z1: z + 1.2 });
  interacts.push({ x, z, r: 5, label: 'Trail Map (travel to another zone)', open });
}

// ---------- the miner ----------
const player = new THREE.Group(); scene.add(player);
const miner = {};
{
  const M = (c, r = 0.9) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const shirt = M(0xb23a2e), denim = M(0x3a5a8a), skin = M(0xe0a878), leather = M(0x5a3a1e), hat = M(0x4a3220);
  const add = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  miner.upper = new THREE.Group(); miner.upper.position.y = 1.0; player.add(miner.upper);
  add(new THREE.CapsuleGeometry(0.4, 0.6, 4, 10), shirt, 0, 0.62, 0, miner.upper);
  add(new THREE.CylinderGeometry(0.43, 0.43, 0.5, 10), denim, 0, 0.22, 0, miner.upper);
  add(new THREE.SphereGeometry(0.29, 14, 12), skin, 0, 1.38, 0, miner.upper);
  add(new THREE.SphereGeometry(0.2, 10, 8), M(0x6a4a2a), 0, 1.25, 0.16, miner.upper).scale.set(1.1, 0.8, 0.8);
  add(new THREE.CylinderGeometry(0.58, 0.58, 0.05, 16), hat, 0, 1.6, 0, miner.upper);
  add(new THREE.CylinderGeometry(0.28, 0.33, 0.3, 14), hat, 0, 1.76, 0, miner.upper);
  add(new THREE.BoxGeometry(0.62, 0.72, 0.32), leather, 0, 0.65, -0.46, miner.upper);
  miner.arms = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(s * 0.54, 0.98, 0); miner.upper.add(p); add(new THREE.CylinderGeometry(0.11, 0.1, 0.8, 8), shirt, 0, -0.4, 0, p); add(new THREE.SphereGeometry(0.11, 8, 6), skin, 0, -0.84, 0, p); return p; });
  miner.legs = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(s * 0.2, 1.0, 0); player.add(p); add(new THREE.CylinderGeometry(0.17, 0.14, 1.0, 8), denim, 0, -0.5, 0, p); add(new THREE.BoxGeometry(0.24, 0.2, 0.44), leather, 0, -0.95, 0.08, p); return p; });
  miner.pan = add(new THREE.CylinderGeometry(0.6, 0.38, 0.13, 20), new THREE.MeshStandardMaterial({ color: 0xb9a26a, metalness: 0.85, roughness: 0.3 }), 0, 0.85, 0.95, player);
  miner.pan.visible = false;
}
let heading = Math.PI, camYaw = Math.PI, walkPhase = 0, camDist = 10.5;

// ---------- pop-up gems ----------
const pops = [];
const gemGeo = new THREE.OctahedronGeometry(0.34, 0);
function popGem(idx, qty) {
  const n = Math.min(qty, 5);
  for (let k = 0; k < n; k++) {
    const m = new THREE.Mesh(gemGeo, new THREE.MeshStandardMaterial({ color: ITEMS[idx][1], emissive: ITEMS[idx][1], emissiveIntensity: 7, metalness: 0.4, roughness: 0.15, flatShading: true, transparent: true }));
    m.position.copy(miner.pan.getWorldPosition(new THREE.Vector3())); m.userData = { t: 0, vx: (Math.random() - 0.5) * 2 * (n > 1 ? 1 : 0.2), vz: (Math.random() - 0.5) * 2 * (n > 1 ? 1 : 0.2), vy: 5 + Math.random() * 1.5 };
    scene.add(m); pops.push(m);
  }
}

// ---------- day and night ----------
const sunDir = new THREE.Vector3(), cNight = new THREE.Color(0x1d2c4f), cSunset = new THREE.Color(0xe8905a), cFog = new THREE.Color(), cWarm = new THREE.Color(0xff9a55), cNoon = new THREE.Color(0xfff4e0), cSkyDay = new THREE.Color(0x5d8fd6), cSkyNight = new THREE.Color(0x2c3f70);
function updateSky(time) {
  const ph = (S.t / T.DAY_LENGTH + 0.3) % 1;                    // 0 = midnight, 0.5 = noon
  const e = -Math.cos(ph * Math.PI * 2) * 0.75 + 0.38;          // sun height
  sunDir.set(-Math.sin(ph * Math.PI * 2), e, -0.4).normalize();
  const day = sstep(-0.1, 0.25, e), sunset = sstep(0.4, 0.02, e) * sstep(-0.2, 0.0, e);
  sky.material.uniforms.sunPosition.value.copy(sunDir);
  sun.intensity = 3.4 * sstep(-0.02, 0.3, e); sun.color.copy(cWarm).lerp(cNoon, sstep(0, 0.45, e));
  sun.position.copy(player.position).addScaledVector(sunDir, 150); sun.target.position.copy(player.position);
  moon.intensity = 1.5 * (1 - day);
  hemi.intensity = 0.6 + 0.25 * day; hemi.color.copy(cSkyNight).lerp(cSkyDay, day).lerp(tmpC.set(biome.fog), 0.25);
  cFog.copy(cNight).lerp(tmpC.set(biome.fog), day).lerp(cSunset, sunset * 0.55);
  scene.fog.color.copy(cFog);
  stars.material.opacity = 1 - day; stars.position.copy(camera.position);
  windowMat.emissiveIntensity = 0.15 + 6 * (1 - day); lampMat.emissiveIntensity = 0.3 + 12 * (1 - day);
  for (const l of lampLights) l.intensity = 45 * (1 - day);
  const u = waterMat.uniforms; u.uTime.value = time; u.uSunDir.value.copy(sunDir); u.uSunColor.value.copy(sun.color).multiplyScalar(sun.intensity * 0.45 + 0.08 * (1 - day));
  u.uSky.value.copy(cSkyNight).lerp(cSkyDay, day); u.uHorizon.value.copy(cFog); u.uAmbient.value = 0.5 + 0.5 * day;
  sky.position.copy(camera.position);
}

// ============================================================
//  HUD and menus
// ============================================================
function toast(html, rare) { const d = document.createElement('div'); d.className = 'toast' + (rare ? ' rare' : ''); d.innerHTML = html; $('toasts').appendChild(d); setTimeout(() => d.remove(), 2200); while ($('toasts').children.length > 5) $('toasts').firstChild.remove(); }
function updateHud() {
  const L = levelInfo(S.xp), cap = bagCap(), bc = bagCount();
  $('foodFill').style.width = S.food + '%'; $('foodTxt').textContent = Math.ceil(S.food);
  $('energyFill').style.width = S.energy + '%'; $('energyTxt').textContent = Math.ceil(S.energy);
  $('foodBar').classList.toggle('low', S.food < 25); $('energyBar').classList.toggle('low', S.energy < panEnergy());
  $('hungry').style.boxShadow = `inset 0 0 160px rgba(200,20,10,${S.food < 25 ? (1 - S.food / 25) * 0.8 : 0})`;
  $('lvlLbl').textContent = 'Level ' + L.lvl; $('xpFill').style.width = (L.into / L.need * 100) + '%'; $('xpTxt').textContent = fmt(L.into) + ' / ' + fmt(L.need) + ' XP';
  $('zoneName').textContent = 'Zone ' + S.zone + ': ' + zoneName(S.zone);
  $('dayInfo').textContent = 'Day ' + dayNow() + '  |  Ration price today: $' + fmt(rationPrice());
  $('money').textContent = '$' + fmt(S.money);
  $('scoreTxt').textContent = 'Score: ' + fmt(S.xp) + ' XP';
  $('bagTxt').textContent = 'Bag: ' + bc + ' / ' + cap + (bc >= cap ? '  FULL' : ''); $('bagTxt').style.color = bc >= cap ? '#ff7a5a' : '';
  $('rationTxt').textContent = 'Rations: ' + S.rations + ' / ' + T.MAX_RATIONS + '  (F to eat)';
}
function addXp(n) {
  const before = levelInfo(S.xp).lvl; S.xp += n; const after = levelInfo(S.xp).lvl;
  if (after > before) {
    sfx.level(); toast('LEVEL ' + after + '!', true);
    if (maxZone(after) > maxZone(before)) toast('New zone unlocked: <b style="color:#7dffb0">' + zoneName(maxZone(after)) + '</b>. Check the Trail Map in town.', true);
  }
}
function eat() {
  if (S.rations <= 0) { toast('No rations! Buy food at the Cookhouse.'); sfx.no(); return; }
  if (S.food > 99 && S.energy > 99) { toast('Already full.'); return; }
  S.rations--; S.food = Math.min(100, S.food + T.RATION_FOOD); S.energy = Math.min(100, S.energy + T.RATION_ENERGY); sfx.eat(); toast('Ate a ration. +' + T.RATION_FOOD + ' food, +' + T.RATION_ENERGY + ' energy');
}
function finishPan(hot) {
  S.energy = Math.max(0, S.energy - panEnergy());
  if (hot) { hot.left--; if (hot.left <= 0) { placeHotspot(hot); toast('That rich spot is panned out. Look for the next glitter.'); } }
  if (Math.random() < emptyChance()) { toast('<span style="opacity:.7">Just gravel...</span>'); sfx.empty(); return; }
  const rare = Math.random() < rareChance() * (hot ? T.HOTSPOT_BONUS : 1);
  const idx = (S.zone - 1) * 2 + (rare ? 1 : 0);
  let qty = 1, jackpot = false;
  if (Math.random() < T.JACKPOT_CHANCE + 0.004 * S.up.luck) { qty = 5; jackpot = true; } else if (Math.random() < 0.1 + 0.03 * S.up.luck) qty = 2;
  qty = Math.min(qty, bagCap() - bagCount());
  S.bag[idx] = (S.bag[idx] || 0) + qty;
  const xp = itemXp(idx) * qty;
  if (!S.found.includes(idx)) { S.found.push(idx); toast('NEW DISCOVERY: <b style="color:' + cssCol(idx) + '">' + ITEMS[idx][0] + '</b>', true); }
  toast((jackpot ? 'JACKPOT! ' : '') + '+' + qty + ' <b style="color:' + cssCol(idx) + '">' + ITEMS[idx][0] + '</b> &nbsp; +' + fmt(xp) + ' XP', rare || jackpot);
  sfx.find(rare || jackpot); popGem(idx, qty); addXp(xp);
}

// ---------- menus ----------
let menuRender = null;
function openMenu(render) { if (mode !== 'play') return; mode = 'menu'; menuRender = render; $('overlay').classList.remove('hidden'); render(); }
function closeMenu() { if (mode !== 'menu') return; mode = 'play'; menuRender = null; $('overlay').classList.add('hidden'); saveGame(); }
const closeBtn = '<button data-act="close">Back to work (Esc)</button>';
function menuAssay() {
  const rows = Object.entries(S.bag).sort((a, b) => a[0] - b[0]).map(([i, q]) => `<div class="row"><span class="dot" style="background:${cssCol(+i)}"></span><span class="grow"><b>${ITEMS[i][0]}</b> x${q}</span><span>$${fmt(itemValue(+i))} each</span><b style="width:90px;text-align:right">$${fmt(itemValue(+i) * q)}</b></div>`).join('');
  $('card').innerHTML = `<h2>Assay Office <small>You have $${fmt(S.money)}</small></h2>` + (rows || '<p>Your bag is empty. Go pan in the river, then come back and sell.</p>') +
    `<div class="foot">${closeBtn}<button class="go" data-act="sell" ${bagCount() ? '' : 'disabled'}>Sell everything for $${fmt(bagWorth())}</button></div>`;
}
function upEffect(u, l) {
  const s = S.up[u.id]; S.up[u.id] = l; let t;
  if (u.id === 'tool') t = panTime().toFixed(2) + 's per pan'; else if (u.id === 'luck') t = Math.round(rareChance() * 100) + '% rare, ' + Math.round(emptyChance() * 100) + '% empty';
  else if (u.id === 'bag') t = 'holds ' + bagCap(); else t = panEnergy().toFixed(1) + ' energy per pan';
  S.up[u.id] = s; return t;
}
function menuOutfitter() {
  $('card').innerHTML = `<h2>Outfitter <small>You have $${fmt(S.money)}</small></h2>` + UPGRADES.map((u) => { const l = S.up[u.id], c = upCost(u); return `<div class="row"><span class="grow"><b>${u.name}: ${tierName(u, l)}</b> (level ${l})<br><span style="opacity:.8">${u.desc}. Now: ${upEffect(u, l)} &rarr; Next: <b>${tierName(u, l + 1)}</b>, ${upEffect(u, l + 1)}</span></span><button data-act="up" data-id="${u.id}" ${S.money >= c ? '' : 'disabled'}>Buy $${fmt(c)}</button></div>`; }).join('') + `<div class="foot">${closeBtn}</div>`;
}
function menuCook() {
  const p = rationPrice(), room = T.MAX_RATIONS - S.rations, can = Math.min(room, Math.floor(S.money / p));
  $('card').innerHTML = `<h2>Cookhouse <small>You have $${fmt(S.money)}</small></h2>
    <p>One ration fills <b>${T.RATION_FOOD} food</b> and <b>${T.RATION_ENERGY} energy</b>. Press <kbd>F</kbd> anywhere to eat one.</p>
    <p>Today's price: <b>$${fmt(p)}</b>. Tomorrow it will be <b>$${fmt(rationPrice(dayNow() + 1))}</b>. Every day more gold comes into town and the food costs more.</p>
    <div class="row"><span class="grow">You are carrying <b>${S.rations} / ${T.MAX_RATIONS}</b> rations. Food ${Math.ceil(S.food)}, energy ${Math.ceil(S.energy)}.</span>
      <button data-act="eat" ${S.rations ? '' : 'disabled'}>Eat one now</button>
      <button data-act="food" data-n="1" ${can >= 1 ? '' : 'disabled'}>Buy 1 ($${fmt(p)})</button>
      <button data-act="food" data-n="${can}" ${can >= 2 ? '' : 'disabled'}>Buy ${Math.max(can, 2)} ($${fmt(p * Math.max(can, 2))})</button></div>
    <div class="foot">${closeBtn}</div>`;
}
function menuTrail() {
  const mz = maxZone(levelInfo(S.xp).lvl);
  let h = `<h2>Trail Map <small>Level ${levelInfo(S.xp).lvl}. Better zones, better finds.</small></h2><div class="grid">`;
  for (let z = 1; z <= ZONES; z++) {
    const a = (z - 1) * 2, nm = (i) => S.found.includes(i) ? ITEMS[i][0] : '???';
    h += z <= mz ? `<button class="zone ${z === S.zone ? 'here' : ''}" data-act="go" data-z="${z}"><b>${z}. ${zoneName(z)}</b>${nm(a)}, ${nm(a + 1)}</button>`
      : `<button class="zone" disabled><b>${z}. ${z <= mz + 3 ? zoneName(z) : '???'}</b>Needs level ${zoneReq(z)}</button>`;
  }
  $('card').innerHTML = h + `</div><div class="foot">${closeBtn}</div>`;
}
function menuCodex() {
  $('card').innerHTML = `<h2>Collection <small>${S.found.length} / ${ITEMS.length} discovered</small></h2><div class="codex">` + ITEMS.map((it, i) => S.found.includes(i)
    ? `<div class="cx"><span class="dot" style="background:${cssCol(i)}"></span><span><b>${it[0]}</b><br>$${fmt(itemValue(i))} | ${fmt(itemXp(i))} XP</span></div>`
    : `<div class="cx unk"><span class="dot" style="background:#555"></span><span>??? <br>Zone ${Math.floor(i / 2) + 1}</span></div>`).join('') + `</div><div class="foot">${closeBtn}</div>`;
}
$('overlay').addEventListener('click', (ev) => {
  const b = ev.target.closest('button'); if (!b || b.disabled) return; const act = b.dataset.act;
  if (act === 'close') return closeMenu();
  if (act === 'sell') { const w = bagWorth(); S.money += w; S.bag = {}; sfx.coin(); toast('Sold for <b style="color:#ffc83a">$' + fmt(w) + '</b>'); }
  if (act === 'up') { const u = UPGRADES.find((x) => x.id === b.dataset.id), c = upCost(u); if (S.money >= c) { S.money -= c; S.up[u.id]++; sfx.buy(); toast('Bought ' + tierName(u, S.up[u.id]) + '!'); } }
  if (act === 'food') { const n = +b.dataset.n, c = rationPrice() * n; if (n > 0 && S.money >= c && S.rations + n <= T.MAX_RATIONS) { S.money -= c; S.rations += n; sfx.buy(); } }
  if (act === 'eat') eat();
  if (act === 'go') { const z = +b.dataset.z; if (z !== S.zone) return travel(z); return closeMenu(); }
  if (act === 'again') return location.reload();
  if (menuRender) menuRender(); updateHud();
});
function travel(z) {
  $('fade').style.opacity = 1;
  setTimeout(() => {
    S.zone = z; buildZone(); player.position.set(0, 0, 26); heading = camYaw = Math.PI;
    $('overlay').classList.add('hidden'); mode = 'play'; menuRender = null; saveGame(); updateHud();
    $('fade').style.opacity = 0; toast('Welcome to <b>' + zoneName(z) + '</b>', true);
  }, 380);
}

// ---------- leaderboard ----------
function boardHtml(meEntry) {
  const lb = store.get(LB_KEY) || [];
  if (!lb.length) return '<p>No runs yet. Be the first name on the board.</p>';
  return '<table class="lb"><tr><th>#</th><th>Miner</th><th>XP</th><th>Lvl</th><th>Zone</th><th>Days</th></tr>' + lb.map((e, i) => `<tr class="${meEntry && e.id === meEntry.id ? 'me' : ''}"><td>${i + 1}</td><td>${e.name}</td><td>${fmt(e.xp)}</td><td>${e.level}</td><td>${e.zone}</td><td>${e.day}</td></tr>`).join('') + '</table>';
}
// Sends the score to the shared sheet if LEADERBOARD_URL is set in data.js. Otherwise does nothing.
async function submitScoreRemote(entry) {
  if (!T.LEADERBOARD_URL) return;
  try { await fetch(T.LEADERBOARD_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ game: 'gold-rush-sim', name: entry.name, xp: entry.xp, level: entry.level, zone: entry.zone, day: entry.day }) }); } catch (e) { /* offline: local score is still saved */ }
}
function die() {
  mode = 'dead'; sfx.dead();
  const L = levelInfo(S.xp), entry = { id: Date.now(), name: S.name, xp: Math.floor(S.xp), level: L.lvl, zone: Math.max(S.zone, maxZone(L.lvl)), day: dayNow() };
  const lb = store.get(LB_KEY) || []; lb.push(entry); lb.sort((a, b) => b.xp - a.xp); store.set(LB_KEY, lb.slice(0, 10)); store.del(SAVE_KEY);
  submitScoreRemote(entry);
  $('prompt').classList.add('hidden'); $('panWrap').classList.add('hidden');
  $('card').innerHTML = `<h1>You Starved</h1><p class="center" style="font-size:18px"><b>${S.name}</b> lasted <b>${entry.day} days</b>, reached <b>level ${entry.level}</b>, and discovered <b>${S.found.length} of ${ITEMS.length}</b> finds.</p>
    <p class="center" style="font-size:30px;color:#7a4a0c"><b>Final score: ${fmt(entry.xp)} XP</b></p><h2>Top Miners <small>on this laptop</small></h2>${boardHtml(entry)}<div class="foot"><span></span><button class="go" data-act="again">Play again</button></div>`;
  $('overlay').classList.remove('hidden');
}

// ---------- title screen ----------
function showTitle() {
  const sv = store.get(SAVE_KEY), nm = store.get(NAME_KEY) || '';
  $('titleCard').innerHTML = `<h1>GOLD RUSH SIM</h1><p class="center">Pan the river. Sell in town. Buy better gear. Go deeper. Don't starve.</p>
    <p class="center" style="margin:14px 0"><input id="tag" maxlength="10" placeholder="GAMER TAG" value="${nm}"></p>
    <p class="center">${sv ? `<button class="go" id="btnCont">Continue (${sv.name}, level ${levelInfo(sv.xp).lvl}, day ${Math.floor(sv.t / T.DAY_LENGTH) + 1})</button> &nbsp; ` : ''}<button class="${sv ? '' : 'go'}" id="btnNew">New run</button></p>
    <div class="cols"><div><h2>How to play</h2>
      <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrows: walk and turn</p><p><kbd>SPACE</kbd> hold in the river to pan. Glittering spots are richer.</p>
      <p><kbd>E</kbd> use a shop or the Trail Map</p><p><kbd>F</kbd> eat a ration (food and energy)</p><p><kbd>C</kbd> collection &nbsp; <kbd>G</kbd> graphics &nbsp; <kbd>M</kbd> sound</p>
      <p>Food prices rise every day. Your score is your total XP when you starve.</p></div>
      <div><h2>Top Miners <small>on this laptop</small></h2>${boardHtml()}</div></div>`;
  const begin = (state) => {
    S = state; store.set(NAME_KEY, S.name); initAudio();
    buildZone(); player.position.set(S.x, 0, S.z); heading = camYaw = S.h; lastDay = dayNow();
    mode = 'play'; $('title').classList.add('hidden'); $('hud').classList.remove('hidden'); $('help').classList.remove('hidden'); updateHud();
    toast('Walk down to the river and hold SPACE to pan', true);
  };
  const tag = () => ($('tag').value.trim().toUpperCase().replace(/[^A-Z0-9_ ]/g, '').slice(0, 10)) || 'MINER';
  $('btnNew').onclick = () => begin(newState(tag()));
  if (sv) $('btnCont').onclick = () => begin(Object.assign(newState(sv.name), sv));
}

// ============================================================
//  INPUT
// ============================================================
const keys = {};
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') { if (e.code === 'Enter') $('btnNew').click(); return; }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return; keys[e.code] = true;
  if (e.code === 'KeyM') { muted = !muted; toast(muted ? 'Sound off' : 'Sound on'); }
  if (e.code === 'KeyG') { quality = quality ? 0 : 1; setupComposer(); toast(quality ? 'Graphics: fancy' : 'Graphics: fast'); }
  if (mode === 'menu') { if (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'KeyC') closeMenu(); else if (e.code === 'KeyF') { eat(); if (menuRender) menuRender(); updateHud(); } return; }
  if (mode !== 'play') return;
  if (e.code === 'KeyF') eat();
  if (e.code === 'KeyC') openMenu(menuCodex);
  if (e.code === 'KeyE' && nearest) openMenu(nearest.open);
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
window.addEventListener('wheel', (e) => { camDist = clamp(camDist + Math.sign(e.deltaY) * 1.2, 6, 24); }, { passive: true });
window.addEventListener('beforeunload', saveGame);

// ============================================================
//  UPDATE (one step of the game brain)
// ============================================================
let nearest = null, hudTimer = 0;
function update(dt) {
  // --- time, food, starvation ---
  S.t += dt; S.food -= T.FOOD_DRAIN * dt;
  if (S.food <= 0) { S.food = 0; updateHud(); die(); return; }
  if (dayNow() !== lastDay) { lastDay = dayNow(); toast('Day ' + lastDay + '. Rations now cost <b style="color:#ffc83a">$' + fmt(rationPrice()) + '</b>'); }

  // --- what is the player standing on / next to ---
  const p = player.position, ground = heightAt(p.x, p.z), inWater = ground < WATER_Y - 0.05;
  nearest = null; for (const it of interacts) if (Math.hypot(p.x - it.x, p.z - it.z) < it.r) nearest = it;
  const hot = inWater ? hotspots.find((h) => Math.hypot(p.x - h.x, p.z - h.z) < 3.4) : null;
  const full = bagCount() >= bagCap(), tired = S.energy < panEnergy();
  const panning = keys.Space && inWater && !full && !tired;

  // --- panning ---
  if (panning) { panProg += dt / panTime(); if (panProg >= 1) { panProg = 0; finishPan(hot); } } else panProg = 0;

  // --- walking ---
  let moving = false;
  if (!panning) {
    const turn = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
    const fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 0.6 : 0);
    heading += turn * T.TURN_SPEED * dt;
    if (fwd) {
      const sp = T.WALK_SPEED * (inWater ? 0.65 : 1) * fwd * dt; let nx = p.x + Math.sin(heading) * sp, nz = p.z + Math.cos(heading) * sp;
      nx = clamp(nx, -BOUNDS.x, BOUNDS.x); nz = clamp(nz, BOUNDS.zMin, BOUNDS.zMax);
      for (const b of blockers) if (nx > b.x0 && nx < b.x1 && nz > b.z0 && nz < b.z1) { if (p.x <= b.x0 || p.x >= b.x1) nx = p.x; else nz = p.z; }
      p.x = nx; p.z = nz; moving = true; walkPhase += dt * 11 * Math.abs(fwd);
    }
  }
  p.y = heightAt(p.x, p.z);
  player.rotation.y = heading;

  // --- miner animation ---
  const sw = moving ? Math.sin(walkPhase) * 0.7 : 0;
  miner.legs[0].rotation.x = lerp(miner.legs[0].rotation.x, sw, 0.3); miner.legs[1].rotation.x = lerp(miner.legs[1].rotation.x, -sw, 0.3);
  miner.upper.rotation.x = lerp(miner.upper.rotation.x, panning ? 0.55 : 0, 0.15);
  miner.arms[0].rotation.x = lerp(miner.arms[0].rotation.x, panning ? -1.15 : -sw, 0.3); miner.arms[1].rotation.x = lerp(miner.arms[1].rotation.x, panning ? -1.15 : sw, 0.3);
  miner.pan.visible = panning || panProg > 0;
  if (panning) { const a = performance.now() * 0.012; miner.pan.position.set(Math.cos(a) * 0.14, 0.82, 1.0 + Math.sin(a) * 0.14); miner.pan.rotation.set(Math.sin(a) * 0.2, 0, Math.cos(a) * 0.2); }

  // --- prompts ---
  let msg = '';
  if (nearest) msg = 'Press <b>E</b>: ' + nearest.label;
  else if (inWater) msg = full ? 'Bag full! Sell at the <b>Assay Office</b> in town' : tired ? 'Too tired to pan. Press <b>F</b> to eat a ration' : panning ? '' : 'Hold <b>SPACE</b> to pan' + (hot ? ' <b>(rich spot!)</b>' : '');
  $('prompt').classList.toggle('hidden', !msg); if (msg) $('prompt').innerHTML = msg;
  $('panWrap').classList.toggle('hidden', !panning); $('panFill').style.width = (panProg * 100) + '%';

  if (riverGain) riverGain.gain.value = muted ? 0 : 0.05 * (1 - sstep(4, 40, Math.abs(p.z - riverZ(p.x))));
  hudTimer -= dt; if (hudTimer <= 0) { hudTimer = 0.1; updateHud(); }
  saveTimer += dt; if (saveTimer > 5) { saveTimer = 0; saveGame(); }
}

function updateCamera(dt, time) {
  if (mode === 'title') {
    const a = time * 0.06; camera.position.set(Math.sin(a) * 46, 15, 22 + Math.cos(a) * 34); camera.position.y = Math.max(camera.position.y, heightAt(camera.position.x, camera.position.z) + 4); camera.lookAt(0, 4, 40); return;
  }
  let dy = heading - camYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); camYaw += dy * Math.min(1, dt * 4);
  const p = player.position, tx = p.x - Math.sin(camYaw) * camDist, tz = p.z - Math.cos(camYaw) * camDist;
  const ty = Math.max(p.y + camDist * 0.42, heightAt(tx, tz) + 1.5);
  camera.position.lerp(tmpV.set(tx, ty, tz), Math.min(1, dt * 6)); camera.lookAt(p.x, p.y + 2.1, p.z);
}
const tmpV = new THREE.Vector3();

function updateFx(dt, time) {
  for (let i = pops.length - 1; i >= 0; i--) {
    const m = pops[i], u = m.userData; u.t += dt; u.vy -= 9 * dt; m.position.x += u.vx * dt; m.position.z += u.vz * dt; m.position.y += u.vy * dt; m.rotation.y += dt * 6; m.rotation.x += dt * 3;
    m.material.opacity = 1 - sstep(0.8, 1.3, u.t); if (u.t > 1.3) { scene.remove(m); m.material.dispose(); pops.splice(i, 1); }
  }
  for (const h of hotspots) { h.obj.rotation.y = time * 0.8; h.obj.scale.setScalar(1 + Math.sin(time * 5 + h.x) * 0.12); }
  hotMat.size = 0.8 + Math.sin(time * 9) * 0.25;
}

// ============================================================
//  MAIN LOOP: Input -> Update -> Draw -> Repeat
// ============================================================
let lastT = performance.now(), elapsed = 0;
function frame() {
  const now = performance.now(), dt = Math.min((now - lastT) / 1000, 0.05); lastT = now; elapsed += dt; const time = elapsed;
  if (mode === 'play') update(dt);
  updateCamera(dt, time); updateSky(time); updateFx(dt, time);
  if (quality) composer.render(); else renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ---------- start up ----------
makeBuilding('ASSAY OFFICE', 0xc9a877, -17, 68, 'Assay Office (sell your finds)', menuAssay);
makeBuilding('OUTFITTER', 0xa8b0a0, 0, 70, 'Outfitter (buy better gear)', menuOutfitter);
makeBuilding('COOKHOUSE', 0xc98a6a, 17, 68, 'Cookhouse (buy food)', menuCook);
makeTrailBoard(-24, 46, menuTrail);
makeLamp(-8.5, 58); makeLamp(8.5, 58); makeLamp(-20, 50);
setupComposer();
buildZone();
showTitle();
frame();
