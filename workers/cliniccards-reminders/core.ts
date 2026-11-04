/** Pure Cliniccards schedule parsing and Europe/Kyiv date helpers. */
export const CLINIC_TIMEZONE = 'Europe/Kyiv';

export type Visit = {
  id: string;
  doctorId: string;
  startsAt: number;
  status: string;
};

type Dictionary = Record<string, unknown>;
const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone: CLINIC_TIMEZONE,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function object(value: unknown): value is Dictionary {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function value(row: Dictionary, ...keys: string[]): string {
  for (const key of keys) {
    const raw = row[key];
    if (typeof raw === 'string' || typeof raw === 'number') {
      const text = String(raw).trim();
      if (text) return text;
    }
  }
  return '';
}

export function kyivParts(epochMs: number) {
  const parts = Object.fromEntries(clock.formatToParts(new Date(epochMs)).map(p => [p.type, p.value]));
  return {
    year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
    hour: Number(parts.hour), minute: Number(parts.minute), second: Number(parts.second),
  };
}

export function kyivDate(epochMs: number): string {
  const p = kyivParts(epochMs);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function nextCalendarDate(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date + 1)).toISOString().slice(0, 10);
}

/** Cliniccards returns naive local dates; handle UTC offset and DST using Intl. */
export function parseClinicDateTime(input: string): number | null {
  const text = input.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(text)) {
    const epoch = Date.parse(text);
    return Number.isFinite(epoch) ? epoch : null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text);
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute, second || 0);
  if (new Date(target).toISOString().slice(0, 10) !== `${match[1]}-${match[2]}-${match[3]}`) return null;
  let candidate = target;
  for (let i = 0; i < 4; i++) {
    const observed = kyivParts(candidate);
    const localMs = Date.UTC(observed.year, observed.month - 1, observed.day, observed.hour, observed.minute, observed.second);
    const delta = target - localMs;
    candidate += delta;
    if (delta === 0) return candidate;
  }
  const observed = kyivParts(candidate);
  return observed.year === year && observed.month === month && observed.day === day &&
    observed.hour === hour && observed.minute === minute ? candidate : null;
}

export function parseVisits(payload: unknown, allowedStatuses: ReadonlySet<string>): Visit[] {
  if (object(payload) && String(payload.result ?? '').toLowerCase() === 'fail') {
    throw new Error('Cliniccards API returned an unsuccessful result');
  }
  const rows = Array.isArray(payload) ? payload : object(payload) ? payload.data : null;
  if (!Array.isArray(rows)) throw new Error('Cliniccards visits response is not an array');
  const visits: Visit[] = [];
  for (const raw of rows) {
    if (!object(raw)) continue;
    const status = value(raw, 'status', 'visit_status').toUpperCase();
    if (!allowedStatuses.has(status)) continue;
    const doctorId = value(raw, 'doctor_id', 'doctorId');
    const rawStart = value(raw, 'visit_start', 'starts_at', 'start');
    const start = rawStart || (value(raw, 'date') && value(raw, 'time_start')
      ? `${value(raw, 'date')} ${value(raw, 'time_start')}` : '');
    const startsAt = parseClinicDateTime(start);
    const patientId = value(raw, 'patient_id', 'patientId');
    const id = value(raw, 'visit_id', 'id', 'visitId') || (patientId && doctorId && start
      ? `fallback:${patientId}:${doctorId}` : '');
    if (!id || !doctorId || startsAt === null) continue;
    visits.push({ id, doctorId, startsAt, status });
  }
  return visits;
}

export function shouldRemind(visit: Visit, now: number): boolean {
  const diff = (visit.startsAt - now) / 60000;
  return diff > 24.99 && diff <= 30.01;
}

export function isMorningSummaryTime(now: number): boolean {
  const local = kyivParts(now);
  return local.hour === 9 && local.minute < 30;
}

export function kyivTime(epochMs: number): string {
  const p = kyivParts(epochMs);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

export function escapeHtml(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
