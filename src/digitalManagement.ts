import {dueStatus} from './digitalInsights';
import type {DigitalActionRow,DigitalOpportunityRow,DigitalStageRow} from './digitalInsights';

export type DigitalManagementAlert='overdue'|'today'|'stalled'|'unscheduled';

export type ManagementOpportunity={
 id:string;sellerId:string;stage:DigitalOpportunityRow['stage'];nextActionOn:string|null;
 lastRecordedAt:string;daysWithoutMovement:number;
 alerts:DigitalManagementAlert[];
};
export type ManagementSeller={
 sellerId:string;total:number;open:number;overdue:number;today:number;
 stalled:number;unscheduled:number;alerts:number;
};
export type ManagementSummary={
 total:number;open:number;won:number;lost:number;
 overdue:number;today:number;stalled:number;unscheduled:number;
 sellers:ManagementSeller[];
 priority:ManagementOpportunity[];
};

const activeStages=new Set<DigitalOpportunityRow['stage']>(['prospecting','contacted','qualified','proposal','negotiation']);
const alertOrder:Record<DigitalManagementAlert,number>={overdue:0,today:1,stalled:2,unscheduled:3};
const brasil=new Intl.DateTimeFormat('en-GB',{
 timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'
});
export const managerAlertLabels:Record<DigitalManagementAlert,string>={
 overdue:'Ação vencida',today:'Ação para hoje',stalled:'Sem movimentação registrada',unscheduled:'Sem próxima ação'
};

/** Data de um timestamp UTC no calendário civil do Brasil (nunca do computador). */
export function brazilDay(iso:string):string{
 const d=new Date(iso);
 if(!Number.isFinite(d.valueOf()))throw new Error('Data de movimentação inválida');
 const p=brasil.formatToParts(d);
 const part=(type:string)=>p.find(x=>x.type===type)?.value||'';
 return part('year')+'-'+part('month')+'-'+part('day');
}

/** Diferença em dias civis; nunca faz a comparação pela hora local do usuário. */
export function daysSinceBrazil(iso:string,today:string):number{
 const a=brazilDay(iso);
 const ms=(ymd:string)=>{
  const [y,m,d]=ymd.split('-').map(Number);
  return Date.UTC(y,m-1,d);
 };
 return Math.max(0,Math.round((ms(today)-ms(a))/86400000));
}

function maxTimestamp(a:string,b:string){
 return new Date(a).valueOf()>=new Date(b).valueOf()?a:b;
}

/**
 * Alerta calculado sobre oportunidades e eventos que o usuário já pode consultar via RLS.
 * 7 dias é sugestão inicial, não mede ausência de trabalho fora do sistema.
 * Contadores de critérios se sobrepõem: uma mesma oportunidade pode ter mais de um alerta.
 */
export function digitalManagementSummary(
 opportunities:DigitalOpportunityRow[],
 stageEvents:DigitalStageRow[],
 followups:DigitalActionRow[],
 today:string,
 stallDays:number=7
):ManagementSummary{
 if(![3,7,14].includes(stallDays))throw new Error('Limite de inatividade inválido');
 const known=new Set(opportunities.map(x=>x.id));
 const latest=new Map<string,string>();
 const push=(id:string,iso:string)=>{
  if(!known.has(id))return;
  const previous=latest.get(id);
  latest.set(id,previous?maxTimestamp(previous,iso):iso);
 };
 for(const x of stageEvents)push(x.opportunity_id,x.created_at);
 for(const x of followups)push(x.opportunity_id,x.created_at);
 const openItems:ManagementOpportunity[]=opportunities.filter(x=>activeStages.has(x.stage)).map(o=>{
  const last=latest.has(o.id)?maxTimestamp(o.created_at,latest.get(o.id)!):o.created_at;
  const days=daysSinceBrazil(last,today);
  const due=dueStatus(o,today);
  const alerts:DigitalManagementAlert[]=[];
  if(due==='overdue')alerts.push('overdue');
  if(due==='today')alerts.push('today');
  if(days>=stallDays)alerts.push('stalled');
  if(due==='unscheduled')alerts.push('unscheduled');
  return {id:o.id,sellerId:o.seller_id,stage:o.stage,nextActionOn:o.next_action_on,
   lastRecordedAt:last,daysWithoutMovement:days,alerts};
 });
 const bySeller=new Map<string,ManagementSeller>();
 for(const o of opportunities){
  if(!bySeller.has(o.seller_id)){
   bySeller.set(o.seller_id,{sellerId:o.seller_id,total:0,open:0,overdue:0,today:0,stalled:0,unscheduled:0,alerts:0});
  }
  bySeller.get(o.seller_id)!.total++;
 }
 for(const x of openItems){
  const s=bySeller.get(x.sellerId)!;
  s.open++;
  if(x.alerts.length>0)s.alerts++;
  for(const tag of x.alerts)s[tag]++;
 }
 const priorities=openItems.filter(x=>x.alerts.length>0).sort((a,b)=>{
  const aRank=Math.min(...a.alerts.map(t=>alertOrder[t]));
  const bRank=Math.min(...b.alerts.map(t=>alertOrder[t]));
  return aRank-bRank || b.daysWithoutMovement-a.daysWithoutMovement ||
   (a.nextActionOn||'9999-12-31').localeCompare(b.nextActionOn||'9999-12-31') ||
   a.id.localeCompare(b.id);
 });
 return {
  total:opportunities.length,open:openItems.length,
  won:opportunities.filter(x=>x.stage==='won').length,
  lost:opportunities.filter(x=>x.stage==='lost').length,
  overdue:openItems.filter(x=>x.alerts.includes('overdue')).length,
  today:openItems.filter(x=>x.alerts.includes('today')).length,
  stalled:openItems.filter(x=>x.alerts.includes('stalled')).length,
  unscheduled:openItems.filter(x=>x.alerts.includes('unscheduled')).length,
  sellers:[...bySeller.values()].sort((a,b)=>b.alerts-a.alerts||b.open-a.open||a.sellerId.localeCompare(b.sellerId)),
  priority:priorities
 };
}
