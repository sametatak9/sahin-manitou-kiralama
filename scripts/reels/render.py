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


# ── Kartlar ─────────────────────────────────────────────────────────────────
def intro_card(hook, path, st=None):
    st = st or STYLES[0]
    img = grid(gradient(W, H)); d = ImageDraw.Draw(img)
    pill(d, W / 2, 600, st['pill'], font(True, 38), SKY, INK)
    f = font(True, 96); lines = wrap(d, tr_upper(hook), f, W - 150)[:4]
    y = 760
    for l in lines: center(d, y, l, f, (255, 255, 255)); y += 124
    d.rectangle([W / 2 - 110, y + 18, W / 2 + 110, y + 30], fill=SKY)
    center(d, y + 90, st['sub'], font(False, 42), SKYL)
    footer(d); img.convert('RGB').save(path, quality=95)


def footer(d):
    d.rectangle([0, H - 150, W, H], fill=(27, 31, 82, 235)); d.rectangle([0, H - 150, W, H - 146], fill=SKY)
    d.text((60, H - 112), HANDLE, font=font(True, 50), fill=(255, 255, 255))
    f = font(False, 36); d.text((W - 60 - d.textlength(WEB, font=f), H - 104), WEB, font=f, fill=(201, 219, 245))


def scene_overlay(label, idx, total, title, path):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    # üst koyulaştırma + marka şeridi
    for y in range(0, 420):
        d.line([(0, y), (W, y)], fill=(27, 31, 82, int(200 * (1 - y / 420))))
    logo(d, 118, 176, 1.5, text=False)
    d.text((215, 92), 'EMBAY YAPI', font=font(True, 44), fill=(255, 255, 255))
    d.text((215, 150), title, font=font(False, 34), fill=SKYL)
    # adım etiketi
    pill(d, W / 2, H - 330, f'{idx} · {label}', font(True, 62), SKY, INK)
    for j in range(total):
        x0 = W / 2 - (total * 100) / 2 + j * 100
        d.rectangle([x0 + 5, H - 232, x0 + 95, H - 222], fill=SKY if j < idx else (255, 255, 255, 90))
    footer(d); img.save(path)


def outro_card(title, path):
    img = grid(gradient(W, H)); d = ImageDraw.Draw(img)
    d.ellipse([W / 2 - 210, 420, W / 2 + 210, 840], fill=NAVY, outline=(255, 255, 255), width=8)
    logo(d, W / 2, 640, 3.4)
    center(d, 950, title, font(True, 58), (255, 255, 255))
    center(d, 1030, 'tek muhatap', font(True, 58), SKY)
    pill(d, W / 2, 1250, f'☎ {PHONE}', font(True, 66), SKY, INK, padx=60, h=170)
    center(d, 1420, 'Ev · villa · bina · tadilat · tamirat', font(False, 42), SKYL)
    center(d, 1490, 'İşimiz güvencenizdir.', font(True, 44), (255, 255, 255))
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


def render(item, work, out_dir, music):
    tkey = template_for(f"{item.get('headline', '')} {item.get('pillar', '')} {item.get('caption', '')}")
    labels, title = TEMPLATES[tkey]
    st = STYLES[int(item.get('style', 0)) % len(STYLES)]
    hook = (item.get('headline') or 'İnşaata dair tüm işleriniz').strip()[:80]
    main_p = os.path.join(work, 'main.mp4')
    u = item['video']
    if u.startswith('http'): urllib.request.urlretrieve(u, main_p)
    else: shutil.copy(u, main_p)
    durs = [3.4, 3.0, 3.0, 3.2]
    T = 0.45  # geçiş süresi
    main_d = probe_duration(main_p)
    # Sahneler: kendi videosunun farklı bölümlerinden (aynı görüntü başka gönderide tekrar edilmez); video çok kısaysa havuzdan yedek
    clips = []
    if main_d >= 9:
        span = max(0.1, main_d - durs[-1] - 0.6)
        clips = [(main_p, round(0.4 + span * k / 3, 2)) for k in range(4)]
    else:
        clips = [(main_p, 0.3)]
        for n, eu in enumerate([x for x in item.get('extras', []) if x != u][:3]):
            p = os.path.join(work, f'x{n}.mp4')
            try: urllib.request.urlretrieve(eu, p); clips.append((p, 0.8))
            except Exception as e: print('indirilemedi', eu, e)
        while len(clips) < 4: clips.append((main_p, round(0.3 + len(clips) * 1.1, 2)))
    intro, outro = os.path.join(work, 'intro.jpg'), os.path.join(work, 'outro.jpg')
    intro_card(hook, intro, st); outro_card(title, outro)
    ovs = []
    for i in range(4):
        p = os.path.join(work, f'ov{i}.png'); scene_overlay(labels[i], i + 1, 4, title, p); ovs.append(p)
    INTRO, OUTRO = 2.4, 3.4
    seg = [INTRO] + durs + [OUTRO]
    total = sum(seg) - T * 5
    args = [ffmpeg_bin(), '-hide_banner', '-loglevel', os.environ.get('FFLOG', 'error'), '-y', '-loop', '1', '-t', str(INTRO), '-i', intro]
    for i, (cp, ss) in enumerate(clips): args += ['-stream_loop', '-1', '-ss', str(ss), '-t', str(durs[i] + 0.5), '-i', cp]
    for p in ovs: args += ['-loop', '1', '-t', '4', '-i', p]
    args += ['-loop', '1', '-t', str(OUTRO), '-i', outro]
    moff = (int(item['id'][:4], 16) % 40) if re.match(r'^[0-9a-f]{4}', item.get('id', '')) else 0
    if music: args += ['-stream_loop', '-1', '-ss', str(moff), '-i', music]
    Z = 1.12  # hafif yakınlaşma + kaydırma (Ken Burns) → durağan olmayan, akıcı görüntü
    zw, zh = int(W * Z) // 2 * 2, int(H * Z) // 2 * 2
    fc = [f'[0:v]scale={zw}:{zh},crop={W}:{H}:x=\'(iw-ow)/2\':y=\'(ih-oh)*(1-t/{INTRO})/2\',fps={FPS},setsar=1,format=yuv420p,settb=AVTB[v0]']
    for i in range(4):
        d = durs[i]; dirx = '(iw-ow)*t/' + str(d) if i % 2 == 0 else '(iw-ow)*(1-t/' + str(d) + ')'
        fc.append(f'[{1 + i}:v]scale={zw}:{zh}:force_original_aspect_ratio=increase,crop={zw}:{zh},crop={W}:{H}:x=\'{dirx}\':y=\'(ih-oh)/2\','
                  f'fps={FPS},setsar=1,eq=saturation=1.1:contrast=1.05,trim=duration={d},setpts=PTS-STARTPTS[b{i}]')
        fc.append(f'[{5 + i}:v]format=rgba,trim=duration={d}[o{i}]')
        fc.append(f'[b{i}][o{i}]overlay=0:0:format=auto:shortest=1,fps={FPS},format=yuv420p,settb=AVTB[v{1 + i}]')
    fc.append(f'[9:v]scale={W}:{H},fps={FPS},setsar=1,format=yuv420p,settb=AVTB[v5]')
    prev, acc = 'v0', seg[0]
    for k in range(1, 6):
        out = 'v' if k == 5 else f'x{k}'
        fc.append(f'[{prev}][v{k}]xfade=transition={st["tr"][k - 1]}:duration={T}:offset={acc - T:.3f}[{out}]')
        acc = acc - T + seg[k]; prev = out
    maps = ['-map', '[v]']
    if music:
        fc.append(f'[10:a]atrim=duration={total},asetpts=PTS-STARTPTS,afade=t=in:d=0.5,afade=t=out:st={total - 1.4}:d=1.4,volume=0.9[a]')
        maps += ['-map', '[a]']
    out_mp4 = os.path.join(out_dir, f"{item['id']}.mp4")
    args += ['-filter_complex', ';'.join(fc), *maps, '-t', f'{total:.2f}', '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'veryfast',
             '-crf', '21', '-maxrate', '8M', '-bufsize', '16M', '-pix_fmt', 'yuv420p', '-r', str(FPS)]
    if music: args += ['-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2']
    args += ['-movflags', '+faststart', out_mp4]
    subprocess.run(args, check=True)
    Image.open(intro).convert('RGB').save(os.path.join(out_dir, f"{item['id']}.jpg"), quality=88)
    return out_mp4


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--queue', default='https://utngxnqlcayfjkknaysx.supabase.co/functions/v1/ops/reels/queue')
    ap.add_argument('--out', default='public/reels')
    ap.add_argument('--test', nargs='*')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    music = os.path.join(HERE, 'music.m4a'); music = music if os.path.exists(music) else None
    if a.test:
        items = [{'id': f'test{k}', 'video': a.test[0], 'extras': a.test[1:], 'headline': h, 'style': k} for k, h in enumerate(['Eski Ev, Yeni Hayat', 'Çatınız Akıtıyorsa İzleyin'])]
    else:
        with urllib.request.urlopen(a.queue, timeout=60) as r:
            items = json.load(r).get('items', [])
    done = []
    for it in items:
        if not a.test and os.path.exists(os.path.join(a.out, f"{it['id']}.mp4")):
            done.append(it['id']); continue
        with tempfile.TemporaryDirectory() as work:
            try:
                render(it, work, a.out, music); done.append(it['id']); print('✓', it['id'], it.get('headline', ''))
            except Exception as e:
                print('✗', it['id'], e)
    with open(os.environ.get('REELS_SUMMARY') or os.path.join(tempfile.gettempdir(), 'reels-last-run.json'), 'w') as f:
        json.dump({'rendered': done}, f)


if __name__ == '__main__':
    main()
