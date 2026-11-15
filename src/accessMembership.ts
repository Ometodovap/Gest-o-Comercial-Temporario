import type {Membership} from './types';

/** Identificador de vínculos ativos; mudanças de papel e desativação invalidam dados do navegador. */
export function activeMembershipFingerprint(rows:Membership[]):string{
 return rows.filter(x=>x.active)
  .map(x=>[x.user_id,x.company_id,x.role].join(':'))
  .sort()
  .join('|');
}
