"""EMBAY · 'Teslim Ettiğimiz Villa Projemiz' Reels — açık mavi gökyüzü tonlu kapak + gerçek proje fotoğrafları + DM kapanışı.
Popüler Türkçe pop şarkılarla (ör. Instagram'da 'Hepsi Aşktan') paylaşılmak üzere sakin tempoda kurgulanır:
telifli şarkılar videoya gömülemez → ana çıktı MÜZİKSİZ (şarkı Instagram uygulamasından eklenir);
ayrıca kendi telifsiz müziğimizle bir önizleme kopyası üretilir.
Kaynak: scripts/media-sheets/list.json (Drive'daki gerçek proje fotoğrafları). Logo: public/reels/kit/embay_logo_beyaz.png
Çıktı: public/reels/teslim/<slug>-sessiz.mp4, <slug>.mp4 (önizleme müziği), <slug>.jpg (kapak)
Kullanım: python3 scripts/reels/teslim_reel.py"""
import io, json, os, subprocess, urllib.request
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageEnhance

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'public', 'reels', 'teslim')
FONTS = os.path.join(ROOT, 'scripts', 'marvel', 'fonts')
W, H, FPS = 1080, 1920, 30
SKY_TOP, SKY_BOT = (22, 66, 158), (120, 178, 232)
NAVY, WHITE = (24, 42, 104), (255, 255, 255)

REEL = {
    'slug': 'villa-teslim',
    'music': 'house_120_7',          # yalnızca önizleme kopyası için (telifsiz, kendi üretimimiz)
    'cover': 41,                     # kapağın altındaki villa fotoğrafı (havuz no; None → yalnızca başlık)
    'end': 45,                # kapanış kartının altındaki fotoğraf
    'photos': [61, 63, 57, 67, 53, 71],
    'cover_s': 4.2, 'slide_s': 2.6, 'end_s': 4.2, 'xf': 0.45,
}


def ffmpeg():
    try:
        import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception: return 'ffmpeg'


def mont(size, weight):
    p = os.path.join(FONTS, 'Montserrat-VF.ttf')
    if os.path.exists(p):
        f = ImageFont.truetype(p, size)
        try: f.set_variation_by_axes([weight])
        except Exception: pass
        return f
    return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', int(size * 0.85))


def load(n, urls):
    with urllib.request.urlopen(urls[n], timeout=90) as r:
        im = ImageOps.exif_transpose(Image.open(io.BytesIO(r.read()))).convert('RGB')
    im = ImageEnhance.Contrast(im).enhance(1.05); im = ImageEnhance.Color(im).enhance(1.08)
    return im


def sky(h=H):
    g = np.linspace(0, 1, h)[:, None, None] ** 1.2
    a = np.array(SKY_TOP)[None, None, :] * (1 - g) + np.array(SKY_BOT)[None, None, :] * g
    return Image.fromarray(np.repeat(a, W, axis=1).astype(np.uint8))


def logo(width):
    l = Image.open(os.path.join(ROOT, 'public', 'reels', 'kit', 'embay_logo_beyaz.png')).convert('RGBA')
    return l.resize((width, int(l.height * width / l.width)), Image.LANCZOS)


def ctext(d, y, t, f, fill=WHITE):
    d.text(((W - d.textlength(t, font=f)) / 2, y), t, font=f, fill=fill)


def badge(d, cx, cy, lines, r=96):
    d.ellipse([cx - r - 6, cy - r - 6, cx + r + 6, cy + r + 6], fill=(255, 255, 255, 90))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, 240))
    fs = [mont(26, 500), mont(40, 800)]
    y = cy - 38
    for i, t in enumerate(lines):
        f = fs[min(i, 1)]; d.text((cx - d.textlength(t, font=f) / 2, y), t, font=f, fill=NAVY); y += 34 if i == 0 else 48


def cover_static(photo=None):
    """Kapak: gökyüzü degrade + logo + başlık + rozetler. Fotoğraf verilmezse yazı bloğu ekranda ortalanır."""
    bg = sky()
    top = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(top)
    o = 0 if photo is not None else 330          # fotoğrafsız kapakta blok dikeyde ortaya kayar
    l = logo(210 if photo is None else 190); top.alpha_composite(l, ((W - l.width) // 2, 120 + o - (20 if photo is None else 0)))
    ctext(d, 480 + o, 'Teslim Ettiğimiz', mont(70, 300))
    ctext(d, 565 + o, 'Villa Projemiz', mont(100, 800))
    ctext(d, 700 + o, 'Detaylarını inceleyin!', mont(44, 600))
    badge(d, 200, 900 + o, ['ANAHTAR', 'TESLİM'])
    badge(d, 880, 900 + o, ['GERÇEK', 'PROJE'])
    ctext(d, 862 + o, 'BİLGİ & TEKLİF', mont(26, 600), (225, 236, 250))
    ctext(d, 896 + o, '0531 436 29 04', mont(46, 800))
    if photo is None: return bg, top, None, None, 0
    # fotoğraf alanı: alt %50, üst kenarı gökyüzüne yumuşak geçer
    ph_h = 980
    mask = Image.new('L', (W, ph_h), 255); md = ImageDraw.Draw(mask)
    for y in range(240): md.line([(0, y), (W, y)], fill=int(255 * (y / 240) ** 1.4))
    return bg, top, photo, mask, ph_h


def cover_frame(c, t):
    bg, top, photo, mask, ph_h = c
    img = bg.copy()
    if photo is not None:
        z = 1.0 + 0.05 * t
        pw, ph = int(W * z), int(ph_h * z)
        p = ImageOps.fit(photo, (pw, ph), Image.BILINEAR, centering=(0.5, 0.45)).crop(((pw - W) // 2, ph - ph_h, (pw - W) // 2 + W, ph))
        img.paste(p, (0, H - ph_h), mask)
    img = img.convert('RGBA')
    a = min(1.0, t * 4.2 / 0.7) if t < 0.2 else 1.0     # yazılar ilk ~0,7 sn'de belirir
    if a < 1.0:
        tt = top.copy(); tt.putalpha(tt.getchannel('A').point(lambda v: int(v * a))); img.alpha_composite(tt)
    else: img.alpha_composite(top)
    return img.convert('RGB')


def slide_frame(photo, bubble, t):
    z = 1.0 + 0.07 * t
    fw, fh = int(W * z), int(H * z)
    f = ImageOps.fit(photo, (fw, fh), Image.BILINEAR).crop(((fw - W) // 2, (fh - H) // 2, (fw - W) // 2 + W, (fh - H) // 2 + H)).convert('RGBA')
    f.alpha_composite(bubble, (44, H - bubble.height - 250))
    return f.convert('RGB')


def logo_bubble():
    r = 92; b = Image.new('RGBA', (2 * r + 8, 2 * r + 8), (0, 0, 0, 0)); d = ImageDraw.Draw(b)
    d.ellipse([0, 0, 2 * r + 8, 2 * r + 8], fill=(255, 255, 255, 235))
    d.ellipse([7, 7, 2 * r + 1, 2 * r + 1], fill=(30, 63, 160, 255))
    l = logo(104); b.alpha_composite(l, ((b.width - l.width) // 2, (b.height - l.height) // 2))
    return b


def end_static(photo):
    img = sky()
    ph_h = 760; mask = Image.new('L', (W, ph_h), 255); md = ImageDraw.Draw(mask)
    for y in range(220): md.line([(0, y), (W, y)], fill=int(255 * (y / 220) ** 1.4))
    img.paste(ImageOps.fit(photo, (W, ph_h), Image.LANCZOS, centering=(0.5, 0.45)), (0, H - ph_h), mask)
    img = img.convert('RGBA'); d = ImageDraw.Draw(img)
    l = logo(260); img.alpha_composite(l, ((W - l.width) // 2, 170))
    ctext(d, 540, 'Siz de böyle bir villaya', mont(58, 400))
    ctext(d, 616, 'sahip olmak istiyorsanız', mont(58, 400))
    f = mont(58, 800); t = 'Bize DM atın'; tw = d.textlength(t, font=f)
    d.rounded_rectangle([(W - tw) / 2 - 60, 730, (W + tw) / 2 + 60, 850], radius=60, fill=WHITE)
    d.text(((W - tw) / 2, 754), t, font=f, fill=NAVY)
    ctext(d, 920, '0531 436 29 04', mont(42, 700))
    ctext(d, 990, 'embayyapi.com.tr  ·  @embayyapi', mont(34, 500), (225, 236, 250))
    return img.convert('RGB')


def main():
    urls = {it['n']: it['url'] for it in json.load(open(os.path.join(ROOT, 'scripts', 'media-sheets', 'list.json')))}
    R = REEL; os.makedirs(OUT, exist_ok=True)
    cov = cover_static(load(R['cover'], urls) if R['cover'] else None)
    photos = [load(n, urls) for n in R['photos']]
    bub = logo_bubble(); end = end_static(load(R['end'], urls))
    # sahneler: (süre, kare üretici)
    scenes = [(R['cover_s'], lambda t: cover_frame(cov, t))]
    for p in photos: scenes.append((R['slide_s'], lambda t, p=p: slide_frame(p, bub, t)))
    scenes.append((R['end_s'], lambda t: end))
    xf = R['xf']; starts = []; t0 = 0.0
    for d, _ in scenes: starts.append(t0); t0 += d - xf
    total = t0 + xf
    silent = os.path.join(OUT, R['slug'] + '-sessiz.mp4')
    p = subprocess.Popen([ffmpeg(), '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-maxrate', '7M', '-bufsize', '14M', '-pix_fmt', 'yuv420p',
                          '-movflags', '+faststart', silent], stdin=subprocess.PIPE)
    n = int(round(total * FPS)); first = None
    for k in range(n):
        t = k / FPS
        i = max(j for j in range(len(scenes)) if starts[j] <= t)
        a = np.asarray(scenes[i][1](min(1.0, (t - starts[i]) / scenes[i][0])), dtype=np.float32)
        if i > 0 and t - starts[i] < xf:
            prev = np.asarray(scenes[i - 1][1](min(1.0, (t - starts[i - 1]) / scenes[i - 1][0])), dtype=np.float32)
            e = (t - starts[i]) / xf; e = e * e * (3 - 2 * e); a = prev * (1 - e) + a * e
        fr = a.astype(np.uint8)
        if k == int(1.2 * FPS): first = fr
        p.stdin.write(fr.tobytes())
    p.stdin.close(); p.wait()
    Image.fromarray(first).save(os.path.join(OUT, R['slug'] + '.jpg'), quality=88)
    # önizleme: kendi telifsiz müziğimizle
    music = os.path.join(ROOT, 'scripts', 'reels', 'music', R['music'] + '.m4a')
    subprocess.run([ffmpeg(), '-y', '-loglevel', 'error', '-i', silent, '-i', music, '-filter_complex',
                    f'[1:a]atrim=0:{total:.2f},afade=t=in:d=0.8,afade=t=out:st={total - 1.5:.2f}:d=1.5,volume=0.8[a]',
                    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart',
                    '-t', f'{total:.2f}', os.path.join(OUT, R['slug'] + '.mp4')], check=True)
    print(f"{R['slug']}: {len(scenes)} sahne, {total:.1f} sn")


if __name__ == '__main__':
    main()
