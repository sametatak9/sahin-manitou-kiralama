"""EMBAY kurumsal yazı tipi: Montserrat (ince, sade). Actions'ta scripts/marvel/fonts/Montserrat-VF.ttf olarak indirilir.
Dosya yoksa None döner; çağıran eski yazı tipine düşer (üretim durmaz)."""
import functools, os
from PIL import ImageFont

PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts', 'Montserrat-VF.ttf')


@functools.lru_cache(maxsize=256)
def montserrat(size, weight=400):
    if not os.path.exists(PATH) or os.path.getsize(PATH) < 10000: return None
    f = ImageFont.truetype(PATH, int(size))
    try: f.set_variation_by_axes([weight])
    except Exception: pass
    return f
