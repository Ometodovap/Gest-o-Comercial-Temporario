/** A data agendada controla a revisão. Sem amostra suficiente, só cabe avaliação qualitativa justificada. */
export function reviewGate(reviewDate:string,today:string,hasComparableData:boolean,notes:string){
 const valid=/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(reviewDate)&&/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(today);
 const reviewDue=valid&&today>=reviewDate;
 const notesRequired=!hasComparableData;
 return {reviewDue,notesRequired,canSubmit:reviewDue&&(!notesRequired||notes.trim().length>0)};
}
