import type { MetadataRoute } from 'next';
import {site} from '@/config/site';
import {pageKeys} from '@/components/site-pages';
export default function sitemap():MetadataRoute.Sitemap{return [{url:site.url,lastModified:new Date(),changeFrequency:'monthly',priority:1},...pageKeys().filter(x=>!['account','login','signup','forgot-password'].includes(x)).map(slug=>({url:`${site.url}/${slug}`,lastModified:new Date(),changeFrequency:'monthly' as const,priority:slug==='pricing'||slug==='product'?0.8:0.6}))]}
