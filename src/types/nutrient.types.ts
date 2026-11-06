export type CategoryKey =
    | 'general'
    | 'organic_acids'
    | 'carbohydrates'
    | 'lipids'
    | 'proteins_and_aminos'
    | 'biogenic_amines'
    | 'nucleic_acids_and_purines'
    | 'vitamins'
    | 'minerals'
    | 'cellular_bioactives'
    | 'myconutrients_and_adaptogens'
    | 'bioactive_enzymes'
    | 'antinutrients'
    | 'antioxidants';

export interface NutrientMeta {
    unit?: string;
    defaultAbsorb?: number;
    indent?: number;
    isSubheader?: boolean;
    noTarget?: boolean;
    label?: string;
}

export type NutrientRecord = Record<string, number>;
export type CategoryNutrientMap = Record<string, NutrientMeta>;
export type NutrientUnitsConfig = Record<CategoryKey, CategoryNutrientMap>;
export type TargetsConfig = Record<CategoryKey, NutrientRecord>;
