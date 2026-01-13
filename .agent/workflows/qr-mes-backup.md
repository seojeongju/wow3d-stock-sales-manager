---
description: QR MES 기능 구현 전 완벽 백업
---

# QR MES 기능 구현 전 백업 및 시작 워크플로우

## 🎯 목적
QR MES 기능 구현 전 현재 안정 버전을 완벽하게 백업하고, 안전하게 새로운 기능 개발을 시작합니다.

---

## ✅ 1단계: 현재 상태 확인

// turbo
```bash
cd d:\Documents\program_DEV\wow3d-stock-sales-manager
git status
```

**확인사항:**
- Working tree가 clean한지 확인
- 커밋되지 않은 변경사항이 있다면 먼저 커밋

---

## ✅ 2단계: 안정 버전 태그 생성

```bash
git tag -a v1.0.0-before-qr -m "QR MES 기능 구현 전 안정 버전 - $(date +%Y-%m-%d)"
```

**설명:**
- 현재 커밋에 `v1.0.0-before-qr` 태그 생성
- 이 태그로 언제든지 롤백 가능

---

## ✅ 3단계: 원격 저장소에 태그 푸시

```bash
git push origin v1.0.0-before-qr
```

**설명:**
- GitHub에 태그 백업
- 로컬 삭제 시에도 복구 가능

---

## ✅ 4단계: 모든 태그 확인

// turbo
```bash
git tag -l
```

**확인사항:**
- `v1.0.0-before-qr` 태그가 목록에 있는지 확인

---

## ✅ 5단계: 기능 브랜치 생성

```bash
git checkout -b feature/qr-mes-system
```

**설명:**
- `main` 브랜치에서 새로운 `feature/qr-mes-system` 브랜치 생성
- 이후 모든 QR 관련 작업은 이 브랜치에서 진행

---

## ✅ 6단계: 브랜치 확인

// turbo
```bash
git branch
```

**확인사항:**
- `* feature/qr-mes-system` (현재 브랜치를 나타내는 * 표시 확인)

---

## ✅ 7단계: 원격에 브랜치 푸시

```bash
git push -u origin feature/qr-mes-system
```

**설명:**
- 새 브랜치를 GitHub에 백업
- `-u` 옵션으로 upstream 설정

---

## ✅ 8단계: Cloudflare Pages 현재 배포 URL 저장

**수동 작업:**
1. Cloudflare Pages 대시보드 접속
2. 현재 프로덕션 URL 확인: `wow3d-stock-sales-manager.pages.dev`
3. 최신 배포 ID 메모 (예: `d58cc82`)

**문서화:**
```
현재 안정 버전 정보
- Git 태그: v1.0.0-before-qr
- Git 커밋: d58cc82
- 배포 URL: https://wow3d-stock-sales-manager.pages.dev
- 백업 일시: 2026-01-13 10:37
```

이 정보를 `docs/QR_MES_BACKUP_INFO.md`에 저장하세요.

---

## ✅ 9단계: 데이터베이스 마이그레이션 생성

```bash
# QR 테이블 생성 마이그레이션
echo "-- Migration: Create QR MES Tables" > migrations/0028_create_qr_tables.sql
```

---

## ✅ 10단계: 필요한 라이브러리 설치

```bash
npm install html5-qrcode qrcode jspdf html2canvas
```

---

## 🚨 롤백 절차 (문제 발생 시)

### 방법 1: Git 태그로 롤백
```bash
# 메인 브랜치로 이동
git checkout main

# 태그 위치로 리셋
git reset --hard v1.0.0-before-qr

# 강제 푸시 (주의!)
git push origin main --force

# 프로덕션 재배포
npm run build
npm run deploy:prod
```

### 방법 2: 브랜치 삭제하고 다시 시작
```bash
# 메인으로 돌아가기
git checkout main

# 기능 브랜치 삭제
git branch -D feature/qr-mes-system
git push origin --delete feature/qr-mes-system

# 처음부터 다시 시작
git checkout -b feature/qr-mes-system
```

### 방법 3: Cloudflare Pages 배포 롤백
1. Cloudflare Pages 대시보드 접속
2. Deployments > 이전 배포(d58cc82) 선택
3. "Rollback to this deployment" 클릭

---

## 📊 완료 확인 체크리스트

- [ ] Git 상태가 clean
- [ ] `v1.0.0-before-qr` 태그 생성 및 푸시 완료
- [ ] `feature/qr-mes-system` 브랜치 생성 완료
- [ ] 브랜치가 원격에 푸시됨
- [ ] 현재 프로덕션 정보 문서화
- [ ] 라이브러리 설치 완료
- [ ] 롤백 절차 숙지

---

## 🎉 다음 단계

백업 완료 후 다음 작업을 진행하세요:
1. `docs/QR_MES_IMPLEMENTATION_PLAN.md` 검토
2. Phase 1 (기반 구축) 시작
3. MES 메뉴 사이드바 추가
4. DB 마이그레이션 작성

**안전한 개발 되세요! 🚀**
