/**
 * Protege a interface contra respostas assíncronas de outra conta, empresa ou mês.
 * Não substitui o RLS do Supabase; impede exibir no navegador dados de contexto obsoleto.
 */
export type ScopedRequest={sequence:number;scope:string};
export function scopeKey(userId:string|undefined,companyId:string,month:string):string{
 return userId&&companyId&&month?userId+'|'+companyId+'|'+month:'';
}
export function createScopeGuard(){
 let sequence=0;
 return {
  begin(scope:string):ScopedRequest{return {sequence:++sequence,scope};},
  invalidate():void{sequence++;},
  isCurrent(request:ScopedRequest,currentScope:string):boolean{
   return request.sequence===sequence&&request.scope===currentScope;
  }
 };
}
