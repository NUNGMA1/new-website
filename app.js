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

async function hashPassword(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 유저별 스트릭 계산
function calculateStreaks(allMeals) {
  // 유저별 날짜 목록
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

function renderCard(m, streak) {
  const streakHtml = streak >= 2
    ? `<span class="streak">🔥 ${streak}일 연속</span>`
    : '';

  return `
    <div class="card">
      <div class="card-header">
        <span class="card-username">${escapeHtml(m.username)}</span>
        ${streakHtml}
      </div>
      <div class="meal-list">
        <div class="meal-item">
          <span class="meal-time">아침</span>
          ${m.breakfast ? `<span class="meal-text">${escapeHtml(m.breakfast)}</span>` : '<span class="meal-empty">미기록</span>'}
        </div>
        <div class="meal-item">
          <span class="meal-time">점심</span>
          ${m.lunch ? `<span class="meal-text">${escapeHtml(m.lunch)}</span>` : '<span class="meal-empty">미기록</span>'}
        </div>
        <div class="meal-item">
          <span class="meal-time">저녁</span>
          ${m.dinner ? `<span class="meal-text">${escapeHtml(m.dinner)}</span>` : '<span class="meal-empty">미기록</span>'}
        </div>
      </div>
    </div>`;
}

async function loadFeed() {
  const feed = document.getElementById('feed');
  const countEl = document.getElementById('totalCount');

  // 최근 60일치 불러오기 (스트릭 계산용)
  const { data: allMeals, error } = await db
    .from('meals')
    .select('username, date, breakfast, lunch, dinner')
    .gte('date', nDaysAgo(60))
    .order('date', { ascending: false });

  if (error) {
    feed.innerHTML = '<div class="loading">❌ 불러오기 실패. 잠시 후 다시 시도해주세요.</div>';
    return;
  }

  const todayMeals = allMeals.filter(m => m.date === today());
  countEl.textContent = todayMeals.length > 0
    ? `${todayMeals.length}명이 오늘 식단을 기록했어요`
    : '아직 아무도 기록하지 않았어요. 첫 번째가 되어보세요!';

  if (allMeals.length === 0) {
    feed.innerHTML = '<div class="empty-state"><div style="font-size:3rem">🥩</div><p>아직 기록이 없어요. 첫 번째가 되어보세요!</p></div>';
    return;
  }

  const streaks = calculateStreaks(allMeals);

  // 날짜별 그룹핑
  const byDate = {};
  for (const m of allMeals) {
    if (!byDate[m.date]) byDate[m.date] = [];
    byDate[m.date].push(m);
  }

  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  feed.innerHTML = sortedDates.map(date => {
    const isToday = date === today();
    const todayTag = isToday ? '<span class="today-tag">오늘</span>' : '';
    const cards = byDate[date].map(m => renderCard(m, streaks[m.username])).join('');
    return `
      <div class="date-section">
        <div class="date-label">${formatDate(date)} ${todayTag}</div>
        <div class="date-grid">${cards}</div>
      </div>`;
  }).join('');
}

// 모달
const overlay    = document.getElementById('modalOverlay');
const stepLogin  = document.getElementById('stepLogin');
const stepMeal   = document.getElementById('stepMeal');
const loginError = document.getElementById('loginError');
const mealError  = document.getElementById('mealError');

document.getElementById('openModal').addEventListener('click', () => {
  overlay.classList.remove('hidden');
  stepLogin.classList.remove('hidden');
  stepMeal.classList.add('hidden');
  loginError.classList.add('hidden');
  document.getElementById('inputUsername').value = '';
  document.getElementById('inputPassword').value = '';
  document.getElementById('inputUsername').focus();
});

document.getElementById('closeModal').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

function closeModal() {
  overlay.classList.add('hidden');
}

document.getElementById('btnLogin').addEventListener('click', async () => {
  const username = document.getElementById('inputUsername').value.trim();
  const password = document.getElementById('inputPassword').value;
  const btn = document.getElementById('btnLogin');

  loginError.classList.add('hidden');

  if (!username) return showLoginError('아이디를 입력해주세요.');
  if (!password) return showLoginError('비밀번호를 입력해주세요.');
  if (username.length < 2) return showLoginError('아이디는 2자 이상이어야 해요.');

  btn.disabled = true;
  btn.textContent = '확인 중...';

  const hash = await hashPassword(password);

  const { data: existing } = await db
    .from('users')
    .select('username, password_hash')
    .eq('username', username)
    .single();

  if (existing) {
    if (existing.password_hash !== hash) {
      btn.disabled = false;
      btn.textContent = '다음 →';
      return showLoginError('비밀번호가 틀렸어요.');
    }
  } else {
    const { error } = await db.from('users').insert({ username, password_hash: hash });
    if (error) {
      btn.disabled = false;
      btn.textContent = '다음 →';
      return showLoginError('계정 생성 실패. 다시 시도해주세요.');
    }
  }

  document.getElementById('greetUsername').textContent = username;

  const { data: mealData } = await db
    .from('meals')
    .select('breakfast, lunch, dinner')
    .eq('username', username)
    .eq('date', today())
    .single();

  document.getElementById('inputBreakfast').value = mealData?.breakfast || '';
  document.getElementById('inputLunch').value     = mealData?.lunch    || '';
  document.getElementById('inputDinner').value    = mealData?.dinner   || '';

  stepLogin.classList.add('hidden');
  stepMeal.classList.remove('hidden');
  mealError.classList.add('hidden');

  btn.disabled = false;
  btn.textContent = '다음 →';
});

document.getElementById('btnSave').addEventListener('click', async () => {
  const username  = document.getElementById('inputUsername').value.trim();
  const breakfast = document.getElementById('inputBreakfast').value.trim();
  const lunch     = document.getElementById('inputLunch').value.trim();
  const dinner    = document.getElementById('inputDinner').value.trim();
  const btn       = document.getElementById('btnSave');

  mealError.classList.add('hidden');

  if (!breakfast && !lunch && !dinner) return showMealError('최소 하나는 입력해주세요.');

  btn.disabled = true;
  btn.textContent = '저장 중...';

  const { error } = await db.from('meals').upsert(
    { username, date: today(), breakfast, lunch, dinner },
    { onConflict: 'username,date' }
  );

  if (error) {
    btn.disabled = false;
    btn.textContent = '저장하기';
    return showMealError('저장 실패. 다시 시도해주세요.');
  }

  closeModal();
  await loadFeed();
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

document.getElementById('todayDate').textContent = formatDate(today());
loadFeed();
