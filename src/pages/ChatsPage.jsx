
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import ChatItem from "@/components/chat/ChatItem";
import { fetchUnread, onUnreadChanged } from "@/lib/unread";
import CreateGroupDialog from "@/components/chat/CreateGroupDialog";
import { Search, PenSquare, MessageCircle, Mail, Users, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export default function ChatsPage() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [unreadByChat, setUnreadByChat] = useState({});

  // New chat form
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [chatAvatarFile, setChatAvatarFile] = useState(null);
  const [chatAvatarPreview, setChatAvatarPreview] = useState(null);

  useEffect(() => { loadData(); }, []);

  // Unread counts per chat: on load, on new messages and after reading
  useEffect(() => {
    const refresh = async () => setUnreadByChat((await fetchUnread()).byChat);
    refresh();
    let unsub = () => {};
    try {
      unsub = base44.entities.Message.subscribe((event) => { if (event.type === "create") refresh(); });
    } catch {}
    const off = onUnreadChanged(refresh);
    return () => { unsub(); off(); };
  }, []);

  // Realtime subscription for new chats
  useEffect(() => {
    const unsubscribe = base44.entities.Chat.subscribe(async (event) => {
      if (event.type === "create") {
        const me = await base44.auth.me().catch(() => null);
        if (!me) return;
        const c = event.data;
        // Show if participant OR invited via email
        if (c.participants?.includes(me.id) || c.contact_email === me.email) {
          setChats(prev => {
            if (prev.find(x => x.id === c.id)) return prev;
            return [c, ...prev];
          });
        }
      }
      if (event.type === "update") {
        setChats(prev => prev.map(c => c.id === event.data.id ? { ...c, ...event.data } : c));
      }
      if (event.type === "delete") {
        setChats(prev => prev.filter(c => c.id !== event.data.id));
      }
    });
    return unsubscribe;
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      // Load all chats where user is participant OR invited by email
      const [participantChats, invitedChats] = await Promise.all([
        base44.entities.Chat.filter(
          { participants: { $elemMatch: { $eq: userData.id } } },
          "-last_message_time", 100
        ).catch(() => []),
        base44.entities.Chat.filter(
          { contact_email: userData.email },
          "-last_message_time", 100
        ).catch(() => []),
      ]);
      // Merge & deduplicate
      const merged = [...participantChats];
      for (const c of invitedChats) {
        if (!merged.find(x => x.id === c.id)) merged.push(c);
      }
      merged.sort((a, b) => new Date(b.last_message_time || b.created_date) - new Date(a.last_message_time || a.created_date));
      setChats(merged);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleAvatarFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { setChatAvatarPreview(e.target.result); setChatAvatarFile(e.target.result); };
    reader.readAsDataURL(file);
  };

  const createChat = async () => {
    if (!contactName.trim() || !user) return;
    const chat = await base44.entities.Chat.create({
      participants: [user.id],
      chat_name: contactName.trim(),
      contact_email: contactEmail.trim(),
      chat_avatar: chatAvatarFile || "",
      last_message: "",
      last_message_time: new Date().toISOString(),
      created_by: user.id,
      status: contactEmail.trim() ? "pending" : "accepted",
    });
    setChats(prev => [chat, ...prev]);
    setContactName("");
    setContactEmail("");
    setChatAvatarFile(null);
    setChatAvatarPreview(null);
    setDialogOpen(false);
  };

  const acceptChat = async (chat) => {
    const updated = await base44.entities.Chat.update(chat.id, {
      status: "accepted",
      participants: [...(chat.participants || []), user.id],
    });
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, status: "accepted", participants: [...(c.participants || []), user.id] } : c));
  };

  const rejectChat = async (chat) => {
    await base44.entities.Chat.update(chat.id, { status: "rejected" });
    setChats(prev => prev.filter(c => c.id !== chat.id));
  };

  const pendingInvites = chats.filter(c => c.status === "pending" && c.contact_email === user?.email);
  const activeChats = chats.filter(c => c.status !== "rejected" && !(c.status === "pending" && c.contact_email === user?.email));

  const filteredChats = searchQuery
    ? activeChats.filter(c => c.chat_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : activeChats;

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
            <MessageCircle size={22} className="text-primary" />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Chats</span>
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setGroupDialogOpen(true)}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
              title="Gruppe erstellen"
            >
              <Users size={20} />
            </button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <button className="p-2 hover:bg-secondary rounded-full transition-colors">
                  <PenSquare size={20} />
                </button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Neuer Chat</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  {/* Avatar upload */}
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer">
                      <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-dashed border-border hover:border-primary transition-colors">
                        {chatAvatarPreview ? (
                          <img src={chatAvatarPreview} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <MessageCircle size={20} className="text-muted-foreground" />
                        )}
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleAvatarFile(e.target.files?.[0])} />
                    </label>
                    <p className="text-xs text-muted-foreground">Chat-Bild auswählen (optional)</p>
                  </div>
                  <input
                    type="text"
                    placeholder="Name des Kontakts"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      placeholder="E-Mail des Kontakts (optional)"
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && createChat()}
                      className="w-full pl-9 pr-3 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  {contactEmail && (
                    <p className="text-[11px] text-primary bg-primary/10 rounded-lg px-3 py-2">
                      📨 {contactEmail} bekommt eine Chat-Einladung und sieht deinen Namen.
                    </p>
                  )}
                  <button
                    onClick={createChat}
                    disabled={!contactName.trim()}
                    className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm disabled:opacity-30 transition-opacity"
                  >
                    Chat erstellen
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Chats suchen..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </div>
      </div>

      <CreateGroupDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        onCreated={(chat) => setChats(prev => [chat, ...prev])}
      />

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground px-1">📨 Einladungen</p>
          {pendingInvites.map(chat => (
            <div key={chat.id} className="flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-xl px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {chat.chat_avatar ? (
                  <img src={chat.chat_avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-primary">{(chat.chat_name || "?")[0].toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{chat.chat_name}</p>
                <p className="text-[11px] text-muted-foreground">möchte mit dir chatten</p>
              </div>
              <button
                onClick={() => rejectChat(chat)}
                className="p-2 bg-destructive/10 text-destructive rounded-full hover:bg-destructive/20 transition-colors"
              >
                <X size={16} />
              </button>
              <button
                onClick={() => acceptChat(chat)}
                className="p-2 bg-primary/20 text-primary rounded-full hover:bg-primary/30 transition-colors"
              >
                <Check size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="p-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-secondary" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-secondary rounded w-1/3" />
                  <div className="h-2 bg-secondary rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">💬</div>
            <h2 className="text-lg font-semibold">Keine Chats</h2>
            <p className="text-sm text-muted-foreground mt-1">Starte einen neuen Chat!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredChats.map((chat, i) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <ChatItem chat={chat} currentUserId={user?.id} unread={unreadByChat[chat.id] || 0} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


