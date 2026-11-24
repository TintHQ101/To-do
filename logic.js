// Pure task logic. No DOM, no storage. Tested in tests/logic.test.js.

/** Local calendar day as "YYYY-MM-DD". */
export function dayKey(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Split tasks into what the screen shows. Done tasks from earlier days are hidden. */
export function view(tasks, now = Date.now()) {
  const today = dayKey(now);
  const open = tasks.filter((t) => !t.done).sort((a, b) => b.createdAt - a.createdAt);
  const doneToday = tasks
    .filter((t) => t.done && t.doneAt && dayKey(t.doneAt) === today)
    .sort((a, b) => b.doneAt - a.doneAt);
  return { open, doneToday };
}

/** Progress for today's bar: done today out of (open + done today). */
export function progress(open, doneToday) {
  const done = doneToday.length;
  const total = open.length + done;
  return { done, total, left: open.length, pct: total ? Math.round((done / total) * 100) : 0 };
}

/** Done tasks older than `days` days — safe to delete to keep storage small. */
export function staleIds(tasks, now = Date.now(), days = 7) {
  const cutoff = now - days * 86400000;
  return tasks.filter((t) => t.done && t.doneAt && t.doneAt < cutoff).map((t) => t.id);
}

export function newTask(title, now = Date.now()) {
  const id = (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${now}-${Math.random().toString(36).slice(2)}`;
  return { id, title: title.trim(), note: '', done: false, doneAt: null, createdAt: now, updatedAt: now };
}
