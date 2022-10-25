from fastapi import APIRouter
from fastapi.staticfiles import StaticFiles

from lnbits.db import Database
from lnbits.helpers import template_renderer

db = Database("ext_watchonly")

watchonly_static_files = [
    {
        "path": "/watchonly/static",
        "app": StaticFiles(directory="lnbits/extensions/watchonly/static"),
        "name": "watchonly_static",
    },
    {
        "path": "/watchonly-dashboard",
        "app": StaticFiles(directory="lnbits/data/extern/a3157ecf703142459d8f41beeaf5d5fc/dashboard/dist"),
        "name": "watchonly_dashboard_static",
    },
    {
        "path": "/watchonly/angular",
        "app": StaticFiles(directory="lnbits/data/extern/a3157ecf703142459d8f41beeaf5d5fc/angular/dist"),
        "name": "watchonly_angular_static",
    }
]

watchonly_ext: APIRouter = APIRouter(prefix="/watchonly", tags=["watchonly"])


def watchonly_renderer():
    return template_renderer(["lnbits/extensions/watchonly/templates"])


def extern_renderer():
    return template_renderer(["lnbits/data/extern"])


from .views import *  # noqa
from .views_api import *  # noqa
