/**
 * Groq-based news translator
 * Uses Groq's OpenAI-compatible API for Chinese translation
 */

interface TranslationCache {
  [key: string]: {
    translatedTitle: string;
    translatedSummary?: string;
    timestamp: number;
  };
}

interface TranslationItem {
  id: string;
  title: string;
  summary?: string;
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TRANSLATE_API_URL = '/api/translate';

// In-memory cache (persisted to localStorage separately)
const translationCache: TranslationCache = {};

/**
 * Check if text contains Chinese characters
 */
export function isChinese(text: string): boolean {
  const chineseRegex = /[\u4e00-\u9fff]/;
  return chineseRegex.test(text);
}

/**
 * Build cache key from news ID
 */
export function getCacheKey(newsId: string): string {
  return `trans_${newsId}`;
}

/**
 * Translate via local API proxy (to avoid CORS issues)
 */
async function translateViaProxy(title: string, summary?: string, apiKey?: string): Promise<{ title: string; summary?: string }> {
  try {
    const res = await fetch(TRANSLATE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, summary, apiKey }),
    });

    if (!res.ok) {
      throw new Error(`Translation API error: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('[Translator] Proxy translation failed:', error);
    throw error;
  }
}

export async function translateNews(
  title: string,
  summary?: string,
  apiKey?: string
): Promise<{ title: string; summary?: string }> {
  // Build cache key from source text
  const cacheKey = `trans_${btoa(title)}${summary ? '_' + btoa(summary) : ''}`;

  // Check memory cache first
  const cached = translationCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return {
      title: cached.translatedTitle,
      summary: cached.translatedSummary,
    };
  }

  // Try local proxy first (for Vercel deployment)
  try {
    const result = await translateViaProxy(title, summary, apiKey);
    
    // Cache in memory
    translationCache[cacheKey] = {
      translatedTitle: result.title,
      translatedSummary: result.summary,
      timestamp: Date.now(),
    };

    return result;
  } catch (proxyError) {
    console.warn('[Translator] Proxy failed, trying direct:', proxyError);
  }

  // Fallback: direct API call (for local development)
  const key = apiKey || import.meta.env.VITE_GROQ_API_KEY || localStorage.getItem('groq-api-key');
  if (!key) {
    console.warn('[Translator] No Groq API key configured');
    return { title, summary };
  }

  try {
    // Build translation prompt
    const prompt = summary
      ? `Translate the following news title and summary to Chinese (Simplified). Keep it natural and concise.\n\nTitle: ${title}\n\nSummary: ${summary}`
      : `Translate the following news title to Chinese (Simplified). Keep it natural and concise.\n\nTitle: ${title}`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct', // Fast, good quality
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

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const translated = data.choices?.[0]?.message?.content?.trim();

    if (!translated) {
      throw new Error('No translation returned');
    }

    // Parse result (title + optional summary)
    let translatedTitle = translated;
    let translatedSummary: string | undefined;

    if (summary) {
      // Expect format: "Title: ...\n\nSummary: ..." or just the translated text
      const parts = translated.split('\n\n');
      if (parts.length >= 2) {
        translatedTitle = parts[0].replace(/^Title:\s*/i, '').trim();
        translatedSummary = parts[1].replace(/^Summary:\s*/i, '').trim();
      } else {
        // Fallback: translate separately
        translatedTitle = translated;
        // Optionally: could call API again for summary, but skip for now
      }
    }

    // Cache in memory
    translationCache[cacheKey] = {
      translatedTitle,
      translatedSummary,
      timestamp: Date.now(),
    };

    return {
      title: translatedTitle,
      summary: translatedSummary,
    };
  } catch (error) {
    console.error('[Translator] Translation failed:', error);
    return { title, summary }; // Fallback to original
  }
}

/**
 * Persist translation cache to localStorage (call on page hide/unload)
 */
export function persistTranslationCache(): void {
  try {
    const toPersist: Record<string, { translatedTitle: string; translatedSummary?: string; timestamp: number }> = {};
    for (const [key, val] of Object.entries(translationCache)) {
      // Only persist fresh entries (within TTL)
      if (Date.now() - val.timestamp < CACHE_TTL) {
        toPersist[key] = val;
      }
    }
    localStorage.setItem('worldmonitor-translation-cache', JSON.stringify(toPersist));
  } catch (e) {
    console.warn('[Translator] Failed to persist cache:', e);
  }
}

/**
 * Load translation cache from localStorage (call on startup)
 */
export function loadTranslationCache(): void {
  try {
    const stored = localStorage.getItem('worldmonitor-translation-cache');
    if (stored) {
      const parsed: Record<string, { translatedTitle: string; translatedSummary?: string; timestamp: number }> = JSON.parse(stored);
      for (const [key, val] of Object.entries(parsed)) {
        // Only load if still valid
        if (Date.now() - val.timestamp < CACHE_TTL) {
          translationCache[key] = val;
        }
      }
      console.log('[Translator] Cache loaded:', Object.keys(translationCache).length, 'entries');
    }
  } catch (e) {
    console.warn('[Translator] Failed to load cache:', e);
  }
}

/**
 * Get translated text from cache by news ID
 */
export function getCachedTranslation(newsId: string): { title: string; summary?: string } | null {
  const cacheKey = getCacheKey(newsId);
  const cached = translationCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return {
      title: cached.translatedTitle,
      summary: cached.translatedSummary,
    };
  }
  return null;
}

/**
 * Cache translation result
 */
export function cacheTranslation(newsId: string, title: string, summary?: string): void {
  const cacheKey = getCacheKey(newsId);
  translationCache[cacheKey] = {
    translatedTitle: title,
    translatedSummary: summary,
    timestamp: Date.now(),
  };
}

/**
 * Batch translate multiple news items
 * Uses proxy API to avoid CORS issues
 */
export async function translateBatch(
  items: TranslationItem[],
  apiKey?: string
): Promise<Array<{ id: string; title: string; summary?: string }>> {
  // Filter out items that are already Chinese or already cached
  const pendingItems = items.filter(item => {
    if (isChinese(item.title)) return false;
    const cached = getCachedTranslation(item.id);
    return !cached;
  });

  if (pendingItems.length === 0) {
    return items.map(item => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
    }));
  }

  // Translate each item through the proxy
  const results: Array<{ id: string; title: string; summary?: string }> = [];
  
  for (const item of pendingItems) {
    try {
      const result = await translateViaProxy(item.title, item.summary, apiKey);
      cacheTranslation(item.id, result.title, result.summary);
      results.push({ id: item.id, ...result });
    } catch (error) {
      console.warn(`[Translator] Failed to translate item ${item.id}:`, error);
      results.push({ id: item.id, title: item.title, summary: item.summary });
    }
  }

  // Merge with original items (preserve order)
  return items.map(item => {
    const translatedItem = results.find(r => r.id === item.id);
    if (translatedItem) {
      return translatedItem;
    }
    // If not translated, check cache
    const cached = getCachedTranslation(item.id);
    if (cached) {
      return { id: item.id, ...cached };
    }
    return { id: item.id, title: item.title, summary: item.summary };
  });
}
