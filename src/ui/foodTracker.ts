import type { DietItem } from '../types/state.types.js';
import { state, getCurrentDayData, persistActiveWeek } from '../state/store.js';
import { getNutrientValue, formatMultiUnits } from '../services/calculations.js';
import { renderNutritionPanel } from './nutritionPanel.js';
import { showFoodInsight, hideFoodInsight } from './insightCard.js';

export function renderDietList(): void {
    const mealsContainer = document.getElementById('tracker-meals-container');
    const listEl = document.getElementById('diet-list');
    const badge = document.getElementById('active-day-badge');

    if (badge) badge.textContent = state.currentDay;
    if (!mealsContainer || !listEl) return;

    mealsContainer.innerHTML = '';
    listEl.innerHTML = '';

    const day = getCurrentDayData();

    const createFoodItem = (item: DietItem, onRemove: () => void): HTMLElement => {
        const li = document.createElement('li');
        const isSelected = state.selectedFoodId === item.id;
        li.className = `diet-item ${isSelected ? 'selected' : ''}`;
        li.innerHTML = `
            <div class="diet-item-info">
                <span class="diet-food-title">${item.displayName}</span>
                <span class="diet-unit-breakdown">(${formatMultiUnits(item.amount)})</span>
            </div>
            <button class="remove-btn" type="button" title="Remove">&times;</button>
        `;

        li.addEventListener('click', e => {
            e.stopPropagation();
            if (state.selectedFoodId === item.id) {
                state.selectedFoodId = null;
                hideFoodInsight();
            } else {
                state.selectedFoodId = item.id;
                state.selectedMealId = null;
                showFoodInsight(item.foodKey);
            }
            renderDietList();
            renderNutritionPanel();
        });

        li.addEventListener('mouseenter', () => {
            if (!state.selectedFoodId) {
                state.hoveredFood = item;
                renderNutritionPanel();
            }
        });

        li.addEventListener('mouseleave', () => {
            if (!state.selectedFoodId) {
                state.hoveredFood = null;
                renderNutritionPanel();
            }
        });

        li.querySelector('.remove-btn')?.addEventListener('click', e => {
            e.stopPropagation();
            if (state.selectedFoodId === item.id) {
                state.selectedFoodId = null;
                hideFoodInsight();
            }
            onRemove();
            persistActiveWeek();
            renderDietList();
            renderNutritionPanel();
        });

        return li;
    };

    // Render Meals
    day.meals.forEach(meal => {
        const isSelected = state.selectedMealId === meal.id;
        const card = document.createElement('div');
        card.className = `meal-group-card ${isSelected ? 'selected' : ''}`;

        const cals = Math.round(
            meal.items.reduce((acc, item) => acc + getNutrientValue(item, 'general', 'Calories'), 0)
        );

        card.innerHTML = `
            <div class="meal-group-header">
                <span class="meal-header-left">
                    <span>${meal.name}</span>
                    <span class="meal-cals-badge">${cals} kcal</span>
                </span>
                <span class="meal-header-right">
                    <button type="button" class="meal-delete-btn" title="Delete meal">&times;</button>
                </span>
            </div>
            <ul class="diet-list meal-items-list"></ul>
        `;

        card.addEventListener('click', e => {
            const target = e.target as HTMLElement;
            if (target.closest('.diet-item') || target.closest('.meal-delete-btn')) return;
            state.selectedMealId = state.selectedMealId === meal.id ? null : meal.id;
            state.selectedFoodId = null;
            hideFoodInsight();
            renderDietList();
            renderNutritionPanel();
        });

        card.querySelector('.meal-delete-btn')?.addEventListener('click', e => {
            e.stopPropagation();
            day.meals = day.meals.filter(m => m.id !== meal.id);
            if (state.selectedMealId === meal.id) state.selectedMealId = null;
            persistActiveWeek();
            renderDietList();
            renderNutritionPanel();
        });

        const ul = card.querySelector('.meal-items-list');
        meal.items.forEach((item, idx) => {
            ul?.appendChild(createFoodItem(item, () => meal.items.splice(idx, 1)));
        });

        mealsContainer.appendChild(card);
    });

    // Render Quick Log
    if (day.unassigned.length > 0) {
        const quickCals = Math.round(
            day.unassigned.reduce((acc, item) => acc + getNutrientValue(item, 'general', 'Calories'), 0)
        );
        const isQuickSelected = state.selectedMealId === 'quick_log';

        const quickCard = document.createElement('div');
        quickCard.className = `quick-log-card ${isQuickSelected ? 'selected' : ''}`;
        quickCard.innerHTML = `
            <div class="quick-log-header">
                <span class="quick-log-title">⚡ Quick Log</span>
                <span class="quick-log-cals">${quickCals} kcal</span>
            </div>
            <ul class="diet-list quick-items-list" style="padding: 4px;"></ul>
        `;

        quickCard.addEventListener('click', e => {
            const target = e.target as HTMLElement;
            if (target.closest('.diet-item')) return;
            state.selectedMealId = state.selectedMealId === 'quick_log' ? null : 'quick_log';
            state.selectedFoodId = null;
            hideFoodInsight();
            renderDietList();
            renderNutritionPanel();
        });

        const quickUl = quickCard.querySelector('.quick-items-list');
        day.unassigned.forEach((item, idx) => {
            quickUl?.appendChild(createFoodItem(item, () => day.unassigned.splice(idx, 1)));
        });

        listEl.appendChild(quickCard);
    }
}