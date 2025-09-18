(() => {
  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1020);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 200);
  camera.position.set(0, 2, 8);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxDistance = 30;
  controls.target.set(0, 2, 0);

  // Lights
  const amb = new THREE.AmbientLight(0xffffff, 0.5); scene.add(amb);
  const dir = new THREE.SpotLight(0xffffff, 1.2, 100, Math.PI/6, 0.3, 1);
  dir.position.set(5, 8, 5); dir.target.position.set(0,2,0); scene.add(dir, dir.target);

  // Floor & walls (simple room)
  const room = new THREE.Group();
  const floorMat = new THREE.MeshStandardMaterial({color:0x0f172a, roughness:0.8, metalness:0.1});
  const wallMat  = new THREE.MeshStandardMaterial({color:0x111827, roughness:0.9, metalness:0.0});
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 14), floorMat);
  floor.rotation.x = -Math.PI/2; floor.position.y = 0; room.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(20, 14), wallMat);
  ceil.rotation.x =  Math.PI/2; ceil.position.y = 4; room.add(ceil);
  // walls: back, front, left, right
  const wallGeo = new THREE.PlaneGeometry(20, 4);
  const back = new THREE.Mesh(wallGeo, wallMat); back.position.set(0,2,-7); room.add(back);
  const front= new THREE.Mesh(wallGeo, wallMat); front.rotation.y = Math.PI; front.position.set(0,2,7); room.add(front);
  const sideGeo = new THREE.PlaneGeometry(14,4);
  const left = new THREE.Mesh(sideGeo, wallMat); left.rotation.y = Math.PI/2; left.position.set(-10,2,0); room.add(left);
  const right= new THREE.Mesh(sideGeo, wallMat); right.rotation.y = -Math.PI/2; right.position.set(10,2,0); room.add(right);
  scene.add(room);

  // Helper: make a canvas texture with title/year
  function makeLabelTexture(title, subtitle){
    const W = 512, H = 512;
    const cnv = document.createElement('canvas'); cnv.width=W; cnv.height=H;
    const ctx = cnv.getContext('2d');
    // background gradient
    const g = ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#0b1228'); g.addColorStop(1,'#0e2233');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    // frame decorative
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 18; ctx.strokeRect(16,16,W-32,H-32);
    ctx.strokeStyle = 'rgba(34,211,238,0.7)'; ctx.lineWidth = 4; ctx.strokeRect(30,30,W-60,H-60);
    // text
    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 44px system-ui,Segoe UI,Roboto'; wrapText(ctx, title, 60, 200, W-120, 54);
    ctx.fillStyle = '#9ca3af'; ctx.font = '28px system-ui,Segoe UI,Roboto';
    ctx.fillText(subtitle || '', 60, H-90);
    return new THREE.CanvasTexture(cnv);
  }
  function wrapText(ctx, text, x, y, maxWidth, lineHeight){
    const words = (text||'').split(' ');
    let line = ''; let yy = y;
    for (let n=0; n<words.length; n++){
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n>0){ ctx.fillText(line, x, yy); line = words[n] + ' '; yy += lineHeight; }
      else line = testLine;
    }
    ctx.fillText(line, x, yy);
  }

  // Build frames along the walls
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const interactables = [];

  fetch('./resistantes.json').then(r=>r.json()).then(items => {
    const n = items.length;
    const perSide = Math.ceil(n/4);
    const spacing = 20/(perSide+1); // for long walls
    const spacingShort = 14/(perSide+1);

    let idx = 0;
    function addFrame(pos, rotY, data){
      const group = new THREE.Group(); group.position.copy(pos); group.rotation.y = rotY || 0;
      // art plane
      const planeGeo = new THREE.PlaneGeometry(2.2, 1.6);
      const tex = makeLabelTexture(data.nom, `${data.ville||''} · ${data.annee||''}`);
      const art = new THREE.Mesh(planeGeo, new THREE.MeshStandardMaterial({map: tex, roughness:0.8, metalness:0.0}));
      art.position.z = 0.02;
      // frame (simple box border)
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 0.08), new THREE.MeshStandardMaterial({color:0x22262e, metalness:0.2, roughness:0.3}));
      group.add(frame); group.add(art);
      // small label below
      const lblTex = makeSmallLabel(`${data.nom}`, `${data.ville||''} · ${data.annee||''}`);
      const lbl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.35), new THREE.MeshBasicMaterial({map: lblTex, transparent: true}));
      lbl.position.set(0,-1.2,0.03); group.add(lbl);

      group.userData = { url: data.url, title: data.nom };
      scene.add(group); interactables.push(group);
    }
    function makeSmallLabel(title, subtitle){
      const W = 512, H = 128;
      const cnv = document.createElement('canvas'); cnv.width=W; cnv.height=H;
      const ctx = cnv.getContext('2d');
      ctx.fillStyle = 'rgba(17,24,39,0.9)'; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.strokeRect(4,4,W-8,H-8);
      ctx.fillStyle = '#e5e7eb'; ctx.font = 'bold 36px system-ui,Segoe UI,Roboto';
      ctx.fillText((title||'').slice(0,24), 18, 50);
      ctx.fillStyle = '#9ca3af'; ctx.font = '24px system-ui,Segoe UI,Roboto';
      ctx.fillText((subtitle||'').slice(0,30), 18, 92);
      return new THREE.CanvasTexture(cnv);
    }

    // Distribute frames: back wall, front wall, left, right
    const y = 2; // height center
    for (let side=0; side<4; side++){
      for (let i=0; i<perSide && idx < n; i++, idx++){
        const d = items[idx];
        let pos, rotY = 0;
        if (side===0){ // back wall (z=-6.6)
          pos = new THREE.Vector3(-10 + spacing*(i+1), y, -6.6);
        } else if (side===1){ // front wall (z=6.6), facing camera
          pos = new THREE.Vector3(-10 + spacing*(i+1), y, 6.6);
          rotY = Math.PI;
        } else if (side===2){ // left wall (x=-9.6)
          pos = new THREE.Vector3(-9.6, y, -7 + spacingShort*(i+1));
          rotY = Math.PI/2;
        } else { // right wall (x=9.6)
          pos = new THREE.Vector3(9.6, y, -7 + spacingShort*(i+1));
          rotY = -Math.PI/2;
        }
        addFrame(pos, rotY, d);
      }
    }
  });

  // Tooltip
  const tip = document.createElement('div'); tip.id = 'tooltip'; tip.style.display = 'none'; document.body.appendChild(tip);

  function onPointerMove(e){
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(interactables, true);
    if (hits.length){
      let g = hits[0].object;
      while (g && !g.userData.url) g = g.parent;
      if (g){
        tip.innerText = g.userData.title + '\n(click)';
        tip.style.left = e.clientX + 'px';
        tip.style.top  = e.clientY + 'px';
        tip.style.display = 'block';
        document.body.style.cursor = 'pointer';
        return;
      }
    }
    tip.style.display = 'none';
    document.body.style.cursor = 'default';
  }
  function onClick(e){
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(interactables, true);
    if (hits.length){
      let g = hits[0].object;
      while (g && !g.userData.url) g = g.parent;
      if (g && g.userData.url){
        window.open(g.userData.url, '_blank', 'noopener');
      }
    }
  }
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('click', onClick);

  // Resize
  window.addEventListener('resize', ()=>{
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
  });

  // Animate
  function tick(){
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
})();