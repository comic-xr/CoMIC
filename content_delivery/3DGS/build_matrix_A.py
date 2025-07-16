import json
import numpy as np
from plyfile import PlyData, PlyElement
import os
import argparse
def calculate_subvoxel(nx,ny,nz):
    boundx = nx
    boundy = ny
    boundz = nz
    num = 0
    for start_z in range(nz):
        for start_y in range(ny):
            for start_x in range(nx):
                for tile_z in range(1,boundz-start_z+1,1):
                    for tile_y in range(1, boundy - start_y+1, 1):
                        for tile_x in range(1, boundx - start_x+1, 1):
                            num += 1

    return num

def basic_voxel_cost(nx,ny,nz,xyz):
    basic_voxel_dict = {}
    start_point = [np.min(xyz[:, 0]), np.min(xyz[:, 1]), np.min(xyz[:, 2])]
    size_x = (np.max(xyz[:, 0]) - np.min(xyz[:, 0])) / nx
    size_y = (np.max(xyz[:, 1]) - np.min(xyz[:, 1])) / ny
    size_z = (np.max(xyz[:, 2]) - np.min(xyz[:, 2])) / nz

    for z in range(nz):
        for y in range(ny):
            for x in range(nx):
                minx = start_point[0] + x * size_x
                maxx = minx + size_x
                miny = start_point[1] + y * size_y
                maxy = miny + size_y
                minz = start_point[2] + z * size_z
                maxz = minz + size_z

                voxel_range = [minx,miny,minz,maxx,maxy,maxz]
                voxel_id = 'x' + str(x) + 'y' + str(y) + 'z' + str(z)
                voxel = {}
                voxel['id'] = voxel_id
                voxel['voxel_range'] = voxel_range
                x_indices = np.where((xyz[:, 0] >= minx) & (xyz[:, 0] <= maxx))
                y_indices = np.where((xyz[:, 1] >= miny) & (xyz[:, 1] <= maxy))
                z_indices = np.where((xyz[:, 2] >= minz) & (xyz[:, 2] <= maxz))
                indices = np.intersect1d(z_indices,
                                         np.intersect1d(x_indices, y_indices))
                voxel_gaussian_num = indices.shape[0]
                voxel['cost'] = voxel_gaussian_num
                basic_voxel_dict[voxel_id] = voxel

                #print(voxel)
    return basic_voxel_dict

def build_matrixA(nx,ny,nz,xyz):
    boundx = nx
    boundy = ny
    boundz = nz
    voxel_dict = basic_voxel_cost(nx, ny, nz, xyz)
    #print(voxel_dict)
    num = calculate_subvoxel(nx,ny,nz)
    matrixA = np.zeros(shape=(nx*ny*nz,num))
    C_cost = np.zeros(shape=(num,1))
    column = 0
    for start_z in range(nz):
        for start_y in range(ny):
            for start_x in range(nx):
                for tile_z in range(1, boundz - start_z + 1, 1):
                    for tile_y in range(1, boundy - start_y + 1, 1):
                        for tile_x in range(1, boundx - start_x + 1, 1):
                            #For each combination, the basic voxels will be included
                            cost = 0
                            row = 0
                            for z in range(nz):
                                for y in range(ny):
                                    for x in range(nx):
                                        if x >= start_x and y >= start_y and z >=start_z and x < start_x + tile_x and y < start_y + tile_y and z < start_z + tile_z:
                                            #means current combination includes basic voxel at (x,y,z)

                                            matrixA[row][column] = 1
                                            v_id = 'x' + str(x) + 'y' + str(y) + 'z' + str(z)
                                            voxel_gaussian_num = voxel_dict[v_id]['cost']
                                            cost += voxel_gaussian_num

                                        row += 1 #next voxel
                            C_cost[column] = cost
                            #print('cost',cost)
                            column += 1 #next combination
    return matrixA, C_cost
def process_ply_to_matrix(ply_file_path, output_folder, scene_name):
    plydata = PlyData.read(ply_file_path)
    xyz = np.stack((np.asarray(plydata.elements[0]["x"], dtype=np.float32),
                    np.asarray(plydata.elements[0]["y"], dtype=np.float32),
                    np.asarray(plydata.elements[0]["z"], dtype=np.float32)), axis=1)

    print(xyz.shape)
    if scene_name in ['bonsai', 'drjohnson', 'flowers', 'playroom', 'room']:
        shape = [10, 10, 10]
    elif scene_name in ['stump', 'train', 'treehill','garden']:
        shape = [20, 10, 10]
    elif scene_name == 'truck':
        shape = [10, 3, 10]
    elif scene_name in ['bicycle', 'kitchen']:
        shape = [10, 10, 20]
    else:
        raise ValueError(f"Unknown scene name: {scene_name}")

    A, C_cost = build_matrixA(shape[0], shape[1], shape[2], xyz)
    C_store_0_1 = np.copy(C_cost)
    C_store_0_1[C_store_0_1 > 0] = 1

    matrix_a_path = os.path.join(output_folder, 'matrix_A.npy')
    c_cost_path = os.path.join(output_folder, 'C_cost.npy')
    c_cost_0_1_path = os.path.join(output_folder, 'C_store_0and1.npy')

    np.save(matrix_a_path, A.astype(np.uint8))
    np.save(c_cost_path, C_cost)
    np.save(c_cost_0_1_path, C_store_0_1)

    print(A.shape)
    print(C_cost.shape)
    print(np.sum(C_store_0_1))
    #print('A:', A)
    #print('C_cost:', C_cost)

def main(ply_file_path, output_folder, scene_name):
    process_ply_to_matrix(ply_file_path, output_folder, scene_name)

if __name__ == "__main__":

    parser = argparse.ArgumentParser(description="Process PLY files into matrices A and C_cost.")
    parser.add_argument("--ply_file_path", type=str, required=True, help="Path to the PLY file.")
    parser.add_argument("--output_folder", type=str, required=True, help="Output folder for the matrices.")
    parser.add_argument("--scene_name", type=str, required=True, help="Scene name for processing.")

    args = parser.parse_args()
    main(args.ply_file_path, args.output_folder, args.scene_name)

