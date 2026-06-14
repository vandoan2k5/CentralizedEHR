import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { patientApi } from "../services/api";
import { MessageCircle, Send, Search, Check, CheckCheck } from "lucide-react";

export default function PatientMessages() {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const loadConversations = async () => {
    try {
      const { data } = await patientApi.getConversations();
      setConversations(data.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId) => {
    try {
      const { data } = await patientApi.getMessages(convId);
      setMessages(data.data ?? []);
    } catch {
      setMessages([]);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv.id);
    } else if (conversations.length > 0) {
      setActiveConv(conversations[0]);
    }
  }, [conversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !activeConv) return;
    try {
      await patientApi.sendMessage({ receiver_id: activeConv.other_id, content: text.trim() });
      setText("");
      loadMessages(activeConv.id);
      loadConversations();
    } catch {
      // ignore
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filtered = conversations.filter((c) =>
    c.other_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-120px)] gap-0">
      <div className="w-72 shrink-0 bg-white rounded-l-xl shadow-sm border flex flex-col">
        <div className="p-3 border-b">
          <h2 className="text-sm font-semibold text-slate-800 mb-2">Tin nhắn</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-400">Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">Chưa có tin nhắn</div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => { setActiveConv(conv); loadMessages(conv.id); }}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-slate-50 transition-colors ${
                  activeConv?.id === conv.id ? "bg-blue-50" : ""
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-blue-600">
                    {conv.other_name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">{conv.other_name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{conv.last_message}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-slate-400">{conv.last_time}</p>
                  {conv.unread > 0 && (
                    <span className="inline-block mt-0.5 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-r-xl shadow-sm border-l-0 flex flex-col">
        {activeConv ? (
          <>
            <div className="px-4 py-3 border-b bg-slate-50 rounded-tr-xl">
              <p className="text-sm font-medium text-slate-800">{activeConv.other_name}</p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">Chưa có tin nhắn</div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.from_me ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] px-3 py-2 rounded-xl text-sm ${
                        msg.from_me
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-slate-100 text-slate-800 rounded-bl-sm"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
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
              <div ref={bottomRef} />
            </div>
            <div className="px-4 py-3 border-t">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nhập tin nhắn..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleSend}
                  disabled={!text.trim()}
                  className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center disabled:opacity-40 hover:bg-blue-700 transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <MessageCircle size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">Chọn một cuộc hội thoại</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
