import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageKeys, PublicPage } from '@/components/site-pages';
import { site } from '@/config/site';

export function generateStaticParams(){return pageKeys().map(slug=>({slug}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const titles:Record<string,string>={product:'Product overview',features:'Features',pricing:'Pricing',about:'About Echo',contact:'Contact', 'early-access':'Get early access',faq:'Frequently asked questions',blog:'The Echo journal',privacy:'Privacy policy','privacy-notice':'Privacy notice','privacy-requests':'Privacy requests',terms:'Terms of service',cookies:'Cookie policy',security:'Security and privacy', 'delete-account':'Delete account',login:'Sign in',signup:'Create an account','forgot-password':'Reset your password',account:'Your account','how-it-works':'How Echo works'};if(!titles[slug])return {};const title=`${titles[slug]} — Echo`,description=`${titles[slug]} — ${site.description}`;return {title:titles[slug],alternates:{canonical:`/${slug}`},description,openGraph:{type:'website',title,description,url:`/${slug}`,images:[{url:'/opengraph-image',width:1200,height:630,alt:'Echo — Keep the good things you find'}]},twitter:{card:'summary_large_image',title,description,images:['/twitter-image']}}}
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;if(!pageKeys().includes(slug))notFound();return <PublicPage slug={slug}/>}
