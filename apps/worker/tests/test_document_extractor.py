from unittest.mock import patch

import fitz
import pytest

from app.domain.entities import Document
from app.infrastructure.document_extractor import PyMuPdfDocumentExtractor


def text_pdf() -> bytes:
    pdf = fitz.open()
    page = pdf.new_page()
    page.insert_text((72, 72), "This is selectable PDF text with enough characters for extraction.")
    content = pdf.tobytes()
    pdf.close()
    return content


@pytest.mark.asyncio
async def test_extracts_selectable_pdf_text_without_ocr() -> None:
    result = await PyMuPdfDocumentExtractor().extract(
        Document("text.pdf", "application/pdf", text_pdf())
    )
    assert "selectable PDF text" in result.text
    assert result.page_count == 1


@pytest.mark.asyncio
async def test_uses_ocr_for_scanned_pdf_page() -> None:
    pdf = fitz.open()
    pdf.new_page()
    content = pdf.tobytes()
    pdf.close()
    with patch("app.infrastructure.document_extractor.pytesseract.image_to_string", return_value="OCR text"):
        result = await PyMuPdfDocumentExtractor().extract(
            Document("scan.pdf", "application/pdf", content)
        )
    assert "OCR text" in result.text
