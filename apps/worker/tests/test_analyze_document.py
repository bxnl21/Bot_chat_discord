import pytest

from app.application.analyze_document import AnalyzeDocument
from app.domain.entities import Document, DocumentAnalysis


class FakeExtractor:
    async def extract(self, document: Document) -> DocumentAnalysis:
        return DocumentAnalysis(document.file_name, document.mime_type, "text", 1)


@pytest.mark.asyncio
async def test_analyze_document_delegates_to_extractor() -> None:
    result = await AnalyzeDocument(FakeExtractor()).execute(Document("a.pdf", "application/pdf", b"pdf"))
    assert result.text == "text"


@pytest.mark.asyncio
async def test_rejects_unsupported_mime_type() -> None:
    with pytest.raises(ValueError, match="Unsupported"):
        await AnalyzeDocument(FakeExtractor()).execute(Document("a.zip", "application/zip", b"zip"))
