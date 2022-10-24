from fastapi.params import Depends
from fastapi.templating import Jinja2Templates
from starlette.requests import Request
from starlette.responses import HTMLResponse

from lnbits.core.models import User
from lnbits.decorators import check_user_exists

from . import extern_renderer, watchonly_ext, watchonly_renderer

templates = Jinja2Templates(directory="templates")


@watchonly_ext.get("/", response_class=HTMLResponse)
async def index(request: Request, user: User = Depends(check_user_exists)):
    return watchonly_renderer().TemplateResponse(
        "watchonly/index.html", {"request": request, "user": user.dict()}
    )


@watchonly_ext.get("/{ext_id}", response_class=HTMLResponse)
async def index(request: Request, ext_id: str): #, user: User = Depends(check_user_exists)
    print("### ext_id", ext_id)
    return extern_renderer().TemplateResponse(
        f"a3157ecf703142459d8f41beeaf5d5fc/{ext_id}/index.html", #todo: map user.id to extension.id
        {"request": request},
    )

@watchonly_ext.get("/{ext_id}/dist/", response_class=HTMLResponse)
async def index(request: Request, ext_id: str):
    print("### file ext_id", ext_id)
    return extern_renderer().TemplateResponse(
        f"a3157ecf703142459d8f41beeaf5d5fc/{ext_id}/dist/index.html", #todo: map user.id to extension.id
        {"request": request },
    )

# @watchonly_ext.get("/{ext_id}/dist/{file_path}/*", response_class=HTMLResponse)
# async def index(request: Request, ext_id: str, file_path: str):
#     print("### dist ext_id", ext_id, file_path)
