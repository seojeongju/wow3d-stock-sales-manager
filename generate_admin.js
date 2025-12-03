import crypto from 'crypto';

function hashNode(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

const hash = hashNode('admin1234');

const sql = `
-- 관리자 테넌트 생성 (이미 존재할 수 있음)
INSERT OR IGNORE INTO tenants (id, name, plan_type) VALUES (1, '(주)와우쓰리디', 'PRO');

-- 관리자 계정 생성
INSERT INTO users (tenant_id, email, name, password_hash, role) 
VALUES (1, 'admin@wow3d.com', '관리자', '${hash}', 'OWNER');
`;

console.log(sql);
