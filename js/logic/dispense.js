// นับจำนวนเม็ดยาที่ต้องจ่ายตามจำนวนวัน โดยเริ่มนับจากวันนี้

function getDispenseDays() {
    const el = document.getElementById('dispenseDays');
    const raw = parseInt(el ? el.value : '', 10);
    return clamp(isFinite(raw) ? raw : 0, 0, LIMITS.MAX_DISPENSE_DAYS);
}

function getDispenseMode() {
    const el = document.querySelector('input[name="dispenseType"]:checked');
    return el ? el.value : 'combine';
}

const FRAC_KEYS = { 1: 'w', 0.5: 'h', 0.25: 'q' };

// รวมจำนวนชิ้นและจำนวน "วันที่ต้องหยิบจากซองนั้น" แยกตามขนาดเม็ดยา
// วันที่กินเม็ดเดียวกัน 2 เม็ด นับเป็น 1 วัน เพราะเป็นจำนวนวันที่ซองถูกใช้ ไม่ใช่จำนวนชิ้น
function computeDispenseTotals(daysArr, days) {
    const totals = {};
    PILL_SIZES.forEach(size => {
        totals[size] = { w: 0, h: 0, q: 0, dayW: 0, dayH: 0, dayQ: 0, dayAny: 0 };
    });

    const todayIdx = mondayIndex(new Date());

    for (let i = 0; i < days; i++) {
        const dayData = daysArr[(todayIdx + i) % 7];
        const combo = dayData ? dayData.combo : null;
        if (!combo) continue;

        const seen = new Set();

        for (const pill of combo) {
            const key = FRAC_KEYS[pill.frac];
            if (!key) continue;
            totals[pill.size][key] += 1;
            seen.add(`${pill.size}|${key}`);
        }

        const sizesToday = new Set();
        seen.forEach(entry => {
            const [size, key] = entry.split('|');
            totals[size]['day' + key.toUpperCase()] += 1;
            sizesToday.add(size);
        });
        sizesToday.forEach(size => { totals[size].dayAny += 1; });
    }

    return totals;
}

// จัดเป็นกลุ่มตามขนาดเม็ดยา — หนึ่งกลุ่มคือหนึ่งรายการที่ต้องเบิกจากคลัง
function buildDispenseGroups(totals, mode) {
    return PILL_SIZES.map(size => {
        const t = totals[size];
        if (t.w === 0 && t.h === 0 && t.q === 0) return null;

        const lines = [];

        if (mode === 'combine') {
            lines.push({
                label: 'ทุกรูปแบบรวมกัน',
                days: t.dayAny,
                pills: Math.ceil(t.w + t.h * 0.5 + t.q * 0.25),
                note: ''
            });
        } else {
            if (t.w > 0) {
                lines.push({ label: 'ซองเต็มเม็ด', days: t.dayW, pills: t.w, note: '' });
            }
            if (t.h > 0) {
                lines.push({
                    label: 'ซองครึ่งเม็ด', days: t.dayH, pills: Math.ceil(t.h / 2),
                    note: `หักครึ่ง ${t.h} ซีก`
                });
            }
            if (t.q > 0) {
                lines.push({
                    label: 'ซอง ¼ เม็ด', days: t.dayQ, pills: Math.ceil(t.q / 4),
                    note: `หัก ¼ จำนวน ${t.q} เสี้ยว`
                });
            }
        }

        const totalPills = lines.reduce((sum, l) => sum + l.pills, 0);
        return { size, def: PILL_DEFS[size], lines, totalPills };
    }).filter(Boolean);
}
