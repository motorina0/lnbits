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


class Resource(BaseModel):
    id: str
    ext_id: str
    data: str
    public_data: str

    @classmethod
    def from_row(cls, row) -> "Resource":
        return cls(**dict(row))


class PublicResource(BaseModel):
    id: str
    ext_id: str
    public_data: str

    @classmethod
    def from_row(cls, row) -> "PublicResource":
        return cls(**dict(row))


class CreateResource(BaseModel):
    ext_id: str
    data: str
    public_data: str
