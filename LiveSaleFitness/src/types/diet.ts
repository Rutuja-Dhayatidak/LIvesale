export type FoodPreference = 'veg' | 'nonveg' | 'eggetarian' | 'vegan';
export type DietGoal = 'build_muscle' | 'weight_loss' | 'fat_loss' | 'maintenance';

export interface UserDietPreferences {
  foodPreference: FoodPreference;
  dietGoal: DietGoal;
  allergies: string[];
  specialRemark: string;
}

export interface DietRecommendationResult {
  isRecommended: boolean;
  reason?: string;
  hasAllergyWarning: boolean;
  allergyMatch?: string;
}
