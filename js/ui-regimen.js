// การ์ดสูตรยา — หนึ่งใบต่อหนึ่งสูตร แสดง 7 วันเป็นตารางเต็มความกว้าง

function regimenDayCellHTML(dayIndex, dayData) {
    const isEmpty = !dayData;
    const body = isEmpty
        ? emptyPillHTML(18) + '<span class="rc-dose is-empty">งด</span>'
        : pillRowHTML(dayData.combo, 18) + `<span class="rc-dose">${fmtDose(dayData.dose)}</span>`;

    return `<div class="rc-day${isEmpty ? ' is-empty' : ''}">
                <span class="rc-day-name">${DAY_SHORT[dayIndex]}</span>
                ${body}
            </div>`;
}

function regimenCardHTML(reg, index) {
    const daysArr = regimenToDays(reg);
    const isSelected = index === App.selectedIndex;
    const title = reg.isCustom ? 'สูตรกำหนดเอง 🌟' : `สูตรที่ ${index + 1}`;

    const activeDays = daysArr.filter(Boolean).length;
    const meta = activeDays === 7 ? 'กินทุกวัน' : `กิน ${activeDays} วัน · งด ${7 - activeDays} วัน`;

    return `
    <div class="regimen-card${isSelected ? ' is-selected' : ''}${reg.isCustom ? ' is-custom' : ''}"
         onclick="selectRegimen(${index})" role="button" tabindex="0"
         onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectRegimen(${index});}">
        <div class="rc-head">
            <span class="rc-radio" aria-hidden="true"></span>
            <span class="rc-title">${title}</span>
            <span class="rc-total">${fmtWeekly(reg.totalDose)} <small>mg/wk</small></span>
        </div>
        <div class="rc-meta">${meta}</div>
        <div class="rc-days">${daysArr.map((d, i) => regimenDayCellHTML(i, d)).join('')}</div>
        ${pillSummaryHTML(daysArr)}
    </div>`;
}

function renderRegimenCards() {
    const container = document.getElementById('regimenCards');
    if (!container) return;

    if (App.regimens.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-icon">🥺</div>
            <p>ไม่มีสูตรที่จัดได้จากเม็ดยาที่เลือกไว้</p>
            <p class="empty-hint">ลองเปิดเม็ดยาขนาดอื่น หรืออนุญาตให้หัก 1/4 เม็ด</p>
        </div>`;
        return;
    }

    const count = Math.min(App.regimens.length, LIMITS.MAX_REGIMEN_SHOWN);
    let html = '';
    for (let i = 0; i < count; i++) {
        html += regimenCardHTML(App.regimens[i], i);
    }
    container.innerHTML = html;
}

function selectRegimen(index) {
    App.selectedIndex = index;
    renderAll();
}

// ชิปเลือกขนาดเม็ดยาที่มีในโรงพยาบาล — สีจุดดึงจาก PILL_DEFS เพื่อไม่ให้เพี้ยนจากรูปเม็ดยาจริง
function renderPillSelectors(containerId, idPrefix, onChangeName) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = PILL_SIZES.map(size => {
        const def = PILL_DEFS[size];
        const checked = document.getElementById(`chk-${size}`)?.checked ?? true;
        return `
        <label class="pill-chip-toggle${checked ? ' active' : ''}" id="${idPrefix}lbl-pill-${size}" title="เม็ด ${size} mg">
            <input type="checkbox" id="${idPrefix}chk-${size}" ${checked ? 'checked' : ''}
                   onchange="${onChangeName}(${size})">
            <span class="pill-chip-dot" style="background-color:${def.color}; border-color:${def.border};"></span>
            <span class="pill-chip-text">${size}<small>mg</small></span>
        </label>`;
    }).join('');
}

// ซิงก์ไฮไลต์ของปุ่มเม็ดยาให้ตรงกับ checkbox หลัง restore ค่าที่จำไว้
function refreshPillToggles() {
    PILL_SIZES.forEach(size => {
        const chk = document.getElementById(`chk-${size}`);
        const label = document.getElementById(`lbl-pill-${size}`);
        if (chk && label) label.classList.toggle('active', chk.checked);
    });
}

