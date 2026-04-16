const express = require('express');
const app = express();

// ACEITA QUALQUER BINÁRIO
app.use(express.raw({ type: '*/*', limit: '5mb' }));

let frames = {
    cam1: null,
    cam2: null
};

app.post('/upload/:cam', (req, res) => {
    const cam = req.params.cam;

    console.log("Recebendo frame de:", cam);

    if (!req.body || req.body.length === 0) {
        console.log("Frame vazio!");
        return res.sendStatus(400);
    }

    frames[cam] = req.body;

    console.log("Frame OK:", req.body.length, "bytes");

    res.sendStatus(200);
});

app.get('/stream/:cam', (req, res) => {
    const cam = req.params.cam;

    res.writeHead(200, {
        'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    const interval = setInterval(() => {
        if (frames[cam]) {
            res.write(`--frame\r\n`);
            res.write(`Content-Type: image/jpeg\r\n\r\n`);
            res.write(frames[cam]);
            res.write(`\r\n`);
        }
    }, 100);

    req.on('close', () => clearInterval(interval));
});

app.get('/', (req, res) => {
    res.send(`
        <h1>Camera 1</h1>
        <img src="/stream/cam1" width="400"/>
    `);
});

app.listen(3000, () => {
    console.log("🚀 Server rodando");
});
