// api/translate.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const MYMEMORY_API = 'https://api.mymemory.translated.net/get';

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

  const { title, summary } = request.body;

  if (!title) {
    return response.status(400).json({ error: 'Missing title parameter' });
  }

  try {
    // Translate title
    const titleUrl = `${MYMEMORY_API}?q=${encodeURIComponent(title)}&langpair=en|zh-CN`;
    const titleRes = await fetch(titleUrl);
    const titleData = await titleRes.json();

    if (titleData.responseStatus !== 200) {
      throw new Error(titleData.responseDetails || 'Translation failed');
    }

    const translatedTitle = titleData.responseData.translatedText;

    // Translate summary if present
    let translatedSummary: string | undefined;
    if (summary) {
      const summaryUrl = `${MYMEMORY_API}?q=${encodeURIComponent(summary)}&langpair=en|zh-CN`;
      const summaryRes = await fetch(summaryUrl);
      const summaryData = await summaryRes.json();
      
      if (summaryData.responseStatus === 200) {
        translatedSummary = summaryData.responseData.translatedText;
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
