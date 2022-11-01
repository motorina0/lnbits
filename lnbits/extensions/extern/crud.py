import json
from typing import List, Optional

from lnbits.helpers import urlsafe_short_hash

from . import db
from .models import CreateResource, Extension, PublicResource, Resource


async def create_extension(user: str, e: Extension) -> Extension:
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
            e.id,
            user,
            e.name,
            e.public_id,
            e.manifest,
        ),
    )

    return await get_extension(user, e.id)


async def get_extension(user: str, ext_id: str) -> Optional[Extension]:
    row = await db.fetchone(
        """SELECT * FROM extern.extensions WHERE "user" = ? AND id = ?""",
        (
            user,
            ext_id,
        ),
    )
    return Extension.from_row(row) if row else None


async def get_extension_by_public_id(user: str, public_id: str) -> Optional[Extension]:
    row = await db.fetchone(
        """SELECT * FROM extern.extensions WHERE "user" = ? AND public_id = ? AND active""",
        (
            user,
            public_id,
        ),
    )
    return Extension.from_row(row) if row else None


async def get_extensions(user: str) -> List[Extension]:
    rows = await db.fetchall(
        """SELECT * FROM extern.extensions WHERE "user" = ?""",
        (user),
    )
    return [Extension(**row) for row in rows]


async def update_extension(user: str, ext_id: str, **kwargs) -> Optional[Extension]:
    q = ", ".join([f"{field[0]} = ?" for field in kwargs.items()])

    await db.execute(
        f"""UPDATE extern.extensions SET {q} WHERE "user" = ? AND id = ?""",
        (*kwargs.values(), user, ext_id),
    )
    row = await db.fetchone(
        """SELECT * FROM extern.extensions WHERE "user" = ? AND id = ?""",
        (
            user,
            ext_id,
        ),
    )
    return Extension.from_row(row) if row else None


async def delete_extension(user: str, ext_id: str) -> None:
    await db.execute(
        """DELETE FROM extern.extensions WHERE "user" = ? AND id = ?""",
        (
            user,
            ext_id,
        ),
    )


##########################RESOURCES####################


async def create_resource(user: str, resource: CreateResource) -> Resource:
    resource_id = urlsafe_short_hash()
    await db.execute(
        """
        INSERT INTO extern.resources (
            id,
            "user",
            ext_id,
            data,
            public_data
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            resource_id,
            user,
            resource.ext_id,
            json.dumps(resource.data),
            json.dumps(resource.public_data),
        ),
    )

    return await get_resource(user, resource_id)


async def get_resource(user: str, resource_id: str) -> Optional[Resource]:
    row = await db.fetchone(
        """SELECT * FROM extern.resources WHERE "user" = ? AND id = ?""",
        (
            user,
            resource_id,
        ),
    )
    return Resource.from_row(row) if row else None


async def get_public_resource_data(resource_id: str) -> Optional[str]:
    row = await db.fetchone(
        """SELECT public_data FROM extern.resources WHERE id = ?""",
        (resource_id,),
    )
    return row[0]


async def get_resources(user: str, ext_id: str) -> List[Resource]:
    rows = await db.fetchall(
        """SELECT * FROM extern.resources WHERE "user" = ? AND ext_id = ?""",
        (user, ext_id),
    )
    return [Resource.from_row(row) for row in rows]


# async def update_resource(user: str, resource_id: str, **kwargs) -> Optional[Resource]:


async def delete_resource(user: str, resource_id: str) -> None:
    await db.execute(
        """DELETE FROM extern.resources WHERE "user" = ? AND id = ?""",
        (
            user,
            resource_id,
        ),
    )
