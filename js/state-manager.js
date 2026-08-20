// สถานะที่ใช้ร่วมกันทั้งแอป + การจำค่าลง localStorage
// ทุกไฟล์อ่าน/เขียนผ่าน App เท่านั้น ไม่ประกาศตัวแปร global เพิ่ม

const App = {
    regimens: [],
    selectedIndex: 0,
    customValidDoses: [{ dose: 0, combo: [] }],
    // ค่าที่ผู้ใช้กำลังกรอกในหน้าต่างกำหนดสูตรเอง เก็บเป็นขนาดยา (mg) ต่อวัน
    // ไม่ใช่ดัชนีของรายการตัวเลือก เพราะรายการถูกสร้างใหม่ทุกครั้งที่ติ๊กเม็ดยา
    customDraftDoses: Array(7).fill(0),
    customActiveDay: 0,
    doseMode: 'manual',
    inrTarget: '2.0-3.0'
};

const STORAGE_KEY = 'warfarin-calc-v2';

function collectState() {
    const pills = {};
    PILL_SIZES.forEach(size => {
        const chk = document.getElementById(`chk-${size}`);
        pills[size] = chk ? chk.checked : true;
    });

    const dispenseModeEl = document.querySelector('input[name="dispenseType"]:checked');
    const custom = App.regimens[App.selectedIndex];

    return {
        currentDose: val('currentDose'),
        targetDose: val('targetDose'),
        pills,
        quarter: document.getElementById('chk-quarter')?.checked || false,
        dispenseMode: dispenseModeEl ? dispenseModeEl.value : 'combine',
        dispenseDays: val('dispenseDays'),
        patientName: val('patientName'),
        patientHN: val('patientHN'),
        inrMin: val('targetINRMin'),
        inrMax: val('targetINRMax'),
        startMonth: val('startMonth'),
        endMonth: val('endMonth'),
        paperSize: val('paperSize'),
        doseMode: App.doseMode,
        inrTarget: App.inrTarget,
        inrValue: val('inrValue'),
        inrBleeding: document.getElementById('inrBleeding')?.checked || false,
        selectedIndex: App.selectedIndex,
        customDraftDoses: App.customDraftDoses,
        customRegimenDoses: custom && custom.isCustom
            ? custom.customDays.map(d => (d ? d.dose : 0))
            : null
    };
}

function val(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(collectState()));
    } catch (e) {
        // โควตาเต็มหรือเปิดในโหมดส่วนตัว — ใช้งานต่อได้ แค่ไม่จำค่า
    }
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

// เขียนค่าที่จำไว้กลับเข้า input ก่อนคำนวณรอบแรก
// dropdown ขนาดยาถูกเติมทีหลัง จึงคืนค่าไว้ให้ applyRestoredDoses ใช้ต่อ
function restoreState() {
    const s = loadState();
    if (!s) return null;

    PILL_SIZES.forEach(size => {
        const chk = document.getElementById(`chk-${size}`);
        if (chk && s.pills && typeof s.pills[size] === 'boolean') chk.checked = s.pills[size];
    });

    const quarterChk = document.getElementById('chk-quarter');
    if (quarterChk) quarterChk.checked = !!s.quarter;

    if (s.dispenseMode) {
        const modeEl = document.getElementById(`dispense-${s.dispenseMode}`);
        if (modeEl) modeEl.checked = true;
    }

    setVal('dispenseDays', s.dispenseDays);
    setVal('patientName', s.patientName);
    setVal('patientHN', s.patientHN);
    setVal('targetINRMin', s.inrMin);
    setVal('targetINRMax', s.inrMax);
    setVal('startMonth', s.startMonth);
    setVal('endMonth', s.endMonth);
    setVal('paperSize', s.paperSize);

    if (Array.isArray(s.customDraftDoses) && s.customDraftDoses.length === 7) {
        App.customDraftDoses = s.customDraftDoses.map(d => Number(d) || 0);
    }

    if (s.doseMode === 'inr' || s.doseMode === 'manual') App.doseMode = s.doseMode;
    if (INR_TARGETS.some(t => t.id === s.inrTarget)) App.inrTarget = s.inrTarget;
    setVal('inrValue', s.inrValue);

    const bleedEl = document.getElementById('inrBleeding');
    if (bleedEl) bleedEl.checked = !!s.inrBleeding;

    return s;
}

function setVal(id, value) {
    if (value === undefined || value === null || value === '') return;
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function clearStoredState() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        // ไม่มีอะไรให้ทำต่อ — ผู้ใช้ยังกดล้างค่าบนหน้าจอได้อยู่
    }
}

function markChangelogSeen() {
    try {
        localStorage.setItem('warfarin-changelog-seen', APP_VERSION);
    } catch (e) {
        // ไม่จำก็ได้ แค่จะเด้งซ้ำรอบหน้า
    }
}

function hasSeenChangelog() {
    try {
        return localStorage.getItem('warfarin-changelog-seen') === APP_VERSION;
    } catch (e) {
        return false;
    }
}
