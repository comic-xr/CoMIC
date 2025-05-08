#!/bin/bash

#SBATCH --job-name=pytorch_test
#SBATCH --partition=gpuq
#SBATCH --qos=gpu
#SBATCH --gres=gpu:A100.80gb:1
#SBATCH -N 1
#SBATCH --ntasks-per-node=12

#SBATCH --mem=150GB
#SBATCH --time=0-03:00:00


#SBATCH --output=mnist.%j.out
#SBATCH --error=mnist.%j.err


## Activate the python virtual environment
source ~/pytorch-env/bin/activate

# install dependencies
pip install -r requirements.txt


## build the submodules
cd submodules/depth-diff-gaussian-rasterization
pip install --no-build-isolation .

cd ~/Deformable-3D-Gaussians

cd submodules/simple-knn
pip install --no-build-isolation .

cd ~/Deformable-3D-Gaussians

##training on d-nerf
#python train_statictree.py -s ~/data/lego -m output/exp-name-static_forest-2 --eval --is_blender --is_6dof --iterations 3000

## render and evaluate
python render.py -m output/exp-name-static_forest-2 --mode render
python metrics.py -m output/exp-name-static_forest-2 

