import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ShieldCheck, LogOut, Check, AlertCircle } from 'lucide-react';

export function TermsOverlay() {
  const { user, acceptedTerms, setAcceptedTerms, signOut } = useAuth();
  const [agree, setAgree] = useState(false);
  const [hasRead, setHasRead] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);

  // If user is not logged in or has already accepted terms, render nothing
  if (!user || acceptedTerms) {
    return null;
  }

  const handleScroll = () => {
    if (!bodyRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = bodyRef.current;
    
    // Check if scrolled to bottom with a 35px threshold
    const reachedBottom = scrollHeight - scrollTop <= clientHeight + 35;
    if (reachedBottom && !hasRead) {
      setHasRead(true);
    }
  };

  const handleAccept = async () => {
    if (!agree || !hasRead) return;
    setSaving(true);
    setError('');

    try {
      const nowStr = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          accepted_terms: true,
          accepted_terms_at: nowStr
        })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      // Update local context state to immediately clear overlay
      setAcceptedTerms(true, nowStr);
    } catch (err) {
      console.error('Error accepting terms:', err);
      setError('حدث خطأ أثناء حفظ موافقتك. يرجى المحاولة مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 100000 }}>
      <div className="modal-content terms-modal" dir="rtl" style={{ maxWidth: '680px', transform: 'scale(1)', animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--glass-border)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0, color: 'var(--accent)', fontWeight: 800 }}>
            <ShieldCheck size={24} style={{ color: 'var(--accent)' }} />
            <span>اتفاقية شروط الاستخدام والأمان</span>
          </h3>
          <span className="badge" style={{ background: 'rgba(191, 149, 63, 0.12)', color: 'var(--primary)' }}>مطلوب مراجعتها أولاً ⚠️</span>
        </div>

        {/* Content Body */}
        <div 
          className="modal-body terms-body" 
          ref={bodyRef} 
          onScroll={handleScroll}
          style={{ 
            padding: '1.75rem', 
            maxHeight: '55vh', 
            overflowY: 'auto',
            borderBottom: '1px solid var(--glass-border)',
            background: 'var(--bg-secondary)'
          }}
        >
          <div className="legal-intro">
            تُبرم هذه الاتفاقية القانونية والشرعية الملزمة بين الجهة المطورة والمالكة لمنصة "كفيل" (ويشار إليها لاحقاً بـ "المنصة" أو "المطور/المالك") وبين أي مستخدم أو مكتب تمويل يقوم بإنشاء حساب أو استخدام النظام. يرجى التمرير وقراءة كامل البنود لتفعيل الحساب.
          </div>

          <div className="legal-section">
            <h4>المادة 1: طبيعة الخدمة والصفة الاسترشادية</h4>
            <p>منصة "كفيل" هي نظام سحابي لإدارة ومحاكاة المعاملات الحسابية والإدارية لمكاتب التمويل (مثل حاسبة المرابحة للسيارات، إدارة أقساط المستفيدين، وأرشفة الكفلاء). جميع النتائج الحسابية والتقارير المستخرجة هي نتائج تقريبية استرشادية مبنية على المدخلات الرقمية للمستخدم، ولا تُعتبر عقوداً إلزامية أو التزامات تعاقدية إلا إذا صِيغت ورقياً وجرى توقيعها واعتمادها رسمياً من الأطراف المختصة وفق الدورة المستندية الرسمية.</p>
          </div>

          <div className="legal-section">
            <h4>المادة 2: إخلاء المسؤولية المطلق والحد الأقصى للمسؤولية</h4>
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

        {/* Form and Actions */}
        <div style={{ padding: '1.25rem 1.75rem', background: 'var(--surface)' }}>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem', padding: '0.75rem 1rem' }}>
              <AlertCircle size={18} />
              <span style={{ fontSize: '0.85rem' }}>{error}</span>
            </div>
          )}

          {/* Scrolling hint / state indicator */}
          {!hasRead && (
            <div style={{ 
              textAlign: 'center', 
              fontSize: '0.82rem', 
              color: 'var(--text-tertiary)', 
              background: 'rgba(255,255,255,0.03)', 
              padding: '0.5rem', 
              borderRadius: '8px', 
              marginBottom: '1rem',
              border: '1px dashed var(--glass-border)'
            }}>
              👇 يرجى التمرير وقراءة الاتفاقية بالكامل حتى الأسفل لتفعيل زر القبول.
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', margin: '0.5rem 0 1.25rem 0' }}>
            <input 
              type="checkbox"
              id="accept-terms-checkbox"
              checked={agree}
              disabled={!hasRead}
              onChange={(e) => setAgree(e.target.checked)}
              className="custom-terms-checkbox"
              style={{ width: '20px', height: '20px', cursor: hasRead ? 'pointer' : 'not-allowed' }}
            />
            <label 
              htmlFor="accept-terms-checkbox" 
              style={{ 
                fontSize: '0.88rem', 
                color: hasRead ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                lineHeight: '1.45', 
                cursor: hasRead ? 'pointer' : 'not-allowed',
                userSelect: 'none'
              }}
            >
              <strong>لقد قرأت وفهمت البنود بالكامل وأقبل الالتزام بها</strong> تحت طائلة القانون الليبي والمسؤولية الشرعية.
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '1.25rem' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => signOut()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem', background: 'transparent', color: 'var(--text-secondary)' }}
            >
              <LogOut size={16} />
              <span>تسجيل الخروج</span>
            </button>

            <button 
              className="btn btn-primary"
              disabled={!hasRead || !agree || saving}
              onClick={handleAccept}
              style={{ 
                padding: '0.65rem 1.75rem', 
                fontSize: '0.9rem', 
                fontWeight: 750, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                boxShadow: hasRead && agree ? '0 4px 12px rgba(191, 149, 63, 0.25)' : 'none'
              }}
            >
              {saving ? (
                <span>جاري الحفظ...</span>
              ) : (
                <>
                  <Check size={18} />
                  <span>أوافق ودخول للنظام</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
