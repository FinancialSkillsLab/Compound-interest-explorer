const $ = (id)=>document.getElementById(id);
const fmtMoney = (v)=> new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(v||0);
const clamp = (v,min,max)=> Math.max(min, Math.min(max, v));

function ageYearsToWeeks(age){ return Math.round(age*52); }

function simulate({startAge, retireAge, weekly, annualRate}){
  const compPerYear = 12;
  startAge = Number(startAge); retireAge = Number(retireAge);
  weekly = Number(weekly); annualRate = Number(annualRate)/100;

  const totalWeeks = ageYearsToWeeks(retireAge - startAge);
  const r_step = Math.pow(1+annualRate, 1/compPerYear) - 1;
  const stepPerWeek = compPerYear/52;

  let balance = 0;
  let contributed = 0;
  let compAcc = 0;

  const weeklySeries = [];
  for(let w=0; w<=totalWeeks; w++){
    balance += weekly; contributed += weekly;
    compAcc += stepPerWeek;
    while(compAcc >= 1){ balance *= (1 + r_step); compAcc -= 1; }
    weeklySeries.push(balance);
  }

  const interestEarned = Math.max(0, balance - contributed);
  return { weeklySeries, totals:{ contributed, interestEarned, finalNominal: balance, yearsContrib:(retireAge-startAge) } };
}

function yearlySamples(minAge, retireAge, startAge, weeklySeries){
  const years = Math.round(retireAge - minAge);
  const labels = [];
  const data = [];
  for(let y=0; y<=years; y++){
    const age = Math.floor(minAge + y);
    labels.push(String(age));
    const weeksFromStart = Math.round((age - startAge + 1) * 52) - 1;
    if(age < startAge){ data.push(0); }
    else{
      const idx = Math.min(Math.max(0, weeksFromStart), weeklySeries.length-1);
      data.push(weeklySeries[idx]);
    }
  }
  return { labels, data };
}

let chart;
function renderChart(labels, datasets){
  const ctx = $("chart").getContext('2d');
  if(chart) chart.destroy();
  chart = new Chart(ctx, {
    type:'line',
    data:{ labels, datasets },
    options:{
      responsive:true,
      plugins:{ legend:{ display:false }},
      elements:{ line:{ tension:0.25 }, point:{ radius:0 }},
      scales:{
        x:{ ticks:{ color:'#3B4A53', font:{ size:11 }}, grid:{ color:'#E6E6E6'} },
        y:{ ticks:{ color:'#3B4A53', callback:(v)=>fmtMoney(v), font:{ size:11 }}, grid:{ color:'#E6E6E6'} }
      }
    }
  });
}

function metricCard(title, value){ return `<div class='card'><div class='metric'>${title}</div><div class='value'>${value}</div></div>`; }
function setMetrics(A, B){
  const m = $("metrics");
  const deltaNom = A.totals.finalNominal - B.totals.finalNominal;
  const who = deltaNom>=0 ? 'A leads' : 'B leads';
  m.innerHTML = [
    metricCard('Final balance (A)', fmtMoney(A.totals.finalNominal)),
    metricCard('Final balance (B)', fmtMoney(B.totals.finalNominal)),
    metricCard('Advantage', `${who} by ${fmtMoney(Math.abs(deltaNom))}`)
  ].join('');
}

function fillTable(A, B){
  const tbody = document.querySelector('#summaryTable tbody');
  const row = (name, startAge, t)=> `<tr><td><strong>${name}</strong></td><td>${startAge}</td><td>${t.yearsContrib.toFixed(1)}</td><td>${fmtMoney(t.contributed)}</td><td>${fmtMoney(t.interestEarned)}</td><td>${fmtMoney(t.finalNominal)}</td></tr>`;
  tbody.innerHTML = row('A', Number($("ageA").value), A.totals) + row('B', Number($("ageB").value), B.totals);
}

function run(){
  const weekly = clamp(Number($("weekly").value)||0, 0, 1e6);
  const rate = clamp(Number($("rate").value)||0, 0, 100);
  const ageA = Number($("ageA").value);
  const ageB = Number($("ageB").value);
  const retire = Number($("retire").value);

  const params = { weekly, annualRate: rate, retireAge: retire };
  const A = simulate({startAge: ageA, ...params});
  const B = simulate({startAge: ageB, ...params});

  const minAge = Math.min(ageA, ageB);
  const ysA = yearlySamples(minAge, retire, ageA, A.weeklySeries);
  const ysB = yearlySamples(minAge, retire, ageB, B.weeklySeries);

  renderChart(ysA.labels, [
    { label:`A`, data: ysA.data, borderColor:'#0BB4A6', backgroundColor:'rgba(11,180,166,0.2)' },
    { label:`B`, data: ysB.data, borderColor:'#1E3A8A', backgroundColor:'rgba(30,58,138,0.2)' }
  ]);

  setMetrics(A, B);
  fillTable(A, B);
}

$("run").addEventListener('click', run);
$("reset").addEventListener('click', ()=>location.reload());
