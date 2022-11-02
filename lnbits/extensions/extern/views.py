import base64
import json
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.params import Depends
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.exceptions import HTTPException
from starlette.responses import HTMLResponse

from lnbits.core.models import User
from lnbits.decorators import check_user_exists

from . import extern_ext, extern_extension_renderer, extern_renderer, mount_static_files
from .crud import EXT_FOLDER, get_extension_by_public_id, get_public_resource_data

templates = Jinja2Templates(directory="templates")


@extern_ext.get("/", response_class=HTMLResponse)
async def index(
    request: Request,
    user: User = Depends(check_user_exists),
):
    return extern_renderer().TemplateResponse(
        "extern/index.html", {"request": request, "user": user.dict()}
    )


@extern_ext.get("/{public_id}/", response_class=HTMLResponse)
async def index(
    request: Request, public_id: str, user: User = Depends(check_user_exists)
):
    ext = await get_extension_by_public_id(user.id, public_id)
    if not ext:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND, detail="Extension not found"
        )

    mount_static_files(
        f"/extern/{public_id}/{ext.id}/dist",
        StaticFiles(directory=f"{EXT_FOLDER}/{ext.id}/dist"),
        f"extern_static_{ext.id}",
    )

    return extern_extension_renderer().TemplateResponse(
        f"{ext.id}/index.html",
        {
            "request": request,
            "user": user.dict(),
            "ext_id": ext.id,
            "manifest": json.loads(ext.manifest),
        },
    )


@extern_ext.get("/public/{ext_id}/", response_class=HTMLResponse)
async def public_index(request: Request, ext_id: str):

    # todo: check file existnece
    if "id" in request.query_params:
        public_data = await get_public_resource_data(request.query_params["id"])

    mount_static_files(
        f"/extern/public/{ext_id}/dist",
        StaticFiles(directory=f"{EXT_FOLDER}/{ext_id}/dist"),
        f"extern_static_{ext_id}",
    )

    return extern_extension_renderer().TemplateResponse(
        f"{ext_id}/public.html",
        {
            "request": request,
            "ext_id": ext_id,
            "public_data_base64": base64.b64encode(public_data.encode("ascii")).decode(
                "ascii"
            ),
        },
    )
