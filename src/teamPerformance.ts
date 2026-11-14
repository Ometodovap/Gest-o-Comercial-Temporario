import type {Report,TeamGoal,GoalNumbers,Assignment,Membership,Team} from './types';
import {summary} from './metrics.js';
import {monthlyReports} from './goals.js';

/** Totalizamos pelo stand do próprio lançamento; realocações posteriores não mudam o histórico. */
export function teamMonthlyStats(reports:Report[],teamId:string,yearMonth:string){
 const rows=monthlyReports(reports,yearMonth).filter(r=>r.team_id===teamId);
 const stats=summary(rows);
 return {...stats,compradores:stats.vendas_imediatas+stats.vendas_retorno,
  pendentes:rows.filter(r=>r.status==='submitted').length,
  validados:rows.filter(r=>r.status==='validated').length,
  vendedoresAtivos:new Set(rows.filter(r=>r.status==='submitted'||r.status==='validated').map(r=>r.seller_id)).size};
}
export function teamGoalFor(goals:TeamGoal[],teamId:string,yearMonth:string):TeamGoal|undefined{
 return goals.find(g=>g.team_id===teamId&&g.month_start===`${yearMonth}-01`);
}
export function teamRoster(teams:Team[],assignments:Assignment[],people:Membership[],companyId:string){
 const active=new Set(people.filter(p=>p.company_id===companyId&&p.role==='seller'&&p.active).map(p=>p.user_id));
 return teams.filter(t=>t.company_id===companyId).map(t=>({team:t,sellerIds:[...new Set(assignments.filter(a=>a.company_id===companyId&&a.team_id===t.id&&a.active&&active.has(a.seller_id)).map(a=>a.seller_id))]}));
}
export function teamLeaderboard(reports:Report[],teamId:string,yearMonth:string){
 const rows=monthlyReports(reports,yearMonth).filter(r=>r.team_id===teamId&&['submitted','validated'].includes(r.status));
 const map=new Map<string,Report[]>();
 for(const row of rows){const current=map.get(row.seller_id)||[];current.push(row);map.set(row.seller_id,current)}
 return [...map.entries()].map(([sellerId,items])=>{
  const s=summary(items);return {sellerId,...s,compradores:s.vendas_imediatas+s.vendas_retorno};
 }).sort((a,b)=>b.compradores-a.compradores || b.cotas-a.cotas || b.valor_creditos-a.valor_creditos || a.sellerId.localeCompare(b.sellerId));
}
export function teamCoverage(goals:TeamGoal[],teamIds:string[],yearMonth:string):{configured:number;total:number;missing:string[]}{
 const ids=[...new Set(teamIds)];const missing=ids.filter(id=>{const g=teamGoalFor(goals,id,yearMonth);return !g||!(['goal_atendimentos','goal_vendas','goal_cotas','goal_creditos'] as const).some(k=>Number(g[k])>0)});
 return {configured:ids.length-missing.length,total:ids.length,missing};
}
export function goalPayload(g:GoalNumbers):GoalNumbers{return {goal_atendimentos:g.goal_atendimentos,goal_vendas:g.goal_vendas,goal_cotas:g.goal_cotas,goal_creditos:g.goal_creditos}}
