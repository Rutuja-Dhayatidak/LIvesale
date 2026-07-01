import { UserDietPreferences, DietRecommendationResult } from '../types/diet';

export const isFoodPreferenceCompatible = (userPref: string, itemType: string): boolean => {
  if (!userPref || !itemType) return true;
  const user = userPref.toLowerCase().replace(/[^a-z]/g, ''); // 'veg', 'nonveg', 'eggetarian', 'vegan'
  const item = itemType.toLowerCase().replace(/[^a-z]/g, ''); // 'veg', 'nonveg', 'both', 'na', 'egg', 'vegan'

  if (item === 'na' || item === 'both') return true;

  if (user === 'vegan') {
    return item === 'vegan';
  }
  if (user === 'veg' || user === 'vegetarian') {
    return item === 'veg' || item === 'vegan' || item === 'vegetarian';
  }
  if (user === 'eggetarian') {
    return item === 'veg' || item === 'vegan' || item === 'vegetarian' || item === 'egg' || item === 'eggetarian';
  }
  if (user === 'nonveg' || user === 'nonvegetarian') {
    return item === 'nonveg' || item === 'nonvegetarian';
  }
  return true;
};

export const checkAllergyMatch = (userAllergies: string[], item: any): { match: boolean; allergen?: string } => {
  if (!userAllergies || userAllergies.length === 0) return { match: false };

  // Normalize product properties
  const tags = Array.isArray(item.allergyTags) 
    ? [...item.allergyTags] 
    : (typeof item.allergyTags === 'string' ? [item.allergyTags] : []);

  if (item.ingredientsAllergyInfo) {
    if (Array.isArray(item.ingredientsAllergyInfo.contains)) {
      tags.push(...item.ingredientsAllergyInfo.contains);
    }
    if (item.ingredientsAllergyInfo.allergyWarning) {
      tags.push(item.ingredientsAllergyInfo.allergyWarning);
    }
  }

  const ingredientsStr = typeof item.ingredients === 'string' 
    ? item.ingredients.toLowerCase() 
    : (Array.isArray(item.ingredients) 
        ? item.ingredients.join(' ').toLowerCase() 
        : (item.ingredientsAllergyInfo?.ingredients 
            ? String(item.ingredientsAllergyInfo.ingredients).toLowerCase() 
            : ''));

  const itemName = typeof item.name === 'string' ? item.name.toLowerCase() : '';
  const itemDesc = typeof item.description === 'string' ? item.description.toLowerCase() : '';

  for (const allergy of userAllergies) {
    const cleanAllergy = allergy.trim().toLowerCase();
    if (!cleanAllergy) continue;

    // Check in allergy tags
    if (tags.some(tag => tag.toLowerCase().includes(cleanAllergy))) {
      return { match: true, allergen: allergy };
    }

    // Check in ingredients list
    if (ingredientsStr.includes(cleanAllergy)) {
      return { match: true, allergen: allergy };
    }

    // Check in item name or description for caution
    if (itemName.includes(cleanAllergy) || itemDesc.includes(cleanAllergy)) {
      return { match: true, allergen: allergy };
    }
  }

  return { match: false };
};

export const getRecommendation = (
  userPrefs: UserDietPreferences,
  item: any
): DietRecommendationResult => {
  const result: DietRecommendationResult = {
    isRecommended: false,
    hasAllergyWarning: false,
  };

  if (!userPrefs) return result;

  // 1. Check Allergy
  const allergyCheck = checkAllergyMatch(userPrefs.allergies, item);
  if (allergyCheck.match) {
    result.hasAllergyWarning = true;
    result.allergyMatch = allergyCheck.allergen;
  }

  // 2. Extract macros
  const calories = Number(item.calories || item.nutritionInfo?.calories || 0);
  const protein = Number(item.protein || item.nutritionInfo?.protein || 0);

  // 3. Goal based logic
  const goal = userPrefs.dietGoal;
  if (goal === 'build_muscle') {
    if (protein >= 20) {
      result.isRecommended = true;
      result.reason = 'High protein content supports muscle building.';
    }
  } else if (goal === 'weight_loss') {
    if (calories > 0 && calories <= 300) {
      result.isRecommended = true;
      result.reason = 'Low calorie count supports weight loss.';
    }
  } else if (goal === 'fat_loss') {
    if (calories > 0 && calories <= 350 && protein >= 15) {
      result.isRecommended = true;
      result.reason = 'High protein and low calorie ratio supports fat loss.';
    }
  } else if (goal === 'maintenance') {
    if (calories >= 250 && calories <= 500 && protein >= 10) {
      result.isRecommended = true;
      result.reason = 'Balanced calorie and protein profile supports maintenance.';
    }
  }

  return result;
};
