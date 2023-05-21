import Point

points = [Point.Point(4, 2.3), Point.Point(5, 700), Point.Point(-5, 0.3)]

num_features = len(points)

# Undefined classes referenced:
# Camera
# Image
# FeatureLine
# Vector3D
# Line

# Undefined methods:
# Camera.ImageToWorld(Point point)
# Image.Line(int index)
# Image.HasGravity()
# Vector3D.cross(Vector3D vector)
# Vector3D.random()
# Point.homogeneous()
# Image.Line(int index).Line().head().norm()
# FeatureLine.SetLine(Line line)

#for (int feature_idx = 0; feature_idx < num_features; ++ feature_idx) {
for i in range(num_features):
	print(i)


#	const Eigen::Vector2d point2D = points.at(feature_idx);
#	const Eigen::Vector2d normalized_point2D =
#		camera.ImageToWorld(point2D);
	point = points[i]
	normalized_point = camera.ImageToWorld(point)

#	FeatureLine& feature_line = image.Line(feature_idx);
	feature_line = image.Line(i)

#	if (image.HasGravity() && aligned_feature_idxs.count(feature_idx) > 0) {
#		// Line should be gravity-aligned
#		const Eigen::Vector3d line_dir =
#		gravity_dir.cross(normalized_point2D.homogeneous());
#
#		feature_line = FeatureLine{line_dir, true, kInvalidPoint3DId};
#	}

	if (image.HasGravity() and (aligned_feature_idxs.count(i) > 0)):
		line_dir = gravity_dir.cross(normalized_point.homogeneous())
		#feature_line = ?

#	else {
#		// Assign a random orientation
#
#		const Eigen::Vector3d random_dir = Eigen::Vector3d::Random();
#		const Eigen::Vector3d line_dir =
#		random_dir.cross(normalized_point2D.homogeneous());
#
#		feature_line = FeatureLine{line_dir, false, kInvalidPoint3DId};
#	}

	else:
		random_dir = random_3d_vector()
		line_dir = random_dir.cross(normalized_point.homogeneous())

		#feature_line = ?

#	// Normalizing the first two components to 1 makes the distance
#	// computation during SfM simpler.
#	const double head_norm = image.Line(feature_idx).Line().head<2>().norm();

	head_norm = image.Line(i).Line().head().norm()

#	feature_line.SetLine(feature_line.Line() / head_norm);
	feature_line.SetLine(feature_line.Line() / head_norm)
# }
