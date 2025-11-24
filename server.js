const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// 정적 파일 제공
app.use(express.static('public'));

// 현재 접속한 사용자 목록 (닉네임 중복 방지)
const users = new Map(); // socketId -> nickname

// 재연결 유예 시간 관리 (새로고침 감지)
const disconnectTimers = new Map(); // nickname -> timeout

// 메인 페이지 (닉네임 입력)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// 채팅방 페이지
app.get('/chat', (req, res) => {
  res.sendFile(__dirname + '/public/chat.html');
});

// Socket.IO 연결 처리
io.on('connection', (socket) => {
  console.log('사용자 연결됨:', socket.id);

  // 닉네임 설정 및 중복 확인
  socket.on('set nickname', (nickname) => {
    // 닉네임 중복 확인
    const existingNickname = Array.from(users.values()).find(
      (nick) => nick === nickname
    );

    if (existingNickname) {
      // 중복된 닉네임
      socket.emit('nickname response', { success: false, message: '이미 사용 중인 닉네임입니다.' });
    } else {
      // 닉네임 등록 성공
      users.set(socket.id, nickname);
      socket.emit('nickname response', { success: true, nickname: nickname });

      // 다른 사용자들에게 입장 알림
      socket.broadcast.emit('user joined', { nickname: nickname });

      console.log(`${nickname} 님이 입장하셨습니다.`);
    }
  });

  // 재연결 시 닉네임 복구
  socket.on('reconnect nickname', (nickname) => {
    // 이미 같은 소켓ID에 닉네임이 있으면 무시
    if (users.get(socket.id) === nickname) {
      return;
    }

    // 다른 소켓에서 같은 닉네임 사용 중인지 확인
    const existingSocketId = Array.from(users.entries()).find(
      ([id, nick]) => nick === nickname && id !== socket.id
    );

    if (!existingSocketId) {
      // 재연결 타이머가 있으면 취소 (새로고침으로 빠르게 재접속)
      const timer = disconnectTimers.get(nickname);
      const isQuickReconnect = !!timer;

      if (timer) {
        clearTimeout(timer);
        disconnectTimers.delete(nickname);
      }

      users.set(socket.id, nickname);
      socket.emit('nickname response', { success: true, nickname: nickname });

      // 빠른 재연결(새로고침)이 아닌 경우만 입장 알림
      if (!isQuickReconnect) {
        socket.broadcast.emit('user joined', { nickname: nickname });
        console.log(`${nickname} 님이 입장하셨습니다.`);
      } else {
        console.log(`${nickname} 님이 재연결하셨습니다. (새로고침)`);
      }
    }
  });

  // 채팅 메시지 수신 및 브로드캐스트
  socket.on('chat message', (data) => {
    const nickname = users.get(socket.id);
    if (nickname) {
      // 본인 제외한 모든 사용자에게 메시지 전송
      socket.broadcast.emit('chat message', {
        nickname: nickname,
        message: data.message,
        timestamp: data.timestamp
      });
    }
  });

  // 연결 해제
  socket.on('disconnect', () => {
    const nickname = users.get(socket.id);
    if (nickname) {
      users.delete(socket.id);

      // 3초 유예 시간 설정 (새로고침 감지)
      const timer = setTimeout(() => {
        // 3초 내에 재연결하지 않으면 퇴장 알림
        disconnectTimers.delete(nickname);
        socket.broadcast.emit('user left', { nickname: nickname });
        console.log(`${nickname} 님이 퇴장하셨습니다.`);
      }, 3000);

      disconnectTimers.set(nickname, timer);
    }
  });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // 모든 IP에서 접근 허용 (도커 환경 대응)

server.listen(PORT, HOST, () => {
  console.log(`서버가 http://${HOST}:${PORT} 에서 실행 중입니다.`);
  console.log(`로컬에서는 http://localhost:${PORT} 로 접속하세요.`);
});
