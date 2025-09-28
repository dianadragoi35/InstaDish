// Client-side Notion service that calls Next.js API routes
import {
  RecipeIngredient,
  CreateRecipeIngredientData,
  UpdateRecipeIngredientData,
  ParsedRecipeIngredient
} from '../types';

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
  recipeIngredients: RecipeIngredient[];
}

export interface CreateRecipeData {
  recipeName: string;
  instructions: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: ParsedRecipeIngredient[];
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
      console.log('Creating recipe with data:', recipeData);

      // First, create the recipe
      const requestBody = {
        recipeName: recipeData.recipeName,
        instructions: recipeData.instructions,
        prepTime: recipeData.prepTime,
        cookTime: recipeData.cookTime,
        servings: recipeData.servings,
        ingredients: recipeData.ingredients, // Include structured ingredients
      };

      console.log('Sending request body:', requestBody);

      const response = await fetch('/api/notion/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to create recipe: ${response.statusText} - ${errorText}`);
      }

      const recipeResponse = await response.json();
      const recipeId = recipeResponse.id;

      // Then create ingredient relationships with quantities
      // Try to use the new junction table, fall back to legacy format if not available
      try {
        await Promise.all(
          recipeData.ingredients.map(async (ingredient) => {
            const ingredientId = await this.findOrCreateIngredient(ingredient.cleanName);
            await this.createRecipeIngredient({
              recipeId,
              ingredientId,
              quantity: ingredient.quantity,
              notes: ingredient.notes,
            });
          })
        );
      } catch (junctionError) {
        console.warn('Junction table not available, falling back to legacy format:', junctionError);

        // Fall back to legacy format by recreating the recipe with ingredient relations
        try {
          const ingredientIds = await Promise.all(
            recipeData.ingredients.map((ingredient) => this.findOrCreateIngredient(ingredient.cleanName))
          );

          // Update the existing recipe to add legacy ingredient relations
          const updateResponse = await fetch(`/api/notion/recipes/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipeId,
              ingredientIds,
            }),
          });

          if (updateResponse.ok) {
            console.info('Successfully updated recipe with legacy ingredient relations');
          } else {
            console.warn('Failed to update recipe with legacy relations, but recipe was created');
          }
        } catch (legacyError) {
          console.warn('Failed to create legacy ingredient relations:', legacyError);
        }

        console.warn('Recipe created. For full functionality with quantities, please set up RECIPE_INGREDIENTS_DATABASE_ID environment variable.');
      }

      return recipeId;
    } catch (error) {
      console.error("Error creating recipe:", error);
      throw new Error("Failed to create recipe in Notion");
    }
  },

  // Recipe-Ingredient junction table methods
  async createRecipeIngredient(data: CreateRecipeIngredientData): Promise<RecipeIngredient> {
    try {
      const response = await fetch('/api/notion/recipe-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to create recipe ingredient: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating recipe ingredient:", error);
      throw error;
    }
  },

  async getRecipeIngredients(recipeId: string): Promise<RecipeIngredient[]> {
    try {
      const response = await fetch(`/api/notion/recipe-ingredients?recipeId=${recipeId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch recipe ingredients: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching recipe ingredients:", error);
      throw error;
    }
  },

  async updateRecipeIngredient(id: string, data: UpdateRecipeIngredientData): Promise<RecipeIngredient> {
    try {
      const response = await fetch(`/api/notion/recipe-ingredients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to update recipe ingredient: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error updating recipe ingredient:", error);
      throw error;
    }
  },

  async deleteRecipeIngredient(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/notion/recipe-ingredients/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete recipe ingredient: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error deleting recipe ingredient:", error);
      throw error;
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