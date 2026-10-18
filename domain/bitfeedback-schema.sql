CREATE TABLE IF NOT EXISTS bit_feedback_count (id INTEGER PRIMARY KEY CHECK(id=1), total INTEGER NOT NULL DEFAULT 0 CHECK(total>=0));
INSERT OR IGNORE INTO bit_feedback_count(id,total) VALUES(1,0);
