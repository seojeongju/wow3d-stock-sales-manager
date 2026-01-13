// QR MES 모듈
// QR 코드 기반 제조실행시스템 페이지 렌더링 함수

// ================================================
// QR MES 대시보드
// ================================================
async function renderQRDashboardPage(container) {
  container.innerHTML = `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <!-- 헤더 -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <i class="fas fa-chart-line text-teal-600"></i>
            MES 대시보드
          </h2>
          <p class="text-slate-500 mt-1">실시간 QR 작업 현황 및 통계</p>
        </div>
        <div class="flex gap-2">
          <button onclick="refreshQRDashboard()" class="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
            <i class="fas fa-sync-alt mr-2"></i>새로고침
          </button>
        </div>
      </div>

      <!-- 통계 카드 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- 오늘의 입고 -->
        <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div class="flex items-center justify-between mb-3">
            <div class="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <i class="fas fa-qrcode text-white text-xl"></i>
            </div>
            <span class="text-xs font-semibold text-blue-700 bg-blue-200 px-3 py-1 rounded-full">입고</span>
          </div>
          <h3 class="text-3xl font-bold text-blue-900" id="today-inbound-count">0</h3>
          <p class="text-sm text-blue-700 mt-1">오늘의 입고 건수</p>
        </div>

        <!-- 오늘의 출고 -->
        <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
          <div class="flex items-center justify-between mb-3">
            <div class="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
              <i class="fas fa-dolly text-white text-xl"></i>
            </div>
            <span class="text-xs font-semibold text-orange-700 bg-orange-200 px-3 py-1 rounded-full">출고</span>
          </div>
          <h3 class="text-3xl font-bold text-orange-900" id="today-outbound-count">0</h3>
          <p class="text-sm text-orange-700 mt-1">오늘의 출고 건수</p>
        </div>

        <!-- 오늘의 판매 -->
        <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div class="flex items-center justify-between mb-3">
            <div class="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
              <i class="fas fa-cash-register text-white text-xl"></i>
            </div>
            <span class="text-xs font-semibold text-green-700 bg-green-200 px-3 py-1 rounded-full">판매</span>
          </div>
          <h3 class="text-3xl font-bold text-green-900" id="today-sale-count">0</h3>
          <p class="text-sm text-green-700 mt-1">오늘의 판매 건수</p>
        </div>

        <!-- 활성 QR 코드 -->
        <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div class="flex items-center justify-between mb-3">
            <div class="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
              <i class="fas fa-barcode text-white text-xl"></i>
            </div>
            <span class="text-xs font-semibold text-purple-700 bg-purple-200 px-3 py-1 rounded-full">활성</span>
          </div>
          <h3 class="text-3xl font-bold text-purple-900" id="active-qr-count">0</h3>
          <p class="text-sm text-purple-700 mt-1">활성 QR 코드</p>
        </div>
      </div>

      <!-- 최근 활동 -->
      <div class="bg-slate-50 rounded-xl p-6">
        <h3 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <i class="fas fa-history text-slate-600"></i>
          최근 QR 트랜잭션
        </h3>
        <div id="recent-qr-transactions" class="space-y-2">
          <p class="text-center text-slate-400 py-8">데이터를 불러오는 중...</p>
        </div>
      </div>
    </div>
  `;

  // 데이터 로드
  await loadQRDashboardData();
}

// ================================================
// QR 입고 페이지
// ================================================
async function renderQRInboundPage(container) {
  container.innerHTML = `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <i class="fas fa-qrcode text-teal-600"></i>
          QR 스캔 입고
        </h2>
        <p class="text-slate-500 mt-1">QR 코드를 스캔하여 입고를 등록하세요</p>
      </div>

      <!-- QR 스캐너 영역 -->
      <div class="grid md:grid-cols-2 gap-8">
        <!-- 스캔 영역 -->
        <div>
          <div class="bg-slate-50 rounded-xl p-6 border-2 border-dashed border-slate-300">
            <div id="qr-reader" class="mb-4" style="width: 100%;"></div>
            <div class="flex gap-2">
              <button id="start-scan-btn" onclick="startQRScan('inbound')" class="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold">
                <i class="fas fa-camera mr-2"></i>스캔 시작
              </button>
              <button id="stop-scan-btn" onclick="stopQRScan()" class="flex-1 px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-semibold hidden">
                <i class="fas fa-stop mr-2"></i>스캔 중지
              </button>
            </div>
          </div>

          <!-- 수동 입력 -->
          <div class="mt-6">
            <label class="block text-sm font-semibold text-slate-700 mb-2">수동 입력</label>
            <div class="flex gap-2">
              <input type="text" id="manual-qr-input" placeholder="QR 코드를 직접 입력..." 
                     class="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
              <button onclick="handleManualQRInput('inbound')" class="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
                확인
              </button>
            </div>
          </div>
        </div>

        <!-- 스캔 결과 영역 -->
        <div id="qr-scan-result" class="hidden">
          <div class="bg-teal-50 rounded-xl p-6 border border-teal-200">
            <h3 class="text-lg font-bold text-teal-900 mb-4">스캔 정보</h3>
            <div class="space-y-3">
              <div>
                <label class="text-sm font-medium text-slate-600">제품명</label>
                <p id="scanned-product-name" class="text-lg font-semibold text-slate-900"></p>
              </div>
              <div>
                <label class="text-sm font-medium text-slate-600">현재 재고</label>
                <p id="scanned-product-stock" class="text-lg font-semibold text-slate-900"></p>
              </div>
              <div>
                <label class="text-sm font-medium text-slate-600 block mb-2">입고 수량</label>
                <input type="number" id="inbound-quantity" value="1" min="1" 
                       class="w-full px-4 py-2 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500">
              </div>
              <div>
                <label class="text-sm font-medium text-slate-600 block mb-2">창고 선택</label>
                <select id="inbound-warehouse" class="w-full px-4 py-2 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500">
                  <option value="">창고를 선택하세요</option>
                </select>
              </div>
              <div>
                <label class="text-sm font-medium text-slate-600 block mb-2">메모 (선택)</label>
                <textarea id="inbound-notes" rows="3" placeholder="입고 관련 메모..."
                          class="w-full px-4 py-2 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500"></textarea>
              </div>
              <div class="flex gap-2 pt-4">
                <button onclick="confirmQRInbound()" class="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold">
                  <i class="fas fa-check mr-2"></i>입고 확정
                </button>
                <button onclick="cancelQRScan()" class="flex-1 px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-semibold">
                  <i class="fas fa-times mr-2"></i>취소
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 오늘의 입고 이력 -->
      <div class="mt-8">
        <h3 class="text-lg font-bold text-slate-800 mb-4">오늘의 입고 이력</h3>
        <div id="qr-inbound-history" class="space-y-2">
          <p class="text-center text-slate-400 py-8">입고 이력이 없습니다</p>
        </div>
      </div>
    </div>
  `;

  // 창고 목록 로드
  await loadWarehousesForQR('inbound-warehouse');
}

// ================================================
// QR 출고 페이지
// ================================================
async function renderQROutboundPage(container) {
  container.innerHTML = `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <i class="fas fa-dolly text-orange-600"></i>
          QR 스캔 출고
        </h2>
        <p class="text-slate-500 mt-1">QR 코드를 스캔하여 출고를 등록하세요</p>
      </div>

      <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
        <p class="text-sm text-orange-800">
          <i class="fas fa-info-circle mr-2"></i>
          출고 시 재고가 자동으로 차감됩니다. 재고 부족 시 출고가 불가능합니다.
        </p>
      </div>

      <!-- QR 스캐너 영역 (입고와 유사한 구조) -->
      <div class="grid md:grid-cols-2 gap-8">
        <div>
          <div class="bg-slate-50 rounded-xl p-6 border-2 border-dashed border-slate-300">
            <div id="qr-reader-outbound" class="mb-4" style="width: 100%;"></div>
            <div class="flex gap-2">
              <button onclick="startQRScan('outbound')" class="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold">
                <i class="fas fa-camera mr-2"></i>스캔 시작
              </button>
            </div>
          </div>
          <div class="mt-6">
            <label class="block text-sm font-semibold text-slate-700 mb-2">수동 입력</label>
            <div class="flex gap-2">
              <input type="text" id="manual-qr-input-outbound" placeholder="QR 코드를 직접 입력..." 
                     class="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
              <button onclick="handleManualQRInput('outbound')" class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                확인
              </button>
            </div>
          </div>
        </div>
        <div id="qr-outbound-result" class="hidden">
          <!-- 출고 정보 입력 폼 -->
        </div>
      </div>

      <!-- 오늘의 출고 이력 -->
      <div class="mt-8">
        <h3 class="text-lg font-bold text-slate-800 mb-4">오늘의 출고 이력</h3>
        <div id="qr-outbound-history" class="space-y-2">
          <p class="text-center text-slate-400 py-8">출고 이력이 없습니다</p>
        </div>
      </div>
    </div>
  `;

  await loadWarehousesForQR('outbound-warehouse');
}

// ================================================
// QR 판매 페이지
// ================================================
async function renderQRSalePage(container) {
  container.innerHTML = `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <i class="fas fa-cash-register text-green-600"></i>
          QR 스캔 판매
        </h2>
        <p class="text-slate-500 mt-1">QR 코드를 스캔하여 즉시 판매 등록</p>
      </div>

      <div class="text-center py-20 text-slate-400">
        <i class="fas fa-tools text-6xl mb-4"></i>
        <p class="text-lg">QR 판매 기능 개발 중입니다...</p>
        <p class="text-sm mt-2">곧 만나보실 수 있습니다!</p>
      </div>
    </div>
  `;
}

// ================================================
// QR 관리 페이지
// ================================================
async function renderQRManagementPage(container) {
  container.innerHTML = `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <i class="fas fa-cogs text-purple-600"></i>
          QR 코드 관리
        </h2>
        <p class="text-slate-500 mt-1">QR 코드 생성, 출력 및 관리</p>
      </div>

      <!-- QR 생성 섹션 -->
      <div class="bg-purple-50 rounded-xl p-6 border border-purple-200 mb-6">
        <h3 class="text-lg font-bold text-purple-900 mb-4">QR 코드 생성</h3>
        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">제품 선택</label>
            <select id="qr-product-select" class="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500">
              <option value="">제품을 선택하세요</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">생성 수량</label>
            <input type="number" id="qr-generate-quantity" value="1" min="1" max="100"
                   class="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500">
          </div>
        </div>
        <button onclick="generateQRCodes()" class="mt-4 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold">
          <i class="fas fa-qrcode mr-2"></i>QR 코드 생성
        </button>
      </div>

      <!-- QR 코드 목록 -->
      <div>
        <h3 class="text-lg font-bold text-slate-800 mb-4">생성된 QR 코드 목록</h3>
        <div id="qr-code-list" class="space-y-2">
          <p class="text-center text-slate-400 py-8">생성된 QR 코드가 없습니다</p>
        </div>
      </div>
    </div>
  `;

  // 제품 목록 로드
  await loadProductsForQR();
}

// ================================================
// 유틸리티 함수들
// ================================================

// QR 대시보드 데이터 로드
async function loadQRDashboardData() {
  try {
    // API 호출 예정
    console.log('QR 대시보드 데이터 로드 (개발 중)');
    // 임시 데이터
    document.getElementById('today-inbound-count').textContent = '0';
    document.getElementById('today-outbound-count').textContent = '0';
    document.getElementById('today-sale-count').textContent = '0';
    document.getElementById('active-qr-count').textContent = '0';
  } catch (error) {
    console.error('QR 대시보드 데이터 로드 실패:', error);
  }
}

// 창고 목록 로드
async function loadWarehousesForQR(selectId) {
  try {
    const res = await fetch('/api/warehouses', {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });
    const warehouses = await res.json();

    const select = document.getElementById(selectId);
    if (select) {
      warehouses.forEach(wh => {
        const option = document.createElement('option');
        option.value = wh.id;
        option.textContent = wh.name;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('창고 목록 로드 실패:', error);
  }
}

// 제품 목록 로드 (QR 관리용)
async function loadProductsForQR() {
  try {
    const res = await fetch('/api/products', {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });

    if (!res.ok) throw new Error('Failed to load products');

    const products = await res.json();

    const select = document.getElementById('qr-product-select');
    if (select) {
      select.innerHTML = '<option value="">제품을 선택하세요</option>';
      products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = `${product.name} (${product.code})`;
        select.appendChild(option);
      });
    }

    // 기존 QR 코드 목록도 로드
    await loadQRCodeList();
  } catch (error) {
    console.error('제품 목록 로드 실패:', error);
    showToast('제품 목록 로드에 실패했습니다', 'error');
  }
}

// QR 코드 목록 로드
async function loadQRCodeList() {
  try {
    const res = await fetch('/api/qr/codes?limit=50', {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });

    if (!res.ok) throw new Error('Failed to load QR codes');

    const data = await res.json();
    renderQRCodeList(data.codes);
  } catch (error) {
    console.error('QR 코드 목록 로드 실패:', error);
  }
}

// QR 코드 목록 렌더링
function renderQRCodeList(codes) {
  const container = document.getElementById('qr-code-list');
  if (!container) return;

  if (!codes || codes.length === 0) {
    container.innerHTML = '<p class="text-center text-slate-400 py-8">생성된 QR 코드가 없습니다</p>';
    return;
  }

  container.innerHTML = codes.map(code => `
    <div class="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-purple-300 transition-colors">
      <div class="flex items-center gap-4 flex-1">
        <div class="w-16 h-16 bg-white rounded-lg flex items-center justify-center border-2 border-purple-200">
          <canvas id="qr-canvas-${code.id}" class="w-full h-full"></canvas>
        </div>
        <div class="flex-1">
          <h4 class="font-semibold text-slate-800">${code.product_name}</h4>
          <p class="text-sm text-slate-500">코드: ${code.code}</p>
          <p class="text-xs text-slate-400">생성일: ${new Date(code.created_at).toLocaleDateString('ko-KR')}</p>
        </div>
        <div class="text-right">
          <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold ${code.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
    }">
            ${code.status === 'active' ? '활성' : '비활성'}
          </span>
          <p class="text-xs text-slate-500 mt-1">배치: ${code.batch_number || 'N/A'}</p>
        </div>
      </div>
      <div class="flex gap-2 ml-4">
        <button onclick="downloadQRCode('${code.code}', '${code.product_name}')" 
                class="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
          <i class="fas fa-download mr-1"></i>다운로드
        </button>
        <button onclick="printQRLabel('${code.code}', '${code.product_name}')" 
                class="px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 text-sm">
          <i class="fas fa-print mr-1"></i>출력
        </button>
      </div>
    </div>
  `).join('');

  // QR 코드 이미지 생성 (qrcode 라이브러리 사용)
  codes.forEach(code => {
    const canvas = document.getElementById(`qr-canvas-${code.id}`);
    if (canvas && window.QRCode) {
      try {
        window.QRCode.toCanvas(canvas, code.code, {
          width: 64,
          margin: 1,
          color: {
            dark: '#4c1d95',  // 보라색
            light: '#ffffff'
          }
        });
      } catch (error) {
        console.error('QR 코드 생성 실패:', error);
      }
    }
  });
}

// QR 스캔 시작
function startQRScan(type) {
  showToast('QR 스캔 기능은 Phase 3에서 구현됩니다', 'info');
  console.log(`QR 스캔 시작: ${type}`);
}

// QR 스캔 중지
function stopQRScan() {
  console.log('QR 스캔 중지');
}

// 수동 QR 입력
function handleManualQRInput(type) {
  const inputId = type === 'inbound' ? 'manual-qr-input' : 'manual-qr-input-outbound';
  const input = document.getElementById(inputId);
  const qrCode = input?.value?.trim();

  if (qrCode) {
    showToast(`QR 코드 처리 (${type}): ${qrCode}\n(Phase 3에서 구현 예정)`, 'info');
  } else {
    showToast('QR 코드를 입력하세요', 'error');
  }
}

// QR 입고 확정
function confirmQRInbound() {
  showToast('QR 입고 확정 기능은 Phase 3에서 구현됩니다', 'info');
}

// QR 스캔 취소
function cancelQRScan() {
  document.getElementById('qr-scan-result')?.classList.add('hidden');
}

// QR 코드 생성
async function generateQRCodes() {
  const productId = document.getElementById('qr-product-select')?.value;
  const quantity = parseInt(document.getElementById('qr-generate-quantity')?.value || '1');

  if (!productId) {
    showToast('제품을 선택하세요', 'error');
    return;
  }

  if (quantity < 1 || quantity > 100) {
    showToast('수량은 1-100 사이여야 합니다', 'error');
    return;
  }

  try {
    const res = await fetch('/api/qr/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.authToken}`
      },
      body: JSON.stringify({
        product_id: parseInt(productId),
        quantity: quantity,
        type: 'product'
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'QR 코드 생성 실패');
    }

    const data = await res.json();

    showToast(`✅ ${data.codes.length}개의 QR 코드가 생성되었습니다!`, 'success');

    // 목록 새로고침
    await loadQRCodeList();

    // 폼 초기화
    document.getElementById('qr-product-select').value = '';
    document.getElementById('qr-generate-quantity').value = '1';

  } catch (error) {
    console.error('QR 코드 생성 실패:', error);
    showToast(error.message || 'QR 코드 생성에 실패했습니다', 'error');
  }
}

// QR 코드 다운로드
async function downloadQRCode(qrCode, productName) {
  try {
    const canvas = document.createElement('canvas');

    // 고해상도 QR 코드 생성
    await window.QRCode.toCanvas(canvas, qrCode, {
      width: 512,
      margin: 2,
      color: {
        dark: '#4c1d95',
        light: '#ffffff'
      }
    });

    // 캔버스를 이미지로 변환하여 다운로드
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR-${productName.replace(/\s+/g, '_')}-${qrCode}.png`;
      a.click();
      URL.revokeObjectURL(url);

      showToast('QR 코드가 다운로드되었습니다', 'success');
    });
  } catch (error) {
    console.error('QR 코드 다운로드 실패:', error);
    showToast('다운로드에 실패했습니다', 'error');
  }
}

// QR 라벨 출력
async function printQRLabel(qrCode, productName) {
  showToast('QR 라벨 출력 기능은 개발 중입니다', 'info');
  // Phase 2 후반부에 jsPDF로 구현 예정
}

// QR 대시보드 새로고침
async function refreshQRDashboard() {
  await loadQRDashboardData();
  showToast('대시보드를 새로고침했습니다', 'success');
}

// 전역으로 내보내기
window.renderQRDashboardPage = renderQRDashboardPage;
window.renderQRInboundPage = renderQRInboundPage;
window.renderQROutboundPage = renderQROutboundPage;
window.renderQRSalePage = renderQRSalePage;
window.renderQRManagementPage = renderQRManagementPage;
window.generateQRCodes = generateQRCodes;
window.downloadQRCode = downloadQRCode;
window.printQRLabel = printQRLabel;
window.startQRScan = startQRScan;
window.stopQRScan = stopQRScan;
window.handleManualQRInput = handleManualQRInput;
window.confirmQRInbound = confirmQRInbound;
window.cancelQRScan = cancelQRScan;
window.refreshQRDashboard = refreshQRDashboard;

console.log('✅ QR MES 모듈 로드 완료');
