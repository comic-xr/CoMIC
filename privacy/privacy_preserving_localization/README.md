# Privacy preserving localization

This folder contains work for protecting privacy in localization.

## Repositories Utilized

Client for transmitting keypoints and descriptors uses the following repository
<a href="https://github.com/google/guava">guava</a>

Object detection results generated manually using the following repository
<a href="https://github.com/heartexlabs/labelImg">labelImg</a>

## Project Structure
```
+-- client-server_desc            # 
    +-- Client.java               # Sends keypoints and descriptors
    +-- Server.py                 # Receives keypoints and descriptors
    +-- guava-31.1-jre.jar        # **might remove
+-- image_patch_extract           # 
    +-- SIFT_extract.ipynb        # Extracts descriptor patch from image
+-- obj_detect_res                # 
    +-- day_all.zip               # Object detection results for training
    +-- nyu_500_bbox_label.zip    # Object detection results for training
+-- survey_forms                  # 
    +-- form_maker.txt            # Creates survey form
    +-- form_maker.xlsx           # Contains questions for the form
    +-- form_update.txt           # Replaces the form images
```

## Quick Start

* Download guava's jar file from the following
  <a href="https://mavenlibs.com/jar/file/com.google.guava/guava">link</a>.
  Add to class path when compiling Client.java
* Install jupyter notebook to run SIFT_extract.ipynb
```
To install:
pip install notebook

To run:
jupyter notebook
```
* Forms are generated using Google's AppScript
  1. Upload 'form_maker.xlsx' to Google Sheets
  2. Add contents of 'form_maker.txt' to AppScript of the spreadsheet
  3. Execute to generate survey form
  4. Add contents of 'form_update.txt' to AppScript of the survey form
  5. Execute to replace form images

## Note
