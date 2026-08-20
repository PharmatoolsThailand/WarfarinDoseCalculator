// ตารางแนวทางปรับขนาดยาตาม INR — แสดงค้างไว้เป็นส่วนแรกของหน้า

function guidelineRowHTML(row) {
    if (row.merged) {
        return `<tr><td colspan="2" class="merged-cell">${row.merged}</td><td>${row.action}</td></tr>`;
    }
    const action = row.highlight ? `<strong>${row.action}</strong>` : row.action;
    return `<tr${row.highlight ? ' class="highlight-row"' : ''}>
                <td>${row.keep23}</td><td>${row.keep2535}</td><td>${action}</td>
            </tr>`;
}

function renderGuideline() {
    const body = document.getElementById('guidelineBody');
    if (!body) return;

    body.innerHTML = `
        <div class="table-scroll">
            <table class="guideline-table">
                <thead><tr>
                    <th>Keep<br>2.0 - 3.0</th>
                    <th>Keep<br>2.5 - 3.5</th>
                    <th>แนวทางการปรับยา Warfarin</th>
                </tr></thead>
                <tbody>${GUIDELINE_ROWS.map(guidelineRowHTML).join('')}</tbody>
            </table>
        </div>
        <details class="references">
            <summary>เอกสารอ้างอิง</summary>
            <ol>${REFERENCES.map(r => `<li>${r}</li>`).join('')}</ol>
        </details>`;
}
