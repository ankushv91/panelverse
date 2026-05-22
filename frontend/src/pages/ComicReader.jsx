import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Settings, Loader2, AlertCircle, ImageIcon } from 'lucide-react';
import { apiFetch } from '../lib/api/api';

const ComicReader = () => {
  const { chapterId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const incomingComicId = location.state?.comicId;

  const [manifest, setManifest] = useState(null);
  const [chaptersList, setChaptersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Core pointers for adjacent chapter navigation
  const [prevChapterId, setPrevChapterId] = useState(null);
  const [nextChapterId, setNextChapterId] = useState(null);

  // 1. Existing Hook: Loads manifest layout coordinates and chronological chapter lists
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const loadReaderData = async () => {
      try {
        // Fetch current page layout manifest
        const queryParam = incomingComicId ? `?comic_id=${incomingComicId}` : '';
        const pageData = await apiFetch(`/comics/${chapterId}/pages${queryParam}`);

        if (!isMounted) return;
        setManifest(pageData);

        // Determine target comic ID context (fallback to API value if state wasn't provided)
        const activeComicId = incomingComicId || pageData.comic_id;

        if (activeComicId) {
          // Fetch all chapters associated with this comic to map adjacent nodes
          const trackingData = await apiFetch(`/comics/${activeComicId}/chapters`);

          if (isMounted && Array.isArray(trackingData)) {
            setChaptersList(trackingData);

            // Sort chapters chronologically by chapter_no
            const chronologicalChapters = [...trackingData].sort(
              (a, b) => Number(a.chapter_no) - Number(b.chapter_no)
            );

            // Locate where our active chapter sits in the array hierarchy
            const currentIdx = chronologicalChapters.findIndex(
              (ch) => Number(ch.id) === Number(chapterId)
            );

            if (currentIdx !== -1) {
              setPrevChapterId(currentIdx > 0 ? chronologicalChapters[currentIdx - 1].id : null);
              setNextChapterId(currentIdx < chronologicalChapters.length - 1 ? chronologicalChapters[currentIdx + 1].id : null);
            }
          }
        }

        if (isMounted) setIsLoading(false);
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to sync content nodes');
          setIsLoading(false);
        }
      }
    };

    if (chapterId) {
      loadReaderData();
    }

    return () => {
      isMounted = false;
    };
  }, [chapterId, incomingComicId]);

  // 2. NEW Hook: Fires the reading progress upsert once data loading concludes successfully
  useEffect(() => {
    if (isLoading || error || !manifest) return;

    const recordInitialReadingProgress = async () => {
      const targetComicId = Number(manifest.comic_id || incomingComicId);
      const targetChapterId = Number(chapterId);

      // Look for the lowest numerical page index value to initialize the step counter safely
      const sortedPages = Array.isArray(manifest.pages) ? [...manifest.pages].sort((a, b) => a.page_no - b.page_no) : [];
      const targetPageId = sortedPages.length > 0 ? Number(sortedPages[0].page_no) : 1;

      try {
        await apiFetch(`/comics/reading_progress/${targetComicId}/${targetChapterId}/${targetPageId}`, {
          method: 'PUT',
          body: JSON.stringify({
            comic_id: targetComicId,
            chapter_id: targetChapterId,
            page_id: targetPageId
          })
        });
        console.log(`[Tracking] Reading progress synchronized for Comic #${targetComicId}, Chapter #${targetChapterId}`);
      } catch (err) {
        // Silently handle tracking errors so logging infrastructure issues don't impact the core presentation viewport
        console.error('[Tracking] Failed to sync progress indicators with cloud buffer:', err.message);
      }
    };

    recordInitialReadingProgress();
  }, [isLoading, error, manifest, chapterId, incomingComicId]);

  // Handler execution updates view context while keeping target parent identifier state bound
  const navigateToChapter = (targetId) => {
    if (!targetId) return;
    navigate(`/read/${targetId}`, {
      state: { comicId: incomingComicId || manifest?.comic_id }
    });
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white gap-3">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
        <span className="text-sm font-bold tracking-widest uppercase text-zinc-500">Decrypting Pages...</span>
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <div className="w-full min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-6">
          <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center mx-auto text-red-400">
            <AlertCircle size={24} />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold">Failed to Load Content</h2>
            <p className="text-xs text-zinc-500 leading-relaxed">{error || 'This resource node is unavailable.'}</p>
          </div>
          <Link to="/" className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors w-full">
            Return to Index
          </Link>
        </div>
      </div>
    );
  }

  const pagesList = Array.isArray(manifest.pages) ? manifest.pages : [];

  return (
    <div className="h-full min-h-screen flex flex-col bg-[#0a0a0a] text-white select-none">

      <header className="h-16 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            to={`/comics/${manifest.comic_id || incomingComicId || ''}`}
            className="text-zinc-400 hover:text-white transition-colors flex-shrink-0"
          >
            <ChevronLeft size={24} />
          </Link>
          <div className="min-w-0">
            <h1 className="font-bold text-sm text-zinc-100 truncate tracking-tight">
              {manifest.comic_title || 'Untitled Series'}
            </h1>
            <p className="text-[11px] font-semibold text-indigo-400 tracking-wider uppercase">
              Chapter {manifest.chapter_no} {manifest.chapter_name ? `• ${manifest.chapter_name}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <button className="text-zinc-500 hover:text-white transition-colors">
            <Settings size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto w-full flex flex-col items-center py-6 gap-6 bg-zinc-950/40">
        {pagesList.length === 0 ? (
          <div className="w-full max-w-3xl border border-dashed border-zinc-800 rounded-2xl p-16 text-center text-zinc-600 space-y-2 my-12">
            <ImageIcon size={40} className="mx-auto opacity-30 mb-2" />
            <h3 className="text-sm font-bold text-zinc-400">Chapter is Empty</h3>
            <p className="text-xs text-zinc-600 max-w-xs mx-auto leading-relaxed">No graphic content pages have been synchronized with this asset index file yet.</p>
          </div>
        ) : (
          pagesList
            .sort((a, b) => a.page_no - b.page_no)
            .map((page, index) => (
              <PageElement key={page.id || index} page={page} totalCount={pagesList.length} />
            ))
        )}

        <div className="w-full max-w-2xl flex justify-between mt-12 py-8 border-t border-zinc-900 px-4">
          <button
            onClick={() => navigateToChapter(prevChapterId)}
            disabled={!prevChapterId}
            className="flex items-center gap-2 text-zinc-400 hover:text-white disabled:hover:text-zinc-500 transition-colors px-5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} /> Previous Chapter
          </button>

          <button
            onClick={() => navigateToChapter(nextChapterId)}
            disabled={!nextChapterId}
            className="flex items-center gap-2 text-zinc-400 hover:text-white disabled:hover:text-zinc-500 transition-colors px-5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold disabled:opacity-20 disabled:cursor-not-allowed"
          >
            Next Chapter <ChevronRight size={16} />
          </button>
        </div>
      </main>

    </div>
  );
};

const PageElement = ({ page, totalCount }) => {
  const [broken, setBroken] = useState(false);

  return (
    <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-900 shadow-2xl relative overflow-hidden group">
      {!broken && page.image_url ? (
        <img
          src={page.image_url}
          alt={`Page ${page.page_no}`}
          className="w-full h-auto object-contain block select-none pointer-events-none"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="w-full aspect-[2/3] flex flex-col items-center justify-center bg-zinc-900/50 text-zinc-700 gap-2 p-6 text-center">
          <ImageIcon size={36} className="opacity-40 animate-pulse text-indigo-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Asset Load Error</span>
          <p className="text-[10px] text-zinc-600 max-w-xs">Unable to map content vector parameters for image stream index reference #{page.page_no}.</p>
        </div>
      )}

      <div className="absolute bottom-3 right-3 bg-zinc-950/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold text-zinc-500 border border-zinc-800 tracking-wider shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        PAGE {page.page_no} / {totalCount}
      </div>
    </div>
  );
};

export default ComicReader;