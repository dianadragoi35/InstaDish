import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const RECIPES_DATABASE_ID = process.env.RECIPES_DATABASE_ID!;
const RECIPE_INGREDIENTS_DATABASE_ID = process.env.RECIPE_INGREDIENTS_DATABASE_ID;

function extractTitle(property: any): string {
  if (property?.type === "title" && property.title?.[0]?.text?.content) {
    return property.title[0].text.content;
  }
  return "";
}

function extractRichText(property: any): string {
  if (property?.type === "rich_text" && property.rich_text?.[0]?.text?.content) {
    return property.rich_text[0].text.content;
  }
  return "";
}

function extractRelation(property: any): string[] {
  if (property?.type === "relation" && Array.isArray(property.relation)) {
    return property.relation.map((rel: any) => rel.id);
  }
  return [];
}

async function getRecipeIngredients(recipeId: string): Promise<any[]> {
  if (!RECIPE_INGREDIENTS_DATABASE_ID) {
    return []; // Return empty array if junction table not configured
  }

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${RECIPE_INGREDIENTS_DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        filter: {
          property: 'Recipe',
          relation: {
            contains: recipeId,
          },
        },
      }),
    });

    if (!response.ok) {
      console.warn(`Failed to fetch recipe ingredients for ${recipeId}:`, response.status);
      return [];
    }

    const data = await response.json();
    return data.results.map((page: any) => {
      const properties = page.properties;
      return {
        id: page.id,
        ingredientId: properties.Ingredient?.relation?.[0]?.id || '',
        quantity: extractRichText(properties.Quantity),
        notes: extractRichText(properties.Notes) || undefined,
      };
    });
  } catch (error) {
    console.warn(`Error fetching recipe ingredients for ${recipeId}:`, error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');

    let filter: any = undefined;
    if (search) {
      filter = {
        property: "Recipe Name",
        title: {
          contains: search,
        },
      };
    }

    const response = await fetch(`https://api.notion.com/v1/databases/${RECIPES_DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        filter,
        sorts: [
          {
            timestamp: "created_time",
            direction: "descending"
          }
        ],
        page_size: pageSize,
        start_cursor: page > 1 ? undefined : undefined, // TODO: Implement proper pagination cursor
      }),
    });

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status}`);
    }

    const data = await response.json();

    const recipes = await Promise.all(data.results.map(async (page: any) => {
      const properties = page.properties;

      // Get legacy ingredient IDs from direct relation
      const legacyIngredientIds = extractRelation(properties["Ingredients"]);

      // Get structured ingredients from junction table
      const structuredIngredients = await getRecipeIngredients(page.id);

      // If we have structured ingredients, use those, otherwise fall back to legacy
      const ingredientIds = structuredIngredients.length > 0
        ? structuredIngredients.map(ing => ing.ingredientId).filter(Boolean)
        : legacyIngredientIds;

      return {
        id: page.id,
        recipeName: extractTitle(properties["Recipe Name"]),
        instructions: extractRichText(properties["Instructions"]),
        prepTime: extractRichText(properties["Prep Time"]),
        cookTime: extractRichText(properties["Cook Time"]),
        servings: extractRichText(properties["Servings"]),
        ingredientIds: ingredientIds,
        recipeIngredients: structuredIngredients, // Include structured data for new recipes
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time,
      };
    }));

    return NextResponse.json({
      recipes,
      hasMore: data.has_more,
      nextCursor: data.next_cursor,
    });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}