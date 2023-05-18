# given: a list of points; perform various operations to generate lines

#	// Assign a random orientation
#
#	const Eigen::Vector3d random_dir = Eigen::Vector3d::Random();
#	const Eigen::Vector3d line_dir =
#	random_dir.cross(normalized_point2D.homogeneous());
#
#	feature_line = FeatureLine{line_dir, false, kInvalidPoint3DId};

# okay, so here's what we need to do:
	# 1 create a random vector r_
	# 2 convert the current point to 3D homogeneous coordinates, giving vector p_
	# 3 take the cross product of r_ x p_
	# 4 create a Line structure that stores this cross product as its direction

import numpy as np 
import Point

from numpy.random import default_rng

# random number generator initialization
rng = default_rng()

# Creates a 3D numpy vector that has random values between 0 and 1.
#
# @return a 3D numpy vector with each component set to a random value between 0
#         and 1
def random_vector_3D():
	return rng.random((3))

# Converts the given 2D point to homogeneous coordinates by adding a 3rd
# component that is set to 1.
#
# @param vector2D the point to convert
# @return the 3D vector representing the homogeneous coordinate of the given
#         point
def homogeneous(vector2D):
	return np.concatenate((vector2D, np.array([1])), axis = 0)

# the given points
points = np.array([
	[0, 6],
	[5.2, 7],
	[-3, 9.8],
	[32, 5]
])

# number of points  = np.size() / np.ndim()
num_points = int(np.size(points) / np.ndim(points))
print(f'Number of points = {np.size(points)} / {np.ndim(points)} = {num_points}')

# the array that we store the line data in -- it seems like the FeatureLines
# from colmap are mostly a direction vector, so for now we can just store each
# one as an entry in an array
lines = np.zeros((num_points, 3))

# go through each point and generate a line for each one
for i in range(0, num_points):

	print(f'Iteration {i}')

	# generate a random direction and convert the point to homogeneous
	# coordinates
	random_direction = random_vector_3D()
	homogeneous_point = homogeneous(points[i])

	# the line direction is the cross product of the 2 vectors
	line_direction = np.cross(random_direction, homogeneous_point)

	print(f'-->  Line direction: {line_direction}')

	lines[i] = line_direction

# print out the line information
print("Lines array:")
print(lines)
