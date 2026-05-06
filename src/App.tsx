import { useState } from 'react'
import { Car, Calculator, UserPlus, FileCheck, Clock, Shield, Receipt, LayoutDashboard } from 'lucide-react'
import FinancialCalculator from './components/Calculator'
import CustomerForm from './components/CustomerForm'
import DocumentUploader from './components/DocumentUploader'
import WaitingQueue from './components/WaitingQueue'
import MonitorDashboard from './components/MonitorDashboard'
import Settlements from './components/Settlements'
import AdminDashboard from './components/AdminDashboard'

type Tab = 'calculator' | 'beneficiary' | 'guarantor' | 'documents' | 'queue' | 'monitor' | 'settlements' | 'admin'

const tabs: { id: Tab; label: string; icon: typeof Calculator }[] = [
  { id: 'calculator', label: 'الحاسبة', icon: Calculator },
  { id: 'beneficiary', label: 'المستفيد', icon: UserPlus },
  { id: 'guarantor', label: 'الضامن', icon: UserPlus },
  { id: 'documents', label: 'المستندات', icon: FileCheck },
  { id: 'queue', label: 'الانتظار', icon: Clock },
  { id: 'monitor', label: 'المراقب', icon: Shield },
  { id: 'settlements', label: 'التسويات', icon: Receipt },
  { id: 'admin', label: 'الإدارة', icon: LayoutDashboard },
]

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('calculator')

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header glass">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-icon">
              <Car size={26} />
            </div>
            <div className="brand-text">
              <h1>كفيل</h1>
              <span className="brand-tagline">منصة المرابحة الذكية</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="tab-nav">
        <div className="tab-nav-inner">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            )
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
          {activeTab === 'monitor' && <MonitorDashboard />}
          {activeTab === 'settlements' && <Settlements />}
          {activeTab === 'admin' && <AdminDashboard />}
        </div>
      </main>
    </div>
  )
}

export default App
