import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Coins, FileText, CheckCircle, XCircle, AlertTriangle, ArrowRight, ChevronDown } from 'lucide-react';
import { maskPhone } from '../utils/masking';

interface Props {
  beneficiaryId?: string | null;
  onProceedToDocs?: () => void;
}

export default function FinancialRequest({ beneficiaryId, onProceedToDocs }: Props) {
  const { isManager, isStaff, isAccountant, isAdmin, role, officeId, displayName, user } = useAuth();
  const showFullPhone = isManager || isAccountant || isAdmin || role === 'admin';
  const [requests, setRequests] = useState<any[]>([]);
  const [useFallback, setUseFallback] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form states
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carPrice, setCarPrice] = useState<number>(0);
  const [requestType, setRequestType] = useState<'LOAN' | 'FINANCIAL_VALUE' | 'BILLS'>('LOAN');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [createdBy, setCreatedBy] = useState('');

  useEffect(() => {
    // Use the account email as the primary applicant identifier
    const name = user?.email || displayName || user?.user_metadata?.name || '';
    if (name) setCreatedBy(name);
  }, [displayName, user]);

  // Dropdown list for selecting other customers
  const [officeCustomers, setOfficeCustomers] = useState<any[]>([]);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const sqlCode = `-- SQL Command to update the financial_requests table. Copy and run this in Supabase SQL Editor:
ALTER TABLE public.financial_requests ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE public.financial_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Re-create or run the table creation script:
CREATE TABLE IF NOT EXISTS public.financial_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL CHECK (request_type IN ('LOAN', 'FINANCIAL_VALUE', 'BILLS')),
    amount NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_by_name TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);`;

  useEffect(() => {
    fetchRequests();
    fetchOfficeCustomers();
  }, [officeId]);

  useEffect(() => {
    if (beneficiaryId) {
      fetchActiveCustomerDetails(beneficiaryId);
    }
  }, [beneficiaryId]);

  const fetchOfficeCustomers = async () => {
    if (!officeId) return;
    try {
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone')
        .eq('office_id', officeId)
        .order('name');
      setOfficeCustomers(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActiveCustomerDetails = async (cid: string) => {
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', cid)
        .single();
      
      if (customer) {
        setCustomerId(customer.id);
        setCustomerName(customer.name);
        
        const { data: tx } = await supabase
          .from('transactions')
          .select('*')
          .eq('customer_id', cid)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (tx) {
          setTransactionId(tx.id);
          setCarModel(tx.car_model || 'تويوتا');
          setCarPrice(tx.car_price || 0);
        } else {
          setTransactionId('');
          setCarModel('');
          setCarPrice(0);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('financial_requests')
        .select(`
          *,
          customer:customer_id(name, phone, salary),
          transaction:transaction_id(car_model, car_price)
        `)
        .eq('office_id', officeId)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('relation "public.financial_requests" does not exist')) {
          setUseFallback(true);
          loadFallbackRequests();
        } else {
          throw error;
        }
      } else {
        setRequests(data || []);
        setUseFallback(false);
      }
    } catch (err) {
      console.error(err);
      setUseFallback(true);
      loadFallbackRequests();
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackRequests = () => {
    const localData = localStorage.getItem('kafeel_financial_requests_local');
    if (localData) {
      setRequests(JSON.parse(localData));
    } else {
      setRequests([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      alert('يرجى اختيار الزبون أولاً.');
      return;
    }
    if (!transactionId) {
      alert('الزبون المختار لا يملك معاملة مالية نشطة في الحاسبة. يرجى حساب القيمة أولاً.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      alert('يرجى تحديد قيمة مالية صالحة.');
      return;
    }

    const creatorName = createdBy.trim() || user?.email || displayName || user?.user_metadata?.name || 'موظف المكتب';

    const newRequest = {
      office_id: officeId,
      transaction_id: transactionId,
      customer_id: customerId,
      request_type: requestType,
      amount: parseFloat(amount),
      notes: notes,
      status: 'PENDING',
      created_by_name: creatorName,
      created_at: new Date().toISOString()
    };

    try {
      if (useFallback) {
        const current = [...requests];
        const createdRequest = {
          ...newRequest,
          id: crypto.randomUUID(),
          customer: { name: customerName },
          transaction: { car_model: carModel, car_price: carPrice }
        };
        current.unshift(createdRequest);
        localStorage.setItem('kafeel_financial_requests_local', JSON.stringify(current));
        setRequests(current);
        alert('تم تقديم طلب القيمة المالية بنجاح (حفظ محلي)!');
        resetForm();
      } else {
        const { data, error } = await supabase
          .from('financial_requests')
          .insert(newRequest)
          .select(`
            *,
            customer:customer_id(name, phone, salary),
            transaction:transaction_id(car_model, car_price)
          `)
          .maybeSingle();

        if (error) {
          // If created_by_name doesn't exist in Supabase cache yet, fallback to inserting core fields
          if (error.message.includes('created_by_name') || error.code === 'PGRST102' || error.message.includes('column')) {
            const coreRequest = {
              office_id: officeId,
              transaction_id: transactionId,
              customer_id: customerId,
              request_type: requestType,
              amount: parseFloat(amount),
              notes: notes,
              status: 'PENDING',
              created_at: new Date().toISOString()
            };
            
            const { data: retryData, error: retryError } = await supabase
              .from('financial_requests')
              .insert(coreRequest)
              .select(`
                *,
                customer:customer_id(name, phone, salary),
                transaction:transaction_id(car_model, car_price)
              `)
              .maybeSingle();
              
            if (retryError) throw retryError;
            setRequests(prev => [retryData, ...prev]);
            alert('تم تقديم طلب القيمة المالية للمدير بنجاح! (تم التجاوز لعدم اكتمال الهيكل السحابي للجدول)');
            resetForm();
          } else {
            throw error;
          }
        } else {
          setRequests(prev => [data, ...prev]);
          alert('تم تقديم طلب القيمة المالية للمدير بنجاح!');
          resetForm();
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(`فشل تقديم الطلب: ${err.message || err}`);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const approvedAt = status === 'APPROVED' ? new Date().toISOString() : null;
    try {
      if (useFallback) {
        const updated = requests.map(req => {
          if (req.id === id) {
            return { ...req, status, approved_at: approvedAt };
          }
          return req;
        });
        localStorage.setItem('kafeel_financial_requests_local', JSON.stringify(updated));
        setRequests(updated);
        alert(`تم تحديث حالة الطلب إلى: ${status === 'APPROVED' ? 'مقبول' : 'مرفوض'}`);
      } else {
        // Try updating all columns first
        const { error } = await supabase
          .from('financial_requests')
          .update({ status, approved_at: approvedAt })
          .eq('id', id);

        if (error) {
          // If approved_at does not exist in schema cache, fallback to updating ONLY status
          if (error.message.includes('approved_at') || error.code === 'PGRST102' || error.message.includes('column')) {
            const { error: retryError } = await supabase
              .from('financial_requests')
              .update({ status })
              .eq('id', id);
            
            if (retryError) throw retryError;
            setRequests(prev => prev.map(req => req.id === id ? { ...req, status } : req));
            alert(`تم تحديث حالة الطلب إلى: ${status === 'APPROVED' ? 'مقبول' : 'مرفوض'} (تم التجاوز لعدم اكتمال الهيكل السحابي للجدول)`);
          } else {
            throw error;
          }
        } else {
          setRequests(prev => prev.map(req => req.id === id ? { ...req, status, approved_at: approvedAt } : req));
          alert(`تم تحديث حالة الطلب إلى: ${status === 'APPROVED' ? 'مقبول' : 'مرفوض'}`);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(`فشل تحديث حالة الطلب: ${err.message}`);
    }
  };

  const resetForm = () => {
    setAmount('');
    setNotes('');
  };

  const getRequestTypeName = (type: string) => {
    switch (type) {
      case 'LOAN': return 'سلفة مالية';
      case 'FINANCIAL_VALUE': return 'قيمة مالية إضافية';
      case 'BILLS': return 'كمبيالات مستحقة';
      default: return type;
    }
  };

  return (
    <div className="financial-request-container" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* DB Migration Helper Banner (only visible if table not migrated yet) */}
      {useFallback && (
        <div style={{ background: 'rgba(217, 119, 6, 0.1)', border: '1px dashed #d97706', padding: '1rem', borderRadius: '8px', color: '#d97706' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            <AlertTriangle size={18} />
            <span>نظام محاكاة قاعدة البيانات نشط (مستودع محلي)</span>
          </div>
          <p style={{ fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
            جدول <code>financial_requests</code> غير موجود بقاعدة بيانات Supabase الخاصة بك حتى الآن أو ينقصه أعمدة إضافية. يمكنك تشغيل النظام بشكل طبيعي باستخدام الحفظ المحلي المدمج حالياً، أو تفعيله سحابياً بنسخ الأمر التالي وتشغيله في نافذة <strong>SQL Editor</strong> داخل لوحة تحكم Supabase:
          </p>
          <details style={{ marginTop: '0.5rem' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>عرض كود SQL لإنشاء الجدول</summary>
            <pre style={{ background: '#1e293b', color: '#f8fafc', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', overflowX: 'auto', marginTop: '0.5rem', direction: 'ltr', textAlign: 'left' }}>
              {sqlCode}
            </pre>
          </details>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Coins size={28} className="text-primary" />
          <h2 style={{ margin: 0 }}>طلبات القيمة المالية والضمانات</h2>
        </div>
        {onProceedToDocs && customerId && (
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={onProceedToDocs}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span>الانتقال للمستندات</span>
            <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: (isStaff || isManager) ? '1fr 1.5fr' : '1fr', gap: '1.5rem' }}>
        
        {/* Submitting form (for Staff and Manager) */}
        {(isStaff || isManager) && (
          <div className="card" style={{ padding: '1.5rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary-light)' }}>
              <FileText size={18} />
              تقديم طلب جديد
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Select Customer */}
              <div className="input-group" style={{ position: 'relative' }}>
                <label>الزبون المستهدف</label>
                <div 
                  className="searchable-select-trigger" 
                  onClick={() => setIsSelectOpen(!isSelectOpen)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', cursor: 'pointer' }}
                >
                  <span>{customerName || 'اختر الزبون...'}</span>
                  <ChevronDown size={16} />
                </div>

                {isSelectOpen && (
                  <div className="searchable-select-dropdown" style={{ position: 'absolute', top: '100%', right: 0, left: 0, background: 'var(--surface)', border: '1px solid var(--glass-border)', borderRadius: '8px', zIndex: 10, marginTop: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                    <div className="searchable-select-search" style={{ padding: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="بحث عن زبون..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--glass-border)' }}
                      />
                    </div>
                    <div className="searchable-options">
                      {officeCustomers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                        <div 
                          key={c.id} 
                          className="searchable-option" 
                          onClick={() => {
                            fetchActiveCustomerDetails(c.id);
                            setIsSelectOpen(false);
                            setSearchTerm('');
                          }}
                          style={{ padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                        >
                          {c.name} ({showFullPhone ? c.phone : maskPhone(c.phone)})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Active Transaction Stats Details */}
              {transactionId && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>السيارة المحسوبة:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{carModel}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>سعر المصرف:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{carPrice.toLocaleString()} د.ل</strong>
                  </div>
                </div>
              )}

              {/* Applicant Name */}
              <div className="input-group">
                <label>اسم الموظف مقدم الطلب</label>
                <input 
                  type="text" 
                  placeholder="مثال: أحمد محمد"
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }}
                  required
                />
              </div>

              {/* Request Type */}
              <div className="input-group">
                <label>نوع الطلب المالي</label>
                <select 
                  value={requestType} 
                  onChange={(e) => setRequestType(e.target.value as any)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }}
                >
                  <option value="LOAN">سلفة مالية (تسهيل كاش للزبون)</option>
                  <option value="FINANCIAL_VALUE">قيمة مالية إضافية (سلفة من المكتب)</option>
                  <option value="BILLS">كمبيالات ضمان معلقة</option>
                </select>
              </div>

              {/* Amount */}
              <div className="input-group">
                <label>القيمة المطلوبة (د.ل)</label>
                <input 
                  type="number" 
                  placeholder="مثال: 5,000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }}
                />
              </div>

              {/* Notes */}
              <div className="input-group">
                <label>ملاحظات إضافية للمدير</label>
                <textarea 
                  placeholder="اكتب هنا سبب طلب هذه القيمة المالية وتفاصيل السداد..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', resize: 'none' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                <Coins size={18} />
                <span>إرسال الطلب لمدير المكتب</span>
              </button>
            </form>
          </div>
        )}

        {/* Requests List */}
        <div className="card" style={{ padding: '1.5rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
          <h3 style={{ marginTop: 0, color: 'var(--primary-light)' }}>قائمة طلبات المكتب الحالية</h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>جاري تحميل الطلبات...</div>
          ) : requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', border: '1px dashed var(--glass-border)', borderRadius: '8px' }}>
              لا توجد طلبات معلقة حالياً في هذا المكتب.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '0.75rem' }}>الزبون</th>
                    <th style={{ padding: '0.75rem' }}>السيارة</th>
                    <th style={{ padding: '0.75rem' }}>نوع الطلب</th>
                    <th style={{ padding: '0.75rem' }}>القيمة</th>
                    <th style={{ padding: '0.75rem' }}>مقدم الطلب</th>
                    <th style={{ padding: '0.75rem' }}>التاريخ</th>
                    <th style={{ padding: '0.75rem' }}>الملاحظات</th>
                    <th style={{ padding: '0.75rem' }}>الحالة</th>
                    {isManager && <th style={{ padding: '0.75rem', textAlign: 'center' }}>الإجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => {
                    const displayDate = req.status === 'APPROVED' && req.approved_at
                      ? new Date(req.approved_at).toLocaleDateString('en-GB') + ' (موافقة)'
                      : new Date(req.created_at).toLocaleDateString('en-GB') + ' (تقديم)';

                    return (
                      <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{req.customer?.name || 'زبون غير معروف'}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{req.transaction?.car_model || 'غير محدد'}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}>
                            {getRequestTypeName(req.request_type)}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--primary-light)', fontWeight: 'bold' }}>{req.amount.toLocaleString()} د.ل</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', direction: 'ltr', textAlign: 'right' }}>{req.created_by_name || 'موظف المكتب'}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: req.status === 'APPROVED' ? '#10b981' : 'var(--text-secondary)' }}>
                          {displayDate}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={req.notes}>
                          {req.notes || 'لا توجد ملاحظات'}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className="badge" style={{
                            background: req.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.15)' : req.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: req.status === 'APPROVED' ? '#10b981' : req.status === 'REJECTED' ? '#ef4444' : '#f59e0b',
                            fontWeight: 'bold'
                          }}>
                            {req.status === 'APPROVED' ? 'تم القبول' : req.status === 'REJECTED' ? 'تم الرفض' : 'قيد الانتظار'}
                          </span>
                        </td>
                        {isManager && (
                          <td style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            {req.status === 'PENDING' ? (
                              <>
                                <button 
                                  onClick={() => handleUpdateStatus(req.id, 'APPROVED')} 
                                  className="btn btn-success" 
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                >
                                  <CheckCircle size={14} />
                                  موافقة
                                </button>
                                <button 
                                  onClick={() => handleUpdateStatus(req.id, 'REJECTED')} 
                                  className="btn btn-danger" 
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                >
                                  <XCircle size={14} />
                                  رفض
                                </button>
                              </>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>مكتمل</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
