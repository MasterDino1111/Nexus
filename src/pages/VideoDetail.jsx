
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { callFunction } from "@/lib/callFunction";
import { ThumbsUp, ThumbsDown, Share2, Download, MessageSquare, Crown, ChevronLeft, Send, Eye, Bookmark, Heart, Flag } from "lucide-react";
import DonateDialog from "@/components/donate/DonateDialog";
import TranslateButton from "@/components/TranslateButton";
import SendToDialog from "@/components/share/SendToDialog";
import ReportDialog from "@/components/ReportDialog";
import { notifyLike } from "@/lib/notifyLike";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

function formatViews(n) {
  if (!n) return "0";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

export default function VideoDetail() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [likedComments, setLikedComments] = useState(new Set());
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [user, setUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [videoData, userData] = await Promise.all([
        base44.entities.Video.get(id),
        base44.auth.me(),
      ]);
      setVideo(videoData);
      setUser(userData);
      // Check premium status
      if (userData) {
        try {
          const subs = await base44.entities.Subscription.filter({ user_id: userData.id, status: "active" }, "-created_date", 1);
          setIsPremium(subs.length > 0 && subs[0].plan !== "free");
        } catch {}
      }
      // Only increment views if the viewer is not the uploader
      if (userData && videoData.uploader_id !== userData.id) {
        const { data } = await callFunction("trackView", { videoId: id }).catch(() => ({ data: {} }));
        if (data?.counted) setVideo(v => ({ ...v, views: data.views }));
      }
      // Record in watch history
      if (userData) {
        try {
          await base44.entities.VideoHistory.create({
            user_id: userData.id,
            video_id: id,
            video_title: videoData.title,
            video_thumbnail: videoData.thumbnail_url,
            video_channel: videoData.channel_name,
          });
        } catch {}
      }
      const commentData = await base44.entities.VideoComment.filter({ video_id: id }, "-created_date", 50);
      setComments(commentData);
      // Check if user already liked this video
      if (userData) {
        try {
          const myLikes = await base44.entities.VideoLike.filter({ user_id: userData.id, video_id: id }, "-created_date", 1);
          setLiked(myLikes.length > 0 && myLikes[0].type !== "dislike");
          setDisliked(myLikes[0]?.type === "dislike");
        } catch {}
      }
      // Check if saved for later
      if (userData) {
        try {
          const savedItems = await base44.entities.WatchLater.filter({ user_id: userData.id, video_id: id }, "-created_date", 1);
          setSaved(savedItems.length > 0);
        } catch {}
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Likes and dislikes are saved on the server, which also recalculates the counters
  const setReaction = async (reaction) => {
    if (!video || !user) return;
    const before = { liked, disliked };
    setLiked(reaction === "like");
    setDisliked(reaction === "dislike");
    const { ok, data } = await callFunction("reactVideo", { videoId: id, reaction }).catch(() => ({ ok: false, data: {} }));
    if (!ok) {
      setLiked(before.liked);
      setDisliked(before.disliked);
      return;
    }
    setVideo(v => ({ ...v, likes: data.likes, dislikes: data.dislikes }));
    if (reaction === "like" && data.previous !== "like") {
      notifyLike({
        ownerId: video.uploader_id,
        actor: user,
        kind: video.category === "shorts" ? "short" : "video",
        contentId: id,
        contentTitle: video.title,
        contentThumbnail: video.thumbnail_url,
        link: `/video/${id}`,
      }).catch(() => {});
    }
  };

  const handleLike = () => setReaction(liked ? "none" : "like");
  const handleDislike = () => setReaction(disliked ? "none" : "dislike");

  const toggleSave = async () => {
    if (!user || !video) return;
    try {
      if (saved) {
        const items = await base44.entities.WatchLater.filter({ user_id: user.id, video_id: id }, "-created_date", 1);
        if (items[0]) await base44.entities.WatchLater.delete(items[0].id);
        setSaved(false);
        toast({ title: "Aus 'Später ansehen' entfernt" });
      } else {
        await base44.entities.WatchLater.create({
          user_id: user.id,
          video_id: id,
          video_title: video.title,
          video_thumbnail: video.thumbnail_url,
          video_channel: video.channel_name,
        });
        setSaved(true);
        toast({ title: "Zu 'Später ansehen' hinzugefügt" });
      }
    } catch {}
  };

  const handleDownload = async () => {
    if (!video?.video_url) {
      toast({ title: "Kein Video zum Herunterladen", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(video.video_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (video.title || "video").replace(/[^a-zA-Z0-9]/g, "_") + ".mp4";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Download gestartet!" });
    } catch {
      toast({ title: "Download fehlgeschlagen", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/video/${id}`;
    if (navigator.share) {
      try { await navigator.share({ title: video.title, text: `Schau dir "${video.title}" an!`, url: shareUrl }); } catch {}
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link kopiert!" });
    }
  };

  const addComment = async (parentId = null) => {
    const text = parentId ? replyText : newComment;
    if (!text.trim() || !user) return;
    const comment = await base44.entities.VideoComment.create({
      video_id: id,
      user_id: user.id,
      user_name: user.full_name || "Anonym",
      content: text.trim(),
      likes: 0,
      parent_id: parentId,
    });
    setComments(prev => [comment, ...prev]);
    if (parentId) { setReplyText(""); setReplyingTo(null); }
    else setNewComment("");
  };

  const handleCommentLike = async (comment) => {
    if (!user) return;
    const isLiked = likedComments.has(comment.id);
    const newLiked = new Set(likedComments);
    if (isLiked) newLiked.delete(comment.id); else newLiked.add(comment.id);
    setLikedComments(newLiked);
    const newLikes = (comment.likes || 0) + (isLiked ? -1 : 1);
    await base44.entities.VideoComment.update(comment.id, { likes: newLikes });
    setComments(prev => prev.map(c => c.id === comment.id ? { ...c, likes: newLikes } : c));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Video nicht gefunden</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SendToDialog open={showSend} onOpenChange={setShowSend} video={video} />
      <ReportDialog open={showReport} onClose={() => setShowReport(false)} targetType={video.category === "shorts" ? "short" : "video"} targetId={video.id} targetTitle={video.title} />
      <DonateDialog
        open={donateOpen}
        onOpenChange={setDonateOpen}
        creatorId={video.uploader_id}
        creatorName={video.channel_name}
      />
      {/* Video Player Area */}
      <div className="relative aspect-video bg-black">
        {video.video_url ? (
          <video src={video.video_url} controls className="w-full h-full" poster={video.thumbnail_url} />
        ) : video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-background">
            <span className="text-6xl">🎬</span>
          </div>
        )}
        <Link
          to="/"
          className="absolute top-3 left-3 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
        >
          <ChevronLeft size={20} />
        </Link>
        {video.is_premium && (
          <div className="absolute top-3 right-3 bg-amber-500/90 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 font-semibold">
            <Crown size={12} /> Premium
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Title & Info */}
        <div>
          <h1 className="text-lg font-bold leading-snug">{video.title}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1"><Eye size={12} /> {formatViews(video.views)} Aufrufe</span>
            <span>•</span>
            <span>{moment(video.created_date).fromNow()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              liked ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
            }`}
          >
            <ThumbsUp size={16} /> {formatViews(video.likes || 0)}
          </button>
          <button
            onClick={handleDislike}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              disliked ? "bg-destructive text-destructive-foreground" : "bg-secondary hover:bg-secondary/80"
            }`}
          >
            <ThumbsDown size={16} /> {formatViews(video.dislikes || 0)}
          </button>
          <button onClick={handleShare} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-secondary hover:bg-secondary/80 transition-all">
            <Share2 size={16} /> Teilen
          </button>
          <button onClick={() => setShowReport(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-secondary hover:bg-secondary/80 transition-all" aria-label="Melden">
            <Flag size={16} /> Melden
          </button>
          <button onClick={() => setShowSend(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-secondary hover:bg-secondary/80 transition-all">
            <Send size={16} /> Senden
          </button>
          <button
            onClick={toggleSave}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              saved ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
            }`}
          >
            <Bookmark size={16} className={saved ? "fill-current" : ""} /> {saved ? "Gespeichert" : "Später"}
          </button>
          {video.uploader_id && video.uploader_id !== user?.id && (
            <button
              onClick={() => setDonateOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-destructive/15 text-destructive hover:bg-destructive/25 transition-all"
            >
              <Heart size={16} className="fill-destructive" /> Spenden
            </button>
          )}
          {isPremium && (
            <button onClick={handleDownload} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-amber-400/20 text-amber-400 hover:bg-amber-400/30 transition-all">
              <Download size={16} /> Download
            </button>
          )}
          {!isPremium && (
            <Link to="/premium" className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-amber-400/10 text-amber-400/70 hover:bg-amber-400/20 transition-all">
              <Crown size={16} /> Premium für Download
            </Link>
          )}
        </div>

        {/* Channel */}
        <Link
          to={`/channel/video/${encodeURIComponent(video.channel_name || "Unbekannt")}`}
          className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex-shrink-0">
            {video.channel_avatar ? (
              <img src={video.channel_avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-primary">
                {(video.channel_name || "U")[0]}
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{video.channel_name || "Unbekannt"}</p>
          </div>
          <span className="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-semibold rounded-full">
            Kanal ansehen
          </span>
        </Link>

        {/* Description */}
        {video.description && (
          <div className="p-3 bg-secondary/50 rounded-xl">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3">{video.description}</p>
            <TranslateButton text={video.description} label="Beschreibung übersetzen" />
          </div>
        )}

        {/* Comments */}
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <MessageSquare size={16} /> Kommentare ({comments.length})
          </h3>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Kommentar hinzufügen..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addComment()}
              className="flex-1 px-3 py-2 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
            />
            <button
              onClick={addComment}
              disabled={!newComment.trim()}
              className="p-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-30 transition-opacity"
            >
              <Send size={16} />
            </button>
          </div>

          <div className="space-y-3">
            {comments.filter(c => !c.parent_id).map(comment => {
              const replies = comments.filter(c => c.parent_id === comment.id);
              const isLiked = likedComments.has(comment.id);
              const isReplying = replyingTo === comment.id;
              return (
                <div key={comment.id}>
                  <div className="flex gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                      {(comment.user_name || "A")[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{comment.user_name}</span>
                        <span className="text-[10px] text-muted-foreground">{moment(comment.created_date).fromNow()}</span>
                      </div>
                      <p className="text-sm text-foreground/80 mt-0.5">{comment.content}</p>
                      <div className="flex items-center gap-4 mt-1.5">
                        <button
                          onClick={() => handleCommentLike(comment)}
                          className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${isLiked ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          <ThumbsUp size={11} className={isLiked ? "fill-current" : ""} /> {comment.likes || 0}
                        </button>
                        <button
                          onClick={() => setReplyingTo(isReplying ? null : comment.id)}
                          className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Antworten
                        </button>
                      </div>

                      {isReplying && (
                        <div className="flex gap-2 mt-2">
                          <input
                            autoFocus
                            type="text"
                            placeholder={`Antwort an ${comment.user_name}...`}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addComment(comment.id)}
                            className="flex-1 px-3 py-1.5 bg-secondary rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
                          />
                          <button
                            onClick={() => addComment(comment.id)}
                            disabled={!replyText.trim()}
                            className="p-1.5 bg-primary text-primary-foreground rounded-xl disabled:opacity-30 transition-opacity"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      )}

                      {replies.length > 0 && (
                        <div className="space-y-2.5 mt-3 pl-2 border-l border-border">
                          {replies.map(reply => {
                            const replyLiked = likedComments.has(reply.id);
                            return (
                              <div key={reply.id} className="flex gap-2 pl-2">
                                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-primary">
                                  {(reply.user_name || "A")[0]}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold">{reply.user_name}</span>
                                    <span className="text-[10px] text-muted-foreground">{moment(reply.created_date).fromNow()}</span>
                                  </div>
                                  <p className="text-sm text-foreground/80 mt-0.5">{reply.content}</p>
                                  <button
                                    onClick={() => handleCommentLike(reply)}
                                    className={`flex items-center gap-1 text-[11px] font-medium mt-1 transition-colors ${replyLiked ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                                  >
                                    <ThumbsUp size={11} className={replyLiked ? "fill-current" : ""} /> {reply.likes || 0}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


