import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (email: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleMock = () => {
    setLoading(true);
    // Simulate Google Auth delay
    setTimeout(() => {
      setLoading(false);
      onLogin('google-user@gmail.com');
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 transition-colors duration-300 font-inter">
      <div className="max-w-4xl w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-slate-200 dark:border-slate-700">
        
        {/* Left Side - Hero Branding */}
        <div className="w-full md:w-1/2 bg-indigo-600 dark:bg-indigo-900 p-8 text-white flex flex-col justify-center relative overflow-hidden">
           <div className="relative z-10">
             <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm mb-6 border border-white/10 shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
             </div>
             <h1 className="text-3xl font-bold mb-4 tracking-tight">Resume Job Search India</h1>
             <p className="text-indigo-100 text-lg leading-relaxed font-light">
               Unlock your career potential with AI-powered resume analysis and personalized job matching tailored for the Indian market.
             </p>
           </div>
           
           {/* Decorative Elements */}
           <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
           <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
           <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Get Started</h2>
           <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">
             Start your journey with a free account.
           </p>

           <div className="space-y-4">
              <button 
                onClick={handleGoogleMock}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 p-4 rounded-xl text-slate-700 dark:text-white font-medium hover:bg-slate-50 dark:hover:bg-slate-600 hover:shadow-md transition-all duration-200 relative"
              >
                 {loading ? (
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                 ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84.81-.81z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                      <span>Sign in with Google</span>
                    </>
                 )}
              </button>
           </div>

           <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
             By clicking "Sign in", you agree to our Terms of Service and Privacy Policy.
           </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;