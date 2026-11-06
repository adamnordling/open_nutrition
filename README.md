# Open Nutrition

> The nutrition tracker that shows you more. 100% free, open source, zero ads, no account required.

[![Lighthouse Performance](https://img.shields.io/badge/Lighthouse-100%2F100-10b981?style=flat-square&logo=lighthouse)](https://opennutrition.adamnordling.se/)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict%205.8-3178c6?style=flat-square&logo=typescript)](tsconfig.json)
[![Vite](https://img.shields.io/badge/Bundler-Vite%208-646cff?style=flat-square&logo=vite)](vite.config.ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-0f172a?style=flat-square)](LICENSE)
[![Zero Telemetry](https://img.shields.io/badge/Privacy-100%25%20Local--First-10b981?style=flat-square)](#privacy--telemetry)

**Open Nutrition** is a client-side precision nutrition and bioavailability tracker. Beyond standard macro and calorie tracking, it models **gross ingestion vs. net biological absorption**, analyzes critical biochemical ratios (such as Glycine-to-Methionine), and decomposes composite grocery store products into their base vegetable and nutrient parts.

---

## Key Features

- **Biochemical Bioavailability Modeling:** Computes both total gross consumption and estimated net uptake based on antinutrient binding matrices and digestive absorption rates.
- **Micro & Bioactive Spectrum:** Tracks 50+ compounds including fatty acid sub-chains (omega-3/6, short/medium-chain fats), individual amino acids, organic acids, polyphenols, enzymes, and cellular bioactives (CoQ10, PQQ, Spermidine).
- **Composite Grocery Import (ICA & Willys):** Paste store URLs or ingredient labels (e.g. frozen wok mixes). The engine extracts verified package macros and decomposes percentage-labeled ingredients into gram amounts.
- **Nutritional Synthesis:** Automatically pairs composite grocery items with rich micronutrient database profiles to fill in vitamins and minerals missing from standard commercial labels.
- **7-Day Meal Planner:** Organize your week Monday through Sunday, create and delete custom meal slots, duplicate previous days with one click, and export/load named week plans.
- **Side-by-Side Comparison Mode:** Compare two distinct foods or custom gram portions with calibrated dual-target meters and colored accents.
- **Water & Glycine Balance Trackers:** Integrated 8-cup water intake dial and real-time Methionine-to-Glycine methylation balance indicators.

---

## How to Use

1. **Log Foods:**
   - Use the **Food Tracker** search box to find base ingredients (e.g., *Chicken Breast*, *Russet Potato*).
   - Enter your quantity and pick your unit (`g`, `kg`, `mg`, `oz`, `lbs`).
   - Click **Add** to log it to your active meal or Quick Log.
2. **Import Store Products:**
   - Click **🔗 Import URL** in the search field.
   - Paste a grocery link or raw text from an ICA / Willys product page.
   - Review the extracted ingredients and package macros, select your portion weight (e.g., `500g`), and click **Add to Log**.
3. **Compare Foods:**
   - Switch to **Comparison Mode** in the upper tab bar.
   - Assign foods and target weights to **Item A** and **Item B** to inspect differences across all nutrient tiers simultaneously.
4. **Manage Plans:**
   - Switch between **Mon–Sun** using the day bar.
   - Click **Save Week** to store your current plan under a custom name, or **Load Week** to retrieve previously saved protocols.

---

## Tech Stack & Architecture

- **Runtime:** Pure client-side browser execution (Vanilla DOM + TypeScript).
- **Build System:** [Vite](https://vitejs.dev/) with inlined critical styles and HTML minification.
- **CSS Architecture:** Modern CSS `@layer` prioritization (`reset`, `tokens`, `layout`, `components`, `utilities`).
- **Security:** Strict Content Security Policy (`connect-src 'self'`), isolated permissions policies, and zero external trackers.
- **Storage:** Browser `localStorage` persistence with no accounts, cookies, or remote data retention.

---

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Typecheck TypeScript (Strict Mode)
npm run typecheck

# Lint TypeScript
npm run lint

# Build production bundle
npm run build

# Preview production build locally
npm run preview



ideas:
''

TODO:
All database foods 3000 core foods > if not food found, just copy paste what u have/ qr scan
All differnet vitamin description + RDA + top 10 foods.



Language switch
darkmode



"?" window on every thing like glucose, sucrose (or a clickable thing so ai po
ps up under for recommendations and unclickable)✔️✔️

instead of navbar > choose weight, active status etc

mixing food warning, antinutrients

vegan warning

carnivore warning

localstorage

guidelines > start website > tutorial

remove emojis?

fix add food

warning stickers on sticker note

### 1. nutrient interactions

Add badges for nutrient conflicts and synergies, like calcium/iron competition, oxalates, vitamin C + iron, and fat-soluble vitamins + fat.

### 2. methionine/glycine balance

Add a glycine-to-methionine ratio gauge based on the user's foods, with suggestions when the ratio gets too low.

### 3. omega-6/omega-3 balance

Add a live omega-6 to omega-3 ratio dial that warns when the ratio gets too high.

### 4. meal grouping

Let users split foods into separate meals instead of only tracking daily totals. Use this for meal-specific nutrient interactions and timing rules.

### 5. auto-fill nutrient gaps

Add an optimize button that finds foods and quantities needed to fill nutrient gaps while avoiding excessive nutrients and unwanted compounds.



some food eat up nutrients, vitamin C protocol carnivore?
some nutrients are more important than other , like magnesium > coq10 or spermidine, WHY?


npm run validate