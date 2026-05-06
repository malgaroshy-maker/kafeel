import { useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { UserPlus, Save, RotateCcw } from 'lucide-react'

interface CustomerDraft {
  nationalId: string
  fullName: string
  phone: string
  workplace: string
  salary: string
  workplaceType: 'public' | 'classified'
  isSalaryContinuous: boolean
}

const emptyDraft: CustomerDraft = {
  nationalId: '',
  fullName: '',
  phone: '',
  workplace: '',
  salary: '',
  workplaceType: 'public',
  isSalaryContinuous: false,
}

interface Props {
  role?: 'beneficiary' | 'guarantor'
}

export default function CustomerForm({ role = 'beneficiary' }: Props) {
  const storageKey = `kafeel_customer_${role}_draft`
  const [form, setForm] = useLocalStorage<CustomerDraft>(storageKey, emptyDraft)
  const [saved, setSaved] = useState(false)

  const update = (field: keyof CustomerDraft, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const handleSave = () => {
    // In a real app, this would POST to Supabase.
    // For now, it just confirms the draft is persisted in localStorage.
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    setForm(emptyDraft)
    setSaved(false)
  }

  const isBeneficiary = role === 'beneficiary'
  const title = isBeneficiary ? 'بيانات المستفيد' : 'بيانات الضامن'

  return (
    <div className="customer-form-container">
      <div className="form-header">
        <div className="form-icon-wrap">
          <UserPlus size={24} />
        </div>
        <h3>{title}</h3>
      </div>

      <div className="form-body">
        <div className="input-group">
          <label htmlFor={`${role}-nid`}>الرقم الوطني</label>
          <input
            id={`${role}-nid`}
            type="text"
            inputMode="numeric"
            placeholder="أدخل الرقم الوطني"
            value={form.nationalId}
            onChange={(e) => update('nationalId', e.target.value)}
            maxLength={12}
            tabIndex={1}
          />
        </div>

        <div className="input-group">
          <label htmlFor={`${role}-name`}>الاسم الرباعي</label>
          <input
            id={`${role}-name`}
            type="text"
            placeholder="الاسم الكامل"
            value={form.fullName}
            onChange={(e) => update('fullName', e.target.value)}
            tabIndex={2}
          />
        </div>

        <div className="input-group">
          <label htmlFor={`${role}-phone`}>رقم الهاتف</label>
          <input
            id={`${role}-phone`}
            type="tel"
            inputMode="tel"
            placeholder="09XXXXXXXX"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            tabIndex={3}
          />
        </div>

        <div className="input-group">
          <label htmlFor={`${role}-workplace`}>جهة العمل</label>
          <input
            id={`${role}-workplace`}
            type="text"
            placeholder="مثال: وزارة الداخلية"
            value={form.workplace}
            onChange={(e) => update('workplace', e.target.value)}
            tabIndex={4}
          />
        </div>

        <div className="input-group">
          <label htmlFor={`${role}-salary`}>المرتب الأساسي (د.ل)</label>
          <input
            id={`${role}-salary`}
            type="number"
            inputMode="decimal"
            placeholder="مثال: 2500"
            value={form.salary}
            onChange={(e) => update('salary', e.target.value)}
            tabIndex={5}
          />
        </div>

        <div className="input-group">
          <label>نوع جهة العمل</label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-btn ${form.workplaceType === 'public' ? 'active' : ''}`}
              onClick={() => update('workplaceType', 'public')}
              tabIndex={6}
            >
              تعيين عام
            </button>
            <button
              type="button"
              className={`toggle-btn ${form.workplaceType === 'classified' ? 'active' : ''}`}
              onClick={() => update('workplaceType', 'classified')}
              tabIndex={7}
            >
              عقود مصنفة
            </button>
          </div>
          <p className="input-hint">
            {form.workplaceType === 'public'
              ? 'يتطلب ضامن واحد (1) من القطاع العام'
              : 'يتطلب ضامنين (2) — أحدهما على الأقل من القطاع العام'}
          </p>
        </div>

        <div className="input-group checkbox-group">
          <label htmlFor={`${role}-continuous`} className="checkbox-label">
            <input
              id={`${role}-continuous`}
              type="checkbox"
              checked={form.isSalaryContinuous}
              onChange={(e) => update('isSalaryContinuous', e.target.checked)}
              tabIndex={8}
            />
            <span>إيداع مرتب مستمر (3 أشهر على الأقل)</span>
          </label>
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" onClick={handleSave} tabIndex={9}>
          <Save size={18} />
          {saved ? 'تم الحفظ ✓' : 'حفظ المسودة'}
        </button>
        <button className="btn btn-ghost" onClick={handleReset} tabIndex={10}>
          <RotateCcw size={18} />
          مسح
        </button>
      </div>
    </div>
  )
}
