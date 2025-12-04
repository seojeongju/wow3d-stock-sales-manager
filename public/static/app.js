// API Base URL
const API_BASE = '/api';

// 인증 체크
const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '/login';
}

// Axios 인터셉터 설정
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(response => {
  return response;
}, error => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
  return Promise.reject(error);
});

// 로그아웃
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

// 유틸리티: 토스트 메시지
function showToast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `fixed bottom-5 right-5 px-6 py-3 rounded-xl shadow-lg text-white font-medium transform transition-all duration-300 translate-y-10 opacity-0 z-[9999] flex items-center ${type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`;
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

// 현재 페이지 상태
let currentPage = 'dashboard';

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  loadUserInfo();
  loadPage('dashboard');
});

// 사용자 정보 로드
async function loadUserInfo() {
  try {
    // 로컬 스토리지에서 먼저 로드
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      updateUserUI(user);
    }

    // API로 최신 정보 확인
    const response = await axios.get(`${API_BASE}/auth/me`);
    if (response.data.success) {
      // 아직 auth/me가 구현되지 않았으므로(Not implemented yet), 실제 데이터가 오면 업데이트
      // 현재는 로컬 스토리지 데이터로 충분
      // const user = response.data.data;
      // localStorage.setItem('user', JSON.stringify(user));
      // updateUserUI(user);
    }
  } catch (error) {
    console.error('사용자 정보 로드 실패:', error);
  }
}

function updateUserUI(user) {
  const nameEl = document.getElementById('user-name');
  const emailEl = document.getElementById('user-email');
  const avatarEl = document.getElementById('user-avatar');

  if (nameEl) nameEl.textContent = user.name;
  if (emailEl) emailEl.textContent = user.email;

  if (avatarEl) {
    if (user.avatar_url) {
      avatarEl.innerHTML = `<img src="${user.avatar_url}" alt="${user.name}" class="w-full h-full rounded-full object-cover">`;
    } else {
      avatarEl.textContent = user.name.charAt(0).toUpperCase();
    }
  }
}

// 네비게이션 설정
function setupNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = e.currentTarget.dataset.page;

      // 활성 상태 변경
      document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.remove('active', 'text-white', 'bg-blue-500', 'shadow-md');
        l.classList.add('text-blue-100');
      });
      e.currentTarget.classList.add('active', 'text-white', 'bg-blue-500', 'shadow-md');
      e.currentTarget.classList.remove('text-blue-100');

      loadPage(page);
    });
  });
}

// 페이지 타이틀 업데이트
function updatePageTitle(title, subtitle) {
  const titleElement = document.getElementById('page-title');
  if (titleElement) {
    titleElement.textContent = title;
  }
  const subtitleElement = titleElement?.nextElementSibling;
  if (subtitleElement) {
    subtitleElement.textContent = subtitle;
  }
}

// 페이지 로드
async function loadPage(page) {
  currentPage = page;
  const content = document.getElementById('content');

  switch (page) {
    case 'dashboard':
      updatePageTitle('대시보드', '실시간 매출 및 재고 현황');
      await loadDashboard(content);
      break;
    case 'products':
      updatePageTitle('상품 관리', '상품 등록 및 재고 관리');
      await loadProducts(content);
      break;
    case 'stock':
      updatePageTitle('재고 관리', '입고/출고 및 재고 조정');
      await loadStock(content);
      break;
    case 'sales':
      updatePageTitle('판매 관리', '판매 등록 및 내역 조회');
      await loadSales(content);
      break;
    case 'customers':
      updatePageTitle('고객 관리', '고객 정보 및 구매 이력 관리');
      await loadCustomers(content);
      break;
    case 'outbound':
      updatePageTitle('출고 관리', '출고 지시, 피킹, 패킹 및 배송 처리');
      await loadOutbound(content);
      break;
    case 'settings':
      updatePageTitle('설정', '구독 및 팀원 관리');
      await loadSettingsPage(content);
      break;
  }
}

// 대시보드 로드
async function loadDashboard(content) {
  try {
    // 실패해도 전체가 죽지 않도록 개별 에러 처리
    const fetchWithFallback = (url, fallback) => axios.get(url).catch(e => {
      console.error(`Failed to fetch ${url}`, e);
      return { data: { data: fallback } };
    });

    // 병렬 데이터 로드
    const [summaryRes, salesChartRes, categoryStatsRes, lowStockRes, productsRes, salesRes, actionRes, profitRes] = await Promise.all([
      fetchWithFallback(`${API_BASE}/dashboard/summary`, {}),
      fetchWithFallback(`${API_BASE}/dashboard/sales-chart?days=30`, []),
      fetchWithFallback(`${API_BASE}/dashboard/category-stats`, []),
      fetchWithFallback(`${API_BASE}/dashboard/low-stock-alerts`, []),
      fetchWithFallback(`${API_BASE}/products?limit=5&offset=0`, []),
      fetchWithFallback(`${API_BASE}/sales?limit=5&offset=0`, []),
      fetchWithFallback(`${API_BASE}/dashboard/action-items`, { pending_shipment: 0, shipping: 0, claims: 0, low_stock: 0 }),
      fetchWithFallback(`${API_BASE}/dashboard/profit-chart?days=30`, [])
    ]);

    const data = summaryRes.data.data || {};
    const chartData = salesChartRes.data.data || [];
    const categoryStats = categoryStatsRes.data.data || [];
    const lowStockAlerts = lowStockRes.data.data || [];
    const products = productsRes.data.data || [];
    const sales = salesRes.data.data || [];
    const actionItems = actionRes.data.data || { pending_shipment: 0, shipping: 0, claims: 0, low_stock: 0 };
    const profitData = profitRes.data.data || [];

    content.innerHTML = `
      <!-- Action Board (오늘의 업무) -->
      <div class="mb-4 flex items-center gap-2">
        <h2 class="text-xl font-bold text-slate-800">오늘의 업무</h2>
        <span class="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">Action Board</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- 출고 대기 -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all group" onclick="loadPage('outbound')">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-slate-500 text-sm font-medium group-hover:text-indigo-600 transition-colors">출고 대기</p>
              <p class="text-3xl font-bold text-slate-800 mt-2">${actionItems.pending_shipment}</p>
              <p class="text-xs text-slate-400 mt-1">건의 주문 처리 필요</p>
            </div>
            <div class="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 text-xl group-hover:scale-110 transition-transform">
              <i class="fas fa-box-open"></i>
            </div>
          </div>
        </div>
        
        <!-- 배송 중 -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group" onclick="loadPage('sales')">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-slate-500 text-sm font-medium group-hover:text-blue-600 transition-colors">배송 중</p>
              <p class="text-3xl font-bold text-slate-800 mt-2">${actionItems.shipping}</p>
              <p class="text-xs text-slate-400 mt-1">건이 배송되고 있습니다</p>
            </div>
            <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 text-xl group-hover:scale-110 transition-transform">
              <i class="fas fa-truck"></i>
            </div>
          </div>
        </div>
        
        <!-- 반품/교환 -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6 cursor-pointer hover:shadow-md hover:border-amber-200 transition-all group" onclick="loadPage('sales')">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-slate-500 text-sm font-medium group-hover:text-amber-600 transition-colors">반품/교환 요청</p>
              <p class="text-3xl font-bold text-slate-800 mt-2">${actionItems.claims}</p>
              <p class="text-xs text-slate-400 mt-1">건의 클레임 확인</p>
            </div>
            <div class="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 text-xl group-hover:scale-110 transition-transform">
              <i class="fas fa-undo"></i>
            </div>
          </div>
        </div>
        
        <!-- 재고 부족 -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6 cursor-pointer hover:shadow-md hover:border-rose-200 transition-all group" onclick="loadPage('stock')">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-slate-500 text-sm font-medium group-hover:text-rose-600 transition-colors">재고 부족</p>
              <p class="text-3xl font-bold text-slate-800 mt-2">${actionItems.low_stock}</p>
              <p class="text-xs text-slate-400 mt-1">건의 상품 발주 필요</p>
            </div>
            <div class="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 text-xl group-hover:scale-110 transition-transform">
              <i class="fas fa-exclamation-triangle"></i>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 차트 영역 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <!-- 매출 추이 (2칸 차지) -->
        <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div class="flex items-center mb-6 justify-between">
            <h2 class="text-lg font-bold text-slate-800 flex items-center">
              <i class="fas fa-chart-line text-indigo-500 mr-2"></i>Profit Insight (순이익 분석)
            </h2>
            <div class="flex gap-2 text-xs font-medium">
              <span class="flex items-center"><span class="w-3 h-3 rounded-full bg-indigo-500 mr-1"></span>매출</span>
              <span class="flex items-center"><span class="w-3 h-3 rounded-full bg-emerald-500 mr-1"></span>순이익</span>
            </div>
          </div>
          <div class="h-72">
            <canvas id="salesChart"></canvas>
          </div>
        </div>

        <!-- 카테고리별 판매 비중 (1칸 차지) -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div class="flex items-center mb-6">
            <h2 class="text-lg font-bold text-slate-800 flex items-center">
              <i class="fas fa-chart-pie text-emerald-500 mr-2"></i>카테고리별 판매 비중
            </h2>
          </div>
          <div class="h-72">
            <canvas id="categoryChart"></canvas>
          </div>
        </div>
      </div>

      <!-- 하단 정보 그리드 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <!-- 최근 상품 목록 -->
        <div class="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full">
          <div class="flex items-center mb-4">
            <div class="bg-indigo-100 rounded-lg p-2 mr-3">
              <i class="fas fa-box text-indigo-600"></i>
            </div>
            <h2 class="text-xl font-bold text-gray-800">최근 상품 목록</h2>
          </div>
          <div id="dashProductList" class="space-y-3 flex-1 mb-4">
            <!-- 상품 목록 렌더링 -->
          </div>
          <div class="flex justify-center items-center gap-4 mt-auto pt-3 border-t border-slate-100">
            <button onclick="loadDashboardProducts(Math.max(0, window.dashProdPage - 1))" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"><i class="fas fa-chevron-left"></i></button>
            <span id="dashProdPageDisplay" class="text-sm text-slate-500 font-medium">1 페이지</span>
            <button onclick="loadDashboardProducts(window.dashProdPage + 1)" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"><i class="fas fa-chevron-right"></i></button>
          </div>
        </div>

        <!-- 최근 판매 현황 -->
        <div class="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full">
          <div class="flex items-center mb-4">
            <div class="bg-emerald-100 rounded-lg p-2 mr-3">
              <i class="fas fa-shopping-cart text-emerald-600"></i>
            </div>
            <h2 class="text-xl font-bold text-gray-800">최근 판매 현황</h2>
          </div>
          <div id="dashSaleList" class="space-y-3 flex-1 mb-4">
            <!-- 판매 목록 렌더링 -->
          </div>
          <div class="flex justify-center items-center gap-4 mt-auto pt-3 border-t border-slate-100">
            <button onclick="loadDashboardSales(Math.max(0, window.dashSalePage - 1))" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"><i class="fas fa-chevron-left"></i></button>
            <span id="dashSalePageDisplay" class="text-sm text-slate-500 font-medium">1 페이지</span>
            <button onclick="loadDashboardSales(window.dashSalePage + 1)" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"><i class="fas fa-chevron-right"></i></button>
          </div>
        </div>

        <!-- 재고 부족 경고 -->
        <div class="bg-white rounded-xl shadow-lg p-6">
          <div class="flex items-center mb-4">
            <div class="bg-red-100 rounded-lg p-2 mr-3">
              <i class="fas fa-exclamation-triangle text-red-600"></i>
            </div>
            <h2 class="text-xl font-bold text-gray-800">재고 부족 알림</h2>
          </div>
          <div class="space-y-3 overflow-y-auto max-h-[300px]">
            ${lowStockAlerts.length > 0 ? lowStockAlerts.map(item => `
              <div class="p-3 bg-red-50 border border-red-100 rounded-lg">
                <div class="flex justify-between items-start">
                  <div>
                    <p class="font-semibold text-gray-800 text-sm">${item.name}</p>
                    <p class="text-xs text-gray-500 mb-0.5">${[item.category, item.category_medium, item.category_small].filter(Boolean).join(' > ')}</p>
                    <p class="text-xs text-slate-400 font-mono">${item.sku}</p>
                  </div>
                  <span class="px-2 py-1 bg-red-200 text-red-800 text-xs font-bold rounded">
                    ${item.current_stock}개 남음
                  </span>
                </div>
                <div class="mt-2 w-full bg-red-200 rounded-full h-1.5">
                  <div class="bg-red-500 h-1.5 rounded-full" style="width: ${(item.current_stock / item.min_stock_alert) * 100}%"></div>
                </div>
                <p class="text-xs text-red-600 mt-1 text-right">최소 유지: ${item.min_stock_alert}</p>
              </div>
            `).join('') : `
              <div class="text-center py-8 text-gray-500">
                <i class="fas fa-check-circle text-3xl text-green-500 mb-2"></i>
                <p>재고 부족 상품이 없습니다.</p>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    // 차트 렌더링
    // 차트 렌더링
    renderCharts(chartData, categoryStats, profitData);

    // 초기 리스트 렌더링
    window.dashProdPage = 0;
    window.dashSalePage = 0;
    renderDashboardProducts(products);
    renderDashboardSales(sales);

  } catch (error) {
    console.error('대시보드 로드 실패:', error);
    showError(content, '대시보드를 불러오는데 실패했습니다.');
  }
}

async function loadDashboardProducts(page) {
  try {
    const res = await axios.get(`${API_BASE}/products?limit=5&offset=${page * 5}`);
    if (res.data.data.length === 0 && page > 0) return; // 더 이상 데이터 없음
    window.dashProdPage = page;

    const display = document.getElementById('dashProdPageDisplay');
    if (display) display.textContent = `${page + 1} 페이지`;

    renderDashboardProducts(res.data.data);
  } catch (e) {
    console.error(e);
  }
}

function renderDashboardProducts(products) {
  const container = document.getElementById('dashProductList');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = '<div class="text-center text-slate-400 py-4">상품이 없습니다.</div>';
    return;
  }

  container.innerHTML = products.map(p => `
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:shadow-md transition">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 flex-shrink-0 bg-white rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
            ${p.image_url ?
      `<img class="h-10 w-10 object-cover" src="${p.image_url}" alt="${p.name}">` :
      `<i class="fas fa-box text-slate-300"></i>`
    }
        </div>
        <div>
          <p class="font-semibold text-gray-800 text-sm truncate max-w-[120px]">${p.name}</p>
          <p class="text-xs text-gray-500">${[p.category, p.category_medium, p.category_small].filter(Boolean).join(' > ')}</p>
        </div>
      </div>
      <div class="text-right">
        <p class="font-bold text-indigo-600 text-sm">${formatCurrency(p.selling_price)}</p>
        <p class="text-xs text-slate-500">재고: ${p.current_stock}</p>
      </div>
    </div>
  `).join('');
}

async function loadDashboardSales(page) {
  try {
    const res = await axios.get(`${API_BASE}/sales?limit=5&offset=${page * 5}`);
    if (res.data.data.length === 0 && page > 0) return; // 더 이상 데이터 없음
    window.dashSalePage = page;

    const display = document.getElementById('dashSalePageDisplay');
    if (display) display.textContent = `${page + 1} 페이지`;

    renderDashboardSales(res.data.data);
  } catch (e) {
    console.error(e);
  }
}

function renderDashboardSales(sales) {
  const container = document.getElementById('dashSaleList');
  if (!container) return;

  if (sales.length === 0) {
    container.innerHTML = '<div class="text-center text-slate-400 py-4">판매 내역이 없습니다.</div>';
    return;
  }

  container.innerHTML = sales.map(s => `
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:shadow-md transition">
      <div>
        <p class="font-semibold text-gray-800 text-sm">${s.customer_name || '비회원'}</p>
        <p class="text-xs text-gray-500">${new Date(s.created_at).toLocaleDateString()}</p>
      </div>
      <div class="text-right">
        <p class="font-bold text-emerald-600 text-sm">${formatCurrency(s.final_amount)}</p>
        <span class="text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">${s.status === 'completed' ? '완료' : s.status}</span>
      </div>
    </div>
  `).join('');
}

function renderCharts(salesData, categoryData, profitData) {
  // Profit Insight 차트 (Line)
  const salesCtx = document.getElementById('salesChart').getContext('2d');
  new Chart(salesCtx, {
    type: 'line',
    data: {
      labels: profitData.map(d => d.date),
      datasets: [
        {
          label: '매출액',
          data: profitData.map(d => d.revenue),
          borderColor: '#6366f1', // Indigo 500
          backgroundColor: 'rgba(99, 102, 241, 0.05)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#6366f1',
          pointRadius: 4,
          order: 2
        },
        {
          label: '순이익',
          data: profitData.map(d => d.profit),
          borderColor: '#10b981', // Emerald 500
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.4,
          fill: false,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#10b981',
          pointRadius: 4,
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              return formatCurrency(context.raw);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { borderDash: [2, 4] },
          ticks: {
            callback: value => formatCurrency(value).replace('₩', '')
          }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });

  // 카테고리별 판매 비중 차트 (Doughnut)
  const categoryCtx = document.getElementById('categoryChart').getContext('2d');
  new Chart(categoryCtx, {
    type: 'doughnut',
    data: {
      labels: categoryData.map(d => d.category),
      datasets: [{
        data: categoryData.map(d => d.total_revenue),
        backgroundColor: [
          '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#6366f1'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { boxWidth: 12, font: { size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const value = context.raw;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100) + '%';
              return `${context.label}: ${formatCurrency(value)} (${percentage})`;
            }
          }
        }
      },
      cutout: '70%'
    }
  });
}

// 상품 관리 로드
async function loadProducts(content) {
  try {
    const response = await axios.get(`${API_BASE}/products`);
    const products = response.data.data;

    content.innerHTML = `
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-gray-800">
          <i class="fas fa-box mr-2"></i>상품 관리
        </h1>
        <div class="flex gap-2">
          <button onclick="downloadProducts()" class="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 flex items-center">
            <i class="fas fa-file-excel mr-2"></i>엑셀 다운로드
          </button>
          <button onclick="showProductModal()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center">
            <i class="fas fa-plus mr-2"></i>상품 등록
          </button>
        </div>
      </div>
      
      <!-- 필터 및 검색 -->
      <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6">
        <div class="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div class="flex flex-1 gap-4 w-full md:w-auto">
            <div class="relative flex-1 md:max-w-xs">
              <i class="fas fa-search absolute left-3 top-3 text-slate-400"></i>
              <input type="text" id="prodSearch" placeholder="상품명 또는 SKU 검색" class="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" onkeyup="if(event.key === 'Enter') filterProductsList()">
            </div>
            <select id="prodCategoryFilter" class="border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" onchange="filterProductsList()">
              <option value="">전체 카테고리</option>
            </select>
            <button onclick="toggleProductFilters()" class="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-2">
              <i class="fas fa-filter"></i>상세 필터
            </button>
          </div>
          <div class="flex gap-2">
            <button onclick="openImportModal()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center">
              <i class="fas fa-file-import mr-2"></i>엑셀 가져오기
            </button>
            <button onclick="exportProducts()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center">
              <i class="fas fa-file-export mr-2"></i>내보내기
            </button>
            <button onclick="openProductModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center">
              <i class="fas fa-plus mr-2"></i>상품 등록
            </button>
          </div>
        </div>

        <!-- 상세 필터 영역 -->
        <div id="productDetailFilters" class="hidden mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">중분류</label>
            <input type="text" id="prodCatMedium" class="w-full border border-slate-200 rounded px-3 py-2 text-sm" placeholder="중분류 입력">
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">소분류</label>
            <input type="text" id="prodCatSmall" class="w-full border border-slate-200 rounded px-3 py-2 text-sm" placeholder="소분류 입력">
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">재고 상태</label>
            <select id="prodStockStatus" class="w-full border border-slate-200 rounded px-3 py-2 text-sm">
              <option value="">전체</option>
              <option value="in_stock">재고 있음</option>
              <option value="low_stock">재고 부족</option>
              <option value="out_of_stock">품절</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">판매가 범위</label>
            <div class="flex gap-2 items-center">
              <input type="number" id="prodMinPrice" class="w-full border border-slate-200 rounded px-3 py-2 text-sm" placeholder="최소">
              <span class="text-slate-400">~</span>
              <input type="number" id="prodMaxPrice" class="w-full border border-slate-200 rounded px-3 py-2 text-sm" placeholder="최대">
            </div>
          </div>
          <div class="md:col-span-2 lg:col-span-2">
            <label class="block text-xs font-medium text-slate-500 mb-1">등록일</label>
            <div class="flex gap-2 items-center">
              <input type="date" id="prodStartDate" class="border border-slate-200 rounded px-3 py-2 text-sm">
              <span class="text-slate-400">~</span>
              <input type="date" id="prodEndDate" class="border border-slate-200 rounded px-3 py-2 text-sm">
            </div>
          </div>
          <div class="flex items-end">
            <button onclick="filterProductsList()" class="w-full bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-700 text-sm">
              적용하기
            </button>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto" id="productListContainer">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">상품정보</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">카테고리</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">판매가</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">재고</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-slate-200">
              ${products.map(p => `
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="h-10 w-10 flex-shrink-0 mr-3 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
                        ${p.image_url ?
        `<img class="h-10 w-10 object-cover" src="${p.image_url}" alt="${p.name}">` :
        `<i class="fas fa-box text-slate-400"></i>`
      }
                      </div>
                      <div class="text-sm font-medium text-slate-900">${p.name}</div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-slate-500 font-mono">${p.sku}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-600">
                      ${[p.category, p.category_medium, p.category_small].filter(Boolean).join(' > ')}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right">
                    <div class="text-sm font-bold text-slate-700">${formatCurrency(p.selling_price)}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-center">
                    <span class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${p.current_stock <= p.min_stock_alert ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}">
                      ${p.current_stock}개
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button onclick="editProduct(${p.id})" class="text-indigo-600 hover:text-indigo-900 mr-3 transition-colors">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteProductAction(${p.id})" class="text-red-500 hover:text-red-700 transition-colors">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // 카테고리 목록 로드
    loadCategories();

    // 모달 주입
    injectProductModal();

  } catch (error) {
    console.error('상품 목록 로드 실패:', error);
    showError(content, '상품 목록을 불러오는데 실패했습니다.');
  }
}

function toggleProductFilters() {
  const filters = document.getElementById('productDetailFilters');
  filters.classList.toggle('hidden');
}

async function filterProductsList() {
  const search = document.getElementById('prodSearch').value;
  const category = document.getElementById('prodCategoryFilter').value;

  // 상세 필터 값
  const categoryMedium = document.getElementById('prodCatMedium')?.value || '';
  const categorySmall = document.getElementById('prodCatSmall')?.value || '';
  const stockStatus = document.getElementById('prodStockStatus')?.value || '';
  const minPrice = document.getElementById('prodMinPrice')?.value || '';
  const maxPrice = document.getElementById('prodMaxPrice')?.value || '';
  const startDate = document.getElementById('prodStartDate')?.value || '';
  const endDate = document.getElementById('prodEndDate')?.value || '';

  const container = document.getElementById('productListContainer');

  try {
    const params = { search, category };
    if (categoryMedium) params.category_medium = categoryMedium;
    if (categorySmall) params.category_small = categorySmall;
    if (stockStatus) params.stock_status = stockStatus;
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await axios.get(`${API_BASE}/products`, { params });
    const products = response.data.data;

    // 테이블 본문만 업데이트하거나 전체 테이블 재생성. 여기선 전체 테이블 구조가 이미 있으므로 tbody만 갈아끼우거나, 
    // 위 loadProducts 구조상 table 전체를 감싸는 div id를 지정했으므로 그 내부를 갱신.
    // 하지만 loadProducts에서 table을 직접 그렸음.
    // 편의상 table 전체를 다시 그림.

    container.innerHTML = `
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">상품정보</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">카테고리</th>
            <th class="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">판매가</th>
            <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">재고</th>
            <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">관리</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-slate-200">
          ${products.map(p => `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="h-10 w-10 flex-shrink-0 mr-3 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
                    ${p.image_url ?
        `<img class="h-10 w-10 object-cover" src="${p.image_url}" alt="${p.name}">` :
        `<i class="fas fa-box text-slate-400"></i>`
      }
                  </div>
                  <div class="text-sm font-medium text-slate-900">${p.name}</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-slate-500 font-mono">${p.sku}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-600">
                  ${[p.category, p.category_medium, p.category_small].filter(Boolean).join(' > ')}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="text-sm font-bold text-slate-700">${formatCurrency(p.selling_price)}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <span class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                  ${p.current_stock <= p.min_stock_alert ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}">
                  ${p.current_stock}개
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                <button onclick="editProduct(${p.id})" class="text-indigo-600 hover:text-indigo-900 mr-3 transition-colors">
                  <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteProductAction(${p.id})" class="text-red-500 hover:text-red-700 transition-colors">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          `).join('')}
          ${products.length === 0 ? '<tr><td colspan="6" class="px-6 py-10 text-center text-slate-500">검색 결과가 없습니다.</td></tr>' : ''}
        </tbody>
      </table>
    `;
  } catch (e) {
    console.error(e);
    alert('검색 실패');
  }
}

// 고객 관리 로드 (간단 버전)
async function loadCustomers(content) {
  try {
    const response = await axios.get(`${API_BASE}/customers`);
    const customers = response.data.data;

    content.innerHTML = `
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-slate-800">
          <i class="fas fa-users mr-2 text-indigo-600"></i>고객 관리
        </h1>
        <div class="flex gap-2">
          <button onclick="downloadCustomers()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center">
            <i class="fas fa-file-excel mr-2"></i>엑셀 다운로드
          </button>
          <button onclick="showCustomerModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center">
            <i class="fas fa-plus mr-2"></i>고객 등록
          </button>
        </div>
      </div>
      
      <!-- 검색 및 필터 -->
      <div class="bg-white rounded-lg shadow-sm p-4 mb-6 border border-slate-100">
        <div class="flex flex-wrap gap-4 items-center">
          <div class="relative flex-1 min-w-[200px]">
            <i class="fas fa-search absolute left-3 top-3 text-slate-400"></i>
            <input type="text" id="custSearch" placeholder="이름 또는 연락처 검색..." 
                   class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                   onkeyup="if(event.key === 'Enter') filterCustomersList()">
          </div>
          <select id="custGradeFilter" class="border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[120px]"
                  onchange="filterCustomersList()">
            <option value="">전체 등급</option>
            <option value="일반">일반</option>
            <option value="VIP">VIP</option>
            <option value="VVIP">VVIP</option>
          </select>
          <button onclick="filterCustomersList()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 font-medium transition-colors">
            <i class="fas fa-search mr-2"></i>검색
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto" id="customerListContainer">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">이름</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">연락처</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">등급</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">총 구매액</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">구매 횟수</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-slate-200">
              ${customers.map(c => `
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-slate-900">${c.name}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-slate-600">${c.phone}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${c.grade === 'VIP' ? 'bg-amber-100 text-amber-700' :
        c.grade === 'VVIP' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}">
                      ${c.grade}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right">
                    <div class="text-sm font-bold text-slate-700">${formatCurrency(c.total_purchase_amount)}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-center">
                    <div class="text-sm text-slate-600">${c.purchase_count}회</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button onclick="editCustomer(${c.id})" class="text-indigo-600 hover:text-indigo-900 mr-3 transition-colors">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteCustomerAction(${c.id})" class="text-red-500 hover:text-red-700 transition-colors">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    // 모달 주입
    injectCustomerModal();

  } catch (error) {
    console.error('고객 목록 로드 실패:', error);
    showError(content, '고객 목록을 불러오는데 실패했습니다.');
  }
}

async function filterCustomersList() {
  const search = document.getElementById('custSearch').value;
  const grade = document.getElementById('custGradeFilter').value;
  const container = document.getElementById('customerListContainer');

  try {
    const response = await axios.get(`${API_BASE}/customers`, {
      params: { search, grade }
    });
    const customers = response.data.data;

    container.innerHTML = `
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">이름</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">연락처</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">등급</th>
            <th class="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">총 구매액</th>
            <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">구매 횟수</th>
            <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">관리</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-slate-200">
          ${customers.map(c => `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-slate-900">${c.name}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-slate-600">${c.phone}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                  ${c.grade === 'VIP' ? 'bg-amber-100 text-amber-700' :
        c.grade === 'VVIP' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}">
                  ${c.grade}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="text-sm font-bold text-slate-700">${formatCurrency(c.total_purchase_amount)}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <div class="text-sm text-slate-600">${c.purchase_count}회</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                <button onclick="editCustomer(${c.id})" class="text-indigo-600 hover:text-indigo-900 mr-3 transition-colors">
                  <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteCustomerAction(${c.id})" class="text-red-500 hover:text-red-700 transition-colors">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          `).join('')}
          ${customers.length === 0 ? '<tr><td colspan="6" class="px-6 py-10 text-center text-slate-500">검색 결과가 없습니다.</td></tr>' : ''}
        </tbody>
      </table>
    `;
  } catch (e) {
    console.error(e);
    alert('검색 실패');
  }
}

// 재고 관리 로드
async function loadStock(content) {
  try {
    // 재고 이동 내역 조회
    const response = await axios.get(`${API_BASE}/stock/movements`);
    const movements = response.data.data;

    // 상품 목록 조회 (모달용)
    const productsResponse = await axios.get(`${API_BASE}/products`);
    window.products = productsResponse.data.data;

    content.innerHTML = `
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-slate-800">재고 관리</h1>
        <div class="space-x-2">
          <button onclick="openStockModal('in')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors">
            <i class="fas fa-plus mr-2"></i>입고
          </button>
          <button onclick="openStockModal('out')" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors">
            <i class="fas fa-minus mr-2"></i>출고
          </button>
          <button onclick="openStockModal('adjust')" class="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors">
            <i class="fas fa-sync mr-2"></i>조정
          </button>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm p-4 mb-6 border border-slate-100">
        <div class="flex flex-wrap gap-4 items-center">
          <div class="flex items-center gap-2">
            <input type="date" id="stockStartDate" class="border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <span class="text-slate-400">~</span>
            <input type="date" id="stockEndDate" class="border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          </div>
          <select id="stockTypeFilter" class="border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[120px]"
                  onchange="filterStockMovements()">
            <option value="">전체 구분</option>
            <option value="입고">입고</option>
            <option value="출고">출고</option>
            <option value="조정">조정</option>
          </select>
          <button onclick="filterStockMovements()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 font-medium transition-colors">
            <i class="fas fa-search mr-2"></i>조회
          </button>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto" id="stockListContainer">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">일시</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">구분</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">상품명</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">수량</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">사유</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">담당자/비고</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-slate-200">
              ${movements.length > 0 ? movements.map(m => `
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    ${new Date(m.created_at).toLocaleString()}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${m.movement_type === '입고' ? 'bg-emerald-100 text-emerald-700' :
        m.movement_type === '출고' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}">
                      ${m.movement_type}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-slate-900">${m.product_name}</div>
                    <div class="text-xs text-slate-500 mb-0.5">${[m.category, m.category_medium, m.category_small].filter(Boolean).join(' > ')}</div>
                    <div class="text-xs text-slate-400 font-mono">${m.sku}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right">
                    <div class="text-sm font-bold ${m.movement_type === '입고' ? 'text-emerald-600' : 'text-amber-600'}">
                      ${m.movement_type === '입고' ? '+' : '-'}${m.quantity}
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    ${m.reason || '-'}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    ${m.notes || '-'}
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="6" class="px-6 py-10 text-center text-gray-500">
                    데이터가 없습니다.
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // 모달 주입
    injectStockModal();

  } catch (error) {
    console.error('재고 관리 로드 실패:', error);
    showError(content, '재고 정보를 불러오는데 실패했습니다.');
  }
}

async function filterStockMovements() {
  const startDate = document.getElementById('stockStartDate').value;
  const endDate = document.getElementById('stockEndDate').value;
  const movementType = document.getElementById('stockTypeFilter').value;
  const container = document.getElementById('stockListContainer');

  try {
    const response = await axios.get(`${API_BASE}/stock/movements`, {
      params: { startDate, endDate, movementType }
    });
    const movements = response.data.data;

    container.innerHTML = `
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">일시</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">구분</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">상품명</th>
            <th class="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">수량</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">사유</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">담당자/비고</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-slate-200">
          ${movements.length > 0 ? movements.map(m => `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                ${new Date(m.created_at).toLocaleString()}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                  ${m.movement_type === '입고' ? 'bg-emerald-100 text-emerald-700' :
        m.movement_type === '출고' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}">
                  ${m.movement_type}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-slate-900">${m.product_name}</div>
                <div class="text-xs text-slate-500 font-mono">${m.sku}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="text-sm font-bold ${m.movement_type === '입고' ? 'text-emerald-600' : 'text-amber-600'}">
                  ${m.movement_type === '입고' ? '+' : '-'}${m.quantity}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                ${m.reason || '-'}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                ${m.notes || '-'}
              </td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="6" class="px-6 py-10 text-center text-gray-500">
                데이터가 없습니다.
              </td>
            </tr>
          `}
        </tbody>
      </table>
    `;
  } catch (e) {
    console.error(e);
    alert('조회 실패');
  }
}

// 판매 관리 로드 (탭 구조)
async function loadSales(content) {
  content.innerHTML = `
    <div class="flex flex-col h-full">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-slate-800">
          <i class="fas fa-shopping-cart mr-2 text-indigo-600"></i>판매 및 주문 관리
        </h1>
      </div>

      <!-- 탭 네비게이션 -->
      <div class="flex border-b border-slate-200 mb-6 bg-white rounded-t-xl px-4 pt-2 shadow-sm">
        <button id="tab-pos" class="px-6 py-4 font-bold text-indigo-600 border-b-2 border-indigo-600 transition-colors flex items-center" onclick="switchSalesTab('pos')">
          <i class="fas fa-cash-register mr-2"></i>POS (판매등록)
        </button>
        <button id="tab-orders" class="px-6 py-4 font-medium text-slate-500 hover:text-slate-700 transition-colors flex items-center" onclick="switchSalesTab('orders')">
          <i class="fas fa-truck mr-2"></i>주문/배송 관리
        </button>
        <button id="tab-claims" class="px-6 py-4 font-medium text-slate-500 hover:text-slate-700 transition-colors flex items-center" onclick="switchSalesTab('claims')">
          <i class="fas fa-undo mr-2"></i>반품/교환 관리
        </button>
      </div>

      <!-- 탭 컨텐츠 영역 -->
      <div id="salesTabContent" class="flex-1 overflow-hidden flex flex-col relative">
        <!-- 동적 로드 -->
      </div>
    </div>
  `;

  // 기본 탭 로드
  switchSalesTab('pos');
}

// 탭 전환 함수
async function switchSalesTab(tabName) {
  // 탭 스타일 업데이트
  document.querySelectorAll('[id^="tab-"]').forEach(el => {
    el.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600', 'font-bold');
    el.classList.add('text-slate-500', 'font-medium', 'border-transparent');
  });
  const activeTab = document.getElementById(`tab-${tabName}`);
  activeTab.classList.remove('text-slate-500', 'font-medium', 'border-transparent');
  activeTab.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600', 'font-bold');

  const container = document.getElementById('salesTabContent');

  switch (tabName) {
    case 'pos':
      await renderPosTab(container);
      break;
    case 'orders':
      await renderOrderManagementTab(container);
      break;
    case 'claims':
      await renderClaimsTab(container);
      break;
  }
}

// POS 탭 렌더링
async function renderPosTab(container) {
  try {
    const [productsRes, customersRes, salesRes] = await Promise.all([
      axios.get(`${API_BASE}/products`),
      axios.get(`${API_BASE}/customers`),
      axios.get(`${API_BASE}/sales?limit=5`) // 최근 5건만
    ]);

    window.products = productsRes.data.data;
    window.customers = customersRes.data.data;
    const recentSales = salesRes.data.data;

    if (!window.cart) window.cart = [];

    container.innerHTML = `
      <div class="flex flex-1 gap-6 overflow-hidden h-full pb-4">
        <!-- 왼쪽: 상품 목록 -->
        <div class="w-2/3 flex flex-col bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div class="p-4 border-b border-slate-200 bg-slate-50">
            <div class="flex gap-4">
              <div class="relative flex-1">
                <i class="fas fa-search absolute left-3 top-3 text-slate-400"></i>
                <input type="text" id="posSearch" placeholder="상품명 또는 SKU 검색..." 
                       class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                       onkeyup="filterPosProducts()">
              </div>
              <select id="posCategory" class="border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-shadow"
                      onchange="filterPosProducts()">
                <option value="">전체 카테고리</option>
              </select>
            </div>
          </div>
          
          <div id="posProductList" class="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start bg-slate-50/50">
            <!-- 상품 카드 -->
          </div>
        </div>

        <!-- 오른쪽: 장바구니 -->
        <div class="w-1/3 flex flex-col bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div class="p-4 border-b border-slate-200 bg-indigo-50/50">
            <h3 class="font-bold text-lg text-indigo-900 mb-3 flex items-center"><i class="fas fa-receipt mr-2"></i>주문 내역</h3>
            <select id="posCustomer" class="w-full border border-indigo-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="">비회원 / 고객 선택</option>
              ${window.customers.map(c => `<option value="${c.id}">${c.name} (${c.phone})</option>`).join('')}
            </select>
          </div>

          <div id="posCartItems" class="flex-1 overflow-y-auto p-4 space-y-3"></div>

          <div class="p-5 bg-slate-50 border-t border-slate-200">
            <div class="flex justify-between mb-2 text-sm">
              <span class="text-slate-600">총 상품금액</span>
              <span id="posTotalAmount" class="font-bold text-slate-800">0원</span>
            </div>
            <div class="flex justify-between items-center mb-4 text-sm">
              <span class="text-slate-600">할인 금액</span>
              <input type="number" id="posDiscount" value="0" min="0" 
                     class="w-28 text-right border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                     onchange="renderCart()">
            </div>
            <div class="flex justify-between mb-6 text-xl font-bold text-indigo-600 border-t border-slate-200 pt-4">
              <span>최종 결제금액</span>
              <span id="posFinalAmount">0원</span>
            </div>

            <div class="mb-6">
              <div class="flex gap-2">
                <label class="flex-1 cursor-pointer">
                  <input type="radio" name="paymentMethod" value="card" checked class="peer sr-only">
                  <div class="text-center py-2.5 border border-slate-200 rounded-lg peer-checked:bg-indigo-600 peer-checked:text-white peer-checked:border-indigo-600 hover:bg-slate-50 transition-all font-medium text-sm">카드</div>
                </label>
                <label class="flex-1 cursor-pointer">
                  <input type="radio" name="paymentMethod" value="cash" class="peer sr-only">
                  <div class="text-center py-2.5 border border-slate-200 rounded-lg peer-checked:bg-indigo-600 peer-checked:text-white peer-checked:border-indigo-600 hover:bg-slate-50 transition-all font-medium text-sm">현금</div>
                </label>
                <label class="flex-1 cursor-pointer">
                  <input type="radio" name="paymentMethod" value="transfer" class="peer sr-only">
                  <div class="text-center py-2.5 border border-slate-200 rounded-lg peer-checked:bg-indigo-600 peer-checked:text-white peer-checked:border-indigo-600 hover:bg-slate-50 transition-all font-medium text-sm">이체</div>
                </label>
              </div>
            </div>

            <button onclick="checkout()" class="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98]">
              결제하기
            </button>
          </div>
        </div>
      </div>
    `;

    renderPosProducts();
    renderCart();

    // 카테고리 채우기
    const categories = [...new Set(window.products.map(p => p.category))];
    const catSelect = document.getElementById('posCategory');
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      catSelect.appendChild(opt);
    });

  } catch (error) {
    console.error('POS 로드 실패:', error);
    showError(container, 'POS 시스템을 불러오는데 실패했습니다.');
  }
}

// 주문/배송 관리 탭 렌더링
async function renderOrderManagementTab(container) {
  try {
    const response = await axios.get(`${API_BASE}/sales?limit=100`);
    const sales = response.data.data;

    container.innerHTML = `
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex-1 flex flex-col">
        <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 class="font-bold text-slate-800">주문 및 배송 현황</h3>
          <h3 class="font-bold text-slate-800">주문 및 배송 현황</h3>
          <div class="flex gap-2">
            <button onclick="downloadSales()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-sm flex items-center transition-colors">
              <i class="fas fa-file-excel mr-1.5"></i>엑셀 다운로드
            </button>
            <select id="orderStatusFilter" class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" onchange="filterOrderList()">
              <option value="all">전체 주문</option>
              <option value="completed">결제 완료</option>
              <option value="pending_shipment">배송 준비중</option>
              <option value="shipped">배송중</option>
              <option value="delivered">배송 완료</option>
            </select>
          </div>
        </div>
        
        <!-- 추가 필터 -->
        <div class="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-4 items-center">
           <div class="flex items-center gap-2">
            <input type="date" id="orderStartDate" class="border border-slate-300 rounded px-2 py-1.5 text-sm">
            <span class="text-slate-400">~</span>
            <input type="date" id="orderEndDate" class="border border-slate-300 rounded px-2 py-1.5 text-sm">
          </div>
          <div class="relative flex-1 min-w-[200px]">
             <i class="fas fa-search absolute left-3 top-2.5 text-slate-400 text-xs"></i>
             <input type="text" id="orderSearch" placeholder="고객명 또는 연락처 검색" class="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-sm" onkeyup="if(event.key === 'Enter') filterOrderList()">
          </div>
          <button onclick="filterOrderList()" class="bg-indigo-600 text-white px-4 py-1.5 rounded text-sm hover:bg-indigo-700 font-medium">조회</button>
        </div>

        <div class="overflow-auto flex-1" id="orderListContainer">
          <table class="min-w-full text-sm divide-y divide-slate-200">
            <thead class="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th class="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">주문번호</th>
                <th class="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">일시</th>
                <th class="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">고객</th>
                <th class="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">금액</th>
                <th class="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">배송상태</th>
                <th class="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">운송장</th>
                <th class="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 bg-white">
              ${sales.map(s => `
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4 font-mono text-slate-600">#${s.id}</td>
                  <td class="px-6 py-4 text-slate-600">${new Date(s.created_at).toLocaleString()}</td>
                  <td class="px-6 py-4">
                    <div class="font-medium text-slate-900">${s.customer_name || '비회원'}</div>
                    <div class="text-xs text-slate-500">${s.customer_phone || '-'}</div>
                  </td>
                  <td class="px-6 py-4 font-bold text-slate-800">${formatCurrency(s.final_amount)}</td>
                  <td class="px-6 py-4">
                    <span class="px-2.5 py-1 rounded-full text-xs font-semibold 
                      ${s.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
        s.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
          s.status === 'pending_shipment' ? 'bg-amber-100 text-amber-700' :
            s.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}">
                      ${getKoreanStatus(s.status)}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-slate-600">
                    ${s.tracking_number ? `
                      <div class="text-xs font-medium">${s.courier}</div>
                      <div class="text-xs font-mono text-slate-500">${s.tracking_number}</div>
                    ` : '-'}
                  </td>
                  <td class="px-6 py-4 space-x-2">
                    <button onclick="openShippingModal(${s.id})" class="text-indigo-600 hover:text-indigo-800 font-medium text-xs bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 transition-colors">
                      <i class="fas fa-truck mr-1"></i>배송
                    </button>
                    ${s.status !== 'cancelled' ? `
                      <button onclick="openClaimModal(${s.id})" class="text-amber-600 hover:text-amber-800 font-medium text-xs bg-amber-50 px-2 py-1 rounded hover:bg-amber-100 transition-colors">
                        <i class="fas fa-undo mr-1"></i>반품/교환
                      </button>
                      <button onclick="cancelSale(${s.id})" class="text-rose-600 hover:text-rose-800 font-medium text-xs bg-rose-50 px-2 py-1 rounded hover:bg-rose-100 transition-colors">
                        <i class="fas fa-times mr-1"></i>취소
                      </button>
                    ` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // 배송 모달 주입
    injectShippingModal();
    injectClaimModal();

  } catch (error) {
    console.error('주문 목록 로드 실패:', error);
    showError(container, '주문 목록을 불러오는데 실패했습니다.');
  }
}

async function filterOrderList() {
  const status = document.getElementById('orderStatusFilter').value;
  const startDate = document.getElementById('orderStartDate').value;
  const endDate = document.getElementById('orderEndDate').value;
  // API가 customerId 검색을 지원하지만 이름 검색은 지원 안함? 
  // sales.ts를 보면 customerId 파라미터는 있는데 이름 검색은 없음. 
  // 하지만 일단 UI는 만들어두고, 필요하면 백엔드 수정. 
  // 아까 sales.ts를 봤을 때 customerId만 있었음. 
  // 일단 여기서는 status와 날짜만 처리하거나, 프론트엔드 필터링을 할 수도 있음.
  // 하지만 데이터가 많아지면 백엔드 필터링이 필요함.
  // 이번 요청에서는 "필터링 기능 추가"가 목표이므로 백엔드 수정 없이 가능한 범위 내에서 하거나,
  // sales.ts도 수정해야 함. 
  // 일단 sales.ts는 수정 안했으므로 status, startDate, endDate만 사용.

  const container = document.getElementById('orderListContainer');

  try {
    const params = { limit: 100 };
    if (status !== 'all') params.status = status;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await axios.get(`${API_BASE}/sales`, { params });
    const sales = response.data.data;

    container.innerHTML = `
      <table class="min-w-full text-sm divide-y divide-slate-200">
        <thead class="bg-slate-50 sticky top-0 z-10">
          <tr>
            <th class="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">주문번호</th>
            <th class="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">일시</th>
            <th class="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">고객</th>
            <th class="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">금액</th>
            <th class="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">배송상태</th>
            <th class="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">운송장</th>
            <th class="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">관리</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 bg-white">
          ${sales.map(s => `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="px-6 py-4 font-mono text-slate-600">#${s.id}</td>
              <td class="px-6 py-4 text-slate-600">${new Date(s.created_at).toLocaleString()}</td>
              <td class="px-6 py-4">
                <div class="font-medium text-slate-900">${s.customer_name || '비회원'}</div>
                <div class="text-xs text-slate-500">${s.customer_phone || '-'}</div>
              </td>
              <td class="px-6 py-4 font-bold text-slate-800">${formatCurrency(s.final_amount)}</td>
              <td class="px-6 py-4">
                <span class="px-2.5 py-1 rounded-full text-xs font-semibold 
                  ${s.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
        s.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
          s.status === 'pending_shipment' ? 'bg-amber-100 text-amber-700' :
            s.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}">
                  ${getKoreanStatus(s.status)}
                </span>
              </td>
              <td class="px-6 py-4 text-slate-600">
                ${s.tracking_number ? `
                  <div class="text-xs font-medium">${s.courier}</div>
                  <div class="text-xs font-mono text-slate-500">${s.tracking_number}</div>
                ` : '-'}
              </td>
              <td class="px-6 py-4 space-x-2">
                <button onclick="openShippingModal(${s.id})" class="text-indigo-600 hover:text-indigo-800 font-medium text-xs bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 transition-colors">
                  <i class="fas fa-truck mr-1"></i>배송
                </button>
                ${s.status !== 'cancelled' ? `
                  <button onclick="openClaimModal(${s.id})" class="text-amber-600 hover:text-amber-800 font-medium text-xs bg-amber-50 px-2 py-1 rounded hover:bg-amber-100 transition-colors">
                    <i class="fas fa-undo mr-1"></i>반품/교환
                  </button>
                  <button onclick="cancelSale(${s.id})" class="text-rose-600 hover:text-rose-800 font-medium text-xs bg-rose-50 px-2 py-1 rounded hover:bg-rose-100 transition-colors">
                    <i class="fas fa-times mr-1"></i>취소
                  </button>
                ` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    console.error(e);
    alert('조회 실패');
  }
}

// 반품/교환 관리 탭 렌더링
async function renderClaimsTab(container) {
  try {
    const response = await axios.get(`${API_BASE}/claims`);
    const claims = response.data.data;

    container.innerHTML = `
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex-1 flex flex-col">
        <div class="p-4 border-b border-slate-200 bg-slate-50">
          <h3 class="font-bold text-slate-800">반품 및 교환 요청 내역</h3>
        </div>
        <div class="overflow-auto flex-1">
          <table class="min-w-full text-sm divide-y divide-slate-200">
            <thead class="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th class="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">요청일시</th>
                <th class="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">구분</th>
                <th class="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">원주문</th>
                <th class="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">상품</th>
                <th class="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">사유</th>
                <th class="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">상태</th>
                <th class="px-6 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 bg-white">
              ${claims.length > 0 ? claims.map(c => `
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4 text-slate-600">${new Date(c.created_at).toLocaleString()}</td>
                  <td class="px-6 py-4">
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold ${c.type === 'return' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}">
                      ${c.type === 'return' ? '반품' : '교환'}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-slate-600 font-mono">#${c.sale_id}</td>
                  <td class="px-6 py-4">
                    <div class="font-medium text-slate-900">${c.product_name}</div>
                    <div class="text-xs text-slate-500">${c.quantity}개 <span class="text-slate-400">|</span> ${c.condition || '상태미상'}</div>
                  </td>
                  <td class="px-6 py-4 text-slate-600">${c.reason || '-'}</td>
                  <td class="px-6 py-4">
                    <span class="px-2.5 py-1 rounded-full text-xs font-semibold 
                      ${c.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
        c.status === 'rejected' ? 'bg-red-100 text-red-700' :
          c.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}">
                      ${getKoreanStatus(c.status)}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    ${c.status === 'requested' ? `
                      <button onclick="updateClaimStatus(${c.id}, 'approved')" class="text-emerald-600 hover:text-emerald-800 mr-2 font-medium text-xs bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100 transition-colors">승인</button>
                      <button onclick="updateClaimStatus(${c.id}, 'rejected')" class="text-rose-600 hover:text-rose-800 font-medium text-xs bg-rose-50 px-2 py-1 rounded hover:bg-rose-100 transition-colors">거절</button>
                    ` : '-'}
                  </td>
                </tr>
              `).join('') : `
                <tr><td colspan="7" class="px-6 py-10 text-center text-slate-500">요청 내역이 없습니다.</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('클레임 목록 로드 실패:', error);
    showError(container, '클레임 목록을 불러오는데 실패했습니다.');
  }
}

function getKoreanStatus(status) {
  const map = {
    'completed': '완료',
    'cancelled': '취소됨',
    'pending_shipment': '배송준비',
    'shipped': '배송중',
    'delivered': '배송완료',
    'requested': '요청됨',
    'approved': '승인됨',
    'rejected': '거절됨'
  };
  return map[status] || status;
}

// 유틸리티 함수들
function formatCurrency(amount) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW'
  }).format(amount || 0);
}

function showError(container, message) {
  container.innerHTML = `
    <div class="bg-red-50 border border-red-200 rounded-lg p-6">
      <p class="text-red-800"><i class="fas fa-exclamation-circle mr-2"></i>${message}</p>
    </div>
  `;
}

function showSuccess(message) {
  // 토스트 알림 (간단 구현)
  alert(message);
  alert(message);
}

// --- CSV 다운로드 유틸리티 ---
function downloadCSV(data, filename, headers) {
  if (!data || data.length === 0) {
    alert('다운로드할 데이터가 없습니다.');
    return;
  }

  // BOM 추가 (한글 깨짐 방지)
  let csvContent = "\uFEFF";

  // 헤더 추가
  if (headers) {
    csvContent += Object.values(headers).join(',') + '\n';
  } else {
    csvContent += Object.keys(data[0]).join(',') + '\n';
  }

  // 데이터 행 추가
  data.forEach(row => {
    let rowContent = [];
    if (headers) {
      // 헤더 키 순서대로 데이터 매핑
      Object.keys(headers).forEach(key => {
        let cell = row[key] === null || row[key] === undefined ? '' : row[key].toString();
        // 쉼표, 따옴표, 줄바꿈 처리
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell.replace(/"/g, '""')}"`;
        }
        rowContent.push(cell);
      });
    } else {
      rowContent = Object.values(row).map(cell => {
        cell = cell === null || cell === undefined ? '' : cell.toString();
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      });
    }
    csvContent += rowContent.join(',') + '\n';
  });

  // 다운로드 링크 생성 및 실행
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// 상품 데이터 다운로드
async function downloadProducts() {
  try {
    const response = await axios.get(`${API_BASE}/products`);
    const products = response.data.data;

    const headers = {
      id: 'ID',
      sku: 'SKU',
      name: '상품명',
      category: '카테고리(대)',
      category_medium: '카테고리(중)',
      category_small: '카테고리(소)',
      purchase_price: '매입가',
      selling_price: '판매가',
      current_stock: '현재재고',
      min_stock_alert: '최소재고알림',
      supplier: '공급사',
      brand: '브랜드',
      status: '상태',
      created_at: '등록일'
    };

    downloadCSV(products, `상품목록_${new Date().toISOString().slice(0, 10)}.csv`, headers);
  } catch (error) {
    console.error('상품 데이터 다운로드 실패:', error);
    alert('데이터를 불러오는데 실패했습니다.');
  }
}

// 고객 데이터 다운로드
async function downloadCustomers() {
  try {
    const response = await axios.get(`${API_BASE}/customers`);
    const customers = response.data.data;

    const headers = {
      id: 'ID',
      name: '이름',
      phone: '연락처',
      email: '이메일',
      grade: '등급',
      company: '회사명',
      department: '부서',
      position: '직책',
      total_purchase_amount: '총구매액',
      purchase_count: '구매횟수',
      created_at: '등록일'
    };

    downloadCSV(customers, `고객목록_${new Date().toISOString().slice(0, 10)}.csv`, headers);
  } catch (error) {
    console.error('고객 데이터 다운로드 실패:', error);
    alert('데이터를 불러오는데 실패했습니다.');
  }
}

// 판매 데이터 다운로드
async function downloadSales() {
  try {
    const response = await axios.get(`${API_BASE}/sales?limit=1000`); // 충분한 수량 조회
    const sales = response.data.data;

    const headers = {
      id: '주문번호',
      created_at: '주문일시',
      customer_name: '고객명',
      customer_phone: '연락처',
      total_amount: '총금액',
      discount_amount: '할인금액',
      final_amount: '최종금액',
      payment_method: '결제수단',
      status: '상태',
      courier: '택배사',
      tracking_number: '운송장번호'
    };

    downloadCSV(sales, `판매내역_${new Date().toISOString().slice(0, 10)}.csv`, headers);
  } catch (error) {
    console.error('판매 데이터 다운로드 실패:', error);
    alert('데이터를 불러오는데 실패했습니다.');
  }
}

// --- 상품 관리 모달 ---

function injectProductModal() {
  if (document.getElementById('productModal')) return;

  const modalHtml = `
    <div id="productModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm hidden flex items-center justify-center z-50 transition-all duration-300">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 transform transition-all max-h-[90vh] overflow-y-auto border border-slate-100 flex flex-col">
        <div class="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur z-10">
          <h3 id="productModalTitle" class="text-xl font-bold text-slate-800">상품 등록</h3>
          <button onclick="closeProductModal()" class="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="flex border-b border-slate-100 px-6">
          <button type="button" onclick="switchProductTab('basic')" id="tab-basic" class="px-4 py-3 text-sm font-medium text-indigo-600 border-b-2 border-indigo-600 transition-colors">기본 정보</button>
          <button type="button" onclick="switchProductTab('detail')" id="tab-detail" class="px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">상세 정보</button>
          <button type="button" onclick="switchProductTab('media')" id="tab-media" class="px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">이미지/미디어</button>
        </div>

        <form id="productForm" onsubmit="submitProduct(event)" class="flex-1 overflow-y-auto">
          <div class="p-6 space-y-6">
            <!-- 기본 정보 탭 -->
            <div id="content-basic" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">SKU (상품코드)</label>
                  <div class="flex flex-col gap-2">
                    <div class="flex items-center gap-4 mb-1">
                      <label class="inline-flex items-center cursor-pointer">
                        <input type="radio" name="skuType" value="auto" checked onchange="toggleSkuInput(this.value)" class="form-radio text-indigo-600 focus:ring-indigo-500">
                        <span class="ml-2 text-sm text-slate-700">자동 생성</span>
                      </label>
                      <label class="inline-flex items-center cursor-pointer">
                        <input type="radio" name="skuType" value="manual" onchange="toggleSkuInput(this.value)" class="form-radio text-indigo-600 focus:ring-indigo-500">
                        <span class="ml-2 text-sm text-slate-700">수동 입력</span>
                      </label>
                    </div>
                    <div class="flex gap-2">
                      <input type="text" id="prodSku" required readonly class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow placeholder-slate-400 bg-slate-50 text-slate-500">
                      <button type="button" id="btnGenerateSku" onclick="generateAutoSku()" class="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
                        <i class="fas fa-sync-alt mr-1"></i>생성
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">상품명</label>
                  <input type="text" id="prodName" required class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">카테고리 (대분류)</label>
                  <input type="text" id="prodCategory" list="categoryList" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow placeholder-slate-400" placeholder="예: 전자제품">
                  <datalist id="categoryList"></datalist>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">카테고리 (중분류)</label>
                  <input type="text" id="prodCategoryMedium" list="categoryMediumList" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow placeholder-slate-400" placeholder="예: 컴퓨터">
                  <datalist id="categoryMediumList"></datalist>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">카테고리 (소분류)</label>
                  <input type="text" id="prodCategorySmall" list="categorySmallList" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow placeholder-slate-400" placeholder="예: 노트북">
                  <datalist id="categorySmallList"></datalist>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">매입가</label>
                  <div class="relative">
                    <span class="absolute left-4 top-2.5 text-slate-500">₩</span>
                    <input type="number" id="prodPurchasePrice" required min="0" class="w-full border border-slate-300 rounded-lg pl-8 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">판매가</label>
                  <div class="relative">
                    <span class="absolute left-4 top-2.5 text-slate-500">₩</span>
                    <input type="number" id="prodSellingPrice" required min="0" class="w-full border border-slate-300 rounded-lg pl-8 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">현재 재고</label>
                  <input type="number" id="prodStock" required min="0" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
                  <p class="text-xs text-slate-500 mt-1.5 flex items-center"><i class="fas fa-info-circle mr-1"></i>수정 시에는 재고 조정 기능을 이용하세요.</p>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">최소 재고 알림</label>
                  <input type="number" id="prodMinStock" required min="0" value="10" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
                </div>
              </div>
            </div>

            <!-- 상세 정보 탭 -->
            <div id="content-detail" class="space-y-6 hidden">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">브랜드</label>
                  <input type="text" id="prodBrand" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">공급사</label>
                  <input type="text" id="prodSupplier" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
                </div>
              </div>

              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">태그 (쉼표로 구분)</label>
                <input type="text" id="prodTags" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow placeholder-slate-400" placeholder="예: 신상품, 베스트, 여름특가">
              </div>

              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">상태</label>
                <select id="prodStatus" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-white">
                  <option value="sale">판매중</option>
                  <option value="out_of_stock">품절</option>
                  <option value="discontinued">단종</option>
                  <option value="hidden">숨김</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">상세 설명</label>
                <textarea id="prodDesc" rows="5" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow placeholder-slate-400 resize-none"></textarea>
              </div>
            </div>

            <!-- 이미지/미디어 탭 -->
            <div id="content-media" class="space-y-6 hidden">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">상품 이미지</label>
                <input type="hidden" id="prodImageUrl">
                <div class="mt-2 w-full">
                  <label for="prodImageFile" class="flex flex-col items-center justify-center w-full h-64 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors relative overflow-hidden group">
                    <div id="imgPlaceholder" class="flex flex-col items-center justify-center pt-5 pb-6">
                      <i class="fas fa-cloud-upload-alt text-4xl text-slate-400 mb-3 group-hover:text-indigo-500 transition-colors"></i>
                      <p class="mb-2 text-sm text-slate-500"><span class="font-semibold">클릭하여 이미지 업로드</span></p>
                      <p class="text-xs text-slate-500">PNG, JPG, GIF (자동 리사이징됨)</p>
                    </div>
                    <img id="imgPreview" src="" class="absolute inset-0 w-full h-full object-contain hidden bg-white" alt="미리보기">
                    <div id="imgOverlay" class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden">
                      <p class="text-white font-semibold"><i class="fas fa-edit mr-2"></i>이미지 변경</p>
                    </div>
                    <input id="prodImageFile" type="file" accept="image/*" class="hidden" onchange="handleImageUpload(this)">
                  </label>
                  <div class="flex justify-end mt-2">
                    <button type="button" onclick="removeImage()" id="btnRemoveImage" class="text-sm text-red-500 hover:text-red-700 hidden">
                      <i class="fas fa-trash-alt mr-1"></i>이미지 삭제
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="bg-slate-50 px-6 py-4 flex justify-end space-x-3 rounded-b-2xl sticky bottom-0 border-t border-slate-100">
            <button type="button" onclick="closeProductModal()" class="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200">
              취소
            </button>
            <button type="submit" class="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function toggleSkuInput(type) {
  const skuInput = document.getElementById('prodSku');
  const generateBtn = document.getElementById('btnGenerateSku');

  if (type === 'auto') {
    skuInput.readOnly = true;
    skuInput.classList.add('bg-slate-50', 'text-slate-500');
    generateBtn.classList.remove('hidden');
    if (!skuInput.value) generateAutoSku();
  } else {
    skuInput.readOnly = false;
    skuInput.classList.remove('bg-slate-50', 'text-slate-500');
    generateBtn.classList.add('hidden');
    skuInput.value = '';
    skuInput.focus();
  }
}

function generateAutoSku() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  document.getElementById('prodSku').value = `PRD-${year}${month}${day}-${random}`;
}

function switchProductTab(tab) {
  // 탭 스타일 업데이트
  ['basic', 'detail', 'media'].forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    const content = document.getElementById(`content-${t}`);
    if (t === tab) {
      btn.classList.remove('text-slate-500', 'border-transparent');
      btn.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
      content.classList.remove('hidden');
    } else {
      btn.classList.add('text-slate-500');
      btn.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600');
      content.classList.add('hidden');
    }
  });
}

// 이미지 업로드 및 리사이징 처리
function handleImageUpload(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];

    // 파일 크기 체크 (예: 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기가 너무 큽니다. 10MB 이하의 이미지를 선택해주세요.');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        // 캔버스를 이용한 리사이징
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 최대 크기 설정 (600px)
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Base64로 변환 (JPEG, 퀄리티 0.7)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

        // 데이터 설정 및 미리보기 업데이트
        document.getElementById('prodImageUrl').value = dataUrl;
        updateImagePreview(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

function updateImagePreview(url) {
  const img = document.getElementById('imgPreview');
  const placeholder = document.getElementById('imgPlaceholder');
  const overlay = document.getElementById('imgOverlay');
  const removeBtn = document.getElementById('btnRemoveImage');

  if (url) {
    img.src = url;
    img.classList.remove('hidden');
    placeholder.classList.add('hidden');
    overlay.classList.remove('hidden'); // 이미지가 있을 때만 오버레이 활성화 가능
    removeBtn.classList.remove('hidden');
  } else {
    img.src = '';
    img.classList.add('hidden');
    placeholder.classList.remove('hidden');
    overlay.classList.add('hidden');
    removeBtn.classList.add('hidden');
  }
}

function removeImage() {
  document.getElementById('prodImageUrl').value = '';
  document.getElementById('prodImageFile').value = ''; // 파일 인풋 초기화
  updateImagePreview('');
}

function showProductModal() {
  injectProductModal(); // Ensure modal exists

  const modal = document.getElementById('productModal');
  const title = document.getElementById('productModalTitle');
  const form = document.getElementById('productForm');

  form.reset();
  window.editingProductId = null;

  title.textContent = '상품 등록';

  // SKU 초기화 (자동 생성 모드)
  document.querySelector('input[name="skuType"][value="auto"]').checked = true;
  toggleSkuInput('auto');

  // 탭 초기화
  switchProductTab('basic');

  // 탭 초기화
  switchProductTab('basic');

  // 이미지 미리보기 초기화
  removeImage();

  modal.classList.remove('hidden');
}

async function editProduct(id) {
  injectProductModal();

  try {
    const response = await axios.get(`${API_BASE}/products/${id}`);
    const product = response.data.data;

    window.editingProductId = id;

    document.getElementById('productModalTitle').textContent = '상품 수정';

    // 수정 시에는 SKU 변경 불가 (UI 처리)
    document.getElementById('prodSku').value = product.sku;
    document.getElementById('prodSku').readOnly = true;
    document.getElementById('prodSku').classList.add('bg-slate-50', 'text-slate-500');
    // 라디오 버튼 및 생성 버튼 숨김/비활성화
    document.querySelectorAll('input[name="skuType"]').forEach(el => el.disabled = true);
    document.getElementById('btnGenerateSku').classList.add('hidden');

    document.getElementById('prodName').value = product.name;
    document.getElementById('prodCategory').value = product.category;
    document.getElementById('prodCategoryMedium').value = product.category_medium || '';
    document.getElementById('prodCategorySmall').value = product.category_small || '';
    document.getElementById('prodSupplier').value = product.supplier || '';
    document.getElementById('prodBrand').value = product.brand || '';
    document.getElementById('prodTags').value = product.tags || '';
    document.getElementById('prodStatus').value = product.status || 'sale';
    document.getElementById('prodPurchasePrice').value = product.purchase_price;
    document.getElementById('prodSellingPrice').value = product.selling_price;
    document.getElementById('prodStock').value = product.current_stock;
    document.getElementById('prodStock').readOnly = true; // 재고는 수정 불가 (조정 기능 이용)
    document.getElementById('prodStock').classList.add('bg-gray-100');
    document.getElementById('prodMinStock').value = product.min_stock_alert;
    document.getElementById('prodDesc').value = product.description || '';
    document.getElementById('prodImageUrl').value = product.image_url || '';
    updateImagePreview(product.image_url);

    fillCategoryDatalist();
    switchProductTab('basic');

    document.getElementById('productModal').classList.remove('hidden');
  } catch (error) {
    console.error('상품 정보 로드 실패:', error);
    alert('상품 정보를 불러오는데 실패했습니다.');
  }
}

function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
}

async function submitProduct(e) {
  e.preventDefault();

  const payload = {
    sku: document.getElementById('prodSku').value,
    name: document.getElementById('prodName').value,
    category: document.getElementById('prodCategory').value,
    category_medium: document.getElementById('prodCategoryMedium').value,
    category_small: document.getElementById('prodCategorySmall').value,
    supplier: document.getElementById('prodSupplier').value,
    brand: document.getElementById('prodBrand').value,
    tags: document.getElementById('prodTags').value,
    status: document.getElementById('prodStatus').value,
    image_url: document.getElementById('prodImageUrl').value,
    purchase_price: parseInt(document.getElementById('prodPurchasePrice').value),
    selling_price: parseInt(document.getElementById('prodSellingPrice').value),
    current_stock: parseInt(document.getElementById('prodStock').value),
    min_stock_alert: parseInt(document.getElementById('prodMinStock').value),
    description: document.getElementById('prodDesc').value
  };

  try {
    if (window.editingProductId) {
      // 수정
      delete payload.sku; // SKU 제외
      delete payload.current_stock; // 재고 제외
      await axios.put(`${API_BASE}/products/${window.editingProductId}`, payload);
      showSuccess('상품이 수정되었습니다.');
    } else {
      // 등록
      await axios.post(`${API_BASE}/products`, payload);
      showSuccess('상품이 등록되었습니다.');
    }

    closeProductModal();
    loadPage('products');
  } catch (error) {
    console.error('상품 저장 실패:', error);
    const msg = error.response?.data?.error || '저장 중 오류가 발생했습니다.';
    alert(msg);
  }
}

// 카테고리 데이터리스트 채우기
async function fillCategoryDatalist() {
  try {
    const response = await axios.get(`${API_BASE}/products`);
    const products = response.data.data;

    const categories = [...new Set(products.map(p => p.category))];
    const mediums = [...new Set(products.map(p => p.category_medium).filter(Boolean))];
    const smalls = [...new Set(products.map(p => p.category_small).filter(Boolean))];

    const list = document.getElementById('categoryList');
    const mediumList = document.getElementById('categoryMediumList');
    const smallList = document.getElementById('categorySmallList');

    if (list) {
      list.innerHTML = categories.map(c => `<option value="${c}">`).join('');
    }
    if (mediumList) {
      mediumList.innerHTML = mediums.map(c => `<option value="${c}">`).join('');
    }
    if (smallList) {
      smallList.innerHTML = smalls.map(c => `<option value="${c}">`).join('');
    }
  } catch (e) {
    console.error('카테고리 로드 실패', e);
  }
}

// --- 고객 관리 모달 ---

function injectCustomerModal() {
  if (document.getElementById('customerModal')) return;

  const modalHtml = `
    <div id="customerModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm hidden flex items-center justify-center z-50 transition-all duration-300">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 transform transition-all border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 id="customerModalTitle" class="text-xl font-bold text-slate-800">고객 등록</h3>
          <button onclick="closeCustomerModal()" class="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <form id="customerForm" onsubmit="submitCustomer(event)">
          <div class="p-6 space-y-6">
            <!-- 기본 정보 -->
            <div>
              <h4 class="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">기본 정보</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">이름 <span class="text-red-500">*</span></label>
                  <input type="text" id="custName" required class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow">
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">연락처 <span class="text-red-500">*</span></label>
                  <input type="tel" id="custPhone" required placeholder="010-0000-0000" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow">
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">이메일</label>
                  <input type="email" id="custEmail" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow">
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">등급</label>
                  <select id="custGradeSelect" onchange="toggleGradeInput(this.value)" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-white mb-2">
                    <option value="온라인">온라인</option>
                    <option value="직접구매">직접구매</option>
                    <option value="custom">기타(직접입력)</option>
                  </select>
                  <input type="text" id="custGradeInput" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow hidden" placeholder="등급 직접 입력">
                </div>
              </div>
            </div>

            <!-- 회사 정보 -->
            <div>
              <h4 class="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">회사/소속 정보</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">회사명</label>
                  <input type="text" id="custCompany" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow">
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">부서</label>
                  <input type="text" id="custDept" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow">
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">직책</label>
                  <input type="text" id="custPosition" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow">
                </div>
              </div>
            </div>

            <!-- 주소 정보 -->
            <div>
              <h4 class="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">주소 정보</h4>
              <div class="grid grid-cols-1 gap-4">
                <div class="flex gap-2">
                  <div class="w-1/3">
                    <input type="text" id="custZipCode" placeholder="우편번호" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow">
                  </div>
                  <div class="flex-1">
                    <input type="text" id="custAddress" placeholder="기본 주소" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow">
                  </div>
                </div>
                <div>
                  <input type="text" id="custAddressDetail" placeholder="상세 주소" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow">
                </div>
              </div>
            </div>

            <!-- 기타 -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">메모</label>
              <textarea id="custNotes" rows="3" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow resize-none"></textarea>
            </div>
          </div>
          
          <div class="bg-slate-50 px-6 py-4 flex justify-end space-x-3 rounded-b-2xl border-t border-slate-100 sticky bottom-0">
            <button type="button" onclick="closeCustomerModal()" class="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200">
              취소
            </button>
            <button type="submit" class="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function toggleGradeInput(value) {
  const input = document.getElementById('custGradeInput');
  if (value === 'custom') {
    input.classList.remove('hidden');
    input.required = true;
  } else {
    input.classList.add('hidden');
    input.required = false;
  }
}

function showCustomerModal() {
  injectCustomerModal();

  const modal = document.getElementById('customerModal');
  const title = document.getElementById('customerModalTitle');
  const form = document.getElementById('customerForm');

  form.reset();
  window.editingCustomerId = null;
  title.textContent = '고객 등록';

  // 등급 초기화
  document.getElementById('custGradeSelect').value = '온라인';
  toggleGradeInput('온라인');

  modal.classList.remove('hidden');
}

async function editCustomer(id) {
  injectCustomerModal();

  try {
    const response = await axios.get(`${API_BASE}/customers/${id}`);
    const customer = response.data.data;

    window.editingCustomerId = id;
    document.getElementById('customerModalTitle').textContent = '고객 수정';

    document.getElementById('custName').value = customer.name;
    document.getElementById('custPhone').value = customer.phone;
    document.getElementById('custEmail').value = customer.email || '';

    // 등급 설정
    const gradeSelect = document.getElementById('custGradeSelect');
    const gradeInput = document.getElementById('custGradeInput');
    if (['온라인', '직접구매'].includes(customer.grade)) {
      gradeSelect.value = customer.grade;
      toggleGradeInput(customer.grade);
    } else {
      gradeSelect.value = 'custom';
      toggleGradeInput('custom');
      gradeInput.value = customer.grade;
    }

    document.getElementById('custCompany').value = customer.company || '';
    document.getElementById('custDept').value = customer.department || '';
    document.getElementById('custPosition').value = customer.position || '';
    document.getElementById('custZipCode').value = customer.zip_code || '';
    document.getElementById('custAddress').value = customer.address || '';
    document.getElementById('custAddressDetail').value = customer.address_detail || '';
    document.getElementById('custNotes').value = customer.notes || '';

    document.getElementById('customerModal').classList.remove('hidden');
  } catch (error) {
    console.error('고객 정보 로드 실패:', error);
    alert('고객 정보를 불러오는데 실패했습니다.');
  }
}

function closeCustomerModal() {
  document.getElementById('customerModal').classList.add('hidden');
}

async function submitCustomer(e) {
  e.preventDefault();

  const gradeSelect = document.getElementById('custGradeSelect');
  const gradeInput = document.getElementById('custGradeInput');
  const grade = gradeSelect.value === 'custom' ? gradeInput.value : gradeSelect.value;

  const payload = {
    name: document.getElementById('custName').value,
    phone: document.getElementById('custPhone').value,
    email: document.getElementById('custEmail').value,
    grade: grade,
    company: document.getElementById('custCompany').value,
    department: document.getElementById('custDept').value,
    position: document.getElementById('custPosition').value,
    zip_code: document.getElementById('custZipCode').value,
    address: document.getElementById('custAddress').value,
    address_detail: document.getElementById('custAddressDetail').value,
    notes: document.getElementById('custNotes').value
  };

  try {
    if (window.editingCustomerId) {
      await axios.put(`${API_BASE}/customers/${window.editingCustomerId}`, payload);
      showSuccess('고객 정보가 수정되었습니다.');
    } else {
      await axios.post(`${API_BASE}/customers`, payload);
      showSuccess('고객이 등록되었습니다.');
    }

    closeCustomerModal();
    loadPage('customers');
  } catch (error) {
    console.error('고객 저장 실패:', error);
    const msg = error.response?.data?.error || '저장 중 오류가 발생했습니다.';
    alert(msg);
  }
}



async function loadCategories() {
  try {
    const response = await axios.get(`${API_BASE}/products/meta/categories`);
    const categories = response.data.data;
    const select = document.getElementById('filterCategory');
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('카테고리 로드 실패:', error);
  }
}

function filterProducts() {
  // 필터링 로직 (추후 구현)
  loadPage('products');
}

// --- POS 관련 함수 ---

function renderPosProducts(filterText = '', filterCat = '') {
  const container = document.getElementById('posProductList');
  if (!container) return;

  let filtered = window.products || [];
  if (filterText) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(filterText.toLowerCase()) ||
      p.sku.toLowerCase().includes(filterText.toLowerCase())
    );
  }
  if (filterCat) {
    filtered = filtered.filter(p => p.category === filterCat);
  }

  container.innerHTML = filtered.map(p => `
    <div class="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer flex flex-col h-full group relative overflow-hidden"
         onclick="addToCart(${p.id})">
      <div class="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div class="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
          <i class="fas fa-plus"></i>
        </div>
      </div>
      <div class="flex justify-between items-start mb-2">
        <span class="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">${[p.category, p.category_medium, p.category_small].filter(Boolean).join(' > ')}</span>
        <span class="text-xs text-slate-400 font-mono">${p.sku}</span>
      </div>
      <h4 class="font-bold text-slate-800 mb-1 line-clamp-2 flex-1">${p.name}</h4>
      <div class="mt-auto pt-3 border-t border-slate-100 flex justify-between items-end">
        <div>
           <p class="text-xs text-slate-500">재고: <span class="${p.current_stock <= p.min_stock_alert ? 'text-rose-600 font-bold' : 'text-slate-700'}">${p.current_stock}</span></p>
        </div>
        <p class="text-lg font-bold text-indigo-600">${formatCurrency(p.selling_price)}</p>
      </div>
    </div>
  `).join('');
}

function filterPosProducts() {
  const text = document.getElementById('posSearch').value;
  const cat = document.getElementById('posCategory').value;
  renderPosProducts(text, cat);
}

function addToCart(productId) {
  const product = window.products.find(p => p.id === productId);
  if (!product) return;

  if (product.current_stock <= 0) {
    alert('재고가 없는 상품입니다.');
    return;
  }

  const existingItem = window.cart.find(item => item.product.id === productId);

  if (existingItem) {
    if (existingItem.quantity >= product.current_stock) {
      alert('재고 수량을 초과할 수 없습니다.');
      return;
    }
    existingItem.quantity++;
  } else {
    window.cart.push({
      product: product,
      quantity: 1
    });
  }

  renderCart();
}

function removeFromCart(productId) {
  window.cart = window.cart.filter(item => item.product.id !== productId);
  renderCart();
}

function updateCartQuantity(productId, delta) {
  const item = window.cart.find(i => i.product.id === productId);
  if (!item) return;

  const newQty = item.quantity + delta;

  if (newQty <= 0) {
    removeFromCart(productId);
    return;
  }

  if (newQty > item.product.current_stock) {
    alert('재고 수량을 초과할 수 없습니다.');
    return;
  }

  item.quantity = newQty;
  renderCart();
}

function renderCart() {
  const container = document.getElementById('posCartItems');
  const totalEl = document.getElementById('posTotalAmount');
  const finalEl = document.getElementById('posFinalAmount');
  const discountInput = document.getElementById('posDiscount');

  if (!container) return;

  if (window.cart.length === 0) {
    container.innerHTML = `
      <div class="text-center text-slate-400 mt-10">
        <div class="bg-slate-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-shopping-basket text-3xl text-slate-300"></i>
        </div>
        <p class="font-medium">장바구니가 비어있습니다.</p>
        <p class="text-sm mt-1">상품을 선택하여 담아주세요.</p>
      </div>
    `;
    totalEl.textContent = '0원';
    finalEl.textContent = '0원';
    return;
  }

  let total = 0;
  container.innerHTML = window.cart.map(item => {
    const itemTotal = item.product.selling_price * item.quantity;
    total += itemTotal;
    return `
      <div class="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 group hover:border-indigo-200 transition-colors">
        <div class="flex-1 min-w-0 mr-3">
          <div class="font-medium text-slate-800 truncate">${item.product.name}</div>
          <div class="text-xs text-slate-500 mt-0.5">${formatCurrency(item.product.selling_price)} x ${item.quantity}</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="font-bold text-slate-700">${formatCurrency(itemTotal)}</div>
          <div class="flex items-center bg-white rounded-lg border border-slate-200 shadow-sm">
            <button onclick="updateCartQuantity(${item.product.id}, -1)" class="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-l-lg transition-colors">
              <i class="fas fa-minus text-xs"></i>
            </button>
            <span class="w-8 text-center text-sm font-medium text-slate-700">${item.quantity}</span>
            <button onclick="updateCartQuantity(${item.product.id}, 1)" class="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-r-lg transition-colors">
              <i class="fas fa-plus text-xs"></i>
            </button>
          </div>
          <button onclick="removeFromCart(${item.product.id})" class="text-slate-400 hover:text-rose-500 transition-colors ml-1">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  totalEl.textContent = formatCurrency(total);

  const discount = parseInt(discountInput.value) || 0;
  const final = Math.max(0, total - discount);
  finalEl.textContent = formatCurrency(final);
}

async function checkout() {
  if (window.cart.length === 0) {
    alert('장바구니가 비어있습니다.');
    return;
  }

  if (!confirm('결제를 진행하시겠습니까?')) return;

  const customerId = document.getElementById('posCustomer').value;
  const discount = parseInt(document.getElementById('posDiscount').value) || 0;
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;

  const payload = {
    customer_id: customerId ? parseInt(customerId) : null,
    items: window.cart.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity
    })),
    discount_amount: discount,
    payment_method: paymentMethod,
    notes: 'POS 판매'
  };

  try {
    await axios.post(`${API_BASE}/sales`, payload);
    showSuccess('결제가 완료되었습니다.');

    // 초기화
    window.cart = [];
    document.getElementById('posDiscount').value = 0;
    renderCart();

    // 데이터 갱신
    switchSalesTab('pos');

  } catch (error) {
    console.error('결제 실패:', error);
    const msg = error.response?.data?.error || '결제 처리 중 오류가 발생했습니다.';
    alert(msg);
  }
}

async function cancelSale(saleId) {
  if (!confirm('정말 이 판매 내역을 취소하시겠습니까?\\n재고가 다시 복구됩니다.')) return;

  try {
    await axios.put(`${API_BASE}/sales/${saleId}/cancel`);
    showSuccess('판매가 취소되었습니다.');
    // 현재 활성화된 탭에 따라 새로고침
    const activeTab = document.querySelector('.border-indigo-600')?.id;
    if (activeTab === 'tab-orders') {
      switchSalesTab('orders');
    } else {
      switchSalesTab('pos');
    }
  } catch (error) {
    console.error('판매 취소 실패:', error);
    alert('판매 취소 실패: ' + (error.response?.data?.error || error.message));
  }
}

async function deleteCustomerAction(id) {
  if (!confirm('정말 이 고객을 삭제하시겠습니까? 구매 이력도 함께 삭제될 수 있습니다.')) return;

  try {
    await axios.delete(`${API_BASE}/customers/${id}`);
    showSuccess('고객이 삭제되었습니다.');
    loadPage('customers');
  } catch (error) {
    console.error('고객 삭제 실패:', error);
    alert('고객 삭제 실패: ' + (error.response?.data?.error || error.message));
  }
}

async function deleteProductAction(id) {
  if (!confirm('정말 이 상품을 삭제하시겠습니까?')) return;

  try {
    await axios.delete(`${API_BASE}/products/${id}`);
    showSuccess('상품이 삭제되었습니다.');
    loadPage('products');
  } catch (error) {
    console.error('상품 삭제 실패:', error);
    alert('상품 삭제 실패: ' + (error.response?.data?.error || error.message));
  }
}

// --- 배송 관리 모달 ---

function injectShippingModal() {
  if (document.getElementById('shippingModal')) return;

  const modalHtml = `
    <div id="shippingModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm hidden flex items-center justify-center z-50 transition-all duration-300">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-slate-100">
        <div class="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 class="text-xl font-bold text-slate-800">배송 정보 관리</h3>
          <button onclick="document.getElementById('shippingModal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form onsubmit="submitShipping(event)">
          <input type="hidden" id="shipSaleId">
          <div class="p-6 space-y-5">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">배송 상태</label>
              <select id="shipStatus" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-white">
                <option value="completed">결제 완료 (배송 전)</option>
                <option value="pending_shipment">배송 준비중</option>
                <option value="shipped">배송중</option>
                <option value="delivered">배송 완료</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">택배사</label>
              <input type="text" id="shipCourier" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow" placeholder="예: CJ대한통운">
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">운송장 번호</label>
              <input type="text" id="shipTracking" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow">
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">배송지 주소</label>
              <input type="text" id="shipAddress" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow">
            </div>
          </div>
          <div class="bg-slate-50 px-6 py-4 flex justify-end space-x-3 rounded-b-2xl border-t border-slate-100">
            <button type="button" onclick="document.getElementById('shippingModal').classList.add('hidden')" class="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200">취소</button>
            <button type="submit" class="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">저장하기</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function openShippingModal(saleId) {
  injectShippingModal();
  try {
    const res = await axios.get(`${API_BASE}/sales/${saleId}`);
    const sale = res.data.data;

    document.getElementById('shipSaleId').value = sale.id;
    document.getElementById('shipStatus').value = sale.status;
    document.getElementById('shipCourier').value = sale.courier || '';
    document.getElementById('shipTracking').value = sale.tracking_number || '';
    document.getElementById('shipAddress').value = sale.shipping_address || '';

    document.getElementById('shippingModal').classList.remove('hidden');
  } catch (e) {
    alert('정보 로드 실패');
  }
}

async function submitShipping(e) {
  e.preventDefault();
  const id = document.getElementById('shipSaleId').value;
  const payload = {
    status: document.getElementById('shipStatus').value,
    courier: document.getElementById('shipCourier').value,
    tracking_number: document.getElementById('shipTracking').value,
    shipping_address: document.getElementById('shipAddress').value
  };

  try {
    await axios.put(`${API_BASE}/sales/${id}/shipping`, payload);
    showSuccess('배송 정보가 저장되었습니다.');
    document.getElementById('shippingModal').classList.add('hidden');
    switchSalesTab('orders');
  } catch (e) {
    alert('저장 실패');
  }
}

// --- 반품/교환 모달 ---

function injectClaimModal() {
  if (document.getElementById('claimModal')) return;

  const modalHtml = `
    <div id="claimModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm hidden flex items-center justify-center z-50 transition-all duration-300">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-slate-100">
        <div class="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 class="text-xl font-bold text-slate-800">반품/교환 요청</h3>
          <button onclick="document.getElementById('claimModal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form onsubmit="submitClaim(event)">
          <input type="hidden" id="claimSaleId">
          <div class="p-6 space-y-5">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">구분</label>
              <select id="claimType" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-white">
                <option value="return">반품</option>
                <option value="exchange">교환</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">대상 상품</label>
              <select id="claimProduct" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-white"></select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">수량</label>
              <input type="number" id="claimQuantity" min="1" value="1" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow">
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">사유</label>
              <textarea id="claimReason" rows="3" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow resize-none"></textarea>
            </div>
          </div>
          <div class="bg-slate-50 px-6 py-4 flex justify-end space-x-3 rounded-b-2xl border-t border-slate-100">
            <button type="button" onclick="document.getElementById('claimModal').classList.add('hidden')" class="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200">취소</button>
            <button type="submit" class="px-5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 shadow-lg shadow-amber-200 transition-all transform active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2">요청 등록</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function openClaimModal(saleId) {
  injectClaimModal();
  try {
    const res = await axios.get(`${API_BASE}/sales/${saleId}`);
    const sale = res.data.data;

    document.getElementById('claimSaleId').value = sale.id;

    const productSelect = document.getElementById('claimProduct');
    productSelect.innerHTML = sale.items.map(item =>
      `<option value="${item.product_id}">${item.product_name} (구매수량: ${item.quantity})</option>`
    ).join('');

    document.getElementById('claimModal').classList.remove('hidden');
  } catch (e) {
    alert('정보 로드 실패');
  }
}

async function submitClaim(e) {
  e.preventDefault();
  const saleId = document.getElementById('claimSaleId').value;
  const productId = document.getElementById('claimProduct').value;
  const quantity = document.getElementById('claimQuantity').value;

  const payload = {
    sale_id: parseInt(saleId),
    type: document.getElementById('claimType').value,
    reason: document.getElementById('claimReason').value,
    items: [{
      product_id: parseInt(productId),
      quantity: parseInt(quantity),
      condition: 'good'
    }]
  };

  try {
    await axios.post(`${API_BASE}/claims`, payload);
    showSuccess('요청이 등록되었습니다.');
    document.getElementById('claimModal').classList.add('hidden');
    switchSalesTab('claims');
  } catch (e) {
    alert('요청 실패: ' + (e.response?.data?.error || e.message));
  }
}

async function updateClaimStatus(id, status) {
  if (!confirm(`${status === 'approved' ? '승인' : '거절'} 하시겠습니까?`)) return;

  try {
    await axios.put(`${API_BASE}/claims/${id}/status`, { status });
    showSuccess('처리되었습니다.');
    switchSalesTab('claims');
  } catch (e) {
    alert('처리 실패');
  }
}

function injectStockModal() {
  if (document.getElementById('stockModal')) return;

  const modalHtml = `
    <div id="stockModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm hidden flex items-center justify-center z-50 transition-all duration-300">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 transform transition-all border border-slate-100">
        <div class="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 id="stockModalTitle" class="text-xl font-bold text-slate-800">재고 관리</h3>
          <button onclick="closeStockModal()" class="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <form id="stockForm" onsubmit="submitStockMovement(event)">
          <div class="p-6 space-y-5">
            <input type="hidden" id="stockMovementType">
            
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">상품 선택</label>
              <select id="stockProduct" required class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-white">
                <option value="">상품을 선택하세요</option>
                <!-- 상품 목록이 여기에 동적으로 추가됨 -->
              </select>
            </div>
            
            <div id="currentStockDisplay" class="hidden text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
              현재 재고: <span id="currentStockValue" class="font-bold text-indigo-600">0</span>
            </div>

            <div>
              <label id="stockQuantityLabel" class="block text-sm font-semibold text-slate-700 mb-2">수량</label>
              <input type="number" id="stockQuantity" required min="1" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow">
            </div>

            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">사유</label>
              <input type="text" id="stockReason" required class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow" placeholder="예: 정기 입고, 파손 폐기 등">
            </div>

            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">비고 (선택)</label>
              <textarea id="stockNotes" rows="3" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow resize-none"></textarea>
            </div>
          </div>
          
          <div class="bg-slate-50 px-6 py-4 flex justify-end space-x-3 rounded-b-2xl border-t border-slate-100">
            <button type="button" onclick="closeStockModal()" class="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200">
              취소
            </button>
            <button type="submit" class="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // 상품 선택 시 현재 재고 표시 리스너
  document.getElementById('stockProduct').addEventListener('change', function (e) {
    const productId = parseInt(e.target.value);
    const product = window.products.find(p => p.id === productId);
    const display = document.getElementById('currentStockDisplay');
    const value = document.getElementById('currentStockValue');

    if (product) {
      value.textContent = product.current_stock;
      display.classList.remove('hidden');
    } else {
      display.classList.add('hidden');
    }
  });
}

function openStockModal(type) {
  const modal = document.getElementById('stockModal');
  const title = document.getElementById('stockModalTitle');
  const typeInput = document.getElementById('stockMovementType');
  const productSelect = document.getElementById('stockProduct');
  const quantityLabel = document.getElementById('stockQuantityLabel');
  const reasonInput = document.getElementById('stockReason');

  // 폼 초기화
  document.getElementById('stockForm').reset();
  document.getElementById('currentStockDisplay').classList.add('hidden');

  // 상품 옵션 채우기
  productSelect.innerHTML = '<option value="">상품을 선택하세요</option>';
  if (window.products) {
    window.products.forEach(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = `${p.name} (${p.sku})`;
      productSelect.appendChild(option);
    });
  }

  typeInput.value = type;

  switch (type) {
    case 'in':
      title.textContent = '재고 입고 등록';
      quantityLabel.textContent = '입고 수량';
      reasonInput.value = '정기 입고';
      break;
    case 'out':
      title.textContent = '재고 출고 등록';
      quantityLabel.textContent = '출고 수량';
      reasonInput.value = '판매 출고';
      break;
    case 'adjust':
      title.textContent = '재고 조정';
      quantityLabel.textContent = '실제 재고 수량 (변경할 최종 수량)';
      reasonInput.value = '재고 실사';
      break;
  }

  modal.classList.remove('hidden');
}

function closeStockModal() {
  document.getElementById('stockModal').classList.add('hidden');
}

async function submitStockMovement(e) {
  e.preventDefault();

  const type = document.getElementById('stockMovementType').value;
  const productId = parseInt(document.getElementById('stockProduct').value);
  const quantity = parseInt(document.getElementById('stockQuantity').value);
  const reason = document.getElementById('stockReason').value;
  const notes = document.getElementById('stockNotes').value;

  if (!productId || isNaN(quantity)) {
    alert('상품과 수량을 올바르게 입력해주세요.');
    return;
  }

  const payload = {
    product_id: productId,
    reason: reason,
    notes: notes
  };

  // API 엔드포인트 및 데이터 설정
  let endpoint = '';
  if (type === 'adjust') {
    endpoint = '/stock/adjust';
    payload.new_stock = quantity; // 조정일 경우 최종 수량
  } else {
    endpoint = `/stock/${type}`; // in or out
    payload.quantity = quantity;
  }

  try {
    await axios.post(`${API_BASE}${endpoint}`, payload);
    showSuccess('처리가 완료되었습니다.');
    closeStockModal();
    loadPage('stock'); // 목록 새로고침
  } catch (error) {
    console.error('재고 처리 실패:', error);
    const msg = error.response?.data?.error || '처리 중 오류가 발생했습니다.';
    alert(msg);
  }
}

// --- 출고 관리 로드 ---
async function loadOutbound(content) {
  content.innerHTML = `
    <div class="flex flex-col h-full">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-slate-800">
          <i class="fas fa-truck-loading mr-2 text-indigo-600"></i>출고 관리
        </h1>
      </div>

      <!-- 프로세스 탭 -->
      <div class="flex border-b border-slate-200 mb-6 bg-white rounded-t-xl px-4 pt-2 shadow-sm">
        <button id="tab-instruction" class="px-6 py-4 font-bold text-indigo-600 border-b-2 border-indigo-600 transition-colors flex items-center" onclick="switchOutboundTab('instruction')">
          <div class="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs mr-2">1</div>
          출고 지시
        </button>
        <button id="tab-picking" class="px-6 py-4 font-medium text-slate-500 hover:text-slate-700 transition-colors flex items-center" onclick="switchOutboundTab('picking')">
          <div class="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs mr-2">2</div>
          피킹/검수
        </button>
        <button id="tab-packing" class="px-6 py-4 font-medium text-slate-500 hover:text-slate-700 transition-colors flex items-center" onclick="switchOutboundTab('packing')">
          <div class="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs mr-2">3</div>
          패킹/송장
        </button>
        <button id="tab-confirmation" class="px-6 py-4 font-medium text-slate-500 hover:text-slate-700 transition-colors flex items-center" onclick="switchOutboundTab('confirmation')">
          <div class="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs mr-2">4</div>
          출고 확정
        </button>
      </div>

      <!-- 탭 컨텐츠 영역 -->
      <div id="outboundTabContent" class="flex-1 overflow-hidden flex flex-col relative">
        <!-- 동적 로드 -->
      </div>
    </div>
  `;

  switchOutboundTab('instruction');
}

async function switchOutboundTab(tabName) {
  // 탭 스타일 업데이트
  document.querySelectorAll('[id^="tab-"]').forEach(el => {
    el.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600', 'font-bold');
    el.classList.add('text-slate-500', 'font-medium', 'border-transparent');
    el.querySelector('div').classList.remove('bg-indigo-100', 'text-indigo-600');
    el.querySelector('div').classList.add('bg-slate-100', 'text-slate-500');
  });
  const activeTab = document.getElementById(`tab-${tabName}`);
  if (activeTab) {
    activeTab.classList.remove('text-slate-500', 'font-medium', 'border-transparent');
    activeTab.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600', 'font-bold');
    activeTab.querySelector('div').classList.remove('bg-slate-100', 'text-slate-500');
    activeTab.querySelector('div').classList.add('bg-indigo-100', 'text-indigo-600');
  }

  const container = document.getElementById('outboundTabContent');

  switch (tabName) {
    case 'instruction': await renderOutboundInstruction(container); break;
    case 'picking': await renderOutboundPicking(container); break;
    case 'packing': await renderOutboundPacking(container); break;
    case 'confirmation': await renderOutboundConfirmation(container); break;
  }
}

// 1. 출고 지시 (Instruction)
async function renderOutboundInstruction(container) {
  try {
    // 배송 준비중인 주문 목록 조회 (아직 출고지시 안된 것들)
    // 실제로는 API 필터링이 필요하지만 여기서는 sales API 활용
    const salesRes = await axios.get(`${API_BASE}/sales?status=completed`);
    const sales = salesRes.data.data;

    container.innerHTML = `
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex-1 flex flex-col">
        <div class="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 class="font-bold text-slate-800">출고 대기 주문 목록</h3>
          <button onclick="createOutboundOrder()" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
            <i class="fas fa-file-alt mr-2"></i>출고지시서 생성
          </button>
        </div>
        <div class="overflow-auto flex-1">
          <table class="min-w-full text-sm divide-y divide-slate-200">
            <thead class="bg-slate-50 sticky top-0">
              <tr>
                <th class="px-6 py-3 text-left"><input type="checkbox" id="checkAllSales" onchange="toggleAllSales(this)"></th>
                <th class="px-6 py-3 text-left font-semibold text-slate-500">주문번호</th>
                <th class="px-6 py-3 text-left font-semibold text-slate-500">고객명</th>
                <th class="px-6 py-3 text-left font-semibold text-slate-500">배송지</th>
                <th class="px-6 py-3 text-left font-semibold text-slate-500">주문일시</th>
                <th class="px-6 py-3 text-right font-semibold text-slate-500">금액</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 bg-white">
              ${sales.length > 0 ? sales.map(s => `
                <tr class="hover:bg-slate-50">
                  <td class="px-6 py-4"><input type="checkbox" class="sale-checkbox" value="${s.id}"></td>
                  <td class="px-6 py-4 font-mono">#${s.id}</td>
                  <td class="px-6 py-4">${s.customer_name || '비회원'}</td>
                  <td class="px-6 py-4 text-slate-600 truncate max-w-xs" title="${s.shipping_address || ''}">${s.shipping_address || '-'}</td>
                  <td class="px-6 py-4 text-slate-500">${new Date(s.created_at).toLocaleDateString()}</td>
                  <td class="px-6 py-4 text-right font-bold">${formatCurrency(s.final_amount)}</td>
                </tr>
              `).join('') : '<tr><td colspan="6" class="px-6 py-10 text-center text-slate-500">출고 대기 중인 주문이 없습니다.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (error) {
    console.error(error);
    showError(container, '주문 목록 로드 실패');
  }
}

function toggleAllSales(source) {
  document.querySelectorAll('.sale-checkbox').forEach(cb => cb.checked = source.checked);
}

async function createOutboundOrder() {
  const selected = Array.from(document.querySelectorAll('.sale-checkbox:checked')).map(cb => parseInt(cb.value));
  if (selected.length === 0) {
    alert('주문을 선택해주세요.');
    return;
  }

  if (!confirm(`${selected.length}건의 주문에 대해 출고지시서를 생성하시겠습니까?`)) return;

  try {
    await axios.post(`${API_BASE}/outbound/create`, { sale_ids: selected });
    alert('출고지시서가 생성되었습니다.');
    switchOutboundTab('instruction'); // Refresh
  } catch (error) {
    console.error(error);
    alert('생성 실패: ' + (error.response?.data?.error || error.message));
  }
}

// 2. 피킹/검수 (Picking)
async function renderOutboundPicking(container) {
  try {
    const response = await axios.get(`${API_BASE}/outbound?status=PENDING`); // PENDING or PICKING
    const orders = response.data.data.filter(o => o.status === 'PENDING' || o.status === 'PICKING');

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto p-1">
        ${orders.map(o => `
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onclick="openPickingModal(${o.id})">
            <div class="flex justify-between items-start mb-4">
              <div>
                <span class="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded mb-2 inline-block">${o.status}</span>
                <h4 class="font-bold text-lg text-slate-800">${o.order_number}</h4>
              </div>
              <div class="text-right">
                <p class="text-sm text-slate-500">${new Date(o.created_at).toLocaleDateString()}</p>
                <p class="text-xs text-slate-400">${new Date(o.created_at).toLocaleTimeString()}</p>
              </div>
            </div>
            <div class="space-y-2 mb-4">
              <p class="text-sm text-slate-600"><i class="fas fa-user mr-2 w-4"></i>${o.destination_name}</p>
              <p class="text-sm text-slate-600 truncate"><i class="fas fa-map-marker-alt mr-2 w-4"></i>${o.destination_address}</p>
            </div>
            <div class="border-t border-slate-100 pt-4 flex justify-between items-center">
              <span class="text-sm font-medium text-slate-600">총 ${o.item_count}개 품목</span>
              <button class="text-indigo-600 hover:text-indigo-800 font-medium text-sm">피킹 시작 <i class="fas fa-arrow-right ml-1"></i></button>
            </div>
          </div>
        `).join('')}
        ${orders.length === 0 ? '<div class="col-span-full text-center py-10 text-slate-500">피킹 대기 중인 지시서가 없습니다.</div>' : ''}
      </div>
    `;
  } catch (error) {
    console.error(error);
    showError(container, '출고 목록 로드 실패');
  }
}

async function openPickingModal(id) {
  // 상세 조회 및 모달 표시
  try {
    const res = await axios.get(`${API_BASE}/outbound/${id}`);
    const order = res.data.data;

    // 모달 HTML 생성 (바코드 스캔 시뮬레이션 포함)
    const modalHtml = `
      <div id="pickingModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
          <div class="p-6 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 class="text-xl font-bold text-slate-800">피킹 및 검수</h3>
              <p class="text-sm text-slate-500">${order.order_number} - ${order.destination_name}</p>
            </div>
            <button onclick="document.getElementById('pickingModal').remove()" class="text-slate-400 hover:text-slate-600"><i class="fas fa-times text-xl"></i></button>
          </div>
          
          <div class="p-6 flex-1 overflow-y-auto">
            <div class="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <label class="block text-sm font-bold text-slate-700 mb-2">바코드 스캔 (시뮬레이션)</label>
              <div class="flex gap-2">
                <input type="text" id="scanInput" class="flex-1 border border-slate-300 rounded px-4 py-2 focus:ring-2 focus:ring-indigo-500" placeholder="상품 SKU 입력 후 엔터" onkeyup="if(event.key==='Enter') simulateScan(this.value, ${id})">
                <button onclick="simulateScan(document.getElementById('scanInput').value, ${id})" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">스캔</button>
              </div>
            </div>

            <table class="min-w-full text-sm">
              <thead class="bg-slate-50">
                <tr>
                  <th class="px-4 py-2 text-left">상품명 / SKU</th>
                  <th class="px-4 py-2 text-center">지시수량</th>
                  <th class="px-4 py-2 text-center">피킹수량</th>
                  <th class="px-4 py-2 text-center">상태</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${order.items.map(item => `
                  <tr id="row-${item.product_id}" class="${item.quantity_picked >= item.quantity_ordered ? 'bg-emerald-50' : ''}">
                    <td class="px-4 py-3">
                      <div class="font-medium text-slate-900">${item.product_name}</div>
                      <div class="text-xs text-slate-500 font-mono">${item.sku}</div>
                    </td>
                    <td class="px-4 py-3 text-center font-bold">${item.quantity_ordered}</td>
                    <td class="px-4 py-3 text-center font-bold text-indigo-600" id="picked-${item.product_id}">${item.quantity_picked}</td>
                    <td class="px-4 py-3 text-center">
                      <span id="status-${item.product_id}" class="px-2 py-1 rounded text-xs font-bold ${item.quantity_picked >= item.quantity_ordered ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}">
                        ${item.quantity_picked >= item.quantity_ordered ? '완료' : '대기'}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
             <button onclick="document.getElementById('pickingModal').remove(); switchOutboundTab('picking');" class="bg-slate-800 text-white px-6 py-2 rounded hover:bg-slate-900">닫기</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('scanInput').focus();
  } catch (e) {
    console.error(e);
    alert('상세 정보 로드 실패');
  }
}

async function simulateScan(sku, orderId) {
  if (!sku) return;

  try {
    const prodRes = await axios.get(`${API_BASE}/products?search=${sku}`);
    if (prodRes.data.data.length === 0) {
      alert('상품을 찾을 수 없습니다.');
      return;
    }
    const product = prodRes.data.data[0]; // 첫번째 매칭

    await axios.post(`${API_BASE}/outbound/${orderId}/picking`, {
      items: [{ product_id: product.id, quantity: 1 }]
    });

    // UI 업데이트 (간단히 리로드)
    document.getElementById('pickingModal').remove();
    openPickingModal(orderId);

  } catch (e) {
    console.error(e);
    alert('스캔 처리 실패');
  }
}

// 3. 패킹/송장 (Packing)
async function renderOutboundPacking(container) {
  try {
    const response = await axios.get(`${API_BASE}/outbound?status=PACKING`);
    const orders = response.data.data;

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto p-1">
        ${orders.map(o => `
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start mb-4">
              <h4 class="font-bold text-lg text-slate-800">${o.order_number}</h4>
              <span class="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded">패킹 대기</span>
            </div>
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">택배사</label>
                <select id="courier-${o.id}" class="w-full border border-slate-300 rounded px-2 py-1 text-sm">
                  <option value="CJ대한통운">CJ대한통운</option>
                  <option value="우체국택배">우체국택배</option>
                  <option value="로젠택배">로젠택배</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">운송장 번호</label>
                <input type="text" id="tracking-${o.id}" class="w-full border border-slate-300 rounded px-2 py-1 text-sm" placeholder="숫자만 입력">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">박스 타입</label>
                <select id="box-${o.id}" class="w-full border border-slate-300 rounded px-2 py-1 text-sm">
                  <option value="A형">A형 (소)</option>
                  <option value="B형">B형 (중)</option>
                  <option value="C형">C형 (대)</option>
                </select>
              </div>
              <button onclick="submitPacking(${o.id})" class="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 font-medium">
                패킹 완료 및 송장 저장
              </button>
            </div>
          </div>
        `).join('')}
        ${orders.length === 0 ? '<div class="col-span-full text-center py-10 text-slate-500">패킹 대기 중인 지시서가 없습니다.</div>' : ''}
      </div>
    `;
  } catch (error) {
    console.error(error);
    showError(container, '목록 로드 실패');
  }
}

async function submitPacking(id) {
  const courier = document.getElementById(`courier-${id}`).value;
  const trackingNumber = document.getElementById(`tracking-${id}`).value;
  const boxType = document.getElementById(`box-${id}`).value;

  if (!trackingNumber) {
    alert('운송장 번호를 입력해주세요.');
    return;
  }

  try {
    await axios.post(`${API_BASE}/outbound/${id}/packing`, {
      courier, tracking_number: trackingNumber, box_type: boxType, box_count: 1
    });
    alert('저장되었습니다.');
    switchOutboundTab('packing');
  } catch (e) {
    console.error(e);
    alert('저장 실패');
  }
}

// 4. 출고 확정 (Confirmation)
async function renderOutboundConfirmation(container) {
  try {
    // PACKING 상태이지만 아직 SHIPPED가 아닌 것들? 
    // 로직상 PACKING 단계에서 송장 입력하면 바로 SHIPPED로 넘기지 않고, 여기서 최종 확정(재고 차감)을 하도록 함.
    // 하지만 위 packing API에서는 status를 PACKING으로 유지함.
    const response = await axios.get(`${API_BASE}/outbound?status=PACKING`);
    // 송장 정보가 있는 것만 필터링해야 하지만 API가 간단하므로 일단 PACKING 상태인 것을 보여줌.
    const orders = response.data.data;

    container.innerHTML = `
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex-1 flex flex-col">
        <div class="p-4 border-b border-slate-200 bg-slate-50">
          <h3 class="font-bold text-slate-800">출고 확정 대기 목록</h3>
        </div>
        <div class="overflow-auto flex-1">
          <table class="min-w-full text-sm divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-6 py-3 text-left font-semibold text-slate-500">지시번호</th>
                <th class="px-6 py-3 text-left font-semibold text-slate-500">고객명</th>
                <th class="px-6 py-3 text-center font-semibold text-slate-500">품목수</th>
                <th class="px-6 py-3 text-center font-semibold text-slate-500">상태</th>
                <th class="px-6 py-3 text-center font-semibold text-slate-500">관리</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 bg-white">
              ${orders.map(o => `
                <tr class="hover:bg-slate-50">
                  <td class="px-6 py-4 font-mono">${o.order_number}</td>
                  <td class="px-6 py-4">${o.destination_name}</td>
                  <td class="px-6 py-4 text-center">${o.item_count}</td>
                  <td class="px-6 py-4 text-center"><span class="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold">검수완료</span></td>
                  <td class="px-6 py-4 text-center">
                    <button onclick="confirmOutbound(${o.id})" class="bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-emerald-700 text-xs font-bold">
                      출고 확정 (재고차감)
                    </button>
                  </td>
                </tr>
              `).join('')}
              ${orders.length === 0 ? '<tr><td colspan="5" class="px-6 py-10 text-center text-slate-500">확정 대기 중인 건이 없습니다.</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (error) {
    console.error(error);
    showError(container, '목록 로드 실패');
  }
}

async function confirmOutbound(id) {
  if (!confirm('출고를 확정하시겠습니까? 재고가 즉시 차감됩니다.')) return;

  try {
    await axios.post(`${API_BASE}/outbound/${id}/confirm`);
    alert('출고가 확정되었습니다.');
    switchOutboundTab('confirmation');
  } catch (e) {
    console.error(e);
    alert('확정 실패: ' + (e.response?.data?.error || e.message));
  }
}

// --- 출고 관리 로드 (탭 구조) ---
async function loadOutbound(content) {
  content.innerHTML = `
    <div class="flex flex-col h-full">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-slate-800">
          <i class="fas fa-truck-loading mr-2 text-indigo-600"></i>출고 관리
        </h1>
      </div>

      <!-- 탭 네비게이션 -->
      <div class="flex border-b border-slate-200 mb-6 bg-white rounded-t-xl px-4 pt-2 shadow-sm">
        <button id="tab-out-reg" class="px-6 py-4 font-bold text-indigo-600 border-b-2 border-indigo-600 transition-colors flex items-center" onclick="switchOutboundTab('reg')">
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
  // 탭 스타일 업데이트
  const tabs = ['reg', 'hist'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-out-${t}`);
    if (t === tabName) {
      btn.classList.remove('text-slate-500', 'font-medium', 'border-transparent');
      btn.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600', 'font-bold');
    } else {
      btn.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600', 'font-bold');
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

  // 출고 장바구니 초기화 (이미 있으면 유지)
  if (!window.outboundCart) window.outboundCart = [];

  container.innerHTML = `
    <div class="flex flex-1 gap-6 overflow-hidden h-full pb-4">
      <!-- 좌측: 상품 선택 -->
      <div class="w-1/2 flex flex-col bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="p-4 border-b border-slate-200 bg-slate-50">
          <h3 class="font-bold text-slate-800 mb-3">1. 출고 상품 선택</h3>
          <div class="relative">
            <i class="fas fa-search absolute left-3 top-3 text-slate-400"></i>
            <input type="text" id="outboundSearch" placeholder="상품명 또는 SKU 검색..." 
                   class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                   onkeyup="filterOutboundProducts()">
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-2" id="outboundProductList">
          <!-- 상품 목록 렌더링 -->
        </div>
      </div>

      <!-- 우측: 출고 정보 입력 -->
      <div class="w-1/2 flex flex-col gap-6 overflow-y-auto pr-2">
        <!-- 선택된 상품 목록 -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 class="font-bold text-slate-800 mb-4">2. 선택된 상품</h3>
          <div id="outboundCartItems" class="space-y-3 mb-4 min-h-[100px]">
            <p class="text-center text-slate-400 py-8">상품을 선택해주세요.</p>
          </div>
          <div class="flex justify-between items-center pt-4 border-t border-slate-100">
            <span class="font-bold text-slate-600">총 수량</span>
            <span class="font-bold text-indigo-600 text-lg" id="outboundTotalQty">0개</span>
          </div>
        </div>

        <!-- 배송 정보 입력 -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 class="font-bold text-slate-800 mb-4">3. 배송 정보</h3>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">수령인</label>
                <input type="text" id="outDestName" class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">연락처</label>
                <input type="text" id="outDestPhone" class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1">주소</label>
              <input type="text" id="outDestAddress" class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 mb-2" placeholder="기본 주소">
            </div>
          </div>
        </div>

        <!-- 운송장 정보 -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 class="font-bold text-slate-800 mb-4">4. 운송장 정보</h3>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">택배사</label>
                <select id="outCourier" class="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white">
                  <option value="CJ대한통운">CJ대한통운</option>
                  <option value="우체국택배">우체국택배</option>
                  <option value="로젠택배">로젠택배</option>
                  <option value="롯데택배">롯데택배</option>
                  <option value="한진택배">한진택배</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 mb-1">박스 타입</label>
                <select id="outBoxType" class="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white">
                  <option value="A형">A형 (소)</option>
                  <option value="B형">B형 (중)</option>
                  <option value="C형">C형 (대)</option>
                  <option value="D형">D형 (특대)</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1">운송장 번호</label>
              <input type="text" id="outTracking" class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="운송장 번호 입력">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 mb-1">비고</label>
              <input type="text" id="outNotes" class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="배송 메모 등">
            </div>
          </div>
        </div>

        <button onclick="submitDirectOutbound()" class="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.99] mb-6">
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
  if (!container) return;

  const filtered = window.products.filter(p =>
    p.name.toLowerCase().includes(filterText.toLowerCase()) ||
    p.sku.toLowerCase().includes(filterText.toLowerCase())
  );

  container.innerHTML = filtered.map(p => `
    <div class="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-colors cursor-pointer" onclick="addToOutboundCart(${p.id})">
      <div>
        <div class="font-medium text-slate-800">${p.name}</div>
        <div class="text-xs text-indigo-600 mb-0.5 font-medium">${[p.category, p.category_medium, p.category_small].filter(Boolean).join(' > ')}</div>
        <div class="text-xs text-slate-500 flex items-center gap-2">
          <span class="font-mono bg-slate-100 px-1.5 py-0.5 rounded">${p.sku}</span>
          <span>재고: <span class="${p.current_stock <= 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}">${p.current_stock}</span></span>
        </div>
      </div>
      <button class="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100">
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
    alert('재고가 없는 상품입니다.');
    return;
  }

  const existing = window.outboundCart.find(item => item.product.id === productId);
  if (existing) {
    if (existing.quantity >= product.current_stock) {
      alert('재고 수량을 초과할 수 없습니다.');
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
          <div>
            <div class="font-medium text-slate-800 text-sm">${item.product.name}</div>
            <div class="text-xs text-indigo-600 mb-0.5">${[item.product.category, item.product.category_medium, item.product.category_small].filter(Boolean).join(' > ')}</div>
            <div class="text-xs text-slate-500 font-mono">${item.product.sku}</div>
          </div>
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
    alert('재고 부족');
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
    alert('출고할 상품을 선택해주세요.');
    return;
  }

  const destName = document.getElementById('outDestName').value;
  const destPhone = document.getElementById('outDestPhone').value;
  const destAddress = document.getElementById('outDestAddress').value;
  const courier = document.getElementById('outCourier').value;
  const tracking = document.getElementById('outTracking').value;
  const boxType = document.getElementById('outBoxType').value;
  const notes = document.getElementById('outNotes').value;

  if (!destName || !destAddress) {
    alert('수령인과 주소를 입력해주세요.');
    return;
  }

  if (!tracking) {
    if (!confirm('운송장 번호 없이 출고하시겠습니까?')) return;
  }

  const payload = {
    items: window.outboundCart.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
    destination: {
      name: destName,
      phone: destPhone,
      address: destAddress
    },
    package: {
      courier: courier,
      tracking_number: tracking,
      box_type: boxType
    },
    notes: notes
  };

  try {
    await axios.post(`${API_BASE}/outbound/direct`, payload);
    alert('출고가 완료되었습니다.');
    // 초기화
    window.outboundCart = [];
    document.getElementById('outDestName').value = '';
    document.getElementById('outDestPhone').value = '';
    document.getElementById('outDestAddress').value = '';
    document.getElementById('outTracking').value = '';
    document.getElementById('outNotes').value = '';
    renderOutboundCart();
    // 상품 재고 갱신을 위해 다시 로드
    const res = await axios.get(`${API_BASE}/products`);
    window.products = res.data.data;
    renderOutboundProducts();
  } catch (e) {
    console.error(e);
    alert('출고 등록 실패: ' + (e.response?.data?.error || e.message));
  }
}

async function renderOutboundHistoryTab(container) {
  // 초기 UI 렌더링 (필터 포함)
  container.innerHTML = `
    <div class="flex flex-col h-full">
      <!-- 필터 -->
      <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6">
        <div class="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div class="flex flex-1 gap-4 w-full md:w-auto">
            <div class="relative flex-1 md:max-w-xs">
              <i class="fas fa-search absolute left-3 top-3 text-slate-400"></i>
              <input type="text" id="outHistorySearch" placeholder="주문번호 또는 받는분 검색" class="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" onkeyup="if(event.key === 'Enter') filterOutboundHistory()">
            </div>
            <select id="outHistoryStatus" class="border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" onchange="filterOutboundHistory()">
              <option value="">전체 상태</option>
              <option value="PENDING">출고 대기</option>
              <option value="PICKING">피킹 중</option>
              <option value="PACKING">패킹 중</option>
              <option value="SHIPPED">출고 완료</option>
              <option value="CANCELLED">취소됨</option>
            </select>
            <button onclick="toggleOutboundFilters()" class="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-2">
              <i class="fas fa-filter"></i>상세 필터
            </button>
          </div>
          <button onclick="filterOutboundHistory()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium transition-colors">
            <i class="fas fa-search mr-2"></i>조회
          </button>
        </div>

        <!-- 상세 필터 영역 -->
        <div id="outboundDetailFilters" class="hidden mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">기간 조회</label>
            <div class="flex gap-2 items-center">
              <input type="date" id="outStartDate" class="w-full border border-slate-200 rounded px-3 py-2 text-sm">
              <span class="text-slate-400">~</span>
              <input type="date" id="outEndDate" class="w-full border border-slate-200 rounded px-3 py-2 text-sm">
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500 mb-1">택배사</label>
            <select id="outCourier" class="w-full border border-slate-200 rounded px-3 py-2 text-sm">
              <option value="">전체</option>
              <option value="CJ대한통운">CJ대한통운</option>
              <option value="우체국택배">우체국택배</option>
              <option value="한진택배">한진택배</option>
              <option value="로젠택배">로젠택배</option>
              <option value="롯데택배">롯데택배</option>
            </select>
          </div>
          <div class="flex items-end">
            <button onclick="filterOutboundHistory()" class="w-full bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-700 text-sm">
              적용하기
            </button>
          </div>
        </div>
      </div>

      <!-- 리스트 -->
      <div id="outboundHistoryList" class="flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-slate-100">
        <!-- 동적 로드 -->
        <div class="flex items-center justify-center h-full text-slate-400">
          <i class="fas fa-spinner fa-spin mr-2"></i>데이터 로딩 중...
        </div>
      </div>
    </div>
  `;

  // 초기 데이터 로드
  await filterOutboundHistory();
}

function toggleOutboundFilters() {
  const filters = document.getElementById('outboundDetailFilters');
  filters.classList.toggle('hidden');
}

async function filterOutboundHistory() {
  const search = document.getElementById('outHistorySearch').value;
  const status = document.getElementById('outHistoryStatus').value;
  const startDate = document.getElementById('outStartDate')?.value || '';
  const endDate = document.getElementById('outEndDate')?.value || '';
  const courier = document.getElementById('outCourier')?.value || '';

  const container = document.getElementById('outboundHistoryList');

  try {
    const params = {};
    if (search) params.search = search;
    if (status) params.status = status;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (courier) params.courier = courier;

    const res = await axios.get(`${API_BASE}/outbound`, { params });
    const list = res.data.data;

    container.innerHTML = `
      <table class="min-w-full text-sm text-left">
        <thead class="bg-slate-50 font-bold text-slate-500 sticky top-0">
          <tr>
            <th class="px-6 py-3">출고번호</th>
            <th class="px-6 py-3">일시</th>
            <th class="px-6 py-3">수령인</th>
            <th class="px-6 py-3">품목수</th>
            <th class="px-6 py-3">상태</th>
            <th class="px-6 py-3 text-center">관리</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${list.map(o => `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="px-6 py-4 font-mono">${o.order_number}</td>
              <td class="px-6 py-4 text-slate-500">${new Date(o.created_at).toLocaleString()}</td>
              <td class="px-6 py-4 font-medium text-slate-800">${o.destination_name}</td>
              <td class="px-6 py-4">${o.item_count}</td>
              <td class="px-6 py-4"><span class="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">${o.status}</span></td>
              <td class="px-6 py-4 text-center">
                <button onclick="showOutboundDetail(${o.id})" class="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded text-xs font-bold transition-colors">
                  <i class="fas fa-search mr-1"></i>상세보기
                </button>
              </td>
            </tr>
          `).join('')}
          ${list.length === 0 ? '<tr><td colspan="6" class="px-6 py-10 text-center text-slate-500">출고 이력이 없습니다.</td></tr>' : ''}
        </tbody>
      </table>
    `;
  } catch (e) {
    console.error(e);
    alert('조회 실패');
  }
}

async function showOutboundDetail(id) {
  try {
    const res = await axios.get(`${API_BASE}/outbound/${id}`);
    const data = res.data.data;
    const { items, packages } = data;

    const modalHtml = `
      <div id="outDetailModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] transition-opacity duration-300 opacity-0">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col transform scale-95 transition-transform duration-300">
          <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
            <div>
              <h3 class="text-xl font-bold text-slate-800 flex items-center gap-2">
                <i class="fas fa-file-invoice-dollar text-indigo-600"></i> 출고 상세 정보
              </h3>
              <p class="text-sm text-slate-500 mt-1 font-mono">${data.order_number}</p>
            </div>
            <button onclick="closeOutboundDetail()" class="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors">
              <i class="fas fa-times text-lg"></i>
            </button>
          </div>
          
          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            <!-- 상태 및 기본 정보 -->
            <div class="grid grid-cols-2 gap-6">
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 class="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">받는 분 정보</h4>
                <div class="space-y-2 text-sm">
                  <div class="flex"><span class="w-20 text-slate-500">이름</span> <span class="font-medium text-slate-900">${data.destination_name}</span></div>
                  <div class="flex"><span class="w-20 text-slate-500">연락처</span> <span class="font-medium text-slate-900">${data.destination_phone || '-'}</span></div>
                  <div class="flex"><span class="w-20 text-slate-500">주소</span> <span class="font-medium text-slate-900 break-all">${data.destination_address}</span></div>
                </div>
              </div>
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 class="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">출고 상태</h4>
                <div class="space-y-2 text-sm">
                  <div class="flex items-center"><span class="w-20 text-slate-500">상태</span> 
                    <span class="px-2 py-0.5 rounded bg-white border border-slate-200 text-xs font-bold text-indigo-600 shadow-sm">${data.status}</span>
                  </div>
                  <div class="flex"><span class="w-20 text-slate-500">등록일</span> <span class="text-slate-700">${new Date(data.created_at).toLocaleString()}</span></div>
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
            ${packages.length > 0 ? `
              <div>
                <h4 class="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <i class="fas fa-truck text-slate-400"></i> 배송 및 운송장 정보
                </h4>
                <div class="grid grid-cols-1 gap-3">
                  ${packages.map(p => `
                    <div class="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                      <div class="flex items-center gap-4">
                        <div class="bg-white p-2 rounded-full shadow-sm text-indigo-600">
                          <i class="fas fa-shipping-fast"></i>
                        </div>
                        <div>
                          <div class="font-bold text-indigo-900">${p.courier}</div>
                          <div class="text-sm text-indigo-700 font-mono tracking-wide">${p.tracking_number}</div>
                        </div>
                      </div>
                      <div class="text-right text-sm">
                        <div class="font-medium text-slate-600">${p.box_type || '박스정보 없음'}</div>
                        <div class="text-slate-500">수량: ${p.box_count}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
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
      modal.classList.remove('opacity-0');
      content.classList.remove('scale-95');
      content.classList.add('scale-100');
    });

  } catch (e) {
    console.error(e);
    alert('상세 정보를 불러오는데 실패했습니다.');
  }
}

function closeOutboundDetail() {
  const modal = document.getElementById('outDetailModal');
  if (modal) {
    modal.classList.add('opacity-0');
    modal.querySelector('div').classList.remove('scale-100');
    modal.querySelector('div').classList.add('scale-95');
    setTimeout(() => modal.remove(), 300);
  }
}

// 설정 페이지 로드
async function loadSettingsPage(content) {
  try {
    const [subRes, usersRes] = await Promise.all([
      axios.get(`${API_BASE}/subscription`),
      axios.get(`${API_BASE}/users`)
    ]);

    const subData = subRes.data.data;
    const users = usersRes.data.data;
    const plan = subData.plan;
    const usage = subData.usage;
    const limits = subData.limits;

    // 상품 사용량 퍼센트
    const productPercent = limits.products === null ? 0 : Math.min(100, (usage.products / limits.products) * 100);
    const productLimitText = limits.products === null ? '무제한' : `${limits.products}개`;

    // 사용자 사용량 퍼센트
    const userPercent = limits.users === null ? 0 : Math.min(100, (usage.users / limits.users) * 100);
    const userLimitText = limits.users === null ? '무제한' : `${limits.users}명`;

    content.innerHTML = `
      <div class="space-y-6">
        <!-- 구독 정보 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- 플랜 정보 -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div class="flex justify-between items-start mb-4">
              <div>
                <h3 class="text-lg font-bold text-slate-800">현재 구독 플랜</h3>
                <p class="text-slate-500 text-sm">이용 중인 서비스 등급입니다.</p>
              </div>
              <span class="px-3 py-1 rounded-full text-sm font-bold bg-indigo-100 text-indigo-700">
                ${plan.name}
              </span>
            </div>
            <div class="mb-6">
              <span class="text-3xl font-bold text-slate-800">₩${plan.price.toLocaleString()}</span>
              <span class="text-slate-500">/월</span>
            </div>
            <div class="space-y-3 mb-6">
              ${plan.features.map(f => `
                <div class="flex items-center text-sm text-slate-600">
                  <i class="fas fa-check text-emerald-500 mr-2"></i> ${f}
                </div>
              `).join('')}
            </div>
            <button onclick="alert('준비 중입니다.')" class="w-full py-2 border border-indigo-600 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-colors">
              플랜 업그레이드
            </button>
          </div>

          <!-- 사용량 정보 -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 class="text-lg font-bold text-slate-800 mb-4">사용량 현황</h3>
            
            <div class="space-y-6">
              <!-- 상품 수 -->
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium text-slate-700">상품 등록 수</span>
                  <span class="text-slate-500">${usage.products.toLocaleString()} / ${productLimitText}</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2.5">
                  <div class="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style="width: ${productPercent}%"></div>
                </div>
                ${productPercent >= 90 ? '<p class="text-xs text-rose-500 mt-1"><i class="fas fa-exclamation-triangle mr-1"></i>한도에 근접했습니다.</p>' : ''}
              </div>

              <!-- 사용자 수 -->
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium text-slate-700">팀원 수</span>
                  <span class="text-slate-500">${usage.users.toLocaleString()} / ${userLimitText}</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2.5">
                  <div class="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style="width: ${userPercent}%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 팀원 관리 -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200">
          <div class="p-6 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 class="text-lg font-bold text-slate-800">팀원 관리</h3>
              <p class="text-slate-500 text-sm">함께 일할 팀원을 초대하고 관리하세요.</p>
            </div>
            <button onclick="openInviteModal()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              <i class="fas fa-plus mr-2"></i>팀원 초대
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">이름</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">이메일</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">권한</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">가입일</th>
                  <th class="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">관리</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                ${users.map(user => `
                  <tr class="hover:bg-slate-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">${user.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${user.email}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'OWNER' ? 'bg-purple-100 text-purple-700' :
        user.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
      }">
                        ${user.role}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      ${new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      ${user.role !== 'OWNER' ? `
                        <button onclick="deleteUser('${user.id}')" class="text-rose-600 hover:text-rose-900 ml-3">
                          <i class="fas fa-trash-alt"></i>
                        </button>
                      ` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 초대 모달 -->
      <div id="inviteModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden transform transition-all">
          <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 class="text-lg font-bold text-slate-800">팀원 초대</h3>
            <button onclick="closeInviteModal()" class="text-slate-400 hover:text-slate-600 transition-colors">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
          <form onsubmit="handleInvite(event)" class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">이메일</label>
              <input type="email" name="email" required class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="colleague@company.com">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">이름</label>
              <input type="text" name="name" required class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="홍길동">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">비밀번호</label>
              <input type="password" name="password" required class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="초기 비밀번호 설정">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">권한</label>
              <select name="role" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="USER">일반 사용자 (USER)</option>
                <option value="ADMIN">관리자 (ADMIN)</option>
              </select>
            </div>
            <div class="pt-4 flex gap-3">
              <button type="button" onclick="closeInviteModal()" class="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium">취소</button>
              <button type="submit" class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm">초대하기</button>
            </div>
          </form>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('설정 페이지 로드 실패:', error);
    showError('설정 정보를 불러오는데 실패했습니다.');
  }
}

function openInviteModal() {
  document.getElementById('inviteModal').classList.remove('hidden');
  document.getElementById('inviteModal').classList.add('flex');
}

function closeInviteModal() {
  document.getElementById('inviteModal').classList.add('hidden');
  document.getElementById('inviteModal').classList.remove('flex');
}

async function handleInvite(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  try {
    const res = await axios.post(`${API_BASE}/users`, data);
    if (res.data.success) {
      showSuccess('팀원이 초대되었습니다.');
      closeInviteModal();
      loadSettingsPage(document.getElementById('content')); // 새로고침
    }
  } catch (error) {
    showError(error.response?.data?.error || '초대 실패');
  }
}

async function deleteUser(userId) {
  if (!confirm('정말 이 사용자를 삭제하시겠습니까?')) return;

  try {
    const res = await axios.delete(`${API_BASE}/users/${userId}`);
    if (res.data.success) {
      showSuccess('사용자가 삭제되었습니다.');
      loadSettingsPage(document.getElementById('content')); // 새로고침
    }
  } catch (error) {
    showError(error.response?.data?.error || '삭제 실패');
  }
}

// 상품 내보내기
async function exportProducts() {
  try {
    const response = await axios.get(`${API_BASE}/import-export/products/export`, {
      responseType: 'blob'
    });

    // 파일 다운로드 트리거
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;

    // 파일명 추출 (헤더에서) 또는 기본값
    const contentDisposition = response.headers['content-disposition'];
    let fileName = 'products_export.csv';
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
      if (fileNameMatch.length === 2) fileName = fileNameMatch[1];
    }

    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    showSuccess('상품 목록을 다운로드했습니다.');
  } catch (error) {
    console.error('Export failed:', error);
    showError('내보내기에 실패했습니다.');
  }
}

// 상품 가져오기
async function importProducts(input) {
  const file = input.files[0];
  if (!file) return;

  // 파일 확장자 체크
  if (!file.name.endsWith('.csv')) {
    showError('CSV 파일만 업로드 가능합니다.');
    input.value = '';
    return;
  }

  const formData = new FormData();
  formData.append('file', file); // 실제로는 body text로 보냄

  // 텍스트로 읽어서 전송 (간단한 처리를 위해)
  const reader = new FileReader();
  reader.onload = async (e) => {
    const text = e.target.result;

    try {
      const res = await axios.post(`${API_BASE}/import-export/products/import`, text, {
        headers: {
          'Content-Type': 'text/plain'
        }
      });

      if (res.data.success) {
        showSuccess(res.data.message);
        if (res.data.errors && res.data.errors.length > 0) {
          alert('일부 오류가 발생했습니다:\n' + res.data.errors.join('\n'));
        }
        loadProducts(document.getElementById('content')); // 목록 새로고침
      }
    } catch (error) {
      console.error('Import failed:', error);
      showError(error.response?.data?.error || '가져오기에 실패했습니다.');
    } finally {
      input.value = ''; // 초기화
    }
  };
  reader.readAsText(file);
}
