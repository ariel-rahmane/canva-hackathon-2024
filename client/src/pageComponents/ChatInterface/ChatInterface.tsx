"use client";

import React, { useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import styles from "@/styles/ChatInterface.module.scss";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { CircularProgress } from "@mui/material";

interface ApiResponse {
  score: string;
  code: string;
  fileLocation: string;
  fileName: string;
  startLineNumber: string;
  endLineNumber: string;
}

interface AssistantMessage {
  role: "assistant";
  content: ApiResponse;
}

interface UserMessage {
  role: "user";
  content: string;
}
type ChatMessage = UserMessage | AssistantMessage;

const apiUrl = process.env.NEXT_PUBLIC_API_HOST;

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messageContainerRef = useRef<HTMLDivElement>(null);

  async function sendMessage(userMessage: string) {
    const response = await fetch(`${apiUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage })
    });
    const data = await response.json();
    return data;
  }

  const handleSend = async () => {
    if (!input.trim()) return;

    insertMessageToChat({ role: "user", content: input });
    setInput("");
    setLoading(true);

    const data = await sendMessage(input);
    console.log(data);

    setLoading(false);
    insertMessageToChat({ role: "assistant", content: data[0] });
  };

  const scrollToBottom = () => {
    if (messageContainerRef.current) {
      setTimeout(() => {
        messageContainerRef?.current?.scrollTo({
          top: messageContainerRef.current.scrollHeight,
          behavior: "smooth"
        });
      }, 100);
    }
  };

  const insertMessageToChat = (message: ChatMessage) => {
    setMessages((prevMessages) => [...prevMessages, message]);
    scrollToBottom();
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messagesContainer} ref={messageContainerRef}>
        {messages.map((msg, index) => (
          <div
            key={index}
            className={
              msg.role === "user" ? styles.userMessage : styles.assistantMessage
            }
          >
            {msg.role === "user" ? (
              msg.content
            ) : (
              <div>
                <p
                  style={{
                    color: "#dddddd",
                    borderRadius: "4px",
                    padding: "10px",
                    backgroundColor: "#2d2d2d"
                  }}
                >
                  <b>File location:</b> <b>{msg.content.fileLocation}</b> from
                  line <b>{msg.content.startLineNumber}</b> to line{" "}
                  <b>{msg.content.endLineNumber}</b>
                </p>
                <br />
                <SyntaxHighlighter
                  language="typescript"
                  style={materialDark}
                  className={styles.codeContainer}
                  customStyle={{
                    borderRadius: "4px",
                    padding: "10px",
                    backgroundColor: "#2d2d2d"
                  }}
                >
                  {msg.content.code}
                </SyntaxHighlighter>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <CircularProgress size={24} className={styles.loadingSpinner} />
        )}
      </div>
      <div className={styles.inputContainer}>
        <TextField
          className={styles.textField}
          variant="outlined"
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSend();
            }
          }}
          slotProps={{
            input: {
              style: { color: "white" }
            },
            inputLabel: {
              style: { color: "rgba(255, 255, 255, 0.5)" }
            }
          }}
        />
        <Button variant="contained" onClick={handleSend} disabled={loading}>
          Send
        </Button>
      </div>
    </div>
  );
}
