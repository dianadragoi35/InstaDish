import { NextRequest, NextResponse } from 'next/server';
import { UpdateGroceryListData } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOTION_API_KEY = process.env.NOTION_API_KEY!;

// GET - Fetch specific grocery list with items
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Fetch the grocery list page
    const response = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
      },
    });

    const data = await response.json();

    if (!data.properties) {
      return NextResponse.json({ error: 'Grocery list not found' }, { status: 404 });
    }

    const groceryList = {
      id: data.id,
      name: data.properties['Name']?.title?.[0]?.text?.content || '',
      status: data.properties['Status']?.select?.name || 'Active',
      createdDate: data.properties['Created Date']?.date?.start || '',
      notes: data.properties['Notes']?.rich_text?.[0]?.text?.content || '',
      items: data.properties['Items']?.relation || [],
    };

    return NextResponse.json({ groceryList });
  } catch (error) {
    console.error('Error fetching grocery list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grocery list' },
      { status: 500 }
    );
  }
}

// PATCH - Update grocery list
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const updateData: UpdateGroceryListData = await request.json();

    const properties: any = {};

    if (updateData.name) {
      properties['Name'] = {
        title: [
          {
            text: {
              content: updateData.name,
            },
          },
        ],
      };
    }

    if (updateData.status) {
      properties['Status'] = {
        select: {
          name: updateData.status,
        },
      };
    }

    if (updateData.notes !== undefined) {
      properties['Notes'] = updateData.notes
        ? {
            rich_text: [
              {
                text: {
                  content: updateData.notes,
                },
              },
            ],
          }
        : {
            rich_text: [],
          };
    }

    const response = await fetch(`https://api.notion.com/v1/pages/${id}`, {
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

    const data = await response.json();
    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('Error updating grocery list:', error);
    return NextResponse.json(
      { error: 'Failed to update grocery list' },
      { status: 500 }
    );
  }
}

// DELETE - Delete grocery list
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Notion doesn't have a delete endpoint, so we archive the page
    const response = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        archived: true,
      }),
    });

    const data = await response.json();
    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('Error deleting grocery list:', error);
    return NextResponse.json(
      { error: 'Failed to delete grocery list' },
      { status: 500 }
    );
  }
}