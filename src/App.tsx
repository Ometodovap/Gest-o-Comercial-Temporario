import {useCallback,useEffect,useMemo,useState} from 'react';
import type {FormEvent} from 'react';
import {createClient} from '@supabase/supabase-js';
import type {User} from '@supabase/supabase-js';
import type {Assignment,Feedback,Membership,Report,ReportFields,Team,Shift,Status,MonthlyGoal,GoalNumbers,TeamGoal} from './types';
import {teamCoverage,teamGoalFor,teamLeaderboard,teamMonthlyStats,teamRoster} from './teamPerformance';
import DigitalWorkspace from './DigitalWorkspace';
import {brl,emptyFields,evolution,moveDay,NUMERIC_FIELDS,percent,summary,todayBrazil,validateFields} from './metrics';
import {emptyGoal,goalForSeller,goalMetrics,goalProgress,managerTotals,monthDailyStats,monthlyReports,sellerMonthlyStats,validateGoal} from './goals';

const url=import.meta.env.VITE_SUPABASE_URL as string|undefined;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string|undefined;
const supabase=url&&key?createClient(url,key,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}}):null;
const shifts:{value:Shift;label:string}[]=[{value:'full',label:'Dia completo'},{value:'morning',label:'Manhã'},{value:'afternoon',label:'Tarde'},{value:'evening',label:'Noite'}];
const fields:{key:keyof Omit<ReportFields,'notes'>;name:string}[]=[
 {key:'atendimentos',name:'Novos atendimentos'},{key:'vendas_imediatas',name:'Vendas imediatas (clientes)'},
 {key:'agendamentos',name:'Agendamentos feitos'},{key:'retornos',name:'Retornos realizados'},
 {key:'vendas_retorno',name:'Vendas por retorno (clientes)'},{key:'cotas',name:'Cotas comercializadas'},
 {key:'valor_creditos',name:'Valor dos créditos (R$)'}
];
const roles={seller:'Vendedor',supervisor:'Supervisor',manager:'Diretoria'};
const statusNames={draft:'Rascunho',submitted:'Enviado',validated:'Validado',returned:'Devolvido'};
type Tab='day'|'results'|'team'|'feedback'|'evolution'|'goals'|'productivity'|'digital';
const today=todayBrazil();
function formatDate(value:string){if(!value)return '—';return value.split('-').reverse().join('/');}
function displayMetric(value:number,kind:'money'|'count'){return kind==='money'?brl(value):value.toLocaleString('pt-BR');}
function GoalMeter({label,actual,target,kind}:{label:string;actual:number;target:number;kind:'money'|'count'}){
 const pct=goalProgress(actual,target);
 return <div className="goal-meter"><div className="goal-meter-head"><b>{label}</b><span>{displayMetric(actual,kind)} / {target>0?displayMetric(target,kind):'Sem meta definida'}</span></div>
 {pct===null?<div className="no-goal">Meta não cadastrada</div>:<><div className="goal-track" aria-label={`${label}: ${pct.toFixed(1)}% da meta`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={Math.max(100,Math.ceil(pct))}><div className="goal-fill" style={{width:`${Math.min(100,Math.max(0,pct))}%`}}/></div><small>{pct.toFixed(1).replace('.',',')}% alcançado</small></>}
 </div>;
}

export default function App(){
 const [user,setUser]=useState<User|null>(null);
 const [ready,setReady]=useState(false);
 const [loginEmail,setLoginEmail]=useState('');const [loginPassword,setLoginPassword]=useState('');
 const [memberships,setMemberships]=useState<Membership[]>([]);const [companyId,setCompanyId]=useState('');
 const [companyName,setCompanyName]=useState('');const [companyChoices,setCompanyChoices]=useState<Record<string,string>>({});const [teamList,setTeamList]=useState<Team[]>([]);
 const [assignments,setAssignments]=useState<Assignment[]>([]);const [people,setPeople]=useState<Membership[]>([]);
 const [reports,setReports]=useState<Report[]>([]);const [feedbacks,setFeedbacks]=useState<Feedback[]>([]);
 const [goals,setGoals]=useState<MonthlyGoal[]>([]);const [teamGoals,setTeamGoals]=useState<TeamGoal[]>([]);const [periodMonth,setPeriodMonth]=useState(today.slice(0,7));
 const [goalSeller,setGoalSeller]=useState('');const [goalDraft,setGoalDraft]=useState<GoalNumbers>({...emptyGoal});
 const [goalTeam,setGoalTeam]=useState('');const [teamGoalDraft,setTeamGoalDraft]=useState<GoalNumbers>({...emptyGoal});
 const [tab,setTab]=useState<Tab>('day');const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');const [problem,setProblem]=useState('');
 const [workDate,setWorkDate]=useState(today);const [shift,setShift]=useState<Shift>('full');
 const [teamId,setTeamId]=useState('');const [reportFields,setReportFields]=useState<ReportFields>({...emptyFields});
 const [returnReasons,setReturnReasons]=useState<Record<string,string>>({});
 const [feedbackSeller,setFeedbackSeller]=useState('');const [indicator,setIndicator]=useState('Conversão imediata');
 const [diagnosis,setDiagnosis]=useState('');const [actionPlan,setActionPlan]=useState('');
 const [periodStart,setPeriodStart]=useState(moveDay(today,-7));const [periodEnd,setPeriodEnd]=useState(today);
 const [reviewDate,setReviewDate]=useState(moveDay(today,7));
 const [reviewStatus,setReviewStatus]=useState<Record<string,'improved'|'stable'|'needs_support'>>({});
 const [reviewNotes,setReviewNotes]=useState<Record<string,string>>({});
 const membership=memberships.find(m=>m.company_id===companyId);
 const role=membership?.role;
 const myAssignments=assignments.filter(x=>x.seller_id===user?.id&&x.active);
 const availableSellers=people.filter(x=>x.role==='seller'&&assignments.some(a=>a.seller_id===x.user_id&&a.active));
 const managedTeams=teamList.filter(t=>role==='manager'||(role==='supervisor'&&t.supervisor_user_id===user?.id));
 const teamRows=teamRoster(managedTeams,assignments,people,companyId).map(x=>({...x,stats:teamMonthlyStats(reports,x.team.id,periodMonth),monthlyGoal:teamGoalFor(teamGoals,x.team.id,periodMonth)}));
 const teamGoalSelected=teamGoalFor(teamGoals,goalTeam,periodMonth);
 const teamGoalCoverage=teamCoverage(teamGoals,managedTeams.map(t=>t.id),periodMonth);
 const editableReport=reports.find(r=>r.seller_id===user?.id&&r.work_date===workDate&&r.shift===shift);
 const canEdit=!editableReport||editableReport.status==='draft'||editableReport.status==='returned';
 const myReports=reports.filter(r=>r.seller_id===user?.id);
 const monthReports=monthlyReports(reports,periodMonth);
 const reportSummary=useMemo(()=>summary(monthlyReports(role==='seller'?myReports:reports,periodMonth)),[role,myReports,reports,periodMonth]);
 const teamTotals=managerTotals(reports,goals,availableSellers.map(s=>s.user_id),periodMonth);
 const ownTotals=sellerMonthlyStats(reports,user?.id||'',periodMonth);
 const dailyRows=monthDailyStats(role==='seller'?myReports:reports,periodMonth);
 const goalSelected=goalForSeller(goals,goalSeller,periodMonth);
 const ownGoal=goalForSeller(goals,user?.id||'',periodMonth);
 const pendingReports=monthReports.filter(r=>r.status==='submitted').length;
 const tabItems:{id:Tab;label:string;allowed:boolean}[]=[
 {id:'day',label:'Meu dia',allowed:role==='seller'},
 {id:'results',label:role==='seller'?'Meus resultados':'Resultados',allowed:!!role},
 {id:'goals',label:role==='seller'?'Minhas metas':'Metas e desempenho',allowed:!!role},
 {id:'productivity',label:'Produtividade por stand',allowed:role==='supervisor'||role==='manager'},
 {id:'digital',label:'Vendas digitais',allowed:!!role},
 {id:'team',label:'Minha equipe',allowed:role==='supervisor'||role==='manager'},
 {id:'feedback',label:role==='seller'?'Meus feedbacks':'Feedback e planos',allowed:!!role},
 {id:'evolution',label:role==='seller'?'Minha evolução':'Evolução da equipe',allowed:!!role}
 ];
 function notify(msg:string,err=false){if(err){setProblem(msg);setMessage('')}else{setMessage(msg);setProblem('')}}

 useEffect(()=>{if(!supabase){setReady(true);return;}
  let active=true;
  supabase.auth.getUser().then(({data,error})=>{if(active){setUser(error?null:data.user);setReady(true)}});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{setUser(session?.user||null);setReady(true)});
  return ()=>{active=false;subscription.unsubscribe()};
 },[]);
 useEffect(()=>{if(!user||!supabase){setMemberships([]);setCompanyId('');return;}
  let active=true;
  supabase.from('gc_memberships').select('company_id,user_id,role,display_name,active').eq('user_id',user.id).eq('active',true)
   .then(({data,error})=>{if(!active)return;if(error){notify('Não foi possível carregar sua vinculação: '+error.message,true);return;}
    const ms=(data||[]) as Membership[];setMemberships(ms);setCompanyId(prev=>ms.some(m=>m.company_id===prev)?prev:(ms[0]?.company_id||''));
    if(ms.length){void supabase!.from('gc_companies').select('id,name').in('id',ms.map(m=>m.company_id)).then(({data:cs})=>{
      if(active&&cs)setCompanyChoices(Object.fromEntries(cs.map(c=>[c.id,c.name])));
    });}
   });return()=>{active=false};
 },[user?.id]);
 const loadData=useCallback(async()=>{
  if(!supabase||!companyId)return;
  setBusy(true);
  try{
   const [c,t,a,p,r,f,g,tg]=await Promise.all([
    supabase.from('gc_companies').select('name').eq('id',companyId).single(),
    supabase.from('gc_teams').select('id,company_id,name,unit_name,supervisor_user_id').eq('company_id',companyId),
    supabase.from('gc_team_members').select('company_id,team_id,seller_id,active').eq('company_id',companyId).eq('active',true),
    supabase.from('gc_memberships').select('company_id,user_id,role,display_name,active').eq('company_id',companyId).eq('active',true),
    supabase.from('gc_daily_reports').select('*').eq('company_id',companyId).order('work_date',{ascending:false}).limit(1000),
    supabase.from('gc_coaching_feedback').select('*').eq('company_id',companyId).order('created_at',{ascending:false}).limit(500),
    supabase.from('gc_monthly_goals').select('*').eq('company_id',companyId).eq('month_start',`${periodMonth}-01`),
    supabase.from('gc_team_monthly_goals').select('*').eq('company_id',companyId).eq('month_start',`${periodMonth}-01`)
   ]);
   const err=[c,t,a,p,r,f,g,tg].find(x=>x.error)?.error;
   if(err)throw err;
   setCompanyName(c.data?.name||'Empresa');setTeamList((t.data||[]) as Team[]);
   setAssignments((a.data||[]) as Assignment[]);setPeople((p.data||[]) as Membership[]);
   setReports((r.data||[]) as Report[]);setFeedbacks((f.data||[]) as Feedback[]);setGoals((g.data||[]) as MonthlyGoal[]);setTeamGoals((tg.data||[]) as TeamGoal[]);
  }catch(e){notify(`Falha ao consultar informações: ${e instanceof Error?e.message:(e&&typeof e==='object'&&'message' in e?String(e.message):String(e))}`,true)}finally{setBusy(false)}
 },[companyId,periodMonth]);
 useEffect(()=>{void loadData()},[loadData]);
 useEffect(()=>{
  const x=reports.find(r=>r.seller_id===user?.id&&r.work_date===workDate&&r.shift===shift);
  setReportFields(x?Object.fromEntries([...NUMERIC_FIELDS,'notes'].map(k=>[k,x[k as keyof Report]])) as ReportFields:{...emptyFields});
  if(x)setTeamId(x.team_id);else if(myAssignments.length>0)setTeamId(old=>myAssignments.some(a=>a.team_id===old)?old:myAssignments[0].team_id);
 },[workDate,shift,reports,user?.id,assignments]);
 useEffect(()=>{if(role==='seller'){if(tab==='team'||tab==='productivity')setTab('day')}else if(role&&tab==='day')setTab('team');},[role,tab]);
 useEffect(()=>{if(availableSellers.length&&!availableSellers.some(x=>x.user_id===feedbackSeller))setFeedbackSeller(availableSellers[0].user_id)},[availableSellers.length,companyId]);
 useEffect(()=>{if(availableSellers.length&&!availableSellers.some(x=>x.user_id===goalSeller))setGoalSeller(availableSellers[0].user_id)},[availableSellers.length,companyId]);
 useEffect(()=>{const g=goalForSeller(goals,goalSeller,periodMonth);setGoalDraft(g?{goal_atendimentos:Number(g.goal_atendimentos),goal_vendas:Number(g.goal_vendas),goal_cotas:Number(g.goal_cotas),goal_creditos:Number(g.goal_creditos)}:{...emptyGoal});},[goals,goalSeller,periodMonth]);
 useEffect(()=>{if(managedTeams.length&&!managedTeams.some(t=>t.id===goalTeam))setGoalTeam(managedTeams[0].id);},[managedTeams.map(t=>t.id).join(','),goalTeam]);
 useEffect(()=>{const g=teamGoalFor(teamGoals,goalTeam,periodMonth);setTeamGoalDraft(g?{goal_atendimentos:Number(g.goal_atendimentos),goal_vendas:Number(g.goal_vendas),goal_cotas:Number(g.goal_cotas),goal_creditos:Number(g.goal_creditos)}:{...emptyGoal});},[teamGoals,goalTeam,periodMonth]);

 async function signIn(e:FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);setProblem('');
  const {error}=await supabase.auth.signInWithPassword({email:loginEmail,password:loginPassword});setBusy(false);
  if(error)notify('Não foi possível entrar: '+error.message,true);
 }
 async function logout(){await supabase?.auth.signOut();setTab('day');setMessage('');setProblem('')}
 async function saveReport(status:'draft'|'submitted'){
  if(!supabase||!user||!companyId)return;
  const error=validateFields(reportFields);if(error){notify(error,true);return;}
  if(!teamId||!myAssignments.some(a=>a.team_id===teamId)){notify('Seu usuário não possui uma equipe ativa selecionada.',true);return;}
  if(!canEdit){notify('Registro enviado ou validado não pode ser alterado.',true);return;}
  setBusy(true);let result;
  const payload={...reportFields,status,returned_reason:''};
  if(editableReport){result=await supabase.from('gc_daily_reports').update(payload).eq('id',editableReport.id).select('id').single()}
  else{result=await supabase.from('gc_daily_reports').insert({...payload,company_id:companyId,team_id:teamId,seller_id:user.id,work_date:workDate,shift}).select('id').single()}
  setBusy(false);
  if(result.error){notify('Não foi possível gravar: '+result.error.message,true);return;}
  notify(status==='draft'?'Rascunho salvo no banco.':'Fechamento enviado ao supervisor.');await loadData();
 }
 async function reviewReport(r:Report,status:'validated'|'returned'){
  if(!supabase)return;
  const reason=(returnReasons[r.id]||'').trim();if(status==='returned'&&!reason){notify('Informe o motivo da devolução.',true);return;}
  setBusy(true);
  const {error}=await supabase.from('gc_daily_reports').update({status,returned_reason:status==='returned'?reason:''}).eq('id',r.id).eq('status','submitted').select('id').single();
  setBusy(false);if(error){notify(error.message,true);return;}notify(status==='validated'?'Lançamento validado.':'Lançamento devolvido para correção.');await loadData();
 }
 async function createFeedback(e:FormEvent){e.preventDefault();if(!supabase||!user||!companyId||!feedbackSeller)return;
  if(!indicator.trim()||!diagnosis.trim()||!actionPlan.trim()||periodStart>periodEnd||reviewDate<periodEnd){notify('Revise o conteúdo e as datas do feedback.',true);return;}
  setBusy(true);
  const {error}=await supabase.from('gc_coaching_feedback').insert({company_id:companyId,seller_id:feedbackSeller,supervisor_id:user.id,
   period_start:periodStart,period_end:periodEnd,indicator:indicator.trim(),diagnosis:diagnosis.trim(),action_plan:actionPlan.trim(),review_date:reviewDate});
  setBusy(false);if(error){notify('Não foi possível registrar: '+error.message,true);return;}
  notify('Feedback registrado para leitura do vendedor.');setDiagnosis('');setActionPlan('');await loadData();
 }
 async function acknowledge(f:Feedback){if(!supabase)return;setBusy(true);
  const {error}=await supabase.from('gc_coaching_feedback').update({acknowledged_at:new Date().toISOString()}).eq('id',f.id).is('acknowledged_at',null).select('id').single();
  setBusy(false);if(error){notify(error.message,true);return;}notify('Leitura confirmada.');await loadData();
 }
 async function saveReview(f:Feedback){if(!supabase)return;const v=reviewStatus[f.id];if(!v){notify('Selecione uma avaliação.',true);return;}
  setBusy(true);
  const {error}=await supabase.from('gc_coaching_feedback').update({review_status:v,review_notes:(reviewNotes[f.id]||'').trim(),reviewed_at:new Date().toISOString()}).eq('id',f.id).is('reviewed_at',null).select('id').single();
  setBusy(false);if(error){notify(error.message,true);return;}notify('Revisão registrada.');await loadData();
 }
 async function saveGoal(e:FormEvent){e.preventDefault();if(!supabase||!companyId||!user||role==='seller'||!goalSeller)return;
  if(!availableSellers.some(s=>s.user_id===goalSeller)){notify('Vendedor fora da sua equipe autorizada.',true);return;}
  const warning=validateGoal(goalDraft);if(warning){notify(warning,true);return;}
  setBusy(true);
  const data=goalSelected?
   await supabase.from('gc_monthly_goals').update(goalDraft).eq('id',goalSelected.id).eq('company_id',companyId).select('id').single():
   await supabase.from('gc_monthly_goals').insert({...goalDraft,company_id:companyId,seller_id:goalSeller,month_start:`${periodMonth}-01`,created_by:user.id,updated_by:user.id}).select('id').single();
  setBusy(false);
  if(data.error){notify('Falha ao salvar metas: '+data.error.message,true);return;}
  notify('Metas mensais gravadas no banco.');await loadData();
 }
 async function saveTeamGoal(e:FormEvent){e.preventDefault();if(!supabase||!companyId||!user||role==='seller'||!goalTeam)return;
  if(!managedTeams.some(t=>t.id===goalTeam)){notify('Stand fora da sua supervisão autorizada.',true);return;}
  const warning=validateGoal(teamGoalDraft);if(warning){notify(warning,true);return;}
  setBusy(true);
  const result=teamGoalSelected ?
   await supabase.from('gc_team_monthly_goals').update(teamGoalDraft).eq('id',teamGoalSelected.id).eq('company_id',companyId).select('id').single():
   await supabase.from('gc_team_monthly_goals').insert({...teamGoalDraft,company_id:companyId,team_id:goalTeam,month_start:`${periodMonth}-01`}).select('id').single();
  setBusy(false);if(result.error){notify('Falha ao salvar meta do stand: '+result.error.message,true);return;}
  notify('Meta do stand gravada no Supabase.');await loadData();
 }
 const name=(id:string)=>people.find(x=>x.user_id===id)?.display_name||'Usuário vinculado';
 const teamName=(id:string)=>teamList.find(x=>x.id===id)?.name||'Equipe';
 if(!url||!key)return <div className="setup"><h1>EPSA Gestão Comercial</h1><p>Versão preparada para conectar a um Supabase de desenvolvimento isolado.</p><p>Configure <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> em <code>.env</code>. Não use a chave <code>service_role</code>.</p></div>;
 if(!ready)return <div className="setup">Carregando autenticação...</div>;
 if(!user)return <div className="login"><div className="login-card"><div className="brand-mark">⬡</div><h1>EPSA Gestão Comercial</h1><p>Gestão de produtividade e desenvolvimento comercial</p><form onSubmit={signIn}><label>E-mail<input type="email" autoComplete="username" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} required/></label><label>Senha<input type="password" autoComplete="current-password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required/></label><button className="primary" disabled={busy}>Entrar</button></form>{problem&&<p className="error" role="alert">{problem}</p>}<small>O acesso é concedido pela administração da empresa. Não há autocadastro nesta versão.</small></div></div>;
 if(!membership)return <div className="setup"><h1>EPSA Gestão Comercial</h1>{problem&&<p className="error">{problem}</p>}<p>Usuário autenticado, mas sem empresa ativa vinculada ao módulo. A administração deve cadastrar a associação entre seu usuário e a empresa no projeto de desenvolvimento.</p><button onClick={logout}>Sair</button></div>;
 return <div className="layout"><aside className="sidebar"><div className="brand"><span className="brand-mark">⬡</span><div><b>EPSA Gestão</b><small>COMERCIAL</small></div></div><div className="sidebar-name">{companyName}</div><nav aria-label="Navegação principal">{tabItems.filter(x=>x.allowed).map(x=><button type="button" key={x.id} aria-current={tab===x.id?'page':undefined} className={tab===x.id?'nav-active':''} onClick={()=>{setTab(x.id);setMessage('');setProblem('')}}>{x.label}</button>)}</nav><div className="sidebar-bottom"><b>{membership.display_name}</b><small>{roles[role!]}</small><button onClick={logout}>Sair da conta</button></div></aside>
 <main className="content"><header className="topbar"><div><b>EPSA Core · Gestão Comercial</b><small>Presencial e digital • ambiente independente</small></div><div className="toolbar">{memberships.length>1&&<select aria-label="Empresa" value={companyId} onChange={e=>{setCompanyId(e.target.value);setReports([]);setGoals([]);setTeamGoals([]);setTeamList([]);setFeedbacks([]);setAssignments([]);setPeople([])}}>{memberships.map(m=><option key={m.company_id} value={m.company_id}>{companyChoices[m.company_id]||m.company_id.slice(0,8)}</option>)}</select>}<button className="secondary" disabled={busy} onClick={()=>void loadData()}>Atualizar</button></div></header>
 <div className="page"><div className="hero"><div><small>EPSA GESTÃO COMERCIAL</small><h1>{tabItems.find(x=>x.id===tab)?.label}</h1><p>Atividades registradas, indicadores confiáveis e acompanhamento de resultados.</p></div><span>{companyName}<br/>{formatDate(today)}</span></div>
 {problem&&<div className="error" role="alert">{problem}</div>}{message&&<div className="success" role="status">{message}</div>}
 {(tab==='results'||tab==='goals'||tab==='productivity')&&<div className="period-bar"><label>Mês de referência <input type="month" value={periodMonth} onChange={e=>setPeriodMonth(e.target.value)}/></label><span>Indicadores: lançamentos enviados e validados. Ausência de registro não significa zero atendimentos ou zero vendas.</span></div>}
 {tab==='day'&&role==='seller'&&<section className="panel"><h2>Fechamento diário</h2><p>Preencha o movimento do dia. Retornos não entram em novos atendimentos. Uma venda pode representar mais de uma cota.</p><div className="form-grid"><label>Data<input type="date" value={workDate} onChange={e=>setWorkDate(e.target.value)} max={today}/></label><label>Turno<select value={shift} onChange={e=>setShift(e.target.value as Shift)}>{shifts.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label><label>Equipe/stand<select disabled={!canEdit} value={teamId} onChange={e=>setTeamId(e.target.value)}>{myAssignments.map(a=><option value={a.team_id} key={a.team_id}>{teamName(a.team_id)}</option>)}</select></label></div>
 {editableReport&&<div className={'status '+editableReport.status}>Situação do lançamento: {statusNames[editableReport.status]}{editableReport.status==='returned'&&<p>Motivo: {editableReport.returned_reason}</p>}</div>}
 <div className="form-grid">{fields.map(x=><label key={x.key}>{x.name}<input disabled={!canEdit} min="0" step={x.key==='valor_creditos'?'0.01':'1'} type="number" value={Number.isNaN(reportFields[x.key])?'':reportFields[x.key]} onChange={e=>setReportFields(old=>({...old,[x.key]:e.target.value===''?NaN:Number(e.target.value)}))}/></label>)}</div><label>Observações (opcional)<textarea disabled={!canEdit} maxLength={500} rows={3} value={reportFields.notes} onChange={e=>setReportFields(old=>({...old,notes:e.target.value}))}/></label><p className="help">Conversão imediata: {percent(reportFields.atendimentos>0?reportFields.vendas_imediatas/reportFields.atendimentos*100:null)}</p>
 <div className="actions"><button disabled={!canEdit||busy} className="secondary" onClick={()=>void saveReport('draft')}>Salvar rascunho</button><button disabled={!canEdit||busy} className="primary" onClick={()=>void saveReport('submitted')}>Enviar fechamento</button></div></section>}
 {tab==='results'&&<><section className="kpis"><div><small>Atendimentos</small><strong>{reportSummary.atendimentos}</strong></div><div><small>Vendas imediatas</small><strong>{reportSummary.vendas_imediatas}</strong></div><div><small>Conversão imediata</small><strong>{percent(reportSummary.conversion)}</strong></div><div><small>Cotas</small><strong>{reportSummary.cotas}</strong></div><div><small>Valor de créditos</small><strong>{brl(reportSummary.valor_creditos)}</strong></div></section><section className="panel"><h2>Acompanhamento do mês</h2><div className="mini-stats"><span>{reportSummary.days} dias com registro válido</span><span>{pendingReports} pendente(s) de validação</span><span>{reportSummary.vendas_imediatas+reportSummary.vendas_retorno} clientes compradores (imediatas + retornos)</span></div>{dailyRows.length>0&&<div className="daily-bars"><h3>Atendimentos por dia com lançamento</h3>{dailyRows.map(d=><div className="daily-row" key={d.date}><small>{formatDate(d.date)}</small><div className="daily-bar-track"><div className="daily-bar-fill" style={{width:`${Math.max(0,Math.min(100,100*d.atendimentos/Math.max(1,...dailyRows.map(x=>x.atendimentos))))}%`}}/></div><b>{d.atendimentos} atend. · {d.vendas} vendas</b></div>)}</div>}</section>
 <section className="panel"><h2>Lançamentos consultáveis</h2><p>Apenas lançamentos enviados ou validados compõem os indicadores. Falta de registro não equivale a zero vendas.</p><div className="table-scroll"><table><thead><tr><th>Dia</th><th>Vendedor</th><th>Stand</th><th>Atend.</th><th>Vendas</th><th>Cotas</th><th>Status</th></tr></thead><tbody>{monthReports.filter(r=>role!=='seller'||r.seller_id===user?.id).map(r=><tr key={r.id}><td>{formatDate(r.work_date)}</td><td>{name(r.seller_id)}</td><td>{teamName(r.team_id)}</td><td>{r.atendimentos}</td><td>{r.vendas_imediatas+r.vendas_retorno}</td><td>{r.cotas}</td><td><span className={'status '+r.status}>{statusNames[r.status]}</span></td></tr>)}</tbody></table></div></section></>}
 {tab==='goals'&&<>
 {role==='seller'?<section className="panel"><h2>Minhas metas — {periodMonth.split('-').reverse().join('/')}</h2><p>Resultados acumulados a partir dos lançamentos enviados e validados. Meta zero = não cadastrada.</p><div className="goal-grid">{goalMetrics.map(m=><GoalMeter key={m.key} label={m.label} actual={ownTotals[m.actual]} target={Number(ownGoal?.[m.key]||0)} kind={m.format}/>)}</div><div className="mini-stats"><span>{ownTotals.days} dias com registros válidos</span><span>Conversão imediata: {percent(ownTotals.conversion)}</span><span>{ownTotals.pending} fechamento(s) aguardando validação</span></div></section>:<>
 <section className="panel"><h2>Visão consolidada — {periodMonth.split('-').reverse().join('/')}</h2><p>Metas de vendedores autorizados somadas. Uma meta ausente não é tratada como zero desempenho.</p><div className="mini-stats"><span>{teamTotals.vendedores} vendedor(es)</span><span>{teamTotals.comMeta} com ao menos uma meta definida</span><span>{teamTotals.pendentes} fechamento(s) pendente(s)</span><span>Conversão imediata: {percent(teamTotals.conversion)}</span></div><div className="goal-grid">{goalMetrics.map(m=><GoalMeter key={m.key} label={m.label} actual={teamTotals[m.actual]} target={teamTotals.metas[m.key]} kind={m.format}/>)}</div>{teamTotals.comMeta!==teamTotals.vendedores&&<p className="help">Atenção: algumas metas ainda não foram cadastradas. O total planejado pode estar incompleto.</p>}</section>
 <section className="panel"><h2>Metas e resultados por vendedor</h2><p>Referência mensal. Conversão imediata = vendas imediatas ÷ novos atendimentos; vendas por retorno entram no total de compradores, não nessa taxa.</p><div className="table-scroll"><table><thead><tr><th>Vendedor</th><th>Atendimentos</th><th>Compradores</th><th>Conversão imediata</th><th>Cotas</th><th>Créditos</th><th>Metas</th></tr></thead><tbody>{availableSellers.map(s=>{const perf=sellerMonthlyStats(reports,s.user_id,periodMonth);const g=goalForSeller(goals,s.user_id,periodMonth);return <tr key={s.user_id}><td><b>{s.display_name}</b></td><td>{perf.atendimentos}</td><td>{perf.compradores}</td><td>{percent(perf.conversion)}</td><td>{perf.cotas}</td><td>{brl(perf.valor_creditos)}</td><td>{g?`${goalMetrics.filter(m=>Number(g[m.key])>0).length}/4 definidas`:'Não definidas'}</td></tr>})}{availableSellers.length===0&&<tr><td colSpan={7}>Sem vendedores atribuídos à equipe.</td></tr>}</tbody></table></div></section>
 <section className="panel"><h2>Definir metas mensais</h2><p>Somente supervisores e diretoria autorizados podem registrar ou alterar metas. Não são copiadas automaticamente para outros meses.</p><form onSubmit={saveGoal}><div className="form-grid"><label>Vendedor<select value={goalSeller} onChange={e=>setGoalSeller(e.target.value)}>{availableSellers.map(s=><option value={s.user_id} key={s.user_id}>{s.display_name}</option>)}</select></label>{goalMetrics.map(m=><label key={m.key}>{m.label}<input type="number" min="0" step={m.format==='money'?'0.01':'1'} value={Number.isNaN(goalDraft[m.key])?'':goalDraft[m.key]} onChange={e=>setGoalDraft(o=>({...o,[m.key]:e.target.value===''?NaN:Number(e.target.value)}))}/></label>)}</div><p>Preencha 0 para deixar determinada meta sem definição. Informe pelo menos uma meta positiva.</p><button disabled={busy||!goalSeller} className="primary">{goalSelected?'Atualizar metas do vendedor':'Cadastrar metas do vendedor'}</button></form></section></>}
 {role!=='seller'&&<section className="panel"><h2>Definir metas do stand</h2><p>Metas próprias da equipe, sem sobrescrever as metas dos vendedores. Visíveis apenas a usuários autorizados.</p><form onSubmit={saveTeamGoal}><div className="form-grid"><label>Equipe / stand<select value={goalTeam} onChange={e=>setGoalTeam(e.target.value)}>{managedTeams.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></label>{goalMetrics.map(m=><label key={m.key}>{m.label}<input type="number" min="0" step={m.format==='money'?'0.01':'1'} value={Number.isNaN(teamGoalDraft[m.key])?'':teamGoalDraft[m.key]} onChange={e=>setTeamGoalDraft(o=>({...o,[m.key]:e.target.value===''?NaN:Number(e.target.value)}))}/></label>)}</div><p>Informe ao menos uma meta positiva. Zero significa meta ainda não definida.</p><button className="primary" disabled={busy||!goalTeam}>{teamGoalSelected?'Atualizar meta do stand':'Cadastrar meta do stand'}</button></form></section>}
 </>}
 {tab==='digital'&&supabase&&user&&role&&<DigitalWorkspace key={companyId} client={supabase} companyId={companyId} userId={user.id} role={role} assignments={assignments} people={people} teams={teamList}/>}
 {tab==='productivity'&&role!=='seller'&&<>
 <section className="panel"><h2>Produtividade presencial por stand — {periodMonth.split('-').reverse().join('/')}</h2><p>Indicadores calculados sobre lançamentos enviados ou validados, identificados pelo stand do dia. Ausência de registro não representa zero produção.</p><div className="mini-stats"><span>{managedTeams.length} stand(s) sob sua responsabilidade</span><span>{teamGoalCoverage.configured}/{teamGoalCoverage.total} com meta mensal</span><span>{teamRows.reduce((n,x)=>n+x.stats.pendentes,0)} fechamento(s) pendente(s)</span></div>
 <div className="table-scroll"><table><thead><tr><th>Stand</th><th>Equipe ativa</th><th>Atendimentos</th><th>Compradores</th><th>Conv. imediata</th><th>Cotas</th><th>Créditos</th><th>Dias-vendedor com lançamento</th><th>Meta</th></tr></thead><tbody>{teamRows.map(x=><tr key={x.team.id}><td><b>{x.team.name}</b><small className="cell-subtitle">{x.team.unit_name}</small></td><td>{x.sellerIds.length}</td><td>{x.stats.atendimentos}</td><td>{x.stats.compradores}</td><td>{percent(x.stats.conversion)}</td><td>{x.stats.cotas}</td><td>{brl(x.stats.valor_creditos)}</td><td>{x.stats.days}</td><td>{x.monthlyGoal?`${goalMetrics.filter(m=>Number(x.monthlyGoal?.[m.key])>0).length}/4`:'Não definida'}</td></tr>)}{teamRows.length===0&&<tr><td colSpan={9}>Nenhum stand sob supervisão ativa.</td></tr>}</tbody></table></div></section>
 {teamRows.map(x=><section className="panel" key={x.team.id}><h2>{x.team.name} — metas e vendedores</h2><p>Metas da equipe são independentes das metas individuais. Resultados continuam ligados ao stand onde cada atendimento ocorreu.</p><div className="goal-grid">{goalMetrics.map(m=><GoalMeter key={m.key} label={m.label} actual={x.stats[m.actual]} target={Number(x.monthlyGoal?.[m.key]||0)} kind={m.format}/>)}</div><div className="mini-stats"><span>Conversão imediata: {percent(x.stats.conversion)}</span><span>{x.stats.validados} lançamento(s) validado(s)</span><span>{x.stats.pendentes} pendente(s)</span></div><div className="table-scroll"><table><thead><tr><th>Vendedor</th><th>Atendimentos</th><th>Compradores</th><th>Conversão</th><th>Cotas</th><th>Créditos</th></tr></thead><tbody>{teamLeaderboard(reports,x.team.id,periodMonth).map(y=><tr key={y.sellerId}><td>{name(y.sellerId)}</td><td>{y.atendimentos}</td><td>{y.compradores}</td><td>{percent(y.conversion)}</td><td>{y.cotas}</td><td>{brl(y.valor_creditos)}</td></tr>)}{teamLeaderboard(reports,x.team.id,periodMonth).length===0&&<tr><td colSpan={6}>Nenhum lançamento válido neste mês.</td></tr>}</tbody></table></div></section>)}
 </>}
 {tab==='team'&&role!=='seller'&&<section className="panel"><h2>Fechamentos da equipe</h2><p>Valide os registros enviados ou devolva com uma orientação. O supervisor não altera quantidades do vendedor.</p><div className="cards">{reports.filter(r=>r.status==='submitted').map(r=><article className="activity" key={r.id}><header><b>{name(r.seller_id)}</b><span>{formatDate(r.work_date)} · {teamName(r.team_id)}</span></header><div className="mini-stats"><span>{r.atendimentos} atendimentos</span><span>{r.vendas_imediatas} vendas imediatas</span><span>{r.vendas_retorno} por retorno</span><span>{r.cotas} cotas</span></div><label>Motivo de devolução<input placeholder="Informe apenas se for devolver" maxLength={500} value={returnReasons[r.id]||''} onChange={e=>setReturnReasons(o=>({...o,[r.id]:e.target.value}))}/></label><div className="actions"><button disabled={busy} className="secondary" onClick={()=>void reviewReport(r,'returned')}>Devolver</button><button disabled={busy} className="primary" onClick={()=>void reviewReport(r,'validated')}>Validar lançamento</button></div></article>)}{!reports.some(r=>r.status==='submitted')&&<p>Não há lançamentos aguardando validação entre seus registros autorizados.</p>}</div></section>}
 {tab==='feedback'&&<>{role!=='seller'&&<section className="panel"><h2>Nova orientação</h2><form onSubmit={createFeedback}><div className="form-grid"><label>Vendedor<select value={feedbackSeller} onChange={e=>setFeedbackSeller(e.target.value)}>{availableSellers.map(p=><option key={p.user_id} value={p.user_id}>{p.display_name}</option>)}</select></label><label>Indicador observado<input maxLength={100} value={indicator} onChange={e=>setIndicator(e.target.value)} required/></label><label>Início do período<input type="date" value={periodStart} onChange={e=>setPeriodStart(e.target.value)} required/></label><label>Fim do período<input type="date" value={periodEnd} onChange={e=>setPeriodEnd(e.target.value)} required/></label><label>Data de revisão<input type="date" value={reviewDate} onChange={e=>setReviewDate(e.target.value)} required/></label></div><label>Diagnóstico e contexto<textarea required minLength={2} maxLength={700} value={diagnosis} onChange={e=>setDiagnosis(e.target.value)} rows={3}/></label><label>Ação combinada<textarea required minLength={2} maxLength={700} value={actionPlan} onChange={e=>setActionPlan(e.target.value)} rows={3}/></label><button disabled={busy||!feedbackSeller} className="primary">Registrar feedback e ação</button></form></section>}
 <section className="panel"><h2>{role==='seller'?'Orientações recebidas':'Histórico de feedbacks'}</h2><p>Confirmação de leitura significa recebimento, não concordância automática.</p><div className="cards">{feedbacks.map(f=><article className="activity" key={f.id}><header><b>{f.indicator} — {name(f.seller_id)}</b><span>{f.acknowledged_at?'Leitura confirmada':'Aguardando leitura'}</span></header><small>Período: {formatDate(f.period_start)} a {formatDate(f.period_end)} · Revisão {formatDate(f.review_date)}</small><p><b>Diagnóstico:</b> {f.diagnosis}</p><div className="callout"><b>Ação combinada</b><p>{f.action_plan}</p></div>{role==='seller'&&!f.acknowledged_at&&<button className="secondary" disabled={busy} onClick={()=>void acknowledge(f)}>Confirmar leitura</button>}{f.reviewed_at&&<div className="success">Revisão: {f.review_status==='improved'?'Melhorou':f.review_status==='stable'?'Estável':'Precisa de acompanhamento'} · {f.review_notes||'Sem observações adicionais'}</div>}</article>)}{feedbacks.length===0&&<p>Não há orientações registradas ainda.</p>}</div></section></>}
 {tab==='evolution'&&<section className="panel"><h2>Evolução após as orientações</h2><p>Janelas de até sete dias antes e depois. São necessários três dias com registros válidos em cada janela; a comparação não prova causalidade.</p><div className="cards">{feedbacks.map(f=>{const e=evolution(f,reports,today);return <article key={f.id} className="activity"><header><b>{f.indicator} — {name(f.seller_id)}</b><span>{formatDate(f.review_date)}</span></header><div className="mini-stats"><span>Antes: {percent(e.before.conversion)} ({e.before.days} dias)</span><span>Depois: {percent(e.after.conversion)} ({e.after.days} dias)</span><span>{e.available&&e.delta!==null?`Variação: ${e.delta.toFixed(1)} p.p.`:'Dados ainda insuficientes'}</span></div><p><b>Ação:</b> {f.action_plan}</p>{f.reviewed_at?<div className="success">Revisão registrada: {f.review_notes||f.review_status}</div>:role!=='seller'&&<><label>Avaliação<select value={reviewStatus[f.id]||''} onChange={ev=>setReviewStatus(o=>({...o,[f.id]:ev.target.value as 'improved'|'stable'|'needs_support'}))}><option value="">Selecione...</option><option value="improved">Melhorou</option><option value="stable">Estável</option><option value="needs_support">Precisa de acompanhamento</option></select></label><label>Observações<textarea rows={2} maxLength={700} value={reviewNotes[f.id]||''} onChange={ev=>setReviewNotes(o=>({...o,[f.id]:ev.target.value}))}/></label><button disabled={busy} className="primary" onClick={()=>void saveReview(f)}>Registrar revisão</button></>}</article>})}{feedbacks.length===0&&<p>Sem feedbacks para comparar.</p>}</div></section>}
 <footer>EPSA Gestão Comercial v0.10 — Ambiente Supabase de homologação, dados fictícios. Não usar dados reais.</footer></div></main></div>;
}
