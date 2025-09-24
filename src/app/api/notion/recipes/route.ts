import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime for this API route
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const RECIPES_DATABASE_ID = process.env.RECIPES_DATABASE_ID!;

export async function POST(request: NextRequest) {
  try {
    const { recipeName, instructions, prepTime, cookTime, servings, ingredientIds } = await request.json();

    if (!recipeName || !instructions || !ingredientIds) {
      return NextResponse.json({
        error: 'Recipe name, instructions, and ingredients are required'
      }, { status: 400 });
    }

    // Create new recipe using direct API call
    const createResponse = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: RECIPES_DATABASE_ID },
        properties: {
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
            rich_text: [
              {
                text: {
                  content: instructions,
                },
              },
            ],
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
          "Ingredients": {
            relation: ingredientIds.map((id: string) => ({ id })),
          },
        },
      }),
    });

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