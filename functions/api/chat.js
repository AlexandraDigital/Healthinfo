/**
 * Cloudflare Pages Function: /api/chat
 * Calls Groq API securely via backend
 * Place in: functions/api/chat.js
 */

export async function onRequest(context) {
  const { request, env } = context;

  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await request.json();
    const { model, messages, max_tokens } = body;

    // Validate inputs
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get Groq API key from environment
    const groqApiKey = env.GROQ_API_KEY;
    if (!groqApiKey) {
      console.error('❌ GROQ_API_KEY not configured in environment');
      return new Response(
        JSON.stringify({ error: 'API not configured on server' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Call Groq API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        messages: messages,
        max_tokens: max_tokens || 2048,  // Increased for comprehensive medical explanations
        temperature: 0.7,
      }),
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json().catch(() => ({}));
      console.error('Groq API error:', errorData);
      return new Response(
        JSON.stringify({
          error: `Groq API error: ${errorData.error?.message || groqResponse.statusText}`,
        }),
        { status: groqResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await groqResponse.json();
    const response = data.choices?.[0]?.message?.content || 'No response';

    return new Response(
      JSON.stringify({ response }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Chat function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
