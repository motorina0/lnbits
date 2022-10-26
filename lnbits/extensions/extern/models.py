from pydantic import BaseModel


class Extension(BaseModel):
    id: str
    name: str
    public_id: str
    active: bool = False
    manifest: str = "{}"
    time: int = 0

    @classmethod
    def from_row(cls, row) -> "Extension":
        return cls(**dict(row))


class CreateExtension(BaseModel):
    name: str
    public_id: str
    name: str
    manifest: str = "{}"
