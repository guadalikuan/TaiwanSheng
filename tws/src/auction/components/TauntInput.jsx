import { useState } from 'react';
import { motion } from 'framer-motion';

export default function TauntInput({ onConfirm, onCancel }) {
  const [message, setMessage] = useState('');
  const maxLength = 10;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onConfirm(message.trim());
    } else {
      onConfirm('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-tws-card border-4 border-tws-red rounded-xl p-6 max-w-md w-full"
      >
        <h3 className="text-2xl font-black text-tws-gold mb-4 text-center">
          留下你的嘲讽
        </h3>
        <p className="text-gray-400 text-sm mb-4 text-center">
          你的留言会变成横幅，挂在资产上直到下一个人把你挤走
        </p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={message}
            onChange={(e) => {
              const val = e.target.value;
              if (val.length <= maxLength) {
                setMessage(val);
              }
            }}
            placeholder="例如：210% 数学补习班"
            className="w-full bg-tws-black border-2 border-tws-red rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tws-gold"
            autoFocus
            maxLength={maxLength}
          />
          <div className="flex justify-between items-center mt-2 mb-4">
            <span className="text-xs text-gray-500">
              {message.length}/{maxLength} 字
            </span>
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-gray-400 hover:text-white"
            >
              跳过
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-bold transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 bg-tws-red hover:bg-red-600 text-white py-2 px-4 rounded-lg font-black transition-colors"
            >
              确认出价
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

