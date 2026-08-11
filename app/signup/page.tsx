import { redirect } from 'next/navigation';

export default function SignupPage() {
  redirect(
    '/login?message=' +
      encodeURIComponent(
        'WorkflowOS accounts are managed by GadgetPoint. Staff access must be created by the GadgetPoint owner.'
      )
  );
}
