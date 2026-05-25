import { supabase } from '../lib/supabase';

export interface AuditLogInput {
  officeId: string;
  userId?: string;
  userName?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
}

export async function logAction(input: AuditLogInput) {
  const payload = {
    office_id: input.officeId,
    user_id: input.userId || null,
    user_name: input.userName || 'موظف غير معروف',
    action: input.action,
    entity_type: input.entityType || null,
    entity_id: input.entityId || null,
    details: input.details || '',
    severity: input.severity || 'INFO',
    created_at: new Date().toISOString()
  };

  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert(payload);

    if (error) {
      console.warn('Database audit logging failed, falling back to local storage:', error.message);
      logToLocalFallback(payload);
    }
  } catch (err: any) {
    console.error('Audit logging error, falling back to local storage:', err);
    logToLocalFallback(payload);
  }
}

function logToLocalFallback(payload: any) {
  const officeId = payload.office_id;
  if (!officeId) return;

  const key = `kafeel_audit_logs_${officeId}`;
  try {
    const existing = localStorage.getItem(key);
    const logs = existing ? JSON.parse(existing) : [];
    
    // Add unique UUID for local tracking
    const newLog = {
      id: crypto.randomUUID(),
      ...payload
    };
    
    logs.unshift(newLog);
    
    // Keep last 500 logs locally to prevent memory bloat
    if (logs.length > 500) {
      logs.length = 500;
    }
    
    localStorage.setItem(key, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to write to local audit log fallback:', e);
  }
}
