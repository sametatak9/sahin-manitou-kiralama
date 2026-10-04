#!/usr/bin/env python3
"""EMBAY özgün ritim üreticisi — telifsiz, bize ait, genç/popüler tarzda fon müzikleri.

Instagram işletme hesaplarında telifli popüler şarkılar sessize alınır / video kaldırılır. Bu yüzden
trap, phonk, house, afro ve drill tarzında ritimler matematiksel olarak sentezlenir (örnek/sample kullanılmaz).
Her parça: 4 ölçü giriş (hafif) + "drop" (tam ritim) + çıkış. Dosya adı BPM'i taşır: <stil>_<bpm>_<no>.m4a
Montaj (render.py) kesimleri bu BPM'e göre vuruşlara oturtur.

Kullanım: python3 scripts/reels/beats.py --out scripts/reels/music --seconds 30
"""
import argparse, os, subprocess, tempfile, wave
import numpy as np
from scipy.signal import butter, sosfilt

SR = 44100
NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}


def hz(name, octave):
    return 440.0 * 2 ** ((NOTE[name] + 12 * (octave + 1) - 69) / 12)


def env(n, a=0.002, d=0.2, curve=6.0):
    t = np.arange(n) / SR
    e = np.exp(-t * curve / max(d, 1e-3))
    ai = int(a * SR)
    if ai > 0: e[:ai] *= np.linspace(0, 1, ai)
    return e


def filt(x, kind, f, order=2):
    sos = butter(order, f, btype=kind, fs=SR, output='sos')
    return sosfilt(sos, x)


# ── Enstrümanlar ────────────────────────────────────────────────────────────
def kick(punch=1.0):
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 45 + 120 * np.exp(-t * 28) * punch
    ph = 2 * np.pi * np.cumsum(f) / SR
    click = filt(np.random.randn(n), 'highpass', 3000) * env(n, 0, 0.008, 5) * 0.25
    return np.tanh(1.8 * np.sin(ph) * env(n, 0.001, 0.35, 5)) + click


def snare(tone=190, noise=0.9, dec=0.18):
    n = int(0.35 * SR)
    nz = filt(np.random.randn(n), 'bandpass', [1200, 9000]) * env(n, 0.001, dec, 5) * noise
    body = np.sin(2 * np.pi * tone * np.arange(n) / SR) * env(n, 0.001, 0.08, 5) * 0.6
    return nz + body


def clap():
    n = int(0.3 * SR); x = np.zeros(n)
    for k, dl in enumerate([0, 0.011, 0.022]):
        i = int(dl * SR); m = n - i
        x[i:] += filt(np.random.randn(m), 'bandpass', [900, 5000]) * env(m, 0.0005, 0.02 if k < 2 else 0.16, 5)
    return x * 0.9


def hat(open_=False):
    n = int((0.22 if open_ else 0.05) * SR)
    return filt(np.random.randn(n), 'highpass', 7000) * env(n, 0.0005, 0.18 if open_ else 0.03, 5) * 0.35


def shaker():
    n = int(0.09 * SR)
    return filt(np.random.randn(n), 'bandpass', [4000, 11000]) * env(n, 0.01, 0.05, 4) * 0.22


def rim():
    n = int(0.08 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1700 * t) + 0.5 * np.sin(2 * np.pi * 800 * t)) * env(n, 0, 0.03, 5) * 0.3


def bass808(freq, dur, glide_from=None):
    n = int(dur * SR); t = np.arange(n) / SR
    f = np.full(n, freq)
    if glide_from: f = freq + (glide_from - freq) * np.exp(-t * 18)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.25 * np.sin(2 * ph)
    return np.tanh(2.2 * x * env(n, 0.003, max(0.3, dur * 0.9), 3.5)) * 0.8


def cowbell(freq, dur=0.25):
    n = int(dur * SR); t = np.arange(n) / SR
    sq = np.sign(np.sin(2 * np.pi * freq * t)) + np.sign(np.sin(2 * np.pi * freq * 1.48 * t))
    return filt(sq, 'bandpass', [freq * 0.8, freq * 4]) * env(n, 0.001, dur * 0.8, 4) * 0.32


def pluck(freq, dur=0.35, bright=4000):
    n = int(dur * SR); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * freq * k * t) / k for k in range(1, 7))
    return filt(x, 'lowpass', bright) * env(n, 0.002, dur * 0.7, 5) * 0.25


def bell(freq, dur=0.6):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * t + 1.8 * np.sin(2 * np.pi * freq * 3.5 * t) * np.exp(-t * 6))
    return x * env(n, 0.002, dur, 4) * 0.22


def pad(freqs, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for f in freqs:
        for det in (-0.12, 0.0, 0.12):
            ff = f * 2 ** (det / 12)
            x += 2 * (t * ff - np.floor(0.5 + t * ff))  # testere dalga
    x = filt(x, 'lowpass', 1800) / (len(freqs) * 3)
    e = np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.08).clip(0, 1)
    return x * e * 0.35


def chord_stab(freqs, dur=0.18):
    n = int(dur * SR); t = np.arange(n) / SR
    x = sum(2 * (t * f - np.floor(0.5 + t * f)) for f in freqs) / len(freqs)
    return filt(x, 'lowpass', 2600) * env(n, 0.002, dur, 4) * 0.4


# ── Düzenleme ───────────────────────────────────────────────────────────────
class Track:
    def __init__(self, bpm, seconds):
        self.bpm = bpm; self.beat = 60 / bpm; self.n = int(seconds * SR)
        self.drums = np.zeros(self.n); self.bass = np.zeros(self.n); self.mel = np.zeros(self.n)

    def put(self, buf, sound, at, gain=1.0):
        i = int(at * SR)
        if i >= self.n: return
        m = min(len(sound), self.n - i)
        buf[i:i + m] += sound[:m] * gain

    def mix(self, intro_bars):
        # giriş bölümünde bas/davul yok → drop'ta vurur (sidechain hissi: kick anında bas/melodi hafif kısılır)
        drop = intro_bars * 4 * self.beat
        t = np.arange(self.n) / SR
        duck = np.ones(self.n)
        k = kick()
        env_k = np.abs(k[:int(0.25 * SR)]); env_k = env_k / env_k.max()
        for b in np.arange(drop, self.n / SR, self.beat):
            i = int(b * SR); m = min(len(env_k), self.n - i)
            duck[i:i + m] = np.minimum(duck[i:i + m], 1 - 0.45 * env_k[:m])
        intro_lp = filt(self.mel, 'lowpass', 2200) * 1.3
        mel = np.where(t < drop, intro_lp, self.mel)
        out = self.drums * 0.9 + self.bass * 0.85 * duck + mel * duck
        rise = (t > drop - 2 * self.beat) & (t < drop)
        out[rise] += filt(np.random.randn(rise.sum()), 'bandpass', [2500, 8000]) * np.linspace(0, 1, rise.sum()) ** 2 * 0.07
        out = np.tanh(out * 1.3)
        fade = int(1.2 * SR); out[-fade:] *= np.linspace(1, 0, fade)
        out[:int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
        return out / (np.abs(out).max() + 1e-9) * 0.92


def minor_scale(root, octave):
    steps = [0, 2, 3, 5, 7, 8, 10]
    base = hz(root, octave)
    return [base * 2 ** (s / 12) for s in steps] + [base * 2]


def make(style, bpm, seconds, seed):
    rng = np.random.default_rng(seed); np.random.seed(seed)
    tr = Track(bpm, seconds); B = tr.beat
    intro = 2
    root = ['A', 'C', 'D', 'E', 'F', 'G'][seed % 6]
    sc = minor_scale(root, 4)
    bars = int(seconds / (4 * B)) + 1
    prog = [0, 5, 3, 4] if seed % 2 else [0, 3, 5, 4]
    for bar in range(bars):
        t0 = bar * 4 * B; on = bar >= intro
        deg = prog[bar % 4]; bf = hz(root, 1) * 2 ** ([0, 2, 3, 5, 7, 8, 10][deg] / 12)
        if style in ('trap', 'drill', 'phonk'):
            # yarım tempo trap: snare/clap 3. vuruşta; hi-hat 1/8 + rulolar
            if on:
                kicks = [0, 2.5] if style != 'drill' else [0, 1.75, 2.5]
                if bar % 2: kicks += [3.25]
                for kb in kicks: tr.put(tr.drums, kick(), t0 + kb * B)
                tr.put(tr.drums, clap() if style != 'drill' else snare(220, 1.0, 0.12), t0 + 2 * B, 0.9)
                if style == 'drill': tr.put(tr.drums, snare(220, 1.0, 0.12), t0 + 3.5 * B, 0.7)
                step = 0.5 if style != 'phonk' else 0.25
                for hb in np.arange(0, 4, step):
                    roll = (bar % 4 == 3 and hb >= 3)
                    if roll:
                        for rb in np.arange(0, step, step / 3): tr.put(tr.drums, hat(), t0 + (hb + rb) * B, 0.8)
                    else: tr.put(tr.drums, hat(), t0 + hb * B, 0.9 if hb % 1 == 0 else 0.6)
                glide = bf * 1.5 if style == 'drill' and bar % 2 else None
                tr.put(tr.bass, bass808(bf, 2.2 * B, glide), t0)
                tr.put(tr.bass, bass808(bf, 1.3 * B), t0 + 2.5 * B, 0.9)
            else:
                for hb in (0, 1, 2, 3): tr.put(tr.drums, hat(), t0 + hb * B, 0.4)
            # melodi
            pat = rng.permutation([0, 2, 4, 3, 5, 4, 2, 1])
            for i, st in enumerate(np.arange(0, 4, 0.5)):
                note = sc[(pat[i % len(pat)] + deg) % len(sc)]
                if style == 'phonk': tr.put(tr.mel, cowbell(note * 2, 0.22), t0 + st * B, 0.9)
                elif style == 'drill': (tr.put(tr.mel, bell(note, 0.5), t0 + st * B, 0.8) if i % 2 == 0 else None)
                else: tr.put(tr.mel, bell(note * 2, 0.45) if i % 2 == 0 else pluck(note, 0.3), t0 + st * B, 0.8)
        elif style in ('funk', 'drift'):
            # Brezilya funk (tamborzão) / drift phonk: 16'lık kick deseni, el çırpma 2-4'te, distorsiyonlu çan melodisi, kayan 808
            if on:
                ks = [0, 3, 6, 8, 11, 14] if style == 'funk' else [0, 3, 8, 10, 14]
                for st in ks: tr.put(tr.drums, kick(1.1), t0 + st * B / 4, 1.0 if st % 8 == 0 else 0.85)
                for st in (4, 12): tr.put(tr.drums, clap(), t0 + st * B / 4, 0.95)
                for st in range(16):
                    if style == 'funk' and st % 4 == 2: tr.put(tr.drums, rim(), t0 + st * B / 4, 0.8)
                    tr.put(tr.drums, hat(), t0 + st * B / 4, 0.55 if st % 2 else 0.8)
                if bar % 4 == 3:  # ölçü sonu dolgusu
                    for st in (13, 14, 15): tr.put(tr.drums, snare(230, 1.0, 0.08), t0 + st * B / 4, 0.55)
                tr.put(tr.bass, bass808(bf, 1.6 * B, bf * (1.5 if bar % 2 else 0.75)), t0)
                tr.put(tr.bass, bass808(bf * (1.33 if style == 'drift' else 1.0), 1.4 * B), t0 + 2 * B, 0.85)
            else:
                for st in range(0, 16, 2): tr.put(tr.drums, hat(), t0 + st * B / 4, 0.4)
            # 16'lık çan ostinatosu (drift'te daha yüksek ve kayan)
            motif = [0, 0, 4, 0, 3, 0, 4, 5] if style == 'funk' else [0, 4, 7, 4, 3, 4, 5, 4]
            for st in range(16):
                deg2 = motif[st % 8] + deg
                note = sc[deg2 % 7] * (2 if deg2 >= 7 else 1) * (2 if style == 'drift' else 1)
                if style == 'funk' and st % 2: continue
                tr.put(tr.mel, np.tanh(cowbell(note * 2, 0.18) * 3) * 0.35, t0 + st * B / 4, 0.9 if st % 4 == 0 else 0.7)
        elif style == 'house':
            ch = [sc[(deg + k) % 7] for k in (0, 2, 4)]
            if on:
                for kb in range(4): tr.put(tr.drums, kick(0.8), t0 + kb * B)
                for cb in (1, 3): tr.put(tr.drums, clap(), t0 + cb * B, 0.7)
                for hb in np.arange(0.5, 4, 1): tr.put(tr.drums, hat(True), t0 + hb * B, 0.4)
                for hb in np.arange(0, 4, 0.5): tr.put(tr.drums, hat(), t0 + hb * B, 0.22)
                for bb in np.arange(0.5, 4, 1): tr.put(tr.bass, pluck(bf * 2, 0.3, 900) * 2.2, t0 + bb * B)
            for sb in (0, 0.75, 1.5, 2.5, 3.25): tr.put(tr.mel, chord_stab(ch), t0 + sb * B, 0.9)
            tr.put(tr.mel, pad([f / 2 for f in ch], 4 * B), t0, 0.5)
        elif style == 'afro':
            ch = [sc[(deg + k) % 7] for k in (0, 2, 4)]
            if on:
                for kb in (0, 1.5, 2, 3.5): tr.put(tr.drums, kick(0.9), t0 + kb * B, 0.9)
                for rb in (0.75, 1.75, 2.5, 3.0): tr.put(tr.drums, rim(), t0 + rb * B)
                tr.put(tr.drums, snare(200, 0.6, 0.1), t0 + 3 * B, 0.6)
                for sb in np.arange(0, 4, 0.25): tr.put(tr.drums, shaker(), t0 + sb * B, 1.0 if (sb * 4) % 2 else 0.6)
                tr.put(tr.bass, bass808(bf, 1.4 * B), t0, 0.8); tr.put(tr.bass, bass808(bf * 1.5, 0.9 * B), t0 + 2 * B, 0.7)
            for i, st in enumerate((0, 0.75, 1.5, 2.25, 3.0)):
                tr.put(tr.mel, pluck(ch[i % 3] * 2, 0.4, 3000), t0 + st * B, 0.9)
            tr.put(tr.mel, pad(ch, 4 * B), t0, 0.4)
    return tr.mix(intro)


STYLES = [('trap', 140), ('phonk', 130), ('house', 124), ('afro', 108), ('drill', 142), ('trap', 150), ('house', 120), ('phonk', 125),
          ('funk', 130), ('drift', 140), ('funk', 128)]


def write_m4a(x, path):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: wav = f.name
    st = np.stack([x, x], axis=1)
    st[:, 1] = np.roll(x, int(0.0006 * SR))  # hafif stereo genişlik
    with wave.open(wav, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())
    ff = 'ffmpeg'
    try:
        import imageio_ffmpeg; ff = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception: pass
    subprocess.run([ff, '-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'aac', '-b:a', '192k', path], check=True)
    os.unlink(wav)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), 'music'))
    ap.add_argument('--seconds', type=float, default=30); ap.add_argument('--only', type=int, default=-1)
    a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
    for i, (style, bpm) in enumerate(STYLES):
        if a.only >= 0 and i != a.only: continue
        p = os.path.join(a.out, f'{style}_{bpm}_{i + 1}.m4a')
        write_m4a(make(style, bpm, a.seconds, 11 + i * 7), p); print('✓', p)


if __name__ == '__main__':
    main()
