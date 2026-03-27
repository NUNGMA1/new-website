// 로그인 상태 관리
function getSavedUser() {
  return localStorage.getItem('carnivore_user');
}

function saveUser(username) {
  localStorage.setItem('carnivore_user', username);
  updateHeaderUser(username);
}

function clearUser() {
  localStorage.removeItem('carnivore_user');
  updateHeaderUser(null);
}

function updateHeaderUser(username) {
  const userEl   = document.getElementById('loggedInUser');
  const logoutEl = document.getElementById('btnLogout');
  if (username) {
    userEl.textContent = username;
    userEl.classList.remove('hidden');
    logoutEl.classList.remove('hidden');
  } else {
    userEl.classList.add('hidden');
    logoutEl.classList.add('hidden');
  }
}

const SUPABASE_URL = 'https://nliidoqiyakbnrgwlyii.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5saWlkb3FpeWFrYm5yZ3dseWlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTI1OTgsImV4cCI6MjA5MDE4ODU5OH0.eEtZSS2R1qbt8ubGUX8924QuKxYgWbMTqzgAp8w-_lk';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function today() {
  return new Date().toISOString().split('T')[0];
}

function nDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}

// 유저별 스트릭 계산
function calculateStreaks(allMeals) {
  const userDates = {};
  for (const m of allMeals) {
    if (!userDates[m.username]) userDates[m.username] = [];
    userDates[m.username].push(m.date);
  }

  const streaks = {};
  for (const [username, dates] of Object.entries(userDates)) {
    const sorted = [...new Set(dates)].sort((a, b) => b.localeCompare(a));
    let streak = 1;
    for (let i = 0; i < sorted.length - 1; i++) {
      const curr = new Date(sorted[i] + 'T00:00:00');
      const next = new Date(sorted[i + 1] + 'T00:00:00');
      const diff = (curr - next) / (1000 * 60 * 60 * 24);
      if (diff === 1) streak++;
      else break;
    }
    streaks[username] = streak;
  }
  return streaks;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderTags(str) {
  if (!str) return '';
  return str.split(',')
    .map(t => t.trim()).filter(Boolean)
    .map(t => `<span class="card-tag">${escapeHtml(t)}</span>`)
    .join('');
}

function renderMealRow(label, value) {
  if (!value) return '';
  return `
    <div class="meal-item">
      <span class="meal-time">${label}</span>
      <div class="card-tags">${renderTags(value)}</div>
    </div>`;
}

// 아바타 색상 (닉네임 기반 고정 색)
function avatarColor(username) {
  const colors = ['#c0392b', '#e67e22', '#d35400', '#27ae60', '#2980b9', '#8e44ad', '#16a085', '#f39c12'];
  let hash = 0;
  for (const c of username) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

// 프로필 그리드 로드
async function loadProfiles() {
  const grid = document.getElementById('profiles');
  const countEl = document.getElementById('totalCount');

  const [{ data: users, error: usersError }, { data: allMeals }] = await Promise.all([
    db.from('users').select('username').order('username'),
    db.from('meals').select('username, date').gte('date', nDaysAgo(60)).order('date', { ascending: false }),
  ]);

  if (usersError || !users) {
    grid.innerHTML = '<div class="loading">❌ 불러오기 실패. 잠시 후 다시 시도해주세요.</div>';
    return;
  }

  const streaks = calculateStreaks(allMeals || []);
  const todayStr = today();
  const recordedToday = new Set((allMeals || []).filter(m => m.date === todayStr).map(m => m.username));

  countEl.textContent = users.length > 0
    ? `${users.length}명의 카니보어가 함께하고 있어요`
    : '아직 아무도 없어요. 첫 번째가 되어보세요!';

  if (users.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div style="font-size:3rem">🥩</div><p>아직 아무도 없어요. 첫 번째가 되어보세요!</p></div>';
    return;
  }

  // 정렬: 오늘 기록 → 스트릭 높은 순 → 이름순
  const sorted = [...users].sort((a, b) => {
    const aToday = recordedToday.has(a.username) ? 1 : 0;
    const bToday = recordedToday.has(b.username) ? 1 : 0;
    if (aToday !== bToday) return bToday - aToday;
    const aStreak = streaks[a.username] || 0;
    const bStreak = streaks[b.username] || 0;
    if (aStreak !== bStreak) return bStreak - aStreak;
    return a.username.localeCompare(b.username, 'ko');
  });

  grid.innerHTML = sorted.map(u => {
    const streak = streaks[u.username] || 0;
    const isToday = recordedToday.has(u.username);
    const color = avatarColor(u.username);
    const initial = [...u.username][0].toUpperCase();

    const streakHtml = streak >= 2
      ? `<span class="profile-streak">🔥 ${streak}일 연속</span>`
      : '';
    const todayBadge = isToday
      ? `<span class="profile-today">오늘 기록</span>`
      : '';

    return `
      <div class="profile-card" data-username="${escapeHtml(u.username)}">
        <div class="profile-avatar" style="background:${color}">${escapeHtml(initial)}</div>
        <div class="profile-name">${escapeHtml(u.username)}</div>
        <div class="profile-meta">${streakHtml}${todayBadge}</div>
      </div>`;
  }).join('');
}

// 프로필 상세 모달
const profileOverlay = document.getElementById('profileOverlay');

document.getElementById('profiles').addEventListener('click', e => {
  const card = e.target.closest('.profile-card');
  if (card) openProfileDetail(card.dataset.username);
});

async function openProfileDetail(username) {
  profileOverlay.classList.remove('hidden');

  const color = avatarColor(username);
  const initial = [...username][0].toUpperCase();
  const avatarEl = document.getElementById('profileDetailAvatar');
  avatarEl.style.background = color;
  avatarEl.textContent = initial;
  document.getElementById('profileDetailName').textContent = username;
  document.getElementById('profileDetailStreak').textContent = '';

  const content = document.getElementById('profileContent');
  content.innerHTML = '<div class="loading">🥩 불러오는 중...</div>';

  const { data: meals } = await db
    .from('meals')
    .select('date, breakfast, lunch, dinner, note')
    .eq('username', username)
    .order('date', { ascending: false });

  if (!meals || meals.length === 0) {
    content.innerHTML = '<div class="empty-state"><p>아직 기록이 없어요.</p></div>';
    return;
  }

  const streaks = calculateStreaks(meals.map(m => ({ ...m, username })));
  const streak = streaks[username] || 0;
  if (streak >= 2) {
    document.getElementById('profileDetailStreak').textContent = `🔥 ${streak}일 연속`;
  }

  const todayStr = today();
  content.innerHTML = meals.map(m => {
    const isToday = m.date === todayStr;
    const todayTag = isToday ? '<span class="today-tag">오늘</span>' : '';
    const mealsHtml = [
      renderMealRow('아침', m.breakfast),
      renderMealRow('점심', m.lunch),
      renderMealRow('저녁', m.dinner),
    ].filter(Boolean).join('');
    const noteHtml = m.note
      ? `<div class="card-note">💬 ${escapeHtml(m.note)}</div>`
      : '';

    return `
      <div class="detail-day">
        <div class="detail-date">${formatDate(m.date)} ${todayTag}</div>
        <div class="detail-meals">
          ${mealsHtml || '<span class="meal-empty">기록 없음</span>'}
        </div>
        ${noteHtml}
      </div>`;
  }).join('');
}

document.getElementById('closeProfile').addEventListener('click', () => {
  profileOverlay.classList.add('hidden');
});
profileOverlay.addEventListener('click', e => {
  if (e.target === profileOverlay) profileOverlay.classList.add('hidden');
});

// 태그 입력 관리
const tagState = { breakfast: [], lunch: [], dinner: [] };

function renderTagPills(meal) {
  const box = document.getElementById('box' + capitalize(meal));
  const input = box.querySelector('.tag-input');
  box.querySelectorAll('.tag-pill').forEach(el => el.remove());
  tagState[meal].forEach((tag, i) => {
    const pill = document.createElement('span');
    pill.className = 'tag-pill';
    pill.innerHTML = `${escapeHtml(tag)}<button type="button" data-i="${i}" data-meal="${meal}">✕</button>`;
    box.insertBefore(pill, input);
  });
}

function addTag(meal, value) {
  const v = value.trim().replace(/,$/, '');
  if (!v) return;
  tagState[meal].push(v);
  renderTagPills(meal);
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function loadTagsFromString(meal, str) {
  tagState[meal] = str ? str.split(',').map(t => t.trim()).filter(Boolean) : [];
  renderTagPills(meal);
}

['breakfast', 'lunch', 'dinner'].forEach(meal => {
  const box = document.getElementById('box' + capitalize(meal));
  const input = box.querySelector('.tag-input');

  input.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      addTag(meal, input.value);
      input.value = '';
    } else if (e.key === 'Backspace' && input.value === '' && tagState[meal].length > 0) {
      tagState[meal].pop();
      renderTagPills(meal);
    }
  });

  input.addEventListener('blur', () => {
    if (input.value.trim()) {
      addTag(meal, input.value);
      input.value = '';
    }
  });

  box.addEventListener('click', e => {
    if (e.target.tagName === 'BUTTON') {
      const i = parseInt(e.target.dataset.i);
      tagState[e.target.dataset.meal].splice(i, 1);
      renderTagPills(e.target.dataset.meal);
    } else {
      input.focus();
    }
  });
});

// 기록 모달
const overlay    = document.getElementById('modalOverlay');
const stepLogin  = document.getElementById('stepLogin');
const stepMeal   = document.getElementById('stepMeal');
const loginError = document.getElementById('loginError');
const mealError  = document.getElementById('mealError');

document.getElementById('openModal').addEventListener('click', async () => {
  overlay.classList.remove('hidden');
  loginError.classList.add('hidden');

  const savedUser = getSavedUser();
  if (savedUser) {
    await loadMealStep(savedUser);
  } else {
    stepLogin.classList.remove('hidden');
    stepMeal.classList.add('hidden');
    document.getElementById('inputUsername').value = '';
    tagState.breakfast = []; tagState.lunch = []; tagState.dinner = [];
    renderTagPills('breakfast'); renderTagPills('lunch'); renderTagPills('dinner');
    document.getElementById('inputNote').value = '';
    document.getElementById('inputUsername').focus();
  }
});

async function loadMealStep(username) {
  document.getElementById('greetUsername').textContent = username;
  document.getElementById('inputUsername').value = username;

  tagState.breakfast = []; tagState.lunch = []; tagState.dinner = [];
  renderTagPills('breakfast'); renderTagPills('lunch'); renderTagPills('dinner');
  document.getElementById('inputNote').value = '';

  const { data: mealData } = await db
    .from('meals')
    .select('breakfast, lunch, dinner, note')
    .eq('username', username)
    .eq('date', today())
    .single();

  loadTagsFromString('breakfast', mealData?.breakfast || '');
  loadTagsFromString('lunch',     mealData?.lunch    || '');
  loadTagsFromString('dinner',    mealData?.dinner   || '');
  document.getElementById('inputNote').value = mealData?.note || '';

  stepLogin.classList.add('hidden');
  stepMeal.classList.remove('hidden');
  mealError.classList.add('hidden');
}

document.getElementById('closeModal').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

function closeModal() {
  overlay.classList.add('hidden');
}

document.getElementById('btnLogin').addEventListener('click', async () => {
  const username = document.getElementById('inputUsername').value.trim();
  const btn = document.getElementById('btnLogin');

  loginError.classList.add('hidden');

  if (!username) return showLoginError('닉네임을 입력해주세요.');
  if (username.length < 2) return showLoginError('닉네임은 2자 이상이어야 해요.');

  btn.disabled = true;
  btn.textContent = '확인 중...';

  const { data: existing } = await db
    .from('users')
    .select('username')
    .eq('username', username)
    .single();

  if (!existing) {
    const { error } = await db.from('users').insert({ username });
    if (error) {
      btn.disabled = false;
      btn.textContent = '다음 →';
      return showLoginError('이미 사용 중인 닉네임이에요. 다른 닉네임을 입력해주세요.');
    }
  }

  saveUser(username);
  await loadMealStep(username);

  btn.disabled = false;
  btn.textContent = '다음 →';
});

document.getElementById('btnSave').addEventListener('click', async () => {
  const username  = document.getElementById('inputUsername').value.trim();
  const breakfast = tagState.breakfast.join(',');
  const lunch     = tagState.lunch.join(',');
  const dinner    = tagState.dinner.join(',');
  const note      = document.getElementById('inputNote').value.trim();
  const btn       = document.getElementById('btnSave');

  mealError.classList.add('hidden');

  if (!breakfast && !lunch && !dinner) return showMealError('최소 하나는 입력해주세요.');

  btn.disabled = true;
  btn.textContent = '저장 중...';

  const { error } = await db.from('meals').upsert(
    { username, date: today(), breakfast, lunch, dinner, note },
    { onConflict: 'username,date' }
  );

  if (error) {
    btn.disabled = false;
    btn.textContent = '저장하기';
    return showMealError('저장 실패. 다시 시도해주세요.');
  }

  closeModal();
  await loadProfiles();
  btn.disabled = false;
  btn.textContent = '저장하기';
});

function showLoginError(msg) {
  loginError.textContent = msg;
  loginError.classList.remove('hidden');
}

function showMealError(msg) {
  mealError.textContent = msg;
  mealError.classList.remove('hidden');
}

document.getElementById('btnLogout').addEventListener('click', () => {
  clearUser();
});

// 페이지 로드
const savedUser = getSavedUser();
if (savedUser) updateHeaderUser(savedUser);

document.getElementById('todayDate').textContent = formatDate(today());
loadProfiles();
