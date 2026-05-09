/**
 * Cloudflare Pages Function
 * Proxies Groq API calls server-side
 * Uses env.GROQ_API_KEY - no need to expose key to browser
 */

export async function onRequest(context) {
  const { request } = context;
  
  // Only accept POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Get the request body
    const { model, max_tokens, messages } = await request.json();
    
    // Validate required fields
    if (!model || !messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Missing required fields: model, messages' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get API key from environment variable
    const groqKey = context.env.GROQ_API_KEY;
    
    if (!groqKey) {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Call Groq API
    const groqResponse = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: model,
          max_tokens: max_tokens || 1024,
          messages: messages
        })
      }
    );

    if (!groqResponse.ok) {
      const error = await groqResponse.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: error.error?.message || 'Groq API error' }), {
        status: groqResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const groqData = await groqResponse.json();
    const responseText = groqData.choices?.[0]?.message?.content || 'No response received.';

    return new Response(JSON.stringify({ response: responseText }), {
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
