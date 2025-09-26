import { fetchYouTubeTranscript, cleanTranscriptForRecipe, isValidYouTubeUrl } from './youtubeTranscriptService';
import { parseRecipeText, ParsedRecipe, ParsingResult } from './aiParsingService';

export interface YoutubeRecipeResult {
    success: boolean;
    recipe?: ParsedRecipe;
    transcript?: string;
    error?: string;
    videoId?: string;
}

/**
 * Extract recipe from YouTube video by fetching transcript and parsing with AI
 */
export const extractRecipeFromYouTubeVideo = async (youtubeUrl: string): Promise<YoutubeRecipeResult> => {
    // Validate YouTube URL
    if (!isValidYouTubeUrl(youtubeUrl)) {
        return {
            success: false,
            error: "Invalid YouTube URL format"
        };
    }

    try {
        // Step 1: Fetch transcript
        const transcriptResult = await fetchYouTubeTranscript(youtubeUrl);

        if (!transcriptResult.success || !transcriptResult.transcript) {
            return {
                success: false,
                error: transcriptResult.error || "Failed to fetch video transcript"
            };
        }

        // Step 2: Clean transcript for recipe parsing
        const cleanedTranscript = cleanTranscriptForRecipe(transcriptResult.transcript);

        if (cleanedTranscript.length < 50) {
            return {
                success: false,
                error: "Transcript too short or doesn't contain meaningful recipe content"
            };
        }

        // Step 3: Parse transcript with AI to extract recipe
        const parsingResult: ParsingResult = await parseRecipeText(cleanedTranscript);

        if (!parsingResult.success || !parsingResult.data) {
            return {
                success: false,
                transcript: cleanedTranscript,
                error: parsingResult.error || "Failed to extract recipe from transcript"
            };
        }

        // Step 4: Return successful result
        return {
            success: true,
            recipe: parsingResult.data,
            transcript: cleanedTranscript,
            videoId: youtubeUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1]
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred"
        };
    }
};

/**
 * Validate that a transcript contains recipe-like content
 */
export const validateRecipeContent = (transcript: string): { isValid: boolean; confidence: number; reasons: string[] } => {
    const recipeKeywords = [
        'recipe', 'cook', 'bake', 'ingredient', 'cup', 'tablespoon', 'teaspoon',
        'oven', 'heat', 'mix', 'stir', 'add', 'pour', 'chop', 'dice', 'slice',
        'minute', 'hour', 'temperature', 'degrees', 'flour', 'salt', 'pepper',
        'oil', 'butter', 'onion', 'garlic', 'serve', 'dish', 'meal'
    ];

    const lowerTranscript = transcript.toLowerCase();
    const words = lowerTranscript.split(/\s+/);
    const totalWords = words.length;

    if (totalWords < 50) {
        return {
            isValid: false,
            confidence: 0,
            reasons: ['Transcript too short']
        };
    }

    let keywordCount = 0;
    const foundKeywords: string[] = [];

    recipeKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = lowerTranscript.match(regex);
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
    if (keywordDensity >= 0.05) {
        confidence += 0.4;
        reasons.push('Good keyword density');
    } else if (keywordDensity >= 0.02) {
        confidence += 0.2;
        reasons.push('Moderate keyword density');
    } else {
        reasons.push('Low recipe keyword density');
    }

    // Unique keywords check
    if (uniqueKeywords >= 10) {
        confidence += 0.3;
        reasons.push('Many recipe keywords found');
    } else if (uniqueKeywords >= 5) {
        confidence += 0.2;
        reasons.push('Some recipe keywords found');
    } else {
        reasons.push('Few recipe keywords found');
    }

    // Length check
    if (totalWords >= 200) {
        confidence += 0.2;
        reasons.push('Good transcript length');
    } else if (totalWords >= 100) {
        confidence += 0.1;
        reasons.push('Adequate transcript length');
    } else {
        reasons.push('Short transcript');
    }

    // Cooking instruction patterns
    const instructionPatterns = [
        /\b(first|then|next|after|finally|meanwhile)\b/gi,
        /\b(add|mix|stir|cook|bake|fry|boil|simmer)\b/gi,
        /\b\d+\s*(minute|hour|degree|cup|tablespoon|teaspoon)\b/gi
    ];

    let patternMatches = 0;
    instructionPatterns.forEach(pattern => {
        if (lowerTranscript.match(pattern)) {
            patternMatches++;
        }
    });

    if (patternMatches >= 2) {
        confidence += 0.1;
        reasons.push('Contains cooking instruction patterns');
    }

    return {
        isValid: confidence >= 0.3,
        confidence: Math.min(confidence, 1.0),
        reasons
    };
};