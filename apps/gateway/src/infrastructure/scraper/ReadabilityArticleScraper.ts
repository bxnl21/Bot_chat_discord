import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { ArticleScraper } from '../../application/ports/Ports';

export class ReadabilityArticleScraper implements ArticleScraper {
  async scrape(url: string): Promise<string> {
    const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 DiscordBot/2.0' }, signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`Không thể truy cập URL (HTTP ${response.status})`);
    const dom = new JSDOM(await response.text(), { url });
    const article = new Readability(dom.window.document).parse();
    if (!article?.textContent) throw new Error('Không trích xuất được nội dung bài viết');
    return article.textContent.trim();
  }
}
