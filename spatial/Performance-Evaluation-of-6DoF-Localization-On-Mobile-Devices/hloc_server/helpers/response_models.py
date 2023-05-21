from typing import List
from uuid import UUID

from pydantic import BaseModel


class SessionCreationIn(BaseModel):
    name: str
    extractor_config: str
    matcher_config: str


class SessionCreationResponse(BaseModel):
    session_uuid: UUID


class SessionGet(BaseModel):
    uuid: str
    name: str
    extract_conf: str
    matcher_conf: str
    dataset_dir: str
    map_generated: bool
    time_added: str
    stop_data: bool
    sfm_uploaded: bool


class SessionGetAll(BaseModel):
    sessions_available: List[SessionGet]
