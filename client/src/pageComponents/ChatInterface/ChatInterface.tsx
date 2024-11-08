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
  const [currentResponses, setCurrentResponses] = useState([]);
  const [responseIndex, setResponseIndex] = useState(0);
  const [isResponseLimitReached, setIsResponseLimitReached] = useState(false);
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

    setIsResponseLimitReached(false);
    insertMessageToChat({ role: "user", content: input });
    setInput("");
    setLoading(true);

    const data = await sendMessage(input);
    setCurrentResponses(data);
    setResponseIndex(0);
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

  const handleMore = () => {
    const nextIndex = responseIndex + 1;
    insertMessageToChat({
      role: "assistant",
      content: currentResponses[nextIndex]
    });
    if (nextIndex + 1 >= currentResponses.length) {
      setIsResponseLimitReached(true);
    }
    setResponseIndex(nextIndex);
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
        {isResponseLimitReached && (
          <div>
            Couldn&apos;t find what you are looking for? Try adding more details
            to your prompt.
          </div>
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
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={loading || !input}
          sx={{
            "&.Mui-disabled": {
              background:
                "linear-gradient(0deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.5) 100%), linear-gradient(81deg, rgb(78, 78, 78) -23.47%, rgb(117, 117, 117) 45.52%, rgb(154, 154, 154) 114.8%)", // Background color when disabled
              color: "white",
              opacity: 0.4
            }
          }}
        >
          Send
        </Button>
        <Button
          variant="contained"
          onClick={handleMore}
          disabled={loading || isResponseLimitReached}
          sx={{
            "&.Mui-disabled": {
              background:
                "linear-gradient(0deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.5) 100%), linear-gradient(81deg, rgb(78, 78, 78) -23.47%, rgb(117, 117, 117) 45.52%, rgb(154, 154, 154) 114.8%)", // Background color when disabled
              color: "white",
              opacity: 0.4
            }
          }}
        >
          More
        </Button>
      </div>
    </div>
  );
}
