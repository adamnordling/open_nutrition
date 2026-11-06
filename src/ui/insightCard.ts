// src/ui/insightCard.ts
import { FOOD_DATABASE } from '../data/index.js';
import { state } from '../state/store.js';
import { renderDietList } from './foodTracker.js';
import { renderNutritionPanel } from './nutritionPanel.js';

const insightCard = document.getElementById('food-insight-card');
const insightTitle = document.getElementById('insight-food-title');
const insightFamily = document.getElementById('insight-family');
const insightTags = document.getElementById('insight-tags');
const insightSuperpower = document.getElementById('insight-superpower');
const insightNuance = document.getElementById('insight-nuance');
const insightPrep = document.getElementById('insight-prep');
const closeInsightBtn = document.getElementById('close-insight-btn');

export function showFoodInsight(foodKey: string): void {
    if (!insightCard || !foodKey) return;
    const food = FOOD_DATABASE[foodKey];
    if (!food || !food.insights) return;

    const info = food.insights;

    if (insightTitle) insightTitle.textContent = food.displayName;
    if (insightFamily) insightFamily.textContent = info.family ?? '';
    if (insightSuperpower) insightSuperpower.textContent = info.superpower ?? '';
    if (insightNuance) insightNuance.textContent = info.nuance ?? '';
    if (insightPrep) insightPrep.textContent = info.prepTip ?? '';

    if (insightTags) {
        insightTags.innerHTML = '';
        (info.tags ?? []).forEach(tag => {
            const span = document.createElement('span');
            span.className = 'insight-tag';
            span.textContent = tag;
            insightTags.appendChild(span);
        });
    }

    insightCard.classList.remove('hidden');
}

export function hideFoodInsight(): void {
    insightCard?.classList.add('hidden');
}

export function initInsightCard(): void {
    closeInsightBtn?.addEventListener('click', () => {
        hideFoodInsight();
        state.selectedFoodId = null;
        renderDietList();
        renderNutritionPanel();
    });
}