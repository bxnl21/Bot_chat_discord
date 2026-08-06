# CI/CD và triển khai

## Pipeline

- Pull request vào `main`: cài dependency, chạy test, build TypeScript và build Docker image.
- Push vào `main`: chạy CI và xuất image `ghcr.io/bxnl21/bot_chat_discord:latest` cùng tag theo commit SHA.
- Tag dạng `v1.2.3`: xuất thêm các image tag `1.2.3` và `1.2`.
- Có thể chạy thủ công workflow **Publish container** từ GitHub Actions.

## Secrets khi chạy container

Không đưa `.env` vào source hoặc Docker image. Máy chủ chạy bot cần các biến:

```text
DISCORD_TOKEN
GEMINI_API_KEY
MONGO_URI
AI_CHANNEL_ID       # tùy chọn
GEMINI_MODEL         # tùy chọn
```

Ví dụ chạy image đã publish:

```bash
docker run -d \
  --name my-discord-bot \
  --restart unless-stopped \
  --env-file .env \
  ghcr.io/bxnl21/bot_chat_discord:latest
```

Nếu package GHCR để private, đăng nhập trước bằng một GitHub token có quyền `read:packages`:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u USERNAME --password-stdin
```
