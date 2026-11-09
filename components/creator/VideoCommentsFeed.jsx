
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Loader2 } from "lucide-react";
import CreatorCommentItem from "@/components/creator/CreatorCommentItem";

const MAX_COMMENTS = 12;

export default function VideoCommentsFeed({ videos, user }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [videos]);

  const load = async () => {
    const ids = videos.map(v => v.id);
    if (!ids.length) { setComments([]); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await base44.entities.VideoComment.filter({ video_id: { $in: ids } }, "-created_date", MAX_COMMENTS);
      setComments(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const sendReply = async (comment, text) => {
    await base44.entities.VideoComment.create({
      video_id: comment.video_id,
      user_id: user?.id,
      user_name: user?.full_name || "Anonym",
      content: text,
      likes: 0,
      parent_id: comment.parent_id || comment.id,
    });
    await load();
  };

  return (
    <div className="bg-secondary/30 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare size={15} className="text-primary" />
        <p className="text-sm font-semibold">Neueste Kommentare</p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 size={20} className="text-primary animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Noch keine Kommentare zu deinen Videos.
        </p>
      ) : (
        <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
          {comments.map(c => (
            <CreatorCommentItem
              key={c.id}
              comment={c}
              videoTitle={videos.find(v => v.id === c.video_id)?.title}
              onReply={sendReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}


