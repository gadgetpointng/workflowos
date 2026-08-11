import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error:
        'WorkflowOS does not create staff accounts. Create and manage staff access in GadgetPoint Admin.',
    },
    { status: 403 }
  );
}
