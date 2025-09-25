import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import API from "./api/client"; // adjust path to your API client as needed

/* ---------- SVG ICONS ---------- */
const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const BackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 19l-7-7 7-7" />
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const PaperclipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
  </svg>
);

const MicrophoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m7 6v3m0 0h-3m3 0h3M10 11a2 2 0 114 0m-4 0V7a2 2 0 014 0v4" />
  </svg>
);

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

const XCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2 2m2-2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckDoubleIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M1 14l4 4L15 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 14l4 4L23 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="-ml-2" />
  </svg>
);

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

/* ---------- Component ---------- */
export default function ChatFab({ apiBase = "", role = "", currentUserId = null, unreadCount = 0 }) {
  // UI open
  const [isOpen, setIsOpen] = useState(false);

  // lists
  const [conversations, setConversations] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [listErrorText, setListErrorText] = useState(null);

  // chat
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messagesErrorText, setMessagesErrorText] = useState(null);

  // composer
  const [contentText, setContentText] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [statusText, setStatusText] = useState(null);

  // typing/recording
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordTimeSec, setRecordTimeSec] = useState(0);

  // refs & timers
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const searchInputRef = useRef(null);
  const composerTextAreaRef = useRef(null);

  // tabs + search
  const [tabKey, setTabKey] = useState("conversations");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // toasts
  const [toasts, setToasts] = useState([]);

  /* ---------- CURRENT USER ID ---------- */
  const effectiveCurrentUserIdNum = useMemo(() => {
    const candidate =
      currentUserId ??
      (typeof window !== "undefined" ? localStorage.getItem("id") : null) ??
      (typeof window !== "undefined" ? localStorage.getItem("current_user_id") : null) ??
      (typeof window !== "undefined" ? window.USER_ID : null) ??
      null;

    const n = Number(candidate);
    return Number.isFinite(n) ? n : null;
  }, [currentUserId]);

  /* ---------- Debounce search ---------- */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), 220);
    return () => clearTimeout(t);
  }, [searchQuery]);

  /* ---------- filteredRecipients ---------- */
  const filteredRecipients = useMemo(() => {
    if (!debouncedQuery) return recipients;
    return recipients.filter((r) =>
      (r.full_name || "").toLowerCase().includes(debouncedQuery) ||
      (r.email || "").toLowerCase().includes(debouncedQuery)
    );
  }, [recipients, debouncedQuery]);

  /* ---------- Helpers ---------- */
  function initials(nameOrEmail) {
    if (!nameOrEmail) return "U";
    return (nameOrEmail || "")
      .split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  function humanFileSize(bytes) {
    if (!bytes && bytes !== 0) return "";
    const thresh = 1024;
    if (Math.abs(bytes) < thresh) return bytes + " B";
    const units = ["KB", "MB", "GB", "TB"]; // enough for chat
    let u = -1;
    do {
      bytes /= thresh;
      ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1) + " " + units[u];
  }

  function attachmentUrl(messageOrRaw) {
    const raw =
      typeof messageOrRaw === "string"
        ? messageOrRaw
        : (messageOrRaw && (messageOrRaw.attachment_path || messageOrRaw.attachment_url || messageOrRaw.attachment)) || null;
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw) || raw.startsWith("//")) return raw;
    const baseCandidate = API && API.defaults && API.defaults.baseURL ? String(API.defaults.baseURL) : apiBase ? apiBase : "";
    const base = baseCandidate ? baseCandidate.replace(/\/$/, "") : "";
    try {
      return new URL(raw, base + "/").toString();
    } catch (e) {
      const cleaned = raw.startsWith("/") ? raw : `/${raw}`;
      return base ? `${base}${cleaned}` : raw;
    }
  }

  const groupedMessages = (msgs) => {
    const groups = [];
    let lastDate = null;
    (msgs || []).forEach((m) => {
      const d = new Date(m.created_at).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
      if (d !== lastDate) {
        groups.push({ type: "date", date: d });
        lastDate = d;
      }
      groups.push({ type: "msg", msg: m });
    });
    return groups;
  };

  const formatTime = (sec) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

  const showToast = useCallback((text, tone = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  /* ---------- Scrolling behavior ---------- */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 220;
    if (nearBottom) requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, isTyping]);

  /* ---------- Auto-resize textarea ---------- */
  useEffect(() => {
    const ta = composerTextAreaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px"; // cap at ~6 lines
  }, [contentText]);

  /* ---------- Typing indicator (fake) ---------- */
  useEffect(() => {
    if (selectedUser && !isLoadingMessages) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [selectedUser, isLoadingMessages]);

  /* ---------- ESC to close & focus management ---------- */
  useEffect(() => {
    function onKey(e) {
      if (!isOpen) return;
      if (e.key === "Escape") setIsOpen(false);
      if ((e.key === "Enter" && (e.ctrlKey || e.metaKey)) && selectedUser && !isSending) {
        doSend();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, selectedUser, isSending, contentText, attachedFile, audioBlob]);

  useEffect(() => {
    if (!isOpen) return;
    if (!selectedUser) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setTimeout(() => composerTextAreaRef.current?.focus(), 100);
    }
  }, [isOpen, selectedUser]);

  /* ---------- Load lists when opened ---------- */
  useEffect(() => {
    if (!isOpen) {
      setSelectedUser(null);
      setMessages([]);
      clearComposer();
      setTabKey("conversations");
    } else {
      loadLists();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function loadLists() {
    setIsLoadingLists(true);
    setListErrorText(null);
    try {
      const [convRes, recRes] = await Promise.all([
        API.get("/chat/conversations"),
        API.get("/invites/used"),
      ]);
      setConversations(convRes.data || []);
      setRecipients(recRes.data || []);
    } catch (err) {
      console.error("loadLists error", err);
      setListErrorText("Failed to load conversations.");
      showToast("Could not load conversations", "error");
    } finally {
      setIsLoadingLists(false);
    }
  }

  /* ---------- loadMessagesFor: flexible signature ---------- */
  async function loadMessagesFor(otherOrId, metaUser = null) {
    setIsLoadingMessages(true);
    setMessagesErrorText(null);
    setMessages([]);

    let userObj = null;
    if (typeof otherOrId === "object" && otherOrId !== null) {
      userObj = otherOrId;
    } else if (metaUser && typeof metaUser === "object") {
      userObj = metaUser;
    } else {
      userObj = { user_id: otherOrId };
    }

    try {
      const otherId = userObj.user_id ?? userObj.id;
      const res = await API.get(`/chat/messages/${otherId}`);
      setMessages(res.data || []);
      setSelectedUser(userObj);
      setTabKey("conversations");
    } catch (err) {
      console.error("loadMessages error", err);
      setMessagesErrorText("Failed to load messages");
      showToast("Could not load messages", "error");
    } finally {
      setIsLoadingMessages(false);
    }
  }

  /* ---------- Determine if message is mine (robust) ---------- */
  function isMessageMine(m) {
    const sender = m?.sender_id ?? m?.from_id ?? m?.user_id ?? null;
    if (effectiveCurrentUserIdNum !== null) {
      return Number(sender) === effectiveCurrentUserIdNum;
    }
    return Boolean(m?._optimistic);
  }

  /* ---------- File / drag-drop ---------- */
  function handleFileChange(ev) {
    const f = ev?.target?.files ? ev.target.files[0] : ev;
    if (!f) {
      setAttachedFile(null);
      return;
    }
    const maxSizeBytes = 12 * 1024 * 1024;
    if (f.size > maxSizeBytes) {
      setStatusText("File too large (max 12 MB)");
      showToast("File too large (max 12 MB)", "error");
      return;
    }
    cancelRecording();
    setAttachedFile(f);
    setStatusText(null);
  }

  function onDrop(e) {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (!dt || !dt.files || dt.files.length === 0) return;
    handleFileChange(dt.files[0]);
  }

  /* ---------- Recording ---------- */
  async function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatusText("Audio recording not supported.");
      showToast("Audio recording not supported", "error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunksRef.current = [];
      const options = { mimeType: "audio/webm" };
      const mr = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: recordedChunksRef.current[0]?.type || "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        try {
          stream.getTracks().forEach((t) => t.stop());
        } catch (e) {}
        clearInterval(recordTimerRef.current);
        setIsRecording(false);
      };

      mr.start();
      setIsRecording(true);
      setRecordTimeSec(0);
      recordTimerRef.current = setInterval(() => setRecordTimeSec((t) => t + 1), 1000);
      setStatusText("Recording...");
    } catch (err) {
      console.error("startRecording", err);
      setStatusText("Microphone access denied.");
      showToast("Microphone access denied", "error");
    }
  }

  function stopRecordingIfActive() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setIsRecording(false);
  }

  function cancelRecording() {
    stopRecordingIfActive();
    recordedChunksRef.current = [];
    if (audioUrl) {
      try {
        URL.revokeObjectURL(audioUrl);
      } catch (e) {}
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordTimeSec(0);
    setStatusText(null);
  }

  function clearComposer() {
    setContentText("");
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    cancelRecording();
  }

  /* ---------- Send message (optimistic + real) ---------- */
  async function doSend() {
    if (!selectedUser || isSending || (!contentText.trim() && !attachedFile && !audioBlob)) {
      setStatusText("Nothing to send or no recipient selected.");
      return;
    }
    setIsSending(true);
    setStatusText(null);

    const receiverId = selectedUser.user_id ?? selectedUser.id;
    const tmpId = `tmp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const senderForOptimistic = effectiveCurrentUserIdNum !== null ? effectiveCurrentUserIdNum : "me";

    let previewUrl = null;
    if (attachedFile) previewUrl = URL.createObjectURL(attachedFile);
    if (audioBlob && !attachedFile) previewUrl = audioUrl;

    const tmpMessage = {
      id: tmpId,
      sender_id: senderForOptimistic,
      receiver_id: Number(receiverId),
      role: role || (typeof window !== "undefined" ? localStorage.getItem("current_user_role") : null) || "Developer",
      content: contentText.trim() || (audioBlob ? "" : ""),
      attachment_url: previewUrl,
      attachment_type: audioBlob ? (audioBlob.type || "audio/webm") : attachedFile ? attachedFile.type : null,
      is_read: false,
      created_at: new Date().toISOString(),
      _optimistic: true,
      _previewUrl: previewUrl,
    };

    setMessages((m) => [...m, tmpMessage]);
    clearComposer();

    const form = new FormData();
    form.append("receiver_id", String(receiverId));
    form.append("role", role || ((typeof window !== "undefined" && localStorage.getItem("current_user_role")) || "Developer"));
    if (contentText.trim()) form.append("content", contentText.trim());
    if (attachedFile) form.append("file", attachedFile);
    else if (audioBlob)
      form.append("file", new File([audioBlob], `voice_${Date.now()}.webm`, { type: audioBlob.type || "audio/webm" }));

    try {
      const res = await API.post("/chat/send", form, { headers: { "Content-Type": "multipart/form-data" } });
      const sent = res.data;
      setMessages((m) =>
        m.map((x) => {
          if (x.id === tmpId) {
            if (x._previewUrl)
              try {
                URL.revokeObjectURL(x._previewUrl);
              } catch (e) {}
            return {
              id: sent.id,
              sender_id: sent.sender_id,
              receiver_id: sent.receiver_id,
              role: sent.role,
              content: sent.content || "",
              attachment_url: attachmentUrl(sent),
              attachment_type: sent.attachment_type,
              is_read: sent.is_read,
              created_at: sent.created_at,
            };
          }
          return x;
        })
      );

      setConversations((prev) => {
        const others = prev.filter((c) => String(c.user_id) !== String(receiverId));
        const newItem = {
          user_id: Number(receiverId),
          full_name: selectedUser.full_name || selectedUser.email || `User ${receiverId}`,
          role: selectedUser.role || null,
          last_message: sent.content || (sent.attachment_url ? "[attachment]" : ""),
          last_message_at: sent.created_at,
          unread_count: 0,
        };
        return [newItem, ...others];
      });

      setStatusText("Sent");
    } catch (err) {
      console.error("send error", err);
      setStatusText("Send failed");
      showToast("Message failed to send", "error");
      setMessages((m) => {
        m.forEach((x) => {
          if (String(x.id).startsWith("tmp-") && x._previewUrl)
            try {
              URL.revokeObjectURL(x._previewUrl);
            } catch (e) {}
        });
        return m.filter((x) => !String(x.id).startsWith("tmp-"));
      });
    } finally {
      setIsSending(false);
    }
  }

  /* ---------- Typing indicator component ---------- */
  const TypingIndicator = () => (
    <div className="flex justify-start pl-2">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-full bg-white border flex items-center space-x-1.5 dark:bg-gray-800 dark:border-gray-700">
        <motion.span className="w-2 h-2 bg-gray-400 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 1, repeat: Infinity }} />
        <motion.span className="w-2 h-2 bg-gray-400 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} />
        <motion.span className="w-2 h-2 bg-gray-400 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
      </motion.div>
    </div>
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSending) doSend();
    }
  };

  const overlayClickClose = (e) => {
    if (e.target === e.currentTarget) setIsOpen(false);
  };

  const EmptyState = ({ title, subtitle }) => (
    <div className="w-full h-full flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 p-6">
      <ChatIcon />
      <p className="mt-2 font-medium">{title}</p>
      <p className="text-sm">{subtitle}</p>
    </div>
  );

  const ListItemSkeleton = () => (
    <div className="flex items-center gap-3 p-2">
      <div className="w-11 h-11 rounded-full bg-gray-200 animate-pulse" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="h-3 w-3/5 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-4/5 bg-gray-100 rounded animate-pulse" />
      </div>
    </div>
  );

  const MessageSkeleton = () => (
    <div className="flex w-full justify-start">
      <div className="max-w-[75%] px-3 py-2 rounded-xl bg-white border shadow-sm">
        <div className="h-3 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-28 bg-gray-100 rounded mt-2 animate-pulse" />
      </div>
    </div>
  );

  /* ---------- RENDER ---------- */
  return (
    <>
      {/* FAB */}
      <button
        className="fixed right-6 bottom-6 w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center text-2xl shadow-2xl hover:bg-emerald-700 z-50 transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-300"
        onClick={() => setIsOpen(true)}
        aria-label="Open chat"
        title="Open chat"
      >
        <div className="relative">
          <ChatIcon />
          {(unreadCount || 0) > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full shadow">{unreadCount > 99 ? "99+" : unreadCount}</span>
          )}
        </div>
      </button>

      {/* Backdrop + Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={overlayClickClose}
            role="dialog"
            aria-modal="true"
            aria-label="Chat widget"
          >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              className="absolute right-0 bottom-0 sm:right-6 sm:bottom-24 w-full h-[90vh] sm:w-[90vw] sm:max-w-4xl sm:h-[70vh] sm:max-h-[700px]"
            >
              <div className="w-full h-full bg-white dark:bg-gray-900 rounded-t-xl sm:rounded-xl shadow-2xl flex flex-col overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex h-full">
                  {/* Left Panel */}
                  <div className={`w-full sm:w-80 border-r dark:border-gray-800 flex-col bg-white dark:bg-gray-900 ${selectedUser ? "hidden sm:flex" : "flex"}`}>
                    <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold">
                          {initials((typeof window !== "undefined" ? localStorage.getItem("current_user_name") : "") || "")}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Messages</div>
                        </div>
                      </div>
                      <button onClick={() => setIsOpen(false)} className="p-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800" aria-label="Close chat">
                        <CloseIcon />
                      </button>
                    </div>

                    <div className="p-3 border-b dark:border-gray-800">
                      <div className="relative">
                        <input
                          ref={searchInputRef}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search..."
                          className="w-full pl-9 pr-3 py-2 rounded-lg border dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          <SearchIcon />
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button onClick={() => setTabKey("conversations")} className={`px-3 py-1 rounded-full text-xs font-medium ${tabKey === "conversations" ? "bg-emerald-100 text-emerald-800" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>Conversations</button>
                        <button onClick={() => setTabKey("new")} className={`px-3 py-1 rounded-full text-xs font-medium ${tabKey === "new" ? "bg-emerald-100 text-emerald-800" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>New Chat</button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto p-2">
                      {isLoadingLists && (
                        <div className="space-y-1">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <ListItemSkeleton key={i} />
                          ))}
                        </div>
                      )}
                      {listErrorText && <div className="p-3 text-xs text-center text-red-500">{listErrorText}</div>}

                      {tabKey === "conversations" && (
                        <div className="space-y-1">
                          {conversations.length === 0 && !isLoadingLists && (
                            <div className="text-xs text-gray-400 p-3 text-center">No recent conversations.</div>
                          )}
                          {conversations.map((c) => (
                            <button
                              key={c.user_id}
                              onClick={() => loadMessagesFor(c)}
                              className={`w-full text-left flex items-center gap-3 p-2 rounded-lg transition-colors ${selectedUser && Number(selectedUser.user_id) === Number(c.user_id) ? "bg-emerald-50 dark:bg-emerald-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                            >
                              <div className="relative">
                                <div className="w-11 h-11 rounded-full bg-emerald-100 flex-shrink-0 flex items-center justify-center text-sm font-semibold text-emerald-700">
                                  {initials(c.full_name || c.email)}
                                </div>
                                {c.unread_count > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between">
                                  <div className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{c.full_name || c.email}</div>
                                  <div className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                    {c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.last_message}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {tabKey === "new" && (
                        <div className="space-y-1">
                          {filteredRecipients.length === 0 && !isLoadingLists && (
                            <div className="text-xs text-gray-400 p-3 text-center">No recipients found.</div>
                          )}
                          {filteredRecipients.map((r) => {
                            const uid = r.user_id || r.invite_id || r.id;
                            return (
                              <button
                                key={uid}
                                onClick={() => loadMessagesFor({ user_id: uid, full_name: r.full_name || r.email, email: r.email, role: r.role })}
                                className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                              >
                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex-shrink-0 flex items-center justify-center text-sm font-semibold">
                                  {initials(r.full_name || r.email)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{r.full_name || r.email}</div>
                                  <div className="text-xs text-gray-400 truncate">{r.role || "User"}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Panel (Chat Window) */}
                  <div className={`flex-1 flex-col bg-gray-50 dark:bg-gray-950 ${selectedUser ? "flex" : "hidden sm:flex"}`}>
                    <div className="flex items-center gap-3 px-4 py-3 border-b bg-white dark:bg-gray-900 dark:border-gray-800">
                      <button onClick={() => setSelectedUser(null)} className="p-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 sm:hidden" aria-label="Back">
                        <BackIcon />
                      </button>

                      {selectedUser ? (
                        <>
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex-shrink-0 flex items-center justify-center font-semibold text-emerald-700">
                            {initials(selectedUser.full_name || selectedUser.email)}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedUser.full_name || selectedUser.email || `User ${selectedUser.user_id}`}</div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span>{selectedUser.role || "Online"}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <InfoIcon />
                            <span>Secure</span>
                          </div>
                        </>
                      ) : (
                        <EmptyState title="Welcome to Chat" subtitle="Select a conversation or start a new one." />
                      )}
                    </div>

                    <div
                      ref={scrollRef}
                      onDrop={onDrop}
                      onDragOver={(e) => e.preventDefault()}
                      className="flex-1 overflow-auto p-4 sm:p-6 space-y-4"
                    >
                      {isLoadingMessages && (
                        <div className="space-y-3">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <MessageSkeleton key={i} />
                          ))}
                        </div>
                      )}
                      {messagesErrorText && <div className="text-center text-sm text-red-500">{messagesErrorText}</div>}

                      {selectedUser &&
                        groupedMessages(messages).map((item, idx) => {
                          if (item.type === "date")
                            return (
                              <div key={`d-${idx}`} className="text-center text-[11px] text-gray-400 my-4">
                                {item.date}
                              </div>
                            );
                          const m = item.msg;
                          const mine = isMessageMine(m);
                          const att = attachmentUrl(m);

                          return (
                            <div key={m.id} className={`flex w-full ${mine ? "justify-end" : "justify-start"}`}>
                              <motion.div
                                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.2 }}
                                className={`relative max-w-[80%] px-3 py-2 rounded-2xl shadow-sm flex flex-col ${mine ? "bg-emerald-500 text-white rounded-br-sm" : "bg-white text-gray-800 border dark:bg-gray-900 dark:text-gray-100 dark:border-gray-800 rounded-bl-sm"}`}
                              >
                                {/* Attachment */}
                                {att && (
                                  <div className="mb-1">
                                    {m.attachment_type?.startsWith("image/") && (
                                      <img src={att} alt="attachment" className="rounded-md max-h-64 w-auto" />
                                    )}
                                    {m.attachment_type?.startsWith("video/") && (
                                      <video src={att} controls className="rounded-md max-h-64 w-full" />
                                    )}
                                    {m.attachment_type?.startsWith("audio/") && (
                                      <audio src={att} controls className="w-full max-w-xs" />
                                    )}
                                    {!m.attachment_type && (
                                      <a href={att} target="_blank" rel="noreferrer" className="text-xs underline">
                                        Open attachment
                                      </a>
                                    )}
                                  </div>
                                )}

                                {/* Message text */}
                                {m.content && (
                                  <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                    {m.content}
                                  </div>
                                )}

                                {/* Timestamp + Read */}
                                <div className={`flex items-center gap-2 text-[11px] mt-1.5 self-end ${mine ? "text-white/80" : "text-gray-400"}`}>
                                  <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                  {mine && (
                                    <span className="inline-flex items-center gap-1">
                                      <CheckDoubleIcon className="w-3.5 h-3.5" />
                                      <span className="sr-only">{m.is_read ? "Read" : "Sent"}</span>
                                    </span>
                                  )}
                                </div>
                              </motion.div>
                            </div>
                          );
                        })}

                      {isTyping && <TypingIndicator />}
                    </div>

                    {/* Composer */}
                    {selectedUser && (
                      <div className="p-3 border-t bg-white dark:bg-gray-900 dark:border-gray-800">
                        <AnimatePresence>
                          {(attachedFile || audioUrl) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mb-2 p-2 border dark:border-gray-800 rounded-lg flex items-center justify-between"
                            >
                              {attachedFile && (
                                <div className="text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2 min-w-0">
                                  <PaperclipIcon />
                                  <span className="truncate max-w-[60vw] sm:max-w-xs">{attachedFile.name}</span>
                                  <span className="text-[11px] text-gray-400">{humanFileSize(attachedFile.size)}</span>
                                </div>
                              )}
                              {audioUrl && !attachedFile && <audio src={audioUrl} controls className="max-w-xs" />}
                              <button onClick={clearComposer} className="p-1 text-gray-400 hover:text-red-500" title="Remove attachment">
                                <XCircleIcon />
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="flex items-end gap-3">
                          <div className="flex-1 rounded-lg border dark:border-gray-800 bg-white dark:bg-gray-900 focus-within:ring-2 focus-within:ring-emerald-300">
                            <textarea
                              ref={composerTextAreaRef}
                              value={contentText}
                              onChange={(e) => setContentText(e.target.value)}
                              onKeyDown={handleKeyDown}
                              placeholder={`Message ${selectedUser.full_name || selectedUser.email}...`}
                              className="w-full max-h-40 p-2 rounded-lg outline-none resize-none text-sm bg-transparent"
                              disabled={!selectedUser || isRecording}
                              aria-label="Message input"
                              rows={1}
                            />
                            <div className="flex items-center justify-between px-1 pb-1">
                              <div className="flex items-center">
                                {!isRecording && (
                                  <>
                                    <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Attach file" title="Attach file">
                                      <PaperclipIcon />
                                    </button>
                                    <button onClick={startRecording} type="button" className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" title="Record voice">
                                      <MicrophoneIcon />
                                    </button>
                                  </>
                                )}

                                {isRecording && (
                                  <div className="flex items-center gap-2 p-1">
                                    <div className="text-xs text-red-600 font-semibold animate-pulse">● REC {formatTime(recordTimeSec)}</div>
                                    <button onClick={stopRecordingIfActive} type="button" className="px-2 py-1 rounded-md bg-red-500 text-white text-xs">Stop</button>
                                    <button onClick={cancelRecording} type="button" className="px-2 py-1 rounded-md border text-xs">Cancel</button>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={doSend}
                                  disabled={!selectedUser || isSending || (!contentText && !attachedFile && !audioBlob)}
                                  className="p-2.5 rounded-full text-white disabled:bg-emerald-300 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-700"
                                  title="Send (Enter) | New line (Shift+Enter) | Send (Ctrl/Cmd+Enter)"
                                >
                                  <SendIcon />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        {statusText && <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1"><InfoIcon /> {statusText}</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toasts */}
      <div className="fixed bottom-24 right-6 z-[60] space-y-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`px-3 py-2 rounded-lg shadow bg-white border text-sm ${t.tone === "error" ? "border-red-200 text-red-700" : "border-emerald-200 text-emerald-700"}`}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

