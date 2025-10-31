// API Base URL
const API_BASE = '/api';

// 현재 페이지 상태
let currentPage = 'dashboard';

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  loadPage('dashboard');
});

// 네비게이션 설정
function setupNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = e.currentTarget.dataset.page;
      
      // 활성 상태 변경
      document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.remove('active', 'text-white');
        l.classList.add('text-blue-100');
      });
      e.currentTarget.classList.add('active', 'text-white');
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
  
  switch(page) {
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
    const response = await axios.get(`${API_BASE}/dashboard/summary`);
    const data = response.data.data;
    
    const chartResponse = await axios.get(`${API_BASE}/dashboard/sales-chart?days=7`);
    const chartData = chartResponse.data.data;
    
    const bestsellersResponse = await axios.get(`${API_BASE}/dashboard/bestsellers?limit=5`);
    const bestsellers = bestsellersResponse.data.data;
    
    const lowStockResponse = await axios.get(`${API_BASE}/dashboard/low-stock-alerts`);
    const lowStockAlerts = lowStockResponse.data.data;
    
    content.innerHTML = `
      <!-- 주요 지표 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow-lg p-6 card-hover border-l-4 border-blue-500">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-500 text-sm font-medium">오늘의 매출</p>
              <p class="text-2xl font-bold text-blue-600 mt-2">${formatCurrency(data.today_revenue)}</p>
              <p class="text-sm text-gray-600 mt-1">
                <i class="fas fa-receipt mr-1"></i>${data.today_sales_count}건
              </p>
            </div>
            <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-full p-4 shadow-lg">
              <i class="fas fa-dollar-sign text-white text-2xl"></i>
            </div>
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-lg p-6 card-hover border-l-4 border-indigo-500">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-500 text-sm font-medium">이번 달 매출</p>
              <p class="text-2xl font-bold text-indigo-600 mt-2">${formatCurrency(data.month_revenue)}</p>
              <p class="text-sm text-gray-600 mt-1">
                <i class="fas fa-receipt mr-1"></i>${data.month_sales_count}건
              </p>
            </div>
            <div class="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full p-4 shadow-lg">
              <i class="fas fa-chart-bar text-white text-2xl"></i>
            </div>
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-lg p-6 card-hover border-l-4 border-purple-500">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-500 text-sm font-medium">총 재고 가치</p>
              <p class="text-2xl font-bold text-purple-600 mt-2">${formatCurrency(data.total_stock_value)}</p>
              <p class="text-sm text-gray-600 mt-1">
                <i class="fas fa-box mr-1"></i>${data.total_products}개 상품
              </p>
            </div>
            <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-full p-4 shadow-lg">
              <i class="fas fa-warehouse text-white text-2xl"></i>
            </div>
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-lg p-6 card-hover border-l-4 border-cyan-500">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-500 text-sm font-medium">총 고객 수</p>
              <p class="text-2xl font-bold text-cyan-600 mt-2">${data.total_customers}</p>
              <p class="text-sm text-gray-600 mt-1">
                <i class="fas fa-crown mr-1 text-yellow-500"></i>VIP ${data.vip_customers}명
              </p>
            </div>
            <div class="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full p-4 shadow-lg">
              <i class="fas fa-users text-white text-2xl"></i>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 차트 및 통계 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow-lg p-6">
          <div class="flex items-center mb-4">
            <div class="bg-blue-100 rounded-lg p-2 mr-3">
              <i class="fas fa-chart-line text-blue-600"></i>
            </div>
            <h2 class="text-xl font-bold text-gray-800">최근 7일 매출 추이</h2>
          </div>
          <canvas id="salesChart"></canvas>
        </div>
        
        <div class="bg-white rounded-xl shadow-lg p-6">
          <div class="flex items-center mb-4">
            <div class="bg-indigo-100 rounded-lg p-2 mr-3">
              <i class="fas fa-trophy text-indigo-600"></i>
            </div>
            <h2 class="text-xl font-bold text-gray-800">베스트셀러 TOP 5</h2>
          </div>
          <div class="space-y-3">
            ${bestsellers.map((item, index) => `
              <div class="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg hover:shadow-md transition">
                <div class="flex items-center">
                  <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold mr-3">
                    ${index + 1}
                  </div>
                  <div>
                    <p class="font-semibold text-gray-800">${item.name}</p>
                    <p class="text-xs text-gray-600">
                      <i class="fas fa-tag mr-1"></i>${item.category}
                    </p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="font-bold text-blue-600">${item.total_sold}개</p>
                  <p class="text-sm text-gray-600">${formatCurrency(item.total_revenue)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      
      <!-- 재고 부족 경고 -->
      ${lowStockAlerts.length > 0 ? `
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
          <h2 class="text-xl font-bold text-red-800 mb-4">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            재고 부족 경고 (${lowStockAlerts.length}개)
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${lowStockAlerts.map(item => `
              <div class="bg-white rounded p-4">
                <p class="font-semibold">${item.name}</p>
                <p class="text-sm text-gray-600">${item.sku}</p>
                <p class="text-red-600 font-bold mt-2">
                  현재 재고: ${item.current_stock} (최소: ${item.min_stock_alert})
                </p>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
    
    // 매출 차트 그리기
    const ctx = document.getElementById('salesChart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.map(d => d.date),
        datasets: [{
          label: '매출액',
          data: chartData.map(d => d.revenue),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return formatCurrency(value);
              }
            }
          }
        }
      }
    });
    
  } catch (error) {
    console.error('대시보드 로드 실패:', error);
    showError(content, '대시보드를 불러오는데 실패했습니다.');
  }
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
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="text" id="searchProduct" placeholder="상품명 또는 SKU 검색" 
                 class="border rounded px-4 py-2" onkeyup="filterProducts()">
          <select id="filterCategory" class="border rounded px-4 py-2" onchange="filterProducts()">
            <option value="">전체 카테고리</option>
          </select>
          <label class="flex items-center">
            <input type="checkbox" id="filterLowStock" onchange="filterProducts()" class="mr-2">
            재고 부족 상품만 보기
          </label>
        </div>
      </div>
      
      <!-- 상품 목록 -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상품명</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">카테고리</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">판매가</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">재고</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
            </tr>
          </thead>
          <tbody id="productTableBody" class="divide-y divide-gray-200">
            ${products.map(p => `
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm">${p.sku}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="font-medium text-gray-900">${p.name}</div>
                  <div class="text-sm text-gray-500">${p.supplier || '-'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">${p.category}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold">${formatCurrency(p.selling_price)}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                               ${p.current_stock <= p.min_stock_alert ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                    ${p.current_stock}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <button onclick="editProduct(${p.id})" class="text-blue-600 hover:text-blue-900 mr-3">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button onclick="deleteProduct(${p.id})" class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    // 카테고리 목록 로드
    loadCategories();
    
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
        <h1 class="text-3xl font-bold text-gray-800">
          <i class="fas fa-users mr-2"></i>고객 관리
        </h1>
        <button onclick="showCustomerModal()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          <i class="fas fa-plus mr-2"></i>고객 등록
        </button>
      </div>
      
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">연락처</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">등급</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">총 구매액</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">구매 횟수</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            ${customers.map(c => `
              <tr>
                <td class="px-6 py-4 whitespace-nowrap font-medium">${c.name}</td>
                <td class="px-6 py-4 whitespace-nowrap">${c.phone}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 py-1 text-xs rounded-full ${c.grade === 'VIP' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}">
                    ${c.grade}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap font-semibold">${formatCurrency(c.total_purchase_amount)}</td>
                <td class="px-6 py-4 whitespace-nowrap">${c.purchase_count}회</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <button onclick="editCustomer(${c.id})" class="text-blue-600 hover:text-blue-900 mr-3">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button onclick="deleteCustomer(${c.id})" class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error('고객 목록 로드 실패:', error);
    showError(content, '고객 목록을 불러오는데 실패했습니다.');
  }
}

// 재고 관리 로드 (간단 버전)
async function loadStock(content) {
  content.innerHTML = `
    <h1 class="text-3xl font-bold text-gray-800 mb-6">
      <i class="fas fa-warehouse mr-2"></i>재고 관리
    </h1>
    <div class="bg-white rounded-lg shadow p-8 text-center">
      <p class="text-gray-600">재고 관리 기능이 곧 제공됩니다.</p>
    </div>
  `;
}

// 판매 관리 로드 (간단 버전)
async function loadSales(content) {
  content.innerHTML = `
    <h1 class="text-3xl font-bold text-gray-800 mb-6">
      <i class="fas fa-shopping-cart mr-2"></i>판매 관리
    </h1>
    <div class="bg-white rounded-lg shadow p-8 text-center">
      <p class="text-gray-600">판매 관리 기능이 곧 제공됩니다.</p>
    </div>
  `;
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

// 모달 함수들 (추후 구현)
function showProductModal() {
  alert('상품 등록 모달이 곧 구현됩니다.');
}

function editProduct(id) {
  alert(`상품 수정: ${id}`);
}

function deleteProduct(id) {
  if (confirm('정말 삭제하시겠습니까?')) {
    axios.delete(`${API_BASE}/products/${id}`)
      .then(() => {
        showSuccess('삭제되었습니다.');
        loadPage('products');
      })
      .catch(err => alert('삭제 실패: ' + err.message));
  }
}

function showCustomerModal() {
  alert('고객 등록 모달이 곧 구현됩니다.');
}

function editCustomer(id) {
  alert(`고객 수정: ${id}`);
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
