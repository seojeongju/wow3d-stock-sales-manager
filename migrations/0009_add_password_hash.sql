-- Users 테이블에 password_hash 컬럼 추가
ALTER TABLE users ADD COLUMN password_hash TEXT;

-- 기존 사용자에게 임시 비밀번호 해시 설정 (선택 사항, 여기서는 NULL 허용하거나 기본값 설정)
-- 실제 운영 환경에서는 기존 사용자가 비밀번호를 재설정하도록 유도해야 함.
