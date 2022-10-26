import json
from typing import List, Optional

from lnbits.helpers import urlsafe_short_hash

from . import db
from .models import Extension


async def create_extension(user: str, e: Extension) -> Extension:
    ext_id = urlsafe_short_hash()
    await db.execute(
        """
        INSERT INTO extern.extensions (
            id,
            "user",
            name,
            public_id,
            manifest
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            ext_id,
            user,
            e.name,
            e.public_id,
            e.manifest,
        ),
    )

    return await get_extension(ext_id)


async def get_extension(ext_id: str) -> Optional[Extension]:
    row = await db.fetchone("SELECT * FROM extern.extensions WHERE id = ?", (ext_id,))
    return Extension.from_row(row) if row else None


async def get_extensions(user: str) -> List[Extension]:
    rows = await db.fetchall(
        """SELECT * FROM extern.extensions WHERE "user" = ?""",
        (user),
    )
    return [Extension(**row) for row in rows]


async def update_extension(ext_id: str, **kwargs) -> Optional[Extension]:
    q = ", ".join([f"{field[0]} = ?" for field in kwargs.items()])

    await db.execute(
        f"UPDATE watchonly.wallets SET {q} WHERE id = ?", (*kwargs.values(), ext_id)
    )
    row = await db.fetchone("SELECT * FROM watchonly.wallets WHERE id = ?", (ext_id,))
    return Extension.from_row(row) if row else None


async def delete_extension(ext_id: str) -> None:
    await db.execute("DELETE FROM extern.extensions WHERE id = ?", (ext_id,))
