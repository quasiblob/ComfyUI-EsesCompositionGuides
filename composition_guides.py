# ==========================================================================
# Eses Composition Guides
# ==========================================================================
#
# Description:
# A non-destructive visualization tool for ComfyUI. It overlays various
# compositional guides onto a preview image without altering the output.
#
# Version: 1.0.1
# License: See LICENSE.txt
#
# ==========================================================================

import torch
import torch.nn.functional as F
import numpy as np
from PIL import Image
from server import PromptServer # type: ignore
from io import BytesIO
import base64

class EsesCompositionGuides:
    """
    A non-destructive visualization tool for ComfyUI. It overlays various
    compositional guides onto a preview image without altering the output.
    """

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return float("NaN")

    @classmethod
    def INPUT_TYPES(cls):
        """
        Defines the input types for the node with cleaned-up names and layout.
        """
        
        blend_modes = [
            "source-over", "lighter", "screen", "multiply", "overlay", "darken",
            "lighten", "color-dodge", "color-burn", "hard-light", "soft-light",
            "difference", "exclusion", "hue", "saturation", "color", "luminosity"
        ]
        
        return {
            "required": {
                "image": ("IMAGE",),

                # --- General Settings ---
                "preview_resolution_limit": ("INT", {"default": 1024, "min": 256, "max": 8192, "step": 64}),
                "grid_color_rgb": ("STRING", {"default": "255,255,255,255"}),
                "line_thickness": ("FLOAT", {"default": 1.0, "min": 0.1, "max": 32.0, "step": 0.1, "round": 0.01}),
                "blend_mode": (blend_modes,),
                
                # --- Compositional Guides ---
                "grid": ("BOOLEAN", {"default": True, "label_on": "on", "label_off": "off"}),
                "grid_lines_x": ("INT", {"default": 3, "min": 2, "max": 64, "step": 1}),
                "grid_lines_y": ("INT", {"default": 3, "min": 2, "max": 64, "step": 1}),
                "diagonals": ("BOOLEAN", {"default": False, "label_on": "on", "label_off": "off"}),
                "phi_grid": ("BOOLEAN", {"default": False, "label_on": "on", "label_off": "off"}),
                "pyramid": (["Off", "Up / Down", "Left / Right", "Both"],),
                "golden_triangles": (["Off", "Both", "Set 1 (TL-BR)", "Set 2 (TR-BL)"],),

                # --- Perspective Guide ---
                "perspective": ("BOOLEAN", {"default": False, "label_on": "on", "label_off": "off"}),
                "perspective_lines": ("INT", {"default": 8, "min": 2, "max": 32, "step": 1}),
                "perspective_x": ("FLOAT", {"default": 0.5, "min": 0.0, "max": 1.0, "step": 0.001, "round": 0.001}),
                "perspective_y": ("FLOAT", {"default": 0.5, "min": 0.0, "max": 1.0, "step": 0.001, "round": 0.001}),
            },
            "optional": {
                "mask": ("MASK",),
            },
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"},
        }

    RETURN_TYPES = ("IMAGE", "MASK")
    RETURN_NAMES = ("image", "mask")
    FUNCTION = "execute"
    CATEGORY = "Eses Nodes/Visualization"

    def execute(self, image: torch.Tensor, preview_resolution_limit, grid_color_rgb, line_thickness, blend_mode,
                grid, grid_lines_x, grid_lines_y, 
                diagonals, phi_grid, 
                pyramid, golden_triangles,
                perspective, perspective_lines, perspective_x, perspective_y,
                mask=None, prompt=None, extra_pnginfo=None):
        
        image_for_preview = image
        
        _, h, w, _ = image_for_preview.shape
        
        if max(h, w) > preview_resolution_limit:
            if w > h:
                new_w = preview_resolution_limit
                new_h = int(h * (preview_resolution_limit / w))
            else:
                new_h = preview_resolution_limit
                new_w = int(w * (preview_resolution_limit / h))
                
            image_for_preview_permuted = image_for_preview.permute(0, 3, 1, 2)
            resized_preview = F.interpolate(image_for_preview_permuted, size=(new_h, new_w), mode='bilinear', align_corners=False)
            image_for_preview = resized_preview.permute(0, 2, 3, 1)

        preview_image_tensor = image_for_preview[0]
        i = 255. * preview_image_tensor.cpu().numpy()
        img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))

        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
        node_id = None

        if prompt:
            for k, v in prompt.items():
                if v.get('class_type') == type(self).__name__:
                    node_id = k
                    break
        
        if node_id:
            PromptServer.instance.send_sync("eses.composition_guides_preview", {
                "node_id": node_id,
                "image_data": img_base64,
            })

        return (image, mask)
