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
const debugBtn = document.getElementById('debugBtn');
const debugModal = document.getElementById('debugModal');
const debugCloseBtn = document.getElementById('debugCloseBtn');
const debugCopyBtn = document.getElementById('debugCopyBtn');
const debugLogs = document.getElementById('debugLogs');

// ================================
// Debug Logger
// ================================
const debugLogger = {
  logs: [],
  maxLogs: 100,

  log: function(message, data = null) {
    const timestamp = new Date().toLocaleTimeString('ko-KR');
    const logEntry = {
      timestamp,
      message,
      data: data ? JSON.stringify(data, null, 2) : null
    };

    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 원래 console.log도 호출
    if (data) {
      console.log(`[${timestamp}] ${message}`, data);
    } else {
      console.log(`[${timestamp}] ${message}`);
    }
  },

  getLogs: function() {
    return this.logs.map(log => {
      let text = `[${log.timestamp}] ${log.message}`;
      if (log.data) {
        text += `\n${log.data}`;
      }
      return text;
    }).join('\n\n');
  },

  clear: function() {
    this.logs = [];
  }
};

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

  debugLogger.log('[Adding message]', {
    nickname,
    isMine,
    containerExists: !!messagesContainer,
    containerHeight: messagesContainer.offsetHeight,
    containerScrollHeight: messagesContainer.scrollHeight,
    messageElType: messageEl.tagName
  });

  // 항상 appendChild 사용 (모바일 호환성)
  messagesContainer.appendChild(messageEl);

  // 모바일에서 강제 리플로우 (렌더링 보장)
  void messagesContainer.offsetHeight;

  debugLogger.log('[After append]', {
    childCount: messagesContainer.children.length,
    scrollHeight: messagesContainer.scrollHeight,
    offsetHeight: messagesContainer.offsetHeight
  });

  // 본인 메시지는 항상 스크롤
  // 타인 메시지는 스크롤이 최하단에 있을 때만 스크롤
  if (isMine) {
    scrollToBottom();
  } else {
    scrollToBottomIfAtBottom();
  }
}

// ================================
// System Message Component
// ================================
function addSystemMessage(message) {
  const div = document.createElement('div');
  div.className = 'message--system';
  div.textContent = message;

  // 항상 appendChild 사용 (모바일 호환성)
  messagesContainer.appendChild(div);

  scrollToBottom();
}

// ================================
// Utility Functions
// ================================
function isScrollAtBottom() {
  const threshold = 100; // 100px 이내면 최하단으로 간주
  const scrollTop = messagesContainer.scrollTop;
  const scrollHeight = messagesContainer.scrollHeight;
  const clientHeight = messagesContainer.clientHeight;
  return scrollHeight - scrollTop - clientHeight < threshold;
}

function scrollToBottom() {
  debugLogger.log('[Scroll to bottom]', {
    currentScrollTop: messagesContainer.scrollTop,
    scrollHeight: messagesContainer.scrollHeight,
    clientHeight: messagesContainer.clientHeight
  });

  // 모바일 성능 개선: requestAnimationFrame 사용
  requestAnimationFrame(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    debugLogger.log('[After scroll]', {
      newScrollTop: messagesContainer.scrollTop,
      scrollHeight: messagesContainer.scrollHeight
    });
  });

  // 모바일 Safari 대비 fallback
  setTimeout(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, 50);
}

function scrollToBottomIfAtBottom() {
  if (isScrollAtBottom()) {
    scrollToBottom();
  }
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

  // 모바일에서 키보드 유지를 위해 포커스 유지
  messageInput.focus();
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
let keyboardVisible = false;
let wasAtBottom = true;

// 스크롤 위치 추적
let lastScrollLog = 0;
messagesContainer.addEventListener('scroll', () => {
  wasAtBottom = isScrollAtBottom();

  // 로그 스팸 방지: 500ms마다 한 번만
  const now = Date.now();
  if (now - lastScrollLog > 500) {
    debugLogger.log('[Scroll event]', {
      scrollTop: messagesContainer.scrollTop,
      scrollHeight: messagesContainer.scrollHeight,
      clientHeight: messagesContainer.clientHeight,
      wasAtBottom
    });
    lastScrollLog = now;
  }
});

if ('visualViewport' in window) {
  // visualViewport resize 이벤트 (iOS Safari 전용)
  window.visualViewport.addEventListener('resize', () => {
    const inputContainer = document.querySelector('.input-container');
    const viewportHeight = window.visualViewport.height;
    const windowHeight = window.innerHeight;
    const offsetY = windowHeight - viewportHeight;

    debugLogger.log('[Keyboard event]', {
      viewportHeight,
      windowHeight,
      offsetY,
      keyboardVisible: offsetY > 0
    });

    if (offsetY > 0) {
      // 키보드가 올라온 경우
      keyboardVisible = true;

      // 입력창을 키보드 위로 이동
      inputContainer.style.transform = `translateY(-${offsetY}px)`;

      // 키보드 올라올 때 스크롤이 최하단이었다면 유지
      if (wasAtBottom) {
        setTimeout(() => {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
      }
    } else {
      // 키보드가 내려간 경우
      keyboardVisible = false;
      inputContainer.style.transform = '';
    }
  });

  // visualViewport scroll 이벤트 (스크롤 위치 보정)
  window.visualViewport.addEventListener('scroll', (e) => {
    const pageTop = window.visualViewport.pageTop;

    debugLogger.log('[Viewport scroll]', {
      pageTop: pageTop,
      pageLeft: window.visualViewport.pageLeft
    });

    // 모바일에서 페이지가 스크롤되는 것을 방지
    if (pageTop !== 0) {
      e.preventDefault();
      window.scrollTo(0, 0);
    }
  }, { passive: false });
} else {
  // visualViewport 미지원 브라우저 (Android Chrome 등)
  debugLogger.log('[visualViewport not supported]', {
    userAgent: navigator.userAgent
  });
}

// 키보드 바깥 영역 터치 시 키보드 닫기
messagesContainer.addEventListener('touchstart', () => {
  if (keyboardVisible && document.activeElement === messageInput) {
    messageInput.blur();
  }
});

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

// Debug Modal
debugBtn.addEventListener('click', () => {
  debugLogs.textContent = debugLogger.getLogs() || '로그가 없습니다.';
  debugModal.classList.add('debug-modal--active');
  document.body.style.overflow = 'hidden';
});

debugCloseBtn.addEventListener('click', () => {
  debugModal.classList.remove('debug-modal--active');
  document.body.style.overflow = '';
});

debugCopyBtn.addEventListener('click', async () => {
  const logs = debugLogger.getLogs();
  try {
    // Clipboard API 사용
    await navigator.clipboard.writeText(logs);

    // 성공 피드백
    const originalText = debugCopyBtn.textContent;
    debugCopyBtn.textContent = '✓ 복사됨';
    debugCopyBtn.style.backgroundColor = '#4CAF50';
    debugCopyBtn.style.color = 'white';

    setTimeout(() => {
      debugCopyBtn.textContent = originalText;
      debugCopyBtn.style.backgroundColor = '';
      debugCopyBtn.style.color = '';
    }, 2000);
  } catch (err) {
    // Clipboard API 실패 시 fallback
    const textArea = document.createElement('textarea');
    textArea.value = logs;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      debugCopyBtn.textContent = '✓ 복사됨';
      setTimeout(() => {
        debugCopyBtn.textContent = '복사';
      }, 2000);
    } catch (e) {
      debugCopyBtn.textContent = '복사 실패';
      setTimeout(() => {
        debugCopyBtn.textContent = '복사';
      }, 2000);
    }

    document.body.removeChild(textArea);
  }
});

document.querySelector('.debug-modal__overlay').addEventListener('click', () => {
  debugModal.classList.remove('debug-modal--active');
  document.body.style.overflow = '';
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
// DOM 로드 완료 후 초기화
function initializeLayout() {
  debugLogger.log('[Initializing layout]');

  // 입력창 높이 계산하여 messages-container에 padding-bottom 설정
  const inputContainer = document.querySelector('.input-container');
  const inputHeight = inputContainer.offsetHeight;
  messagesContainer.style.paddingBottom = `${inputHeight + 20}px`;

  debugLogger.log('[Messages container]', {
    exists: !!messagesContainer,
    width: messagesContainer.offsetWidth,
    height: messagesContainer.offsetHeight,
    scrollHeight: messagesContainer.scrollHeight,
    paddingBottom: messagesContainer.style.paddingBottom,
    inputHeight: inputHeight,
    display: window.getComputedStyle(messagesContainer).display,
    overflow: window.getComputedStyle(messagesContainer).overflow,
    position: window.getComputedStyle(messagesContainer).position
  });
}

// 창 크기 변경 시 레이아웃 재계산
window.addEventListener('resize', () => {
  const inputContainer = document.querySelector('.input-container');
  const inputHeight = inputContainer.offsetHeight;
  messagesContainer.style.paddingBottom = `${inputHeight + 20}px`;

  debugLogger.log('[Window resized]', {
    width: window.innerWidth,
    height: window.innerHeight,
    inputHeight: inputHeight,
    newPaddingBottom: messagesContainer.style.paddingBottom
  });
});

// DOM 로드 완료 후 레이아웃 초기화 및 환영 메시지
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeLayout();
    // DOM이 완전히 로드된 후 환영 메시지 추가
    setTimeout(() => {
      addSystemMessage('채팅방에 오신 것을 환영합니다!');
    }, 100);
  });
} else {
  initializeLayout();
  // 이미 로드된 경우 바로 추가
  setTimeout(() => {
    addSystemMessage('채팅방에 오신 것을 환영합니다!');
  }, 100);
}
