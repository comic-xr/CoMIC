// Copyright (c) 2020, ETH Zurich and UNC Chapel Hill.
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//
//     * Neither the name of ETH Zurich and UNC Chapel Hill nor the names of
//       its contributors may be used to endorse or promote products derived
//       from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.
//
// Authors: Johannes L. Schoenberger (jsch-at-demuc-dot-de)
//          Viktor Larsson (viktor.larsson@inf.ethz.ch)
//          Marcel Geppert (marcel.geppert@inf.ethz.ch)

void LineFeatureWriterThread::Run() {
	size_t image_index = 0;

	/* me:
	 * keep looping through images and processing them until some stop
	 * condition (IsStopped()) is given
	 */
	while (true) {
		if (IsStopped()) {
			break;
		}

		auto input_job = input_queue_->Pop();

		/* me: only process valid jobs */
		if (input_job.IsValid()) {

			/* me:
			 * Step 1: Check that there are no errors with the
			 *         current image.
			 */

			auto& image_data = input_job.Data();

			image_index += 1;

			std::cout << StringPrintf("Processed file [%d/%d]", image_index,
						num_images_)
				<< std::endl;

			std::cout << StringPrintf("  Name:            %s",
						image_data.image.Name().c_str())
				<< std::endl;

			/* me:
			 * perform different checks to make sure the current
			 * image is valid
			 */
			if (image_data.status == ImageReader::Status::IMAGE_EXISTS) {
				std::cout << "  SKIP: Features for image already extracted."
				  << std::endl;
			}

			else if (image_data.status == ImageReader::Status::BITMAP_ERROR) {
				std::cout << "  ERROR: Failed to read image file format." << std::endl;
			}

			else if (image_data.status ==
				 ImageReader::Status::CAMERA_SINGLE_DIM_ERROR)
			{
				std::cout << "  ERROR: Single camera specified, "
					     "but images have different dimensions."
					  << std::endl;
			}

			else if (image_data.status ==
				 ImageReader::Status::CAMERA_EXIST_DIM_ERROR)
			{
				std::cout << "  ERROR: Image previously processed, but current image "
					     "has different dimensions."
					  << std::endl;
			}

			else if (image_data.status == ImageReader::Status::CAMERA_PARAM_ERROR) {
				std::cout << "  ERROR: Camera has invalid parameters." << std::endl;
			}

			else if (image_data.status == ImageReader::Status::FAILURE) {
				std::cout << "  ERROR: Failed to extract features." << std::endl;
			}

			/* me:
			 * if the image did not have any of the errors we just
			 * looked at, but also did not have a SUCCESS status,
			 * then continue on to the next image. That is, only
			 * process images that have a successful status.
			 */
			if (image_data.status != ImageReader::Status::SUCCESS) {
				continue;
			}

			/* me:
			 * Step 2: Print out additional information about the
			 *         current image.
			 */

			/* me:
			 * print out information about the camera used to create
			 * this image
			 */
			std::cout << StringPrintf("  Dimensions:      %d x %d",
						image_data.camera.Width(),
						image_data.camera.Height())
				<< std::endl;
			std::cout << StringPrintf("  Camera:          #%d - %s",
						image_data.camera.CameraId(),
						image_data.camera.ModelName().c_str())
				<< std::endl;
			std::cout << StringPrintf("  Focal Length:    %.2fpx",
						image_data.camera.MeanFocalLength());

			if (image_data.camera.HasPriorFocalLength()) {
				std::cout << " (Prior)" << std::endl;
			}

			else {
				std::cout << std::endl;
			}

			/* me: Print out GPS data if the image has any */
			if (image_data.image.HasTvecPrior()) {
				std::cout << StringPrintf(
				    "  GPS:             LAT=%.3f, LON=%.3f, ALT=%.3f",
				    image_data.image.TvecPrior(0),
				    image_data.image.TvecPrior(1),
				    image_data.image.TvecPrior(2))
					  << std::endl;
			}

			std::cout << StringPrintf("  Features:        %d",
						image_data.keypoints.size())
				<< std::endl;

			/* me:
			 * Step 3: Generate lines for the image if none exist.
			 */

			/* me:
			 * if there are no lines generated for this image, then
			 * go ahead and make some
			 */
			if (!database_->ExistsLineFeatures(image_data.image.ImageId())) {
				// Generate line features
				Image& image = image_data.image;

				const std::vector<Eigen::Vector2d> points =
				    FeatureKeypointsToPointsVector(image_data.keypoints);

				const int num_features = points.size();
				const double num_features_double = static_cast<double>(num_features);
				const int max_feature_idx = num_features-1;

				// Make sure the lines are initialized
				if (image.NumLines() == 0) {
					image.SetLines(FeatureLines(num_features));
				}

				// Randomly select features to be aligned
				std::set<int> aligned_feature_idxs;
				while (static_cast<double>(aligned_feature_idxs.size())
					/ num_features_double < aligned_line_ratio_)
				{
					aligned_feature_idxs.emplace(RandomInteger(0, max_feature_idx));
				}

				std::cout << "Aligning " << aligned_feature_idxs.size()
					  << " out of " << num_features << " lines\n";

				// GO over all features and create the respective lines
				const Camera& camera = database_->ReadCamera(image.CameraId());

				const Eigen::Vector3d& gravity_dir =
				    image.HasGravity() ? image.GravityDirection() : Eigen::Vector3d::Zero();

				if (!image.HasGravity()) {
					std::cout << "Warning - No gravity available for image "
					    << image.ImageId() << " (" << image.Name() << "). "
					    << "Only assigning random line features."
					    << std::endl;
				}

				for (int feature_idx = 0; feature_idx < num_features; ++ feature_idx) {
					const Eigen::Vector2d point2D = points.at(feature_idx);
					const Eigen::Vector2d normalized_point2D =
						camera.ImageToWorld(point2D);

					FeatureLine& feature_line = image.Line(feature_idx);

					if (image.HasGravity() && aligned_feature_idxs.count(feature_idx) > 0) {
						// Line should be gravity-aligned
						const Eigen::Vector3d line_dir =
						gravity_dir.cross(normalized_point2D.homogeneous());

						feature_line = FeatureLine{line_dir, true, kInvalidPoint3DId};
					}

					else {
						// Assign a random orientation

						const Eigen::Vector3d random_dir = Eigen::Vector3d::Random();
						const Eigen::Vector3d line_dir =
						random_dir.cross(normalized_point2D.homogeneous());

						feature_line = FeatureLine{line_dir, false, kInvalidPoint3DId};
					}

					// Normalizing the first two components to 1 makes the distance
					// computation during SfM simpler.
					const double head_norm = image.Line(feature_idx).Line().head<2>().norm();

					feature_line.SetLine(feature_line.Line() / head_norm);
				}
			}

			DatabaseTransaction database_transaction(database_);

			/* me:
			 * Step 4: Now we can save the image to our database.
			 */

			/* me:
			 * when the image's id is not valid, write the image to
			 * the database and then set the id to whatever the
			 * database returns
			 */
			if (image_data.image.ImageId() == kInvalidImageId) {
				image_data.image.SetImageId(database_->WriteImage(image_data.image));
			}

			/* me:
			 * If the database has no descriptors for this image,
			 * save the image's descriptors to the database
			 */
			if (!database_->ExistsDescriptors(image_data.image.ImageId())) {
				database_->WriteDescriptors(image_data.image.ImageId(),
					image_data.descriptors);
			}

			/* me:
			 * If the database doesn't have the lines for this image,
			 * then save them to the database.
			 */
			if(!database_->ExistsLineFeatures(image_data.image.ImageId())) {
				database_->WriteFeatureLines(image_data.image.ImageId(), image_data.image.Lines());
			}

			/* me:
			 * Save any gravity information to the database, if it
			 * doesn't have it already.
			 */
			if (image_data.image.HasGravity() && !database_->ExistsImageGravity(image_data.image.ImageId())) {
				database_->WriteImageGravity(image_data.image.ImageId(), image_data.image.GravityDirection());
			}

		}

		else {
			break;
		}
	}
}
