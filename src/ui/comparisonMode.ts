// src/ui/comparisonMode.ts
import { FOOD_DATABASE } from '../data/index.js';
import { UNIT_CONVERSIONS, type UnitKey } from '../config/units.js';
import { state } from '../state/store.js';
import { renderNutritionPanel } from './nutritionPanel.js';

export function updateSlotUI(slotIndex: number): void {
    const slot = state.compareSlots[slotIndex];
    const cardEl = document.getElementById(`slot-${slotIndex + 1}-card`);
    const statusEl = document.getElementById(`slot-${slotIndex + 1}-status`);
    const badgeEl = cardEl?.querySelector<HTMLElement>('.slot-badge');

    if (badgeEl) badgeEl.style.backgroundColor = slot.color;

    if (statusEl) {
        if (slot.parsed) {
            statusEl.innerHTML = `Loaded: <strong>${slot.parsed.amount}g</strong> ${slot.parsed.displayName}`;
            statusEl.classList.add('active');
        } else {
            statusEl.textContent = 'No food loaded';
            statusEl.classList.remove('active');
        }
    }
}

function setupComparisonSlot(slotIndex: number): void {
    const num = slotIndex + 1;
    let slotFoodKey: string | null = null;
    let slotUnit: UnitKey = 'g';
    const highlightedIndex = -1;
    const highlightedAmount = -1;

    const searchStep = document.getElementById(`slot-${num}-step-search`);
    const qtyStep = document.getElementById(`slot-${num}-step-quantity`);
    const searchInput = document.getElementById(`slot-${num}-search-input`) as HTMLInputElement | null;
    const dropdown = document.getElementById(`slot-${num}-dropdown`);
    const dropdownList = document.getElementById(`slot-${num}-dropdown-list`);
    const selectedName = document.getElementById(`slot-${num}-selected-name`);
    const amountInput = document.getElementById(`slot-${num}-amount-input`) as HTMLInputElement | null;
    const amountDropdown = document.getElementById(`slot-${num}-amount-dropdown`);
    const amountDropdownList = document.getElementById(`slot-${num}-amount-dropdown-list`);
    const cancelBtn = document.getElementById(`slot-${num}-cancel-selection`);
    const confirmBtn = document.getElementById(`slot-${num}-confirm-btn`);
    const unitBtn = document.getElementById(`slot-${num}-unit-btn`);
    const unitMenu = document.getElementById(`slot-${num}-unit-menu`);
    const unitLabel = document.getElementById(`slot-${num}-unit-label`);
    const clearBtn = document.getElementById(`clear-slot-${num}-btn`);

    function renderSlotFoods(q = ''): void {
        if (!dropdownList) return;
        dropdownList.innerHTML = '';
        const query = q.trim().toLowerCase();
        const filtered = Object.keys(FOOD_DATABASE)
            .map(k => ({ key: k, ...FOOD_DATABASE[k] }))
            .filter(
                f =>
                    !query ||
                    f.displayName.toLowerCase().includes(query) ||
                    f.aliases.some(a => a.toLowerCase().includes(query))
            )
            .slice(0, 10);

        filtered.forEach((food, idx) => {
            const li = document.createElement('li');
            li.className = 'food-dropdown-item';
            if (idx === highlightedIndex) li.classList.add('is-selected');
            li.innerHTML = `<span>${food.displayName}</span><span class="item-calories">${food.general.Calories ?? 0} kcal/100g</span>`;
            li.addEventListener('mousedown', e => {
                e.preventDefault();
                slotFoodKey = food.key;
                if (selectedName) selectedName.textContent = food.displayName;
                dropdown?.classList.add('hidden');
                searchStep?.classList.add('hidden');
                qtyStep?.classList.remove('hidden');
                if (amountInput) {
                    amountInput.value = '';
                    amountInput.focus();
                }
            });
            dropdownList.appendChild(li);
        });
    }

    searchInput?.addEventListener('focus', () => {
        dropdown?.classList.remove('hidden');
        renderSlotFoods(searchInput.value);
    });
    searchInput?.addEventListener('input', () => {
        dropdown?.classList.remove('hidden');
        renderSlotFoods(searchInput.value);
    });
    searchInput?.addEventListener('blur', () => setTimeout(() => dropdown?.classList.add('hidden'), 150));

    function renderPresets(): void {
        if (!amountDropdownList) return;
        amountDropdownList.innerHTML = '';
        UNIT_CONVERSIONS[slotUnit].presets.forEach((val, idx) => {
            const li = document.createElement('li');
            li.className = 'amount-preset-item';
            if (idx === highlightedAmount) li.classList.add('is-selected');
            li.innerHTML = `<span>${val} ${slotUnit}</span>`;
            li.addEventListener('mousedown', e => {
                e.preventDefault();
                if (amountInput) amountInput.value = String(val);
                amountDropdown?.classList.add('hidden');
                amountInput?.focus();
            });
            amountDropdownList.appendChild(li);
        });
    }

    amountInput?.addEventListener('focus', () => {
        amountDropdown?.classList.remove('hidden');
        renderPresets();
    });
    amountInput?.addEventListener('blur', () => setTimeout(() => amountDropdown?.classList.add('hidden'), 150));

    unitBtn?.addEventListener('click', e => {
        e.stopPropagation();
        unitMenu?.classList.toggle('hidden');
    });

    unitMenu?.querySelectorAll('.unit-opt').forEach(opt => {
        opt.addEventListener('click', () => {
            const newUnit = opt.getAttribute('data-unit') as UnitKey | null;
            if (!newUnit) return;
            const val = parseFloat(amountInput?.value ?? '0');
            if (!isNaN(val) && val > 0 && amountInput) {
                const g = val * UNIT_CONVERSIONS[slotUnit].toGrams;
                amountInput.value = String(parseFloat((g / UNIT_CONVERSIONS[newUnit].toGrams).toFixed(2)));
            }
            slotUnit = newUnit;
            if (unitLabel) unitLabel.textContent = newUnit;
            unitMenu.querySelectorAll('.unit-opt').forEach(o => o.classList.toggle('active', o === opt));
            unitMenu.classList.add('hidden');
            renderPresets();
        });
    });

    function resetSlotSearch(): void {
        slotFoodKey = null;
        qtyStep?.classList.add('hidden');
        searchStep?.classList.remove('hidden');
        if (searchInput) searchInput.value = '';
    }

    cancelBtn?.addEventListener('click', resetSlotSearch);

    confirmBtn?.addEventListener('click', () => {
        if (!slotFoodKey) return;
        const food = FOOD_DATABASE[slotFoodKey];
        if (!food) return;

        const amt = parseFloat(amountInput?.value ?? '0');
        if (isNaN(amt) || amt <= 0) return;
        const grams = amt * UNIT_CONVERSIONS[slotUnit].toGrams;

        state.compareSlots[slotIndex].parsed = {
            id: Date.now() + Math.random(),
            amount: Math.round(grams),
            foodKey: slotFoodKey,
            displayName: food.displayName
        };
        updateSlotUI(slotIndex);
        renderNutritionPanel();
        resetSlotSearch();
    });

    clearBtn?.addEventListener('click', () => {
        state.compareSlots[slotIndex].parsed = null;
        updateSlotUI(slotIndex);
        renderNutritionPanel();
        resetSlotSearch();
    });
}

export function initComparisonMode(): void {
    setupComparisonSlot(0);
    setupComparisonSlot(1);

    document.querySelectorAll('.color-options').forEach(optionsContainer => {
        const slotIndex = parseInt(optionsContainer.getAttribute('data-slot') ?? '1', 10) - 1;
        optionsContainer.querySelectorAll<HTMLElement>('.color-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                optionsContainer.querySelectorAll('.color-dot').forEach(d => {
                    d.classList.remove('active');
                });
                dot.classList.add('active');
                state.compareSlots[slotIndex].color = dot.getAttribute('data-color') ?? '#0072b2';
                updateSlotUI(slotIndex);
                renderNutritionPanel();
            });
        });
    });

    updateSlotUI(0);
    updateSlotUI(1);
}
