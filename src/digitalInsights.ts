import type {DigitalStage} from './types';

export type DigitalOpportunityRow={
 id:string;seller_id:string;stage:DigitalStage;next_action_on:string|null;
 estimated_credit:number;lost_reason:string|null;created_at:string;updated_at:string;
};
export type DigitalStageRow={opportunity_id:string;new_stage:DigitalStage;created_at:string};
export type DigitalActionRow={id:number;opportunity_id:string;seller_id:string;actor_id:string;
 action_type:'contacted'|'no_answer'|'rescheduled';next_action_on:string|null;created_at:string};
export type FollowupDue='overdue'|'today'|'scheduled'|'unscheduled'|'closed';

const terminal=new Set<DigitalStage>(['won','lost']);
export const lossLabels:Record<string,string>={
 sem_interesse:'Sem interesse',sem_orcamento:'Sem orçamento',
 sem_retorno:'Sem retorno',duplicado:'Duplicado',outro:'Outro motivo'
};
export const actionLabels:Record<DigitalActionRow['action_type'],string>={
 contacted:'Contato realizado',no_answer:'Tentativa sem resposta',rescheduled:'Reagendamento'
};
export function isValidCredit(value:number):boolean{
 return Number.isFinite(value)&&value>=0&&value<=999999999999.99&&Math.abs(value*100-Math.round(value*100))<0.000001;
}
export function dueStatus(o:Pick<DigitalOpportunityRow,'stage'|'next_action_on'>,today:string):FollowupDue{
 if(terminal.has(o.stage))return 'closed';
 if(!o.next_action_on)return 'unscheduled';
 if(o.next_action_on<today)return 'overdue';
 if(o.next_action_on===today)return 'today';
 return 'scheduled';
}
export function digitalInsights(
 opportunities:DigitalOpportunityRow[],stageEvents:DigitalStageRow[],actions:DigitalActionRow[],today:string
){
 const ids=new Set(opportunities.map(o=>o.id));
 const stages=stageEvents.filter(e=>ids.has(e.opportunity_id));
 const events=actions.filter(e=>ids.has(e.opportunity_id));
 const stageSet=new Set(stages.map(e=>e.opportunity_id+'|'+e.new_stage));
 const byStage=Object.fromEntries(['prospecting','contacted','qualified','proposal','negotiation','won','lost']
  .map(stage=>[stage,opportunities.filter(o=>o.stage===stage).length])) as Record<DigitalStage,number>;
 const due=Object.fromEntries(['overdue','today','scheduled','unscheduled','closed']
  .map(s=>[s,opportunities.filter(o=>dueStatus(o,today)===s).length])) as Record<FollowupDue,number>;
 const losses=Object.entries(lossLabels).map(([code,label])=>({
  code,label,count:opportunities.filter(o=>o.stage==='lost'&&o.lost_reason===code).length
 })).filter(x=>x.count>0).sort((a,b)=>b.count-a.count);
 const sellers=[...new Set(opportunities.map(o=>o.seller_id))].map(sellerId=>{
  const own=opportunities.filter(o=>o.seller_id===sellerId);
  const reached=(stage:DigitalStage)=>own.filter(o=>o.stage===stage||stageSet.has(o.id+'|'+stage)).length;
  const countAction=(type:DigitalActionRow['action_type'])=>events.filter(e=>e.actor_id===sellerId&&e.action_type===type).length;
  const wins=own.filter(o=>o.stage==='won').length;
  return {sellerId,total:own.length,contacted:reached('contacted'),qualified:reached('qualified'),
   proposals:reached('proposal'),negotiations:reached('negotiation'),wins,losses:own.filter(o=>o.stage==='lost').length,
   contactsPerformed:countAction('contacted'),unanswered:countAction('no_answer'),
   overdue:own.filter(o=>dueStatus(o,today)==='overdue').length,
   conversion:own.length?wins/own.length*100:null};
 }).sort((a,b)=>b.wins-a.wins||b.contactsPerformed-a.contactsPerformed||b.total-a.total||a.sellerId.localeCompare(b.sellerId));
 return {total:opportunities.length,byStage,due,losses,sellers,
  activities:events.length,contactsPerformed:events.filter(e=>e.action_type==='contacted').length,
  conversion:opportunities.length?byStage.won/opportunities.length*100:null};
}
export function dueSort(a:DigitalOpportunityRow,b:DigitalOpportunityRow,today:string){
 const rank:Record<FollowupDue,number>={overdue:0,today:1,scheduled:2,unscheduled:3,closed:4};
 const r=rank[dueStatus(a,today)]-rank[dueStatus(b,today)];
 return r||(a.next_action_on||'9999-12-31').localeCompare(b.next_action_on||'9999-12-31')||
 a.id.localeCompare(b.id);
}
