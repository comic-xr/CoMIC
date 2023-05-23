Performance Evaluation of 6DoF Localization

## Repositories Used

The webpage point cloud display is based on the following repository 
<a href="https://github.com/mrdoob/three.js/">three.js</a>

Feature extraction and kapture api update are based on the following repositories
<a href="https://github.com/naver/kapture-localization">kapture-localization</a> 
<a href="https://github.com/naver/deep-image-retrieval#feature-extraction-with-kapture-datasets">deep-image-retrieval</a> 
<a href="https://github.com/naver/r2d2#feature-extraction-with-kapture-datasets">r2d2</a> 
<a href="https://github.com/wunan96nj/3dmapping-localization">3dmapping-localization</a> 
<a href="https://github.com/colmap/colmap">colmap</a>

## Project Structure
```
+-- dwong_webpage				# webpage for interactive visual api
    +-- content.html				# webpage html content
    +-- test.js					# script for interacting with api
+-- kapture-localization			#
    +-- feature_extract				# folder for extracting SIFT features
        +-- feature_extract.py			# extracts local and global SIFT features
        +-- global_feats.ipynb			# extracts global SIFT features, low GPU, colab
    +-- kapture_api				# new and updated files for kapture api
        +-- CaptureApi.py			# updated a function
        +-- CaptureSDK.py			# updated a function
        +-- kapture_import_colmap.py		# new, from kapture
        +-- kapture_pipeline_localize.py	# new, from kapture
        +-- kapture_pipeline_mapping.py		# new, from kapture
        +-- path_to_kapture.py			# new, from kapture
        +-- pipeline_import_paths.py		# new, from kapture
        +-- server.env				# new
        +-- map3d				#
            +-- util				#
                +-- Utils.py			# updated a function 
```

## Quick Start

* Replace/update the specified files in 3dmapping-localization with kapture_api (some parts may not be up to date)
* Download necessary models from r2d2 (or colmap) and deep-image-retrieval for feature extraction
```
To run:
python feature_extract.py
```
* Turn web-security off to test webpage and api interaction

## Note

* Remember to modify directories as needed

* Set up and testing kapture-localization
```
conda install pytorch==1.2.0 torchvision==0.4.0 cudatoolkit=10.0 -c pytorch

kapture_pipeline_mapping.py -v info -i ./mapping -kpt ./local_features/r2d2_500/keypoints -desc ./local_features/r2d2_500/descriptors -gfeat ./global_features/AP-GeM-LM18/global_features -matches ./local_features/r2d2_500/NN_no_gv/matches -matches-gv ./local_features/r2d2_500/NN_colmap_gv/matches --colmap-map ./colmap-sfm/r2d2_500/AP-GeM-LM18_top5 --topk 5 -colmap E:\COLMAP\COLMAP-3.6-windows-no-cuda\COLMAP.bat
```