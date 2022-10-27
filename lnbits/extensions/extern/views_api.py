import os
from http import HTTPStatus
from typing import Optional

from fastapi import File, Request, UploadFile
from fastapi.params import Depends
from starlette.exceptions import HTTPException

from lnbits.decorators import WalletTypeInfo, get_key_type, require_admin_key
from lnbits.helpers import urlsafe_short_hash

from . import extern_ext
from .crud import create_extension, delete_extension, get_extension, get_extensions
from .models import CreateExtension, Extension


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
    ext = await get_extension(ext_id)

    if not ext:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND, detail="Extension does not exist."
        )

    return ext.dict()


@extern_ext.post("/api/v1/extension")
async def api_extension_create_or_update(
    data: CreateExtension, w: WalletTypeInfo = Depends(require_admin_key)
):
    try:
        print("### create extension")
        new_ext = Extension(
            id="none", name=data.name, public_id=data.public_id, manifest=data.manifest
        )
        ext = await create_extension(w.wallet.user, new_ext)
        return ext.dict()
    except Exception as e:
        raise HTTPException(status_code=HTTPStatus.BAD_REQUEST, detail=str(e))


@extern_ext.post("/api/v1/extensionxxx/upload")
def api_extension_upload(file: UploadFile):
    # todo: check rights: w: WalletTypeInfo = Depends(require_admin_key)
    print("### file", file.filename)
    try:
        ext_id = urlsafe_short_hash()

        parent_dir = os.path.join('data/extern/', ext_id)
        os.mkdir(parent_dir)
        file_location = os.path.join(parent_dir, file.filename)

        with open(file_location, "wb+") as file_object:
            file_object.write(file.file.read())

    except Exception as e:
        return {"message": "There was an error uploading the file"}
    finally:
        file.file.close()

    return {"message": f"Successfully uploaded {file.filename}"}


@extern_ext.delete("/api/v1/extension/{ext_id}")
async def api_extension_delete(
    ext_id: str, w: WalletTypeInfo = Depends(require_admin_key)
):
    try:
        await delete_extension(ext_id)
    except Exception as e:
        raise HTTPException(status_code=HTTPStatus.BAD_REQUEST, detail=str(e))

    return "", HTTPStatus.NO_CONTENT
