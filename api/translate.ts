// api/translate.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Set CORS headers
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  const { title, summary, apiKey } = request.body;

  if (!title) {
    return response.status(400).json({ error: 'Missing title parameter' });
  }

  // Get API key from env - check both VITE_ and plain versions
  const key = apiKey || process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;
  
  console.log('[Translate] API Key present:', !!key);
  
  if (!key) {
    console.error('[Translate] No API key found');
    return response.status(400).json({ error: 'No API key configured' });
  }

  try {
    // Build translation prompt
    const prompt = summary
      ? `Translate the following news title and summary to Chinese (Simplified). Keep it natural and concise.\n\nTitle: ${title}\n\nSummary: ${summary}`
      : `Translate the following news title to Chinese (Simplified). Keep it natural and concise.\n\nTitle: ${title}`;

    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Translate to Chinese (Simplified) only, no explanations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 512,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('Groq API error:', error);
      return response.status(502).json({ error: 'Translation API error' });
    }

    const data = await res.json();
    const translated = data.choices?.[0]?.message?.content?.trim();

    if (!translated) {
      return response.status(500).json({ error: 'No translation returned' });
    }

    // Parse result
    let translatedTitle = translated;
    let translatedSummary: string | undefined;

    if (summary) {
      const parts = translated.split('\n\n');
      if (parts.length >= 2) {
        translatedTitle = parts[0].replace(/^Title:\s*/i, '').trim();
        translatedSummary = parts[1].replace(/^Summary:\s*/i, '').trim();
      }
    }

    return response.status(200).json({
      title: translatedTitle,
      summary: translatedSummary,
    });
  } catch (error) {
    console.error('Translation error:', error);
    return response.status(500).json({ error: 'Translation failed' });
  }
}
