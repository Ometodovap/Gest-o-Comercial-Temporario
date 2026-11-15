/** Regras puras de MFA: o servidor é responsável pelo enforcement definitivo. */
export type AssuranceLevel=string|null;
export function requiresMfaChallenge(currentLevel:AssuranceLevel,nextLevel:AssuranceLevel):boolean{
 return currentLevel==='aal1'&&nextLevel==='aal2';
}
export function isTotpCode(value:string):boolean{
 return /^\d{6}$/.test(value.trim());
}
export function isPrivilegedRole(role:string|undefined):boolean{
 return role==='manager'||role==='supervisor';
}
