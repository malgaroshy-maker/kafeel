import { useState, useEffect, useRef } from 'react'
import { Upload, FileCheck, Image as ImageIcon, Loader2, Send, User, X, FileText, ChevronDown } from 'lucide-react'
import { compressImage } from '../utils/imageCompression'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface DocItem {
  label: string
  key: string
  checked: boolean
  file: File | null
  originalSize?: number
  previewUrl?: string
  remoteFileName?: string
  remoteSize?: number
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

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function DocumentUploader({ customerId }: Props) {
  const { officeId, role: userRole } = useAuth()
  const [customers, setCustomers] = useState<{ id: string; name: string; national_id: string; phone: string }[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(customerId || null)
  const [isCustomerSelectOpen, setIsCustomerSelectOpen] = useState(false)
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [customerName, setCustomerName] = useState<string | null>(null)
  const [docs, setDocs] = useState<DocItem[]>(initialDocs)
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null)
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null)
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [compressing, setCompressing] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  // Track all generated object URLs for thorough cleanup
  const objectUrlsRef = useRef<string[]>([])
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Fetch all office customers on mount or when officeId changes
  useEffect(() => {
    const fetchOfficeCustomers = async () => {
      if (!officeId) return
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, national_id, phone')
          .eq('office_id', officeId)
          .order('name', { ascending: true })
        
        if (error) throw error
        if (data) setCustomers(data)
      } catch (err) {
        console.error('Error fetching office customers:', err)
      }
    }
    fetchOfficeCustomers()
  }, [officeId])

  // Sync state if the customerId prop changes from parent
  useEffect(() => {
    setSelectedCustomerId(customerId || null)
  }, [customerId])

  const fetchCustomerName = async (cId: string) => {
    const { data } = await supabase.from('customers').select('name').eq('id', cId).single()
    if (data) setCustomerName(data.name)
  }

  const fetchExistingDocs = async (cId: string) => {
    setLoadingDocs(true)
    try {
      // Get the most recent active or pending transaction
      const { data: tx, error: txError } = await supabase
        .from('transactions')
        .select('id, status, is_files_complete')
        .eq('customer_id', cId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (txError) throw txError

      if (tx) {
        setActiveTransactionId(tx.id)
        
        // List files in the storage directory for this transaction
        const { data: files, error: filesError } = await supabase.storage
          .from('transaction-docs')
          .list(tx.id)

        if (filesError) throw filesError

        if (files && files.length > 0) {
          const updatedDocs = initialDocs.map((doc) => {
            // Find file that starts with `doc.key + '-'`
            const foundFile = files.find(f => f.name.startsWith(`${doc.key}-`))
            if (foundFile) {
              const { data: { publicUrl } } = supabase.storage
                .from('transaction-docs')
                .getPublicUrl(`${tx.id}/${foundFile.name}`)
              
              return {
                ...doc,
                checked: true,
                previewUrl: publicUrl,
                remoteFileName: foundFile.name.substring(doc.key.length + 1), // extract original name
                remoteSize: foundFile.metadata?.size || 0
              }
            }
            return doc
          })
          setDocs(updatedDocs)
        } else {
          setDocs(initialDocs)
        }
      } else {
        setActiveTransactionId(null)
        setDocs(initialDocs)
      }
    } catch (err) {
      console.error('Error fetching existing docs:', err)
    } finally {
      setLoadingDocs(false)
    }
  }

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerName(selectedCustomerId)
      fetchExistingDocs(selectedCustomerId)
    } else {
      setActiveTransactionId(null)
      setDocs(initialDocs)
      setCustomerName(null)
    }
  }, [selectedCustomerId])

  // Revoke all created URLs on unmount
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url)
      })
    }
  }, [])

  const toggleCheck = (key: string) => {
    setDocs((prev) =>
      prev.map((d) => (d.key === key ? { ...d, checked: !d.checked } : d))
    )
  }

  const handleFileSelect = async (key: string, file: File | null) => {
    if (!file) return

    let processedFile = file
    const originalSize = file.size
    let previewUrl: string | undefined = undefined

    // Compress images client-side
    if (file.type.startsWith('image/')) {
      setCompressing(key)
      try {
        // High fidelity compression (max width 2048px, quality 0.85) to retain HD visual clarity
        processedFile = await compressImage(file, 2048, 0.85)
        console.log(
          `Compressed ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(processedFile.size / 1024).toFixed(0)}KB`
        )
      } catch (err) {
        console.error('Compression failed, using original:', err)
        processedFile = file
      }
      setCompressing(null)

      // Create high-res visual preview
      previewUrl = URL.createObjectURL(processedFile)
      objectUrlsRef.current.push(previewUrl)
    } else if (file.type === 'application/pdf') {
      // Create preview URL for PDF to allow opening/viewing
      previewUrl = URL.createObjectURL(processedFile)
      objectUrlsRef.current.push(previewUrl)
    }

    // Validate file size (MAX 2MB)
    if (processedFile.size > 2 * 1024 * 1024) {
      alert(`حجم الملف "${processedFile.name}" كبير جداً (${(processedFile.size / (1024 * 1024)).toFixed(2)} ميجابايت). الحد الأقصى المسموح به هو 2 ميجابايت.`)
      return
    }

    setDocs((prev) =>
      prev.map((d) => {
        if (d.key === key) {
          // Revoke old URL if replaced
          if (d.previewUrl) {
            URL.revokeObjectURL(d.previewUrl)
            objectUrlsRef.current = objectUrlsRef.current.filter((url) => url !== d.previewUrl)
          }
          return { ...d, file: processedFile, checked: true, originalSize, previewUrl, remoteFileName: undefined, remoteSize: undefined }
        }
        return d
      })
    )
  }

  const handleUpdateTransactionDocs = async () => {
    if (!activeTransactionId) return
    setSubmitting(true)
    try {
      // Upload documents to Storage
      for (const doc of docs) {
        if (doc.file) {
          const fileName = `${activeTransactionId}/${doc.key}-${doc.file.name}`
          const { error: uploadError } = await supabase.storage
            .from('transaction-docs')
            .upload(fileName, doc.file, { upsert: true })
          if (uploadError) throw uploadError
        }
      }

      // Update Transaction File Status
      const currentCompletedCount = docs.filter((d) => d.checked).length
      const isComplete = currentCompletedCount === docs.length
      
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ is_files_complete: isComplete })
        .eq('id', activeTransactionId)

      if (updateError) throw updateError

      alert('تم تحديث مستندات المعاملة بنجاح!')
      if (selectedCustomerId) {
        fetchExistingDocs(selectedCustomerId)
      }
    } catch (err) {
      console.error('Update failed:', err)
      alert('حدث خطأ أثناء تحديث المستندات.')
    } finally {
      setSubmitting(false)
    }
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
          if (uploadError) {
            console.error('Doc upload failed:', uploadError)
            throw new Error(`خطأ في رفع الملف "${doc.label}": ${uploadError.message}`)
          }
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

    } catch (err: any) {
      console.error('Submission failed:', err)
      alert(err?.message || 'حدث خطأ أثناء إرسال المعاملة.')
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
          <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 500 }}>
            ⚠️ رفع المستندات اختياري ومتاح لحماية المكتب والتحقق عند الحاجة. الحد الأقصى لحجم الملف هو 2 ميجابايت.
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

      {/* Customer Switcher / Selector */}
      <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', marginTop: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          الزبون المستهدف لتعديل/رفع المستندات:
        </label>
        <div className="searchable-select-container">
          <div 
            className="searchable-select-trigger" 
            onClick={() => setIsCustomerSelectOpen(!isCustomerSelectOpen)}
            style={{ 
              background: 'var(--navy-950)',
              border: '1.5px solid var(--glass-border)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={16} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 500 }}>
                {customerName ? `${customerName} (${customers.find(c => c.id === selectedCustomerId)?.phone || 'معرّف الزبون'})` : 'اختر زبوناً للبدء في إدارة ملفاته...'}
              </span>
            </div>
            <ChevronDown size={16} style={{ opacity: 0.7 }} />
          </div>

          {isCustomerSelectOpen && (
            <div className="searchable-select-dropdown" style={{ background: 'var(--navy-950)', border: '1px solid var(--glass-border)', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', marginTop: '0.5rem' }}>
              <div className="searchable-select-search" style={{ padding: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="بحث عن زبون بالاسم أو رقم الهاتف أو الرقم الوطني..."
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                  autoFocus
                />
              </div>
              <div className="searchable-options" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                {customers.filter(c => 
                  c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                  c.phone.includes(customerSearchTerm) ||
                  c.national_id.includes(customerSearchTerm)
                ).map(c => (
                  <div 
                    key={c.id} 
                    className="searchable-option" 
                    onClick={() => {
                      setSelectedCustomerId(c.id)
                      setIsCustomerSelectOpen(false)
                      setCustomerSearchTerm('')
                    }}
                    style={{
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.02)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{c.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>هاتف: {c.phone} | وظيفي: {c.national_id}</div>
                    </div>
                    {selectedCustomerId === c.id && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 'bold' }}>✓ الحالي</span>
                    )}
                  </div>
                ))}
                {customers.filter(c => 
                  c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                  c.phone.includes(customerSearchTerm) ||
                  c.national_id.includes(customerSearchTerm)
                ).length === 0 && (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                    لا توجد نتائج بحث مطابقة.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedCustomerId ? (
        loadingDocs ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '150px' }}>
            <Loader2 size={36} className="spin" style={{ color: 'var(--primary)' }} />
            <span style={{ marginRight: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>جاري تحميل المستندات المرفوعة مسبقاً...</span>
          </div>
        ) : (
          <>
            <div className="doc-list">
              {docs.map((doc) => (
                <div 
                  key={doc.key} 
                  className={`doc-item ${doc.checked ? 'completed' : ''}`}
                  style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '0.75rem' }}>
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
                          <ImageIcon size={14} />
                          {doc.file.name} {doc.originalSize ? `(تم ضغطه من ${formatSize(doc.originalSize)} إلى ${formatSize(doc.file.size)})` : `(${formatSize(doc.file.size)})`}
                        </span>
                      ) : doc.remoteFileName ? (
                        <span className="doc-file-name" style={{ color: 'var(--success)', fontWeight: 'bold' }}>
                          <FileCheck size={14} />
                          مرفوع مسبقاً ({doc.remoteFileName})
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
                            <Upload size={14} /> {doc.checked ? 'تعديل' : 'رفع'}
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

                  {/* Visual Preview Card (for both local and remote files) */}
                  {doc.previewUrl && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.25rem', paddingRight: '1.75rem', gap: '1rem', alignItems: 'center' }}>
                      {(!doc.file && doc.remoteFileName?.toLowerCase().endsWith('.pdf')) ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                          <FileText size={18} style={{ color: 'var(--primary)' }} />
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>مستند PDF</span>
                        </div>
                      ) : (
                        <div 
                          className="preview-thumbnail-container"
                          onClick={() => setSelectedPreviewImage(doc.previewUrl || null)}
                          style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)', cursor: 'zoom-in' }}
                        >
                          <img 
                            src={doc.previewUrl} 
                            alt={doc.label} 
                            className="preview-thumbnail"
                            style={{ width: '80px', height: '80px', objectFit: 'cover', display: 'block' }}
                          />
                          <div className="preview-thumbnail-hover">معاينة</div>
                        </div>
                      )}
                      
                      <a 
                        href={doc.previewUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline"
                        style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem' }}
                      >
                        فتح في علامة تبويب جديدة
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {activeTransactionId ? (
              <div className="form-actions" style={{ marginTop: '2rem' }}>
                <button 
                  className="btn btn-primary btn-lg w-full" 
                  onClick={handleUpdateTransactionDocs}
                  disabled={submitting}
                  style={{ justifyContent: 'center', padding: '1rem' }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={20} className="spin" /> جاري التحديث...
                    </>
                  ) : (
                    <>
                      <Send size={20} /> تحديث مستندات المعاملة القائمة
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="form-actions" style={{ marginTop: '2rem' }}>
                <button 
                  className="btn btn-primary btn-lg w-full" 
                  onClick={handleSubmitTransaction}
                  disabled={submitting}
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
            )}
          </>
        )
      ) : (
        <div style={{ padding: '3.5rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed var(--glass-border)', marginTop: '1.5rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary-ghost)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
            <FileCheck size={32} style={{ color: 'var(--primary)' }} />
          </div>
          <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>بانتظار تحديد الزبون</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 1.5rem auto', lineHeight: '1.6' }}>
            يرجى اختيار زبون من القائمة المنسدلة أعلاه للبدء في استعراض أو تعديل أو رفع المستندات الرسمية الخاصة بطلب معاملته.
          </p>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedPreviewImage && (
        <div className="lightbox-overlay" onClick={() => setSelectedPreviewImage(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setSelectedPreviewImage(null)}>
              <X size={20} /> إغلاق المعاينة
            </button>
            <img src={selectedPreviewImage} alt="معاينة المستند" className="lightbox-img" />
          </div>
        </div>
      )}
    </div>
  )
}
