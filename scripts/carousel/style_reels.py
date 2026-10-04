"""EMBAY · Ev Tarzları Reels: her tarzın kaydırmalı slaytlarından dikey (1080x1920) kısa video.
Slayt ortada (1080x1350), arkası aynı görselin bulanık/koyu hâli; yavaş yakınlaşma + yumuşak geçiş + müzik.
Son kare kaydırmalının kapanış slaytı ('Siz de sahip olmak isterseniz · Bize DM atın').
Kaynak: public/carousel/<slug>/NN.jpg (carousel-build ile üretilir). Çıktı: public/reels/tarzlar/<slug>.mp4 + .jpg
Kullanım: python3 scripts/carousel/style_reels.py [--only et01]"""
import argparse, json, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
SRC = os.path.join(ROOT, 'public', 'carousel'); OUT = os.path.join(ROOT, 'public', 'reels', 'tarzlar')
MUSIC = os.path.join(ROOT, 'scripts', 'reels', 'music', 'house_120_7.m4a')
W, H, FPS = 1080, 1920, 30
HOLD, FIRST, XF, LAST = 2.6, 3.2, 0.5, 3.0   # sn: slayt başına, kapak, geçiş, kapanış


def ffmpeg():
    try:
        import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception: return 'ffmpeg'


def canvas(slide):
    """Dikey kare: bulanık arka plan + ortada slayt."""
    bg = slide.resize((int(H * slide.width / slide.height), H), Image.LANCZOS)
    x = (bg.width - W) // 2; bg = bg.crop((x, 0, x + W, H)).filter(ImageFilter.GaussianBlur(28))
    bg = ImageEnhance.Brightness(bg).enhance(0.45)
    return bg, slide


def frame(bg, slide, t):
    """t: 0..1 bu slaytın ilerleyişi → hafif yakınlaşma (1.00 → 1.05)."""
    z = 1.0 + 0.05 * t
    sw, sh = int(W * z), int(1350 * z)
    s = slide.resize((sw, sh), Image.BILINEAR).crop(((sw - W) // 2, (sh - 1350) // 2, (sw - W) // 2 + W, (sh - 1350) // 2 + 1350))
    img = bg.copy(); img.paste(s, (0, (H - 1350) // 2))
    return np.asarray(img, dtype=np.uint8)


def build(slug, src):
    files = sorted(f for f in os.listdir(os.path.join(src, slug)) if f.endswith('.jpg'))
    slides = [Image.open(os.path.join(src, slug, f)).convert('RGB') for f in files]
    durs = [FIRST] + [HOLD] * (len(slides) - 2) + [LAST]
    total = sum(durs) - XF * (len(slides) - 1)
    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, slug + '.mp4')
    cmd = [ffmpeg(), '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
           '-i', MUSIC, '-filter_complex', f'[1:a]atrim=0:{total:.2f},afade=t=in:d=0.6,afade=t=out:st={total - 1.2:.2f}:d=1.2,volume=0.85[a]',
           '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k',
           '-movflags', '+faststart', '-t', f'{total:.2f}', out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    prep = [canvas(s) for s in slides]
    starts = []; t0 = 0.0
    for d in durs: starts.append(t0); t0 += d - XF
    n = int(round(total * FPS))
    for k in range(n):
        t = k / FPS
        i = max(j for j in range(len(slides)) if starts[j] <= t)
        a = frame(*prep[i], min(1.0, (t - starts[i]) / durs[i]))
        # geçiş: yeni slaytın ilk XF saniyesinde önceki slayttan yumuşak karışım
        if i > 0 and t - starts[i] < XF:
            prev = frame(*prep[i - 1], min(1.0, (t - starts[i - 1]) / durs[i - 1]))
            e = (t - starts[i]) / XF; e = e * e * (3 - 2 * e)
            a = (prev.astype(np.float32) * (1 - e) + a.astype(np.float32) * e).astype(np.uint8)
        p.stdin.write(a.tobytes())
    p.stdin.close(); p.wait()
    slides[0].save(os.path.join(OUT, slug + '.jpg'), quality=88)
    print(f'{slug}: {len(slides)} slayt, {total:.1f} sn')
    return {'slug': slug, 'dur': round(total, 2)}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only', default=''); a = ap.parse_args()
    # Slaytlar Reels için yeniden çizilir (sayaç ve 'KAYDIR' olmadan); kaydırmalı gönderinin dosyalarına dokunulmaz
    sys.path.insert(0, HERE); import build as cb
    cb.REEL = True
    urls = {it['n']: it['url'] for it in json.load(open(os.path.join(ROOT, 'scripts', 'media-sheets', 'list.json')))}
    res = []
    with tempfile.TemporaryDirectory() as tmp:
        for c in cb.series_carousels():
            if not c['slug'].startswith(a.only): continue
            cb.build(c, urls, tmp)
            res.append(build(c['slug'], tmp))
    idx = os.path.join(OUT, 'index.json'); old = json.load(open(idx)) if os.path.exists(idx) else []
    done = {r['slug'] for r in res}
    json.dump(sorted([r for r in old if r['slug'] not in done] + res, key=lambda r: r['slug']), open(idx, 'w'), indent=1)


if __name__ == '__main__':
    main()
