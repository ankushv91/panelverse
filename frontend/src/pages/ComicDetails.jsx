import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, Eye, Bookmark, ArrowLeft, BookOpen, ImageIcon, Sparkles, Clock, Edit3, X, Save, CheckSquare, Square, ChevronDown, Camera, Plus, ArrowRight } from 'lucide-react';
import { apiFetch } from '../lib/api/api';
import ChapterCreationWorkspace from '../components/ChapterCreationWorkspace';

const ComicDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  const [comic, setComic] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [chapters, setChapters] = useState([]);
  const [chaptersLoading, setChaptersLoading] = useState(true);

  const [isAuthor, setIsAuthor] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [allGenres, setAllGenres] = useState([]);
  const [isGenreDropdownOpen, setIsGenreDropdownOpen] = useState(false);

  const [activeSubView, setActiveSubView] = useState('details');

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    comic_status: 'ongoing',
    genre_ids: [],
    cover_image_url: ''
  });

  const parseUserIdFromToken = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const decoded = JSON.parse(jsonPayload);
      return decoded.user_id || decoded.sub || null;
    } catch {
      return null;
    }
  };

  // Rating states
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0); // Holds the number of stars clicked (1-5)
  const [hoveredRating, setHoveredRating] = useState(0);  // Tracking mouse hovers for glowing visual feedback
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const fetchComic = async () => {
      try {
        const data = await apiFetch(`/comics/${id}`);
        if (isMounted) {
          setComic(data);
          setEditForm({
            title: data.title || '',
            description: data.description || '',
            comic_status: data.comic_status || 'ongoing',
            genre_ids: data.genres ? data.genres.map((g) => g.id) : [],
            cover_image_url: data.cover_image_url || ''
          });

          const currentUserId = parseUserIdFromToken();
          if (currentUserId && data.authors) {
            const match = data.authors.some((auth) => auth.author_id === Number(currentUserId));
            setIsAuthor(match);
          }
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Comic not found');
          setIsLoading(false);
        }
      }
    };

    if (id) {
      fetchComic();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    setChaptersLoading(true);

    const fetchChapters = async () => {
      try {
        const data = await apiFetch(`/comics/${id}/chapters`);
        if (isMounted) {
          setChapters(Array.isArray(data) ? data : []);
        }
      } catch {
        if (isMounted) {
          setChapters([]);
        }
      } finally {
        if (isMounted) {
          setChaptersLoading(false);
        }
      }
    };

    if (id) {
      fetchChapters();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!isEditing) return;

    const fetchGenres = async () => {
      try {
        const data = await apiFetch('/comics/genres');
        setAllGenres(Array.isArray(data) ? data : []);
      } catch {
        setAllGenres([]);
      }
    };

    if (allGenres.length === 0) {
      fetchGenres();
    }
  }, [isEditing, allGenres.length]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsGenreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      setEditForm((prev) => ({ ...prev, cover_image_url: localUrl }));
    }
  };

  const handleGenreToggle = (genreId) => {
    setEditForm((prev) => {
      const alreadySelected = prev.genre_ids.includes(genreId);
      const updatedIds = alreadySelected
        ? prev.genre_ids.filter((id) => id !== genreId)
        : [...prev.genre_ids, genreId];
      return { ...prev, genre_ids: updatedIds };
    });
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const payload = {
        title: editForm.title,
        cover_image_url: editForm.cover_image_url,
        comic_status: editForm.comic_status,
        description: editForm.description,
        genre_ids: editForm.genre_ids,
        new_author_ids: comic.authors ? comic.authors.map((a) => a.author_id) : []
      };

      const updatedData = await apiFetch(`/comics/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      setComic(updatedData);
      setIsEditing(false);
    } catch (err) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const formatRelativeDate = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffWeeks === 1) return '1 week ago';
    if (diffWeeks < 5) return `${diffWeeks} weeks ago`;
    if (diffMonths === 1) return '1 month ago';
    if (diffMonths < 12) return `${diffMonths} months ago`;
    return date.toLocaleDateString();
  };

  const handleChapterClick = (chapterId) => {
    navigate(`/read/${chapterId}`, {
      state: { comicId: comic.id }
    });
  };

  const currentCoverUrl = isEditing ? editForm.cover_image_url : comic?.cover_image_url;
  const handleDeleteChapter = async (chapterId, chapterNo) => {
    if (!window.confirm(`Are you sure you want to delete Chapter ${chapterNo}? This action cannot be undone.`)) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      // Per your specification: comic_id is in path, chapter_id is a query parameter
      const response = await fetch(`http://localhost:8000/author/${id}/chapters?chapter_id=${chapterId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        let errorMsg = 'Failed to delete the selected chapter.';
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errorMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
          }
        } catch (jsonErr) { }
        throw new Error(errorMsg);
      }

      // Remove the dropped chapter from your local array state reactively
      setChapters(prev => prev.filter(ch => ch.id !== chapterId));
      alert(`Chapter ${chapterNo} was deleted successfully.`);
    } catch (err) {
      console.error("Delete Chapter Catch Error:", err);
      alert(err.message || "An unexpected error occurred while deleting the chapter.");
    }
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen text-white bg-zinc-950">
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-12 animate-pulse">
          <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900/20 p-6 md:p-8 flex flex-col md:flex-row gap-8">
            <div className="w-full max-w-[240px] aspect-[2/3] md:w-60 md:h-90 bg-zinc-900 rounded-2xl flex-shrink-0 mx-auto md:mx-0" />
            <div className="flex-1 min-w-0 space-y-6 py-2">
              <div className="space-y-3">
                <div className="h-10 bg-zinc-900 rounded-lg w-2/3" />
                <div className="h-5 bg-zinc-900 rounded w-1/4" />
              </div>
              <div className="flex flex-col gap-3">
                <div className="h-6 bg-zinc-900 rounded w-24" />
                <div className="h-6 bg-zinc-900 rounded w-28" />
                <div className="h-6 bg-zinc-900 rounded w-20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !comic) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-600/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl" />
          <div className="w-16 h-16 bg-zinc-850 border border-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-500">
            <BookOpen size={28} className="text-indigo-400 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Comic Not Found</h2>
          <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
            {error || "We couldn't retrieve the details for this comic. It may have been removed or the ID is incorrect."}
          </p>
          <Link to="/" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/20 active:scale-[0.98]">
            <ArrowLeft size={16} />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    );
  }

  if (activeSubView === 'add-chapter') {
    return (
      <ChapterCreationWorkspace
        comicId={id}
        comicTitle={comic?.title}
        existingChapters={chapters}
        onClose={() => setActiveSubView('details')}
        onSuccess={() => {
          setActiveSubView('details');
          setChaptersLoading(true);
          apiFetch(`/comics/${id}/chapters`)
            .then(data => setChapters(Array.isArray(data) ? data : []))
            .finally(() => setChaptersLoading(false));
        }}
      />
    );
  }

  const handleBookmarkToggle = async () => {
    if (!comic) return;

    // Save previous state to rollback if network drops
    const previousState = comic.isBookmarked;

    // Optimistically flip the state right away for a snappy UI feel
    setComic(prev => ({
      ...prev,
      isBookmarked: !previousState
    }));

    try {
      if (!previousState) {
        // Case: Not bookmarked -> Fire POST request with query param
        await apiFetch(`/comics/bookmarks?comic_id=${id}`, {
          method: 'POST'
        });
      } else {
        // Case: Already bookmarked -> Fire DELETE request with query param
        await apiFetch(`/comics/bookmarks?comic_id=${id}`, {
          method: 'DELETE'
        });
      }
    } catch (err) {
      // Revert back to original state if the API fails
      setComic(prev => ({
        ...prev,
        isBookmarked: previousState
      }));
      alert(err.message || "Failed to update bookmark status.");
    }
  };

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    if (selectedRating < 1 || selectedRating > 5) return;

    setIsSubmittingRating(true);
    try {
      const updatedData = await apiFetch('/comics/rating', {
        method: 'PUT',
        body: JSON.stringify({
          comic_id: Number(id),
          rating: selectedRating
        })
      });

      // Assuming your PUT endpoint returns the updated comic schema with new avg_rating
      if (updatedData && updatedData.avg_rating !== undefined) {
        setComic(updatedData);
      } else {
        // Fallback: Re-fetch the comic block to pull updated averages
        const refreshedComic = await apiFetch(`/comics/${id}`);
        setComic(refreshedComic);
      }

      setIsRatingOpen(false); // Close the selector container on success
    } catch (err) {
      alert(err.message || "Failed to submit your rating selection.");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  return (
    <div className="w-full min-h-screen text-white bg-zinc-950">
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-12">

        <section className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900/40 backdrop-blur-xl shadow-2xl p-6 md:p-8 flex flex-col md:flex-row gap-8">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.03] blur-2xl scale-110 pointer-events-none select-none transition-all duration-500"
            style={{ backgroundImage: `url(${currentCoverUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950/40 via-transparent to-transparent pointer-events-none" />

          <div
            onClick={() => isEditing && fileInputRef.current?.click()}
            className={`w-full max-w-[240px] aspect-[2/3] md:w-60 md:h-90 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex-shrink-0 shadow-2xl relative mx-auto md:mx-0 group ${isEditing ? 'cursor-pointer' : ''}`}
          >
            {currentCoverUrl ? (
              <img src={currentCoverUrl} alt={comic.title} loading="lazy" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 bg-zinc-950 gap-2">
                <ImageIcon size={48} className="opacity-50" />
                <span className="text-xs font-semibold uppercase tracking-wider opacity-50">No Cover</span>
              </div>
            )}

            {isEditing && (
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 text-zinc-200">
                <div className="w-10 h-10 rounded-full bg-zinc-900/80 border border-zinc-700 flex items-center justify-center">
                  <Camera size={18} className="text-indigo-400" />
                </div>
                <span className="text-xs font-bold tracking-wide">Change Cover</span>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-between space-y-6 relative z-10">
            <div className="space-y-5">

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      type="text"
                      name="title"
                      value={editForm.title}
                      onChange={handleInputChange}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white font-bold text-2xl focus:outline-none focus:border-indigo-500 transition-all"
                    />
                  ) : (
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight truncate">
                      {comic.title}
                    </h1>
                  )}
                  <p className="text-indigo-400 font-semibold text-sm tracking-wide">
                    {comic.authors && comic.authors.length > 0
                      ? `BY ${comic.authors.map(a => a.name.toUpperCase()).join(', ')}`
                      : 'BY UNKNOWN AUTHOR'}
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {isAuthor && (
                    isEditing ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditForm({
                              title: comic.title || '',
                              description: comic.description || '',
                              comic_status: comic.comic_status || 'ongoing',
                              genre_ids: comic.genres ? comic.genres.map((g) => g.id) : [],
                              cover_image_url: comic.cover_image_url || ''
                            });
                            setIsEditing(false);
                          }}
                          disabled={isSaving}
                          className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:text-zinc-200 disabled:opacity-50"
                        >
                          <X size={14} />
                          <span>Cancel</span>
                        </button>
                        <button
                          onClick={handleSaveChanges}
                          disabled={isSaving}
                          className="inline-flex items-center gap-1.5 bg-emerald-600 border border-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {isSaving ? <Sparkles size={14} className="animate-spin" /> : <Save size={14} />}
                          <span>Save</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="inline-flex items-center gap-1.5 bg-zinc-900/80 border border-zinc-800 text-zinc-300 px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all hover:text-white hover:border-zinc-700"
                      >
                        <Edit3 size={14} />
                        <span>Edit Series</span>
                      </button>
                    )
                  )}

                  {!isEditing && (
                    <button
                      type="button"
                      onClick={handleBookmarkToggle}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all select-none border active:scale-[0.98] ${comic.isBookmarked
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-600/30 hover:bg-indigo-500'
                        : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                        }`}
                    >
                      <Bookmark size={16} className={comic.isBookmarked ? 'fill-current' : ''} />
                      <span>{comic.isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col space-y-3 z-20 relative text-xs font-bold tracking-wider uppercase">
                <div className="flex items-center gap-3 min-h-[32px]">
                  <span className="text-zinc-500 w-20 flex-shrink-0">Status</span>
                  {isEditing ? (
                    <select
                      name="comic_status"
                      value={editForm.comic_status}
                      onChange={handleInputChange}
                      className="bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg font-bold focus:outline-none focus:border-indigo-500 transition-all uppercase"
                    >
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="hiatus">Hiatus</option>
                    </select>
                  ) : (
                    comic.comic_status && (
                      <span className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg">
                        {comic.comic_status}
                      </span>
                    )
                  )}
                </div>

                <div className="flex items-start gap-3 min-h-[32px] pt-0.5">
                  <span className="text-zinc-500 w-20 flex-shrink-0 mt-1.5">Genres</span>
                  {isEditing ? (
                    <div className="relative" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsGenreDropdownOpen(!isGenreDropdownOpen)}
                        className="bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg font-bold focus:outline-none flex items-center gap-2 uppercase hover:border-zinc-700"
                      >
                        <span>Select Genres ({editForm.genre_ids.length})</span>
                        <ChevronDown size={14} className={`transition-transform duration-200 ${isGenreDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isGenreDropdownOpen && (
                        <div className="absolute left-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-2 z-50 space-y-0.5 max-h-60 overflow-y-auto">
                          {allGenres.length === 0 ? (
                            <div className="p-2 text-zinc-600 text-xs text-center">Loading list...</div>
                          ) : (
                            allGenres.map((g) => {
                              const isChecked = editForm.genre_ids.includes(g.id);
                              return (
                                <button
                                  type="button"
                                  key={g.id}
                                  onClick={() => handleGenreToggle(g.id)}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-zinc-300 rounded-lg text-xs font-semibold hover:bg-zinc-950 hover:text-white text-left transition-colors"
                                >
                                  {isChecked ? <CheckSquare size={14} className="text-indigo-400" /> : <Square size={14} className="text-zinc-600" />}
                                  <span>{g.genre_type}</span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {comic.genres && comic.genres.length > 0 ? (
                        comic.genres.map((g) => (
                          <span key={g.id} className="px-3 py-1.5 bg-zinc-900 text-zinc-400 border border-zinc-800/80 rounded-lg font-medium">
                            {g.genre_type}
                          </span>
                        ))
                      ) : (
                        <span className="text-zinc-600 font-medium normal-case py-1">No genres assigned</span>
                      )}
                    </div>
                  )}
                </div>

                {/* ✅ PASTE THIS CHUNK IN PLACE OF THE CODE REMOVED ABOVE: */}
                {!isEditing && (
                  <>
                    <div className="flex items-center gap-3 min-h-[32px] relative">
                      <span className="text-zinc-500 w-20 flex-shrink-0">Rating</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Current Average Rating Display Badge */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
                          <Star size={14} className="fill-current" />
                          <span>{comic.avg_rating ? comic.avg_rating.toFixed(1) : '0.0'} RATING</span>
                        </div>

                        {/* Interactive Rate Toggle Trigger Button */}
                        <button
                          type="button"
                          onClick={() => setIsRatingOpen(!isRatingOpen)}
                          className={`px-3 py-1.5 rounded-lg border text-[11px] font-black tracking-widest transition-all uppercase ${isRatingOpen
                            ? 'bg-zinc-100 border-zinc-200 text-zinc-950'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                            }`}
                        >
                          {isRatingOpen ? 'Close Panel' : 'Rate Series'}
                        </button>

                        {/* Expandable Star Selector Drawer */}
                        {isRatingOpen && (
                          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-2 pl-3 animate-in fade-in slide-in-from-left-2 duration-200 shadow-xl z-30">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((starIdx) => {
                                const isGlowing = hoveredRating >= starIdx || (!hoveredRating && selectedRating >= starIdx);
                                return (
                                  <button
                                    type="button"
                                    key={starIdx}
                                    onClick={() => setSelectedRating(starIdx)}
                                    onMouseEnter={() => setHoveredRating(starIdx)}
                                    onMouseLeave={() => setHoveredRating(0)}
                                    className="p-0.5 text-zinc-600 hover:scale-110 transition-transform duration-100"
                                  >
                                    <Star
                                      size={16}
                                      className={`transition-colors duration-150 ${isGlowing
                                        ? 'text-amber-400 fill-amber-400 shadow-sm'
                                        : 'text-zinc-700'
                                        }`}
                                    />
                                  </button>
                                );
                              })}
                            </div>

                            {/* Submit action button */}
                            <button
                              type="button"
                              onClick={handleRatingSubmit}
                              disabled={selectedRating === 0 || isSubmittingRating}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-3 py-1 rounded-lg text-[10px] tracking-wider uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              {isSubmittingRating ? 'Saving' : 'Submit'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 min-h-[32px]">
                      <span className="text-zinc-500 w-20 flex-shrink-0">Metrics</span>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/80 text-zinc-300 border border-zinc-700/55 rounded-lg">
                        <Eye size={14} />
                        <span>{comic.view_count || 0} VIEWS</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="border-t border-zinc-800/60 pt-5 space-y-2">
              <h3 className="text-xs font-black tracking-widest text-zinc-500 uppercase">Synopsis</h3>
              {isEditing ? (
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-300 text-sm focus:outline-none focus:border-indigo-500 transition-all resize-none leading-relaxed"
                />
              ) : (
                <p className="text-zinc-400 text-sm md:text-base break-words whitespace-pre-wrap leading-relaxed">
                  {comic.description || "No description provided for this comic series."}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="bg-zinc-900/20 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BookOpen size={20} className="text-indigo-500 flex-shrink-0" />
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                Chapters
              </h2>
              {!chaptersLoading && chapters.length > 0 && (
                <span className="text-xs text-zinc-500 font-medium ml-1">
                  ({chapters.length})
                </span>
              )}
            </div>

            {isAuthor && !isEditing && (
              <button
                type="button"
                onClick={() => setActiveSubView('add-chapter')}
                className="inline-flex items-center gap-1.5 bg-indigo-600/90 hover:bg-indigo-600 border border-indigo-500/30 text-white px-3.5 py-2 rounded-xl text-xs font-black tracking-wide transition-all group/btn shadow-lg shadow-indigo-600/10 shrink-0"
              >
                <Plus size={14} />
                <span>Add Chapter</span>
                <ArrowRight size={12} className="opacity-0 -translate-x-1 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-200" />
              </button>
            )}
          </div>

          {chaptersLoading && (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4 flex items-center gap-4">
                  <div className="h-5 w-14 bg-zinc-900 rounded" />
                  <div className="flex-1 h-4 bg-zinc-900 rounded w-2/3" />
                  <div className="h-3 w-20 bg-zinc-900 rounded" />
                </div>
              ))}
            </div>
          )}

          {!chaptersLoading && chapters.length === 0 && (
            <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[120px]">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                <Sparkles size={18} className="text-indigo-400" />
              </div>
              <span className="text-sm font-semibold text-zinc-400">No chapters published yet.</span>
            </div>
          )}

          {!chaptersLoading && chapters.length > 0 && (
            <div className="space-y-2">
              {chapters.map((chapter) => (
                <div
                  key={chapter.id}
                  onClick={() => handleChapterClick(chapter.id)}
                  className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl px-4 py-3.5 flex items-center gap-4 hover:bg-zinc-900/50 hover:border-zinc-700/60 transition-all duration-200 cursor-pointer group"
                >
                  <span className="text-xs font-black tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg whitespace-nowrap flex-shrink-0">
                    Ch. {chapter.chapter_no}
                  </span>
                  <span className="flex-1 min-w-0 text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                    {chapter.chapter_name || ''}
                  </span>
                  <div className="flex items-center gap-3 flex-shrink-0 text-zinc-500 text-xs">
                    <span className="hidden sm:inline-flex items-center gap-1">
                      <Clock size={12} />
                      {formatRelativeDate(chapter.created_at)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Eye size={12} />
                      {chapter.view_count || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-zinc-900/20 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-indigo-500 font-black">#</span>
              <span>Reader Comments Thread</span>
            </h2>
            <span className="text-[10px] uppercase font-bold tracking-widest bg-zinc-900 text-zinc-400 px-2.5 py-1 rounded-md border border-zinc-800/50">
              Placeholder Segment
            </span>
          </div>
          <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[140px] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-1">
              <span className="text-indigo-400 font-bold text-base">💬</span>
            </div>
            <span className="text-sm font-semibold text-zinc-300">Reader Comments Thread</span>
            <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
              Community discussions, replies, and reading reactions will reside inside this interactive forum component.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
};

export default ComicDetails;