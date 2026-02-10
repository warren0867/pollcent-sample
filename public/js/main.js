// ===== SEARCH =====
var allProducts = [];
var selectedCategory = '전자/디지털';
var CATEGORIES = [
  {name:'전자/디지털',emoji:'📱'},{name:'생활/주방',emoji:'🏠'},{name:'패션/의류',emoji:'👕'},
  {name:'스포츠/건강',emoji:'💪'},{name:'식품/음료',emoji:'🍽️'},{name:'뷰티/미용',emoji:'💄'}
];

// localStorage helpers
function getLS(k) { try { return JSON.parse(localStorage.getItem('pp_'+k)) } catch(e) { return null } }
function setLS(k,v) { localStorage.setItem('pp_'+k, JSON.stringify(v)) }

// 최근검색어
function getRecentSearches() { return getLS('recent_search') || [] }
function addRecentSearch(q) {
  if (!q) return;
  var list = getRecentSearches().filter(function(s) { return s !== q });
  list.unshift(q);
  if (list.length > 10) list = list.slice(0, 10);
  setLS('recent_search', list);
}
function removeRecentSearch(q) {
  setLS('recent_search', getRecentSearches().filter(function(s) { return s !== q }));
  renderRecentSearches();
}
function clearRecentSearches() {
  setLS('recent_search', []);
  renderRecentSearches();
}

// 최근 본 상품
function getRecentViews() { return getLS('recent_view') || [] }
function addRecentView(id) {
  var list = getRecentViews().filter(function(v) { return v !== id });
  list.unshift(id);
  if (list.length > 10) list = list.slice(0, 10);
  setLS('recent_view', list);
}

// 렌더링
function renderRecentSearches() {
  var area = document.getElementById('recent-searches-area');
  if (!area) return;
  var recent = getRecentSearches();
  if (recent.length === 0) { area.innerHTML = ''; return; }
  var h = '<div class="search-block"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  h += '<h4 style="margin:0">최근 검색어</h4><span class="clear-link" onclick="clearRecentSearches()">전체삭제</span></div>';
  h += '<div class="chip-wrap">';
  recent.forEach(function(s) {
    h += '<span class="s-chip" onclick="doTagSearch(\'' + s.replace(/'/g,"\\'") + '\')">' + s;
    h += '<span class="x-btn" onclick="event.stopPropagation();removeRecentSearch(\'' + s.replace(/'/g,"\\'") + '\')">✕</span></span>';
  });
  h += '</div></div>';
  area.innerHTML = h;
}

function renderRecentViews() {
  var area = document.getElementById('recent-views-area');
  if (!area || allProducts.length === 0) return;
  var views = getRecentViews();
  if (views.length === 0) { area.innerHTML = ''; return; }
  var h = '<div class="search-block"><h4>최근 본 상품</h4><div class="h-scroll">';
  views.forEach(function(vid) {
    var p = allProducts.find(function(x) { return x.id === vid });
    if (!p) return;
    h += '<a href="/product/' + p.id + '" class="rv-card" onclick="addRecentView(' + p.id + ')">';
    h += '<img src="' + p.image + '" alt="' + p.name + '">';
    h += '<div class="name">' + p.name + '</div>';
    h += '<div class="price">' + Number(p.currentPrice).toLocaleString() + '원</div></a>';
  });
  h += '</div></div>';
  area.innerHTML = h;
}

function renderPopular() {
  var el = document.getElementById('popular-products');
  if (!el || allProducts.length === 0) return;
  var sorted = allProducts.slice().sort(function(a,b) { return b.discount - a.discount });
  var h = '';
  sorted.forEach(function(p) {
    h += '<a href="/product/' + p.id + '" class="pop-card" onclick="addRecentView(' + p.id + ')">';
    h += '<img src="' + p.image + '" alt="' + p.name + '">';
    h += '<div class="name">' + p.name + '</div>';
    h += '<div class="price-row"><span class="disc">' + p.discount + '%</span><span class="price">' + Number(p.currentPrice).toLocaleString() + '원</span></div></a>';
  });
  el.innerHTML = h;
}

function renderGoldbox() {
  var el = document.getElementById('goldbox-products');
  if (!el || allProducts.length === 0) return;
  var h = '';
  allProducts.slice(0, 6).forEach(function(p) {
    h += '<a href="/product/' + p.id + '" class="gb-card" onclick="addRecentView(' + p.id + ')">';
    h += '<img src="' + p.image + '" alt="' + p.name + '">';
    h += '<div class="name">' + p.name.slice(0, 10) + '</div>';
    h += '<div class="disc">' + p.discount + '%↓</div></a>';
  });
  el.innerHTML = h;
  updateGoldboxTimer();
}

function updateGoldboxTimer() {
  var el = document.getElementById('goldbox-timer');
  if (!el) return;
  var now = new Date();
  var end = new Date(now); end.setHours(23,59,59,999);
  var diff = end - now;
  var hh = Math.floor(diff/3600000);
  var mm = Math.floor((diff%3600000)/60000);
  var ss = Math.floor((diff%60000)/1000);
  el.textContent = String(hh).padStart(2,'0') + ':' + String(mm).padStart(2,'0') + ':' + String(ss).padStart(2,'0') + ' 남음';
  setTimeout(updateGoldboxTimer, 1000);
}

function renderLowest() {
  var el = document.getElementById('lowest-area');
  if (!el || allProducts.length === 0) return;
  var lowest = allProducts.filter(function(p) { return p.badge === 'lowest' });
  if (lowest.length === 0) { el.innerHTML = ''; return; }
  var h = '<h4>💰 지금 최저가</h4>';
  lowest.forEach(function(p) {
    h += '<a href="/product/' + p.id + '" class="lowest-card" onclick="addRecentView(' + p.id + ')">';
    h += '<img src="' + p.image + '" alt="' + p.name + '">';
    h += '<div class="info"><div class="name">' + p.name + '</div>';
    h += '<div style="display:flex;align-items:center;gap:6px;margin-top:4px">';
    h += '<span class="orig">' + Number(p.originalPrice).toLocaleString() + '원</span>';
    h += '<span class="cur">' + Number(p.currentPrice).toLocaleString() + '원</span></div></div>';
    h += '<span class="lowest-badge">최저가</span></a>';
  });
  el.innerHTML = h;
}

function renderCategoryChips() {
  var el = document.getElementById('category-chips');
  if (!el) return;
  var h = '';
  CATEGORIES.forEach(function(c) {
    var active = c.name === selectedCategory;
    h += '<span class="s-chip' + (active ? ' active' : '') + '" onclick="selectCategory(\'' + c.name + '\')">' + c.emoji + ' ' + c.name + '</span>';
  });
  el.innerHTML = h;
}

function selectCategory(cat) {
  selectedCategory = cat;
  renderCategoryChips();
  renderCategoryProducts();
}

function renderCategoryProducts() {
  var el = document.getElementById('category-products');
  if (!el || allProducts.length === 0) return;
  var filtered = allProducts.filter(function(p) { return p.category === selectedCategory });
  if (filtered.length === 0) {
    el.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:#aaa;font-size:13px">해당 카테고리 상품이 없습니다</div>';
    return;
  }
  var h = '';
  filtered.forEach(function(p) {
    h += '<a href="/product/' + p.id + '" class="cat-card" onclick="addRecentView(' + p.id + ')">';
    h += '<img src="' + p.image + '" alt="' + p.name + '">';
    h += '<div class="name">' + p.name + '</div>';
    h += '<div class="price-row"><span class="disc">' + p.discount + '%</span><span class="price">' + Number(p.currentPrice).toLocaleString() + '원</span></div></a>';
  });
  el.innerHTML = h;
}

// 검색
function doTagSearch(tag) {
  var input = document.getElementById('search-input');
  if (input) { input.value = tag; doSearch(); }
}

function doSearch() {
  var input = document.getElementById('search-input');
  var q = input ? input.value.trim().toLowerCase() : '';
  var home = document.getElementById('search-home');
  var results = document.getElementById('search-results');
  if (!q) {
    if (home) home.style.display = '';
    if (results) { results.style.display = 'none'; results.innerHTML = ''; }
    return;
  }
  addRecentSearch(q);
  if (home) home.style.display = 'none';
  var filtered = allProducts.filter(function(p) { return p.name.toLowerCase().indexOf(q) >= 0 });
  var h = '';
  if (filtered.length === 0) {
    h = '<div style="text-align:center;padding:40px 0;color:#aaa"><div style="font-size:36px;margin-bottom:8px">😢</div><p>검색 결과가 없어요</p></div>';
  }
  filtered.forEach(function(p) {
    h += '<a href="/product/' + p.id + '" class="search-result-card" onclick="addRecentView(' + p.id + ')">';
    h += '<img src="' + p.image + '" alt="' + p.name + '">';
    h += '<div class="info"><div class="name">' + p.name + '</div>';
    h += '<div class="price-row"><span class="disc">▼' + p.discount + '%</span><span class="price">' + Number(p.currentPrice).toLocaleString() + '원</span></div></div></a>';
  });
  if (results) { results.style.display = ''; results.innerHTML = h; }
}

// 검색 초기화
function initSearch() {
  fetch('/api/products').then(function(r) { return r.json() }).then(function(data) {
    allProducts = data;
    renderRecentSearches();
    renderRecentViews();
    renderPopular();
    renderGoldbox();
    renderLowest();
    renderCategoryChips();
    renderCategoryProducts();
  }).catch(function() {});

  var input = document.getElementById('search-input');
  if (input) {
    input.addEventListener('input', function() {
      doSearch();
    });
  }
}

// 페이지 로드 시 실행
if (document.getElementById('search-home')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearch);
  } else {
    initSearch();
  }
}

// 복권 사용
async function playLottery(ticketId) {
  const card = document.getElementById('ticket-' + ticketId);
  if (!card) return;

  try {
    const res = await fetch('/tickets/lottery/' + ticketId, { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      const front = card.querySelector('.ticket-front');
      if (front) {
        front.outerHTML = '<div class="ticket-result ' + (data.result.amount > 0 ? 'win' : 'lose') + '">' +
          (data.result.amount > 0 ? data.result.label + ' 당첨!' : '꽝') + '</div>';
      }
    } else {
      alert(data.error || '오류 발생');
    }
  } catch (err) {
    alert('네트워크 오류');
  }
}

// 복권 전체 사용
async function playAllLottery() {
  if (!confirm('모든 복권 티켓을 한번에 긁으시겠습니까?')) return;

  try {
    const res = await fetch('/tickets/lottery-all', { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      alert(data.count + '장 사용 완료!\n총 당첨금: ' + data.totalReward.toLocaleString() + '원');
      location.reload();
    }
  } catch (err) {
    alert('네트워크 오류');
  }
}

// 룰렛 사용
let rouletteSpinning = false;
async function playRoulette(ticketId) {
  if (rouletteSpinning) return;
  rouletteSpinning = true;

  try {
    const res = await fetch('/tickets/roulette/' + ticketId, { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      // 모달 표시
      const modal = document.getElementById('roulette-modal');
      const wheel = document.getElementById('roulette-wheel');
      const result = document.getElementById('roulette-result');

      modal.style.display = 'flex';
      result.textContent = '';

      // 룰렛 회전 애니메이션
      const rotation = 1440 + Math.random() * 360;
      wheel.style.transform = 'rotate(' + rotation + 'deg)';

      setTimeout(function () {
        result.textContent = data.result.label + ' 당첨!';
        // 티켓 카드 업데이트
        const card = document.getElementById('ticket-' + ticketId);
        if (card) card.remove();
        rouletteSpinning = false;
      }, 3200);
    } else {
      alert(data.error || '오류 발생');
      rouletteSpinning = false;
    }
  } catch (err) {
    alert('네트워크 오류');
    rouletteSpinning = false;
  }
}

function closeRoulette() {
  document.getElementById('roulette-modal').style.display = 'none';
  location.reload();
}

// 보상 교환
async function exchangeReward(rewardId) {
  try {
    const res = await fetch('/rewards/exchange/' + rewardId, { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      alert(data.amount.toLocaleString() + '원이 잔액에 추가되었습니다!');
      location.reload();
    } else {
      alert(data.error || '교환 실패');
    }
  } catch (err) {
    alert('네트워크 오류');
  }
}

// 전체 교환
async function exchangeAll() {
  if (!confirm('교환 가능한 모든 보상을 교환하시겠습니까?')) return;

  try {
    const res = await fetch('/rewards/exchange-all', { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      alert(data.count + '건 교환 완료!\n총 ' + data.totalAmount.toLocaleString() + '원');
      location.reload();
    }
  } catch (err) {
    alert('네트워크 오류');
  }
}
