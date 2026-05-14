const scenarios = {
  welcome: {
    title: "대표번호 인입 및 초기 안내",
    node: "WELCOME",
    prompt:
      "안녕하십니까, 미래에셋증권입니다. 계좌조회는 1번, 주문 및 체결 조회는 2번, 이체는 3번, 상담원 연결은 0번을 눌러주세요.",
    route: "메인 메뉴",
    mrcp: "SPEAK request queued",
    step: "welcome",
  },
  menu: {
    title: "업무 메뉴 선택 대기",
    node: "MAIN_MENU",
    prompt: "원하시는 업무 번호를 눌러주세요. 안내를 다시 들으시려면 우물정자를 눌러주세요.",
    route: "DTMF 수집",
    mrcp: "RECOGNIZE waiting DTMF",
    step: "menu",
  },
  account: {
    title: "계좌조회 TTS 안내",
    node: "ACCOUNT_INQUIRY",
    prompt:
      "계좌조회를 선택하셨습니다. 본인 확인 후 잔고와 거래내역을 음성으로 안내합니다.",
    route: "계좌조회 큐",
    mrcp: "SPEAK account-balance prompt",
    step: "tts",
  },
  order: {
    title: "주문/체결 조회 안내",
    node: "ORDER_STATUS",
    prompt:
      "주문 및 체결 조회를 선택하셨습니다. 최근 주문 상태와 체결 결과를 확인합니다.",
    route: "주문조회 큐",
    mrcp: "SPEAK order-status prompt",
    step: "tts",
  },
  transfer: {
    title: "이체 업무 본인인증",
    node: "TRANSFER_AUTH",
    prompt:
      "이체 서비스를 선택하셨습니다. 안전한 거래를 위해 추가 인증 시나리오로 이동합니다.",
    route: "이체 인증 큐",
    mrcp: "SPEAK transfer-auth prompt",
    step: "route",
  },
  market: {
    title: "시세 조회 TTS 생성",
    node: "MARKET_PRICE",
    prompt:
      "시세 조회를 선택하셨습니다. 종목코드를 입력하면 현재가와 등락률을 음성으로 안내합니다.",
    route: "시세조회 큐",
    mrcp: "SPEAK quote prompt",
    step: "tts",
  },
  incident: {
    title: "사고신고 긴급 라우팅",
    node: "INCIDENT_REPORT",
    prompt:
      "사고신고를 선택하셨습니다. 카드 또는 계좌 분실 신고 담당자에게 우선 연결합니다.",
    route: "긴급 상담 큐",
    mrcp: "SPEAK emergency-routing prompt",
    step: "route",
  },
  product: {
    title: "상품상담 연결",
    node: "PRODUCT_CONSULTING",
    prompt:
      "상품상담을 선택하셨습니다. 투자성향 확인 후 전문 상담원에게 연결합니다.",
    route: "상품상담 큐",
    mrcp: "SPEAK product-routing prompt",
    step: "route",
  },
  agent: {
    title: "상담원 연결",
    node: "AGENT_TRANSFER",
    prompt:
      "상담원 연결을 요청하셨습니다. 예상 대기시간을 확인한 뒤 상담원에게 연결합니다.",
    route: "상담원 큐",
    mrcp: "SPEAK agent-transfer prompt",
    step: "monitor",
  },
};

const keyMap = {
  "1": "account",
  "2": "order",
  "3": "transfer",
  "4": "market",
  "5": "incident",
  "6": "product",
  "0": "agent",
};

const els = {
  callStatus: document.querySelector("#callStatus"),
  callerNumber: document.querySelector("#callerNumber"),
  currentNode: document.querySelector("#currentNode"),
  startCall: document.querySelector("#startCall"),
  resetCall: document.querySelector("#resetCall"),
  scenarioTitle: document.querySelector("#scenarioTitle"),
  promptText: document.querySelector("#promptText"),
  mrcpState: document.querySelector("#mrcpState"),
  lastInput: document.querySelector("#lastInput"),
  routeTarget: document.querySelector("#routeTarget"),
  eventLog: document.querySelector("#eventLog"),
  clearLog: document.querySelector("#clearLog"),
  replayVoice: document.querySelector("#replayVoice"),
  speakToggle: document.querySelector("#speakToggle"),
  voiceStatus: document.querySelector("#voiceStatus"),
  keypad: document.querySelector(".keypad"),
  flowSteps: [...document.querySelectorAll(".flow-step")],
};

let callStarted = false;
let currentScenario = "welcome";
let speechEnabled = true;
let availableVoices = [];

function now() {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

function addLog(label, detail) {
  const item = document.createElement("li");
  item.innerHTML = `<time>${now()} · ${label}</time><code>${detail}</code>`;
  els.eventLog.append(item);
}

function setFlow(activeStep) {
  const order = ["welcome", "menu", "tts", "route", "monitor"];
  const activeIndex = order.indexOf(activeStep);

  els.flowSteps.forEach((step) => {
    const stepIndex = order.indexOf(step.dataset.node);
    step.classList.toggle("active", step.dataset.node === activeStep);
    step.classList.toggle("done", stepIndex >= 0 && stepIndex < activeIndex);
  });
}

function updateVoiceStatus(message) {
  els.voiceStatus.textContent = message;
}

function loadVoices() {
  if (!("speechSynthesis" in window)) {
    updateVoiceStatus("이 브라우저는 음성 합성을 지원하지 않습니다");
    return [];
  }

  availableVoices = window.speechSynthesis.getVoices();
  if (availableVoices.length > 0) {
    const koreanVoice = availableVoices.find((voice) => voice.lang.toLowerCase().startsWith("ko"));
    updateVoiceStatus(koreanVoice ? `TTS 준비됨: ${koreanVoice.name}` : "TTS 준비됨: 기본 음성 사용");
  }

  return availableVoices;
}

function getVoice() {
  const voices = availableVoices.length > 0 ? availableVoices : loadVoices();
  return (
    voices.find((voice) => voice.lang.toLowerCase().startsWith("ko")) ||
    voices.find((voice) => voice.default) ||
    voices[0]
  );
}

function speak(text, source = "AUTO") {
  if (!speechEnabled) {
    updateVoiceStatus("음성이 꺼져 있습니다");
    return;
  }

  if (!("speechSynthesis" in window)) {
    updateVoiceStatus("이 브라우저는 음성 합성을 지원하지 않습니다");
    addLog("TTS ERROR", "Web Speech API unsupported");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ko-KR";
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;
  const voice = getVoice();
  if (voice) utterance.voice = voice;
  utterance.onstart = () => updateVoiceStatus(`음성 재생중 (${source})`);
  utterance.onend = () => updateVoiceStatus("음성 재생 완료");
  utterance.onerror = () => {
    updateVoiceStatus("음성 재생 실패: 다시 듣기를 눌러주세요");
    addLog("TTS ERROR", "speechSynthesis error\nTry replay button after user gesture");
  };
  window.speechSynthesis.speak(utterance);
}

function renderScenario(name, input = "-") {
  const scenario = scenarios[name];
  currentScenario = name;

  els.scenarioTitle.textContent = scenario.title;
  els.promptText.textContent = scenario.prompt;
  els.currentNode.textContent = scenario.node;
  els.mrcpState.textContent = "SPEAKING";
  els.lastInput.textContent = input;
  els.routeTarget.textContent = scenario.route;
  setFlow(scenario.step);

  addLog(
    "MRCP SPEAK",
    `C->S ${scenario.mrcp}\nVoice: ko-KR-Female\nText: ${scenario.prompt}`
  );
  speak(scenario.prompt);

  window.setTimeout(() => {
    els.mrcpState.textContent = name === "menu" ? "LISTENING" : "COMPLETE";
    addLog("MRCP COMPLETE", `S->C SPEAK-COMPLETE cause=normal node=${scenario.node}`);
  }, 700);
}

function startCall() {
  callStarted = true;
  els.callStatus.textContent = "통화중";
  els.callStatus.classList.add("live");
  els.callStatus.classList.remove("ended");
  els.callerNumber.textContent = `010-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;
  addLog("CALL START", "Avaya EP inbound session created\nANI mapped, VXML app loaded");
  renderScenario("welcome");
  window.setTimeout(() => renderScenario("menu"), 900);
}

function resetCall() {
  callStarted = false;
  currentScenario = "welcome";
  window.speechSynthesis?.cancel();
  els.callStatus.textContent = "대기중";
  els.callStatus.classList.remove("ended");
  els.callStatus.classList.add("live");
  els.callerNumber.textContent = "02-3774-0000";
  els.currentNode.textContent = "콜 연결 전";
  els.scenarioTitle.textContent = "콜을 수신하면 IVR이 시작됩니다";
  els.promptText.textContent = "전화 수신 버튼을 눌러 테스트 콜을 시작하세요.";
  els.mrcpState.textContent = "IDLE";
  els.lastInput.textContent = "-";
  els.routeTarget.textContent = "대기";
  setFlow("welcome");
  addLog("RESET", "Session variables cleared");
}

function handleDtmf(key) {
  if (!callStarted) {
    addLog("DTMF IGNORED", `key=${key}\nreason=no active call`);
    return;
  }

  addLog("DTMF INPUT", `C->IVR key=${key}`);

  if (key === "#") {
    renderScenario(currentScenario, "#");
    return;
  }

  if (key === "*") {
    renderScenario("menu", "*");
    return;
  }

  const target = keyMap[key];
  if (target) {
    renderScenario(target, key);
    return;
  }

  renderScenario("menu", key);
}

els.startCall.addEventListener("click", startCall);
els.resetCall.addEventListener("click", resetCall);
els.clearLog.addEventListener("click", () => {
  els.eventLog.innerHTML = "";
});

els.replayVoice.addEventListener("click", () => {
  const scenario = scenarios[currentScenario];
  speak(scenario.prompt, "REPLAY");
  addLog("TTS REPLAY", `Manual replay requested\nnode=${scenario.node}`);
});

els.speakToggle.addEventListener("click", () => {
  speechEnabled = !speechEnabled;
  els.speakToggle.textContent = speechEnabled ? "음성 ON" : "음성 OFF";
  els.speakToggle.setAttribute("aria-pressed", String(speechEnabled));
  if (!speechEnabled) window.speechSynthesis?.cancel();
  if (speechEnabled) {
    loadVoices();
    speak(scenarios[currentScenario].prompt, "TOGGLE");
  }
});

els.keypad.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-key]");
  if (!button) return;
  handleDtmf(button.dataset.key);
});

if ("speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
} else {
  updateVoiceStatus("이 브라우저는 음성 합성을 지원하지 않습니다");
}

addLog("READY", "Prototype loaded\nMRCP gateway profile=tts-prod-like");
