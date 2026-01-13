# 배송 추적 기능 사용 가이드

## 🚀 배송 추적 모달 사용법

### HTML/JavaScript에서 사용

배송 아이콘이나 운송장 번호를 클릭했을 때 배송 추적 모달을 띄우려면:

```html
<!-- 예시 1: 버튼에서 호출 -->
<button onclick="openTrackingModal('1234567890', 'CJ대한통운')">
  <i class="fas fa-shipping-fast"></i> 배송 조회
</button>

<!-- 예시 2: 운송장 번호를 링크로 -->
<a href="#" onclick="openTrackingModal('1234567890', 'CJ대한통운'); return false;">
  1234567890
</a>

<!-- 예시 3: 아이콘만 -->
<i class="fas fa-truck cursor-pointer text-blue-600 hover:text-blue-800" 
   onclick="openTrackingModal('1234567890', 'CJ대한통운')"
   title="배송 추적"></i>
```

### 판매 관리 테이블에서 사용

```javascript
// 판매 목록 렌더링 시
const trackingCell = sale.tracking_number 
  ? `<button onclick="openTrackingModal('${sale.tracking_number}', '${sale.courier}')" 
             class="text-blue-600 hover:text-blue-800">
       <i class="fas fa-shipping-fast mr-1"></i>
       ${sale.tracking_number}
     </button>`
  : `<span class="text-slate-400">-</span>`;
```

### 출고 관리에서 사용

```javascript
// 출고 이력 테이블
${outbound.tracking_number 
  ? `<button onclick="openTrackingModal('${outbound.tracking_number}', '${outbound.courier}')"
             class="px-3 py-1 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100">
       <i class="fas fa-search mr-1"></i> 추적
     </button>`
  : '-'
}
```

## 📋 함수 시그니처

### openTrackingModal(trackingNumber, courier)

배송 추적 모달을 엽니다.

**Parameters:**
- `trackingNumber` (string, required): 운송장 번호
- `courier` (string, optional): 택배사 이름 (예: "CJ대한통운", "우체국택배")

**Example:**
```javascript
openTrackingModal('1234567890', 'CJ대한통운');
openTrackingModal('9876543210'); // 택배사 자동 감지
```

### closeTrackingModal()

배송 추적 모달을 닫습니다.

```javascript
closeTrackingModal();
```

## 🎨 모달 기능

### 표시 정보
- ✅ 실시간 배송 상태 (상품준비중, 집화완료, 배송중, 배송완료)
- ✅ 배송 진행률 프로그레스 바
- ✅ 배송 단계별 아이콘
- ✅ 상세 배송 이력 (시간, 위치, 상태)
- ✅ 수령인 정보 (있는 경우)
- ✅ 택배사 정보

### 오류 처리
- ❌ 운송장 번호가 유효하지 않은 경우
- ❌ API 키가 설정되지 않은 경우
- ❌ 배송 정보를 찾을 수 없는 경우

모든 경우에 사용자 친화적인 오류 메시지와 해결 방법을 표시합니다.

## 🔧 API 요구사항

이 기능을 사용하려면:
1. **설정 메뉴** → **API 설정** 탭에서 스위트트래커 API 키 입력
2. API Key 저장
3. 테스트 버튼으로 연결 확인

## 💡 디자인 특징

- 🎨 그라데이션 배경과 모던한 UI
- 📱 반응형 디자인 (모바일 친화적)
- ⚡ 부드러운 애니메이션
- 🎯 직관적인 배송 단계 표시
- 🔄 실시간 로딩 인디케이터

## 📝 통합 예시

### 완전한 테이블 행 예시

```javascript
`<tr>
  <td>${sale.id}</td>
  <td>${sale.customer_name}</td>
  <td>${sale.product_name}</td>
  <td>
    ${sale.tracking_number 
      ? `<div class="flex items-center gap-2">
           <span class="text-sm text-slate-600">${sale.tracking_number}</span>
           <button onclick="openTrackingModal('${sale.tracking_number}', '${sale.courier}')"
                   class="p-1.5 hover:bg-teal-50 rounded-lg transition-colors"
                   title="배송 추적">
             <i class="fas fa-shipping-fast text-teal-600"></i>
           </button>
         </div>`
      : '<span class="text-slate-400">-</span>'
    }
  </td>
</tr>`
```

---

**Made with ❤️ for WOW3D Stock Manager**
