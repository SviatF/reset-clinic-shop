-- Private idempotency ledger; no patient names or appointment details are persisted.
CREATE TABLE IF NOT EXISTS clinic_notification_events (
  event_key TEXT PRIMARY KEY NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('processing', 'failed', 'sent')),
  lease_until INTEGER NOT NULL DEFAULT 0,
  delivered_at INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_clinic_notification_sent_at ON clinic_notification_events (state, delivered_at);
