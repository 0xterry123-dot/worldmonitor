// api/rss-proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  const { url } = request.query;

  if (!url || typeof url !== 'string') {
    return response.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'WorldMonitor/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    const text = await res.text();

    response.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    response.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    return response.status(200).send(text);
  } catch (error) {
    console.error('RSS Proxy Error:', error);
    return response.status(502).json({ error: 'Failed to fetch RSS feed' });
  }
}
