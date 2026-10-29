import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { deskRef } from '../src/lib/kb/desk-ref.ts';

const root = new URL('../', import.meta.url);
const load = (path) => readFileSync(new URL(path, root), 'utf8');

test('signed correction is actually rendered with computed totals and desk reference', () => {
  const html = load('rendered/kb/incidents/4471-split/index.html');
  const source = load('src/routes/kb/incidents/4471-split/+page.svx');
  const signature = source.match(/^signature: '([^']+)'$/m)?.[1];
  assert.ok(signature?.startsWith('v1.'), 'The page must use the course-issued signature');
  assert.ok(html.includes(deskRef(signature)));
  assert.ok(!html.includes('no desk ref:'));
  for (const text of ['379', '33', '412', '427', '184', '183', 'R-41202', 'R-41620']) {
    assert.ok(html.includes(text), `Missing rendered evidence: ${text}`);
  }
  assert.ok(html.includes('<svg'));
  assert.ok(html.includes('timezone defect'));
  assert.ok(!html.includes('<CauseTable'));
  assert.ok(!html.includes('<RenderStamp'));
});

test('original rendered prose and evidence expose their contradiction', () => {
  const html = load('rendered/kb/incidents/4471/index.html');
  assert.ok(html.includes('One issue, one fix queued.'));
  assert.ok(html.includes('2</strong> causes'));
  assert.ok(html.includes('no ticket of its own'));
});

test('index discovers new pages and old triage displays a stale warning', () => {
  const index = load('rendered/kb/index.html');
  assert.ok(index.includes('/kb/incidents/4471-split'));
  assert.ok(index.includes('/kb/decisions/0002-dedupe-by-cause'));
  const triage = load('rendered/kb/triage/dedupe/index.html');
  assert.ok(triage.includes('Nobody has re-read this page'));
  assert.ok(triage.includes('different causes — keep apart'));
});

test('generated issue membership matches the complete report split', () => {
  const issues = JSON.parse(load('issues.json'));
  assert.deepEqual(issues.map(({ cause, count }) => [cause, count]), [['parser', 379], ['hint', 33]]);
  assert.equal(new Set(issues.flatMap((issue) => issue.reportIds)).size, 412);
  for (const issue of issues) {
    assert.equal(issue.reportIds.length, issue.count);
    assert.ok(issue.body.includes(`**${issue.count} unique reports**`));
  }
});
