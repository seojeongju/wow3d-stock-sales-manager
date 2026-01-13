// 배송 추적 모달 열기
async function openTrackingModal(trackingNumber, courier) {
    if (!trackingNumber) {
        showToast('운송장 번호가 없습니다.', 'error');
        return;
    }

    // 모달 생성
    const modalHtml = `
    <div id="trackingModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden border border-slate-100">
        <div class="flex justify-between items-center p-6 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-white">
          <div>
            <h3 class="text-xl font-bold text-slate-800 flex items-center">
              <i class="fas fa-shipping-fast mr-2 text-teal-600"></i>
              배송 추적
            </h3>
            <p class="text-sm text-slate-500 mt-1">운송장: ${trackingNumber}</p>
          </div>
          <button onclick="closeTrackingModal()" class="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-lg">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div id="trackingContent" class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div class="text-center py-10">
            <i class="fas fa-spinner fa-spin text-3xl text-teal-600 mb-3"></i>
            <p class="text-slate-500">배송 정보를 조회하는 중...</p>
          </div>
        </div>
      </div>
    </div>
  `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // API 호출하여 배송 정보 가져오기
    try {
        const res = await axios.get(`${API_BASE}/tracking/track/${trackingNumber}`, {
            params: { courier: courier || '' }
        });

        if (res.data.success && res.data.data) {
            renderTrackingInfo(res.data.data);
        } else {
            renderTrackingError(res.data.error || '배송 정보를 찾을 수 없습니다.');
        }
    } catch (e) {
        console.error(e);
        renderTrackingError(e.response?.data?.error || '배송 정보 조회에 실패했습니다.');
    }
}

// 배송 정보 렌더링
function renderTrackingInfo(data) {
    const container = document.getElementById('trackingContent');

    // 배송 상태 색상
    const statusColors = {
        '상품준비중': 'bg-blue-100 text-blue-700',
        '집화완료': 'bg-indigo-100 text-indigo-700',
        '배송중': 'bg-purple-100 text-purple-700',
        '배송완료': 'bg-green-100 text-green-700',
        '미배송': 'bg-red-100 text-red-700'
    };

    const level = data.level || 1;
    const statusText = data.status || '배송중';
    const statusColor = statusColors[statusText] || 'bg-slate-100 text-slate-700';

    container.innerHTML = `
    <!-- 배송 상태 요약 -->
    <div class="bg-gradient-to-br from-teal-50 to-blue-50 rounded-lg p-6 mb-6 border border-teal-100">
      <div class="flex items-center justify-between mb-4">
        <div>
          <span class="px-3 py-1 rounded-full ${statusColor} text-sm font-bold">
            ${statusText}
          </span>
        </div>
        <div class="text-right">
          <p class="text-xs text-slate-500">택배사</p>
          <p class="font-bold text-slate-800">${data.courierName || data.courier || '-'}</p>
        </div>
      </div>

      <!-- 진행 바 -->
      <div class="relative pt-1">
        <div class="flex mb-2 items-center justify-between">
          <div class="text-xs font-semibold inline-block text-teal-600">
            배송 진행률
          </div>
          <div class="text-xs font-semibold inline-block text-teal-600">
            ${Math.min(level * 25, 100)}%
          </div>
        </div>
        <div class="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-teal-100">
          <div style="width:${Math.min(level * 25, 100)}%" class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-teal-600 transition-all duration-500"></div>
        </div>
      </div>

      <!-- 배송 단계 -->
      <div class="grid grid-cols-4 gap-2 mt-4">
        ${['상품준비중', '집화완료', '배송중', '배송완료'].map((step, idx) => `
          <div class="text-center">
            <div class="w-8 h-8 mx-auto rounded-full ${idx < level ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-400'} flex items-center justify-center mb-1">
              <i class="fas ${idx === 0 ? 'fa-box' : idx === 1 ? 'fa-warehouse' : idx === 2 ? 'fa-truck' : 'fa-check'} text-sm"></i>
            </div>
            <p class="text-xs ${idx < level ? 'text-teal-600 font-bold' : 'text-slate-400'}">${step}</p>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 배송 이력 -->
    ${data.trackingDetails && data.trackingDetails.length > 0 ? `
      <div class="mb-4">
        <h4 class="font-bold text-slate-800 mb-3 flex items-center">
          <i class="fas fa-history mr-2 text-slate-500"></i>
          배송 이력
        </h4>
        <div class="space-y-3">
          ${data.trackingDetails.map((detail, idx) => `
            <div class="flex gap-3 ${idx === 0 ? 'bg-teal-50 -mx-2 px-2 py-2 rounded-lg' : ''}">
              <div class="flex-shrink-0">
                <div class="w-10 h-10 rounded-full ${idx === 0 ? 'bg-teal-600' : 'bg-slate-200'} flex items-center justify-center">
                  <i class="fas fa-map-marker-alt ${idx === 0 ? 'text-white' : 'text-slate-400'}"></i>
                </div>
              </div>
              <div class="flex-1">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <p class="font-medium text-slate-800 ${idx === 0 ? 'font-bold' : ''}">${detail.where || detail.location || '-'}</p>
                    <p class="text-sm text-slate-600 mt-1">${detail.kind || detail.status || '-'}</p>
                  </div>
                  <div class="text-right ml-2">
                    <p class="text-xs text-slate-500">${formatTrackingDate(detail.timeString || detail.time)}</p>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : `
      <div class="text-center py-8 text-slate-500">
        <i class="fas fa-info-circle text-2xl mb-2"></i>
        <p>상세 배송 이력이 없습니다.</p>
      </div>
    `}

    <!-- 수령인 정보 (있는 경우) -->
    ${data.receiverName || data.receiverAddr ? `
      <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h4 class="font-bold text-slate-700 mb-2 text-sm">수령인 정보</h4>
        ${data.receiverName ? `<p class="text-sm text-slate-600">이름: ${data.receiverName}</p>` : ''}
        ${data.receiverAddr ? `<p class="text-sm text-slate-600">주소: ${data.receiverAddr}</p>` : ''}
      </div>
    ` : ''}
  `;
}

// 배송 조회 실패 시
function renderTrackingError(errorMsg) {
    const container = document.getElementById('trackingContent');

    container.innerHTML = `
    <div class="text-center py-12">
      <div class="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
        <i class="fas fa-exclamation-triangle text-2xl text-red-600"></i>
      </div>
      <h4 class="font-bold text-slate-800 mb-2">배송 정보 조회 실패</h4>
      <p class="text-sm text-slate-600 mb-4">${errorMsg}</p>
      <div class="bg-blue-50 border border-blue-100 rounded-lg p-4 max-w-md mx-auto">
        <p class="text-sm text-blue-700">
          <i class="fas fa-info-circle mr-2"></i>
          <strong>확인사항:</strong>
        </p>
        <ul class="text-xs text-blue-600 mt-2 text-left space-y-1">
          <li>• 운송장 번호가 정확한지 확인해주세요</li>
          <li>• 택배사가 올바른지 확인해주세요</li>
          <li>• API 키가 설정되어 있는지 확인해주세요 (설정 메뉴)</li>
          <li>• 배송 등록 후 시간이 조금 지나면 조회됩니다</li>
        </ul>
      </div>
    </div>
  `;
}

// 날짜 포맷팅
function formatTrackingDate(dateStr) {
    if (!dateStr) return '-';

    try {
        const date = new Date(dateStr);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${month}/${day} ${hours}:${minutes}`;
    } catch {
        return dateStr;
    }
}

// 모달 닫기
function closeTrackingModal() {
    const modal = document.getElementById('trackingModal');
    if (modal) modal.remove();
}

// Window exports
window.openTrackingModal = openTrackingModal;
window.closeTrackingModal = closeTrackingModal;
