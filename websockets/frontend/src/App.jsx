import { useRef, useState } from "react";

const CHUNK_SECONDS = 3;

// dev server runs on a different port (5173) than the backend (8000),
// but when the backend serves this build itself, they're on the same host:port
const backendHost = import.meta.env.DEV
  ? `${location.hostname}:8000`
  : location.host;

function floatTo16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

export default function App() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const bufferedSamplesRef = useRef([]);
  const bufferedLengthRef = useRef(0);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    const ws = new WebSocket(
      `ws://${backendHost}/ws?rate=${audioContext.sampleRate}`
    );
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (event) => {
      setMessages((prev) => [...prev, event.data]);
    };
    wsRef.current = ws;

    const source = audioContext.createMediaStreamSource(stream);
    sourceRef.current = source;

    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    const chunkTarget = audioContext.sampleRate * CHUNK_SECONDS;

    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      bufferedSamplesRef.current.push(new Float32Array(input));
      bufferedLengthRef.current += input.length;

      if (bufferedLengthRef.current >= chunkTarget) {
        const merged = new Float32Array(bufferedLengthRef.current);
        let offset = 0;
        for (const chunk of bufferedSamplesRef.current) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        bufferedSamplesRef.current = [];
        bufferedLengthRef.current = 0;

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(floatTo16BitPCM(merged));
        }
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  }

  function stop() {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioContextRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    wsRef.current?.close();

    bufferedSamplesRef.current = [];
    bufferedLengthRef.current = 0;
    setConnected(false);
  }

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 480, margin: "2rem auto" }}>
      <h1>Audio Transcriber</h1>
      <p>Status: {connected ? "connected" : "disconnected"}</p>

      <button onClick={start} disabled={connected}>
        Start
      </button>
      <button onClick={stop} disabled={!connected} style={{ marginLeft: 8 }}>
        Stop
      </button>

      <ul>
        {messages.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
