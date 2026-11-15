import {useState} from 'react';
import type {Assignment,Membership,MonthlyGoal,Report,Role,Team,TeamGoal} from './types';
import {brl,percent} from './metrics';
import {goalForSeller,goalMetrics,goalProgress} from './goals';
import {buyerDifference,managementOverview,managementSellerOptions,ppDifference} from './managementInsights';
import {ManagementMonthComparison,ManagementTrendChart} from './ManagementCharts';

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
export default function ManagementDashboard({role,companyId,month,reports,teams,teamGoals,people,assignments,sellerGoals}:{
 role:Role;companyId:string;month:string;reports:Report[];teams:Team[];teamGoals:TeamGoal[];
 people:Membership[];assignments:Assignment[];sellerGoals:MonthlyGoal[];
}){
 const [selectedSellerId,setSelectedSellerId]=useState('');
 if(role==='seller')return null;
 const sellers=managementSellerOptions({companyId,teams,assignments,people,reports});
 const activeSeller=sellers.find(x=>x.user_id===selectedSellerId);
 const sellerId=activeSeller?.user_id;
 const overview=managementOverview({
  companyId,month,reports,teams,goals:teamGoals,
  allowedTeamIds:teams.map(x=>x.id),
  sellerId
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
 const sellerGoal=sellerId?goalForSeller(sellerGoals,sellerId,month):undefined;
 return <>
  <section className="panel">
   <h2>Visualização dos resultados</h2>
   <p>Consulte a equipe inteira ou selecione um vendedor. O filtro afeta a visão executiva, o comparativo mensal, os gráficos e a evolução de seis meses, sem incluir produção de outros stands ou empresas.</p>
   <div className="mg-seller-selector"><label>Vendedor
    <select aria-label="Filtrar resultados por vendedor" value={sellerId||''} onChange={e=>setSelectedSellerId(e.target.value)}>
     <option value="">Toda a equipe (consolidado)</option>
     {sellers.map(person=><option key={person.user_id} value={person.user_id}>{person.display_name}</option>)}
    </select>
   </label></div>
   <p className="mg-footnote">{sellerId?'Resultados individuais de '+activeSeller?.display_name+' nos stands sob sua responsabilidade.':'Resultados consolidados dos stands autorizados.'}</p>
  </section>
  <section className="panel">
   <h2>Visão executiva presencial — {sellerId?activeSeller?.display_name+' · ':''}{formatMonth(month)}</h2>
   <p>Indicadores exclusivamente dos stands autorizados para sua função. Somente fechamentos enviados e validados entram nos resultados; vendas por retorno compõem compradores, mas não a conversão imediata.</p>
   <div className="mini-stats">
    <span>{sellerId?'Vendedor selecionado':'Toda a equipe'} · {stands.length} stand(s) autorizados</span>
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
  <ManagementMonthComparison current={selected} previous={previous} currentMonth={month} previousMonth={last.month}/>
  <section className="panel">
   <h2>Evolução de seis meses — presencial</h2>
   <p>Escolha o indicador para visualizar sua evolução por competência. As taxas de conversão são sempre calculadas pelos totais de vendas imediatas e novos atendimentos, sem média de taxas entre vendedores.</p>
   <ManagementTrendChart months={months}/>
   <div className="table-scroll"><table>
    <thead><tr><th>Mês</th><th>Atendimentos</th><th>Compradores</th><th>Cotas</th><th>Créditos</th><th>Conversão imediata</th></tr></thead>
    <tbody>{months.map(({month:reference,stats})=><tr key={reference}>
     <td><b>{formatMonth(reference)}</b></td>
     <td>{stats.hasRecords?stats.atendimentos:'—'}</td>
     <td>{stats.hasRecords?stats.compradores:'—'}</td>
     <td>{stats.hasRecords?stats.cotas:'—'}</td>
     <td>{stats.hasRecords?brl(stats.valor_creditos):'Sem registros'}</td>
     <td>{stats.hasRecords?percent(stats.conversion):'—'}</td>
    </tr>)}</tbody>
   </table></div>
   <p className="mg-footnote">Meses sem registros não são contabilizados como zero desempenho. O cálculo inclui todos os stands atualmente autorizados ao seu perfil, respeitando o stand original de cada lançamento.</p>
  </section>
  {!sellerId&&<section className="panel">
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
      <td>{!item.stats.hasRecords?'Sem registros':target>0?String(item.stats.compradores)+' / '+target+' ('+goalProgress(item.stats.compradores,target)?.toFixed(1).replace('.',',')+'%)':'Não definida'}</td>
     </tr>;
    })}
    {stands.length===0&&<tr><td colSpan={8}>Nenhum stand autorizado para comparação.</td></tr>}
    </tbody>
   </table></div>
  </section>}
  {!sellerId&&<section className="panel">
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
  </section>}
  {sellerId&&<section className="panel">
   <h2>Metas individuais — {activeSeller?.display_name}</h2>
   <p>Metas do vendedor são independentes das metas próprias dos stands. Indicadores sem meta definida aparecem como “Sem meta”.</p>
   <div className="mg-goals">{goalMetrics.map(item=>{
    const target=Number(sellerGoal?.[item.key]||0);
    const actual=item.actual==='compradores'?selected.compradores:selected[item.actual];
    const progression=selected.hasRecords&&target>0?goalProgress(actual,target):null;
    return <div className="mg-goal" key={item.key}>
     <b>{item.label}</b>
     <div>{selected.hasRecords?moneyOrCount(item.key,actual):'Sem registros'}
      <span> / {target>0?moneyOrCount(item.key,target):'Sem meta'}</span></div>
     {progression!==null?<><div className="goal-track" role="progressbar" aria-label={item.label} aria-valuemin={0} aria-valuemax={Math.max(100,Math.ceil(progression))} aria-valuenow={Math.round(progression)}>
      <div className="goal-fill" style={{width:Math.max(0,Math.min(100,progression))+'%'}}/>
     </div><small>{progression.toFixed(1).replace('.',',')}% da meta alcançado</small></>:
      <small>{!selected.hasRecords?'Sem fechamento válido para calcular atingimento':'Meta individual não definida'}</small>}
    </div>;
   })}</div>
  </section>}
  <section className="panel">
   <h2>Operação digital — acompanhamento separado</h2>
   <p>Este painel analisa apenas a operação presencial dos stands. O funil de vendas digitais possui etapas, atividades e indicadores próprios na opção <b>Vendas digitais</b> do menu; os números não são somados automaticamente, evitando dupla contagem.</p>
  </section>
 </>;
}
