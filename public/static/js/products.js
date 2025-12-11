
// 상품 관리 관련 변수
let productsCurrentPage = 1;
const productsPerPage = 10;
let productListCache = []; // 상품 목록 캐시 (필요시 사용)

// 상품 관리 페이지 로드
async function loadProducts(content) {
    productsCurrentPage = productsCurrentPage || 1; // 현재 페이지 유지 또는 초기화
    try {
        const response = await axios.get(`${API_BASE}/products`, {
            params: {
                limit: productsPerPage,
                offset: (productsCurrentPage - 1) * productsPerPage
            }
        });
        const products = response.data.data;
        const pagination = response.data.pagination;

        content.innerHTML = `
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-gray-800">
          <i class="fas fa-box mr-2"></i>상품 관리
        </h1>
      </div>
      
      <!-- 필터 및 검색 -->
      <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6">
        <div class="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div class="flex flex-1 gap-4 w-full md:w-auto">
            <div class="relative flex-1 md:max-w-xs">
              <i class="fas fa-search absolute left-3 top-3 text-slate-400"></i>
              <input type="text" id="prodSearch" placeholder="상품명 또는 SKU 검색" class="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" onkeyup="if(event.key === 'Enter') filterProductsList()">
            </div>
            <select id="prodCategoryFilter" class="border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500" onchange="filterProductsList()">
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
            <button onclick="downloadProducts()" class="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center">
              <i class="fas fa-file-export mr-2"></i>내보내기
            </button>
            <button onclick="showProductModal()" class="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center">
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
                    <button onclick="editProduct(${p.id})" class="text-teal-600 hover:text-teal-900 mr-3 transition-colors">
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
      
      <!-- 페이지네이션 -->
      <div id="productPaginationContainer" class="mt-4 shrink-0 pb-6"></div>
    `;

        // 카테고리 목록 로드
        loadCategories();

        // 모달 주입
        injectProductModal();

        // 페이지네이션 렌더링
        if (pagination) {
            renderProductsPagination(pagination);
        }

    } catch (error) {
        console.error('상품 목록 로드 실패:', error);
        content.innerHTML = `<div class="p-4 text-red-600">상품 목록을 불러오는데 실패했습니다: ${error.message}</div>`;
    }
}

function toggleProductFilters() {
    const filters = document.getElementById('productDetailFilters');
    filters.classList.toggle('hidden');
}

function renderProductsPagination(pagination) {
    const container = document.getElementById('productPaginationContainer');
    if (!container || !pagination) return;

    const totalPages = Math.ceil(pagination.total / productsPerPage);

    if (totalPages <= 0) {
        container.innerHTML = '';
        return;
    }

    const maxButtons = 5;
    let startPage = Math.max(1, productsCurrentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    let buttons = '';

    // 이전 버튼
    buttons += `
    <button 
      onclick="changeProductsPage(${productsCurrentPage - 1})" 
      ${productsCurrentPage === 1 ? 'disabled' : ''}
      class="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <i class="fas fa-chevron-left"></i>
    </button>
  `;

    // 첫 페이지
    if (startPage > 1) {
        buttons += `
      <button 
        onclick="changeProductsPage(1)" 
        class="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
      >
        1
      </button>
    `;
        if (startPage > 2) {
            buttons += '<span class="px-2 py-2 text-slate-500">...</span>';
        }
    }

    // 페이지 번호들
    for (let i = startPage; i <= endPage; i++) {
        buttons += `
      <button 
        onclick="changeProductsPage(${i})" 
        class="px-4 py-2 rounded-lg border transition-colors ${i === productsCurrentPage
                ? 'bg-teal-600 text-white border-teal-600'
                : 'border-slate-300 hover:bg-slate-50'
            }"
      >
        ${i}
      </button>
    `;
    }

    // 마지막 페이지
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            buttons += '<span class="px-2 py-2 text-slate-500">...</span>';
        }
        buttons += `
      <button 
        onclick="changeProductsPage(${totalPages})" 
        class="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
      >
        ${totalPages}
      </button>
    `;
    }

    // 다음 버튼
    buttons += `
    <button 
      onclick="changeProductsPage(${productsCurrentPage + 1})" 
      ${productsCurrentPage === totalPages ? 'disabled' : ''}
      class="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <i class="fas fa-chevron-right"></i>
    </button>
  `;

    container.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
      <div class="flex items-center justify-between">
        <div class="text-sm text-slate-600">
          전체 <span class="font-bold text-teal-600">${pagination.total}</span>개 
          (${productsCurrentPage} / ${totalPages} 페이지)
        </div>
        <div class="flex gap-2">
          ${buttons}
        </div>
      </div>
    </div>
  `;
}

async function changeProductsPage(page) {
    productsCurrentPage = page;
    const content = document.getElementById('content');
    await loadProducts(content);
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
        // 페이지네이션 리셋
        productsCurrentPage = 1;
        params.limit = productsPerPage;
        params.offset = 0;

        const response = await axios.get(`${API_BASE}/products`, { params });
        const products = response.data.data;
        const pagination = response.data.pagination;

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
          ${products.length > 0 ? products.map(p => `
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
                <button onclick="editProduct(${p.id})" class="text-teal-600 hover:text-teal-900 mr-3 transition-colors">
                  <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteProductAction(${p.id})" class="text-red-500 hover:text-red-700 transition-colors">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          `).join('') :
                '<tr><td colspan="6" class="px-6 py-10 text-center text-slate-500">검색 결과가 없습니다.</td></tr>'}
        </tbody>
      </table>
    `;

        if (pagination) {
            renderProductsPagination(pagination);
        }

    } catch (e) {
        console.error(e);
        showToast('검색 실패', 'error');
    }
}

// 카테고리 로드
async function loadCategories() {
    try {
        const response = await axios.get(`${API_BASE}/products/meta/categories`);
        const categories = response.data.data;
        const select = document.getElementById('prodCategoryFilter');
        if (!select) return;

        // 기존 옵션 유지 (첫번째 '전체 카테고리')
        select.innerHTML = '<option value="">전체 카테고리</option>';

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

// 엑셀 다운로드
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

        // downloadCSV는 utils.js에 추가하거나 여기에 포함해야 함.
        // 현재 utils.js엔 없음. products.js 내부에 둠.
        downloadCSV(products, `상품목록_${new Date().toISOString().slice(0, 10)}.csv`, headers);
    } catch (error) {
        console.error('상품 데이터 다운로드 실패:', error);
        alert('데이터를 불러오는데 실패했습니다.');
    }
}

// CSV 다운로드 유틸리티 (내부용)
function downloadCSV(data, filename, headers) {
    if (!data || data.length === 0) {
        alert('다운로드할 데이터가 없습니다.');
        return;
    }

    let csvContent = "\uFEFF"; // BOM for Excel

    if (headers) {
        csvContent += Object.values(headers).join(',') + '\n';
    } else {
        csvContent += Object.keys(data[0]).join(',') + '\n';
    }

    data.forEach(row => {
        let rowContent = [];
        if (headers) {
            Object.keys(headers).forEach(key => {
                let cell = row[key] === null || row[key] === undefined ? '' : row[key].toString();
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

// --- 모달 및 상품 CRUD ---

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
          <button type="button" onclick="switchProductTab('basic')" id="tab-basic" class="px-4 py-3 text-sm font-medium text-teal-600 border-b-2 border-teal-600 transition-colors">기본 정보</button>
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
                        <input type="radio" name="skuType" value="auto" checked onchange="toggleSkuInput(this.value)" class="form-radio text-teal-600 focus:ring-teal-500">
                        <span class="ml-2 text-sm text-slate-700">자동 생성</span>
                      </label>
                      <label class="inline-flex items-center cursor-pointer">
                        <input type="radio" name="skuType" value="manual" onchange="toggleSkuInput(this.value)" class="form-radio text-teal-600 focus:ring-teal-500">
                        <span class="ml-2 text-sm text-slate-700">수동 입력</span>
                      </label>
                    </div>
                    <div class="flex gap-2">
                      <input type="text" id="prodSku" required readonly class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400 bg-slate-50 text-slate-500">
                      <button type="button" id="btnGenerateSku" onclick="generateAutoSku()" class="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
                        <i class="fas fa-sync-alt mr-1"></i>생성
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">상품명</label>
                  <input type="text" id="prodName" required class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">카테고리 (대분류)</label>
                  <input type="text" id="prodCategory" list="categoryList" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400" placeholder="예: 전자제품">
                  <datalist id="categoryList"></datalist>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">카테고리 (중분류)</label>
                  <input type="text" id="prodCategoryMedium" list="categoryMediumList" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400" placeholder="예: 컴퓨터">
                  <datalist id="categoryMediumList"></datalist>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">카테고리 (소분류)</label>
                  <input type="text" id="prodCategorySmall" list="categorySmallList" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400" placeholder="예: 노트북">
                  <datalist id="categorySmallList"></datalist>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">매입가</label>
                  <div class="relative">
                    <span class="absolute left-4 top-2.5 text-slate-500">₩</span>
                    <input type="number" id="prodPurchasePrice" required min="0" class="w-full border border-slate-300 rounded-lg pl-8 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">판매가</label>
                  <div class="relative">
                    <span class="absolute left-4 top-2.5 text-slate-500">₩</span>
                    <input type="number" id="prodSellingPrice" required min="0" class="w-full border border-slate-300 rounded-lg pl-8 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">현재 재고</label>
                  <input type="number" id="prodStock" required min="0" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
                  <p class="text-xs text-slate-500 mt-1.5 flex items-center"><i class="fas fa-info-circle mr-1"></i>수정 시에는 재고 조정 기능을 이용하세요.</p>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">최소 재고 알림</label>
                  <input type="number" id="prodMinStock" required min="0" value="10" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
                </div>
              </div>
            </div>

            <!-- 상세 정보 탭 -->
            <div id="content-detail" class="space-y-6 hidden">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">브랜드</label>
                  <input type="text" id="prodBrand" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-2">공급사</label>
                  <input type="text" id="prodSupplier" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400">
                </div>
              </div>

              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">태그 (쉼표로 구분)</label>
                <input type="text" id="prodTags" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400" placeholder="예: 신상품, 베스트, 여름특가">
              </div>

              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">상태</label>
                <select id="prodStatus" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow bg-white">
                  <option value="sale">판매중</option>
                  <option value="out_of_stock">품절</option>
                  <option value="discontinued">단종</option>
                  <option value="hidden">숨김</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">상세 설명</label>
                <textarea id="prodDesc" rows="5" class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-indigo-500 transition-shadow placeholder-slate-400 resize-none"></textarea>
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
                      <i class="fas fa-cloud-upload-alt text-4xl text-slate-400 mb-3 group-hover:text-teal-500 transition-colors"></i>
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
            <button type="submit" class="px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2">
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
    injectProductModal();

    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');

    form.reset();
    window.editingProductId = null;

    title.textContent = '상품 등록';

    // SKU 초기화 (자동 생성 모드)
    const skuRadio = document.querySelector('input[name="skuType"][value="auto"]');
    if (skuRadio) skuRadio.checked = true;

    toggleSkuInput('auto');

    // 탭 초기화
    switchProductTab('basic');

    // 이미지 미리보기 초기화
    removeImage();

    modal.classList.remove('hidden');
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) modal.classList.add('hidden');
}

async function editProduct(id) {
    injectProductModal();

    try {
        const response = await axios.get(`${API_BASE}/products/${id}`);
        const product = response.data.data;

        window.editingProductId = id;

        document.getElementById('productModalTitle').textContent = '상품 수정';

        // 수정 시에는 SKU 변경 불가 (UI 처리)
        const prodSku = document.getElementById('prodSku');
        prodSku.value = product.sku;
        prodSku.readOnly = true;
        prodSku.classList.add('bg-slate-50', 'text-slate-500');

        // 라디오 버튼 및 생성 버튼 숨김/비활성화
        document.querySelectorAll('input[name="skuType"]').forEach(el => el.disabled = true);
        const btnGen = document.getElementById('btnGenerateSku');
        if (btnGen) btnGen.classList.add('hidden');

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

        const prodStock = document.getElementById('prodStock');
        prodStock.value = product.current_stock;
        prodStock.readOnly = true; // 재고는 수정 불가 (조정 기능 이용)
        prodStock.classList.add('bg-gray-100');

        document.getElementById('prodMinStock').value = product.min_stock_alert;
        document.getElementById('prodDesc').value = product.description || '';
        document.getElementById('prodImageUrl').value = product.image_url || '';
        updateImagePreview(product.image_url);

        fillCategoryDatalist();
        switchProductTab('basic');

        document.getElementById('productModal').classList.remove('hidden');
    } catch (error) {
        console.error('상품 정보 로드 실패:', error);
        showToast('상품 정보를 불러오는데 실패했습니다.', 'error');
    }
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
            showToast('상품이 수정되었습니다.');
        } else {
            // 등록
            await axios.post(`${API_BASE}/products`, payload);
            showToast('상품이 등록되었습니다.');
        }

        closeProductModal();
        // 현재 페이지가 products라면 리로드, 아니면 놔둠 (하지만 보통 products 페이지에서 모달을 띄움)
        if (typeof loadProducts === 'function') {
            const content = document.getElementById('content');
            loadProducts(content);
        }
    } catch (error) {
        console.error('상품 저장 실패:', error);
        const msg = error.response?.data?.error || '저장 중 오류가 발생했습니다.';
        alert(msg);
    }
}

async function deleteProductAction(id) {
    if (!confirm('정말 이 상품을 삭제하시겠습니까?')) return;

    try {
        await axios.delete(`${API_BASE}/products/${id}`);
        showToast('상품이 삭제되었습니다.');
        const content = document.getElementById('content');
        loadProducts(content);
    } catch (error) {
        console.error('상품 삭제 실패:', error);
        alert('상품 삭제 실패: ' + (error.response?.data?.error || error.message));
    }
}

function switchProductTab(tab) {
    ['basic', 'detail', 'media'].forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        const content = document.getElementById(`content-${t}`);
        if (!btn || !content) return;

        if (t === tab) {
            btn.classList.remove('text-slate-500', 'border-transparent');
            btn.classList.add('text-teal-600', 'border-b-2', 'border-teal-600');
            content.classList.remove('hidden');
        } else {
            btn.classList.add('text-slate-500');
            btn.classList.remove('text-teal-600', 'border-b-2', 'border-teal-600');
            content.classList.add('hidden');
        }
    });
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

// Global Exports
window.loadProducts = loadProducts;
window.toggleProductFilters = toggleProductFilters;
window.renderProductsPagination = renderProductsPagination;
window.changeProductsPage = changeProductsPage;
window.filterProductsList = filterProductsList;
window.downloadProducts = downloadProducts;
window.injectProductModal = injectProductModal;
window.showProductModal = showProductModal;
window.closeProductModal = closeProductModal;
window.editProduct = editProduct;
window.submitProduct = submitProduct;
window.deleteProductAction = deleteProductAction;
window.switchProductTab = switchProductTab;
window.toggleSkuInput = toggleSkuInput;
window.generateAutoSku = generateAutoSku;
window.handleImageUpload = handleImageUpload;
window.updateImagePreview = updateImagePreview;
window.removeImage = removeImage;
