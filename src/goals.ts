import type {Report,MonthlyGoal,GoalNumbers} from './types';
import {summary} from './metrics.js';

export const emptyGoal:GoalNumbers={goal_atendimentos:0,goal_vendas:0,goal_cotas:0,goal_creditos:0};
export const goalMetrics=[
 {key:'goal_atendimentos',label:'Atendimentos',actual:'atendimentos',format:'count'},
 {key:'goal_vendas',label:'Vendas (clientes)',actual:'compradores',format:'count'},
 {key:'goal_cotas',label:'Cotas',actual:'cotas',format:'count'},
 {key:'goal_creditos',label:'Créditos comercializados',actual:'valor_creditos',format:'money'}
] as const;

export function monthlyReports(reports:Report[],yearMonth:string):Report[]{
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth))return [];
 return reports.filter(r=>r.work_date.slice(0,7)===yearMonth);
}
export function sellerMonthlyStats(reports:Report[],sellerId:string,yearMonth:string){
 const scoped=monthlyReports(reports,yearMonth).filter(r=>r.seller_id===sellerId);
 const all=summary(scoped);
 return {...all,compradores:all.vendas_imediatas+all.vendas_retorno,
  pending:scoped.filter(r=>r.status==='submitted').length,
  validated:scoped.filter(r=>r.status==='validated').length,
  drafted:scoped.filter(r=>r.status==='draft').length,
  returned:scoped.filter(r=>r.status==='returned').length};
}
export function goalProgress(actual:number,goal:number):number|null{
 return Number.isFinite(actual)&&Number.isFinite(goal)&&goal>0?actual/goal*100:null;
}
export function validateGoal(g:GoalNumbers):string|null{
 const integerFields=['goal_atendimentos','goal_vendas','goal_cotas'] as const;
 for(const k of integerFields){if(!Number.isSafeInteger(g[k])||g[k]<0||g[k]>10000000)return 'Informe metas numéricas inteiras e não negativas.';}
 if(!Number.isFinite(g.goal_creditos)||g.goal_creditos<0||g.goal_creditos>10000000000000||Math.abs(Math.round(g.goal_creditos*100)-g.goal_creditos*100)>1e-6)
   return 'Informe um valor de créditos válido com até 2 casas decimais.';
 if(Object.values(g).every(v=>v===0))return 'Informe ao menos uma meta maior que zero. Zero significa não definida.';
 return null;
}
export function goalForSeller(goals:MonthlyGoal[],sellerId:string,yearMonth:string):MonthlyGoal|undefined{
 return goals.find(g=>g.seller_id===sellerId&&g.month_start===`${yearMonth}-01`);
}
export function monthDailyStats(reports:Report[],yearMonth:string){
 const rows=monthlyReports(reports,yearMonth).filter(r=>r.status==='submitted'||r.status==='validated');
 const perDate=new Map<string,{date:string,atendimentos:number,vendas:number,cotas:number}>();
 for(const r of rows){const record=perDate.get(r.work_date)||{date:r.work_date,atendimentos:0,vendas:0,cotas:0};
  record.atendimentos+=Number(r.atendimentos)||0;record.vendas+=(Number(r.vendas_imediatas)||0)+(Number(r.vendas_retorno)||0);record.cotas+=Number(r.cotas)||0;
  perDate.set(r.work_date,record);
 }
 return [...perDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
export function managerTotals(reports:Report[],goals:MonthlyGoal[],sellerIds:string[],yearMonth:string){
 // Metas de conversão não são somadas: convergência medida sobre atendimentos.
 const unique=[...new Set(sellerIds)];const rows=monthlyReports(reports,yearMonth).filter(r=>unique.includes(r.seller_id));
 const s=summary(rows);const buyers=s.vendas_imediatas+s.vendas_retorno;
 const target=unique.reduce<GoalNumbers>((a,id)=>{const g=goalForSeller(goals,id,yearMonth);if(!g)return a;
  return {goal_atendimentos:a.goal_atendimentos+Number(g.goal_atendimentos),goal_vendas:a.goal_vendas+Number(g.goal_vendas),
   goal_cotas:a.goal_cotas+Number(g.goal_cotas),goal_creditos:a.goal_creditos+Number(g.goal_creditos)};}, {...emptyGoal});
 return {...s,compradores:buyers,metas:target,comMeta:unique.filter(id=>{const g=goalForSeller(goals,id,yearMonth);return Boolean(g&&goalMetrics.some(m=>Number(g[m.key])>0));}).length,
  vendedores:unique.length,
  pendentes:rows.filter(r=>r.status==='submitted').length,
  validados:rows.filter(r=>r.status==='validated').length};
}
