from app.application.ports import DocumentExtractor
from app.domain.entities import Document, DocumentAnalysis


class AnalyzeDocument:
    SUPPORTED = {
        "application/pdf", "image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"
    }

    def __init__(self, extractor: DocumentExtractor, max_bytes: int = 18 * 1024 * 1024) -> None:
        self._extractor = extractor
        self._max_bytes = max_bytes

    async def execute(self, document: Document) -> DocumentAnalysis:
        if document.mime_type not in self.SUPPORTED:
            raise ValueError(f"Unsupported MIME type: {document.mime_type}")
        if len(document.content) > self._max_bytes:
            raise ValueError("Document exceeds the 18 MB limit")
        return await self._extractor.extract(document)
