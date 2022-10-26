from fastapi import APIRouter
from fastapi.staticfiles import StaticFiles

from lnbits.db import Database
from lnbits.helpers import template_renderer

db = Database("ext_extern")

extern_static_files = [
    {
        "path": "/extern/static",
        "app": StaticFiles(directory="lnbits/extensions/extern/static"),
        "name": "extern_static",
    }
]

extern_ext: APIRouter = APIRouter(prefix="/extern", tags=["extern"])


def extern_renderer():
    return template_renderer(["lnbits/extensions/extern/templates"])


from .views import *  # noqa
from .views_api import *  # noqa
