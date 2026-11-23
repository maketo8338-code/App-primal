/* PRIMAL — site vitrine.
   1. Récit au défilement + téléphone 3D (Three.js)   2. Galerie en arc 3D
   3. Inclinaison 3D au survol   4. Curseur halo   5. Son d'ambiance généré (Web Audio)   6. Divers */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const lite = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  const root = document.documentElement;

  /* ================= 5. SON (déclaré tôt : utilisé partout) ================= */
  const Sound = {
    ctx: null, on: false,
    init() {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return false;
      const ctx = this.ctx = new C();
      this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(ctx.destination);
      // réverbération « cathédrale » : réponse impulsionnelle générée
      const len = ctx.sampleRate * 4.5, ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      const verb = ctx.createConvolver(); verb.buffer = ir;
      const wet = ctx.createGain(); wet.gain.value = .9; verb.connect(wet).connect(this.master);
      const dry = ctx.createGain(); dry.gain.value = .3; dry.connect(this.master);
      this.bus = ctx.createGain(); this.bus.connect(verb); this.bus.connect(dry);
      // souffle du vent : bruit brun filtré qui respire
      const nb = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate), nd = nb.getChannelData(0);
      let last = 0; for (let i = 0; i < nd.length; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; nd[i] = last * 3.5; }
      const noise = ctx.createBufferSource(); noise.buffer = nb; noise.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = .7;
      const lfo = ctx.createOscillator(); lfo.frequency.value = .06; const lg = ctx.createGain(); lg.gain.value = 320; lfo.connect(lg).connect(bp.frequency); lfo.start();
      const wg = ctx.createGain(); wg.gain.value = .55; noise.connect(bp).connect(wg).connect(this.bus); noise.start();
      // chœur : 4 voix en dents de scie, filtrées vers un « ah »
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
      const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 760; pk.gain.value = 8; pk.Q.value = 2;
      const pg = ctx.createGain(); pg.gain.value = .045; lp.connect(pk).connect(pg).connect(this.bus);
      this.voices = [0, 1, 2, 3].map(() => {
        const vib = ctx.createOscillator(); vib.frequency.value = 4.2 + Math.random(); const vg = ctx.createGain(); vg.gain.value = 4; vib.connect(vg); vib.start();
        return [-8, 8].map((dt) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.detune.value = dt; vg.connect(o.detune); o.connect(lp); o.start(); return o; });
      });
      this.chords = [[146.83, 220, 293.66, 349.23], [116.54, 174.61, 293.66, 349.23], [98, 146.83, 233.08, 293.66], [110, 164.81, 277.18, 329.63]];
      this.ci = 0; this.setChord(0, 0.01);
      return true;
    },
    setChord(i, tc = 1.4) { const c = this.chords[i % 4], t = this.ctx.currentTime; this.voices.forEach((v, k) => v.forEach((o) => o.frequency.setTargetAtTime(c[k], t, tc))); },
    toggle() {
      if (!this.ctx && !this.init()) return false;
      this.on = !this.on;
      const t = this.ctx.currentTime, g = this.master.gain;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
      if (this.on) {
        this.ctx.resume(); g.setTargetAtTime(.5, t, 1.2);
        this.timer = setInterval(() => this.setChord(++this.ci), 9000);
      } else {
        g.setTargetAtTime(0, t, .35); clearInterval(this.timer);
        setTimeout(() => { if (!this.on) this.ctx.suspend(); }, 1600);
      }
      return this.on;
    },
    bell(f = 880, vol = .07) {
      if (!this.on) return;
      const ctx = this.ctx, t = ctx.currentTime;
      [1, 2.76, 5.4].forEach((m, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f * m;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol / (i + 1), t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + 2.4 / (i + 1));
        o.connect(g).connect(this.bus); o.start(t); o.stop(t + 2.6);
      });
    },
  };
  const scale = [587.33, 659.25, 783.99, 880, 987.77, 1174.66, 1318.51]; // ré pentatonique
  const soundBtn = $('.sound');
  soundBtn?.addEventListener('click', () => {
    const on = Sound.toggle();
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.setAttribute('aria-label', on ? "Couper le son d'ambiance" : "Activer le son d'ambiance");
    if (on) setTimeout(() => Sound.bell(scale[2], .05), 300);
  });

  /* ================= 1. RÉCIT + TÉLÉPHONE 3D ================= */
  // Hauteur de scène en pixels : dans un cadre qui s'agrandit avec son contenu, les unités svh s'emballent.
  let lastW = 0, lastH = 0;
  function sizeStage(force) {
    const sh = screen.height || innerHeight;
    const h = (innerHeight > sh * 1.15 || innerHeight < 320) ? Math.min(sh, 1000) : innerHeight;
    if (!force && innerWidth === lastW && Math.abs(h - lastH) < 120) return;
    lastW = innerWidth; lastH = h;
    root.style.setProperty('--vh', h + 'px');
  }
  sizeStage(true);
  const story = $('.story'), stage = $('.stage');
  const steps = $$('.step', stage), dots = $$('.progress li', stage);
  const N = steps.length, SCREENS = N - 1;              // accueil + 5 écrans
  const screens = [1, 2, 3, 4, 5].map((i) => `img/ecran-${i}.jpg`);
  const fallback = $('.stage__fallback');
  // Deux façons de faire tourner le téléphone :
  //  - PC : le défilement de la page pilote la rotation (scène collante) ;
  //  - tactile / aperçu intégré : on glisse à gauche (suivant) ou à droite (précédent), le défilement vertical reste libre.
  let swipe = lite;
  let target = 0, current = 0, active = 0, vIdx = 0, drag = 0, swiping = false, autoTimer = 0;
  const stepOf = (v) => (v <= 0 ? 0 : 1 + ((v - 1) % SCREENS));

  function setActive(a) {
    if (a === active) return;
    steps[active].classList.remove('is-active'); dots[active].classList.remove('is-active');
    active = a;
    steps[active].classList.add('is-active'); dots[active].classList.add('is-active');
    Sound.bell(scale[active % scale.length]);
    if (fallback) fallback.src = screens[Math.max(active, 1) - 1];
  }
  function go(v) { vIdx = Math.max(0, v); setActive(stepOf(vIdx)); stage.classList.toggle('is-scrolled', vIdx > 0); }
  function stopAuto() { clearInterval(autoTimer); autoTimer = 0; }
  function applyMode() { root.classList.toggle('is-swipe', swipe); sizeStage(true); }
  applyMode();

  function readScroll() {
    $('.topbar').classList.toggle('is-solid', scrollY > 30);
    if (swipe) return;
    const r = story.getBoundingClientRect();
    const total = Math.max(1, story.offsetHeight - stage.offsetHeight);
    target = clamp(-r.top / total, 0, 1) * (N - 1);
    setActive(clamp(Math.round(target), 0, N - 1));
    stage.classList.toggle('is-scrolled', target > .15);
  }
  // Si la page ne peut pas défiler elle-même (aperçu intégré qui s'agrandit) : mode glisser + défilement automatique.
  function checkAuto() {
    const sh = screen.height || innerHeight;
    const se = document.scrollingElement || root;
    if (root.classList.contains('is-auto') || !(innerHeight > sh * 1.15 || se.scrollHeight <= innerHeight + 40)) return;
    root.classList.add('is-auto'); swipe = true; applyMode();
    autoTimer = setInterval(() => go(vIdx + 1), 4500);
  }
  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('resize', () => { sizeStage(false); readScroll(); checkAuto(); });
  addEventListener('load', () => setTimeout(checkAuto, 400));

  // glisser gauche / droite (doigt ou souris) ; touch-action: pan-y laisse le défilement vertical au navigateur
  let sx = 0, sy = 0, decided = false, pid = null;
  stage.addEventListener('pointerdown', (e) => {
    if (!swipe || e.target.closest('a, button')) return;
    sx = e.clientX; sy = e.clientY; swiping = true; decided = false; pid = e.pointerId;
  });
  stage.addEventListener('pointermove', (e) => {
    if (!swiping || e.pointerId !== pid) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!decided) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      decided = true;
      if (Math.abs(dy) > Math.abs(dx)) { swiping = false; return; }
      try { stage.setPointerCapture(pid); } catch (err) { /* rien */ }
    }
    drag = clamp(-dx / (stage.clientWidth * .6), vIdx === 0 ? 0 : -1, 1);
  });
  const endSwipe = () => {
    if (!swiping) return;
    swiping = false; const d = drag; drag = 0;
    if (d > .12) { go(vIdx + 1); stopAuto(); } else if (d < -.12) { go(vIdx - 1); stopAuto(); }
  };
  stage.addEventListener('pointerup', endSwipe);
  stage.addEventListener('pointercancel', () => { swiping = false; drag = 0; });
  $('.stage__prev')?.addEventListener('click', () => { go(vIdx - 1); stopAuto(); });
  $('.stage__next')?.addEventListener('click', () => { go(vIdx + 1); stopAuto(); });
  addEventListener('keydown', (e) => {
    if (!swipe || e.target.closest('input, textarea, .coverflow')) return;
    const r = stage.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    if (e.key === 'ArrowRight') { go(vIdx + 1); stopAuto(); } else if (e.key === 'ArrowLeft') { go(vIdx - 1); stopAuto(); }
  });

  // rotation : dos (relique) à l'accueil, puis un tour complet par écran
  function phonePose(p) {
    if (p <= 1) return { rot: Math.PI + Math.PI * smooth(.15, .85, Math.max(0, p)), screen: 0 };
    const k = Math.floor(p), f = p - k, e = smooth(.2, .8, f);
    return { rot: Math.PI * 2 * k + Math.PI * 2 * e, screen: (e < .5 ? k - 1 : k) % SCREENS };
  }

  function initScene() {
    const canvas = $('.stage__canvas');
    if (!window.THREE || !canvas) return null;
    const T = window.THREE;
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas, antialias: !lite, alpha: true, powerPreference: 'high-performance' }); }
    catch (e) { return null; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, lite ? 1.5 : 2));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setClearColor(0x000000, 0);

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(30, 1, .1, 100);
    camera.position.set(0, 0, 12);

    // environnement de reflets : un ciel doré peint en canvas
    const envC = document.createElement('canvas'); envC.width = 512; envC.height = 256;
    const g = envC.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, 256); sky.addColorStop(0, '#5a3218'); sky.addColorStop(.5, '#1c0e07'); sky.addColorStop(1, '#050302');
    g.fillStyle = sky; g.fillRect(0, 0, 512, 256);
    const blob = (x, y, r, c) => { const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, c); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, 512, 256); };
    blob(120, 55, 90, 'rgba(255,236,200,1)'); blob(300, 40, 50, 'rgba(255,255,255,.9)'); blob(410, 150, 80, 'rgba(255,138,31,.9)'); blob(30, 170, 60, 'rgba(255,59,78,.6)');
    g.fillStyle = 'rgba(255,246,230,.95)'; g.fillRect(70, 28, 80, 44); g.fillRect(330, 18, 110, 22); g.fillRect(250, 0, 10, 256);
    g.fillStyle = 'rgba(255,170,90,.8)'; g.fillRect(450, 90, 40, 120);
    const pmrem = new T.PMREMGenerator(renderer);
    const setEnv = () => {
      const envT = new T.CanvasTexture(envC); envT.mapping = T.EquirectangularReflectionMapping; envT.encoding = T.sRGBEncoding;
      const old = scene.environment; scene.environment = pmrem.fromEquirectangular(envT).texture; envT.dispose(); if (old) old.dispose();
    };
    setEnv();
    // les nuages peints se reflètent dans l'or et le verre, avec des boîtes à lumière de studio par-dessus
    const envImg = new Image();
    envImg.onload = () => {
      g.globalAlpha = .9; g.drawImage(envImg, 0, 0, 512, 256); g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,246,230,.95)'; g.fillRect(70, 28, 80, 44); g.fillRect(330, 18, 110, 22); g.fillRect(250, 0, 8, 256); g.fillRect(0, 120, 512, 3);
      g.fillStyle = 'rgba(255,170,90,.85)'; g.fillRect(450, 90, 40, 120);
      blob(410, 150, 70, 'rgba(255,138,31,.7)');
      setEnv();
    };
    envImg.src = 'img/nuages-hero.jpg';
    renderer.shadowMap.enabled = !lite;
    renderer.shadowMap.type = T.PCFSoftShadowMap;

    const loader = new T.TextureLoader();
    const tex = (url, cb) => { const t = loader.load(url, cb); t.encoding = T.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; };

    // ----- téléphone (cadre or poli, verre avant, dos en verre dépoli, bloc photo, boutons) -----
    const sw = 2.12, sh = sw / .507, BZ = .075;          // écran au format des captures, bordure fine
    const W = sw + BZ * 2, H = sh + BZ * 2, R = .44, D = .2;
    const rr = (w, h, r) => {
      const s = new T.Shape(), x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.bezierCurveTo(x + w - r * .2, y, x + w, y + r * .2, x + w, y + r);
      s.lineTo(x + w, y + h - r); s.bezierCurveTo(x + w, y + h - r * .2, x + w - r * .2, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.bezierCurveTo(x + r * .2, y + h, x, y + h - r * .2, x, y + h - r);
      s.lineTo(x, y + r); s.bezierCurveTo(x, y + r * .2, x + r * .2, y, x + r, y); return s;
    };
    const flatUV = (geo, w, h, k = 1, oy = 0) => { // UV normalisés ; k < 1 : image carrée réduite et centrée
      const p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i);
        uv.setXY(i, k === 1 ? x / w + .5 : x / (w * k) + .5, k === 1 ? y / h + .5 : (y - oy) / (w * k) + .5);
      }
      uv.needsUpdate = true; return geo;
    };
    const seg = lite ? 10 : 24;
    const phone = new T.Group();
    const goldMat = new T.MeshPhysicalMaterial({ color: 0xd8a54e, metalness: 1, roughness: .16, clearcoat: .5, clearcoatRoughness: .1 });
    const bodyGeo = new T.ExtrudeGeometry(rr(W, H, R), { depth: D, bevelEnabled: true, bevelThickness: .045, bevelSize: .045, bevelSegments: lite ? 3 : 6, curveSegments: seg });
    bodyGeo.translate(0, 0, -D / 2);
    phone.add(new T.Mesh(bodyGeo, goldMat));
    const zf = D / 2 + .045;
    // façade : verre noir, écran, île, reflets
    const front = new T.Mesh(new T.ShapeGeometry(rr(W - .03, H - .03, R - .015), seg), new T.MeshPhysicalMaterial({ color: 0x020202, metalness: 0, roughness: .05, clearcoat: 1 }));
    front.position.z = zf + .001; phone.add(front);
    const screenMat = new T.MeshBasicMaterial({ map: tex(screens[0]), toneMapped: false });
    const screen = new T.Mesh(flatUV(new T.ShapeGeometry(rr(sw, sh, R - BZ), seg), sw, sh), screenMat);
    screen.position.z = zf + .003; phone.add(screen);
    const island = new T.Mesh(new T.ShapeGeometry(rr(.64, .19, .095), 12), new T.MeshBasicMaterial({ color: 0x000000 }));
    island.position.set(0, sh / 2 - .17, zf + .005); phone.add(island);
    const lensDot = new T.Mesh(new T.CircleGeometry(.045, 16), new T.MeshPhysicalMaterial({ color: 0x0b1424, roughness: 0, clearcoat: 1 }));
    lensDot.position.set(.19, sh / 2 - .17, zf + .006); phone.add(lensDot);
    const coat = new T.Mesh(new T.ShapeGeometry(rr(W - .03, H - .03, R - .015), seg), new T.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .02, transparent: true, opacity: .07, envMapIntensity: 3, depthWrite: false }));
    coat.position.z = zf + .007; phone.add(coat);
    const shC = document.createElement('canvas'); shC.width = 256; shC.height = 512;
    const sg = shC.getContext('2d'); const lg2 = sg.createLinearGradient(0, 0, 256, 512);
    lg2.addColorStop(0, 'rgba(255,255,255,0)'); lg2.addColorStop(.44, 'rgba(255,255,255,0)'); lg2.addColorStop(.5, 'rgba(255,240,214,.13)'); lg2.addColorStop(.58, 'rgba(255,255,255,0)');
    sg.fillStyle = lg2; sg.fillRect(0, 0, 256, 512);
    let sheen = new T.Mesh(flatUV(new T.ShapeGeometry(rr(sw, sh, R - BZ), seg), sw, sh), new T.MeshBasicMaterial({ map: new T.CanvasTexture(shC), transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
    sheen.position.z = zf + .008; phone.add(sheen);
    // dos : verre dépoli bronze, logo or lumineux au centre
    const logo = tex('img/logo-or.jpg');
    logo.wrapS = logo.wrapT = T.ClampToEdgeWrapping;
    const back = new T.Mesh(flatUV(new T.ShapeGeometry(rr(W - .03, H - .03, R - .015), seg), W, H, .62, -.25),
      new T.MeshPhysicalMaterial({ color: 0x3a2410, metalness: .25, roughness: .55, clearcoat: 1, clearcoatRoughness: .3, emissive: 0xffffff, emissiveMap: logo, emissiveIntensity: 1.15 }));
    back.position.z = -zf - .001; back.rotation.y = Math.PI; phone.add(back);
    // bloc photo (vu de dos : en haut à gauche)
    const camX = W / 2 - .2 - .5, camY = H / 2 - .2 - .52;
    const plateGeo = new T.ExtrudeGeometry(rr(1, 1.04, .26), { depth: .04, bevelEnabled: true, bevelThickness: .015, bevelSize: .015, bevelSegments: 3, curveSegments: 12 });
    const plate = new T.Mesh(plateGeo, new T.MeshPhysicalMaterial({ color: 0x24160a, metalness: .4, roughness: .12, clearcoat: 1 }));
    plate.rotation.y = Math.PI; plate.position.set(camX, camY, -zf - .005); phone.add(plate);
    const ringMat = goldMat, glassMat = new T.MeshPhysicalMaterial({ color: 0x050608, metalness: .2, roughness: .02, clearcoat: 1 });
    const iris = new T.MeshPhysicalMaterial({ color: 0x1a2a4a, metalness: .6, roughness: .05, clearcoat: 1 });
    [[.2, .24], [.2, -.24], [-.22, 0]].forEach(([dx, dy]) => {
      const x = camX + dx, y = camY + dy, z = -zf - .07;
      const barrel = new T.Mesh(new T.CylinderGeometry(.17, .17, .05, 32), ringMat); barrel.rotation.x = Math.PI / 2; barrel.position.set(x, y, z); phone.add(barrel);
      const lens = new T.Mesh(new T.CircleGeometry(.135, 32), glassMat); lens.rotation.y = Math.PI; lens.position.set(x, y, z - .026); phone.add(lens);
      const eye = new T.Mesh(new T.CircleGeometry(.06, 24), iris); eye.rotation.y = Math.PI; eye.position.set(x, y, z - .027); phone.add(eye);
    });
    const flash = new T.Mesh(new T.CircleGeometry(.05, 16), new T.MeshBasicMaterial({ color: 0xfff1cc })); flash.rotation.y = Math.PI; flash.position.set(camX - .22, camY + .34, -zf - .05); phone.add(flash);
    // boutons latéraux
    const btnGeo = (h) => { const g2 = new T.CylinderGeometry(.035, .035, h, 12); return g2; };
    [[-W / 2 - .045, 1.15, .42], [-W / 2 - .045, .6, .42], [W / 2 + .045, .95, .7]].forEach(([x, y, h]) => {
      const bt = new T.Mesh(btnGeo(h), goldMat); bt.position.set(x, y, 0); phone.add(bt);
    });
    // ----- modèle 3D détaillé (remplace le téléphone dessiné dès qu'il est chargé) -----
    const composeScreen = (img, aspect) => { // capture + barre d'état sous l'encoche, au format exact de l'écran
      const cw = 640, ch = Math.round(cw / aspect), c = document.createElement('canvas'); c.width = cw; c.height = ch;
      const x = c.getContext('2d'), iw = cw * 1.07, ih = iw * img.height / img.width, top = ch - ih;
      x.drawImage(img, 0, 0, img.width, 2, 0, 0, cw, top + 2);            // prolonge le haut de l'écran
      x.drawImage(img, (cw - iw) / 2, top, iw, ih);
      x.fillStyle = '#fff'; x.font = '600 30px -apple-system, "Segoe UI", Roboto, sans-serif'; x.textBaseline = 'middle';
      const y = Math.max(28, top * .55); x.fillText('9:41', 62, y);
      [0, 1, 2, 3].forEach((i) => x.fillRect(470 + i * 9, y + 8 - (i + 1) * 4.5, 6, (i + 1) * 4.5));
      x.strokeStyle = '#fff'; x.lineWidth = 2.5; x.beginPath(); x.roundRect ? x.roundRect(518, y - 10, 46, 21, 6) : x.rect(518, y - 10, 46, 21); x.stroke();
      x.fillRect(521.5, y - 6.5, 34, 14); x.fillRect(566, y - 4, 3, 8);
      const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
    };
    let modelReady = false;
    Promise.all([fetch('models/phone.json').then((r) => r.json()), fetch('models/phone.bin').then((r) => r.arrayBuffer())]).then(([meta, buf]) => {
      const mats = {
        frame: goldMat,
        glassFront: new T.MeshPhysicalMaterial({ color: 0x030303, metalness: .1, roughness: .04, clearcoat: 1, clearcoatRoughness: .02 }),
        glassBack: new T.MeshPhysicalMaterial({ color: 0x160c05, metalness: .55, roughness: .32, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1.1 }),
        screen: screenMat,
        lens: new T.MeshPhysicalMaterial({ color: 0x05070d, metalness: .6, roughness: .02, clearcoat: 1, envMapIntensity: 2 }),
        flash: new T.MeshPhysicalMaterial({ color: 0xfff1d0, roughness: .3, emissive: 0x332a18 }),
      };
      const model = new T.Group();
      let screenGeo = null;
      for (const m of meta.meshes) {
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(new Float32Array(buf, m.position[0], m.position[1] / 4), 3));
        geo.setAttribute('normal', new T.BufferAttribute(new Int8Array(buf, m.normal[0], m.normal[1]), 3, true));
        if (m.uv) geo.setAttribute('uv', new T.BufferAttribute(new Float32Array(buf, m.uv[0], m.uv[1] / 4), 2));
        geo.setIndex(new T.BufferAttribute(m.index32 ? new Uint32Array(buf, m.index[0], m.index[1] / 4) : new Uint16Array(buf, m.index[0], m.index[1] / 2), 1));
        const mesh = new T.Mesh(geo, mats[m.role] || goldMat);
        mesh.castShadow = mesh.receiveShadow = !lite && m.role !== 'screen';
        if (m.role === 'screen') { screenGeo = geo; mesh.position.z = .001; }
        model.add(mesh);
      }
      // reflet mobile sur la vitre + logo or incrusté au dos
      const newSheen = new T.Mesh(screenGeo, sheen.material); newSheen.position.z = .004; model.add(newSheen);
      const decal = new T.Mesh(new T.PlaneGeometry(1.25, 1.25), new T.MeshBasicMaterial({ map: tex('img/logo-or.png'), transparent: true, depthWrite: false, toneMapped: false }));
      decal.rotation.y = Math.PI; decal.position.set(0, -.3, meta.backZ - .003); model.add(decal);
      // écrans recomposés au format de l'écran du modèle
      const aspect = meta.screenSize[0] / meta.screenSize[1];
      screens.forEach((u, i) => { const im = new Image(); im.onload = () => { screenTex[i] = composeScreen(im, aspect); if (i === shown) { screenMat.map = screenTex[i]; screenMat.needsUpdate = true; } }; im.src = u; });
      while (phone.children.length) phone.remove(phone.children[0]);
      phone.add(model); sheen = newSheen; modelReady = true;
    }).catch((err) => console.warn('Modèle 3D non chargé, téléphone simplifié conservé :', err));

    // ----- auréole, inscription, rayons -----
    const relic = new T.Group(); relic.add(phone);
    const haloMat = new T.MeshBasicMaterial({ color: 0xe9be62, toneMapped: false });
    const halo1 = new T.Mesh(new T.TorusGeometry(3.25, .014, 8, 160), haloMat);
    const halo2 = new T.Mesh(new T.TorusGeometry(3.55, .006, 8, 160), new T.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: .7, toneMapped: false }));
    halo1.position.z = halo2.position.z = -1.4; relic.add(halo1, halo2);

    const insC = document.createElement('canvas'); insC.width = insC.height = 1024;
    const ig = insC.getContext('2d'); ig.translate(512, 512);
    ig.fillStyle = 'rgba(233,190,98,.95)'; ig.font = '600 46px Cinzel, "Times New Roman", serif'; ig.textAlign = 'center'; ig.textBaseline = 'middle';
    const motto = 'MENS SANA IN CORPORE SANO  ✦  MENS SANA IN CORPORE SANO  ✦  ';
    [...motto].forEach((ch, i) => { ig.save(); ig.rotate((i / motto.length) * Math.PI * 2); ig.fillText(ch, 0, -440); ig.restore(); });
    const inscription = new T.Mesh(new T.PlaneGeometry(7, 7), new T.MeshBasicMaterial({ map: new T.CanvasTexture(insC), transparent: true, opacity: .42, depthWrite: false, toneMapped: false }));
    inscription.position.z = -1.6; relic.add(inscription);

    const rayC = document.createElement('canvas'); rayC.width = rayC.height = 512;
    const rg = rayC.getContext('2d'); rg.translate(256, 256);
    for (let i = 0; i < 36; i++) {
      rg.rotate(Math.PI * 2 / 36);
      const gr = rg.createLinearGradient(0, 0, 0, -256); gr.addColorStop(0, 'rgba(255,200,120,.55)'); gr.addColorStop(1, 'rgba(255,140,40,0)');
      rg.fillStyle = gr; rg.beginPath(); rg.moveTo(0, 0); const wdt = i % 3 ? 6 : 14; rg.lineTo(-wdt, -256); rg.lineTo(wdt, -256); rg.fill();
    }
    const rays = new T.Mesh(new T.PlaneGeometry(15, 15), new T.MeshBasicMaterial({ map: new T.CanvasTexture(rayC), transparent: true, opacity: .32, blending: T.AdditiveBlending, depthWrite: false }));
    rays.position.z = -3; relic.add(rays);
    scene.add(relic);

    // ----- poussière dorée -----
    const count = lite ? 160 : 700;
    const pos = new Float32Array(count * 3), speed = new Float32Array(count);
    for (let i = 0; i < count; i++) { pos[i * 3] = (Math.random() - .5) * 18; pos[i * 3 + 1] = (Math.random() - .5) * 11; pos[i * 3 + 2] = (Math.random() - .5) * 8 - 1; speed[i] = .002 + Math.random() * .006; }
    const dustGeo = new T.BufferGeometry(); dustGeo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const dotC = document.createElement('canvas'); dotC.width = dotC.height = 64;
    const dg = dotC.getContext('2d'); const dgr = dg.createRadialGradient(32, 32, 0, 32, 32, 32); dgr.addColorStop(0, 'rgba(255,230,180,1)'); dgr.addColorStop(.3, 'rgba(255,170,80,.6)'); dgr.addColorStop(1, 'rgba(255,120,30,0)');
    dg.fillStyle = dgr; dg.fillRect(0, 0, 64, 64);
    const dust = new T.Points(dustGeo, new T.PointsMaterial({ size: .09, map: new T.CanvasTexture(dotC), transparent: true, blending: T.AdditiveBlending, depthWrite: false, color: 0xffd9a0 }));
    scene.add(dust);

    // ----- nuages en volume (PC uniquement) -----
    const clouds = [];
    if (!lite) {
      const ct = tex('img/nuages-2.jpg');
      [[-7, .45, 18], [-4.5, .3, 15], [3.2, .22, 14]].forEach(([z, op, s], i) => {
        const m = new T.Mesh(new T.PlaneGeometry(s, s * .62), new T.MeshBasicMaterial({ map: ct, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false }));
        m.position.set(i === 2 ? 5 : 0, i === 2 ? -3.2 : -1, z); if (i === 1) m.rotation.z = Math.PI; scene.add(m); clouds.push(m);
      });
    }

    // ----- lumières -----
    const key = new T.DirectionalLight(0xffe0b0, 1.4); key.position.set(-4, 5, 6); scene.add(key);
    if (!lite) {
      key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -.0004; key.shadow.normalBias = .02;
      Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 }); key.target = phone;
    }
    const neon = new T.PointLight(0xff8a1f, 1.5, 14); neon.position.set(3.5, -3, 4); scene.add(neon);
    const red = new T.PointLight(0xff3b4e, 1.4, 12); red.position.set(-3, 2, -2); scene.add(red);
    const rim = new T.DirectionalLight(0xffd9a0, 1.1); rim.position.set(2, 3, -6); scene.add(rim);

    // précharge les autres écrans
    const screenTex = [screenMat.map];
    screens.slice(1).forEach((u, i) => { screenTex[i + 1] = tex(u); });
    let shown = 0;

    let mx = 0, my = 0, tmx = 0, tmy = 0, baseX = 0, baseY = 0, baseS = 1;
    if (finePointer) addEventListener('pointermove', (e) => { tmx = e.clientX / innerWidth - .5; tmy = e.clientY / innerHeight - .5; }, { passive: true });

    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      const vh = 2 * camera.position.z * Math.tan(T.MathUtils.degToRad(15)), vw = vh * camera.aspect;
      if (w < 760) { baseX = 0; baseY = vh * .17; baseS = Math.min(.56, vw / 6.4); }
      else { baseX = vw * .23; baseY = -.1; baseS = clamp(vh / 6.6, .8, 1.05); }
    }
    resize(); addEventListener('resize', resize);

    let running = false, t0 = performance.now();
    function frame(now) {
      if (!running) return;
      const t = (now - t0) / 1000;
      const goal = swipe ? vIdx + drag : target;   // glisser : le téléphone suit le doigt puis se pose sur l'écran suivant
      current += (goal - current) * (reduced ? 1 : swipe ? (swiping ? .3 : .065) : .085);
      mx += (tmx - mx) * .05; my += (tmy - my) * .05;
      const pose = phonePose(current);
      if (pose.screen !== shown) { shown = pose.screen; screenMat.map = screenTex[shown]; screenMat.needsUpdate = true; }
      const float = reduced ? 0 : Math.sin(t * .8) * .09;
      relic.position.set(baseX, baseY + float, 0); relic.scale.setScalar(baseS);
      phone.rotation.set(my * .22, pose.rot + mx * .35, reduced ? 0 : Math.sin(t * .5) * .03);
      sheen.material.opacity = .55 + .45 * Math.sin(pose.rot * 2 + 1);
      if (!reduced) {
        halo1.rotation.set(Math.sin(t * .3) * .25 + .15, Math.cos(t * .25) * .2, 0);
        halo2.rotation.set(-.2 + Math.sin(t * .2) * .15, Math.sin(t * .35) * .25, 0);
        inscription.rotation.z = -t * .05; rays.rotation.z = t * .025;
        for (let i = 0; i < count; i++) { let y = pos[i * 3 + 1] + speed[i]; if (y > 5.5) y = -5.5; pos[i * 3 + 1] = y; pos[i * 3] += Math.sin(t + i) * .0015; }
        dustGeo.attributes.position.needsUpdate = true;
        clouds.forEach((c, i) => { c.position.x = (i === 2 ? 5 : 0) + Math.sin(t * .05 + i * 2) * 1.2 - mx * (i + 1) * .6; });
      }
      camera.position.x = mx * .5; camera.position.y = -my * .3; camera.lookAt(baseX * .3, 0, 0);
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    const setRunning = (v) => { if (v && !running) { running = true; requestAnimationFrame(frame); } else if (!v) running = false; };
    let inView = true;
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; setRunning(inView && !document.hidden); }).observe(story);
    document.addEventListener('visibilitychange', () => setRunning(inView && !document.hidden));
    setRunning(true);
    return true;
  }

  const ok = (() => { try { return initScene(); } catch (e) { console.warn('3D indisponible :', e); return null; } })();
  if (!ok) root.classList.add('no-webgl');
  readScroll();

  // parallaxe du ciel peint
  if (finePointer && !reduced) addEventListener('pointermove', (e) => {
    stage.style.setProperty('--mx', (e.clientX / innerWidth - .5).toFixed(3));
    stage.style.setProperty('--my', (e.clientY / innerHeight - .5).toFixed(3));
  }, { passive: true });

  /* ================= 2. GALERIE EN ARC 3D ================= */
  // Sans défilement natif : une position animée par ressort, seules les transformations bougent (fluide, même au doigt).
  const track = $('.coverflow__track');
  if (track) {
    const figs = $$('figure', track), n = figs.length;
    let pos = 3, goal = 3, vel = 0, center = -1, raf = 0, dragging = null;
    const spacing = () => figs[0].offsetWidth * (innerWidth < 760 ? .7 : .62);
    function layout() {
      const sp = spacing();
      figs.forEach((f, i) => {
        const d = i - pos, a = Math.abs(d), c = clamp(d, -2.2, 2.2);
        f.style.transform = `translate3d(${d * sp}px, 0, ${-Math.min(a, 3) * 160}px) rotateY(${-c * 36}deg) scale(${1 - Math.min(a, 2) * .05})`;
        f.style.zIndex = String(100 - Math.round(a * 10));
        f.style.opacity = String(clamp(1.4 - a * .32, 0, 1));
      });
      const ci = clamp(Math.round(pos), 0, n - 1);
      if (ci !== center) {
        center = ci;
        figs.forEach((x, i) => { x.classList.toggle('is-center', i === ci); x.setAttribute('aria-hidden', String(i !== ci)); });
        Sound.bell(scale[ci % scale.length] / 2, .035);
      }
    }
    function tick() {
      if (!dragging) {
        if (reduced) { pos = goal; vel = 0; }
        else { vel = vel * .72 + (goal - pos) * .09; pos += vel; }  // ressort amorti
      }
      layout();
      if (dragging || Math.abs(goal - pos) > .0005 || Math.abs(vel) > .0005) raf = requestAnimationFrame(tick);
      else { pos = goal; layout(); raf = 0; }
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const goTo = (i) => { goal = clamp(i, 0, n - 1); kick(); };
    $('.coverflow__nav--prev').addEventListener('click', () => goTo(Math.round(goal) - 1));
    $('.coverflow__nav--next').addEventListener('click', () => goTo(Math.round(goal) + 1));
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(Math.round(goal) - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(Math.round(goal) + 1); }
    });
    // glisser au doigt ou à la souris (le défilement vertical reste libre grâce à touch-action: pan-y)
    track.addEventListener('pointerdown', (e) => {
      dragging = { x: e.clientX, y: e.clientY, p: pos, lx: e.clientX, lt: performance.now(), v: 0, decided: false, moved: false, id: e.pointerId };
    });
    track.addEventListener('pointermove', (e) => {
      const d = dragging; if (!d || e.pointerId !== d.id) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.decided) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        d.decided = true;
        if (Math.abs(dy) > Math.abs(dx)) { dragging = null; return; }
        try { track.setPointerCapture(d.id); } catch (err) { /* rien */ }
        kick();
      }
      d.moved = true;
      const now = performance.now(), sp = spacing();
      d.v = (e.clientX - d.lx) / Math.max(1, now - d.lt) / sp * 16;   // vitesse en positions par image
      d.lx = e.clientX; d.lt = now;
      pos = clamp(d.p - dx / sp, -.4, n - .6);
    });
    const release = () => {
      const d = dragging; if (!d) return; dragging = null;
      if (!d.moved) { kick(); return; }
      goTo(Math.round(pos - d.v * 6)); vel = -d.v * .5;
    };
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);
    track.addEventListener('click', (e) => {
      const f = e.target.closest('figure'); if (!f) return;
      const i = figs.indexOf(f); if (i !== Math.round(goal)) goTo(i);
    });
    track.addEventListener('dragstart', (e) => e.preventDefault());
    addEventListener('resize', layout);
    layout();
  }

  /* ================= 3. INCLINAISON 3D AU SURVOL ================= */
  if (finePointer && !reduced) {
    $$('.column, .tilt').forEach((el, i) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        el.style.transform = `rotateX(${-y * 10}deg) rotateY(${x * 14}deg) translateZ(14px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
      if (el.classList.contains('column')) el.addEventListener('pointerenter', () => Sound.bell(scale[i % scale.length], .045));
    });
  }

  /* ================= 4. CURSEUR HALO ================= */
  const cursor = $('.cursor');
  if (cursor && finePointer) {
    root.classList.add('has-cursor');
    const ring = $('.cursor__ring', cursor), dot = $('.cursor__dot', cursor);
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; dot.style.transform = `translate(${x}px, ${y}px)`; cursor.style.opacity = '1'; }, { passive: true });
    document.addEventListener('pointerleave', () => { cursor.style.opacity = '0'; });
    addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    addEventListener('pointerup', () => cursor.classList.remove('is-down'));
    document.addEventListener('pointerover', (e) => cursor.classList.toggle('is-hover', !!e.target.closest('a, button, summary, .coverflow figure, .column, .tilt')));
    const loop = () => { rx += (x - rx) * (reduced ? 1 : .18); ry += (y - ry) * (reduced ? 1 : .18); ring.style.transform = `translate(${rx}px, ${ry}px)`; requestAnimationFrame(loop); };
    loop();
  }

  /* ================= 6. APPARITION DOUCE ================= */
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: .1 });
    $$('.temple__title, .pediment-wrap, .entablature, .extra, #reliques > .eyebrow, #reliques > h2, .vault, .faq-wrap__head, .faq details').forEach((el) => {
      if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('reveal'); io.observe(el); }
    });
  }
})();
