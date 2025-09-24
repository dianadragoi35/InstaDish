import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOTION_API_KEY = process.env.NOTION_API_KEY!;

function extractTitle(property: any): string {
  if (property?.type === "title" && property.title?.[0]?.text?.content) {
    return property.title[0].text.content;
  }
  return "";
}

export async function POST(request: NextRequest) {
  try {
    const { ingredientIds } = await request.json();

    if (!ingredientIds || !Array.isArray(ingredientIds)) {
      return NextResponse.json({
        error: 'Ingredient IDs array is required'
      }, { status: 400 });
    }

    const ingredients = await Promise.all(
      ingredientIds.map(async (id: string) => {
        try {
          const response = await fetch(`https://api.notion.com/v1/pages/${id}`, {
            headers: {
              'Authorization': `Bearer ${NOTION_API_KEY}`,
              'Content-Type': 'application/json',
              'Notion-Version': '2022-06-28',
            },
          });

          if (!response.ok) {
            console.error(`Failed to fetch ingredient ${id}:`, response.status);
            return null;
          }

          const data = await response.json();

          if (!data.properties) {
            return null;
          }

          return {
            id: data.id,
            name: extractTitle(data.properties["Ingredient Name"]),
          };
        } catch (error) {
          console.error(`Error fetching ingredient ${id}:`, error);
          return null;
        }
      })
    );

    // Filter out failed requests
    const validIngredients = ingredients.filter(ingredient => ingredient !== null);

    return NextResponse.json({ ingredients: validIngredients });
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ingredients' },
      { status: 500 }
    );
  }
}