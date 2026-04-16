const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// ================= CONFIG =================
const PORT = 3000;
const SAVE_INTERVAL = 5000;
const FOLDER_ID = '1sfUnu5aBtu3U4tF-6gI51GMhyJauYDyn';

// ================= GOOGLE DRIVE =================
const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/drive']
);

const drive = google.drive({
    version: 'v3',
    auth
});

// ================= EXPRESS =================
app.use(express.raw({ type: '*/*', limit: '5mb' }));

// ================= ARMAZENAMENTO =================
let frames = {
    cam1: { img: null, last: 0 },
    cam2: { img: null, last: 0 }
};

let lastSave = {
    cam1: 0,
    cam2: 0
};

// ================= UPLOAD DRIVE =================
async function uploadToDrive(buffer, cam) {
    try {
        const filename = `cam_${cam}_${Date.now()}.jpg`;
        const filepath = path.join(__dirname, filename);

        fs.writeFileSync(filepath, buffer);

        await drive.files.create({
            requestBody: {
                name: filename,
                parents: [FOLDER_ID]
            },
            media: {
                mimeType: 'image/jpeg',
                body: fs.createReadStream(filepath)
            }
        });

        fs.unlinkSync(filepath);

        console.log("Salvo no Drive:", filename);

    } catch (err) {
        console.log("Erro Drive:", err.message);
    }
}

// ================= RECEBER FRAME =================
app.post('/upload/:cam', async (req, res) => {
    const cam = req.params.cam;

    if (!frames[cam]) return res.sendStatus(404);

    if (!req.body || req.body.length === 0) {
        return res.sendStatus(400);
    }

    frames[cam].img = req.body;
    frames[cam].last = Date.now();

    console.log("Frame:", cam, req.body.length);

    const now = Date.now();
    if (now - lastSave[cam] > SAVE_INTERVAL) {
        lastSave[cam] = now;
        uploadToDrive(req.body, cam);
    }

    res.sendStatus(200);
});

// ================= STREAM =================
app.get('/stream/:cam', (req, res) => {
    const cam = req.params.cam;

    res.writeHead(200, {
        'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    const interval = setInterval(() => {
        const now = Date.now();

        if (!frames[cam].img || now - frames[cam].last > 10000) {
            const text = Buffer.from("SEM SINAL");
            res.write(`--frame\r\n`);
            res.write(`Content-Type: text/plain\r\n\r\n`);
            res.write(text);
            res.write(`\r\n`);
            return;
        }

        res.write(`--frame\r\n`);
        res.write(`Content-Type: image/jpeg\r\n\r\n`);
        res.write(frames[cam].img);
        res.write(`\r\n`);

    }, 120);

    req.on('close', () => clearInterval(interval));
});

// ================= FRONT =================
app.get('/', (req, res) => {
    res.send(`
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { margin:0; font-family: Arial; background:#111; color:white; }
            .cam { margin:10px; }
            img { width:100%; border-radius:10px; }
        </style>
    </head>
    <body>

        <div class="cam">
            <h2>Camera 1</h2>
            <img src="/stream/cam1" onclick="openFull('/stream/cam1')">
        </div>

        <div class="cam">
            <h2>Camera 2</h2>
            <img src="/stream/cam2" onclick="openFull('/stream/cam2')">
        </div>

        <script>
            function openFull(src){
                window.open(src, "_blank");
            }
        </script>

    </body>
    </html>
    `);
});

// ================= START =================
app.listen(PORT, () => {
    console.log("Servidor rodando na porta", PORT);
});
