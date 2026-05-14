# IVR TTS/MRCP Prototype

미래에셋증권 IVR 프로젝트를 설명하기 위한 웹 시뮬레이터입니다.

## 실행

```powershell
node server.mjs
```

브라우저에서 아래 주소를 엽니다.

```text
http://127.0.0.1:4279
```

## 기능

- Avaya EP IVR 콜 인입 흐름 시뮬레이션
- DTMF 번호 입력에 따른 계좌조회, 주문조회, 이체, 시세, 사고신고, 상담원 연결 분기
- TTS 안내문 표시 및 브라우저 음성 합성 재생
- MRCP `SPEAK`, `SPEAK-COMPLETE`, DTMF 이벤트 로그 표시
- 업무 큐 라우팅 및 시나리오 단계 표시
