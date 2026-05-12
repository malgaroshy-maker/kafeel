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

    // Verify Admin Authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Unauthorized')
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) throw new Error('Unauthorized')

    // Check if user is admin in user_profiles
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') throw new Error('Forbidden: Admin only')

    const { action, ...payload } = await req.json()

    switch (action) {
      case 'create_office': {
        const { name, max_users } = payload
        const join_code = Math.random().toString(36).substring(2, 8).toUpperCase()
        const { data, error } = await supabaseClient
          .from('offices')
          .insert({ name, max_users, join_code })
          .select()
          .single()
        if (error) throw error
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'regenerate_join_code': {
        const { office_id } = payload
        const new_code = Math.random().toString(36).substring(2, 8).toUpperCase()
        const { data, error } = await supabaseClient
          .from('offices')
          .update({ join_code: new_code })
          .eq('id', office_id)
          .select()
          .single()
        if (error) throw error
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'update_role': {
        const { user_id, new_role } = payload
        const { error } = await supabaseClient
          .from('user_profiles')
          .update({ role: new_role })
          .eq('id', user_id)
        if (error) throw error

        // Sync to app_metadata
        await supabaseClient.auth.admin.updateUserById(user_id, {
          app_metadata: { role: new_role }
        })
        
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'reset_password': {
        const { user_id, new_password } = payload
        const { error } = await supabaseClient.auth.admin.updateUserById(user_id, {
          password: new_password
        })
        if (error) throw error
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'deactivate_user': {
        const { user_id } = payload
        const { error: pError } = await supabaseClient
          .from('user_profiles')
          .update({ is_active: false })
          .eq('id', user_id)
        if (pError) throw pError

        // Also ban in auth
        const { error: aError } = await supabaseClient.auth.admin.updateUserById(user_id, {
          ban_duration: 'none' // Or 'permanent' depending on version, usually just disable is enough
        })
        // In Supabase, you can delete or just set is_active. We prefer is_active for audit.
        
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
