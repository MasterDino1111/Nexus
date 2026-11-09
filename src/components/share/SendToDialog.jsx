
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Send, Search, Loader2, Check, MessageCircle, Video } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function SendToDialog({ open, onOpenChange, video }) {
  const [chats, setChats] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sendingTo, setSendingTo] = useState(null);
  const [sentTo, setSentTo] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setSentTo([]);
      setSearch("");
      loadChats();
    }
  }, [open]);

  const loadChats = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      setUser(me);
      const [participantChats, invitedChats] = await Promise.all([
        base44.entities.Chat.filter(
          { participants: { $elemMatch: { $eq: me.id } } },
          "-last_message_time", 100
        ).catch(() => []),
        base44.entities.Chat.filter(
          { contact_email: me.email },
          "-last_message_time", 100
        ).catch(() => []),
      ]);
      const merged = [...participantChats];
      for (const c of invitedChats) {
        if (!merged.find(x => x.id === c.id)) merged.push(c);
      }
      setChats(merged.filter(c => c.status !== "rejected" && !(c.status === "pending" && c.contact_email === me.email)));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const sendTo = async (chat) => {
    if (!user || !video) return;
    setSendingTo(chat.id);
    const link = `${window.location.origin}/video/${video.id}`;
    const text = `🎬 ${video.title}\n${link}`;
    try {
      await base44.entities.Message.create({
        chat_id: chat.id,
        sender_id: user.id,
        sender_name: user.full_name || "Ich",
        content: text,
        message_type: "video",
      });
      await base44.entities.Chat.update(chat.id, {
        last_message: `🎬 ${video.title}`,
        last_message_time: new Date().toISOString(),
      });
      setSentTo(prev => [...prev, chat.id]);
      toast({ title: `An ${chat.chat_name || "Chat"} gesendet` });
    } catch (e) {
      toast({ title: "Senden fehlgeschlagen", variant: "destructive" });
    }
    setSendingTo(null);
  };

  const filtered = search
    ? chats.filter(c => c.chat_name?.toLowerCase().includes(search.toLowerCase()))
    : chats;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>Senden an...</DialogTitle>
        </DialogHeader>

        {/* Video preview */}
        {video && (
          <div className="flex items-center gap-3 bg-secondary/50 rounded-xl p-2.5">
            <div className="w-14 h-9 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
              {video.thumbnail_url ? (
                <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video size={14} className="text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="text-xs font-medium line-clamp-2 flex-1">{video.title}</p>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Chats suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Chat list */}
        <div className="max-h-72 overflow-y-auto space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={22} className="text-primary animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <MessageCircle size={26} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Noch keine Chats vorhanden</p>
            </div>
          ) : (
            filtered.map(chat => {
              const isSent = sentTo.includes(chat.id);
              const isSending = sendingTo === chat.id;
              return (
                <button
                  key={chat.id}
                  onClick={() => !isSent && !isSending && sendTo(chat)}
                  disabled={isSent || isSending}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    isSent ? "bg-primary/10" : "hover:bg-secondary"
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {chat.chat_avatar ? (
                      <img src={chat.chat_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-primary">{(chat.chat_name || "?")[0].toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium truncate flex-1">{chat.chat_name || "Chat"}</span>
                  {isSending ? (
                    <Loader2 size={16} className="text-primary animate-spin flex-shrink-0" />
                  ) : isSent ? (
                    <Check size={16} className="text-primary flex-shrink-0" />
                  ) : (
                    <Send size={15} className="text-muted-foreground flex-shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


