from typing import Annotated, List
from uuid import UUID, uuid4

import aiofiles
from fastapi import APIRouter, File, UploadFile
from fastapi.responses import ORJSONResponse
from sqlalchemy import select, update

from hloc_server import DATABASE, FEATURES, MATCHES, SFM_PAIRS, datasets, outputs

from ..helpers.database import UUIDS

DataSetRouter = APIRouter(
    prefix="/data",
    tags=["Dataset Upload"],
    responses={404: {"error": "Not found"}},
)


@DataSetRouter.post(
    "/upload/{uuid}",
    response_class=ORJSONResponse,
)
async def upload_data_set(
    uuid: UUID,
    images: Annotated[List[UploadFile], File(description="Multiple File Bytes")],
):
    try:
        _session = select(
            UUIDS.c.dataset_dir, UUIDS.c.stop_data, UUIDS.c.sfm_uploaded
        ).where(UUIDS.c.uuid == str(uuid))
        _data = await DATABASE.fetch_one(_session)
        if _data[2]:
            return ORJSONResponse(
                {"status": "You uploaded the SFM, So no more data upload"}
            )
        if _data[1]:
            return ORJSONResponse({"status": "Not Accepting images anymore"})
        session_dataset = datasets / _data[0]
        session_dataset_mapping = session_dataset / "mapping"
        await session_dataset_mapping.mkdir(parents=True, exist_ok=True)
        _new = 0
        for image in images:
            if image.content_type == "image/jpeg":
                async with aiofiles.open(
                    (
                        session_dataset_mapping
                        / (str(uuid4()) + "." + image.content_type.split("/")[1])
                    ),
                    mode="wb",
                ) as img:
                    await img.write(await image.read())
                _new += 1
        _saved = 0
        async for _ in session_dataset_mapping.glob("*"):
            _saved += 1
        return ORJSONResponse(
            status_code=201,
            content={
                "no_of_files_already_present": _saved - _new,
                "no_of_files_sent": len(images),
                "new_files_saved": _new,
            },
        )
    except Exception as e:
        print(e)


@DataSetRouter.post("/upload/stop/{uuid}", response_class=ORJSONResponse)
async def stop_accepting_data(uuid: UUID):
    try:
        _update_q = (
            update(UUIDS).where(UUIDS.c.uuid == str(uuid)).values(stop_data=True)
        )
        await DATABASE.execute(_update_q)
        return ORJSONResponse({"status": "New Image data will now be stopped"})
    except Exception as e:
        print(e)


@DataSetRouter.post("/sfm/upload/{uuid}", response_class=ORJSONResponse)
async def sfm_upload_data(
    uuid: UUID,
    bins: Annotated[List[UploadFile], File(description="Multiple File Bytes")],
):
    try:
        _accepted_files = {
            "features.h5": "application/x-hdf",
            "matches.h5": "application/x-hdf",
            "pairs-sfm.txt": "application/octet-stream",
            "cameras.bin": "application/octet-stream",
            "images.bin": "application/octet-stream",
            "points3D.bin": "application/octet-stream",
        }
        _session = select(UUIDS.c.dataset_dir, UUIDS.c.sfm_uploaded).where(
            UUIDS.c.uuid == str(uuid)
        )
        _data = await DATABASE.fetch_one(_session)
        _session_outputs = outputs / str(uuid)
        _no_images = 0

        if _data[1]:
            return ORJSONResponse(
                {"status": "You uploaded the SFM, So no more data upload"},
                status_code=404,
            )

        _session_dataset = datasets / str(_data[0])
        _session_dataset_mapping = _session_dataset / "mapping"
        async for _ in _session_dataset_mapping.glob("*"):
            _no_images += 1

        if _no_images == 0:
            return ORJSONResponse(
                {"status": "No images found in DB, first upload the dataset"},
                status_code=404,
            )

        _h5s = 0
        _sfm_bins = 0
        for _bin in bins:
            if _bin.filename in _accepted_files:
                if _bin.filename.endswith("h5") or _bin.filename.endswith("txt"):
                    _h5s += 1
                elif _bin.filename.endswith("bin"):
                    _sfm_bins += 1

        _h5s_exist: bool = False

        if (
            await (_session_outputs / FEATURES).is_file()
            and await (_session_outputs / MATCHES).is_file()
            and await (_session_outputs / SFM_PAIRS).is_file()
        ):
            _h5s_exist = True

        if _h5s_exist:
            print("Features are already Extracted and matched")
            if _sfm_bins != 3:
                return ORJSONResponse(
                    {"status": "SFM Not Sent", "files_required": _accepted_files},
                    status_code=404,
                )
        else:
            if _sfm_bins == 3 and _h5s != 3:
                return ORJSONResponse(
                    {
                        "status": "SFM sent but the h5's or sfm pairs are not uploaded, please "
                        "generate them through end point if possible",
                        "files_required": _accepted_files,
                    },
                    status_code=404,
                )
            else:
                return ORJSONResponse(
                    {
                        "status": "SFM and h5's are not uploaded",
                        "files_required": _accepted_files,
                    },
                    status_code=404,
                )

        for _bin in bins:
            if _bin.filename in _accepted_files:
                if _bin.filename.endswith("h5"):
                    if not _h5s_exist:
                        async with aiofiles.open(
                            _session_outputs / _bin.filename, mode="wb"
                        ) as h5:
                            await h5.write(await _bin.read())
                else:
                    async with aiofiles.open(
                        _session_outputs / ("sfm/" + _bin.filename), mode="wb"
                    ) as binary:
                        await binary.write(await _bin.read())

        _update_q = (
            update(UUIDS)
            .where(UUIDS.c.uuid == str(uuid))
            .values(map_generated=True, sfm_uploaded=True, stop_data=True)
        )
        await DATABASE.execute(_update_q)
        return ORJSONResponse({"status": "Well, the map is saved, m"})
    except Exception as e:
        print(e)
