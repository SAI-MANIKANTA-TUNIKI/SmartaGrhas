import { spawn } from 'child_process';

export const runFfmpeg = (args) => {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);

    let errorOutput = '';
    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg process exited with code ${code}: ${errorOutput}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`FFmpeg failed to start: ${err.message}`));
    });
  });
};