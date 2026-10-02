"""Medya kontak sayfaları: havuzdaki fotoğraf/videolardan numaralı küçük önizlemeler (videoda 3 kare) üretir.
Amaç: her dosyanın içeriği (villa, kaba inşaat, çelik iskelet, tadilat...) bir kez gözle etiketlensin; içerik botu
yazıyı fotoğrafa/videoya UYUMLU yazsın. Çıktı: scripts/media-sheets/out/sheet-NN.jpg"""
import json, os, subprocess, tempfile, urllib.request
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
items = json.load(open(os.path.join(HERE, 'list.json')))
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 34)
TW, TH = 300, 400

def thumb(it, tmp):
    p = os.path.join(tmp, f"{it['n']}")
    try: urllib.request.urlretrieve(it['url'], p)
    except Exception as e: print('indirilemedi', it['n'], e); return None
    if it['kind'] == 'image':
        try: im = Image.open(p).convert('RGB'); im.thumbnail((TW, TH)); return im
        except Exception as e: print('açılamadı', it['n'], e); return None
    frames = []
    for i, t in enumerate(['00:00:01', '33%', '75%']):
        f = f"{p}_{i}.jpg"
        if t.endswith('%'):
            try:
                d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True).stdout.strip() or 3)
            except Exception: d = 3
            t = str(d * float(t[:-1]) / 100)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', t, '-i', p, '-frames:v', '1', '-vf', f'scale={TW//3*2}:-2', f], check=False)
        if os.path.exists(f): frames.append(Image.open(f).convert('RGB'))
    if not frames: return None
    w = TW; h = TH; canvas = Image.new('RGB', (w, h), (20, 20, 20))
    sw = w // len(frames)
    for i, fr in enumerate(frames):
        fr.thumbnail((sw, h)); canvas.paste(fr, (i * sw, (h - fr.height) // 2))
    return canvas

with tempfile.TemporaryDirectory() as tmp:
    for s in range(0, len(items), 12):
        group = items[s:s + 12]
        sheet = Image.new('RGB', (TW * 4 + 50, TH * 3 + 40), (255, 255, 255))
        for k, it in enumerate(group):
            im = thumb(it, tmp)
            x, y = 10 + (k % 4) * (TW + 10), 10 + (k // 4) * (TH + 10)
            if im: sheet.paste(im, (x, y))
            d = ImageDraw.Draw(sheet)
            label = f"{it['n']}{'V' if it['kind'] == 'video' else ''}"
            d.rectangle([x, y, x + 110, y + 44], fill=(200, 0, 0)); d.text((x + 6, y + 4), label, fill=(255, 255, 255), font=font)
        sheet.save(os.path.join(OUT, f'sheet-{s // 12 + 1:02d}.jpg'), quality=72)
        print('sayfa', s // 12 + 1)
