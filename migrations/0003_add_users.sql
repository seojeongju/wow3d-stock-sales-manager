-- 사용자 테이블 생성
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'staff', -- admin, staff
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
