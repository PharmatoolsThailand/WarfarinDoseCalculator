// --- สีเม็ดยาอ้างอิง ---
const PILL_DEFS = {
    2: { color: '#f28b30' },
    3: { color: '#0b5394' },
    5: { color: '#e84c95' }
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

document.addEventListener("DOMContentLoaded", () => {
    const currentDoseSelect = document.getElementById("currentDose");
    const targetDoseSelect = document.getElementById("targetDose");

    for (let i = 0.5; i <= 100; i += 0.5) {
        let value = i.toFixed(1);
        currentDoseSelect.add(new Option(value, value));
        targetDoseSelect.add(new Option(value, value));
    }

    currentDoseSelect.value = "11.0";
    targetDoseSelect.value = "11.5";

    currentDoseSelect.addEventListener("change", calculateDisplay);
    targetDoseSelect.addEventListener("change", calculateDisplay);

    initDispenseDates();
    calculateDisplay();
});

function stepDose(elementId, stepValue) {
    const selectEl = document.getElementById(elementId);
    let currentValue = parseFloat(selectEl.value);
    let newValue = currentValue + stepValue;
    if (newValue < 0.5) newValue = 0.5;
    if (newValue > 100) newValue = 100;
    selectEl.value = newValue.toFixed(1);
    calculateDisplay();
}

function applyPercent(percent) {
    const currentDose = parseFloat(document.getElementById("currentDose").value);
    let idealNewDose = currentDose + (currentDose * (percent / 100));
    let snappedDose = Math.round(idealNewDose * 2) / 2;
    if (snappedDose < 0.5) snappedDose = 0.5;
    if (snappedDose > 100) snappedDose = 100;
    document.getElementById("targetDose").value = snappedDose.toFixed(1);
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
        newDoseDisplayEl.innerHTML = `▲ เพิ่มขึ้น ${targetDose.toFixed(1)} mg/week`;
        newDoseDisplayEl.style.color = "var(--green-text)";
    } else if (percentChange < 0) {
        actualPercentEl.innerHTML = `▼ ลดลง ${Math.abs(percentChange).toFixed(2)}%`;
        actualPercentEl.style.color = "var(--red-text)";
        newDoseDisplayEl.innerHTML = `▼ ลดลง ${targetDose.toFixed(1)} mg/week`;
        newDoseDisplayEl.style.color = "var(--red-text)";
    } else {
        actualPercentEl.innerHTML = `➖ ไม่เปลี่ยนแปลง`;
        actualPercentEl.style.color = "#6c757d";
        newDoseDisplayEl.innerHTML = `➖ ${targetDose.toFixed(1)} mg/week`;
        newDoseDisplayEl.style.color = "#6c757d";
    }

    updateRegimens(targetDose);
}

// --------------------------------------------------------
// สมองกลคำนวณ Regimen
// --------------------------------------------------------

function updatePillState(size) {
    let label = document.getElementById(`lbl-pill-${size}`);
    let chk = document.getElementById(`chk-${size}`);
    if (chk.checked) label.classList.add('active');
    else label.classList.remove('active');
    calculateDisplay();
}

function getAvailablePills() {
    let available = [];
    if (document.getElementById('chk-2').checked) available.push(2);
    if (document.getElementById('chk-3').checked) available.push(3);
    if (document.getElementById('chk-5').checked) available.push(5);
    return available;
}

function findPillCombos(targetDose, allowedSizes) {
    if (targetDose === 0) return [];
    let bestCombo = null;
    let bestScore = Infinity;

    function search(currentDose, currentCombo) {
        if (currentDose === targetDose) {
            let halves = currentCombo.filter(p => p.half).length;
            let score = currentCombo.length * 10 + halves;
            if (score < bestScore) {
                bestScore = score;
                bestCombo = [...currentCombo];
            }
            return;
        }
        if (currentDose > targetDose || currentCombo.length >= 6) return;

        for (let size of allowedSizes) {
            currentCombo.push({size: size, half: false, hex: PILL_DEFS[size].color});
            search(currentDose + size, currentCombo);
            currentCombo.pop();

            currentCombo.push({size: size, half: true, hex: PILL_DEFS[size].color});
            search(currentDose + (size/2), currentCombo);
            currentCombo.pop();
        }
    }
    search(0, []);
    return bestCombo;
}

function updateRegimens(weeklyDose) {
    let allowed = getAvailablePills();
    currentRegimens = [];

    if (allowed.length === 0 || weeklyDose <= 0) {
        renderRegimenUI();
        calculateDispense();
        return;
    }

    let possibleDoses = [];
    for (let i = 0.5; i <= 25; i += 0.5) {
        let combo = findPillCombos(i, allowed);
        if (combo) possibleDoses.push({dose: i, combo: combo});
    }

    for (let f = 7; f >= 1; f--) {
        for (let pdA of possibleDoses) {
            let A = pdA.dose;

            if (A * f === weeklyDose) {
                currentRegimens.push({
                    freq: f, patternA: A, patternB: 0, countA: f, countB: 0,
                    comboA: pdA.combo, comboB: [],
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

                    if ((x * A + y * B) === weeklyDose) {
                        currentRegimens.push({
                            freq: f,
                            patternA: A, patternB: B,
                            countA: x, countB: y,
                            comboA: pdA.combo, comboB: pdB.combo,
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
}

function evaluateScore(A, B, comboA, comboB, x, y, freq) {
    let diff = Math.abs(A - B);
    let pillsA = comboA.length;
    let halvesA = comboA.filter(p=>p.half).length;
    let pillsB = comboB ? comboB.length : 0;
    let halvesB = comboB ? comboB.filter(p=>p.half).length : 0;

    let totalPills = (pillsA * x) + (pillsB * y);
    let totalHalves = (halvesA * x) + (halvesB * y);

    let gapPenalty = (freq < 3) ? 100000 : 0;
    let skipPenalty = (7 - freq) * 2000;

    return gapPenalty + skipPenalty + (diff * 1000) + (totalPills * 10) + (totalHalves * 5);
}

function generateCellHTML(combo, dose) {
    let html = '<div style="display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:4px;">';
    for (let p of combo) {
        if (p.half) {
            html += `<div class="pill-graphic" style="background: linear-gradient(90deg, #fff 50%, ${p.hex} 50%); border: 2px solid ${p.hex}; box-sizing: border-box;"></div>`;
        } else {
            html += `<div class="pill-graphic" style="background-color: ${p.hex}; border: 2px solid ${p.hex}; box-sizing: border-box;"></div>`;
        }
    }
    html += `</div><div class="dose-text">${dose.toFixed(1)} mg</div>`;
    return `<div class="regimen-cell">${html}</div>`;
}

function selectRegimen(index) {
    selectedRegimenIndex = index;
    renderRegimenUI();
    calculateDispense();
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
        let activeDays = FREQ_TEMPLATES[reg.freq];

        for (let j = 0; j < activeDays.length; j++) {
            let dayIndex = activeDays[j];
            if (j < reg.countA) daysArr[dayIndex] = { dose: reg.patternA, combo: reg.comboA };
            else daysArr[dayIndex] = { dose: reg.patternB, combo: reg.comboB };
        }

        let daysHTML = daysArr.map(d => {
            if (d === null) {
                return `<td><div class="regimen-cell"><div class="pill-empty"></div><div class="dose-empty-text">งด</div></div></td>`;
            } else {
                return `<td>${generateCellHTML(d.combo, d.dose)}</td>`;
            }
        });

        let isSelected = (i === selectedRegimenIndex);
        let rowClass = isSelected ? 'selected-regimen' : '';
        let checkedAttr = isSelected ? 'checked' : '';

        html += `
            <tr class="${rowClass}" onclick="selectRegimen(${i})" style="cursor: pointer;">
                <td class="regimen-rank">
                    <div class="radio-container">
                        <input type="radio" name="regSelect" ${checkedAttr}>
                        <span style="font-size: 14px; margin-top: 5px;">แบบที่ ${i + 1}</span>
                    </div>
                </td>
                ${daysHTML.join('')}
            </tr>
        `;
    }

    tbody.innerHTML = html;
}

// --------------------------------------------------------
// สมองกลคำนวณจำนวนเม็ดยาและปฏิทิน
// --------------------------------------------------------

function initDispenseDates() {
    let daysInput = document.getElementById('dispenseDays');
    daysInput.value = 30;
    updateDateFromDays();
}

function updateDateFromDays() {
    let days = parseInt(document.getElementById('dispenseDays').value) || 0;
    let d = new Date();
    d.setDate(d.getDate() + days);

    let year = d.getFullYear();
    let month = String(d.getMonth() + 1).padStart(2, '0');
    let day = String(d.getDate()).padStart(2, '0');

    document.getElementById('dispenseDate').value = `${year}-${month}-${day}`;
    calculateDispense();
}

function updateDaysFromDate() {
    let dateVal = document.getElementById('dispenseDate').value;
    if (!dateVal) return;

    let d1 = new Date();
    d1.setHours(0,0,0,0);
    let d2 = new Date(dateVal);
    d2.setHours(0,0,0,0);

    let diffTime = d2.getTime() - d1.getTime();
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 1) diffDays = 1;

    document.getElementById('dispenseDays').value = diffDays;
    calculateDispense();
}

function calculateDispense() {
    const resultContainer = document.getElementById('dispenseResult');
    const dispenseMode = document.querySelector('input[name="dispenseType"]:checked').value;
    let days = parseInt(document.getElementById('dispenseDays').value) || 0;

    if (currentRegimens.length === 0 || days <= 0) {
        resultContainer.innerHTML = '<div style="text-align:center; color:#888;">โปรดเลือกรูปแบบ Regimen และระบุจำนวนวันก่อนครับ</div>';
        return;
    }

    let reg = currentRegimens[selectedRegimenIndex];
    if (!reg) return;

    let daysArr = Array(7).fill(null);
    let activeDays = FREQ_TEMPLATES[reg.freq];
    for (let j = 0; j < activeDays.length; j++) {
        let dayIndex = activeDays[j];
        if (j < reg.countA) daysArr[dayIndex] = reg.comboA;
        else daysArr[dayIndex] = reg.comboB;
    }

    let todayJsIdx = new Date().getDay();
    let todayIdx = (todayJsIdx + 6) % 7;

    let totals = {
        2: { whole: 0, half: 0 },
        3: { whole: 0, half: 0 },
        5: { whole: 0, half: 0 }
    };

    for (let i = 0; i < days; i++) {
        let currentDay = (todayIdx + i) % 7;
        let combo = daysArr[currentDay];

        if (combo) {
            for (let pill of combo) {
                if (pill.half) totals[pill.size].half += 1;
                else totals[pill.size].whole += 1;
            }
        }
    }

    let html = '';
    let hasPills = false;

    [2, 3, 5].forEach(size => {
        let w = totals[size].whole;
        let h = totals[size].half;

        if (w > 0 || h > 0) {
            hasPills = true;

            if (dispenseMode === 'combine') {
                let exactAmount = w + (h * 0.5);
                let dispenseAmount = Math.ceil(exactAmount);

                html += `
                    <div class="pill-total-item">
                        <div class="pill-total-label">
                            <div class="pill-icon" style="background-color: ${PILL_DEFS[size].color}; width: 16px; height: 16px;"></div>
                            ยาเม็ด ${size} mg
                        </div>
                        <div>
                            <span class="exact-amount">(ตามทฤษฎี ${exactAmount} เม็ด)</span>
                            <span class="dispense-highlight">จ่าย ${dispenseAmount} เม็ด</span>
                        </div>
                    </div>
                `;
            } else {
                if (w > 0) {
                    html += `
                        <div class="pill-total-item">
                            <div class="pill-total-label">
                                <div class="pill-icon" style="background-color: ${PILL_DEFS[size].color}; width: 16px; height: 16px;"></div>
                                ยาเม็ด ${size} mg <span class="sub-text-half">ซองเต็มเม็ด</span>
                            </div>
                            <div>
                                <span class="dispense-highlight">จ่าย ${w} เม็ด</span>
                            </div>
                        </div>
                    `;
                }
                if (h > 0) {
                    let requiredPills = Math.ceil(h / 2);
                    html += `
                        <div class="pill-total-item">
                            <div class="pill-total-label">
                                <div class="pill-icon" style="background: linear-gradient(90deg, #fff 50%, ${PILL_DEFS[size].color} 50%); border: 2px solid ${PILL_DEFS[size].color}; width: 16px; height: 16px;"></div>
                                ยาเม็ด ${size} mg <span class="sub-text-half">ซองครึ่งเม็ด</span>
                            </div>
                            <div style="text-align: right;">
                                <span class="exact-amount">(จัด ${h} ซีก)</span>
                                <span class="dispense-highlight" style="color:var(--primary-color);">จ่าย ${requiredPills} เม็ด</span>
                            </div>
                        </div>
                    `;
                }
            }
        }
    });

    if (!hasPills) {
        html = '<div style="text-align:center; color:#888;">ไม่มีการใช้ยาในช่วงเวลานี้ (อาจเป็นช่วงวันงดยาพอดี)</div>';
    }

    resultContainer.innerHTML = html;
}