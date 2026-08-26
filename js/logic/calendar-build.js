// ประกอบ HTML ปฏิทินรายเดือน (ใช้ทั้งพรีวิวบนหน้าเว็บและหน้าพิมพ์)

function getCalendarMeta() {
    const name = (document.getElementById('patientName')?.value || '').trim();
    const hn = (document.getElementById('patientHN')?.value || '').trim();
    const inrMin = (document.getElementById('targetINRMin')?.value || '').trim();
    const inrMax = (document.getElementById('targetINRMax')?.value || '').trim();

    let targetINR = '';
    if (inrMin !== '' && inrMax !== '') targetINR = `${inrMin} - ${inrMax}`;
    else if (inrMin !== '') targetINR = `≥ ${inrMin}`;
    else if (inrMax !== '') targetINR = `≤ ${inrMax}`;

    const reg = getSelectedRegimen();
    const targetDoseVal = reg
        ? fmtWeekly(reg.totalDose)
        : fmtWeekly(parseFloat(document.getElementById('targetDose')?.value) || 0);

    return { name, hn, targetINR, targetDoseVal };
}

// คืนรายการเดือนระหว่างสองช่วง จำกัดจำนวนไว้กันหน้าเว็บค้างเมื่อพิมพ์ปีผิด
function getMonthRange(startValue, endValue) {
    const start = parseMonthInput(startValue);
    if (!start) return [];

    const end = parseMonthInput(endValue) || start;

    let from = start;
    let to = end;
    if (to.year < from.year || (to.year === from.year && to.monthIndex < from.monthIndex)) {
        to = from;
    }

    const months = [];
    let year = from.year;
    let monthIndex = from.monthIndex;

    while (months.length < LIMITS.MAX_CALENDAR_MONTHS) {
        months.push({ year, monthIndex });
        if (year === to.year && monthIndex === to.monthIndex) break;
        monthIndex++;
        if (monthIndex > 11) { monthIndex = 0; year++; }
    }

    return months;
}

function calendarHeaderHTML(year, monthIndex, meta) {
    let info = '';
    if (meta.name || meta.hn || meta.targetINR) {
        info = '<div class="cal-patient-info">';
        if (meta.name) info += `<span>ผู้ป่วย: <strong>${escapeHtml(meta.name)}</strong></span>`;
        if (meta.hn) info += `<span>HN: <strong>${escapeHtml(meta.hn)}</strong></span>`;
        if (meta.targetINR) info += `<span>INR เป้าหมาย: <strong>${escapeHtml(meta.targetINR)}</strong></span>`;
        info += '</div>';
    }

    return `
        <div class="cal-header">
            <h2>ปฏิทินการรับประทานยา Warfarin</h2>
            <p>ประจำเดือน: <strong>${MONTH_NAMES[monthIndex]} ${year + 543}</strong> | ขนาดยาเป้าหมาย: <strong>${escapeHtml(meta.targetDoseVal)} mg/week</strong></p>
            ${info}
        </div>`;
}

function calendarCellHTML(day, dayData) {
    let body;
    if (dayData) {
        body = pillRowHTML(dayData.combo, 24) +
               `<div class="dose-text">${fmtDose(dayData.dose)} mg</div>`;
    } else {
        body = emptyPillHTML(24) + '<div class="dose-empty-text">งดยา</div>';
    }
    return `<td class="cal-cell"><div class="cal-date">${day}</div><div class="cal-pill-area">${body}</div></td>`;
}

function buildMonthHTML(year, monthIndex, daysArr, meta) {
    const firstDay = new Date(year, monthIndex, 1);
    const startOffset = mondayIndex(firstDay);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    let html = `<div class="month-page-wrapper">${calendarHeaderHTML(year, monthIndex, meta)}
        <table class="cal-grid">
            <thead><tr>${DAY_NAMES.map(d => `<th class="cal-day-name">${d}</th>`).join('')}</tr></thead>
            <tbody><tr>`;

    for (let i = 0; i < startOffset; i++) html += '<td class="cal-cell empty"></td>';

    for (let day = 1; day <= daysInMonth; day++) {
        const dayOfWeek = (startOffset + day - 1) % 7;
        html += calendarCellHTML(day, daysArr[dayOfWeek]);
        if (dayOfWeek === 6 && day < daysInMonth) html += '</tr><tr>';
    }

    const lastDayIndex = (startOffset + daysInMonth - 1) % 7;
    for (let i = lastDayIndex + 1; i <= 6; i++) html += '<td class="cal-cell empty"></td>';

    html += `</tr></tbody></table>
        <div class="note-area"><strong>หมายเหตุแพทย์/เภสัชกร:</strong> ....................................................................................................</div>
    </div>`;

    return html;
}
