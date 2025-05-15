import os
import numpy as np
from plyfile import PlyData, PlyElement 

# Paths
optimal_voxel_folder = "/Users/venu/projects/SGSS/scenes/kitchen/optimal_voxels/"
good_voxels_path = os.path.join(optimal_voxel_folder, "good_voxels.txt")
output_wo_ply_path = os.path.join(optimal_voxel_folder, "w0.ply")

# Read good voxel IDs
with open(good_voxels_path, 'r') as f:
    good_voxels = [line.strip() for line in f.readlines()]

all_vertices = []
all_properties = None

# Process each good voxel
for voxel_id in good_voxels:
    ply_path = os.path.join(optimal_voxel_folder, f"{voxel_id}.ply")
    if not os.path.exists(ply_path):
        print(f"⚠️ Warning: {ply_path} not found. Skipping...")
        continue
    
    plydata = PlyData.read(ply_path)
    vertex_data = plydata['vertex'].data

    if all_properties is None:
        all_properties = vertex_data.dtype

    all_vertices.append(vertex_data)

# Stack all vertices together
merged_vertices = np.concatenate(all_vertices)

# Write merged .ply file
el = PlyElement.describe(merged_vertices, 'vertex')
PlyData([el], text=True).write(output_wo_ply_path)

print(f"🎯 Successfully merged {len(good_voxels)} voxels into {output_wo_ply_path}")
