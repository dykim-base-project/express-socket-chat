# 💬 Express Socket Chat

실시간 웹소켓 채팅 애플리케이션입니다. 카카오톡과 유사한 UI/UX를 제공하며, 경량화된 서버 구조로 설계되었습니다.

## 📋 프로젝트 소개

Express.js와 Socket.IO를 활용한 실시간 채팅 웹 애플리케이션입니다.
초보자도 쉽게 이해할 수 있도록 바닐라 코딩으로 작성되었으며, 서버는 최소한의 상태만 관리하고 채팅 데이터는 클라이언트 브라우저에서 관리하는 경량 구조입니다.

## 🎯 주요 기능

### 채팅 기능
- ✅ 실시간 메시지 송수신
- ✅ 닉네임 중복 방지
- ✅ 입장/퇴장 알림
- ✅ 카카오톡 스타일 UI (나: 노란색, 상대방: 랜덤 색상)
- ✅ 타임스탬프 표시

### 사용자 경험
- ✅ 브라우저 백그라운드 시 데스크톱 알림
- ✅ 읽지 않은 메시지 카운트 표시
- ✅ 새로고침 시 로그인 상태 유지
- ✅ 새로고침 감지 (불필요한 입장/퇴장 알림 방지)
- ✅ 채팅창 클리어 기능

### 입력 편의성
- ✅ Enter: 메시지 전송
- ✅ Shift + Enter: 줄바꿈
- ✅ 맥북 한글 입력 버그 수정 (IME 조합 처리)
- ✅ 입력창 자동 높이 조절

## 🛠 기술 스택

### Backend
- **Node.js** (v20)
- **Express.js** (v5.1.0) - 웹 서버
- **Socket.IO** (v4.8.1) - 실시간 양방향 통신

### Frontend
- **Vanilla JavaScript** - 프레임워크 없이 순수 JS로 구현
- **HTML5 / CSS3** - 반응형 웹 디자인
- **WebSocket** - Socket.IO 클라이언트

### DevOps
- **Docker** - 컨테이너화
- **Git** - 버전 관리

## 📦 프로젝트 구조

```
express-socket-chat/
├── server.js              # Express + Socket.IO 서버
├── package.json           # 프로젝트 의존성
├── Dockerfile            # 도커 이미지 빌드 설정
├── .dockerignore         # 도커 빌드 제외 파일
├── .gitignore            # Git 제외 파일
└── public/
    ├── index.html        # 닉네임 입력 페이지
    └── chat.html         # 채팅방 페이지
```

## 🚀 실행 방법

### 1. 로컬 환경 실행

#### 사전 요구사항
- Node.js 20 이상

#### 설치 및 실행
```bash
# 저장소 클론
git clone <repository-url>
cd express-socket-chat

# 의존성 설치
npm install

# 서버 실행
npm start
```

서버가 실행되면 브라우저에서 `http://localhost:3000` 으로 접속하세요.

### 2. Docker 환경 실행

#### 사전 요구사항
- Docker Desktop 또는 Rancher Desktop

#### Docker 빌드 및 실행
```bash
# 도커 이미지 빌드
docker build -t express-socket-chat .

# 도커 컨테이너 실행
docker run -d -p 3000:3000 --name chat-app express-socket-chat

# 컨테이너 로그 확인
docker logs chat-app

# 컨테이너 중지
docker stop chat-app

# 컨테이너 삭제
docker rm chat-app
```

서버가 실행되면 브라우저에서 `http://localhost:3000` 으로 접속하세요.

#### 포트 변경
다른 포트를 사용하려면 `-p` 옵션을 변경하세요:
```bash
docker run -d -p 8080:3000 --name chat-app express-socket-chat
# 브라우저에서 http://localhost:8080 으로 접속
```

## 💡 사용 방법

1. **닉네임 입력**: 최초 접속 시 원하는 닉네임을 입력하세요 (중복 불가)
2. **채팅 시작**: 입장 후 메시지를 입력하고 Enter를 눌러 전송하세요
3. **여러 창 테스트**: 시크릿 모드나 다른 브라우저로 추가 접속하여 채팅을 테스트할 수 있습니다

## 🎨 주요 특징

### 경량 설계
- 서버는 소켓 연결과 사용자 닉네임만 관리
- 채팅 히스토리는 각 클라이언트 브라우저에서 관리
- DB 없이 동작하여 빠른 배포 가능

### 새로고침 최적화
- 3초 내 재연결 시 새로고침으로 감지
- 불필요한 입장/퇴장 알림 방지
- 로컬스토리지를 활용한 세션 유지

### 알림 시스템
- 브라우저 백그라운드 시 데스크톱 알림 자동 발송
- 페이지 타이틀에 읽지 않은 메시지 카운트 표시
- 알림 클릭 시 채팅창으로 자동 포커스

## 🌐 배포

### PaaS 배포 (Heroku, Railway, Render 등)
환경 변수 `PORT`가 자동으로 설정되며, 서버가 `0.0.0.0`에서 실행되어 외부 접근이 가능합니다.

### Docker 기반 배포
Dockerfile이 포함되어 있어 컨테이너 기반 배포 플랫폼에서 바로 사용할 수 있습니다.

## 📝 라이선스

ISC

## 👨‍💻 개발자

토이 프로젝트 / 포트폴리오용

---

**Note**: 이 프로젝트는 학습 및 포트폴리오 목적으로 제작되었습니다. 프로덕션 환경에서 사용하려면 인증, DB 연동, 보안 강화 등의 추가 작업이 필요합니다.
