// ส่วนคำนวณจำนวนยาที่ต้องจ่าย และวันนัดครั้งถัดไป

function updateDateFromDays() {
    const el = document.getElementById('dispenseDays');
    const days = clamp(parseInt(el.value, 10) || 0, 0, LIMITS.MAX_DISPENSE_DAYS);
    if (String(days) !== el.value) el.value = days;

    const d = new Date();
    d.setDate(d.getDate() + days);
    document.getElementById('dispenseDate').value = toLocalISODate(d);

    renderDispense();
    saveState();
}

function updateDaysFromDate() {
    const dateVal = document.getElementById('dispenseDate').value;
    if (!dateVal) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateVal);
    target.setHours(0, 0, 0, 0);
    if (isNaN(target.getTime())) return;

    const diffDays = Math.ceil((target.getTime() - today.getTime()) / 86400000);
    document.getElementById('dispenseDays').value = clamp(diffDays, 1, LIMITS.MAX_DISPENSE_DAYS);

    renderDispense();
    saveState();
}

function dispenseLineHTML(line) {
    const note = line.note ? `<span class="dl-note">${line.note}</span>` : '';
    return `
    <div class="dispense-line">
        <div class="dl-text">
            <span class="dl-label">${line.label}</span>
            <span class="dl-days">สำหรับ ${line.days} วัน</span>
            ${note}
        </div>
        <span class="dl-pills">${line.pills} เม็ด</span>
    </div>`;
}

function dispenseGroupHTML(group) {
    return `
    <div class="dispense-group">
        <div class="dg-head">
            <span class="pill-chip-dot" style="background-color:${group.def.color}; border-color:${group.def.border};"></span>
            <span class="dg-name">ยาเม็ด ${group.size} mg</span>
            <span class="dg-total">เบิก ${group.totalPills} เม็ด</span>
        </div>
        ${group.lines.map(dispenseLineHTML).join('')}
    </div>`;
}

function renderDispense() {
    const container = document.getElementById('dispenseResult');
    if (!container) return;

    const days = getDispenseDays();
    if (App.regimens.length === 0 || days <= 0) {
        container.innerHTML = '<div class="empty-inline">ยังไม่มีสูตรยาให้คำนวณ</div>';
        return;
    }

    const totals = computeDispenseTotals(getSelectedDays(), days);
    const groups = buildDispenseGroups(totals, getDispenseMode());

    container.innerHTML = groups.length
        ? groups.map(dispenseGroupHTML).join('')
        : '<div class="empty-inline">ไม่มีการใช้ยาในช่วงนี้</div>';
}

function onDispenseModeChange() {
    renderDispense();
    saveState();
}
