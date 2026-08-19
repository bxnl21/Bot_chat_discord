import pytest
from app.domain.entities import Document


def test_document_rejects_empty_content() -> None:
    with pytest.raises(ValueError, match="content"):
        Document("empty.pdf", "application/pdf", b"")
