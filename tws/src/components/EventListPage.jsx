import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, AlertTriangle } from 'lucide-react';
import { getOmegaData } from '../utils/api';
import { useSSE } from '../contexts/SSEContext';
import { useServerStatus } from '../contexts/ServerStatusContext';

const EventListPage = () => {
  const navigate = useNavigate();
  const { isOnline } = useServerStatus();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // 加载初始数据
  useEffect(() => {
    if (!isOnline) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const response = await getOmegaData();
        if (response && response.success && response.data && response.data.events) {
          setEvents(response.data.events);
        }
      } catch (error) {
        console.error('Failed to load events:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isOnline]);

  // 使用 SSE 接收实时更新
  const { subscribe } = useSSE();
  
  useEffect(() => {
    const unsubscribe = subscribe('omega', (message) => {
      if (message.type === 'update' && message.data && message.data.events) {
        setEvents(message.data.events);
      } else if (message.type === 'incremental' && message.data.type === 'event') {
        // 增量更新：将新事件添加到列表顶部
        const newEvents = message.data.events;
        setEvents(prev => {
          // 合并并去重（简单起见，这里直接使用新列表，因为通常 incremental 也会带完整的最新几条，或者我们可以重新 fetch）
          // 但根据 oracle.js 的逻辑，incremental 似乎也是发 events 数组。
          // 这里最稳妥的是：如果 message.data.events 存在，直接用它
           return message.data.events || prev;
        });
      }
    });
    return () => unsubscribe();
  }, [subscribe]);

  const handleEventClick = (event) => {
    if (event.url) {
      window.open(event.url, '_blank', 'noopener,noreferrer');
    } else {
      // 对于没有 URL 的旧数据，不做反应或给个提示
      // 也可以选择不让它可点击（在样式上区分）
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono p-4 md:p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 border-b border-red-900/50 pb-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="p-2 hover:bg-red-900/30 rounded-full transition-colors text-red-500"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-red-500 tracking-widest uppercase">
                Global Event Log
              </h1>
              <p className="text-xs text-red-400/60 mt-1 tracking-wider">
                MONITORING GEOPOLITICAL ANOMALIES
              </p>
            </div>
          </div>
          <div className="hidden md:block">
             <div className="flex items-center gap-2 text-red-500/80 text-xs border border-red-900/50 px-3 py-1 rounded bg-red-950/20">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                LIVE FEED
             </div>
          </div>
        </div>

        {/* List */}
        <div className="space-y-4">
          {loading ? (
             <div className="text-center py-12 text-red-500/50 animate-pulse">
               INITIALIZING UPLINK...
             </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-gray-600 border border-gray-900 border-dashed rounded-lg">
              NO ANOMALIES DETECTED
            </div>
          ) : (
            events.map((event) => (
              <div 
                key={event.id}
                onClick={() => handleEventClick(event)}
                className={`
                  group relative border border-red-900/30 bg-black/50 p-4 rounded-lg 
                  transition-all duration-200 
                  ${event.url ? 'hover:bg-red-900/10 hover:border-red-500/50 cursor-pointer' : 'opacity-70 cursor-not-allowed'}
                `}
              >
                {/* Background Grid Effect on Hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiAvPgo8cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjMDAwIiAvPgo8L3N2Zz4=')]"></div>

                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-[10px] text-red-500/60 border border-red-900/40 px-1.5 py-0.5 rounded">
                         {new Date(event.timestamp).toLocaleTimeString()}
                       </span>
                       {event.source && (
                         <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                           [{event.source.name || 'UNKNOWN SOURCE'}]
                         </span>
                       )}
                    </div>
                    
                    <h3 className={`text-sm md:text-base font-bold leading-relaxed ${event.url ? 'text-gray-200 group-hover:text-white' : 'text-gray-500'}`}>
                      {event.text}
                    </h3>
                    
                    <div className="mt-2 flex items-center gap-4 text-xs font-mono">
                      <span className={`${
                        (!event.impact || event.impact === 'NEUTRAL') 
                          ? 'text-gray-600' 
                          : event.impact.startsWith('-') 
                            ? 'text-green-500' 
                            : 'text-red-500'
                      }`}>
                        IMPACT: {event.impact || 'NEUTRAL'}
                      </span>
                      
                      {event.score !== undefined && (
                        <span className="text-gray-600">
                          SCORE: {event.score}
                        </span>
                      )}
                    </div>
                    
                    {event.reason && (
                      <p className="mt-2 text-xs text-gray-500/80 italic border-l-2 border-red-900/30 pl-2">
                        "{event.reason}"
                      </p>
                    )}
                  </div>

                  {/* Icon */}
                  <div className="pt-1">
                    {event.url ? (
                      <ExternalLink size={16} className="text-red-500/40 group-hover:text-red-500 transition-colors" />
                    ) : (
                      <div className="w-4"></div> 
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center text-[10px] text-red-900/40 uppercase tracking-[0.2em]">
           End of Log Stream
        </div>
      </div>
    </div>
  );
};

export default EventListPage;
