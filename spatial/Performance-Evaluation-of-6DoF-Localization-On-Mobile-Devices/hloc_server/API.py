import time

from fastapi import FastAPI, Request, Security

from hloc_server import DATABASE, __version__, datasets, outputs

from .helpers.api_key_helper import verify_api_key
from .routers import *

HLoc = FastAPI(
    title="Hierarchical Localization",
    version=__version__,
    docs_url="/docs",
    redoc_url=None,
    openapi_url="/h_loc.json",
    dependencies=[Security(verify_api_key)],
)


@HLoc.on_event("startup")
async def database_dir_init():
    await DATABASE.connect()
    await outputs.mkdir(parents=True, exist_ok=True)
    await datasets.mkdir(parents=True, exist_ok=True)


@HLoc.on_event("shutdown")
async def database_close():
    await DATABASE.disconnect()


#
@HLoc.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(round(process_time * 1000, 3)) + " ms"
    return response


HLoc.include_router(SessionRouter)
HLoc.include_router(DataSetRouter)
HLoc.include_router(MapRouter)
HLoc.include_router(LocalizeRouter)
HLoc.include_router(PointCloudRouter)
