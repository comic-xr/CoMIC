Rendering and Streaming 3D Gaussian Splatting for Apple Vision Pro

This project implements the SGSS pipeline for volumetric content streaming using 3D Gaussian Splatting (3DGS). The pipeline optimizes volumetric data for efficient streaming and real-time rendering in 6-DoF navigation scenarios. The following describes the step-by-step procedure carried out on each of the five datasets (e.g., Bonsai, Bicycle, Kitchen, Train, Garden).

Setup:
1. Used 3D Gaussian Splatting for Real-Time Radiance Field Rendering for environment requirements.
2. Use of [H2O](https://h2o.examp1e.net/install.html) as server so we need to set it up. 
3. Setting up gurobi with academic license.

Step by Step explaination:
1. Voxelization of 3D Point Cloud:
    For each dataset, we began by voxelizing the dense 3D point cloud using a Python script that maps Gaussians to 3D voxels.
        Input: A .ply file generated from 3DGS training (typically iteration_30000/point_cloud.ply).
        Output: voxel_new.json – the voxelized structure of the scene.
    This step discretizes the continuous 3D space into structured voxel units to allow later optimization.

    Command: python pre_processing/voxel_gaussian.py --ply_file_path scenes/scene_name/point_cloud/point_cloud.ply --scene_name scene_name --output_folder scenes/scene_name

2. Matrix Construction for Optimization:
    Next, we computed a sparse binary matrix (Matrix A) that encodes the visibility relationship between voxels and camera viewpoints.
        Input: The same .ply file as above.
        Output: matrix_A.npy – a matrix that maps visibility of voxels across views.
    This matrix is fundamental for solving the ILP (Integer Linear Program) that follows.

    Command: python pre_processing/build_matrix_A.py --ply_file_path scenes/scene_name/point_cloud/point_cloud.ply --output_folder scenes/scene_name --scene_name scene_name

3. Projection Model and Cost Calculation:
    We used a projection model to compute the cost of including each voxel in the final representation.
        Inputs:
            voxel_new.json from voxelization
            Camera parameters (cameras.json)
            Visibility matrix (matrix_A.npy)
        Outputs: 
        C_cost.npy – cost matrix
        Updated projection results
    The cost function encodes perceptual and spatial priorities, helping to reduce redundancy during optimization.

    Command: 
    python pre_processing/projection_model.py \               
        --ply_file_path /Users/venu/projects/SGSS/scenes/scene_name/point_cloud/iteration_30000/point_cloud.ply \
        --cameras_path /Users/venu/projects/SGSS/scenes/scene_name/cameras.json \
        --matrix_a_path /Users/venu/projects/SGSS/scenes/scene_name/matrix_A.npy \
        --c_store_path /Users/venu/projects/SGSS/scenes/scene_name/C_cost.npy \
        --voxel_path /Users/venu/projects/SGSS/scenes/scene_name/voxel_new.json \
        --output_folder /Users/venu/projects/SGSS/scenes/scene_name \
        --scene_name scene_name

4. Compute Directory Divisor:
    We calculated how many voxels were marked important (with value 1 in C_store_0and1.npy) and used this as the divisor input for the Gurobi optimization.
    This divisor helps normalize the ILP constraints.

5. Run Gurobi Optimization:
    We solved an ILP using Gurobi to identify the optimal subset of voxels for streaming under bandwidth constraints.
        Function called: process_directory(scene_path, directory_divisor)
        Output: x_solution.npy – binary vector of selected voxels.
    This solution minimizes redundancy while maximizing visibility coverage.

    Commands:
    Enter into Python3 
        import numpy as np 
        c = np.load("/Users/username/path/scene_name/C_store_0and1.npy")
        directory_divisor = np.count_nonzero(c == 1)
        print("directory_divisor:", directory_divisor)

    Change in run gurobi file also the divisor number 
    from pre_processing.run_gurobi_flow import process_directory
    process_directory('scenes/scene_name',directory_divisor_number)

6. Optimal Voxel Selection and Export:
    Using the solution vector and previous matrices, we generated an optimized voxel representation.
        Output: A directory of files under optimal_voxels/ containing: Selected voxel metadata, Updated PLY representation
    Final voxel_ilp.json used for streaming.

    Command:
    python /Users/venu/projects/SGSS/pre_processing/optimal_voxelization.py \
        --matrix_a_path /Users/venu/projects/SGSS/scenes/scene_name/matrix_A.npy \
        --c_cost_path /Users/venu/projects/SGSS/scenes/scene_name/C_cost.npy \
        --ply_file_path /Users/venu/projects/SGSS/scenes/scene_name/point_cloud/point_cloud.ply \
        --x_solution_path /Users/venu/projects/SGSS/scenes/scene_name/x_solution.npy \
        --output_folder /Users/venu/projects/SGSS/scenes/scene_name/optimal_voxels/ \        
        --scene_name scene_name

7. Prepare for Streaming
    We converted the optimized voxel structure into a chunked format suitable for streaming.
        Inputs:
            voxel_ilp.json
            Mode: voxel
            Method: sgss,anti,wo
        Output: A directory of streaming-ready voxel chunks (under streaming/)
    These chunks are later prioritized and served using the H2O web server.

    Command:
    python pre_processing/streaming_cuboids.py \
        --method sgss \                                                                                         
        --output_folder /Users/venu/projects/SGSS/scenes/scene_name/streaming/ \
        --mode voxel \
        --input_folder /Users/venu/projects/SGSS/scenes/scene_name/optimal_voxels/ \
        --json_file /Users/venu/projects/SGSS/scenes/scene_name/optimal_voxels/voxel_ilp.json \
        --scene_name scene_name

8. Camera Trace Generation:
    We generated full and limited camera motion traces for testing 6-DoF navigation.
    Inputs:
        cameras.json (original viewpoint data)
    Outputs:
        smooth.json (smooth trace)
        limit.json (limited motion trace)
    These traces simulate realistic user movement paths for evaluation.

    Command:
    python /Users/venu/projects/SGSS/experiment/cam_trace.py --scene_name bonsai --input_camera_path /Users/venu/projects/SGSS/scenes/bonsai/cameras.json --output_folder /Users/venu/projects/SGSS/scenes/bonsai/ --mode full

    python /Users/venu/projects/SGSS/experiment/cam_trace.py --scene_name bonsai --input_camera_path /Users/venu/projects/SGSS/scenes/bonsai/cameras.json --output_folder /Users/venu/projects/SGSS/scenes/bonsai/ --mode limit

9. File Organization and Server Setup
    We organized and moved key files into the H2O server root directory:
    Moved:
        smooth.json and limit.json → for navigation replay
        voxel_ilp/ and voxel_new/ → containing all voxel metadata and PLYs
    These files are critical for both streaming logic and rendering pipelines.

10. Web Server Deployment (H2O)
    We launched the H2O HTTP/2 server configured with a specific .conf file.
        Configuration: Points to appropriate folders and MIME types for .ply, .json, etc.
        Output: Real-time access to voxel chunks and traces through a browser-based WebGL viewer.
    command: /usr/local/bin/h2o -c /Users/venu/projects/SGSS/h2o/examples/h2o/h2o.conf (Change directories according to your system path)
