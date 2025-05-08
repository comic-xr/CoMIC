import cv2
from skimage.color import rgb2gray
import numpy as np
import torch


def run_dynamic_static_separation(scene, render_func, pipe, background):
    print("[INFO] Running dynamic-static separation (fovea-based)...")

    for cam in sorted(scene.getTrainCameras(), key=lambda c: c.fid.item()):
        cam.load2device("cuda")

        gt_image = cam.original_image.detach().cpu().numpy().transpose(1, 2, 0)

        H, W, _ = gt_image.shape
        update_dynamic_flags(H, W, scene.gaussians)

        cam.load2device("cpu")


def update_dynamic_flags(H, W, gaussians):
    cx, cy = W // 2, H // 2
    max_r = 0.3 * min(H, W) / 2.0

    xyz = gaussians.get_xyz.detach().cpu()  # [N, 3]

    x_2d = ((xyz[:, 0] + 1) / 2 * W).long()
    y_2d = ((xyz[:, 1] + 1) / 2 * H).long()

    dist = torch.sqrt((x_2d - cx) ** 2 + (y_2d - cy) ** 2)
    in_fovea = dist < max_r

    in_fovea = in_fovea.to("cuda")
    gaussians._is_dynamic = in_fovea

    gaussians._semantic_label = torch.where(
        in_fovea,
        torch.ones(in_fovea.shape, dtype=torch.long, device="cuda"),
        -torch.ones(in_fovea.shape, dtype=torch.long, device="cuda")
    )

    







'''
def run_dynamic_static_separation_og(scene, render_func, pipe, background, e_ds=0.5, e_con=0.5):
    print("[INFO] Running dynamic-static separation...")

   # iterating through all the training views in chronological order to update Dyn and Se properties.
    for cam in sorted(scene.getTrainCameras(), key=lambda c: c.fid.item()):
        cam.load2device("cuda")
        render_output = render_func(cam, scene.gaussians, pipe, background, 0.0, 0.0, 0.0)
        pred_image = render_output["render"].detach().cpu().numpy().transpose(1, 2, 0)
        gt_image = cam.original_image.detach().cpu().numpy().transpose(1, 2, 0)
        sem_seg = grid_segmentation_map(gt_image) 
      
        update_dynamic_flags(pred_image, gt_image, sem_seg, scene.gaussians, render_output, e_ds, e_con)
        cam.load2device("cpu")

def update_dynamic_flags_og(I_pred, I_gt, segmentation_map, gaussians, render_output, e_ds, e_con):

    flow = cv2.calcOpticalFlowFarneback(
        rgb2gray(I_gt), rgb2gray(I_pred),
        None, 0.5, 3, 15, 3, 5, 1.2, 0
    )
    flow_mag = np.linalg.norm(flow, axis=-1)
    H, W = flow_mag.shape

    segments = np.unique(segmentation_map)
    for sid in segments:
        mask = segmentation_map == sid
        if mask.sum() < 10:
            continue

        flow_ratio = flow_mag[mask].sum() / mask.sum()

        print("MASK:", flow_ratio)

        if flow_ratio <= e_ds:
            continue  

        print("E_DS > 0.5", flow_ratio)
        for y in range(H):
            for x in range(W):
                if not mask[y, x]:
                    continue

                p = np.array([x, y], dtype=np.float32)

                gaussian_ids = render_output["gaussian_indices"][y, x] 
                valid_ids = gaussian_ids[gaussian_ids >= 0]
                if len(valid_ids) == 0:
                    continue

                mus = render_output["means2D"][valid_ids.cpu().numpy()]
                sigmas = render_output["alpha_per_pixel"][y, x, :len(valid_ids)].cpu().numpy()
                Sigmas_prime = render_output["cov2D"][valid_ids.cpu().numpy()]

                contributions = compute_contributions(p, mus, sigmas, Sigmas_prime)

                for i, con in enumerate(contributions):
                    if con > e_con:
                        print("E_CON > 0.5", con)
                        gauss_id = valid_ids[i]
                        gaussians._is_dynamic[gauss_id] = True
                        gaussians._semantic_label[gauss_id] = sid



def compute_alpha(p, mu_m, sigma_m, Sigma_m_prime):
    exponent = -0.5 * np.matmul(np.matmul((p - mu_m).T, Sigma_m_prime), (p - mu_m))
    return sigma_m * np.exp(exponent)

def compute_contributions(p, mus, sigmas, Sigmas_prime):
    M = len(sigmas)

    #get the alphas from range 1-m
    alphas = np.array([
        compute_alpha(p, mus[m], sigmas[m], Sigmas_prime[m])
        for m in range(M)
    ])


    one_minus_alpha_prod = np.ones(M) #this stores the product till n (needed for the denominator part)
    accum = 1.0
    
    #the actual product for the numberator
    for m in range(M):
        accum *= (1.0 - alphas[m])
        one_minus_alpha_prod[m] = accum

    # Shift one step to the right (prod up to n=m-1)
    shifted_prod = np.roll(one_minus_alpha_prod, 1)
    shifted_prod[0] = 1.0  # First element has no previous alpha to multiply

    #am is just the max one, so you have it to multiple with the accumulated sums
    unnormalized_con = alphas * shifted_prod
    con = unnormalized_con / (np.sum(unnormalized_con) + 1e-8)

    
    return con
'''


