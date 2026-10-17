-- Only keyed IP hashes are persisted, never raw addresses.
CREATE TABLE IF NOT EXISTS gate_visitors (
 country TEXT NOT NULL CHECK(country IN ('IL','HK')),
 visitor_hash TEXT NOT NULL,
 first_seen INTEGER NOT NULL,
 last_seen INTEGER NOT NULL,
 acknowledged_at INTEGER,
 clicks INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(country,visitor_hash)
);
