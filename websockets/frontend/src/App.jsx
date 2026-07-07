import { useEffect, useRef, useState } from "react";

const WS_URL = "ws://localhost:8000/api/voice/ws";

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Connecting...");
  const [audioUrl, setAudioUrl] = useState(null);
  const [originalText, setOriginalText] = useState("");
  const [reversedText, setReversedText] = useState("");
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const wsRef = useRef(null);

  // One persistent socket for the life of the page; the button just sends
  // one full audio blob per recording over it and waits for the reply.
  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => setStatus("Idle");
    ws.onerror = () => setError("WebSocket connection error");
    ws.onclose = () => setStatus("Disconnected");

    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        // Text frame -> the {original_text, reversed_text} JSON message
        const payload = JSON.parse(event.data);
        if (payload.error) {
          setError(payload.error);
          setStatus("Error");
        } else {
          setOriginalText(payload.original_text);
          setReversedText(payload.reversed_text);
        }
      } else {
        // Binary frame -> the reversed speech audio (a Blob)
        const url = URL.createObjectURL(event.data);
        setAudioUrl(url);
        setStatus("Done");
      }
    };

    wsRef.current = ws;
    return () => ws.close();
  }, []);

  async function startRecording() {
    setError("");
    setAudioUrl(null);
    setOriginalText("");
    setReversedText("");

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    // Fires once, after stop() is called, with every chunk collected above.
    // We send the whole recording as a single message, not chunk-by-chunk.
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      wsRef.current.send(blob);
      setStatus("Processing...");
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
    setStatus("Recording...");
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>Voice Word-Reverser</h1>
      <p>Record yourself saying a few words, e.g. "abc cde", and get back "cde abc" as audio.</p>

      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>

      <p>Status: {status}</p>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {originalText && (
        <p>
          <strong>You said:</strong> {originalText}
        </p>
      )}
      {reversedText && (
        <p>
          <strong>Reversed:</strong> {reversedText}
        </p>
      )}

      {audioUrl && (
        <audio controls autoPlay src={audioUrl}>
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );
}
