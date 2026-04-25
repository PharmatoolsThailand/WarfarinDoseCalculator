// --- สีเม็ดยาอ้างอิง ---
const PILL_DEFS = {
    1: { color: '#ffffff', border: '#94a3b8' },
    2: { color: '#f28b30', border: '#f28b30' },
    3: { color: '#0b5394', border: '#0b5394' },
    5: { color: '#e84c95', border: '#e84c95' }
};

const FREQ_TEMPLATES = {
    7: [0, 1, 2, 3, 4, 5, 6],
    6: [0, 1, 2, 3, 4, 5],
    5: [0, 1, 2, 4, 5],
    4: [0, 2, 4, 6],
    3: [0, 2, 4],
    2: [0, 3],
    1: [0]
};

let currentRegimens = [];
let selectedRegimenIndex = 0;
let comboCache = {};
let lastCacheKey = "";

document.addEventListener("DOMContentLoaded", () => {
    const currentDoseSelect = document.getElementById("currentDose");
    const targetDoseSelect = document.getElementById("targetDose");

    // 1. สร้าง Dropdown ครั้งแรก (ระบบจะเช็คว่า 1/4 เม็ดเปิดอยู่หรือไม่)
    updateDropdownOptions();

    currentDoseSelect.value = "11.00";
    targetDoseSelect.value = "11.50";

    currentDoseSelect.addEventListener("change", calculateDisplay);
    targetDoseSelect.addEventListener("change", calculateDisplay);

    // 2. ดักจับ Checkbox 1/4 เม็ดของหน้าหลัก
    const quarterChk = document.getElementById('chk-quarter');
    if (quarterChk) {
        quarterChk.removeAttribute('onchange'); // ลบ onchange เดิมที่ฝังใน HTML ออก
        quarterChk.addEventListener("change", () => {
            updateDropdownOptions();
            calculateDisplay(); // คำนวณใหม่เมื่อเปลี่ยนเงื่อนไข 1/4
        });
    }

    // Set Default Month for Calendar
    let today = new Date();
    let mm = String(today.getMonth() + 1).padStart(2, '0');
    let currentMonthVal = `${today.getFullYear()}-${mm}`;

    if (document.getElementById('startMonth')) {
        document.getElementById('startMonth').value = currentMonthVal;
    }
    if (document.getElementById('endMonth')) {
        document.getElementById('endMonth').value = currentMonthVal;
    }

    initDispenseDates();
    calculateDisplay();
});

// ========================================================
// 🔴 ฟังก์ชันใหม่: อัปเดตตัวเลขใน Dropdown ให้ซิงค์กับสวิตช์ 1/4
// ========================================================
function updateDropdownOptions() {
    const currentDoseSelect = document.getElementById("currentDose");
    const targetDoseSelect = document.getElementById("targetDose");
    const allowQuarter = document.getElementById('chk-quarter') ? document.getElementById('chk-quarter').checked : false;

    // กำหนด Step: ปิด 1/4 ให้ขยับทีละ 0.50 | เปิด 1/4 ให้ขยับทีละ 0.25
    const step = allowQuarter ? 0.25 : 0.50;
    const minDose = step;

    let curVal = parseFloat(currentDoseSelect.value) || 11.00;
    let tarVal = parseFloat(targetDoseSelect.value) || 11.50;

    currentDoseSelect.innerHTML = '';
    targetDoseSelect.innerHTML = '';

    for (let i = minDose; i <= 100; i += step) {
        let value = i.toFixed(2);
        currentDoseSelect.add(new Option(value, value));
        targetDoseSelect.add(new Option(value, value));
    }

    // ปัดเศษค่าเดิมให้ลงล็อคกับ step ปัจจุบัน
    curVal = Math.round(curVal / step) * step;
    tarVal = Math.round(tarVal / step) * step;

    if (curVal < minDose) curVal = minDose;
    if (tarVal < minDose) tarVal = minDose;

    currentDoseSelect.value = curVal.toFixed(2);
    targetDoseSelect.value = tarVal.toFixed(2);
}

function stepDose(elementId, stepValueFromHTML) {
    const selectEl = document.getElementById(elementId);
    const allowQuarter = document.getElementById('chk-quarter') ? document.getElementById('chk-quarter').checked : false;

    // ยกเลิกค่า 0.5 ที่ฝังมาจาก HTML แล้วใช้ step ตามเงื่อนไข 1/4 แทน
    let step = allowQuarter ? 0.25 : 0.50;
    let direction = stepValueFromHTML > 0 ? 1 : -1; // เช็คว่าเป็นปุ่มกด + หรือ -

    let currentValue = parseFloat(selectEl.value);
    let newValue = currentValue + (direction * step);

    if (newValue < step) newValue = step;
    if (newValue > 100) newValue = 100;

    selectEl.value = newValue.toFixed(2);
    calculateDisplay();
}

function applyPercent(percent) {
    const currentDose = parseFloat(document.getElementById("currentDose").value);
    let idealNewDose = currentDose + (currentDose * (percent / 100));

    const allowQuarter = document.getElementById('chk-quarter') ? document.getElementById('chk-quarter').checked : false;
    let step = allowQuarter ? 0.25 : 0.50;

    // ปัดเศษให้ลงตัวที่ step ปัจจุบัน (0.50 หรือ 0.25)
    let snappedDose = Math.round(idealNewDose / step) * step;
    if (snappedDose < step) snappedDose = step;
    if (snappedDose > 100) snappedDose = 100;

    document.getElementById("targetDose").value = snappedDose.toFixed(2);
    calculateDisplay();
}

function calculateDisplay() {
    const currentDose = parseFloat(document.getElementById("currentDose").value);
    const targetDose = parseFloat(document.getElementById("targetDose").value);
    const actualPercentEl = document.getElementById("actualPercent");
    const newDoseDisplayEl = document.getElementById("newDoseDisplay");

    const percentChange = ((targetDose - currentDose) / currentDose) * 100;

    if (percentChange > 0) {
        actualPercentEl.innerHTML = `▲ เพิ่มขึ้น ${percentChange.toFixed(2)}%`;
        actualPercentEl.style.color = "var(--green-text)";
        newDoseDisplayEl.innerHTML = `▲ เพิ่มขึ้น ${targetDose.toFixed(2)} mg/week`;
        newDoseDisplayEl.style.color = "var(--green-text)";
    } else if (percentChange < 0) {
        actualPercentEl.innerHTML = `▼ ลดลง ${Math.abs(percentChange).toFixed(2)}%`;
        actualPercentEl.style.color = "var(--red-text)";
        newDoseDisplayEl.innerHTML = `▼ ลดลง ${targetDose.toFixed(2)} mg/week`;
        newDoseDisplayEl.style.color = "var(--red-text)";
    } else {
        actualPercentEl.innerHTML = `➖ ไม่เปลี่ยนแปลง`;
        actualPercentEl.style.color = "#6c757d";
        newDoseDisplayEl.innerHTML = `➖ ${targetDose.toFixed(2)} mg/week`;
        newDoseDisplayEl.style.color = "#6c757d";
    }

    updateRegimens(targetDose);
}

function updatePillState(size) {
    let label = document.getElementById(`lbl-pill-${size}`);
    let chk = document.getElementById(`chk-${size}`);
    if (chk.checked) label.classList.add('active');
    else label.classList.remove('active');
    calculateDisplay();
}

function getAvailablePills() {
    let available = [];
    if (document.getElementById('chk-1') && document.getElementById('chk-1').checked) available.push(1);
    if (document.getElementById('chk-2') && document.getElementById('chk-2').checked) available.push(2);
    if (document.getElementById('chk-3') && document.getElementById('chk-3').checked) available.push(3);
    if (document.getElementById('chk-5') && document.getElementById('chk-5').checked) available.push(5);
    return available;
}

// --------------------------------------------------------
// สมองกลคำนวณ Regimen (อัปเกรด 1/4)
// --------------------------------------------------------
function findPillCombos(targetDose, allowedSizes, allowQuarter) {
    if (targetDose === 0) return [];

    // 📌 1. ระบบ Cache: ถ้าเคยคำนวณ Dose นี้ด้วยค่ายาเดิมแล้ว ให้ดึงมาใช้เลย ไม่ต้องประมวลผลใหม่
    let cacheKey = `${targetDose}_${allowedSizes.join(',')}_${allowQuarter}`;
    if (comboCache[cacheKey] !== undefined) {
        return comboCache[cacheKey];
    }

    let bestCombo = null;
    let bestScore = Infinity;

    // 📌 2. เตรียมกิ่งการค้นหา (เรียงจากเม็ดใหญ่ไปเล็ก ช่วยให้สมองกลเจอทางที่ดีที่สุดเร็วขึ้น)
    let branches = [];
    let sortedSizes = [...allowedSizes].sort((a, b) => b - a);

    for (let size of sortedSizes) {
        let pDef = PILL_DEFS[size]; // ดึงนิยามเต็มๆ มา
        // เต็มเม็ด
        branches.push({size: size, frac: 1, val: size, hex: pDef.color, border: pDef.border, penalty: 10});
        // ครึ่งเม็ด
        branches.push({size: size, frac: 0.5, val: size/2, hex: pDef.color, border: pDef.border, penalty: 15});
        // เศษ 1/4 เม็ด
        if (allowQuarter) {
            branches.push({size: size, frac: 0.25, val: size/4, hex: pDef.color, border: pDef.border, penalty: 30});
        }
    }

    function search(currentDose, currentCombo, currentScore) {
        if (Math.abs(currentDose - targetDose) < 0.01) {
            if (currentScore < bestScore) {
                bestScore = currentScore;
                bestCombo = [...currentCombo];
            }
            return;
        }

        // 📌 3. ตัดเส้นทางทิ้ง (Pruning): ถ้าคะแนนสะสมเริ่มแย่กว่าทางเลือกที่ดีที่สุดที่เคยเจอ หรือใช้ยาเกิน 6 เม็ด ให้ล้มเลิกเส้นทางนี้ทันที
        if (currentDose > targetDose + 0.01 || currentCombo.length >= 6 || currentScore >= bestScore) {
            return;
        }

        for (let branch of branches) {
            currentCombo.push(branch);
            search(currentDose + branch.val, currentCombo, currentScore + branch.penalty);
            currentCombo.pop();
        }
    }

    search(0, [], 0);

    comboCache[cacheKey] = bestCombo; // บันทึกผลลง Cache
    return bestCombo;
}

function updateRegimens(weeklyDose) {
    if (typeof weeklyDose !== 'number') {
        weeklyDose = parseFloat(document.getElementById('targetDose').value);
    }

    let allowed = getAvailablePills();
    let allowQuarter = document.getElementById('chk-quarter') ? document.getElementById('chk-quarter').checked : false;
    currentRegimens = [];

    if (allowed.length === 0 || weeklyDose <= 0) {
        renderRegimenUI(); calculateDispense(); generateCalendar(); return;
    }

    // 📌 ล้าง Cache ทิ้งเฉพาะตอนที่เปิด/ปิด 1/4 เม็ด หรือติ๊กเลือกขนาดยาใหม่
    let currentCacheConfig = `${allowed.join(',')}_${allowQuarter}`;
    if (lastCacheKey !== currentCacheConfig) {
        comboCache = {};
        lastCacheKey = currentCacheConfig;
    }

    let possibleDoses = [];

    // 📌 4. จำกัดขอบเขต: สมองกลไม่ต้องหาถึง 25mg ทุกรอบ หาแค่ไม่เกินขนาดยารวมต่อสัปดาห์ก็พอ
    let maxDailyTarget = Math.min(25, weeklyDose);

    for (let i = 0.25; i <= maxDailyTarget; i += 0.25) {
        // ส่งตัวแปร allowQuarter เข้าไปในฟังก์ชันด้วย
        let combo = findPillCombos(i, allowed, allowQuarter);
        if (combo) possibleDoses.push({dose: i, combo: combo});
    }

    for (let f = 7; f >= 1; f--) {
        for (let pdA of possibleDoses) {
            let A = pdA.dose;
            if (Math.abs((A * f) - weeklyDose) < 0.01) {
                currentRegimens.push({
                    freq: f, patternA: A, patternB: 0, countA: f, countB: 0,
                    comboA: pdA.combo, comboB: [],
                    totalDose: weeklyDose,
                    score: evaluateScore(A, A, pdA.combo, [], f, 0, f)
                });
            }

            for (let pdB of possibleDoses) {
                let B = pdB.dose;
                if (A === B) continue;
                if (Math.abs(A - B) > 2.0) continue;

                for (let x = 1; x < f; x++) {
                    let y = f - x;
                    if (x < y) continue;
                    if (x === y && A > B) continue;

                    if (Math.abs((x * A + y * B) - weeklyDose) < 0.01) {
                        currentRegimens.push({
                            freq: f, patternA: A, patternB: B, countA: x, countB: y,
                            comboA: pdA.combo, comboB: pdB.combo,
                            totalDose: weeklyDose,
                            score: evaluateScore(A, B, pdA.combo, pdB.combo, x, y, f)
                        });
                    }
                }
            }
        }
    }

    let fullWeekRegimens = currentRegimens.filter(r => r.freq === 7);
    if (fullWeekRegimens.length > 0) currentRegimens = fullWeekRegimens;

    currentRegimens.sort((a, b) => a.score - b.score);
    selectedRegimenIndex = 0;

    renderRegimenUI();
    calculateDispense();
    generateCalendar();
}

function evaluateScore(A, B, comboA, comboB, x, y, freq) {
    let diff = Math.abs(A - B);
    let totalPills = (comboA.length * x) + ((comboB && comboB.length > 0 ? comboB.length : 0) * y);
    let totalHalves = (comboA.filter(p=>p.frac===0.5).length * x) + ((comboB && comboB.length > 0) ? comboB.filter(p=>p.frac===0.5).length * y : 0);
    let totalQuarters = (comboA.filter(p=>p.frac===0.25).length * x) + ((comboB && comboB.length > 0) ? comboB.filter(p=>p.frac===0.25).length * y : 0);

    let gapPenalty = (freq < 3) ? 100000 : 0;
    let skipPenalty = (7 - freq) * 2000;

    // เปลี่ยนตัวคูณคะแนนของการหัก 1/4 ให้สูงขึ้น เพื่อบังคับให้สมองกลโชว์ผลลัพธ์นี้เป็นลำดับท้ายๆ หากมีวิธีอื่นที่หักแค่ครึ่งเม็ด
    return gapPenalty + skipPenalty + (diff * 1000) + (totalPills * 10) + (totalHalves * 5) + (totalQuarters * 50);
}

function generateCellHTML(combo, dose) {
    let html = '<div style="display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:4px; min-height: 24px;">';
    for (let p of combo) {
        if (p.frac === 1) {
            html += `<div class="pill-graphic" style="--sz: 20px; background-color: ${p.hex}; border: 2px solid ${p.border};"></div>`;
        } else if (p.frac === 0.5) {
            html += `<div class="pill-graphic half" style="--sz: 20px; background-color: ${p.hex}; border: 2px solid ${p.border}; border-left-color: ${p.border};"></div>`;
        } else if (p.frac === 0.25) {
            html += `<div class="pill-graphic quarter" style="--sz: 20px; background-color: ${p.hex}; border: 2px solid ${p.border}; border-left-color: ${p.border}; border-top-color: ${p.border};"></div>`;
        }
    }
    html += `</div><div class="dose-text">${dose.toFixed(2).replace(/\.00$/, '')} mg</div>`;
    return `<div class="regimen-cell">${html}</div>`;
}

function selectRegimen(index) {
    selectedRegimenIndex = index;
    renderRegimenUI();
    calculateDispense();
    generateCalendar();
}

function renderRegimenUI() {
    const tbody = document.getElementById('regimen-tbody');
    if (currentRegimens.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 20px; color: #888;">ไม่มีรูปแบบที่เหมาะสมครับ 🥺</td></tr>`;
        return;
    }

    let html = '';
    let displayCount = Math.min(currentRegimens.length, 5);

    for(let i=0; i<displayCount; i++) {
        let reg = currentRegimens[i];
        let daysArr = Array(7).fill(null);

        // เช็คว่าเป็นสูตรที่กำหนดเองหรือไม่
        if (reg.isCustom) {
            daysArr = reg.customDays;
        } else {
            let activeDays = FREQ_TEMPLATES[reg.freq];
            for (let j = 0; j < activeDays.length; j++) {
                let dayIndex = activeDays[j];
                if (j < reg.countA) daysArr[dayIndex] = { dose: reg.patternA, combo: reg.comboA };
                else daysArr[dayIndex] = { dose: reg.patternB, combo: reg.comboB };
            }
        }

        let daysHTML = daysArr.map(d => {
            if (d === null) return `<td><div class="regimen-cell"><div class="pill-empty"></div><div class="dose-empty-text">งด</div></div></td>`;
            else return `<td>${generateCellHTML(d.combo, d.dose)}</td>`;
        });

        let isSelected = (i === selectedRegimenIndex);
        let rowClass = isSelected ? 'selected-regimen' : '';
        let checkedAttr = isSelected ? 'checked' : '';

        // ถ้าเป็นสูตรกำหนดเอง ให้แสดงชื่อ Rank สวยๆ
        let rankLabel = reg.isCustom ? `<span style="color:var(--primary-color); font-weight:700;">กำหนดเอง 🌟</span>` : `แบบที่ ${i + 1}`;

        html += `<tr class="${rowClass}" onclick="selectRegimen(${i})" style="cursor: pointer;">
                    <td class="regimen-rank">
                        <div class="radio-container">
                            <input type="radio" name="regSelect" ${checkedAttr}>
                            <span style="font-size: 14px; margin-top: 5px; text-align: center;">${rankLabel}</span>
                        </div>
                    </td>
                    ${daysHTML.join('')}
                </tr>`;
    }
    tbody.innerHTML = html;
}

// --------------------------------------------------------
// คำนวณจำนวนซองยา และ 1/4
// --------------------------------------------------------
function initDispenseDates() {
    document.getElementById('dispenseDays').value = 30;
    updateDateFromDays();
}

function updateDateFromDays() {
    let days = parseInt(document.getElementById('dispenseDays').value) || 0;
    let d = new Date(); d.setDate(d.getDate() + days);
    document.getElementById('dispenseDate').value = d.toISOString().split('T')[0];
    calculateDispense();
}

function updateDaysFromDate() {
    let dateVal = document.getElementById('dispenseDate').value;
    if (!dateVal) return;
    let d1 = new Date(); d1.setHours(0,0,0,0);
    let d2 = new Date(dateVal); d2.setHours(0,0,0,0);
    let diffDays = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    document.getElementById('dispenseDays').value = Math.max(diffDays, 1);
    calculateDispense();
}

// ========================================================
// 2. ฟังก์ชันคำนวณซองยา (อัปเดตเลย์เอาต์จัดกลุ่ม ซ้าย-ขวา)
// ========================================================
function calculateDispense() {
    const resultContainer = document.getElementById('dispenseResult');
    const dispenseModeEl = document.querySelector('input[name="dispenseType"]:checked');
    const dispenseMode = dispenseModeEl ? dispenseModeEl.value : 'combine';
    let days = parseInt(document.getElementById('dispenseDays').value) || 0;

    if (currentRegimens.length === 0 || days <= 0) { resultContainer.innerHTML = ''; return; }

    let reg = currentRegimens[selectedRegimenIndex];
    let daysArr = Array(7).fill(null);

    // เช็คว่าเป็นสูตรที่กำหนดเองหรือไม่
    if (reg.isCustom) {
        daysArr = reg.customDays.map(d => d ? d.combo : null);
    } else {
        let activeDays = FREQ_TEMPLATES[reg.freq];
        for (let j = 0; j < activeDays.length; j++) {
            daysArr[activeDays[j]] = (j < reg.countA) ? reg.comboA : reg.comboB;
        }
    }

    let todayIdx = (new Date().getDay() + 6) % 7;
    let totals = { 1: { w:0, h:0, q:0 }, 2: { w:0, h:0, q:0 }, 3: { w:0, h:0, q:0 }, 5: { w:0, h:0, q:0 } };

    for (let i = 0; i < days; i++) {
        let combo = daysArr[(todayIdx + i) % 7];
        if (combo) {
            for (let pill of combo) {
                if (pill.frac === 1) totals[pill.size].w += 1;
                else if (pill.frac === 0.5) totals[pill.size].h += 1;
                else if (pill.frac === 0.25) totals[pill.size].q += 1;
            }
        }
    }

    let html = '';
    [1, 2, 3, 5].forEach(size => {
        let {w, h, q} = totals[size];
        if (w > 0 || h > 0 || q > 0) {
            if (dispenseMode === 'combine') {
                let exact = w + (h * 0.5) + (q * 0.25);
                html += `
                <div class="pill-total-item">
                    <div class="pill-name">ยาเม็ด ${size} mg</div>
                    <div class="pill-details" style="justify-content: flex-end;">
                        <div class="dispense-highlight">จ่าย ${Math.ceil(exact)} เม็ด</div>
                    </div>
                </div>`;
            } else {
                if (w > 0) html += `
                <div class="pill-total-item">
                    <div class="pill-name">ยาเม็ด ${size} mg</div>
                    <div class="pill-details">
                        <span class="sub-text-half">ซองเต็มเม็ด</span>
                        <div class="dispense-highlight">จ่าย ${w} เม็ด</div>
                    </div>
                </div>`;
                if (h > 0) html += `
                <div class="pill-total-item">
                    <div class="pill-name">ยาเม็ด ${size} mg</div>
                    <div class="pill-details">
                        <span class="sub-text-half">ซองครึ่งเม็ด (จัด ${h} ซีก)</span>
                        <div class="dispense-highlight">จ่าย ${Math.ceil(h/2)} เม็ด</div>
                    </div>
                </div>`;
                if (q > 0) html += `
                <div class="pill-total-item">
                    <div class="pill-name">ยาเม็ด ${size} mg</div>
                    <div class="pill-details">
                        <span class="sub-text-half">ซอง 1/4 เม็ด (จัด ${q} เสี้ยว)</span>
                        <div class="dispense-highlight">จ่าย ${Math.ceil(q/4)} เม็ด</div>
                    </div>
                </div>`;
            }
        }
    });
    resultContainer.innerHTML = html || '<div style="color:#888; text-align:center;">ไม่มีการใช้ยา</div>';
}

// ========================================================
// 1. ฟังก์ชันวาดปฏิทินบนหน้าเว็บ (พรีวิว)
// ========================================================
function generateCalendar() {
    const startInput = document.getElementById('startMonth').value;
    let endInput = document.getElementById('endMonth').value;
    const printArea = document.getElementById('calendar-print-area');

    if (!printArea) return;

    if (!startInput || typeof currentRegimens === 'undefined' || currentRegimens.length === 0) {
        printArea.innerHTML = '<div style="text-align:center; padding: 40px; color:#64748b; font-size: 16px;">กรุณากด "คำนวณขนาดยา" ก่อนเพื่อสร้างปฏิทินครับ 💊</div>';
        return;
    }

    if (!endInput) {
        endInput = startInput;
        document.getElementById('endMonth').value = startInput;
    }

    let startParts = startInput.split('-');
    let endParts = endInput.split('-');
    if (startParts.length !== 2) return;

    let startYear = parseInt(startParts[0]);
    let startMonthIndex = parseInt(startParts[1]) - 1;
    let endYear = parseInt(endParts[0]);
    let endMonthIndex = parseInt(endParts[1]) - 1;

    let d1 = new Date(startYear, startMonthIndex, 1);
    let d2 = new Date(endYear, endMonthIndex, 1);

    if (d2 < d1) {
        d2 = new Date(d1);
        document.getElementById('endMonth').value = startInput;
        endYear = startYear;
        endMonthIndex = startMonthIndex;
    }

    let html = '';
    let currentYear = startYear;
    let currentMonth = startMonthIndex;

    while (new Date(currentYear, currentMonth, 1) <= d2) {
        html += generateSingleMonthHTML(currentYear, currentMonth + 1);
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
    }

    printArea.innerHTML = html;
}

// ========================================================
// ฟังก์ชันสร้างปฏิทิน 1 เดือน (ฉบับสมบูรณ์)
// ========================================================
function generateSingleMonthHTML(year, month) {
    const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const dateObj = new Date(year, month - 1, 1);

    // ป้องกัน Error กรณีที่ยังไม่ได้คำนวณยา
    if (currentRegimens.length === 0) return '';

    let reg = currentRegimens[selectedRegimenIndex];
    let daysArr = Array(7).fill(null);

    if (reg.isCustom) {
        daysArr = reg.customDays;
    } else {
        let activeDays = FREQ_TEMPLATES[reg.freq];
        for (let j = 0; j < activeDays.length; j++) {
            let dayIndex = activeDays[j];
            if (j < reg.countA) daysArr[dayIndex] = { dose: reg.patternA, combo: reg.comboA };
            else daysArr[dayIndex] = { dose: reg.patternB, combo: reg.comboB };
        }
    }

    let startDayMap = (dateObj.getDay() === 0) ? 6 : dateObj.getDay() - 1;
    let daysInMonth = new Date(year, month, 0).getDate();

    // 1. ดึงข้อมูลผู้ป่วยและ INR
    let pName = document.getElementById('patientName') ? document.getElementById('patientName').value.trim() : '';
    let pHN = document.getElementById('patientHN') ? document.getElementById('patientHN').value.trim() : '';
    let inrMin = document.getElementById('targetINRMin') ? document.getElementById('targetINRMin').value.trim() : '';
    let inrMax = document.getElementById('targetINRMax') ? document.getElementById('targetINRMax').value.trim() : '';

    let targetINR = '';
    if (inrMin !== '' && inrMax !== '') {
        targetINR = `${inrMin} - ${inrMax}`;
    } else if (inrMin !== '') {
        targetINR = `>= ${inrMin}`;
    } else if (inrMax !== '') {
        targetINR = `<= ${inrMax}`;
    }

    // 2. ดึงขนาดยาเป้าหมาย
    let targetDoseInput = document.getElementById('targetDose');
    let targetDoseVal = targetDoseInput ? targetDoseInput.value : (reg.totalDose ? reg.totalDose.toFixed(2) : '0.00');
    if (reg.isCustom) {
        targetDoseVal = reg.totalDose.toFixed(2);
    }

    // 3. สร้างแถบข้อมูลผู้ป่วยบนหัวกระดาษ (จะโชว์ก็ต่อเมื่อมีการกรอกข้อมูล)
    let patientInfoHTML = '';
    if (pName || pHN || targetINR) {
        patientInfoHTML = `<div class="cal-patient-info">`;
        if (pName) patientInfoHTML += `<span>ผู้ป่วย: <strong>${pName}</strong></span>`;
        if (pHN) patientInfoHTML += `<span>HN: <strong>${pHN}</strong></span>`;
        if (targetINR) patientInfoHTML += `<span>INR เป้าหมาย: <strong>${targetINR}</strong></span>`;
        patientInfoHTML += `</div>`;
    }

    // 4. เริ่มวาดตารางปฏิทิน
    let html = `
    <div class="month-page-wrapper">
        <div class="cal-header">
            <h2>ปฏิทินการรับประทานยา Warfarin</h2>
            <p style="margin-bottom:10px;">ประจำเดือน: <strong>${monthNames[month - 1]} ${year + 543}</strong> | ขนาดยาเป้าหมาย: <strong>${targetDoseVal} mg/week</strong></p>
            ${patientInfoHTML}
        </div>
        <table class="cal-grid">
            <thead>
                <tr>
                    <th class="cal-day-name">จันทร์</th><th class="cal-day-name">อังคาร</th><th class="cal-day-name">พุธ</th>
                    <th class="cal-day-name">พฤหัสบดี</th><th class="cal-day-name">ศุกร์</th><th class="cal-day-name">เสาร์</th><th class="cal-day-name">อาทิตย์</th>
                </tr>
            </thead>
            <tbody><tr>`;

    // ใส่ช่องว่างสำหรับวันก่อนหน้าของเดือนนั้นๆ
    for (let i = 0; i < startDayMap; i++) html += `<td class="cal-cell empty"></td>`;

    // วาดวันที่และเม็ดยา
    for (let day = 1; day <= daysInMonth; day++) {
        let dayOfWeek = (startDayMap + day - 1) % 7;
        let regimenDay = daysArr[dayOfWeek];
        let cellContent = `<div class="cal-date">${day}</div><div class="cal-pill-area">`;

        if (regimenDay) {
            let pillHtml = '<div style="display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:4px; margin-bottom: 4px; min-height: 28px;">';
            for (let p of regimenDay.combo) {
                if (p.frac === 1) {
                    pillHtml += `<div class="pill-graphic" style="--sz: 24px; background-color: ${p.hex}; border: 2px solid ${p.border};"></div>`;
                } else if (p.frac === 0.5) {
                    pillHtml += `<div class="pill-graphic half" style="--sz: 24px; background-color: ${p.hex}; border: 2px solid ${p.border}; border-left-color: ${p.border};"></div>`;
                } else if (p.frac === 0.25) {
                    pillHtml += `<div class="pill-graphic quarter" style="--sz: 24px; background-color: ${p.hex}; border: 2px solid ${p.border}; border-left-color: ${p.border}; border-top-color: ${p.border};"></div>`;
                }
            }
            pillHtml += `</div><div class="dose-text" style="font-size:12px; color:#1e293b; font-weight:bold;">${regimenDay.dose.toFixed(2).replace(/\.00$/, '')} mg</div>`;
            cellContent += pillHtml;
        } else {
            cellContent += `<div class="pill-empty" style="margin-bottom: 4px; height: 28px;"></div><div class="dose-empty-text" style="font-size:12px;">งดยา</div>`;
        }
        cellContent += `</div>`;
        html += `<td class="cal-cell">${cellContent}</td>`;

        // ขึ้นบรรทัดใหม่เมื่อถึงวันอาทิตย์
        if (dayOfWeek === 6 && day < daysInMonth) html += `</tr><tr>`;
    }

    // ใส่ช่องว่างปิดท้ายเดือน
    let lastDayIndex = (startDayMap + daysInMonth - 1) % 7;
    for (let i = lastDayIndex + 1; i <= 6; i++) html += `<td class="cal-cell empty"></td>`;

    html += `</tr></tbody></table>`;
    html += `<div class="note-area" style="margin-top:15px; font-size:14px; border-top:1px dashed #ccc; padding-top:10px;"><strong>หมายเหตุแพทย์/เภสัชกร:</strong> ....................................................................................................</div>`;
    html += `</div>`;

    return html;
}

// ========================================================
// 3. ฟังก์ชันเปิดแท็บใหม่ แปลงเป็นรูปภาพ (แก้ปัญหาตกขอบ 100%)
// ========================================================
function printCalendar() {
    const paperSize = document.getElementById('paperSize').value;
    const printArea = document.getElementById('calendar-print-area');

    if (!printArea || printArea.innerHTML.includes('กรุณากด "คำนวณขนาดยา"')) {
        alert('กรุณาคำนวณขนาดยาก่อนทำการพิมพ์ครับ'); return;
    }

    const isA4 = (paperSize === 'A4');

    const pillSize = isA4 ? '36px' : '26px';
    const fontSizeHeader = isA4 ? '32px' : '20px';
    const fontSizeSub = isA4 ? '20px' : '14px';
    const fontSizeDay = isA4 ? '20px' : '14px';
    const fontSizeDate = isA4 ? '22px' : '16px';
    const fontSizeDose = isA4 ? '16px' : '12px';
    const fontSizeNote = isA4 ? '18px' : '14px';

    const printWindow = window.open('', '_blank');

    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
            <meta charset="UTF-8">
            <title>พิมพ์ปฏิทิน (${paperSize})</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
            <style>
                body, html { margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Sarabun', sans-serif;}

                #capture-source-container { position: absolute; top: 0; left: 0; z-index: 1; }
                #print-image-container { display: none; background: #fff; width: 100%; position: relative; z-index: 10; }

                #loading-overlay {
                    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                    background: #fff; z-index: 9999;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                }

                @media print {
                    @page { size: ${paperSize} landscape; margin: 0 !important; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    body { background: white; margin: 0; padding: 0; }

                    #loading-overlay, #capture-source-container { display: none !important; }
                    #print-image-container { display: flex !important; flex-direction: column; align-items: center; }

                    .print-page {
                        max-width: 100vw;
                        max-height: 98vh;
                        width: 100%;
                        height: 100%;
                        object-fit: contain;
                        display: block;
                        margin: 0 auto;
                        page-break-after: always;
                    }
                    .print-page:last-child { page-break-after: auto; }
                }

                .month-capture {
                    background: #fff;
                    width: ${isA4 ? '1123px' : '794px'};
                    min-height: ${isA4 ? '794px' : '559px'};
                    height: auto;
                    padding: ${isA4 ? '20px' : '15px'};
                    box-sizing: border-box;
                    display: flex; flex-direction: column;
                }

                .cal-header { text-align: center; margin-bottom: 10px; }
                .cal-header h2 { margin: 0; color: #0d7b6c; font-size: ${fontSizeHeader}; font-weight: 700;}
                .cal-header p { margin: 5px 0 10px 0; color: #475569; font-size: ${fontSizeSub}; }

                .cal-grid { width: 100%; height: 100%; border-collapse: collapse; border: 3px solid #0d7b6c; table-layout: fixed; }
                .cal-grid th, .cal-grid td { border: 1px solid #cbd5e1; box-sizing: border-box; }
                .cal-day-name { background-color: #0d7b6c; color: white; text-align: center; font-weight: 600; padding: ${isA4 ? '10px' : '5px'}; font-size: ${fontSizeDay}; height: ${isA4 ? '50px' : '35px'};}

                .cal-cell { vertical-align: top; padding: ${isA4 ? '8px' : '4px'}; height: auto; }
                .cal-cell.empty { background-color: #f8fafc; }

                .cal-date { font-weight: bold; font-size: ${fontSizeDate}; color: #334155; border-bottom: 2px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 10px; text-align: left;}
                .cal-pill-area { display: flex; flex-direction: column; align-items: center; gap: ${isA4 ? '6px' : '3px'}; }

                .pill-graphic { display: inline-block; width: ${pillSize}; height: ${pillSize}; border-radius: 50%; border: 2px solid rgba(0,0,0,0.1); }
                .dose-text { font-size: ${fontSizeDose}; font-weight: bold; color: #1e293b; margin-top: 5px; text-align: center;}
                .note-area { margin-top: 15px; font-size: ${fontSizeNote}; border-top: 1px dashed #ccc; padding-top: 10px; color: #475569; }

                .pill-graphic { --sz: ${pillSize} !important; }
                .pill-graphic.half { width: calc(var(--sz) / 2) !important; border-radius: 0 100px 100px 0 !important; border-left-style: dashed !important; border-left-width: 1.5px !important; }
                .pill-graphic.quarter { width: calc(var(--sz) / 2) !important; height: calc(var(--sz) / 2) !important; border-radius: 0 0 100px 0 !important; border-left-style: dashed !important; border-top-style: dashed !important; align-self: flex-end; }

                /* 🔴 CSS สำหรับแสดงข้อมูลผู้ป่วยและเป้าหมาย INR ในหน้า Print */
                .cal-patient-info { display: flex; justify-content: center; gap: 30px; margin-top: 5px; font-size: ${isA4 ? '20px' : '14px'}; color: #334155;}
                .cal-patient-info strong { color: #0d7b6c; font-weight: 600;}
            </style>
        </head>
        <body>
            <div id="loading-overlay">
                <h2 style="color: #0d7b6c;">⏳ กำลังแปลงปฏิทิน...</h2>
                <p style="color: #475569;">ระบบกำลังประมวลผลแยกแต่ละเดือนให้อยู่คนละหน้าครับ</p>
            </div>

            <div id="capture-source-container">
                ${printArea.innerHTML}
            </div>

            <div id="print-image-container"></div>

            <script>
                window.onload = async function() {
                    if (typeof html2canvas === 'undefined') {
                        document.getElementById('loading-overlay').innerHTML = '<h2 style="color: red;">❌ โหลดเครื่องมือแปลงภาพไม่สำเร็จ</h2><p>กรุณาตรวจสอบอินเทอร์เน็ตของคุณครับ</p>';
                        return;
                    }

                    const monthWrappers = document.querySelectorAll('.month-page-wrapper');
                    const printContainer = document.getElementById('print-image-container');

                    monthWrappers.forEach(el => el.className = 'month-capture');

                    for(let i = 0; i < monthWrappers.length; i++) {
                        const canvas = await html2canvas(monthWrappers[i], {
                            scale: 3,
                            useCORS: true,
                            logging: false,
                            backgroundColor: "#ffffff"
                        });

                        const img = document.createElement('img');
                        img.src = canvas.toDataURL('image/png', 1.0);
                        img.className = 'print-page';
                        printContainer.appendChild(img);
                    }

                    document.getElementById('loading-overlay').style.display = 'none';
                    document.getElementById('capture-source-container').style.display = 'none';
                    printContainer.style.display = 'block';

                    setTimeout(() => { window.print(); }, 500);
                };
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ========================================================
// ระบบจัดการ Changelog Modal (เด้งทุกครั้งที่เข้าเว็บ)
// ========================================================
document.addEventListener("DOMContentLoaded", () => {
    // สั่งให้เปิด Modal ทันทีที่โหลดหน้าเว็บเสร็จ โดยไม่ต้องเช็คประวัติ
    openChangelog();
});

function openChangelog() {
    document.getElementById('changelogModal').classList.add('show-modal');
    // ปิดการเลื่อนหน้าจอชั่วคราวเวลาเปิด Modal
    document.body.style.overflow = 'hidden';
}

function closeChangelog() {
    document.getElementById('changelogModal').classList.remove('show-modal');
    // คืนค่าการเลื่อนหน้าจอ
    document.body.style.overflow = 'auto';

    // (เอาส่วน localStorage ออกไปแล้ว ระบบเลยจะไม่จำว่าเคยกดรับทราบแล้ว)
}

// ========================================================
// ระบบกำหนดสูตรยาเอง (เวอร์ชัน Sync กับปุ่มหลักข้างนอก)
// ========================================================
function openCustomModal() {
    renderCustomModalContent();
    document.getElementById('customRegimenModal').classList.add('show-modal');
    document.body.style.overflow = 'hidden';
}

// ฟังก์ชันแยกสำหรับวาดเนื้อหาใน Modal (อัปเดตรองรับ Grid 2 คอลัมน์)
function renderCustomModalContent() {
    let allowed = getAvailablePills();
    let allowQuarter = document.getElementById('chk-quarter').checked;

    window.customValidDoses = [{dose: 0, combo: []}];
    if (allowed.length > 0) {
        for (let i = 0.25; i <= 25; i += 0.25) {
            let combo = findPillCombos(i, allowed, allowQuarter);
            if (combo) window.customValidDoses.push({dose: i, combo: combo});
        }
    }

    let pillSelectorsHtml = `
        <div class="modal-pill-selectors">
            ${[1, 2, 3, 5].map(size => {
                let mainChk = document.getElementById(`chk-${size}`);
                let isActive = mainChk && mainChk.checked ? 'active' : '';
                let isChecked = mainChk && mainChk.checked ? 'checked' : '';
                let def = PILL_DEFS[size];
                return `
                <label class="pill-checkbox-label ${isActive}" id="modal-lbl-${size}">
                    <input type="checkbox" onchange="syncPillSelection(${size})" ${isChecked}>
                    <div class="pill-icon" style="background-color: ${def.color}; border: 2px solid ${def.border}; box-sizing: border-box;"></div>
                    <span>เม็ด ${size} mg</span>
                </label>`;
            }).join('')}
            <div class="modal-quarter-wrapper">
                <label class="quarter-toggle">
                    <input type="checkbox" id="modal-chk-quarter" onchange="syncQuarterSelection()" ${allowQuarter ? 'checked' : ''}>
                    <div class="quarter-btn-content">
                        <span class="quarter-icon">✂️</span>
                        <span>อนุญาตหัก 1/4 เม็ด</span>
                    </div>
                </label>
            </div>
        </div>
    `;

    const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
    let optionsHtml = window.customValidDoses.map((item, idx) =>
        `<option value="${idx}">${item.dose === 0 ? 'งด' : item.dose.toFixed(2) + ' mg'}</option>`
    ).join('');

    let currentReg = currentRegimens[selectedRegimenIndex];
    let prefillValues = Array(7).fill(0);
    if (currentReg && currentReg.isCustom) {
        prefillValues = currentReg.customDays.map(dayData => {
            if (!dayData) return 0;
            let matchIdx = window.customValidDoses.findIndex(v => Math.abs(v.dose - dayData.dose) < 0.01);
            return matchIdx !== -1 ? matchIdx : 0;
        });
    }

    // 🔴 จัดกลุ่มแถววันทั้ง 7 ด้วย div คลาส custom-days-grid
    let daysHtml = '<div class="custom-days-grid">';
    for(let i=0; i<7; i++) {
        daysHtml += `
        <div class="custom-day-row">
            <span class="custom-day-label">${days[i]}</span>
            <div class="select-stepper-group">
                <button class="btn-modal-step" onclick="stepCustomDay(${i}, -1)">-</button>
                <select id="custom-day-${i}" onchange="updateCustomTotal()">${optionsHtml}</select>
                <button class="btn-modal-step" onclick="stepCustomDay(${i}, 1)">+</button>
            </div>
        </div>`;
    }
    daysHtml += '</div>';

    document.getElementById('custom-days-container').innerHTML = pillSelectorsHtml + daysHtml;

    for(let i=0; i<7; i++) {
        document.getElementById(`custom-day-${i}`).value = prefillValues[i];
    }
    updateCustomTotal();
}

// ฟังก์ชันซิงค์การเลือกเม็ดยา 2, 3, 5 mg
function syncPillSelection(size) {
    // 1. เปลี่ยนสถานะที่ปุ่มหลักด้านนอก
    let mainChk = document.getElementById(`chk-${size}`);
    mainChk.checked = !mainChk.checked;

    // 2. เรียกฟังก์ชันเดิมเพื่อให้ UI ข้างนอกเปลี่ยนตาม (สีปุ่ม)
    updatePillState(size);

    // 3. วาด Modal ใหม่เพื่อให้ตัวเลือกใน Dropdown อัปเดตตามเม็ดยาที่เหลืออยู่
    renderCustomModalContent();
}

// ฟังก์ชันซิงค์การหัก 1/4 เม็ด
function syncQuarterSelection() {
    let mainQuarter = document.getElementById('chk-quarter');
    mainQuarter.checked = document.getElementById('modal-chk-quarter').checked;

    // 🔴 เพิ่มบรรทัดนี้ เพื่อให้ปุ่ม Dropdown หลักอัปเดตตัวเลือกทันทีเวลาแก้ใน Modal
    updateDropdownOptions();

    renderCustomModalContent();
}

function stepCustomDay(dayIndex, direction) {
    const selectEl = document.getElementById(`custom-day-${dayIndex}`);
    if (!selectEl) return;
    let currentIndex = parseInt(selectEl.value);
    let newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < window.customValidDoses.length) {
        selectEl.value = newIndex;
        updateCustomTotal();
    }
}

function updateCustomTotal() {
    let total = 0;
    for(let i=0; i<7; i++) {
        let el = document.getElementById(`custom-day-${i}`);
        if(el) total += window.customValidDoses[el.value].dose;
    }
    document.getElementById('custom-total-display').innerText = `รวม: ${total.toFixed(2)} mg/week`;
}

function closeCustomModal() {
    document.getElementById('customRegimenModal').classList.remove('show-modal');
    document.body.style.overflow = 'auto';
}

function applyCustomRegimen() {
    let customDays = [];
    let total = 0;
    for(let i=0; i<7; i++) {
        let idx = document.getElementById(`custom-day-${i}`).value;
        let data = window.customValidDoses[idx];
        if (data.dose === 0) customDays.push(null);
        else customDays.push({dose: data.dose, combo: data.combo});
        total += data.dose;
    }
    if (total === 0) { alert("กรุณาระบุขนาดยาอย่างน้อย 1 วันครับ"); return; }

    document.getElementById("targetDose").value = total.toFixed(2);
    updateRegimens(total); // สั่ง AI คำนวณอันอื่นเผื่อไว้ด้วย

    let newCustom = { isCustom: true, customDays: customDays, totalDose: total, score: -999999 };
    currentRegimens.unshift(newCustom);
    selectedRegimenIndex = 0;

    // อัปเดต UI หน้าหลัก
    const currentDose = parseFloat(document.getElementById("currentDose").value);
    const actualPercentEl = document.getElementById("actualPercent");
    const newDoseDisplayEl = document.getElementById("newDoseDisplay");
    const percentChange = ((total - currentDose) / currentDose) * 100;

    if (percentChange > 0) {
        actualPercentEl.innerHTML = `▲ เพิ่มขึ้น ${percentChange.toFixed(2)}%`;
        actualPercentEl.style.color = "var(--green-text)";
        newDoseDisplayEl.innerHTML = `▲ เพิ่มขึ้น ${total.toFixed(2)} mg/week`;
        newDoseDisplayEl.style.color = "var(--green-text)";
    } else if (percentChange < 0) {
        actualPercentEl.innerHTML = `▼ ลดลง ${Math.abs(percentChange).toFixed(2)}%`;
        actualPercentEl.style.color = "var(--red-text)";
        newDoseDisplayEl.innerHTML = `▼ ลดลง ${total.toFixed(2)} mg/week`;
        newDoseDisplayEl.style.color = "var(--red-text)";
    } else {
        actualPercentEl.innerHTML = `➖ ไม่เปลี่ยนแปลง`;
        actualPercentEl.style.color = "#6c757d";
        newDoseDisplayEl.innerHTML = `➖ ${total.toFixed(2)} mg/week`;
        newDoseDisplayEl.style.color = "#6c757d";
    }

    renderRegimenUI();
    calculateDispense();
    generateCalendar();
    closeCustomModal();
}

// ========================================================
// ระบบตั้งค่าข้อมูลปฏิทิน (Calendar Settings Modal)
// ========================================================
function openCalendarSettingsModal() {
    document.getElementById('calendarSettingsModal').classList.add('show-modal');
    document.body.style.overflow = 'hidden';
}

function closeCalendarSettingsModal() {
    document.getElementById('calendarSettingsModal').classList.remove('show-modal');
    document.body.style.overflow = 'auto';

    // อัปเดตปฏิทินอีกครั้งเผื่อมีข้อมูลเปลี่ยน
    generateCalendar();
}

// ========================================================
// ฟังก์ชันล้างข้อมูลผู้ป่วย (Calendar Settings)
// ========================================================
function clearCalendarSettings() {
    if (confirm("คุณต้องการล้างข้อมูลผู้ป่วยและค่า INR ทั้งหมดใช่หรือไม่?")) {
        document.getElementById('patientName').value = '';
        document.getElementById('patientHN').value = '';
        document.getElementById('targetINRMin').value = '2.0';
        document.getElementById('targetINRMax').value = '3.0';

        // อัปเดตปฏิทินทันทีหลังจากล้างค่า
        generateCalendar();
    }
}