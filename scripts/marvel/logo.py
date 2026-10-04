"""EMBAY YAPI logo / profil fotoğrafı seti (Marvel/Netflix tarzı kırmızı kutu, Anton fontu).
Çıktı: public/brand/*.png — Instagram/Facebook profil (1080², daire içinde güvenli alan), şeffaf logo, Facebook kapak."""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
H = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(H))
OUT = os.path.join(ROOT, 'public', 'brand'); os.makedirs(OUT, exist_ok=True)
RED, DRED, WHITE, BLACK, GOLD = (226, 32, 40), (150, 12, 20), (255, 255, 255), (12, 12, 14), (226, 201, 143)

def F(n, size):
    for p in [os.path.join(H, 'fonts', n), f'/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']:
        if os.path.exists(p) and os.path.getsize(p) > 10000: return ImageFont.truetype(p, size)

def text_c(d, cx, y, t, f, fill, spacing=0):
    if spacing:
        widths = [d.textlength(ch, font=f) for ch in t]; tw = sum(widths) + spacing * (len(t) - 1); x = cx - tw / 2
        for ch, w in zip(t, widths): d.text((x, y), ch, font=f, fill=fill); x += w + spacing
    else:
        tw = d.textlength(t, font=f); d.text((cx - tw / 2, y), t, font=f, fill=fill)

def logo_block(scale=1.0, box=RED, txt=WHITE, sub=WHITE, transparent=True):
    fA = F('Anton-Regular.ttf', int(300 * scale)); fS = F('Anton-Regular.ttf', int(92 * scale))
    tmp = ImageDraw.Draw(Image.new('RGBA', (10, 10))); t = 'EMBAY'
    tw = tmp.textlength(t, font=fA); bb = fA.getbbox(t); th = bb[3] - bb[1]
    pad_x, pad_y = int(70 * scale), int(48 * scale)
    bw, bh = int(tw + 2 * pad_x), int(th + 2 * pad_y)
    gap = int(30 * scale); sh = int(110 * scale)
    img = Image.new('RGBA', (bw, bh + gap + sh), (0, 0, 0, 0) if transparent else BLACK + (255,)); d = ImageDraw.Draw(img)
    d.rectangle([0, 0, bw, bh], fill=box + (255,))
    d.text(((bw - tw) / 2, pad_y - bb[1]), t, font=fA, fill=txt + (255,))
    text_c(d, bw / 2, bh + gap - fS.getbbox('YAPI')[1], 'YAPI', fS, sub + (255,), spacing=int(46 * scale))
    return img

def place(canvas, block, cx, cy, maxw):
    s = min(1.0, maxw / block.width)
    b = block.resize((int(block.width * s), int(block.height * s)), Image.LANCZOS)
    canvas.alpha_composite(b, (int(cx - b.width / 2), int(cy - b.height / 2)))

def radial(size, inner, outer):
    w, h = size; img = Image.new('RGB', size, outer); d = ImageDraw.Draw(img)
    for r in range(max(w, h), 0, -6):
        t = r / max(w, h); col = tuple(int(inner[i] * (1 - t) + outer[i] * t) for i in range(3))
        d.ellipse([w / 2 - r, h / 2 - r, w / 2 + r, h / 2 + r], fill=col)
    return img.filter(ImageFilter.GaussianBlur(20))

S = 1080
# 1) Profil — siyah zemin, kırmızı kutu (videolardaki gibi)
c = radial((S, S), (40, 10, 14), BLACK).convert('RGBA'); place(c, logo_block(), S / 2, S / 2, S * 0.70); c.convert('RGB').save(os.path.join(OUT, 'profil-siyah.png'))
# 2) Profil — tam kırmızı zemin, beyaz yazı (Netflix uygulama simgesi gibi)
c = radial((S, S), (238, 46, 52), DRED).convert('RGBA'); place(c, logo_block(box=(255, 255, 255), txt=RED, sub=WHITE), S / 2, S / 2, S * 0.70); c.convert('RGB').save(os.path.join(OUT, 'profil-kirmizi.png'))
# 3) Profil — lacivert zemin (mevcut kurumsal renklerle uyum), kırmızı kutu + altın YAPI
c = radial((S, S), (30, 44, 86), (10, 18, 38)).convert('RGBA'); place(c, logo_block(sub=GOLD), S / 2, S / 2, S * 0.70); c.convert('RGB').save(os.path.join(OUT, 'profil-lacivert.png'))
# 4) Şeffaf logo (videolara / bannerlara / web'e)
logo_block().save(os.path.join(OUT, 'logo-seffaf.png'))
# 5) Facebook kapak 1640x624 — logo + slogan + telefonlar
W, Hh = 1640, 624
c = radial((W, Hh), (40, 10, 14), BLACK).convert('RGBA')
place(c, logo_block(), 430, Hh / 2, 560)
d = ImageDraw.Draw(c); fT = F('Anton-Regular.ttf', 88); fP = F('Anton-Regular.ttf', 54)
d.text((820, 170), "TÜRKİYE'NİN", font=fT, fill=WHITE); d.text((820, 270), '81 İLİNE KURULUM', font=fT, fill=RED)
d.text((820, 400), '0531 436 29 04', font=fP, fill=GOLD)
c.convert('RGB').save(os.path.join(OUT, 'facebook-kapak.png'))
# 6) Önizleme: profillerin daire içinde görünümü
prev = Image.new('RGB', (3 * 380 + 40, 420), (245, 245, 245))
for i, n in enumerate(['profil-siyah', 'profil-kirmizi', 'profil-lacivert']):
    im = Image.open(os.path.join(OUT, n + '.png')).resize((360, 360), Image.LANCZOS)
    m = Image.new('L', (360, 360), 0); ImageDraw.Draw(m).ellipse([0, 0, 359, 359], fill=255)
    prev.paste(im, (20 + i * 380, 30), m)
prev.save(os.path.join(OUT, 'onizleme-daire.png'))
print('ok', sorted(os.listdir(OUT)))
