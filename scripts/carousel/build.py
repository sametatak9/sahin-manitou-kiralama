"""EMBAY · Kaydırmalı gönderi (carousel) slaytları — 1080x1350 (Instagram 4:5), kurumsal renkler.
Kapak (başlık + KAYDIR), önce/sonra çiftleri (üst ÖNCE / alt SONRA), tek fotoğraf + oda etiketi, lacivert kapanış (CTA).
Kaynak: scripts/media-sheets/list.json (havuzdaki gerçek proje fotoğrafları). Çıktı: public/carousel/<slug>/NN.jpg
Kullanım: python3 scripts/carousel/build.py [--only c1-]"""
import argparse, io, json, os, urllib.request
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
W, H = 1080, 1350
NAVY, BLUE, LIGHT, WHITE = (38, 42, 107), (30, 63, 160), (143, 198, 242), (255, 255, 255)
PHONES = '0536 784 62 22  ·  0531 436 29 04'
FONTS = os.path.join(ROOT, 'scripts', 'marvel', 'fonts')


def font(kind, size):
    cands = {'head': ['Anton-Regular.ttf', 'BebasNeue-Regular.ttf'], 'sub': ['Oswald-VF.ttf']}[kind]
    for c in cands:
        p = os.path.join(FONTS, c)
        if os.path.exists(p): return ImageFont.truetype(p, size)
    return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', int(size * 0.8))


def fit(d, text, kind, size, maxw):
    f = font(kind, size)
    while d.textlength(text, font=f) > maxw and size > 20:
        size -= 4; f = font(kind, size)
    return f


def tr_up(s):
    return s.replace('i', 'İ').replace('ı', 'I').upper()


_cache = {}
def photo(n, urls):
    if n not in _cache:
        with urllib.request.urlopen(urls[n], timeout=60) as r:
            _cache[n] = ImageOps.exif_transpose(Image.open(io.BytesIO(r.read()))).convert('RGB')
    return _cache[n]


def cover_fit(im, w, h):
    return ImageOps.fit(im, (w, h), Image.LANCZOS, centering=(0.5, 0.5))


def grade(im):
    # hafif kontrast + sıcaklık; gerçek fotoğrafı bozmadan
    from PIL import ImageEnhance
    im = ImageEnhance.Contrast(im).enhance(1.06); im = ImageEnhance.Color(im).enhance(1.05)
    return im


def gradient(w, h, top_a, bot_a):
    g = Image.new('L', (1, h))
    for y in range(h): g.putpixel((0, y), int(top_a + (bot_a - top_a) * (y / max(1, h - 1)) ** 1.6))
    return g.resize((w, h))


def pill(d, x, y, text, fill, size=34, fg=WHITE, kind='sub'):
    f = font(kind, size); tw = d.textlength(text, font=f); bb = f.getbbox(text)
    h = bb[3] - bb[1] + 26
    d.rounded_rectangle([x, y, x + tw + 48, y + h], radius=h // 2, fill=fill)
    d.text((x + 24, y + 13 - bb[1]), text, font=f, fill=fg)
    return tw + 48, h


LOGO = None
def logo(size):
    global LOGO
    if LOGO is None: LOGO = Image.open(os.path.join(ROOT, 'public', 'reels', 'kit', 'embay_logo_beyaz.png')).convert('RGBA')
    l = LOGO.copy(); l.thumbnail((size, size)); return l


def counter(d, i, n):
    t = f'{i}/{n}'; f = font('sub', 30); tw = d.textlength(t, font=f)
    d.rounded_rectangle([W - tw - 70, 40, W - 30, 92], radius=26, fill=(0, 0, 0, 120))
    d.text((W - tw - 50, 46), t, font=f, fill=WHITE)


def corner_logo(img):
    l = logo(110); img.alpha_composite(l, (36, 30))


def slide_cover(c, urls, total):
    img = grade(cover_fit(photo(c['cover'], urls), W, H)).convert('RGBA')
    shade = Image.new('RGBA', (W, H), (12, 14, 40, 0)); shade.putalpha(gradient(W, H, 30, 215)); img.alpha_composite(shade)
    d = ImageDraw.Draw(img)
    # Alttan yukarı yerleşim: [EMBAY YAPI etiketi] / başlık satırları / alt yazı / KAYDIR
    lines = [tr_up(t) for t in c['title']]
    f = font('head', 170)
    for t in lines:
        f = fit(d, t, 'head', min(170, f.size), W - 140)
    boxes = [f.getbbox(t) for t in lines]
    gap = 22; fs = font('sub', 44)
    block = sum(b[3] - b[1] for b in boxes) + gap * (len(lines) - 1)
    bottom = H - 220
    sub_h = fs.getbbox(c['sub'])[3] - fs.getbbox(c['sub'])[1]
    y = bottom - sub_h - 34 - block
    pill(d, 70, y - 96, 'EMBAY YAPI', NAVY + (235,), 34)
    for i, (t, b) in enumerate(zip(lines, boxes)):
        d.text((70, y - b[1]), t, font=f, fill=LIGHT if i == len(lines) - 1 else WHITE)
        y += (b[3] - b[1]) + gap
    sb = fs.getbbox(c['sub']); d.text((72, y + 12 - sb[1]), c['sub'], font=fs, fill=WHITE)
    # KAYDIR + çizilmiş ok
    fk = font('sub', 38); tk = 'KAYDIR'; kw = d.textlength(tk, font=fk); kb = fk.getbbox(tk)
    bx, by, bh = W - 70 - (kw + 140), H - 150, 76
    d.rounded_rectangle([bx, by, W - 70, by + bh], radius=bh // 2, fill=BLUE + (255,))
    d.text((bx + 30, by + (bh - (kb[3] - kb[1])) / 2 - kb[1]), tk, font=fk, fill=WHITE)
    ax, ay = bx + 30 + kw + 22, by + bh / 2
    d.line([(ax, ay), (ax + 46, ay)], fill=WHITE, width=6)
    d.polygon([(ax + 56, ay), (ax + 38, ay - 14), (ax + 38, ay + 14)], fill=WHITE)
    corner_logo(img); counter(d, 1, total)
    return img


def slide_pair(s, urls, i, total):
    img = Image.new('RGBA', (W, H), NAVY + (255,)); hh = (H - 10) // 2
    img.paste(grade(cover_fit(photo(s['before'], urls), W, hh)), (0, 0))
    img.paste(grade(cover_fit(photo(s['after'], urls), W, hh)), (0, hh + 10))
    d = ImageDraw.Draw(img)
    d.rectangle([0, hh, W, hh + 10], fill=LIGHT)
    pill(d, 40, hh - 90, 'ÖNCE', NAVY + (235,), 40, kind='head')
    pill(d, 40, hh + 34, 'SONRA', BLUE + (240,), 40, kind='head')
    lab = s.get('label')
    if lab:
        band = Image.new('RGBA', (W, 120), (0, 0, 0, 0)); band.putalpha(gradient(W, 120, 0, 190)); img.alpha_composite(band, (0, H - 120))
        f = fit(d, lab, 'sub', 44, W - 120); d.text((44, H - 74), lab, font=f, fill=WHITE)
    corner_logo(img); counter(d, i, total)
    return img


def slide_photo(s, urls, i, total):
    img = grade(cover_fit(photo(s['n'], urls), W, H)).convert('RGBA')
    band = Image.new('RGBA', (W, 300), (0, 0, 0, 0)); band.putalpha(gradient(W, 300, 0, 200)); img.alpha_composite(band, (0, H - 300))
    d = ImageDraw.Draw(img)
    lab = s.get('label', '')
    f = fit(d, tr_up(lab), 'head', 84, W - 160)
    d.rectangle([48, H - 168, 60, H - 168 + f.getbbox(tr_up(lab))[3] + 6], fill=LIGHT)
    d.text((80, H - 176), tr_up(lab), font=f, fill=WHITE)
    corner_logo(img); counter(d, i, total)
    return img


def slide_cta(kind, i, total):
    img = Image.new('RGBA', (W, H), NAVY + (255,)); d = ImageDraw.Draw(img)
    for y in range(H):  # lacivert → mavi degrade
        t = y / H; d.line([(0, y), (W, y)], fill=tuple(int(NAVY[k] + (BLUE[k] - NAVY[k]) * t * 0.6) for k in range(3)) + (255,))
    l = logo(330); img.alpha_composite(l, ((W - l.width) // 2, 170))
    f1 = font('sub', 38); t1 = 'ÇELİK YAPI  •  ANAHTAR TESLİM VİLLA'; d.text(((W - d.textlength(t1, font=f1)) / 2, 560), t1, font=f1, fill=LIGHT)
    head = 'KENDİ PROJENİZ İÇİN' if kind == 'proje' else 'EVİNİZ İÇİN TEKLİF'
    f2 = fit(d, head, 'head', 96, W - 140); d.text(((W - d.textlength(head, font=f2)) / 2, 650), head, font=f2, fill=WHITE)
    btn = "DM'den PROJE yazın" if kind == 'proje' else "DM'den TEKLİF yazın"
    fb = font('sub', 48); bw = d.textlength(btn, font=fb)
    d.rounded_rectangle([(W - bw) / 2 - 50, 800, (W + bw) / 2 + 50, 900], radius=50, fill=LIGHT)
    d.text(((W - bw) / 2, 818), btn, font=fb, fill=NAVY)
    f3 = font('sub', 46); d.text(((W - d.textlength(PHONES, font=f3)) / 2, 980), PHONES, font=f3, fill=WHITE)
    f4 = font('sub', 34); t4 = 'embayyapi.com.tr  ·  @embayyapi'; d.text(((W - d.textlength(t4, font=f4)) / 2, 1060), t4, font=f4, fill=LIGHT)
    counter(d, i, total)
    return img


def build(c, urls, out_root):
    out = os.path.join(out_root, c['slug']); os.makedirs(out, exist_ok=True)
    total = 1 + len(c['slides']) + 1
    slides = [slide_cover(c, urls, total)]
    for k, s in enumerate(c['slides'], start=2):
        slides.append(slide_pair(s, urls, k, total) if s['type'] == 'pair' else slide_photo(s, urls, k, total))
    slides.append(slide_cta(c.get('cta', 'proje'), total, total))
    files = []
    for k, im in enumerate(slides, start=1):
        p = os.path.join(out, f'{k:02d}.jpg'); im.convert('RGB').save(p, quality=90, optimize=True, progressive=False)
        files.append(f"{c['slug']}/{k:02d}.jpg")
    return {'slug': c['slug'], 'files': files}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only', default=''); ap.add_argument('--out', default=os.path.join(ROOT, 'public', 'carousel'))
    a = ap.parse_args()
    urls = {it['n']: it['url'] for it in json.load(open(os.path.join(ROOT, 'scripts', 'media-sheets', 'list.json')))}
    cfg = json.load(open(os.path.join(HERE, 'carousels.json')))
    res = [build(c, urls, a.out) for c in cfg['carousels'] if c['slug'].startswith(a.only)]
    idx = os.path.join(a.out, 'index.json'); old = json.load(open(idx)) if os.path.exists(idx) else []
    done = {r['slug'] for r in res}
    json.dump(sorted([r for r in old if r['slug'] not in done] + res, key=lambda r: r['slug']), open(idx, 'w'), indent=1)
    print(json.dumps(res))


if __name__ == '__main__':
    main()
