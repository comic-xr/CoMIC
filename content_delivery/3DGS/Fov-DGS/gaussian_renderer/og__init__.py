#
# Copyright (C) 2023, Inria
# GRAPHDECO research group, https://team.inria.fr/graphdeco
# All rights reserved.
#
# This software is free for non-commercial, research and evaluation use
# under the terms of the LICENSE.md file.
#
# For inquiries contact  george.drettakis@inria.fr
#

import torch
import math
from diff_gaussian_rasterization import GaussianRasterizationSettings, GaussianRasterizer
from scene.gaussian_model import GaussianModel
from utils.sh_utils import eval_sh
from utils.rigid_utils import from_homogenous, to_homogenous
from torchvision.transforms.functional import gaussian_blur


def quaternion_multiply(q1, q2):
    w1, x1, y1, z1 = q1[..., 0], q1[..., 1], q1[..., 2], q1[..., 3]
    w2, x2, y2, z2 = q2[..., 0], q2[..., 1], q2[..., 2], q2[..., 3]

    w = w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2
    x = w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2
    y = w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2
    z = w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2

    return torch.stack((w, x, y, z), dim=-1)


def render(viewpoint_camera, pc: GaussianModel, pipe, bg_color: torch.Tensor, d_xyz, d_rotation, d_scaling, is_6dof=False,
           scaling_modifier=1.0, override_color=None):
    """
    Render the scene.

    Background tensor (bg_color) must be on GPU!
    """

    # Create zero tensor. We will use it to make pytorch return gradients of the 2D (screen-space) means
    screenspace_points = torch.zeros_like(pc.get_xyz, dtype=pc.get_xyz.dtype, requires_grad=True, device="cuda") + 0
    screenspace_points_densify = torch.zeros_like(pc.get_xyz, dtype=pc.get_xyz.dtype, requires_grad=True, device="cuda") + 0
    try:
        screenspace_points.retain_grad()
        screenspace_points_densify.retain_grad()
    except:
        pass

    # Set up rasterization configuration
    tanfovx = math.tan(viewpoint_camera.FoVx * 0.5)
    tanfovy = math.tan(viewpoint_camera.FoVy * 0.5)

    raster_settings = GaussianRasterizationSettings(
        image_height=int(viewpoint_camera.image_height),
        image_width=int(viewpoint_camera.image_width),
        tanfovx=tanfovx,
        tanfovy=tanfovy,
        bg=bg_color,
        scale_modifier=scaling_modifier,
        viewmatrix=viewpoint_camera.world_view_transform,
        projmatrix=viewpoint_camera.full_proj_transform,
        sh_degree=pc.active_sh_degree,
        campos=viewpoint_camera.camera_center,
        prefiltered=False,
        debug=pipe.debug,
    )

    rasterizer = GaussianRasterizer(raster_settings=raster_settings)

    if is_6dof:
        if torch.is_tensor(d_xyz) is False:
            means3D = pc.get_xyz
        else:
            means3D = from_homogenous(
                torch.bmm(d_xyz, to_homogenous(pc.get_xyz).unsqueeze(-1)).squeeze(-1))
    else:
        means3D = pc.get_xyz + d_xyz
    opacity = pc.get_opacity

    # If precomputed 3d covariance is provided, use it. If not, then it will be computed from
    # scaling / rotation by the rasterizer.
    scales = None
    rotations = None
    cov3D_precomp = None
    if pipe.compute_cov3D_python:
        cov3D_precomp = pc.get_covariance(scaling_modifier)
    else:
        scales = pc.get_scaling + d_scaling
        rotations = pc.get_rotation + d_rotation

    # If precomputed colors are provided, use them. Otherwise, if it is desired to precompute colors
    # from SHs in Python, do it. If not, then SH -> RGB conversion will be done by rasterizer.
    shs = None
    colors_precomp = None
    if colors_precomp is None:
        if pipe.convert_SHs_python:
            shs_view = pc.get_features.transpose(1, 2).view(-1, 3, (pc.max_sh_degree + 1) ** 2)
            dir_pp = (pc.get_xyz - viewpoint_camera.camera_center.repeat(pc.get_features.shape[0], 1))
            dir_pp_normalized = dir_pp / dir_pp.norm(dim=1, keepdim=True)
            sh2rgb = eval_sh(pc.active_sh_degree, shs_view, dir_pp_normalized)
            colors_precomp = torch.clamp_min(sh2rgb + 0.5, 0.0)
        else:
            shs = pc.get_features
    else:
        colors_precomp = override_color

    # Rasterize visible Gaussians to image, obtain their radii (on screen).
    rendered_image, radii, depth = rasterizer(
        means3D=means3D,
        means2D=screenspace_points,
        means2D_densify=screenspace_points_densify,
        shs=shs,
        colors_precomp=colors_precomp,
        opacities=opacity,
        scales=scales,
        rotations=rotations,
        cov3D_precomp=cov3D_precomp)

    # Those Gaussians that were frustum culled or had a radius of 0 were not visible.
    # They will be excluded from value updates used in the splitting criteria.
    return {"render": rendered_image,
            "viewspace_points": screenspace_points,
            "viewspace_points_densify": screenspace_points_densify,
            "visibility_filter": radii > 0,
            "radii": radii,
            "depth": depth}


def collect_gaussians_by_lod(forest_roots, target_layer):
    """
    Recursively collects Gaussian indices from the specified LOD layer.
    """
    selected_indices = []

    def dfs(node):
        if node.layer == target_layer:
            selected_indices.append(node.index)
        elif node.layer < target_layer:
            if node.left: dfs(node.left)
            if node.right: dfs(node.right)

    for root in forest_roots:
        dfs(root)

    return torch.tensor(selected_indices, dtype=torch.long, device="cuda")


def render_lod(viewpoint_camera, pc: GaussianModel, pipe, bg_color: torch.Tensor, d_xyz, d_rotation, d_scaling,
               is_6dof=False, scaling_modifier=1.0, override_color=None, lod_level=None):

    if lod_level is not None and hasattr(pc, 'gaussian_forest') and pc.gaussian_forest is not None:
        selected_indices = collect_gaussians_by_lod(pc.gaussian_forest, lod_level)
    else:
        selected_indices = torch.arange(pc.get_xyz.shape[0], device="cuda")

    xyz_all = pc.get_xyz[selected_indices] + d_xyz[selected_indices] if torch.is_tensor(d_xyz) else pc.get_xyz[selected_indices]
    opacity = pc.get_opacity[selected_indices]

    screenspace_points = torch.zeros_like(xyz_all, dtype=xyz_all.dtype, requires_grad=True, device="cuda")
    screenspace_points_densify = torch.zeros_like(xyz_all, dtype=xyz_all.dtype, requires_grad=True, device="cuda")

    tanfovx = math.tan(viewpoint_camera.FoVx * 0.5)
    tanfovy = math.tan(viewpoint_camera.FoVy * 0.5)

    raster_settings = GaussianRasterizationSettings(
        image_height=int(viewpoint_camera.image_height),
        image_width=int(viewpoint_camera.image_width),
        tanfovx=tanfovx,
        tanfovy=tanfovy,
        bg=bg_color,
        scale_modifier=scaling_modifier,
        viewmatrix=viewpoint_camera.world_view_transform,
        projmatrix=viewpoint_camera.full_proj_transform,
        sh_degree=pc.active_sh_degree,
        campos=viewpoint_camera.camera_center,
        prefiltered=False,
        debug=pipe.debug,
    )

    rasterizer = GaussianRasterizer(raster_settings=raster_settings)

    if pipe.compute_cov3D_python:
        cov3D_precomp = pc.get_covariance(scaling_modifier)[selected_indices]
        scales = None
        rotations = None
    else:
        cov3D_precomp = None
        scales = (pc.get_scaling + d_scaling)[selected_indices]
        rotations = (pc.get_rotation + d_rotation)[selected_indices]

    if pipe.convert_SHs_python:
        shs_view = pc.get_features[selected_indices].transpose(1, 2).view(-1, 3, (pc.max_sh_degree + 1) ** 2)
        dir_pp = (pc.get_xyz[selected_indices] - viewpoint_camera.camera_center.repeat(shs_view.shape[0], 1))
        dir_pp_normalized = dir_pp / dir_pp.norm(dim=1, keepdim=True)
        sh2rgb = eval_sh(pc.active_sh_degree, shs_view, dir_pp_normalized)
        colors_precomp = torch.clamp_min(sh2rgb + 0.5, 0.0)
        shs = None
    else:
        colors_precomp = override_color
        shs = pc.get_features[selected_indices]

    rendered_image, radii, depth = rasterizer(
        means3D=xyz_all,
        means2D=screenspace_points,
        means2D_densify=screenspace_points_densify,
        shs=shs,
        colors_precomp=colors_precomp,
        opacities=opacity,
        scales=scales,
        rotations=rotations,
        cov3D_precomp=cov3D_precomp)

    return {
        "render": rendered_image,
        "viewspace_points": screenspace_points,
        "viewspace_points_densify": screenspace_points_densify,
        "visibility_filter": radii > 0,
        "radii": radii,
        "depth": depth
    }


import torch
import math
from gaussian_renderer import render

def compute_eccentricity(gaze_point, gaussian_center, image_size):
    P = gaze_point / image_size.to(device=gaze_point.device)
    mu = gaussian_center / image_size.to(device=gaussian_center.device)
    return torch.norm(P - mu, dim=-1)


def compute_acuity(w0, m, e):
    return w0 + m * e

def compute_layer(L, acuity, w0, m, e0):
    if not torch.is_tensor(acuity):
        acuity = torch.tensor(acuity, dtype=torch.float32)
    denominator = w0 + m * e0
    denominator = torch.tensor(denominator, dtype=torch.float32)
    lod = torch.ceil(torch.tensor(L, dtype=torch.float32) - torch.log2(acuity / denominator))
    return lod.clamp(0, L - 1).long()


def compute_f_from_csf(acuity, sal, k):
    return acuity / (1 + k * sal)

'''def render_foveated(viewpoint_camera, pc, forest, pipe, bg_color, d_xyz, d_rotation, d_scaling,
                    gaze_point, is_6dof=False, scaling_modifier=1.0, override_color=None,
                    L=4, w0=1/48, m=1.32, e0=0.1, k=0.4, saliency_map=None):

    device = pc.get_xyz.device
    image_size = torch.tensor([viewpoint_camera.image_width, viewpoint_camera.image_height], device=device)
    rendered = torch.zeros((3, viewpoint_camera.image_height, viewpoint_camera.image_width), device=device)

    assert forest is not None, "Gaussian forest must be initialized before foveated rendering."

    # Separate dynamic and static forests
    dynamic_forest = [tree for tree in forest if any(n.Dyn for n in tree)]
    static_forest = [tree for tree in forest if all(not n.Dyn for n in tree)]

    # ---  Forest Pass ---
    for tree in dynamic_forest:
        if not tree:
            continue

        nodes = torch.tensor([n.index for n in tree], device=device)
        projected_2d = pc.get_projected_2d(viewpoint_camera.world_view_transform,
                                        viewpoint_camera.full_proj_transform,
                                        viewpoint_camera.image_width,
                                        viewpoint_camera.image_height)[nodes]

        mu = projected_2d.mean(dim=0)  # Mean projected position for tree
        e = compute_eccentricity(gaze_point, mu.unsqueeze(0), image_size).item()
        acuity = compute_acuity(w0, m, e)
        l1 = compute_layer(L, acuity, w0, m, e0).item()
        l1 = int(torch.clamp(l1, 0, L - 1))

        # Phase 1: Deform Gaussians at selected dynamic layer
        indices_l1 = [n.index for n in tree if n.layer == l1 and n.Dyn]
        if indices_l1:
            indices_l1_tensor = torch.tensor(indices_l1, device=device)
            d_xyz_sel = d_xyz[indices_l1_tensor]
            d_rot_sel = d_rotation[indices_l1_tensor]
            d_scale_sel = d_scaling[indices_l1_tensor]
        else:
            d_xyz_sel = d_rot_sel = d_scale_sel = None

        # Phase 2 skipped for speed

        # CSF-based filtering
        if saliency_map is not None:
            mu_pix = mu.long()
            sal = saliency_map[mu_pix[1], mu_pix[0]].item()
            f = compute_f_from_csf(acuity, sal, k)
            # filtering not implemented here

        layers_to_render = [l1] if l1 == L - 1 else [l1, l1 + 1]

        for l in layers_to_render:
            indices = [n.index for n in tree if n.layer == l]
            if not indices:
                continue

            indices_tensor = torch.tensor(indices, device=device)
            pc_l = pc.get_filtered_copy(indices_tensor)
            dx = d_xyz[indices_tensor] if d_xyz is not None else 0
            dr = d_rotation[indices_tensor] if d_rotation is not None else 0
            ds = d_scaling[indices_tensor] if d_scaling is not None else 0

            results = render(viewpoint_camera, pc_l, pipe, bg_color, dx, dr, ds, is_6dof, scaling_modifier)
            rendered += results["render"]

    # --- Static Forest Pass ---
    for tree in static_forest:
        if not tree:
            continue

        nodes = torch.tensor([n.index for n in tree], device=device)
        projected_2d = pc.get_projected_2d(viewpoint_camera.world_view_transform,
                                        viewpoint_camera.full_proj_transform,
                                        viewpoint_camera.image_width,
                                        viewpoint_camera.image_height)[nodes]

        mu = projected_2d.mean(dim=0)
        e = compute_eccentricity(gaze_point, mu.unsqueeze(0), image_size).item()
        acuity = compute_acuity(w0, m, e)
        l1 = compute_layer(L, acuity, w0, m, e0).item()
        l1 = int(torch.clamp(l1, 0, L - 1))

        if saliency_map is not None:
            mu_pix = mu.long()
            sal = saliency_map[mu_pix[1], mu_pix[0]].item()
            f = compute_f_from_csf(acuity, sal, k)
            # filtering not implemented

        layers_to_render = [l1] if l1 == L - 1 else [l1, l1 + 1]

        for l in layers_to_render:
            indices = [n.index for n in tree if n.layer == l]
            if not indices:
                continue

            indices_tensor = torch.tensor(indices, device=device)
            pc_l = pc.get_filtered_copy(indices_tensor)

            results = render(viewpoint_camera, pc_l, pipe, bg_color, 0, 0, 0, is_6dof, scaling_modifier)
            rendered += results["render"]

    return {
        "render": rendered
    }

'''

import torch
import torch.nn.functional as F
import matplotlib.pyplot as plt

def create_gaussian_filter(cov_matrix, f, image_size, scale=1.0):
    """
    Generate a 2D Gaussian filter kernel from a 2D covariance matrix Σ' and perceptual frequency f.

    Args:
        cov_matrix (Tensor): (2, 2) covariance matrix Σ'
        f (float): Maximum spatial frequency from CSF model
        image_size (tuple): Output filter size (height, width)
        scale (float): Scaling factor for filter strength

    Returns:
        Tensor: (H, W) 2D filter kernel
    """
    H, W = image_size
    y, x = torch.meshgrid(
        torch.linspace(-1, 1, steps=H),
        torch.linspace(-1, 1, steps=W),
        indexing="ij"
    )
    grid = torch.stack([x, y], dim=-1)  # (H, W, 2)

    # μ = [0, 0] since we're centering the kernel
    mu = torch.tensor([0.0, 0.0])
    diff = grid - mu  # (H, W, 2)

    # Inverse covariance matrix: (Σ' + (1/f) I)^-1
    identity = torch.eye(2)
    cov_f = cov_matrix + (1 / f) * identity
    cov_inv = torch.inverse(cov_f)

    # Mahalanobis distance: (x - µ)^T Σ⁻¹ (x - µ)
    diff_flat = diff.view(-1, 2)  # (H*W, 2)
    mdist = torch.einsum("bi,ij,bj->b", diff_flat, cov_inv, diff_flat)  # (H*W,)
    gaussian = torch.exp(-0.5 * mdist).view(H, W)

    # Normalize kernel
    gaussian /= gaussian.sum()

    return gaussian




def render_foveated(viewpoint_camera, pc, forest, pipe, bg_color, d_xyz, d_rotation, d_scaling, gaze_point, is_6dof=False, scaling_modifier=1.0, override_color=None, L=4, w0=1/48, m=1.32, e0=0.1, k=0.4, saliency_map=None):
    print("RENDER FOVEATED", flush = True)
    device = pc.get_xyz.device
    H, W = viewpoint_camera.image_height, viewpoint_camera.image_width
    image_size = torch.tensor([W, H], device=device)

    rendered = None
    all_radii = torch.zeros((pc.get_xyz.shape[0]), device=device)
    all_visibility = torch.zeros((pc.get_xyz.shape[0]), dtype=torch.bool, device=device)
    screenspace_points_all = torch.zeros_like(pc.get_xyz, dtype=pc.get_xyz.dtype, device=device)
    screenspace_points_densify_all = torch.zeros_like(pc.get_xyz, dtype=pc.get_xyz.dtype, device=device)
    depth_map = torch.zeros((H, W), device=device)

    # Split forest
    dynamic_forest = [tree for tree in forest if any(n.Dyn for n in tree)]
    static_forest = [tree for tree in forest if all(not n.Dyn for n in tree)]

    for tree in dynamic_forest + static_forest:
        if not tree:
            continue

        is_dynamic = any(n.Dyn for n in tree)
        nodes = torch.tensor([n.index for n in tree], device=device)
        projected_2d = pc.get_projected_2d(
            viewpoint_camera.world_view_transform,
            viewpoint_camera.full_proj_transform,
            viewpoint_camera.image_width,
            viewpoint_camera.image_height)[nodes]

        mu = projected_2d.mean(dim=0)
        e = compute_eccentricity(gaze_point, mu.unsqueeze(0), image_size).item()
        acuity = compute_acuity(w0, m, e)
        l1 = compute_layer(L, acuity, w0, m, e0).item()
        l1 = torch.clamp(torch.tensor(l1, dtype=torch.float32), 0, L - 1).long().item()


        if saliency_map is not None:
            mu_pix = mu.long()
            sal = saliency_map[mu_pix[1], mu_pix[0]].item()
            f = compute_f_from_csf(acuity, sal, k)

        layers_to_render = [l1] if l1 == L - 1 else [l1, l1 + 1]

        for l in layers_to_render:
            indices = [n.index for n in tree if n.layer == l]
            if not indices:
                continue

            indices_tensor = torch.tensor(indices, device=device)
            pc_l = pc.get_filtered_copy(indices_tensor)

            if is_dynamic:
                dx = d_xyz[indices_tensor] if d_xyz is not None else 0
                dr = d_rotation[indices_tensor] if d_rotation is not None else 0
                ds = d_scaling[indices_tensor] if d_scaling is not None else 0
            else:
                dx = dr = ds = 0

            results = render(viewpoint_camera, pc_l, pipe, bg_color, dx, dr, ds, is_6dof, scaling_modifier)

            #if saliency_map is not None and l == l1 + 1: 
            #    blur_radius = max(1, int(1 / (f + 1e-6)))  # tune this heuristic
            #    results["render"] = gaussian_blur(results["render"], kernel_size=blur_radius)

            # Only apply filter if this is layer l+1 and CSF is available
            if saliency_map is not None and l == l1 + 1:
                cov2d = pc.get_covariance()[indices_tensor]  # Σ' for each Gaussian
                filtered_features = []
                for i, idx in enumerate(indices_tensor):
                    sigma_2d = cov2d[i][:2, :2]  # project to 2D
                    f_val = compute_f_from_csf(acuity, sal, k)
                    kernel = create_gaussian_filter(sigma_2d, f_val, (9, 9))  # 9x9 filter
                    # Apply this kernel on SH coefficients or precomputed features
                    # (NOTE: actual filtering logic depends on how features are used — placeholder here)
                    filtered_features.append(kernel.sum())  # Placeholder

                # For now, just a placeholder log
                print(f"[CSF FILTER] Applied low-pass filter with f={f_val:.2f} on L+1")


            if rendered is None:
                rendered = results["render"]
            else:
                rendered = rendered + results["render"]

            # Merge intermediate results (pad by global index)
            global_idx = indices_tensor
            all_radii[global_idx] = results["radii"]
            all_visibility[global_idx] = results["visibility_filter"]
            screenspace_points_all[global_idx] = results["viewspace_points"]
            screenspace_points_densify_all[global_idx] = results["viewspace_points_densify"]

            depth_map = torch.maximum(depth_map, results["depth"])
        
       
    print("RENDERING DONE", flush = True)
    return {
        "render": rendered,
        "viewspace_points": screenspace_points_all,
        "viewspace_points_densify": screenspace_points_densify_all,
        "visibility_filter": all_visibility,
        "radii": all_radii,
        "depth": depth_map
    }
