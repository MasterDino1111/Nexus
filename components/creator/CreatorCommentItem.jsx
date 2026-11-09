
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Reply, Send, Loader2 } from "lucide-react";
import moment from "moment";

export default function CreatorCommentItem({ comment, videoTitle, onReply }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await onReply(comment, text.trim());
    setSending(false);
    setText("");
    setOpen(false);
  };

  return (
    <div className="bg-secondary/40 rounded-xl p-3">
      <div className="flex gap-2.5">
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
          {(comment.user_name || "A")[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold truncate">{comment.user_name || "Anonym"}</span>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">{moment(comment.created_date).fromNow()}</span>
          </div>
          <p className="text-sm text-foreground/85 mt-0.5 break-words">{comment.content}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <Link
              to={`/video/${comment.video_id}`}
              className="text-[10px] font-medium text-muted-foreground hover:text-primary truncate"
            >
              ▶ {videoTitle || "Video"}
            </Link>
            <button
              onClick={() => setOpen(o => !o)}
              className="text-[10px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 flex-shrink-0"
            >
              <Reply size={11} /> Antworten
            </button>
          </div>

          {open && (
            <div className="flex gap-2 mt-2">
              <input
                autoFocus
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
                placeholder="Antwort schreiben..."
                className="flex-1 min-w-0 px-3 py-1.5 bg-background rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary transition-all"
              />
              <button
                onClick={submit}
                disabled={!text.trim() || sending}
                className="p-1.5 bg-primary text-primary-foreground rounded-xl disabled:opacity-30 transition-opacity"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


