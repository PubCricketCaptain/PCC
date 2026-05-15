// ═══════════════════════════════════════
// PCC SIM RUNNER v2 — faithful extraction
// Run: node sim.js
// Node.js v18+, no npm needed
// ═══════════════════════════════════════
const PITCH_OPTS=[{id:'minefield',label:'Minefield',idx:0},{id:'good',label:'Good',idx:1},{id:'flat',label:'Flat',idx:2}];
const WEATHER_OPTS=[{id:'sunny',label:'Sunny',idx:0},{id:'overcast',label:'Overcast',idx:1},{id:'hot',label:'Hot',idx:2},{id:'damp',label:'Damp',idx:3}];
const STYLES={'Conservative':{vs_fast:1.15,vs_spin:0.72},'Balanced':{vs_fast:1.0,vs_spin:1.0},'Aggressive':{vs_fast:0.85,vs_spin:1.2},'Ultra-Agg':{vs_fast:0.8,vs_spin:0.8},'Slogger':{vs_fast:0.6,vs_spin:0.6}};
const MENTALITY_RUNS={defensive:{attacking:[0,0,1,2,2,4],balanced:[0,0,1,1,2,4],defensive:[0,0,1,1,2,2]},rotation:{attacking:[0,0,1,2,4,4],balanced:[0,0,1,2,2,4],defensive:[0,0,1,1,2,4]},positive:{attacking:[0,1,2,2,4,6],balanced:[0,1,1,2,2,4],defensive:[0,0,1,2,2,4]},aggressive:{attacking:[0,1,2,4,6,6],balanced:[0,1,2,4,4,4],defensive:[0,0,1,1,2,4]}};
const TAIL_RUNS={attacking:[0,1,2,4,6,6],balanced:[0,1,2,4,4,6],defensive:[0,0,1,2,4,4]};
const DEFAULT_HOWZAT=[[[ 9,11,12, 8],[ 8, 9, 8, 6],[ 7, 8, 5, 8]],[[11,13,14,11],[11,12,11, 8],[10,11, 8,11]],[[14,16,17,14],[14,15,14,11],[13,14,11,14]],[[17,19,20,17],[17,19,17,14],[16,18,14,18]],[[20,22,23,21],[21,22,21,17],[20,22,17,22]]];
const DEFAULT_NOTOUT=[[[ 8, 7, 9,14],[12, 9,15,12],[22,16,24,18]],[[14,12,16,20],[20,16,23,20],[32,24,34,28]],[[22,20,24,30],[30,26,33,30],[44,36,46,40]],[[34,30,36,42],[42,38,45,40],[56,48,58,52]],[[46,42,48,54],[54,50,57,52],[68,62,70,64]]];
const MODS={dotBallPct:3,fastOverBonus:10,wrongOverPen:12,handAngle:8};
const PAR_SCORES={minefield_sunny:76,minefield_overcast:76,minefield_damp:76,good_sunny:121,good_overcast:118,good_hot:120,good_damp:125,flat_sunny:122,flat_overcast:120,flat_hot:125,flat_damp:120};

function getHowzatCap(s){return[0,85,75,65,55,50][Math.min(5,Math.max(1,s))];}
function getRunsAheadOfPar(pitchId,weatherId,runs,over,ball){
  const parFinal=PAR_SCORES[pitchId+'_'+weatherId]||110;
  const balls=(over-1)*6+ball;
  return balls===0?0:runs-(parFinal/60)*balls;
}

function makePlayer(id,name,batStars,style,hand,isWk=false,isBowler=false,bowlStars=1,bowlType='fast',specialism='none',batSpecialism='none'){return{id,name,batStars,style,hand,isWk,isBowler,bowlStars,bowlType,specialism,batSpecialism};}
function makeTeam(name,players,personality='Balanced'){return{name,personality,players:players.map((p,i)=>({...p,id:i}))};}

const STOCK_TEAMS=[
  makeTeam('The Arkaba XI',[
    makePlayer(0,'A. Hartley',4,'Conservative','R',false,true,5,'fast','opener'),
    makePlayer(1,'J. Blackwood',4,'Conservative','L',false,true,4,'fast','seamer'),
    makePlayer(2,'C. Rawlings',3,'Conservative','R',false),
    makePlayer(3,'D. Forsyth',4,'Balanced','R',true),
    makePlayer(4,'M. Stapleton',3,'Aggressive','L',false),
    makePlayer(5,'T. Brennan',3,'Aggressive','R',false,true,3,'medium','none'),
    makePlayer(6,'S. Okafor',2,'Ultra-Agg','R',false,true,3,'fast','finisher'),
    makePlayer(7,'P. Holt',2,'Ultra-Agg','L',false,true,3,'fast','strike'),
    makePlayer(8,'R. Ingram',1,'Slogger','R',false),
    makePlayer(9,'N. Moss',1,'Slogger','L',false),
    makePlayer(10,'W. Cribb',1,'Slogger','R',false),
  ]),
  makeTeam('The Feathers CC',[
    makePlayer(0,'F. Cartwright',4,'Conservative','R',false,true,4,'fast','opener'),
    makePlayer(1,'G. Ndiaye',4,'Conservative','L',false,true,4,'fast','swing'),
    makePlayer(2,'H. Bellamy',3,'Conservative','R',false),
    makePlayer(3,'I. Koroma',4,'Balanced','R',true),
    makePlayer(4,'J. Fitzpatrick',3,'Balanced','L',false,true,3,'spin','none'),
    makePlayer(5,'K. Abubakar',3,'Aggressive','R',false,true,3,'spin','none'),
    makePlayer(6,'L. Birch',2,'Ultra-Agg','L',false,true,3,'fast','finisher'),
    makePlayer(7,'M. Cantwell',2,'Ultra-Agg','R',false),
    makePlayer(8,'N. Siddiqui',1,'Slogger','R',false),
    makePlayer(9,'O. Griffiths',1,'Slogger','L',false),
    makePlayer(10,'P. Leach',1,'Slogger','R',false),
  ]),
];

function simInnings(team,fieldingTeam,pitchIdx,weatherIdx,targetScore,useSmartField){
  const pitchId=PITCH_OPTS.find(p=>p.idx===pitchIdx).id;
  const weatherId=WEATHER_OPTS.find(w=>w.idx===weatherIdx).id;
  const bowlers=fieldingTeam.players.filter(p=>p.isBowler).map(p=>({id:'b'+p.id,name:p.name,type:p.bowlType,hand:p.hand,speciality:p.specialism,stars:p.bowlStars}));
  const nonBowlers=fieldingTeam.players.filter(p=>!p.isBowler).map(p=>({id:'e'+p.id,name:p.name,type:'medium',hand:p.hand,speciality:'none',stars:1}));
  const allBowlers=[...bowlers,...nonBowlers];
  const batsmen=team.players.map(p=>({stars:p.batStars,style:p.style,hand:p.hand,vs_fast:STYLES[p.style]?.vs_fast||1.0,vs_spin:STYLES[p.style]?.vs_spin||1.0,runs:0,out:false}));

  let runs=0,wickets=0,dotStreak=0,dotBuff=0,bowlerOvers={},activeBat=0,batConfidence=0,currentField='balanced',ballsCompleted=0;

  const getOT=(over)=>over<=5?'fast':'spin';
  const pickBowler=(over)=>{
    const ot=getOT(over);
    const avail=allBowlers.filter(b=>(bowlerOvers[b.id]||0)<2);
    if(!avail.length)return allBowlers[0];
    const sc=avail.map(b=>{let s=b.stars;if(b.type===ot)s+=2;if(b.speciality==='opener'&&over<=2)s+=2;if(b.speciality==='finisher'&&over>=9)s+=2;return{b,s};});
    sc.sort((a,b)=>b.s-a.s);return sc[0].b;
  };
  const inhBonus=(bwl,over)=>{let b=0;if(bwl.type==='spin'&&pitchId==='minefield')b+=1;if(bwl.type==='medium'){if(over<=3)b-=1;if(over>=9&&bwl.speciality!=='finisher')b-=1;if(weatherId==='damp')b+=1;}return b;};
  const specBonus=(bwl,over)=>{switch(bwl.speciality){case'opener':return over<=2?1:0;case'finisher':return over>=9?1:0;case'strike':return weatherId==='hot'?1:0;case'swing':return weatherId==='overcast'?1:0;case'seamer':return pitchId==='minefield'?1:0;default:return 0;}};

  for(let over=1;over<=10&&wickets<10;over++){
    const bwl=pickBowler(over);
    bowlerOvers[bwl.id]=(bowlerOvers[bwl.id]||0)+1;

    // Field selection
    let newField;
    if(useSmartField){
      const isInn2=targetScore!==null;
      if(isInn2){
        const need=targetScore+1-runs, bl=(10-over)*6+6;
        const rrr=bl>0?(need/bl)*6:99;
        newField=rrr>10?'attacking':rrr<6?'defensive':'balanced';
      } else {
        const ahead=getRunsAheadOfPar(pitchId,weatherId,runs,over,0);
        if(over<=3||wickets>=5||over>=9||ahead>=12) newField='attacking';
        else if(ahead<=-8) newField='defensive';
        else newField='balanced';
      }
    } else {
      newField='balanced';
      if(over<=2)newField='defensive';
      else if(wickets>=7)newField='attacking';
      else if(over>=9)newField='attacking';
      else if(over>=6&&wickets>=5)newField='attacking';
      else if(over>=6&&wickets<=2)newField='defensive';
      if(Math.random()<0.15)newField=['attacking','balanced','defensive'][Math.floor(Math.random()*3)];
    }
    if(newField!==currentField){currentField=newField;batConfidence=0;}

    for(let ball=0;ball<6&&wickets<10;ball++){
      if(targetScore!==null&&runs>targetScore)return{runs,wickets,balls:ballsCompleted};
      const bat=batsmen[activeBat];
      const ot=getOT(over);
      const fb=MODS.fastOverBonus/100,wp=MODS.wrongOverPen/100,ha=MODS.handAngle/100;
      let wm=1.0;
      if(bwl.type==='fast'&&ot==='fast')wm*=1+fb;
      if(bwl.type==='spin'&&ot==='spin')wm*=1+fb;
      if(bwl.type==='fast'&&ot==='spin')wm*=1-wp;
      if(bwl.type==='spin'&&ot==='fast')wm*=1-wp;
      if(bwl.hand!==bat.hand)wm*=1+ha;
      wm=Math.min(1.5,wm/(bwl.type==='spin'?bat.vs_spin:bat.vs_fast));

      const effStars=Math.min(5,Math.max(1,bwl.stars+specBonus(bwl,over)+inhBonus(bwl,over)));
      const isInn1=targetScore===null;
      const batPers=team.personality||'Balanced',bowlPers=fieldingTeam.personality||'Balanced';
      const batPM=batPers==='Setting'?(isInn1?0.92:1.08):batPers==='Chasing'?(isInn1?1.08:0.92):1.0;
      const bowlPM=bowlPers==='Setting'?(isInn1?0.92:1.08):bowlPers==='Chasing'?(isInn1?1.08:0.92):1.0;

      let howzat=DEFAULT_HOWZAT[effStars-1][pitchIdx][weatherIdx]*wm*batPM*bowlPM+dotBuff;
      howzat=Math.min(getHowzatCap(bat.stars),Math.max(2,howzat));

      const confNotOut=Math.min(10,Math.floor(batConfidence/2));
      batConfidence=Math.min(20,batConfidence+1);

      if(Math.random()<howzat/100){
        const noChance=Math.min(95,DEFAULT_NOTOUT[bat.stars-1][pitchIdx][weatherIdx]+confNotOut);
        if(Math.random()<noChance/100){dotStreak=0;dotBuff=0;}
        else{
          wickets++;dotStreak=0;dotBuff=0;batConfidence=0;
          let next=-1;for(let i=activeBat+1;i<batsmen.length;i++){if(!batsmen[i].out){next=i;break;}}
          if(next===-1||wickets>=10)break;
          batsmen[activeBat].out=true;activeBat=next;
        }
      } else {
        const confRunBonus=Math.floor(batConfidence/4);
        const simFaceTable=bat.stars===1?TAIL_RUNS:(MENTALITY_RUNS.positive);
        const runFaces=simFaceTable[currentField]||simFaceTable.balanced;
        const face=runFaces[Math.floor(Math.random()*runFaces.length)];
        if(face===0){dotStreak++;dotBuff=Math.min(2,dotStreak)*MODS.dotBallPct;}
        else{dotStreak=0;dotBuff=0;let r=face;if(confRunBonus>0&&r>0)r=Math.min(6,r+Math.floor(confRunBonus/3));runs+=Math.min(6,r);bat.runs+=Math.min(6,r);}
      }
      ballsCompleted++;
    }
  }
  return{runs,wickets,balls:ballsCompleted};
}

function runSim(games=5000){
  const conditions=[];
  for(const p of PITCH_OPTS)for(const w of WEATHER_OPTS){if(p.id==='minefield'&&w.id==='hot')continue;conditions.push({pitch:p,weather:w});}
  const t1=STOCK_TEAMS[0],t2=STOCK_TEAMS[1];

  for(const useSmartField of [false,true]){
    console.log(`\n${ useSmartField?'SMART FIELD (par-aware)':'BASELINE (original field logic)'}`);
    console.log('Condition              | Inn1 avg  | Bats1st% | LastOver%');
    console.log('─'.repeat(61));
    for(const {pitch,weather} of conditions){
      const pi=pitch.idx,wi=weather.idx;
      let inn1tot=0,inn1wkts=0,b1wins=0,total=0,loAlive=0,loTotal=0;
      for(let g=0;g<games;g++){
        const bf=Math.random()<0.5?t1:t2,bo=bf===t1?t2:t1;
        const i1=simInnings(bf,bo,pi,wi,null,useSmartField);
        const i2=simInnings(bo,bf,pi,wi,i1.runs,useSmartField);
        inn1tot+=i1.runs;inn1wkts+=i1.wickets;total++;
        if(i1.runs>i2.runs)b1wins++;
        if(i2.runs<=i1.runs){loTotal++;if(i2.balls>=54)loAlive++;}
      }
      const lbl=`${pitch.label}/${weather.label}`.padEnd(22);
      const avgRW=`${(inn1tot/games).toFixed(1)}/${(inn1wkts/games).toFixed(1)}`;
      const b1=Math.round(b1wins/total*100);
      const lo=loTotal>0?Math.round(loAlive/loTotal*100):0;
      console.log(`${lbl} | ${avgRW.padStart(9)} | ${String(b1+'%').padStart(8)} | ${String(lo+'%').padStart(9)}`);
    }
  }
  console.log('\nDone.\n');
}

runSim(5000);
