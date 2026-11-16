import {useState} from 'react';
import type {FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';

const FROM='diretoria@piloto.test';
const TARGET='contato.gvs.diretoria@gmail.com';

/** Troca voluntária do e-mail de acesso da conta piloto existente; mantém o mesmo auth.uid(). */
export function PilotEmailChange({client,currentEmail}:{client:SupabaseClient;currentEmail:string|undefined}){
 const [busy,setBusy]=useState(false);
 const [sent,setSent]=useState(false);
 const [error,setError]=useState('');
 const isPilot=currentEmail?.toLowerCase()===FROM;
 if(!isPilot)return null;
 async function requestChange(e:FormEvent){
  e.preventDefault();
  if(busy||sent)return;
  setBusy(true);setError('');
  try{
   const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel();
   if(assurance.error)throw assurance.error;
   // Fator da Diretoria já cadastrado. Não permitir mudar o e-mail só com a senha.
   if(assurance.data.currentLevel!=='aal2')throw new Error('Entre novamente com o segundo fator antes de alterar o e-mail.');
   const current=await client.auth.getUser();
   if(current.error)throw current.error;
   if(current.data.user.email?.toLowerCase()!==FROM)throw new Error('A conta selecionada não é a Diretoria Piloto A.');
   const result=await client.auth.updateUser({email:TARGET},{emailRedirectTo:'https://gest-o-comercial-temporario.pages.dev/'});
   if(result.error)throw result.error;
   setSent(true);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível solicitar a alteração de e-mail.');}
  finally{setBusy(false)}
 }
 return <section className="mfa-setup">
  <h3>Atualizar e-mail da Diretoria Piloto A</h3>
  <p><b>E-mail atual:</b> {FROM}</p>
  <p><b>Novo e-mail:</b> {TARGET}</p>
  {sent?<p role="status" className="success">Solicitação enviada. Confirme a alteração na caixa de entrada do novo e-mail. O endereço só mudará depois da confirmação do Supabase.</p>:
   <form onSubmit={requestChange}>
    <p>Este ajuste preserva a conta, as permissões e o autenticador já cadastrado. Nenhuma senha será modificada.</p>
    <button type="submit" className="primary" disabled={busy}>{busy?'Solicitando...':'Solicitar alteração de e-mail'}</button>
   </form>}
  {error&&<p className="error" role="alert">{error}</p>}
 </section>;
}
