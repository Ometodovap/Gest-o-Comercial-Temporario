import type {Feedback,Report,ReportFields} from './types';
export const NUMERIC_FIELDS: (keyof Omit<ReportFields,'notes'>)[] = ['atendimentos','vendas_imediatas','agendamentos','retornos','vendas_retorno','cotas','valor_creditos'];
export const emptyFields:ReportFields={atendimentos:0,vendas_imediatas:0,agendamentos:0,retornos:0,vendas_retorno:0,cotas:0,valor_creditos:0,notes:''};
export function validateFields(x:ReportFields):string|null {
 for (const k of NUMERIC_FIELDS) if (!Number.isFinite(x[k]) || x[k]<0 || (k!=='valor_creditos'&&!Number.isInteger(x[k]))) return `Valor inválido em ${k}`;
 if (x.vendas_imediatas>x.atendimentos) return 'Vendas imediatas não podem ultrapassar novos atendimentos.';
 if (x.vendas_retorno>x.retornos) return 'Vendas de retorno não podem ultrapassar retornos realizados.';
 if (x.cotas<x.vendas_imediatas+x.vendas_retorno) return 'Cotas não podem ser inferiores ao número de clientes compradores.';
 if (x.notes.length>500) return 'Observações limitadas a 500 caracteres.';
 return null;
}
export function summary(rs:Report[]) {
 const rows=rs.filter(r=>r.status==='submitted'||r.status==='validated');
 const totals={atendimentos:0,vendas_imediatas:0,agendamentos:0,retornos:0,vendas_retorno:0,cotas:0,valor_creditos:0};
 for(const r of rows) for(const k of NUMERIC_FIELDS) totals[k]+=Number(r[k])||0;
 const days=new Set(rows.map(r=>`${r.seller_id}-${r.work_date}`)).size;
 return {...totals,days,conversion:totals.atendimentos?100*totals.vendas_imediatas/totals.atendimentos:null};
}
export function moveDay(date:string, offset:number) {const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);}
export function evolution(feedback:Feedback,reports:Report[],today:string) {
 const anchor=feedback.created_at.slice(0,10);
 const before=reports.filter(r=>r.seller_id===feedback.seller_id&&r.work_date>=moveDay(anchor,-7)&&r.work_date<anchor);
 const end=[moveDay(anchor,7),feedback.review_date,today].sort()[0];
 const after=reports.filter(r=>r.seller_id===feedback.seller_id&&r.work_date>anchor&&r.work_date<=end);
 const a=summary(before),b=summary(after);
 return {before:a,after:b,available:a.days>=3&&b.days>=3&&a.conversion!==null&&b.conversion!==null,
 delta:a.conversion!==null&&b.conversion!==null?b.conversion-a.conversion:null};
}
export function todayBrazil(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function brl(n:number){return n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});}
export function percent(n:number|null){return n===null?'—':`${n.toFixed(1).replace('.',',')}%`;}
