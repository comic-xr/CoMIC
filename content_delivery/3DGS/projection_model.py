import numpy as np
import json
import math
import re
import os
from plyfile import PlyData, PlyElement
import argparse
def point_triangle(A, B, C, P):
    def barycentric_coordinates(A, B, C, P):
        detT = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1])
        alpha = ((B[1] - C[1]) * (P[0] - C[0]) + (C[0] - B[0]) * (P[1] - C[1])) / detT
        beta = ((C[1] - A[1]) * (P[0] - C[0]) + (A[0] - C[0]) * (P[1] - C[1])) / detT
        gamma = 1 - alpha - beta
        return 0 < alpha < 1 and 0 < beta < 1 and 0 < gamma < 1

    return barycentric_coordinates(A, B, C, P)

def point_in_AABB(point,AABB):
    #AABB[xmin,xmax,ymin,ymax]
    if point[0] > AABB[0] and point[0] < AABB[1] and point[1] > AABB[2] and point[1] < AABB[3]:
        return True
    else:
        return False

def edge_intersect(e1, e2):
    p1,p2 = e1[0],e1[1]
    p3,p4 = e2[0],e2[1]
    x1,y1 = p1[0],p1[1]
    x2,y2 = p2[0],p2[1]
    x3,y3 = p3[0],p3[1]
    x4,y4 = p4[0],p4[1]
    denom = (y4-y3)*(x2-x1) - (x4-x3)*(y2-y1)
    if denom == 0: # parallel
        return False
    ua = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / denom
    if ua <= 0 or ua >= 1: # out of range
        return False
    ub = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / denom
    if ub <= 0 or ub >= 1: # out of range
        return False
    return True

def creat_triangle(p1,p2,p3):
    vertices = [p1,p2,p3]
    edges = [(p1,p2),(p1,p3),(p2,p3)]
    return vertices,edges

def create_quad(v1,v2,v3,v4):
    # v1: left top v2: right top v3: left bottom v4: right bottom
    vertices = [v1,v2,v3,v4]
    edges = [(v1,v2),(v2,v4),(v4,v3),(v3,v1)]
    return vertices,edges


def create_cube(left_bottom, size):

    v6 = left_bottom
    v0 = np.array([v6[0] + size[0], v6[1] + size[1], v6[2] + size[2]]).reshape((1, 3))
    v1 = np.array([v6[0] + size[0], v6[1], v6[2] + size[2]]).reshape((1,3))
    v2 = np.array([v6[0], v6[1], v6[2] + size[2]]).reshape((1,3))
    v3 = np.array([v6[0], v6[1] + size[1], v6[2] + size[2]]).reshape((1,3))
    v4 = np.array([v6[0] + size[0], v6[1] + size[1], v6[2]]).reshape((1,3))
    v5 = np.array([v6[0] + size[0], v6[1], v6[2]]).reshape((1,3))
    v7 = np.array([v6[0], v6[1] + size[1], v6[2]]).reshape((1,3))
    v6 = v6.reshape((1,3))

    vertices = [v0, v1, v2, v3, v4, v5, v6, v7]


    return np.vstack(vertices)

def build_edge(v):
    edges = [(v[0], v[1]),
             (v[0], v[3]),
             (v[0], v[4]),
             (v[1], v[2]),
             (v[1], v[5]),
             (v[2], v[3]),
             (v[2], v[6]),
             (v[3], v[7]),
             (v[4], v[5]),
             (v[4], v[7]),
             (v[5], v[6]),
             (v[6], v[7])
             ]
    return edges
def xy_projection(w2c_v):
    vertices = [w2c_v[i,:2] for i in range(8)]

    edges = build_edge(vertices)
    return vertices,edges

def xz_projection(w2c_v):
    coordinates = np.concatenate((w2c_v[:,0].reshape(8,1),w2c_v[:,2].reshape(8,1)),axis=1)

    vertices = [coordinates[i,:] for i in range(8)]

    edges = build_edge(vertices)

    return vertices,edges

def yz_projection(w2c_v):
    coordinates = np.concatenate((w2c_v[:, 2].reshape(8, 1), w2c_v[:, 1].reshape(8, 1)), axis=1)

    vertices = [coordinates[i, :] for i in range(8)]

    edges = build_edge(vertices)

    return vertices,edges

def homogenous_transform(point):
    homo = point.reshape(3, 1)
    homo = np.vstack((homo, np.array([1])))
    return homo

def triangle_intersect(triangle,proj_v):
    tri_vertices = triangle[0]
    proj_v_vertices = proj_v[0]
    tri_edges = triangle[1]
    proj_v_edges = proj_v[1]

    for q_v in proj_v_vertices:
        if point_triangle(tri_vertices[0], tri_vertices[1], tri_vertices[2], q_v):
            return True
    for q_e in proj_v_edges:
        for t_e in tri_edges:
            if edge_intersect(q_e,t_e):
                return True
    return False

def quad_intersect(quad2,quad1):
    quad_vertices = quad1[0]
    quad_edges = quad1[1]
    camquad_vertices = quad2[0]
    camquad_edges = quad2[1]

    cam_AABB = [camquad_vertices[2][0],camquad_vertices[1][0],camquad_vertices[2][1],camquad_vertices[1][1]]
    for q_v in quad_vertices:
        if point_in_AABB(q_v,cam_AABB):
            return True
    for q_e in quad_edges:
        for cq_e in camquad_edges:
            if edge_intersect(q_e,cq_e):
                return True
    return False

def focal2fov(focal,pixel):
    return 2 * math.atan( pixel / (2 * focal))

def pyramid_boundary(fx,fy,width,height,zfar):
    fovx = focal2fov(fx, width)


    half_H = abs(zfar) * math.tan(fovx * 0.5)

    fovy = focal2fov(fy, height)

    half_V = abs(zfar) * math.tan(fovy * 0.5)

    return half_V, half_H

def pyramid_intersect(tri1,tri2,rect,w2c_vertices):

    xy_proj = xy_projection(w2c_vertices)
    yz_proj = yz_projection(w2c_vertices)
    xz_proj = xz_projection(w2c_vertices)
    if triangle_intersect(tri2, yz_proj) and triangle_intersect(tri1, xz_proj) and quad_intersect(rect, xy_proj):
        return True
    else:
        return False

def build_dView(visible_voxels, matrixA, shape):
    pattern = r"x_(\d+)y_(\d+)z_(\d+)"
    dview = np.zeros((matrixA.shape[1]))
    for voxel in visible_voxels:
        match = re.search(pattern, voxel)
        x_num, y_num, z_num = match.groups()
        row = int(x_num) + int(y_num) * shape[0] + int(z_num) * (shape[0] * shape[1])
        all_comb = matrixA[row]
        dview = np.logical_or(dview,all_comb)
        #print(np.sum(dview))
    return dview

def build_Cview(dview, Cstore):
    result = np.zeros(shape=Cstore.shape)
    for i in range(dview.shape[0]):
        if dview[i] == 1:
            result[i,0] = Cstore[i,0]
    C_view = result
    return C_view


def build_projection_matrix(fx, fy, znear, zfar):
    # Initialize a 4x4 matrix filled with zeros
    proj_matrix = np.zeros((4, 4))

    # Populate the perspective projection matrix
    proj_matrix[0, 0] = fx
    proj_matrix[1, 1] = fy
    proj_matrix[2, 2] = (zfar + znear) / (znear - zfar)
    proj_matrix[2, 3] = (2 * zfar * znear) / (znear - zfar)
    proj_matrix[3, 2] = -1
    proj_matrix[3, 3] = 0

    return proj_matrix

def process_scene(ply_file_path, cameras_path, matrix_a_path, c_store_path, voxel_path, output_folder, scene_name):
    # Read the PLY file
    plydata = PlyData.read(ply_file_path)
    xyz = np.stack((np.asarray(plydata.elements[0]["x"], dtype=np.float32),
                    np.asarray(plydata.elements[0]["y"], dtype=np.float32),
                    np.asarray(plydata.elements[0]["z"], dtype=np.float32)), axis=1)
    print(xyz.shape)

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

    if scene_name in ['bicycle', 'flowers', 'stump', 'treehill', 'garden']:
        downscale = 4
    elif scene_name in ['bonsai', 'kitchen', 'room']:
        downscale = 2
    elif scene_name in ['drjohnson', 'playroom', 'train', 'truck']:
        downscale = 1
    else:
        raise ValueError(f"Unknown downscale setting for scene name: {scene_name}")

    x_size = (np.max(plydata.elements[0]["x"]) - np.min(plydata.elements[0]["x"])) / shape[0]
    y_size = (np.max(plydata.elements[0]["y"]) - np.min(plydata.elements[0]["y"])) / shape[1]
    z_size = (np.max(plydata.elements[0]["z"]) - np.min(plydata.elements[0]["z"])) / shape[2]
    size = (x_size, y_size, z_size)

    # Load additional files
    with open(cameras_path, 'r') as fcam:
        cameras = json.load(fcam)
    A = np.load(matrix_a_path)
    C_store = np.load(c_store_path)
    with open(voxel_path, 'r') as f_voxel:
        voxels = json.load(f_voxel)

    gaussian_num = np.asarray(plydata.elements[0]["x"]).shape[0]

    # Initialize C_view
    C_view = np.zeros(shape=C_store.shape)
    prob = 1 / len(cameras)

    for cam_id, cam in enumerate(cameras):
        print(cam_id)
        height = int(cam['height'] / downscale)
        width = int(cam['width'] / downscale)
        fx = cam['fx'] / downscale
        fy = cam['fy'] / downscale
        zfar = 200
        znear = 0.2

        projection_matrix = np.array([
            [(2 * fx) / width, 0, 0, 0],
            [0, -(2 * fy) / height, 0, 0],
            [0, 0, zfar / (zfar - znear), 1],
            [0, 0, -(zfar * znear) / (zfar - znear), 0]
        ])

        rotation = np.array(cam['rotation']).transpose()
        position = np.array(cam['position'])
        t = -np.dot(rotation, position.reshape((3, 1)))

        w2c = np.zeros((4, 4))
        w2c[:3, :3] = rotation
        w2c[:3, 3] = t.reshape((3))
        w2c[3, 3] = 1

        gs_ones = np.ones((gaussian_num, 1))
        gs_pose = np.concatenate((xyz, gs_ones), axis=1)
        points_camera = np.dot(gs_pose, w2c.T)
        points_ndc = np.dot(points_camera, projection_matrix)

        points_ndc[:, 0] /= points_ndc[:, 3]
        points_ndc[:, 1] /= points_ndc[:, 3]
        points_ndc[:, 2] /= points_ndc[:, 3]

        inside_frustum = (
            (points_ndc[:, 0] >= -1) & (points_ndc[:, 0] <= 1) &
            (points_ndc[:, 1] >= -1) & (points_ndc[:, 1] <= 1) &
            (points_ndc[:, 2] >= 0) & (points_ndc[:, 2] <= 1)
        )
        num_points_inside = np.sum(inside_frustum)
        print("splats:", num_points_inside)

        half_V, half_H = pyramid_boundary(fx, fy, width, height, zfar)
        tri1 = creat_triangle(np.array([0, 0]), np.array([-half_H, zfar]), np.array([half_H, zfar]))
        tri2 = creat_triangle(np.array([0, 0]), np.array([zfar, half_V]), np.array([zfar, -half_V]))
        rect = create_quad(np.array([-half_H, half_V]), np.array([half_H, half_V]), np.array([-half_H, -half_V]), np.array([half_H, -half_V]))

        visible_voxel = []
        for key in sorted(voxels.keys()):
            leftBottom = np.array(voxels[key]['leftBottom'])
            cube_vertices = create_cube(leftBottom, size)
            ones = np.ones((8, 1))
            cube_vertices = np.concatenate((cube_vertices, ones), axis=1)
            w2c_vertics = np.dot(w2c, cube_vertices.transpose())

            if pyramid_intersect(tri1, tri2, rect, w2c_vertics.transpose()):
                visible_voxel.append(key)

        dview = build_dView(visible_voxel, A, shape).astype(int)
        C_view += prob * build_Cview(dview, C_store) / num_points_inside
        output_path = os.path.join(output_folder, 'Cd_new.npy')

    np.save(output_path, C_view)
    print(f"Saved Cd_new to {output_path}")

# Main function
def main(ply_file_path, cameras_path, matrix_a_path, c_store_path, voxel_path, output_folder, scene_name):
    process_scene(ply_file_path, cameras_path, matrix_a_path, c_store_path, voxel_path, output_folder, scene_name)

# Example usage
if __name__ == "__main__":

    parser = argparse.ArgumentParser(description="Process scene data and compute C_view.")
    parser.add_argument("--ply_file_path", type=str, required=True, help="Path to the PLY file.")
    parser.add_argument("--cameras_path", type=str, required=True, help="Path to the cameras JSON file.")
    parser.add_argument("--matrix_a_path", type=str, required=True, help="Path to the matrix_A.npy file.")
    parser.add_argument("--c_store_path", type=str, required=True, help="Path to the C_cost.npy file.")
    parser.add_argument("--voxel_path", type=str, required=True, help="Path to the voxel_new.json file.")
    parser.add_argument("--output_folder", type=str, required=True, help="Path to save the Cd_new.npy file.")
    parser.add_argument("--scene_name", type=str, required=True, help="Scene name for processing.")

    args = parser.parse_args()
    main(args.ply_file_path, args.cameras_path, args.matrix_a_path, args.c_store_path, args.voxel_path, args.output_folder, args.scene_name)



