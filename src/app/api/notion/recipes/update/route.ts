import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOTION_API_KEY = process.env.NOTION_API_KEY!;

export async function PATCH(request: NextRequest) {
  try {
    const { recipeId, recipeName, instructions, prepTime, cookTime, servings } = await request.json();

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