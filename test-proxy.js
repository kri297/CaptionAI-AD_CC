const fetch = require('node-fetch');
const fs = require('fs');

async function run() {
  try {
    const files = fs.readdirSync('server/uploads')
                    .filter(f => f.endsWith('.mp3') && fs.statSync('server/uploads/' + f).size > 0 && f.startsWith('1782232040499-975679846'))
                    .slice(0, 22);
    
    const caps = files.map((f, i) => ({ type: 'ac', audioFile: f, start: i * 5 }));
    const fileId = "1782232040499-975679846.mp4";
    
    console.log("Fetching...");
    const start = Date.now();
    const res = await fetch('http://localhost:5173/api/export/mixed-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, captions: caps })
    });
    
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Response: ${text.substring(0, 200)}`);
    console.log(`Took: ${Date.now() - start}ms`);
  } catch (err) {
    console.error("Fetch Error:");
    console.error(err);
  }
}
run();
