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

// Твои доступы к облачному хранилищу JSONBin
const BIN_ID = '6ad3abcaffd5d1605373fc9c';
const MASTER_KEY = '$2a$10$W4IcAYWUgRSWshJcI/P2n.favya0zi28amoU4n.K4Rhrq4az8yXMW';
const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// Массив для истории
let signalsHistory = [];

// 1. Функция загрузки истории при старте сервера
async function loadHistory() {
  try {
    const response = await fetch(BIN_URL, {
      headers: { 'X-Master-Key': MASTER_KEY }
    });
    if (response.ok) {
      const data = await response.json();
      // Достаем массив history из структуры JSONBin
      signalsHistory = data.record.history || [];
      console.log('✅ История успешно загружена из облака! Записей:', signalsHistory.length);
    }
  } catch (err) {
    console.error('Ошибка при загрузке истории:', err);
  }
}

// 2. Функция сохранения изменений в облако
async function saveHistory() {
  try {
    await fetch(BIN_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': MASTER_KEY
      },
      body: JSON.stringify({ history: signalsHistory })
    });
    console.log('☁️ Изменения сохранены в облако.');
  } catch (err) {
    console.error('Ошибка при сохранении:', err);
  }
}

// Загружаем данные сразу при включении сервера
loadHistory();

io.on('connection', (socket) => {
  console.log('Подключен клиент:', socket.id);

  // Отправляем загруженную историю новому пользователю
  socket.emit('history_update', signalsHistory);

  // Новый сигнал
  socket.on('send_signal', async (signalData) => {
    const newSignal = {
      id: Date.now().toString(),
      match: signalData.match,
      bet: signalData.bet,
      odds: signalData.odds,
      amount: signalData.amount,
      status: 'pending',
      time: new Date().toLocaleString('ru-RU', { 
        timeZone: 'Europe/Moscow', 
        hour: '2-digit', 
        minute: '2-digit', 
        day: '2-digit', 
        month: '2-digit' 
      })
    };

    signalsHistory.unshift(newSignal);
    if (signalsHistory.length > 100) signalsHistory.pop(); // Храним только 100 последних

    io.emit('new_signal', newSignal);
    io.emit('history_update', signalsHistory);
    
    // Сохраняем в облако
    await saveHistory();
  });

  // Изменение статуса
  socket.on('update_status', async ({ id, status }) => {
    const signal = signalsHistory.find(s => s.id === id);
    if (signal) {
      signal.status = status;
      io.emit('history_update', signalsHistory);
      await saveHistory();
    }
  });

  // Удаление сигнала
  socket.on('delete_signal', async (id) => {
    signalsHistory = signalsHistory.filter(s => s.id !== id);
    io.emit('history_update', signalsHistory);
    await saveHistory();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
