import sqlalchemy

from hloc_server import DB_URL

metadata = sqlalchemy.MetaData()


UUIDS = sqlalchemy.Table(
    "UUIDS",
    metadata,
    sqlalchemy.Column("uuid", sqlalchemy.String(40), primary_key=True),
    sqlalchemy.Column("name", sqlalchemy.String(30)),
    sqlalchemy.Column("extract_conf", sqlalchemy.String(20)),
    sqlalchemy.Column("matcher_conf", sqlalchemy.String(20)),
    sqlalchemy.Column("dataset_dir", sqlalchemy.String(40)),
    sqlalchemy.Column("map_generated", sqlalchemy.Boolean),
    sqlalchemy.Column("time_added", sqlalchemy.DateTime),
    sqlalchemy.Column("stop_data", sqlalchemy.Boolean),
    sqlalchemy.Column("sfm_uploaded", sqlalchemy.Boolean),
)

engine = sqlalchemy.create_engine(DB_URL, connect_args={"check_same_thread": False})
metadata.create_all(engine)
