package app.viram.guide

import android.content.Context
import android.net.Uri
import java.io.File
import java.io.InputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder

/** Decodes the bundled 16-bit PCM WAV files into mono floats at the guide's sample rate. */
object WavDecoder {
  fun decode(context: Context, uri: String, targetRate: Int): FloatArray {
    val bytes = open(context, uri).use { it.readBytes() }
    val buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
    require(bytes.size > 12 && String(bytes, 0, 4) == "RIFF" && String(bytes, 8, 4) == "WAVE") { "Not a WAV file: $uri" }
    var offset = 12
    var channels = 1
    var rate = targetRate
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
        return if (rate == targetRate) mono else resample(mono, rate, targetRate)
      }
      offset = body + size + (size and 1)
    }
    throw IllegalArgumentException("No audio data: $uri")
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
