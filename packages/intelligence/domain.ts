import type { ExtractionCandidate } from "./extraction.ts";

export interface Money { minor: string; currency: string }
const exponent: Record<string,number>={BHD:3,CLF:4,INR:2,JPY:0,KRW:0,USD:2,EUR:2,GBP:2};
export function normalizeMoney(amount: string, currency: string): Money {
  const exp=exponent[currency]; if(exp===undefined) throw new Error("Unknown currency exponent; request review");
  const m=amount.trim().replace(/,/g,"").match(/^(-?)(\d+)(?:\.(\d+))?$/); if(!m) throw new Error("Invalid decimal amount");
  const frac=m[3]??""; if(frac.length>exp) throw new Error("Amount exceeds currency precision");
  const magnitude=BigInt(m[2])*10n**BigInt(exp)+BigInt((frac+"0".repeat(exp)).slice(0,exp)||"0");
  return {minor:(m[1]? -magnitude:magnitude).toString(),currency};
}
export function compareMoney(a: Money,b: Money): Money { if(a.currency!==b.currency)throw new Error("Currency mismatch; review required"); return {minor:(BigInt(b.minor)-BigInt(a.minor)).toString(),currency:a.currency}; }

export type Deadline = {raw:string; precision:"exact"|"estimated"|"unknown"; date:string|null; timezone:string|null; anchor:string|null; count:number|null; calendarId:string|null; includeStartDay:boolean|null};
export function resolveBusinessDeadline(d:Deadline, holidays:ReadonlySet<string>|null=null):Deadline {
  if(d.precision==="unknown"||d.count===null||!d.anchor||!d.calendarId||holidays===null) return {...d,precision:"unknown",date:null};
  const date=new Date(`${d.anchor}T12:00:00Z`); if(Number.isNaN(date.valueOf()))return {...d,precision:"unknown",date:null};
  let left=d.count; if(d.includeStartDay&&date.getUTCDay()>0&&date.getUTCDay()<6&&!holidays.has(d.anchor))left--;
  while(left>0){date.setUTCDate(date.getUTCDate()+1);const iso=date.toISOString().slice(0,10),dow=date.getUTCDay();if(dow>0&&dow<6&&!holidays.has(iso))left--;}
  return {...d,date:date.toISOString().slice(0,10),precision:"exact"};
}

export interface Observation { workspaceId:string; brandId:string; orderId:string|null; plan:string|null; period:string|null; seats:number|null; money:Money|null; taxContext:"inclusive"|"exclusive"|"unknown"|"not_applicable"; sourceRefs:string[]; }
export interface Comparison { status:"possible_mismatch"|"insufficient_evidence"|"no_mismatch"; delta:Money|null; reasons:string[]; sourceRefs:string[]; }
export function compareObservations(p:Observation,o:Observation):Comparison {
  const reasons:string[]=[];
  if(p.workspaceId!==o.workspaceId) return {status:"insufficient_evidence",delta:null,reasons:["Workspace scope mismatch"],sourceRefs:[]};
  if(p.brandId!==o.brandId) reasons.push("Brand identity differs");
  if(p.orderId&&o.orderId&&p.orderId!==o.orderId) reasons.push("Order/account differs");
  if(p.plan!==o.plan||p.period!==o.period||p.seats!==o.seats) reasons.push("Plan, billing period, or seat count differs");
  if(p.taxContext!==o.taxContext||p.taxContext==="unknown"||o.taxContext==="unknown") reasons.push("Tax context differs or is unknown");
  if(!p.money||!o.money||p.money.currency!==o.money.currency) reasons.push("Amount or currency cannot be compared");
  const delta=p.money&&o.money&&p.money.currency===o.money.currency?compareMoney(p.money,o.money):null;
  if(reasons.length) return {status:"insufficient_evidence",delta:null,reasons,sourceRefs:[...p.sourceRefs,...o.sourceRefs]};
  return {status:delta?.minor!=="0"?"possible_mismatch":"no_mismatch",delta,reasons:[],sourceRefs:[...p.sourceRefs,...o.sourceRefs]};
}

export interface Fact { text:string; sourceRefs:string[]; }
export function groundedDraft(facts:Fact[], userAllegation:string|null, requestedLanguage:"en"|"hi"="en"): {text:string;citations:string[];gaps:string[];language:string} {
  const valid=facts.filter(f=>f.text.trim()&&f.sourceRefs.length&&f.sourceRefs.every(Boolean));
  const citations=[...new Set(valid.flatMap(f=>f.sourceRefs))];
  if(!valid.length) return {text:requestedLanguage==="hi"?"उपलब्ध साक्ष्य से इस दावे की पुष्टि नहीं हो सकी।":"The available evidence does not support a specific claim yet.",citations:[],gaps:["No cited facts supplied"],language:requestedLanguage};
  const factsText=valid.map(f=>f.text).join(" ");
  const allegation=userAllegation?.trim()?` User-reported concern (not independently verified): ${userAllegation.trim()}`:"";
  return {text:`Based on the records provided: ${factsText}${allegation} Please review the cited evidence before sending.`,citations,gaps:[],language:requestedLanguage};
}

export function candidateToObservation(c:ExtractionCandidate, scope:{workspaceId:string;brandId:string;orderId?:string|null;plan?:string|null;period?:string|null;seats?:number|null}):Observation { return {workspaceId:scope.workspaceId,brandId:scope.brandId,orderId:scope.orderId??null,plan:scope.plan??null,period:scope.period??null,seats:scope.seats??null,money:c.money,taxContext:c.taxContext as Observation["taxContext"],sourceRefs:c.sources.map(s=>`${s.evidenceId}:${s.assetVersion}:${s.spanId}`)}; }
