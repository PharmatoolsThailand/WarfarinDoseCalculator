// นับผู้เข้าชมผ่าน GoatCounter (ไม่ใช้คุกกี้)
// ต้องเปิด public counter ในหน้า Settings ของ GoatCounter ป้ายจึงจะดึงยอดมาแสดงได้

const GOATCOUNTER_CODE = 'warfarin';

function initVisitorCounter() {
    // เปิดจากไฟล์ตรง ๆ ไม่มีโดเมนให้นับ และ fetch ข้ามโดเมนจะถูกบล็อก
    if (location.protocol === 'file:') return;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://gc.zgo.at/count.js';
    script.setAttribute('data-goatcounter', `https://${GOATCOUNTER_CODE}.goatcounter.com/count`);
    document.head.appendChild(script);

    fetch(`https://${GOATCOUNTER_CODE}.goatcounter.com/counter/TOTAL.json`)
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
            const total = data && (data.count_unique || data.count);
            if (!total) return;

            const badge = document.getElementById('visitorBadge');
            const count = document.getElementById('visitorCount');
            if (badge && count) {
                count.textContent = total;
                badge.hidden = false;
            }
        })
        .catch(() => {
            // นับไม่ได้ก็ไม่ต้องแสดงป้าย เครื่องมือหลักยังใช้งานได้ตามปกติ
        });
}
