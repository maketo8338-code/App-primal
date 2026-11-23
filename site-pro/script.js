// Les vidéos ne se chargent et ne jouent que lorsqu'elles sont visibles (économie de données et de batterie).
// Si la lecture est bloquée (mode économie d'énergie), l'image d'aperçu reste affichée.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const vids = [...document.querySelectorAll('.phone video')];
  const play = (v) => {
    if (reduced) return;
    if (v.dataset.src && !v.src) { v.src = v.dataset.src; v.preload = 'auto'; }
    v.play().catch(() => {});
  };
  if (!('IntersectionObserver' in window)) { vids.forEach(play); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? play(e.target) : e.target.pause()));
  }, { threshold: 0.25 });
  vids.forEach((v) => { if (reduced) v.removeAttribute('autoplay'); io.observe(v); });
})();

// Le téléphone de l'accueil suit légèrement la souris ; le reflet glisse sur la vitre.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(pointer: fine)').matches) return;
  const hero = document.querySelector('.hero'), ph = hero && hero.querySelector('.phone');
  if (!ph) return;
  let raf = 0;
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      ph.style.setProperty('--ry', (-14 + x * 18).toFixed(2) + 'deg');
      ph.style.setProperty('--rx', (4 - y * 10).toFixed(2) + 'deg');
      ph.style.setProperty('--sx', (x * 40).toFixed(1) + '%');
    });
  });
  hero.addEventListener('pointerleave', () => { ['--ry', '--rx', '--sx'].forEach((p) => ph.style.removeProperty(p)); });
})();
