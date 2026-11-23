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
  const story = $('.story'), stage = $('.stage');
  const steps = $$('.step', stage), dots = $$('.progress li', stage);
  const N = steps.length;
  const screens = [1, 2, 3, 4, 5].map((i) => `img/ecran-${i}.jpg`);
  let target = 0, current = 0, active = 0;

  function readScroll() {
    const r = story.getBoundingClientRect();
    const total = story.offsetHeight - innerHeight;
    target = clamp(-r.top / total, 0, 1) * (N - 1);
    const a = clamp(Math.round(target), 0, N - 1);
    if (a !== active) {
      steps[active].classList.remove('is-active'); dots[active].classList.remove('is-active');
      active = a;
      steps[active].classList.add('is-active'); dots[active].classList.add('is-active');
      Sound.bell(scale[active % scale.length]);
      if (fallback) fallback.src = screens[Math.max(active, 1) - 1];
    }
    stage.classList.toggle('is-scrolled', target > .15);
    $('.topbar').classList.toggle('is-solid', scrollY > 30);
  }
  const fallback = $('.stage__fallback');
  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('resize', readScroll);

  // rotation du téléphone : dos (relique) à l'accueil, puis un tour complet par étape
  function phonePose(p) {
    if (p <= 1) return { rot: Math.PI + Math.PI * smooth(.15, .85, p), screen: 0 };
    const k = Math.floor(p), f = p - k, e = smooth(.2, .8, f);
    return { rot: Math.PI * 2 * k + Math.PI * 2 * e, screen: clamp(e < .5 ? k - 1 : k, 0, 4) };
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
    const envT = new T.CanvasTexture(envC); envT.mapping = T.EquirectangularReflectionMapping; envT.encoding = T.sRGBEncoding;
    const pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(envT).texture;

    const loader = new T.TextureLoader();
    const tex = (url, cb) => { const t = loader.load(url, cb); t.encoding = T.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; };

    // ----- téléphone -----
    const W = 2.3, H = W / .507, R = .36, D = .22;
    const rr = (w, h, r) => {
      const s = new T.Shape(), x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
    };
    const flatUV = (geo, w, h, square) => { // UV normalisés (square : image carrée centrée)
      const p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i);
        uv.setXY(i, x / w + .5, square ? y / w + .5 : y / h + .5);
      }
      uv.needsUpdate = true; return geo;
    };
    const phone = new T.Group();
    const bodyGeo = new T.ExtrudeGeometry(rr(W, H, R), { depth: D, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: lite ? 2 : 5, curveSegments: lite ? 8 : 18 });
    bodyGeo.translate(0, 0, -D / 2);
    const goldMat = new T.MeshStandardMaterial({ color: 0xd9a441, metalness: 1, roughness: .26 });
    phone.add(new T.Mesh(bodyGeo, goldMat));
    const zf = D / 2 + .05;
    const glass = new T.Mesh(new T.ShapeGeometry(rr(W - .04, H - .04, R - .02), 16), new T.MeshStandardMaterial({ color: 0x030303, metalness: .3, roughness: .08 }));
    glass.position.z = zf + .002; phone.add(glass);
    const sw = W - .17, sh = H - .17;
    const screenMat = new T.MeshBasicMaterial({ map: tex(screens[0]), toneMapped: false });
    const screen = new T.Mesh(flatUV(new T.ShapeGeometry(rr(sw, sh, R - .09), 16), sw, sh), screenMat);
    screen.position.z = zf + .004; phone.add(screen);
    // reflet sur la vitre
    const shC = document.createElement('canvas'); shC.width = 256; shC.height = 512;
    const sg = shC.getContext('2d'); const lg2 = sg.createLinearGradient(0, 0, 256, 512);
    lg2.addColorStop(0, 'rgba(255,255,255,0)'); lg2.addColorStop(.42, 'rgba(255,255,255,0)'); lg2.addColorStop(.5, 'rgba(255,240,214,.16)'); lg2.addColorStop(.6, 'rgba(255,255,255,0)');
    sg.fillStyle = lg2; sg.fillRect(0, 0, 256, 512);
    const sheen = new T.Mesh(flatUV(new T.ShapeGeometry(rr(sw, sh, R - .09), 16), sw, sh), new T.MeshBasicMaterial({ map: new T.CanvasTexture(shC), transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
    sheen.position.z = zf + .006; phone.add(sheen);
    // dos : le logo or qui rayonne
    const logo = tex('img/logo-or.jpg');
    logo.wrapS = logo.wrapT = T.ClampToEdgeWrapping;
    const back = new T.Mesh(flatUV(new T.ShapeGeometry(rr(W - .06, H - .06, R - .03), 16), W - .06, H - .06, true),
      new T.MeshStandardMaterial({ color: 0x140b05, metalness: .7, roughness: .35, emissive: 0xffffff, emissiveMap: logo, emissiveIntensity: 1.25 }));
    back.position.z = -zf - .002; back.rotation.y = Math.PI; phone.add(back);
    const lensMat = new T.MeshStandardMaterial({ color: 0x050505, metalness: .5, roughness: .05 });
    [[.55, 1.85], [.55, 1.35]].forEach(([dx, dy]) => {
      const lens = new T.Mesh(new T.CylinderGeometry(.17, .17, .07, 28), lensMat);
      lens.rotation.x = Math.PI / 2; lens.position.set(W / 2 - dx, dy, -zf - .03); phone.add(lens);
      const ring = new T.Mesh(new T.TorusGeometry(.18, .022, 8, 32), goldMat);
      ring.position.set(W / 2 - dx, dy, -zf - .06); phone.add(ring);
    });

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
    const key = new T.DirectionalLight(0xffe0b0, 1.3); key.position.set(-4, 5, 6); scene.add(key);
    const neon = new T.PointLight(0xff8a1f, 2.2, 14); neon.position.set(3, -2, 3); scene.add(neon);
    const red = new T.PointLight(0xff3b4e, 1.4, 12); red.position.set(-3, 2, -2); scene.add(red);

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
      current += (target - current) * (reduced ? 1 : .085);
      mx += (tmx - mx) * .05; my += (tmy - my) * .05;
      const pose = phonePose(current);
      if (pose.screen !== shown) { shown = pose.screen; screenMat.map = screenTex[shown]; screenMat.needsUpdate = true; }
      const float = reduced ? 0 : Math.sin(t * .8) * .09;
      relic.position.set(baseX, baseY + float, 0); relic.scale.setScalar(baseS);
      phone.rotation.set(my * .22, pose.rot + mx * .35, reduced ? 0 : Math.sin(t * .5) * .03);
      sheen.material.opacity = .6 + .4 * Math.sin(pose.rot * 2);
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
  const track = $('.coverflow__track');
  if (track) {
    const figs = $$('figure', track);
    let centerIdx = -1;
    const layout = () => {
      const mid = track.scrollLeft + track.clientWidth / 2;
      figs.forEach((f, i) => {
        const d = (f.offsetLeft + f.offsetWidth / 2 - mid) / (f.offsetWidth * .78);
        const a = Math.abs(d), c = clamp(d, -2.5, 2.5);
        f.style.transform = `translateZ(${-Math.min(a, 3) * 150}px) rotateY(${-c * 34}deg) scale(${1 - Math.min(a, 2) * .06})`;
        f.style.zIndex = String(100 - Math.round(a * 10));
        f.style.opacity = String(clamp(1.35 - a * .3, .25, 1));
        if (a < .5 && centerIdx !== i) { centerIdx = i; figs.forEach((x) => x.classList.toggle('is-center', x === f)); Sound.bell(scale[i % scale.length] / 2, .04); }
      });
    };
    const go = (i) => { const f = figs[clamp(i, 0, figs.length - 1)]; track.scrollTo({ left: f.offsetLeft + f.offsetWidth / 2 - track.clientWidth / 2, behavior: reduced ? 'auto' : 'smooth' }); };
    track.addEventListener('scroll', () => requestAnimationFrame(layout), { passive: true });
    addEventListener('resize', layout);
    $('.coverflow__nav--prev').addEventListener('click', () => go(centerIdx - 1));
    $('.coverflow__nav--next').addEventListener('click', () => go(centerIdx + 1));
    track.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); go(centerIdx - 1); } if (e.key === 'ArrowRight') { e.preventDefault(); go(centerIdx + 1); } });
    figs.forEach((f, i) => f.addEventListener('click', () => { if (i !== centerIdx) go(i); }));
    // glisser à la souris
    let drag = null;
    track.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; drag = { x: e.clientX, s: track.scrollLeft, moved: false }; track.style.scrollSnapType = 'none'; });
    addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 4) drag.moved = true; track.scrollLeft = drag.s - dx; });
    addEventListener('pointerup', () => { if (!drag) return; track.style.scrollSnapType = ''; const m = drag.moved; drag = null; if (m) go(centerIdx); });
    track.addEventListener('dragstart', (e) => e.preventDefault());
    const start = () => { const f = figs[3]; track.scrollLeft = f.offsetLeft + f.offsetWidth / 2 - track.clientWidth / 2; layout(); };
    if (document.readyState === 'complete') start(); else addEventListener('load', start);
    start();
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
