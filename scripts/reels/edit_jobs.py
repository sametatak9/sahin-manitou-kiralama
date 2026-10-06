"""EMBAY · Panel video düzenleyici render'ı (GitHub Actions).
Kuyruk: GET /ops/video-edits/queue → işler (yalnızca herkese açık medya adresleri + metinler).
- montage: seçilen video/fotoğraf klipleri sırayla, kırpılmış; her klipte ince alt yazı, ilk saniyede merak cümlesi,
  sabitleme + netleştirme + sıcak ton (isteğe bağlı), sonda Embay DM kapanış kartı, ritme oturan geçişler.
- fix: mevcut videoda baştan/sondan kırpma, istenmeyen aralıkları kesme, sesi kapatma, isteğe bağlı kapanış kartı ve müzik.
Çıktı: public/reels/edits/<id>.mp4 (+ .jpg kapak, public/reels/qc/edits/<id>.mp4.json kalite raporu)
Özet: $EDITS_SUMMARY → {"rendered": [...], "failed": [{"id":..,"error":..}]}"""
import io, json, os, subprocess, sys, tempfile, traceback, urllib.request
import numpy as np
from PIL import Image, ImageOps

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import teslim_reel as T  # noqa: E402
import video_tour as V  # noqa: E402
import reelkit  # noqa: E402

W, H, FPS = T.W, T.H, T.FPS
OUT = os.path.join(T.ROOT, 'public', 'reels', 'edits')
QUEUE = os.environ.get('EDITS_QUEUE', 'https://utngxnqlcayfjkknaysx.supabase.co/functions/v1/ops/video-edits/queue')


def fetch(url, path):
    req = urllib.request.Request(url, headers={'User-Agent': 'embay-editor'})
    with urllib.request.urlopen(req, timeout=180) as r, open(path, 'wb') as f: f.write(r.read())
    return path


def load_img(url):
    with urllib.request.urlopen(url, timeout=90) as r:
        return ImageOps.exif_transpose(Image.open(io.BytesIO(r.read()))).convert('RGB')


def encoder(path):
    return subprocess.Popen([T.ffmpeg(), '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                             '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-maxrate', '7M', '-bufsize', '14M', '-pix_fmt', 'yuv420p',
                             '-movflags', '+faststart', path], stdin=subprocess.PIPE)


def end_card(end_line, photo_img):
    T.REEL = {'end_line': end_line, 'web': '@embayyapi', 'title': ''}
    return np.asarray(T.end_static(photo_img), dtype=np.uint8)


def video_clip_frames(path, ss, dur, grade=True, stabilize=True):
    vf = ','.join(x for x in [reelkit.STABILIZE if stabilize else '', f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS}', reelkit.GRADE if grade else ''] if x)
    raw = subprocess.run([T.ffmpeg(), '-loglevel', 'error', '-ss', f'{ss:.2f}', '-t', f'{dur:.2f}', '-i', path, '-vf', vf, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)


def photo_frames(img, dur):
    n = int(round(dur * FPS)); out = []
    for k in range(n):
        t = k / max(1, n - 1); z = 1.0 + 0.07 * t
        fw, fh = int(W * z), int(H * z)
        f = ImageOps.fit(img, (fw, fh), Image.BILINEAR).crop(((fw - W) // 2, (fh - H) // 2, (fw - W) // 2 + W, (fh - H) // 2 + H))
        out.append(np.asarray(f, dtype=np.uint8))
    return out


def montage(job, tmp):
    sp = job['spec']; music = sp.get('music', 'house_120_7')
    bub = T.logo_bubble(); xf = int(0.2 * FPS)
    last_img = None
    silent = os.path.join(OUT, job['id'] + '-sessiz.mp4'); final = os.path.join(OUT, job['id'] + '.mp4')
    p = encoder(silent); state = {'count': 0, 'thumb': None}

    def emit(f):
        p.stdin.write(f.tobytes()); state['count'] += 1
        if state['count'] == FPS: state['thumb'] = f

    def scenes():
        nonlocal last_img
        for i, c in enumerate(sp['clips']):
            dur = reelkit.on_beat(float(c['dur']), music if music != 'none' else 'x_120_')
            if c['kind'] == 'image':
                img = load_img(c['url']); last_img = img; fr = photo_frames(img, dur)
            else:
                src = fetch(c['url'], os.path.join(tmp, f'c{i}')); total = V.probe(src)
                ss = float(c.get('start', 0)); dur = max(1.0, min(dur, total - ss - 0.05)) if total else dur
                fr = video_clip_frames(src, ss, dur, sp.get('grade', True), sp.get('stabilize', True))
                if last_img is None and len(fr): last_img = Image.fromarray(fr[len(fr) // 2])
            cap = V.caption_layer(c.get('caption', ''), 'EMBAY YAPI' if c.get('caption') else ''); cap.alpha_composite(bub, reelkit.bubble_pos(bub))
            a = np.asarray(cap, dtype=np.float32) / 255.0; alpha, rgb = a[..., 3:4], a[..., :3] * 255
            out = [(f.astype(np.float32) * (1 - alpha) + rgb * alpha) for f in fr]
            if i == 0 and sp.get('hook'):
                hk = V.hook_layer(sp['hook']); ha, hr = hk[..., 3:4], hk[..., :3] * 255
                for k in range(min(len(out), int(1.6 * FPS))):
                    o = 1.0 if k < int(1.2 * FPS) else 1 - (k - int(1.2 * FPS)) / (0.4 * FPS)
                    out[k] = out[k] * (1 - ha * o) + hr * (ha * o)
            yield [f.astype(np.uint8) for f in out]
        photo = load_img(sp['end_photo']) if sp.get('end_photo') else (last_img or Image.new('RGB', (W, H), (120, 178, 232)))
        yield [end_card(sp.get('end_line') or 'Siz de böyle bir eve', photo)] * int(4.2 * FPS)

    tail = None
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
    Image.fromarray(state['thumb']).save(os.path.join(OUT, job['id'] + '.jpg'), quality=88)
    if music != 'none':
        reelkit.mix_music(T.ffmpeg(), silent, os.path.join(T.ROOT, 'scripts', 'reels', 'music', music + '.m4a'), final, total)
        os.remove(silent)
    else: os.replace(silent, final)
    return final


def fix(job, tmp):
    sp = job['spec']; src = fetch(sp['url'], os.path.join(tmp, 'src')); total = V.probe(src)
    a = float(sp.get('trim_start') or 0); b = float(sp['trim_end']) if sp.get('trim_end') else total
    keep = []   # tutulacak aralıklar (kesilecek aralıklar çıkarılır)
    cur = a
    for c0, c1 in sorted((float(x), float(y)) for x, y in sp.get('cuts', [])):
        if c1 <= cur or c0 >= b: continue
        if c0 > cur: keep.append((cur, c0))
        cur = max(cur, c1)
    if b > cur: keep.append((cur, b))
    if not keep: raise ValueError('Kırpma/kesme sonrası video kalmadı')
    expr = '+'.join(f'between(t,{x:.3f},{y:.3f})' for x, y in keep)
    body = os.path.join(tmp, 'body.mp4')
    vf = f"select='{expr}',setpts=N/FRAME_RATE/TB,scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS}"
    has_audio = 'Audio:' in subprocess.run([T.ffmpeg(), '-i', src], capture_output=True, text=True).stderr
    cmd = [T.ffmpeg(), '-y', '-loglevel', 'error', '-i', src, '-vf', vf]
    cmd += (['-af', f"aselect='{expr}',asetpts=N/SR/TB", '-c:a', 'aac', '-b:a', '160k', '-ar', '48000'] if has_audio and not sp.get('mute') and sp.get('music', 'none') == 'none' else ['-an'])
    cmd += ['-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', body]
    subprocess.run(cmd, check=True)
    final = os.path.join(OUT, job['id'] + '.mp4'); cur_file = body
    frame = subprocess.run([T.ffmpeg(), '-loglevel', 'error', '-ss', '1', '-i', body, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True).stdout
    thumb = Image.open(io.BytesIO(frame)).convert('RGB') if frame else Image.new('RGB', (W, H), (120, 178, 232))
    if sp.get('end_card'):
        card = os.path.join(tmp, 'card.mp4'); p = encoder(card)
        f = end_card(sp.get('end_line') or 'Siz de böyle bir eve', thumb)
        for _ in range(int(4.2 * FPS)): p.stdin.write(f.tobytes())
        p.stdin.close(); p.wait()
        joined = os.path.join(tmp, 'joined.mp4')
        if '-an' in cmd:
            subprocess.run([T.ffmpeg(), '-y', '-loglevel', 'error', '-i', body, '-i', card, '-filter_complex', '[0:v][1:v]concat=n=2:v=1:a=0[v]', '-map', '[v]',
                            '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', joined], check=True)
        else:
            subprocess.run([T.ffmpeg(), '-y', '-loglevel', 'error', '-i', body, '-i', card, '-f', 'lavfi', '-t', '4.2', '-i', 'anullsrc=r=48000:cl=stereo', '-filter_complex',
                            '[0:v][0:a][1:v][2:a]concat=n=2:v=1:a=1[v][a]', '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
                            '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', joined], check=True)
        cur_file = joined
    dur = V.probe(cur_file)
    if sp.get('music', 'none') != 'none':
        reelkit.mix_music(T.ffmpeg(), cur_file, os.path.join(T.ROOT, 'scripts', 'reels', 'music', sp['music'] + '.m4a'), final, dur)
    else: os.replace(cur_file, final)
    thumb.save(os.path.join(OUT, job['id'] + '.jpg'), quality=88)
    return final


def main():
    os.makedirs(OUT, exist_ok=True)
    if os.environ.get('LOCAL_JOBS'): items = json.load(open(os.environ['LOCAL_JOBS']))   # yerel deneme
    else:
        with urllib.request.urlopen(QUEUE, timeout=60) as r: items = json.load(r).get('items', [])
    summary = {'rendered': [], 'failed': []}
    for job in items:
        print('▶', job['id'], job['kind'], job.get('title'))
        try:
            with tempfile.TemporaryDirectory() as tmp:
                out = montage(job, tmp) if job['kind'] == 'montage' else fix(job, tmp)
            issues = reelkit.qc(T.ffmpeg(), out, min_s=3.0, max_s=90.0)
            summary['rendered'].append(job['id']); print('  ✓', out, issues)
        except Exception as e:
            traceback.print_exc(); summary['failed'].append({'id': job['id'], 'error': f'{type(e).__name__}: {e}'[:400]})
    path = os.environ.get('EDITS_SUMMARY')
    if path: json.dump(summary, open(path, 'w'))
    print(json.dumps(summary))


if __name__ == '__main__':
    main()
