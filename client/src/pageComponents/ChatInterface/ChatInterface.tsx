"use client";

import React, { useEffect, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import styles from "@/styles/ChatInterface.module.scss";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { CircularProgress, styled } from "@mui/material";

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
  image?: File;
}

type ChatMessage = UserMessage | AssistantMessage;

const apiUrl = process.env.NEXT_PUBLIC_API_HOST;

const TextInput = styled(TextField)({
  "& .MuiOutlinedInput-root": {
    "& fieldset": {
      borderRadius: "20px"
    },
    "&.Mui-focused fieldset": {
      borderColor: "#C66BD5"
    }
  }
});

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentResponses, setCurrentResponses] = useState([]);
  const [responseIndex, setResponseIndex] = useState(0);
  const [isResponseLimitReached, setIsResponseLimitReached] = useState(true);
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);

  const handlePaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith("image")) {
        const file = item.getAsFile();
        if (file) {
          setPastedImage(file);
          event.preventDefault();
        }
      }
    }
  };

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

    if (pastedImage) {
      await sendImage();
      return;
    }

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

  const sendImage = async () => {
    if (!pastedImage) return;

    setIsResponseLimitReached(false);
    insertMessageToChat({ role: "user", content: input, image: pastedImage });
    setInput("");
    setPastedImage(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("message", input);
    formData.append("image", pastedImage);

    try {
      const response = await fetch(`${apiUrl}/api/upload`, {
        method: "POST",
        body: formData
      });
      const data = await response.json();

      if (response.ok) {
        console.log("Image and message sent successfully");
        setInput("");
        setLoading(false);
        setCurrentResponses(data);
        setResponseIndex(0);
        console.log(data);
        insertMessageToChat({ role: "assistant", content: data[0] });
      } else {
        console.error("Failed to send image and message");
      }
    } catch (error) {
      console.error("Error sending image and message:", error);
    }
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
    if (!currentResponses.length) return;
    const nextIndex = responseIndex + 1;
    insertMessageToChat({
      role: "assistant",
      content: currentResponses[nextIndex]
    });
    setResponseIndex(nextIndex);
  };

  useEffect(() => {
    if (responseIndex + 1 >= currentResponses.length) {
      setIsResponseLimitReached(true);
    } else {
      setIsResponseLimitReached(false);
    }
  }, [responseIndex, currentResponses]);

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
              <div>
                <p style={{ paddingBottom: "20px" }}>{msg.content}</p>
                {msg.image && (
                  <img
                    src={URL.createObjectURL(msg.image)}
                    alt="Uploaded"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "200px",
                      borderRadius: "8px"
                    }}
                  />
                )}
              </div>
            ) : (
              <div>
                <p
                  style={{
                    color: "#dddddd",
                    borderRadius: "4px",
                    padding: "10px",
                    backgroundColor: "#2d2d2d",
                    overflowWrap: "anywhere"
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
        {isResponseLimitReached && currentResponses.length > 0 && (
          <div className={styles.limitReachedMessage}>
            Couldn&apos;t find what you are looking for? Try adding more details
            to your prompt.
          </div>
        )}
      </div>
      <div className={styles.inputContainer}>
        <TextInput
          className={styles.textField}
          variant="outlined"
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPaste={handlePaste}
          multiline
          placeholder="Type a message..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
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
          sx={{
            ".Mui-focused fieldset": {
              borderColor: "#C66BD5"
            }
          }}
        />
        {pastedImage && (
          <div style={{ marginTop: "10px" }}>
            <img
              src={URL.createObjectURL(pastedImage)}
              alt="Pasted preview"
              style={{
                maxWidth: "100%",
                maxHeight: "200px",
                borderRadius: "8px"
              }}
            />
            <Button
              onClick={() => setPastedImage(null)}
              className={styles.removeImageButton}
            >
              Remove Image
            </Button>
          </div>
        )}
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
          disabled={
            loading || isResponseLimitReached || !currentResponses.length
          }
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
