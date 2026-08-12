import { redirect } from 'next/navigation';

export default function OwnerAccessPage() {
  redirect(
    '/login?message=' +
      encodeURIComponent(
        'Owner access is managed through GadgetPoint. Use the GadgetPoint owner sign-in or the owner-only ChatGPT route.'
      )
  );
}
