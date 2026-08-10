'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function signup(formData: FormData) {
  const fullName = String(formData.get('fullName') || '').trim();
  const organizationName = String(formData.get('organizationName') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');

  if (fullName.length < 2 || organizationName.length < 2) {
    redirect('/signup?error=' + encodeURIComponent('Enter your name and workspace name.'));
  }
  if (!email.includes('@') || password.length < 8) {
    redirect('/signup?error=' + encodeURIComponent('Use a valid email and a password of at least 8 characters.'));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        organization_name: organizationName,
        workflowos_signup: true
      }
    }
  });

  if (error) redirect('/signup?error=' + encodeURIComponent(error.message));
  if (data.session) redirect('/dashboard');
  redirect('/login?message=' + encodeURIComponent('Account created. Check your email to confirm your address, then sign in.'));
}
