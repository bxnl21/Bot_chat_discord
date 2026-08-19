# Bot Chat Discord

Kiến trúc monorepo gồm:

- `apps/gateway`: TypeScript OOP — Discord Gateway, nghiệp vụ, persistence và AI orchestration.
- `apps/worker`: Python FastAPI — PDF text extraction, OCR ảnh/PDF scan.
- `contracts`: OpenAPI contract giữa hai service.

Dependency direction trong mỗi service: `presentation → application → domain`; infrastructure triển khai các application ports.

Xem [DEPLOYMENT.md](DEPLOYMENT.md) để chạy và triển khai.
