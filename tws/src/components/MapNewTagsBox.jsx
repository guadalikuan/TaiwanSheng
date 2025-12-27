import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postMapAsset } from '../utils/api';

const MapNewTagsBox = ({ assetLogs = [], assetValue, unitCount }) => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ lot: '', lat: '', lng: '', value: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const payload = {
      lot: form.lot || `LOT-${Date.now()}`,
      location: { lat: Number(form.lat), lng: Number(form.lng) },
      value: form.value ? Number(form.value) : undefined
    };

    try {
      const res = await postMapAsset(payload);
      if (res.success && res.log) {
        setMessage('Submitted');
        setForm({ lot: '', lat: '', lng: '', value: '' });
        setShowForm(false);
      } else {
        setMessage(res.message || '提交失败');
      }
    } catch (err) {
      console.error('postMapAsset error', err);
      setMessage('提交失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="map-new-tags-box">
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs font-mono text-slate-300 uppercase">Recent Mainland Tags</div>
        <button className="text-xs text-cyan-300" onClick={() => setShowForm(s => !s)}>{showForm ? 'Cancel' : 'Add Tag'}</button>
      </div>

      <div className="space-y-1 max-h-52 overflow-y-auto">
        {assetLogs.length === 0 ? (
          <div className="text-xs text-slate-500 font-mono py-2">
            No assets tagged
          </div>
        ) : (
          assetLogs.map(log => (
            <div key={log.id} className="item" onClick={() => navigate(`/map-asset/${log.assetId || log.id || log.lot}`)}>
              <div className="flex-1">
                <div className="text-sm font-mono text-white">{log.lot || (log.assetId ? `Asset ${log.assetId}` : 'Unknown')}</div>
                <div className="text-xs text-slate-400">{log.location && log.location.lat ? `${Number(log.location.lat).toFixed(3)}, ${Number(log.location.lng).toFixed(3)}` : (log.location || log.nodeLocation || '')} • {new Date(log.timestamp || Date.now()).toLocaleTimeString()}</div>
              </div>
              <div className="text-xs text-cyan-300 font-mono">{log.value ? `¥${(log.value/1000000).toFixed(1)}M` : (log.status || '')}</div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <form className="mt-3" onSubmit={submit}>
          <input value={form.lot} onChange={e => setForm({ ...form, lot: e.target.value })} placeholder="Lot / ID" className="w-full mb-2 p-2 text-sm bg-transparent border border-slate-700 rounded" />
          <div className="flex gap-2 mb-2">
            <input value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} placeholder="Lat" className="flex-1 p-2 text-sm bg-transparent border border-slate-700 rounded" />
            <input value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} placeholder="Lng" className="flex-1 p-2 text-sm bg-transparent border border-slate-700 rounded" />
          </div>
          <input value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="Value (yuan)" className="w-full mb-2 p-2 text-sm bg-transparent border border-slate-700 rounded" />
          <div className="flex justify-end items-center gap-2">
            <button type="submit" disabled={loading} className="px-3 py-1 bg-cyan-600 rounded text-xs font-mono">{loading ? 'Sending...' : 'Submit'}</button>
          </div>
          {message && <div className="text-xs mt-2 text-slate-300">{message}</div>}
        </form>
      )}
    </div>
  );
};

export default MapNewTagsBox;
