import requests
import json
import time
import base64
import os
from PIL import Image
from datetime import datetime
from map3d.util import Utils

import sys
sys.path.append('./map3d/util')

def find_photos_filenames(full_dir_path, isPng=False):
    for root, ds, fs in os.walk(full_dir_path):
        for f in fs:
            fullname = os.path.join(root, f)
            # need png file, jpg convert to png
            if isPng:
                if f.lower().endswith('.png'):
                    yield fullname
                elif f.lower().endswith('.jpg'):
                    print("convert jpg 2 png...start...")
                    file_base_name = (f.split("."))[0]
                    img = Image.open(fullname)
                    png_full_name = os.path.join(root, file_base_name) + ".png"
                    img.save(png_full_name)
                    print("convert jpg 2 png...end...")
                    yield png_full_name
            else:
                # only need jpg now
                if f.lower().endswith('.jpg'):
                    yield fullname


def ConvertToBase64(src_filepath):
    with open(src_filepath, 'rb') as imageFileAsBinary:
        fileContent = imageFileAsBinary.read()
        b64_encoded_img = base64.b64encode(fileContent)
        return b64_encoded_img


def post_to_server(api_url, token, image_base_dir, seq_base, bank, username, password):
    for i, imagePath in enumerate(find_photos_filenames(image_base_dir)):
        seq = seq_base + i
        print("sequence: " + str(seq))
        print("imagePath: " + imagePath)
        print("bank: " + str(bank))
        submit_image(api_url, token, imagePath, seq, bank, username, password);
    return


def submit_image(api_url, token, imagePath, seq, bank, username, password):
    print("submit_image...start...")
    complete_url = api_url + '/captureb64'
    (image_dir, image_name) = os.path.split(imagePath)
    image_name = image_name.split('.')[0] + ".jpg"
    data = {
        "token": token,
        "bank": bank,  # default workspace/image bank
        "run": seq,
        # a running integer for the tracker session. Increment if tracking is lost or image is from a different session
        "index": seq,  # running index for images
        "anchor": False,  # flag for the image used as an anchor/map origin
        "px": 0.0,  # camera x position from the tracker
        "py": 0.0,  # camera y position from the tracker
        "pz": 0.0,  # camera z position from the tracker
        "r00": 1.0,  # camera orientation as a 3x3 matrix
        "r01": 0.0,
        "r02": 0.0,
        "r10": 0.0,
        "r11": 1.0,
        "r12": 0.0,
        "r20": 0.0,
        "r21": 0.0,
        "r22": 1.0,
        "fx": 2457.5,  # image focal length in pixels on x axis
        "fy": 2457.5,  # image focal length in pixels on y axis
        "ox": 1152,  # image principal point on x axis
        "oy": 1536,  # image principal point on y axis
        "b64": str(ConvertToBase64(imagePath), 'utf-8'),
        "image_name": image_name
        # base64 encoded .jpg image
    }

    json_data = json.dumps(data)
    # print(json_data)
    ret = requests.post(complete_url, data=json_data, auth=(username, password)).json()
    print(ret)
    print("submit_image...end...")
    return


def StartMapConstruction(url, token, mapName, windowSize, feature_dim, bank, username, password):
    complete_url = url + '/construct'
    data = {
        "token": token,
        "bank": bank,
        "name": mapName,
        "feature_dim": feature_dim,
        # If the images are shot in sequence like a video stream, this optional parameter can be used to limit
        # image matching to x previous and following frames.
        # This can decrease map construction times and help constructing maps in repetitive environments.
        # A value of 0 disables the feature.
        "window_size": windowSize
    }
    json_data = json.dumps(data)
    ret = requests.post(complete_url, data=json_data, auth=(username, password)).json()
    return ret


def Query3DCouldPoint(url, token, bank, username, password, params=None):
    t_beign = time.time()
    print("QueryLocal...start...t_beign: " + str(int(t_beign)))
    print("QueryLocal...bank: " + str(bank))
    complete_url = url + '/query3dcloudpoint'
    data = {
        "token": token,
        "bank": bank,
        "params": params
    }
    json_data = json.dumps(data)
    return_obj = json.loads(requests.post(complete_url, data=json_data, auth=(username, password)).json())
    return return_obj


def Write3dmap2PlyFile(db_points_pos, db_points_des, dp_points_rgb, ply_file_path):
    Utils.write_xyz_to_point_cloud_file(db_points_pos, db_points_des, dp_points_rgb, ply_file_path)
    return


def QueryLocal(url, token, uploadImagePath, bank, username, password):
    complete_url = url + '/querylocal'
    (image_dir, image_name) = os.path.split(uploadImagePath)
    image_name = image_name.split('.')[0] + ".jpg"
    data = {
        "token": token,
        "bank": bank,
        "b64": str(ConvertToBase64(uploadImagePath), 'utf-8'),
        "image_name": image_name
    }
    json_data = json.dumps(data)
    return_obj = json.loads(requests.post(complete_url, data=json_data, auth=(username, password)).json())
    print(return_obj)
    ret_image_name = return_obj[0]
    ret_qvec = return_obj[1]
    ret_tvec = return_obj[2]
    return (ret_image_name, ret_qvec, ret_tvec)


def CVQueryLocal(url, token, cvImagePath, bank, username, password):
    t_beign = time.time()
    print("CVQueryLocal...start...t_beign: " + str(int(t_beign)))
    print("CVQueryLocal...cvImagePath: " + str(cvImagePath))
    complete_url = url + '/cvquerylocal'
    (image_dir, image_name) = os.path.split(cvImagePath)
    image_name = image_name.split('.')[0] + ".jpg"
    (fg_kp, fg_des) = Utils.feature_one_image_cv(image_name, image_dir)
    print("CVQueryLocal...fg_kp: " + str(fg_kp))
    print("CVQueryLocal...fg_des: " + str(fg_des))
    (model, width, height, params) = Utils.get_camera_info_cv()
    print("CVQueryLocal...params: " + str(params))
    data = {
        "token": token,
        "bank": bank,
        "fg_kp": fg_kp,
        "fg_des": fg_des,
        "params": params,
        "image_name": image_name
    }
    json_data = json.dumps(data, cls=Utils.NDArrayEncoder)
    return_obj = json.loads(requests.post(complete_url, data=json_data, auth=(username, password)).json())
    print(return_obj)
    ret_image_name = return_obj[0]
    ret_qvec = return_obj[1]
    ret_tvec = return_obj[2]
    return (ret_image_name, ret_qvec, ret_tvec)


def ImageBinInfo(url, token, image_name, bank, username, password):
    # image_name = image_name.split('.')[0]
    print("ImageBinInfo...bank: " + str(bank))
    print("ImageBinInfo...image_name: " + str(image_name))
    complete_url = url + '/imagebininfo'
    data = {
        "token": token,
        "bank": bank,
        "image_name": image_name
    }
    json_data = json.dumps(data, cls=Utils.NDArrayEncoder)
    return_obj = json.loads(requests.post(complete_url, data=json_data, auth=(username, password)).json())
    return return_obj


def ClearWorkspace(url, token, deleteAnchorImage, bank, username, password):
    complete_url = url + '/clear'
    data = {
        "token": token,
        "bank": bank,  # default workspace/image bank
        "anchor": deleteAnchorImage
    }
    json_data = json.dumps(data)
    r = requests.post(complete_url, data=json_data, auth=(username, password))
    return r


def printTimestamp():
    now = datetime.now()
    dt_string = now.strftime("%Y/%m/%d/ %H:%M:%S")
    print("date and time =", dt_string)
    return
