import json
from typing import List, Optional


from lnbits.helpers import urlsafe_short_hash

from . import db
from .models import Address, Config, Mempool, WalletAccount
from .helpers import parse_key, derive_address


##########################WALLETS####################


async def create_watch_wallet(user: str, masterpub: str, title: str) -> WalletAccount:
    # check the masterpub is fine, it will raise an exception if not
    (descriptor, _) = parse_key(masterpub)

    type = descriptor.scriptpubkey_type()
    fingerprint = descriptor.keys[0].fingerprint.hex()
    wallet_id = urlsafe_short_hash()

    wallets = await get_watch_wallets(user)
    w = next((w for w in wallets if w.fingerprint == fingerprint), None)
    if w:
        raise ValueError("Account '{}' has the same master pulic key".format(w.title))

    await db.execute(
        """
        INSERT INTO watchonly.wallets (
            id,
            "user",
            masterpub,
            fingerprint,
            title,
            type,
            address_no,
            balance
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        # address_no is -1 so fresh address on empty wallet can get address with index 0
        (wallet_id, user, masterpub, fingerprint, title, type, -1, 0),
    )

    return await get_watch_wallet(wallet_id)


async def get_watch_wallet(wallet_id: str) -> Optional[WalletAccount]:
    row = await db.fetchone(
        "SELECT * FROM watchonly.wallets WHERE id = ?", (wallet_id,)
    )
    return WalletAccount.from_row(row) if row else None


async def get_watch_wallets(user: str) -> List[WalletAccount]:
    rows = await db.fetchall(
        """SELECT * FROM watchonly.wallets WHERE "user" = ?""", (user,)
    )
    return [WalletAccount(**row) for row in rows]


async def update_watch_wallet(wallet_id: str, **kwargs) -> Optional[WalletAccount]:
    q = ", ".join([f"{field[0]} = ?" for field in kwargs.items()])

    await db.execute(
        f"UPDATE watchonly.wallets SET {q} WHERE id = ?", (*kwargs.values(), wallet_id)
    )
    row = await db.fetchone(
        "SELECT * FROM watchonly.wallets WHERE id = ?", (wallet_id,)
    )
    return WalletAccount.from_row(row) if row else None


async def delete_watch_wallet(wallet_id: str) -> None:
    await db.execute("DELETE FROM watchonly.wallets WHERE id = ?", (wallet_id,))

########################ADDRESSES#######################

async def get_fresh_address(wallet_id: str) -> Optional[Address]:
    # todo: move logic to views_api after satspay refactoring
    wallet = await get_watch_wallet(wallet_id)

    if not wallet:
        return None

    wallet_addresses = await get_addresses(wallet_id)
    receive_addresses = list(
        filter(
            lambda addr: addr.branch_index == 0 and addr.has_activity, wallet_addresses
        )
    )
    last_receive_index = (
        receive_addresses.pop().address_index if receive_addresses else -1
    )
    address_index = (
        last_receive_index
        if last_receive_index > wallet.address_no
        else wallet.address_no
    )

    address = await get_address_at_index(wallet_id, 0, address_index + 1)

    if not address:
        addresses = await create_fresh_addresses(
            wallet_id, address_index + 1, address_index + 2
        )
        address = addresses.pop()

    await update_watch_wallet(wallet_id, **{"address_no": address_index + 1})

    return address


async def create_fresh_addresses(
    wallet_id: str,
    start_address_index: int,
    end_address_index: int,
    change_address=False,
) -> List[Address]:
    if start_address_index > end_address_index:
        return None

    wallet = await get_watch_wallet(wallet_id)
    if not wallet:
        return None

    branch_index = 1 if change_address else 0

    for address_index in range(start_address_index, end_address_index):
        address = await derive_address(wallet.masterpub, address_index, branch_index)

        await db.execute(
            """
        INSERT INTO watchonly.addresses (
            id,
            address,
            wallet,
            amount,
            branch_index,
            address_index
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
            (urlsafe_short_hash(), address, wallet_id, 0, branch_index, address_index),
        )

    # return fresh addresses
    rows = await db.fetchall(
        """
            SELECT * FROM watchonly.addresses 
            WHERE wallet = ? AND branch_index = ? AND address_index >= ? AND address_index < ?
            ORDER BY branch_index, address_index
        """,
        (wallet_id, branch_index, start_address_index, end_address_index),
    )

    return [Address(**row) for row in rows]


async def get_address(address: str) -> Optional[Address]:
    row = await db.fetchone(
        "SELECT * FROM watchonly.addresses WHERE address = ?", (address,)
    )
    return Address.from_row(row) if row else None


async def get_address_at_index(
    wallet_id: str, branch_index: int, address_index: int
) -> Optional[Address]:
    row = await db.fetchone(
        """
            SELECT * FROM watchonly.addresses 
            WHERE wallet = ? AND branch_index = ? AND address_index = ?
        """,
        (
            wallet_id,
            branch_index,
            address_index,
        ),
    )
    return Address.from_row(row) if row else None


async def get_addresses(wallet_id: str) -> List[Address]:
    rows = await db.fetchall(
        """
            SELECT * FROM watchonly.addresses WHERE wallet = ?
            ORDER BY branch_index, address_index
        """,
        (wallet_id,),
    )

    return [Address(**row) for row in rows]


async def update_address(id: str, **kwargs) -> Optional[Address]:
    q = ", ".join([f"{field[0]} = ?" for field in kwargs.items()])

    await db.execute(
        f"""UPDATE watchonly.addresses SET {q} WHERE id = ? """,
        (*kwargs.values(), id),
    )
    row = await db.fetchone("SELECT * FROM watchonly.addresses WHERE id = ?", (id))
    return Address.from_row(row) if row else None


async def delete_addresses_for_wallet(wallet_id: str) -> None:
    await db.execute("DELETE FROM watchonly.addresses WHERE wallet = ?", (wallet_id,))


######################CONFIG#######################
async def create_config(user: str) -> Config:
    config = Config()
    await db.execute(
        """
        INSERT INTO watchonly.config ("user", json_data)
        VALUES (?, ?)
        """,
        (user, json.dumps(config.dict())),
    )
    row = await db.fetchone(
        """SELECT json_data FROM watchonly.config WHERE "user" = ?""", (user,)
    )
    return json.loads(row[0], object_hook=lambda d: Config(**d))


async def update_config(config: Config, user: str) -> Optional[Config]:
    await db.execute(
        f"""UPDATE watchonly.config SET json_data = ? WHERE "user" = ?""",
        (json.dumps(config.dict()), user),
    )
    row = await db.fetchone(
        """SELECT json_data FROM watchonly.config WHERE "user" = ?""", (user,)
    )
    return json.loads(row[0], object_hook=lambda d: Config(**d))


async def get_config(user: str) -> Optional[Config]:
    row = await db.fetchone(
        """SELECT json_data FROM watchonly.config WHERE "user" = ?""", (user,)
    )
    return json.loads(row[0], object_hook=lambda d: Config(**d)) if row else None


######################MEMPOOL#######################
### TODO: fix statspay dependcy and remove
async def create_mempool(user: str) -> Optional[Mempool]:
    await db.execute(
        """
        INSERT INTO watchonly.mempool ("user",endpoint)
        VALUES (?, ?)
        """,
        (user, "https://mempool.space"),
    )
    row = await db.fetchone(
        """SELECT * FROM watchonly.mempool WHERE "user" = ?""", (user,)
    )
    return Mempool.from_row(row) if row else None


### TODO: fix statspay dependcy and remove
async def update_mempool(user: str, **kwargs) -> Optional[Mempool]:
    q = ", ".join([f"{field[0]} = ?" for field in kwargs.items()])

    await db.execute(
        f"""UPDATE watchonly.mempool SET {q} WHERE "user" = ?""",
        (*kwargs.values(), user),
    )
    row = await db.fetchone(
        """SELECT * FROM watchonly.mempool WHERE "user" = ?""", (user,)
    )
    return Mempool.from_row(row) if row else None


### TODO: fix statspay dependcy and remove
async def get_mempool(user: str) -> Mempool:
    row = await db.fetchone(
        """SELECT * FROM watchonly.mempool WHERE "user" = ?""", (user,)
    )
    return Mempool.from_row(row) if row else None
