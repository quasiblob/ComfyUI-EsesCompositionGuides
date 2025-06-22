# Import the class from the renamed file
from .composition_guides import EsesCompositionGuides

# Update the mappings to use the new class name and display name
NODE_CLASS_MAPPINGS = {
    "EsesCompositionGuides": EsesCompositionGuides
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "EsesCompositionGuides": "Eses Composition Guides"
}

WEB_DIRECTORY = "js"

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']