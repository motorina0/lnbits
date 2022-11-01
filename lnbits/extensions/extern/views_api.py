import json
import os
import shutil
import zipfile
from http import HTTPStatus
from typing import Optional

from fastapi import File, Request, UploadFile
from fastapi.params import Depends
from starlette.exceptions import HTTPException

from lnbits.core.crud import update_user_extension
from lnbits.decorators import WalletTypeInfo, get_key_type, require_admin_key
from lnbits.helpers import urlsafe_short_hash

from . import extern_ext
from .crud import (
    create_extension,
    create_resource,
    delete_extension,
    delete_resource,
    get_extension,
    get_extension_by_public_id,
    get_extensions,
    get_public_resource_data,
    get_resource,
    get_resources,
    update_extension,
)
from .models import CreateExtension, CreateResource, Extension


@extern_ext.get("/api/v1/extension")
async def api_extensions_retrieve(wallet: WalletTypeInfo = Depends(get_key_type)):
    try:
        return [ext.dict() for ext in await get_extensions(wallet.wallet.user)]
    except:
        return []


@extern_ext.get("/api/v1/extension/{ext_id}")
async def api_extension_retrieve(
    ext_id, wallet: WalletTypeInfo = Depends(get_key_type)
):
    ext = await get_extension(wallet.wallet.user, ext_id)

    if not ext:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND, detail="Extension does not exist."
        )

    return ext.dict()


@extern_ext.post("/api/v1/extension")
async def api_extension_upload(
    ext_file: UploadFile, w: WalletTypeInfo = Depends(require_admin_key)
):
    if not ext_file.filename:
        raise HTTPException(
            status_code=HTTPStatus.BAD_REQUEST, detail="Extension archive missing!"
        )
    try:
        ext_id = urlsafe_short_hash()

        ext_dir = os.path.join("data/extern/", ext_id)  # to do: path from config
        os.makedirs(ext_dir)
        zip_file = os.path.join(ext_dir, ext_file.filename)

        with open(zip_file, "wb+") as file_object:
            file_object.write(ext_file.file.read())
        with zipfile.ZipFile(zip_file, "r") as zip_ref:
            zip_ref.extractall(ext_dir)
        os.remove(zip_file)

        with open(os.path.join(ext_dir, "manifest.json"), "r") as manifest_file:
            if not manifest_file:
                raise Exception("Manifest file not present")
            manifest = json.load(manifest_file)

        same_path_ext = await get_extension_by_public_id(w.wallet.user, manifest["id"])
        if same_path_ext:
            raise Exception(
                f"""An estension with the same path ({manifest["id"]}) already exists"""
            )

        shutil.copy(
            "lnbits/extensions/extern/templates/extern/index_extern.html",
            os.path.join(ext_dir, "index.html"),
        )

        new_ext = Extension(
            id=ext_id,
            name=manifest["name"],
            public_id=manifest["id"],
            manifest=json.dumps(manifest),
        )
        ext = await create_extension(w.wallet.user, new_ext)

        ext_meta = {
            "code": manifest["id"],
            "isValid": True,
            "name": manifest["name"],
            "icon": manifest["icon"] if "icon" in manifest else "extension",
            "shortDescription": manifest["description"]
            if "description" in manifest
            else "",
            "url": f"""/extern/{manifest["id"]}/""",
        }

        await update_user_extension(
            user_id=w.wallet.user,
            extension=ext_id,
            active=False,
            extern=True,
            meta=json.dumps(ext_meta),
        )

        return ext.dict()

    except Exception as e:
        if ext_dir:
            shutil.rmtree(ext_dir)
        raise HTTPException(status_code=HTTPStatus.BAD_REQUEST, detail=str(e))
    finally:
        ext_file.file.close()
        if manifest_file:
            manifest_file.close()


@extern_ext.put("/api/v1/extension/{ext_id}")
async def api_extension_update(
    ext_id: str, req: Request, w: WalletTypeInfo = Depends(require_admin_key)
):
    update_data = await req.json()
    try:
        ext = await get_extension(w.wallet.user, ext_id)
        if not ext:
            raise Exception("Extension not found")

        updated_ext = await update_extension(
            w.wallet.user, ext_id=ext_id, **update_data
        )

        if "active" in update_data:
            await update_user_extension(
                user_id=w.wallet.user,
                extension=ext_id,
                active=update_data["active"],
            )

        return updated_ext

    except Exception as e:
        raise HTTPException(status_code=HTTPStatus.BAD_REQUEST, detail=str(e))


@extern_ext.delete("/api/v1/extension/{ext_id}")
async def api_extension_delete(
    ext_id: str, w: WalletTypeInfo = Depends(require_admin_key)
):
    try:
        ext = await get_extension(w.wallet.user, ext_id)
        if ext:
            await delete_extension(w.wallet.user, ext_id)
            await update_user_extension(
                user_id=w.wallet.user, extension=ext_id, active=False
            )
            shutil.rmtree(
                os.path.join("data/extern/", ext_id)
            )  # to do: path from config
    except Exception as e:
        raise HTTPException(status_code=HTTPStatus.BAD_REQUEST, detail=str(e))

    return "", HTTPStatus.NO_CONTENT


##########################RESOURCES####################
@extern_ext.get("/api/v1/resource")
async def api_resources_retrieve(wallet: WalletTypeInfo = Depends(get_key_type)):
    try:
        return [resource.dict() for resource in await get_resources(wallet.wallet.user)]
    except:
        return []


@extern_ext.get("/api/v1/resource/{resource_id}")
async def api_resource_retrieve(
    resource_id, wallet: WalletTypeInfo = Depends(get_key_type)
):
    resource = await get_resource(wallet.wallet.user, resource_id)

    if not resource:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND, detail="Resource does not exist."
        )

    return resource.dict()


@extern_ext.get("/api/v1/resource/{resource_id}/public")
async def api_resource_retrieve_public(resource_id: str):
    public_resource = await get_public_resource_data(resource_id)

    if not public_resource:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND, detail="Resource does not exist."
        )

    return public_resource.dict()


@extern_ext.post("/api/v1/resource")
async def api_wallet_create_or_update(
    data: CreateResource, w: WalletTypeInfo = Depends(require_admin_key)
):
    try:
        resource = await create_resource(w.wallet.user, data)
        return resource
    except Exception as e:
        raise HTTPException(status_code=HTTPStatus.BAD_REQUEST, detail=str(e))


@extern_ext.delete("/api/v1/resource/{resource_id}")
async def api_resource_delete(
    resource_id: str, w: WalletTypeInfo = Depends(require_admin_key)
):
    try:
        await delete_resource(w.wallet.user, resource_id)
    except Exception as e:
        raise HTTPException(status_code=HTTPStatus.BAD_REQUEST, detail=str(e))

    return "", HTTPStatus.NO_CONTENT
