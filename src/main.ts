// src/main.ts
import './style.css';
import { state, DAYS, getCurrentDayData, persistActiveWeek } from './state/store';
import { renderNutritionPanel } from './ui/nutritionPanel';
import { renderDietList } from './ui/foodTracker';
import { initWaterTracker } from './ui/summaryDashboard';
import { initFoodSelector } from './ui/foodSelector';
import { initComparisonMode } from './ui/comparisonMode';
import { initImportModal } from './ui/importModal';
import { initInsightCard, hideFoodInsight } from './ui/insightCard';
import type { DayOfWeek, SavedPlan } from './types/state.types';

export function showToast(message: string): void {
    const toast = document.getElementById('app-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2500);
}

// 1. Modals Backdrops & Close
const modalBackdrop = document.getElementById('app-modal-backdrop');
const savePlanModal = document.getElementById('save-plan-modal');
const loadPlanModal = document.getElementById('load-plan-modal');
const planNameInput = document.getElementById('plan-name-input') as HTMLInputElement | null;

function closeModal(): void {
    modalBackdrop?.classList.add('hidden');
    savePlanModal?.classList.add('hidden');
    loadPlanModal?.classList.add('hidden');
    document.getElementById('url-import-modal')?.classList.add('hidden');
}

document.querySelectorAll('[data-close-modal]').forEach(b => {
    b.addEventListener('click', closeModal);
});
modalBackdrop?.addEventListener('click', e => {
    if (e.target === modalBackdrop) closeModal();
});

// 2. Corner Navigation (☰ -> |||)
const navToggleBtn = document.getElementById('nav-toggle-btn');
const navDropdown = document.getElementById('nav-dropdown');

function closeNav(): void {
    navToggleBtn?.classList.remove('is-active');
    navToggleBtn?.setAttribute('aria-expanded', 'false');
    navDropdown?.classList.add('hidden');
}

navToggleBtn?.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = navToggleBtn.classList.toggle('is-active');
    navToggleBtn.setAttribute('aria-expanded', String(isOpen));
    navDropdown?.classList.toggle('hidden', !isOpen);
});

document.addEventListener('click', e => {
    const target = e.target as HTMLElement;
    if (!target.closest('.corner-nav-wrapper')) closeNav();
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeNav();
});

document.getElementById('menu-btn-clear')?.addEventListener('click', () => {
    const day = getCurrentDayData();
    if (day.unassigned.length === 0 && day.meals.length === 0) {
        closeNav();
        return;
    }
    day.unassigned = [];
    day.meals = [];
    state.selectedMealId = null;
    state.selectedFoodId = null;
    hideFoodInsight();
    persistActiveWeek();
    renderDietList();
    renderNutritionPanel();
    closeNav();
});

document.getElementById('menu-btn-profile')?.addEventListener('click', () => {
    alert('Calorie & DRI Profile customizer coming in next module!');
    closeNav();
});

// 3. Day Tabs
document.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.day-btn').forEach(b => {
            b.classList.remove('active');
        });
        btn.classList.add('active');
        const dayAttr = btn.getAttribute('data-day') as DayOfWeek | null;
        if (dayAttr) state.currentDay = dayAttr;
        state.selectedMealId = null;
        state.selectedFoodId = null;
        renderDietList();
        renderNutritionPanel();
    });
});

// 4. Add Meal & Copy Prev Day
document.getElementById('add-meal-btn')?.addEventListener('click', () => {
    const day = getCurrentDayData();
    day.meals.push({
        id: `meal_${Date.now()}`,
        name: `Meal ${day.meals.length + 1}`,
        items: []
    });
    persistActiveWeek();
    renderDietList();
});

document.getElementById('copy-prev-day-btn')?.addEventListener('click', () => {
    const idx = DAYS.indexOf(state.currentDay);
    if (idx === 0) {
        alert('No previous day for Monday!');
        return;
    }
    const prevDay = state.weekData[DAYS[idx - 1]];

    if (!prevDay || (prevDay.unassigned.length === 0 && prevDay.meals.length === 0)) {
        alert(`No meals found on ${DAYS[idx - 1]} to copy.`);
        return;
    }

    state.weekData[state.currentDay] = JSON.parse(JSON.stringify(prevDay));
    persistActiveWeek();
    renderDietList();
    renderNutritionPanel();
});

// 5. Named Week Plans (Save, Load, Clear)
document.getElementById('save-week-btn')?.addEventListener('click', () => {
    modalBackdrop?.classList.remove('hidden');
    savePlanModal?.classList.remove('hidden');
    if (planNameInput) {
        planNameInput.value = `Week Plan (${new Date().toLocaleDateString()})`;
        planNameInput.focus();
    }
});

document.getElementById('confirm-save-plan-btn')?.addEventListener('click', () => {
    const name = planNameInput?.value.trim() || `Plan ${Date.now()}`;
    const allPlans = JSON.parse(localStorage.getItem('open_nutrition_saved_weeks') || '{}') as Record<
        string,
        SavedPlan
    >;

    allPlans[name] = {
        name,
        date: new Date().toLocaleDateString(),
        data: JSON.parse(JSON.stringify(state.weekData))
    };

    localStorage.setItem('open_nutrition_saved_weeks', JSON.stringify(allPlans));
    closeModal();
    showToast(`Saved plan "${name}"`);
});

function renderSavedPlansList(): void {
    const listEl = document.getElementById('saved-plans-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const allPlans = JSON.parse(localStorage.getItem('open_nutrition_saved_weeks') || '{}') as Record<
        string,
        SavedPlan
    >;
    const names = Object.keys(allPlans);

    if (names.length === 0) {
        listEl.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 12px;">No saved week plans yet.</div>`;
        return;
    }

    names.forEach(name => {
        const item = allPlans[name];
        const row = document.createElement('div');
        row.className = 'saved-plan-item';
        row.innerHTML = `
            <div>
                <div class="saved-plan-name">${item.name}</div>
                <div class="saved-plan-date">Saved on ${item.date}</div>
            </div>
            <div class="plan-item-actions">
                <button type="button" class="plan-load-btn">Load</button>
                <button type="button" class="plan-del-btn" title="Delete plan">&times;</button>
            </div>
        `;

        row.querySelector('.plan-load-btn')?.addEventListener('click', () => {
            state.weekData = JSON.parse(JSON.stringify(item.data));
            state.selectedMealId = null;
            state.selectedFoodId = null;
            persistActiveWeek();
            renderDietList();
            renderNutritionPanel();
            closeModal();
            showToast(`Loaded "${item.name}"`);
        });

        row.querySelector('.plan-del-btn')?.addEventListener('click', () => {
            delete allPlans[name];
            localStorage.setItem('open_nutrition_saved_weeks', JSON.stringify(allPlans));
            renderSavedPlansList();
            showToast(`Deleted "${name}"`);
        });

        listEl.appendChild(row);
    });
}

document.getElementById('load-week-btn')?.addEventListener('click', () => {
    modalBackdrop?.classList.remove('hidden');
    loadPlanModal?.classList.remove('hidden');
    renderSavedPlansList();
});

document.getElementById('clear-week-btn')?.addEventListener('click', () => {
    DAYS.forEach(day => {
        state.weekData[day] = { unassigned: [], meals: [] };
    });
    state.selectedMealId = null;
    state.selectedFoodId = null;
    persistActiveWeek();
    renderDietList();
    renderNutritionPanel();
    showToast('Cleared active week');
});

// 6. Mode Tabs
document.getElementById('tab-diet')?.addEventListener('click', () => {
    state.mode = 'diet';
    document.getElementById('tab-diet')?.classList.add('active');
    document.getElementById('tab-compare')?.classList.remove('active');
    document.getElementById('diet-mode-views')?.classList.remove('hidden');
    document.getElementById('compare-mode-views')?.classList.add('hidden');
    renderNutritionPanel();
});

document.getElementById('tab-compare')?.addEventListener('click', () => {
    state.mode = 'compare';
    document.getElementById('tab-compare')?.classList.add('active');
    document.getElementById('tab-diet')?.classList.remove('active');
    document.getElementById('diet-mode-views')?.classList.add('hidden');
    document.getElementById('compare-mode-views')?.classList.remove('hidden');
    renderNutritionPanel();
});

// 7. Footer
document.getElementById('footer-scroll-top')?.addEventListener('click', e => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

const footerYear = document.getElementById('footer-year');
if (footerYear) footerYear.textContent = String(new Date().getFullYear());

// 8. Global Click
document.addEventListener('click', e => {
    const target = e.target as HTMLElement;
    const isInside =
        target.closest('.meal-group-card') ||
        target.closest('.quick-log-card') ||
        target.closest('#food-insight-card') ||
        target.closest('.input-card') ||
        target.closest('.corner-nav-wrapper');

    if (!isInside && (state.selectedMealId !== null || state.selectedFoodId !== null)) {
        state.selectedMealId = null;
        state.selectedFoodId = null;
        hideFoodInsight();
        renderDietList();
        renderNutritionPanel();
    }
});

// 9. Bootstrap
initInsightCard();
initWaterTracker();
initFoodSelector();
initComparisonMode();
initImportModal(showToast);
renderDietList();
renderNutritionPanel();
