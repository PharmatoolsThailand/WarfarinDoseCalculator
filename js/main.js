// จุดเริ่มต้นของแอป — โหลดเป็นไฟล์สุดท้ายเสมอ

function defaultMonthValue() {
    const today = new Date();
    return monthInputValue(today.getFullYear(), today.getMonth());
}

function applyRestoredDoses(saved) {
    setSelectDose('currentDose', saved && saved.currentDose ? parseFloat(saved.currentDose) : 11.00);
    setSelectDose('targetDose', saved && saved.targetDose ? parseFloat(saved.targetDose) : 11.50);
}

function restoreSelection(saved) {
    if (!saved) return;

    if (Array.isArray(saved.customRegimenDoses)) {
        const total = saved.customRegimenDoses.reduce((sum, d) => sum + (Number(d) || 0), 0);
        if (total > 0) {
            App.customValidDoses = [{ dose: 0, combo: [] }].concat(
                listAchievableDoses(getAvailablePills(), isQuarterAllowed(), LIMITS.MAX_DAILY_DOSE)
            );
            const days = saved.customRegimenDoses.map(dose => {
                if (!dose) return null;
                const item = App.customValidDoses[draftIndexFor(Number(dose))];
                return item && item.dose ? { dose: item.dose, combo: item.combo } : null;
            });
            App.regimens.unshift(makeCustomRegimen(days, total));
            App.selectedIndex = 0;
            return;
        }
    }

    const idx = Number(saved.selectedIndex);
    if (isFinite(idx) && idx >= 0 && idx < Math.min(App.regimens.length, LIMITS.MAX_REGIMEN_SHOWN)) {
        App.selectedIndex = idx;
    }
}

function debounce(fn, wait) {
    let timer = null;
    return function () {
        clearTimeout(timer);
        timer = setTimeout(fn, wait);
    };
}

// ปฏิทินสร้างใหม่ทั้งเดือนทุกครั้ง จึงหน่วงไว้ไม่ให้วาดซ้ำทุกตัวอักษรที่พิมพ์
const onPatientInput = debounce(function () {
    renderPatientStrip();
    renderCalendarPreview();
    saveState();
}, 250);

// ไฮไลต์ปุ่มทางลัดให้ตรงกับส่วนที่กำลังอ่านอยู่
function initScrollSpy() {
    const links = Array.from(document.querySelectorAll('[data-target]'));
    const sections = links
        .map(a => document.getElementById(a.dataset.target))
        .filter(Boolean);
    if (sections.length === 0) return;

    const visible = new Set();

    // ไม่มีส่วนไหนอยู่ในแถบกลางจอ (เช่นตอนอยู่บนสุดหรือล่างสุด) ให้เลือกส่วนที่ใกล้ขอบบนที่สุดแทน
    function nearestSection() {
        let best = sections[0];
        let bestGap = Infinity;
        sections.forEach(s => {
            const gap = Math.abs(s.getBoundingClientRect().top);
            if (gap < bestGap) { bestGap = gap; best = s; }
        });
        return best;
    }

    function highlight() {
        const active = sections.find(s => visible.has(s.id)) || nearestSection();
        links.forEach(a => a.classList.toggle('is-active', a.dataset.target === active.id));
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) visible.add(e.target.id);
            else visible.delete(e.target.id);
        });
        highlight();
    }, { rootMargin: '-20% 0px -60% 0px' });

    sections.forEach(s => observer.observe(s));
    highlight();
}

function bindEvents() {
    document.getElementById('currentDose').addEventListener('change', recalculate);
    document.getElementById('targetDose').addEventListener('change', recalculate);
    document.getElementById('chk-quarter').addEventListener('change', onQuarterToggle);

    document.querySelectorAll('input[name="dispenseType"]').forEach(el => {
        el.addEventListener('change', onDispenseModeChange);
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeTopModal();
    });
}

function initApp() {
    renderGuideline();
    renderPillSelectors('pillSelectors', '', 'updatePillState');

    const saved = restoreState();
    refreshPillToggles();

    updateDropdownOptions();
    applyRestoredDoses(saved);

    if (!document.getElementById('startMonth').value) {
        document.getElementById('startMonth').value = defaultMonthValue();
    }
    if (!document.getElementById('endMonth').value) {
        document.getElementById('endMonth').value = defaultMonthValue();
    }
    if (!document.getElementById('dispenseDays').value) {
        document.getElementById('dispenseDays').value = 30;
    }

    bindEvents();

    const target = getTargetDose();
    renderDoseSummary(getCurrentDose(), target);
    buildRegimens(target);
    restoreSelection(saved);

    updateDateFromDays();
    renderAll();
    renderInrTargets();
    applyDoseMode();
    initScrollSpy();
    watchCalendarWidth();

    document.getElementById('appVersion').textContent = APP_VERSION;
    initVisitorCounter();

    if (!hasSeenChangelog()) openChangelog();
}

document.addEventListener('DOMContentLoaded', initApp);
