/**
 * Cloudflare Pages Function
 * Proxies Gemini API calls server-side
 * Uses env.GEMINI_API_KEY - no need to expose key to browser
 */

export async function onRequest(context) {
  const { request } = context;
  
  // Only accept POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Get the request body
    const { query } = await request.json();
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Missing query parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get API key from environment variable
    const geminiKey = context.env.GEMINI_API_KEY;
    
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cleanQuery = query.replace(/[?!.]/g, '').trim();
    
    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate a detailed, labeled SVG diagram of ${cleanQuery}.

Requirements:
- Create valid SVG code (starts with <svg and ends with </svg>)
- Include clear labels for all anatomical parts or tech components
- Use simple shapes (circles, rectangles, paths) and text elements
- Add distinct colors to different structures for clarity
- Make it educational and accurate
- Include a title at the top showing "${cleanQuery}"
- Make the SVG responsive: width="100%" height="auto" viewBox="0 0 400 500"
- Response must be ONLY the SVG code, no markdown or explanation

Return ONLY the complete SVG code.`
            }]
          }]
        })
      }
    );

    if (!geminiResponse.ok) {
      const error = await geminiResponse.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: 'Gemini API error: ' + (error.error?.message || 'Unknown error') }), {
        status: geminiResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const geminiData = await geminiResponse.json();
    let svgCode = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!svgCode) {
      return new Response(JSON.stringify({ error: 'No SVG content generated' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Clean up SVG (remove markdown code blocks if present)
    if (svgCode.includes('```')) {
      svgCode = svgCode.split('```')[1].trim();
      if (svgCode.startsWith('svg')) {
        svgCode = svgCode.substring(3).trim();
      }
    }

    // Validate SVG structure
    if (!svgCode.includes('<svg') || !svgCode.includes('</svg>')) {
      return new Response(JSON.stringify({ error: 'Invalid SVG generated' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ svg: svgCode }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
