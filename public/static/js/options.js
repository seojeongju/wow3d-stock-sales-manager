
/**
 * 옵션 관리 페이지 로직
 */

async function renderProductOptionsPage(content) {
  content.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800">
        <i class="fas fa-tags mr-2 text-teal-500"></i>옵션 관리
      </h1>
      <button onclick="openOptionGroupEditModal()" class="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg shadow-md transition-all flex items-center gap-2">
        <i class="fas fa-plus"></i>새 옵션 그룹 등록
      </button>
    </div>

    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div id="optionsListContainer" class="p-6">
        <div class="flex items-center justify-center py-20">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      </div>
    </div>

    <!-- 옵션 그룹 편집 모달 -->
    <div id="optionGroupModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm hidden flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-slate-100">
        <div class="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
          <h3 id="optionGroupModalTitle" class="text-xl font-bold text-slate-800">옵션 그룹 설정</h3>
          <button onclick="closeOptionGroupModal()" class="text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <form id="optionGroupForm" onsubmit="saveOptionGroup(event)" class="p-6 space-y-6">
          <input type="hidden" id="optGroupId">
          
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">그룹명</label>
            <input type="text" id="optGroupName" required placeholder="예: 색상, 사이즈, 소재" 
              class="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow">
          </div>

          <div>
            <div class="flex justify-between items-center mb-3">
              <label class="text-sm font-semibold text-slate-700">옵션 값 목록</label>
              <button type="button" onclick="addOptionValueRow()" class="text-xs text-teal-600 font-bold hover:underline">
                <i class="fas fa-plus mr-1"></i>값 추가
              </button>
            </div>
            
            <div id="optionValuesContainer" class="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              <!-- 옵션 값 입력 필드들이 여기에 추가됨 -->
            </div>
            
            <div id="noOptionValueMsg" class="hidden text-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
              <p class="text-sm text-slate-400">등록된 옵션 값이 없습니다. 추가해 보세요.</p>
            </div>
          </div>

          <div class="pt-4 flex justify-end gap-3">
            <button type="button" onclick="closeOptionGroupModal()" 
              class="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              취소
            </button>
            <button type="submit" 
              class="px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 shadow-lg shadow-teal-100 transition-all">
              저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  await loadOptionGroups();
}

async function loadOptionGroups() {
  const container = document.getElementById('optionsListContainer');
  try {
    const res = await axios.get(`${API_BASE}/product-options/groups`);
    const groups = res.data.data;
    renderOptionGroupsList(groups);
  } catch (err) {
    console.error(err);
    container.innerHTML = `
      <div class="text-center py-10">
        <i class="fas fa-exclamation-circle text-red-400 text-3xl mb-3"></i>
        <p class="text-slate-600">데이터를 불러오는데 실패했습니다.</p>
      </div>
    `;
  }
}

function renderOptionGroupsList(groups) {
  const container = document.getElementById('optionsListContainer');

  if (!groups || groups.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-20 text-slate-400">
        <i class="fas fa-tags text-5xl mb-4 opacity-20"></i>
        <p class="text-lg">등록된 옵션 그룹이 없습니다.</p>
        <p class="text-sm mb-6">자주 사용하는 옵션(사이즈, 색상 등)을 미리 등록해 보세요.</p>
        <button onclick="openOptionGroupEditModal()" class="text-teal-600 font-bold border border-teal-600 px-4 py-2 rounded-lg hover:bg-teal-50 transition-colors">
          첫 옵션 그룹 만들기
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${groups.map(group => `
        <div class="group border border-slate-100 rounded-2xl p-6 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-500/5 transition-all duration-300 bg-white relative overflow-hidden">
          <div class="absolute top-0 right-0 p-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onclick="openOptionGroupEditModal(${JSON.stringify(group).replace(/"/g, '&quot;')})" class="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-slate-400 hover:text-teal-600 transition-colors border border-slate-100">
              <i class="fas fa-edit text-xs"></i>
            </button>
            <button onclick="deleteOptionGroup(${group.id})" class="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors border border-slate-100">
              <i class="fas fa-trash-alt text-xs"></i>
            </button>
          </div>
          
          <div class="mb-4">
            <h4 class="text-lg font-bold text-slate-800 mb-1">${group.name}</h4>
            <p class="text-xs text-slate-400">항목 ${group.values.length}개</p>
          </div>
          
          <div class="flex flex-wrap gap-2">
            ${group.values.slice(0, 8).map(v => `
              <span class="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-100">
                ${v.value}
                ${v.additional_price ? `<span class="ml-1 text-teal-500">(+${formatCurrency(v.additional_price)})</span>` : ''}
              </span>
            `).join('')}
            ${group.values.length > 8 ? `<span class="text-[10px] text-slate-400 flex items-center ml-1">외 ${group.values.length - 8}개...</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function openOptionGroupEditModal(group = null) {
  const modal = document.getElementById('optionGroupModal');
  const title = document.getElementById('optionGroupModalTitle');
  const form = document.getElementById('optionGroupForm');
  const valuesContainer = document.getElementById('optionValuesContainer');

  form.reset();
  valuesContainer.innerHTML = '';

  if (group) {
    title.textContent = '옵션 그룹 수정';
    document.getElementById('optGroupId').value = group.id;
    document.getElementById('optGroupName').value = group.name;

    if (group.values && group.values.length > 0) {
      group.values.forEach(v => addOptionValueRow(v));
    } else {
      addOptionValueRow();
    }
  } else {
    title.textContent = '새 옵션 그룹 등록';
    document.getElementById('optGroupId').value = '';
    addOptionValueRow();
  }

  modal.classList.remove('hidden');
}

function closeOptionGroupModal() {
  const modal = document.getElementById('optionGroupModal');
  modal.classList.add('hidden');
}

function addOptionValueRow(data = null) {
  const container = document.getElementById('optionValuesContainer');
  const noMsg = document.getElementById('noOptionValueMsg');

  noMsg.classList.add('hidden');

  const div = document.createElement('div');
  div.className = 'opt-val-row flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200';
  div.dataset.id = data ? data.id : '';

  div.innerHTML = `
    <div class="flex-1">
      <input type="text" placeholder="값 (예: Red, Large)" class="opt-val-name w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" value="${data ? data.value : ''}" required>
    </div>
    <div class="w-32 relative">
      <span class="absolute left-2 top-2 text-[10px] text-slate-400">₩</span>
      <input type="number" placeholder="추가금" class="opt-val-price w-full border border-slate-200 rounded-lg pl-5 pr-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" value="${data ? data.additional_price || 0 : 0}">
    </div>
    <button type="button" onclick="this.parentElement.remove(); checkEmptyOptionValues();" class="text-slate-300 hover:text-red-500 transition-colors border border-slate-200 rounded-lg w-9 h-9 flex items-center justify-center">
      <i class="fas fa-trash-alt text-xs"></i>
    </button>
  `;

  container.appendChild(div);
}

function checkEmptyOptionValues() {
  const container = document.getElementById('optionValuesContainer');
  const noMsg = document.getElementById('noOptionValueMsg');
  if (container.children.length === 0) {
    noMsg.classList.remove('hidden');
  }
}

async function saveOptionGroup(e) {
  e.preventDefault();

  const id = document.getElementById('optGroupId').value;
  const name = document.getElementById('optGroupName').value;

  const rows = document.querySelectorAll('.opt-val-row');
  const values = [];

  rows.forEach(row => {
    const nameInput = row.querySelector('.opt-val-name');
    const priceInput = row.querySelector('.opt-val-price');
    const valId = row.dataset.id;

    if (nameInput.value.trim()) {
      values.push({
        id: valId ? parseInt(valId) : null,
        value: nameInput.value.trim(),
        additional_price: parseFloat(priceInput.value) || 0
      });
    }
  });

  if (values.length === 0) {
    showToast('최소 한 개의 옵션 값을 입력해 주세요.', 'warning');
    return;
  }

  try {
    const payload = { name, values };
    if (id) {
      await axios.put(`${API_BASE}/product-options/groups/${id}`, payload);
      showToast('옵션 그룹이 수정되었습니다.');
    } else {
      await axios.post(`${API_BASE}/product-options/groups`, payload);
      showToast('옵션 그룹이 등록되었습니다.');
    }

    closeOptionGroupModal();
    loadOptionGroups();
  } catch (err) {
    console.error(err);
    alert('저장 실패: ' + (err.response?.data?.error || err.message));
  }
}

async function deleteOptionGroup(id) {
  if (!confirm('이 옵션 그룹을 삭제하시겠습니까?\n이미 이 옵션을 사용 중인 상품에 영향을 줄 수 있습니다.')) return;

  try {
    await axios.delete(`${API_BASE}/product-options/groups/${id}`);
    showToast('삭제되었습니다.');
    loadOptionGroups();
  } catch (err) {
    console.error(err);
    alert('삭제 실패: ' + (err.response?.data?.error || err.message));
  }
}

// Global Exports
window.renderProductOptionsPage = renderProductOptionsPage;
window.openOptionGroupEditModal = openOptionGroupEditModal;
window.closeOptionGroupModal = closeOptionGroupModal;
window.addOptionValueRow = addOptionValueRow;
window.saveOptionGroup = saveOptionGroup;
window.deleteOptionGroup = deleteOptionGroup;
window.checkEmptyOptionValues = checkEmptyOptionValues;
