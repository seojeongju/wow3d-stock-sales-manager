/* outbound.js - 출고 관리 모듈 */

let outboundCurrentPage = 1; // History pagination
const outboundPerPage = 10;
let outboundProdPage = 1; // Product list pagination
const outboundProdLimit = 6; // Product items per page
let outboundInputMode = 'auto'; // 'auto' | 'manual'
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
      // Sort by stock descending (high to low)
      if (Array.isArray(window.products)) {
        window.products.sort((a, b) => b.current_stock - a.current_stock);
      }
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
          
          <div class="flex gap-4 mb-3">
            <label class="flex items-center cursor-pointer group">
              <input type="radio" name="outMode" value="auto" checked onchange="setOutboundMode('auto')" class="form-radio text-teal-600 focus:ring-teal-500 w-4 h-4">
              <span class="ml-2 text-sm text-slate-700 group-hover:text-teal-700 font-medium">스캔 (자동 +1)</span>
            </label>
            <label class="flex items-center cursor-pointer group">
              <input type="radio" name="outMode" value="manual" onchange="setOutboundMode('manual')" class="form-radio text-teal-600 focus:ring-teal-500 w-4 h-4">
              <span class="ml-2 text-sm text-slate-700 group-hover:text-teal-700 font-medium">수량 수동 입력</span>
            </label>
          </div>

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
        <!-- 페이지네이션 컨트롤 -->
        <div id="outboundProductPagination" class="p-2 border-t border-slate-100 bg-white"></div>
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
  const pagContainer = document.getElementById('outboundProductPagination');

  if (!container || !window.products) return;

  // 1. 필터링
  const filtered = window.products.filter(p =>
    p.name.toLowerCase().includes(filterText.toLowerCase()) ||
    p.sku.toLowerCase().includes(filterText.toLowerCase())
  );

  // 2. 페이지네이션 계산
  const total = filtered.length;
  const totalPages = Math.ceil(total / outboundProdLimit);

  // 현재 페이지 보정
  if (outboundProdPage > totalPages && totalPages > 0) outboundProdPage = 1;
  if (outboundProdPage < 1) outboundProdPage = 1;

  const start = (outboundProdPage - 1) * outboundProdLimit;
  const end = start + outboundProdLimit;
  const pageItems = filtered.slice(start, end);

  // 3. 상품 목록 렌더링
  if (total === 0) {
    container.innerHTML = '<div class="text-center text-slate-400 py-10">검색 결과가 없습니다.</div>';
  } else {
    container.innerHTML = pageItems.map(p => `
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

  // 4. 페이지네이션 컨트롤 렌더링
  if (pagContainer) {
    if (totalPages > 1) {
      let buttons = '';

      // 이전 버튼
      if (outboundProdPage > 1) {
        buttons += `<button onclick="changeOutboundProdPage(${outboundProdPage - 1})" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"><i class="fas fa-chevron-left"></i></button>`;
      }

      // 페이지 번호 (최대 5개 표시)
      let startPage = Math.max(1, outboundProdPage - 2);
      let endPage = Math.min(totalPages, startPage + 4);
      if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

      for (let i = startPage; i <= endPage; i++) {
        buttons += `<button onclick="changeOutboundProdPage(${i})" class="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${i === outboundProdPage ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}">${i}</button>`;
      }

      // 다음 버튼
      if (outboundProdPage < totalPages) {
        buttons += `<button onclick="changeOutboundProdPage(${outboundProdPage + 1})" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"><i class="fas fa-chevron-right"></i></button>`;
      }

      pagContainer.innerHTML = `<div class="flex justify-center items-center gap-1">${buttons}</div>`;
      pagContainer.classList.remove('hidden');
    } else {
      pagContainer.innerHTML = '';
      pagContainer.classList.add('hidden');
    }
  }
}

function changeOutboundProdPage(page) {
  outboundProdPage = page;
  renderOutboundProducts(document.getElementById('outboundSearch').value);
}

function filterOutboundProducts() {
  const text = document.getElementById('outboundSearch').value;
  outboundProdPage = 1; // 검색 시 페이지 초기화
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

  if (outboundInputMode === 'manual') {
    // 수동 모드: 없으면 추가하고 포커스, 있으면 포커스만
    if (!existing) {
      window.outboundCart.push({ product, quantity: 1 });
      renderOutboundCart();
    }
    // 포커스 이동 (렌더링 후 실행)
    setTimeout(() => {
      const input = document.querySelector(`input[data-qty-id="${productId}"]`);
      if (input) {
        input.focus();
        input.select();
      }
    }, 50);
  } else {
    // 자동 모드: 기존 로직 (+1)
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
      <div class="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 hover:border-teal-200 transition-colors">
        <div class="flex-1 min-w-0 mr-4">
          <div class="font-medium text-slate-800 text-sm truncate">${item.product.name}</div>
          <div class="text-xs text-slate-500 font-mono">${item.product.sku}</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center bg-white rounded border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500">
            <button onclick="updateOutboundQty(${item.product.id}, -1)" tabindex="-1" class="w-8 h-8 flex items-center justify-center hover:bg-slate-100 text-slate-500 border-r border-slate-100 active:bg-slate-200 transition-colors">
              <i class="fas fa-minus text-xs"></i>
            </button>
            <input type="number" 
                   value="${item.quantity}" 
                   min="1" 
                   max="${item.product.current_stock}"
                   data-qty-id="${item.product.id}"
                   onchange="updateOutboundQtyFromInput(${item.product.id}, this.value)"
                   class="w-16 h-8 text-center text-sm font-bold border-none focus:ring-0 p-0 appearance-none mx-0"
                   onclick="this.select()"
            >
            <button onclick="updateOutboundQty(${item.product.id}, 1)" tabindex="-1" class="w-8 h-8 flex items-center justify-center hover:bg-slate-100 text-slate-500 border-l border-slate-100 active:bg-slate-200 transition-colors">
              <i class="fas fa-plus text-xs"></i>
            </button>
          </div>
          <button onclick="removeOutboundItem(${item.product.id})" tabindex="-1" class="text-slate-400 hover:text-red-500 w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors">
            <i class="fas fa-times"></i>
          </button>
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
            <button onclick="downloadOutboundExcel()" class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-medium transition-colors">
              <i class="fas fa-file-excel mr-2"></i>엑셀 다운로드
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
    const packages = data.packages || [];

    const modalHtml = `
      <div id="outDetailModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] transition-opacity duration-300 opacity-0">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col transform scale-95 transition-transform duration-300">
          <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
            <div>
              <h3 class="text-xl font-bold text-slate-800 flex items-center gap-2">
                <i class="fas fa-file-invoice-dollar text-teal-600"></i> 출고 상세 정보
              </h3>
              <p class="text-sm text-slate-500 mt-1 font-mono">${data.order_number}</p>
            </div>
            <div class="flex items-center gap-1">
                <button onclick="openEditOutboundModal(${data.id})" class="text-slate-400 hover:text-teal-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors" title="수정">
                  <i class="fas fa-pen text-sm"></i>
                </button>
                <button onclick="deleteOutbound(${data.id})" class="text-slate-400 hover:text-red-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors" title="삭제">
                  <i class="fas fa-trash text-sm"></i>
                </button>
                <div class="w-px h-4 bg-slate-200 mx-2"></div>
                <button onclick="closeOutboundDetail()" class="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors">
                  <i class="fas fa-times text-lg"></i>
                </button>
            </div>
          </div>
          
          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            <!-- 상태 및 기본 정보 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 class="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">받는 분 정보</h4>
                <div class="space-y-2 text-sm">
                  <div class="flex"><span class="w-20 text-slate-500">이름</span> <span class="font-medium text-slate-900">${data.destination_name}</span></div>
                  <div class="flex"><span class="w-20 text-slate-500">연락처</span> <span class="font-medium text-slate-900">${data.destination_phone ? formatPhoneNumber(data.destination_phone) : '-'}</span></div>
                  <div class="flex"><span class="w-20 text-slate-500">주소</span> <span class="font-medium text-slate-900 break-all">${data.destination_address}</span></div>
                </div>
              </div>
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 class="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">출고 상태</h4>
                <div class="space-y-2 text-sm">
                  <div class="flex"><span class="w-20 text-slate-500">구매 경로</span> <span class="font-medium text-slate-900">${data.purchase_path || '-'}</span></div>
                  <div class="flex items-center"><span class="w-20 text-slate-500">상태</span> 
                    <span class="px-2 py-0.5 rounded bg-white border border-slate-200 text-xs font-bold text-teal-600 shadow-sm">${data.status}</span>
                  </div>
                  <div class="flex"><span class="w-20 text-slate-500">담당자</span> <span class="text-slate-700">${data.created_by_name || '-'}</span></div>
                  <div class="flex"><span class="w-20 text-slate-500">등록일</span> <span class="text-slate-700">${formatDateTimeKST(data.created_at)}</span></div>
                  <div class="flex"><span class="w-20 text-slate-500">비고</span> <span class="text-slate-700">${data.notes || '-'}</span></div>
                </div>
              </div>
            </div>

            <!-- 상품 목록 -->
            <div>
              <h4 class="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <i class="fas fa-box-open text-slate-400"></i> 출고 상품 목록
              </h4>
              <div class="border border-slate-200 rounded-lg overflow-hidden">
                <table class="min-w-full text-sm text-left divide-y divide-slate-200">
                  <thead class="bg-slate-50 font-semibold text-slate-500">
                    <tr>
                      <th class="px-4 py-3">상품명 / SKU</th>
                      <th class="px-4 py-3 text-center">수량</th>
                      <th class="px-4 py-3 text-center">상태</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 bg-white">
                    ${items.map(i => `
                      <tr>
                        <td class="px-4 py-3">
                          <div class="font-medium text-slate-900">${i.product_name}</div>
                          <div class="text-xs text-slate-500 font-mono">${i.sku}</div>
                        </td>
                        <td class="px-4 py-3 text-center font-bold text-slate-700">${i.quantity_ordered}</td>
                        <td class="px-4 py-3 text-center">
                          <span class="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">${i.status}</span>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 배송 정보 (패키지) -->
            <div>
              <h4 class="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <i class="fas fa-truck text-slate-400"></i> 배송 및 운송장 정보
              </h4>
              <div class="grid grid-cols-1 gap-3">
                ${packages.length > 0 ? packages.map(p => `
                  <div class="flex items-center justify-between p-4 bg-teal-50 border border-indigo-100 rounded-lg">
                    <div class="flex items-center gap-4">
                      <div class="bg-white p-2 rounded-full shadow-sm text-teal-600">
                        <i class="fas fa-shipping-fast"></i>
                      </div>
                      <div>
                        <div class="font-bold text-teal-900">${p.courier || '-'}</div>
                        <div class="text-sm text-teal-700 font-mono tracking-wide">${p.tracking_number || '-'}</div>
                      </div>
                    </div>
                    <div class="text-right text-sm">
                      <div class="font-medium text-slate-600">${p.box_type || '박스정보 없음'}</div>
                      <div class="text-slate-500">수량: ${p.box_count || 1}</div>
                    </div>
                  </div>
                `).join('') : '<div class="text-slate-500 text-sm p-4 bg-slate-50 rounded-lg text-center">등록된 운송장 정보가 없습니다.</div>'}
              </div>
            </div>
          </div>
          
          <div class="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
            <button onclick="closeOutboundDetail()" class="px-6 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium transition-colors shadow-lg shadow-slate-200">
              닫기
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // 애니메이션
    requestAnimationFrame(() => {
      const modal = document.getElementById('outDetailModal');
      const content = modal.querySelector('div');
      if (modal && content) {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
      }
    });

  } catch (e) {
    console.error(e);
    alert('상세 정보를 불러오는데 실패했습니다.');
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
    const errMsg = e.response?.data?.error || e.message;
    const details = e.response?.data?.details || '';
    const debug = e.response?.data?.debug || '';

    alert(`삭제 실패:\n${errMsg}\n\n[상세 정보]\n${details}\n${debug}`);
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
              <input type="text" id="editDestPhone" value="${formatPhoneNumber(data.destination_phone) || ''}" class="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50">
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
window.changeOutboundProdPage = changeOutboundProdPage;
window.renderOutboundProducts = renderOutboundProducts;
window.filterOutboundProducts = filterOutboundProducts;
window.addToOutboundCart = addToOutboundCart;
window.renderOutboundCart = renderOutboundCart;
window.updateOutboundQty = updateOutboundQty;
window.removeOutboundItem = removeOutboundItem;

// New Helper Functions
function setOutboundMode(mode) {
  outboundInputMode = mode;
  // UI 상태 업데이트는 필요시 여기서 수행 (현재는 renderCart에서 처리하거나, 검색창 포커스 등)
  const searchInput = document.getElementById('outboundSearch');
  if (searchInput && mode === 'auto') {
    searchInput.focus();
  }
}
window.setOutboundMode = setOutboundMode;

function updateOutboundQtyFromInput(productId, value) {
  const qty = parseInt(value);
  if (isNaN(qty) || qty <= 0) {
    // 1 미만 입력 시 삭제 또는 1로 복귀? 여기서는 1로 복귀하고 토스트 경고
    // 사용자 경험상 삭제보다 1이 나음
    showToast('수량은 1 이상이어야 합니다.', 'error');
    renderOutboundCart(); // 값 리셋
    return;
  }

  const item = window.outboundCart.find(i => i.product.id === productId);
  if (!item) return;

  if (qty > item.product.current_stock) {
    showToast(`재고 부족 (최대 ${item.product.current_stock}개)`, 'error');
    item.quantity = item.product.current_stock; // 최대치로 보정
  } else {
    item.quantity = qty;
  }
  renderOutboundCart();

  // 입력 후 포커스 유지 (renderCart 호출로 DOM이 재생성되면 포커스 잃음. 재설정 필요)
  setTimeout(() => {
    const input = document.querySelector(`input[data-qty-id="${productId}"]`);
    if (input) {
      input.focus();
      // 커서를 끝으로? or Select all? 여기서 선택할 필요는 없을듯.
    }
  }, 0);
}
window.updateOutboundQtyFromInput = updateOutboundQtyFromInput;
window.submitDirectOutbound = submitDirectOutbound;
window.showOutboundDetail = showOutboundDetail;
window.closeOutboundDetail = closeOutboundDetail;
window.deleteOutbound = deleteOutbound;
window.openEditOutboundModal = openEditOutboundModal;
window.downloadOutboundExcel = downloadOutboundExcel;

async function downloadOutboundExcel() {
  const search = document.getElementById('outHistorySearch')?.value || '';
  const status = document.getElementById('outHistoryStatus')?.value || '';

  try {
    const params = { search, status, limit: 1000 }; // Fetch up to 1000 for export
    const res = await axios.get(`${API_BASE}/outbound`, { params });
    const list = res.data.data;

    if (!list || list.length === 0) {
      showToast('다운로드할 데이터가 없습니다.', 'info');
      return;
    }

    // CSV Data Generation
    const headers = ['출고번호', '일시', '상태', '상품명', '수량', '수령인', '연락처', '주소', '구매경로', '택배사', '운송장번호', '담당자', '비고'];
    const rows = list.map(o => {
      const productName = o.first_product_name ? (o.first_product_name + (o.item_count > 1 ? ` 외 ${o.item_count - 1}건` : '')) : '-';
      return [
        o.order_number,
        formatDateTimeKST(o.created_at),
        o.status,
        productName,
        o.total_quantity || 0,
        o.destination_name,
        o.destination_phone,
        o.destination_address,
        o.purchase_path || '',
        o.courier_name || '',
        o.tracking_number ? `'${o.tracking_number}` : '',
        o.created_by_name || '',
        o.notes || ''
      ].map(field => {
        const str = String(field || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `출고내역_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (e) {
    console.error(e);
    showToast('엑셀 다운로드 실패', 'error');
  }
}
