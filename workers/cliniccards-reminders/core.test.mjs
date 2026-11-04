import test from 'node:test';
import assert from 'node:assert/strict';
import {
  kyivDate, kyivTime, nextCalendarDate, parseClinicDateTime, parseVisits,
  shouldRemind, isMorningSummaryTime, escapeHtml,
} from './core.ts';

const statuses = new Set(['BOOKING', 'CONFIRMED']);
test('parses Cliniccards local visit with DST-aware Kyiv timezone', () => {
  const visits = parseVisits({ result: 'success', data: [
    { visit_id: 12, doctor_id: 33, visit_start: '2026-10-23 17:00:00', status: 'BOOKING' },
    { visit_id: 13, doctor_id: 33, visit_start: '2026-10-23 18:00:00', status: 'CANCELLED' },
  ] }, statuses);
  assert.equal(visits.length, 1);
  assert.equal(kyivDate(visits[0].startsAt), '2026-10-23');
  assert.equal(kyivTime(visits[0].startsAt), '17:00');
  assert.equal(visits[0].startsAt, Date.parse('2026-10-23T14:00:00Z'));
  assert.equal(shouldRemind(visits[0], visits[0].startsAt - 30 * 60000), true);
  assert.equal(shouldRemind(visits[0], visits[0].startsAt - 20 * 60000), false);
});

test('handles winter time, daily report and calendar turnover', () => {
  const winter = parseClinicDateTime('2026-11-23 09:00:00');
  assert.equal(winter, Date.parse('2026-11-23T07:00:00Z'));
  assert.equal(isMorningSummaryTime(winter), true);
  assert.equal(isMorningSummaryTime(winter + 30 * 60000), false);
  assert.equal(nextCalendarDate('2026-12-31'), '2027-01-01');
});

test('fails closed on unknown Cliniccards response and ignores unsafe statuses', () => {
  assert.throws(() => parseVisits({ result: 'fail', error: 'Unauthorized' }, statuses));
  assert.throws(() => parseVisits({ records: [] }, statuses));
  assert.deepEqual(parseVisits([{ id: 1, doctor_id: 5, status: 'UNKNOWN', visit_start: '2026-10-23 14:00:00' }], statuses), []);
  assert.equal(escapeHtml('Dr <A&B>'), 'Dr &lt;A&amp;B&gt;');
});
