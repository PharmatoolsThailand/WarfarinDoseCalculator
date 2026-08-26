// สร้างและจัดอันดับสูตรยารายสัปดาห์จากขนาดยาเป้าหมาย

function getAvailablePills() {
    return PILL_SIZES.filter(size => {
        const chk = document.getElementById(`chk-${size}`);
        return chk && chk.checked;
    });
}

function isQuarterAllowed() {
    const chk = document.getElementById('chk-quarter');
    return chk ? chk.checked : false;
}

function getDoseStep() {
    return isQuarterAllowed() ? 0.25 : 0.50;
}

// แปลงสูตรเป็นตาราง 7 วัน (index 0 = จันทร์) — null คือวันงดยา
function regimenToDays(reg) {
    if (!reg) return Array(7).fill(null);
    if (reg.isCustom) return reg.customDays;

    const days = Array(7).fill(null);
    const activeDays = FREQ_TEMPLATES[reg.freq];
    for (let j = 0; j < activeDays.length; j++) {
        const dayIndex = activeDays[j];
        days[dayIndex] = j < reg.countA
            ? { dose: reg.patternA, combo: reg.comboA }
            : { dose: reg.patternB, combo: reg.comboB };
    }
    return days;
}

function getSelectedRegimen() {
    return App.regimens[App.selectedIndex] || null;
}

function getSelectedDays() {
    return regimenToDays(getSelectedRegimen());
}

// คำนวณสูตรทั้งหมดที่รวมได้เท่ากับ weeklyDose แล้วเรียงจากที่จัดง่ายที่สุด
function buildRegimens(weeklyDose) {
    const allowed = getAvailablePills();
    const allowQuarter = isQuarterAllowed();

    App.regimens = [];

    if (!isFinite(weeklyDose) || weeklyDose <= 0 || allowed.length === 0) return;

    syncComboCache(allowed, allowQuarter);

    const possibleDoses = listAchievableDoses(allowed, allowQuarter, weeklyDose);
    const found = [];

    for (let f = 7; f >= 1; f--) {
        for (const pdA of possibleDoses) {
            const A = pdA.dose;

            if (Math.abs(A * f - weeklyDose) < 0.01) {
                found.push({
                    freq: f, patternA: A, patternB: 0, countA: f, countB: 0,
                    comboA: pdA.combo, comboB: [],
                    totalDose: weeklyDose,
                    score: evaluateScore(A, A, pdA.combo, [], f, 0, f)
                });
            }

            for (const pdB of possibleDoses) {
                const B = pdB.dose;
                if (A === B) continue;
                if (Math.abs(A - B) > 2.0) continue;

                for (let x = 1; x < f; x++) {
                    const y = f - x;
                    if (x < y) continue;
                    if (x === y && A > B) continue;

                    if (Math.abs(x * A + y * B - weeklyDose) < 0.01) {
                        found.push({
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

    // ถ้ามีสูตรที่กินครบ 7 วัน ให้ตัดสูตรที่ต้องงดยาออกทั้งหมด
    const fullWeek = found.filter(r => r.freq === 7);
    App.regimens = fullWeek.length > 0 ? fullWeek : found;

    App.regimens.sort((a, b) => a.score - b.score);
    App.selectedIndex = 0;
}

function makeCustomRegimen(customDays, total) {
    return { isCustom: true, customDays, totalDose: total, score: -999999 };
}
