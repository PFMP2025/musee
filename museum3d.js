// Imports robustes (pas d'import map nécessaire)
import * as THREE from 'https://cdn.skypack.dev/three@0.160.0';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x121826);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 2.2, 10);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 3;
controls.maxDistance = 26;
controls.target.set(0, 1.9, 0);

// Eclairage global + ambiance galerie
scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x1a2030, 0.8);
hemi.position.set(0, 6, 0);
scene.add(hemi);

// --- Salle de musée (sol clair mat, murs satinés) ---
const room = new THREE.Group();
const floorMat = new THREE.MeshStandardMaterial({ color: 0x1b2334, roughness: 0.9, metalness: 0.05 });
const wallMat  = new THREE.MeshStandardMaterial({ color: 0x202a3d, roughness: 0.95, metalness: 0.0 });

const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 18), floorMat);
floor.rotation.x = -Math.PI/2;
room.add(floor);

const ceil = new THREE.Mesh(new THREE.PlaneGeometry(26, 18), wallMat);
ceil.rotation.x =  Math.PI/2; ceil.position.y = 4.6;
room.add(ceil);

const wallLong = new THREE.PlaneGeometry(26, 4.6);
const wallShort= new THREE.PlaneGeometry(18, 4.6);
const back  = new THREE.Mesh(wallLong, wallMat);  back.position.set(0,2.3,-9); room.add(back);
const front = new THREE.Mesh(wallLong, wallMat);  front.rotation.y = Math.PI; front.position.set(0,2.3, 9); room.add(front);
const left  = new THREE.Mesh(wallShort,wallMat);  left.rotation.y = Math.PI/2; left.position.set(-13,2.3,0); room.add(left);
const right = new THREE.Mesh(wallShort,wallMat);  right.rotation.y =-Math.PI/2; right.position.set( 13,2.3,0); room.add(right);

scene.add(room);

// -- utilitaires pour étiquettes (fallback si pas d'image) --
function wrapText(ctx, text, x, y, maxWidth, lineHeight){
  const words = (text||'').split(' '); let line=''; let yy=y;
  for (let n=0;n<words.length;n++){
    const test=line + words[n] + ' ';
    if (ctx.measureText(test).width > maxWidth && n>0){ ctx.fillText(line,x,yy); line=words[n] + ' '; yy += lineHeight; }
    else line = test;
  }
  ctx.fillText(line, x, yy);
}
function makeLabelTexture(title, subtitle){
  const W=1024, H=768;
  const c=document.createElement('canvas'); c.width=W; c.height=H;
  const ctx=c.getContext('2d');
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#162031'); g.addColorStop(1,'#0f1926');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(255,255,255,0.28)'; ctx.lineWidth=14; ctx.strokeRect(18,18,W-36,H-36);
  ctx.fillStyle='#e5e7eb'; ctx.font='bold 56px system-ui,Segoe UI,Roboto';
  wrapText(ctx, title, 64, 220, W-128, 60);
  ctx.fillStyle='#9ca3af'; ctx.font='32px system-ui,Segoe UI,Roboto'; ctx.fillText(subtitle||'', 64, H-80);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
function makeSmallLabel(title, subtitle){
  const W=512, H=150;
  const c=document.createElement('canvas'); c.width=W; c.height=H;
  const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(14,18,28,0.92)'; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(255,255,255,0.25)'; ctx.strokeRect(4,4,W-8,H-8);
  ctx.fillStyle='#e5e7eb'; ctx.font='bold 34px system-ui,Segoe UI,Roboto'; ctx.fillText((title||'').slice(0,26), 18, 58);
  ctx.fillStyle='#9ca3af'; ctx.font='22px system-ui,Segoe UI,Roboto'; ctx.fillText((subtitle||'').slice(0,32), 18, 110);
  const tex=new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

// Chargement de texture image + "contain" dans le cadre
const texLoader = new THREE.TextureLoader();
texLoader.crossOrigin = 'anonymous';

// dimensions "cadre" (extérieur) et "toile" (intérieur visible max)
const TOILE_MAX_W = 2.4;
const TOILE_MAX_H = 1.6;
const CADRE_W = TOILE_MAX_W + 0.22;
const CADRE_H = TOILE_MAX_H + 0.22;

function fitSizeToFrame(imgW, imgH){
  const ratio = imgW / imgH;
  let w = TOILE_MAX_W, h = w / ratio;
  if (h > TOILE_MAX_H){ h = TOILE_MAX_H; w = h * ratio; }
  return { w, h };
}

function makeArtMeshFromImage(url, fallbackTitle, sub){
  return new Promise(resolve=>{
    if(!url){ // pas d'image => fallback texte
      const t = makeLabelTexture(fallbackTitle, sub);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(TOILE_MAX_W, TOILE_MAX_H),
                               new THREE.MeshStandardMaterial({ map: t, roughness:0.7 }));
      resolve(m); return;
    }
    texLoader.load(url, (tex)=>{
      tex.colorSpace = THREE.SRGBColorSpace;
      const { image } = tex;
      const { w, h } = fitSizeToFrame(image.width, image.height);
      const geo = new THREE.PlaneGeometry(w, h);
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness:0.6, metalness:0.0 });
      resolve(new THREE.Mesh(geo, mat));
    }, undefined, ()=>{ // en cas d’erreur : fallback texte
      const t = makeLabelTexture(fallbackTitle, sub);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(TOILE_MAX_W, TOILE_MAX_H),
                               new THREE.MeshStandardMaterial({ map: t, roughness:0.7 }));
      resolve(m);
    });
  });
}

function addPictureLight(group){
  // spot discret au-dessus et un petit fill-light
  const spot = new THREE.SpotLight(0xffffff, 15, 6, Math.PI/8, 0.4, 1);
  spot.position.set(0, 1.3, 0.6);
  spot.target.position.set(0, 0, 0.1);
  group.add(spot, spot.target);
  const fill = new THREE.PointLight(0xffffff, 1, 4); fill.position.set(0, 0.6, 0.7); group.add(fill);
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const interactables = [];

async function addFrame(pos, rotY, data){
  const group = new THREE.Group(); group.position.copy(pos); group.rotation.y = rotY || 0;

  // cadre bois foncé (léger chanfrein)
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(CADRE_W, CADRE_H, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x2b3548, metalness: 0.2, roughness: 0.4 })
  );

  // toile (image ajustée "contain")
  const art = await makeArtMeshFromImage(
    data.vignette, data.nom, `${data.ville||''} · ${data.annee||''}`
  );
  art.position.z = 0.028;

  // cartel (étiquette)
  const lblTex = makeSmallLabel(`${data.nom}`, `${data.ville||''} · ${data.annee||''}`);
  const lbl = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.38),
                             new THREE.MeshBasicMaterial({ map: lblTex, transparent: true }));
  lbl.position.set(0, -1.3, 0.03);

  group.add(frame, art, lbl);
  addPictureLight(group);
  group.userData = { url: data.url, title: data.nom };
  scene.add(group); interactables.push(group);
}

// Répartition dans la salle
fetch('./resistantes.json').then(r=>r.json()).then(async items=>{
  const n = items.length;
  const perSide = Math.max(1, Math.ceil(n/4));
  const gapLong = 26 / (perSide + 1);
  const gapShort= 18 / (perSide + 1);
  let idx = 0; const y = 2.1;

  for (let side=0; side<4; side++){
    for (let i=0; i<perSide && idx<n; i++, idx++){
      const d = items[idx]; let pos, rotY = 0;
      if (side===0){ pos = new THREE.Vector3(-13 + gapLong*(i+1), y, -8.5); }
      else if (side===1){ pos = new THREE.Vector3(-13 + gapLong*(i+1), y,  8.5); rotY = Math.PI; }
      else if (side===2){ pos = new THREE.Vector3(-12.5, y, -9 + gapShort*(i+1)); rotY = Math.PI/2; }
      else { pos = new THREE.Vector3( 12.5, y, -9 + gapShort*(i+1)); rotY = -Math.PI/2; }
      await addFrame(pos, rotY, d);
    }
  }
});

// UX : tooltip simple + clic pour ouvrir
const tip = document.createElement('div');
tip.style.cssText = 'position:fixed;pointer-events:none;background:#111827cc;color:#fff;font-size:12px;padding:6px 8px;border-radius:8px;border:1px solid #ffffff33;transform:translate(-50%,-130%);white-space:nowrap;display:none;z-index:5';
document.body.appendChild(tip);

function pick(e, onHit){
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(interactables, true);
  if (!hits.length) return null;
  let g = hits[0].object;
  while (g && !g.userData.url) g = g.parent;
  if (g && onHit) onHit(g);
  return g;
}
addEventListener('mousemove', e=>{
  const g = pick(e, g=>{
    tip.textContent = g.userData.title + ' — clic pour ouvrir';
    tip.style.left = e.clientX + 'px';
    tip.style.top  = e.clientY + 'px';
    tip.style.display = 'block';
    document.body.style.cursor = 'pointer';
  });
  if (!g){ tip.style.display='none'; document.body.style.cursor='default'; }
});
addEventListener('click', e=>{
  pick(e, g=> window.open(g.userData.url, '_blank', 'noopener'));
});

// Resize + rendu
addEventListener('resize', ()=>{
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});
(function loop(){
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
})();
