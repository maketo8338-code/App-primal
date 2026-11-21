"""Synthesises the launch sound (original, royalty-free) for the intro animation.

Timeline matches src/intro/IntroOverlay.tsx (APPEAR 700 + HOLD 180 + CHARGE 520 ms):
  0.00–0.90 s  warm low pad + air: the logo appears
  0.88–1.36 s  luminous rising tone: the logo charges up
  1.36 s       soft low thump + whoosh: the burst (slightly early to absorb playback latency)
  1.38–3.0 s   crystalline sparks panned left/right, evaporating like the particles

    python3 tools/make-intro-sound.py   # writes assets/sounds/intro.m4a (needs ffmpeg)
"""
import subprocess
import wave
import numpy as np

SR = 44100
DUR = 3.4
BURST = 1.36
rng = np.random.default_rng(11)
t = np.arange(int(SR * DUR)) / SR
L = np.zeros_like(t); R = np.zeros_like(t)


def band(noise, lo, hi):
    """Band-pass filter white noise in the frequency domain."""
    spec = np.fft.rfft(noise); f = np.fft.rfftfreq(len(noise), 1 / SR)
    spec[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(spec, len(noise))


def norm(x):
    return x / (np.max(np.abs(x)) + 1e-9)


def smooth_step(x):
    x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)


# 1. Warm pad (G2, D3, G3) — fades in with the logo, swells into the burst, then fades.
pad_env = smooth_step(t / 0.9) * np.where(t < BURST, 1.0, np.exp(-(t - BURST) / 0.9))
pad = sum(a * np.sin(2 * np.pi * f * t + p) for f, a, p in ((98, 1.0, 0), (147, 0.6, 1.1), (196, 0.35, 2.3)))
L += 0.07 * pad_env * pad; R += 0.07 * pad_env * pad

# 2. Air: soft low-passed noise, slightly different per ear.
air_env = smooth_step(t / 0.7) * np.where(t < BURST, 1.0, np.exp(-(t - BURST) / 0.25))
L += 0.035 * air_env * norm(band(rng.standard_normal(len(t)), 80, 1400))
R += 0.035 * air_env * norm(band(rng.standard_normal(len(t)), 80, 1400))

# 3. Charge: exponential rising tone + bright noise riser, cut right at the burst.
c0, c1 = 0.88, BURST
in_charge = (t >= c0) & (t < c1)
x = np.clip((t - c0) / (c1 - c0), 0, 1)
freq = 180 * (720 / 180) ** x
phase = 2 * np.pi * np.cumsum(freq) / SR
riser = (np.sin(phase) + 0.35 * np.sin(2 * phase)) * (x ** 2.2) * in_charge
cut = np.clip((c1 - t) / 0.012, 0, 1)
noise_riser = norm(band(rng.standard_normal(len(t)), 2000, 7000)) * (x ** 3) * in_charge
L += (0.09 * riser + 0.045 * noise_riser) * cut; R += (0.09 * riser + 0.045 * noise_riser) * cut

# 4. Burst: soft sub thump (pitch dropping) + airy whoosh.
after = np.clip(t - BURST, 0, None); on = t >= BURST
thump_f = 42 + 48 * np.exp(-after / 0.08)
thump = np.sin(2 * np.pi * np.cumsum(thump_f * on) / SR) * np.exp(-after / 0.18) * np.clip(after / 0.004, 0, 1) * on
L += 0.42 * thump; R += 0.42 * thump
whoosh_env = np.clip(after / 0.006, 0, 1) * np.exp(-after / 0.32) * on
L += 0.16 * whoosh_env * norm(band(rng.standard_normal(len(t)), 300, 3200))
R += 0.16 * whoosh_env * norm(band(rng.standard_normal(len(t)), 300, 3200))

# 5. Sparks: high pentatonic pings, panned outward and fading, like the particles.
notes = np.array([1568, 1760, 1976, 2349, 2637, 3136, 3520, 3951], float)
for i in range(28):
    start = BURST + 0.02 + rng.exponential(0.38)
    if start > DUR - 0.4:
        continue
    f = rng.choice(notes) * (1 + rng.normal(0, 0.002))
    tau = rng.uniform(0.18, 0.55)
    a = rng.uniform(0.018, 0.045) * np.exp(-(start - BURST) / 1.2)
    dt = np.clip(t - start, 0, None); live = t >= start
    ping = (np.sin(2 * np.pi * f * dt) + 0.25 * np.sin(2 * np.pi * f * 2.01 * dt)) * np.exp(-dt / tau) * np.clip(dt / 0.003, 0, 1) * live
    side = -1 if i % 2 == 0 else 1
    pan = side * min(1.0, 0.35 + (start - BURST) * 0.8)  # drifts outward over time
    L += a * ping * np.sqrt((1 - pan) / 2); R += a * ping * np.sqrt((1 + pan) / 2)

# 6. Small room: convolve with a short decaying noise tail (light reverb).
ir_len = int(SR * 1.1)
ir_t = np.arange(ir_len) / SR
def reverb(x, seed):
    ir = np.random.default_rng(seed).standard_normal(ir_len) * np.exp(-ir_t / 0.32)
    ir[0] = 0
    n = len(x) + ir_len
    y = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)[:len(x)]
    return y / (np.max(np.abs(y)) + 1e-9) * np.max(np.abs(x))
L = 0.8 * L + 0.22 * reverb(L, 1); R = 0.8 * R + 0.22 * reverb(R, 2)

# 7. Master: gentle soft clip, peak at -6 dBFS, fade out.
fade = np.clip((DUR - t) / 0.35, 0, 1)
stereo = np.stack([L, R], 1) * fade[:, None]
stereo = np.tanh(stereo * 1.4)
stereo *= 10 ** (-6 / 20) / np.max(np.abs(stereo))
pcm = (stereo * 32767).astype(np.int16)

wav = '/tmp/primal-intro.wav'
with wave.open(wav, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '128k', 'assets/sounds/intro.m4a'], check=True)
print('wrote assets/sounds/intro.m4a')
