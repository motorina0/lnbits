from sqlite3 import Row
from typing import List
from fastapi.param_functions import Query
from pydantic import BaseModel


class CreateWallet(BaseModel):
    masterpub: str = Query("")
    title: str = Query("")


class Wallets(BaseModel):  # todo: why plural
    id: str
    user: str
    masterpub: str
    fingerprint: str
    title: str
    address_no: int
    balance: int
    type: str = ""

    @classmethod
    def from_row(cls, row: Row) -> "Wallets":
        return cls(**dict(row))


class Mempool(BaseModel):
    user: str
    endpoint: str

    @classmethod
    def from_row(cls, row: Row) -> "Mempool":
        return cls(**dict(row))


class Addresses(BaseModel):  # todo: why plural
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


class TransactionInput(BaseModel):
    txid: str
    vout: int
    amount: int
    address: str
    branch_index: int
    address_index: int
    master_fingerprint: str
    tx_hex: str


class TransactionOutput(BaseModel):
    amount: int
    address: str
    branch_index: int = None
    address_index: int = None
    master_fingerprint: str = None


class MasterPublicKey(BaseModel):
    public_key: str
    fingerprint: str


class CreatePsbt(BaseModel):
    masterpubs: List[MasterPublicKey]
    inputs: List[TransactionInput]
    outputs: List[TransactionOutput]
    fee_rate: int
    tx_size: int
