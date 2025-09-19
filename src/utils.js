// Pure utility functions for calculations and formatting

// Parse money string with thousands dots only, no decimals
export function parseMoney(input) {
  try {
    const digits = String(input || '').replace(/\D/g, '');
    const n = parseInt(digits, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

// Format money input as thousands with dots (no decimals)
export function formatMoneyInputString(input) {
  let s = String(input || '');
  s = s.replace(/\D/g, '');
  s = s.replace(/^0+(?=\d)/, '');
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Group integer with dots for thousands
export function formatIntGrouping(n) {
  const v = Math.trunc(Number(n) || 0);
  const s = String(Math.abs(v));
  const grouped = s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (v < 0 ? '-' : '') + grouped;
}

// Convert float hours to "X saat Y dakika"
export function hoursToHM(value) {
  const totalMinutes = Math.round((Number(value) || 0) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${formatIntGrouping(hours)} saat ${minutes} dakika`;
}

// Average days per month from selected days per week
export function getAvgDaysFromSelected(selectedPerWeek) {
  const sel = Number(selectedPerWeek) || 0;
  return (sel / 7) * (365.25 / 12);
}

// Compute effective monthly income from base + prims
export function computeEffectiveMonthlyIncomePure(baseSalary, opts = {}) {
  const { quarterly = false, quarterlyAmount = 0, yearly = false, yearlyAmount = 0 } = opts;
  let s = Math.max(0, Number(baseSalary) || 0);
  if (quarterly) s += Math.max(0, Number(quarterlyAmount) || 0) / 3;
  if (yearly) s += Math.max(0, Number(yearlyAmount) || 0) / 12;
  return s;
}
