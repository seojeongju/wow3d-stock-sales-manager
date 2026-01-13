// QR MES QR 스캐너 컴포넌트
// html5-qrcode 라이브러리를 사용한 QR 코드 스캐너

class QRScanner {
    constructor(elementId, onScanSuccess, onScanError) {
        this.elementId = elementId;
        this.onScanSuccess = onScanSuccess;
        this.onScanError = onScanError;
        this.scanner = null;
        this.isScanning = false;
    }

    /**
     * QR 스캐너 초기화 및 시작
     */
    async start() {
        if (this.isScanning) {
            console.warn('Scanner is already running');
            return;
        }

        try {
            // HTML5 QR Code 스캐너 인스턴스 생성
            const { Html5Qrcode } = window;
            this.scanner = new Html5Qrcode(this.elementId);

            // 스캔 설정
            const config = {
                fps: 10, // 초당 프레임 수
                qrbox: { width: 250, height: 250 }, // 스캔 박스 크기
                aspectRatio: 1.0 // 1:1 비율
            };

            // 카메라 시작
            await this.scanner.start(
                { facingMode: "environment" }, // 후면 카메라 우선
                config,
                this.handleScanSuccess.bind(this),
                this.handleScanError.bind(this)
            );

            this.isScanning = true;
            console.log('QR Scanner started successfully');
        } catch (error) {
            console.error('Failed to start QR scanner:', error);
            this.onScanError(error);
        }
    }

    /**
     * QR 스캔 성공 핸들러
     */
    handleScanSuccess(decodedText, decodedResult) {
        console.log('QR Code scanned:', decodedText);

        // 스캔 성공 시 진동 피드백 (모바일)
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }

        // 콜백 실행
        this.onScanSuccess(decodedText, decodedResult);
    }

    /**
     * QR 스캔 에러 핸들러
     */
    handleScanError(error) {
        // 스캔 중 에러는 무시 (QR 코드를 찾지 못한 경우 계속 발생)
        // 실제 에러만 로깅
        if (error && !error.includes('NotFoundException')) {
            console.warn('QR Scan error:', error);
        }
    }

    /**
     * QR 스캐너 중지
     */
    async stop() {
        if (!this.isScanning || !this.scanner) {
            return;
        }

        try {
            await this.scanner.stop();
            this.scanner.clear();
            this.isScanning = false;
            console.log('QR Scanner stopped');
        } catch (error) {
            console.error('Failed to stop QR scanner:', error);
        }
    }

    /**
     * 카메라 전환 (전면/후면)
     */
    async switchCamera() {
        if (!this.isScanning) {
            return;
        }

        await this.stop();
        // 카메라 모드 토글 로직 추가 가능
        await this.start();
    }
}

// QR MES 입고 관리 모듈
export const QRInbound = {
    currentScanner: null,
    scannedProducts: [],

    /**
     * QR 입고 페이지 초기화
     */
    init() {
        this.renderInboundPage();
        this.initScanner();
        this.attachEventListeners();
    },

    /**
     * QR 입고 페이지 렌더링
     */
    renderInboundPage() {
        const content = `
      <div class="qr-inbound-container">
        <!-- 헤더 -->
        <div class="page-header">
          <h1>📦 QR 스캔 입고</h1>
          <p class="subtitle">QR 코드를 스캔하여 입고를 등록하세요</p>
        </div>

        <!-- QR 스캐너 섹션 -->
        <div class="scanner-section">
          <div class="scanner-wrapper">
            <div id="qr-reader" class="qr-reader"></div>
          </div>

          <div class="scanner-controls">
            <button id="start-scan-btn" class="btn btn-primary btn-lg">
              🎥 스캔 시작
            </button>
            <button id="stop-scan-btn" class="btn btn-secondary btn-lg" style="display: none;">
              ⏹️ 스캔 중지
            </button>
          </div>

          <!-- 수동 입력 옵션 -->
          <div class="manual-input-section">
            <h3>📱 수동 입력</h3>
            <div class="input-group">
              <input 
                type="text" 
                id="manual-qr-input" 
                class="form-control" 
                placeholder="QR 코드를 직접 입력하세요..."
              />
              <button id="manual-submit-btn" class="btn btn-success">
                확인
              </button>
            </div>
          </div>
        </div>

        <!-- 스캔 결과 섹션 -->
        <div class="scan-result-section" id="scan-result" style="display: none;">
          <h3>📊 스캔 정보</h3>
          <div class="result-card">
            <div class="product-info">
              <div class="info-row">
                <span class="label">제품명:</span>
                <span id="product-name" class="value"></span>
              </div>
              <div class="info-row">
                <span class="label">제품 코드:</span>
                <span id="product-code" class="value"></span>
              </div>
              <div class="info-row">
                <span class="label">현재 재고:</span>
                <span id="current-stock" class="value"></span>
              </div>
            </div>

            <!-- 입고 수량 입력 -->
            <div class="quantity-input-section">
              <label for="inbound-quantity">입고 수량</label>
              <div class="quantity-controls">
                <button class="btn btn-sm btn-outline" id="decrease-qty">-</button>
                <input 
                  type="number" 
                  id="inbound-quantity" 
                  class="form-control" 
                  value="1" 
                  min="1"
                />
                <button class="btn btn-sm btn-outline" id="increase-qty">+</button>
              </div>
            </div>

            <!-- 창고 선택 -->
            <div class="warehouse-select-section">
              <label for="warehouse-select">입고 창고</label>
              <select id="warehouse-select" class="form-control">
                <option value="">창고를 선택하세요</option>
              </select>
            </div>

            <!-- 메모 -->
            <div class="notes-section">
              <label for="inbound-notes">메모 (선택)</label>
              <textarea 
                id="inbound-notes" 
                class="form-control" 
                rows="3" 
                placeholder="입고 관련 메모를 입력하세요..."
              ></textarea>
            </div>

            <!-- 액션 버튼 -->
            <div class="action-buttons">
              <button id="confirm-inbound-btn" class="btn btn-success btn-lg">
                ✅ 입고 확정
              </button>
              <button id="cancel-inbound-btn" class="btn btn-danger btn-lg">
                ❌ 취소
              </button>
            </div>
          </div>
        </div>

        <!-- 입고 이력 섹션 -->
        <div class="inbound-history-section">
          <h3>📋 오늘의 입고 이력</h3>
          <div id="inbound-history-list" class="history-list">
            <!-- 동적으로 생성됨 -->
          </div>
        </div>
      </div>
    `;

        document.getElementById('main-content').innerHTML = content;
    },

    /**
     * QR 스캐너 초기화
     */
    initScanner() {
        this.currentScanner = new QRScanner(
            'qr-reader',
            this.handleQRScanSuccess.bind(this),
            this.handleQRScanError.bind(this)
        );
    },

    /**
     * 이벤트 리스너 등록
     */
    attachEventListeners() {
        // 스캔 시작/중지 버튼
        document.getElementById('start-scan-btn').addEventListener('click', () => {
            this.startScanning();
        });

        document.getElementById('stop-scan-btn').addEventListener('click', () => {
            this.stopScanning();
        });

        // 수동 입력
        document.getElementById('manual-submit-btn').addEventListener('click', () => {
            const qrCode = document.getElementById('manual-qr-input').value.trim();
            if (qrCode) {
                this.handleQRScanSuccess(qrCode);
            }
        });

        // 수량 증가/감소
        document.getElementById('increase-qty').addEventListener('click', () => {
            const input = document.getElementById('inbound-quantity');
            input.value = parseInt(input.value) + 1;
        });

        document.getElementById('decrease-qty').addEventListener('click', () => {
            const input = document.getElementById('inbound-quantity');
            if (parseInt(input.value) > 1) {
                input.value = parseInt(input.value) - 1;
            }
        });

        // 입고 확정/취소
        document.getElementById('confirm-inbound-btn').addEventListener('click', () => {
            this.confirmInbound();
        });

        document.getElementById('cancel-inbound-btn').addEventListener('click', () => {
            this.cancelInbound();
        });

        // 창고 목록 로드
        this.loadWarehouses();
    },

    /**
     * 스캔 시작
     */
    async startScanning() {
        await this.currentScanner.start();
        document.getElementById('start-scan-btn').style.display = 'none';
        document.getElementById('stop-scan-btn').style.display = 'inline-block';
    },

    /**
     * 스캔 중지
     */
    async stopScanning() {
        await this.currentScanner.stop();
        document.getElementById('start-scan-btn').style.display = 'inline-block';
        document.getElementById('stop-scan-btn').style.display = 'none';
    },

    /**
     * QR 스캔 성공 핸들러
     */
    async handleQRScanSuccess(qrCode) {
        console.log('QR Code detected:', qrCode);

        // 스캔 중지
        await this.stopScanning();

        // QR 코드로 제품 정보 조회
        try {
            const response = await fetch(`/api/qr/product?code=${qrCode}`, {
                headers: {
                    'Authorization': `Bearer ${window.authToken}`
                }
            });

            if (!response.ok) {
                throw new Error('제품을 찾을 수 없습니다');
            }

            const product = await response.json();
            this.displayProductInfo(product);
        } catch (error) {
            console.error('Failed to fetch product:', error);
            alert('QR 코드에 해당하는 제품을 찾을 수 없습니다.');
            this.startScanning(); // 다시 스캔 시작
        }
    },

    /**
     * QR 스캔 에러 핸들러
     */
    handleQRScanError(error) {
        console.error('QR Scan error:', error);
        alert('QR 스캔 중 오류가 발생했습니다. 카메라 권한을 확인하세요.');
    },

    /**
     * 제품 정보 표시
     */
    displayProductInfo(product) {
        document.getElementById('product-name').textContent = product.name;
        document.getElementById('product-code').textContent = product.code;
        document.getElementById('current-stock').textContent = `${product.quantity || 0} 개`;

        // 스캔 결과 섹션 표시
        document.getElementById('scan-result').style.display = 'block';

        // 현재 제품 정보 저장
        this.currentProduct = product;
    },

    /**
     * 창고 목록 로드
     */
    async loadWarehouses() {
        try {
            const response = await fetch('/api/warehouses', {
                headers: {
                    'Authorization': `Bearer ${window.authToken}`
                }
            });

            const warehouses = await response.json();
            const select = document.getElementById('warehouse-select');

            warehouses.forEach(warehouse => {
                const option = document.createElement('option');
                option.value = warehouse.id;
                option.textContent = warehouse.name;
                select.appendChild(option);
            });

            // 기본 창고 선택
            if (warehouses.length > 0) {
                select.value = warehouses[0].id;
            }
        } catch (error) {
            console.error('Failed to load warehouses:', error);
        }
    },

    /**
     * 입고 확정
     */
    async confirmInbound() {
        const quantity = parseInt(document.getElementById('inbound-quantity').value);
        const warehouseId = document.getElementById('warehouse-select').value;
        const notes = document.getElementById('inbound-notes').value;

        if (!warehouseId) {
            alert('창고를 선택하세요.');
            return;
        }

        if (quantity <= 0) {
            alert('수량은 1개 이상이어야 합니다.');
            return;
        }

        try {
            const response = await fetch('/api/qr/inbound', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authToken}`
                },
                body: JSON.stringify({
                    product_id: this.currentProduct.id,
                    qr_code: this.currentProduct.qr_code,
                    quantity: quantity,
                    warehouse_id: warehouseId,
                    notes: notes
                })
            });

            if (!response.ok) {
                throw new Error('입고 등록 실패');
            }

            const result = await response.json();
            alert('✅ 입고가 완료되었습니다!');

            // 화면 초기화
            this.resetForm();

            // 이력 새로고침
            this.loadInboundHistory();

            // 다시 스캔 시작
            this.startScanning();
        } catch (error) {
            console.error('Failed to confirm inbound:', error);
            alert('입고 등록 중 오류가 발생했습니다.');
        }
    },

    /**
     * 입고 취소
     */
    cancelInbound() {
        this.resetForm();
        this.startScanning();
    },

    /**
     * 폼 초기화
     */
    resetForm() {
        document.getElementById('scan-result').style.display = 'none';
        document.getElementById('inbound-quantity').value = '1';
        document.getElementById('inbound-notes').value = '';
        document.getElementById('manual-qr-input').value = '';
        this.currentProduct = null;
    },

    /**
     * 입고 이력 로드
     */
    async loadInboundHistory() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`/api/qr/inbound/history?date=${today}`, {
                headers: {
                    'Authorization': `Bearer ${window.authToken}`
                }
            });

            const history = await response.json();
            this.renderInboundHistory(history);
        } catch (error) {
            console.error('Failed to load inbound history:', error);
        }
    },

    /**
     * 입고 이력 렌더링
     */
    renderInboundHistory(history) {
        const container = document.getElementById('inbound-history-list');

        if (history.length === 0) {
            container.innerHTML = '<p class="text-muted">오늘 입고 이력이 없습니다.</p>';
            return;
        }

        const html = history.map(item => `
      <div class="history-item">
        <div class="history-time">${new Date(item.created_at).toLocaleTimeString('ko-KR')}</div>
        <div class="history-product">${item.product_name}</div>
        <div class="history-quantity">+${item.quantity}개</div>
        <div class="history-warehouse">${item.warehouse_name}</div>
      </div>
    `).join('');

        container.innerHTML = html;
    },

    /**
     * 페이지 정리
     */
    destroy() {
        if (this.currentScanner) {
            this.currentScanner.stop();
        }
    }
};

// 전역으로 내보내기 (기존 app.js와 호환)
window.QRScanner = QRScanner;
window.QRInbound = QRInbound;
