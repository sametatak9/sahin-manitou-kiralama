"""EMBAY · Yeni teslim ev turu Reels — gerçek çekim videolarından (Ferhat klasörü 06.10).
Her klip 1080x1920'ye kırpılır, ince Montserrat alt yazı + logo rozeti eklenir, sonda teslim Reels'i ile aynı DM kapanışı.
Ana çıktı müziksiz (Instagram'da şarkı eklenir); önizleme kopyası kendi telifsiz müziğimizle.
Kaynak: scripts/media-sheets/list.json · Çıktı: public/reels/teslim/<slug>(-sessiz).mp4"""
import json, os, subprocess, sys, tempfile, urllib.request
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import teslim_reel as T  # noqa: E402  (ortak marka yardımcıları: font, logo rozeti, kapanış kartı)

W, H, FPS = T.W, T.H, T.FPS
TOURS = [{
    'slug': 'ev-turu-bahceli',
    'end_photo': 148, 'end_line': 'Siz de böyle bir eve', 'web': '@embayyapi',
    'music': 'house_120_7',
    # (havuz no, başlangıç sn, süre sn, alt yazı)
    'clips': [(150, 0.4, 3.6, 'Bahçesinden başlıyor'),
              (152, 0.0, 3.0, 'Dört mevsim kış bahçesi'),
              (151, 0.6, 4.0, 'Ferah ve aydınlık salon'),
              (153, 0.4, 3.6, 'Köşe şömine, sıcak bir yuva')],
    'end_s': 4.2, 'xf': 0.35,
}]


def probe(p):
    out = subprocess.run([T.ffmpeg(), '-i', p], capture_output=True, text=True).stderr
    for line in out.splitlines():
        if 'Duration:' in line:
            h, m, s = line.split('Duration:')[1].split(',')[0].strip().split(':')
            return int(h) * 3600 + int(m) * 60 + float(s)
    return 0.0


def caption_layer(text):
    """Alt üçte bir: yumuşak gölgeli ince beyaz yazı + üstte küçük marka satırı."""
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(sh); d = ImageDraw.Draw(lay)
    f = T.mont(66, 300); small = T.mont(28, 600)
    y = 1290
    for dd, fill in ((sd, (0, 0, 0, 170)), (d, (255, 255, 255, 255))):
        dd.text(((W - dd.textlength('EMBAY YAPI · YENİ TESLİM', font=small)) / 2, y - 56), 'EMBAY YAPI · YENİ TESLİM', font=small, fill=fill)
        dd.text(((W - dd.textlength(text, font=f)) / 2, y), text, font=f, fill=fill)
    sh = sh.filter(ImageFilter.GaussianBlur(10))
    sh.alpha_composite(lay)
    return sh


def clip_frames(path, ss, dur):
    """Videoyu dikey 1080x1920'ye ölçekleyip ortadan kırpar; kareleri numpy dizisi olarak döndürür."""
    cmd = [T.ffmpeg(), '-loglevel', 'error', '-ss', f'{ss:.2f}', '-t', f'{dur:.2f}', '-i', path,
           '-vf', f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},eq=contrast=1.04:saturation=1.08',
           '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)


def render(R, urls, tmp):
    T.REEL = {'end_line': R['end_line'], 'web': R['web'], 'title': ''}
    bub = T.logo_bubble()
    end = np.asarray(T.end_static(T.load(R['end_photo'], urls)), dtype=np.uint8)
    xf = int(R['xf'] * FPS)
    os.makedirs(T.OUT, exist_ok=True)
    silent = os.path.join(T.OUT, R['slug'] + '-sessiz.mp4')
    p = subprocess.Popen([T.ffmpeg(), '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-maxrate', '7M', '-bufsize', '14M', '-pix_fmt', 'yuv420p',
                          '-movflags', '+faststart', silent], stdin=subprocess.PIPE)
    state = {'count': 0, 'thumb': None}

    def emit(f):
        p.stdin.write(f.tobytes()); state['count'] += 1
        if state['count'] == FPS: state['thumb'] = f

    def scenes():
        for n, ss, dur, text in R['clips']:
            src = os.path.join(tmp, f'{n}.mov'); urllib.request.urlretrieve(urls[n], src)
            total = probe(src)
            dur = max(1.0, min(dur, total - ss - 0.05)) if total else dur
            cap = caption_layer(text); cap.alpha_composite(bub, (44, H - bub.height - 250))
            a = np.asarray(cap, dtype=np.float32) / 255.0
            alpha, rgb = a[..., 3:4], a[..., :3] * 255
            yield [(f.astype(np.float32) * (1 - alpha) + rgb * alpha).astype(np.uint8) for f in clip_frames(src, ss, dur)]
        yield [end] * int(R['end_s'] * FPS)

    tail = None   # önceki sahnenin son xf karesi (yumuşak geçiş için); bellekte yalnızca bir sahne tutulur
    for sc in scenes():
        for k, f in enumerate(sc):
            if tail is not None and k < xf:
                e = (k + 1) / (xf + 1); e = e * e * (3 - 2 * e)
                f = (tail[k].astype(np.float32) * (1 - e) + f.astype(np.float32) * e).astype(np.uint8)
            if k < len(sc) - xf: emit(f)
        tail = sc[-xf:]
    for f in tail: emit(f)
    p.stdin.close(); p.wait()
    total = state['count'] / FPS
    Image.fromarray(state['thumb']).save(os.path.join(T.OUT, R['slug'] + '.jpg'), quality=88)
    music = os.path.join(T.ROOT, 'scripts', 'reels', 'music', R['music'] + '.m4a')
    subprocess.run([T.ffmpeg(), '-y', '-loglevel', 'error', '-i', silent, '-i', music, '-filter_complex',
                    f'[1:a]atrim=0:{total:.2f},afade=t=in:d=0.6,afade=t=out:st={total - 1.5:.2f}:d=1.5,volume=0.8[a]',
                    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart',
                    '-t', f'{total:.2f}', os.path.join(T.OUT, R['slug'] + '.mp4')], check=True)
    print(f"{R['slug']}: {len(R['clips']) + 1} sahne, {total:.1f} sn")


def main():
    urls = {it['n']: it['url'] for it in json.load(open(os.path.join(T.ROOT, 'scripts', 'media-sheets', 'list.json')))}
    urls.update({int(k): v for k, v in json.loads(os.environ.get('LOCAL_URLS', '{}')).items()})   # yerel deneme için
    with tempfile.TemporaryDirectory() as tmp:
        for R in TOURS: render(R, urls, tmp)


if __name__ == '__main__':
    main()
