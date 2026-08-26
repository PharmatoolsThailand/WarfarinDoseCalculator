// ตัวช่วยที่ใช้ร่วมกันหลายไฟล์ — ไม่มี state ของตัวเอง

function escapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ต้องอ่านค่าจากปฏิทินท้องถิ่น ไม่ใช่ toISOString() ซึ่งแปลงเป็น UTC
// แล้วทำให้วันนัดคลาดไป 1 วันทุกครั้งที่ใช้งานก่อน 07:00 น. (UTC+7)
function toLocalISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function clamp(value, min, max) {
    if (!isFinite(value)) return min;
    return Math.min(Math.max(value, min), max);
}

function roundToStep(value, step) {
    return Math.round(value / step) * step;
}

// 11.00 → "11", 11.50 → "11.5" — ตัดศูนย์ท้ายให้อ่านง่ายบนปฏิทินและการ์ด
function fmtDose(value) {
    return Number(value).toFixed(2).replace(/\.?0+$/, '');
}

function fmtWeekly(value) {
    return Number(value).toFixed(2);
}

// ดัชนีวันของสัปดาห์แบบจันทร์ = 0
function mondayIndex(date) {
    return (date.getDay() + 6) % 7;
}

function parseMonthInput(value) {
    if (!value) return null;
    const parts = value.split('-');
    if (parts.length !== 2) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (!isFinite(year) || !isFinite(month) || month < 1 || month > 12) return null;
    if (year < LIMITS.MIN_YEAR || year > LIMITS.MAX_YEAR) return null;
    return { year, monthIndex: month - 1 };
}

function monthInputValue(year, monthIndex) {
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}
