import {useCallback,useEffect,useMemo,useState} from 'react';
import type {FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Assignment,DigitalStage,Membership,Role,Team} from './types';
import {digitalStages,validDigitalTransition} from './digitalPipeline';
import {actionLabels,digitalInsights,dueSort,dueStatus,isValidCredit,lossLabels} from './digitalInsights';
import type {DigitalActionRow,DigitalStageRow,DigitalOpportunityRow,FollowupDue} from './digitalInsights';
import DigitalHistory from './DigitalHistory';
import {brl,todayBrazil} from './metrics';

type DigitalOpportunity=DigitalOpportunityRow&{
 company_id:string;team_id:string;
 source:'site'|'whatsapp'|'ads'|'social'|'indicacao'|'outro';
 product:'auto'|'imovel';
};
type Props={client:SupabaseClient;companyId:string;userId:string;role:Role;
 assignments:Assignment[];people:Membership[];teams:Team[]};
type ActionKind=DigitalActionRow['action_type'];
const sources=[{value:'site',label:'Site / landing page'},{value:'whatsapp',label:'WhatsApp'},{value:'ads',label:'Publicidade digital'},
 {value:'social',label:'Redes sociais'},{value:'indicacao',label:'Indicação'},{value:'outro',label:'Outra origem'}] as const;
const products=[{value:'auto',label:'Automóveis'},{value:'imovel',label:'Imóveis'}] as const;
const losses=Object.entries(lossLabels);
const followupStatuses:{id:FollowupDue;label:string}[]=[
 {id:'overdue',label:'Vencida'},{id:'today',label:'Para hoje'},
 {id:'scheduled',label:'Futura'},{id:'unscheduled',label:'Sem próxima ação'},
 {id:'closed',label:'Encerrada'}
];
function stageLabel(stage:DigitalStage){return digitalStages.find(s=>s.value===stage)?.label||stage;}
function asPercent(v:number|null){return v===null?'Sem base':v.toFixed(1).replace('.',',')+'%';}
function asDate(d:string|null){return d?d.split('-').reverse().join('/'):'Não definida';}
function asDateTime(d:string){return new Date(d).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}
function statusLabel(s:FollowupDue){return followupStatuses.find(x=>x.id===s)?.label||s;}
const maxRows=500;
const pageSize=500;
const maxEventPages=10;

export default function DigitalWorkspace({client,companyId,userId,role,assignments,people,teams}:Props){
 const [items,setItems]=useState<DigitalOpportunity[]>([]);
 const [stageEvents,setStageEvents]=useState<DigitalStageRow[]>([]);
 const [followups,setFollowups]=useState<DigitalActionRow[]>([]);
 const [limited,setLimited]=useState(false);
 const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');const [notice,setNotice]=useState('');
 const [product,setProduct]=useState<'auto'|'imovel'>('imovel');
 const [source,setSource]=useState<DigitalOpportunity['source']>('site');
 const [estimatedCredit,setEstimatedCredit]=useState('0');const [nextAction,setNextAction]=useState('');
 const [assignKey,setAssignKey]=useState('');
 const [stageDraft,setStageDraft]=useState<Record<string,DigitalStage>>({});
 const [lossDraft,setLossDraft]=useState<Record<string,string>>({});
 const [nextDraft,setNextDraft]=useState<Record<string,string>>({});
 const [creditDraft,setCreditDraft]=useState<Record<string,string>>({});
 const [actionDraft,setActionDraft]=useState<Record<string,ActionKind>>({});
 const [filterStage,setFilterStage]=useState('all');
 const [filterDue,setFilterDue]=useState('all');
 const today=todayBrazil();
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
 const loadEvents=useCallback(async <T,>(table:'gc_digital_stage_events'|'gc_digital_followup_events',columns:string)=>{
  const accumulated:T[]=[];
  let capped=false;
  for(let page=0;page<maxEventPages;page++){
   const {data,error}=await client.from(table).select(columns).eq('company_id',companyId)
    .order('id',{ascending:true}).range(page*pageSize,(page+1)*pageSize-1);
   if(error)throw new Error('Erro ao carregar eventos: '+error.message);
   const batch=(data||[]) as T[];
   accumulated.push(...batch);
   if(batch.length<pageSize)break;
   if(page===maxEventPages-1)capped=true;
  }
  return {rows:accumulated,capped};
 },[client,companyId]);
 const refresh=useCallback(async()=>{
  setLoading(true);setError('');
  try{
   const [opps,history,actions]=await Promise.all([
    client.from('gc_digital_opportunities').select('id,company_id,team_id,seller_id,source,product,stage,estimated_credit,next_action_on,lost_reason,created_at,updated_at')
     .eq('company_id',companyId).order('created_at',{ascending:false}).limit(maxRows),
    loadEvents<DigitalStageRow>('gc_digital_stage_events','opportunity_id,new_stage,created_at'),
    loadEvents<DigitalActionRow>('gc_digital_followup_events','id,opportunity_id,seller_id,actor_id,action_type,next_action_on,created_at')
   ]);
   if(opps.error)throw new Error(opps.error.message);
   setItems((opps.data||[]) as DigitalOpportunity[]);
   setStageEvents(history.rows);setFollowups(actions.rows);
   setLimited((opps.data||[]).length===maxRows||history.capped||actions.capped);
  }catch(e){setError('Não foi possível atualizar o painel: '+(e instanceof Error?e.message:String(e)));}
  finally{setLoading(false);}
 },[client,companyId,loadEvents]);
 useEffect(()=>{setItems([]);setStageEvents([]);setFollowups([]);void refresh();},[refresh]);
 const insights=useMemo(()=>digitalInsights(items,stageEvents,followups,today),[items,stageEvents,followups,today]);
 const queue=useMemo(()=>items.filter(o=>!['won','lost'].includes(o.stage))
  .sort((a,b)=>dueSort(a,b,today)),[items,today]);
 const visible=useMemo(()=>items.filter(o=>
  (filterStage==='all'||o.stage===filterStage)&&
  (filterDue==='all'||dueStatus(o,today)===filterDue)
 ).sort((a,b)=>dueSort(a,b,today)),[items,filterStage,filterDue,today]);
 async function create(e:FormEvent){
  e.preventDefault();setNotice('');setError('');
  if(!selected){setError('É necessário um vendedor vinculado a uma equipe ativa.');return;}
  const amount=Number(estimatedCredit);
  if(!estimatedCredit.trim()||!isValidCredit(amount)){setError('Crédito estimado inválido. Use, por exemplo, 250000 para R$ 250.000,00.');return;}
  setBusy(true);
  const {error}=await client.from('gc_digital_opportunities').insert({
   company_id:companyId,team_id:selected.team_id,seller_id:selected.seller_id,
   source,product,estimated_credit:amount,next_action_on:nextAction||null
  }).select('id').single();
  setBusy(false);
  if(error){setError('Não foi possível cadastrar: '+error.message);return;}
  setNotice('Oportunidade fictícia cadastrada.');setEstimatedCredit('0');setNextAction('');
  await refresh();
 }
 async function update(item:DigitalOpportunity){
  setNotice('');setError('');
  const stage=stageDraft[item.id]||item.stage;
  const reason=lossDraft[item.id]||item.lost_reason||'';
  const next=nextDraft[item.id]===undefined?item.next_action_on||'':nextDraft[item.id];
  const creditValue=creditDraft[item.id]===undefined?String(item.estimated_credit):creditDraft[item.id];
  const amount=Number(creditValue);
  if(!creditValue.trim()||!isValidCredit(amount)){setError('Crédito estimado inválido. Exemplo: 250000 equivale a R$ 250.000,00.');return;}
  if(!validDigitalTransition(item.stage,stage)){setError('Não é permitido retroceder ou reabrir oportunidade encerrada.');return;}
  if(stage==='lost'&&!reason){setError('Selecione o motivo da perda.');return;}
  setBusy(true);
  const {data,error}=await client.from('gc_digital_opportunities').update({
   stage,estimated_credit:amount,lost_reason:stage==='lost'?reason:null,next_action_on:next||null
  }).eq('id',item.id).eq('company_id',companyId).eq('updated_at',item.updated_at).select('id').maybeSingle();
  setBusy(false);
  if(error){setError('Falha ao atualizar: '+error.message);return;}
  if(!data){setError('A oportunidade mudou em outra sessão. Atualize antes de salvar novamente.');await refresh();return;}
  setNotice('Oportunidade atualizada. Correções de crédito ficam auditadas no banco.');
  setStageDraft(x=>{const y={...x};delete y[item.id];return y;});
  setCreditDraft(x=>{const y={...x};delete y[item.id];return y;});
  await refresh();
 }
 async function recordAction(item:DigitalOpportunity){
  setNotice('');setError('');
  const kind=actionDraft[item.id]||'contacted';
  const next=nextDraft[item.id]===undefined?item.next_action_on||'':nextDraft[item.id];
  if(item.stage==='won'||item.stage==='lost'){setError('Oportunidades encerradas não permitem novas atividades.');return;}
  setBusy(true);
  const {error}=await client.from('gc_digital_followup_events').insert({
   opportunity_id:item.id,action_type:kind,next_action_on:next||null
  }).select('id').single();
  setBusy(false);
  if(error){setError('Não foi possível registrar a atividade: '+error.message);return;}
  setNotice('Atividade registrada e próxima ação sincronizada no banco.');
  setNextDraft(x=>{const y={...x};delete y[item.id];return y;});
  await refresh();
 }
 const agendaItems=queue.slice(0,8);
 return <>
  <section className="panel">
   <h2>Inteligência comercial digital — piloto</h2>
   <p>Resultados das oportunidades autorizadas e atividades registradas. Não utilize dados pessoais de clientes nesta etapa; a operação presencial permanece independente.</p>
   <div className="mini-stats">
    <span>{insights.total} oportunidade(s) visível(is)</span><span>{insights.byStage.won} venda(s) concluída(s)</span>
    <span>{insights.byStage.lost} perdida(s)</span><span>Conversão das oportunidades: {asPercent(insights.conversion)}</span>
    <span>{insights.contactsPerformed} contato(s) registrado(s)</span>
   </div>
   <div className="digital-funnel">{digitalStages.map(s=><div className="digital-stage" key={s.value}>
    <strong>{insights.byStage[s.value]}</strong><small>{s.label}</small>
   </div>)}</div>
   {limited&&<p className="callout">Atenção: são exibidas até 500 oportunidades e até 5.000 eventos por histórico. Os indicadores podem estar incompletos; não use como relatório financeiro definitivo.</p>}
  </section>
  <section className="panel">
   <h2>Agenda de follow-ups</h2>
   <p>Agenda por prioridade: vencidas, para hoje, futuras e sem data. Datas são consideradas no horário do Brasil.</p>
   <div className="mini-stats"><span>{insights.due.overdue} vencida(s)</span><span>{insights.due.today} para hoje</span>
    <span>{insights.due.scheduled} futura(s)</span><span>{insights.due.unscheduled} sem data</span></div>
   <div className="table-scroll"><table><thead><tr><th>Oportunidade</th><th>Responsável</th><th>Etapa</th><th>Próxima ação</th><th>Situação</th></tr></thead>
    <tbody>{agendaItems.map(o=><tr key={o.id}>
     <td>#{o.id.slice(0,8)}</td><td>{name(o.seller_id)}</td><td>{stageLabel(o.stage)}</td>
     <td>{asDate(o.next_action_on)}</td><td><span className={'due-label due-'+dueStatus(o,today)}>{statusLabel(dueStatus(o,today))}</span></td>
    </tr>)}{agendaItems.length===0&&<tr><td colSpan={5}>Nenhuma oportunidade aberta para acompanhar.</td></tr>}</tbody>
   </table></div>
   {queue.length>8&&<p>Exibindo as 8 primeiras de {queue.length} oportunidades abertas. Utilize os filtros abaixo para consultar as demais.</p>}
  </section>
  <section className="panel">
   <h2>Produtividade digital por vendedor</h2>
   <p>Indicadores acumulados das oportunidades visíveis. Etapas atingidas são contadas uma vez por oportunidade com base no histórico, sem presumir etapas puladas. Contatos e tentativas representam apenas atividades efetivamente registradas pelo próprio vendedor.</p>
   <div className="table-scroll"><table>
    <thead><tr><th>Vendedor</th><th>Oportunidades</th><th>Contato estabelecido</th><th>Qualificadas</th><th>Propostas</th><th>Vendas</th><th>Perdas</th><th>Contatos registrados</th><th>Sem resposta</th><th>Vencidas</th><th>Conversão</th></tr></thead>
    <tbody>{insights.sellers.map(s=><tr key={s.sellerId}>
     <td><b>{name(s.sellerId)}</b></td><td>{s.total}</td><td>{s.contacted}</td><td>{s.qualified}</td><td>{s.proposals}</td>
     <td>{s.wins}</td><td>{s.losses}</td><td>{s.contactsPerformed}</td><td>{s.unanswered}</td><td>{s.overdue}</td><td>{asPercent(s.conversion)}</td>
    </tr>)}{insights.sellers.length===0&&<tr><td colSpan={11}>Ainda não há oportunidades para comparar.</td></tr>}</tbody>
   </table></div>
  </section>
  <section className="panel">
   <h2>Motivos de perda e oportunidades em aberto</h2>
   <p>Motivos são contabilizados somente após o encerramento como oportunidade perdida. Não se trata de diagnóstico automático do comportamento do cliente.</p>
   <div className="mini-stats">{insights.losses.map(x=><span key={x.code}>{x.label}: {x.count}</span>)}{insights.losses.length===0&&<span>Sem perdas registradas</span>}</div>
   <p><b>{insights.due.overdue+insights.due.today}</b> oportunidade(s) exigem contato vencido ou hoje;
    {' '}{insights.due.unscheduled} aberta(s) ainda não têm próxima ação definida.</p>
  </section>
  <section className="panel"><h2>Nova oportunidade digital</h2>
   <p>Cadastro de teste, sem identificação pessoal. Para R$ 250.000,00, digite <b>250000</b> no campo de crédito, sem separador de milhares.</p>
   <form onSubmit={create}><div className="form-grid">
    <label>Vendedor / equipe<select value={selected?.key||''} onChange={e=>setAssignKey(e.target.value)} required>
     {candidates.length===0&&<option value="">Sem vendedor autorizado</option>}
     {candidates.map(a=><option key={a.key} value={a.key}>{name(a.seller_id)} — {team(a.team_id)}</option>)}</select></label>
    <label>Origem<select value={source} onChange={e=>setSource(e.target.value as DigitalOpportunity['source'])}>
     {sources.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
    <label>Produto<select value={product} onChange={e=>setProduct(e.target.value as 'auto'|'imovel')}>
     {products.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
    <label>Crédito estimado (R$; opcional)<input type="number" min="0" step="0.01" value={estimatedCredit} onChange={e=>setEstimatedCredit(e.target.value)} required/></label>
    <label>Próxima ação (opcional)<input type="date" value={nextAction} onChange={e=>setNextAction(e.target.value)}/></label>
   </div><button className="primary" disabled={busy||!selected}>Cadastrar oportunidade fictícia</button></form>
  </section>
  <section className="panel"><h2>Oportunidades e acompanhamento</h2>
   <p>Use os filtros para localizar registros. A mudança de etapa é feita dentro de cada cartão. Ações de acompanhamento ficam registradas separadamente.</p>
   <div className="form-grid">
    <label>Filtrar etapa<select value={filterStage} onChange={e=>setFilterStage(e.target.value)}>
     <option value="all">Todas as etapas</option>{digitalStages.map(s=><option value={s.value} key={s.value}>{s.label}</option>)}</select></label>
    <label>Filtrar próxima ação<select value={filterDue} onChange={e=>setFilterDue(e.target.value)}>
     <option value="all">Todas as situações</option>{followupStatuses.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
   </div>
   {error&&<div className="error" role="alert">{error}</div>}{notice&&<div className="success" role="status">{notice}</div>}
   {loading?<p>Consultando oportunidades e atividades...</p>:<div className="cards">
    {visible.map(item=>{
     const closed=item.stage==='won'||item.stage==='lost';
     const to=stageDraft[item.id]||item.stage;
     const next=nextDraft[item.id]===undefined?item.next_action_on||'':nextDraft[item.id];
     const recent=followups.filter(x=>x.opportunity_id===item.id).slice(-3).reverse();
     return <article className="activity" key={item.id}>
      <header><b>Oportunidade #{item.id.slice(0,8)}</b><span>{stageLabel(item.stage)}</span></header>
      <div className="mini-stats"><span>{name(item.seller_id)} · {team(item.team_id)}</span>
       <span>{sources.find(s=>s.value===item.source)?.label||item.source}</span>
       <span>{item.product==='imovel'?'Imóveis':'Automóveis'}</span>
       <span>{brl(Number(item.estimated_credit))}</span>
       <span className={'due-label due-'+dueStatus(item,today)}>{statusLabel(dueStatus(item,today))}</span></div>
      <div className="form-grid">
       <label>Nova etapa<select disabled={busy||closed} value={to} onChange={e=>setStageDraft(x=>({...x,[item.id]:e.target.value as DigitalStage}))}>
        {digitalStages.filter(s=>validDigitalTransition(item.stage,s.value)).map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
       {to==='lost'&&<label>Motivo da perda<select disabled={busy||closed} value={lossDraft[item.id]||item.lost_reason||''} onChange={e=>setLossDraft(x=>({...x,[item.id]:e.target.value}))}>
        <option value="">Selecione</option>{losses.map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>}
       <label>Próxima ação<input type="date" disabled={busy||closed} value={next} onChange={e=>setNextDraft(x=>({...x,[item.id]:e.target.value}))}/></label>
       <label>Crédito estimado (R$) — digite 250000 para R$ 250 mil
        <input type="number" min="0" step="0.01" disabled={busy||closed}
         value={creditDraft[item.id]===undefined?String(item.estimated_credit):creditDraft[item.id]}
         onChange={e=>setCreditDraft(x=>({...x,[item.id]:e.target.value}))}/></label>
      </div>
      {closed?<p className="help">Oportunidade encerrada. Alterações bloqueadas; histórico preservado.</p>:
       <><div className="actions digital-left"><button disabled={busy} className="secondary" onClick={()=>void update(item)}>
        Salvar etapa, crédito e agenda</button></div>
        <div className="digital-followup-box"><h3>Registrar atividade comercial</h3>
         <p>Registro de atividade sem informações de clientes. A data no campo “Próxima ação” será sincronizada ao registrar.</p>
         <div className="form-grid"><label>Atividade realizada<select disabled={busy} value={actionDraft[item.id]||'contacted'}
           onChange={e=>setActionDraft(x=>({...x,[item.id]:e.target.value as ActionKind}))}>
          {Object.entries(actionLabels).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
          <label>Próxima ação após esta atividade<input type="date" value={next} disabled={busy}
           onChange={e=>setNextDraft(x=>({...x,[item.id]:e.target.value}))}/></label></div>
         <button disabled={busy} className="secondary" onClick={()=>void recordAction(item)}>Registrar atividade</button>
        </div>
       </>}
      {recent.length>0&&<div className="digital-recent-actions"><h3>Últimas atividades registradas</h3>
       {recent.map(e=><p key={e.id}>{actionLabels[e.action_type]} · {asDateTime(e.created_at)} · {name(e.actor_id)}
        {' · Próxima ação: '}{asDate(e.next_action_on)}</p>)}</div>}
      <DigitalHistory key={item.id+'-'+item.updated_at} client={client} opportunityId={item.id} people={people}/>
     </article>;
    })}
    {visible.length===0&&<p>Sem oportunidades nesta seleção. Ausência de registro não significa ausência de trabalho.</p>}
   </div>}
   <div className="actions"><button className="secondary" disabled={busy||loading} onClick={()=>void refresh()}>Atualizar oportunidades</button></div>
  </section>
 </>;
}
