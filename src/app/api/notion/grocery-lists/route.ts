import { NextRequest, NextResponse } from 'next/server';
import { CreateGroceryListData, UpdateGroceryListData } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const GROCERY_LISTS_DATABASE_ID = process.env.GROCERY_LISTS_DATABASE_ID!;

// GET - Fetch all grocery lists
export async function GET() {
  try {
    console.log('🔍 Fetching grocery lists from database:', GROCERY_LISTS_DATABASE_ID);

    if (!GROCERY_LISTS_DATABASE_ID) {
      return NextResponse.json(
        { error: 'GROCERY_LISTS_DATABASE_ID environment variable is not set' },
        { status: 500 }
      );
    }

    const response = await fetch(`https://api.notion.com/v1/databases/${GROCERY_LISTS_DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        sorts: [
          {
            timestamp: 'created_time',
            direction: 'descending',
          },
        ],
      }),
    });

    const data = await response.json();
    console.log('📊 Notion API response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('❌ Notion API error:', data);
      return NextResponse.json(
        { error: `Notion API error: ${data.message || 'Unknown error'}` },
        { status: response.status }
      );
    }

    if (!data.results) {
      console.error('❌ No results property in response:', data);
      return NextResponse.json(
        { error: 'Invalid response from Notion API - no results property' },
        { status: 500 }
      );
    }

    const groceryLists = data.results.map((page: any) => ({
      id: page.id,
      name: page.properties['Name']?.title?.[0]?.text?.content || '',
      status: page.properties['Status']?.select?.name || 'Active',
      createdDate: page.created_time || '',
      notes: page.properties['Notes']?.rich_text?.[0]?.text?.content || '',
      items: page.properties['Items']?.relation || [],
    }));

    console.log(`✅ Successfully fetched ${groceryLists.length} grocery lists`);
    return NextResponse.json({ groceryLists });
  } catch (error) {
    console.error('💥 Error fetching grocery lists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grocery lists', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Create new grocery list
export async function POST(request: NextRequest) {
  try {
    const { name, notes, ingredientIds }: CreateGroceryListData = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Grocery list name is required' }, { status: 400 });
    }

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: GROCERY_LISTS_DATABASE_ID },
        properties: {
          'Name': {
            title: [
              {
                text: {
                  content: name,
                },
              },
            ],
          },
          'Status': {
            select: {
              name: 'Active',
            },
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
          ...(ingredientIds && ingredientIds.length > 0 && {
            'Items': {
              relation: ingredientIds.map((id: string) => ({ id })),
            },
          }),
        },
      }),
    });

    const data = await response.json();
    return NextResponse.json({ id: data.id });
  } catch (error) {
    console.error('Error creating grocery list:', error);
    return NextResponse.json(
      { error: 'Failed to create grocery list' },
      { status: 500 }
    );
  }
}