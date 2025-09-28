import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseRecipeTextStructured, validateStructuredRecipe } from '../aiParsingService';
import type { ParsedRecipeData } from '../../types';

// Mock the Google AI SDK
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    models: {
      generateContent: mockGenerateContent
    }
  })),
  Type: {
    OBJECT: 'object',
    STRING: 'string',
    ARRAY: 'array'
  }
}));

// Mock environment variable before importing the module
vi.stubEnv('NEXT_PUBLIC_GEMINI_API_KEY', 'test-api-key');

describe('Structured Recipe Parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseRecipeTextStructured', () => {
    const mockStructuredRecipe: ParsedRecipeData = {
      recipeName: 'Chocolate Chip Cookies',
      prepTime: '15 minutes',
      cookTime: '12 minutes',
      servings: '24',
      instructions: '1. Preheat oven to 375°F\n2. Mix flour and baking soda\n3. Cream butter and sugars\n4. Add eggs and vanilla\n5. Combine wet and dry ingredients\n6. Fold in chocolate chips\n7. Bake for 9-11 minutes',
      ingredients: [
        {
          cleanName: 'flour',
          quantity: '2 1/4 cups',
          notes: 'all-purpose'
        },
        {
          cleanName: 'baking soda',
          quantity: '1 tsp'
        },
        {
          cleanName: 'butter',
          quantity: '1 cup',
          notes: 'softened'
        },
        {
          cleanName: 'brown sugar',
          quantity: '3/4 cup',
          notes: 'packed'
        },
        {
          cleanName: 'white sugar',
          quantity: '1/4 cup'
        },
        {
          cleanName: 'eggs',
          quantity: '2 large'
        },
        {
          cleanName: 'vanilla extract',
          quantity: '2 tsp'
        },
        {
          cleanName: 'chocolate chips',
          quantity: '2 cups'
        }
      ]
    };

    it('should successfully parse structured recipe text', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(mockStructuredRecipe)
      });

      const recipeText = `
Chocolate Chip Cookies

Ingredients:
- 2 1/4 cups all-purpose flour
- 1 tsp baking soda
- 1 cup butter, softened
- 3/4 cup packed brown sugar
- 1/4 cup white sugar
- 2 large eggs
- 2 tsp vanilla extract
- 2 cups chocolate chips

Instructions:
1. Preheat oven to 375°F
2. Mix flour and baking soda
3. Cream butter and sugars
4. Add eggs and vanilla
5. Combine wet and dry ingredients
6. Fold in chocolate chips
7. Bake for 9-11 minutes

Prep time: 15 minutes
Cook time: 12 minutes
Serves: 24 cookies
      `;

      const result = await parseRecipeTextStructured(recipeText);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStructuredRecipe);
      expect(mockGenerateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        contents: expect.stringContaining('Parse the following recipe text'),
        config: {
          responseMimeType: 'application/json',
          responseSchema: expect.any(Object)
        }
      });
    });

    it('should handle empty recipe text', async () => {
      const result = await parseRecipeTextStructured('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Recipe text cannot be empty');
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('should handle invalid JSON response', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'invalid json'
      });

      const result = await parseRecipeTextStructured('Some recipe text');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to parse AI response as JSON');
    });

    it('should handle missing required fields', async () => {
      const incompleteRecipe = {
        recipeName: 'Test Recipe',
        // Missing ingredients and instructions
      };

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(incompleteRecipe)
      });

      const result = await parseRecipeTextStructured('Some recipe text');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid recipe data: missing required fields');
    });

    it('should clean up ingredient data', async () => {
      const recipeWithMessyData = {
        ...mockStructuredRecipe,
        ingredients: [
          {
            cleanName: '  FLOUR  ',
            quantity: '  2 cups  ',
            notes: '  all-purpose  '
          }
        ]
      };

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(recipeWithMessyData)
      });

      const result = await parseRecipeTextStructured('Some recipe text');

      expect(result.success).toBe(true);
      expect(result.data?.ingredients[0]).toEqual({
        cleanName: 'flour',
        quantity: '2 cups',
        notes: 'all-purpose'
      });
    });
  });

  describe('validateStructuredRecipe', () => {
    const validRecipe: ParsedRecipeData = {
      recipeName: 'Test Recipe',
      prepTime: '10 minutes',
      cookTime: '20 minutes',
      servings: '4',
      instructions: 'Step 1: Do something\nStep 2: Do something else',
      ingredients: [
        {
          cleanName: 'flour',
          quantity: '2 cups'
        },
        {
          cleanName: 'sugar',
          quantity: '1 cup',
          notes: 'granulated'
        }
      ]
    };

    it('should validate a correct recipe', () => {
      const result = validateStructuredRecipe(validRecipe);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should catch missing recipe name', () => {
      const invalidRecipe = { ...validRecipe, recipeName: '' };
      const result = validateStructuredRecipe(invalidRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Recipe name is required');
    });

    it('should catch missing prep time', () => {
      const invalidRecipe = { ...validRecipe, prepTime: '' };
      const result = validateStructuredRecipe(invalidRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Prep time is required');
    });

    it('should catch missing cook time', () => {
      const invalidRecipe = { ...validRecipe, cookTime: '' };
      const result = validateStructuredRecipe(invalidRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cook time is required');
    });

    it('should catch missing servings', () => {
      const invalidRecipe = { ...validRecipe, servings: '' };
      const result = validateStructuredRecipe(invalidRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Servings is required');
    });

    it('should catch empty ingredients list', () => {
      const invalidRecipe = { ...validRecipe, ingredients: [] };
      const result = validateStructuredRecipe(invalidRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one ingredient is required');
    });

    it('should catch missing instructions', () => {
      const invalidRecipe = { ...validRecipe, instructions: '' };
      const result = validateStructuredRecipe(invalidRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Instructions are required');
    });

    it('should catch ingredient with missing clean name', () => {
      const invalidRecipe = {
        ...validRecipe,
        ingredients: [
          {
            cleanName: '',
            quantity: '2 cups'
          }
        ]
      };
      const result = validateStructuredRecipe(invalidRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Ingredient 1: Clean name is required');
    });

    it('should catch ingredient with missing quantity', () => {
      const invalidRecipe = {
        ...validRecipe,
        ingredients: [
          {
            cleanName: 'flour',
            quantity: ''
          }
        ]
      };
      const result = validateStructuredRecipe(invalidRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Ingredient 1: Quantity is required');
    });

    it('should catch clean name containing quantities', () => {
      const invalidRecipe = {
        ...validRecipe,
        ingredients: [
          {
            cleanName: '2 cups flour',
            quantity: '2 cups'
          }
        ]
      };
      const result = validateStructuredRecipe(invalidRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Ingredient "2 cups flour" appears to contain quantities in the clean name');
    });
  });
});