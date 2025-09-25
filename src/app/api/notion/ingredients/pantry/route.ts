import { NextRequest, NextResponse } from 'next/server';
import { PantryUpdateData, BulkPantryUpdateData } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOTION_API_KEY = process.env.NOTION_API_KEY!;

// PATCH - Update single ingredient pantry status
export async function PATCH(request: NextRequest) {
  try {
    const { ingredientId, inPantry, needToBuy }: PantryUpdateData = await request.json();

    if (!ingredientId) {
      return NextResponse.json({ error: 'Ingredient ID is required' }, { status: 400 });
    }

    const response = await fetch(`https://api.notion.com/v1/pages/${ingredientId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        properties: {
          'In Pantry': {
            checkbox: inPantry,
          },
          'Need to Buy': {
            checkbox: needToBuy,
          },
          'Last Updated': {
            date: {
              start: new Date().toISOString(),
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update ingredient: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('Error updating ingredient pantry status:', error);
    return NextResponse.json(
      { error: 'Failed to update ingredient pantry status' },
      { status: 500 }
    );
  }
}

// POST - Bulk update ingredient pantry status
export async function POST(request: NextRequest) {
  try {
    const { updates }: BulkPantryUpdateData = await request.json();

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'Updates array is required' }, { status: 400 });
    }

    const results = await Promise.allSettled(
      updates.map(async (update: PantryUpdateData) => {
        const response = await fetch(`https://api.notion.com/v1/pages/${update.ingredientId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${NOTION_API_KEY}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28',
          },
          body: JSON.stringify({
            properties: {
              'In Pantry': {
                checkbox: update.inPantry,
              },
              'Need to Buy': {
                checkbox: update.needToBuy,
              },
              'Last Updated': {
                date: {
                  start: new Date().toISOString(),
                },
              },
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update ingredient ${update.ingredientId}: ${response.statusText}`);
        }

        return await response.json();
      })
    );

    const successful = results.filter((result) => result.status === 'fulfilled').length;
    const failed = results.filter((result) => result.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      updated: successful,
      failed,
      results: results.map((result, index) => ({
        ingredientId: updates[index].ingredientId,
        success: result.status === 'fulfilled',
        error: result.status === 'rejected' ? result.reason?.message : null,
      })),
    });
  } catch (error) {
    console.error('Error bulk updating ingredient pantry status:', error);
    return NextResponse.json(
      { error: 'Failed to bulk update ingredient pantry status' },
      { status: 500 }
    );
  }
}