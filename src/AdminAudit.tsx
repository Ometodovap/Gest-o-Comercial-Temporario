import {useEffect,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';

export type AdminEvent={
 event_id:number|string;
 happened_at:string;
 action:string;
 actor_name:string;
 target_name:string;
};
const labels:Record<string,string>={
 create_company:'Empresa cadastrada',
 rename_company:'Empresa renomeada',
 save_member:'Colaborador cadastrado ou atualizado',
 save_team:'Stand cadastrado ou atualizado',
 assign_seller:'Atribuição de vendedor alterada'
};
function localTimestamp(value:string):string{
 const date=new Date(value);
 return Number.isNaN(date.getTime())?'Data indisponível':date.toLocaleString('pt-BR',{
  timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',
  hour:'2-digit',minute:'2-digit'
 });
}
/** Somente instâncias renderizadas para a Diretoria autorizada. O banco aplica a mesma restrição na RPC. */
export default function AdminAudit({client,companyId,refreshVersion}:{
 client:SupabaseClient;
 companyId:string;
 refreshVersion:number;
}){
 const [rows,setRows]=useState<AdminEvent[]>([]);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [requestVersion,setRequestVersion]=useState(0);
 useEffect(()=>{
  let current=true;
  setRows([]);
  setError('');
  setLoading(true);
  const load=async()=>{
   try{
    const {data,error:rpcError}=await client.rpc('gc_admin_event_feed',{
     p_company_id:companyId,p_limit:30
    });
    if(!current)return;
    if(rpcError)throw new Error(rpcError.message);
    setRows((Array.isArray(data)?data:[]) as AdminEvent[]);
   }catch(e){
    if(current)setError(e instanceof Error?e.message:'Não foi possível consultar a auditoria.');
   }finally{
    if(current)setLoading(false);
   }
  };
  void load();
  return()=>{current=false};
 },[client,companyId,refreshVersion,requestVersion]);
 return <section className="panel gc-admin-audit">
  <h2>Histórico administrativo</h2>
  <p>Registro das alterações de empresas, colaboradores e stands. A consulta é restrita à Diretoria ativa desta empresa; nenhum detalhe de autenticação, senha ou chave é exibido.</p>
  <div className="gc-admin-audit-toolbar">
   <span>Até 30 acontecimentos recentes · Horário de Brasília</span>
   <button type="button" className="secondary" disabled={loading} onClick={()=>setRequestVersion(v=>v+1)}>
    Atualizar histórico
   </button>
  </div>
  {loading&&<p role="status">Consultando histórico autorizado...</p>}
  {!loading&&error&&<p className="error" role="alert">Não foi possível carregar o histórico: {error}</p>}
  {!loading&&!error&&rows.length===0&&<p className="gc-admin-audit-empty">Ainda não existem alterações administrativas registradas para esta empresa. O cadastro inicial da Diretoria realizado diretamente no banco não integra esta trilha.</p>}
  {!loading&&!error&&rows.length>0&&<div className="table-scroll"><table>
   <thead><tr><th>Quando</th><th>Alteração</th><th>Responsável</th><th>Registro relacionado</th></tr></thead>
   <tbody>{rows.map(item=><tr key={String(item.event_id)}>
    <td>{localTimestamp(item.happened_at)}</td>
    <td>{labels[item.action]||'Alteração administrativa'}</td>
    <td>{item.actor_name}</td>
    <td>{item.target_name}</td>
   </tr>)}</tbody>
  </table></div>}
 </section>;
}
