-- 플랜 변경 요청 테이블 생성
CREATE TABLE plan_change_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    request_user_id INTEGER, -- 요청한 사용자 ID
    current_plan TEXT NOT NULL,
    requested_plan TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    processed_by INTEGER, -- 처리한 슈퍼 관리자 ID
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (request_user_id) REFERENCES users(id)
);

-- 인덱스 생성
CREATE INDEX idx_plan_requests_tenant ON plan_change_requests(tenant_id);
CREATE INDEX idx_plan_requests_status ON plan_change_requests(status);
