import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOTION_API_KEY = process.env.NOTION_API_KEY!;

// POST - Add items to grocery list
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { ingredientIds }: { ingredientIds: string[] } = await request.json();

    if (!ingredientIds || !Array.isArray(ingredientIds) || ingredientIds.length === 0) {
      return NextResponse.json({ error: 'Ingredient IDs are required' }, { status: 400 });
    }

    // First get the current grocery list to merge with existing items
    const currentResponse = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
      },
    });

    const currentData = await currentResponse.json();
    const currentItems = currentData.properties?.['Items']?.relation || [];
    const currentItemIds = currentItems.map((item: any) => item.id);

    // Merge new ingredient IDs with existing ones, avoiding duplicates
    const allItemIds = [...new Set([...currentItemIds, ...ingredientIds])];

    const response = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        properties: {
          'Items': {
            relation: allItemIds.map((itemId: string) => ({ id: itemId })),
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add items to grocery list: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json({ success: true, id: data.id, addedCount: ingredientIds.length });
  } catch (error) {
    console.error('Error adding items to grocery list:', error);
    return NextResponse.json(
      { error: 'Failed to add items to grocery list' },
      { status: 500 }
    );
  }
}

// DELETE - Remove items from grocery list
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { ingredientIds }: { ingredientIds: string[] } = await request.json();

    if (!ingredientIds || !Array.isArray(ingredientIds) || ingredientIds.length === 0) {
      return NextResponse.json({ error: 'Ingredient IDs are required' }, { status: 400 });
    }

    // Get current grocery list items
    const currentResponse = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
      },
    });

    const currentData = await currentResponse.json();
    const currentItems = currentData.properties?.['Items']?.relation || [];
    const currentItemIds = currentItems.map((item: any) => item.id);

    // Remove specified ingredient IDs
    const updatedItemIds = currentItemIds.filter((itemId: string) => !ingredientIds.includes(itemId));

    const response = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        properties: {
          'Items': {
            relation: updatedItemIds.map((itemId: string) => ({ id: itemId })),
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to remove items from grocery list: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json({ success: true, id: data.id, removedCount: ingredientIds.length });
  } catch (error) {
    console.error('Error removing items from grocery list:', error);
    return NextResponse.json(
      { error: 'Failed to remove items from grocery list' },
      { status: 500 }
    );
  }
}