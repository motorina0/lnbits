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
from .crud import get_extension_by_public_id

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
        f"/extern/dashboard/{ext.id}/dist",
        StaticFiles(directory=f"data/extern/{ext.id}/dist"),
        f"extern_static_{ext.id}",
    )

    return extern_extension_renderer().TemplateResponse(
        f"{ext.id}/index.html",
        {"request": request, "user": user.dict(), "ext_id": ext.id},
    )
