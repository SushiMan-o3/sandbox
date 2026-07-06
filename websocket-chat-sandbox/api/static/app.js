const chatLog = document.getElementById("chat-log");
const statusEl = document.getElementById("status");
const composer = document.getElementById("composer");
const textInput = document.getElementById("text-input");
const micBtn = document.getElementById("mic-btn");
const ttsToggle = document.getElementById("tts-toggle");

const wsUrl = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws/chat";
const ws = new WebSocket(wsUrl);

function appendBubble(text, className) {
  const bubble = document.createElement("div");
  bubble.className = "bubble " + className;
  bubble.textContent = text;
  chatLog.appendChild(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;
  return bubble;
}

ws.onopen = () => {
  statusEl.textContent = "Connected";
};

ws.onclose = () => {
  statusEl.textContent = "Disconnected";
  textInput.disabled = true;
  micBtn.disabled = true;
};

ws.onerror = () => {
  statusEl.textContent = "Connection error";
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === "config") {
    configureMic(msg.deepgram_enabled);
  } else if (msg.type === "assistant_message") {
    appendBubble(msg.text, "msg-assistant");
    speakText(msg.text);
  } else if (msg.type === "transcript") {
    appendBubble("🎤 you said: " + msg.text, "msg-transcript");
  } else if (msg.type === "error") {
    appendBubble(msg.message, "msg-error");
    if (msg.code === "deepgram_unavailable") {
      micBtn.disabled = true;
      micBtn.title = "Voice transcription is not configured on this server";
    }
  }
};

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  sendText();
});

function sendText() {
  const text = textInput.value.trim();
  if (!text || ws.readyState !== WebSocket.OPEN) return;

  appendBubble(text, "msg-user");
  ws.send(JSON.stringify({ type: "user_message", text }));
  textInput.value = "";
}

// --- mic mode selection ---
//
// The server tells us on connect whether it has Deepgram configured. If so,
// we record audio and let the server transcribe it via Deepgram. If not, we
// fall back to the browser's own built-in speech recognition, which needs no
// server-side API key at all since the browser does the transcription itself.

let micMode = "unavailable";

function configureMic(deepgramEnabled) {
  const hasMediaRecorder = !!(window.MediaRecorder && navigator.mediaDevices);
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (deepgramEnabled && hasMediaRecorder) {
    micMode = "deepgram";
    micBtn.disabled = false;
    micBtn.title = "Record a voice message";
  } else if (!deepgramEnabled && SpeechRecognitionCtor) {
    micMode = "webspeech";
    micBtn.disabled = false;
    micBtn.title = "Record a voice message (browser speech recognition)";
  } else {
    micMode = "unavailable";
    micBtn.disabled = true;
    micBtn.title = deepgramEnabled
      ? "Voice recording is not supported in this browser"
      : "Voice input isn't available: no Deepgram key is configured on this server and your browser doesn't support built-in speech recognition (try Chrome or Edge)";
  }
}

micBtn.addEventListener("click", () => {
  if (micMode === "deepgram") {
    toggleDeepgramRecording();
  } else if (micMode === "webspeech") {
    toggleWebSpeechRecording();
  }
});

// --- voice recording: server-side transcription via Deepgram ---

const MAX_RECORDING_MS = 60000;

let mediaRecorder = null;
let isRecording = false;

function toggleDeepgramRecording() {
  if (isRecording) {
    mediaRecorder.stop();
    return;
  }

  startDeepgramRecording();
}

async function startDeepgramRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];

    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      isRecording = false;
      micBtn.textContent = "🎤";
      micBtn.classList.remove("recording");

      const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(await blob.arrayBuffer());
      }
    };

    mediaRecorder.start();
    isRecording = true;
    micBtn.textContent = "⏹";
    micBtn.classList.add("recording");

    setTimeout(() => {
      if (isRecording) mediaRecorder.stop();
    }, MAX_RECORDING_MS);
  } catch (error) {
    appendBubble("Could not access microphone: " + error.message, "msg-error");
  }
}

// --- voice recording: browser-side speech recognition (no Deepgram key needed) ---

let recognition = null;
let isListening = false;

function toggleWebSpeechRecording() {
  if (isListening) {
    recognition.stop();
    return;
  }

  startWebSpeechRecording();
}

function startWebSpeechRecording() {
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognitionCtor();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = true;

  let captionBubble = null;
  let finalTranscript = "";

  recognition.onstart = () => {
    isListening = true;
    micBtn.textContent = "⏹";
    micBtn.classList.add("recording");
    captionBubble = appendBubble("🎤 listening...", "msg-transcript msg-interim");
  };

  recognition.onresult = (event) => {
    let text = "";
    for (let i = 0; i < event.results.length; i++) {
      text += event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript = text;
      }
    }
    captionBubble.textContent = "🎤 " + text;
    chatLog.scrollTop = chatLog.scrollHeight;
  };

  recognition.onerror = (event) => {
    appendBubble("Speech recognition error: " + event.error, "msg-error");
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.textContent = "🎤";
    micBtn.classList.remove("recording");

    if (finalTranscript.trim()) {
      captionBubble.classList.remove("msg-interim");
      captionBubble.textContent = "🎤 you said: " + finalTranscript;
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "user_message", text: finalTranscript }));
      }
    } else if (captionBubble) {
      captionBubble.remove();
    }
  };

  recognition.start();
}

// --- text-to-speech for AI replies ---

const hasSpeechSynthesis = !!window.speechSynthesis;
let ttsEnabled = hasSpeechSynthesis;

if (!hasSpeechSynthesis) {
  ttsToggle.disabled = true;
  ttsToggle.title = "Text-to-speech is not supported in this browser";
} else {
  ttsToggle.title = "Read replies aloud (on)";
}

ttsToggle.addEventListener("click", () => {
  if (!hasSpeechSynthesis) return;

  ttsEnabled = !ttsEnabled;
  ttsToggle.textContent = ttsEnabled ? "🔊" : "🔇";
  ttsToggle.classList.toggle("muted", !ttsEnabled);
  ttsToggle.title = ttsEnabled ? "Read replies aloud (on)" : "Read replies aloud (off)";

  if (!ttsEnabled) {
    window.speechSynthesis.cancel();
  }
});

function speakText(text) {
  if (!hasSpeechSynthesis || !ttsEnabled) return;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}
