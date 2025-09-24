// Notion REST API service using fetch instead of SDK for browser compatibility

if (!import.meta.env.VITE_NOTION_API_KEY) {
  throw new Error("VITE_NOTION_API_KEY environment variable is not set");
}

if (!import.meta.env.VITE_RECIPES_DATABASE_ID) {
  throw new Error("VITE_RECIPES_DATABASE_ID environment variable is not set");
}

if (!import.meta.env.VITE_INGREDIENTS_DATABASE_ID) {
  throw new Error("VITE_INGREDIENTS_DATABASE_ID environment variable is not set");
}

const NOTION_API_KEY = import.meta.env.VITE_NOTION_API_KEY;
const RECIPES_DATABASE_ID = import.meta.env.VITE_RECIPES_DATABASE_ID;
const INGREDIENTS_DATABASE_ID = import.meta.env.VITE_INGREDIENTS_DATABASE_ID;

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

// Helper function for Notion API calls
async function notionFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${NOTION_API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Notion API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

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
      await notionFetch(`/databases/${RECIPES_DATABASE_ID}`);
      await notionFetch(`/databases/${INGREDIENTS_DATABASE_ID}`);
      return true;
    } catch (error) {
      console.error("Notion connection test failed:", error);
      return false;
    }
  },

  async findOrCreateIngredient(name: string): Promise<string> {
    try {
      // Search for existing ingredient
      const searchResponse = await notionFetch(`/databases/${INGREDIENTS_DATABASE_ID}/query`, {
        method: 'POST',
        body: JSON.stringify({
          filter: {
            property: "Ingredient Name",
            title: {
              equals: name.trim(),
            },
          },
        }),
      });

      if (searchResponse.results.length > 0) {
        return searchResponse.results[0].id;
      }

      // Create new ingredient
      const createResponse = await notionFetch('/pages', {
        method: 'POST',
        body: JSON.stringify({
          parent: { database_id: INGREDIENTS_DATABASE_ID },
          properties: {
            "Ingredient Name": {
              title: [
                {
                  text: {
                    content: name.trim(),
                  },
                },
              ],
            },
          },
        }),
      });

      return createResponse.id;
    } catch (error) {
      console.error("Error finding/creating ingredient:", error);
      throw new Error(`Failed to find or create ingredient: ${name}`);
    }
  },

  async createRecipe(recipeData: CreateRecipeData): Promise<string> {
    try {
      const ingredientIds = await Promise.all(
        recipeData.ingredientNames.map((name) => this.findOrCreateIngredient(name))
      );

      const createResponse = await notionFetch('/pages', {
        method: 'POST',
        body: JSON.stringify({
          parent: { database_id: RECIPES_DATABASE_ID },
          properties: {
            "Recipe Name": {
              title: [
                {
                  text: {
                    content: recipeData.recipeName,
                  },
                },
              ],
            },
            "Instructions": {
              rich_text: [
                {
                  text: {
                    content: recipeData.instructions,
                  },
                },
              ],
            },
            "Prep Time": {
              rich_text: [
                {
                  text: {
                    content: recipeData.prepTime,
                  },
                },
              ],
            },
            "Cook Time": {
              rich_text: [
                {
                  text: {
                    content: recipeData.cookTime,
                  },
                },
              ],
            },
            "Servings": {
              rich_text: [
                {
                  text: {
                    content: recipeData.servings,
                  },
                },
              ],
            },
            "Ingredients": {
              relation: ingredientIds.map((id) => ({ id })),
            },
          },
        }),
      });

      return createResponse.id;
    } catch (error) {
      console.error("Error creating recipe:", error);
      throw new Error("Failed to create recipe in Notion");
    }
  },

  async getRecipe(recipeId: string): Promise<NotionRecipe | null> {
    try {
      const response = await notionFetch(`/pages/${recipeId}`);

      if (!response.properties) {
        return null;
      }

      const properties = response.properties;

      const recipeName = this.extractTitle(properties["Recipe Name"]);
      const instructions = this.extractRichText(properties["Instructions"]);
      const prepTime = this.extractRichText(properties["Prep Time"]);
      const cookTime = this.extractRichText(properties["Cook Time"]);
      const servings = this.extractRichText(properties["Servings"]);
      const ingredientIds = this.extractRelation(properties["Ingredients"]);

      return {
        id: response.id,
        recipeName,
        instructions,
        prepTime,
        cookTime,
        servings,
        ingredientIds,
      };
    } catch (error) {
      console.error("Error getting recipe:", error);
      return null;
    }
  },

  async getAllRecipes(): Promise<NotionRecipe[]> {
    try {
      const response = await notionFetch(`/databases/${RECIPES_DATABASE_ID}/query`, {
        method: 'POST',
      });

      const recipes: NotionRecipe[] = [];

      for (const page of response.results) {
        if (page.properties) {
          const properties = page.properties;

          const recipeName = this.extractTitle(properties["Recipe Name"]);
          const instructions = this.extractRichText(properties["Instructions"]);
          const prepTime = this.extractRichText(properties["Prep Time"]);
          const cookTime = this.extractRichText(properties["Cook Time"]);
          const servings = this.extractRichText(properties["Servings"]);
          const ingredientIds = this.extractRelation(properties["Ingredients"]);

          recipes.push({
            id: page.id,
            recipeName,
            instructions,
            prepTime,
            cookTime,
            servings,
            ingredientIds,
          });
        }
      }

      return recipes;
    } catch (error) {
      console.error("Error getting all recipes:", error);
      throw new Error("Failed to fetch recipes from Notion");
    }
  },

  async getIngredient(ingredientId: string): Promise<NotionIngredient | null> {
    try {
      const response = await notionFetch(`/pages/${ingredientId}`);

      if (!response.properties) {
        return null;
      }

      const properties = response.properties;
      const name = this.extractTitle(properties["Ingredient Name"]);
      const recipeIds = this.extractRelation(properties["Recipes"]);

      return {
        id: response.id,
        name,
        recipeIds,
      };
    } catch (error) {
      console.error("Error getting ingredient:", error);
      return null;
    }
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
      console.error("Error searching recipes by ingredients:", error);
      throw new Error("Failed to search recipes");
    }
  },

  extractTitle(property: any): string {
    if (property?.type === "title" && property.title?.[0]?.text?.content) {
      return property.title[0].text.content;
    }
    return "";
  },

  extractRichText(property: any): string {
    if (property?.type === "rich_text" && property.rich_text?.[0]?.text?.content) {
      return property.rich_text[0].text.content;
    }
    return "";
  },

  extractRelation(property: any): string[] {
    if (property?.type === "relation" && Array.isArray(property.relation)) {
      return property.relation.map((rel: any) => rel.id);
    }
    return [];
  },
};