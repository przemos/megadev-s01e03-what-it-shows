import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { causeOf, groupByCause, readAs, sameCause, uniqueById } from '../src/lib/kb/causes.ts';

const data = new URL('../src/lib/data/', import.meta.url);
const load = (path) => JSON.parse(readFileSync(new URL(path, data), 'utf8'));
const raw = load('reports-4471.json');
const tenants = new Map(readdirSync(new URL('tenants/', data)).map((file) => {
  const tenant = load(`tenants/${file}`);
  return [tenant.handle, tenant];
}));
const reports = uniqueById(raw).filter((report) => report.mergedInto === 4471);
const groups = groupByCause(reports, (report) => tenants.get(report.tenant));

test('overlapping export pages yield exactly 412 distinct reports', () => {
  assert.equal(raw.length, 427);
  assert.equal(reports.length, 412);
  assert.equal(raw.length - reports.length, 15);
});

test('tenant locale and form yield two exhaustive, disjoint causes', () => {
  assert.deepEqual(groups.map((group) => [group.cause, group.reports.length]), [
    ['parser', 379],
    ['hint', 33],
  ]);
  assert.equal(new Set(groups.flatMap((group) => group.reports.map((report) => report.id))).size, 412);
  assert.equal(groups.reduce((sum, group) => sum + group.reports.length, 0), 412);
  assert.equal(groups.reduce((sum, group) => sum + group.reports.filter((report) => report.meta.intakeTag !== group.cause).length, 0), 38);
});

test('one-day descriptions remain explicit anomalies, not a proven third cause', () => {
  const notes = load('desk-notes.json');
  assert.equal(readAs(groups[0], notes.oneDayMove), 5);
  assert.equal(readAs(groups[1], notes.oneDayMove), 0);
  assert.equal(notes.oneDayMove.every((id) => reports.some((report) => report.id === id)), true);
});

test('subject matching and browser locale do not determine the cause', () => {
  const form = { channel: 'form', meta: { browserLocale: 'en-US' } };
  assert.equal(causeOf(form, tenants.get('alder.physio')), 'hint');
  assert.equal(causeOf(form, tenants.get('kettle.books')), 'parser');
  assert.equal(sameCause(form, tenants.get('alder.physio'), form, tenants.get('kettle.books')), false);
  assert.equal(sameCause({ channel: 'app' }, tenants.get('kettle.books'), { channel: 'email' }, tenants.get('kettle.books')), true);
  assert.equal(causeOf(form, undefined), null);
});
