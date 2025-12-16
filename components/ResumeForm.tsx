import React, { useState, useEffect } from "react";
import { UserPreferences } from "../types";

interface ResumeFormProps {
  onSubmit: (text: string, prefs: UserPreferences) => void;
  loading: boolean;
  initialPreferences?: UserPreferences;
}

const ResumeForm: React.FC<ResumeFormProps> = ({ onSubmit, loading, initialPreferences }) => {
  const [resumeText, setResumeText] = useState("");
  const [prefs, setPrefs] = useState<UserPreferences>({
    city: "",
    experienceLevel: "",
    focusArea: "",
  });

  // Sync state with initialPreferences if they load/change
  useEffect(() => {
    if (initialPreferences) {
      setPrefs((prev) => ({
        ...prev,
        ...initialPreferences,
      }));
    }
  }, [initialPreferences]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resumeText.trim().length < 50) {
      alert("Please enter a valid resume text (at least 50 characters).");
      return;
    }
    onSubmit(resumeText, prefs);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setResumeText(text);
      };
      if (file.type === "text/plain") {
        reader.readAsText(file);
      } else {
        alert("For this demo, please upload .txt files or copy-paste your content directly.");
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 px-6 py-6 transition-colors duration-300">
        <h1 className="text-2xl font-bold text-white mb-2">Resume Job Search India</h1>
        <p className="text-blue-100 text-sm">
          Paste your resume text below to get AI-powered job recommendations, tailored for the Indian market.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
        
        {/* Resume Input Area */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
            Resume Content
          </label>
          <div className="relative">
             <textarea
                className="w-full h-64 p-4 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm leading-relaxed transition-all resize-none bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                placeholder="Paste your full resume text here..."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                disabled={loading}
            ></textarea>
            {/* Minimal file upload overlay hint */}
            <div className="absolute bottom-4 right-4 flex items-center space-x-2">
                 <label className="cursor-pointer text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border dark:border-slate-600 shadow-sm transition-colors">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload .txt
                    <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
                 </label>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-2 text-right">
            Supports pasted text or .txt files. For PDFs, please copy content.
          </p>
        </div>

        {/* Preferences Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Target City (India)
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="e.g. Bengaluru"
              value={prefs.city}
              onChange={(e) => setPrefs({ ...prefs, city: e.target.value })}
              disabled={loading}
            />
          </div>

          <div>
             <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Experience
            </label>
             <select
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              value={prefs.experienceLevel}
              onChange={(e) => setPrefs({ ...prefs, experienceLevel: e.target.value })}
              disabled={loading}
            >
              <option value="">Auto-detect</option>
              <option value="student">Student / Intern</option>
              <option value="fresher">Fresher (0-1 Years)</option>
              <option value="early-career">1-3 Years</option>
              <option value="mid-career">3-5 Years</option>
              <option value="career-switcher">Career Switcher</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Interest Focus
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="e.g. IT, Banking, Sales"
              value={prefs.focusArea}
              onChange={(e) => setPrefs({ ...prefs, focusArea: e.target.value })}
              disabled={loading}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all transform hover:-translate-y-0.5 ${
            loading
              ? "bg-gray-400 dark:bg-slate-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 hover:shadow-blue-500/30"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing Profile...
            </span>
          ) : (
            "Find Matching Jobs"
          )}
        </button>
      </form>
    </div>
  );
};

export default ResumeForm;