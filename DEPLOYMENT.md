# Triển khai Gateway và Worker

## Chạy local bằng Docker Compose

1. Sao chép `.env.example` thành `.env` và điền secret.
2. Tạo `WORKER_TOKEN` dài, ngẫu nhiên và dùng chung cho hai service.
3. Chạy:

```bash
docker compose up --build -d
docker compose logs -f gateway worker
```

Worker chỉ tồn tại trong mạng nội bộ Compose; không publish port ra Internet.

## Container images

- `ghcr.io/bxnl21/bot_chat_discord-gateway:latest`
- `ghcr.io/bxnl21/bot_chat_discord-worker:latest`

Mỗi push vào `main` chạy test/build cho cả hai service rồi publish hai image trên.

## Biến môi trường

| Biến | Service | Bắt buộc |
|---|---|---|
| `DISCORD_TOKEN` | Gateway | Có |
| `GEMINI_API_KEY` | Gateway | Có |
| `MONGO_URI` | Gateway | Có |
| `WORKER_URL` | Gateway | Có |
| `WORKER_TOKEN` | Cả hai | Có |
| `AI_CHANNEL_ID` | Gateway | Có; bot chỉ hoạt động trong đúng channel này |
| `REQUIRE_MENTION` | Gateway | Không; mặc định `false` |
| `OCR_LANGUAGE` | Worker | Không |
| `MAX_PDF_PAGES` | Worker | Không |
