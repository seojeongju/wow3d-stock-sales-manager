
// ========================================
// 재고 관리 페이지
// ========================================

async function renderStockPage() {
    const content = document.getElementById('content');
    const pageTitle = document.getElementById('page-title');
    pageTitle.textContent = '재고 관리';

    content.innerHTML = `
    <div class="max-w-7xl mx-auto">
      <!-- 탭 네비게이션 -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div class="flex border-b border-slate-200">
          <button onclick="switchStockPageTab('levels')" id="stockTabLevels" class="px-6 py-4 font-medium text-indigo-600 border-b-2 border-indigo-600 focus:outline-none transition-colors">
            재고 현황
          </button>
          <button onclick="switchStockPageTab('movements')" id="stockTabMovements" class="px-6 py-4 font-medium text-slate-500 hover:text-indigo-600 focus:outline-none transition-colors">
            입출고 내역
          </button>
          <button onclick="switchStockPageTab('warehouses')" id="stockTabWarehouses" class="px-6 py-4 font-medium text-slate-500 hover:text-indigo-600 focus:outline-none transition-colors">
            창고 관리
          </button>
        </div>
      </div>

      <!-- 재고 현황 탭 -->
      <div id="stockContentLevels">
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-bold text-slate-800">창고별 재고 현황</h3>
            <div class="flex gap-2">
              <select id="levelWarehouseFilter" onchange="loadWarehouseStockLevels()" class="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">전체 창고</option>
                <!-- 창고 목록 동적 로드 -->
              </select>
              <button onclick="loadWarehouseStockLevels()" class="p-2 text-slate-500 hover:text-indigo-600 transition-colors">
                <i class="fas fa-sync-alt"></i>
              </button>
            </div>
          </div>
          <div id="stockLevelsContainer" class="overflow-x-auto">
            <!-- 재고 테이블 로드 -->
          </div>
        </div>
      </div>

      <!-- 입출고 내역 탭 -->
      <div id="stockContentMovements" class="hidden">
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 class="text-lg font-bold text-slate-800 mb-4">입출고 내역</h3>
          <p class="text-slate-500">준비 중입니다.</p>
        </div>
      </div>

      <!-- 창고 관리 탭 -->
      <div id="stockContentWarehouses" class="hidden">
        <div id="warehousesListContainer">
          <!-- 창고 목록 로드 -->
        </div>
      </div>
    </div>

    <!-- 창고 모달 (재사용 또는 새로 정의) -->
    <div id="stockWarehouseModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-slate-800" id="stockWarehouseModalTitle">창고 등록</h3>
          <button onclick="closeStockWarehouseModal()" class="text-slate-400 hover:text-slate-600">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form onsubmit="handleStockWarehouseSubmit(event)" class="space-y-4">
          <input type="hidden" id="stockWarehouseId">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">창고명</label>
            <input type="text" id="stockWarehouseName" required class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: 제1물류창고">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">위치</label>
            <input type="text" id="stockWarehouseLocation" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="예: 서울 구로구">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">설명</label>
            <textarea id="stockWarehouseDesc" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" rows="3" placeholder="창고에 대한 설명"></textarea>
          </div>
          <div class="flex gap-2 pt-2">
            <button type="button" onclick="closeStockWarehouseModal()" class="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
              취소
            </button>
            <button type="submit" class="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

    // 초기 데이터 로드
    await loadWarehousesForFilter();
    loadWarehouseStockLevels();
}

// 탭 전환
function switchStockPageTab(tab) {
    const tabs = ['levels', 'movements', 'warehouses'];

    tabs.forEach(t => {
        const btn = document.getElementById(`stockTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
        const content = document.getElementById(`stockContent${t.charAt(0).toUpperCase() + t.slice(1)}`);

        if (t === tab) {
            btn.classList.add('text-indigo-600', 'border-indigo-600');
            btn.classList.remove('text-slate-500');
            content.classList.remove('hidden');
        } else {
            btn.classList.remove('text-indigo-600', 'border-indigo-600');
            btn.classList.add('text-slate-500');
            content.classList.add('hidden');
        }
    });

    if (tab === 'warehouses') {
        loadStockWarehouses();
    }
}

// 창고 필터 로드
async function loadWarehousesForFilter() {
    try {
        const res = await axios.get(`${API_BASE}/warehouses`);
        const warehouses = res.data.data;
        const select = document.getElementById('levelWarehouseFilter');

        // 기존 옵션 유지 (전체 창고)
        select.innerHTML = '<option value="">전체 창고</option>';

        warehouses.forEach(w => {
            const option = document.createElement('option');
            option.value = w.id;
            option.textContent = w.name;
            select.appendChild(option);
        });
    } catch (e) {
        console.error(e);
    }
}

// 창고 목록 로드 (관리 탭)
async function loadStockWarehouses() {
    const container = document.getElementById('warehousesListContainer');
    container.innerHTML = '<div class="flex justify-center py-10"><i class="fas fa-spinner fa-spin text-indigo-500 text-2xl"></i></div>';

    try {
        const res = await axios.get(`${API_BASE}/warehouses`);
        const warehouses = res.data.data;

        container.innerHTML = `
      <div class="bg-white rounded-xl shadow-sm border border-slate-200">
        <div class="p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 class="text-lg font-bold text-slate-800">창고 목록</h3>
            <p class="text-slate-500 text-sm">등록된 창고 리스트입니다.</p>
          </div>
          <button onclick="openStockWarehouseModal()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
            <i class="fas fa-plus"></i>
            창고 등록
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">창고명</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">위치</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">설명</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">상태</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              ${warehouses.map(w => `
                <tr class="hover:bg-slate-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">${w.name}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${w.location || '-'}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${w.description || '-'}</td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${w.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}">
                      ${w.is_active ? '사용중' : '비활성'}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="openStockWarehouseModal(${w.id})" class="text-indigo-600 hover:text-indigo-900 mr-3">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteStockWarehouse(${w.id})" class="text-rose-600 hover:text-rose-900">
                      <i class="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="text-center py-10 text-rose-500">데이터 로드 실패</div>';
    }
}

// 창고 모달 열기
async function openStockWarehouseModal(id = null) {
    const modal = document.getElementById('stockWarehouseModal');
    const title = document.getElementById('stockWarehouseModalTitle');
    const idInput = document.getElementById('stockWarehouseId');
    const nameInput = document.getElementById('stockWarehouseName');
    const locInput = document.getElementById('stockWarehouseLocation');
    const descInput = document.getElementById('stockWarehouseDesc');

    if (id) {
        title.textContent = '창고 수정';
        idInput.value = id;
        try {
            const res = await axios.get(`${API_BASE}/warehouses`);
            const warehouse = res.data.data.find(w => w.id === id);
            if (warehouse) {
                nameInput.value = warehouse.name;
                locInput.value = warehouse.location || '';
                descInput.value = warehouse.description || '';
            }
        } catch (e) {
            console.error(e);
        }
    } else {
        title.textContent = '창고 등록';
        idInput.value = '';
        nameInput.value = '';
        locInput.value = '';
        descInput.value = '';
    }

    modal.classList.remove('hidden');
}

// 창고 모달 닫기
function closeStockWarehouseModal() {
    document.getElementById('stockWarehouseModal').classList.add('hidden');
}

// 창고 저장
async function handleStockWarehouseSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('stockWarehouseId').value;
    const name = document.getElementById('stockWarehouseName').value;
    const location = document.getElementById('stockWarehouseLocation').value;
    const description = document.getElementById('stockWarehouseDesc').value;

    try {
        if (id) {
            await axios.put(`${API_BASE}/warehouses/${id}`, { name, location, description });
            showToast('창고가 수정되었습니다.');
        } else {
            await axios.post(`${API_BASE}/warehouses`, { name, location, description });
            showToast('창고가 등록되었습니다.');
        }
        closeStockWarehouseModal();
        loadStockWarehouses();
        loadWarehousesForFilter(); // 필터도 갱신
    } catch (err) {
        showToast(err.response?.data?.error || '저장 실패', 'error');
    }
}

// 창고 삭제
async function deleteStockWarehouse(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
        await axios.delete(`${API_BASE}/warehouses/${id}`);
        showToast('창고가 삭제되었습니다.');
        loadStockWarehouses();
        loadWarehousesForFilter();
    } catch (err) {
        showToast(err.response?.data?.error || '삭제 실패', 'error');
    }
}
