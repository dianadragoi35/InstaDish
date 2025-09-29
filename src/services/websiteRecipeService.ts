import {
  parseRecipeText,
  parseRecipeTextStructured,
  ParsedRecipe,
  ParsingResult,
  StructuredParsingResult
} from './aiParsingService';
import { ParsedRecipeData } from '../types';

export interface WebsiteRecipeResult {
    success: boolean;
    recipe?: ParsedRecipe;
    structuredRecipe?: ParsedRecipeData;
    content?: string;
    error?: string;
    url?: string;
}

/**
 * Validate URL format
 */
export const isValidWebsiteUrl = (url: string): boolean => {
    try {
        const urlObj = new URL(url.trim());
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
};

/**
 * Fetch website content via API
 */
const fetchWebsiteContent = async (websiteUrl: string): Promise<{ success: boolean; content?: string; error?: string }> => {
    try {
        const response = await fetch('/api/recipe/website', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ websiteUrl })
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.error || `HTTP ${response.status}`
            };
        }

        return {
            success: data.success,
            content: data.content,
            error: data.error
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error occurred'
        };
    }
};

/**
 * Clean website content for recipe parsing
 */
export const cleanContentForRecipe = (content: string): string => {
    return content
        // Remove common non-recipe phrases
        .replace(/\b(subscribe|newsletter|follow us|social media|advertisement|cookie policy|privacy policy)\b/gi, '')
        // Remove excessive punctuation
        .replace(/[.]{3,}/g, '...')
        .replace(/[-]{3,}/g, '---')
        // Clean up extra whitespace
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();
};

/**
 * Extract recipe from website URL by fetching content and parsing with AI
 */
export const extractRecipeFromWebsite = async (websiteUrl: string, useStructuredParsing: boolean = true): Promise<WebsiteRecipeResult> => {
    // Validate website URL
    if (!isValidWebsiteUrl(websiteUrl)) {
        return {
            success: false,
            error: "Invalid website URL format"
        };
    }

    try {
        // Step 1: Fetch website content
        const contentResult = await fetchWebsiteContent(websiteUrl);

        if (!contentResult.success || !contentResult.content) {
            return {
                success: false,
                error: contentResult.error || "Failed to fetch website content"
            };
        }

        // Step 2: Clean content for recipe parsing
        const cleanedContent = cleanContentForRecipe(contentResult.content);

        if (cleanedContent.length < 100) {
            return {
                success: false,
                error: "Website content too short or doesn't contain meaningful recipe content"
            };
        }

        // Step 3: Parse content with AI to extract recipe
        if (useStructuredParsing) {
            console.log('🔍 Using structured parsing for website content');
            const structuredResult: StructuredParsingResult = await parseRecipeTextStructured(cleanedContent);

            if (structuredResult.success && structuredResult.data) {
                return {
                    success: true,
                    structuredRecipe: structuredResult.data,
                    content: cleanedContent,
                    url: websiteUrl
                };
            } else {
                // Fall back to legacy parsing if structured fails
                console.warn('⚠️ Structured parsing failed, falling back to legacy parsing');
                const legacyResult: ParsingResult = await parseRecipeText(cleanedContent);

                if (legacyResult.success && legacyResult.data) {
                    return {
                        success: true,
                        recipe: legacyResult.data,
                        content: cleanedContent,
                        url: websiteUrl
                    };
                } else {
                    return {
                        success: false,
                        content: cleanedContent,
                        error: legacyResult.error || "Failed to extract recipe from website content"
                    };
                }
            }
        } else {
            console.log('🔍 Using legacy parsing for website content');
            const parsingResult: ParsingResult = await parseRecipeText(cleanedContent);

            if (!parsingResult.success || !parsingResult.data) {
                return {
                    success: false,
                    content: cleanedContent,
                    error: parsingResult.error || "Failed to extract recipe from website content"
                };
            }

            return {
                success: true,
                recipe: parsingResult.data,
                content: cleanedContent,
                url: websiteUrl
            };
        }

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred"
        };
    }
};

/**
 * Validate that website content contains recipe-like content
 */
export const validateRecipeContent = (content: string): { isValid: boolean; confidence: number; reasons: string[] } => {
    const recipeKeywords = [
        'recipe', 'ingredients', 'instructions', 'cook', 'bake', 'prepare',
        'cup', 'tablespoon', 'teaspoon', 'tbsp', 'tsp', 'ounce', 'pound', 'gram',
        'oven', 'heat', 'mix', 'stir', 'add', 'pour', 'chop', 'dice', 'slice',
        'minute', 'hour', 'temperature', 'degrees', 'fahrenheit', 'celsius',
        'flour', 'salt', 'pepper', 'oil', 'butter', 'onion', 'garlic',
        'serve', 'dish', 'meal', 'servings', 'prep time', 'cook time'
    ];

    const lowerContent = content.toLowerCase();
    const words = lowerContent.split(/\s+/);
    const totalWords = words.length;

    if (totalWords < 100) {
        return {
            isValid: false,
            confidence: 0,
            reasons: ['Content too short']
        };
    }

    let keywordCount = 0;
    const foundKeywords: string[] = [];

    recipeKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        const matches = lowerContent.match(regex);
        if (matches) {
            keywordCount += matches.length;
            foundKeywords.push(keyword);
        }
    });

    const keywordDensity = keywordCount / totalWords;
    const uniqueKeywords = foundKeywords.length;

    // Calculate confidence score
    let confidence = 0;
    const reasons: string[] = [];

    // Keyword density check
    if (keywordDensity >= 0.03) {
        confidence += 0.4;
        reasons.push('High recipe keyword density');
    } else if (keywordDensity >= 0.015) {
        confidence += 0.2;
        reasons.push('Moderate recipe keyword density');
    } else {
        reasons.push('Low recipe keyword density');
    }

    // Unique keywords check
    if (uniqueKeywords >= 15) {
        confidence += 0.3;
        reasons.push('Many recipe keywords found');
    } else if (uniqueKeywords >= 8) {
        confidence += 0.2;
        reasons.push('Some recipe keywords found');
    } else {
        reasons.push('Few recipe keywords found');
    }

    // Length check
    if (totalWords >= 500) {
        confidence += 0.2;
        reasons.push('Good content length');
    } else if (totalWords >= 200) {
        confidence += 0.1;
        reasons.push('Adequate content length');
    } else {
        reasons.push('Short content');
    }

    // Recipe structure patterns
    const structurePatterns = [
        /ingredients?:?\s*\n/gi,
        /instructions?:?\s*\n/gi,
        /directions?:?\s*\n/gi,
        /\b\d+\.\s/g, // numbered steps
        /\b(step|first|then|next|after|finally)\b/gi,
        /\b\d+\s*(cup|tablespoon|teaspoon|ounce|pound|gram)\b/gi
    ];

    let patternMatches = 0;
    structurePatterns.forEach(pattern => {
        if (lowerContent.match(pattern)) {
            patternMatches++;
        }
    });

    if (patternMatches >= 3) {
        confidence += 0.1;
        reasons.push('Contains recipe structure patterns');
    }

    return {
        isValid: confidence >= 0.4,
        confidence: Math.min(confidence, 1.0),
        reasons
    };
};