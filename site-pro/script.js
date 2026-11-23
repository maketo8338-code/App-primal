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
