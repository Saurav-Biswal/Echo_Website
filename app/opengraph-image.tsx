import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const alt='Echo — Keep the good things you find';
export const size={width:1200,height:630};
export const contentType='image/png';

export default async function OpenGraphImage(){const logo=await readFile(path.join(process.cwd(),'public','echo-logo.png'));const logoSrc=`data:image/png;base64,${logo.toString('base64')}`;return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#f7f8f3',padding:'72px 86px',color:'#111a15',fontFamily:'Arial, sans-serif',position:'relative',overflow:'hidden'}}><div style={{display:'flex',flexDirection:'column',width:650}}><div style={{fontSize:16,letterSpacing:3,color:'#47705a',marginBottom:20}}>YOUR PERSONAL MEMORY ASSISTANT</div><div style={{fontSize:63,lineHeight:1.06,fontWeight:650,letterSpacing:-3,display:'flex',flexDirection:'column'}}><span>Keep the good</span><span>things you find.</span></div><div style={{fontSize:23,lineHeight:1.5,color:'#647169',marginTop:25}}>A personal memory assistant for the useful things you discover online.</div></div><img src={logoSrc} width={340} height={340} style={{objectFit:'contain'}}/><div style={{position:'absolute',height:420,width:420,border:'1px solid #dce5d9',borderRadius:300,right:55,top:100,opacity:.55}}/></div>,size)}
