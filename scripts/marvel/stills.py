"""EMBAY · Fotoğraf → kısa video sahnesi (Reels motoru video kaynak bekler) + 'Bize DM atın' kapanış kartı.
- sources_finish.json'daki görseller: 1080x1920, bulanık arka plan + ortada görsel, 6 sn yavaş yakınlaşma.
  'temsili': true olanlara (yapay zekâ görseli) sağ üstte küçük 'Temsili görsel' etiketi basılır.
- public/reels/kit/15-kapanis-karti-dm.mp4: 'Siz de sahip olmak isterseniz · Bize DM atın' kartı (3,5 sn).
Kullanım: python3 scripts/marvel/stills.py --src scripts/marvel/src_drive --need 241,245,301"""
import argparse, io, json, os, subprocess, sys, urllib.request
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
W, H, FPS = 1080, 1920, 30
NAVY = (38, 42, 107)


def ffmpeg():
    try:
        import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception: return 'ffmpeg'


def font(size):
    from brandfont import montserrat
    m = montserrat(size, 400)
    if m: return m
    p = os.path.join(HERE, 'fonts', 'Oswald-VF.ttf')
    return ImageFont.truetype(p, size) if os.path.exists(p) else ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', int(size * 0.8))


def tag(img, text='Temsili görsel'):
    # küçük, sade etiket (sağ üst köşe) — görseli kapatmaz ama yanıltmaz
    d = ImageDraw.Draw(img, 'RGBA'); f = font(20); tw = d.textlength(text, font=f)
    d.rounded_rectangle([W - tw - 70, 150, W - 48, 180], radius=15, fill=(0, 0, 0, 110))
    d.text((W - tw - 59, 152), text, font=f, fill=(255, 255, 255, 230))


def write(frames_fn, n, out):
    p = subprocess.Popen([ffmpeg(), '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
    for k in range(n): p.stdin.write(frames_fn(k))
    p.stdin.close(); p.wait()


def still_clip(url, out, temsili=False, secs=6.0):
    with urllib.request.urlopen(url, timeout=60) as r: im = ImageOps.exif_transpose(Image.open(io.BytesIO(r.read()))).convert('RGB')
    bg = ImageOps.fit(im, (W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(30)); bg = ImageEnhance.Brightness(bg).enhance(0.45)
    # dikey görsel ekranı doldurur; yatay/kare görsel ortada tam görünür
    portrait = im.height / im.width >= 1.2
    n = int(secs * FPS)

    def fr(k):
        z = 1.0 + 0.08 * k / n
        if portrait:
            fw, fh = int(W * z), int(H * z)
            f = ImageOps.fit(im, (fw, fh), Image.BILINEAR).crop(((fw - W) // 2, (fh - H) // 2, (fw - W) // 2 + W, (fh - H) // 2 + H))
            img = f
        else:
            w0 = int(W * z); h0 = int(im.height * w0 / im.width)
            f = im.resize((w0, h0), Image.BILINEAR); img = bg.copy(); img.paste(f, ((W - w0) // 2, (H - h0) // 2))
        if temsili: img = img.copy(); tag(img)
        return np.asarray(img, dtype=np.uint8).tobytes()
    write(fr, n, out)


def dm_card(out, secs=3.5):
    sys.path.insert(0, os.path.join(ROOT, 'scripts', 'carousel')); import build as cb
    cb.REEL = True
    slide = cb.slide_cta('sahip', 1, 1).convert('RGB')
    bg = Image.new('RGB', (W, H), NAVY); d = ImageDraw.Draw(bg)
    for y in range(H):
        t = y / H; d.line([(0, y), (W, y)], fill=tuple(int(NAVY[k] + ((30, 63, 160)[k] - NAVY[k]) * t * 0.6) for k in range(3)))
    n = int(secs * FPS)

    def fr(k):
        z = 1.0 + 0.03 * k / n; sw, sh = int(W * z), int(1350 * z)
        img = bg.copy(); img.paste(slide.resize((sw, sh), Image.BILINEAR), ((W - sw) // 2, (H - sh) // 2))
        return np.asarray(img, dtype=np.uint8).tobytes()
    write(fr, n, out)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--src', required=True); ap.add_argument('--need', default='')
    a = ap.parse_args(); os.makedirs(a.src, exist_ok=True)
    need = {int(x) for x in a.need.split(',') if x}
    for it in json.load(open(os.path.join(HERE, 'sources_finish.json'))):
        if not it.get('image') or (need and it['n'] not in need): continue
        p = os.path.join(a.src, f"{it['n']}.mp4")
        if not os.path.exists(p): still_clip(it['url'], p, it.get('temsili', False)); print('✓ görsel sahne', it['n'], it.get('title'))
    card = os.path.join(ROOT, 'public', 'reels', 'kit', '15-kapanis-karti-dm.mp4')
    if not os.path.exists(card): dm_card(card); print('✓ kapanış kartı', card)


if __name__ == '__main__':
    main()
