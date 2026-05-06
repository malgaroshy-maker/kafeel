import { useState, useRef } from 'react'
import { Upload, FileCheck, Image, Loader2 } from 'lucide-react'
import { compressImage } from '../utils/imageCompression'

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

export default function DocumentUploader() {
  const [docs, setDocs] = useState<DocItem[]>(initialDocs)
  const [compressing, setCompressing] = useState<string | null>(null)
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
            {completedCount}/{docs.length} مستند مكتمل
          </p>
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
    </div>
  )
}
