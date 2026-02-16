/**
 * Translation state management
 * Manages translation toggle state and provides global access
 */

import { getCachedTranslation, cacheTranslation, translateBatch, isChinese } from './groq-translator';
import type { ClusteredEvent } from '@/types';

interface TranslationData {
  title: string;
}

const STORAGE_KEY = 'worldmonitor-translation-mode';

class TranslationStore {
  private isEnabled = false;
  private showOriginal = false;
  private translations = new Map<string, TranslationData>();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.isEnabled = data.isEnabled ?? false;
        this.showOriginal = data.showOriginal ?? false;
      }
    } catch (e) {
      console.warn('[TranslationStore] Failed to load from storage:', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        isEnabled: this.isEnabled,
        showOriginal: this.showOriginal,
      }));
    } catch (e) {
      console.warn('[TranslationStore] Failed to save to storage:', e);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  get enabled(): boolean {
    return this.isEnabled;
  }

  get showingOriginal(): boolean {
    return this.showOriginal;
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.saveToStorage();
    this.notifyListeners();
  }

  toggle(): void {
    this.isEnabled = !this.isEnabled;
    this.saveToStorage();
    this.notifyListeners();
  }

  toggleShowOriginal(): void {
    this.showOriginal = !this.showOriginal;
    this.saveToStorage();
    this.notifyListeners();
  }

  setShowOriginal(show: boolean): void {
    this.showOriginal = show;
    this.saveToStorage();
    this.notifyListeners();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getTranslation(newsId: string): TranslationData | null {
    return this.translations.get(newsId) || getCachedTranslation(newsId);
  }

  setTranslation(newsId: string, data: TranslationData): void {
    this.translations.set(newsId, data);
    cacheTranslation(newsId, data.title);
  }

  hasTranslation(newsId: string): boolean {
    if (this.translations.has(newsId)) return true;
    return !!getCachedTranslation(newsId);
  }

  isChineseText(text: string): boolean {
    return isChinese(text);
  }

  async translateClusters(clusters: ClusteredEvent[]): Promise<void> {
    if (!this.isEnabled) return;

    const pendingClusters = clusters.filter(c => {
      if (this.isChineseText(c.primaryTitle)) return false;
      return !this.hasTranslation(c.id);
    });

    if (pendingClusters.length === 0) return;

    const items = pendingClusters.map(c => ({
      id: c.id,
      title: c.primaryTitle,
    }));

    const results = await translateBatch(items);

    results.forEach(result => {
      this.setTranslation(result.id, {
        title: result.title,
      });
    });

    this.notifyListeners();
  }

  getDisplayTitle(cluster: ClusteredEvent): string {
    if (!this.isEnabled || this.showOriginal) {
      return cluster.primaryTitle;
    }

    const translation = this.getTranslation(cluster.id);
    if (translation) {
      return translation.title;
    }

    return cluster.primaryTitle;
  }

  getDisplayTitleRaw(cluster: ClusteredEvent): string {
    const translation = this.getTranslation(cluster.id);
    if (translation) {
      return translation.title;
    }
    return cluster.primaryTitle;
  }
}

export const translationStore = new TranslationStore();
