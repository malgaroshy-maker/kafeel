import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UserPlus, Key, Mail, Lock, User, AlertCircle, CheckCircle2, Home, Sun, Moon } from 'lucide-react';

export default function JoinPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [role, setRole] = useState('staff');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const navigate = useNavigate();
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    localStorage.setItem('landing-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    const currentTheme = localStorage.getItem('theme') || 'light';
    setTheme(currentTheme as 'light' | 'dark');
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setShowValidation(true);

    if (!email.trim() || !password || !displayName.trim() || !joinCode.trim() || !phone.trim()) {
      setError('يرجى إكمال جميع الحقول المطلوبة');
      setLoading(false);
      return;
    }

    if (phone.trim().length !== 10) {
      setError('رقم الهاتف يجب أن يتكون من 10 أرقام (الرقم الحالي ناقص)');
      setLoading(false);
      return;
    }

    if (!agreeToTerms) {
      setError('يرجى القبول والموافقة على شروط وأحكام اتفاقية الاستخدام أولاً');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/join-with-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
            display_name: displayName.trim(),
            join_code: joinCode.trim().toUpperCase(),
            role: role,
            phone: phone.trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'حدث خطأ غير متوقع');
        setLoading(false);
        return;
      }

      setSuccess(data.message);

      // Auto-login after 1.5 seconds
      setTimeout(async () => {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (!signInError) {
          navigate('/office', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      }, 1500);
    } catch {
      setError('تعذر الاتصال بالخادم. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const getFieldClass = (name: string, value: string) => {
    if (!showValidation) return '';
    if (!value.trim()) return 'input-error';
    if (name === 'phone' && value.trim().length !== 10) return 'input-error';
    return '';
  };

  return (
    <div className="join-page">
      <div className="global-watermark"></div>
      <div className="glass-container">
        <div className="glass login-card">
          <button onClick={() => navigate('/')} className="home-back-btn" title="الرئيسية">
            <Home size={20} />
          </button>

          <button onClick={toggleTheme} className="home-theme-toggle-btn" title={theme === 'light' ? 'الوضع الداكن' : 'الوضع المضيء'}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} style={{ color: '#fbbf24' }} />}
          </button>
          <div className="login-header">
            <img src="/logo.png" alt="كفيل" className="login-logo" />
            <div className="login-title">
              <UserPlus size={24} className="accent-icon" />
              <h2>انضمام لمكتب</h2>
            </div>
            <p className="login-subtitle">
              أدخل رمز الانضمام الذي حصلت عليه من مدير المكتب
            </p>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <CheckCircle2 size={18} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="login-form">
            <div className="input-group">
              <label>
                <Key size={16} /> رمز الانضمام
              </label>
              <input
                type="text"
                className={`join-code-input ${getFieldClass('joinCode', joinCode)}`}
                required
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="AB3F7K"
                maxLength={6}
                dir="ltr"
              />
            </div>

            <div className="input-group">
              <label>
                <User size={16} /> الاسم الكامل
              </label>
              <input
                type="text"
                className={getFieldClass('displayName', displayName)}
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="أحمد محمد"
              />
            </div>

            <div className="input-group">
              <label>
                <Mail size={16} /> البريد الإلكتروني
              </label>
              <input
                type="email"
                className={getFieldClass('email', email)}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                dir="ltr"
              />
            </div>

            <div className="input-group">
              <label>
                <Lock size={16} /> كلمة المرور
              </label>
              <input
                type="password"
                className={getFieldClass('password', password)}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                dir="ltr"
              />
            </div>

            <div className="input-group">
              <label>
                <User size={16} /> المسمى الوظيفي
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="role-select"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--navy-800)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                <option value="manager">مدير مكتب</option>
                <option value="accountant">محاسب</option>
                <option value="staff">إدخال بيانات</option>
              </select>
            </div>

            <div className="input-group">
              <label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  رقم الهاتف
                </div>
              </label>
              <input
                type="tel"
                className={getFieldClass('phone', phone)}
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="091XXXXXXX"
                maxLength={10}
                dir="ltr"
              />
              <p className="input-hint" style={{ fontSize: '0.75rem', marginTop: '0.4rem', color: 'var(--text-tertiary)' }}>
                رقم الهاتف يتيح لك استعادة حسابك في حال نسيان الرمز
              </p>
            </div>

            <div className="terms-checkbox-group" style={{ margin: '1.25rem 0', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <input
                type="checkbox"
                id="agreeToTerms"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                className="custom-terms-checkbox"
                required
              />
              <label htmlFor="agreeToTerms" className="terms-label" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4', cursor: 'pointer', userSelect: 'none' }}>
                أوافق على{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="btn-link"
                  style={{ display: 'inline', padding: 0, border: 'none', background: 'none', color: 'var(--accent-primary)', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                >
                  شروط وأحكام اتفاقية الاستخدام
                </button>{' '}
                الخاصة بالمنصة ومطورها تحت طائلة القانون الليبي والضوابط الشرعية.
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
            >
              {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب والانضمام'}
            </button>
          </form>

          <div className="login-footer">
            <p>
              لديك حساب؟{' '}
              <button onClick={() => navigate('/login')} className="btn-link">
                تسجيل الدخول
              </button>
            </p>
          </div>
        </div>
      </div>

      {showTermsModal && (
        <div className="modal-backdrop">
          <div className="modal-content terms-modal" dir="rtl">
            <div className="modal-header">
              <h3>شروط وأحكام اتفاقية الاستخدام لمنصة كفيل</h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setShowTermsModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body terms-body">
              <div className="legal-intro">
                تُبرم هذه الاتفاقية القانونية والشرعية الملزمة بين الجهة المطورة والمالكة لمنصة "كفيل" (ويشار إليها لاحقاً بـ "المنصة" أو "المطور/المالك") وبين أي مستخدم أو مكتب تمويل يقوم بإنشاء حساب أو استخدام النظام.
              </div>

              <div className="legal-section">
                <h4>المادة 1: طبيعة الخدمة والصفة الاسترشادية</h4>
                <p>منصة "كفيل" هي نظام سحابي لإدارة ومحاكاة المعاملات الحسابية والإدارية لمكاتب التمويل (مثل حاسبة المرابحة للسيارات، إدارة أقساط المستفيدين، وأرشفة الكفلاء). جميع النتائج الحسابية والتقارير المستخرجة هي نتائج تقريبية استرشادية مبنية على المدخلات الرقمية للمستخدم، ولا تُعتبر عقوداً إلزامية أو التزامات تعاقدية إلا إذا صِيغت ورقياً وجرى توقيعها واعتمادها رسمياً من الأطراف المختصة وفق الدورة المستندية الرسمية.</p>
              </div>

              <div className="legal-section">
                <h4>المادة 2: إخلاء المسؤولية المطلق والحد الأقصى للمسؤولية (Limitation of Liability)</h4>
                <p>لا يتحمل المطورون أو المالك بأي حال من الأحوال المسؤولية عن أي أضرار مباشرة، غير مباشرة، عرضية، تبعية، أو خاصة (بما في ذلك خسارة الأرباح الفائتة، أو تعطل الأعمال، أو خسارة البيانات المالية أو الشخصية، أو أخطاء المدخلات) الناتجة عن استخدام أو عدم القدرة على استخدام المنصة. والحد الأقصى المطلق لأي تعويض مالي يمكن أن يطالب به المستخدم لا يمكن أن يتجاوز 100 دينار ليبي كحد أقصى مطلق في جميع الأحوال.</p>
              </div>

              <div className="legal-section">
                <h4>المادة 3: الحماية بموجب قانون مكافحة الجرائم الإلكترونية الليبي (رقم 5 لسنة 2022 م)</h4>
                <p>يُقر المستخدم بأن أي محاولة للوصول غير المصرح به لقاعدة البيانات، أو قرصنتها، أو تعديل شفرتها البرمجية، أو استخراج أكوادها وتصميمها، أو عمل هندسة عكسية (Reverse Engineering) لأي جزء من النظام يعد جريمة إلكترونية يعاقب عليها بموجب القانون الليبي لمكافحة الجرائم الإلكترونية، وسيتخذ المطورون والمالك كافة الإجراءات القانونية والملاحقة الجنائية والمدنية الفورية أمام الجهات القضائية الليبية.</p>
              </div>

              <div className="legal-section">
                <h4>المادة 4: القوة القاهرة وانقطاع الخدمة (القانون المدني الليبي)</h4>
                <p>يخلي المطورون والمالك مسؤوليتهم الكاملة عن أي توقف مؤقت أو دائم للنظام، أو فقدان جزئي للبيانات ناتج عن ظروف قسرية خارجة عن الإرادة المباشرة، ويشمل ذلك انقطاعات التيار الكهربائي، وتذبذب شبكة الإنترنت في ليبيا، أو أعطال خوادم الاستضافة العالمية، وتُعتبر جميعها من قبيل القوة القاهرة والظروف الطارئة المنصوص عليها في القانون المدني الليبي والتي تعفي تماماً من أي التزام بالضمان أو التعويض.</p>
              </div>

              <div className="legal-section">
                <h4>المادة 5: الالتزام بالضوابط الشرعية والمعاملات الإسلامية (قانون رقم 1 لسنة 2013 م)</h4>
                <p>تلتزم المنصة بتوفير البيئة الحسابية للمرابحة كأداة برمجية استرشادية خالية من الفوائد المركبة. وتقع المسؤولية الشرعية والقانونية كاملة على عاتق الجهة المستخدِمة (المكتب) للتأكد من استيفاء المعاملات الفعلية وعقود بيع المرابحة المبرمة للضوابط الشرعية الصادرة عن الهيئات الفقهية المعتمدة ومصرف ليبيا المركزي (مثل قبض السلعة وتملكها قبل بيعها). ويبرأ المطورون تماماً من أي انحراف عن الصيغ الشرعية المعتمدة أو سوء تطبيق آليات التمويل من قبل المستخدمين.</p>
              </div>

              <div className="legal-section">
                <h4>المادة 6: الملكية الفكرية وحظر الاقتباس والنسخ</h4>
                <p>جميع الحقوق البرمجية، والأكواد المصدرية، وقواعد البيانات، والهياكل الهندسية، واجهات المستخدم، الشعارات والتصاميم هي ملكية فكرية حصرية ومحمية بموجب قانون حماية حق المؤلف والحقوق المجاورة الليبي. ويُمنع منعاً باتاً نسخ أو اقتباس أو ترجمة أي جزء من النظام لإنشاء منصة منافسة أو لأي استخدام آخر.</p>
              </div>

              <div className="legal-section">
                <h4>المادة 7: مكافحة الاحتيال وغسيل الأموال والضمان والتعويض</h4>
                <p>يتعهد المستخدم بعدم استخدام المنصة لتسهيل أي أنشطة احتيالية، أو تمويل غير مشروع، أو غسيل أموال، أو إدخال كفالات مزورة أو وهمية. ويتحمل المستخدم وحده المسؤولية الجنائية الكاملة عن أي بيانات يتم إدخالها للنظام. ويلتزم بتعويض المطورين/المالك تعويضاً فورياً عن أي أضرار أو غرامات أو ملاحقات قضائية تنشأ نتيجة إساءة استخدامه للحساب.</p>
              </div>

              <div className="legal-section">
                <h4>المادة 8: الاختصاص القضائي وفض النزاعات</h4>
                <p>تخضع هذه الاتفاقية وتفسر وفقاً للقوانين النافذة في دولة ليبيا بما لا يتعارض مع الشريعة الإسلامية. وفي حال حدوث أي نزاع متعذر حله ودياً، يكون الاختصاص القضائي الحصري والوحيد للمحاكم الليبية المختصة في مدينة طرابلس.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setAgreeToTerms(true);
                  setShowTermsModal(false);
                }}
              >
                موافق، قبول الشروط والاتفاقية
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowTermsModal(false)}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
