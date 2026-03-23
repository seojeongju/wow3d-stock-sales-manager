
// 입출고 내역 로드 (페이지네이션 포함)
async function loadStockMovements(page = 1) {
  const container = document.getElementById('stockMovementsList');
  const search = document.getElementById('moveSearch').value;
  const type = document.getElementById('moveType').value;
  const warehouseId = document.getElementById('moveWarehouse').value;
  const startDate = document.getElementById('moveStartDate').value;
  const endDate = document.getElementById('moveEndDate').value;

  container.innerHTML = '<div class="flex justify-center py-10"><i class="fas fa-spinner fa-spin text-indigo-500 text-2xl"></i></div>';

  try {
    const params = {
      page: page,
      limit: 10
    };
    if (search) params.productId = search;
    if (type) params.movementType = type;
    if (warehouseId) params.warehouseId = warehouseId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const res = await axios.get(`${API_BASE}/stock/movements`, { params });
    const { data: movements, pagination } = res.data;

    // 클라이언트 사이드 검색 필터링 (백엔드에서 productId로만 검색되는 경우)
    // 하지만 페이지네이션이 적용되면 클라이언트 필터링은 전체 데이터에 대해 수행할 수 없음.
    // 따라서 현재 구조에서는 백엔드 검색이 정확하지 않으면(이름 검색 불가 등) 페이지네이션과 충돌함.
    // 일단 백엔드에서 내려준 데이터를 그대로 표시. (검색 기능 개선은 추후 과제로)
    const filteredMovements = movements;

    container.innerHTML = `
      <div class="min-w-full inline-block align-middle">
        <div class="border rounded-lg overflow-hidden">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">일시</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">구분</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">상품정보</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">수량</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">창고</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">사유/비고</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">담당자</th>
                <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">관리</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 bg-white">
              ${filteredMovements.map(m => `
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    ${new Date(m.created_at).toLocaleString()}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold 
                      ${m.movement_type === '입고' ? 'bg-emerald-100 text-emerald-700' :
        m.movement_type === '출고' ? 'bg-rose-100 text-rose-700' :
          m.movement_type === '이동' ? 'bg-blue-100 text-blue-700' :
            'bg-amber-100 text-amber-700'}">
                      ${m.movement_type}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-slate-900">${m.product_name}</div>
                    <div class="text-xs text-slate-500 font-mono">${m.sku}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}">
                    ${m.quantity > 0 ? '+' : ''}${m.quantity.toLocaleString()}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    ${m.movement_type === '이동' ?
        `${m.warehouse_name || '-'} <i class="fas fa-arrow-right mx-1 text-slate-400"></i> ${m.to_warehouse_name || '-'}` :
        (m.warehouse_name || '-')
      }
                  </td>
                  <td class="px-6 py-4 text-sm text-slate-600">
                    <div class="font-medium">${m.reason}</div>
                    ${m.notes ? `<div class="text-xs text-slate-400 mt-0.5">${m.notes}</div>` : ''}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    ${m.created_by_name || '-'}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button onclick="deleteStockMovement(${m.id})" class="text-rose-400 hover:text-rose-600 transition-colors" title="내역 삭제 (재고 원복)">
                      <i class="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
              ${filteredMovements.length === 0 ? '<tr><td colspan="8" class="px-6 py-10 text-center text-slate-500">내역이 없습니다.</td></tr>' : ''}
            </tbody>
          </table>
        </div>

        <!-- 페이지네이션 -->
        <div class="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-lg shadow-sm">
          <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-slate-700">
                총 <span class="font-medium">${pagination.total}</span>개 중 <span class="font-medium">${(pagination.page - 1) * pagination.limit + 1}</span> - <span class="font-medium">${Math.min(pagination.page * pagination.limit, pagination.total)}</span>
              </p>
            </div>
            <div>
              <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button onclick="loadStockMovements(${pagination.page - 1})" ${pagination.page === 1 ? 'disabled' : ''} class="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed">
                  <span class="sr-only">Previous</span>
                  <i class="fas fa-chevron-left h-5 w-5 flex items-center justify-center"></i>
                </button>
                
                ${Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => `
                  <button onclick="loadStockMovements(${p})" class="relative inline-flex items-center px-4 py-2 text-sm font-semibold ${p === pagination.page ? 'bg-indigo-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600' : 'text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0'}">
                    ${p}
                  </button>
                `).join('')}

                <button onclick="loadStockMovements(${pagination.page + 1})" ${pagination.page === pagination.totalPages ? 'disabled' : ''} class="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed">
                  <span class="sr-only">Next</span>
                  <i class="fas fa-chevron-right h-5 w-5 flex items-center justify-center"></i>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    console.error(e);
    container.innerHTML = '<div class="text-center py-10 text-rose-500">데이터 로드 실패</div>';
  }
}
