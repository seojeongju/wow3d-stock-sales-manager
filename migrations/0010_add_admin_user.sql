-- 관리자 테넌트 생성 (이미 존재할 수 있음)
INSERT OR IGNORE INTO tenants (id, name, plan_type) VALUES (1, '(주)와우쓰리디', 'PRO');

-- 관리자 계정 생성 (이미 존재하면 무시)
INSERT OR IGNORE INTO users (tenant_id, email, name, password_hash, role)
VALUES (1, 'admin@wow3d.com', '관리자', 'ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270', 'OWNER');

-- 이미 존재하는 경우 비밀번호 업데이트 (선택 사항)
UPDATE users SET password_hash = 'ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270' WHERE email = 'admin@wow3d.com';
