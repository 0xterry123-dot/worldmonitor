import { Panel } from './Panel';
import type { GeoHubActivity } from '@/services/geo-activity';
import { escapeHtml, sanitizeUrl } from '@/utils/sanitize';
import i18n from '@/i18n';

const COUNTRY_FLAGS: Record<string, string> = {
  'USA': '🇺🇸', 'Russia': '🇷🇺', 'China': '🇨🇳', 'UK': '🇬🇧', 'Belgium': '🇧🇪',
  'Israel': '🇮🇱', 'Iran': '🇮🇷', 'Ukraine': '🇺🇦', 'Taiwan': '🇹🇼', 'Japan': '🇯🇵',
  'South Korea': '🇰🇷', 'North Korea': '🇰🇵', 'India': '🇮🇳', 'Saudi Arabia': '🇸🇦',
  'Turkey': '🇹🇷', 'France': '🇫🇷', 'Germany': '🇩🇪', 'Egypt': '🇪🇬', 'Pakistan': '🇵🇰',
  'Palestine': '🇵🇸', 'Yemen': '🇾🇪', 'Syria': '🇸🇾', 'Lebanon': '🇱🇧',
  'Sudan': '🇸🇩', 'Ethiopia': '🇪🇹', 'Myanmar': '🇲🇲', 'Austria': '🇦🇹',
  'International': '🌐',
};

const TYPE_ICONS: Record<string, string> = {
  capital: '🏛️',
  conflict: '⚔️',
  strategic: '⚓',
  organization: '🏢',
};

const TYPE_LABELS: Record<string, string> = {
  capital: 'Capital',
  conflict: 'Conflict Zone',
  strategic: 'Strategic',
  organization: 'Organization',
};

export class GeoHubsPanel extends Panel {
  private activities: GeoHubActivity[] = [];
  private onHubClick?: (hub: GeoHubActivity) => void;

  constructor() {
    super({
      id: 'geo-hubs',
      title: i18n.t('panels.geoHubs'),
      showCount: true,
      infoTooltip: `
        <strong>${i18n.t('geoHubs.title')}</strong><br>
        ${i18n.t('geoHubs.description')}<br><br>
        <em>${i18n.t('geoHubs.hubTypes')}</em><br>
        • 🏛️ ${i18n.t('geoHubs.capitals')}<br>
        • ⚔️ ${i18n.t('geoHubs.conflictZones')}<br>
        • ⚓ ${i18n.t('geoHubs.strategic')}<br>
        • 🏢 ${i18n.t('geoHubs.organizations')}<br><br>
        <em>${i18n.t('geoHubs.activityLevels')}</em><br>
        • <span style="color: #ff4444">${i18n.t('geoHubs.high')}</span> — ${i18n.t('geoHubs.highDesc')}<br>
        • <span style="color: #ff8844">${i18n.t('geoHubs.elevated')}</span> — ${i18n.t('geoHubs.elevatedDesc')}<br>
        • <span style="color: #888">${i18n.t('geoHubs.low')}</span> — ${i18n.t('geoHubs.lowDesc')}<br><br>
        ${i18n.t('geoHubs.clickToZoom')}
      `,
    });
  }

  public setOnHubClick(handler: (hub: GeoHubActivity) => void): void {
    this.onHubClick = handler;
  }

  public setActivities(activities: GeoHubActivity[]): void {
    this.activities = activities.slice(0, 10);
    this.setCount(this.activities.length);
    this.render();
  }

  private getFlag(country: string): string {
    return COUNTRY_FLAGS[country] || '🌐';
  }

  private getTypeIcon(type: string): string {
    return TYPE_ICONS[type] || '📍';
  }

  private getTypeLabel(type: string): string {
    return TYPE_LABELS[type] || type;
  }

  private render(): void {
    if (this.activities.length === 0) {
      this.showError('No active geopolitical hubs');
      return;
    }

    const html = this.activities.map((hub, index) => {
      const trendIcon = hub.trend === 'rising' ? '↑' : hub.trend === 'falling' ? '↓' : '';
      const breakingTag = hub.hasBreaking ? '<span class="hub-breaking geo">ALERT</span>' : '';
      const topStory = hub.topStories[0];

      return `
        <div class="geo-hub-item ${hub.activityLevel}" data-hub-id="${escapeHtml(hub.hubId)}" data-index="${index}">
          <div class="hub-rank">${index + 1}</div>
          <span class="geo-hub-indicator ${hub.activityLevel}"></span>
          <div class="hub-info">
            <div class="hub-header">
              <span class="hub-name">${escapeHtml(hub.name)}</span>
              <span class="hub-flag">${this.getFlag(hub.country)}</span>
              ${breakingTag}
            </div>
            <div class="hub-meta">
              <span class="hub-news-count">${hub.newsCount} ${hub.newsCount === 1 ? 'story' : 'stories'}</span>
              ${trendIcon ? `<span class="hub-trend ${hub.trend}">${trendIcon}</span>` : ''}
              <span class="geo-hub-type">${this.getTypeIcon(hub.type)} ${this.getTypeLabel(hub.type)}</span>
            </div>
          </div>
          <div class="hub-score geo">${Math.round(hub.score)}</div>
        </div>
        ${topStory ? `
          <a class="hub-top-story geo" href="${sanitizeUrl(topStory.link)}" target="_blank" rel="noopener" data-hub-id="${escapeHtml(hub.hubId)}">
            ${escapeHtml(topStory.title.length > 80 ? topStory.title.slice(0, 77) + '...' : topStory.title)}
          </a>
        ` : ''}
      `;
    }).join('');

    this.setContent(html);
    this.bindEvents();
  }

  private bindEvents(): void {
    const items = this.content.querySelectorAll<HTMLDivElement>('.geo-hub-item');
    items.forEach((item) => {
      item.addEventListener('click', () => {
        const hubId = item.dataset.hubId;
        const hub = this.activities.find(a => a.hubId === hubId);
        if (hub && this.onHubClick) {
          this.onHubClick(hub);
        }
      });
    });
  }
}
