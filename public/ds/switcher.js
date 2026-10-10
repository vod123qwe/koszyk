// Koszyk DS: Switcher — one choice out of a few, in a pill: ‹ name ›. Tap an arrow, or grab the pill and swipe (it follows the finger
// with a rubber band and springs back; past 44 px it steps); the name slides in from the side it came from. A tap on the name grows the
// pill into a panel with every option (a morph), the options rise in one by one; a pick, Esc or a tap outside folds it back.
// Ported from the lab's variants pill (LabUI.variants), opening downwards here because the pill sits at the top.
//   switcher(pill, { prev, next, name, onStep: d => …, items: () => [{ id, html, selected }], onPick: id => …, footer: { html, onClick } })
export function switcher(pill, o) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, drag = { id: null, x0: 0, dx: 0, moved: false };
  const C = { band: .45, threshold: 44, back: 550, bounce: 1.6, morph: 480, overshoot: 1.04, radius: 22, stagger: 30 };
  const band = dx => dx * C.band / (1 + Math.abs(dx) / 160);
  const flash = d => { if (!reduce && o.name && o.name.animate) o.name.animate([{ transform: `translateX(${d * 14}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' }); };
  const step = d => { o.onStep(d); flash(d); };
  pill.addEventListener('pointerdown', e => { if (e.button !== 0) return; drag.id = e.pointerId; drag.x0 = e.clientX; drag.dx = 0; drag.moved = false; pill.style.transition = 'none'; });
  pill.addEventListener('pointermove', e => {
    if (e.pointerId !== drag.id) return; drag.dx = e.clientX - drag.x0;
    if (!drag.moved && Math.abs(drag.dx) > 6) { drag.moved = true; pill.classList.add('dragging'); try { pill.setPointerCapture(e.pointerId); } catch (err) { } if (isOpen) close(true); }
    if (drag.moved) pill.style.transform = `translateX(${band(drag.dx)}px) scale(${1 + Math.min(Math.abs(drag.dx), 200) / 4000})`;
  });
  const end = e => { if (e.pointerId !== drag.id) return; drag.id = null; pill.classList.remove('dragging');
    pill.style.transition = reduce ? 'none' : `transform ${C.back}ms cubic-bezier(.2,${C.bounce},.4,1)`; pill.style.transform = '';
    if (drag.moved && Math.abs(drag.dx) > C.threshold) step(drag.dx < 0 ? 1 : -1);
    setTimeout(() => { drag.moved = false; }, 0); };
  pill.addEventListener('pointerup', end); pill.addEventListener('pointercancel', end);
  o.prev && o.prev.addEventListener('click', () => { if (!drag.moved) step(-1); });
  o.next && o.next.addEventListener('click', () => { if (!drag.moved) step(1); });

  // ---------- the panel: the pill grows down into it ----------
  let menu = null, isOpen = false, anim = null;
  const nameEl = o.name;
  function close(instant) { if (!isOpen) return; isOpen = false; pill.classList.remove('open'); nameEl && nameEl.setAttribute('aria-expanded', 'false');
    const m = menu; if (!m) return; if (anim) anim.cancel();
    if (instant || reduce) { m.remove(); if (menu === m) menu = null; return; }
    anim = m.animate([{ clipPath: m.dataset.to }, { clipPath: m.dataset.from }], { duration: Math.round(C.morph * .6), easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    m.querySelectorAll('.sw-opt').forEach(b => b.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' }));
    anim.onfinish = () => { m.remove(); if (menu === m) menu = null; }; }
  function open() { if (isOpen || !o.items) return; const items = o.items(); if (!items.length) return; isOpen = true; menu && menu.remove();
    const host = pill.parentNode, pw = pill.offsetWidth, ph = pill.offsetHeight, row = 52, padB = 8, foot = o.footer ? 52 : 0;
    const W = Math.max(pw, 300), H = ph + 6 + items.length * row + foot + padB, L = pill.offsetLeft + pw / 2 - W / 2, T = pill.offsetTop;
    const m = menu = document.createElement('div'); m.className = 'sw-menu'; m.setAttribute('role', 'listbox');
    Object.assign(m.style, { left: Math.max(0, L) + 'px', top: T + 'px', width: W + 'px', height: H + 'px' });
    const list = document.createElement('div'); list.className = 'sw-list'; list.style.paddingTop = (ph + 6) + 'px'; m.appendChild(list);
    items.forEach((it, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'sw-opt'; b.setAttribute('role', 'option'); b.setAttribute('aria-selected', String(!!it.selected));
      b.innerHTML = it.html; b.addEventListener('click', () => { close(); if (!it.selected) { o.onPick(it.id); flash(1); } });
      list.appendChild(b); if (!reduce) b.animate([{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 340, delay: 80 + i * C.stagger, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'backwards' }); });
    if (o.footer) { const f = document.createElement('button'); f.type = 'button'; f.className = 'sw-opt sw-foot'; f.innerHTML = o.footer.html; f.addEventListener('click', () => { close(); o.footer.onClick(); }); list.appendChild(f); }
    host.insertBefore(m, pill);
    const left = Math.max(0, L), x0 = pill.offsetLeft - left;
    m.dataset.from = `inset(0px ${W - x0 - pw}px ${H - ph}px ${x0}px round ${ph / 2}px)`; m.dataset.to = `inset(0px 0px 0px 0px round ${C.radius}px)`;
    pill.classList.add('open'); nameEl && nameEl.setAttribute('aria-expanded', 'true');
    if (!reduce) anim = m.animate([{ clipPath: m.dataset.from }, { clipPath: m.dataset.to }], { duration: C.morph, easing: `cubic-bezier(.2,.9,.25,${C.overshoot})`, fill: 'forwards' });
    (list.querySelector('[aria-selected=true]') || list.firstChild).focus({ preventScroll: true }); }
  if (o.items && nameEl) {
    nameEl.setAttribute('role', 'button'); nameEl.tabIndex = 0; nameEl.setAttribute('aria-haspopup', 'listbox'); nameEl.setAttribute('aria-expanded', 'false');
    nameEl.addEventListener('click', () => { if (drag.moved) return; isOpen ? close() : open(); });
    nameEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isOpen ? close() : open(); } });
    document.addEventListener('pointerdown', e => { if (isOpen && !menu?.contains(e.target) && !nameEl.contains(e.target)) close(); }, true);
    addEventListener('keydown', e => { if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); nameEl.focus(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const bs = [...menu.querySelectorAll('.sw-opt')], i = bs.indexOf(document.activeElement); bs[(i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length].focus(); } }, true); }
  return { flash, open, close, get isOpen() { return isOpen; } };
}
