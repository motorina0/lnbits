import json
import os
import shutil
import zipfile
from http import HTTPStatus
from typing import Optional

from fastapi import File, Request, UploadFile
from fastapi.params import Depends
from starlette.exceptions import HTTPException

from lnbits.decorators import WalletTypeInfo, get_key_type, require_admin_key
from lnbits.helpers import urlsafe_short_hash

from . import extern_ext
from .crud import (
    create_extension,
    delete_extension,
    get_extension,
    get_extension_by_public_id,
    get_extensions,
)
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

        # todo: do not allow same id & path
        new_ext = Extension(
            id=ext_id,
            name=manifest["name"],
            public_id=manifest["id"],
            manifest=json.dumps(manifest),
        )
        ext = await create_extension(w.wallet.user, new_ext)
        return ext.dict()

    except Exception as e:
        if ext_dir:
            shutil.rmtree(ext_dir)
        raise HTTPException(status_code=HTTPStatus.BAD_REQUEST, detail=str(e))
    finally:
        ext_file.file.close()
        if manifest_file:
            manifest_file.close()


@extern_ext.delete("/api/v1/extension/{ext_id}")
async def api_extension_delete(
    ext_id: str, w: WalletTypeInfo = Depends(require_admin_key)
):
    try:
        ext = await get_extension(w.wallet.user, ext_id)
        if ext:
            await delete_extension(w.wallet.user, ext_id)
            shutil.rmtree(
                os.path.join("data/extern/", ext_id)
            )  # to do: path from config
    except Exception as e:
        raise HTTPException(status_code=HTTPStatus.BAD_REQUEST, detail=str(e))

    return "", HTTPStatus.NO_CONTENT
