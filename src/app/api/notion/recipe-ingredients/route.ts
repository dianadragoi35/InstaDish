import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const RECIPE_INGREDIENTS_DATABASE_ID = process.env.RECIPE_INGREDIENTS_DATABASE_ID;

export async function POST(request: NextRequest) {
  try {
    if (!RECIPE_INGREDIENTS_DATABASE_ID) {
      return NextResponse.json(
        { error: 'Recipe Ingredients database not configured. Please set RECIPE_INGREDIENTS_DATABASE_ID environment variable.' },
        { status: 503 }
      );
    }

    const { recipeId, ingredientId, quantity, notes } = await request.json();

    if (!recipeId || !ingredientId || !quantity) {
      return NextResponse.json(
        { error: 'Recipe ID, ingredient ID, and quantity are required' },
        { status: 400 }
      );
    }

    const response = await notion.pages.create({
      parent: { database_id: RECIPE_INGREDIENTS_DATABASE_ID },
      properties: {
        'Recipe': {
          relation: [{ id: recipeId }],
        },
        'Ingredient': {
          relation: [{ id: ingredientId }],
        },
        'Quantity': {
          rich_text: [
            {
              text: {
                content: quantity,
              },
            },
          ],
        },
        ...(notes && {
          'Notes': {
            rich_text: [
              {
                text: {
                  content: notes,
                },
              },
            ],
          },
        }),
      },
    });

    return NextResponse.json({
      id: response.id,
      recipeId,
      ingredientId,
      quantity,
      notes,
    });
  } catch (error) {
    console.error('Error creating recipe ingredient:', error);
    return NextResponse.json(
      { error: 'Failed to create recipe ingredient relationship' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!RECIPE_INGREDIENTS_DATABASE_ID) {
      return NextResponse.json(
        { error: 'Recipe Ingredients database not configured. Please set RECIPE_INGREDIENTS_DATABASE_ID environment variable.' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const recipeId = searchParams.get('recipeId');

    let filter = {};
    if (recipeId) {
      filter = {
        property: 'Recipe',
        relation: {
          contains: recipeId,
        },
      };
    }

    const response = await notion.databases.query({
      database_id: RECIPE_INGREDIENTS_DATABASE_ID,
      ...(Object.keys(filter).length > 0 && { filter }),
    });

    const recipeIngredients = response.results.map((page: any) => {
      const properties = page.properties;

      return {
        id: page.id,
        recipeId: properties.Recipe?.relation?.[0]?.id || '',
        ingredientId: properties.Ingredient?.relation?.[0]?.id || '',
        quantity: properties.Quantity?.rich_text?.[0]?.text?.content || '',
        notes: properties.Notes?.rich_text?.[0]?.text?.content || undefined,
      };
    });

    return NextResponse.json(recipeIngredients);
  } catch (error) {
    console.error('Error fetching recipe ingredients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipe ingredients' },
      { status: 500 }
    );
  }
}