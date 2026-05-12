import { useState, useEffect, useRef } from 'react'
import { Upload, FileCheck, Image, Loader2, Send, User } from 'lucide-react'
import { compressImage } from '../utils/imageCompression'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface DocItem {
  label: string
  key: string
  checked: boolean
  file: File | null
}

const initialDocs: DocItem[] = [
  { label: 'شهادة مرتب (لا تتجاوز 3 أشهر)', key: 'salary_cert', checked: false, file: null },
  { label: 'شهادة ميلاد (لا تتجاوز 3 أشهر)', key: 'birth_cert', checked: false, file: null },
  { label: 'كشف حساب بنكي', key: 'bank_statement', checked: false, file: null },
  { label: 'كمبيالات', key: 'promissory_notes', checked: false, file: null },
  { label: 'إقرار', key: 'declaration', checked: false, file: null },
]

interface Props {
  customerId?: string | null
}

export default function DocumentUploader({ customerId }: Props) {
  const { officeId, role: userRole } = useAuth()
  const [customerName, setCustomerName] = useState<string | null>(null)
  const [docs, setDocs] = useState<DocItem[]>(initialDocs)

  useEffect(() => {
    if (customerId) {
      fetchCustomerName()
    }
  }, [customerId])

  const fetchCustomerName = async () => {
    const { data } = await supabase.from('customers').select('name').eq('id', customerId).single()
    if (data) setCustomerName(data.name)
  }
  const [compressing, setCompressing] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const toggleCheck = (key: string) => {
    setDocs((prev) =>
      prev.map((d) => (d.key === key ? { ...d, checked: !d.checked } : d))
    )
  }

  const handleFileSelect = async (key: string, file: File | null) => {
    if (!file) return

    let processedFile = file

    // Compress images client-side
    if (file.type.startsWith('image/')) {
      setCompressing(key)
      try {
        processedFile = await compressImage(file, 1200, 0.7)
        console.log(
          `Compressed ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(processedFile.size / 1024).toFixed(0)}KB`
        )
      } catch (err) {
        console.error('Compression failed, using original:', err)
        processedFile = file
      }
      setCompressing(null)
    }

    setDocs((prev) =>
      prev.map((d) =>
        d.key === key ? { ...d, file: processedFile, checked: true } : d
      )
    )
  }

  const handleSubmitTransaction = async () => {
    if (!officeId) return
    setSubmitting(true)
    try {
      // 1. Pull data from localStorage
      const calcData = JSON.parse(localStorage.getItem('kafeel_calc_draft') || '{}')
      const beneficiaryData = JSON.parse(localStorage.getItem('kafeel_customer_beneficiary_draft') || '{}')
      const guarantorData = JSON.parse(localStorage.getItem('kafeel_customer_guarantor_draft') || '{}')

      if (!beneficiaryData.nationalId || !beneficiaryData.fullName || !calcData.carPrice) {
        alert('يرجى إكمال بيانات المستفيد والحاسبة أولاً.')
        setSubmitting(false)
        return
      }

      // 2. Insert/Get Beneficiary
      const { data: customer, error: custError } = await supabase
        .from('customers')
        .upsert({
          national_id: beneficiaryData.nationalId,
          name: beneficiaryData.fullName,
          phone: beneficiaryData.phone,
          salary: parseFloat(beneficiaryData.salary) || 0,
          workplace_id: beneficiaryData.workplaceId || null,
          office_id: officeId
        }, { onConflict: 'national_id' })
        .select()
        .single()

      if (custError) throw custError

      // 3. Create Transaction
      const { data: transaction, error: transError } = await supabase
        .from('transactions')
        .insert({
          office_id: officeId,
          customer_id: customer.id,
          car_price: parseFloat(calcData.carPrice),
          bank_ceiling: parseFloat(calcData.bankCeiling),
          margin_rate: parseFloat(calcData.marginRate),
          down_payment: 0, // Will be updated during settlement
          total_installments: 96, // 8 years
          status: 'PENDING',
          workplace_id: beneficiaryData.workplaceId || null,
          purchase_cost: userRole === 'manager' ? (parseFloat(beneficiaryData.purchaseCost) || parseFloat(calcData.purchaseCost) || 0) : null
        })
        .select()
        .single()

      if (transError) throw transError

      // 4. Add Guarantor if exists
      if (guarantorData.nationalId && guarantorData.fullName) {
        const { error: guarError } = await supabase
          .from('transaction_guarantors')
          .insert({
            transaction_id: transaction.id,
            guarantor_name: guarantorData.fullName,
            guarantor_national_id: guarantorData.nationalId,
            workplace_id: guarantorData.workplaceId || null,
            match_type: 'MANUAL',
            match_status: 'PENDING'
          })
        if (guarError) throw guarError
      }

      // 5. Upload Documents to Storage
      for (const doc of docs) {
        if (doc.file) {
          const fileName = `${transaction.id}/${doc.key}-${doc.file.name}`
          const { error: uploadError } = await supabase.storage
            .from('transaction-docs')
            .upload(fileName, doc.file)
          if (uploadError) console.error('Doc upload failed:', uploadError)
        }
      }

      // 6. Update Transaction File Status
      if (completedCount === docs.length) {
        await supabase.from('transactions').update({ is_files_complete: true }).eq('id', transaction.id)
      }

      alert('تم إرسال المعاملة بنجاح!')
      // Clear drafts
      localStorage.removeItem('kafeel_calc_draft')
      localStorage.removeItem('kafeel_customer_beneficiary_draft')
      localStorage.removeItem('kafeel_customer_guarantor_draft')
      
      // Navigate to queue or refresh
      window.location.reload() 

    } catch (err) {
      console.error('Submission failed:', err)
      alert('حدث خطأ أثناء إرسال المعاملة.')
    } finally {
      setSubmitting(false)
    }
  }

  const completedCount = docs.filter((d) => d.checked).length

  return (
    <div className="doc-uploader-container">
      <div className="form-header">
        <div className="form-icon-wrap">
          <FileCheck size={24} />
        </div>
        <div>
          <h3>إدارة المستندات</h3>
          <p className="calc-subtitle">
            {customerName ? `للزبون: ${customerName}` : `${completedCount}/${docs.length} مستند مكتمل`}
          </p>
          {customerName && (
             <p className="text-sm text-text-tertiary mt-1 flex items-center gap-1">
               <User size={12} /> {completedCount}/{docs.length} مستند مكتمل
             </p>
          )}
        </div>
      </div>

      <div className="doc-progress-bar">
        <div
          className="doc-progress-fill"
          style={{ width: `${(completedCount / docs.length) * 100}%` }}
        />
      </div>

      <div className="doc-list">
        {docs.map((doc) => (
          <div key={doc.key} className={`doc-item ${doc.checked ? 'completed' : ''}`}>
            <label className="doc-check-label">
              <input
                type="checkbox"
                checked={doc.checked}
                onChange={() => toggleCheck(doc.key)}
              />
              <span>{doc.label}</span>
            </label>

            <div className="doc-actions">
              {doc.file ? (
                <span className="doc-file-name">
                  <Image size={14} />
                  {doc.file.name} ({(doc.file.size / 1024).toFixed(0)} KB)
                </span>
              ) : null}

              <button
                className="btn btn-sm btn-outline"
                onClick={() => fileInputRefs.current[doc.key]?.click()}
                disabled={compressing === doc.key}
              >
                {compressing === doc.key ? (
                  <>
                    <Loader2 size={14} className="spin" /> جاري الضغط...
                  </>
                ) : (
                  <>
                    <Upload size={14} /> رفع
                  </>
                )}
              </button>

              <input
                ref={(el) => { fileInputRefs.current[doc.key] = el }}
                type="file"
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={(e) => handleFileSelect(doc.key, e.target.files?.[0] || null)}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="form-actions" style={{ marginTop: '2rem' }}>
        <button 
          className="btn btn-primary btn-lg w-full" 
          onClick={handleSubmitTransaction}
          disabled={submitting || completedCount === 0}
          style={{ justifyContent: 'center', padding: '1rem' }}
        >
          {submitting ? (
            <>
              <Loader2 size={20} className="spin" /> جاري الإرسال...
            </>
          ) : (
            <>
              <Send size={20} /> إرسال المعاملة للمراجعة
            </>
          )}
        </button>
      </div>
    </div>
  )
}
