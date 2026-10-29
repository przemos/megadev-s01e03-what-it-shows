<script lang="ts">
  import exported from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { groupByCause, uniqueById, type Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';

  const reports = uniqueById(exported as Report[]).filter((report) => report.mergedInto === 4471);
  const groups = groupByCause(reports, tenantOf);
  const mistagged = groups.reduce(
    (sum, group) => sum + group.reports.filter((report) => report.meta.intakeTag !== group.cause).length, 0,
  );
  const months = [...new Set(reports.map((report) => report.receivedAt.slice(0, 7)))].sort();
  const batch = reports.filter((report) => report.mergedAt?.startsWith('2026-07-02'));
  const backlog = batch.filter((report) => report.receivedAt.slice(0, 10) < '2026-07-02');
  const anomalies = reports.filter((report) => notes.oneDayMove.includes(report.id));
</script>

<h3>Count by identity, not export rows or intake tags</h3>
<p>
  {exported.length} exported rows contain {reports.length} unique reports for #4471;
  {exported.length - reports.length} overlapping rows are not new reports.
  Tenant locale, booking form and channel determine the supplied classification.
  Browser locale is not tenant locale. Intake tags disagree with that classification
  for {mistagged} reports.
</p>

<h3>Reports received, not just queue activity</h3>
<table>
  <thead><tr><th>Month received</th><th>Unique reports</th></tr></thead>
  <tbody>
    {#each months as month}
      <tr>
        <td>{month}</td>
        <td>{reports.filter((report) => report.receivedAt.startsWith(month)).length}</td>
      </tr>
    {/each}
  </tbody>
</table>
<p>
  On 2026-07-02 the desk merged {batch.length} reports, of which {backlog.length}
  had arrived on earlier days. That merge spike is backlog processing, not an
  incident starting that day. Reports begin on {groups.map((group) => group.firstSeen).sort()[0]}
  and continue through {groups.map((group) => group.lastSeen).sort().at(-1)}.
  The partial October window is not evidence that the problem ended.
</p>

<h3>One-day descriptions: uncertainty to investigate</h3>
<p>
  The desk notes identify {anomalies.length} reports as one-day moves.
  The supplied classifier places them under parser by tenant and channel.
  These descriptions do not establish another root cause; retain them in that count
  and investigate the mismatch rather than silently dropping or double-counting them.
</p>
<ul>
  {#each anomalies as report}
    <li><code>{report.id}</code> ({report.tenant}): {report.body}</li>
  {/each}
</ul>
