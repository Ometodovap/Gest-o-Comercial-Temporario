import {useState} from 'react';
import type {ManagerMetrics,MonthlyPerformance} from './managementInsights';
import {compareMetric,relativeBarWidths,resultMetricOptions,trendPoints} from './managementCharts';
import type {ResultMetric} from './managementCharts';
import {brl,percent} from './metrics';

function displayMonth(month:string):string{
 const [year,n]=month.split('-').map(Number);
 return new Intl.DateTimeFormat('pt-BR',{month:'short',year:'numeric',timeZone:'UTC'})
  .format(new Date(Date.UTC(year,n-1,1))).replace('. de','.');
}
function formatMetric(metric:ResultMetric,value:number|null):string{
 if(value===null)return 'Sem base';
 if(metric==='valor_creditos')return brl(value);
 if(metric==='conversion')return percent(value);
 return value.toLocaleString('pt-BR',{maximumFractionDigits:0});
}
function signedVariation(n:number,unit:'%'|'p.p.'):string{
 return (n>0?'+':'')+n.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+' '+unit;
}
export function ManagementMonthComparison({current,previous,currentMonth,previousMonth}:{
 current:ManagerMetrics;previous:ManagerMetrics;currentMonth:string;previousMonth:string;
}){
 return <section className="panel">
  <h2>Comparativo direto — {displayMonth(previousMonth)} × {displayMonth(currentMonth)}</h2>
  <p>Compare os resultados dos dois meses. As barras de cada indicador utilizam a mesma escala, permitindo observar a variação. Conversão é medida em pontos percentuais; outras variações relativas só aparecem quando existe base anterior diferente de zero.</p>
  <div className="mg-comparison-grid">
   {resultMetricOptions.map(option=>{
    const item=compareMetric(current,previous,option.key);
    const widths=relativeBarWidths(item.current,item.previous);
    const comparison=item.delta===null?'Sem base para comparação':
     option.key==='conversion'?signedVariation(item.delta,'p.p.'):
     item.relativeChange!==null?signedVariation(item.relativeChange,'%'):
     'Variação percentual indisponível (base anterior zero)';
    return <article className="mg-comparison-item" key={option.key}>
     <h3>{option.label}</h3>
     <div className="mg-compare-bar-row">
      <div className="mg-compare-bar-meta"><small>{displayMonth(previousMonth)}</small><strong>{formatMetric(option.key,item.previous)}</strong></div>
      <div className="mg-compare-track" title={'Mês anterior: '+formatMetric(option.key,item.previous)}>
       {item.previous!==null&&<div className="mg-compare-prev" style={{width:widths.previous+'%'}}/>}
      </div>
     </div>
     <div className="mg-compare-bar-row">
      <div className="mg-compare-bar-meta"><small>{displayMonth(currentMonth)}</small><strong>{formatMetric(option.key,item.current)}</strong></div>
      <div className="mg-compare-track" title={'Mês atual: '+formatMetric(option.key,item.current)}>
       {item.current!==null&&<div className="mg-compare-current" style={{width:widths.current+'%'}}/>}
      </div>
     </div>
     <div className="mg-compare-difference">
      {item.delta!==null&&<span>Diferença absoluta: {item.delta>0?'+':''}{formatMetric(option.key,item.delta)}</span>}
      <small>{comparison}</small>
     </div>
    </article>;
   })}
  </div>
  <p className="mg-footnote">Competência sem fechamento válido aparece como “Sem base”. Zero só é exibido se houve fechamento e o indicador realmente foi declarado como zero.</p>
 </section>;
}

export function ManagementTrendChart({months}:{months:MonthlyPerformance[]}){
 const [selectedMetric,setSelectedMetric]=useState<ResultMetric>('compradores');
 const active=resultMetricOptions.find(o=>o.key===selectedMetric)||resultMetricOptions[1];
 const points=trendPoints(months,selectedMetric);
 const max=Math.max(1,...points.filter(x=>x.value!==null).map(x=>x.value||0));
 return <div className="mg-chart-container">
  <div className="mg-chart-choices" role="group" aria-label="Selecionar indicador para o gráfico dos seis meses">
   {resultMetricOptions.map(option=><button key={option.key} type="button"
    className={'mg-chart-choice'+(selectedMetric===option.key?' mg-chart-choice-active':'')}
    aria-pressed={selectedMetric===option.key} onClick={()=>setSelectedMetric(option.key)}>{option.label}</button>)}
  </div>
  <div className="mg-chart-heading">Evolução de {active.label.toLowerCase()}</div>
  <div className="mg-chart-six" role="group" aria-label={'Gráfico histórico de '+active.label.toLowerCase()}>
   {points.map(point=><div className="mg-chart-six-row" key={point.month}>
    <b>{displayMonth(point.month)}</b>
    <div className="mg-trend-track" title={point.value===null?'Sem base':formatMetric(selectedMetric,point.value)}>
     {point.value!==null&&<div className="mg-trend-fill" style={{width:Math.max(0,point.value/max*100)+'%'}}/>}
    </div>
    <span>{point.value===null?(point.hasRecords?'Sem base para taxa':'Sem registros'):formatMetric(selectedMetric,point.value)}</span>
   </div>)}
  </div>
  <p className="mg-footnote">O gráfico é recalculado ao escolher outro indicador. Cada linha representa uma competência e a escala é relativa ao maior valor registrado nos seis meses. Para a conversão, a unidade é percentual; a comparação entre meses usa pontos percentuais.</p>
 </div>;
}
