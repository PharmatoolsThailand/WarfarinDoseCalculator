// วาดรูปเม็ดยา — ใช้ร่วมกันระหว่างการ์ดสูตรยาและปฏิทิน

function pillHTML(pill, sizePx) {
    const style = `--sz:${sizePx}px; background-color:${pill.hex}; border:2px solid ${pill.border};`;
    if (pill.frac === 1) return `<div class="pill-graphic" style="${style}"></div>`;
    if (pill.frac === 0.5) return `<div class="pill-graphic half" style="${style}"></div>`;
    return `<div class="pill-graphic quarter" style="${style}"></div>`;
}

function pillRowHTML(combo, sizePx) {
    return `<div class="pill-row" style="--sz:${sizePx}px">${combo.map(p => pillHTML(p, sizePx)).join('')}</div>`;
}

function emptyPillHTML(sizePx) {
    return `<div class="pill-row" style="--sz:${sizePx}px"><div class="pill-empty" style="--sz:${sizePx}px"></div></div>`;
}

// สรุปว่าสูตรนี้ใช้เม็ดยาขนาดไหนกี่เม็ดต่อสัปดาห์ ไว้แสดงท้ายการ์ด
function summarizePills(daysArr) {
    const totals = {};
    PILL_SIZES.forEach(size => { totals[size] = 0; });

    daysArr.forEach(day => {
        if (!day) return;
        day.combo.forEach(p => { totals[p.size] += p.frac; });
    });

    return PILL_SIZES
        .filter(size => totals[size] > 0)
        .map(size => ({ size, count: totals[size], def: PILL_DEFS[size] }));
}

function pillSummaryHTML(daysArr) {
    const parts = summarizePills(daysArr);
    if (parts.length === 0) return '';

    const chips = parts.map(p => `
        <span class="pill-chip">
            <span class="pill-chip-dot" style="background-color:${p.def.color}; border-color:${p.def.border};"></span>
            ${p.size} mg &times; ${fmtDose(p.count)}
        </span>`).join('');

    return `<div class="pill-summary">${chips}</div>`;
}
