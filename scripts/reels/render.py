#!/usr/bin/env python3
"""EMBAY otomatik Reels montajı (GitHub Actions'ta çalışır, gizli anahtar gerektirmez).

Akış: panelin herkese açık kuyruğundan (ops/reels/queue) montaj bekleyen Reels taslaklarını alır →
her taslak için KENDİ ham videosunun 4 farklı bölümünü keser (kısa videoda havuzdan yedek) → Embay tarzında (lacivert/kraliyet mavisi/gök mavisi,
blueprint ızgara, merak kartı, adım etiketleri, logo, telefon şeridi, kapanış kartı, müzik) 1080×1920 H.264/AAC MP4 üretir →
public/reels/<id>.mp4 + .jpg olarak depoya yazar. Workflow dosyaları commit'ler; Vercel yayınlayınca ops/reels/attach
taslağa bağlar (yalnızca kendi alan adımızdaki dosyayı kabul eder).

Yerel test: python3 scripts/reels/render.py --test video1.mp4 video2.mp4 --out /tmp/out
"""
import argparse, json, os, re, shutil, subprocess, sys, tempfile, urllib.request
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 30
NAVY, ROYAL, SKY, INK, SKYL = (38, 42, 107), (30, 63, 160), (143, 198, 242), (27, 31, 82), (220, 233, 251)
# Lüks kurumsal palet (banner'larla aynı): lacivert + altın
LNAVY, LNAVY2, GOLD, GOLD2, CREAM = (15, 26, 51), (10, 18, 38), (201, 164, 92), (226, 201, 143), (239, 233, 221)
PHONE, WEB, HANDLE = '0531 436 29 04', 'embayyapi.com.tr', '@embayyapi'
HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIRS = ['/usr/share/fonts/truetype/dejavu', os.path.join(HERE, 'fonts')]

TEMPLATES = {
    'asamalar': (['Temel', 'Kaba inşaat', 'Çatı', 'Anahtar teslim'], 'Temelden anahtar teslime'),
    'ev': (['Zemin etüdü', 'Temel & karkas', 'Duvar & çatı', 'Anahtar teslim'], 'Müstakil ev yapımı'),
    'villa': (['Proje & ruhsat', 'Karkas', 'İnce işler', 'Teslim'], 'Villa yapımı'),
    'bina': (['Temel', 'Betonarme', 'Duvarlar', 'Bina hazır'], 'Bina yapımı'),
    'tadilat': (['Önce', 'Söküm & hazırlık', 'Uygulama', 'Sonra'], 'Tadilat & renovasyon'),
    'tamirat': (['Sorun', 'Tespit', 'Onarım', 'Sonuç'], 'Tamirat & onarım'),
    'santiye': (['Sabah', 'Ekibimiz', 'İşin mutfağı', 'Günün sonu'], 'Şantiyeden gerçek iş'),
    'ipucu': (['1. ipucu', '2. ipucu', '3. ipucu', 'Özet'], 'Ustadan ipuçları'),
}
# Her Reels farklı görünsün: geçiş efekti, üst etiket ve kanca kartı değişir (renkler Embay lacivert/gök mavisi içinde kalır)
STYLES = [
    {'tr': ['slideleft', 'circleopen', 'wipeup', 'smoothleft', 'fadeblack'], 'pill': 'KAYDET, LAZIM OLACAK', 'sub': 'Sonuna kadar izleyin'},
    {'tr': ['radial', 'slideup', 'circlecrop', 'wiperight', 'fade'], 'pill': 'USTADAN İPUCU', 'sub': 'Ev yaptıracaklar için'},
    {'tr': ['smoothup', 'hlslice', 'diagtl', 'slideright', 'fadeblack'], 'pill': 'İŞİN MUTFAĞI', 'sub': 'Şantiyeden gerçek görüntüler'},
    {'tr': ['zoomin', 'wipeleft', 'vuslice', 'smoothdown', 'fade'], 'pill': 'ÖNCE / SONRA', 'sub': 'Farkı sonunda görün'},
]


def serif(bold=True, size=60):
    name = 'DejaVuSerif-Bold.ttf' if bold else 'DejaVuSerif.ttf'
    for d in FONT_DIRS:
        p = os.path.join(d, name)
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return font(bold, size)


def font(bold=True, size=60):
    name = 'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'
    for d in FONT_DIRS:
        p = os.path.join(d, name)
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def template_for(text):
    t = (text or '').lower()
    if re.search(r'tamir|onar|rutubet|yalıtım|çatlak|akıt', t): return 'tamirat'
    if re.search(r'tadilat|renovasyon|mutfak|banyo|cephe|mantolama|önce', t): return 'tadilat'
    if re.search(r'ipucu|hata|dikkat|rehber', t): return 'ipucu'
    if re.search(r'villa', t): return 'villa'
    if re.search(r'bina|apartman|dönüşüm|betonarme|deprem', t): return 'bina'
    if re.search(r'müstakil|ev yap|evi|ev,|\bev\b', t): return 'ev'
    if re.search(r'şantiye|ekip|beton|kalıp', t): return 'santiye'
    return 'asamalar'



# ── Çizim yardımcıları ──────────────────────────────────────────────────────
def gradient(w, h, a=ROYAL, b=INK):
    img = Image.new('RGB', (w, h), a)
    d = ImageDraw.Draw(img)
    for y in range(h):
        k = y / max(1, h - 1)
        d.line([(0, y), (w, y)], fill=tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3)))
    return img


def grid(img, alpha=14, step=54):
    ov = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    for x in range(0, img.size[0] + 1, step): d.line([(x, 0), (x, img.size[1])], fill=(255, 255, 255, alpha), width=1)
    for y in range(0, img.size[1] + 1, step): d.line([(0, y), (img.size[0], y)], fill=(255, 255, 255, alpha), width=1)
    return Image.alpha_composite(img.convert('RGBA'), ov)


def tr_upper(t):
    return t.replace('i', 'İ').replace('ı', 'I').upper()


def wrap(d, text, f, maxw):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = f'{cur} {w}'.strip()
        if d.textlength(t, font=f) > maxw and cur: lines.append(cur); cur = w
        else: cur = t
    if cur: lines.append(cur)
    return lines


def center(d, y, text, f, fill):
    d.text(((W - d.textlength(text, font=f)) / 2, y), text, font=f, fill=fill)


def pill(d, cx, cy, text, f, bg, fg, padx=46, h=None):
    tw = d.textlength(text, font=f); asc, desc = f.getmetrics(); h = h or int((asc + desc) * 1.55)
    d.rounded_rectangle([cx - tw / 2 - padx, cy - h / 2, cx + tw / 2 + padx, cy + h / 2], radius=h // 2, fill=bg)
    d.text((cx - tw / 2, cy - (asc + desc) / 2), text, font=f, fill=fg)


# Çizgi-ev logosu (panel/banner'lardaki SVG yollarının aynısı; M/L/H/V/l/h/v/z komutları)
HOUSE = ['M6 44V26L24 12l18 14v18z', 'M24 12l10-8 24 18v22H42', 'M14 28h6v6h-6zM26 28h6v6h-6z', 'M19 44v-6h10v6', 'M47 26h5v5h-5z']


def path_polys(d):
    toks = re.findall(r'[MLHVZmlhvz]|-?\d+(?:\.\d+)?', d)
    polys, cur, x, y, cmd, i = [], [], 0.0, 0.0, None, 0
    while i < len(toks):
        t = toks[i]
        if re.match(r'[A-Za-z]', t):
            cmd = t; i += 1
            if cmd in 'Zz':
                if cur: cur.append(cur[0]); polys.append(cur); cur = []
                continue
        if cmd in 'Mm':
            nx, ny = float(toks[i]), float(toks[i + 1]); i += 2
            x, y = (x + nx, y + ny) if cmd == 'm' else (nx, ny)
            if cur: polys.append(cur)
            cur = [(x, y)]; cmd = 'l' if cmd == 'm' else 'L'
        elif cmd in 'Ll':
            nx, ny = float(toks[i]), float(toks[i + 1]); i += 2
            x, y = (x + nx, y + ny) if cmd == 'l' else (nx, ny); cur.append((x, y))
        elif cmd in 'Hh':
            n = float(toks[i]); i += 1; x = x + n if cmd == 'h' else n; cur.append((x, y))
        elif cmd in 'Vv':
            n = float(toks[i]); i += 1; y = y + n if cmd == 'v' else n; cur.append((x, y))
    if cur: polys.append(cur)
    return polys


def logo(d, cx, cy, k, color=(255, 255, 255), text=True):
    ox, oy = cx - 33 * k, cy - 60 * k
    for p in HOUSE:
        for poly in path_polys(p):
            d.line([(ox + px * k, oy + py * k) for px, py in poly], fill=color, width=max(2, int(3.4 * k)), joint='curve')
    if not text: return
    f1, f2 = font(True, int(15 * k)), font(False, int(12 * k))
    d.text((cx - d.textlength('E M B A Y', font=f1) / 2, cy + 4 * k), 'E M B A Y', font=f1, fill=color)
    d.text((cx - d.textlength('Y  A  P  I', font=f2) / 2, cy + 23 * k), 'Y  A  P  I', font=f2, fill=color)


# ── Kartlar (lacivert + altın lüks tarz) ─────────────────────────────────────
def lux_logo(d, x0, y0, s, color=GOLD):
    k = s / 60
    for p in HOUSE:
        for poly in path_polys(p):
            d.line([(x0 + px * k, y0 + py * k) for px, py in poly], fill=color, width=max(2, int(3.2 * k)), joint='curve')
    f1 = serif(False, int(s * 0.5)); d.text((x0 + s * 1.12, y0 + s * 0.08), 'E M B A Y', font=f1, fill=color)
    f2 = font(False, int(s * 0.2)); d.text((x0 + s * 1.7, y0 + s * 0.68), 'Y A P I', font=f2, fill=color)
    d.line([(x0 + s * 1.14, y0 + s * 0.8), (x0 + s * 1.6, y0 + s * 0.8)], fill=color, width=2)
    d.line([(x0 + s * 2.45, y0 + s * 0.8), (x0 + s * 2.9, y0 + s * 0.8)], fill=color, width=2)


def lux_bg():
    img = gradient(W, H, (22, 36, 70), LNAVY2)
    return grid(img, alpha=8, step=72)


def intro_card(hook, path, st=None):
    st = st or STYLES[0]
    img = lux_bg(); d = ImageDraw.Draw(img)
    lux_logo(d, W / 2 - 150, 260, 104)
    pill(d, W / 2, 620, st['pill'], font(True, 34), GOLD, LNAVY2)
    f = serif(True, 96); lines = wrap(d, tr_upper(hook), f, W - 150)[:4]
    y = 760
    for i, l in enumerate(lines): center(d, y, l, f, GOLD if i == len(lines) - 1 and len(lines) > 1 else (255, 255, 255)); y += 122
    d.rectangle([W / 2 - 90, y + 24, W / 2 + 90, y + 30], fill=GOLD)
    center(d, y + 80, st['sub'], font(False, 40), (214, 222, 238))
    footer(d); img.convert('RGB').save(path, quality=95)


def footer(d):
    d.rectangle([0, H - 140, W, H], fill=LNAVY2 + (235,)); d.rectangle([0, H - 140, W, H - 137], fill=GOLD)
    d.text((60, H - 104), HANDLE, font=font(True, 46), fill=(255, 255, 255))
    f = font(False, 34); d.text((W - 60 - d.textlength(WEB, font=f), H - 96), WEB, font=f, fill=GOLD2)


def scene_overlay(label, idx, total, title, path):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    for y in range(0, 360):
        d.line([(0, y), (W, y)], fill=LNAVY + (int(190 * (1 - y / 360)),))
    lux_logo(d, 60, 90, 78)
    # alt bant: altın çizgi + serif etiket (lower third)
    for y in range(H - 560, H - 140):
        a = int(215 * min(1, (y - (H - 560)) / 220))
        d.line([(0, y), (W, y)], fill=LNAVY2 + (a,))
    d.text((70, H - 430), f'0{idx}', font=serif(True, 60), fill=GOLD)
    d.rectangle([70, H - 350, 170, H - 345], fill=GOLD)
    d.text((70, H - 325), tr_upper(label), font=serif(True, 66), fill=(255, 255, 255))
    d.text((70, H - 235), title, font=font(False, 34), fill=GOLD2)
    for j in range(total):
        x0 = W - 70 - (total - j) * 58
        d.rectangle([x0, H - 250, x0 + 44, H - 244], fill=GOLD if j < idx else (255, 255, 255, 90))
    footer(d); img.save(path)


def outro_card(title, path):
    img = lux_bg(); d = ImageDraw.Draw(img)
    lux_logo(d, W / 2 - 190, 470, 132)
    center(d, 760, tr_upper(title), serif(True, 60), (255, 255, 255))
    center(d, 840, 'TEK MUHATAP', serif(True, 60), GOLD)
    d.rectangle([W / 2 - 90, 940, W / 2 + 90, 946], fill=GOLD)
    pill(d, W / 2, 1130, f'☎ {PHONE}', font(True, 64), GOLD, LNAVY2, padx=60, h=160)
    center(d, 1300, 'Ev · villa · bina · tadilat · tamirat', font(False, 40), (214, 222, 238))
    center(d, 1370, 'Ücretsiz keşif · Çatalca / İstanbul', font(False, 40), (214, 222, 238))
    center(d, 1480, 'İşimiz güvencenizdir.', serif(False, 50), GOLD2)
    footer(d); img.convert('RGB').save(path, quality=95)


# ── Video ───────────────────────────────────────────────────────────────────
def ffmpeg_bin():
    for b in ('ffmpeg',):
        if shutil.which(b): return b
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit('ffmpeg bulunamadı')


def probe_duration(path):
    r = subprocess.run([ffmpeg_bin(), '-hide_banner', '-i', path], capture_output=True, text=True)
    m = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', r.stderr)
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)) if m else 0.0


def bpm_of(music):
    m = re.search(r'_(\d{2,3})_', os.path.basename(music or ''))
    return int(m.group(1)) if m else 120


def enc_args():
    return ['-an', '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', str(FPS)]


def segment(src, kind, ss, frames, out, overlay=None, punch=False, flash=False, kb_dir=1):
    """Tek sahne: kaynak (video/fotoğraf) → 1080x1920, zoom (vuruşta 'punch' ya da yavaş Ken Burns), isteğe bağlı yazı katmanı ve flaş."""
    d = frames / FPS
    args = [ffmpeg_bin(), '-hide_banner', '-loglevel', os.environ.get('FFLOG', 'error'), '-y']
    if kind == 'image': args += ['-loop', '1', '-t', f'{d + 0.2:.3f}', '-i', src]
    else: args += ['-stream_loop', '-1', '-ss', f'{ss:.2f}', '-t', f'{d + 0.3:.3f}', '-i', src]
    if overlay: args += ['-loop', '1', '-t', f'{d + 0.2:.3f}', '-i', overlay]
    base = f'[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps={FPS}'
    if kind == 'image':
        z = f"1.04+0.10*on/{frames}"; xs = f"(iw-iw/zoom)*{'on' if kb_dir > 0 else f'({frames}-on)'}/{frames}"
        base += f",zoompan=z='{z}':x='{xs}':y='(ih-ih/zoom)/2':d=1:s={W}x{H}:fps={FPS}"
    elif punch:
        base += f",zoompan=z='1.03+0.16*exp(-on/5)':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=1:s={W}x{H}:fps={FPS}"
    else:
        base += f",zoompan=z='1.03+0.05*on/{frames}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=1:s={W}x{H}:fps={FPS}"
    base += ',eq=saturation=1.12:contrast=1.06:brightness=0.01'
    if flash: base += ',fade=t=in:st=0:d=0.2:color=white'
    base += f',trim=end_frame={frames},setpts=PTS-STARTPTS'
    fc = [base + ('[b]' if overlay else '[v]')]
    if overlay: fc.append(f'[1:v]format=rgba[o];[b][o]overlay=0:0:format=auto:shortest=1,format=yuv420p[v]')
    args += ['-filter_complex', ';'.join(fc), '-map', '[v]', '-frames:v', str(frames), *enc_args(), out]
    subprocess.run(args, check=True)


def card_segment(img, frames, out, flash=False):
    d = frames / FPS
    vf = f"scale={W}:{H},zoompan=z='1.0+0.06*on/{frames}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=1:s={W}x{H}:fps={FPS}"
    if flash: vf += ',fade=t=in:st=0:d=0.2:color=white'
    subprocess.run([ffmpeg_bin(), '-hide_banner', '-loglevel', os.environ.get('FFLOG', 'error'), '-y', '-loop', '1', '-t', f'{d + 0.2:.3f}', '-i', img,
                    '-vf', vf, '-frames:v', str(frames), *enc_args(), out], check=True)


def fetch(u, p):
    if u.startswith('http'): urllib.request.urlretrieve(u, p)
    else: shutil.copy(u, p)
    return p


def render(item, work, out_dir, music):
    """Ritme oturan montaj: giriş kartı (1 ölçü) → hazırlık sahnesi (1 ölçü) → DROP'ta flaş + her 2 vuruşta kesme (zoom punch)
    → kapanış kartı. Kaynak: taslağın KENDİ videosunun farklı anları veya kendi fotoğraf seti (tekrar yok)."""
    tkey = template_for(f"{item.get('headline', '')} {item.get('pillar', '')} {item.get('caption', '')}")
    labels, title = TEMPLATES[tkey]
    st = STYLES[int(item.get('style', 0)) % len(STYLES)]
    hook = (item.get('headline') or 'İnşaata dair tüm işleriniz').strip()[:80]
    beat = 60.0 / bpm_of(music)
    # kaynaklar
    srcs = []
    photos = [u for u in item.get('photos', []) if u][:12]
    if photos:
        for n, u in enumerate(photos):
            try: srcs.append(('image', fetch(u, os.path.join(work, f'p{n}.jpg')), 0.0))
            except Exception as e: print('indirilemedi', u, e)
    if item.get('video'):
        mp = fetch(item['video'], os.path.join(work, 'main.mp4')); srcs.append(('video', mp, probe_duration(mp)))
        if srcs[-1][2] < 6:
            for n, eu in enumerate([x for x in item.get('extras', []) if x != item['video']][:3]):
                try: p = fetch(eu, os.path.join(work, f'x{n}.mp4')); srcs.append(('video', p, probe_duration(p)))
                except Exception as e: print('indirilemedi', eu, e)
    if not srcs: raise RuntimeError('kaynak yok')
    NCUT = 12
    # zaman çizelgesi (vuruş cinsinden): giriş 4, hazırlık 4, kesmeler 12x2, kapanış 8
    plan = [('intro', 4), ('build', 4)] + [('cut', 2)] * NCUT + [('outro', 8)]
    edges = [0]
    for _, nb in plan: edges.append(edges[-1] + nb)
    fr = [round(e * beat * FPS) for e in edges]  # kümülatif kare → kayma yok
    intro, outro = os.path.join(work, 'intro.jpg'), os.path.join(work, 'outro.jpg')
    intro_card(hook, intro, st); outro_card(title, outro)
    ovs = []
    for i in range(4):
        p = os.path.join(work, f'ov{i}.png'); scene_overlay(labels[i], i + 1, 4, title, p); ovs.append(p)
    # kesme kaynakları: videolarda farklı anlar, fotoğraflarda sırayla
    vids = [s_ for s_ in srcs if s_[0] == 'video']; imgs = [s_ for s_ in srcs if s_[0] == 'image']
    picks = []
    for k in range(NCUT + 1):
        if imgs and (not vids or k % 2 == 1):
            picks.append((imgs[k % len(imgs)][1], 'image', 0.0))
        else:
            kind, path, dur = vids[k % len(vids)]
            span = max(0.1, dur - 1.2); ss = 0.2 + span * ((k * 7) % (NCUT + 1)) / (NCUT + 1)
            picks.append((path, 'video', ss))
    segs = []
    for i, (kind, _) in enumerate(plan):
        frames = fr[i + 1] - fr[i]; out = os.path.join(work, f's{i:02d}.mp4')
        if kind == 'intro': card_segment(intro, frames, out)
        elif kind == 'outro': card_segment(outro, frames, out, flash=True)
        elif kind == 'build':
            src, sk, ss = picks[0]; segment(src, sk, ss, frames, out, overlay=ovs[0], kb_dir=1)
        else:
            c = i - 2; src, sk, ss = picks[1 + c]
            segment(src, sk, ss, frames, out, overlay=ovs[min(3, c * 4 // NCUT)], punch=True, flash=(c == 0), kb_dir=1 if c % 2 else -1)
        segs.append(out)
    lst = os.path.join(work, 'list.txt')
    with open(lst, 'w') as f: f.write(''.join(f"file '{p}'\n" for p in segs))
    total = fr[-1] / FPS
    out_mp4 = os.path.join(out_dir, f"{item['id']}.mp4")
    args = [ffmpeg_bin(), '-hide_banner', '-loglevel', os.environ.get('FFLOG', 'error'), '-y', '-f', 'concat', '-safe', '0', '-i', lst]
    if music: args += ['-i', music, '-map', '0:v', '-map', '1:a', '-af', f'afade=t=out:st={total - 1.2:.2f}:d=1.2', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2']
    args += ['-c:v', 'copy', '-t', f'{total:.3f}', '-movflags', '+faststart', out_mp4]
    subprocess.run(args, check=True)
    Image.open(intro).convert('RGB').save(os.path.join(out_dir, f"{item['id']}.jpg"), quality=88)
    return out_mp4


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--queue', default='https://utngxnqlcayfjkknaysx.supabase.co/functions/v1/ops/reels/queue')
    ap.add_argument('--out', default='public/reels')
    ap.add_argument('--test', nargs='*')
    ap.add_argument('--photos', nargs='*')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    # Müzik havuzu: scripts/reels/music/ içindeki parçalar sırayla (her videoda farklı parça), yoksa varsayılan music.m4a
    mdir = os.path.join(HERE, 'music')
    tracks = sorted(os.path.join(mdir, f) for f in os.listdir(mdir) if f.lower().endswith(('.m4a', '.mp3', '.aac', '.wav'))) if os.path.isdir(mdir) else []
    if os.path.exists(os.path.join(HERE, 'music.m4a')): tracks.append(os.path.join(HERE, 'music.m4a'))
    if a.test or a.photos:
        items = [{'id': f'test{k}', 'video': a.test[0] if a.test else None, 'extras': (a.test or [])[1:], 'photos': a.photos or [], 'headline': h, 'style': k} for k, h in enumerate(['Eski Ev, Yeni Hayat', 'Çatınız Akıtıyorsa İzleyin'])]
    else:
        with urllib.request.urlopen(a.queue, timeout=60) as r:
            items = json.load(r).get('items', [])
    done = []
    for it in items:
        if not (a.test or a.photos) and os.path.exists(os.path.join(a.out, f"{it['id']}.mp4")):
            done.append(it['id']); continue
        with tempfile.TemporaryDirectory() as work:
            try:
                music = tracks[int(re.sub(r'[^0-9a-f]', '', it['id'])[:6] or '0', 16) % len(tracks)] if tracks else None
                render(it, work, a.out, music); done.append(it['id']); print('✓', it['id'], it.get('headline', ''))
            except Exception as e:
                print('✗', it['id'], e)
    with open(os.environ.get('REELS_SUMMARY') or os.path.join(tempfile.gettempdir(), 'reels-last-run.json'), 'w') as f:
        json.dump({'rendered': done}, f)


if __name__ == '__main__':
    main()
