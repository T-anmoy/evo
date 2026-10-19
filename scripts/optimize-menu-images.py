"""Create web-sized copies of the source photographs without cropping."""
from pathlib import Path
from PIL import Image
for source in Path('public/images/menu/live').glob('*.png'):
    with Image.open(source) as image:
        image.thumbnail((800, 800), Image.Resampling.LANCZOS)
        image.save(source.with_suffix('.webp'), 'WEBP', quality=85, method=6)
