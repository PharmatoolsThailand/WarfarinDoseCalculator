// พรีวิวปฏิทินบนหน้าเว็บ และหน้าต่างพิมพ์

// สรุปข้อมูลผู้ป่วยที่จะพิมพ์ลงหัวกระดาษ ให้เห็นได้โดยไม่ต้องเปิดหน้าต่าง
function renderPatientStrip() {
    const strip = document.getElementById('patientStrip');
    if (!strip) return;

    const meta = getCalendarMeta();
    const parts = [];
    if (meta.name) parts.push(`<span class="ps-item">ผู้ป่วย <strong>${escapeHtml(meta.name)}</strong></span>`);
    if (meta.hn) parts.push(`<span class="ps-item">HN <strong>${escapeHtml(meta.hn)}</strong></span>`);
    if (meta.targetINR) parts.push(`<span class="ps-item">INR เป้าหมาย <strong>${escapeHtml(meta.targetINR)}</strong></span>`);

    strip.innerHTML = parts.length
        ? parts.join('')
        : '<span class="ps-empty">ยังไม่ได้ระบุข้อมูลผู้ป่วย — ปฏิทินจะพิมพ์โดยเว้นช่องไว้เขียนด้วยลายมือ</span>';
}

function renderCalendarPreview() {
    const printArea = document.getElementById('calendarPrintArea');
    if (!printArea) return;

    if (App.regimens.length === 0) {
        printArea.innerHTML = `<div class="empty-state">
            <div class="empty-icon">💊</div>
            <p>เลือกสูตรยาก่อน แล้วปฏิทินจะสร้างให้อัตโนมัติ</p>
        </div>`;
        return;
    }

    const months = getMonthRange(
        document.getElementById('startMonth').value,
        document.getElementById('endMonth').value
    );

    if (months.length === 0) {
        printArea.innerHTML = '<div class="empty-state"><p>กรุณาระบุเดือนที่ถูกต้อง</p></div>';
        return;
    }

    const daysArr = getSelectedDays();
    const meta = getCalendarMeta();
    printArea.innerHTML = months.map(m => buildMonthHTML(m.year, m.monthIndex, daysArr, meta)).join('');
    fitCalendarScale();
}

// ย่อปฏิทินให้พอดีความกว้างที่มี แทนที่จะให้ผู้ใช้เลื่อนแนวนอนบนมือถือ
// ใช้ zoom เพราะย่อทั้งกล่องรวมความสูง ไม่ทิ้งช่องว่างแบบ transform: scale
function fitCalendarScale() {
    const area = document.getElementById('calendarPrintArea');
    if (!area) return;

    const width = area.clientWidth;
    if (!width) return;

    const scale = Math.min(1, width / CALENDAR_BASE_WIDTH);
    area.style.setProperty('--cal-scale', scale.toFixed(3));
}

function watchCalendarWidth() {
    const area = document.getElementById('calendarPrintArea');
    if (!area || typeof ResizeObserver === 'undefined') return;
    new ResizeObserver(fitCalendarScale).observe(area);
}

function onCalendarRangeChange() {
    renderCalendarPreview();
    saveState();
}

function calendarHasContent() {
    const printArea = document.getElementById('calendarPrintArea');
    return printArea && printArea.querySelector('.month-page-wrapper') !== null;
}

function printCalendar() {
    if (!calendarHasContent()) {
        alert('กรุณาเลือกสูตรยาและระบุเดือนก่อนพิมพ์ครับ');
        return;
    }

    const paperSize = document.getElementById('paperSize').value;
    const printArea = document.getElementById('calendarPrintArea');
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
        alert('เบราว์เซอร์บล็อกการเปิดหน้าต่างใหม่ กรุณาอนุญาต popup ของเว็บนี้แล้วลองอีกครั้งครับ');
        return;
    }

    printWindow.document.write(buildPrintDocument(paperSize, printArea.innerHTML));
    printWindow.document.close();
}

function buildPrintDocument(paperSize, calendarHTML) {
    const isA4 = paperSize === 'A4';
    const s = {
        pill: isA4 ? '36px' : '26px',
        header: isA4 ? '32px' : '20px',
        sub: isA4 ? '20px' : '14px',
        day: isA4 ? '20px' : '14px',
        date: isA4 ? '22px' : '16px',
        dose: isA4 ? '16px' : '12px',
        note: isA4 ? '18px' : '14px',
        pageW: isA4 ? '1123px' : '794px',
        pageH: isA4 ? '794px' : '559px',
        pad: isA4 ? '20px' : '15px',
        cellPad: isA4 ? '8px' : '4px',
        headPad: isA4 ? '10px' : '5px',
        headH: isA4 ? '50px' : '35px',
        gap: isA4 ? '6px' : '3px'
    };

    return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>พิมพ์ปฏิทิน (${paperSize})</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
<style>
html, body { margin:0; padding:0; background:#f1f5f9; font-family:'Sarabun', sans-serif; }
#capture-source { position:absolute; top:0; left:0; z-index:1; }
#print-images { display:none; background:#fff; width:100%; position:relative; z-index:10; }
#loading { position:fixed; inset:0; background:#fff; z-index:9999;
           display:flex; flex-direction:column; align-items:center; justify-content:center; }

@media print {
    @page { size: ${paperSize} landscape; margin: 0 !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { background:#fff; }
    #loading, #capture-source { display:none !important; }
    #print-images { display:flex !important; flex-direction:column; align-items:center; }
    .print-page { max-width:100vw; max-height:98vh; width:100%; height:100%;
                  object-fit:contain; display:block; margin:0 auto; page-break-after:always; }
    .print-page:last-child { page-break-after:auto; }
}

.month-capture { background:#fff; width:${s.pageW}; min-height:${s.pageH}; height:auto;
                 padding:${s.pad}; box-sizing:border-box; display:flex; flex-direction:column; }

.cal-header { text-align:center; margin-bottom:10px; }
.cal-header h2 { margin:0; color:#0f766e; font-size:${s.header}; font-weight:700; }
.cal-header p { margin:5px 0 10px; color:#475569; font-size:${s.sub}; }
.cal-patient-info { display:flex; justify-content:center; gap:30px; margin-top:5px;
                    font-size:${s.sub}; color:#334155; }
.cal-patient-info strong { color:#0f766e; font-weight:600; }

.cal-grid { width:100%; height:100%; border-collapse:collapse; border:3px solid #0f766e; table-layout:fixed; }
.cal-grid th, .cal-grid td { border:1px solid #cbd5e1; box-sizing:border-box; }
.cal-day-name { background:#0f766e; color:#fff; text-align:center; font-weight:600;
                padding:${s.headPad}; font-size:${s.day}; height:${s.headH}; }
.cal-cell { vertical-align:top; padding:${s.cellPad}; height:auto; }
.cal-cell.empty { background:#f8fafc; }
.cal-date { font-weight:700; font-size:${s.date}; color:#334155;
            border-bottom:2px solid #f1f5f9; padding-bottom:4px; margin-bottom:10px; text-align:left; }
.cal-pill-area { display:flex; flex-direction:column; align-items:center; gap:${s.gap}; }

.pill-row { display:flex; justify-content:center; align-items:center; flex-wrap:wrap;
            gap:4px; margin-bottom:4px; min-height:calc(${s.pill} + 4px); }
.pill-graphic { display:inline-block; box-sizing:border-box; margin:1px;
                width:${s.pill}; height:${s.pill}; border-radius:50%; }
.pill-graphic.half { width:calc(${s.pill} / 2); border-radius:0 100px 100px 0;
                     border-left-style:dashed; border-left-width:1.5px; }
.pill-graphic.quarter { width:calc(${s.pill} / 2); height:calc(${s.pill} / 2); border-radius:0 0 100px 0;
                        border-left-style:dashed; border-left-width:1.5px;
                        border-top-style:dashed; border-top-width:1.5px; align-self:flex-end; }
/* ต้องประกาศคู่กับ .pill-graphic เสมอ ไม่งั้นวันงดยาจะกลายเป็นช่องว่างที่ดันตารางเพี้ยน */
.pill-empty { display:inline-block; box-sizing:border-box; margin:1px;
              width:${s.pill}; height:${s.pill}; border-radius:50%;
              background:transparent; border:2px dashed #cbd5e1; }

.dose-text { font-size:${s.dose}; font-weight:700; color:#1e293b; margin-top:5px; text-align:center; }
.dose-empty-text { font-size:${s.dose}; font-weight:500; color:#94a3b8; margin-top:5px; text-align:center; }
.note-area { margin-top:15px; font-size:${s.note}; border-top:1px dashed #ccc;
             padding-top:10px; color:#475569; }
</style>
</head>
<body>
<div id="loading">
    <h2 style="color:#0f766e;">⏳ กำลังแปลงปฏิทิน...</h2>
    <p style="color:#475569;">ระบบกำลังประมวลผลแยกแต่ละเดือนให้อยู่คนละหน้าครับ</p>
</div>
<div id="capture-source">${calendarHTML}</div>
<div id="print-images"></div>
<script>
window.onload = async function() {
    if (typeof html2canvas === 'undefined') {
        document.getElementById('loading').innerHTML =
            '<h2 style="color:red;">❌ โหลดเครื่องมือแปลงภาพไม่สำเร็จ</h2><p>กรุณาตรวจสอบอินเทอร์เน็ตของคุณครับ</p>';
        return;
    }

    const wrappers = document.querySelectorAll('.month-page-wrapper');
    const container = document.getElementById('print-images');
    wrappers.forEach(el => el.className = 'month-capture');

    for (let i = 0; i < wrappers.length; i++) {
        const canvas = await html2canvas(wrappers[i], {
            scale: 3, useCORS: true, logging: false, backgroundColor: '#ffffff'
        });
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/png', 1.0);
        img.className = 'print-page';
        container.appendChild(img);
    }

    document.getElementById('loading').style.display = 'none';
    document.getElementById('capture-source').style.display = 'none';
    container.style.display = 'block';
    setTimeout(function() { window.print(); }, 500);
};
<\/script>
</body>
</html>`;
}
