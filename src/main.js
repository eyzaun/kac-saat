import './style.css'

// Render UI
const app = document.querySelector('#app');
app.innerHTML = `
  <div class="container" role="application" aria-label="Kaç Saat Hesaplayıcı">
    <h1>Kaç Saat Ulan Bu?</h1>
    <button id="installBtn" class="install-btn" hidden>Yükle</button>
    <form id="calcForm" novalidate>
      <label for="salary">Aylık Maaş (TL):</label>
      <input type="number" id="salary" placeholder="Örneğin: 5000" inputmode="decimal" min="0" step="0.01" required>
      
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
          <label><input type="checkbox" id="quarterly"> 3 Ayda Bir</label>
          <label for="primAmountQuarterly" class="sr-only">3 Ayda Bir Prim Miktarı</label>
          <input type="number" id="primAmountQuarterly" placeholder="Maaşla aynı" inputmode="decimal" min="0" step="0.01">
          
          <label><input type="checkbox" id="yearly"> 12 Ayda Bir</label>
          <label for="primAmountYearly" class="sr-only">12 Ayda Bir Prim Miktarı</label>
          <input type="number" id="primAmountYearly" placeholder="Maaşla aynı" inputmode="decimal" min="0" step="0.01">
        </div>
      </div>

      <label for="price">Eşya Fiyatı (TL):</label>
      <input type="number" id="price" placeholder="Örneğin: 1000" inputmode="decimal" min="0" step="0.01" required>
      
      <!-- Otomatik hesaplama: buton kaldırıldı -->
    </form>
    <div id="result" aria-live="polite" hidden></div>
  </div>
`;

// Helpers
const qs = (s, el=document) => el.querySelector(s);
const qsa = (s, el=document) => Array.from(el.querySelectorAll(s));
const num = (v) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const clampPos = (n) => (n > 0 ? n : 0);

function formatTL(value) {
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(value || 0);
  } catch {
    return `${(value || 0).toFixed(2)} TL`;
  }
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

// Prevent accidental form submit (Enter)
formEl.addEventListener('submit', (e) => e.preventDefault());

// Set defaults when salary changes
salaryEl.addEventListener('input', () => {
  const s = clampPos(num(salaryEl.value));
  primAmountQuarterlyEl.value = s ? String(s) : '';
  primAmountYearlyEl.value = s ? String(s) : '';
  recalc();
});

function togglePrimAmountStates() {
  if (primAmountQuarterlyEl) primAmountQuarterlyEl.disabled = !quarterlyEl?.checked;
  if (primAmountYearlyEl) primAmountYearlyEl.disabled = !yearlyEl?.checked;
}

// Toggle prim details
primRadios.forEach(r => {
  r.addEventListener('change', () => {
    const isYes = qsa('input[name="prim"]').find(x => x.checked)?.value === 'yes';
    primDetails.hidden = !isYes;
    if (!isYes) {
      if (quarterlyEl) quarterlyEl.checked = false;
      if (yearlyEl) yearlyEl.checked = false;
      togglePrimAmountStates();
    } else {
      const s = clampPos(num(salaryEl.value));
      if (primAmountQuarterlyEl && (!primAmountQuarterlyEl.value || primAmountQuarterlyEl.value === '0')) primAmountQuarterlyEl.value = s ? String(s) : '';
      if (primAmountYearlyEl && (!primAmountYearlyEl.value || primAmountYearlyEl.value === '0')) primAmountYearlyEl.value = s ? String(s) : '';
      togglePrimAmountStates();
    }
    recalc();
  });
});

;[hoursEl, priceEl, primAmountQuarterlyEl, primAmountYearlyEl, quarterlyEl, yearlyEl].forEach(el => {
  if (!el) return;
  el.addEventListener('input', () => { togglePrimAmountStates(); recalc(); });
  el.addEventListener('change', () => { togglePrimAmountStates(); recalc(); });
});

// Days inputs
qsa('.days input[type="checkbox"]').forEach(cb => {
  cb.addEventListener('change', recalc);
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
  let s = clampPos(num(salaryEl.value));
  const primChoice = qsa('input[name="prim"]').find(x => x.checked)?.value;
  if (primChoice === 'yes') {
    if (quarterlyEl?.checked) s += clampPos(num(primAmountQuarterlyEl.value)) / 3;
    if (yearlyEl?.checked) s += clampPos(num(primAmountYearlyEl.value)) / 12;
  }
  return s;
}

function isValid() {
  if (num(salaryEl.value) <= 0) return false;
  if (getSelectedDaysPerWeek() === 0) return false;
  if (num(hoursEl.value) <= 0) return false;
  if (num(priceEl.value) <= 0) return false;
  const primChoice = qsa('input[name="prim"]').find(x => x.checked)?.value;
  if (primChoice === 'yes') {
    if (!quarterlyEl?.checked && !yearlyEl?.checked) return false;
    if (quarterlyEl?.checked && num(primAmountQuarterlyEl.value) <= 0) return false;
    if (yearlyEl?.checked && num(primAmountYearlyEl.value) <= 0) return false;
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
  const price = clampPos(num(priceEl.value));
  const avgDaysPerMonth = getAvgDaysPerMonth();

  const monthlyWorkHours = avgDaysPerMonth * dailyHours;
  const hourlyRate = monthlyWorkHours > 0 ? (monthlyIncome / monthlyWorkHours) : 0;
  const totalHours = hourlyRate > 0 ? (price / hourlyRate) : 0;

  const workingDaysNeeded = dailyHours > 0 ? (totalHours / dailyHours) : 0;

  resultEl.innerHTML = `
    <div>
      <p>Bu eşyayı almak için yaklaşık <strong>${totalHours.toFixed(2)} saat</strong> çalışmanız lazım.</p>
      <p>Bu, yaklaşık <strong>${workingDaysNeeded.toFixed(2)} iş günü</strong> eder.</p>
      <hr style="border-color: rgba(255,255,255,0.1);">
      <p>Aylık efektif gelir: <strong>${formatTL(monthlyIncome)}</strong></p>
      <p>Aylık ortalama çalışma saati: <strong>${monthlyWorkHours.toFixed(2)} saat</strong></p>
      <p>Saatlik kazanç: <strong>${formatTL(hourlyRate)}</strong></p>
      <p>Eşya fiyatı: <strong>${formatTL(price)}</strong></p>
    </div>
  `;
  resultEl.hidden = false;
}

// Initial
togglePrimAmountStates();
recalc();

// PWA: Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// PWA: Android install prompt handling
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.hidden = false;
});

installBtn?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  installBtn.hidden = true;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice.catch(() => {});
  deferredPrompt = null;
});

window.addEventListener('appinstalled', () => {
  if (installBtn) installBtn.hidden = true;
  deferredPrompt = null;
});

// iOS note: Safari'de A2HS için kullanıcıya paylaş menüsünden “Ana Ekrana Ekle” yönergesi gösterilebilir.
