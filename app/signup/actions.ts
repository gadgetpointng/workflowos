'use server';

import { redirect } from 'next/navigation';

export async function signup() {
  redirect(
    '/login?message=' +
      encodeURIComponent(
        'WorkflowOS accounts cannot be created directly. Staff access is controlled by the GadgetPoint owner.'
      )
  );
}
