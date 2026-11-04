#!/usr/bin/env node
// Deprecated: this catalog-only importer generated SQL statements larger than
// Cloudflare D1's 100 KB limit and could overwrite existing product documents.
// Use the private, five-document migration with per-statement chunking instead.
console.error("This legacy importer is disabled. Use: node scripts/prepare-shop-d1.mjs PRIVATE-SNAPSHOT.json migration-backups/shop-d1-import.sql");
process.exitCode=1;
