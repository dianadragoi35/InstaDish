import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOTION_API_KEY = process.env.NOTION_API_KEY!;

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

export async function PUT(request: NextRequest) {
  try {
    const { recipeId, recipeName, instructions, prepTime, cookTime, servings, ingredientIds } = await request.json();

    if (!recipeId) {
      return NextResponse.json({
        error: 'Recipe ID is required'
      }, { status: 400 });
    }

    const properties: any = {};

    if (recipeName !== undefined) {
      properties["Recipe Name"] = {
        title: [
          {
            text: {
              content: recipeName,
            },
          },
        ],
      };
    }

    if (instructions !== undefined) {
      properties["Instructions"] = {
        rich_text: [
          {
            text: {
              content: instructions,
            },
          },
        ],
      };
    }

    if (prepTime !== undefined) {
      properties["Prep Time"] = {
        rich_text: [
          {
            text: {
              content: prepTime,
            },
          },
        ],
      };
    }

    if (cookTime !== undefined) {
      properties["Cook Time"] = {
        rich_text: [
          {
            text: {
              content: cookTime,
            },
          },
        ],
      };
    }

    if (servings !== undefined) {
      properties["Servings"] = {
        rich_text: [
          {
            text: {
              content: servings,
            },
          },
        ],
      };
    }

    if (ingredientIds !== undefined && Array.isArray(ingredientIds)) {
      properties["Ingredients"] = {
        relation: ingredientIds.map((id: string) => ({ id })),
      };
    }

    const response = await fetch(`https://api.notion.com/v1/pages/${recipeId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        properties,
      }),
    });

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ success: true, recipe: data });
  } catch (error) {
    console.error('Error updating recipe:', error);
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    );
  }
}

// Keep PATCH method for backward compatibility
export async function PATCH(request: NextRequest) {
  return PUT(request);
}