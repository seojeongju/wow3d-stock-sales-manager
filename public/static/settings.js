
// ========================================
// 설정 페이지
// ========================================

// 설정 페이지 렌더링
async function renderSettingsPage() {
    const content = document.getElementById('content');
    const pageTitle = document.getElementById('page-title');
    pageTitle.textContent = '설정';

    content.innerHTML = `
    <div class="max-w-6xl mx-auto">
      <!-- 탭 네비게이션 -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div class="flex border-b border-slate-200">
          <button onclick="switchSettingsTab('team')" id="settingsTabTeam" class="px-6 py-4 font-medium text-indigo-600 border-b-2 border-indigo-600 focus:outline-none transition-colors">
            팀원 관리
          </button>
          <button onclick="switchSettingsTab('general')" id="settingsTabGeneral" class="px-6 py-4 font-medium text-slate-500 hover:text-indigo-600 focus:outline-none transition-colors">
            일반 관리
          </button>
        </div>
      </div>

      <!-- 팀원 관리 탭 -->
      <div id="settingsTabContentTeam">
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div class="flex justify-between items-center mb-6">
            <div>
              <h3 class="text-lg font-bold text-slate-800">팀원 관리</h3>
              <p class="text-sm text-slate-500 mt-1">팀원을 초대하고 조직원을 관리하세요.</p>
            </div>
            <button onclick="showTeamInviteModal()" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm">
              <i class="fas fa-plus"></i>
              팀원 초대
            </button>
          </div>

          <div id="teamMembersList"></div>
        </div>
      </div>

      <!-- 일반 관리 탭 -->
      <div id="settingsTabContentGeneral" class="hidden">
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 class="text-lg font-bold text-slate-800 mb-4">구독 정보</h3>
          <p class="text-sm text-slate-500">구독 관리 기능은 준비 중입니다.</p>
        </div>
      </div>
    </div>

    <!-- 팀원 초대 모달 -->
    <div id="teamInviteModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-slate-800">팀원 초대</h3>
          <button onclick="closeTeamInviteModal()" class="text-slate-400 hover:text-slate-600">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form onsubmit="handleTeamInvite(event)" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">이메일</label>
            <input type="email" id="inviteEmail" required class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="user@example.com">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">이름</label>
            <input type="text" id="inviteName" required class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="홍길동">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">비밀번호</label>
            <input type="password" id="invitePassword" required minlength="8" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="••••••••">
            <p class="text-xs text-slate-500 mt-1">최소 8자 이상</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">권한</label>
            <select id="inviteRole" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="USER">일반 사용자 (USER)</option>
              <option value="ADMIN">관리자 (ADMIN)</option>
            </select>
          </div>
          <div class="flex gap-2 pt-2">
            <button type="button" onclick="closeTeamInviteModal()" class="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
              취소
            </button>
            <button type="submit" class="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              초대하기
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

    loadTeamMembers();
}

// 설정 탭 전환
function switchSettingsTab(tab) {
    const teamTab = document.getElementById('settingsTabTeam');
    const generalTab = document.getElementById('settingsTabGeneral');
    const teamContent = document.getElementById('settingsTabContentTeam');
    const generalContent = document.getElementById('settingsTabContentGeneral');

    if (tab === 'team') {
        teamTab.classList.add('text-indigo-600', 'border-indigo-600');
        teamTab.classList.remove('text-slate-500');
        generalTab.classList.remove('text-indigo-600', 'border-indigo-600');
        generalTab.classList.add('text-slate-500');
        teamContent.classList.remove('hidden');
        generalContent.classList.add('hidden');
    } else {
        generalTab.classList.add('text-indigo-600', 'border-indigo-600');
        generalTab.classList.remove('text-slate-500');
        teamTab.classList.remove('text-indigo-600', 'border-indigo-600');
        teamTab.classList.add('text-slate-500');
        generalContent.classList.remove('hidden');
        teamContent.classList.add('hidden');
    }
}

// 팀원 목록 로드
async function loadTeamMembers() {
    try {
        const res = await axios.get(`${API_BASE}/users`);
        renderTeamMembers(res.data.data);
    } catch (err) {
        console.error(err);
        showToast('팀원 목록 로드 실패', 'error');
    }
}

// 팀원 목록 렌더링
function renderTeamMembers(members) {
    const container = document.getElementById('teamMembersList');
    if (!container) return;

    if (members.length === 0) {
        container.innerHTML = `
      <div class="text-center py-10 text-slate-500">
        <i class="fas fa-users text-4xl mb-2"></i>
        <p>팀원이 없습니다.</p>
      </div>
    `;
        return;
    }

    container.innerHTML = `
    <table class="w-full">
      <thead>
        <tr class="border-b border-slate-200">
          <th class="text-left py-3 px-4 text-sm font-medium text-slate-600">이름</th>
          <th class="text-left py-3 px-4 text-sm font-medium text-slate-600">이메일</th>
          <th class="text-left py-3 px-4 text-sm font-medium text-slate-600">권한</th>
          <th class="text-left py-3 px-4 text-sm font-medium text-slate-600">가입일</th>
          <th class="text-right py-3 px-4 text-sm font-medium text-slate-600">관리</th>
        </tr>
      </thead>
      <tbody>
        ${members.map(m => `
          <tr class="border-b border-slate-100 hover:bg-slate-50">
            <td class="py-3 px-4">
              <span class="font-medium text-slate-800">${m.name}</span>
            </td>
            <td class="py-3 px-4">
              <span class="text-sm text-slate-600">${m.email}</span>
            </td>
            <td class="py-3 px-4">
              <span class="px-2 py-1 rounded text-xs font-medium ${m.role === 'OWNER' ? 'bg-purple-100 text-purple-700' :
            m.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' :
                'bg-slate-100 text-slate-700'
        }">
                ${m.role === 'OWNER' ? '소유자' :
            m.role === 'ADMIN' ? '관리자' :
                '일반'
        }
              </span>
            </td>
            <td class="py-3 px-4 text-sm text-slate-500">
              ${new Date(m.created_at).toLocaleDateString('ko-KR')}
            </td>
            <td class="py-3 px-4 text-right">
              ${m.role !== 'OWNER' ? `
                <button onclick="deleteTeamMember(${m.id}, '${m.name}')" class="text-rose-600 hover:text-rose-700">
                  <i class="fas fa-trash"></i>
                </button>
              ` : '-'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// 팀원 초대 모달 표시
function showTeamInviteModal() {
    const modal = document.getElementById('teamInviteModal');
    modal.classList.remove('hidden');
    document.getElementById('inviteEmail').value = '';
    document.getElementById('inviteName').value = '';
    document.getElementById('invitePassword').value = '';
    document.getElementById('inviteRole').value = 'USER';
}

// 팀원 초대 모달 닫기
function closeTeamInviteModal() {
    document.getElementById('teamInviteModal').classList.add('hidden');
}

// 팀원 초대 처리
async function handleTeamInvite(e) {
    e.preventDefault();

    const email = document.getElementById('inviteEmail').value;
    const name = document.getElementById('inviteName').value;
    const password = document.getElementById('invitePassword').value;
    const role = document.getElementById('inviteRole').value;

    try {
        await axios.post(`${API_BASE}/users`, {
            email,
            name,
            password,
            role
        });

        showToast('팀원 초대 완료');
        closeTeamInviteModal();
        loadTeamMembers();
    } catch (err) {
        console.error(err);
        showToast(err.response?.data?.error || '팀원 초대 실패', 'error');
    }
}

// 팀원 삭제
async function deleteTeamMember(id, name) {
    if (!confirm(`${name}님을 팀에서 제거하시겠습니까?`)) return;

    try {
        await axios.delete(`${API_BASE}/users/${id}`);
        showToast('팀원이 제거되었습니다');
        loadTeamMembers();
    } catch (err) {
        console.error(err);
        showToast(err.response?.data?.error || '팀원 제거 실패', 'error');
    }
}
