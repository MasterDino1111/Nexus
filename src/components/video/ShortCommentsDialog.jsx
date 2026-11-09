
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Loader2, MessageCircle } from "lucide-react";
import moment from "moment";

export default function ShortCommentsDialog({ open, onOpenChange, video, me }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open && video?.id) load();
  }, [open, video?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.VideoComment.filter({ video_id: video.id }, "-created_date", 50);
      setComments(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const submit = async () => {
    if (!text.trim() || sending || !me) return;
    setSending(true);
    const created = await base44.entities.VideoComment.create({
      video_id: video.id,
      user_id: me.id,
      user_name: me.full_name || "Anonym",
      content: text.trim(),
      likes: 0,
    });
    setComments(prev => [created, ...prev]);
    setText("");
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="p-4 pb-3 border-b border-border">
          <DialogTitle className="text-sm flex items-center gap-2">
            <MessageCircle size={15} className="text-primary" /> Kommentare ({comments.length})
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-10 flex justify-center">
              <Loader2 size={20} className="text-primary animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Noch keine Kommentare – sei der Erste!
            </p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                  {(c.user_name || "A")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold truncate">{c.user_name || "Anonym"}</span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {moment(c.created_date).fromNow()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/85 mt-0.5 break-words">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-border flex gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="Kommentar hinzufügen..."
            className="flex-1 min-w-0 px-3 py-2 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
          />
          <button
            onClick={submit}
            disabled={!text.trim() || sending}
            className="p-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-30 transition-opacity"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


