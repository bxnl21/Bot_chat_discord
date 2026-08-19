import secrets
from functools import lru_cache

from fastapi import Depends, FastAPI, Header, HTTPException, UploadFile

from app.application.analyze_document import AnalyzeDocument
from app.config import Settings
from app.domain.entities import Document
from app.infrastructure.document_extractor import PyMuPdfDocumentExtractor
from app.presentation.schemas import DocumentAnalysisResponse

app = FastAPI(title="Discord Document Worker", version="2.0.0")


@lru_cache
def settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


def authorize(authorization: str = Header(default=""), config: Settings = Depends(settings)) -> None:
    expected = f"Bearer {config.worker_token}"
    if not secrets.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


def use_case(config: Settings = Depends(settings)) -> AnalyzeDocument:
    extractor = PyMuPdfDocumentExtractor(config.max_pdf_pages, config.ocr_language)
    return AnalyzeDocument(extractor, config.max_document_bytes)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready", dependencies=[Depends(authorize)])
async def ready() -> dict[str, str]:
    return {"status": "ready"}


@app.post("/v1/documents/analyze", response_model=DocumentAnalysisResponse, dependencies=[Depends(authorize)])
async def analyze(file: UploadFile, handler: AnalyzeDocument = Depends(use_case)) -> DocumentAnalysisResponse:
    config = settings()
    content = await file.read(config.max_document_bytes + 1)
    document = Document(file.filename or "file", file.content_type or "application/octet-stream", content)
    try:
        result = await handler.execute(document)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return DocumentAnalysisResponse(**result.__dict__)
