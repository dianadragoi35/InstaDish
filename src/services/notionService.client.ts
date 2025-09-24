// Client-side Notion service that calls Next.js API routes

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

export const notionService = {
  async testConnection(): Promise<boolean> {
    try {
      // Test if the API endpoints are working by making a simple request
      const response = await fetch('/api/notion/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test-connection' }),
      });
      return response.ok;
    } catch (error) {
      console.error("Notion connection test failed:", error);
      return false;
    }
  },

  async findOrCreateIngredient(name: string): Promise<string> {
    try {
      const response = await fetch('/api/notion/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create ingredient: ${response.statusText}`);
      }

      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error("Error finding/creating ingredient:", error);
      throw new Error(`Failed to find or create ingredient: ${name}`);
    }
  },

  async createRecipe(recipeData: CreateRecipeData): Promise<string> {
    try {
      // First, create or find all ingredients
      const ingredientIds = await Promise.all(
        recipeData.ingredientNames.map((name) => this.findOrCreateIngredient(name))
      );

      // Then create the recipe
      const response = await fetch('/api/notion/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeName: recipeData.recipeName,
          instructions: recipeData.instructions,
          prepTime: recipeData.prepTime,
          cookTime: recipeData.cookTime,
          servings: recipeData.servings,
          ingredientIds,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create recipe: ${response.statusText}`);
      }

      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error("Error creating recipe:", error);
      throw new Error("Failed to create recipe in Notion");
    }
  },

  // Placeholder methods for future implementation
  async getRecipe(recipeId: string): Promise<NotionRecipe | null> {
    // TODO: Implement when needed
    console.log('getRecipe not yet implemented');
    return null;
  },

  async getAllRecipes(): Promise<NotionRecipe[]> {
    // TODO: Implement when needed
    console.log('getAllRecipes not yet implemented');
    return [];
  },

  async getIngredient(ingredientId: string): Promise<NotionIngredient | null> {
    // TODO: Implement when needed
    console.log('getIngredient not yet implemented');
    return null;
  },

  async getIngredientsForRecipe(recipeId: string): Promise<NotionIngredient[]> {
    // TODO: Implement when needed
    console.log('getIngredientsForRecipe not yet implemented');
    return [];
  },

  async searchRecipesByIngredients(availableIngredients: string[]): Promise<NotionRecipe[]> {
    // TODO: Implement when needed
    console.log('searchRecipesByIngredients not yet implemented');
    return [];
  },

  // Helper methods for consistency with old service
  extractTitle: () => '',
  extractRichText: () => '',
  extractRelation: () => [],
};