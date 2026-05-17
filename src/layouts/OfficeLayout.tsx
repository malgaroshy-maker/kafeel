import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, UserPlus, Users, FileCheck, Clock, Receipt, LogOut, BarChart3, Settings, LayoutDashboard } from 'lucide-react';
import FinancialCalculator from '../components/Calculator';
import CustomerForm from '../components/CustomerForm';
import CustomerList from '../components/CustomerList';
import DocumentUploader from '../components/DocumentUploader';
import WaitingQueue from '../components/WaitingQueue';
import Settlements from '../components/Settlements';
import ReportsDashboard from '../components/ReportsDashboard';
import StaffDashboard from '../components/StaffDashboard';
import OfficeSettings from '../components/OfficeSettings';
import { useAuth } from '../contexts/AuthContext';

type Tab = 'dashboard' | 'calculator' | 'customers' | 'beneficiary' | 'documents' | 'queue' | 'settlements' | 'reports' | 'settings';

const tabs: { id: Tab; label: string; icon: typeof Calculator }[] = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { id: 'customers', label: 'الزبائن', icon: Users },
  { id: 'beneficiary', label: 'تسجيل جديد', icon: UserPlus },
  { id: 'calculator', label: 'الحاسبة', icon: Calculator },
  { id: 'documents', label: 'المستندات', icon: FileCheck },
  { id: 'queue', label: 'الانتظار', icon: Clock },
  { id: 'settlements', label: 'التسويات', icon: Receipt },
  { id: 'reports', label: 'التقارير', icon: BarChart3 },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
];

const OfficeLayout: React.FC = () => {
  const { role, isManager, isAccountant, isStaff, signOut, officeName } = useAuth();
  
  // Set default active tab based on role
  const [activeTab, setActiveTab] = useState<Tab>(isStaff ? 'dashboard' : 'beneficiary');
  
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<any>(null);
  const [selectedGuarantor, setSelectedGuarantor] = useState<any>(null);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [docCustomerId, setDocCustomerId] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isStaff && activeTab === 'beneficiary') {
       setActiveTab('dashboard');
    }
  }, [isStaff]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const visibleTabs = tabs.filter(tab => {
    if (tab.id === 'dashboard' && !isStaff) return false;
    if (tab.id === 'settings' && !isManager) return false;
    if (tab.id === 'reports' && isStaff) return false;
    if (tab.id === 'settlements' && isStaff) return false;
    return true;
  });

  return (
    <div className="app-shell office-theme">
      {/* Header */}
      <header className="app-header glass">
        <div className="header-inner">
          <div className="brand">
            <img src="/logo.png" alt="كفيل" className="brand-img" />
            <div className="brand-text">
              <span className="brand-tagline">بوابة المكاتب</span>
            </div>
            {officeName && (
              <div className="office-name-header">
                <Users size={14} />
                <span>{officeName}</span>
              </div>
            )}
          </div>
          <button className="btn btn-secondary" onClick={handleLogout}>
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
          {activeTab === 'customers' && (
            <CustomerList 
              onSelect={(id) => {
                setSelectedBeneficiary(id);
                setActiveTab('calculator');
              }} 
              onEdit={(customer) => {
                setEditingCustomer(customer);
                setActiveTab('beneficiary');
              }}
              onDocuments={(id) => {
                setDocCustomerId(id);
                setActiveTab('documents');
              }}
              onSendToQueue={(id) => {
                setSelectedBeneficiary(id);
                setActiveTab('calculator');
              }}
            />
          )}
          {activeTab === 'calculator' && (
            <FinancialCalculator 
              beneficiaryId={selectedBeneficiary} 
              guarantorId={selectedGuarantor} 
            />
          )}
          {activeTab === 'beneficiary' && (
            <CustomerForm 
              role="beneficiary" 
              initialData={editingCustomer}
              onSuccess={(id, gIds) => {
                setSelectedBeneficiary(id);
                if (gIds && gIds.length > 0) {
                  setSelectedGuarantor(gIds[0]); // Primary guarantor
                }
                setEditingCustomer(null);
                setActiveTab('calculator');
              }} 
            />
          )}
          {activeTab === 'documents' && <DocumentUploader customerId={docCustomerId} />}
          {activeTab === 'queue' && <WaitingQueue />}
          {activeTab === 'settlements' && <Settlements />}
          {activeTab === 'reports' && <ReportsDashboard />}
          {activeTab === 'dashboard' && <StaffDashboard />}
          {activeTab === 'settings' && <OfficeSettings />}
        </div>
      </main>
    </div>
  );
};

export default OfficeLayout;
