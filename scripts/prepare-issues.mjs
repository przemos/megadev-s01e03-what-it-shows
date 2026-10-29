import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { groupByCause, readAs, uniqueById } from '../src/lib/kb/causes.ts';

const data = new URL('../src/lib/data/', import.meta.url);
const load = (path) => JSON.parse(readFileSync(new URL(path, data), 'utf8'));
const raw = load('reports-4471.json');
const tenants = new Map(readdirSync(new URL('tenants/', data)).map((file) => {
  const tenant = load(`tenants/${file}`);
  return [tenant.handle, tenant];
}));
const reports = uniqueById(raw).filter((report) => report.mergedInto === 4471);
const groups = groupByCause(reports, (report) => tenants.get(report.tenant));
const notes = load('desk-notes.json');
const details = {
  parser: {
    title: 'Shared parser reads day-first tenant dates month-first',
    mechanism: 'The shared parser always reads month first although these tenants write day first. App and email reports take this path; form reports do too unless a booking-v3 month-first hint triggers the separate hint cause.',
    reproduction: 'For a day-first tenant such as harbour.dental (en-GB, booking-v2), enter 07/04/2026 through the app or email path. Expected: 7 April 2026. Reported: 4 July 2026. Verify booking-v2 form input as well.',
    verification: 'Parse according to the tenant date convention (or use an unambiguous date representation). Test app, email and booking-v2 forms, including day/month values both <=12 and invalid dates. Do not treat fixing this parser as fixing the independent booking-v3 hint.',
  },
  hint: {
    title: 'booking-v3 shows a month-first hint to day-first tenants',
    mechanism: 'booking-v3 prints MM/DD/YYYY. People follow that hint, but the form reads the entered date in the tenant day-first order. This is a separate form-hint failure, not the shared month-first parser.',
    reproduction: 'For alder.physio (de-DE, booking-v3), follow the MM/DD/YYYY form hint and enter 04/07/2026 for 7 April. Expected: 7 April 2026. Day-first form interpretation gives 4 July. Also test copper.studio (es-ES) and pale.harbour (pt-PT).',
    verification: 'Make the displayed hint and input interpretation agree with tenant locale. Test booking-v3 for de-DE, es-ES and pt-PT with ambiguous dates, and regress booking-v2 plus app/email paths independently. A shared parser fix alone does not fix a misleading form hint.',
  },
};

const issues = groups.map((group) => {
  const detail = details[group.cause];
  if (!detail) throw new Error(`Unresolved cause: ${group.cause}`);
  const misplaced = group.reports.filter((report) => report.meta.intakeTag !== group.cause).length;
  const examples = group.reports.slice(0, 3).map((report) =>
    `- ${report.id}, ${report.tenant}, ${report.channel}: ${report.body}`,
  ).join('\n');
  const anomalies = readAs(group, notes.oneDayMove);
  const handles = [...new Set(group.reports.map((report) => report.tenant))].sort();
  const body = `## Scope and report count

**${group.reports.length} unique reports** from merged support ticket #4471 in the 2026-10-04 export. Cause: **${group.cause}**. Affected tenants: ${group.tenants}. First seen: ${group.firstSeen}; last seen: ${group.lastSeen}.

Deduplicated by report ID: ${raw.length} raw rows, ${reports.length} unique reports overall. The two cause groups are disjoint and cover all reports. Classification runs the exported causes.ts with each tenant's locale/form and the report channel, not browser locale, subject or intake tag. ${misplaced} reports in this group have a misleading intake tag.

Tenant handles: ${handles.join(', ')}.

## Failure mechanism

${detail.mechanism}

## Reproduction to confirm

${detail.reproduction}

This reproduction follows the exported code and customer descriptions; we have no access to the production application and have not executed it there.

## Customer evidence

${examples}

${anomalies ? `The desk notes flag ${anomalies} one-day descriptions (${notes.oneDayMove.join(', ')}). These remain counted here under the supplied classification. Investigate the mismatch; a timezone cause is not established by this export.` : 'No reports from the desk one-day-move list are assigned to this group.'}

## Acceptance criteria

${detail.verification}

Keep the two causes in separate tickets. Refresh the export and monitor new received reports before declaring recovery; queue merges are not fixes.

## Knowledge base and reproducibility

- [Signed correction source](https://github.com/przemos/megadev-s01e03-what-it-shows/blob/main/src/routes/kb/incidents/4471-split/+page.svx)
- [Rendered correction](https://github.com/przemos/megadev-s01e03-what-it-shows/blob/main/rendered/kb/incidents/4471-split/index.html)
- Membership: \`issues.json\`, group \`${group.cause}\`, \`reportIds\`.
- Reproduce with \`npm ci && npm run build && npm test\`.
`;
  return {
    cause: group.cause,
    count: group.reports.length,
    reportIds: group.reports.map((report) => report.id),
    title: `${detail.title} (${group.reports.length} reports)`,
    body,
  };
});

writeFileSync(new URL('../issues.json', import.meta.url), `${JSON.stringify(issues, null, 2)}\n`);
console.log(`Prepared ${issues.length} issue bodies covering ${reports.length} reports.`);
