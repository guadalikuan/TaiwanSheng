import React from 'react';

const NavButton = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-16 h-full transition-all duration-300 ${
      active ? 'text-red-500 translate-y-[-2px]' : 'text-gray-600 hover:text-gray-400'
    }`}
  >
    <div className={`p-1 rounded mb-1 ${active ? 'bg-red-900/20 shadow-[0_0_10px_rgba(220,38,38,0.4)]' : ''}`}>
      {icon}
    </div>
    <span className="text-[9px] font-mono tracking-widest">{label}</span>
  </button>
);

export default NavButton;

