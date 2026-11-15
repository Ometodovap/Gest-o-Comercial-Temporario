import type {Membership,Report,Team,TeamGoal} from './types';
import {monthlyReports} from './goals.js';
import {teamGoalFor,teamMonthlyStats} from './teamPerformance.js';

type Cell=string|number|null|undefined;
export type MonthlyExportScope={
 companyId:string;
 companyName:string;
 month:string;
 reports:Report[];
 people:Membership[];
 teams:Team[];
 /** Exatamente os stands autorizados para a supervisão/diretoria. Vendedor usa ownSellerId. */
 allowedTeamIds?:string[];
 ownSellerId?:string;
};
export type StandExportScope=MonthlyExportScope&{teamGoals:TeamGoal[]};

function money(value:number):string{
 return Number(value||0).toFixed(2).replace('.',',');
}
function percentage(numerator:number,denominator:number):string{
 return denominator>0?(numerator*100/denominator).toFixed(1).replace('.',','):'';
}

/** Proteção para abertura no Excel/LibreOffice: delimitador, aspas e injeção de fórmulas. */
export function csvCell(value:Cell):string{
 let text=String(value??'').replace(/[\r\n\t]/g,' ').replace(/\u0000/g,'');
 if(/^[\s\uFEFF\u200B\u200C\u200D]*[=+\-@]/u.test(text))text="'"+text;
 return '"'+text.replace(/"/g,'""')+'"';
}
export function csvDocument(rows:Cell[][]):string{
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n')+'\r\n';
}
export function exportFilename(kind:'fechamentos'|'stands',month:string):string{
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Mês inválido.');
 return 'epsa-'+kind+'-'+month+'.csv';
}
function rowsInScope(scope:MonthlyExportScope):Report[]{
 const teams=scope.allowedTeamIds?new Set(scope.allowedTeamIds):null;
 return monthlyReports(scope.reports,scope.month)
  .filter(r=>r.company_id===scope.companyId&&
     (r.status==='submitted'||r.status==='validated')&&
     (!scope.ownSellerId||r.seller_id===scope.ownSellerId)&&
     (!teams||teams.has(r.team_id)))
  .sort((a,b)=>a.work_date.localeCompare(b.work_date)||
       a.seller_id.localeCompare(b.seller_id)||a.shift.localeCompare(b.shift));
}
/** Sem paginação de servidor na v0.16: não exporta relatórios possivelmente truncados. */
export function assertCompleteLoadedReports(loadedCount:number):void{
 if(!Number.isSafeInteger(loadedCount)||loadedCount<0||loadedCount>=1000){
  throw new Error('Exportação indisponível: o painel pode ter atingido o limite de 1.000 fechamentos. Solicite um relatório paginado.');
 }
}
function heading(scope:MonthlyExportScope,description:string):Cell[][]{
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(scope.month))throw new Error('Mês inválido.');
 return [
  ['EPSA Gestão Comercial',description],
  ['Empresa',scope.companyName],
  ['Competência',scope.month],
  ['Critério','Somente fechamentos enviados e validados; dados autorizados carregados no painel'],
  []
 ];
}
const shiftNames:Record<Report['shift'],string>={
 full:'Dia completo',morning:'Manhã',afternoon:'Tarde',evening:'Noite'
};
export function buildClosuresCsv(scope:MonthlyExportScope):string{
 assertCompleteLoadedReports(scope.reports.length);
 const names=new Map(scope.people.filter(p=>p.company_id===scope.companyId).map(p=>[p.user_id,p.display_name]));
 const teams=new Map(scope.teams.filter(t=>t.company_id===scope.companyId).map(t=>[t.id,t.name]));
 const rows:Cell[][]=rowsInScope(scope).map(r=>[
  r.work_date,shiftNames[r.shift],names.get(r.seller_id)||'Vendedor não identificado',
  teams.get(r.team_id)||'Stand não identificado',
  r.status==='validated'?'Validado':'Enviado',
  Number(r.atendimentos),Number(r.vendas_imediatas),Number(r.agendamentos),
  Number(r.retornos),Number(r.vendas_retorno),
  Number(r.vendas_imediatas)+Number(r.vendas_retorno),
  Number(r.cotas),money(Number(r.valor_creditos)),
  percentage(Number(r.vendas_imediatas),Number(r.atendimentos))
 ]);
 return csvDocument([
  ...heading(scope,'Fechamentos presenciais por período'),
  ['Data','Turno','Vendedor','Stand','Situação','Novos atendimentos','Vendas imediatas',
   'Agendamentos','Retornos realizados','Vendas por retorno','Clientes compradores',
   'Cotas comercializadas','Créditos comercializados (R$)','Conversão imediata (%)'],
  ...rows
 ]);
}
export function buildStandsCsv(scope:StandExportScope):string{
 assertCompleteLoadedReports(scope.reports.length);
 if(!scope.allowedTeamIds)throw new Error('Escopo de stands autorizados obrigatório.');
 const permitted=new Set(scope.allowedTeamIds);
 const rows:Cell[][]=scope.teams
  .filter(team=>team.company_id===scope.companyId&&permitted.has(team.id))
  .sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))
  .map(team=>{
   const stats=teamMonthlyStats(rowsInScope({...scope,allowedTeamIds:[team.id]}),team.id,scope.month);
   const goal=teamGoalFor(scope.teamGoals.filter(g=>g.company_id===scope.companyId),team.id,scope.month);
   const target=(key:'goal_atendimentos'|'goal_vendas'|'goal_cotas'|'goal_creditos'):Cell=>{
    const n=Number(goal?.[key]||0);
    return n>0?(key==='goal_creditos'?money(n):n):'';
   };
   return [
    team.name,team.unit_name,stats.atendimentos,stats.vendas_imediatas,stats.vendas_retorno,
    stats.compradores,percentage(stats.vendas_imediatas,stats.atendimentos),
    stats.cotas,money(stats.valor_creditos),stats.days,stats.validados,stats.pendentes,
    target('goal_atendimentos'),target('goal_vendas'),target('goal_cotas'),target('goal_creditos')
   ];
  });
 return csvDocument([
  ...heading(scope,'Produtividade presencial por stand'),
  ['Stand','Unidade','Novos atendimentos','Vendas imediatas','Vendas por retorno',
   'Clientes compradores','Conversão imediata (%)','Cotas','Créditos comercializados (R$)',
   'Dias-vendedor com lançamento','Fechamentos validados','Fechamentos pendentes',
   'Meta de atendimentos','Meta de compradores','Meta de cotas','Meta de créditos (R$)'],
  ...rows
 ]);
}
