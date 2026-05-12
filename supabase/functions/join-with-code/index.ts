import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, password, display_name, join_code, role: requestedRole, phone } = await req.json()

    if (!join_code) throw new Error('رمز الانضمام مطلوب')
    if (!phone) throw new Error('رقم الهاتف مطلوب لاستعادة الحساب')

    const allowedRoles = ['manager', 'accountant', 'staff']
    const role = allowedRoles.includes(requestedRole) ? requestedRole : 'staff'

    // 1. Verify Join Code
    const { data: office, error: officeError } = await supabaseClient
      .from('offices')
      .select('id, name, max_users, join_code_active, is_active')
      .eq('join_code', join_code)
      .single()

    if (officeError || !office) throw new Error('رمز الانضمام غير صالح')
    if (!office.join_code_active || !office.is_active) throw new Error('رمز الانضمام معطل حالياً')

    // 2. Check Capacity
    const { count, error: countError } = await supabaseClient
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('office_id', office.id)
      .eq('is_active', true)

    if (countError) throw countError
    if (count !== null && count >= office.max_users) {
      throw new Error(`عذراً، هذا المكتب وصل للحد الأقصى من المستخدمين (${office.max_users})`)
    }

    // 3. Create Auth User
    const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name }
    })

    if (authError) throw authError

    // 4. Create Profile
    const { error: profileError } = await supabaseClient
      .from('user_profiles')
      .insert({
        id: authUser.user.id,
        office_id: office.id,
        display_name: display_name,
        role: role,
        phone: phone,
        is_active: true
      })

    if (profileError) {
      await supabaseClient.auth.admin.deleteUser(authUser.user.id)
      throw profileError
    }

    // 5. Update Auth Metadata
    await supabaseClient.auth.admin.updateUserById(authUser.user.id, {
      app_metadata: { role, office_id: office.id }
    })

    const roleNames: Record<string, string> = {
      manager: 'مدير',
      accountant: 'محاسب',
      staff: 'موظف'
    }

    return new Response(
      JSON.stringify({ message: `تم الانضمام بنجاح لمكتب ${office.name} بصفتك ${roleNames[role] || role}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
