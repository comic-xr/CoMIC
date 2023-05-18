import numpy as np
from random import uniform
from scipy.spatial.transform import Rotation as R

# Used to initialize the A matrix in re3q3. Based on the original C++ re3q3,
# this method concatenates a 3x3 random rotation matrix with a 3x1 random,
# normalized vector and returns the result. The rotation matrix is generated
# using a uniform distribution and so is the vector. The vector consists of
# values ranging from [-1, 1].
#
# So, we have a rotation matrix K = [r1 r2 r3]
# (r1, r2, r3 represent each 3x1 column) and a 3x1 vector v1. The matrix that
# is returned is the concatenation of K and v1, [K v1] or [r1 r2 r3 v1].
#
# @return the matrix A, that is the column-wise concatenation of 3x3 rotation
#         matrix K and random normalized 3x1 vector v1, such that A = [K v1]
# @remarks the goal of this method is to be the Python equivalent of this C++
#          code (which is using the Eigen library):
#		A.block<3,3>(0,0) = Eigen::Quaternion<double>::UnitRandom().toRotationMatrix();
#		A.block<3,1>(0,3).setRandom().normalize();
def re3q3_random_matrix_initialize():
	# the 3x3 random rotation matrix -- scipy's Rotation.random() gives us
	# a uniformly distributed random rotation which we then convert to a
	# matrix using the as_matrix() function.
	rotation_matrix = R.random().as_matrix()

	# the 3x1 vector -- takes a few additional steps to set up
	random_vector = np.zeros(3)

	# fill with random values between -1 and 1
	for i in range(0, 3):
		random_vector[i] = uniform(-1, 1)

	# normalize
	random_vector = random_vector / np.linalg.norm(random_vector)

	# reshape to a column vector
	random_vector = random_vector.reshape(3, 1)

	# now we can concatenate the rotation_matrix and the random_vector to
	# form matrix A, which is a 3x4 matrix
	# the 1 passed to np.concatenate() indicates that we are concatenating
	# along axis 1, which I think means that we are concatenating column-
	# wise (which is what we want) rather than row-wise.
	return np.concatenate((rotation_matrix, random_vector), 1)

# coeffs is a 3x10 matrix;
# solutions is a 3x8 matrix;
# try_random_var_change is a boolean
def re3q3(coeffs, solutions, try_random_var_change):

	# some stuff happens up here

#    int elim_var = 1;
    
#    Eigen::Matrix<double, 3, 3> Ax, Ay, Az;
#    Ax << coeffs.col(3), coeffs.col(5), coeffs.col(4); // y^2, z^2, yz
#    Ay << coeffs.col(0), coeffs.col(5), coeffs.col(2); // x^2, z^2, xz
#    Az << coeffs.col(3), coeffs.col(0), coeffs.col(1); // y^2, x^2, yx

	elim_var = 1

	Ax = np.zeros((3, 3))
	Ay = np.zeros((3, 3))
	Az = np.zeros((3, 3))

	# Ax is [y^2 z^2 yz]
	Ax[:,0] = coeffs[:,3]
	Ax[:,1] = coeffs[:,5]
	Ax[:,2] = coeffs[:,4]

	# Ay is [x^2 z^2 xz]
	Ay[:,0] = coeffs[:,0]
	Ay[:,1] = coeffs[:,5]
	Ay[:,2] = coeffs[:,2]

	# Az is [y^2 x^2 yx]
	Az[:,0] = coeffs[:,3]
	Az[:,1] = coeffs[:,0]
	Az[:,2] = coeffs[:,1]
    
#    double detx = std::fabs(Ax.determinant());
#    double dety = std::fabs(Ay.determinant());
#    double detz = std::fabs(Az.determinant());
#
#    double det = detx;
#    
#    if(det < dety) {
#        det = dety;
#        elim_var = 2;
#    }
#    if(det < detz) {
#        det = detz;
#        elim_var = 3;
#    }

	detx = abs(np.linalg.det(Ax))
	dety = abs(np.linalg.det(Ay))
	detz = abs(np.linalg.det(Az))

	# looks like we are finding the largest of the determinants
	det = detx

	if (det < dety):
		det = dety
		elim_var = 2
	if (det < detz):
		det = detz
		elim_var = 3

#    if(try_random_var_change && det < 1e-10) {
#        Eigen::Matrix<double,3,4> A;
#        A.block<3,3>(0,0) = Eigen::Quaternion<double>::UnitRandom().toRotationMatrix();
#        A.block<3,1>(0,3).setRandom().normalize();
        
#        Eigen::Matrix<double,10,10> B;
#        B << A(0,0)*A(0,0), 2*A(0,0)*A(0,1), 2*A(0,0)*A(0,2), A(0,1)*A(0,1), 2*A(0,1)*A(0,2), A(0,2)*A(0,2), 2*A(0,0)*A(0,3), 2*A(0,1)*A(0,3), 2*A(0,2)*A(0,3), A(0,3)*A(0,3),
#                A(0,0)*A(1,0), A(0,0)*A(1,1) + A(0,1)*A(1,0), A(0,0)*A(1,2) + A(0,2)*A(1,0), A(0,1)*A(1,1), A(0,1)*A(1,2) + A(0,2)*A(1,1), A(0,2)*A(1,2), A(0,0)*A(1,3) + A(0,3)*A(1,0), A(0,1)*A(1,3) + A(0,3)*A(1,1), A(0,2)*A(1,3) + A(0,3)*A(1,2), A(0,3)*A(1,3),
#                A(0,0)*A(2,0), A(0,0)*A(2,1) + A(0,1)*A(2,0), A(0,0)*A(2,2) + A(0,2)*A(2,0), A(0,1)*A(2,1), A(0,1)*A(2,2) + A(0,2)*A(2,1), A(0,2)*A(2,2), A(0,0)*A(2,3) + A(0,3)*A(2,0), A(0,1)*A(2,3) + A(0,3)*A(2,1), A(0,2)*A(2,3) + A(0,3)*A(2,2), A(0,3)*A(2,3),
#                A(1,0)*A(1,0), 2*A(1,0)*A(1,1), 2*A(1,0)*A(1,2), A(1,1)*A(1,1), 2*A(1,1)*A(1,2), A(1,2)*A(1,2), 2*A(1,0)*A(1,3), 2*A(1,1)*A(1,3), 2*A(1,2)*A(1,3), A(1,3)*A(1,3),
#                A(1,0)*A(2,0), A(1,0)*A(2,1) + A(1,1)*A(2,0), A(1,0)*A(2,2) + A(1,2)*A(2,0), A(1,1)*A(2,1), A(1,1)*A(2,2) + A(1,2)*A(2,1), A(1,2)*A(2,2), A(1,0)*A(2,3) + A(1,3)*A(2,0), A(1,1)*A(2,3) + A(1,3)*A(2,1), A(1,2)*A(2,3) + A(1,3)*A(2,2), A(1,3)*A(2,3),
#                A(2,0)*A(2,0), 2*A(2,0)*A(2,1), 2*A(2,0)*A(2,2), A(2,1)*A(2,1), 2*A(2,1)*A(2,2), A(2,2)*A(2,2), 2*A(2,0)*A(2,3), 2*A(2,1)*A(2,3), 2*A(2,2)*A(2,3), A(2,3)*A(2,3),
#                0, 0, 0, 0, 0, 0, A(0,0), A(0,1), A(0,2), A(0,3),
#                0, 0, 0, 0, 0, 0, A(1,0), A(1,1), A(1,2), A(1,3),
#                0, 0, 0, 0, 0, 0, A(2,0), A(2,1), A(2,2), A(2,3),
#                0, 0, 0, 0, 0, 0, 0, 0, 0, 1;
#        coeffs = coeffs*B;
#        
#        int n_sols = re3q3(coeffs, solutions, false);
#        
#        // Revert change of variables
#        for(int k = 0; k < n_sols; k++) {
#            solutions->col(k) = A.block<3,3>(0,0) * solutions->col(k) + A.col(3);
#        }
#        return n_sols;
#    }


	if ((try_random_var_change) and (det < 1e-10)):

		A = re3q3_random_matrix_initialize()

		B = np.array(A[0,0]*A[0,0], 2*A[0,0]*A[0,1], 2*A[0,0]*A[0,2], A[0,1]*A[0,1], 2*A[0,1]*A[0,2], A[0,2]*A[0,2], 2*A[0,0]*A[0,3], 2*A[0,1]*A[0,3], 2*A[0,2]*A[0,3], A[0,3]*A[0,3],
                A[0,0]*A[1,0], A[0,0]*A[1,1] + A[0,1]*A[1,0], A[0,0]*A[1,2] + A[0,2]*A[1,0], A[0,1]*A[1,1], A[0,1]*A[1,2] + A[0,2]*A[1,1], A[0,2]*A[1,2], A[0,0]*A[1,3] + A[0,3]*A[1,0], A[0,1]*A[1,3] + A[0,3]*A[1,1], A[0,2]*A[1,3] + A[0,3]*A[1,2], A[0,3]*A[1,3],
                A[0,0]*A[2,0], A[0,0]*A[2,1] + A[0,1]*A[2,0], A[0,0]*A[2,2] + A[0,2]*A[2,0], A[0,1]*A[2,1], A[0,1]*A[2,2] + A[0,2]*A[2,1], A[0,2]*A[2,2], A[0,0]*A[2,3] + A[0,3]*A[2,0], A[0,1]*A[2,3] + A[0,3]*A[2,1], A[0,2]*A[2,3] + A[0,3]*A[2,2], A[0,3]*A[2,3],
                A[1,0]*A[1,0], 2*A[1,0]*A[1,1], 2*A[1,0]*A[1,2], A[1,1]*A[1,1], 2*A[1,1]*A[1,2], A[1,2]*A[1,2], 2*A[1,0]*A[1,3], 2*A[1,1]*A[1,3], 2*A[1,2]*A[1,3], A[1,3]*A[1,3],
                A[1,0]*A[2,0], A[1,0]*A[2,1] + A[1,1]*A[2,0], A[1,0]*A[2,2] + A[1,2]*A[2,0], A[1,1]*A[2,1], A[1,1]*A[2,2] + A[1,2]*A[2,1], A[1,2]*A[2,2], A[1,0]*A[2,3] + A[1,3]*A[2,0], A[1,1]*A[2,3] + A[1,3]*A[2,1], A[1,2]*A[2,3] + A[1,3]*A[2,2], A[1,3]*A[2,3],
                A[2,0]*A[2,0], 2*A[2,0]*A[2,1], 2*A[2,0]*A[2,2], A[2,1]*A[2,1], 2*A[2,1]*A[2,2], A[2,2]*A[2,2], 2*A[2,0]*A[2,3], 2*A[2,1]*A[2,3], 2*A[2,2]*A[2,3], A[2,3]*A[2,3],
                0, 0, 0, 0, 0, 0, A[0,0], A[0,1], A[0,2], A[0,3],
                0, 0, 0, 0, 0, 0, A[1,0], A[1,1], A[1,2], A[1,3],
                0, 0, 0, 0, 0, 0, A[2,0], A[2,1], A[2,2], A[2,3],
                0, 0, 0, 0, 0, 0, 0, 0, 0, 1)

		# B is a 10x10 matrix
		B = B.reshape(10, 10)

		coeffs = np.matmul(coeffs, B)

		# recursive call; passing try_random_var_change as false will
		# prevent further levels of recursion (so each call to re3q3 will
		# have a most 1 recursive call)
		n_sols = re3q3(coeffs, solutions, False)

		for k in range(0, n_sols):
			# assuming we add A[:,3] after doing the matrix multiplication
			# (order of operations is not explicitly shown in the source
			# code)
			solutions[:,k] = np.matmul(A[0:3,0:3], solutions[:,k]) + A[:,3]

		return n_sols

# looks like we are eliminating the variable with the largest deteminant here    
#    Eigen::Matrix<double, 3, 7> P;
#    
#    if (elim_var == 1) {
#        // re-order columns to eliminate x (target: y^2 z^2 yz x^2 xy xz x y z 1)
#        P << coeffs.col(0), coeffs.col(1), coeffs.col(2), coeffs.col(6), coeffs.col(7), coeffs.col(8), coeffs.col(9);
#        P = -Ax.lu().solve(P);
#    } else if (elim_var == 2) {
#        // re-order columns to eliminate y (target: x^2 z^2 xz y^2 xy yz y x z 1)
#        P << coeffs.col(3), coeffs.col(1), coeffs.col(4), coeffs.col(7), coeffs.col(6), coeffs.col(8), coeffs.col(9);
#        P = -Ay.lu().solve(P);
#    } else if (elim_var == 3) {
#        // re-order columns to eliminate z (target: y^2 x^2 yx z^2 zy z y x 1)
#        P << coeffs.col(5), coeffs.col(4), coeffs.col(2), coeffs.col(8), coeffs.col(7), coeffs.col(6), coeffs.col(9);
#        P = -Az.lu().solve(P);
#    }

	P = np.zeros((3, 7))

#       // re-order columns to eliminate x (target: y^2 z^2 yz x^2 xy xz x y z 1)
	if (elim_var == 1):
		P[:,0] = coeffs[:,0]
		P[:,1] = coeffs[:,1]
		P[:,2] = coeffs[:,2]
		P[:,3] = coeffs[:,6]
		P[:,4] = coeffs[:,7]
		P[:,5] = coeffs[:,8]
		P[:,6] = coeffs[:,9]

		# TODO P = -Ax.lu().solve(P);

#       // re-order columns to eliminate y (target: x^2 z^2 xz y^2 xy yz y x z 1)
	elif (elim_var == 2):
		P[:,0] = coeffs[:,3]
		P[:,1] = coeffs[:,1]
		P[:,2] = coeffs[:,4]
		P[:,3] = coeffs[:,7]
		P[:,4] = coeffs[:,6]
		P[:,5] = coeffs[:,8]
		P[:,6] = coeffs[:,9]

        	# TODO P = -Ay.lu().solve(P);

#       // re-order columns to eliminate z (target: y^2 x^2 yx z^2 zy z y x 1)
	elif (elim_var == 3):
		P[:,0] = coeffs[:,5]
		P[:,1] = coeffs[:,4]
		P[:,2] = coeffs[:,2]
		P[:,3] = coeffs[:,8]
		P[:,4] = coeffs[:,7]
		P[:,5] = coeffs[:,6]
		P[:,6] = coeffs[:,9]

        	# TODO P = -Az.lu().solve(P);

	# then we have the large matrix operations

	# big operation 1
	a11 = P[0,1]*P[2,1]+P[0,2]*P[1,1]-P[2,1]*P[0,1]-P[2,2]*P[2,1]-P[2,0]
	a12 = P[0,1]*P[2,4]+P[0,4]*P[2,1]+P[0,2]*P[1,4]+P[0,5]*P[1,1]-P[2,1]*P[0,4]-P[2,4]*P[0,1]-P[2,2]*P[2,4]-P[2,5]*P[2,1]-P[2,3]
	a13 = P[0,4]*P[2,4]+P[0,5]*P[1,4]-P[2,4]*P[0,4]-P[2,5]*P[2,4]-P[2,6]
	a14 = P[0,1]*P[2,2]+P[0,2]*P[1,2]-P[2,1]*P[0,2]-P[2,2]*P[2,2]+P[0,0]
	a15 = P[0,1]*P[2,5]+P[0,4]*P[2,2]+P[0,2]*P[1,5]+P[0,5]*P[1,2]-P[2,1]*P[0,5]-P[2,4]*P[0,2]-P[2,2]*P[2,5]-P[2,5]*P[2,2] + P[0,3]
	a16 = P[0,4]*P[2,5]+P[0,5]*P[1,5]-P[2,4]*P[0,5]-P[2,5]*P[2,5]+P[0,6]
	a17 = P[0,1]*P[2,0]+P[0,2]*P[1,0]-P[2,1]*P[0,0]-P[2,2]*P[2,0]
	a18 = P[0,1]*P[2,3]+P[0,4]*P[2,0]+P[0,2]*P[1,3]+P[0,5]*P[1,0]-P[2,1]*P[0,3]-P[2,4]*P[0,0]-P[2,2]*P[2,3]-P[2,5]*P[2,0]
	a19 = P[0,1]*P[2,6]+P[0,4]*P[2,3]+P[0,2]*P[1,6]+P[0,5]*P[1,3]-P[2,1]*P[0,6]-P[2,4]*P[0,3]-P[2,2]*P[2,6]-P[2,5]*P[2,3]
	a110 = P[0,4]*P[2,6]+P[0,5]*P[1,6]-P[2,4]*P[0,6]-P[2,5]*P[2,6]

	# big operations 2
	a21 = P[2,1]*P[2,1]+P[2,2]*P[1,1]-P[1,1]*P[0,1]-P[1,2]*P[2,1]-P[1,0]
	a22 = P[2,1]*P[2,4]+P[2,4]*P[2,1]+P[2,2]*P[1,4]+P[2,5]*P[1,1]-P[1,1]*P[0,4]-P[1,4]*P[0,1]-P[1,2]*P[2,4]-P[1,5]*P[2,1]-P[1,3]
	a23 = P[2,4]*P[2,4]+P[2,5]*P[1,4]-P[1,4]*P[0,4]-P[1,5]*P[2,4]-P[1,6]
	a24 = P[2,1]*P[2,2]+P[2,2]*P[1,2]-P[1,1]*P[0,2]-P[1,2]*P[2,2]+P[2,0]
	a25 = P[2,1]*P[2,5]+P[2,4]*P[2,2]+P[2,2]*P[1,5]+P[2,5]*P[1,2]-P[1,1]*P[0,5]-P[1,4]*P[0,2]-P[1,2]*P[2,5]-P[1,5]*P[2,2] + P[2,3]
	a26 = P[2,4]*P[2,5]+P[2,5]*P[1,5]-P[1,4]*P[0,5]-P[1,5]*P[2,5]+P[2,6]
	a27 = P[2,1]*P[2,0]+P[2,2]*P[1,0]-P[1,1]*P[0,0]-P[1,2]*P[2,0]
	a28 = P[2,1]*P[2,3]+P[2,4]*P[2,0]+P[2,2]*P[1,3]+P[2,5]*P[1,0]-P[1,1]*P[0,3]-P[1,4]*P[0,0]-P[1,2]*P[2,3]-P[1,5]*P[2,0]
	a29 = P[2,1]*P[2,6]+P[2,4]*P[2,3]+P[2,2]*P[1,6]+P[2,5]*P[1,3]-P[1,1]*P[0,6]-P[1,4]*P[0,3]-P[1,2]*P[2,6]-P[1,5]*P[2,3]
	a210 = P[2,4]*P[2,6]+P[2,5]*P[1,6]-P[1,4]*P[0,6]-P[1,5]*P[2,6]

	t2 = P[2,1]*P[2,1]
	t3 = P[2,2]*P[2,2]
	t4 = P[0,1]*P[1,4]
	t5 = P[0,4]*P[1,1]
	t6 = t4+t5
	t7 = P[0,2]*P[1,5]
	t8 = P[0,5]*P[1,2]
	t9 = t7+t8
	t10 = P[0,1]*P[1,5]
	t11 = P[0,4]*P[1,2]
	t12 = t10+t11
	t13 = P[0,2]*P[1,4]
	t14 = P[0,5]*P[1,1]
	t15 = t13+t14
	t16 = P[2,1]*P[2,5]
	t17 = P[2,2]*P[2,4]
	t18 = t16+t17
	t19 = P[2,4]*P[2,4]
	t20 = P[2,5]*P[2,5]

	# big operations 3
	a31 = P[0,0]*P[1,1]+P[0,1]*P[1,0]-P[2,0]*P[2,1]*2.0-P[0,1]*t2-P[1,1]*t3-P[2,2]*t2*2.0+(P[0,1]*P[0,1])*P[1,1]+P[0,2]*P[1,1]*P[1,2]+P[0,1]*P[1,2]*P[2,1]+P[0,2]*P[1,1]*P[2,1]
	a32 = P[0,0]*P[1,4]+P[0,1]*P[1,3]+P[0,3]*P[1,1]+P[0,4]*P[1,0]-P[2,0]*P[2,4]*2.0-P[2,1]*P[2,3]*2.0-P[0,4]*t2+P[0,1]*t6-P[1,4]*t3+P[1,1]*t9+P[2,1]*t12+P[2,1]*t15-P[2,1]*t18*2.0+P[0,1]*P[0,4]*P[1,1]+P[0,2]*P[1,2]*P[1,4]+P[0,1]*P[1,2]*P[2,4]+P[0,2]*P[1,1]*P[2,4]-P[0,1]*P[2,1]*P[2,4]*2.0-P[1,1]*P[2,2]*P[2,5]*2.0-P[2,1]*P[2,2]*P[2,4]*2.0
	a33 = P[0,1]*P[1,6]+P[0,3]*P[1,4]+P[0,4]*P[1,3]+P[0,6]*P[1,1]-P[2,1]*P[2,6]*2.0-P[2,3]*P[2,4]*2.0+P[0,4]*t6-P[0,1]*t19+P[1,4]*t9-P[1,1]*t20+P[2,4]*t12+P[2,4]*t15-P[2,4]*t18*2.0+P[0,1]*P[0,4]*P[1,4]+P[0,5]*P[1,1]*P[1,5]+P[0,4]*P[1,5]*P[2,1]+P[0,5]*P[1,4]*P[2,1]-P[0,4]*P[2,1]*P[2,4]*2.0-P[1,4]*P[2,2]*P[2,5]*2.0-P[2,1]*P[2,4]*P[2,5]*2.0
	a34 = P[0,4]*P[1,6]+P[0,6]*P[1,4]-P[2,4]*P[2,6]*2.0-P[0,4]*t19-P[1,4]*t20-P[2,5]*t19*2.0+(P[0,4]*P[0,4])*P[1,4]+P[0,5]*P[1,4]*P[1,5]+P[0,4]*P[1,5]*P[2,4]+P[0,5]*P[1,4]*P[2,4]
	a35 = P[0,0]*P[1,2]+P[0,2]*P[1,0]-P[2,0]*P[2,2]*2.0-P[0,2]*t2-P[1,2]*t3-P[2,1]*t3*2.0+P[0,2]*(P[1,2]*P[1,2])+P[0,1]*P[0,2]*P[1,1]+P[0,1]*P[1,2]*P[2,2]+P[0,2]*P[1,1]*P[2,2]
	a36 = P[0,0]*P[1,5]+P[0,2]*P[1,3]+P[0,3]*P[1,2]+P[0,5]*P[1,0]-P[2,0]*P[2,5]*2.0-P[2,2]*P[2,3]*2.0-P[0,5]*t2+P[0,2]*t6-P[1,5]*t3+P[1,2]*t9+P[2,2]*t12+P[2,2]*t15-P[2,2]*t18*2.0+P[0,1]*P[0,5]*P[1,1]+P[0,2]*P[1,2]*P[1,5]+P[0,1]*P[1,2]*P[2,5]+P[0,2]*P[1,1]*P[2,5]-P[0,2]*P[2,1]*P[2,4]*2.0-P[1,2]*P[2,2]*P[2,5]*2.0-P[2,1]*P[2,2]*P[2,5]*2.0
	a37 = P[0,2]*P[1,6]+P[0,3]*P[1,5]+P[0,5]*P[1,3]+P[0,6]*P[1,2]-P[2,2]*P[2,6]*2.0-P[2,3]*P[2,5]*2.0+P[0,5]*t6-P[0,2]*t19+P[1,5]*t9-P[1,2]*t20+P[2,5]*t12+P[2,5]*t15-P[2,5]*t18*2.0+P[0,2]*P[0,4]*P[1,4]+P[0,5]*P[1,2]*P[1,5]+P[0,4]*P[1,5]*P[2,2]+P[0,5]*P[1,4]*P[2,2]-P[0,5]*P[2,1]*P[2,4]*2.0-P[1,5]*P[2,2]*P[2,5]*2.0-P[2,2]*P[2,4]*P[2,5]*2.0
	a38 = P[0,5]*P[1,6]+P[0,6]*P[1,5]-P[2,5]*P[2,6]*2.0-P[0,5]*t19-P[1,5]*t20-P[2,4]*t20*2.0+P[0,5]*(P[1,5]*P[1,5])+P[0,4]*P[0,5]*P[1,4]+P[0,4]*P[1,5]*P[2,5]+P[0,5]*P[1,4]*P[2,5]
	a39 = P[0,0]*P[1,0]-P[0,0]*t2-P[1,0]*t3-P[2,0]*P[2,0]+P[0,0]*P[0,1]*P[1,1]+P[0,2]*P[1,0]*P[1,2]+P[0,1]*P[1,2]*P[2,0]+P[0,2]*P[1,1]*P[2,0]-P[2,0]*P[2,1]*P[2,2]*2.0
	a310 = P[0,0]*P[1,3]+P[0,3]*P[1,0]-P[2,0]*P[2,3]*2.0-P[0,3]*t2+P[0,0]*t6-P[1,3]*t3+P[1,0]*t9+P[2,0]*t12+P[2,0]*t15-P[2,0]*t18*2.0+P[0,1]*P[0,3]*P[1,1]+P[0,2]*P[1,2]*P[1,3]+P[0,1]*P[1,2]*P[2,3]+P[0,2]*P[1,1]*P[2,3]-P[0,0]*P[2,1]*P[2,4]*2.0-P[1,0]*P[2,2]*P[2,5]*2.0-P[2,1]*P[2,2]*P[2,3]*2.0
	a311 = P[0,0]*P[1,6]+P[0,3]*P[1,3]+P[0,6]*P[1,0]-P[2,0]*P[2,6]*2.0-P[0,6]*t2+P[0,3]*t6-P[0,0]*t19-P[1,6]*t3+P[1,3]*t9-P[1,0]*t20+P[2,3]*t12+P[2,3]*t15-P[2,3]*t18*2.0-P[2,3]*P[2,3]+P[0,0]*P[0,4]*P[1,4]+P[0,1]*P[0,6]*P[1,1]+P[0,2]*P[1,2]*P[1,6]+P[0,5]*P[1,0]*P[1,5]+P[0,1]*P[1,2]*P[2,6]+P[0,2]*P[1,1]*P[2,6]+P[0,4]*P[1,5]*P[2,0]+P[0,5]*P[1,4]*P[2,0]-P[0,3]*P[2,1]*P[2,4]*2.0-P[1,3]*P[2,2]*P[2,5]*2.0-P[2,0]*P[2,4]*P[2,5]*2.0-P[2,1]*P[2,2]*P[2,6]*2.0
	a312 = P[0,3]*P[1,6]+P[0,6]*P[1,3]-P[2,3]*P[2,6]*2.0+P[0,6]*t6-P[0,3]*t19+P[1,6]*t9-P[1,3]*t20+P[2,6]*t12+P[2,6]*t15-P[2,6]*t18*2.0+P[0,3]*P[0,4]*P[1,4]+P[0,5]*P[1,3]*P[1,5]+P[0,4]*P[1,5]*P[2,3]+P[0,5]*P[1,4]*P[2,3]-P[0,6]*P[2,1]*P[2,4]*2.0-P[1,6]*P[2,2]*P[2,5]*2.0-P[2,3]*P[2,4]*P[2,5]*2.0
	a313 = P[0,6]*P[1,6]-P[0,6]*t19-P[1,6]*t20-P[2,6]*P[2,6]+P[0,4]*P[0,6]*P[1,4]+P[0,5]*P[1,5]*P[1,6]+P[0,4]*P[1,5]*P[2,6]+P[0,5]*P[1,4]*P[2,6]-P[2,4]*P[2,5]*P[2,6]*2.0

	# big operations 4
	c[0] = a14*a27*a31-a17*a24*a31-a11*a27*a35+a17*a21*a35+a11*a24*a39-a14*a21*a39
	c[1] = a14*a27*a32+a14*a28*a31+a15*a27*a31-a17*a24*a32-a17*a25*a31-a18*a24*a31-a11*a27*a36-a11*a28*a35-a12*a27*a35+a17*a21*a36+a17*a22*a35+a18*a21*a35+a11*a25*a39+a12*a24*a39-a14*a22*a39-a15*a21*a39+a11*a24*a310-a14*a21*a310
	c[2] = a14*a27*a33+a14*a28*a32+a14*a29*a31+a15*a27*a32+a15*a28*a31+a16*a27*a31-a17*a24*a33-a17*a25*a32-a17*a26*a31-a18*a24*a32-a18*a25*a31-a19*a24*a31-a11*a27*a37-a11*a28*a36-a11*a29*a35-a12*a27*a36-a12*a28*a35-a13*a27*a35+a17*a21*a37+a17*a22*a36+a17*a23*a35+a18*a21*a36+a18*a22*a35+a19*a21*a35+a11*a26*a39+a12*a25*a39+a13*a24*a39-a14*a23*a39-a15*a22*a39-a16*a21*a39+a11*a24*a311+a11*a25*a310+a12*a24*a310-a14*a21*a311-a14*a22*a310-a15*a21*a310
	c[3] = a14*a27*a34+a14*a28*a33+a14*a29*a32+a15*a27*a33+a15*a28*a32+a15*a29*a31+a16*a27*a32+a16*a28*a31-a17*a24*a34-a17*a25*a33-a17*a26*a32-a18*a24*a33-a18*a25*a32-a18*a26*a31-a19*a24*a32-a19*a25*a31-a11*a27*a38-a11*a28*a37-a11*a29*a36-a12*a27*a37-a12*a28*a36-a12*a29*a35-a13*a27*a36-a13*a28*a35+a17*a21*a38+a17*a22*a37+a17*a23*a36+a18*a21*a37+a18*a22*a36+a18*a23*a35+a19*a21*a36+a19*a22*a35+a12*a26*a39+a13*a25*a39-a15*a23*a39-a16*a22*a39-a24*a31*a110+a21*a35*a110+a14*a31*a210-a11*a35*a210+a11*a24*a312+a11*a25*a311+a11*a26*a310+a12*a24*a311+a12*a25*a310+a13*a24*a310-a14*a21*a312-a14*a22*a311-a14*a23*a310-a15*a21*a311-a15*a22*a310-a16*a21*a310
	c[4] = a14*a28*a34+a14*a29*a33+a15*a27*a34+a15*a28*a33+a15*a29*a32+a16*a27*a33+a16*a28*a32+a16*a29*a31-a17*a25*a34-a17*a26*a33-a18*a24*a34-a18*a25*a33-a18*a26*a32-a19*a24*a33-a19*a25*a32-a19*a26*a31-a11*a28*a38-a11*a29*a37-a12*a27*a38-a12*a28*a37-a12*a29*a36-a13*a27*a37-a13*a28*a36-a13*a29*a35+a17*a22*a38+a17*a23*a37+a18*a21*a38+a18*a22*a37+a18*a23*a36+a19*a21*a37+a19*a22*a36+a19*a23*a35+a13*a26*a39-a16*a23*a39-a24*a32*a110-a25*a31*a110+a21*a36*a110+a22*a35*a110+a14*a32*a210+a15*a31*a210-a11*a36*a210-a12*a35*a210+a11*a24*a313+a11*a25*a312+a11*a26*a311+a12*a24*a312+a12*a25*a311+a12*a26*a310+a13*a24*a311+a13*a25*a310-a14*a21*a313-a14*a22*a312-a14*a23*a311-a15*a21*a312-a15*a22*a311-a15*a23*a310-a16*a21*a311-a16*a22*a310
	c[5] = a14*a29*a34+a15*a28*a34+a15*a29*a33+a16*a27*a34+a16*a28*a33+a16*a29*a32-a17*a26*a34-a18*a25*a34-a18*a26*a33-a19*a24*a34-a19*a25*a33-a19*a26*a32-a11*a29*a38-a12*a28*a38-a12*a29*a37-a13*a27*a38-a13*a28*a37-a13*a29*a36+a17*a23*a38+a18*a22*a38+a18*a23*a37+a19*a21*a38+a19*a22*a37+a19*a23*a36-a24*a33*a110-a25*a32*a110-a26*a31*a110+a21*a37*a110+a22*a36*a110+a23*a35*a110+a14*a33*a210+a15*a32*a210+a16*a31*a210-a11*a37*a210-a12*a36*a210-a13*a35*a210+a11*a25*a313+a11*a26*a312+a12*a24*a313+a12*a25*a312+a12*a26*a311+a13*a24*a312+a13*a25*a311+a13*a26*a310-a14*a22*a313-a14*a23*a312-a15*a21*a313-a15*a22*a312-a15*a23*a311-a16*a21*a312-a16*a22*a311-a16*a23*a310
	c[6] = a15*a29*a34+a16*a28*a34+a16*a29*a33-a18*a26*a34-a19*a25*a34-a19*a26*a33-a12*a29*a38-a13*a28*a38-a13*a29*a37+a18*a23*a38+a19*a22*a38+a19*a23*a37-a24*a34*a110-a25*a33*a110-a26*a32*a110+a21*a38*a110+a22*a37*a110+a23*a36*a110+a14*a34*a210+a15*a33*a210+a16*a32*a210-a11*a38*a210-a12*a37*a210-a13*a36*a210+a11*a26*a313+a12*a25*a313+a12*a26*a312+a13*a24*a313+a13*a25*a312+a13*a26*a311-a14*a23*a313-a15*a22*a313-a15*a23*a312-a16*a21*a313-a16*a22*a312-a16*a23*a311
	c[7] = a16*a29*a34-a19*a26*a34-a13*a29*a38+a19*a23*a38-a25*a34*a110-a26*a33*a110+a22*a38*a110+a23*a37*a110+a15*a34*a210+a16*a33*a210-a12*a38*a210-a13*a37*a210+a12*a26*a313+a13*a25*a313+a13*a26*a312-a15*a23*a313-a16*a22*a313-a16*a23*a312
	c[8] = -a26*a34*a110+a23*a38*a110+a16*a34*a210-a13*a38*a210+a13*a26*a313-a16*a23*a313

	# and then we do some more stuff down here
