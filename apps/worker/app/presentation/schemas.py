from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class DocumentAnalysisResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)
    file_name: str
    mime_type: str
    text: str
    page_count: int | None
    warnings: list[str]
