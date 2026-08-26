// ค้นหาชุดเม็ดยาที่รวมได้เท่ากับขนาดยาต่อวันที่ต้องการ

let comboCache = {};
let lastCacheConfig = '';

function buildBranches(allowedSizes, allowQuarter) {
    const branches = [];
    const sorted = [...allowedSizes].sort((a, b) => b - a);

    for (const size of sorted) {
        const def = PILL_DEFS[size];
        branches.push({ size, frac: 1, val: size, hex: def.color, border: def.border, penalty: 10 });
        branches.push({ size, frac: 0.5, val: size / 2, hex: def.color, border: def.border, penalty: 15 });
        if (allowQuarter) {
            branches.push({ size, frac: 0.25, val: size / 4, hex: def.color, border: def.border, penalty: 30 });
        }
    }
    return branches;
}

function findPillCombos(targetDose, allowedSizes, allowQuarter) {
    if (targetDose === 0 || !allowedSizes.length) return null;

    const cacheKey = `${targetDose}_${allowedSizes.join(',')}_${allowQuarter}`;
    if (comboCache[cacheKey] !== undefined) return comboCache[cacheKey];

    const branches = buildBranches(allowedSizes, allowQuarter);
    let bestCombo = null;
    let bestScore = Infinity;

    // เดินเฉพาะชุดที่ดัชนีไม่ลดลง เพื่อไม่ไล่ลำดับสลับที่ของชุดเดียวกันซ้ำ
    // (เดิมไล่ทุกลำดับ ทำให้ค้นหาหนักกว่าที่จำเป็นราว 75 เท่า จนหน้าจอค้างตอนเปิดหน้าต่างกำหนดสูตรเอง)
    function search(currentDose, currentCombo, currentScore, start) {
        if (Math.abs(currentDose - targetDose) < 0.01) {
            if (currentScore < bestScore) {
                bestScore = currentScore;
                bestCombo = [...currentCombo];
            }
            return;
        }

        if (currentDose > targetDose + 0.01 ||
            currentCombo.length >= LIMITS.MAX_PILLS_PER_DAY ||
            currentScore >= bestScore) {
            return;
        }

        for (let i = start; i < branches.length; i++) {
            const branch = branches[i];
            currentCombo.push(branch);
            search(currentDose + branch.val, currentCombo, currentScore + branch.penalty, i);
            currentCombo.pop();
        }
    }

    search(0, [], 0, 0);

    comboCache[cacheKey] = bestCombo;
    return bestCombo;
}

// ล้างแคชเฉพาะตอนที่ชุดเม็ดยาหรือเงื่อนไข 1/4 เปลี่ยน
function syncComboCache(allowedSizes, allowQuarter) {
    const config = `${allowedSizes.join(',')}_${allowQuarter}`;
    if (lastCacheConfig !== config) {
        comboCache = {};
        lastCacheConfig = config;
    }
}

// รายการขนาดยาต่อวันทั้งหมดที่จัดได้จากเม็ดยาที่มี
function listAchievableDoses(allowedSizes, allowQuarter, maxDose) {
    const doses = [];
    const cap = Math.min(LIMITS.MAX_DAILY_DOSE, maxDose);
    for (let d = 0.25; d <= cap + 1e-9; d += 0.25) {
        const dose = Math.round(d * 100) / 100;
        const combo = findPillCombos(dose, allowedSizes, allowQuarter);
        if (combo) doses.push({ dose, combo });
    }
    return doses;
}

function countFrac(combo, frac) {
    return combo ? combo.filter(p => p.frac === frac).length : 0;
}

function evaluateScore(A, B, comboA, comboB, x, y, freq) {
    const diff = Math.abs(A - B);
    const hasB = comboB && comboB.length > 0;

    const totalPills = comboA.length * x + (hasB ? comboB.length * y : 0);
    const totalHalves = countFrac(comboA, 0.5) * x + (hasB ? countFrac(comboB, 0.5) * y : 0);
    const totalQuarters = countFrac(comboA, 0.25) * x + (hasB ? countFrac(comboB, 0.25) * y : 0);

    const gapPenalty = freq < 3 ? 100000 : 0;
    const skipPenalty = (7 - freq) * 2000;

    // ถ่วงน้ำหนักการหัก 1/4 ไว้สูง เพื่อให้สูตรที่หักแค่ครึ่งเม็ดขึ้นก่อนเสมอถ้ามี
    return gapPenalty + skipPenalty + diff * 1000 + totalPills * 10 + totalHalves * 5 + totalQuarters * 50;
}
