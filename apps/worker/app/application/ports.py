from typing import Protocol

from app.domain.entities import Document, DocumentAnalysis


class DocumentExtractor(Protocol):
    async def extract(self, document: Document) -> DocumentAnalysis: ...
