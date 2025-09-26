import { describe, it, expect } from 'vitest';
import { validateRecipeContent } from '../youtubeRecipeService';

describe('YouTube Recipe Service', () => {
  describe('validateRecipeContent', () => {
    it('should validate recipe content with high confidence', () => {
      const recipeTranscript = `
        Today I'm going to show you how to make a delicious pasta carbonara.
        First, we need to cook the pasta in boiling water for about 8 minutes.
        Meanwhile, in a large pan, add some olive oil and cook the bacon until crispy.
        In a bowl, mix 2 eggs with parmesan cheese and pepper.
        When the pasta is done, drain it and add it to the pan with the bacon.
        Pour the egg mixture over the pasta and stir quickly to avoid scrambling the eggs.
        Serve immediately with extra parmesan cheese on top.
      `;

      const result = validateRecipeContent(recipeTranscript);

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.reasons).toContain('Good keyword density');
    });

    it('should reject non-recipe content', () => {
      const nonRecipeTranscript = `
        Welcome to my channel where I talk about technology and programming.
        Today we're going to discuss JavaScript frameworks and their performance.
        React is a popular library for building user interfaces.
        Angular provides a complete framework solution.
        Vue.js is known for its simplicity and ease of use.
      `;

      const result = validateRecipeContent(nonRecipeTranscript);

      expect(result.isValid).toBe(false);
      expect(result.confidence).toBeLessThan(0.3);
    });

    it('should reject very short transcripts', () => {
      const shortTranscript = 'Cook pasta';

      const result = validateRecipeContent(shortTranscript);

      expect(result.isValid).toBe(false);
      expect(result.reasons).toContain('Transcript too short');
    });

    it('should give moderate confidence for borderline content', () => {
      const borderlineTranscript = `
        Hey everyone, today I want to talk about food and cooking.
        I really love to cook different dishes with various ingredients.
        You can use chicken, beef, or vegetables depending on your preference.
        Don't forget to season everything with salt and pepper.
        Cooking is such a wonderful hobby and everyone should try it.
        Remember to always taste your food before serving.
      `;

      const result = validateRecipeContent(borderlineTranscript);

      // This should have some recipe keywords but lack specific instructions
      expect(result.confidence).toBeGreaterThan(0.1);
      expect(result.confidence).toBeLessThan(0.6);
    });

    it('should detect cooking instruction patterns', () => {
      const instructionalTranscript = `
        First, preheat your oven to 350 degrees.
        Next, mix 2 cups of flour with 1 teaspoon of salt.
        Then add 3 tablespoons of olive oil and stir well.
        Finally, bake for 25 minutes until golden brown.
      `;

      const result = validateRecipeContent(instructionalTranscript);

      expect(result.isValid).toBe(true);
      expect(result.reasons).toContain('Contains cooking instruction patterns');
    });
  });
});