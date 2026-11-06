// src/ui/nutritionPanel.ts
import type { CategoryKey } from '../types/nutrient.types.js';
import { NUTRIENT_UNITS } from '../config/units.js';
import { RDA_TARGETS, UL_TARGETS } from '../config/targets.js';
import { leftColumnLayout, rightColumnLayout, CATEGORY_NAMES, CATEGORY_ICONS } from '../config/layout.js';
import { state } from '../state/store.js';
import { calculateAggregate, getActiveContext, getCategoryProgress, type AggregatedNutrients } from '../services/calculations.js';
import { NUTRIENT_ANALYTICS } from '../config/analytics.js';
import { renderSummaryDashboard } from './summaryDashboard.js';

interface CompareAggregate {
    isCompare: true;
    slot1: AggregatedNutrients;
    slot2: AggregatedNutrients;
}

type ActivePanelData = AggregatedNutrients | CompareAggregate;

function isCompareData(data: ActivePanelData): data is CompareAggregate {
    return (data as CompareAggregate).isCompare === true;
}

function createRdaUlMeter(
    _category: CategoryKey,
    _nutrientName: string,
    currentValue: number,
    rdaTarget: number,
    ulTarget: number,
    unit: string
): string {
    const rda = rdaTarget || 0;
    const ul = ulTarget || rda * 1.5;
    const maxScale = ul * 1.35;

    const rdaPercent = (rda / maxScale) * 100;
    const ulPercent = (ul / maxScale) * 100;
    const markerPercent = Math.min(100, (currentValue / maxScale) * 100);

    const gradientFill = `linear-gradient(to right, #78909c 0%, #78909c ${rdaPercent}%, #2ecc71 ${rdaPercent}%, #2ecc71 ${ulPercent}%, #e67e22 ${ulPercent}%, #e67e22 100%)`;

    return `
        <div class="detailed-meter-container">
            <div class="meter-labels-top">
                ${ulTarget > 0 ? `<span class="ul-label" style="left: ${ulPercent}%">UL: ${ulTarget} ${unit}</span>` : ''}
            </div>
            <div class="meter-bar-wrapper">
                <div class="meter-marker" style="left: ${markerPercent}%">▼</div>
                <div class="meter-bar" style="background: ${gradientFill}">
                    <div class="meter-tick zero" style="left: 0%"></div>
                    ${rda > 0 ? `<div class="meter-tick rda" style="left: ${rdaPercent}%"></div>` : ''}
                    ${ulTarget > 0 ? `<div class="meter-tick ul" style="left: ${ulPercent}%"></div>` : ''}
                </div>
            </div>
            <div class="meter-labels-bottom">
                <span class="zero-label" style="left: 0%">0</span>
                ${rda > 0 ? `<span class="rda-label" style="left: ${rdaPercent}%">RDA: ${rda} ${unit}</span>` : ''}
            </div>
        </div>
    `;
}

function createCompareSlotMeter(
    label: string,
    currentValue: number,
    rdaTarget: number,
    ulTarget: number,
    unit: string,
    color: string
): string {
    const rda = rdaTarget || 0;
    const ul = ulTarget || rda * 1.5;
    const maxScale = ul * 1.35;

    const rdaPercent = (rda / maxScale) * 100;
    const ulPercent = (ul / maxScale) * 100;
    const markerPercent = Math.min(100, (currentValue / maxScale) * 100);

    const gradientFill = `linear-gradient(to right, #78909c 0%, #78909c ${rdaPercent}%, ${color} ${rdaPercent}%, ${color} ${ulPercent}%, #e67e22 ${ulPercent}%, #e67e22 100%)`;

    return `
        <div class="detailed-meter-container compare-slot-meter">
            <div class="meter-labels-top">
                <span class="compare-slot-label" style="left: 0; transform: none; font-weight: bold; color: ${color};">
                    ${label} (${currentValue % 1 === 0 ? currentValue : currentValue.toFixed(2)} ${unit})
                </span>
                ${ulTarget > 0 ? `<span class="ul-label" style="left: ${ulPercent}%">UL: ${ulTarget} ${unit}</span>` : ''}
            </div>
            <div class="meter-bar-wrapper">
                <div class="meter-marker" style="left: ${markerPercent}%">▼</div>
                <div class="meter-bar" style="background: ${gradientFill}">
                    <div class="meter-tick zero" style="left: 0%"></div>
                    ${rda > 0 ? `<div class="meter-tick rda" style="left: ${rdaPercent}%"></div>` : ''}
                    ${ulTarget > 0 ? `<div class="meter-tick ul" style="left: ${ulPercent}%"></div>` : ''}
                </div>
            </div>
            <div class="meter-labels-bottom">
                <span class="zero-label" style="left: 0%">0</span>
                ${rda > 0 ? `<span class="rda-label" style="left: ${rdaPercent}%">RDA: ${rda} ${unit}</span>` : ''}
            </div>
        </div>
    `;
}

function getNutrientAnalysisHTML(
    category: CategoryKey,
    nutrientName: string,
    currentValue: number,
    rdaTarget: number,
    ulTarget: number,
    unit: string
): string {
    const details = NUTRIENT_ANALYTICS[nutrientName] ?? {
        description: `${nutrientName} is a biochemically active compound vital for enzymatic regulation, cellular transport, and structural integrity.`,
        sourcesTitleLeft: 'Highest Sources',
        sourcesLeft: [
            { food: 'Primary Food Source A', amount: 'High' },
            { food: 'Primary Food Source B', amount: 'Moderate' }
        ]
    };

    const scaleHtml = createRdaUlMeter(category, nutrientName, currentValue, rdaTarget, ulTarget, unit);
    const leftTitle = details.sourcesTitleLeft ?? 'Highest Sources';
    const rightTitle = details.sourcesTitleRight ?? '';

    const sourcesHtml = details.sourcesRight
        ? `
            <div class="sources-container">
                <div class="sources-list">
                    <h5>${leftTitle}</h5>
                    ${details.sourcesLeft.map(s => `<div class="source-item"><span>${s.food}</span><span>${s.amount}</span></div>`).join('')}
                </div>
                <div class="sources-list">
                    <h5>${rightTitle}</h5>
                    ${details.sourcesRight.map(s => `<div class="source-item"><span>${s.food}</span><span>${s.amount}</span></div>`).join('')}
                </div>
            </div>
        `
        : `
            <div class="sources-container single-column">
                <div class="sources-list">
                    <h5>${leftTitle}</h5>
                    ${details.sourcesLeft.map(s => `<div class="source-item"><span>${s.food}</span><span>${s.amount}</span></div>`).join('')}
                </div>
            </div>
        `;

    return `
        <div class="nutrient-details-panel">
            <h4>${nutrientName} Analysis</h4>
            ${scaleHtml}
            <p class="detail-description">${details.description}</p>
            ${sourcesHtml}
        </div>
    `;
}

function getNutrientAnalysisCompareHTML(
    nutrientName: string,
    val1: number,
    val2: number,
    rdaTarget: number,
    ulTarget: number,
    unit: string,
    col1: string,
    col2: string,
    label1: string,
    label2: string
): string {
    const details = NUTRIENT_ANALYTICS[nutrientName] ?? {
        description: `${nutrientName} comparison across loaded dietary inputs.`,
        sourcesTitleLeft: 'Highest Sources',
        sourcesLeft: [{ food: 'Dietary Source', amount: 'Reference' }]
    };

    const meter1Html = createCompareSlotMeter(label1, val1, rdaTarget, ulTarget, unit, col1);
    const meter2Html = createCompareSlotMeter(label2, val2, rdaTarget, ulTarget, unit, col2);

    return `
        <div class="nutrient-details-panel">
            <h4>${nutrientName} Comparison</h4>
            <div class="compare-meters-wrapper">
                ${meter1Html}
                ${meter2Html}
            </div>
            <p class="detail-description">${details.description}</p>
        </div>
    `;
}

export function createCategoryCard(category: CategoryKey, activeData: ActivePanelData): HTMLElement | null {
    const nutrients = NUTRIENT_UNITS[category];
    if (!nutrients) return null;

    const catEl = document.createElement('div');
    const isCollapsed = state.collapsedCategories[category] ?? false;
    const isLimitCategory = category === 'antinutrients' || category === 'biogenic_amines';
    catEl.className = `nutrient-category ${isLimitCategory ? 'limit-category' : ''} ${isCollapsed ? 'collapsed' : ''}`;

    const displayTitle = CATEGORY_NAMES[category] ?? category.replace(/_/g, ' ');
    const iconSvg = CATEGORY_ICONS[category] ?? '';

    let progress1: number | null = null;
    let progress2: number | null = null;
    const col1 = state.compareSlots[0].color;
    const col2 = state.compareSlots[1].color;

    const progressLabel = isCompareData(activeData)
        ? (() => {
              progress1 = getCategoryProgress(category, activeData.slot1);
              progress2 = getCategoryProgress(category, activeData.slot2);
              const p1Str = progress1 !== null ? `${progress1}%` : '0%';
              const p2Str = progress2 !== null ? `${progress2}%` : '0%';
              return `<span style="color: ${col1}; font-size: 11px;">(${p1Str})</span> <span style="font-size: 10px; color: #aaa;">vs</span> <span style="color: ${col2}; font-size: 11px;">(${p2Str})</span>`;
          })()
        : (() => {
              const progress = getCategoryProgress(category, activeData);
              return progress !== null ? `(${progress}%)` : '';
          })();

    const headerEl = document.createElement('h3');
    headerEl.innerHTML = `
        <span class="cat-title-left">
            ${iconSvg}
            <span>${displayTitle}</span>
            ${progressLabel ? `<span class="cat-progress-badge">${progressLabel}</span>` : ''}
        </span>
        <span class="toggle-icon">▼</span>
    `;
    catEl.appendChild(headerEl);

    const progressContainer = document.createElement('div');
    if (isCompareData(activeData)) {
        progressContainer.className = 'category-progress-bar compare-category-bar';
        progressContainer.innerHTML = `
            <div class="category-progress-bar" style="margin: 0; height: 3px;">
                <div class="category-progress-fill" style="width: ${progress1 ?? 0}%; background-color: ${col1};"></div>
            </div>
            <div class="category-progress-bar" style="margin: 0; height: 3px;">
                <div class="category-progress-fill" style="width: ${progress2 ?? 0}%; background-color: ${col2};"></div>
            </div>
        `;
    } else {
        progressContainer.className = 'category-progress-bar';
        const progress = getCategoryProgress(category, activeData);
        progressContainer.innerHTML = `<div class="category-progress-fill" style="width: ${progress !== null ? progress : 100}%"></div>`;
    }
    catEl.appendChild(progressContainer);

    const contentWrapper = document.createElement('div');
    contentWrapper.className = `category-content ${isCollapsed ? 'hidden' : ''}`;

    if (!isCollapsed) {
        for (const [nutrientName, meta] of Object.entries(nutrients)) {
            if (meta.isSubheader) {
                const subheaderRow = document.createElement('div');
                subheaderRow.className = 'nutrient-row subheader';
                subheaderRow.innerHTML = `<span>${meta.label ?? ''}</span>`;
                contentWrapper.appendChild(subheaderRow);
                continue;
            }

            const unit = meta.unit ?? '';
            const rdaTarget = RDA_TARGETS[category]?.[nutrientName] ?? 0;
            const ulTarget = UL_TARGETS[category]?.[nutrientName] ?? 0;

            const row = document.createElement('div');
            const indentClass = meta.indent ? `indent-${meta.indent}` : '';
            row.className = `nutrient-row clickable-row ${indentClass}`;

            if (isCompareData(activeData)) {
                const rawVal1 = activeData.slot1[category]?.[nutrientName] ?? 0;
                const rawVal2 = activeData.slot2[category]?.[nutrientName] ?? 0;
                const rawAbs1 = activeData.slot1[category]?.[`${nutrientName}_absorbed`] ?? 0;
                const rawAbs2 = activeData.slot2[category]?.[`${nutrientName}_absorbed`] ?? 0;

                const displayAbs1 = rawAbs1 % 1 === 0 ? rawAbs1 : rawAbs1.toFixed(2);
                const displayAbs2 = rawAbs2 % 1 === 0 ? rawAbs2 : rawAbs2.toFixed(2);
                const displayVal1 = rawVal1 % 1 === 0 ? rawVal1 : rawVal1.toFixed(2);
                const displayVal2 = rawVal2 % 1 === 0 ? rawVal2 : rawVal2.toFixed(2);

                const percent1 = Math.min(100, rdaTarget > 0 ? (rawVal1 / rdaTarget) * 100 : 0);
                const percent2 = Math.min(100, rdaTarget > 0 ? (rawVal2 / rdaTarget) * 100 : 0);
                const absPct1 = Math.min(100, rdaTarget > 0 ? (rawAbs1 / rdaTarget) * 100 : 0);
                const absPct2 = Math.min(100, rdaTarget > 0 ? (rawAbs2 / rdaTarget) * 100 : 0);

                const unabsPct1 = Math.max(0, percent1 - absPct1);
                const unabsPct2 = Math.max(0, percent2 - absPct2);

                if (meta.noTarget) {
                    row.innerHTML = `
                        <div class="nutrient-info compare-info">
                            <span>${nutrientName}</span>
                            <span class="compare-vals">
                                <span style="color: ${col1}; font-weight: bold;">${displayAbs1} (${displayVal1}) ${unit}</span> 
                                <span class="vs-divider">vs</span> 
                                <span style="color: ${col2}; font-weight: bold;">${displayAbs2} (${displayVal2}) ${unit}</span>
                            </span>
                        </div>
                        <div class="rda-container compare-container no-target-layout">
                            <div class="rda-dots">••••••</div>
                            <span class="nt-badge">N/T</span>
                        </div>
                    `;
                } else {
                    row.innerHTML = `
                        <div class="nutrient-info compare-info">
                            <span>${nutrientName}</span>
                            <span class="compare-vals">
                                <span style="color: ${col1}; font-weight: bold;">${displayAbs1} (${displayVal1}) ${unit}</span> 
                                <span class="vs-divider">vs</span> 
                                <span style="color: ${col2}; font-weight: bold;">${displayAbs2} (${displayVal2}) ${unit}</span> 
                                <span class="target-val">/ ${rdaTarget} ${unit}</span>
                            </span>
                        </div>
                        <div class="rda-container compare-container">
                            <div class="compare-bars-wrapper">
                                <div class="rda-bar-wrapper" style="display: flex; width: 100%; height: 5px; background: #e9ecef; border-radius: 2px; overflow: hidden;">
                                    <div class="rda-bar compare-bar" style="width: ${absPct1}%; background-color: ${col1};"></div>
                                    <div class="rda-bar compare-bar unabsorbed" style="width: ${unabsPct1}%; background-color: ${col1};"></div>
                                </div>
                                <div class="rda-bar-wrapper" style="display: flex; width: 100%; height: 5px; background: #e9ecef; border-radius: 2px; overflow: hidden;">
                                    <div class="rda-bar compare-bar" style="width: ${absPct2}%; background-color: ${col2};"></div>
                                    <div class="rda-bar compare-bar unabsorbed" style="width: ${unabsPct2}%; background-color: ${col2};"></div>
                                </div>
                            </div>
                            <div class="compare-percentages">
                                <span class="compare-pct" style="color: ${col1};">${Math.round((rawAbs1 / (rdaTarget || 1)) * 100)}%</span>
                                <span class="compare-pct" style="color: ${col2};">${Math.round((rawAbs2 / (rdaTarget || 1)) * 100)}%</span>
                            </div>
                        </div>
                    `;
                }
            } else {
                const rawVal = activeData[category]?.[nutrientName] ?? 0;
                const rawAbs = activeData[category]?.[`${nutrientName}_absorbed`] ?? 0;

                const displayVal = rawVal % 1 === 0 ? rawVal : rawVal.toFixed(2);
                const displayAbs = rawAbs % 1 === 0 ? rawAbs : rawAbs.toFixed(2);

                const actualPercent = rdaTarget > 0 ? (rawVal / rdaTarget) * 100 : 0;
                const percent = Math.min(100, actualPercent);
                const actualAbsPercent = rdaTarget > 0 ? (rawAbs / rdaTarget) * 100 : 0;
                const absPercent = Math.min(100, actualAbsPercent);
                const unabsPercent = Math.max(0, percent - absPercent);

                let barClass = '';
                let textClass = '';

                if (isLimitCategory) {
                    const isOver = rdaTarget > 0 && rawVal > rdaTarget;
                    barClass = isOver ? 'limit-over' : 'limit-under';
                } else {
                    if (ulTarget > 0 && rawVal > ulTarget) {
                        barClass = 'over-limit';
                        textClass = 'over-limit-text';
                    } else if (rdaTarget > 0 && rawVal > rdaTarget) {
                        barClass = 'exceeded';
                    }
                }

                if (meta.noTarget) {
                    row.innerHTML = `
                        <div class="nutrient-info">
                            <span>${nutrientName}</span>
                            <span class="no-target-val">${displayAbs} net (${displayVal} gross) ${unit}</span>
                        </div>
                        <div class="rda-container no-target-layout">
                            <div class="rda-dots">••••••</div>
                            <span class="nt-badge">N/T</span>
                        </div>
                    `;
                } else {
                    row.innerHTML = `
                        <div class="nutrient-info">
                            <span>${nutrientName}</span>
                            <span>${displayAbs} net (${displayVal} gross) ${unit} / ${rdaTarget} ${unit}</span>
                        </div>
                        <div class="rda-container">
                            <div class="rda-bar-wrapper" style="display: flex; flex: 1; height: 100%; background-color: #e9ecef; border-radius: 3px; overflow: hidden;">
                                <div class="rda-bar ${barClass}" style="width: ${absPercent}%;"></div>
                                <div class="rda-bar unabsorbed" style="width: ${unabsPercent}%; background-color: var(--primary-color);"></div>
                            </div>
                            <span class="percentage-label ${textClass}">${Math.round(actualAbsPercent)}% (${Math.round(actualPercent)}%)</span>
                        </div>
                    `;
                }
            }

            const uniqueKey = `${category}_${nutrientName}`;
            row.addEventListener('click', e => {
                const target = e.target as HTMLElement;
                if (target.closest('.rda-container')) return;
                e.stopPropagation();
                state.expandedNutrient = state.expandedNutrient === uniqueKey ? null : uniqueKey;
                renderNutritionPanel();
            });

            contentWrapper.appendChild(row);

            if (state.expandedNutrient === uniqueKey) {
                const detailPanel = document.createElement('div');
                if (isCompareData(activeData)) {
                    const rawAbs1 = activeData.slot1[category]?.[`${nutrientName}_absorbed`] ?? 0;
                    const rawAbs2 = activeData.slot2[category]?.[`${nutrientName}_absorbed`] ?? 0;
                    const label1 = state.compareSlots[0].parsed?.displayName ?? 'Item A';
                    const label2 = state.compareSlots[1].parsed?.displayName ?? 'Item B';

                    detailPanel.innerHTML = getNutrientAnalysisCompareHTML(
                        nutrientName,
                        rawAbs1,
                        rawAbs2,
                        rdaTarget,
                        ulTarget,
                        unit,
                        col1,
                        col2,
                        label1,
                        label2
                    );
                } else {
                    const rawAbs = activeData[category]?.[`${nutrientName}_absorbed`] ?? 0;
                    detailPanel.innerHTML = getNutrientAnalysisHTML(
                        category,
                        nutrientName,
                        rawAbs,
                        rdaTarget,
                        ulTarget,
                        unit
                    );
                }
                if (detailPanel.firstElementChild) {
                    contentWrapper.appendChild(detailPanel.firstElementChild);
                }
            }
        }
    }

    catEl.appendChild(contentWrapper);

    catEl.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        if (target.closest('.category-content')) return;
        state.collapsedCategories[category] = !isCollapsed;

        const allCategories = [...leftColumnLayout, ...rightColumnLayout];
        state.allCollapsed = allCategories.every(cat => state.collapsedCategories[cat] === true);
        renderNutritionPanel();
    });

    return catEl;
}

export function renderNutritionPanel(): void {
    const leftColumnEl = document.getElementById('column-left');
    const rightColumnEl = document.getElementById('column-right');
    const indicatorEl = document.getElementById('nutrition-view-indicator');
    const toggleAllBtn = document.getElementById('toggle-all-btn');

    if (!leftColumnEl || !rightColumnEl) return;

    leftColumnEl.innerHTML = '';
    rightColumnEl.innerHTML = '';

    let activeData: ActivePanelData;

    if (state.mode === 'compare') {
        if (indicatorEl) indicatorEl.textContent = 'Showing: Comparison Mode';
        activeData = {
            isCompare: true,
            slot1: calculateAggregate(state.compareSlots[0].parsed ? [state.compareSlots[0].parsed] : []),
            slot2: calculateAggregate(state.compareSlots[1].parsed ? [state.compareSlots[1].parsed] : [])
        };
    } else {
        const context = getActiveContext();
        if (indicatorEl) indicatorEl.textContent = context.label;
        activeData = calculateAggregate(context.items);
    }

    if (!isCompareData(activeData)) {
        renderSummaryDashboard(activeData);
    }

    if (toggleAllBtn) {
        toggleAllBtn.textContent = state.allCollapsed ? 'Expand All' : 'Collapse All';
    }

    leftColumnLayout.forEach(category => {
        const card = createCategoryCard(category, activeData);
        if (card) leftColumnEl.appendChild(card);
    });

    rightColumnLayout.forEach(category => {
        const card = createCategoryCard(category, activeData);
        if (card) rightColumnEl.appendChild(card);
    });
}