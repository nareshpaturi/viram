package app.viram.guide

import android.content.Context
import android.media.AudioFormat
import android.media.MediaCodec
import android.media.MediaDataSource
import android.media.MediaExtractor
import android.media.MediaFormat
import android.net.Uri
import java.io.File
import java.io.InputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Decodes the bundled sounds into mono floats at the guide's sample rate:
 * 16-bit PCM WAV (cues, tones, and music) directly, and AAC .m4a
 * (introductions) with the platform decoder.
 */
object AudioDecoder {
  private const val TIMEOUT_US = 10_000L

  fun decode(context: Context, uri: String, targetRate: Int): FloatArray {
    val bytes = open(context, uri).use { it.readBytes() }
    val wav = bytes.size > 12 && String(bytes, 0, 4) == "RIFF" && String(bytes, 8, 4) == "WAVE"
    val mono = if (wav) decodeWav(bytes, uri) else decodeCompressed(bytes, uri)
    return if (mono.rate == targetRate) mono.samples else resample(mono.samples, mono.rate, targetRate)
  }

  private class Mono(val samples: FloatArray, val rate: Int)

  private fun decodeWav(bytes: ByteArray, uri: String): Mono {
    val buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
    var offset = 12
    var channels = 1
    var rate = 0
    var bits = 16
    var format = 1
    while (offset + 8 <= bytes.size) {
      val id = String(bytes, offset, 4)
      val size = buffer.getInt(offset + 4)
      val body = offset + 8
      if (id == "fmt ") {
        format = buffer.getShort(body).toInt()
        channels = buffer.getShort(body + 2).toInt()
        rate = buffer.getInt(body + 4)
        bits = buffer.getShort(body + 14).toInt()
      } else if (id == "data") {
        require(format == 1 && bits == 16) { "Expected 16-bit PCM: $uri" }
        val frames = minOf(size, bytes.size - body) / (2 * channels)
        val mono = FloatArray(frames) { frame ->
          var sum = 0f
          for (c in 0 until channels) sum += buffer.getShort(body + 2 * (frame * channels + c)) / 32768f
          sum / channels
        }
        return Mono(mono, rate)
      }
      offset = body + size + (size and 1)
    }
    throw IllegalArgumentException("No audio data: $uri")
  }

  /** Feeds the file through MediaExtractor and MediaCodec, collecting the decoded PCM as mono. */
  private fun decodeCompressed(bytes: ByteArray, uri: String): Mono {
    val extractor = MediaExtractor()
    try {
      extractor.setDataSource(BytesSource(bytes))
      val track = (0 until extractor.trackCount).firstOrNull {
        extractor.getTrackFormat(it).getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true
      } ?: throw IllegalArgumentException("No audio track: $uri")
      extractor.selectTrack(track)
      val input = extractor.getTrackFormat(track)
      val codec = MediaCodec.createDecoderByType(input.getString(MediaFormat.KEY_MIME)!!)
      try {
        codec.configure(input, null, null, 0)
        codec.start()
        return drain(extractor, codec, input)
      } finally {
        codec.release()
      }
    } finally {
      extractor.release()
    }
  }

  private fun drain(extractor: MediaExtractor, codec: MediaCodec, input: MediaFormat): Mono {
    var rate = input.getInteger(MediaFormat.KEY_SAMPLE_RATE)
    var channels = input.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
    var float = false
    val chunks = ArrayList<FloatArray>()
    val info = MediaCodec.BufferInfo()
    var inputDone = false
    var idle = 0
    while (true) {
      if (!inputDone) {
        val index = codec.dequeueInputBuffer(TIMEOUT_US)
        if (index >= 0) {
          val size = extractor.readSampleData(codec.getInputBuffer(index)!!, 0)
          if (size < 0) {
            codec.queueInputBuffer(index, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
            inputDone = true
          } else {
            codec.queueInputBuffer(index, 0, size, extractor.sampleTime, 0)
            extractor.advance()
          }
        }
      }
      val index = codec.dequeueOutputBuffer(info, TIMEOUT_US)
      when {
        index == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
          val format = codec.outputFormat
          rate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
          channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
          float = format.containsKey(MediaFormat.KEY_PCM_ENCODING) &&
            format.getInteger(MediaFormat.KEY_PCM_ENCODING) == AudioFormat.ENCODING_PCM_FLOAT
        }
        index >= 0 -> {
          idle = 0
          val buffer = codec.getOutputBuffer(index)!!.order(ByteOrder.nativeOrder())
          chunks.add(mono(buffer, info.offset, info.size, channels, float))
          codec.releaseOutputBuffer(index, false)
          if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) break
        }
        // A decoder that stops producing output after the end of input is done.
        inputDone && ++idle > 100 -> break
      }
    }
    val samples = FloatArray(chunks.sumOf { it.size })
    var at = 0
    for (chunk in chunks) {
      chunk.copyInto(samples, at)
      at += chunk.size
    }
    return Mono(samples, rate)
  }

  private fun mono(buffer: ByteBuffer, offset: Int, size: Int, channels: Int, float: Boolean): FloatArray {
    val width = if (float) 4 else 2
    return FloatArray(size / (width * channels)) { frame ->
      var sum = 0f
      for (c in 0 until channels) {
        val at = offset + (frame * channels + c) * width
        sum += if (float) buffer.getFloat(at) else buffer.getShort(at) / 32768f
      }
      sum / channels
    }
  }

  private class BytesSource(private val bytes: ByteArray) : MediaDataSource() {
    override fun readAt(position: Long, buffer: ByteArray, offset: Int, size: Int): Int {
      if (position >= bytes.size) return -1
      val count = minOf(size, bytes.size - position.toInt())
      System.arraycopy(bytes, position.toInt(), buffer, offset, count)
      return count
    }

    override fun getSize(): Long = bytes.size.toLong()

    override fun close() {}
  }

  private fun open(context: Context, uri: String): InputStream {
    if (uri.startsWith("/")) return File(uri).inputStream()
    val parsed = Uri.parse(uri)
    return if (parsed.scheme == "file") File(parsed.path!!).inputStream()
    else context.contentResolver.openInputStream(parsed) ?: throw IllegalArgumentException("Can't open $uri")
  }

  private fun resample(input: FloatArray, from: Int, to: Int): FloatArray {
    val ratio = from.toDouble() / to
    return FloatArray((input.size / ratio).toInt()) { i ->
      val x = i * ratio
      val j = x.toInt()
      val t = (x - j).toFloat()
      val a = input[j]
      val b = if (j + 1 < input.size) input[j + 1] else a
      a + (b - a) * t
    }
  }
}
