import json
import os.path
import numpy as np
from plyfile import PlyData, PlyElement

def cal_voxel_id(row_index,shape):
    z = int(row_index / (shape[0] * shape[1]))
    y_remainder = row_index % (shape[0] * shape[1])
    y = int(y_remainder / shape[0])
    x = y_remainder % shape[0]

    return x,y,z

def get_voxel_bound(A,combination_id,start_point,basic_voxel_size,shape):
    column = A[:,combination_id]
    voxels = np.where(column == 1)[0]
    first_voxel, last_voxel = voxels[0], voxels[-1]
    #print(first_voxel)
    #print(last_voxel)
    low_x, low_y, low_z = cal_voxel_id(first_voxel,shape)
    up_x, up_y, up_z = cal_voxel_id(last_voxel,shape)
    #print(low_x, low_y, low_z)
    #print(up_x, up_y, up_z)
    low_bound_x = start_point[0] + low_x * basic_voxel_size[0]
    low_bound_y = start_point[1] + low_y * basic_voxel_size[1]
    low_bound_z = start_point[2] + low_z * basic_voxel_size[2]

    upper_x = start_point[0] + (up_x + 1) * basic_voxel_size[0]
    upper_y = start_point[1] + (up_y + 1) * basic_voxel_size[1]
    upper_z = start_point[2] + (up_z + 1) * basic_voxel_size[2]

    return low_bound_x, low_bound_y, low_bound_z, upper_x, upper_y, upper_z


def voxelize(voxels_bound, xyz):

    low_x, low_y, low_z, upper_x, upper_y, upper_z = voxels_bound
    print(low_x, low_y, low_z, upper_x, upper_y, upper_z)

    x_indices = np.where((xyz[:, 0] >= low_x) & (xyz[:, 0] <= upper_x))
    #print(x_indices)

    y_indices = np.where((xyz[:, 1] >= low_y) & (xyz[:, 1] <= upper_y))
    #print(y_indices)

    z_indices = np.where((xyz[:, 2] >= low_z) & (xyz[:, 2] <= upper_z))
    #print(z_indices)


    indices = np.intersect1d(z_indices, np.intersect1d(x_indices, y_indices))

    print(indices)


    return indices

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

def process_optimal_voxels(matrix_a_path, c_cost_path, ply_file_path, x_solution_path, output_folder, scene_name):
    # Define shape based on scene name
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

    # Load matrix A and C_cost
    A = np.load(matrix_a_path)
    C_store = np.load(c_cost_path)

    # Load x_solution
    data = np.load(x_solution_path)
    x = np.where(data == 1)[0]

    # Read the PLY file
    plydata = PlyData.read(ply_file_path)
    xyz = np.stack((np.asarray(plydata.elements[0]["x"], dtype=np.float32),
                    np.asarray(plydata.elements[0]["y"], dtype=np.float32),
                    np.asarray(plydata.elements[0]["z"], dtype=np.float32)), axis=1)
    print(xyz.shape)
    print(np.min(xyz[:, 1]), np.max(xyz[:, 1]))

    # Calculate voxel size
    start_point = [np.min(xyz[:, 0]), np.min(xyz[:, 1]), np.min(xyz[:, 2])]
    size_x = (np.max(xyz[:, 0]) - np.min(xyz[:, 0])) / shape[0]
    size_y = (np.max(xyz[:, 1]) - np.min(xyz[:, 1])) / shape[1]
    size_z = (np.max(xyz[:, 2]) - np.min(xyz[:, 2])) / shape[2]
    size = [size_x, size_y, size_z]
    print(size)

    # Ensure output folder exists
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    voxel_json = {}

    for i in range(x.shape[0]):
        #print(x[i])
        if C_store[x[i]] == 0:
            print('empty voxels')
        else:
            boudary = get_voxel_bound(A, x[i], start_point, size, shape)
            voxel = {
                'leftBottom': [boudary[0], boudary[1], boudary[2]],
                'rightTop': [boudary[3], boudary[4], boudary[5]],
            }
            voxel_size = np.array(voxel['rightTop']) - np.array(voxel['leftBottom'])
            v = voxel_size[0] * voxel_size[1] * voxel_size[2]
            indices = voxelize(boudary, xyz)
            voxel['num'] = indices.shape[0]
            voxel['density'] = indices.shape[0] / v
            voxel_json[str(i)] = voxel

            written_path = os.path.join(output_folder, f"{i}.ply")
            save_voxel(plydata, indices, written_path)

    # Save voxel JSON file
    json_output_path = os.path.join(output_folder, "voxel_ilp.json")
    with open(json_output_path, 'w') as outfile:
        json.dump(voxel_json,outfile,default=lambda x: float(x),indent=4)

    print(f"Processed optimal voxels saved in {output_folder}")

def main(matrix_a_path, c_cost_path, ply_file_path, x_solution_path, output_folder, scene_name):
    process_optimal_voxels(matrix_a_path, c_cost_path, ply_file_path, x_solution_path, output_folder, scene_name)

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Process optimal voxels from inputs.")
    parser.add_argument("--matrix_a_path", type=str, required=True, help="Path to the matrix_A.npy file.")
    parser.add_argument("--c_cost_path", type=str, required=True, help="Path to the C_cost.npy file.")
    parser.add_argument("--ply_file_path", type=str, required=True, help="Path to the PLY file.")
    parser.add_argument("--x_solution_path", type=str, required=True, help="Path to the x_solution.npy file.")
    parser.add_argument("--output_folder", type=str, required=True, help="Folder to save the output voxel data.")
    parser.add_argument("--scene_name", type=str, required=True, help="Scene name for processing.")

    args = parser.parse_args()
    main(args.matrix_a_path, args.c_cost_path, args.ply_file_path, args.x_solution_path, args.output_folder, args.scene_name)

