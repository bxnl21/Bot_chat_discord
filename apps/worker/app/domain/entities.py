from dataclasses import dataclass, field


@dataclass(frozen=True)
class Document:
    file_name: str
    mime_type: str
    content: bytes

    def __post_init__(self) -> None:
        if not self.file_name.strip():
            raise ValueError("file_name must not be empty")
        if not self.content:
            raise ValueError("document content must not be empty")


@dataclass(frozen=True)
class DocumentAnalysis:
    file_name: str
    mime_type: str
    text: str
    page_count: int | None
    warnings: list[str] = field(default_factory=list)
