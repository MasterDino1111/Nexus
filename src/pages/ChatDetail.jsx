
import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, Send, Phone, Video, Smile, X, MoreVertical, Trash2 } from "lucide-react";
import EditChatDialog from "@/components/chat/EditChatDialog";
import moment from "moment";
import { callFunction } from "@/lib/callFunction";
import { hasActivePremium } from "@/lib/usePremium";
import { notifyUnreadChanged } from "@/lib/unread";

const EMOJIS = ["😀","😂","😍","🥰","😎","😭","😅","🤔","👍","👏","❤️","🔥","😊","🎉","😢","😤","🙏","💯","✨","🤣","😇","🥺","😱","🤩","💪","🎶","🌟","💬","😴","🤝"];

const STICKERS = [
  { id: "s1", emoji: "🐶", label: "Hund" },
  { id: "s2", emoji: "🐱", label: "Katze" },
  { id: "s3", emoji: "🎸", label: "Gitarre" },
  { id: "s4", emoji: "🍕", label: "Pizza" },
  { id: "s5", emoji: "🚀", label: "Rakete" },
  { id: "s6", emoji: "🌈", label: "Regenbogen" },
  { id: "s7", emoji: "💎", label: "Diamant" },
  { id: "s8", emoji: "🏆", label: "Pokal" },
  { id: "s9", emoji: "❄️", label: "Schnee" },
  { id: "s10", emoji: "🎭", label: "Theater" },
  { id: "s11", emoji: "🦄", label: "Einhorn" },
  { id: "s12", emoji: "🌺", label: "Blume" },
];

export default function ChatDetail() {
  const { id } = useParams();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showPicker, setShowPicker] = useState(false); // "emoji" | "sticker" | false
  const [showEditChat, setShowEditChat] = useState(false);
  const [error, setError] = useState("");
  const userRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { loadData(); }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === "create" && event.data.chat_id === id) {
        setMessages(prev => {
          if (prev.find(m => m.id === event.data.id)) return prev;
          return [...prev, event.data];
        });
        // The chat is open, so a message from somebody else is read right away
        if (event.data.sender_id !== userRef.current?.id) markRead();
      }
      if (event.type === "delete" && event.data?.chat_id === id) {
        setMessages(prev => prev.filter(m => m.id !== event.data.id));
      }
    });
    return unsubscribe;
  }, [id]);

  // Marks everything in this chat as read on the server and refreshes the badges
  const markRead = async () => {
    const { ok } = await callFunction("markChatRead", { chatId: id }).catch(() => ({ ok: false }));
    if (ok) notifyUnreadChanged();
    return ok;
  };

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [chatData, userData] = await Promise.all([
        base44.entities.Chat.get(id),
        base44.auth.me(),
      ]);
      setChat(chatData);
      setUser(userData);
      userRef.current = userData;
      // Mark as read first: it also repairs the participant list that the message read rule uses
      await markRead();
      // Newest 100 messages (the oldest ones are not what you want to see), shown oldest to newest
      const msgData = await base44.entities.Message.filter({ chat_id: id }, "-created_date", 100);
      setMessages([...msgData].reverse());
      const subs = await base44.entities.Subscription.filter({ user_id: userData.id, status: "active" }, "-created_date", 10).catch(() => []);
      setIsPremium(userData.role === "admin" || hasActivePremium(subs));
    } catch (e) {
      console.error(e);
      setError("Dieser Chat konnte nicht geladen werden.");
    }
    setLoading(false);
  };

  const sendMessage = async (content) => {
    const text = (content || newMessage).trim();
    if (!text || !user) return;
    setNewMessage("");
    setShowPicker(false);
    setError("");

    const { ok, data } = await callFunction("sendMessage", { chatId: id, content: text }).catch(() => ({ ok: false, data: {} }));
    if (!ok) {
      setNewMessage(text);
      setError(data?.error || "Nachricht konnte nicht gesendet werden.");
      return;
    }
    // Show it right away; the realtime event for the same id is ignored
    setMessages(prev => (prev.find(m => m.id === data.message.id) ? prev : [...prev, data.message]));
  };

  const deleteMessage = async (msgId) => {
    try {
      await base44.entities.Message.delete(msgId);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch {
      setError("Nachricht konnte nicht gelöscht werden.");
    }
  };

  const addEmoji = (emoji) => {
    setNewMessage(m => m + emoji);
    inputRef.current?.focus();
  };

  const handleCall = (type) => {
    const phone = chat?.contact_phone;
    if (!phone) {
      alert("Keine Telefonnummer für diesen Kontakt gespeichert.");
      return;
    }
    if (type === "phone") {
      // Startet echten Telefonanruf auf jedem Gerät
      window.location.href = `tel:${phone}`;
    } else {
      // Videoanruf: FaceTime auf iOS, sonst WhatsApp-Videoanruf
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        window.location.href = `facetime:${phone}`;
      } else {
        // WhatsApp Videoanruf (entfernt + und Leerzeichen für die URL)
        const cleaned = phone.replace(/[^0-9]/g, "");
        window.open(`https://wa.me/${cleaned}?video=1`, "_blank");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" onClick={() => setShowPicker(false)}>
      <EditChatDialog
        open={showEditChat}
        onOpenChange={setShowEditChat}
        chat={chat}
        onUpdated={(updated) => setChat(updated)}
      />
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3 px-3 py-3">
          <Link to="/chats" className="p-1 hover:bg-secondary rounded-full transition-colors">
            <ChevronLeft size={22} />
          </Link>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center flex-shrink-0">
            {chat?.chat_avatar ? (
              <img src={chat.chat_avatar} alt="" className="w-full h-full object-cover rounded-full" />
            ) : (
              <span className="text-sm font-bold text-primary">
                {(chat?.chat_name || "?")[0].toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold truncate">{chat?.chat_name || "Chat"}</h2>
            {chat?.contact_phone && (
              <p className="text-[10px] text-muted-foreground">{chat.contact_phone}</p>
            )}
          </div>
          {/* Call buttons */}
          <button
            onClick={() => handleCall("video")}
            className="p-2 hover:bg-secondary rounded-full transition-colors text-primary"
            title="Videoanruf"
          >
            <Video size={18} />
          </button>
          <button
            onClick={() => handleCall("phone")}
            className="p-2 hover:bg-secondary rounded-full transition-colors text-primary"
            title="Anrufen"
          >
            <Phone size={18} />
          </button>
          <button
            onClick={() => setShowEditChat(true)}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
            title="Bearbeiten"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Sag Hallo! 👋</div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === user?.id;
            const isSticker = msg.content?.startsWith("__sticker__");
            const stickerEmoji = isSticker ? msg.content.replace("__sticker__", "") : null;
            return (
              <div key={msg.id} className={`flex items-end gap-1 group ${isMe ? "justify-end" : "justify-start"}`}>
                {isMe && (
                  <button onClick={() => deleteMessage(msg.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 size={13} />
                  </button>
                )}
                {isSticker ? (
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-5xl">{stickerEmoji}</span>
                    <p className="text-[9px] text-muted-foreground">{moment(msg.created_date).format("HH:mm")}</p>
                  </div>
                ) : (
                  <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl ${
                    isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary rounded-bl-md"
                  }`}>
                    {!isMe && <p className="text-[10px] font-semibold text-accent mb-0.5">{msg.sender_name}</p>}
                    <p className="text-sm leading-relaxed">
                      {msg.content.split(/(https?:\/\/[^\s]+)/g).map((part, idx) =>
                        /^https?:\/\//.test(part) ? (
                          <a key={idx} href={part} target="_blank" rel="noopener noreferrer" className="underline break-all">
                            {part}
                          </a>
                        ) : (
                          part
                        )
                      )}
                    </p>
                    <p className={`text-[9px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"} text-right`}>
                      {moment(msg.created_date).format("HH:mm")}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji / Sticker Picker */}
      {showPicker && (
        <div
          className="sticky bottom-16 z-40 mx-3 mb-1 bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setShowPicker("emoji")}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${showPicker === "emoji" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
            >
              😀 Emojis
            </button>
            <button
              onClick={() => setShowPicker("sticker")}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${showPicker === "sticker" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
            >
              🎭 Sticker
            </button>
            <button onClick={() => setShowPicker(false)} className="px-3 text-muted-foreground">
              <X size={14} />
            </button>
          </div>

          {showPicker === "emoji" ? (
            <div className="grid grid-cols-8 gap-1 p-3 max-h-40 overflow-y-auto">
              {EMOJIS.map(em => (
                <button
                  key={em}
                  onClick={() => addEmoji(em)}
                  className="text-xl hover:bg-secondary rounded-lg p-1 transition-colors"
                >
                  {em}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-2 p-3 max-h-40 overflow-y-auto">
              {STICKERS.map(s => (
                <button
                  key={s.id}
                  onClick={() => sendMessage("__sticker__" + s.emoji)}
                  className="flex flex-col items-center gap-0.5 hover:bg-secondary rounded-xl p-2 transition-colors"
                >
                  <span className="text-3xl">{s.emoji}</span>
                  <span className="text-[9px] text-muted-foreground">{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mx-3 mb-1 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Input */}
      <div className="sticky bottom-0 bg-card/95 backdrop-blur-xl border-t border-border p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={e => {
              e.stopPropagation();
              if (!isPremium) {
                alert("Emojis & Sticker sind nur für Premium-Mitglieder verfügbar. 👑");
                return;
              }
              setShowPicker(p => p ? false : "emoji");
            }}
            className={`p-2 transition-colors ${isPremium ? "text-muted-foreground hover:text-primary" : "text-muted-foreground/40"}`}
            title={isPremium ? "Emoji/Sticker" : "Nur für Premium"}
          >
            <Smile size={20} />
          </button>
          <input
            ref={inputRef}
            type="text"
            placeholder="Nachricht schreiben..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            maxLength={2000}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            className="flex-1 px-4 py-2.5 bg-secondary rounded-full text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!newMessage.trim()}
            className="p-2.5 bg-primary text-primary-foreground rounded-full disabled:opacity-30 transition-all hover:bg-primary/80"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}


