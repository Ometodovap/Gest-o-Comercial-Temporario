import type {ManagerMetrics,MonthlyPerformance} from './managementInsights.js';

export type ResultMetric = 'atendimentos' | 'compradores' | 'cotas' | 'valor_creditos' | 'conversion';
export const resultMetricOptions: readonly {key:ResultMetric; label:string; format:'quantity'|'money'|'percent'}[]=[
 {key:'atendimentos',label:'Atendimentos',format:'quantity'},
 {key:'compradores',label:'Clientes compradores',format:'quantity'},
 {key:'cotas',label:'Cotas comercializadas',format:'quantity'},
 {key:'valor_creditos',label:'Créditos comercializados',format:'money'},
 {key:'conversion',label:'Conversão imediata',format:'percent'}
];
export type MetricComparison={
 metric:ResultMetric;
 current:number|null;
 previous:number|null;
 delta:number|null;
 relativeChange:number|null;
 variationType:'relative'|'percentage_points';
};

function availableValue(stats:ManagerMetrics,metric:ResultMetric):number|null {
 if(!stats.hasRecords)return null;
 const value=stats[metric];
 return value!==null&&Number.isFinite(value)?value:null;
}

/** Missing records are unknown, not zero. Percentage change with zero denominator
 * is undefined; conversion rate difference uses percentage points instead. */
export function compareMetric(current:ManagerMetrics,previous:ManagerMetrics,metric:ResultMetric):MetricComparison {
 const currentValue=availableValue(current,metric);
 const previousValue=availableValue(previous,metric);
 const comparable=currentValue!==null&&previousValue!==null;
 const delta=comparable?currentValue-previousValue:null;
 return {
  metric,current:currentValue,previous:previousValue,delta,
  relativeChange:comparable&&metric!=='conversion'&&previousValue!==0
   ?100*(currentValue-previousValue)/previousValue:null,
  variationType:metric==='conversion'?'percentage_points':'relative'
 };
}
export function trendPoints(months:MonthlyPerformance[],metric:ResultMetric){
 return months.map(({month,stats})=>({month,value:availableValue(stats,metric),hasRecords:stats.hasRecords}));
}
export function relativeBarWidths(current:number|null,previous:number|null):{current:number;previous:number}{
 const max=Math.max(0,current??0,previous??0);
 if(max===0)return {current:0,previous:0};
 return {current:Math.max(0,(current??0)/max*100),previous:Math.max(0,(previous??0)/max*100)};
}
