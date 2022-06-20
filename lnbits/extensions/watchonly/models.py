from sqlite3 import Row

from fastapi.param_functions import Query
from pydantic import BaseModel

from .helpers import parse_key


class CreateWallet(BaseModel):
    masterpub: str = Query("")
    title: str = Query("")


class Wallets(BaseModel): # todo: why plural
    id: str
    user: str
    masterpub: str
    title: str
    address_no: int
    balance: int
    type: str = ''

    @classmethod
    def from_row(cls, row: Row) -> "Wallets":
        return cls(**dict(row))


class Mempool(BaseModel):
    user: str
    endpoint: str

    @classmethod
    def from_row(cls, row: Row) -> "Mempool":
        return cls(**dict(row))


class Addresses(BaseModel): # todo: why plural
    id: str
    address: str
    wallet: str
    amount: int = 0
    branch_index: int = 0
    address_index: int
    note: str = None
    has_activity: bool = False

    @classmethod
    def from_row(cls, row: Row) -> "Addresses":
        return cls(**dict(row))

class UpdateAddressAmount(BaseModel):
    address: str
    wallet: str
    amount: int