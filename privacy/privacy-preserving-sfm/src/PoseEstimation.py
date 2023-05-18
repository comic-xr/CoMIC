import numpy as np
import scipy
import re3q3

from random import uniform # used to generate values between -1 and 1

# A simplified version of colmap's Point3D class. Represents a point in 3D space
# that can have additional information alongside its coordinates.
class Point3D:

	# Initializes this point to the given coordinates
	#
	# @param init_x the x-coordinate of this point
	# @param init_y the y-coordinate of this point
	# @param init_z the z-coordinate of this point
	def __init__(self, init_x, init_y, init_z):
		self.x = init_x
		self.y = init_y
		self.z = init_z

	# String representation of this Point3D
	def __str__(self):
		return f'({self.x}, {self.y}, {self.z})'

	# Returns this Point3D's coordinates as a 3D vector
	#
	# @return 1x3 numpy array (1 row, 3 columns) representation of this
	#         point with format [x, y, z]
	def get_xyz(self):
		return np.array([self.x, self.y, self.z])

	# Sets this Point3D to the new values.
	#
	# @param new_x the new x to use
	# @param new_y the new y to use
	# @param new_z the new z to use
	def set_xyz(self, new_x, new_y, new_z):
		self.x = new_x
		self.y = new_y
		self.z = new_z

# A simplified version of colmap's FeatureLine class. Includes the vector
# that defines the line along with additional properties, such as alignment.
class FeatureLine:

	# Creates this FeatureLine, with the given vector and alignment
	#
	# @param init_line the vector that defines this line
	# @param init_align the alignment of this line (True or False)
	def __init__(self, init_line, init_align):
		self.__line = init_line
		self.alignment = init_align

	# String representation of this FeatureLine
	def __str__(self):
		print(self.alignment)
		return f'{self.__line}; {self.alignment}'

	# Whether or not this FeatureLine is aligned
	#
	# @return true when this FeatureLine is aligned; false otherwise
	def is_aligned(self):
		return self.alignment

	# Gets the vector representing the direction of this FeatureLine.
	#
	# @return the vector representing this FeatureLine
	def get_line(self):
		return self.__line



#/* Homogeneous linear constraints on rotation matrix
#	 Rcoeffs*R(:) = 0
#  converted into 3q3 problem. */
# Rcoeffs should be 3x9; coeffs 3x10
def rotation_to_e3q3(Rcoeffs, coeffs):

	for k in range(0, 3):
		coeffs[k, 0] = Rcoeffs[k, 0] - Rcoeffs[k, 4] - Rcoeffs[k, 8]
		coeffs[k, 1] = 2 * Rcoeffs[k, 1] + 2 * Rcoeffs[k, 3]
		coeffs[k, 2] = 2 * Rcoeffs[k, 2] + 2 * Rcoeffs[k, 6]
		coeffs[k, 3] = Rcoeffs[k, 4] - Rcoeffs[k, 0] - Rcoeffs[k, 8]
		coeffs[k, 4] = 2 * Rcoeffs[k, 5] + 2 * Rcoeffs[k, 7]
		coeffs[k, 5] = Rcoeffs[k, 8] - Rcoeffs[k, 4] - Rcoeffs[k, 0]
		coeffs[k, 6] = 2 * Rcoeffs[k, 5] - 2 * Rcoeffs[k, 7]
		coeffs[k, 7] = 2 * Rcoeffs[k, 6] - 2 * Rcoeffs[k, 2]
		coeffs[k, 8] = 2 * Rcoeffs[k, 1] - 2 * Rcoeffs[k, 3]
		coeffs[k, 9] = Rcoeffs[k, 0] + Rcoeffs[k, 4] + Rcoeffs[k, 8]

	return coeffs

# c is 3x1, R is 3x3
def cayley_param(c, R):

	R = np.array([
		[c[0] * c[0] - c[1] * c[1] - c[2] * c[2] + 1,
			2 * c[0] * c[1] - 2 * c[2],
			2 * c[1] + 2 * c[0] * c[2]
		],
		[2 * c[2] + 2 * c[0] * c[1],
			c[1] * c[1] - c[0] * c[0] - c[2] * c[2] + 1,
			2 * c[1] * c[2] - 2 * c[0]
		],
		[2 * c[0] * c[2] - 2 * c[1],
			2 * c[0] + 2 * c[1] * c[2],
			c[2] * c[2] - c[1] * c[1] - c[0] * c[0] + 1
		]
	])

	R = R / (1 + c[0] * c[0] + c[1] * c[1] + c[2] * c[2])

	return R

# Performs feature estimation for 6 2D lines and 6 3D points.
# @param lines2D an array of FeatureLines. FeatureLines are basically a line
#        specified by a 3D vector, plus some additional info (e.g. alignment)
# @param points3D an array of Point3D. Point3Ds are basically 3D points (so 3
#        coordinates, x, y, z), plus some additional info.
# @return the various poses that are calculated
#
def estimate(lines2D, points3D):

	# we have two 3x6 matrices that we use to store 6 lines and 6 points.
	# we need to extract the raw line/point info from the passed in data,
	# which is line and point classes that each have some extra associated
	# data.
	lines = np.zeros((3, 6))
	points = np.zeros((3, 6))

	# used to check if all the lines are already aligned
	all_lines_aligned = True;

	for i in range(0, 6):
		lines[:,i] = lines2D[i].get_line()
		points[:,i] = points3D[i].get_xyz()

		all_lines_aligned = (all_lines_aligned) and (lines2D[i].is_aligned())

	print(f'raw points:\n{points}\n')
	print(f'raw lines :\n{lines}\n')

	# TODO in the original code, this returns
	#     return std::vector<P6LEstimator::M_t>();
	# need to figure out if we want to return anything here -- just printing
	# whether everything is aligned for now
	if (all_lines_aligned):
		print("All lines are already aligned.")
		return

	else:
		print("Not all lines are aligned.")

	# me:
	# so tt is a matrix made using the first 3 lines and points; Rcoeffs is
	# a matrix made using the last 3 lines and points
	#
	# here are comments from the C++ source (looks like it outlines the
	# matrix operations we need to do):
	# l'*(RX+t) = 0
	# l'*t + kron(X',l')*r = 0

	tt = np.zeros((3, 9))
	Rcoeffs = np.zeros((3, 9))

	for i in range(0, 3):
		tt[i, 0] = points[0, i] * lines[0, i]
		tt[i, 1] = points[0, i] * lines[1, i]
		tt[i, 2] = points[0, i] * lines[2, i]
		tt[i, 3] = points[1, i] * lines[0, i]
		tt[i, 4] = points[1, i] * lines[1, i]
		tt[i, 5] = points[1, i] * lines[2, i]
		tt[i, 6] = points[2, i] * lines[0, i]
		tt[i, 7] = points[2, i] * lines[1, i]
		tt[i, 8] = points[2, i] * lines[2, i]

		Rcoeffs[i, 0] = points[0, i + 3] * lines[0, i + 3]
		Rcoeffs[i, 1] = points[0, i + 3] * lines[1, i + 3]
		Rcoeffs[i, 2] = points[0, i + 3] * lines[2, i + 3]
		Rcoeffs[i, 3] = points[1, i + 3] * lines[0, i + 3]
		Rcoeffs[i, 4] = points[1, i + 3] * lines[1, i + 3]
		Rcoeffs[i, 5] = points[1, i + 3] * lines[2, i + 3]
		Rcoeffs[i, 6] = points[2, i + 3] * lines[0, i + 3]
		Rcoeffs[i, 7] = points[2, i + 3] * lines[1, i + 3]
		Rcoeffs[i, 8] = points[2, i + 3] * lines[2, i + 3]

	print(f'tt =\n{tt}\n')
	print(f'Rcoeffs =\n{Rcoeffs}\n')

#	// Make sure we have non-singular block for solving for t!

	# the absolute value of the determinant of the first 3 lines
	det_tt = np.abs(np.linalg.det(lines[0:3, 0:3]))
	B = lines[0:3, 0:3]

	print(f'det_tt = {det_tt}\n')

	if (det_tt < 1e-10):

		# we can do this if all we need are values from 0 to 1
		# A = rng.standard_normal((3, 3))
		# since we need values from -1 to 1, however, we use uniform

		A = np.zeros(9)

		# generate the numbers
		for i in range(0, 9):
			A[i] = uniform(-1, 1)

		# reshape to 3x3 matrix
		A = A.reshape(3, 3)

		# NOTE I think '*' in Eigen means matrix multiplication, but in
		#      numpy it means component-wise multiplication, so when
		#      converting to python, we have to use np.matmul() instead
		#      of '*'
		tt = tt + np.matmul(A, Rcoeffs)

		B = B + np.matmul(lines[0:3, 0:3], np.transpose(A));

#	// Express t in R

	# first do the LU factorization with partial pivoting to get P, L, and U
	P, L, U = scipy.linalg.lu(np.transpose(B))

	# then, solve for z by doing Lz = Pb --> Lz = Ptt
	z = np.linalg.solve(L, np.matmul(P, tt))

	# now solve for x by doing Ux = z; note we are writing the result to tt.
	tt = np.linalg.solve(U, z)

	Rcoeffs = Rcoeffs - np.matmul(np.transpose(lines[0:3,3:6]), tt)

#	// Convert to 3Q3 problem
	coeffs = np.zeros((3, 10))
	coeffs = rotation_to_e3q3(Rcoeffs, coeffs)

	# now call re3q3
	solutions = np.zeros((3, 8))
	n_sols = re3q3.re3q3(coeffs, solutions, True)

	output = []

	R = np.zeros((3, 3))
	t = np.zeros((3, 1))
	for i in range(0, n_sols):
		R = cayley_param(solutions[0:3,i], R)

		# t = -tt * Eigen::Map<Eigen::Matrix<double, 9, 1>>(R.data());
		#      tt is 3x9 and R is 3x3. I think this turns R into a 9x1
		#      matrix so we can do tt * R since 3x9 * 9x1 is valid
		#      matrix multiplication (3x9 * 3x3 is not)

		t = np.matmul(-tt, R.reshape(9, 1))

		pose = np.zeros((3, 4))
		pose[0:3,0:3] = R
		pose[0:3,3:3] = t
		output.append(pose)

	return output



# Testing setup. Define some Points3D and FeatureLines to pass to estimate()

points3D = [Point3D(0, 0, 0) for i in range(6)]

# assign values to the points
points3D[0].x = 2
points3D[0].y = 7
points3D[0].z = 5

points3D[1].set_xyz(5, 5, 6)
points3D[2].set_xyz(0, 9, 1)
points3D[3].set_xyz(1, 0, 0)
points3D[4].set_xyz(8, 5, 1)
points3D[5].set_xyz(4, 0, 0)

# print out the points
for i in range(6):
	print(f'points[{i}] = {points3D[i]}')

# assign values to the lines
lines = np.zeros((3, 6))
lines[:,0] = [8, 8, 3]
lines[:,1] = [1, 1, 7]
lines[:,2] = [9, 9, 3]
lines[:,3] = [3, 6, 6]
lines[:,4] = [8, 3, 8]
lines[:,5] = [8, 0, 8]

featureLines = [FeatureLine(lines[:,i], True) for i in range(6)]

featureLines[0].alignment = False

# print out the lines
for i in range(6):
	print(f'feature line @ i = {i} = {featureLines[i]}')

# try calling estimate() with our line data and point data
output = estimate(featureLines, points3D)

print(f'output = {output}')
