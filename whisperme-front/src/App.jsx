import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.min.css";
import "./App.css";

const API_BASE = "http://43.203.123.217:8083";
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const normalizeAiText = (text) => {
  return String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
};



function CodeBlock({ inline, className, children, ...props }) {
  const [copied, setCopied] = useState(false);
  const codeText = String(children || "").replace(/\n$/, "");
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1].toUpperCase() : "CODE";

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error(e);
      alert("복사에 실패했어요.");
    }
  };

  if (inline) {
    return (
        <code className={className} {...props}>
          {children}
        </code>
    );
  }

  return (
      <div className="code-block-wrap">
        <div className="code-block-head">
          <span>{language}</span>
          <button type="button" onClick={copyCode}>
            {copied ? "복사됨" : "복사"}
          </button>
        </div>
        <pre>
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
      </div>
  );
}

const escapeRegExp = (value) => {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const makeSearchKey = (messageId, occurrenceIndex) => {
  return `search-${String(messageId).replace(/[^a-zA-Z0-9_-]/g, "_")}-${occurrenceIndex}`;
};

function HighlightedPlainText({ content, searchKeyword, messageId, activeSearchKey }) {
  const text = String(content || "");
  const keyword = String(searchKeyword || "").trim();

  if (!keyword) {
    return <>{text}</>;
  }

  const regex = new RegExp(`(${escapeRegExp(keyword)})`, "gi");
  const parts = text.split(regex);
  let occurrenceIndex = 0;

  return (
      <>
        {parts.map((part, index) => {
          if (part.toLowerCase() !== keyword.toLowerCase()) {
            return <span key={`text-${index}`}>{part}</span>;
          }

          const searchKey = makeSearchKey(messageId, occurrenceIndex);
          occurrenceIndex += 1;

          return (
              <mark
                  key={searchKey}
                  data-search-key={searchKey}
                  className={`search-mark ${activeSearchKey === searchKey ? "active-search-mark" : ""}`}
              >
                {part}
              </mark>
          );
        })}
      </>
  );
}

function MarkdownMessage({ content, searchKeyword = "", messageId = "", activeSearchKey = "" }) {
  if (String(searchKeyword || "").trim()) {
    return (
        <div className="markdown-message search-markdown-message">
          <HighlightedPlainText
              content={content}
              searchKeyword={searchKeyword}
              messageId={messageId}
              activeSearchKey={activeSearchKey}
          />
        </div>
    );
  }

  return (
      <div className="markdown-message">
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              a: ({ node, ...props }) => (
                  <a {...props} target="_blank" rel="noreferrer" />
              ),
              code: CodeBlock,
            }}
        >
          {content || ""}
        </ReactMarkdown>
      </div>
  );
}

function AnswerContextCard({ context }) {
  if (!context) return null;

  const question = context.question || "연결된 질문을 찾지 못했어요.";
  const label = context.label?.includes("이미지")
      ? context.label
      : context.label?.includes("첨부")
          ? context.label
          : "질문에 대한 답변";

  return (
      <div className="answer-context-card answer-context-compact">
        <span className="answer-context-arrow">↳</span>
        <span className="answer-context-small-label">{context.icon} {label}</span>
        <span className="answer-context-small-question">{question}</span>
      </div>
  );
}

function App() {
  const getTodayString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;

    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  };

  const todayString = getTodayString();
  const fileInputRef = useRef(null);
  const messageListRef = useRef(null);
  const recognitionRef = useRef(null);
  const messageItemRefs = useRef({});

  const emptyJoinForm = {
    loginId: "",
    password: "",
    passwordConfirm: "",
    nickname: "",
    birthDate: "",
  };

  const [loginMember, setLoginMember] = useState(null);

  const [authMode, setAuthMode] = useState("login");
  const [loginForm, setLoginForm] = useState({ loginId: "", password: "" });
  const [joinForm, setJoinForm] = useState(emptyJoinForm);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nickname: "",
    password: "",
    passwordConfirm: "",
  });

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    newPasswordConfirm: "",
  });

  const [locationHelpOpen, setLocationHelpOpen] = useState(false);
  const [locationName, setLocationName] = useState("현재 위치");

  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState(null);

  const [roomKeyword, setRoomKeyword] = useState("");
  const [messageKeyword, setMessageKeyword] = useState("");
  const [searchIndex, setSearchIndex] = useState(0);

  const [todos, setTodos] = useState([]);
  const [futureTodos, setFutureTodos] = useState([]);
  const [pastTodos, setPastTodos] = useState([]);
  const [todoInput, setTodoInput] = useState("");
  const [todoDate, setTodoDate] = useState(todayString);
  const [todoTab, setTodoTab] = useState("today");

  const [weather, setWeather] = useState(null);
  const [weatherText, setWeatherText] = useState(
      "현재 위치 버튼을 눌러 날씨를 불러오세요."
  );

  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [notice, setNotice] = useState(null);
  const [homeMode, setHomeMode] = useState(true);
  const [favoriteMode, setFavoriteMode] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("whispermeDarkMode") === "Y");
  const [isListening, setIsListening] = useState(false);

  const [editingRoomId, setEditingRoomId] = useState(null);
  const [editingRoomTitle, setEditingRoomTitle] = useState("");
  const [imageModal, setImageModal] = useState(null);
  const [messageReactions, setMessageReactions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("whispermeMessageReactions") || "{}");
    } catch (e) {
      return {};
    }
  });
  const [favoriteMessages, setFavoriteMessages] = useState({});
  useEffect(() => {

    if (!loginMember?.id) return;

    // 예전 즐겨찾기 → 회원별 즐겨찾기로 1회 이전
    const oldData = localStorage.getItem("whispermeFavoriteMessages");

    if (
        oldData &&
        !localStorage.getItem(`whispermeFavoriteMessages_${loginMember.id}`)
    ) {

      localStorage.setItem(
          `whispermeFavoriteMessages_${loginMember.id}`,
          oldData
      );

      localStorage.removeItem("whispermeFavoriteMessages");
    }

    try {

      const saved = localStorage.getItem(
          `whispermeFavoriteMessages_${loginMember.id}`
      );

      setFavoriteMessages(JSON.parse(saved || "{}"));

    } catch {

      setFavoriteMessages({});

    }

  }, [loginMember]);
  useEffect(() => {
    if (!loginMember?.id) {
      setFavoriteMessages({});
      return;
    }

    try {
      const saved = localStorage.getItem(`whispermeFavoriteMessages_${loginMember.id}`);
      setFavoriteMessages(JSON.parse(saved || "{}"));
    } catch (e) {
      setFavoriteMessages({});
    }
  }, [loginMember]);

  const locationButtonStyle = {
    border: "0",
    borderRadius: "999px",
    padding: "9px 14px",
    fontSize: "13px",
    fontWeight: "800",
    background: "linear-gradient(135deg, #0ea5e9, #38bdf8)",
    color: "white",
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(14, 165, 233, 0.25)",
  };

  const locationSubButtonStyle = {
    border: "1px solid rgba(14, 165, 233, 0.25)",
    borderRadius: "999px",
    padding: "8px 13px",
    fontSize: "13px",
    fontWeight: "800",
    background: "rgba(255,255,255,0.75)",
    color: "#0369a1",
    cursor: "pointer",
  };

  const brandTitleStyle = {
    fontSize: "28px",
    fontWeight: "900",
    letterSpacing: "-0.8px",
    color: "#0f172a",
    margin: 0,
  };

  const nicknameBadgeStyle = {
    display: "inline-block",
    marginTop: "6px",
    padding: "8px 16px",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #e0f2fe, #bae6fd)",
    color: "#0369a1",
    fontSize: "22px",
    fontWeight: "900",
    boxShadow: "inset 0 0 0 1px rgba(14,165,233,0.18)",
  };

  const modalCardStyle = {
    width: "520px",
    maxWidth: "92vw",
    background: "rgba(255,255,255,0.96)",
    borderRadius: "34px",
    padding: "42px 44px 38px",
    boxShadow: "0 35px 90px rgba(15,23,42,0.28)",
    textAlign: "center",
  };

  const modalIconStyle = {
    width: "76px",
    height: "76px",
    margin: "0 auto 22px",
    borderRadius: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0ea5e9, #38bdf8)",
    fontSize: "34px",
  };

  const modalTitleStyle = {
    margin: "0",
    fontSize: "30px",
    fontWeight: "900",
    letterSpacing: "-1px",
    color: "#020617",
  };

  const modalDescStyle = {
    margin: "12px 0 28px",
    fontSize: "16px",
    lineHeight: "1.6",
    color: "#64748b",
  };

  const modalFieldStyle = {
    marginBottom: "16px",
    textAlign: "left",
  };

  const modalLabelStyle = {
    display: "block",
    marginBottom: "8px",
    paddingLeft: "4px",
    fontSize: "14px",
    fontWeight: "900",
    color: "#0f172a",
  };

  const modalInputStyle = {
    width: "100%",
    height: "56px",
    border: "1px solid #cbd5e1",
    borderRadius: "18px",
    padding: "0 18px",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box",
  };

  const modalDisabledInputStyle = {
    ...modalInputStyle,
    background: "#f8fafc",
    color: "#64748b",
  };


  const frontOnlyEnhanceStyle = `
    .app.dark-mode {
      background:
        radial-gradient(circle at 25% 10%, rgba(14, 165, 233, 0.16), transparent 28%),
        radial-gradient(circle at 80% 0%, rgba(56, 189, 248, 0.12), transparent 32%),
        linear-gradient(135deg, #020617, #0f172a);
      color: #e5e7eb;
    }

    .app.dark-mode .sidebar,
    .app.dark-mode .chat-panel,
    .app.dark-mode .todo-panel,
    .app.dark-mode .today-card,
    .app.dark-mode .member-box,
    .app.dark-mode .modal-backdrop > div {
      background: rgba(15, 23, 42, 0.88) !important;
      border-color: rgba(148, 163, 184, 0.22) !important;
      color: #e5e7eb !important;
      box-shadow: 0 25px 70px rgba(0,0,0,0.32) !important;
    }

    .app.dark-mode h1,
    .app.dark-mode h2,
    .app.dark-mode h3,
    .app.dark-mode strong,
    .app.dark-mode label {
      color: #f8fafc !important;
    }

    .app.dark-mode p,
    .app.dark-mode span {
      color: #cbd5e1;
    }

    .app.dark-mode input {
      background: rgba(2, 6, 23, 0.72) !important;
      color: #f8fafc !important;
      border-color: rgba(148, 163, 184, 0.35) !important;
    }

    .app.dark-mode input::placeholder {
      color: #94a3b8 !important;
    }

    .app.dark-mode .bubble {
      background: rgba(30, 41, 59, 0.95);
      color: #f8fafc;
    }

    .app.dark-mode .message.user .bubble {
      background: linear-gradient(135deg, #0284c7, #0ea5e9);
      color: white;
    }

    .theme-toggle-btn {
      width: 100%;
      margin-top: 10px;
      border: 0;
      border-radius: 16px;
      padding: 12px 14px;
      font-size: 14px;
      font-weight: 900;
      background: linear-gradient(135deg, #0f172a, #334155);
      color: white;
      cursor: pointer;
      box-shadow: 0 12px 26px rgba(15,23,42,0.18);
    }

    .app.dark-mode .theme-toggle-btn {
      background: linear-gradient(135deg, #f8fafc, #bae6fd);
      color: #0f172a;
    }

    .assistant-tool-row {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
      margin-top: 10px;
    }

    .assistant-tool-row button {
      border: 1px solid rgba(14, 165, 233, 0.25);
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 800;
      background: rgba(255,255,255,0.72);
      color: #0369a1;
      cursor: pointer;
    }

    .app.dark-mode .assistant-tool-row button {
      background: rgba(15,23,42,0.85);
      color: #bae6fd;
      border-color: rgba(125,211,252,0.24);
    }

    .code-block-wrap {
      margin: 12px 0;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba(15, 23, 42, 0.12);
      background: #0f172a;
      box-shadow: 0 12px 28px rgba(15,23,42,0.14);
    }

    .code-block-head {
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px 0 14px;
      background: #1e293b;
      color: #cbd5e1;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.4px;
    }

    .code-block-head button {
      border: 0;
      border-radius: 999px;
      padding: 6px 10px;
      background: rgba(255,255,255,0.12);
      color: #f8fafc;
      font-size: 12px;
      font-weight: 900;
      cursor: pointer;
    }

    .code-block-wrap pre {
      margin: 0;
      padding: 16px;
      overflow-x: auto;
      background: #0f172a !important;
    }

    .code-block-wrap code {
      color: #e5e7eb;
      background: transparent !important;
      font-size: 14px;
      line-height: 1.65;
    }

    .markdown-message {
      font-size: 15px;
      line-height: 1.58;
    }

    .markdown-message p {
      margin: 0 0 7px;
      line-height: 1.58;
    }

    .markdown-message ul,
    .markdown-message ol {
      margin: 4px 0 8px;
      padding-left: 20px;
      line-height: 1.58;
    }

    .markdown-message li {
      margin-bottom: 3px;
      line-height: 1.58;
    }

    .markdown-message h1,
    .markdown-message h2,
    .markdown-message h3,
    .markdown-message h4 {
      margin: 12px 0 7px;
      line-height: 1.32;
    }

    .markdown-message hr {
      margin: 14px 0;
    }

    .markdown-message table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 14px;
      overflow: hidden;
      border-radius: 12px;
    }

    .markdown-message th,
    .markdown-message td {
      border: 1px solid #e2e8f0;
      padding: 9px 10px;
      text-align: left;
    }

    .markdown-message th {
      background: #f1f5f9;
      font-weight: 900;
    }

    .app.dark-mode .markdown-message th {
      background: #1e293b;
    }

    .app.dark-mode .markdown-message th,
    .app.dark-mode .markdown-message td {
      border-color: rgba(148,163,184,0.28);
    }


    /* 채팅 입력창 고정: 긴 대화에서도 GPT처럼 아래 입력칸이 항상 보이게 */
    .content-layout {
      align-items: stretch !important;
      min-height: 0 !important;
    }

    .chat-panel {
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      min-height: 620px !important;
      max-height: calc(100vh - 330px) !important;
    }

    .chat-header,
    .chat-header-plus,
    .message-search-row {
      flex-shrink: 0 !important;
    }

    .message-list {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      overflow-y: auto !important;
      padding-bottom: 18px !important;
      scroll-behavior: smooth;
    }

    .composer-wrap {
      flex-shrink: 0 !important;
      position: sticky !important;
      bottom: 0 !important;
      z-index: 50 !important;
      padding: 16px 22px 20px !important;
      margin-top: 0 !important;
      border-top: 1px solid rgba(226, 232, 240, 0.9) !important;
      background: rgba(255, 255, 255, 0.92) !important;
      backdrop-filter: blur(18px) !important;
      -webkit-backdrop-filter: blur(18px) !important;
      box-shadow: 0 -18px 40px rgba(15, 23, 42, 0.08) !important;
    }

    .input-area {
      margin: 0 !important;
    }

    .app.dark-mode .composer-wrap {
      background: rgba(15, 23, 42, 0.94) !important;
      border-top-color: rgba(148, 163, 184, 0.24) !important;
      box-shadow: 0 -18px 40px rgba(0, 0, 0, 0.28) !important;
    }


    .message-search-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .message-search-row input {
      flex: 1;
    }

    .message-search-tools {
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }

    .message-search-tools span {
      font-size: 13px;
      font-weight: 900;
      color: #0369a1;
    }

    .message-search-tools button {
      width: 34px;
      height: 34px;
      border: 0;
      border-radius: 12px;
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 900;
      cursor: pointer;
    }

    .search-hit .bubble {
      box-shadow: inset 0 0 0 2px rgba(250, 204, 21, 0.35);
    }

    .active-search-hit .bubble {
      box-shadow:
        inset 0 0 0 2px rgba(250, 204, 21, 0.45),
        0 16px 36px rgba(250, 204, 21, 0.15);
    }

    .search-markdown-message {
      white-space: pre-wrap;
    }

    .search-mark {
      background: #fde68a;
      color: inherit;
      padding: 0 2px;
      border-radius: 4px;
      box-shadow: inset 0 -2px 0 rgba(245, 158, 11, 0.35);
    }

    .active-search-mark {
      background: #facc15;
      outline: 3px solid rgba(250, 204, 21, 0.65);
      box-shadow: 0 0 0 5px rgba(250, 204, 21, 0.22);
    }

    @media (max-width: 1100px) {
      .chat-panel {
        min-height: 560px !important;
        max-height: none !important;
        height: calc(100vh - 180px) !important;
      }

      .composer-wrap {
        padding: 14px 14px 16px !important;
      }
    }
  `;


  const showNotice = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 2500);
  };

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("whispermeDarkMode", next ? "Y" : "N");
      return next;
    });
  };

  const speakText = (text) => {
    if (!text || !window.speechSynthesis) {
      showNotice("이 브라우저에서는 음성 읽기를 지원하지 않아요.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 1;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      showNotice("음성 읽기를 중지했어요.");
    }
  };


  const copyTextToClipboard = async (text) => {
    if (!text) {
      showNotice("복사할 내용이 없어요.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showNotice("답변을 복사했어요.");
    } catch (e) {
      console.error(e);
      showNotice("복사에 실패했어요.");
    }
  };

  const saveMessageReactions = (next) => {
    setMessageReactions(next);
    localStorage.setItem("whispermeMessageReactions", JSON.stringify(next));
  };

  const saveFavoriteMessages = (next) => {
    setFavoriteMessages(next);

    if (!loginMember?.id) return;

    localStorage.setItem(
        `whispermeFavoriteMessages_${loginMember.id}`,
        JSON.stringify(next)
    );
  };

  const toggleReaction = (messageId, reaction) => {
    if (!messageId) return;

    const current = messageReactions[messageId];

    const next = {
      ...messageReactions,
      [messageId]: current === reaction ? "" : reaction,
    };

    if (!next[messageId]) {
      delete next[messageId];
    }

    saveMessageReactions(next);
  };

  const toggleFavorite = (message, context = null) => {
    if (!message?.id) return;

    const next = { ...favoriteMessages };

    if (next[message.id]) {
      delete next[message.id];
      showNotice("즐겨찾기에서 제거했어요.");
    } else {
      next[message.id] = {
        id: message.id,
        roomId: selectedRoomId,
        content: message.content,
        question: context?.question || "",
        sourceLabel: context?.label || "",
        sourceDetail: context?.detail || "",
        sourceIcon: context?.icon || "🤖",
        attachments: context?.attachments || [],
        createdAt: new Date().toISOString(),
      };
      showNotice("질문과 답변을 함께 중요 답변으로 저장했어요.");
    }

    saveFavoriteMessages(next);
  };

  const removeFavoriteMessage = (favoriteId) => {
    if (!favoriteId) return;

    const next = { ...favoriteMessages };
    delete next[favoriteId];

    saveFavoriteMessages(next);
    showNotice("중요 답변에서 삭제했어요.");
  };

  const clearFavoriteMessages = () => {
    const count = Object.values(favoriteMessages).length;

    if (count === 0) {
      showNotice("삭제할 중요 답변이 없어요.");
      return;
    }

    if (!window.confirm("저장된 중요 답변을 모두 삭제할까요?")) return;

    saveFavoriteMessages({});
    showNotice("중요 답변을 모두 삭제했어요.");
  };

  const copyFavoriteMessage = async (favorite) => {
    if (!favorite) return;

    const text = [
      "⭐ WhisperMe 중요 답변",
      "",
      "[질문]",
      favorite.question || "질문 내용 없음",
      "",
      "[답변]",
      favorite.content || "",
    ].join("\n");

    await copyTextToClipboard(text);
  };

  const exportFavoritesAsTxt = () => {
    const favorites = Object.values(favoriteMessages);

    if (favorites.length === 0) {
      showNotice("내보낼 중요 답변이 없어요.");
      return;
    }

    const lines = [
      "WhisperMe 중요 답변 모음",
      `내보낸 시간: ${new Date().toLocaleString("ko-KR")}`,
      "",
      "----------------------------------------",
      "",
      ...favorites
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          .map((favorite, index) => {
            const roomTitle =
                rooms.find((room) => room.id === favorite.roomId)?.title ||
                `채팅방 ${favorite.roomId || ""}`.trim();

            return [
              `${index + 1}. ${roomTitle}`,
              `저장 시간: ${favorite.createdAt ? new Date(favorite.createdAt).toLocaleString("ko-KR") : "-"}`,
              "",
              "[질문]",
              favorite.question || "질문 내용 없음",
              "",
              "[답변]",
              favorite.content || "",
            ].join("\n");
          }),
    ];

    const blob = new Blob([lines.join("\n\n----------------------------------------\n\n")], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "WhisperMe_중요답변.txt";
    a.click();

    URL.revokeObjectURL(url);
    showNotice("중요 답변을 TXT로 내보냈어요.");
  };

  const openRoomTitleEdit = (room, e) => {
    e.stopPropagation();
    setEditingRoomId(room.id);
    setEditingRoomTitle(room.title || "");
  };

  const cancelRoomTitleEdit = (e) => {
    e?.stopPropagation?.();
    setEditingRoomId(null);
    setEditingRoomTitle("");
  };

  const saveRoomTitle = async (roomId, e) => {
    e?.stopPropagation?.();

    const title = editingRoomTitle.trim();

    if (!title) {
      showNotice("채팅방 제목을 입력해주세요.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/chatrooms/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (!res.ok) {
        showNotice("제목 수정에 실패했어요. 백엔드 수정 API를 확인해주세요.");
        return;
      }

      setRooms((prev) =>
          prev.map((room) => (room.id === roomId ? { ...room, title } : room))
      );

      setEditingRoomId(null);
      setEditingRoomTitle("");
      showNotice("채팅방 제목을 수정했어요.");
    } catch (e2) {
      console.error(e2);
      showNotice("채팅방 제목 수정 중 오류가 발생했어요.");
    }
  };

  const moveSelectedFile = (index, direction) => {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= selectedFiles.length) return;

    setSelectedFiles((prev) => {
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });

    setPreviewUrls((prev) => {
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const exportChatAsTxt = () => {
    if (!selectedRoomId || messages.length === 0) {
      showNotice("내보낼 대화가 없어요.");
      return;
    }

    const roomTitle =
        rooms.find((room) => room.id === selectedRoomId)?.title || "WhisperMe 대화";

    const lines = [
      `WhisperMe 대화 내보내기`,
      `채팅방: ${roomTitle}`,
      `내보낸 시간: ${new Date().toLocaleString("ko-KR")}`,
      "",
      "----------------------------------------",
      "",
      ...messages.map((message) => {
        const role = message.role === "USER" ? "사용자" : "위스퍼미";
        const type = message.messageType || "TEXT";

        if (type === "IMAGE") {
          return `[${role}] 이미지: ${message.fileName || ""}\n${message.content || ""}\n${API_BASE}${message.fileUrl || ""}`;
        }

        if (type === "FILE") {
          return `[${role}] 파일: ${message.fileName || ""}\n${message.content || ""}\n${API_BASE}${message.fileUrl || ""}`;
        }

        return `[${role}]\n${message.content || ""}`;
      }),
    ];

    const blob = new Blob([lines.join("\n\n")], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeTitle = roomTitle.replace(/[\\/:*?"<>|]/g, "_");

    a.href = url;
    a.download = `${safeTitle}_WhisperMe.txt`;
    a.click();

    URL.revokeObjectURL(url);
    showNotice("대화를 TXT로 내보냈어요.");
  };

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showNotice("이 브라우저에서는 음성 입력을 지원하지 않아요.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      showNotice("말씀해주세요. 듣고 있어요.");
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript || "")
          .join(" ")
          .trim();

      if (transcript) {
        setInput((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
        showNotice("음성 입력을 넣었어요.");
      }
    };

    recognition.onerror = (event) => {
      console.error(event);
      showNotice("음성 입력 중 오류가 발생했어요.");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const regenerateAnswer = async (assistantMessage) => {
    if (!selectedRoomId || uploading || !assistantMessage) return;

    const assistantIndex = messages.findIndex((message) => message.id === assistantMessage.id);
    const targetMessages = assistantIndex >= 0 ? messages.slice(0, assistantIndex) : messages;

    let lastUserIndex = -1;

    for (let i = targetMessages.length - 1; i >= 0; i--) {
      if (targetMessages[i].role === "USER") {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex < 0) {
      showNotice("다시 생성할 이전 질문을 찾지 못했어요.");
      return;
    }

    const lastUserMessage = targetMessages[lastUserIndex];
    const lastUserType = lastUserMessage.messageType || "TEXT";

    setUploading(true);

    try {
      let aiText = "";

      if (lastUserType === "IMAGE") {
        const imageMessages = [];
        let startIndex = lastUserIndex;

        while (
            startIndex >= 0 &&
            targetMessages[startIndex].role === "USER" &&
            (targetMessages[startIndex].messageType || "TEXT") === "IMAGE"
            ) {
          imageMessages.unshift(targetMessages[startIndex]);
          startIndex--;
        }

        const imageUrls = imageMessages
            .map((image) => image.fileUrl)
            .filter(Boolean);

        if (imageUrls.length === 0) {
          showNotice("다시 분석할 이미지를 찾지 못했어요.");
          return;
        }

        const originalQuestion =
            imageMessages.find((image) => image.content && !isDefaultImageText(image.content))?.content ||
            "이 이미지를 자세히 분석해줘.";

        const askRes = await fetch(`${API_BASE}/api/chat/ask-images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage: originalQuestion,
            fileUrls: imageUrls,
          }),
        });

        if (!askRes.ok) {
          showNotice("이미지 다시 분석 응답을 가져오지 못했어요.");
          return;
        }

        const askData = await askRes.json();
        aiText = normalizeAiText(askData.aiMessage || "이미지 다시 분석 실패");
      } else if (lastUserType === "TEXT") {
        if (!lastUserMessage.content || !lastUserMessage.content.trim()) {
          showNotice("다시 생성할 이전 질문을 찾지 못했어요.");
          return;
        }

        const askRes = await fetch(`${API_BASE}/api/chat/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: selectedRoomId,
            memberId: loginMember.id,
            userMessage: lastUserMessage.content,
          }),
        });

        if (!askRes.ok) {
          showNotice("다시 생성 응답을 가져오지 못했어요.");
          return;
        }

        const askData = await askRes.json();
        aiText = normalizeAiText(askData.aiMessage || "응답을 가져오지 못했어요.");
      } else {
        showNotice("파일 메시지는 아직 다시 생성할 수 없어요.");
        return;
      }

      await typeAssistantMessage(aiText);
      await saveAssistantMessage(selectedRoomId, aiText);
      await loadMessages(selectedRoomId);

      showNotice("답변을 다시 생성했어요.");
    } catch (e) {
      console.error(e);
      showNotice("답변 다시 생성 중 오류가 발생했어요.");
    } finally {
      setUploading(false);
    }
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const typeAssistantMessage = async (text) => {
    const fullText = normalizeAiText(text || "응답을 가져오지 못했어요.");
    const chars = Array.from(fullText);
    let current = "";

    setStreamingMessage({
      id: `streaming-${Date.now()}`,
      role: "ASSISTANT",
      messageType: "TEXT",
      content: "",
    });

    for (let i = 0; i < chars.length; i += 3) {
      current += chars.slice(i, i + 3).join("");

      setStreamingMessage((prev) =>
          prev
              ? {
                ...prev,
                content: current,
              }
              : prev
      );

      await sleep(12);
    }

    await sleep(120);
    setStreamingMessage(null);
  };

  const clearSelectedFiles = () => {
    previewUrls.forEach((item) => {
      if (item.url) URL.revokeObjectURL(item.url);
    });

    setSelectedFiles([]);
    setPreviewUrls([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeSelectedFile = (index) => {
    const targetPreview = previewUrls[index];

    if (targetPreview?.url) {
      URL.revokeObjectURL(targetPreview.url);
    }

    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleJoin = async (e) => {
    e.preventDefault();

    if (!joinForm.loginId.trim()) return showNotice("아이디를 입력해주세요.");
    if (!joinForm.password.trim()) return showNotice("비밀번호를 입력해주세요.");
    if (!joinForm.passwordConfirm.trim()) return showNotice("비밀번호 확인을 입력해주세요.");
    if (joinForm.password !== joinForm.passwordConfirm) {
      return showNotice("비밀번호 확인이 일치하지 않아요.");
    }
    if (!joinForm.nickname.trim()) return showNotice("닉네임을 입력해주세요.");

    try {
      const res = await fetch(`${API_BASE}/api/member/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: joinForm.loginId.trim(),
          password: joinForm.password,
          nickname: joinForm.nickname.trim(),
          birthDate: joinForm.birthDate || null,
          region: null,
        }),
      });

      if (!res.ok) {
        showNotice("회원가입에 실패했어요. 아이디 중복일 수 있어요.");
        return;
      }

      showNotice("회원가입 완료! 로그인해주세요.");
      setLoginForm({ loginId: joinForm.loginId.trim(), password: "" });
      setJoinForm(emptyJoinForm);
      setAuthMode("login");
    } catch (e) {
      console.error(e);
      showNotice("회원가입 중 오류가 발생했어요.");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!loginForm.loginId.trim()) return showNotice("아이디를 입력해주세요.");
    if (!loginForm.password.trim()) return showNotice("비밀번호를 입력해주세요.");

    try {
      const res = await fetch(`${API_BASE}/api/member/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });

      if (!res.ok) {
        showNotice("아이디 또는 비밀번호가 맞지 않아요.");
        return;
      }

      const member = await res.json();

      setLoginMember(member);
      setRooms([]);
      setMessages([]);
      setTodos([]);
      setFutureTodos([]);
      setPastTodos([]);
      setSelectedRoomId(null);
      setHomeMode(true);

      window.history.pushState({}, "", "/");
      showNotice(`${member.nickname}님 환영해요.`);
    } catch (e) {
      console.error(e);
      showNotice("로그인 중 오류가 발생했어요.");
    }
  };

  const logout = () => {
    localStorage.removeItem("loginMember");
    setLoginMember(null);
    setRooms([]);
    setMessages([]);
    setTodos([]);
    setFutureTodos([]);
    setPastTodos([]);
    setSelectedRoomId(null);
    setHomeMode(true);
    setFavoriteMode(false);
    setAuthMode("login");
    setLoginForm({ loginId: "", password: "" });
    setJoinForm(emptyJoinForm);
    setWeather(null);
    setWeatherText("현재 위치 버튼을 눌러 날씨를 불러오세요.");
    setLocationName("현재 위치");
    clearSelectedFiles();
    stopSpeaking();
    recognitionRef.current?.stop();
    setIsListening(false);
    window.history.pushState({}, "", "/login");
  };

  const openJoin = () => {
    setJoinForm(emptyJoinForm);
    setAuthMode("join");
  };

  const openLogin = () => {
    setJoinForm(emptyJoinForm);
    setAuthMode("login");
  };

  const openEditModal = () => {
    setEditForm({
      nickname: loginMember.nickname || "",
      password: "",
      passwordConfirm: "",
    });
    setEditModalOpen(true);
  };

  const openPasswordModal = () => {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      newPasswordConfirm: "",
    });
    setPasswordModalOpen(true);
  };

  const updateMember = async () => {
    if (!editForm.nickname.trim()) return showNotice("닉네임을 입력해주세요.");
    if (!editForm.password.trim()) return showNotice("비밀번호를 입력해주세요.");
    if (!editForm.passwordConfirm.trim()) return showNotice("비밀번호를 재입력해주세요.");
    if (editForm.password !== editForm.passwordConfirm) {
      return showNotice("비밀번호 재입력이 일치하지 않아요.");
    }

    try {
      const res = await fetch(`${API_BASE}/api/member/${loginMember.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: editForm.nickname.trim(),
          password: editForm.password,
          passwordConfirm: editForm.passwordConfirm,
        }),
      });

      if (!res.ok) {
        showNotice("비밀번호가 맞지 않거나 수정에 실패했어요.");
        return;
      }

      const updatedMember = await res.json();

      setLoginMember(updatedMember);
      setEditModalOpen(false);
      showNotice("회원정보를 수정했어요.");
    } catch (e) {
      console.error(e);
      showNotice("회원정보 수정 중 오류가 발생했어요.");
    }
  };

  const changePassword = async () => {
    if (!passwordForm.currentPassword.trim()) return showNotice("현재 비밀번호를 입력해주세요.");
    if (!passwordForm.newPassword.trim()) return showNotice("새 비밀번호를 입력해주세요.");
    if (!passwordForm.newPasswordConfirm.trim()) return showNotice("새 비밀번호를 재입력해주세요.");
    if (passwordForm.newPassword !== passwordForm.newPasswordConfirm) {
      return showNotice("새 비밀번호 재입력이 일치하지 않아요.");
    }

    try {
      const res = await fetch(`${API_BASE}/api/member/${loginMember.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      });

      if (!res.ok) {
        showNotice("현재 비밀번호가 맞지 않거나 변경에 실패했어요.");
        return;
      }

      setPasswordModalOpen(false);
      showNotice("비밀번호를 변경했어요.");
    } catch (e) {
      console.error(e);
      showNotice("비밀번호 변경 중 오류가 발생했어요.");
    }
  };

  const fortune = useMemo(() => {
    if (!loginMember) return "";

    const fortunes = [
      "오늘은 새로운 기회가 찾아오는 날입니다.",
      "작은 배려가 큰 행운으로 돌아옵니다.",
      "뜻밖의 연락이 기분 좋은 소식을 가져옵니다.",
      "집중력이 높아져 중요한 일을 해결할 수 있습니다.",
      "금전운이 평소보다 좋은 하루입니다.",
      "새로운 도전을 시작하기 좋은 날입니다.",
      "주변 사람과의 대화에서 힌트를 얻습니다.",
      "생각보다 일이 쉽게 풀릴 수 있습니다.",
      "건강 관리에 조금 더 신경 써보세요.",
      "계획했던 일이 순조롭게 진행됩니다.",
      "긍정적인 마음이 좋은 결과를 부릅니다.",
      "작은 성공이 자신감을 높여줍니다.",
      "주변의 도움을 받을 가능성이 높습니다.",
      "기다리던 소식을 들을 수 있습니다.",
      "인내심이 빛을 발하는 하루입니다.",
      "실수를 두려워하지 마세요.",
      "새로운 만남이 기대되는 날입니다.",
      "운보다 실력이 빛나는 하루입니다.",
      "오늘은 차분함이 최고의 무기입니다.",
      "행운이 가까이에 있습니다.",
      "뜻밖의 기회가 숨어 있습니다.",
      "작은 변화가 큰 결과를 만듭니다.",
      "주변을 정리하면 좋은 일이 생깁니다.",
      "결정을 미루지 않는 것이 좋습니다.",
      "자신감을 가져도 되는 하루입니다.",
      "노력이 보상을 받기 시작합니다.",
      "좋은 아이디어가 떠오를 수 있습니다.",
      "대인관계가 좋아지는 하루입니다.",
      "집중력이 최고조에 달합니다.",
      "행복한 순간을 발견하게 됩니다.",
      "여유를 가지면 더 좋은 결과가 나옵니다.",
      "새로운 목표를 세워보세요.",
      "기회는 준비된 사람에게 옵니다.",
      "기분 좋은 일이 기다리고 있습니다.",
      "오늘은 웃을 일이 많습니다.",
      "도전이 행운을 불러옵니다.",
      "자신의 감을 믿어보세요.",
      "의외의 곳에서 도움을 받습니다.",
      "긍정적인 에너지가 가득한 날입니다.",
      "한 걸음 더 나아갈 수 있습니다.",
      "노력한 만큼 결과가 따라옵니다.",
      "주변 사람의 조언이 도움이 됩니다.",
      "좋은 인연을 만날 수 있습니다.",
      "행동력이 빛나는 하루입니다.",
      "작은 성취를 즐겨보세요.",
      "새로운 배움을 얻을 수 있습니다.",
      "생각지 못한 즐거움이 찾아옵니다.",
      "오늘은 운이 당신 편입니다.",
      "작은 친절이 큰 보답으로 돌아옵니다.",
      "기회를 놓치지 마세요.",
      "자신에게 투자하기 좋은 날입니다.",
      "중요한 선택에 유리한 날입니다.",
      "행운의 숫자는 7입니다.",
      "행운의 색상은 파란색입니다.",
      "기다림 끝에 좋은 결과가 옵니다.",
      "마음먹은 일이 이루어질 가능성이 높습니다.",
      "대화 속에서 답을 찾게 됩니다.",
      "오늘은 집중력이 특히 좋습니다.",
      "재물운이 상승하는 하루입니다.",
      "계획을 실행하기 좋은 타이밍입니다.",
      "좋은 습관이 좋은 결과를 만듭니다.",
      "작은 변화가 큰 기쁨을 줍니다.",
      "오늘은 적극성이 필요합니다.",
      "행복은 가까운 곳에 있습니다.",
      "기분 좋은 만남이 예상됩니다.",
      "오래된 고민이 해결될 수 있습니다.",
      "좋은 소식이 들려올 수 있습니다.",
      "주변의 응원을 받게 됩니다.",
      "오늘은 자신을 믿어보세요.",
      "새로운 가능성이 열리는 날입니다.",
      "행운이 예상치 못한 곳에서 찾아옵니다.",
      "도움을 주면 더 큰 도움을 받습니다.",
      "오늘은 여유가 중요합니다.",
      "긍정적인 태도가 성공을 부릅니다.",
      "좋은 결과가 눈앞에 있습니다.",
      "오늘은 운과 실력이 함께합니다.",
      "기대 이상의 결과가 나올 수 있습니다.",
      "웃음이 행운을 불러옵니다.",
      "하루를 즐기면 좋은 일이 생깁니다."
    ];

    const today = getTodayString();

    const key =
        `${loginMember.id}-${loginMember.birthDate || ""}-${today}`;

    let hash = 0;

    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash |= 0;
    }

    return fortunes[Math.abs(hash) % fortunes.length];
  }, [loginMember]);

  const getWeatherIcon = (code) => {
    if (code === 0) return "☀️";
    if ([1, 2, 3].includes(code)) return "⛅";
    if ([45, 48].includes(code)) return "🌫️";
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
    if ([95, 96, 99].includes(code)) return "⛈️";
    return "🌤️";
  };

  const guessLocationName = (lat, lon) => {
    if (lat >= 35.15 && lat <= 35.35 && lon >= 128.75 && lon <= 129.05) return "김해시";
    if (lat >= 35.05 && lat <= 35.25 && lon >= 128.95 && lon <= 129.25) return "부산광역시";
    if (lat >= 35.10 && lat <= 35.35 && lon >= 128.45 && lon <= 128.80) return "창원시";
    return "현재 위치";
  };

  const loadWeather = () => {
    if (!navigator.geolocation) {
      setWeather(null);
      setWeatherText("브라우저가 현재 위치를 지원하지 않아요.");
      setLocationName("현재 위치");
      return;
    }

    setWeatherText("현재 위치 확인 중...");

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;

            const guessedName = guessLocationName(lat, lon);
            setLocationName(guessedName);

            const res = await fetch(`${API_BASE}/api/weather?latitude=${lat}&longitude=${lon}`);
            const data = await res.json();

            setWeather(data.current_weather);
            setWeatherText(`${guessedName} 기준`);
          } catch (e) {
            console.error(e);
            setWeather(null);
            setWeatherText("날씨 불러오기 실패");
            setLocationName("현재 위치");
          }
        },
        () => {
          setWeather(null);
          setWeatherText("현재 위치 권한이 필요해요.");
          setLocationName("현재 위치");
        }
    );
  };

  const loadRooms = async () => {
    if (!loginMember) return;

    try {
      const url = roomKeyword.trim()
          ? `${API_BASE}/api/chatrooms/search?memberId=${loginMember.id}&keyword=${encodeURIComponent(roomKeyword)}`
          : `${API_BASE}/api/chatrooms?memberId=${loginMember.id}`;

      const res = await fetch(url);

      if (!res.ok) {
        setRooms([]);
        return;
      }

      const data = await res.json();
      const roomList = Array.isArray(data) ? data : [];

      setRooms(roomList);

      if (roomList.length > 0 && selectedRoomId === null) {
        setSelectedRoomId(roomList[0].id);
      }

      if (roomList.length === 0) {
        setSelectedRoomId(null);
        setMessages([]);
      }
    } catch (e) {
      console.error(e);
      setRooms([]);
    }
  };

  const loadMessages = async (roomId) => {
    if (!roomId) {
      setMessages([]);
      return;
    }

    try {
      // 대화 내용 검색은 프론트에서 처리합니다.
      // 서버 검색 API를 쓰면 검색된 메시지만 남아서 원래 대화 위치로 이동할 수 없습니다.
      const res = await fetch(`${API_BASE}/api/messages/${roomId}`);

      if (!res.ok) {
        setMessages([]);
        return;
      }

      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setMessages([]);
    }
  };

  const scrollToSearchResult = (index) => {
    if (messageSearchResults.length === 0) {
      showNotice("검색 결과가 없어요.");
      return;
    }

    const safeIndex =
        (index + messageSearchResults.length) % messageSearchResults.length;

    const target = messageSearchResults[safeIndex];
    const targetMark = messageListRef.current?.querySelector(
        `[data-search-key="${target.searchKey}"]`
    );
    const targetMessage = messageItemRefs.current[target.messageId];

    setSearchIndex(safeIndex);

    setTimeout(() => {
      const el = targetMark || targetMessage;

      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }
    }, 0);
  };

  const handleMessageSearchKeyDown = (e) => {
    if (e.key !== "Enter") return;

    e.preventDefault();

    if (!selectedRoomId || !messageKeyword.trim()) return;

    scrollToSearchResult(searchIndex);
  };

  const openRoomModal = () => {
    setFavoriteMode(false);
    setNewRoomTitle("");
    setRoomModalOpen(true);
  };

  const createRoom = async () => {
    const title = newRoomTitle.trim();

    if (!title) {
      showNotice("채팅방 이름을 입력해주세요.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/chatrooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: loginMember.id,
          title,
        }),
      });

      if (!res.ok) {
        showNotice("채팅방 생성에 실패했어요.");
        return;
      }

      await loadRooms();

      const roomListRes = await fetch(`${API_BASE}/api/chatrooms?memberId=${loginMember.id}`);
      const roomList = await roomListRes.json();

      const newRoom = roomList.find((room) => room.title === title) || roomList[0];

      if (newRoom) {
        setSelectedRoomId(newRoom.id);
        setMessages([]);
        setHomeMode(false);
        setFavoriteMode(false);
      }

      setRoomModalOpen(false);
      setNewRoomTitle("");
      showNotice("새로운 대화가 만들어졌어요.");
    } catch (e) {
      console.error(e);
      showNotice("채팅방 생성 중 오류가 발생했어요.");
    }
  };

  const deleteRoom = async (roomId, e) => {
    e.stopPropagation();

    if (!window.confirm("이 채팅방을 삭제할까요?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/chatrooms/${roomId}`, {
        method: "DELETE",
      });

      if (!res.ok) return showNotice("채팅방 삭제에 실패했어요.");

      if (selectedRoomId === roomId) {
        setSelectedRoomId(null);
        setMessages([]);
      }

      await loadRooms();
      showNotice("채팅방을 삭제했어요.");
    } catch (e) {
      console.error(e);
      showNotice("채팅방 삭제 중 오류가 발생했어요.");
    }
  };

  const addFilesToSelection = (files, option = {}) => {
    const fileList = Array.from(files || []);
    const fromPaste = option.fromPaste === true;

    if (fileList.length === 0) {
      return false;
    }

    if (!selectedRoomId) {
      showNotice("먼저 채팅방을 선택해주세요.");
      return false;
    }

    const validFiles = fileList.filter((file) => {
      if (!file) return false;

      if (fromPaste && !file.type.startsWith("image/")) {
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) {
      if (fromPaste) {
        showNotice("붙여넣기 가능한 이미지가 없어요.");
      }
      return false;
    }

    const overSizeFile = validFiles.find((file) => file.size > MAX_FILE_SIZE);

    if (overSizeFile) {
      showNotice("20MB 이하 파일만 첨부할 수 있어요.");
      return false;
    }

    const normalizedFiles = validFiles.map((file, index) => {
      if (!fromPaste) {
        return file;
      }

      const extension = file.type.includes("png")
          ? "png"
          : file.type.includes("webp")
              ? "webp"
              : file.type.includes("gif")
                  ? "gif"
                  : "jpg";

      return new File(
          [file],
          `pasted-image-${Date.now()}-${index}.${extension}`,
          {
            type: file.type || "image/png",
            lastModified: Date.now(),
          }
      );
    });

    const newPreviewUrls = normalizedFiles.map((file) => ({
      name: file.name,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));

    setSelectedFiles((prev) => [...prev, ...normalizedFiles]);
    setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);

    if (fromPaste) {
      showNotice("붙여넣은 스크린샷을 첨부했어요.");
    }

    return true;
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);

    addFilesToSelection(files);

    e.target.value = "";
  };

  const uploadOneFile = async (file, text) => {
    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await fetch(`${API_BASE}/api/files/upload`, {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) {
      throw new Error("파일 업로드 실패");
    }

    const uploadData = await uploadRes.json();
    const isImage = file.type.startsWith("image/");

    const saveRes = await fetch(`${API_BASE}/api/messages/file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: selectedRoomId,
        role: "USER",
        content: text || (isImage ? "이미지를 보냈습니다." : "파일을 보냈습니다."),
        messageType: isImage ? "IMAGE" : "FILE",
        fileName: uploadData.fileName,
        fileUrl: uploadData.fileUrl,
      }),
    });

    if (!saveRes.ok) {
      throw new Error("파일 메시지 저장 실패");
    }

    return {
      fileName: uploadData.fileName,
      fileUrl: uploadData.fileUrl,
      isImage,
    };
  };


  const saveUserMessage = async (roomId, content) => {
    const res = await fetch(`${API_BASE}/api/messages/user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        role: "USER",
        messageType: "TEXT",
        content,
      }),
    });

    if (!res.ok) {
      throw new Error("사용자 메시지 저장 실패");
    }
  };

  const saveAssistantMessage = async (roomId, content) => {
    const cleanContent = normalizeAiText(content);

    const res = await fetch(`${API_BASE}/api/messages/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        role: "ASSISTANT",
        messageType: "TEXT",
        content: cleanContent,
      }),
    });

    if (!res.ok) {
      throw new Error("AI 메시지 저장 실패");
    }
  };

  const uploadSelectedFiles = async (text) => {
    const results = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      const messageText =
          i === 0
              ? text
              : file.type.startsWith("image/")
                  ? "이미지를 보냈습니다."
                  : "파일을 보냈습니다.";

      const result = await uploadOneFile(file, messageText);
      results.push(result);
    }

    return results;
  };

  const sendMessage = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || !selectedRoomId || uploading) return;

    const userText = input.trim();

    setUploading(true);

    try {
      if (selectedFiles.length > 0) {
        const fileResults = await uploadSelectedFiles(userText);
        clearSelectedFiles();
        setInput("");

        const imageResults = fileResults.filter((file) => file.isImage);

        if (imageResults.length > 0) {

          const imageUrls =
              imageResults.map(image => image.fileUrl);

          const imageQuestion =
              userText && userText.trim()
                  ? userText
                  : "이 이미지를 자세히 분석해줘.";

          const askRes = await fetch(
              `${API_BASE}/api/chat/ask-images`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  userMessage: imageQuestion,
                  fileUrls: imageUrls
                })
              }
          );

          if (!askRes.ok) {

            showNotice("이미지 분석 응답을 가져오지 못했어요.");

            await loadMessages(selectedRoomId);

            return;
          }

          const askData = await askRes.json();

          const aiText =
              askData.aiMessage || "이미지 분석 실패";

          await typeAssistantMessage(aiText);

          await saveAssistantMessage(selectedRoomId, aiText);
        }

        await loadMessages(selectedRoomId);
        return;
      }

      await saveUserMessage(selectedRoomId, userText);

      setInput("");

      const askRes = await fetch(`${API_BASE}/api/chat/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selectedRoomId,
          memberId: loginMember.id,
          userMessage: userText,
        }),
      });

      if (!askRes.ok) {
        showNotice("GPT 응답을 가져오지 못했어요.");
        await loadMessages(selectedRoomId);
        return;
      }

      const askData = await askRes.json();
      const aiText = normalizeAiText(askData.aiMessage || "응답을 가져오지 못했어요.");

      await typeAssistantMessage(aiText);

      await saveAssistantMessage(selectedRoomId, aiText);

      await loadMessages(selectedRoomId);
    } catch (e) {
      console.error(e);
      showNotice("파일 첨부 또는 메시지 전송 중 오류가 발생했어요.");
    } finally {
      setUploading(false);
    }
  };

  const loadTodos = async () => {
    if (!loginMember) return;

    try {
      const todayRes = await fetch(`${API_BASE}/api/todos/${loginMember.id}/today`);
      const futureRes = await fetch(`${API_BASE}/api/todos/${loginMember.id}/future`);
      const pastRes = await fetch(`${API_BASE}/api/todos/${loginMember.id}/past`);

      const todayData = todayRes.ok ? await todayRes.json() : [];
      const futureData = futureRes.ok ? await futureRes.json() : [];
      const pastData = pastRes.ok ? await pastRes.json() : [];

      setTodos(Array.isArray(todayData) ? todayData : []);
      setFutureTodos(Array.isArray(futureData) ? futureData : []);
      setPastTodos(Array.isArray(pastData) ? pastData : []);
    } catch (e) {
      console.error(e);
      setTodos([]);
      setFutureTodos([]);
      setPastTodos([]);
    }
  };

  const addTodo = async () => {
    if (!todoInput.trim()) return showNotice("할 일을 입력해주세요.");

    try {
      const res = await fetch(`${API_BASE}/api/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: loginMember.id,
          content: todoInput,
          todoDate,
        }),
      });

      if (!res.ok) return showNotice("할 일 추가에 실패했어요.");

      setTodoInput("");
      setTodoDate(getTodayString());
      await loadTodos();
      setTodoTab(todoDate > todayString ? "future" : todoDate < todayString ? "past" : "today");
      showNotice("할 일을 등록했어요.");
    } catch (e) {
      console.error(e);
      showNotice("할 일 추가 중 오류가 발생했어요.");
    }
  };

  const doneTodo = async (id) => {
    await fetch(`${API_BASE}/api/todos/${id}/done`, { method: "PUT" });
    await loadTodos();
  };

  const deleteTodo = async (id) => {
    await fetch(`${API_BASE}/api/todos/${id}`, { method: "DELETE" });
    await loadTodos();
  };

  useEffect(() => {
    localStorage.removeItem("loginMember");
  }, []);

  useEffect(() => {
    if (!loginMember) {
      window.history.replaceState({}, "", "/login");
      return;
    }

    window.history.replaceState({}, "", "/");
    loadRooms();
    loadTodos();
  }, [loginMember]);

  useEffect(() => {
    if (!loginMember) return;
    const timer = setTimeout(loadRooms, 300);
    return () => clearTimeout(timer);
  }, [roomKeyword]);

  useEffect(() => {
    if (!selectedRoomId) return;

    const timer = setTimeout(() => {
      loadMessages(selectedRoomId);
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedRoomId]);

  useEffect(() => {
    setSearchIndex(0);
  }, [messageKeyword, selectedRoomId]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((item) => {
        if (item.url) URL.revokeObjectURL(item.url);
      });
    };
  }, [previewUrls]);

  useEffect(() => {
    const handlePaste = (e) => {
      if (!loginMember || homeMode || uploading) {
        return;
      }

      const clipboardItems = Array.from(e.clipboardData?.items || []);
      const pastedImages = clipboardItems
          .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
          .map((item) => item.getAsFile())
          .filter(Boolean);

      if (pastedImages.length === 0) {
        return;
      }

      e.preventDefault();
      addFilesToSelection(pastedImages, { fromPaste: true });
    };

    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [loginMember, homeMode, uploading, selectedRoomId]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);


  const activeTodos =
      todoTab === "today" ? todos : todoTab === "future" ? futureTodos : pastTodos;

  const todoTitle =
      todoTab === "today" ? "오늘 할 일" : todoTab === "future" ? "예정 내역" : "지난 내역";


  const favoriteList = useMemo(() => {
    return Object.values(favoriteMessages)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .map((favorite) => ({
          ...favorite,
          roomTitle:
              rooms.find((room) => room.id === favorite.roomId)?.title ||
              (favorite.roomId ? `채팅방 ${favorite.roomId}` : "대화방"),
        }));
  }, [favoriteMessages, rooms]);


  const isDefaultImageText = (content) => {
    return !content || content === "이미지를 보냈습니다.";
  };

  const isDefaultFileText = (content) => {
    return !content || content === "파일을 보냈습니다.";
  };

  const displayMessages = useMemo(() => {
    const grouped = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const type = msg.messageType || "TEXT";

      if (msg.role === "USER" && type === "IMAGE") {
        const imageGroup = [];
        let text = "";
        let j = i;

        while (j < messages.length) {
          const current = messages[j];
          const currentType = current.messageType || "TEXT";

          if (current.role !== "USER" || currentType !== "IMAGE") {
            break;
          }

          imageGroup.push(current);

          if (!text && !isDefaultImageText(current.content)) {
            text = current.content;
          }

          j++;
        }

        grouped.push({
          id: `image-group-${imageGroup.map((item) => item.id).join("-")}`,
          role: "USER",
          messageType: "IMAGE_GROUP",
          content: text,
          images: imageGroup,
        });

        i = j - 1;
        continue;
      }

      grouped.push(msg);
    }

    return grouped;
  }, [messages]);

  const displayMessagesWithStreaming = useMemo(() => {
    if (!streamingMessage) {
      return displayMessages;
    }

    return [...displayMessages, streamingMessage];
  }, [displayMessages, streamingMessage]);

  const messageSearchResults = useMemo(() => {
    const keyword = messageKeyword.trim().toLowerCase();

    if (!keyword) return [];

    const results = [];

    displayMessagesWithStreaming.forEach((message) => {
      const content = String(message.content || "");
      const lowerContent = content.toLowerCase();
      let fromIndex = 0;
      let occurrenceIndex = 0;

      while (true) {
        const foundIndex = lowerContent.indexOf(keyword, fromIndex);

        if (foundIndex === -1) break;

        results.push({
          messageId: message.id,
          occurrenceIndex,
          searchKey: makeSearchKey(message.id, occurrenceIndex),
        });

        occurrenceIndex += 1;
        fromIndex = foundIndex + keyword.length;
      }
    });

    return results;
  }, [displayMessagesWithStreaming, messageKeyword]);

  const getAnswerSourceContext = (assistantMessage, list = displayMessagesWithStreaming) => {
    if (!assistantMessage || assistantMessage.role === "USER") return null;

    const assistantIndex = list.findIndex((message) => message.id === assistantMessage.id);
    const searchEnd = assistantIndex >= 0 ? assistantIndex - 1 : list.length - 1;

    for (let i = searchEnd; i >= 0; i--) {
      const source = list[i];
      if (!source || source.role !== "USER") continue;

      const type = source.messageType || "TEXT";

      if (type === "IMAGE_GROUP") {
        const imageCount = source.images?.length || 0;
        const question = source.content?.trim() || "이미지만 첨부해서 자동 분석 요청";
        return {
          icon: "🖼️",
          label: `이미지 ${imageCount}장에 대한 답변`,
          question,
          detail: imageCount > 0 ? `위에 첨부된 이미지 ${imageCount}장을 기준으로 생성된 답변입니다.` : "이미지 분석 답변입니다.",
          attachments: (source.images || []).map((image) => ({
            type: "IMAGE",
            fileName: image.fileName || "업로드 이미지",
            fileUrl: image.fileUrl || "",
          })),
        };
      }

      if (type === "IMAGE") {
        const question = source.content?.trim() && !isDefaultImageText(source.content)
            ? source.content.trim()
            : "이미지만 첨부해서 자동 분석 요청";
        return {
          icon: "🖼️",
          label: "이미지 1장에 대한 답변",
          question,
          detail: "위에 첨부된 이미지 1장을 기준으로 생성된 답변입니다.",
          attachments: [{
            type: "IMAGE",
            fileName: source.fileName || "업로드 이미지",
            fileUrl: source.fileUrl || "",
          }],
        };
      }

      if (type === "FILE") {
        const question = source.content?.trim() && !isDefaultFileText(source.content)
            ? source.content.trim()
            : "파일 첨부 질문";
        return {
          icon: "📎",
          label: "첨부파일에 대한 답변",
          question,
          detail: source.fileName ? `첨부파일: ${source.fileName}` : "첨부파일 기준 답변입니다.",
          attachments: [{
            type: "FILE",
            fileName: source.fileName || "첨부파일",
            fileUrl: source.fileUrl || "",
          }],
        };
      }

      return {
        icon: "💬",
        label: "이전 질문에 대한 답변",
        question: source.content?.trim() || "질문 내용 없음",
        detail: "바로 위 사용자 질문을 기준으로 생성된 답변입니다.",
      };
    }

    return {
      icon: "🤖",
      label: "AI 답변",
      question: "연결된 질문을 찾지 못했어요.",
      detail: "이 답변은 현재 대화 흐름에서 생성되었습니다.",
    };
  };

  useEffect(() => {
    const el = messageListRef.current;
    if (!el) return;

    // 검색 중에는 사용자가 보고 있는 위치를 유지합니다.
    if (messageKeyword.trim()) return;

    el.scrollTop = el.scrollHeight;
  }, [displayMessagesWithStreaming, messageKeyword]);

  if (!loginMember) {
    return (
        <div className="login-page">
          <div className="login-card">
            <div className="login-logo">🐳</div>
            <h1>WhisperMe</h1>
            <p>{authMode === "login" ? "나만의 AI 비서에 로그인하세요" : "회원가입 후 위스퍼미를 시작하세요"}</p>

            {authMode === "login" ? (
                <form onSubmit={handleLogin} className="login-form">
                  <label>아이디</label>
                  <input value={loginForm.loginId} onChange={(e) => setLoginForm({ ...loginForm, loginId: e.target.value })} placeholder="아이디 입력" />

                  <label>비밀번호</label>
                  <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="비밀번호 입력" />

                  <button type="submit">로그인</button>

                  <button type="button" className="auth-switch-btn" onClick={openJoin}>
                    회원가입하기
                  </button>
                </form>
            ) : (
                <form onSubmit={handleJoin} className="login-form">
                  <label>아이디</label>
                  <input value={joinForm.loginId} onChange={(e) => setJoinForm({ ...joinForm, loginId: e.target.value })} placeholder="아이디 입력" />

                  <label>비밀번호</label>
                  <input type="password" value={joinForm.password} onChange={(e) => setJoinForm({ ...joinForm, password: e.target.value })} placeholder="비밀번호 입력" />

                  <label>비밀번호 확인</label>
                  <input type="password" value={joinForm.passwordConfirm} onChange={(e) => setJoinForm({ ...joinForm, passwordConfirm: e.target.value })} placeholder="비밀번호 확인" />

                  <label>닉네임</label>
                  <input value={joinForm.nickname} onChange={(e) => setJoinForm({ ...joinForm, nickname: e.target.value })} placeholder="닉네임 입력" />

                  <label>생년월일</label>
                  <input type="date" value={joinForm.birthDate} onChange={(e) => setJoinForm({ ...joinForm, birthDate: e.target.value })} />

                  <button type="submit">회원가입</button>

                  <button type="button" className="auth-switch-btn" onClick={openLogin}>
                    로그인으로 돌아가기
                  </button>
                </form>
            )}
          </div>

          {notice && (
              <div className="pretty-notice">
                <div className="notice-icon">🐳</div>
                <p>{notice}</p>
              </div>
          )}
        </div>
    );
  }

  return (
      <div className={`app ${darkMode ? "dark-mode" : ""}`}>
        <style>{frontOnlyEnhanceStyle}</style>
        <aside className="sidebar">
          <div
              className="brand"
              onClick={() => {
                setFavoriteMode(false);
                setHomeMode(true);
              }}
              style={{ cursor: "pointer" }}
          >
            <div className="logo">🐳</div>
            <div>
              <h1 style={brandTitleStyle}>WhisperMe</h1>
              <p>나만의 AI 비서</p>
            </div>
          </div>

          <div className="member-box">
            <p>안녕하세요</p>
            <h2 style={nicknameBadgeStyle}>{loginMember.nickname}님</h2>
            <span>{locationName} 기반</span>

            <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
              <button onClick={openEditModal}>정보 수정</button>
              <button onClick={openPasswordModal}>비밀번호 변경</button>
            </div>

            <button onClick={logout} style={{ marginTop: "8px" }}>
              로그아웃
            </button>

            <button className="theme-toggle-btn" onClick={toggleDarkMode}>
              {darkMode ? "☀️ 라이트모드" : "🌙 다크모드"}
            </button>
          </div>

          <button className="new-room-btn" onClick={openRoomModal}>
            + 새로운 대화
          </button>

          <button
              className={`favorite-nav-btn ${favoriteMode ? "active" : ""}`}
              type="button"
              onClick={() => {
                setHomeMode(false);
                setFavoriteMode(true);
                setSelectedRoomId(null);
                setMessages([]);
                setMessageKeyword("");
              }}
          >
            <span>⭐ 중요 답변</span>
            <b>{Object.values(favoriteMessages).length}</b>
          </button>

          <input className="room-search" value={roomKeyword} onChange={(e) => setRoomKeyword(e.target.value)} placeholder="채팅방 검색" />

          <div className="room-list">
            {rooms.map((room) => (
                <div
                    key={room.id}
                    className={`room-item room-item-row ${selectedRoomId === room.id ? "active" : ""}`}
                    onClick={() => {
                      if (editingRoomId === room.id) return;
                      setSelectedRoomId(room.id);
                      setFavoriteMode(false);
                      setHomeMode(false);
                    }}
                >
                  {editingRoomId === room.id ? (
                      <div className="room-edit-box" onClick={(e) => e.stopPropagation()}>
                        <input
                            value={editingRoomTitle}
                            onChange={(e) => setEditingRoomTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveRoomTitle(room.id, e);
                              if (e.key === "Escape") cancelRoomTitleEdit(e);
                            }}
                            autoFocus
                        />
                        <button type="button" onClick={(e) => saveRoomTitle(room.id, e)}>
                          저장
                        </button>
                        <button type="button" onClick={cancelRoomTitleEdit}>
                          취소
                        </button>
                      </div>
                  ) : (
                      <>
                        <span>{room.title}</span>
                        <div className="room-mini-actions">
                          <button type="button" onClick={(e) => openRoomTitleEdit(room, e)} title="제목 수정">
                            ✎
                          </button>
                          <button type="button" onClick={(e) => deleteRoom(room.id, e)} title="삭제">
                            ×
                          </button>
                        </div>
                      </>
                  )}
                </div>
            ))}
          </div>
        </aside>

        <main className="main">
          <section className="today-area">
            <div className="today-card weather">
              <span>오늘 날씨</span>
              <h3>{locationName}</h3>

              {weather ? (
                  <p>
                    {getWeatherIcon(weather.weathercode)} {weather.temperature}℃
                    <br />
                    {weatherText}
                  </p>
              ) : (
                  <p>{weatherText}</p>
              )}

              <div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
                <button onClick={loadWeather} style={locationButtonStyle}>
                  📍 현재 위치
                </button>

                <button onClick={() => setLocationHelpOpen(true)} style={locationSubButtonStyle}>
                  권한 안내
                </button>
              </div>
            </div>

            <div className="today-card fortune">
              <span>오늘의 운세</span>
              <h3>{loginMember.nickname} 님</h3>
              <p>{fortune}</p>
            </div>

            <div className="today-card todo-summary">
              <span>오늘 할 일</span>
              <h3>{todos.filter((todo) => !todo.done).length}개 남음</h3>
              <p>완료 {todos.filter((todo) => todo.done).length}개</p>
            </div>
          </section>

          <section className="content-layout">
            <div className="chat-panel">
              <div className="chat-header chat-header-plus">
                <div>
                  <p>{favoriteMode ? "FAVORITE" : "AI 채팅"}</p>
                  <h2>{favoriteMode ? "중요 답변 모음" : "위스퍼미와 대화하기"}</h2>
                </div>

                {favoriteMode && favoriteList.length > 0 && (
                    <div className="chat-header-actions favorite-header-actions">
                      <button type="button" onClick={exportFavoritesAsTxt}>
                        📄 중요 TXT
                      </button>
                      <button type="button" onClick={clearFavoriteMessages}>
                        🗑 X
                      </button>
                    </div>
                )}
              </div>

              {!homeMode && !favoriteMode && (
                  <div className="message-search-row">
                    <input
                        value={messageKeyword}
                        onChange={(e) => setMessageKeyword(e.target.value)}
                        onKeyDown={handleMessageSearchKeyDown}
                        placeholder="대화 내용 검색"
                    />

                    {messageKeyword.trim() && (
                        <div className="message-search-tools">
                          <span>
                            {messageSearchResults.length === 0
                                ? "0 / 0"
                                : `${searchIndex + 1} / ${messageSearchResults.length}`}
                          </span>

                          <button
                              type="button"
                              onClick={() => scrollToSearchResult(searchIndex - 1)}
                          >
                            ↑
                          </button>

                          <button
                              type="button"
                              onClick={() => scrollToSearchResult(searchIndex + 1)}
                          >
                            ↓
                          </button>
                        </div>
                    )}
                  </div>
              )}

              <div className="message-list" ref={messageListRef}>
                {favoriteMode ? (
                    <div className="favorite-page">
                      <div className="favorite-page-hero">
                        <div>
                          <p>저장해둔 중요한 AI 답변</p>
                          <h1>⭐ 중요 답변 모음</h1>
                          <span>같은 브라우저 localStorage에 저장돼요.</span>
                        </div>
                        <strong>{favoriteList.length}개</strong>
                      </div>

                      {favoriteList.length === 0 ? (
                          <div className="favorite-empty">
                            <div>⭐</div>
                            <h2>아직 저장된 중요 답변이 없어요.</h2>
                            <p>답변 아래의 ☆ 중요 버튼을 누르면 이곳에 모아둘 수 있어요.</p>
                          </div>
                      ) : (
                          <div className="favorite-list">
                            {favoriteList.map((favorite) => (
                                <div key={favorite.id} className="favorite-card">
                                  <div className="favorite-card-head">
                                    <div>
                                      <span>{favorite.roomTitle}</span>
                                      <h3>{favorite.sourceIcon || "⭐"} {favorite.sourceLabel || "중요 답변"}</h3>
                                    </div>
                                    <em>
                                      {favorite.createdAt
                                          ? new Date(favorite.createdAt).toLocaleString("ko-KR")
                                          : ""}
                                    </em>
                                  </div>

                                  <div className="favorite-question-box">
                                    <strong>질문</strong>
                                    <p>{favorite.question || "질문 내용 없음"}</p>
                                    {favorite.sourceDetail && <span>{favorite.sourceDetail}</span>}
                                  </div>

                                  {favorite.attachments?.length > 0 && (
                                      <div className="favorite-attachments">
                                        {favorite.attachments.map((attachment, index) => (
                                            attachment.type === "IMAGE" ? (
                                                <button
                                                    key={`${favorite.id}-attachment-${index}`}
                                                    type="button"
                                                    className="favorite-image-thumb"
                                                    onClick={() =>
                                                        setImageModal({
                                                          src: `${API_BASE}${attachment.fileUrl}`,
                                                          name: attachment.fileName || "저장된 이미지",
                                                        })
                                                    }
                                                >
                                                  <img src={`${API_BASE}${attachment.fileUrl}`} alt={attachment.fileName || "저장된 이미지"} />
                                                </button>
                                            ) : (
                                                <a
                                                    key={`${favorite.id}-attachment-${index}`}
                                                    href={`${API_BASE}${attachment.fileUrl}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="favorite-file-link"
                                                >
                                                  📎 {attachment.fileName || "첨부파일"}
                                                </a>
                                            )
                                        ))}
                                      </div>
                                  )}

                                  <div className="favorite-answer">
                                    <div className="favorite-answer-label">답변</div>
                                    <MarkdownMessage content={favorite.content || ""} />
                                  </div>

                                  <div className="favorite-actions">
                                    <button type="button" onClick={() => copyFavoriteMessage(favorite)}>
                                      📋 복사
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                          const roomId = favorite.roomId;
                                          if (roomId) {
                                            setFavoriteMode(false);
                                            setHomeMode(false);
                                            setSelectedRoomId(roomId);
                                          }
                                        }}
                                    >
                                      💬 원래 대화 열기
                                    </button>
                                    <button
                                        type="button"
                                        className="danger"
                                        onClick={() => removeFavoriteMessage(favorite.id)}
                                    >
                                      삭제
                                    </button>
                                  </div>
                                </div>
                            ))}
                          </div>
                      )}
                    </div>
                ) : homeMode ? (
                    <div className="whisper-home">
                      <div className="ocean">
                        <div className="wave wave1"></div>
                        <div className="wave wave2"></div>
                        <div className="wave wave3"></div>
                        <div className="whale">🐋</div>
                      </div>

                      <h1>WhisperMe</h1>
                      <p>나만의 AI 비서와 대화를 시작해보세요</p>

                      <button className="start-chat-btn" onClick={openRoomModal}>
                        새 대화 시작하기
                      </button>
                    </div>
                ) : (
                    <>
                      {messages.length === 0 && <div className="empty-message">아직 대화가 없어요. 첫 메시지를 보내보세요.</div>}

                      {displayMessagesWithStreaming.map((msg) => {
                        const type = msg.messageType || "TEXT";
                        const answerContext = msg.role !== "USER" ? getAnswerSourceContext(msg) : null;
                        const isSearchMatched =
                            messageKeyword.trim() &&
                            String(msg.content || "")
                                .toLowerCase()
                                .includes(messageKeyword.trim().toLowerCase());
                        const activeSearchKey = messageSearchResults[searchIndex]?.searchKey || "";
                        const isActiveSearch =
                            messageKeyword.trim() &&
                            messageSearchResults[searchIndex]?.messageId === msg.id;

                        return (
                            <div
                                key={msg.id}
                                ref={(el) => {
                                  if (el) {
                                    messageItemRefs.current[msg.id] = el;
                                  }
                                }}
                                className={`message ${msg.role === "USER" ? "user" : "assistant"} ${isSearchMatched ? "search-hit" : ""} ${isActiveSearch ? "active-search-hit" : ""}`}
                            >
                              <div className="bubble">
                                {type === "IMAGE_GROUP" ? (
                                    <>
                                      <div
                                          className="chat-image-group"
                                          style={{
                                            display: "grid",
                                            gridTemplateColumns: msg.images.length === 1 ? "1fr" : "repeat(2, minmax(0, 1fr))",
                                            gap: "10px",
                                            maxWidth: "420px",
                                          }}
                                      >
                                        {msg.images.map((image) => (
                                            <img
                                                key={image.id}
                                                src={`${API_BASE}${image.fileUrl}`}
                                                alt={image.fileName || "업로드 이미지"}
                                                className="chat-image clickable-image"
                                                onClick={() =>
                                                    setImageModal({
                                                      src: `${API_BASE}${image.fileUrl}`,
                                                      name: image.fileName || "업로드 이미지",
                                                    })
                                                }
                                                style={{
                                                  width: "100%",
                                                  height: msg.images.length === 1 ? "auto" : "150px",
                                                  objectFit: "cover",
                                                  borderRadius: "16px",
                                                  display: "block",
                                                }}
                                            />
                                        ))}
                                      </div>

                                      {msg.content && (
                                          <p className="file-message-text">{msg.content}</p>
                                      )}
                                    </>
                                ) : type === "IMAGE" ? (
                                    <>
                                      <img
                                          src={`${API_BASE}${msg.fileUrl}`}
                                          alt={msg.fileName || "업로드 이미지"}
                                          className="chat-image clickable-image"
                                          onClick={() =>
                                              setImageModal({
                                                src: `${API_BASE}${msg.fileUrl}`,
                                                name: msg.fileName || "업로드 이미지",
                                              })
                                          }
                                      />
                                      {msg.content && !isDefaultImageText(msg.content) && (
                                          <p className="file-message-text">{msg.content}</p>
                                      )}
                                    </>
                                ) : type === "FILE" ? (
                                    <>
                                      <a
                                          href={`${API_BASE}${msg.fileUrl}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="chat-file"
                                      >
                                        📎 {msg.fileName || "첨부파일"}
                                      </a>
                                      {msg.content && !isDefaultFileText(msg.content) && (
                                          <p className="file-message-text">{msg.content}</p>
                                      )}
                                    </>
                                ) : (
                                    <>
                                      <MarkdownMessage
                                          content={msg.content}
                                          searchKeyword={messageKeyword}
                                          messageId={msg.id}
                                          activeSearchKey={activeSearchKey}
                                      />
                                      {msg.role !== "USER" && msg.content && (
                                          <>
                                            <div className="assistant-tool-row">
                                              <button type="button" onClick={() => copyTextToClipboard(msg.content)}>
                                                📋 복사
                                              </button>
                                              <button type="button" onClick={() => regenerateAnswer(msg)} disabled={uploading}>
                                                🔄 다시 생성
                                              </button>
                                              <button type="button" onClick={() => speakText(msg.content)}>
                                                🔊 읽기
                                              </button>
                                              <button type="button" onClick={stopSpeaking}>
                                                ⏹ 정지
                                              </button>
                                              <button
                                                  type="button"
                                                  className={messageReactions[msg.id] === "like" ? "active-reaction" : ""}
                                                  onClick={() => toggleReaction(msg.id, "like")}
                                              >
                                                👍
                                              </button>
                                              <button
                                                  type="button"
                                                  className={messageReactions[msg.id] === "dislike" ? "active-reaction" : ""}
                                                  onClick={() => toggleReaction(msg.id, "dislike")}
                                              >
                                                👎
                                              </button>
                                              <button
                                                  type="button"
                                                  className={favoriteMessages[msg.id] ? "active-favorite" : ""}
                                                  onClick={() => toggleFavorite(msg, answerContext)}
                                              >
                                                {favoriteMessages[msg.id] ? "⭐ 저장됨" : "☆ 중요"}
                                              </button>
                                            </div>
                                          </>
                                      )}
                                    </>
                                )}
                              </div>
                            </div>
                        );
                      })}
                    </>
                )}
              </div>

              {!homeMode && !favoriteMode && (
                  <div className="composer-wrap">
                    {selectedFiles.length > 0 && (
                        <div className="file-preview-box">
                          <div
                              className="file-preview-content"
                              style={{
                                display: "flex",
                                gap: "10px",
                                flexWrap: "wrap",
                              }}
                          >
                            {selectedFiles.map((file, index) => (
                                <div
                                    key={`${file.name}-${index}`}
                                    style={{
                                      position: "relative",
                                      width: "92px",
                                      minHeight: "92px",
                                      borderRadius: "16px",
                                      background: "#f8fafc",
                                      border: "1px solid #e2e8f0",
                                      overflow: "hidden",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      padding: "8px",
                                    }}
                                >
                                  {previewUrls[index]?.url ? (
                                      <img
                                          src={previewUrls[index].url}
                                          alt="미리보기"
                                          onClick={() =>
                                              setImageModal({
                                                src: previewUrls[index].url,
                                                name: file.name || "미리보기",
                                              })
                                          }
                                          style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                            borderRadius: "12px",
                                            cursor: "zoom-in",
                                          }}
                                      />
                                  ) : (
                                      <div
                                          style={{
                                            textAlign: "center",
                                            fontSize: "12px",
                                            color: "#475569",
                                            wordBreak: "break-all",
                                          }}
                                      >
                                        <div style={{ fontSize: "24px" }}>📎</div>
                                        <strong>{file.name}</strong>
                                      </div>
                                  )}

                                  <div className="preview-order-actions">
                                    <button
                                        type="button"
                                        onClick={() => moveSelectedFile(index, -1)}
                                        disabled={index === 0}
                                        title="앞으로"
                                    >
                                      ←
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => moveSelectedFile(index, 1)}
                                        disabled={index === selectedFiles.length - 1}
                                        title="뒤로"
                                    >
                                      →
                                    </button>
                                  </div>

                                  <button
                                      type="button"
                                      onClick={() => removeSelectedFile(index)}
                                      style={{
                                        position: "absolute",
                                        top: "4px",
                                        right: "4px",
                                        width: "24px",
                                        height: "24px",
                                        borderRadius: "999px",
                                        border: "0",
                                        background: "rgba(15,23,42,0.75)",
                                        color: "white",
                                        fontWeight: "900",
                                        cursor: "pointer",
                                      }}
                                  >
                                    ×
                                  </button>
                                </div>
                            ))}
                          </div>

                        </div>
                    )}

                    <div className="input-area">
                      <button
                          type="button"
                          className="file-upload-btn"
                          onClick={() => fileInputRef.current?.click()}
                          title="파일 첨부 / 스크린샷은 Ctrl+V로 붙여넣기"
                          disabled={uploading}
                      >
                        📎
                      </button>

                      <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          style={{ display: "none" }}
                          onChange={handleFileUpload}
                      />

                      <button
                          type="button"
                          className={`voice-input-btn ${isListening ? "listening" : ""}`}
                          onClick={startVoiceInput}
                          title="음성 입력"
                          disabled={uploading}
                      >
                        {isListening ? "🎙️" : "🎤"}
                      </button>

                      <textarea
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                          placeholder={selectedFiles.length > 0 ? "사진/파일과 함께 보낼 메시지 입력 · Shift+Enter 줄바꿈" : "메시지를 입력하세요 · 스크린샷은 Ctrl+V · Shift+Enter 줄바꿈"}
                          disabled={uploading}
                          rows={1}
                      />

                      <button onClick={sendMessage} disabled={uploading}>
                        {uploading ? "답변중" : "전송"}
                      </button>
                    </div>
                  </div>
              )}
            </div>

            <aside className="todo-panel">
              <div className="todo-head">
                <p>내 할 일</p>
                <h2>{todoTitle}</h2>
              </div>

              <div className="todo-tabs">
                <button className={todoTab === "today" ? "active" : ""} onClick={() => setTodoTab("today")}>오늘 할 일</button>
                <button className={todoTab === "future" ? "active" : ""} onClick={() => setTodoTab("future")}>예정 내역</button>
                <button className={todoTab === "past" ? "active" : ""} onClick={() => setTodoTab("past")}>지난 내역</button>
              </div>

              {todoTab === "today" && (
                  <div className="todo-input-row">
                    <input type="date" value={todoDate} onChange={(e) => setTodoDate(e.target.value)} />
                    <input value={todoInput} onChange={(e) => setTodoInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTodo()} placeholder="할 일 입력" />
                    <button onClick={addTodo}>추가</button>
                  </div>
              )}

              <div className="todo-list">
                {activeTodos.length === 0 && (
                    <div className="todo-empty">
                      {todoTab === "today" ? "등록된 할 일이 없어요." : todoTab === "future" ? "예정된 할 일이 없어요." : "지난 내역이 없어요."}
                    </div>
                )}

                {activeTodos.map((todo) => (
                    <div key={todo.id} className={`todo-item ${todo.done ? "done" : ""}`}>
                      <div className="todo-top-row">
                        <div className="todo-content">
                          <strong>{todo.done ? "✅ " : "⬜ "}{todo.content}</strong>
                          <p className="todo-date">{todo.todoDate}</p>
                        </div>

                        <div className="todo-actions">
                          {todoTab === "today" && !todo.done && <button onClick={() => doneTodo(todo.id)}>완료</button>}
                          <button className="delete" onClick={() => deleteTodo(todo.id)}>삭제</button>
                        </div>
                      </div>
                    </div>
                ))}
              </div>
            </aside>
          </section>
        </main>

        {locationHelpOpen && (
            <div className="modal-backdrop">
              <div style={modalCardStyle}>
                <div style={modalIconStyle}>📍</div>
                <h2 style={modalTitleStyle}>위치 권한 설정</h2>
                <p style={modalDescStyle}>날씨를 보려면 브라우저 위치 권한이 필요해요.</p>

                <div style={{ textAlign: "left", lineHeight: "1.9", color: "#475569", fontSize: "16px" }}>
                  <p>1. 주소창 왼쪽의 ⓘ 또는 위치 아이콘 클릭</p>
                  <p>2. 위치 권한을 허용으로 변경</p>
                  <p>3. 새로고침 후 현재 위치 버튼 클릭</p>
                </div>

                <div className="modal-actions">
                  <button className="create" onClick={() => setLocationHelpOpen(false)}>확인</button>
                </div>
              </div>
            </div>
        )}

        {editModalOpen && (
            <div className="modal-backdrop">
              <div style={modalCardStyle}>
                <div style={modalIconStyle}>⚙️</div>
                <h2 style={modalTitleStyle}>회원정보 수정</h2>
                <p style={modalDescStyle}>아이디와 생년월일은 수정할 수 없어요.</p>

                <div style={modalFieldStyle}>
                  <label style={modalLabelStyle}>아이디</label>
                  <input style={modalDisabledInputStyle} value={loginMember.loginId || ""} disabled />
                </div>

                <div style={modalFieldStyle}>
                  <label style={modalLabelStyle}>닉네임</label>
                  <input style={modalInputStyle} value={editForm.nickname} onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })} placeholder="닉네임" />
                </div>

                <div style={modalFieldStyle}>
                  <label style={modalLabelStyle}>생년월일</label>
                  <input style={modalDisabledInputStyle} type="date" value={loginMember.birthDate || ""} disabled />
                </div>

                <div style={modalFieldStyle}>
                  <label style={modalLabelStyle}>현재 비밀번호</label>
                  <input style={modalInputStyle} type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="현재 비밀번호" />
                </div>

                <div style={modalFieldStyle}>
                  <label style={modalLabelStyle}>현재 비밀번호 확인</label>
                  <input style={modalInputStyle} type="password" value={editForm.passwordConfirm} onChange={(e) => setEditForm({ ...editForm, passwordConfirm: e.target.value })} placeholder="현재 비밀번호 재입력" />
                </div>

                <div className="modal-actions" style={{ marginTop: "26px" }}>
                  <button className="cancel" onClick={() => setEditModalOpen(false)}>취소</button>
                  <button className="create" onClick={updateMember}>저장</button>
                </div>
              </div>
            </div>
        )}

        {passwordModalOpen && (
            <div className="modal-backdrop">
              <div style={modalCardStyle}>
                <div style={modalIconStyle}>🔐</div>
                <h2 style={modalTitleStyle}>비밀번호 변경</h2>
                <p style={modalDescStyle}>현재 비밀번호 확인 후 새 비밀번호로 변경해요.</p>

                <div style={modalFieldStyle}>
                  <label style={modalLabelStyle}>현재 비밀번호</label>
                  <input style={modalInputStyle} type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} placeholder="현재 비밀번호" />
                </div>

                <div style={modalFieldStyle}>
                  <label style={modalLabelStyle}>새 비밀번호</label>
                  <input style={modalInputStyle} type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} placeholder="새 비밀번호" />
                </div>

                <div style={modalFieldStyle}>
                  <label style={modalLabelStyle}>새 비밀번호 확인</label>
                  <input style={modalInputStyle} type="password" value={passwordForm.newPasswordConfirm} onChange={(e) => setPasswordForm({ ...passwordForm, newPasswordConfirm: e.target.value })} placeholder="새 비밀번호 재입력" />
                </div>

                <div className="modal-actions" style={{ marginTop: "26px" }}>
                  <button className="cancel" onClick={() => setPasswordModalOpen(false)}>취소</button>
                  <button className="create" onClick={changePassword}>변경</button>
                </div>
              </div>
            </div>
        )}

        {roomModalOpen && (
            <div className="modal-backdrop">
              <div style={modalCardStyle}>
                <div style={modalIconStyle}>🐳</div>
                <h2 style={modalTitleStyle}>새로운 대화 만들기</h2>
                <p style={modalDescStyle}>대화 주제를 입력하면 새 채팅방이 만들어져요.</p>

                <div style={modalFieldStyle}>
                  <label style={modalLabelStyle}>대화 제목</label>
                  <input
                      style={modalInputStyle}
                      value={newRoomTitle}
                      onChange={(e) => setNewRoomTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") createRoom();
                        if (e.key === "Escape") setRoomModalOpen(false);
                      }}
                      placeholder="예: 오늘 공부 정리, 프로젝트 상담"
                      autoFocus
                  />
                </div>

                <div className="modal-actions" style={{ marginTop: "26px" }}>
                  <button className="cancel" onClick={() => setRoomModalOpen(false)}>취소</button>
                  <button className="create" onClick={createRoom}>만들기</button>
                </div>
              </div>
            </div>
        )}

        {imageModal && (
            <div className="image-modal-backdrop" onClick={() => setImageModal(null)}>
              <div className="image-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="image-modal-head">
                  <strong>{imageModal.name}</strong>
                  <button type="button" onClick={() => setImageModal(null)}>
                    ×
                  </button>
                </div>
                <img src={imageModal.src} alt={imageModal.name} />
              </div>
            </div>
        )}

        {notice && (
            <div className="pretty-notice">
              <div className="notice-icon">🐳</div>
              <p>{notice}</p>
            </div>
        )}
      </div>
  );
}

export default App;