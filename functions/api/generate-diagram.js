/**
 * Cloudflare Pages Function: /api/generate-diagram
 * Calls Google Custom Search API to find medical diagrams
 * Place in: functions/api/generate-diagram.js
 */

export async function onRequest(context) {
  const { request, env } = context;

  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid query parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get API credentials from environment
    const googleApiKey = env.GOOGLE_API_KEY;
    const googleSearchCx = env.GOOGLE_SEARCH_CX;

    if (!googleApiKey || !googleSearchCx) {
      console.error('❌ Google Search API credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Image search API not configured on server' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Call Google Custom Search API
    const searchQuery = encodeURIComponent(`${query} diagram anatomy medical illustration`);
    const googleUrl = `https://www.googleapis.com/customsearch/v1?q=${searchQuery}&cx=${googleSearchCx}&searchType=image&key=${googleApiKey}&num=6`;

    console.log('🔍 Calling Google Custom Search API for:', query);

    const googleResponse = await fetch(googleUrl);

    if (!googleResponse.ok) {
      const errorData = await googleResponse.json().catch(() => ({}));
      console.error('Google API error:', errorData);
      return new Response(
        JSON.stringify({
          error: `Google Search error: ${errorData.error?.message || googleResponse.statusText}`,
        }),
        { status: googleResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await googleResponse.json();

    // Parse results and extract image data
    const images = [];
    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((item) => {
        if (item.link && item.title) {
          images.push({
            type: 'image',
            src: item.link,
            title: item.title,
            source: item.displayLink || 'Google Images',
          });
        }
      });
    }

    console.log('✅ Found', images.length, 'images');

    return new Response(
      JSON.stringify({ images }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Generate diagram error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
