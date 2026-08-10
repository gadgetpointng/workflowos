import { NextResponse } from 'next/server'; import { requireUser } from '@/lib/auth';
export async function GET(){ const {user,profile}=await requireUser(); if(!user)return NextResponse.json({error:'Unauthorized'},{status:401}); return NextResponse.json({data:profile}); }
