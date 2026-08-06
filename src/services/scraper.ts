import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export async function scrapeArticleText(url: string): Promise<string> {
  try {
    // 1. Tải nội dung HTML của trang web
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) throw new Error(`Không thể truy cập link (Status: ${response.status})`);
    const html = await response.text();

    // 2. Phân tích HTML bằng JSDOM và Readability
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      throw new Error("Không thể trích xuất nội dung chính từ bài viết này.");
    }

    // Trả về text sạch đã loại bỏ menu, quảng cáo
    return article.textContent.trim();
  } catch (error: any) {
    console.error("Lỗi Scraper:", error.message);
    throw error;
  }
}