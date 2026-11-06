import type { AggregatedNutrients } from '../services/calculations.js';
import { RDA_TARGETS } from '../config/targets.js';
import { NUTRIENT_UNITS } from '../config/units.js';
import { renderNutritionPanel } from './nutritionPanel.js';

let waterGlassesCount = 0;

export function renderSummaryDashboard(activeData: AggregatedNutrients): void {
    const consumedCalories = Math.round(activeData.general?.Calories ?? 0);
    const targetCalories = RDA_TARGETS.general.Calories ?? 2000;
    const remainingCalories = Math.max(0, targetCalories - consumedCalories);

    const consumedProtein = activeData.proteins_and_aminos?.['Total Protein'] ?? 0;
    const targetProtein = RDA_TARGETS.proteins_and_aminos['Total Protein'] ?? 56;

    const consumedCarbs = activeData.carbohydrates?.['Total Carbohydrates'] ?? 0;
    const targetCarbs = RDA_TARGETS.carbohydrates['Total Carbohydrates'] ?? 275;

    const consumedFat = activeData.lipids?.['Total Fat'] ?? 0;
    const targetFat = RDA_TARGETS.lipids['Total Fat'] ?? 78;

    // Rings & RDA fulfill percentage
    let totalRdasTargeted = 0;
    let sumPercentage = 0;
    const targetCategories = ['vitamins', 'minerals', 'proteins_and_aminos', 'lipids'] as const;

    targetCategories.forEach(cat => {
        const compounds = NUTRIENT_UNITS[cat] ?? {};
        for (const [name, meta] of Object.entries(compounds)) {
            if (meta.isSubheader || meta.noTarget) continue;
            const rda = RDA_TARGETS[cat]?.[name] ?? 0;
            if (rda > 0) {
                const consumed = activeData[cat]?.[name] ?? 0;
                sumPercentage += Math.min(100, (consumed / rda) * 100);
                totalRdasTargeted++;
            }
        }
    });

    const targetScorePct = totalRdasTargeted > 0 ? Math.round(sumPercentage / totalRdasTargeted) : 0;
    const energyPct = Math.min(100, Math.round((consumedCalories / targetCalories) * 100));
    const remainingPct = Math.min(100, Math.round((remainingCalories / targetCalories) * 100));

    document.getElementById('ring-energy-fill')?.setAttribute('stroke-dasharray', `${energyPct}, 100`);
    document.getElementById('ring-target-fill')?.setAttribute('stroke-dasharray', `${targetScorePct}, 100`);
    document.getElementById('ring-remaining-fill')?.setAttribute('stroke-dasharray', `${remainingPct}, 100`);

    const elCals = document.getElementById('ring-energy-val');
    const elScore = document.getElementById('ring-target-pct');
    const elRem = document.getElementById('ring-remaining-val');

    if (elCals) elCals.textContent = String(consumedCalories);
    if (elScore) elScore.textContent = `${targetScorePct}%`;
    if (elRem) elRem.textContent = String(remainingCalories);

    // Water Tracker
    const foodWater = activeData.general?.Water ?? 0;
    const totalWaterMl = foodWater + waterGlassesCount * 250;
    const waterVol = document.getElementById('water-vol-text');
    const waterBar = document.getElementById('water-progress-bar');

    if (waterVol) waterVol.textContent = `${(totalWaterMl / 1000).toFixed(2)} L / ${(totalWaterMl * 0.033814).toFixed(1)} fl oz`;
    if (waterBar) waterBar.style.width = `${Math.min(100, Math.round((totalWaterMl / 2500) * 100))}%`;

    // Macro Bar Updater
    const updateBar = (id: string, val: number, target: number, unit: string): void => {
        const text = document.getElementById(`macro-${id}-text`);
        const bar = document.getElementById(`macro-${id}-bar`);
        const pct = document.getElementById(`macro-${id}-pct`);
        const p = Math.round((val / target) * 100);

        if (text) text.textContent = `${val.toFixed(1)} / ${target.toFixed(1)} ${unit}`;
        if (bar) bar.style.width = `${Math.min(100, p)}%`;
        if (pct) pct.textContent = `${p}%`;
    };

    updateBar('energy', consumedCalories, targetCalories, 'kcal');
    updateBar('protein', consumedProtein, targetProtein, 'g');
    updateBar('carbs', consumedCarbs, targetCarbs, 'g');
    updateBar('fat', consumedFat, targetFat, 'g');

    // Glycine : Methionine ratio
    const glycine = activeData.proteins_and_aminos?.['Glycine'] ?? 0;
    const methionine = activeData.proteins_and_aminos?.['Methionine'] ?? 0;
    const ratio = methionine > 0 ? (glycine / methionine).toFixed(2) : '0.00';
    const ratioEl = document.getElementById('glycine-ratio-val');
    const glycineBar = document.getElementById('glycine-bar');

    if (ratioEl) ratioEl.textContent = `${ratio} : 1.0 (Target ≥ 1.0)`;
    if (glycineBar) {
        const fill = Math.min(100, Math.round((parseFloat(ratio) / 1.5) * 100));
        glycineBar.style.width = `${fill}%`;
    }
}

export function initWaterTracker(): void {
    document.getElementById('water-plus-btn')?.addEventListener('click', () => {
        if (waterGlassesCount < 8) {
            waterGlassesCount++;
            syncWaterUI();
        }
    });

    document.getElementById('water-minus-btn')?.addEventListener('click', () => {
        if (waterGlassesCount > 0) {
            waterGlassesCount--;
            syncWaterUI();
        }
    });

    document.querySelectorAll('.glass-btn').forEach(glass => {
        glass.addEventListener('click', () => {
            const idx = parseInt(glass.getAttribute('data-idx') ?? '0', 10);
            waterGlassesCount = idx + 1 === waterGlassesCount ? idx : idx + 1;
            syncWaterUI();
        });
    });
}

function syncWaterUI(): void {
    document.querySelectorAll('.glass-btn').forEach((g, idx) => {
        g.classList.toggle('active', idx < waterGlassesCount);
    });
    renderNutritionPanel();
}