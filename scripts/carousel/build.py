"""EMBAY · Kaydırmalı gönderi (carousel) slaytları — 1080x1350 (Instagram 4:5), kurumsal renkler.
Kapak (başlık + KAYDIR), önce/sonra çiftleri (üst ÖNCE / alt SONRA), tek fotoğraf + oda etiketi, lacivert kapanış (CTA).
Kaynak: scripts/media-sheets/list.json (havuzdaki gerçek proje fotoğrafları). Çıktı: public/carousel/<slug>/NN.jpg
Kullanım: python3 scripts/carousel/build.py [--only c1-]"""
import argparse, io, json, os, urllib.request
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
W, H = 1080, 1350
NAVY, BLUE, LIGHT, WHITE = (38, 42, 107), (30, 63, 160), (143, 198, 242), (255, 255, 255)
PHONES = '0531 436 29 04'
FONTS = os.path.join(ROOT, 'scripts', 'marvel', 'fonts')


def font(kind, size):
    import sys; sys.path.insert(0, FONTS.rsplit(os.sep, 1)[0]); from brandfont import montserrat
    m = montserrat(size, 700 if kind == 'head' else 400)   # kurumsal Montserrat: başlık 700, metin ince 400
    if m: return m
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
    # n: havuz numarası (gerçek proje fotoğrafı) veya doğrudan adres (seri görselleri)
    if n not in _cache:
        src = n if isinstance(n, str) and n.startswith('http') else urls[n]
        with urllib.request.urlopen(src, timeout=60) as r:
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


REEL = False  # True: Reels için çizim — sayaç ve 'KAYDIR' yok


def counter(d, i, n):
    if REEL: return
    t = f'{i}/{n}'; f = font('sub', 30); tw = d.textlength(t, font=f)
    d.rounded_rectangle([W - tw - 70, 40, W - 30, 92], radius=26, fill=(0, 0, 0, 120))
    d.text((W - tw - 50, 46), t, font=f, fill=WHITE)


def corner_logo(img):
    l = logo(110); img.alpha_composite(l, (36, 30))


def temsili(d, t='Temsili görsel', fill=(0, 0, 0, 110)):
    # Yapay zekâ görseli → açık etiket (yanıltmamak için her slaytta); gerçek proje fotoğrafında 'GERÇEK EMBAY PROJESİ'
    f = font('sub', 18); tw = d.textlength(t, font=f)
    d.rounded_rectangle([W - tw - 46, 112, W - 26, 140], radius=14, fill=fill)
    d.text((W - tw - 36, 114), t, font=f, fill=WHITE)


# Görseli henüz olmayan tarzlar için mimari çizim (blueprint) — fotoğraf taklidi değil, açıkça çizim.
# Koordinatlar 1000x700'lük çizim alanında; her öğe ('l', [(x,y)...]) çoklu çizgi / ('r', x0,y0,x1,y1) / ('a', x0,y0,x1,y1) kemer.
SKETCH = {
  'ege': [('r', 160, 300, 760, 640), ('r', 560, 200, 860, 640), ('l', [(140, 300), (780, 300)]), ('l', [(540, 200), (880, 200)]),
          ('a', 330, 430, 430, 640), ('r', 210, 380, 290, 460), ('r', 470, 380, 530, 440), ('r', 640, 290, 720, 370), ('r', 640, 460, 720, 540),
          ('l', [(560, 160), (560, 200)]), ('l', [(600, 170), (860, 170)]), ('l', [(600, 170), (600, 200)]), ('l', [(860, 170), (860, 200)])],
  'barnhouse': [('l', [(100, 640), (100, 360), (500, 140), (900, 360), (900, 640), (100, 640)]), ('l', [(60, 380), (500, 120), (940, 380)]),
                ('r', 300, 430, 700, 640), ('l', [(400, 430), (400, 640)]), ('l', [(500, 430), (500, 640)]), ('l', [(600, 430), (600, 640)]),
                ('r', 450, 260, 550, 360)] + [('l', [(x, 640), (x, 600)]) for x in range(130, 900, 40)],
  'celik': [('l', [(120, 640), (120, 330), (500, 130), (880, 330), (880, 640)]), ('l', [(80, 640), (920, 640)])]
           + [('l', [(x, 640), (x, 330 - (x - 120) * 0.526 if x <= 500 else 130 + (x - 500) * 0.526)]) for x in range(180, 880, 60)]
           + [('l', [(120, 640), (500, 330)]), ('l', [(880, 640), (500, 330)]), ('l', [(120, 330), (880, 330)]), ('l', [(120, 480), (880, 480)])],
  'kutuk': [('l', [(140, 640), (140, 360), (500, 150), (860, 360), (860, 640)]), ('l', [(100, 380), (500, 130), (900, 380)]),
            ('r', 680, 160, 740, 300)] + [('l', [(140, y), (860, y)]) for y in range(390, 640, 30)]
           + [('r', 440, 470, 560, 640), ('r', 220, 430, 340, 530), ('r', 660, 430, 780, 530), ('l', [(60, 640), (940, 640)])],
  'kubik': [('r', 120, 400, 640, 640), ('r', 360, 200, 900, 400), ('l', [(60, 640), (940, 640)])]
           + [('l', [(x, 220), (x, 380)]) for x in range(420, 880, 70)] + [('l', [(400, 300), (880, 300)])]
           + [('r', 160, 440, 360, 620), ('l', [(260, 440), (260, 620)]), ('r', 420, 460, 600, 640)],
}


def slide_sketch(c, total):
    img = Image.new('RGBA', (W, H), NAVY + (255,)); d = ImageDraw.Draw(img)
    grid = (58, 64, 140)
    for x in range(0, W, 45): d.line([(x, 0), (x, H)], fill=grid, width=1)
    for y in range(0, H, 45): d.line([(0, y), (W, y)], fill=grid, width=1)
    ox, oy, sc = 90, 130, 0.9
    P = lambda x, y: (ox + x * sc, oy + y * sc)
    for it in SKETCH[c['sketch']]:
        if it[0] == 'l': d.line([P(*q) for q in it[1]], fill=LIGHT, width=5, joint='curve')
        elif it[0] == 'r': d.rectangle([P(it[1], it[2]), P(it[3], it[4])], outline=LIGHT, width=5)
        elif it[0] == 'a':
            x0, y0, x1, y1 = it[1:]; r = (x1 - x0) / 2
            d.arc([P(x0, y0), P(x1, y0 + 2 * r)], 180, 360, fill=LIGHT, width=5)
            d.line([P(x0, y0 + r), P(x0, y1)], fill=LIGHT, width=5); d.line([P(x1, y0 + r), P(x1, y1)], fill=LIGHT, width=5)
    # ölçü çizgisi süsü
    d.line([P(100, 690), P(900, 690)], fill=LIGHT, width=2)
    for x in (100, 900): d.line([P(x, 675), P(x, 705)], fill=LIGHT, width=2)
    f = font('sub', 26); t = 'MİMARİ ÇİZİM · EMBAY YAPI'; d.text(((W - d.textlength(t, font=f)) / 2, oy + 715 * sc), t, font=f, fill=LIGHT)
    lines = [tr_up(t) for t in c['title']]
    fh = font('head', 130)
    for t in lines: fh = fit(d, t, 'head', min(130, fh.size), W - 140)
    boxes = [fh.getbbox(t) for t in lines]; fs = font('sub', 42); sb = fs.getbbox(c['sub'])
    # alttan yukarı: alt yazı → başlık satırları → etiket (yazı tipi ne olursa olsun taşmaz)
    y = H - 90 - (sb[3] - sb[1]) - 26 - sum(b[3] - b[1] for b in boxes) - 18 * (len(lines) - 1)
    pill(d, 70, y - 96, c.get('kicker', 'EMBAY YAPI'), BLUE + (255,), 34)
    for i, (t, b) in enumerate(zip(lines, boxes)):
        d.text((70, y - b[1]), t, font=fh, fill=LIGHT if i == len(lines) - 1 else WHITE); y += (b[3] - b[1]) + 18
    d.text((72, y + 8 - sb[1]), c['sub'], font=fs, fill=WHITE)
    corner_logo(img); counter(d, 1, total)
    return img


def slide_cover(c, urls, total):
    if c.get('sketch'): return slide_sketch(c, total)
    img = grade(cover_fit(photo(c['cover'], urls), W, H)).convert('RGBA')
    shade = Image.new('RGBA', (W, H), (12, 14, 40, 0)); shade.putalpha(gradient(W, H, 30, 215)); img.alpha_composite(shade)
    d = ImageDraw.Draw(img)
    # Alttan yukarı yerleşim: [EMBAY YAPI etiketi] / başlık satırları / alt yazı / KAYDIR
    lines = [tr_up(t) for t in c['title']]
    f = font('head', 170)
    for t in lines:
        f = fit(d, t, 'head', min(170, f.size), W - 140)
    boxes = [f.getbbox(t) for t in lines]
    gap = 36; fs = font('sub', 44)
    block = sum(b[3] - b[1] for b in boxes) + gap * (len(lines) - 1)
    bottom = H - 220
    sub_h = fs.getbbox(c['sub'])[3] - fs.getbbox(c['sub'])[1]
    y = bottom - sub_h - 34 - block
    pill(d, 70, y - 96, c.get('kicker', 'EMBAY YAPI'), NAVY + (235,), 34)
    for i, (t, b) in enumerate(zip(lines, boxes)):
        d.text((70, y - b[1]), t, font=f, fill=LIGHT if i == len(lines) - 1 else WHITE)
        y += (b[3] - b[1]) + gap
    sb = fs.getbbox(c['sub']); d.text((72, y + 12 - sb[1]), c['sub'], font=fs, fill=WHITE)
    # KAYDIR + çizilmiş ok (yalnızca kaydırmalı gönderide)
    if not REEL:
        fk = font('sub', 38); tk = 'KAYDIR'; kw = d.textlength(tk, font=fk); kb = fk.getbbox(tk)
        bx, by, bh = W - 70 - (kw + 140), H - 150, 76
        d.rounded_rectangle([bx, by, W - 70, by + bh], radius=bh // 2, fill=BLUE + (255,))
        d.text((bx + 30, by + (bh - (kb[3] - kb[1])) / 2 - kb[1]), tk, font=fk, fill=WHITE)
        ax, ay = bx + 30 + kw + 22, by + bh / 2
        d.line([(ax, ay), (ax + 46, ay)], fill=WHITE, width=6)
        d.polygon([(ax + 56, ay), (ax + 38, ay - 14), (ax + 38, ay + 14)], fill=WHITE)
    corner_logo(img); counter(d, 1, total)
    if c.get('temsili'): temsili(d)
    elif c.get('real'): temsili(d, 'GERÇEK EMBAY PROJESİ', BLUE + (235,))
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
    if s.get('real'):  # gerçek iş olduğunu belirt
        pill(d, 80, H - 250, 'GERÇEK EMBAY PROJESİ', BLUE + (240,), 30)
    corner_logo(img); counter(d, i, total)
    if s.get('temsili'): temsili(d)
    return img


def slide_info(s, urls, i, total):
    # Tarzın öne çıkan özellikleri: bulanık + koyulaştırılmış arka plan üstünde madde listesi
    bg = cover_fit(photo(s['bg'], urls), W, H).filter(ImageFilter.GaussianBlur(14)).convert('RGBA')
    bg.alpha_composite(Image.new('RGBA', (W, H), NAVY + (205,)))
    d = ImageDraw.Draw(bg)
    pill(d, 70, 190, s.get('kicker', 'ÖNE ÇIKANLAR'), BLUE + (255,), 34)
    ft = fit(d, tr_up(s['title']), 'head', 110, W - 140); tb = ft.getbbox(tr_up(s['title']))
    d.text((70, 290 - tb[1]), tr_up(s['title']), font=ft, fill=WHITE)
    y = 290 + (tb[3] - tb[1]) + 80; fb = font('sub', 44)
    for t in s['items']:
        words = t.split(); lines = ['']
        for w_ in words:
            cand = (lines[-1] + ' ' + w_).strip()
            if d.textlength(cand, font=fb) > W - 260 and lines[-1]: lines.append(w_)
            else: lines[-1] = cand
        cx_, cy_ = 100, y + 28
        d.ellipse([cx_ - 24, cy_ - 24, cx_ + 24, cy_ + 24], fill=LIGHT)
        d.line([(cx_ - 11, cy_), (cx_ - 3, cy_ + 9), (cx_ + 12, cy_ - 9)], fill=NAVY, width=6)
        for ln in lines:
            bb = fb.getbbox(ln); d.text((150, y + 4 - bb[1] + 6), ln, font=fb, fill=WHITE); y += 62
        y += 34
    corner_logo(bg); counter(d, i, total)
    return bg


def slide_cta(kind, i, total):
    img = Image.new('RGBA', (W, H), NAVY + (255,)); d = ImageDraw.Draw(img)
    for y in range(H):  # lacivert → mavi degrade
        t = y / H; d.line([(0, y), (W, y)], fill=tuple(int(NAVY[k] + (BLUE[k] - NAVY[k]) * t * 0.6) for k in range(3)) + (255,))
    l = logo(330); img.alpha_composite(l, ((W - l.width) // 2, 170))
    f1 = font('sub', 38); t1 = 'ÇELİK YAPI  •  ANAHTAR TESLİM VİLLA'; d.text(((W - d.textlength(t1, font=f1)) / 2, 560), t1, font=f1, fill=LIGHT)
    head = {'proje': 'KENDİ PROJENİZ İÇİN', 'sahip': 'SİZ DE SAHİP OLMAK İSTERSENİZ'}.get(kind, 'EVİNİZ İÇİN TEKLİF')
    f2 = fit(d, head, 'head', 96, W - 140); d.text(((W - d.textlength(head, font=f2)) / 2, 650), head, font=f2, fill=WHITE)
    btn = {'proje': "DM'den PROJE yazın", 'sahip': "Bize DM atın"}.get(kind, "DM'den TEKLİF yazın")
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
        slides.append(slide_pair(s, urls, k, total) if s['type'] == 'pair' else slide_info(s, urls, k, total) if s['type'] == 'info' else slide_photo(s, urls, k, total))
    slides.append(slide_cta(c.get('cta', 'proje'), total, total))
    files = []
    for k, im in enumerate(slides, start=1):
        p = os.path.join(out, f'{k:02d}.jpg'); im.convert('RGB').save(p, quality=90, optimize=True, progressive=False)
        files.append(f"{c['slug']}/{k:02d}.jpg")
    return {'slug': c['slug'], 'files': files}


def series_carousels():
    # 10 günlük 'Ev Tarzları': kapak → iç mekân/detay → özellikler → [gerçek Embay projesi] → 'Siz de sahip olmak isterseniz'
    # Görsel kaynağı (öncelik): gerçek Embay fotoğrafı (a_real/b_real) > yapay zekâ görseli (a_url/b_url, 'TEMSİLİ' etiketli) > mimari çizim (sketch)
    out = []
    styles = json.load(open(os.path.join(HERE, 'ev_tarzlari.json')))['styles']
    for k, st in enumerate(styles, start=1):
        a = st.get('a_real') or st.get('a_url'); a_ai = not st.get('a_real') and bool(st.get('a_url'))
        b = st.get('b_real') or st.get('b_url'); b_ai = not st.get('b_real') and bool(st.get('b_url'))
        slides = []
        if b: slides.append({'type': 'photo', 'n': b, 'label': st['b_label'], 'temsili': b_ai, 'real': bool(st.get('b_real'))})
        slides.append({'type': 'info', 'bg': a or b or st.get('real', {}).get('n') or 61, 'title': ' '.join(st['name']), 'items': st['traits']})
        if st.get('real'): slides.append({'type': 'photo', 'n': st['real']['n'], 'label': st['real']['label'].split('·')[-1].strip(), 'real': True})
        c = {'slug': st['slug'], 'title': st['name'], 'sub': st['sub'], 'kicker': f'EV TARZLARI · {k}/{len(styles)}', 'slides': slides, 'cta': 'sahip'}
        if a: c.update(cover=a, temsili=a_ai, real=bool(st.get('a_real')))
        else: c['sketch'] = st['sketch']
        out.append(c)
    return out


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only', default=''); ap.add_argument('--out', default=os.path.join(ROOT, 'public', 'carousel'))
    a = ap.parse_args()
    urls = {it['n']: it['url'] for it in json.load(open(os.path.join(ROOT, 'scripts', 'media-sheets', 'list.json')))}
    cfg = json.load(open(os.path.join(HERE, 'carousels.json')))
    cfg['carousels'] += series_carousels()
    res = [build(c, urls, a.out) for c in cfg['carousels'] if c['slug'].startswith(a.only)]
    idx = os.path.join(a.out, 'index.json'); old = json.load(open(idx)) if os.path.exists(idx) else []
    done = {r['slug'] for r in res}
    json.dump(sorted([r for r in old if r['slug'] not in done] + res, key=lambda r: r['slug']), open(idx, 'w'), indent=1)
    print(json.dumps(res))


if __name__ == '__main__':
    main()
