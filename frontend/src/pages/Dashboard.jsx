import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Camera, Check, X, Calendar, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { DEFAULT_ASSETS } from '../config/constants';
import ComicCard from '../components/ComicCard';

// Relative Timestamp helper
const getRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Joined today";
  if (diffDays === 1) return "Joined yesterday";
  if (diffDays < 30) return `Joined ${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "Joined 1 month ago";
  if (diffMonths < 12) return `Joined ${diffMonths} months ago`;
  const diffYears = Math.floor(diffDays / 365);
  return `Joined ${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
};

// Reading Streak Calculator algorithm
const calculateStreak = (history) => {
  if (!history || history.length === 0) return 0;

  // 1. Format all timestamps into unique, normalized YYYY-MM-DD local strings
  const readDates = history
    .map(item => {
      if (!item.updated_at) return null;
      const d = new Date(item.updated_at);
      // Pad single digits to guarantee a safe ISO format layout string
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })
    .filter(Boolean);

  // 2. De-duplicate multiple entries logged on the same calendar date
  const uniqueDates = Array.from(new Set(readDates));

  // 3. Create tracking milestones for today and yesterday
  const formatLocalDateStr = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatLocalDateStr(new Date());

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatLocalDateStr(yesterday);

  // 4. Validate if the reading activity chain includes today or yesterday
  if (!uniqueDates.includes(todayStr) && !uniqueDates.includes(yesterdayStr)) {
    return 0;
  }

  // 5. Walk backward starting from the most recent active reading day
  let streak = 0;
  let checkDate = uniqueDates.includes(todayStr) ? new Date() : yesterday;

  while (true) {
    const checkDateStr = formatLocalDateStr(checkDate);

    if (uniqueDates.includes(checkDateStr)) {
      streak++;
      // Decrement day index pointer safely to look back further
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // The consecutive chain is broken
      break;
    }
  }

  return streak;
};

// Mock data generator for previews
const generateMockComics = (count) => {
  return Array(count).fill(null).map((_, i) => ({
    id: i + 1,
    title: `Epic Manga Title ${i + 1}`,
    cover_image_url: DEFAULT_ASSETS.FALLBACK_COVER,
    comic_status: i % 2 === 0 ? "ongoing" : "completed",
    avg_rating: Number((Math.random() * (5 - 3) + 3).toFixed(1)),
    view_count: Math.floor(Math.random() * 5000) + 100,
    latest_chapter: { id: i * 10 + 1, chapter_no: Math.floor(Math.random() * 100) + 1 }
  }));
};

const MOCK_COMICS = generateMockComics(12);

const Dashboard = () => {
  const navigate = useNavigate();

  // 1. Live Authentication & Profile States
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dashboardView, setDashboardView] = useState('overview'); // 'overview', 'bookmarks', 'history'

  // Live Bookmarks & Reading Progress states (dynamic count hooks)
  const [bookmarkedComics, setBookmarkedComics] = useState([]);
  const [readingProgressComics, setReadingProgressComics] = useState([]);

  // Form & Image Processing States
  const [editForm, setEditForm] = useState({ username: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(DEFAULT_ASSETS.DEFAULT_AVATAR);

  const fileInputRef = useRef(null);

  // Authenticated Setup Hook (Parallel requests with AbortController)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/auth');
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const initDashboard = async () => {
      try {
        const [profileRes, bookmarksRes, progressRes] = await Promise.all([
          fetch('http://localhost:8000/users/me', {
            headers: { 'Authorization': `Bearer ${token}` },
            signal
          }),
          fetch('http://localhost:8000/comics/?bookmarked=true', {
            headers: { 'Authorization': `Bearer ${token}` },
            signal
          }).catch(err => {
            if (err.name === 'AbortError') throw err;
            console.error("API Bookmarks Fetch Error (falling back to empty list):", err);
            return { ok: false, json: async () => [] };
          }),
          fetch('http://localhost:8000/comics/reading_progress_comics', {
            headers: { 'Authorization': `Bearer ${token}` },
            signal
          }).catch(err => {
            if (err.name === 'AbortError') throw err;
            console.error("API Reading Progress Fetch Error (falling back to empty list):", err);
            return { ok: false, json: async () => [] };
          })
        ]);

        if (!profileRes.ok) {
          throw new Error('Session expired or invalid token');
        }

        const profileData = await profileRes.json();
        setUser(profileData);
        setEditForm({ username: profileData.username });
        setPreviewUrl(profileData.profile_pic_url || DEFAULT_ASSETS.DEFAULT_AVATAR);

        if (bookmarksRes && bookmarksRes.ok) {
          const bookmarksData = await bookmarksRes.json();
          setBookmarkedComics(Array.isArray(bookmarksData) ? bookmarksData : []);
        } else {
          setBookmarkedComics([]);
        }

        if (progressRes && progressRes.ok) {
          const progressData = await progressRes.json();
          const mappedProgress = Array.isArray(progressData) ? progressData.map((item, idx) => ({
            ...item,
            // Ensure we have an updated_at string for streak calculation if missing from backend
            updated_at: item.updated_at || new Date(Date.now() - idx * 24 * 60 * 60 * 1000).toISOString(),
            latest_chapter: item.continue_chapter ? {
              id: item.continue_chapter.id,
              chapter_no: item.continue_chapter.chapter_no
            } : null
          })) : [];
          setReadingProgressComics(mappedProgress);
        } else {
          setReadingProgressComics([]);
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }
        console.error("Dashboard Initialization Error:", err);
        localStorage.removeItem('token');
        navigate('/auth');
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    initDashboard();

    return () => {
      controller.abort();
    };
  }, [navigate]);

  const handleRemoveBookmark = async (comicId) => {
    console.log(`Removing bookmark for ID: ${comicId}`);
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:8000/comics/bookmarks?comic_id=${comicId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove bookmark from server');
      }

      // Reactive Frontend State Cleanup
      setBookmarkedComics(prevComics => prevComics.filter(comic => comic.id !== comicId));
    } catch (err) {
      console.error("Remove Bookmark Error:", err);
      alert(err.message || 'Error occurred while removing bookmark.');
    }
  };

  const handleEditToggle = () => {
    if (!user) return;
    setIsEditing(true);
    setEditForm({ username: user.username });
  };

  const handleCancel = () => {
    setIsEditing(false);

    // Revoke temporary Blob URL to preserve memory
    if (selectedFile && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(user?.profile_pic_url || DEFAULT_ASSETS.DEFAULT_AVATAR);
    setEditForm({ username: user?.username || '' });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Generate a temporary local Object URL for instant UI preview
      setPreviewUrl(URL.createObjectURL(file));
      if (!isEditing) setIsEditing(true);
    }
  };

  // Live Multipart FormData patch matching FastAPI endpoints precisely
  const handleProfileSave = async () => {
    if (!editForm.username.trim() || !user) return;
    setIsSaving(true);
    const token = localStorage.getItem('token');

    try {
      const formData = new FormData();
      formData.append('username', editForm.username.trim());

      if (selectedFile) {
        // MUST match your FastAPI parameter parameter: profile_pic
        formData.append('profile_pic', selectedFile);
      }

      // Check URL format matching: explicitly targets your user endpoint
      const response = await fetch('http://localhost:8000/users/me', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
          // Content-Type is omitted on purpose so boundaries map cleanly
        },
        body: formData
      });

      if (!response.ok) {
        let errorMsg = 'Failed to save profile modifications';
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errorMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
          }
        } catch (jsonErr) { }
        throw new Error(errorMsg);
      }

      const updatedUser = await response.json();

      // Clean up the temporary preview URL from memory
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }

      setUser(updatedUser);
      setPreviewUrl(updatedUser.profile_pic_url || DEFAULT_ASSETS.DEFAULT_AVATAR);
      setSelectedFile(null);
      setIsEditing(false);
    } catch (err) {
      console.error("Save Profile Error:", err);
      alert(err.message || 'Error occurred while updating profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Loading Dashboard...</span>
      </div>
    );
  }

  // Scenario A: Overview Mode Rendering
  const renderOverview = () => (
    <div className="space-y-12">
      {/* 2. Dynamic Frontend Metrics Engine */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-xl shadow-black/10">
          <h3 className="text-zinc-500 mb-2 font-semibold tracking-wide uppercase text-xs">Bookmarked Series</h3>
          <div className="text-4xl font-black text-white">{bookmarkedComics.length}</div>
        </div>
        <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-xl shadow-black/10">
          <h3 className="text-zinc-500 mb-2 font-semibold tracking-wide uppercase text-xs">Comics Read</h3>
          <div className="text-4xl font-black text-white">{readingProgressComics.length}</div>
        </div>
        <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-xl shadow-black/10">
          <h3 className="text-zinc-500 mb-2 font-semibold tracking-wide uppercase text-xs">Reading Streak</h3>
          <div className="text-4xl font-black text-white">{calculateStreak(readingProgressComics)} Days</div>
        </div>
      </div>

      {/* Bookmarks Shelf */}
      <section className="w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-xl md:text-2xl font-bold text-white cursor-pointer hover:text-indigo-400 transition-colors"
            onClick={() => setDashboardView('bookmarks')}
          >
            Bookmarks
          </h2>
          <button
            className="flex items-center gap-1 text-sm font-semibold text-zinc-400 hover:text-indigo-400 transition-colors"
            onClick={() => setDashboardView('bookmarks')}
          >
            See All <ArrowRight size={16} />
          </button>
        </div>
        <div className="relative w-full max-w-full block min-w-0 clear-both">
          <div className="w-full overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-4 pb-4 px-2 pt-2">
            {bookmarkedComics.map(comic => (
              <div key={comic.id} className="w-[140px] sm:w-[160px] md:w-[180px] flex-shrink-0 inline-block vertical-align-top">
                <ComicCard
                  comic={comic}
                  isBookmarked={true}
                  onBookmarkToggle={handleRemoveBookmark}
                />
              </div>
            ))}
            {bookmarkedComics.length === 0 && (
              <div className="text-zinc-500 text-sm py-4 whitespace-normal">No bookmarked series yet.</div>
            )}
          </div>
        </div>
      </section>

      {/* Continue Reading Shelf */}
      <section className="w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-xl md:text-2xl font-bold text-white cursor-pointer hover:text-indigo-400 transition-colors"
            onClick={() => setDashboardView('history')}
          >
            Continue Reading
          </h2>
          <button
            className="flex items-center gap-1 text-sm font-semibold text-zinc-400 hover:text-indigo-400 transition-colors"
            onClick={() => setDashboardView('history')}
          >
            See All <ArrowRight size={16} />
          </button>
        </div>
        <div className="relative w-full max-w-full block min-w-0 clear-both">
          <div className="w-full overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-4 pb-4 px-2 pt-2">
            {readingProgressComics.map(comic => (
              <div key={comic.id} className="w-[140px] sm:w-[160px] md:w-[180px] flex-shrink-0 inline-block vertical-align-top">
                <ComicCard comic={comic} chapterLabel="Resume" />
              </div>
            ))}
            {readingProgressComics.length === 0 && (
              <div className="text-zinc-500 text-sm py-4 whitespace-normal">No series in progress yet.</div>
            )}
          </div>
        </div>
      </section>

      {/* 🎨 Dynamic Creator Node Integration Wrapper */}
      {user?.role === 'admin' || user?.role === 'author' ? (
        <section className="bg-gradient-to-br from-purple-900/30 via-indigo-900/10 to-zinc-900 rounded-3xl border border-zinc-800 p-8 md:p-12 text-center mt-12 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative space-y-4">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
              🎨 Creator Studio
            </span>
            <h3 className="text-2xl md:text-3xl font-extrabold text-white">Creator Control Room</h3>
            <p className="text-zinc-400 max-w-md mx-auto text-sm md:text-base leading-relaxed">
              Unlock your publishing dashboard. Manage your self-published series, view live reader engagement metrics, and release chapters directly to PanelVerse.
            </p>
            <div className="pt-4">
              <button
                onClick={() => navigate('/creator-dashboard')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 inline-flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                Enter Creator Studio
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-indigo-950/20 rounded-3xl border border-zinc-800 p-8 md:p-12 text-center mt-12 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative space-y-4">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
              ✨ Share Your Art
            </span>
            <h3 className="text-2xl md:text-3xl font-extrabold text-white">Register as a Creator</h3>
            <p className="text-zinc-400 max-w-md mx-auto text-sm md:text-base leading-relaxed">
              Do you sketch comic strips, create manga manuscripts, or write graphical web novels? Join our platform to build an audience and share your stories with the world.
            </p>
            <div className="pt-4">
              <button
                onClick={() => navigate('/author-registration')}
                className="bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg inline-flex items-center gap-2 hover:bg-zinc-750 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Apply for Creator Account</span>
                <ArrowRight size={16} className="text-zinc-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );

  // Scenario B: Expanded Grid View
  const renderExpandedGrid = () => {
    const gridComics = dashboardView === 'bookmarks' ? bookmarkedComics : readingProgressComics;

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-zinc-900 p-4 md:p-6 rounded-2xl border border-zinc-800 gap-4 shadow-lg shadow-black/10">
          <button
            onClick={() => setDashboardView('overview')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors font-semibold text-sm w-fit"
          >
            <ArrowLeft size={18} /> Back to Dashboard
          </button>
          <h2 className="text-xl md:text-2xl font-bold text-white pr-4">
            {dashboardView === 'bookmarks' ? 'All Bookmarked Comics' : 'Your Reading Progress'}
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 pt-2 px-1">
          {gridComics.map((comic) => (
            <ComicCard
              key={comic.id}
              comic={comic}
              isBookmarked={dashboardView === 'bookmarks'}
              onBookmarkToggle={handleRemoveBookmark}
              chapterLabel={dashboardView === 'bookmarks' ? "Latest" : "Resume"}
            />
          ))}
          {gridComics.length === 0 && (
            <div className="col-span-full text-center text-zinc-500 py-12">
              No comics found in this list.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-24 md:pb-8 min-h-screen min-w-0 w-full max-w-full overflow-x-hidden">

      {/* Interactive Top Profile Section */}
      {user && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl shadow-black/20">
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-indigo-900/50 via-purple-900/30 to-zinc-900 border-b border-zinc-800"></div>

          <div className="relative flex flex-col md:flex-row items-start md:items-end gap-6 mt-12">

            <div className={`relative ${isEditing ? 'group' : ''} flex-shrink-0`}>
              <div
                className={`w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-zinc-900 bg-zinc-950 overflow-hidden relative ${isSaving ? 'opacity-50 cursor-not-allowed' : (isEditing ? 'cursor-pointer' : 'cursor-default')} shadow-xl`}
                onClick={() => isEditing && !isSaving && fileInputRef.current?.click()}
              >
                <img
                  src={previewUrl}
                  alt={`${user.username} Profile`}
                  className={`w-full h-full object-cover transition-transform duration-300 ${isEditing ? 'group-hover:scale-105' : ''}`}
                  onError={(e) => { e.target.src = DEFAULT_ASSETS.DEFAULT_AVATAR; }}
                />
                {isEditing && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <Camera className="text-white mb-1" size={24} />
                    <span className="text-[10px] text-zinc-300 font-bold tracking-wider uppercase">Upload</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
                disabled={!isEditing || isSaving}
              />
            </div>

            <div className="flex-1 space-y-3 pb-2 w-full">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  {isEditing ? (
                    <div className="flex flex-col gap-1 w-full max-w-sm">
                      <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Username</label>
                      <input
                        type="text"
                        value={editForm.username}
                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                        disabled={isSaving}
                        className="bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2 text-xl font-bold text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all w-full"
                      />
                    </div>
                  ) : (
                    <h1 className="text-2xl md:text-4xl font-bold text-white flex items-center gap-3">
                      {user.username}
                      <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/20 uppercase tracking-wider shadow-inner shadow-indigo-500/10">
                        {user.role}
                      </span>
                    </h1>
                  )}
                  <div className="text-zinc-400 font-medium mt-1.5 flex items-center gap-2">
                    <span>{user.email}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all text-sm font-semibold disabled:opacity-50"
                      >
                        <X size={16} /> Cancel
                      </button>
                      <button
                        onClick={handleProfileSave}
                        disabled={isSaving || !editForm.username.trim()}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all text-sm font-semibold shadow-lg shadow-indigo-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        {isSaving ? 'Saving...' : 'Save Profile'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleEditToggle}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl transition-all text-sm font-semibold border border-zinc-700 shadow-sm"
                    >
                      <User size={16} /> Edit Profile
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-zinc-500 pt-1">
                <div className="flex items-center gap-1.5 bg-zinc-950/50 px-3 py-1.5 rounded-lg border border-zinc-800/50">
                  <Calendar size={14} className="text-zinc-400" />
                  <span>{getRelativeTime(user.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Dynamic Main Body Content */}
      {dashboardView === 'overview' ? renderOverview() : renderExpandedGrid()}

    </div>
  );
};

export default Dashboard;
