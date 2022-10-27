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

extern_ext_mount_static_files = None
def mount_static_files(path, app, name):
    if extern_ext_mount_static_files:
        extern_ext_mount_static_files(path, app, name)


extern_ext: APIRouter = APIRouter(prefix="/extern", tags=["extern"])


def extern_renderer():
    return template_renderer(["lnbits/extensions/extern/templates"])


def extern_extension_renderer():
    return template_renderer(["data/extern"])


from .views import *  # noqa
from .views_api import *  # noqa
