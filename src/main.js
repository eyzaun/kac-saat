import './style.css'

// Render UI
const app = document.querySelector('#app');
app.innerHTML = `
  <div class="container" role="application" aria-label="Kaç Saat Hesaplayıcı">
    <h1>Kaç Saat Ulan Bu?</h1>
    <button id="installBtn" class="install-btn" hidden>Yükle</button>
    <form id="calcForm" novalidate>
      <div class="view-toggle">
        <label>
          <input type="checkbox" id="compactView"> Sadece fiyat ve sonucu göster
        </label>
      </div>

      <div id="userSection">
  <label for="salary">Aylık Maaş (TL):</label>
  <input type="text" id="salary" class="money-input" placeholder="Örneğin: 5.000" inputmode="decimal" required>
        
        <label>Hangi Günler Çalışıyorsunuz?</label>
        <div class="days" role="group" aria-label="Çalışılan günler">
          <label><input type="checkbox" value="pazartesi" checked> Pazartesi</label>
          <label><input type="checkbox" value="salı" checked> Salı</label>
          <label><input type="checkbox" value="çarşamba" checked> Çarşamba</label>
          <label><input type="checkbox" value="perşembe" checked> Perşembe</label>
          <label><input type="checkbox" value="cuma" checked> Cuma</label>
          <label><input type="checkbox" value="cumartesi"> Cumartesi</label>
          <label><input type="checkbox" value="pazar"> Pazar</label>
        </div>
        
        <label for="hours">Günde Kaç Saat Çalışıyorsunuz?</label>
        <input type="number" id="hours" placeholder="Örneğin: 8" inputmode="decimal" min="0" step="0.25" required>
        
        <label>Prim Alıyor musunuz?</label>
        <div class="prim-options" role="radiogroup" aria-label="Prim">
          <label><input type="radio" name="prim" value="none" checked> Hayır</label>
          <label><input type="radio" name="prim" value="yes"> Evet</label>
        </div>
        
        <div id="primDetails" hidden>
          <label>Prim Sıklığı:</label>
          <div class="prim-frequency">
            <div class="prim-item">
              <label class="chip-label"><input type="checkbox" id="quarterly"> 3 Ayda Bir</label>
              <label for="primAmountQuarterly" class="small-caption">Miktar</label>
              <input type="text" id="primAmountQuarterly" class="money-input" placeholder="Maaşla aynı" inputmode="decimal">
            </div>
            <div class="prim-item">
              <label class="chip-label"><input type="checkbox" id="yearly"> 12 Ayda Bir</label>
              <label for="primAmountYearly" class="small-caption">Miktar</label>
              <input type="text" id="primAmountYearly" class="money-input" placeholder="Maaşla aynı" inputmode="decimal">
            </div>
          </div>
        </div>
      </div>

  <label for="price">Eşya Fiyatı (TL):</label>
  <input type="text" id="price" class="money-input" placeholder="Örneğin: 1.000" inputmode="decimal" required>
      
      <!-- Otomatik hesaplama: buton kaldırıldı -->
    </form>
    <div id="result" aria-live="polite" hidden></div>
  </div>
`;

// Helpers
const qs = (s, el=document) => el.querySelector(s);
const qsa = (s, el=document) => Array.from(el.querySelectorAll(s));
// Parse a TR-formatted money string like "1.234,56" to Number
const num = (v) => {
  try {
    let s = String(v || '').trim();
    // keep only digits and separators
    s = s.replace(/[^0-9,\.]/g, '');
    if (s.includes(',')) {
      // Treat comma as decimal; remove thousand dots
      s = s.replace(/\./g, '').replace(',', '.');
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
};

// Money parser: thousands-only (dots), no decimals considered
function parseMoney(input) {
  try {
    const digits = String(input || '').replace(/\D/g, '');
    const n = parseInt(digits, 10);
    return Number.isFinite(n) ? n : 0;
  } catch { return 0; }
}

// Format a raw input string into TR money with thousands (dots), no decimals
function formatMoneyInputString(input) {
  let s = String(input || '');
  // keep only digits
  s = s.replace(/\D/g, '');
  s = s.replace(/^0+(?=\d)/, '');
  const grouped = s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return grouped;
}
const clampPos = (n) => (n > 0 ? n : 0);

function formatTL(value) {
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(value || 0);
  } catch {
    return `${(value || 0).toFixed(2)} TL`;
  }
}

// Thousands/grouped decimal formatting for general numbers
function formatNumber(value, fractionDigits = 2) {
  try {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      useGrouping: true,
    }).format(Number(value) || 0);
  } catch {
    const v = Number(value) || 0;
    return v.toFixed(fractionDigits);
  }
}

// Convert float hours to "X saat Y dakika"
function hoursToHM(value) {
  const totalMinutes = Math.round((Number(value) || 0) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${formatNumber(hours, 0)} saat ${minutes} dakika`;
}

// Elements
const formEl = qs('#calcForm');
const salaryEl = qs('#salary');
const hoursEl = qs('#hours');
const priceEl = qs('#price');
const resultEl = qs('#result');
const primRadios = qsa('input[name="prim"]');
const primDetails = qs('#primDetails');
const quarterlyEl = qs('#quarterly');
const yearlyEl = qs('#yearly');
const primAmountQuarterlyEl = qs('#primAmountQuarterly');
const primAmountYearlyEl = qs('#primAmountYearly');
const installBtn = qs('#installBtn');
const compactViewEl = qs('#compactView');
const userSectionEl = qs('#userSection');

const STORAGE_KEY = 'kac-saat-state-v1';

// Prevent accidental form submit (Enter)
formEl.addEventListener('submit', (e) => e.preventDefault());

// Set defaults when salary changes (and always sync prim amounts)
salaryEl.addEventListener('input', () => {
  const s = clampPos(parseMoney(salaryEl.value));
  // Reformat salary input as user types
  salaryEl.value = formatMoneyInputString(salaryEl.value);
  // Always sync prim amounts to salary
  if (primAmountQuarterlyEl) primAmountQuarterlyEl.value = s ? formatMoneyInputString(String(s)) : '';
  if (primAmountYearlyEl) primAmountYearlyEl.value = s ? formatMoneyInputString(String(s)) : '';
  saveState();
  recalc();
});

function togglePrimAmountStates() {
  if (primAmountQuarterlyEl) primAmountQuarterlyEl.disabled = !(quarterlyEl && quarterlyEl.checked);
  if (primAmountYearlyEl) primAmountYearlyEl.disabled = !(yearlyEl && yearlyEl.checked);
}

// Toggle prim details
primRadios.forEach(r => {
  r.addEventListener('change', () => {
    const primSelected = qsa('input[name="prim"]').find(function(x){return x.checked;});
    const isYes = primSelected && primSelected.value === 'yes';
    primDetails.hidden = !isYes;
    if (!isYes) {
      if (quarterlyEl) quarterlyEl.checked = false;
      if (yearlyEl) yearlyEl.checked = false;
      togglePrimAmountStates();
    } else {
        const s = clampPos(parseMoney(salaryEl.value));
        if (primAmountQuarterlyEl) primAmountQuarterlyEl.value = s ? formatMoneyInputString(String(s)) : '';
        if (primAmountYearlyEl) primAmountYearlyEl.value = s ? formatMoneyInputString(String(s)) : '';
      togglePrimAmountStates();
    }
    saveState();
    recalc();
  });
});

;[hoursEl, priceEl, primAmountQuarterlyEl, primAmountYearlyEl, quarterlyEl, yearlyEl].forEach(el => {
  if (!el) return;
  el.addEventListener('input', () => {
    if (el.classList && el.classList.contains('money-input')) {
      el.value = formatMoneyInputString(el.value);
    }
    togglePrimAmountStates(); saveState(); recalc();
  });
  el.addEventListener('change', () => { togglePrimAmountStates(); saveState(); recalc(); });
});

// Also format salary on blur
if (salaryEl) {
  salaryEl.addEventListener('blur', () => { salaryEl.value = formatMoneyInputString(salaryEl.value); });
}
if (priceEl) {
  priceEl.addEventListener('blur', () => { priceEl.value = formatMoneyInputString(priceEl.value); });
}
if (primAmountQuarterlyEl) {
  primAmountQuarterlyEl.addEventListener('blur', () => { primAmountQuarterlyEl.value = formatMoneyInputString(primAmountQuarterlyEl.value); });
}
if (primAmountYearlyEl) {
  primAmountYearlyEl.addEventListener('blur', () => { primAmountYearlyEl.value = formatMoneyInputString(primAmountYearlyEl.value); });
}

// Days inputs
qsa('.days input[type="checkbox"]').forEach(cb => {
  cb.addEventListener('change', () => { saveState(); recalc(); });
});

function getSelectedDaysPerWeek() {
  return qsa('.days input[type="checkbox"]:checked').length;
}

function getAvgDaysPerMonth() {
  const selected = getSelectedDaysPerWeek();
  // Haftalık gün sayısından aylık ortalama gün hesabı
  const avg = (selected / 7) * (365.25 / 12);
  return avg;
}

function computeEffectiveMonthlyIncome() {
  let s = clampPos(parseMoney(salaryEl.value));
  const primChoice = qsa('input[name="prim"]').find(x => x.checked)?.value;
  if (primChoice === 'yes') {
    if (quarterlyEl?.checked) s += clampPos(parseMoney(primAmountQuarterlyEl.value)) / 3;
    if (yearlyEl?.checked) s += clampPos(parseMoney(primAmountYearlyEl.value)) / 12;
  }
  return s;
}

function isValid() {
  if (parseMoney(salaryEl.value) <= 0) return false;
  if (getSelectedDaysPerWeek() === 0) return false;
  if (num(hoursEl.value) <= 0) return false;
  if (parseMoney(priceEl.value) <= 0) return false;
  const primChoice = qsa('input[name="prim"]').find(x => x.checked)?.value;
  if (primChoice === 'yes') {
    if (!quarterlyEl?.checked && !yearlyEl?.checked) return false;
    if (quarterlyEl?.checked && parseMoney(primAmountQuarterlyEl.value) <= 0) return false;
    if (yearlyEl?.checked && parseMoney(primAmountYearlyEl.value) <= 0) return false;
  }
  return true;
}

function recalc() {
  if (!isValid()) {
    resultEl.hidden = true;
    resultEl.innerHTML = '';
    return;
  }

  const monthlyIncome = computeEffectiveMonthlyIncome();
  const dailyHours = clampPos(num(hoursEl.value));
  const price = clampPos(parseMoney(priceEl.value));
  const avgDaysPerMonth = getAvgDaysPerMonth();

  const monthlyWorkHours = avgDaysPerMonth * dailyHours;
  const hourlyRate = monthlyWorkHours > 0 ? (monthlyIncome / monthlyWorkHours) : 0;
  const totalHours = hourlyRate > 0 ? (price / hourlyRate) : 0;

  const workingDaysNeeded = dailyHours > 0 ? (totalHours / dailyHours) : 0;

  resultEl.innerHTML = `
    <div>
      <p>Bu eşyayı almak için yaklaşık <strong>${hoursToHM(totalHours)}</strong> çalışmanız lazım.</p>
      <p>Bu, yaklaşık <strong>${formatNumber(workingDaysNeeded, 2)} iş günü</strong> eder.</p>
      <hr style="border-color: rgba(255,255,255,0.1);">
      <p>Aylık efektif gelir: <strong>${formatTL(monthlyIncome)}</strong></p>
      <p>Aylık ortalama çalışma süresi: <strong>${hoursToHM(monthlyWorkHours)}</strong></p>
      <p>Saatlik kazanç: <strong>${formatTL(hourlyRate)}</strong></p>
      <p>Eşya fiyatı: <strong>${formatTL(price)}</strong></p>
    </div>
  `;
  resultEl.hidden = false;
}

// Persisted state
function saveState() {
  try {
    const selectedPrim = qsa('input[name="prim"]').find(function(x){return x.checked;});
    const state = {
      salary: salaryEl ? salaryEl.value : '',
      hours: hoursEl ? hoursEl.value : '',
      days: qsa('.days input[type="checkbox"]').filter(function(cb){return cb.checked;}).map(function(cb){return cb.value;}),
      prim: selectedPrim ? selectedPrim.value : 'none',
      quarterly: !!(quarterlyEl && quarterlyEl.checked),
      yearly: !!(yearlyEl && yearlyEl.checked),
      primAmountQuarterly: primAmountQuarterlyEl ? (primAmountQuarterlyEl.value || '') : '',
      primAmountYearly: primAmountYearlyEl ? (primAmountYearlyEl.value || '') : '',
      compactView: !!(compactViewEl && compactViewEl.checked),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function applyCompactView() {
  if (!userSectionEl || !compactViewEl) return;
  userSectionEl.hidden = !!compactViewEl.checked;
  try {
    document.body.classList.toggle('compact-mode', !!compactViewEl.checked);
  } catch {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);
    if (state && typeof state === 'object') {
      if (state.salary != null) salaryEl.value = state.salary;
      if (state.hours != null) hoursEl.value = state.hours;
      if (Array.isArray(state.days)) {
        qsa('.days input[type="checkbox"]').forEach(cb => {
          cb.checked = state.days.includes(cb.value);
        });
      }
      const p = state.prim === 'yes' ? 'yes' : 'none';
      const radio = qsa('input[name="prim"]').find(function(x){return x.value === p;});
      if (radio) radio.checked = true;
      // Reflect prim UI
      const isYes = p === 'yes';
      primDetails.hidden = !isYes;
      if (quarterlyEl) quarterlyEl.checked = !!state.quarterly;
      if (yearlyEl) yearlyEl.checked = !!state.yearly;
      if (primAmountQuarterlyEl && state.primAmountQuarterly != null) primAmountQuarterlyEl.value = state.primAmountQuarterly;
      if (primAmountYearlyEl && state.primAmountYearly != null) primAmountYearlyEl.value = state.primAmountYearly;
      togglePrimAmountStates();

      if (compactViewEl) compactViewEl.checked = !!state.compactView;
      applyCompactView();
    }
  } catch {}
}

if (compactViewEl) {
  compactViewEl.addEventListener('change', function(){ applyCompactView(); saveState(); });
}

// Initial
togglePrimAmountStates();
loadState();
// Ensure money inputs are properly formatted on load
qsa('.money-input').forEach(function(inp){ inp.value = formatMoneyInputString(inp.value); });
recalc();

// PWA: Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    try {
      navigator.serviceWorker.register('/sw.js').catch(function(){});
    } catch(_) {}
  });
}

// PWA: Android install prompt handling
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.hidden = false;
});

if (installBtn) {
  installBtn.addEventListener('click', async function() {
    if (!deferredPrompt) return;
    installBtn.hidden = true;
    try {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch(_) {}
    deferredPrompt = null;
  });
}

window.addEventListener('appinstalled', () => {
  if (installBtn) installBtn.hidden = true;
  deferredPrompt = null;
});

// iOS note: Safari'de A2HS için kullanıcıya paylaş menüsünden “Ana Ekrana Ekle” yönergesi gösterilebilir.
