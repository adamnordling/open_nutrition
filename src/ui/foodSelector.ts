// src/ui/foodSelector.ts
import { FOOD_DATABASE } from '../data/index.js';
import { UNIT_CONVERSIONS, type UnitKey } from '../config/units.js';
import { state, getCurrentDayData, persistActiveWeek } from '../state/store.js';
import { renderDietList } from './foodTracker.js';
import { renderNutritionPanel } from './nutritionPanel.js';
import type { FoodProfile } from '../types/food.types.js';

let selectedFoodKey: string | null = null;
let currentUnit: UnitKey = 'g';
let highlightedFoodIndex = -1;
let highlightedAmountIndex = -1;

const searchStepEl = document.getElementById('food-step-search');
const quantityStepEl = document.getElementById('food-step-quantity');
const searchInput = document.getElementById('food-search-input') as HTMLInputElement | null;
const dropdownEl = document.getElementById('food-dropdown');
const dropdownList = document.getElementById('food-dropdown-list');
const selectedFoodName = document.getElementById('selected-food-name');
const amountInput = document.getElementById('food-amount-input') as HTMLInputElement | null;
const amountDropdown = document.getElementById('amount-dropdown');
const amountDropdownList = document.getElementById('amount-dropdown-list');
const cancelFoodBtn = document.getElementById('cancel-food-selection');
const confirmAddBtn = document.getElementById('confirm-add-food-btn');
const tutorialHint = document.getElementById('first-time-hint');
const unitTriggerBtn = document.getElementById('unit-trigger-btn');
const unitMenu = document.getElementById('unit-menu');
const currentUnitLabel = document.getElementById('current-unit-label');

function getSortedFoods(): Array<{ key: string } & FoodProfile> {
    return Object.keys(FOOD_DATABASE)
        .map(key => ({ key, ...FOOD_DATABASE[key] }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function renderFoodDropdown(filterQuery = ''): void {
    if (!dropdownList) return;
    dropdownList.innerHTML = '';
    const query = filterQuery.trim().toLowerCase();
    const foods = getSortedFoods();

    const filtered = foods
        .filter(food => {
            if (!query) return true;
            const matchesName = food.displayName.toLowerCase().includes(query);
            const matchesAlias = food.aliases.some(a => a.toLowerCase().includes(query));
            return matchesName || matchesAlias;
        })
        .slice(0, 10);

    if (filtered.length === 0) {
        dropdownList.innerHTML = `
            <li style="padding: 10px; font-size: 12px; color: var(--text-muted); text-align: center;">
                No matching foods found
            </li>
        `;
        return;
    }

    filtered.forEach((food, index) => {
        const li = document.createElement('li');
        li.className = 'food-dropdown-item';
        if (query) li.classList.add('is-matched');
        if (index === highlightedFoodIndex) li.classList.add('is-selected');

        const calories = food.general.Calories ?? 0;
        li.innerHTML = `
            <span>${food.displayName}</span>
            <span class="item-calories">${calories} kcal/100g</span>
        `;

        li.addEventListener('mousedown', e => {
            e.preventDefault();
            selectFood(food.key);
        });

        dropdownList.appendChild(li);
    });

    const activeFood = dropdownList.querySelector('.food-dropdown-item.is-selected');
    activeFood?.scrollIntoView({ block: 'nearest' });
}

function openFoodDropdown(): void {
    dropdownEl?.classList.remove('hidden');
    highlightedFoodIndex = -1;
    renderFoodDropdown(searchInput?.value ?? '');
}

function closeFoodDropdown(): void {
    dropdownEl?.classList.add('hidden');
    highlightedFoodIndex = -1;
}

function selectFood(foodKey: string): void {
    selectedFoodKey = foodKey;
    const food = FOOD_DATABASE[foodKey];
    if (!food) return;

    if (selectedFoodName) selectedFoodName.textContent = food.displayName;
    closeFoodDropdown();

    searchStepEl?.classList.add('hidden');
    quantityStepEl?.classList.remove('hidden');

    if (amountInput) {
        amountInput.value = '';
        amountInput.focus();
    }

    if (tutorialHint) tutorialHint.style.display = 'none';
}

export function resetToSearch(): void {
    selectedFoodKey = null;
    closeAmountDropdown();
    closeFoodDropdown();
    unitMenu?.classList.add('hidden');

    quantityStepEl?.classList.add('hidden');
    searchStepEl?.classList.remove('hidden');

    if (searchInput) {
        searchInput.value = '';
        searchInput.blur();
    }
}

function renderAmountPresets(): void {
    if (!amountDropdownList) return;
    amountDropdownList.innerHTML = '';
    const presets = UNIT_CONVERSIONS[currentUnit].presets;

    presets.forEach((val, idx) => {
        const li = document.createElement('li');
        li.className = 'amount-preset-item';
        if (idx === highlightedAmountIndex) li.classList.add('is-selected');
        li.innerHTML = `<span>${val} ${currentUnit}</span>`;

        li.addEventListener('mousedown', e => {
            e.preventDefault();
            if (amountInput) amountInput.value = String(val);
            closeAmountDropdown();
            amountInput?.focus();
        });

        amountDropdownList.appendChild(li);
    });

    const activeItem = amountDropdownList.querySelector('.amount-preset-item.is-selected');
    activeItem?.scrollIntoView({ block: 'nearest' });
}

function openAmountDropdown(): void {
    amountDropdown?.classList.remove('hidden');
    renderAmountPresets();
}

function closeAmountDropdown(): void {
    amountDropdown?.classList.add('hidden');
    highlightedAmountIndex = -1;
}

function commitAddFood(): void {
    if (!selectedFoodKey) return;
    const food = FOOD_DATABASE[selectedFoodKey];
    if (!food) return;

    const rawAmount = parseFloat(amountInput?.value ?? '0');
    if (isNaN(rawAmount) || rawAmount <= 0) return;

    const grams = rawAmount * UNIT_CONVERSIONS[currentUnit].toGrams;
    const day = getCurrentDayData();

    const newItem = {
        id: Date.now() + Math.random(),
        foodKey: selectedFoodKey,
        amount: Math.round(grams),
        displayName: food.displayName
    };

    if (state.selectedMealId && state.selectedMealId !== 'quick_log') {
        const meal = day.meals.find(m => m.id === state.selectedMealId);
        if (meal) meal.items.push(newItem);
        else day.unassigned.push(newItem);
    } else {
        day.unassigned.push(newItem);
    }

    persistActiveWeek();
    renderDietList();
    renderNutritionPanel();
    resetToSearch();
}

function switchUnit(newUnit: UnitKey): void {
    if (!UNIT_CONVERSIONS[newUnit]) return;
    if (newUnit === currentUnit) {
        unitMenu?.classList.add('hidden');
        return;
    }

    const currentVal = parseFloat(amountInput?.value ?? '0');
    if (!isNaN(currentVal) && currentVal > 0) {
        const grams = currentVal * UNIT_CONVERSIONS[currentUnit].toGrams;
        const converted = grams / UNIT_CONVERSIONS[newUnit].toGrams;
        if (amountInput) {
            amountInput.value = converted % 1 === 0 ? String(converted) : String(parseFloat(converted.toFixed(2)));
        }
    }

    currentUnit = newUnit;
    if (currentUnitLabel) currentUnitLabel.textContent = newUnit;

    document.querySelectorAll('.unit-opt').forEach(o => {
        o.classList.toggle('active', o.getAttribute('data-unit') === newUnit);
    });

    unitMenu?.classList.add('hidden');
    renderAmountPresets();
}

export function initFoodSelector(): void {
    cancelFoodBtn?.addEventListener('click', resetToSearch);
    confirmAddBtn?.addEventListener('click', commitAddFood);

    unitTriggerBtn?.addEventListener('click', e => {
        e.stopPropagation();
        unitMenu?.classList.toggle('hidden');
    });

    document.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        if (!target.closest('.unit-dropdown-container')) {
            unitMenu?.classList.add('hidden');
        }
    });

    document.querySelectorAll('.unit-opt').forEach(opt => {
        opt.addEventListener('click', () => {
            const u = opt.getAttribute('data-unit') as UnitKey | null;
            if (u) switchUnit(u);
        });
    });

    amountInput?.addEventListener('focus', openAmountDropdown);
    amountInput?.addEventListener('blur', () => setTimeout(closeAmountDropdown, 150));

    amountInput?.addEventListener('keydown', e => {
        const presets = UNIT_CONVERSIONS[currentUnit].presets;
        if (presets.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (amountDropdown?.classList.contains('hidden')) {
                openAmountDropdown();
                highlightedAmountIndex = 0;
            } else {
                highlightedAmountIndex = (highlightedAmountIndex + 1) % presets.length;
            }
            renderAmountPresets();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (amountDropdown?.classList.contains('hidden')) {
                openAmountDropdown();
                highlightedAmountIndex = presets.length - 1;
            } else {
                highlightedAmountIndex = (highlightedAmountIndex - 1 + presets.length) % presets.length;
            }
            renderAmountPresets();
        } else if (e.key === 'Enter') {
            if (!amountDropdown?.classList.contains('hidden') && highlightedAmountIndex >= 0) {
                e.preventDefault();
                amountInput.value = String(presets[highlightedAmountIndex]);
                closeAmountDropdown();
            } else {
                commitAddFood();
            }
        } else if (e.key === 'Escape') {
            closeAmountDropdown();
        }
    });

    searchInput?.addEventListener('focus', () => {
        if (tutorialHint) tutorialHint.style.display = 'none';
        openFoodDropdown();
    });
    searchInput?.addEventListener('input', () => {
        openFoodDropdown();
        renderFoodDropdown(searchInput.value);
    });
    searchInput?.addEventListener('blur', () => setTimeout(closeFoodDropdown, 150));

    searchInput?.addEventListener('keydown', e => {
        const items = dropdownList?.querySelectorAll('.food-dropdown-item') ?? [];
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            highlightedFoodIndex = (highlightedFoodIndex + 1) % items.length;
            renderFoodDropdown(searchInput?.value ?? '');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            highlightedFoodIndex = (highlightedFoodIndex - 1 + items.length) % items.length;
            renderFoodDropdown(searchInput?.value ?? '');
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const q = searchInput?.value.trim().toLowerCase() ?? '';
            const filtered = getSortedFoods().filter(f =>
                !q || f.displayName.toLowerCase().includes(q) || f.aliases.some(a => a.toLowerCase().includes(q))
            );
            if (highlightedFoodIndex >= 0 && filtered[highlightedFoodIndex]) {
                selectFood(filtered[highlightedFoodIndex].key);
            } else if (filtered.length > 0) {
                selectFood(filtered[0].key);
            }
        } else if (e.key === 'Escape') {
            closeFoodDropdown();
        }
    });
}