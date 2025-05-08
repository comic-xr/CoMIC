import torch
import numpy as np
from collections import defaultdict
from typing import List, Tuple


'''
class GaussianForestNode:
    def __init__(self, index, layer):
        self.index = index  # Index in the original GaussianModel
        self.layer = layer
        self.left = None
        self.right = None
        self.parent = None
        self.semantic_label = None  # Optional for checking Same(Se)


# Define the Gaussian data structure
class Gaussian:
    def __init__(self, position, rotation, scale, color, opacity, Dyn=False, Se=-1):
        self.position = position  # 3D position
        self.rotation = rotation  # Quaternion
        self.scale = scale        # Scalar or 3D vector
        self.color = color        # RGB
        self.opacity = opacity    # Scalar
        self.Dyn = Dyn            # Dynamic property
        self.Se = Se              # Semantic property
        self.children = []        # Child Gaussians in the tree
        self.parent = None        # Parent Gaussian in the tree
        self.layer = None         # Layer index in the tree


# Function to compute the size of a Gaussian
def compute_gaussian_size(gaussian: GaussianModel) -> float:
    # Assuming scale is a 3D vector representing the axes lengths
    return np.linalg.norm(gaussian.scale)

# Function to assign Gaussians to layers based on their size
def assign_layers(gaussians: List[GaussianModel], L: int, s_L: float, f: float, d: float) -> List[List[GaussianModel]]:
    layers = [[] for _ in range(L)]
    for g in gaussians:
        size = compute_gaussian_size(g)
        for l in range(L):
            lower_bound = (2 ** (L - l + 1)) * s_L * d / f
            upper_bound = (2 ** (L - l + 2)) * s_L * d / f
            if lower_bound <= size < upper_bound:
                layers[l].append(g)
                g.layer = l
                break
    return layers

# Function to find the nearest Gaussian in the previous layer
def find_nearest_gaussian(target: Gaussian, candidates: List[Gaussian]) -> Gaussian:
    min_distance = float('inf')
    nearest = None
    for c in candidates:
        distance = np.linalg.norm(target.position - c.position)
        if distance < min_distance:
            min_distance = distance
            nearest = c
    return nearest

# Function to initialize the Gaussian forest
def initialize_gaussian_forest(GD: List[Gaussian], GS: List[Gaussian], s_L: float, L: int, f: float, d: float):
    # Assign Gaussians to layers
    layers_D = assign_layers(GD, L, s_L, f, d)
    layers_S = assign_layers(GS, L, s_L, f, d)

    # Initialize trees for dynamic and static Gaussians
    trees_D = []
    trees_S = []

    for layers, trees in [(layers_D, trees_D), (layers_S, trees_S)]:
        # Build trees from bottom-up
        for l in range(L - 1, 0, -1):
            for g in layers[l]:
                parent = find_nearest_gaussian(g, layers[l - 1])
                if parent and parent.Se == g.Se and len(parent.children) < 2:
                    parent.children.append(g)
                    g.parent = parent
                else:
                    # Create a new parent Gaussian
                    new_scale = g.scale * 2
                    new_position = g.position  # This can be adjusted as needed
                    new_gaussian = Gaussian(
                        position=new_position,
                        rotation=g.rotation,
                        scale=new_scale,
                        color=g.color,
                        opacity=g.opacity,
                        Dyn=g.Dyn,
                        Se=g.Se
                    )
                    new_gaussian.layer = l - 1
                    new_gaussian.children.append(g)
                    g.parent = new_gaussian
                    layers[l - 1].append(new_gaussian)

        # Collect root Gaussians to form trees
        for g in layers[0]:
            tree = []
            def traverse(node):
                tree.append(node)
                for child in node.children:
                    traverse(child)
            traverse(g)
            trees.append(tree)

    # Combine dynamic and static trees to form the forest
    forest = trees_D + trees_S
    return forest


'''

from typing import List
import torch
import numpy as np


class GaussianForestNode:
    def __init__(self, index, layer, Dyn, Se):
        self.index = index                    # index in GaussianModel
        self.layer = layer                    # LOD layer
        self.left = None
        self.right = None
        self.parent = None
        self.semantic_label = Se
        self.Dyn = Dyn

'''
def compute_gaussian_size(gaussians, idx: int) -> float:
    scale = gaussians.get_scaling[idx].detach().cpu().numpy()
    return np.linalg.norm(scale)  # longest axis length

def assign_layers(gaussians, indices: List[int], L: int, s_L: float, f: float, d: float):
    layers = [[] for _ in range(L)]

    for idx in indices:
        size = compute_gaussian_size(gaussians, idx)
        for l in range(L):
            lower = (2 ** (L - l + 1)) * s_L * d / f
            upper = (2 ** (L - l + 2)) * s_L * d / f
            if lower <= size < upper:
                node = GaussianForestNode(index=idx, layer=l,
                                          Dyn=bool(gaussians._is_dynamic[idx]),
                                          Se=int(gaussians._semantic_label[idx]))
                layers[l].append(node)
                break

    return layers


def find_nearest_node(target_node: GaussianForestNode, candidates: List[GaussianForestNode], gaussians) -> GaussianForestNode:
    target_pos = gaussians.get_xyz[target_node.index].detach().cpu().numpy()
    min_dist = float("inf")
    nearest = None

    for c in candidates:
        pos = gaussians.get_xyz[c.index].detach().cpu().numpy()
        dist = np.linalg.norm(target_pos - pos)
        if dist < min_dist:
            min_dist = dist
            nearest = c

    return nearest
'''
def compute_gaussian_size(scales: torch.Tensor) -> torch.Tensor:
    return torch.norm(scales, dim=1)  # [N]


def assign_layers(gaussians, indices: List[int], L: int, s_L: float, f: float, d: float):
    layers = [[] for _ in range(L)]

    indices_tensor = torch.tensor(indices, dtype=torch.long, device=gaussians.get_scaling.device)
    scales = gaussians.get_scaling[indices_tensor]  # [N, 3]
    sizes = compute_gaussian_size(scales)           # [N]
    is_dynamic = gaussians._is_dynamic[indices_tensor]
    semantic = gaussians._semantic_label[indices_tensor]

    # Precompute bounds
    bounds = [(2 ** (L - l + 1) * s_L * d / f, 2 ** (L - l + 2) * s_L * d / f) for l in range(L)]

    for i, idx in enumerate(indices):
        size = sizes[i].item()
        for l, (lower, upper) in enumerate(bounds):
            if lower <= size < upper:
                node = GaussianForestNode(index=idx, layer=l,
                                          Dyn=bool(is_dynamic[i].item()),
                                          Se=int(semantic[i].item()))
                layers[l].append(node)
                break

    return layers
    
def find_nearest_node(target_node: GaussianForestNode, candidates: List[GaussianForestNode], gaussians) -> GaussianForestNode:
    target_pos = gaussians.get_xyz[target_node.index].detach().unsqueeze(0)  # [1, 3]

    candidate_indices = torch.tensor([c.index for c in candidates], device=target_pos.device)
    candidate_pos = gaussians.get_xyz[candidate_indices].detach()  # [N, 3]

    dists = torch.norm(candidate_pos - target_pos, dim=1)  # [N]
    min_idx = torch.argmin(dists)

    return candidates[min_idx.item()]


def initialize_gaussian_forest(gaussians, s_L: float, L: int, f: float, d: float):
    print("[INFO] Initializing Gaussian Forest...", flush = True)

    # Split indices based on _is_dynamic
    all_indices = list(range(gaussians.get_xyz.shape[0]))
    dynamic_indices = [i for i in all_indices if bool(gaussians._is_dynamic[i])]
    static_indices = [i for i in all_indices if not bool(gaussians._is_dynamic[i])]

    # Assign layers
    layers_D = assign_layers(gaussians, dynamic_indices, L, s_L, f, d)
    layers_S = assign_layers(gaussians, static_indices, L, s_L, f, d)

    # Build tree from bottom up
    def build_trees(layers):
        trees = []
        for l in range(L - 1, 0, -1):
            print("LEVEL:", l, flush = True)
            for node in layers[l]:
                parent = find_nearest_node(node, layers[l - 1], gaussians)

                if parent and parent.semantic_label == node.semantic_label and (parent.left is None or parent.right is None):
                    if parent.left is None:
                        parent.left = node
                    else:
                        parent.right = node
                    node.parent = parent
                else:
                    # Create synthetic parent node
                    new_node = GaussianForestNode(index=node.index, layer=l - 1,
                                                  Dyn=node.Dyn, Se=node.semantic_label)
                    new_node.left = node
                    node.parent = new_node
                    layers[l - 1].append(new_node)

        # Collect root nodes
        for node in layers[0]:
            tree = []
            def traverse(n):
                tree.append(n)
                if n.left: traverse(n.left)
                if n.right: traverse(n.right)
            traverse(node)
            trees.append(tree)
        return trees

    trees_D = build_trees(layers_D)
    trees_S = build_trees(layers_S)

    forest = trees_D + trees_S
    print(f"[INFO] Forest initialized: {len(trees_D)} dynamic trees, {len(trees_S)} static trees.")
    return forest
