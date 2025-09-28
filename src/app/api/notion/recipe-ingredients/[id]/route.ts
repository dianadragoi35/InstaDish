import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const RECIPE_INGREDIENTS_DATABASE_ID = process.env.RECIPE_INGREDIENTS_DATABASE_ID;

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { quantity, notes } = await request.json();
    const { id } = params;

    if (!quantity && !notes) {
      return NextResponse.json(
        { error: 'At least quantity or notes must be provided' },
        { status: 400 }
      );
    }

    const updateProperties: any = {};

    if (quantity) {
      updateProperties.Quantity = {
        rich_text: [
          {
            text: {
              content: quantity,
            },
          },
        ],
      };
    }

    if (notes !== undefined) {
      updateProperties.Notes = {
        rich_text: notes
          ? [
              {
                text: {
                  content: notes,
                },
              },
            ]
          : [],
      };
    }

    const response = await notion.pages.update({
      page_id: id,
      properties: updateProperties,
    });

    // Fetch the updated page to return complete data
    const updatedPage = await notion.pages.retrieve({ page_id: id });
    const properties = (updatedPage as any).properties;

    return NextResponse.json({
      id: updatedPage.id,
      recipeId: properties.Recipe?.relation?.[0]?.id || '',
      ingredientId: properties.Ingredient?.relation?.[0]?.id || '',
      quantity: properties.Quantity?.rich_text?.[0]?.text?.content || '',
      notes: properties.Notes?.rich_text?.[0]?.text?.content || undefined,
    });
  } catch (error) {
    console.error('Error updating recipe ingredient:', error);
    return NextResponse.json(
      { error: 'Failed to update recipe ingredient' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await notion.pages.update({
      page_id: id,
      archived: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting recipe ingredient:', error);
    return NextResponse.json(
      { error: 'Failed to delete recipe ingredient' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const page = await notion.pages.retrieve({ page_id: id });
    const properties = (page as any).properties;

    return NextResponse.json({
      id: page.id,
      recipeId: properties.Recipe?.relation?.[0]?.id || '',
      ingredientId: properties.Ingredient?.relation?.[0]?.id || '',
      quantity: properties.Quantity?.rich_text?.[0]?.text?.content || '',
      notes: properties.Notes?.rich_text?.[0]?.text?.content || undefined,
    });
  } catch (error) {
    console.error('Error fetching recipe ingredient:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipe ingredient' },
      { status: 500 }
    );
  }
}