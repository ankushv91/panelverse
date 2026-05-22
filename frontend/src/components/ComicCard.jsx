import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bookmark, Star, Eye, Image as ImageIcon } from 'lucide-react';

const ComicCard = ({ comic, isBookmarked = false, onBookmarkToggle, chapterLabel = "Latest", creatorMode = false }) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  if (!comic) return null;

  const handleChapterClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (comic.latest_chapter?.id) {
      navigate(`/read/${comic.latest_chapter.id}`, {
        state: { comicId: comic.id }
      });
    }
  };

  return (
    <Link
      to={`/comics/${comic.id}`}
      className="w-full h-fit flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.04] hover:border-zinc-700 hover:shadow-xl hover:shadow-black/50 group p-0.5 m-0.5 block decoration-transparent"
    >
      <div className="relative w-full aspect-[3/4] bg-zinc-950 overflow-hidden rounded-lg flex-shrink-0">
        {!imageError && comic.cover_image_url ? (
          <img
            src={comic.cover_image_url}
            alt={comic.title}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 bg-zinc-950 border-b border-zinc-800/50 gap-2">
            <ImageIcon size={32} className="opacity-50" />
            <span className="text-xs font-semibold uppercase tracking-wider opacity-50">No Cover</span>
          </div>
        )}

        {isBookmarked && (
          <button
            type="button" // Prevents form submission side-effects if nested
            onClick={(e) => {
              e.preventDefault();  // CRITICAL: Tells the browser NOT to follow the parent <Link>
              e.stopPropagation(); // CRITICAL: Tells React NOT to bubble the click up to the parent card
              onBookmarkToggle?.(comic.id);
            }}
            className="absolute top-2 right-2 bg-indigo-600/90 backdrop-blur text-white p-1.5 rounded-lg shadow-lg border border-indigo-500/50 hover:bg-indigo-500 transition-colors z-10 cursor-pointer"
          >
            <Bookmark size={16} className="fill-current" />
          </button>
        )}

        {comic.comic_status && (
          <div className="absolute top-2 left-2 bg-zinc-950/80 backdrop-blur text-zinc-300 px-2 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border border-zinc-800">
            {comic.comic_status}
          </div>
        )}

        {creatorMode && comic.approval_status && (
          <div className={`absolute bottom-2 left-2 px-2 py-1 rounded-md text-[9px] font-black tracking-wider uppercase backdrop-blur border shadow-md transition-all ${comic.approval_status === 'approved'
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5'
            : comic.approval_status === 'rejected'
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-rose-500/5'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/5'
            }`}>
            {comic.approval_status === 'approved'
              ? 'Live / Approved'
              : comic.approval_status === 'rejected'
                ? 'Action Required'
                : 'Pending Review'}
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1 gap-2">
        <h3
          className="text-zinc-200 font-semibold text-sm line-clamp-2 leading-snug group-hover:text-indigo-400 transition-colors"
          title={comic.title}
        >
          {comic.title}
        </h3>

        <div className="flex-1" />

        <div className="flex items-center gap-3 text-xs text-zinc-500 mb-1">
          <div className="flex items-center gap-1">
            <Star size={12} className="text-amber-500 fill-amber-500/20" />
            <span>{comic.avg_rating ? comic.avg_rating.toFixed(1) : '0.0'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye size={12} />
            <span>{comic.view_count || 0}</span>
          </div>
        </div>

        {comic.latest_chapter ? (
          <button
            onClick={handleChapterClick}
            className="w-full flex items-center justify-between bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-medium transition-colors group/btn"
          >
            <span>{chapterLabel}</span>
            <span className="text-indigo-400 group-hover/btn:text-indigo-300 font-bold transition-colors">
              Ch. {comic.latest_chapter.chapter_no}
            </span>
          </button>
        ) : (
          <div className="w-full bg-zinc-950/50 text-zinc-600 border border-zinc-800/50 rounded-lg px-3 py-2 text-xs font-medium text-center">
            No chapters yet
          </div>
        )}
      </div>
    </Link>
  );
};

export default ComicCard;