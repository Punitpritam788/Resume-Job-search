import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { analyzeResume, parseProfileMetadata } from './services/geminiService';
import { CareerAnalysis, AppState, UserInput } from './types';
import { EXPERIENCE_LEVELS, MAX_RESUME_LENGTH, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB, MAX_IMAGE_SIZE_BYTES, MAX_IMAGE_SIZE_MB } from './constants';
import JobCard from './components/JobCard';
import { OverviewChart } from './components/Charts';
import { extractTextFromPDF } from './utils/pdfUtils';
import LoginPage from './components/LoginPage';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Auth State
  const [user, setUser] = useState<{email: string} | null>(null);
  
  const [input, setInput] = useState<UserInput>({
    resumeText: '',
    city: searchParams.get('city') || '',
    experienceLevel: searchParams.get('experienceLevel') || 'fresher',
    yearsExperience: '',
    mode: 'fast',
    moreRoles: false
  });

  const [analysis, setAnalysis] = useState<CareerAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [truncationNotice, setTruncationNotice] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Loading State Messages
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const loadingMessages = useMemo(() => [
    "Reading your resume...",
    "Identifying key skills...",
    "Scanning Indian market trends...",
    "Finding high-demand roles...",
    "Drafting career flashcards...",
    "Finalizing recommendations..."
  ], []);

  // Sorting State
  const [sortOption, setSortOption] = useState<'match' | 'demand'>('match');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // UI State
  const [activeTab, setActiveTab] = useState<'jobs' | 'resume'>('jobs');
  const [scoreValue, setScoreValue] = useState(0);

  // Refs for file inputs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      // Default to light mode unless explicitly set to dark
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Animate ATS Score
  useEffect(() => {
    if (activeTab === 'resume' && analysis?.resume_audit) {
       setScoreValue(0);
       const target = analysis.resume_audit.ats_compatibility_score;
       const duration = 1500;
       const steps = 60;
       const stepTime = duration / steps;
       let current = 0;
       
       const timer = setInterval(() => {
         current += 1;
         const progress = current / steps;
         const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
         const val = Math.round(target * ease);
         setScoreValue(val);

         if (current >= steps) {
            setScoreValue(target);
            clearInterval(timer);
         }
       }, stepTime);

       return () => clearInterval(timer);
    }
  }, [activeTab, analysis]);

  // Cycle Loading Messages
  useEffect(() => {
    if (appState === AppState.ANALYZING) {
      setLoadingMessageIndex(0);
      const interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 3000); // Change message every 3 seconds
      return () => clearInterval(interval);
    }
  }, [appState, loadingMessages]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Auth Handlers
  const handleLogin = (email: string) => {
    setUser({ email });
  };

  const handleLogout = () => {
    setUser(null);
    reset();
  };

  // Sorting Logic
  const sortedCards = useMemo(() => {
    if (!analysis?.flashcards) return [];
    
    const cards = [...analysis.flashcards];
    
    return cards.sort((a, b) => {
        let valA: number, valB: number;
        
        if (sortOption === 'match') {
            valA = a.match_score;
            valB = b.match_score;
        } else {
            const demandMap: Record<string, number> = { "High": 3, "Medium": 2, "Low": 1 };
            valA = demandMap[a.demand_level || 'Medium'] || 2;
            valB = demandMap[b.demand_level || 'Medium'] || 2;
        }

        if (valA === valB) {
             // Secondary sort: Match score
             return sortOrder === 'asc' ? a.match_score - b.match_score : b.match_score - a.match_score;
        }

        return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [analysis, sortOption, sortOrder]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isLinkedIn = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setTruncationNotice(false);
    
    // Clear image if this is a document upload
    if (!file.type.startsWith('image/')) {
        setImagePreview(null);
        setInput(prev => ({ ...prev, imageData: undefined, imageMimeType: undefined }));
    }

    const maxBytes = file.type.startsWith('image/') ? MAX_IMAGE_SIZE_BYTES : MAX_FILE_SIZE_BYTES;
    const maxMb = file.type.startsWith('image/') ? MAX_IMAGE_SIZE_MB : MAX_FILE_SIZE_MB;

    if (file.size > maxBytes) {
      setErrorMsg(`File is too large. Please upload a file smaller than ${maxMb}MB.`);
      e.target.value = '';
      return;
    }

    let extractedText = "";

    if (file.type === 'application/pdf') {
      try {
        setIsExtractingPdf(true);
        extractedText = await extractTextFromPDF(file);
      } catch (err) {
        console.error(err);
        setErrorMsg("Failed to extract text from the PDF. The file might be password protected or corrupted. Please try Copy & Paste.");
        setIsExtractingPdf(false);
        return;
      } finally {
        setIsExtractingPdf(false);
      }
    } else if (file.type.startsWith('image/')) {
       const reader = new FileReader();
       reader.onload = (event) => {
         const result = event.target?.result as string;
         if (result) {
            setImagePreview(result);
            const base64Data = result.split(',')[1];
            setInput(prev => ({
                ...prev,
                imageData: base64Data,
                imageMimeType: file.type
            }));
         }
       };
       reader.readAsDataURL(file);
       return; 
    } else {
      // Text file
      try {
        extractedText = await file.text();
      } catch (err) {
        setErrorMsg("Failed to read text file.");
        return;
      }
    }

    if (extractedText) {
      processText(extractedText);
      
      // Auto-fill logic
      if (isLinkedIn || extractedText.length > 50) {
        setIsAutoFilling(true);
        try {
          const parseProfileMetadata = async (text: string) => { /* Dummy function to satisfy TS if missing import, but logic exists in geminiService */ return {}; }; 
          // Re-importing from geminiService in case it was missing in context, but it's imported at top.
          // Using imported function.
          const metadata = await import('./services/geminiService').then(m => m.parseProfileMetadata(extractedText));
          
          setInput(prev => ({
            ...prev,
            city: metadata.city || prev.city,
            experienceLevel: metadata.experienceLevel || prev.experienceLevel,
            yearsExperience: metadata.yearsExperience || prev.yearsExperience,
          }));
        } catch (err) {
          console.warn("Auto-fill failed", err);
        } finally {
          setIsAutoFilling(false);
        }
      }
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processText = (rawText: string) => {
    let processedText = rawText;
    if (processedText.length > MAX_RESUME_LENGTH) {
      processedText = processedText.substring(0, MAX_RESUME_LENGTH);
      setTruncationNotice(true);
    }
    setInput(prev => ({ ...prev, resumeText: processedText }));
  };

  const clearImage = () => {
    setImagePreview(null);
    setInput(prev => ({ ...prev, imageData: undefined, imageMimeType: undefined }));
  };

  const handleAnalyze = async () => {
    if (!input.resumeText.trim() && !input.imageData) {
      setErrorMsg("Please provide a resume text or upload an image.");
      return;
    }

    setAppState(AppState.ANALYZING);
    setErrorMsg('');
    setActiveTab('jobs');

    // Update URL params
    setSearchParams({
        city: input.city,
        experienceLevel: input.experienceLevel,
        mode: input.mode
    });

    try {
      const result = await analyzeResume(input);
      setAnalysis(result);
      setAppState(AppState.RESULTS);
    } catch (err) {
      setAppState(AppState.ERROR);
      setErrorMsg("Failed to analyze resume. Please try again later or check your API Key.");
    }
  };

  const reset = () => {
    setAppState(AppState.IDLE);
    setAnalysis(null);
    setTruncationNotice(false);
    setErrorMsg('');
    setImagePreview(null);
    setInput(prev => ({ ...prev, resumeText: '', imageData: undefined, imageMimeType: undefined, yearsExperience: '', moreRoles: false }));
    setSortOption('match');
    setSortOrder('desc');
    setSearchParams({});
  };

  const getAtsScoreLabel = (score: number) => {
     if (score >= 80) return { label: 'Excellent', color: 'text-emerald-500', desc: 'Ready for applications' };
     if (score >= 60) return { label: 'Good', color: 'text-amber-500', desc: 'Needs minor tweaks' };
     return { label: 'Needs Work', color: 'text-red-500', desc: 'Requires significant changes' };
  };

  if (!user) {
    return (
      <>
        <div className="absolute top-4 right-4 z-50">
           <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors focus:outline-none bg-white dark:bg-slate-800 shadow-sm"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
        </div>
        <LoginPage onLogin={handleLogin} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300 pb-20 print:bg-white print:text-black print:min-h-0 print:h-auto print:pb-0">
      
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 transition-colors duration-300 print:hidden">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={reset}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">RESUME JOB SEARCH</h1>
          </div>
          
          <div className="flex items-center gap-4">
             {appState === AppState.RESULTS && (
                <>
                  <button onClick={reset} className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium">
                  New Analysis
                  </button>
                </>
             )}

             {/* API Key Selection Button */}
             <button 
              onClick={() => (window as any).aistudio?.openSelectKey()} 
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
              title="Select Google Gemini API Key"
             >
               <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
               <span>Custom Key</span>
             </button>

             {/* Dark Mode Toggle */}
             <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Profile Dropdown / Logout */}
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                 <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{user.email.split('@')[0]}</span>
                 <span className="text-[10px] text-slate-500 dark:text-slate-400">Free Plan</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-xs border border-indigo-200 dark:border-indigo-700">
                 {user.email[0].toUpperCase()}
              </div>
              <button 
                onClick={handleLogout}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Sign Out"
              >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>

          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* LOADING MODE (Separate View) */}
        {appState === AppState.ANALYZING && (
           <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fadeIn">
              <div className="relative w-24 h-24 mb-8">
                 <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full"></div>
                 <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                 </div>
              </div>
              
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 text-center animate-pulse">
                {loadingMessages[loadingMessageIndex]}
              </h3>
              
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md text-center">
                 {input.moreRoles 
                   ? "Generating deep analysis and extra roles. This may take up to 30 seconds." 
                   : "Analyzing your profile to find the best career matches."}
              </p>
           </div>
        )}
        
        {/* INPUT MODE */}
        {appState === AppState.IDLE && (
          <div className="max-w-3xl mx-auto animate-fadeIn">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Discover your potential in the Indian job market</h2>
              <p className="text-slate-600 dark:text-slate-400">
                Paste your resume text or upload a photo of your CV to get personalized job role flashcards.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative">
              
              {/* Overlays for processing states */}
              {(isExtractingPdf || isAutoFilling) && (
                <div className="absolute inset-0 bg-white/90 dark:bg-slate-800/90 z-20 flex flex-col items-center justify-center rounded-2xl backdrop-blur-sm">
                  <div className="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                  <p className="text-base font-bold text-indigo-700 dark:text-indigo-400">
                    {isExtractingPdf ? "Extracting text from document..." : "Analyzing profile to pre-fill details..."}
                  </p>
                </div>
              )}

              <div className="mb-6">
                
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex justify-between">
                  <span>Resume Content</span>
                  <span className="text-xs font-normal text-slate-400">Manual Entry or File Upload</span>
                </label>
                
                {/* Image Preview Area */}
                {imagePreview && (
                  <div className="mb-4 relative group">
                    <img 
                      src={imagePreview} 
                      alt="Resume Preview" 
                      className="w-full h-48 object-cover rounded-xl border border-indigo-100 dark:border-indigo-900 opacity-90 group-hover:opacity-100 transition-opacity" 
                    />
                    <button 
                      onClick={clearImage}
                      className="absolute top-2 right-2 bg-white/90 dark:bg-slate-900/90 text-red-600 p-1.5 rounded-full shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-colors"
                      title="Remove image"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="absolute bottom-2 left-2 bg-indigo-900/80 text-white text-xs px-2 py-1 rounded">
                      Image attached
                    </div>
                  </div>
                )}

                <div className="relative">
                  <textarea
                    className="w-full h-48 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm leading-relaxed resize-none placeholder-slate-400 dark:placeholder-slate-500"
                    placeholder="Paste your resume text here, or upload a file below..."
                    value={input.resumeText}
                    onChange={(e) => {
                      setInput({ ...input, resumeText: e.target.value });
                      setTruncationNotice(e.target.value.length > MAX_RESUME_LENGTH);
                    }}
                    maxLength={MAX_RESUME_LENGTH}
                  ></textarea>
                  <div className="absolute bottom-2 right-4 text-xs text-slate-400">
                    {input.resumeText.length} / {MAX_RESUME_LENGTH}
                  </div>
                </div>

                {truncationNotice && (
                  <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span>Text limit reached.</span>
                  </div>
                )}

                <div className="mt-4 group relative flex justify-center items-center p-6 border-2 border-dashed border-indigo-200 dark:border-slate-700 rounded-xl bg-indigo-50/30 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all">
                   <div className="text-center pointer-events-none">
                      <svg className="mx-auto h-8 w-8 text-indigo-400 dark:text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">Click to upload Resume (PDF/Img)</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">or PDF, TXT, PNG, JPG up to 5MB</p>
                   </div>
                   <input 
                     type="file" 
                     ref={fileInputRef}
                     accept=".txt,.pdf,.jpg,.jpeg,.png,.webp"
                     onChange={(e) => handleFileChange(e, false)}
                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                   />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Preferred City</label>
                  <input
                    type="text"
                    className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500"
                    placeholder="e.g. Bengaluru, Pune"
                    value={input.city}
                    onChange={(e) => setInput({ ...input, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Experience Level</label>
                  <select
                    className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    value={input.experienceLevel}
                    onChange={(e) => setInput({ ...input, experienceLevel: e.target.value })}
                  >
                    {EXPERIENCE_LEVELS.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                   <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Years of Exp.</label>
                   <input
                     type="text"
                     className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500"
                     placeholder="e.g. 2.5"
                     value={input.yearsExperience}
                     onChange={(e) => setInput({ ...input, yearsExperience: e.target.value })}
                   />
                </div>
              </div>

              <div className="mb-6 flex items-center">
                 <label className="flex items-center space-x-2 cursor-pointer group">
                   <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${input.moreRoles ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'}`}>
                     {input.moreRoles && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                   </div>
                   <input 
                     type="checkbox" 
                     className="hidden"
                     checked={!!input.moreRoles} 
                     onChange={(e) => setInput({...input, moreRoles: e.target.checked})} 
                   />
                   <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">Generate more roles & higher accuracy (8-12 suggestions)</span>
                 </label>
              </div>

              {/* Analysis Mode Selection */}
              <div className="mb-6">
                 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Analysis Mode</label>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    
                    <button 
                      onClick={() => setInput({...input, mode: 'fast'})}
                      className={`p-3 rounded-xl border text-left transition-all ${input.mode === 'fast' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-500' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <svg className={`w-5 h-5 ${input.mode === 'fast' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className={`font-semibold ${input.mode === 'fast' ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-300'}`}>Fast</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Standard analysis.</p>
                    </button>

                    <button 
                      onClick={() => setInput({...input, mode: 'search'})}
                      className={`p-3 rounded-xl border text-left transition-all ${input.mode === 'search' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <svg className={`w-5 h-5 ${input.mode === 'search' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className={`font-semibold ${input.mode === 'search' ? 'text-blue-900 dark:text-blue-200' : 'text-slate-700 dark:text-slate-300'}`}>Market Trends</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Uses Google Search.</p>
                    </button>

                    <button 
                      onClick={() => setInput({...input, mode: 'deep'})}
                      className={`p-3 rounded-xl border text-left transition-all ${input.mode === 'deep' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 ring-1 ring-purple-500' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <svg className={`w-5 h-5 ${input.mode === 'deep' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span className={`font-semibold ${input.mode === 'deep' ? 'text-purple-900 dark:text-purple-200' : 'text-slate-700 dark:text-slate-300'}`}>Deep Think</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Uses Gemini 3 Pro.</p>
                    </button>

                 </div>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-lg border border-red-100 dark:border-red-800 flex items-start gap-2">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={(!input.resumeText.trim() && !input.imageData) || isExtractingPdf || isAutoFilling}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <span>Generate Flashcards</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </button>
            </div>
          </div>
        )}

        {/* RESULTS MODE */}
        {appState === AppState.RESULTS && analysis && (
          <div className="animate-fadeIn">
            
            {/* Profile Summary Card */}
            <div className="mb-6 bg-gradient-to-br from-indigo-600 to-violet-700 dark:from-indigo-900 dark:to-violet-900 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden print:bg-none print:text-black print:p-0 print:border-b print:border-black print:rounded-none">
              <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-4">Profile Summary</h2>
                <p className="text-indigo-100 dark:text-indigo-200 text-lg leading-relaxed mb-6 print:text-black print:text-base">
                  {analysis.summary_of_profile}
                </p>
                <div className="bg-white/10 dark:bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/20 dark:border-white/10 print:border-black print:bg-white print:p-0 print:border-0">
                  <h3 className="font-semibold text-indigo-50 dark:text-indigo-200 text-sm uppercase tracking-wide mb-2 print:text-black">Overall Advice</h3>
                  <p className="text-sm text-white/90 print:text-black">{analysis.overall_advice}</p>
                </div>
              </div>
              {/* Decorative circles - hidden on print */}
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl print:hidden"></div>
              <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl print:hidden"></div>
            </div>

            {/* Navigation Tabs (Hidden in Print) */}
            <div className="flex space-x-2 mb-6 border-b border-slate-200 dark:border-slate-800 print:hidden overflow-x-auto">
               <button 
                 onClick={() => setActiveTab('jobs')}
                 className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'jobs' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                 Job Matches & Charts
               </button>
               <button 
                 onClick={() => setActiveTab('resume')}
                 className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'resume' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                 Resume Health Check
               </button>
            </div>

            {/* JOBS TAB CONTENT */}
            {activeTab === 'jobs' && (
                <div className="animate-fadeIn">
                    {/* Chart Section */}
                    <div className="mb-8 print:hidden">
                       <OverviewChart cards={analysis.flashcards} />
                    </div>

                    {/* Flashcards Header & Sorting */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Recommended Roles</span>
                        <span className="text-sm font-normal text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700">{analysis.flashcards.length} roles found</span>
                      </h3>
                      
                      {/* Sorting Controls */}
                      <div className="flex flex-wrap items-center gap-2 print:hidden">
                         <div className="relative">
                            <select 
                              value={sortOption} 
                              onChange={(e) => setSortOption(e.target.value as 'match' | 'demand')}
                              className="appearance-none pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                            >
                               <option value="match">Sort by: Match Score</option>
                               <option value="demand">Sort by: Market Demand</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                               <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                         </div>
                         
                         <button 
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            title={sortOrder === 'asc' ? "Ascending Order (Lowest First)" : "Descending Order (Highest First)"}
                         >
                            {sortOrder === 'asc' ? (
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                            ) : (
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h5m4 0v12m0 0l-4-4m4 4l4-4" /></svg>
                            )}
                         </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12 print:grid-cols-2 print:gap-4">
                      {sortedCards.map((card, index) => (
                        <JobCard key={index} card={card} resumeText={input.resumeText} />
                      ))}
                    </div>
                </div>
            )}

            {/* RESUME TAB CONTENT */}
            {activeTab === 'resume' && (
                <div className="animate-fadeIn">
                   <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 print:border-0 print:shadow-none">
                     
                     {/* Header Section */}
                     <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-10 border-b border-slate-100 dark:border-slate-800 pb-10">
                        {/* Score Circle */}
                        <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                           <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
                             {/* Background Circle */}
                             <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                             {/* Progress Circle */}
                             <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" 
                               strokeDasharray={88 * 2 * Math.PI} 
                               strokeDashoffset={88 * 2 * Math.PI - (scoreValue) / 100 * 88 * 2 * Math.PI}
                               className={`${getAtsScoreLabel(analysis.resume_audit?.ats_compatibility_score || 0).color} transition-all duration-300 ease-out`}
                               strokeLinecap="round"
                             />
                           </svg>
                           <div className="absolute inset-0 flex items-center justify-center flex-col">
                              <span className="text-5xl font-bold text-slate-900 dark:text-white tracking-tighter tabular-nums">{scoreValue}</span>
                              <span className="text-xs text-slate-400 font-bold mt-1 tracking-widest uppercase">ATS Score</span>
                           </div>
                        </div>
                        
                        <div className="flex-1 py-2">
                          <h3 className={`text-3xl font-bold mb-3 ${getAtsScoreLabel(analysis.resume_audit?.ats_compatibility_score || 0).color}`}>
                             {getAtsScoreLabel(analysis.resume_audit?.ats_compatibility_score || 0).label}
                          </h3>
                          <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed max-w-2xl mb-2">
                            {analysis.resume_audit?.ats_compatibility_score && analysis.resume_audit.ats_compatibility_score >= 80 
                               ? "Your resume is in top shape! It uses standard headers, clear formatting, and strong keywords that machines can easily parse."
                               : analysis.resume_audit?.ats_compatibility_score && analysis.resume_audit.ats_compatibility_score >= 60 
                               ? "You're on the right track, but your resume might be getting stuck in some strict ATS filters. Focus on the issues below to boost your callback rate."
                               : "Your resume may be invisible to many recruiters. The formatting or lack of keywords is likely blocking your application before a human sees it."}
                          </p>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-500">
                             Reflects readability, keyword density, and structural integrity.
                          </p>
                        </div>
                     </div>

                     {/* 3-Column Grid for Issues */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Key Strengths (Green) */}
                        <div className="h-full">
                           <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                              <span className="w-8 h-8 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              </span>
                              Key Strengths
                           </h4>
                           <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/20 h-full">
                             {analysis.resume_audit?.key_strengths && analysis.resume_audit.key_strengths.length > 0 ? (
                               <ul className="space-y-3">
                                 {analysis.resume_audit.key_strengths.map((item, idx) => (
                                   <li key={idx} className="flex gap-3 items-start text-sm">
                                     <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                                     <span className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{item}</span>
                                   </li>
                                 ))}
                               </ul>
                             ) : (
                               <p className="text-slate-500 text-sm italic">Analysis did not return specific strengths, but keep refining!</p>
                             )}
                           </div>
                        </div>

                        {/* Formatting Issues (Red) */}
                        <div className="h-full">
                           <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                              <span className="w-8 h-8 flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg">
                                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                              </span>
                              Formatting Fixes
                           </h4>
                           <div className="bg-red-50/50 dark:bg-red-900/10 rounded-xl p-4 border border-red-100 dark:border-red-900/20 h-full">
                             {analysis.resume_audit?.formatting_issues?.length > 0 ? (
                               <ul className="space-y-3">
                                 {analysis.resume_audit.formatting_issues.map((issue, idx) => (
                                   <li key={idx} className="flex gap-3 items-start text-sm">
                                     <span className="text-red-500 font-bold mt-0.5">•</span>
                                     <span className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{issue}</span>
                                   </li>
                                 ))}
                               </ul>
                             ) : (
                               <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                                  <span>✓</span> No major formatting issues found.
                               </div>
                             )}
                           </div>
                        </div>

                        {/* Content Improvements (Amber) */}
                        <div className="h-full">
                           <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                              <span className="w-8 h-8 flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
                                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </span>
                              Content Boosters
                           </h4>
                           <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-xl p-4 border border-amber-100 dark:border-amber-900/20 h-full">
                             {analysis.resume_audit?.content_improvements?.length > 0 ? (
                               <ul className="space-y-3">
                                 {analysis.resume_audit.content_improvements.map((issue, idx) => (
                                   <li key={idx} className="flex gap-3 items-start text-sm">
                                     <span className="text-amber-500 font-bold mt-0.5">➜</span>
                                     <span className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{issue}</span>
                                   </li>
                                 ))}
                               </ul>
                             ) : (
                               <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                                  <span>✓</span> Your content impact is strong.
                               </div>
                             )}
                           </div>
                        </div>
                     </div>

                   </div>
                </div>
            )}

            {/* Grounding Sources (If Available) - Shown for both */}
            {analysis.grounding_urls && analysis.grounding_urls.length > 0 && activeTab === 'jobs' && (
               <div className="max-w-4xl mx-auto mb-12 print:hidden mt-12">
                  <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Sources Referenced</h3>
                  <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
                     <ul className="space-y-2">
                       {analysis.grounding_urls.map((url, i) => (
                         <li key={i} className="flex items-center gap-2">
                           <span className="text-indigo-500 dark:text-indigo-400">↗</span>
                           <a href={url.uri} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline truncate">
                             {url.title || url.uri}
                           </a>
                         </li>
                       ))}
                     </ul>
                  </div>
               </div>
            )}

            {/* Disclaimer Footer */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-8 text-center text-slate-400 dark:text-slate-500 text-sm max-w-4xl mx-auto print:text-xs mt-12">
              <p>{analysis.disclaimer}</p>
            </div>

          </div>
        )}

      </main>
    </div>
  );
};

export default App;