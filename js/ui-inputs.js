// ช่องกรอกขนาดยา ปุ่มปรับเปอร์เซ็นต์ และแถบสรุปบนหัวเว็บ

function getCurrentDose() {
    const raw = parseFloat(document.getElementById('currentDose').value);
    return isFinite(raw) ? raw : getDoseStep();
}

function getTargetDose() {
    const raw = parseFloat(document.getElementById('targetDose').value);
    return isFinite(raw) ? raw : getDoseStep();
}

// เขียนค่าลง select โดยบังคับให้อยู่ในช่วงและลงล็อกกับ step เสมอ
// กันกรณีค่าไม่ตรงกับ option ใด ซึ่งจะทำให้ select ว่างแล้วลามเป็น NaN ทั้งระบบ
function setSelectDose(elementId, value) {
    const el = document.getElementById(elementId);
    const step = getDoseStep();
    let v = clamp(roundToStep(value, step), step, LIMITS.MAX_WEEKLY_DOSE);
    el.value = v.toFixed(2);
    if (el.value === '') {
        el.value = step.toFixed(2);
    }
    return parseFloat(el.value);
}

function updateDropdownOptions() {
    const currentEl = document.getElementById('currentDose');
    const targetEl = document.getElementById('targetDose');
    const step = getDoseStep();

    const prevCurrent = parseFloat(currentEl.value) || 11.00;
    const prevTarget = parseFloat(targetEl.value) || 11.50;

    const options = [];
    for (let i = step; i <= LIMITS.MAX_WEEKLY_DOSE + 1e-9; i += step) {
        const value = i.toFixed(2);
        options.push(`<option value="${value}">${value}</option>`);
    }
    const html = options.join('');
    currentEl.innerHTML = html;
    targetEl.innerHTML = html;

    setSelectDose('currentDose', prevCurrent);
    setSelectDose('targetDose', prevTarget);
}

function stepDose(elementId, direction) {
    const step = getDoseStep();
    const current = parseFloat(document.getElementById(elementId).value) || step;
    setSelectDose(elementId, current + direction * step);
    highlightPercentButton(null);
    recalculate();
}

function applyPercent(percent) {
    const current = getCurrentDose();
    setSelectDose('targetDose', current + current * (percent / 100));
    highlightPercentButton(percent);
    recalculate();
}

// ส่ง null เพื่อล้างไฮไลต์ เมื่อขนาดยาถูกเปลี่ยนด้วยวิธีอื่นที่ไม่ใช่ปุ่มเปอร์เซ็นต์
function highlightPercentButton(percent) {
    document.querySelectorAll('.btn-pct').forEach(btn => {
        btn.classList.toggle('is-active', percent !== null && Number(btn.dataset.pct) === percent);
    });
}

// แถบผลลัพธ์ท้ายส่วนคำนวณ — ขนาดเดิม / ขนาดใหม่ / เปอร์เซ็นต์ที่เปลี่ยนจริง
function renderDoseSummary(currentDose, targetDose) {
    const bar = document.getElementById('resultBar');
    const pctEl = document.getElementById('sumDeltaPct');

    const delta = targetDose - currentDose;
    const percent = currentDose > 0 ? (delta / currentDose) * 100 : 0;
    const isSame = Math.abs(delta) < 0.005;

    document.getElementById('sumCurrent').textContent = fmtDose(currentDose);
    document.getElementById('sumTarget').textContent = fmtDose(targetDose);

    bar.className = 'result-bar ' + (isSame ? 'is-same' : delta > 0 ? 'is-up' : 'is-down');
    pctEl.textContent = isSame ? 'เท่าเดิม' : `${delta > 0 ? '▲' : '▼'} ${Math.abs(percent).toFixed(2)}%`;
}

function updatePillState(size) {
    const label = document.getElementById(`lbl-pill-${size}`);
    const chk = document.getElementById(`chk-${size}`);
    if (label) label.classList.toggle('active', chk.checked);
    recalculate();
}

function onQuarterToggle() {
    updateDropdownOptions();
    recalculate();
}

// เส้นทางเดียวที่ทุกการเปลี่ยนแปลงต้องผ่าน — คำนวณใหม่แล้ววาดผลทั้งหน้า
function recalculate() {
    const target = getTargetDose();
    renderDoseSummary(getCurrentDose(), target);
    buildRegimens(target);
    renderAll();
    if (isInrMode()) renderInrGuidance();
}

// วาดผลลัพธ์ทุกส่วนโดยไม่คำนวณสูตรใหม่ (ใช้เมื่อเลือกสูตรอื่นหรือแก้ข้อมูลผู้ป่วย)
function renderAll() {
    renderRegimenCards();
    renderDispense();
    renderPatientStrip();
    renderCalendarPreview();
    saveState();
}
