from aiopath import AsyncPath
from databases import Database
from orm import ModelRegistry

__version__ = "0.0.1"
API_KEY = "test"
DB_URL = "sqlite:///./sessions.sqlite"
DATABASE = Database(DB_URL)

SFM_PAIRS = "pairs-sfm.txt"
LOC_PAIRS = "pairs-loc.txt"
SFM_DIR = "sfm"
FEATURES = "features.h5"
MATCHES = "matches.h5"
data = AsyncPath("data")
datasets = data / "datasets"
outputs = data / "outputs"
