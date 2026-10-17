const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(express.static(__dirname));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('Кто-то подключился! ID:', socket.id);

  socket.on('send_signal', (signalData) => {
    console.log('Пришел сигнал от админа, рассылаю всем:', signalData);
    io.emit('new_signal', signalData);
  });

  socket.on('disconnect', () => {
    console.log('Пользователь отключился:', socket.id);
  });
});

// Облачный сервер сам подставит нужный порт, а на ноутбуке останется 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер успешно запущен на порту ${PORT}`);
});