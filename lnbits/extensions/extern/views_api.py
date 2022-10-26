from http import HTTPStatus

from fastapi.params import Depends
from starlette.exceptions import HTTPException

from lnbits.decorators import WalletTypeInfo, get_key_type, require_admin_key

from . import extern_ext
from .crud import create_extension, delete_extension, get_extension, get_extensions
from .models import CreateExtension, Extension


@extern_ext.get("/api/v1/extension")
async def api_wallets_retrieve(wallet: WalletTypeInfo = Depends(get_key_type)):
    try:
        return [ext.dict() for ext in await get_extensions(wallet.wallet.user)]
    except:
        return []


@extern_ext.get("/api/v1/extension/{ext_id}")
async def api_wallet_retrieve(ext_id, wallet: WalletTypeInfo = Depends(get_key_type)):
    ext = await get_extension(ext_id)

    if not ext:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND, detail="Extension does not exist."
        )

    return ext.dict()


@extern_ext.post("/api/v1/extension")
async def api_wallet_create_or_update(
    data: CreateExtension, w: WalletTypeInfo = Depends(require_admin_key)
):
    try:
        # todo: unzip
        print("### create extension")
        new_ext = Extension(
            id="none", name=data.name, public_id=data.public_id, manifest=data.manifest
        )
        ext = await create_extension(w.wallet.user, new_ext)
        return ext.dict()
    except Exception as e:
        raise HTTPException(status_code=HTTPStatus.BAD_REQUEST, detail=str(e))


@extern_ext.delete("/api/v1/extension/{ext_id}")
async def api_wallet_delete(
    ext_id: str, w: WalletTypeInfo = Depends(require_admin_key)
):
    try:
        await delete_extension(ext_id)
    except Exception as e:
        raise HTTPException(status_code=HTTPStatus.BAD_REQUEST, detail=str(e))

    return "", HTTPStatus.NO_CONTENT
