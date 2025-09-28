
export interface Recipe {
  recipeName: string;
  description: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: string[];
  instructions: string[];
}

// Enhanced Ingredient interface with pantry tracking
export interface NotionIngredient {
  id: string;
  name: string;
  recipeIds: string[];
  inPantry?: boolean;
  needToBuy?: boolean;
  lastUpdated?: string;
}

// Grocery List interfaces
export interface GroceryList {
  id: string;
  name: string;
  status: 'Active' | 'Completed' | 'Archived';
  createdDate: string;
  notes?: string;
  items: GroceryListItem[];
}

export interface GroceryListItem {
  id: string;
  ingredient: NotionIngredient;
  isPurchased: boolean;
  quantity?: string;
  notes?: string;
}

export interface CreateGroceryListData {
  name: string;
  notes?: string;
  ingredientIds: string[];
}

export interface UpdateGroceryListData {
  name?: string;
  status?: 'Active' | 'Completed' | 'Archived';
  notes?: string;
}

// Pantry management interfaces
export interface PantryUpdateData {
  ingredientId: string;
  inPantry: boolean;
  needToBuy: boolean;
}

export interface BulkPantryUpdateData {
  updates: PantryUpdateData[];
}

// Recipe-Ingredient Junction Table interfaces
export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientId: string;
  quantity: string;
  notes?: string;
}

export interface NotionRecipeIngredient {
  id: string;
  recipe: { id: string };
  ingredient: { id: string };
  quantity: string;
  notes?: string;
}

export interface CreateRecipeIngredientData {
  recipeId: string;
  ingredientId: string;
  quantity: string;
  notes?: string;
}

export interface UpdateRecipeIngredientData {
  quantity?: string;
  notes?: string;
}

// Enhanced Recipe interface with structured ingredients
export interface NotionRecipe {
  id: string;
  recipeName: string;
  instructions: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  recipeIngredients: RecipeIngredient[];
}

// AI Parsing interfaces for structured ingredient extraction
export interface ParsedRecipeIngredient {
  cleanName: string;
  quantity: string;
  notes?: string;
}

export interface ParsedRecipeData {
  recipeName: string;
  instructions: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: ParsedRecipeIngredient[];
}

// Recipe with ingredient availability
export interface RecipeWithAvailability extends Recipe {
  availableIngredients: string[];
  missingIngredients: string[];
  availabilityPercentage: number;
}
