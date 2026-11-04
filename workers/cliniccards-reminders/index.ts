import {
  escapeHtml, isMorningSummaryTime, kyivDate, kyivTime,
  nextCalendarDate, parseVisits, shouldRemind,
  type Visit,
} from './core';

type D1Result = { meta?: { changes?: number } };
type Prepared = { bind(...args: unknown[]): Prepared; run(): Promise<D1Result> };
type Database = { prepare(sql: string): Prepared };
type Env = {
  REMINDER_DB: Database;
  CLINICCARDS_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  DOCTOR_TELEGRAM_MAP: string;
  CLINICCARDS_ACTIVE_STATUSES?: string;
};
type Doctor = { name?: string; username?: string; telegram_id?: string };
type DoctorMap = Record<string, Doctor>;

const API_URL = 'https://cliniccards.com/api';
const DEFAULT_ACTIVE_STATUSES = 'BOOKING,SCHEDULED,PLANNED,CONFIRMED,APPROVED';
const LEASE_SECONDS = 600;

function doctorsFromEnv(env: Env): DoctorMap {
  const json: unknown = JSON.parse(env.DOCTOR_TELEGRAM_MAP);
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new Error('DOCTOR_TELEGRAM_MAP must be a JSON object indexed by Cliniccards doctor_id');
  }
  return json as DoctorMap;
}

async function cliniccardsVisits(env: Env, from: string, to: string, allowed: ReadonlySet<string>): Promise<Visit[]> {
  const url = new URL(`${API_URL}/visits`);
  url.searchParams.set('from', from);
  url.searchParams.set('to', to);
  const response = await fetch(url, {
    headers: { Token: env.CLINICCARDS_API_KEY, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Cliniccards visits API returned HTTP ${response.status}`);
  const payload: unknown = await response.json();
  return parseVisits(payload, allowed);
}

function doctorName(id: string, doctors: DoctorMap): string {
  const doctor = doctors[id];
  return typeof doctor?.name === 'string' && doctor.name.trim() ? doctor.name.trim() : `Лікар #${id}`;
}

function doctorMention(id: string, doctors: DoctorMap): string {
  const doctor = doctors[id];
  const name = escapeHtml(doctorName(id, doctors));
  if (typeof doctor?.telegram_id === 'string' && /^\d+$/.test(doctor.telegram_id)) {
    return `<a href="tg://user?id=${doctor.telegram_id}">${name}</a>`;
  }
  const username = typeof doctor?.username === 'string' ? doctor.username.replace(/^@/, '') : '';
  if (/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(username)) return `${name} (@${username})`;
  console.warn(`Doctor ${id}: Telegram mention not configured`);
  return name;
}

function reminderText(visit: Visit, doctors: DoctorMap): string {
  return `⏰ <b>За 30 хвилин прийом</b>\n🕘 Час: <b>${kyivTime(visit.startsAt)}</b>\n👩‍⚕️ Лікар: ${doctorMention(visit.doctorId, doctors)}`;
}

function dailyText(day: string, visits: Visit[], doctors: DoctorMap): string {
  const relevant = visits.filter(v => kyivDate(v.startsAt) === day);
  const groups = new Map<string, Visit[]>();
  for (const visit of relevant) groups.set(visit.doctorId, [...(groups.get(visit.doctorId) ?? []), visit]);
  const lines = [`📅 <b>Записи на сьогодні — ${day.split('-').reverse().join('.')}</b>`,
    `Всього прийомів: <b>${relevant.length}</b>`];
  for (const [doctorId, appointments] of [...groups].sort((a, b) => doctorName(a[0], doctors).localeCompare(doctorName(b[0], doctors), 'uk'))) {
    const times = appointments.map(v => kyivTime(v.startsAt)).sort();
    const compact = `${times.slice(0, 18).join(', ')}${times.length > 18 ? ` (+${times.length - 18})` : ''}`;
    const line = `\n👩‍⚕️ ${doctorMention(doctorId, doctors)} — <b>${times.length}</b>\n${compact}`;
    if (lines.join('\n').length + line.length > 3700) {
      lines.push('\n… Решта прийомів — у Cliniccards');
      break;
    }
    lines.push(line);
  }
  if (relevant.length === 0) lines.push('На сьогодні немає запланованих прийомів.');
  return lines.join('\n');
}

async function sendTelegram(env: Env, message: string): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML',
      disable_web_page_preview: true }),
    signal: AbortSignal.timeout(15000),
  });
  // Never print Telegram's response body: it can include message content.
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok || !result || typeof result !== 'object' || !('ok' in result) || result.ok !== true) {
    throw new Error(`Telegram sendMessage failed (HTTP ${response.status})`);
  }
}

async function digest(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, '0')).join('');
}

async function claim(db: Database, key: string, nowSeconds: number): Promise<boolean> {
  const inserted = await db.prepare(
    "INSERT OR IGNORE INTO clinic_notification_events (event_key, state, lease_until, attempts) VALUES (?, 'processing', ?, 1)"
  ).bind(key, nowSeconds + LEASE_SECONDS).run();
  if ((inserted.meta?.changes ?? 0) === 1) return true;
  const retried = await db.prepare(
    "UPDATE clinic_notification_events SET state='processing', lease_until=?, attempts=attempts+1 WHERE event_key=? AND state != 'sent' AND lease_until <= ?"
  ).bind(nowSeconds + LEASE_SECONDS, key, nowSeconds).run();
  return (retried.meta?.changes ?? 0) === 1;
}

async function sendOnce(env: Env, key: string, text: string, nowSeconds: number): Promise<boolean> {
  if (!await claim(env.REMINDER_DB, key, nowSeconds)) return false;
  try {
    await sendTelegram(env, text);
    await env.REMINDER_DB.prepare(
      "UPDATE clinic_notification_events SET state='sent', delivered_at=?, lease_until=0 WHERE event_key=?"
    ).bind(nowSeconds, key).run();
    return true;
  } catch (error) {
    await env.REMINDER_DB.prepare(
      "UPDATE clinic_notification_events SET state='failed', lease_until=0 WHERE event_key=? AND state='processing'"
    ).bind(key).run();
    throw error;
  }
}

async function run(env: Env, now: number): Promise<void> {
  if (!env.CLINICCARDS_API_KEY || !env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID || !env.DOCTOR_TELEGRAM_MAP || !env.REMINDER_DB) {
    throw new Error('Missing Cliniccards/Telegram secret or D1 binding');
  }
  const doctors = doctorsFromEnv(env);
  const today = kyivDate(now);
  const tomorrow = nextCalendarDate(today);
  const statuses = new Set((env.CLINICCARDS_ACTIVE_STATUSES || DEFAULT_ACTIVE_STATUSES)
    .split(',').map(s => s.trim().toUpperCase()).filter(Boolean));
  if (statuses.size === 0) throw new Error('CLINICCARDS_ACTIVE_STATUSES must not be empty');
  // Always fetch fresh appointments before sending: moved or cancelled visits are filtered out.
  const visits = await cliniccardsVisits(env, today, tomorrow, statuses);
  const nowSeconds = Math.floor(now / 1000);
  let failed = 0;
  for (const visit of visits.filter(v => shouldRemind(v, now))) {
    const key = `reminder:${await digest(`${visit.id}|${visit.doctorId}|${visit.startsAt}`)}`;
    try {
      await sendOnce(env, key, reminderText(visit, doctors), nowSeconds);
    } catch (error) {
      failed++;
      console.error('Appointment reminder failed:', error instanceof Error ? error.message : String(error));
    }
  }
  if (isMorningSummaryTime(now)) {
    try {
      await sendOnce(env, `summary:${today}`, dailyText(today, visits, doctors), nowSeconds);
      await env.REMINDER_DB.prepare(
        "DELETE FROM clinic_notification_events WHERE state='sent' AND delivered_at < ?"
      ).bind(nowSeconds - 45 * 86400).run();
    } catch (error) {
      failed++;
      console.error('Morning summary failed:', error instanceof Error ? error.message : String(error));
    }
  }
  if (failed) throw new Error(`${failed} Cliniccards notification(s) failed; will retry`);
}

export default {
  scheduled(_event: unknown, env: Env, ctx: { waitUntil(promise: Promise<unknown>): void }) {
    ctx.waitUntil(run(env, Date.now()));
  },
};
