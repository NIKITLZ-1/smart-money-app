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

// Массив для хранения истории сигналов
let signalsHistory = [];

io.on('connection', (socket) => {
  console.log('Подключен клиент:', socket.id);

  // При входе сразу отправляем пользователю текущую историю
  socket.emit('history_update', signalsHistory);

  // Когда админ отправляет новый сигнал
  socket.on('send_signal', (signalData) => {
    const newSignal = {
      id: Date.now().toString(), // Уникальный номер сигнала
      match: signalData.match,
      bet: signalData.bet,
      odds: signalData.odds,
      amount: signalData.amount,
      status: 'pending', // Статусы: 'pending' (В игре), 'win' (Выигрыш), 'loss' (Проигрыш), 'refund' (Возврат)
      time: new Date().toLocaleString('ru-RU', { 
        timeZone: 'Europe/Moscow', 
        hour: '2-digit', 
        minute: '2-digit', 
        day: '2-digit', 
        month: '2-digit' 
      })
    };

    // Добавляем новый сигнал в самое начало списка
    signalsHistory.unshift(newSignal);
    
    // Храним последние 100 сигналов
    if (signalsHistory.length > 100) signalsHistory.pop();

    // Показываем всплывающее уведомление тем, кто сейчас в приложении
    io.emit('new_signal', newSignal);
    // Обновляем вкладку "История" у всех пользователей и в админке
    io.emit('history_update', signalsHistory);
  });

  // Когда админ меняет статус ставки (Выигрыш / Проигрыш / Возврат)
  socket.on('update_status', ({ id, status }) => {
    const signal = signalsHistory.find(s => s.id === id);
    if (signal) {
      signal.status = status;
      io.emit('history_update', signalsHistory);
    }
  });

  // Когда админ удаляет сигнал
  socket.on('delete_signal', (id) => {
    signalsHistory = signalsHistory.filter(s => s.id !== id);
    io.emit('history_update', signalsHistory);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер успешно запущен на порту ${PORT}`);
});