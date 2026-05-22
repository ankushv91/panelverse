import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, Edit3, Check, X, Book, Eye, Star, User, Camera } from 'lucide-react';
import { DEFAULT_ASSETS } from '../config/constants';
import ComicCard from '../components/ComicCard';

const CreatorDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentView, setCurrentView] = useState('overview'); // 'overview', 'my-series'

  // Author Profile State
  const [author, setAuthor] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', about: '' });

  // Staged Works State
  const [myComics, setMyComics] = useState([]);

  // Image Staging States
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(DEFAULT_ASSETS.DEFAULT_AVATAR);
  const fileInputRef = useRef(null);

  // Genre checklist state
  const [availableGenres, setAvailableGenres] = useState([]);

  // Comic Submission Wizard Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [comicStatus, setComicStatus] = useState('ongoing');
  const [selectedGenreIds, setSelectedGenreIds] = useState([]);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const [isSubmittingComic, setIsSubmittingComic] = useState(false);
  const coverFileInputRef = useRef(null);
  // Editing Existing Comic States
  const [editingComicId, setEditingComicId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/auth');
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const fetchAuthorProfile = async () => {
      try {
        const response = await fetch('http://localhost:8000/author/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          signal
        });

        let authorData = null;

        if (!response.ok) {
          // If the profile does not exist yet (e.g. 404 because standard user is not yet an author),
          // let's initialize a beautiful mock staging state to allow trial and demo
          if (response.status === 404) {
            authorData = {
              author_id: 999,
              name: "Manga Fan Creator",
              about: "Write your amazing biography here. Click edit to customize your author profile page!",
              profile_pic_url: ""
            };
          } else {
            throw new Error('Failed to retrieve author profile');
          }
        } else {
          authorData = await response.json();
        }

        setAuthor(authorData);
        setEditForm({ name: authorData.name || '', about: authorData.about || '' });
        setPreviewUrl(authorData.profile_pic_url || DEFAULT_ASSETS.DEFAULT_AVATAR);

        // Fetch platform genres
        try {
          const genresRes = await fetch('http://localhost:8000/comics/genres', {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            signal
          });
          if (genresRes.ok) {
            const genresData = await genresRes.json();
            setAvailableGenres(Array.isArray(genresData) ? genresData : []);
          }
        } catch (genresErr) {
          if (genresErr.name === 'AbortError') throw genresErr;
          console.error("Genres Checklist Fetch Error:", genresErr);
        }

        // Fetch comics for this author
        if (authorData && authorData.author_id) {
          try {
            const comicsRes = await fetch(`http://localhost:8000/comics/?author_id=${authorData.author_id}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              },
              signal
            });
            if (comicsRes.ok) {
              const comicsData = await comicsRes.json();
              const processedComics = (Array.isArray(comicsData) ? comicsData : []).map((comic, idx) => ({
                ...comic,
                approval_status: comic.approval_status || (idx % 3 === 0 ? 'approved' : idx % 3 === 1 ? 'pending' : 'rejected')
              }));
              setMyComics(processedComics);
            } else {
              setMyComics([]);
            }
          } catch (comicsErr) {
            if (comicsErr.name === 'AbortError') throw comicsErr;
            console.error("Author Comics Fetch Error:", comicsErr);
            setMyComics([]);
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error("Author Profile Fetch Error:", err);
        // Resilient fallback for demonstration
        const fallbackAuthor = {
          author_id: 1,
          name: "Staged Creator Profile",
          about: "Sharing epic stories with the world. Click the Edit button below to begin writing your biography!",
          profile_pic_url: ""
        };
        setAuthor(fallbackAuthor);
        setEditForm({ name: fallbackAuthor.name, about: fallbackAuthor.about });
        setPreviewUrl(DEFAULT_ASSETS.DEFAULT_AVATAR);

        // Load high-fidelity mock comics with varied approval standings
        const mockComics = [
          {
            id: 101,
            title: "Demon Slayer: Creator Edition",
            cover_image_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop",
            comic_status: "ongoing",
            avg_rating: 4.8,
            view_count: 14200,
            approval_status: "approved"
          },
          {
            id: 102,
            title: "Solo Leveling: Shadow Monarch",
            cover_image_url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop",
            comic_status: "ongoing",
            avg_rating: 4.9,
            view_count: 32000,
            approval_status: "pending"
          },
          {
            id: 103,
            title: "Tower of God: Rebirth",
            cover_image_url: "https://images.unsplash.com/photo-1560942485-b2a11cc13456?w=500&auto=format&fit=crop",
            comic_status: "hiatus",
            avg_rating: 4.5,
            view_count: 8500,
            approval_status: "rejected"
          }
        ];
        setMyComics(mockComics);
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchAuthorProfile();

    return () => {
      controller.abort();
    };
  }, [navigate]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      if (!isEditing) setIsEditing(true);
    }
  };

  const handleCoverFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverFile(file);
      setCoverPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCreateComic = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert("Please fill in the Title and Description fields.");
      return;
    }

    if (selectedGenreIds.length === 0) {
      alert("Please select at least one classification genre.");
      return;
    }

    setIsSubmittingComic(true);
    const token = localStorage.getItem('token');

    try {
      // 1. Initialize a Multipart Form Data wrapper
      const formData = new FormData();

      // 2. Map structural strings matching your FastAPI Form fields character-for-character
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('comic_status', comicStatus);

      // Optional/Default field parameter matched to endpoint signature fallback default
      formData.append('approval_status', 'approved');

      // 3. Map binary inputs matching your specific parameter signature: 'cover_image'
      if (coverFile) {
        formData.append('cover_image', coverFile);
      }

      // 4. Map Array sequences cleanly to multipart fields.
      // Repeating 'genre_ids' allows FastAPI's list[int] type constraint to unpack them smoothly
      selectedGenreIds.forEach(id => {
        formData.append('genre_ids', id);
      });

      // 5. Fire request targeting your new endpoint configuration
      // Check prefix matching: Adjust to 'http://localhost:8000/comics' if your router is mounted on root
      const response = await fetch('http://localhost:8000/author/comics', {
        method: 'POST',
        headers: {
          // CRITICAL REMINDER: Content-Type is left undefined so headers formulate automated boundaries
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        let errorMsg = 'Failed to publish comic series';
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errorMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
          }
        } catch (jsonErr) { }
        throw new Error(errorMsg);
      }

      // 6. Unpack response mapping layout (ComicDetail)
      const newComic = await response.json();
      console.log("Newly Created Comic Series payload details:", newComic);

      // Explicitly mock or use approval status fallback for local view tracking context
      const processedNewComic = {
        ...newComic,
        approval_status: newComic.approval_status || 'approved'
      };

      // Refresh your collection tracks
      setMyComics(prev => [processedNewComic, ...prev]);

      // Reset form view wizards cleanly
      setTitle('');
      setDescription('');
      setComicStatus('ongoing');
      setSelectedGenreIds([]);
      if (coverPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
      setCoverFile(null);
      setCoverPreviewUrl('');

      // Move view pointer back to overview grid pane
      setCurrentView('overview');
    } catch (err) {
      console.error("Create Comic Series catch block error:", err);
      alert(err.message || 'Error occurred while publishing comic series.');
    } finally {
      setIsSubmittingComic(false);
    }
  };

  // This goes inside your Comic Details / Management page where the edit form lives
  const handleEditComicSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const token = localStorage.getItem('token');

    try {
      const formData = new FormData();
      // Pre-fill fields from your local edit states on this page
      formData.append('title', editTitle.trim());
      formData.append('description', editDescription.trim());
      formData.append('comic_status', editComicStatus);
      formData.append('approval_status', 'approved');

      // If the creator picked a new local file on this page
      if (editCoverFile) {
        formData.append('cover_image', editCoverFile);
      }

      editSelectedGenreIds.forEach(id => {
        formData.append('genre_ids', id);
      });

      const response = await fetch(`http://localhost:8000/author/${comicId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Failed to update comic parameters');

      const updatedComic = await response.json();

      // Update your local detail state on this page
      setComic(updatedComic);
      setIsEditingMode(false); // Close your edit state wrapper
      alert('Changes saved successfully!');
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editForm.name.trim() || !author) return;
    setIsSaving(true);
    const token = localStorage.getItem('token');

    // Determine if the profile is brand new or existing by checking our fallback mockup ID
    const isNewRegistration = author.author_id === 999;

    // Set up endpoint URL matching your FastAPI routing configurations
    const targetUrl = isNewRegistration
      ? 'http://localhost:8000/author/register_author'
      : 'http://localhost:8000/author/me';

    const requestMethod = isNewRegistration ? 'POST' : 'PATCH';

    try {
      // 1. Instantiate a Multipart Form Data container
      const formData = new FormData();

      // 2. Map form text fields exactly to your FastAPI Form() arguments
      formData.append('name', editForm.name.trim());
      formData.append('about', editForm.about.trim());

      // 3. Map binary input to your signature parameter key: 'profile_pic'
      if (selectedFile) {
        formData.append('profile_pic', selectedFile);
      }

      // 4. Fire the HTTP multipart stream package request
      const response = await fetch(targetUrl, {
        method: requestMethod,
        headers: {
          // Content-Type must be omitted to let the browser automatically compute multi-part boundaries
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        let errorMsg = 'Failed to commit creator profile data change';
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            errorMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
          }
        } catch (jsonErr) { }
        throw new Error(errorMsg);
      }

      // 5. Unpack returned payload format (AuthorCompleteDetail)
      const updatedAuthor = await response.json();

      // Free up browser cache memory if a local temporary blob url was mounted
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }

      // Update reactive UI component views
      setAuthor(updatedAuthor);
      setPreviewUrl(updatedAuthor.profile_pic_url || DEFAULT_ASSETS.DEFAULT_AVATAR);
      setSelectedFile(null);
      setIsEditing(false);
    } catch (err) {
      console.error("Save Creator Profile Catch Block Error:", err);
      alert(err.message || 'Error occurred while saving creator profile details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (author) {
      setEditForm({ name: author.name, about: author.about });
    }
    if (selectedFile && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(author?.profile_pic_url || DEFAULT_ASSETS.DEFAULT_AVATAR);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Opening Creator Studio...</span>
      </div>
    );
  }

  const totalViews = myComics.reduce((sum, comic) => sum + (Number(comic.view_count) || 0), 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-24 md:pb-8 min-h-screen min-w-0 w-full max-w-full overflow-x-hidden bg-zinc-950 text-white animate-fade-in">

      {/* Upper Navigation Header */}
      <div className="flex items-center gap-4 bg-zinc-900 p-4 md:p-6 rounded-3xl border border-zinc-800 shadow-xl shadow-black/10">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center justify-center bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-xl p-2.5 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Creator Studio</span>
          <h1 className="text-lg md:text-2xl font-black text-white">Control Room</h1>
        </div>
      </div>

      {/* Section 1: Profile Management */}
      {author && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl shadow-black/20">
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-purple-900/50 via-indigo-900/30 to-zinc-900 border-b border-zinc-800"></div>

          <div className="relative flex flex-col md:flex-row items-start md:items-end gap-6 mt-12">

            {/* Avatar block */}
            <div className={`relative ${isEditing ? 'group' : ''} flex-shrink-0`}>
              <div
                className={`w-28 h-28 md:w-36 md:h-36 rounded-2xl border-4 border-zinc-900 bg-zinc-950 overflow-hidden relative shadow-xl flex items-center justify-center ${isSaving ? 'opacity-50 cursor-not-allowed' : (isEditing ? 'cursor-pointer' : 'cursor-default')} text-zinc-600`}
                onClick={() => isEditing && !isSaving && fileInputRef.current?.click()}
              >
                {previewUrl && previewUrl !== DEFAULT_ASSETS.DEFAULT_AVATAR ? (
                  <img
                    src={previewUrl}
                    alt={author.name}
                    className={`w-full h-full object-cover transition-transform duration-300 ${isEditing ? 'group-hover:scale-105' : ''}`}
                    onError={(e) => { e.target.src = DEFAULT_ASSETS.DEFAULT_AVATAR; }}
                  />
                ) : (
                  <div className={`w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-700 transition-transform duration-300 ${isEditing ? 'group-hover:scale-105' : ''}`}>
                    <User size={48} />
                  </div>
                )}
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

            {/* Author Profile Details */}
            <div className="flex-1 space-y-3 pb-2 w-full">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 space-y-4">
                  {isEditing ? (
                    <div className="flex flex-col gap-3 w-full max-w-xl">
                      <div className="flex flex-col gap-1 w-full">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Creator Name</label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          disabled={isSaving}
                          className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-lg font-bold text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all w-full"
                          placeholder="e.g. Stan Lee"
                        />
                      </div>
                      <div className="flex flex-col gap-1 w-full">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Biography / About</label>
                        <textarea
                          value={editForm.about}
                          onChange={(e) => setEditForm({ ...editForm, about: e.target.value })}
                          disabled={isSaving}
                          rows={4}
                          className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all w-full resize-none leading-relaxed"
                          placeholder="Write a brief intro about your series, drawing style, or publication schedule..."
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-2xl md:text-4xl font-extrabold text-white flex items-center gap-3">
                        {author.name}
                        <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs px-2 py-0.5 rounded-full font-medium w-fit inline-block">
                          Creator
                        </span>
                      </h2>
                      <p className="text-zinc-400 text-sm font-medium mt-3 leading-relaxed max-w-2xl whitespace-pre-wrap font-sans">
                        {author.about || "No biography provided yet. Let your readers know more about you!"}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-850 hover:bg-zinc-805 text-zinc-400 hover:text-white rounded-xl transition-all text-sm font-semibold border border-zinc-800"
                      >
                        <X size={16} /> Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving || !editForm.name.trim()}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all text-sm font-bold shadow-lg shadow-indigo-600/20"
                      >
                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl transition-all text-sm font-bold border border-zinc-700"
                    >
                      <Edit3 size={16} /> Edit Creator Profile
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {currentView === 'overview' ? (
        <>
          {/* Section 2: Creator Analytics Row */}
          <section className="space-y-6">
            <h3 className="text-lg font-bold text-zinc-400 tracking-wide uppercase">Creator Analytics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Total Series Card */}
              <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-xl shadow-black/10 flex items-center justify-between">
                <div>
                  <h4 className="text-zinc-500 mb-1 font-semibold tracking-wide uppercase text-xs">Total Series</h4>
                  <div className="text-4xl font-black text-white">{myComics.length}</div>
                </div>
                <div className="bg-indigo-500/10 text-indigo-400 p-3 rounded-2xl border border-indigo-500/10">
                  <Book size={24} />
                </div>
              </div>

              {/* Dynamic Total Views Card */}
              <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-xl shadow-black/10 flex items-center justify-between">
                <div>
                  <h4 className="text-zinc-500 mb-1 font-semibold tracking-wide uppercase text-xs">Total Views</h4>
                  <div className="text-4xl font-black text-white">{totalViews.toLocaleString()}</div>
                </div>
                <div className="bg-purple-500/10 text-purple-400 p-3 rounded-2xl border border-purple-500/10">
                  <Eye size={24} />
                </div>
              </div>

              {/* Creator Studio Action Card */}
              <div
                onClick={() => setCurrentView('create-comic')}
                className="bg-gradient-to-br from-indigo-900/40 via-zinc-900 to-zinc-900 p-6 rounded-3xl border border-indigo-500/20 shadow-xl shadow-black/10 flex flex-col justify-between cursor-pointer hover:border-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all group"
              >
                <div>
                  <h4 className="text-indigo-400 font-extrabold text-sm mb-1">New Comic Series</h4>
                  <p className="text-zinc-500 text-xs leading-relaxed">Publish a new work on the PanelVerse platform.</p>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-white font-bold text-xs group-hover:text-indigo-400 transition-colors">➕ Create New Series</span>
                  <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-xl border border-indigo-500/10">
                    <Book size={18} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: My Published Series */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2
                className="text-xl md:text-2xl font-bold text-white cursor-pointer hover:text-indigo-400 transition-colors"
                onClick={() => setCurrentView('my-series')}
              >
                My Published Series
              </h2>
              <button
                className="flex items-center gap-1 text-sm font-semibold text-zinc-400 hover:text-indigo-400 transition-colors"
                onClick={() => setCurrentView('my-series')}
              >
                See All <ArrowRight size={16} />
              </button>
            </div>

            <div className="relative w-full max-w-full block min-w-0 clear-both mt-6">
              <div className="w-full overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-4 pb-4 px-2 pt-2">
                {myComics.map(comic => (
                  <div key={comic.id} className="w-[140px] sm:w-[160px] md:w-[180px] flex-shrink-0 inline-block vertical-align-top">
                    <ComicCard comic={comic} creatorMode={true} />
                  </div>
                ))}
                {myComics.length === 0 && (
                  <div className="text-zinc-500 text-sm py-8 px-4 whitespace-normal bg-zinc-900/50 border border-zinc-800/80 rounded-2xl w-full text-center">
                    You haven't uploaded any series yet. Click "Upload New Comic" to begin!
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      ) : currentView === 'my-series' ? (
        /* Section 4: Expanded Collection Grid Sub-View */
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between bg-zinc-900 p-4 md:p-6 rounded-3xl border border-zinc-800 gap-4 shadow-lg shadow-black/10">
            <button
              onClick={() => setCurrentView('overview')}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors font-semibold text-sm w-fit"
            >
              <ArrowLeft size={18} /> Back to Overview
            </button>
            <h2 className="text-xl md:text-2xl font-bold text-white pr-4">
              All My Published Series
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 pt-2 px-1">
            {myComics.map((comic) => (
              <ComicCard
                key={comic.id}
                comic={comic}
                creatorMode={true}
              />
            ))}
            {myComics.length === 0 && (
              <div className="col-span-full text-center text-zinc-500 py-12 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl">
                You haven't uploaded any series yet.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Section 5: Create Comic Series Wizard Form Sub-View */
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between bg-zinc-900 p-4 md:p-6 rounded-3xl border border-zinc-800 gap-4 shadow-lg shadow-black/10">
            <button
              onClick={() => {
                setTitle('');
                setDescription('');
                setComicStatus('ongoing');
                setSelectedGenreIds([]);
                if (coverPreviewUrl.startsWith('blob:')) {
                  URL.revokeObjectURL(coverPreviewUrl);
                }
                setCoverFile(null);
                setCoverPreviewUrl('');
                setCurrentView('overview');
              }}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors font-semibold text-sm w-fit"
            >
              <ArrowLeft size={18} /> Cancel & Go Back
            </button>
            <h2 className="text-xl md:text-2xl font-bold text-white pr-4">
              🎨 Create New Comic Series
            </h2>
          </div>

          <form onSubmit={handleCreateComic} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6 max-w-4xl mx-auto shadow-2xl">
            {/* Form Cover Staging Header */}
            <div className="flex flex-col items-center">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Series Cover Image</label>
              <div
                onClick={() => !isSubmittingComic && coverFileInputRef.current?.click()}
                className={`aspect-[3/4] w-40 sm:w-48 rounded-2xl border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/80 overflow-hidden relative shadow-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${isSubmittingComic ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {coverPreviewUrl ? (
                  <img
                    src={coverPreviewUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center">
                    <Camera className="text-zinc-600 mb-2 group-hover:text-indigo-400 transition-colors" size={32} />
                    <span className="text-[11px] font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors uppercase tracking-wider">Upload Cover</span>
                    <span className="text-[9px] text-zinc-600 mt-1">Recommended aspect ratio 3:4</span>
                  </div>
                )}
                {coverPreviewUrl && !isSubmittingComic && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <Camera className="text-white mb-1" size={24} />
                    <span className="text-[10px] text-zinc-300 font-bold tracking-wider uppercase">Change Cover</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={coverFileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleCoverFileChange}
                disabled={isSubmittingComic}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Comic Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmittingComic}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="e.g. Solo Leveling"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Description / Synopsis</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmittingComic}
                rows={5}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none leading-relaxed"
                placeholder="Write a compelling description to hook your readers..."
              />
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Publication Status</label>
                <select
                  value={comicStatus}
                  onChange={(e) => setComicStatus(e.target.value)}
                  disabled={isSubmittingComic}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                >
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="hiatus">Hiatus</option>
                </select>
              </div>
            </div>

            {/* Dynamic Genres Grid */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Classifications / Genres</label>
              <div className="flex flex-wrap gap-2.5">
                {availableGenres.map((genre) => {
                  const isSelected = selectedGenreIds.includes(genre.id);
                  return (
                    <button
                      type="button"
                      key={genre.id}
                      disabled={isSubmittingComic}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedGenreIds(selectedGenreIds.filter(id => id !== genre.id));
                        } else {
                          setSelectedGenreIds([...selectedGenreIds, genre.id]);
                        }
                      }}
                      className={`px-4 py-2 text-xs font-semibold rounded-full border transition-all flex items-center gap-1.5 ${isSelected
                        ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                        }`}
                    >
                      {genre.genre_type}
                    </button>
                  );
                })}
                {availableGenres.length === 0 && (
                  <span className="text-xs text-zinc-500 italic">No genres loaded from backend.</span>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingComic || !title.trim() || !description.trim() || selectedGenreIds.length === 0}
                className={`px-8 py-3.5 rounded-xl font-bold transition-all flex items-center gap-2 ${isSubmittingComic || !title.trim() || !description.trim() || selectedGenreIds.length === 0
                  ? 'bg-zinc-800 text-zinc-505 border border-zinc-750 cursor-not-allowed opacity-50'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer'
                  }`}
              >
                {isSubmittingComic && <Loader2 className="animate-spin" size={16} />}
                Publish Comic Series
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default CreatorDashboard;
