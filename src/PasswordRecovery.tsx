import {useState} from 'react';
import type {FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';

const RECOVERY_REDIRECT='https://gest-o-comercial-temporario.pages.dev/';

export function ForgotPassword({client,email,setEmail,onBack}:{client:SupabaseClient;email:string;setEmail:(value:string)=>void;onBack:()=>void}){
 const [busy,setBusy]=useState(false);
 const [sent,setSent]=useState(false);
 const [error,setError]=useState('');
 async function requestReset(event:FormEvent){
  event.preventDefault();
  if(!email.trim()||busy)return;
  setBusy(true);setError('');
  try{
   const response=await client.auth.resetPasswordForEmail(email.trim(),{redirectTo:RECOVERY_REDIRECT});
   if(response.error)throw response.error;
   setSent(true);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível solicitar a recuperação de senha.')}
  finally{setBusy(false)}
 }
 return <div className="login"><div className="login-card">
  <div className="brand-mark">⬡</div><h1>Recuperar senha</h1>
  {sent?<p role="status">Se este e-mail estiver cadastrado e puder receber mensagens, você receberá um link para criar uma nova senha. Confira também a caixa de spam.</p>:
   <form onSubmit={requestReset}>
    <p>Informe o e-mail vinculado à sua conta da EPSA Gestão Comercial.</p>
    <label>E-mail cadastrado<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
    <button className="primary" disabled={busy||!email.trim()}>{busy?'Solicitando...':'Enviar link de recuperação'}</button>
   </form>}
  {error&&<p className="error" role="alert">{error}</p>}
  <button type="button" className="secondary" disabled={busy} onClick={onBack}>Voltar ao login</button>
 </div></div>;
}

export function SetRecoveredPassword({client,onCompleted}:{client:SupabaseClient;onCompleted:()=>void}){
 const [password,setPassword]=useState('');
 const [confirmation,setConfirmation]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 async function updatePassword(event:FormEvent){
  event.preventDefault();
  if(password.length<8){setError('Use uma senha de pelo menos 8 caracteres.');return}
  if(password!==confirmation){setError('As senhas informadas não coincidem.');return}
  setBusy(true);setError('');
  try{
   const response=await client.auth.updateUser({password});
   if(response.error)throw response.error;
   setPassword('');setConfirmation('');
   onCompleted();
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível alterar a senha.')}
  finally{setBusy(false)}
 }
 return <div className="login"><div className="login-card">
  <div className="brand-mark">⬡</div><h1>Definir nova senha</h1>
  <p>Seu link de recuperação foi reconhecido. Crie a nova senha para esta conta.</p>
  <form onSubmit={updatePassword}>
   <label>Nova senha<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <label>Confirmar senha<input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label>
   <button className="primary" disabled={busy||password.length<8||password!==confirmation}>{busy?'Salvando...':'Salvar nova senha'}</button>
  </form>
  {error&&<p className="error" role="alert">{error}</p>}
  <small>Se esta conta já utiliza um aplicativo autenticador, ele continuará sendo solicitado no próximo acesso.</small>
 </div></div>;
}
