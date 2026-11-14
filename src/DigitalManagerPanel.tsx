import {useMemo,useState} from 'react';
import type {DigitalOpportunityRow,DigitalActionRow,DigitalStageRow} from './digitalInsights';
import {digitalManagementSummary,managerAlertLabels,brazilDay} from './digitalManagement';
import {digitalStages} from './digitalPipeline';
import type {Membership} from './types';

type Props={
 opportunities:DigitalOpportunityRow[];
 stageEvents:DigitalStageRow[];
 followups:DigitalActionRow[];
 today:string;
 people:Membership[];
 loading:boolean;
 limited:boolean;
};
function dateBR(day:string|null){
 return day?day.split('-').reverse().join('/'):'Não definida';
}
function stageName(stage:string){
 return digitalStages.find(s=>s.value===stage)?.label||stage;
}
export default function DigitalManagerPanel({opportunities,stageEvents,followups,today,people,loading,limited}:Props){
 const [threshold,setThreshold]=useState<3|7|14>(7);
 const summary=useMemo(()=>digitalManagementSummary(opportunities,stageEvents,followups,today,threshold),
 [opportunities,stageEvents,followups,today,threshold]);
 const name=(id:string)=>people.find(p=>p.user_id===id)?.display_name||'Vendedor autorizado';
 if(loading)return <section className="panel"><h2>Gestão digital da equipe</h2><p>Carregando indicadores autorizados...</p></section>;
 return <section className="panel" aria-label="Gestão digital da equipe">
  <h2>Gestão digital da equipe</h2>
  <p>Alertas calculados sobre as oportunidades que sua conta pode visualizar. Uma oportunidade pode atender a mais de um critério. Ausência de registro não prova ausência de atendimento fora do sistema.</p>
  <div className="digital-manager-toolbar">
   <label>Alertar ausência de movimentação registrada após
    <select value={threshold} onChange={e=>setThreshold(Number(e.target.value) as 3|7|14)}>
     <option value={3}>3 dias</option>
     <option value={7}>7 dias</option>
     <option value={14}>14 dias</option>
    </select>
   </label>
  </div>
  <div className="digital-manager-summary">
   <div><strong>{summary.open}</strong><span>Em aberto</span></div>
   <div><strong>{summary.overdue}</strong><span>Ação vencida</span></div>
   <div><strong>{summary.today}</strong><span>Ação para hoje</span></div>
   <div><strong>{summary.stalled}</strong><span>Sem movimentação há {threshold} dias</span></div>
   <div><strong>{summary.unscheduled}</strong><span>Sem próxima ação</span></div>
  </div>
  {limited&&<p className="digital-manager-warning">Atenção: os limites da consulta foram alcançados. Estes indicadores podem estar incompletos e não representam o total da empresa.</p>}
  <h3>Alertas para supervisão</h3>
  <p>Prioridade: prazos vencidos, ações para hoje, oportunidades sem movimentação registrada e oportunidades sem agenda. Exibidas até 10 ocorrências.</p>
  <div className="table-scroll">
   <table>
    <thead><tr><th>Oportunidade</th><th>Vendedor</th><th>Etapa atual</th><th>Próxima ação</th><th>Última movimentação registrada</th><th>Dias sem movimentação</th><th>Alertas</th></tr></thead>
    <tbody>
     {summary.priority.slice(0,10).map(o=><tr key={o.id}>
      <td><b>#{o.id.slice(0,8)}</b></td><td>{name(o.sellerId)}</td><td>{stageName(o.stage)}</td>
      <td>{dateBR(o.nextActionOn)}</td><td>{dateBR(brazilDay(o.lastRecordedAt))}</td>
      <td>{o.daysWithoutMovement}</td>
      <td><div className="digital-manager-tags">{o.alerts.map(tag=><span key={tag} className={'due-label digital-manager-'+tag}>{managerAlertLabels[tag]}</span>)}</div></td>
     </tr>)}
     {summary.priority.length===0&&<tr><td colSpan={7}>Nenhum alerta registrado com os critérios selecionados.</td></tr>}
    </tbody>
   </table>
  </div>
  {summary.priority.length>10&&<p>Exibindo os 10 primeiros alertas de {summary.priority.length} oportunidades em atenção.</p>}
  <h3>Carteira digital por vendedor</h3>
  <p>Contabiliza as oportunidades atribuídas ao vendedor, inclusive quando uma supervisão registrou alguma movimentação.</p>
  <div className="table-scroll">
   <table>
    <thead><tr><th>Vendedor</th><th>Total</th><th>Em aberto</th><th>Com alertas</th><th>Vencidas</th><th>Hoje</th><th>Sem movimentação</th><th>Sem agenda</th></tr></thead>
    <tbody>{summary.sellers.map(s=><tr key={s.sellerId}>
     <td><b>{name(s.sellerId)}</b></td><td>{s.total}</td><td>{s.open}</td><td>{s.alerts}</td>
     <td>{s.overdue}</td><td>{s.today}</td><td>{s.stalled}</td><td>{s.unscheduled}</td>
    </tr>)}
    {summary.sellers.length===0&&<tr><td colSpan={8}>Nenhuma oportunidade digital visível para esta supervisão.</td></tr>}
    </tbody>
   </table>
  </div>
 </section>;
}
