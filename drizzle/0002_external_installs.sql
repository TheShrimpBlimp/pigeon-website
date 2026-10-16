CREATE TABLE IF NOT EXISTS external_install_counts (source TEXT PRIMARY KEY, total INTEGER NOT NULL CHECK(total >= 0), checked_at INTEGER NOT NULL);
