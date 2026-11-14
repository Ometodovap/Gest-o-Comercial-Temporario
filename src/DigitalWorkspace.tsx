import {useCallback,useEffect,useMemo,useState} from 'react';
import type {FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Assignment,DigitalStage,Membership,Role,Team} from './types';
import {digitalConversion,digitalStages,validDigitalTransition} from './digitalPipeline';
import {brl,todayBrazil} from './metrics';

type DigitalOpportunity={
 id:string;company_id:string;team_id:string;seller_id:string;
 source:'site'|'whatsapp'|'ads'|'social'|'indicacao'|'outro';
 product:'auto'|'imovel';stage:DigitalStage;
 estimated_credit:number;next_action_on:string|null;lost_reason:string|null;
 created_at:string;updated_at:string;
};
type Props={client:SupabaseClient;companyId:string;userId:string;role:Role;
 assignments:Assignment[];people:Membership[];teams:Team[]};
const sources=[{value:'site',label:'Site / landing page'},{value:'whatsapp',label:'WhatsApp'},{value:'ads',label:'Publicidade digital'},
 {value:'social',label:'Redes sociais'},{value:'indicacao',label:'Indicação'},{value:'outro',label:'Outra origem'}] as const;
const products=[{value:'auto',label:'Automóveis'},{value:'imovel',label:'Imóveis'}] as const;
const lossReasons=[{value:'sem_interesse',label:'Sem interesse'},{value:'sem_orcamento',label:'Sem orçamento'},
 {value:'sem_retorno',label:'Sem retorno'},{value:'duplicado',label:'Duplicado'},{value:'outro',label:'Outro motivo'}] as const;
function labelStage(stage:DigitalStage){return digitalStages.find(s=>s.value===stage)?.label||stage}

export default function DigitalWorkspace({client,companyId,userId,role,assignments,people,teams}:Props){
 const [items,setItems]=useState<DigitalOpportunity[]>([]);
 const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');const [notice,setNotice]=useState('');
 const [product,setProduct]=useState<'auto'|'imovel'>('imovel');
 const [source,setSource]=useState<DigitalOpportunity['source']>('site');
 const [estimatedCredit,setEstimatedCredit]=useState('0');const [nextAction,setNextAction]=useState('');
 const [assignKey,setAssignKey]=useState('');
 const [stageDraft,setStageDraft]=useState<Record<string,DigitalStage>>({});
 const [lossDraft,setLossDraft]=useState<Record<string,string>>({});
 const [nextDraft,setNextDraft]=useState<Record<string,string>>({});
 const [filterStage,setFilterStage]=useState('all');
 const candidates=useMemo(()=>{
  const sellerIds=new Set(people.filter(x=>x.active&&x.role==='seller'&&x.company_id===companyId).map(x=>x.user_id));
  return assignments.filter(a=>a.company_id===companyId&&a.active&&sellerIds.has(a.seller_id)&&
   (role==='manager'||(role==='seller'&&a.seller_id===userId)||
    (role==='supervisor'&&teams.some(t=>t.id===a.team_id&&t.supervisor_user_id===userId)))
  ).map(a=>({...a,key:a.team_id+'|'+a.seller_id}));
 },[assignments,people,teams,companyId,userId,role]);
 const selected=candidates.find(x=>x.key===assignKey)||candidates[0];
 const name=(sellerId:string)=>people.find(x=>x.user_id===sellerId)?.display_name||'Vendedor autorizado';
 const team=(teamId:string)=>teams.find(t=>t.id===teamId)?.name||'Equipe';
 const refresh=useCallback(async()=>{
  setLoading(true);setError('');
  const {data,error}=await client.from('gc_digital_opportunities').select('id,company_id,team_id,seller_id,source,product,stage,estimated_credit,next_action_on,lost_reason,created_at,updated_at')
   .eq('company_id',companyId).order('created_at',{ascending:false}).limit(500);
  if(error)setError('Não foi possível consultar oportunidades: '+error.message);
  else setItems((data||[]) as DigitalOpportunity[]);
  setLoading(false);
 },[client,companyId]);
 useEffect(()=>{setItems([]);void refresh()},[refresh]);
 const counts=useMemo(()=>{
  const byStage=Object.fromEntries(digitalStages.map(x=>[x.value,items.filter(i=>i.stage===x.value).length]));
  return {byStage,conversion:digitalConversion(items.length,byStage['won']||0),total:items.length,
   overdue:items.filter(i=>i.stage!=='won'&&i.stage!=='lost'&&i.next_action_on&&i.next_action_on<todayBrazil()).length};
 },[items]);
 async function create(e:FormEvent){
  e.preventDefault();setNotice('');setError('');
  if(!selected){setError('É necessário um vendedor vinculado a uma equipe ativa.');return;}
  const amount=Number(estimatedCredit);
  if(!Number.isFinite(amount)||amount<0||amount>1000000000000||Math.abs(Math.round(amount*100)-amount*100)>0.000001){
   setError('Informe valor estimado válido, com até duas casas decimais.');return;
  }
  setBusy(true);
  const {error}=await client.from('gc_digital_opportunities').insert({
   company_id:companyId,team_id:selected.team_id,seller_id:selected.seller_id,
   source,product,estimated_credit:amount,next_action_on:nextAction||null
  }).select('id').single();
  setBusy(false);
  if(error){setError('Não foi possível cadastrar: '+error.message);return;}
  setNotice('Oportunidade fictícia criada sem dados pessoais.');setEstimatedCredit('0');setNextAction('');
  await refresh();
 }
 async function update(item:DigitalOpportunity){
  setNotice('');setError('');
  const stage=stageDraft[item.id]||item.stage;
  const reason=lossDraft[item.id]||item.lost_reason||'';
  const next=nextDraft[item.id]===undefined?item.next_action_on||'':nextDraft[item.id];
  if(!validDigitalTransition(item.stage,stage)){setError('Não é permitido retroceder ou reabrir uma oportunidade encerrada.');return;}
  if(stage==='lost'&&!reason){setError('Selecione o motivo de perda.');return;}
  setBusy(true);
  const {data,error}=await client.from('gc_digital_opportunities').update({
   stage,lost_reason:stage==='lost'?reason:null,next_action_on:next||null
  }).eq('id',item.id).eq('company_id',companyId).eq('stage',item.stage).select('id').maybeSingle();
  setBusy(false);
  if(error){setError('Falha ao atualizar: '+error.message);return;}
  if(!data){setError('O registro foi alterado por outro usuário. Atualize antes de tentar novamente.');await refresh();return;}
  setNotice('Etapa e acompanhamento atualizados; histórico preservado no banco.');
  await refresh();
 }
 return <>
  <section className="panel"><h2>Funil digital — piloto de homologação</h2>
   <p>Oportunidades identificadas somente por código. Não insira nome, telefone, CPF, e-mail nem informações de clientes reais nesta etapa. O fluxo presencial continua independente.</p>
   <div className="mini-stats"><span>{counts.total} oportunidade(s) visível(is)</span><span>{counts.byStage['won']||0} concluída(s)</span><span>{counts.byStage['lost']||0} perdida(s)</span>
    <span>Conversão das oportunidades: {counts.conversion===null?'Sem base':counts.conversion.toFixed(1).replace('.',',')+'%'}</span>
    <span>{counts.overdue} próxima(s) ação(ões) vencida(s)</span></div>
   <div className="digital-funnel">{digitalStages.map(s=><div className="digital-stage" key={s.value}><strong>{counts.byStage[s.value]||0}</strong><small>{s.label}</small></div>)}</div>
  </section>
  <section className="panel"><h2>Nova oportunidade digital</h2><p>Cadastro de teste, sem identificação pessoal do potencial cliente. Atribua a um vendedor autorizado para a empresa.</p>
   <form onSubmit={create}><div className="form-grid">
    <label>Vendedor / equipe<select value={selected?.key||''} onChange={e=>setAssignKey(e.target.value)} required>{candidates.length===0&&<option value="">Sem vendedor autorizado</option>}
     {candidates.map(a=><option key={a.key} value={a.key}>{name(a.seller_id)} — {team(a.team_id)}</option>)}</select></label>
    <label>Origem<select value={source} onChange={e=>setSource(e.target.value as DigitalOpportunity['source'])}>{sources.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
    <label>Produto<select value={product} onChange={e=>setProduct(e.target.value as 'auto'|'imovel')}>{products.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
    <label>Crédito estimado (R$; opcional)<input type="number" min="0" step="0.01" value={estimatedCredit} onChange={e=>setEstimatedCredit(e.target.value)} required/></label>
    <label>Próxima ação (opcional)<input type="date" value={nextAction} onChange={e=>setNextAction(e.target.value)}/></label>
   </div><button className="primary" disabled={busy||!selected}>Cadastrar oportunidade fictícia</button></form>
  </section>
  <section className="panel"><h2>Oportunidades e acompanhamento</h2>
   <p>Acesso condicionado ao vendedor responsável e à supervisão autorizada. Sem contatos de clientes nesta fase. São exibidas até 500 oportunidades recentes.</p>
   <div className="form-grid"><label>Filtrar etapa<select value={filterStage} onChange={e=>setFilterStage(e.target.value)}>
    <option value="all">Todas as etapas</option>{digitalStages.map(s=><option value={s.value} key={s.value}>{s.label}</option>)}</select></label></div>
   {error&&<div className="error" role="alert">{error}</div>}{notice&&<div className="success" role="status">{notice}</div>}
   {loading?<p>Consultando oportunidades...</p>:<div className="cards">
    {items.filter(item=>filterStage==='all'||item.stage===filterStage).map(item=>{
     const closed=item.stage==='won'||item.stage==='lost';
     const to=stageDraft[item.id]||item.stage;
     return <article className="activity" key={item.id}>
      <header><b>Oportunidade #{item.id.slice(0,8)}</b><span>{labelStage(item.stage)}</span></header>
      <div className="mini-stats"><span>{name(item.seller_id)} · {team(item.team_id)}</span>
       <span>{sources.find(s=>s.value===item.source)?.label||item.source}</span><span>{item.product==='imovel'?'Imóveis':'Automóveis'}</span>
       <span>{item.estimated_credit>0?brl(Number(item.estimated_credit)):'Crédito não informado'}</span></div>
      <div className="form-grid">
       <label>Nova etapa<select disabled={busy||closed} value={to} onChange={e=>setStageDraft(x=>({...x,[item.id]:e.target.value as DigitalStage}))}>
        {digitalStages.filter(s=>validDigitalTransition(item.stage,s.value)).map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
       {to==='lost'&&<label>Motivo da perda<select disabled={busy||closed} value={lossDraft[item.id]||item.lost_reason||''} onChange={e=>setLossDraft(x=>({...x,[item.id]:e.target.value}))}>
        <option value="">Selecione</option>{lossReasons.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>}
       <label>Próxima ação<input type="date" disabled={busy||closed} value={nextDraft[item.id]===undefined?item.next_action_on||'':nextDraft[item.id]} onChange={e=>setNextDraft(x=>({...x,[item.id]:e.target.value}))}/></label>
      </div>
      {closed?<small>Oportunidade encerrada. Registros preservados para auditoria.</small>:
       <button disabled={busy} className="secondary" onClick={()=>void update(item)}>Salvar acompanhamento</button>}
     </article>
    })}
    {items.filter(item=>filterStage==='all'||item.stage===filterStage).length===0&&<p>Sem oportunidades nesta seleção. Ausência de registro não significa ausência de trabalho.</p>}
   </div>}
   <div className="actions"><button className="secondary" disabled={busy||loading} onClick={()=>void refresh()}>Atualizar oportunidades</button></div>
  </section>
 </>;
}
