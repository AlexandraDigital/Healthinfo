/**
 * Cloudflare Pages Function
 * Fetches medical images via Google Custom Search API
 * Requires env variables:
 *   GOOGLE_API_KEY     — Google Cloud API key
 *   GOOGLE_SEARCH_CX   — Custom Search Engine ID (Programmable Search Engine)
 */

export async function onRequest(context) {
  const { request } = context;

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Missing query parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKey = context.env.GOOGLE_API_KEY;
    const cx = context.env.GOOGLE_SEARCH_CX;

    if (!apiKey || !cx) {
      return new Response(JSON.stringify({
        error: 'GOOGLE_API_KEY and GOOGLE_SEARCH_CX must be set in Cloudflare Pages environment variables'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Bias search toward educational/medical diagrams
    const searchQuery = `${query.trim()} medical diagram anatomy`;

    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', cx);
    url.searchParams.set('q', searchQuery);
    url.searchParams.set('searchType', 'image');
    url.searchParams.set('num', '4');
    url.searchParams.set('imgType', 'photo');
    url.searchParams.set('safe', 'active');

    const googleResponse = await fetch(url.toString());

    if (!googleResponse.ok) {
      const error = await googleResponse.json().catch(() => ({}));
      console.error('Google API error:', googleResponse.status, JSON.stringify(error));
      return new Response(JSON.stringify({
        error: `Google API error ${googleResponse.status}: ${error.error?.message || 'Unknown'}`
      }), {
        status: googleResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await googleResponse.json();
    const items = data.items || [];

    if (items.length === 0) {
      return new Response(JSON.stringify({ images: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const images = items.map(item => {
      // FIXED: Extract domain from contextLink for better source attribution
      // displayLink is just the domain name, but we want the full source URL for proper credit
      let source = item.displayLink;
      if (item.image?.contextLink) {
        try {
          const contextUrl = new URL(item.image.contextLink);
          source = contextUrl.hostname || item.displayLink;
        } catch (e) {
          // Fall back to displayLink if URL parsing fails
          source = item.displayLink;
        }
      }
      
      return {
        type: 'image',
        src: item.link,
        thumbnail: item.image?.thumbnailLink || item.link,
        title: item.title,
        source: source,
        contextLink: item.image?.contextLink || item.link,
        width: item.image?.width,
        height: item.image?.height
      };
    });

    return new Response(JSON.stringify({ images }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
