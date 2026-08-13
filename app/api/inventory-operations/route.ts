import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createIntegrationCommand } from '@/lib/integrations/commands';

const allowedOperations = new Set(['receive','damage','count','correction']);

export async function GET() {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: integration } = await supabase
    .from('external_integrations')
    .select('id,name,slug,status')
    .eq('organization_id', profile.organization_id)
    .eq('slug', 'gadgetpoint')
    .neq('status', 'disabled')
    .maybeSingle();

  const { data: products, error } = await supabase
    .from('connected_products')
    .select('id,external_product_id,sku,name,category,stock_quantity,metadata,last_synced_at')
    .eq('organization_id', profile.organization_id)
    .eq('active', true)
    .order('name');

  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ integration, products: products ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user, profile } = await requireUser();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const operation = String(body.operation ?? '').trim().toLowerCase();
  const productId = String(body.product_id ?? '').trim();
  const branchId = String(body.branch_id ?? '').trim();
  const quantity = Number(body.quantity);
  const reason = String(body.reason ?? '').trim().slice(0, 240);

  if (!allowedOperations.has(operation)) return NextResponse.json({ error: 'Choose a valid inventory operation' }, { status: 400 });
  if (!productId || !branchId || !Number.isInteger(quantity) || quantity < 0 || quantity > 10000) {
    return NextResponse.json({ error: 'Product, branch, and a valid whole-number quantity are required' }, { status: 400 });
  }
  if (!reason) return NextResponse.json({ error: 'Add a reason or receiving note' }, { status: 400 });

  const [{ data: integration }, { data: product }] = await Promise.all([
    supabase.from('external_integrations').select('id').eq('organization_id', profile.organization_id).eq('slug', 'gadgetpoint').neq('status', 'disabled').maybeSingle(),
    supabase.from('connected_products').select('external_product_id,name,stock_quantity,metadata').eq('organization_id', profile.organization_id).eq('external_product_id', productId).eq('active', true).maybeSingle(),
  ]);
  if (!integration) return NextResponse.json({ error: 'GadgetPoint Admin integration is not active' }, { status: 409 });
  if (!product) return NextResponse.json({ error: 'Product is not available in the Admin inventory mirror' }, { status: 404 });

  const branches = Array.isArray(product.metadata?.branches) ? product.metadata.branches : [];
  const branch = branches.find((item: any) => String(item?.branch_id) === branchId);
  const currentBranchStock = Number(branch?.stock ?? 0);
  let delta = quantity;
  if (operation === 'damage') delta = -quantity;
  if (operation === 'count') delta = quantity - currentBranchStock;
  if (operation === 'correction') delta = Number(body.delta);

  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 10000) {
    return NextResponse.json({ error: operation === 'count' ? 'The counted quantity already matches Admin stock' : 'Adjustment must change stock by a whole number' }, { status: 400 });
  }

  try {
    const command = await createIntegrationCommand({
      organizationId: profile.organization_id,
      integrationId: integration.id,
      commandType: 'inventory.adjust',
      targetEntityType: 'product',
      targetEntityId: productId,
      payload: {
        product_id: productId,
        product_name: product.name,
        branch_id: branchId,
        branch_name: branch?.branch_name ?? branchId,
        operation,
        quantity,
        delta,
        current_branch_stock: currentBranchStock,
        reason,
      },
      requestedBy: user.id,
      idempotencyKey: String(body.idempotency_key ?? crypto.randomUUID()),
    });
    return NextResponse.json({ data: command }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Could not request inventory change' }, { status: 400 });
  }
}
