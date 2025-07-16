import numpy as np
import os
from plyfile import PlyData, PlyElement
import json
import argparse

class scene_voxel:
    def __init__(self, voxel_dim, voxel_size, ply : PlyData):
        self.voxel_size = voxel_size
        self.voxel_dim = voxel_dim
        self.ply = ply
        self.voxels = {}
    def get_bound(self):
        max_x = np.max(self.ply.elements[0]["x"])
        max_y = np.max(self.ply.elements[0]["y"])
        max_z = np.max(self.ply.elements[0]["z"])
        min_x = np.min(self.ply.elements[0]["x"])
        min_y = np.min(self.ply.elements[0]["y"])
        min_z = np.min(self.ply.elements[0]["z"])
        return (max_x, max_y, max_z), (min_x, min_y, min_z)
    def split(self):
        upper_bound, low_bound = self.get_bound()

        voxel_num_z = self.voxel_dim[2]
        voxel_num_y = self.voxel_dim[1]
        voxel_num_x = self.voxel_dim[0]

        for i in range(voxel_num_z):
            for j in range(voxel_num_y):
                for k in range(voxel_num_x):
                    voxel_range = np.array([low_bound[0] + k * self.voxel_size[0], low_bound[1] + j * self.voxel_size[1], low_bound[2] + i * self.voxel_size[2]])
                    id = 'x_'+str(k)  + 'y_' + str(j) + 'z_' + str(i)
                    self.voxels[id] = voxel_range.tolist()
        return self.voxels


def voxelize(voxels:dict, voxels_id : str,voxel_size, xyz):
    voxel_range = voxels[voxels_id]
    low_x = voxel_range[0]
    upper_x = voxel_range[0] + voxel_size[0]

    low_y = voxel_range[1]
    upper_y = voxel_range[1] + voxel_size[1]

    low_z = voxel_range[2]
    upper_z = voxel_range[2] + voxel_size[2]


    #print(low_x, low_y, low_z, upper_x, upper_y, upper_z)
    bound = [low_x, low_y, low_z, upper_x, upper_y, upper_z]

    x_indices = np.where((xyz[:, 0] >= low_x) & (xyz[:, 0] <= upper_x))

    y_indices = np.where((xyz[:, 1] >= low_y) & (xyz[:, 1] <= upper_y))

    z_indices = np.where((xyz[:, 2] >= low_z) & (xyz[:, 2] <= upper_z))


    indices = np.intersect1d(z_indices, np.intersect1d(x_indices, y_indices))

    return indices,bound

def save_voxel(plydata,indices,path):
    xyz = np.stack((np.asarray(plydata.elements[0]["x"]),
                    np.asarray(plydata.elements[0]["y"]),
                    np.asarray(plydata.elements[0]["z"])), axis=1)

    # feature
    features_dc = np.zeros((xyz.shape[0], 3, 1))
    features_dc[:, 0, 0] = np.asarray(plydata.elements[0]["f_dc_0"])
    features_dc[:, 1, 0] = np.asarray(plydata.elements[0]["f_dc_1"])
    features_dc[:, 2, 0] = np.asarray(plydata.elements[0]["f_dc_2"])

    # scale
    scale_names = [p.name for p in plydata.elements[0].properties if p.name.startswith("scale_")]
    scale_names = sorted(scale_names, key=lambda x: int(x.split('_')[-1]))
    scales = np.zeros((xyz.shape[0], len(scale_names)))
    for idx, attr_name in enumerate(scale_names):
        scales[:, idx] = np.asarray(plydata.elements[0][attr_name])
    # rotation
    rot_names = [p.name for p in plydata.elements[0].properties if p.name.startswith("rot")]
    rot_names = sorted(rot_names, key=lambda x: int(x.split('_')[-1]))
    rots = np.zeros((xyz.shape[0], len(rot_names)))
    for idx, attr_name in enumerate(rot_names):
        rots[:, idx] = np.asarray(plydata.elements[0][attr_name])
    # opacity
    opacities = np.asarray(plydata.elements[0]["opacity"])[..., np.newaxis]

    # f_rest
    extra_f_names = [p.name for p in plydata.elements[0].properties if p.name.startswith("f_rest_")]
    extra_f_names = sorted(extra_f_names, key=lambda x: int(x.split('_')[-1]))
    assert len(extra_f_names) == 3 * (max_sh_degree + 1) ** 2 - 3
    features_extra = np.zeros((xyz.shape[0], len(extra_f_names)))
    for idx, attr_name in enumerate(extra_f_names):
        features_extra[:, idx] = np.asarray(plydata.elements[0][attr_name])
    # Reshape (P,F*SH_coeffs) to (P, F, SH_coeffs except DC)
    features_extra = features_extra.reshape((features_extra.shape[0], 3, (max_sh_degree + 1) ** 2 - 1))


    de_xyz = xyz[indices]
    normals = np.zeros_like(de_xyz)
    de_f_dc = features_dc[indices].reshape(features_dc[indices].shape[0], -1)  # .contiguous() #start_dim=1
    de_f_rest = features_extra[indices].reshape(features_extra[indices].shape[0], -1)  # .contiguous()#start_dim=1
    de_opacities = opacities[indices]
    de_scale = scales[indices]
    de_rotation = rots[indices]

    construct_list_of_attributes = ['x', 'y', 'z', 'nx', 'ny', 'nz', "f_dc_0", "f_dc_1", "f_dc_2", ]
    for name in extra_f_names:
        construct_list_of_attributes.append(name)
    construct_list_of_attributes.append('opacity')
    for name in scale_names:
        construct_list_of_attributes.append(name)
    for name in rot_names:
        construct_list_of_attributes.append(name)
    dtype_full = [(attribute, 'f4') for attribute in construct_list_of_attributes]

    elements = np.empty(de_xyz.shape[0], dtype=dtype_full)
    attributes = np.concatenate((de_xyz, normals, de_f_dc, de_f_rest, de_opacities, de_scale, de_rotation), axis=1)
    elements[:] = list(map(tuple, attributes))
    el = PlyElement.describe(elements, 'vertex')
    PlyData([el]).write(path)

max_sh_degree = 3


def process_ply_to_voxels(ply_file_path, output_folder, scene_name):
    plydata = PlyData.read(ply_file_path)
    xyz = np.stack((np.asarray(plydata.elements[0]["x"], dtype=np.float32),
                    np.asarray(plydata.elements[0]["y"], dtype=np.float32),
                    np.asarray(plydata.elements[0]["z"], dtype=np.float32)), axis=1)

    print("Processing ", scene_name)

    if scene_name in ['bonsai', 'drjohnson', 'flowers', 'playroom', 'room']:
        shape = [10, 10, 10]
    elif scene_name in ['stump', 'train', 'treehill', 'garden']:
        shape = [20, 10, 10]
    elif scene_name == 'truck':
        shape = [10, 3, 10]
    elif scene_name in ['bicycle', 'kitchen']:
        shape = [10, 10, 20]
    else:
        raise ValueError(f"Unknown scene name: {scene_name}")

    x_size = (np.max(plydata.elements[0]["x"]) - np.min(plydata.elements[0]["x"])) / shape[0]
    y_size = (np.max(plydata.elements[0]["y"]) - np.min(plydata.elements[0]["y"])) / shape[1]
    z_size = (np.max(plydata.elements[0]["z"]) - np.min(plydata.elements[0]["z"])) / shape[2]
    size = (x_size, y_size, z_size)

    print(np.max(plydata.elements[0]["x"]) - np.min(plydata.elements[0]["x"]),
          np.max(plydata.elements[0]["y"]) - np.min(plydata.elements[0]["y"]),
          np.max(plydata.elements[0]["z"]) - np.min(plydata.elements[0]["z"]))

    scene = scene_voxel(voxel_dim=shape, voxel_size=size, ply=plydata)
    voxels = scene.split()

    voxel_folder = os.path.join(output_folder, 'voxels_new')
    os.makedirs(voxel_folder, exist_ok=True)

    voxel_geometry = {}
    for key in voxels.keys():
        indices, bound = voxelize(voxels, key, size, xyz)

        if len(indices) > 0:
            voxel_geometry[key] = {
                'leftBottom': [bound[0], bound[1], bound[2]],
                'rightTop': [bound[3], bound[4], bound[5]]
            }
            path = os.path.join(voxel_folder, f'{key}.ply')
            save_voxel(plydata, indices, path)
            print(f'Saved ply {key}.ply')

    # Save voxel geometry to JSON
    json_path = os.path.join(output_folder, 'voxel_new.json')
    with open(json_path, 'w') as outfile:
       json.dump(voxel_geometry, outfile, default=lambda x: float(x), indent=4)

    print(f'Voxel processing complete. Output saved to {output_folder}')


# Main function
def main(ply_file_path, output_folder, scene_name):
    process_ply_to_voxels(ply_file_path, output_folder, scene_name)


# Example usage
if __name__ == "__main__":

    parser = argparse.ArgumentParser(description="Process PLY files into voxel data.")
    parser.add_argument("--ply_file_path", type=str, required=True, help="Path to the PLY file.")
    parser.add_argument("--scene_name", type=str, required=True, help="Scene name for voxel processing.")
    parser.add_argument("--output_folder", type=str, required=True, help="Output folder for voxel data.")



    args = parser.parse_args()
    main(args.ply_file_path, args.output_folder, args.scene_name)









