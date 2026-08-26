// โหมดคำนวณจาก INR — เลือกเป้าหมาย กรอกค่า INR แล้วระบบสรุปแนวทางตามตารางด้านบน

function isInrMode() {
    return App.doseMode === 'inr';
}

function toggleDoseMode() {
    App.doseMode = isInrMode() ? 'manual' : 'inr';
    applyDoseMode();
    saveState();
}

function applyDoseMode() {
    const inr = isInrMode();

    document.getElementById('manualPane').hidden = inr;
    document.getElementById('inrPane').hidden = !inr;
    document.getElementById('resultBar').hidden = inr;
    document.getElementById('targetField').hidden = inr;
    document.getElementById('inrField').hidden = !inr;
    document.getElementById('modeToggle').textContent = inr ? '✏️ กรอกขนาดยาเอง' : '🎯 คำนวณจากค่า INR';

    if (inr) renderInrGuidance();
}

function renderInrTargets() {
    document.getElementById('inrTargets').innerHTML = INR_TARGETS.map(t => `
        <button type="button" class="inr-target${t.id === App.inrTarget ? ' is-active' : ''}"
                onclick="selectInrTarget('${t.id}')">
            <span class="it-label">INR เป้าหมาย</span>
            <span class="it-range">${t.label}</span>
        </button>`).join('');
}

function selectInrTarget(id) {
    App.inrTarget = id;
    renderInrTargets();
    renderInrGuidance();
    saveState();
}

function onInrInput() {
    renderInrGuidance();
    saveState();
}

function doseTagText(option) {
    if (Math.abs(option.actual) < 0.005) return 'ขนาดเดิม';
    return `${option.actual > 0 ? '+' : '−'}${Math.abs(option.actual).toFixed(2)}%`;
}

function guidanceDoseHTML(doses, currentDose) {
    if (doses.length === 0) return '';

    const applied = getTargetDose();
    const buttons = doses.map(d => {
        const isSelected = Math.abs(d.dose - applied) < 0.005;
        return `
        <button type="button" class="ig-dose${isSelected ? ' is-selected' : ''}"
                onclick="selectInrDose(${d.dose})" aria-pressed="${isSelected}">
            <span class="ig-dose-num">${fmtDose(d.dose)}</span>
            <span class="ig-dose-unit">mg/week</span>
            <span class="ig-dose-tag">${doseTagText(d)}</span>
        </button>`;
    }).join('');

    const hint = doses.length > 1
        ? 'ตารางระบุเป็นช่วง กดเลือกขนาดที่จะใช้จัดสูตรยาด้านล่าง'
        : 'กดเลือกเพื่อใช้ขนาดนี้จัดสูตรยาด้านล่าง';

    return `
        <div class="ig-doses-head">ขนาดยาใหม่ที่ตารางแนะนำ <span>จาก ${fmtDose(currentDose)} mg/week</span></div>
        <div class="ig-doses">${buttons}</div>
        <div class="ig-hint">${hint}</div>`;
}

function renderInrGuidance() {
    const box = document.getElementById('inrGuidance');
    if (!box) return;

    const raw = parseFloat(document.getElementById('inrValue').value);
    const majorBleeding = document.getElementById('inrBleeding').checked;

    if (!isFinite(raw) || raw <= 0) {
        box.className = 'inr-guidance is-empty';
        box.innerHTML = '<div class="ig-placeholder">กรอกค่า INR ปัจจุบันเพื่อดูแนวทางจากตาราง</div>';
        return;
    }

    const rule = matchInrRule(App.inrTarget, raw, majorBleeding);
    if (!rule) {
        box.className = 'inr-guidance is-empty';
        box.innerHTML = '<div class="ig-placeholder">ค่า INR อยู่นอกช่วงที่ตารางครอบคลุม</div>';
        return;
    }

    const currentDose = getCurrentDose();
    const doses = majorBleeding ? [] : suggestedDoses(rule, currentDose);
    const target = getInrTarget(App.inrTarget);

    const context = majorBleeding
        ? `INR ${fmtDose(raw)} · มีเลือดออกรุนแรง`
        : `INR ${fmtDose(raw)} · เป้าหมาย ${target.label}`;

    const detail = rule.detail ? `<div class="ig-detail">${rule.detail}</div>` : '';
    const holdNote = rule.action === 'holdDecrease'
        ? `<div class="ig-detail">งดยา ${rule.holdDays} วันก่อน แล้วจึงเริ่มขนาดใหม่</div>`
        : '';
    const clinicalNote = rule.action === 'clinical'
        ? '<div class="ig-detail">ตรวจ INR ซ้ำและประเมินผู้ป่วยก่อนกำหนดขนาดยาใหม่</div>'
        : '';

    box.className = `inr-guidance is-${inrToneFor(rule)}`;
    box.innerHTML = `
        <div class="ig-context">${context}</div>
        <div class="ig-action">${rule.text}</div>
        ${detail}${holdNote}${clinicalNote}
        ${guidanceDoseHTML(doses, currentDose)}`;
}

// เลือกขนาดยาที่จะใช้จัดสูตรยา — อยู่ในโหมด INR ต่อ ไม่สลับโหมดและไม่เลื่อนหน้าให้
function selectInrDose(dose) {
    setSelectDose('targetDose', dose);
    highlightPercentButton(null);
    recalculate();
}
