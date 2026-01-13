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
    <div class="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl shadow-sm border border-teal-200 overflow-hidden">
      <!-- 헤더 -->
      <div class="bg-gradient-to-r from-teal-600 to-blue-600 p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <i class="fas fa-qrcode text-white text-2xl"></i>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-white flex items-center gap-3">
                QR 스캔 입고
              </h2>
              <p class="text-teal-100 mt-1">QR 코드를 스캔하여 빠르게 입고 처리</p>
            </div>
          </div>
          <button onclick="loadInboundHistory()" class="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all">
            <i class="fas fa-sync-alt mr-2"></i>새로고침
          </button>
        </div>
      </div>

      <div class="p-8">
        <!-- 메인 스캔 영역 -->
        <div class="grid lg:grid-cols-2 gap-8 mb-8">
          <!-- 왼쪽: 스캔 카메라 -->
          <div class="space-y-6">
            <!-- 스캔 상태 표시 -->
            <div id="scan-status-bar" class="bg-white rounded-xl p-4 border-2 border-slate-200 hidden">
              <div class="flex items-center gap-3">
                <
div id="scan-status-icon" class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <i class="fas fa-camera text-blue-600"></i>
                </div>
                <div class="flex-1">
                  <p id="scan-status-text" class="font-semibold text-slate-800">스캔 준비 중...</p>
                  <p id="scan-status-subtext" class="text-sm text-slate-500">QR 코드를 카메라에 비춰주세요</p>
                </div>
              </div>
            </div>

            <!-- 카메라 뷰포트 -->
            <div class="relative bg-slate-900 rounded-2xl overflow-hidden border-4 border-teal-500 shadow-2xl">
              <!-- 스캔 가이드 오버레이 -->
              <div id="scan-guide" class="absolute inset-0 z-10 pointer-events-none hidden">
                <div class="absolute inset-0 bg-black/60"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="relative w-64 h-64">
                    <!-- 스캔 박스 애니메이션 -->
                    <div class="scan-box-border"></div>
                    <div class="absolute inset-0 border-4 border-teal-400 rounded-2xl animate-pulse"></div>
                    <!-- 코너 마크 -->
                    <div class="scan-corner top-0 left-0"></div>
                    <div class="scan-corner top-0 right-0"></div>
                    <div class="scan-corner bottom-0 left-0"></div>
                    <div class="scan-corner bottom-0 right-0"></div>
                    <!-- 스캔 라인 애니메이션 -->
                    <div class="scan-line"></div>
                  </div>
                </div>
              </div>
              
              <!-- 카메라 영역 -->
              <div id="qr-reader" class="min-h-[400px] bg-slate-800 flex items-center justify-center">
                <div class="text-center text-white p-8">
                  <i class="fas fa-camera text-6xl mb-4 opacity-50"></i>
                  <p class="text-lg">스캔을 시작하려면 아래 버튼을 클릭하세요</p>
                </div>
              </div>
            </div>

            <!-- 컨트롤 버튼 -->
            <div class="flex gap-3">
              <button id="start-scan-btn" onclick="startQRScan('inbound')" 
                      class="flex-1 px-6 py-4 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-xl hover:from-teal-700 hover:to-blue-700 transition-all font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105">
                <i class="fas fa-camera mr-2"></i>스캔 시작
              </button>
              <button id="stop-scan-btn" onclick="stopQRScan()" 
                      class="flex-1 px-6 py-4 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all font-bold text-lg shadow-lg hidden">
                <i class="fas fa-stop-circle mr-2"></i>스캔 중지
              </button>
            </div>

            <!-- 수동 입력 -->
            <div class="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm">
              <label class="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <i class="fas fa-keyboard text-teal-600"></i>
                수동 입력
              </label>
              <div class="flex gap-2">
                <input type="text" id="manual-qr-input" placeholder="QR-XXXXXX-XXXXX 형식으로 입력..." 
                       class="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-lg font-mono"
                       onkeypress="if(event.key==='Enter') handleManualQRInput('inbound')">
                <button onclick="handleManualQRInput('inbound')" 
                        class="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all font-semibold">
                  <i class="fas fa-check mr-2"></i>확인
                </button>
              </div>
              <p class="text-xs text-slate-500 mt-2">
                <i class="fas fa-info-circle mr-1"></i>카메라를 사용할 수 없는 경우 QR 코드를 직접 입력할 수 있습니다
              </p>
            </div>
          </div>

          <!-- 오른쪽: 스캔 결과 및 입고 폼 -->
          <div>
            <!-- 대기 상태 -->
            <div id="scan-waiting" class="bg-white rounded-xl p-8 border-2 border-dashed border-slate-300">
              <div class="text-center text-slate-400 py-12">
                <div class="w-24 h-24 bg-slate-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <i class="fas fa-qrcode text-5xl text-slate-300"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-600 mb-2">스캔 대기 중</h3>
                <p class="text-slate-500">QR 코드를 스캔하면<br/>여기에 제품 정보가 표시됩니다</p>
              </div>
            </div>

            <!-- 스캔 결과 표시 -->
            <div id="qr-scan-result" class="hidden">
              <div class="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl p-6 border-2 border-teal-300 shadow-lg">
                <!-- 성공 헤더 -->
                <div class="flex items-center gap-3 mb-6 pb-4 border-b-2 border-teal-200">
                  <div class="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center">
                    <i class="fas fa-check text-white text-xl"></i>
                  </div>
                  <div class="flex-1">
                    <h3 class="text-lg font-bold text-teal-900">스캔 성공!</h3>
                    <p class="text-sm text-teal-700">제품 정보를 확인하고 입고를 진행하세요</p>
                  </div>
                </div>

                <div class="space-y-4">
                  <!-- 제품 정보 카드 -->
                  <div class="bg-white rounded-xl p-5 border border-teal-200">
                    <div class="flex items-start gap-4">
                      <div class="w-16 h-16 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-box text-teal-600 text-2xl"></i>
                      </div>
                      <div class="flex-1">
                        <label class="text-xs font-semibold text-slate-500 uppercase">제품명</label>
                        <p id="scanned-product-name" class="text-xl font-bold text-slate-900 mt-1"></p>
                        <div class="flex items-center gap-4 mt-2">
                          <div>
                            <label class="text-xs text-slate-500">현재 재고</label>
                            <p id="scanned-product-stock" class="text-lg font-semibold text-blue-600"></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 입고 정보 입력 -->
                  <div class="bg-white rounded-xl p-5 border border-teal-200 space-y-4">
                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <i class="fas fa-hashtag text-teal-600"></i>
                        입고 수량
                      </label>
                      <div class="flex items-center gap-2">
                        <button onclick="decreaseQuantity()" class="w-12 h-12 bg-slate-200 hover:bg-slate-300 rounded-lg transition-all">
                          <i class="fas fa-minus text-slate-700"></i>
                        </button>
                        <input type="number" id="inbound-quantity" value="1" min="1" 
                               class="flex-1 px-4 py-3 border-2 border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-center text-2xl font-bold text-teal-900">
                        <button onclick="increaseQuantity()" class="w-12 h-12 bg-teal-600 hover:bg-teal-700 rounded-lg transition-all">
                          <i class="fas fa-plus text-white"></i>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <i class="fas fa-warehouse text-teal-600"></i>
                        창고 선택
                      </label>
                      <select id="inbound-warehouse" 
                              class="w-full px-4 py-3 border-2 border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-lg">
                        <option value="">창고를 선택하세요</option>
                      </select>
                    </div>

                    <div>
                      <label class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <i class="fas fa-comment-alt text-teal-600"></i>
                        메모 (선택사항)
                      </label>
                      <textarea id="inbound-notes" rows="3" placeholder="입고 관련 메모를 입력하세요..."
                                class="w-full px-4 py-3 border-2 border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none"></textarea>
                    </div>
                  </div>

                  <!-- 액션 버튼 -->
                  <div class="flex gap-3 pt-4">
                    <button onclick="confirmQRInbound()" 
                            class="flex-1 px-6 py-4 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-xl hover:from-teal-700 hover:to-blue-700 font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all">
                      <i class="fas fa-check-circle mr-2"></i>입고 확정
                    </button>
                    <button onclick="cancelQRScan()" 
                            class="px-6 py-4 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl font-semibold transition-all">
                      <i class="fas fa-times mr-2"></i>취소
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 오늘의 입고 이력 -->
        <div class="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold text-slate-800 flex items-center gap-2">
              <i class="fas fa-history text-blue-600"></i>
              오늘의 입고 이력
            </h3>
            <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              실시간 업데이트
            </span>
          </div>
          <div id="qr-inbound-history" class="space-y-3">
            <p class="text-center text-slate-400 py-8">입고 이력을 불러오는 중...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- CSS 애니메이션 -->
    <style>
      .scan-box-border {
        position: absolute;
        inset: -4px;
        background: linear-gradient(45deg, #14b8a6, #3b82f6);
        border-radius: 1.5rem;
        animation: scan-box-glow 2s ease-in-out infinite;
      }

      @keyframes scan-box-glow {
        0%, 100% { opacity: 0.3; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.02); }
      }

      .scan-corner {
        position: absolute;
        width: 40px;
        height: 40px;
        border: 4px solid #14b8a6;
      }

      .scan-corner.top-0.left-0 {
        border-right: none;
        border-bottom: none;
        border-top-left-radius: 1rem;
      }

      .scan-corner.top-0.right-0 {
        border-left: none;
        border-bottom: none;
        border-top-right-radius: 1rem;
      }

      .scan-corner.bottom-0.left-0 {
        border-right: none;
        border-top: none;
        border-bottom-left-radius: 1rem;
      }

      .scan-corner.bottom-0.right-0 {
        border-left: none;
        border-top: none;
        border-bottom-right-radius: 1rem;
      }

      .scan-line {
        position: absolute;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, transparent, #14b8a6, transparent);
        box-shadow: 0 0 10px #14b8a6;
        animation: scan-line-move 2s linear infinite;
      }

      @keyframes scan-line-move {
        0% { top: 0; }
        100% { top: 100%; }
      }

      #qr-reader video {
        border-radius: 1rem;
      }
    </style>
  `;

  // 창고 목록 로드
  await loadWarehousesForQR('inbound-warehouse');
  // 입고 이력 로드
  await loadInboundHistory();
}

// ================================================
// QR 출고 페이지
// ================================================
async function renderQROutboundPage(container) {
  container.innerHTML = `
    <div class="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl shadow-sm border border-orange-200 overflow-hidden">
      <!-- 헤더 -->
      <div class="bg-gradient-to-r from-orange-600 to-red-600 p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <i class="fas fa-dolly text-white text-2xl"></i>
            </div>
            <div>
              <h2 class="text-2xl font-bold text-white flex items-center gap-3">
                QR 스캔 출고
              </h2>
              <p class="text-orange-100 mt-1">QR 코드를 스캔하여 빠르게 출고 처리</p>
            </div>
          </div>
          <button onclick="loadOutboundHistory()" class="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all">
            <i class="fas fa-sync-alt mr-2"></i>새로고침
          </button>
        </div>
      </div>

      <div class="p-8">
        <!-- 중요 공지 -->
        <div class="bg-orange-100 border-2 border-orange-300 rounded-xl p-4 mb-6 flex items-start gap-3">
          <div class="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <i class="fas fa-exclamation-triangle text-white"></i>
          </div>
          <div class="flex-1">
            <h4 class="font-bold text-orange-900 mb-1">재고 확인 필수</h4>
            <p class="text-sm text-orange-800">
              출고 시 재고가 자동으로 차감됩니다. 재고 부족 시 출고가 불가능하니 현재 재고를 반드시 확인하세요.
            </p>
          </div>
        </div>

        <!-- 메인 스캔 영역 -->
        <div class="grid lg:grid-cols-2 gap-8 mb-8">
          <!-- 왼쪽: 스캔 카메라 -->
          <div class="space-y-6">
            <!-- 스캔 상태 표시 -->
            <div id="scan-status-bar-outbound" class="bg-white rounded-xl p-4 border-2 border-slate-200 hidden">
              <div class="flex items-center gap-3">
                <div id="scan-status-icon-outbound" class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <i class="fas fa-camera text-orange-600"></i>
                </div>
                <div class="flex-1">
                  <p id="scan-status-text-outbound" class="font-semibold text-slate-800">스캔 준비 중...</p>
                  <p id="scan-status-subtext-outbound" class="text-sm text-slate-500">QR 코드를 카메라에 비춰주세요</p>
                </div>
              </div>
            </div>

            <!-- 카메라 뷰포트 -->
            <div class="relative bg-slate-900 rounded-2xl overflow-hidden border-4 border-orange-500 shadow-2xl">
              <!-- 스캔 가이드 오버레이 -->
              <div id="scan-guide-outbound" class="absolute inset-0 z-10 pointer-events-none hidden">
                <div class="absolute inset-0 bg-black/60"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="relative w-64 h-64">
                    <!-- 스캔 박스 애니메이션 -->
                    <div class="scan-box-border-outbound"></div>
                    <div class="absolute inset-0 border-4 border-orange-400 rounded-2xl animate-pulse"></div>
                    <!-- 코너 마크 -->
                    <div class="scan-corner-outbound top-0 left-0"></div>
                    <div class="scan-corner-outbound top-0 right-0"></div>
                    <div class="scan-corner-outbound bottom-0 left-0"></div>
                    <div class="scan-corner-outbound bottom-0 right-0"></div>
                    <!-- 스캔 라인 애니메이션 -->
                    <div class="scan-line-outbound"></div>
                  </div>
                </div>
              </div>
              
              <!-- 카메라 영역 -->
              <div id="qr-reader-outbound" class="min-h-[400px] bg-slate-800 flex items-center justify-center">
                <div class="text-center text-white p-8">
                  <i class="fas fa-camera text-6xl mb-4 opacity-50"></i>
                  <p class="text-lg">스캔을 시작하려면 아래 버튼을 클릭하세요</p>
                </div>
              </div>
            </div>

            <!-- 컨트롤 버튼 -->
            <div class="flex gap-3">
              <button id="start-scan-btn-outbound" onclick="startQRScan('outbound')" 
                      class="flex-1 px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 transition-all font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105">
                <i class="fas fa-camera mr-2"></i>스캔 시작
              </button>
              <button id="stop-scan-btn-outbound" onclick="stopQRScan()" 
                      class="flex-1 px-6 py-4 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all font-bold text-lg shadow-lg hidden">
                <i class="fas fa-stop-circle mr-2"></i>스캔 중지
              </button>
            </div>

            <!-- 수동 입력 -->
            <div class="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm">
              <label class="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <i class="fas fa-keyboard text-orange-600"></i>
                수동 입력
              </label>
              <div class="flex gap-2">
                <input type="text" id="manual-qr-input-outbound" placeholder="QR-XXXXXX-XXXXX 형식으로 입력..." 
                       class="flex-1 px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-lg font-mono"
                       onkeypress="if(event.key==='Enter') handleManualQRInput('outbound')">
                <button onclick="handleManualQRInput('outbound')" 
                        class="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all font-semibold">
                  <i class="fas fa-check mr-2"></i>확인
                </button>
              </div>
              <p class="text-xs text-slate-500 mt-2">
                <i class="fas fa-info-circle mr-1"></i>카메라를 사용할 수 없는 경우 QR 코드를 직접 입력할 수 있습니다
              </p>
            </div>
          </div>

          <!-- 오른쪽: 스캔 결과 및 출고 폼 -->
          <div>
            <!-- 대기 상태 -->
            <div id="scan-waiting-outbound" class="bg-white rounded-xl p-8 border-2 border-dashed border-slate-300">
              <div class="text-center text-slate-400 py-12">
                <div class="w-24 h-24 bg-slate-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <i class="fas fa-dolly text-5xl text-slate-300"></i>
                </div>
                <h3 class="text-xl font-bold text-slate-600 mb-2">스캔 대기 중</h3>
                <p class="text-slate-500">QR 코드를 스캔하면<br/>여기에 제품 정보가 표시됩니다</p>
              </div>
            </div>

            <!-- 스캔 결과 표시 -->
            <div id="qr-outbound-result" class="hidden">
              <!-- JavaScript에서 동적으로 생성됨 -->
            </div>
          </div>
        </div>

        <!-- 오늘의 출고 이력 -->
        <div class="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold text-slate-800 flex items-center gap-2">
              <i class="fas fa-history text-orange-600"></i>
              오늘의 출고 이력
            </h3>
            <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
              실시간 업데이트
            </span>
          </div>
          <div id="qr-outbound-history" class="space-y-3">
            <p class="text-center text-slate-400 py-8">출고 이력을 불러오는 중...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- CSS 애니메이션 (출고용) -->
    <style>
      .scan-box-border-outbound {
        position: absolute;
        inset: -4px;
        background: linear-gradient(45deg, #ea580c, #dc2626);
        border-radius: 1.5rem;
        animation: scan-box-glow 2s ease-in-out infinite;
      }

      .scan-corner-outbound {
        position: absolute;
        width: 40px;
        height: 40px;
        border: 4px solid #ea580c;
      }

      .scan-corner-outbound.top-0.left-0 {
        border-right: none;
        border-bottom: none;
        border-top-left-radius: 1rem;
      }

      .scan-corner-outbound.top-0.right-0 {
        border-left: none;
        border-bottom: none;
        border-top-right-radius: 1rem;
      }

      .scan-corner-outbound.bottom-0.left-0 {
        border-right: none;
        border-top: none;
        border-bottom-left-radius: 1rem;
      }

      .scan-corner-outbound.bottom-0.right-0 {
        border-left: none;
        border-top: none;
        border-bottom-right-radius: 1rem;
      }

      .scan-line-outbound {
        position: absolute;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, transparent, #ea580c, transparent);
        box-shadow: 0 0 10px #ea580c;
        animation: scan-line-move 2s linear infinite;
      }
    </style>
  `;

  await loadWarehousesForQR('outbound-warehouse');
  await loadOutboundHistory();
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

// ================================================
// QR 스캔 헬퍼 함수들
// ================================================

// 수량 증가
function increaseQuantity() {
  const input = document.getElementById('inbound-quantity');
  if (input) {
    input.value = parseInt(input.value || 1) + 1;
  }
}

// 수량 감소
function decreaseQuantity() {
  const input = document.getElementById('inbound-quantity');
  if (input) {
    const currentValue = parseInt(input.value || 1);
    if (currentValue > 1) {
      input.value = currentValue - 1;
    }
  }
}

// 출고 수량 증가
function increaseOutboundQuantity(maxStock) {
  const input = document.getElementById('outbound-quantity');
  if (input) {
    const currentValue = parseInt(input.value || 1);
    if (currentValue < maxStock) {
      input.value = currentValue + 1;
    }
  }
}

// 출고 수량 감소
function decreaseOutboundQuantity() {
  const input = document.getElementById('outbound-quantity');
  if (input) {
    const currentValue = parseInt(input.value || 1);
    if (currentValue > 1) {
      input.value = currentValue - 1;
    }
  }
}

// 스캔 가이드 표시/숨기기
function toggleScanGuide(show, type = 'inbound') {
  const guideId = type === 'inbound' ? 'scan-guide' : 'scan-guide-outbound';
  const statusBarId = type === 'inbound' ? 'scan-status-bar' : 'scan-status-bar-outbound';

  const guide = document.getElementById(guideId);
  const statusBar = document.getElementById(statusBarId);

  if (guide) {
    if (show) {
      guide.classList.remove('hidden');
      if (statusBar) statusBar.classList.remove('hidden');
    } else {
      guide.classList.add('hidden');
      if (statusBar) statusBar.classList.add('hidden');
    }
  }
}

// 대기 상태 표시
function showScanWaiting(show) {
  const waiting = document.getElementById('scan-waiting');
  const result = document.getElementById('qr-scan-result');

  if (waiting && result) {
    if (show) {
      waiting.classList.remove('hidden');
      result.classList.add('hidden');
    } else {
      waiting.classList.add('hidden');
    }
  }
}

// 전역 스캔 상태
let html5QrcodeScanner = null;
let currentScannedData = null;

// QR 스캔 시작
async function startQRScan(type) {
  const readerId = type === 'inbound' ? 'qr-reader' : 'qr-reader-outbound';
  const startBtnId = type === 'inbound' ? 'start-scan-btn' : 'start-scan-btn-outbound';
  const stopBtnId = type === 'inbound' ? 'stop-scan-btn' : 'stop-scan-btn-outbound';

  const startBtn = document.getElementById(startBtnId);
  const stopBtn = document.getElementById(stopBtnId);

  if (html5QrcodeScanner) {
    showToast('이미 스캔이 진행 중입니다', 'warning');
    return;
  }

  try {
    html5QrcodeScanner = new Html5Qrcode(readerId);

    await html5QrcodeScanner.start(
      { facingMode: "environment" }, // 후면 카메라 우선
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      async (decodedText) => {
        // 스캔 성공
        console.log(`QR 스캔 성공: ${decodedText}`);

        // 스캔 중지
        await stopQRScan(type);

        // 스캔된 QR 코드 처리
        await processScannedQR(decodedText, type);
      },
      (error) => {
        // 스캔 실패 (무시)
      }
    );

    if (startBtn) startBtn.classList.add('hidden');
    if (stopBtn) stopBtn.classList.remove('hidden');

    // 스캔 가이드 표시 (type 전달)
    toggleScanGuide(true, type);

    showToast('✨ 스캔 시작! QR 코드를 카메라에 비춰주세요', 'info');

  } catch (error) {
    console.error('QR 스캔 시작 실패:', error);
    showToast('❌ 카메라 접근에 실패했습니다. 권한을 확인해주세요', 'error');
    html5QrcodeScanner = null;
  }
}

// QR 스캔 중지
async function stopQRScan(type = 'inbound') {
  if (html5QrcodeScanner) {
    try {
      await html5QrcodeScanner.stop();
    } catch (error) {
      console.error('QR 스캔 중지 실패:', error);
    }
    html5QrcodeScanner = null;
  }

  const startBtnId = type === 'inbound' ? 'start-scan-btn' : 'start-scan-btn-outbound';
  const stopBtnId = type === 'inbound' ? 'stop-scan-btn' : 'stop-scan-btn-outbound';

  const startBtn = document.getElementById(startBtnId);
  const stopBtn = document.getElementById(stopBtnId);
  if (startBtn) startBtn.classList.remove('hidden');
  if (stopBtn) stopBtn.classList.add('hidden');

  // 스캔 가이드 숨기기 (type 전달)
  toggleScanGuide(false, type);
}

// 스캔된 QR 코드 처리
async function processScannedQR(qrCode, type) {
  try {
    const res = await fetch(`/api/qr/scan/${qrCode}`, {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'QR 코드 조회 실패');
    }

    const data = await res.json();

    currentScannedData = {
      qr_code: qrCode,
      ...data.qr_code,
      type
    };    // 스캔 결과 표시
    displayScannedResult(currentScannedData, type);

    showToast('✅ QR 코드 스캔 성공!', 'success');

  } catch (error) {
    console.error('QR 스캔 처리 실패:', error);
    showToast(error.message || 'QR 코드 처리에 실패했습니다', 'error');
  }
}

// 스캔 결과 표시
function displayScannedResult(data, type) {
  const resultId = type === 'inbound' ? 'qr-scan-result' : `qr-${type}-result`;
  const resultContainer = document.getElementById(resultId);

  if (!resultContainer) return;

  // 대기 상태 숨기기
  showScanWaiting(false);

  // 입고용 결과 표시
  if (type === 'inbound') {
    document.getElementById('scanned-product-name').textContent = data.product_name;
    document.getElementById('scanned-product-stock').textContent = `${data.current_stock || 0}개`;
    document.getElementById('inbound-quantity').value = '1';
    document.getElementById('inbound-notes').value = '';

    resultContainer.classList.remove('hidden');

    // 스크롤 이동
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // 출고용 결과 표시 (출고 페이지에 동일한 구조 추가 필요)
  if (type === 'outbound') {
    resultContainer.innerHTML = `
      <div class="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border-2 border-orange-300 shadow-lg">
        <!-- 성공 헤더 -->
        <div class="flex items-center gap-3 mb-6 pb-4 border-b-2 border-orange-200">
          <div class="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
            <i class="fas fa-check text-white text-xl"></i>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-orange-900">스캔 성공!</h3>
            <p class="text-sm text-orange-700">제품 정보를 확인하고 출고를 진행하세요</p>
          </div>
        </div>

        <div class="space-y-4">
          <!-- 제품 정보 카드 -->
          <div class="bg-white rounded-xl p-5 border border-orange-200">
            <div class="flex items-start gap-4">
              <div class="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <i class="fas fa-box text-orange-600 text-2xl"></i>
              </div>
              <div class="flex-1">
                <label class="text-xs font-semibold text-slate-500 uppercase">제품명</label>
                <p class="text-xl font-bold text-slate-900 mt-1">${data.product_name}</p>
                <div class="flex items-center gap-4 mt-2">
                  <div>
                    <label class="text-xs text-slate-500">현재 재고</label>
                    <p class="text-lg font-semibold ${data.current_stock > 0 ? 'text-green-600' : 'text-red-600'}">${data.current_stock || 0}개</p>
                  </div>
                  ${data.current_stock === 0 ? '<div class="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">재고 없음</div>' : ''}
                </div>
              </div>
            </div>
          </div>

          <!-- 출고 정보 입력 -->
          <div class="bg-white rounded-xl p-5 border border-orange-200 space-y-4">
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <i class="fas fa-hashtag text-orange-600"></i>
                출고 수량
              </label>
              <div class="flex items-center gap-2">
                <button onclick="decreaseOutboundQuantity()" class="w-12 h-12 bg-slate-200 hover:bg-slate-300 rounded-lg transition-all">
                  <i class="fas fa-minus text-slate-700"></i>
                </button>
                <input type="number" id="outbound-quantity" value="1" min="1" max="${data.current_stock || 0}"
                       class="flex-1 px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-center text-2xl font-bold text-orange-900">
                <button onclick="increaseOutboundQuantity(${data.current_stock || 0})" class="w-12 h-12 bg-orange-600 hover:bg-orange-700 rounded-lg transition-all">
                  <i class="fas fa-plus text-white"></i>
                </button>
              </div>
              <p class="text-xs text-slate-500 mt-2">
                <i class="fas fa-info-circle mr-1"></i>최대 출고 가능: ${data.current_stock || 0}개
              </p>
            </div>

            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <i class="fas fa-warehouse text-orange-600"></i>
                창고 선택
              </label>
              <select id="outbound-warehouse" 
                      class="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-lg">
                <option value="">창고를 선택하세요</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <i class="fas fa-comment-alt text-orange-600"></i>
                메모 (선택사항)
              </label>
              <textarea id="outbound-notes" rows="3" placeholder="출고 관련 메모를 입력하세요..."
                        class="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 resize-none"></textarea>
            </div>
          </div>

          <!-- 액션 버튼 -->
          <div class="flex gap-3 pt-4">
            <button onclick="confirmQROutbound()" 
                    ${data.current_stock === 0 ? 'disabled' : ''}
                    class="flex-1 px-6 py-4 ${data.current_stock > 0 ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700' : 'bg-slate-300 cursor-not-allowed'} text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all">
              <i class="fas fa-check-circle mr-2"></i>출고 확정
            </button>
            <button onclick="cancelQRScan()" 
                    class="px-6 py-4 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl font-semibold transition-all">
              <i class="fas fa-times mr-2"></i>취소
            </button>
          </div>
        </div>
      </div>
    `;
    resultContainer.classList.remove('hidden');

    // 대기 상태 숨기기
    const waiting = document.getElementById('scan-waiting-outbound');
    if (waiting) waiting.classList.add('hidden');

    // 창고 목록 로드
    loadWarehousesForQR('outbound-warehouse');

    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// 수동 QR 입력
async function handleManualQRInput(type) {
  const inputId = type === 'inbound' ? 'manual-qr-input' : 'manual-qr-input-outbound';
  const input = document.getElementById(inputId);
  const qrCode = input?.value?.trim();

  if (!qrCode) {
    showToast('QR 코드를 입력하세요', 'error');
    return;
  }

  await processScannedQR(qrCode, type);

  // 입력 필드 초기화
  if (input) input.value = '';
}

// QR 입고 확정
async function confirmQRInbound() {
  if (!currentScannedData) {
    showToast('먼저 QR 코드를 스캔하세요', 'error');
    return;
  }

  const quantity = parseInt(document.getElementById('inbound-quantity')?.value || '0');
  const warehouseId = document.getElementById('inbound-warehouse')?.value;
  const notes = document.getElementById('inbound-notes')?.value?.trim();

  if (!quantity || quantity < 1) {
    showToast('올바른 수량을 입력하세요', 'error');
    return;
  }

  if (!warehouseId) {
    showToast('창고를 선택하세요', 'error');
    return;
  }

  try {
    const res = await fetch('/api/qr/inbound', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.authToken}`
      },
      body: JSON.stringify({
        qr_code: currentScannedData.qr_code,
        quantity,
        warehouse_id: parseInt(warehouseId),
        notes
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || '입고 처리 실패');
    }

    const data = await res.json();

    showToast(`✅ 입고 완료! ${data.transaction.product_name} (${quantity}개)`, 'success');

    // 폼 초기화
    currentScannedData = null;
    document.getElementById('qr-scan-result')?.classList.add('hidden');
    document.getElementById('inbound-quantity').value = '1';
    document.getElementById('inbound-notes').value = '';

    // 입고 이력 새로고침
    await loadInboundHistory();

  } catch (error) {
    console.error('QR 입고 확정 실패:', error);
    showToast(error.message || '입고 처리에 실패했습니다', 'error');
  }
}

// QR 출고 확정
async function confirmQROutbound() {
  if (!currentScannedData) {
    showToast('먼저 QR 코드를 스캔하세요', 'error');
    return;
  }

  const quantity = parseInt(document.getElementById('outbound-quantity')?.value || '0');
  const warehouseId = document.getElementById('outbound-warehouse')?.value;
  const notes = document.getElementById('outbound-notes')?.value?.trim();

  if (!quantity || quantity < 1) {
    showToast('올바른 수량을 입력하세요', 'error');
    return;
  }

  if (!warehouseId) {
    showToast('창고를 선택하세요', 'error');
    return;
  }

  try {
    const res = await fetch('/api/qr/outbound', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.authToken}`
      },
      body: JSON.stringify({
        qr_code: currentScannedData.qr_code,
        quantity,
        warehouse_id: parseInt(warehouseId),
        notes
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || '출고 처리 실패');
    }

    const data = await res.json();

    showToast(`✅ 출고 완료! ${data.transaction.product_name} (${quantity}개)`, 'success');

    // 폼 초기화
    currentScannedData = null;
    document.getElementById('qr-outbound-result')?.classList.add('hidden');

    // 출고 이력 새로고침
    await loadOutboundHistory();

  } catch (error) {
    console.error('QR 출고 확정 실패:', error);
    showToast(error.message || '출고 처리에 실패했습니다', 'error');
  }
}

// 입고 이력 로드
async function loadInboundHistory() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/qr/transactions/inbound?date=${today}&limit=10`, {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });

    if (!res.ok) throw new Error('Failed to load history');

    const data = await res.json();
    renderInboundHistory(data.transactions);
  } catch (error) {
    console.error('입고 이력 로드 실패:', error);
  }
}

// 입고 이력 렌더링
function renderInboundHistory(transactions) {
  const container = document.getElementById('qr-inbound-history');
  if (!container) return;

  if (!transactions || transactions.length === 0) {
    container.innerHTML = '<p class="text-center text-slate-400 py-8">입고 이력이 없습니다</p>';
    return;
  }

  container.innerHTML = transactions.map(tx => `
    <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <h4 class="font-semibold text-blue-900">${tx.product_name}</h4>
          <p class="text-sm text-slate-600">수량: ${tx.quantity}개 | 창고: ${tx.warehouse_name}</p>
          <p class="text-xs text-slate-500">시간: ${new Date(tx.created_at).toLocaleString('ko-KR')}</p>
          ${tx.notes ? `<p class="text-xs text-slate-600 mt-1">메모: ${tx.notes}</p>` : ''}
        </div>
        <div class="text-blue-600">
          <i class="fas fa-check-circle text-2xl"></i>
        </div>
      </div>
    </div>
  `).join('');
}

// 출고 이력 로드
async function loadOutboundHistory() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/qr/transactions/outbound?date=${today}&limit=10`, {
      headers: { 'Authorization': `Bearer ${window.authToken}` }
    });

    if (!res.ok) throw new Error('Failed to load history');

    const data = await res.json();
    renderOutboundHistory(data.transactions);
  } catch (error) {
    console.error('출고 이력 로드 실패:', error);
  }
}

// 출고 이력 렌더링
function renderOutboundHistory(transactions) {
  const container = document.getElementById('qr-outbound-history');
  if (!container) return;

  if (!transactions || transactions.length === 0) {
    container.innerHTML = '<p class="text-center text-slate-400 py-8">출고 이력이 없습니다</p>';
    return;
  }

  container.innerHTML = transactions.map(tx => `
    <div class="p-4 bg-orange-50 rounded-lg border border-orange-200">
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <h4 class="font-semibold text-orange-900">${tx.product_name}</h4>
          <p class="text-sm text-slate-600">수량: ${tx.quantity}개 | 창고: ${tx.warehouse_name}</p>
          <p class="text-xs text-slate-500">시간: ${new Date(tx.created_at).toLocaleString('ko-KR')}</p>
          ${tx.notes ? `<p class="text-xs text-slate-600 mt-1">메모: ${tx.notes}</p>` : ''}
        </div>
        <div class="text-orange-600">
          <i class="fas fa-check-circle text-2xl"></i>
        </div>
      </div>
    </div>
  `).join('');
}

// QR 스캔 취소
function cancelQRScan() {
  currentScannedData = null;
  document.getElementById('qr-scan-result')?.classList.add('hidden');
  document.getElementById('qr-outbound-result')?.classList.add('hidden');

  // 대기 상태 다시 표시
  showScanWaiting(true);  // 입고 대기 표시
  const waitingOutbound = document.getElementById('scan-waiting-outbound');
  if (waitingOutbound) waitingOutbound.classList.remove('hidden');
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
window.confirmQROutbound = confirmQROutbound;
window.cancelQRScan = cancelQRScan;
window.refreshQRDashboard = refreshQRDashboard;
window.increaseQuantity = increaseQuantity;
window.decreaseQuantity = decreaseQuantity;
window.increaseOutboundQuantity = increaseOutboundQuantity;
window.decreaseOutboundQuantity = decreaseOutboundQuantity;

console.log('✅ QR MES 모듈 로드 완료');
