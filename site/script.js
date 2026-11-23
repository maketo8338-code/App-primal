// Apparition douce des blocs au défilement + léger parallaxe des écrans flottants.
(() => {
  const els = document.querySelectorAll('.section > *, .pillars li, .extra');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach((el) => { el.classList.add('reveal'); io.observe(el); });
  }

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const floaters = document.querySelectorAll('.floater');
  addEventListener('pointermove', (e) => {
    const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
    floaters.forEach((f, i) => { f.style.translate = `${x * (i ? -18 : 18)}px ${y * (i ? -14 : 14)}px`; });
  }, { passive: true });
})();
