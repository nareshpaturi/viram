// Minimal 16-bit PCM WAV reading and writing for the audio asset scripts.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export const SAMPLE_RATE = 44100;

/** Reads a PCM WAV into mono floats. */
export function readWav(path) {
  const buf = readFileSync(path);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`${path}: not a WAV file`);
  let offset = 12;
  let format = null;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === 'fmt ') {
      format = { audioFormat: buf.readUInt16LE(body), channels: buf.readUInt16LE(body + 2), sampleRate: buf.readUInt32LE(body + 4), bits: buf.readUInt16LE(body + 14) };
    } else if (id === 'data') {
      if (!format || format.audioFormat !== 1 || format.bits !== 16) throw new Error(`${path}: expected 16-bit PCM`);
      const frames = Math.floor(size / (2 * format.channels));
      const samples = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        let sum = 0;
        for (let c = 0; c < format.channels; c++) sum += buf.readInt16LE(body + 2 * (i * format.channels + c));
        samples[i] = sum / format.channels / 32768;
      }
      return { sampleRate: format.sampleRate, samples };
    }
    offset = body + size + (size % 2);
  }
  throw new Error(`${path}: no data chunk`);
}

/**
 * Length of a WAV, or of an AAC .m4a from its movie header (no decoding, so it
 * runs on CI's Linux; it includes the encoder's ~60 ms of padding).
 */
export function durationMs(path) {
  if (path.endsWith('.m4a')) return m4aDurationMs(path);
  const { sampleRate, samples } = readWav(path);
  return Math.round((samples.length / sampleRate) * 1000);
}

function m4aDurationMs(path) {
  const buf = readFileSync(path);
  // mvhd sits inside moov; walk the top-level boxes, then moov's children.
  const find = (type, start, end) => {
    for (let at = start; at + 8 <= end; ) {
      const size = buf.readUInt32BE(at);
      if (buf.toString('ascii', at + 4, at + 8) === type) return at;
      if (size < 8) break;
      at += size;
    }
    throw new Error(`${path}: no ${type} box`);
  };
  const moov = find('moov', 0, buf.length);
  const mvhd = find('mvhd', moov + 8, moov + buf.readUInt32BE(moov));
  const version = buf[mvhd + 8];
  const timescale = buf.readUInt32BE(mvhd + (version === 1 ? 28 : 20));
  const duration = version === 1 ? Number(buf.readBigUInt64BE(mvhd + 32)) : buf.readUInt32BE(mvhd + 24);
  return Math.round((duration / timescale) * 1000);
}

/** Writes mono 16-bit PCM at 44.1 kHz, the one format the native guide loads. */
export function writeWav(path, samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), i * 2);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([header, data]));
}

/** Every voice clip's speech level, so cues, names, and introductions sound equally loud at one cue volume. */
const VOICE_RMS_DB = -20;
const PEAK_CEILING = 0.89; // −1 dBFS

/** RMS over the 20 ms frames that carry speech (louder than −50 dBFS and within 20 dB of the loudest). */
function speechRms(samples) {
  const frame = Math.round(SAMPLE_RATE * 0.02);
  const levels = [];
  for (let i = 0; i + frame <= samples.length; i += frame) {
    let sum = 0;
    for (let j = i; j < i + frame; j++) sum += samples[j] * samples[j];
    levels.push(sum / frame);
  }
  const loudest = Math.max(...levels);
  const voiced = levels.filter((p) => p > 1e-5 && p > loudest / 100);
  return Math.sqrt(voiced.reduce((a, b) => a + b, 0) / Math.max(1, voiced.length));
}

/**
 * Where speech ends: the last 10 ms frame within 35 dB of the loudest,
 * passing over a burst shorter than 60 ms that follows 150 ms of quiet (a
 * click the voice model sometimes leaves after the word). A sample threshold
 * would keep any faint click or breath long after the word.
 */
function speechEnd(samples) {
  const frame = Math.round(SAMPLE_RATE * 0.01);
  const levels = [];
  for (let i = 0; i < samples.length; i += frame) {
    let sum = 0;
    for (let j = i; j < Math.min(samples.length, i + frame); j++) sum += samples[j] * samples[j];
    levels.push(sum / frame);
  }
  const floor = Math.max(...levels) * 10 ** (-35 / 10);
  const loud = (i) => levels[i] >= floor;
  let last = levels.length - 1;
  for (;;) {
    while (last > 0 && !loud(last)) last--;
    let first = last;
    while (first > 0 && loud(first - 1)) first--;
    let quiet = first - 1;
    while (quiet >= 0 && !loud(quiet)) quiet--;
    const burst = last - first + 1 < 6 && first - 1 - quiet >= 15 && quiet >= 0;
    if (!burst) return (last + 1) * frame;
    last = quiet;
  }
}

/**
 * Converts any audio file macOS reads to a bundled voice clip: 44.1 kHz mono,
 * trimmed to 10 ms before the voice and 50 ms after its speech, set to the shared
 * speech level, with short fades so no clip clicks. A `.m4a` destination is
 * written as 64 kbps AAC, about 11 times smaller: the format for introductions.
 */
export function writeVoiceClip(source, dest) {
  const work = mkdtempSync(join(tmpdir(), 'viram-clip-'));
  const converted = join(work, 'clip.wav');
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@44100', '-c', '1', source, converted]);
  const { samples } = readWav(converted);
  rmSync(work, { recursive: true, force: true });
  const start = Math.max(0, samples.findIndex((x) => Math.abs(x) > 0.01) - 441);
  const end = Math.min(samples.length, speechEnd(samples) + 2205);
  const clip = samples.slice(start, end);
  const peak = clip.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
  const gain = Math.min(10 ** (VOICE_RMS_DB / 20) / speechRms(clip), PEAK_CEILING / peak);
  const fadeIn = SAMPLE_RATE * 0.005;
  const fadeOut = SAMPLE_RATE * 0.02;
  for (let i = 0; i < clip.length; i++) clip[i] *= gain * Math.min(1, i / fadeIn, (clip.length - i) / fadeOut);
  if (!dest.endsWith('.m4a')) return writeWav(dest, clip);
  const wav = join(mkdtempSync(join(tmpdir(), 'viram-clip-')), 'clip.wav');
  writeWav(wav, clip);
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '64000', wav, dest]);
  rmSync(dirname(wav), { recursive: true, force: true });
}
