import os

os.environ["WORKER_TOKEN"] = "test-secret"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


def test_health_is_public() -> None:
    assert TestClient(app).get("/health").json() == {"status": "ok"}


def test_analyze_requires_authentication() -> None:
    response = TestClient(app).post(
        "/v1/documents/analyze", files={"file": ("x.pdf", b"pdf", "application/pdf")}
    )
    assert response.status_code == 401


def test_response_contract_uses_camel_case() -> None:
    from app.domain.entities import DocumentAnalysis
    from app.main import use_case

    class FakeUseCase:
        async def execute(self, document: object) -> DocumentAnalysis:
            return DocumentAnalysis("x.pdf", "application/pdf", "text", 1)

    app.dependency_overrides[use_case] = lambda: FakeUseCase()
    try:
        response = TestClient(app).post(
            "/v1/documents/analyze",
            headers={"authorization": "Bearer test-secret"},
            files={"file": ("x.pdf", b"pdf", "application/pdf")},
        )
        assert response.status_code == 200
        assert response.json()["fileName"] == "x.pdf"
        assert response.json()["pageCount"] == 1
    finally:
        app.dependency_overrides.clear()
