from pathlib import Path
from typing import Annotated
from uuid import UUID, uuid4

import aiofiles
from fastapi import APIRouter, File, UploadFile
from fastapi.responses import ORJSONResponse
from pycolmap import Reconstruction, infer_camera_from_image
from sqlalchemy import select

from hloc_server import (
    DATABASE,
    FEATURES,
    LOC_PAIRS,
    MATCHES,
    SFM_DIR,
    SFM_PAIRS,
    datasets,
    outputs,
)
from hloc_src.hloc import extract_features, match_features, pairs_from_exhaustive
from hloc_src.hloc.localize_sfm import QueryLocalizer, pose_from_cluster

from ..helpers.database import UUIDS

LocalizeRouter = APIRouter(
    prefix="/localize",
    tags=["Localization route"],
    responses={404: {"error": "Not found"}},
)


@LocalizeRouter.post(
    "/{uuid}",
    response_class=ORJSONResponse,
)
async def localize_image(
    uuid: UUID,
    image: Annotated[
        UploadFile, File(description="Upload the image that needs to be localized")
    ],
):
    try:
        _session = select(
            UUIDS.c.dataset_dir,
            UUIDS.c.extract_conf,
            UUIDS.c.matcher_conf,
            UUIDS.c.map_generated,
        ).where(UUIDS.c.uuid == str(uuid))
        _data = await DATABASE.fetch_one(_session)
        if not _data[3]:
            return ORJSONResponse(
                content={"status": "Map already not uploaded/generated"}
            )
        _session_dataset = datasets / str(_data[0])
        _session_dataset / "mapping"
        _session_query = _session_dataset / "query"
        await _session_query.mkdir(parents=True, exist_ok=True)
        if image.content_type != "image/jpeg":
            return ORJSONResponse(content={"status": " Only Jpeg files are accepted"})
        q_uuid = uuid4()
        _query = "query/" + (str(q_uuid) + "." + "jpeg")
        async with aiofiles.open(_session_dataset / _query, mode="wb") as img:
            await img.write(await image.read())

        _session_outputs = outputs / str(uuid)
        _session_outputs = Path(_session_outputs)
        _features = _session_outputs / FEATURES
        _matches = _session_outputs / MATCHES
        _session_outputs / SFM_PAIRS
        _loc_pairs = _session_outputs / LOC_PAIRS
        _sfm_dir = _session_outputs / SFM_DIR
        _query = Path(_query)

        feature_conf = extract_features.confs[_data[1]]
        matcher_conf = match_features.confs[_data[2]]
        _session_dataset = Path(_session_dataset)
        _session_query = Path(_session_query)
        extract_features.main(
            feature_conf,
            _session_dataset,
            image_list=[str(_query)],
            feature_path=_features,
            overwrite=True,
        )
        model = Reconstruction(_sfm_dir)
        references_registered = [model.images[i].name for i in model.reg_image_ids()]
        pairs_from_exhaustive.main(
            _loc_pairs, image_list=[str(_query)], ref_list=references_registered
        )
        match_features.main(
            matcher_conf,
            _loc_pairs,
            features=_features,
            matches=_matches,
            overwrite=True,
        )
        _camera = infer_camera_from_image(_session_dataset / _query)
        _ref_ids = [
            model.find_image_with_name(n).image_id for n in references_registered
        ]
        conf = {
            "estimation": {"ransac": {"max_error": 12}},
            "refinement": {"refine_focal_length": True, "refine_extra_params": True},
        }
        localizer = QueryLocalizer(model, conf)
        ret, log = pose_from_cluster(
            localizer, str(_query), _camera, _ref_ids, _features, _matches
        )
        return ORJSONResponse(
            content={"pose": {"tvec": ret["tvec"], "qvec": ret["qvec"]}}
        )
    except Exception as e:
        print(e)
