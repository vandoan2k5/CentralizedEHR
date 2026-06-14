import React, { useState, useEffect } from "react";
import { MessageSquare, Send, Search, User, Check, CheckCheck } from "lucide-react";
import { clinicalApi } from "../services/api";

function getInitials(name) {
  return name
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-ZÀ-ỹ]/g, ""))
    .filter((w) => w.length > 0 && /^[A-ZÀ-Ỹ]/.test(w) && w !== w.toUpperCase())
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function DoctorMessages() {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [inputText, setInputText] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  useEffect(() => {
    clinicalApi.getConversations().then((res) => {
      const data = res.data?.data ?? res.data ?? [];
      setConversations(data);
    }).finally(() => setLoadingConvs(false));
  }, []);

  const openConversation = (convId) => {
    setActiveConvId(convId);
    setMessages([]);
    setLoadingMsgs(true);
    clinicalApi.getMessages(convId).then((res) => {
      const data = res.data?.data ?? res.data ?? [];
      setMessages(data);
    }).finally(() => setLoadingMsgs(false));
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConv) return;
    const content = inputText.trim();
    setInputText("");
    clinicalApi.sendMessage({ receiver_id: activeConv.other_id, content }).then((res) => {
      const newMsg = res.data?.data ?? res.data;
      if (newMsg) {
        setMessages((prev) => [
          ...prev,
          {
            id: newMsg.id,
            from_me: true,
            text: newMsg.content ?? content,
            time: newMsg.time ?? "Vừa xong",
            read: false,
          },
        ]);
      }
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="mb-4 shrink-0">
        <h1 className="text-xl font-bold text-slate-800">Tin nhắn</h1>
        <p className="text-sm text-slate-500 mt-1">Trao đổi nội bộ</p>
      </div>

      <div className="flex flex-1 bg-white rounded-xl shadow-sm border overflow-hidden min-h-0">
        {/* Left Panel */}
        <div className="w-80 border-r flex flex-col shrink-0">
          <div className="p-3 border-b">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tìm kiếm..."
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">
                Đang tải...
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv.id)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b hover:bg-slate-50 transition-colors ${
                    activeConvId === conv.id ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 bg-slate-300 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                      {getInitials(conv.other_name)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800">{conv.other_name}</span>
                      <span className="text-[10px] text-slate-400">{conv.last_time}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{conv.last_message}</p>
                  </div>
                  {conv.unread > 0 && (
                    <span className="shrink-0 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {conv.unread}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeConvId ? (
            <>
              <div className="px-5 py-3 border-b bg-slate-50 shrink-0">
                <span className="text-sm font-medium text-slate-800">
                  {activeConv?.other_name}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center h-full text-sm text-slate-400">
                    Đang tải...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-slate-400">
                    Chưa có tin nhắn
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.from_me ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[70%] px-4 py-2.5 rounded-xl text-sm ${
                          msg.from_me
                            ? "bg-blue-600 text-white rounded-br-sm"
                            : "bg-slate-100 text-slate-700 rounded-bl-sm"
                        }`}
                      >
                        <p>{msg.text}</p>
                        <div className={`flex items-center gap-1 mt-1 ${msg.from_me ? "justify-end" : ""}`}>
                          <span className={`text-[10px] ${msg.from_me ? "text-blue-200" : "text-slate-400"}`}>
                            {msg.time}
                          </span>
                          {msg.from_me && (
                            msg.read ? <CheckCheck size={12} className="text-blue-200" /> : <Check size={12} className="text-blue-200" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleSend} className="p-3 border-t shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập tin nhắn..."
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <MessageSquare size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">Chọn một cuộc hội thoại</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
