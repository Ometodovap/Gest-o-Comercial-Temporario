import {useEffect,useState} from 'react';
import type {FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {isTotpCode} from './mfaPolicy';

type Factor={id:string;friendly_name?:string|null;status:string};
const errorMessage=(error:unknown)=>error instanceof Error?error.message:'Não foi possível concluir a operação de autenticação.';

export function MfaChallenge({client,onVerified,onLogout}:{client:SupabaseClient;onVerified:()=>void;onLogout:()=>void}){
 const [factors,setFactors]=useState<Factor[]>([]);
 const [factorId,setFactorId]=useState('');
 const [code,setCode]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  let active=true;
  (async()=>{
   try{
    const response=await client.auth.mfa.listFactors();
    if(response.error)throw response.error;
    const verified=response.data.totp.filter(f=>f.status==='verified');
    if(active){setFactors(verified);setFactorId(verified[0]?.id||'');}
   }catch(e){if(active)setError(errorMessage(e))}
   finally{if(active)setLoading(false)}
  })();
  return ()=>{active=false};
 },[client]);
 async function verify(event:FormEvent){
  event.preventDefault();
  if(!isTotpCode(code)||!factorId)return;
  setBusy(true);setError('');
  try{
   const challenge=await client.auth.mfa.challenge({factorId});
   if(challenge.error)throw challenge.error;
   const verified=await client.auth.mfa.verify({factorId,challengeId:challenge.data.id,code:code.trim()});
   if(verified.error)throw verified.error;
   setCode('');
   onVerified();
  }catch(e){setError(errorMessage(e));setCode('')}
  finally{setBusy(false)}
 }
 return <div className="login"><div className="login-card mfa-login">
  <div className="brand-mark">⬡</div>
  <h1>Confirmar segundo fator</h1>
  <p>Abra seu aplicativo autenticador e informe o código de 6 dígitos para acessar a EPSA Gestão Comercial.</p>
  {loading?<p>Consultando fatores cadastrados...</p>:
   factors.length===0?<p role="alert">Nenhum aplicativo autenticador TOTP verificado foi encontrado. Entre em contato com a administração para recuperar o acesso.</p>:
   <form onSubmit={verify}>
    {factors.length>1&&<label>Autenticador
     <select value={factorId} onChange={e=>setFactorId(e.target.value)}>
      {factors.map((factor,index)=><option key={factor.id} value={factor.id}>{factor.friendly_name||'Autenticador '+(index+1)}</option>)}
     </select>
    </label>}
    <label>Código do aplicativo
     <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code"
      value={code} onChange={e=>setCode(e.target.value.replace(/[^0-9]/g,'').slice(0,6))} placeholder="000000" required/>
    </label>
    <button className="primary" disabled={busy||!isTotpCode(code)}>{busy?'Verificando...':'Confirmar acesso'}</button>
   </form>}
  {error&&<p className="error" role="alert">{error}</p>}
  <button type="button" className="secondary" disabled={busy} onClick={onLogout}>Sair da conta</button>
  <small>Não compartilhe os códigos. A recuperação de acesso depende da administração da empresa.</small>
 </div></div>;
}

export function MfaSettings({client,onEnrolled}:{client:SupabaseClient;onEnrolled:()=>void}){
 const [factors,setFactors]=useState<Factor[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [success,setSuccess]=useState('');
 const [pending,setPending]=useState<{id:string;qr:string;secret:string}|null>(null);
 const [code,setCode]=useState('');
 async function refresh(){
  const response=await client.auth.mfa.listFactors();
  if(response.error)throw response.error;
  setFactors(response.data.totp.filter(f=>f.status==='verified'));
 }
 useEffect(()=>{
  let active=true;
  client.auth.mfa.listFactors().then(response=>{
   if(!active)return;
   if(response.error){setError(response.error.message);return;}
   setFactors(response.data.totp.filter(f=>f.status==='verified'));
  }).catch(e=>{if(active)setError(errorMessage(e))}).finally(()=>{if(active)setLoading(false)});
  return ()=>{active=false};
 },[client]);
 async function startEnrollment(){
  setBusy(true);setError('');setSuccess('');
  try{
   const result=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'EPSA Gestão Comercial'});
   if(result.error)throw result.error;
   setPending({id:result.data.id,qr:result.data.totp.qr_code,secret:result.data.totp.secret});
   setCode('');
  }catch(e){setError(errorMessage(e))}
  finally{setBusy(false)}
 }
 async function confirmEnrollment(event:FormEvent){
  event.preventDefault();
  if(!pending||!isTotpCode(code))return;
  setBusy(true);setError('');
  try{
   const challenge=await client.auth.mfa.challenge({factorId:pending.id});
   if(challenge.error)throw challenge.error;
   const verification=await client.auth.mfa.verify({factorId:pending.id,challengeId:challenge.data.id,code:code.trim()});
   if(verification.error)throw verification.error;
   setPending(null);setCode('');
   await refresh();
   setSuccess('Aplicativo autenticador ativado. Nos próximos acessos será necessário informar o código.');
   onEnrolled();
  }catch(e){setError(errorMessage(e));setCode('')}
  finally{setBusy(false)}
 }
 async function cancelEnrollment(){
  if(!pending)return;
  setBusy(true);setError('');
  try{
   const result=await client.auth.mfa.unenroll({factorId:pending.id});
   if(result.error)throw result.error;
   setPending(null);setCode('');
  }catch(e){setError(errorMessage(e))}
  finally{setBusy(false)}
 }
 const qrSrc=pending?(pending.qr.startsWith('data:image/svg+xml')?pending.qr:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(pending.qr)):'';
 return <section className="panel">
  <h2>Segurança da conta — autenticação em duas etapas</h2>
  <p>Cadastre um aplicativo autenticador para confirmar seus acessos com um código temporário. Esta é a fase de adesão voluntária no ambiente de homologação.</p>
  <p className="mg-footnote">A exigência obrigatória no servidor será ativada somente após os testes de recuperação e de permissões. Os cadastros de usuários existentes não serão alterados automaticamente.</p>
  {loading?<p>Consultando autenticação...</p>:<>
   <p><b>Autenticadores verificados:</b> {factors.length}</p>
   {factors.length>0&&<p className="success">Você já possui um segundo fator cadastrado. Para reduzir o risco de perda de acesso, mantenha um segundo autenticador em dispositivo independente.</p>}
   {!pending&&<button type="button" className="primary" disabled={busy} onClick={()=>void startEnrollment()}>
    {factors.length>0?'Cadastrar autenticador de reserva':'Configurar aplicativo autenticador'}
   </button>}
  </>}
  {pending&&<div className="mfa-setup">
   <h3>Ativar autenticador</h3>
   <p>1. Abra Google Authenticator, Microsoft Authenticator, 1Password ou aplicativo compatível.</p>
   <p>2. Escaneie o QR Code abaixo. Se necessário, cadastre manualmente a chave exibida.</p>
   <img className="mfa-qr" src={qrSrc} alt="QR Code exclusivo para configurar seu autenticador" />
   <label>Chave manual (privada)
    <input readOnly value={pending.secret} autoComplete="off" aria-label="Chave manual do autenticador"/>
   </label>
   <p>3. Informe o código de seis dígitos gerado pelo aplicativo para concluir a ativação.</p>
   <form onSubmit={confirmEnrollment}>
    <label>Código do aplicativo
     <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
      autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value.replace(/[^0-9]/g,'').slice(0,6))} placeholder="000000" required/>
    </label>
    <div className="actions">
     <button className="primary" disabled={busy||!isTotpCode(code)}>{busy?'Verificando...':'Ativar segundo fator'}</button>
     <button type="button" className="secondary" disabled={busy} onClick={()=>void cancelEnrollment()}>Cancelar cadastro</button>
    </div>
   </form>
  </div>}
  {error&&<p className="error" role="alert">{error}</p>}
  {success&&<p className="success" role="status">{success}</p>}
  <p className="mg-footnote">Guarde seus fatores com segurança. Esta primeira fase não permite remover autenticadores nem oferece códigos de recuperação dentro do aplicativo.</p>
 </section>;
}
