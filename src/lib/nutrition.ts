/**
 * Source-backed nutrition discovery metadata used by the V2 demonstration.
 *
 * This module does not provide medical advice or infer a user's condition. It
 * maps standardized produce names to broad nutrition experiences using a
 * curated, versioned demo taxonomy. Production changes require partner review.
 */

export type NutritionObjective =
  | "heart"
  | "blood_sugar"
  | "maternal"
  | "produce_forward"
  | "cancer_prevention";

export const nutritionObjectives: Array<{
  id: NutritionObjective;
  label: string;
  cardLabel: string;
}> = [
  { id: "heart", label: "Heart-smart nutrition", cardLabel: "Supports heart-smart nutrition" },
  { id: "blood_sugar", label: "Blood-sugar-aware nutrition", cardLabel: "Supports blood-sugar-aware nutrition" },
  { id: "maternal", label: "Maternal and family nutrition", cardLabel: "Supports maternal and family nutrition" },
  { id: "produce_forward", label: "Produce-forward nutrition", cardLabel: "Supports produce-forward nutrition" },
  { id: "cancer_prevention", label: "Plant-forward cancer-prevention nutrition", cardLabel: "Supports plant-forward cancer-prevention nutrition" },
];

type ProduceNutrition = {
  aliases: string[];
  attributes: string[];
  objectives: NutritionObjective[];
};

// Initial demo records use broad attributes supported by USDA FoodData Central
// and dietary-pattern guidance from ADA, AHA, ACS, and March of Dimes. They are
// deliberately conservative and should be reviewed by community partners for V3.
const produceNutrition: ProduceNutrition[] = [
  { aliases: ["collard greens", "collards"], attributes: ["Fiber", "Folate", "Vitamin C", "Vitamin A", "Calcium", "Potassium"], objectives: ["heart", "blood_sugar", "maternal", "produce_forward", "cancer_prevention"] },
  { aliases: ["kale"], attributes: ["Fiber", "Folate", "Vitamin C", "Vitamin A", "Potassium", "Dark-green vegetable"], objectives: ["heart", "blood_sugar", "maternal", "produce_forward", "cancer_prevention"] },
  { aliases: ["spinach"], attributes: ["Folate", "Fiber", "Vitamin A", "Vitamin C", "Potassium", "Dark-green vegetable"], objectives: ["heart", "blood_sugar", "maternal", "produce_forward", "cancer_prevention"] },
  { aliases: ["broccoli", "brussels sprouts", "cabbage", "cauliflower"], attributes: ["Fiber", "Vitamin C", "Folate", "Cruciferous vegetable", "Plant variety"], objectives: ["heart", "blood_sugar", "maternal", "produce_forward", "cancer_prevention"] },
  { aliases: ["tomatoes", "tomato", "cherry tomatoes"], attributes: ["Vitamin C", "Potassium", "Red vegetable", "Plant variety"], objectives: ["heart", "maternal", "produce_forward", "cancer_prevention"] },
  { aliases: ["sweet potatoes", "sweet potato", "carrots", "pumpkins", "winter squash"], attributes: ["Fiber", "Vitamin A", "Potassium", "Orange vegetable", "Plant variety"], objectives: ["heart", "maternal", "produce_forward", "cancer_prevention"] },
  { aliases: ["green beans", "snap peas", "peas"], attributes: ["Fiber", "Folate", "Vitamin C", "Non-starchy vegetable"], objectives: ["heart", "blood_sugar", "maternal", "produce_forward", "cancer_prevention"] },
  { aliases: ["sweet peppers", "peppers", "jalapeños"], attributes: ["Vitamin C", "Vitamin A", "Plant variety", "Non-starchy vegetable"], objectives: ["heart", "blood_sugar", "maternal", "produce_forward", "cancer_prevention"] },
  { aliases: ["blueberries", "blackberries", "raspberries", "strawberries", "cherries"], attributes: ["Fiber", "Vitamin C", "Whole fruit", "Color variety"], objectives: ["heart", "blood_sugar", "maternal", "produce_forward", "cancer_prevention"] },
  { aliases: ["apples", "pears", "peaches", "plums"], attributes: ["Fiber", "Whole fruit", "Plant variety"], objectives: ["heart", "blood_sugar", "maternal", "produce_forward", "cancer_prevention"] },
  { aliases: ["okra"], attributes: ["Fiber", "Folate", "Vitamin C", "Non-starchy vegetable"], objectives: ["heart", "blood_sugar", "maternal", "produce_forward", "cancer_prevention"] },
  { aliases: ["summer squash", "zucchini", "cucumbers", "celery", "lettuce", "salad mix"], attributes: ["Non-starchy vegetable", "Produce variety", "Low-prep option"], objectives: ["heart", "blood_sugar", "produce_forward", "cancer_prevention"] },
  { aliases: ["beets", "chard", "mustard greens"], attributes: ["Folate", "Fiber", "Potassium", "Color variety"], objectives: ["heart", "maternal", "produce_forward", "cancer_prevention"] },
  { aliases: ["corn", "potatoes"], attributes: ["Fiber", "Potassium", "Starchy vegetable"], objectives: ["heart", "maternal", "produce_forward"] },
  { aliases: ["basil", "herbs", "cilantro", "dill", "mint", "oregano", "parsley", "rosemary", "sage", "thyme"], attributes: ["Flavor without added sodium", "Plant variety"], objectives: ["heart", "produce_forward", "cancer_prevention"] },
];

const normalize = (name: string) => name.trim().toLowerCase();

export function nutritionForProduce(name: string) {
  const normalized = normalize(name);
  return produceNutrition.find((entry) => entry.aliases.includes(normalized));
}

export function matchesNutritionObjective(name: string, objective: NutritionObjective | "all") {
  return objective === "all" || Boolean(nutritionForProduce(name)?.objectives.includes(objective));
}

export function objectiveLabel(objective: NutritionObjective) {
  return nutritionObjectives.find((item) => item.id === objective)?.cardLabel ?? "Nutrition match";
}

export const nutritionSources = [
  ["USDA FoodData Central", "https://fdc.nal.usda.gov/"],
  ["American Diabetes Association", "https://diabetes.org/food-nutrition"],
  ["American Heart Association", "https://www.heart.org/en/healthy-living/healthy-eating"],
  ["American Cancer Society", "https://www.cancer.org/cancer/risk-prevention/diet-physical-activity/acs-guidelines-nutrition-physical-activity-cancer-prevention.html"],
  ["March of Dimes", "https://www.marchofdimes.org/find-support/topics/pregnancy/eating-healthy-during-pregnancy"],
] as const;
