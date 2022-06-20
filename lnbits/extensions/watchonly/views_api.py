from http import HTTPStatus

from fastapi import Query, Request
from fastapi.params import Depends
from starlette.exceptions import HTTPException

from lnbits.decorators import WalletTypeInfo, get_key_type, require_admin_key
from lnbits.extensions.watchonly import watchonly_ext

from .crud import (
    create_mempool,
    create_watch_wallet,
    delete_watch_wallet,
    get_addresses,
    get_fresh_address,
    create_fresh_addresses,
    update_address,
    delete_addresses_for_wallet,
    get_mempool,
    get_watch_wallet,
    get_watch_wallets,
    update_mempool,
    update_watch_wallet,
)
from .models import CreateWallet

RECEIVE_GAP_LIMIT = 20
CHANGE_GAP_LIMIT = 5

###################WALLETS#############################


@watchonly_ext.get("/api/v1/wallet")
async def api_wallets_retrieve(wallet: WalletTypeInfo = Depends(get_key_type)):

    try:
        return [wallet.dict() for wallet in await get_watch_wallets(wallet.wallet.user)]
    except:
        return ""


@watchonly_ext.get("/api/v1/wallet/{wallet_id}")
async def api_wallet_retrieve(
    wallet_id, wallet: WalletTypeInfo = Depends(get_key_type)
):
    w_wallet = await get_watch_wallet(wallet_id)

    if not w_wallet:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND, detail="Wallet does not exist."
        )

    return w_wallet.dict()


@watchonly_ext.post("/api/v1/wallet")
async def api_wallet_create_or_update(
    data: CreateWallet, wallet_id=None, w: WalletTypeInfo = Depends(require_admin_key)
):
    try:
        wallet = await create_watch_wallet(
            user=w.wallet.user, masterpub=data.masterpub, title=data.title
        )
        await api_get_addresses(wallet.id)
    except Exception as e:
        raise HTTPException(status_code=HTTPStatus.BAD_REQUEST, detail=str(e))

    mempool = await get_mempool(w.wallet.user)
    if not mempool:
        create_mempool(user=w.wallet.user)
    return wallet.dict()


@watchonly_ext.delete("/api/v1/wallet/{wallet_id}")
async def api_wallet_delete(wallet_id, w: WalletTypeInfo = Depends(require_admin_key)):
    wallet = await get_watch_wallet(wallet_id)

    if not wallet:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND, detail="Wallet does not exist."
        )

    await delete_watch_wallet(wallet_id)
    await delete_addresses_for_wallet(wallet_id)

    raise HTTPException(status_code=HTTPStatus.NO_CONTENT)


#############################ADDRESSES##########################


@watchonly_ext.get("/api/v1/address/{wallet_id}")
async def api_fresh_address(wallet_id, w: WalletTypeInfo = Depends(get_key_type)):
    address = await get_fresh_address(wallet_id)
    return address.dict()

@watchonly_ext.put("/api/v1/address/{id}")
async def api_update_address(id:str, req: Request, w: WalletTypeInfo = Depends(require_admin_key)):
    body = await req.json()
    params = {}
    if 'amount' in body:
        params['amount'] = int(body['amount'])
    if 'note' in body:
        params['note'] = str(body['note'])

    address = await update_address(**params, id = id)

    wallet = await get_watch_wallet(address.wallet) if address.branch_index == 0 and address.amount != 0 else None
    
    if wallet and wallet.address_no < address.address_index:
        await update_watch_wallet(address.wallet, **{"address_no": address.address_index})
    return address

@watchonly_ext.get("/api/v1/addresses/{wallet_id}")
async def api_get_addresses(wallet_id, w: WalletTypeInfo = Depends(get_key_type)):
    wallet = await get_watch_wallet(wallet_id)
    if not wallet:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND, detail="Wallet does not exist."
        )

    addresses = await get_addresses(wallet_id)
    
    if not addresses:
        await create_fresh_addresses(wallet_id, 0, RECEIVE_GAP_LIMIT)
        await create_fresh_addresses(wallet_id, 0, CHANGE_GAP_LIMIT, True)
        addresses = await get_addresses(wallet_id)

    receive_addresses = list(filter(lambda addr: addr.branch_index == 0, addresses))
    change_addresses = list(filter(lambda addr: addr.branch_index == 1, addresses))

    last_receive_address = list(filter(lambda addr: addr.amount > 0, receive_addresses))[-1:]
    last_change_address = list(filter(lambda addr: addr.amount > 0, change_addresses))[-1:]

    if last_receive_address:
        current_index = receive_addresses[-1].address_index
        address_index = last_receive_address[0].address_index
        await create_fresh_addresses(wallet_id, current_index + 1, address_index + RECEIVE_GAP_LIMIT)

    if last_change_address:
        current_index = change_addresses[-1].address_index
        address_index = last_change_address[0].address_index
        await create_fresh_addresses(wallet_id, current_index + 1, address_index + CHANGE_GAP_LIMIT, True)

    addresses = await get_addresses(wallet_id)
    return [address.dict() for address in addresses]


#############################MEMPOOL##########################


@watchonly_ext.put("/api/v1/mempool")
async def api_update_mempool(
    endpoint: str = Query(...), w: WalletTypeInfo = Depends(require_admin_key)
):
    mempool = await update_mempool(**{"endpoint": endpoint}, user=w.wallet.user)
    return mempool.dict()


@watchonly_ext.get("/api/v1/mempool")
async def api_get_mempool(w: WalletTypeInfo = Depends(require_admin_key)):
    mempool = await get_mempool(w.wallet.user)
    if not mempool:
        mempool = await create_mempool(user=w.wallet.user)
    return mempool.dict()
