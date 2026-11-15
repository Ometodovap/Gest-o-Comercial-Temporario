import {useEffect,useMemo,useState} from 'react';
import type {FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Assignment,Membership,Role,Team} from './types';

type Props={
 client:SupabaseClient; companyId:string; companyName:string; userId:string;
 role:Role;teams:Team[];people:Membership[];assignments:Assignment[];
 onRefresh:()=>Promise<void>;
};
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const roles:Record<Role,string>={seller:'Vendedor(a)',supervisor:'Supervisor(a)',manager:'Diretoria'};
const blankMember={userId:'',name:'',role:'seller' as 'seller'|'supervisor',active:true};
const blankTeam={id:'',name:'',unit:'',supervisor:''};
type RpcArgs=Record<string,unknown>;
type InviteRole='seller'|'supervisor';
type InvitePreview={valid:boolean;sending_enabled:boolean;already_invited:boolean;email:string;display_name:string;role:InviteRole;message:string};
export default function AdminWorkspace({client,companyId,companyName,userId,role,teams,people,assignments,onRefresh}:Props){
 const canEdit=role==='manager';
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [newCompany,setNewCompany]=useState('');
 const [companyDraft,setCompanyDraft]=useState(companyName);
 const [teamDraft,setTeamDraft]=useState({...blankTeam});
 const [memberDraft,setMemberDraft]=useState({...blankMember});
 const [assignmentTeam,setAssignmentTeam]=useState('');
 const [assignmentSeller,setAssignmentSeller]=useState('');
 const [assignmentActive,setAssignmentActive]=useState(true);
 const [inviteDraft,setInviteDraft]=useState({email:'',name:'',role:'seller' as InviteRole});
 const [invitePreview,setInvitePreview]=useState<InvitePreview|null>(null);
 const supervisors=useMemo(()=>people.filter(x=>x.company_id===companyId&&x.active&&x.role==='supervisor'),[people,companyId]);
 const sellers=useMemo(()=>people.filter(x=>x.company_id===companyId&&x.active&&x.role==='seller'),[people,companyId]);
 const visibleTeams=useMemo(()=>role==='manager'?teams:teams.filter(t=>t.supervisor_user_id===userId),[teams,role,userId]);
 useEffect(()=>{setCompanyDraft(companyName)},[companyName]);
 useEffect(()=>{setError('');setNotice('');setTeamDraft({...blankTeam});setMemberDraft({...blankMember});setInvitePreview(null);setInviteDraft({email:'',name:'',role:'seller'})},[companyId]);
 const name=(id:string|null)=>id?people.find(x=>x.user_id===id)?.display_name||'Usuário autorizado':'Não designado';
 async function runRpc(rpc:string,args:RpcArgs,success:string,after?:()=>void){
  if(!canEdit){setError('Operação reservada à diretoria.');return;}
  setBusy(true);setError('');setNotice('');
  try{
   const {error:rpcError}=await client.rpc(rpc,args);
   if(rpcError)throw new Error(rpcError.message);
   after?.();
   await onRefresh();
   setNotice(success);
  }catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setBusy(false)}
 }
 async function renameCompany(e:FormEvent){
  e.preventDefault();if(!companyDraft.trim())return;
  await runRpc('gc_admin_rename_company',{p_company_id:companyId,p_name:companyDraft.trim()},'Cadastro da empresa atualizado.');
 }
 async function createCompany(e:FormEvent){
  e.preventDefault();if(!newCompany.trim())return;
  await runRpc('gc_admin_create_company',{p_name:newCompany.trim()},
   'Empresa fictícia criada. Atualize a página para selecionar seu novo ambiente.',()=>setNewCompany(''));
 }
 async function saveTeam(e:FormEvent){
  e.preventDefault();if(!teamDraft.name.trim())return;
  await runRpc('gc_admin_save_team',{
   p_company_id:companyId,p_team_id:teamDraft.id||null,p_name:teamDraft.name.trim(),
   p_unit_name:teamDraft.unit.trim(),p_supervisor_user_id:teamDraft.supervisor||null
  },'Stand atualizado. O histórico de fechamentos anteriores permanece associado ao stand original.',
  ()=>setTeamDraft({...blankTeam}));
 }
 async function saveMember(e:FormEvent){
  e.preventDefault();
  if(!uuidPattern.test(memberDraft.userId)){setError('Informe um UID válido de uma conta fictícia já criada no Supabase Auth.');return;}
  await runRpc('gc_admin_save_member',{
   p_company_id:companyId,p_user_id:memberDraft.userId.trim(),p_display_name:memberDraft.name.trim(),
   p_role:memberDraft.role,p_active:memberDraft.active
  },'Vínculo de usuário atualizado com auditoria.',()=>setMemberDraft({...blankMember}));
 }
 async function saveAssignment(e:FormEvent){
  e.preventDefault();if(!assignmentTeam||!assignmentSeller)return;
  await runRpc('gc_admin_assign_seller',{
   p_company_id:companyId,p_team_id:assignmentTeam,p_seller_id:assignmentSeller,p_active:assignmentActive
  },assignmentActive?'Vendedor vinculado ao stand. O histórico não foi reescrito.':'Vínculo com o stand suspenso.');
 }
 async function previewInvite(e:FormEvent){
  e.preventDefault();
  if(!canEdit){setError('Operação reservada à diretoria.');return;}
  setBusy(true);setError('');setNotice('');setInvitePreview(null);
  try{
   const {data,error:requestError}=await client.functions.invoke('gc-invite-user',{
    body:{action:'preview',company_id:companyId,email:inviteDraft.email.trim(),display_name:inviteDraft.name.trim(),role:inviteDraft.role}
   });
   if(requestError)throw new Error('Não foi possível validar o convite. Confirme sua sessão e a função de convites.');
   const preview=data as InvitePreview;
   if(!preview?.valid)throw new Error('O servidor não aprovou os dados do convite.');
   setInvitePreview(preview);
   setNotice(preview.message);
  }catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setBusy(false)}
 }
 async function sendInvite(){
  if(!canEdit||!invitePreview?.sending_enabled||invitePreview.already_invited)return;
  if(invitePreview.email!==inviteDraft.email.trim().toLowerCase()||
     invitePreview.display_name!==inviteDraft.name.trim()||
     invitePreview.role!==inviteDraft.role){setInvitePreview(null);setError('Valide novamente os dados alterados.');return;}
  if(!window.confirm('Confirmar envio de convite para '+invitePreview.email+'? Esta ação enviará um e-mail.'))return;
  setBusy(true);setError('');setNotice('');
  try{
   const {data,error:requestError}=await client.functions.invoke('gc-invite-user',{
    body:{action:'send',company_id:companyId,email:invitePreview.email,display_name:invitePreview.display_name,role:invitePreview.role}
   });
   if(requestError)throw new Error('Não foi possível concluir o envio; consulte o registro de auditoria antes de tentar novamente.');
   if(!data?.sent)throw new Error('O servidor não confirmou o envio.');
   setInvitePreview(null);setInviteDraft({email:'',name:'',role:'seller'});
   setNotice(data.message||'Convite enviado e vínculo confirmado.');
   await onRefresh();
  }catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setBusy(false)}
 }
 function selectTeam(id:string){
  const t=teams.find(x=>x.id===id);
  setTeamDraft(t?{id:t.id,name:t.name,unit:t.unit_name,supervisor:t.supervisor_user_id||''}:{...blankTeam});
 }
 function selectMember(id:string){
  const m=people.find(x=>x.company_id===companyId&&x.user_id===id);
  setMemberDraft(m?{userId:m.user_id,name:m.display_name,role:m.role==='supervisor'?'supervisor':'seller',active:m.active}:{...blankMember});
 }
 return <div className="gc-admin">
  <section className="panel">
   <h2>Estrutura e permissões — {companyName}</h2>
   <p>Cadastros administrativos do ambiente de homologação. Vendedores não acessam esta área. A supervisão consulta apenas as equipes autorizadas; alterações de empresa, pessoas e stands exigem diretoria ativa.</p>
   <div className="mini-stats">
    <span>{visibleTeams.length} stand(s) visível(is)</span>
    <span>{people.filter(p=>p.active&&p.role==='seller').length} vendedor(es) visível(is)</span>
    <span>{people.filter(p=>p.active&&p.role==='supervisor').length} supervisor(es) visível(is)</span>
    <span>{canEdit?'Diretoria: edição autorizada':'Supervisão: consulta'}</span>
   </div>
   {error&&<div className="error" role="alert">{error}</div>}
   {notice&&<div className="success" role="status">{notice}</div>}
  </section>
  <section className="panel">
   <h2>Stands e responsáveis</h2>
   <p>Os vínculos históricos de produção são preservados quando um vendedor muda de equipe.</p>
   <div className="table-scroll"><table><thead><tr><th>Stand</th><th>Unidade</th><th>Supervisão</th><th>Vendedores ativos</th></tr></thead><tbody>
    {visibleTeams.map(t=><tr key={t.id}><td><b>{t.name}</b></td><td>{t.unit_name||'—'}</td><td>{name(t.supervisor_user_id)}</td><td>{assignments.filter(a=>a.team_id===t.id&&a.active).length}</td></tr>)}
    {visibleTeams.length===0&&<tr><td colSpan={4}>Nenhum stand atribuído a esta conta.</td></tr>}
   </tbody></table></div>
   {canEdit&&<form onSubmit={saveTeam} className="gc-admin-form">
    <h3>Cadastrar ou editar stand</h3>
    <div className="form-grid">
     <label>Registro<select value={teamDraft.id} onChange={e=>selectTeam(e.target.value)}><option value="">Novo stand</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
     <label>Nome do stand<input required minLength={2} maxLength={120} value={teamDraft.name} onChange={e=>setTeamDraft(s=>({...s,name:e.target.value}))} placeholder="Stand Shopping C"/></label>
     <label>Shopping / unidade<input maxLength={120} value={teamDraft.unit} onChange={e=>setTeamDraft(s=>({...s,unit:e.target.value}))}/></label>
     <label>Supervisor<select value={teamDraft.supervisor} onChange={e=>setTeamDraft(s=>({...s,supervisor:e.target.value}))}><option value="">Sem supervisor</option>{supervisors.map(m=><option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</select></label>
    </div>
    <button className="primary" disabled={busy}>Salvar stand</button>
   </form>}
  </section>
  {canEdit&&<section className="panel">
   <h2>Convidar vendedor ou supervisor</h2>
   <p>Informe um e-mail de teste para validar o convite sem cadastrar UID manualmente. O envio real está desativado até configurarmos e homologarmos o serviço SMTP e o endereço de retorno. Não utilize e-mails reais nesta fase.</p>
   <form className="gc-admin-form" onSubmit={previewInvite}>
    <div className="form-grid">
     <label>Nome de exibição<input required minLength={2} maxLength={120} value={inviteDraft.name} onChange={e=>{setInviteDraft(s=>({...s,name:e.target.value}));setInvitePreview(null)}} placeholder="Vendedor de Teste"/></label>
     <label>E-mail fictício<input type="email" required maxLength={254} value={inviteDraft.email} onChange={e=>{setInviteDraft(s=>({...s,email:e.target.value}));setInvitePreview(null)}} placeholder="vendedor@piloto.test"/></label>
     <label>Função inicial<select value={inviteDraft.role} onChange={e=>{setInviteDraft(s=>({...s,role:e.target.value as InviteRole}));setInvitePreview(null)}}><option value="seller">Vendedor(a)</option><option value="supervisor">Supervisor(a)</option></select></label>
    </div>
    <button className="primary" disabled={busy}>Pré-validar convite</button>
   </form>
   {invitePreview&&<div className="gc-admin-form" role="status">
    <h3>Resultado da pré-validação</h3>
    <p><b>{invitePreview.display_name}</b> — {invitePreview.email} — {invitePreview.role==='seller'?'Vendedor(a)':'Supervisor(a)'}</p>
    <p>{invitePreview.message}</p>
    {invitePreview.already_invited&&<p>Já existe um convite ativo para este e-mail nesta empresa. Não é permitido reenviar automaticamente.</p>}
    {!invitePreview.sending_enabled&&<p><b>Envio indisponível nesta homologação.</b> Configure SMTP e os controles do servidor antes de habilitar o envio.</p>}
    <button type="button" className="secondary" disabled={busy||!invitePreview.sending_enabled||invitePreview.already_invited} onClick={()=>void sendInvite()}>Confirmar e enviar convite</button>
   </div>}
  </section>}
  <section className="panel">
   <h2>Equipe e funções</h2>
   <p>Os vínculos de diretoria não podem ser concedidos ou modificados por este formulário. O cadastro de uma pessoa exige uma conta fictícia preexistente no Supabase Auth; nenhuma senha ou chave privada é enviada pelo navegador.</p>
   <div className="table-scroll"><table><thead><tr><th>Nome</th><th>Função</th><th>Situação</th><th>Equipes ativas</th></tr></thead><tbody>
    {people.map(m=><tr key={m.user_id}><td>{m.display_name}</td><td>{roles[m.role]}</td><td>{m.active?'Ativo':'Suspenso'}</td><td>{assignments.filter(a=>a.seller_id===m.user_id&&a.active).map(a=>teams.find(t=>t.id===a.team_id)?.name||'Stand').join(', ')||'—'}</td></tr>)}
    {people.length===0&&<tr><td colSpan={4}>Nenhuma pessoa visível nesta empresa.</td></tr>}
   </tbody></table></div>
   {canEdit&&<form onSubmit={saveMember} className="gc-admin-form">
    <h3>Gerenciar vendedor ou supervisor</h3>
    <div className="form-grid">
     <label>Registro existente<select value={people.some(m=>m.user_id===memberDraft.userId)?memberDraft.userId:''} onChange={e=>selectMember(e.target.value)}><option value="">Vincular novo UID do Auth</option>{people.filter(m=>m.role!=='manager').map(m=><option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</select></label>
     <label>UID da conta no Auth<input required pattern="[0-9a-fA-F-]{36}" value={memberDraft.userId} onChange={e=>setMemberDraft(s=>({...s,userId:e.target.value.trim()}))} placeholder="UUID do usuário fictício"/></label>
     <label>Nome de exibição<input required minLength={2} maxLength={120} value={memberDraft.name} onChange={e=>setMemberDraft(s=>({...s,name:e.target.value}))}/></label>
     <label>Função<select value={memberDraft.role} onChange={e=>setMemberDraft(s=>({...s,role:e.target.value as 'seller'|'supervisor'}))}><option value="seller">Vendedor(a)</option><option value="supervisor">Supervisor(a)</option></select></label>
     <label>Situação<select value={memberDraft.active?'active':'inactive'} onChange={e=>setMemberDraft(s=>({...s,active:e.target.value==='active'}))}><option value="active">Ativo</option><option value="inactive">Suspenso</option></select></label>
    </div>
    <p>A conta precisa ser criada previamente em Authentication → Users. Não é permitido anexar usuários ativos de outra empresa.</p>
    <button className="primary" disabled={busy}>Salvar vínculo</button>
   </form>}
  </section>
  {canEdit&&<section className="panel">
   <h2>Vincular vendedor ao stand</h2>
   <p>Ao mudar o stand de um vendedor, a atribuição anterior é desativada. Os fechamentos históricos continuam associados ao stand original.</p>
   <form onSubmit={saveAssignment} className="gc-admin-form"><div className="form-grid">
    <label>Stand<select required value={assignmentTeam} onChange={e=>setAssignmentTeam(e.target.value)}><option value="">Selecione</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
    <label>Vendedor<select required value={assignmentSeller} onChange={e=>setAssignmentSeller(e.target.value)}><option value="">Selecione</option>{sellers.map(m=><option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</select></label>
    <label>Atribuição<select value={assignmentActive?'active':'inactive'} onChange={e=>setAssignmentActive(e.target.value==='active')}><option value="active">Ativar / transferir para este stand</option><option value="inactive">Suspender vínculo com este stand</option></select></label>
   </div><button className="primary" disabled={busy}>Salvar atribuição</button></form>
  </section>}
  {canEdit&&<section className="panel">
   <h2>Empresas</h2>
   <p>Uma diretoria já autorizada pode cadastrar outra empresa fictícia, que terá dados e equipes independentes. A conta que cria a empresa se torna a primeira diretoria dela. Limite de 3 empresas por 30 dias nesta etapa.</p>
   <form onSubmit={renameCompany} className="gc-admin-form"><div className="form-grid">
    <label>Nome da empresa atual<input value={companyDraft} onChange={e=>setCompanyDraft(e.target.value)} minLength={2} maxLength={180} required/></label>
   </div><button className="secondary" disabled={busy}>Atualizar nome da empresa</button></form>
   <form onSubmit={createCompany} className="gc-admin-form"><div className="form-grid">
    <label>Nova empresa fictícia<input value={newCompany} onChange={e=>setNewCompany(e.target.value)} minLength={2} maxLength={180} required placeholder="Empresa Piloto C"/></label>
   </div><button className="primary" disabled={busy}>Cadastrar empresa</button></form>
  </section>}
  <section className="panel"><h2>Governança do piloto</h2>
   <p>Esta versão permite pré-validar convites pelo servidor, mas mantém o envio de e-mails bloqueado até a homologação do SMTP. Não cria usuários Auth sem envio autorizado, não altera senhas e não permite concessão de diretoria pela interface. Não utilize dados de clientes reais. Operações administrativas ficam registradas em auditoria privada no banco.</p>
   <button className="secondary" type="button" onClick={()=>void onRefresh()} disabled={busy}>Atualizar estrutura da empresa</button>
  </section>
 </div>;
}
