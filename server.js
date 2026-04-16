render  

const express = require('express');
const app = express();

// ACEITA BINÁRIO
app.use(express.raw({ type: '*/*', limit: '5mb' }));

let frames = {
    cam1: { img: null, last: 0 },
    cam2: { img: null, last: 0 }
};

// ================= RECEBE FRAME =================
app.post('/upload/:cam', (req, res) => {
    const cam = req.params.cam;

    if (!frames[cam]) return res.sendStatus(404);

    if (!req.body || req.body.length === 0) {
        return res.sendStatus(400);
    }

    frames[cam].img = req.body;
    frames[cam].last = Date.now();

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
        const data = frames[cam];

        if (!data) return;

        const offline = (Date.now() - data.last) > 10000;

        if (!offline && data.img) {
            res.write(`--frame\r\n`);
            res.write(`Content-Type: image/jpeg\r\n\r\n`);
            res.write(data.img);
            res.write(`\r\n`);
        }
    }, 100);

    req.on('close', () => clearInterval(interval));
});

// ================= STATUS =================
app.get('/status/:cam', (req, res) => {
    const cam = req.params.cam;

    if (!frames[cam]) return res.json({ online: false });

    const offline = (Date.now() - frames[cam].last) > 10000;

    res.json({ online: !offline });
});

// ================= FRONT =================
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body {
    margin: 0;
    background: #111;
    color: white;
    font-family: Arial;
}

.container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px;
}

.cam {
    position: relative;
}

img {
    width: 100%;
    border-radius: 10px;
    cursor: pointer;
}

.status {
    position: absolute;
    top: 10px;
    left: 10px;
    background: red;
    padding: 5px 10px;
    border-radius: 5px;
    font-size: 14px;
}

.hidden {
    display: none;
}

/* DESKTOP */
@media(min-width: 800px){
    .container {
        flex-direction: row;
    }
    .cam {
        flex: 1;
    }
}

/* FULLSCREEN */
.fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: black;
    z-index: 999;
}

.fullscreen img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}
</style>
</head>

<body>

<div class="container">

    <div class="cam" onclick="expand(this)">
        <div class="status hidden" id="status_cam1">OFFLINE</div>
        <img src="/stream/cam1">
    </div>

    <div class="cam" onclick="expand(this)">
        <div class="status hidden" id="status_cam2">OFFLINE</div>
        <img src="/stream/cam2">
    </div>

</div>

<script>
function checkStatus(cam){
    fetch('/status/' + cam)
    .then(r => r.json())
    .then(data => {
        const el = document.getElementById("status_" + cam);
        if(data.online){
            el.classList.add("hidden");
        } else {
            el.classList.remove("hidden");
        }
    });
}

// verifica a cada 3s
setInterval(() => {
    checkStatus("cam1");
    checkStatus("cam2");
}, 3000);

// fullscreen toggle
function expand(el){
    if(el.classList.contains('fullscreen')){
        el.classList.remove('fullscreen');
    } else {
        el.classList.add('fullscreen');
    }
}
</script>

</body>
</html>
`);
});

app.listen(3000, () => {
    console.log("Server rodando com 2 cameras");
});
