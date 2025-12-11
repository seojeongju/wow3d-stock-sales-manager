/* outbound.js - 출고 관리 모듈 */

// 전역 상태
let outboundCurrentPage = 1;
const outboundPerPage = 10;
if (!window.outboundCart) window.outboundCart = [];

async function renderOutboundPage() {
    const content = document.getElementById('content');
    content.innerHTML = `
    <div class="flex flex-col h-full">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-slate-800">
          <i class="fas fa-truck-loading mr-2 text-teal-600"></i>출고 관리
        </h1>
      </div>

      <!-- 탭 네비게이션 -->
      <div class="flex border-b border-slate-200 mb-6 bg-white rounded-t-xl px-4 pt-2 shadow-sm">
        <button id="tab-out-reg" class="px-6 py-4 font-bold text-teal-600 border-b-2 border-teal-600 transition-colors flex items-center" onclick="switchOutboundTab('reg')">
          <i class="fas fa-edit mr-2"></i>간편 출고 등록
        </button>
        <button id="tab-out-hist" class="px-6 py-4 font-medium text-slate-500 hover:text-slate-700 transition-colors flex items-center" onclick="switchOutboundTab('hist')">
          <i class="fas fa-history mr-2"></i>출고 이력 조회
        </button>
      </div>

      <!-- 탭 컨텐츠 영역 -->
      <div id="outboundTabContent" class="flex-1 overflow-hidden flex flex-col relative">
        <!-- 동적 로드 -->
      </div>
    </div>
  `;

    // 기본 탭 로드
    switchOutboundTab('reg');
}

async function switchOutboundTab(tabName) {
    const tabs = ['reg', 'hist'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-out-${t}`);
        if (t === tabName) {
            btn.classList.remove('text-slate-500', 'font-medium', 'border-transparent');
            btn.classList.add('text-teal-600', 'border-b-2', 'border-teal-600', 'font-bold');
        } else {
            btn.classList.remove('text-teal-600', 'border-b-2', 'border-teal-600', 'font-bold');
            btn.classList.add('text-slate-500', 'font-medium', 'border-transparent');
        }
    });

    const container = document.getElementById('outboundTabContent');
    if (tabName === 'reg') {
        await renderOutboundRegistrationTab(container);
    } else {
        await renderOutboundHistoryTab(container);
    }
}

async function renderOutboundRegistrationTab(container) {
    // 상품 목록 로드
    if (!window.products) {
        try {
            const res = await axios.get(`${API_BASE}/products`);
            window.products = res.data.data;
        } catch (e) {
            console.error('상품 로드 실패', e);
        }
    }

    container.innerHTML = `
    <div class="flex flex-1 gap-6 overflow-hidden h-full pb-4">
      <!-- 좌측: 상품 선택 -->
      <div class="w-1/2 flex flex-col bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="p-4 border-b border-slate-200 bg-slate-50">
          <h3 class="font-bold text-slate-800 mb-3">1. 출고 상품 선택</h3>
          <div class="relative">
            <i class="fas fa-search absolute left-3 top-3 text-slate-400"></i>
            <input type="text" id="outboundSearch" placeholder="상품명 또는 SKU 검색..." 
                   class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow"
                   onkeyup="filterOutboundProducts()">
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-2" id="outboundProductList">
          <!-- 상품 목록 렌더링 -->
        </div>
      </div>

      <!-- 우측: 출고 정보 입력 -->
      <div class="w-1/2 flex flex-col gap-6 overflow-y-auto pr-2">
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 class="font-bold text-slate-800 mb-4">2. 선택된 상품</h3>
          <div id="outboundCartItems" class="space-y-3 mb-4 min-h-[100px]">
            <p class="text-center text-slate-400 py-8">상품을 선택해주세요.</p>
          </div>
          <div class="flex justify-between items-center pt-4 border-t border-slate-100">
            <span class="font-bold text-slate-600">총 수량</span>
            <span class="font-bold text-teal-600 text-lg" id="outboundTotalQty">0개</span>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 class="font-bold text-slate-800 mb-4">3. 배송 정보</h3>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">수령인</label>
                <input type="text" id="outDestName" class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">연락처</label>
                <input type="text" id="outDestPhone" class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500">
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1">주소</label>
              <input type="text" id="outDestAddress" class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 mb-2" placeholder="주소">
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 class="font-bold text-slate-800 mb-4">4. 운송장 정보</h3>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">택배사</label>
                <select id="outCourier" class="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white">
                  <option value="CJ대한통운">CJ대한통운</option>
                  <option value="우체국택배">우체국택배</option>
                  <option value="한진택배">한진택배</option>
                  <option value="롯데택배">롯데택배</option>
                  <option value="로젠택배">로젠택배</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">운송장 번호</label>
                <input type="text" id="outTracking" class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500">
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1">비고</label>
              <input type="text" id="outNotes" class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500">
            </div>
          </div>
        </div>

        <button onclick="submitDirectOutbound()" class="w-full bg-teal-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-teal-700 shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.99] mb-6">
          출고 등록 완료
        </button>
      </div>
    </div>
  `;

    renderOutboundProducts();
    renderOutboundCart();
}

function renderOutboundProducts(filterText = '') {
    const container = document.getElementById('outboundProductList');
    if (!container || !window.products) return;

    const filtered = window.products.filter(p =>
        p.name.toLowerCase().includes(filterText.toLowerCase()) ||
        p.sku.toLowerCase().includes(filterText.toLowerCase())
    );

    container.innerHTML = filtered.map(p => `
    <div class="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-colors cursor-pointer" onclick="addToOutboundCart(${p.id})">
      <div>
        <div class="font-medium text-slate-800">${p.name}</div>
        <div class="text-xs text-slate-500 flex items-center gap-2">
          <span class="font-mono bg-slate-100 px-1.5 py-0.5 rounded">${p.sku}</span>
          <span>재고: <span class="${p.current_stock <= 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}">${p.current_stock}</span></span>
        </div>
      </div>
      <button class="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center hover:bg-teal-100">
        <i class="fas fa-plus"></i>
      </button>
    </div>
  `).join('');
}

function filterOutboundProducts() {
    const text = document.getElementById('outboundSearch').value;
    renderOutboundProducts(text);
}

function addToOutboundCart(productId) {
    const product = window.products.find(p => p.id === productId);
    if (!product) return;
    if (product.current_stock <= 0) {
        showToast('재고가 없는 상품입니다.', 'error');
        return;
    }
    const existing = window.outboundCart.find(item => item.product.id === productId);
    if (existing) {
        if (existing.quantity >= product.current_stock) {
            showToast('재고 수량을 초과할 수 없습니다.', 'error');
            return;
        }
        existing.quantity++;
    } else {
        window.outboundCart.push({ product, quantity: 1 });
    }
    renderOutboundCart();
}

function renderOutboundCart() {
    const container = document.getElementById('outboundCartItems');
    const totalEl = document.getElementById('outboundTotalQty');
    if (window.outboundCart.length === 0) {
        container.innerHTML = '<p class="text-center text-slate-400 py-8">상품을 선택해주세요.</p>';
        totalEl.textContent = '0개';
        return;
    }
    let totalQty = 0;
    container.innerHTML = window.outboundCart.map(item => {
        totalQty += item.quantity;
        return `
      <div class="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
        <div class="flex-1 min-w-0">
          <div class="font-medium text-slate-800 text-sm">${item.product.name}</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center bg-white rounded border border-slate-200">
            <button onclick="updateOutboundQty(${item.product.id}, -1)" class="w-6 h-6 flex items-center justify-center hover:bg-slate-100 text-slate-500"><i class="fas fa-minus text-xs"></i></button>
            <span class="w-8 text-center text-sm font-bold">${item.quantity}</span>
            <button onclick="updateOutboundQty(${item.product.id}, 1)" class="w-6 h-6 flex items-center justify-center hover:bg-slate-100 text-slate-500"><i class="fas fa-plus text-xs"></i></button>
          </div>
          <button onclick="removeOutboundItem(${item.product.id})" class="text-slate-400 hover:text-rose-500"><i class="fas fa-times"></i></button>
        </div>
      </div>
    `;
    }).join('');
    totalEl.textContent = totalQty + '개';
}

function updateOutboundQty(productId, delta) {
    const item = window.outboundCart.find(i => i.product.id === productId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
        removeOutboundItem(productId);
        return;
    }
    if (newQty > item.product.current_stock) {
        showToast('재고 부족', 'error');
        return;
    }
    item.quantity = newQty;
    renderOutboundCart();
}

function removeOutboundItem(productId) {
    window.outboundCart = window.outboundCart.filter(i => i.product.id !== productId);
    renderOutboundCart();
}

async function submitDirectOutbound() {
    if (window.outboundCart.length === 0) {
        showToast('출고할 상품을 선택해주세요.', 'error');
        return;
    }
    const destName = document.getElementById('outDestName').value;
    const destAddress = document.getElementById('outDestAddress').value;

    if (!destName || !destAddress) {
        showToast('수령인과 주소를 입력해주세요.', 'error');
        return;
    }

    const payload = {
        items: window.outboundCart.map(i => ({ productId: i.product.id, quantity: i.quantity })),
        recipient: destName,
        phone: document.getElementById('outDestPhone').value,
        address: destAddress,
        courier: document.getElementById('outCourier').value,
        trackingNumber: document.getElementById('outTracking').value,
        memo: document.getElementById('outNotes').value,
        purchasePath: ''
    };

    try {
        await axios.post(`${API_BASE}/outbound/direct`, payload);
        showToast('출고가 완료되었습니다.');
        window.outboundCart = [];
        renderOutboundRegistrationTab(document.getElementById('outboundTabContent'));
    } catch (e) {
        console.error(e);
        showToast('출고 등록 실패: ' + (e.response?.data?.error || e.message), 'error');
    }
}

// History Tab
async function renderOutboundHistoryTab(container) {
    container.innerHTML = `
    <div class="flex flex-col h-full">
      <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6">
        <div class="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div class="flex flex-1 gap-4 w-full md:w-auto">
            <div class="relative flex-1 md:max-w-xs">
              <i class="fas fa-search absolute left-3 top-3 text-slate-400"></i>
              <input type="text" id="outHistorySearch" placeholder="주문번호 또는 받는분 검색" class="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" onkeyup="if(event.key === 'Enter') filterOutboundHistory()">
            </div>
            <select id="outHistoryStatus" class="border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500" onchange="filterOutboundHistory()">
              <option value="">전체 상태</option>
              <option value="PENDING">출고 대기</option>
              <option value="SHIPPED">출고 완료</option>
              <option value="CANCELLED">취소됨</option>
            </select>
            <button onclick="filterOutboundHistory()" class="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 font-medium transition-colors">
              <i class="fas fa-search mr-2"></i>조회
            </button>
          </div>
        </div>
      </div>
      <div id="outboundHistoryList" class="flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-slate-100 p-0"></div>
      <div id="outboundPaginationContainer" class="shrink-0 pb-6 mt-4"></div>
    </div>
  `;
    await filterOutboundHistory();
}

async function filterOutboundHistory() {
    const container = document.getElementById('outboundHistoryList');
    container.innerHTML = `<div class="flex items-center justify-center p-10"><i class="fas fa-spinner fa-spin mr-2"></i>로딩 중...</div>`;

    const search = document.getElementById('outHistorySearch')?.value || '';
    const status = document.getElementById('outHistoryStatus')?.value || '';

    try {
        const params = {
            limit: outboundPerPage,
            offset: (outboundCurrentPage - 1) * outboundPerPage,
            search,
            status
        };

        const res = await axios.get(`${API_BASE}/outbound`, { params });
        const list = res.data.data;
        const pagination = res.data.pagination || { total: list.length };

        container.innerHTML = `
      <table class="min-w-full text-sm text-left">
        <thead class="bg-slate-50 font-bold text-slate-500 sticky top-0 z-10">
          <tr>
            <th class="px-6 py-3 border-b">출고번호</th>
            <th class="px-6 py-3 border-b">일시</th>
            <th class="px-6 py-3 border-b">상품명</th>
            <th class="px-6 py-3 border-b">수령인</th>
            <th class="px-6 py-3 border-b">수량</th>
            <th class="px-6 py-3 border-b">상태</th>
            <th class="px-6 py-3 border-b text-center">관리</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${list.map(o => `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="px-6 py-4 font-mono">${o.order_number}</td>
              <td class="px-6 py-4 text-slate-500">${formatDateTimeKST(o.created_at)}</td>
              <td class="px-6 py-4 font-medium text-slate-800">
                ${o.first_product_name || '-'} ${o.item_count > 1 ? `외 ${o.item_count - 1}건` : ''}
              </td>
              <td class="px-6 py-4">${o.destination_name}</td>
              <td class="px-6 py-4">${o.total_quantity || 0}</td>
              <td class="px-6 py-4"><span class="px-2 py-1 rounded bg-slate-100 text-xs font-bold">${o.status}</span></td>
              <td class="px-6 py-4 text-center">
                <button onclick="showOutboundDetail(${o.id})" class="text-teal-600 hover:bg-teal-50 px-3 py-1 rounded text-xs font-bold">상세보기</button>
              </td>
            </tr>
          `).join('')}
          ${list.length === 0 ? '<tr><td colspan="7" class="p-8 text-center text-slate-500">데이터가 없습니다.</td></tr>' : ''}
        </tbody>
      </table>
    `;
        renderOutboundPagination(pagination);
    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="p-8 text-center text-red-500">조회 실패</div>`;
    }
}

function renderOutboundPagination(pagination) {
    const container = document.getElementById('outboundPaginationContainer');
    if (!container) return;
    const totalPages = Math.ceil((pagination.total || 0) / outboundPerPage);
    if (totalPages <= 0) { container.innerHTML = ''; return; }

    let buttons = '';
    // Simple pagination logic
    for (let i = 1; i <= totalPages; i++) {
        buttons += `<button onclick="changeOutboundPage(${i})" class="px-3 py-1 border rounded ${i === outboundCurrentPage ? 'bg-teal-600 text-white' : 'bg-white'}">${i}</button>`;
    }
    container.innerHTML = `<div class="flex justify-center gap-2">${buttons}</div>`;
}

function changeOutboundPage(page) {
    outboundCurrentPage = page;
    filterOutboundHistory();
}

async function showOutboundDetail(id) {
    try {
        const res = await axios.get(`${API_BASE}/outbound/${id}`);
        const data = res.data.data;
        const items = data.items || [];

        const modalHtml = `
      <div id="outDetailModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60]">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl m-4 max-h-[90vh] flex flex-col">
          <div class="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
            <h3 class="font-bold text-lg">출고 상세 정보</h3>
            <div class="flex gap-2">
              <button onclick="openEditOutboundModal(${data.id})" class="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500"><i class="fas fa-pen"></i></button>
              <button onclick="deleteOutbound(${data.id})" class="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-red-500"><i class="fas fa-trash"></i></button>
              <button onclick="closeOutboundDetail()" class="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center"><i class="fas fa-times"></i></button>
            </div>
          </div>
          <div class="p-6 overflow-y-auto">
            <div class="grid grid-cols-2 gap-4 mb-6">
              <div class="p-4 bg-slate-50 rounded-lg">
                <h4 class="font-bold mb-2 text-sm text-slate-500">받는 분</h4>
                <div>${data.destination_name}</div>
                <div class="text-sm text-slate-500">${data.destination_phone || '-'}</div>
                <div class="text-sm text-slate-500">${data.destination_address}</div>
              </div>
              <div class="p-4 bg-slate-50 rounded-lg">
                <h4 class="font-bold mb-2 text-sm text-slate-500">상태</h4>
                <div class="font-bold text-teal-600">${data.status}</div>
                <div class="text-sm text-slate-500">${formatDateTimeKST(data.created_at)}</div>
              </div>
            </div>
            <h4 class="font-bold mb-2">상품 목록</h4>
            <table class="w-full text-sm text-left border rounded hidden md:table">
              <thead class="bg-slate-50"><tr><th class="p-2">상품명</th><th class="p-2">수량</th></tr></thead>
              <tbody>
                ${items.map(i => `<tr><td class="p-2 border-t">${i.product_name} <span class="text-xs text-slate-400">${i.sku}</span></td><td class="p-2 border-t">${i.quantity_ordered}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    } catch (e) {
        console.error(e);
        showToast('상세 정보 로드 실패', 'error');
    }
}

function closeOutboundDetail() {
    const modal = document.getElementById('outDetailModal');
    if (modal) modal.remove();
}

async function deleteOutbound(id) {
    if (!confirm('정말 삭제하시겠습니까? 재고가 복구됩니다.')) return;
    try {
        await axios.delete(`${API_BASE}/outbound/${id}`);
        showToast('삭제되었습니다.');
        closeOutboundDetail();
        filterOutboundHistory();
    } catch (e) {
        console.error(e);
        showToast('삭제 실패', 'error');
    }
}

async function openEditOutboundModal(id) {
    closeOutboundDetail();

    try {
        const res = await axios.get(`${API_BASE}/outbound/${id}`);
        const data = res.data.data;
        const { packages } = data;
        const pkg = packages && packages.length > 0 ? packages[0] : {};

        const modalHtml = `
      <div id="outEditModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[70] transition-opacity duration-300 opacity-0">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col transform scale-95 transition-transform duration-300">
          <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
            <h3 class="text-lg font-bold text-slate-800">출고 정보 수정</h3>
            <button onclick="closeEditOutboundModal()" class="text-slate-400 hover:text-slate-600">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">수령인</label>
              <input type="text" id="editDestName" value="${data.destination_name || ''}" class="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">전화번호</label>
              <input type="text" id="editDestPhone" value="${data.destination_phone || ''}" class="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">주소</label>
              <input type="text" id="editDestAddr" value="${data.destination_address || ''}" class="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">택배사</label>
                  <select id="editCourier" class="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50">
                    <option value="">선택</option>
                    <option value="CJ대한통운" ${pkg.courier === 'CJ대한통운' ? 'selected' : ''}>CJ대한통운</option>
                    <option value="우체국택배" ${pkg.courier === '우체국택배' ? 'selected' : ''}>우체국택배</option>
                    <option value="한진택배" ${pkg.courier === '한진택배' ? 'selected' : ''}>한진택배</option>
                    <option value="롯데택배" ${pkg.courier === '롯데택배' ? 'selected' : ''}>롯데택배</option>
                    <option value="로젠택배" ${pkg.courier === '로젠택배' ? 'selected' : ''}>로젠택배</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">운송장번호</label>
                  <input type="text" id="editTrackingNum" value="${pkg.tracking_number || ''}" class="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50">
                </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">비고</label>
              <textarea id="editNotes" class="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50" rows="3">${data.notes || ''}</textarea>
            </div>
          </div>

          <div class="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl">
            <button onclick="closeEditOutboundModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">취소</button>
            <button onclick="updateOutbound(${id})" class="px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg transition-colors">저장</button>
          </div>
        </div>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        requestAnimationFrame(() => {
            const modal = document.getElementById('outEditModal');
            if (modal) {
                modal.classList.remove('opacity-0');
                modal.querySelector('div').classList.remove('scale-95');
            }
        });

    } catch (e) {
        console.error(e);
        showToast('정보 로드 실패', 'error');
    }
}

function closeEditOutboundModal() {
    const modal = document.getElementById('outEditModal');
    if (modal) {
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('scale-95');
        setTimeout(() => modal.remove(), 300);
    }
}

async function updateOutbound(id) {
    const payload = {
        destination_name: document.getElementById('editDestName').value,
        destination_phone: document.getElementById('editDestPhone').value,
        destination_address: document.getElementById('editDestAddr').value,
        courier: document.getElementById('editCourier').value,
        tracking_number: document.getElementById('editTrackingNum').value,
        notes: document.getElementById('editNotes').value
    };

    try {
        const res = await axios.put(`${API_BASE}/outbound/${id}`, payload);
        if (res.data.success) {
            showToast('수정되었습니다.');
            closeEditOutboundModal();
            filterOutboundHistory();
        }
    } catch (e) {
        console.error(e);
        showToast('수정 실패: ' + (e.response?.data?.error || e.message), 'error');
    }
}

window.updateOutbound = updateOutbound;
window.closeEditOutboundModal = closeEditOutboundModal;

// Global Assignments
window.renderOutboundPage = renderOutboundPage;
window.switchOutboundTab = switchOutboundTab;
window.renderOutboundRegistrationTab = renderOutboundRegistrationTab;
window.renderOutboundHistoryTab = renderOutboundHistoryTab;
window.filterOutboundHistory = filterOutboundHistory;
window.renderOutboundPagination = renderOutboundPagination;
window.changeOutboundPage = changeOutboundPage;
window.renderOutboundProducts = renderOutboundProducts;
window.filterOutboundProducts = filterOutboundProducts;
window.addToOutboundCart = addToOutboundCart;
window.renderOutboundCart = renderOutboundCart;
window.updateOutboundQty = updateOutboundQty;
window.removeOutboundItem = removeOutboundItem;
window.submitDirectOutbound = submitDirectOutbound;
window.showOutboundDetail = showOutboundDetail;
window.closeOutboundDetail = closeOutboundDetail;
window.deleteOutbound = deleteOutbound;
window.openEditOutboundModal = openEditOutboundModal;
