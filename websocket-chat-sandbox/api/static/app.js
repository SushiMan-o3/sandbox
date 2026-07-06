const chatLog = document.getElementById("chat-log");
const statusEl = document.getElementById("status");
const composer = document.getElementById("composer");
const textInput = document.getElementById("text-input");
const micBtn = document.getElementById("mic-btn");

const wsUrl = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws/chat";
const ws = new WebSocket(wsUrl);

function appendBubble(text, className) {
  const bubble = document.createElement("div");
  bubble.className = "bubble " + className;
  bubble.textContent = text;
  chatLog.appendChild(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;
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

  if (msg.type === "assistant_message") {
    appendBubble(msg.text, "msg-assistant");
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

// --- voice recording ---

const MAX_RECORDING_MS = 60000;

let mediaRecorder = null;
let isRecording = false;

if (!window.MediaRecorder || !navigator.mediaDevices) {
  micBtn.disabled = true;
  micBtn.title = "Voice recording is not supported in this browser";
}

micBtn.addEventListener("click", async () => {
  if (isRecording) {
    mediaRecorder.stop();
    return;
  }

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
});
