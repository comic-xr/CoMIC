#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import numpy
import cv2
import base64
import shutil
from json import JSONEncoder
import os
import subprocess
from map3d.util.db import database, write_to_nw_db
from map3d.util.calc import get_point_pos_des, get_point_feature
import open3d

import kapture #for kapture database
import kapture_localization #image pairs and matching
from map3d.util.deep_image_retrieval.dirtorch import extract_kapture as extract_global, extract_features #global feature extraction
from map3d.util.r2d2_master import extract_kapture as extract_local #local feature extraction

class NDArrayEncoder(JSONEncoder):
    def default(self, obj):
        if isinstance(obj, numpy.ndarray):
            return obj.tolist()
        return JSONEncoder.default(self, obj)


# dp_points_rgb [0-255]
def write_xyz_to_point_cloud_file(db_points_pos, db_points_des, dp_points_rgb, ply_file_path):
    pcd = open3d.geometry.PointCloud()
    pcd.points = open3d.utility.Vector3dVector(db_points_pos)
    dp_points_rgb = numpy.array(dp_points_rgb)
    pcd.colors = open3d.utility.Vector3dVector(dp_points_rgb.astype(numpy.float64) / 255.0)
    open3d.io.write_point_cloud(ply_file_path, pcd)
    return


def load_all_3dmap_cloud_point(sparse_dir, col_bin_dir):
    db_cameras, db_images, db_points = get_point_feature.read_cip(col_bin_dir)
    db_images_table, db_kp_table, db_des_table = get_point_feature.read_database(sparse_dir)
    db_points_pos, db_points_des, dp_points_rgb = get_point_feature.get_points_pos_des(db_cameras, db_images, db_points,
                                                                                       db_kp_table, db_des_table)
    return (db_points_pos, db_points_des, dp_points_rgb)


def correct_colmap_q(qvec):
    ret = numpy.roll(qvec, 1)
    return ret


def write_to_file(content_s, file_full_path, is_base64):
    if is_base64:
        base64_bytes = content_s.encode('ascii')
        file_bytes = base64.b64decode(base64_bytes)
    else:
        file_bytes = content_s.encode('ascii')
    with open(file_full_path, 'wb') as f:
        f.write(file_bytes)
    return


def feature_cv(database_path, img_folder, ):
    img_names = os.listdir(img_folder)
    print(img_names)
    if os.path.exists(database_path):
        os.remove(database_path)
    db = database.COLMAPDatabase.connect(database_path)
    db.create_tables()
    for i in range(len(img_names)):
        img_name = img_names[i]

        print("img_name:%s" % img_name)
        (model, width, height, params) = get_camera_info_cv()
        camera_id = db.add_camera(model, width, height, params)
        image_id = db.add_image(img_name, camera_id)
        (fg_kp, fg_des) = feature_one_image_cv(img_name, img_folder, model,
                                               width, height, params)
        print(fg_kp.shape)
        print(fg_des.shape)
        db.add_keypoints(image_id, fg_kp)
        db.add_descriptors(image_id, fg_des)
        db.commit()
    db.close()


def get_camera_info_cv():
    model, width, height, params = 0, 3072, 2304, numpy.array(
        (2457.6, 1536., 1152.))
    return (model, width, height, params)


def feature_one_image_cv(img_name, img_folder):
    img_path = img_folder + "/" + img_name
    img = cv2.imread(img_path, 0)
    sift = cv2.SIFT_create(10000)
    fg_kp, fg_des = sift.detectAndCompute(img, None)
    fg_kp = numpy.array([fg_kp[i].pt for i in range(len(fg_kp))])
    fg_des = numpy.array(fg_des).astype(numpy.uint8)
    return (fg_kp, fg_des)

#root_dir - root directory, models likely stored under root dir instead of workspace dir
#workspace_dir - directory for workspace
#path - mapping or query, will be useful later on
def feature_kapture(root_dir, workspace_dir, tmp_database_dir, database_name, colmap_path):
    #1. local feature extraction via colmap
    print("Local feature extract via colmap start...")
    pIntrisics = subprocess.Popen([colmap_path, "feature_extractor", "--database_path", tmp_database_dir + database_name, "--image_path", workspace_dir + '/images', "--ImageReader.camera_model", "SIMPLE_PINHOLE"])
    pIntrisics.wait()
    print("Local feature extract via colmap end...")
    
    #2. convert colmap format to kapture format - later replace with function
    print("COLMAP SIFT to kapture format start...")
    pConvert = subprocess.Popen(["python", "kapture_import_colmap.py", "-db", tmp_database_dir + database_name, "-o", workspace_dir + '/kds'])
    pConvert.wait()
    print("COLMAP SIFT to kapture format end...")
    
    #3. extract global features - DONE
    print("Global feature extract start...")
    extract_global.extract_kapture_global_features(workspace_dir + '/kds', extract_features.load_model('./map3d/util/models/Resnet101-AP-GeM-LM18.pt',True), 'Restnet101-AP-GeM-LM18', '', 'gem')
    print("Global feature extract end...")

    
def feature_colmap(COLMAP, database_name, tmp_database_dir, image_dir):
    '''pIntrisics = subprocess.Popen(
        [COLMAP, "feature_extractor", "--database_path",
         tmp_database_dir + database_name, "--image_path", image_dir,
         "--ImageReader.camera_model", "SIMPLE_PINHOLE", "--SiftExtraction.use_gpu", "false"])'''
    pIntrisics = subprocess.Popen(
        [COLMAP, "feature_extractor", "--database_path",
         tmp_database_dir + database_name, "--image_path", image_dir,
         "--ImageReader.camera_model", "SIMPLE_PINHOLE"])
    pIntrisics.wait()


def match_colmap(COLMAP, database_name, tmp_database_dir, image_dir ):
    '''pIntrisics = subprocess.Popen(
        [COLMAP, "exhaustive_matcher", "--database_path",
         tmp_database_dir + database_name, "--SiftMatching.use_gpu", "false"])'''
    pIntrisics = subprocess.Popen(
        [COLMAP, "exhaustive_matcher", "--database_path",
         tmp_database_dir + database_name])
    pIntrisics.wait()


def point_triangulator_colmap(COLMAP, database_name, sparse_dir,
                              tmp_database_dir, image_dir ):
    pIntrisics = subprocess.Popen(
        [COLMAP, "mapper", "--database_path",
         tmp_database_dir + database_name,
         "--image_path", image_dir, "--output_path",
         sparse_dir, "--Mapper.ba_refine_focal_length", "0",
         "--Mapper.ba_refine_extra_params", "0"])
    pIntrisics.wait()


# def printImageBinInfo(uploadImagePath, image_bin_path="/Users/akui/Desktop/sparse/0/images.bin"):
#     (image_dir, the_image_name) = os.path.split(uploadImagePath)
#
#     return (image_id, qvec, tvec,
#             camera_id, image_name,
#             xys, point3D_ids)


'''
def gen_newdb(sparse_dir, database_name, feature_dim, bank ):
    print("StartMapConstruction gen_newdb() start .....")
    sparse_dir_bank = sparse_dir + str(bank) + "/"
    tmp_database_dir = sparse_dir_bank + "/temp/"
    print("sparse_dir_bank: " + sparse_dir_bank)
    print("tmp_database_dir: " + tmp_database_dir)
    print("1. write_to_nw_db.read_cip")
    cameras, images, points = write_to_nw_db.read_cip(sparse_dir_bank)
    print(cameras)
    print("2. write_to_nw_db.read_database")
    db_images, kp_table, des_table = write_to_nw_db.read_database(
        tmp_database_dir, feature_dim)

    print("3. write_to_nw_db.get_points_pos_des")
    points_pos, points_des, points_rgb = write_to_nw_db.get_points_pos_des(
        cameras, images,
        points,
        kp_table,
        des_table)

    # print(len(points))
    # print(len(points_pos))
    # print(len(points_des))
    # print(points)
    print(list(points_pos[-1]))
    print(list(points_des[-1]))
    print(list(points_rgb[-1]))
    print("4. write_to_nw_db.write_points3D_nw_db")
    write_to_nw_db.write_points3D_nw_db(points_pos, points_rgb, points_des,
                                        sparse_dir_bank + database_name)
    print("StartMapConstruction gen_newdb() end .....")
    return
'''
'''
def remove_build_useless_files(sparse_dir, feature_dim, bank ):
    print("StartMapConstruction remove_useless_files() start .....")
    sparse_dir_bank = sparse_dir + str(bank) + "/"
    tmp_database_dir = sparse_dir_bank + "temp/"
    if os.path.exists(tmp_database_dir):
        shutil.rmtree(tmp_database_dir, ignore_errors=True)
    if os.path.exists(sparse_dir_bank + "project.ini"):
        os.remove(sparse_dir_bank + "project.ini")
    if os.path.exists(sparse_dir_bank + "points3D.bin"):
        os.remove(sparse_dir_bank + "points3D.bin")

    print("StartMapConstruction remove_useless_files() end .....")
    return
'''


def main():
    base_bank_dir = "/Users/akui/Desktop/sparse/0"
    ply_file_path = "/Users/akui/Desktop/test.ply"
    (db_points_pos, db_points_des, dp_points_rgb) = load_all_3dmap_cloud_point(base_bank_dir)
    write_xyz_to_point_cloud_file(db_points_pos, db_points_des, dp_points_rgb, ply_file_path)
    return


if __name__ == "__main__":
    main()
