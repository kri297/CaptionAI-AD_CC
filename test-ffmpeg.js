const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const fs = require('fs');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const UPLOAD_DIR = path.join(__dirname, 'server/uploads');
const testOut = path.join(UPLOAD_DIR, 'test_duck_out.wav');

// Find an existing mp4 in uploads to use as a dummy source
const files = fs.readdirSync(UPLOAD_DIR);
const mp4File = files.find(f => f.endsWith('.mp4'));

if (!mp4File) {
  console.error("No mp4 file found in uploads to test with.");
  process.exit(1);
}

const inputPath = path.join(UPLOAD_DIR, mp4File);
console.log("Using input path:", inputPath);

// Run a minimal sidechaincompress test
// sidechaincompress=threshold=0.03:ratio=10:attack=100:release=500
// Note: sidechaincompress needs 2 inputs: [main_audio][sidechain_audio]
// We will split the input audio as a test sidechain
const filterComplex = '[0:a]asplit[main][sc];[main][sc]sidechaincompress=threshold=0.03:ratio=10:attack=100:release=500[out]';

ffmpeg(inputPath)
  .complexFilter(filterComplex)
  .outputOptions(['-map [out]'])
  .save(testOut)
  .on('end', () => {
    console.log("SUCCESS!");
    if (fs.existsSync(testOut)) fs.unlinkSync(testOut);
  })
  .on('error', (err, stdout, stderr) => {
    console.error("FFmpeg error:", err.message);
    console.error("Stderr log:");
    console.error(stderr);
    if (fs.existsSync(testOut)) fs.unlinkSync(testOut);
  });
