const express = require('express');
const app = express();

app.use(express.json({ limit: '5mb' }));

let frames = {
    cam1: null,
    cam2: null
};

// ================= RECEBER IMAGEM DA ESP =================
app.post('/upload/:cam', (req, res) => {
    const cam = req.params.cam;

    if (!req.body.image) {
        return res.sendStatus(400);
    }

    const img = Buffer.from(req.body.image, 'base64');
    frames[cam] = img;

    res.sendStatus(200);
});

// ================= STREAM MJPEG =================
app.get('/stream/:cam', (req, res) => {
    const cam = req.params.cam;

    res.writeHead(200, {
        'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Pragma': 'no-cache'
    });

    const interval = setInterval(() => {
        if (frames[cam]) {
            res.write(`--frame\r\n`);
            res.write(`Content-Type: image/jpeg\r\n\r\n`);
            res.write(frames[cam]);
            res.write(`\r\n`);
        }
    }, 100); // 10 FPS tentativa

    req.on('close', () => {
        clearInterval(interval);
    });
});

// ================= PÁGINA SIMPLES =================
app.get('/', (req, res) => {
    res.send(`
        <h1>Camera 1</h1>
        <img src="/stream/cam1" width="400"/>
        <h1>Camera 2</h1>
        <img src="/stream/cam2" width="400"/>
    `);
});

app.listen(3000, () => {
    console.log("🚀 MJPEG server rodando");
});
