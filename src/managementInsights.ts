import type {Report,Team,TeamGoal,GoalNumbers} from './types';
import {summary} from './metrics.js';
import {goalProgress} from './goals.js';

export type ManagerScope={
 companyId:string;
 month:string;
 reports:Report[];
 teams:Team[];
 goals:TeamGoal[];
 allowedTeamIds:string[];
};
export type ManagerMetrics=ReturnType<typeof summary>&{
 compradores:number;
 validados:number;
 pendentes:number;
 fechamentos:number;
 hasRecords:boolean;
};
export type MonthlyPerformance={month:string;stats:ManagerMetrics};
export type StandPerformance={team:Team;stats:ManagerMetrics;goal:TeamGoal|undefined};
export type TargetCoverage={
 key:keyof GoalNumbers;
 actual:number;
 target:number|null;
 complete:boolean;
 configured:number;
 total:number;
 progress:number|null;
};
export type ManagerOverview={
 months:MonthlyPerformance[];
 selected:ManagerMetrics;
 previous:ManagerMetrics;
 stands:StandPerformance[];
 targets:TargetCoverage[];
 incomplete:boolean;
 totalLoaded:number;
};
const goalFields=[
 {key:'goal_atendimentos',actual:'atendimentos'},
 {key:'goal_vendas',actual:'compradores'},
 {key:'goal_cotas',actual:'cotas'},
 {key:'goal_creditos',actual:'valor_creditos'}
] as const;

export function monthsEnding(month:string,count=6):string[]{
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!Number.isInteger(count)||count<1||count>12){
  throw new Error('Período de evolução inválido.');
 }
 const [year,mm]=month.split('-').map(Number);
 return Array.from({length:count},(_,index)=>{
  const date=new Date(Date.UTC(year,mm-1-(count-index-1),1));
  return date.toISOString().slice(0,7);
 });
}
const isCounted=(r:Report)=>r.status==='submitted'||r.status==='validated';
function metrics(rs:Report[]):ManagerMetrics{
 const counted=rs.filter(isCounted);
 const s=summary(counted);
 return {...s,compradores:s.vendas_imediatas+s.vendas_retorno,
  validados:counted.filter(r=>r.status==='validated').length,
  pendentes:counted.filter(r=>r.status==='submitted').length,
  fechamentos:counted.length,
  hasRecords:counted.length>0
 };
}
export function ppDifference(current:ManagerMetrics,previous:ManagerMetrics):number|null{
 return current.hasRecords&&previous.hasRecords&&current.conversion!==null&&previous.conversion!==null
  ?current.conversion-previous.conversion:null;
}
export function buyerDifference(current:ManagerMetrics,previous:ManagerMetrics):number|null{
 return current.hasRecords&&previous.hasRecords?current.compradores-previous.compradores:null;
}
export function managementOverview(scope:ManagerScope):ManagerOverview{
 const months=monthsEnding(scope.month,6);
 const allowed=new Set(scope.allowedTeamIds);
 const scopedTeams=scope.teams.filter(t=>t.company_id===scope.companyId&&allowed.has(t.id));
 const scoped=new Map(scopedTeams.map(t=>[t.id,t]));
 // Nunca confiar apenas na filtragem da tela: exige empresa e stand autorizado.
 const authorized=scope.reports.filter(r=>
  r.company_id===scope.companyId&&scoped.has(r.team_id)&&
  months[0]<=r.work_date.slice(0,7)&&r.work_date.slice(0,7)<=scope.month
 );
 const timeline=months.map(month=>({
  month,stats:metrics(authorized.filter(r=>r.work_date.slice(0,7)===month))
 }));
 const selected=timeline[timeline.length-1].stats;
 const previous=timeline[timeline.length-2].stats;
 const currentRows=authorized.filter(r=>r.work_date.slice(0,7)===scope.month);
 const stands=scopedTeams.map(team=>{
  const own=metrics(currentRows.filter(r=>r.team_id===team.id));
  const goal=scope.goals.find(g=>g.company_id===scope.companyId&&
   g.team_id===team.id&&g.month_start===scope.month+'-01');
  return {team,stats:own,goal};
 }).sort((a,b)=>
   Number(b.stats.hasRecords)-Number(a.stats.hasRecords) ||
   b.stats.compradores-a.stats.compradores ||
   b.stats.cotas-a.stats.cotas ||
   b.stats.valor_creditos-a.stats.valor_creditos ||
   a.team.name.localeCompare(b.team.name,'pt-BR')
 );
 const targets:TargetCoverage[]=goalFields.map(({key,actual})=>{
  const configured=stands.filter(s=>Number(s.goal?.[key]||0)>0);
  const target=configured.length?configured.reduce((total,s)=>total+Number(s.goal?.[key]||0),0):null;
  const complete=stands.length>0&&configured.length===stands.length;
  return {key,actual:selected[actual],target,complete,
   configured:configured.length,total:stands.length,
   progress:complete&&target!==null?goalProgress(selected[actual],target):null
  };
 });
 return {months:timeline,selected,previous,stands,targets,
  // A query-base é limitada a 1000 registros, inclusive de outros períodos.
  // Neste caso é proibido apresentar uma série como se ela fosse completa.
  incomplete:scope.reports.length>=1000,totalLoaded:scope.reports.length};
}
