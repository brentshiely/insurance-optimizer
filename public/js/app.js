import { overlapSections, overlapScreenIds, applyAnswer, actionListViewModel, actionListText, liabilityStackModel, stackForScreen, ACTIONS_SCREEN_ID } from './overlap-ui/viewModel.mjs';
import { stackViewModel } from './overlap-ui/stackView.mjs';
import { overlapScreenHtml, overlapProgress, overlapScreenLabel, sectionIdOf, actionListHtml, actionListErrorHtml, entryNoteHtml } from './overlap-ui/screens.mjs';
import { patchOverlapScreen, restoreFocus, focusHeading, copyText, printList, COPY_OK, COPY_FAILED } from './overlap-ui/dom.mjs';
import { startAnalytics, becameSelected, flagIdsOf } from './overlap-ui/analytics.mjs';
import { ANALYTICS_CONFIG } from './config.mjs';
(function(){
var STATES="AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ").sort();
var STATE_NAMES={AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming"};
var STATES_BY_NAME=STATES.slice().sort(function(a,b){return STATE_NAMES[a]<STATE_NAMES[b]?-1:1});
function stateName(c){return STATE_NAMES[c]||c}
var NOFAULT=["FL","HI","KS","KY","MA","MI","MN","NJ","NY","ND","PA","UT"];
// State data tables. Each has a source in SRC; do not add a table without one.
var WINDSTATES=["AL","CT","DE","FL","GA","HI","LA","ME","MD","MA","MS","NJ","NY","NC","PA","RI","SC","TX","VA","DC"];
var LASTRESORT_STATES=["AL","CA","CT","DE","DC","FL","GA","HI","IL","IN","IA","KS","KY","LA","MD","MA","MI","MN","MS","MO","NJ","NM","NY","OH","OR","PA","RI","SC","TX","VA","WA","WV","WI"];
var EQ_STATES=["AK","AR","CA","HI","ID","IL","KY","MO","MT","NV","OR","SC","TN","UT","WA","WY"];
var NEWMADRID_STATES=["AR","IL","KY","MO","TN"];
var UM_MANDATORY_STATES=["CT","DC","IL","ME","MD","MN","MO","NE","NJ","NY","NC","ND","OR","SC","SD","VT","VA","WV","WI"];
var PIP_MIN={FL:["$10,000","flPip"],NY:["$50,000","nyPip"],MN:["$40,000","mnPip"]};
var BOAT_MANDATE_STATES={AR:{min:50000,text:"at least $50,000 of liability coverage for any jet ski or a motorboat over 50 horsepower",src:"arBoat"},UT:{min:50000,text:"liability coverage of at least $25,000 per person and $50,000 per accident for any jet ski or a motorboat over 50 horsepower",src:"utBoat"}};
// State paid-disability and paid-medical-leave programs, as of Sept 2026. Maryland's starts paying in 2028 and is left out on purpose.
var STATE_DI={
  CA:{name:"State Disability Insurance",dur:"up to 52 weeks",amt:"70% to 90% of your wages, up to $1,765 a week",src:"caSdi"},
  NY:{name:"disability benefits coverage",dur:"up to 26 weeks",amt:"half your wages, capped at $170 a week",src:"nyDbl"},
  NJ:{name:"Temporary Disability Insurance",dur:"up to 26 weeks",amt:"85% of your wages, up to $1,119 a week",src:"njTdi"},
  HI:{name:"Temporary Disability Insurance",dur:"up to 26 weeks",amt:"58% of your wages, up to $871 a week",src:"hiTdi"},
  RI:{name:"Temporary Disability Insurance",dur:"up to 30 weeks",amt:"up to $1,150 a week",src:"riTdi"},
  MN:{name:"Paid Leave",dur:"up to 12 weeks",amt:"up to $1,423 a week",src:"mnPl"},
  DE:{name:"Paid Leave",dur:"up to 6 weeks in any two years",amt:"80% of your wages, up to $900 a week",src:"dePl"},
  ME:{name:"Paid Family and Medical Leave",dur:"up to 12 weeks",amt:"most of your wages, capped at the state average wage",src:"mePl"},
  CO:{name:"FAMLI leave",dur:"up to 12 weeks",amt:"",src:"stdGuide"},
  CT:{name:"Paid Leave",dur:"up to 12 weeks",amt:"up to $1,016 a week",src:"stdGuide"},
  DC:{name:"Paid Family Leave",dur:"up to 12 weeks",amt:"up to $1,190 a week",src:"stdGuide"},
  MA:{name:"Paid Family and Medical Leave",dur:"up to 20 weeks",amt:"up to $1,230 a week",src:"stdGuide"},
  OR:{name:"Paid Leave Oregon",dur:"up to 12 weeks",amt:"",src:"stdGuide"},
  WA:{name:"Paid Family and Medical Leave",dur:"up to 12 weeks",amt:"up to $1,647 a week",src:"stdGuide"}
};
var SRC={
  caSdi:{src:"California EDD",url:"https://edd.ca.gov/en/disability/disability_insurance/"},
  nyDbl:{src:"NY Workers' Compensation Board",url:"https://www.wcb.ny.gov/content/main/DisabilityBenefits/what-are-disability-benefits.jsp"},
  njTdi:{src:"NJ Dept. of Labor",url:"https://www.nj.gov/labor/myleavebenefits/worker/tdi/"},
  hiTdi:{src:"Hawaii Dept. of Labor",url:"https://labor.hawaii.gov/dcd/home/about-tdi/"},
  riTdi:{src:"RI Dept. of Labor and Training",url:"https://dlt.ri.gov/press-releases/maximum-weekly-benefit-amounts-unemployment-and-temporary-disability-insurance-4"},
  mnPl:{src:"The Standard, Minnesota Paid Leave",url:"https://www.standard.com/businesses-organizations/workplace-benefits/paid-family-medical-leave/states-paid-family-medical/minnesota"},
  dePl:{src:"Delaware Dept. of Labor",url:"https://labor.delaware.gov/delaware-paid-leave-is-coming/"},
  mePl:{src:"Maine Dept. of Labor",url:"https://www.maine.gov/labor/news_events/article.shtml?id=13340124"},
  stdGuide:{src:"The Standard, 2026 state leave guide",url:"https://www.standard.com/eforms/19866.pdf"},
  ltdGap:{src:"Guardian",url:"https://www.guardianlife.com/paid-family-medical-leave/how-short-term-disability-complements-pfml"},
  arBoat:{src:"Ark. Code \u00a727-101-207",url:"https://law.onecle.com/arkansas/title-27/27-101-207.html"},
  utBoat:{src:"Utah Code \u00a731A-22-1503",url:"https://le.utah.gov/xcode/Title31A/Chapter22/C31A-22-S1503_1800010118000101.pdf"},
  boatHome:{src:"ValuePenguin",url:"https://www.valuepenguin.com/does-homeowners-insurance-cover-boats-and-watercraft"},
  boatIII:{src:"Insurance Information Institute",url:"https://www.iii.org/article/boat-insurance-and-safety"},
  moto:{src:"ValuePenguin",url:"https://www.valuepenguin.com/do-you-need-motorcycle-insurance"},
  rv:{src:"Progressive",url:"https://www.progressive.com/answers/state-rv-insurance-requirements/"},
  ebike:{src:"Progressive",url:"https://www.progressive.com/answers/do-i-need-ebike-insurance/"},
  eqExcluded:{src:"Insurance Information Institute",url:"https://www.iii.org/article/earthquake-insurance-for-homeowners"},
  eqStates:{src:"USGS via Insurance Journal",url:"https://www.insurancejournal.com/news/national/2014/07/20/335281.htm"},
  newMadrid:{src:"Illinois Emergency Management Agency",url:"https://iemaohs.illinois.gov/preparedness/earthquake-newmadrid.html"},
  moTakeup:{src:"Missouri Dept. of Commerce and Insurance",url:"https://dci.mo.gov/node/2486"},
  ceaDed:{src:"California Earthquake Authority",url:"https://www.earthquakeauthority.com/california-earthquake-insurance-policies/homeowners/coverages-and-deductibles"},
  ceaDedTip:{src:"California Earthquake Authority",url:"https://portal.earthquakeauthority.com/sales-tip-ceas-deductible"},
  caOffer:{src:"Cal. Ins. Code \u00a710081",url:"https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=INS&sectionNum=10081."},
  um:{src:"Insurance Information Institute",url:"https://www.iii.org/article/background-on-compulsory-auto-uninsured-motorists"},
  uninsured:{src:"Insurance Research Council via III",url:"https://www.iii.org/fact-statistic/facts-statistics-uninsured-motorists"},
  nofault:{src:"Insurance Information Institute",url:"https://www.iii.org/article/background-on-no-fault-auto-insurance"},
  flPip:{src:"Fla. Stat. 627.736",url:"http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0600-0699/0627/Sections/0627.736.html"},
  nyPip:{src:"NY Dept. of Financial Services",url:"https://www.dfs.ny.gov/faqs/consumer-auto/how-much-auto-insurance-must-i-carry"},
  mnPip:{src:"Minn. Stat. 65B.44",url:"https://www.revisor.mn.gov/statutes/cite/65B.44"},
  miPip:{src:"Michigan Dept. of Insurance and Financial Services",url:"https://www.michigan.gov/autoinsurance/choosing-coverage/choosing-pip-med-coverage"},
  medpay:{src:"Insurance Journal",url:"https://www.insurancejournal.com/news/east/2026/09/15/885119.htm"},
  wind:{src:"Insurance Information Institute",url:"https://www.iii.org/article/background-on-hurricane-and-windstorm-deductibles"},
  windFL:{src:"Florida Dept. of Financial Services",url:"https://www.myfloridacfo.com/division/consumers/consumerprotections/floridashurricanedeductible"},
  lastResort:{src:"Insurance Information Institute",url:"https://www.iii.org/article/what-if-i-cant-get-coverage"},
  caFair:{src:"California FAIR Plan",url:"https://www.cfpnet.com/difference-in-conditions-dic/"},
  flCitizens:{src:"Citizens Property Insurance",url:"https://www.citizensfla.com/-/20211005-inflation-factor-adjustments-pl"},
  laCitizens:{src:"Louisiana Citizens",url:"https://www.lacitizens.com/claims-center/frequently-asked-questions"},
  twia:{src:"Texas Windstorm Insurance Association",url:"https://www.twia.org/inside-a-policy/"}
};
function cite(f,key){ f.src=SRC[key].src; f.url=SRC[key].url; return f }
var GRID=[{"x":0,"y":0,"key":"AK"},{"x":11,"y":0,"key":"ME"},{"x":9,"y":1,"key":"VT"},{"x":10,"y":1,"key":"NH"},{"x":11,"y":1,"key":"MA"},{"x":1,"y":2,"key":"WA"},{"x":2,"y":2,"key":"MT"},{"x":3,"y":2,"key":"ND"},{"x":4,"y":2,"key":"SD"},{"x":5,"y":2,"key":"MN"},{"x":6,"y":2,"key":"WI"},{"x":7,"y":2,"key":"MI"},{"x":9,"y":2,"key":"NY"},{"x":10,"y":2,"key":"CT"},{"x":11,"y":2,"key":"RI"},{"x":1,"y":3,"key":"OR"},{"x":2,"y":3,"key":"ID"},{"x":3,"y":3,"key":"WY"},{"x":4,"y":3,"key":"NE"},{"x":5,"y":3,"key":"IA"},{"x":6,"y":3,"key":"IL"},{"x":7,"y":3,"key":"IN"},{"x":8,"y":3,"key":"OH"},{"x":9,"y":3,"key":"PA"},{"x":10,"y":3,"key":"NJ"},{"x":0,"y":4,"key":"CA"},{"x":1,"y":4,"key":"NV"},{"x":2,"y":4,"key":"UT"},{"x":3,"y":4,"key":"CO"},{"x":4,"y":4,"key":"KS"},{"x":5,"y":4,"key":"MO"},{"x":6,"y":4,"key":"KY"},{"x":7,"y":4,"key":"WV"},{"x":8,"y":4,"key":"DC"},{"x":9,"y":4,"key":"MD"},{"x":10,"y":4,"key":"DE"},{"x":2,"y":5,"key":"AZ"},{"x":3,"y":5,"key":"NM"},{"x":4,"y":5,"key":"OK"},{"x":5,"y":5,"key":"AR"},{"x":6,"y":5,"key":"TN"},{"x":7,"y":5,"key":"VA"},{"x":8,"y":5,"key":"NC"},{"x":3,"y":6,"key":"TX"},{"x":4,"y":6,"key":"LA"},{"x":5,"y":6,"key":"MS"},{"x":6,"y":6,"key":"AL"},{"x":7,"y":6,"key":"GA"},{"x":8,"y":6,"key":"SC"},{"x":0,"y":7,"key":"HI"},{"x":7,"y":7,"key":"FL"}];
function usMap(){
  return '<div class="usmap" role="group" aria-label="Choose your state">'+GRID.map(function(t){
    return '<button style="grid-column:'+(t.x+1)+';grid-row:'+(t.y+1)+'" class="'+(t.key===S.state?'sel':'')+'" data-state="'+t.key+'" title="'+t.key+'" aria-label="'+t.key+'">'+t.key+'</button>';
  }).join("")+'</div>';
}
var ICONS={
  car:'<path d="M5 16.5V12l2.4-5h9.2L19 12v4.5"/><path d="M5 12h14"/><circle cx="7.5" cy="17" r="1.6"/><circle cx="16.5" cy="17" r="1.6"/><path d="M9.1 17h5.8"/>',
  home:'<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5.5h4V20"/>',
  key:'<circle cx="8" cy="15" r="3.6"/><path d="M10.6 12.4 20 3M17.2 5.8l2.4 2.4M14.4 8.6l2 2"/>',
  boat:'<path d="M3 15h18l-3 4.5H6z"/><path d="M12 15V3.5"/><path d="M12 5.5 18.5 13H12"/>',
  heart:'<path d="M12 20s-7.5-4.6-7.5-10.2A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7.5 2.2C19.5 15.4 12 20 12 20z"/>',
  umbrella:'<path d="M3 12.5a9 9 0 0 1 18 0H3z"/><path d="M12 12.5v5.5a2 2 0 0 0 4 0M12 3.5v1"/>'
};
// The "cacophony": a household's policies, drawn as they usually live, scattered and never lined up.
var CACO=[["car",-11,2],["home",7,-5],["key",-6,6],["boat",12,-2],["heart",-9,4],["umbrella",5,-6]];
function cacophony(){
  return '<div class="caco" aria-hidden="true">'+CACO.map(function(c){
    return '<span style="transform:rotate('+c[1]+'deg) translateY('+c[2]+'px)"><svg viewBox="0 0 24 24">'+ICONS[c[0]]+'</svg></span>';
  }).join("")+'</div>';
}
var BASE=["home","tenure","dep","veh","toys","qualify","insight"];
var EXTRAS=["Boat","Jet ski","RV","Motorcycle","ATV","E-bike"];
var WATERCRAFT=["Boat","Jet ski"];
var TAGNAME={over:"Overspending",under:"Underprotected",twice:"Paying twice",ok:"Looks right",info:"Worth knowing"};
var LIAB_OPTS=[[25,"25/50/25"],[50,"50/100/50"],[100,"100/300/100"],[250,"250/500/250"]];
var HOMELIAB_OPTS=[[100,"$100,000"],[300,"$300,000"],[500,"$500,000"],[1000,"$1,000,000"]];

var QUAL=[
 {id:"health",q:"Do you have health insurance, through work or elsewhere?"},
 {id:"cushion",q:"Do you have $2,500 in savings you could spend today if you had to?"},
 {id:"assets300",unsure:true,q:function(){
   return S.a.home==="Rent"
     ? "Do you have more than $300,000 in the bank, in retirement accounts, or in other savings?"
     : "If you sold your home today and added up your savings, would that come to more than $300,000?";
 }},
 {id:"roadsideAlt",q:"Do you have an auto club membership (like AAA) or a credit card that includes free roadside help (like Chase Sapphire Reserve)?"}
];

var POLICY={
 auto:{name:"Auto",premiumDefault:1742,
  fields:[
   {key:"liability",label:"Liability limits",type:"select",opts:LIAB_OPTS,def:50},
   {key:"umuim",label:"Uninsured/underinsured motorist",type:"select",opts:LIAB_OPTS,def:50},
   {key:"medpay",label:"Medical payments limit",type:"money",def:5000},
   {key:"collDed",label:"Collision deductible",type:"select",opts:[[250,"$250"],[500,"$500"],[1000,"$1,000"],[2500,"$2,500"]],def:500},
   {key:"roadside",label:"Roadside assistance on this policy",type:"yesno",def:"Yes"},
   {key:"premium",label:"Annual premium",type:"money",def:1742}
  ],
  findings:function(v,q){
   var out=[];
   if(v.roadside==="Yes"&&q.roadsideAlt==="Yes") out.push({t:"twice",msg:"Roadside help is covered twice: on this policy and through your club or card. Dropping it here typically saves $25-$40 a year."});
   var st=S.state,sn=stateName(st);
   if(v.medpay>0&&q.health==="Yes"){
     if(NOFAULT.indexOf(st)>-1){
       var pm=PIP_MIN[st];
       out.push(cite({t:"info",msg:sn+" is a no-fault state, so injury coverage on your auto policy is required and can't be dropped."+(pm?" The required minimum is "+pm[0]+".":st==="MI"?" Michigan lets you choose a level; unlimited is the default if you never chose.":"")+" Ask your insurer about coordinating it with your health plan so it pays second, which usually lowers the price."},pm?pm[1]:st==="MI"?"miPip":"nofault"));
     } else out.push(cite({t:"twice",msg:"Your health plan already pays for injuries from a crash. This "+money(v.medpay)+" limit largely repeats it."},"medpay"));
   }
   if(v.umuim<v.liability){
     var lab=function(n){return LIAB_OPTS.find(function(o){return o[0]===n})[1]};
     out.push(cite({t:"under",msg:"Your uninsured motorist limit ("+lab(v.umuim)+") is lower than the liability you carry for others ("+lab(v.liability)+"). This is the coverage that pays for your own injuries when the other driver has no insurance, and in 2023 more than one in seven drivers didn't."+(UM_MANDATORY_STATES.indexOf(st)>-1?" "+sn+" requires the coverage but lets you pick the amount.":"")+" Matching it to your liability limit is usually inexpensive."},"uninsured"));
   }
   if(v.collDed<=500&&q.cushion==="Yes") out.push({t:"over",msg:"A $"+v.collDed.toLocaleString()+" deductible is low given the savings you have on hand. Raising it to $1,000 typically saves $80-$100 a year."});
   if(v.liability<=50&&q.assets300==="Yes") out.push({t:"under",msg:"Your "+LIAB_OPTS.find(function(o){return o[0]===v.liability})[1]+" limits leave what you own above that exposed in a serious crash."});
   return out;
  }},
 home:{name:"Home",premiumDefault:1850,
  fields:[
   {key:"dwelling",label:"Dwelling coverage",type:"money",def:450000},
   {key:"contents",label:"Personal property / contents",type:"money",def:225000},
   {key:"liability",label:"Liability limit",type:"select",opts:HOMELIAB_OPTS,def:300},
   {key:"deductible",label:"Deductible",type:"select",opts:[[500,"$500"],[1000,"$1,000"],[2500,"$2,500"],[5000,"$5,000"]],def:2500},
   {key:"waterBackup",label:"Water / sewer backup endorsement",type:"yesno",def:"No"},
   {key:"windDed",label:"Hurricane or windstorm deductible (percent of dwelling coverage)",type:"percent",def:2,show:function(){return WINDSTATES.indexOf(S.state)>-1}},
   {key:"lastResort",label:"Is this through your state's last-resort plan (FAIR Plan, Citizens, or TWIA)?",type:"yesno",def:"No",show:function(){return LASTRESORT_STATES.indexOf(S.state)>-1}},
   {key:"eq",label:"Earthquake coverage (separate policy or added on)",type:"yesno",def:"No",show:function(){return EQ_STATES.indexOf(S.state)>-1}},
   {key:"eqDed",label:"Earthquake deductible (percent of dwelling coverage)",type:"percent",def:15,show:function(){return EQ_STATES.indexOf(S.state)>-1&&S.p.home&&S.p.home.eq==="Yes"}},
   {key:"premium",label:"Annual premium",type:"money",def:1850}
  ],
  findings:function(v,q){
   var out=[];
   if(v.deductible<=1000&&q.cushion==="Yes") out.push({t:"over",msg:"Your $"+v.deductible.toLocaleString()+" home deductible is low relative to your savings. A higher deductible usually lowers the premium more than the risk costs you."});
   if(v.liability<=300&&q.assets300==="Yes") out.push({t:"under",msg:"Your home liability limit is on the low end for what you have to protect."});
   if(v.waterBackup==="No") out.push({t:"under",msg:"Water and sewer backup is excluded from most standard home policies and is one of the most common claims."});
   var st=S.state,sn=stateName(st);
   if(WINDSTATES.indexOf(st)>-1&&v.windDed>0&&v.dwelling>0){
     var wd=v.dwelling*v.windDed/100;
     var base="In "+sn+", hurricane and windstorm deductibles are a percentage of your dwelling coverage, not a flat amount. Your "+v.windDed+"% on "+money(v.dwelling)+" means the first "+money(wd)+" of a storm claim comes out of your pocket.";
     if(q.cushion==="No"&&wd>2500) out.push(cite({t:"under",msg:base+" You said $2,500 isn't sitting in savings right now, so that's a real gap on the day it matters."},st==="FL"?"windFL":"wind"));
     else out.push(cite({t:"info",msg:base+(st==="FL"?" Florida insurers must offer 2%, 5%, and 10% options, so you can choose the trade-off.":"")},st==="FL"?"windFL":"wind"));
   }
   if(EQ_STATES.indexOf(st)>-1&&v.dwelling>0){
     if(v.eq==="Yes"&&v.eqDed>0){
       var ed=v.dwelling*v.eqDed/100;
       out.push(cite({t:"info",msg:"Your "+v.eqDed+"% earthquake deductible on "+money(v.dwelling)+" of dwelling coverage is "+money(ed)+"."+(st==="CA"?" With a CEA policy that amount is subtracted from the claim payment; you don't have to pay it up front.":"")},st==="CA"?"ceaDedTip":"eqExcluded"));
     } else if(st==="CA"){
       out.push(cite({t:"under",msg:"Earthquake damage is excluded from your home policy, and California law requires your insurer to offer it. A CEA policy on your "+money(v.dwelling)+" of dwelling coverage would carry a deductible of 5% to 25%, that's "+money(v.dwelling*0.05)+" to "+money(v.dwelling*0.25)+" subtracted from a claim. Without it, the full rebuild is on you."},"ceaDed"));
     } else if(NEWMADRID_STATES.indexOf(st)>-1){
       out.push(cite({t:"info",msg:"Earthquake damage is excluded from a standard home policy, and "+sn+" sits on the New Madrid seismic zone. Without separate coverage, rebuilding your "+money(v.dwelling)+" home after a quake would be entirely out of pocket."+(st==="MO"?" In Missouri's most exposed counties, only about 1 home in 10 is now covered.":"")+" Whether it's worth it depends on where in the state you are."},st==="MO"?"moTakeup":"newMadrid"));
     } else {
       out.push(cite({t:"info",msg:"Earthquake damage is excluded from a standard home policy, and "+sn+" is one of 16 states USGS rates as having a relatively high chance of damaging shaking. This says nothing about your specific home; it's just worth knowing that your "+money(v.dwelling)+" of dwelling coverage doesn't apply to a quake."},"eqStates"));
     }
   }
   if(v.lastResort==="Yes"){
     if(st==="CA") out.push(cite({t:"under",msg:"The California FAIR Plan covers fire only. Unless you also carry a separate 'difference in conditions' policy, you have no liability, theft, or water-damage coverage on this home, whatever the liability limit above says."},"caFair"));
     else if(st==="FL"&&v.dwelling>=700000) out.push(cite({t:"under",msg:"Citizens won't insure homes with a replacement cost of $700,000 or more outside Miami-Dade and Monroe, and yours is listed at "+money(v.dwelling)+". Expect a non-renewal and plan for the private market now."},"flCitizens"));
     else if(st==="FL") out.push(cite({t:"info",msg:"Citizens drops homes whose replacement cost reaches $700,000 (outside Miami-Dade and Monroe). Yours is at "+money(v.dwelling)+", so watch the inflation adjustment at each renewal."},"flCitizens"));
     else if(st==="TX") out.push(cite({t:"under",msg:"TWIA covers wind and hail only, by law. Fire, theft, and everything else need a separate policy, and flood needs its own. If this is your only home policy, most of your dwelling coverage isn't there."},"twia"));
     else if(st==="LA") out.push(cite({t:"info",msg:"Louisiana Citizens doesn't cover flood, and won't pay living expenses if a flood makes your home unlivable. Flood coverage is a separate policy."},"laCitizens"));
     else out.push(cite({t:"info",msg:sn+"'s last-resort plan usually costs more and covers less than a standard policy. It's worth re-shopping the private market each year to see if you can get out."},"lastResort"));
   }
   return out;
  }},
 renters:{name:"Renters",premiumDefault:180,
  fields:[
   {key:"liability",label:"Liability limit",type:"select",opts:[[50,"$50,000"],[100,"$100,000"],[300,"$300,000"]],def:50},
   {key:"belongings",label:"Belongings limit",type:"money",def:20000},
   {key:"deductible",label:"Deductible",type:"money",def:500},
   {key:"namedInsured",label:"Named insured",type:"select",opts:[["me","You"],["other","Someone else you pay for"]],def:"me"},
   {key:"premium",label:"Annual premium",type:"money",def:180}
  ],
  findings:function(v,q){
   var out=[];
   if(v.namedInsured==="other") out.push({t:"under",msg:"When the policy is in someone else's name but you pay for it, it often lives under a separate account. A cancelled predecessor can look like a lapse from your side."});
   if(v.belongings<15000) out.push({t:"under",msg:"This limit may be set to a generic renter's baseline rather than what would actually need replacing."});
   if(v.liability<=50&&q.assets300==="Yes") out.push({t:"under",msg:"This is the lowest liability limit typically available. Worth a look given what else you own."});
   return out;
  }},
 powersports:{name:"Boat and powersports",premiumDefault:0,
  fields:[
   {key:"covered",label:"Do these have their own policy, separate from your auto and home?",type:"yesno",def:"No"},
   {key:"value",label:"What they would cost to replace today, all together",type:"money",def:15000},
   {key:"liability",label:"Liability limit on that policy",type:"money",def:100000,show:function(){return S.p.powersports&&S.p.powersports.covered==="Yes"}},
   {key:"hullType",label:"How the boat or jet ski is valued",type:"select",opts:[["acv","Actual cash value"],["agreed","Agreed value"],["unsure","Not sure"]],def:"unsure",show:function(){return S.p.powersports&&S.p.powersports.covered==="Yes"&&S.extras.some(function(x){return WATERCRAFT.indexOf(x)>-1})}},
   {key:"premium",label:"Annual premium",type:"money",def:0,show:function(){return S.p.powersports&&S.p.powersports.covered==="Yes"}}
  ],
  findings:function(v,q){
   var out=[],st=S.state,sn=stateName(st),x=S.extras;
   var water=x.some(function(t){return WATERCRAFT.indexOf(t)>-1}),moto=x.indexOf("Motorcycle")>-1,rv=x.indexOf("RV")>-1,ebike=x.indexOf("E-bike")>-1;
   var mandate=BOAT_MANDATE_STATES[st];
   if(water&&v.covered==="No"){
     if(mandate) out.push(cite({t:"under",msg:sn+" requires "+mandate.text+", and you said yours isn't separately insured."},mandate.src));
     if(v.value>1000) out.push(cite({t:"under",msg:"A home policy typically pays only about $1,000 for damage to a boat, and gives no liability coverage for a jet ski or a motor above about 25 horsepower. You said yours would cost "+money(v.value)+" to replace, so roughly "+money(v.value-1000)+" of that is uninsured."},"boatHome"));
   }
   if(water&&v.covered==="Yes"){
     if(mandate&&v.liability<mandate.min) out.push(cite({t:"under",msg:"Your "+money(v.liability)+" liability limit is below what "+sn+" requires: "+mandate.text+"."},mandate.src));
     if(v.hullType==="acv") out.push(cite({t:"info",msg:"Actual cash value pays replacement cost minus depreciation; agreed value pays the amount you and the insurer set in advance. On a total loss of a "+money(v.value)+" boat, that difference is the depreciation."},"boatIII"));
     if(v.hullType==="unsure") out.push(cite({t:"info",msg:"Check whether the policy pays actual cash value or agreed value. Actual cash value subtracts depreciation from a total-loss payout; agreed value doesn't."},"boatIII"));
   }
   if(moto&&v.covered==="No"){
     if(st==="FL") out.push(cite({t:"info",msg:"Florida is the one state that doesn't require liability insurance on a motorcycle. Nothing on an auto or home policy pays if you hurt someone while riding, though, so it's a real choice rather than a default."},"moto"));
     else out.push(cite({t:"under",msg:"Every state except Florida requires liability insurance on a motorcycle, and you said yours isn't separately insured. An auto or home policy doesn't cover it on the road."},"moto"));
   }
   if(rv&&v.covered==="No") out.push(cite({t:"info",msg:"A motorhome needs its own liability policy that meets "+sn+"'s auto minimums. A towable trailer is usually covered for damage it causes by your tow vehicle's policy, but not for damage to the trailer itself."},"rv"));
   if(ebike&&v.covered==="No") out.push(cite({t:"info",msg:"A home or renters policy may cover an e-bike while it's at home, but often not while you're riding it, and usually with a low cap. Whether a separate policy makes sense depends on what yours is worth."},"ebike"));
   return out;
  }},
 life:{name:"Life",premiumDefault:0,
  fields:[
   {key:"faceAmount",label:"Face amount",type:"money",def:250000},
   {key:"source",label:"Source",type:"select",opts:[["employer","Through work"],["personal","Personal policy"],["both","Both"]],def:"employer"},
   {key:"term",label:"Type",type:"select",opts:[["term","Term"],["whole","Whole/permanent"]],def:"term"},
   {key:"premium",label:"Annual premium",type:"money",def:0}
  ],
  findings:function(v,q){
   var out=[];
   if(v.source==="employer") out.push({t:"under",msg:"You said someone relies on your income, and this is employer-only. That kind of coverage usually ends the day the job does, and rarely transfers automatically to a new employer."});
   if(v.faceAmount<500000) out.push({t:"under",msg:"You said someone relies on your income. A common starting point is 10x income; this is worth comparing against your household's actual number."});
   return out;
  }},
 disability:{name:"Disability",premiumDefault:0,
  fields:[
   {key:"hasLTD",label:"Long-term disability coverage",type:"yesno",def:"Yes"},
   {key:"percent",label:"Percent of income replaced",type:"percent",def:60},
   {key:"monthlyCap",label:"Monthly benefit cap",type:"money",def:6000},
   {key:"premium",label:"Annual premium",type:"money",def:0}
  ],
  findings:function(v,q){
   var out=[];
   var di=STATE_DI[S.state],sn=stateName(S.state);
   if(v.hasLTD==="No"&&di) out.push(cite({t:"under",msg:"You said someone relies on your income, and there's no long-term disability coverage. "+sn+"'s "+di.name+" would pay "+(di.amt?di.amt+" for ":"for ")+di.dur+", and then stop. A disability that lasts longer than that is exactly what long-term coverage is for."},di.src));
   else if(v.hasLTD==="No") out.push({t:"under",msg:"You said someone relies on your income, and there's no long-term disability coverage on file. If you couldn't work for a year, nothing here replaces that income."});
   else if(di) out.push(cite({t:"info",msg:sn+"'s "+di.name+" covers the first stretch of a disability ("+di.dur+"). Check that your long-term policy's waiting period isn't longer than that, or there's a gap in the middle where neither pays."},"ltdGap"));
   if(v.hasLTD==="Yes"&&v.percent<60) out.push({t:"under",msg:"You said someone relies on your income. This replaces less than the typical 60% most long-term disability plans target."});
   return out;
  }},
 lifecheck:{name:"Life insurance",premiumDefault:0,
  fields:[
   {key:"hasLife",label:"Do you currently have any life insurance?",type:"yesno",def:"No"},
   {key:"premium",label:"Annual premium",type:"money",def:0}
  ],
  findings:function(v,q){
   var out=[];
   if(v.hasLife==="Yes"&&v.premium>0) out.push({t:"over",msg:"You said no one relies on your income. $"+v.premium.toLocaleString()+" a year in life insurance may be covering a need you no longer have, worth a second look before the next renewal."});
   else if(v.hasLife==="Yes") out.push({t:"info",msg:"You said no one relies on your income but still carry a policy. Whether to keep it is a personal call, not a coverage gap."});
   return out;
  }}
};

// S.o holds the overlap answers (question id -> option id, or an array of option ids for a tick-many question); see js/overlap-ui/.
var S={state:"",a:{},extras:[],i:0,q:{},p:{},o:{},scanned:{},queue:null,taps:0,times:[],t0:Date.now(),start:Date.now()};
var stage=document.getElementById("stage"),bar=document.getElementById("bar");
// Anonymous answer counting (Story S15). With the default provider, "none", this adds nothing to the page and sends nothing.
// Only overlap answers, the flags shown and Copy / Print reach it; never the state, a policy-screen field or a typed number.
var analytics=startAnalytics({window:window,document:document},ANALYTICS_CONFIG);

function buildQueue(){
  var q=[],iq=[],a=S.a;
  if(a.veh&&a.veh!=="0") q.push("auto");
  if(a.home==="Own"||a.home==="Both") q.push("home");
  if(a.home==="Rent"||a.home==="Both") q.push("renters");
  if(S.extras.length) q.push("powersports");
  if(a.dep==="Yes"){iq.push("life");iq.push("disability")}
  else if(a.dep==="No"){iq.push("lifecheck")}
  S.queue=q; S.incomeQueue=iq;
}
function allPolicies(){ return S.queue.concat(S.incomeQueue) }
// A plain copy of the host state the overlap view-models read (never the state picker; see engine/adapter.mjs).
function snapshot(){ return JSON.parse(JSON.stringify({a:S.a,extras:S.extras,q:S.q,p:S.p,o:S.o})) }
// The overlap question screens ("ovl:<section>"). The view-model's trailing "actions" id is not a screen of its own:
// the action list is part of the summary (DECISIONS S13-5).
function overlapIds(){ return overlapScreenIds(snapshot()).filter(function(x){return x!==ACTIONS_SCREEN_ID}) }
function order(){
  buildQueue();
  return BASE.concat(S.queue.map(function(x){return "p:"+x}),["umbrella"],S.incomeQueue.map(function(x){return "p:"+x}),overlapIds(),["summary"]);
}
function screenLabel(id){
  if(id.indexOf("p:")===0) return POLICY[id.slice(2)].name;
  if(id.indexOf("ovl:")===0) return overlapScreenLabel(id);
  return {home:"Welcome",tenure:"Own or rent",dep:"Income",veh:"Vehicles",toys:"Anything else with a motor",insight:"First look",qualify:"A few quick checks",umbrella:"Umbrella",summary:"Summary"}[id];
}
function fieldVal(pid,f){ if(S.p[pid]===undefined) S.p[pid]={}; if(S.p[pid][f.key]===undefined) S.p[pid][f.key]=f.def; return S.p[pid][f.key]; }
function visibleFields(pid){ return POLICY[pid].fields.filter(function(f){return !f.show||f.show()}) }
function pValues(pid){
  var out={}; visibleFields(pid).forEach(function(f){out[f.key]=fieldVal(pid,f)}); return out;
}

function go(n){ var from=order()[S.i]; S.times.push({s:screenLabel(from),t:(Date.now()-S.t0)/1000}); S.t0=Date.now(); S.i=n; render(); overlapFocus(from); }
// Keyboard and screen reader users land on the heading of an overlap screen (and of the summary when they arrive from one).
function overlapFocus(from){ var id=order()[S.i]; if(sectionIdOf(id)!==null||(id==="summary"&&sectionIdOf(from)!==null)) focusHeading(stage) }
// The umbrella and the limits under it (Story S14): drawn on the screens that ask for them and in the action list.
// Built from the engine's liability stack only; null (nothing drawn) when no umbrella is held.
function stackFor(id){
  try{ return stackViewModel(stackForScreen(snapshot(),id)) }
  catch(err){ console.error("Could not build the umbrella and limits drawing",err); return null }
}
function actionListSection(){
  var stk=null;
  try{ stk=stackViewModel(liabilityStackModel(snapshot())) }
  catch(err){ console.error("Could not build the umbrella and limits drawing",err) }
  try{
    var vm=actionListViewModel(snapshot());
    flagIdsOf(vm).forEach(function(id){analytics.emit("flag_shown",{flagId:id})});
    return actionListHtml(vm,analytics.counting,stk);
  }
  catch(err){ console.error("Could not build the insurer action list",err); return actionListErrorHtml(analytics.counting) }
}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function opts(key,list,hint){
  return '<div class="opts">'+list.map(function(o){
    return '<button class="opt'+(S.a[key]===o?' sel':'')+'" data-q="'+key+'" data-v="'+o+'">'+o+(hint&&hint[o]?'<small>'+hint[o]+'</small>':'')+'</button>';
  }).join("")+'</div>';
}
function back(){return S.i>0?'<button class="link" data-act="back">Back</button>':'<span></span>'}

function insightsList(){
  var a=S.a,out=[];
  if(a.home==="Own"||a.home==="Both"){
    if(S.q.cushion==="Yes") out.push({t:"over",msg:"You can cover a $2,500 surprise, so you can probably afford to raise your deductible. Most people never do: only 31% review their insurance every year, and nearly half only look after a price hike, or never.",src:"Big “I” / Trusted Choice survey",url:"https://www.independentagent.com/news/only-3-in-10-americans-review-insurance-annually-often-waiting-until-problems-arise/"});
    else out.push({t:"ok",msg:"Deductibles are commonly set once at purchase and rarely revisited: only 31% of Americans review any insurance annually. Since you said $2,500 isn't sitting in savings right now, a low deductible is probably right for you.",src:"Big “I” / Trusted Choice survey",url:"https://www.independentagent.com/news/only-3-in-10-americans-review-insurance-annually-often-waiting-until-problems-arise/"});
    out.push({t:"info",msg:"Standard homeowners policies exclude flood damage everywhere, regardless of whether your home is in a mapped flood zone. Coverage takes a separate policy, through the National Flood Insurance Program or a private insurer. This isn't a claim about your risk, just how the policy is written.",src:"FEMA",url:"https://www.fema.gov/flood-insurance"});
    out.push({t:"info",msg:"Water and sewer backup is excluded from standard homeowners policies by default. It typically takes its own endorsement, costing $30-$70 a year. We'll help you check whether yours already has it.",src:"Policygenius",url:"https://www.policygenius.com/homeowners-insurance/what-is-water-backup-coverage/"});
  }
  if(a.home==="Rent"||a.home==="Both"){
    out.push({t:"info",msg:"A landlord's policy protects the building. It does not cover a tenant's belongings or personal liability, whatever your own renters policy looks like.",src:"National Association of Insurance Commissioners",url:"https://content.naic.org/article/consumer-insight-renting-your-home-protect-your-belongings-renters-insurance"});
  }
  if(a.dep==="Yes"){
    out.push({t:"info",msg:"If your life insurance is only through an employer, it typically ends, or must be converted at a higher cost, the day the job does. Whether that applies to you depends on which kind you have, and we'll ask you that in a minute.",src:"Life Happens",url:"https://lifehappens.org/blog/4-things-you-probably-dont-know-about-your-life-insurance-at-work/"});
  }
  if(a.dep==="No"){
    out.push({t:"info",msg:"51% of American adults hold some form of life insurance, and ownership is closely tied to having dependents who rely on your income. This is general context, not a claim about what you currently hold.",src:"LIMRA 2025 Insurance Barometer Study",url:"https://www.limra.com/siteassets/newsroom/liam/2025/2025_facts_about_life_insurance.pdf"});
  }
  if(a.veh&&a.veh!=="0"){
    if(S.q.health==="Yes"&&NOFAULT.indexOf(S.state)>-1) out.push({t:"info",msg:"You have health insurance, and "+stateName(S.state)+" requires injury coverage on every auto policy, so you can't drop it. What you can do is ask your insurer to coordinate it with your health plan so it pays second, which usually lowers the price. We'll check that in a minute."});
    else if(S.q.health==="Yes") out.push({t:"twice",msg:"You have health insurance, so this likely applies to you: auto medical payments coverage can pay for the same injury your health plan already covers. A September 2026 Massachusetts appeals court case addressed insurers preventing exactly that kind of duplicate payment.",src:"Insurance Journal",url:"https://www.insurancejournal.com/news/east/2026/09/15/885119.htm"});
    else out.push({t:"ok",msg:"Auto medical payments coverage can duplicate a health plan for drivers who have one. Since you said you don't, yours is likely doing real work rather than overlapping anything.",src:"Insurance Journal",url:"https://www.insurancejournal.com/news/east/2026/09/15/885119.htm"});
    if(S.q.roadsideAlt==="Yes") out.push({t:"twice",msg:"You already have roadside help through a club or card. If your auto policy also covers it, you're paying for the same tow twice. We'll help you check that in a minute."});
  }
  if(S.extras.some(function(x){return WATERCRAFT.indexOf(x)>-1})){
    out.push(cite({t:"info",msg:"You told us you have a boat or jet ski. Most states don't require boat insurance the way they require auto insurance (Arkansas and Utah do, for jet skis and larger motorboats), and a homeowners policy typically pays only about $1,000 for a boat with no liability coverage for a jet ski. Whether that leaves a real gap depends on what you're actually carrying."},"boatHome"));
  }
  if(S.extras.indexOf("E-bike")>-1){
    out.push({t:"info",msg:"You told us you have an e-bike. Some states classify a higher-powered one as a moped or motorcycle, which can require its own policy, and even where that doesn't apply, homeowners and renters coverage for e-bike theft or damage is inconsistent and often capped low.",src:"Policygenius",url:"https://www.policygenius.com/homeowners-insurance/does-homeowners-insurance-cover-bikes/"});
  }
  var RANK={twice:0,over:0,under:0,ok:1,info:2};
  out.sort(function(a,b){return RANK[a.t]-RANK[b.t]});
  return out;
}

function findingRow(x){
  return '<div class="item"><span><span class="tag '+x.t+'">'+TAGNAME[x.t]+'</span></span><span>'+esc(x.msg)+(x.src?' <a class="src" href="'+x.url+'" target="_blank" rel="noopener">'+esc(x.src)+'</a>':'')+'</span></div>';
}
function money(n){return "$"+Math.round(n).toLocaleString()}
function fieldRow(pid,f){
  var v=fieldVal(pid,f),id="f_"+pid+"_"+f.key;
  if(f.type==="select"){
    return '<div class="field"><label for="'+id+'">'+f.label+'</label><select id="'+id+'" data-p="'+pid+'" data-k="'+f.key+'">'+
      f.opts.map(function(o){return '<option value="'+o[0]+'"'+(String(o[0])===String(v)?' selected':'')+'>'+o[1]+'</option>'}).join("")+'</select></div>';
  }
  if(f.type==="yesno"){
    return '<div class="field"><label>'+f.label+'</label><div class="toggle">'+["Yes","No"].map(function(o){return '<button class="'+(v===o?'sel':'')+'" data-p="'+pid+'" data-k="'+f.key+'" data-v="'+o+'">'+o+'</button>'}).join("")+'</div></div>';
  }
  var pct=f.type==="percent";
  return '<div class="field"><label for="'+id+'">'+f.label+'</label><div class="amt'+(pct?' pct':'')+'"><span>'+(pct?'%':'$')+'</span><input id="'+id+'" type="number" inputmode="numeric" min="0" '+(pct?'max="100" ':'')+'step="1" value="'+v+'" data-p="'+pid+'" data-k="'+f.key+'"></div></div>';
}
function listWords(a){ return a.length<2?a.join(""):a.slice(0,-1).join(", ")+(a.length>2?",":"")+" and "+a[a.length-1] }
function policyReason(pid){
  var n=S.a.veh==="1"?"1 vehicle":S.a.veh+" vehicles";
  return {
    auto:"You told us you have "+n+", so here's what we need for your auto policy.",
    home:"You told us you own your home, so here's what we need for your home policy.",
    renters:"You told us you rent, so here's what we need for your renters policy.",
    powersports:"You told us you have "+listWords(S.extras.map(function(x){var w=x.toLowerCase();return (/^[aeiou]/.test(w)||w==="rv"?"an ":"a ")+w}))+", so here's what we need to check how "+(S.extras.length===1?"it's":"they're")+" covered.",
    life:"You told us someone relies on your income, so here's what we need for your life insurance.",
    disability:"You told us someone relies on your income, so here's what we need for your disability coverage.",
    lifecheck:"You told us no one relies on your income, so we're just checking whether you're still paying for life insurance you may not need."
  }[pid];
}
function policyScreen(pid){
  var pol=POLICY[pid],v=pValues(pid),finds=pol.findings(v,S.q);
  var ap=allPolicies();
  var h='<h3 class="pt">Policy '+((ap.indexOf(pid))+1)+' of '+ap.length+'</h3>'+
    '<h2>'+pol.name+' policy</h2><p class="sub">'+esc(policyReason(pid))+'</p>'+
    '<div class="policy-grid"><div class="fields">'+visibleFields(pid).map(function(f){return fieldRow(pid,f)}).join("")+'</div>'+
    '<div class="scanbox">'+
      '<label class="ghost" for="cam_'+pid+'" tabindex="0">Take a photo</label><input id="cam_'+pid+'" class="scanfile" type="file" accept="image/*" capture="environment" data-p="'+pid+'" hidden>'+
      '<label class="ghost" for="doc_'+pid+'" tabindex="0">Choose a file</label><input id="doc_'+pid+'" class="scanfile" type="file" accept="image/*,.pdf" data-p="'+pid+'" hidden>'+
      (S.scanned[pid]?'<p class="scanned">"'+esc(S.scanned[pid])+'" added.</p><p class="small">This prototype does not read it yet, so the fields stay as you left them. Nothing is uploaded either way, reading would happen right here on the page.</p>'
        :'<p class="small">Nothing is uploaded either way. Reading would happen right here on the page.</p>')+
    '</div></div>'+
    (finds.length?'<div><h3 class="pt">Worth a look</h3><div class="list">'+finds.map(findingRow).join("")+'</div></div>'
      :'<div class="item" style="border:none;padding:0"><span><span class="tag ok">Looks right</span></span><span>Nothing stands out on this policy given what you have told us.</span></div>')+
    '<div class="row spread foot">'+back()+'<button class="primary" data-act="next">Continue</button></div>';
  return h;
}

function render(){
  var id=order()[S.i],h="";
  bar.style.width=(S.i/(order().length-1)*100)+"%";
  if(id==="home"){
    h=cacophony()+
      '<h1>Your insurance has never been looked at as a whole. We built the thing that does.</h1>'+
      '<p class="sub">No name, no email, no sales call. Just your own numbers, put together for once.</p>'+
      '<h2>Which state are you in?</h2>'+
      usMap()+
      '<p><label class="link" for="st">Or pick from a list</label> <select id="st" aria-label="State"><option value=""'+(S.state===""?' selected':'')+'>Choose a state…</option>'+STATES_BY_NAME.map(function(s){return '<option value="'+s+'"'+(s===S.state?' selected':'')+'>'+STATE_NAMES[s]+'</option>'}).join("")+'</select></p>'+
      entryNoteHtml(analytics.counting)+
      '<div class="row spread foot">'+back()+'<button class="primary" data-act="next"'+(S.state?'':' disabled')+'>Get started</button></div>';
  }
  if(id==="tenure"){
    h='<h2>Do you own or rent your home?</h2>'+opts("home",["Own","Rent","Both"])+
      '<div class="row spread foot">'+back()+'</div>';
  }
  if(id==="dep"){
    h='<h2>Does anyone rely on your income?</h2><p class="sub">A partner, kids, a parent. A yes or no is all we need.</p>'+opts("dep",["Yes","No"])+
      '<div class="row spread foot">'+back()+'</div>';
  }
  if(id==="veh"){
    h='<h2>How many vehicles in your household?</h2>'+opts("veh",["0","1","2","3+"],{"2":"Most common"})+
      '<div class="row spread foot">'+back()+'</div>';
  }
  if(id==="toys"){
    h='<h2>Anything else with a motor?</h2><p class="sub">Boat, jet ski, RV, motorcycle. Tap all that apply.</p>'+
      '<div class="chips">'+
        '<button class="chip'+(S.extras.length===0?' sel':'')+'" data-x="__none">None of these</button>'+
        EXTRAS.map(function(x){return '<button class="chip'+(S.extras.indexOf(x)>-1?' sel':'')+'" data-x="'+x+'">'+x+'</button>'}).join("")+
      '</div>'+
      '<div class="row spread foot">'+back()+'<button class="primary" data-act="next">Continue</button></div>';
  }
  if(id==="insight"){
    var ins=insightsList();
    h='<h2>Based on what you told us</h2>'+
      '<div class="list">'+ins.map(findingRow).join("")+'</div>'+
      '<p class="sub">One page turns any of these into an exact dollar amount.</p>'+
      '<div class="row spread foot">'+back()+'<button class="primary" data-act="next">Check my '+POLICY[allPolicies()[0]].name+' policy</button></div>';
  }
  if(id==="qualify"){
    var relevant=QUAL.filter(function(qq){return qq.id!=="roadsideAlt" || (S.a.veh&&S.a.veh!=="0")});
    var done=relevant.every(function(qq){return S.q[qq.id]});
    h='<h2>A few easy ones</h2><p class="sub">These answers help us help you. Once you add a policy, we’ll turn them into real dollar amounts. We only ask these once.</p>'+
      relevant.map(function(qq){var choices=qq.unsure?["Yes","No","Not sure"]:["Yes","No"];var qtext=typeof qq.q==="function"?qq.q():qq.q;return '<div class="qrow"><p>'+qtext+'</p><div class="yn2">'+choices.map(function(o){return '<button class="'+(S.q[qq.id]===o?'sel':'')+'" data-qual="'+qq.id+'" data-v="'+o+'">'+o+'</button>'}).join("")+'</div></div>'}).join("")+
      '<div class="row spread foot">'+back()+'<button class="primary" data-act="next"'+(done?'':' disabled')+'>Continue</button></div>';
  }
  if(id.indexOf("p:")===0){
    h=policyScreen(id.slice(2));
  }
  if(id.indexOf("ovl:")===0){
    h=overlapScreenHtml(overlapSections(snapshot()),id,back(),stackFor(id));
  }
  if(id==="umbrella"){
    var hasAuto=S.p.auto,hasHome=S.p.home;
    var uv=S.p.umbrella||(S.p.umbrella={hasUmbrella:"No",limit:1000000});
    var floorGap=(hasAuto&&hasAuto.liability<=100)||(hasHome&&hasHome.liability<=300);
    h='<h2>Umbrella</h2><p class="sub">No new document needed. This just compares what you already told us about your liability limits and your assets.</p>'+
      '<div class="field"><label>Do you carry an umbrella policy?</label><div class="toggle">'+["Yes","No"].map(function(o){return '<button class="'+(uv.hasUmbrella===o?'sel':'')+'" data-umb="hasUmbrella" data-v="'+o+'">'+o+'</button>'}).join("")+'</div></div>';
    var uf=[];
    if(S.q.assets300==="Not sure"){
      uf.push({t:"info",msg:"You weren't sure whether your savings and home would clear $300,000. Once you are, this screen can say whether an umbrella is worth it."});
    } else {
      if(uv.hasUmbrella==="No"&&S.q.assets300==="Yes") uf.push({t:"under",msg:"You said your savings and home would clear $300,000, and you don't carry an umbrella. Your auto and home liability limits are the only ceiling on a lawsuit, and given what you have, that ceiling looks low."});
      if(uv.hasUmbrella==="Yes"&&floorGap) uf.push({t:"under",msg:"Umbrella policies usually require underlying auto and home liability limits to meet a floor. One of yours looks below that floor, which can mean a gap the umbrella never actually covers."});
      if(uv.hasUmbrella==="No"&&S.q.assets300==="No") uf.push({t:"ok",msg:"You said your savings and home wouldn't clear $300,000. An umbrella usually isn't the priority at that level."});
      if(uv.hasUmbrella==="Yes"&&!floorGap) uf.push({t:"ok",msg:"Your underlying auto and home limits look consistent with a typical umbrella requirement."});
    }
    h+=(uf.length?'<div class="list">'+uf.map(findingRow).join("")+'</div>':'');
    h+='<div class="row spread foot">'+back()+'<button class="primary" data-act="next">Continue</button></div>';
  }
  if(id==="summary"){
    var over=0,twice=0,under=0;
    allPolicies().forEach(function(pid){POLICY[pid].findings(pValues(pid),S.q).forEach(function(r){if(r.t==="over")over++;if(r.t==="twice")twice++;if(r.t==="under")under++})});
    var uv=S.p.umbrella;
    if(uv&&S.q.assets300!=="Not sure"){ if(uv.hasUmbrella==="No"&&S.q.assets300==="Yes") under++; if(uv.hasUmbrella==="Yes"&&((S.p.auto&&S.p.auto.liability<=100)||(S.p.home&&S.p.home.liability<=300))) under++; }
    var secs=Math.round((Date.now()-S.start)/1000);
    var ap=allPolicies();
    h='<h2 tabindex="-1" data-focus>Your coverage, checked</h2>'+
      '<div class="totals"><div class="total over"><b>'+over+'</b><span>'+(over===1?'place':'places')+' you may be overspending</span></div>'+
      '<div class="total twice"><b>'+twice+'</b><span>'+(twice===1?'thing':'things')+' likely paid for twice</span></div>'+
      '<div class="total under"><b>'+under+'</b><span>'+(under===1?'gap':'gaps')+' in protection</span></div></div>'+
      '<p>Checked '+ap.length+' '+(ap.length===1?'policy':'policies')+' plus umbrella. '+S.taps+' taps, '+secs+' seconds. We still do not know your name.</p>'+
      '<p class="sub">Add a real declarations page any time to replace these sample numbers with yours.</p>'+
      actionListSection()+
      '<div class="row spread foot"><button class="link" data-act="restart">Start over</button><span></span></div>';
  }
  stage.innerHTML=h; known(); tele();
}
function known(){
  var rows=[["State",S.state],["Home",S.a.home||"?"],["Relies on income",S.a.dep||"?"],["Vehicles",S.a.veh||"?"]];
  if(S.extras.length) rows.push(["Also",S.extras.join(", ")]);
  var ap=allPolicies();
  if(ap.length) rows.push(["Policies checked",ap.filter(function(p){return S.p[p]}).length+" / "+ap.length]);
  var oids=overlapIds();
  if(oids.length&&S.i>=order().indexOf(oids[0])){ var pr=overlapProgress(overlapSections(snapshot())); rows.push(["Overlap questions",pr.answered+" / "+pr.total]) }
  document.getElementById("known").innerHTML=rows.map(function(r){return "<dt>"+r[0]+"</dt><dd>"+esc(r[1])+"</dd>"}).join("");
}
function tele(){
  document.getElementById("tele").innerHTML=S.times.length?S.times.map(function(x){return "<tr><td>"+esc(x.s)+"</td><td>"+x.t.toFixed(1)+"s</td></tr>"}).join(""):"<tr><td>No screens completed yet</td><td></td></tr>";
}
stage.addEventListener("click",function(e){
  var b=e.target.closest("button"); if(!b) return;
  if(b.dataset.state){S.state=b.dataset.state;S.taps++;render();return}
  if(b.dataset.q){S.a[b.dataset.q]=b.dataset.v;S.taps++;
    setTimeout(function(){go(S.i+1)},140); return}
  if(b.dataset.x){
    S.taps++;
    if(b.dataset.x==="__none"){S.extras=[];setTimeout(function(){go(S.i+1)},140);return}
    var k=S.extras.indexOf(b.dataset.x);k>-1?S.extras.splice(k,1):S.extras.push(b.dataset.x);
    render();return}
  if(b.dataset.qual){S.q[b.dataset.qual]=b.dataset.v;S.taps++;render();return}
  if(b.dataset.umb){S.p.umbrella[b.dataset.umb]=b.dataset.v;S.taps++;render();return}
  if(b.dataset.oq){ // overlap question option: update the answers, then the screen (in place when its shape is unchanged)
    var before=S.o;
    S.o=applyAnswer(snapshot(),b.dataset.oq,b.dataset.ov);S.taps++;
    if(becameSelected(before,S.o,b.dataset.oq,b.dataset.ov)) analytics.emit("answer",{questionId:b.dataset.oq,optionId:b.dataset.ov});
    if(patchOverlapScreen(stage,overlapSections(snapshot()),order()[S.i],stackFor(order()[S.i]))) known();
    else{render();restoreFocus(stage,b.dataset.oq,b.dataset.ov)}
    return}
  if(b.dataset.p&&b.dataset.k){ // yesno field toggle button
    if(S.p[b.dataset.p]===undefined)S.p[b.dataset.p]={};
    S.p[b.dataset.p][b.dataset.k]=b.dataset.v;S.taps++;render();return}
  var act=b.dataset.act;
  if(act==="back") go(S.i-1);
  if(act==="next") go(S.i+1);
  if(act==="print"){ analytics.emit("list_printed"); printList(window) }
  if(act==="copy"){
    var st=document.getElementById("al-status"),txt=null;
    try{ txt=actionListText(actionListViewModel(snapshot())) }catch(err){ console.error("Could not build the list to copy",err) }
    if(txt===null){ if(st) st.textContent=COPY_FAILED }
    else copyText(txt,{navigator:navigator,document:document},function(ok){ var el=document.getElementById("al-status"); if(el) el.textContent=ok?COPY_OK:COPY_FAILED; if(ok) analytics.emit("list_copied") });
  }
  if(act==="restart"){analytics.reset();S={state:S.state,a:{},extras:[],i:0,q:{},p:{},o:{},scanned:{},queue:null,taps:0,times:[],t0:Date.now(),start:Date.now()};render()}
});
stage.addEventListener("change",function(e){
  if(e.target.id==="st"){S.state=e.target.value;render()}
  if(e.target.classList&&e.target.classList.contains("scanfile")){
    if(e.target.files&&e.target.files[0]){S.scanned[e.target.dataset.p]=e.target.files[0].name;S.taps++;render()}
    return;
  }
  if(e.target.dataset&&e.target.dataset.p&&e.target.dataset.k){
    var pid=e.target.dataset.p,k=e.target.dataset.k,f=POLICY[pid].fields.find(function(x){return x.key===k});
    var val=e.target.value; if(f.type==="select") val=Number(val); else if(f.type!=="yesno") val=Number(val)||0;
    if(S.p[pid]===undefined)S.p[pid]={}; S.p[pid][k]=val; render();
  }
});
stage.addEventListener("input",function(e){
  if(e.target.tagName==="INPUT"&&e.target.dataset.p){
    var pid=e.target.dataset.p,k=e.target.dataset.k;
    if(S.p[pid]===undefined)S.p[pid]={}; S.p[pid][k]=Number(e.target.value)||0;
  }
});
stage.addEventListener("keydown",function(e){
  if(e.target.tagName==="LABEL"&&e.target.htmlFor&&(e.key==="Enter"||e.key===" ")){
    e.preventDefault();
    var input=document.getElementById(e.target.htmlFor);
    if(input) input.click();
  }
});
render();
})();
