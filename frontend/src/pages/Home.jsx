import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { apiFetch } from '../lib/api/api';
import ComicCard from '../components/ComicCard';

const Home = () => {
  const [comics, setComics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const fetchAllComics = async () => {
      try {
        const data = await apiFetch('/comics/');
        if (isMounted) {
          setComics(Array.isArray(data) ? data : []);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load catalog');
          setIsLoading(false);
        }
      }
    };

    fetchAllComics();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="w-full min-h-screen p-8 text-white bg-zinc-950">
      <div className="w-full max-w-7xl mx-auto space-y-10">

        <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800/80 mb-8 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
          <h2 className="text-xl font-bold mb-4 text-indigo-400 flex items-center gap-2">
            <span>Search & Filters</span>
          </h2>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search comics..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50 transition-all placeholder:text-zinc-600"
              disabled
            />
            <button className="bg-zinc-900 text-zinc-500 border border-zinc-800 px-6 py-3 rounded-xl text-sm font-semibold transition-colors disabled:cursor-not-allowed" disabled>
              Filters
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <Sparkles size={22} className="text-indigo-400" />
              <span>Discover Series</span>
            </h2>
            {!isLoading && comics.length > 0 && (
              <span className="text-xs font-bold tracking-wider text-zinc-500 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800/65 uppercase">
                {comics.length} titles available
              </span>
            )}
          </div>

          {isLoading && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 animate-pulse">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-2 space-y-4">
                  <div className="aspect-[3/4] bg-zinc-900 rounded-lg w-full" />
                  <div className="space-y-2 px-1">
                    <div className="h-4 bg-zinc-900 rounded w-5/6" />
                    <div className="h-3 bg-zinc-900 rounded w-1/2" />
                  </div>
                  <div className="h-8 bg-zinc-900/60 rounded-lg w-full" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-start gap-3 max-w-xl mx-auto my-12">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-red-400">Unable to load catalog</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && comics.length === 0 && (
            <div className="border border-dashed border-zinc-800 rounded-2xl p-12 text-center max-w-md mx-auto my-12 space-y-3">
              <div className="text-2xl">📚</div>
              <h3 className="text-sm font-bold text-zinc-300">Catalog is empty</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">No approved comic series have been published to the system index yet.</p>
            </div>
          )}

          {!isLoading && !error && comics.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {comics.map((comic) => (
                <ComicCard
                  key={comic.id}
                  comic={comic}
                  isBookmarked={comic.isBookmarked}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Home;