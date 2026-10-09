-- Apply to the D1 database before setting SHOP_STORAGE_BACKEND=cloudflare.
CREATE TABLE IF NOT EXISTS shop_documents (
  pathname TEXT PRIMARY KEY NOT NULL,
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
