import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Setup environment and paths
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const SHOWCASE_DIR = 'public/showcase';
if (!fs.existsSync(SHOWCASE_DIR)) {
  fs.mkdirSync(SHOWCASE_DIR, { recursive: true });
}

// Helper to accept terms programmatically by signing in via supabase client
async function acceptTermsForUser(email, password) {
  console.log(`Attempting to accept terms in database for ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) {
    console.log(`Note: Sign in via supabase client failed/skipped for ${email} (probably user doesn't exist yet):`, error.message);
    return;
  }
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({ 
      accepted_terms: true,
      accepted_terms_at: new Date().toISOString()
    })
    .eq('id', data.user.id);
  
  if (updateError) {
    console.error(`Update terms failed for ${email}:`, updateError);
  } else {
    console.log(`Successfully accepted terms in DB for ${email}`);
  }
  await supabase.auth.signOut();
}

// Clean up DB function to make tests idempotent
async function prepareDatabase() {
  console.log('--- Preparing Database for QA Audit ---');

  // Log in as admin to bypass RLS or do queries
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@kafeel.ly',
    password: 'KafeelAdmin2026'
  });
  if (authError) {
    console.error('Sign in as admin failed:', authError);
    return;
  }
  console.log('Admin signed in for DB prep.');

  // Set accepted_terms to true for all test profiles
  const { error: termsError } = await supabase
    .from('user_profiles')
    .update({ accepted_terms: true, accepted_terms_at: new Date().toISOString() })
    .in('display_name', ['Staff One', 'Accountant One', 'Abu Bakr', 'المراقب العام']);
  if (termsError) {
    console.error('Error updating accepted_terms:', termsError);
  } else {
    console.log('Terms of service accepted for test staff/manager/monitor profiles.');
  }

  // Find and clean up test customer
  const { data: customers } = await supabase
    .from('customers')
    .select('id')
    .eq('name', 'محمد الزبون المحتمل');

  if (customers && customers.length > 0) {
    for (const customer of customers) {
      console.log(`Cleaning up customer ID: ${customer.id}`);
      // Find transactions
      const { data: txs } = await supabase
        .from('transactions')
        .select('id')
        .eq('customer_id', customer.id);

      if (txs && txs.length > 0) {
        const txIds = txs.map(t => t.id);
        // Delete guarantors
        await supabase.from('transaction_guarantors').delete().in('transaction_id', txIds);
        // Delete financial requests
        await supabase.from('financial_requests').delete().in('transaction_id', txIds);
        // Delete transactions
        await supabase.from('transactions').delete().in('id', txIds);
      }
      
      // Delete customer
      await supabase.from('customers').delete().eq('id', customer.id);
    }
  }

  // Clean up guarantor
  await supabase.from('customers').delete().eq('name', 'صالح الضامن الأول');

  // Clean up potential customer
  await supabase.from('potential_customers').delete().eq('name', 'محمد الزبون المحتمل');
  await supabase.from('potential_customer_logs').delete().eq('customer_name', 'محمد الزبون المحتمل');

  // Log out admin
  await supabase.auth.signOut();
  console.log('Database preparation complete.');
}

async function run() {
  await prepareDatabase();

  console.log('Starting Playwright QA Audit flow...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 }
  });
  const page = await context.newPage();

  // Listen for console and page errors
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  // Helper for delays
  const delay = ms => new Promise(res => setTimeout(res, ms));

  // STEP 1: Phase 3 Sub-account Registration & Quota Limit Check
  console.log('--- Phase 3: Registering sub-accounts & Quota Validation ---');

  // Helper function to join office
  async function registerUser(email, name, phone, role) {
    console.log(`Navigating to register ${email} as ${role}...`);
    await page.goto('http://localhost:5174/join');
    await page.waitForSelector('.join-code-input');

    await page.fill('.join-code-input', '16DA92');
    await page.fill('input[placeholder="أحمد محمد"]', name);
    await page.fill('input[placeholder="user@example.com"]', email);
    await page.fill('input[placeholder="••••••••"]', 'SecurePassword123');
    await page.fill('input[placeholder="091XXXXXXX"]', phone);
    await page.selectOption('.role-select', role);
    await page.click('#agreeToTerms');

    // Click submit
    await page.click('button[type="submit"]');
    await delay(3000);
  }

  // Register staff1@kafeel.ly
  await registerUser('staff1@kafeel.ly', 'Staff One', '0911234567', 'staff');
  console.log('Registration for staff1 completed/checked.');
  await acceptTermsForUser('staff1@kafeel.ly', 'SecurePassword123');

  // Register accountant1@kafeel.ly
  await registerUser('accountant1@kafeel.ly', 'Accountant One', '0911234568', 'accountant');
  console.log('Registration for accountant1 completed/checked.');
  await acceptTermsForUser('accountant1@kafeel.ly', 'SecurePassword123');

  // Register 4th user to check quota error
  let alertText = '';
  page.on('dialog', async dialog => {
    alertText = dialog.message();
    console.log('Dialog popped up with message:', alertText);
    await dialog.dismiss();
  });

  await registerUser('user4@kafeel.ly', 'User Four', '0911234569', 'staff');
  await delay(2000);

  // Check quota limit error
  const pageText = await page.innerText('body');
  if (alertText.includes('الحد الأقصى') || pageText.includes('الحد الأقصى') || alertText.includes('max_users') || pageText.includes('max_users')) {
    console.log('✅ Quota limit error verified successfully!');
  } else {
    console.log('Note: Current page content:', pageText.slice(0, 300));
  }

  // STEP 2: Log in as accountant1@kafeel.ly & Capture Golden Padlock banner on Reports
  console.log('--- Phase 3 (continued): Capturing Golden Padlock ---');
  await page.goto('http://localhost:5174/login');
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'accountant1@kafeel.ly');
  await page.fill('input[type="password"]', 'SecurePassword123');
  await page.click('button[type="submit"]');
  await delay(3000);

  // Since Accountant defaults to the Reports page, take screenshot immediately
  await page.screenshot({ path: `${SHOWCASE_DIR}/06_golden_padlock_gate.png` });
  console.log('Saved 06_golden_padlock_gate.png');

  // Log out of accountant
  await page.click('text=خروج');
  await delay(2000);

  // STEP 3: Log in as staff1@kafeel.ly for Lead & Calculator flow
  console.log('--- Phase 4 & 5: Lead & Customer Flow as Staff ---');
  await page.goto('http://localhost:5174/login');
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'staff1@kafeel.ly');
  await page.fill('input[type="password"]', 'SecurePassword123');
  await page.click('button[type="submit"]');
  await delay(3000);

  // Go to Potential Customers tab
  await page.click('text=الزبائن');
  await delay(1000);
  await page.click('text=الزبائن المحتملين');
  await delay(1500);
  await page.screenshot({ path: `${SHOWCASE_DIR}/07_leads_potential_customers.png` });
  console.log('Saved 07_leads_potential_customers.png');

  // Add a new potential customer
  console.log('Creating a new potential customer...');
  await page.click('text=تسجيل زبون محتمل جديد');
  await delay(500);
  await page.fill('input[placeholder*="الاسم الكامل للزبون"], input[placeholder*="أدخل الاسم رباعياً"]', 'محمد الزبون المحتمل');
  await page.fill('input[placeholder*="09XXXXXXXX"], input[placeholder="09XXXXXXXX"]', '0921234567');
  await page.fill('input[placeholder="صافي المرتب"]', '3200');
  
  // Select first available workplace option
  await page.selectOption('form select', { index: 1 });
  // Fill notes textarea
  await page.fill('textarea', 'يحتاج إلى حاسبة مرابحة سريعة لسيارة كيا سبورتيج');
  
  await page.click('button:has-text("حفظ البيانات")');
  await delay(2000);

  // Click "Convert to active"
  console.log('Converting potential customer to active customer...');
  await page.click('button:has-text("تسجيل كزبون نشط")');
  await delay(1500);

  // Scope to Beneficiary Form
  const beneficiaryForm = page.locator('.calc-grid').first();

  // Fill the remaining fields of the Customer Form
  await page.fill('input[placeholder*="أدخل رقم الحساب الجاري"]', '123456789012345');
  
  // Select Bank for Beneficiary
  await beneficiaryForm.locator('.searchable-select-trigger').nth(0).click();
  await delay(500);
  await beneficiaryForm.locator('input[placeholder="بحث عن مصرف..."]').fill('مصرف الجمهورية');
  await beneficiaryForm.locator('div.searchable-option').first().click();
  await delay(500);

  // Select Branch for Beneficiary
  await beneficiaryForm.locator('.searchable-select-trigger').nth(1).click();
  await delay(500);
  await beneficiaryForm.locator('input[placeholder="بحث عن فرع..."]').fill('فرع الميدان');
  await beneficiaryForm.locator('div.searchable-option').first().click();
  await delay(500);

  // Select Workplace for Beneficiary
  await beneficiaryForm.locator('.searchable-select-trigger').nth(2).click();
  await delay(500);
  await beneficiaryForm.locator('input[placeholder="بحث..."]').fill('وزارة التعليم');
  await beneficiaryForm.locator('div.searchable-option').first().click();
  await delay(500);

  // Fill National ID and Phone for Beneficiary
  await page.fill('input[placeholder="أدخل الرقم الوطني (12 رقم)"] >> nth=0', '119951234567');
  await page.fill('input[placeholder="09XXXXXXXX"] >> nth=0', '0921234567');

  // Toggle "Has Guarantor" checkbox
  console.log('Toggling guarantor checkbox...');
  await page.locator('label').filter({ hasText: 'هل يوجد ضامن؟' }).locator('input[type="checkbox"]').click();
  
  // Wait for the guarantor section to appear
  await page.waitForSelector('input[placeholder="الاسم الكامل للضامن"]');
  console.log('Guarantor section opened.');

  // Scope to Guarantor 1 Form
  const guarantor1Form = page.locator('.customer-section-wrapper').filter({ hasText: 'بيانات الضامن الأول' });

  // Fill Guarantor 1
  await guarantor1Form.locator('input[placeholder="الاسم الكامل للضامن"]').fill('صالح الضامن الأول');
  await guarantor1Form.locator('input[placeholder="مثال: 2500"]').fill('3100');
  await guarantor1Form.locator('input[placeholder="09XXXXXXXX"]').fill('0922345678');
  await guarantor1Form.locator('input[placeholder="أدخل الرقم الوطني (12 رقم)"]').fill('119967654321');

  // Select Bank for Guarantor
  await guarantor1Form.locator('.searchable-select-trigger').nth(0).click(); 
  await delay(500);
  await guarantor1Form.locator('input[placeholder="بحث عن مصرف..."]').fill('مصرف الجمهورية');
  await guarantor1Form.locator('div.searchable-option').first().click();
  await delay(500);

  // Select Branch for Guarantor
  await guarantor1Form.locator('.searchable-select-trigger').nth(1).click();
  await delay(500);
  await guarantor1Form.locator('input[placeholder="بحث عن فرع..."]').fill('فرع الميدان');
  await guarantor1Form.locator('div.searchable-option').first().click();
  await delay(500);

  // Select Workplace for Guarantor
  await guarantor1Form.locator('.searchable-select-trigger').nth(2).click();
  await delay(500);
  await guarantor1Form.locator('input[placeholder="بحث..."]').fill('وزارة الداخلية');
  await guarantor1Form.locator('div.searchable-option').first().click();
  await delay(500);

  // Take unified registration form screenshot
  await page.screenshot({ path: `${SHOWCASE_DIR}/08_unified_registration_form.png` });
  console.log('Saved 08_unified_registration_form.png');

  // Diagnostics
  console.log('--- DIAGNOSTICS BEFORE SUBMIT ---');
  try {
    console.log('Beneficiary Name:', await page.locator('input[placeholder="الاسم الكامل للزبون"]').inputValue());
    console.log('Beneficiary Salary:', await page.locator('input[placeholder="مثال: 2500"] >> nth=0').inputValue());
    console.log('Beneficiary Phone:', await page.locator('input[placeholder="09XXXXXXXX"] >> nth=0').inputValue());
    console.log('Beneficiary Account:', await page.locator('input[placeholder="أدخل رقم الحساب الجاري"]').inputValue());
    console.log('Beneficiary National ID:', await page.locator('input[placeholder="أدخل الرقم الوطني (12 رقم)"] >> nth=0').inputValue());
    
    // Check dropdowns
    console.log('Beneficiary Bank Select Text:', await beneficiaryForm.locator('.searchable-select-trigger').nth(0).innerText());
    console.log('Beneficiary Branch Select Text:', await beneficiaryForm.locator('.searchable-select-trigger').nth(1).innerText());
    console.log('Beneficiary Workplace Select Text:', await beneficiaryForm.locator('.searchable-select-trigger').nth(2).innerText());

    const saveBtn = page.locator('button:has-text("حفظ وتسجيل المعاملة")');
    console.log('Button Exists:', await saveBtn.count() > 0);
    console.log('Button Visible:', await saveBtn.isVisible());
    console.log('Button Enabled:', await saveBtn.isEnabled());
    console.log('Button Text:', await saveBtn.innerText());
  } catch (diagErr) {
    console.log('Diagnostics collection failed:', diagErr.message);
  }
  console.log('---------------------------------');

  // Submit and go to calculator
  await page.click('button:has-text("حفظ وتسجيل المعاملة")');
  await delay(3000);

  // STEP 4: Phase 5 (continued): Calculator
  console.log('--- Phase 5 (continued): Calculator ---');
  await page.waitForSelector('input#carPrice');
  await page.fill('input#carPrice', '95000');
  await delay(1000);

  // Take calculator screenshot (visualizing down payment components)
  await page.screenshot({ path: `${SHOWCASE_DIR}/09_reactive_financial_calculator.png` });
  console.log('Saved 09_reactive_financial_calculator.png');

  // Click Save and go to Financial Request
  await page.click('button:has-text("حفظ المعاملة ومتابعة المستندات")');
  await delay(3000);

  // STEP 5: Phase 6: Financial Requests
  console.log('--- Phase 6: Financial Request ---');
  await page.waitForSelector('form input[placeholder*="5,000"]');
  await page.fill('form input[placeholder*="5,000"]', '85000');
  await page.fill('textarea', 'طلب تمويل شراء سيارة');
  await page.click('button:has-text("إرسال الطلب لمدير المكتب")');
  await delay(2000);
  console.log('Financial request submitted.');

  // STEP 6: Phase 7: Document Submission
  console.log('--- Phase 7: Document Upload & Approval ---');
  await page.click('text=المستندات');
  await delay(1500);
  
  // Since uploading file from filesystem is optional, we can just click "Confirm and submit for review"
  await page.click('button:has-text("تأكيد وإرسال المعاملة للمراجعة")');
  await delay(3000);

  // Log out of staff
  await page.click('text=خروج');
  await delay(2000);

  // Log in as Office Manager (abubakr@kafeel.ly)
  await page.goto('http://localhost:5174/login');
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'abubakr@kafeel.ly');
  await page.fill('input[type="password"]', 'SecurePassword123');
  await page.click('button[type="submit"]');
  await delay(3000);

  // Navigate to waiting queue
  await page.click('text=قائمة الانتظار');
  await delay(2000);
  
  // Take document approval widget screenshot showing the queue
  await page.screenshot({ path: `${SHOWCASE_DIR}/10_document_approval_widget.png` });
  console.log('Saved 10_document_approval_widget.png');

  // Approve the documents
  await page.click('button:has-text("اعتماد المستندات")');
  await delay(2500);

  // Find matches (attempt matchmaking)
  await page.click('button:has-text("بحث عن ضامن")');
  await delay(3000);
  console.log('Matchmaking search completed.');

  // Log out of manager
  await page.click('text=خروج');
  await delay(2000);

  // STEP 7: Log in as Operations Monitor (monitor@kafeel.ly)
  console.log('--- Phase 7 (continued): Operations Monitor ---');
  await page.goto('http://localhost:5174/login');
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'monitor@kafeel.ly');
  await page.fill('input[type="password"]', 'MonitorKafeel2026');
  await page.click('button[type="submit"]');
  await delay(3000);

  // By default we are on /monitor dashboard (Queue & Matchmaking)
  await page.screenshot({ path: `${SHOWCASE_DIR}/04_monitor_dashboard.png` });
  console.log('Saved 04_monitor_dashboard.png');

  // Go to Logistics staging tab/section
  await page.click('text=المخزون');
  await delay(1500);
  await page.screenshot({ path: `${SHOWCASE_DIR}/11_logistics_cargo_freight.png` });
  console.log('Saved 11_logistics_cargo_freight.png');

  // Log out of monitor
  await page.click('text=خروج');
  await delay(2000);

  // STEP 8: Phase 8: Settlements
  console.log('--- Phase 8: Post-Delivery Settlements ---');
  // Log in as manager (abubakr@kafeel.ly)
  await page.goto('http://localhost:5174/login');
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'abubakr@kafeel.ly');
  await page.fill('input[type="password"]', 'SecurePassword123');
  await page.click('button[type="submit"]');
  await delay(3000);

  // Go to settlements tab
  await page.click('text=التسويات');
  await delay(2000);
  await page.screenshot({ path: `${SHOWCASE_DIR}/12_post_delivery_settlements.png` });
  console.log('Saved 12_post_delivery_settlements.png');

  console.log('Audit flow completed successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('Error during QA Audit flow execution:', err);
});
