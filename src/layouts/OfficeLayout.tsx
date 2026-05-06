import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Calculator, UserPlus, FileCheck, Clock, Receipt, LogOut, BarChart3 } from 'lucide-react';
import FinancialCalculator from '../components/Calculator';
import CustomerForm from '../components/CustomerForm';
import DocumentUploader from '../components/DocumentUploader';
import WaitingQueue from '../components/WaitingQueue';
import Settlements from '../components/Settlements';
import ReportsDashboard from '../components/ReportsDashboard';
import { useAuth } from '../contexts/AuthContext';

type Tab = 'calculator' | 'beneficiary' | 'guarantor' | 'documents' | 'queue' | 'settlements' | 'reports';

const tabs: { id: Tab; label: string; icon: typeof Calculator }[] = [
  { id: 'calculator', label: 'الحاسبة', icon: Calculator },
  { id: 'beneficiary', label: 'المستفيد', icon: UserPlus },
  { id: 'guarantor', label: 'الضامن', icon: UserPlus },
  { id: 'documents', label: 'المستندات', icon: FileCheck },
  { id: 'queue', label: 'الانتظار', icon: Clock },
  { id: 'settlements', label: 'التسويات', icon: Receipt },
  { id: 'reports', label: 'التقارير', icon: BarChart3 },
];

const OfficeLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('calculator');
  const navigate = useNavigate();
  const { role, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const visibleTabs = tabs.filter(tab => {
    if (tab.id === 'reports' && role !== 'manager') {
      return false;
    }
    return true;
  });

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header glass">
        <div className="header-inner">
          <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="brand-icon">
              <Car size={26} />
            </div>
            <div className="brand-text">
              <h1>كفيل</h1>
              <span className="brand-tagline">بوابة المكاتب</span>
            </div>
          </div>
          <button className="btn-secondary" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
            <LogOut size={16} />
            <span>خروج</span>
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="tab-nav">
        <div className="tab-nav-inner">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="app-main">
        <div className="main-inner">
          {activeTab === 'calculator' && <FinancialCalculator />}
          {activeTab === 'beneficiary' && <CustomerForm role="beneficiary" />}
          {activeTab === 'guarantor' && <CustomerForm role="guarantor" />}
          {activeTab === 'documents' && <DocumentUploader />}
          {activeTab === 'queue' && <WaitingQueue />}
          {activeTab === 'settlements' && <Settlements />}
          {activeTab === 'reports' && <ReportsDashboard />}
        </div>
      </main>
    </div>
  );
};

export default OfficeLayout;
