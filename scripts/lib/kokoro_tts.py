"""Kokoro text-to-speech for scripts/render-voice-kokoro.mjs.

Reads a JSON list of jobs on stdin and writes each as a 24 kHz WAV at its
`out` path. A job is {out, lines, voice, speed, lang, pauseMs, names}:
`lines` are spoken with `pauseMs` of silence between them, and `names` maps
words in the text to the Kokoro phonemes they are spoken with, so Sanskrit
names don't go through English spelling rules.

`voice` is a Kokoro voice ID, or a blend such as "af_heart*0.7+af_nicole*0.3".
VIRAM_KOKORO_DIR holds kokoro-v1.0.onnx and voices-v1.0.bin.
"""
import json
import os
import re
import shutil
import sys

import espeakng_loader
import numpy as np
import soundfile as sf
from kokoro_onnx import EspeakConfig, Kokoro

MODEL_DIR = os.environ["VIRAM_KOKORO_DIR"]


def espeak_data_path():
    # espeak-ng cuts its data path at 160 characters, so a long virtualenv path
    # fails to load; a copy in /tmp keeps the path short.
    path = os.path.realpath(espeakng_loader.get_data_path())
    if len(path) < 120:
        return path
    short = "/tmp/viram-espeak-ng-data"
    if not os.path.isdir(short):
        shutil.copytree(path, short)
    return short


kokoro = Kokoro(
    os.path.join(MODEL_DIR, "kokoro-v1.0.onnx"),
    os.path.join(MODEL_DIR, "voices-v1.0.bin"),
    espeak_config=EspeakConfig(data_path=espeak_data_path()),
)


def style(voice):
    if "*" not in voice:
        return voice
    parts = [part.split("*") for part in voice.split("+")]
    return sum(kokoro.get_voice_style(name) * float(weight) for name, weight in parts)


def phonemes(text, lang, names):
    """English phonemes for the text, with each listed name spliced in as given."""
    if not names:
        return kokoro.tokenizer.phonemize(text, lang)
    pattern = re.compile(r"\b(" + "|".join(re.escape(n) for n in sorted(names, key=len, reverse=True)) + r")\b")
    pieces, last = [], 0
    for match in pattern.finditer(text):
        before = text[last : match.start()]
        if before.strip():
            pieces.append(kokoro.tokenizer.phonemize(before, lang))
        pieces.append(names[match.group(1)])
        last = match.end()
    rest = text[last:]
    if rest.strip():
        pieces.append(kokoro.tokenizer.phonemize(rest, lang))
    return " ".join(pieces)


def speak(job):
    voice = style(job["voice"])
    pause = np.zeros(int(24_000 * job.get("pauseMs", 0) / 1000), dtype=np.float32)
    parts = []
    for i, line in enumerate(job["lines"]):
        audio, rate = kokoro.create(
            phonemes(line, job["lang"], job.get("names")), voice=voice, speed=job["speed"], lang=job["lang"], is_phonemes=True
        )
        assert rate == 24_000
        parts += [pause, audio] if i else [audio]
    audio = np.concatenate(parts)
    # Leave headroom; the clip writer sets the final level.
    audio = audio / max(1e-6, float(np.abs(audio).max())) * 0.9
    sf.write(job["out"], audio, 24_000, subtype="PCM_16")


for job in json.load(sys.stdin):
    speak(job)
    print(job["out"], flush=True)
