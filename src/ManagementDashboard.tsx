import type {Report,Role,Team,TeamGoal} from './types';
import {brl,percent} from './metrics';
import {goalProgress} from './goals';
import {buyerDifference,managementOverview,ppDifference} from './managementInsights';

const metricNames={
 goal_atendimentos:'Atendimentos',
 goal_vendas:'Clientes compradores',
 goal_cotas:'Cotas comercializadas',
 goal_creditos:'Créditos comercializados'
} as const;
function formatMonth(month:string):string{
 const [year,mm]=month.split('-').map(Number);
 return new Intl.DateTimeFormat('pt-BR',{month:'short',year:'numeric',timeZone:'UTC'})
  .format(new Date(Date.UTC(year,mm-1,1))).replace('. de','.');
}
function signed(number:number):string{
 return (number>0?'+':'')+number.toLocaleString('pt-BR');
}
function moneyOrCount(key:string,value:number):string{
 return key==='goal_creditos'?brl(value):value.toLocaleString('pt-BR');
}
export default function ManagementDashboard({role,companyId,month,reports,teams,teamGoals}:{
 role:Role;companyId:string;month:string;reports:Report[];teams:Team[];teamGoals:TeamGoal[];
}){
 if(role==='seller')return null;
 const overview=managementOverview({
  companyId,month,reports,teams,goals:teamGoals,
  allowedTeamIds:teams.map(x=>x.id)
 });
 if(overview.incomplete){
  return <section className="panel" role="alert">
   <h2>Painel gerencial — dados incompletos</h2>
   <p>A consulta chegou ao limite atual de 1.000 fechamentos. Não seria confiável exibir o comparativo mensal nem classificar stands com apenas parte dos registros.</p>
   <p>Será necessária uma consulta paginada e autorizada no servidor para liberar o histórico completo. Os dados comerciais existentes permanecem preservados.</p>
  </section>;
 }
 const {selected,previous,months,stands,targets}=overview;
 const last=months[months.length-2];
 const buyersDelta=buyerDifference(selected,previous);
 const conversionDelta=ppDifference(selected,previous);
 const maxBuyers=Math.max(1,...months.filter(x=>x.stats.hasRecords).map(x=>x.stats.compradores));
 return <>
  <section className="panel">
   <h2>Visão executiva presencial — {formatMonth(month)}</h2>
   <p>Indicadores exclusivamente dos stands autorizados para sua função. Somente fechamentos enviados e validados entram nos resultados; vendas por retorno compõem compradores, mas não a conversão imediata.</p>
   <div className="mini-stats">
    <span>{stands.length} stand(s) autorizados</span>
    <span>{selected.fechamentos} fechamento(s) válido(s) na competência</span>
    <span>{selected.pendentes} pendente(s) de validação</span>
   </div>
   {!selected.hasRecords&&<p className="mg-no-data">Não há fechamentos enviados ou validados no mês selecionado. Isso não significa que a equipe não trabalhou.</p>}
   {selected.hasRecords&&<div className="mg-kpis">
    <div><small>Atendimentos</small><strong>{selected.atendimentos.toLocaleString('pt-BR')}</strong></div>
    <div><small>Clientes compradores</small><strong>{selected.compradores.toLocaleString('pt-BR')}</strong><small>{buyersDelta===null?'Sem base para comparação':signed(buyersDelta)+' em relação a '+formatMonth(last.month)}</small></div>
    <div><small>Conversão imediata</small><strong>{percent(selected.conversion)}</strong><small>{conversionDelta===null?'Sem base comparável':signed(Number(conversionDelta.toFixed(1)))+' p.p. sobre '+formatMonth(last.month)}</small></div>
    <div><small>Cotas</small><strong>{selected.cotas.toLocaleString('pt-BR')}</strong></div>
    <div><small>Créditos</small><strong>{brl(selected.valor_creditos)}</strong></div>
   </div>}
  </section>
  <section className="panel">
   <h2>Evolução de seis meses — presencial</h2>
   <p>As barras representam clientes compradores por competência. A conversão é calculada sobre o total de vendas imediatas dividido pelo total de novos atendimentos de cada mês, nunca pela média das taxas dos vendedores.</p>
   <div className="mg-trend" role="group" aria-label="Evolução de seis meses de clientes compradores">
    {months.map(({month:reference,stats})=><div className="mg-trend-row" key={reference}>
     <b>{formatMonth(reference)}</b>
     <div className="mg-trend-track" title={stats.hasRecords?String(stats.compradores)+' compradores':'Sem fechamentos enviados/validados'}>
      {stats.hasRecords&&<div className="mg-trend-fill" style={{width:String(Math.min(100,stats.compradores/maxBuyers*100))+'%'}}/>}
     </div>
     <span>{stats.hasRecords?String(stats.compradores)+' compradores':'Sem registros'}</span>
     <span>{stats.hasRecords?percent(stats.conversion):'—'} conv.</span>
    </div>)}
   </div>
   <p className="mg-footnote">Meses sem registros não são contabilizados como zero desempenho. O cálculo inclui todos os stands atualmente autorizados ao seu perfil, respeitando o stand original de cada lançamento.</p>
  </section>
  <section className="panel">
   <h2>Comparação entre stands — {formatMonth(month)}</h2>
   <p>Ordenação por número de compradores, com desempate por cotas e valor dos créditos. Stands sem fechamentos são identificados separadamente; não recebem classificação de desempenho.</p>
   <div className="table-scroll"><table>
    <thead><tr><th>Stand</th><th>Atendimentos</th><th>Compradores</th><th>Conversão imediata</th><th>Cotas</th><th>Créditos</th><th>Validados</th><th>Meta compradores</th></tr></thead>
    <tbody>{stands.map(item=>{
     const target=Number(item.goal?.goal_vendas||0);
     return <tr key={item.team.id}>
      <td><b>{item.team.name}</b><small className="cell-subtitle">{item.team.unit_name}</small></td>
      <td>{item.stats.hasRecords?item.stats.atendimentos:'Sem registros'}</td>
      <td>{item.stats.hasRecords?item.stats.compradores:'—'}</td>
      <td>{item.stats.hasRecords?percent(item.stats.conversion):'—'}</td>
      <td>{item.stats.hasRecords?item.stats.cotas:'—'}</td>
      <td>{item.stats.hasRecords?brl(item.stats.valor_creditos):'—'}</td>
      <td>{item.stats.hasRecords?item.stats.validados:'—'}</td>
      <td>{target>0?String(item.stats.compradores)+' / '+target+' ('+goalProgress(item.stats.compradores,target)?.toFixed(1).replace('.',',')+'%)':'Não definida'}</td>
     </tr>;
    })}
    {stands.length===0&&<tr><td colSpan={8}>Nenhum stand autorizado para comparação.</td></tr>}
    </tbody>
   </table></div>
  </section>
  <section className="panel">
   <h2>Atingimento de metas próprias dos stands</h2>
   <p>As metas de equipe são independentes das metas dos vendedores. Uma meta ausente não equivale a zero; só calculamos o percentual consolidado quando todos os stands autorizados possuem meta positiva para aquele indicador.</p>
   <div className="mg-goals">{targets.map(t=><div className="mg-goal" key={t.key}>
    <b>{metricNames[t.key]}</b>
    <div>{selected.hasRecords?moneyOrCount(t.key,t.actual):'Sem registros'} <span>/ {t.target===null?'Sem meta':moneyOrCount(t.key,t.target)}</span></div>
    {t.complete&&t.progress!==null&&selected.hasRecords?
     <><div className="goal-track" role="progressbar" aria-label={metricNames[t.key]} aria-valuemin={0} aria-valuemax={Math.max(100,Math.ceil(t.progress))} aria-valuenow={Math.round(t.progress)}>
      <div className="goal-fill" style={{width:String(Math.max(0,Math.min(100,t.progress)))+'%'}}/>
     </div><small>{t.progress.toFixed(1).replace('.',',')}% da meta alcançado</small></>:
     <small>{!selected.hasRecords?'Sem fechamento válido para calcular atingimento':'Meta incompleta: '+t.configured+'/'+t.total+' stand(s) com meta definida'}</small>
    }
   </div>)}</div>
  </section>
  <section className="panel">
   <h2>Operação digital — acompanhamento separado</h2>
   <p>Este painel analisa apenas a operação presencial dos stands. O funil de vendas digitais possui etapas, atividades e indicadores próprios na opção <b>Vendas digitais</b> do menu; os números não são somados automaticamente, evitando dupla contagem.</p>
  </section>
 </>;
}
