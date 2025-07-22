import React from "react";

const instructions = `This is the world of AI Avatar, where the AI News Reporter keeps you updated with every news update. You can interact and ask questions about anything to satisfy your curiosity.\nThis intelligent system combines real-time news aggregation with conversational AI capabilities, allowing users to:\n\n• Receive Automated News Updates: The AI avatar fetches the latest news and keep you updated\n• Ask Follow-up Questions: Users can interact with the avatar to ask questions about any news topic for deeper understanding\n• Experience Natural Conversations: The AI Avatar provides human-like responses and explanations about current events\n`;

export default function IntroPopup({ onSubmit }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(30, 27, 75, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        transition: 'background 0.4s',
      }}
    >
      <div
        className="max-w-2xl w-full text-center rounded-2xl shadow-2xl animate-fadeIn"
        style={{
          background: 'rgba(255,255,255,0.18)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          border: '1.5px solid rgba(255,255,255,0.25)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '1.5rem 2.5rem',
          minHeight: 'auto',
        }}
      >
        <div className="flex flex-col items-center gap-2 mb-4">
          <img src="/logo.png" alt="Logo" className="w-14 h-14 rounded-full shadow-lg  " />
          <h2 className="text-3xl font-extrabold text-purple-800 drop-shadow mb-1 tracking-tight">Welcome!</h2>
        </div>
        <p className="mb-7 text-base text-gray-900 whitespace-pre-line font-medium leading-relaxed" style={{textShadow:'none'}}> {instructions} </p>
        <div className="flex flex-col gap-4">
          <button
            type="button"
            className="w-full py-3 rounded-xl font-bold text-lg bg-gradient-to-r from-purple-500 via-pink-400 to-pink-500 shadow-lg hover:from-purple-600 hover:to-pink-600 hover:scale-105 transition-all text-white tracking-wide"
            style={{letterSpacing:'0.03em'}}
            onClick={() => onSubmit && onSubmit()}
          >
            Get Started
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(40px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.7s cubic-bezier(.23,1.02,.32,1) 1;
        }
      `}</style>
    </div>
  );
}
