// หน้าต่างกำหนดสูตรยาเอง — กริดสัปดาห์ + แป้นปรับค่าของวันที่เลือก
// ออกแบบให้กดด้วยนิ้วโป้งได้ ไม่ต้องเลื่อนรายการ 7 แถวบนมือถือ

function openCustomModal() {
    const reg = getSelectedRegimen();
    if (reg) {
        App.customDraftDoses = regimenToDays(reg).map(d => (d ? d.dose : 0));
    }
    App.customActiveDay = 0;
    rebuildCustomDoseList();
    renderCustomModal();
    openModal('customModal');
}

function closeCustomModal() {
    closeModal('customModal');
    saveState();
}

function rebuildCustomDoseList() {
    const allowed = getAvailablePills();
    const allowQuarter = isQuarterAllowed();

    syncComboCache(allowed, allowQuarter);
    App.customValidDoses = [{ dose: 0, combo: [] }].concat(
        allowed.length ? listAchievableDoses(allowed, allowQuarter, LIMITS.MAX_DAILY_DOSE) : []
    );
}

// จับคู่ขนาดยาที่ค้างไว้กับตัวเลือกที่ยังจัดได้ ถ้าจัดไม่ได้แล้วให้เลือกค่าที่ใกล้ที่สุดแทน
function draftIndexFor(dose) {
    if (!dose) return 0;

    const exact = App.customValidDoses.findIndex(v => Math.abs(v.dose - dose) < 0.01);
    if (exact !== -1) return exact;

    let bestIdx = 0;
    let bestGap = Infinity;
    App.customValidDoses.forEach((v, idx) => {
        const gap = Math.abs(v.dose - dose);
        if (gap < bestGap) { bestGap = gap; bestIdx = idx; }
    });
    return bestIdx;
}

// ขนาดยาที่ค้างไว้อาจจัดไม่ได้แล้วหลังเปลี่ยนเม็ดยา จึงสะกิดให้ลงล็อกกับตัวเลือกที่มีจริง
function snapDraftToAvailable() {
    App.customDraftDoses = App.customDraftDoses.map(dose => {
        const item = App.customValidDoses[draftIndexFor(dose)];
        return item ? item.dose : 0;
    });
}

function customDayCellHTML(dayIndex) {
    const dose = App.customDraftDoses[dayIndex];
    const isActive = dayIndex === App.customActiveDay;

    return `
    <button type="button" class="cd-day${isActive ? ' is-active' : ''}${dose ? '' : ' is-empty'}"
            onclick="selectCustomDay(${dayIndex})" aria-pressed="${isActive}">
        <span class="cd-day-name">${DAY_SHORT[dayIndex]}</span>
        <span class="cd-day-dose">${dose ? fmtDose(dose) : 'งด'}</span>
    </button>`;
}

function renderCustomModal() {
    const allowQuarter = isQuarterAllowed();
    const activeDose = App.customDraftDoses[App.customActiveDay];
    const activeIdx = draftIndexFor(activeDose);
    const canDecrease = activeIdx > 0;
    const canIncrease = activeIdx < App.customValidDoses.length - 1;

    document.getElementById('customDaysContainer').innerHTML = `
        <div class="pill-bar">
            <div class="pill-bar-row">
                <div class="pill-chips" id="modalPillSelectors"></div>
                <label class="quarter-chip">
                    <input type="checkbox" id="modal-chk-quarter" onchange="syncQuarterSelection()" ${allowQuarter ? 'checked' : ''}>
                    <span class="quarter-chip-face"><span>✂️</span><span class="qc-text">หัก ¼</span></span>
                </label>
            </div>
        </div>

        <div class="cd-grid">${DAY_SHORT.map((_, i) => customDayCellHTML(i)).join('')}</div>

        <div class="cd-editor">
            <div class="cd-editor-day">${DAY_NAMES[App.customActiveDay]}</div>
            <div class="cd-stepper">
                <button type="button" class="cd-step-btn" onclick="stepCustomDay(-1)"
                        ${canDecrease ? '' : 'disabled'} aria-label="ลดขนาดยา">−</button>
                <div class="cd-value">
                    <span class="cd-value-num">${activeDose ? fmtDose(activeDose) : 'งด'}</span>
                    <span class="cd-value-unit">${activeDose ? 'mg' : 'ยา'}</span>
                </div>
                <button type="button" class="cd-step-btn" onclick="stepCustomDay(1)"
                        ${canIncrease ? '' : 'disabled'} aria-label="เพิ่มขนาดยา">+</button>
            </div>
            <div class="cd-quick">
                <button type="button" class="cd-quick-btn" onclick="setCustomDay(0)">งดวันนี้</button>
                <button type="button" class="cd-quick-btn" onclick="applyDoseToAllDays()">ใส่ค่านี้ทุกวัน</button>
            </div>
        </div>`;

    renderPillSelectors('modalPillSelectors', 'modal-', 'syncPillSelection');
    updateCustomTotal();
}

function selectCustomDay(dayIndex) {
    App.customActiveDay = dayIndex;
    renderCustomModal();
}

function stepCustomDay(direction) {
    const newIndex = draftIndexFor(App.customDraftDoses[App.customActiveDay]) + direction;
    if (newIndex < 0 || newIndex >= App.customValidDoses.length) return;
    setCustomDay(App.customValidDoses[newIndex].dose);
}

function setCustomDay(dose) {
    App.customDraftDoses[App.customActiveDay] = dose;
    renderCustomModal();
}

function applyDoseToAllDays() {
    const dose = App.customDraftDoses[App.customActiveDay];
    App.customDraftDoses = Array(7).fill(dose);
    renderCustomModal();
}

// ติ๊กเม็ดยาแล้วค่าที่กรอกค้างต้องไม่หาย — สะกิดไปหาขนาดที่ใกล้ที่สุดที่ยังจัดได้แทน
function syncPillSelection(size) {
    document.getElementById(`chk-${size}`).checked = document.getElementById(`modal-chk-${size}`).checked;
    updatePillState(size);
    rebuildCustomDoseList();
    snapDraftToAvailable();
    renderCustomModal();
}

function syncQuarterSelection() {
    document.getElementById('chk-quarter').checked = document.getElementById('modal-chk-quarter').checked;
    onQuarterToggle();
    rebuildCustomDoseList();
    snapDraftToAvailable();
    renderCustomModal();
}

function customDraftTotal() {
    return App.customDraftDoses.reduce((sum, d) => sum + d, 0);
}

function updateCustomTotal() {
    const total = customDraftTotal();
    const display = document.getElementById('customTotal');
    const over = total > LIMITS.MAX_WEEKLY_DOSE;

    display.innerHTML = `<span class="ct-num">${fmtWeekly(total)}</span><span class="ct-unit">mg/week</span>`;
    display.classList.toggle('is-over', over);
}

function applyCustomRegimen() {
    const total = customDraftTotal();

    if (total === 0) {
        alert('กรุณาระบุขนาดยาอย่างน้อย 1 วันครับ');
        return;
    }
    if (total > LIMITS.MAX_WEEKLY_DOSE) {
        alert(`ขนาดยารวมต่อสัปดาห์เกิน ${LIMITS.MAX_WEEKLY_DOSE} mg ซึ่งเกินช่วงที่เครื่องมือนี้รองรับครับ`);
        return;
    }

    const customDays = App.customDraftDoses.map(dose => {
        if (!dose) return null;
        const item = App.customValidDoses[draftIndexFor(dose)];
        return { dose: item.dose, combo: item.combo };
    });

    const applied = setSelectDose('targetDose', total);
    renderDoseSummary(getCurrentDose(), applied);

    buildRegimens(applied);
    App.regimens.unshift(makeCustomRegimen(customDays, total));
    App.selectedIndex = 0;

    highlightPercentButton(null);
    renderAll();
    closeCustomModal();
}
