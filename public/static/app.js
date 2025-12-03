// API Base URL
const API_BASE = '/api';

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
    const response = await axios.get(`${API_BASE}/users/me`);
    const user = response.data.data;

    document.getElementById('user-name').textContent = user.name;
    document.getElementById('user-email').textContent = user.email;

    if (user.avatar_url) {
      const avatarEl = document.getElementById('user-avatar');
      avatarEl.innerHTML = `<img src="${user.avatar_url}" alt="${user.name}" class="w-full h-full rounded-full object-cover">`;
    } else {
      document.getElementById('user-avatar').textContent = user.name.charAt(0).toUpperCase();
    }
  } catch (error) {
    console.error('사용자 정보 로드 실패:', error);
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
  }
}

// 대시보드 로드
async function loadDashboard(content) {
  try {
    // 병렬 데이터 로드
    const [summaryRes, salesChartRes, categoryStatsRes, bestsellersRes, lowStockRes, vipRes] = await Promise.all([
      axios.get(`${API_BASE}/dashboard/summary`),
      axios.get(`${API_BASE}/dashboard/sales-chart?days=7`),
      axios.get(`${API_BASE}/dashboard/category-stats`),
      axios.get(`${API_BASE}/dashboard/bestsellers?limit=5`),
      axios.get(`${API_BASE}/dashboard/low-stock-alerts`),
      axios.get(`${API_BASE}/dashboard/vip-customers?limit=5`)
    ]);

    const data = summaryRes.data.data;
    const chartData = salesChartRes.data.data;
    const categoryStats = categoryStatsRes.data.data;
    const bestsellers = bestsellersRes.data.data;
    const lowStockAlerts = lowStockRes.data.data;
    const vipCustomers = vipRes.data.data;

    content.innerHTML = `
      <!-- 주요 지표 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-slate-500 text-sm font-medium">오늘의 매출</p>
              <p class="text-2xl font-bold text-slate-800 mt-2">${formatCurrency(data.today_revenue)}</p>
              <p class="text-sm text-slate-400 mt-1 flex items-center">
                <i class="fas fa-receipt mr-1.5"></i>${data.today_sales_count}건
              </p>
            </div>
            <div class="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 text-xl">
              <i class="fas fa-dollar-sign"></i>
            </div>
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-slate-500 text-sm font-medium">이번 달 매출</p>
              <p class="text-2xl font-bold text-slate-800 mt-2">${formatCurrency(data.month_revenue)}</p>
              <p class="text-sm text-slate-400 mt-1 flex items-center">
                <i class="fas fa-calendar mr-1.5"></i>${data.month_sales_count}건
              </p>
            </div>
            <div class="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600 text-xl">
              <i class="fas fa-chart-bar"></i>
            </div>
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-slate-500 text-sm font-medium">총 재고 가치</p>
              <p class="text-2xl font-bold text-slate-800 mt-2">${formatCurrency(data.total_stock_value)}</p>
              <p class="text-sm text-slate-400 mt-1 flex items-center">
                <i class="fas fa-box mr-1.5"></i>${data.total_products}개 상품
              </p>
            </div>
            <div class="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 text-xl">
              <i class="fas fa-warehouse"></i>
            </div>
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-slate-500 text-sm font-medium">총 고객 수</p>
              <p class="text-2xl font-bold text-slate-800 mt-2">${data.total_customers}</p>
              <p class="text-sm text-slate-400 mt-1 flex items-center">
                <i class="fas fa-crown mr-1.5 text-amber-500"></i>VIP ${data.vip_customers}명
              </p>
            </div>
            <div class="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600 text-xl">
              <i class="fas fa-users"></i>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 차트 영역 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <!-- 매출 추이 (2칸 차지) -->
        <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div class="flex items-center mb-6">
            <h2 class="text-lg font-bold text-slate-800 flex items-center">
              <i class="fas fa-chart-line text-indigo-500 mr-2"></i>최근 7일 매출 추이
            </h2>
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
        <!-- 베스트셀러 -->
        <div class="bg-white rounded-xl shadow-lg p-6">
          <div class="flex items-center mb-4">
            <div class="bg-indigo-100 rounded-lg p-2 mr-3">
              <i class="fas fa-trophy text-indigo-600"></i>
            </div>
            <h2 class="text-xl font-bold text-gray-800">베스트셀러 TOP 5</h2>
          </div>
          <div class="space-y-3">
            ${bestsellers.map((item, index) => `
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:shadow-md transition">
                <div class="flex items-center">
                  <div class="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold mr-3">
                    ${index + 1}
                  </div>
                  <div>
                    <p class="font-semibold text-gray-800 text-sm">${item.name}</p>
                    <p class="text-xs text-gray-500">${item.category}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="font-bold text-blue-600 text-sm">${item.total_sold}개</p>
                  <p class="text-xs text-gray-500">${formatCurrency(item.total_revenue)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- VIP 고객 -->
        <div class="bg-white rounded-xl shadow-lg p-6">
          <div class="flex items-center mb-4">
            <div class="bg-yellow-100 rounded-lg p-2 mr-3">
              <i class="fas fa-crown text-yellow-600"></i>
            </div>
            <h2 class="text-xl font-bold text-gray-800">우수 고객 TOP 5</h2>
          </div>
          <div class="space-y-3">
            ${vipCustomers.map((c, index) => `
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:shadow-md transition">
                <div class="flex items-center">
                  <div class="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 mr-3">
                    <i class="fas fa-user"></i>
                  </div>
                  <div>
                    <p class="font-semibold text-gray-800 text-sm">${c.name}</p>
                    <p class="text-xs text-gray-500">${c.grade}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="font-bold text-gray-800 text-sm">${formatCurrency(c.total_purchase_amount)}</p>
                  <p class="text-xs text-gray-500">${c.purchase_count}회 구매</p>
                </div>
              </div>
            `).join('')}
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
                    <p class="text-xs text-gray-500">${item.sku}</p>
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
    renderCharts(chartData, categoryStats);

  } catch (error) {
    console.error('대시보드 로드 실패:', error);
    showError(content, '대시보드를 불러오는데 실패했습니다.');
  }
}

function renderCharts(salesData, categoryData) {
  // 매출 추이 차트 (Line)
  const salesCtx = document.getElementById('salesChart').getContext('2d');
  new Chart(salesCtx, {
    type: 'line',
    data: {
      labels: salesData.map(d => d.date),
      datasets: [{
        label: '일별 매출',
        data: salesData.map(d => d.revenue),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#3b82f6',
        pointRadius: 4
      }]
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
        <button onclick="showProductModal()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          <i class="fas fa-plus mr-2"></i>상품 등록
        </button>
      </div>
      
      <!-- 검색 및 필터 -->
      <div class="bg-white rounded-lg shadow p-4 mb-6">

      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">상품명</th>
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
                    <div class="text-sm font-medium text-slate-900">${p.name}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-slate-500 font-mono">${p.sku}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-600">
                      ${p.category}
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
                    <button onclick="deleteProduct(${p.id})" class="text-red-500 hover:text-red-700 transition-colors">
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
        <button onclick="showCustomerModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center">
          <i class="fas fa-plus mr-2"></i>고객 등록
        </button>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto">
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
                    <button onclick="deleteCustomer(${c.id})" class="text-red-500 hover:text-red-700 transition-colors">
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

      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto">
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
          <div class="flex gap-2">
            <select class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" onchange="filterOrders(this.value)">
              <option value="all">전체 주문</option>
              <option value="completed">결제 완료</option>
              <option value="pending_shipment">배송 준비중</option>
              <option value="shipped">배송중</option>
              <option value="delivered">배송 완료</option>
            </select>
          </div>
        </div>
        <div class="overflow-auto flex-1">
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
}

// --- 상품 관리 모달 ---

function injectProductModal() {
  if (document.getElementById('productModal')) return;

  const modalHtml = `
    <div id="productModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm hidden flex items-center justify-center z-50 transition-all duration-300">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 transform transition-all max-h-[90vh] overflow-y-auto border border-slate-100">
        <div class="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur z-10">
          <h3 id="productModalTitle" class="text-xl font-bold text-slate-800">상품 등록</h3>
          <button onclick="closeProductModal()" class="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <form id="productForm" onsubmit="submitProduct(event)">
          <div class="p-6 space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">SKU (상품코드)</label>
                <input type="text" id="prodSku" required class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">상품명</label>
                <input type="text" id="prodName" required class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">카테고리 (대분류)</label>
                <input type="text" id="prodCategory" required list="categoryList" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow placeholder-slate-400" placeholder="예: 전자제품">
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
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">공급사</label>
                <input type="text" id="prodSupplier" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
              </div>
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
            
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">상세 설명</label>
              <textarea id="prodDesc" rows="3" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow placeholder-slate-400 resize-none"></textarea>
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

function showProductModal() {
  injectProductModal(); // Ensure modal exists

  const modal = document.getElementById('productModal');
  const title = document.getElementById('productModalTitle');
  const form = document.getElementById('productForm');

  form.reset();
  window.editingProductId = null;

  title.textContent = '상품 등록';
  document.getElementById('prodSku').readOnly = false;
  document.getElementById('prodStock').readOnly = false;
  document.getElementById('prodStock').classList.remove('bg-gray-100');

  // 카테고리 데이터리스트 채우기
  fillCategoryDatalist();

  modal.classList.remove('hidden');
}

async function editProduct(id) {
  injectProductModal();

  try {
    const response = await axios.get(`${API_BASE}/products/${id}`);
    const product = response.data.data;

    window.editingProductId = id;

    document.getElementById('productModalTitle').textContent = '상품 수정';
    document.getElementById('prodSku').value = product.sku;
    document.getElementById('prodSku').readOnly = true; // SKU 수정 불가
    document.getElementById('prodName').value = product.name;
    document.getElementById('prodCategory').value = product.category;
    document.getElementById('prodCategoryMedium').value = product.category_medium || '';
    document.getElementById('prodCategorySmall').value = product.category_small || '';
    document.getElementById('prodSupplier').value = product.supplier || '';
    document.getElementById('prodPurchasePrice').value = product.purchase_price;
    document.getElementById('prodSellingPrice').value = product.selling_price;
    document.getElementById('prodStock').value = product.current_stock;
    document.getElementById('prodStock').readOnly = true; // 재고는 수정 불가 (조정 기능 이용)
    document.getElementById('prodStock').classList.add('bg-gray-100');
    document.getElementById('prodMinStock').value = product.min_stock_alert;
    document.getElementById('prodDesc').value = product.description || '';

    fillCategoryDatalist();

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
                  <select id="custGrade" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-white">
                    <option value="일반">일반</option>
                    <option value="VIP">VIP</option>
                    <option value="VVIP">VVIP</option>
                  </select>
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

function showCustomerModal() {
  injectCustomerModal();

  const modal = document.getElementById('customerModal');
  const title = document.getElementById('customerModalTitle');
  const form = document.getElementById('customerForm');

  form.reset();
  window.editingCustomerId = null;
  title.textContent = '고객 등록';

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
    document.getElementById('custGrade').value = customer.grade;
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

  const payload = {
    name: document.getElementById('custName').value,
    phone: document.getElementById('custPhone').value,
    email: document.getElementById('custEmail').value,
    grade: document.getElementById('custGrade').value,
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

function deleteCustomer(id) {
  if (confirm('정말 삭제하시겠습니까?')) {
    axios.delete(`${API_BASE}/customers/${id}`)
      .then(() => {
        showSuccess('삭제되었습니다.');
        loadPage('customers');
      })
      .catch(err => alert('삭제 실패: ' + err.message));
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
        <span class="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">${p.category}</span>
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
  if (!confirm('정말 이 판매 내역을 취소하시겠습니까?\n재고가 다시 복구됩니다.')) return;

  try {
    await axios.put(`${API_BASE}/sales/${saleId}/cancel`);
    showSuccess('판매가 취소되었습니다.');
    switchSalesTab('pos'); // 목록 갱신
  } catch (error) {
    console.error('판매 취소 실패:', error);
    alert('판매 취소 실패: ' + (error.response?.data?.error || error.message));
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
