-- 시스템 설정 테이블
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT,
    description TEXT,
    is_encrypted INTEGER DEFAULT 0, -- 1이면 암호화된 값
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, setting_key)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_settings_tenant ON settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(tenant_id, setting_key);

-- 초기 설정값 (옵션)
-- INSERT OR IGNORE INTO settings (tenant_id, setting_key, setting_value, description)
-- VALUES (1, 'sweettracker_api_key', '', '스위트트래커 API Key');
