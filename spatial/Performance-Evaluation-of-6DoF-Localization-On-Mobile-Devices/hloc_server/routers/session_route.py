from datetime import datetime
from uuid import UUID, uuid4

from fastapi import APIRouter
from fastapi.encoders import jsonable_encoder
from fastapi.responses import ORJSONResponse
from sqlalchemy import select

from hloc_server import DATABASE

from ..helpers.database import UUIDS
from ..helpers.response_models import (
    SessionCreationIn,
    SessionCreationResponse,
    SessionGet,
    SessionGetAll,
)

SessionRouter = APIRouter(
    prefix="/session",
    tags=["Sessions"],
    responses={404: {"error": "Not found"}},
)


@SessionRouter.post(
    "/create", response_class=ORJSONResponse, response_model=SessionCreationResponse
)
async def get_a_session(session_config: SessionCreationIn):
    try:
        _uuid = uuid4()

        _q = UUIDS.insert().values(
            uuid=str(_uuid),
            name=session_config.name,
            extract_conf=session_config.extractor_config,
            dataset_dir=str(uuid4()),
            map_generated=False,
            matcher_conf=session_config.matcher_config,
            time_added=datetime.now(),
            stop_data=False,
            sfm_uploaded=False,
        )
        await DATABASE.execute(_q)
        return ORJSONResponse(content={"session_uuid": _uuid})
    except Exception as e:
        print(e)


@SessionRouter.post(
    "/copy/{uuid}",
    response_class=ORJSONResponse,
    response_model=SessionCreationResponse,
)
async def copy_a_session(uuid: UUID, session_config: SessionCreationIn):
    try:
        _uuid = uuid4()
        old_session_uuid = select(UUIDS.c.dataset_dir).where(UUIDS.c.uuid == str(uuid))
        _data_dir = await DATABASE.fetch_val(old_session_uuid)

        _q = UUIDS.insert().values(
            uuid=str(_uuid),
            name=session_config.name,
            extract_conf=session_config.extractor_config,
            dataset_dir=_data_dir,
            map_generated=False,
            matcher_conf=session_config.matcher_config,
            time_added=datetime.now(),
            stop_data=False,
            sfm_uploaded=False,
        )
        await DATABASE.execute(_q)
        return ORJSONResponse(content={"session_uuid": _uuid})
    except Exception as e:
        print(e)


@SessionRouter.delete(
    "/delete/{uuid}",
    response_class=ORJSONResponse,
    response_model=SessionCreationResponse,
)
async def delete_session(uuid: UUID):
    try:
        _q = UUIDS.delete().where(UUIDS.c.uuid == str(uuid))
        await DATABASE.execute(_q)
        return ORJSONResponse(content={"session_uuid": uuid})
    except Exception as e:
        print(e)


@SessionRouter.get(
    "/get/{uuid}", response_class=ORJSONResponse, response_model=SessionGet
)
async def get_session(uuid: UUID):
    try:
        _session_q = UUIDS.select().where(UUIDS.c.uuid == str(uuid))
        _session = await DATABASE.fetch_one(_session_q)
        return ORJSONResponse(content=jsonable_encoder(_session))
    except Exception as e:
        print(e)


@SessionRouter.get("/all", response_class=ORJSONResponse, response_model=SessionGetAll)
async def get_all_sessions():
    try:
        _all = UUIDS.select()
        _data = await DATABASE.fetch_all(_all)
        # if len(_data) == 0:
        #     raise HTTPException(
        #         status_code=404, detail={"status": "Nothing Found, Create a Session first"}
        #     )
        return ORJSONResponse(
            content={"sessions_available": [jsonable_encoder(data) for data in _data]}
        )
    except Exception as e:
        print(e)


@SessionRouter.delete("/all", response_class=ORJSONResponse)
async def delete_all_sessions():
    try:
        _q = UUIDS.delete()
        await DATABASE.execute(_q)
        return ORJSONResponse(content={"result": "Deleted all the sessions"})
    except Exception as e:
        print(e)
