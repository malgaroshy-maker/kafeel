import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Megaphone, Trash2, ShieldAlert, Store, Clock, Send, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Broadcast {
  id: string;
  message: string;
  created_at: string;
  expires_at: string;
  target_role: 'all' | 'admin' | 'office';
  type: 'info' | 'warning' | 'urgent' | 'success';
}

export default function BroadcastManager() {
  const { session } = useAuth();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState<'all' | 'admin' | 'office'>('all');
  const [type, setType] = useState<'info' | 'warning' | 'urgent' | 'success'>('info');
  const [durationHours, setDurationHours] = useState<number>(24);
  const [loading, setLoading] = useState(false);

  const fetchBroadcasts = useCallback(async () => {
    const { data, error } = await supabase
      .from('broadcasts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setBroadcasts(data);
    if (error) console.error(error);
  }, []);

  useEffect(() => {
    fetchBroadcasts();
  }, [fetchBroadcasts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + durationHours);

    const { error } = await supabase.from('broadcasts').insert({
      message: message.trim(),
      target_role: targetRole,
      type,
      expires_at: expiresAt.toISOString(),
      created_by: session?.user?.id,
      created_by_role: session?.user?.app_metadata?.role || 'admin'
    });

    setLoading(false);
    if (error) {
      alert(error.message);
    } else {
      setMessage('');
      fetchBroadcasts();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإعلان؟')) return;
    await supabase.from('broadcasts').delete().eq('id', id);
    fetchBroadcasts();
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  return (
    <div className="broadcast-manager">
      <div className="glass" style={{ padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Megaphone size={20} /> بث إعلان جديد
        </h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>نص الإعلان</label>
            <input 
              type="text" 
              required
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="اكتب الإعلان هنا لجميع المستخدمين أو فئة محددة..."
            />
          </div>

          <div className="calc-grid">
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>الفئة المستهدفة</label>
              <div className="toggle-group">
                <button type="button" className={`toggle-btn ${targetRole === 'all' ? 'active' : ''}`} onClick={() => setTargetRole('all')}><Globe size={16} /> الكل</button>
                <button type="button" className={`toggle-btn ${targetRole === 'office' ? 'active' : ''}`} onClick={() => setTargetRole('office')}><Store size={16} /> المكاتب</button>
                <button type="button" className={`toggle-btn ${targetRole === 'admin' ? 'active' : ''}`} onClick={() => setTargetRole('admin')}><ShieldAlert size={16} /> الإدارة</button>
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>أهمية الإعلان (اللون)</label>
              <div className="toggle-group">
                <button type="button" className={`toggle-btn ${type === 'info' ? 'active' : ''}`} onClick={() => setType('info')}>عادي</button>
                <button type="button" className={`toggle-btn ${type === 'warning' ? 'active' : ''}`} onClick={() => setType('warning')}>تنبيه</button>
                <button type="button" className={`toggle-btn ${type === 'urgent' ? 'active' : ''}`} onClick={() => setType('urgent')}>عاجل</button>
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
              <label>مدة بقاء الإعلان</label>
              <div className="toggle-group">
                <button type="button" className={`toggle-btn ${durationHours === 12 ? 'active' : ''}`} onClick={() => setDurationHours(12)}><Clock size={16} /> 12 ساعة</button>
                <button type="button" className={`toggle-btn ${durationHours === 24 ? 'active' : ''}`} onClick={() => setDurationHours(24)}><Clock size={16} /> 24 ساعة</button>
                <button type="button" className={`toggle-btn ${durationHours === 48 ? 'active' : ''}`} onClick={() => setDurationHours(48)}><Clock size={16} /> 48 ساعة</button>
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading || !message.trim()} style={{ alignSelf: 'flex-start' }}>
            <Send size={18} /> بث الإعلان الآن
          </button>
        </form>
      </div>

      <div className="admin-table-wrap">
        <table className="monitor-table">
          <thead>
            <tr>
              <th>الإعلان</th>
              <th>الاستهداف</th>
              <th>النوع</th>
              <th>تاريخ البث</th>
              <th>تاريخ الانتهاء</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {broadcasts.map(b => {
              const expired = isExpired(b.expires_at);
              return (
                <tr key={b.id} className={expired ? 'row-disabled' : ''}>
                  <td className="cell-name">{b.message}</td>
                  <td>
                    {b.target_role === 'all' && 'الكل'}
                    {b.target_role === 'admin' && 'الإدارة'}
                    {b.target_role === 'office' && 'المكاتب'}
                  </td>
                  <td>
                    {b.type === 'info' && <span className="badge" style={{ background: 'var(--primary-ghost)', color: 'var(--primary)' }}>عادي</span>}
                    {b.type === 'warning' && <span className="badge" style={{ background: 'hsla(38, 80%, 50%, 0.15)', color: 'var(--warning)' }}>تنبيه</span>}
                    {b.type === 'urgent' && <span className="badge badge-error">عاجل</span>}
                    {b.type === 'success' && <span className="badge badge-success">نجاح</span>}
                  </td>
                  <td dir="ltr" style={{ textAlign: 'right' }}>{new Date(b.created_at).toLocaleString('en-GB')}</td>
                  <td dir="ltr" style={{ textAlign: 'right' }}>{new Date(b.expires_at).toLocaleString('en-GB')}</td>
                  <td>
                    {expired ? <span style={{ color: 'var(--text-tertiary)' }}>منتهي</span> : <span style={{ color: 'var(--success)' }}>نشط</span>}
                  </td>
                  <td>
                    <button className="btn-icon" onClick={() => handleDelete(b.id)} style={{ color: 'var(--error)' }} title="حذف">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )
            })}
            {broadcasts.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                  لا توجد إعلانات سابقة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
