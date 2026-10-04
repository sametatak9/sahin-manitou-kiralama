#!/usr/bin/env python3
"""EMBAY · Marvel tarzı Reels kurgusu (GitHub Actions'ta çalışır).

Bir video grafikerin elle yaptığı kurguyu kare kare üretir:
  • Giriş: lacivert tonlu "flipbook" (sayfa çevirme gibi 2 karede bir kesme) → mavi kutuda EMBAY YAPI logosu çarpar (sarsıntı + flaş)
  • Sahneler: müziğin vuruşuna oturan kesmeler, her vuruşta zoom-punch, hızlanıp yavaşlayan çekim (speed ramp)
  • Geçişler: whip-pan (yatay hareket bulanıklığı), zoom-through, spin (dönerek savrulma), RGB glitch, beyaz flaş
  • Kinetik yazı: başlıklar vuruşta kayarak açılır (mavi vurgu kutusu), köşede altın Embay logosu
  • Renk: sinematik teal-orange + kontrast + vinyet, düşük çözünürlüklü kaynaklarda keskinleştirme
  • Ses: müzik + sentezlenmiş whoosh / impact / riser efektleri
  • Kapanış: logo çarpar → "Türkiye'nin 81 iline kurulum" → iki telefon → WhatsApp çağrısı

Kaynaklar: eski Instagram Reels'lerimiz (gerçek projeler); üstlerindeki eski yazı/logo şeritleri kırpılır.
Kullanım: python3 scripts/marvel/marvel.py --src scripts/marvel/src --out public/reels/marvel [--only 01-...]
"""
import argparse, json, math, os, subprocess, sys, tempfile, wave
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, 'scripts', 'reels'))
W, H, FPS = 1080, 1920, 30
# Embay kurumsal renkleri (brand_kits): mavi #1E3FA0, lacivert #262A6B, açık mavi #8FC6F2
RED, RED_D, GOLD, WHITE, NAVY = (30, 63, 160), (38, 42, 107), (143, 198, 242), (255, 255, 255), (38, 42, 107)
PHONES = '0536 784 62 22  ·  0531 436 29 04'
SR = 44100


def ffmpeg():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return 'ffmpeg'


def F(size, kind='display'):
    """Kurumsal Montserrat (başlık 700, alt yazı 500) → yoksa Anton / Bebas → DejaVu Bold."""
    from brandfont import montserrat
    m = montserrat(size, 700 if kind == 'display' else 500)
    if m: return m
    names = {'display': ['Anton-Regular.ttf', 'BebasNeue-Regular.ttf'], 'sub': ['Oswald-VF.ttf', 'BebasNeue-Regular.ttf']}[kind]
    for n in names + ['DejaVuSans-Bold.ttf']:
        for d in [os.path.join(HERE, 'fonts'), '/usr/share/fonts/truetype/dejavu']:
            p = os.path.join(d, n)
            if os.path.exists(p) and os.path.getsize(p) > 10000:
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def fit(text, size, maxw, kind='display'):
    """Yazı genişliği maxw'yi aşmayacak en büyük font"""
    d = ImageDraw.Draw(Image.new('RGBA', (10, 10)))
    while size > 24:
        f = F(size, kind)
        if d.textlength(text, font=f) <= maxw: return f
        size -= 4
    return F(size, kind)


def tr_up(s):
    return s.replace('i', 'İ').replace('ı', 'I').upper()


# ── Renk & doku ────────────────────────────────────────────────────────────
def build_lut():
    x = np.arange(256, dtype=np.float32) / 255.0
    s = x + 0.12 * np.sin(2 * np.pi * (x - 0.5)) * -1  # hafif S-eğrisi (kontrast)
    s = np.clip(0.5 + (s - 0.5) * 1.08, 0, 1)
    r = np.clip(s * 1.04 + 0.01, 0, 1)                  # sıcak ışıklar
    g = np.clip(s * 1.0, 0, 1)
    b = np.clip(s * 0.94 + 0.05 * (1 - x), 0, 1)        # teal gölgeler
    return np.stack([(r * 255), (g * 255), (b * 255)], -1).astype(np.uint8)


LUT = build_lut()
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
VIG = (1.0 - 0.38 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 1.6)) ** 2)).clip(0.55, 1.0)[..., None]


def grade(fr):
    out = np.empty_like(fr)
    for c in range(3):
        out[..., c] = cv2.LUT(fr[..., c], LUT[:, c])
    return (out.astype(np.float32) * VIG).astype(np.uint8)


def zoom(fr, z, cx=0.5, cy=0.5, rot=0.0, dx=0.0, dy=0.0):
    if abs(z - 1) < 1e-3 and not rot and not dx and not dy:
        return fr
    M = cv2.getRotationMatrix2D((W * cx, H * cy), rot, z)
    M[0, 2] += dx; M[1, 2] += dy
    return cv2.warpAffine(fr, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def hblur(fr, k):
    k = int(k)
    return fr if k < 3 else cv2.blur(fr, (k, 1))


def rgb_split(fr, s):
    s = int(s)
    if s < 1: return fr
    out = fr.copy()
    out[:, s:, 0] = fr[:, :-s, 0]; out[:, :-s, 2] = fr[:, s:, 2]
    return out


def glitch(fr, rng, amt):
    out = rgb_split(fr, 18 * amt)
    for _ in range(int(6 * amt)):
        y = rng.integers(0, H - 80); h = rng.integers(20, 120); sh = int(rng.integers(-90, 90) * amt)
        out[y:y + h] = np.roll(out[y:y + h], sh, axis=1)
    return out


def flash(fr, a):
    return fr if a <= 0 else cv2.addWeighted(fr, 1 - a, np.full_like(fr, 255), a, 0)


def red_tint(fr, a=0.85):
    g = cv2.cvtColor(fr, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255.0
    tint = np.stack([0.06 + 0.30 * g, 0.10 + 0.40 * g, 0.30 + 0.65 * g], -1) * 255  # lacivert-mavi ton
    return cv2.addWeighted(fr, 1 - a, tint.astype(np.uint8), a, 0)


# ── Kaynak okuma ───────────────────────────────────────────────────────────
def decode(path, ss, dur, crop):
    x0, y0, x1, y1 = crop
    vf = (f"crop=iw*{x1 - x0:.3f}:ih*{y1 - y0:.3f}:iw*{x0:.3f}:ih*{y0:.3f},"
          f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},"
          f"unsharp=7:7:1.1:5:5:0.0,fps={FPS}")
    p = subprocess.run([ffmpeg(), '-v', 'error', '-ss', f'{max(0, ss):.2f}', '-t', f'{dur:.2f}', '-i', path, '-vf', vf,
                        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True)
    buf = np.frombuffer(p.stdout, np.uint8)
    n = buf.size // (W * H * 3)
    if n == 0:
        raise RuntimeError(f'kare okunamadı: {path} @{ss}s {p.stderr[-300:]!r}')
    return list(buf[: n * W * H * 3].reshape(n, H, W, 3))


# ── Yazı katmanları (RGBA, bir kez çizilir) ────────────────────────────────
def text_block(lines, size=150, box=RED, sub=None):
    fs = F(46, 'sub')
    img = Image.new('RGBA', (W, 700), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    y = 20
    for i, ln in enumerate(lines):
        t = tr_up(ln); f = fit(t, size, W - 140); tw = d.textlength(t, font=f); bb = f.getbbox(t); th = bb[3] - bb[1]
        x = (W - tw) / 2
        if i == len(lines) - 1 and box:
            d.rectangle([x - 26, y + bb[1] - 14, x + tw + 26, y + bb[3] + 18], fill=box + (255,))
        d.text((x + 5, y + 5), t, font=f, fill=(0, 0, 0, 140))
        d.text((x, y), t, font=f, fill=WHITE + (255,))
        y += th + 42
    if sub:
        t = tr_up(sub); fs = fit(t, 46, W - 120, 'sub'); tw = d.textlength(t, font=fs)
        d.text(((W - tw) / 2, y + 8), t, font=fs, fill=GOLD + (255,))
        y += 70
    return np.array(img.crop((0, 0, W, y + 30)))


def lower_title(text):
    t = tr_up(text)
    f = fit(t, 96, W - 160)
    img = Image.new('RGBA', (W, 200), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    tw = d.textlength(t, font=f); bb = f.getbbox(t)
    x = 70
    d.rectangle([x - 22, 40, x - 10, 40 + bb[3] + 10], fill=RED + (255,))
    d.text((x + 4, 34), t, font=f, fill=(0, 0, 0, 150))
    d.text((x, 30), t, font=f, fill=WHITE + (255,))
    return np.array(img.crop((0, 0, int(min(W, x + tw + 40)), 200)))


def brand_pill(text):
    f = fit(text, 40, 600, 'sub'); tmp = ImageDraw.Draw(Image.new('RGBA', (10, 10))); tw = tmp.textlength(text, font=f)
    img = Image.new('RGBA', (int(tw + 64), 72), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, img.width - 1, 71], radius=36, fill=NAVY + (240,))
    d.text((32, 12), text, font=f, fill=WHITE + (255,))
    return np.array(img)


def darken_band(fr, y0, y1, a):
    if a <= 0: return fr
    m = np.zeros((H, 1, 1), np.float32); ys = np.arange(H)
    m[:, 0, 0] = np.clip(1 - np.abs(ys - (y0 + y1) / 2) / ((y1 - y0) / 2), 0, 1) ** 0.6
    return (fr.astype(np.float32) * (1 - a * m)).astype(np.uint8)


def corner_logo():
    try:
        from render import lux_logo
        img = Image.new('RGBA', (440, 150), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
        lux_logo(d, 12, 14, 84)
        return np.array(img)
    except Exception:
        img = Image.new('RGBA', (360, 110), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
        d.text((12, 20), 'EMBAY YAPI', font=F(60), fill=GOLD + (255,))
        return np.array(img)


def logo_box(scale=1.0):
    """Marvel tarzı mavi kutu: EMBAY | YAPI"""
    f = F(int(210 * scale)); t = 'EMBAY'
    tmp = ImageDraw.Draw(Image.new('RGBA', (10, 10)))
    tw = tmp.textlength(t, font=f); bb = f.getbbox(t)
    bw, bh = int(tw + 120 * scale), int(bb[3] - bb[1] + 90 * scale)
    img = Image.new('RGBA', (bw, bh + int(70 * scale)), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    d.rectangle([0, 0, bw, bh], fill=RED + (255,))
    d.text(((bw - tw) / 2, (bh - (bb[3] - bb[1])) / 2 - bb[1]), t, font=f, fill=WHITE + (255,))
    fs = F(int(64 * scale), 'sub'); s = 'Y   A   P   I'
    sw = d.textlength(s, font=fs)
    d.text(((bw - sw) / 2, bh + int(6 * scale)), s, font=fs, fill=WHITE + (255,))
    return np.array(img)


def over(fr, rgba, x, y, alpha=1.0, scale=1.0):
    if alpha <= 0: return fr
    if abs(scale - 1) > 1e-3:
        rgba = cv2.resize(rgba, (max(1, int(rgba.shape[1] * scale)), max(1, int(rgba.shape[0] * scale))), interpolation=cv2.INTER_LINEAR)
    h, w = rgba.shape[:2]; x, y = int(x), int(y)
    x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0: return fr
    sub = rgba[y0 - y:y1 - y, x0 - x:x1 - x]
    a = (sub[..., 3:4].astype(np.float32) / 255.0) * alpha
    reg = fr[y0:y1, x0:x1].astype(np.float32)
    fr[y0:y1, x0:x1] = (reg * (1 - a) + sub[..., :3].astype(np.float32) * a).astype(np.uint8)
    return fr


def ease_out(p): return 1 - (1 - p) ** 3
def ease_io(p): return 3 * p * p - 2 * p * p * p


# ── Ses ────────────────────────────────────────────────────────────────────
def load_audio(path, dur):
    p = subprocess.run([ffmpeg(), '-v', 'error', '-i', path, '-t', f'{dur:.3f}', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True)
    a = np.frombuffer(p.stdout, np.float32).reshape(-1, 2).copy()
    n = int(dur * SR)
    if len(a) < n: a = np.concatenate([a, np.zeros((n - len(a), 2), np.float32)])
    return a[:n]


def sfx_whoosh(d=0.32, up=True):
    n = int(d * SR); t = np.linspace(0, 1, n)
    noise = np.random.default_rng(1).standard_normal(n).astype(np.float32)
    k = np.exp(-((t - (0.65 if up else 0.35)) ** 2) / 0.04)
    # sweep: kayan band (basit: iki farklı yumuşatmanın farkı)
    lo = np.convolve(noise, np.ones(12) / 12, 'same'); hi = noise - np.convolve(noise, np.ones(3) / 3, 'same')
    sig = (lo * (1 - t) + hi * t if up else lo * t + hi * (1 - t)) * k
    return (sig / (np.abs(sig).max() + 1e-6) * 0.55).astype(np.float32)


def sfx_impact(d=0.9):
    n = int(d * SR); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (55 + 40 * np.exp(-t * 12)) * t) * np.exp(-t * 4.5)
    click = np.random.default_rng(2).standard_normal(n) * np.exp(-t * 60) * 0.5
    return ((boom + click) * 0.8).astype(np.float32)


def sfx_riser(d):
    n = int(d * SR); t = np.linspace(0, 1, n)
    noise = np.random.default_rng(3).standard_normal(n)
    sig = (noise - np.convolve(noise, np.ones(4) / 4, 'same')) * (t ** 2.2) * 0.35
    return sig.astype(np.float32)


def mix_at(track, sig, at, gain=1.0):
    i = int(at * SR)
    if i >= len(track): return
    j = min(len(track), i + len(sig))
    track[i:j] += (sig[: j - i] * gain)[:, None]


# ── Kurgu ──────────────────────────────────────────────────────────────────
class Writer:
    def __init__(self, path):
        self.p = subprocess.Popen([ffmpeg(), '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                                   '-c:v', 'libx264', '-preset', os.environ.get('X264_PRESET', 'medium'), '-crf', '19', '-pix_fmt', 'yuv420p', path], stdin=subprocess.PIPE)
        self.n = 0
    def put(self, fr):
        self.p.stdin.write(np.ascontiguousarray(fr).tobytes()); self.n += 1
    def close(self):
        self.p.stdin.close(); self.p.wait()


TRANS = ['whip', 'zoom', 'glitch', 'spin', 'whip', 'flash', 'zoom', 'whip', 'glitch', 'spin']


def transition(kind, A, B, rng):
    """A: önceki sahnenin son kareleri, B: yeni sahnenin ilk kareleri (aynı uzunluk) → geçiş kareleri"""
    T = len(A); out = []
    for k in range(T):
        p = (k + 1) / (T + 1)
        if kind == 'whip':
            off = ease_io(p) * W
            a = hblur(zoom(A[k], 1.0, dx=-off), 90 * math.sin(math.pi * p))
            b = hblur(zoom(B[k], 1.0, dx=W - off), 90 * math.sin(math.pi * p))
            fr = np.where((np.arange(W) < W - off)[None, :, None], a, b)
        elif kind == 'zoom':
            if p < 0.5:
                q = p / 0.5; fr = zoom(A[k], 1 + 0.9 * q ** 2); fr = cv2.GaussianBlur(fr, (0, 0), 1 + 14 * q); fr = flash(fr, 0.6 * q)
            else:
                q = (p - 0.5) / 0.5; fr = zoom(B[k], 1.5 - 0.5 * ease_out(q)); fr = cv2.GaussianBlur(fr, (0, 0), 1 + 12 * (1 - q)); fr = flash(fr, 0.6 * (1 - q))
        elif kind == 'spin':
            if p < 0.5:
                q = p / 0.5; fr = zoom(A[k], 1 + 0.4 * q, rot=-35 * q ** 2); fr = cv2.GaussianBlur(fr, (0, 0), 1 + 10 * q)
            else:
                q = (p - 0.5) / 0.5; fr = zoom(B[k], 1.4 - 0.4 * ease_out(q), rot=35 * (1 - q) ** 2); fr = cv2.GaussianBlur(fr, (0, 0), 1 + 10 * (1 - q))
        elif kind == 'glitch':
            src = A[k] if k < T // 2 else B[k]
            fr = glitch(src, rng, 1.0 - abs(2 * p - 1) * 0.5)
        elif kind == 'dissolve':  # yumuşak çapraz geçiş (mimari vitrin)
            e = ease_io(p); fr = cv2.addWeighted(A[k], 1 - e, B[k], e, 0)
        elif kind == 'wipe':  # önce/sonra perdesi: açık mavi çizgi soldan sağa süpürür
            off = int(ease_io(p) * W)
            fr = np.where((np.arange(W) < off)[None, :, None], B[k], A[k]).copy()
            cv2.rectangle(fr, (max(0, off - 7), 0), (min(W - 1, off + 7), H), GOLD, -1)
        else:  # flash
            fr = flash(A[k] if p < 0.5 else B[k], 1 - abs(2 * p - 1))
        out.append(fr)
    return out


# Tempo: 'hizli' = ilk kurgular; 'orta' = daha sakin (geçiş 0,4 sn, sahne ~1,5 kat uzun, yumuşak zoom/sarsıntı)
PACE = {'hizli': {'T': 6, 'scale': 1.0, 'punch': 0.09, 'shake': 12}, 'orta': {'T': 12, 'scale': 1.5, 'punch': 0.045, 'shake': 5},
        # 'sakin' = mimari vitrin (A-frame tarzı): yumuşak çapraz geçiş, uzun sahne, vuruş zıplaması/sarsıntı yok, yavaş itme
        'sakin': {'T': 18, 'scale': 2.0, 'punch': 0.0, 'shake': 0}}


def src_size(path):
    """Kaynağın gerçek (döndürülmüş) boyutu → (kısa kenar, uzun kenar)"""
    try:
        out = subprocess.run([ffmpeg(), '-hide_banner', '-i', path], capture_output=True, text=True).stderr
        import re
        m = re.search(r'Video:.*?(\d{3,5})x(\d{3,5})', out)
        if not m: return (0, 0)
        w, h = int(m.group(1)), int(m.group(2))
        return (min(w, h), max(w, h))
    except Exception:
        return (0, 0)


def sharp_start(path, ss, need, crop, span=1.5):
    """Netlik süzgeci: ss'nin ±span saniyesinde, 'need' saniyelik pencere için en net başlangıcı seçer (Laplace varyansı)."""
    a = max(0.0, ss - span); dur = need + 2 * span
    x0, y0, x1, y1 = crop
    vf = f"crop=iw*{x1 - x0:.3f}:ih*{y1 - y0:.3f}:iw*{x0:.3f}:ih*{y0:.3f},scale=270:480,fps=6"
    p = subprocess.run([ffmpeg(), '-v', 'error', '-ss', f'{a:.2f}', '-t', f'{dur:.2f}', '-i', path, '-vf', vf, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True)
    buf = np.frombuffer(p.stdout, np.uint8)
    fs = 270 * 480
    if buf.size < fs: return ss, 0.0
    scores = [float(cv2.Laplacian(buf[i * fs:(i + 1) * fs].reshape(480, 270), cv2.CV_64F).var()) for i in range(buf.size // fs)]
    win = max(1, int(round(need * 6)))
    best, best_t = -1.0, ss
    for i in range(0, max(1, len(scores) - win + 1)):
        m = float(np.mean(scores[i:i + win]))
        if m > best: best, best_t = m, a + i / 6
    return round(best_t, 2), round(best, 1)


def render_reel(cfg, crops, src_dir, out_dir, music_dir):
    pace = PACE.get(cfg.get('pace', 'hizli'), PACE['hizli'])
    cfg = {**cfg, 'shots': [[s[0], s[1], s[2] * pace['scale'], *s[3:]] for s in cfg['shots']]}
    slug = cfg['slug']; bpm = int(cfg['music'].split('_')[1]); beat = 60.0 / bpm
    bf = beat * FPS  # vuruş başına kare
    rng = np.random.default_rng(abs(hash(slug)) % (2 ** 32))
    hook_intro = cfg.get('intro') == 'hook'          # Drive tarzı: logo girişi yok, başlık ilk karede görüntünün üstünde
    card = os.path.join(ROOT, cfg['outro_card']) if cfg.get('outro_card') else None
    trans_list = cfg.get('trans') or TRANS
    intro_beats, outro_beats = (0 if hook_intro else 4), (0 if card else 8)
    total_beats = intro_beats + sum(s[2] for s in cfg['shots']) + outro_beats
    card_frames = decode(card, 0, 30, [0, 0, 1, 1]) if card else []
    total_frames = int(round(total_beats * bf)) + len(card_frames)
    dur = total_frames / FPS
    tmpd = tempfile.mkdtemp()
    vpath = os.path.join(tmpd, 'v.mp4'); apath = os.path.join(tmpd, 'a.wav')
    wr = Writer(vpath)
    LOGO = corner_logo(); BOX = logo_box(1.0)
    sfx = []  # (zaman, tür)

    # Sahne kaynaklarını önceden kes
    shots = []
    for i, s in enumerate(cfg['shots']):
        n_src, ss, beats = s[0], s[1], s[2]
        title = s[3] if len(s) > 3 and s[3] else None; ramp = len(s) > 4 and s[4] == 'ramp'
        nf = int(round(beats * bf))
        need = nf / FPS * (1.6 if ramp else 1.0) + 0.2
        path = os.path.join(src_dir, f'{n_src}.mp4'); crop = crops.get(str(n_src), [0, 0, 1, 1])
        if cfg.get('sharp'):
            short, _ = src_size(path)
            if short and short < cfg.get('min_short', 700):
                print(f'  ⚠ #{n_src} düşük çözünürlük ({short}px) — mimari Reels’e alınmadı', flush=True); continue
            ss, sc = sharp_start(path, ss, need, crop)
            print(f'  · #{n_src} en net başlangıç {ss}s (netlik {sc})', flush=True)
        frames = decode(path, ss, need, crop)
        shots.append({'frames': frames, 'nf': nf, 'title': title, 'ramp': ramp, 'beats': beats})

    # Atlanan (düşük çözünürlüklü) sahne olduysa toplam süre yeniden hesaplanır (müzik/video uyumu)
    total_frames = int(round((intro_beats + sum(sh['beats'] for sh in shots) + outro_beats) * bf)) + len(card_frames)
    dur = total_frames / FPS
    t_frame = 0
    # ── GİRİŞ: lacivert flipbook (1,5 vuruş) → logo çarpar (2,5 vuruş)
    flip_n = 0 if hook_intro else int(round(1.5 * bf)); slam_n = 0 if hook_intro else int(round(intro_beats * bf)) - flip_n
    stills = [grade(sh['frames'][min(len(sh['frames']) - 1, len(sh['frames']) // 2)]) for sh in shots]
    if flip_n: sfx.append((0.0, 'riser', flip_n / FPS))
    for k in range(flip_n):
        st = stills[(k // 2) % len(stills)]
        side = 1 if (k // 2) % 2 == 0 else -1
        q = (k % 2) / 2
        fr = zoom(red_tint(st, 0.8), 1.15 - 0.05 * q, dx=side * 140 * (1 - q))
        fr = hblur(fr, 40 * (1 - q))
        wr.put(fr)
    if not hook_intro: sfx.append((flip_n / FPS, 'impact', 0))
    hook = text_block(cfg['hook'], 128, None, cfg.get('sub'))
    PILL = brand_pill('EMBAY YAPI')
    hook_n = int(round(min(3.0, shots[0]['beats'] + (shots[1]['beats'] if len(shots) > 1 else 0)) * bf)) if hook_intro else 0
    bg = cv2.GaussianBlur(red_tint(stills[0], 0.9), (0, 0), 6)
    for k in range(slam_n):
        p = k / max(1, slam_n - 1)
        sc = 1.35 - 0.35 * ease_out(min(1, k / 6))
        sh = (rng.integers(-1, 2, 2) * 18 * max(0, 1 - k / 8)) if k < 8 else (0, 0)
        fr = zoom(bg, 1.05 + 0.04 * p, dx=sh[0], dy=sh[1])
        fr = (fr.astype(np.float32) * 0.55).astype(np.uint8)
        bw, bh = BOX.shape[1] * sc, BOX.shape[0] * sc
        over(fr, BOX, (W - bw) / 2 + sh[0], 470 + sh[1] - (bh - BOX.shape[0]) / 2, 1.0, sc)
        if k >= 4:
            q = ease_out(min(1, (k - 4) / 6))
            over(fr, hook, 0, 980 + 60 * (1 - q), q)
        fr = flash(fr, max(0, 0.9 - k * 0.3))
        wr.put(fr)
    t_frame = flip_n + slam_n

    # ── SAHNELER
    T = pace['T']  # geçiş kare sayısı (yarısı önceki sahneden, yarısı yenisinden)
    tail = None; prev_last = None
    for i, sh in enumerate(shots):
        src = sh['frames']; nf = sh['nf']; L = len(src)
        title = lower_title(sh['title']) if sh['title'] else None
        out_frames = []
        for k in range(nf):
            u = k / max(1, nf - 1)
            if sh['ramp']:
                f = u + 0.55 * math.sin(2 * math.pi * u) / (2 * math.pi)   # hızlı-yavaş-hızlı
                idx = int(f * (L - 1))
            else:  # kaynak kısa ise donmak yerine hafif ağır çekimle yayılır
                idx = int(k * (L - 1) / max(1, nf - 1)) if L < nf else min(L - 1, k)
            fr = grade(src[idx])
            kb = k % bf
            z = 1.03 + 0.06 * u + pace['punch'] * math.exp(-kb / 2.6)   # her vuruşta zoom-punch
            shake = (0, 0)
            if k < 6 and i % 3 == 0:
                shake = tuple(rng.integers(-1, 2, 2) * pace['shake'] * (1 - k / 6))
            fr = zoom(fr, z, dx=shake[0], dy=shake[1])
            if title is not None:
                a_in = ease_out(min(1, max(0, (k - 3) / 7)))
                a_out = 1 - max(0, (k - (nf - 8)) / 6)
                a = max(0, min(a_in, a_out))
                if a > 0:
                    over(fr, title, -260 * (1 - a_in), 1500, a)
            over(fr, LOGO, 26, 40, 0.92)
            if hook_intro and t_frame + k < hook_n:  # açılış başlığı: ilk 2-3 vuruş görüntünün üstünde
                g = t_frame + k; q = ease_out(min(1, g / 5)); a = q * (1 - max(0, (g - (hook_n - 6)) / 6))
                fr = darken_band(fr, 380, 1180, 0.45 * a)
                over(fr, PILL, (W - PILL.shape[1]) / 2, 470, a)
                over(fr, hook, 0, 600 + 40 * (1 - q), a)
            out_frames.append(fr)
        if tail is not None:
            h = T // 2
            kind = trans_list[(i - 1) % len(trans_list)]
            if kind in ('whip', 'spin', 'zoom'): sfx.append(((t_frame - h) / FPS, 'whoosh', 0))
            else: sfx.append(((t_frame - h) / FPS, 'hit', 0))
            # kesim noktası tam vuruşta: önceki sahnenin son h karesi + yeni sahnenin ilk h karesi = 2h geçiş karesi
            A = tail + [tail[-1]] * h
            B = [out_frames[0]] * h + out_frames[:h]
            for fr in transition(kind, A, B, rng):
                wr.put(fr)
            body = out_frames[h:]
        else:
            # ilk sahne: girişten flaşla açılır
            body = out_frames
            for j in range(min(5, len(body))):
                body[j] = flash(body[j], 0.8 * (1 - j / 5))
            sfx.append((t_frame / FPS, 'impact', 0))
        h = T // 2
        if i < len(shots) - 1:
            for fr in body[:-h]: wr.put(fr)
            tail = body[-h:]
        else:
            for fr in body: wr.put(fr)
            prev_last = body[-1]
        t_frame += nf

    if card:  # ── KAPANIŞ: kurumsal lacivert kart (public/reels/kit) — son sahneden flaşla geçiş
        sfx.append((wr.n / FPS, 'impact', 0))
        for j, fr in enumerate(card_frames):
            wr.put(flash(fr, max(0, 0.7 - j * 0.15)))
    out_n = 0 if card else total_frames - wr.n
    # ── KAPANIŞ: logo + 81 il + telefonlar + WhatsApp
    bg = cv2.GaussianBlur(prev_last, (0, 0), 14)
    bg = (bg.astype(np.float32) * 0.35).astype(np.uint8)
    dur = total_frames / FPS
    l1 = text_block(["TÜRKİYE'NİN", '81 İLİNE KURULUM'], 110, RED)
    f_ph = fit(PHONES, 70, W - 100, 'sub'); ph = Image.new('RGBA', (W, 120), (0, 0, 0, 0)); d = ImageDraw.Draw(ph)
    tw = d.textlength(PHONES, font=f_ph); d.text(((W - tw) / 2, 20), PHONES, font=f_ph, fill=WHITE + (255,)); ph = np.array(ph)
    cta = Image.new('RGBA', (W, 140), (0, 0, 0, 0)); d = ImageDraw.Draw(cta)
    t = 'FİYAT İÇİN WHATSAPP · DM'; f_c = fit(t, 64, W - 200); tw = d.textlength(t, font=f_c)
    d.rounded_rectangle([(W - tw) / 2 - 40, 20, (W + tw) / 2 + 40, 120], radius=50, fill=(37, 211, 102, 255))
    d.text(((W - tw) / 2, 30), t, font=f_c, fill=WHITE + (255,)); cta = np.array(cta)
    sfx.append((wr.n / FPS, 'impact', 0))
    for k in range(out_n):
        fr = bg.copy()
        sc = 1.3 - 0.3 * ease_out(min(1, k / 6))
        shk = (rng.integers(-1, 2, 2) * 14 * max(0, 1 - k / 7)) if k < 7 else (0, 0)
        over(fr, BOX, (W - BOX.shape[1] * sc) / 2 + shk[0], 300 + shk[1], 1.0, sc)
        b2 = int(1.5 * bf)
        if k >= b2:
            q = ease_out(min(1, (k - b2) / 7)); over(fr, l1, 0, 820 + 50 * (1 - q), q)
        b3 = int(3 * bf)
        if k >= b3:
            q = ease_out(min(1, (k - b3) / 6)); over(fr, ph, 0, 1230 + 40 * (1 - q), q)
        b4 = int(4.5 * bf)
        if k >= b4:
            q = ease_out(min(1, (k - b4) / 6)); pulse = 1 + 0.04 * math.sin((k - b4) / bf * 2 * math.pi)
            over(fr, cta, 0, 1400, q, 1.0)
        fr = flash(fr, max(0, 0.8 - k * 0.25))
        if k > out_n - 8: fr = (fr.astype(np.float32) * ((out_n - k) / 8)).astype(np.uint8)
        wr.put(fr)
    wr.close()

    # ── SES
    music = os.path.join(music_dir, cfg['music'] + '.m4a')
    a = load_audio(music, dur)
    fade = int(1.2 * SR); a[-fade:] *= np.linspace(1, 0, fade)[:, None]
    a *= 0.85
    for at, kind, extra in sfx:
        if kind == 'whoosh': mix_at(a, sfx_whoosh(), max(0, at - 0.16), 0.55)
        elif kind == 'hit': mix_at(a, sfx_impact(0.4), at, 0.35)
        elif kind == 'impact': mix_at(a, sfx_impact(), at, 0.7)
        elif kind == 'riser': mix_at(a, sfx_riser(extra), at, 0.6)
    a = np.clip(a / max(1.0, np.abs(a).max() / 0.98), -1, 1)
    with wave.open(apath, 'wb') as wv:
        wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR); wv.writeframes((a * 32767).astype(np.int16).tobytes())
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, f'{slug}.mp4')
    subprocess.run([ffmpeg(), '-v', 'error', '-y', '-i', vpath, '-i', apath, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], check=True)
    # kapak: logo slam karesi
    cover_at = (min(hook_n - 8, 24) if hook_intro else int(1.5 * bf) + 8) / FPS
    subprocess.run([ffmpeg(), '-v', 'error', '-y', '-ss', f'{cover_at:.2f}', '-i', out, '-frames:v', '1', '-q:v', '3', os.path.join(out_dir, f'{slug}.jpg')], check=True)
    return {'slug': slug, 'dur': round(dur, 2), 'frames': wr.n}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default=os.path.join(HERE, 'src'))
    ap.add_argument('--out', default=os.path.join(ROOT, 'public', 'reels', 'marvel'))
    ap.add_argument('--music', default=os.path.join(ROOT, 'scripts', 'reels', 'music'))
    ap.add_argument('--only', default='')
    ap.add_argument('--config', default='reels.json')
    a = ap.parse_args()
    cfg = json.load(open(os.path.join(HERE, a.config)))
    res = []
    for r in cfg['reels']:
        if a.only and not r['slug'].startswith(a.only): continue
        print('▶', r['slug'], flush=True)
        res.append(render_reel(r, cfg['crop'], a.src, a.out, a.music))
        print('  ✓', res[-1], flush=True)
    idx_p = os.path.join(a.out, 'index.json')  # mevcut kayıtlar korunur, yalnızca üretilenler güncellenir
    old = json.load(open(idx_p)) if os.path.exists(idx_p) else []
    done = {r['slug'] for r in res}
    merged = sorted([r for r in old if r.get('slug') not in done] + res, key=lambda r: r['slug'])
    json.dump(merged, open(idx_p, 'w'), indent=1)


if __name__ == '__main__':
    main()
