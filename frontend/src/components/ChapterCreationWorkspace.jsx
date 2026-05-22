import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Sparkles, UploadCloud, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { apiFetch } from '../lib/api/api';

const ChapterCreationWorkspace = ({ comicId, comicTitle, existingChapters = [], onClose, onSuccess }) => {
    const fileInputRef = useRef(null);

    // Chapter Metadata States
    const [chapterNo, setChapterNo] = useState('');
    const [chapterName, setChapterName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Pages Layout Array State
    // Structure: { id: string, file: File, previewUrl: string }
    const [pages, setPages] = useState([]);
    const [isDragging, setIsDragging] = useState(false);

    // Process incoming raw file arrays (from input click or drag-and-drop box)
    const handleProcessFiles = (fileList) => {
        if (!fileList) return;

        const validImages = Array.from(fileList).filter(file => file.type.startsWith('image/'));

        const newPages = validImages.map((file, index) => ({
            id: `local-asset-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            file: file,
            previewUrl: URL.createObjectURL(file)
        }));

        setPages((prev) => [...prev, ...newPages]);
    };

    const handleFileChange = (e) => {
        handleProcessFiles(e.target.files);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        handleProcessFiles(e.dataTransfer.files);
    };

    // Order Manipulation Array Operations
    const movePage = (index, direction) => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= pages.length) return;

        const updatedPages = [...pages];
        const temp = updatedPages[index];
        updatedPages[index] = updatedPages[targetIndex];
        updatedPages[targetIndex] = temp;

        setPages(updatedPages);
    };

    // Remove asset from selection queue
    const removePage = (index) => {
        setPages((prev) => {
            const target = prev[index];
            if (target?.previewUrl) {
                URL.revokeObjectURL(target.previewUrl);
            }
            return prev.filter((_, i) => i !== index);
        });
    };

    // Clean up ObjectURLs on component unmount
    useEffect(() => {
        return () => {
            pages.forEach(p => {
                if (p.previewUrl.startsWith('blob:')) URL.revokeObjectURL(p.previewUrl);
            });
        };
    }, []);

    const handlePublishChapter = async (e) => {
        if (e) e.preventDefault();
        setError(null);

        const numericChapterNo = Number(chapterNo);

        // Form Validations
        if (!chapterNo || isNaN(numericChapterNo) || numericChapterNo <= 0) {
            setError("Please enter a valid positive Chapter Number (greater than 0).");
            return;
        }
        if (pages.length === 0) {
            setError("A comic chapter requires at least one graphic page image asset.");
            return;
        }

        // Duplicate Check using passed existing chapters list
        const chapterExists = existingChapters.some(
            (ch) => Number(ch.chapter_no) === numericChapterNo
        );
        if (chapterExists) {
            setError(`Chapter ${numericChapterNo} already exists for this comic series. Please check your index values.`);
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Initialize a clean Multipart Form Data class container
            const formData = new FormData();

            // 2. Append parameters matching your FastAPI endpoint argument keys exactly
            formData.append('chapter_no', numericChapterNo);
            formData.append('chapter_name', chapterName.trim() || `Chapter ${numericChapterNo}`);

            // 3. Append your files sequentially under the exact key: 'pages'
            pages.forEach((pageItem) => {
                if (pageItem.file) {
                    formData.append('pages', pageItem.file);
                }
            });

            // Retrieve token exactly how your application stores authorization credentials
            const token = localStorage.getItem('token');

            // 4. CRITICAL FIX: Bypass apiFetch wrapper and use native window.fetch
            const response = await fetch(`http://localhost:8000/author/${comicId}/chapters`, {
                method: 'POST',
                headers: {
                    // DO NOT include 'Content-Type' here. The browser handles it.
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                let errorMsg = 'Failed to publish the new chapter.';
                try {
                    const errData = await response.json();
                    if (errData && errData.detail) {
                        errorMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
                    }
                } catch (jsonErr) { }
                throw new Error(errorMsg);
            }

            onSuccess();
        } catch (err) {
            console.error("Chapter Upload Error:", err);
            setError(err.message || "Failed to publish the new chapter.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full min-h-screen text-white bg-zinc-950">
            <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-8">

                {/* Workspace Navigation Header bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
                    <div className="space-y-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors font-bold text-xs uppercase tracking-wider mb-2"
                        >
                            <ArrowLeft size={14} /> Discard Workspace
                        </button>
                        <h1 className="text-2xl font-black tracking-tight">Create New Chapter</h1>
                        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                            Series context: <span className="text-indigo-400">{comicTitle || 'Active Index Node'}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 font-bold px-5 py-2.5 rounded-xl text-xs transition-all disabled:opacity-40"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handlePublishChapter}
                            disabled={isSubmitting}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-40 flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Sparkles size={14} className="animate-spin" />
                                    <span>Publishing...</span>
                                </>
                            ) : (
                                <span>Publish Chapter</span>
                            )}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-xs font-semibold flex items-center gap-2">
                        <span>⚠️</span>
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handlePublishChapter} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                    {/* LEFT PANEL: Metadata Variables */}
                    <div className="space-y-6 bg-zinc-900/30 border border-zinc-900 rounded-2xl p-6 backdrop-blur-md">
                        <h3 className="text-xs font-black tracking-widest text-zinc-500 uppercase border-b border-zinc-900 pb-3">
                            Chapter Properties
                        </h3>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                Chapter Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="any"
                                min="0.001"
                                required
                                placeholder="e.g. 1, 2, or 14.5"
                                value={chapterNo}
                                onChange={(e) => setChapterNo(e.target.value)}
                                disabled={isSubmitting}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm font-bold focus:outline-none focus:border-indigo-500 transition-all placeholder:text-zinc-700"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                Chapter Name <span className="text-zinc-600">(Optional)</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. The Awakening Storm"
                                value={chapterName}
                                onChange={(e) => setChapterName(e.target.value)}
                                disabled={isSubmitting}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 text-sm font-bold focus:outline-none focus:border-indigo-500 transition-all placeholder:text-zinc-700"
                            />
                        </div>

                        <div className="rounded-xl border border-dashed border-zinc-800/80 p-4 bg-zinc-950/40 text-[11px] text-zinc-500 leading-relaxed space-y-1">
                            <span className="font-bold uppercase tracking-wider block text-zinc-400">Layout Guide</span>
                            <p>Uploaded images append top-to-bottom inside the reader viewport corresponding to the numbered arrangement list on the right side.</p>
                        </div>
                    </div>

                    {/* RIGHT PANEL: Multiple Selection Canvas */}
                    <div className="lg:col-span-2 space-y-6">

                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group select-none ${isDragging
                                ? 'border-indigo-500 bg-indigo-500/5 scale-[0.99]'
                                : 'border-zinc-800 bg-zinc-900/10 hover:border-zinc-700 hover:bg-zinc-900/20'
                                }`}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                multiple
                                accept="image/*"
                                onChange={handleFileChange}
                                disabled={isSubmitting}
                                className="hidden"
                            />
                            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-colors shadow-md ${isDragging
                                ? 'bg-indigo-600 text-white border-indigo-500'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-500 group-hover:text-zinc-300 group-hover:border-zinc-700'
                                }`}>
                                <UploadCloud size={22} className={isDragging ? 'animate-bounce' : ''} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">
                                    Drag & Drop Chapter Panels here
                                </h3>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Supports multi-selection uploads • PNG, JPEG, or WEBP
                                </p>
                            </div>
                            <button
                                type="button"
                                className="mt-2 text-xs font-extrabold px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all shadow-sm"
                            >
                                Browse Content Assets
                            </button>
                        </div>

                        {/* Asset Node Line Items Sequence */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <h4 className="text-xs font-black tracking-widest text-zinc-500 uppercase">
                                    Layout Pages Array Order Queue ({pages.length})
                                </h4>
                                {pages.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            pages.forEach(p => URL.revokeObjectURL(p.previewUrl));
                                            setPages([]);
                                        }}
                                        className="text-[10px] uppercase tracking-wider font-extrabold text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>

                            {pages.length === 0 ? (
                                <div className="border border-zinc-900 bg-zinc-900/5 rounded-2xl p-12 text-center text-zinc-600 text-xs font-semibold">
                                    No images loaded in current page buffer manifest. Use the uploader target frame zone above.
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
                                    {pages.map((page, idx) => (
                                        <div
                                            key={page.id}
                                            className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-3 flex items-center gap-4 group/item hover:border-zinc-800 transition-all"
                                        >
                                            <span className="w-8 text-center text-xs font-black text-zinc-600 group-hover/item:text-indigo-400 transition-colors">
                                                #{idx + 1}
                                            </span>

                                            <div className="w-12 h-16 bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                                                <img
                                                    src={page.previewUrl}
                                                    alt={`Thumbnail panel block index ${idx}`}
                                                    className="w-full h-full object-cover select-none pointer-events-none"
                                                />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-zinc-300 truncate tracking-tight">
                                                    {page.file.name}
                                                </p>
                                                <p className="text-[10px] text-zinc-600 font-medium tracking-wider mt-0.5">
                                                    {(page.file.size / (1024 * 1024)).toFixed(2)} MB • {page.file.type.split('/')[1].toUpperCase()}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <button
                                                    type="button"
                                                    disabled={idx === 0}
                                                    onClick={() => movePage(idx, 'up')}
                                                    className="p-2 text-zinc-500 hover:text-white disabled:opacity-10 disabled:cursor-not-allowed transition-colors rounded-lg hover:bg-zinc-900"
                                                    title="Move Page Up"
                                                >
                                                    <ArrowUp size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={idx === pages.length - 1}
                                                    onClick={() => movePage(idx, 'down')}
                                                    className="p-2 text-zinc-500 hover:text-white disabled:opacity-10 disabled:cursor-not-allowed transition-colors rounded-lg hover:bg-zinc-900"
                                                    title="Move Page Down"
                                                >
                                                    <ArrowDown size={14} />
                                                </button>
                                                <div className="w-px h-4 bg-zinc-900 mx-1" />
                                                <button
                                                    type="button"
                                                    onClick={() => removePage(idx)}
                                                    className="p-2 text-zinc-500 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-900/50"
                                                    title="Remove Asset"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                        </div>
                                    ))}
                                </div>
                            )}

                        </div>
                    </div>

                </form>

            </div>
        </div>
    );
};

export default ChapterCreationWorkspace;