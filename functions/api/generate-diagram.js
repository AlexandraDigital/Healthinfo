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

    const geminiKey = context.env.GEMINI_API_KEY;

    if (!geminiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured in Cloudflare Pages environment variables' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cleanQuery = query.replace(/[?!.]/g, '').trim();

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate a detailed, labeled SVG diagram of ${cleanQuery}.

CRITICAL: Return ONLY raw SVG code. No markdown. No backticks. No explanation. No \`\`\`svg fences.
Start your response with <svg and end with </svg>. Nothing before or after.

Requirements:
- Valid SVG with viewBox="0 0 400 500" width="100%" height="auto"
- Clear labels for all parts
- Distinct colors for different structures
- Simple shapes: circles, rectangles, paths, text elements
- Title at top: "${cleanQuery}"
- Educational and accurate`
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const error = await geminiResponse.json().catch(() => ({}));
      console.error('Gemini API error:', geminiResponse.status, JSON.stringify(error));
      return new Response(JSON.stringify({
        error: `Gemini API error ${geminiResponse.status}: ${error.error?.message || 'Unknown'}`
      }), {
        status: geminiResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const geminiData = await geminiResponse.json();
    let svgCode = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!svgCode) {
      console.error('Empty Gemini response:', JSON.stringify(geminiData));
      return new Response(JSON.stringify({ error: 'No content generated' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Robust extraction — handles all fence variants Gemini might return
    const fenceMatch = svgCode.match(/```(?:svg|xml)?\s*([\s\S]*?)```/i);
    if (fenceMatch) {
      svgCode = fenceMatch[1].trim();
    }

    // Strip anything outside the SVG tags
    const svgStart = svgCode.indexOf('<svg');
    const svgEnd = svgCode.lastIndexOf('</svg>');
    if (svgStart === -1 || svgEnd === -1) {
      console.error('No valid SVG tags found. Preview:', svgCode.substring(0, 300));
      return new Response(JSON.stringify({ error: 'Gemini did not return valid SVG' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    svgCode = svgCode.substring(svgStart, svgEnd + 6);

    return new Response(JSON.stringify({ svg: svgCode }), {
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
