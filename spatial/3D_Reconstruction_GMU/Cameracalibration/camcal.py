import cv2
import numpy as np
import glob
 
# Defining the dimensions of checkerboard
grid_size = (8,8)

# Define the size of each square in the circular grid
square_size = 0.019

# Define the termination criteria for the corner detection algorithm
criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001)
 
# Creating vector to store vectors of 3D points for each checkerboard image
objpoints = []
# Creating vector to store vectors of 2D points for each checkerboard image
imgpoints = [] 
 
 
# Defining the world coordinates for 3D points
objectp = np.zeros((1, grid_size[0] * grid_size[1], 3), np.float32)
objectp[0,:,:2] = np.mgrid[0:grid_size[0], 0:grid_size[1]].T.reshape(-1, 2)
prev_img_shape = None
objectp *= square_size

# Loop over all the images in the folder 
for fileimage in glob.glob('images/*.png'):
    
    # Load the image
    img = cv2.imread(fileimage)
    gray = cv2.cvtColor(img,cv2.COLOR_BGR2GRAY)
    # Find the chess board corners
    # If desired number of corners are found in the image then ret = true
    ret, corners = cv2.findChessboardCorners(gray, grid_size, cv2.CALIB_CB_ADAPTIVE_THRESH + cv2.CALIB_CB_FAST_CHECK + cv2.CALIB_CB_NORMALIZE_IMAGE)
     
     # If the pattern is found, add the object points and image points to the list

    if ret == True:
        objpoints.append(objectp)
        corners2 = cv2.cornerSubPix(gray, corners, (8,8),(-1,-1), criteria)
        imgpoints.append(corners2)
        img = cv2.drawChessboardCorners(img, grid_size, corners2, ret)
     
    cv2.imshow('img',img)
    cv2.waitKey(0)
 

    print(f"Number of images with detected pattern: {len(objpoints)}")
    ret, matrix, dist, rvecs, tvecs = cv2.calibrateCamera(objpoints, imgpoints, gray.shape[::-1], None, None)
    print("Camera matrix : \n")
    print(matrix)
    print("Distortion coefficients: : \n")
    print("rvecs : \n")
    print(rvecs)
    print("tvecs : \n")
    print(tvecs)

    # Compute the re-projection error
    mean_error = 0
    for i in range(len(objpoints)):
        imgpoints2, _ = cv2.projectPoints(objpoints[i], rvecs[i], tvecs[i], K, dist)
        error = cv2.norm(imgpoints[i], imgpoints2, cv2.NORM_L2) / len(imgpoints2)
        mean_error += error
    print("Mean re-projection error: ", mean_error / len(objpoints))
else:
    print(f"Pattern not found in {fileimage}") # loop failesIf grid pattern is not detected the point of img and obj will be empty calibration wont execute

 
cv2.destroyAllWindows()