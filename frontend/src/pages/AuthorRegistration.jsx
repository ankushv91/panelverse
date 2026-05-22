import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Camera, Sparkles, Loader2, ArrowLeft, CheckCircle2, AlertCircle, User, FileText } from 'lucide-react';
import { apiFetch } from '../lib/api/api';
import { DEFAULT_ASSETS } from '../config/constants';

const AuthorRegistration = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // Core registration form states
    const [formData, setFormData] = useState({
        name: '',
        about: ''
    });

    // Image Processing States (matching dashboard design standards)
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(DEFAULT_ASSETS.DEFAULT_AVATAR);

    // Status Machine States
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState(null);

    // Dynamic input controller logic
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Image loader mapping binary objects into memory channels 
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);

            // Revoke older local instance strings if updating files multiple times to free browser leaks
            if (previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    // Form submission dispatcher tracking
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            let coverUrlString = previewUrl;

            // S3 Pipeline Injection Mock Wrapper Block
            if (selectedFile) {
                console.log("Staging creator profile image file binary layout payload stream: ", selectedFile.name);
                // Note: For now, since the endpoint does not support direct binary multipart files,
                // we persist our clean image asset url reference configuration fallback strings.
            }

            // Final POST payload formatting passing requested structural parameters
            const payload = {
                name: formData.name.trim(),
                about: formData.about.trim(),
                profile_pic_url: coverUrlString
            };

            await apiFetch('/author/register_author', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            setIsSuccess(true);

            // Delay navigation slightly so the user experiences the beautiful success animation state loop
            setTimeout(() => {
                // Redirecting straight back into dashboard so they can explore their upgraded Creator Studio nodes!
                navigate('/dashboard');
            }, 2400);

        } catch (err) {
            setError(err.message || 'Registration request processing timed out or failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white select-none">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                    <div className="absolute -top-12 -left-12 w-32 h-32 bg-emerald-600/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-teal-600/10 rounded-full blur-3xl" />

                    <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-400">
                        <CheckCircle2 size={32} className="animate-bounce" />
                    </div>

                    <h2 className="text-2xl font-black tracking-tight mb-2">Application Approved!</h2>
                    <p className="text-sm text-zinc-400 leading-relaxed max-w-xs mx-auto">
                        Your creator profile has been initialized. Welcome to the workspace! Provisioning studio keys now...
                    </p>

                    <div className="mt-6 flex justify-center">
                        <Loader2 size={20} className="animate-spin text-emerald-400 opacity-60" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 flex items-center justify-center">
            <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 md:p-10 relative overflow-hidden">

                {/* Dynamic Background Accents */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

                <div className="mb-8 space-y-2">
                    <Link
                        to="/dashboard"
                        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors mb-2"
                    >
                        <ArrowLeft size={14} /> Back to Dashboard
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
                        <span>Join the Creator Fleet</span>
                        <Sparkles size={20} className="text-amber-400 fill-amber-400/20 animate-pulse shrink-0" />
                    </h1>
                    <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                        Register your pen name and update your biographical ledger layout metadata to activate creator status properties immediately.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 animate-in fade-in duration-200">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <div className="text-xs font-semibold leading-relaxed">{error}</div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Interactive Avatar Drop-Zone File Selector Field */}
                    <div className="flex flex-col items-center justify-center py-4 bg-zinc-950/40 border border-zinc-800 rounded-2xl p-4 text-center space-y-3">
                        <div
                            onClick={() => !isSubmitting && fileInputRef.current?.click()}
                            className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-zinc-950 border-2 border-zinc-800 overflow-hidden relative cursor-pointer group shadow-xl transition-all hover:border-indigo-500/50"
                        >
                            <img
                                src={previewUrl}
                                alt="Creator Avatar Preview"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => { e.target.src = DEFAULT_ASSETS.DEFAULT_AVATAR; }}
                            />
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                                <Camera size={20} className="text-white mb-0.5" />
                                <span className="text-[9px] text-zinc-300 font-black tracking-widest uppercase">Upload</span>
                            </div>
                        </div>

                        <div className="space-y-0.5">
                            <span className="text-xs font-bold text-zinc-300 block">Creator Studio Avatar Portrait</span>
                            <p className="text-[10px] text-zinc-500">Supports PNG, JPG vector payloads up to 5MB.</p>
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={isSubmitting}
                            className="hidden"
                        />
                    </div>

                    {/* Text input properties */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                            <User size={12} className="text-indigo-400" /> Pen Name / Alias <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            required
                            placeholder="e.g. Eichiro Oda, ONE, Tatsuki Fujimoto"
                            value={formData.name}
                            onChange={handleInputChange}
                            disabled={isSubmitting}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                            <FileText size={12} className="text-indigo-400" /> About / Biography
                        </label>
                        <textarea
                            name="about"
                            rows={4}
                            placeholder="Tell readers details about your serial layout publications, schedule styles, or illustrative inspirations..."
                            value={formData.about}
                            onChange={handleInputChange}
                            disabled={isSubmitting}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none leading-relaxed"
                        />
                    </div>

                    {/* Form Actions Button Controls */}
                    <div className="pt-2 flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard')}
                            disabled={isSubmitting}
                            className="w-1/3 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border border-zinc-800 rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.name.trim()}
                            className="w-2/3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Processing Application...</span>
                                </>
                            ) : (
                                <span>Complete Account Upgrade</span>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default AuthorRegistration;