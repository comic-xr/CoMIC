import os
from json import JSONEncoder

import numpy
import numpy as np

from hloc_src.hloc.utils import read_write_model


def get_point_cloud(base_dir):
    points = read_write_model.read_points3D_binary(
        os.path.join(base_dir, "points3D.bin")
    )
    return np.asarray([point3D.xyz for _, point3D in points.items()])


class NDArrayEncoder(JSONEncoder):
    def default(self, obj):
        if isinstance(obj, numpy.ndarray):
            return obj.tolist()
        return JSONEncoder.default(self, obj)
