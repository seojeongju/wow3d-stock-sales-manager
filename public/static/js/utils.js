
// 유틸리티: 토스트 메시지
function showToast(message, type = 'success') {
    const el = document.createElement('div');
    el.className = `fixed bottom-5 right-5 px-6 py-3 rounded-xl shadow-lg text-white font-medium transform transition-all duration-300 translate-y-10 opacity-0 z-[9999] flex items-center no-print ${type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`;
    el.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2"></i>${message}`;
    document.body.appendChild(el);

    requestAnimationFrame(() => el.classList.remove('translate-y-10', 'opacity-0'));

    setTimeout(() => {
        el.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

function showSuccess(msg) { showToast(msg, 'success'); }

function showError(target, msg) {
    if (typeof target === 'string') {
        showToast(target, 'error');
    } else if (target instanceof HTMLElement) {
        target.innerHTML = `<div class="bg-red-50 text-red-600 p-4 rounded-lg text-center my-4"><i class="fas fa-exclamation-circle mr-2"></i>${msg}</div>`;
    } else {
        showToast(msg || '오류가 발생했습니다.', 'error');
    }
}

// 날짜/시간 포맷 유틸리티 - UTC를 한국 시간(KST)으로 변환
function formatDateTimeKST(utcDateString) {
    if (!utcDateString) return '-';

    const date = new Date(utcDateString);

    // 한국 시간(KST, UTC+9)으로 변환하여 표시
    return date.toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

function formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return '-';
    const cleaned = ('' + phoneNumber).replace(/\D/g, '');

    if (cleaned.length === 11) {
        return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    } else if (cleaned.length === 10) {
        if (cleaned.startsWith('02')) {
            return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
        }
        return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    } else if (cleaned.length === 9) {
        if (cleaned.startsWith('02')) {
            return cleaned.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
        }
    } else if (cleaned.length === 8) {
        return cleaned.replace(/(\d{4})(\d{4})/, '$1-$2');
    }
    return phoneNumber;
}

// 모달 닫기 공통 함수
window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.remove(), 300);
    }
}

// 전역 할당
window.showToast = showToast;
window.showSuccess = showSuccess;
window.showError = showError;
window.formatDateTimeKST = formatDateTimeKST;
// 운송장 추적 URL 생성
function getTrackingUrl(courier, number) {
    if (!number) return null;
    const cleanNum = number.replace(/[^0-9]/g, '');
    if (!cleanNum) return null;

    // 업체명 정규화
    const c = (courier || '').replace(/\s+/g, '');

    if (c.includes('CJ') || c.includes('대한통운')) return `https://nplus.doortodoor.co.kr/web/detail.jsp?slipno=${cleanNum}`;
    if (c.includes('우체국')) return `https://service.epost.go.kr/trace.RetrieveDomRgiTraceList.comm?sid1=${cleanNum}`;
    if (c.includes('한진')) return `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumVal=${cleanNum}`;
    if (c.includes('로젠')) return `https://www.ilogen.com/m/personal/trace/${cleanNum}`;
    if (c.includes('롯데')) return `https://www.lotteglogis.com/home/reservation/tracking/index/${cleanNum}`;
    if (c.includes('편의점') && c.includes('CV')) return `https://www.cvsnet.co.kr/invoice/tracking.jsp?invoice_no=${cleanNum}`;
    if (c.includes('CU')) return `https://www.cupost.co.kr/postbox/delivery/localResult.cupost?invoice_no=${cleanNum}`;

    return null;
}
window.getTrackingUrl = getTrackingUrl;
