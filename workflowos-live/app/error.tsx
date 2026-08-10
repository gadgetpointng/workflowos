'use client';
export default function GlobalError({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <html><body><main style={{fontFamily:'system-ui',maxWidth:680,margin:'12vh auto',padding:24}}><div style={{fontSize:13,textTransform:'uppercase',letterSpacing:2,color:'#64748b'}}>WorkflowOS</div><h1>Something went wrong</h1><p style={{color:'#475569'}}>The web app hit an unexpected error. Your data has not been intentionally changed by this screen.</p><button onClick={reset} style={{marginTop:16,padding:'10px 16px',borderRadius:12,border:'1px solid #cbd5e1',background:'#fff',cursor:'pointer'}}>Try again</button></main></body></html>
}
