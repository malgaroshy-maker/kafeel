import React, { useState } from 'react';
import { Settings, Users, Shield } from 'lucide-react';
import SettingsPanel from './SettingsPanel';
import OfficeTeamManagement from './OfficeTeamManagement';

const OfficeSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'account' | 'team'>('account');

  return (
    <div className="fade-in" style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}>
      <div className="section-header" style={{ marginBottom: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <Settings size={28} style={{ color: 'var(--primary)' }} />
          إعدادات المكتب
        </h2>
        <p className="text-tertiary" style={{ margin: '0.5rem 0 0 0' }}>
          إدارة إعدادات حسابك، وتفضيلات المظهر، وصلاحيات فريق العمل.
        </p>
      </div>

      {/* Internal Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab('account')}
          className={`btn ${activeTab === 'account' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '8px', padding: '0.75rem 1.5rem', flex: 1, justifyContent: 'center' }}
        >
          <Shield size={18} />
          إعدادات الحساب والمظهر
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`btn ${activeTab === 'team' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '8px', padding: '0.75rem 1.5rem', flex: 1, justifyContent: 'center' }}
        >
          <Users size={18} />
          إدارة فريق العمل
        </button>
      </div>

      {/* Content */}
      <div style={{ minHeight: '500px' }}>
        {activeTab === 'account' && <SettingsPanel />}
        {activeTab === 'team' && <OfficeTeamManagement />}
      </div>
    </div>
  );
};

export default OfficeSettings;
