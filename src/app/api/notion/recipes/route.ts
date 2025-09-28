import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime for this API route
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const RECIPES_DATABASE_ID = process.env.RECIPES_DATABASE_ID!;

function splitTextIntoChunks(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    let chunkEnd = currentIndex + maxLength;

    // If we're not at the end of the text, try to break at a natural point
    if (chunkEnd < text.length) {
      // Try to break at a sentence end (. followed by space or newline)
      const sentenceBreak = text.lastIndexOf('. ', chunkEnd);
      if (sentenceBreak > currentIndex) {
        chunkEnd = sentenceBreak + 1;
      } else {
        // Try to break at a paragraph break
        const paragraphBreak = text.lastIndexOf('\n', chunkEnd);
        if (paragraphBreak > currentIndex) {
          chunkEnd = paragraphBreak;
        } else {
          // Try to break at a word boundary
          const wordBreak = text.lastIndexOf(' ', chunkEnd);
          if (wordBreak > currentIndex) {
            chunkEnd = wordBreak;
          }
        }
      }
    }

    chunks.push(text.substring(currentIndex, chunkEnd));
    currentIndex = chunkEnd;

    // Skip leading whitespace for the next chunk
    while (currentIndex < text.length && /\s/.test(text[currentIndex])) {
      currentIndex++;
    }
  }

  return chunks;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Recipe API received body:', body);

    // Support both legacy and new structured formats
    const {
      recipeName,
      instructions,
      prepTime,
      cookTime,
      servings,
      ingredientIds, // Legacy format
      ingredients     // New structured format
    } = body;

    console.log('Extracted fields:', {
      recipeName,
      instructions,
      prepTime,
      cookTime,
      servings,
      ingredientIds,
      ingredients
    });

    if (!recipeName || !instructions) {
      console.error('Missing required fields:', { recipeName: !!recipeName, instructions: !!instructions });
      return NextResponse.json({
        error: 'Recipe name and instructions are required'
      }, { status: 400 });
    }

    // Validate that we have either legacy ingredientIds or new structured ingredients
    if (!ingredientIds && !ingredients) {
      console.error('No ingredients provided:', { ingredientIds, ingredients });
      return NextResponse.json({
        error: 'Either ingredientIds or ingredients must be provided'
      }, { status: 400 });
    }

    // Create new recipe using direct API call (without ingredients relation for new format)
    const recipeProperties: any = {
      "Recipe Name": {
        title: [
          {
            text: {
              content: recipeName,
            },
          },
        ],
      },
      "Instructions": {
        rich_text: splitTextIntoChunks(instructions, 2000).map(chunk => ({
          text: {
            content: chunk,
          },
        })),
      },
      "Prep Time": {
        rich_text: [
          {
            text: {
              content: prepTime || 'Not specified',
            },
          },
        ],
      },
      "Cook Time": {
        rich_text: [
          {
            text: {
              content: cookTime || 'Not specified',
            },
          },
        ],
      },
      "Servings": {
        rich_text: [
          {
            text: {
              content: servings || '4',
            },
          },
        ],
      },
    };

    // Only add Ingredients relation for legacy format
    if (ingredientIds && Array.isArray(ingredientIds)) {
      recipeProperties["Ingredients"] = {
        relation: ingredientIds.map((id: string) => ({ id })),
      };
    }

    const createResponse = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: RECIPES_DATABASE_ID },
        properties: recipeProperties,
      }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.text();
      console.error('Notion API error:', errorData);
      return NextResponse.json(
        { error: `Notion API error: ${createResponse.statusText}` },
        { status: createResponse.status }
      );
    }

    const createData = await createResponse.json();

    return NextResponse.json({ id: createData.id });
  } catch (error) {
    console.error('Error in recipe API:', error);
    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    );
  }
}