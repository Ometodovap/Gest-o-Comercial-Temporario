export type Role = 'seller' | 'supervisor' | 'manager';
export type Status = 'draft' | 'submitted' | 'validated' | 'returned';
export type Shift = 'full' | 'morning' | 'afternoon' | 'evening';
export type Membership = { company_id:string; user_id:string; role:Role; display_name:string; active:boolean };
export type Team = {id:string; company_id:string; name:string; unit_name:string; supervisor_user_id:string|null};
export type Assignment = {company_id:string;team_id:string;seller_id:string;active:boolean};
export type Report = {
 id:string; company_id:string; team_id:string; seller_id:string; work_date:string; shift:Shift;
 atendimentos:number; vendas_imediatas:number; agendamentos:number; retornos:number; vendas_retorno:number;
 cotas:number; valor_creditos:number; notes:string; status:Status; returned_reason:string; created_at:string;updated_at:string;
};
export type Feedback = {
 id:string; company_id:string; seller_id:string; supervisor_id:string; period_start:string; period_end:string;
 indicator:string; diagnosis:string; action_plan:string; review_date:string; acknowledged_at:string|null;
 review_status:'improved'|'stable'|'needs_support'|null; review_notes:string|null;
 reviewed_at:string|null; created_at:string;
};
export type ReportFields = Pick<Report,'atendimentos'|'vendas_imediatas'|'agendamentos'|'retornos'|'vendas_retorno'|'cotas'|'valor_creditos'|'notes'>;

/** Metas mensais por vendedor, definidas por supervisor/diretoria. Zero = meta ainda não definida. */
export type MonthlyGoal = {
 id:string; company_id:string; seller_id:string; month_start:string;
 goal_atendimentos:number; goal_vendas:number; goal_cotas:number; goal_creditos:number;
 created_at:string; updated_at:string; created_by:string; updated_by:string;
};
export type GoalNumbers = Pick<MonthlyGoal,'goal_atendimentos'|'goal_vendas'|'goal_cotas'|'goal_creditos'>;

/** Meta independente por equipe/stand. Não é a soma implícita das metas individuais. */
export type TeamGoal = {
 id:string;company_id:string;team_id:string;month_start:string;
 goal_atendimentos:number;goal_vendas:number;goal_cotas:number;goal_creditos:number;
 created_at:string;updated_at:string;created_by:string;updated_by:string;
};
export type DigitalStage = 'prospecting' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

/** Referência sem dados pessoais para oportunidades digitais em homologação. */
export type DigitalSource='site'|'whatsapp'|'ads'|'social'|'indicacao'|'outro';
export type DigitalProduct='auto'|'imovel';
