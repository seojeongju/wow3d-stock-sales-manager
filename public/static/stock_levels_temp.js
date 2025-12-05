
// 창고별 재고 현황 로드 (페이지네이션 포함)
async function loadWarehouseStockLevels(page = 1) {
    const container = document.getElementById('stockLevelsContainer');
    const warehouseId = document.getElementById('levelWarehouseFilter')?.value || '';

    container.innerHTML = '<div class="flex justify-center py-10"><i class="fas fa-spinner fa-spin text-indigo-500 text-2xl"></i></div>';

    try {
        const params = {
            page: page,
            limit: 10,
            warehouseId: warehouseId
        };

        const res = await axios.get(`${API_BASE}/warehouse-stocks`, { params });
        const { data: stocks, pagination } = res.data;

        container.innerHTML = `
      <div class="min-w-full inline-block align-middle">
        <div class="border rounded-lg overflow-hidden">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">창고명</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">상품명</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">SKU</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">카테고리</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">재고수량</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">최근 업데이트</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 bg-white">
              ${stocks.map(s => `
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">${s.warehouse_name}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-800">${s.product_name}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">${s.sku}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${s.category || '-'}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${s.quantity <= 0 ? 'text-rose-600' : 'text-emerald-600'}">
                    ${s.quantity.toLocaleString()}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-500">
                    ${new Date(s.updated_at).toLocaleString()}
                  </td>
                </tr>
              `).join('')}
              ${stocks.length === 0 ? '<tr><td colspan="6" class="px-6 py-10 text-center text-slate-500">데이터가 없습니다.</td></tr>' : ''}
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
                <button onclick="loadWarehouseStockLevels(${pagination.page - 1})" ${pagination.page === 1 ? 'disabled' : ''} class="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed">
                  <span class="sr-only">Previous</span>
                  <i class="fas fa-chevron-left h-5 w-5 flex items-center justify-center"></i>
                </button>
                
                ${Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => `
                  <button onclick="loadWarehouseStockLevels(${p})" class="relative inline-flex items-center px-4 py-2 text-sm font-semibold ${p === pagination.page ? 'bg-indigo-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600' : 'text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0'}">
                    ${p}
                  </button>
                `).join('')}

                <button onclick="loadWarehouseStockLevels(${pagination.page + 1})" ${pagination.page === pagination.totalPages ? 'disabled' : ''} class="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed">
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
