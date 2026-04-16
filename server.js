const express = require('express');
const app = express();

let lastFrame = null;

// RECEBE IMAGEM DA ESP32
app.post('/upload/cam1', express.raw({ type: 'image/jpeg', limit: '5mb' }), (req, res) => {
    lastFrame = req.body;
    console.log("📸 Frame recebido:", req.body.length, "bytes");
    res.sendStatus(200);
});

// RETORNA IMAGEM
app.get('/cam1', (req, res) => {
    if (!lastFrame) {
        return res.send("Aguardando imagem...");
    }
    res.set('Content-Type', 'image/jpeg');
    res.send(lastFrame);
});

// PÁGINA WEB (SIMULA STREAM)
app.get('/', (req, res) => {
    res.send(`
        <h2>Camera 1</h2>
        <img id="cam" width="400"/>
        <script>
            setInterval(() => {
                document.getElementById('cam').src = '/cam1?' + new Date().getTime();
            }, 1000);
        </script>
    `);
});

app.listen(3000, () => console.log("🚀 Servidor rodando"));
