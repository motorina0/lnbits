from pickle import FALSE
from typing import List, Optional


from lnbits.helpers import urlsafe_short_hash

from . import db
from .models import Addresses, Mempool, Wallets
from .helpers import parse_key, derive_address


##########################WALLETS####################

async def create_watch_wallet(user: str, masterpub: str, title: str) -> Wallets:
    # check the masterpub is fine, it will raise an exception if not
    parse_key(masterpub)
    wallet_id = urlsafe_short_hash()
    await db.execute(
        """
        INSERT INTO watchonly.wallets (
            id,
            "user",
            masterpub,
            title,
            address_no,
            balance
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        # address_no is -1 so fresh address on empty wallet can get address with index 0
        (wallet_id, user, masterpub, title, -1, 0),
    )

    return await get_watch_wallet(wallet_id)


async def get_watch_wallet(wallet_id: str) -> Optional[Wallets]:
    row = await db.fetchone(
        "SELECT * FROM watchonly.wallets WHERE id = ?", (wallet_id,)
    )
    return Wallets.from_row(row) if row else None


async def get_watch_wallets(user: str) -> List[Wallets]:
    rows = await db.fetchall(
        """SELECT * FROM watchonly.wallets WHERE "user" = ?""", (user,)
    )
    return [Wallets(**row) for row in rows]


async def update_watch_wallet(wallet_id: str, **kwargs) -> Optional[Wallets]:
    q = ", ".join([f"{field[0]} = ?" for field in kwargs.items()])

    await db.execute(
        f"UPDATE watchonly.wallets SET {q} WHERE id = ?", (*kwargs.values(), wallet_id)
    )
    row = await db.fetchone(
        "SELECT * FROM watchonly.wallets WHERE id = ?", (wallet_id,)
    )
    return Wallets.from_row(row) if row else None


async def delete_watch_wallet(wallet_id: str) -> None:
    await db.execute("DELETE FROM watchonly.wallets WHERE id = ?", (wallet_id,))

    ########################ADDRESSES#######################

async def get_fresh_address(wallet_id: str) -> Optional[Addresses]:
    wallet = await get_watch_wallet(wallet_id)

    if not wallet:
        return None

    # todo: filter on DB side
    wallet_addresses = await get_addresses(wallet_id)
    receive_addresses = list(filter(lambda addr: addr.branch_index == 0 and addr.amount != 0, wallet_addresses))
    last_receive_index = receive_addresses.pop().address_index if receive_addresses else -1
    address_index = last_receive_index if last_receive_index > wallet.address_no else  wallet.address_no

    address = await get_address_at_index(wallet_id, 0, address_index + 1)

    if not address:
        addresses = await create_fresh_addresses(wallet_id, address_index + 1, address_index + 2)
        address = addresses.pop()

    await update_watch_wallet(wallet_id, **{"address_no": address_index + 1})

    return address


async def create_fresh_addresses(wallet_id: str, start_address_index: int, end_address_index: int, change_address = False) -> List[Addresses]:
    if (start_address_index > end_address_index):
        return None

    wallet = await get_watch_wallet(wallet_id)
    if not wallet:
        return None

    branch_index = 1 if change_address else 0

    # todo: use batch insert (?)
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
        (wallet_id, branch_index, start_address_index, end_address_index)
    )

    return [Addresses(**row) for row in rows]

async def get_address(address: str) -> Optional[Addresses]:
    row = await db.fetchone(
        "SELECT * FROM watchonly.addresses WHERE address = ?", (address,)
    )
    return Addresses.from_row(row) if row else None

async def get_address_at_index(wallet_id: str, branch_index: int, address_index: int) -> Optional[Addresses]:
    row = await db.fetchone(
        """
            SELECT * FROM watchonly.addresses 
            WHERE wallet = ? AND branch_index = ? AND address_index = ?
        """, 
        (wallet_id, branch_index, address_index,)
    )
    return Addresses.from_row(row) if row else None


async def get_addresses(wallet_id: str) -> List[Addresses]:
    rows = await db.fetchall(
        """
            SELECT * FROM watchonly.addresses WHERE wallet = ?
            ORDER BY branch_index, address_index
        """,
        (wallet_id,)
    )

    return [Addresses(**row) for row in rows]

async def update_address(id: str, amount: int) -> Optional[Addresses]:
    await db.execute(
        "UPDATE watchonly.addresses SET amount =? WHERE id = ? ",
        (amount, id),
    )
    row = await db.fetchone(
        "SELECT * FROM watchonly.addresses WHERE id = ?", (id)
    )
    return Addresses.from_row(row) if row else None

async def delete_addresses_for_wallet(wallet_id: str) -> None:
    await db.execute("DELETE FROM watchonly.addresses WHERE wallet = ?", (wallet_id,))

######################MEMPOOL#######################


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


async def update_mempool(user: str, **kwargs) -> Optional[Mempool]:
    q = ", ".join([f"{field[0]} = ?" for field in kwargs.items()])

    await db.execute(
        f"""UPDATE watchonly.mempool SET {q} WHERE "user" = ?""", #todo: sql injection risk?
        (*kwargs.values(), user),
    )
    row = await db.fetchone(
        """SELECT * FROM watchonly.mempool WHERE "user" = ?""", (user,)
    )
    return Mempool.from_row(row) if row else None


async def get_mempool(user: str) -> Mempool:
    row = await db.fetchone(
        """SELECT * FROM watchonly.mempool WHERE "user" = ?""", (user,)
    )
    return Mempool.from_row(row) if row else None
