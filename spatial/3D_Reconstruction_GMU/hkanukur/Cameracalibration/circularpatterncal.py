import cv2
import numpy as np
import glob

# Define the number of squares in the circular grid
grid_size = (4, 11)

# Define the size of each square in the circular grid
square_size = 0.019

# Define the termination criteria for the corner detection algorithm
criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001)

# Create an array to store the object points and image points
objpoints = []
# Creating vector to store vectors of 2D points for each checkerboard image
imgpoints = []

# Generate the object points for the circular grid
objectp = np.zeros((np.prod(grid_size), 3), np.float32)
objectp[:, :2] = np.mgrid[0:grid_size[0], 0:grid_size[1]].T.reshape(-1, 2)
objectp *= square_size

# Loop over all the images in the folder
for fileimage in glob.glob('images/*.png'):
    
    # Load the image
    img = cv2.imread(fileimage)

    # Find the circular grid pattern in the image
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    ret, corners = cv2.findCirclesGrid(gray, grid_size, cv2.CALIB_CB_SYMMETRIC_GRID)

    # If the pattern is found, add the object points and image points to the list
    if ret:
        objpoints.append(objectp)
        corners = cv2.cornerSubPix(gray, corners, (8, 8), (-1, -1), criteria)
        imgpoints.append(corners)
        cv2.drawChessboardCorners(img, grid_size, corners, ret)
        cv2.imshow('img', img)
        cv2.waitKey(500)

        # Calibrate the camera using the object points and image points
        print(f"Number of images with detected pattern: {len(objpoints)}")
        ret, K, dist, rvecs, tvecs = cv2.calibrateCamera(objpoints, imgpoints, gray.shape[::-1], None, None)

        # Print the camera matrix and distortion coefficients
        print("Camera matrix:\n", K)
        print("Distortion coefficients:\n", dist)

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
