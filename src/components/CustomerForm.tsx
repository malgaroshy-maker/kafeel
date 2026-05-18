import { useState, useEffect } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { Save, RotateCcw, ChevronDown, ShieldCheck, User, Clock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface Workplace {
  id: string
  name: string
  required_guarantors: number
}

interface CustomerDraft {
  id?: string
  nationalId: string
  fullName: string
  phone: string
  workplaceId: string
  salary: string
  workplaceType: 'public' | 'classified'
  isSalaryContinuous: boolean
  gender: 'male' | 'female' | ''
  birthYear: string
  profitPercentage: string
  purchaseCost?: string
  bankId: string
  branchId: string
}

const emptyDraft: CustomerDraft = {
  id: '',
  nationalId: '',
  fullName: '',
  phone: '',
  workplaceId: '',
  salary: '',
  workplaceType: 'public',
  isSalaryContinuous: false,
  gender: '',
  birthYear: '',
  profitPercentage: '24',
  purchaseCost: '',
  bankId: '',
  branchId: '',
}

const SPECIAL_ENTITIES_16 = [
  'محكمة العليا', 'الهيئة العامة للقضاء العسكري', 'الشركة الوطنية العامة للنقل البحري',
  'جامعة المرقب', 'مكتب المدعي العام العسكري', 'ديوان المحاسبة', 'الهيئة الوطنية لمكافحة الفساد',
  'المجلس الوطني للحريات حقوق الإنسان', 'جهاز الحرس البلدي', 'إدارة المخابرة', 'الالرقابة على الأغذية',
  'الجامعة الأسمرية', 'معهد الدراسات بمصرف ليبيا', 'الخطوط الأفريقية', 'النقابة العامة للمعلمين',
  'جمعية الدعوة الإسلامية العالمية', 'شركة الواحة', 'وزارة التعليم العالي', 'جامعة بني وليد',
  'وزارة الزراعة', 'مصلحة الآثار', 'الكهرباء', 'وزارة الداخلية', 'حرس المنشآت',
  'الشركة التمويل النفطية', 'وزارة تعليم التقني', 'المخابرات', 'القضاء العسكري'
]

interface Props {
  role?: 'beneficiary' | 'guarantor'
  onSuccess?: (customerId: string, guarantorIds?: string[]) => void
  initialData?: any
}

// Sub-component for individual customer fields
const CustomerFields = ({ 
  data, 
  onChange, 
  workplaces, 
  showValidation, 
  title, 
  icon: Icon,
  isBeneficiary = false
}: { 
  data: CustomerDraft, 
  onChange: (field: keyof CustomerDraft, value: any) => void,
  workplaces: Workplace[],
  showValidation: boolean,
  title: string,
  icon: any,
  isBeneficiary?: boolean
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [bankSearchTerm, setBankSearchTerm] = useState('')
  const [isBankOpen, setIsBankOpen] = useState(false)
  const [branchSearchTerm, setBranchSearchTerm] = useState('')
  const [isBranchOpen, setIsBranchOpen] = useState(false)
  const [banks, setBanks] = useState<any[]>([])
  const [selectedBankBranches, setSelectedBankBranches] = useState<any[]>([])

  useEffect(() => {
    fetchBanks()
  }, [])

  useEffect(() => {
    if (data.bankId) {
      fetchBranches(data.bankId)
    } else {
      setSelectedBankBranches([])
    }
  }, [data.bankId])

  const fetchBanks = async () => {
    const { data: bankData } = await supabase.from('banks').select('*').order('name')
    if (bankData) setBanks(bankData)
  }

  const fetchBranches = async (bankId: string) => {
    const { data: branchData } = await supabase.from('branches').select('*').eq('bank_id', bankId).order('name')
    if (branchData) setSelectedBankBranches(branchData)
  }

  useEffect(() => {
    if (data.nationalId.length >= 5) {
      const firstDigit = data.nationalId[0]
      const yearDigits = data.nationalId.substring(1, 5)
      const newGender = firstDigit === '1' ? 'male' : firstDigit === '2' ? 'female' : ''
      const newYear = /^\d{4}$/.test(yearDigits) ? yearDigits : ''
      if (newGender !== data.gender || newYear !== data.birthYear) {
        onChange('gender', newGender)
        onChange('birthYear', newYear)
      }
    }
  }, [data.nationalId])

  return (
    <div className="customer-section mb-8 p-6 bg-navy-900/30 rounded-2xl border border-white/5">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/20 rounded-lg text-primary">
          <Icon size={20} />
        </div>
        <h4 className="text-lg font-bold text-white">{title}</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="input-group">
          <label>الرقم الوطني</label>
          <input
            type="text"
            inputMode="numeric"
            className={showValidation && data.nationalId.length < 12 ? 'input-error' : ''}
            placeholder="أدخل الرقم الوطني (12 رقم)"
            value={data.nationalId}
            onChange={(e) => onChange('nationalId', e.target.value.replace(/\D/g, '').slice(0, 12))}
            maxLength={12}
          />
        </div>

        <div className="input-group">
          <label>الاسم الرباعي</label>
          <input
            type="text"
            placeholder="الاسم الكامل"
            value={data.fullName}
            onChange={(e) => onChange('fullName', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="input-group">
            <label>الجنس</label>
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-btn ${data.gender === 'male' ? 'active' : ''}`}
                onClick={() => onChange('gender', 'male')}
              >ذكر</button>
              <button
                type="button"
                className={`toggle-btn ${data.gender === 'female' ? 'active' : ''}`}
                onClick={() => onChange('gender', 'female')}
              >أنثى</button>
            </div>
          </div>
          <div className="input-group">
            <label>سنة الميلاد</label>
            <input type="text" readOnly value={data.birthYear} placeholder="تلقائي" className="bg-navy-950/50" />
          </div>
        </div>

        <div className="input-group">
          <label>رقم الهاتف</label>
          <input
            type="tel"
            inputMode="tel"
            className={showValidation && (data.phone.length !== 10 || !data.phone.startsWith('0')) ? 'input-error' : ''}
            placeholder="09XXXXXXXX"
            value={data.phone}
            onChange={(e) => onChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
            maxLength={10}
            dir="ltr"
          />
        </div>

        <div className="input-group">
          <label>المصرف</label>
          <div className="searchable-select-container">
            <div className={`searchable-select-trigger ${showValidation && !data.bankId ? 'input-error' : ''}`} onClick={() => setIsBankOpen(!isBankOpen)}>
              <span>{banks.find(b => b.id === data.bankId)?.name || 'اختر المصرف...'}</span>
              <ChevronDown size={16} />
            </div>
            {isBankOpen && (
              <div className="searchable-select-dropdown">
                <div className="searchable-select-search">
                  <input
                    type="text"
                    placeholder="بحث عن مصرف..."
                    value={bankSearchTerm}
                    onChange={(e) => setBankSearchTerm(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>
                <div className="searchable-options">
                  {banks.filter(b => b.name.toLowerCase().includes(bankSearchTerm.toLowerCase())).map(b => (
                    <div key={b.id} className="searchable-option" onClick={() => {
                      onChange('bankId', b.id)
                      onChange('branchId', '')
                      setIsBankOpen(false)
                      setBankSearchTerm('')
                    }}>{b.name}</div>
                  ))}
                  {banks.filter(b => b.name.toLowerCase().includes(bankSearchTerm.toLowerCase())).length === 0 && (
                    <div className="searchable-no-results">لا توجد نتائج</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="input-group">
          <label>الفرع</label>
          <div className="searchable-select-container">
            <div 
              className={`searchable-select-trigger ${!data.bankId ? 'opacity-50 cursor-not-allowed' : ''} ${showValidation && !data.branchId ? 'input-error' : ''}`} 
              onClick={() => data.bankId && setIsBranchOpen(!isBranchOpen)}
            >
              <span>{selectedBankBranches.find(br => br.id === data.branchId)?.name || 'اختر الفرع...'}</span>
              <ChevronDown size={16} />
            </div>
            {isBranchOpen && data.bankId && (
              <div className="searchable-select-dropdown">
                <div className="searchable-select-search">
                  <input
                    type="text"
                    placeholder="بحث عن فرع..."
                    value={branchSearchTerm}
                    onChange={(e) => setBranchSearchTerm(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>
                <div className="searchable-options">
                  {selectedBankBranches.filter(br => br.name.toLowerCase().includes(branchSearchTerm.toLowerCase())).map(br => (
                    <div key={br.id} className="searchable-option" onClick={() => {
                      onChange('branchId', br.id)
                      setIsBranchOpen(false)
                      setBranchSearchTerm('')
                    }}>{br.name} {br.region ? `(${br.region})` : ''}</div>
                  ))}
                  {selectedBankBranches.filter(br => br.name.toLowerCase().includes(branchSearchTerm.toLowerCase())).length === 0 && (
                    <div className="searchable-no-results">لا توجد نتائج</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="input-group">
          <label>جهة العمل</label>
          <div className="searchable-select-container">
            <div className={`searchable-select-trigger ${showValidation && !data.workplaceId ? 'input-error' : ''}`} onClick={() => setIsOpen(!isOpen)}>
              <span>{workplaces.find(w => w.id === data.workplaceId)?.name || 'اختر جهة العمل...'}</span>
              <ChevronDown size={16} />
            </div>
            {isOpen && (
              <div className="searchable-select-dropdown">
                <div className="searchable-select-search">
                  <input
                    type="text"
                    placeholder="بحث..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>
                <div className="searchable-options">
                  {workplaces.filter(w => w.name.includes(searchTerm)).map(w => (
                    <div key={w.id} className="searchable-option" onClick={() => {
                      onChange('workplaceId', w.id)
                      const normalizedName = w.name.replace(/\s+/g, ' ').trim()
                      const isSpecial = SPECIAL_ENTITIES_16.some(ent => normalizedName.includes(ent))
                      if (isBeneficiary) onChange('profitPercentage', isSpecial ? '16' : '24')
                      setIsOpen(false)
                    }}>{w.name}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="input-group">
            <label>المرتب الأساسي (د.ل)</label>
            <input
              type="number"
              placeholder="2500"
              value={data.salary}
              onChange={(e) => onChange('salary', e.target.value)}
            />
          </div>
          {isBeneficiary && (
            <div className="input-group">
              <label>نسبة الربح (%)</label>
              <div className="toggle-group">
                <button type="button" className={`toggle-btn ${data.profitPercentage === '16' ? 'active' : ''}`} onClick={() => onChange('profitPercentage', '16')}>16%</button>
                <button type="button" className={`toggle-btn ${data.profitPercentage === '24' ? 'active' : ''}`} onClick={() => onChange('profitPercentage', '24')}>24%</button>
              </div>
            </div>
          )}
        </div>

        {isBeneficiary && (
          <>
            <div className="input-group">
              <label>نوع جهة العمل</label>
              <div className="toggle-group">
                <button type="button" className={`toggle-btn ${data.workplaceType === 'public' ? 'active' : ''}`} onClick={() => onChange('workplaceType', 'public')}>تعيين عام</button>
                <button type="button" className={`toggle-btn ${data.workplaceType === 'classified' ? 'active' : ''}`} onClick={() => onChange('workplaceType', 'classified')}>عقود مصنفة</button>
              </div>
            </div>
            <div className="input-group flex items-center pt-8">
              <label className="checkbox-label">
                <input type="checkbox" checked={data.isSalaryContinuous} onChange={(e) => onChange('isSalaryContinuous', e.target.checked)} />
                <span>إيداع مرتب مستمر</span>
              </label>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function CustomerForm({ role: _role = 'beneficiary', onSuccess, initialData }: Props) {
  const { role: userRole, officeId } = useAuth()
  const [beneficiary, setBeneficiary] = useLocalStorage<CustomerDraft>(`kafeel_customer_beneficiary_draft`, emptyDraft)
  const [guarantor1, setGuarantor1] = useLocalStorage<CustomerDraft>(`kafeel_customer_guarantor1_draft`, emptyDraft)
  const [guarantor2, setGuarantor2] = useLocalStorage<CustomerDraft>(`kafeel_customer_guarantor2_draft`, emptyDraft)
  
  const [hasGuarantor, setHasGuarantor] = useState(false)
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedToQueue, setSavedToQueue] = useState(false)
  const [showValidation, setShowValidation] = useState(false)

  useEffect(() => {
    if (initialData) {
      setBeneficiary({
        id: initialData.id,
        nationalId: initialData.national_id || '',
        fullName: initialData.name || '',
        phone: initialData.phone || '',
        workplaceId: initialData.workplace_id || '',
        salary: initialData.salary?.toString() || '',
        workplaceType: initialData.workplace_type || 'public',
        isSalaryContinuous: initialData.is_salary_continuous || false,
        gender: initialData.gender || '',
        birthYear: initialData.birth_year?.toString() || '',
        profitPercentage: initialData.profit_percentage || '24',
        bankId: initialData.bank_id || '',
        branchId: initialData.branch_id || '',
      })
    }
  }, [initialData])

  useEffect(() => {
    const fetchWorkplaces = async () => {
      const { data } = await supabase.from('workplaces').select('*').order('name')
      if (data) setWorkplaces(data)
    }
    fetchWorkplaces()
  }, [])

  const saveCustomer = async (formData: CustomerDraft) => {
    if (!formData.nationalId || formData.nationalId.length < 12 || !formData.fullName || !formData.workplaceId) return null
    
    const payload: any = {
      office_id: officeId,
      national_id: formData.nationalId,
      name: formData.fullName,
      phone: formData.phone,
      salary: parseFloat(formData.salary) || 0,
      workplace_id: formData.workplaceId,
      gender: formData.gender,
      birth_year: parseInt(formData.birthYear) || null,
      bank_id: formData.bankId || null,
      branch_id: formData.branchId || null
    }
    
    const { data, error } = await supabase
      .from('customers')
      .upsert(payload, { onConflict: 'national_id' })
      .select().single()

    if (error) throw error
    return data
  }

  const handleSave = async () => {
    setShowValidation(true)
    setLoading(true)
    try {
      // 1. Save Beneficiary
      const ben = await saveCustomer(beneficiary)
      if (!ben) throw new Error('Missing beneficiary data')

      // 2. Save Guarantors if enabled
      const gIds: string[] = []
      if (hasGuarantor) {
        const g1 = await saveCustomer(guarantor1)
        if (g1) gIds.push(g1.id)
        
        if (beneficiary.workplaceType === 'classified') {
          const g2 = await saveCustomer(guarantor2)
          if (g2) gIds.push(g2.id)
        }
      }

      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        if (onSuccess) onSuccess(ben.id, gIds)
      }, 1000)
    } catch (err) {
      console.error(err)
      alert('حدث خطأ أثناء الحفظ')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAndQueue = async () => {
    setShowValidation(true)
    setLoading(true)
    try {
      // 1. Save Beneficiary
      const ben = await saveCustomer(beneficiary)
      if (!ben) throw new Error('Missing beneficiary data')

      // 2. Save Guarantors if enabled
      const gIds: string[] = []
      if (hasGuarantor) {
        const g1 = await saveCustomer(guarantor1)
        if (g1) gIds.push(g1.id)
        
        if (beneficiary.workplaceType === 'classified') {
          const g2 = await saveCustomer(guarantor2)
          if (g2) gIds.push(g2.id)
        }
      }

      // 3. Check if customer already has a WAITING_MATCH transaction
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('id')
        .eq('customer_id', ben.id)
        .in('status', ['WAITING_MATCH', 'MATCHED', 'ACTIVE'])
        .limit(1)

      if (existingTx && existingTx.length > 0) {
        alert('هذا الزبون لديه معاملة قائمة بالفعل')
        setLoading(false)
        return
      }

      // 4. Create WAITING_MATCH transaction
      const guarantorsNeeded = beneficiary.workplaceType === 'classified' ? 2 : 1
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          office_id: officeId,
          customer_id: ben.id,
          workplace_id: ben.workplace_id || null,
          guarantors_needed: guarantorsNeeded,
          status: 'WAITING_MATCH'
        })

      if (txError) throw txError

      // 5. If guarantors were saved, link them to the transaction
      if (gIds.length > 0) {
        const { data: newTx } = await supabase
          .from('transactions')
          .select('id')
          .eq('customer_id', ben.id)
          .eq('status', 'WAITING_MATCH')
          .single()

        if (newTx) {
          for (const gId of gIds) {
            const { data: gData } = await supabase
              .from('customers')
              .select('name, national_id, workplace_id')
              .eq('id', gId)
              .single()

            if (gData) {
              await supabase.from('transaction_guarantors').insert({
                transaction_id: newTx.id,
                guarantor_name: gData.name,
                guarantor_national_id: gData.national_id,
                workplace_id: gData.workplace_id,
                match_type: 'MANUAL',
                match_status: 'PENDING'
              })
            }
          }
        }
      }

      setSavedToQueue(true)
      setTimeout(() => {
        setSavedToQueue(false)
        if (onSuccess) onSuccess(ben.id, gIds)
      }, 1500)
    } catch (err) {
      console.error(err)
      alert('حدث خطأ أثناء الحفظ والإرسال للانتظار')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="customer-form-container max-w-4xl mx-auto">
      <CustomerFields
        data={beneficiary}
        onChange={(f, v) => setBeneficiary(prev => ({ ...prev, [f]: v }))}
        workplaces={workplaces}
        showValidation={showValidation}
        title="بيانات المستفيد"
        icon={User}
        isBeneficiary
      />

      <div className="mb-8 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
        <label className="flex items-center gap-3 cursor-pointer">
          <input 
            type="checkbox" 
            className="w-5 h-5 rounded border-primary/30" 
            checked={hasGuarantor}
            onChange={(e) => setHasGuarantor(e.target.checked)}
          />
          <span className="text-lg font-semibold text-primary">هل يوجد ضامن؟</span>
        </label>
        {hasGuarantor && (
          <span className="text-sm text-primary/70 italic">
            {beneficiary.workplaceType === 'classified' ? 'يتطلب ضامنين لهذه الجهة' : 'ضامن واحد يكفي'}
          </span>
        )}
      </div>

      {hasGuarantor && (
        <>
          <CustomerFields
            data={guarantor1}
            onChange={(f, v) => setGuarantor1(prev => ({ ...prev, [f]: v }))}
            workplaces={workplaces}
            showValidation={showValidation}
            title="بيانات الضامن الأول"
            icon={ShieldCheck}
          />
          
          {beneficiary.workplaceType === 'classified' && (
            <CustomerFields
              data={guarantor2}
              onChange={(f, v) => setGuarantor2(prev => ({ ...prev, [f]: v }))}
              workplaces={workplaces}
              showValidation={showValidation}
              title="بيانات الضامن الثاني"
              icon={ShieldCheck}
            />
          )}
        </>
      )}

      {userRole === 'manager' && (
        <div className="p-6 mb-8 bg-success/5 border border-success/20 rounded-2xl">
          <label className="block text-success-color mb-2">سعر شراء السيارة للمكتب (سري)</label>
          <input
            type="number"
            className="w-full bg-navy-950/50 border-success/30 text-success-color"
            value={beneficiary.purchaseCost || ''}
            onChange={(e) => setBeneficiary(prev => ({ ...prev, purchaseCost: e.target.value }))}
          />
        </div>
      )}

      {savedToQueue && (
        <div className="queue-match-result success mb-4" style={{ padding: '1rem', borderRadius: '12px' }}>
          <span>✅ تم حفظ الزبون وإرساله لقائمة الانتظار بنجاح</span>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <button className="btn btn-primary flex-1 py-4 text-base" onClick={handleSave} disabled={loading}>
          <Save size={20} />
          {loading && !savedToQueue ? 'جاري الحفظ...' : saved ? 'تم الحفظ ✓' : 'حفظ وتسجيل المعاملة'}
        </button>
        <button 
          className="btn flex-1 py-4 text-base" 
          style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
          onClick={handleSaveAndQueue} 
          disabled={loading}
        >
          <Clock size={20} />
          {loading && savedToQueue ? 'جاري الإرسال...' : 'حفظ وإرسال للانتظار'}
        </button>
        <button className="btn btn-ghost px-6" onClick={() => { setBeneficiary(emptyDraft); setGuarantor1(emptyDraft); setGuarantor2(emptyDraft); }}>
          <RotateCcw size={20} />
        </button>
      </div>
    </div>
  )
}
