/**
 * Chat Application Main Script
 * Component-based architecture for React/Vue migration
 */

// ================================
// State Management
// ================================
const socket = io();
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const exitBtn = document.getElementById('exitBtn');
const chatTitle = document.getElementById('chatTitle');

// ================================
// User State
// ================================
const myNickname = localStorage.getItem('chatNickname');
if (!myNickname) {
  window.location.href = '/';
} else {
  chatTitle.textContent = `${myNickname}님의 채팅방`;
  socket.emit('reconnect nickname', myNickname);
}

// ================================
// Notification State
// ================================
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

let isPageVisible = !document.hidden;
let originalTitle = document.title;
let unreadCount = 0;

// ================================
// User Colors (Component State)
// ================================
const userColors = new Map();
const colors = [
  '#8B7FFF', '#FF6B9D', '#4ECDC4', '#FF8B6A',
  '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3'
];

function getUserColor(nickname) {
  if (!userColors.has(nickname)) {
    const randomColor = colors[userColors.size % colors.length];
    userColors.set(nickname, randomColor);
  }
  return userColors.get(nickname);
}

// ================================
// Message Component
// ================================
function createMessageElement(nickname, message, timestamp, isMine = false) {
  const wrapper = document.createElement('div');
  wrapper.className = isMine ? 'message message--mine' : 'message message--others';

  const content = document.createElement('div');
  content.className = 'message__content';

  if (!isMine) {
    const nicknameEl = document.createElement('div');
    nicknameEl.className = 'message__nickname';
    nicknameEl.textContent = nickname;
    content.appendChild(nicknameEl);
  }

  const bubble = document.createElement('div');
  bubble.className = 'message__bubble';
  bubble.textContent = message;

  if (!isMine) {
    bubble.style.background = getUserColor(nickname);
    bubble.style.color = 'white';
  }

  content.appendChild(bubble);
  wrapper.appendChild(content);

  const time = document.createElement('div');
  time.className = 'message__timestamp';
  time.textContent = timestamp;
  wrapper.appendChild(time);

  return wrapper;
}

function addMessage(nickname, message, timestamp, isMine = false) {
  const messageEl = createMessageElement(nickname, message, timestamp, isMine);
  messagesContainer.appendChild(messageEl);
  scrollToBottom();
}

// ================================
// System Message Component
// ================================
function addSystemMessage(message) {
  const div = document.createElement('div');
  div.className = 'message--system';
  div.textContent = message;
  messagesContainer.appendChild(div);
  scrollToBottom();
}

// ================================
// Utility Functions
// ================================
function scrollToBottom() {
  // 모바일 성능 개선: requestAnimationFrame 사용
  requestAnimationFrame(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

function getCurrentTime() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? '오후' : '오전';
  const displayHours = hours % 12 || 12;
  return `${ampm} ${displayHours}:${minutes.toString().padStart(2, '0')}`;
}

// ================================
// Message Actions
// ================================
function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  const timestamp = getCurrentTime();

  addMessage(myNickname, message, timestamp, true);

  socket.emit('chat message', {
    message: message,
    timestamp: timestamp
  });

  messageInput.value = '';
  messageInput.style.height = 'auto';
}

// ================================
// Event Handlers
// ================================
sendBtn.addEventListener('click', sendMessage);

// Enter key handler (with IME support)
let isComposing = false;

messageInput.addEventListener('compositionstart', () => {
  isComposing = true;
});

messageInput.addEventListener('compositionend', () => {
  isComposing = false;
});

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-resize textarea
messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = messageInput.scrollHeight + 'px';
});

// Mobile keyboard support - iOS 개선
messageInput.addEventListener('focus', () => {
  // 입력창 포커스 시 화면 스크롤 및 입력창이 보이도록 조정
  setTimeout(() => {
    messageInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 300);
});

// iOS 키보드 대응 개선
if ('visualViewport' in window) {
  let lastHeight = window.visualViewport.height;

  window.visualViewport.addEventListener('resize', () => {
    const currentHeight = window.visualViewport.height;
    const chatContainer = document.querySelector('.chat-container');

    // 키보드가 올라오는 경우 (높이가 줄어듦)
    if (currentHeight < lastHeight) {
      // 컨테이너 높이를 현재 뷰포트에 맞춤
      if (chatContainer) {
        chatContainer.style.height = `${currentHeight}px`;
      }

      // 입력창이 보이도록 스크롤
      setTimeout(() => {
        messageInput.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    } else {
      // 키보드가 내려가는 경우
      if (chatContainer) {
        chatContainer.style.height = '100vh';
      }
    }

    lastHeight = currentHeight;
  });
}

// Clear messages
clearBtn.addEventListener('click', () => {
  if (confirm('채팅 내용을 모두 지우시겠습니까?')) {
    messagesContainer.innerHTML = '';
    addSystemMessage('채팅 내용이 삭제되었습니다.');
  }
});

// Exit
exitBtn.addEventListener('click', () => {
  if (confirm('채팅방을 나가시겠습니까?')) {
    localStorage.removeItem('chatNickname');
    socket.disconnect();
    window.location.href = '/';
  }
});

// ================================
// Notification System
// ================================
function showNotification(nickname, message) {
  if (!isPageVisible && 'Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(`${nickname}`, {
      body: message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'chat-message',
      requireInteraction: false
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    setTimeout(() => notification.close(), 5000);
  }
}

function updateTitleNotification() {
  if (!isPageVisible && unreadCount > 0) {
    document.title = `(${unreadCount}) 새 메시지 - ${originalTitle}`;
  }
}

// ================================
// Page Visibility Tracking
// ================================
document.addEventListener('visibilitychange', () => {
  isPageVisible = !document.hidden;
  if (isPageVisible) {
    unreadCount = 0;
    document.title = originalTitle;
  }
});

window.addEventListener('focus', () => {
  isPageVisible = true;
  unreadCount = 0;
  document.title = originalTitle;
});

window.addEventListener('blur', () => {
  isPageVisible = false;
});

// ================================
// Socket Event Handlers
// ================================
socket.on('chat message', (data) => {
  addMessage(data.nickname, data.message, data.timestamp, false);

  if (!isPageVisible) {
    unreadCount++;
    updateTitleNotification();
    showNotification(data.nickname, data.message);
  }
});

socket.on('user joined', (data) => {
  addSystemMessage(`${data.nickname} 님이 입장하셨습니다.`);
});

socket.on('user left', (data) => {
  addSystemMessage(`${data.nickname} 님이 퇴장하셨습니다.`);
});

socket.on('disconnect', () => {
  addSystemMessage('서버와의 연결이 끊어졌습니다.');
});

socket.on('connect', () => {
  if (myNickname) {
    socket.emit('reconnect nickname', myNickname);
  }
});

// ================================
// Initialize
// ================================
addSystemMessage('채팅방에 오신 것을 환영합니다!');
