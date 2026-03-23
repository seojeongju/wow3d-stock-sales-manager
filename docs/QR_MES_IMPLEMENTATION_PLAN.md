# QR MES 시스템 구현 계획서

## 📅 작성일: 2026-01-13

## 🎯 프로젝트 목표
기존 재고/판매 관리 시스템에 QR 코드 기반 MES 기능을 추가하여 현장 작업 효율성 극대화

---

## 🔒 1. 백업 및 안전 장치

### 1.1 Git 백업 전략
```bash
# 1단계: 현재 안정 버전 태그 생성
git tag -a v1.0.0-before-qr -m "QR MES 기능 구현 전 안정 버전"
git push origin v1.0.0-before-qr

# 2단계: 기능 브랜치 생성
git checkout -b feature/qr-mes-system

# 3단계: 작업 중 정기적 커밋
git add .
git commit -m "feat(qr-mes): [작업내용]"
git push origin feature/qr-mes-system
```

### 1.2 롤백 절차
```bash
# 긴급 롤백 (기능 브랜치에서 메인으로)
git checkout main
git reset --hard v1.0.0-before-qr

# 프로덕션 재배포
npm run deploy:prod
```

### 1.3 Cloudflare Pages 스냅샷
- **현재 프로덕션**: wow3d-stock-sales-manager.pages.dev
- **QR 테스트 환경**: feature/qr-mes-system 브랜치 자동 배포
- **롤백 방법**: Cloudflare Dashboard > Deployments > 이전 버전 Rollback

---

## 🏗️ 2. MES 메뉴 구조 설계

### 2.1 사이드바 메뉴 추가
```
기존 메뉴
├── 분석 및 현황
├── 영업 및 물류
├── 기준 정보
└── 시스템

새로 추가 (독립 섹션)
📱 MES (제조실행시스템)
├── 📊 MES 대시보드
│   ├── 오늘의 QR 작업 현황
│   ├── 실시간 처리 통계
│   └── 작업자별 처리량
├── 📦 QR 입고
│   ├── QR 스캔 입고
│   ├── 입고 이력 조회
│   └── 입고 검증/취소
├── 📤 QR 출고
│   ├── QR 스캔 출고
│   ├── 출고 이력 조회
│   └── 출고 검증/취소
├── 💰 QR 판매
│   ├── QR 스캔 판매
│   ├── 판매 이력 조회
│   └── 판매 검증/취소
└── ⚙️ QR 관리
    ├── QR 코드 생성
    ├── 제품별 QR 매핑
    ├── QR 일괄 생성
    └── QR 라벨 출력
```

### 2.2 별도 메뉴의 장점
- ✅ **완전 분리**: 기존 기능에 영향 없음 (롤백 시 MES 메뉴만 비활성화)
- ✅ **권한 독립**: MES 전용 권한 설정 가능
- ✅ **UX 최적화**: 현장 작업자를 위한 큰 버튼, 간단한 UI
- ✅ **모바일 친화**: 스캐너/태블릿 환경 최적화
- ✅ **확장성**: 향후 바코드, RFID 등 추가 용이

---

## 💾 3. 데이터베이스 설계

### 3.1 새로운 테이블 생성

#### `qr_codes` 테이블
```sql
CREATE TABLE qr_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,              -- QR 코드 값 (UUID 또는 고유 번호)
  product_id INTEGER,                     -- 제품 ID (products 테이블 참조)
  type TEXT DEFAULT 'product',            -- 'product', 'batch', 'location'
  status TEXT DEFAULT 'active',           -- 'active', 'inactive', 'damaged'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  metadata TEXT,                          -- JSON: 추가 정보 (로트번호, 유효기간 등)
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_qr_codes_code ON qr_codes(code);
CREATE INDEX idx_qr_codes_product ON qr_codes(product_id);
```

#### `qr_transactions` 테이블
```sql
CREATE TABLE qr_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_code_id INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,         -- 'inbound', 'outbound', 'sale', 'return'
  reference_type TEXT,                    -- 'inbound', 'outbound', 'sale'
  reference_id INTEGER,                   -- 원본 트랜잭션 ID
  quantity INTEGER NOT NULL,
  warehouse_id INTEGER,
  location TEXT,                          -- 창고 내 위치
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_qr_trans_code ON qr_transactions(qr_code_id);
CREATE INDEX idx_qr_trans_type ON qr_transactions(transaction_type);
CREATE INDEX idx_qr_trans_date ON qr_transactions(created_at);
```

### 3.2 마이그레이션 파일 생성
```bash
# 파일명: migrations/0028_create_qr_tables.sql
```

---

## 🛠️ 4. 기술 스택 및 라이브러리

### 4.1 QR 코드 스캔
```json
// package.json에 추가
{
  "dependencies": {
    "html5-qrcode": "^2.3.8"
  }
}
```

**선정 이유:**
- ✅ 웹 카메라 지원
- ✅ 모바일 친화적
- ✅ 실시간 스캔
- ✅ TypeScript 지원

### 4.2 QR 코드 생성
```json
{
  "dependencies": {
    "qrcode": "^1.5.3"
  }
}
```

**선정 이유:**
- ✅ Canvas/SVG/Data URL 출력
- ✅ 커스터마이징 가능
- ✅ 경량 라이브러리

### 4.3 프린팅 (라벨 출력)
```json
{
  "dependencies": {
    "jspdf": "^2.5.1",
    "html2canvas": "^1.4.1"
  }
}
```

---

## 📱 5. UI/UX 설계

### 5.1 QR 스캔 화면 레이아웃
```
┌─────────────────────────────────┐
│  🎥 카메라 뷰파인더            │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │      [QR 코드 스캔]       │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  📱 수동 입력                   │
│  ┌───────────────────────────┐  │
│  │ QR 코드 입력...           │🔍│
│  └───────────────────────────┘  │
│                                 │
│  📊 마지막 스캔 정보            │
│  제품: 3D 프린터 필라멘트 PLA   │
│  수량: 10개                     │
│  창고: 본사 창고               │
│                                 │
│  [입고 확정]  [취소]           │
└─────────────────────────────────┘
```

### 5.2 모바일 최적화
- **큰 버튼**: 최소 48px × 48px
- **큰 폰트**: 기본 16px 이상
- **터치 친화적**: 간격 충분히 확보
- **가로/세로 모드**: 자동 대응

---

## 🔄 6. 구현 단계별 계획

### Phase 1: 기반 구축 (1-2일)
- [ ] Git 태그 생성 및 브랜치 분기
- [ ] DB 테이블 생성 (마이그레이션)
- [ ] 라이브러리 설치
- [ ] MES 메뉴 사이드바 추가
- [ ] 기본 레이아웃 구성

### Phase 2: QR 코드 관리 (2-3일)
- [ ] QR 코드 생성 페이지
- [ ] 제품별 QR 매핑
- [ ] QR 일괄 생성 기능
- [ ] QR 라벨 출력 (PDF)

### Phase 3: QR 스캔 입고 (2-3일)
- [ ] QR 스캐너 컴포넌트
- [ ] 입고 처리 로직
- [ ] 입고 이력 조회
- [ ] 검증/취소 기능

### Phase 4: QR 스캔 출고 (2-3일)
- [ ] 출고 스캔 페이지
- [ ] 출고 처리 로직
- [ ] 재고 차감 연동
- [ ] 출고 이력 조회

### Phase 5: QR 스캔 판매 (2-3일)
- [ ] 판매 스캔 페이지
- [ ] 판매 등록 로직
- [ ] 판매 이력 조회
- [ ] 영수증 출력 연동

### Phase 6: MES 대시보드 (1-2일)
- [ ] 실시간 작업 현황
- [ ] 통계 차트
- [ ] 작업자별 처리량

### Phase 7: 테스트 및 배포 (2-3일)
- [ ] 통합 테스트
- [ ] 모바일 기기 테스트
- [ ] 프로덕션 배포
- [ ] 매뉴얼 작성

**총 예상 기간: 12-19일**

---

## 🔐 7. 보안 및 권한 관리

### 7.1 MES 전용 권한
```sql
-- users 테이블에 mes_role 컬럼 추가
ALTER TABLE users ADD COLUMN mes_role TEXT DEFAULT 'none';
-- 'none', 'viewer', 'operator', 'admin'
```

### 7.2 QR 코드 보안
- **고유성 보장**: UUID v4 사용
- **암호화**: 민감 정보는 암호화 저장
- **접근 제어**: 권한별 기능 제한

---

## 📊 8. 성공 지표 (KPI)

### 8.1 기능 완성도
- [ ] QR 스캔 성공률 > 95%
- [ ] 평균 처리 시간 < 5초
- [ ] 모바일 호환성 100%

### 8.2 안정성
- [ ] 기존 기능 영향도 0%
- [ ] 롤백 테스트 성공
- [ ] 에러율 < 1%

---

## 🚨 9. 리스크 관리

### 9.1 기술적 리스크
| 리스크 | 영향도 | 대응 방안 |
|--------|--------|-----------|
| 카메라 접근 권한 거부 | 중 | 수동 입력 대체 옵션 제공 |
| QR 스캔 실패율 높음 | 중 | 바코드 대체 지원 |
| 모바일 성능 저하 | 중 | 최적화 및 경량화 |
| 기존 기능 충돌 | 고 | 완전 분리 아키텍처 |

### 9.2 비즈니스 리스크
| 리스크 | 영향도 | 대응 방안 |
|--------|--------|-----------|
| 사용자 교육 부족 | 중 | 상세 매뉴얼 및 튜토리얼 |
| QR 라벨 출력 비용 | 저 | 단계적 도입 |

---

## 📚 10. 참고 자료

### 10.1 라이브러리 문서
- html5-qrcode: https://github.com/mebjas/html5-qrcode
- qrcode: https://www.npmjs.com/package/qrcode
- jspdf: https://github.com/parallax/jsPDF

### 10.2 관련 표준
- QR Code ISO/IEC 18004
- GS1 표준 (제품 식별)

---

## ✅ 11. 체크리스트

### 시작 전 확인사항
- [ ] 현재 프로덕션 버전 정상 작동 확인
- [ ] Git 원격 저장소 백업 완료
- [ ] Cloudflare Pages 배포 이력 확인
- [ ] 팀원/관계자 공유 완료

### 완료 후 확인사항
- [ ] 전체 기능 테스트 ( inbound, outbound, sale)
- [ ] 롤백 테스트 성공
- [ ] 성능 테스트 통과
- [ ] 문서화 완료
- [ ] 사용자 교육 자료 준비

---

## 📞 12. 문의 및 지원

### 구현 중 문의사항
- 기술 문제: 즉시 이슈 등록
- 요구사항 변경: 문서 업데이트 후 재검토

---

**작성자**: Antigravity AI Assistant  
**최종 수정**: 2026-01-13  
**문서 버전**: 1.0.0
