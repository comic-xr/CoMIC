from pathlib import Path
from uuid import UUID

from fastapi import APIRouter
from fastapi.responses import ORJSONResponse
from sqlalchemy import select, update

from hloc_server import (
    DATABASE,
    FEATURES,
    MATCHES,
    SFM_DIR,
    SFM_PAIRS,
    datasets,
    outputs,
)
from hloc_src.hloc import (
    extract_features,
    match_features,
    pairs_from_retrieval,
    reconstruction,
)

from ..helpers.database import UUIDS

MapRouter = APIRouter(
    prefix="/map",
    tags=["Feature Extraction and Mapping"],
    responses={404: {"error": "Not found"}},
)


@MapRouter.post("/extract_match/{uuid}", response_class=ORJSONResponse)
async def extract_match_features(uuid: UUID):
    try:
        _session = select(
            UUIDS.c.dataset_dir,
            UUIDS.c.extract_conf,
            UUIDS.c.matcher_conf,
            UUIDS.c.map_generated,
            UUIDS.c.sfm_uploaded,
        ).where(UUIDS.c.uuid == str(uuid))
        _data = await DATABASE.fetch_one(_session)
        if _data[4]:
            return ORJSONResponse(
                content={"status": "Map already Uploaded, No need of generation"}
            )
        if _data[3]:
            return ORJSONResponse(content={"status": "Map already generated"})
        _no_images = 0
        _session_dataset = datasets / str(_data[0])
        _session_dataset_mapping = _session_dataset / "mapping"
        async for _ in _session_dataset_mapping.glob("*"):
            _no_images += 1
        if _no_images > 0:
            _session_outputs = outputs / str(uuid)
            await _session_outputs.mkdir(parents=True, exist_ok=True)
            _session_outputs = Path(_session_outputs)
            _features = _session_outputs / FEATURES
            _matches = _session_outputs / MATCHES
            _sfm_pairs = _session_outputs / SFM_PAIRS
            _session_outputs / SFM_DIR
            _netvlad_features = _session_outputs / "features_nevtvlad.h5"
            feature_conf = extract_features.confs[_data[1]]
            matcher_conf = match_features.confs[_data[2]]
            retrieval_conf = extract_features.confs["netvlad"]
            _session_dataset_mapping = Path(_session_dataset_mapping)
            retrieval_path = extract_features.main(
                retrieval_conf, _session_dataset_mapping, feature_path=_netvlad_features
            )
            pairs_from_retrieval.main(retrieval_path, _sfm_pairs, num_matched=100)
            extract_features.main(
                feature_conf, _session_dataset_mapping, feature_path=_features
            )
            match_features.main(
                matcher_conf, _sfm_pairs, features=_features, matches=_matches
            )
            return ORJSONResponse(
                content={
                    "status": "Extraction, Matching ran successfully and h5's saved"
                }
            )
        else:
            return ORJSONResponse(
                status_code=404, content={"status": "No Images found in the database"}
            )
    except Exception as e:
        print(str(e))


@MapRouter.post("/generate/{uuid}", response_class=ORJSONResponse)
async def generate_map(uuid: UUID):
    try:
        _session = select(
            UUIDS.c.dataset_dir,
            UUIDS.c.extract_conf,
            UUIDS.c.matcher_conf,
            UUIDS.c.map_generated,
            UUIDS.c.sfm_uploaded,
        ).where(UUIDS.c.uuid == str(uuid))
        _data = await DATABASE.fetch_one(_session)
        if _data[4]:
            return ORJSONResponse(
                content={"status": "Map already Uploaded, No need of generation"}
            )
        if _data[3]:
            return ORJSONResponse(content={"status": "Map already generated"})
        _no_images = 0
        _session_dataset = datasets / str(_data[0])
        _session_dataset_mapping = _session_dataset / "mapping"
        async for _ in _session_dataset_mapping.glob("*"):
            _no_images += 1
        if _no_images > 0:
            _session_outputs = outputs / str(uuid)
            await _session_outputs.mkdir(parents=True, exist_ok=True)
            _session_outputs = Path(_session_outputs)
            _session_dataset_mapping = Path(_session_dataset_mapping)
            _features = _session_outputs / FEATURES
            _matches = _session_outputs / MATCHES
            _sfm_pairs = _session_outputs / SFM_PAIRS
            _sfm_dir = _session_outputs / SFM_DIR
            reconstruction.main(
                _sfm_dir, _session_dataset_mapping, _sfm_pairs, _features, _matches
            )
            _update_q = (
                update(UUIDS)
                .where(UUIDS.c.uuid == str(uuid))
                .values(map_generated=True)
            )
            await DATABASE.execute(_update_q)
            return ORJSONResponse(
                content={"status": "SFM generated successfully and" "saved"}
            )
        else:
            return ORJSONResponse(
                status_code=404, content={"status": "No Images found in the database"}
            )
    except Exception as e:
        print(str(e))
