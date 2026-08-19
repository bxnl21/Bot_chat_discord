import io
import asyncio

import fitz  # type: ignore[import-untyped]
import pytesseract  # type: ignore[import-untyped]
from PIL import Image
from pillow_heif import register_heif_opener  # type: ignore[import-untyped]

from app.domain.entities import Document, DocumentAnalysis


class PyMuPdfDocumentExtractor:
    def __init__(self, max_pages: int = 30, ocr_language: str = "vie+eng") -> None:
        register_heif_opener()
        self._max_pages = max_pages
        self._ocr_language = ocr_language

    async def extract(self, document: Document) -> DocumentAnalysis:
        return await asyncio.to_thread(self._extract_sync, document)

    def _extract_sync(self, document: Document) -> DocumentAnalysis:
        if document.mime_type.startswith("image/"):
            text = pytesseract.image_to_string(
                Image.open(io.BytesIO(document.content)), lang=self._ocr_language
            ).strip()
            return DocumentAnalysis(document.file_name, document.mime_type, text, 1)

        pdf = fitz.open(stream=document.content, filetype="pdf")
        try:
            pages = min(len(pdf), self._max_pages)
            warnings: list[str] = []
            if len(pdf) > pages:
                warnings.append(f"Chỉ xử lý {pages}/{len(pdf)} trang đầu")
            extracted: list[str] = []
            for index in range(pages):
                page = pdf[index]
                text = page.get_text("text").strip()
                if len(text) < 40:
                    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                    image = Image.open(io.BytesIO(pixmap.tobytes("png")))
                    text = pytesseract.image_to_string(image, lang=self._ocr_language).strip()
                extracted.append(f"--- Trang {index + 1} ---\n{text}")
            return DocumentAnalysis(
                document.file_name, document.mime_type, "\n\n".join(extracted), len(pdf), warnings
            )
        finally:
            pdf.close()
