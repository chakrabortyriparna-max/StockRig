"""StockRig soundtrack synth — pure Python stdlib. Outputs launch.wav + letter.wav"""
import wave, math, struct, random

SR = 44100

def env(i, n, a=0.01, r=0.3):
    t = i / SR
    dur = n / SR
    attack = min(1, t / a) if a > 0 else 1
    release = min(1, (dur - t) / r) if r > 0 else 1
    return max(0.0, attack) * max(0.0, release)

def write_wav(path, samples):
    with wave.open(path, "w") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        frames = b"".join(struct.pack("<hh", max(-32767, min(32767, int(l * 32767))), max(-32767, min(32767, int(r * 32767)))) for l, r in samples)
        w.writeframes(frames)

def kick(dur=0.16):
    n = int(SR * dur)
    out = []
    ph = 0.0
    for i in range(n):
        f = 130 * math.exp(-(i / SR) * 28) + 42
        ph += 2 * math.pi * f / SR
        s = math.sin(ph) * math.exp(-(i / SR) * 16)
        out.append(s)
    return out

def hat(dur=0.045):
    n = int(SR * dur)
    random.seed(7)
    return [random.uniform(-1, 1) * math.exp(-(i / SR) * 70) * 0.32 for i in range(n)]

def tone(freq, dur, vol=0.2, shape="sin", a=0.005, r=0.12):
    n = int(SR * dur); out = []
    for i in range(n):
        t = i / SR; ph = 2 * math.pi * freq * t
        if shape == "tri":
            s = (2 / math.pi) * math.asin(math.sin(ph))
            s = 0.6 * s + 0.4 * math.sin(ph)
        else:
            s = math.sin(ph) + 0.35 * math.sin(2 * ph) + 0.15 * math.sin(3 * ph)
        out.append(s * vol * env(i, n, a, r))
    return out

def mix_into(buf, snd, start_s, gain=1.0):
    start = int(start_s * SR)
    need = start + len(snd)
    while len(buf) < need:
        buf.append([0.0, 0.0])
    pan_l, pan_r = gain, gain
    for i, s in enumerate(snd):
        buf[start + i][0] += s * pan_l
        buf[start + i][1] += s * pan_r

BPM = 122; BEAT = 60.0 / BPM
NOTE = {"A1":55,"C2":65.41,"D2":73.42,"E2":82.41,"G1":49,"G2":98,"A2":110,"F2":87.31,"E3":164.81,"A3":220,"C4":261.63,"E4":329.63,"F4":349.23,"G3":196,"G4":392,"B3":246.94}
# chord roots per bar: Am F C G
PROG = [("A2",[("A3",0),("C4",4/12),("E4",7/12)]),
        ("F2",[("F4",0),("A3",4/12),("C4",7/12)]),
        ("G2",[("G3",0),("B3",4/12),("G4",7/12)]),
        ("C4" if False else "E2",[("E4",0),("G3",4/12),("C4",7/12)])]
BASS_PAT = [0.0, 1.5, 2.0, 3.25]

buf = []
bars = 22
for bar in range(bars):
    root, chord = PROG[bar % len(PROG)]
    t0 = bar * 4 * BEAT
    for b in range(4):
        mix_into(buf, kick(), t0 + b * BEAT, 0.95)
        mix_into(buf, hat(), t0 + b * BEAT + BEAT / 2, 0.8)
        if b in (1, 3):
            mix_into(buf, hat(0.02), t0 + b * BEAT + BEAT * 0.75, 0.5)
    for off in BASS_PAT:
        mix_into(buf, tone(NOTE[root], BEAT * 0.9, 0.30, "tri"), t0 + off * BEAT, 0.9)
    for name, iv in chord:
        mix_into(buf, tone(NOTE[name], 4 * BEAT, 0.055, "sin", a=0.25, r=0.8), t0, 0.85)

peak = max(max(abs(l), abs(r)) for l, r in buf)
buf = [[l / peak * 0.92, r / peak * 0.92] for l, r in buf]
write_wav("launch.wav", buf)

# ---- calmer founder-letter bed: pads only, half-time ----
buf2 = []
for bar in range(16):
    root, chord = PROG[bar % len(PROG)]
    t0 = bar * 4 * BEAT * 2
    for name, iv in chord:
        mix_into(buf2, tone(NOTE[name], 8 * BEAT, 0.06, "sin", a=1.2, r=1.5), t0, 0.8)
    if bar % 2 == 0:
        mix_into(buf2, tone(NOTE[root], 4 * BEAT, 0.14, "tri", a=0.4, r=1.0), t0, 0.7)
peak2 = max(max(abs(l), abs(r)) for l, r in buf2)
buf2 = [[l / peak2 * 0.85, r / peak2 * 0.85] for l, r in buf2]
write_wav("letter.wav", buf2)
print("audio done")
