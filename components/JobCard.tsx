import React, { useState } from 'react';
import { JobCardData, InterviewPrepData } from '../types';
import { generateInterviewPrep, generateCoverLetter } from "../services/geminiService";

interface JobCardProps {
  card: JobCardData;
  resumeText: string;
}

const JobCard: React.FC<JobCardProps> = ({ card, resumeText }) => {
  const [expanded, setExpanded] = useState(false);
  
  // Prep State
  const [prepMode, setPrepMode] = useState(false);
  const [prepData, setPrepData] = useState<InterviewPrepData | null>(null);
  const [loadingPrep, setLoadingPrep] = useState(false);

  // Cover Letter State
  const [letterMode, setLetterMode] = useState(false);
  const [letterText, setLetterText] = useState("");
  const [loadingLetter, setLoadingLetter] = useState(false);

  // Styling for Demand Level
  const demandColor = {
    High: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    Medium: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    Low: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800",
  }[card.demand_level || 'Medium'];

  const getScoreColor = (score: number) => {
     if (score >= 80) return "#10b981"; // emerald-500
     if (score >= 50) return "#f59e0b"; // amber-500
     return "#ef4444"; // red-500
  };

  const tasks = card.what_you_do_in_this_job || [];
  const currentSkills = card.skills_you_already_have || [];
  const nextSkills = card.skills_to_build_next || [];
  const nextSteps = card.first_steps_to_get_started || [];
  const certifications = card.recommended_certifications || [];

  const linkedInUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(card.google_job_search_query)}`;

  const handlePrepClick = async () => {
    if (letterMode) setLetterMode(false); // Close other mode
    if (prepMode) {
        setPrepMode(false);
        return;
    }
    setPrepMode(true);
    if (!prepData) {
        setLoadingPrep(true);
        try {
            const result = await generateInterviewPrep(card.job_title, resumeText);
            setPrepData(result);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingPrep(false);
        }
    }
  };

  const handleLetterClick = async () => {
      if (prepMode) setPrepMode(false); // Close other mode
      if (letterMode) {
          setLetterMode(false);
          return;
      }
      setLetterMode(true);
      if (!letterText) {
          setLoadingLetter(true);
          try {
              const text = await generateCoverLetter(card.job_title, resumeText);
              setLetterText(text);
          } catch (e) {
              console.error(e);
          } finally {
              setLoadingLetter(false);
          }
      }
  };

  const copyLetter = () => {
      navigator.clipboard.writeText(letterText);
      // Optional: Add a toast notification here
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden print:overflow-visible hover:shadow-md transition-all duration-300 flex flex-col h-full print:break-inside-avoid print:shadow-none print:border-slate-300">
      {/* Card Header */}
      <div 
        className="p-5 border-b border-slate-100 dark:border-slate-800 relative cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex justify-between items-start mb-2">
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${demandColor}`} title="Market Availability / Hiring Volume">
            {card.demand_level === 'Low' ? (
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : card.demand_level === 'High' ? (
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            ) : null}
            <span>{card.demand_level} Demand</span>
          </div>
          
          <div className="flex flex-col items-center">
             <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm print:text-black print:border print:border-slate-400 transition-colors"
                  style={{ backgroundColor: getScoreColor(card.match_score) }}>
               {card.match_score}
             </div>
             <span className="text-[10px] text-slate-400 font-medium mt-0.5">Match</span>
          </div>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-2 pr-8">{card.job_title}</h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2">{card.why_it_matches}</p>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-grow space-y-4">
        
        {/* Key Tasks */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">What you'll do</h4>
          <ul className="space-y-1">
            {tasks.slice(0, 2).map((task, idx) => (
              <li key={idx} className="flex items-start text-sm text-slate-700 dark:text-slate-300">
                <span className="mr-2 text-indigo-500 dark:text-indigo-400">•</span>
                {task}
              </li>
            ))}
          </ul>
        </div>

        {/* Skill Gap Analysis (Visually Distinct) */}
        <div className="space-y-3">
           {/* Strengths */}
           <div>
               <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                 You Have
               </h4>
               <div className="flex flex-wrap gap-1.5">
                 {currentSkills.length > 0 ? currentSkills.slice(0, 5).map((skill, i) => (
                   <span key={i} className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-800">
                     {skill}
                   </span>
                 )) : <span className="text-xs text-slate-400 italic">None listed</span>}
               </div>
           </div>

           {/* Growth Areas */}
           <div>
               <h4 className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  To Learn
               </h4>
               <div className="flex flex-wrap gap-1.5">
                {nextSkills.slice(0, 5).map((skill, i) => (
                  <span key={i} className="text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-2 py-1 rounded border border-orange-100 dark:border-orange-800">
                    {skill}
                  </span>
                ))}
              </div>
           </div>
        </div>

        {expanded && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-fadeIn">
            
            {/* AI Interview Prep Section */}
            {prepMode && (
             <div className="mb-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg p-4 animate-in slide-in-from-top-2 duration-300">
                <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-3 flex items-center gap-2">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                   AI Interview Coach
                </h4>
                
                {loadingPrep ? (
                    <div className="py-8 flex flex-col items-center justify-center text-indigo-500">
                        <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin mb-2"></div>
                        <span className="text-xs">Generating questions for your profile...</span>
                    </div>
                ) : prepData ? (
                    <div className="space-y-4">
                        {/* Missing Keywords */}
                        {prepData.missing_keywords && prepData.missing_keywords.length > 0 && (
                            <div className="bg-white dark:bg-slate-800 p-3 rounded border border-indigo-100 dark:border-indigo-900/50">
                                <span className="text-xs font-bold text-slate-500 uppercase">Resume Gap Analysis</span>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Consider adding these keywords if you know them:</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {prepData.missing_keywords.map((kw, i) => (
                                        <span key={i} className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 px-2 py-1 rounded border border-red-100 dark:border-red-800/50">{kw}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            {prepData.questions.map((q, idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-slate-400 uppercase">{q.type} Question</span>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">"{q.question}"</p>
                                    <div className="bg-green-50 dark:bg-green-900/10 p-2 rounded text-xs text-green-800 dark:text-green-300 border-l-2 border-green-400">
                                        <strong>Tip:</strong> {q.tip}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-sm text-red-500">Failed to load prep data.</div>
                )}
             </div>
            )}

            {/* AI Cover Letter Section */}
            {letterMode && (
              <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 animate-in slide-in-from-top-2 duration-300">
                  <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Cover Letter Draft
                  </h4>
                  
                  {loadingLetter ? (
                      <div className="py-8 flex flex-col items-center justify-center text-blue-500">
                          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin mb-2"></div>
                          <span className="text-xs">Drafting letter for {card.job_title}...</span>
                      </div>
                  ) : letterText ? (
                      <div>
                        <textarea 
                           className="w-full h-64 p-3 text-xs md:text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900 rounded-md resize-none focus:ring-1 focus:ring-blue-500 outline-none"
                           value={letterText}
                           onChange={(e) => setLetterText(e.target.value)}
                        />
                        <div className="mt-2 flex justify-end">
                           <button 
                             onClick={copyLetter}
                             className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 flex items-center gap-1"
                           >
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                             Copy to Clipboard
                           </button>
                        </div>
                      </div>
                  ) : (
                    <div className="text-center text-sm text-red-500">Failed to generate letter.</div>
                  )}
              </div>
            )}

            {/* Salary Estimate */}
            {card.estimated_salary_expectation && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Est. Salary Range</h4>
                <div className="flex items-center gap-2">
                   <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {card.estimated_salary_expectation}
                   </div>
                </div>
              </div>
            )}

            {/* Recommended Certifications */}
            {certifications.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Recommended Certs</h4>
                <ul className="space-y-1">
                  {certifications.map((cert, idx) => (
                    <li key={idx} className="flex items-start text-sm text-slate-700 dark:text-slate-300">
                      <svg className="w-4 h-4 mr-2 text-indigo-500 dark:text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" /></svg>
                      {cert}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">First Steps</h4>
              <ul className="space-y-2">
                {nextSteps.map((step, idx) => (
                  <li key={idx} className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700">
                    {idx + 1}. {step}
                  </li>
                ))}
              </ul>
            </div>

            {card.risk_or_caution_note && (
              <div className="bg-rose-50 dark:bg-rose-900/30 p-3 rounded text-xs text-rose-800 dark:text-rose-200 border border-rose-100 dark:border-rose-800 flex gap-2 items-start">
                 <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 <div>
                   <span className="font-bold">Market Note:</span> {card.risk_or_caution_note}
                 </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Footer with Buttons */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2 print:hidden">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="w-full px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          {expanded ? '▲ Hide Details' : '▼ Show Full Roadmap'}
        </button>

        <div className="grid grid-cols-4 gap-2">
            <button
               onClick={handlePrepClick}
               className={`px-1 py-2.5 text-xs font-semibold rounded-lg transition-colors text-center flex items-center justify-center gap-1 border ${prepMode ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-slate-600'}`}
               title="AI Interview Coach"
            >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
               <span className="hidden sm:inline">Prep</span>
            </button>

             <button
               onClick={handleLetterClick}
               className={`px-1 py-2.5 text-xs font-semibold rounded-lg transition-colors text-center flex items-center justify-center gap-1 border ${letterMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-slate-600'}`}
               title="Write Cover Letter"
            >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
               <span className="hidden sm:inline">Letter</span>
            </button>

            <a 
              href={card.google_job_search_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-1 py-2.5 text-xs font-semibold text-slate-700 dark:text-white bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-lg transition-colors text-center flex items-center justify-center gap-1"
            >
               <span className="font-bold text-blue-500">G</span>
               <span className="hidden sm:inline">Jobs</span>
            </a>

            <a 
              href={linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-1 py-2.5 text-xs font-semibold text-white bg-[#0077b5] hover:bg-[#006396] rounded-lg transition-colors text-center flex items-center justify-center gap-1"
            >
              <span className="font-bold">in</span>
              <span className="hidden sm:inline">LinkedIn</span>
            </a>
        </div>
      </div>
    </div>
  );
};

export default JobCard;