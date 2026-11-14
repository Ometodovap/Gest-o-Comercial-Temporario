import {useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {DigitalStage,Membership} from './types';
import {digitalStages} from './digitalPipeline';

type StageEvent={
 id:number;opportunity_id:string;actor_id:string|null;
 old_stage:DigitalStage|null;new_stage:DigitalStage;created_at:string;
};
type Props={client:SupabaseClient;opportunityId:string;people:Membership[]};
function stageLabel(s:DigitalStage|null){return s===null?'Criação':digitalStages.find(x=>x.value===s)?.label||s;}
function dateTime(value:string){
 const date=new Date(value);
 return Number.isNaN(date.valueOf())?'Data indisponível':date.toLocaleString('pt-BR',{
  timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'
 });
}
export default function DigitalHistory({client,opportunityId,people}:Props){
 const [opened,setOpened]=useState(false);
 const [events,setEvents]=useState<StageEvent[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 async function toggle(){
  if(opened){setOpened(false);return;}
  setOpened(true);setBusy(true);setError('');
  const {data,error}=await client.from('gc_digital_stage_events')
   .select('id,opportunity_id,actor_id,old_stage,new_stage,created_at')
   .eq('opportunity_id',opportunityId).order('id',{ascending:true}).limit(200);
  if(error)setError('Não foi possível consultar o histórico autorizado: '+error.message);
  else setEvents((data||[]) as StageEvent[]);
  setBusy(false);
 }
 return <div className="digital-history">
  <button type="button" className="secondary" aria-expanded={opened} onClick={()=>void toggle()}>
   {opened?'Ocultar histórico':'Ver histórico de etapas'}
  </button>
  {opened&&<div className="digital-history-content">
   <h3>Histórico de movimentações</h3>
   {busy?<p>Carregando histórico...</p>:error?<p className="error" role="alert">{error}</p>:
    events.length===0?<p>Não há eventos disponíveis para esta oportunidade.</p>:
    <ol className="digital-history-list">{events.map(event=><li key={event.id}>
     <strong>{stageLabel(event.old_stage)} → {stageLabel(event.new_stage)}</strong>
     <small>{dateTime(event.created_at)} · {people.find(p=>p.user_id===event.actor_id)?.display_name||'Usuário autorizado'}</small>
    </li>)}</ol>
   }
   {events.length>=200&&<p>Exibidos os 200 primeiros eventos. Consulte a auditoria administrativa para registros adicionais.</p>}
  </div>}
 </div>;
}
