const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

(async function() {
  const outputWavPath = 'test_ducking_export.wav';
  let command = ffmpeg();
  let filterComplex = '';

  // Input 0: Dummy video with a loud continuous sine wave
  command = command.input('color=c=black:s=640x480:r=30:d=10').inputFormat('lavfi');
  command = command.input('sine=frequency=440:duration=10').inputFormat('lavfi'); // loud tone
  filterComplex += `[1:a]asplit=1[orig_audio];`;

  let adMixInputs = '';
  let validAdCount = 0;

  const files = ['test.mp3', 'test2.mp3', 'test3.mp3'];
  for (let i = 0; i < files.length; i++) {
    if (fs.existsSync(files[i])) {
      command = command.input(files[i]);
      const delayMs = i * 1000;
      const inputIndex = validAdCount + 2; 
      filterComplex += `[${inputIndex}:a]adelay=${delayMs}|${delayMs}[a${inputIndex}];`;
      adMixInputs += `[a${inputIndex}]`;
      validAdCount++;
    }
  }

  if (validAdCount > 0) {
    // Mix all ADs into a single track
    filterComplex += `${adMixInputs}amix=inputs=${validAdCount}:dropout_transition=0,volume=${validAdCount}[ad_combined];`;
    // Split the combined AD track so one controls the compressor and the other is heard
    filterComplex += `[ad_combined]asplit=2[ad_control][ad_heard];`;
    // Duck the original audio using sidechaincompress
    filterComplex += `[orig_audio][ad_control]sidechaincompress=threshold=0.03:ratio=10:attack=100:release=500[ducked_orig];`;
    // Final mix: Ducked Original + Heard AD
    filterComplex += `[ducked_orig][ad_heard]amix=inputs=2:duration=first:dropout_transition=0[aout];[aout]volume=2[final_aout]`;
    
    console.log("Filter:", filterComplex);
    
    await new Promise((resolve, reject) => {
      command.complexFilter(filterComplex)
        .outputOptions(['-map [final_aout]', '-y'])
        .save(outputWavPath)
        .on('end', () => { console.log('Export Success!'); resolve(); })
        .on('error', (err, stdout, stderr) => { 
            console.error('Export Error:', err.message); 
            console.error('Stderr:', stderr);
            reject(err); 
        });
    });
  }
})();
