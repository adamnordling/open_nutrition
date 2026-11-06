import { extractProductFromText } from '../services/groceryParser.js';
import { FOOD_DATABASE } from '../data/index.js';
import { getCurrentDayData, persistActiveWeek } from '../state/store.js';
import { renderDietList } from './foodTracker.js';
import { renderNutritionPanel } from './nutritionPanel.js';
import type { ExtractedProduct } from '../types/grocery.types.js';

let parsedProduct: ExtractedProduct | null = null;

export function initImportModal(showToast: (msg: string) => void): void {
    const modal = document.getElementById('url-import-modal');
    const openBtn = document.getElementById('open-url-import-btn');
    const tabUrl = document.getElementById('tab-import-url');
    const tabText = document.getElementById('tab-import-text');
    const secUrl = document.getElementById('import-url-section');
    const secText = document.getElementById('import-text-section');
    const textInput = document.getElementById('import-text-input') as HTMLTextAreaElement | null;
    const urlInput = document.getElementById('import-url-input') as HTMLInputElement | null;
    const parseTextBtn = document.getElementById('parse-text-btn');
    const fetchUrlBtn = document.getElementById('fetch-url-btn');
    const botWarning = document.getElementById('bot-blocked-warning');
    const previewBox = document.getElementById('import-preview-box');
    const previewTitle = document.getElementById('import-preview-title');
    const previewBadge = document.getElementById('import-matched-badge');
    const previewIngWrapper = document.getElementById('preview-ingredients-wrapper');
    const previewIngGrid = document.getElementById('import-preview-ingredients');
    const previewMacros = document.getElementById('import-preview-macros');
    const amountInput = document.getElementById('import-amount-input') as HTMLInputElement | null;
    const confirmBtn = document.getElementById('confirm-import-btn') as HTMLButtonElement | null;
    const backdrop = document.getElementById('app-modal-backdrop');

    // Tab switcher
    tabUrl?.addEventListener('click', () => {
        tabUrl.classList.add('active');
        tabText?.classList.remove('active');
        secUrl?.classList.remove('hidden');
        secText?.classList.add('hidden');
    });

    tabText?.addEventListener('click', () => {
        tabText.classList.add('active');
        tabUrl?.classList.remove('active');
        secText?.classList.remove('hidden');
        secUrl?.classList.add('hidden');
    });

    openBtn?.addEventListener('click', () => {
        backdrop?.classList.remove('hidden');
        modal?.classList.remove('hidden');
        botWarning?.classList.add('hidden');
        previewBox?.classList.add('hidden');
        if (confirmBtn) confirmBtn.disabled = true;
        if (textInput) textInput.value = '';
        if (urlInput) urlInput.value = '';
    });

    const updateScaledPreview = (): void => {
        if (!parsedProduct) return;
        const targetGrams = parseFloat(amountInput?.value ?? '100') || 0;
        const factor = targetGrams / 100;
        const m = parsedProduct.nutritionPer100g;

        const cals = Math.round(m.Calories * factor);
        const prot = (m.Protein * factor).toFixed(1);
        const carbs = (m.Carbs * factor).toFixed(1);
        const fat = (m.Fat * factor).toFixed(1);
        const fiber = (m.Fiber * factor).toFixed(1);

        if (previewMacros) {
            previewMacros.innerHTML = `
                <div style="font-weight: 700; margin-bottom: 2px;">Total for ${targetGrams}g:</div>
                <div>
                    <strong>${cals}</strong> kcal • 
                    Protein: <strong>${prot}g</strong> • 
                    Carbs: <strong>${carbs}g</strong> • 
                    Fat: <strong>${fat}g</strong> • 
                    Fiber: <strong>${fiber}g</strong>
                </div>
            `;
        }

        if (parsedProduct.ingredients.length > 0) {
            previewIngWrapper?.classList.remove('hidden');
            if (previewIngGrid) {
                previewIngGrid.innerHTML = '';
                parsedProduct.ingredients.forEach(ing => {
                    const pill = document.createElement('span');
                    pill.className = 'ingredient-pill';
                    const grams = ing.percent ? Math.round((ing.percent / 100) * targetGrams) : null;
                    pill.textContent = `${ing.name}${ing.percent ? ` (${ing.percent}% → ${grams}g)` : ''}`;
                    previewIngGrid.appendChild(pill);
                });
            }
        } else {
            previewIngWrapper?.classList.add('hidden');
        }
    };

    const displayProduct = (prod: ExtractedProduct): void => {
        parsedProduct = prod;
        if (previewTitle) previewTitle.textContent = prod.foodDef.displayName;

        if (previewBadge) {
            if (prod.matchedBaseFoodName) {
                previewBadge.textContent = `⚡ Synced with ${prod.matchedBaseFoodName} micros`;
                previewBadge.classList.remove('hidden');
            } else {
                previewBadge.classList.add('hidden');
            }
        }

        updateScaledPreview();
        previewBox?.classList.remove('hidden');
        if (confirmBtn) confirmBtn.disabled = false;
    };

    amountInput?.addEventListener('input', updateScaledPreview);

    parseTextBtn?.addEventListener('click', () => {
        const text = textInput?.value.trim();
        if (!text) return alert('Please paste some text first.');
        displayProduct(extractProductFromText(text, 'Pasted Product'));
    });

    fetchUrlBtn?.addEventListener('click', async () => {
        const url = urlInput?.value.trim();
        if (!url) return alert('Please enter a product URL.');

        fetchUrlBtn.textContent = 'Fetching...';
        (fetchUrlBtn as HTMLButtonElement).disabled = true;
        botWarning?.classList.add('hidden');

        try {
            const proxy = `/api/proxy-scrape?url=${encodeURIComponent(url)}`;
            const res = await fetch(proxy);
            if (!res.ok) throw new Error(String(res.status));
            const html = await res.text();
            displayProduct(extractProductFromText(html, url));
        } catch {
            botWarning?.classList.remove('hidden');
        } finally {
            fetchUrlBtn.textContent = 'Fetch';
            (fetchUrlBtn as HTMLButtonElement).disabled = false;
        }
    });

    confirmBtn?.addEventListener('click', () => {
        if (!parsedProduct) return;
        const amountGrams = parseFloat(amountInput?.value ?? '100') || 100;
        const food = parsedProduct.foodDef;

        FOOD_DATABASE[food.id] = food;

        const day = getCurrentDayData();
        day.unassigned.push({
            id: Date.now() + Math.random(),
            foodKey: food.id,
            amount: amountGrams,
            displayName: food.displayName
        });

        persistActiveWeek();
        renderDietList();
        renderNutritionPanel();

        backdrop?.classList.add('hidden');
        modal?.classList.add('hidden');
        showToast(`Added ${food.displayName} (${amountGrams}g)`);
    });
}