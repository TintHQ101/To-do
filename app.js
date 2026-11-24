import { view, progress, staleIds, newTask } from './logic.js';
import { LocalStore, initFirebase } from './store.js';
import { firebaseConfig } from './firebase-config.js';

const $ = (id) => document.getElementById(id);
const root = document.documentElement;

// ---------- theme toggle ----------
function setTheme(t) {
  root.dataset.theme = t;
  try { localStorage.setItem('todo-theme', t); } catch (e) {}
  document.querySelector('meta[name="theme-color"]').content = t === 'light' ? '#eef0f3' : '#0b0c0e';
  $('themeBtn').setAttribute('aria-label', t === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
}
setTheme(root.dataset.theme === 'light' ? 'light' : 'dark');
$('themeBtn').addEventListener('click', () => setTheme(root.dataset.theme === 'light' ? 'dark' : 'light'));

// ---------- data ----------
let tasks = [];
let store = null;
let unsubscribe = null;
let celebrateNext = false;
let wasClear = false;

function useStore(s) {
  if (unsubscribe) unsubscribe();
  store = s;
  unsubscribe = s.subscribe((list) => {
    tasks = list;
    render();
    for (const id of staleIds(tasks)) store.remove(id);
  }, (err) => toast(`Sync error: ${err.message}`));
}

// ---------- render ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const itemHTML = (t) => `<li class="item${t.done ? ' is-done' : ''}" data-id="${esc(t.id)}">
    <div class="del-bg">Delete</div>
    <div class="row glass">
      <button class="check" type="button" aria-label="${t.done ? 'Mark not done' : 'Mark done'}">${CHECK}</button>
      <div class="txt"><p class="title">${esc(t.title)}</p><p class="note">${esc(t.note || '')}</p></div>
    </div></li>`;

function render() {
  const { open, doneToday } = view(tasks);
  const p = progress(open, doneToday);
  $('list').innerHTML = open.map(itemHTML).join('');
  $('doneList').innerHTML = doneToday.map(itemHTML).join('');
  $('doneN').textContent = p.done;
  $('totN').textContent = p.total;
  $('leftN').textContent = p.total ? (p.left ? `${p.left} left` : 'All done') : '';
  $('fill').style.width = p.pct + '%';
  $('track').setAttribute('aria-valuenow', p.pct);
  $('doneToggle').hidden = p.done === 0;
  $('doneLabel').textContent = `Done today · ${p.done}`;
  if (!p.done) { $('doneList').hidden = true; $('doneToggle').setAttribute('aria-expanded', 'false'); }
  const isClear = p.total > 0 && p.left === 0;
  $('clear').hidden = !isClear;
  $('empty').hidden = p.total > 0;
  if (isClear && !wasClear && celebrateNext) setTimeout(celebrate, 250);
  celebrateNext = false;
  wasClear = isClear;
}

// Roll over at midnight / when reopening the app.
document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderDate(); render(); } });
setInterval(() => { renderDate(); render(); }, 60000);
function renderDate() {
  $('date').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}
renderDate();
useStore(new LocalStore());

// ---------- add ----------
$('addForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('addInput').value.trim();
  if (!v) return;
  store.put(newTask(v));
  $('addInput').value = '';
});

$('doneToggle').addEventListener('click', () => {
  const show = $('doneList').hidden;
  $('doneList').hidden = !show;
  $('doneToggle').setAttribute('aria-expanded', String(show));
});

// ---------- complete ----------
const find = (id) => tasks.find((t) => t.id === id);
function toggleDone(li) {
  const t = find(li.dataset.id);
  if (!t) return;
  const now = Date.now();
  if (t.done) { store.put({ ...t, done: false, doneAt: null, updatedAt: now }); return; }
  const r = li.querySelector('.check').getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2);
  li.classList.add('completing');
  setTimeout(() => { celebrateNext = true; store.put({ ...t, done: true, doneAt: Date.now(), updatedAt: Date.now() }); }, 650);
}
document.addEventListener('click', (e) => {
  const c = e.target.closest('.check');
  if (c) toggleDone(c.closest('.item'));
});

// ---------- swipe to delete / tap to edit ----------
let drag = null;
document.addEventListener('pointerdown', (e) => {
  const row = e.target.closest('.row');
  if (!row || e.target.closest('.check')) return;
  drag = { row, li: row.parentElement, x: e.clientX, y: e.clientY, dx: 0, moved: false, horiz: null, pid: e.pointerId };
});
document.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.pid) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (drag.horiz === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
    drag.horiz = Math.abs(dx) > Math.abs(dy);
    drag.moved = true;
    if (drag.horiz) {
      drag.row.classList.add('dragging');
      drag.li.classList.add('swiping');
      try { drag.row.setPointerCapture(e.pointerId); } catch (err) {}
    }
  }
  if (drag.horiz) { drag.dx = Math.min(0, dx); drag.row.style.transform = `translateX(${drag.dx}px)`; }
});
function endDrag(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  const d = drag;
  drag = null;
  d.row.classList.remove('dragging');
  if (d.horiz && d.dx < -90) {
    d.row.style.transform = 'translateX(-110%)';
    setTimeout(() => removeTask(d.li.dataset.id), 200);
  } else {
    d.row.style.transform = '';
    setTimeout(() => d.li.classList.remove('swiping'), 250);
    if (!d.moved && e.type === 'pointerup') openEdit(d.li.dataset.id);
  }
}
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);

// ---------- delete + undo ----------
let undoTask = null, toastTimer = null;
function toast(msg, withUndo = false) {
  $('toastMsg').textContent = msg;
  $('undoBtn').hidden = !withUndo;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; undoTask = null; }, 5000);
}
function removeTask(id) {
  const t = find(id);
  if (!t) return;
  undoTask = t;
  store.remove(id);
  toast(`Deleted “${t.title}”`, true);
}
$('undoBtn').addEventListener('click', () => {
  if (!undoTask) return;
  store.put(undoTask);
  undoTask = null;
  $('toast').hidden = true;
});

// ---------- sheets ----------
let editingId = null;
function openSheet(id) { $('scrim').hidden = false; $(id).hidden = false; }
function closeSheets() {
  $('scrim').hidden = true;
  for (const id of ['editSheet', 'syncSheet']) $(id).hidden = true;
  editingId = null;
}
$('scrim').addEventListener('click', closeSheets);
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeSheets));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheets(); });

function openEdit(id) {
  const t = find(id);
  if (!t) return;
  editingId = id;
  $('editTitle').value = t.title;
  $('editNote').value = t.note || '';
  openSheet('editSheet');
}
$('editSave').addEventListener('click', () => {
  const t = find(editingId);
  if (t) {
    const title = $('editTitle').value.trim() || t.title;
    store.put({ ...t, title, note: $('editNote').value.trim(), updatedAt: Date.now() });
  }
  closeSheets();
});
$('editDelete').addEventListener('click', () => {
  const id = editingId;
  closeSheets();
  if (id) removeTask(id);
});

// ---------- sync ----------
let fb = null;
let user = null;
function renderSync() {
  const text = $('syncText');
  $('syncDot').hidden = !user;
  $('signInBtn').hidden = !fb || !!user;
  $('signOutBtn').hidden = !user;
  if (!firebaseConfig) text.textContent = 'Sync is not set up yet. Your tasks are saved on this device only.';
  else if (!fb) text.textContent = 'Connecting… If this stays, check your internet connection.';
  else if (user) text.innerHTML = `Signed in as <strong>${esc(user.email || user.displayName || 'you')}</strong>. Your tasks sync between your iPhone and iPad.`;
  else text.textContent = 'Sign in with the same Google account on your iPhone and iPad to keep one list on both.';
}
$('syncBtn').addEventListener('click', () => { renderSync(); openSheet('syncSheet'); });
$('signInBtn').addEventListener('click', async () => {
  try { await fb.signIn(); } catch (err) { toast(`Sign-in failed: ${err.code || err.message}`); }
});
$('signOutBtn').addEventListener('click', async () => { await fb.signOut(); closeSheets(); });
renderSync();

if (firebaseConfig) {
  initFirebase(firebaseConfig).then((f) => {
    fb = f;
    renderSync();
    fb.onUser((u) => {
      user = u;
      renderSync();
      if (u) {
        const cloud = fb.cloudStore(u.uid);
        const local = LocalStore.read();
        for (const t of local) cloud.put(t);
        LocalStore.clear();
        useStore(cloud);
        if (!$('syncSheet').hidden) closeSheets();
      } else {
        useStore(new LocalStore());
      }
    });
  }).catch((err) => { console.error(err); renderSync(); });
}

// ---------- confetti ----------
const cv = $('confetti');
const ctx = cv.getContext('2d');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let parts = [], raf = null;
function size() {
  const r = devicePixelRatio || 1;
  cv.width = innerWidth * r; cv.height = innerHeight * r;
  ctx.setTransform(r, 0, 0, r, 0, 0);
}
size();
addEventListener('resize', size);
function colors() {
  const s = getComputedStyle(root);
  return [s.getPropertyValue('--a1'), s.getPropertyValue('--a2'), s.getPropertyValue('--b3'), '#ffffff', '#e5e7eb'].map((x) => x.trim());
}
function spawn(x, y, n, speed, spread, up) {
  const cs = colors();
  for (let i = 0; i < n; i++) {
    const a = up ? (-Math.PI / 2 + (Math.random() - .5) * spread) : Math.random() * Math.PI * 2;
    const v = speed * (.5 + Math.random());
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 3 + Math.random() * 5, c: cs[i % cs.length], rot: Math.random() * 6, vr: (Math.random() - .5) * .3, life: 1, rect: Math.random() < .5 });
  }
  if (!raf) raf = requestAnimationFrame(tick);
}
function tick() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 40);
  for (const p of parts) {
    p.vy += .25; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= .006;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
    ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
    if (p.rect) ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
    else { ctx.beginPath(); ctx.arc(0, 0, p.r / 1.4, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  raf = parts.length ? requestAnimationFrame(tick) : null;
  if (!raf) ctx.clearRect(0, 0, innerWidth, innerHeight);
}
function burst(x, y) { if (!reduceMotion) spawn(x, y, 16, 4, 0, false); }
function celebrate() {
  if (reduceMotion) return;
  spawn(innerWidth * .2, innerHeight * .75, 90, 16, 1.2, true);
  spawn(innerWidth * .8, innerHeight * .75, 90, 16, 1.2, true);
}

// ---------- offline support ----------
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
