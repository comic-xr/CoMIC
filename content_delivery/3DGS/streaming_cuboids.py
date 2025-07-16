import json
import os
from plyfile import PlyData
import numpy as np
import argparse
from io import BytesIO


def sigmoid(x):
    return 1 / (1 + np.exp(-x))


def process_ply_to_splat(ply_file_path, sh_degree, method):
    plydata = PlyData.read(ply_file_path)
    vert = plydata["vertex"]
    buffer = BytesIO()
    if method == 'sgss':
        volume = np.exp(vert["scale_0"] + vert["scale_1"] + vert["scale_2"])
        index = int(volume.shape[0] * 0.9)
        sorted_volume = np.sort(volume)[::-1]
        kth_percent_largest = sorted_volume[index]
        v_list = np.power(volume / kth_percent_largest, 0.1)
        v_list = v_list.reshape(v_list.shape[0], 1)
        opacities = np.asarray(vert["opacity"])[..., np.newaxis]
        opacities_new = sigmoid(opacities)
        score = v_list * opacities_new
        sorted_indices = np.argsort(score[:, 0])[::-1]
    elif method == 'anti':
        sorted_indices = np.argsort(
            -np.exp(vert["scale_0"] + vert["scale_1"] + vert["scale_2"])
            / (1 + np.exp(-vert["opacity"]))
        )
    elif method == 'wo':
        sorted_indices = np.argsort(((vert["x"]) ** 2 + (vert["y"]) ** 2 + (vert["z"]) ** 2))
    elif method == 'wois':
        sorted_indices = range(np.asarray(vert["x"]).shape[0])

    for idx in sorted_indices[:]:
        v = plydata["vertex"][idx]
        position = np.array([v["x"], v["y"], v["z"]], dtype=np.float32)
        scales = np.exp(
            np.array(
                [v["scale_0"], v["scale_1"], v["scale_2"]],
                dtype=np.float32,
            )
        )
        rot = np.array(
            [v["rot_0"], v["rot_1"], v["rot_2"], v["rot_3"]],
            dtype=np.float32,
        )
        f_rest = []
        color = np.array(
            [v["f_dc_0"], v["f_dc_1"], v["f_dc_2"], 1 / (1 + np.exp(-v["opacity"]))], dtype=np.float32
        )

        if sh_degree == 0:
            buffer.write(position)
            buffer.write(scales)
            buffer.write(color)
            buffer.write((rot / np.linalg.norm(rot)))
        else:
            for ex in range(45):
                f_rest.append(v["f_rest_" + str(ex)])
            f_rest = np.array(f_rest, dtype=np.float32)
            f_rest = f_rest.reshape((3, 15))
            if sh_degree == 1:
                f_rest_sh = f_rest[..., :3].transpose().flatten()

            if sh_degree == 2:
                f_rest_sh = f_rest[..., :8].transpose().flatten()

            if sh_degree == 3:
                f_rest_sh = f_rest[..., :].transpose().flatten()
            buffer.write(position)
            buffer.write(scales)
            buffer.write(color)
            buffer.write((rot / np.linalg.norm(rot)))
            buffer.write(f_rest_sh)

    return buffer.getvalue()


def save_splat_file(splat_data, output_path):
    with open(output_path, "wb") as f:
        f.write(splat_data)


def main(ply_file_path, method, output_folder, scene_name, sh_degree = 0, mode = 'full', input_folder = None,  json_file = None):
    if not os.path.exists(output_folder):
        os.mkdir(output_folder)
    if mode == 'full':
        print('processing ' + scene_name + ' with method ' + method)
        splat_data = process_ply_to_splat(ply_file_path, sh_degree, method = method)
        output_file = os.path.join(output_folder,scene_name + '_' + method + '.ply')
        save_splat_file(splat_data, output_file)
        print(f"Saved {output_file}")
    elif mode == 'voxel':
        voxels = os.listdir(input_folder)
        for voxel_name in voxels:
            if voxel_name.endswith('.ply'):
                print(f"Processing {voxel_name}...")
                voxel_path = os.path.join(input_folder, voxel_name)
                splat_data = process_ply_to_splat(voxel_path, sh_degree, method = method)
                output_file = os.path.join(output_folder, voxel_name)
                save_splat_file(splat_data, output_file)
                print(f"Saved {output_file}")
        total_size = 0
        for sh_ply in os.listdir(output_folder):
            if sh_ply.endswith('.ply'):
                streaming_cuboid = os.path.join(output_folder, sh_ply)
                total_size += os.path.getsize(streaming_cuboid)
        f = open(json_file)
        data = json.load(f)
        data['length'] = total_size

        with open(output_folder + '/voxel_new.json', 'w') as outfile:
            json.dump(data, outfile, indent=4)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process PLY files to splats or voxels.")
    parser.add_argument("--ply_file_path", type=str, required=False, help="Path to the PLY file.")
    parser.add_argument("--method", type=str, required=True, help="Method to process the PLY file.")
    parser.add_argument("--output_folder", type=str, required=True, help="Output folder for results.")
    parser.add_argument("--scene_name", type=str, required=True, help="Scene name for the output.")
    parser.add_argument("--sh_degree", type=int, default=0, help="SH degree (default: 0).")
    parser.add_argument("--mode", type=str, choices=['full', 'voxel'], default='full',
                        help="Mode of operation: 'full' or 'voxel'.")
    parser.add_argument("--input_folder", type=str, help="Input folder for voxel mode.")
    parser.add_argument("--json_file", type=str, help="Path to the JSON file for voxel metadata.")

    args = parser.parse_args()
    main(args.ply_file_path, args.method, args.output_folder, args.scene_name, args.sh_degree, args.mode,
         args.input_folder, args.json_file)

