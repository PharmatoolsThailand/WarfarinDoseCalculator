// ค่าคงที่ทั้งหมดของเครื่องมือ — แหล่งความจริงเดียวสำหรับขนาดเม็ดยา สี และข้อมูลอ้างอิง

const PILL_DEFS = {
    1: { color: '#ffffff', border: '#94a3b8' },
    2: { color: '#f28b30', border: '#f28b30' },
    3: { color: '#0b5394', border: '#0b5394' },
    5: { color: '#e84c95', border: '#e84c95' }
};

const PILL_SIZES = Object.keys(PILL_DEFS).map(Number).sort((a, b) => a - b);

// วันที่ให้ยาในแต่ละความถี่ต่อสัปดาห์ (0 = จันทร์)
const FREQ_TEMPLATES = {
    7: [0, 1, 2, 3, 4, 5, 6],
    6: [0, 1, 2, 3, 4, 5],
    5: [0, 1, 2, 4, 5],
    4: [0, 2, 4, 6],
    3: [0, 2, 4],
    2: [0, 3],
    1: [0]
};

const DAY_NAMES = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
const DAY_SHORT = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
const MONTH_NAMES = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                     'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

// ขอบเขตการคำนวณ — กันค่าที่ผู้ใช้พิมพ์เองหลุดจนทำให้ระบบค้างหรือได้ NaN
const LIMITS = {
    MAX_WEEKLY_DOSE: 100,
    MAX_DAILY_DOSE: 25,
    MAX_DISPENSE_DAYS: 365,
    MAX_CALENDAR_MONTHS: 24,
    MIN_YEAR: 2000,
    MAX_YEAR: 2100,
    MAX_REGIMEN_SHOWN: 5,
    MAX_PILLS_PER_DAY: 6
};

// ความกว้างที่ปฏิทินยังอ่านออก — จอที่แคบกว่านี้จะย่อลงตามสัดส่วนแทนการเลื่อนแนวนอน
const CALENDAR_BASE_WIDTH = 560;

// กติกาเดียวกับตาราง GUIDELINE_ROWS ด้านล่าง แปลงเป็นช่วงตัวเลขให้ระบบเทียบได้
// upTo คือค่า INR สูงสุดที่ยังเข้าเงื่อนไขนั้น (เทียบหลังปัดเป็นทศนิยม 1 ตำแหน่ง)
const INR_TARGETS = [
    {
        id: '2.0-3.0', label: '2.0 – 3.0',
        rules: [
            { upTo: 1.4, action: 'increase', min: 10, max: 20, text: 'เพิ่มขนาดยา 10 – 20 %' },
            { upTo: 1.9, action: 'increase', min: 5, max: 10, text: 'เพิ่มขนาดยา 5 – 10 %' },
            { upTo: 3.0, action: 'same', text: 'ใช้ยาขนาดเดิม' },
            { upTo: 3.9, action: 'decrease', min: 5, max: 10, text: 'ลดขนาดยา 5 – 10 %' },
            { upTo: 4.9, action: 'holdDecrease', pct: 10, holdDays: 1, text: 'Hold 1 วัน แล้วลดขนาดยา 10 %' },
            { upTo: 8.9, action: 'clinical', text: 'Omit 1 – 2 doses + Vitamin K 1 mg orally' },
            { upTo: Infinity, action: 'clinical', text: 'Vitamin K 5 – 10 mg orally' }
        ]
    },
    {
        id: '2.5-3.5', label: '2.5 – 3.5',
        rules: [
            { upTo: 1.8, action: 'increase', min: 10, max: 20, text: 'เพิ่มขนาดยา 10 – 20 %' },
            { upTo: 2.4, action: 'increase', min: 5, max: 10, text: 'เพิ่มขนาดยา 5 – 10 %' },
            { upTo: 3.5, action: 'same', text: 'ใช้ยาขนาดเดิม' },
            { upTo: 4.5, action: 'decrease', min: 5, max: 10, text: 'ลดขนาดยา 5 – 10 %' },
            { upTo: 4.9, action: 'holdDecrease', pct: 10, holdDays: 1, text: 'Hold 1 วัน แล้วลดขนาดยา 10 %' },
            { upTo: 8.9, action: 'clinical', text: 'Omit 1 – 2 doses + Vitamin K 1 mg orally' },
            { upTo: Infinity, action: 'clinical', text: 'Vitamin K 5 – 10 mg orally' }
        ]
    }
];

// เลือดออกรุนแรงใช้แนวทางนี้ทุกค่า INR — แถวสองแถวก่อนหน้าในตารางระบุไว้ว่า no Bleeding
const MAJOR_BLEEDING_RULE = {
    action: 'clinical',
    text: 'Vitamin K 10 mg IV plus FFP',
    detail: 'ให้ Vitamin K ซ้ำทุก 12 ชั่วโมงหากจำเป็น'
};

const GUIDELINE_ROWS = [
    { keep23: '< 1.5',   keep2535: '< 1.9',    action: 'เพิ่มขนาดยา 10 - 20 %' },
    { keep23: '1.5 - 1.9', keep2535: '1.9 - 2.4', action: 'เพิ่มขนาดยา 5 - 10 %' },
    { keep23: '2.0 - 3.0', keep2535: '2.5 - 3.5', action: 'ใช้ยาขนาดเดิม', highlight: true },
    { keep23: '3.1 - 3.9', keep2535: '3.6 - 4.5', action: 'ลดขนาดยา 5 - 10 %' },
    { keep23: '4.0 - 4.9', keep2535: '4.6 - 4.9', action: 'Hold 1 day + ลดขนาดยา 10 %' },
    { merged: '5.0 - 8.9 no Bleeding', action: 'Omit 1 - 2 doses + Vitamin K 1 mg orally' },
    { merged: '≥ 9 no Bleeding', action: 'Vitamin K 5 - 10 mg orally' },
    { merged: 'Major Bleeding<br>Any INR', action: 'Vitamin K 10 mg IV plus FFP<br><span class="text-small">Repeat Vitamin K q 12 hr if needed</span>' }
];

const REFERENCES = [
    'University of Wisconsin – UW Health. Warfarin Management-Adult-Inpatient Clinical Practice 2011.',
    'สมาคมแพทย์โรคหัวใจแห่งประเทศไทยฯ แนวทางการรักษาผู้ป่วยด้วยยาต้านการแข็งตัวของเลือดชนิดรับประทาน 2553.',
    'สุภารัตน์ วัฒนสมบัติ (โรงพยาบาลเชียงรายประชานุเคราะห์) common pitfall in warfarin management. 2560.'
];

const APP_VERSION = '2.0.0';

const CHANGELOG = [
    {
        version: '2.0.0', date: '20 สิงหาคม 2569', icon: '🎨',
        items: [
            '<strong>ออกแบบหน้าเว็บใหม่ทั้งหมด</strong> ใช้โครงเดียวกับเครื่องมือ Drug Timeline — หัวเว็บการ์ดเดียว แถบสรุปขนาดยาตรึงไว้ตลอด และแยกแผงเครื่องมือออกจากพื้นที่แสดงผล',
            '<strong>รองรับมือถือเต็มรูปแบบ</strong> แถบปุ่มลัดตรึงด้านล่าง สูตรยาแสดงเป็นการ์ดแทนตารางเลื่อนแนวนอน และติดตั้งลงหน้าจอโฮมได้ (PWA)',
            '<strong>จำค่าที่กรอกไว้</strong> ขนาดยา เม็ดยาที่มี ข้อมูลผู้ป่วย และสูตรที่เลือก จะไม่หายเมื่อรีเฟรชหน้า',
            '<strong>แก้ไขข้อผิดพลาด</strong> วันนัดคลาดเคลื่อน 1 วันเมื่อใช้ก่อน 07:00 น., สูตรที่กรอกเองหายเมื่อติ๊กเม็ดยา, วันงดยาแสดงผิดตอนพิมพ์ และการ์ดสรุปที่เคยแสดงขนาดยารวมแทนส่วนต่าง'
        ]
    },
    {
        version: '1.3.0', date: '25 เมษายน 2569', icon: '🌼',
        items: [
            '<strong>เพิ่มยาเม็ด 1 mg (สีขาว)</strong> เพิ่มขนาดยา 1 mg พร้อมทำขอบสีเทาเข้มเพื่อให้เห็นชัดเจนบนพื้นขาว',
            '<strong>เพิ่มระบบตั้งค่าข้อมูลผู้ป่วย</strong> เพิ่มปุ่มเปิดหน้าต่างสำหรับกรอก ชื่อ-นามสกุล, HN, และเป้าหมาย INR'
        ]
    },
    {
        version: '1.2.0', date: '22 เมษายน 2569', icon: '🍀',
        items: [
            '<strong>เพิ่มฟังก์ชันกำหนด Regimen เอง</strong> กำหนดขนาดยาต่อวันและวันงดยาเองได้ โดยตัวเลขจะซิงค์กับทุกจุดของเว็บ รวมทั้งปฏิทินการรับประทานยา',
            '<strong>แก้ไขบัค</strong> ทำให้การแสดงเลขขนาดยาถูกต้องและเหมาะสมขึ้น'
        ]
    },
    {
        version: '1.1.0', date: '19 เมษายน 2569', icon: '🌱',
        items: [
            'เพิ่มฟังก์ชัน <strong>การหักแบ่ง 1/4 เม็ด</strong> สำหรับการจัด Regimen ยา',
            'เพิ่มระบบ <strong>พิมพ์ปฏิทินการกินยา</strong> สำหรับแจกให้ผู้ป่วยกลับบ้าน รองรับกระดาษ A4 และ A5 (แนวนอน)'
        ]
    },
    {
        version: '1.0.0', date: '18 เมษายน 2569', icon: '🥚',
        items: ['เปิดตัวเครื่องมือ<strong>คำนวณขนาดยา Warfarin</strong>']
    }
];
