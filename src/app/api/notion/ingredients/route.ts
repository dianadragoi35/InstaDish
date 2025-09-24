import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime for this API route
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const INGREDIENTS_DATABASE_ID = process.env.INGREDIENTS_DATABASE_ID!;

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    console.log('🔧 Processing ingredient:', name);

    if (!name) {
      return NextResponse.json({ error: 'Ingredient name is required' }, { status: 400 });
    }

    // Search for existing ingredient using direct API call
    const searchResponse = await fetch(`https://api.notion.com/v1/databases/${INGREDIENTS_DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        filter: {
          property: "Ingredient Name",
          title: {
            equals: name.trim(),
          },
        },
      }),
    });

    const searchData = await searchResponse.json();

    if (searchData.results && searchData.results.length > 0) {
      return NextResponse.json({ id: searchData.results[0].id });
    }

    // Create new ingredient using direct API call
    const createResponse = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: INGREDIENTS_DATABASE_ID },
        properties: {
          "Ingredient Name": {
            title: [
              {
                text: {
                  content: name.trim(),
                },
              },
            ],
          },
        },
      }),
    });

    const createData = await createResponse.json();

    return NextResponse.json({ id: createData.id });
  } catch (error) {
    console.error('Error in ingredient API:', error);
    return NextResponse.json(
      { error: 'Failed to find or create ingredient' },
      { status: 500 }
    );
  }
}