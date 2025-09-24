// Mock Notion service for client-side testing
// The real Notion API must run server-side

export interface NotionIngredient {
  id: string;
  name: string;
  recipeIds: string[];
}

export interface NotionRecipe {
  id: string;
  recipeName: string;
  instructions: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredientIds: string[];
}

export interface CreateRecipeData {
  recipeName: string;
  instructions: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredientNames: string[];
}

// Mock data storage
const mockIngredients = new Map<string, NotionIngredient>();
const mockRecipes = new Map<string, NotionRecipe>();

let mockIdCounter = 1;
const generateMockId = () => `mock-${mockIdCounter++}`;

export const notionService = {
  async testConnection(): Promise<boolean> {
    console.log('🔧 Using mock Notion service for client-side testing');
    return true;
  },

  async findOrCreateIngredient(name: string): Promise<string> {
    const normalizedName = name.toLowerCase().trim();

    // Check if ingredient already exists
    for (const [id, ingredient] of mockIngredients.entries()) {
      if (ingredient.name.toLowerCase() === normalizedName) {
        console.log(`📦 Found existing ingredient: ${ingredient.name}`);
        return id;
      }
    }

    // Create new ingredient
    const id = generateMockId();
    const ingredient: NotionIngredient = {
      id,
      name: name.trim(),
      recipeIds: [],
    };

    mockIngredients.set(id, ingredient);
    console.log(`✨ Created new ingredient: ${ingredient.name} (${id})`);
    return id;
  },

  async createRecipe(recipeData: CreateRecipeData): Promise<string> {
    try {
      // Find or create ingredients
      const ingredientIds = await Promise.all(
        recipeData.ingredientNames.map((name) => this.findOrCreateIngredient(name))
      );

      // Create recipe
      const recipeId = generateMockId();
      const recipe: NotionRecipe = {
        id: recipeId,
        recipeName: recipeData.recipeName,
        instructions: recipeData.instructions,
        prepTime: recipeData.prepTime,
        cookTime: recipeData.cookTime,
        servings: recipeData.servings,
        ingredientIds,
      };

      mockRecipes.set(recipeId, recipe);

      // Update ingredient relationships
      ingredientIds.forEach(ingredientId => {
        const ingredient = mockIngredients.get(ingredientId);
        if (ingredient) {
          ingredient.recipeIds.push(recipeId);
        }
      });

      console.log(`🍳 Created recipe: ${recipe.recipeName} (${recipeId})`);
      console.log(`📊 Mock database now contains:`, {
        recipes: mockRecipes.size,
        ingredients: mockIngredients.size
      });

      return recipeId;
    } catch (error) {
      console.error('❌ Error creating recipe:', error);
      throw new Error('Failed to create recipe in mock database');
    }
  },

  async getRecipe(recipeId: string): Promise<NotionRecipe | null> {
    return mockRecipes.get(recipeId) || null;
  },

  async getAllRecipes(): Promise<NotionRecipe[]> {
    return Array.from(mockRecipes.values());
  },

  async getIngredient(ingredientId: string): Promise<NotionIngredient | null> {
    return mockIngredients.get(ingredientId) || null;
  },

  async getIngredientsForRecipe(recipeId: string): Promise<NotionIngredient[]> {
    const recipe = await this.getRecipe(recipeId);
    if (!recipe) return [];

    const ingredients = await Promise.all(
      recipe.ingredientIds.map(async (id: string) => {
        const ingredient = await this.getIngredient(id);
        return ingredient;
      })
    );

    return ingredients.filter((ingredient): ingredient is NotionIngredient => ingredient !== null);
  },

  async searchRecipesByIngredients(availableIngredients: string[]): Promise<NotionRecipe[]> {
    try {
      const allRecipes = await this.getAllRecipes();
      const recipesWithIngredients = [];

      for (const recipe of allRecipes) {
        const recipeIngredients = await this.getIngredientsForRecipe(recipe.id);
        const ingredientNames = recipeIngredients.map((ing: NotionIngredient) => ing.name.toLowerCase());

        const matchCount = availableIngredients.filter(available =>
          ingredientNames.some((ingredient: string) =>
            ingredient.includes(available.toLowerCase()) ||
            available.toLowerCase().includes(ingredient)
          )
        ).length;

        if (matchCount > 0) {
          recipesWithIngredients.push({
            ...recipe,
            matchPercentage: (matchCount / ingredientNames.length) * 100
          });
        }
      }

      recipesWithIngredients.sort((a, b) =>
        (b as any).matchPercentage - (a as any).matchPercentage
      );

      return recipesWithIngredients;
    } catch (error) {
      console.error('❌ Error searching recipes by ingredients:', error);
      throw new Error('Failed to search recipes');
    }
  },

  // Helper methods for consistency with real service
  extractTitle: () => '',
  extractRichText: () => '',
  extractRelation: () => [],
};