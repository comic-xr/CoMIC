#files
from deep_image_retrieval.dirtorch import extract_kapture as extract_global, extract_features #global feature extraction
from r2d2_master import extract_kapture as extract_local #local feature extraction
#pip installs
#from kapture_import_colmap import import_colmap
import kapture_localization #image pairs and matching

import argparse
import subprocess

COLMAP = 'C:/Users/dusti/Downloads/COLMAP-3.7-windows-no-cuda/COLMAP.bat'

root_dir = '.'
workspace_dir = root_dir + '/workspace-0'
tmp_database_dir = workspace_dir + '/dataset'
database_name = '/mapping.db'
image_dir = workspace_dir + '/images'
path = '/mapping'

pIntrisics = subprocess.Popen([COLMAP, "feature_extractor", "--database_path", tmp_database_dir + database_name, "--image_path", image_dir + path, "--ImageReader.camera_model", "SIMPLE_PINHOLE"])
pIntrisics.wait()

'''pConvert = subprocess.Popen(["python", "kapture_import_colmap.py", "-db", tmp_database_dir + database_name, "-o", workspace_dir + tmp_database_dir + path])
pConvert.wait()

#probably need to create dir 'records_data' and move/copy mapping/images to there

extract_global.extract_kapture_global_features(workspace_dir + '/dataset' + path, extract_features.load_model(root_dir + '/models/Resnet101-AP-GeM-LM18.pt',True), 'Restnet101-AP-GeM-LM18', '', 'gem')'''
