// เทียบค่า INR กับตารางแนวทาง แล้วคำนวณขนาดยาที่ตารางระบุ

function getInrTarget(id) {
    return INR_TARGETS.find(t => t.id === id) || INR_TARGETS[0];
}

// ตารางเขียนช่วงไว้ที่ทศนิยม 1 ตำแหน่ง จึงปัดก่อนเทียบ ไม่งั้นค่าอย่าง 3.05 จะตกร่องระหว่างแถว
function matchInrRule(targetId, inr, majorBleeding) {
    if (majorBleeding) return MAJOR_BLEEDING_RULE;

    const rounded = Math.round(inr * 10) / 10;
    return getInrTarget(targetId).rules.find(r => rounded <= r.upTo) || null;
}

// ขนาดยาที่ตารางแนะนำ — คืนเป็นตัวเลือกให้ผู้ใช้ตัดสินใจเอง ไม่เลือกให้
// actual คือเปอร์เซ็นต์ที่เปลี่ยนจริงหลังปัดลงล็อกกับขนาดเม็ดยา ซึ่งมักไม่ตรงกับตัวเลขในตาราง
function suggestedDoses(rule, currentDose) {
    if (!rule || !currentDose) return [];

    const step = getDoseStep();
    const option = pct => {
        const dose = clamp(roundToStep(currentDose * (1 + pct / 100), step), step, LIMITS.MAX_WEEKLY_DOSE);
        return { dose, actual: ((dose - currentDose) / currentDose) * 100 };
    };

    if (rule.action === 'same') return [option(0)];
    if (rule.action === 'increase') return [option(rule.min), option(rule.max)];
    if (rule.action === 'decrease') return [option(-rule.min), option(-rule.max)];
    if (rule.action === 'holdDecrease') return [option(-rule.pct)];
    return [];
}

function inrToneFor(rule) {
    if (!rule) return 'neutral';
    if (rule.action === 'clinical') return 'alert';
    if (rule.action === 'holdDecrease') return 'caution';
    if (rule.action === 'same') return 'neutral';
    return rule.action === 'increase' ? 'up' : 'down';
}
