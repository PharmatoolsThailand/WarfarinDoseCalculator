// หน้าต่างทั้งหมด — ปิดได้ด้วยปุ่ม × / ปุ่มปิด / ปุ่ม Esc เท่านั้น
// ไม่ผูกการคลิกพื้นที่ว่างไว้ปิด เพราะข้อมูลที่กรอกค้างจะหายโดยไม่ตั้งใจ

let openModalId = null;

function openModal(id) {
    document.getElementById(id).classList.add('show-modal');
    document.body.classList.add('modal-open');
    openModalId = id;
}

function closeModal(id) {
    document.getElementById(id).classList.remove('show-modal');
    document.body.classList.remove('modal-open');
    if (openModalId === id) openModalId = null;
}

function closeTopModal() {
    if (openModalId) closeModal(openModalId);
}

// ── ประวัติการอัปเดต ──
function renderChangelog() {
    document.getElementById('changelogBody').innerHTML = CHANGELOG.map(v => `
        <div class="version-header">
            <span class="version-title">${v.icon} เวอร์ชัน ${v.version}</span>
            <span class="version-date">(${v.date})</span>
        </div>
        <div class="version-box">
            <ul>${v.items.map(i => `<li>${i}</li>`).join('')}</ul>
        </div>`).join('');
}

function openChangelog() {
    renderChangelog();
    openModal('changelogModal');
}

function closeChangelog() {
    markChangelogSeen();
    closeModal('changelogModal');
}

// ── ข้อมูลผู้ป่วยบนปฏิทิน ──
function openPatientModal() {
    openModal('patientModal');
}

function closePatientModal() {
    closeModal('patientModal');
    renderPatientStrip();
    renderCalendarPreview();
    saveState();
}

function clearPatientInfo() {
    if (!confirm('ต้องการล้างชื่อผู้ป่วย HN และค่า INR เป้าหมายใช่หรือไม่?')) return;
    document.getElementById('patientName').value = '';
    document.getElementById('patientHN').value = '';
    document.getElementById('targetINRMin').value = '2.0';
    document.getElementById('targetINRMax').value = '3.0';
    renderPatientStrip();
    renderCalendarPreview();
    saveState();
}

