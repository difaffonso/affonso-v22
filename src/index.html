<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Affonso Odontologia</title>
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'DM Sans',sans-serif;background:#EEF3F0;color:#162420;}
::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:#A8D5C0;border-radius:3px;}
input,select,textarea,button{font-family:'DM Sans',sans-serif;}
@keyframes fi{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}.fi{animation:fi .2s ease}
@media(min-width:640px){.sidebar-overlay{display:none!important;}.sidebar{position:relative!important;transform:none!important;width:195px!important;flex-shrink:0;}.bottom-nav{display:none!important;}.main-content{padding-bottom:16px!important;}.mobile-topbar{display:none!important;}}
@media(max-width:639px){.sidebar{position:fixed!important;top:0!important;left:0!important;height:100vh!important;z-index:500!important;width:240px!important;transition:transform .25s ease!important;}.sidebar.closed{transform:translateX(-100%)!important;}.main-content{padding-bottom:70px!important;}}
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
const {useState,useEffect}=React;
const G={bg:"#EEF3F0",card:"#FFF",primary:"#1B5E4A",accent:"#E3EFE9",accentDark:"#A8D5C0",text:"#162420",muted:"#6B8880",red:"#C0392B",yellow:"#D68910",blue:"#1A5276",purple:"#6C3483",border:"#D5E8DF",success:"#1E8449",orange:"#CA6F1E",gold:"#B7950B"};
const UCOLS=["#1B5E4A","#6C3483","#1A5276","#CA6F1E","#C0392B","#148F77","#D68910"];
const PAY=["Dinheiro","PIX","Cartão Crédito","Cartão Débito","Convênio","Cheque"];
const SL={confirmed:"Confirmado",pending:"Pendente",done:"Realizado",cancelled:"Cancelado",missed:"Faltou",rescheduled:"Desmarcado"};
const SC={confirmed:"#2E7D4F",pending:"#E07B20",done:"#6B8880",cancelled:"#C0392B",missed:"#C0392B",rescheduled:"#7F8C8D"};
const PROS_T=["Coroa Metalocerâmica","Coroa Zircônia","Coroa Porcelana","PPR","PPF","Prótese Total","Faceta","Inlay/Onlay","Implante (coroa)","Protocolo","Outro"];
const PROS_SL={waiting:"Aguardando",returned:"Retornou",placed:"Instalada",remake:"Refazer"};
const PROS_SC={waiting:G.yellow,returned:G.blue,placed:G.success,remake:G.red};
const SLOTS=(()=>{const s=[];for(let h=8;h<=19;h++){if(h===8)s.push("08:30");else{s.push(`${String(h).padStart(2,"0")}:00`);if(h<19)s.push(`${String(h).padStart(2,"0")}:30`);}}return s;})();
const EXPENSE_CATS=["Aluguel","Água","Luz","Internet","Telefone","Salários","Material","Equipamento","Manutenção","Contabilidade","Outros"];
const fmt=d=>d?new Date(d+"T12:00").toLocaleDateString("pt-BR"):"—";
const today=()=>new Date().toISOString().split("T")[0];
const cur=v=>`R$ ${Number(v||0).toFixed(2).replace(".",",")}`;
const nid=a=>a.length?Math.max(...a.map(x=>x.id))+1:1;
const isBday=d=>{if(!d)return false;return d.slice(5)===today().slice(5);};
const mo6=d=>{const x=new Date(d+"T12:00");x.setMonth(x.getMonth()+6);return x.toISOString().split("T")[0];};
const calcNet=(v,p)=>p==="Cartão Crédito"?v*0.965:p==="Cartão Débito"?v*0.98:v;
const wa=(ph,msg)=>{const n=(ph||"").replace(/\D/g,"");const u="https://wa.me/"+(n.startsWith("55")?n:"55"+n)+"?text="+encodeURIComponent(msg);const a=document.createElement("a");a.href=u;a.target="_blank";document.body.appendChild(a);a.click();document.body.removeChild(a);};
const age=dob=>{if(!dob)return"";const d=new Date(dob+"T12:00");const a=new Date();let y=a.getFullYear()-d.getFullYear();if(a.getMonth()<d.getMonth()||(a.getMonth()===d.getMonth()&&a.getDate()<d.getDate()))y--;return y+" anos";};

const USERS0=[
{id:1,name:"Dr. Diego Affonso",role:"Admin",level:3,login:"admin",pass:"1234",dentistId:1,color:UCOLS[0],active:true},
{id:2,name:"Fernanda",role:"Recepcionista",level:2,login:"fernanda",pass:"1234",dentistId:null,color:UCOLS[1],active:true},
{id:3,name:"Dra. Mariana Souza",role:"Dentista",level:1,login:"mariana",pass:"1234",dentistId:2,color:UCOLS[2],active:true},
];
const DENTS0=[
{id:1,name:"Dr. Diego Affonso",color:UCOLS[0],specialty:"Clínico Geral",commission:40,cro:"SP-72.278",dias:[1,2,3,4,5],entrada:"08:00",saida:"18:00",almoco:{ini:"12:00",fim:"13:00"}},
{id:2,name:"Dra. Mariana Souza",color:UCOLS[2],specialty:"Ortodontia",commission:40,cro:"SP-00000",dias:[1,2,3,4,5],entrada:"08:00",saida:"18:00",almoco:{ini:"12:00",fim:"13:00"}},
{id:3,name:"Dr. Pedro Lima",color:UCOLS[3],specialty:"Implantodontia",commission:40,cro:"SP-00000",dias:[1,3,5],entrada:"08:00",saida:"18:00",almoco:{ini:"12:00",fim:"13:00"}},
];
const LABS0=[{id:1,name:"Lab Dental Souza",phone:"1133334444",contact:"João Souza"},{id:2,name:"Studio Protético Alves",phone:"1144445555",contact:"Carlos Alves"}];
const PROCS0=[{id:1,name:"Consulta",price:150},{id:2,name:"Limpeza",price:180},{id:3,name:"Restauração",price:280},{id:4,name:"Canal",price:900},{id:5,name:"Extração",price:250},{id:6,name:"Cirurgia",price:600},{id:7,name:"Clareamento",price:700},{id:8,name:"Implante",price:3500},{id:9,name:"Ortodontia",price:300},{id:10,name:"Prótese",price:1200},{id:11,name:"Radiografia",price:80}];
const PATS0=[
{id:1,name:"Ana Costa",dob:"1990-04-29",genero:"F",phone:"11998123456",email:"ana@email.com",cpf:"123.456.789-00",blood:"A+",allergy:"Nenhuma",insurance:"Unimed",notes:"Paciente hipertensa.",folder:"F-0001",rx:"RX-2024-001",obs:"",anamnese:{hypertension:true,diabetes:false,heartDisease:false,bleeding:false,allergicMeds:"",medications:"Captopril 25mg",pregnant:false,smoking:false,notes:""}},
{id:2,name:"Bruno Martins",dob:"1985-07-22",genero:"M",phone:"11976543210",email:"bruno@email.com",cpf:"987.654.321-00",blood:"O-",allergy:"Penicilina",insurance:"",notes:"",folder:"F-0002",rx:"RX-2024-002",obs:"ALÉRGICO A PENICILINA",anamnese:{hypertension:false,diabetes:true,heartDisease:false,bleeding:false,allergicMeds:"Penicilina",medications:"Metformina",pregnant:false,smoking:false,notes:""}},
{id:3,name:"Carla Lima",dob:"2001-11-05",genero:"F",phone:"11912345678",email:"",cpf:"456.789.123-00",blood:"B+",allergy:"Nenhuma",insurance:"",notes:"",folder:"F-0003",rx:"RX-2024-003",obs:"",anamnese:{hypertension:false,diabetes:false,heartDisease:false,bleeding:false,allergicMeds:"",medications:"",pregnant:false,smoking:false,notes:""}},
];
const APPTS0=[
{id:1,patientId:1,dentistId:1,date:"2026-05-08",time:"08:30",procedure:"Limpeza",treatment:"Profilaxia semestral",status:"confirmed",notes:"",value:180,payment:"PIX"},
{id:2,patientId:2,dentistId:1,date:"2026-05-08",time:"10:00",procedure:"Restauração",treatment:"Restauração dente 36",status:"pending",notes:"",value:280,payment:"Dinheiro"},
{id:3,patientId:3,dentistId:2,date:"2026-05-09",time:"14:00",procedure:"Ortodontia",treatment:"Ativação de aparelho",status:"confirmed",notes:"",value:300,payment:"Cartão Crédito"},
];
const RECS0=[
{id:1,patientId:1,date:"2026-03-10",procedure:"Limpeza",tooth:"Geral",dentistId:1,obs:"Sem intercorrências",rx:"",paid:180,payment:"PIX",closed:true,inst:1,instM:[]},
{id:2,patientId:2,date:"2026-04-28",procedure:"Cirurgia",tooth:"38",dentistId:1,obs:"Extração siso",rx:"Amoxicilina 500mg",paid:600,payment:"Cartão Crédito",closed:true,inst:3,instM:["2026-05","2026-06","2026-07"]},
];
const PROS0=[
{id:1,patientId:1,dentistId:1,labId:1,type:"Coroa Metalocerâmica",proc:"Instalação de Coroa",tooth:"16",sent:"2026-04-10",due:"2026-05-08",returned:"",status:"waiting",notes:"Cor A2",price:350},
];
const REMS0=[{id:1,title:"Confirmar consulta Ana",desc:"Ligar para confirmar",date:today(),priority:"high",done:false,patientId:1}];
const STOCK0=[{id:1,name:"Luvas P (cx)",qty:5,unit:"cx",min:2,price:28.5,movs:[]},{id:2,name:"Resina Composta A2",qty:8,unit:"un",min:3,price:89,movs:[]}];
const EXPENSES0={clinic:[{id:1,date:"2026-04-05",cat:"Aluguel",desc:"Aluguel abril",value:3500,paid:true},{id:2,date:"2026-04-10",cat:"Luz",desc:"Conta luz",value:280,paid:false}],personal:[]};

const Bdg=({l,col,sm})=><span style={{background:col+"22",color:col,borderRadius:20,padding:sm?"2px 7px":"3px 10px",fontSize:sm?10:11,fontWeight:700,whiteSpace:"nowrap"}}>{l}</span>;
const Btn=({ch,onClick,v="p",sm,style,dis})=>{const b={cursor:dis?"not-allowed":"pointer",opacity:dis?.5:1,border:"none",borderRadius:8,fontFamily:"DM Sans",fontWeight:600,transition:"all .15s",display:"inline-flex",alignItems:"center",gap:5,whiteSpace:"nowrap"};const vs={p:{background:G.primary,color:"#fff",padding:sm?"5px 11px":"9px 17px",fontSize:sm?12:14},g:{background:"transparent",color:G.primary,border:`1.5px solid ${G.primary}`,padding:sm?"4px 10px":"8px 16px",fontSize:sm?12:14},r:{background:G.red,color:"#fff",padding:sm?"5px 11px":"9px 17px",fontSize:sm?12:14},y:{background:G.yellow,color:"#fff",padding:sm?"5px 11px":"9px 17px",fontSize:sm?12:14},w:{background:"#25D366",color:"#fff",padding:sm?"5px 11px":"9px 17px",fontSize:sm?12:14},f:{background:G.accent,color:G.primary,padding:sm?"5px 11px":"9px 17px",fontSize:sm?12:14}};return <button style={{...b,...vs[v],...style}} onClick={onClick} disabled={dis}>{ch}</button>;};
const Inp=({lb,val,set,type="text",ph,ro,style})=>(<div style={{display:"flex",flexDirection:"column",gap:4,...style}}>{lb&&<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>{lb}</label>}<input value={val||""} onChange={e=>set&&set(e.target.value)} type={type} placeholder={ph} readOnly={ro} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",color:G.text,background:ro?"#f7f9f8":"#fff"}}/></div>);
const Txt=({lb,val,set,rows=3,ro})=>(<div style={{display:"flex",flexDirection:"column",gap:4}}>{lb&&<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>{lb}</label>}<textarea value={val||""} onChange={e=>set&&set(e.target.value)} rows={rows} readOnly={ro} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",color:G.text,background:ro?"#f7f9f8":"#fff",resize:"vertical"}}/></div>);
const Sel=({lb,val,set,opts,style})=>(<div style={{display:"flex",flexDirection:"column",gap:4,...style}}>{lb&&<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>{lb}</label>}<select value={val||""} onChange={e=>set(e.target.value)} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",color:G.text,background:"#fff"}}>{opts.map(o=><option key={o.v??o} value={o.v??o}>{o.l??o}</option>)}</select></div>);
const R2=({a,b,gap=11})=><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap}}>{a}{b}</div>;
const Div=({lb})=><div style={{display:"flex",alignItems:"center",gap:8,margin:"5px 0"}}>{lb&&<span style={{fontSize:10,fontWeight:700,color:G.muted,textTransform:"uppercase",whiteSpace:"nowrap"}}>{lb}</span>}<div style={{flex:1,height:1,background:G.border}}/></div>;
const SC2=({save,cancel,lbl="Salvar"})=><div style={{display:"flex",gap:9,justifyContent:"flex-end",marginTop:14,paddingTop:12,borderTop:`1px solid ${G.border}`}}><Btn ch="Cancelar" v="g" onClick={cancel}/><Btn ch={lbl} onClick={save}/></div>;
const Modal=({open,close,title,ch,wide})=>{if(!open)return null;return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:12}}><div style={{background:G.card,borderRadius:18,width:"100%",maxWidth:wide?720:520,maxHeight:"94vh",overflowY:"auto",boxShadow:"0 16px 48px rgba(0,0,0,.22)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${G.border}`,position:"sticky",top:0,background:G.card,zIndex:1}}><span style={{fontFamily:"Cormorant Garamond",fontSize:20}}>{title}</span><button onClick={close} style={{border:"none",background:"none",fontSize:24,cursor:"pointer",color:G.muted}}>×</button></div><div style={{padding:20}}>{ch}</div></div></div>;};

function PatSearch({lb,val,set,pats,optional}){
const sel=pats.find(p=>p.id===Number(val));
const [q,setQ]=useState("");
const [open,setOpen]=useState(false);
const norm=s=>(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const res=q.length>=1?pats.filter(p=>{const nq=norm(q);return norm(p.name).includes(nq)||(p.folder||"").includes(q)||(p.phone||"").includes(q);}).slice(0,8):[];
return <div style={{position:"relative",display:"flex",flexDirection:"column",gap:4}}>
{lb&&<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>{lb}</label>}
{sel&&!open?<div style={{display:"flex",alignItems:"center",gap:8,background:G.accent,borderRadius:8,padding:"8px 11px",border:"1.5px solid "+G.primary}}><span style={{flex:1,fontSize:13,fontWeight:700}}>{sel.name} · {sel.folder}</span><button onClick={()=>{set("");setQ("");}} style={{border:"none",background:"none",color:G.muted,cursor:"pointer",fontSize:18}}>×</button></div>
:<div><input value={q} onChange={e=>{setQ(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} placeholder={optional?"Opcional":"Digite nome ou ficha..."} style={{width:"100%",border:"1.5px solid "+(open?G.primary:G.border),borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
{open&&res.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,.15)",zIndex:999,maxHeight:220,overflowY:"auto",border:"1px solid "+G.border,marginTop:3}}>
{res.map(p=><div key={p.id} onMouseDown={()=>{set(String(p.id));setQ("");setOpen(false);}} style={{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid "+G.border}}>
<div style={{fontWeight:700,fontSize:13}}>{p.name}</div><div style={{fontSize:11,color:G.muted}}>{p.folder} · {p.phone}</div></div>)}</div>}</div>}
{open&&<div style={{position:"fixed",inset:0,zIndex:998}} onClick={()=>setOpen(false)}/>}
</div>;
}

const autoRems=(pats,recs,appts)=>{
const t=today();const out=[];
pats.forEach(p=>{
if(isBday(p.dob))out.push({id:`b${p.id}`,title:`Aniversário — ${p.name}`,desc:"Hoje é aniversário!",date:t,priority:"medium",done:false,patientId:p.id,type:"bday"});
const lr=recs.filter(r=>r.patientId===p.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
if(lr&&mo6(lr.date)<=t)out.push({id:`s${p.id}`,title:`Semestral — ${p.name}`,desc:`Último: ${fmt(lr.date)}`,date:t,priority:"medium",done:false,patientId:p.id,type:"semi"});
});
return out;
};

function Login({users,onLogin}){
const [l,sl]=useState("");const [p,sp]=useState("");const [e,se]=useState("");
const go=()=>{const u=users.find(u=>u.login===l&&u.pass===p&&u.active);u?onLogin(u):se("Login ou senha inválidos");};
return <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#1B5E4A 0%,#0a2e1e 60%,#051a10 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
<div style={{width:"100%",maxWidth:380}}>
<div style={{textAlign:"center",marginBottom:32}}>
<div style={{fontSize:64,marginBottom:12}}>🦷</div>
<div style={{fontFamily:"Cormorant Garamond",fontSize:34,color:"#fff",fontWeight:700}}>Affonso Odontologia</div>
<div style={{fontSize:12,color:"rgba(255,255,255,.5)",marginTop:6,letterSpacing:"2px",textTransform:"uppercase"}}>Sistema de Gestão</div>
</div>
<div style={{background:"rgba(255,255,255,.07)",borderRadius:20,padding:"32px 28px",boxShadow:"0 24px 64px rgba(0,0,0,.4)",border:"1px solid rgba(255,255,255,.1)"}}>
<div style={{display:"flex",flexDirection:"column",gap:14}}>
<div><label style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Usuário</label>
<input value={l} onChange={e=>sl(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")go();}} placeholder="Digite seu usuário" style={{width:"100%",background:"rgba(255,255,255,.1)",border:"1.5px solid rgba(255,255,255,.15)",borderRadius:10,padding:"12px 14px",fontSize:14,color:"#fff",outline:"none",boxSizing:"border-box"}}/></div>
<div><label style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Senha</label>
<input value={p} onChange={e=>sp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")go();}} type="password" placeholder="••••••••" style={{width:"100%",background:"rgba(255,255,255,.1)",border:"1.5px solid rgba(255,255,255,.15)",borderRadius:10,padding:"12px 14px",fontSize:14,color:"#fff",outline:"none",boxSizing:"border-box"}}/></div>
{e&&<div style={{background:"rgba(244,67,54,.15)",color:"#ff8a80",borderRadius:8,padding:"8px 12px",fontSize:12,textAlign:"center"}}>{e}</div>}
<button onClick={go} style={{background:"linear-gradient(135deg,#2E7D5A,#1B5E4A)",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,cursor:"pointer",color:"#fff",marginTop:4}}>Entrar</button>
</div>
</div>
</div>
</div>;
}

function Dashboard({appts,pats,recs,rems,pros,dents,setView,user}){
const t=today();
const todayA=appts.filter(a=>a.date===t).sort((a,b)=>a.time.localeCompare(b.time));
const mo=t.slice(0,7);
const rev=recs.filter(r=>r.date.startsWith(mo)&&r.paid>0).reduce((s,r)=>s+r.paid,0);
const ar=autoRems(pats,recs,appts);
const urgent=[...ar,...rems.filter(r=>!r.done)].filter(r=>r.date<=t);
const todayP=pros.filter(p=>p.due===t&&p.status==="waiting");
return <div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div><h2 style={{fontFamily:"Cormorant Garamond",fontSize:26}}>Visão Geral</h2>
<div style={{fontSize:12,color:G.muted}}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div></div>
<div style={{fontSize:12,color:G.muted}}>Olá, <strong>{user.name}</strong></div>
</div>
{urgent.filter(r=>r.type==="bday").map(r=>{const p=pats.find(x=>x.id===r.patientId);return <div key={r.id} style={{background:G.gold+"15",border:`2px solid ${G.gold}`,borderRadius:10,padding:"8px 14px",display:"flex",gap:10,alignItems:"center"}}><span>🎂</span><span style={{fontWeight:700,color:G.gold,flex:1}}>{r.title}</span>{p?.phone&&<Btn ch="📱 WA" v="w" sm onClick={()=>wa(p.phone,`Olá ${p.name}! 🎂 Feliz aniversário da equipe Affonso Odontologia! 😊`)}/>}</div>;})}
{todayP.length>0&&<div style={{background:G.orange+"15",border:`2px solid ${G.orange}`,borderRadius:10,padding:"8px 14px",display:"flex",gap:10,alignItems:"center"}}><span>🏥</span><span style={{fontWeight:700,color:G.orange,flex:1}}>{todayP.length} prótese(s) para hoje!</span><Btn ch="Ver" v="y" sm onClick={()=>setView("pros")}/></div>}
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
{[{l:"Pacientes",v:pats.length,i:"👥",c:G.primary},{l:"Hoje",v:todayA.length,i:"📅",c:G.blue},{l:"Próteses em Lab",v:pros.filter(p=>p.status==="waiting").length,i:"🏥",c:G.purple},{l:"Receita Mês",v:cur(rev),i:"💰",c:G.yellow}].map(({l,v,i,c})=><div key={l} style={{background:G.card,borderRadius:12,padding:14,boxShadow:"0 1px 5px rgba(0,0,0,.07)",borderLeft:`4px solid ${c}`}}><div style={{fontSize:19,marginBottom:4}}>{i}</div><div style={{fontFamily:"Cormorant Garamond",fontSize:22,color:c}}>{v}</div><div style={{fontSize:11,color:G.muted,fontWeight:600,marginTop:1}}>{l}</div></div>)}
</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>
{dents.map(d=>{const cnt=appts.filter(a=>a.date===t&&a.dentistId===d.id).length;return <div key={d.id} style={{background:G.card,borderRadius:11,padding:11,textAlign:"center",borderTop:`3px solid ${d.color}`,boxShadow:"0 1px 4px rgba(0,0,0,.07)"}}><div style={{fontWeight:700,color:d.color,fontSize:11}}>{d.name.split(" ")[0]}</div><div style={{fontFamily:"Cormorant Garamond",fontSize:20,color:d.color,marginTop:2}}>{cnt}</div><div style={{fontSize:10,color:G.muted}}>hoje</div></div>;})}
</div>
<div style={{background:G.card,borderRadius:12,padding:14,boxShadow:"0 1px 5px rgba(0,0,0,.07)"}}>
<div style={{fontWeight:700,fontSize:13,marginBottom:10}}>Agenda de Hoje</div>
{todayA.length===0&&<p style={{color:G.muted,fontSize:13}}>Nenhum agendamento hoje</p>}
{todayA.map(a=>{const p=pats.find(x=>x.id===a.patientId);const d=dents.find(x=>x.id===a.dentistId)||dents[0];return <div key={a.id} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 0",borderBottom:`1px solid ${G.border}`,flexWrap:"wrap"}}><span style={{fontWeight:700,color:SC[a.status],minWidth:38,fontSize:12}}>{a.time}</span><div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{p?.name}</div><div style={{fontSize:11,color:G.muted}}>{a.procedure}</div></div><span style={{fontSize:11,color:d.color,fontWeight:600}}>{d.name.split(" ")[0]}</span><Bdg l={SL[a.status]} col={SC[a.status]} sm/></div>;})}
</div>
</div>;
}

function Pacientes({pats,setPats,recs,dents,procs,user}){
const [srch,setSrch]=useState("");
const [pm,setPm]=useState(false);const [ep,setEp]=useState(null);
const [openPat,setOpenPat]=useState(null);
const b0={name:"",dob:"",phone:"",email:"",cpf:"",blood:"",allergy:"",insurance:"",notes:"",folder:"",rx:"",obs:"",genero:""};
const [pf,setPf]=useState(b0);
const fp=k=>v=>setPf(p=>({...p,[k]:v}));
const ft=pats.filter(p=>p.name.toLowerCase().includes(srch.toLowerCase())||p.phone?.includes(srch)||(p.folder||"").includes(srch));
const savePat=()=>{if(!pf.name)return;const obj={...pf,id:ep?ep.id:nid(pats),anamnese:ep?.anamnese||{}};setPats(prev=>ep?prev.map(p=>p.id===ep.id?obj:p):[...prev,obj]);setPm(false);};
return <div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
<h2 style={{fontFamily:"Cormorant Garamond",fontSize:26}}>Pacientes</h2>
<Btn ch="+ Novo Paciente" onClick={()=>{setEp(null);setPf(b0);setPm(true);}}/>
</div>
<Inp val={srch} set={setSrch} ph="🔍 Nome, CPF, telefone ou nº pasta"/>
{ft.map(p=><div key={p.id} style={{background:G.card,borderRadius:13,boxShadow:"0 1px 5px rgba(0,0,0,.07)",padding:"12px 15px",display:"flex",alignItems:"center",gap:11}}>
<div style={{width:42,height:42,borderRadius:"50%",background:G.accent,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Cormorant Garamond",fontSize:20,color:G.primary,flexShrink:0,cursor:"pointer"}} onClick={()=>setOpenPat(p)}>{p.name[0]}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontWeight:700,fontSize:13,cursor:"pointer"}} onClick={()=>setOpenPat(p)}>{p.name}<span style={{fontSize:11,color:G.muted,fontWeight:400}}> · {age(p.dob)} · {p.folder||"—"}</span></div>
<div style={{color:G.muted,fontSize:12}}>{user.level>=2?p.phone:"••••••••••"}</div>
{p.obs&&<div style={{background:G.red+"20",borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700,color:G.red,marginTop:2,display:"inline-block"}}>⚠ {p.obs.slice(0,40)}</div>}
</div>
<div style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"flex-end"}}>
<Btn ch="📋 Ver" sm onClick={()=>setOpenPat(p)}/>
{user.level>=2&&<Btn ch="✏️" v="g" sm onClick={()=>{setEp(p);setPf({...p});setPm(true);}}/>}
{p.phone&&user.level>=2&&<Btn ch="📱" v="w" sm onClick={()=>wa(p.phone,`Olá ${p.name}! 😊`)}/>}
</div>
</div>)}
{openPat&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:10}}>
<div style={{background:G.card,borderRadius:18,width:"100%",maxWidth:700,maxHeight:"95vh",overflowY:"auto"}}>
<div style={{background:G.primary,borderRadius:"18px 18px 0 0",padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div><div style={{fontFamily:"Cormorant Garamond",fontSize:22,color:"#fff"}}>Prontuário: {openPat.name}</div>
<div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginTop:2}}>{age(openPat.dob)} · {openPat.phone} · {openPat.folder}</div></div>
<button onClick={()=>setOpenPat(null)} style={{border:"none",background:"rgba(255,255,255,.2)",borderRadius:8,color:"#fff",fontSize:18,cursor:"pointer",padding:"6px 12px",fontWeight:700}}>✕ Fechar</button>
</div>
<div style={{padding:22}}>
{openPat.obs&&<div style={{background:G.yellow+"18",border:`2px solid ${G.yellow}`,borderRadius:10,padding:"9px 14px",marginBottom:12}}><span style={{fontWeight:700,color:G.yellow}}>⚠ {openPat.obs}</span></div>}
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
{[["NOME",openPat.name],["IDADE",age(openPat.dob)],["CPF",openPat.cpf||"—"],["TELEFONE",openPat.phone],["ALERGIA",openPat.allergy||"Nenhuma"],["PLANO",openPat.insurance||"—"],["Nº DA FICHA",openPat.folder],["SANGUE",openPat.blood||"—"]].map(([k,v])=><div key={k} style={{background:G.bg,borderRadius:8,padding:"8px 12px"}}><div style={{fontSize:10,fontWeight:700,color:G.muted}}>{k}</div><div style={{fontWeight:600,fontSize:13,color:k==="ALERGIA"&&v!=="Nenhuma"?G.red:G.text}}>{v}</div></div>)}
</div>
{openPat.anamnese&&<div style={{marginTop:14}}><Div lb="Anamnese"/><div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:6}}>
{[["hypertension","Hipertensão"],["diabetes","Diabetes"],["heartDisease","Cardiopatia"],["bleeding","Coagulação"],["pregnant","Gestante"],["smoking","Tabagismo"]].filter(([k])=>openPat.anamnese[k]).map(([k,l])=><Bdg key={k} l={"⚠ "+l} col={G.red}/>)}
</div>
{openPat.anamnese.medications&&<div style={{fontSize:12,marginTop:8,color:G.text}}>💊 Medicamentos: {openPat.anamnese.medications}</div>}
</div>}
{user.level>=2&&<div style={{marginTop:14,display:"flex",gap:8}}>
{openPat.phone&&<Btn ch="📱 WhatsApp" v="w" sm onClick={()=>wa(openPat.phone,`Olá ${openPat.name}! 😊`)}/>}
<Btn ch="✏️ Editar" v="g" sm onClick={()=>{setEp(openPat);setPf({...openPat});setOpenPat(null);setPm(true);}}/>
</div>}
</div>
</div>
</div>}
<Modal open={pm} close={()=>setPm(false)} title={ep?"Editar Paciente":"Novo Paciente"} wide ch={<div style={{display:"flex",flexDirection:"column",gap:11}}>
<Inp lb="Nome completo *" val={pf.name} set={fp("name")}/>
<R2 a={<Inp lb="Nº da Ficha" val={pf.folder} set={fp("folder")} ph="F-0001"/>} b={<Inp lb="Telefone" val={pf.phone} set={fp("phone")} ph="11999990000"/>}/>
<R2 a={<Inp lb="Data Nasc." val={pf.dob} set={fp("dob")} type="date"/>} b={<Inp lb="CPF" val={pf.cpf} set={fp("cpf")}/>}/>
<R2 a={<Inp lb="Alergia" val={pf.allergy} set={fp("allergy")}/>} b={<Inp lb="Plano" val={pf.insurance} set={fp("insurance")}/>}/>
<Txt lb="⚠ Obs. Importante" val={pf.obs} set={fp("obs")} rows={2}/>
<SC2 save={savePat} cancel={()=>setPm(false)}/>
</div>}/>
</div>;
}

function Agenda({appts,setAppts,pats,dents,procs,user}){
const [selDate,setSelDate]=useState(today());
const [modal,setModal]=useState(false);
const [viewA,setViewA]=useState(null);
const [edit,setEdit]=useState(null);
const blank={patientId:"",dentistId:user.dentistId||dents[0]?.id||1,date:selDate,time:"",procedure:"",treatment:"",status:"pending",notes:"",value:"",payment:"Dinheiro"};
const [f,setF]=useState(blank);
const upd=k=>v=>setF(p=>({...p,[k]:v}));
const isDent=user.level===1;
const td=today();
const DAY=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const getWeek=ds=>{const d=new Date(ds+"T12:00");const diff=d.getDay()===0?-6:1-d.getDay();const mon=new Date(d);mon.setDate(d.getDate()+diff);return Array.from({length:7},(_,i)=>{const x=new Date(mon);x.setDate(mon.getDate()+i);return x.toISOString().split("T")[0];});};
const week=getWeek(selDate);
const prevW=()=>{const d=new Date(week[0]+"T12:00");d.setDate(d.getDate()-7);setSelDate(d.toISOString().split("T")[0]);};
const nextW=()=>{const d=new Date(week[6]+"T12:00");d.setDate(d.getDate()+1);setSelDate(d.toISOString().split("T")[0]);};
const vd=isDent?dents.filter(d=>d.id===user.dentistId):dents;
const save=()=>{if(!f.patientId||!f.time){alert("Preencha paciente e horário");return;}const obj={...f,patientId:Number(f.patientId),dentistId:Number(f.dentistId),value:Number(f.value)||0,id:edit?edit.id:nid(appts)};setAppts(prev=>edit?prev.map(a=>a.id===edit.id?obj:a):[...prev,obj]);setModal(false);setEdit(null);setF(blank);};
const chSt=(id,st)=>setAppts(prev=>prev.map(a=>a.id===id?{...a,status:st}:a));
return <div style={{display:"flex",flexDirection:"column",gap:10}} className="fi">
<div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
<button onClick={prevW} style={{background:"#fff",border:"1.5px solid "+G.border,borderRadius:8,padding:"7px 12px",cursor:"pointer",color:G.primary,fontWeight:700}}>{"<"}</button>
<button onClick={nextW} style={{background:"#fff",border:"1.5px solid "+G.border,borderRadius:8,padding:"7px 12px",cursor:"pointer",color:G.primary,fontWeight:700}}>{">"}</button>
<button onClick={()=>setSelDate(td)} style={{background:"#fff",border:"1.5px solid "+G.border,borderRadius:8,padding:"7px 11px",cursor:"pointer",color:G.primary,fontWeight:600,fontSize:12}}>Hoje</button>
<div style={{flex:1}}/>
<Btn ch="+ Agendar" onClick={()=>{setEdit(null);setF({...blank,date:selDate});setModal(true);}}/>
</div>
<div style={{display:"grid",gridTemplateColumns:"48px repeat(7,1fr)",gap:2}}>
<div/>
{week.map(ds=>{const d=new Date(ds+"T12:00");const isTd=ds===td;const isSel=ds===selDate;const cnt=appts.filter(a=>a.date===ds).length;return <div key={ds} onClick={()=>setSelDate(ds)} style={{textAlign:"center",cursor:"pointer",background:isSel?G.primary:isTd?G.accent:"transparent",borderRadius:10,padding:"5px 2px",border:"2px solid "+(isSel?G.primary:isTd?G.primary:"transparent")}}><div style={{fontSize:10,fontWeight:700,color:isSel?"rgba(255,255,255,.8)":G.muted}}>{DAY[d.getDay()]}</div><div style={{fontSize:20,fontWeight:700,color:isSel?"#fff":isTd?G.primary:G.text}}>{d.getDate()}</div>{cnt>0&&<div style={{background:isSel?"rgba(255,255,255,.4)":G.primary,color:"#fff",borderRadius:8,padding:"0 5px",fontSize:9,fontWeight:700,display:"inline-block"}}>{cnt}</div>}</div>;})}
</div>
<div style={{display:"flex",flexDirection:"column",gap:3}}>
{SLOTS.map(slot=>{const d=vd[0]||dents[0];const a=d?appts.find(x=>x.date===selDate&&x.time===slot&&x.dentistId===d.id):null;const p=a?pats.find(x=>x.id===a.patientId):null;
if(!a)return <div key={slot} onClick={()=>{if(isDent)return;setEdit(null);setF({...blank,date:selDate,time:slot,dentistId:d?.id});setModal(true);}} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:8,background:"#f8fbf9",border:"1px dashed "+G.border,cursor:isDent?"default":"pointer"}}><span style={{fontSize:11,color:G.muted,minWidth:38,fontWeight:600}}>{slot}</span><span style={{fontSize:11,color:G.border,flex:1}}>{isDent?"─────────":"+ agendar"}</span></div>;
return <div key={slot} onClick={()=>setViewA(a)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:10,background:SC[a.status]+"15",border:"1.5px solid "+SC[a.status],cursor:"pointer"}}><span style={{fontSize:12,fontWeight:700,color:SC[a.status],minWidth:38}}>{slot}</span><div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{p?.name}</div><div style={{fontSize:11,color:G.muted}}>{a.procedure}</div></div><Bdg l={SL[a.status]} col={SC[a.status]} sm/></div>;})}
</div>
{viewA&&(()=>{const a=viewA;const p=pats.find(x=>x.id===a.patientId);const d=dents.find(x=>x.id===a.dentistId)||dents[0];return <Modal open close={()=>setViewA(null)} title="Consulta" wide ch={<div style={{display:"flex",flexDirection:"column",gap:10}}>
{p?.obs&&<div style={{background:G.yellow+"18",border:"2px solid "+G.yellow,borderRadius:10,padding:"8px 12px",fontWeight:700,color:G.yellow}}>⚠ {p.obs}</div>}
<div style={{background:G.accent,borderRadius:10,padding:"10px 14px"}}><div style={{fontSize:15,fontWeight:700}}>{p?.name}</div><div style={{fontSize:12,color:G.muted}}>{p?.folder}</div></div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>{[["Data/Hora",fmt(a.date)+" · "+a.time],["Procedimento",a.procedure],["Dentista",d.name],["Status",SL[a.status]]].map(([k,v])=><div key={k} style={{background:G.bg,borderRadius:8,padding:"6px 10px"}}><div style={{fontSize:10,color:G.muted,fontWeight:700}}>{k}</div><div style={{fontWeight:600,fontSize:12}}>{v}</div></div>)}</div>
{!isDent&&<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{Object.entries(SL).map(([k,l])=><button key={k} onClick={()=>chSt(a.id,k)} style={{border:"2px solid "+SC[k],background:a.status===k?SC[k]:"#fff",color:a.status===k?"#fff":SC[k],borderRadius:20,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer"}}>{l}</button>)}</div>}
<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{p?.phone&&<Btn ch="📱 WA" v="w" sm onClick={()=>wa(p.phone,`Olá ${p.name}! Consulta: ${fmt(a.date)} às ${a.time}.`)}/>}{!isDent&&<Btn ch="Editar" sm onClick={()=>{setEdit(a);setF({...a,patientId:String(a.patientId),dentistId:String(a.dentistId)});setViewA(null);setModal(true);}}/>}<Btn ch="Fechar" v="g" sm onClick={()=>setViewA(null)}/></div>
</div>}/>;})()} 
<Modal open={modal} close={()=>setModal(false)} title={edit?"Editar":"Novo Agendamento"} wide ch={<div style={{display:"flex",flexDirection:"column",gap:11}}>
<R2 a={<Sel lb="Dentista" val={String(f.dentistId)} set={upd("dentistId")} opts={dents.map(d=>({v:d.id,l:d.name}))}/>} b={<PatSearch lb="Paciente" val={f.patientId} set={upd("patientId")} pats={pats}/>}/>
<R2 a={<Inp lb="Data" val={f.date} set={upd("date")} type="date"/>} b={<Sel lb="Horário" val={f.time} set={upd("time")} opts={[{v:"",l:"Selecione..."},...SLOTS]}/>}/>
<R2 a={<Sel lb="Procedimento" val={f.procedure} set={upd("procedure")} opts={[{v:"",l:"Selecione..."},...PROCS0.map(p=>({v:p.name,l:p.name}))]}/>} b={<Inp lb="Valor (R$)" val={f.value} set={upd("value")} type="number"/>}/>
<R2 a={<Sel lb="Pagamento" val={f.payment} set={upd("payment")} opts={PAY}/>} b={<Sel lb="Status" val={f.status} set={upd("status")} opts={Object.entries(SL).map(([v,l])=>({v,l}))}/>}/>
<SC2 save={save} cancel={()=>setModal(false)}/>
</div>}/>
</div>;
}

function Lembretes({rems,setRems,pats,recs,appts,user}){
const [filt,setFilt]=useState("pending");
const [modal,setModal]=useState(false);
const [edit,setEdit]=useState(null);
const b0={title:"",desc:"",date:today(),priority:"medium",done:false,patientId:""};
const [f,setF]=useState(b0);
const upd=k=>v=>setF(p=>({...p,[k]:v}));
const ar=autoRems(pats,recs,appts);
const all=[...ar,...rems];
const flt=all.filter(r=>filt==="all"?true:filt==="pending"?!r.done:r.done).sort((a,b)=>a.date.localeCompare(b.date));
const t=today();
const save=()=>{if(!f.title)return;const obj={...f,patientId:f.patientId?Number(f.patientId):null,id:edit?edit.id:nid(rems)};setRems(prev=>edit?prev.map(r=>r.id===edit.id?obj:r):[...prev,obj]);setModal(false);};
const tog=id=>{if(typeof id==="string")return;setRems(prev=>prev.map(r=>r.id===id?{...r,done:!r.done}:r));};
const PRIO={high:"Alta",medium:"Média",low:"Baixa"};
const PRIOC={high:G.red,medium:G.yellow,low:G.primary};
return <div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
<h2 style={{fontFamily:"Cormorant Garamond",fontSize:26}}>Lembretes</h2>
<Btn ch="+ Novo" onClick={()=>{setEdit(null);setF(b0);setModal(true);}}/>
</div>
<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
{[["pending","Pendentes"],["done","Concluídos"],["all","Todos"]].map(([k,l])=><button key={k} onClick={()=>setFilt(k)} style={{border:"none",background:filt===k?G.primary:G.card,color:filt===k?"#fff":G.muted,borderRadius:20,padding:"5px 13px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{l}</button>)}
</div>
<div style={{display:"flex",flexDirection:"column",gap:7}}>
{flt.length===0&&<div style={{background:G.card,borderRadius:12,padding:"20px",textAlign:"center",color:G.muted,fontSize:13}}>Nenhum lembrete</div>}
{flt.map(r=>{const p=r.patientId?pats.find(x=>x.id===r.patientId):null;const late=!r.done&&r.date<t;const isA=r.type;
return <div key={r.id} style={{background:r.done?G.bg:G.card,borderRadius:12,padding:"11px 14px",boxShadow:"0 1px 4px rgba(0,0,0,.07)",display:"flex",gap:10,alignItems:"flex-start",opacity:r.done?.6:1,borderLeft:"4px solid "+PRIOC[r.priority||"medium"]}}>
<div onClick={()=>tog(r.id)} style={{display:"flex",alignItems:"center",justifyContent:"center",width:22,height:22,borderRadius:"50%",border:"2px solid "+(r.done?G.success:PRIOC[r.priority||"medium"]),background:r.done?G.success:"transparent",cursor:"pointer",flexShrink:0,marginTop:2}}>{r.done&&<span style={{color:"#fff",fontSize:12,fontWeight:700}}>✓</span>}</div>
<div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,textDecoration:r.done?"line-through":"none"}}>{r.title}</div>
{r.desc&&<div style={{fontSize:12,color:G.muted,marginTop:1}}>{r.desc}</div>}
<div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
{isA?<Bdg l="Auto" col={G.blue} sm/>:<Bdg l={PRIO[r.priority||"medium"]} col={PRIOC[r.priority||"medium"]} sm/>}
<span style={{fontSize:11,color:late?G.red:G.muted,fontWeight:late?700:400}}>📅 {fmt(r.date)}{late?" — ATRASADO":""}</span>
{p&&<span style={{fontSize:11,color:G.muted}}>👤 {p.name}</span>}</div></div>
<div style={{display:"flex",gap:4,flexDirection:"column",alignItems:"flex-end"}}>
{p?.phone&&!r.done&&<Btn ch="📱" v="w" sm onClick={()=>wa(p.phone,`Olá ${p.name}! 😊 ${r.desc||r.title}`)}/>}
{!isA&&<Btn ch="✕" v="r" sm onClick={()=>{if(typeof r.id!=="string")setRems(prev=>prev.filter(x=>x.id!==r.id));}}/>}
</div></div>;})}
</div>
<Modal open={modal} close={()=>setModal(false)} title="Novo Lembrete" ch={<div style={{display:"flex",flexDirection:"column",gap:11}}>
<Inp lb="Título" val={f.title} set={upd("title")}/>
<Txt lb="Descrição" val={f.desc} set={upd("desc")} rows={2}/>
<R2 a={<Inp lb="Data" val={f.date} set={upd("date")} type="date"/>} b={<Sel lb="Prioridade" val={f.priority} set={upd("priority")} opts={Object.entries(PRIO).map(([v,l])=>({v,l}))}/>}/>
<PatSearch lb="Paciente" val={f.patientId} set={upd("patientId")} pats={pats} optional/>
<SC2 save={save} cancel={()=>setModal(false)}/>
</div>}/>
</div>;
}

function Proteses({pros,setPros,pats,dents,labs,user}){
const [filt,setFilt]=useState("waiting");
const [modal,setModal]=useState(false);const [edit,setEdit]=useState(null);
const b0={patientId:"",dentistId:dents[0]?.id||1,labId:"",type:PROS_T[0],proc:"",tooth:"",sent:today(),due:"",returned:"",status:"waiting",notes:"",price:""};
const [f,setF]=useState(b0);
const t=today();
const flt=filt==="all"?pros:pros.filter(p=>p.status===filt);
return <div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
<h2 style={{fontFamily:"Cormorant Garamond",fontSize:26}}>Próteses</h2>
<Btn ch="+ Nova" onClick={()=>{setEdit(null);setF(b0);setModal(true);}}/>
</div>
<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
{[{k:"waiting",l:"Aguardando",c:G.yellow},{k:"returned",l:"Retornou",c:G.blue},{k:"placed",l:"Instaladas",c:G.success},{k:"all",l:"Todas",c:G.muted}].map(({k,l,c})=><button key={k} onClick={()=>setFilt(k)} style={{border:`2px solid ${filt===k?c:G.border}`,background:filt===k?c:"#fff",color:filt===k?"#fff":G.muted,borderRadius:20,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{l}</button>)}
</div>
{flt.length===0&&<div style={{background:G.card,borderRadius:12,padding:28,textAlign:"center"}}><div style={{fontSize:28,marginBottom:6}}>✅</div><div style={{fontWeight:700,color:G.success}}>Nenhuma prótese neste filtro</div></div>}
{flt.map(p=>{const pat=pats.find(x=>x.id===p.patientId);const den=dents.find(x=>x.id===p.dentistId)||dents[0];const lab=labs.find(x=>x.id===p.labId);const late=p.status==="waiting"&&p.due&&p.due<t;
return <div key={p.id} style={{background:G.card,borderRadius:12,padding:"13px 15px",boxShadow:"0 1px 4px rgba(0,0,0,.07)",borderLeft:`4px solid ${late?G.red:PROS_SC[p.status]}`}}>
<div style={{display:"flex",gap:11,flexWrap:"wrap"}}>
<div style={{flex:1}}>
<div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}><span style={{fontWeight:700,fontSize:13}}>{pat?.name}</span><Bdg l={PROS_SL[p.status]} col={PROS_SC[p.status]} sm/>{late&&<Bdg l="⚠ ATRASADO" col={G.red} sm/>}</div>
<div style={{fontSize:12}}>🦷 <strong>{p.type}</strong></div>
<div style={{fontSize:11,color:G.muted,marginTop:2}}>Dente: {p.tooth||"—"} · {lab?.name} · Enviado: {fmt(p.sent)} · Previsão: {fmt(p.due)}</div>
<div style={{fontSize:11,color:den.color}}>👨‍⚕️ {den.name}</div>
</div>
<div style={{display:"flex",flexDirection:"column",gap:5,alignItems:"flex-end"}}>
{p.status==="waiting"&&<Btn ch="📦 Chegou!" sm onClick={()=>setPros(prev=>prev.map(x=>x.id===p.id?{...x,status:"returned",returned:t}:x))}/>}
{p.status==="returned"&&<Btn ch="✓ Instalada" v="y" sm onClick={()=>setPros(prev=>prev.map(x=>x.id===p.id?{...x,status:"placed"}:x))}/>}
<Btn ch="Editar" v="g" sm onClick={()=>{setEdit(p);setF({...p,patientId:String(p.patientId),dentistId:String(p.dentistId),labId:String(p.labId),price:String(p.price||"")});setModal(true);}}/>
</div>
</div>
</div>;})}
<Modal open={modal} close={()=>setModal(false)} title={edit?"Editar Prótese":"Nova Prótese"} wide ch={<div style={{display:"flex",flexDirection:"column",gap:12}}>
<R2 a={<PatSearch lb="Paciente" val={f.patientId} set={v=>setF(p=>({...p,patientId:v}))} pats={pats}/>} b={<Sel lb="Dentista" val={String(f.dentistId)} set={v=>setF(p=>({...p,dentistId:v}))} opts={dents.map(d=>({v:String(d.id),l:d.name}))}/>}/>
<R2 a={<Sel lb="Laboratório" val={String(f.labId)} set={v=>setF(p=>({...p,labId:v}))} opts={[{v:"",l:"Selecione..."},...labs.map(l=>({v:String(l.id),l:l.name}))]}/>} b={<Inp lb="Dente(s)" val={f.tooth} set={v=>setF(p=>({...p,tooth:v}))} ph="Ex: 16"/>}/>
<R2 a={<Sel lb="Tipo" val={f.type} set={v=>setF(p=>({...p,type:v}))} opts={PROS_T}/>} b={<Inp lb="Custo Lab (R$)" val={f.price} set={v=>setF(p=>({...p,price:v}))} type="number"/>}/>
<R2 a={<Inp lb="Data de Envio" val={f.sent} set={v=>setF(p=>({...p,sent:v}))} type="date"/>} b={<Inp lb="Previsão Retorno" val={f.due} set={v=>setF(p=>({...p,due:v}))} type="date"/>}/>
<Txt lb="Observações" val={f.notes} set={v=>setF(p=>({...p,notes:v}))} rows={2}/>
<SC2 save={()=>{if(!f.patientId||!f.labId)return alert("Informe paciente e laboratório");const obj={...f,patientId:Number(f.patientId),dentistId:Number(f.dentistId),labId:Number(f.labId),price:Number(f.price||0),id:edit?edit.id:nid(pros)};setPros(prev=>edit?prev.map(p=>p.id===edit.id?obj:p):[...prev,obj]);setModal(false);}} cancel={()=>setModal(false)}/>
</div>}/>
</div>;
}

function Financeiro({recs,pats,dents,expenses}){
const [mo,setMo]=useState(today().slice(0,7));
const mr=recs.filter(r=>r.date.startsWith(mo)&&r.paid>0);
const raw=mr.reduce((s,r)=>s+r.paid,0);
const liq=mr.reduce((s,r)=>s+calcNet(r.paid,r.payment),0);
const clinicExp=(expenses.clinic||[]).filter(e=>e.date.startsWith(mo)).reduce((s,e)=>s+Number(e.value||0),0);
const PC={"Dinheiro":G.success,"PIX":"#00B894","Cartão Crédito":G.blue,"Cartão Débito":"#6C5CE7","Convênio":G.muted,"Cheque":G.orange};
const byP=PAY.map(pt=>({pt,v:mr.filter(r=>r.payment===pt).reduce((s,r)=>s+r.paid,0)})).filter(x=>x.v>0);
const mx=Math.max(...byP.map(x=>x.v),1);
return <div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
<h2 style={{fontFamily:"Cormorant Garamond",fontSize:26}}>Financeiro</h2>
<Inp val={mo} set={setMo} type="month" style={{width:160}}/>
</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:11}}>
{[["Receita Bruta",raw,G.primary],["Receita Líquida",liq,G.success],["Despesas",clinicExp,G.red],["Resultado",liq-clinicExp,liq-clinicExp>=0?G.success:G.red]].map(([l,v,c])=><div key={l} style={{background:G.card,borderRadius:10,padding:"12px 14px",textAlign:"center",borderTop:`4px solid ${c}`,boxShadow:"0 1px 4px rgba(0,0,0,.07)"}}><div style={{fontSize:10,color:G.muted,fontWeight:700,marginBottom:4}}>{l}</div><div style={{fontFamily:"Cormorant Garamond",fontSize:22,color:c}}>{cur(v)}</div></div>)}
</div>
<div style={{background:G.card,borderRadius:12,padding:15,boxShadow:"0 1px 4px rgba(0,0,0,.07)"}}>
<div style={{fontWeight:700,marginBottom:12,fontSize:13}}>Por Forma de Pagamento</div>
{byP.length===0&&<p style={{color:G.muted,fontSize:12}}>Nenhum recebimento</p>}
{byP.map(({pt,v})=><div key={pt} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,fontWeight:600}}>{pt}</span><span style={{fontSize:12,fontWeight:700}}>{cur(v)}</span></div><div style={{background:G.border,borderRadius:6,height:10}}><div style={{background:PC[pt]||G.muted,height:10,borderRadius:6,width:`${v/mx*100}%`}}/></div></div>)}
</div>
<div style={{background:G.card,borderRadius:12,padding:15,boxShadow:"0 1px 4px rgba(0,0,0,.07)"}}>
<div style={{fontWeight:700,marginBottom:11,fontSize:13}}>Detalhamento</div>
{mr.length===0&&<p style={{color:G.muted,fontSize:12}}>Nenhum recebimento</p>}
{mr.sort((a,b)=>a.date.localeCompare(b.date)).map(r=>{const p=pats.find(x=>x.id===r.patientId);const d=dents.find(x=>x.id===r.dentistId)||dents[0];return <div key={r.id} style={{display:"flex",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${G.border}`,gap:8,flexWrap:"wrap"}}><span style={{color:G.muted,fontSize:11,minWidth:70}}>{fmt(r.date)}</span><div style={{flex:1,minWidth:80}}><span style={{fontSize:12}}>{p?.name} — {r.procedure}</span></div><span style={{fontSize:11,color:d.color,fontWeight:600}}>{d.name.split(" ")[0]}</span><Bdg l={r.payment} col={PC[r.payment]||G.muted} sm/><span style={{fontWeight:700,fontSize:12}}>{cur(r.paid)}</span></div>;})}
</div>
</div>;
}

function Estoque({stock,setStock}){
const [modal,setModal]=useState(false);const [mv,setMv]=useState(null);const [edit,setEdit]=useState(null);
const b0={name:"",qty:0,unit:"un",min:1,price:0,movs:[]};
const [f,setF]=useState(b0);const upd=k=>v=>setF(p=>({...p,[k]:v}));
const [m,setM]=useState({t:"in",q:"",note:"",date:today()});
const save=()=>{if(!f.name)return;const obj={...f,qty:Number(f.qty),min:Number(f.min),price:Number(f.price),id:edit?edit.id:nid(stock)};setStock(prev=>edit?prev.map(s=>s.id===edit.id?obj:s):[...prev,obj]);setModal(false);};
const addMov=()=>{if(!m.q)return;const q=Number(m.q);setStock(prev=>prev.map(s=>s.id===mv?{...s,qty:m.t==="in"?s.qty+q:Math.max(0,s.qty-q),movs:[{t:m.t,q,date:m.date,note:m.note},...(s.movs||[])]}:s));setMv(null);};
return <div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
<h2 style={{fontFamily:"Cormorant Garamond",fontSize:26}}>Estoque</h2>
<Btn ch="+ Novo Item" onClick={()=>{setEdit(null);setF(b0);setModal(true);}}/>
</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:11}}>
{stock.map(s=>{const low=s.qty<=s.min;return <div key={s.id} style={{background:G.card,borderRadius:12,padding:13,boxShadow:"0 1px 4px rgba(0,0,0,.07)",borderLeft:`4px solid ${low?G.red:G.success}`}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{fontWeight:700,fontSize:13}}>{s.name}</div><div style={{fontSize:11,color:G.muted}}>Custo: {cur(s.price)}/{s.unit}</div></div><div style={{textAlign:"right"}}><div style={{fontFamily:"Cormorant Garamond",fontSize:24,color:low?G.red:G.success,lineHeight:1}}>{s.qty}</div><div style={{fontSize:10,color:G.muted}}>{s.unit}</div></div></div>
{low&&<div style={{background:G.red+"15",borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:700,color:G.red,marginTop:5}}>⚠ Estoque baixo!</div>}
<div style={{display:"flex",gap:5,marginTop:9}}><Btn ch="+ Entrada" sm onClick={()=>{setM({t:"in",q:"",note:"",date:today()});setMv(s.id);}}/><Btn ch="- Saída" v="y" sm onClick={()=>{setM({t:"out",q:"",note:"",date:today()});setMv(s.id);}}/><Btn ch="✏️" v="g" sm onClick={()=>{setEdit(s);setF({...s});setModal(true);}}/></div>
</div>;})}
</div>
<Modal open={modal} close={()=>setModal(false)} title={edit?"Editar Item":"Novo Item"} ch={<div style={{display:"flex",flexDirection:"column",gap:11}}>
<Inp lb="Nome" val={f.name} set={upd("name")}/><R2 a={<Inp lb="Qtd." val={String(f.qty)} set={upd("qty")} type="number"/>} b={<Inp lb="Unidade" val={f.unit} set={upd("unit")} ph="un/cx/ml"/>}/>
<R2 a={<Inp lb="Qtd. Mínima" val={String(f.min)} set={upd("min")} type="number"/>} b={<Inp lb="Preço (R$)" val={String(f.price)} set={upd("price")} type="number"/>}/>
<SC2 save={save} cancel={()=>setModal(false)}/></div>}/>
<Modal open={!!mv} close={()=>setMv(null)} title={m.t==="in"?"Entrada":"Saída"} ch={<div style={{display:"flex",flexDirection:"column",gap:11}}>
<R2 a={<Inp lb="Quantidade" val={m.q} set={v=>setM(p=>({...p,q:v}))} type="number"/>} b={<Inp lb="Data" val={m.date} set={v=>setM(p=>({...p,date:v}))} type="date"/>}/>
<Inp lb="Motivo" val={m.note} set={v=>setM(p=>({...p,note:v}))}/><SC2 save={addMov} cancel={()=>setMv(null)} lbl="Registrar"/></div>}/>
</div>;
}

function Admin({users,setUsers,procs,setProcs,dents,labs,user}){
const [tab,setTab]=useState("users");
const [um,setUm]=useState(false);const [eu,setEu]=useState(null);
const b0={name:"",role:"Recepcionista",level:2,login:"",pass:"",dentistId:"",color:UCOLS[0],active:true};
const [uf,setUf]=useState(b0);const fu=k=>v=>setUf(p=>({...p,[k]:v}));
if(user.level<3)return <div style={{background:G.card,borderRadius:13,padding:30,textAlign:"center"}}><p style={{color:G.red,fontSize:15}}>🔒 Acesso restrito ao Administrador</p></div>;
const saveU=()=>{if(!uf.name||!uf.login)return;const obj={...uf,dentistId:uf.dentistId?Number(uf.dentistId):null,id:eu?eu.id:nid(users)};setUsers(prev=>eu?prev.map(u=>u.id===eu.id?obj:u):[...prev,obj]);setUm(false);};
return <div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">
<h2 style={{fontFamily:"Cormorant Garamond",fontSize:26}}>Administrativo</h2>
<div style={{display:"flex",gap:0,borderBottom:`2px solid ${G.border}`}}>
{[["users","Usuários"],["procs","Procedimentos"],["labs","Laboratórios"]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={{border:"none",background:"none",padding:"9px 15px",fontFamily:"DM Sans",fontWeight:700,fontSize:12,cursor:"pointer",color:tab===k?G.primary:G.muted,borderBottom:`3px solid ${tab===k?G.primary:"transparent"}`,marginBottom:-2}}>{l}</button>)}
</div>
{tab==="users"&&<div style={{display:"flex",flexDirection:"column",gap:9}}>
<div style={{textAlign:"right"}}><Btn ch="+ Novo Usuário" sm onClick={()=>{setEu(null);setUf(b0);setUm(true);}}/></div>
{users.map(u=><div key={u.id} style={{background:G.card,borderRadius:11,padding:"11px 14px",boxShadow:"0 1px 4px rgba(0,0,0,.07)",display:"flex",alignItems:"center",gap:11,borderLeft:`4px solid ${u.color}`}}>
<div style={{width:34,height:34,borderRadius:"50%",background:u.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:13,flexShrink:0}}>{u.name[0]}</div>
<div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{u.name}</div><div style={{fontSize:11,color:G.muted}}>{u.role} · {u.login} · Nível {u.level}</div></div>
<Bdg l={u.active?"Ativo":"Inativo"} col={u.active?G.success:G.red} sm/>
<Btn ch="Editar" v="g" sm onClick={()=>{setEu(u);setUf({...u,dentistId:String(u.dentistId||"")});setUm(true);}}/>
</div>)}
</div>}
{tab==="procs"&&<div style={{display:"flex",flexDirection:"column",gap:9}}>
{procs.map(p=><div key={p.id} style={{background:G.card,borderRadius:10,padding:"9px 14px",boxShadow:"0 1px 4px rgba(0,0,0,.07)",display:"flex",alignItems:"center",gap:11}}><span style={{flex:1,fontWeight:700,fontSize:13}}>{p.name}</span><span style={{fontWeight:700,color:G.primary}}>{cur(p.price)}</span></div>)}
</div>}
{tab==="labs"&&<div style={{display:"flex",flexDirection:"column",gap:9}}>
{labs.map(l=><div key={l.id} style={{background:G.card,borderRadius:10,padding:"11px 14px",boxShadow:"0 1px 4px rgba(0,0,0,.07)"}}><div style={{fontWeight:700,fontSize:13}}>{l.name}</div><div style={{fontSize:12,color:G.muted}}>{l.contact} · {l.phone}</div></div>)}
</div>}
<Modal open={um} close={()=>setUm(false)} title={eu?"Editar Usuário":"Novo Usuário"} wide ch={<div style={{display:"flex",flexDirection:"column",gap:11}}>
<Inp lb="Nome completo" val={uf.name} set={fu("name")}/>
<R2 a={<Inp lb="Login" val={uf.login} set={fu("login")}/>} b={<Inp lb="Senha" type="password" val={uf.pass} set={fu("pass")}/>}/>
<Sel lb="Nível" val={String(uf.level)} set={v=>fu("level")(Number(v))} opts={[{v:1,l:"1 - Dentista"},{v:2,l:"2 - Recepção"},{v:3,l:"3 - Admin"}]}/>
<label style={{display:"flex",gap:8,alignItems:"center",fontSize:13,cursor:"pointer"}}><input type="checkbox" checked={uf.active} onChange={e=>fu("active")(e.target.checked)}/> Usuário ativo</label>
<SC2 save={saveU} cancel={()=>setUm(false)}/>
</div>}/>
</div>;
}

function App(){
const [user,setUser]=useState(null);const [view,setView]=useState("dash");const [sideOpen,setSideOpen]=useState(false);
const [pats,setPats]=useState(PATS0);const [appts,setAppts]=useState(APPTS0);
const [recs,setRecs]=useState(RECS0);const [pros,setPros]=useState(PROS0);
const [rems,setRems]=useState(REMS0);const [users,setUsers]=useState(USERS0);
const [dents,setDents]=useState(DENTS0);const [labs,setLabs]=useState(LABS0);
const [procs,setProcs]=useState(PROCS0);const [stock,setStock]=useState(STOCK0);
const [expenses,setExpenses]=useState(EXPENSES0);
if(!user)return <Login users={users} onLogin={setUser}/>;
const ar=autoRems(pats,recs,appts);
const remBadge=[...ar,...rems.filter(r=>!r.done)].filter(r=>r.date<=today()).length;
const prosBadge=pros.filter(p=>p.due===today()&&p.status==="waiting").length;
const ALL_NAV=[{id:"dash",l:"🏠 Visão Geral",lv:1},{id:"agenda",l:"📅 Agenda",lv:1},{id:"pacs",l:"👥 Pacientes",lv:1},{id:"pros",l:"🏥 Próteses",lv:2,b:prosBadge},{id:"lems",l:"📌 Lembretes",lv:1,b:remBadge},{id:"fin",l:"💰 Financeiro",lv:2},{id:"stk",l:"📦 Estoque",lv:2},{id:"adm",l:"⚙️ Administrativo",lv:3}];
const NAV=ALL_NAV.filter(n=>n.lv<=user.level);
const go=v=>{setView(v);setSideOpen(false);};
const BOTTOM_NAV=[{id:"dash",icon:"🏠"},{id:"agenda",icon:"📅"},{id:"pacs",icon:"👥"},{id:"lems",icon:"📌",b:remBadge},{id:"pros",icon:"🏥",b:prosBadge}];
return <>
{sideOpen&&<div className="sidebar-overlay" onClick={()=>setSideOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:499}}/>}
<div style={{display:"flex",minHeight:"100vh"}}>
<div className={`sidebar${sideOpen?"":" closed"}`} style={{background:`linear-gradient(180deg,${G.primary},#0a2e1e)`,display:"flex",flexDirection:"column",padding:"14px 10px",gap:2,flexShrink:0}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"6px 4px 14px"}}>
<div><div style={{fontFamily:"Cormorant Garamond",fontSize:18,color:"#fff",lineHeight:1.2}}>🦷 Affonso</div><div style={{fontFamily:"Cormorant Garamond",fontSize:12,color:"rgba(255,255,255,.65)"}}>Odontologia</div></div>
<button onClick={()=>setSideOpen(false)} style={{border:"none",background:"rgba(255,255,255,.15)",borderRadius:7,color:"#fff",fontSize:16,cursor:"pointer",padding:"4px 8px",lineHeight:1}}>✕</button>
</div>
{NAV.map(n=><button key={n.id} onClick={()=>go(n.id)} style={{background:view===n.id?"rgba(255,255,255,.2)":"transparent",border:"none",borderRadius:8,padding:"9px 11px",cursor:"pointer",color:"#fff",fontFamily:"DM Sans",fontWeight:600,fontSize:12,display:"flex",alignItems:"center",gap:8,textAlign:"left"}}><span style={{flex:1}}>{n.l}</span>{n.b>0&&<span style={{background:G.red,color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:9,fontWeight:700}}>{n.b}</span>}</button>)}
<div style={{marginTop:"auto",borderTop:"1px solid rgba(255,255,255,.12)",paddingTop:10}}>
<div style={{fontSize:10,color:"rgba(255,255,255,.5)",marginBottom:4,paddingLeft:3}}>{user.name}</div>
<button onClick={()=>setUser(null)} style={{border:"none",background:"rgba(255,255,255,.1)",borderRadius:8,padding:"6px 11px",color:"rgba(255,255,255,.7)",fontSize:11,fontWeight:600,cursor:"pointer",width:"100%",textAlign:"left"}}>🚪 Sair</button>
</div>
</div>
<div className="main-content" style={{flex:1,overflowY:"auto",minWidth:0}}>
<div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:G.primary,position:"sticky",top:0,zIndex:100}} className="mobile-topbar">
<button onClick={()=>setSideOpen(true)} style={{border:"none",background:"rgba(255,255,255,.15)",borderRadius:8,color:"#fff",fontSize:18,cursor:"pointer",padding:"6px 10px",lineHeight:1,flexShrink:0}}>☰</button>
<div style={{flex:1,fontFamily:"Cormorant Garamond",fontSize:16,color:"#fff",fontWeight:700}}>{NAV.find(n=>n.id===view)?.l||"Visão Geral"}</div>
{remBadge>0&&<span style={{background:G.red,color:"#fff",borderRadius:10,padding:"2px 8px",fontSize:10,fontWeight:700}}>{remBadge}</span>}
</div>
<div style={{padding:"16px"}}>
{view==="dash"&&<Dashboard appts={appts} pats={pats} recs={recs} rems={rems} pros={pros} dents={dents} setView={go} user={user}/>}
{view==="agenda"&&<Agenda appts={appts} setAppts={setAppts} pats={pats} dents={dents} procs={procs} user={user}/>}
{view==="pacs"&&<Pacientes pats={pats} setPats={setPats} recs={recs} dents={dents} procs={procs} user={user}/>}
{view==="pros"&&<Proteses pros={pros} setPros={setPros} pats={pats} dents={dents} labs={labs} user={user}/>}
{view==="lems"&&<Lembretes rems={rems} setRems={setRems} pats={pats} recs={recs} appts={appts} user={user}/>}
{view==="fin"&&<Financeiro recs={recs} pats={pats} dents={dents} expenses={expenses}/>}
{view==="stk"&&<Estoque stock={stock} setStock={setStock}/>}
{view==="adm"&&<Admin users={users} setUsers={setUsers} procs={procs} setProcs={setProcs} dents={dents} labs={labs} user={user}/>}
</div>
</div>
</div>
<div className="bottom-nav" style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:`1.5px solid ${G.border}`,display:"flex",zIndex:400,boxShadow:"0 -2px 12px rgba(0,0,0,.08)"}}>
{BOTTOM_NAV.map(n=>{const active=view===n.id;return <button key={n.id+n.icon} onClick={()=>go(n.id)} style={{flex:1,border:"none",background:"transparent",padding:"10px 0 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer",color:active?G.primary:G.muted,position:"relative"}}>
{n.b>0&&<span style={{position:"absolute",top:6,right:"18%",background:G.red,color:"#fff",borderRadius:10,padding:"0 4px",fontSize:8,fontWeight:700}}>{n.b}</span>}
<span style={{fontSize:20}}>{n.icon}</span>
<span style={{fontSize:9,fontWeight:700}}>{NAV.find(x=>x.id===n.id)?.l?.slice(2)||""}</span>
{active&&<div style={{position:"absolute",bottom:0,left:"20%",right:"20%",height:3,background:G.primary,borderRadius:"3px 3px 0 0"}}/>}
</button>;})}
</div>
</>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
</script>
</body>
</html>
