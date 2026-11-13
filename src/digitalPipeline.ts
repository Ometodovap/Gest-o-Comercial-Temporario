import type {DigitalStage} from './types';

/** Preparação: estados e regras de negócio sem armazenar dados pessoais nesta etapa. */
export const digitalStages:{value:DigitalStage;label:string;description:string}[]=[
 {value:'prospecting',label:'Prospecção / lead recebido',description:'Origem do contato e início da oportunidade'},
 {value:'contacted',label:'Contato estabelecido',description:'Conversa efetiva com o potencial cliente'},
 {value:'qualified',label:'Qualificação',description:'Necessidade, objetivo, capacidade e prazo'},
 {value:'proposal',label:'Proposta enviada',description:'Simulação apresentada com condições claras'},
 {value:'negotiation',label:'Negociação / acompanhamento',description:'Follow-up com próxima ação definida'},
 {value:'won',label:'Venda concluída',description:'Contrato formalizado conforme regras'},
 {value:'lost',label:'Perdida',description:'Motivo de perda registrado'}
];
export function validDigitalTransition(from:DigitalStage,to:DigitalStage):boolean{
 if(from===to)return true;
 if(from==='won'||from==='lost')return false;
 if(to==='lost')return true;
 const ordered:DigitalStage[]=['prospecting','contacted','qualified','proposal','negotiation','won'];
 return ordered.indexOf(to)>ordered.indexOf(from);
}
export function digitalConversion(leads:number,wins:number):number|null{
 return Number.isInteger(leads)&&Number.isInteger(wins)&&leads>=0&&wins>=0&&wins<=leads&&leads>0 ? wins/leads*100 : null;
}
