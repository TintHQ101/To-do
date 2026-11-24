import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, view, progress, staleIds, newTask } from '../logic.js';

const NOON = new Date(2026, 10, 24, 12, 0).getTime();
const YESTERDAY = NOON - 86400000;

test('dayKey uses the local calendar day', () => {
  assert.equal(dayKey(NOON), '2026-11-24');
});

test('view: open tasks newest first; only today\'s done tasks shown', () => {
  const tasks = [
    { id: 'a', done: false, createdAt: 1 },
    { id: 'b', done: false, createdAt: 3 },
    { id: 'c', done: true, doneAt: NOON - 1000, createdAt: 2 },
    { id: 'd', done: true, doneAt: YESTERDAY, createdAt: 0 },
  ];
  const { open, doneToday } = view(tasks, NOON);
  assert.deepEqual(open.map((t) => t.id), ['b', 'a']);
  assert.deepEqual(doneToday.map((t) => t.id), ['c']);
});

test('progress: every open task counts toward today', () => {
  const p = progress(new Array(30).fill({}), new Array(10).fill({}));
  assert.deepEqual(p, { done: 10, total: 40, left: 30, pct: 25 });
  assert.equal(progress([], []).pct, 0);
  assert.equal(progress([], [{}]).pct, 100);
});

test('staleIds: done tasks older than 7 days', () => {
  const tasks = [
    { id: 'old', done: true, doneAt: NOON - 8 * 86400000 },
    { id: 'recent', done: true, doneAt: NOON - 2 * 86400000 },
    { id: 'open', done: false, doneAt: null },
  ];
  assert.deepEqual(staleIds(tasks, NOON), ['old']);
});

test('newTask trims and starts open', () => {
  const t = newTask('  Pay rent  ', NOON);
  assert.equal(t.title, 'Pay rent');
  assert.equal(t.done, false);
  assert.equal(t.createdAt, NOON);
  assert.ok(t.id);
});
