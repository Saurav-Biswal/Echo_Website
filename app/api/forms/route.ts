import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { validateLeadPayload } from '@/lib/lead-validation.mjs';
import { createWebsiteFormsClient, getWebsiteFormsConfigurationStatus } from '@/lib/supabase-server';
import { notifyPrivacyRequest } from '@/lib/privacy-notifications';
import { persistFormAndNotify, PRIVACY_NOTIFICATION_RECIPIENT } from '@/lib/privacy-notification-core.mjs';

export const runtime = 'nodejs';

export async function POST(request:Request){
  const length=Number(request.headers.get('content-length')||0);if(length>10_000)return NextResponse.json({error:'This message is too large.'},{status:413});
  let data:Record<string,unknown>;try{data=await request.json()}catch{return NextResponse.json({error:'Please check the form and try again.'},{status:400})}
  if(typeof data.website==='string'&&data.website)return NextResponse.json({error:'Submission could not be processed.'},{status:400});
  const validated=validateLeadPayload(data,new Date().toISOString());
  if(!validated.ok)return NextResponse.json({error:validated.error},{status:400});
  const {kind,record}=validated;
  if(!record)return NextResponse.json({error:'Please check the form and try again.'},{status:400});
  const table=kind==='waitlist'?(process.env.WAITLIST_TABLE||'waitlist_signups'):(process.env.CONTACT_TABLE||'contact_messages');
  const client=createWebsiteFormsClient();
  if(!client){
    const config=getWebsiteFormsConfigurationStatus();
    console.error('[forms] Supabase configuration missing', config);
    return NextResponse.json({error:'Submissions are not available yet. The Echo team has not connected its secure form service.'},{status:503});
  }
  // The row shape is selected above by the validated form kind; the migration
  // keeps these two website-only tables separate.
  const submissionId=randomUUID();
  const submittedAt=record.consent_at;
  const result=await persistFormAndNotify({
    kind,
    record,
    submissionId,
    submittedAt,
    insert: (row: Record<string, unknown>) => client.from(table).insert(row as never),
    notify: notifyPrivacyRequest,
  });
  if(!result.stored){
    const error=result.error;
    // Log only provider error metadata. Never log the request, row, error message,
    // URL, or credentials because provider messages can contain sensitive data.
    if(result.databaseFailure){
      console.error('[forms] Supabase insert failed', { code:null, kind });
      return NextResponse.json({error:'We couldn’t save your message just now. Please try again later.'},{status:503});
    }
    if(!error)return NextResponse.json({error:'We couldn’t save your message just now. Please try again later.'},{status:503});
    console.error('[forms] Supabase insert failed', { code:error.code ?? null, kind });
    if(error.code==='23505'&&kind==='waitlist')return NextResponse.json({message:'Thanks for your interest in Echo.'});
    return NextResponse.json({error:'We couldn’t save your message just now. Please try again later.'},{status:503});
  }
  if(result.notification==='failed'){
    console.error('[forms] Privacy notification failed after request was saved', { kind, ...result.notificationFailure });
    return NextResponse.json({message:`Your privacy request was saved, but its automatic email alert could not be submitted. Please email ${PRIVACY_NOTIFICATION_RECIPIENT} if you need to follow up.`});
  }
  if(result.notification==='accepted'){
    console.info('[forms] SMTP accepted privacy notification', { kind, submissionId:result.submissionId });
    return NextResponse.json({message:'Your privacy request was saved. The email server accepted an automatic alert; this does not confirm inbox delivery, human review, or completion.'});
  }
  return NextResponse.json({message:kind==='waitlist'?'You’re on the early-access list. Thanks for your interest.':'Your message was received. Thanks for getting in touch.'});
}
