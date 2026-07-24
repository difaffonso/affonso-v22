import { useState, useEffect, useRef, Fragment } from "react";

const SUPA_URL="https://ncfsepyzrqaljswjiuiv.supabase.co";
const SUPA_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZnNlcHl6cnFhbGpzd2ppdWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MTg1NzYsImV4cCI6MjA5NDA5NDU3Nn0.j_7sctB2bP0zljxPbh3Q4I_MzEksgL8PO5QNdzbaJDM";
// === AUTENTICACAO (Supabase Auth) — protecao de acesso ===
let __ACCESS=null,__REFRESH=null,__EXP=0,__REFTIMER=null;
function __authTok(){return __ACCESS||SUPA_KEY;}
function __authed(){return !!__ACCESS;}
function __scheduleRefresh(){try{if(__REFTIMER)clearTimeout(__REFTIMER);}catch(e){}var ms=Math.max(30000,(__EXP-Date.now())-120000);__REFTIMER=setTimeout(function(){__doRefresh();},ms);}
let __lastAuthErr="";async function __signIn(login,pass){__lastAuthErr="";var r;try{var email=String(login||"").trim().toLowerCase()+"@affonso.local";r=await fetch(SUPA_URL+"/auth/v1/token?grant_type=password",{method:"POST",headers:{"apikey":SUPA_KEY,"Content-Type":"application/json"},body:JSON.stringify({email:email,password:pass})});}catch(e){__lastAuthErr="network";return false;}try{if(r.status>=400&&r.status<500){__lastAuthErr="invalid";return false;}if(!r.ok){__lastAuthErr="server";return false;}var t=await r.json();if(!t||!t.access_token){__lastAuthErr="invalid";return false;}__ACCESS=t.access_token;__REFRESH=t.refresh_token||null;__EXP=Date.now()+((t.expires_in||3600)*1000);__scheduleRefresh();return true;}catch(e){__lastAuthErr="server";return false;}}
async function __doRefresh(){try{if(!__REFRESH)return false;var r=await fetch(SUPA_URL+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{"apikey":SUPA_KEY,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:__REFRESH})});if(!r.ok)return false;var t=await r.json();if(!t||!t.access_token)return false;__ACCESS=t.access_token;__REFRESH=t.refresh_token||__REFRESH;__EXP=Date.now()+((t.expires_in||3600)*1000);__scheduleRefresh();return true;}catch(e){return false;}}
// V209: sincroniza a senha REAL de login (Supabase Auth) via Edge Function 'admin-users'.
async function __syncCred(login,pass){try{if(!__ACCESS)return {ok:false,msg:"Sessão expirada. Saia e entre novamente."};var r=await fetch(SUPA_URL+"/functions/v1/admin-users",{method:"POST",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__ACCESS,"Content-Type":"application/json"},body:JSON.stringify({login:String(login||"").trim().toLowerCase(),pass:pass})});var d=null;try{d=await r.json();}catch(e){}if(r.ok&&d&&d.ok)return {ok:true,created:!!d.created};return {ok:false,msg:(d&&d.msg)||("Erro "+r.status)};}catch(e){return {ok:false,msg:"Sem conexão com o servidor"};}}
function __signOut(){__ACCESS=null;__REFRESH=null;__EXP=0;try{if(__REFTIMER)clearTimeout(__REFTIMER);}catch(e){}}
try{if(typeof window!=="undefined")window.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible"&&__ACCESS&&(__EXP-Date.now()<180000))__doRefresh();});}catch(e){}
// V198: cache local em IndexedDB. Guarda o banco e os pacientes no aparelho para
// login instantaneo e para baixar apenas o que mudou (corte de egress do Supabase).
// Se o navegador nao suportar/bloquear (aba anonima), tudo cai no caminho antigo.
const idb={
  _db:null,
  open(){var self=this;return new Promise(function(res){if(self._db)return res(self._db);try{if(typeof indexedDB==="undefined")return res(null);var rq=indexedDB.open("affonso_cache",1);rq.onupgradeneeded=function(){try{rq.result.createObjectStore("kv");}catch(e){}};rq.onsuccess=function(){self._db=rq.result;res(self._db);};rq.onerror=function(){res(null);};rq.onblocked=function(){res(null);};}catch(e){res(null);}});},
  async get(k){var db=await this.open();if(!db)return null;return new Promise(function(res){try{var rq=db.transaction("kv","readonly").objectStore("kv").get(k);rq.onsuccess=function(){res(rq.result==null?null:rq.result);};rq.onerror=function(){res(null);};}catch(e){res(null);}});},
  async set(k,v){var db=await this.open();if(!db)return false;return new Promise(function(res){try{var rq=db.transaction("kv","readwrite").objectStore("kv").put(v,k);rq.onsuccess=function(){res(true);};rq.onerror=function(){res(false);};}catch(e){res(false);}});}
};
const supabase={
async loadFull(){try{const r=await fetch(SUPA_URL+"/rest/v1/clinic_data?id=eq.main&select=data,updated_at",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok()}});const rows=await r.json();if(rows&&rows[0]&&rows[0].data&&Object.keys(rows[0].data).length>0)return {data:rows[0].data,updated_at:rows[0].updated_at};return null;}catch(e){return null;}},
async load(){const f=await this.loadFull();return f?f.data:null;},
async getTimestamp(){try{const r=await fetch(SUPA_URL+"/rest/v1/clinic_data?id=eq.main&select=updated_at",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok()}});const rows=await r.json();if(rows&&rows[0])return rows[0].updated_at;return null;}catch(e){return null;}},
// V196: no login, baixar apenas a lista de usuarios (poucos KB) em vez do banco inteiro
async loadUsersOnly(){try{const r=await fetch(SUPA_URL+"/rest/v1/clinic_data?id=eq.main&select=users:data->users",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok()}});const rows=await r.json();if(rows&&rows[0]&&Array.isArray(rows[0].users)&&rows[0].users.length)return rows[0].users;return null;}catch(e){return null;}},
async save(data){try{const r=await fetch(SUPA_URL+"/rest/v1/clinic_data?id=eq.main",{method:"PATCH",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok(),"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify({data,updated_at:new Date().toISOString()})});return r.ok;}catch(e){return false;}},
async loadPatients(){if(!SUPA_URL)return null;try{var all=[];var lastId=0;var step=1000;for(var guard=0;guard<500;guard++){var r=await fetch(SUPA_URL+"/rest/v1/patients?select=id,data,updated_at&order=id.asc&limit="+step+"&id=gt."+lastId,{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok()}});if(!r.ok)return all.length?all:null;var rows=await r.json();if(!rows||!rows.length)break;for(var k=0;k<rows.length;k++){all.push(rows[k].data);}lastId=rows[rows.length-1].id;if(rows.length<step)break;}return all;}catch(e){return null;}},
async loadPatientsSince(ts){if(!SUPA_URL)return null;try{var r=await fetch(SUPA_URL+"/rest/v1/patients?select=id,data,updated_at&order=updated_at.asc&updated_at=gt."+encodeURIComponent(ts)+"&limit=1000",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok()}});if(!r.ok)return null;var d=await r.json();return (d||[]).map(function(row){return {id:row.id,data:row.data,ts:row.updated_at};});}catch(e){return null;}},
async deletePatients(ids){if(!SUPA_URL)return {ok:false,msg:"Sem conexao"};if(!ids||!ids.length)return {ok:true};try{var r=await fetch(SUPA_URL+"/rest/v1/patients?id=in.("+ids.map(function(i){return encodeURIComponent(i);}).join(",")+")",{method:"DELETE",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok(),"Prefer":"return=minimal"}});if(!r.ok){var t="";try{t=await r.text();}catch(e){}return {ok:false,status:r.status,msg:t||("Erro "+r.status)};}return {ok:true};}catch(e){return {ok:false,msg:String((e&&e.message)||e)};}}, // V197
async upsertPatients(arr){if(!SUPA_URL)return {ok:false,msg:"Sem conexao"};if(!arr||!arr.length)return {ok:true};var now=new Date().toISOString();var CH=400;for(var i=0;i<arr.length;i+=CH){var chunk=arr.slice(i,i+CH).map(function(p){return {id:p.id,data:p,updated_at:now};});try{var r=await fetch(SUPA_URL+"/rest/v1/patients",{method:"POST",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok(),"Content-Type":"application/json","Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(chunk)});if(!r.ok){var t="";try{t=await r.text();}catch(e){}return {ok:false,status:r.status,msg:t||("Erro "+r.status)};}}catch(e){return {ok:false,msg:String((e&&e.message)||e)};}}return {ok:true};},
async submitAnam(token,payload){if(!SUPA_URL)return {ok:false,msg:"Sem conexao com o banco"};try{const r=await fetch(SUPA_URL+"/rest/v1/anamnese_subs",{method:"POST",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok(),"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify({token:token,payload:payload})});if(r.ok)return {ok:true};var t="";try{t=await r.text();}catch(e){}return {ok:false,status:r.status,msg:t||("Erro "+r.status)};}catch(e){return {ok:false,msg:String((e&&e.message)||e)};}},
async fetchAnam(token){if(!SUPA_URL)return null;try{const r=await fetch(SUPA_URL+"/rest/v1/anamnese_subs?token=eq."+encodeURIComponent(token)+"&select=payload,created_at&order=created_at.desc&limit=1",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok()}});const rows=await r.json();if(rows&&rows[0])return rows[0].payload;return null;}catch(e){return null;}}
,__anamCur:null // V196: cursor incremental - depois da 1a busca (7 dias), so baixa fichas novas (com folga de 15min p/ corridas de sync)
,async fetchAnamRecent(){if(!SUPA_URL)return [];try{var since=this.__anamCur||new Date(Date.now()-7*864e5).toISOString();const r=await fetch(SUPA_URL+"/rest/v1/anamnese_subs?created_at=gte."+encodeURIComponent(since)+"&select=token,payload,created_at&order=created_at.desc&limit=200",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok()}});var rows=await r.json();if(!Array.isArray(rows))return [];var mx=null;rows.forEach(function(x){if(x&&x.created_at&&(!mx||x.created_at>mx))mx=x.created_at;});if(mx){try{this.__anamCur=new Date(Date.parse(mx)-15*60000).toISOString();}catch(e2){}}return rows;}catch(e){return [];}}
// V200: versao economica do poll - retorna so token+created_at (sem payload, ~poucas centenas de bytes).
// Usa o mesmo cursor __anamCur (recuo de 15min p/ tolerar commits fora de ordem); dedup fica no handler.
,async fetchAnamTokens(){if(!SUPA_URL)return [];try{var since=this.__anamCur||new Date(Date.now()-7*864e5).toISOString();const r=await fetch(SUPA_URL+"/rest/v1/anamnese_subs?created_at=gte."+encodeURIComponent(since)+"&select=token,created_at&order=created_at.desc&limit=200",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok()}});var rows=await r.json();if(!Array.isArray(rows))return [];var mx=null;rows.forEach(function(x){if(x&&x.created_at&&(!mx||x.created_at>mx))mx=x.created_at;});if(mx){try{this.__anamCur=new Date(Date.parse(mx)-15*60000).toISOString();}catch(e2){}}return rows;}catch(e){return [];}}
,async loadVers(){if(!SUPA_URL)return null;try{const r=await fetch(SUPA_URL+"/rest/v1/clinic_data?id=eq.main&select=updated_at,vers:data->_vers",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok()}});const rows=await r.json();if(Array.isArray(rows)&&rows.length)return rows[0];return null;}catch(e){return null;}} // V199
,async loadKeys(keys){if(!SUPA_URL||!keys||!keys.length)return null;try{var sel="updated_at,"+keys.map(function(k){return k+":data->"+k;}).join(",");const r=await fetch(SUPA_URL+"/rest/v1/clinic_data?id=eq.main&select="+encodeURIComponent(sel),{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok()}});const rows=await r.json();if(Array.isArray(rows)&&rows.length)return rows[0];return null;}catch(e){return null;}} // V199
,async loadWaMessages(){if(!SUPA_URL)return [];try{const r=await fetch(SUPA_URL+"/rest/v1/wa_messages?select=*&order=id.desc&limit=1000",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok()}});var rows=await r.json();return Array.isArray(rows)?rows:[];}catch(e){return [];}}
// V232: le o registro de envios do SERVIDOR (wa_sent_srv) - fonte da verdade dos follow-ups de orcamento
,async loadWaSentSrv(){if(!SUPA_URL)return {};try{const r=await fetch(SUPA_URL+"/rest/v1/clinic_data?id=eq.wa_sent_srv&select=data",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok()}});var rows=await r.json();if(Array.isArray(rows)&&rows[0]&&rows[0].data&&typeof rows[0].data==="object")return rows[0].data;return {};}catch(e){return {};}}
// V196: versao economica do carregamento de conversas. Na 1a chamada baixa tudo (como antes);
// nas seguintes baixa apenas mensagens novas + a "cauda" (ultimos 60 ids) para capturar
// mudancas de status (enviado -> entregue -> lido). Corta ~95% do egress do polling.
,__waCache:{rows:[],maxId:0,loaded:false}
,async loadWaMessagesLite(){
  if(!SUPA_URL)return [];
  var C=this.__waCache;
  if(!C.loaded&&!C.idbTried){ // V203: recuperar cache persistido (evita rebaixar 1000 msgs a cada recarga)
    C.idbTried=true;
    try{
      var saved=await idb.get("wa_cache_v1");
      if(saved&&Array.isArray(saved.rows)&&saved.rows.length&&saved.maxId){
        C.rows=saved.rows;C.maxId=saved.maxId;C.loaded=true;
      }
    }catch(e){}
  }
  if(!C.loaded){
    var all=await this.loadWaMessages();
    if(Array.isArray(all)){
      C.rows=all.slice();
      C.maxId=0;C.rows.forEach(function(x){if(x&&(x.id||0)>C.maxId)C.maxId=x.id;});
      if(C.rows.length)C.loaded=true; // so trava o cache quando a 1a carga veio com dados (ou banco realmente vazio apos 1a resposta ok)
      else C.loaded=true;
      try{idb.set("wa_cache_v1",{rows:C.rows.slice(0,1000),maxId:C.maxId});}catch(e){} // V203
    }
    return C.rows.slice();
  }
  try{
    var mudou=false;
    // V203: (a) mensagens NOVAS completas (id acima do cursor)
    const r=await fetch(SUPA_URL+"/rest/v1/wa_messages?select=*&order=id.desc&id=gt."+(C.maxId||0)+"&limit=1000",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok()}});
    if(r.ok){
      var rows=await r.json();
      if(Array.isArray(rows)&&rows.length){
        var by={};C.rows.forEach(function(x,i){if(x&&x.id!=null)by[x.id]=i;});
        rows.forEach(function(x){if(!x||x.id==null)return;if(by[x.id]!=null)C.rows[by[x.id]]=x;else C.rows.push(x);if(x.id>C.maxId)C.maxId=x.id;});
        C.rows.sort(function(a,b){return (b.id||0)-(a.id||0);});
        if(C.rows.length>1000)C.rows=C.rows.slice(0,1000);
        mudou=true;
      }
    }
    // V203: (b) SO O STATUS das ultimas 60 (poucos bytes) p/ manter os ticks atualizados
    var since=Math.max(0,(C.maxId||0)-60);
    const rs=await fetch(SUPA_URL+"/rest/v1/wa_messages?select=id,status&id=gt."+since+"&limit=100",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok()}});
    if(rs.ok){
      var sts=await rs.json();
      if(Array.isArray(sts)&&sts.length){
        var byId={};C.rows.forEach(function(x,i){if(x&&x.id!=null)byId[x.id]=i;});
        sts.forEach(function(s){if(!s||s.id==null)return;var i=byId[s.id];if(i!=null&&C.rows[i]&&C.rows[i].status!==s.status){C.rows[i]=Object.assign({},C.rows[i],{status:s.status});mudou=true;}});
      }
    }
    if(mudou){try{idb.set("wa_cache_v1",{rows:C.rows.slice(0,1000),maxId:C.maxId});}catch(e){}}
  }catch(e){}
  return C.rows.slice();
}
,async fetchPortal(token){if(!SUPA_URL)return null;try{const r=await fetch(SUPA_URL+"/rest/v1/rpc/portal_get",{method:"POST",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok(),"Content-Type":"application/json"},body:JSON.stringify({p_token:token})});if(!r.ok)return null;const v=await r.json();return v||null;}catch(e){return null;}}
,async sendPortalAction(token,action){if(!SUPA_URL)return {ok:false};try{const r=await fetch(SUPA_URL+"/rest/v1/portal_actions",{method:"POST",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok(),"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify({token:token,action:action})});return {ok:r.ok};}catch(e){return {ok:false};}}
,async fetchPortalActions(){if(!SUPA_URL)return [];try{var since=new Date(Date.now()-3*864e5).toISOString();const r=await fetch(SUPA_URL+"/rest/v1/portal_actions?created_at=gte."+encodeURIComponent(since)+"&select=token,action,created_at&order=created_at.desc&limit=300",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok()}});var rows=await r.json();return Array.isArray(rows)?rows:[];}catch(e){return [];}}
};
// ── PONTO: gravacao imediata e segura de uma batida (evita corrida entre aparelhos) ──
// Grava direto no servidor em cima da versao mais fresca, com trava otimista por
// updated_at (so grava se ninguem gravou no meio) e reencaixa a batida ate confirmar.
async function pushPontoSupabase(reg){
  if(!SUPA_URL||!reg)return false;
  for(var attempt=0;attempt<6;attempt++){
    try{
      var full=await supabase.loadFull();
      if(full&&full.data){
        var base=full.data;
        var srvP=Array.isArray(base.pontos)?base.pontos:[];
        if(srvP.some(function(p){return p&&String(p.id)===String(reg.id);}))return true;
        base.pontos=srvP.concat([reg]);
        // V230: carimbar a versao da chave "pontos" p/ o delta-sync dos outros aparelhos enxergar a batida (senao a proxima gravacao deles apaga o registro)
        try{if(!base._vers||typeof base._vers!=="object"||Array.isArray(base._vers))base._vers={};base._vers.pontos=new Date().toISOString();}catch(e){}
        var ts0=full.updated_at||null;
        var url=SUPA_URL+"/rest/v1/clinic_data?id=eq.main"+(ts0?("&updated_at=eq."+encodeURIComponent(ts0)):"");
        var r=await fetch(url,{method:"PATCH",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok(),"Content-Type":"application/json","Prefer":"return=representation"},body:JSON.stringify({data:base,updated_at:new Date().toISOString()})});
        if(r.ok){
          var rows=[];try{rows=await r.json();}catch(e){rows=[];}
          if(rows&&rows.length)return true;
        }
      }
    }catch(e){}
    await new Promise(function(res){setTimeout(res,300+attempt*250);});
  }
  return false;
}
const G = {
bg:"var(--bg)",card:"var(--card)",primary:"var(--primary)",accent:"var(--accent)",accentDark:"var(--nm-dark)",
text:"var(--text)",muted:"var(--muted)",red:"var(--red)",yellow:"var(--yellow)",blue:"var(--blue)",
purple:"var(--purple)",border:"var(--border)",success:"var(--green)",orange:"var(--orange)",gold:"var(--gold)",
};

const PERMS0={
1:{label:"Dentista",color:"var(--primary)",
items:[
{id:"agenda_own",    label:"Ver sua agenda",                    val:true, fixed:true},
{id:"prontuario",    label:"Prontuário dos seus pacientes",      val:true, fixed:true},
{id:"anamnese",      label:"Preencher anamnese do paciente",     val:true, fixed:true},
{id:"baixa",         label:"Dar baixa nos procedimentos",        val:true, fixed:true},
{id:"historico",     label:"Registrar atendimentos/histórico",   val:true, fixed:true},
{id:"receituario",   label:"Emitir receituário",                 val:true, fixed:true},
{id:"orcamento_own", label:"Criar orçamentos dos seus pacientes",val:false, fixed:true},
{id:"relatorio_own", label:"Ver seu relatório de produção",      val:true, fixed:true},
{id:"lembretes_own", label:"Ver lembretes relacionados a você",  val:true, fixed:true},
{id:"implantes_own", label:"Ver seus casos de implantes",        val:true, fixed:true},
{id:"proteses_own",  label:"Ver suas próteses",                  val:true, fixed:true},
{id:"agenda_all",    label:"Ver agenda de todos os dentistas",   val:false,fixed:false},
{id:"pats_all",      label:"Acessar todos os pacientes",         val:false,fixed:false},
{id:"financeiro",    label:"Ver financeiro dos pacientes",       val:false,fixed:false},
{id:"lembretes_all", label:"Ver todos os lembretes",             val:false,fixed:false},
{id:"relatorio_all", label:"Ver relatórios de todos dentistas",  val:false,fixed:false},
{id:"admin",         label:"Acessar Administrativo",             val:false,fixed:true},
]},
2:{label:"Recepção / Secretária",color:"#E65100",
items:[
{id:"agenda_all",    label:"Agendar e gerenciar consultas",      val:true, fixed:true},
{id:"pats_all",      label:"Cadastrar e editar pacientes",       val:true, fixed:true},
{id:"anamnese",      label:"Enviar anamnese por WhatsApp",       val:true, fixed:true},
{id:"wa",            label:"Enviar WhatsApp aos pacientes",      val:true, fixed:true},
{id:"lembretes_all", label:"Gerenciar todos os lembretes",      val:true, fixed:true},
{id:"receituario",   label:"Imprimir receituário",               val:true, fixed:true},
{id:"orcamento",     label:"Criar e editar orçamentos",          val:true, fixed:true},
{id:"implantes",     label:"Acessar próteses e implantes",       val:true, fixed:true},
{id:"financeiro",    label:"Ver financeiro dos pacientes",       val:true, fixed:false},
{id:"relatorio_dent",label:"Ver relatório de dentistas",         val:true, fixed:false},
{id:"recebimentos",  label:"Ver recebimentos dos dentistas",     val:false,fixed:false},
{id:"financeiro_geral",label:"Ver relatório financeiro geral",   val:false,fixed:false},
{id:"admin",         label:"Acessar Administrativo",             val:false,fixed:true},
]},
3:{label:"Administrador",color:"#4A148C",
items:[
{id:"all",           label:"Acesso total ao sistema",            val:true, fixed:true},
{id:"agenda_all",    label:"Ver e editar todas as agendas",      val:true, fixed:true},
{id:"pats_all",      label:"Todos os pacientes",                 val:true, fixed:true},
{id:"financeiro_geral",label:"Financeiro geral da clínica",      val:true, fixed:true},
{id:"recebimentos",  label:"Recebimentos e comissões dentistas", val:true, fixed:true},
{id:"relatorios",    label:"Todos os relatórios",                val:true, fixed:true},
{id:"orcamentos",    label:"Todos os orçamentos",                val:true, fixed:true},
{id:"implantes",     label:"Próteses e implantes",               val:true, fixed:true},
{id:"lembretes_all", label:"Todos os lembretes",                 val:true, fixed:true},
{id:"funcionarios",  label:"Gerenciar funcionários e logins",    val:true, fixed:true},
{id:"horarios",      label:"Configurar horários dos dentistas",  val:true, fixed:true},
{id:"config",        label:"Configurações do sistema",           val:true, fixed:true},
{id:"admin",         label:"Acessar Administrativo",             val:true, fixed:true},
]},
};
const MOTIVOS_REM=["Tratamento finalizado","Desistiu do tratamento","Mudou de clínica","Problema financeiro","Sem retorno (não responde)","Outros"];
const WA_TOKEN="EAASoAO9Ee4ABRTNwUDnXlghZCcevkhVNHyiAqhGerNbze52YXkqvBONwFF6cd99nMZBxg5BNicySfOl0ejRR6948F0EVyIMsZCmceUQwksoGtOLQqD6So8CoD9fCC6CU4AnBw7LCFmQkDmPQ7ONukHChhKYrVrogIeAi8cnLfrlpxVU3hgOnY0zhVQmAX9gaVKe0AysKqrSooV209UDHQTyoaO1k49j4m0pph6VTW4KlkyziYhfX8nxGaNVkd7qkxZARtEkgaeQaXzpV3kXsucHF";
const WA_PHONE_ID="1149169951604986";
const WA_API=async function(to,msg){
var phone=to.replace(/[^0-9]/g,"");
if(phone.length===11)phone="55"+phone;
else if(phone.length===10)phone="5511"+phone;
try{
var r=await fetch("https://graph.facebook.com/v18.0/"+WA_PHONE_ID+"/messages",{
method:"POST",
headers:{"Authorization":"Bearer "+WA_TOKEN,"Content-Type":"application/json"},
body:JSON.stringify({messaging_product:"whatsapp",to:phone,type:"text",text:{body:msg}})
});
var d=await r.json();
if(d.error){console.error("WA error:",d.error.message);return false;}
return true;
}catch(e){console.error("WA fetch error:",e);return false;}
};
const ANAM_LINK="https://claude.ai/public/artifacts/134f3434-6997-4396-ab62-3d37bae9d44e";
const CLINICA_INFO={nome:"Affonso Odontologia",endereco:"Rua Sabbado D Angelo, 1980 - Itaquera, Sao Paulo",telefone:"(11) 2524-9975",whatsapp:"(11) 2524-9975",appUrl:""};
const ANAM_CONDS=[["hypertension","Pressao alta"],["diabetes","Diabetes"],["heartDisease","Problema no coracao"],["rheumaticFever","Febre reumatica / valvula"],["bleeding","Problema de coagulacao"],["anticoagulant","Usa anticoagulante"],["osteoporosis","Osteoporose"],["bisphosphonate","Usa/usou bifosfonato"],["kidneyDisease","Doenca renal"],["liverDisease","Doenca no figado"],["hepatitis","Hepatite (B ou C)"],["hiv","HIV"],["infectious","Doenca infectocontagiosa"],["thyroid","Tireoide"],["epilepsy","Epilepsia / convulsoes"],["cancer","Cancer / quimioterapia"],["pregnant","Gestante"],["smoking","Fumante"]];
// Detecta se a anamnese ja foi cadastrada (salva, assinada, enviada pelo paciente ou com qualquer conteudo de saude)
function anamCadastrada(a){
  if(!a)return false;
  if(a.preenchida||a.ts||a.signedAt||a.signature||a._imp)return true;
  if(a.allergicMeds||a.medications||a.otherConditions||a.notes)return true;
  var B=["hypertension","diabetes","heartDisease","rheumaticFever","bleeding","anticoagulant","osteoporosis","bisphosphonate","kidneyDisease","liverDisease","hepatitis","hiv","infectious","thyroid","epilepsy","cancer","pregnant","smoking"];
  for(var i=0;i<B.length;i++){if(a[B[i]])return true;}
  return false;
}
function anamFalta(p){return !!p&&!anamCadastrada(p.anamnese);}
const ANAM_ALERT=["heartDisease","rheumaticFever","bleeding","anticoagulant","bisphosphonate","hepatitis","hiv","infectious","cancer"];
const UCOLS=["var(--primary)","var(--purple)","var(--blue)","var(--orange)","var(--red)","#148F77","var(--yellow)"];

const WA_TEMPLATES_DEFAULT={
  confirmacao:"Olá, {nome}! ✅ Consulta confirmada: {data} às {hora} — {proc}. Affonso Odontologia 🦷",
  vespera:"Olá, {nome}! 🔔 Lembrete: sua consulta é amanhã ({data}) às {hora} — {proc}. Responda 1 para confirmar ou 2 para cancelar. Affonso Odontologia 🦷",
  cancelou:"Olá, {nome}! 😊 Entendemos que não poderá comparecer. Gostaria de remarcar sua consulta? Responda SIM que nossa equipe entrará em contato! Affonso Odontologia",
  remarcar:"Olá, {nome}! Notamos que sua consulta de {data} não foi realizada. Gostaria de remarcar? Responda SIM! Affonso Odontologia.",
  bday:"🎂 Feliz Aniversário, {nome}! 🥳\n\nA equipe Affonso Odontologia deseja um dia incrível cheio de alegria e muitos sorrisos!\n\nQue este novo ano seja repleto de saúde e conquistas. 🌟\n\nParabéns!\nDr. Diego Affonso e equipe 🦷🤍",
  semestral:"Olá, {nome}! 😊 Já faz alguns meses desde sua última consulta. Que tal agendar seu controle semestral? É rápido e fundamental para manter sua saúde bucal em dia!\n\nEntre em contato — ficaremos felizes em recebê-lo(a)! 😁\n\nAffonso Odontologia",
  fim:"Olá, {nome}! 😊\n\nAgradecemos imensamente pela confiança no nosso trabalho! 🦷✨\n\nSeu tratamento foi concluído com sucesso. Para manter os resultados, é fundamental a manutenção semestral.\n\nEstamos sempre aqui para você!\nCom carinho, Dr. Diego Affonso e equipe 🤍",
  natal:"🎄 Feliz Natal! 🦷✨\n\nOlá, {nome}!\n\nNesta data tão especial, a equipe Affonso Odontologia deseja a você e sua família um Natal repleto de alegria, saúde e muitos sorrisos!\n\nCom carinho,\nDr. Diego Affonso e equipe 🤍",
  reveillon:"🥂 Feliz Ano Novo! 🎉\n\nOlá, {nome}!\n\nQue este novo ano seja repleto de saúde, alegria e sorrisos bonitos! 😁\n\nCom carinho,\nDr. Diego Affonso e equipe 🦷",
  pascoa:"🐣 Feliz Páscoa! 🍫\n\nOlá, {nome}!\n\nDesejamos a você uma Páscoa cheia de paz, amor e razões para sorrir! 😊\n\nCom carinho,\nDr. Diego Affonso e equipe",
  poscirurgia:"Olá, {nome}! 😊 Como está se sentindo após o procedimento de ontem? Se tiver dúvidas entre em contato. Affonso Odontologia 🦷",
};
const getWA=(templates,key,vars)=>{
  var tpl=(templates&&templates[key])||WA_TEMPLATES_DEFAULT[key]||"";
  if(vars){Object.entries(vars).forEach(([k,v])=>{tpl=tpl.replace(new RegExp("{"+k+"}","g"),v||"");});}
  return tpl;
};
const IMPL_DATA_SEED=[{"id": 1, "mes": "Jan/25", "mesKey": "JANEIRO 2025", "paciente": "ALMIR ROGERIO DOS SANTOS", "cirurgia": "ENXERTO LADO DIREITO", "protese": "", "controle": "", "data": "2025-01-17", "obs": "JUNHO", "extra": "", "status": "pending"}, {"id": 2, "mes": "Jan/25", "mesKey": "JANEIRO 2025", "paciente": "ELIZANGELA TORRES", "cirurgia": "IMPLANTE ( olhar comentario )", "protese": "", "controle": "", "data": "2024-11-12", "obs": "DIEGO", "extra": "MSG 27/01", "status": "pending"}, {"id": 3, "mes": "Jan/25", "mesKey": "JANEIRO 2025", "paciente": "ZILDA MENDES DOS SANTOS", "cirurgia": "IMPLANTE $$$", "protese": "Pac ia fazer cirurgia nas vistas ligar após dia 10", "controle": "", "data": "", "obs": "DIEGO 21-11-24", "extra": "MSG 27/01 ligar", "status": "pending"}, {"id": 4, "mes": "Jan/25", "mesKey": "JANEIRO 2025", "paciente": "SIMONE DOS SANTOS BARBOSA", "cirurgia": "EXERTO LADO ESQUERDO", "protese": "não vai fazer agora", "controle": "", "data": "2024-11-22", "obs": "DIEGO", "extra": "MSG 13/02 , NÃO CONSEGUE AGENDAR AGORA", "status": "info"}, {"id": 5, "mes": "Jan/25", "mesKey": "JANEIRO 2025", "paciente": "FABIANA SILVA OLIVEIRA", "cirurgia": "IMPLANTE (OLHAR COMENTÁRIO)", "protese": "DOIDINHA , IA PAGAR VALOR TOTAL E DESISTIU", "controle": "", "data": "2024-11-26", "obs": "DIEGO 26-11-24", "extra": "PAC DA PPR QUE PEDIU PARA MOLDAR DEPOIS DESISTIU", "status": "pending"}, {"id": 6, "mes": "Jan/25", "mesKey": "JANEIRO 2025", "paciente": "LUCIANO OLIVEIRA MARTINS", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "2024-11-26", "obs": "JUNHO", "extra": "", "status": "pending"}, {"id": 7, "mes": "Jan/25", "mesKey": "JANEIRO 2025", "paciente": "ADELRIZIA DIAS DE SOUZA", "cirurgia": "ENXERTO SUP ESQUERDO", "protese": "", "controle": "", "data": "2025-01-17", "obs": "JUNHO", "extra": "", "status": "pending"}, {"id": 8, "mes": "Jan/25", "mesKey": "JANEIRO 2025", "paciente": "ROBERTO DIAS", "cirurgia": "", "protese": "REABERTURA$$", "controle": "CTTO FINAL DE JANEIRO PEDIR PAN", "data": "2024-12-03", "obs": "MARCIO", "extra": "", "status": "pending"}, {"id": 9, "mes": "Jan/25", "mesKey": "JANEIRO 2025", "paciente": "CASSIA RIZZI", "cirurgia": "IMPLANTE $$$", "protese": "PROTOCOLO$$$", "controle": "", "data": "2024-12-03", "obs": "MARCIO", "extra": "", "status": "pending"}, {"id": 10, "mes": "Jan/25", "mesKey": "JANEIRO 2025", "paciente": "MARIA JOSÉ SOARES DE OLIVEIRA", "cirurgia": "IMPLANTE INF $$$", "protese": "", "controle": "", "data": "", "obs": "", "extra": "", "status": "pending"}, {"id": 11, "mes": "Fev/25", "mesKey": "FEVEREIRO 2025", "paciente": "DOUGLAS BATISTA ALMENDRO", "cirurgia": "", "protese": "", "controle": "IMPLANTE", "data": "2024-08-08", "obs": "DR PEDIU RETORNO EM  6 MESES", "extra": "MSG 07/02", "status": "pending"}, {"id": 12, "mes": "Fev/25", "mesKey": "FEVEREIRO 2025", "paciente": "DEIVE", "cirurgia": "ENXERTO", "protese": "", "controle": "", "data": "", "obs": "JUNHO", "extra": "", "status": "pending"}, {"id": 13, "mes": "Fev/25", "mesKey": "FEVEREIRO 2025", "paciente": "MARISTELA ROSA DE CARVALHO", "cirurgia": "", "protese": "PROTESE $$$", "controle": "final de fevereiro", "data": "2024-10-24", "obs": "Dr Marcio está conversando com a paciente", "extra": "", "status": "pending"}, {"id": 14, "mes": "Fev/25", "mesKey": "FEVEREIRO 2025", "paciente": "TEREZINHA  AMORIM DA  COSTA", "cirurgia": "", "protese": "PROTESE PAGO", "controle": "", "data": "2024-10-29", "obs": "", "extra": "", "status": "pending"}, {"id": 15, "mes": "Fev/25", "mesKey": "FEVEREIRO 2025", "paciente": "MARIA JOSÉ SOARES DE OLIVEIRA", "cirurgia": "IMPLANTE SUP $$$", "protese": "", "controle": "", "data": "2024-10-11", "obs": "PEDIDO TOMO 22/01", "extra": "", "status": "pending"}, {"id": 16, "mes": "Fev/25", "mesKey": "FEVEREIRO 2025", "paciente": "ADELRIZIA DIAS DE SOUZA", "cirurgia": "IMPLANTE INF (PAGO)", "protese": "", "controle": "", "data": "2024-12-06", "obs": "LEVOU PEDIDO PAN 12/01", "extra": "", "status": "pending"}, {"id": 17, "mes": "Fev/25", "mesKey": "FEVEREIRO 2025", "paciente": "MARIA RODRIGUES DE MOURA", "cirurgia": "IMPLANTE $$$", "protese": "PEDIR TOMO", "controle": "", "data": "2024-12-12", "obs": "MSG 07/02 ( Está sem dinheiro ,vai retornar )", "extra": "", "status": "info"}, {"id": 18, "mes": "Fev/25", "mesKey": "FEVEREIRO 2025", "paciente": "KATIA APARECIDA CANDIDO", "cirurgia": "ENXERTO", "protese": "ia fazer em janeiro , mas deisou para fevereiro vai esta de ferias", "controle": "", "data": "", "obs": "ABRIL", "extra": "", "status": "pending"}, {"id": 19, "mes": "Mar/25", "mesKey": "MARÇO 25", "paciente": "SANDRA REGINA ALVES", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "2024-09-06", "obs": "", "extra": "", "status": "pending"}, {"id": 20, "mes": "Mar/25", "mesKey": "MARÇO 25", "paciente": "KIMY TIAGO  LOPES", "cirurgia": "IMPLANTE", "protese": "A partir do dia 15/03", "controle": "", "data": "2025-01-10", "obs": "Levou pedido tomo 13/02", "extra": "msg para saber se fez 04/04", "status": "pending"}, {"id": 21, "mes": "Mar/25", "mesKey": "MARÇO 25", "paciente": "KATIA SILVA SANTOS", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "2025-01-16", "obs": "JÁ LEVOU PEDIDO DE TOMO", "extra": "", "status": "pending"}, {"id": 22, "mes": "Mar/25", "mesKey": "MARÇO 25", "paciente": "ALMIR ROGERIO DOS SANTOS", "cirurgia": "IMPLANTE ESQUERDO SUPERIOR", "protese": "", "controle": "", "data": "2023-11-17", "obs": "DR MARCIO", "extra": "", "status": "pending"}, {"id": 23, "mes": "Mar/25", "mesKey": "MARÇO 25", "paciente": "PAULO HENRIQUE DA SILVA BARROS", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "2025-02-25", "obs": "PEDIDO TOMO 25/02", "extra": "", "status": "pending"}, {"id": 24, "mes": "Mar/25", "mesKey": "MARÇO 25", "paciente": "EDNA TEIXEIRA", "cirurgia": "IMPLANTE INF", "protese": "", "controle": "", "data": "2024-08-09", "obs": "RET EM 6MESES COM A TOMO E DR ALEXANDRE REAVALIAR", "extra": "paciente levou pedido tomo", "status": "pending"}, {"id": 25, "mes": "Mar/25", "mesKey": "MARÇO 25", "paciente": "MARIA ISABEL SANTIAGO", "cirurgia": "IMPLANTE", "protese": "REPETIR IMPLANTE", "controle": "", "data": "", "obs": "", "extra": "", "status": "pending"}, {"id": 26, "mes": "Abr/25", "mesKey": "ABRIL25", "paciente": "EMERSON NOGUEIRA", "cirurgia": "", "protese": "PROTESE", "controle": "2025-01-01 00:00:00", "data": "2024-11-06", "obs": "msg para retirar pan 21/03", "extra": "ira repetir implante em maio", "status": "pending"}, {"id": 27, "mes": "Abr/25", "mesKey": "ABRIL25", "paciente": "KATIA APARECIDA CANDIDO MOTA", "cirurgia": "IMPLANTE", "protese": "", "controle": "FINAL DE ABRIL", "data": "2025-02-05", "obs": "levou pedido tomo 18/02", "extra": "", "status": "info"}, {"id": 28, "mes": "Abr/25", "mesKey": "ABRIL25", "paciente": "RENATA CORDEIRO MENDES", "cirurgia": "IMPLANTE", "protese": "", "controle": "FINAL DE ABRIL", "data": "", "obs": "msg p retirar tomo 30/04", "extra": "", "status": "pending"}, {"id": 29, "mes": "Abr/25", "mesKey": "ABRIL25", "paciente": "DANIEL MAESTRELLO VIRGULINO", "cirurgia": "IMPLANTE", "protese": "", "controle": "FINAL DE ABRIL", "data": "", "obs": "msg p retirar tomo 30/04", "extra": "", "status": "pending"}, {"id": 30, "mes": "Abr/25", "mesKey": "ABRIL25", "paciente": "VICENCIA  SOBRINHA DE SOUZA", "cirurgia": "IMPLANTE SUP", "protese": "", "controle": "", "data": "2024-09-06", "obs": "FALAR COM A JOANA", "extra": "", "status": "pending"}, {"id": 31, "mes": "Abr/25", "mesKey": "ABRIL25", "paciente": "CESAR AUGUSTO BEZERRA", "cirurgia": "IMPLANTE $$$", "protese": "", "controle": "", "data": "2025-01-29", "obs": "JÁ LEVOU PEDIDO DE TOMO", "extra": "2025-01-29 00:00:00", "status": "info"}, {"id": 32, "mes": "Abr/25", "mesKey": "ABRIL25", "paciente": "IZABEL CRISRINA MOREIRA", "cirurgia": "", "protese": "PRÓTESE", "controle": "", "data": "2024-12-13", "obs": "PEDIR PAN", "extra": "msg vir retirar pedido pan 30/04", "status": "pending"}, {"id": 33, "mes": "Mai/25", "mesKey": "MAIO25", "paciente": "SIMONE DOS SANTOS BARBOSA", "cirurgia": "IMPLANTE LADO DIREITO", "protese": "ESTA SEM DINHEIRO NO MOMENTO ( ENTRAR EM CTTO)", "controle": "", "data": "2024-11-22", "obs": "DIEGO", "extra": "msg para ret tomo 30/04", "status": "info"}, {"id": 34, "mes": "Mai/25", "mesKey": "MAIO25", "paciente": "ROSANGELA DA SILVA SANTANA", "cirurgia": "", "protese": "protese", "controle": "", "data": "", "obs": "ret maio", "extra": "msg para retirar pan  30/04", "status": "pending"}, {"id": 35, "mes": "Mai/25", "mesKey": "MAIO25", "paciente": "ADELRIZIA  DIAS DE SOUZA", "cirurgia": "IMPLANTE sup", "protese": "", "controle": "", "data": "2025-05-23", "obs": "PEDIR TOMO", "extra": "msg para retirar  tomo 30/04", "status": "pending"}, {"id": 36, "mes": "Mai/25", "mesKey": "MAIO25", "paciente": "MARIA JOSÉ SOARES DE OLIVEIRA", "cirurgia": "", "protese": "PROTESE( IMPLANTE INF )", "controle": "", "data": "2025-01-22", "obs": "", "extra": "msg para retirar pan  30/04", "status": "scheduled"}, {"id": 37, "mes": "Mai/25", "mesKey": "MAIO25", "paciente": "OSVALDO MARTINS MIRANDA", "cirurgia": "IMPALNTE  marcado 06-06", "protese": "", "controle": "", "data": "2025-03-07", "obs": "AVALIACAO DA JU", "extra": "", "status": "pending"}, {"id": 38, "mes": "Mai/25", "mesKey": "MAIO25", "paciente": "SANDRA REGINA ALVES", "cirurgia": "IMPLANTE INF", "protese": "final de maio", "controle": "", "data": "", "obs": "", "extra": "", "status": "pending"}, {"id": 39, "mes": "Mai/25", "mesKey": "MAIO25", "paciente": "EDNA TEIXEIRA", "cirurgia": "ENXERTO SUP MARCADO DIA 30", "protese": "", "controle": "", "data": "", "obs": "", "extra": "", "status": "pending"}, {"id": 40, "mes": "Mai/25", "mesKey": "MAIO25", "paciente": "EVELIN DA SILVA FERREIRA", "cirurgia": "ENXERTO SUP", "protese": "", "controle": "", "data": "2025-04-07", "obs": "LEVOU PEDIDO pAN 07/04 FAZER COMEÇO DE MAIO", "extra": "msg 30/04 para já fazer a pan", "status": "pending"}, {"id": 41, "mes": "Mai/25", "mesKey": "MAIO25", "paciente": "ARLETE LEITE CAMBOIM", "cirurgia": "IMPLANTE", "protese": "FINAL DE MAIO", "controle": "", "data": "2025-04-08", "obs": "", "extra": "", "status": "pending"}, {"id": 42, "mes": "Mai/25", "mesKey": "MAIO25", "paciente": "GABRIELLA BARROS SANTOS", "cirurgia": "IMPLANTE SUP", "protese": "", "controle": "", "data": "2025-04-09", "obs": "LEVOU TOMO LIGAR COMEÇO DE MAIO VÊ SE FEZ", "extra": "liguei ninguem atendeu 30/04 msg whtas 30/04", "status": "pending"}, {"id": 43, "mes": "Mai/25", "mesKey": "MAIO25", "paciente": "SANDRA REGINA ALVES", "cirurgia": "SANDRA REGINA ALVES", "protese": "SANDRA REGINA ALVES", "controle": "SANDRA REGINA ALVES", "data": "", "obs": "", "extra": "", "status": "pending"}, {"id": 44, "mes": "Mai/25", "mesKey": "MAIO25", "paciente": "VILMA DOS SANTOS ANALFIO", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "2025-04-11", "obs": "Pac estava marcada 11/04 p/ fazer a cirurgia, não veio ( Se confundio com o horario) vai viajar deixou p fazer em Junho ( CIRURGIA 30/05)", "extra": "fez a tomo", "status": "pending"}, {"id": 45, "mes": "Mai/25", "mesKey": "MAIO25", "paciente": "IZABEL CRISTINA MOREIRA", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "2025-05-20", "obs": "", "extra": "", "status": "pending"}, {"id": 46, "mes": "Jun/25", "mesKey": "JUNHO25", "paciente": "LUCIANO OLIVEIRA MARTINS", "cirurgia": "", "protese": "protese", "controle": "", "data": "2024-01-22", "obs": "pedir Pan msg  26-05", "extra": "", "status": "pending"}, {"id": 47, "mes": "Jun/25", "mesKey": "JUNHO25", "paciente": "ALMIR ROGERIO", "cirurgia": "IMPLANTE SUP", "protese": "", "controle": "", "data": "2025-01-17", "obs": "agendado 08/07 p/ conversar", "extra": "", "status": "pending"}, {"id": 48, "mes": "Jun/25", "mesKey": "JUNHO25", "paciente": "MARIA JOSE SOARES DE OLIVIERA", "cirurgia": "", "protese": "PROTESE SUP", "controle": "", "data": "2025-02-26", "obs": "", "extra": "", "status": "pending"}, {"id": 49, "mes": "Jun/25", "mesKey": "JUNHO25", "paciente": "EMERSON NOGUEIRA", "cirurgia": "", "protese": "implante inf", "controle": "", "data": "2025-06-06", "obs": "repetição", "extra": "", "status": "pending"}, {"id": 50, "mes": "Jun/25", "mesKey": "JUNHO25", "paciente": "OSVALDO MARTINS DE MIRANDA", "cirurgia": "IMPLANTE INF", "protese": "", "controle": "", "data": "2025-06-06", "obs": "", "extra": "", "status": "pending"}, {"id": 51, "mes": "Jun/25", "mesKey": "JUNHO25", "paciente": "HELENA CRISTINA RIBEIRO EPINDOLA", "cirurgia": "REMOÇÃO IMPLANTE", "protese": "", "controle": "", "data": "2025-06-23", "obs": "", "extra": "", "status": "pending"}, {"id": 52, "mes": "Jun/25", "mesKey": "JUNHO25", "paciente": "DEIVISON SANGREGORIO", "cirurgia": "", "protese": "PROTESE PAGO", "controle": "", "data": "2024-11-29", "obs": "ENTRAR EM CTTO FINAL DE MARCÇO", "extra": "msg retirar pedido pan 21/03", "status": "pending"}, {"id": 53, "mes": "Jun/25", "mesKey": "JUNHO25", "paciente": "THAIS APARECIDA NERES", "cirurgia": "", "protese": "PRÓTESE", "controle": "", "data": "", "obs": "OLHAR COMENTARIO", "extra": "MSG 30/04 , VAI FAZER 02/05", "status": "pending"}, {"id": 54, "mes": "Jul/25", "mesKey": "JULHO25", "paciente": "ADELRIZIA  DIAS DE SOUZA", "cirurgia": "", "protese": "PROTESE INF", "controle": "", "data": "2025-03-12", "obs": "", "extra": "PEDIR PAN", "status": "pending"}, {"id": 55, "mes": "Jul/25", "mesKey": "JULHO25", "paciente": "MARIA ISABEL DELILA", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "2025-07-18", "obs": "", "extra": "JÁ FEZ TOMO", "status": "pending"}, {"id": 56, "mes": "Jul/25", "mesKey": "JULHO25", "paciente": "ZELIA IMACULADA DE OLIVEIRA", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "2025-05-23", "obs": "", "extra": "mandar msg 27/07 msg 06/08", "status": "pending"}, {"id": 57, "mes": "Jul/25", "mesKey": "JULHO25", "paciente": "DEIVE", "cirurgia": "IMPLANTE  $$$$", "protese": "", "controle": "", "data": "2025-02-07", "obs": "TOMO msg 26-05", "extra": "msg 24/07", "status": "pending"}, {"id": 58, "mes": "Jul/25", "mesKey": "JULHO25", "paciente": "MARIA GEISA DE ARAUJO LIMA", "cirurgia": "IMPLANTE $$$", "protese": "", "controle": "", "data": "2025-07-01", "obs": "LEVOU PEDIDO TOMO", "extra": "MARCADO 31/07", "status": "pending"}, {"id": 59, "mes": "Jul/25", "mesKey": "JULHO25", "paciente": "PAULO HENRIQUE", "cirurgia": "implante", "protese": "", "controle": "", "data": "2025-07-04", "obs": "", "extra": "", "status": "pending"}, {"id": 60, "mes": "Jul/25", "mesKey": "JULHO25", "paciente": "ALMIR ROGERIO", "cirurgia": "IMPLANTE $$$", "protese": "", "controle": "", "data": "2025-07-12", "obs": "", "extra": "", "status": "pending"}, {"id": 61, "mes": "Jul/25", "mesKey": "JULHO25", "paciente": "ALBERTINA   OLIVEIRA DA SILVA", "cirurgia": "ENXERTO $$$$", "protese": "", "controle": "", "data": "2025-07-18", "obs": "", "extra": "", "status": "pending"}, {"id": 62, "mes": "Jul/25", "mesKey": "JULHO25", "paciente": "DANIEL LASAGNO", "cirurgia": "ENXERTO", "protese": "", "controle": "", "data": "2025-07-18", "obs": "LEVOU PEDIDO TOMO", "extra": "", "status": "pending"}, {"id": 63, "mes": "Ago/25", "mesKey": "AGOSTO25", "paciente": "MARILDA  DA CRUZ CARVALHO", "cirurgia": "", "protese": "", "controle": "controle", "data": "2025-02-17", "obs": "LEVOU PEDIDO PAN 22/08 ( passou 10/09)", "extra": "", "status": "pending"}, {"id": 64, "mes": "Ago/25", "mesKey": "AGOSTO25", "paciente": "SILEIDE QUERINO DE ARAUJO", "cirurgia": "ENXERTO + IMPLANTE SUP", "protese": "", "controle": "", "data": "", "obs": "JÁ FEZ A TOMO", "extra": "", "status": "pending"}, {"id": 65, "mes": "Ago/25", "mesKey": "AGOSTO25", "paciente": "MARIA PEREIRA DOS SANTOS", "cirurgia": "IMPLANTE $$$", "protese": "", "controle": "", "data": "2025-08-01", "obs": "", "extra": "", "status": "pending"}, {"id": 66, "mes": "Ago/25", "mesKey": "AGOSTO25", "paciente": "SOLANGE MARIA DA SILVA", "cirurgia": "IMPLANTE $$$", "protese": "", "controle": "", "data": "", "obs": "TOMO OK", "extra": "", "status": "pending"}, {"id": 67, "mes": "Ago/25", "mesKey": "AGOSTO25", "paciente": "LUCCAS RIBEIRO COSTA", "cirurgia": "EXO", "protese": "", "controle": "", "data": "18/08/", "obs": "", "extra": "", "status": "pending"}, {"id": 68, "mes": "Set/25", "mesKey": "SETEMBRO25", "paciente": "SANDRA REGINA ALVES", "cirurgia": "", "protese": "PROTOCOLO", "controle": "", "data": "2025-03-18", "obs": "", "extra": "", "status": "pending"}, {"id": 69, "mes": "Set/25", "mesKey": "SETEMBRO25", "paciente": "EDNA TEIXEIRA", "cirurgia": "", "protese": "PROTESE INF", "controle": "", "data": "2025-03-28", "obs": "LEVOU PEDIDO PAN 13-06  (((  MSG11/09)))", "extra": "", "status": "pending"}, {"id": 70, "mes": "Set/25", "mesKey": "SETEMBRO25", "paciente": "SANDRA REGINA ALVES", "cirurgia": "", "protese": "PROTESE INF", "controle": "", "data": "2025-05-10", "obs": "PEDIR PAN E AVALIAR", "extra": "", "status": "pending"}, {"id": 71, "mes": "Set/25", "mesKey": "SETEMBRO25", "paciente": "ADELRIZIA  DIAS DE SOUZA", "cirurgia": "", "protese": "PRÓTESE SUP", "controle": "", "data": "2025-05-23", "obs": "FINAL DO MES , NÃO PRECISA PAN", "extra": "", "status": "pending"}, {"id": 72, "mes": "Set/25", "mesKey": "SETEMBRO25", "paciente": "ROBERTA JECIRA B GIAGOMINI", "cirurgia": "IMPLANTE $$$", "protese": "", "controle": "", "data": "2025-08-22", "obs": "LEVOU PEDIDO TOMO  ((( FEZ A TOMO  DIA 10/09)) agendada 26/09", "extra": "", "status": "pending"}, {"id": 73, "mes": "Set/25", "mesKey": "SETEMBRO25", "paciente": "ROSENY GOMES", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "", "obs": "", "extra": "", "status": "pending"}, {"id": 74, "mes": "Set/25", "mesKey": "SETEMBRO25", "paciente": "MARIA DA LUZ MARCELINO", "cirurgia": "IMPLANTE $$$", "protese": "", "controle": "", "data": "", "obs": "AGENDADA 01/10", "extra": "", "status": "pending"}, {"id": 75, "mes": "Out/25", "mesKey": "OUTUBRO25", "paciente": "EMERSON NOGUEIRA", "cirurgia": "", "protese": "prótese", "controle": "", "data": "2025-06-06", "obs": "pedir pan  msg 01/10", "extra": "", "status": "pending"}, {"id": 76, "mes": "Out/25", "mesKey": "OUTUBRO25", "paciente": "OSVALDO MARTINS DE MIRANDA", "cirurgia": "", "protese": "PROTESE INF", "controle": "", "data": "2025-06-06", "obs": "pedir pan  msg 01/10 retirou pan 07/10", "extra": "", "status": "pending"}, {"id": 77, "mes": "Out/25", "mesKey": "OUTUBRO25", "paciente": "JULIO CESAR GOMES", "cirurgia": "IMPLANTE $$$", "protese": "", "controle": "", "data": "2025-07-29", "obs": "PEDIR TOMO DR VAI CONVERSAR 03/10", "extra": "", "status": "pending"}, {"id": 78, "mes": "Out/25", "mesKey": "OUTUBRO25", "paciente": "VILMA DOS SANTOS", "cirurgia": "", "protese": "SUP E INF", "controle": "", "data": "2025-05-30", "obs": "PEDIR PAN   ((( MSG 11/09) RETIROU PAN 30/09", "extra": "", "status": "pending"}, {"id": 79, "mes": "Out/25", "mesKey": "OUTUBRO25", "paciente": "ELISETE HIROMI MURAKAMI", "cirurgia": "ENXERTO $$", "protese": "", "controle": "", "data": "2025-10-10", "obs": "REALIZOU A TOMO 10/10", "extra": "", "status": "pending"}, {"id": 80, "mes": "Out/25", "mesKey": "OUTUBRO25", "paciente": "JOAO PAULO BERNARDO DE MOURA", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "2025-10-31", "obs": "", "extra": "", "status": "pending"}, {"id": 81, "mes": "Nov/25", "mesKey": "NOVEMBRO25", "paciente": "MARIA ISABEL DELILA", "cirurgia": "PROTESE", "protese": "", "controle": "", "data": "2025-07-18", "obs": "PEDIR PAN", "extra": "", "status": "scheduled"}, {"id": 82, "mes": "Nov/25", "mesKey": "NOVEMBRO25", "paciente": "PAULO HENRIQUE", "cirurgia": "PRÓTESE", "protese": "", "controle": "", "data": "2025-07-18", "obs": "PEDIR PAN  ( LEVOU PEDIDO PAN  08/10", "extra": "", "status": "scheduled"}, {"id": 83, "mes": "Nov/25", "mesKey": "NOVEMBRO25", "paciente": "MARIA GEYSA ( MARCIO)", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "2025-07-31", "obs": "levou pedido tomo 07/01", "extra": "", "status": "pending"}, {"id": 84, "mes": "Nov/25", "mesKey": "NOVEMBRO25", "paciente": "ROSENY GOMES", "cirurgia": "", "protese": "PRÓTESE", "controle": "", "data": "2025-09-16", "obs": "FINAL DE NOV PEDIR PAN", "extra": "MSG 24/11", "status": "scheduled"}, {"id": 85, "mes": "Nov/25", "mesKey": "NOVEMBRO25", "paciente": "IZABEL CRISTINA MOREIRA", "cirurgia": "", "protese": "PRÓTESE", "controle": "", "data": "2025-05-20", "obs": "PEDIR PAN ((MSG 11/09))) Só vai fazer em Novembro", "extra": "", "status": "scheduled"}, {"id": 86, "mes": "Nov/25", "mesKey": "NOVEMBRO25", "paciente": "ZILDA MENDES DOS SANTOS", "cirurgia": "iMPLANTE", "protese": "", "controle": "", "data": "2025-10-27", "obs": "", "extra": "", "status": "pending"}, {"id": 87, "mes": "Dez/25", "mesKey": "DEZEMBRO25", "paciente": "MARIA PEREIRA DOS SANTOS", "cirurgia": "", "protese": "PRÓTESE", "controle": "", "data": "2025-08-08", "obs": "PEDIR PAN  ( OSSO MACIO TALVEZ 6 MESES) msg 02/12", "extra": "", "status": "scheduled"}, {"id": 88, "mes": "Dez/25", "mesKey": "DEZEMBRO25", "paciente": "SILEIDE QUERINO DE ARAUJO", "cirurgia": "", "protese": "PROTESE", "controle": "", "data": "", "obs": "PEDIR PAN  msg 02/12", "extra": "", "status": "scheduled"}, {"id": 89, "mes": "Dez/25", "mesKey": "DEZEMBRO25", "paciente": "IRINEIA DE AMORIM", "cirurgia": "IMPLANTE $$", "protese": "", "controle": "", "data": "ABRIL", "obs": "TOMO OK AGENDADA 03/12", "extra": "", "status": "pending"}, {"id": 90, "mes": "Jan/26", "mesKey": "JANEIRO 26", "paciente": "KATIA AP CANDIDO MOTA", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "JULHO", "obs": "NÃO FORMOU OSSO VAI RET NO BUCO QUE FEZ", "extra": "", "status": "info"}, {"id": 91, "mes": "Jan/26", "mesKey": "JANEIRO 26", "paciente": "MARIA DA LUZ MARCELINO", "cirurgia": "", "protese": "PROTESE $$$", "controle": "", "data": "2025-10-01", "obs": "PEDIR PAN  msg 05/01 msg 15/01", "extra": "", "status": "scheduled"}, {"id": 92, "mes": "Jan/26", "mesKey": "JANEIRO 26", "paciente": "FABIO DE ALMEIDA LISBOA", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "", "obs": "MARCAR CONSULTA C DR PARA REVALIAR O CASO", "extra": "DR CONVERSAR SOBRE A POSSIBIIDADE DE FAZER", "status": "pending"}, {"id": 93, "mes": "Jan/26", "mesKey": "JANEIRO 26", "paciente": "SHIRLEY MOREIRA DA SILVA", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "2025-11-27", "obs": "PEDIR TOMO msg 05/01 msg  06/01", "extra": "", "status": "pending"}, {"id": 94, "mes": "Jan/26", "mesKey": "JANEIRO 26", "paciente": "PAULO HENRIQUE", "cirurgia": "", "protese": "PROTESE/ CLAREAMENTO", "controle": "", "data": "2025-12-11", "obs": "APÓS REMOÇÃO APARELHO/ CLAREAMENTO", "extra": "", "status": "scheduled"}, {"id": 95, "mes": "Jan/26", "mesKey": "JANEIRO 26", "paciente": "ALBERTINA DE OLIVEIRA DA SILVA", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "2025-07-18", "obs": "LEVOU PEDIDO TOMO", "extra": "já fez", "status": "pending"}, {"id": 96, "mes": "Jan/26", "mesKey": "JANEIRO 26", "paciente": "MARINALVA SOARES DA SILVA", "cirurgia": "IMPLANTE $$", "protese": "", "controle": "", "data": "2025-09-17", "obs": "AGENDADA 16/01", "extra": "fez 24/11", "status": "pending"}, {"id": 97, "mes": "Jan/26", "mesKey": "JANEIRO 26", "paciente": "DANIEL LASAGNO", "cirurgia": "IMPLANTE $$", "protese": "", "controle": "", "data": "2025-07-18", "obs": "FEZ TOMO msg 05/01 para agendar", "extra": "", "status": "pending"}, {"id": 98, "mes": "Jan/26", "mesKey": "JANEIRO 26", "paciente": "CLEBER AUGUSTO DA SILVIERA", "cirurgia": "EXO + enxerto", "protese": "", "controle": "", "data": "2026-01-05", "obs": "LEVOU PEDIDO TOMO", "extra": "", "status": "pending"}, {"id": 99, "mes": "Jan/26", "mesKey": "JANEIRO 26", "paciente": "FERNANDO JUSTO DE SOUZA", "cirurgia": "EXO + OSSO", "protese": "", "controle": "", "data": "2026-01-12", "obs": "RETORNO 12/03 levou pedido tomo 22/01", "extra": "", "status": "pending"}, {"id": 100, "mes": "Fev/26", "mesKey": "FEVEREIRO 26", "paciente": "PATRICIA COSTA SILVA", "cirurgia": "EXO P IMPLANTE", "protese": "", "controle": "", "data": "2025-11-06", "obs": "não me atende", "extra": "", "status": "pending"}, {"id": 101, "mes": "Fev/26", "mesKey": "FEVEREIRO 26", "paciente": "LUCIANO OLIVEIRA MARTINS", "cirurgia": "", "protese": "", "controle": "CONTROLE", "data": "2025-11-27", "obs": "PEDIR PAN msg 25/03", "extra": "", "status": "pending"}, {"id": 102, "mes": "Fev/26", "mesKey": "FEVEREIRO 26", "paciente": "PALOMA DE JESUS", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "2026-01-09", "obs": "JA LEVOU O PEDIDO TOMO PERGUNTAR a partir  23/02 SE JA FEZ não quer fazer", "extra": "", "status": "info"}, {"id": 103, "mes": "Fev/26", "mesKey": "FEVEREIRO 26", "paciente": "EDNA TEIXEIRA", "cirurgia": "IMPLANTE SUP", "protese": "", "controle": "", "data": "2025-05-30", "obs": "AGENDADA 16/01", "extra": "", "status": "pending"}, {"id": 104, "mes": "Fev/26", "mesKey": "FEVEREIRO 26", "paciente": "RENATO RODRIGUES CORDEIRO", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "2026-01-21", "obs": "LEVOU PEDIDO TOMO  msg 26/02", "extra": "", "status": "pending"}, {"id": 105, "mes": "Fev/26", "mesKey": "FEVEREIRO 26", "paciente": "RENATO RODRIGUES CORDEIRO", "cirurgia": "", "protese": "", "controle": "", "data": "", "obs": "", "extra": "", "status": "pending"}, {"id": 106, "mes": "Fev/26", "mesKey": "FEVEREIRO 26", "paciente": "EDNA DE OLIVEIRA FERREIRA", "cirurgia": "IMPLANTE $$$", "protese": "", "controle": "", "data": "2025-07-18", "obs": "2026-02-27 00:00:00", "extra": "ENTRAR EM CTTO 15/01 msg 15/01", "status": "pending"}, {"id": 107, "mes": "Mar/26", "mesKey": "MARÇO", "paciente": "ZILDA MENDES DOS SANTOS", "cirurgia": "", "protese": "PROTESE$$", "controle": "", "data": "2025-11-14", "obs": "PEDIR PAN", "extra": "msg 23/02", "status": "scheduled"}, {"id": 108, "mes": "Mar/26", "mesKey": "MARÇO", "paciente": "ALMIR ROGERIO", "cirurgia": "", "protese": "PROTESE$$", "controle": "", "data": "2025-11-19", "obs": "PEDIR PAN", "extra": "msg 24/03 , 25/3 n atende", "status": "pending"}, {"id": 109, "mes": "Mar/26", "mesKey": "MARÇO", "paciente": "LUCCAS RIBEIRO COSTA", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "2025-08-11", "obs": "LEVOU PEDIDO TOMO 03/10", "extra": "não atende", "status": "pending"}, {"id": 110, "mes": "Mar/26", "mesKey": "MARÇO", "paciente": "ROBETA JECIRA", "cirurgia": "", "protese": "PROTESE $$$", "controle": "", "data": "SETEMBRO", "obs": "PEDIR PAN  msg 05/01", "extra": "vai fazr depois do clareamento", "status": "pending"}, {"id": 111, "mes": "Mar/26", "mesKey": "MARÇO", "paciente": "SOLANGE MARIA DA SILVA", "cirurgia": "", "protese": "PROTESE$$", "controle": "", "data": "", "obs": "ENVIEI PEDIDO PAN 02/02", "extra": "vai fazer final do mês não atende", "status": "pending"}, {"id": 112, "mes": "Abr/26", "mesKey": "ABRIL 26", "paciente": "IRINEIA DE AMORIM", "cirurgia": "", "protese": "PROTESE $$$", "controle": "", "data": "2025-12-03", "obs": "PEDIR PAN msg 25/03", "extra": "ligação 02/04 , msg 07/04/ 29/04", "status": "pending"}, {"id": 113, "mes": "Abr/26", "mesKey": "ABRIL 26", "paciente": "MARIA ALICE PEREIRA  LOPES", "cirurgia": "IMPLANTE $$", "protese": "", "controle": "", "data": "28/01 FEZ EXO", "obs": "PEDIR TOMO", "extra": "ligação 02/04 msg 07/04 29/04", "status": "pending"}, {"id": 114, "mes": "Abr/26", "mesKey": "ABRIL 26", "paciente": "CLEBER AUGUSTO DA SILVIERA", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "2026-01-28", "obs": "levou pedido tomo 05/02", "extra": "marcado 17/06", "status": "pending"}, {"id": 115, "mes": "Abr/26", "mesKey": "ABRIL 26", "paciente": "ElIZABETE PEREIRA DA SILVA", "cirurgia": "IMPLANTE$$", "protese": "", "controle": "", "data": "15/04", "obs": "", "extra": "", "status": "pending"}, {"id": 116, "mes": "Mai/26", "mesKey": "MAIO 26", "paciente": "MARINALVA SOARES DA SILVA", "cirurgia": "", "protese": "PROTESE $$$", "controle": "", "data": "2026-01-16", "obs": "PEDIR PAN  ( entregar o termo )", "extra": "AGENDADA 20/05", "status": "pending"}, {"id": 117, "mes": "Mai/26", "mesKey": "MAIO 26", "paciente": "DANIEL LASAGNO", "cirurgia": "", "protese": "PROTESE $$$", "controle": "", "data": "2026-01-21", "obs": "PEDIR PAN ( entregar o termo )", "extra": "enviado pedido pan 13/05", "status": "pending"}, {"id": 118, "mes": "Mai/26", "mesKey": "MAIO 26", "paciente": "FERNANDO JUSTO DE SOUZA", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "2026-01-12", "obs": "PEDIR TOMO", "extra": "msg 23/02 levou pedido tomo pac com cancer irá fazer em maio", "status": "pending"}, {"id": 119, "mes": "Mai/26", "mesKey": "MAIO 26", "paciente": "SANDRA REGINA ALVES", "cirurgia": "", "protese": "", "controle": "CONTROLE", "data": "2025-12-17", "obs": "LEVOU PAN MARCAR C A JU", "extra": "", "status": "pending"}, {"id": 120, "mes": "Mai/26", "mesKey": "MAIO 26", "paciente": "LUCIANA MARQUES FERREIRA", "cirurgia": "", "protese": "PROTESE$$", "controle": "", "data": "26/12", "obs": "msg 13/05", "extra": "MARCADO 28/05", "status": "scheduled"}, {"id": 121, "mes": "Jun/26", "mesKey": "JUNHO 26", "paciente": "ERONILDE APARECIDA", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "2026-01-29", "obs": "PEDIR TOMO", "extra": "", "status": "pending"}, {"id": 122, "mes": "Jun/26", "mesKey": "JUNHO 26", "paciente": "EDNA DE OLIVEIRA FERREIRA", "cirurgia": "", "protese": "protese", "controle": "", "data": "2026-02-27", "obs": "2026-02-27 00:00:00", "extra": "pedir pan  ( entregar o termo )", "status": "pending"}, {"id": 123, "mes": "Jun/26", "mesKey": "JUNHO 26", "paciente": "JOAO PAULO BERNARDO", "cirurgia": "", "protese": "PROTESE$$", "controle": "", "data": "2025-10-31", "obs": "levou pedido pan 06/03", "extra": "", "status": "pending"}, {"id": 124, "mes": "Jun/26", "mesKey": "JUNHO 26", "paciente": "ElIZABETE PEREIRA DA SILVA", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "15/04", "obs": "não fez a cirurgia pedir tomo", "extra": "", "status": "pending"}, {"id": 125, "mes": "Jun/26", "mesKey": "JUNHO 26", "paciente": "FRANSUELDO ALVES", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "20/04", "obs": "LEVOU PED TOMO", "extra": "", "status": "pending"}, {"id": 126, "mes": "Jun/26", "mesKey": "JUNHO 26", "paciente": "ROSANIA JOSE DA SILVA", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "24/04", "obs": "PEDIR TOMO", "extra": "", "status": "pending"}, {"id": 127, "mes": "Jun/26", "mesKey": "JUNHO 26", "paciente": "NEUSA MARIA DOS REIS SILVA", "cirurgia": "IMPLANTE $$", "protese": "", "controle": "", "data": "29/04", "obs": "PEDIR TOMO", "extra": "", "status": "pending"}, {"id": 128, "mes": "Jun/26", "mesKey": "JUNHO 26", "paciente": "ANDREA SILVESTRE DELA", "cirurgia": "IMPLANTE", "protese": "", "controle": "", "data": "2026-06-06", "obs": "PEDIR PAN", "extra": "", "status": "pending"}, {"id": 129, "mes": "Jul/26", "mesKey": "JULHO 26", "paciente": "EDNA TEIXEIRA", "cirurgia": "", "protese": "PROTESE", "controle": "", "data": "2026-02-06", "obs": "levou pan 20/02", "extra": "", "status": "pending"}, {"id": 130, "mes": "Jul/26", "mesKey": "JULHO 26", "paciente": "RENATO RODRIGUES CORDEIRO", "cirurgia": "", "protese": "PROTESE", "controle": "", "data": "28/03", "obs": "PEDIR PAN", "extra": "", "status": "pending"}, {"id": 131, "mes": "Jul/26", "mesKey": "JULHO 26", "paciente": "ANTONIA BATISTA DAS NEVES", "cirurgia": "IMPLANTE $$", "protese": "", "controle": "", "data": "20/04", "obs": "LEVOU PEDIDO TOMO", "extra": "", "status": "pending"}, {"id": 132, "mes": "Ago/26", "mesKey": "AGOSTO 26", "paciente": "ELIZETE NAKAMURA", "cirurgia": "IMPLANTE $$$", "protese": "", "controle": "", "data": "2026-07-11", "obs": "LEVOU PEDIDO TOMO E PAN 07/04", "extra": "msg 13/05", "status": "pending"}];

const CSS=`@import url('https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css');@import url('https://unpkg.com/@phosphor-icons/web@2.1.1/src/light/style.css');@import url('https://unpkg.com/@phosphor-icons/web@2.1.1/src/fill/style.css');@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Manrope:wght@400;500;600;700;800&display=swap'); :root{color-scheme:light;--bg:#e8ece6;--card:#e8ece6;--surface:#e8ece6;--surface-2:#f2f5f2;--nm-light:#fbfff7;--nm-dark:#c8d0c5;--text:#23332b;--muted:#7c8a80;--border:#d8ded3;--primary:#2f5d49;--brand:#2f5d49;--accent:#e0e5dc;--red:#C0392B;--green:#2f8f5f;--yellow:#C0902E;--blue:#1A5276;--purple:#7a5a9e;--orange:#CA6F1E;--gold:#B7950B;--red-soft:#FFEBEE;--green-soft:#E8F5E9;--amber-soft:#FFF8E1;--blue-soft:#E3F2FD;--purple-soft:#F3E5F5;}html[data-theme="dark"]{color-scheme:dark;--bg:#252b29;--card:#252b29;--surface:#252b29;--surface-2:#2b322f;--nm-light:#2e3633;--nm-dark:#1a1f1d;--text:#e7ece7;--muted:#93a29a;--border:#333c37;--primary:#54a081;--brand:#54a081;--accent:#2e3633;--red:#e5776b;--green:#5cbd8e;--yellow:#d9b45f;--blue:#5c9fd6;--purple:#b18bd0;--orange:#e2954f;--gold:#d4bb57;--red-soft:#3a2725;--green-soft:#22332b;--amber-soft:#342e1f;--blue-soft:#1f2c38;--purple-soft:#2f2836;} *{box-sizing:border-box;margin:0;padding:0;} body{font-family:'Manrope',sans-serif;background:${G.bg};color:${G.text};-webkit-font-smoothing:antialiased;font-variant-numeric:lining-nums;} ::-webkit-scrollbar{width:6px;height:6px;}::-webkit-scrollbar-thumb{background:var(--nm-dark);border-radius:4px;}::-webkit-scrollbar-track{background:transparent;} input,select,textarea,button{font-family:'Manrope',sans-serif;} input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]),select,textarea{background:var(--surface) !important;border:none !important;box-shadow:inset 3px 3px 7px var(--nm-dark), inset -3px -3px 7px var(--nm-light) !important;border-radius:12px !important;color:var(--text);outline:none;} input:focus,select:focus,textarea:focus{box-shadow:inset 4px 4px 8px var(--nm-dark), inset -4px -4px 8px var(--nm-light) !important;} input::placeholder,textarea::placeholder{color:var(--muted);} i[class^='ph-'],i[class*=' ph-']{line-height:1;vertical-align:-.125em;} .nm-raised{background:var(--surface);box-shadow:6px 6px 14px var(--nm-dark),-6px -6px 14px var(--nm-light);} .nm-inset{background:var(--surface);box-shadow:inset 5px 5px 11px var(--nm-dark),inset -5px -5px 11px var(--nm-light);} @keyframes fi{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}} .fi{animation:fi .2s ease} @keyframes nmpulse{0%,100%{opacity:1}50%{opacity:.4}}html{background:var(--bg);}body{transition:background-color .35s ease,color .3s ease;}`;

const PAY_BASE=["Dinheiro","PIX","Cartão Crédito","Cartão Débito","Convênio","Cheque"];
const PAY=PAY_BASE; // backward compat
// Build dynamic payment options including dentist Pix/Card
// Get short display name for dentist, skipping titles Dr/Dra
const dentShortName=function(d){
var parts=d.name.split(" ");
// Skip Dr., Dra., Dr prefix
var skip=["dr.","dra.","dr","dra"];
var real=parts.filter(function(p){return skip.indexOf(p.toLowerCase())<0;});
// Return first real name (e.g. "Diego") - if only one part, use it
return real[0]||parts[parts.length-1]||d.name;
};
const mkPayOpts=function(dents){
var extras=[];
dents.forEach(function(d){
var sn=dentShortName(d);
extras.push("Pix "+sn);
extras.push("Cartão "+sn);
});
return PAY_BASE.concat(extras);
};
// Helper: detect if payment is a dentist direct payment and which dentist
const getDentFromPayment=function(payment,dents){
if(!payment)return null;
var p=payment.toLowerCase();
return dents.find(function(d){
var sn=dentShortName(d).toLowerCase();
return p.indexOf(sn)>=0&&(p.startsWith("pix ")||p.startsWith("cartão ")||p.startsWith("cartao "));
})||null;
};
const SL={confirmed:"Confirmado",pending:"Pendente",waiting:"Aguardando",done:"Realizado",cancelled:"Cancelado",missed:"Faltou",rescheduled:"Desmarcado"};
// Colors exactly like the photo: confirmed=green, pending=orange, cancelled=red, rescheduled=grey, missed=orange-red
// Status colors - cada um bem distinto visualmente
// confirmed=azul (vai vir), pending=laranja (aguardando), done=verde (realizado)
// cancelled=vermelho (cancelado), missed=roxo (faltou), rescheduled=cinza (desmarcado)
const SC={
confirmed:"#2566a8",
pending:"#c6941f",
waiting:"#cf6b2a",
done:"var(--green)",
cancelled:"#b8443a",
missed:"#8a5fb0",
rescheduled:"var(--muted)",
blocked:"#b8443a",
};
const SC_BG={
confirmed:"var(--blue-soft)",
pending:"var(--amber-soft)",
waiting:"var(--amber-soft)",
done:"var(--green-soft)",
cancelled:"var(--red-soft)",
missed:"var(--purple-soft)",
rescheduled:"var(--surface-2)",
blocked:"var(--red-soft)",
};
// Emojis de status para identificacao rapida
const SC_ICON={
confirmed:"✅",pending:"⏳",waiting:"🪑",done:"✔️",cancelled:"❌",missed:"🚫",rescheduled:"🔄",blocked:"🔒"
};
const SCN={confirmed:"#2566a8",pending:"#c6941f",waiting:"#cf6b2a",done:"var(--green)",cancelled:"#b8443a",missed:"#8a5fb0",rescheduled:"var(--muted)",blocked:"#b8443a"};
const SCN_IC={confirmed:"ph-check-circle",pending:"ph-clock",waiting:"ph-circle",done:"ph-checks",cancelled:"ph-x-circle",missed:"ph-prohibit",rescheduled:"ph-arrows-clockwise",blocked:"ph-lock-simple"};
const GRAD={confirmed:"linear-gradient(145deg,#5a9fd4,#2566a8)",pending:"linear-gradient(145deg,#ecbf5e,#c6941f)",waiting:"linear-gradient(145deg,#ec9f4f,#cf6b2a)",done:"linear-gradient(145deg,#57bd88,var(--green))",cancelled:"linear-gradient(145deg,#db8f7d,#b8443a)",missed:"linear-gradient(145deg,#b39ac6,#8a5fb0)",rescheduled:"linear-gradient(145deg,#9aa8b0,#6b7c84)",blocked:"linear-gradient(145deg,#db8f7d,#b8443a)"};
const GLOW={confirmed:"rgba(40,110,180,.5)",pending:"rgba(200,150,40,.5)",waiting:"rgba(200,110,40,.55)",done:"rgba(50,150,100,.5)",cancelled:"rgba(180,70,55,.45)",missed:"rgba(140,95,175,.45)",rescheduled:"rgba(107,124,132,.4)",blocked:"rgba(180,70,55,.45)"};
const PROS_T=["Coroa Metalocerâmica","Coroa Zircônia","Coroa Porcelana","PPR","PPF","Prótese Total","Faceta","Inlay/Onlay","Implante (coroa)","Protocolo","Outro"];
const PROS_SL={waiting:"Aguardando",returned:"Retornou",placed:"Instalada",remake:"Refazer"};
const PROS_SC={waiting:G.yellow,returned:G.blue,placed:G.success,remake:G.red};
const IMPL_ST=["Extração","Enxerto","Implante","Prótese","Controle"];
const SLOTS=(()=>{const s=[];for(let h=8;h<=19;h++){if(h===8)s.push("08:30");else{s.push(`${String(h).padStart(2,"0")}:00`);if(h<19)s.push(`${String(h).padStart(2,"0")}:30`);}}return s;})();
// Orto slots: every 20 minutes from 08:00 to 20:00
const SLOTS_ORTO=(()=>{const s=[];for(let h=8;h<=19;h++){for(let m=0;m<60;m+=20){if(h===8&&m===0)continue; // skip 8:00, start 8:20
s.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);}}return s;})();
const MONTHS_PT=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const EXPENSE_CATS=["Aluguel","Água","Luz","Internet","Telefone","Salários","Material","Equipamento","Manutenção","Contabilidade","Outros"];

// ── Seeds ──────────────────────────────────────────────────
const USERS0=[
{id:1,name:"Dr. Diego Affonso",role:"Admin",level:3,login:"admin",pass:"1234",dentistId:1,color:UCOLS[0],active:true},
{id:2,name:"Fernanda",role:"Recepcionista",level:2,login:"fernanda",pass:"1234",dentistId:null,color:UCOLS[1],active:true},

];
const DENTS0=[
{id:1,name:"Dr. Diego Affonso",color:UCOLS[0],specialty:"Clinico Geral",commission:40,cro:"SP-72.278",
dias:[1,2,3,4,5],entrada:"08:00",saida:"18:00",almoco:{ini:"12:00",fim:"13:00"}},
];
const LABS0=[
{id:1,name:"Lab Dental Souza",phone:"1133334444",contact:"João Souza"},
{id:2,name:"Studio Protético Alves",phone:"1144445555",contact:"Carlos Alves"},
];
const PROCS0=[
{id:1,name:"Consulta",price:150},{id:2,name:"Limpeza",price:180},{id:3,name:"Restauração",price:280},
{id:4,name:"Canal",price:900},{id:5,name:"Extração",price:250},{id:6,name:"Cirurgia",price:600},
{id:7,name:"Clareamento",price:700},{id:8,name:"Implante",price:3500},{id:9,name:"Ortodontia",price:300},
{id:10,name:"Prótese",price:1200},{id:11,name:"Radiografia",price:80},
];
const PROS_PROCS0=[
{id:1,name:"Instalação de Coroa"},{id:2,name:"Instalação de Prótese Total"},
{id:3,name:"Instalação de Faceta"},{id:4,name:"Ajuste de Prótese"},{id:5,name:"Cimentação"},
];
const PATS0=[
{id:1,name:"Ana Costa",dob:"1990-04-29",genero:"F",phone:"11998123456",email:"ana@email.com",cpf:"123.456.789-00",rg:"",blood:"A+",allergy:"Nenhuma",insurance:"Unimed",notes:"Paciente hipertensa em uso de captopril.",folder:"F-0001",rx:"RX-2024-001",nf:"",obs:"",
anamnese:{hypertension:false,diabetes:false,heartDisease:false,bleeding:false,allergicMeds:"",otherConditions:"Hipertensão arterial",medications:"Captopril 25mg",pregnant:false,smoking:false,notes:""}},
{id:2,name:"Bruno Martins",dob:"1985-07-22",genero:"M",phone:"11976543210",email:"bruno@email.com",cpf:"987.654.321-00",rg:"",blood:"O-",allergy:"Penicilina",insurance:"",notes:"",folder:"F-0002",rx:"RX-2024-002",nf:"",obs:"ALÉRGICO A PENICILINA - verificar antes de medicar",
anamnese:{hypertension:false,diabetes:true,heartDisease:false,bleeding:false,allergicMeds:"Penicilina",otherConditions:"Diabetes tipo 2",medications:"Metformina",pregnant:false,smoking:false,notes:""}},
{id:3,name:"Carla Lima",dob:"2001-11-05",genero:"F",phone:"11912345678",email:"",cpf:"456.789.123-00",rg:"",blood:"B+",allergy:"Nenhuma",insurance:"",notes:"",folder:"F-0003",rx:"RX-2024-003",nf:"",obs:"",
anamnese:{hypertension:false,diabetes:false,heartDisease:false,bleeding:false,osteoporosis:false,kidneyDisease:false,liverDisease:false,thyroid:false,epilepsy:false,cancer:false,pregnant:false,smoking:false,allergicMeds:"",otherConditions:"",medications:"",notes:""}},
];
const APPTS0=[
{id:1,patientId:1,dentistId:1,date:"2026-04-29",time:"08:30",procedure:"Limpeza",treatment:"Profilaxia semestral",status:"confirmed",notes:"",value:180,payment:"PIX"},
{id:2,patientId:2,dentistId:1,date:"2026-04-29",time:"10:00",procedure:"Restauração",treatment:"Restauração dente 36",status:"pending",notes:"",value:280,payment:"Dinheiro"},
{id:3,patientId:3,dentistId:2,date:"2026-04-30",time:"14:00",procedure:"Ortodontia",treatment:"Ativação de aparelho",status:"confirmed",notes:"",value:300,payment:"Cartão Crédito"},
{id:4,patientId:1,dentistId:1,date:"2026-05-05",time:"09:00",procedure:"Clareamento",treatment:"",status:"pending",notes:"",value:700,payment:"PIX"},
];
const RECS0=[
{id:1,patientId:1,date:"2026-03-10",procedure:"Limpeza",tooth:"Geral",dentistId:1,obs:"Sem intercorrências",rx:"",paid:180,payment:"PIX",closed:true,inst:1,instM:[]},
{id:2,patientId:2,date:"2026-04-28",procedure:"Cirurgia",tooth:"38",dentistId:1,obs:"Extração siso inferior esquerdo",rx:"Amoxicilina 500mg",paid:600,payment:"Cartão Crédito",closed:true,inst:3,instM:["2026-05","2026-06","2026-07"]},
{id:3,patientId:3,date:"2025-10-29",procedure:"Limpeza",tooth:"Geral",dentistId:1,obs:"Controle semestral",rx:"",paid:180,payment:"Dinheiro",closed:true,inst:1,instM:[]},
];
const TREATS0=[{id:1,patientId:2,name:"Tratamento de Canal",items:[{desc:"1ª Sessão",value:400,paid:true,paidDate:"2026-03-20"},{desc:"2ª Sessão",value:400,paid:false},{desc:"Obturação",value:300,paid:false}],start:"2026-03-20",payments:[{id:1,date:"2026-03-20",value:400,method:"PIX",note:"1ª parcela"}]}];
const BUDGETS0=[{id:1,patientId:1,date:"2026-03-01",items:[{d:"Clareamento",v:600},{d:"Limpeza",v:180}],status:"approved",notes:"",disc:0,attach:""}];
const PROS0=[
{id:1,patientId:1,dentistId:1,labId:1,type:"Coroa Metalocerâmica",proc:"Instalação de Coroa",tooth:"16",sent:"2026-04-10",due:"2026-04-29",returned:"",status:"waiting",notes:"Cor A2",price:350},
{id:2,patientId:2,dentistId:1,labId:1,type:"Coroa Zircônia",proc:"Instalação de Coroa",tooth:"21",sent:"2026-04-15",due:"2026-04-29",returned:"",status:"waiting",notes:"Cor B1",price:580},
];
const REMS0=[{id:1,title:"Confirmar consulta Ana",desc:"Ligar para confirmar",date:"2026-04-29",priority:"high",done:false,patientId:1,assignedUserId:2}];
const STOCK0=[
{id:1,name:"Luvas P (cx)",qty:5,unit:"cx",min:2,price:28.5,movs:[{t:"in",q:10,date:"2026-04-01",note:"Compra"}]},
{id:2,name:"Resina Composta A2",qty:8,unit:"un",min:3,price:89,movs:[{t:"in",q:10,date:"2026-04-01",note:"Compra"}]},
];
const IMPL0=[
{id:1,patientId:1,notes:"Implante unitário dente 16",months:{"2026-02":{"Cirurgia":"IMPLANTE","Obs.":"Extraído fev"},"2026-04":{"Implante":"IMPLANTE"},"2026-07":{"Prótese":"PRÓTESE"}}},
{id:2,patientId:2,notes:"Dente 21",months:{"2026-03":{"Enxerto":"ENXERTO"},"2026-05":{"Implante":"IMPLANTE"}}}
];
const EXPENSES0={
clinic:[
{id:1,date:"2026-04-05",cat:"Aluguel",desc:"Aluguel consultório abril",value:3500,paid:true},
{id:2,date:"2026-04-10",cat:"Água",desc:"Conta água março",value:120,paid:true},
{id:3,date:"2026-04-10",cat:"Luz",desc:"Conta luz março",value:280,paid:false},
],
personal:[
{id:1,date:"2026-04-01",cat:"Moradia",desc:"Aluguel residencial",value:2200,paid:true},
{id:2,date:"2026-04-15",cat:"Alimentação",desc:"Supermercado",value:650,paid:true},
]
};

const PIXRECS0=[
{id:1,dentistId:1,patientId:1,date:"2026-04-10",value:500,method:"PIX",procedure:"Clareamento",note:"Pix direto Dr Diego",installments:1},
];

// ── Helpers ────────────────────────────────────────────────
const fmt=d=>d?new Date(d+"T12:00").toLocaleDateString("pt-BR"):"-";
const _ld=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const today=()=>_ld(new Date());
// Normaliza horário para "HH:MM" com zero à esquerda (ex: "8:15" -> "08:15"). Evita bug de ordenação alfabética na agenda.
const pad2=t=>{if(!t||typeof t!=="string")return t;var p=t.split(":");if(p.length<2)return t;return String(p[0]).padStart(2,"0")+":"+String(p[1]).padStart(2,"0");};
// Converte "HH:MM" em minutos, para ordenar horários numericamente (à prova de formato).
const t2m=t=>{var p=String(t||"").split(":");return (Number(p[0])||0)*60+(Number(p[1])||0);};
const yest=()=>{const d=new Date();d.setDate(d.getDate()-1);return _ld(d);};
const tom=()=>{const d=new Date();d.setDate(d.getDate()+1);return _ld(d);};
const cur=v=>{var n=Math.round((Number(v)||0)*100)/100,neg=n<0,s=Math.abs(n).toFixed(2).split("."),i=s[0].replace(/\B(?=(\d{3})+(?!\d))/g,".");return (neg?"-":"")+"R$ "+i+","+s[1];};
const pmoney=x=>{var r=String(x==null?"":x).replace(",",".").replace(/[^0-9.]/g,"");var n=parseFloat(r);return isNaN(n)?0:Math.round(n*100)/100;};
const MOTIVOS_ORC=["Preço / Achou caro","Vai pensar","Problema financeiro","Atendimento","Foi para outra clínica","Outro"];
let _idLast=0;
const nid=()=>{let t=Date.now()*1000+Math.floor(Math.random()*1000);if(t<=_idLast)t=_idLast+1;_idLast=t;return t;};
const mkLog=function(logs,setLogs,user,tipo,desc,patName){
var entry={id:nid(),ts:new Date().toISOString(),user:user&&user.name||"Sistema",tipo:tipo,desc:desc,patName:patName||""};
setLogs(function(prev){return[entry,...prev].slice(0,500);});
};
const isBday=d=>{if(!d)return false;return d.slice(5)===today().slice(5);};
const mo6=d=>{const x=new Date(d+"T12:00");x.setMonth(x.getMonth()+6);return x.toISOString().split("T")[0];};
const moN=(d,n)=>{const x=new Date(d+"T12:00");x.setMonth(x.getMonth()+(Number(n)||6));return x.toISOString().split("T")[0];};
const retMonths=p=>{var m=p&&Number(p.retMeses);return (m&&m>0)?m:6;};
const retDue=(p,lastDate)=>{if(!lastDate)return null;if(p&&p.retData&&p.retData>=lastDate)return p.retData;return moN(lastDate,retMonths(p));};
const retLabel=(p,lastDate)=>{if(p&&p.retData&&(!lastDate||p.retData>=lastDate))return "Controle "+fmt(p.retData);var m=retMonths(p);return m===6?"Semestral":("Controle "+m+" meses");};
const calcNet=(v,p)=>p==="Cartão Crédito"?v*0.965:p==="Cartão Débito"?v*0.98:v;
const wa=(ph,msg)=>{const n=(ph||"").replace(/\D/g,"");const u="https://wa.me/"+(n.startsWith("55")?n:"55"+n)+"?text="+encodeURIComponent(msg);const a=document.createElement("a");a.href=u;a.target="_blank";document.body.appendChild(a);a.click();document.body.removeChild(a);};
const age=dob=>{if(!dob)return"";const d=new Date(dob+"T12:00");const a=new Date();let y=a.getFullYear()-d.getFullYear();if(a.getMonth()<d.getMonth()||(a.getMonth()===d.getMonth()&&a.getDate()<d.getDate()))y--;return y+" anos";};
const getDaysInMonth=(y,m)=>new Date(y,m+1,0).getDate();
const getFirstDayOfMonth=(y,m)=>new Date(y,m,1).getDay();

// ── UI Atoms ───────────────────────────────────────────────
const Bdg=({l,col,sm})=><span style={{background:col+"22",color:col,borderRadius:20,padding:sm?"2px 7px":"3px 10px",fontSize:sm?10:11,fontWeight:700,whiteSpace:"nowrap"}}>{l}</span>;
const Btn=({ch,onClick,v="p",sm,style,dis})=>{
const b={cursor:dis?"not-allowed":"pointer",opacity:dis?.5:1,border:"none",borderRadius:10,fontFamily:"'Manrope'",fontWeight:700,transition:"all .15s",display:"inline-flex",alignItems:"center",gap:5,whiteSpace:"nowrap"};
const vs={p:{background:G.primary,color:"#ead9b6",padding:sm?"6px 13px":"10px 18px",fontSize:sm?12:14,boxShadow:"4px 4px 11px rgba(34,70,52,.40),-3px -3px 8px var(--nm-light)"},g:{background:"var(--surface)",color:G.primary,boxShadow:"3px 3px 7px var(--nm-dark),-3px -3px 7px var(--nm-light)",padding:sm?"6px 12px":"9px 17px",fontSize:sm?12:14},r:{background:G.red,color:"#fff",padding:sm?"6px 13px":"10px 18px",fontSize:sm?12:14,boxShadow:"4px 4px 10px rgba(150,40,30,.32),-3px -3px 8px var(--nm-light)"},y:{background:G.yellow,color:"#fff",padding:sm?"6px 13px":"10px 18px",fontSize:sm?12:14,boxShadow:"4px 4px 10px rgba(180,130,30,.32),-3px -3px 8px var(--nm-light)"},w:{background:"#25D366",color:"#fff",padding:sm?"6px 13px":"10px 18px",fontSize:sm?12:14,boxShadow:"4px 4px 10px rgba(20,160,80,.3),-3px -3px 8px var(--nm-light)"},f:{background:"var(--surface)",color:G.primary,boxShadow:"3px 3px 7px var(--nm-dark),-3px -3px 7px var(--nm-light)",padding:sm?"6px 13px":"10px 18px",fontSize:sm?12:14}};
return <button style={{...b,...vs[v],...style}} onClick={onClick} disabled={dis}>{ch}</button>;
};
const Inp=({lb,val,set,type="text",ph,ro,style,min,max})=>(

  <div style={{display:"flex",flexDirection:"column",gap:4,...style}}>
    {lb&&<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>{lb}</label>}
    <input value={val||""} onChange={e=>set&&set(e.target.value)} type={type} placeholder={ph} readOnly={ro} min={min} max={max}
      style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",color:G.text,background:ro?"var(--green-soft)":"var(--card)"}}/>
  </div>
);
const Txt=({lb,val,set,rows=3,ro,style})=>(
  <div style={{display:"flex",flexDirection:"column",gap:4,...style}}>
    {lb&&<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>{lb}</label>}
    <textarea value={val||""} onChange={e=>set&&set(e.target.value)} rows={rows} readOnly={ro}
      style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",color:G.text,background:ro?"var(--green-soft)":"var(--card)",resize:"vertical"}}/>
  </div>
);
const Sel=({lb,val,set,opts,style})=>(
  <div style={{display:"flex",flexDirection:"column",gap:4,...style}}>
    {lb&&<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>{lb}</label>}
    <select value={val||""} onChange={e=>set(e.target.value)} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",color:G.text,background:"var(--surface)"}}>
      {opts.map(o=><option key={o.v??o} value={o.v??o}>{o.l??o}</option>)}
    </select>
  </div>
);
const R2=({a,b,gap=11})=><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap}}>{a}{b}</div>;
const R3=({a,b,c,gap=11})=><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap}}>{a}{b}{c}</div>;
const Div=({lb})=><div style={{display:"flex",alignItems:"center",gap:8,margin:"5px 0"}}>{lb&&<span style={{fontSize:10,fontWeight:700,color:G.muted,textTransform:"uppercase",whiteSpace:"nowrap"}}>{lb}</span>}<div style={{flex:1,height:1,background:G.border}}/></div>;
const SC2=({save,cancel,lbl="Salvar"})=><div style={{display:"flex",gap:9,justifyContent:"flex-end",marginTop:14,paddingTop:12,borderTop:`1px solid ${G.border}`}}><Btn ch="Cancelar" v="g" onClick={cancel}/><Btn ch={lbl} onClick={save}/></div>;

const Modal=({open,close,title,ch,wide,xl})=>{
if(!open)return null;
return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:12}}>

<div style={{background:G.card,borderRadius:18,width:"100%",maxWidth:xl?980:wide?720:520,maxHeight:"94vh",overflowY:"auto",boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${G.border}`,position:"sticky",top:0,background:G.card,zIndex:1}}>
<span style={{fontFamily:"'Cormorant Garamond'",fontSize:20}}>{title}</span>
<button onClick={close} style={{border:"none",background:"none",fontSize:24,cursor:"pointer",color:G.muted}}>×</button>
</div>
<div style={{padding:20}}>{ch}</div>
</div>

  </div>;
};

const DatePick=({lb,val,set})=>{
const p=val?val.split("-"):["","",""];
const [y,sy]=useState(p[0]);const [m,sm]=useState(p[1]);const [d,sd]=useState(p[2]);
useEffect(()=>{if(y&&m&&d)set(`${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`);},[y,m,d]);
const yrs=[];for(let yr=1930;yr<=new Date().getFullYear();yr++)yrs.push(yr);
return <div style={{display:"flex",flexDirection:"column",gap:4}}>
{lb&&<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>{lb}</label>}

<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 2fr",gap:5}}>
<input placeholder="DD" maxLength={2} value={d} onChange={e=>sd(e.target.value)} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 6px",fontSize:13,outline:"none",textAlign:"center"}}/>
<input placeholder="MM" maxLength={2} value={m} onChange={e=>sm(e.target.value)} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 6px",fontSize:13,outline:"none",textAlign:"center"}}/>
<select value={y} onChange={e=>sy(e.target.value)} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 5px",fontSize:12,outline:"none",background:"var(--surface)"}}>
<option value="">Ano</option>
{yrs.reverse().map(yr=><option key={yr} value={yr}>{yr}</option>)}
</select>
</div>

  </div>;
};

// Auto reminders
// Conta itens automaticos REALMENTE pendentes (mesma logica refinada da tela de Lembretes):
// aniversariantes de hoje, semestral vencido SEM agendamento futuro, e pos-cirurgico de ontem;
// sempre descontando os que ja foram tratados (ticks). Evita o badge inflado.
function autoActionableCount(pats,recs,appts,pacsTicks,semTicks,user){
  var t=today();var pt=pacsTicks||{};var st=semTicks||{};
  var isDent=!!(user&&user.level===1);var per=t.slice(0,7);
  var y=new Date(new Date(t+"T12:00").getTime()-86400000).toISOString().split("T")[0];
  var PC=["Exodontia","Extracao","Extração","Exo","Implante","Cirurgia","Cirurgico","Cirúrgico","Cirúrgica","Enxerto","Sinus","Gengivoplastia","Apicectomia","Frenectomia","Biopsia","Urgencia","Urgência","Emergencia","Emergência"];
  var n=0;
  pats.forEach(function(p){
    // aniversario hoje (nao marcado)
    if(p.dob&&p.dob.slice(5)===t.slice(5)){
      var tkB=pt["bday_week_"+p.id+"_"+per];
      if(!(tkB&&tkB.done))n++;
    }
    // semestral vencido, sem agendamento futuro e nao tratado
    var lastRec=recs.filter(function(r){return r.patientId===p.id&&r.paid>0;}).sort(function(a,b){return b.date.localeCompare(a.date);})[0];
    if(lastRec&&retDue(p,lastRec.date)<=t){
      var futura=appts.find(function(a){return a.patientId===p.id&&a.date>=t&&a.status!=="cancelled"&&a.status!=="missed";});
      var tratado=st[p.id]&&st[p.id].done;
      if(!futura&&!tratado)n++;
    }
  });
  // pos-cirurgico de ontem nao contatado
  appts.forEach(function(a){
    if(a.date!==y)return;
    if(a.status!=="done"&&a.status!=="confirmed")return;
    if(isDent&&a.dentistId!==user.dentistId)return;
    var hit=PC.some(function(k){var kw=k.toLowerCase();return (a.procedure&&a.procedure.toLowerCase().indexOf(kw)>=0)||(a.treatment&&a.treatment.toLowerCase().indexOf(kw)>=0);});
    if(!hit)return;
    if(!pats.find(function(x){return x.id===a.patientId;}))return;
    var tkP=pt["poscir_"+a.patientId+"_"+a.date];
    if(tkP&&tkP.done)return;
    n++;
  });
  return n;
}
const autoRems=(pats,recs,appts)=>{
const t=today(),y=yest(),tm=tom();const out=[];
pats.forEach(p=>{
if(isBday(p.dob))out.push({id:`b${p.id}`,title:`🎂 Aniversário -- ${p.name}`,desc:"Hoje é aniversário! Enviar parabéns.",date:t,priority:"medium",done:false,patientId:p.id,type:"bday"});
const lr=recs.filter(r=>r.patientId===p.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
if(lr&&lr.paid>0&&retDue(p,lr.date)<=t)out.push({id:`s${p.id}`,title:`📅 ${retLabel(p,lr.date)} -- ${p.name}`,desc:`Último atend: ${fmt(lr.date)}`,date:t,priority:"medium",done:false,patientId:p.id,type:"semi"});
const surg=recs.find(r=>r.patientId===p.id&&r.procedure==="Cirurgia"&&r.date===y);
if(surg)out.push({id:`c${p.id}`,title:`🔴 Pós-Cirurgia -- ${p.name}`,desc:`Cirurgia ontem (D.${surg.tooth}).`,date:t,priority:"high",done:false,patientId:p.id,type:"surg"});
});
appts.filter(a=>a.date===y&&(a.status==="missed"||a.status==="cancelled"||a.status==="rescheduled")).forEach(a=>{
const p=pats.find(x=>x.id===a.patientId);if(!p)return;
out.push({id:`m${a.id}`,title:`📵 Remarcar -- ${p.name}`,desc:`${SL[a.status]} em ${fmt(a.date)} às ${a.time}`,date:t,priority:"high",done:false,patientId:p.id,type:"miss"});
});
appts.filter(a=>a.date===tm&&a.status==="confirmed").forEach(a=>{
const p=pats.find(x=>x.id===a.patientId);if(!p)return;
out.push({id:`t${a.id}`,title:`📲 Confirmar amanhã -- ${p.name}`,desc:`${a.procedure} às ${a.time}`,date:t,priority:"medium",done:false,patientId:p.id,type:"conf",apptId:a.id});
});
return out;
};

// ══════════════════════════════════════════════════════════
// PATIENT FOLDER - full modal with tabs like the photo
// ══════════════════════════════════════════════════════════
function PatSearch({lb,val,set,pats,optional}){
var sel=pats.find(function(p){return p.id===Number(val);});
var [q,setQ]=useState("");
var [open,setOpen]=useState(false);
var norm=function(s){return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");};
var res=q.length>=1?pats.filter(function(p){
var nq=norm(q);
return norm(p.name).indexOf(nq)>=0||
(p.folder||"").indexOf(q)>=0||
(p.phone||"").indexOf(q)>=0;
}).slice(0,12):[];
return (

<div style={{position:"relative",display:"flex",flexDirection:"column",gap:4}}>
{lb&&<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>{lb}</label>}
{sel&&!open
?<div style={{display:"flex",alignItems:"center",gap:8,background:G.accent,borderRadius:8,padding:"8px 11px",border:"1.5px solid "+G.primary}}>
<span style={{flex:1,fontSize:13,fontWeight:700}}>{sel.name}<span style={{fontWeight:400,color:G.muted}}>{" · "+sel.folder}</span></span>
<button onClick={function(){set("");setQ("");}} style={{border:"none",background:"none",color:G.muted,cursor:"pointer",fontSize:12,fontWeight:700,lineHeight:1,padding:"2px 4px",display:"flex",alignItems:"center",gap:3}}>trocar <span style={{fontSize:16}}>{"×"}</span></button>
</div>
:<div>
<input value={q} onChange={function(e){setQ(e.target.value);setOpen(true);}} onFocus={function(){setOpen(true);}}
placeholder={optional?"Opcional -- digite para buscar":"Digite nome, ficha ou telefone..."}
style={{width:"100%",border:"1.5px solid "+(open?G.primary:G.border),borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
{open&&res.length>0&&(
<div style={{position:"absolute",top:"100%",left:0,right:0,background:"var(--surface)",borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,.15)",zIndex:999,maxHeight:260,overflowY:"auto",border:"1px solid "+G.border,marginTop:3}}>
{res.map(function(p){return(
<div key={p.id} onMouseDown={function(){set(String(p.id));setQ("");setOpen(false);}}
style={{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid "+G.border,display:"flex",gap:9,alignItems:"center"}}
onMouseEnter={function(e){e.currentTarget.style.background=G.accent;}}
onMouseLeave={function(e){e.currentTarget.style.background="#fff";}}>
<div style={{width:32,height:32,borderRadius:"50%",background:G.primary,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0}}>{(p.name||"?")[0]}</div>
<div>
<div style={{fontWeight:700,fontSize:13}}>{p.name}</div>
<div style={{fontSize:11,color:G.muted}}>{p.folder+(p.phone?" · "+p.phone:"")}</div>
</div>
</div>
);})}
</div>
)}
</div>
}
{open&&<div style={{position:"fixed",inset:0,zIndex:998}} onClick={function(){setOpen(false);}}/>}
</div>
);
}

// ══════════════════════════════════════════════════════════
// ANAMNESE — assinatura digital + envio por WhatsApp (Supabase)
// ══════════════════════════════════════════════════════════
function SignaturePad({value,onChange,disabled}){
  const ref=useRef(null);
  const drawing=useRef(false);
  const last=useRef(null);
  const skip=useRef(false);
  useEffect(function(){
    var c=ref.current; if(!c)return;
    if(skip.current){skip.current=false;return;}
    var ctx=c.getContext("2d");
    ctx.clearRect(0,0,c.width,c.height);
    if(value){var img=new Image();img.onload=function(){ctx.drawImage(img,0,0,c.width,c.height);};img.src=value;}
  },[value]);
  function pos(e){
    var c=ref.current; var r=c.getBoundingClientRect(); var cx,cy;
    if(e.touches&&e.touches[0]){cx=e.touches[0].clientX;cy=e.touches[0].clientY;}else{cx=e.clientX;cy=e.clientY;}
    return {x:(cx-r.left)*(c.width/r.width),y:(cy-r.top)*(c.height/r.height)};
  }
  function start(e){if(disabled)return;if(e.cancelable)e.preventDefault();drawing.current=true;last.current=pos(e);}
  function move(e){if(disabled||!drawing.current)return;if(e.cancelable)e.preventDefault();var c=ref.current;var ctx=c.getContext("2d");var p=pos(e);ctx.strokeStyle="#1a2733";ctx.lineWidth=2.2;ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();ctx.moveTo(last.current.x,last.current.y);ctx.lineTo(p.x,p.y);ctx.stroke();last.current=p;}
  function end(){if(disabled||!drawing.current)return;drawing.current=false;var c=ref.current;skip.current=true;if(onChange)onChange(c.toDataURL("image/png"));}
  function clear(){if(disabled)return;var c=ref.current;var ctx=c.getContext("2d");ctx.clearRect(0,0,c.width,c.height);skip.current=true;if(onChange)onChange("");}
  return <div>
    <canvas ref={ref} width={520} height={170} style={{width:"100%",height:150,border:"1.5px dashed "+G.border,borderRadius:10,background:"#f4f6f3",touchAction:"none",display:"block",cursor:disabled?"default":"crosshair"}}
      onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
      onTouchStart={start} onTouchMove={move} onTouchEnd={end}/>
    {!disabled&&<div style={{display:"flex",justifyContent:"flex-end",marginTop:6}}><button onClick={clear} style={{border:"1.5px solid "+G.border,background:"var(--surface)",color:G.muted,borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:600,cursor:"pointer"}}>Limpar assinatura</button></div>}
  </div>;
}

function anamHTML(pat){
  var a=pat.anamnese||{};
  function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
  function brd(d){if(!d)return "";var p=String(d).split("-");return p.length===3?(p[2]+"/"+p[1]+"/"+p[0]):d;}
  var conds=ANAM_CONDS;
  var rows=conds.map(function(c){var s=a[c[0]];var det=a[c[0]+"_det"];return "<tr><td>"+c[1]+"</td><td style='font-weight:700;color:"+(s?"#C0392B":"#2c3e50")+"'>"+(s?"Sim":"Nao")+((s&&det)?(" <span style='font-weight:400;color:#555'>("+esc(det)+")</span>"):"")+"</td></tr>";}).join("");
  var nome=CLINICA_INFO.nome;
  var ender=CLINICA_INFO.endereco;
  var sig=a.signature?("<img src='"+a.signature+"' style='max-height:90px;max-width:300px'/>"):"<div style='height:64px'></div>";
  var info=a.signedAt?("Assinado por "+esc(a.signedBy||pat.name)+" em "+brd(a.signedAt)):"Assinatura do paciente";
  return "<!doctype html><html><head><meta charset='utf-8'><title>Anamnese - "+esc(pat.name)+"</title>"+
    "<style>body{font-family:Arial,Helvetica,sans-serif;color:#2c3e50;padding:30px;max-width:760px;margin:auto}h1{font-size:20px;text-align:center;margin:6px 0 2px}.sub{text-align:center;color:#888;font-size:12px;margin-bottom:16px}.hd{display:flex;justify-content:space-between;font-size:12px;color:#555;border-bottom:2px solid #2c3e50;padding-bottom:8px}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}td{padding:6px 8px;border-bottom:1px solid #eee}.box{margin-top:12px;font-size:13px}.lab{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px}.sigl{margin-top:6px;border-top:1px solid #999;width:300px;text-align:center;padding-top:6px;font-size:12px;color:#555}@media print{.np{display:none}}</style>"+
    "</head><body><div class='hd'><div><b>"+esc(nome)+"</b><br>"+esc(ender)+"</div><div>"+(new Date().toLocaleDateString("pt-BR"))+"</div></div>"+
    "<h1>Ficha de Anamnese</h1><div class='sub'>"+esc(pat.name)+(pat.cpf?(" &middot; CPF "+esc(pat.cpf)):"")+(pat.dob?(" &middot; Nasc. "+brd(pat.dob)):"")+"</div>"+
    "<table><tr><td class='lab'>Condicao</td><td class='lab'>Resposta</td></tr>"+rows+"</table>"+
    "<div class='box'><span class='lab'>Alergias a Medicamentos</span><br>"+esc(a.allergicMeds||"-")+"</div>"+
    "<div class='box'><span class='lab'>Medicamentos em Uso</span><br>"+esc(a.medications||"-")+"</div>"+
    "<div class='box'><span class='lab'>Outras Condicoes de Saude</span><br>"+esc(a.otherConditions||"-")+"</div>"+
    "<div class='box'><span class='lab'>Observacoes</span><br>"+esc(a.notes||"-")+"</div>"+
    "<div style='margin-top:36px'>"+sig+"<div class='sigl'>"+info+"</div></div>"+
    "<div class='np' style='margin-top:28px;text-align:center'><button onclick='window.print()' style='padding:10px 22px;font-size:14px;background:#2c3e50;color:#fff;border:none;border-radius:8px;cursor:pointer'>Imprimir / Salvar PDF</button></div>"+
    "</body></html>";
}

function AnamForm({patientName,initial,onSubmit,onCancel,submitting}){
  const conds=ANAM_CONDS;
  const [a,setA]=useState(function(){var base={allergicMeds:"",medications:"",otherConditions:"",notes:"",signature:"",signedAt:"",signedBy:patientName||""};conds.forEach(function(c){base[c[0]]=false;});return Object.assign(base,initial||{});});
  function set(k,v){setA(function(p){var n=Object.assign({},p);n[k]=v;return n;});}
  var canSubmit=!!a.signature;
  return <div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">
    <div style={{textAlign:"center"}}>
      <div style={{fontFamily:"'Cormorant Garamond'",fontSize:24,color:G.primary}}>{CLINICA_INFO.nome}</div>
      <div style={{fontSize:13,color:G.muted}}>Ficha de Anamnese{patientName?(" · "+patientName):""}</div>
    </div>
    <div style={{background:G.accent,borderRadius:10,padding:"10px 13px",fontSize:12.5,color:G.primary}}>Responda SIM ou NÃO em cada item. Leva menos de 2 minutos.</div>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {conds.map(function(c){var v=a[c[0]];return <div key={c[0]} style={{display:"flex",flexDirection:"column",gap:7,background:G.bg,borderRadius:10,padding:"9px 12px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{flex:1,fontSize:13.5,color:G.text}}>{c[1]}</span>
        <button onClick={function(){set(c[0],true);}} style={{border:"2px solid "+(v?G.red:G.border),background:v?G.red:"var(--card)",color:v?"#fff":G.muted,borderRadius:8,padding:"6px 15px",fontSize:13,fontWeight:700,cursor:"pointer"}}>SIM</button>
        <button onClick={function(){set(c[0],false);}} style={{border:"2px solid "+(!v?G.success:G.border),background:!v?G.success:"var(--card)",color:!v?"#fff":G.muted,borderRadius:8,padding:"6px 15px",fontSize:13,fontWeight:700,cursor:"pointer"}}>NÃO</button>
        </div>
        {v&&<input value={a[c[0]+"_det"]||""} onChange={function(e){set(c[0]+"_det",e.target.value);}} placeholder="Quando? Já tratou ou ainda tem? (opcional)" style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"8px 10px",fontSize:13,outline:"none",width:"100%"}}/>}
      </div>;})}
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Alergias a medicamentos</label>
      <input value={a.allergicMeds} onChange={function(e){set("allergicMeds",e.target.value);}} placeholder="Ex: penicilina, dipirona (ou deixe em branco)" style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"9px 11px",fontSize:14,outline:"none"}}/>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Medicamentos em uso</label>
      <input value={a.medications} onChange={function(e){set("medications",e.target.value);}} placeholder="Remédios que toma com frequência" style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"9px 11px",fontSize:14,outline:"none"}}/>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Observações</label>
      <textarea value={a.notes} onChange={function(e){set("notes",e.target.value);}} rows={2} placeholder="Algo mais que o dentista deva saber?" style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"9px 11px",fontSize:14,outline:"none",resize:"vertical",fontFamily:"inherit"}}/>
    </div>
    <div>
      <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Assinatura</label>
      <div style={{marginTop:6}}><SignaturePad value={a.signature} disabled={false} onChange={function(v){setA(function(p){var n=Object.assign({},p);n.signature=v;n.signedAt=v?(p.signedAt||today()):"";n.signedBy=v?(patientName||p.signedBy||""):"";return n;});}}/></div>
    </div>
    <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
      {onCancel&&<button onClick={onCancel} style={{border:"1.5px solid "+G.primary,background:"transparent",color:G.primary,borderRadius:9,padding:"10px 18px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancelar</button>}
      <button disabled={!canSubmit||submitting} onClick={function(){if(canSubmit&&onSubmit)onSubmit(a);}} style={{background:(!canSubmit||submitting)?G.muted:G.success,color:"#fff",border:"none",borderRadius:9,padding:"11px 22px",fontSize:14,fontWeight:700,cursor:(!canSubmit||submitting)?"not-allowed":"pointer"}}>{submitting?"Enviando...":"✓ Enviar ficha"}</button>
    </div>
    {!canSubmit&&<div style={{fontSize:11.5,color:G.muted,textAlign:"right"}}>Assine no quadro acima para enviar.</div>}
  </div>;
}

async function avisarAnamnese(token,a){
  var RAILWAY="https://whatsapp-webhook-production-d5be.up.railway.app";
  var KEY="affonso2025";
  var pid="";
  try{var dec=atob(token);pid=dec.replace("orbe:","");}catch(e){pid="";}
  var nome="";
  if(SUPA_URL&&pid){
    try{
      var r=await fetch(SUPA_URL+"/rest/v1/patients?id=eq."+encodeURIComponent(pid)+"&select=name&limit=1",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok()}});
      var rows=await r.json();
      if(rows&&rows[0]&&rows[0].name)nome=rows[0].name;
    }catch(e){}
  }
  var alertas=[];
  try{ANAM_ALERT.forEach(function(k){if(a&&a[k]){var c=ANAM_CONDS.find(function(x){return x[0]===k;});var det=a[k+"_det"];alertas.push((c?c[1]:k)+(det?(" — "+String(det)):""));}});}catch(e){}
  var txt="\uD83D\uDCCB *ANAMNESE RECEBIDA*\n\n\uD83D\uDC64 "+(nome||("Paciente ID "+pid))+"\n\nO paciente preencheu a ficha de saude pelo WhatsApp.\n\u27A1\uFE0F Abra o prontuario e clique em *Buscar* na aba Anamnese para revisar e salvar.";
  if(alertas.length>0)txt+="\n\n\u26A0\uFE0F *Atencao:* "+alertas.join(", ");
  try{
    await fetch(RAILWAY+"/api/avisar",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":KEY},body:JSON.stringify({texto:txt})});
  }catch(e){}
}
function PublicAnamnese({token}){
  const [done,setDone]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [err,setErr]=useState("");
  function submit(a){
    setErr("");
    if(!SUPA_URL){setDone(true);return;}
    setSubmitting(true);
    supabase.submitAnam(token,a).then(function(res){setSubmitting(false);if(res&&res.ok){setDone(true);try{avisarAnamnese(token,a);}catch(e){}}else{var m=(res&&res.msg)?res.msg:"Verifique a conexao e tente novamente.";setErr("Nao foi possivel enviar. "+m+((res&&res.status)?(" (codigo "+res.status+")"):""));}});
  }
  return <div style={{minHeight:"100vh",background:G.bg,padding:"24px 16px"}}>
    <style>{CSS}</style>{/* V191: sem o CSS global, as vars --red/--green nao existiam na pagina publica e o botao NAO ficava branco-sobre-branco (invisivel) */}
    <div style={{maxWidth:560,margin:"0 auto",background:G.card,borderRadius:16,boxShadow:"0 4px 24px rgba(0,0,0,.1)",padding:"22px 20px"}}>
      {done
        ? <div style={{textAlign:"center",display:"flex",flexDirection:"column",gap:12,padding:"24px 0"}}>
            <div style={{fontSize:48}}>{"\u2705"}</div>
            <div style={{fontFamily:"'Cormorant Garamond'",fontSize:24,color:G.primary}}>Ficha enviada!</div>
            <div style={{fontSize:14,color:G.text}}>Obrigado! Sua ficha de saúde foi registrada{" para "+CLINICA_INFO.nome}.</div>
            {!SUPA_URL&&<div style={{fontSize:11.5,color:G.muted}}>(Modo demonstração: sem banco conectado, os dados não foram salvos.)</div>}
          </div>
        : <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <AnamForm patientName={""} initial={null} submitting={submitting} onSubmit={submit}/>
            {err&&<div style={{background:"var(--red-soft)",border:"1px solid "+G.red,color:G.red,borderRadius:8,padding:"9px 12px",fontSize:12.5}}>{err}</div>}
          </div>}
    </div>
  </div>;
}


/* ===================== PORTAL DO PACIENTE (inicio) ===================== */
function genToken(){var c="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";var s="";try{var a=new Uint8Array(28);(window.crypto||window.msCrypto).getRandomValues(a);for(var i=0;i<a.length;i++)s+=c[a[i]%c.length];}catch(e){for(var j=0;j<28;j++)s+=c[Math.floor(Math.random()*c.length)];}return s;}

// ══════════════════════════════════════════════════════════
// CONTRATO DE TRATAMENTO — assinatura eletrônica (V195)
// Dados na tabela 'contratos' do Supabase (FORA do blob principal — sem impacto no mergeArr/sync).
// Acesso via Edge Function 'contratos': fetch/sign públicas por token; create/list/renew só logado.
// ══════════════════════════════════════════════════════════
const CONTRATO_FN=SUPA_URL+"/functions/v1/contratos";
const contratoApi={
  async call(body){try{const r=await fetch(CONTRATO_FN,{method:"POST",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok(),"Content-Type":"application/json"},body:JSON.stringify(body)});var j=null;try{j=await r.json();}catch(e){}if(!r.ok)return {ok:false,http:r.status,msg:(j&&j.error)||("Erro "+r.status)};return Object.assign({ok:true},j||{});}catch(e){return {ok:false,msg:String((e&&e.message)||e)};}},
  fetchC(token){return this.call({op:"fetch",token:token});},
  signC(token,signature){return this.call({op:"sign",token:token,signature:signature});},
  createC(o){return this.call(Object.assign({op:"create"},o));},
  listC(patientId){return this.call({op:"list",patientId:patientId});},
  renewC(id){return this.call({op:"renew",id:id});}
};
function contratoLink(token){return appBase()+"?contrato="+encodeURIComponent(token);}
function buildContratoHTML(o){
  function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
  function brd2(d){if(!d)return "";var p=String(d).split("-");return p.length===3?(p[2]+"/"+p[1]+"/"+p[0]):String(d);}
  var pat=o.pat||{},dent=o.dent||{},itens=o.itens||[],disc=Number(o.disc)||0;
  var total=itens.reduce(function(s,it){return s+(Number(it.v)||0);},0)-disc;
  var linhas=itens.map(function(it){return "<tr><td style='padding:7px 10px;border-bottom:1px solid #d8ded3'>"+esc(it.d)+"</td><td style='padding:7px 10px;border-bottom:1px solid #d8ded3;text-align:right;white-space:nowrap'>"+esc(cur(it.v))+"</td></tr>";}).join("");
  if(disc>0)linhas+="<tr><td style='padding:7px 10px;color:#C0392B'>Desconto</td><td style='padding:7px 10px;text-align:right;color:#C0392B'>-"+esc(cur(disc))+"</td></tr>";
  var hoje=new Date();var dEmiss=("0"+hoje.getDate()).slice(-2)+"/"+("0"+(hoje.getMonth()+1)).slice(-2)+"/"+hoje.getFullYear();
  return "<div style='font-family:Georgia,serif;color:#23332b;max-width:720px;margin:0 auto;font-size:14px;line-height:1.55'>"
   +"<div style='text-align:center;margin-bottom:18px'><div style='font-size:22px;font-weight:700;color:#2f5d49'>"+esc(CLINICA_INFO.nome)+"</div><div style='font-size:12px;color:#7c8a80'>"+esc(CLINICA_INFO.endereco)+" · Tel: "+esc(CLINICA_INFO.telefone)+"</div></div>"
   +"<div style='text-align:center;font-size:16px;font-weight:700;margin:14px 0 18px;text-transform:uppercase;letter-spacing:.5px'>Contrato de Prestação de Serviços Odontológicos</div>"
   +"<p><b>CONTRATADA:</b> "+esc(CLINICA_INFO.nome)+", com endereço em "+esc(CLINICA_INFO.endereco)+", telefone "+esc(CLINICA_INFO.telefone)+", neste ato representada pelo(a) cirurgião(ã)-dentista responsável <b>"+esc(dent.name||"")+"</b>"+(dent.cro?(", CRO "+esc(dent.cro)):"")+".</p>"
   +"<p style='margin-top:8px'><b>CONTRATANTE:</b> <b>"+esc(pat.name||"")+"</b>"+(pat.cpf?(", CPF "+esc(pat.cpf)):"")+(pat.rg?(", RG "+esc(pat.rg)):"")+".</p>"
   +"<p style='margin-top:12px'><b>CLÁUSULA 1ª — DO OBJETO.</b> A CONTRATADA prestará ao CONTRATANTE os serviços odontológicos abaixo relacionados, conforme orçamento"+(o.budgetDate?(" de "+esc(brd2(o.budgetDate))):"")+" aprovado pelo CONTRATANTE:</p>"
   +"<table style='width:100%;border-collapse:collapse;margin:10px 0;font-size:13px'><thead><tr><th style='text-align:left;padding:7px 10px;background:#eef1ec;border-bottom:2px solid #2f5d49'>Procedimento</th><th style='text-align:right;padding:7px 10px;background:#eef1ec;border-bottom:2px solid #2f5d49'>Valor</th></tr></thead><tbody>"+linhas
   +"<tr><td style='padding:8px 10px;font-weight:700'>TOTAL</td><td style='padding:8px 10px;text-align:right;font-weight:700;color:#2f5d49'>"+esc(cur(total))+"</td></tr></tbody></table>"
   +"<p><b>CLÁUSULA 2ª — DO PAGAMENTO.</b> O valor total de <b>"+esc(cur(total))+"</b> será pago pelo CONTRATANTE na seguinte forma: <b>"+esc(o.formaPagamento||"a combinar")+"</b>.</p>"
   +"<p style='margin-top:8px'><b>CLÁUSULA 3ª — DAS OBRIGAÇÕES.</b> A CONTRATADA executará os procedimentos com a técnica e os materiais adequados, ficando o CONTRATANTE responsável por comparecer às consultas agendadas, seguir as orientações pré e pós-operatórias e informar corretamente seu histórico de saúde. O não comparecimento ou o abandono do tratamento não isenta o CONTRATANTE do pagamento dos procedimentos já realizados.</p>"
   +"<p style='margin-top:8px'><b>CLÁUSULA 4ª — DA NATUREZA DOS SERVIÇOS.</b> Os serviços odontológicos constituem, em regra, obrigação de meio, empregando a CONTRATADA todos os recursos técnicos disponíveis, sem garantia de resultado estético ou funcional específico, salvo quando expressamente ajustado por escrito. Eventuais procedimentos adicionais não previstos neste contrato serão objeto de novo orçamento.</p>"
   +"<p style='margin-top:8px'><b>CLÁUSULA 5ª — DA ASSINATURA ELETRÔNICA.</b> As partes reconhecem a validade jurídica da assinatura eletrônica deste documento, nos termos do art. 10, §2º, da MP 2.200-2/2001, sendo registrados como evidência a imagem da assinatura, a data e hora, o endereço IP do assinante e o código de verificação (hash SHA-256) do documento.</p>"
   +"<p style='margin-top:14px'>São Paulo, "+dEmiss+".</p>"
   +"</div>";
}
function contratoPrintHTML(c){
  function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
  var ev="";
  if(c&&c.status==="assinado"){
    var dt=c.signed_at?new Date(c.signed_at).toLocaleString("pt-BR"):"";
    ev="<div style='max-width:720px;margin:26px auto 0;padding:14px 16px;border:1.5px solid #2f8f5f;border-radius:10px;font-family:Arial,sans-serif;font-size:12px;color:#23332b'>"
      +"<div style='font-weight:700;color:#2f8f5f;margin-bottom:8px'>✔ DOCUMENTO ASSINADO ELETRONICAMENTE</div>"
      +(c.signature?("<img src='"+c.signature+"' style='max-height:90px;max-width:300px;display:block;margin-bottom:6px'/>"):"")
      +"<div>Assinado por: <b>"+esc(c.patient_name||"")+"</b></div>"
      +(dt?("<div>Data/hora: "+esc(dt)+"</div>"):"")
      +(c.signer_ip?("<div>IP do assinante: "+esc(c.signer_ip)+"</div>"):"")
      +(c.hash_sha256?("<div style='word-break:break-all'>Hash SHA-256: "+esc(c.hash_sha256)+"</div>"):"")
      +"<div style='color:#7c8a80;margin-top:6px'>Assinatura eletrônica nos termos do art. 10, §2º, da MP 2.200-2/2001.</div></div>";
  }
  return "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Contrato - "+esc((c&&c.patient_name)||"")+"</title></head><body style='background:#ffffff;margin:24px'>"+((c&&c.html)||"")+ev
   +"<div style='max-width:720px;margin:18px auto 0;text-align:center' class='no-print'><button onclick='window.print()' style='padding:10px 22px;font-size:14px;cursor:pointer'>🖨 Imprimir / Salvar PDF</button></div>"
   +"<style>@media print{.no-print{display:none}}</style></body></html>";
}
function abrirContratoPrint(c){try{var w=window.open("","_blank");if(!w){alert("Permita pop-ups para visualizar o contrato.");return;}w.document.write(contratoPrintHTML(c));w.document.close();}catch(e){alert("Não foi possível abrir a janela de impressão.");}}
function PublicContrato({token}){
  const [st,setSt]=useState("loading");
  const [data,setData]=useState(null);
  const [sig,setSig]=useState("");
  const [agree,setAgree]=useState(false);
  const [sending,setSending]=useState(false);
  const [err,setErr]=useState("");
  useEffect(function(){var alive=true;contratoApi.fetchC(token).then(function(r){if(!alive)return;if(!r.ok){setSt("erro");return;}setData(r);if(r.status==="expirado")setSt("expirado");else if(r.status==="assinado")setSt("assinado");else setSt("pendente");}).catch(function(){if(alive)setSt("erro");});return function(){alive=false;};},[token]);
  function assinar(){if(!sig||!agree||sending)return;setSending(true);setErr("");contratoApi.signC(token,sig).then(function(r){setSending(false);if(r.ok)setSt("sucesso");else setErr(r.msg||"Não foi possível assinar. Tente novamente.");});}
  var card={background:G.card,borderRadius:14,padding:18,maxWidth:760,margin:"0 auto",boxShadow:"0 8px 30px rgba(30,45,38,.14)"};
  return <div style={{minHeight:"100vh",background:G.bg,padding:"22px 12px"}}>
    <div style={{textAlign:"center",marginBottom:14}}><div style={{fontFamily:"'Cormorant Garamond'",fontSize:26,color:G.primary}}>{CLINICA_INFO.nome}</div><div style={{fontSize:12,color:G.muted}}>Contrato de tratamento</div></div>
    {st==="loading"&&<div style={card}><div style={{textAlign:"center",color:G.muted,padding:30}}>Carregando contrato…</div></div>}
    {st==="erro"&&<div style={card}><div style={{textAlign:"center",color:G.red,padding:30,fontSize:14}}>Contrato não encontrado. Confira o link ou peça um novo à clínica.</div></div>}
    {st==="expirado"&&<div style={card}><div style={{textAlign:"center",padding:30}}><div style={{fontSize:34}}>⏰</div><div style={{fontWeight:700,marginTop:8,fontSize:15}}>Este link expirou.</div><div style={{fontSize:13,color:G.muted,marginTop:6}}>{"Por segurança o link vale 48 horas. Entre em contato com a "+CLINICA_INFO.nome+" pelo telefone "+CLINICA_INFO.telefone+" para receber um novo link."}</div></div></div>}
    {(st==="assinado"||st==="sucesso")&&data&&<div style={card}>
      <div style={{background:"var(--green-soft)",borderRadius:10,padding:"12px 14px",marginBottom:14,textAlign:"center"}}><div style={{fontSize:26}}>✅</div><div style={{fontWeight:700,color:G.success}}>{st==="sucesso"?"Contrato assinado com sucesso!":"Este contrato já foi assinado."}</div><div style={{fontSize:12,color:G.muted,marginTop:4}}>A clínica foi notificada. Você pode fechar esta página.</div></div>
      {data.html&&<div style={{background:"#ffffff",borderRadius:10,padding:14,maxHeight:420,overflowY:"auto",border:"1px solid "+G.border}} dangerouslySetInnerHTML={{__html:data.html}}/>}
    </div>}
    {st==="pendente"&&data&&<div style={card}>
      <div style={{background:"#ffffff",borderRadius:10,padding:14,maxHeight:"48vh",overflowY:"auto",border:"1px solid "+G.border}} dangerouslySetInnerHTML={{__html:data.html||""}}/>
      <div style={{marginTop:14}}>
        <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Sua assinatura</label>
        <div style={{marginTop:6}}><SignaturePad value={sig} disabled={false} onChange={setSig}/></div>
      </div>
      <label style={{display:"flex",alignItems:"flex-start",gap:8,marginTop:12,fontSize:13,cursor:"pointer"}}><input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)} style={{marginTop:2}}/><span>Li o contrato acima e <b>concordo</b> com todas as condições.</span></label>
      {err&&<div style={{marginTop:10,background:"var(--red-soft)",color:G.red,borderRadius:8,padding:"9px 12px",fontSize:12.5,fontWeight:600}}>{err}</div>}
      <button onClick={assinar} disabled={!sig||!agree||sending} style={{marginTop:14,width:"100%",background:(!sig||!agree||sending)?G.muted:G.primary,color:"#fff",border:"none",borderRadius:10,padding:"13px 16px",fontSize:15,fontWeight:700,cursor:(!sig||!agree||sending)?"not-allowed":"pointer"}}>{sending?"Enviando…":"✍️ Assinar contrato"}</button>
      <div style={{fontSize:11,color:G.muted,marginTop:8,textAlign:"center"}}>Serão registrados data/hora, IP e código de verificação do documento (MP 2.200-2/2001, art. 10 §2º).</div>
    </div>}
  </div>;
}
function DocsContratos({pat}){
  const [rows,setRows]=useState(null);
  const [msg,setMsg]=useState("");
  function load(){setRows(null);contratoApi.listC(String(pat.id)).then(function(r){setRows((r.ok&&r.contratos)||[]);});}
  useEffect(function(){load();},[pat.id]);
  var CCOL={pendente:G.yellow,assinado:G.success,expirado:G.red};
  var CLAB={pendente:"Pendente",assinado:"Assinado",expirado:"Expirado"};
  function copiar(t){var link=contratoLink(t);try{navigator.clipboard.writeText(link).then(function(){setMsg("Link copiado!");setTimeout(function(){setMsg("");},2000);});}catch(e){window.prompt("Copie o link:",link);}}
  function reenviar(t){var link=contratoLink(t);wa(pat.phone,"Olá, "+(pat.name||"")+"! 😊\n\nSegue o contrato do seu tratamento na "+CLINICA_INFO.nome+" para leitura e assinatura:\n"+link+"\n\nO link é pessoal e vale por 48 horas.");}
  function renovar(id){contratoApi.renewC(id).then(function(r){if(r.ok){setMsg("Validade renovada por +48h. Reenvie o link ao paciente.");setTimeout(function(){setMsg("");},3000);load();}else alert(r.msg||"Não foi possível renovar.");});}
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <Div lb="Documentos — Contratos"/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
      <div style={{fontSize:12,color:G.muted}}>Contratos gerados a partir de orçamentos aprovados (aba Tratamento).</div>
      <Btn ch="↻ Atualizar" v="g" sm onClick={load}/>
    </div>
    {msg&&<div style={{background:"var(--green-soft)",color:G.success,borderRadius:8,padding:"8px 12px",fontSize:12.5,fontWeight:700}}>{msg}</div>}
    {rows===null&&<div style={{fontSize:13,color:G.muted,padding:"14px 4px"}}>Carregando…</div>}
    {rows&&rows.length===0&&<div style={{fontSize:13,color:G.muted,background:G.bg,borderRadius:10,padding:"14px 16px"}}>Nenhum contrato ainda. Aprove um orçamento na aba <b>Tratamento</b> e clique em <b>📝 Contrato</b>.</div>}
    {rows&&rows.map(function(c){var totalFmt=(c.payload&&c.payload.totalFmt)||"";return <div key={c.id} style={{background:G.bg,borderRadius:10,padding:"11px 13px",borderLeft:"3px solid "+(CCOL[c.status]||G.muted)}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
        <div style={{display:"flex",flexDirection:"column"}}>
          <span style={{fontWeight:700,fontSize:13}}>{"Contrato de tratamento"+(totalFmt?(" · "+totalFmt):"")}</span>
          <span style={{fontSize:11,color:G.muted}}>{"Criado em "+(c.created_at?new Date(c.created_at).toLocaleString("pt-BR"):"-")+(c.signed_at?(" · Assinado em "+new Date(c.signed_at).toLocaleString("pt-BR")):"")}</span>
        </div>
        <Bdg l={CLAB[c.status]||c.status} col={CCOL[c.status]||G.muted} sm/>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
        <Btn ch="👁 Ver / Imprimir" v="g" sm onClick={function(){abrirContratoPrint(c);}}/>
        {c.status==="pendente"&&<Btn ch="📱 Reenviar link" v="w" sm onClick={function(){reenviar(c.token);}}/>}
        {c.status==="pendente"&&<Btn ch="📋 Copiar link" v="g" sm onClick={function(){copiar(c.token);}}/>}
        {c.status==="expirado"&&<Btn ch="🔄 Renovar 48h" v="y" sm onClick={function(){renovar(c.id);}}/>}
      </div>
    </div>;})}
  </div>;
}
function appBase(){try{var u=((CLINICA_INFO&&CLINICA_INFO.appUrl)||"").trim();if(u)return u.replace(/\?.*$/,"").replace(/\/+$/,"");}catch(e){}try{return window.location.origin+window.location.pathname;}catch(e2){return "";}}

function buildPortal(p,appts,treats,budgets,dents){
  var DEF={consulta:true,tratamento:true,fotos:false,financeiro:false,presenca:true,clinica:true};
  var o=Object.assign({},DEF,p.portalOpts||{});
  var out={name:p.name||"",updatedAt:new Date().toISOString()};
  var t=today();
  if(o.consulta){
    var skip={cancelled:1,missed:1,done:1,rescheduled:1,blocked:1};
    var fut=(appts||[]).filter(function(a){return a&&String(a.patientId)===String(p.id)&&a.date&&a.date>=t&&!skip[a.status];}).sort(function(a,b){return (a.date+(a.time||"")).localeCompare(b.date+(b.time||""));});
    var nx=fut[0];
    if(nx){var d=(dents||[]).find(function(x){return String(x.id)===String(nx.dentistId);});out.consulta={apptId:nx.id,date:nx.date,time:nx.time||"",dentista:d?d.name:"",proc:nx.procedure||nx.treatment||"",status:nx.status||""};}
  }
  if(o.tratamento){
    var trs=(treats||[]).filter(function(x){return x&&String(x.patientId)===String(p.id);}).map(function(x){var itens=(x.items||[]).map(function(it){return {desc:it.desc||"",value:Number(it.value)||0,paid:!!it.paid};});var total=itens.reduce(function(s,it){return s+it.value;},0);var pgs=(x.payments||[]).map(function(pg){return {date:pg.date||"",value:Number(pg.value)||0,method:pg.method||""};});var pago=pgs.reduce(function(s,pg){return s+pg.value;},0);return {name:x.name||"Tratamento",start:x.start||"",itens:itens,total:total,pago:pago,saldo:total-pago,pagamentos:pgs};});
    if(trs.length)out.tratamento=trs;
    var bgs=(budgets||[]).filter(function(x){return x&&String(x.patientId)===String(p.id)&&x.status!=="cancelled"&&x.status!=="rejected";}).map(function(b){var disc=Number(b.disc)||0;var tot=(b.items||[]).reduce(function(s,it){return s+(Number(it.v)||0);},0)-disc;return {date:b.date||"",status:b.status||"",total:tot,itens:(b.items||[]).map(function(it){return {desc:it.d||"",value:Number(it.v)||0};})};});
    if(bgs.length)out.orcamentos=bgs;
  }
  if(o.fotos){
    var fotos=(p.imagens||[]).filter(function(im){return im&&im.cat==="antesdepois"&&im.url;}).map(function(im){return {url:im.url,date:im.date||""};});
    if(fotos.length)out.fotos=fotos;
  }
  if(o.financeiro){
    var pend=0;(treats||[]).filter(function(x){return x&&String(x.patientId)===String(p.id);}).forEach(function(x){var tot=(x.items||[]).reduce(function(s,it){return s+(Number(it.value)||0);},0);var pg=(x.payments||[]).reduce(function(s,p2){return s+(Number(p2.value)||0);},0);pend+=Math.max(0,tot-pg);});
    out.financeiro={pendente:pend};
  }
  if(o.presenca)out.presenca=true;
  if(o.clinica)out.clinica={nome:CLINICA_INFO.nome,endereco:CLINICA_INFO.endereco,telefone:CLINICA_INFO.telefone,whatsapp:CLINICA_INFO.whatsapp||CLINICA_INFO.telefone};
  return out;
}

function PortalSwitch({on,onToggle,label,desc}){
  return <div onClick={onToggle} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 11px",borderRadius:10,border:"1px solid "+G.border,background:on?G.accent:"var(--card)",cursor:"pointer"}}>
    <div style={{width:38,height:22,borderRadius:11,background:on?G.success:"var(--muted)",position:"relative",flexShrink:0}}>
      <div style={{width:18,height:18,borderRadius:"50%",background:"var(--surface)",position:"absolute",top:2,left:on?18:2,boxShadow:"0 1px 3px rgba(0,0,0,.3)",transition:"left .15s"}}/>
    </div>
    <div style={{flex:1}}>
      <div style={{fontWeight:700,fontSize:13,color:G.text}}>{label}</div>
      {desc?<div style={{fontSize:11,color:G.muted}}>{desc}</div>:null}
    </div>
  </div>;
}

function PortalModal({pat,setPats,setPf,onClose}){
  const DEF={consulta:true,tratamento:true,fotos:false,financeiro:false,presenca:true,clinica:true};
  const opts=Object.assign({},DEF,pat.portalOpts||{});
  const token=pat.portalToken||"";
  const link=token?(appBase()+"?portal="+encodeURIComponent(token)):"";
  const [sent,setSent]=useState(false);
  const [copied,setCopied]=useState(false);
  function apply(patch){setPats(function(prev){return prev.map(function(p){return p.id===pat.id?Object.assign({},p,patch):p;});});if(setPf)setPf(function(prev){return Object.assign({},prev,patch);});}
  function toggle(k){var n=Object.assign({},opts);n[k]=!n[k];apply({portalOpts:n});}
  function gerar(){apply({portalToken:genToken(),portalOpts:opts});setSent(false);setCopied(false);}
  function copiar(){try{navigator.clipboard.writeText(link);setCopied(true);setTimeout(function(){setCopied(false);},1500);}catch(e){}}
  function enviar(){if(!token||!pat.phone)return;var msg="Ola, "+(pat.name||"")+"! 😊\n\nVoce pode acompanhar seu atendimento na "+CLINICA_INFO.nome+" por este link pessoal:\n"+link+"\n\nNao precisa de senha — abre direto no celular.";wa(pat.phone,msg);setSent(true);}
  const SECS=[["consulta","Próxima consulta","Data, horário e dentista"],["tratamento","Tratamento e orçamento","Plano de tratamento e propostas"],["fotos","Fotos antes/depois","Imagens marcadas como antes/depois"],["financeiro","Pendência financeira","Valor em aberto"],["presenca","Confirmar presença","Botão para o paciente confirmar"],["clinica","Dados da clínica","Endereço e telefone"]];
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:"var(--surface)",borderRadius:18,width:"100%",maxWidth:440,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,.2)"}}>
      <div style={{background:G.primary,borderRadius:"18px 18px 0 0",padding:"14px 18px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0}}>
        <span style={{fontSize:20}}>{"🔗"}</span>
        <div style={{flex:1}}><div style={{fontWeight:700,color:"#fff",fontSize:14}}>Portal do paciente</div><div style={{fontSize:11,color:"rgba(255,255,255,.8)"}}>{pat.name}</div></div>
        <button onClick={onClose} style={{border:"none",background:"rgba(255,255,255,.2)",borderRadius:8,color:"#fff",cursor:"pointer",padding:"5px 10px",fontSize:16}}>{"X"}</button>
      </div>
      <div style={{padding:18,display:"flex",flexDirection:"column",gap:12}}>
        {!token
          ? <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <p style={{fontSize:13,color:"var(--muted)",margin:0}}>Gera um link pessoal para <strong>{pat.name}</strong> acompanhar a consulta pelo celular, sem senha e sem app. Você escolhe o que aparece.</p>
              <button onClick={gerar} style={{background:G.primary,color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:15,fontWeight:700,cursor:"pointer"}}>{"🔗 Gerar link do portal"}</button>
              <button onClick={onClose} style={{background:"none",border:"1.5px solid #ddd",borderRadius:10,padding:"10px",fontSize:13,cursor:"pointer",color:"var(--muted)"}}>Cancelar</button>
            </div>
          : <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{fontSize:12,fontWeight:700,color:G.muted}}>O que o link exibe</div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {SECS.map(function(s){return <PortalSwitch key={s[0]} on={!!opts[s[0]]} onToggle={function(){toggle(s[0]);}} label={s[1]} desc={s[2]}/>;})}
              </div>
              <div style={{background:"var(--green-soft)",borderRadius:10,padding:"10px 12px",fontSize:11,color:G.primary,wordBreak:"break-all",fontWeight:600}}>{link}</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={copiar} style={{flex:1,background:"var(--surface)",color:G.primary,border:"1.5px solid "+G.primary,borderRadius:10,padding:"11px",fontSize:13,fontWeight:700,cursor:"pointer"}}>{copied?"✓ Copiado":"📋 Copiar"}</button>
                <button onClick={enviar} disabled={!pat.phone} style={{flex:2,background:pat.phone?"#25D366":"var(--muted)",color:"#fff",border:"none",borderRadius:10,padding:"11px",fontSize:13,fontWeight:700,cursor:pat.phone?"pointer":"default"}}>{"📱 Enviar WhatsApp"}</button>
              </div>
              {sent?<div style={{textAlign:"center",fontSize:12,color:G.success,fontWeight:700}}>{"✅ Link enviado para "+pat.name+"."}</div>:null}
              <button onClick={gerar} style={{background:"none",border:"1px solid "+G.border,borderRadius:10,padding:"9px",fontSize:12,cursor:"pointer",color:G.muted}}>{"🔄 Gerar link novo (invalida o anterior)"}</button>
            </div>}
      </div>
    </div>
  </div>;
}

function PatientPortal({token}){
  const [data,setData]=useState(undefined);
  const [confirming,setConfirming]=useState(false);
  const [confirmed,setConfirmed]=useState(false);
  useEffect(function(){
    var alive=true;
    if(!SUPA_URL){setData(null);return;}
    supabase.fetchPortal(token).then(function(d){if(alive)setData(d||null);}).catch(function(){if(alive)setData(null);});
    return function(){alive=false;};
  },[token]);
  function confirmar(){
    if(confirming||confirmed)return;
    setConfirming(true);
    var apptId=(data&&data.consulta&&data.consulta.apptId)||null;
    supabase.sendPortalAction(token,{type:"confirm",apptId:apptId,at:new Date().toISOString()}).then(function(r){setConfirming(false);if(r&&r.ok)setConfirmed(true);});
  }
  var wrap={minHeight:"100vh",background:G.bg,padding:"24px 16px"};
  var card={maxWidth:520,margin:"0 auto",background:G.card,borderRadius:16,boxShadow:"0 4px 24px rgba(0,0,0,.1)",overflow:"hidden"};
  if(data===undefined)return <div style={wrap}><style>{CSS}</style><div style={Object.assign({},card,{padding:"40px 20px",textAlign:"center",color:G.muted})}>Carregando…</div></div>;
  if(data===null)return <div style={wrap}><style>{CSS}</style><div style={Object.assign({},card,{padding:"40px 20px",textAlign:"center"})}>
    <div style={{fontSize:40}}>{"🔍"}</div>
    <div style={{fontFamily:"'Cormorant Garamond'",fontSize:22,color:G.primary,marginTop:8}}>Link não encontrado</div>
    <div style={{fontSize:13,color:G.muted,marginTop:6}}>Este link pode ter expirado ou sido substituído. Fale com a clínica para receber um novo.</div>
  </div></div>;
  const clin=data.clinica||{nome:CLINICA_INFO.nome};
  const sec={padding:"16px 18px",borderTop:"1px solid "+G.border};
  const h={fontSize:12,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:.4,marginBottom:8};
  return <div style={wrap}><style>{CSS}</style><div style={card}>
    <div style={{background:G.primary,padding:"20px 18px",color:"#fff"}}>
      <div style={{fontSize:12,opacity:.85}}>{clin.nome||CLINICA_INFO.nome}</div>
      <div style={{fontFamily:"'Cormorant Garamond'",fontSize:26,fontWeight:600,marginTop:2}}>Olá, {data.name||"paciente"}!</div>
      <div style={{fontSize:12,opacity:.85,marginTop:2}}>Seu acompanhamento pessoal</div>
    </div>
    {data.consulta?<div style={sec}>
      <div style={h}>Próxima consulta</div>
      <div style={{fontSize:18,fontWeight:700,color:G.text}}>{fmt(data.consulta.date)}{data.consulta.time?(" às "+data.consulta.time):""}</div>
      {data.consulta.dentista?<div style={{fontSize:13,color:G.primary,fontWeight:600,marginTop:2}}>{"com "+data.consulta.dentista}</div>:null}
      {data.consulta.proc?<div style={{fontSize:13,color:G.muted,marginTop:2}}>{data.consulta.proc}</div>:null}
    </div>:null}
    {data.presenca&&data.consulta&&data.consulta.apptId?<div style={{padding:"0 18px 16px"}}>
      {confirmed||data.consulta.status==="confirmed"
        ?<div style={{background:G.accent,color:G.success,borderRadius:12,padding:"12px",textAlign:"center",fontWeight:700,fontSize:14}}>{"✅ Presença confirmada"}</div>
        :<button onClick={confirmar} disabled={confirming} style={{width:"100%",background:G.success,color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:15,fontWeight:700,cursor:"pointer"}}>{confirming?"Confirmando…":"✓ Confirmar presença"}</button>}
    </div>:null}
    {data.tratamento&&data.tratamento.length?<div style={sec}>
      <div style={h}>Tratamento</div>
      {data.tratamento.map(function(tr,ti){return <div key={ti} style={{marginBottom:10}}>
        <div style={{fontWeight:700,fontSize:14,color:G.text}}>{tr.name}</div>
        {(tr.itens||[]).map(function(it,ii){return <div key={ii} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:G.text,padding:"3px 0"}}>
          <span style={{color:it.paid?G.muted:G.text}}>{(it.paid?"✓ ":"")+it.desc}</span>
          <span style={{fontWeight:600,color:it.paid?G.muted:G.primary}}>{cur(it.value)}</span>
        </div>;})}
        <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:700,borderTop:"1px solid "+G.border,paddingTop:6,marginTop:4}}>
          <span style={{color:G.muted}}>{"Pago "+cur(tr.pago)}</span>
          <span style={{color:tr.saldo>0?G.red:G.success}}>{tr.saldo>0?("Saldo "+cur(tr.saldo)):"Quitado"}</span>
        </div>
        {(tr.pagamentos&&tr.pagamentos.length)?<div style={{marginTop:4}}>{tr.pagamentos.map(function(pg,pi){return <div key={pi} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:G.muted,padding:"1px 0"}}><span>{"✓ "+fmt(pg.date)+(pg.method?(" · "+pg.method):"")}</span><span>{cur(pg.value)}</span></div>;})}</div>:null}
      </div>;})}
    </div>:null}
    {data.orcamentos&&data.orcamentos.length?<div style={sec}>
      <div style={h}>Orçamento</div>
      {data.orcamentos.map(function(b,bi){return <div key={bi} style={{marginBottom:8}}>
        {(b.itens||[]).map(function(it,ii){return <div key={ii} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"3px 0"}}>
          <span>{it.desc}</span><span style={{fontWeight:600}}>{cur(it.value)}</span>
        </div>;})}
        <div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:700,color:G.primary,borderTop:"1px solid "+G.border,paddingTop:6,marginTop:4}}>
          <span>Total</span><span>{cur(b.total)}</span>
        </div>
      </div>;})}
    </div>:null}
    {data.financeiro?<div style={sec}>
      <div style={h}>Financeiro</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,color:G.muted}}>Valor em aberto</span>
        <span style={{fontSize:20,fontWeight:700,color:data.financeiro.pendente>0?G.red:G.success}}>{cur(data.financeiro.pendente)}</span>
      </div>
    </div>:null}
    {data.fotos&&data.fotos.length?<div style={sec}>
      <div style={h}>Antes e depois</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {data.fotos.map(function(f,fi){return <img key={fi} src={f.url} alt="antes/depois" style={{width:"100%",borderRadius:10,display:"block"}}/>;})}
      </div>
    </div>:null}
    {data.clinica?<div style={sec}>
      <div style={h}>{clin.nome||CLINICA_INFO.nome}</div>
      {clin.endereco?<div style={{fontSize:13,color:G.text}}>{"📍 "+clin.endereco}</div>:null}
      {clin.telefone?<div style={{fontSize:13,color:G.text,marginTop:3}}>{"📞 "+clin.telefone}</div>:null}
    </div>:null}
    <div style={{padding:"14px 18px",textAlign:"center",fontSize:11,color:G.muted,borderTop:"1px solid "+G.border}}>Link pessoal · não compartilhe</div>
  </div></div>;
}
/* ===================== PORTAL DO PACIENTE (fim) ===================== */

// ── V207: ODONTOGRAMA 3D + PERIOGRAMA — aba 🦷 3D do prontuário (iframe + postMessage) ──
function Odonto3DTab({pat,setPats,setPf}){
const [visao,setVisao]=useState("odonto"); // odonto = Odontograma 3D | perio = Periograma (modo Osso)
const frRef=useRef(null);
const patRef=useRef(pat);patRef.current=pat;
useEffect(function(){
  function onMsg3d(ev){
    if(ev.origin!==location.origin)return;
    var fr=frRef.current;if(!fr||ev.source!==fr.contentWindow)return;
    var d=ev.data||{};
    if(d.tipo==="odonto3d-pronto"){
      try{fr.contentWindow.postMessage({tipo:"odonto3d-estado",dados:(patRef.current&&patRef.current.odonto3d)||{},historico:(patRef.current&&patRef.current.odonto3d_hist)||[]},location.origin);}catch(e){}
    }else if(d.tipo==="odonto3d-alterado"&&d.dados){
      var pid=patRef.current&&patRef.current.id;if(pid==null)return;
      setPats(function(prev){return prev.map(function(p){return p.id===pid?Object.assign({},p,{odonto3d:d.dados}):p;});});
      if(setPf)setPf(function(prev){return Object.assign({},prev,{odonto3d:d.dados});});
    }else if(d.tipo==="odonto3d-historico"){
      var pid2=patRef.current&&patRef.current.id;if(pid2==null)return;
      var h3d=d.historico||[];
      setPats(function(prev){return prev.map(function(p){return p.id===pid2?Object.assign({},p,{odonto3d_hist:h3d}):p;});});
      if(setPf)setPf(function(prev){return Object.assign({},prev,{odonto3d_hist:h3d});});
    }
  }
  window.addEventListener("message",onMsg3d);
  return function(){window.removeEventListener("message",onMsg3d);};
},[setPats,setPf]);
var src3d=visao==="perio"?"/odontograma3d.html?integrado=1&modo=osso":"/odontograma3d.html?integrado=1";
return (<div style={{display:"flex",flexDirection:"column",gap:10}}>
  <div style={{display:"flex",gap:4,background:"var(--green-soft)",borderRadius:12,padding:4,alignSelf:"flex-start"}}>
    <button onClick={function(){setVisao("odonto");}} style={{border:"none",background:visao==="odonto"?G.primary:"transparent",color:visao==="odonto"?"#fff":G.muted,borderRadius:9,padding:"8px 14px",fontSize:12.5,fontWeight:800,cursor:"pointer"}}>{"🦷 Odontograma 3D"}</button>
    <button onClick={function(){setVisao("perio");}} style={{border:"none",background:visao==="perio"?G.primary:"transparent",color:visao==="perio"?"#fff":G.muted,borderRadius:9,padding:"8px 14px",fontSize:12.5,fontWeight:800,cursor:"pointer"}}>{"🦴 Periograma"}</button>
  </div>
  <iframe key={visao} ref={frRef} src={src3d} title={visao==="perio"?"Periograma":"Odontograma 3D"} style={{width:"100%",height:"70vh",minHeight:420,border:"1.5px solid "+G.border,borderRadius:14,background:"#fff"}}/>
</div>);
}

function PatientFolder({pat:patProp,pats,setPats,recs,setRecs,treats,setTreats,budgets,setBudgets,appts,dents,procs,user,onClose}){
// Always read live data from pats - this ensures saves reflect immediately
const pat=pats.find(p=>p.id===patProp.id)||patProp;
const isDentUser=user&&user.level===1;
const [tab,setTab]=useState("ficha");
const [editMode,setEditMode]=useState(false);
const [imgCat,setImgCat]=useState("rx");const [imgTreat,setImgTreat]=useState("");const [imgNota,setImgNota]=useState("");const [imgBusy,setImgBusy]=useState(false);const [imgErr,setImgErr]=useState("");const [imgView,setImgView]=useState(null);
const [pf,setPf]=useState({...pat});const [showWAanam,setShowWAanam]=useState(false);const [showPortal,setShowPortal]=useState(false);const [showIARX,setShowIARX]=useState(false);const [fillAnam,setFillAnam]=useState(false);const [buscaMsg,setBuscaMsg]=useState("");

// Keep pf in sync when pat updates externally (e.g. after NF save)
// But don't override if user is actively editing
const prevPatId=pat.id;

// Payment modal for treatments
const [payModal,setPayModal]=useState(null);
const [confirmDesfazer,setConfirmDesfazer]=useState(null); // {tid, idx}
const [payForm,setPayForm]=useState({date:today(),value:"",method:"Dinheiro",note:""});

// Record modal
const [recModal,setRecModal]=useState(false);
const [recEdit,setRecEdit]=useState(null);
const blankR={date:today(),procedure:"",tooth:"",dentistId:user.dentistId||dents[0]?.id||1,obs:"",rx:"",paid:"",payment:"Dinheiro",closed:false,inst:1,instM:[]};
const [rf,setRf]=useState(blankR);
const upR=k=>v=>setRf(p=>({...p,[k]:v}));
const [retOpen,setRetOpen]=useState(false);
const setRet=patch=>setPats(prev=>prev.map(x=>x.id===pat.id?{...x,...patch}:x));

// Treatment modal
const [treatModal,setTreatModal]=useState(false);
const [ortoModal,setOrtoModal]=useState(false);
const [ortoForm,setOrtoForm]=useState({valor:"",ano:new Date().getFullYear(),dentistId:""});
const [tf,setTf]=useState({name:"",start:today(),dentistId:user.dentistId||dents[0]?.id||1,items:[],payments:[]});
const [tni,setTni]=useState({d:"",procId:"",v:"",qty:"",manual:""});

// Budget modal
const [budgModal,setBudgModal]=useState(false);
const [budgEdit,setBudgEdit]=useState(null);
const blankB={date:today(),items:[],status:"pending",notes:"",disc:0,attach:""};
const [bf,setBf]=useState(blankB);
const [bni,setBni]=useState({d:"",v:""});

// Orçamento PDF Premium (envio ao paciente)
const [pdfBudget,setPdfBudget]=useState(null);
// Contrato de tratamento com assinatura eletrônica (V195)
const [ctrBudget,setCtrBudget]=useState(null);
const [ctrPag,setCtrPag]=useState("");
const [ctrDent,setCtrDent]=useState(null);
const [ctrBusy,setCtrBusy]=useState(false);
const [ctrDone,setCtrDone]=useState(null);
const [ctrErr,setCtrErr]=useState("");
const defPayCfg=()=>({avista:{on:true,desc:7},credito:{on:true,parcelas:12},debito:{on:false},carne:{on:false,parcelas:6},custom:{on:false,text:""}});
const [payCfg,setPayCfg]=useState(defPayCfg());
// Frases de benefício por procedimento (venda) — usadas só se reconhecer o nome
const BENEF=[["clareamento","devolve o brilho e a beleza natural do seu sorriso"],["restaura","recupera a forma, a função e a estética do dente"],["canal","elimina a dor e preserva o seu dente natural"],["implante","substitui o dente perdido com firmeza e naturalidade"],["protocolo","reabilita todo o arco com estabilidade e conforto"],["prótese","devolve a mastigação, a fala e a harmonia do sorriso"],["protese","devolve a mastigação, a fala e a harmonia do sorriso"],["coroa","protege e restaura a aparência natural do dente"],["faceta","transforma o sorriso com aparência natural e harmoniosa"],["lente","transforma o sorriso com aparência natural e harmoniosa"],["limpeza","remove o tártaro e mantém suas gengivas saudáveis"],["profilaxia","remove o tártaro e mantém suas gengivas saudáveis"],["extra","procedimento seguro realizado com todo o cuidado"],["exodontia","procedimento seguro realizado com todo o cuidado"],["ortodon","alinha os dentes e harmoniza o seu sorriso"],["aparelho","alinha os dentes e harmoniza o seu sorriso"],["enxerto","prepara uma base firme e duradoura para o implante"],["cirurgia","procedimento realizado com segurança e cuidado"],["consulta","avaliação completa para planejar o seu melhor tratamento"],["avalia","avaliação completa para planejar o seu melhor tratamento"],["radiograf","diagnóstico preciso para o seu tratamento"],["gengiv","realça a estética e a saúde da sua gengiva"]];
const benefDe=nome=>{const n=(nome||"").toLowerCase();for(var i=0;i<BENEF.length;i++){if(n.indexOf(BENEF[i][0])>=0)return BENEF[i][1];}return "";};
const genOrcamentoPDF=()=>{
const b=pdfBudget;if(!b)return;
const brl=v=>{var n=Math.round((Number(v)||0)*100)/100,neg=n<0,s=Math.abs(n).toFixed(2).split("."),i=s[0].replace(/\B(?=(\d{3})+(?!\d))/g,".");return (neg?"-":"")+"R$ "+i+","+s[1];};
const subtotal=b.items.reduce((s,i)=>s+i.v,0);
const desc0=b.disc||0;
const tot=subtotal-desc0;
const dent=dents.find(d=>d.id===b.dentistId)||(user.dentistId?dents.find(d=>d.id===user.dentistId):null)||dents[0];
const dentName=dent?dent.name:"Affonso Odontologia";
const dentCro=dent&&dent.cro?("CRO "+dent.cro):"";
const dVal=new Date();dVal.setDate(dVal.getDate()+30);
const valStr=dVal.toLocaleDateString("pt-BR");
var itensHtml="";
b.items.forEach(function(it){var bn=benefDe(it.d);itensHtml+="<div class='proc'><div class='proc-l'><div class='proc-nome'>"+it.d+"</div>"+(bn?"<div class='proc-ben'>"+bn+"</div>":"")+"</div><div class='proc-val'>"+brl(it.v)+"</div></div>";});
var payHtml="";
if(payCfg.avista.on){var dp=Number(payCfg.avista.desc)||0;payHtml+="<div class='pay'><span class='pay-nome'>&#9679; &Agrave; vista &mdash; PIX ou Dinheiro</span><span class='pay-val'>"+brl(tot*(1-dp/100))+(dp>0?" <em>("+dp+"% off)</em>":"")+"</span></div>";}
if(payCfg.credito.on){var np=Math.max(1,Number(payCfg.credito.parcelas)||1);payHtml+="<div class='pay'><span class='pay-nome'>&#9679; Cart&atilde;o de cr&eacute;dito</span><span class='pay-val'>"+np+"x de "+brl(tot/np)+"</span></div>";}
if(payCfg.debito.on){payHtml+="<div class='pay'><span class='pay-nome'>&#9679; Cart&atilde;o de d&eacute;bito</span><span class='pay-val'>"+brl(tot)+"</span></div>";}
if(payCfg.carne.on){var nc=Math.max(1,Number(payCfg.carne.parcelas)||1);payHtml+="<div class='pay'><span class='pay-nome'>&#9679; Carn&ecirc; pr&oacute;prio da cl&iacute;nica</span><span class='pay-val'>"+nc+"x de "+brl(tot/nc)+"</span></div>";}
if(payCfg.custom.on&&(payCfg.custom.text||"").trim()){payHtml+="<div class='pay'><span class='pay-nome'>&#9679; Condi&ccedil;&atilde;o especial</span><span class='pay-val'>"+payCfg.custom.text+"</span></div>";}
var h="<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width'><title>Or&ccedil;amento</title><style>";
h+="@page{size:A4 portrait;margin:0} *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}";
h+="body{font-family:Georgia,'Times New Roman',serif;color:#2a2a2a;background:#eceae6}";
h+="a,a:link{display:none!important}";
h+=".noprint{position:fixed;top:12px;right:12px;background:#2f5d49;color:#fff;border:none;border-radius:8px;padding:11px 18px;font-size:14px;font-family:sans-serif;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);z-index:99}";
h+="@media print{.noprint{display:none!important}body{background:#fff}}";
h+=".page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;position:relative;padding-bottom:34mm}";
h+=".topbar{height:7mm;background:#2f5d49}";
h+=".gold-line{height:3px;background:#C9A84C}";
h+=".head{text-align:center;padding:13mm 18mm 6mm}";
h+=".head .nome{font-size:23pt;letter-spacing:5px;color:#8B6914;text-transform:uppercase}";
h+=".head .sub{font-size:9pt;letter-spacing:4px;color:#aaa;text-transform:uppercase;margin-top:5px}";
h+=".deco{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:11px}";
h+=".deco .l{height:1px;width:55px;background:#C9A84C}.deco .d{color:#C9A84C;font-size:11pt}";
h+=".content{padding:0 18mm}";
h+=".title{text-align:center;font-size:17pt;color:#2f5d49;letter-spacing:1px;margin:5mm 0 3mm;font-weight:700}";
h+=".hello{font-size:11.5pt;line-height:1.7;color:#444;text-align:center;margin-bottom:7mm;padding:0 5mm}";
h+=".hello b{color:#2f5d49}";
h+=".sec-t{font-size:10pt;letter-spacing:2px;text-transform:uppercase;color:#8B6914;border-bottom:1px solid #C9A84C;padding-bottom:4px;margin-bottom:4mm;margin-top:7mm}";
h+=".proc{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding:9px 0;border-bottom:1px dotted #ddd}";
h+=".proc-nome{font-size:12pt;font-weight:700;color:#2f5d49}";
h+=".proc-ben{font-size:9.5pt;color:#999;font-style:italic;margin-top:2px}";
h+=".proc-val{font-size:12pt;font-weight:700;color:#2a2a2a;white-space:nowrap}";
h+=".total-box{margin-top:6mm;background:#F7F4EC;border:1px solid #E5D9B8;border-radius:8px;padding:5mm 6mm;text-align:right}";
h+=".total-box .de{font-size:11pt;color:#b0b0b0;text-decoration:line-through}";
h+=".total-box .por{font-size:19pt;font-weight:700;color:#2f5d49;margin-top:2px}";
h+=".total-box .por small{font-size:10pt;color:#888;font-weight:normal}";
h+=".total-box .eco{font-size:10pt;color:#2f8f5f;margin-top:4px;font-style:italic}";
h+=".pay-box{background:#FBFAF5;border:1px solid #E5D9B8;border-radius:8px;padding:3mm 6mm}";
h+=".pay{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:8px 0;border-bottom:1px dotted #e3dcc4}";
h+=".pay:last-child{border-bottom:none}";
h+=".pay-nome{font-size:11pt;color:#444}.pay-val{font-size:11.5pt;font-weight:700;color:#2f5d49;white-space:nowrap}";
h+=".pay-val em{font-size:9pt;color:#2f8f5f;font-style:normal}";
h+=".valid{text-align:center;font-size:9.5pt;color:#8B6914;margin-top:5mm;font-style:italic}";
h+=".diff{display:flex;justify-content:center;gap:16px;margin-top:5mm;flex-wrap:wrap}";
h+=".diff span{font-size:9pt;color:#666}";
h+=".cta{text-align:center;margin-top:5mm;background:#2f5d49;border-radius:8px;padding:4mm}";
h+=".cta .t{font-size:11.5pt;font-weight:700;color:#fff}";
h+=".cta .p{font-size:13pt;font-weight:700;color:#F2E2B0;margin-top:3px;letter-spacing:1px}";
h+=".foot{position:absolute;bottom:11mm;left:18mm;right:18mm;text-align:center;border-top:1px solid #C9A84C;padding-top:5mm}";
h+=".foot .nm{font-size:12pt;font-weight:700;color:#222}.foot .cr{font-size:9.5pt;color:#888;margin-top:2px}";
h+=".foot .ad{font-size:8.5pt;color:#aaa;margin-top:4px}";
h+="</style></head><body>";
h+="<button class='noprint' onclick='window.print()'>&#128424; Imprimir / Salvar PDF</button>";
h+="<div class='noprint' style='position:fixed;top:58px;right:12px;background:#fff;border:1px solid #ddd;border-radius:8px;padding:8px 11px;font-family:sans-serif;font-size:11px;color:#555;max-width:185px;box-shadow:0 4px 14px rgba(0,0,0,.15);z-index:99;line-height:1.45'>No celular: toque em <b>Imprimir</b> e depois no &#9786; <b>compartilhar</b> para salvar/enviar o PDF.</div>";
h+="<div class='page'><div class='topbar'></div><div class='gold-line'></div>";
h+="<div class='head'><div class='nome'>Affonso Odontologia</div><div class='sub'>Cl&iacute;nica Especializada</div><div class='deco'><span class='l'></span><span class='d'>&#10070;</span><span class='l'></span></div></div>";
h+="<div class='content'>";
h+="<div class='title'>Plano de Tratamento Personalizado</div>";
h+="<div class='hello'>Ol&aacute;, <b>"+(pat.name||"")+"</b>! Foi um prazer receb&ecirc;-lo(a). Preparamos com todo o cuidado o plano abaixo para cuidar do seu sorriso com excel&ecirc;ncia.</div>";
h+="<div class='sec-t'>Procedimentos propostos</div>"+itensHtml;
if(desc0>0){h+="<div class='total-box'><div class='de'>"+brl(subtotal)+"</div><div class='por'>"+brl(tot)+" <small>no plano</small></div><div class='eco'>Voc&ecirc; economiza "+brl(desc0)+"</div></div>";}
else{h+="<div class='total-box'><div class='por'>"+brl(tot)+" <small>investimento total</small></div></div>";}
if(payHtml){h+="<div class='sec-t'>Condi&ccedil;&otilde;es de pagamento</div><div class='pay-box'>"+payHtml+"</div>";}
h+="<div class='valid'>Esta proposta &eacute; v&aacute;lida at&eacute; "+valStr+".</div>";
h+="<div class='diff'><span>&#10003; Materiais de primeira linha</span><span>&#10003; Profissionais especializados</span><span>&#10003; Acompanhamento p&oacute;s-tratamento</span></div>";
h+="<div class='cta'><div class='t'>Vamos cuidar do seu sorriso?</div><div class='p'>WhatsApp 98766-9852</div></div>";
h+="</div>";
h+="<div class='foot'><div class='nm'>"+dentName+"</div>"+(dentCro?"<div class='cr'>"+dentCro+"</div>":"")+"<div class='ad'>Rua Sabbado D Angelo, 1980 - Itaquera, S&atilde;o Paulo &nbsp;|&nbsp; Tel. 2524-9975 &nbsp;|&nbsp; WhatsApp 98766-9852</div></div>";
h+="</div></body></html>";
// Abertura compatível com celular (iOS) e computador: window.open + document.write; fallback para blob/link
var w=window.open("","_blank");
if(w&&w.document){
  w.document.open();w.document.write(h);w.document.close();
}else{
  var blob=new Blob([h],{type:"text/html"});
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noreferrer";
  document.body.appendChild(a);a.click();
  setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},1500);
}
};

const patRecs=recs.filter(r=>r.patientId===pat.id).sort((a,b)=>b.date.localeCompare(a.date));
const patTreats=treats.filter(t=>t.patientId===pat.id);
const patBudgets=budgets.filter(b=>b.patientId===pat.id);
const patAppts=appts.filter(a=>a.patientId===pat.id).sort((a,b)=>b.date.localeCompare(a.date));
const patPaid=patRecs.reduce((s,r)=>s+r.paid,0);

const savePat=()=>{setPats(prev=>prev.map(p=>p.id===pat.id?pf:p));setEditMode(false);};
const saveAnam=()=>{setPats(prev=>prev.map(p=>p.id===pat.id?pf:p));setEditMode(false);};

const genM=(d,n)=>{const ms=[];const x=new Date(d+"T12:00");for(let i=1;i<=n;i++){x.setMonth(x.getMonth()+1);ms.push(`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`);}return ms;};
const saveRec=()=>{
if(Number(rf.paid)>0&&!rf.closed)return alert("Marque 'Confirmar baixa financeira'.");
const ms=rf.payment==="Cartão Crédito"&&Number(rf.inst)>1?genM(rf.date,Number(rf.inst)):[];
const obj={...rf,patientId:pat.id,dentistId:Number(rf.dentistId),paid:pmoney(rf.paid),inst:Number(rf.inst),instM:ms,id:recEdit?recEdit.id:nid(recs),ts:rf.ts||new Date().toISOString(),_by:(recEdit&&recEdit._by)||(user&&user.name)||""};
setRecs(prev=>recEdit?prev.map(r=>r.id===recEdit.id?obj:r):[...prev,obj]);
setRecModal(false);
};
const saveTreat=()=>{if(!tf.name)return;setTreats(prev=>[...prev,{...tf,patientId:pat.id,dentistId:Number(tf.dentistId)||user.dentistId||dents[0]?.id||1,orcStatus:tf.orcStatus||"espera",id:nid(treats),_ts:Date.now(),_by:(user&&user.name)||""}]);setTreatModal(false);setTf({name:"",start:today(),items:[],payments:[]});};
const addTItem=()=>{
if(!tni.d&&!tni.procId)return alert("Selecione um procedimento");
if(!tni.v)return alert("Informe o valor");
const procName=procs.find(p=>String(p.id)===String(tni.procId))?.name||"";
const detail=tni.d&&tni.d!==procName?tni.d:"";
const desc=procName?(detail?`${procName} -- ${detail}`:procName):(tni.d||"Procedimento");
setTf(p=>({...p,items:[...p.items,{desc,value:pmoney(tni.v),paid:false}]}));
setTni({d:"",procId:"",v:""});
};
// Baixa de procedimento pelo dentista
const [ortoPayModal,setOrtoPayModal]=useState(null); // {tid, idx}
const [ortoPayMethod,setOrtoPayMethod]=useState("PIX");
const [ortoPayVal,setOrtoPayVal]=useState("");
const togItemPaid=(tid,idx)=>{
const treat=treats.find(t=>t.id===tid);
if(!treat)return;
const item=treat.items[idx];
// Giving baixa
if(!item.done){
// Orto: ask payment method first
if(item.orto){setOrtoPayModal({tid,idx});return;}
const payments=treat.payments||[];
const hasInstallment=payments.some(p=>p.installments>1||(p.method==="Cartão Crédito"&&p.installmentMonths?.length>1));
setTreats(prev=>prev.map(t=>t.id!==tid?t:{...t,_ts:Date.now(),items:t.items.map((it,i)=>i!==idx?it:{
...it,done:true,doneDate:today(),doneBy:user.name,doneByDentistId:user.dentistId||null,_dts:Date.now(),
creditFuture:hasInstallment,
})}));
} else {
// Desfazer baixa: SOMENTE administrador (level>=3)
if(user.level<3){
alert("Apenas o administrador pode desfazer uma baixa. Procure o Dr. Diego.");return;
}
// Abrir modal de confirmação (window.confirm bloqueado no iOS)
setConfirmDesfazer({tid,idx});
}
};
// Executar desfazer após confirmação no modal
const execDesfazer=()=>{
if(!confirmDesfazer)return;
const {tid,idx:didx}=confirmDesfazer;
const _t=treats.find(x=>x.id===tid);
const _it=_t&&_t.items[didx];
const _rid=_it&&_it.recId;
const _pid=_it&&_it.pmtId;
if(_rid!=null)setRecs(prev=>prev.filter(r=>r.id!==_rid));
setTreats(prev=>prev.map(t=>t.id!==tid?t:{...t,_ts:Date.now(),payments:(t.payments||[]).filter(p=>_pid==null||p.id!==_pid),items:t.items.map((it,i)=>i!==didx?it:{
...it,done:false,doneDate:null,doneBy:null,doneByDentistId:null,creditFuture:false,recId:null,pmtId:null,_dts:Date.now()
})}));
setConfirmDesfazer(null);
};
const addPayment=(tid)=>{
const pv=pmoney(payForm.value);
if(!pv)return alert("Informe o valor");
const t=treats.find(x=>x.id===tid);
// Save payment in treatment plan
const instSave=payForm.method.toLowerCase().indexOf("crédito")>=0||payForm.method.toLowerCase().indexOf("credito")>=0?Number(payForm.inst||1):1;
setTreats(prev=>prev.map(function(tr){if(tr.id!==tid)return tr;var newPays=[...(tr.payments||[]),{id:nid(tr.payments||[]),date:payForm.date,value:pv,method:payForm.method,note:payForm.note,inst:instSave,_by:(user&&user.name)||""}];var totIt=(tr.items||[]).reduce(function(s,i){return s+Number(i.value||0);},0);var totPg=newPays.reduce(function(s,p){return s+Number(p.value||0);},0);var ns=tr.orcStatus||"espera";if((ns==="parcial"||ns==="espera")&&totIt>0&&totPg>=totIt-0.005)ns="aprovado";else if(ns==="espera"&&totPg>0)ns="parcial";return {...tr,_ts:Date.now(),payments:newPays,orcStatus:ns};}));
// Also create a rec entry so Financeiro sees it
const inst=payForm.method.toLowerCase().indexOf("crédito")>=0||payForm.method.toLowerCase().indexOf("credito")>=0?Number(payForm.inst||1):1;
const recObj={
id:nid(recs),
patientId:pat.id,
dentistId:t&&t.dentistId||dents[0]&&dents[0].id||1,
procedure:t&&t.name||"Procedimento",
date:payForm.date,
paid:pv,
payment:payForm.method,
inst:inst,
note:payForm.note||"",
apptId:null,
fromTreat:tid,
ts:new Date().toISOString(),
_by:(user&&user.name)||"",
};
setRecs(prev=>[...prev,recObj]);
setPayModal(null);setPayForm({date:today(),value:"",method:"Dinheiro",inst:"1",note:""});
};
const saveBudg=()=>{if(!bf.items.length)return alert("Adicione itens");const obj={...bf,patientId:pat.id,disc:pmoney(bf.disc),items:bf.items.map(function(it){return {...it,v:pmoney(it.v)};}),id:budgEdit?budgEdit.id:nid(budgets),_by:(budgEdit&&budgEdit._by)||(user&&user.name)||""};setBudgets(prev=>budgEdit?prev.map(b=>b.id===budgEdit.id?obj:b):[...prev,obj]);setBudgModal(false);};

const TABS=[["ficha","📋 Ficha"],["anamnese","🩺 Anamnese"],["tratamento","🦷 Tratamento"],["odonto3d","🦷 3D"],["evolucao","📝 Evolução"],["imagens","📷 Imagens"],["historico","📅 Histórico"],["atestado","📄 Atestado"],["docs","📑 Documentos"],...(!isDentUser?[["financeiro","💰 Financeiro"],["nf","🧾 Nota Fiscal"]]:[])];
// NF (Nota Fiscal) state
const [nfModal,setNfModal]=useState(false);
const [showAtestado,setShowAtestado]=useState(false);
const [atDias,setAtDias]=useState("1");
const [atData,setAtData]=useState(today());
const [atCid,setAtCid]=useState("");
const [atObs,setAtObs]=useState("");
const [atTextoEdit,setAtTextoEdit]=useState("");
const [atEditMode,setAtEditMode]=useState(false);
const [atModo,setAtModo]=useState("dias");
const [atHoraIni,setAtHoraIni]=useState("08:00");
const [atHoraFim,setAtHoraFim]=useState("12:00");
const [atDentId,setAtDentId]=useState(String((user&&user.dentistId)||(dents[0]&&dents[0].id)||""));
const [nfEdit,setNfEdit]=useState(null);
const [confirmDel,setConfirmDel]=useState(null); // {type,id,label}
const [detFin,setDetFin]=useState(null); // V223: popup quem lancou {titulo,sub,by,ts,verbo}
const lastEmpNF=(function(){var best=null;(pats||[]).forEach(function(pp){(pp.nfs||[]).forEach(function(n){if(n.payer==="empresa"&&(n.payerName||n.payerCnpj)){if(!best||(n.date||"")>(best.date||"")||((n.date||"")===(best.date||"")&&(n.id||0)>(best.id||0)))best=n;}});});return best;})();
const blankNF={date:today(),number:"",payer:"empresa",payerName:(lastEmpNF&&lastEmpNF.payerName)||"",payerCnpj:(lastEmpNF&&lastEmpNF.payerCnpj)||"",dentistId:"",procedure:"",value:"",tax:"",notes:"",status:"pending"};
const [nff,setNff]=useState(blankNF);
const patNFs=(pat.nfs||[]);
const saveNF=()=>{
if(!nff.procedure||!nff.value)return alert("Informe procedimento e valor");
const obj={...nff,value:pmoney(nff.value),tax:pmoney(nff.tax),id:nfEdit?nfEdit.id:nid(patNFs)};
const newNFs=nfEdit?patNFs.map(n=>n.id===nfEdit.id?obj:n):[...patNFs,obj];
setPats(prev=>prev.map(p=>p.id===pat.id?{...p,nfs:newNFs}:p));
setNfModal(false);
};

// Evolução clínica
const [evoModal,setEvoModal]=useState(false);
const [evoEdit,setEvoEdit]=useState(null);
const blankEvo={date:today(),text:"",dentistId:String(user.dentistId||dents[0]?.id||"")};
const [evoF,setEvoF]=useState(blankEvo);
const patEvos=(pat.evolucoes||[]).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.id-a.id));
const saveEvo=()=>{
if(!evoF.text||!evoF.text.trim())return alert("Descreva o que foi feito nesta sessão");
const obj={date:evoF.date,text:evoF.text.trim(),dentistId:Number(evoF.dentistId)||null,createdBy:user.name,id:evoEdit?evoEdit.id:nid(pat.evolucoes||[])};
const arr=evoEdit?(pat.evolucoes||[]).map(e=>e.id===evoEdit.id?obj:e):[...(pat.evolucoes||[]),obj];
setPats(prev=>prev.map(p=>p.id===pat.id?{...p,evolucoes:arr}:p));
setEvoModal(false);setEvoEdit(null);setEvoF(blankEvo);
};

// Add procedure to existing plan
const [addProcModal,setAddProcModal]=useState(null); // treatId
const [editPlan,setEditPlan]=useState(null);
const [addProcForm,setAddProcForm]=useState({procId:"",d:"",v:"",qty:"",manual:""});
const saveAddProc=()=>{
const manual=(addProcForm.manual||"").trim();
const pr=procs.find(p=>String(p.id)===String(addProcForm.procId));
if(!manual&&!pr){alert("Selecione na lista ou escreva o procedimento");return;}
const base=manual||pr.name;
const det=(addProcForm.d||"").trim();
const desc=det?`${base} -- ${det}`:base;
const qtd=Math.max(1,Number(addProcForm.qty||1));
const novos=Array.from({length:qtd},(_,i)=>({desc:qtd>1?`${desc} (${i+1}/${qtd})`:desc,value:Number(addProcForm.v)||0,paid:false}));
setTreats(prev=>prev.map(t=>t.id!==addProcModal?t:{...t,_ts:Date.now(),items:[...t.items,...novos]}));
setAddProcModal(null);
};

const BSTATUS={pending:"Em espera",approved:"Aprovado",rejected:"Recusado"};
const BCOLOR={pending:G.yellow,approved:G.success,rejected:G.red};

return <>

<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:10}}>
<div style={{background:G.card,borderRadius:18,width:"100%",maxWidth:820,maxHeight:"95vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.28)"}}>
{/* Header */}
<div style={{background:G.primary,borderRadius:"18px 18px 0 0",padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div>
<div style={{fontFamily:"'Cormorant Garamond'",fontSize:22,color:"#fff"}}>Prontuário: {pat.name}</div>
<div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginTop:2}}>{age(pat.dob)} · {pat.phone} · Pasta {pat.folder}</div>
</div>
<button onClick={onClose} style={{border:"none",background:"rgba(255,255,255,.2)",borderRadius:8,color:"#fff",fontSize:18,cursor:"pointer",padding:"6px 12px",fontWeight:700}}>✕ Fechar</button>
</div>
{/* Tabs */}
<div style={{display:"flex",gap:6,padding:"14px 22px 0",borderBottom:`2px solid ${G.border}`,background:"var(--surface)",flexWrap:"wrap"}}>
{TABS.map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={{border:"none",background:tab===k?G.primary:"var(--green-soft)",color:tab===k?"#fff":G.muted,borderRadius:"8px 8px 0 0",padding:"9px 16px",fontSize:12,fontWeight:700,cursor:"pointer",transition:"all .15s",marginBottom:-2,borderBottom:tab===k?`2px solid ${G.primary}`:"none"}}>{l}</button>)}
</div>

<div style={{padding:22}}>
  {showPortal&&<PortalModal pat={pf} setPats={setPats} setPf={setPf} onClose={function(){setShowPortal(false);}}/>}
  {/* ── FICHA ── */}
  {tab==="ficha"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
    {showIARX&&<IARX pat={pf} onClose={function(){setShowIARX(false);}}/>}
    <button onClick={function(){setShowIARX(true);}} style={{background:G.blue,color:"#fff",border:"none",borderRadius:10,padding:"9px 14px",fontSize:13,fontWeight:700,cursor:"pointer"}}>{"🦷 Analisar RX com IA"}</button>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontWeight:700,fontSize:15,color:G.primary}}>📋 Dados do Paciente</span>
      {!editMode?<div style={{display:"flex",gap:5}}><Btn ch="📋 WA" v="g" sm onClick={function(){setShowWAanam(true);}}/><Btn ch="🔗 Portal" v="g" sm onClick={function(){setShowPortal(true);}}/><Btn ch="✏️ Editar" v="g" sm onClick={()=>setEditMode(true)}/></div>:<div style={{display:"flex",gap:8}}><Btn ch="💾 Salvar" sm onClick={savePat}/><Btn ch="Cancelar" v="g" sm onClick={()=>{setPf({...pat});setEditMode(false);}}/></div>}
    </div>
    {pat.obs&&<div style={{background:G.yellow+"18",border:`2px solid ${G.yellow}`,borderRadius:10,padding:"9px 14px"}}><span style={{fontWeight:700,color:G.yellow}}>⚠ ALERGIA / OBS. IMPORTANTE</span><div style={{color:G.text,marginTop:4,fontSize:14}}>{pat.obs||pat.allergy}</div></div>}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      {!editMode?<>
        {[["NOME",pat.name],["IDADE",age(pat.dob)+" ("+fmt(pat.dob)+")"],["CPF",pat.cpf||"--"],["RG",pat.rg||"--"],["TELEFONE",user.level>=2?pat.phone:"••••••••••"],["TELEFONE 2 (FIXO)",user.level>=2?(pat.phone2||"--"):"••••••••••"],["E-MAIL",user.level>=2?(pat.email||"--"):"••••••••••"],["TIPO SANGUÍNEO",pat.blood||"--"],["PLANO",pat.insurance||"--"],["Nº DA FICHA",pat.folder],["Nº DO RX",pat.rx],["REF. NF",pat.nf||"--"],["ALERGIA",pat.allergy||"Nenhuma"],["COMO NOS CONHECEU",pat.origem||"Não informado"]].map(([k,v])=><div key={k} style={{background:G.bg,borderRadius:8,padding:"8px 12px"}}><div style={{fontSize:10,fontWeight:700,color:G.muted}}>{k}</div><div style={{fontWeight:600,fontSize:13,color:k==="ALERGIA"&&v!=="Nenhuma"?G.red:G.text}}>{v}</div></div>)}
      </>:<>
        <Inp lb="Nome" val={pf.name} set={v=>setPf(p=>({...p,name:v}))}/>
        <DatePick lb="Nascimento" val={pf.dob} set={v=>setPf(p=>({...p,dob:v}))}/>
        <Inp lb="CPF" val={pf.cpf} set={v=>setPf(p=>({...p,cpf:v}))}/>
        <Inp lb="RG" val={pf.rg} set={v=>setPf(p=>({...p,rg:v}))}/>
        <Inp lb="Telefone" val={pf.phone} set={v=>setPf(p=>({...p,phone:v}))}/>
        <Inp lb="Telefone 2 (fixo)" val={pf.phone2||""} set={v=>setPf(p=>({...p,phone2:v}))}/>
        <Inp lb="E-mail" val={pf.email} set={v=>setPf(p=>({...p,email:v}))}/>
        <Inp lb="Tipo Sanguíneo" val={pf.blood} set={v=>setPf(p=>({...p,blood:v}))}/>
        <Inp lb="Plano de Saúde" val={pf.insurance} set={v=>setPf(p=>({...p,insurance:v}))}/>
        <Inp lb="Nº da Ficha" val={pf.folder} set={v=>setPf(p=>({...p,folder:v}))}/>
        <Inp lb="Nº do RX" val={pf.rx} set={v=>setPf(p=>({...p,rx:v}))}/>
        <Inp lb="Ref. Nota Fiscal" val={pf.nf} set={v=>setPf(p=>({...p,nf:v}))}/>
        <Inp lb="Alergia" val={pf.allergy} set={v=>setPf(p=>({...p,allergy:v}))}/>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Como nos conheceu?</label>
          <select value={pf.origem||""} onChange={e=>setPf(p=>({...p,origem:e.target.value}))} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"9px 12px",fontSize:14,outline:"none",background:"var(--surface)"}}>
            <option value="">Não informado</option>
            {["Indicação","Instagram","Já era paciente","Urgência","Passando na rua","Google","Outro"].map(o=><option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </>}
    </div>
    {editMode&&<Txt lb="⚠ Obs. Importante (destaque em toda a clínica)" val={pf.obs} set={v=>setPf(p=>({...p,obs:v}))} rows={2}/>}
    {editMode&&<Txt lb="Observações Gerais" val={pf.notes} set={v=>setPf(p=>({...p,notes:v}))} rows={2}/>}
    {!editMode&&pat.notes&&<div style={{background:G.accent,borderRadius:8,padding:"8px 12px",fontSize:13,color:G.muted,fontStyle:"italic"}}>Obs: {pat.notes}</div>}
    {pat.phone&&user.level>=2&&<Btn ch="📱 WhatsApp" v="w" sm onClick={()=>wa(pat.phone,`Olá ${pat.name}! 😊`)} style={{alignSelf:"flex-start"}}/>}
  </div>}

  {/* ── ANAMNESE ── */}
  {tab==="anamnese"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
    {showWAanam&&<WAAnamneseModal pat={pf} onClose={function(){setShowWAanam(false);}}/>}
    {buscaMsg&&<div style={{background:G.accent,borderRadius:8,padding:"8px 12px",fontSize:12.5,color:G.primary}}>{buscaMsg}</div>}
    {pat.anamPend&&<div style={{background:G.success+"18",border:"1.5px solid "+G.success,borderRadius:10,padding:"10px 13px",display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:16}}>\u2705</span><div style={{fontSize:12.5,color:G.success,fontWeight:600,lineHeight:1.45}}>Ficha recebida do paciente pelo WhatsApp! Revise os dados abaixo e clique em <strong>Salvar</strong> para confirmar.</div></div>}
    {fillAnam&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:9000,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:16,overflowY:"auto"}}><div style={{background:G.card,borderRadius:16,width:"100%",maxWidth:560,margin:"16px auto",padding:"20px"}}><AnamForm patientName={pat.name} initial={pf.anamnese} onCancel={function(){setFillAnam(false);}} onSubmit={function(a){var aa=Object.assign({},a,{preenchida:true});setPf(prev=>Object.assign({},prev,{anamnese:Object.assign({},prev.anamnese||{},aa)}));setPats(prev=>prev.map(pp=>pp.id===pf.id?Object.assign({},pp,{anamnese:Object.assign({},pp.anamnese||{},aa)}):pp));setFillAnam(false);}}/></div></div>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontWeight:700,fontSize:15,color:G.primary}}>🩺 Anamnese Clínica</span>
      {!editMode?<div style={{display:"flex",gap:6,flexWrap:"wrap"}}><Btn ch="📋 WA" v="w" sm onClick={function(){setShowWAanam(true);}}/><Btn ch="📝 Na tela" v="g" sm onClick={function(){setFillAnam(true);}}/>{SUPA_URL&&<Btn ch="🔄 Buscar" v="g" sm onClick={function(){setBuscaMsg("Buscando...");supabase.fetchAnam(btoa("orbe:"+pat.id)).then(function(pp){if(pp){setPf(prev=>Object.assign({},prev,{anamnese:Object.assign({},prev.anamnese||{},pp)}));setEditMode(true);setBuscaMsg("Ficha recebida do paciente! Revise e salve.");}else{setBuscaMsg("Nenhuma ficha enviada ainda.");}});}}/>}{!isDentUser&&<Btn ch="✏️ Editar" v="g" sm onClick={()=>setEditMode(true)}/>}</div>:<div style={{display:"flex",gap:8}}><Btn ch="💾 Salvar" sm onClick={()=>{setPats(prev=>prev.map(p=>p.id===pf.id?Object.assign({},pf,{anamPend:false,anamnese:Object.assign({},pf.anamnese||{},{preenchida:true})}):p));setEditMode(false);}}/><Btn ch="Cancelar" v="g" sm onClick={()=>{setPf({...pat});setEditMode(false);}}/></div>}
    </div>
    {(function(){var fl=ANAM_ALERT.filter(function(k){return pf.anamnese&&pf.anamnese[k];}).map(function(k){var c=ANAM_CONDS.find(function(x){return x[0]===k;});return c?c[1]:k;});return fl.length>0?<div style={{background:G.red+"15",border:"1.5px solid "+G.red,borderRadius:10,padding:"10px 13px",display:"flex",gap:8,alignItems:"flex-start"}}><span style={{fontSize:16}}>⚠️</span><div style={{fontSize:12.5,color:G.red,fontWeight:600,lineHeight:1.5}}>Atencao especial: {fl.join(", ")}. Reforce a biosseguranca e avalie as precaucoes necessarias antes do procedimento.</div></div>:null;})()}
    <Div lb="Condições Sistêmicas"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {ANAM_CONDS.map(([k,l])=>{
        const v=pf.anamnese?.[k]||false;
        return <div key={k} style={{display:"flex",flexDirection:"column",gap:6}}>
        <label style={{display:"flex",alignItems:"center",gap:9,background:v?G.red+"12":G.bg,borderRadius:9,padding:"10px 13px",cursor:"pointer",border:`1.5px solid ${v?G.red:G.border}`}}>
          <input type="checkbox" checked={v} disabled={!editMode} onChange={e=>setPf(p=>({...p,anamnese:{...p.anamnese,[k]:e.target.checked}}))} style={{accentColor:G.red,width:15,height:15}}/>
          <span style={{fontSize:13,fontWeight:v?700:400,color:v?G.red:G.text}}>{l}</span>
          {v&&<span style={{marginLeft:"auto",fontSize:11,color:G.red,fontWeight:700}}>⚠ Sim</span>}
        </label>
        {v&&<input value={pf.anamnese?.[k+"_det"]||""} readOnly={!editMode} onChange={e=>setPf(p=>({...p,anamnese:{...p.anamnese,[k+"_det"]:e.target.value}}))} placeholder="Quando? Já tratou ou ainda tem?" style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"7px 10px",fontSize:12.5,outline:"none"}}/>}
        </div>;
      })}
    </div>
    <Div lb="Medicamentos e Detalhes"/>
    <R2 a={<Inp lb="Alergias a Medicamentos" val={pf.anamnese?.allergicMeds||""} set={v=>setPf(p=>({...p,anamnese:{...p.anamnese,allergicMeds:v}}))} ro={!editMode}/>}
        b={<Inp lb="Medicamentos em Uso" val={pf.anamnese?.medications||""} set={v=>setPf(p=>({...p,anamnese:{...p.anamnese,medications:v}}))} ro={!editMode}/>}/>
    <Txt lb="Outras Condições de Saúde" val={pf.anamnese?.otherConditions||""} set={v=>setPf(p=>({...p,anamnese:{...p.anamnese,otherConditions:v}}))} ro={!editMode} rows={2}/>
    <Txt lb="Observações Clínicas" val={pf.anamnese?.notes||""} set={v=>setPf(p=>({...p,anamnese:{...p.anamnese,notes:v}}))} ro={!editMode} rows={2}/>
    <Div lb="Assinatura do Paciente"/>
    {(editMode||pf.anamnese?.signature)?<SignaturePad value={pf.anamnese?.signature||""} disabled={!editMode} onChange={v=>setPf(p=>({...p,anamnese:{...p.anamnese,signature:v,signedAt:v?(p.anamnese&&p.anamnese.signedAt||today()):"",signedBy:v?pat.name:""}}))}/>:<div style={{fontSize:13,color:G.muted,background:G.bg,borderRadius:9,padding:"12px 14px"}}>Sem assinatura registrada. Use o botao Editar para o paciente assinar com o dedo.</div>}
    {pf.anamnese?.signature&&<div style={{fontSize:11.5,color:G.muted}}>{"Assinado por "+(pf.anamnese?.signedBy||pat.name)+(pf.anamnese?.signedAt?(" em "+fmt(pf.anamnese.signedAt)):"")}</div>}
    {editMode&&<div style={{fontSize:11,color:G.muted}}>Peca ao paciente assinar no quadro acima. A assinatura fica salva e sai na ficha impressa.</div>}
    <Btn ch="🖨️ Imprimir Ficha de Anamnese" v="g" sm onClick={function(){var w=window.open("","_blank");if(!w){alert("Permita pop-ups para abrir a ficha.");return;}w.document.write(anamHTML(pf));w.document.close();}} style={{alignSelf:"flex-start"}}/>
  </div>}

  {/* ── TRATAMENTO ── */}
  {tab==="tratamento"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
      <span style={{fontWeight:700,fontSize:15,color:G.primary}}>🦷 Planos de Tratamento</span>
      {!isDentUser&&<Btn ch="+ Novo Plano" sm onClick={()=>{setTf({name:"",start:today(),dentistId:user.dentistId||dents[0]?.id||1,items:[],payments:[]});setTreatModal(true);}}/>}
          {!isDentUser&&<Btn ch="🦷 Plano Orto" sm v="f" onClick={()=>{setOrtoForm({valor:"",ano:new Date().getFullYear(),dentistId:String(dents.find(d=>(d.specialty||"").toLowerCase().includes("orto"))?.id||dents[0]?.id||"")});setOrtoModal(true);}}/>}
    </div>
    {patTreats.length===0&&<div style={{background:G.bg,borderRadius:10,padding:"20px",textAlign:"center",color:G.muted,fontSize:13}}>Nenhum plano de tratamento</div>}
    {patTreats.map(t=>{
      const total=t.items.reduce((s,i)=>s+i.value,0);
      const paid=(t.payments||[]).reduce((s,p)=>s+p.value,0);
      const effOrc=(function(){var s=(t.orcStatus||"espera");if((s==="parcial"||s==="espera")&&total>0&&paid>=total-0.005)return "aprovado";if(s==="espera"&&paid>0)return "parcial";return s;})();
      return <div key={t.id} style={{background:t.finalizado?"var(--green-soft)":G.bg,borderRadius:12,padding:"14px 16px",border:"1px solid "+(t.finalizado?G.success:G.border),opacity:t.finalizado?0.85:1}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:6}}>
          <div>
  <div style={{display:"flex",alignItems:"center",gap:7}}>
    <span style={{fontWeight:700,fontSize:14}}>{t.name}</span>
    {user.level>=3&&<button onClick={(e)=>{e.stopPropagation();setDetFin({titulo:"Quem criou este plano?",sub:t.name+(t.start?" \u00b7 in\u00edcio "+fmt(t.start):""),by:t._by,ts:null,verbo:"Criou o plano de tratamento"});}} title="Quem criou?" style={{background:"var(--card)",border:"1.5px solid "+G.border,borderRadius:"50%",width:24,height:24,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,lineHeight:1,boxShadow:"2px 2px 5px var(--nm-dark),-2px -2px 5px var(--nm-light)",flexShrink:0}}>{"\ud83d\udd75\ufe0f"}</button>}
    {t.finalizado&&<span style={{background:G.success+"20",color:G.success,borderRadius:10,padding:"1px 8px",fontSize:10,fontWeight:700}}>{"✅ Concluído"}</span>}
  </div>
  <div style={{fontSize:12,color:G.muted}}>{"Início: "+fmt(t.start)}{t.finalizado?" · Finalizado: "+fmt(t.finalizadoEm):""}</div>
</div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{textAlign:"right"}}><div style={{fontWeight:700,color:G.primary}}>{cur(total)}</div><div style={{fontSize:11,color:G.muted}}>Pago: {cur(paid)} · Saldo: {cur(total-paid)}</div></div>
            {!isDentUser&&<button onClick={()=>{setAddProcModal(t.id);setAddProcForm({procId:"",d:"",v:"",qty:"",manual:""});}} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Proc.</button>}
            {!isDentUser&&<button onClick={()=>setEditPlan({id:t.id,name:t.name||"",start:t.start||today()})} style={{background:G.accent,color:G.primary,border:"1.5px solid "+G.primary,borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>✏️ Editar</button>}
            <button onClick={()=>{setPdfBudget({items:t.items.map(function(it){return{d:it.desc,v:it.value};}),disc:0,dentistId:t.dentistId,date:t.start,_planName:t.name});setPayCfg(defPayCfg());setTreats(prev=>prev.map(x=>x.id===t.id?{...x,_ts:Date.now(),orcEnviado:true,orcEnviadoAt:today()}:x));}} style={{background:G.gold,color:"#fff",border:"none",borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>📄 Orçamento</button>
                { !t.finalizado
                  ? (!isDentUser&&<button onClick={()=>setTreats(prev=>prev.map(x=>x.id!==t.id?x:{...x,_ts:Date.now(),finalizado:true,finalizadoEm:today(),finalizadoPor:user.name}))}
                    style={{background:G.success,color:"#fff",border:"none",borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{"✓ Finalizar"}</button>)
                  :<div style={{display:"flex",alignItems:"center",gap:5}}>
                    <span style={{background:G.success+"20",color:G.success,borderRadius:10,padding:"3px 10px",fontSize:11,fontWeight:700}}>{"✅ Finalizado"}</span>
                    {!isDentUser&&<button onClick={()=>setTreats(prev=>prev.map(x=>x.id!==t.id?x:{...x,_ts:Date.now(),finalizado:false,finalizadoEm:null,finalizadoPor:null}))}
                      style={{background:"none",border:"1px solid "+G.border,borderRadius:6,padding:"2px 7px",fontSize:10,color:G.muted,cursor:"pointer"}}>{"↩"}</button>}
                  </div>
                }
                {!isDentUser&&<button onClick={()=>{if(window.confirm&&!window.confirm("Excluir plano?"))return;setTreats(prev=>prev.filter(x=>x.id!==t.id));}}
                  style={{background:G.red,color:"#fff",border:"none",borderRadius:8,padding:"5px 10px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{"🗑"}</button>}
            {!isDentUser&&<button onClick={()=>{setTreats(prev=>prev.filter(x=>x.id!==t.id));}} style={{background:G.red,color:"#fff",border:"none",borderRadius:8,padding:"5px 10px",fontSize:12,fontWeight:700,cursor:"pointer"}}>🗑️</button>}
          </div>
        </div>
        {/* ORCAMENTO: status controlado pela secretaria */}
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:8,padding:"7px 10px",background:G.bg,borderRadius:9}}>
          <span style={{fontSize:11,fontWeight:700,color:G.muted}}>Orçamento:</span>
          {[["aprovado","Aprovado",G.success],["espera","Em espera",G.yellow],["parcial","Parcial",G.blue],["naofechado","Não fechado",G.red]].map(function(o){var sv=o[0],sl=o[1],sc=o[2];var active=effOrc===sv;
            return isDentUser
              ?(active?<span key={sv} style={{background:sc,color:"#fff",borderRadius:8,padding:"3px 11px",fontSize:11,fontWeight:700}}>{sl}</span>:null)
              :<button key={sv} onClick={()=>setTreats(prev=>prev.map(x=>x.id!==t.id?x:{...x,_ts:Date.now(),orcStatus:sv}))} style={{background:active?sc:"var(--card)",color:active?"#fff":G.muted,border:"1.5px solid "+(active?sc:G.border),borderRadius:8,padding:"3px 11px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{sl}</button>;
          })}
          <span style={{width:1,height:18,background:G.border,margin:"0 3px"}}/>
          {isDentUser
            ?(t.orcEnviado?<span style={{background:G.success+"20",color:G.success,borderRadius:8,padding:"3px 11px",fontSize:11,fontWeight:700}}>{"📤 Enviado"+(t.orcEnviadoAt?" · "+fmt(t.orcEnviadoAt):"")}</span>:<span style={{background:G.red+"15",color:G.red,borderRadius:8,padding:"3px 11px",fontSize:11,fontWeight:700}}>{"📤 Não enviado"}</span>)
            :<button onClick={()=>setTreats(prev=>prev.map(x=>x.id!==t.id?x:Object.assign({},x,{_ts:Date.now(),orcEnviado:!x.orcEnviado,orcEnviadoAt:(!x.orcEnviado)?today():null})))} title="Marque se o orçamento já foi enviado ao paciente (por qualquer meio)" style={{background:t.orcEnviado?G.success:"var(--card)",color:t.orcEnviado?"#fff":G.red,border:"1.5px solid "+(t.orcEnviado?G.success:G.red),borderRadius:8,padding:"3px 11px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{t.orcEnviado?("📤 Enviado"+(t.orcEnviadoAt?" · "+fmt(t.orcEnviadoAt):"")):"📤 Marcar enviado"}</button>}
        </div>
        {(t.orcStatus==="naofechado")&&<div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:8,alignItems:"center"}}>
          <span style={{fontSize:11,fontWeight:700,color:G.red}}>Motivo:</span>
          {isDentUser
            ?<span style={{fontSize:12,color:G.text}}>{t.orcMotivo||"--"}{(t.orcMotivo==="Outro"&&t.orcMotivoObs)?(" — "+t.orcMotivoObs):""}</span>
            :<>
              <select value={t.orcMotivo||""} onChange={e=>setTreats(prev=>prev.map(x=>x.id!==t.id?x:{...x,_ts:Date.now(),orcMotivo:e.target.value}))} style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"5px 9px",fontSize:12,background:"var(--surface)",outline:"none"}}>
                <option value="">Selecione...</option>
                {MOTIVOS_ORC.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
              {t.orcMotivo==="Outro"&&<input value={t.orcMotivoObs||""} onChange={e=>setTreats(prev=>prev.map(x=>x.id!==t.id?x:{...x,_ts:Date.now(),orcMotivoObs:e.target.value}))} placeholder="Descreva o motivo" style={{flex:1,minWidth:150,border:"1.5px solid "+G.border,borderRadius:8,padding:"5px 9px",fontSize:12,outline:"none"}}/>}
            </>}
        </div>}
        <div style={{background:G.border,borderRadius:4,height:5,marginBottom:10}}><div style={{background:G.primary,height:5,borderRadius:4,width:`${total?Math.min(100,paid/total*100):0}%`,transition:"width .3s"}}/></div>
        {t.items.map((it,i)=>{
          const canCheck=user.level>=2||(user.level===1); // dentist can check
          const isDone=it.done||it.paid;
          return <div key={i} style={{display:"flex",gap:9,alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${G.border}`,flexWrap:"wrap"}}>
            <div style={{position:"relative",flexShrink:0}}>
              <input type="checkbox" checked={!!isDone} onChange={()=>togItemPaid(t.id,i)}
                disabled={isDone?user.level<3:!canCheck}
                style={{accentColor:G.primary,width:17,height:17,cursor:(isDone?user.level>=3:canCheck)?"pointer":"not-allowed"}}/>
            </div>
            <div style={{flex:1,minWidth:100}}>
              <span style={{fontSize:13,textDecoration:isDone?"line-through":"none",color:isDone?G.muted:G.text,fontWeight:isDone?400:600}}>{it.desc}</span>
              {isDone&&it.doneBy&&<div style={{fontSize:10,color:G.success,marginTop:1,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span>✓ Realizado por {it.doneBy} em {fmt(it.doneDate)}</span>
                  {user.level>=3&&<button onClick={()=>togItemPaid(t.id,i)} style={{background:"var(--amber-soft)",border:"1.5px solid "+G.orange,borderRadius:6,padding:"1px 8px",fontSize:10,fontWeight:700,color:G.orange,cursor:"pointer"}}>↩ Desfazer baixa</button>}
                </div>}
              {isDone&&it.creditFuture&&<div style={{fontSize:10,color:G.blue,marginTop:1,display:"flex",alignItems:"center",gap:4}}>
                <span>💳</span><span>Comissão aguarda crédito do cartão</span>
              </div>}
              {/* V219: mês de pagamento do dentista, por procedimento (planos clínicos) */}
              {isDone&&!it.orto&&(user.level>=2
                ?<div style={{display:"flex",alignItems:"center",gap:6,marginTop:4,flexWrap:"wrap"}}>
                  <span style={{fontSize:10,fontWeight:800,color:G.blue}}>{"💰 Pagar dentista em:"}</span>
                  <select value={it.payMonth||""} onChange={e=>{var v=e.target.value;setTreats(prev=>prev.map(tr=>tr.id!==t.id?tr:{...tr,_ts:Date.now(),items:tr.items.map((x,xi)=>xi!==i?x:{...x,payMonth:v||null,_dts:Date.now()})}));}}
                    style={{border:"1.5px solid "+(it.payMonth?G.blue:G.border),borderRadius:8,padding:"2px 8px",fontSize:11,fontWeight:700,color:it.payMonth?G.blue:G.muted,background:"var(--card)",outline:"none"}}>
                    <option value="">mês da baixa</option>
                    {pagMesOpts((it.doneDate||today()).slice(0,7)).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                :(it.payMonth?<div style={{marginTop:4}}><span style={{background:G.blue,color:"#fff",borderRadius:8,padding:"2px 9px",fontSize:10,fontWeight:700}}>{"💰 Pagar em: "+pagMesLabel(it.payMonth)}</span></div>:null))}
            </div>
            <span style={{fontSize:13,fontWeight:700,color:isDone?G.muted:G.primary}}>{cur(it.value)}</span>
            {!isDone&&<button onClick={()=>{setTreats(prev=>prev.map(tr=>tr.id!==t.id?tr:{...tr,_ts:Date.now(),items:tr.items.filter((_,idx)=>idx!==i)}));}} style={{background:"none",border:"none",color:G.muted,cursor:"pointer",fontSize:16,lineHeight:1,padding:"0 2px"}} title="Remover procedimento">✕</button>}
          </div>;
        })}
        <Div lb="Pagamentos Registrados"/>
        {(t.payments||[]).length===0&&<p style={{fontSize:12,color:G.muted}}>Nenhum pagamento registrado</p>}
        {(t.payments||[]).map(p=>{
          var isCredit=p.method==="Cartão Crédito";
          var inst=isCredit?Math.max(1,Number(p.inst||1)):1;
          var parcelas=[];
          if(isCredit&&inst>1&&p.date){
            var vlParcela=Number(p.value||0)/inst;
            for(var pi=1;pi<=inst;pi++){
              var dp=new Date(p.date+"T12:00");
              dp.setMonth(dp.getMonth()+pi);
              parcelas.push({n:pi,val:vlParcela,date:dp.toLocaleDateString("pt-BR")});
            }
          }
          return <div key={p.id} style={{padding:"6px 0",borderBottom:`1px solid ${G.border}`}}>
          <div style={{display:"flex",gap:8,fontSize:12,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{color:G.muted,minWidth:72}}>{fmt(p.date)}</span>
          <span style={{flex:1}}>{p.method}{p.note?` · ${p.note}`:""}{inst>1?` · ${inst}x`:""}</span>
          <span style={{fontWeight:700,color:G.success}}>{cur(p.value)}</span>
          {user.level>=3&&<button onClick={()=>{
  setTreats(prev=>prev.map(tr=>tr.id!==t.id?tr:{...tr,_ts:Date.now(),payments:(tr.payments||[]).filter(x=>x.id!==p.id)}));
  setRecs(prev=>prev.filter(r=>!(r.fromTreat===t.id&&Math.abs(r.paid-p.value)<0.01&&r.date===p.date)));
}} style={{background:G.red,border:"none",color:"#fff",cursor:"pointer",fontSize:12,padding:"3px 8px",borderRadius:6,fontWeight:700}} title="Excluir pagamento">✕ Excluir</button>}
          </div>
          {parcelas.length>0&&<div style={{background:G.blue+"10",borderRadius:7,padding:"6px 10px",marginTop:4,display:"flex",flexWrap:"wrap",gap:6}}>
            {parcelas.map(function(pc){return <span key={pc.n} style={{fontSize:11,color:G.blue,fontWeight:600,background:G.blue+"15",borderRadius:5,padding:"2px 8px"}}>{pc.n+"ª "+cur(pc.val)+" → "+pc.date}</span>;})}
          </div>}
          </div>;})}
        {!isDentUser&&<Btn ch="+ Registrar Pagamento" sm v="f" style={{marginTop:10}} onClick={()=>{
  var unpaidItem=(t.items||[]).find(function(it){return !it.done&&!it.paid;});
  var defaultVal=unpaidItem?String(unpaidItem.value):"";
  setPayModal(t.id);
  setPayForm({date:today(),value:defaultVal,method:"Dinheiro",inst:"1",note:""});
}}/>}
      </div>;
    })}

    {/* Orçamentos */}
    <Div lb="Orçamentos"/>
    <div style={{display:"flex",justifyContent:"flex-end"}}>{!isDentUser&&<Btn ch="+ Novo Orçamento" sm onClick={()=>{setBudgEdit(null);setBf(blankB);setBudgModal(true);}}/>}</div>
    {patBudgets.map(b=>{const tot=b.items.reduce((s,i)=>s+i.v,0)-(b.disc||0);return <div key={b.id} style={{background:G.bg,borderRadius:10,padding:"10px 13px",marginBottom:7,borderLeft:`3px solid ${BCOLOR[b.status]}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:5}}>
        <span style={{fontWeight:700,fontSize:12}}>{fmt(b.date)}</span>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <Bdg l={BSTATUS[b.status]} col={BCOLOR[b.status]} sm/><span style={{fontWeight:700,color:G.primary}}>{cur(tot)}</span>
          {b.attach&&<Bdg l={`📎 ${b.attach}`} col={G.blue} sm/>}
          <Btn ch="📄 PDF" sm onClick={()=>{setPdfBudget(b);setPayCfg(defPayCfg());}}/>
          <Btn ch="📱" v="w" sm onClick={()=>wa(pat.phone,`Olá ${pat.name}! Orçamento:\n${b.items.map(i=>`• ${i.d}: ${cur(i.v)}`).join("\n")}\nTotal: ${cur(tot)}`)}/> 
          {b.status==="approved"&&!isDentUser&&<Btn ch="📝 Contrato" sm onClick={()=>{var mets=[];(patTreats||[]).forEach(function(t){(t.payments||[]).forEach(function(pg){if(pg.method&&mets.indexOf(pg.method)<0)mets.push(pg.method);});});setCtrPag(mets.length?mets.join(" / "):"");setCtrDent((b.dentistId!=null?b.dentistId:(dents&&dents[0]&&dents[0].id))||null);setCtrDone(null);setCtrErr("");setCtrBudget(b);}}/>}
          {!isDentUser&&<Btn ch="Editar" v="g" sm onClick={()=>{setBudgEdit(b);setBf({...b,disc:b.disc||0});setBudgModal(true);}}/>}
          {user.level>=3&&<button onClick={()=>setDetFin({titulo:"Quem criou este orçamento?",sub:fmt(b.date)+" \u00b7 "+cur(tot),by:b._by,ts:null,verbo:"Criou o orçamento"})} title="Quem criou?" style={{background:"var(--card)",border:"1.5px solid "+G.border,borderRadius:"50%",width:24,height:24,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,lineHeight:1,boxShadow:"2px 2px 5px var(--nm-dark),-2px -2px 5px var(--nm-light)",flexShrink:0}}>{"\ud83d\udd75\ufe0f"}</button>}
        </div>
      </div>
      {b.items.map((it,i)=><div key={i} style={{fontSize:12,color:G.muted,display:"flex",justifyContent:"space-between",marginTop:2}}><span>{it.d}</span><span>{cur(it.v)}</span></div>)}
    </div>;})}
  </div>}

  {/* ── HISTÓRICO ── */}
  {tab==="imagens"&&(function(){
    var CATS=[["rx","🩻 RX / Radiografia"],["doc","📄 Documentação"],["antesdepois","✨ Antes / Depois"],["outros","📎 Outros"]];
    var CAT_L=function(k){var f=CATS.find(function(c){return c[0]===k;});return f?f[1]:k;};
    var imgs=(pat.imagens||[]).slice().sort(function(a,b){return (b.date||"").localeCompare(a.date||"");});
    var grupos={};CATS.forEach(function(c){grupos[c[0]]=[];});
    imgs.forEach(function(im){var k=im.cat||"outros";if(!grupos[k])grupos[k]=[];grupos[k].push(im);});
    // comprime imagem via canvas: max 1600px lado maior, jpeg 0.7
    var comprimir=function(file){return new Promise(function(resolve,reject){
      var reader=new FileReader();
      reader.onload=function(e){
        var img2=new Image();
        img2.onload=function(){
          var max=1600;var w=img2.width,h=img2.height;
          if(w>h&&w>max){h=Math.round(h*max/w);w=max;}
          else if(h>=w&&h>max){w=Math.round(w*max/h);h=max;}
          var cv=document.createElement("canvas");cv.width=w;cv.height=h;
          var ctx=cv.getContext("2d");ctx.drawImage(img2,0,0,w,h);
          cv.toBlob(function(blob){resolve(blob);},"image/jpeg",0.7);
        };
        img2.onerror=function(){reject(new Error("img"));};
        img2.src=e.target.result;
      };
      reader.onerror=function(){reject(new Error("read"));};
      reader.readAsDataURL(file);
    });};
    var subirArquivo=async function(blob){
      var nome=pat.id+"_"+Date.now()+".jpg";
      var path="pac"+pat.id+"/"+nome;
      var r=await fetch(SUPA_URL+"/storage/v1/object/imagens/"+path,{
        method:"POST",
        headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok(),"Content-Type":"image/jpeg","x-upsert":"true"},
        body:blob
      });
      if(!r.ok){var t="";try{t=await r.text();}catch(e){}throw new Error("upload "+r.status+" "+t);}
      var url=SUPA_URL+"/storage/v1/object/public/imagens/"+path;
      return {url:url,path:path};
    };
    var fazerUpload=async function(file){
      if(!file)return;
      setImgBusy(true);setImgErr("");
      try{
        var blob=await comprimir(file);
        var up=await subirArquivo(blob);
        var nova={id:Date.now(),url:up.url,path:up.path,cat:imgCat,treatId:imgTreat||"",date:today(),by:user.name,nota:imgNota||""};
        setPats(function(prev){return prev.map(function(p){return p.id===pat.id?Object.assign({},p,{imagens:(p.imagens||[]).concat([nova])}):p;});});
        setImgNota("");
      }catch(e){setImgErr("Erro ao enviar a imagem. Tente novamente. ("+((e&&e.message)||e)+")");}
      setImgBusy(false);
    };
    var removerImg=async function(im){
      if(!window.confirm("Remover esta imagem?"))return;
      try{await fetch(SUPA_URL+"/storage/v1/object/imagens/"+im.path,{method:"DELETE",headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok()}});}catch(e){}
      setPats(function(prev){return prev.map(function(p){return p.id===pat.id?Object.assign({},p,{imagens:(p.imagens||[]).filter(function(x){return x.id!==im.id;})}):p;});});
    };
    return <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <span style={{fontWeight:700,fontSize:15,color:G.primary}}>📷 Imagens e Radiografias</span>
        <span style={{fontSize:11,color:G.muted}}>{imgs.length+" imagem(ns)"}</span>
      </div>
      {/* Painel de envio */}
      <div style={{background:G.bg,borderRadius:12,padding:"13px 15px",display:"flex",flexDirection:"column",gap:11}}>
        <div style={{fontWeight:700,fontSize:13,color:G.primary}}>Adicionar nova imagem</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Categoria</label>
            <select value={imgCat} onChange={function(e){setImgCat(e.target.value);}} style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",background:"var(--surface)"}}>
              {CATS.map(function(c){return <option key={c[0]} value={c[0]}>{c[1]}</option>;})}
            </select>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Vincular a um plano (opcional)</label>
            <select value={imgTreat} onChange={function(e){setImgTreat(e.target.value);}} style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",background:"var(--surface)"}}>
              <option value="">Nenhum</option>
              {patTreats.map(function(t){return <option key={t.id} value={String(t.id)}>{t.name}</option>;})}
            </select>
          </div>
        </div>
        <Inp lb="Descrição / nota (opcional)" val={imgNota} set={setImgNota} ph="Ex: RX panorâmica inicial"/>
        {imgErr&&<div style={{background:G.red+"15",border:"1.5px solid "+G.red,borderRadius:8,padding:"8px 12px",fontSize:12,color:G.red}}>{imgErr}</div>}
        <label style={{background:imgBusy?"var(--muted)":G.primary,color:"#fff",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,cursor:imgBusy?"default":"pointer",textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          {imgBusy?"⏳ Enviando...":"📷 Escolher imagem / tirar foto"}
          <input type="file" accept="image/*" disabled={imgBusy} onChange={function(e){var f=e.target.files&&e.target.files[0];e.target.value="";fazerUpload(f);}} style={{display:"none"}}/>
        </label>
        <div style={{fontSize:11,color:G.muted,textAlign:"center"}}>A imagem é compactada automaticamente antes de salvar (economiza espaço).</div>
      </div>
      {/* Galeria por categoria */}
      {imgs.length===0&&<div style={{background:G.card,borderRadius:10,padding:24,textAlign:"center",color:G.muted,fontSize:13}}>Nenhuma imagem ainda</div>}
      {CATS.map(function(c){
        var lista=grupos[c[0]]||[];
        if(lista.length===0)return null;
        return <div key={c[0]} style={{background:G.card,borderRadius:12,padding:"12px 14px",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
          <div style={{fontWeight:700,fontSize:13,color:G.primary,marginBottom:10}}>{c[1]+" ("+lista.length+")"}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(96px,1fr))",gap:9}}>
            {lista.map(function(im){
              var tName=im.treatId?(patTreats.find(function(t){return String(t.id)===String(im.treatId);})||{}).name:"";
              return <div key={im.id} style={{position:"relative"}}>
                <img src={im.url} alt="" onClick={function(){setImgView(im);}} style={{width:"100%",height:96,objectFit:"cover",borderRadius:9,border:"1.5px solid "+G.border,cursor:"pointer"}}/>
                <button onClick={function(){removerImg(im);}} style={{position:"absolute",top:3,right:3,background:"rgba(192,57,43,.92)",color:"#fff",border:"none",borderRadius:"50%",width:22,height:22,fontSize:13,fontWeight:700,cursor:"pointer",lineHeight:1}}>×</button>
                {(im.nota||tName)&&<div style={{fontSize:9,color:G.muted,marginTop:2,lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{im.nota||tName}</div>}
                <div style={{fontSize:8,color:G.muted}}>{fmt(im.date)}</div>
              </div>;
            })}
          </div>
        </div>;
      })}
      {/* Visualizador ampliado */}
      {imgView&&<div onClick={function(){setImgView(null);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:4000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16}}>
        <img src={imgView.url} alt="" style={{maxWidth:"100%",maxHeight:"80vh",borderRadius:8,boxShadow:"0 8px 40px rgba(0,0,0,.5)"}}/>
        <div style={{color:"#fff",marginTop:12,textAlign:"center",fontSize:13}}>
          {(imgView.nota||"")+(imgView.nota?" · ":"")+CAT_L(imgView.cat)+" · "+fmt(imgView.date)+(imgView.by?" · "+imgView.by:"")}
        </div>
        <button onClick={function(){setImgView(null);}} style={{marginTop:16,background:"var(--surface)",color:"var(--text)",border:"none",borderRadius:10,padding:"10px 24px",fontSize:14,fontWeight:700,cursor:"pointer"}}>Fechar</button>
      </div>}
    </div>;
  })()}

  {tab==="historico"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
      <span style={{fontWeight:700,fontSize:15,color:G.primary}}>📅 Histórico de Atendimentos</span>
      <Btn ch="+ Registrar Atendimento" sm onClick={()=>{setRecEdit(null);setRf(blankR);setRecModal(true);}}/>
    </div>
    {(function(){
      var td=today();
      var prox=patAppts.filter(function(a){return a.date>=td&&a.status!=="cancelled"&&a.status!=="missed"&&a.status!=="rescheduled"&&a.status!=="done";}).sort(function(a,b){return (a.date+(a.time||"")).localeCompare(b.date+(b.time||""));})[0];
      var dp=prox?(dents.find(function(x){return x.id===prox.dentistId;})||dents[0]):null;
      var actTreat=treats.filter(function(tt){return tt.patientId===pat.id&&(tt.items||[]).some(function(it){return !(it.done||it.paid);});}).sort(function(a,b){return (b.start||"").localeCompare(a.start||"");})[0];
      var since=actTreat?actTreat.start:null;
      var scoped=since?patAppts.filter(function(a){return a.date>=since;}):patAppts;
      var compareceu=scoped.filter(function(a){return a.status==="done"||(a.status==="confirmed"&&a.date<td);}).length;
      var faltou=scoped.filter(function(a){return a.status==="missed";}).length;
      var desmarc=scoped.filter(function(a){return a.status==="cancelled"||a.status==="rescheduled";}).length;
      return <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {prox
          ?<div style={{background:G.primary,borderRadius:12,padding:"12px 15px",color:"#fff",boxShadow:"0 3px 12px rgba(27,94,74,.35)"}}>
            <div style={{fontSize:11,fontWeight:700,opacity:.85,textTransform:"uppercase",letterSpacing:".5px",marginBottom:3}}>📅 Próxima consulta</div>
            <div style={{fontSize:21,fontWeight:700,fontFamily:"'Cormorant Garamond'",lineHeight:1.1}}>{fmt(prox.date)} às {prox.time}</div>
            <div style={{fontSize:12,opacity:.92,marginTop:3}}>{(prox.procedureCustom||prox.procedure||"Consulta")+(dp?" · "+dp.name:"")} · {SL[prox.status]}</div>
          </div>
          :<div style={{background:G.yellow+"18",border:"1.5px solid "+G.yellow,borderRadius:12,padding:"11px 15px"}}>
            <div style={{fontSize:13,fontWeight:700,color:G.yellow}}>📅 Sem consulta futura agendada</div>
            <div style={{fontSize:12,color:G.muted,marginTop:2}}>Este paciente não tem retorno marcado.</div>
          </div>}
        {(function(){
          var lp=patRecs.find(function(r){return Number(r.paid)>0;});
          var due=lp?retDue(pat,lp.date):null;
          var lbl=retLabel(pat,lp?lp.date:null);
          var mm=retMonths(pat);
          var chip=function(val,txt){var on=(!pat.retData&&mm===val);return <button key={txt} onClick={function(){setRet({retMeses:val,retData:""});}} style={{border:"1.5px solid "+(on?G.success:G.border),background:on?G.success:"var(--surface)",color:on?"#fff":G.text,borderRadius:20,padding:"5px 13px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{txt}</button>;};
          return <div style={{background:"var(--green-soft)",border:"1.5px solid "+G.success,borderRadius:12,padding:"11px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:11,fontWeight:700,color:G.success,textTransform:"uppercase",letterSpacing:".5px"}}>📅 Próximo Retorno</div>
                <div style={{fontSize:13,color:G.text,marginTop:2}}>{due?(<span><strong>{fmt(due)}</strong> · {lbl}{pat.retMotivo?(" · "+pat.retMotivo):""}</span>):"Sem atendimento pago registrado ainda"}</div>
              </div>
              <button onClick={function(){setRetOpen(function(v){return !v;});}} style={{border:"1.5px solid "+G.success,background:"transparent",color:G.success,borderRadius:8,padding:"6px 13px",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>{retOpen?"Fechar":"Editar"}</button>
            </div>
            {retOpen&&<div style={{display:"flex",flexDirection:"column",gap:11,marginTop:11,paddingTop:11,borderTop:"1px solid "+G.success+"55"}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",marginBottom:6}}>Prazo a partir da última consulta</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{chip(3,"3 meses")}{chip(6,"6 meses")}{chip(12,"12 meses")}</div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontSize:12,color:G.muted,fontWeight:600}}>Outro:</span>
                <input type="number" min="1" value={pat.retData?"":(pat.retMeses?String(pat.retMeses):"")} onChange={function(e){var v=e.target.value;setRet({retMeses:v?Number(v):"",retData:""});}} placeholder={String(mm)} style={{width:66,border:"1.5px solid "+G.border,borderRadius:8,padding:"6px 8px",fontSize:13,outline:"none"}}/>
                <span style={{fontSize:12,color:G.muted}}>meses</span>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontSize:12,color:G.muted,fontWeight:600}}>Ou data exata:</span>
                <input type="date" value={pat.retData||""} onChange={function(e){setRet({retData:e.target.value});}} style={{border:"1.5px solid "+(pat.retData?G.success:G.border),borderRadius:8,padding:"6px 8px",fontSize:13,outline:"none",background:"var(--surface)"}}/>
                {pat.retData?<button onClick={function(){setRet({retData:""});}} style={{border:"none",background:"none",color:G.red,fontSize:12,fontWeight:700,cursor:"pointer"}}>limpar</button>:null}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase"}}>Motivo (opcional)</label>
                <input value={pat.retMotivo||""} onChange={function(e){setRet({retMotivo:e.target.value});}} placeholder="Ex: acompanhar enxerto, controle de clareamento..." style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"7px 10px",fontSize:13,outline:"none"}}/>
              </div>
              <div style={{fontSize:11,color:G.muted,lineHeight:1.5}}>{due?("O alerta de retorno vai aparecer em "+fmt(due)+" como ("+lbl+(pat.retMotivo?(" - "+pat.retMotivo):"")+")."):("Assim que houver um atendimento pago, o retorno é calculado automaticamente ("+(pat.retData?("data fixa "+fmt(pat.retData)):(mm+" meses"))+").")}</div>
            </div>}
          </div>;
        })()}
        <div>
          <div style={{fontSize:11,color:G.muted,fontWeight:700,marginBottom:5}}>{since?("FREQUÊNCIA NO TRATAMENTO ATUAL (desde "+fmt(since)+")"):"FREQUÊNCIA (HISTÓRICO COMPLETO)"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            <div style={{background:G.success+"15",borderRadius:10,padding:"9px",textAlign:"center"}}><div style={{fontFamily:"'Cormorant Garamond'",fontSize:25,color:G.success,lineHeight:1}}>{compareceu}</div><div style={{fontSize:10,color:G.muted,fontWeight:700,marginTop:3}}>✅ Compareceu</div></div>
            <div style={{background:G.red+"15",borderRadius:10,padding:"9px",textAlign:"center"}}><div style={{fontFamily:"'Cormorant Garamond'",fontSize:25,color:G.red,lineHeight:1}}>{faltou}</div><div style={{fontSize:10,color:G.muted,fontWeight:700,marginTop:3}}>❌ Faltou</div></div>
            <div style={{background:G.muted+"22",borderRadius:10,padding:"9px",textAlign:"center"}}><div style={{fontFamily:"'Cormorant Garamond'",fontSize:25,color:G.muted,lineHeight:1}}>{desmarc}</div><div style={{fontSize:10,color:G.muted,fontWeight:700,marginTop:3}}>🔄 Desmarcou</div></div>
          </div>
        </div>
        {faltou>=3&&<div style={{background:G.red+"12",border:"1px solid "+G.red,borderRadius:8,padding:"7px 12px",fontSize:12,color:G.red,fontWeight:600}}>⚠️ Paciente faltou {faltou}x — reforce a confirmação.</div>}
      </div>;
    })()}
    {patAppts.length>0&&<>
      <Div lb="Consultas Agendadas"/>
      {patAppts.map(a=>{const d=dents.find(x=>x.id===a.dentistId)||dents[0];return <div key={a.id} style={{display:"flex",gap:9,padding:"6px 0",borderBottom:`1px solid ${G.border}`,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{fontSize:12,color:G.muted,minWidth:100}}>{fmt(a.date)} {a.time}</span>
        <span style={{flex:1,fontSize:12}}>{a.procedure}{a.treatment?` · ${a.treatment}`:""}</span>
        <span style={{fontSize:11,color:d.color,fontWeight:600}}>{d.name.split(" ")[0]}</span>
        <Bdg l={SL[a.status]} col={SC[a.status]} sm/>
      </div>;})}
    </>}
    <Div lb="Atendimentos Realizados"/>
    {patRecs.length===0&&<div style={{background:G.bg,borderRadius:10,padding:20,textAlign:"center",color:G.muted,fontSize:13}}>Nenhum atendimento registrado</div>}
    {patRecs.map(r=>{const d=dents.find(x=>x.id===r.dentistId)||dents[0];return <div key={r.id} style={{background:G.bg,borderRadius:10,padding:"11px 13px",border:`1px solid ${G.border}`,borderLeft:`4px solid ${d.color}`,marginBottom:6}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,flexWrap:"wrap",gap:5}}>
        <span style={{fontWeight:700,fontSize:13}}>{r.procedure}</span>
        <div style={{display:"flex",gap:7,alignItems:"center"}}>
          <span style={{color:G.muted,fontSize:12}}>{fmt(r.date)}</span>
          {r.paid>0&&<Bdg l={`💰 ${cur(r.paid)}`} col={G.success} sm/>}
        </div>
      </div>
      <div style={{fontSize:12,color:G.muted}}>{r.tooth&&`🦷 ${r.tooth} · `}<span style={{color:d.color}}>👨‍⚕️ {d.name}</span></div>
      {r.obs&&<div style={{fontSize:12,marginTop:4}}>{r.obs}</div>}
      {r.rx&&<div style={{fontSize:12,color:G.primary,marginTop:2}}>💊 {r.rx}</div>}
      {r.instM?.length>0&&<div style={{fontSize:11,color:G.blue,marginTop:3}}>💳 Crédito: {r.instM.map(m=>`${m.slice(5)}/${m.slice(0,4)}`).join(", ")}</div>}
      <Btn ch="Editar" v="g" sm style={{marginTop:7}} onClick={()=>{setRecEdit(r);setRf({...r,dentistId:String(r.dentistId)});setRecModal(true);}}/>
        {user.level>=3&&<Btn ch="Excluir" v="r" sm style={{marginTop:7}} onClick={()=>setConfirmDel({type:"rec",id:r.id,label:"Atendimento de "+r.procedure+" em "+fmt(r.date)})}/>}
    </div>;})}
  </div>}

  {/* ── EVOLUÇÃO CLÍNICA ── */}
  {tab==="evolucao"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
      <span style={{fontWeight:700,fontSize:15,color:G.primary}}>📝 Evolução Clínica</span>
      <Btn ch="+ Nova Anotação" sm onClick={()=>{setEvoEdit(null);setEvoF({date:today(),text:"",dentistId:String(user.dentistId||dents[0]?.id||"")});setEvoModal(true);}}/>
    </div>
    <div style={{background:G.accent,borderRadius:8,padding:"8px 12px",fontSize:12,color:G.primary}}>Registre o que foi feito em cada sessão (ex: moldagem, prova, ajuste...), mesmo quando o procedimento ainda não foi finalizado.</div>
    {patEvos.length===0&&<div style={{background:G.bg,borderRadius:10,padding:20,textAlign:"center",color:G.muted,fontSize:13}}>Nenhuma anotação de evolução</div>}
    {patEvos.map(e=>{const d=dents.find(x=>x.id===e.dentistId);return <div key={e.id} style={{background:G.bg,borderRadius:10,padding:"11px 13px",border:`1px solid ${G.border}`,borderLeft:`4px solid ${d?d.color:G.primary}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:5,marginBottom:4}}>
        <span style={{fontWeight:700,fontSize:13,color:G.primary}}>📅 {fmt(e.date)}</span>
        {d&&<span style={{fontSize:11,color:d.color,fontWeight:600}}>👨‍⚕️ {d.name}</span>}
      </div>
      <div style={{fontSize:13,whiteSpace:"pre-wrap",lineHeight:1.5,color:G.text}}>{e.text}</div>
      <div style={{display:"flex",gap:6,marginTop:8}}>
        <Btn ch="✏️ Editar" v="g" sm onClick={()=>{setEvoEdit(e);setEvoF({date:e.date,text:e.text,dentistId:String(e.dentistId||"")});setEvoModal(true);}}/>
        <Btn ch="✕ Remover" v="r" sm onClick={()=>{if(window.confirm("Remover esta anotação?")){const arr=(pat.evolucoes||[]).filter(x=>x.id!==e.id);setPats(prev=>prev.map(p=>p.id===pat.id?{...p,evolucoes:arr}:p));}}}/>
      </div>
    </div>;})}
  </div>}

  {/* ── FINANCEIRO ── */}
  {tab==="financeiro"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <span style={{fontWeight:700,fontSize:15,color:G.primary}}>💰 Financeiro do Paciente</span>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:11}}>
      {[["Total Pago",cur(patPaid),G.success],["Orçamentos",patBudgets.length+" orç.",G.blue],["Atendimentos",patRecs.length+" atend.",G.primary]].map(([l,v,c])=><div key={l} style={{background:G.bg,borderRadius:10,padding:"11px 13px",textAlign:"center"}}><div style={{fontSize:10,fontWeight:700,color:G.muted}}>{l}</div><div style={{fontFamily:"'Cormorant Garamond'",fontSize:20,color:c,marginTop:3}}>{v}</div></div>)}
    </div>
    <Div lb="Pagamentos Recebidos"/>
    {patRecs.filter(r=>r.paid>0).map(r=><div key={r.id} style={{display:"flex",gap:9,padding:"6px 0",borderBottom:`1px solid ${G.border}`,flexWrap:"wrap",alignItems:"center"}}>
      <span style={{color:G.muted,fontSize:12,minWidth:72}}>{fmt(r.date)}</span>
      <span style={{flex:1,fontSize:12}}>{r.procedure}</span>
      <Bdg l={r.payment} col={G.muted} sm/>
      {r.inst>1&&<Bdg l={`${r.inst}x`} col={G.blue} sm/>}
      <span style={{fontWeight:700,color:G.success,fontSize:12}}>{cur(r.paid)}</span>
      <span style={{fontSize:11,color:G.muted}}>líq: {cur(calcNet(r.paid,r.payment))}</span>
      {user.level>=3&&<button onClick={()=>setDetFin({titulo:"Quem lançou este pagamento?",sub:cur(r.paid)+" \u00b7 "+(r.payment||"")+(r.procedure?" \u00b7 "+r.procedure:"")+" \u00b7 "+fmt(r.date),by:r._by,ts:r.ts,verbo:"Lançou o pagamento"})} title="Quem lançou?" style={{background:"var(--card)",border:"1.5px solid "+G.border,borderRadius:"50%",width:24,height:24,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,lineHeight:1,boxShadow:"2px 2px 5px var(--nm-dark),-2px -2px 5px var(--nm-light)",flexShrink:0}}>{"\ud83d\udd75\ufe0f"}</button>}
      {user.level>=3&&<button onClick={()=>setConfirmDel({type:"rec",id:r.id,label:"Pagamento de "+cur(r.paid)+" em "+fmt(r.date)})} style={{background:G.red,color:"#fff",border:"none",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700,cursor:"pointer",flexShrink:0}}>Excluir</button>}
    </div>)}
    <Div lb="Pagamentos de Planos de Tratamento"/>
    {patTreats.map(t=><div key={t.id}>
      <div style={{fontWeight:700,fontSize:12,marginBottom:5,color:G.primary}}>{t.name}</div>
      {(t.payments||[]).map(p=><div key={p.id} style={{display:"flex",gap:9,padding:"4px 0",borderBottom:`1px solid ${G.border}`,flexWrap:"wrap",fontSize:12}}>
        <span style={{color:G.muted,minWidth:72}}>{fmt(p.date)}</span>
        <span style={{flex:1}}>{p.method}{p.note?` · ${p.note}`:""}</span>
        <span style={{fontWeight:700,color:G.success}}>{cur(p.value)}</span>
        {user.level>=3&&<button onClick={()=>setDetFin({titulo:"Quem lançou este pagamento?",sub:cur(p.value)+" \u00b7 "+(p.method||"")+" \u00b7 "+t.name+" \u00b7 "+fmt(p.date),by:p._by,ts:null,verbo:"Lançou o pagamento"})} title="Quem lançou?" style={{background:"var(--card)",border:"1.5px solid "+G.border,borderRadius:"50%",width:24,height:24,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,lineHeight:1,boxShadow:"2px 2px 5px var(--nm-dark),-2px -2px 5px var(--nm-light)",flexShrink:0}}>{"\ud83d\udd75\ufe0f"}</button>}
      </div>)}
      {(t.payments||[]).length===0&&<p style={{fontSize:12,color:G.muted,marginBottom:6}}>Nenhum pagamento</p>}
    </div>)}
  </div>}

  {/* ── NOTA FISCAL ── */}
  {tab==="docs"&&<DocsContratos pat={pat}/>}
  {tab==="odonto3d"&&<Odonto3DTab pat={pat} setPats={setPats} setPf={setPf}/>}

  {tab==="atestado"&&(function(){
  var dentAtest=dents.find(function(d){return d.id===Number(atDentId);})||dents.find(function(d){return d.id===(user.dentistId||dents[0]&&dents[0].id);});
  var dentName=dentAtest&&dentAtest.name||"Dr. Diego Affonso";
  var dentCro="CRO "+(dentAtest&&dentAtest.cro||"SP-72.278");
  var hoje2=new Date((atData||today())+"T12:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"});
  var diasNum=Number(atDias)||1;
  var diasExtenso=["","um","dois","três","quatro","cinco","seis","sete","oito","nove","dez"];
  var diasTxt=diasNum===1?"1 (um) dia":diasNum+"("+(diasExtenso[diasNum]||diasNum)+") dias";
  var cidTxt=atCid?" (CID: "+atCid+")":"";
  var textoBase;
  if(atModo==="horas"){
  textoBase="Atesto para os devidos fins que o(a) paciente "+pat.name.toUpperCase()+", portador(a) do CPF "+(pat.cpf||"___.___.___-__")+", esteve sob meus cuidados odontológicos"+cidTxt+" no dia "+hoje2+", necessitando de afastamento de suas atividades no período das "+(atHoraIni||"00:00")+" às "+(atHoraFim||"00:00")+".";
  }else{
  textoBase="Atesto para os devidos fins que o(a) paciente "+pat.name.toUpperCase()+", portador(a) do CPF "+(pat.cpf||"___.___.___-__")+", esteve sob meus cuidados odontológicos"+cidTxt+" e necessita de afastamento de suas atividades pelo período de "+diasTxt+", a contar desta data.";
  }
  var textoFinal=atEditMode?atTextoEdit:textoBase;
  if(showAtestado){return(
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"var(--amber-soft)",overflowY:"auto",display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 16px"}}>
      <style dangerouslySetInnerHTML={{__html:"@media print{@page{size:A4 portrait;margin:0} *{-webkit-print-color-adjust:exact;print-color-adjust:exact} .no-print{display:none!important} .print-page{box-shadow:none!important;width:100%!important;padding:20mm 25mm!important;min-height:297mm!important;box-sizing:border-box!important} body,html{margin:0!important;padding:0!important}}"}}/>
      <div className="no-print" style={{display:"flex",gap:12,marginBottom:20,width:"100%",maxWidth:620}}>
        <button onClick={function(){setShowAtestado(false);}} style={{flex:1,padding:"12px",border:"1.5px solid #ccc",borderRadius:10,fontSize:14,cursor:"pointer",background:"var(--surface)"}}>{"← Voltar"}</button>
        <div style={{flex:2,display:"flex",flexDirection:"column",gap:5}}>
        <div style={{background:"var(--amber-soft)",border:"1px solid #FF9800",borderRadius:7,padding:"6px 9px",fontSize:10,color:"#E65100",fontWeight:700}}>{"⚙️ Na janela de impressão: desmarque Cabeçalhos e rodapés"}</div>
        <button onClick={function(){
  var ha="<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width'><style>";
  ha+="@page{size:A4 portrait;margin:15mm 20mm} @page{-webkit-print-color-adjust:exact} head{display:none}";
  ha+="*{box-sizing:border-box;margin:0;padding:0}";
  ha+="body{font-family:Georgia,serif;color:#222;background:#fff;-webkit-print-color-adjust:exact}";
  ha+="a,a:link{display:none!important}";
  ha+=".page{width:100%;min-height:227mm;display:flex;flex-direction:column}";
  ha+=".header{text-align:center;margin-bottom:20px}";
  ha+=".header h1{font-size:13pt;letter-spacing:4px;color:#8B6914;text-transform:uppercase;font-weight:normal;margin-bottom:4px}";
  ha+=".header h2{font-size:9pt;letter-spacing:3px;color:#999;text-transform:uppercase;font-weight:normal}";
  ha+=".header hr{border:none;border-top:1.5px solid #C9A84C;margin:10px 0}";
  ha+=".title{font-size:15pt;font-weight:700;text-align:center;letter-spacing:2px;text-transform:uppercase;margin-bottom:28px;color:var(--primary)}";
  ha+=".body-txt{font-size:12pt;line-height:1.9;text-align:justify;margin-bottom:20px}";
  ha+=".obs{font-size:11pt;line-height:1.7;color:#555;font-style:italic;margin-bottom:20px}";
  ha+=".date{font-size:11pt;color:#555;margin-bottom:40px}";
  ha+=".footer{margin-top:auto;text-align:center;padding-top:60px;border-top:1.5px solid #C9A84C}";
  ha+=".footer .ln{width:200px;border-top:1px solid #333;margin:0 auto 8px}";
  ha+=".footer .nm{font-size:14pt;font-weight:700;color:#222}";
  ha+=".footer .cr{font-size:11pt;color:#888;margin-top:4px}";
  ha+=".footer .ad{font-size:9pt;color:#aaa;margin-top:6px}";
  ha+="</style></head><body><div class='page'>";
  ha+="<div class='header'><h1>Affonso Odontologia</h1><h2>Clinica Especializada</h2><hr/></div>";
  ha+="<div class='title'>Atestado Odontologico</div>";
  ha+="<div class='body-txt'>"+textoFinal+"</div>";
  if(atObs)ha+="<div class='obs'>Observacoes: "+atObs+"</div>";
  ha+="<div class='date'>Sao Paulo, "+hoje2+"</div>";
  ha+="<div class='footer'><div class='ln'></div><div class='nm'>"+dentName+"</div><div class='cr'>"+dentCro+"</div><div class='ad'>Rua Sabbado D Angelo, 1980 - Itaquera | Tel. 2524-9975</div></div>";
  ha+="</div></body></html>";
  var blob=new Blob([ha],{type:"text/html"});
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");
  a.href=url;a.target="_blank";a.rel="noreferrer";
  document.body.appendChild(a);a.click();
  setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},1000);
}} style={{width:"100%",padding:"12px",background:G.primary,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer"}}>{"🖨️ Imprimir / Salvar PDF"}</button>
        </div>
      </div>
      <div className="print-page" style={{background:"var(--card)",width:"100%",maxWidth:620,padding:"32px 40px",borderRadius:4,boxShadow:"0 2px 20px rgba(0,0,0,.1)",minHeight:800,display:"flex",flexDirection:"column"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:13,letterSpacing:4,color:"#8B6914",textTransform:"uppercase",marginBottom:4}}>Affonso Odontologia</div>
          <div style={{fontSize:9,letterSpacing:3,color:"var(--muted)",textTransform:"uppercase"}}>Clínica Especializada</div>
          <hr style={{border:"none",borderTop:"1.5px solid #C9A84C",margin:"10px 0"}}/>
        </div>
        <div style={{fontSize:16,fontWeight:700,textAlign:"center",letterSpacing:2,textTransform:"uppercase",marginBottom:28,color:"var(--primary)"}}>Atestado Odontológico</div>
        <div style={{fontSize:13,lineHeight:1.9,textAlign:"justify",marginBottom:20}}>{textoFinal}</div>
        {atObs&&<div style={{fontSize:12,lineHeight:1.7,color:"var(--muted)",fontStyle:"italic",marginBottom:20}}>{"Observações: "+atObs}</div>}
        <div style={{fontSize:12,color:"var(--muted)",marginBottom:40}}>{"São Paulo, "+hoje2}</div>
        <div style={{marginTop:"auto",textAlign:"center",paddingTop:30,borderTop:"1.5px solid #C9A84C"}}>
          <div style={{width:200,borderTop:"1px solid #333",margin:"0 auto 8px"}}/>
          <div style={{fontSize:15,fontWeight:700}}>{dentName}</div>
          <div style={{fontSize:12,color:"var(--muted)",marginTop:4}}>{dentCro}</div>
        </div>
      </div>
    </div>
  );}
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <span style={{fontWeight:700,fontSize:15,color:G.primary}}>{"📄 Atestado Odontológico"}</span>
    <div style={{display:"flex",gap:8}}>
      {[["dias","📅 Por Dias"],["horas","🕐 Por Horas"]].map(function(opt){return (
        <button key={opt[0]} onClick={function(){setAtModo(opt[0]);setAtEditMode(false);}}
          style={{flex:1,border:"2px solid "+(atModo===opt[0]?G.primary:G.border),background:atModo===opt[0]?G.primary:"var(--card)",color:atModo===opt[0]?"#fff":G.muted,borderRadius:10,padding:"10px 8px",fontSize:13,fontWeight:700,cursor:"pointer"}}>{opt[1]}</button>
      );})}
    </div>
    {atModo==="horas"
      ?<div style={{display:"flex",flexDirection:"column",gap:11}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Das (início)</label>
            <input type="time" value={atHoraIni} onChange={function(e){setAtHoraIni(e.target.value);setAtEditMode(false);}}
              style={{border:"1.5px solid "+G.primary,borderRadius:8,padding:"9px 12px",fontSize:16,fontWeight:700,color:G.primary,outline:"none",textAlign:"center"}}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Às (término)</label>
            <input type="time" value={atHoraFim} onChange={function(e){setAtHoraFim(e.target.value);setAtEditMode(false);}}
              style={{border:"1.5px solid "+G.primary,borderRadius:8,padding:"9px 12px",fontSize:16,fontWeight:700,color:G.primary,outline:"none",textAlign:"center"}}/>
          </div>
        </div>
        <Inp lb="Data" val={atData} set={function(v){setAtData(v);setAtEditMode(false);}} type="date"/>
      </div>
      :<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Dias de Afastamento</label>
          <input type="number" min="1" max="30" value={atDias} onChange={function(e){setAtDias(e.target.value);setAtEditMode(false);}}
            style={{border:"1.5px solid "+G.primary,borderRadius:8,padding:"9px 12px",fontSize:18,fontWeight:700,color:G.primary,outline:"none",textAlign:"center"}}/>
        </div>
        <Inp lb="Data" val={atData} set={function(v){setAtData(v);setAtEditMode(false);}} type="date"/>
      </div>
    }
    <Inp lb="CID (opcional)" val={atCid} set={function(v){setAtCid(v);setAtEditMode(false);}} ph="Ex: K08.1"/>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Texto do Atestado</label>
        <button onClick={function(){if(!atEditMode){setAtTextoEdit(textoBase);}setAtEditMode(!atEditMode);}}
          style={{background:"none",border:"1.5px solid "+G.primary,borderRadius:8,padding:"3px 10px",fontSize:11,fontWeight:700,color:G.primary,cursor:"pointer"}}>
          {atEditMode?"↩ Usar padrão":"✏️ Editar"}
        </button>
      </div>
      {!atEditMode
        ?<div style={{background:G.bg,borderRadius:8,padding:"12px 14px",fontSize:13,lineHeight:1.7,color:G.text}}>{textoBase}</div>
        :<textarea value={atTextoEdit} onChange={function(e){setAtTextoEdit(e.target.value);}} rows={5}
          style={{width:"100%",border:"1.5px solid "+G.primary,borderRadius:8,padding:"10px 12px",fontSize:13,outline:"none",resize:"vertical",fontFamily:"Georgia,serif",lineHeight:1.7}}/>
      }
    </div>
    <Txt lb="Observações adicionais (opcional)" val={atObs} set={setAtObs} rows={2}/>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Dentista responsável</label>
      <select value={atDentId} onChange={function(e){setAtDentId(e.target.value);}} style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"10px 12px",fontSize:14,outline:"none",background:"var(--surface)",color:G.text}}>
        {dents.map(function(d){return <option key={d.id} value={String(d.id)}>{d.name}</option>;})}
      </select>
      <div style={{background:G.accent,borderRadius:10,padding:"8px 14px",fontSize:12,color:G.primary,marginTop:2}}>{"👨‍⚕️ "+dentName+" · "+dentCro}</div>
    </div>
    <button onClick={function(){setShowAtestado(true);}} style={{background:G.primary,color:"#fff",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
      {"🖨️ Imprimir / Salvar PDF"}
    </button>
  </div>;
})()}

{tab==="nf"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
      <span style={{fontWeight:700,fontSize:15,color:G.primary}}>🧾 Notas Fiscais</span>
      <Btn ch="+ Nova NF" sm onClick={()=>{setNfEdit(null);setNff(blankNF);setNfModal(true);}}/>
    </div>
    {/* Summary */}
    {patNFs.length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:11}}>
      {[
        ["Total NFs",cur(patNFs.reduce((s,n)=>s+n.value,0)),G.primary],
        ["Empresa",cur(patNFs.filter(n=>n.payer==="empresa").reduce((s,n)=>s+n.value,0)),G.blue],
        ["Dentista",cur(patNFs.filter(n=>n.payer==="dentista").reduce((s,n)=>s+n.value,0)),G.purple],
      ].map(([l,v,c])=><div key={l} style={{background:G.bg,borderRadius:10,padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:10,fontWeight:700,color:G.muted}}>{l}</div><div style={{fontFamily:"'Cormorant Garamond'",fontSize:18,color:c,marginTop:2}}>{v}</div></div>)}
    </div>}
    {patNFs.length===0&&<div style={{background:G.bg,borderRadius:10,padding:20,textAlign:"center",color:G.muted,fontSize:13}}>Nenhuma nota fiscal registrada</div>}
    {patNFs.map(n=>{
      const d=dents.find(x=>x.id===n.dentistId);
      const statusC={pending:G.yellow,issued:G.success,cancelled:G.red};
      const statusL={pending:"Pendente",issued:"Emitida",cancelled:"Cancelada"};
      return <div key={n.id} style={{background:G.bg,borderRadius:12,padding:"13px 15px",border:`1px solid ${G.border}`,borderLeft:`4px solid ${n.payer==="empresa"?G.blue:G.purple}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:8}}>
          <div>
            <div style={{fontWeight:700,fontSize:14}}>{n.procedure}</div>
            <div style={{fontSize:11,color:G.muted,marginTop:2}}>{fmt(n.date)}{n.number?` · NF ${n.number}`:""}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontWeight:700,fontSize:16,color:G.primary}}>{cur(n.value)}</div>
            {n.tax>0&&<div style={{fontSize:11,color:G.muted}}>Impostos: {cur(n.tax)} · Líq: {cur(n.value-n.tax)}</div>}
          </div>
        </div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center",marginBottom:n.notes?8:0}}>
          <span style={{background:n.payer==="empresa"?G.blue+"20":G.purple+"20",color:n.payer==="empresa"?G.blue:G.purple,borderRadius:12,padding:"2px 10px",fontSize:11,fontWeight:700}}>
            {n.payer==="empresa"?"🏢 Empresa":"👨‍⚕️ Dentista"}
          </span>
          {n.payerName&&<span style={{fontSize:11,color:G.muted}}>{n.payerName}{n.payerCnpj?` · CNPJ: ${n.payerCnpj}`:""}</span>}
          {d&&<span style={{fontSize:11,color:d.color,fontWeight:600}}>👨‍⚕️ {d.name}</span>}
          <span style={{background:statusC[n.status]+"20",color:statusC[n.status],borderRadius:12,padding:"2px 10px",fontSize:11,fontWeight:700}}>{statusL[n.status]||"Pendente"}</span>
        </div>
        {n.notes&&<div style={{fontSize:12,color:G.muted,fontStyle:"italic",borderTop:`1px solid ${G.border}`,paddingTop:7,marginTop:4}}>{n.notes}</div>}
        <div style={{display:"flex",gap:6,marginTop:8}}>
          <Btn ch="✏️ Editar" v="g" sm onClick={()=>{setNfEdit(n);setNff({...n,value:String(n.value),tax:String(n.tax||""),dentistId:String(n.dentistId||"")});setNfModal(true);}}/>
          <Btn ch="✕ Remover" v="r" sm onClick={()=>{if(window.confirm("Remover NF?"))setPats(prev=>prev.map(p=>p.id===pat.id?{...p,nfs:patNFs.filter(x=>x.id!==n.id)}:p));}}/>
        </div>
      </div>;
    })}
  </div>}
</div>

  </div>
</div>

{/* Add procedure to existing plan modal */}
{confirmDesfazer&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:3200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
  <div style={{background:"var(--surface)",borderRadius:18,width:"100%",maxWidth:380,boxShadow:"0 8px 32px rgba(0,0,0,.25)"}}>
    <div style={{background:G.red,borderRadius:"18px 18px 0 0",padding:"14px 18px",display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:20}}>⚠️</span>
      <div style={{flex:1,fontWeight:700,color:"#fff",fontSize:15}}>Desfazer Baixa</div>
      <button onClick={()=>setConfirmDesfazer(null)} style={{border:"none",background:"rgba(255,255,255,.2)",borderRadius:8,color:"#fff",cursor:"pointer",padding:"5px 10px",fontSize:16}}>✕</button>
    </div>
    <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
      <p style={{fontSize:14,color:G.text,margin:0,lineHeight:1.6}}>Tem certeza que deseja desfazer esta baixa? Isso vai <strong>remover</strong> este procedimento dos recebimentos do dentista que realizou.</p>
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>setConfirmDesfazer(null)} style={{flex:1,background:"var(--surface-2)",color:"var(--muted)",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer"}}>Cancelar</button>
        <button onClick={execDesfazer} style={{flex:1,background:G.red,color:"#fff",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer"}}>✓ Confirmar</button>
      </div>
    </div>
  </div>
</div>}
{addProcModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:3100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>

  <div style={{background:G.card,borderRadius:16,width:"100%",maxWidth:480,boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${G.border}`}}>
      <span style={{fontFamily:"'Cormorant Garamond'",fontSize:20}}>Adicionar Procedimento ao Plano</span>
      <button onClick={()=>setAddProcModal(null)} style={{border:"none",background:"none",fontSize:24,cursor:"pointer",color:G.muted}}>×</button>
    </div>
    <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{background:G.accent,borderRadius:8,padding:"8px 12px",fontSize:13,color:G.primary,fontWeight:600}}>
        Plano: {treats.find(t=>t.id===addProcModal)?.name}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Procedimento</label>
        <select value={addProcForm.procId} onChange={e=>{const id=e.target.value;const pr=procs.find(p=>String(p.id)===id);setAddProcForm(f=>({...f,procId:id,v:pr?String(pr.price):f.v}));}} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",background:"var(--surface)"}}>
          <option value="">Selecione da lista...</option>
          {[...procs].sort((a,b)=>(a.name||"").localeCompare(b.name||"","pt")).map(p=><option key={p.id} value={String(p.id)}>{p.name} -- {cur(p.price)}</option>)}
        </select>
      </div>
      <Inp lb="✏️ Ou escreva o procedimento (tem prioridade)" val={addProcForm.manual||""} set={v=>setAddProcForm(f=>({...f,manual:v}))} ph="Ex: Clareamento a laser"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
        <Inp lb="Detalhe (opcional)" val={addProcForm.d} set={v=>setAddProcForm(f=>({...f,d:v}))} ph="Ex: dente 36"/>
        <Inp lb="Valor (R$)" val={addProcForm.v} set={v=>setAddProcForm(f=>({...f,v:v}))} type="number" ph="0,00"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"120px 1fr",gap:11,alignItems:"center"}}>
        <Inp lb="Quantidade" val={addProcForm.qty==null?"":String(addProcForm.qty)} set={v=>setAddProcForm(f=>({...f,qty:v===""?"":Number(v)}))} type="number" min="1" max="20" ph="1"/>
        {Number(addProcForm.qty||1)>1&&<div style={{background:G.accent,borderRadius:8,padding:"8px 12px",fontSize:12,color:G.primary,marginTop:18}}>{"✚ Serão adicionados "+addProcForm.qty+" itens"}</div>}
      </div>
      <div style={{display:"flex",gap:9,justifyContent:"flex-end",paddingTop:12,borderTop:`1px solid ${G.border}`}}>
        <button onClick={()=>setAddProcModal(null)} style={{border:`1.5px solid ${G.primary}`,background:"transparent",color:G.primary,borderRadius:8,padding:"8px 16px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
        <button onClick={saveAddProc} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:14,fontWeight:700,cursor:"pointer"}}>➕ Adicionar</button>
      </div>
    </div>
  </div>
</div>}

{editPlan&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:3100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
  <div style={{background:G.card,borderRadius:16,width:"100%",maxWidth:460,boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${G.border}`}}>
      <span style={{fontFamily:"'Cormorant Garamond'",fontSize:20}}>Editar Plano de Tratamento</span>
      <button onClick={()=>setEditPlan(null)} style={{border:"none",background:"none",fontSize:24,cursor:"pointer",color:G.muted}}>×</button>
    </div>
    <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
      <Inp lb="Nome do Plano" val={editPlan.name} set={v=>setEditPlan(p=>({...p,name:v}))} ph="Ex: Reabilitacao oral"/>
      <Inp lb="Data de Inicio" val={editPlan.start} set={v=>setEditPlan(p=>({...p,start:v}))} type="date"/>
      <div style={{display:"flex",gap:9,justifyContent:"flex-end",paddingTop:12,borderTop:`1px solid ${G.border}`}}>
        <button onClick={()=>setEditPlan(null)} style={{border:`1.5px solid ${G.primary}`,background:"transparent",color:G.primary,borderRadius:8,padding:"8px 16px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
        <button onClick={()=>{if(!editPlan.name||!editPlan.name.trim()){alert("Informe o nome do plano");return;}if(!editPlan.start){alert("Informe a data de inicio");return;}setTreats(prev=>prev.map(x=>x.id!==editPlan.id?x:{...x,_ts:Date.now(),name:editPlan.name.trim(),start:editPlan.start}));setEditPlan(null);}} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:14,fontWeight:700,cursor:"pointer"}}>💾 Salvar</button>
      </div>
    </div>
  </div>
</div>}

{/* Orçamento PDF Premium — modal de condições de pagamento */}
{pdfBudget&&(function(){
var subtotal=pdfBudget.items.reduce(function(s,i){return s+i.v;},0);
var desc0=pdfBudget.disc||0;
var tot=subtotal-desc0;
return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
  <div style={{background:G.card,borderRadius:16,width:"100%",maxWidth:540,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${G.border}`}}>
      <span style={{fontFamily:"'Cormorant Garamond'",fontSize:20}}>Enviar Orçamento — {pat.name}</span>
      <button onClick={()=>setPdfBudget(null)} style={{border:"none",background:"none",fontSize:24,cursor:"pointer",color:G.muted}}>×</button>
    </div>
    <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{background:G.accent,borderRadius:8,padding:"9px 13px",fontSize:13,color:G.primary}}>Valor do tratamento: <strong>{cur(tot)}</strong>{desc0>0?` (já com desconto de ${cur(desc0)})`:""}</div>
      <div style={{fontWeight:700,fontSize:13,color:G.primary}}>💳 Condições de pagamento — marque o que combinou</div>

      <div style={{border:`1.5px solid ${payCfg.avista.on?G.primary:G.border}`,borderRadius:10,padding:"10px 12px",display:"flex",flexDirection:"column",gap:7}}>
        <label style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}}>
          <input type="checkbox" checked={payCfg.avista.on} onChange={e=>setPayCfg(p=>({...p,avista:{...p.avista,on:e.target.checked}}))} style={{accentColor:G.primary,width:16,height:16}}/>
          <span style={{flex:1,fontWeight:600,fontSize:13}}>À vista (PIX / Dinheiro)</span>
        </label>
        {payCfg.avista.on&&<div style={{display:"flex",alignItems:"center",gap:8,paddingLeft:25}}>
          <span style={{fontSize:12,color:G.muted}}>Desconto</span>
          <input type="number" value={payCfg.avista.desc} onChange={e=>setPayCfg(p=>({...p,avista:{...p.avista,desc:e.target.value}}))} style={{width:58,border:`1.5px solid ${G.border}`,borderRadius:7,padding:"5px 8px",fontSize:13,outline:"none"}}/>
          <span style={{fontSize:12,color:G.muted}}>% →</span><strong style={{color:G.success,fontSize:13}}>{cur(tot*(1-(Number(payCfg.avista.desc)||0)/100))}</strong>
        </div>}
      </div>

      <div style={{border:`1.5px solid ${payCfg.credito.on?G.primary:G.border}`,borderRadius:10,padding:"10px 12px",display:"flex",flexDirection:"column",gap:7}}>
        <label style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}}>
          <input type="checkbox" checked={payCfg.credito.on} onChange={e=>setPayCfg(p=>({...p,credito:{...p.credito,on:e.target.checked}}))} style={{accentColor:G.primary,width:16,height:16}}/>
          <span style={{flex:1,fontWeight:600,fontSize:13}}>Cartão de crédito</span>
        </label>
        {payCfg.credito.on&&<div style={{display:"flex",alignItems:"center",gap:8,paddingLeft:25}}>
          <span style={{fontSize:12,color:G.muted}}>Em até</span>
          <input type="number" value={payCfg.credito.parcelas} onChange={e=>setPayCfg(p=>({...p,credito:{...p.credito,parcelas:e.target.value}}))} style={{width:52,border:`1.5px solid ${G.border}`,borderRadius:7,padding:"5px 8px",fontSize:13,outline:"none"}}/>
          <span style={{fontSize:12,color:G.muted}}>x de</span><strong style={{color:G.primary,fontSize:13}}>{cur(tot/Math.max(1,Number(payCfg.credito.parcelas)||1))}</strong>
        </div>}
      </div>

      <label style={{border:`1.5px solid ${payCfg.debito.on?G.primary:G.border}`,borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"center",gap:9,cursor:"pointer"}}>
        <input type="checkbox" checked={payCfg.debito.on} onChange={e=>setPayCfg(p=>({...p,debito:{...p.debito,on:e.target.checked}}))} style={{accentColor:G.primary,width:16,height:16}}/>
        <span style={{flex:1,fontWeight:600,fontSize:13}}>Cartão de débito (à vista)</span>
        <strong style={{color:G.primary,fontSize:13}}>{cur(tot)}</strong>
      </label>

      <div style={{border:`1.5px solid ${payCfg.carne.on?G.primary:G.border}`,borderRadius:10,padding:"10px 12px",display:"flex",flexDirection:"column",gap:7}}>
        <label style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}}>
          <input type="checkbox" checked={payCfg.carne.on} onChange={e=>setPayCfg(p=>({...p,carne:{...p.carne,on:e.target.checked}}))} style={{accentColor:G.primary,width:16,height:16}}/>
          <span style={{flex:1,fontWeight:600,fontSize:13}}>Carnê próprio da clínica</span>
        </label>
        {payCfg.carne.on&&<div style={{display:"flex",alignItems:"center",gap:8,paddingLeft:25}}>
          <span style={{fontSize:12,color:G.muted}}>Em</span>
          <input type="number" value={payCfg.carne.parcelas} onChange={e=>setPayCfg(p=>({...p,carne:{...p.carne,parcelas:e.target.value}}))} style={{width:52,border:`1.5px solid ${G.border}`,borderRadius:7,padding:"5px 8px",fontSize:13,outline:"none"}}/>
          <span style={{fontSize:12,color:G.muted}}>x de</span><strong style={{color:G.primary,fontSize:13}}>{cur(tot/Math.max(1,Number(payCfg.carne.parcelas)||1))}</strong>
        </div>}
      </div>

      <div style={{border:`1.5px solid ${payCfg.custom.on?G.primary:G.border}`,borderRadius:10,padding:"10px 12px",display:"flex",flexDirection:"column",gap:7}}>
        <label style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}}>
          <input type="checkbox" checked={payCfg.custom.on} onChange={e=>setPayCfg(p=>({...p,custom:{...p.custom,on:e.target.checked}}))} style={{accentColor:G.primary,width:16,height:16}}/>
          <span style={{flex:1,fontWeight:600,fontSize:13}}>Condição personalizada</span>
        </label>
        {payCfg.custom.on&&<input value={payCfg.custom.text} onChange={e=>setPayCfg(p=>({...p,custom:{...p.custom,text:e.target.value}}))} placeholder="Ex: Entrada de R$ 300 + 4x de R$ 170" style={{marginLeft:25,border:`1.5px solid ${G.primary}`,borderRadius:7,padding:"7px 10px",fontSize:13,outline:"none"}}/>}
      </div>

      <div style={{display:"flex",gap:9,paddingTop:12,borderTop:`1px solid ${G.border}`,flexWrap:"wrap"}}>
        <button onClick={()=>setPdfBudget(null)} style={{border:`1.5px solid ${G.muted}`,background:"transparent",color:G.muted,borderRadius:8,padding:"9px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
        <button onClick={genOrcamentoPDF} style={{flex:1,minWidth:170,background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"10px 14px",fontSize:14,fontWeight:700,cursor:"pointer"}}>📄 Gerar Orçamento (PDF)</button>
        {pat.phone&&<button onClick={()=>wa(pat.phone,"Olá "+pat.name+"! 😊 Preparei o seu plano de tratamento personalizado na Affonso Odontologia. Segue em anexo o documento com os detalhes e as condições de pagamento. Qualquer dúvida, é só me chamar! 🦷")} style={{background:"#25D366",color:"#fff",border:"none",borderRadius:8,padding:"10px 14px",fontSize:14,fontWeight:700,cursor:"pointer"}}>📱 WhatsApp</button>}
      </div>
      <div style={{fontSize:11,color:G.muted,textAlign:"center"}}>Gere o PDF e salve no computador. Depois abra o WhatsApp do paciente e anexe o arquivo.</div>
    </div>
  </div>
</div>;
})()}

{/* Evolução modal */}
{evoModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
  <div style={{background:G.card,borderRadius:16,width:"100%",maxWidth:520,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${G.border}`}}>
      <span style={{fontFamily:"'Cormorant Garamond'",fontSize:20}}>{evoEdit?"Editar Anotação":"Nova Anotação de Evolução"}</span>
      <button onClick={()=>{setEvoModal(false);setEvoEdit(null);}} style={{border:"none",background:"none",fontSize:24,cursor:"pointer",color:G.muted}}>×</button>
    </div>
    <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
        <Inp lb="Data" val={evoF.date} set={v=>setEvoF(p=>({...p,date:v}))} type="date"/>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Dentista</label>
          <select value={evoF.dentistId} onChange={e=>setEvoF(p=>({...p,dentistId:e.target.value}))} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",color:G.text,background:"var(--surface)"}}>
            <option value="">Selecione...</option>
            {dents.map(d=><option key={d.id} value={String(d.id)}>{d.name}</option>)}
          </select>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>O que foi feito nesta sessão</label>
        <textarea value={evoF.text} onChange={e=>setEvoF(p=>({...p,text:e.target.value}))} rows={6} placeholder="Ex: Realizada moldagem para prótese. Próxima sessão: prova da estrutura..." style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"9px 12px",fontSize:14,outline:"none",resize:"vertical",fontFamily:"'Manrope'",lineHeight:1.5}}/>
      </div>
      <div style={{display:"flex",gap:9,justifyContent:"flex-end",paddingTop:12,borderTop:`1px solid ${G.border}`}}>
        <button onClick={()=>{setEvoModal(false);setEvoEdit(null);}} style={{border:`1.5px solid ${G.primary}`,background:"transparent",color:G.primary,borderRadius:8,padding:"8px 16px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
        <button onClick={saveEvo} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:14,fontWeight:700,cursor:"pointer"}}>💾 Salvar Anotação</button>
      </div>
    </div>
  </div>
</div>}

{/* NF modal */}
{nfModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>

  <div style={{background:G.card,borderRadius:16,width:"100%",maxWidth:580,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${G.border}`}}>
      <span style={{fontFamily:"'Cormorant Garamond'",fontSize:20}}>{nfEdit?"Editar Nota Fiscal":"Nova Nota Fiscal"}</span>
      <button onClick={()=>setNfModal(false)} style={{border:"none",background:"none",fontSize:24,cursor:"pointer",color:G.muted}}>×</button>
    </div>
    <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
        <Inp lb="Data" val={nff.date} set={v=>setNff(p=>({...p,date:v}))} type="date"/>
        <Inp lb="Nº da Nota (opcional)" val={nff.number} set={v=>setNff(p=>({...p,number:v}))} ph="NF-001"/>
      </div>
      <Inp lb="Procedimento / Descrição" val={nff.procedure} set={v=>setNff(p=>({...p,procedure:v}))} ph="Ex: Tratamento odontológico completo"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
        <Inp lb="Valor Total (R$)" val={nff.value} set={v=>setNff(p=>({...p,value:v}))} type="number" ph="0,00"/>
        <Inp lb="Impostos / ISS (R$)" val={nff.tax} set={v=>setNff(p=>({...p,tax:v}))} type="number" ph="0,00"/>
      </div>
      {Number(nff.value)>0&&Number(nff.tax)>0&&<div style={{background:G.accent,borderRadius:8,padding:"7px 12px",fontSize:13}}>Valor Líquido: <strong>{cur(Number(nff.value)-Number(nff.tax))}</strong></div>}
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Responsável pela NF</label>
        <div style={{display:"flex",gap:8}}>
          {[["empresa","🏢 Empresa"],["dentista","👨‍⚕️ Dentista"]].map(([v,l])=><button key={v} onClick={()=>setNff(p=>({...p,payer:v}))} style={{flex:1,border:`2px solid ${nff.payer===v?G.primary:G.border}`,background:nff.payer===v?G.primary:"var(--card)",color:nff.payer===v?"#fff":G.muted,borderRadius:8,padding:"9px 14px",fontSize:13,fontWeight:700,cursor:"pointer"}}>{l}</button>)}
        </div>
      </div>
      {nff.payer==="empresa"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
        <Inp lb="Nome da Empresa" val={nff.payerName} set={v=>setNff(p=>({...p,payerName:v}))} ph="Razão Social"/>
        <Inp lb="CNPJ" val={nff.payerCnpj} set={v=>setNff(p=>({...p,payerCnpj:v}))} ph="00.000.000/0001-00"/>
      </div>}
      {nff.payer==="dentista"&&<div style={{display:"flex",flexDirection:"column",gap:4}}>
        <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Dentista Responsável</label>
        <select value={nff.dentistId} onChange={e=>setNff(p=>({...p,dentistId:e.target.value}))} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",background:"var(--surface)"}}>
          <option value="">Selecione...</option>
          {dents.map(d=><option key={d.id} value={String(d.id)}>{d.name}</option>)}
        </select>
      </div>}
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Status</label>
        <select value={nff.status} onChange={e=>setNff(p=>({...p,status:e.target.value}))} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",background:"var(--surface)"}}>
          <option value="pending">Pendente</option>
          <option value="issued">Emitida</option>
          <option value="cancelled">Cancelada</option>
        </select>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Observações (pagamento, convênio, parcelamento...)</label>
        <textarea value={nff.notes} onChange={e=>setNff(p=>({...p,notes:e.target.value}))} rows={4} placeholder="Descreva detalhes sobre o pagamento, convênio, responsável financeiro, etc..." style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:13,outline:"none",resize:"vertical",fontFamily:"'Manrope'"}}/>
      </div>
      <div style={{display:"flex",gap:9,justifyContent:"flex-end",paddingTop:12,borderTop:`1px solid ${G.border}`}}>
        <button onClick={()=>setNfModal(false)} style={{border:`1.5px solid ${G.primary}`,background:"transparent",color:G.primary,borderRadius:8,padding:"8px 16px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
        <button onClick={saveNF} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:14,fontWeight:700,cursor:"pointer"}}>💾 Salvar NF</button>
      </div>
    </div>
  </div>
</div>}

{recModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>

  <div style={{background:G.card,borderRadius:16,width:"100%",maxWidth:580,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${G.border}`}}>
      <span style={{fontFamily:"'Cormorant Garamond'",fontSize:20}}>{recEdit?"Editar Atendimento":"Registrar Atendimento"}</span>
      <button onClick={()=>setRecModal(false)} style={{border:"none",background:"none",fontSize:24,cursor:"pointer",color:G.muted}}>×</button>
    </div>
    <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
        <Inp lb="Data" val={rf.date} set={upR("date")} type="date"/>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Procedimento</label>
          <select value={rf.procedure} onChange={e=>upR("procedure")(e.target.value)} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",color:G.text,background:"var(--surface)"}}>
            <option value="">Selecione...</option>
            {[...procs].sort((a,b)=>(a.name||"").localeCompare(b.name||"","pt")).map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
        <Inp lb="Dente(s)" val={rf.tooth} set={upR("tooth")} ph="Ex: 36"/>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Dentista</label>
          <select value={String(rf.dentistId)} onChange={e=>upR("dentistId")(e.target.value)} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",color:G.text,background:"var(--surface)"}}>
            {dents.map(d=><option key={d.id} value={String(d.id)}>{d.name}</option>)}
          </select>
        </div>
      </div>
      <Txt lb="Observações Clínicas" val={rf.obs} set={upR("obs")} rows={2}/>
      <Inp lb="Prescrição / Receita" val={rf.rx} set={upR("rx")} ph="Ex: Amoxicilina 500mg"/>
      <Div lb="Baixa Financeira"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
        <Inp lb="Valor Recebido (R$)" val={String(rf.paid||"")} set={upR("paid")} type="number" ph="0,00"/>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Pagamento</label>
          <select value={rf.payment} onChange={e=>upR("payment")(e.target.value)} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",color:G.text,background:"var(--surface)"}}>
            <optgroup label="-- Clínica --">
              {PAY_BASE.map(function(o){return <option key={o} value={o}>{o}</option>;})}
            </optgroup>
            <optgroup label="-- Direto ao Dentista --">
              {dents.map(function(d){var sn=dentShortName(d);return [
                <option key={"pix"+d.id} value={"Pix "+sn}>{"💚 Pix "+sn}</option>,
                <option key={"card"+d.id} value={"Cartão "+sn}>{"💳 Cartão "+sn}</option>
              ];})}
            </optgroup>
          </select>
        </div>
      </div>
      {rf.payment==="Cartão Crédito"&&<Inp lb="Nº de Parcelas" val={String(rf.inst)} set={upR("inst")} type="number" min="1" max="24"/>}
      {rf.payment==="Cartão Crédito"&&Number(rf.inst)>1&&<div style={{background:G.accent,borderRadius:8,padding:"7px 12px",fontSize:12,color:G.blue}}>💳 Crédito futuro: {genM(rf.date,Number(rf.inst)).map(m=>`${m.slice(5)}/${m.slice(0,4)}`).join(", ")}</div>}
      {(function(){
  var dp=getDentFromPayment(rf.payment,dents);
  if(!dp)return null;
  return <div style={{background:dp.color+"15",border:"2px solid "+dp.color,borderRadius:8,padding:"7px 12px",fontSize:12,display:"flex",alignItems:"center",gap:8}}>
    <div style={{width:24,height:24,borderRadius:"50%",background:dp.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:11,flexShrink:0}}>{dp.name[0]}</div>
    <span style={{fontWeight:700,color:dp.color}}>{"Pagamento direto: "+dp.name}</span>
    <span style={{fontSize:10,color:dp.color,marginLeft:"auto"}}>Taxa 0%</span>
  </div>;
})()}
{Number(rf.paid)>0&&<div style={{background:G.accent,borderRadius:8,padding:"7px 12px",fontSize:13}}>Valor líquido: <strong>{cur(calcNet(Number(rf.paid),rf.payment))}</strong>{rf.payment==="Cartão Crédito"&&<span style={{color:G.red}}> (-3,5%)</span>}{rf.payment==="Cartão Débito"&&<span style={{color:G.red}}> (-2%)</span>}</div>}
      <label style={{display:"flex",alignItems:"center",gap:9,fontSize:13,cursor:"pointer",background:rf.closed?G.success+"15":G.bg,borderRadius:8,padding:"9px 12px",border:`1.5px solid ${rf.closed?G.success:G.border}`}}>
        <input type="checkbox" checked={rf.closed} onChange={e=>upR("closed")(e.target.checked)} style={{accentColor:G.success,width:16,height:16}}/>
        <strong style={{color:rf.closed?G.success:G.text}}>✓ Confirmar baixa financeira</strong>
      </label>
      <div style={{display:"flex",gap:9,justifyContent:"flex-end",marginTop:6,paddingTop:12,borderTop:`1px solid ${G.border}`}}>
        <button onClick={()=>setRecModal(false)} style={{border:`1.5px solid ${G.primary}`,background:"transparent",color:G.primary,borderRadius:8,padding:"8px 16px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
        <button onClick={saveRec} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:14,fontWeight:700,cursor:"pointer"}}>Salvar Atendimento</button>
      </div>
    </div>
  </div>
</div>}

{/* Treatment modal - inline to fix state closure issue */}
{ortoModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
  <div style={{background:G.card,borderRadius:16,width:"100%",maxWidth:520,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
    <div style={{background:G.primary,borderRadius:"16px 16px 0 0",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontWeight:700,color:"#fff",fontSize:16}}>{"🦷 Plano Ortodôntico"}</span>
      <button onClick={()=>setOrtoModal(false)} style={{border:"none",background:"rgba(255,255,255,.2)",borderRadius:8,color:"#fff",cursor:"pointer",padding:"5px 10px",fontSize:16}}>{"x"}</button>
    </div>
    <div style={{padding:18,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{background:G.accent,borderRadius:8,padding:"9px 13px",fontSize:12,color:G.primary}}>
        {"Informe o valor mensal e o ano. O sistema gera automaticamente todas as parcelas mensais."}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase"}}>Valor Mensal (R$) *</label>
          <input value={ortoForm.valor} onChange={e=>setOrtoForm(p=>({...p,valor:e.target.value}))} type="number" placeholder="Ex: 150,00"
            style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"9px 11px",fontSize:14,outline:"none"}}/>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase"}}>Ano</label>
          <select value={ortoForm.ano} onChange={e=>setOrtoForm(p=>({...p,ano:Number(e.target.value)}))}
            style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"9px 11px",fontSize:14,outline:"none",background:"var(--surface)"}}>
            {[2025,2026,2027,2028].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase"}}>Ortodontista</label>
        <select value={ortoForm.dentistId} onChange={e=>setOrtoForm(p=>({...p,dentistId:e.target.value}))}
          style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"9px 11px",fontSize:14,outline:"none",background:"var(--surface)"}}>
          {dents.map(d=><option key={d.id} value={String(d.id)}>{d.name}</option>)}
        </select>
      </div>
      {ortoForm.valor&&Number(ortoForm.valor)>0&&<div style={{background:G.bg,borderRadius:10,padding:"10px 13px"}}>
        <div style={{fontSize:11,fontWeight:700,color:G.muted,marginBottom:8}}>{"PARCELAS GERADAS — "+ortoForm.ano}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
          {["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"].map((m,i)=><div key={m} style={{background:"var(--surface)",border:"1.5px solid "+G.border,borderRadius:7,padding:"6px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:12,fontWeight:600}}>{m}</span>
            <span style={{fontSize:12,color:G.primary,fontWeight:700}}>{cur(ortoForm.valor)} </span>
          </div>)}
        </div>
        <div style={{marginTop:8,fontWeight:700,color:G.primary,fontSize:13}}>{"Total anual: "+cur(Number(ortoForm.valor)*12)}</div>
      </div>}
      <div style={{display:"flex",gap:9,justifyContent:"flex-end",paddingTop:10,borderTop:"1px solid "+G.border}}>
        <button onClick={()=>setOrtoModal(false)} style={{border:"1.5px solid "+G.primary,background:"transparent",color:G.primary,borderRadius:8,padding:"8px 16px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
        <button onClick={()=>{
          if(!ortoForm.valor||Number(ortoForm.valor)<=0){alert("Informe o valor mensal");return;}
          var meses=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
          var items=meses.map(function(m,i){
            var mes=String(i+1).padStart(2,"0");
            return {desc:m+" "+ortoForm.ano,value:pmoney(ortoForm.valor),paid:false,orto:true,mesRef:ortoForm.ano+"-"+mes};
          });
          var newTreat={name:"Ortodontia "+ortoForm.ano,start:today(),items:items,payments:[],patientId:pat.id,dentistId:Number(ortoForm.dentistId)||dents[0]?.id,id:nid(treats),orto:true,ano:ortoForm.ano};
          setTreats(prev=>[...prev,{...newTreat,_ts:Date.now()}]);
          setOrtoModal(false);
        }} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:14,fontWeight:700,cursor:"pointer"}}>{"🦷 Criar Plano Orto"}</button>
      </div>
    </div>
  </div>
</div>}

{treatModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>

  <div style={{background:G.card,borderRadius:16,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${G.border}`}}>
      <span style={{fontFamily:"'Cormorant Garamond'",fontSize:20}}>Novo Plano de Tratamento</span>
      <button onClick={()=>setTreatModal(false)} style={{border:"none",background:"none",fontSize:24,cursor:"pointer",color:G.muted}}>×</button>
    </div>
    <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
      <Inp lb="Nome do Plano *" val={tf.name} set={v=>setTf(p=>({...p,name:v}))} ph="Ex: Reabilitação oral completa"/>
      <Inp lb="Data de Início" val={tf.start} set={v=>setTf(p=>({...p,start:v}))} type="date"/>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Dentista Responsável</label>
        <select value={String(tf.dentistId||"")} onChange={e=>setTf(p=>({...p,dentistId:e.target.value}))}
          style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",color:G.text,background:"var(--surface)"}}>
          {dents.map(d=><option key={d.id} value={String(d.id)}>{d.name}</option>)}
        </select>
      </div>
      <Div lb="Adicionar Procedimento"/>
      <div style={{background:G.bg,borderRadius:10,padding:"12px 14px",display:"flex",flexDirection:"column",gap:9}}>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Procedimento</label>
          <select
            value={tni.procId}
            onChange={e=>{
              const id=e.target.value;
              const pr=procs.find(p=>String(p.id)===id);
              setTni(p=>({...p, procId:id, v:pr?String(pr.price):p.v}));
            }}
            style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",color:G.text,background:"var(--surface)"}}
          >
            <option value="">Selecione da lista...</option>
            {[...procs].sort((a,b)=>(a.name||"").localeCompare(b.name||"","pt")).map(p=><option key={p.id} value={String(p.id)}>{p.name} -- {cur(p.price)}</option>)}
          </select>
        </div>
        <Inp lb="✏️ Ou escreva o procedimento (tem prioridade)" val={tni.manual||""} set={v=>setTni(p=>({...p,manual:v}))} ph="Ex: Clareamento a laser"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
          <Inp lb="Detalhe (opcional)" val={tni.d} set={v=>setTni(p=>({...p,d:v}))} ph="Ex: dente 36"/>
          <Inp lb="Valor (R$)" val={tni.v} set={v=>setTni(p=>({...p,v:v}))} type="number" ph="0,00"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"120px 1fr",gap:9,alignItems:"center"}}>
          <Inp lb="Quantidade" val={tni.qty==null?"":String(tni.qty)} set={v=>setTni(p=>({...p,qty:v===""?"":Number(v)}))} type="number" min="1" max="20" ph="1"/>
          {Number(tni.qty||1)>1&&<div style={{background:G.accent,borderRadius:8,padding:"8px 12px",fontSize:12,color:G.primary,marginTop:18}}>{"✚ Serão adicionados "+tni.qty+" itens individuais"}</div>}
        </div>
        <button
          onClick={()=>{
            const manual=(tni.manual||"").trim();
            const pr=procs.find(p=>String(p.id)===tni.procId);
            if(!manual&&!pr){alert("Selecione na lista ou escreva o procedimento");return;}
            const base=manual||pr.name;
            const det=(tni.d||"").trim();
            const nm=det?`${base} -- ${det}`:base;
            const qtd=Math.max(1,Number(tni.qty||1));
            const novos=Array.from({length:qtd},(_,i)=>({desc:qtd>1?`${nm} (${i+1}/${qtd})`:nm,value:Number(tni.v)||0,paid:false}));
            setTf(prev=>({...prev,items:[...prev.items,...novos]}));
            setTni({d:"",procId:"",v:"",qty:"",manual:""});
          }}
          style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"9px 16px",fontSize:13,fontWeight:700,cursor:"pointer",alignSelf:"flex-start"}}
        >➕ Adicionar ao Plano</button>
      </div>
      {tf.items.length>0&&<>
        <Div lb="Itens adicionados"/>
        {tf.items.map((it,i)=><div key={i} style={{display:"flex",gap:9,alignItems:"center",background:G.accent,borderRadius:8,padding:"8px 12px"}}>
          <span style={{flex:1,fontSize:13,fontWeight:600}}>{it.desc}</span>
          <span style={{fontWeight:700,color:G.primary}}>{cur(it.value)}</span>
          <button onClick={()=>setTf(p=>({...p,items:p.items.filter((_,idx)=>idx!==i)}))} style={{border:"none",background:"none",color:G.red,cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
        </div>)}
        <div style={{background:G.primary+"18",borderRadius:8,padding:"8px 12px",display:"flex",justifyContent:"space-between"}}>
          <span style={{fontWeight:700,fontSize:13}}>Total</span>
          <span style={{fontWeight:700,fontSize:14,color:G.primary}}>{cur(tf.items.reduce((s,i)=>s+i.value,0))}</span>
        </div>
      </>}
      <div style={{display:"flex",gap:9,justifyContent:"flex-end",marginTop:6,paddingTop:12,borderTop:`1px solid ${G.border}`}}>
        <button onClick={()=>setTreatModal(false)} style={{border:`1.5px solid ${G.primary}`,background:"transparent",color:G.primary,borderRadius:8,padding:"8px 16px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
        <button onClick={()=>{if(!tf.name){alert("Informe o nome do plano");return;}saveTreat();}} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:14,fontWeight:700,cursor:"pointer"}}>Salvar Plano</button>
      </div>
    </div>
  </div>
</div>}

{/* Contrato de tratamento — modal (V195) */}
{ctrBudget&&(function(){
var bC=ctrBudget;
var totalC=bC.items.reduce(function(s,i){return s+i.v;},0)-(bC.disc||0);
var dentC=(dents||[]).find(function(d){return String(d.id)===String(ctrDent);})||(dents&&dents[0])||{};
var linkC=ctrDone?contratoLink(ctrDone.token):"";
return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
  <div style={{background:G.card,borderRadius:16,width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${G.border}`}}>
      <span style={{fontFamily:"'Cormorant Garamond'",fontSize:20}}>📝 Contrato — {pat.name}</span>
      <button onClick={()=>setCtrBudget(null)} style={{border:"none",background:"none",fontSize:24,cursor:"pointer",color:G.muted}}>×</button>
    </div>
    <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
      {!ctrDone&&<>
        <div style={{background:G.bg,borderRadius:10,padding:"10px 13px"}}>
          {bC.items.map(function(it,i){return <div key={i} style={{fontSize:12.5,display:"flex",justifyContent:"space-between",padding:"2px 0"}}><span>{it.d}</span><span>{cur(it.v)}</span></div>;})}
          {(bC.disc||0)>0&&<div style={{fontSize:12.5,display:"flex",justifyContent:"space-between",color:G.red}}><span>Desconto</span><span>{"-"+cur(bC.disc)}</span></div>}
          <div style={{fontSize:13.5,display:"flex",justifyContent:"space-between",fontWeight:700,marginTop:4,color:G.primary}}><span>Total</span><span>{cur(totalC)}</span></div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Profissional responsável</label>
          <select value={ctrDent==null?"":ctrDent} onChange={e=>setCtrDent(e.target.value)} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",color:G.text,background:"var(--surface)"}}>
            {(dents||[]).map(function(d){return <option key={d.id} value={d.id}>{d.name+(d.cro?(" — CRO "+d.cro):"")}</option>;})}
          </select>
        </div>
        <Inp lb="Forma de pagamento" val={ctrPag} set={setCtrPag} ph="Ex: PIX em 3 parcelas de R$ 500,00"/>
        {ctrErr&&<div style={{background:"var(--red-soft)",color:G.red,borderRadius:8,padding:"9px 12px",fontSize:12.5,fontWeight:600}}>{ctrErr}</div>}
        <button disabled={ctrBusy} onClick={()=>{
          if(!String(ctrPag||"").trim()){setCtrErr("Informe a forma de pagamento.");return;}
          setCtrBusy(true);setCtrErr("");
          var htmlC=buildContratoHTML({pat:pat,dent:dentC,itens:bC.items,disc:bC.disc||0,formaPagamento:ctrPag,budgetDate:bC.date});
          contratoApi.createC({patientId:String(pat.id),patientName:pat.name,budgetId:String(bC.id),html:htmlC,payload:{total:totalC,totalFmt:cur(totalC),formaPagamento:ctrPag,dentista:dentC.name||""}}).then(function(r){
            setCtrBusy(false);
            if(r.ok)setCtrDone({token:r.token,html:htmlC});
            else setCtrErr(r.msg||"Não foi possível gerar o contrato. Verifique a conexão e o login.");
          });
        }} style={{background:ctrBusy?G.muted:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"11px 14px",fontSize:14,fontWeight:700,cursor:ctrBusy?"wait":"pointer"}}>{ctrBusy?"Gerando…":"📝 Gerar Contrato"}</button>
        <div style={{fontSize:11,color:G.muted}}>O contrato usa os dados do cadastro e fica registrado na aba <b>Documentos</b>. O link de assinatura vale 48 horas.</div>
      </>}
      {ctrDone&&<>
        <div style={{background:"var(--green-soft)",borderRadius:10,padding:"12px 14px",textAlign:"center"}}><div style={{fontSize:24}}>✅</div><div style={{fontWeight:700,color:G.success}}>Contrato gerado!</div><div style={{fontSize:12,color:G.muted,marginTop:3}}>Envie o link para o paciente ler e assinar pelo celular.</div></div>
        <div style={{background:"var(--green-soft)",borderRadius:10,padding:"10px 12px",fontSize:11,color:"var(--primary)",wordBreak:"break-all",fontWeight:600}}>{linkC}</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn ch="📱 Enviar para assinar" v="w" onClick={()=>{wa(pat.phone,"Olá, "+(pat.name||"")+"! 😊\n\nSegue o contrato do seu tratamento na "+CLINICA_INFO.nome+" para leitura e assinatura:\n"+linkC+"\n\nO link é pessoal e vale por 48 horas.");}}/>
          <Btn ch="👁 Visualizar" v="g" onClick={()=>{abrirContratoPrint({html:ctrDone.html,patient_name:pat.name,status:"pendente"});}}/>
          <Btn ch="📋 Copiar link" v="g" onClick={()=>{try{navigator.clipboard.writeText(linkC);}catch(e){window.prompt("Copie o link:",linkC);}}}/>
        </div>
        <button onClick={()=>setCtrBudget(null)} style={{border:`1.5px solid ${G.muted}`,background:"transparent",color:G.muted,borderRadius:8,padding:"9px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Fechar</button>
      </>}
    </div>
  </div>
</div>;})()}

{/* Budget modal - inline render to avoid state closure bug */}
{budgModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>

  <div style={{background:G.card,borderRadius:16,width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${G.border}`}}>
      <span style={{fontFamily:"'Cormorant Garamond'",fontSize:20}}>Orçamento -- {pat.name}</span>
      <button onClick={()=>setBudgModal(false)} style={{border:"none",background:"none",fontSize:24,cursor:"pointer",color:G.muted}}>×</button>
    </div>
    <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
        <Inp lb="Data" val={bf.date} set={v=>setBf(p=>({...p,date:v}))} type="date"/>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Status</label>
          <select value={bf.status} onChange={e=>setBf(p=>({...p,status:e.target.value}))} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",color:G.text,background:"var(--surface)"}}>
            <option value="pending">Em espera</option>
            <option value="approved">Aprovado</option>
            <option value="rejected">Recusado</option>
          </select>
        </div>
      </div>
      <Div lb="Itens do Orçamento"/>
      {bf.items.map((it,i)=><div key={i} style={{display:"flex",gap:7,alignItems:"center",background:G.accent,borderRadius:8,padding:"7px 12px"}}>
        <span style={{flex:1,fontSize:13}}>{it.d}</span>
        <span style={{fontWeight:700,fontSize:13}}>{cur(it.v)}</span>
        <button onClick={()=>setBf(p=>({...p,items:p.items.filter((_,idx)=>idx!==i)}))} style={{border:"none",background:"none",color:G.red,cursor:"pointer",fontSize:18}}>×</button>
      </div>)}
      <div style={{background:G.bg,borderRadius:9,padding:"10px 12px",display:"flex",flexDirection:"column",gap:8}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
          <Inp lb="Descrição" val={bni.d} set={v=>setBni(p=>({...p,d:v}))} ph="Ex: Clareamento dental"/>
          <Inp lb="Valor (R$)" val={bni.v} set={v=>setBni(p=>({...p,v:v}))} type="number" ph="0,00"/>
        </div>
        <button onClick={()=>{
          if(!bni.d){alert("Informe a descrição");return;}
          if(!bni.v||Number(bni.v)<=0){alert("Informe o valor");return;}
          setBf(p=>({...p,items:[...p.items,{d:bni.d,v:Math.round((parseFloat(String(bni.v||"0").replace(",","."))||0)*100)/100}]}));
          setBni({d:"",v:""});
        }} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"8px 15px",fontSize:13,fontWeight:700,cursor:"pointer",alignSelf:"flex-start"}}>➕ Adicionar Item</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
        <Inp lb="Desconto (R$)" val={String(bf.disc)} set={v=>setBf(p=>({...p,disc:v}))} type="number"/>
        <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
          <div style={{background:G.accent,borderRadius:8,padding:"9px 12px",fontWeight:700,color:G.primary,fontSize:15}}>
            Total: {cur(bf.items.reduce((s,i)=>s+i.v,0)-Number(bf.disc||0))}
          </div>
        </div>
      </div>
      <Inp lb="Referência Orçamento / RX" val={bf.attach} set={v=>setBf(p=>({...p,attach:v}))} ph="ORC-001"/>
      <Txt lb="Observações" val={bf.notes} set={v=>setBf(p=>({...p,notes:v}))} rows={2}/>
      <div style={{display:"flex",gap:9,justifyContent:"flex-end",marginTop:6,paddingTop:12,borderTop:`1px solid ${G.border}`}}>
        <button onClick={()=>setBudgModal(false)} style={{border:`1.5px solid ${G.primary}`,background:"transparent",color:G.primary,borderRadius:8,padding:"8px 16px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
        <button onClick={saveBudg} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:14,fontWeight:700,cursor:"pointer"}}>Salvar Orçamento</button>
      </div>
    </div>
  </div>
</div>}

{/* Confirm delete modal */}
{detFin&&(function(){ // V223: popup quem lancou (admin)
var d=detFin;
var zz=function(n){return String(n).padStart(2,"0");};
var fmtTs=function(iso){if(!iso)return "";var x=new Date(iso);if(isNaN(x))return "";return zz(x.getDate())+"/"+zz(x.getMonth()+1)+"/"+x.getFullYear()+" \u00e0s "+zz(x.getHours())+":"+zz(x.getMinutes());};
var quando=d.ts?fmtTs(d.ts):"";
return <div style={{position:"fixed",inset:0,background:"rgba(43,51,48,.45)",zIndex:3300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={function(){setDetFin(null);}}>
<div style={{background:"var(--surface)",borderRadius:16,padding:18,width:"100%",maxWidth:400}} onClick={function(e){e.stopPropagation();}}>
<div style={{fontSize:15,fontWeight:800,color:G.primary}}>{"\ud83d\udd75\ufe0f "+d.titulo}</div>
<div style={{fontSize:12,color:G.muted,margin:"2px 0 13px"}}>{d.sub}</div>
{d.by
?<div style={{borderRadius:12,padding:"13px 14px",display:"flex",gap:11,alignItems:"flex-start",background:G.accent,border:"1.5px solid "+G.primary}}>
<span style={{fontSize:24,lineHeight:1}}>{"\ud83d\udc64"}</span>
<div><div style={{fontSize:14,fontWeight:800,color:G.primary}}>{d.by}</div>
<div style={{fontSize:12,color:G.muted,marginTop:2,lineHeight:1.5}}>{(d.verbo||"Lançou")+" pelo sistema"+(quando?" em "+quando:"")+"."}</div></div>
</div>
:<div style={{borderRadius:12,padding:"13px 14px",display:"flex",gap:11,alignItems:"flex-start",background:"var(--amber-soft)",border:"1.5px solid #FFD54F"}}>
<span style={{fontSize:24,lineHeight:1}}>{"\ud83d\udcdc"}</span>
<div><div style={{fontSize:14,fontWeight:800,color:"#8a6d00"}}>{"Sem registro"}</div>
<div style={{fontSize:12,color:G.muted,marginTop:2,lineHeight:1.5}}>{"Este registro \u00e9 anterior ao V222, quando o sistema ainda n\u00e3o gravava quem lan\u00e7ou. Todos os lan\u00e7amentos novos ficam registrados."}</div></div>
</div>}
<button onClick={function(){setDetFin(null);}} style={{width:"100%",marginTop:14,border:"none",borderRadius:12,padding:12,fontSize:14,fontWeight:700,cursor:"pointer",background:G.primary,color:"#fff"}}>{"Fechar"}</button>
</div>
</div>;
})()}
{confirmDel&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:3200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>

  <div style={{background:"var(--surface)",borderRadius:16,width:"100%",maxWidth:360,boxShadow:"0 16px 48px rgba(0,0,0,.25)"}}>
    <div style={{background:G.red,borderRadius:"16px 16px 0 0",padding:"13px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <span style={{fontWeight:700,color:"#fff",fontSize:14}}>Confirmar Exclusao</span>
      <button onClick={()=>setConfirmDel(null)} style={{border:"none",background:"rgba(255,255,255,.2)",borderRadius:8,color:"#fff",cursor:"pointer",padding:"4px 9px",fontSize:16}}>X</button>
    </div>
    <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{fontSize:13,color:G.text}}>Deseja excluir:</div>
      <div style={{background:"var(--red-soft)",borderRadius:8,padding:"10px 13px",fontSize:13,fontWeight:700,color:G.red}}>{confirmDel.label}</div>
      <div style={{fontSize:12,color:G.muted}}>Esta acao nao pode ser desfeita.</div>
      <div style={{display:"flex",gap:9,justifyContent:"flex-end",paddingTop:8,borderTop:"1px solid "+G.border}}>
        <button onClick={()=>setConfirmDel(null)} style={{border:"1.5px solid "+G.primary,background:"transparent",color:G.primary,borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
        <button onClick={()=>{
          if(confirmDel.type==="rec"){
            var _dr=recs.find(function(x){return x.id===confirmDel.id;});
            setRecs(prev=>prev.filter(x=>x.id!==confirmDel.id));
            if(_dr&&_dr.fromTreat!=null){setTreats(prev=>prev.map(function(tr){return tr.id!==_dr.fromTreat?tr:Object.assign({},tr,{_ts:Date.now(),payments:(tr.payments||[]).filter(function(pp){return !(Math.abs(Number(pp.value)-Number(_dr.paid))<0.01&&pp.date===_dr.date);})});}));}
          }
          setConfirmDel(null);
        }} style={{background:G.red,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Excluir</button>
      </div>
    </div>
  </div>
</div>}

{ortoPayModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:3100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
  <div style={{background:G.card,borderRadius:16,width:"100%",maxWidth:420,boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
    <div style={{background:G.primary,borderRadius:"16px 16px 0 0",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <div style={{fontWeight:700,color:"#fff",fontSize:15}}>{"💳 Dar Baixa — Orto"}</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,.75)"}}>{treats.find(t=>t.id===ortoPayModal.tid)?.items[ortoPayModal.idx]?.desc||""}</div>
      </div>
      <button onClick={()=>{setOrtoPayModal(null);setOrtoPayVal("");}} style={{border:"none",background:"rgba(255,255,255,.2)",borderRadius:8,color:"#fff",cursor:"pointer",padding:"5px 10px",fontSize:16}}>{"x"}</button>
    </div>
    <div style={{padding:18,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Valor (R$)</label>
        <input
          type="number"
          value={ortoPayVal||String(treats.find(t=>t.id===ortoPayModal?.tid)?.items[ortoPayModal?.idx]?.value||"")}
          onChange={e=>setOrtoPayVal(e.target.value)}
          style={{border:"1.5px solid "+G.primary,borderRadius:8,padding:"9px 12px",fontSize:15,fontWeight:700,color:G.primary,outline:"none",width:"100%",boxSizing:"border-box"}}
        />
        <div style={{fontSize:11,color:G.muted}}>Valor padrão: {cur(treats.find(t=>t.id===ortoPayModal?.tid)?.items[ortoPayModal?.idx]?.value||0)}</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase"}}>Forma de Pagamento</label>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {(function(){
            var base=["PIX","Dinheiro","Cartão Crédito","Cartão Débito"];
            var pixDents=dents.map(function(d){
              var sn=(function(){var sk=["dr.","dra.","dr","dra"];var pts=d.name.split(" ");var r=pts.filter(function(p){return sk.indexOf(p.toLowerCase())<0;});return r[0]||pts[0];})();
              return "Pix "+sn;
            });
            return [...base,...pixDents].map(function(m){
              var isPix=m.startsWith("Pix ");
              return <button key={m} onClick={()=>setOrtoPayMethod(m)}
                style={{border:"2px solid "+(ortoPayMethod===m?(isPix?G.success:G.primary):G.border),background:ortoPayMethod===m?(isPix?G.success:G.primary):"var(--card)",color:ortoPayMethod===m?"#fff":(isPix?G.success:G.muted),borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{m}</button>;
            });
          })()}
        </div>
      </div>
      <div style={{display:"flex",gap:9,justifyContent:"flex-end",paddingTop:10,borderTop:"1px solid "+G.border}}>
        <button onClick={()=>{setOrtoPayModal(null);setOrtoPayVal("");}} style={{border:"1.5px solid "+G.primary,background:"transparent",color:G.primary,borderRadius:8,padding:"8px 16px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
        <button onClick={()=>{
          var tid2=ortoPayModal.tid;var idx2=ortoPayModal.idx;
          var treat2=treats.find(t=>t.id===tid2);
          if(!treat2)return;
          var item2=treat2.items[idx2];
          var finalVal=pmoney(ortoPayVal)||item2.value;
          var _recId=nid();var _pmtId=nid();
          setTreats(prev=>prev.map(t=>t.id!==tid2?t:{...t,_ts:Date.now(),items:t.items.map((it,i)=>i!==idx2?it:{...it,done:true,doneDate:today(),doneBy:user.name,doneByDentistId:user.dentistId||null,payMethod:ortoPayMethod,value:finalVal,recId:_recId,pmtId:_pmtId,_dts:Date.now()})}));
          var recObj={id:_recId,patientId:pat.id,dentistId:treat2.dentistId||dents[0]?.id||1,procedure:item2.desc,date:today(),paid:finalVal,payment:ortoPayMethod,inst:1,fromTreat:tid2,ts:new Date().toISOString(),_by:(user&&user.name)||""};
          setRecs(prev=>[...prev,recObj]);
          // Also register in treat.payments so it shows in pagamentos registrados
          var newPmt={id:_pmtId,date:today(),value:finalVal,method:ortoPayMethod,note:item2.desc,_b:1,_by:(user&&user.name)||""};
          setTreats(prev=>prev.map(t=>t.id!==tid2?t:{...t,_ts:Date.now(),payments:[...(t.payments||[]),newPmt]}));
          setOrtoPayModal(null);setOrtoPayVal("");
        }} style={{background:G.success,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:14,fontWeight:700,cursor:"pointer"}}>{"✓ Confirmar"}</button>
      </div>
    </div>
  </div>
</div>}

{/* Payment modal - inline render to avoid state closure bug */}
{!!payModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>

  <div style={{background:G.card,borderRadius:16,width:"100%",maxWidth:460,boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${G.border}`}}>
      <span style={{fontFamily:"'Cormorant Garamond'",fontSize:20}}>Registrar Pagamento</span>
      <button onClick={()=>setPayModal(null)} style={{border:"none",background:"none",fontSize:24,cursor:"pointer",color:G.muted}}>×</button>
    </div>
    <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
        <Inp lb="Data" val={payForm.date} set={v=>setPayForm(p=>({...p,date:v}))} type="date"/>
        <Inp lb="Valor (R$)" val={payForm.value} set={v=>setPayForm(p=>({...p,value:v}))} type="number" ph="0,00"/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Forma de Pagamento</label>
        <select value={payForm.method} onChange={e=>setPayForm(p=>({...p,method:e.target.value}))} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",color:G.text,background:"var(--surface)"}}>
          <option value="">Selecione...</option>
          <optgroup label="-- Clínica --">
            {PAY_BASE.map(function(o){return <option key={o} value={o}>{o}</option>;})}
          </optgroup>
          <optgroup label="-- Direto ao Dentista --">
            {dents.map(function(d){var sn=dentShortName(d);return [
              <option key={"pix"+d.id} value={"Pix "+sn}>💚 Pix {sn}</option>,
              <option key={"card"+d.id} value={"Cartão "+sn}>💳 Cartão {sn}</option>
            ];})}
          </optgroup>
        </select>
      </div>
      {(function(){
  var dp=getDentFromPayment(payForm.method,dents);
  if(!dp)return null;
  return <div style={{background:dp.color+"15",border:"2px solid "+dp.color,borderRadius:8,padding:"7px 12px",fontSize:12,display:"flex",alignItems:"center",gap:8}}>
    <div style={{width:24,height:24,borderRadius:"50%",background:dp.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:11,flexShrink:0}}>{dp.name[0]}</div>
    <span style={{fontWeight:700,color:dp.color}}>{"Pagamento direto: "+dp.name}</span>
    <span style={{fontSize:10,color:dp.color,marginLeft:"auto"}}>Taxa 0%</span>
  </div>;
})()}
{(payForm.method==="Cartão Crédito"||payForm.method==="Cartão Débito")&&Number(payForm.value)>0&&(
        <div style={{background:G.accent,borderRadius:8,padding:"8px 12px",fontSize:13,color:G.blue}}>
          💳 Valor líquido: <strong>{cur(calcNet(Number(payForm.value),payForm.method))}</strong>
          <span style={{color:G.muted}}>{payForm.method==="Cartão Crédito"?" (-3,5%)":" (-2%)"}</span>
        </div>
      )}
      {payForm.method==="Cartão Crédito"&&<Sel lb="Número de Parcelas" val={payForm.inst||"1"} set={v=>setPayForm(p=>({...p,inst:v}))} opts={["1","2","3","4","5","6","7","8","9","10","11","12"].map(v=>({v,l:v+"x"}))}/> }
      <Inp lb="Observação" val={payForm.note} set={v=>setPayForm(p=>({...p,note:v}))} ph="Ex: parcial, complemento..."/>
      <div style={{display:"flex",gap:9,justifyContent:"flex-end",marginTop:6,paddingTop:12,borderTop:`1px solid ${G.border}`}}>
        <button onClick={()=>setPayModal(null)} style={{border:`1.5px solid ${G.primary}`,background:"transparent",color:G.primary,borderRadius:8,padding:"8px 16px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
        <button onClick={()=>{
          if(!payForm.value||Number(payForm.value)<=0){alert("Informe o valor");return;}
          addPayment(payModal);
        }} style={{background:G.success,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:14,fontWeight:700,cursor:"pointer"}}>✓ Registrar Pagamento</button>
      </div>
    </div>
  </div>
</div>}

</>;
}

// ══════════════════════════════════════════════════════════
// AGENDA
// ══════════════════════════════════════════════════════════
function Agenda({appts,setAppts,pats,setPats,dents,procs,user,addLog,recs,setRecs,treats,setTreats,budgets,setBudgets,waEvent,espera,logs}){

const [selDate,setSelDate]=useState(today());
const [agView,setAgView]=useState("dia");
const [agZoom,setAgZoom]=useState(1);
const [agViewMode,setAgViewMode]=useState(function(){try{return localStorage.getItem("agenda_view_mode")||"normal";}catch(e){return "normal";}});
const [openFolder,setOpenFolder]=useState(null);
const [showCal,setShowCal]=useState(false);
const [calY,setCalY]=useState(new Date().getFullYear());
const [calM,setCalM]=useState(new Date().getMonth());
const [denF,setDenF]=useState("all");
const [modal,setModal]=useState(false);
const [viewA,setViewA]=useState(null);const [showCancel,setShowCancel]=useState(null);const [histTab,setHistTab]=useState("info");
const [detetive,setDetetive]=useState(null); // V222: popup quem cancelou
const [edit,setEdit]=useState(null);
const blank={patientId:"",patientName:"",useManual:false,dentistId:user.dentistId||dents[0]?.id||1,date:selDate,time:"",timeCustom:"",procedure:"",procedureCustom:"",treatment:"",status:"pending",notes:"",value:"",payment:"Dinheiro",duration:30,blocked:false,blockReason:""};
const [f,setF]=useState(blank);
const upd=k=>v=>setF(p=>({...p,[k]:v}));
const [blockModal,setBlockModal]=useState(null); // {date,time,dentistId}
const [blockReason,setBlockReason]=useState("");
const isDent=user.level===1;
const td=today();
const DAY=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const MONTHS=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const getWeek=ds=>{
const d=new Date(ds+"T12:00");
const diff=d.getDay()===0?-6:1-d.getDay();
const mon=new Date(d);mon.setDate(d.getDate()+diff);
return Array.from({length:7},(_,i)=>{const x=new Date(mon);x.setDate(mon.getDate()+i);return x.toISOString().split("T")[0];});
};
const week=getWeek(selDate);
const prevW=()=>{const d=new Date(week[0]+"T12:00");d.setDate(d.getDate()-7);setSelDate(d.toISOString().split("T")[0]);};
const nextW=()=>{const d=new Date(week[6]+"T12:00");d.setDate(d.getDate()+1);setSelDate(d.toISOString().split("T")[0]);};
const isOrto=function(d){var s=(d.specialty||"").toLowerCase();return s.indexOf("orto")>=0;};
const selDayNum=new Date(selDate+"T12:00").getDay();
const worksToday=function(d){return (d.dias||[1,2,3,4,5]).indexOf(selDayNum)>=0;};
const hasApptToday=function(d){return appts.some(function(a){return a.date===selDate&&a.dentistId===d.id;});};
const vd=isDent
  ?dents.filter(d=>d.id===user.dentistId)
  :denF==="all"
    ?dents.filter(d=>!isOrto(d)&&(worksToday(d)||hasApptToday(d)))
    :dents.filter(d=>d.id===Number(denF));
// Use 20-min slots when viewing a single orto dentist
const viewingOrto=vd.length===1&&isOrto(vd[0]);
const activeSlots=viewingOrto?SLOTS_ORTO:SLOTS;
const espMatches=(user.level>=2)?esperaMatchDia(espera||[],appts,dents,selDate):[];
const hiddenToday=denF==="all"?appts.filter(function(a){return a.date===selDate&&!vd.some(function(d){return d.id===a.dentistId;})&&a.status!=="cancelled"&&a.status!=="rescheduled"&&a.status!=="missed";}):[];
const dim=(y,m)=>new Date(y,m+1,0).getDate();
const fd=(y,m)=>new Date(y,m,1).getDay();

const save=()=>{
const finalTime=pad2((f.timeCustom||"").trim()||(f.time||"").trim());
const hasPat=String(f.patientId||"").trim()||String(f.patientName||"").trim();
// Permite salvar sem paciente - aparece como "A confirmar" na agenda
if(!finalTime){alert("Preencha o horário");return;}
const dur=Number(f.duration)||30;
// Gerar slots ocupados pela duração
const extraSlots=[];
if(dur>30){
let [h,m]=finalTime.split(":").map(Number);
for(let i=30;i<dur;i+=30){
m+=30;if(m>=60){m-=60;h++;}
extraSlots.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
}
}
const obj={...f,time:finalTime,patientId:f.patientId?Number(f.patientId):null,patientName:f.patientId?"":(f.patientName||"A confirmar"),dentistId:Number(f.dentistId),value:Number(f.value)||0,duration:dur,extraSlots,id:edit?edit.id:nid(appts)};
if(edit&&edit.status!==f.status){obj.statusTs=new Date().toISOString();obj.stBy=(user&&user.name)||"";} // V222
obj._ts=Date.now(); // V189: carimbo de edicao para o merge respeitar mudancas de paciente/dados
if(!edit)obj._by=(user&&user.name)||""; // V222: quem criou a consulta
setAppts(prev=>edit?prev.map(a=>a.id===edit.id?obj:a):[...prev,obj]);
const p=pats.find(x=>x.id===Number(f.patientId));
const nome=p?.name||f.patientName||"";
if(addLog)addLog("agenda",(edit?"Editou":"Criou")+" consulta de "+nome+" - "+fmt(f.date)+" "+finalTime,nome);
if(!edit&&waEvent&&p&&p.phone&&!obj.blocked)waEvent("confirmacao",{appt:obj,pat:p});
setModal(false);setEdit(null);setF(blank);
};
const saveBlock=(date,time,dentistId)=>{
if(!blockReason.trim()){alert("Informe o motivo do bloqueio");return;}
setAppts(prev=>[...prev,{id:nid(prev),date,time,dentistId:Number(dentistId),blocked:true,blockReason,patientId:null,status:"blocked",procedure:"Bloqueado",value:0,payment:""}]);
setBlockModal(null);setBlockReason("");
};
const chSt=(id,st)=>{
setAppts(prev=>prev.map(a=>a.id===id?{...a,status:st,statusTs:new Date().toISOString(),stBy:(user&&user.name)||""}:a));
const a=appts.find(x=>x.id===id);const p=pats.find(x=>x.id===(a&&a.patientId));
const ST={confirmed:"Confirmou",pending:"Pendente",done:"Realizou",cancelled:"Cancelou",missed:"Faltou",rescheduled:"Desmarcou"};
if(addLog&&a)addLog("agenda",(ST[st]||st)+" consulta de "+(p&&p.name||"paciente")+" - "+fmt(a.date)+" "+a.time,p&&p.name);
if(waEvent&&a&&p&&(st==="missed"||st==="cancelled"||st==="rescheduled"))waEvent("reagendamento",{appt:a,pat:p,st:st});
};

return (

<div style={{display:"flex",flexDirection:"column",gap:10}} className="fi">

{detetive&&(function(){ // V224: popup detetive da consulta (admin)
var a=detetive;
var p=pats.find(function(x){return x.id===a.patientId;})||{};
var pname=p.name||a.patientName||"Paciente";
var ACAO={cancelled:"Cancelou",missed:"Faltou",rescheduled:"Desmarcou"};
var SL3={pending:"pendente",confirmed:"confirmada",done:"realizada",cancelled:"cancelada",missed:"falta",rescheduled:"desmarcada"};
var isCanc=!!ACAO[a.status];
var acao=ACAO[a.status]||"Alterou";
var zz=function(n){return String(n).padStart(2,"0");};
var fmtTs=function(iso){if(!iso)return "";var x=new Date(iso);if(isNaN(x))return "";return zz(x.getDate())+"/"+zz(x.getMonth()+1)+"/"+x.getFullYear()+" \u00e0s "+zz(x.getHours())+":"+zz(x.getMinutes());};
var chave=fmt(a.date)+" "+a.time;
var hist=(logs||[]).filter(function(l){return l.tipo==="agenda"&&(l.desc||"").indexOf(chave)>=0&&((l.patName&&l.patName===pname)||(l.desc||"").indexOf(pname)>=0);});
var criouLog=hist.find(function(l){return (l.desc||"").indexOf("Criou")===0;});
var criador=a._by||(criouLog&&criouLog.user)||null;
var criadoEm=(criouLog&&criouLog.ts)?fmtTs(criouLog.ts):"";
var quemLog=hist.find(function(l){return (l.desc||"").indexOf(acao)===0;});
var confLog=hist.find(function(l){return (l.desc||"").indexOf("Confirmou")===0;});
var quem=a.stBy||(isCanc?(quemLog&&quemLog.user):(confLog&&confLog.user))||null;
if(quem==="Sistema")quem=null;
var quando=isCanc?((quemLog&&quemLog.ts)?fmtTs(quemLog.ts):(a.statusTs?fmtTs(a.statusTs):"")):(a.statusTs?fmtTs(a.statusTs):((confLog&&confLog.ts)?fmtTs(confLog.ts):""));
var titulo=a.status==="missed"?"Quem marcou a falta?":a.status==="rescheduled"?"Quem desmarcou?":a.status==="cancelled"?"Quem cancelou?":"Quem agendou?";
var cardStaff=function(nome,texto){return <div style={{borderRadius:12,padding:"12px 14px",display:"flex",gap:11,alignItems:"flex-start",marginBottom:10,background:G.accent,border:"1.5px solid "+G.primary}}>
<span style={{fontSize:24,lineHeight:1}}>{"\ud83d\udc64"}</span>
<div><div style={{fontSize:14,fontWeight:800,color:G.primary}}>{nome}</div>
<div style={{fontSize:12,color:G.muted,marginTop:2,lineHeight:1.5}}>{texto}</div></div></div>;};
var cardWA=function(texto){return <div style={{borderRadius:12,padding:"12px 14px",display:"flex",gap:11,alignItems:"flex-start",marginBottom:10,background:"#e6f4ea",border:"1.5px solid "+G.success}}>
<span style={{fontSize:24,lineHeight:1}}>{"\ud83d\udcac"}</span>
<div><div style={{fontSize:14,fontWeight:800,color:G.success}}>{"Paciente, pelo WhatsApp"}</div>
<div style={{fontSize:12,color:G.muted,marginTop:2,lineHeight:1.5}}>{texto}</div></div></div>;};
var cardOld=function(texto){return <div style={{borderRadius:12,padding:"12px 14px",display:"flex",gap:11,alignItems:"flex-start",marginBottom:10,background:"var(--amber-soft)",border:"1.5px solid #FFD54F"}}>
<span style={{fontSize:24,lineHeight:1}}>{"\ud83d\udcdc"}</span>
<div><div style={{fontSize:14,fontWeight:800,color:"#8a6d00"}}>{"Sem registro"}</div>
<div style={{fontSize:12,color:G.muted,marginTop:2,lineHeight:1.5}}>{texto}</div></div></div>;};
return <div style={{position:"fixed",inset:0,background:"rgba(43,51,48,.45)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={function(){setDetetive(null);}}>
<div style={{background:"var(--surface)",borderRadius:16,padding:18,width:"100%",maxWidth:420,maxHeight:"85vh",overflowY:"auto"}} onClick={function(e){e.stopPropagation();}}>
<div style={{fontSize:15,fontWeight:800,color:G.primary,display:"flex",alignItems:"center",gap:7}}>{"\ud83d\udd75\ufe0f "+titulo}</div>
<div style={{fontSize:12,color:G.muted,margin:"2px 0 14px"}}>{pname+" \u00b7 "+fmt(a.date)+" \u00e0s "+a.time+(a.procedure?" \u00b7 "+a.procedure:"")}</div>
{isCanc&&(quem
?cardStaff(quem,"Alterou o status para "+acao.toLowerCase()+" pelo sistema"+(quando?" em "+quando:"")+".")
:cardWA("Nenhum funcion\u00e1rio registrou essa altera\u00e7\u00e3o"+(quando?" \u2014 o status mudou em "+quando:"")+". Provavelmente o(a) paciente respondeu \u00e0 mensagem de v\u00e9spera pelo WhatsApp, ou \u00e9 um registro antigo."))}
{!isCanc&&<div style={{fontSize:10.5,fontWeight:800,textTransform:"uppercase",letterSpacing:".5px",color:G.muted,marginBottom:6}}>{"Agendamento"}</div>}
{!isCanc&&(criador
?cardStaff(criador,"Agendou a consulta pelo sistema"+(criadoEm?" em "+criadoEm:"")+".")
:cardOld("Consulta criada antes do V222, quando o sistema ainda n\u00e3o gravava quem agendou."))}
{!isCanc&&a.status!=="pending"&&<div style={{fontSize:10.5,fontWeight:800,textTransform:"uppercase",letterSpacing:".5px",color:G.muted,marginBottom:6}}>{"Status atual: "+(SL3[a.status]||a.status)}</div>}
{!isCanc&&a.status!=="pending"&&(quem
?cardStaff(quem,"Marcou como "+(SL3[a.status]||a.status)+" pelo sistema"+(quando?" em "+quando:"")+".")
:a.status==="confirmed"
?cardWA("Confirmada sem registro de funcion\u00e1rio"+(quando?" \u2014 em "+quando:"")+". Provavelmente o(a) paciente confirmou respondendo \u00e0 mensagem de v\u00e9spera, ou \u00e9 um registro antigo.")
:cardOld("Altera\u00e7\u00e3o de status anterior ao V222, sem registro de quem fez."))}
{isCanc&&(criador||criouLog)&&<div style={{fontSize:12,color:G.muted,marginBottom:10}}>{"\ud83d\udcc5 Agendada por "+(criador||"?")+(criadoEm?" em "+criadoEm:"")}</div>}
{hist.length>0&&<div>
<div style={{fontSize:10.5,fontWeight:800,textTransform:"uppercase",letterSpacing:".5px",color:G.muted,marginBottom:6}}>{"Hist\u00f3rico desta consulta"}</div>
<div style={{background:"var(--card)",borderRadius:10,border:"1px solid "+G.border,padding:"4px 0",maxHeight:170,overflowY:"auto"}}>
{hist.map(function(l){return <div key={l.id} style={{display:"flex",flexDirection:"column",gap:1,padding:"7px 12px",fontSize:11.5,borderBottom:"1px solid "+G.border}}>
<span style={{color:G.muted,fontWeight:600,fontSize:10.5}}>{fmtTs(l.ts)}</span>
<span style={{lineHeight:1.4}}><b style={{color:G.primary}}>{l.user}</b>{" \u00b7 "+l.desc}</span>
</div>;})}
</div>
</div>}
<button onClick={function(){setDetetive(null);}} style={{width:"100%",marginTop:14,border:"none",borderRadius:12,padding:12,fontSize:14,fontWeight:700,cursor:"pointer",background:G.primary,color:"#fff"}}>{"Fechar"}</button>
</div>
</div>;
})()}
{showCal&&(

<div style={{position:"fixed",inset:0,zIndex:500}} onClick={()=>setShowCal(false)}>
<div style={{position:"absolute",top:60,left:"50%",transform:"translateX(-50%)",background:"var(--surface)",borderRadius:14,boxShadow:"0 8px 32px rgba(0,0,0,.2)",padding:16,minWidth:290,zIndex:501}} onClick={e=>e.stopPropagation()}>
<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
<button onClick={()=>{if(calM===0){setCalM(11);setCalY(y=>y-1);}else setCalM(m=>m-1);}} style={{border:"none",background:"none",fontSize:20,cursor:"pointer",color:G.primary,fontWeight:700}}>{"<"}</button>
<span style={{fontWeight:700,fontSize:13}}>{MONTHS[calM]} {calY}</span>
<button onClick={()=>{if(calM===11){setCalM(0);setCalY(y=>y+1);}else setCalM(m=>m+1);}} style={{border:"none",background:"none",fontSize:20,cursor:"pointer",color:G.primary,fontWeight:700}}>{">"}</button>
</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
{["D","S","T","Q","Q","S","S"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:10,fontWeight:700,color:G.muted}}>{d}</div>)}
</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
{Array.from({length:fd(calY,calM)}).map((_,i)=><div key={"e"+i}/>)}
{Array.from({length:dim(calY,calM)}).map((_,i)=>{
const ds=calY+"-"+String(calM+1).padStart(2,"0")+"-"+String(i+1).padStart(2,"0");
const isSel=ds===selDate;const isTd=ds===td;
const cnt=appts.filter(a=>a.date===ds).length;
return (
<div key={i} onClick={()=>{setSelDate(ds);setShowCal(false);}} style={{borderRadius:6,padding:"4px 2px",textAlign:"center",cursor:"pointer",background:isSel?G.primary:isTd?G.accent:"transparent"}}>
<div style={{fontSize:12,fontWeight:700,color:isSel?"#fff":isTd?G.primary:G.text}}>{i+1}</div>
{cnt>0&&<div style={{width:4,height:4,borderRadius:"50%",background:isSel?"rgba(255,255,255,.7)":G.primary,margin:"0 auto"}}/>}
</div>
);
})}
</div>
</div>
</div>
)}

  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
    <button onClick={()=>{setCalY(new Date().getFullYear());setCalM(new Date().getMonth());setShowCal(v=>!v);}} style={{background:showCal?G.primary:G.accent,border:"1.5px solid "+G.border,borderRadius:8,padding:"7px 10px",cursor:"pointer",fontSize:16,color:showCal?"#fff":"inherit"}}>{"📅"}</button>
    <button onClick={function(){var d=new Date(selDate+"T12:00");if(agView==="dia")d.setDate(d.getDate()-1);else{d=new Date(week[0]+"T12:00");d.setDate(d.getDate()-7);}setSelDate(d.toISOString().split("T")[0]);}} style={{background:"var(--surface)",border:"1.5px solid "+G.border,borderRadius:8,padding:"7px 12px",cursor:"pointer",color:G.primary,fontWeight:700}}>{"<"}</button>
    <button onClick={function(){var d=new Date(selDate+"T12:00");if(agView==="dia")d.setDate(d.getDate()+1);else{d=new Date(week[6]+"T12:00");d.setDate(d.getDate()+1);}setSelDate(d.toISOString().split("T")[0]);}} style={{background:"var(--surface)",border:"1.5px solid "+G.border,borderRadius:8,padding:"7px 12px",cursor:"pointer",color:G.primary,fontWeight:700}}>{">"}</button>
    <button onClick={()=>setSelDate(td)} style={{background:"var(--surface)",border:"1.5px solid "+G.border,borderRadius:8,padding:"7px 11px",cursor:"pointer",color:G.primary,fontWeight:600,fontSize:12}}>Hoje</button>
    <div style={{display:"flex",gap:2,background:G.bg,borderRadius:9,padding:3}}>
      {[["dia","Dia"],["semana","Semana"]].map(function(v){return <button key={v[0]} onClick={function(){if(v[0]==="semana"&&!isDent&&denF==="all"){var d1=dents.filter(function(d){return !isOrto(d);})[0]||dents[0];if(d1)setDenF(String(d1.id));}setAgView(v[0]);}} style={{border:"none",borderRadius:7,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer",background:agView===v[0]?G.primary:"transparent",color:agView===v[0]?"#fff":G.muted}}>{v[1]}</button>;})}
    </div>
    {agView==="dia"&&<div style={{display:"flex",gap:0,background:G.bg,borderRadius:12,boxShadow:"inset 4px 4px 9px var(--nm-dark),inset -4px -4px 9px var(--nm-light)",padding:4}} title="Modo de exibicao do dia">
      <button onClick={function(){try{localStorage.setItem("agenda_view_mode","normal");}catch(e){}setAgViewMode("normal");}} style={{border:"none",background:agViewMode!=="compact"?G.primary:"transparent",color:agViewMode!=="compact"?"#ead9b6":G.muted,borderRadius:9,padding:"7px 13px",fontSize:12,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",gap:5,boxShadow:agViewMode!=="compact"?"3px 3px 8px rgba(34,70,52,.4)":"none"}}>{"☰ Normal"}</button>
      <button onClick={function(){try{localStorage.setItem("agenda_view_mode","compact");}catch(e){}setAgViewMode("compact");}} style={{border:"none",background:agViewMode==="compact"?G.primary:"transparent",color:agViewMode==="compact"?"#ead9b6":G.muted,borderRadius:9,padding:"7px 13px",fontSize:12,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",gap:5,boxShadow:agViewMode==="compact"?"3px 3px 8px rgba(34,70,52,.4)":"none"}}>{"▤ Compacta"}</button>
    </div>}
    {!isDent&&<select value={denF} onChange={e=>setDenF(e.target.value)} style={{border:"1.5px solid "+G.border,borderRadius:20,padding:"6px 12px",fontSize:11,fontWeight:600,outline:"none",background:"var(--surface)"}}>
      {agView!=="semana"&&<option value="all">Todos</option>}
      {dents.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
    </select>}
    {/* Quick orto buttons */}
    {!isDent&&dents.filter(d=>(d.specialty||"").toLowerCase().indexOf("orto")>=0).map(d=><button key={d.id} onClick={()=>setDenF(String(d.id))} style={{border:"2px solid "+(denF===String(d.id)?d.color:G.border),background:denF===String(d.id)?d.color:"var(--card)",color:denF===String(d.id)?"#fff":d.color,borderRadius:20,padding:"5px 12px",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>{"🦷 "+d.name.replace(/Dr\.|Dra\./i,"").trim().split(" ")[0]}</button>)}
    <div style={{display:"flex",alignItems:"center",gap:1,background:G.bg,borderRadius:9,padding:"2px 5px"}} title="Zoom da agenda — diminua para ver o dia inteiro na tela"><span style={{fontSize:12,marginRight:2}}>🔍</span><button onClick={function(){setAgZoom(function(z){return Math.max(.5,Math.round((z-.1)*10)/10);});}} style={{border:"none",background:"transparent",borderRadius:7,width:24,height:24,fontSize:17,fontWeight:700,cursor:"pointer",color:G.muted,lineHeight:1,padding:0}} title="Diminuir">−</button><button onClick={function(){setAgZoom(1);}} style={{border:"none",background:"transparent",borderRadius:7,padding:"0 4px",minWidth:42,fontSize:11,fontWeight:700,cursor:"pointer",color:agZoom!==1?G.primary:G.muted}} title="Restaurar 100%">{Math.round(agZoom*100)+"%"}</button><button onClick={function(){setAgZoom(function(z){return Math.min(1.2,Math.round((z+.1)*10)/10);});}} style={{border:"none",background:"transparent",borderRadius:7,width:24,height:24,fontSize:16,fontWeight:700,cursor:"pointer",color:G.muted,lineHeight:1,padding:0}} title="Aumentar">+</button></div>
    <div style={{flex:1}}/>
  </div>
  

  {agView==="dia"&&<div style={{display:"grid",gridTemplateColumns:"48px repeat(7,1fr)",gap:2}}>
    <div/>
    {week.map(ds=>{
      const d=new Date(ds+"T12:00");
      const isTd=ds===td;const isSel=ds===selDate;
      const cnt=appts.filter(a=>a.date===ds&&a.status!=="cancelled"&&a.status!=="rescheduled"&&a.status!=="missed"&&!a.blocked).length;
      return (
        <div key={ds} onClick={()=>setSelDate(ds)} style={{textAlign:"center",cursor:"pointer",background:"var(--surface)",borderRadius:12,padding:"7px 3px",boxShadow:isSel?"inset 3px 3px 7px var(--nm-dark),inset -3px -3px 7px #ffffff":"4px 4px 9px var(--nm-dark),-4px -4px 9px #ffffff",transition:"all .15s"}}>
          <div style={{fontSize:10,fontWeight:700,color:isSel?G.primary:G.muted,textTransform:"uppercase"}}>{DAY[d.getDay()]}</div>
          <div style={{fontFamily:"'Cormorant Garamond'",fontSize:22,fontWeight:700,color:isSel||isTd?G.primary:G.text}}>{d.getDate()}</div>
          {cnt>0&&<div style={{background:G.primary,color:"#fff",borderRadius:9,padding:"1px 7px",fontSize:9,fontWeight:700,display:"inline-block",marginTop:1}}>{cnt}</div>}
        </div>
      );
    })}
  </div>}

{agView==="dia"&&hiddenToday.length>0&&<div onClick={function(){var od=dents.find(function(d){return d.id===hiddenToday[0].dentistId;});if(od)setDenF(String(od.id));}} style={{background:"var(--amber-soft)",border:"1.5px solid #FFB300",borderRadius:10,padding:"9px 13px",fontSize:12,fontWeight:700,color:"#E65100",cursor:"pointer",display:"flex",alignItems:"center",gap:6,margin:"2px 0"}}>{"⚠ "+hiddenToday.length+" consulta(s) de Ortodontia neste dia não aparecem aqui. Toque para ver →"}</div>}

{agView==="dia"&&denF==="all"&&!isDent&&vd.length===0&&<div style={{background:G.card,borderRadius:12,padding:24,textAlign:"center",color:G.muted,fontSize:13,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>{"Nenhum dentista clínico trabalhando neste dia. Selecione um dentista no filtro para agendar."}</div>}



{agView==="dia"&&vd.length>1&&<div style={{display:"grid",gridTemplateColumns:"48px repeat("+vd.length+",1fr)",gap:2,zoom:agZoom}}>

<div/>
{vd.map(d=><div key={d.id} style={{background:d.color,color:"#fff",borderRadius:7,padding:"5px 4px",textAlign:"center",fontSize:10,fontWeight:700}}>{d.name.split(" ").slice(0,2).join(" ")}</div>)}

  </div>}

{agView==="dia"&&user.level>=2&&espMatches.length>0&&<div style={{background:"var(--purple-soft)",border:"2px solid #7B1FA2",borderRadius:10,padding:"8px 12px"}}>
<div style={{fontWeight:700,color:"#7B1FA2",fontSize:12,marginBottom:3}}>{"⏳ Encaixe da Lista de Espera possível neste dia:"}</div>
{espMatches.slice(0,3).map(function(m){return <div key={m.esp.id} style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",fontSize:12,color:"#4A148C",marginBottom:3}}>
<span style={{flex:1,minWidth:140}}>{"• "+m.esp.patName+(m.esp.proc?" ("+m.esp.proc+")":"")+" — "+m.times.slice(0,3).join(", ")+(m.times.length>3?"...":"")+" · "+m.dent.name.split(" ").slice(0,2).join(" ")}</span>
<button onClick={function(){setEdit(null);var t0=m.times[0]||"";var _isStdB=activeSlots.indexOf(t0)>=0;setF({...blank,date:selDate,time:_isStdB?t0:"",timeCustom:_isStdB?"":t0,dentistId:m.dent.id,patientId:String(m.esp.patientId),treatment:m.esp.proc||""});setModal(true);}} style={{background:"#7B1FA2",color:"#fff",border:"none",borderRadius:7,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>Agendar</button>
</div>;})}
{espMatches.length>3&&<div style={{fontSize:11,color:"#7B1FA2"}}>{"+ "+(espMatches.length-3)+" paciente(s) com encaixe"}</div>}
</div>}
{agView==="dia"&&vd.length===1&&<div style={{display:"flex",flexDirection:"column",gap:1,zoom:agZoom}}>
{(()=>{
// Inclui horarios personalizados dos agendamentos do dia
var d=vd[0];
var customTimes=appts.filter(function(x){return x.date===selDate&&x.dentistId===d.id&&!activeSlots.includes(x.time);}).map(function(x){return x.time;});
var allSlots=[...new Set([...activeSlots,...customTimes])].sort(function(x,y){return t2m(x)-t2m(y);});
var _slots=allSlots.map(function(slot){
// Prefer active (non-cancelled/missed/rescheduled) appointments first
var a=appts.find(function(x){return x.date===selDate&&x.time===slot&&x.dentistId===d.id&&x.status!=="cancelled"&&x.status!=="rescheduled"&&x.status!=="missed";});
if(!a)a=appts.find(function(x){return x.date===selDate&&x.time===slot&&x.dentistId===d.id;});
var p=a?pats.find(function(x){return x.id===a.patientId;}):null;
var selDay=new Date(selDate+"T12:00").getDay();
var isOff=(d.dias||[1,2,3,4,5]).indexOf(selDay)<0;
var alIni=(d.almoco&&d.almoco.ini)||"";var alFim=(d.almoco&&d.almoco.fim)||"";
var isAlm=alIni&&alFim&&slot>=alIni&&slot<alFim;
var isOut=slot<(d.entrada||"08:00")||slot>=(d.saida||"18:00");
var isBlocked=isOff||isAlm||isOut;
if(isBlocked&&!a)return(

<div key={slot} style={{display:"flex",alignItems:"center",gap:5,padding:"1px 6px",borderRadius:5,background:isOff?"var(--red-soft)":isAlm?"var(--amber-soft)":"var(--purple-soft)",opacity:.6}}>
<span style={{fontSize:10,color:G.muted,minWidth:34,fontWeight:600}}>{slot}</span>
<span style={{fontSize:11,color:isOff?"#C62828":isAlm?"#E65100":"#6A1B9A",fontWeight:600}}>{isOff?"🚫 Folga":isAlm?"🍽️ Almoço":"⛔ Fechado"}</span>
</div>
);
// Slot ocupado por duração de consulta anterior
const isExtraSlot=appts.some(a2=>a2.date===selDate&&a2.dentistId===d.id&&(a2.extraSlots||[]).includes(slot)&&a2.status!=="cancelled"&&a2.status!=="rescheduled"&&a2.status!=="missed");
if(isExtraSlot&&!a)return(
<div key={slot} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 12px",borderRadius:9,background:"var(--surface)",boxShadow:"inset 3px 3px 7px var(--nm-dark),inset -3px -3px 7px var(--nm-light)"}}>
<span style={{fontSize:11,color:"#8a6aa0",minWidth:38,fontWeight:700}}>{slot}</span>
<span style={{fontSize:11,color:"#8a6aa0",fontWeight:600,display:"flex",alignItems:"center",gap:5}}><i className="ph-light ph-clock"></i>Em consulta</span>
</div>
);
if(!a)return(
<div key={slot} onClick={function(){if(isDent)return;setEdit(null);var _isStdC=activeSlots.indexOf(slot)>=0;setF({...blank,date:selDate,time:_isStdC?slot:"",timeCustom:_isStdC?"":slot,dentistId:d.id});setModal(true);}} style={{display:"flex",alignItems:"center",gap:4,padding:viewingOrto?"1px 6px":"1px 6px",borderRadius:5,background:"var(--green-soft)",border:"1px dashed "+G.border,cursor:isDent?"default":"pointer",minHeight:viewingOrto?20:26}}>
<span style={{fontSize:10,color:G.muted,minWidth:34,fontWeight:600}}>{slot}</span>
{isDent
?<span style={{fontSize:11,color:G.border}}>──────</span>
:<span style={{fontSize:11,color:G.border,flex:1}}>{"+ agendar"}</span>}
{!isDent&&<button onClick={e=>{e.stopPropagation();setBlockModal({date:selDate,time:slot,dentistId:d.id});}} style={{marginLeft:"auto",background:"var(--red-soft)",border:"1px solid #FFCDD2",borderRadius:6,padding:"2px 7px",fontSize:10,color:G.red,cursor:"pointer",fontWeight:700}} title="Bloquear horário">🔒</button>}
</div>
);
// Slot bloqueado
if(a&&a.blocked)return(
<div key={slot} style={{display:"flex",alignItems:"center",gap:4,padding:"2px 6px",borderRadius:7,background:"var(--red-soft)",border:"1.5px solid "+G.red,cursor:"pointer"}} onClick={()=>{if(!isDent&&window.confirm("Desbloquear este horário?"))setAppts(prev=>prev.filter(x=>x.id!==a.id));}}>
<span style={{fontSize:12,fontWeight:700,color:G.red,minWidth:38}}>{slot}</span>
<span style={{fontSize:12,fontWeight:700,color:G.red}}>🔒 {a.blockReason||"Bloqueado"}</span>
{!isDent&&<span style={{fontSize:10,color:G.muted,marginLeft:"auto"}}>toque p/ desbloquear</span>}
</div>
);
// Cancelado/desmarcado: libera o horário visualmente
if(a.status==="cancelled"||a.status==="rescheduled"||a.status==="missed"){
return(
<div key={slot} onClick={function(){if(isDent)return;setEdit(null);var _isStdC=activeSlots.indexOf(slot)>=0;setF({...blank,date:selDate,time:_isStdC?slot:"",timeCustom:_isStdC?"":slot,dentistId:d.id});setModal(true);}} style={{display:"flex",alignItems:"center",gap:4,padding:viewingOrto?"1px 6px":"1px 6px",borderRadius:5,background:"var(--green-soft)",border:"1px dashed "+G.border,cursor:isDent?"default":"pointer",minHeight:viewingOrto?20:26}}>
<span style={{fontSize:10,color:G.muted,minWidth:34,fontWeight:600}}>{slot}</span>
<span style={{fontSize:11,color:G.border,flex:1}}>{isDent?"":"+ agendar"}</span>
</div>
);
}
const isPartial=!a.patientId&&a.patientName;
var flags=[];
if(p&&p.obs)flags.push("⚠️ "+p.obs);
if(p&&p.allergy&&p.allergy!=="Nenhuma")flags.push("💊 "+p.allergy);
var anObj=p&&p.anamnese||{};
ANAM_CONDS.forEach(function(c){if(anObj[c[0]])flags.push(c[1]);});
// Card neumorfico - barra de status lateral
var isPending=a.status==="pending";
var isWaiting=a.status==="waiting";
var stCol=isPartial?G.red:(SCN[a.status]||G.primary);
return(
<div key={slot} onClick={function(){setViewA(a);}} style={{display:"flex",alignItems:"stretch",gap:11,padding:"11px 13px",borderRadius:14,background:"var(--surface)",cursor:"pointer",boxShadow:"7px 7px 18px #c5cdc2,-7px -7px 18px #ffffff"}}>
<span style={{display:"flex",flexDirection:"column",justifyContent:"center",minWidth:52,lineHeight:1.05}}><span style={{fontFamily:"'Cormorant Garamond'",fontSize:19,fontWeight:700,color:stCol}}>{slot}</span><span style={{fontSize:10,fontWeight:600,color:G.muted}}>{(a.duration||30)+" min"}</span></span>
<div style={{width:isWaiting?9:7,borderRadius:7,flexShrink:0,alignSelf:"stretch",background:GRAD[a.status]||GRAD.confirmed,boxShadow:"inset 2px 2px 4px rgba(255,255,255,.45),inset -2px -2px 5px rgba(0,0,0,.18),3px 4px 13px "+(GLOW[a.status]||GLOW.confirmed)}}></div>
<div style={{flex:1,minWidth:0}}>
<div style={{display:"flex",alignItems:"center",gap:6}}>
<span style={{fontWeight:700,fontSize:14,color:isPartial?G.red:G.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{isPartial?a.patientName:(p&&p.name)}</span>
{isPartial&&<span style={{fontSize:10,background:G.red+"20",color:G.red,borderRadius:4,padding:"1px 5px",fontWeight:700,flexShrink:0}}>Parcial</span>}
<span style={{marginLeft:"auto",fontSize:11.5,fontWeight:700,color:stCol,display:"flex",alignItems:"center",gap:4,flexShrink:0,whiteSpace:"nowrap"}}><i className={"ph-fill "+(SCN_IC[a.status]||"ph-circle")} style={{fontSize:13,animation:isWaiting?"nmpulse 1.2s ease-in-out infinite":"none"}}></i>{SL[a.status]}</span>
</div>
<div style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".5px",marginTop:3}}>{a.procedureCustom||a.procedure}</div>
{p&&anamFalta(p)&&<div style={{display:"flex",marginTop:5}}><span style={{fontSize:9.5,background:"#cf5a78",color:"#fff",borderRadius:6,padding:"3px 9px",fontWeight:800,letterSpacing:".3px"}}>{"⚠ ANAMNESE NÃO CADASTRADA"}</span></div>}
{flags.length>0&&<div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
{flags.map(function(f,i){return <span key={i} style={{fontSize:10,background:"var(--surface)",color:"#9a7636",borderRadius:7,padding:"3px 9px",fontWeight:700,boxShadow:"inset 2px 2px 5px var(--nm-dark),inset -2px -2px 5px var(--nm-light)"}}>{f}</span>;})}
</div>}
</div>
</div>
)
});
// ===== MODO COMPACTO (V204) — visao Dia, dentista unico =====
var _slotsCompact=null;
if(agViewMode==="compact"){
var _consumed={};
_slotsCompact=[];
var _selDayC=new Date(selDate+"T12:00").getDay();
var _isOffDayC=(d.dias||[1,2,3,4,5]).indexOf(_selDayC)<0;
var _alIniC=(d.almoco&&d.almoco.ini)||"";var _alFimC=(d.almoco&&d.almoco.fim)||"";
allSlots.forEach(function(slot,idx){
if(_consumed[slot])return;
var isAlmC=_alIniC&&_alFimC&&slot>=_alIniC&&slot<_alFimC;
var isOutC=slot<(d.entrada||"08:00")||slot>=(d.saida||"18:00");
var aC=appts.find(function(x){return x.date===selDate&&x.time===slot&&x.dentistId===d.id&&x.status!=="cancelled"&&x.status!=="rescheduled"&&x.status!=="missed";});
if(aC&&!aC.blocked){
var occ=[slot].concat((aC.extraSlots||[]).slice()).filter(function(v,i,arr){return arr.indexOf(v)===i;}).sort(function(x,y){return t2m(x)-t2m(y);});
occ.forEach(function(s){_consumed[s]=1;});
var lbl=occ.length===1?occ[0]:occ[0]+" – "+occ[occ.length-1];
var multi=occ.length>1;
var pC=pats.find(function(x){return x.id===aC.patientId;});
var isPartC=!aC.patientId&&aC.patientName;
var anC=(pC&&pC.anamnese)||{};
var hasAlertC=ANAM_CONDS.some(function(c){return anC[c[0]];});
var nmC=isPartC?aC.patientName:((pC&&pC.name)||"A confirmar");
var stColC=isPartC?G.red:(SCN[aC.status]||G.primary);
_slotsCompact.push(
<div key={"c"+slot} onClick={function(){setViewA(aC);}} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:10,background:"var(--surface)",boxShadow:"3px 3px 7px var(--nm-dark),-3px -3px 7px var(--nm-light)",marginBottom:5,cursor:"pointer",borderLeft:hasAlertC?"3px solid var(--yellow)":"none"}}>
<span style={{fontFamily:"'Cormorant Garamond'",fontSize:multi?15:16,fontWeight:700,color:stColC,minWidth:multi?96:46,lineHeight:1,whiteSpace:"nowrap"}}>{lbl}</span>
<div style={{width:3.5,height:22,borderRadius:3,flexShrink:0,background:GRAD[aC.status]||GRAD.confirmed}}></div>
<span style={{fontSize:12.5,fontWeight:800,color:isPartC?G.red:G.text,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",letterSpacing:".2px"}}>{nmC}</span>
<span style={{fontSize:10,color:G.muted,fontWeight:700,whiteSpace:"nowrap",maxWidth:92,overflow:"hidden",textOverflow:"ellipsis"}}>{aC.procedureCustom||aC.procedure}</span>
{hasAlertC&&<span style={{width:19,height:19,borderRadius:6,background:"#D32F2F",color:"#fff",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontWeight:900,boxShadow:"0 1px 4px rgba(180,30,30,.45)"}}>!</span>}
<span style={{width:16,height:16,borderRadius:5,background:SCN[aC.status]||G.primary,color:"#fff",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontWeight:900}}><i className={"ph-fill "+(SCN_IC[aC.status]||"ph-circle")} style={{fontSize:11}}></i></span>
</div>
);
return;
}
var ablkC=appts.find(function(x){return x.date===selDate&&x.time===slot&&x.dentistId===d.id&&x.blocked;});
if(ablkC){
var blkSlots=[slot];_consumed[slot]=1;
for(var b=idx+1;b<allSlots.length;b++){var sb=allSlots[b];var sbBlk=appts.find(function(x){return x.date===selDate&&x.time===sb&&x.dentistId===d.id&&x.blocked;});if(sbBlk&&(sbBlk.blockReason||"")===(ablkC.blockReason||"")){blkSlots.push(sb);_consumed[sb]=1;}else break;}
var blkLbl=blkSlots.length===1?blkSlots[0]:blkSlots[0]+" – "+blkSlots[blkSlots.length-1];
_slotsCompact.push(<div key={"cb"+slot} onClick={function(){if(!isDent&&window.confirm("Desbloquear este horario?"))setAppts(function(prev){return prev.filter(function(x){return !(x.blocked&&x.date===selDate&&x.dentistId===d.id&&blkSlots.indexOf(x.time)>=0);});});}} style={{display:"flex",alignItems:"center",gap:8,padding:"3px 10px",borderRadius:8,background:"var(--red-soft)",color:G.red,border:"1px solid #FFCDD2",marginBottom:5,fontSize:10.5,fontWeight:800,cursor:isDent?"default":"pointer"}}><span style={{minWidth:blkSlots.length>1?96:46,fontWeight:800}}>{blkLbl}</span>{"🔒 "+(ablkC.blockReason||"Bloqueado")}{!isDent&&<span style={{marginLeft:"auto",fontWeight:600,opacity:.7}}>desbloquear</span>}</div>);
return;
}
if(isAlmC){
var lunchSlots=[slot];_consumed[slot]=1;
for(var j=idx+1;j<allSlots.length;j++){var sj=allSlots[j];var sjAlm=_alIniC&&_alFimC&&sj>=_alIniC&&sj<_alFimC;var sjAppt=appts.find(function(x){return x.date===selDate&&x.time===sj&&x.dentistId===d.id&&x.status!=="cancelled"&&x.status!=="rescheduled"&&x.status!=="missed";});if(sjAlm&&!sjAppt){lunchSlots.push(sj);_consumed[sj]=1;}else break;}
var lunchLbl=lunchSlots.length===1?lunchSlots[0]:lunchSlots[0]+" – "+lunchSlots[lunchSlots.length-1];
_slotsCompact.push(<div key={"cl"+slot} style={{display:"flex",alignItems:"center",gap:8,padding:"3px 10px",borderRadius:8,background:"var(--amber-soft)",color:G.orange,marginBottom:5,fontSize:10.5,fontWeight:700}}><span style={{minWidth:lunchSlots.length>1?96:46,fontWeight:800,color:G.muted}}>{lunchLbl}</span>{"🍽️ Almoco"}</div>);
return;
}
if(_isOffDayC||isOutC){
var offSlots=[slot];_consumed[slot]=1;var offKind=_isOffDayC?"folga":"out";
for(var k=idx+1;k<allSlots.length;k++){var sk=allSlots[k];var skAlm=_alIniC&&_alFimC&&sk>=_alIniC&&sk<_alFimC;var skOut=sk<(d.entrada||"08:00")||sk>=(d.saida||"18:00");var skAppt=appts.find(function(x){return x.date===selDate&&x.time===sk&&x.dentistId===d.id;});var skKind=_isOffDayC?"folga":skOut?"out":null;if(!skAppt&&!skAlm&&skKind===offKind){offSlots.push(sk);_consumed[sk]=1;}else break;}
var offLbl=offSlots.length===1?offSlots[0]:offSlots[0]+" – "+offSlots[offSlots.length-1];
_slotsCompact.push(<div key={"co"+slot} style={{display:"flex",alignItems:"center",gap:8,padding:"3px 10px",borderRadius:8,marginBottom:5,fontSize:10.5,fontWeight:700,background:_isOffDayC?"var(--red-soft)":"var(--purple-soft)",color:_isOffDayC?"#C62828":"#6A1B9A",opacity:.6}}><span style={{minWidth:offSlots.length>1?96:46,fontWeight:700}}>{offLbl}</span>{_isOffDayC?"🚫 Folga":"⛔ Fechado"}</div>);
return;
}
_consumed[slot]=1;
_slotsCompact.push(
<div key={"cf"+slot} onClick={function(){if(isDent)return;setEdit(null);var _isStdC=activeSlots.indexOf(slot)>=0;setF(Object.assign({},blank,{date:selDate,time:_isStdC?slot:"",timeCustom:_isStdC?"":slot,dentistId:d.id}));setModal(true);}} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 10px",borderRadius:9,border:"1.2px dashed "+G.border,background:"var(--surface)",marginBottom:5,cursor:isDent?"default":"pointer"}}>
<span style={{fontSize:11,fontWeight:700,color:G.muted,minWidth:46}}>{slot}</span>
{isDent?<span style={{fontSize:10.5,color:G.border,flex:1}}>{"──────"}</span>:<span style={{fontSize:10.5,color:G.muted,flex:1}}>{"+ agendar"}</span>}
{!isDent&&<button onClick={function(e){e.stopPropagation();setBlockModal({date:selDate,time:slot,dentistId:d.id});}} style={{background:"transparent",border:"none",fontSize:12,cursor:"pointer",padding:0,lineHeight:1}} title="Bloquear horario">{"🔒"}</button>}
</div>
);
});
}
var doCancelados=appts.filter(function(x){return x.date===selDate&&x.dentistId===d.id&&(x.status==="cancelled"||x.status==="rescheduled"||x.status==="missed");});
var _cancelled=doCancelados.length>0?<div style={{marginTop:8,background:"var(--red-soft)",border:"2px solid "+SC.cancelled,borderRadius:12,padding:"10px 14px"}}>
<div style={{fontWeight:700,fontSize:12,color:SC.cancelled,marginBottom:8}}>{"❌ "+doCancelados.length+" cancelado(s)/desmarcado(s) -- horário liberado"}</div>
{doCancelados.map(function(a){
var p=pats.find(function(x){return x.id===a.patientId;});
return <div key={a.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",background:"var(--surface)",borderRadius:8,marginBottom:4,border:"1px solid #FFCDD2",flexWrap:"wrap"}}>
<span style={{fontSize:12,fontWeight:700,color:SC[a.status],minWidth:38}}>{a.time}</span>
<span style={{flex:1,fontSize:12,fontWeight:600}}>{p&&p.name||"--"}</span>
<span style={{fontSize:11,color:G.muted}}>{a.procedure}</span>
<span style={{background:SC_BG[a.status],color:SC[a.status],borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>{(SC_ICON[a.status]||"")+" "+SL[a.status]}</span>
{user.level>=3&&<button onClick={function(e){e.stopPropagation();setDetetive(a);}} title="Quem cancelou?" style={{background:"var(--card)",border:"1.5px solid "+G.border,borderRadius:"50%",width:26,height:26,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,lineHeight:1,boxShadow:"2px 2px 5px var(--nm-dark),-2px -2px 5px var(--nm-light)",flexShrink:0}}>{"\ud83d\udd75\ufe0f"}</button>}
{!isDent&&<button onClick={function(){setEdit(a);var _std=SLOTS.indexOf(a.time)>=0;setF(Object.assign({},a,{patientId:String(a.patientId||""),dentistId:String(a.dentistId),time:_std?a.time:"",timeCustom:_std?"":a.time}));setModal(true);}} style={{background:G.primary,color:"#fff",border:"none",borderRadius:6,padding:"3px 9px",fontSize:10,fontWeight:700,cursor:"pointer"}}>Reagendar</button>}
</div>;
})}
</div>:null;
return [agViewMode==="compact"?_slotsCompact:_slots, _cancelled];
})()}

  </div>}
  {agView==="dia"&&vd.length>1&&<div style={{overflowX:"auto",zoom:agZoom}}>
    <div style={{minWidth:vd.length>1?vd.length*130+55:250}}>
      {(function(){
        var customTimesAll=appts.filter(function(x){return x.date===selDate&&vd.some(function(d){return d.id===x.dentistId;})&&activeSlots.indexOf(x.time)<0;}).map(function(x){return x.time;});
        var allSlotsMulti=activeSlots.concat(customTimesAll).filter(function(v,i,a){return a.indexOf(v)===i;}).sort(function(x,y){return t2m(x)-t2m(y);});
        return allSlotsMulti.map(function(slot){
        const hasAny=vd.some(d=>appts.find(a=>a.date===selDate&&a.time===slot&&a.dentistId===d.id));
        return (
          <div key={slot} style={{display:"grid",gridTemplateColumns:"48px repeat("+vd.length+",1fr)",gap:2,marginBottom:2,minHeight:hasAny?0:36}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:6,fontSize:10,fontWeight:700,color:G.muted,flexShrink:0}}>{slot}</div>
            {vd.map(d=>{
              // Prefer active (non-cancelled/missed/rescheduled) appointments first
var a=appts.find(function(x){return x.date===selDate&&x.time===slot&&x.dentistId===d.id&&x.status!=="cancelled"&&x.status!=="rescheduled"&&x.status!=="missed";});
if(!a)a=appts.find(function(x){return x.date===selDate&&x.time===slot&&x.dentistId===d.id;});
              // If no direct match, check if this slot is an extraSlot of a longer appt
              if(!a){
                var parentAppt=appts.find(function(x){return x.date===selDate&&x.dentistId===d.id&&(x.extraSlots||[]).indexOf(slot)>=0&&x.status!=="cancelled"&&x.status!=="rescheduled"&&x.status!=="missed";});
                if(parentAppt)a=parentAppt;
              }
              const p=a?pats.find(function(x){return x.id===a.patientId;}):null;
              const an=p&&p.anamnese||{};
              const CONDS=ANAM_CONDS;
              const healthFlags=[p&&p.obs&&("⚠ "+p.obs),p&&p.allergy&&p.allergy!=="Nenhuma"&&("💊 "+p.allergy),an.allergicMeds&&("💊 Alergia Med: "+an.allergicMeds)].concat(CONDS.filter(function(c){return an[c[0]];}).map(function(c){return c[1];})).filter(Boolean);
              // Cancelado/desmarcado: libera o horário visualmente
              if(a&&(a.status==="cancelled"||a.status==="rescheduled"||a.status==="missed")){
                return <div key={d.id} style={{background:"var(--green-soft)",border:"1px dashed "+G.border,borderRadius:8,minHeight:48,display:"flex",alignItems:"center",justifyContent:"center",cursor:isDent?"default":"pointer"}}
                  onClick={function(){if(isDent)return;setEdit(null);var _isStdM=activeSlots.indexOf(slot)>=0;setF({...blank,date:selDate,time:_isStdM?slot:"",timeCustom:_isStdM?"":slot,dentistId:d.id});setModal(true);}}>
                  <span style={{fontSize:9,color:G.muted}}>{"+"}</span>
                </div>;
              }
              if(a&&a.blocked)return(
                <div key={d.id} onClick={function(){if(!isDent&&window.confirm("Desbloquear este horario?"))setAppts(function(prev){return prev.filter(function(x){return x.id!==a.id;});});}} style={{background:"var(--red-soft)",border:"1.5px solid "+G.red,borderRadius:8,minHeight:48,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:isDent?"default":"pointer",padding:"4px",gap:2}}>
                  <span style={{fontSize:14}}>🔒</span>
                  <span style={{fontSize:9,fontWeight:700,color:G.red,textAlign:"center",lineHeight:1.15,overflow:"hidden"}}>{a.blockReason||"Bloqueado"}</span>
                </div>
              );
              if(a&&(p||a.patientName))return(
                <div key={d.id} onClick={()=>setViewA(a)} style={{background:SC_BG[a.status]||SC[a.status]+"18",border:"2px solid "+SC[a.status],borderRadius:8,padding:"5px 8px",cursor:"pointer",minHeight:48,boxShadow:a.status==="pending"?"0 2px 6px rgba(230,81,0,.2)":a.status==="confirmed"?"0 2px 6px rgba(21,101,192,.15)":"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
                    <span style={{fontWeight:700,fontSize:11,color:SC[a.status],flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p?p.name:(a.patientName||"A confirmar")}</span>
                    <Bdg l={(SC_ICON[a.status]||"")+" "+SL[a.status]} col={SC[a.status]} sm/>
                  </div>
                  <div style={{fontSize:10,color:G.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.procedure}</div>
{p&&anamFalta(p)&&<div style={{marginTop:2}}><span style={{fontSize:8,background:"#D81B60",color:"#fff",borderRadius:3,padding:"1px 5px",fontWeight:800,display:"inline-block",lineHeight:1.2}}>{"⚠ SEM ANAMNESE"}</span></div>}
                  {healthFlags.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:2,marginTop:2}}>{healthFlags.map(function(f,i){return <span key={i} style={{fontSize:8,background:f.startsWith("⚠")?G.red+"20":f.startsWith("💊")?G.yellow+"20":G.blue+"15",color:f.startsWith("⚠")?G.red:f.startsWith("💊")?G.yellow:G.blue,borderRadius:3,padding:"1px 4px",fontWeight:700}}>{f}</span>;})}</div>}
                  {!isDent&&<div style={{display:"flex",gap:3,marginTop:3}}>
                    <select value={a.status} onClick={e=>e.stopPropagation()} onChange={e=>{e.stopPropagation();chSt(a.id,e.target.value);}} style={{border:"1px solid "+SC[a.status],background:"var(--surface)",borderRadius:5,padding:"1px 4px",fontSize:9,color:SC[a.status],fontWeight:700,cursor:"pointer",outline:"none"}}>
                      {Object.entries(SL).map(([k,l])=><option key={k} value={k}>{l}</option>)}
                    </select>
                    {p&&p.phone&&<button onClick={e=>{e.stopPropagation();wa(p.phone,"Olá, "+(p.name||"")+"! ✅ Consulta confirmada: "+fmt(a.date)+" às "+a.time+". Affonso Odontologia 🦷");}} style={{background:"#25D366",color:"#fff",border:"none",borderRadius:5,padding:"1px 6px",fontSize:9,fontWeight:700,cursor:"pointer"}}>WA</button>}
                  </div>}
                </div>
              );
              var selDay=new Date(selDate+"T12:00").getDay();
              var diasDent=d.dias||[1,2,3,4,5];
              var alIni=(d.almoco&&d.almoco.ini)||"";
              var alFim=(d.almoco&&d.almoco.fim)||"";
              var isOffDay=diasDent.indexOf(selDay)<0;
              var isAlmoco=alIni&&alFim&&slot>=alIni&&slot<alFim;
              var dentEntrada=d.entrada||"08:00";
              var dentSaida=d.saida||"18:00";
              var isOutHours=slot<dentEntrada||slot>=dentSaida;
              var isBlocked=isOffDay||isAlmoco||isOutHours;
              if(isBlocked){
                var bloqColor=isOffDay?"var(--red-soft)":isAlmoco?"var(--amber-soft)":"var(--purple-soft)";
                var bloqBorder=isOffDay?"#EF9A9A":isAlmoco?"#FFD54F":"#CE93D8";
                var bloqText=isOffDay?"🚫 Folga":isAlmoco?"🍽️ Almoço":"⛔ Fechado";
                var bloqTxtColor=isOffDay?"#C62828":isAlmoco?"#E65100":"#6A1B9A";
                return <div key={d.id} style={{background:bloqColor,border:"1.5px solid "+bloqBorder,borderRadius:8,minHeight:48,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:bloqTxtColor,fontWeight:700}}>{bloqText}</div>;
              }
              return <div key={d.id} onClick={function(){if(isDent)return;setEdit(null);var _isStdE=activeSlots.indexOf(slot)>=0;setF({...blank,date:selDate,time:_isStdE?slot:"",timeCustom:_isStdE?"":slot,dentistId:d.id});setModal(true);}} style={{background:isDent?"transparent":"var(--green-soft)",border:"1.5px dashed "+G.border,borderRadius:8,minHeight:48,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:10,color:G.border}} onMouseEnter={e=>{e.currentTarget.style.background=G.accent;e.currentTarget.style.color=G.primary;}} onMouseLeave={e=>{e.currentTarget.style.background="var(--green-soft)";e.currentTarget.style.color=G.border;}}>+</div>;
            })}
          </div>
        );
        }); // end allSlotsMulti.map
      })()}
    </div>
  </div>}

{agView==="semana"&&(function(){
var weekDays=week.slice(0,6);
var wkDents=isDent?dents.filter(function(d){return d.id===user.dentistId;}):(denF==="all"?dents.filter(function(d){return !isOrto(d);}):dents.filter(function(d){return d.id===Number(denF);}));
var single=wkDents.length===1?wkDents[0]:null;
var wkAppts=appts.filter(function(x){return weekDays.indexOf(x.date)>=0&&wkDents.some(function(d){return d.id===x.dentistId;});});
var customT=wkAppts.filter(function(x){return activeSlots.indexOf(x.time)<0&&!x.blocked;}).map(function(x){return x.time;});
var wSlots=Array.from(new Set(activeSlots.concat(customT))).sort(function(a,b){return t2m(a)-t2m(b);});
var colW="minmax(118px,1fr)";
var grid="46px repeat(6,"+colW+")";
function nomeCurto(nm){var p=(nm||"?").trim().split(" ");return p.length>1?p[0]+" "+p[p.length-1]:p[0];}
return <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch",borderRadius:12,border:"1px solid "+G.border,zoom:agZoom}}>
<div style={{display:"grid",gridTemplateColumns:grid,gap:2,minWidth:760,background:G.bg,padding:2}}>
<div style={{position:"sticky",left:0,zIndex:3,background:G.bg}}/>
{weekDays.map(function(ds){
var d=new Date(ds+"T12:00");var isTd=ds===td;var isSel=ds===selDate;
var cnt=wkAppts.filter(function(x){return x.date===ds&&x.status!=="cancelled"&&x.status!=="rescheduled"&&x.status!=="missed"&&!x.blocked;}).length;
return <div key={"h"+ds} onClick={function(){setSelDate(ds);setAgView("dia");}} style={{cursor:"pointer",textAlign:"center",background:isSel?G.primary:isTd?G.accent:"var(--card)",borderRadius:8,padding:"6px 2px",border:"2px solid "+(isSel?G.primary:isTd?G.primary:"transparent")}}>
<div style={{fontSize:10,fontWeight:700,color:isSel?"rgba(255,255,255,.85)":G.muted}}>{DAY[d.getDay()]}</div>
<div style={{fontSize:17,fontWeight:700,color:isSel?"#fff":isTd?G.primary:G.text}}>{d.getDate()}</div>
{cnt>0&&<div style={{background:isSel?"rgba(255,255,255,.35)":G.primary,color:"#fff",borderRadius:8,padding:"0 6px",fontSize:9,fontWeight:700,display:"inline-block"}}>{cnt}</div>}
</div>;
})}
{wSlots.map(function(slot){
return [
<div key={"t"+slot} style={{position:"sticky",left:0,zIndex:2,background:G.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:G.muted}}>{slot}</div>
].concat(weekDays.map(function(ds){
var a=appts.find(function(x){return x.date===ds&&x.time===slot&&wkDents.some(function(d){return d.id===x.dentistId;})&&x.status!=="cancelled"&&x.status!=="rescheduled"&&x.status!=="missed";});
if(!a)a=appts.find(function(x){return x.date===ds&&x.time===slot&&wkDents.some(function(d){return d.id===x.dentistId;});});
if(!a){
var parent=appts.find(function(x){return x.date===ds&&wkDents.some(function(d){return d.id===x.dentistId;})&&(x.extraSlots||[]).indexOf(slot)>=0&&x.status!=="cancelled"&&x.status!=="rescheduled"&&x.status!=="missed";});
if(parent)return <div key={ds+slot} onClick={function(){setViewA(parent);}} style={{background:"var(--purple-soft)",borderLeft:"3px solid #9C27B0",borderRadius:5,minHeight:24,display:"flex",alignItems:"center",padding:"0 6px",cursor:"pointer"}}><span style={{fontSize:9,color:"#6A1B9A",fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{"⏱️ ocupado"}</span></div>;
var off=false,kind="";
if(single){
var selDay=new Date(ds+"T12:00").getDay();
var isOff=(single.dias||[1,2,3,4,5]).indexOf(selDay)<0;
var alIni=(single.almoco&&single.almoco.ini)||"";var alFim=(single.almoco&&single.almoco.fim)||"";
var isAlm=alIni&&alFim&&slot>=alIni&&slot<alFim;
var isOut=slot<(single.entrada||"08:00")||slot>=(single.saida||"18:00");
off=isOff||isAlm||isOut;kind=isOff?"folga":isAlm?"almoco":"fechado";
}
if(off)return <div key={ds+slot} style={{background:kind==="folga"?"var(--red-soft)":kind==="almoco"?"var(--amber-soft)":"var(--purple-soft)",borderRadius:5,minHeight:24,opacity:.5}}/>;
var dId=single?single.id:(wkDents[0]&&wkDents[0].id);
return <div key={ds+slot} onClick={function(){if(isDent||!dId)return;setEdit(null);var _s=activeSlots.indexOf(slot)>=0;setF({...blank,date:ds,time:_s?slot:"",timeCustom:_s?"":slot,dentistId:dId});setModal(true);}} style={{background:"var(--surface)",border:"1px dashed "+G.border,borderRadius:5,minHeight:24,cursor:isDent?"default":"pointer"}}/>;
}
if(a.blocked)return <div key={ds+slot} style={{background:"var(--red-soft)",border:"1px solid "+G.red,borderRadius:5,minHeight:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>🔒</div>;
var nm=a.patientName||((pats.find(function(x){return x.id===a.patientId;})||{}).name)||"?";
var extras=appts.filter(function(x){return x.date===ds&&x.time===slot&&wkDents.some(function(d){return d.id===x.dentistId;})&&x.status!=="cancelled"&&x.status!=="rescheduled"&&x.status!=="missed"&&!x.blocked;}).length;
var den=dents.find(function(d){return d.id===a.dentistId;});
return <div key={ds+slot} onClick={function(){setViewA(a);}} style={{background:SC_BG[a.status]||"var(--card)",borderLeft:"3px solid "+(SC[a.status]||G.primary),borderRadius:5,minHeight:24,padding:"3px 5px",cursor:"pointer",overflow:"hidden"}}>
<div style={{fontSize:10.5,fontWeight:700,color:G.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{nomeCurto(nm)}</div>
{(a.treatment||a.procedure)&&<div style={{fontSize:8.5,color:G.muted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.treatment||a.procedure}</div>}
{wkDents.length>1&&den&&<div style={{fontSize:8,color:den.color,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{den.name.replace(/Dr\.|Dra\./i,"").trim().split(" ")[0]}{extras>1?" +"+(extras-1):""}</div>}
</div>;
}));
})}
</div>
</div>;
})()}



{showCancel&&(()=>{const a=showCancel;const p=pats.find(x=>x.id===a.patientId);return p&&<CancelWA appt={a} pat={p} onCancel={function(id){setAppts(function(prev){return prev.filter(function(x){return x.id!==id;});});}} onClose={function(){setShowCancel(null);setViewA(null);}}/>;})()}
{viewA&&(()=>{
const a=viewA;const p=pats.find(x=>x.id===a.patientId);const d=dents.find(x=>x.id===a.dentistId)||dents[0];
const _td=today();
const _allHist=p?appts.filter(function(x){return x.patientId===p.id&&x.id!==a.id;}):[];
// Próximas (futuras): data >= hoje, ordenadas da mais próxima para a mais distante
const futuras=_allHist.filter(function(x){return x.date>=_td;}).sort(function(x,y){return x.date.localeCompare(y.date)||(x.time||"").localeCompare(y.time||"");});
// Anteriores (passadas): data < hoje, ordenadas da mais recente para a mais antiga
const passadas=_allHist.filter(function(x){return x.date<_td;}).sort(function(x,y){return y.date.localeCompare(x.date)||(y.time||"").localeCompare(x.time||"");}).slice(0,20);
const hist=futuras.concat(passadas);
const HCOR={"done":"#27AE60","confirmed":"#2196F3","pending":"#FF9800","cancelled":"#F44336","missed":"var(--muted)","rescheduled":"var(--muted)"};
const HLBL={"done":"Realizada","confirmed":"Confirmada","pending":"Pendente","cancelled":"Cancelada","missed":"Faltou","rescheduled":"Desmarcada"};
var renderItem=function(h){var hd=dents.find(function(x){return x.id===h.dentistId;})||dents[0];var cor=HCOR[h.status]||G.muted;
return <div key={h.id} style={{background:G.card,borderRadius:10,padding:"10px 12px",borderLeft:"4px solid "+cor}}>
<div style={{display:"flex",justifyContent:"space-between",gap:6,alignItems:"flex-start"}}>
<div style={{flex:1}}>
<div style={{fontWeight:700,fontSize:13}}>{h.procedure}</div>
<div style={{fontSize:11,color:G.muted,marginTop:2}}>{fmt(h.date)+" às "+h.time+" · "+(hd&&hd.name||"—")}</div>
{h.treatment&&<div style={{fontSize:11,color:G.muted}}>{"📝 "+h.treatment}</div>}
</div>
<span style={{fontSize:10,fontWeight:700,color:cor,background:cor+"20",borderRadius:6,padding:"2px 6px",whiteSpace:"nowrap"}}>{HLBL[h.status]||h.status}</span>
</div>
</div>;
};
return(
<Modal open close={function(){setViewA(null);setHistTab("info");}} title="Consulta" wide ch={

<div style={{display:"flex",flexDirection:"column",gap:10}}>
<div style={{display:"flex",gap:3,marginBottom:4}}>
<button onClick={function(){setHistTab("info");}} style={{flex:1,border:"none",borderRadius:8,padding:"7px 4px",fontSize:11,fontWeight:700,cursor:"pointer",background:histTab==="info"?G.primary:"var(--surface-2)",color:histTab==="info"?"#fff":G.muted}}>{"📋 Consulta"}</button>
<button onClick={function(){setHistTab("hist");}} style={{flex:1,border:"none",borderRadius:8,padding:"7px 4px",fontSize:11,fontWeight:700,cursor:"pointer",background:histTab==="hist"?G.primary:"var(--surface-2)",color:histTab==="hist"?"#fff":G.muted}}>{"📅 Histórico ("+hist.length+")"}</button>
</div>
{histTab==="hist"&&<div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:340,overflowY:"auto"}}>
{hist.length===0&&<div style={{textAlign:"center",padding:20,color:G.muted,fontSize:13}}>Nenhuma outra consulta para este paciente</div>}
{futuras.length>0&&<div style={{fontSize:10,fontWeight:700,color:G.blue,textTransform:"uppercase",letterSpacing:".5px",marginTop:2,paddingLeft:4}}>{"🔜 Próximas consultas ("+futuras.length+")"}</div>}
{futuras.map(renderItem)}
{passadas.length>0&&<div style={{fontSize:10,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".5px",marginTop:futuras.length>0?6:2,paddingLeft:4}}>{"✅ Consultas anteriores ("+passadas.length+")"}</div>}
{passadas.map(renderItem)}
</div>}
{histTab==="info"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
{p&&p.obs&&<div style={{background:G.yellow+"18",border:"2px solid "+G.yellow,borderRadius:10,padding:"8px 12px",fontWeight:700,color:G.yellow}}>{"⚠ "+p.obs}</div>}
<div style={{background:G.accent,borderRadius:10,padding:"10px 14px",cursor:"pointer"}} onClick={()=>{setViewA(null);setOpenFolder(p);}}>
<div style={{fontSize:15,fontWeight:700,color:G.primary,textDecoration:"underline"}}>{p&&p.name}</div>
<div style={{fontSize:12,color:G.muted}}>{"📁 "+(p&&p.folder)+" · Toque para abrir prontuário"}</div>
{p&&p.since&&<div style={{fontSize:11,color:G.primary,fontWeight:600,marginTop:3}}>{"⭐ Paciente desde "+fmt(p.since)}</div>}
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
{[["Data/Hora",fmt(a.date)+" · "+a.time],["Procedimento",a.procedure],["Dentista",d.name],["Status",SL[a.status]]].map(([k,v])=>(
<div key={k} style={{background:G.bg,borderRadius:8,padding:"6px 10px"}}>
<div style={{fontSize:10,color:G.muted,fontWeight:700}}>{k}</div>
<div style={{fontWeight:600,fontSize:12}}>{v}</div>
</div>
))}
</div>
{!isDent&&<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
{Object.entries(SL).map(([k,l])=><button key={k} onClick={()=>chSt(a.id,k)} style={{border:"2px solid "+SC[k],background:a.status===k?SC[k]:SC_BG[k]||"var(--card)",color:a.status===k?"#fff":SC[k],borderRadius:20,padding:"5px 11px",fontSize:10,fontWeight:700,cursor:"pointer"}}>{(SC_ICON[k]||"")+" "+l}</button>)}
</div>}
<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
{!isDent&&p&&p.phone&&<Btn ch="📱 Confirmação" v="w" sm onClick={()=>wa(p.phone,"Olá, "+p.name+"! ✅ Consulta confirmada: "+fmt(a.date)+" às "+a.time+" - "+a.procedure+". Affonso Odontologia 🦷")}/>}
{!isDent&&p&&p.phone&&<Btn ch="📲 Véspera" v="w" sm onClick={()=>wa(p.phone,"Olá, "+p.name+"! 🔔 Lembrete: sua consulta é amanhã ("+fmt(a.date)+") às "+a.time+" - "+a.procedure+". Responda 1 para confirmar ou 2 para cancelar. Affonso Odontologia 🦷")}/>}
{!isDent&&p&&p.phone&&<Btn ch="🔄 Paciente Cancelou" v="r" sm onClick={function(){chSt(a.id,"cancelled");wa(p.phone,"Olá, "+p.name+"! Entendemos que nao podera comparecer. Gostaria de remarcar? Responda SIM. Affonso Odontologia");setViewA(null);}}/>}
{user.level>=3&&<button onClick={()=>{setViewA(null);setHistTab("info");setDetetive(a);}} title="Quem agendou/alterou?" style={{background:"var(--card)",border:"1.5px solid "+G.border,borderRadius:"50%",width:30,height:30,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,lineHeight:1,boxShadow:"2px 2px 5px var(--nm-dark),-2px -2px 5px var(--nm-light)",flexShrink:0}}>{"\ud83d\udd75\ufe0f"}</button>}
{!isDent&&<Btn ch="Editar" sm onClick={()=>{setEdit(a);var isStdSlot=SLOTS.indexOf(a.time)>=0;
var fdata=Object.assign({},a,{
  patientId:String(a.patientId||""),
  dentistId:String(a.dentistId),
  time:isStdSlot?a.time:"",
  timeCustom:isStdSlot?"":a.time
});
setF(fdata);setViewA(null);setModal(true);}}/>}
{!isDent&&<Btn ch="Remover" v="r" sm onClick={()=>{setAppts(prev=>prev.filter(x=>x.id!==a.id));setViewA(null);}}/> }
<Btn ch="Fechar" v="g" sm onClick={()=>setViewA(null)}/>
</div>
</div>}
</div>
}/>
);
})()}

<Modal open={modal} close={()=>setModal(false)} title={edit?"Editar Agendamento":"Novo Agendamento"} wide ch={

<div style={{display:"flex",flexDirection:"column",gap:11}}>
<Sel lb="Dentista" val={String(f.dentistId)} set={upd("dentistId")} opts={dents.map(d=>({v:d.id,l:d.name}))}/>
{/* Paciente - busca cadastrado OU nome manual */}
<div>
<div style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px",marginBottom:4}}>Paciente</div>
<div style={{display:"flex",gap:6,marginBottom:6}}>
<button onClick={()=>setF(p=>({...p,useManual:false,patientName:""}))} style={{flex:1,border:`2px solid ${!f.useManual?G.primary:G.border}`,background:!f.useManual?G.primary:"var(--card)",color:!f.useManual?"#fff":G.muted,borderRadius:8,padding:"6px",fontSize:11,fontWeight:700,cursor:"pointer"}}>🔍 Cadastrado</button>
<button onClick={()=>setF(p=>({...p,useManual:true,patientId:""}))} style={{flex:1,border:`2px solid ${f.useManual?G.red:G.border}`,background:f.useManual?G.red:"var(--card)",color:f.useManual?"#fff":G.muted,borderRadius:8,padding:"6px",fontSize:11,fontWeight:700,cursor:"pointer"}}>✏️ Digitar nome</button>
</div>
{f.useManual
?<div>
<Inp val={f.patientName||""} set={upd("patientName")} ph="Nome completo + telefone do paciente"/>
<div style={{background:"var(--amber-soft)",borderRadius:8,padding:"5px 9px",fontSize:11,color:"#E65100",marginTop:4}}>⚠️ Aparecerá em vermelho na agenda - cadastro parcial</div>
</div>
:<div>
<PatSearch val={f.patientId} set={upd("patientId")} pats={pats}/>
{!f.patientId&&<div style={{fontSize:11,color:G.muted,marginTop:4}}>Não encontrou? Use <strong>"✏️ Digitar nome"</strong> acima</div>}
</div>
}
</div>
{/* Data e Horário */}
<R2 a={<Inp lb="Data" val={f.date} set={upd("date")} type="date"/>} b={
<div style={{display:"flex",flexDirection:"column",gap:4}}>
<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Horário</label>
<select value={f.time} onChange={e=>upd("time")(e.target.value)} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 8px",fontSize:13,outline:"none",background:"var(--surface)"}}>
{[{v:"",l:"Selecione..."},...activeSlots].map(o=><option key={o.v??o} value={o.v??o}>{o.l??o}</option>)}
</select>
<input value={f.timeCustom||""} onChange={e=>upd("timeCustom")(e.target.value)} placeholder="Horário personalizado ex: 09:15" style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"7px 8px",fontSize:12,outline:"none"}}/>
</div>
}/>
{/* Duração */}
<div style={{display:"flex",flexDirection:"column",gap:4}}>
<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Duração da Consulta</label>
<select value={String(f.duration||30)} onChange={e=>{const d=Number(e.target.value);setF(p=>({...p,duration:d}));}} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"9px 12px",fontSize:14,outline:"none",background:"var(--surface)"}}>
<option value="30">30 minutos</option>
<option value="60">1 hora</option>
<option value="90">1h 30min</option>
<option value="120">2 horas</option>
<option value="150">2h 30min</option>
<option value="180">3 horas</option>
</select>
{Number(f.duration||30)>30&&<div style={{background:G.accent,borderRadius:8,padding:"5px 9px",fontSize:11,color:G.primary}}>⏱️ Ocupa slots até: {(()=>{const t=f.timeCustom||f.time;if(!t)return "...";let [h,m]=t.split(":").map(Number);m+=Number(f.duration||30)-30;while(m>=60){m-=60;h++;}return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;})()}</div>}
</div>
{/* Procedimento com opção manual */}
<div style={{display:"flex",flexDirection:"column",gap:4}}>
<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Procedimento</label>
<select value={f.procedure} onChange={e=>{upd("procedure")(e.target.value);const pr=procs.find(p=>p.name===e.target.value);if(pr&&!f.value)upd("value")(String(pr.price));}} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 8px",fontSize:13,outline:"none",background:"var(--surface)"}}>
<option value="">Selecione...</option>
<option value="Avaliação">Avaliação</option>
<option value="Retorno">Retorno</option>
<option value="Urgência">Urgência</option>
{[...procs].sort((a,b)=>(a.name||"").localeCompare(b.name||"","pt")).map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
</select>
<input value={f.procedureCustom||""} onChange={e=>{upd("procedureCustom")(e.target.value);if(e.target.value)upd("procedure")(e.target.value);}} placeholder="Ou digite outro procedimento..." style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"7px 8px",fontSize:12,outline:"none"}}/>
</div>
<R2 a={<Inp lb="Valor (R$)" val={f.value} set={upd("value")} type="number"/>} b={<Sel lb="Status" val={f.status} set={upd("status")} opts={Object.entries(SL).map(([v,l])=>({v,l}))}/>}/>
<Inp lb="Descrição do Tratamento" val={f.treatment} set={upd("treatment")} ph="Ex: Restauração dente 36"/>
<label style={{display:"flex",alignItems:"center",gap:9,fontSize:13,cursor:"pointer",background:f.fixo?G.primary+"12":G.bg,borderRadius:8,padding:"9px 12px",border:"1.5px solid "+(f.fixo?G.primary:G.border)}}>
  <input type="checkbox" checked={!!f.fixo} onChange={e=>upd("fixo")(e.target.checked)} style={{accentColor:G.primary,width:16,height:16}}/>
  <div>
    <strong style={{color:f.fixo?G.primary:G.text}}>📌 Despesa Fixa (repete todo mês)</strong>
    <div style={{fontSize:11,color:G.muted}}>Aparece automaticamente todo mês sem o valor</div>
  </div>
</label>
{f.fixo&&<Inp lb="Dia de Vencimento" val={f.diaVenc||""} set={upd("diaVenc")} type="number" ph="Ex: 10 (dia 10 de cada mês)" min="1" max="31"/>}
<SC2 save={save} cancel={()=>setModal(false)}/>
</div>
}/>
{/* Modal de bloqueio de horário */}
{blockModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
<div style={{background:"var(--surface)",borderRadius:16,width:"100%",maxWidth:420,boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${G.border}`}}>
<span style={{fontFamily:"'Cormorant Garamond'",fontSize:20}}>🔒 Bloquear Horário</span>
<button onClick={()=>setBlockModal(null)} style={{border:"none",background:"none",fontSize:24,cursor:"pointer",color:G.muted}}>×</button>
</div>
<div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
<div style={{background:G.accent,borderRadius:8,padding:"8px 12px",fontSize:13,color:G.primary,fontWeight:600}}>{blockModal.time} - {dents.find(d=>d.id===Number(blockModal.dentistId))?.name}</div>
<div style={{display:"flex",flexDirection:"column",gap:6}}>
<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase"}}>Motivo do bloqueio</label>
<div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:4}}>
{["Saída antecipada","Reunião","Almoço extra","Procedimento interno","Outro"].map(m=>(
<button key={m} onClick={()=>setBlockReason(m)} style={{border:`2px solid ${blockReason===m?G.red:G.border}`,background:blockReason===m?"var(--red-soft)":"var(--card)",color:blockReason===m?G.red:G.muted,borderRadius:8,padding:"5px 9px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{m}</button>
))}
</div>
<input value={blockReason} onChange={e=>setBlockReason(e.target.value)} placeholder="Ou digite o motivo..." style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:13,outline:"none"}}/>
</div>
<div style={{display:"flex",gap:9,justifyContent:"flex-end",paddingTop:12,borderTop:`1px solid ${G.border}`}}>
<button onClick={()=>setBlockModal(null)} style={{border:`1.5px solid ${G.primary}`,background:"transparent",color:G.primary,borderRadius:8,padding:"8px 16px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
<button onClick={()=>saveBlock(blockModal.date,blockModal.time,blockModal.dentistId)} style={{background:G.red,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:14,fontWeight:700,cursor:"pointer"}}>🔒 Bloquear</button>
</div>
</div>
</div>

  </div>}
{openFolder&&<PatientFolder pat={openFolder} pats={pats} setPats={setPats} recs={recs||[]} setRecs={setRecs||(()=>{})} treats={treats||[]} setTreats={setTreats||(()=>{})} budgets={budgets||[]} setBudgets={setBudgets||(()=>{})} appts={appts} dents={dents} procs={procs} user={user} onClose={()=>setOpenFolder(null)}/>}
</div>
);
}

// ══════════════════════════════════════════════════════════
// PACIENTES - list with folder button
// ══════════════════════════════════════════════════════════
function Pacientes({pats,setPats,recs,setRecs,treats,setTreats,budgets,setBudgets,appts,dents,procs,user,addLog,delPat}){
const [srch,setSrch]=useState("");
const [pPage,setPPage]=useState(0);
const PER_PAGE=50;
const [openFolder,setOpenFolder]=useState(null);
const [pm,setPm]=useState(false);const [ep,setEp]=useState(null);
const b0={name:"",dob:"",phone:"",phone2:"",email:"",cpf:"",rg:"",blood:"",allergy:"",insurance:"",notes:"",folder:"",since:today(),rx:"",nf:"",obs:"",origem:"",genero:"",anamnese:{hypertension:false,diabetes:false,heartDisease:false,bleeding:false,osteoporosis:false,kidneyDisease:false,liverDisease:false,thyroid:false,epilepsy:false,cancer:false,pregnant:false,smoking:false,allergicMeds:"",otherConditions:"",medications:"",notes:""}};
const [pf,setPf]=useState(b0);const fp=k=>v=>setPf(p=>({...p,[k]:v}));
const bd={name:"",specialty:"Clinico Geral",commission:40,cro:"",color:UCOLS[0],dias:[1,2,3,4,5],entrada:"08:00",saida:"18:00",almoco:{ini:"12:00",fim:"13:00"}};
const [dm,setDm]=useState(false);
const [bkpDone,setBkpDone]=useState(false);
const [restoreDone,setRestoreDone]=useState("");
const [ed,setEd]=useState(null);
const [df,setDf]=useState(bd);
const upDf=k=>v=>setDf(p=>({...p,[k]:v}));
const ft=pats.filter(p=>p.name.toLowerCase().includes(srch.toLowerCase())||p.phone.includes(srch)||(p.folder||"").includes(srch)||(p.cpf||"").includes(srch));
const totalFt=ft.length;const maxPage=Math.max(0,Math.ceil(totalFt/PER_PAGE)-1);const curPage=Math.min(pPage,maxPage);const pageItems=ft.slice(curPage*PER_PAGE,curPage*PER_PAGE+PER_PAGE);
const normNome=function(s){return(s||"").toLowerCase().trim();};
const [dupModal,setDupModal]=useState(null);
const [delModal,setDelModal]=useState(null);
const savePat=()=>{
if(!pf.name)return;
const isNew=!ep;
if(isNew){
const nm=normNome(pf.name);
const fone=(pf.phone||"").replace(/\D/g,"");
const cpf2=(pf.cpf||"").replace(/\D/g,"");
const sim=pats.filter(function(p){
const pnm=normNome(p.name);
const pf2=(p.phone||"").replace(/\D/g,"");
const pc=(p.cpf||"").replace(/\D/g,"");
const partsN=nm.split(" ").filter(Boolean);
const partsP=pnm.split(" ").filter(Boolean);
const contido=nm.length>3&&pnm.length>3&&Math.min(nm.length,pnm.length)>=5&&(nm.indexOf(pnm)>=0||pnm.indexOf(nm)>=0);
const primUlt=partsN.length>=2&&partsP.length>=2&&partsN[0]===partsP[0]&&partsN[partsN.length-1]===partsP[partsP.length-1]&&partsN[0].length>=3;
const nomeP=(nm.length>3&&pnm.length>3&&pnm===nm)||contido||primUlt;
const foneP=fone.length>=10&&pf2===fone;
const cpfP=cpf2.length>=11&&pc===cpf2;
return nomeP||foneP||cpfP;
});
if(sim.length>0){
setDupModal({similares:sim,onConfirm:function(){
const obj2={...pf,id:nid(pats)};
setPats(function(prev){return[...prev,obj2];});
if(addLog)addLog("paciente","Criou paciente: "+pf.name,pf.name);
setPm(false);setDupModal(null);
}});
return;
}
}
const obj={...pf,id:ep?ep.id:nid(pats)};
setPats(function(prev){return ep?prev.map(function(p){return p.id===ep.id?obj:p;}):[...prev,obj];});
if(addLog)addLog("paciente",(isNew?"Criou paciente: ":"Editou cadastro de ")+pf.name,pf.name);
setPm(false);
};

return <div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">

<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
<h2 style={{fontFamily:"'Cormorant Garamond'",fontSize:26}}>Pacientes</h2>
<Btn ch="+ Novo Paciente" onClick={()=>{setEp(null);setPf(b0);setPm(true);}}/>
</div>
<Inp val={srch} set={v=>{setSrch(v);setPPage(0);}} ph="🔍 Nome, CPF, telefone ou nº pasta"/>
{pageItems.map(p=><div key={p.id} style={{background:G.card,borderRadius:13,boxShadow:"0 1px 5px rgba(0,0,0,.07)",padding:"12px 15px",display:"flex",alignItems:"center",gap:11}}>
<div style={{width:42,height:42,borderRadius:"50%",background:G.accent,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cormorant Garamond'",fontSize:20,color:G.primary,flexShrink:0,cursor:"pointer"}} onClick={()=>setOpenFolder(p)}>{p.name[0]}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontWeight:700,fontSize:13,cursor:"pointer"}} onClick={()=>setOpenFolder(p)}>{p.name}<span style={{fontSize:11,color:G.muted,fontWeight:400}}> · {age(p.dob)} · Ficha: {p.folder||"--"}</span></div>
<div style={{color:G.muted,fontSize:12}}>{user.level>=2?p.phone:"••••••••••"}</div>
{p.since&&<div style={{fontSize:11,color:G.primary,fontWeight:600}}>{"⭐ Paciente desde "+fmt(p.since)}</div>}
{p.anamPend&&<div style={{background:G.success+"22",border:"1px solid "+G.success,borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700,color:G.success,marginTop:2,display:"inline-block"}}>\u2705 Anamnese nova - revisar</div>}
{p.obs&&<div style={{background:G.red+"20",border:`1px solid ${G.red}`,borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700,color:G.red,marginTop:2,display:"inline-block"}}>⚠ {p.obs.slice(0,45)}</div>}
{(p.allergy&&p.allergy!=="Nenhuma"&&!p.obs)&&<div style={{background:G.yellow+"20",border:`1px solid ${G.yellow}`,borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700,color:G.yellow,marginTop:2,display:"inline-block"}}>⚠ {p.allergy}</div>}
</div>
<div style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"flex-end"}}>
<Btn ch="📋 Prontuário" sm onClick={()=>setOpenFolder(p)}/>
{user.level>=2&&<Btn ch="✏️" v="g" sm onClick={()=>{setEp(p);setPf({...p});setPm(true);}}/>}
{p.phone&&user.level>=2&&<Btn ch="📱" v="w" sm onClick={()=>wa(p.phone,`Olá ${p.name}! 😊`)}/>}
{user.level>=2&&<Btn ch="🗑️" v="r" sm onClick={()=>{const td=appts.some(a=>a.patientId===p.id)||recs.some(r=>r.patientId===p.id);setDelModal({pat:p,temDados:td});}}/>}
</div>
</div>)}

{totalFt>PER_PAGE&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,padding:"4px 0 2px"}}>
{curPage>0&&<Btn ch="‹ Anterior" v="g" sm onClick={()=>setPPage(p=>Math.max(0,p-1))}/>}
<div style={{fontSize:12.5,color:G.muted,fontWeight:600}}>{(curPage*PER_PAGE+1)+" a "+Math.min(totalFt,curPage*PER_PAGE+PER_PAGE)+" de "+totalFt+" pacientes"}</div>
{curPage<maxPage&&<Btn ch="Próxima ›" v="g" sm onClick={()=>setPPage(p=>Math.min(maxPage,p+1))}/>}
</div>}
{totalFt===0&&<div style={{textAlign:"center",color:G.muted,fontSize:13,padding:"10px 0"}}>Nenhum paciente encontrado.</div>}

{dupModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>

<div style={{background:"var(--surface)",borderRadius:16,width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
<div style={{background:"var(--yellow)",borderRadius:"16px 16px 0 0",padding:"14px 18px"}}><div style={{fontWeight:700,color:"#fff",fontSize:15}}>⚠️ Possível Duplicidade</div></div>
<div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
<div style={{fontSize:13}}>Paciente(s) com dados similares encontrado(s):</div>
<div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:"45vh",overflowY:"auto"}}>
{dupModal.similares.slice(0,10).map(function(p){return(<div key={p.id} style={{background:"var(--surface)",borderRadius:10,padding:"10px 13px"}}><div style={{fontWeight:700,fontSize:13,wordBreak:"break-word"}}>{p.name}</div><div style={{fontSize:12,color:"var(--muted)"}}>{p.folder?("Ficha: "+p.folder):""}{p.phone?(" · "+p.phone):""}</div></div>);})}
{dupModal.similares.length>10&&<div style={{fontSize:12,color:"var(--muted)"}}>{"+ "+(dupModal.similares.length-10)+" outro(s)"}</div>}
</div>
<div style={{fontSize:12,color:"var(--muted)"}}>Deseja cadastrar mesmo assim?</div>
<div style={{display:"flex",gap:9,justifyContent:"flex-end",paddingTop:8,borderTop:"1px solid var(--border)"}}>
<button onClick={()=>setDupModal(null)} style={{border:"1.5px solid var(--primary)",background:"transparent",color:"var(--primary)",borderRadius:8,padding:"8px 16px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
<button onClick={dupModal.onConfirm} style={{background:"var(--yellow)",color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:14,fontWeight:700,cursor:"pointer"}}>Cadastrar Mesmo Assim</button>
</div></div></div></div>}
{delModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
<div style={{background:"var(--surface)",borderRadius:16,width:"100%",maxWidth:420,boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
<div style={{background:"var(--red)",borderRadius:"16px 16px 0 0",padding:"14px 18px"}}><div style={{fontWeight:700,color:"#fff",fontSize:15}}>🗑️ Excluir Paciente</div></div>
<div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
<div style={{fontWeight:700,fontSize:14}}>{delModal.pat.name}</div>
{delModal.temDados&&<div style={{background:"var(--red-soft)",border:"1.5px solid var(--red)",borderRadius:10,padding:"10px 13px",fontSize:13,color:"var(--red)",fontWeight:600}}>⚠️ Este paciente tem consultas e atendimentos. Todos os dados serão perdidos!</div>}
<div style={{fontSize:13,color:"var(--muted)"}}>Esta ação não pode ser desfeita.</div>
<div style={{display:"flex",gap:9,justifyContent:"flex-end",paddingTop:8,borderTop:"1px solid var(--border)"}}>
<button onClick={()=>setDelModal(null)} style={{border:"1.5px solid var(--primary)",background:"transparent",color:"var(--primary)",borderRadius:8,padding:"8px 16px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
<button onClick={async ()=>{if(delModal._busy)return;setDelModal(Object.assign({},delModal,{_busy:true}));var _r=null;try{_r=delPat?await delPat(delModal.pat.id):{ok:true};}catch(e){_r={ok:false,msg:String((e&&e.message)||e)};}if(_r&&_r.ok){setPats(prev=>prev.filter(x=>x.id!==delModal.pat.id));if(addLog)addLog("paciente","Excluiu paciente: "+delModal.pat.name,delModal.pat.name);setDelModal(null);}else{alert("Não foi possível excluir no servidor"+((_r&&_r.msg)?(": "+_r.msg):".")+" Verifique a conexão e tente novamente.");setDelModal(prev=>prev?Object.assign({},prev,{_busy:false}):prev);}}} style={{background:"var(--red)",color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:14,fontWeight:700,cursor:"pointer",opacity:delModal._busy?0.6:1}}>{delModal._busy?"Excluindo...":"Excluir Permanentemente"}</button>
</div></div></div></div>}
{openFolder&&<PatientFolder pat={openFolder} pats={pats} setPats={setPats} recs={recs} setRecs={setRecs} treats={treats} setTreats={setTreats} budgets={budgets} setBudgets={setBudgets} appts={appts} dents={dents} procs={procs} user={user} onClose={()=>setOpenFolder(null)}/>}

<Modal open={pm} close={()=>setPm(false)} title={ep?"Editar Paciente":"Novo Paciente"} wide ch={<div style={{display:"flex",flexDirection:"column",gap:11}}>
  <Inp lb="Nome completo *" val={pf.name} set={fp("name")}/>
  <R2 a={<Inp lb="Nº da Ficha" val={pf.folder} set={fp("folder")} ph="F-0001"/>} b={<Inp lb="Nº do RX" val={pf.rx} set={fp("rx")} ph="RX-2024-001"/>}/>
  <R2 a={<Inp lb="Ref. Nota Fiscal" val={pf.nf} set={fp("nf")}/>} b={<Inp lb="CPF" val={pf.cpf} set={fp("cpf")}/>}/>
  <R2 a={<DatePick lb="Data de Nascimento" val={pf.dob} set={fp("dob")}/>} b={<Inp lb="Telefone (WhatsApp)" val={pf.phone} set={fp("phone")} ph="11999990000"/>}/>
  <Inp lb="Telefone 2 (fixo) -- não recebe WhatsApp" val={pf.phone2||""} set={fp("phone2")} ph="1125249975"/>
          <R2 a={<DatePick lb="Paciente desde" val={pf.since||today()} set={fp("since")}/>} b={<Inp lb="Plano de Saude" val={pf.insurance||""} set={fp("insurance")} ph="Ex: Unimed"/>}/>
  <R2 a={<Inp lb="E-mail" val={pf.email} set={fp("email")}/>} b={<Sel lb="Tipo Sanguíneo" val={pf.blood} set={fp("blood")} opts={["","A+","A-","B+","B-","O+","O-","AB+","AB-"]}/>}/>
  <R2 a={<Inp lb="Alergia" val={pf.allergy} set={fp("allergy")}/>} b={<Inp lb="Plano de Saúde" val={pf.insurance} set={fp("insurance")}/>}/>
  <div style={{display:"flex",flexDirection:"column",gap:4}}>
    <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Sexo</label>
    <div style={{display:"flex",gap:8}}>
      {[["M","👨 Masculino"],["F","👩 Feminino"],["","Não informado"]].map(([v,l])=><button key={v} onClick={()=>setPf(p=>({...p,genero:v}))} style={{flex:1,border:`2px solid ${pf.genero===v?G.primary:G.border}`,background:pf.genero===v?G.primary:"var(--card)",color:pf.genero===v?"#fff":G.muted,borderRadius:8,padding:"7px 4px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{l}</button>)}
    </div>
  </div>
  <Txt lb="⚠ Obs. Importante (alergia grave, destaque vermelho)" val={pf.obs} set={fp("obs")} rows={2}/>
  <Txt lb="Observações Gerais" val={pf.notes} set={fp("notes")} rows={2}/>
  <div style={{display:"flex",flexDirection:"column",gap:4}}>
    <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Como nos conheceu?</label>
    <select value={pf.origem||""} onChange={e=>setPf(p=>({...p,origem:e.target.value}))} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"9px 12px",fontSize:14,outline:"none",background:"var(--surface)"}}>
      <option value="">Não informado</option>
      {["Indicação","Instagram","Já era paciente","Urgência","Passando na rua","Google","Outro"].map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  </div>
  <SC2 save={savePat} cancel={()=>setPm(false)}/>
</div>}/>


  </div>;
}

// ══════════════════════════════════════════════════════════
// PRÓTESES - with editable proc types
// ══════════════════════════════════════════════════════════
function Proteses({pros,setPros,pats,dents,labs,prosProcs,setProsProcs,user}){
const [filt,setFilt]=useState("today");const [modal,setModal]=useState(false);const [edit,setEdit]=useState(null);const [srch,setSrch]=useState("");// V212 busca paciente
const [procModal,setProcModal]=useState(false);const [procForm,setProcForm]=useState({name:"",price:""});const [editProc,setEditProc]=useState(null);
const b0={patientId:"",dentistId:1,labId:"",type:PROS_T[0],proc:"",tooth:"",sent:today(),due:"",returned:"",status:"waiting",notes:"",price:"",qty:"1"};
const [f,setF]=useState(b0);const upd=k=>v=>setF(p=>({...p,[k]:v}));
const t=today();
// Atrasadas: aguardando com previsão anterior a hoje (mais antiga = mais atrasada vem primeiro)
const lateP=pros.filter(p=>p.status==="waiting"&&p.due&&p.due<t).sort((a,b)=>(a.due||"").localeCompare(b.due||""));
// Exatamente hoje
const todayOnly=pros.filter(p=>p.due===t&&p.status==="waiting");
// "Hoje" mostra atrasadas (destaque vermelho) em primeiro + as de hoje
const todP=[...lateP,...todayOnly];
const flt=filt==="today"?todP:filt==="all"?pros:pros.filter(p=>p.status===filt).sort((a,b)=>(a.due||"9999-99-99").localeCompare(b.due||"9999-99-99"));
// V212: busca de paciente dentro do relatorio de proteses
const nrmP=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const srchAct=srch.trim().length>0;
const srchList=srchAct?pros.filter(p=>{const pt=pats.find(x=>x.id===p.patientId);return pt&&nrmP(pt.name).indexOf(nrmP(srch))>=0;}).filter(p=>(filt==="all"||filt==="today")?true:p.status===filt).sort((a,b)=>String(b.sent||"").localeCompare(String(a.sent||""))):null;
const flt2=srchAct?srchList:flt;
const srchPatIds=srchAct?[...new Set(srchList.map(p=>p.patientId))]:[];
const srchTot=srchAct?srchList.reduce((s,p)=>s+(Number(p.price)||0)*(Number(p.qty)||1),0):0;
const srchInst=srchAct?srchList.filter(p=>p.status==="placed").length:0;
const save=()=>{if(!f.patientId||!f.labId)return alert("Informe paciente e laboratório");const obj={...f,patientId:Number(f.patientId),dentistId:Number(f.dentistId),labId:Number(f.labId),price:Number(f.price||0),qty:Number(f.qty)||1,id:edit?edit.id:nid(pros),_ts:Date.now()};setPros(prev=>edit?prev.map(p=>p.id===edit.id?obj:p):[...prev,obj]);setModal(false);};
const saveProc=()=>{if(!procForm.name)return;const obj={name:procForm.name,price:Number(procForm.price)||0,id:editProc?editProc.id:nid(prosProcs)};setProsProcs(prev=>editProc?prev.map(p=>p.id===editProc.id?obj:p):[...prev,obj]);setProcForm({name:"",price:""});setEditProc(null);};

return <div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">

<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
<h2 style={{fontFamily:"'Cormorant Garamond'",fontSize:26}}>Próteses</h2>
<div style={{display:"flex",gap:7}}><Btn ch="⚙️ Procedimentos" v="g" sm onClick={()=>setProcModal(true)}/><Btn ch="+ Nova Prótese" onClick={()=>{setEdit(null);setF(b0);setModal(true);}}/></div>
</div>
<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
{[{k:"today",l:`Hoje (${todP.length})`,c:G.orange},{k:"waiting",l:"Aguardando",c:G.yellow},{k:"returned",l:"Retornou",c:G.blue},{k:"placed",l:"Instaladas",c:G.success},{k:"all",l:"Todas",c:G.muted}].map(({k,l,c})=><button key={k} onClick={()=>setFilt(k)} style={{border:`2px solid ${filt===k?c:G.border}`,background:filt===k?c:"var(--card)",color:filt===k?"#fff":G.muted,borderRadius:20,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{l}</button>)}
</div>
{/* V212: campo de busca de paciente */}
<div style={{display:"flex",alignItems:"center",gap:8,background:G.card,borderRadius:12,padding:"10px 14px",boxShadow:"inset 3px 3px 8px var(--nm-dark),inset -3px -3px 8px #ffffff"}}>
<span style={{fontSize:15}}>{"\uD83D\uDD0E"}</span>
<input value={srch} onChange={e=>setSrch(e.target.value)} placeholder="Buscar paciente no relatório..." style={{flex:1,border:"none",background:"none",outline:"none",fontSize:14,fontFamily:"'Manrope'",color:G.text}}/>
{srchAct&&<button onClick={()=>setSrch("")} style={{border:"none",background:"none",fontSize:18,cursor:"pointer",color:G.muted,lineHeight:1}}>{"\u00d7"}</button>}
</div>
{srchAct&&srchList.length===0&&<div style={{background:G.card,borderRadius:12,padding:22,textAlign:"center",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",fontSize:13,color:G.muted}}>Nenhum trabalho protético encontrado para "{srch}"</div>}
{srchAct&&srchPatIds.length===1&&(()=>{const pt=pats.find(x=>x.id===srchPatIds[0]);return <div style={{background:`linear-gradient(135deg,${G.primary},#3e7a60)`,borderRadius:14,padding:"15px 17px",color:"#fff",boxShadow:`0 4px 14px ${G.primary}55`}}>
<div style={{fontFamily:"'Cormorant Garamond'",fontSize:20,fontWeight:700}}>{pt?.name}</div>
<div style={{fontSize:11,opacity:.75,marginBottom:9}}>P.{pt?.folder||"--"} · Histórico protético{filt!=="all"&&filt!=="today"?" (filtro: "+PROS_SL[filt]+")":""}</div>
<div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
{[["Trabalhos",srchList.length],["Instaladas",srchInst],["Custo Lab Total",cur(srchTot)]].map(([lb,vl])=><div key={lb} style={{flex:1,minWidth:95,background:"rgba(255,255,255,.13)",borderRadius:10,padding:"8px 11px"}}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:".4px",opacity:.8}}>{lb}</div><div style={{fontSize:16,fontWeight:800,marginTop:2}}>{vl}</div></div>)}
</div>
</div>;})()}
{srchAct&&srchPatIds.length>1&&<div style={{background:G.card,borderRadius:10,padding:"10px 14px",fontSize:12,color:G.muted,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>{"\uD83D\uDD0E"} {srchPatIds.length} pacientes encontrados ({srchList.length} trabalhos, total {cur(srchTot)}) — digite mais letras para ver o resumo individual</div>}
{!srchAct&&filt==="today"&&todP.length===0&&<div style={{background:G.card,borderRadius:12,padding:28,textAlign:"center",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}><div style={{fontSize:28,marginBottom:6}}>✅</div><div style={{fontWeight:700,color:G.success}}>Nenhum trabalho previsto para hoje!</div></div>}
{!srchAct&&filt==="today"&&lateP.length>0&&<div style={{background:G.red,borderRadius:10,padding:"11px 14px",boxShadow:`0 2px 10px ${G.red}55`}}><div style={{fontWeight:700,color:"#fff",fontSize:14}}>⚠️ {lateP.length} prótese(s) ATRASADA(S)!</div><div style={{color:"#fff",opacity:.85,fontSize:12,marginTop:2}}>Cobrar o laboratório com urgência</div></div>}
{!srchAct&&filt==="today"&&todayOnly.length>0&&<div style={{background:G.orange+"15",border:`2px solid ${G.orange}`,borderRadius:10,padding:"10px 14px"}}><div style={{fontWeight:700,color:G.orange}}>🔔 {todayOnly.length} trabalho(s) para fechar hoje</div></div>}
<div style={{display:"flex",flexDirection:"column",gap:9}}>
{flt2.map(p=>{const pat=pats.find(x=>x.id===p.patientId);const den=dents.find(x=>x.id===p.dentistId)||dents[0];const lab=labs.find(x=>x.id===p.labId);const late=p.status==="waiting"&&p.due&&p.due<t;const isT=p.due===t&&p.status==="waiting";
return <div key={p.id} style={late?{background:G.red+"10",borderRadius:12,padding:"13px 15px",border:`2px solid ${G.red}`,boxShadow:`0 2px 12px ${G.red}40`}:{background:G.card,borderRadius:12,padding:"13px 15px",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",borderLeft:`4px solid ${isT?G.orange:PROS_SC[p.status]}`}}>
<div style={{display:"flex",gap:11,flexWrap:"wrap"}}>
<div style={{flex:1,minWidth:170}}>
<div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}><span style={{fontWeight:700,fontSize:13,color:late?G.red:G.text}}>{pat?.name}</span><span style={{fontSize:11,color:G.muted}}>P.{pat?.folder}</span><Bdg l={PROS_SL[p.status]} col={PROS_SC[p.status]} sm/>{late&&<Bdg l="⚠ ATRASADO" col={G.red} sm/>}{isT&&!late&&<Bdg l="📅 HOJE" col={G.orange} sm/>}</div>
<div style={{fontSize:12}}>🦷 <strong>{p.type}</strong>{(p.qty||1)>1?" ×"+p.qty:""} -- {p.proc}</div>
<div style={{fontSize:11,color:G.muted,marginTop:2}}>Dente: {p.tooth||"--"} · 🏥 {lab?.name} · Enviado: {fmt(p.sent)} · Previsão: {fmt(p.due)}{p.returned?` · Retornou: ${fmt(p.returned)}`:""}</div>
<div style={{fontSize:11,color:den.color}}>👨‍⚕️ {den.name}</div>
<div style={{fontSize:11,color:G.primary,fontWeight:700}}>💰 Custo Lab: {cur((p.price||0)*(p.qty||1))}{(p.qty||1)>1?" ("+p.qty+" × "+cur(p.price)+")":""}</div>
{p.notes&&<div style={{fontSize:10,color:G.muted,fontStyle:"italic"}}>{p.notes}</div>}
</div>
<div style={{display:"flex",flexDirection:"column",gap:5,alignItems:"flex-end"}}>
{p.status==="waiting"&&<Btn ch="📦 Chegou!" sm onClick={()=>setPros(prev=>prev.map(x=>x.id===p.id?{...x,status:"returned",returned:t,_ts:Date.now()}:x))}/>}
{p.status==="returned"&&<Btn ch="✓ Instalada" v="y" sm onClick={()=>setPros(prev=>prev.map(x=>x.id===p.id?{...x,status:"placed",_ts:Date.now()}:x))}/>}
{lab?.phone&&<Btn ch="📱 Lab" v="w" sm onClick={()=>wa(lab.phone,`Olá ${lab.name}! Verificando ${p.type} paciente ${pat?.name}, dente ${p.tooth}. Enviada ${fmt(p.sent)}, previsão ${fmt(p.due)}.`)}/>}
<Btn ch="Editar" v="g" sm onClick={()=>{setEdit(p);setF({...p,patientId:String(p.patientId),dentistId:String(p.dentistId),labId:String(p.labId),price:String(p.price||""),qty:String(p.qty||1)});setModal(true);}}/>
<Btn ch="✕ Excluir" v="r" sm onClick={()=>setPros(prev=>prev.filter(x=>x.id!==p.id))}/>
</div>
</div>
</div>;})}
</div>
{modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
<div style={{background:G.card,borderRadius:16,width:"100%",maxWidth:620,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${G.border}`}}>
<span style={{fontFamily:"'Cormorant Garamond'",fontSize:20}}>{edit?"Editar Prótese":"Nova Prótese"}</span>
<button onClick={()=>setModal(false)} style={{border:"none",background:"none",fontSize:24,cursor:"pointer",color:G.muted}}>×</button>
</div>
<div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
<PatSearch lb="Paciente" val={f.patientId} set={v=>setF(p=>({...p,patientId:v}))} pats={pats}/>
<div style={{display:"flex",flexDirection:"column",gap:4}}>
<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Dentista</label>
<select value={f.dentistId} onChange={e=>setF(p=>({...p,dentistId:e.target.value}))} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",color:G.text,background:"var(--surface)"}}>
{dents.map(d=><option key={d.id} value={String(d.id)}>{d.name}</option>)}
</select>
</div>
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
<div style={{display:"flex",flexDirection:"column",gap:4}}>
<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Laboratório</label>
<select value={f.labId} onChange={e=>setF(p=>({...p,labId:e.target.value}))} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",color:G.text,background:"var(--surface)"}}>
<option value="">Selecione...</option>
{labs.map(l=><option key={l.id} value={String(l.id)}>{l.name}</option>)}
</select>
</div>
<Inp lb="Dente(s)" val={f.tooth} set={v=>setF(p=>({...p,tooth:v}))} ph="Ex: 16 ou 14-16"/>
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
<div style={{display:"flex",flexDirection:"column",gap:4}}>
<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Tipo de Prótese</label>
<select value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",color:G.text,background:"var(--surface)"}}>
{PROS_T.map(t=><option key={t} value={t}>{t}</option>)}
</select>
</div>
<div style={{display:"grid",gridTemplateColumns:"0.55fr 1fr",gap:8}}><Inp lb="Qtd" val={f.qty} set={v=>setF(p=>({...p,qty:v}))} type="number" ph="1"/><Inp lb="💰 Custo Lab cada (R$)" val={f.price} set={v=>setF(p=>({...p,price:v}))} type="number" ph="0,00"/></div>
</div>
<div style={{display:"flex",flexDirection:"column",gap:4}}>
<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Procedimento a Realizar</label>
<select value={prosProcs.find(p=>p.name===f.proc)?f.proc:(f.proc?"__custom__":"")} onChange={e=>{const v=e.target.value;if(v==="__custom__"){setF(p=>({...p,proc:""}));}else if(v===""){setF(p=>({...p,proc:""}));}else{const selP=prosProcs.find(pp=>pp.name===v);setF(p=>({...p,proc:v,price:(selP&&selP.price>0)?String(selP.price):p.price}));}}} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",color:G.text,background:"var(--surface)"}}>
<option value="">Selecione o procedimento...</option>
{prosProcs.map(p=><option key={p.id} value={p.name}>{p.name}{p.price>0?" — "+cur(p.price):""}</option>)}
<option value="__custom__">✏️ Escrever manualmente...</option>
</select>
{(!f.proc||!prosProcs.find(p=>p.name===f.proc))&&<input value={f.proc} onChange={e=>setF(p=>({...p,proc:e.target.value}))} placeholder="Descreva o procedimento específico..." style={{border:`1.5px solid ${G.primary}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",color:G.text,marginTop:4}}/>}
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
<Inp lb="Data de Envio" val={f.sent} set={v=>setF(p=>({...p,sent:v}))} type="date"/>
<Inp lb="Previsão de Retorno" val={f.due} set={v=>setF(p=>({...p,due:v}))} type="date"/>
</div>
{edit&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
<Inp lb="Data Retorno Real" val={f.returned} set={v=>setF(p=>({...p,returned:v}))} type="date"/>
<div style={{display:"flex",flexDirection:"column",gap:4}}>
<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Status</label>
<select value={f.status} onChange={e=>setF(p=>({...p,status:e.target.value}))} style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none",color:G.text,background:"var(--surface)"}}>
{Object.entries(PROS_SL).map(([v,l])=><option key={v} value={v}>{l}</option>)}
</select>
</div>
</div>}
{Number(f.qty||1)>1&&Number(f.price)>0&&<div style={{background:G.accent,borderRadius:8,padding:"7px 12px",fontSize:12.5,color:G.primary}}>Total do laboratório: <strong>{cur(Number(f.price)*Number(f.qty||1))}</strong> <span style={{color:G.muted}}>({f.qty} × {cur(Number(f.price))})</span></div>}
<Txt lb="Observações (cor, material)" val={f.notes} set={v=>setF(p=>({...p,notes:v}))} rows={2}/>
<div style={{display:"flex",gap:9,justifyContent:"flex-end",marginTop:6,paddingTop:12,borderTop:`1px solid ${G.border}`}}>
<button onClick={()=>setModal(false)} style={{border:`1.5px solid ${G.primary}`,background:"transparent",color:G.primary,borderRadius:8,padding:"8px 16px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
<button onClick={()=>{
if(!f.patientId)return alert("Selecione o paciente");
if(!f.labId)return alert("Selecione o laboratório");
const obj={...f,patientId:Number(f.patientId),dentistId:Number(f.dentistId),labId:Number(f.labId),price:Number(f.price||0),qty:Number(f.qty)||1,id:edit?edit.id:nid(pros),_ts:Date.now()};
setPros(prev=>edit?prev.map(p=>p.id===edit.id?obj:p):[...prev,obj]);
setModal(false);
}} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:14,fontWeight:700,cursor:"pointer"}}>💾 Salvar Prótese</button>
</div>
</div>
</div>
</div>}
{procModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
<div style={{background:G.card,borderRadius:16,width:"100%",maxWidth:440,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${G.border}`}}>
<span style={{fontFamily:"'Cormorant Garamond'",fontSize:20}}>Procedimentos de Prótese</span>
<button onClick={()=>setProcModal(false)} style={{border:"none",background:"none",fontSize:24,cursor:"pointer",color:G.muted}}>×</button>
</div>
<div style={{padding:20,display:"flex",flexDirection:"column",gap:10}}>
{prosProcs.map(p=><div key={p.id} style={{display:"flex",gap:9,alignItems:"center",padding:"8px 12px",background:editProc&&editProc.id===p.id?G.accent:G.bg,borderRadius:9}}>
<span style={{flex:1,fontSize:13,fontWeight:600}}>{p.name}</span>
{p.price>0&&<span style={{fontSize:12,fontWeight:700,color:G.primary}}>{cur(p.price)}</span>}
<button onClick={()=>{setEditProc(p);setProcForm({name:p.name,price:p.price?String(p.price):""});}} style={{border:"none",background:G.accent,color:G.primary,borderRadius:6,padding:"4px 9px",fontSize:11,fontWeight:700,cursor:"pointer"}}>✏️</button>
<button onClick={()=>{if(window.confirm("Remover?")){setProsProcs(prev=>prev.filter(x=>x.id!==p.id));if(editProc&&editProc.id===p.id){setEditProc(null);setProcForm({name:"",price:""});}}}} style={{border:"none",background:G.red,color:"#fff",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>✕</button>
</div>)}
<div style={{borderTop:`1px solid ${G.border}`,paddingTop:12,marginTop:4}}>
<div style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",marginBottom:8}}>{editProc?"Editar Procedimento":"Adicionar Novo"}</div>
<div style={{display:"flex",flexDirection:"column",gap:8}}>
<input value={procForm.name} onChange={e=>setProcForm(p=>({...p,name:e.target.value}))} placeholder="Nome do procedimento" style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none"}}/>
<div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8}}>
<input value={procForm.price} onChange={e=>setProcForm(p=>({...p,price:e.target.value}))} type="number" placeholder="💰 Custo Lab padrão (R$)" style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none"}}/>
<button onClick={saveProc} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}>{editProc?"💾 Salvar":"+ Add"}</button>
</div>
{editProc&&<button onClick={()=>{setEditProc(null);setProcForm({name:"",price:""});}} style={{background:"none",border:`1.5px solid ${G.border}`,color:G.muted,borderRadius:8,padding:"6px",fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancelar edição</button>}
</div>
</div>
<div style={{display:"flex",justifyContent:"flex-end",marginTop:4}}>
<button onClick={()=>{setProcModal(false);setEditProc(null);setProcForm({name:"",price:""});}} style={{border:`1.5px solid ${G.primary}`,background:"transparent",color:G.primary,borderRadius:8,padding:"8px 16px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Fechar</button>
</div>
</div>
</div>
</div>}

  </div>;
}

// ══════════════════════════════════════════════════════════
// IMPLANTES - Planilha mês a mês estilo Excel
// ══════════════════════════════════════════════════════════
function Implantes({impl,setImpl,pats}){
// Usar impl global para persistir dados
var IMPL_DATA=impl&&impl.length>0?impl:IMPL_DATA_SEED;
var setImplRows=function(updater){
  setImpl(function(prev){
    var cur=prev&&prev.length>0?prev:IMPL_DATA_SEED;
    var next=typeof updater==="function"?updater(cur):updater;
    return next;
  });
};
var implRows=IMPL_DATA;

// Dynamic window: 2 months before current + current + 9 ahead = 12 total
var MN=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const now=new Date();
var MONTHS_ORDER=(function(){
  var nowM=now.getMonth(),nowY=now.getFullYear();
  var res=[];
  for(var i=-2;i<=9;i++){
    var d=new Date(nowY,nowM+i,1);
    res.push(MN[d.getMonth()]+'/'+String(d.getFullYear()).slice(2));
  }
  // Also include months that have data but are outside the window
  return res;
})();
// Add any months from IMPL_DATA not in window
var allDataMes=[...new Set(IMPL_DATA.map(function(r){return r.mes;}))];
// Append old months that have data AFTER the window (for historical access)
allDataMes.forEach(function(m){if(MONTHS_ORDER.indexOf(m)<0)MONTHS_ORDER.push(m);});
const ST_COLOR={pending:G.red,scheduled:G.success,done:"var(--text)",info:G.blue};
const ST_LABEL={pending:"Não marcado",scheduled:"Marcado",done:"Finalizado",info:"Info"};
const ST_BG={pending:"var(--red-soft)",scheduled:"var(--green-soft)",done:"var(--surface-2)",info:"var(--blue-soft)"};

const curMes=(()=>{const m=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][now.getMonth()];const y=String(now.getFullYear()).slice(2);return m+'/'+y;})();
const [selMes,setSelMes]=useState(MONTHS_ORDER.includes(curMes)?curMes:MONTHS_ORDER[MONTHS_ORDER.length-1]);
const [showCal,setShowCal]=useState(false);
const [calY,setCalY]=useState(now.getFullYear());
const [showAdd,setShowAdd]=useState(false);
const [addForm,setAddForm]=useState({paciente:"",cirurgia:"",protese:"",controle:"",obs:"",data:"",mes:curMes,status:"pending"});
const [filtSt,setFiltSt]=useState('all');
const [srch,setSrch]=useState('');
const [editRow,setEditRow]=useState(null);
const [editForm,setEditForm]=useState(null);

const rows=IMPL_DATA.filter(function(r){
  if(r.mes!==selMes)return false;
  if(filtSt!=='all'&&r.status!==filtSt)return false;
  if(srch&&r.paciente.toLowerCase().indexOf(srch.toLowerCase())<0&&
     (r.cirurgia+r.protese+r.obs).toLowerCase().indexOf(srch.toLowerCase())<0)return false;
  return true;
});

const counts=MONTHS_ORDER.reduce(function(acc,m){
  acc[m]=IMPL_DATA.filter(function(r){return r.mes===m;}).length;
  return acc;
},{});

const pending=rows.filter(function(r){return r.status==='pending';}).length;
const scheduled=rows.filter(function(r){return r.status==='scheduled';}).length;
const done=rows.filter(function(r){return r.status==='done';}).length;

return <div style={{display:"flex",flexDirection:"column",gap:0}} className="fi">
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
    <h2 style={{fontFamily:"'Cormorant Garamond'",fontSize:26,margin:0}}>Controle de Implantes</h2>
    <button onClick={function(){setShowAdd(true);setAddForm({paciente:"",cirurgia:"",protese:"",controle:"",obs:"",data:"",mes:selMes,status:"pending"});}} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}>{"+ Paciente"}</button>
  </div>

  {/* Legenda */}
  <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
    {Object.entries(ST_LABEL).map(function([k,l]){
      return <div key={k} style={{display:"flex",alignItems:"center",gap:5,background:ST_BG[k],borderRadius:20,padding:"4px 12px",border:"1.5px solid "+ST_COLOR[k]}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:ST_COLOR[k]}}/>
        <span style={{fontSize:11,fontWeight:700,color:ST_COLOR[k]}}>{l}</span>
      </div>;
    })}
  </div>

  {/* Meses tabs */}
  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
    <button onClick={function(){setShowCal(function(v){return !v;});}} style={{background:showCal?G.primary:G.accent,border:"1.5px solid "+G.border,borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer",color:showCal?"#fff":G.primary}}>{"📅 "+selMes}</button>
    <span style={{fontSize:11,color:G.muted}}>{"← 2 antes · atual · 9 à frente →"}</span>
  </div>
  {showCal&&<div style={{background:"var(--surface)",border:"1.5px solid "+G.border,borderRadius:12,padding:14,marginBottom:8,boxShadow:"0 4px 16px rgba(0,0,0,.1)"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
      <button onClick={function(){setCalY(function(y){return y-1;});}} style={{border:"none",background:G.accent,borderRadius:6,padding:"4px 12px",cursor:"pointer",fontSize:16,fontWeight:700,color:G.primary}}>{"<"}</button>
      <span style={{fontWeight:700,fontSize:14}}>{calY}</span>
      <button onClick={function(){setCalY(function(y){return y+1;});}} style={{border:"none",background:G.accent,borderRadius:6,padding:"4px 12px",cursor:"pointer",fontSize:16,fontWeight:700,color:G.primary}}>{">"}</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5}}>
      {MN.map(function(m,i){
        var key=m+"/"+String(calY).slice(2);
        var isSel=key===selMes;
        var isCur=key===curMes;
        var hasDat=allDataMes.indexOf(key)>=0;
        return <button key={key} onClick={function(){setSelMes(key);setShowCal(false);}} style={{
          border:"2px solid "+(isSel?G.primary:isCur?G.primary:G.border),
          background:isSel?G.primary:isCur?G.accent:"var(--card)",
          color:isSel?"#fff":isCur?G.primary:hasDat?G.primary:G.muted,
          borderRadius:8,padding:"7px 2px",fontSize:11,fontWeight:isSel||hasDat?700:400,cursor:"pointer"
        }}>
          {m}{hasDat&&!isSel&&<span style={{display:"block",width:5,height:5,borderRadius:"50%",background:G.primary,margin:"2px auto 0"}}/>}
        </button>;
      })}
    </div>
  </div>}
  <div style={{display:"flex",overflowX:"auto",borderBottom:"3px solid "+G.primary,marginBottom:12}}>
    {MONTHS_ORDER.map(function(m){
      var sel=m===selMes;
      var cnt=counts[m]||0;
      return <button key={m} onClick={function(){setSelMes(m);}} style={{
        flex:"none",border:"none",
        background:sel?G.primary:"var(--green-soft)",
        color:sel?"#fff":cnt>0?G.primary:G.muted,
        padding:"8px 12px",fontSize:10,fontWeight:700,cursor:"pointer",
        borderRadius:"6px 6px 0 0",marginRight:2,whiteSpace:"nowrap",
        outline:m===curMes&&!sel?"2px solid "+G.primary:undefined,outlineOffset:-2
      }}>
        {m} {cnt>0&&!sel&&<span style={{background:G.primary,color:"#fff",borderRadius:10,padding:"0 4px",fontSize:8,marginLeft:2}}>{cnt}</span>}
        {sel&&<span style={{background:"rgba(255,255,255,.3)",color:"#fff",borderRadius:10,padding:"0 4px",fontSize:8,marginLeft:2}}>{cnt}</span>}
      </button>;
    })}
  </div>

  {/* Resumo */}
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
    {[["🔴 Não marcado",pending,G.red],["🟢 Marcado",scheduled,G.success],["⚫ Finalizado",done,"var(--text)"]].map(function([l,v,c]){
      return <div key={l} style={{background:"var(--surface)",borderRadius:10,padding:"8px 10px",textAlign:"center",borderTop:"3px solid "+c,boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
        <div style={{fontFamily:"'Cormorant Garamond'",fontSize:22,color:c}}>{v}</div>
        <div style={{fontSize:9,color:G.muted,fontWeight:700}}>{l}</div>
      </div>;
    })}
  </div>

  {/* Filtros */}
  <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
    <input value={srch} onChange={function(e){setSrch(e.target.value);}} placeholder="🔍 Buscar paciente..."
      style={{flex:1,minWidth:120,border:"1.5px solid "+G.border,borderRadius:8,padding:"6px 10px",fontSize:12,outline:"none"}}/>
    {['all','pending','scheduled','done'].map(function(s){
      return <button key={s} onClick={function(){setFiltSt(s);}} style={{
        border:"2px solid "+(filtSt===s?(s==='all'?G.primary:ST_COLOR[s]):G.border),
        background:filtSt===s?(s==='all'?G.primary:ST_COLOR[s]):"var(--card)",
        color:filtSt===s?"#fff":(s==='all'?G.muted:ST_COLOR[s]),
        borderRadius:20,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer"
      }}>{s==='all'?"Todos":ST_LABEL[s]}</button>;
    })}
  </div>

  {/* Tabela */}
  <div style={{background:"var(--surface)",borderRadius:12,boxShadow:"0 2px 8px rgba(0,0,0,.08)",overflow:"hidden"}}>
    <div style={{overflowX:"auto"}}>
      <table style={{borderCollapse:"collapse",width:"100%",fontSize:12}}>
        <thead>
          <tr style={{background:"var(--surface-2)"}}>
            {["PACIENTE","CIRURGIA","PRÓTESE","CONTROLE","DATA","OBS"].map(function(h){
              return <th key={h} style={{padding:"8px 10px",textAlign:"left",fontWeight:700,fontSize:10,color:G.red,borderBottom:"2px solid #e0e0e0",whiteSpace:"nowrap"}}>{h}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length===0&&<tr><td colSpan={6} style={{textAlign:"center",padding:30,color:G.muted,fontSize:13}}>Nenhum registro neste mês</td></tr>}
          {rows.map(function(r,ri){
            var bg=ri%2===0?"#fff":"var(--green-soft)";
            var c=ST_COLOR[r.status];
            return <tr key={r.id} style={{background:bg,cursor:"pointer"}} onClick={function(){setEditRow(r);setEditForm({...r});}}>
              <td style={{padding:"9px 10px",borderBottom:"1px solid #eee",fontWeight:700,color:c,fontSize:11,whiteSpace:"nowrap",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis"}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:c,flexShrink:0}}/>
                  {r.paciente}
                </div>
              </td>
              <td style={{padding:"9px 10px",borderBottom:"1px solid #eee",color:r.cirurgia?G.text:G.muted,fontSize:11,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.cirurgia||"—"}</td>
              <td style={{padding:"9px 10px",borderBottom:"1px solid #eee",color:r.protese?G.text:G.muted,fontSize:11,maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.protese||"—"}</td>
              <td style={{padding:"9px 10px",borderBottom:"1px solid #eee",color:r.controle?G.text:G.muted,fontSize:11,maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.controle||"—"}</td>
              <td style={{padding:"9px 10px",borderBottom:"1px solid #eee",color:G.muted,fontSize:10,whiteSpace:"nowrap"}}>{r.data||"—"}</td>
              <td style={{padding:"9px 10px",borderBottom:"1px solid #eee",color:G.muted,fontSize:10,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.obs||"—"}</td>
            <td style={{padding:"4px 8px",borderBottom:"1px solid #eee",textAlign:"center"}} onClick={function(e){e.stopPropagation();}}><button onClick={function(e){e.stopPropagation();setImplRows(function(prev){return prev.filter(function(x){return x.id!==r.id;});});}} style={{border:"none",background:"none",color:"var(--muted)",cursor:"pointer",fontSize:15,fontWeight:700}}>{"✕"}</button></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  </div>

  {/* Modal de detalhe/edição */}
  {editRow&&editForm&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:"var(--surface)",borderRadius:16,width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
      <div style={{background:ST_COLOR[editForm.status],borderRadius:"16px 16px 0 0",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontWeight:700,color:"#fff",fontSize:14}}>{editRow.paciente}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.8)"}}>{editRow.mes}</div>
        </div>
        <button onClick={function(){setEditRow(null);}} style={{border:"none",background:"rgba(255,255,255,.2)",borderRadius:8,color:"#fff",cursor:"pointer",padding:"5px 10px",fontSize:16}}>{"x"}</button>
      </div>
      <div style={{padding:18,display:"flex",flexDirection:"column",gap:12}}>
        {/* Status */}
        <div>
          <div style={{fontSize:11,fontWeight:700,color:G.muted,marginBottom:6,textTransform:"uppercase"}}>Status</div>
          <div style={{display:"flex",gap:6}}>
            {['pending','scheduled','done'].map(function(s){
              return <button key={s} onClick={function(){setEditForm(function(p){return {...p,status:s};});}} style={{
                flex:1,border:"2px solid "+(editForm.status===s?ST_COLOR[s]:G.border),
                background:editForm.status===s?ST_COLOR[s]:"var(--card)",
                color:editForm.status===s?"#fff":ST_COLOR[s],
                borderRadius:8,padding:"7px 4px",fontSize:11,fontWeight:700,cursor:"pointer"
              }}>{ST_LABEL[s]}</button>;
            })}
          </div>
        </div>
        {/* Retorno - aparece quando status = done */}
        {editForm.status==="done"&&<div style={{background:"var(--green-soft)",borderRadius:10,padding:"12px 14px",border:"2px solid "+G.success}}>
          <div style={{fontWeight:700,fontSize:13,color:G.success,marginBottom:10}}>{"📅 Próximo Retorno"}</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase"}}>Mês do Retorno</label>
              <select value={editForm.retornoMes||""} onChange={function(e){setEditForm(function(p){return{...p,retornoMes:e.target.value};});}}
                style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"8px 10px",fontSize:13,outline:"none",background:"var(--surface)"}}>
                <option value="">Selecione o mês...</option>
                {(function(){
                  var MN=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
                  var now=new Date();var opts=[];
                  for(var i=1;i<=18;i++){
                    var d=new Date(now.getFullYear(),now.getMonth()+i,1);
                    var k=MN[d.getMonth()]+"/"+String(d.getFullYear()).slice(2);
                    opts.push(<option key={k} value={k}>{k}</option>);
                  }
                  return opts;
                })()}
              </select>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase"}}>O que será feito no retorno</label>
              <input value={editForm.retornoProc||""} onChange={function(e){setEditForm(function(p){return{...p,retornoProc:e.target.value};});}}
                placeholder="Ex: Prótese sobre implante, Controle, Manutenção..."
                style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"8px 10px",fontSize:13,outline:"none"}}/>
            </div>
            {editForm.retornoMes&&editForm.retornoProc&&<div style={{background:G.success+"20",borderRadius:7,padding:"7px 10px",fontSize:12,color:G.success,fontWeight:600}}>
              {"✓ Aparecerá em "+editForm.retornoMes+" com: "+editForm.retornoProc}
            </div>}
          </div>
        </div>}
        {/* Info fields */}
        {[["Cirurgia","cirurgia"],["Prótese","protese"],["Controle","controle"],["OBS","obs"]].map(function([lb,k]){
          return <div key={k} style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase"}}>{lb}</label>
            <textarea value={editForm[k]||""} onChange={function(e){setEditForm(function(p){var n={...p};n[k]=e.target.value;return n;});}}
              rows={2} style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"7px 10px",fontSize:13,outline:"none",resize:"vertical",fontFamily:"'Manrope'"}}/>
          </div>;
        })}
        <div style={{display:"flex",gap:9,justifyContent:"flex-end",paddingTop:8,borderTop:"1px solid "+G.border}}>
          <button onClick={function(){setEditRow(null);}} style={{border:"1.5px solid "+G.primary,background:"transparent",color:G.primary,borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
          <button onClick={function(){
            setImplRows(function(prev){
              var updated=prev.map(function(r){return r.id===editRow.id?{...editForm}:r;});
              // Se finalizou E tem retorno configurado, criar novo registro no mes do retorno
              if(editForm.status==="done"&&editForm.retornoMes&&editForm.retornoProc){
                var jaExiste=updated.some(function(r){
                  return r.paciente===editForm.paciente&&r.mes===editForm.retornoMes;
                });
                if(!jaExiste){
                  var newId=Math.max.apply(null,updated.map(function(r){return r.id;}))+1;
                  updated=[...updated,{
                    id:newId,
                    paciente:editForm.paciente,
                    mes:editForm.retornoMes,
                    mesKey:editForm.retornoMes,
                    cirurgia:"",
                    protese:editForm.retornoProc,
                    controle:"",
                    obs:"Retorno de "+editForm.mes,
                    data:"",
                    extra:"",
                    status:"pending"
                  }];
                }
              }
              return updated;
            });
            setEditRow(null);
          }} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Salvar</button>
        </div>
      </div>
    </div>
  </div>}
{showAdd&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
  <div style={{background:"var(--surface)",borderRadius:16,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
    <div style={{background:G.primary,borderRadius:"16px 16px 0 0",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontWeight:700,color:"#fff",fontSize:15}}>{"+ Novo Paciente"}</span>
      <button onClick={function(){setShowAdd(false);}} style={{border:"none",background:"rgba(255,255,255,.2)",borderRadius:8,color:"#fff",cursor:"pointer",padding:"5px 10px",fontSize:16}}>{"x"}</button>
    </div>
    <div style={{padding:18,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase"}}>Paciente *</label>
        <input value={addForm.paciente} onChange={function(e){setAddForm(function(p){return{...p,paciente:e.target.value};});}} placeholder="Nome completo" style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"8px 11px",fontSize:14,outline:"none"}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase"}}>Mês</label>
          <select value={addForm.mes} onChange={function(e){setAddForm(function(p){return{...p,mes:e.target.value};});}} style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"8px 10px",fontSize:13,outline:"none",background:"var(--surface)"}}>
            {MONTHS_ORDER.map(function(m){return <option key={m} value={m}>{m}</option>;})}
          </select>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase"}}>Data</label>
          <input type="date" value={addForm.data} onChange={function(e){setAddForm(function(p){return{...p,data:e.target.value};});}} style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"8px 10px",fontSize:13,outline:"none"}}/>
        </div>
      </div>
      {[["Cirurgia","cirurgia"],["Prótese","protese"],["Controle","controle"],["OBS","obs"]].map(function(pair){
        return <div key={pair[1]} style={{display:"flex",flexDirection:"column",gap:4}}>
          <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase"}}>{pair[0]}</label>
          <input value={addForm[pair[1]]||""} onChange={function(e){var k=pair[1];setAddForm(function(p){var n={...p};n[k]=e.target.value;return n;});}} placeholder={"Ex: Enxerto, Implante, Prótese..."} style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"8px 11px",fontSize:13,outline:"none"}}/>
        </div>;
      })}
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase"}}>Status</label>
        <div style={{display:"flex",gap:6}}>{["pending","scheduled","done"].map(function(s){return <button key={s} onClick={function(){setAddForm(function(p){return{...p,status:s};});}} style={{flex:1,border:"2px solid "+(addForm.status===s?ST_COLOR[s]:G.border),background:addForm.status===s?ST_COLOR[s]:"var(--card)",color:addForm.status===s?"#fff":ST_COLOR[s],borderRadius:8,padding:"7px 4px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{ST_LABEL[s]}</button>;})}
        </div>
      </div>
      <div style={{display:"flex",gap:9,justifyContent:"flex-end",paddingTop:10,borderTop:"1px solid "+G.border}}>
        <button onClick={function(){setShowAdd(false);}} style={{border:"1.5px solid "+G.primary,background:"transparent",color:G.primary,borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
        <button onClick={function(){
          if(!addForm.paciente.trim()){alert("Informe o nome do paciente");return;}
          var newId=IMPL_DATA.length>0?Math.max.apply(null,IMPL_DATA.map(function(r){return r.id;}))+1:1;
          setImplRows(function(prev){return[...prev,{...addForm,id:newId,mes:addForm.mes||selMes}];});
          setSelMes(addForm.mes||selMes);
          setShowAdd(false);
        }} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:700,cursor:"pointer"}}>{"+ Adicionar"}</button>
      </div>
    </div>
  </div>
</div>}

</div>;
}


// ══════════════════════════════════════════════════════════
// DESPESAS - clinic + personal
// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
// CAIXA (dinheiro em especie da recepcao)
// ══════════════════════════════════════════════════════════
var MOTIVOS_CAIXA_OUT=["Material","Farmácia","Limpeza","Correios","Troco","Almoço equipe","Manutenção","Outros"];
var MOTIVOS_CAIXA_IN=["Reposição de caixa","Fundo inicial","Devolução","Outros"];
function Caixa({caixa,setCaixa,user}){
if(user.level<2)return <div style={{background:G.card,borderRadius:13,padding:30,textAlign:"center"}}><p style={{color:G.red}}>{"Acesso restrito"}</p></div>;
var isAdmin=user.level>=3;
var [mo,setMo]=useState(today().slice(0,7));
var [modal,setModal]=useState(null);
var [fVal,setFVal]=useState("");
var [fMot,setFMot]=useState("");
var lista=(caixa||[]).slice().sort(function(a,b){return String(b.ts||"").localeCompare(String(a.ts||""));});
var saldo=lista.reduce(function(s,m){return s+(m.tipo==="in"?Number(m.valor||0):-Number(m.valor||0));},0);
var moList=lista.filter(function(m){return String(m.data||"").slice(0,7)===mo;});
var mesIn=moList.filter(function(m){return m.tipo==="in";}).reduce(function(s,m){return s+Number(m.valor||0);},0);
var mesOut=moList.filter(function(m){return m.tipo==="out";}).reduce(function(s,m){return s+Number(m.valor||0);},0);
var motivos=modal==="in"?MOTIVOS_CAIXA_IN:MOTIVOS_CAIXA_OUT;
var abrir=function(t){setModal(t);setFVal("");setFMot("");};
var fechar=function(){setModal(null);};
var salvar=function(){
  var v=pmoney(fVal);var mot=(fMot||"").trim();
  if(!v||v<=0)return alert("Informe o valor.");
  if(modal==="out"&&!mot)return alert("Informe o motivo da saída.");
  var now=new Date();var z=function(n){return ("0"+n).slice(-2);};
  var obj={id:nid(),tipo:modal,valor:v,motivo:mot||"Entrada de caixa",who:user.name,uid:user.id,ts:now.toISOString(),data:today(),hora:z(now.getHours())+":"+z(now.getMinutes()),_ts:Date.now()};
  setCaixa(function(prev){return [obj].concat(prev||[]);});
  fechar();
};
var remover=function(id){if(!isAdmin)return;if(window.confirm("Remover esta movimentação?"))setCaixa(function(prev){return (prev||[]).filter(function(m){return m.id!==id;});});};
return <div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">
  <div style={{display:"flex",alignItems:"center",gap:11}}>
    <div style={{width:42,height:42,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",color:G.primary,fontSize:22,background:"var(--surface)",boxShadow:"5px 5px 12px var(--nm-dark),-5px -5px 12px var(--nm-light)",flexShrink:0}}><i className="ph-fill ph-cash-register"></i></div>
    <div><h2 style={{fontFamily:"'Cormorant Garamond'",fontSize:26}}>Caixa</h2><div style={{fontSize:11,color:G.muted}}>Dinheiro em espécie da recepção</div></div>
  </div>
  <div style={{borderRadius:18,padding:"20px",textAlign:"center",background:"var(--surface)",boxShadow:"7px 7px 18px var(--nm-dark),-7px -7px 18px var(--nm-light)"}}>
    <div style={{fontSize:11,color:G.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".6px"}}>Saldo em caixa</div>
    <div style={{fontFamily:"'Cormorant Garamond'",fontWeight:700,fontSize:42,lineHeight:1.05,marginTop:6,color:saldo<0?G.red:G.success}}>{cur(saldo)}</div>
    <div style={{fontSize:11,color:G.muted,marginTop:8}}>{lista.length+" movimentações"}</div>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
    <div style={{borderRadius:12,padding:"12px 14px",background:"var(--surface)",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px var(--nm-light)"}}><div style={{fontSize:10,color:G.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px"}}>Entradas do mês</div><div style={{fontSize:19,fontWeight:800,marginTop:5,color:G.success}}>{cur(mesIn)}</div></div>
    <div style={{borderRadius:12,padding:"12px 14px",background:"var(--surface)",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px var(--nm-light)"}}><div style={{fontSize:10,color:G.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px"}}>Saídas do mês</div><div style={{fontSize:19,fontWeight:800,marginTop:5,color:G.red}}>{cur(mesOut)}</div></div>
  </div>
  <div style={{display:"flex",gap:10}}>
    <button onClick={function(){abrir("out");}} style={{flex:1,border:"none",borderRadius:12,padding:"13px 10px",fontSize:13.5,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:7,cursor:"pointer",background:G.red,color:"#fff",boxShadow:"4px 4px 11px rgba(150,40,30,.32),-3px -3px 8px var(--nm-light)"}}><i className="ph-bold ph-minus-circle"></i> Registrar saída</button>
    {isAdmin&&<button onClick={function(){abrir("in");}} style={{flex:1,border:"none",borderRadius:12,padding:"13px 10px",fontSize:13.5,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:7,cursor:"pointer",background:G.primary,color:"#ead9b6",boxShadow:"4px 4px 11px rgba(34,70,52,.40),-3px -3px 8px var(--nm-light)"}}><i className="ph-bold ph-plus-circle"></i> Adicionar valor</button>}
  </div>
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
    <h3 style={{fontFamily:"'Cormorant Garamond'",fontSize:20}}>Movimentações</h3>
    <input type="month" value={mo} onChange={function(e){setMo(e.target.value);}} style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"7px 11px",fontSize:13,outline:"none"}}/>
  </div>
  <div style={{display:"flex",flexDirection:"column",gap:9}}>
    {moList.length===0&&<div style={{borderRadius:13,padding:26,textAlign:"center",color:G.muted,fontSize:13,background:"var(--surface)",boxShadow:"inset 3px 3px 8px var(--nm-dark),inset -3px -3px 8px var(--nm-light)"}}>{"Nenhuma movimentação em "+mo}</div>}
    {moList.map(function(m){var isIn=m.tipo==="in";return(
      <div key={m.id} style={{display:"flex",alignItems:"center",gap:12,borderRadius:13,padding:"12px 14px",background:"var(--surface)",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px var(--nm-light)"}}>
        <div style={{width:38,height:38,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,color:isIn?G.success:G.red,background:isIn?"var(--green-soft)":"var(--red-soft)"}}><i className={"ph-fill "+(isIn?"ph-arrow-down":"ph-arrow-up")}></i></div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:13.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.motivo}</div>
          <div style={{fontSize:11,color:G.muted,marginTop:2}}><i className="ph-fill ph-user-circle"></i> {m.who}{" · "+fmt(m.data)+(m.hora?" · "+m.hora:"")}</div>
        </div>
        <div style={{fontWeight:800,fontSize:15,flexShrink:0,whiteSpace:"nowrap",color:isIn?G.success:G.red}}>{(isIn?"+":"−")+cur(Number(m.valor||0))}</div>
        {isAdmin&&<button onClick={function(){remover(m.id);}} title="Remover" style={{border:"none",background:"none",color:G.muted,fontSize:17,flexShrink:0,padding:"2px 4px",cursor:"pointer"}}><i className="ph ph-trash"></i></button>}
      </div>
    );})}
  </div>
  <Modal open={!!modal} close={fechar} title={modal==="in"?"Adicionar valor":"Registrar saída"} ch={
    <div style={{display:"flex",flexDirection:"column",gap:15}}>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>{modal==="in"?"Valor a adicionar (R$)":"Valor da saída (R$)"}</label>
        <input type="text" inputMode="decimal" value={fVal} onChange={function(e){setFVal(e.target.value);}} placeholder="0,00" style={{width:"100%",padding:"16px 13px",fontSize:26,fontWeight:800,textAlign:"center",border:"none",borderRadius:12,color:G.text,background:"var(--surface)",boxShadow:"inset 3px 3px 7px var(--nm-dark),inset -3px -3px 7px var(--nm-light)",outline:"none"}}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>{modal==="in"?"Observação":"Motivo da saída"}</label>
        <input type="text" value={fMot} onChange={function(e){setFMot(e.target.value);}} placeholder={modal==="in"?"Ex: reposição de caixa":"Ex: material de limpeza"} style={{width:"100%",padding:"12px 13px",fontSize:15,border:"none",borderRadius:12,color:G.text,background:"var(--surface)",boxShadow:"inset 3px 3px 7px var(--nm-dark),inset -3px -3px 7px var(--nm-light)",outline:"none"}}/>
        <div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:3}}>
          {motivos.map(function(x){var on=fMot===x;return <button key={x} onClick={function(){setFMot(x==="Outros"?"":x);}} style={{border:"none",borderRadius:20,padding:"7px 13px",fontSize:12,fontWeight:700,cursor:"pointer",background:on?(modal==="in"?G.primary:G.red):"var(--surface)",color:on?"#fff":G.muted,boxShadow:on?"none":"3px 3px 6px var(--nm-dark),-3px -3px 6px var(--nm-light)"}}>{x}</button>;})}
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,borderRadius:12,padding:"12px 14px",boxShadow:"inset 3px 3px 7px var(--nm-dark),inset -3px -3px 7px var(--nm-light)"}}>
        <div style={{width:34,height:34,borderRadius:"50%",background:G.primary,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14,flexShrink:0}}>{String(user.name||"?").charAt(0).toUpperCase()}</div>
        <div><div style={{fontSize:10,color:G.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px"}}>Registrado por (login)</div><div style={{fontSize:14,fontWeight:700,marginTop:1}}>{user.name}</div></div>
        <i className="ph-fill ph-lock-simple" style={{marginLeft:"auto",color:G.muted,fontSize:15}}></i>
      </div>
      {modal==="out"&&<div style={{fontSize:12,color:G.muted,lineHeight:1.4,background:"var(--amber-soft)",borderRadius:10,padding:"11px 13px"}}><i className="ph-fill ph-info"></i> Fica gravado quem tirou, o valor, o motivo e a data/hora.</div>}
      <div style={{display:"flex",gap:10,paddingTop:6}}>
        <button onClick={fechar} style={{flex:1,border:"none",borderRadius:12,padding:13,fontSize:15,fontWeight:700,cursor:"pointer",background:"transparent",color:G.primary,boxShadow:"inset 2px 2px 6px var(--nm-dark),inset -2px -2px 6px var(--nm-light)"}}>Cancelar</button>
        <button onClick={salvar} style={{flex:1,border:"none",borderRadius:12,padding:13,fontSize:15,fontWeight:700,cursor:"pointer",color:modal==="in"?"#ead9b6":"#fff",background:modal==="in"?G.primary:G.red}}>{modal==="in"?"Confirmar entrada":"Confirmar saída"}</button>
      </div>
    </div>
  }/>
</div>;
}


function Gastos({gastos,setGastos,user}){
const [tab,setTab]=useState("clinica");
const [modal,setModal]=useState(false);
const [edit,setEdit]=useState(null);
const [mo,setMo]=useState(today().slice(0,7));
const blank={date:today(),cat:"Aluguel",desc:"",value:"",paid:false,recorrente:false,diaVenc:"",parcelado:false,parcelas:""};
const [f,setF]=useState(blank);
if(user.level<3)return <div style={{background:G.card,borderRadius:13,padding:30,textAlign:"center"}}><p style={{color:G.red}}>{"Acesso restrito ao Administrador"}</p></div>;
var baseList=gastos[tab]||[];
var mIdx=function(ym){var pp=(ym||"").split("-");return Number(pp[0])*12+Number(pp[1]);};
var parcelaK=function(e){return mIdx(mo)-mIdx((e.date||"").slice(0,7));};
var moList=baseList.filter(function(e){
  if(e.recorrente&&e.diaVenc)return true;
  if(e.parcelado){var k=parcelaK(e);return k>=0&&k<Number(e.parcelas||1);}
  return e.date&&e.date.startsWith(mo);
}).slice().sort(function(a,b){
  var da=a.recorrente?Number(a.diaVenc||0):Number((a.date||"").slice(8));
  var db=b.recorrente?Number(b.diaVenc||0):Number((b.date||"").slice(8));
  return da-db;
});
var isPago=function(e){if(e.recorrente||e.parcelado)return !!(e.pagoMeses&&e.pagoMeses[mo]);return !!e.paid;};
var total=moList.reduce(function(s,e){return s+Number(e.value||0);},0);
var pago=moList.filter(isPago).reduce(function(s,e){return s+Number(e.value||0);},0);
var CATS=tab==="clinica"?["Aluguel","Agua","Luz","Internet","Telefone","Salarios","Material","Equipamento","Manutencao","Contabilidade","Outros"]:["Moradia","Alimentacao","Transporte","Saude","Lazer","Educacao","Vestuario","Outros"];
var save=function(){
  if(!f.desc)return alert("Informe a descricao");
  if(!f.recorrente&&!f.value)return alert("Informe o valor");
  if(f.parcelado&&(!f.parcelas||Number(f.parcelas)<2))return alert("Informe o numero de parcelas (2 ou mais)");
  var obj={...f,value:pmoney(f.value),parcelas:f.parcelado?Number(f.parcelas):f.parcelas,id:edit?edit.id:nid(),_ts:Date.now()};
  setGastos(function(prev){var lista=prev[tab]||[];return {...prev,[tab]:edit?lista.map(function(e){return e.id===obj.id?obj:e;}):[...lista,obj]};});
  setModal(false);setEdit(null);setF(blank);
};
var remove=function(id){setGastos(function(prev){return {...prev,[tab]:(prev[tab]||[]).filter(function(e){return e.id!==id;})};});};
var togglePago=function(e){
  if(e.recorrente||e.parcelado){setGastos(function(prev){return {...prev,[tab]:(prev[tab]||[]).map(function(x){if(x.id!==e.id)return x;var pm={...(x.pagoMeses||{})};pm[mo]=!pm[mo];return {...x,pagoMeses:pm,_ts:Date.now()};})};});}
  else{setGastos(function(prev){return {...prev,[tab]:(prev[tab]||[]).map(function(x){return x.id===e.id?{...x,paid:!x.paid,_ts:Date.now()}:x;})};});}
};
return <div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
  <h2 style={{fontFamily:"'Cormorant Garamond'",fontSize:26}}>Gastos</h2>
  <div style={{display:"flex",gap:8}}>
    <input type="month" value={mo} onChange={function(e){setMo(e.target.value);}} style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"7px 11px",fontSize:14,outline:"none"}}/>
    <Btn ch="+ Novo" onClick={function(){setEdit(null);setF({...blank,cat:CATS[0]});setModal(true);}}/>
  </div>
</div>
<div style={{display:"flex",borderBottom:"2px solid "+G.border}}>
  {[["clinica","Clinica"],["pessoal","Pessoal"]].map(function([k,l]){return(
    <button key={k} onClick={function(){setTab(k);}} style={{border:"none",background:"none",padding:"9px 20px",fontWeight:700,fontSize:13,cursor:"pointer",color:tab===k?G.primary:G.muted,borderBottom:"3px solid "+(tab===k?G.primary:"transparent"),marginBottom:-2,fontFamily:"'Manrope'"}}>{l}</button>
  );})}
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
  {[["Total",total,G.primary],["Pago",pago,G.success],["Pendente",total-pago,G.red]].map(function([l,v,c]){return(
    <div key={l} style={{background:G.card,borderRadius:10,padding:"12px",textAlign:"center",borderTop:"3px solid "+c,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
      <div style={{fontSize:10,color:G.muted,fontWeight:700}}>{l}</div>
      <div style={{fontSize:18,fontWeight:700,color:c,marginTop:4}}>{cur(v)}</div>
    </div>
  );})}
</div>
<div style={{display:"flex",flexDirection:"column",gap:8}}>
  {moList.length===0&&<div style={{background:G.card,borderRadius:12,padding:24,textAlign:"center",color:G.muted}}>{"Nenhum gasto em "+mo}</div>}
  {moList.map(function(e){var pg=isPago(e);var pk=e.parcelado?parcelaK(e)+1:0;return(
    <div key={e.id} style={{background:G.card,borderRadius:11,padding:"12px 14px",display:"flex",alignItems:"center",gap:10,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",opacity:pg?.75:1}}>
      <input type="checkbox" checked={pg} onChange={function(){togglePago(e);}} style={{width:18,height:18,accentColor:G.primary,cursor:"pointer",flexShrink:0}}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
          <span style={{fontWeight:700,fontSize:13,textDecoration:pg?"line-through":"none",color:pg?G.muted:G.text}}>{e.desc}</span>
          {e.recorrente&&<span style={{background:"var(--amber-soft)",color:"#E65100",borderRadius:4,padding:"1px 6px",fontSize:9,fontWeight:700}}>{"Recorrente"}</span>}
          {e.parcelado&&<span style={{background:"var(--blue-soft)",color:"#1565C0",borderRadius:4,padding:"1px 6px",fontSize:9,fontWeight:700}}>{"Parcela "+pk+"/"+e.parcelas}</span>}
        </div>
        <div style={{fontSize:11,color:G.muted,marginTop:2}}>{e.cat}{e.recorrente&&e.diaVenc?" · Vence dia "+e.diaVenc:e.parcelado?" · Vence dia "+Number((e.date||"").slice(8)):e.date?" · "+fmt(e.date):""}{e.recorrente&&!e.value&&<span style={{color:"#FF9800",fontWeight:600}}>{" · Preencher valor"}</span>}</div>
      </div>
      <span style={{fontWeight:700,fontSize:14,minWidth:75,textAlign:"right",color:pg?G.success:G.text}}>{cur(Number(e.value||0))}</span>
      <Bdg l={pg?"Pago":"Pendente"} col={pg?G.success:G.red} sm/>
      <button onClick={function(){setEdit(e);setF({...e,value:String(e.value||"")});setModal(true);}} style={{background:"none",border:"1.5px solid "+G.primary,borderRadius:7,padding:"5px 9px",cursor:"pointer",fontSize:14,flexShrink:0}}>{"edit"}</button>
      <button onClick={function(){remove(e.id);}} style={{background:G.red,border:"none",borderRadius:7,padding:"5px 10px",cursor:"pointer",color:"#fff",fontWeight:700,fontSize:13,flexShrink:0}}>{"X"}</button>
    </div>
  );})}
</div>
{modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
  <div style={{background:"var(--surface)",borderRadius:16,width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 16px 48px rgba(0,0,0,.2)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid "+G.border}}>
      <span style={{fontFamily:"'Cormorant Garamond'",fontSize:20}}>{edit?"Editar Gasto":"Novo Gasto"}</span>
      <button onClick={function(){setModal(false);}} style={{border:"none",background:"none",fontSize:24,cursor:"pointer",color:G.muted}}>{"x"}</button>
    </div>
    <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
      <Inp lb="Descricao" val={f.desc} set={function(v){setF(function(p){return {...p,desc:v};});}} ph="Ex: Aluguel"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
        <Sel lb="Categoria" val={f.cat} set={function(v){setF(function(p){return {...p,cat:v};});}} opts={CATS}/>
        <Inp lb="Valor (R$)" val={String(f.value||"")} set={function(v){setF(function(p){return {...p,value:v};});}} type="number" ph="0,00"/>
      </div>
      <label style={{display:"flex",alignItems:"center",gap:10,background:f.recorrente?G.accent:G.bg,borderRadius:8,padding:"11px 12px",cursor:"pointer",border:"1.5px solid "+(f.recorrente?G.primary:G.border)}}>
        <input type="checkbox" checked={!!f.recorrente} onChange={function(ev){setF(function(p){return {...p,recorrente:ev.target.checked,parcelado:ev.target.checked?false:p.parcelado};});}} style={{width:16,height:16,accentColor:G.primary}}/>
        <div><div style={{fontWeight:700,fontSize:13}}>{"Gasto Recorrente"}</div><div style={{fontSize:11,color:G.muted}}>{"Aparece todo mes automaticamente"}</div></div>
      </label>
      <label style={{display:"flex",alignItems:"center",gap:10,background:f.parcelado?"var(--blue-soft)":G.bg,borderRadius:8,padding:"11px 12px",cursor:"pointer",border:"1.5px solid "+(f.parcelado?"#1565C0":G.border)}}>
        <input type="checkbox" checked={!!f.parcelado} onChange={function(ev){setF(function(p){return {...p,parcelado:ev.target.checked,recorrente:ev.target.checked?false:p.recorrente};});}} style={{width:16,height:16,accentColor:"#1565C0"}}/>
        <div><div style={{fontWeight:700,fontSize:13}}>{"Parcelado (boleto/cartao)"}</div><div style={{fontSize:11,color:G.muted}}>{"Aparece por X meses; o valor e de cada parcela"}</div></div>
      </label>
      {f.parcelado&&<Inp lb="Numero de parcelas" val={String(f.parcelas||"")} set={function(v){setF(function(p){return {...p,parcelas:v};});}} type="number" ph="Ex: 5"/>}
      {f.recorrente?<Inp lb="Dia de vencimento" val={String(f.diaVenc||"")} set={function(v){setF(function(p){return {...p,diaVenc:v};});}} type="number" ph="Ex: 10"/>:<Inp lb={f.parcelado?"Data da 1a parcela":"Data"} val={f.date} set={function(v){setF(function(p){return {...p,date:v};});}} type="date"/>}
      {!f.recorrente&&!f.parcelado&&<label style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer",fontSize:13}}><input type="checkbox" checked={!!f.paid} onChange={function(ev){setF(function(p){return {...p,paid:ev.target.checked};});}} style={{width:15,height:15,accentColor:G.primary}}/>{"Ja pago"}</label>}
      <div style={{display:"flex",gap:9,justifyContent:"flex-end",paddingTop:12,borderTop:"1px solid "+G.border}}>
        <button onClick={function(){setModal(false);}} style={{border:"1.5px solid "+G.primary,background:"transparent",color:G.primary,borderRadius:8,padding:"8px 16px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
        <button onClick={save} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:14,fontWeight:700,cursor:"pointer"}}>Salvar</button>
      </div>
    </div>
  </div>
</div>}
</div>;
}

// ══════════════════════════════════════════════════════════
// LEMBRETES
// ══════════════════════════════════════════════════════════
function Lembretes({rems,setRems,pats,recs,appts,users,espera,setEspera,dents,user,semTicks,setSemTicks,anivTicks,setAnivTicks,pacsTicks,setPacsTicks,waSent}){
const t=today();
const isDentist=user?.level===1;
const myUserId=user?.id;

// Retorno Semestral state
const [semTab,setSemTab]=useState(false);
const [anivTab,setAnivTab]=useState(false);
const [posTab,setPosTab]=useState(false);
// semTicks agora e prop global
const [semMotivoModal,setSemMotivoModal]=useState(null);
const [semMotivoText,setSemMotivoText]=useState('');
const MOTIVOS_SEM=['Agendado','Ja marcou em outro lugar','Nao quer agendar agora','Sem resposta','Outro'];

// Lista de Espera state
const [showEspModal,setShowEspModal]=useState(false);
const [espMotivoModal,setEspMotivoModal]=useState(null);
const [espMotivoText,setEspMotivoText]=useState('');

// Lembretes state
const [filt,setFilt]=useState('pending');
const [modal,setModal]=useState(false);
const [edit,setEdit]=useState(null);
const [remMotivoModal,setRemMotivoModal]=useState(null);
const [remMotivoText,setRemMotivoText]=useState('');
const b0={title:'',desc:'',date:today(),priority:'medium',done:false,patientId:'',assignedUserId:''};
const [f,setF]=useState(b0);
const upd=k=>v=>setF(p=>({...p,[k]:v}));

// Calculos
const t2=today();
const todayMD=t2.slice(5);
const _perAniv=today().slice(0,7);
const _anivDone=function(p){return !!(pacsTicks&&pacsTicks["bday_week_"+p.id+"_"+_perAniv]&&pacsTicks["bday_week_"+p.id+"_"+_perAniv].done);};
const anivHoje=pats.filter(p=>p.dob&&p.dob.slice(5)===todayMD&&!_anivDone(p));
const anivMes=pats.filter(p=>p.dob&&p.dob.slice(5,7)===t2.slice(5,7));
const PCIR2=['Exodontia','Extracao','Extração','Exo','Implante','Cirurgia','Cirurgico','Cirúrgico','Cirúrgica','Enxerto','Sinus','Gengivoplastia','Apicectomia','Frenectomia','Biopsia','Urgencia','Urgência','Emergencia','Emergência'];
const yst2=new Date(new Date(t2)-86400000).toISOString().split('T')[0];
const posCir2=appts.filter(a=>a.date===yst2&&(a.status==='done'||a.status==='confirmed')&&PCIR2.some(p=>{var kw=p.toLowerCase();return (a.procedure&&a.procedure.toLowerCase().includes(kw))||(a.treatment&&a.treatment.toLowerCase().includes(kw));})&&(!isDentist||a.dentistId===user.dentistId)).map(a=>({a,p:pats.find(x=>x.id===a.patientId)})).filter(x=>x.p).filter(x=>!(((pacsTicks||{})["poscir_"+x.a.patientId+"_"+x.a.date])||{}).done);
const semAtras2=pats.filter(function(p){
// Use recs (atendimentos com baixa registrada) as source of truth
var lastRec=recs.filter(function(r){return r.patientId===p.id&&r.paid>0;}).sort(function(a,b){return b.date.localeCompare(a.date);})[0];
if(!lastRec)return false; // never attended = don't show yet
// Show when today >= lastRec date + 6 months
if(retDue(p,lastRec.date)>t2)return false;
// Exclui quem ja tem agendamento futuro (igual ao Relatorio)
var futura=appts.find(function(a){return a.patientId===p.id&&a.date>=t2&&a.status!=="cancelled"&&a.status!=="missed";});
if(futura)return false;
return true;
});
const sendWA2=async(ph,msg)=>{
const sent=await wa(ph,msg);
if(!sent){const a=document.createElement('a');a.href='https://wa.me/55'+ph.replace(/[^0-9]/g,'')+'?text='+encodeURIComponent(msg);a.target='_blank';document.body.appendChild(a);a.click();document.body.removeChild(a);}
};

// Espera
const t3=today();
const esperaAtiva=(espera||[]).filter(e=>e.valido>=t3);

// Lembretes visiveis por nivel de usuario
// Admin (3) ve tudo | Secretaria/Dentista ve so os seus ou sem atribuicao
const remsFiltered=rems.filter(r=>{
const visivel=user.level>=3
  ?true  // admin ve tudo
  :(!r.assignedUserId||Number(r.assignedUserId)===Number(myUserId)); // ve os seus ou gerais
if(!visivel)return false;
if(filt==='pending')return !r.done;
if(filt==='done')return r.done;
return true;
}).sort((a,b)=>a.date.localeCompare(b.date));

const save=()=>{if(!f.title)return;const obj={...f,patientId:f.patientId?Number(f.patientId):null,assignedUserId:f.assignedUserId?Number(f.assignedUserId):null,id:edit?edit.id:nid(rems)};setRems(prev=>edit?prev.map(r=>r.id===edit.id?obj:r):[...prev,obj]);setModal(false);setEdit(null);setF(b0);};
const tog=id=>{if(typeof id==='string')return;setRems(prev=>prev.map(r=>r.id===id?{...r,done:!r.done}:r));};
const rm=id=>{if(typeof id==='string')return;setRems(prev=>prev.filter(r=>r.id!==id));};
const PRIO={high:'Alta',medium:'Media',low:'Baixa'};
const PRIOC={high:G.red,medium:G.yellow,low:G.primary};

// Semestral
const semTick=(patId)=>{setSemMotivoModal(patId);setSemMotivoText('');};
const confirmSemTick=(patId,motivo)=>{setSemTicks(p=>({...p,[patId]:{done:true,motivo,date:today(),by:user.name}}));setSemMotivoModal(null);};
const pendSem=semAtras2.filter(p=>!semTicks[p.id]?.done);
const doneSem=semAtras2.filter(p=>semTicks[p.id]?.done);

return <div style={{display:'flex',flexDirection:'column',gap:12}} className="fi">

{/* LISTA DE ESPERA */}

<div style={{background:'var(--purple-soft)',border:'2px solid '+(esperaAtiva.length>0?'#7B1FA2':G.border),borderRadius:14,padding:'14px 16px'}}>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:esperaAtiva.length>0?10:0}}>
    <div style={{fontWeight:700,fontSize:13,color:'#7B1FA2'}}>{'Lista de Espera ('+esperaAtiva.length+')'}</div>
    <button onClick={()=>setShowEspModal(true)} style={{background:'#7B1FA2',color:'#fff',border:'none',borderRadius:8,padding:'5px 12px',fontSize:12,fontWeight:700,cursor:'pointer'}}>+ Novo</button>
  </div>
  {esperaAtiva.length===0&&<div style={{fontSize:12,color:G.muted,marginTop:6}}>Nenhum paciente aguardando.</div>}
  {esperaAtiva.map(e=>{
    const diasNome=['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];
    const amanha=new Date(new Date(t3+'T12:00').getTime()+86400000).toISOString().split('T')[0];
    const vencHoje=e.valido===t3;const vencAmanha=e.valido===amanha;
    return <div key={e.id} style={{background:'var(--card)',borderRadius:12,padding:'11px 13px',marginBottom:8,border:'1.5px solid '+(vencHoje?G.red:vencAmanha?G.yellow:'#E1BEE7')}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'flex-start'}}>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:13}}>{e.patName}</div>
          <div style={{fontSize:11,color:G.muted,marginTop:2}}>{e.proc+' - '+e.dentName+' - '+e.tempo+'min'}</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:3,marginTop:5}}>
            {e.slots.map((s,i)=><span key={i} style={{background:'var(--purple-soft)',borderRadius:6,padding:'2px 7px',color:'#7B1FA2',fontWeight:600,fontSize:10}}>{s.dias.map(d=>diasNome[d]).join('/')+': '+s.ini+'-'+s.fim}</span>)}
          </div>
          <div style={{fontSize:11,fontWeight:600,marginTop:5,color:vencHoje?G.red:vencAmanha?G.yellow:'#7B1FA2'}}>{vencHoje?'Vence HOJE!':vencAmanha?'Vence amanha!':'Valido ate '+fmt(e.valido)}</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:5,alignItems:'flex-end',flexShrink:0}}>
          {e.patPhone&&<button onClick={()=>sendWA2(e.patPhone,'Ola, '+e.patName+'! Temos um horario disponivel para '+e.proc+'. Affonso Odontologia.')} style={{background:'#25D366',color:'#fff',border:'none',borderRadius:8,padding:'5px 10px',fontSize:11,fontWeight:700,cursor:'pointer'}}>WA</button>}
          <button onClick={()=>{setEspMotivoModal(e.id);setEspMotivoText('');}} style={{background:G.red,color:'#fff',border:'none',borderRadius:8,padding:'5px 10px',fontSize:11,fontWeight:700,cursor:'pointer'}}>Remover</button>
        </div>
      </div>
    </div>;
  })}
</div>

{/* Modal remover espera */}
{espMotivoModal&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>

  <div style={{background:'var(--card)',borderRadius:16,width:'100%',maxWidth:420,boxShadow:'0 16px 48px rgba(0,0,0,.2)'}}>
    <div style={{background:G.red,borderRadius:'16px 16px 0 0',padding:'13px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <span style={{fontWeight:700,color:'#fff',fontSize:14}}>Motivo da Remocao</span>
      <button onClick={()=>setEspMotivoModal(null)} style={{border:'none',background:'rgba(255,255,255,.2)',borderRadius:8,color:'#fff',cursor:'pointer',padding:'4px 9px'}}>X</button>
    </div>
    <div style={{padding:18,display:'flex',flexDirection:'column',gap:9}}>
      {['Agendou','Desistiu','Sem resposta','Fora do perfil','Outro'].map(m=><button key={m} onClick={()=>setEspMotivoText(m)} style={{border:'2px solid '+(espMotivoText===m?G.red:G.border),background:espMotivoText===m?'var(--red-soft)':'var(--card)',borderRadius:10,padding:'9px 12px',fontSize:13,cursor:'pointer',textAlign:'left',fontWeight:espMotivoText===m?700:400,color:espMotivoText===m?G.red:G.text}}>{espMotivoText===m?'- ':''}{m}</button>)}
      <textarea value={espMotivoText} onChange={e=>setEspMotivoText(e.target.value)} rows={2} placeholder="Ou descreva..." style={{border:'1.5px solid '+G.border,borderRadius:8,padding:'8px 11px',fontSize:13,outline:'none',resize:'none',fontFamily:"'Manrope'"}}/>
      <div style={{display:'flex',gap:9,justifyContent:'flex-end',paddingTop:8,borderTop:'1px solid '+G.border}}>
        <button onClick={()=>setEspMotivoModal(null)} style={{border:'1.5px solid '+G.primary,background:'transparent',color:G.primary,borderRadius:8,padding:'8px 15px',fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancelar</button>
        <button onClick={()=>{setEspera(prev=>prev.filter(x=>x.id!==espMotivoModal));setEspMotivoModal(null);}} style={{background:G.red,color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:13,fontWeight:700,cursor:'pointer'}}>Confirmar</button>
      </div>
    </div>
  </div>
</div>}

{/* ANIVERSARIANTES */}
{anivHoje.length>0&&<div style={{background:'var(--amber-soft)',border:'2px solid #FFD54F',borderRadius:14,overflow:'hidden'}}>

  <button onClick={()=>setAnivTab(v=>!v)} style={{width:'100%',background:'none',border:'none',padding:'13px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}}>
    <span style={{fontWeight:700,fontSize:13,color:'#E65100'}}>{'Aniversariantes hoje ('+anivHoje.length+')'}</span>
    <span style={{color:'#E65100',fontSize:18,fontWeight:700,transition:'transform .2s',transform:anivTab?'rotate(90deg)':'rotate(0deg)'}}>{'>'}</span>
  </button>
  {anivTab&&<div style={{padding:'0 16px 14px'}}>
  {anivHoje.map(p=><div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,paddingBottom:8,borderBottom:'1px solid #FFD54F'}}>
    <div><div style={{fontWeight:600,fontSize:13}}>{p.name}</div><div style={{fontSize:11,color:'#E65100'}}>{(new Date(t2).getFullYear()-Number(p.dob.slice(0,4)))+' anos'}</div></div>
    <div style={{display:'flex',gap:6}}>{p.phone&&<button onClick={()=>sendWA2(p.phone,'Ola, '+p.name+'! A equipe Affonso Odontologia deseja um feliz aniversario! Affonso Odontologia')} style={{background:'#25D366',color:'#fff',border:'none',borderRadius:10,padding:'7px 12px',fontSize:12,fontWeight:700,cursor:'pointer'}}>WA</button>}<button onClick={function(){var per=today().slice(0,7);setPacsTicks(function(prev){var n=Object.assign({},prev);var rec={done:true,note:'Parabens enviado',doneBy:user.name,doneAt:today(),ts:Date.now()};n['bday_week_'+p.id+'_'+per]=rec;n['bday_month_'+p.id+'_'+per]=rec;return n;});}} style={{background:'var(--primary)',color:'#fff',border:'none',borderRadius:10,padding:'7px 12px',fontSize:12,fontWeight:700,cursor:'pointer'}}>✓ Feito</button></div>
  </div>)}
  <div style={{fontSize:11,color:'#E65100',marginTop:4}}>{'Este mes: '+anivMes.length+' aniversariante(s)'}</div>
  </div>}
</div>}

{/* POS-CIRURGICO */}
{posCir2.length>0&&<div style={{background:'var(--purple-soft)',border:'2px solid #9FA8DA',borderRadius:14,overflow:'hidden'}}>

  <button onClick={()=>setPosTab(v=>!v)} style={{width:'100%',background:'none',border:'none',padding:'13px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}}>
    <span style={{fontWeight:700,fontSize:13,color:'#283593'}}>{'🩺 Pós-Cirurgia / Urgência ('+posCir2.length+')'}</span>
    <span style={{color:'#283593',fontSize:18,fontWeight:700,transition:'transform .2s',transform:posTab?'rotate(90deg)':'rotate(0deg)'}}>{'>'}</span>
  </button>
  {posTab&&<div style={{padding:'0 16px 14px'}}>
  {posCir2.map(x=>{var autoOk2=!!(waSent&&waSent['pc_'+x.a.id]);return <div key={x.a.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,paddingBottom:8,borderBottom:'1px solid #C5CAE9',gap:6}}>
    <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{x.p.name}{autoOk2&&<span style={{marginLeft:6,fontSize:9,background:'var(--green-soft)',color:'#2E7D32',borderRadius:8,padding:'1px 7px',fontWeight:700}}>{'🤖 WA enviado'}</span>}</div><div style={{fontSize:11,color:'#5C6BC0'}}>{(x.a.procedure||'Atendimento')+' · '+fmt(x.a.date)}</div></div>
    <div style={{display:'flex',gap:5,flexShrink:0}}>
    {x.p.phone&&<button onClick={()=>sendWA2(x.p.phone,'Olá, '+x.p.name+'! 😊 Aqui é da Affonso Odontologia. Você realizou '+(x.a.procedure||'seu procedimento')+' no dia '+fmt(x.a.date)+' e passamos para saber como está se sentindo. Está tudo bem com a recuperação, sem dores ou desconforto? Qualquer dúvida, é só responder por aqui que vamos te orientar com todo cuidado. Cuide-se bem! 🦷')} style={{background:'#5C6BC0',color:'#fff',border:'none',borderRadius:10,padding:'7px 12px',fontSize:12,fontWeight:700,cursor:'pointer'}}>WA</button>}
    <button onClick={()=>setPacsTicks(prev=>{var n=Object.assign({},prev||{});n['poscir_'+x.a.patientId+'_'+x.a.date]={done:true,by:user.name,date:today()};return n;})} title='Excluir da lista' style={{background:'none',border:'1.5px solid #C5CAE9',borderRadius:10,padding:'7px 10px',fontSize:12,color:'#5C6BC0',cursor:'pointer',fontWeight:700}}>{'✕'}</button>
    </div>
  </div>;})}
  </div>}
</div>}

{/* RETORNO SEMESTRAL - aba expansivel */}

<div style={{background:'var(--green-soft)',border:'2px solid #A5D6A7',borderRadius:14,overflow:'hidden'}}>
  <button onClick={()=>setSemTab(v=>!v)} style={{width:'100%',background:'none',border:'none',padding:'13px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}}>
    <div style={{display:'flex',alignItems:'center',gap:10}}>
      <span style={{fontWeight:700,fontSize:13,color:'#2E7D32'}}>{'Retorno Semestral ('+semAtras2.length+')'}</span>
      <span style={{fontSize:11,background:'#C8E6C9',color:'#2E7D32',borderRadius:20,padding:'2px 8px',fontWeight:700}}>{doneSem.length+'/'+semAtras2.length+' ok'}</span>
    </div>
    <span style={{color:'#2E7D32',fontSize:18,fontWeight:700,transition:'transform .2s',transform:semTab?'rotate(90deg)':'rotate(0deg)'}}>{'>'}</span>
  </button>
  {semTab&&<div style={{padding:'0 14px 14px'}}>
    <div style={{background:'#C8E6C9',borderRadius:4,height:5,marginBottom:12}}>
      <div style={{background:'#2E7D32',height:5,borderRadius:4,width:(semAtras2.length?doneSem.length/semAtras2.length*100:0)+'%',transition:'width .4s'}}/>
    </div>
    {pendSem.length===0&&<div style={{textAlign:'center',padding:14,color:G.success,fontSize:13,fontWeight:700}}>Todos resolvidos!</div>}
    {pendSem.map(p=>{
      const lastRec=recs.filter(r=>r.patientId===p.id&&r.paid>0).sort((a,b)=>b.date.localeCompare(a.date))[0];
      const dias=lastRec?Math.floor((new Date(t2)-new Date(lastRec.date+"T12:00"))/86400000):null;
      const sixMonthsDate=lastRec?retDue(p,lastRec.date):null;
      const mesesPassados=lastRec?Math.floor(dias/30):null;
      return <div key={p.id} style={{background:'var(--card)',borderRadius:10,padding:'10px 12px',marginBottom:7,border:'1px solid #A5D6A7',display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
          <div style={{fontSize:11,color:G.muted}}>Última consulta: <strong>{lastRec?fmt(lastRec.date):'--'}</strong></div>
          <div style={{fontSize:11,color:G.orange,fontWeight:600}}>{dias?('⏰ '+mesesPassados+' meses atrás ('+dias+' dias)'):''}</div>
          {sixMonthsDate&&<div style={{fontSize:10,color:G.muted}}>{retLabel(p,lastRec&&lastRec.date)} venceu em: {fmt(sixMonthsDate)}</div>}
        </div>
        <div style={{display:'flex',gap:5,flexShrink:0}}>
          {p.phone&&<button onClick={()=>sendWA2(p.phone,'Ola, '+p.name+'! Ja faz um tempo desde sua ultima consulta. Que tal agendar sua revisao semestral? Affonso Odontologia')} style={{background:'#25D366',color:'#fff',border:'none',borderRadius:8,padding:'5px 9px',fontSize:11,fontWeight:700,cursor:'pointer'}}>WA</button>}
          <button onClick={()=>semTick(p.id)} style={{background:G.primary,color:'#fff',border:'none',borderRadius:8,padding:'5px 10px',fontSize:11,fontWeight:700,cursor:'pointer'}}>Marcar</button>
          <button onClick={()=>setSemTicks(prev=>({...prev,[p.id]:{done:true,motivo:'Removido da lista',date:today(),by:user.name}}))} style={{background:'var(--card)',color:G.red,border:'1px solid '+G.red,borderRadius:8,padding:'5px 9px',fontSize:11,fontWeight:700,cursor:'pointer'}}>Excluir</button>
        </div>
      </div>;
    })}
    {doneSem.length>0&&<>
      <div style={{fontSize:10,fontWeight:700,color:G.muted,textTransform:'uppercase',margin:'10px 0 6px'}}>Resolvidos ({doneSem.length})</div>
      {doneSem.map(p=>{
        const tick=semTicks[p.id];
        return <div key={p.id} style={{background:'var(--green-soft)',borderRadius:9,padding:'8px 11px',marginBottom:5,border:'1px solid #A5D6A7',display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
          <div>
            <span style={{fontSize:12,fontWeight:600,textDecoration:'line-through',color:G.muted}}>{p.name}</span>
            <div style={{fontSize:10,color:G.success,marginTop:1}}>{(tick?.motivo||'')+' - '+(tick?.by||'')+' '+fmt(tick?.date)}</div>
          </div>
          <button onClick={()=>setSemTicks(prev=>({...prev,[p.id]:undefined}))} style={{background:'none',border:'1px solid '+G.border,borderRadius:6,padding:'2px 8px',fontSize:10,color:G.muted,cursor:'pointer'}}>Desfazer</button>
        </div>;
      })}
    </>}
  </div>}
</div>

{/* Modal motivo semestral */}
{semMotivoModal&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>

  <div style={{background:'var(--card)',borderRadius:16,width:'100%',maxWidth:420,boxShadow:'0 16px 48px rgba(0,0,0,.2)'}}>
    <div style={{background:G.primary,borderRadius:'16px 16px 0 0',padding:'13px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <span style={{fontWeight:700,color:'#fff',fontSize:14}}>{'Marcar - '+pats.find(p=>p.id===semMotivoModal)?.name}</span>
      <button onClick={()=>setSemMotivoModal(null)} style={{border:'none',background:'rgba(255,255,255,.2)',borderRadius:8,color:'#fff',cursor:'pointer',padding:'4px 9px'}}>X</button>
    </div>
    <div style={{padding:18,display:'flex',flexDirection:'column',gap:9}}>
      <div style={{fontSize:12,color:G.muted,fontWeight:600}}>O que foi feito?</div>
      {MOTIVOS_SEM.map(m=><button key={m} onClick={()=>setSemMotivoText(m)} style={{border:'2px solid '+(semMotivoText===m?G.primary:G.border),background:semMotivoText===m?G.accent:'var(--card)',borderRadius:10,padding:'9px 12px',fontSize:13,cursor:'pointer',textAlign:'left',fontWeight:semMotivoText===m?700:400,color:semMotivoText===m?G.primary:G.text}}>{semMotivoText===m?'- ':''}{m}</button>)}
      <textarea value={semMotivoText} onChange={e=>setSemMotivoText(e.target.value)} rows={2} placeholder="Ou descreva..." style={{border:'1.5px solid '+G.border,borderRadius:8,padding:'8px 11px',fontSize:13,outline:'none',resize:'none',fontFamily:"'Manrope'"}}/>
      <div style={{display:'flex',gap:9,justifyContent:'flex-end',paddingTop:8,borderTop:'1px solid '+G.border}}>
        <button onClick={()=>setSemMotivoModal(null)} style={{border:'1.5px solid '+G.primary,background:'transparent',color:G.primary,borderRadius:8,padding:'8px 15px',fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancelar</button>
        <button onClick={()=>{confirmSemTick(semMotivoModal,semMotivoText);}} style={{background:G.primary,color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:13,fontWeight:700,cursor:'pointer'}}>Confirmar</button>
      </div>
    </div>
  </div>
</div>}

{/* LEMBRETES MANUAIS */}

<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
  <h2 style={{fontFamily:"'Cormorant Garamond'",fontSize:26,margin:0}}>Lembretes</h2>
  <Btn ch="+ Novo" onClick={()=>{setEdit(null);setF(b0);setModal(true);}}/>
</div>

<div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
  {[['pending','Pendentes'],['done','Concluidos'],['all','Todos']].map(([k,l])=><button key={k} onClick={()=>setFilt(k)} style={{border:'none',background:filt===k?G.primary:G.card,color:filt===k?'#fff':G.muted,borderRadius:20,padding:'5px 13px',fontSize:11,fontWeight:700,cursor:'pointer',boxShadow:'0 1px 3px rgba(0,0,0,.08)'}}>{l}</button>)}
</div>

{user.level<2&&<div style={{background:G.accent,borderRadius:8,padding:'7px 12px',fontSize:11,color:G.primary}}>Voce ve apenas lembretes gerais e os direcionados a voce.</div>}

<div style={{display:'flex',flexDirection:'column',gap:7}}>
  {remsFiltered.length===0&&<div style={{background:G.card,borderRadius:12,padding:20,textAlign:'center',color:G.muted,fontSize:13}}>Nenhum lembrete</div>}
  {remsFiltered.map(r=>{
    const p=r.patientId?pats.find(x=>x.id===r.patientId):null;
    const au=r.assignedUserId?users.find(u=>u.id===r.assignedUserId):null;
    const late=!r.done&&r.date<t;
    return <div key={r.id} style={{background:r.done?G.bg:G.card,borderRadius:12,padding:'11px 14px',boxShadow:'0 1px 4px rgba(0,0,0,.07)',display:'flex',gap:10,alignItems:'flex-start',opacity:r.done?.65:1,borderLeft:'4px solid '+(r.done?G.border:au?au.color:PRIOC[r.priority||'medium'])}}>
      <div onClick={()=>tog(r.id)} style={{display:'flex',alignItems:'center',justifyContent:'center',width:22,height:22,borderRadius:'50%',border:'2px solid '+(r.done?G.success:PRIOC[r.priority||'medium']),background:r.done?G.success:'transparent',cursor:'pointer',flexShrink:0,marginTop:2,transition:'all .15s'}}>
        {r.done&&<span style={{color:'#fff',fontSize:11,fontWeight:700}}>v</span>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:700,fontSize:13,textDecoration:r.done?'line-through':'none',color:r.done?G.muted:G.text}}>{r.title}</div>
        {r.desc&&<div style={{fontSize:12,color:G.muted,marginTop:1}}>{r.desc}</div>}
        <div style={{display:'flex',gap:5,marginTop:4,flexWrap:'wrap',alignItems:'center'}}>
          <Bdg l={PRIO[r.priority||'medium']} col={PRIOC[r.priority||'medium']} sm/>
          <span style={{fontSize:11,color:late?G.red:G.muted,fontWeight:late?700:400}}>{fmt(r.date)}{late?' - ATRASADO':''}</span>
          {p&&<span style={{fontSize:11,color:G.muted}}>{p.name}</span>}
          {au?<Bdg l={(function(){var sk=['dr.','dra.','dr','dra'];var pts=au.name.split(' ');var r=pts.filter(function(p){return sk.indexOf(p.toLowerCase())<0;});return r[0]||pts[0];})()} col={au.color} sm/>:<Bdg l="Geral" col={G.blue} sm/>}
        </div>
      </div>
      <div style={{display:'flex',gap:4,flexDirection:'column',alignItems:'flex-end',flexShrink:0}}>
        {p?.phone&&!r.done&&<button onClick={()=>wa(p.phone,'Ola '+p.name+'! '+(r.desc||r.title))} style={{background:'#25D366',color:'#fff',border:'none',borderRadius:6,padding:'4px 9px',fontSize:11,fontWeight:700,cursor:'pointer'}}>WA</button>}
        <button onClick={()=>{setEdit(r);setF({...r,patientId:String(r.patientId||''),assignedUserId:String(r.assignedUserId||'')});setModal(true);}} style={{background:'transparent',border:'1.5px solid '+G.primary,color:G.primary,borderRadius:6,padding:'4px 9px',fontSize:11,fontWeight:700,cursor:'pointer'}}>Editar</button>
        {typeof r.id!=='string'&&<button onClick={()=>{setRemMotivoModal(r.id);setRemMotivoText('');}} style={{background:G.red,color:'#fff',border:'none',borderRadius:6,padding:'4px 9px',fontSize:11,fontWeight:700,cursor:'pointer'}}>Apagar</button>}
      </div>
    </div>;
  })}
</div>

{/* Modal apagar lembrete */}
{remMotivoModal&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>

  <div style={{background:'var(--card)',borderRadius:16,width:'100%',maxWidth:420,boxShadow:'0 16px 48px rgba(0,0,0,.2)'}}>
    <div style={{background:G.red,borderRadius:'16px 16px 0 0',padding:'13px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <span style={{fontWeight:700,color:'#fff',fontSize:14}}>Apagar Lembrete</span>
      <button onClick={()=>setRemMotivoModal(null)} style={{border:'none',background:'rgba(255,255,255,.2)',borderRadius:8,color:'#fff',cursor:'pointer',padding:'4px 9px'}}>X</button>
    </div>
    <div style={{padding:18,display:'flex',flexDirection:'column',gap:9}}>
      {['Resolvido','Nao e mais necessario','Criado por engano','Outro'].map(m=><button key={m} onClick={()=>setRemMotivoText(m)} style={{border:'2px solid '+(remMotivoText===m?G.red:G.border),background:remMotivoText===m?'var(--red-soft)':'var(--card)',borderRadius:10,padding:'9px 12px',fontSize:13,cursor:'pointer',textAlign:'left',fontWeight:remMotivoText===m?700:400,color:remMotivoText===m?G.red:G.text}}>{m}</button>)}
      <textarea value={remMotivoText} onChange={e=>setRemMotivoText(e.target.value)} rows={2} placeholder="Ou descreva o motivo..." style={{border:'1.5px solid '+G.border,borderRadius:8,padding:'8px 11px',fontSize:13,outline:'none',resize:'none',fontFamily:"'Manrope'"}}/>
      <div style={{display:'flex',gap:9,justifyContent:'flex-end',paddingTop:8,borderTop:'1px solid '+G.border}}>
        <button onClick={()=>setRemMotivoModal(null)} style={{border:'1.5px solid '+G.primary,background:'transparent',color:G.primary,borderRadius:8,padding:'8px 15px',fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancelar</button>
        <button onClick={()=>{rm(remMotivoModal);setRemMotivoModal(null);}} style={{background:G.red,color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontSize:13,fontWeight:700,cursor:'pointer'}}>Confirmar</button>
      </div>
    </div>
  </div>
</div>}

{/* Modal novo/editar lembrete */}
<Modal open={modal} close={()=>{setModal(false);setEdit(null);setF(b0);}} title={edit?'Editar Lembrete':'Novo Lembrete'} ch={<div style={{display:'flex',flexDirection:'column',gap:11}}>
<Inp lb="Titulo" val={f.title} set={upd('title')}/>
<Txt lb="Descricao" val={f.desc} set={upd('desc')} rows={2}/>
<R2 a={<Inp lb="Data" val={f.date} set={upd('date')} type="date"/>} b={<Sel lb="Prioridade" val={f.priority} set={upd('priority')} opts={Object.entries(PRIO).map(([v,l])=>({v,l}))}/>}/>
<PatSearch lb="Paciente (opcional)" val={f.patientId} set={upd('patientId')} pats={pats} optional/>

  <div style={{display:'flex',flexDirection:'column',gap:4}}>
    <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:'uppercase',letterSpacing:'.4px'}}>Visivel para</label>
    <select value={String(f.assignedUserId)} onChange={e=>upd('assignedUserId')(e.target.value)} style={{border:'1.5px solid '+G.border,borderRadius:8,padding:'9px 12px',fontSize:14,outline:'none',background:'var(--card)'}}>
      <option value="">Todos (geral)</option>
      {users.filter(u=>u.active).map(u=><option key={u.id} value={String(u.id)}>{(function(){var sk=['dr.','dra.','dr','dra'];var pts=u.name.split(' ');var r=pts.filter(function(p){return sk.indexOf(p.toLowerCase())<0;});return (r[0]||pts[0])+' ('+u.role+')';})() }</option>)}
    </select>
  </div>
  <SC2 save={save} cancel={()=>{setModal(false);setEdit(null);setF(b0);}}/>
</div>}/>

{showEspModal&&<EsperaModal pats={pats} dents={dents} onSave={e=>{setEspera(prev=>[...prev,e]);setShowEspModal(false);}} onClose={()=>setShowEspModal(false)}/>}

</div>;
}

// ══════════════════════════════════════════════════════════
// FLUXO DE CAIXA (projecao 12 meses, somente leitura)
// ══════════════════════════════════════════════════════════
function FluxoCaixa({recs,treats,pats,dents,gastos,dn}){
const [openMo,setOpenMo]=useState(today().slice(0,7));
const MESAB=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const MESFULL=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const base=today().slice(0,7);
const baseY=Number(base.slice(0,4)),baseM=Number(base.slice(5,7));
const ymAt=k=>{var mi=baseM-1+k;var y=baseY+Math.floor(mi/12);var mm=(mi%12)+1;return y+"-"+String(mm).padStart(2,"0");};
const months=[];for(var i=0;i<12;i++)months.push(ymAt(i));
const idxOf=ym=>(Number(ym.slice(0,4))-baseY)*12+(Number(ym.slice(5,7))-baseM);
const inH=ym=>{var k=idxOf(ym);return k>=0&&k<12;};
const dOk=id=>dn==="all"||Number(dn)===Number(id);

const card={},orto={},gasto={};
months.forEach(m=>{card[m]=0;orto[m]=0;gasto[m]=0;});

// A) Cartão parcelado a compensar (parcelas futuras, valor cheio da parcela)
// Calcula os meses das parcelas a partir da DATA + Nº DE PARCELAS.
// Não depende de instM (que nem sempre é gravado, ex.: pagamentos do Plano de Tratamento).
const parcelaMeses=(dateStr,n)=>{var out=[];var d=new Date((dateStr||today())+"T12:00");for(var i=1;i<=n;i++){d.setMonth(d.getMonth()+1);out.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));}return out;};
recs.forEach(r=>{
if(!dOk(r.dentistId))return;
if(r.payment==="Cartão Crédito"&&Number(r.inst)>1){
var n=Number(r.inst);
var meses=(Array.isArray(r.instM)&&r.instM.length===n)?r.instM:parcelaMeses(r.date,n);
var per=(Number(r.paid)||0)/n;
meses.forEach(m=>{if(inH(m))card[m]+=per;});
}
});

// B) Orto/carnê (carnê de ortodontia)
treats.forEach(t=>{
if(!dOk(t.dentistId))return;
(t.items||[]).forEach(it=>{
if(it.paid)return;
if((t.orto||it.orto)&&it.mesRef){if(inH(it.mesRef))orto[it.mesRef]+=Number(it.value)||0;return;}
});
});

// D) Gastos previstos (clínica)
var clin=(gastos&&gastos.clinica)||[];
months.forEach(m=>{
clin.forEach(e=>{
var v=Number(e.value)||0;if(v<=0)return;
if(e.recorrente&&e.diaVenc){gasto[m]+=v;return;}
if(e.parcelado){var k=(Number(m.slice(0,4))*12+Number(m.slice(5,7)))-(Number((e.date||"").slice(0,4))*12+Number((e.date||"").slice(5,7)));if(k>=0&&k<Number(e.parcelas||1))gasto[m]+=v;return;}
if(e.date&&e.date.slice(0,7)===m)gasto[m]+=v;
});
});

const entrada=m=>card[m]+orto[m];
const saldo=m=>entrada(m)-gasto[m];
const totReceber=months.reduce((s,m)=>s+entrada(m),0);
const totSaldo=months.reduce((s,m)=>s+saldo(m),0);
const maxEnt=Math.max.apply(null,months.map(entrada).concat([1]));
const cardMonths=months.filter(m=>card[m]>0);
const temAlgo=totReceber>0||months.some(m=>gasto[m]>0);
const kfmt=v=>{v=Math.round(v);return v>=1000?(v/1000).toFixed(1).replace(".",",")+"k":""+v;};
const mLab=ym=>{var mm=Number(ym.slice(5,7));return MESAB[mm-1]+(mm===1?"/"+ym.slice(2,4):"");};
const mFull=ym=>MESFULL[Number(ym.slice(5,7))-1]+" "+ym.slice(0,4);
const HH=130;

return <div style={{display:"flex",flexDirection:"column",gap:13}}>

<div style={{background:G.accent,borderRadius:14,padding:"7px 13px",fontSize:12,fontWeight:600,color:G.primary,alignSelf:"flex-start"}}>📅 Próximos 12 meses</div>

{!temAlgo&&<div style={{background:G.card,borderRadius:12,padding:26,textAlign:"center",color:G.muted,fontSize:13,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}><div style={{fontSize:26,marginBottom:6}}>📈</div>Sem recebimentos futuros lançados ainda.<div style={{fontSize:11,marginTop:5}}>Cartão parcelado e orto/carnê aparecem aqui automaticamente.</div></div>}

{temAlgo&&<>
<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:11}}>
<div style={{background:G.card,borderRadius:11,padding:"12px 14px",textAlign:"center",borderTop:"4px solid "+G.primary,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
<div style={{fontSize:9.5,color:G.muted,fontWeight:700,letterSpacing:".3px"}}>A RECEBER (12 MESES)</div>
<div style={{fontFamily:"'Cormorant Garamond'",fontSize:24,color:G.primary,fontWeight:700}}>{cur(totReceber)}</div>
</div>
<div style={{background:G.card,borderRadius:11,padding:"12px 14px",textAlign:"center",borderTop:"4px solid "+(totSaldo>=0?G.success:G.red),boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
<div style={{fontSize:9.5,color:G.muted,fontWeight:700,letterSpacing:".3px"}}>SALDO PROJETADO</div>
<div style={{fontFamily:"'Cormorant Garamond'",fontSize:24,color:totSaldo>=0?G.success:G.red,fontWeight:700}}>{(totSaldo>=0?"+":"")+cur(totSaldo)}</div>
</div>
</div>

<div style={{background:G.card,borderRadius:12,padding:14,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
<div style={{fontWeight:700,fontSize:13,marginBottom:8}}>Entradas previstas por mês</div>
<div style={{display:"flex",gap:14,marginBottom:10,flexWrap:"wrap"}}>
{[["Cartão",G.blue],["Orto/carnê",G.primary]].map(row=><div key={row[0]} style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:8,background:row[1],display:"inline-block"}}/><span style={{fontSize:10,color:G.muted}}>{row[0]}</span></div>)}
</div>
<div style={{overflowX:"auto",paddingBottom:4}}>
<div style={{display:"flex",gap:6,alignItems:"flex-end",minWidth:480}}>
{months.map(m=>{var e=entrada(m);var ho=orto[m]/maxEnt*HH,hc=card[m]/maxEnt*HH;return <div key={m} style={{flex:"0 0 34px",width:34,display:"flex",flexDirection:"column",alignItems:"center"}}>
<div style={{fontSize:8,fontWeight:700,color:e>0?G.text:"transparent",marginBottom:3,whiteSpace:"nowrap"}}>{e>0?kfmt(e):"0"}</div>
<div style={{width:30,height:HH,display:"flex",flexDirection:"column",justifyContent:"flex-end",background:G.bg,borderRadius:4,overflow:"hidden"}}>
<div style={{height:ho,background:G.primary}}/>
<div style={{height:hc,background:G.blue}}/>
</div>
<div style={{fontSize:8.5,color:openMo===m?G.primary:G.muted,fontWeight:openMo===m?700:600,marginTop:4}}>{mLab(m)}</div>
</div>;})}
</div>
</div>
</div>

{cardMonths.length>0&&<div style={{background:G.card,borderRadius:12,padding:"12px 14px",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
<div style={{fontWeight:700,fontSize:13}}>💳 Cartão a compensar</div>
<div style={{fontSize:10.5,color:G.muted,marginBottom:9}}>Quando cada parcela cai na conta (valor cheio da parcela)</div>
<div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
{cardMonths.map(m=><div key={m} style={{background:G.blue+"15",borderRadius:8,padding:"5px 11px",fontSize:11,fontWeight:700,color:G.blue}}>{mLab(m)+" "+kfmt(card[m])}</div>)}
</div>
</div>}

{months.map(m=>{var open=openMo===m;var e=entrada(m),s=saldo(m);return <div key={m} style={{background:G.card,borderRadius:12,padding:open?"13px 15px":"10px 15px",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
<div onClick={()=>setOpenMo(open?null:m)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",gap:8}}>
<div>
<div style={{fontWeight:700,fontSize:13.5}}>{mFull(m)}</div>
{!open&&<div style={{fontSize:11,color:G.muted,marginTop:2}}>{(e>0||gasto[m]>0)?("Entradas "+cur(e)):"Sem movimento"}</div>}
</div>
<div style={{display:"flex",alignItems:"center",gap:9}}>
{(e>0||gasto[m]>0)&&<span style={{fontWeight:700,fontSize:13,color:s>=0?G.success:G.red}}>{(s>=0?"+":"")+cur(s)}</span>}
<span style={{color:G.muted,fontSize:12}}>{open?"▾":"▸"}</span>
</div>
</div>
{open&&<div style={{marginTop:11}}>
{[["💳 Cartão parcelado",card[m],G.blue],["🦷 Orto / carnê",orto[m],G.primary]].map(row=><div key={row[0]} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12.5}}><span style={{color:row[1]>0?G.text:G.muted}}>{row[0]}</span><span style={{fontWeight:700,color:row[1]>0?row[2]:G.muted}}>{cur(row[1])}</span></div>)}
<div style={{borderTop:"1px solid "+G.border,margin:"7px 0"}}/>
<div style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:12.5}}><span style={{fontWeight:700,color:G.success}}>＋ Entradas</span><span style={{fontWeight:700,color:G.success}}>{cur(e)}</span></div>
<div style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:12.5}}><span style={{color:G.red}}>－ Gastos previstos</span><span style={{fontWeight:700,color:G.red}}>{cur(gasto[m])}</span></div>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:s>=0?G.accent:"var(--red-soft)",borderRadius:8,padding:"7px 12px",marginTop:7}}><span style={{fontWeight:700,color:s>=0?G.primary:G.red}}>= Saldo do mês</span><span style={{fontFamily:"'Cormorant Garamond'",fontSize:17,fontWeight:700,color:s>=0?G.success:G.red}}>{(s>=0?"+":"")+cur(s)}</span></div>
</div>}
</div>;})}
</>}

</div>;
}


// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
// COMPARATIVO ANUAL
// ══════════════════════════════════════════════════════════
function ComparativoAnual({recs,gastos,dents,dn}){
const MESES=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MESESF=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const anoAtual=Number(today().slice(0,4));
const clin=(gastos&&gastos.clinica)||[];
const anosData=recs.map(r=>r.date&&r.date.slice(0,4)).concat(clin.map(e=>e.date&&e.date.slice(0,4))).filter(Boolean).map(Number);
const minAno=anosData.length?Math.min(...anosData):anoAtual;
const [ano,setAno]=useState(anoAtual);
const [bruto,setBruto]=useState(true);

const entradas=Array(12).fill(0);
recs.forEach(r=>{
  if(!r.paid||r.paid<=0)return;
  if(dn!=="all"&&r.dentistId!==Number(dn))return;
  if(!r.date||r.date.slice(0,4)!==String(ano))return;
  var m=Number(r.date.slice(5,7))-1;
  if(m<0||m>11)return;
  entradas[m]+=bruto?r.paid:calcNet(r.paid,r.payment);
});
const parcAtivaMes=(e,ym)=>{if(!e.parcelado)return false;var k=(Number(ym.slice(0,4))*12+Number(ym.slice(5,7)))-(Number((e.date||"").slice(0,4))*12+Number((e.date||"").slice(5,7)));return k>=0&&k<Number(e.parcelas||1);};
const saidas=Array(12).fill(0);
for(var mm=0;mm<12;mm++){
  var ym=ano+"-"+String(mm+1).padStart(2,"0");
  clin.forEach(function(e){
    var conta=(e.recorrente&&e.diaVenc)?true:e.parcelado?parcAtivaMes(e,ym):(e.date&&e.date.startsWith(ym));
    if(conta)saidas[mm]+=Number(e.value||0);
  });
}
const totIn=entradas.reduce((s,v)=>s+v,0);
const totOut=saidas.reduce((s,v)=>s+v,0);
const res=totIn-totOut;
const mesesAtivos=entradas.filter((v,i)=>v>0||saidas[i]>0).length;
const maxV=Math.max(...entradas,...saidas,1);
const shiftAno=(d)=>{var n=ano+d;if(n<minAno||n>anoAtual)return;setAno(n);};

return <div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">

{/* Seletor de ano */}
<div style={{display:"flex",alignItems:"center",gap:8}}>
  <button onClick={()=>shiftAno(-1)} disabled={ano<=minAno} style={{border:"1.5px solid "+G.border,background:"var(--surface)",borderRadius:8,padding:"7px 15px",fontWeight:700,cursor:ano<=minAno?"default":"pointer",color:ano<=minAno?G.muted:G.primary,fontSize:18,opacity:ano<=minAno?0.4:1}}>{"<"}</button>
  <div style={{flex:1,textAlign:"center",fontWeight:700,fontSize:20,color:G.primary,fontFamily:"'Cormorant Garamond'"}}>{ano}</div>
  <button onClick={()=>shiftAno(1)} disabled={ano>=anoAtual} style={{border:"1.5px solid "+G.border,background:"var(--surface)",borderRadius:8,padding:"7px 15px",fontWeight:700,cursor:ano>=anoAtual?"default":"pointer",color:ano>=anoAtual?G.muted:G.primary,fontSize:18,opacity:ano>=anoAtual?0.4:1}}>{">"}</button>
</div>

{/* Toggle bruto/liquido */}
<div style={{display:"flex",gap:0,background:G.bg,borderRadius:9,padding:3}}>
  {[["Bruto",true],["Líquido",false]].map(([l,val])=>(
    <button key={l} onClick={()=>setBruto(val)} style={{flex:1,border:"none",borderRadius:7,padding:"7px 4px",fontSize:12,fontWeight:700,cursor:"pointer",background:bruto===val?G.primary:"transparent",color:bruto===val?"#fff":G.muted}}>{l}</button>
  ))}
</div>

{/* Cards resumo */}
<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:11}}>
  {[["Entradas (ano)",totIn,G.success],["Saídas (ano)",totOut,G.red],["Resultado",res,res>=0?G.success:G.red],["Média/mês",mesesAtivos?totIn/mesesAtivos:0,G.primary]].map(([l,v,c])=>(
    <div key={l} style={{background:G.card,borderRadius:10,padding:"12px 14px",textAlign:"center",borderTop:"4px solid "+c,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
      <div style={{fontSize:10,color:G.muted,fontWeight:700,marginBottom:4}}>{l}</div>
      <div style={{fontFamily:"'Cormorant Garamond'",fontSize:20,color:c}}>{cur(v)}</div>
    </div>
  ))}
</div>

{/* Grafico 12 meses */}
<div style={{background:G.card,borderRadius:12,padding:"16px 12px 10px",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
  <div style={{display:"flex",gap:16,justifyContent:"center",marginBottom:14,fontSize:11,fontWeight:600,color:G.muted}}>
    <span><span style={{display:"inline-block",width:10,height:10,borderRadius:3,background:G.success,marginRight:5,verticalAlign:-1}}/>Entrada</span>
    <span><span style={{display:"inline-block",width:10,height:10,borderRadius:3,background:G.red,marginRight:5,verticalAlign:-1}}/>Saída</span>
  </div>
  <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:2,height:130,padding:"0 2px"}}>
    {MESES.map((mn,i)=>(
      <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,height:"100%",justifyContent:"flex-end"}}>
        <div style={{display:"flex",alignItems:"flex-end",gap:2,height:"100%",width:"100%",justifyContent:"center"}}>
          <div style={{width:8,borderRadius:"3px 3px 0 0",background:G.success,height:(entradas[i]?Math.max(entradas[i]/maxV*100,3):0)+"%",transition:"height .4s"}}/>
          <div style={{width:8,borderRadius:"3px 3px 0 0",background:G.red,height:(saidas[i]?Math.max(saidas[i]/maxV*100,3):0)+"%",transition:"height .4s"}}/>
        </div>
        <div style={{fontSize:9,color:G.muted,fontWeight:700}}>{mn}</div>
      </div>
    ))}
  </div>
</div>

{/* Lista mes a mes */}
<div style={{background:G.card,borderRadius:12,padding:14,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
  <div style={{fontWeight:700,marginBottom:12,fontSize:13}}>{"Detalhe mês a mês \u2014 "+ano}</div>
  {mesesAtivos===0&&<p style={{color:G.muted,fontSize:12}}>Nenhum lançamento neste ano</p>}
  {MESESF.map((mn,i)=>{
    if(entradas[i]<=0&&saidas[i]<=0)return null;
    var saldo=entradas[i]-saidas[i];
    var sc=saldo>=0?G.success:G.red;
    return <div key={i} style={{padding:"11px 0",borderBottom:"1px solid "+G.border}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
        <span style={{fontWeight:700,fontSize:13.5,textTransform:"capitalize"}}>{mn}</span>
        <span style={{fontWeight:700,fontSize:13,color:sc}}>{(saldo>=0?"+":"")+cur(saldo)}</span>
      </div>
      <div style={{marginBottom:5}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}><span style={{color:G.success,fontWeight:700}}>Entrou</span><span style={{fontWeight:700}}>{cur(entradas[i])}</span></div>
        <div style={{background:G.border,borderRadius:6,height:7,overflow:"hidden"}}><div style={{height:7,borderRadius:6,background:G.success,width:Math.max(entradas[i]/maxV*100,2)+"%",transition:"width .5s"}}/></div>
      </div>
      <div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}><span style={{color:G.red,fontWeight:700}}>Saiu</span><span style={{fontWeight:700}}>{cur(saidas[i])}</span></div>
        <div style={{background:G.border,borderRadius:6,height:7,overflow:"hidden"}}><div style={{height:7,borderRadius:6,background:G.red,width:Math.max(saidas[i]/maxV*100,2)+"%",transition:"width .5s"}}/></div>
      </div>
    </div>;
  })}
  {mesesAtivos>0&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,paddingTop:12,borderTop:"2px solid "+G.border}}>
    <span style={{fontWeight:700,fontSize:13}}>Total do ano</span>
    <div style={{textAlign:"right"}}>
      <div style={{fontWeight:700,fontSize:12,color:G.success}}>{"Entrou "+cur(totIn)}</div>
      <div style={{fontWeight:700,fontSize:12,color:G.red}}>{"Saiu "+cur(totOut)}</div>
      <div style={{fontWeight:800,fontSize:15,marginTop:2,color:res>=0?G.success:G.red}}>{(res>=0?"+":"")+cur(res)}</div>
    </div>
  </div>}
</div>

</div>;
}

// ══════════════════════════════════════════════════════════
// FINANCEIRO
// ══════════════════════════════════════════════════════════
function Financeiro({recs,setRecs,pats,dents,expenses,gastos,treats,user}){
const [modo,setModo]=useState("mensal"); // "mensal" | "diario"
const [mo,setMo]=useState(today().slice(0,7));
const [dia,setDia]=useState(today());
const [dn,setDn]=useState("all");

const PC={"Dinheiro":G.success,"PIX":"#00B894","Cartao Credito":G.blue,"Cartao Debito":"#6C5CE7","Convenio":G.muted,"Cheque":G.orange,"Cartão Crédito":G.blue,"Cartão Débito":"#6C5CE7","Convênio":G.muted,"Pix/Cartão Dentistas":G.purple};

// Filtro de registros
const mr=recs.filter(r=>{
if(!r.paid||r.paid<=0)return false;
if(dn!=="all"&&r.dentistId!==Number(dn))return false;
if(modo==="mensal")return r.date.startsWith(mo);
return r.date===dia;
});

const raw=mr.reduce((s,r)=>s+r.paid,0);
const liq=mr.reduce((s,r)=>s+calcNet(r.paid,r.payment),0);
const parcAtivaMes=(e,ym)=>{if(!e.parcelado)return false;var k=(Number(ym.slice(0,4))*12+Number(ym.slice(5,7)))-(Number((e.date||"").slice(0,4))*12+Number((e.date||"").slice(5,7)));return k>=0&&k<Number(e.parcelas||1);};
const clinicExp=(gastos&&gastos.clinica||[]).filter(e=>{if(modo==="mensal")return (e.recorrente&&e.diaVenc)?true:e.parcelado?parcAtivaMes(e,mo):(e.date&&e.date.startsWith(mo));if(e.recorrente&&e.diaVenc)return Number(e.diaVenc)===Number(dia.slice(8,10));if(e.parcelado)return parcAtivaMes(e,dia.slice(0,7))&&Number((e.date||"").slice(8))===Number(dia.slice(8,10));return e.date===dia;}).reduce((s,e)=>s+Number(e.value||0),0);
const byPbase=PAY.map(pt=>({pt,v:mr.filter(r=>r.payment===pt).reduce((s,r)=>s+r.paid,0)})).filter(x=>x.v>0);
const vDentDir=mr.filter(r=>getDentFromPayment(r.payment,dents)).reduce((s,r)=>s+r.paid,0);
const byP=vDentDir>0?byPbase.concat([{pt:"Pix/Cartão Dentistas",v:vDentDir}]):byPbase;
const mx=Math.max(...byP.map(x=>x.v),1);

// Para modo diario: navegar dia a dia
const prevDia=()=>{const d=new Date(dia+"T12:00");d.setDate(d.getDate()-1);setDia(d.toISOString().split("T")[0]);};
const nextDia=()=>{const d=new Date(dia+"T12:00");d.setDate(d.getDate()+1);setDia(d.toISOString().split("T")[0]);};
const shiftMes=(delta)=>{const y=Number(mo.slice(0,4)),m=Number(mo.slice(5,7));const d=new Date(y,m-1+delta,1);setMo(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));};

// Para modo mensal: agrupar por dia
const porDia={};
if(modo==="mensal"){
mr.forEach(r=>{
if(!porDia[r.date])porDia[r.date]={raw:0,liq:0,recs:[]};
porDia[r.date].raw+=r.paid;
porDia[r.date].liq+=calcNet(r.paid,r.payment);
porDia[r.date].recs.push(r);
});
}

const [diaAberto,setDiaAberto]=useState(null);

return <div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">

{/* Header */}

<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
  <h2 style={{fontFamily:"'Cormorant Garamond'",fontSize:26}}>Financeiro</h2>
  <Sel val={dn} set={setDn} opts={[{v:"all",l:"Todos"},...dents.map(d=>({v:d.id,l:d.name}))]} style={{width:180}}/>
</div>

{/* Toggle mensal/diario */}

<div style={{display:"flex",gap:0,background:G.bg,borderRadius:10,padding:3}}>
  {[["mensal","📅 Mensal"],["diario","📆 Diário"],["fluxo","📈 Fluxo"],["anual","📊 Anual"]].map(([k,l])=>(
    <button key={k} onClick={()=>setModo(k)} style={{flex:1,border:"none",borderRadius:8,padding:"9px 4px",fontSize:13,fontWeight:700,cursor:"pointer",background:modo===k?G.primary:G.bg,color:modo===k?"#fff":G.muted,transition:"all .15s"}}>{l}</button>
  ))}
</div>

{/* Seletor de periodo */}
{modo==="mensal"&&(
  <div style={{display:"flex",alignItems:"center",gap:8}}>
    <button onClick={()=>shiftMes(-1)} style={{border:"1.5px solid "+G.border,background:"var(--surface)",borderRadius:8,padding:"7px 13px",fontWeight:700,cursor:"pointer",color:G.primary,fontSize:16}}>{"<"}</button>
    <input type="month" value={mo} onChange={e=>setMo(e.target.value)} style={{flex:1,border:"1.5px solid "+G.border,borderRadius:8,padding:"9px 12px",fontSize:14,outline:"none",textAlign:"center"}}/>
    <button onClick={()=>shiftMes(1)} style={{border:"1.5px solid "+G.border,background:"var(--surface)",borderRadius:8,padding:"7px 13px",fontWeight:700,cursor:"pointer",color:G.primary,fontSize:16}}>{">"}</button>
    <button onClick={()=>setMo(today().slice(0,7))} style={{border:"1.5px solid "+G.border,background:mo===today().slice(0,7)?G.primary:"var(--card)",color:mo===today().slice(0,7)?"#fff":G.primary,borderRadius:8,padding:"7px 11px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Atual</button>
  </div>
)}
{modo==="diario"&&(

  <div style={{display:"flex",alignItems:"center",gap:8}}>
    <button onClick={prevDia} style={{border:"1.5px solid "+G.border,background:"var(--surface)",borderRadius:8,padding:"7px 13px",fontWeight:700,cursor:"pointer",color:G.primary,fontSize:16}}>{"<"}</button>
    <input type="date" value={dia} onChange={e=>setDia(e.target.value)} style={{flex:1,border:"1.5px solid "+G.border,borderRadius:8,padding:"9px 12px",fontSize:14,outline:"none",textAlign:"center"}}/>
    <button onClick={nextDia} style={{border:"1.5px solid "+G.border,background:"var(--surface)",borderRadius:8,padding:"7px 13px",fontWeight:700,cursor:"pointer",color:G.primary,fontSize:16}}>{">"}</button>
    <button onClick={()=>setDia(today())} style={{border:"1.5px solid "+G.border,background:dia===today()?G.primary:"var(--card)",color:dia===today()?"#fff":G.primary,borderRadius:8,padding:"7px 11px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Hoje</button>
  </div>
)}

{/* Fluxo de caixa: projecao 12 meses (somente leitura) */}
{modo==="fluxo"&&<FluxoCaixa recs={recs} treats={treats} pats={pats} dents={dents} gastos={gastos} dn={dn}/>}
{modo==="anual"&&<ComparativoAnual recs={recs} gastos={gastos} dents={dents} dn={dn}/>}

{/* Cards resumo */}

{modo!=="fluxo"&&modo!=="anual"&&<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:11}}>
  {[["Receita Bruta",raw,G.primary],["Receita Líquida",liq,G.success],["Gastos Clínica",clinicExp,G.red],["Resultado",liq-clinicExp,liq-clinicExp>=0?G.success:G.red]].map(([l,v,c])=>(
    <div key={l} style={{background:G.card,borderRadius:10,padding:"12px 14px",textAlign:"center",borderTop:"4px solid "+c,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
      <div style={{fontSize:10,color:G.muted,fontWeight:700,marginBottom:4}}>{l}</div>
      <div style={{fontFamily:"'Cormorant Garamond'",fontSize:22,color:c}}>{cur(v)}</div>
    </div>
  ))}
</div>}

{/* Por forma de pagamento */}
{modo!=="fluxo"&&modo!=="anual"&&byP.length>0&&<div style={{background:G.card,borderRadius:12,padding:14,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>

  <div style={{fontWeight:700,marginBottom:11,fontSize:13}}>Por Forma de Pagamento</div>
  {byP.map(({pt,v})=><div key={pt} style={{marginBottom:10}}>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
      <span style={{fontSize:12,fontWeight:600}}>{pt}</span>
      <div style={{display:"flex",gap:9}}>
        <span style={{fontSize:12,fontWeight:700}}>{cur(v)}</span>
        {(pt==="Cartão Crédito"||pt==="Cartão Débito")&&<span style={{fontSize:10,color:G.red}}>líq:{cur(calcNet(v,pt))}</span>}
      </div>
    </div>
    <div style={{background:G.border,borderRadius:6,height:8}}><div style={{background:PC[pt]||G.muted,height:8,borderRadius:6,width:(v/mx*100)+"%",transition:"width .4s"}}/></div>
  </div>)}
</div>}

{/* MODO MENSAL: lista agrupada por dia */}
{modo==="mensal"&&<div style={{background:G.card,borderRadius:12,padding:14,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>

  <div style={{fontWeight:700,marginBottom:11,fontSize:13}}>{"Dias com recebimento ("+Object.keys(porDia).length+")"}</div>
  {Object.keys(porDia).length===0&&<p style={{color:G.muted,fontSize:12}}>Nenhum recebimento neste mês</p>}
  {Object.keys(porDia).sort((a,b)=>b.localeCompare(a)).map(d=>{
    const info=porDia[d];
    const aberto=diaAberto===d;
    return <div key={d} style={{borderBottom:"1px solid "+G.border,marginBottom:2}}>
      <div onClick={()=>setDiaAberto(aberto?null:d)} style={{display:"flex",alignItems:"center",padding:"9px 4px",cursor:"pointer",gap:10}}>
        <span style={{fontSize:12,color:G.muted,minWidth:85}}>{fmt(d)}</span>
        <span style={{flex:1,fontSize:12,color:G.muted}}>{info.recs.length+" atend."}</span>
        <span style={{fontWeight:700,fontSize:13,color:G.primary}}>{cur(info.raw)}</span>
        {info.raw!==info.liq&&<span style={{fontSize:11,color:G.muted}}>({cur(info.liq)})</span>}
        <span style={{color:G.muted,fontSize:14}}>{aberto?"v":">"}</span>
      </div>
      {aberto&&<div style={{paddingBottom:8,paddingLeft:4}}>
        {info.recs.map(r=>{
          const p=pats.find(x=>x.id===r.patientId);
          const den=dents.find(x=>x.id===r.dentistId)||dents[0];
          return <div key={r.id} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 0",borderTop:"1px solid "+G.border,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:80}}>
              <span style={{fontSize:12,fontWeight:600}}>{p?.name||"--"}</span>
              <span style={{fontSize:11,color:G.muted}}>{" - "+r.procedure}</span>
            </div>
            <span style={{fontSize:11,color:den.color,fontWeight:600}}>{den.name.split(" ")[0]}</span>
            <Bdg l={r.payment} col={PC[r.payment]||G.muted} sm/>
            {r.inst>1&&<Bdg l={r.inst+"x"} col={G.blue} sm/>}
            <span style={{fontWeight:700,fontSize:12}}>{cur(r.paid)}</span>
            {(r.payment==="Cartão Crédito"||r.payment==="Cartão Débito")&&<span style={{fontSize:10,color:G.red}}>→{cur(calcNet(r.paid,r.payment))}</span>}
          {user.level>=3&&<button onClick={()=>{if(window.confirm("Excluir este pagamento?"))setRecs(prev=>prev.filter(x=>x.id!==r.id));}} style={{background:G.red,color:"#fff",border:"none",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700,cursor:"pointer"}}>Excluir</button>}
          </div>;
        })}
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:5,paddingTop:5,borderTop:"1px solid "+G.border}}>
          <span style={{fontSize:11,color:G.muted}}>Bruto: {cur(info.raw)}</span>
          <span style={{fontSize:11,fontWeight:700,color:G.success}}>Líq: {cur(info.liq)}</span>
        </div>
      </div>}
    </div>;
  })}
  {/* Total mensal */}
  {Object.keys(porDia).length>0&&<div style={{display:"flex",justifyContent:"space-between",marginTop:10,paddingTop:10,borderTop:"2px solid "+G.border}}>
    <span style={{fontWeight:700,fontSize:13}}>Total do mês</span>
    <div style={{textAlign:"right"}}>
      <div style={{fontWeight:700,fontSize:15,color:G.primary}}>{cur(raw)}</div>
      <div style={{fontSize:11,color:G.muted}}>líq: {cur(liq)}</div>
    </div>
  </div>}
</div>}

{/* MODO DIARIO: lista detalhada do dia */}
{modo==="diario"&&<div style={{background:G.card,borderRadius:12,padding:14,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>

  <div style={{fontWeight:700,marginBottom:11,fontSize:13}}>{"Atendimentos - "+fmt(dia)+" ("+mr.length+")"}</div>
  {mr.length===0&&<div style={{textAlign:"center",padding:24,color:G.muted,fontSize:13}}>
    <div style={{fontSize:28,marginBottom:6}}>0</div>
    Nenhum recebimento neste dia
  </div>}
  {mr.sort((a,b)=>a.date.localeCompare(b.date)).map(r=>{
    const p=pats.find(x=>x.id===r.patientId);
    const d=dents.find(x=>x.id===r.dentistId)||dents[0];
    return <div key={r.id} style={{padding:"10px 0",borderBottom:"1px solid "+G.border}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:13}}>{p?.name||"--"}</div>
          <div style={{fontSize:12,color:G.muted,marginTop:1}}>{r.procedure}</div>
          <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:11,color:d.color,fontWeight:600}}>{d.name.split(" ")[0]}</span>
            <Bdg l={r.payment} col={PC[r.payment]||G.muted} sm/>
            {r.inst>1&&<Bdg l={r.inst+"x crédito"} col={G.blue} sm/>}
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontWeight:700,fontSize:15,color:G.primary}}>{cur(r.paid)}</div>
          {(r.payment==="Cartão Crédito"||r.payment==="Cartão Débito")&&(
            <div style={{fontSize:11,color:G.muted}}>líq: {cur(calcNet(r.paid,r.payment))}</div>
          )}
        </div>
      </div>
      {user?.level>=3&&<button onClick={()=>{if(window.confirm("Excluir pagamento de "+cur(r.paid)+"?"))setRecs(prev=>prev.filter(x=>x.id!==r.id));}} style={{background:G.red,color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",marginTop:6}}>Excluir</button>}
    </div>;
  })}
  {mr.length>0&&<div style={{display:"flex",justifyContent:"space-between",marginTop:12,paddingTop:10,borderTop:"2px solid "+G.border}}>
    <span style={{fontWeight:700,fontSize:14}}>Total do dia</span>
    <div style={{textAlign:"right"}}>
      <div style={{fontWeight:800,fontSize:18,color:G.primary}}>{cur(raw)}</div>
      <div style={{fontSize:11,color:G.muted}}>líq: {cur(liq)}</div>
    </div>
  </div>}
</div>}

</div>;
}

// ══════════════════════════════════════════════════════════
// NF TAB - Relatorio de Notas Fiscais (admin only) - V211
function NFTab({pats,dents,mo,abrirFicha}){
const [dia,setDia]=useState("");
const [emit,setEmit]=useState("all");
const [stF,setStF]=useState("all");
const [busca,setBusca]=useState("");
const statusC={pending:G.yellow,issued:G.success,cancelled:G.red};
const statusL={pending:"Pendente",issued:"Emitida",cancelled:"Cancelada"};
const digits=function(s){return String(s||"").replace(/\D/g,"");};
const all=[];
pats.forEach(function(p){(p.nfs||[]).forEach(function(n){all.push({n:n,p:p});});});
const res=all.filter(function(x){
  var n=x.n,p=x.p;
  if(!n.date||!n.date.startsWith(mo))return false;
  if(dia&&n.date!==dia)return false;
  if(emit==="empresa"&&n.payer!=="empresa")return false;
  if(emit!=="all"&&emit!=="empresa"&&!(n.payer==="dentista"&&String(n.dentistId)===emit))return false;
  if(stF!=="all"&&(n.status||"pending")!==stF)return false;
  if(busca){
    var q=busca.toLowerCase(),qd=digits(busca);
    var hit=(p.name||"").toLowerCase().indexOf(q)>=0
      ||(n.payerName||"").toLowerCase().indexOf(q)>=0
      ||(n.procedure||"").toLowerCase().indexOf(q)>=0
      ||String(n.number||"").toLowerCase().indexOf(q)>=0
      ||(qd.length>0&&digits(n.payerCnpj).indexOf(qd)>=0);
    if(!hit)return false;
  }
  return true;
}).sort(function(a,b){return (b.n.date||"").localeCompare(a.n.date||"")||((b.n.id||0)-(a.n.id||0));});
const bruto=res.reduce(function(s,x){return s+Number(x.n.value||0);},0);
const imp=res.reduce(function(s,x){return s+Number(x.n.tax||0);},0);
const MESES_PT=["Janeiro","Fevereiro","Marco","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const moLabel=(function(){var pr=mo.split("-");return (MESES_PT[Number(pr[1])-1]||pr[1])+" de "+pr[0];})();
const imprimir=function(){
  var w=window.open("","_blank");
  if(!w){alert("Permita pop-ups para imprimir o relatorio.");return;}
  var rows=res.map(function(x){
    var n=x.n,d=dents.find(function(dd){return dd.id===Number(n.dentistId);});
    var emitente=n.payer==="empresa"?((n.payerName||"Empresa")+(n.payerCnpj?" - CNPJ "+n.payerCnpj:"")):(d?d.name:"Dentista");
    return "<tr><td>"+fmt(n.date)+"</td><td>"+(n.number||"-")+"</td><td>"+(x.p.name||"")+"</td><td>"+(n.procedure||"")+"</td><td>"+emitente+"</td><td style='text-align:right'>"+cur(n.value)+"</td><td style='text-align:right'>"+cur(n.tax||0)+"</td><td style='text-align:right'>"+cur(Number(n.value||0)-Number(n.tax||0))+"</td><td>"+(statusL[n.status||"pending"]||"")+"</td></tr>";
  }).join("");
  var html="<!DOCTYPE html><html><head><meta charset='utf-8'><title>Notas Fiscais - "+moLabel+"</title><style>body{font-family:Arial,sans-serif;font-size:12px;color:#23332b;padding:24px;}h1{font-size:18px;margin-bottom:2px;}h2{font-size:13px;font-weight:normal;color:#666;margin-bottom:16px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ccc;padding:5px 7px;text-align:left;}th{background:#eef2ec;font-size:11px;text-transform:uppercase;}tfoot td{font-weight:bold;background:#eef2ec;}@media print{body{padding:0;}}</style></head><body>"
    +"<h1>Affonso Odontologia - Relatorio de Notas Fiscais</h1>"
    +"<h2>"+moLabel+(dia?" - Dia "+fmt(dia):"")+" - "+res.length+" nota(s)</h2>"
    +"<table><thead><tr><th>Data</th><th>N&ordm;</th><th>Paciente</th><th>Procedimento</th><th>Emitente</th><th>Valor</th><th>ISS</th><th>Liquido</th><th>Status</th></tr></thead>"
    +"<tbody>"+rows+"</tbody>"
    +"<tfoot><tr><td colspan='5'>Totais</td><td style='text-align:right'>"+cur(bruto)+"</td><td style='text-align:right'>"+cur(imp)+"</td><td style='text-align:right'>"+cur(bruto-imp)+"</td><td></td></tr></tfoot></table>"
    +"<script>window.onload=function(){window.print();};<\/script></body></html>";
  w.document.write(html);w.document.close();
};
return <div style={{display:"flex",flexDirection:"column",gap:14}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
    <span style={{fontWeight:700,fontSize:15,color:G.primary}}>{"\U0001F9FE Notas Fiscais \u00b7 "+moLabel}</span>
    <Btn ch={"\U0001F5A8\uFE0F Imprimir"} sm onClick={imprimir}/>
  </div>
  {/* Cards de totais */}
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:11}}>
    {[
      ["Notas",String(res.length),G.text],
      ["Valor bruto",cur(bruto),G.primary],
      ["Impostos / ISS",cur(imp),G.red],
      ["Liquido",cur(bruto-imp),G.success],
    ].map(function(c){return <div key={c[0]} className="nm-raised" style={{borderRadius:14,padding:"12px 14px"}}>
      <div style={{fontSize:10,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>{c[0]}</div>
      <div style={{fontFamily:"'Cormorant Garamond'",fontSize:21,color:c[2],marginTop:2}}>{c[1]}</div>
    </div>;})}
  </div>
  {/* Filtros */}
  <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <label style={{fontSize:10.5,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Dia (opcional)</label>
      <input type="date" value={dia} min={mo+"-01"} max={mo+"-31"} onChange={function(e){setDia(e.target.value);}} style={{padding:"8px 11px",fontSize:13,width:150}}/>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <label style={{fontSize:10.5,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Emitente</label>
      <select value={emit} onChange={function(e){setEmit(e.target.value);}} style={{padding:"8px 11px",fontSize:13,minWidth:150}}>
        <option value="all">Todos</option>
        <option value="empresa">{"\U0001F3E2 Empresa (CNPJ)"}</option>
        {dents.map(function(d){return <option key={d.id} value={String(d.id)}>{d.name}</option>;})}
      </select>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <label style={{fontSize:10.5,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Status</label>
      <select value={stF} onChange={function(e){setStF(e.target.value);}} style={{padding:"8px 11px",fontSize:13,minWidth:120}}>
        <option value="all">Todos</option>
        <option value="issued">Emitida</option>
        <option value="pending">Pendente</option>
        <option value="cancelled">Cancelada</option>
      </select>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:4,flex:1,minWidth:180}}>
      <label style={{fontSize:10.5,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Buscar</label>
      <input type="text" value={busca} placeholder={"\U0001F50E Empresa, CNPJ, paciente, procedimento ou n\u00ba..."} onChange={function(e){setBusca(e.target.value);}} style={{padding:"8px 11px",fontSize:13,width:"100%"}}/>
    </div>
    {(dia||emit!=="all"||stF!=="all"||busca)&&<button onClick={function(){setDia("");setEmit("all");setStF("all");setBusca("");}} style={{border:"none",background:"none",color:G.red,fontSize:12,fontWeight:700,cursor:"pointer",padding:"8px 4px"}}>{"\u2715 Limpar"}</button>}
  </div>
  {/* Lista */}
  {res.length===0&&<div style={{background:G.bg,borderRadius:10,padding:20,textAlign:"center",color:G.muted,fontSize:13}}>Nenhuma nota fiscal encontrada nesse periodo com esses filtros.</div>}
  {res.map(function(x){
    var n=x.n,p=x.p;
    var d=dents.find(function(dd){return dd.id===Number(n.dentistId);});
    return <div key={p.id+"-"+n.id} onClick={function(){if(abrirFicha)abrirFicha(p);}} className="nm-raised" style={{borderRadius:13,padding:"12px 15px",cursor:"pointer",borderLeft:"4px solid "+(n.payer==="empresa"?G.blue:G.purple)}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontWeight:700,fontSize:13.5}}>{p.name}<span style={{color:G.muted,fontWeight:500}}>{n.number?" \u00b7 NF "+n.number:" \u00b7 sem n\u00ba"}</span></div>
          <div style={{fontSize:11.5,color:G.muted,marginTop:2}}>{fmt(n.date)+" \u00b7 "+(n.procedure||"")}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontWeight:800,fontSize:15,color:G.primary}}>{cur(n.value)}</div>
          {Number(n.tax)>0&&<div style={{fontSize:11,color:G.muted}}>{"ISS: "+cur(n.tax)+" \u00b7 l\u00edq "+cur(Number(n.value||0)-Number(n.tax||0))}</div>}
        </div>
      </div>
      <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center",marginTop:7}}>
        <span style={{background:(statusC[n.status||"pending"]||G.muted)+"22",color:statusC[n.status||"pending"]||G.muted,borderRadius:12,padding:"2px 10px",fontSize:10.5,fontWeight:700}}>{statusL[n.status||"pending"]||"Pendente"}</span>
        {n.payer==="empresa"
          ?<span style={{fontSize:11,color:G.blue,fontWeight:600}}>{"\U0001F3E2 "+(n.payerName||"Empresa")+(n.payerCnpj?" \u00b7 "+n.payerCnpj:"")}</span>
          :<span style={{fontSize:11,color:G.purple,fontWeight:600}}>{"\U0001F468\u200D\u2695\uFE0F "+(d?d.name:"Dentista")}</span>}
      </div>
    </div>;
  })}
</div>;
}

// MSG TAB - WhatsApp component (outside Relatorios to allow useState)
// ══════════════════════════════════════════════════════════
function MsgTab({pats,waTemplates,setWaTemplates,user}){
const NL="\n";
const mk=lines=>lines.join(NL);
const [msgTab,setMsgTab]=useState("datas");
const getTpl=function(key){return (waTemplates&&waTemplates[key])||WA_TEMPLATES_DEFAULT[key]||"";};
const saveTpl=function(key,val){setWaTemplates(function(prev){return {...prev,[key]:val};});};
const resetTpl=function(key){setWaTemplates(function(prev){var n={...prev};delete n[key];return n;});};
const [editKey,setEditKey]=useState(null);
const [editVal,setEditVal]=useState("");
const ALL_TPLS=[
  {key:"confirmacao",label:"✅ Confirmação de Consulta",desc:"Enviado ao confirmar consulta na agenda"},
  {key:"vespera",label:"🔔 Véspera de Consulta",desc:"Lembrete enviado no dia anterior"},
  {key:"cancelou",label:"🔄 Paciente Cancelou",desc:"Quando paciente cancela a consulta"},
  {key:"remarcar",label:"📵 Remarcar",desc:"Quando paciente faltou ou desmarcou"},
  {key:"bday",label:"🎂 Aniversário",desc:"Parabéns para o paciente"},
  {key:"semestral",label:"📅 Controle Semestral",desc:"Retorno semestral de pacientes"},
  {key:"fim",label:"✅ Fim de Tratamento",desc:"Conclusão do tratamento"},
  {key:"poscirurgia",label:"🏥 Pós-Cirurgia",desc:"Acompanhamento pós-procedimento"},
  {key:"natal",label:"🎄 Natal",desc:"Mensagem de Natal"},
  {key:"reveillon",label:"🥂 Réveillon",desc:"Feliz Ano Novo"},
  {key:"pascoa",label:"🐣 Páscoa",desc:"Mensagem de Páscoa"},
];

const DATAS=[
{id:"natal",  label:"🎄 Natal",       msg:mk(["🎄 Feliz Natal! 🦷✨","","Olá, {nome}!","","Nesta data tão especial, a equipe Affonso Odontologia deseja a você e sua família um Natal repleto de alegria, saúde e muitos sorrisos!","","Que o próximo ano traga ainda mais motivos para sorrir! 😁","","Com carinho,","Dr. Diego Affonso e equipe 🤍"])},
{id:"reveillon",label:"🥂 Réveillon", msg:mk(["🥂 Feliz Ano Novo! 🎉","","Olá, {nome}!","","Que este novo ano seja repleto de saúde, alegria e sorrisos bonitos! 😁","","Continuamos aqui para cuidar do seu sorriso.","","Com carinho,","Dr. Diego Affonso e equipe 🦷"])},
{id:"pascoa",  label:"🐣 Páscoa",      msg:mk(["🐣 Feliz Páscoa! 🍫","","Olá, {nome}!","","Desejamos a você uma Páscoa cheia de paz, amor e razões para sorrir! 😊","","Lembre-se: depois dos chocolates, não esqueça da higiene bucal! 🦷😄","","Com carinho,","Dr. Diego Affonso e equipe"])},
{id:"mae",    label:"💐 Dia das Mães", msgF:mk(["💐 Feliz Dia das Mães!","","Olá, {nome}!","","Neste dia tão especial, queremos te parabenizar por todo amor e dedicação que você oferece! Que seu sorriso ilumine sempre quem você ama. 😊🌸","","Com muito carinho,","Dr. Diego Affonso e equipe 🦷"]), msgM:mk(["💐 Feliz Dia das Mães!","","Olá, {nome}!","","Neste dia especial, desejamos que a mãe da sua vida seja muito celebrada! 💐😊","","Com carinho,","Dr. Diego Affonso e equipe 🦷"])},
{id:"pai",    label:"👔 Dia dos Pais", msgM:mk(["👔 Feliz Dia dos Pais!","","Olá, {nome}!","","Neste dia especial, queremos te parabenizar por toda dedicação e amor que você oferece à sua família! 😊","","Com muito carinho,","Dr. Diego Affonso e equipe 🦷"]), msgF:mk(["👔 Feliz Dia dos Pais!","","Olá, {nome}!","","Neste dia especial, desejamos que o pai da sua vida seja muito celebrado! 👔😊","","Com carinho,","Dr. Diego Affonso e equipe 🦷"])},
{id:"crianca",label:"👧 Dia das Crianças",msg:mk(["👧 Feliz Dia das Crianças! 🎈","","Olá, {nome}!","","Que o sorriso das crianças ilumine seu dia! 😁","","Cuide do sorrisinho dos pequenos - uma boa saúde bucal começa cedo!","","Com carinho,","Dr. Diego Affonso e equipe 🦷"])},
];
const MSGS=[
{id:"bday",     label:"🎂 Aniversário",       msg:mk(["🎂 Feliz Aniversário, {nome}! 🥳","","A equipe Affonso Odontologia deseja um dia incrível cheio de alegria e muitos sorrisos!","","Que este novo ano seja repleto de saúde e conquistas. 🌟","","Parabéns!","Dr. Diego Affonso e equipe 🦷🤍"])},
{id:"fim",      label:"✅ Fim de Tratamento",  msg:mk(["Olá, {nome}! 😊","","Agradecemos imensamente pela confiança no nosso trabalho! 🦷✨","","Seu tratamento foi concluído com sucesso. Para manter os resultados, é fundamental a *manutenção semestral* - uma consulta a cada 6 meses evita novos problemas.","","Já anote na agenda: seu próximo retorno é em *{mes_retorno}*. 📅","","Estamos sempre aqui para você!","Com carinho, Dr. Diego Affonso e equipe 🤍"])},
{id:"semestral",label:"📅 Controle Semestral",msg:mk(["Olá, {nome}! 😊","","Estamos com saudades do seu sorriso! 🦷","","Já faz alguns meses desde sua última consulta. Que tal agendar seu controle semestral? É rápido e fundamental para manter sua saúde bucal em dia!","","Entre em contato - ficaremos felizes em recebê-lo(a)! 😁","","Affonso Odontologia"])},
{id:"retorno",  label:"⚠️ Retorno Tratamento",msg:mk(["Olá, {nome}! 😊","","Notamos que você está em tratamento conosco e ainda não remarcou sua próxima consulta. Que tal agendarmos? 😊","","Estamos aqui para você!","","Affonso Odontologia"])},
];

const MES_FULL=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const nextMo=()=>{const d=new Date();d.setMonth(d.getMonth()+6);return MES_FULL[d.getMonth()]+"/"+d.getFullYear();};

const resolveTemplate=(d,p)=>{
let t=d.msg||"";
if(d.msgF||d.msgM){
const g=p?p.genero||"":"F";
t=g==="M"?(d.msgM||d.msg||""):(d.msgF||d.msg||"");
}
return t.replace(/{nome}/g,p?p.name:"{nome}").replace(/{mes_retorno}/g,nextMo());
};

const withPhone=pats.filter(p=>p.phone);
const bdayToday=pats.filter(p=>isBday(p.dob));

// Preview modal state
const [preview,setPreview]=useState(null);
// {type:"single"|"batch"|"data", ph, name, editText, targets, dataObj, msgTemplate}

const openSingle=(ph,name,rawMsg)=>{
setPreview({type:"single",ph,name,editText:rawMsg});
};

const openBatch=(targets,msgTemplate,dataObj)=>{
if(!targets.length){alert("Nenhum paciente selecionado com telefone.");return;}
const first=targets[0];
setPreview({type:"batch",targets,dataObj,msgTemplate,editText:resolveTemplate(dataObj||{msg:msgTemplate},first),idx:0});
};

// Personalized send state
const [activeMsg,setActiveMsg]=useState(MSGS[0]);
const [localSel,setLocalSel]=useState([]);
const [localAll,setLocalAll]=useState(false);

const handleSend=()=>{
if(!preview)return;
const {type,ph,editText,targets,dataObj,msgTemplate,idx}=preview;
if(type==="single"){
const n=(ph||"").replace(/\D/g,"");
const url="https://wa.me/"+(n.startsWith("55")?n:"55"+n)+"?text="+encodeURIComponent(editText);
window.open(url,"_blank");
setPreview(null);
} else if(type==="batch"){
// Send current, advance to next
const p=targets[idx];
const n=(p.phone||"").replace(/\D/g,"");
const url="https://wa.me/"+(n.startsWith("55")?n:"55"+n)+"?text="+encodeURIComponent(editText);
window.open(url,"_blank");
const nextIdx=idx+1;
if(nextIdx<targets.length){
const nextP=targets[nextIdx];
const nextMsg=resolveTemplate(dataObj||{msg:msgTemplate},nextP);
setPreview({...preview,idx:nextIdx,editText:nextMsg,ph:nextP.phone,name:nextP.name});
} else {
setPreview(null);
}
}
};

return <div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">

{/* Abas: Datas Especiais | Mensagens | Templates */}
<div style={{display:"flex",gap:3,background:G.bg,borderRadius:10,padding:3}}>
  {[["datas","🎊 Datas"],["mensagens","✉️ Mensagens"],["templates","✏️ Templates"]].map(function([k,l]){return(
    <button key={k} onClick={function(){setMsgTab(k);}} style={{flex:1,border:"none",borderRadius:8,padding:"8px 4px",fontSize:11,fontWeight:700,cursor:"pointer",background:msgTab===k?G.primary:G.bg,color:msgTab===k?"#fff":G.muted,boxShadow:msgTab===k?"0 1px 4px rgba(0,0,0,.15)":"none"}}>{l}</button>
  );})}
</div>

{/* ── ABA TEMPLATES ── */}
{msgTab==="templates"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
  <div style={{background:G.accent,borderRadius:10,padding:"10px 14px",fontSize:13,color:G.primary}}>
    {"✏️ Edite os textos padrão enviados pelo WhatsApp. Use {nome}, {data}, {hora}, {proc} como variáveis."}
  </div>
  {ALL_TPLS.map(function(tpl){
    var isEditing=editKey===tpl.key;
    var isCustom=waTemplates&&waTemplates[tpl.key];
    return <div key={tpl.key} style={{background:G.card,borderRadius:12,padding:"13px 15px",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",border:isCustom?"2px solid "+G.primary:"1px solid "+G.border}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,gap:8}}>
        <div>
          <div style={{fontWeight:700,fontSize:13}}>{tpl.label}</div>
          <div style={{fontSize:11,color:G.muted}}>{tpl.desc}</div>
          {isCustom&&<span style={{fontSize:10,background:G.primary+"20",color:G.primary,borderRadius:5,padding:"1px 6px",fontWeight:700}}>✓ Personalizado</span>}
        </div>
        <div style={{display:"flex",gap:5,flexShrink:0}}>
          {!isEditing&&<button onClick={function(){setEditKey(tpl.key);setEditVal(getTpl(tpl.key));}} style={{background:G.primary,color:"#fff",border:"none",borderRadius:7,padding:"5px 11px",fontSize:11,fontWeight:700,cursor:"pointer"}}>✏️ Editar</button>}
          {isCustom&&!isEditing&&<button onClick={function(){resetTpl(tpl.key);}} style={{background:"none",border:"1.5px solid "+G.red,color:G.red,borderRadius:7,padding:"5px 11px",fontSize:11,fontWeight:700,cursor:"pointer"}}>↩ Original</button>}
        </div>
      </div>
      {!isEditing&&<div style={{background:G.bg,borderRadius:8,padding:"9px 11px",fontSize:12,color:G.muted,whiteSpace:"pre-wrap",lineHeight:1.5,maxHeight:80,overflow:"hidden"}}>{getTpl(tpl.key).slice(0,200)+(getTpl(tpl.key).length>200?"...":"")}</div>}
      {isEditing&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
        <textarea value={editVal} onChange={function(e){setEditVal(e.target.value);}} rows={6}
          style={{width:"100%",border:"1.5px solid "+G.primary,borderRadius:8,padding:"9px 12px",fontSize:13,outline:"none",resize:"vertical",fontFamily:"'Manrope'",lineHeight:1.5,boxSizing:"border-box"}}/>
        <div style={{fontSize:11,color:G.muted}}>{"Variáveis: {nome} {data} {hora} {proc}"}</div>
        <div style={{display:"flex",gap:7}}>
          <button onClick={function(){saveTpl(tpl.key,editVal);setEditKey(null);}} style={{flex:1,background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"9px",fontSize:13,fontWeight:700,cursor:"pointer"}}>💾 Salvar</button>
          <button onClick={function(){setEditKey(null);}} style={{flex:1,background:"none",border:"1.5px solid "+G.border,color:G.muted,borderRadius:8,padding:"9px",fontSize:13,cursor:"pointer"}}>Cancelar</button>
        </div>
      </div>}
    </div>;
  })}
</div>}

{msgTab!=="templates"&&<>{/* Preview Modal */}</>}
{/* Preview Modal */}
{preview&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>

  <div style={{background:"var(--surface)",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:560,maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 -8px 32px rgba(0,0,0,.2)"}}>
    {/* WA header */}
    <div style={{background:"#075E54",borderRadius:"20px 20px 0 0",padding:"14px 18px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
      <div style={{width:38,height:38,borderRadius:"50%",background:"#25D366",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>📱</div>
      <div style={{flex:1}}>
        <div style={{fontWeight:700,color:"#fff",fontSize:14}}>{preview.name||preview.ph}</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>
          {preview.ph}
          {preview.type==="batch"&&` · ${preview.idx+1} de ${preview.targets.length}`}
        </div>
      </div>
      <button onClick={()=>setPreview(null)} style={{border:"none",background:"rgba(255,255,255,.15)",borderRadius:8,color:"#fff",fontSize:18,cursor:"pointer",padding:"5px 10px"}}>✕</button>
    </div>
    {/* Message bubble preview */}
    <div style={{background:"var(--amber-soft)",padding:"14px 12px",flex:1,overflowY:"auto",minHeight:120}}>
      <div style={{background:"var(--surface)",borderRadius:"0 12px 12px 12px",padding:"10px 14px",maxWidth:"88%",boxShadow:"0 1px 2px rgba(0,0,0,.15)",fontSize:13,lineHeight:1.65,whiteSpace:"pre-wrap",color:"var(--text)",wordBreak:"break-word"}}>
        {preview.editText}
      </div>
    </div>
    {/* Edit area */}
    <div style={{padding:"10px 14px",borderTop:"1px solid #ddd",flexShrink:0}}>
      <div style={{fontSize:11,color:G.muted,fontWeight:700,marginBottom:5}}>✏️ EDITAR MENSAGEM ANTES DE ENVIAR</div>
      <textarea
        value={preview.editText}
        onChange={e=>setPreview(prev=>({...prev,editText:e.target.value}))}
        rows={4}
        style={{width:"100%",border:`1.5px solid ${G.primary}`,borderRadius:10,padding:"9px 12px",fontSize:13,outline:"none",resize:"none",fontFamily:"'Manrope'",lineHeight:1.5,boxSizing:"border-box"}}
      />
    </div>
    {/* Action buttons */}
    <div style={{padding:"10px 14px 16px",display:"flex",gap:10,flexShrink:0}}>
      <button onClick={()=>setPreview(null)} style={{flex:1,background:"var(--surface-2)",color:"var(--muted)",border:"none",borderRadius:10,padding:"12px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
        {preview.type==="batch"&&preview.idx>0?"⏭ Pular":"✕ Cancelar"}
      </button>
      <button onClick={handleSend} style={{flex:2,background:"#25D366",color:"#fff",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
        <span>📲</span>
        <span>{preview.type==="batch"?`Abrir WA (${preview.idx+1}/${preview.targets.length})`:"Abrir no WhatsApp"}</span>
      </button>
    </div>
  </div>
</div>}

{/* Datas Especiais */}

<div style={{background:G.card,borderRadius:13,padding:15,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
  <div style={{fontWeight:700,fontSize:14,color:G.primary,marginBottom:4}}>🎊 Datas Especiais</div>
  <div style={{fontSize:12,color:G.muted,marginBottom:11}}>Clique em "Ver mensagem" para revisar e editar antes de enviar para cada paciente</div>
  <div style={{display:"flex",flexDirection:"column",gap:8}}>
    {DATAS.map(d=><div key={d.id} style={{background:G.bg,borderRadius:10,padding:"11px 13px",display:"flex",gap:11,alignItems:"center"}}>
      <span style={{flex:1,fontWeight:700,fontSize:13}}>{d.label}</span>
      <div style={{display:"flex",gap:7}}>
        <button onClick={()=>{
          // Show preview of message for first patient (or generic)
          const p=withPhone[0];
          setPreview({type:"single",ph:p?p.phone:"(nenhum)",name:p?p.name:"Prévia",editText:resolveTemplate(d,p||{name:"{nome}",genero:"F"})});
        }} style={{background:G.accent,color:G.primary,border:`1.5px solid ${G.primary}`,borderRadius:8,padding:"6px 11px",fontSize:11,fontWeight:700,cursor:"pointer"}}>👁 Ver</button>
        <button onClick={()=>{
          if(!withPhone.length){alert("Nenhum paciente com telefone.");return;}
          if(!window.confirm(`Enviar "${d.label}" para ${withPhone.length} paciente(s) -- um por vez?`))return;
          openBatch(withPhone,null,d);
        }} style={{background:"#25D366",color:"#fff",border:"none",borderRadius:8,padding:"6px 11px",fontSize:11,fontWeight:700,cursor:"pointer"}}>📱 Enviar</button>
      </div>
    </div>)}
  </div>
</div>

{/* Aniversariantes hoje */}
{bdayToday.length>0&&<div style={{background:G.gold+"15",border:`2px solid ${G.gold}`,borderRadius:13,padding:14}}>

  <div style={{fontWeight:700,fontSize:14,color:G.gold,marginBottom:10}}>🎂 Aniversariantes HOJE ({bdayToday.length})</div>
  {bdayToday.map(p=><div key={p.id} style={{display:"flex",gap:10,alignItems:"center",background:"var(--surface)",borderRadius:9,padding:"9px 13px",marginBottom:6}}>
    <div style={{flex:1}}>
      <div style={{fontWeight:700,fontSize:13}}>{p.name}</div>
      <div style={{fontSize:11,color:G.muted}}>{age(p.dob)} · {p.phone}</div>
    </div>
    {p.phone&&<button onClick={()=>{
      const msg=resolveTemplate(MSGS[0],p);
      setPreview({type:"single",ph:p.phone,name:p.name,editText:msg});
    }} style={{background:"#25D366",color:"#fff",border:"none",borderRadius:8,padding:"8px 13px",fontSize:12,fontWeight:700,cursor:"pointer"}}>🎂 Parabéns</button>}
  </div>)}
</div>}

{/* Envio Personalizado */}

<div style={{background:G.card,borderRadius:13,padding:15,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
  <div style={{fontWeight:700,fontSize:14,color:G.primary,marginBottom:11}}>✉️ Envio Personalizado</div>
  {/* Template tabs */}
  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:11}}>
    {MSGS.map(m=><button key={m.id} onClick={()=>setActiveMsg(m)} style={{border:`2px solid ${activeMsg.id===m.id?G.primary:G.border}`,background:activeMsg.id===m.id?G.primary:"var(--card)",color:activeMsg.id===m.id?"#fff":G.muted,borderRadius:20,padding:"6px 13px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{m.label}</button>)}
  </div>
  {/* Live preview bubble */}
  <div style={{background:"var(--amber-soft)",borderRadius:10,padding:"12px",marginBottom:11}}>
    <div style={{fontSize:10,color:"var(--muted)",fontWeight:700,marginBottom:6}}>PRÉ-VISUALIZAÇÃO (com nome do paciente)</div>
    <div style={{background:"var(--surface)",borderRadius:"0 10px 10px 10px",padding:"9px 13px",fontSize:12,lineHeight:1.6,whiteSpace:"pre-wrap",color:"var(--text)",maxHeight:140,overflowY:"auto",boxShadow:"0 1px 2px rgba(0,0,0,.1)"}}>
      {resolveTemplate(activeMsg,withPhone[0]||{name:"Paciente",genero:"F"})}
    </div>
  </div>
  {/* Recipients */}
  <div style={{marginBottom:11}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
      <span style={{fontSize:12,fontWeight:700,color:G.muted}}>DESTINATÁRIOS</span>
      <label style={{display:"flex",gap:7,alignItems:"center",fontSize:12,cursor:"pointer"}}>
        <input type="checkbox" checked={localAll} onChange={e=>setLocalAll(e.target.checked)} style={{accentColor:G.primary,width:14,height:14}}/>
        Todos ({withPhone.length} com telefone)
      </label>
    </div>
    {!localAll&&<div style={{maxHeight:170,overflowY:"auto",display:"flex",flexDirection:"column",gap:1,border:`1px solid ${G.border}`,borderRadius:9,padding:7}}>
      {withPhone.map(p=><label key={p.id} style={{display:"flex",gap:9,alignItems:"center",padding:"6px 9px",background:localSel.includes(p.id)?G.accent:"transparent",borderRadius:7,cursor:"pointer",fontSize:12}}>
        <input type="checkbox" checked={localSel.includes(p.id)} onChange={e=>setLocalSel(prev=>e.target.checked?[...prev,p.id]:prev.filter(x=>x!==p.id))} style={{accentColor:G.primary,width:14,height:14}}/>
        <span style={{flex:1,fontWeight:600}}>{p.name}</span>
        <span style={{color:G.muted,fontSize:11}}>{p.phone}</span>
      </label>)}
    </div>}
  </div>
  <button onClick={()=>{
    const targets=localAll?withPhone:withPhone.filter(p=>localSel.includes(p.id));
    if(!targets.length){alert("Selecione pelo menos um paciente");return;}
    openBatch(targets,activeMsg.msg,activeMsg);
  }} style={{background:"#25D366",color:"#fff",border:"none",borderRadius:10,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
    <span>📱</span>
    <span>Revisar e Enviar para {localAll?withPhone.length:localSel.length} paciente(s)</span>
  </button>
</div>

  </div>;
}
// ══════════════════════════════════════════════════════════
// PACS TAB -- Patient reports component
// ══════════════════════════════════════════════════════════
function PacsTab({pats,recs,treats,appts,dents,mo,user,pacsTicks,setPacsTicks,abrirFicha}){
  const t=today();
  const tDate=new Date(t+"T12:00");
  const weekEnd=new Date(tDate);weekEnd.setDate(tDate.getDate()+7);
  const weekEndStr=weekEnd.toISOString().split("T")[0];
  const thisMonth=t.slice(5,7);

const bdiff=function(dob){var md=(dob||"").slice(5);if(!md)return 999;var d=new Date(tDate.getFullYear()+"-"+md+"T12:00");var df=Math.round((d-tDate)/86400000);if(df>182)df-=365;else if(df<-182)df+=365;return df;};
const bdayWeek=pats.filter(function(p){if(!p.dob)return false;var df=bdiff(p.dob);return df>=-7&&df<=7;}).sort(function(a,b){var da=bdiff(a.dob),db=bdiff(b.dob);var ra=da<0?(-da-1):(da+7),rb=db<0?(-db-1):(db+7);return ra-rb;});
const bdayMonth=pats.filter(p=>p.dob&&p.dob.slice(5,7)===thisMonth);
const semestral=pats.filter(function(p){
// Only recs with payment (confirmed attendance)
var last=recs.filter(function(r){return r.patientId===p.id&&r.paid>0;}).sort(function(a,b){return b.date.localeCompare(a.date);})[0];
if(!last)return false; // no record = don't show
// Show on the exact day that completes 6 months
var sixMonthsAfter=retDue(p,last.date);
if(sixMonthsAfter>t)return false;
var futura=appts.find(function(a){return a.patientId===p.id&&a.date>=t&&a.status!=="cancelled"&&a.status!=="missed";});
if(futura)return false;
return true;
});
const emTrat=treats.filter(t2=>t2.items.some(it=>!it.done));
const semRetorno=emTrat.filter(t2=>{
const futura=appts.find(a=>a.patientId===t2.patientId&&a.date>=t&&a.status!=="cancelled"&&a.status!=="missed");
return !futura;
});
const newPats=pats.filter(p=>{
const first=recs.filter(r=>r.patientId===p.id).sort((a,b)=>a.date.localeCompare(b.date))[0];
return first&&first.date.startsWith(mo);
});

const ticks=pacsTicks||{};
const setTicks=setPacsTicks;
const [noteModal,setNoteModal]=useState(null);
const [noteText,setNoteText]=useState("");
const [showDone,setShowDone]=useState({});const [openSec,setOpenSec]=useState({});
const period=t.slice(0,7);
const pendCount=(listId,list,isTreat)=>list.filter(function(x){var pp=isTreat?pats.find(function(z){return z.id===x.patientId;}):x;return pp&&!isHandled(listId,pp.id+(isTreat?x.id:""));}).length;

const tickKey=(listId,patId)=>`${listId}_${patId}_${period}`;
const isTicked=(listId,patId)=>!!ticks[tickKey(listId,patId)]?.done;
const isHandled=(listId,patId)=>!!ticks[tickKey(listId,patId)]?.done;
const getTick=(listId,patId)=>ticks[tickKey(listId,patId)];
const doTick=(listId,patId,note="")=>{
const k=tickKey(listId,patId);
const already=ticks[k]?.done;
setTicks(prev=>({...prev,[k]:already?{...prev[k],done:false,ts:Date.now()}:{done:true,note,doneBy:user.name,doneAt:today(),ts:Date.now()}}));
};

const waBday="Olá, {nome}! A equipe Affonso Odontologia deseja um feliz aniversário cheio de saúde e sorrisos! 🎂🦷";
const waSemestral="Olá, {nome}! Já faz alguns meses desde sua última consulta. Que tal agendar seu controle semestral? 😊 Affonso Odontologia";
const waSemRet="Olá, {nome}! Notamos que você está em tratamento e ainda não remarcou. Podemos ajudar a agendar? 😊 Affonso Odontologia";

const PatCard=({p,badge,badgeCol,extra,listId,waMsg,treatId,overdue,todayB})=>{
const pid=p.id+(treatId||"");
const d=dents.find(x=>x.id===recs.filter(r=>r.patientId===p.id).sort((a,b)=>b.date.localeCompare(a.date))[0]?.dentistId)||dents[0];
return <div style={{background:overdue||todayB?"var(--red-soft)":G.card,borderRadius:10,padding:"10px 13px",borderLeft:`4px solid ${badgeCol}`,display:"flex",gap:9,alignItems:"flex-start",boxShadow:overdue?"0 0 0 2px "+G.red:"0 1px 4px rgba(0,0,0,.05)",transition:"all .2s",marginBottom:6}}>
<button onClick={()=>doTick(listId,pid)} title="Concluir e remover" style={{width:24,height:24,borderRadius:"50%",border:`2px solid ${G.border}`,background:"var(--surface)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:13,flexShrink:0,marginTop:1,transition:"all .2s"}}></button>

<div style={{flex:1}}>
{overdue&&<div style={{display:"inline-block",background:G.red,color:"#fff",borderRadius:6,padding:"1px 7px",fontSize:10,fontWeight:700,marginBottom:3}}>⚠️ ATRASADO</div>}
<div style={{fontWeight:700,fontSize:13}}><span onClick={function(){abrirFicha&&abrirFicha(p);}} title="Abrir ficha clínica" style={{color:overdue||todayB?G.red:G.primary,cursor:"pointer",textDecoration:"underline"}}>{p.name}</span><span style={{fontSize:11,color:G.muted,fontWeight:400}}> · {p.folder}</span></div>
{extra&&<div style={{fontSize:11,color:overdue?G.red:G.muted,marginTop:1,fontWeight:overdue?700:400}}>{extra}</div>}
{d&&<div style={{fontSize:10,color:d.color,marginTop:1}}>👨‍⚕️ {d.name}</div>}

</div>
<div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end",flexShrink:0}}>
<Bdg l={badge} col={badgeCol} sm/>
<div style={{display:"flex",gap:4}}>
{p.phone&&waMsg&&<button onClick={()=>wa(p.phone,waMsg.replace(/{nome}/g,p.name))} style={{background:"#25D366",color:"#fff",border:"none",borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:700,cursor:"pointer"}}>WA</button>}
<button onClick={()=>{setNoteModal({listId,pid,label:`${p.name} -- ${badge}`});setNoteText("");}} style={{background:G.primary,color:"#fff",border:"none",borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:700,cursor:"pointer"}}>✓ Concluir</button>
</div>
</div>
</div>;
};

const sections=[
{id:"bday_week",label:"🎂 Aniversariantes esta semana",col:G.gold,list:bdayWeek,extra:p=>`Aniversário: ${fmt(p.dob).slice(0,5)} · ${age(p.dob)}`,wa:waBday},
{id:"bday_month",label:"🎉 Aniversariantes este mês",col:G.gold,list:bdayMonth,extra:p=>`Aniversário: ${fmt(p.dob).slice(0,5)} · ${age(p.dob)}`,wa:waBday},
{id:"semestral",label:"📅 Controle Semestral",col:G.orange,list:semestral,sub:"Mais de 6 meses sem atendimento",extra:p=>{const l=recs.filter(r=>r.patientId===p.id).sort((a,b)=>b.date.localeCompare(a.date))[0];var _lb=retLabel(p,l&&l.date);return (_lb!=="Semestral"?_lb+" · ":"")+"Último atend: "+fmt(l&&l.date);},wa:waSemestral},
{id:"sem_ret",label:"⚠️ Em tratamento sem agendamento",col:G.red,list:semRetorno,sub:"Plano ativo sem consulta futura",extra:x=>{const pend=x.items.filter(i=>!i.done).length;return`Plano: ${x.name} · ${pend} proc. pendente${pend>1?"s":""}`;},wa:waSemRet,isTreat:true},
{id:"new_pats",label:"✨ Novos pacientes no mês",col:G.primary,list:newPats,extra:()=>"",wa:null},
];

return <div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">

<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9}}>
{[["Aniv. semana",pendCount("bday_week",bdayWeek,false),G.gold],["Semestral",pendCount("semestral",semestral,false),G.orange],["Sem retorno",pendCount("sem_ret",semRetorno,true),G.red],["Novos mês",pendCount("new_pats",newPats,false),G.primary]].map(([l,v,c])=><div key={l} style={{background:G.card,borderRadius:10,padding:"10px",textAlign:"center",borderTop:`3px solid ${c}`,boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}><div style={{fontFamily:"'Cormorant Garamond'",fontSize:22,color:c}}>{v}</div><div style={{fontSize:10,color:G.muted,fontWeight:700}}>{l}</div></div>)}
</div>
{sections.map(sec=>{
const doneItems=sec.list.filter(x=>{const p=sec.isTreat?pats.find(pt=>pt.id===x.patientId):x;return p&&isHandled(sec.id,p.id+(sec.isTreat?x.id:""));});
const pendItems=sec.list.filter(x=>{const p=sec.isTreat?pats.find(pt=>pt.id===x.patientId):x;return p&&!isHandled(sec.id,p.id+(sec.isTreat?x.id:""));});
const sdone=!!showDone[sec.id];
const open=!!openSec[sec.id];
return <div key={sec.id} style={{background:G.card,borderRadius:13,padding:"2px 14px",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
<button onClick={function(){setOpenSec(function(prev){var n=Object.assign({},prev);n[sec.id]=!prev[sec.id];return n;});}} style={{width:"100%",border:"none",background:"none",padding:"11px 0",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
<div style={{textAlign:"left"}}><span style={{fontWeight:700,fontSize:14,color:sec.col}}>{sec.label} ({pendItems.length})</span>{sec.sub&&<div style={{fontSize:11,color:G.muted,fontWeight:400}}>{sec.sub}</div>}</div>
<span style={{color:sec.col,fontSize:15,fontWeight:700,transform:open?"rotate(90deg)":"none",transition:"transform .15s"}}>{">"}</span>
</button>
{open&&<div style={{paddingBottom:10}}>
{doneItems.length>0&&<div style={{textAlign:"right",marginBottom:6}}><button onClick={function(){setShowDone(function(prev){return Object.assign({},prev,{[sec.id]:!prev[sec.id]});});}} style={{background:"none",border:"none",fontSize:11,color:G.success,fontWeight:700,cursor:"pointer"}}>{sdone?"ocultar concluídos":"✓ "+doneItems.length+" concluído(s) — ver"}</button></div>}
{pendItems.length===0&&<p style={{fontSize:12,color:G.muted,padding:"6px 0"}}>Nenhum pendente 👍</p>}
{pendItems.map(function(x){
const p=sec.isTreat?pats.find(function(pt){return pt.id===x.patientId;}):x;
if(!p)return null;
var badge=sec.label.slice(2),col=sec.col,extra=sec.extra(x),ov=false,tdB=false;
if(sec.id==="bday_week"){var df=bdiff(p.dob);if(df<0){ov=true;col=G.red;badge="ATRASADO";extra="Fez "+fmt(p.dob).slice(0,5)+" (há "+(-df)+" dia"+((-df)>1?"s":"")+") · "+age(p.dob);}else if(df===0){tdB=true;col=G.red;badge="🎂 HOJE";extra="Aniversário HOJE · "+age(p.dob);}else{badge="em "+df+"d";extra="Aniversário "+fmt(p.dob).slice(0,5)+" · "+age(p.dob);}}
return <PatCard key={sec.isTreat?x.id:p.id} p={p} badge={badge} badgeCol={col} extra={extra} listId={sec.id} waMsg={sec.wa} treatId={sec.isTreat?x.id:undefined} overdue={ov} todayB={tdB}/>;
})}
{sdone&&doneItems.map(function(x){
const p=sec.isTreat?pats.find(function(pt){return pt.id===x.patientId;}):x;
if(!p)return null;
var pid2=p.id+(sec.isTreat?x.id:"");
var tk=getTick(sec.id,pid2);
return <div key={"d"+(sec.isTreat?x.id:p.id)} style={{background:"var(--green-soft)",borderRadius:10,padding:"8px 12px",display:"flex",gap:9,alignItems:"center",marginBottom:5,borderLeft:"4px solid "+G.success}}>
<div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:G.muted,textDecoration:"line-through"}}>{p.name}</div>{tk&&<div style={{fontSize:10,color:G.success}}>{"✓ "+(tk.note||"Concluído")+(tk.doneBy?" — "+tk.doneBy:"")}</div>}</div>
<button onClick={function(){doTick(sec.id,pid2);}} style={{background:"none",border:"1px solid "+G.border,borderRadius:6,padding:"3px 9px",fontSize:10,color:G.muted,cursor:"pointer"}}>↩ Restaurar</button>
</div>;
})}
</div>}
</div>;
})}
{noteModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
<div style={{background:"var(--surface)",borderRadius:14,width:"100%",maxWidth:400,boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 18px",borderBottom:`1px solid ${G.border}`}}>
<span style={{fontFamily:"'Cormorant Garamond'",fontSize:18}}>Marcar como resolvido</span>
<button onClick={()=>setNoteModal(null)} style={{border:"none",background:"none",fontSize:22,cursor:"pointer",color:G.muted}}>×</button>
</div>
<div style={{padding:18,display:"flex",flexDirection:"column",gap:11}}>
<div style={{fontSize:13,color:G.primary,fontWeight:600}}>{noteModal.label}</div>
<div style={{display:"flex",flexDirection:"column",gap:4}}>
<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase"}}>O que foi feito? (opcional)</label>
<textarea value={noteText} onChange={e=>setNoteText(e.target.value)} rows={3} placeholder="Ex: Ligou e agendou para 15/05 às 09h..." style={{border:`1.5px solid ${G.border}`,borderRadius:8,padding:"8px 11px",fontSize:13,outline:"none",resize:"vertical",fontFamily:"'Manrope'"}}/>
</div>
<div style={{display:"flex",gap:9,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${G.border}`}}>
<button onClick={()=>setNoteModal(null)} style={{border:`1.5px solid ${G.primary}`,background:"transparent",color:G.primary,borderRadius:8,padding:"8px 15px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
<button onClick={()=>{doTick(noteModal.listId,noteModal.pid,noteText);setNoteModal(null);}} style={{background:G.success,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:700,cursor:"pointer"}}>✓ Confirmar</button>
</div>
</div>
</div>
</div>}

  </div>;
}

// ══════════════════════════════════════════════════════════
// RELATÓRIOS
// ══════════════════════════════════════════════════════════

/* ===== V201: Busca de orcamentos por procedimento/periodo/status ===== */
function BuscaOrcTab({treats=[],pats=[],dents=[],abrirFicha}){
const [bProc,setBProc]=useState("");
const [bDe,setBDe]=useState("");
const [bAte,setBAte]=useState("");
const [bDent,setBDent]=useState("all");
const [bVal,setBVal]=useState("");
const [bSts,setBSts]=useState({aprovado:false,espera:true,parcial:false,naofechado:true});
const [bEnv,setBEnv]=useState("all");
const [bMot,setBMot]=useState("all");
const [copiado,setCopiado]=useState(false);
const totOf=t=>(t.items||[]).reduce((s,i)=>s+Number(i.value||0),0);
const paidOf=t=>(t.payments||[]).reduce((s,p)=>s+Number(p.value||0),0);
const stOf=t=>{var s=t.orcStatus||"espera";if((s==="parcial"||s==="espera")&&totOf(t)>0&&paidOf(t)>=totOf(t)-0.005)return "aprovado";if(s==="espera"&&paidOf(t)>0)return "parcial";return s;};
const STC={aprovado:G.success,espera:G.yellow,parcial:G.blue,naofechado:G.red};
const STL={aprovado:"Aprovado",espera:"Em espera",parcial:"Parcial",naofechado:"Não fechado"};
const pacDe=id=>pats.find(p=>p.id===id)||{};
const dentDe=id=>dents.find(d=>String(d.id)===String(id))||{};
const q=bProc.toLowerCase().trim();
const nenhumSt=!bSts.aprovado&&!bSts.espera&&!bSts.parcial&&!bSts.naofechado;
const res=treats.filter(function(t){
  var tot=totOf(t);
  if(q){var hitItem=(t.items||[]).some(function(i){return String(i.desc||"").toLowerCase().indexOf(q)>=0;});var hitName=String(t.name||"").toLowerCase().indexOf(q)>=0;if(!hitItem&&!hitName)return false;}
  if(bDe&&(t.start||"")<bDe)return false;
  if(bAte&&(t.start||"")>bAte)return false;
  if(bDent!=="all"&&String(t.dentistId)!==String(bDent))return false;
  if(Number(bVal||0)>0&&tot<Number(bVal))return false;
  if(!nenhumSt&&!bSts[stOf(t)])return false;
  if(bEnv==="nao"&&t.orcEnviado)return false;
  if(bEnv==="sim"&&!t.orcEnviado)return false;
  if(bMot!=="all"&&(t.orcMotivo||"")!==bMot)return false;
  return true;
}).sort(function(a,b){return String(b.start||"").localeCompare(String(a.start||""));});
const totalV=res.reduce(function(s,t){return s+totOf(t);},0);
const copiarFones=function(){
  var linhas=res.map(function(t){var p=pacDe(t.patientId);return (p.name||"?")+" - "+(p.phone||"sem telefone");});
  var txt=linhas.join("\n");
  try{navigator.clipboard.writeText(txt).then(function(){setCopiado(true);setTimeout(function(){setCopiado(false);},2000);});}
  catch(e){var ta=document.createElement("textarea");ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);setCopiado(true);setTimeout(function(){setCopiado(false);},2000);}
};
const imprimirLista=function(){
  function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
  var filtros=[];
  if(q)filtros.push("Procedimento: "+bProc);
  if(bDe)filtros.push("De: "+fmt(bDe));
  if(bAte)filtros.push("Até: "+fmt(bAte));
  if(bDent!=="all")filtros.push("Dentista: "+(dentDe(bDent).name||""));
  if(Number(bVal||0)>0)filtros.push("Valor mín.: "+cur(Number(bVal)));
  var stsAtivos=["aprovado","espera","parcial","naofechado"].filter(function(k){return bSts[k];}).map(function(k){return STL[k];});
  if(stsAtivos.length&&stsAtivos.length<4)filtros.push("Status: "+stsAtivos.join(", "));
  if(bEnv==="nao")filtros.push("Só não enviados");
  if(bEnv==="sim")filtros.push("Só enviados");
  if(bMot!=="all")filtros.push("Motivo: "+bMot);
  var linhas=res.map(function(t){
    var p=pacDe(t.patientId),d=dentDe(t.dentistId),st=stOf(t);
    var cores={aprovado:"#2f8f5f",espera:"#C0902E",parcial:"#1A5276",naofechado:"#C0392B"};
    return "<tr>"
      +"<td style='padding:7px 9px;border-bottom:1px solid #d8ded3'><b>"+esc(p.name||"?")+"</b><br><span style='color:#7c8a80;font-size:11px'>"+esc(p.phone||"")+"</span></td>"
      +"<td style='padding:7px 9px;border-bottom:1px solid #d8ded3;font-size:12px'>"+esc((t.items||[]).map(function(i){return i.desc;}).join(", "))+"</td>"
      +"<td style='padding:7px 9px;border-bottom:1px solid #d8ded3;font-size:12px'>"+esc(fmt(t.start))+"<br><span style='color:#7c8a80;font-size:11px'>"+esc(d.name||"")+"</span></td>"
      +"<td style='padding:7px 9px;border-bottom:1px solid #d8ded3;text-align:right;font-weight:700'>"+esc(cur(totOf(t)))+"</td>"
      +"<td style='padding:7px 9px;border-bottom:1px solid #d8ded3;text-align:center'><span style='color:"+cores[st]+";font-weight:700;font-size:12px'>"+STL[st]+"</span>"+((st==="naofechado"&&t.orcMotivo)?("<br><span style='color:#7c8a80;font-size:10px'>"+esc(t.orcMotivo)+"</span>"):"")+"</td>"
      +"</tr>";
  }).join("");
  var html="<html><head><meta charset='utf-8'><title>Busca de Orçamentos</title></head>"
    +"<body style='font-family:Arial,sans-serif;color:#23332b;padding:24px'>"
    +"<h2 style='color:#2f5d49;margin-bottom:2px'>Busca de Orçamentos — Affonso Odontologia</h2>"
    +"<div style='color:#7c8a80;font-size:12px;margin-bottom:6px'>Gerado em "+esc(fmt(today()))+(filtros.length?(" · "+esc(filtros.join(" · "))):"")+"</div>"
    +"<div style='font-size:13px;margin-bottom:14px'><b>"+res.length+"</b> paciente(s) · valor total <b style='color:#2f5d49'>"+esc(cur(totalV))+"</b></div>"
    +"<table style='width:100%;border-collapse:collapse;font-size:13px'>"
    +"<thead><tr><th style='text-align:left;padding:7px 9px;background:#eef1ec;border-bottom:2px solid #2f5d49'>Paciente</th><th style='text-align:left;padding:7px 9px;background:#eef1ec;border-bottom:2px solid #2f5d49'>Procedimentos</th><th style='text-align:left;padding:7px 9px;background:#eef1ec;border-bottom:2px solid #2f5d49'>Data / Dentista</th><th style='text-align:right;padding:7px 9px;background:#eef1ec;border-bottom:2px solid #2f5d49'>Valor</th><th style='text-align:center;padding:7px 9px;background:#eef1ec;border-bottom:2px solid #2f5d49'>Status</th></tr></thead>"
    +"<tbody>"+linhas+"</tbody></table></body></html>";
  var w=window.open("","_blank");if(!w)return alert("Permita pop-ups para imprimir");
  w.document.write(html);w.document.close();setTimeout(function(){w.print();},350);
};
return <div style={{display:"flex",flexDirection:"column",gap:14}}>
<div style={{background:G.card,borderRadius:13,padding:15,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px var(--nm-light)"}}>
  <div style={{marginBottom:11}}>
    <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Procedimento (busca em qualquer item do orçamento)</label>
    <input value={bProc} onChange={e=>setBProc(e.target.value)} placeholder="Ex.: implante, clareamento, coroa..." style={{width:"100%",padding:"9px 12px",fontSize:13}}/>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:11,marginBottom:11}}>
    <div><label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>De (data do orçamento)</label><input type="date" value={bDe} onChange={e=>setBDe(e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13}}/></div>
    <div><label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Até</label><input type="date" value={bAte} onChange={e=>setBAte(e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13}}/></div>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:11,marginBottom:11}}>
    <div><label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Dentista</label>
      <select value={bDent} onChange={e=>setBDent(e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13}}>
        <option value="all">Todos</option>
        {dents.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
      </select></div>
    <div><label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Valor mínimo (R$)</label><input type="number" value={bVal} onChange={e=>setBVal(e.target.value)} placeholder="0" style={{width:"100%",padding:"9px 12px",fontSize:13}}/></div>
  </div>
  <div style={{marginBottom:11}}>
    <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Status (toque pra marcar/desmarcar)</label>
    <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
      {["aprovado","espera","parcial","naofechado"].map(function(k){var on=bSts[k];
        return <button key={k} onClick={()=>setBSts(prev=>Object.assign({},prev,{[k]:!prev[k]}))} style={{background:on?STC[k]:"var(--card)",color:on?"#fff":G.muted,border:"1.5px solid "+(on?STC[k]:G.border),borderRadius:9,padding:"6px 13px",fontSize:11,fontWeight:700,cursor:"pointer",boxShadow:"none"}}>{STL[k]}</button>;})}
    </div>
  </div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:11}}>
    <div><label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Envio</label>
      <select value={bEnv} onChange={e=>setBEnv(e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13}}>
        <option value="all">Todos</option><option value="nao">Só não enviados</option><option value="sim">Só enviados</option>
      </select></div>
    <div><label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:4}}>Motivo (não fechado)</label>
      <select value={bMot} onChange={e=>setBMot(e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13}}>
        <option value="all">Todos</option>
        {MOTIVOS_ORC.map(m=><option key={m} value={m}>{m}</option>)}
      </select></div>
  </div>
</div>
<div style={{background:G.primary,borderRadius:12,padding:"14px 16px",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
  <div><div style={{fontSize:12,opacity:.9,fontWeight:700}}>{res.length} paciente{res.length===1?"":"s"} encontrado{res.length===1?"":"s"}</div><div style={{fontSize:11,opacity:.8}}>Valor total dos orçamentos filtrados</div></div>
  <div style={{fontFamily:"'Cormorant Garamond'",fontSize:30,fontWeight:700,lineHeight:1}}>{cur(totalV)}</div>
</div>
<div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
  <button onClick={imprimirLista} disabled={!res.length} style={{background:G.primary,color:"#fff",border:"none",borderRadius:10,padding:"9px 16px",fontSize:13,fontWeight:700,cursor:res.length?"pointer":"default",opacity:res.length?1:.5}}>{"🖨️ Imprimir lista"}</button>
  <button onClick={copiarFones} disabled={!res.length} style={{background:"var(--card)",color:copiado?G.success:G.text,border:"1.5px solid "+(copiado?G.success:G.border),borderRadius:10,padding:"9px 16px",fontSize:13,fontWeight:700,cursor:res.length?"pointer":"default",opacity:res.length?1:.5,boxShadow:"none"}}>{copiado?"✓ Copiado!":"📋 Copiar telefones"}</button>
</div>
<div style={{display:"flex",flexDirection:"column",gap:11}}>
{res.map(function(t){
  var p=pacDe(t.patientId),d=dentDe(t.dentistId),st=stOf(t),tot=totOf(t);
  return <div key={t.id} style={{background:G.card,borderRadius:12,padding:"13px 14px",boxShadow:"5px 5px 12px var(--nm-dark),-5px -5px 12px var(--nm-light)",borderLeft:"4px solid "+STC[st]}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}>
      <div style={{flex:1,minWidth:180}}>
        <div onClick={function(){if(abrirFicha)abrirFicha(t.patientId);}} style={{fontWeight:800,fontSize:15,cursor:abrirFicha?"pointer":"default",color:G.text}}>{p.name||"Paciente removido"}</div>
        <div style={{fontSize:11,color:G.muted,marginTop:2}}>{(p.phone||"sem telefone")+" · "+(d.name||"")+" · orçamento de "+fmt(t.start)}{t.orcEnviado?" · 📤 enviado":""}{!t.orcEnviado?<b style={{color:G.red}}>{" · não enviado"}</b>:null}</div>
        {st==="naofechado"&&t.orcMotivo?<div style={{fontSize:11,color:G.red,marginTop:3,fontWeight:600}}>{"Motivo: "+t.orcMotivo+((t.orcMotivo==="Outro"&&t.orcMotivoObs)?(" — "+t.orcMotivoObs):"")}</div>:null}
        <div style={{fontSize:12,color:G.text,marginTop:5}}>{(t.items||[]).map(function(i){return i.desc;}).join(" · ")}</div>
      </div>
      <div style={{textAlign:"right"}}>
        <span style={{background:STC[st],color:"#fff",borderRadius:8,padding:"3px 11px",fontSize:11,fontWeight:700,display:"inline-block"}}>{STL[st]}</span>
        <div style={{fontWeight:800,fontSize:16,color:G.primary,margin:"6px 0"}}>{cur(tot)}</div>
        {p.phone?<button onClick={function(){wa(p.phone,"Olá "+String(p.name||"").split(" ")[0]+", tudo bem? Aqui é da Affonso Odontologia 😊");}} style={{background:"#25D366",color:"#fff",border:"none",borderRadius:9,padding:"7px 13px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{"📱 Chamar"}</button>:null}
      </div>
    </div>
  </div>;
})}
{!res.length&&<div style={{background:G.bg,borderRadius:10,padding:"12px 14px",fontSize:12,color:G.muted}}>Nenhum orçamento encontrado com esses filtros. Ajuste os filtros acima.</div>}
</div>
</div>;
}
/* ===== fim V201 ===== */

// V219: opções de mês para "pagar dentista em" (13 meses a partir do mês base)
function pagMesOpts(baseMonth){
var out=[];var y=Number(String(baseMonth).slice(0,4));var m=Number(String(baseMonth).slice(5,7))-1;
var MM=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
if(isNaN(y)||isNaN(m)){y=Number(today().slice(0,4));m=Number(today().slice(5,7))-1;}
for(var i=0;i<13;i++){var yy=y+Math.floor((m+i)/12);var mm=(m+i)%12;out.push([yy+"-"+String(mm+1).padStart(2,"0"),MM[mm]+"/"+yy]);}
return out;
}
function pagMesLabel(mo){if(!mo)return "";var MM=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];var mi=Number(String(mo).slice(5,7))-1;return (MM[mi]||"?")+"/"+String(mo).slice(0,4);}

// ===== V232: RESPOSTAS DE ORCAMENTO (somente Administrador - nivel 3) =====
// Cruza os follow-ups de orcamento enviados (chaves ot_/o_/op_ do waSent local
// + registro wa_sent_srv do SERVIDOR, fonte da verdade) com as mensagens
// recebidas em wa_messages. Classificacao manual salva em orcResp (blob,
// merge por ts via mergeTicks). A aba nao renderiza para niveis 1 e 2.
function RespOrcTab({treats,budgets,pats,dents,appts,waSent,orcResp,setOrcResp,user,abrirFicha}){
const [srvSent,setSrvSent]=useState(null);
const [msgsR,setMsgsR]=useState([]);
const [carregando,setCarregando]=useState(true);
const [filtroR,setFiltroR]=useState("all");
const [mesR,setMesR]=useState("all");
const [thread,setThread]=useState(null);
useEffect(function(){var ativo=true;
Promise.all([supabase.loadWaSentSrv(),supabase.loadWaMessagesLite()]).then(function(res){
if(!ativo)return;setSrvSent(res[0]||{});setMsgsR(Array.isArray(res[1])?res[1]:[]);setCarregando(false);
}).catch(function(){if(ativo){setSrvSent({});setCarregando(false);}});
return function(){ativo=false;};},[]);
var sdig=function(s){return String(s||"").replace(/\D/g,"");};
var mergedSent=Object.assign({},waSent||{},srvSent||{});
var CLS=[["interessado","💚 Interessado",G.success],["caro","💰 Achou caro",G.orange],["pensar","🤔 Vai pensar",G.blue],["desistiu","❌ Desistiu",G.red]];
var seenWR={},inMsgs=[];
(msgsR||[]).forEach(function(m){var w=m.wamid;if(w&&seenWR[w])return;if(w)seenWR[w]=1;if(m.direction==="in")inMsgs.push(m);});
var linhas=[];
Object.keys(mergedSent).forEach(function(k){
var tipo=null,idS=null;
if(k.slice(0,3)==="ot_"){tipo="treat";idS=k.slice(3);}
else if(k.slice(0,3)==="op_"){tipo="budget";idS=k.slice(3);}
else if(k.slice(0,2)==="o_"){tipo="budget";idS=k.slice(2);}
else return;
var envio=String(mergedSent[k]||"").slice(0,10);
if(!/^\d{4}-\d{2}-\d{2}$/.test(envio))return;
var pid=null,valor=0,denId=null;
if(tipo==="treat"){var trX=(treats||[]).find(function(t){return String(t.id)===idS;});if(!trX)return;pid=trX.patientId;denId=trX.dentistId;valor=(trX.items||[]).reduce(function(s,i){return s+(Number(i.value)||0);},0);}
else{var bX=(budgets||[]).find(function(x){return String(x.id)===idS;});if(!bX)return;pid=bX.patientId;denId=bX.dentistId;valor=(bX.items||[]).reduce(function(s,i){return s+(Number(i.v)||0);},0)-(Number(bX.disc)||0);}
var pX=(pats||[]).find(function(x){return x.id===pid;});if(!pX)return;
var pl8=sdig(pX.phone).slice(-8);
var resp=null;
if(pl8.length>=8){
for(var i2=0;i2<inMsgs.length;i2++){var m2=inMsgs[i2];
if(sdig(m2.phone).slice(-8)!==pl8)continue;
var ts2=m2.ts||m2.created_at||"";if(String(ts2).slice(0,10)<envio)continue;
var tx2=(m2.body||"").trim();if(tx2==="1"||tx2==="2")continue;
if(!resp||String(ts2)<String(resp.ts||""))resp={body:tx2,ts:ts2};
}}
var marcou=(appts||[]).some(function(a){return a&&!a.blocked&&a.patientId===pid&&a.date>=envio;});
var denX=(dents||[]).find(function(x){return x.id===Number(denId);});
linhas.push({k:k,pat:pX,valor:valor,den:denX?denX.name:"",envio:envio,resp:resp,marcou:marcou,fone:sdig(pX.phone)});
});
linhas.sort(function(a,b){return b.envio.localeCompare(a.envio);});
var mesesO={};linhas.forEach(function(l){mesesO[l.envio.slice(0,7)]=1;});
var mesesArr=Object.keys(mesesO).sort().reverse();
var lf=linhas.filter(function(l){
if(mesR!=="all"&&l.envio.slice(0,7)!==mesR)return false;
if(filtroR==="resp")return !!l.resp;
if(filtroR==="nao")return !l.resp;
return true;});
var totR=linhas.length,nResp=linhas.filter(function(l){return !!l.resp;}).length,nMarc=linhas.filter(function(l){return l.marcou;}).length;
var fmtTs=function(ts){try{var d=new Date(ts);return fmt(String(ts).slice(0,10))+" às "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");}catch(e){return "";}};
var classificar=function(key,cl){setOrcResp(function(prev){var n=Object.assign({},prev||{});var atual=n[key];if(atual&&atual.cl===cl){delete n[key];}else{n[key]={cl:cl,ts:Date.now(),by:(user&&user.name)||""};}return n;});};
var threadMsgs=thread?(function(){var out=[];var seen2={};(msgsR||[]).forEach(function(m){var w=m.wamid;if(w&&seen2[w])return;if(w)seen2[w]=1;if(sdig(m.phone).slice(-8)===thread.fone.slice(-8))out.push(m);});out.sort(function(a,b){return (a.id||0)-(b.id||0);});return out;})():[];
return <div style={{display:"flex",flexDirection:"column",gap:12}}>
<div style={{background:"var(--purple-soft)",border:"1.5px solid #7B1FA2",borderRadius:10,padding:"8px 12px",fontSize:11.5,color:"#5a3570",fontWeight:600}}>🔒 Aba exclusiva do Administrador. Mostra o que cada paciente respondeu ao follow-up automático de orçamento.</div>
{carregando&&<div style={{textAlign:"center",color:G.muted,fontSize:13,padding:20}}>Carregando envios e respostas…</div>}
{!carregando&&<Fragment>
<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
{[["Follow-ups",totR,G.primary],["Responderam",nResp,G.success],["Sem resposta",totR-nResp,G.red],["Marcaram depois",nMarc,G.blue]].map(function(c){return <div key={c[0]} style={{flex:1,minWidth:110,background:G.bg,borderRadius:12,padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:10,fontWeight:700,color:G.muted,textTransform:"uppercase"}}>{c[0]}</div><div style={{fontFamily:"'Cormorant Garamond'",fontSize:24,color:c[2]}}>{c[1]}</div></div>;})}
</div>
<div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
{[["all","Todos"],["resp","✅ Responderam"],["nao","🔕 Sem resposta"]].map(function(f){return <button key={f[0]} onClick={function(){setFiltroR(f[0]);}} style={{border:"2px solid "+(filtroR===f[0]?G.primary:G.border),background:filtroR===f[0]?G.primary:"var(--card)",color:filtroR===f[0]?"#fff":G.muted,borderRadius:8,padding:"6px 12px",fontSize:11.5,fontWeight:700,cursor:"pointer"}}>{f[1]}</button>;})}
<select value={mesR} onChange={function(e){setMesR(e.target.value);}} style={{marginLeft:"auto",border:"2px solid "+G.border,borderRadius:8,padding:"6px 10px",fontSize:12,fontWeight:700,background:"var(--card)",color:G.text}}><option value="all">Todos os meses</option>{mesesArr.map(function(m){return <option key={m} value={m}>{m.slice(5,7)+"/"+m.slice(0,4)}</option>;})}</select>
</div>
{lf.length===0&&<div style={{textAlign:"center",color:G.muted,fontSize:13,padding:16}}>Nenhum follow-up de orçamento encontrado neste filtro.</div>}
{lf.map(function(l){var cls=(orcResp||{})[l.k];
return <div key={l.k} style={{background:G.bg,borderRadius:12,padding:"11px 13px",opacity:l.resp?1:.82}}>
<div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
<span onClick={function(){abrirFicha&&abrirFicha(l.pat.id);}} style={{fontWeight:800,fontSize:13.5,color:G.primary,cursor:"pointer",textDecoration:"underline"}}>{l.pat.name}</span>
{l.resp?<span style={{fontSize:10,fontWeight:800,borderRadius:20,padding:"3px 10px",background:"#dcebe0",color:G.success}}>✅ Respondeu</span>:<span style={{fontSize:10,fontWeight:800,borderRadius:20,padding:"3px 10px",background:"#f2dcd9",color:G.red}}>🔕 Sem resposta</span>}
{l.marcou&&<span style={{fontSize:10,fontWeight:800,borderRadius:20,padding:"3px 10px",background:"#dbe6ee",color:G.blue}}>📅 Marcou depois</span>}
</div>
<div style={{fontSize:11,color:G.muted,marginTop:3}}>{(l.valor?cur(l.valor)+" · ":"")+(l.den?l.den+" · ":"")+"follow-up enviado em "+fmt(l.envio)}</div>
{l.resp&&<div style={{marginTop:7,background:"var(--card)",borderLeft:"3px solid "+G.success,borderRadius:"0 8px 8px 0",padding:"7px 11px",fontSize:12.5}}>
"{l.resp.body.length>220?l.resp.body.slice(0,220)+"…":l.resp.body}"
<div style={{fontSize:10,color:G.muted,marginTop:3}}>Respondeu em {fmtTs(l.resp.ts)}</div>
</div>}
<div style={{display:"flex",gap:5,marginTop:8,flexWrap:"wrap",alignItems:"center"}}>
<span style={{fontSize:10,fontWeight:700,color:G.muted}}>Classificar:</span>
{CLS.map(function(c){var on=cls&&cls.cl===c[0];return <button key={c[0]} onClick={function(){classificar(l.k,c[0]);}} style={{border:"1.5px solid "+(on?c[2]:G.border),background:on?c[2]:"var(--card)",color:on?"#fff":G.muted,borderRadius:20,padding:"4px 11px",fontSize:10.5,fontWeight:700,cursor:"pointer"}}>{c[1]}</button>;})}
</div>
<div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
<button onClick={function(){setThread(l);}} style={{border:"none",borderRadius:7,padding:"5px 11px",fontSize:10.5,fontWeight:700,cursor:"pointer",background:"#25D366",color:"#fff"}}>💬 Ver conversa</button>
</div>
</div>;})}
</Fragment>}
{thread&&<div onClick={function(){setThread(null);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center",padding:14}}>
<div onClick={function(e){e.stopPropagation();}} style={{background:"var(--card)",borderRadius:16,padding:16,maxWidth:480,width:"100%",maxHeight:"78vh",overflowY:"auto"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
<div style={{fontWeight:800,fontSize:14}}>{thread.pat.name}</div>
<button onClick={function(){setThread(null);}} style={{border:"none",background:G.bg,borderRadius:8,padding:"4px 10px",fontWeight:800,cursor:"pointer",color:G.muted}}>✕</button>
</div>
{threadMsgs.length===0&&<div style={{color:G.muted,fontSize:12}}>Nenhuma mensagem encontrada (histórico limitado às últimas 1000).</div>}
{threadMsgs.map(function(m,mi){var outM=m.direction==="out";return <div key={m.id||mi} style={{display:"flex",justifyContent:outM?"flex-end":"flex-start",marginBottom:6}}>
<div style={{maxWidth:"82%",background:outM?G.primary:G.bg,color:outM?"#fff":G.text,borderRadius:outM?"12px 12px 3px 12px":"12px 12px 12px 3px",padding:"7px 11px",fontSize:12.2,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{m.body||""}<div style={{fontSize:9,opacity:.7,marginTop:2,textAlign:"right"}}>{fmtTs(m.ts||m.created_at)}</div></div>
</div>;})}
</div>
</div>}
</div>;
}
function Relatorios({recs,treats=[],budgets=[],appts=[],pros,pats,dents,labs,expenses,gastos,user,waTemplates,setWaTemplates,pacsTicks,setPacsTicks,abrirFicha,setRecs=function(){},waSent={},orcResp={},setOrcResp=function(){}}){
const [tab,setTab]=useState("dent");const [mo,setMo]=useState(today().slice(0,7));const [orcDent,setOrcDent]=useState("all");const [orcFilter,setOrcFilter]=useState(null);const [openOrto,setOpenOrto]=useState({});const [openDent,setOpenDent]=useState({});const [openProt,setOpenProt]=useState({});
const [selMsg,setSelMsg]=useState(null);
const [selPatsMsg,setSelPatsMsg]=useState([]);
const [allSelMsg,setAllSelMsg]=useState(false);
const PC={"Dinheiro":G.success,"PIX":"#00B894","Cartão Crédito":G.blue,"Cartão Débito":"#6C5CE7","Convênio":G.muted,"Cheque":G.orange};

const dr=dents.map(d=>{
// Atendimentos do mês (recibos)
// V219: payMonth adia o pagamento do dentista para outro mês (recibos clínicos)
const effMo=r=>(r.payMonth||(r.date||"").slice(0,7));
const isORec=r=>{if(!r.fromTreat)return false;const tt=treats.find(x=>x.id===r.fromTreat);return !!(tt&&tt.orto);};
const rsBase=recs.filter(r=>r.dentistId===d.id&&r.paid>0);
const rs=rsBase.filter(r=>isORec(r)?r.date.startsWith(mo):effMo(r)===mo);
const clinDeferred=rsBase.filter(r=>!isORec(r)&&r.date.startsWith(mo)&&effMo(r)!==mo);
const raw=rs.reduce((s,r)=>s+r.paid,0);
const liq=rs.reduce((s,r)=>s+calcNet(r.paid,r.payment),0);
// Comissão sobre valor líquido (já com desconto de cartão)
const com=liq*(d.commission||40)/100;
// Crédito futuro do cartão parcelado
const cf={};
rs.forEach(r=>{
if(r.instM?.length){
const liqPerInst=calcNet(r.paid,r.payment)/r.inst;
r.instM.forEach(m=>{
if(!cf[m])cf[m]=0;
cf[m]+=liqPerInst*(d.commission||40)/100;
});
}
});

// Procedimentos dados baixa no mês (planos de tratamento)
const donedItems=[];
treats.forEach(t=>{
t.items.forEach(it=>{
if((it.done||it.paid)&&it.doneDate&&((it.payMonth||it.doneDate.slice(0,7))===mo)){
const itDentId=it.doneByDentistId!=null?Number(it.doneByDentistId):(it.doneBy?(dents.find(dd=>dd.name===it.doneBy)?.id):t.dentistId);
if(itDentId===d.id){
const pat=pats.find(p=>p.id===t.patientId);
// Find the payment method for this treat to apply card discount
const tPayments=t.payments||[];
const lastPay=tPayments[tPayments.length-1];
const payMethod=lastPay?.method||"Dinheiro";
const liqValue=calcNet(it.value,payMethod);
donedItems.push({...it,treatName:t.name,patName:pat?.name||"-",treatId:t.id,liqValue,payMethod});
}
}
});
});
const doneLiq=donedItems.reduce((s,it)=>s+it.liqValue,0);
const doneCom=doneLiq*(d.commission||40)/100;
// Credit future from done items with card installments
const doneCf={};
donedItems.filter(it=>it.creditFuture).forEach(it=>{
if(!doneCf[mo])doneCf[mo]=0;
doneCf[mo]+=it.liqValue*(d.commission||40)/100;
});
const allCf={...cf};
Object.entries(doneCf).forEach(([k,v])=>{allCf[k]=(allCf[k]||0)+v;});

// V218: split mensalidades Plano Orto x tratamento clínico
const isOrtoRec=r=>{if(!r.fromTreat)return false;const tt=treats.find(x=>x.id===r.fromTreat);return !!(tt&&tt.orto);};
const ortoRs=rs.filter(isOrtoRec);
const clinRs=rs.filter(r=>!isOrtoRec(r));
const ortoRaw=ortoRs.reduce((s,r)=>s+r.paid,0);
const ortoLiq=ortoRs.reduce((s,r)=>s+calcNet(r.paid,r.payment),0);
const ortoCom=ortoLiq*(d.commission||40)/100;
const clinRaw=clinRs.reduce((s,r)=>s+r.paid,0);
const clinLiq=clinRs.reduce((s,r)=>s+calcNet(r.paid,r.payment),0);
const clinCom=clinLiq*(d.commission||40)/100;
return {d,rs,raw,liq,com,cf:allCf,donedItems,doneLiq,doneCom,ortoRs,clinRs,ortoRaw,ortoCom,clinRaw,clinCom,clinDeferred,isORec};

});
const lr=labs.map(l=>{const ps=pros.filter(p=>p.labId===l.id&&(p.returned||"").startsWith(mo));const cost=ps.reduce((s,p)=>s+(p.price||0)*(p.qty||1),0);return {l,ps,tot:ps.length,done:ps.filter(p=>p.status==="placed").length,wait:ps.filter(p=>p.status==="waiting").length,cost};});
const gastoMes=arr=>(arr||[]).filter(e=>(e.recorrente&&e.diaVenc)?true:e.parcelado?(function(){var k=(Number(mo.slice(0,4))*12+Number(mo.slice(5,7)))-(Number((e.date||"").slice(0,4))*12+Number((e.date||"").slice(5,7)));return k>=0&&k<Number(e.parcelas||1);})():(e.date&&e.date.startsWith(mo)));
const isPagoG=e=>(e.recorrente||e.parcelado)?!!(e.pagoMeses&&e.pagoMeses[mo]):!!e.paid;
const clinicaG=gastoMes(gastos&&gastos.clinica);
const pessoalG=gastoMes(gastos&&gastos.pessoal);

const TABS=[["dent","Dentistas"],["prot","Protéticos"],["orc","Orçamentos"],["buscar","🔎 Buscar"],["orto","🦷 Orto"],["pacs","👥 Pacientes"],["msg","📱 WhatsApp"]];
if(user.level>=3)TABS.push(["gastos","💸 Gastos"]);
if(user.level>=3)TABS.push(["nf","🧾 Notas"]);
const TABS_R=(user&&user.level>=3)?TABS.concat([["respOrc","💬 Respostas Orç."]]):TABS; // V232: aba exclusiva do admin (V235: movido para depois dos push de Gastos/Notas)

return <div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">

<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
<h2 style={{fontFamily:"'Cormorant Garamond'",fontSize:26}}>Relatórios</h2>
<Inp val={mo} set={setMo} type="month" style={{width:165}}/>
</div>
<div style={{display:"flex",gap:0,borderBottom:`2px solid ${G.border}`,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
{TABS_R.map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={{border:"none",background:"none",padding:"9px 15px",fontFamily:"'Manrope'",fontWeight:700,fontSize:12,cursor:"pointer",color:tab===k?G.primary:G.muted,borderBottom:`3px solid ${tab===k?G.primary:"transparent"}`,marginBottom:-2,flexShrink:0,whiteSpace:"nowrap"}}>{l}</button>)}
</div>
{tab==="dent"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
{dr.map(({d,rs,raw,liq,com,cf,donedItems,doneLiq,doneCom,ortoRs,clinRs,ortoRaw,ortoCom,clinRaw,clinCom,clinDeferred,isORec})=>{const aberto=!!openDent[d.id];return <div key={d.id} style={{background:G.card,borderRadius:13,padding:15,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",borderLeft:`4px solid ${d.color}`}}>
<div onClick={()=>setOpenDent(p=>Object.assign({},p,{[d.id]:!p[d.id]}))} style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:aberto?11:0,cursor:"pointer",alignItems:"center"}}>
<div style={{display:"flex",alignItems:"center",gap:9}}><span style={{fontSize:13,color:d.color,transition:"transform .2s",transform:aberto?"rotate(90deg)":"none"}}>▶</span><div><div style={{fontWeight:700,fontSize:15,color:d.color}}>{d.name}</div><div style={{fontSize:11,color:G.muted}}>{d.specialty} · {rs.length} atend.{aberto?"":" · toque para abrir"}</div></div></div>
<div style={{textAlign:"right"}}><div style={{fontWeight:700,fontSize:17,color:G.primary}}>{cur(com+doneCom)}</div><div style={{fontSize:11,color:G.muted}}>Comissão total ({d.commission}%)</div></div>
</div>
{aberto&&<>
{/* Summary grid */}
<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9,marginBottom:11}}>
{[["Receita Bruta",raw,G.text],["Receita Líquida",liq,G.success],["Comissão Recibos",com,G.primary]].map(([l,v,c])=><div key={l} style={{background:G.bg,borderRadius:8,padding:"6px 10px",textAlign:"center"}}><div style={{fontSize:10,color:G.muted,fontWeight:700}}>{l}</div><div style={{fontWeight:700,color:c,fontSize:13}}>{cur(v)}</div></div>)}
</div>
{/* V218: Plano Orto x Tratamento Clínico */}
{(ortoRs.length>0||clinDeferred.length>0)&&<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:9,marginBottom:11}}>
<div style={{background:"rgba(139,95,168,.10)",border:"1.5px solid rgba(139,95,168,.35)",borderRadius:10,padding:"9px 11px"}}>
<div style={{fontSize:11,fontWeight:800,color:"#8b5fa8",marginBottom:5}}>🦷 PLANO ORTO</div>
<div style={{fontWeight:800,fontSize:16,color:"#8b5fa8"}}>{cur(ortoRaw)}</div>
<div style={{fontSize:10,color:G.muted,fontWeight:700,marginBottom:4}}>{ortoRs.length} mensalidade{ortoRs.length>1?"s":""}</div>
<div style={{fontSize:11,fontWeight:700,color:G.primary,background:G.bg,borderRadius:6,padding:"3px 8px",display:"inline-block"}}>Comissão: {cur(ortoCom)}</div>
</div>
<div style={{background:G.blue+"10",border:"1.5px solid "+G.blue+"55",borderRadius:10,padding:"9px 11px"}}>
<div style={{fontSize:11,fontWeight:800,color:G.blue,marginBottom:5}}>🩺 TRAT. CLÍNICO</div>
<div style={{fontWeight:800,fontSize:16,color:G.blue}}>{cur(clinRaw)}</div>
<div style={{fontSize:10,color:G.muted,fontWeight:700,marginBottom:4}}>{clinRs.length} a pagar este mês{clinDeferred.length>0?" · "+clinDeferred.length+" adiado"+(clinDeferred.length>1?"s":""):""}</div>
<div style={{fontSize:11,fontWeight:700,color:G.primary,background:G.bg,borderRadius:6,padding:"3px 8px",display:"inline-block"}}>Comissão: {cur(clinCom)}</div>
</div>
</div>}
{/* Done treatment procedures */}
{donedItems.length>0&&<>
<Div lb="Procedimentos Realizados (Baixa)"/>
<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:9,marginBottom:11}}>
{[["Valor Líquido Procedimentos",doneLiq,G.blue],["Comissão Procedimentos",doneCom,G.primary]].map(([l,v,c])=><div key={l} style={{background:G.blue+"10",borderRadius:8,padding:"6px 10px",textAlign:"center"}}><div style={{fontSize:10,color:G.muted,fontWeight:700}}>{l}</div><div style={{fontWeight:700,color:c,fontSize:13}}>{cur(v)}</div></div>)}
</div>
{donedItems.map((it,i)=>{
const fee=it.payMethod==="Cartão Crédito"?3.5:it.payMethod==="Cartão Débito"?2:0;
const creditPending=it.creditFuture;
return <div key={i} style={{display:"flex",gap:8,fontSize:11,padding:"5px 0",borderBottom:`1px solid ${G.border}`,flexWrap:"wrap",alignItems:"center"}}>
<span style={{color:G.muted,minWidth:70}}>{fmt(it.doneDate)}</span>
<span style={{flex:1}}>{it.patName} -- {it.desc}</span>
{fee>0&&<span style={{background:"var(--red-soft)",color:G.red,borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>-{fee}%</span>}
{creditPending&&<span style={{background:G.blue+"20",color:G.blue,borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>💳 Aguarda crédito</span>}
<span style={{fontWeight:700,color:creditPending?G.muted:G.success}}>{cur(it.liqValue*(d.commission||40)/100)}</span>
</div>;
})}
</>}
{/* Future credit */}
{Object.keys(cf).length>0&&<>
<Div lb="💳 Crédito Futuro (cartão parcelado)"/>
<div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:9}}>
{Object.entries(cf).sort().map(([m,v])=><div key={m} style={{background:G.blue+"15",borderRadius:7,padding:"5px 12px",fontSize:11,color:G.blue,textAlign:"center"}}>
<div style={{fontWeight:700}}>{m.slice(5)}/{m.slice(0,4)}</div>
<div>{cur(v)}</div>
</div>)}
</div>
</>}
{/* Attendance list */}
{/* V218: mensalidades Orto em seção separada */}
{ortoRs.length>0&&<>
<Div lb="🦷 Mensalidades Plano Orto"/>
{ortoRs.map(r=>{const p=pats.find(x=>x.id===r.patientId);return <div key={r.id} style={{display:"flex",gap:8,fontSize:11,padding:"4px 0",borderBottom:`1px solid ${G.border}`,flexWrap:"wrap"}}>
<span style={{color:G.muted,minWidth:70}}>{fmt(r.date)}</span>
<span style={{flex:1}}>{p?.name} -- {r.procedure}</span>
<Bdg l={r.payment} col={PC[r.payment]||G.muted} sm/>
{r.inst>1&&<Bdg l={`${r.inst}x`} col={G.blue} sm/>}
<span style={{fontWeight:700,color:"#8b5fa8"}}>{cur(r.paid)}</span>
</div>;})}
</>}
{(ortoRs.length>0?clinRs:rs).length>0&&<>
<Div lb={ortoRs.length>0?"🩺 Tratamento Clínico":"Atendimentos do Mês"}/>
{(ortoRs.length>0?clinRs:rs).map(r=>{const p=pats.find(x=>x.id===r.patientId);return <div key={r.id} style={{display:"flex",gap:8,fontSize:11,padding:"4px 0",borderBottom:`1px solid ${G.border}`,flexWrap:"wrap"}}>
<span style={{color:G.muted,minWidth:70}}>{fmt(r.date)}</span>
<span style={{flex:1}}>{p?.name} -- {r.procedure}</span>
<Bdg l={r.payment} col={PC[r.payment]||G.muted} sm/>
{r.inst>1&&<Bdg l={`${r.inst}x`} col={G.blue} sm/>}
{r.payMonth&&!r.date.startsWith(mo)&&<span style={{background:G.blue+"20",color:G.blue,borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>{"💵 recebido "+pagMesLabel(r.date.slice(0,7))}</span>}
{user.level>=2&&!isORec(r)&&<select value={r.payMonth||""} onChange={e=>{var v=e.target.value;setRecs(prev=>prev.map(x=>x.id!==r.id?x:{...x,payMonth:v||null,_ts:Date.now()}));}} style={{border:"1.5px solid "+(r.payMonth?G.blue:G.border),borderRadius:7,padding:"1px 5px",fontSize:10,fontWeight:700,color:r.payMonth?G.blue:G.muted,background:"var(--card)",outline:"none",maxWidth:118}}>
<option value="">💰 mês recebido</option>
{pagMesOpts(r.date.slice(0,7)).map(([v,l])=><option key={v} value={v}>{"💰 "+l}</option>)}
</select>}
<span style={{fontWeight:700}}>{cur(r.paid)}</span>
</div>;})}
</>}
{/* V219: recibos clínicos deste mês adiados para outro mês */}
{clinDeferred.length>0&&<>
<Div lb="⏳ Adiados para outro mês"/>
{clinDeferred.map(r=>{const p=pats.find(x=>x.id===r.patientId);return <div key={r.id} style={{display:"flex",gap:8,fontSize:11,padding:"4px 0",borderBottom:`1px solid ${G.border}`,flexWrap:"wrap",opacity:.6}}>
<span style={{color:G.muted,minWidth:70}}>{fmt(r.date)}</span>
<span style={{flex:1,color:G.muted}}>{p?.name} -- {r.procedure}</span>
<Bdg l={r.payment} col={PC[r.payment]||G.muted} sm/>
<span style={{background:"var(--amber-soft)",color:G.orange,borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>{"→ "+pagMesLabel(r.payMonth)}</span>
{user.level>=2&&<select value={r.payMonth||""} onChange={e=>{var v=e.target.value;setRecs(prev=>prev.map(x=>x.id!==r.id?x:{...x,payMonth:v||null,_ts:Date.now()}));}} style={{border:"1.5px solid "+G.orange,borderRadius:7,padding:"1px 5px",fontSize:10,fontWeight:700,color:G.orange,background:"var(--card)",outline:"none",maxWidth:118}}>
<option value="">💰 mês recebido</option>
{pagMesOpts(r.date.slice(0,7)).map(([v,l])=><option key={v} value={v}>{"💰 "+l}</option>)}
</select>}
<span style={{fontWeight:700,color:G.muted,textDecoration:"line-through"}}>{cur(r.paid)}</span>
</div>;})}
</>}
</>}
</div>;})}
</div>}
{tab==="prot"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
{lr.map(({l,ps,tot,done,wait,cost})=>{const aberto=!!openProt[l.id];return <div key={l.id} style={{background:G.card,borderRadius:13,padding:15,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
<div onClick={()=>setOpenProt(p=>Object.assign({},p,{[l.id]:!p[l.id]}))} style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:aberto?11:0,cursor:"pointer",alignItems:"center"}}>
<div style={{display:"flex",alignItems:"center",gap:9}}><span style={{fontSize:13,color:G.primary,transition:"transform .2s",transform:aberto?"rotate(90deg)":"none"}}>▶</span><div><div style={{fontWeight:700,fontSize:15}}>{l.name}</div><div style={{fontSize:11,color:G.muted}}>{l.contact} · {l.phone}{aberto?"":" · toque para abrir"}</div></div></div>
<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
{[["Retornados",tot,G.primary],["Instalados",done,G.success],["Pendentes",wait,G.yellow],["Custo Total",cur(cost),G.red]].map(([lbl,v,c])=><div key={lbl} style={{textAlign:"center",background:G.bg,borderRadius:8,padding:"6px 11px"}}><div style={{fontFamily:"'Cormorant Garamond'",fontSize:18,color:c}}>{v}</div><div style={{fontSize:10,color:G.muted,fontWeight:700}}>{lbl}</div></div>)}
</div>
</div>
{aberto&&(ps.length>0?ps.map(p=>{const pat=pats.find(x=>x.id===p.patientId);const den=dents.find(x=>x.id===p.dentistId)||dents[0];return <div key={p.id} style={{display:"flex",gap:8,fontSize:11,padding:"5px 0",borderBottom:`1px solid ${G.border}`,flexWrap:"wrap",alignItems:"center"}}><span style={{color:G.muted,minWidth:70}}>{fmt(p.returned||p.sent)}</span><span style={{flex:1}}>{pat?.name} -- {p.type} D.{p.tooth}</span><span style={{fontSize:10,color:den.color}}>{den.name.split(" ")[0]}</span><span style={{fontWeight:700,color:G.primary}}>{(p.qty||1)>1?p.qty+"× ":""}{cur((p.price||0)*(p.qty||1))}</span><Bdg l={PROS_SL[p.status]} col={PROS_SC[p.status]} sm/></div>;}):<div style={{fontSize:12,color:G.muted,padding:"6px 0"}}>Nenhuma prótese neste mês</div>)}
</div>;})}
</div>}
{tab==="orc"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
{/* Origem summary */}
<div style={{background:G.card,borderRadius:13,padding:15,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
<div style={{fontWeight:700,fontSize:14,marginBottom:12,color:G.primary}}>📊 Origem dos Pacientes</div>
<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
{["Indicação","Instagram","Já era paciente","Urgência","Passando na rua","Google","Outro","Não informado"].map(o=>{
const cnt=pats.filter(p=>(p.origem||"Não informado")===o).length;
if(!cnt)return null;
return <div key={o} style={{background:G.accent,borderRadius:9,padding:"8px 14px",textAlign:"center"}}><div style={{fontFamily:"'Cormorant Garamond'",fontSize:22,color:G.primary}}>{cnt}</div><div style={{fontSize:11,color:G.muted,fontWeight:700}}>{o}</div></div>;
})}
</div>
</div>
{/* Filtro dentista */}
<div style={{display:"flex",flexDirection:"column",gap:4}}>
<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Filtrar dentista</label>
<select value={orcDent} onChange={e=>setOrcDent(e.target.value)} style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"8px 11px",fontSize:13,outline:"none",background:"var(--surface)",maxWidth:250}}>
<option value="all">Todos os dentistas</option>
{dents.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
</select>
</div>
{(()=>{
const orcs=treats.filter(t=>(t.start||"").startsWith(mo)&&(orcDent==="all"||String(t.dentistId)===String(orcDent)));
const totOf=t=>(t.items||[]).reduce((s,i)=>s+Number(i.value||0),0);
const paidOf=t=>(t.payments||[]).reduce((s,p)=>s+Number(p.value||0),0);
const stOf=t=>{var s=t.orcStatus||"espera";if((s==="parcial"||s==="espera")&&totOf(t)>0&&paidOf(t)>=totOf(t)-0.005)return "aprovado";if(s==="espera"&&paidOf(t)>0)return "parcial";return s;};
const dispVal=t=>{var e=stOf(t);return e==="parcial"?paidOf(t):totOf(t);};
const STLABEL={aprovado:"Aprovados",espera:"Em espera",parcial:"Parcial",naofechado:"Não fechados"};
const BADGE={aprovado:"Aprovado",espera:"Em espera",parcial:"Parcial",naofechado:"Não fechado"};
const STCOLOR={aprovado:G.success,espera:G.yellow,parcial:G.blue,naofechado:G.red};
const byStatus={aprovado:[],espera:[],parcial:[],naofechado:[]};
orcs.forEach(t=>{(byStatus[stOf(t)]||byStatus.espera).push(t);});
const sumV=arr=>arr.reduce((s,t)=>s+dispVal(t),0);
const byDent={};
orcs.forEach(t=>{byDent[t.dentistId]=(byDent[t.dentistId]||0)+1;});
const motivos={};
byStatus.naofechado.forEach(t=>{var m=t.orcMotivo||"Sem motivo informado";motivos[m]=(motivos[m]||0)+1;});
return <>
<div style={{background:G.primary,borderRadius:12,padding:"14px 16px",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div><div style={{fontSize:12,opacity:.9,fontWeight:700}}>Orçamentos no mês</div><div style={{fontSize:11,opacity:.8}}>Cada plano de tratamento = 1 orçamento</div></div>
<div style={{fontFamily:"'Cormorant Garamond'",fontSize:38,fontWeight:700,lineHeight:1}}>{orcs.length}</div>
</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:11}}>
{["aprovado","espera","parcial","naofechado"].map(sv=>{var active=orcFilter===sv;return <div key={sv} onClick={function(){setOrcFilter(active?null:sv);}} style={{background:active?STCOLOR[sv]+"18":G.card,borderRadius:11,padding:"12px",textAlign:"center",borderTop:"4px solid "+STCOLOR[sv],boxShadow:active?"0 0 0 2px "+STCOLOR[sv]:"0 1px 4px rgba(0,0,0,.07)",cursor:"pointer",transition:"all .15s"}}>
<div style={{fontSize:11,color:G.muted,fontWeight:700}}>{STLABEL[sv]}</div>
<div style={{fontFamily:"'Cormorant Garamond'",fontSize:30,color:STCOLOR[sv],lineHeight:1.05,fontWeight:700}}>{byStatus[sv].length}</div>
<div style={{fontSize:12,color:STCOLOR[sv],fontWeight:700}}>{cur(sumV(byStatus[sv]))}</div>
<div style={{fontSize:10,color:active?STCOLOR[sv]:G.muted,fontWeight:700,marginTop:3}}>{active?"✓ filtrando":"toque p/ ver"}</div>
</div>;})}
</div>
{Object.keys(byDent).length>0&&<div style={{background:G.card,borderRadius:12,padding:15,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
<div style={{fontWeight:700,fontSize:14,marginBottom:10,color:G.primary}}>🦷 Orçamentos por dentista</div>
<div style={{display:"flex",flexWrap:"wrap",gap:8}}>
{Object.keys(byDent).map(id=>{var d=dents.find(x=>String(x.id)===String(id));return <div key={id} style={{background:((d&&d.color)||G.primary)+"15",borderRadius:9,padding:"7px 13px",display:"flex",alignItems:"center",gap:8}}>
<span style={{fontSize:13,fontWeight:700,color:(d&&d.color)||G.primary}}>{d?d.name:"--"}</span>
<span style={{fontFamily:"'Cormorant Garamond'",fontSize:19,fontWeight:700,color:(d&&d.color)||G.primary}}>{byDent[id]}</span>
</div>;})}
</div>
</div>}
{byStatus.naofechado.length>0&&<div style={{background:G.card,borderRadius:12,padding:15,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",borderLeft:"4px solid "+G.red}}>
<div style={{fontWeight:700,fontSize:14,marginBottom:10,color:G.red}}>❌ Por que não fecharam ({byStatus.naofechado.length})</div>
<div style={{display:"flex",flexDirection:"column",gap:7}}>
{Object.keys(motivos).sort((a,b)=>motivos[b]-motivos[a]).map(m=><div key={m} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:G.red+"12",borderRadius:8}}>
<span style={{fontSize:13,color:G.text,fontWeight:600}}>{m}</span>
<span style={{fontFamily:"'Cormorant Garamond'",fontSize:21,fontWeight:700,color:G.red}}>{motivos[m]}</span>
</div>)}
</div>
</div>}
<div style={{display:"flex",flexDirection:"column",gap:7}}>
{orcFilter&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:STCOLOR[orcFilter]+"15",borderRadius:10,padding:"9px 14px",borderLeft:"4px solid "+STCOLOR[orcFilter]}}><span style={{fontSize:13,fontWeight:700,color:STCOLOR[orcFilter]}}>{STLABEL[orcFilter]+" · "+orcs.filter(t=>stOf(t)===orcFilter).length}</span><button onClick={function(){setOrcFilter(null);}} style={{background:"var(--surface)",border:"1.5px solid "+G.border,borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:700,color:G.primary,cursor:"pointer"}}>{"✕ Ver todos"}</button></div>}
{(orcFilter?orcs.filter(t=>stOf(t)===orcFilter):orcs).length===0&&<div style={{background:G.card,borderRadius:10,padding:20,textAlign:"center",color:G.muted,fontSize:13}}>{orcFilter?"Nenhum orçamento "+STLABEL[orcFilter].toLowerCase()+" neste mês":"Nenhum orçamento neste mês"}</div>}
{(orcFilter?orcs.filter(t=>stOf(t)===orcFilter):orcs).slice().sort((a,b)=>(b.start||"").localeCompare(a.start||"")).map(t=>{var pat=pats.find(p=>p.id===t.patientId);var den=dents.find(d=>String(d.id)===String(t.dentistId));var sv=stOf(t);var v=dispVal(t);var tt=totOf(t);
return <div key={t.id} style={{background:G.card,borderRadius:10,padding:"11px 14px",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",borderLeft:"4px solid "+STCOLOR[sv]}}>
<div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:6}}>
<div><div onClick={function(){if(pat)abrirFicha&&abrirFicha(pat);}} title={pat?"Abrir ficha clínica":""} style={{fontWeight:700,fontSize:13,color:pat?G.primary:G.text,cursor:pat?"pointer":"default",textDecoration:pat?"underline":"none",display:"inline-block"}}>{pat?pat.name:"--"}</div><div style={{fontSize:11,color:G.muted}}>{fmt(t.start)}{den?(" · "+den.name):""}{t.name?(" · "+t.name):""}</div></div>
<div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}><div style={{display:"flex",gap:7,alignItems:"center"}}><Bdg l={BADGE[sv]} col={STCOLOR[sv]} sm/><span style={{fontWeight:700,color:G.primary}}>{cur(v)}</span></div>{sv==="parcial"&&<span style={{fontSize:10,color:G.blue,fontWeight:700}}>{"pago · de "+cur(tt)}</span>}</div>
</div>
{sv==="naofechado"&&t.orcMotivo&&<div style={{fontSize:11,color:G.red,marginTop:5,fontWeight:600}}>Motivo: {t.orcMotivo}{(t.orcMotivo==="Outro"&&t.orcMotivoObs)?(" — "+t.orcMotivoObs):""}</div>}
</div>;})}
</div>
</>;
})()}
</div>}

{tab==="orto"&&(function(){
  var ortoDents=dents.filter(function(d){return (d.specialty||"").toLowerCase().indexOf("orto")>=0;});
  if(ortoDents.length===0)return <div style={{background:G.card,borderRadius:12,padding:20,textAlign:"center",color:G.muted}}>{"Nenhum dentista com especialidade Ortodontia cadastrado."}</div>;
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    {ortoDents.map(function(d){
      var dAppts=appts.filter(function(a){return a.dentistId===d.id&&a.date.startsWith(mo)&&!a.blocked;});
      var dDone=dAppts.filter(function(a){return a.status==="done";}).length;
      var dConf=dAppts.filter(function(a){return a.status==="confirmed";}).length;
      var dPend=dAppts.filter(function(a){return a.status==="pending";}).length;
      var dFalt=dAppts.filter(function(a){return a.status==="missed";}).length;
      var dDesm=dAppts.filter(function(a){return a.status==="cancelled"||a.status==="rescheduled";}).length;
      var paidPatMonth=function(pid){return recs.some(function(r){return r.patientId===pid&&Number(r.dentistId)===Number(d.id)&&Number(r.paid)>0&&(r.date||"").indexOf(mo)===0;});};
      var doneOrtoPats=[];
      dAppts.forEach(function(a){if(a.status==="done"&&doneOrtoPats.indexOf(a.patientId)<0)doneOrtoPats.push(a.patientId);});
      var debitoPats=doneOrtoPats.filter(function(pid){return !paidPatMonth(pid);});
      var isOp=!!openOrto[d.id];
      // Group by week
      var byWeek={};
      dAppts.forEach(function(a){
        var d2=new Date(a.date+"T12:00");
        var week="Semana "+Math.ceil(d2.getDate()/7);
        if(!byWeek[week])byWeek[week]=[];
        byWeek[week].push(a);
      });
      return <div key={d.id} style={{background:G.card,borderRadius:13,padding:15,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",borderLeft:"4px solid "+d.color}}>
        <div onClick={function(){setOpenOrto(function(p){var n={...p};n[d.id]=!n[d.id];return n;});}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:isOp?12:0,flexWrap:"wrap",gap:8,cursor:"pointer"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:13,color:d.color,fontWeight:700}}>{isOp?"▾":"▸"}</span>
            <div>
              <div style={{fontWeight:700,fontSize:15,color:d.color}}>{d.name}</div>
              <div style={{fontSize:11,color:G.muted}}>{d.specialty} · {dAppts.length} pacientes no mês{isOp?"":" · toque para abrir"}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[["Realizados",dDone,G.success],["Confirmados",dConf,G.blue],["Pendentes",dPend,G.yellow],["Faltaram",dFalt,G.red],["Desmarcaram",dDesm,"var(--muted)"],["💰 Débito",debitoPats.length,G.red]].map(function(item){return <div key={item[0]} style={{background:item[2]+"15",borderRadius:9,padding:"5px 9px",textAlign:"center"}}>
              <div style={{fontFamily:"'Cormorant Garamond'",fontSize:18,color:item[2],fontWeight:700}}>{item[1]}</div>
              <div style={{fontSize:9,color:G.muted,fontWeight:700}}>{item[0]}</div>
            </div>;})}
          </div>
        </div>
        {isOp&&<>
        {debitoPats.length>0&&<div style={{background:G.red+"10",border:"1.5px solid "+G.red,borderRadius:10,padding:"9px 12px",marginBottom:10}}>
          <div style={{fontWeight:700,fontSize:12,color:G.red,marginBottom:6}}>{"💰 Passaram sem pagamento — "+debitoPats.length+" em débito"}</div>
          {debitoPats.map(function(pid){var pp=pats.find(function(x){return x.id===pid;});return <div key={pid} style={{display:"flex",gap:8,alignItems:"center",padding:"5px 0",borderBottom:"1px solid "+G.red+"22",flexWrap:"wrap"}}>
            <span style={{flex:1,fontWeight:700,fontSize:12,color:G.red}}>{pp?pp.name:"--"}</span>
            {pp&&pp.folder&&<span style={{fontSize:10,color:G.muted}}>{pp.folder}</span>}
            {pp&&pp.phone&&<button onClick={function(){wa(pp.phone,"Ola, "+pp.name+"! Identificamos que a mensalidade do seu tratamento ortodontico esta em aberto este mes. Pode regularizar quando puder? Qualquer duvida estamos a disposicao. Affonso Odontologia");}} style={{background:"#25D366",color:"#fff",border:"none",borderRadius:7,padding:"3px 10px",fontSize:10,fontWeight:700,cursor:"pointer"}}>{"📱 Cobrar"}</button>}
          </div>;})}
        </div>}
        {dAppts.length===0&&<p style={{color:G.muted,fontSize:12}}>Nenhum paciente este mês</p>}
        {dAppts.sort(function(a,b){return a.date.localeCompare(b.date)||(t2m(a.time)-t2m(b.time));}).map(function(a){
          var p=pats.find(function(x){return x.id===a.patientId;});
          return <div key={a.id} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid "+G.border,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:11,color:G.muted,minWidth:80}}>{fmt(a.date)+" "+a.time}</span>
            <span style={{flex:1,fontWeight:600,fontSize:12}}>{p?p.name:"A confirmar"}</span>
            <span style={{fontSize:11,color:G.muted}}>{a.procedure}</span>
            {a.status==="done"&&debitoPats.indexOf(a.patientId)>=0&&<span style={{fontSize:10,fontWeight:700,color:"#fff",background:G.red,borderRadius:10,padding:"1px 7px"}}>{"💰 sem pgto"}</span>}
            <span style={{fontSize:10,fontWeight:700,color:SC[a.status],background:SC_BG[a.status],borderRadius:10,padding:"1px 7px"}}>{SL[a.status]}</span>
          </div>;
        })}
        </>}
      </div>;
    })}
  </div>;
})()}

{tab==="gastos"&&user.level>=3&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
{[["Gastos Clínica",clinicaG,G.red],["Gastos Pessoais",pessoalG,G.purple]].map(([title,list,color])=><div key={title} style={{background:G.card,borderRadius:13,padding:15,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
<div style={{fontWeight:700,fontSize:14,color,marginBottom:10}}>{title}</div>
<div style={{fontFamily:"'Cormorant Garamond'",fontSize:22,color,marginBottom:12}}>{cur(list.reduce((s,e)=>s+Number(e.value||0),0))}</div>
{list.map(e=><div key={e.id} style={{display:"flex",gap:8,fontSize:12,padding:"4px 0",borderBottom:`1px solid ${G.border}`,flexWrap:"wrap",alignItems:"center"}}>
<span style={{color:G.muted,minWidth:78}}>{e.recorrente?("Todo dia "+(e.diaVenc||"?")):fmt(e.date)}</span>
<span style={{flex:1}}>{e.desc} <span style={{color:G.muted}}>({e.cat})</span>{e.recorrente?<span style={{color:G.blue,fontWeight:700}}> · recorrente</span>:""}</span>
<Bdg l={isPagoG(e)?"Pago":"Pendente"} col={isPagoG(e)?G.success:G.red} sm/>
<span style={{fontWeight:700}}>{cur(e.value)}</span>
</div>)}
{list.length===0&&<p style={{color:G.muted,fontSize:12}}>Nenhum gasto</p>}
</div>)}
</div>
</div>}

{/* ── PACIENTES ── */}
{tab==="pacs"&&<PacsTab pats={pats} recs={recs} treats={treats} appts={appts} dents={dents} mo={mo} user={user} pacsTicks={pacsTicks} setPacsTicks={setPacsTicks} abrirFicha={abrirFicha}/>}

{/* ── WHATSAPP ── */}
{tab==="buscar"&&<BuscaOrcTab treats={treats} pats={pats} dents={dents} abrirFicha={abrirFicha}/>}
{tab==="msg"&&<MsgTab pats={pats} selMsg={selMsg} setSelMsg={setSelMsg} selPatsMsg={selPatsMsg} setSelPatsMsg={setSelPatsMsg} allSelMsg={allSelMsg} setAllSelMsg={setAllSelMsg} waTemplates={waTemplates} setWaTemplates={setWaTemplates} user={user}/>}
{tab==="respOrc"&&user.level>=3&&<RespOrcTab treats={treats} budgets={budgets} pats={pats} dents={dents} appts={appts} waSent={waSent} orcResp={orcResp} setOrcResp={setOrcResp} user={user} abrirFicha={abrirFicha}/>}
{tab==="nf"&&user.level>=3&&<NFTab pats={pats} dents={dents} mo={mo} abrirFicha={abrirFicha}/>}

  </div>;
}

// ══════════════════════════════════════════════════════════
// ESTOQUE
// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
// IMPORTAÇÃO DE NF-e (XML) — Estoque (V195)
// Autocontido: só usa (stock,setStock). Parse com DOMParser nativo (NF-e 4.00).
// ══════════════════════════════════════════════════════════
function nfeNorm(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim();}
function nfeBigrams(s){var out={};for(var i=0;i<s.length-1;i++){var b=s.slice(i,i+2);out[b]=(out[b]||0)+1;}return out;}
function nfeDice(a,b){var A=nfeBigrams(a),B=nfeBigrams(b);var inter=0,ta=0,tb=0,k;for(k in A)ta+=A[k];for(k in B)tb+=B[k];if(!ta||!tb)return 0;for(k in A)if(B[k])inter+=Math.min(A[k],B[k]);return (2*inter)/(ta+tb);}
function nfeScore(itNF,itStk){
  if(itNF.cod&&itStk.codigo&&String(itStk.codigo).trim()===String(itNF.cod).trim())return 1;
  var a=nfeNorm(itNF.desc),b=nfeNorm(itStk.name);
  if(!a||!b)return 0;
  if(a.indexOf(b)>=0||b.indexOf(a)>=0)return 0.9;
  return nfeDice(a,b);
}
function nfeParse(txt){
  var doc;
  try{doc=new DOMParser().parseFromString(txt,"text/xml");}catch(e){return {err:"Não foi possível ler o arquivo."};}
  if(!doc||doc.getElementsByTagName("parsererror").length)return {err:"Arquivo XML inválido. Confira se é o XML da NF-e."};
  function tag(el,name){if(!el)return "";var ns=el.getElementsByTagName(name);return (ns&&ns[0]&&ns[0].textContent)||"";}
  var emit=doc.getElementsByTagName("emit")[0];
  var ide=doc.getElementsByTagName("ide")[0];
  var forn=tag(emit,"xNome")||"Fornecedor";
  var num=tag(ide,"nNF")||"?";
  var dt=(tag(ide,"dhEmi")||tag(ide,"dEmi")||"").slice(0,10)||today();
  var dets=doc.getElementsByTagName("det");
  if(!dets.length)return {err:"Nenhum item encontrado. Confira se o arquivo é o XML da NF-e."};
  var itens=[];
  for(var i=0;i<dets.length;i++){
    var prod=dets[i].getElementsByTagName("prod")[0];
    if(!prod)continue;
    itens.push({cod:tag(prod,"cProd"),desc:tag(prod,"xProd"),un:(tag(prod,"uCom")||"un").toLowerCase(),q:parseFloat(tag(prod,"qCom"))||0,vu:parseFloat(tag(prod,"vUnCom"))||0});
  }
  if(!itens.length)return {err:"Nenhum item válido encontrado no XML."};
  return {forn:forn,num:num,date:dt,itens:itens};
}
function ImportNFe({stock,setStock,addLog,onClose}){
  const [nf,setNf]=useState(null);
  const [sel,setSel]=useState({});
  const [erro,setErro]=useState("");
  const [done,setDone]=useState(null);
  var sorted=[...(stock||[])].sort(function(a,b){return String(a.name).localeCompare(String(b.name),"pt-BR",{sensitivity:"base"});});
  function onFile(e){
    var f=e.target.files&&e.target.files[0];
    if(!f)return;
    setErro("");
    var rd=new FileReader();
    rd.onload=function(){
      var r=nfeParse(String(rd.result||""));
      if(r.err){setErro(r.err);return;}
      var s={};
      r.itens.forEach(function(it,i){
        var best=null,bestScore=0;
        (stock||[]).forEach(function(st){var sc=nfeScore(it,st);if(sc>bestScore){bestScore=sc;best=st;}});
        s[i]=(best&&bestScore>=0.45)?String(best.id):"novo";
      });
      setSel(s);setNf(r);
    };
    rd.onerror=function(){setErro("Não foi possível ler o arquivo.");};
    rd.readAsText(f);
  }
  function confirmar(){
    if(!nf)return;
    var casados=0,criados=0;
    nf.itens.forEach(function(it,i){if(sel[i]==="novo")criados++;else casados++;});
    setStock(function(prev){
      var next=prev.map(function(s){return Object.assign({},s);});
      nf.itens.forEach(function(it,i){
        var mov={t:"in",q:it.q,date:nf.date,note:"NF-e nº "+nf.num+" - "+nf.forn,p:Number(it.vu)||0};// V236 grava preco
        var alvo=sel[i];
        if(alvo==="novo"){
          next.push({id:nid(),name:it.desc,qty:it.q,unit:it.un||"un",min:1,price:it.vu,codigo:it.cod||"",movs:[mov]});
        }else{
          var s=next.find(function(x){return String(x.id)===String(alvo);});
          if(s){s.qty=Number(s.qty||0)+it.q;s.price=it.vu;if(!s.codigo&&it.cod)s.codigo=it.cod;s.movs=[mov].concat(s.movs||[]);}
        }
      });
      return next;
    });
    try{if(addLog)addLog("estoque","Entrada NF-e nº "+nf.num+" - "+nf.forn+" ("+nf.itens.length+" itens)","");}catch(e){}
    setDone({tot:nf.itens.length,casados:casados,criados:criados});
  }
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:G.card,borderRadius:16,width:"100%",maxWidth:640,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid "+G.border}}>
        <span style={{fontFamily:"'Cormorant Garamond'",fontSize:20}}>📥 Importar NF-e (XML)</span>
        <button onClick={onClose} style={{border:"none",background:"none",fontSize:24,cursor:"pointer",color:G.muted}}>×</button>
      </div>
      <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
        {done&&<>
          <div style={{background:"var(--green-soft)",borderRadius:10,padding:"14px 16px",textAlign:"center"}}><div style={{fontSize:26}}>✅</div><div style={{fontWeight:700,color:G.success}}>{done.tot+" entrada"+(done.tot>1?"s":"")+" registrada"+(done.tot>1?"s":"")+" no estoque!"}</div><div style={{fontSize:12.5,color:G.muted,marginTop:4}}>{done.casados+" item(ns) atualizado(s) · "+done.criados+" criado(s)"}</div></div>
          <Btn ch="Fechar" onClick={onClose}/>
        </>}
        {!done&&!nf&&<>
          <div style={{fontSize:13,color:G.muted}}>Selecione o arquivo <b>XML da nota fiscal do fornecedor</b>. Os itens aparecem para conferência antes de entrar no estoque.</div>
          <input type="file" accept=".xml,text/xml" onChange={onFile} style={{fontSize:13,padding:"10px 12px"}}/>
          {erro&&<div style={{background:"var(--red-soft)",color:G.red,borderRadius:8,padding:"9px 12px",fontSize:12.5,fontWeight:600}}>{erro}</div>}
        </>}
        {!done&&nf&&<>
          <div style={{background:G.bg,borderRadius:10,padding:"10px 13px",fontSize:12.5}}>
            <div style={{fontWeight:700}}>{nf.forn}</div>
            <div style={{color:G.muted}}>{"NF-e nº "+nf.num+" · "+fmt(nf.date)+" · "+nf.itens.length+" item(ns)"}</div>
          </div>
          <div style={{fontSize:11.5,color:G.muted}}>Confira o casamento de cada item. Ao confirmar: soma a quantidade, atualiza o preço com o valor da nota e aprende o código do produto para as próximas notas.</div>
          {nf.itens.map(function(it,i){var isNovo=sel[i]==="novo";return <div key={i} style={{background:G.bg,borderRadius:10,padding:"10px 13px",display:"flex",flexDirection:"column",gap:6}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
              <span style={{fontSize:12.5,fontWeight:700,flex:1,minWidth:180}}>{it.desc}</span>
              <span style={{fontSize:12,color:G.muted,whiteSpace:"nowrap"}}>{it.q+" "+it.un+" × "+cur(it.vu)}</span>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <Bdg l={isNovo?"Criar novo":"Casado"} col={isNovo?G.blue:G.success} sm/>
              <select value={sel[i]} onChange={function(e){var v=e.target.value;setSel(function(p){var n=Object.assign({},p);n[i]=v;return n;});}} style={{flex:1,minWidth:200,border:"1.5px solid "+G.border,borderRadius:8,padding:"7px 10px",fontSize:13,outline:"none",color:G.text,background:"var(--surface)"}}>
                <option value="novo">{"➕ Criar novo item: "+it.desc}</option>
                {sorted.map(function(s){return <option key={s.id} value={String(s.id)}>{s.name+(s.codigo?(" ["+s.codigo+"]"):"")}</option>;})}
              </select>
            </div>
          </div>;})}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",flexWrap:"wrap"}}>
            <button onClick={function(){setNf(null);setSel({});}} style={{border:"1.5px solid "+G.muted,background:"transparent",color:G.muted,borderRadius:8,padding:"9px 14px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Voltar</button>
            <Btn ch={"✔ Confirmar "+nf.itens.length+" entrada(s)"} onClick={confirmar}/>
          </div>
        </>}
      </div>
    </div>
  </div>;
}
function Estoque({stock,setStock,implCat,setImplCat,implMov,setImplMov,pats,dents,addLog,user}){
const [modal,setModal]=useState(false);const [mv,setMv]=useState(null);const [edit,setEdit]=useState(null);const [stkTab,setStkTab]=useState("material");
const [matTab,setMatTab]=useState("itens");const [relMes,setRelMes]=useState(today().slice(0,7));// V236 relatorio materiais
const b0={name:"",qty:0,unit:"un",min:1,price:0,movs:[]};
const [f,setF]=useState(b0);const upd=k=>v=>setF(p=>({...p,[k]:v}));
const [m,setM]=useState({t:"in",q:"",note:"",date:today()});
const [impNfe,setImpNfe]=useState(false); // Importação NF-e (V195)
const save=()=>{if(!f.name)return;const obj={...f,qty:Number(f.qty),min:Number(f.min),price:Number(f.price),id:edit?edit.id:nid(stock)};
if(edit&&Number(f.qty)!==Number(edit.qty)){obj.movs=[{t:"aj",q:Number(f.qty)-Number(edit.qty),date:today(),note:"Correção de contagem ("+Number(edit.qty)+" → "+Number(f.qty)+")"},...(obj.movs||[])];try{if(addLog)addLog("estoque","Ajuste de contagem: "+obj.name+" ("+Number(edit.qty)+" → "+Number(f.qty)+")","");}catch(e){}}// V237 ajuste automatico
setStock(prev=>edit?prev.map(s=>s.id===edit.id?obj:s):[...prev,obj]);setModal(false);};
const addMov=()=>{if(!m.q)return;const q=Number(m.q);setStock(prev=>prev.map(s=>s.id===mv?{...s,qty:m.t==="in"?s.qty+q:Math.max(0,s.qty-q),movs:[{t:m.t,q,date:m.date,note:m.note,p:Number(s.price)||0},...(s.movs||[])]}:s));setMv(null);};
return <div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">

<div style={{display:"flex",gap:4,background:G.bg,borderRadius:12,padding:4}}>
<button onClick={function(){setStkTab("material");}} style={{flex:1,border:"none",borderRadius:9,padding:"9px 4px",fontSize:12,fontWeight:700,cursor:"pointer",background:stkTab==="material"?"var(--card)":G.bg,color:stkTab==="material"?G.primary:G.muted,boxShadow:stkTab==="material"?"0 1px 4px rgba(0,0,0,.1)":"none"}}>{"📦 Material"}</button>
<button onClick={function(){setStkTab("implantes");}} style={{flex:1,border:"none",borderRadius:9,padding:"9px 4px",fontSize:12,fontWeight:700,cursor:"pointer",background:stkTab==="implantes"?"var(--card)":G.bg,color:stkTab==="implantes"?G.primary:G.muted,boxShadow:stkTab==="implantes"?"0 1px 4px rgba(0,0,0,.1)":"none"}}>{"🦷 Implantes"}</button>
</div>
{stkTab==="implantes"&&<ImplantesConsig implCat={implCat} setImplCat={setImplCat} implMov={implMov} setImplMov={setImplMov} pats={pats} dents={dents} addLog={addLog} user={user}/>}
{stkTab==="material"&&<>
<div style={{display:"flex",gap:4,background:G.bg,borderRadius:12,padding:4}}>
<button onClick={function(){setMatTab("itens");}} style={{flex:1,border:"none",borderRadius:9,padding:"8px 4px",fontSize:12,fontWeight:700,cursor:"pointer",background:matTab==="itens"?"var(--card)":G.bg,color:matTab==="itens"?G.primary:G.muted,boxShadow:matTab==="itens"?"0 1px 4px rgba(0,0,0,.1)":"none"}}>{"Itens"}</button>
<button onClick={function(){setMatTab("rel");}} style={{flex:1,border:"none",borderRadius:9,padding:"8px 4px",fontSize:12,fontWeight:700,cursor:"pointer",background:matTab==="rel"?"var(--card)":G.bg,color:matTab==="rel"?G.primary:G.muted,boxShadow:matTab==="rel"?"0 1px 4px rgba(0,0,0,.1)":"none"}}>{"📊 Relatório"}</button>
</div>
{matTab==="itens"&&<>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
<h2 style={{fontFamily:"'Cormorant Garamond'",fontSize:26}}>Estoque</h2>
<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
<Btn ch="📥 Importar NF-e" v="g" onClick={()=>setImpNfe(true)}/>
<Btn ch="+ Novo Item" onClick={()=>{setEdit(null);setF(b0);setModal(true);}}/>
</div>
</div>
{impNfe&&<ImportNFe stock={stock} setStock={setStock} addLog={addLog} onClose={()=>setImpNfe(false)}/>}
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:11}}>
{[...stock].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR",{sensitivity:"base"})).map(s=>{const low=s.qty<=s.min;return <div key={s.id} style={{background:G.card,borderRadius:12,padding:13,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",borderLeft:`4px solid ${low?G.red:G.success}`}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
<div><div style={{fontWeight:700,fontSize:13}}>{s.name}</div><div style={{fontSize:11,color:G.muted}}>Custo: {cur(s.price)}/{s.unit}</div></div>
<div style={{textAlign:"right"}}><div style={{fontFamily:"'Cormorant Garamond'",fontSize:24,color:low?G.red:G.success,lineHeight:1}}>{s.qty}</div><div style={{fontSize:10,color:G.muted}}>{s.unit}</div></div>
</div>
{low&&<div style={{background:G.red+"15",borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:700,color:G.red,marginTop:5}}>⚠ Estoque baixo!</div>}
<div style={{display:"flex",gap:5,marginTop:9}}>
<Btn ch="+ Entrada" sm onClick={()=>{setM({t:"in",q:"",note:"",date:today()});setMv(s.id);}}/>
<Btn ch="- Saída" v="y" sm onClick={()=>{setM({t:"out",q:"",note:"",date:today()});setMv(s.id);}}/>
<Btn ch="✏️" v="g" sm onClick={()=>{setEdit(s);setF({...s});setModal(true);}}/>
</div>
</div>;})}
</div>
<Modal open={modal} close={()=>setModal(false)} title={edit?"Editar Item":"Novo Item"} ch={<div style={{display:"flex",flexDirection:"column",gap:11}}>
<Inp lb="Nome do Material" val={f.name} set={upd("name")}/>
<R2 a={<Inp lb="Qtd. Atual" val={String(f.qty)} set={upd("qty")} type="number"/>} b={<Inp lb="Unidade" val={f.unit} set={upd("unit")} ph="un / cx / ml"/>}/>
<R2 a={<Inp lb="Qtd. Mínima" val={String(f.min)} set={upd("min")} type="number"/>} b={<Inp lb="Preço Un. (R$)" val={String(f.price)} set={upd("price")} type="number"/>}/>
<label style={{display:"flex",alignItems:"center",gap:9,fontSize:13,cursor:"pointer",background:f.fixo?G.primary+"12":G.bg,borderRadius:8,padding:"9px 12px",border:"1.5px solid "+(f.fixo?G.primary:G.border)}}>
  <input type="checkbox" checked={!!f.fixo} onChange={e=>upd("fixo")(e.target.checked)} style={{accentColor:G.primary,width:16,height:16}}/>
  <div>
    <strong style={{color:f.fixo?G.primary:G.text}}>📌 Despesa Fixa (repete todo mês)</strong>
    <div style={{fontSize:11,color:G.muted}}>Aparece automaticamente todo mês sem o valor</div>
  </div>
</label>
{f.fixo&&<Inp lb="Dia de Vencimento" val={f.diaVenc||""} set={upd("diaVenc")} type="number" ph="Ex: 10 (dia 10 de cada mês)" min="1" max="31"/>}
<SC2 save={save} cancel={()=>setModal(false)}/>
</div>}/>
<Modal open={!!mv} close={()=>setMv(null)} title={m.t==="in"?"Entrada":"Saída"} ch={<div style={{display:"flex",flexDirection:"column",gap:11}}>
<R2 a={<Inp lb="Quantidade" val={m.q} set={v=>setM(p=>({...p,q:v}))} type="number"/>} b={<Inp lb="Data" val={m.date} set={v=>setM(p=>({...p,date:v}))} type="date"/>}/>
<Inp lb="Motivo" val={m.note} set={v=>setM(p=>({...p,note:v}))}/>
<SC2 save={addMov} cancel={()=>setMv(null)} lbl="Registrar"/>
</div>}/>
</>}
{matTab==="rel"&&(function(){
var movsAll=[];
stock.forEach(function(s){(s.movs||[]).forEach(function(mm,ix){var pu=(mm.p!=null&&mm.p!=="")?Number(mm.p):(Number(s.price)||0);movsAll.push({t:mm.t,q:Number(mm.q||0),date:mm.date||"",note:mm.note||"",itemName:s.name,unit:s.unit,pu:pu,val:pu*Number(mm.q||0),estimado:(mm.t!=="aj")&&(mm.p==null||mm.p===""),itemId:s.id,movIdx:ix});});});// V237 id p/ exclusao
var doMes=movsAll.filter(function(mm){return String(mm.date).startsWith(relMes);});
doMes.sort(function(a,b){return String(b.date).localeCompare(String(a.date));});
var gastoMes=doMes.filter(function(mm){return mm.t==="out";}).reduce(function(s2,mm){return s2+mm.val;},0);
var entradaMes=doMes.filter(function(mm){return mm.t==="in";}).reduce(function(s2,mm){return s2+mm.val;},0);
var temEstimado=doMes.some(function(mm){return mm.estimado;});
var porItem={};
doMes.forEach(function(mm){if(mm.t!=="out")return;if(!porItem[mm.itemName])porItem[mm.itemName]={q:0,v:0,unit:mm.unit};porItem[mm.itemName].q+=mm.q;porItem[mm.itemName].v+=mm.val;});
var itensArr=Object.keys(porItem).map(function(k){return Object.assign({name:k},porItem[k]);}).sort(function(a,b){return b.v-a.v;});
return <div style={{display:"flex",flexDirection:"column",gap:12}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
<h2 style={{fontFamily:"'Cormorant Garamond'",fontSize:26}}>{"Relatório de Materiais"}</h2>
<input type="month" value={relMes} onChange={function(e){setRelMes(e.target.value);}} style={{border:"1.5px solid "+G.border,borderRadius:10,padding:"7px 10px",fontSize:13,background:G.card,color:G.text}}/>
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
<div style={{background:G.card,borderRadius:12,padding:"12px 14px",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
<div style={{fontSize:10,fontWeight:700,color:G.muted,textTransform:"uppercase"}}>{"Gasto no mês (saídas)"}</div>
<div style={{fontFamily:"'Cormorant Garamond'",fontSize:26,color:G.red}}>{cur(gastoMes)}</div>
</div>
<div style={{background:G.card,borderRadius:12,padding:"12px 14px",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
<div style={{fontSize:10,fontWeight:700,color:G.muted,textTransform:"uppercase"}}>{"Entradas (compras)"}</div>
<div style={{fontFamily:"'Cormorant Garamond'",fontSize:26,color:G.success}}>{cur(entradaMes)}</div>
</div>
</div>
{itensArr.length>0&&<div>
<div style={{fontSize:11,fontWeight:800,color:G.muted,textTransform:"uppercase",letterSpacing:.6,marginBottom:8}}>{"Consumo por material"}</div>
<div style={{display:"flex",flexDirection:"column",gap:8}}>
{itensArr.map(function(it,i){return <div key={i} style={{background:G.card,borderRadius:12,padding:"11px 13px",display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"4px 4px 10px var(--nm-dark),-4px -4px 10px #ffffff"}}>
<div><div style={{fontWeight:700,fontSize:13}}>{it.name}</div><div style={{fontSize:11,color:G.muted}}>{it.q+" "+(it.unit||"un")+" usadas"}</div></div>
<div style={{fontWeight:800,color:G.red}}>{cur(it.v)}</div>
</div>;})}
</div>
</div>}
<div>
<div style={{fontSize:11,fontWeight:800,color:G.muted,textTransform:"uppercase",letterSpacing:.6,marginBottom:8}}>{"Movimentações do mês"}</div>
{doMes.length===0&&<div style={{textAlign:"center",padding:24,color:G.muted,fontSize:13,background:G.card,borderRadius:12}}>{"Nenhuma movimentação neste mês."}</div>}
<div style={{display:"flex",flexDirection:"column",gap:8}}>
{doMes.map(function(mm,i){var isIn=mm.t==="in";var isAj=mm.t==="aj";var cor=isAj?"#9aa39c":(isIn?G.success:G.red);return <div key={i} style={{background:G.card,borderRadius:12,padding:"11px 13px",borderLeft:"4px solid "+cor,boxShadow:"4px 4px 10px var(--nm-dark),-4px -4px 10px #ffffff",position:"relative"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
<div>
<span style={{fontSize:9,fontWeight:800,borderRadius:5,padding:"1px 6px",textTransform:"uppercase",background:cor+"25",color:isAj?"#6a736c":cor}}>{isAj?"Ajuste":(isIn?"Entrada":"Saída")}</span>
<div style={{fontWeight:700,fontSize:13,marginTop:2}}>{mm.itemName}</div>
<div style={{fontSize:11,color:G.muted}}>{fmt(mm.date)+(mm.note?" · "+mm.note:"")}</div>
</div>
<div style={{textAlign:"right",paddingRight:user&&user.level>=3?34:0}}>
<div style={{fontWeight:800,fontSize:14,color:isAj?"#6a736c":cor,whiteSpace:"nowrap"}}>{isAj?((mm.q>0?"+":"")+mm.q+" "+(mm.unit||"un")):(cur(mm.val)+(mm.estimado?"*":""))}</div>
<div style={{fontSize:11,color:G.muted}}>{isAj?"fora dos totais":(mm.q+" "+(mm.unit||"un"))}</div>
</div>
</div>
{user&&user.level>=3&&<button onClick={function(){if(!window.confirm("Apagar esta movimentação do histórico? A quantidade atual do estoque não muda."))return;setStock(function(prev){return prev.map(function(s2){return s2.id===mm.itemId?Object.assign({},s2,{movs:(s2.movs||[]).filter(function(_,ix2){return ix2!==mm.movIdx;})}):s2;});});try{if(addLog)addLog("estoque","Apagou movimentação do relatório: "+mm.itemName+" ("+(isAj?"ajuste":(isIn?"entrada":"saída"))+" "+mm.q+")","");}catch(e){}}} style={{position:"absolute",bottom:8,right:10,border:"none",background:G.bg,borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:13,boxShadow:"2px 2px 5px var(--nm-dark),-2px -2px 5px #ffffff"}}>{"🗑"}</button>}
</div>;})}
</div>
</div>
{temEstimado&&<div style={{background:G.gold+"18",border:"1.5px solid "+G.gold+"55",borderRadius:10,padding:"10px 12px",fontSize:11,color:G.muted,lineHeight:1.5}}>{"* Movimentações antigas não gravaram o preço na hora — o valor foi calculado com o preço atual do item. Baixas novas já gravam o preço do momento."}</div>}
</div>;
})()}
</>}

  </div>;
}

// ══════════════════════════════════════════════════════════
// IMPLANTES
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// ADMIN
// ══════════════════════════════════════════════════════════
function ImportWizard({pats,setPats}){
  const [step,setStep]=useState(1);
  const [fileName,setFileName]=useState("");
  const [headers,setHeaders]=useState([]);
  const [rows,setRows]=useState([]);
  const [mapping,setMapping]=useState({});
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const [skipDup,setSkipDup]=useState(true);
  const [done,setDone]=useState(null);

  const FIELDS=[
    {k:"name",label:"Nome",req:true,hints:["nome completo","nome","paciente","name","cliente"]},
    {k:"phone",label:"Telefone / Celular",hints:["telefone","celular","fone","whatsapp","tel","phone","contato"]},
    {k:"dob",label:"Data de nascimento",hints:["data de nascimento","data nasc","nascimento","nasc","dob","aniversario","birth"]},
    {k:"genero",label:"Genero (M/F)",hints:["genero","sexo","gender"]},
    {k:"email",label:"E-mail",hints:["email","e-mail","mail"]},
    {k:"cpf",label:"CPF",hints:["cpf","documento","doc"]},
    {k:"rg",label:"RG",hints:["rg","identidade"]},
    {k:"insurance",label:"Convenio / Plano",hints:["convenio","plano","seguro","insurance","conv"]},
    {k:"blood",label:"Tipo sanguineo",hints:["tipo sanguineo","sanguineo","sangue","blood"]},
    {k:"allergy",label:"Alergias",hints:["alergias","alergia","allerg"]},
    {k:"notes",label:"Observacoes",hints:["observacoes","observacao","obs","anotacao","comentario","note"]},
    {k:"folder",label:"Nº da Ficha",hints:["ficha","pasta","prontuario","prontuário","folder","nº da ficha","numero da ficha","n da ficha"]},
    {k:"rx",label:"Nº do RX",hints:["rx","raio-x","raio x","radiografia","nº do rx","numero do rx","n do rx"]}
  ];

  function pad(n){n=String(n);return n.length<2?"0"+n:n;}
  function pad4(n){n=String(n);while(n.length<4)n="0"+n;return n;}
  function normGen(v){var s=(v||"").toLowerCase().trim();if(s.indexOf("m")===0)return "M";if(s.indexOf("f")===0)return "F";return "";}
  function normDate(v){
    if(!v)return "";
    v=String(v).trim();
    var m=v.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
    if(m)return m[1]+"-"+pad(m[2])+"-"+pad(m[3]);
    m=v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if(m){var d=m[1],mo=m[2],y=m[3];if(y.length===2){var yy=parseInt(y,10);y=(yy>25?"19":"20")+y;}return y+"-"+pad(mo)+"-"+pad(d);}
    return v;
  }
  function detectDelim(t){
    var fl=(t.split(/\r?\n/)[0])||"";
    var co=(fl.match(/,/g)||[]).length,sc=(fl.match(/;/g)||[]).length,tb=(fl.match(/\t/g)||[]).length;
    if(sc>=co&&sc>=tb&&sc>0)return ";";
    if(tb>co&&tb>sc)return "\t";
    return ",";
  }
  function parseCSV(t){
    if(t.charCodeAt(0)===0xFEFF)t=t.slice(1);
    var d=detectDelim(t);
    var rows=[],row=[],cur="",i=0,inQ=false;
    while(i<t.length){
      var c=t[i];
      if(inQ){
        if(c==='"'){ if(t[i+1]==='"'){cur+='"';i+=2;continue;} inQ=false;i++;continue; }
        cur+=c;i++;continue;
      }
      if(c==='"'){inQ=true;i++;continue;}
      if(c===d){row.push(cur);cur="";i++;continue;}
      if(c==='\n'){row.push(cur);rows.push(row);row=[];cur="";i++;continue;}
      if(c==='\r'){i++;continue;}
      cur+=c;i++;
    }
    if(cur!==""||row.length>0){row.push(cur);rows.push(row);}
    return rows.filter(function(r){return r.some(function(x){return (x||"").trim()!=="";});});
  }
  function loadXLSX(){
    return new Promise(function(resolve,reject){
      if(window.XLSX)return resolve(window.XLSX);
      var urls=["https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js","https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"];
      var idx=0;
      function tryNext(){
        if(idx>=urls.length){reject(new Error("nao carregou"));return;}
        var s=document.createElement("script");
        s.src=urls[idx++];
        s.onload=function(){window.XLSX?resolve(window.XLSX):tryNext();};
        s.onerror=function(){tryNext();};
        document.head.appendChild(s);
      }
      tryNext();
    });
  }
  function autoMap(hs){
    var m={};
    FIELDS.forEach(function(f){
      var found="";
      hs.forEach(function(h,idx){
        if(found!=="")return;
        var hl=(h||"").toLowerCase().trim();
        if(!hl)return;
        for(var j=0;j<f.hints.length;j++){var hint=f.hints[j];if(hl===hint||hl.indexOf(hint)>=0){found=String(idx);break;}}
      });
      m[f.k]=found;
    });
    return m;
  }
  function ingest(hs,rs){setHeaders(hs);setRows(rs);setMapping(autoMap(hs));setErr("");setStep(2);}
  function onFile(file){
    setErr("");setDone(null);
    if(!file)return;
    setFileName(file.name);
    var lower=file.name.toLowerCase();
    if(lower.match(/\.(csv|txt)$/)){
      var r=new FileReader();
      r.onload=function(e){
        try{var rs=parseCSV(String(e.target.result));if(rs.length<2){setErr("O arquivo precisa de um cabecalho e pelo menos 1 linha de dados.");return;}ingest(rs[0].map(function(x){return String(x||"");}),rs.slice(1));}
        catch(ex){setErr("Nao consegui ler o CSV: "+ex.message);}
      };
      r.onerror=function(){setErr("Erro ao ler o arquivo.");};
      r.readAsText(file,"UTF-8");
    } else if(lower.match(/\.(xlsx|xls)$/)){
      setLoading(true);
      loadXLSX().then(function(XLSX){
        var r=new FileReader();
        r.onload=function(e){
          try{
            var data=new Uint8Array(e.target.result);
            var wb=XLSX.read(data,{type:"array"});
            var ws=wb.Sheets[wb.SheetNames[0]];
            var arr=XLSX.utils.sheet_to_json(ws,{header:1,defval:"",raw:false});
            var rs=arr.filter(function(rr){return Array.isArray(rr)&&rr.some(function(x){return String(x==null?"":x).trim()!=="";});});
            setLoading(false);
            if(rs.length<2){setErr("A planilha precisa de um cabecalho e pelo menos 1 linha de dados.");return;}
            ingest(rs[0].map(function(x){return String(x==null?"":x);}),rs.slice(1).map(function(rr){return rr.map(function(x){return String(x==null?"":x);});}));
          }catch(ex){setLoading(false);setErr("Nao consegui ler o Excel: "+ex.message+". Tente salvar como CSV no Excel (Arquivo > Salvar como > CSV).");}
        };
        r.onerror=function(){setLoading(false);setErr("Erro ao ler o arquivo.");};
        r.readAsArrayBuffer(file);
      }).catch(function(){setLoading(false);setErr("Nao consegui abrir o Excel aqui (o leitor precisa de internet/permissao). Solucao rapida: abra a planilha e salve como CSV — no Excel: Arquivo > Salvar Como > CSV UTF-8; no Google Sheets: Arquivo > Fazer download > CSV. Depois envie o CSV.");});
    } else {
      setErr("Formato nao suportado. Envie um arquivo CSV ou Excel (.xlsx).");
    }
  }
  function getCell(row,k){var i=mapping[k];if(i===""||i==null)return "";var val=row[Number(i)];return String(val==null?"":val).trim();}
  function buildMapped(){
    return rows.map(function(r){return {
      name:getCell(r,"name"),phone:getCell(r,"phone"),dob:normDate(getCell(r,"dob")),genero:normGen(getCell(r,"genero")),
      email:getCell(r,"email"),cpf:getCell(r,"cpf"),rg:getCell(r,"rg"),insurance:getCell(r,"insurance"),
      blood:getCell(r,"blood"),allergy:getCell(r,"allergy"),notes:getCell(r,"notes"),
      folder:getCell(r,"folder"),rx:getCell(r,"rx")
    };});
  }
  function doImport(){
    var mp=buildMapped().filter(function(p){return p.name;});
    var existing=pats.slice();
    var nextId=existing.reduce(function(mx,p){return Math.max(mx,p.id||0);},0)+1;
    function norm(s){return (s||"").toLowerCase().replace(/\s+/g," ").trim();}
    var existNames={};existing.forEach(function(p){existNames[norm(p.name)]=true;});
    var existCpf={};existing.forEach(function(p){var c=(p.cpf||"").replace(/\D/g,"");if(c)existCpf[c]=true;});
    var add=[],skipped=0;
    mp.forEach(function(p){
      var c=(p.cpf||"").replace(/\D/g,"");
      if(skipDup&&((c&&existCpf[c])||existNames[norm(p.name)])){skipped++;return;}
      add.push({id:nextId,name:p.name,dob:p.dob||"",genero:p.genero||"",phone:(p.phone||"").replace(/\D/g,""),email:p.email||"",cpf:p.cpf||"",rg:p.rg||"",blood:p.blood||"",allergy:p.allergy||"",insurance:p.insurance||"",notes:p.notes||"",folder:(p.folder&&String(p.folder).trim())?String(p.folder).trim():"",rx:p.rx||"",nf:"",obs:"",anamnese:{hypertension:false,diabetes:false,heartDisease:false,bleeding:false,allergicMeds:"",otherConditions:"",medications:"",pregnant:false,smoking:false,notes:""}});
      existNames[norm(p.name)]=true;if(c)existCpf[c]=true;nextId++;
    });
    if(add.length)setPats(function(prev){return prev.concat(add);});
    setDone({imported:add.length,skipped:skipped});
    setStep(4);
  }
  function reset(){setStep(1);setFileName("");setHeaders([]);setRows([]);setMapping({});setErr("");setDone(null);}
  function downloadModel(){
    var h=["Nome","Telefone","Data de nascimento","Genero","Email","CPF","RG","Convenio","Tipo sanguineo","Alergias","Observacoes"];
    var s=["Maria Silva","(11) 91234-5678","15/03/1985","F","maria@email.com","123.456.789-00","","Unimed","O+","Penicilina","Paciente exemplo"];
    var csv=h.join(";")+"\n"+s.join(";")+"\n";
    var blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"});
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");a.href=url;a.download="modelo_pacientes.csv";document.body.appendChild(a);a.click();setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},120);
  }

  var card={background:G.card,borderRadius:13,padding:"16px 18px",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"};
  var btnPrimary={background:G.primary,color:"#fff",border:"2px solid "+G.primary,borderRadius:9,padding:"10px 20px",fontSize:14,fontWeight:700,cursor:"pointer"};
  var btnGhost={background:"transparent",color:G.primary,border:"1.5px solid "+G.primary,borderRadius:9,padding:"9px 18px",fontSize:14,fontWeight:600,cursor:"pointer"};
  var mapped=step>=3?buildMapped():[];
  var validRows=mapped.filter(function(p){return p.name;});
  var noName=mapped.length-validRows.length;

  return <div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">
    <h2 style={{fontFamily:"'Cormorant Garamond'",fontSize:26,margin:0}}>Importar Pacientes</h2>
    <div style={{display:"flex",gap:4,flexWrap:"wrap",fontSize:11.5}}>
      {[[1,"Enviar"],[2,"Mapear"],[3,"Revisar"],[4,"Concluir"]].map(function(s,i){return <span key={s[0]} style={{fontWeight:step===s[0]?700:400,color:step>=s[0]?G.primary:G.muted}}>{(i>0?"  >  ":"")+s[0]+". "+s[1]}</span>;})}
    </div>

    {step===1&&<div style={{display:"flex",flexDirection:"column",gap:14,maxWidth:620}}>
      <div style={{background:G.accent,borderRadius:10,padding:"11px 14px",fontSize:12.5,color:G.primary,lineHeight:1.5}}>
        Migre os pacientes do seu sistema antigo. No outro programa, exporte a lista de pacientes em <b>CSV</b> (formato mais garantido) ou <b>Excel</b> e envie o arquivo aqui. O sistema identifica as colunas automaticamente.
      </div>
      <label style={{border:"2px dashed "+G.accentDark,borderRadius:14,padding:"28px 18px",textAlign:"center",cursor:"pointer",background:"var(--surface)",display:"block"}}>
        <input type="file" accept=".csv,.txt,.xlsx,.xls,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/excel" style={{display:"none"}} onChange={function(e){var fl=e.target.files&&e.target.files[0];onFile(fl);e.target.value="";}}/>
        <div style={{fontSize:34,marginBottom:6}}>{"\uD83D\uDCC2"}</div>
        <div style={{fontWeight:700,color:G.primary,fontSize:15}}>{loading?"Lendo arquivo...":"Toque para escolher o arquivo"}</div>
        <div style={{fontSize:12,color:G.muted,marginTop:4}}>CSV ou Excel (.xlsx)</div>
        {fileName&&<div style={{fontSize:12,color:G.muted,marginTop:8}}>{"Selecionado: "+fileName}</div>}
      </label>
      {err&&<div style={{background:"var(--red-soft)",border:"1px solid "+G.red,color:G.red,borderRadius:8,padding:"9px 12px",fontSize:12.5}}>{err}</div>}
      <div style={{display:"flex",alignItems:"center",gap:10,fontSize:12,color:G.muted,flexWrap:"wrap"}}>
        <span>Nao sabe o formato?</span>
        <button onClick={downloadModel} style={{border:"1.5px solid "+G.primary,background:"transparent",color:G.primary,borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Baixar modelo CSV</button>
      </div>
      <div style={{fontSize:11.5,color:G.muted,lineHeight:1.55,background:G.bg,borderRadius:8,padding:"9px 12px"}}><b style={{color:G.text}}>Colunas reconhecidas:</b> Nome (obrigatorio), Telefone/Celular, Data de nascimento, Sexo (M/F), E-mail, CPF, RG, Convenio, Tipo sanguineo, Alergias, Observacoes. Podem estar em qualquer ordem e com nomes parecidos — o sistema identifica sozinho.</div>
    </div>}

    {step===2&&<div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:620}}>
      <div style={{fontSize:13,color:G.muted}}>{"Arquivo lido: "+rows.length+" registro(s). Escolha de qual coluna vem cada informacao. Deixe como ignorar o que seu arquivo nao tiver."}</div>
      <div style={card}>
        {FIELDS.map(function(f){return <div key={f.k} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid "+G.border}}>
          <div style={{flex:"0 0 42%",fontSize:13,fontWeight:f.req?700:600,color:f.req?G.primary:G.text}}>{f.label}{f.req?" *":""}</div>
          <select value={mapping[f.k]==null?"":mapping[f.k]} onChange={function(e){var v=e.target.value;setMapping(function(m){var n=Object.assign({},m);n[f.k]=v;return n;});}} style={{flex:1,minWidth:0,border:"1.5px solid "+G.border,borderRadius:8,padding:"7px 9px",fontSize:13,background:"var(--surface)",color:G.text,outline:"none"}}>
            <option value="">— ignorar —</option>
            {headers.map(function(h,idx){return <option key={idx} value={String(idx)}>{h||("Coluna "+(idx+1))}</option>;})}
          </select>
        </div>;})}
      </div>
      {err&&<div style={{color:G.red,fontSize:12.5}}>{err}</div>}
      <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
        <button onClick={reset} style={btnGhost}>Voltar</button>
        <button onClick={function(){if(mapping.name===""||mapping.name==null){setErr("Selecione a coluna do Nome para continuar.");return;}setErr("");setStep(3);}} style={btnPrimary}>Continuar</button>
      </div>
    </div>}

    {step===3&&<div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:680}}>
      <div style={{background:G.accent,borderRadius:10,padding:"10px 13px",fontSize:13,color:G.primary}}>
        <b>{validRows.length}</b> paciente(s) prontos para importar.{noName>0?" "+noName+" linha(s) sem nome serao ignoradas.":""}
      </div>
      <div style={{background:G.card,borderRadius:13,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:G.bg}}>
            {["Nome","Telefone","Nascimento","Convenio"].map(function(h){return <th key={h} style={{textAlign:"left",padding:"8px 10px",color:G.muted,fontWeight:700,whiteSpace:"nowrap"}}>{h}</th>;})}
          </tr></thead>
          <tbody>
            {validRows.slice(0,8).map(function(p,i){return <tr key={i} style={{borderTop:"1px solid "+G.border}}>
              <td style={{padding:"7px 10px",fontWeight:600}}>{p.name}</td>
              <td style={{padding:"7px 10px"}}>{p.phone||"—"}</td>
              <td style={{padding:"7px 10px"}}>{p.dob||"—"}</td>
              <td style={{padding:"7px 10px"}}>{p.insurance||"—"}</td>
            </tr>;})}
          </tbody>
        </table>
      </div>
      {validRows.length>8&&<div style={{fontSize:11.5,color:G.muted}}>{"... e mais "+(validRows.length-8)+" paciente(s)."}</div>}
      <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:G.text,cursor:"pointer"}}>
        <input type="checkbox" checked={skipDup} onChange={function(e){setSkipDup(e.target.checked);}}/>
        Nao importar pacientes que ja existem (mesmo nome ou CPF)
      </label>
      <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
        <button onClick={function(){setStep(2);}} style={btnGhost}>Voltar</button>
        <button onClick={doImport} disabled={validRows.length===0} style={{background:validRows.length===0?G.muted:G.success,color:"#fff",border:"none",borderRadius:9,padding:"10px 20px",fontSize:14,fontWeight:700,cursor:validRows.length===0?"not-allowed":"pointer"}}>{"Importar "+validRows.length+" paciente(s)"}</button>
      </div>
    </div>}

    {step===4&&done&&<div style={{display:"flex",flexDirection:"column",gap:14,maxWidth:560,alignItems:"center",textAlign:"center",padding:"14px 0"}}>
      <div style={{fontSize:46}}>{"\u2705"}</div>
      <div style={{fontFamily:"'Cormorant Garamond'",fontSize:24,color:G.primary}}>Importacao concluida!</div>
      <div style={{fontSize:14,color:G.text}}><b>{done.imported}</b> paciente(s) adicionados ao sistema.{done.skipped>0?" "+done.skipped+" ja existiam e foram ignorados.":""}</div>
      <div style={{fontSize:12.5,color:G.muted}}>Eles ja aparecem na aba <b>Pacientes</b>.</div>
      <button onClick={reset} style={btnPrimary}>Importar outro arquivo</button>
    </div>}
  </div>;
}


function ConfigAcesso({acessoCfg,setAcessoCfg}){
  var C=acessoCfg||{};
  function up(patch){setAcessoCfg(function(prev){return Object.assign({},prev,patch,{_ts:Date.now()});});} // V239: carimbo p/ vencer a edicao mais recente
  var restr=C.restringir!==false;
  var domOn=!!C.domOn;
  var card={background:G.card,borderRadius:14,padding:"16px 18px",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",border:"1px solid "+G.border,marginBottom:16};
  var lbl={fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:6};
  var tinp={width:"100%"};
  var togBase={display:"flex",gap:10,alignItems:"center",fontSize:14,fontWeight:600,cursor:"pointer",padding:"11px 13px",borderRadius:12,background:"var(--surface)",boxShadow:"inset 3px 3px 7px var(--nm-dark),inset -3px -3px 7px var(--nm-light)"};
  var dayname={fontSize:13,fontWeight:800,color:G.text,marginBottom:9};
  var rowS={display:"flex",gap:12,alignItems:"flex-end",marginBottom:15,opacity:restr?1:.4,pointerEvents:restr?"auto":"none"};
  var dash={alignSelf:"center",color:G.muted,fontWeight:800,paddingBottom:2};
  return <div style={card}>
    <div style={{fontFamily:"'Cormorant Garamond'",fontSize:24,fontWeight:700,color:G.primary,marginBottom:4}}>Acesso da Recepção</div>
    <div style={{fontSize:12.5,color:G.muted,marginBottom:16,lineHeight:1.5}}>Define <b>em quais horários a Recepção/Secretária consegue entrar</b> no sistema. Você (admin) e os dentistas nunca são bloqueados. Salva sozinho e vale em todos os aparelhos.</div>
    <label style={Object.assign({marginBottom:14},togBase)}>
      <input type="checkbox" checked={restr} onChange={function(e){up({restringir:e.target.checked});}} style={{width:17,height:17,accentColor:G.primary}}/>
      <span>Restringir horário de acesso<br/><small style={{fontWeight:500,fontSize:11.5,color:G.muted}}>Se desligar, a Recepção acessa a qualquer hora, todo dia.</small></span>
    </label>
    <div>
      <div style={dayname}>Segunda a Sexta</div>
      <div style={rowS}>
        <div style={{flex:1,minWidth:0}}><label style={lbl}>Abre às</label><input type="time" value={C.segIni||"07:00"} onChange={function(e){up({segIni:e.target.value});}} style={tinp}/></div>
        <div style={dash}>&ndash;</div>
        <div style={{flex:1,minWidth:0}}><label style={lbl}>Fecha às</label><input type="time" value={C.segFim||"21:00"} onChange={function(e){up({segFim:e.target.value});}} style={tinp}/></div>
      </div>
      <div style={dayname}>Sábado</div>
      <div style={rowS}>
        <div style={{flex:1,minWidth:0}}><label style={lbl}>Abre às</label><input type="time" value={C.sabIni||"07:00"} onChange={function(e){up({sabIni:e.target.value});}} style={tinp}/></div>
        <div style={dash}>&ndash;</div>
        <div style={{flex:1,minWidth:0}}><label style={lbl}>Fecha às</label><input type="time" value={C.sabFim||"13:00"} onChange={function(e){up({sabFim:e.target.value});}} style={tinp}/></div>
      </div>
      <div style={{height:1,background:G.border,margin:"6px 0 14px"}}></div>
      <label style={Object.assign({marginBottom:14,opacity:restr?1:.4,pointerEvents:restr?"auto":"none"},togBase)}>
        <input type="checkbox" checked={domOn} onChange={function(e){up({domOn:e.target.checked});}} style={{width:17,height:17,accentColor:G.primary}}/>
        <span>Liberar aos Domingos<br/><small style={{fontWeight:500,fontSize:11.5,color:G.muted}}>Fica fechado por padrão. Ligue se precisar abrir.</small></span>
      </label>
      <div style={{display:"flex",gap:12,alignItems:"flex-end",marginBottom:8,opacity:(restr&&domOn)?1:.4,pointerEvents:(restr&&domOn)?"auto":"none"}}>
        <div style={{flex:1,minWidth:0}}><label style={lbl}>Abre às</label><input type="time" value={C.domIni||"08:00"} onChange={function(e){up({domIni:e.target.value});}} style={tinp}/></div>
        <div style={dash}>&ndash;</div>
        <div style={{flex:1,minWidth:0}}><label style={lbl}>Fecha às</label><input type="time" value={C.domFim||"12:00"} onChange={function(e){up({domFim:e.target.value});}} style={tinp}/></div>
      </div>
    </div>
    <div style={{display:"flex",gap:9,fontSize:12,color:G.muted,lineHeight:1.5,background:"var(--green-soft)",borderRadius:10,padding:"11px 13px",marginTop:8}}>
      <span>🛡️</span><span>Bloqueia apenas o <b>login da Recepção</b>. Seu acesso de administrador continua liberado 24h.</span>
    </div>
  </div>;
}
function Admin({users,setUsers,procs,setProcs,dents,setDents,labs,setLabs,perms,setPerms,logs,setLogs,user,pats,setPats,appts,setAppts,recs,setRecs,treats,setTreats,budgets,setBudgets,pros,setPros,rems,setRems,stock,setStock,expenses,setExpenses,impl,setImpl,waAuto,setWaAuto,waAutoLog,acessoCfg,setAcessoCfg}){
const [tab,setTab]=useState("users");const [lfUser,setLfUser]=useState("all");const [lfPat,setLfPat]=useState("");const [lfData,setLfData]=useState("");const [lfTipo,setLfTipo]=useState("all");
const TIPOS_LOG=["all","agenda","paciente","financeiro","estoque","protese","lembrete","remarcar","admin"];
const TIPO_L_LOG={all:"Todos",agenda:"Agenda",paciente:"Paciente",financeiro:"Financeiro",estoque:"Estoque",protese:"Protese",lembrete:"Lembrete",remarcar:"Remarcar",admin:"Admin"};
const filtered=(logs||[]).filter(function(l){
if(lfUser!=="all"&&l.user!==lfUser)return false;
if(lfPat&&!(l.patName||"").toLowerCase().includes(lfPat.toLowerCase())&&!l.desc.toLowerCase().includes(lfPat.toLowerCase()))return false;
if(lfData&&!l.ts.startsWith(lfData))return false;
if(lfTipo!=="all"&&l.tipo!==lfTipo)return false;
return true;
});
const uniqueUsers=[...new Set((logs||[]).map(function(l){return l.user;}))];
const [um,setUm]=useState(false);const [pm,setPm]=useState(false);const [lm,setLm]=useState(false);const [dm,setDm]=useState(false);
const [bkpDone,setBkpDone]=useState(false);
const [restoreDone,setRestoreDone]=useState("");
const [eu,setEu]=useState(null);const [ep,setEp]=useState(null);const [el,setEl]=useState(null);const [ed,setEd]=useState(null);
const b0={name:"",role:"Recepcionista",level:2,login:"",pass:"",dentistId:"",color:UCOLS[0],active:true,criaDentista:false};
const bp={name:"",price:0};const bl={name:"",contact:"",phone:""};
const bd={name:"",specialty:"Clinico Geral",commission:40,cro:"",color:UCOLS[0],dias:[1,2,3,4,5],entrada:"08:00",saida:"18:00",almoco:{ini:"12:00",fim:"13:00"}};
const [uf,setUf]=useState(b0);const [pf,setPf]=useState(bp);const [lf,setLf]=useState(bl);const [df,setDf]=useState(bd);
const fu=k=>v=>setUf(p=>({...p,[k]:v}));const fp=k=>v=>setPf(p=>({...p,[k]:v}));const fl=k=>v=>setLf(p=>({...p,[k]:v}));
const upDf=k=>v=>setDf(p=>({...p,[k]:v}));
if(user.level<3)return <div style={{background:G.card,borderRadius:13,padding:30,textAlign:"center",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}><p style={{color:G.red,fontSize:15}}>Acesso restrito ao Administrador</p></div>;
const saveU=()=>{
if(!uf.name||!uf.login)return alert("Preencha nome e login");
let dentId=uf.dentistId?Number(uf.dentistId):null;
if(!eu&&Number(uf.level)===1&&uf.criaDentista){
const newDent={id:nid(dents),name:uf.name,color:uf.color,specialty:"Clinico Geral",commission:40,cro:"",dias:[1,2,3,4,5],entrada:"08:00",saida:"18:00",almoco:{ini:"12:00",fim:"13:00"}};
setDents(prev=>[...prev,newDent]);
dentId=newDent.id;
}
const obj={...uf,dentistId:dentId,id:eu?eu.id:nid(users),criaDentista:undefined,_ts:Date.now()}; // V239: carimbo p/ merge item-a-item
const passMudou=!!uf.pass&&(!eu||String(uf.pass)!==String(eu.pass||"")); // V209
if(passMudou){__syncCred(uf.login,uf.pass).then(function(r){if(r.ok)alert("✅ Senha de login de \""+String(uf.login).trim().toLowerCase()+"\" atualizada com sucesso."+(r.created?" (credencial criada)":""));else alert("⚠️ Usuário salvo, mas a senha de LOGIN não foi sincronizada: "+(r.msg||"erro desconhecido")+"\n\nAbra o usuário e salve novamente.");});} // V209
setUsers(prev=>eu?prev.map(u=>u.id===eu.id?obj:u):[...prev,obj]);
setUm(false);
};
const removeUser=(u)=>{
if(u.dentistId){
const dn=dents.find(d=>d.id===u.dentistId);
if(window.confirm("Remover tambem o dentista "+(dn?dn.name:"")+" da agenda?")){
setDents(prev=>prev.filter(d=>d.id!==u.dentistId));
}
}
setUsers(prev=>prev.filter(x=>x.id!==u.id));
};
const saveP=()=>{if(!pf.name)return;const obj={...pf,price:Number(pf.price),id:ep?ep.id:nid(procs)};setProcs(prev=>ep?prev.map(p=>p.id===ep.id?obj:p):[...prev,obj]);setPm(false);};
const saveL=()=>{if(!lf.name)return alert("Informe o nome do laboratorio");const obj={...lf,id:el?el.id:nid(labs)};setLabs(prev=>el?prev.map(l=>l.id===el.id?obj:l):[...prev,obj]);setLm(false);};
const SPECIALTIES=["Clinico Geral","Ortodontia","Implantodontia","Endodontia","Periodontia","Cirurgia","Odontopediatria","Protese","Dentistica","Radiologia","Outro"];
return <div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">

<h2 style={{fontFamily:"'Cormorant Garamond'",fontSize:26}}>Administrativo</h2>
<div style={{display:"flex",gap:0,borderBottom:"2px solid "+G.border,overflowX:"auto"}}>
{[["users","Usuarios"],["import","Importar Dados"],["dents","Dentistas"],["procs","Procedimentos"],["labs","Laboratorios"],["agenda","Horarios"],["access","Acessos"],["wa","🤖 WhatsApp"],["log","Log"],["backup","Backup"]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={{border:"none",background:"none",padding:"9px 13px",fontFamily:"'Manrope'",fontWeight:700,fontSize:12,cursor:"pointer",color:tab===k?G.primary:G.muted,borderBottom:"3px solid "+(tab===k?G.primary:"transparent"),marginBottom:-2,whiteSpace:"nowrap"}}>{l}</button>)}
</div>
{tab==="import"&&<ImportWizard pats={pats} setPats={setPats}/>}
{tab==="users"&&<div style={{display:"flex",flexDirection:"column",gap:9}}>
<div style={{background:G.accent,borderRadius:10,padding:"9px 12px",fontSize:12,color:G.primary}}>
Para adicionar dentista use a aba <strong>Dentistas</strong>. Aqui crie apenas credenciais de acesso.
</div>
<div style={{textAlign:"right"}}><Btn ch="+ Novo Usuario" sm onClick={()=>{setEu(null);setUf(b0);setUm(true);}}/></div>
{users.map(u=>{
const linkedDent=u.dentistId?dents.find(d=>d.id===u.dentistId):null;
return <div key={u.id} style={{background:G.card,borderRadius:11,padding:"11px 14px",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",display:"flex",alignItems:"center",gap:11,borderLeft:"4px solid "+u.color}}>
<div style={{width:34,height:34,borderRadius:"50%",background:u.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:13,flexShrink:0}}>{u.name[0]}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontWeight:700,fontSize:13}}>{u.name}</div>
<div style={{fontSize:11,color:G.muted}}>{u.role} - {u.login} - Nivel {["","Basico","Intermediario","Total"][u.level]}</div>
{linkedDent&&<div style={{fontSize:10,color:linkedDent.color,fontWeight:700,marginTop:2}}>Dentista: {linkedDent.name}</div>}
</div>
<Bdg l={u.active?"Ativo":"Inativo"} col={u.active?G.success:G.red} sm/>
<Btn ch="Editar" v="g" sm onClick={()=>{setEu(u);setUf({...u,dentistId:String(u.dentistId||""),criaDentista:false});setUm(true);}}/>
<Btn ch="X" v="r" sm onClick={()=>removeUser(u)}/>
</div>;
})}
</div>}
{tab==="dents"&&<div style={{display:"flex",flexDirection:"column",gap:9}}>
<div style={{background:G.accent,borderRadius:10,padding:"9px 12px",fontSize:12,color:G.primary}}>
Cada dentista adicionado aqui aparece na <strong>agenda</strong> e nos <strong>horarios</strong>. Para acesso ao sistema crie um usuario e vincule.
</div>
<div style={{textAlign:"right"}}><Btn ch="+ Novo Dentista" sm onClick={()=>{setEd(null);setDf(bd);setDm(true);}}/></div>
{dents.length===0&&<div style={{background:G.bg,borderRadius:10,padding:20,textAlign:"center",color:G.muted,fontSize:13}}>Nenhum dentista cadastrado</div>}
{dents.map(d=>{
const linkedUser=users.find(u=>u.dentistId===d.id);
return <div key={d.id} style={{background:G.card,borderRadius:12,padding:"12px 14px",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",borderLeft:"4px solid "+d.color}}>
<div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
<div style={{width:36,height:36,borderRadius:"50%",background:d.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:14,flexShrink:0}}>{d.name[0]}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontWeight:700,fontSize:13}}>{d.name}</div>
<div style={{fontSize:11,color:G.muted}}>{d.specialty||"Clinico Geral"}{d.cro?" - CRO: "+d.cro:""} - Comissao: {d.commission||40}%</div>
<div style={{fontSize:10,color:G.muted,marginTop:1}}>Dias: {(d.dias||[]).map(i=>["Dom","Seg","Ter","Qua","Qui","Sex","Sab"][i]).join(", ")} - {d.entrada||"08:00"} as {d.saida||"18:00"}</div>
{linkedUser?<div style={{fontSize:10,color:G.success,fontWeight:700,marginTop:2}}>Login: {linkedUser.login}</div>:<div style={{fontSize:10,color:G.orange,fontWeight:700,marginTop:2}}>Sem credencial - crie um usuario e vincule</div>}
</div>
<div style={{display:"flex",gap:5}}>
<Btn ch="Editar" v="g" sm onClick={()=>{setEd(d);setDf({...d,commission:d.commission||40});setDm(true);}}/>
<Btn ch="X" v="r" sm onClick={()=>{
setDents(prev=>prev.filter(x=>x.id!==d.id));
const lu=users.find(u=>u.dentistId===d.id);
if(lu)setUsers(prev=>prev.map(u=>u.dentistId===d.id?{...u,dentistId:null}:u));
}}/>
</div>
</div>
</div>;
})}
</div>}
{tab==="procs"&&<div style={{display:"flex",flexDirection:"column",gap:9}}>
<div style={{textAlign:"right"}}><Btn ch="+ Novo" sm onClick={()=>{setEp(null);setPf(bp);setPm(true);}}/></div>
{procs.map(p=><div key={p.id} style={{background:G.card,borderRadius:10,padding:"9px 14px",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",display:"flex",alignItems:"center",gap:11}}>
<span style={{flex:1,fontWeight:700,fontSize:13}}>{p.name}</span><span style={{fontWeight:700,color:G.primary}}>{cur(p.price)}</span>
<Btn ch="Editar" v="g" sm onClick={()=>{setEp(p);setPf({...p});setPm(true);}}/><Btn ch="✕" v="r" sm onClick={()=>{if(window.confirm("Remover?"))setProcs(prev=>prev.filter(x=>x.id!==p.id));}}/>
</div>)}
</div>}
{tab==="labs"&&<div style={{display:"flex",flexDirection:"column",gap:9}}>
<div style={{textAlign:"right"}}><Btn ch="+ Novo Laboratório" sm onClick={()=>{setEl(null);setLf(bl);setLm(true);}}/></div>
{labs.map(l=><div key={l.id} style={{background:G.card,borderRadius:10,padding:"11px 14px",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",display:"flex",alignItems:"center",gap:11}}>
<div style={{flex:1}}>
<div style={{fontWeight:700,fontSize:13}}>{l.name}</div>
<div style={{fontSize:12,color:G.muted}}>{l.contact}{l.phone?` · ${l.phone}`:""}</div>
</div>
<Btn ch="Editar" v="g" sm onClick={()=>{setEl(l);setLf({...l});setLm(true);}}/>
<Btn ch="✕" v="r" sm onClick={()=>{if(window.confirm("Remover laboratório?"))setLabs(prev=>prev.filter(x=>x.id!==l.id));}}/>
</div>)}
{labs.length===0&&<div style={{background:G.bg,borderRadius:10,padding:20,textAlign:"center",color:G.muted,fontSize:13}}>Nenhum laboratório cadastrado</div>}
</div>}
{tab==="agenda"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
<div style={{background:G.accent,borderRadius:12,padding:"12px 14px",fontSize:13,color:G.primary}}>
Configure os dias de trabalho e horario de almoco de cada dentista.
</div>
{dents.map(function(d){
var dias=d.dias||[1,2,3,4,5];
var alIni=(d.almoco&&d.almoco.ini)||"12:00";
var alFim=(d.almoco&&d.almoco.fim)||"13:00";
var upDent=function(patch){setDents(function(prev){return prev.map(function(x){return x.id===d.id?Object.assign({},x,patch):x;});});};
var togDia=function(dia){var nd=dias.indexOf(dia)>=0?dias.filter(function(x){return x!==dia;}):[...dias,dia].sort();upDent({dias:nd});};
return(
<div key={d.id} style={{background:G.card,borderRadius:14,padding:"14px 16px",boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
<div style={{width:10,height:10,borderRadius:"50%",background:d.color,flexShrink:0}}/>
<span style={{fontWeight:700,fontSize:15}}>{d.name}</span>
</div>
<div style={{marginBottom:12}}>
<div style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>Dias de trabalho</div>
<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
{["Dom","Seg","Ter","Qua","Qui","Sex","Sab"].map(function(nm,i){
var ativo=dias.indexOf(i)>=0;
return(
<button key={i} onClick={function(){togDia(i);}}
style={{border:"2px solid "+(ativo?d.color:G.border),background:ativo?d.color:"var(--card)",color:ativo?"#fff":G.muted,borderRadius:8,padding:"5px 10px",fontSize:12,fontWeight:700,cursor:"pointer",minWidth:38}}>
{nm}
</button>
);
})}
</div>
</div>
{(function(){
var HORAS=["06:00","06:30","07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30","22:00","22:30"];
var selStyle={border:"1.5px solid "+G.border,borderRadius:8,padding:"8px 10px",fontSize:13,outline:"none",width:"100%",background:"var(--surface)"};
return <div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
<div>
<div style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>Entrada</div>
<select value={d.entrada||"08:00"} onChange={function(e){upDent({entrada:e.target.value});}} style={selStyle}>
{HORAS.map(function(h){return <option key={h} value={h}>{h}</option>;})}
</select>
</div>
<div>
<div style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>Saida</div>
<select value={d.saida||"18:00"} onChange={function(e){upDent({saida:e.target.value});}} style={selStyle}>
{HORAS.map(function(h){return <option key={h} value={h}>{h}</option>;})}
</select>
</div>
</div>
<div style={{marginBottom:6}}>
<div style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>Horario de almoco</div>
<div style={{display:"flex",alignItems:"center",gap:8}}>
<select value={alIni} onChange={function(e){var al=Object.assign({},d.almoco||{});al.ini=e.target.value;upDent({almoco:al});}} style={{...selStyle,flex:1}}>
{HORAS.map(function(h){return <option key={h} value={h}>{h}</option>;})}
</select>
<span style={{color:G.muted,fontSize:13}}>ate</span>
<select value={alFim} onChange={function(e){var al=Object.assign({},d.almoco||{});al.fim=e.target.value;upDent({almoco:al});}} style={{...selStyle,flex:1}}>
{HORAS.map(function(h){return <option key={h} value={h}>{h}</option>;})}
</select>
</div>
</div>
</div>;
})()}
</div>
);
})}
</div>}
{tab==="access"&&<div style={{display:"flex",flexDirection:"column",gap:14}}><ConfigAcesso acessoCfg={acessoCfg} setAcessoCfg={setAcessoCfg}/>
<div style={{background:G.accent,borderRadius:12,padding:"10px 14px",fontSize:12,color:G.primary}}>
{"Defina as permissões de cada nível. Itens em cinza são fixos do sistema."}
</div>
{[1,2,3].map(function(lvl){
var pm=perms[lvl];
return(
<div key={lvl} style={{background:G.card,borderRadius:14,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
<div style={{background:pm.color,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
<span style={{fontWeight:700,color:"#fff",fontSize:15}}>{pm.label}</span>
<span style={{background:"rgba(255,255,255,.2)",color:"#fff",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>{"Nível "+lvl}</span>
</div>
<div style={{padding:"10px 16px",display:"flex",flexDirection:"column",gap:6}}>
{pm.items.map(function(item){
return(
<div key={item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid "+G.border}}>
<div style={{width:22,height:22,borderRadius:6,border:"2px solid "+(item.val?pm.color:G.border),background:item.val?pm.color:"var(--card)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:item.fixed?"not-allowed":"pointer",opacity:item.fixed?.6:1}}
onClick={function(){
if(item.fixed)return;
setPerms(function(prev){
var novo={...prev};
novo[lvl]={...novo[lvl],items:novo[lvl].items.map(function(x){return x.id===item.id?{...x,val:!x.val}:x;})};
return novo;
});
}}>
{item.val&&<span style={{color:"#fff",fontSize:14,lineHeight:1}}>{"✓"}</span>}
</div>
<span style={{fontSize:13,color:item.val?G.text:G.muted,flex:1}}>{item.label}</span>
{item.fixed&&<span style={{fontSize:9,color:G.muted,background:G.bg,borderRadius:4,padding:"1px 5px"}}>FIXO</span>}
</div>
);
})}
</div>
</div>
);
})}
</div>}

{tab==="wa"&&<WaAutoTab waAuto={waAuto} setWaAuto={setWaAuto} waAutoLog={waAutoLog}/>}

{tab==="log"&&

<div style={{display:"flex",flexDirection:"column",gap:12}}>
<div style={{background:G.accent,borderRadius:12,padding:"10px 14px",fontSize:12,color:G.primary}}>
{"📋 "+filtered.length+" registro(s) encontrado(s)"}
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
<div>
<label style={{fontSize:10,fontWeight:700,color:G.muted,textTransform:"uppercase",display:"block",marginBottom:4}}>Funcionário</label>
<select value={lfUser} onChange={function(e){setLfUser(e.target.value);}} style={{width:"100%",border:"1.5px solid "+G.border,borderRadius:8,padding:"7px 10px",fontSize:12,outline:"none",background:"var(--surface)"}}>
<option value="all">Todos</option>
{uniqueUsers.map(function(u){return <option key={u} value={u}>{u}</option>;})}
</select>
</div>
<div>
<label style={{fontSize:10,fontWeight:700,color:G.muted,textTransform:"uppercase",display:"block",marginBottom:4}}>Data</label>
<input type="date" value={lfData} onChange={function(e){setLfData(e.target.value);}} style={{width:"100%",border:"1.5px solid "+G.border,borderRadius:8,padding:"7px 10px",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
</div>
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
<div>
<label style={{fontSize:10,fontWeight:700,color:G.muted,textTransform:"uppercase",display:"block",marginBottom:4}}>Paciente</label>
<input value={lfPat} onChange={function(e){setLfPat(e.target.value);}} placeholder="Nome do paciente..." style={{width:"100%",border:"1.5px solid "+G.border,borderRadius:8,padding:"7px 10px",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
</div>
<div>
<label style={{fontSize:10,fontWeight:700,color:G.muted,textTransform:"uppercase",display:"block",marginBottom:4}}>Tipo</label>
<select value={lfTipo} onChange={function(e){setLfTipo(e.target.value);}} style={{width:"100%",border:"1.5px solid "+G.border,borderRadius:8,padding:"7px 10px",fontSize:12,outline:"none",background:"var(--surface)"}}>
{TIPOS_LOG.map(function(t){return <option key={t} value={t}>{TIPO_L_LOG[t]}</option>;})}
</select>
</div>
</div>
{(lfUser!=="all"||lfPat||lfData||lfTipo!=="all")&&<button onClick={function(){setLfUser("all");setLfPat("");setLfData("");setLfTipo("all");}} style={{background:"none",border:"1.5px solid "+G.border,borderRadius:8,padding:"6px",fontSize:12,cursor:"pointer",color:G.muted}}>{"✕ Limpar filtros"}</button>}
<div style={{display:"flex",flexDirection:"column",gap:6}}>
{filtered.length===0&&<div style={{textAlign:"center",padding:30,color:G.muted,fontSize:13,background:G.card,borderRadius:12}}>{"Nenhum registro encontrado"}</div>}
{filtered.map(function(l){
var dt=new Date(l.ts);
var dataStr=dt.toLocaleDateString("pt-BR");
var horaStr=dt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
var TIPO_COR={agenda:"#2196F3",paciente:"#27AE60",financeiro:"#FF9800",estoque:"#9C27B0",protese:"#F44336",lembrete:"#00BCD4",remarcar:"#795548",admin:"#607D8B"};
var cor=TIPO_COR[l.tipo]||G.muted;
return(
<div key={l.id} style={{background:G.card,borderRadius:10,padding:"10px 12px",borderLeft:"3px solid "+cor,boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
<div style={{flex:1}}>
<div style={{fontSize:13,color:G.text}}>{l.desc}</div>
{l.patName&&<div style={{fontSize:11,color:G.muted,marginTop:2}}>{"👤 "+l.patName}</div>}
</div>
<div style={{textAlign:"right",flexShrink:0}}>
<div style={{fontSize:10,background:cor+"20",color:cor,borderRadius:6,padding:"1px 6px",fontWeight:700,marginBottom:2}}>{TIPO_L_LOG[l.tipo]||l.tipo}</div>
<div style={{fontSize:10,color:G.muted,fontWeight:600}}>{l.user}</div>
<div style={{fontSize:10,color:G.muted}}>{dataStr+" "+horaStr}</div>
</div>
</div>
</div>
);
})}
</div>
</div>

}

{tab==="backup"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
  <div style={{background:G.accent,borderRadius:12,padding:"12px 16px",fontSize:13,color:G.primary,lineHeight:1.6}}>
    <strong>💾 Backup Manual</strong><br/>
    Baixa um arquivo <code>{"backup-affonso-YYYY-MM-DD.json"}</code> com todos os dados da clínica. Guarde em local seguro como proteção extra.
  </div>
  <div style={{display:"flex",flexDirection:"column",gap:10}}>
    <button onClick={async function(){
      var full=null,patsDB=null;
      for(var _t=0;_t<4&&!full;_t++){full=await supabase.loadFull();if(!full)await new Promise(function(r){setTimeout(r,900);});}
      if(!full||!full.data||!Object.keys(full.data).length){alert("Nao consegui ler o banco agora (verifique a internet). Tente de novo em alguns segundos - o backup so e gerado quando le tudo do servidor.");return;}
      for(var _p=0;_p<4&&!patsDB;_p++){patsDB=await supabase.loadPatients();if(!patsDB)await new Promise(function(r){setTimeout(r,900);});}
      var patsFinal=(patsDB&&patsDB.length)?patsDB:pats;
      var bkp=Object.assign({},full.data,{version:"V154",exportDate:new Date().toISOString(),pats:patsFinal});
      var json=JSON.stringify(bkp,null,2);
      try{
        var blob=new Blob([json],{type:"application/json"});
        var url=URL.createObjectURL(blob);
        var a=document.createElement("a");
        a.href=url;a.download="backup-affonso-"+new Date().toISOString().slice(0,10)+".json";
        document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
      }catch(e){
        if(navigator.clipboard){navigator.clipboard.writeText(json);}
        else{var w=window.open("","_blank");if(w){w.document.write("<pre>"+json+"</pre>");w.document.close();}}
      }
      setBkpDone((bkp.pats||[]).length);
    }} style={{background:G.primary,color:"#fff",border:"none",borderRadius:12,padding:"16px",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
      {"⬇️ Baixar Backup JSON"}
    </button>
    {bkpDone!==false&&<div style={{background:"var(--green-soft)",border:"1.5px solid #A5D6A7",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#2E7D32",textAlign:"center"}}>{"✅ Backup gerado com "+bkpDone+" paciente(s)! Arquivo salvo na pasta Downloads."}</div>}
  </div>

  <div style={{background:"var(--surface)",border:"1.5px solid "+G.border,borderRadius:12,padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
    <div style={{fontWeight:700,fontSize:14,color:G.primary}}>{"📂 Restaurar Backup"}</div>
    <div style={{fontSize:12,color:G.muted,lineHeight:1.6}}>
      {"Selecione um arquivo .json de backup para restaurar todos os dados. "}
      <strong style={{color:G.red}}>{"⚠️ Atenção: substituirá todos os dados atuais."}</strong>
    </div>
    <input type="file" accept=".json" id="restore-input" style={{display:"none"}}
      onChange={function(e){
        var file=e.target.files&&e.target.files[0];
        if(!file)return;
        var reader=new FileReader();
        reader.onload=async function(ev){
          try{
            var d=JSON.parse(ev.target.result);
            if(!d.pats||!d.dents){setRestoreDone("ERRO");return;}
            if(!window.confirm("Restaurar backup? Pacientes no arquivo: "+d.pats.length+". Isso grava os dados no sistema. Continuar?"))return;
            if(d.pats)setPats(d.pats);
            if(d.appts)setAppts(d.appts);
            if(d.recs)setRecs(d.recs);
            if(d.treats)setTreats(d.treats);
            if(d.budgets)setBudgets(d.budgets);
            if(d.pros)setPros(d.pros);
            if(d.rems)setRems(d.rems);
            if(d.dents)setDents(d.dents);
            if(d.users)setUsers(d.users);
            if(d.labs)setLabs(d.labs);
            if(d.procs)setProcs(d.procs);
            if(d.stock)setStock(d.stock);
            if(d.expenses)setExpenses(d.expenses);
            if(d.impl)setImpl(d.impl);
            var blobR=Object.assign({},d);delete blobR.pats;delete blobR.version;delete blobR.exportDate;
            try{if(d.pats&&d.pats.length)await supabase.upsertPatients(d.pats);}catch(e2){}
            try{await supabase.save(blobR);}catch(e3){}
            setBkpDone(false);
            setRestoreDone((d.exportDate?d.exportDate.slice(0,10):"OK")+" — "+d.pats.length+" pac.");
          }catch(err){
            setRestoreDone("ERRO");
          }
        };
        reader.readAsText(file);
        e.target.value="";
      }}
    />
    {restoreDone&&restoreDone!=="ERRO"&&<div style={{background:"var(--green-soft)",border:"1.5px solid #A5D6A7",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#2E7D32",textAlign:"center"}}>{"✅ Restaurado ("+restoreDone+")! Atualize a pagina (Ctrl+Shift+R) para carregar tudo."}</div>}
    {restoreDone==="ERRO"&&<div style={{background:"var(--red-soft)",border:"1.5px solid #EF9A9A",borderRadius:10,padding:"10px 14px",fontSize:13,color:G.red,textAlign:"center"}}>{"❌ Arquivo inválido. Use um backup gerado por este sistema."}</div>}
    <button onClick={function(){document.getElementById("restore-input").click();}}
      style={{background:"#E65100",color:"#fff",border:"none",borderRadius:12,padding:"14px",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
      {"📂 Selecionar Arquivo de Backup"}
    </button>
  </div>

  <div style={{background:"var(--amber-soft)",border:"1.5px solid #FFD54F",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#795548"}}>
    ⏰ <strong>Recomendado:</strong> fazer backup toda sexta-feira antes de fechar o sistema.
  </div>
</div>}

<Modal open={um} close={()=>setUm(false)} title={eu?"Editar Usuário":"Novo Usuário"} wide ch={<div style={{display:"flex",flexDirection:"column",gap:11}}>
<Inp lb="Nome completo" val={uf.name} set={fu("name")}/>
<R2 a={<Inp lb="Login" val={uf.login} set={fu("login")}/>} b={<Inp lb="Senha" type="password" val={uf.pass} set={fu("pass")}/>}/>
<R2 a={<Sel lb="Função" val={uf.role} set={fu("role")} opts={["Administrador","Dentista","Recepcionista","Assistente"]}/>} b={<Sel lb="Nível" val={String(uf.level)} set={v=>fu("level")(Number(v))} opts={[{v:1,l:"1 - Básico (Dentista)"},{v:2,l:"2 - Intermediário (Recepção)"},{v:3,l:"3 - Total (Admin)"}]}/>}/>
<Sel lb="Dentista vinculado" val={String(uf.dentistId)} set={fu("dentistId")} opts={[{v:"",l:"Nenhum"},...dents.map(d=>({v:d.id,l:d.name}))]}/>

  <div><div style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",marginBottom:6}}>Cor</div>
  <div style={{display:"flex",gap:7}}>{UCOLS.map(c=><button key={c} onClick={()=>fu("color")(c)} style={{width:26,height:26,borderRadius:"50%",background:c,border:`3px solid ${uf.color===c?"var(--text)":"transparent"}`,cursor:"pointer"}}/>)}</div></div>
  <label style={{display:"flex",gap:8,alignItems:"center",fontSize:13,cursor:"pointer"}}><input type="checkbox" checked={uf.active} onChange={e=>fu("active")(e.target.checked)} style={{accentColor:G.primary}}/> Usuário ativo</label>
  {!eu&&Number(uf.level)===1&&<label style={{display:"flex",gap:8,alignItems:"center",fontSize:13,cursor:"pointer",background:uf.criaDentista?G.accent:"var(--surface-2)",borderRadius:8,padding:"9px 12px",border:"1.5px solid "+(uf.criaDentista?G.primary:G.border)}}><input type="checkbox" checked={!!uf.criaDentista} onChange={e=>fu("criaDentista")(e.target.checked)} style={{accentColor:G.primary,width:15,height:15}}/><span><strong>Criar dentista automaticamente</strong><br/><span style={{fontSize:11,color:G.muted}}>Aparecera na agenda e nos horarios</span></span></label>}
<SC2 save={saveU} cancel={()=>setUm(false)}/>
</div>}/>
<Modal open={pm} close={()=>setPm(false)} title={ep?"Editar Procedimento":"Novo Procedimento"} ch={<div style={{display:"flex",flexDirection:"column",gap:11}}>
  <Inp lb="Nome" val={pf.name} set={fp("name")}/>
  <Inp lb="Preço Padrão (R$)" val={String(pf.price)} set={fp("price")} type="number"/>
  <SC2 save={saveP} cancel={()=>setPm(false)}/>
</div>}/>
{/* Lab modal -- inline to avoid state issues */}
{lm&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
  <div style={{background:G.card,borderRadius:16,width:"100%",maxWidth:460,boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${G.border}`}}>
      <span style={{fontFamily:"'Cormorant Garamond'",fontSize:20}}>{el?"Editar Laboratório":"Novo Laboratório"}</span>
      <button onClick={()=>setLm(false)} style={{border:"none",background:"none",fontSize:24,cursor:"pointer",color:G.muted}}>×</button>
    </div>
    <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
      <Inp lb="Nome do Laboratório *" val={lf.name} set={fl("name")} ph="Ex: Lab Dental Silva"/>
      <Inp lb="Contato / Responsável" val={lf.contact} set={fl("contact")} ph="Nome do responsável"/>
      <Inp lb="Telefone / WhatsApp" val={lf.phone} set={fl("phone")} ph="11999990000"/>
      <div style={{display:"flex",gap:9,justifyContent:"flex-end",paddingTop:12,borderTop:`1px solid ${G.border}`}}>
        <button onClick={()=>setLm(false)} style={{border:`1.5px solid ${G.primary}`,background:"transparent",color:G.primary,borderRadius:8,padding:"8px 16px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
        <button onClick={saveL} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:14,fontWeight:700,cursor:"pointer"}}>💾 Salvar</button>
      </div>
    </div>
  </div>
</div>}

{dm&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
  <div style={{background:G.card,borderRadius:16,width:"100%",maxWidth:560,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid "+G.border}}>
      <span style={{fontFamily:"'Cormorant Garamond'",fontSize:20}}>{ed?"Editar Dentista":"Novo Dentista"}</span>
      <button onClick={()=>setDm(false)} style={{border:"none",background:"none",fontSize:24,cursor:"pointer",color:G.muted}}>{"x"}</button>
    </div>
    <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
      <Inp lb="Nome completo" val={df.name} set={upDf("name")} ph="Dr. Nome Sobrenome"/>
      <R2 a={<Inp lb="Especialidade" val={df.specialty} set={upDf("specialty")} ph="Clinico Geral"/>}
          b={<Inp lb="CRO" val={df.cro} set={upDf("cro")} ph="SP-00000"/>}/>
      <R2 a={<Inp lb="Comissao (%)" val={String(df.commission||40)} set={upDf("commission")} type="number" ph="40"/>}
          b={<div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Cor</label>
            <div style={{display:"flex",gap:6}}>{UCOLS.map(c=><button key={c} onClick={()=>setDf(p=>({...p,color:c}))} style={{width:26,height:26,borderRadius:"50%",background:c,border:"3px solid "+(df.color===c?"var(--text)":"transparent"),cursor:"pointer"}}/>)}</div>
          </div>}/>
      <div style={{display:"flex",gap:9,justifyContent:"flex-end",paddingTop:12,borderTop:"1px solid "+G.border}}>
        <button onClick={()=>setDm(false)} style={{border:"1.5px solid "+G.primary,background:"transparent",color:G.primary,borderRadius:8,padding:"8px 16px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
        <button onClick={()=>{
          if(!df.name)return alert("Informe o nome");
          var obj=Object.assign({},df,{commission:Number(df.commission)||40,id:ed?ed.id:nid(dents),_ts:Date.now()}); // V239: carimbo p/ merge item-a-item
          setDents(prev=>ed?prev.map(d=>d.id===ed.id?obj:d):[...prev,obj]);
          setDm(false);setEd(null);setDf(bd);
        }} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:14,fontWeight:700,cursor:"pointer"}}>{"Salvar"}</button>
      </div>
    </div>
  </div>
</div>}

  </div>;
}

// ══════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════
// ════════════════════════════════════════════════
//  PONTO POR LOCALIZAÇÃO
// ════════════════════════════════════════════════

// distância em metros entre 2 coordenadas (Haversine)
function distMetros(lat1,lon1,lat2,lon2){
  var R=6371000;var toR=function(g){return g*Math.PI/180;};
  var dLat=toR(lat2-lat1),dLon=toR(lon2-lon1);
  var a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(toR(lat1))*Math.cos(toR(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2);
  return Math.round(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));
}

// pega a localização atual do aparelho
function pegarLocal(){
  return new Promise(function(res,rej){
    if(!navigator.geolocation){rej(new Error("Geolocalização não suportada neste aparelho."));return;}
    navigator.geolocation.getCurrentPosition(
      function(p){res({lat:p.coords.latitude,lng:p.coords.longitude,acc:Math.round(p.coords.accuracy||0)});},
      function(e){rej(new Error(e.code===1?"Permissão de localização negada. Ative nas configurações do navegador.":e.code===3?"Tempo esgotado ao obter localização. Tente de novo.":"Não foi possível obter a localização."));},
      {enableHighAccuracy:true,timeout:12000,maximumAge:0}
    );
  });
}

function Ponto({pontos,setPontos,pontoCfg,setPontoCfg,user,users}){
  const isAdmin=user.level>=3;
  const [aba,setAba]=useState("reg");
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState(null); // {ok,txt}
  const z=function(n){return ("0"+n).slice(-2);};
  const hoje=today();
  const meuId=user.id;
  const meusHoje=pontos.filter(function(p){return String(p.uid)===String(meuId)&&p.data===hoje;}).sort(function(a,b){return a.ts<b.ts?-1:1;});

  function registrar(tipo,sub){
    if(busy)return;
    setMsg(null);
    if(!pontoCfg||pontoCfg.ativo===false){setMsg({ok:false,txt:"O controle de ponto está desativado. Avise o administrador."});return;}
    if(pontoCfg.lat==null||pontoCfg.lng==null){setMsg({ok:false,txt:"Localização da clínica ainda não configurada. Peça ao administrador para configurar na aba Configuração."});return;}
    setBusy(true);setMsg({ok:true,txt:"📍 Obtendo sua localização…"});
    pegarLocal().then(function(loc){
      var d=distMetros(loc.lat,loc.lng,pontoCfg.lat,pontoCfg.lng);
      var raio=Number(pontoCfg.raio||150);
      if(d>raio){setBusy(false);setMsg({ok:false,txt:"❌ Você está a ~"+d+" m da clínica (limite "+raio+" m). Aproxime-se para registrar."});return;}
      var ag=new Date();
      var reg={id:Date.now(),uid:meuId,nome:user.name,tipo:tipo,sub:sub||null,ts:ag.toISOString(),data:hoje,hora:z(ag.getHours())+":"+z(ag.getMinutes()),lat:loc.lat,lng:loc.lng,acc:loc.acc,dist:d};
      setPontos(function(prev){return prev.concat([reg]);});
      var lblReg=sub==="almoco"?(tipo==="saida"?"Saída p/ almoço":"Volta do almoço"):(tipo==="entrada"?"Entrada":"Saída");
      // V190: aguarda confirmacao do servidor antes do check verde (evita registro "fantasma" no celular)
      setMsg({ok:true,txt:"⏳ "+lblReg+" às "+reg.hora+" — salvando no servidor..."});
      pushPontoSupabase(reg).then(function(okSrv){
        setBusy(false);
        if(okSrv)setMsg({ok:true,txt:"✅ "+lblReg+" registrada às "+reg.hora+" — a "+d+" m da clínica. Salvo no servidor."});
        else setMsg({ok:false,txt:"⚠️ "+lblReg+" às "+reg.hora+" ficou registrada neste aparelho, mas AINDA NÃO foi confirmada no servidor (conexão fraca?). Mantenha o app aberto por alguns segundos e confira a lista de hoje."});
      });
    }).catch(function(e){setBusy(false);setMsg({ok:false,txt:"❌ "+(e.message||"Falha ao obter localização")});});
  }

  var card={background:G.card,borderRadius:14,padding:"16px 18px",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",border:"1px solid "+G.border};

  return <div style={{maxWidth:760,margin:"0 auto",display:"flex",flexDirection:"column",gap:16}}>
    <div style={{fontFamily:"'Cormorant Garamond'",fontSize:30,fontWeight:700,color:G.primary}}>🕐 Ponto</div>

    {isAdmin&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {[["reg","Registrar"],["rel","Diário"],["mes","Mensal"],["cfg","Configuração"]].map(function(o){return <button key={o[0]} onClick={function(){setAba(o[0]);setMsg(null);}} style={{border:"none",borderRadius:9,padding:"8px 16px",fontWeight:700,fontSize:13,cursor:"pointer",background:aba===o[0]?G.primary:"var(--green-soft)",color:aba===o[0]?"#fff":G.muted}}>{o[1]}</button>;})}
    </div>}

    {aba==="reg"&&<div style={card}>
      <div style={{fontFamily:"'Cormorant Garamond'",fontSize:24,fontWeight:700,color:G.primary,marginBottom:6}}>Olá, {user.name||""}!</div>
      <div style={{fontSize:13,color:G.muted,marginBottom:14}}>Toque para registrar sua entrada ou saída. Sua localização será verificada no momento do registro.</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <button disabled={busy} onClick={function(){registrar("entrada");}} style={{border:"none",borderRadius:13,padding:"18px 12px",fontSize:15.5,fontWeight:800,lineHeight:1.15,cursor:busy?"default":"pointer",color:"#fff",background:G.success,opacity:busy?.6:1}}>🟢 Registrar Entrada</button>
        <button disabled={busy} onClick={function(){registrar("saida","almoco");}} style={{border:"none",borderRadius:13,padding:"18px 12px",fontSize:15.5,fontWeight:800,lineHeight:1.15,cursor:busy?"default":"pointer",color:"#fff",background:"#C49A3C",opacity:busy?.6:1}}>🟡 Saída p/ Almoço</button>
        <button disabled={busy} onClick={function(){registrar("entrada","almoco");}} style={{border:"none",borderRadius:13,padding:"18px 12px",fontSize:15.5,fontWeight:800,lineHeight:1.15,cursor:busy?"default":"pointer",color:"#fff",background:"#2E8C7E",opacity:busy?.6:1}}>🔵 Volta do Almoço</button>
        <button disabled={busy} onClick={function(){registrar("saida");}} style={{border:"none",borderRadius:13,padding:"18px 12px",fontSize:15.5,fontWeight:800,lineHeight:1.15,cursor:busy?"default":"pointer",color:"#fff",background:G.orange,opacity:busy?.6:1}}>🔴 Registrar Saída</button>
      </div>
      {msg&&<div style={{marginTop:14,borderRadius:10,padding:"11px 14px",fontSize:13.5,fontWeight:600,background:msg.ok?G.accent:"var(--red-soft)",color:msg.ok?G.primary:G.red,border:"1px solid "+(msg.ok?G.border:"#F5B7B1")}}>{msg.txt}</div>}

      <div style={{marginTop:18}}>
        <div style={{fontSize:12,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>Meus registros de hoje</div>
        {meusHoje.length===0?<div style={{fontSize:13,color:G.muted}}>Nenhum registro hoje.</div>:
          meusHoje.map(function(p){return <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:9,background:"var(--green-soft)",marginBottom:6}}>
            <span style={{fontSize:16}}>{p.sub==="almoco"?(p.tipo==="saida"?"🟡":"🔵"):(p.tipo==="entrada"?"🟢":"🔴")}</span>
            <span style={{fontWeight:700,fontSize:14}}>{p.sub==="almoco"?(p.tipo==="saida"?"Saída p/ almoço":"Volta do almoço"):(p.tipo==="entrada"?"Entrada":"Saída")}</span>
            <span style={{fontSize:14,color:G.text}}>{p.hora}</span>
            <span style={{marginLeft:"auto",fontSize:11,color:G.muted}}>{p.dist!=null?("a "+p.dist+" m"):""}</span>
          </div>;})}
      </div>
    </div>}

    {aba==="rel"&&isAdmin&&<RelatorioPonto pontos={pontos} pontoCfg={pontoCfg} users={users}/>}
    {aba==="mes"&&isAdmin&&<EspelhoMensal pontos={pontos} pontoCfg={pontoCfg} users={users}/>}
    {aba==="cfg"&&isAdmin&&<ConfigPonto pontoCfg={pontoCfg} setPontoCfg={setPontoCfg}/>}
  </div>;
}

function RelatorioPonto({pontos,pontoCfg,users}){
  const z=function(n){return ("0"+n).slice(-2);};
  var d0=new Date();
  const [de,setDe]=useState(d0.getFullYear()+"-"+z(d0.getMonth()+1)+"-01");
  const [ate,setAte]=useState(today());
  const [quem,setQuem]=useState("all");

  var entradaPadrao=(pontoCfg&&pontoCfg.entradaPadrao)||"08:00";
  var saidaPadrao=(pontoCfg&&pontoCfg.saidaPadrao)||"18:00";

  var filtrados=pontos.filter(function(p){
    if(p.data<de||p.data>ate)return false;
    if(quem!=="all"&&String(p.uid)!==String(quem))return false;
    return true;
  });

  var map={};
  filtrados.forEach(function(p){
    var k=p.uid+"|"+p.data;
    if(!map[k])map[k]={uid:p.uid,nome:p.nome,data:p.data,ent:null,sai:null,almSai:null,almVol:null};
    var ehAlm=p.sub==="almoco";
    if(p.tipo==="entrada"&&ehAlm){if(!map[k].almVol||p.hora<map[k].almVol)map[k].almVol=p.hora;}
    else if(p.tipo==="saida"&&ehAlm){if(!map[k].almSai||p.hora>map[k].almSai)map[k].almSai=p.hora;}
    else if(p.tipo==="entrada"){if(!map[k].ent||p.hora<map[k].ent)map[k].ent=p.hora;}
    else if(p.tipo==="saida"){if(!map[k].sai||p.hora>map[k].sai)map[k].sai=p.hora;}
  });
  var linhas=Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return a.data<b.data?1:(a.data>b.data?-1:(a.nome<b.nome?-1:1));});

  function _toMin(h){var p=h.split(":");return Number(p[0])*60+Number(p[1]);}
  function minTrab(l){
    if(!l.ent||!l.sai)return null;
    var e=_toMin(l.ent),s=_toMin(l.sai);
    if(s<e)return null;
    var t=s-e;
    if(l.almSai&&l.almVol){var aS=_toMin(l.almSai),aV=_toMin(l.almVol);if(aV>aS&&aS>=e&&aV<=s)t-=(aV-aS);}
    return t<0?null:t;
  }
  function fmtH(m){if(m==null)return "—";return Math.floor(m/60)+"h"+z(m%60);}
  function fmtD(x){var p=x.split("-");return p[2]+"/"+p[1];}

  var card={background:G.card,borderRadius:14,padding:"16px 18px",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",border:"1px solid "+G.border};
  var inp={background:G.card,border:"1.5px solid "+G.border,borderRadius:9,padding:"9px 11px",fontSize:13,color:G.text,outline:"none"};

  return <div style={card}>
    <div style={{fontFamily:"'Cormorant Garamond'",fontSize:24,fontWeight:700,color:G.primary,marginBottom:12}}>Relatório de ponto</div>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
      <div><label style={{fontSize:10,fontWeight:700,color:G.muted,display:"block",marginBottom:4}}>DE</label><input type="date" value={de} onChange={function(e){setDe(e.target.value);}} style={inp}/></div>
      <div><label style={{fontSize:10,fontWeight:700,color:G.muted,display:"block",marginBottom:4}}>ATÉ</label><input type="date" value={ate} onChange={function(e){setAte(e.target.value);}} style={inp}/></div>
      <div><label style={{fontSize:10,fontWeight:700,color:G.muted,display:"block",marginBottom:4}}>PESSOA</label>
        <select value={quem} onChange={function(e){setQuem(e.target.value);}} style={inp}>
          <option value="all">Todos</option>
          {(users||[]).map(function(u){return <option key={u.id} value={u.id}>{u.name}</option>;})}
        </select>
      </div>
    </div>
    <div style={{fontSize:11.5,color:G.muted,marginBottom:10}}>Esperado: entrada {entradaPadrao} · saída {saidaPadrao}. Atrasos e saídas antecipadas aparecem em vermelho com ⚠️. As horas já descontam o almoço batido.</div>

    {linhas.length===0?<div style={{fontSize:13,color:G.muted}}>Nenhum registro no período.</div>:
    <div style={{display:"flex",flexDirection:"column"}}>
      {linhas.map(function(l){
        var atraso=l.ent&&l.ent>entradaPadrao;
        var antecip=l.sai&&l.sai<saidaPadrao;
        var mins=minTrab(l);
        var temAlm=l.almSai||l.almVol;
        var chip={display:"inline-flex",alignItems:"center",gap:7,background:G.card,boxShadow:"2px 2px 5px var(--nm-dark),-2px -2px 5px var(--nm-light)",borderRadius:11,padding:"7px 11px",fontSize:13.5,fontWeight:700,color:G.text,whiteSpace:"nowrap"};
        var dotS={width:11,height:11,borderRadius:"50%",flexShrink:0,display:"inline-block"};
        var lblS={fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".3px"};
        var sepS={color:G.muted,fontSize:12,fontWeight:700,padding:"0 1px"};
        var missS={display:"inline-flex",alignItems:"center",gap:7,border:"1.5px dashed #d9b3ad",borderRadius:11,padding:"6px 11px",fontSize:12.5,fontWeight:700,color:G.red};
        return <div key={l.uid+l.data} style={{borderTop:"1px solid "+G.border,padding:"14px 2px 13px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:11}}>
            <div style={{display:"flex",alignItems:"baseline",gap:10,minWidth:0}}>
              <span style={{fontWeight:800,fontSize:15}}>{fmtD(l.data)}</span>
              <span style={{fontSize:14,color:G.muted,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{l.nome}</span>
            </div>
            <span style={{flexShrink:0,background:G.card,boxShadow:"inset 2px 2px 5px var(--nm-dark),inset -2px -2px 5px var(--nm-light)",borderRadius:9,padding:"6px 13px",fontSize:14,fontWeight:800,color:mins==null?G.muted:G.primary}}>{fmtH(mins)}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:"6px 4px"}}>
            <span style={chip}><span style={Object.assign({},dotS,{background:G.success})}/><span style={lblS}>Entr</span><span style={atraso?{color:G.red}:undefined}>{(l.ent||"—")+(atraso?" ⚠️":"")}</span></span>
            <span style={sepS}>{"·"}</span>
            {(l.almSai&&l.almVol)?
              <span style={chip}><span style={Object.assign({},dotS,{background:"#C49A3C"})}/><span style={lblS}>Almoço</span>{l.almSai}<span style={{color:G.muted,fontWeight:800,padding:"0 2px"}}>{"→"}</span><span style={Object.assign({},dotS,{background:"#2E8C7E"})}/>{l.almVol}</span>
              :(temAlm?<span style={missS}>{"⚠️ almoço incompleto"+(l.almSai?" (sem volta)":" (sem saída)")}</span>
                :<span style={{fontSize:12,color:G.muted,fontStyle:"italic",fontWeight:600,padding:"0 2px"}}>sem almoço registrado</span>)}
            <span style={sepS}>{"·"}</span>
            {l.sai?
              <span style={chip}><span style={Object.assign({},dotS,{background:G.orange})}/><span style={lblS}>Saída</span><span style={antecip?{color:G.red}:undefined}>{l.sai+(antecip?" ⚠️":"")}</span></span>
              :<span style={missS}>{"⚠️ falta a saída"}</span>}
          </div>
        </div>;
      })}
    </div>}
  </div>;
}

function ConfigPonto({pontoCfg,setPontoCfg}){
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState(null);
  function up(patch){setPontoCfg(function(prev){return Object.assign({},prev,patch,{_ts:Date.now()});});} // V190: carimbo para o merge
  function capturar(){
    if(busy)return;setBusy(true);setMsg("📍 Obtendo localização…");
    pegarLocal().then(function(loc){up({lat:loc.lat,lng:loc.lng});setBusy(false);setMsg("✅ Localização capturada (precisão ~"+loc.acc+" m).");}).catch(function(e){setBusy(false);setMsg("❌ "+(e.message||"Falha"));});
  }
  var card={background:G.card,borderRadius:14,padding:"16px 18px",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",border:"1px solid "+G.border};
  var inp={background:G.card,border:"1.5px solid "+G.border,borderRadius:9,padding:"10px 12px",fontSize:14,color:G.text,outline:"none",boxSizing:"border-box"};
  var lbl={fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:6};

  return <div style={card}>
    <div style={{fontFamily:"'Cormorant Garamond'",fontSize:24,fontWeight:700,color:G.primary,marginBottom:6}}>Configuração do ponto</div>
    <div style={{fontSize:12.5,color:G.muted,marginBottom:16,lineHeight:1.5}}><b>Fique fisicamente dentro da clínica</b> e toque em "Usar minha localização atual". O raio define a distância máxima aceita para registrar.</div>

    <label style={{display:"flex",gap:9,alignItems:"center",fontSize:14,cursor:"pointer",marginBottom:16}}>
      <input type="checkbox" checked={pontoCfg.ativo!==false} onChange={function(e){up({ativo:e.target.checked});}} style={{accentColor:G.primary,width:16,height:16}}/> Controle de ponto ativado
    </label>

    <button onClick={capturar} disabled={busy} style={{border:"none",borderRadius:11,padding:"13px 18px",fontSize:14,fontWeight:700,cursor:busy?"default":"pointer",color:"#fff",background:G.primary,opacity:busy?.6:1,marginBottom:12}}>📍 Usar minha localização atual</button>
    {msg&&<div style={{marginBottom:14,fontSize:13,color:String(msg).indexOf("❌")>=0?G.red:G.success,fontWeight:600}}>{msg}</div>}

    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14}}>
      <div style={{flex:1,minWidth:130}}><label style={lbl}>Latitude</label><input value={pontoCfg.lat!=null?pontoCfg.lat:""} onChange={function(e){up({lat:e.target.value===""?null:Number(e.target.value)});}} style={Object.assign({width:"100%"},inp)} placeholder="—"/></div>
      <div style={{flex:1,minWidth:130}}><label style={lbl}>Longitude</label><input value={pontoCfg.lng!=null?pontoCfg.lng:""} onChange={function(e){up({lng:e.target.value===""?null:Number(e.target.value)});}} style={Object.assign({width:"100%"},inp)} placeholder="—"/></div>
    </div>

    <div style={{marginBottom:14}}><label style={lbl}>Raio permitido (metros)</label><input type="number" value={pontoCfg.raio||150} onChange={function(e){up({raio:Number(e.target.value)});}} style={Object.assign({width:160},inp)}/><div style={{fontSize:11.5,color:G.muted,marginTop:5}}>Recomendado 100–200 m. GPS dentro de prédios costuma ter erro de algumas dezenas de metros.</div></div>

    <div style={{marginBottom:14}}><label style={lbl}>Carga horária semanal (horas)</label><input type="number" value={pontoCfg.cargaSemanal||44} onChange={function(e){up({cargaSemanal:Number(e.target.value)});}} style={Object.assign({width:160},inp)}/><div style={{fontSize:11.5,color:G.muted,marginTop:5}}>Hoje a jornada é 44h. Se mudar para 40h (ou outro valor), ajuste aqui — é a meta semanal usada no relatório Mensal.</div></div>

    <div style={{marginBottom:14}}><label style={lbl}>Intervalo de almoço a descontar (min)</label><input type="number" value={pontoCfg.intervalo!=null?pontoCfg.intervalo:60} onChange={function(e){up({intervalo:Number(e.target.value)});}} style={Object.assign({width:160},inp)}/><div style={{fontSize:11.5,color:G.muted,marginTop:5}}>Descontado nos dias com uma única entrada/saída acima de 6h (almoço não batido). Se a pessoa bater saída e entrada no almoço, o intervalo real é usado automaticamente.</div></div>

    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <div style={{flex:1,minWidth:130}}><label style={lbl}>Entrada esperada</label><input type="time" value={pontoCfg.entradaPadrao||"08:00"} onChange={function(e){up({entradaPadrao:e.target.value});}} style={Object.assign({width:"100%"},inp)}/></div>
      <div style={{flex:1,minWidth:130}}><label style={lbl}>Saída esperada</label><input type="time" value={pontoCfg.saidaPadrao||"18:00"} onChange={function(e){up({saidaPadrao:e.target.value});}} style={Object.assign({width:"100%"},inp)}/></div>
    </div>
    <div style={{fontSize:11.5,color:G.muted,marginTop:12}}>As alterações são salvas automaticamente e valem para todos os aparelhos.</div>
  </div>;
}

function EspelhoMensal({pontos,pontoCfg,users}){
  const z=function(n){return ("0"+n).slice(-2);};
  var hoje0=new Date();
  const [mes,setMes]=useState(hoje0.getFullYear()+"-"+z(hoje0.getMonth()+1)); // "YYYY-MM"
  const [quem,setQuem]=useState("all");

  var meta=Number((pontoCfg&&pontoCfg.cargaSemanal)||44);          // horas/semana
  var intervalo=Number((pontoCfg&&pontoCfg.intervalo!=null)?pontoCfg.intervalo:60); // min de almoço

  // minutos entre dois "HH:MM"
  function minHora(a,b){var pa=a.split(":"),pb=b.split(":");return (Number(pb[0])*60+Number(pb[1]))-(Number(pa[0])*60+Number(pa[1]));}
  // minutos trabalhados num dia: pares entrada->saida (desconta almoço não batido em turnos > 6h)
  function minDia(lista){
    var ev=lista.slice().sort(function(x,y){return x.hora<y.hora?-1:(x.hora>y.hora?1:0);});
    var tot=0,abre=null,pares=0,spanUnico=0;
    ev.forEach(function(p){
      if(p.tipo==="entrada"){if(abre===null)abre=p.hora;}
      else if(p.tipo==="saida"){if(abre!==null){var m=minHora(abre,p.hora);if(m>0){tot+=m;spanUnico=m;}abre=null;pares++;}}
    });
    if(pares===1&&intervalo>0&&spanUnico>360){tot-=intervalo;}
    if(tot<0)tot=0;
    return tot;
  }
  function hhmm(m){var neg=m<0;m=Math.abs(m);return (neg?"-":"")+Math.floor(m/60)+"h"+z(m%60);}
  function ymd(dt){return dt.getFullYear()+"-"+z(dt.getMonth()+1)+"-"+z(dt.getDate());}
  function fmtDM(dt){return z(dt.getDate())+"/"+z(dt.getMonth()+1);}
  // segunda-feira da semana de uma data
  function segDaSemana(dt){var d=new Date(dt.getTime());var wd=(d.getDay()+6)%7;d.setDate(d.getDate()-wd);d.setHours(0,0,0,0);return d;}

  var ano=Number(mes.split("-")[0]),mm=Number(mes.split("-")[1]);
  var primeiro=new Date(ano,mm-1,1),ultimo=new Date(ano,mm,0);
  // semanas (seg-dom) atribuídas ao mês pela quinta-feira (cada semana pertence a 1 mês só)
  var semanas=[],cur=segDaSemana(primeiro);
  while(cur.getTime()<=ultimo.getTime()){
    var ini=new Date(cur.getTime()),fim=new Date(cur.getTime());fim.setDate(fim.getDate()+6);
    var qui=new Date(cur.getTime());qui.setDate(qui.getDate()+3);
    if(qui.getMonth()===(mm-1)&&qui.getFullYear()===ano){
      semanas.push({label:fmtDM(ini)+"–"+fmtDM(fim),iniYmd:ymd(ini),fimYmd:ymd(fim)});
    }
    cur.setDate(cur.getDate()+7);
  }

  // quem aparece: na opção "todos", só quem tem registro no mês
  var noMes={};
  pontos.forEach(function(p){if((p.data||"").slice(0,7)===mes)noMes[String(p.uid)]=true;});
  var base=(users||[]);
  var lista=quem!=="all"?base.filter(function(u){return String(u.id)===String(quem);})
                        :base.filter(function(u){return noMes[String(u.id)];});

  function dadosPessoa(uid){
    var porDia={};
    pontos.forEach(function(p){if(String(p.uid)!==String(uid))return;(porDia[p.data]=porDia[p.data]||[]).push(p);});
    var linhas=semanas.map(function(s){
      var min=0;
      Object.keys(porDia).forEach(function(dia){if(dia>=s.iniYmd&&dia<=s.fimYmd)min+=minDia(porDia[dia]);});
      return {label:s.label,min:min,saldo:min-meta*60};
    });
    var totMin=linhas.reduce(function(a,l){return a+l.min;},0);
    var totMeta=semanas.length*meta*60;
    return {linhas:linhas,totMin:totMin,totMeta:totMeta,totSaldo:totMin-totMeta};
  }

  var card={background:G.card,borderRadius:14,padding:"16px 18px",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",border:"1px solid "+G.border};
  var inp={background:G.card,border:"1.5px solid "+G.border,borderRadius:9,padding:"9px 11px",fontSize:13,color:G.text,outline:"none"};
  function corSaldo(m){return m<0?G.red:(m>0?G.success:G.muted);}

  return <div style={card}>
    <div style={{fontFamily:"'Cormorant Garamond'",fontSize:24,fontWeight:700,color:G.primary,marginBottom:12}}>Fechamento mensal por semana</div>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
      <div><label style={{fontSize:10,fontWeight:700,color:G.muted,display:"block",marginBottom:4}}>MÊS</label><input type="month" value={mes} onChange={function(e){setMes(e.target.value);}} style={inp}/></div>
      <div><label style={{fontSize:10,fontWeight:700,color:G.muted,display:"block",marginBottom:4}}>PESSOA</label>
        <select value={quem} onChange={function(e){setQuem(e.target.value);}} style={inp}>
          <option value="all">Todos</option>
          {(users||[]).map(function(u){return <option key={u.id} value={u.id}>{u.name}</option>;})}
        </select>
      </div>
    </div>
    <div style={{fontSize:11.5,color:G.muted,marginBottom:14,lineHeight:1.5}}>Meta semanal: <b>{meta}h</b> · semanas de segunda a domingo (a semana da virada do mês conta inteira). <b style={{color:G.red}}>Saldo negativo</b> = ficou a menos. Almoço: {intervalo} min descontados em dias acima de 6h sem batida de intervalo.</div>

    {lista.length===0?<div style={{fontSize:13,color:G.muted}}>Nenhum registro neste mês.</div>:
      lista.map(function(u){
        var d=dadosPessoa(u.id);
        return <div key={u.id} style={{marginBottom:22}}>
          <div style={{fontWeight:800,fontSize:15,color:G.text,marginBottom:7}}>{u.name}</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{textAlign:"left",color:G.muted,fontSize:11,textTransform:"uppercase"}}>
                <th style={{padding:"6px 8px"}}>Semana</th><th style={{padding:"6px 8px"}}>Trabalhadas</th><th style={{padding:"6px 8px"}}>Meta</th><th style={{padding:"6px 8px"}}>Saldo</th>
              </tr></thead>
              <tbody>
              {d.linhas.map(function(l,i){return <tr key={i} style={{borderTop:"1px solid "+G.border}}>
                <td style={{padding:"7px 8px",fontWeight:600}}>{l.label}</td>
                <td style={{padding:"7px 8px"}}>{hhmm(l.min)}</td>
                <td style={{padding:"7px 8px",color:G.muted}}>{meta}h00</td>
                <td style={{padding:"7px 8px",fontWeight:700,color:corSaldo(l.saldo)}}>{(l.saldo>0?"+":"")+hhmm(l.saldo)}</td>
              </tr>;})}
              <tr style={{borderTop:"2px solid "+G.border,background:"var(--green-soft)"}}>
                <td style={{padding:"8px 8px",fontWeight:800}}>Mês</td>
                <td style={{padding:"8px 8px",fontWeight:800}}>{hhmm(d.totMin)}</td>
                <td style={{padding:"8px 8px",fontWeight:700,color:G.muted}}>{hhmm(d.totMeta)}</td>
                <td style={{padding:"8px 8px",fontWeight:800,color:corSaldo(d.totSaldo)}}>{(d.totSaldo>0?"+":"")+hhmm(d.totSaldo)}</td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>;
      })}
  </div>;
}

function Dashboard({appts,pats,recs,rems,pros,dents,setView,user,gastos,stock,labs,pacsTicks,setPacsTicks,espera,waSent}){
const t=today();
const yd=yest();
const mo=t.slice(0,7);
const per=mo;
const [oBday,setOBday]=useState(false);
const [oFalt,setOFalt]=useState(false);
const [oPros,setOPros]=useState(false);
const [oStk,setOStk]=useState(false);
const [oCir,setOCir]=useState(false);
const [oEsp,setOEsp]=useState(false);
const [vBdayDone,setVBdayDone]=useState(false);
const rev=recs.filter(r=>r.date.startsWith(mo)&&r.paid>0).reduce((s,r)=>s+r.paid,0);
const todayCount=appts.filter(a=>a.date===t&&!a.blocked&&a.status!=="cancelled").length;
const despHoje=(function(){
  var diaHoje=Number(t.slice(8));
  var all=[...((gastos&&gastos.clinica)||[]),...((gastos&&gastos.pessoal)||[])];
  var due=all.filter(function(e){
    if(e.recorrente&&e.diaVenc){ if(e.pagoMeses&&e.pagoMeses[mo])return false; return Number(e.diaVenc)===diaHoje; }
    if(e.parcelado){ if(e.pagoMeses&&e.pagoMeses[mo])return false; var sIdx=Number((e.date||"").slice(0,4))*12+Number((e.date||"").slice(5,7)); var cIdx=Number(mo.slice(0,4))*12+Number(mo.slice(5,7)); var kk=cIdx-sIdx; if(kk<0||kk>=Number(e.parcelas||1))return false; return Number((e.date||"").slice(8))===diaHoje; }
    if(e.paid)return false; return e.date===t;
  });
  var seen={},out=[]; due.forEach(function(e){ var k=(e.desc||"").trim().toLowerCase()+"|"+(e.recorrente?("r"+e.diaVenc):e.parcelado?("p"+(e.date||"")):("d"+(e.date||""))); if(seen[k])return;seen[k]=1;out.push(e); }); return out;
})();
const _bdayDone=function(p){return !!(pacsTicks&&pacsTicks["bday_week_"+p.id+"_"+per]&&pacsTicks["bday_week_"+p.id+"_"+per].done);};
const bdayAll=pats.filter(function(p){return p.dob&&p.dob.slice(5)===t.slice(5);});
const bdayPend=bdayAll.filter(function(p){return !_bdayDone(p);});
const bdayDone=bdayAll.filter(_bdayDone);
const marcarBday=function(p){setPacsTicks(function(prev){var n=Object.assign({},prev);var rec={done:true,note:"Parabens enviado",doneBy:user.name,doneAt:t,ts:Date.now()};n["bday_week_"+p.id+"_"+per]=rec;n["bday_month_"+p.id+"_"+per]=rec;return n;});};
const restaurarBday=function(p){setPacsTicks(function(prev){var n=Object.assign({},prev);var tb={done:false,ts:Date.now(),by:user.name};n["bday_week_"+p.id+"_"+per]=tb;n["bday_month_"+p.id+"_"+per]=tb;return n;});};
const faltOntem=appts.filter(function(a){return a.date===yd&&a.status==="missed";});
const prosPend=pros.filter(function(p){return p.status==="waiting"&&p.due&&p.due<=t;}).sort(function(a,b){return (a.due||"").localeCompare(b.due||"");});
const prosAtras=prosPend.filter(function(p){return p.due&&p.due<t;}).length;
const stkBaixo=((stock||[]).filter(function(s){return Number(s.qty)<=Number(s.min);}));
const ar=autoRems(pats,recs,appts);
const cir=ar.filter(function(r){return r.type==="surg"&&!((pacsTicks||{})["poscir_"+r.patientId+"_"+yest()]||{}).done;});
const encaixes=(function(){
var by={};
for(var i=0;i<7;i++){
var dd=new Date(t+"T12:00");dd.setDate(dd.getDate()+i);
var ds=dd.toISOString().split("T")[0];
esperaMatchDia(espera||[],appts,dents,ds).forEach(function(m){
var k=m.esp.id;
if(!by[k])by[k]={esp:m.esp,dent:m.dent,ops:[]};
m.times.forEach(function(tm){if(by[k].ops.length<8)by[k].ops.push({date:ds,time:tm});});
});
}
return Object.keys(by).map(function(k){return by[k];});
})();
const DSEM=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const head=function(open,setOpen,icon,label,count,color){
  return <button onClick={function(){setOpen(function(v){return !v;});}} style={{width:"100%",border:"none",background:color+"15",borderLeft:"4px solid "+color,borderRadius:open?"12px 12px 0 0":12,padding:"11px 14px",display:"flex",alignItems:"center",gap:9,cursor:"pointer"}}>
    <span style={{fontSize:16}}>{icon}</span>
    <span style={{flex:1,textAlign:"left",fontWeight:700,fontSize:13,color:color}}>{label}</span>
    <span style={{background:color,color:"#fff",borderRadius:20,padding:"1px 9px",fontSize:12,fontWeight:700}}>{count}</span>
    <span style={{color:color,fontSize:13,fontWeight:700,transform:open?"rotate(90deg)":"none",transition:"transform .15s"}}>{">"}</span>
  </button>;
};
const bodyWrap=function(children,color){return <div style={{border:"1.5px solid "+color+"55",borderTop:"none",borderRadius:"0 0 12px 12px",padding:"10px 12px",display:"flex",flexDirection:"column",gap:7,background:"var(--surface)"}}>{children}</div>;};
return <div style={{display:"flex",flexDirection:"column",gap:12}} className="fi">

  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
    <div><h2 style={{fontFamily:"'Cormorant Garamond'",fontSize:26}}>Visão Geral</h2><div style={{fontSize:12,color:G.muted}}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div></div>
    <div style={{fontSize:12,color:G.muted}}>Olá, <strong>{user.name}</strong></div>
  </div>

  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}>
    {[["👥",pats.length,"Pacientes",G.primary],["📅",todayCount,"Hoje",G.blue],["💰",cur(rev),"Receita mês",G.success]].map(function(c){return <div key={c[2]} style={{background:G.card,borderRadius:12,padding:"11px 12px",boxShadow:"0 1px 5px rgba(0,0,0,.07)",borderLeft:"4px solid "+c[3]}}><div style={{fontSize:17}}>{c[0]}</div><div style={{fontFamily:"'Cormorant Garamond'",fontSize:20,color:c[3]}}>{c[1]}</div><div style={{fontSize:10,color:G.muted,fontWeight:600}}>{c[2]}</div></div>;})}
  </div>

  {bdayAll.length>0&&<div>
    {head(oBday,setOBday,"🎂","Aniversariantes hoje",bdayPend.length,G.gold)}
    {oBday&&bodyWrap(<>
      {bdayPend.length===0&&<div style={{fontSize:12,color:G.success,fontWeight:600}}>✅ Todos já contatados!</div>}
      {bdayPend.map(function(p){return <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid "+G.border}}>
        <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{p.name}</div><div style={{fontSize:11,color:G.muted}}>{age(p.dob)+(p.phone?" · "+p.phone:"")}</div></div>
        {p.phone&&<button onClick={function(){wa(p.phone,"Olá "+p.name+"! 🎂 A equipe Affonso Odontologia deseja um feliz aniversário! 🦷");}} style={{background:"#25D366",color:"#fff",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>📱 WA</button>}
        <button onClick={function(){marcarBday(p);}} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>✓ Feito</button>
      </div>;})}
      {bdayDone.length>0&&<button onClick={function(){setVBdayDone(function(v){return !v;});}} style={{alignSelf:"flex-start",background:"none",border:"none",color:G.muted,fontSize:11,fontWeight:700,cursor:"pointer",marginTop:2}}>{(vBdayDone?"▾ ":"▸ ")+"✓ "+bdayDone.length+" já contatado(s)"}</button>}
      {vBdayDone&&bdayDone.map(function(p){var tk=pacsTicks["bday_week_"+p.id+"_"+per]||{};return <div key={"d"+p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",opacity:.7}}>
        <div style={{flex:1}}><div style={{fontSize:12,textDecoration:"line-through",color:G.muted}}>{p.name}</div><div style={{fontSize:10,color:G.success}}>{"✓ "+(tk.doneBy||"")+(tk.doneAt?" em "+fmt(tk.doneAt):"")}</div></div>
        <button onClick={function(){restaurarBday(p);}} style={{background:"none",border:"1px solid "+G.border,borderRadius:6,padding:"2px 8px",fontSize:10,color:G.muted,cursor:"pointer"}}>↩ Restaurar</button>
      </div>;})}
    </>,G.gold)}
  </div>}

  {faltOntem.length>0&&<div>
    {head(oFalt,setOFalt,"🚫","Faltaram ontem",faltOntem.length,G.red)}
    {oFalt&&bodyWrap(<>
      {faltOntem.map(function(a){var p=pats.find(function(x){return x.id===a.patientId;});var d=dents.find(function(x){return x.id===a.dentistId;})||dents[0];if(!p)return null;return <div key={a.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid "+G.border}}>
        <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{p.name}</div><div style={{fontSize:11,color:G.muted}}>{a.procedure+" · "+d.name.split(" ")[0]}</div></div>
        {p.phone&&<button onClick={function(){wa(p.phone,"Olá "+p.name+"! Notamos que faltou à consulta de ontem. Quer remarcar? Responda SIM! Affonso Odontologia");}} style={{background:"#25D366",color:"#fff",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>📱 WA</button>}
      </div>;})}
      <button onClick={function(){setView("remarcar");}} style={{alignSelf:"flex-start",background:G.red,color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer",marginTop:3}}>Ver Remarcar →</button>
    </>,G.red)}
  </div>}

  {prosPend.length>0&&<div>
    {head(oPros,setOPros,"🏥",("Próteses pendentes"+(prosAtras>0?" ("+prosAtras+" atrasada"+(prosAtras>1?"s":"")+")":"")),prosPend.length,G.red)}
    {oPros&&bodyWrap(<>
      {prosPend.slice(0,12).map(function(p){var pat=pats.find(function(x){return x.id===p.patientId;});var lab=(labs||[]).find(function(x){return x.id===p.labId;});var late=p.due&&p.due<t;return <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid "+G.border}}>
        <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{((pat&&pat.name)||"—")}{late?<span style={{background:G.red,color:"#fff",borderRadius:6,padding:"0 6px",fontSize:9,fontWeight:700,marginLeft:6}}>ATRASADA</span>:null}</div><div style={{fontSize:11,color:G.muted}}>{p.type+(lab?" · "+lab.name:"")+" · prev: "+fmt(p.due)}</div></div>
      </div>;})}
      <button onClick={function(){setView("pros");}} style={{alignSelf:"flex-start",background:G.red,color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer",marginTop:3}}>Ver Próteses →</button>
    </>,G.red)}
  </div>}

  {stkBaixo.length>0&&<div>
    {head(oStk,setOStk,"📦","Estoque baixo",stkBaixo.length,G.orange)}
    {oStk&&bodyWrap(<>
      {stkBaixo.map(function(s){return <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid "+G.border}}>
        <div style={{flex:1,fontWeight:700,fontSize:13}}>{s.name}</div>
        <span style={{fontSize:12,color:G.red,fontWeight:700}}>{s.qty+" "+s.unit}</span>
        <span style={{fontSize:10,color:G.muted}}>{"min: "+s.min}</span>
      </div>;})}
      <button onClick={function(){setView("stk");}} style={{alignSelf:"flex-start",background:G.orange,color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer",marginTop:3}}>Ver Estoque →</button>
    </>,G.orange)}
  </div>}

  {cir.length>0&&<div>
    {head(oCir,setOCir,"🔴","Pós-cirurgia (contato)",cir.length,G.red)}
    {oCir&&bodyWrap(<>
      {cir.map(function(r){var p=pats.find(function(x){return x.id===r.patientId;});var autoOk=!!appts.find(function(a){return a.patientId===r.patientId&&a.date===yest()&&waSent&&waSent["pc_"+a.id];});return <div key={r.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid "+G.border}}>
        <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{(p&&p.name)||r.title}{autoOk&&<span style={{marginLeft:6,fontSize:9,background:"var(--green-soft)",color:G.success,borderRadius:8,padding:"1px 7px",fontWeight:700}}>🤖 WA enviado</span>}</div><div style={{fontSize:11,color:G.muted}}>{r.desc||""}</div></div>
        {p&&p.phone&&<button onClick={function(){wa(p.phone,"Olá "+p.name+"! Como está se sentindo após o procedimento de ontem? 😊 Affonso Odontologia");}} style={{background:"#25D366",color:"#fff",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>📱 WA</button>}
        <button onClick={function(){setPacsTicks(function(prev){var n=Object.assign({},prev||{});n["poscir_"+r.patientId+"_"+yest()]={done:true,by:user.name,date:today()};return n;});}} title="Excluir da lista" style={{background:"none",border:"1.5px solid "+G.border,borderRadius:8,padding:"4px 9px",fontSize:12,color:G.muted,cursor:"pointer",fontWeight:700}}>✕</button>
      </div>;})}
    </>,G.red)}
  </div>}

  {encaixes.length>0&&<div>
    {head(oEsp,setOEsp,"⏳","Encaixes — Lista de Espera",encaixes.length,"#7B1FA2")}
    {oEsp&&bodyWrap(<>
      {encaixes.map(function(x){return <div key={x.esp.id} style={{padding:"7px 0",borderBottom:"1px solid "+G.border}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:120}}>
            <div style={{fontWeight:700,fontSize:13}}>{x.esp.patName}</div>
            <div style={{fontSize:11,color:G.muted}}>{(x.esp.proc||"")+" · "+x.dent.name.split(" ").slice(0,2).join(" ")+" · "+x.esp.tempo+"min"}</div>
          </div>
          {(function(){var p=pats.find(function(pp){return pp.id===Number(x.esp.patientId);});var fone=(p&&p.phone)||"";if(!fone)return null;var op=x.ops[0];var msg="Olá "+x.esp.patName+"! 😊 Surgiu um horário disponível"+(op?" dia "+fmt(op.date)+" às "+op.time:"")+" com "+x.dent.name+" para "+(x.esp.proc||"sua consulta")+". Quer aproveitar? Responda SIM! Affonso Odontologia 🦷";return <button onClick={function(){wa(fone,msg);}} style={{background:"#25D366",color:"#fff",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>📱 WA</button>;})()}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:5}}>
          {x.ops.slice(0,5).map(function(op,i){var dw=new Date(op.date+"T12:00").getDay();return <span key={i} style={{background:"var(--purple-soft)",color:"#7B1FA2",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700}}>{DSEM[dw]+" "+fmt(op.date).slice(0,5)+" "+op.time}</span>;})}
          {x.ops.length>5&&<span style={{fontSize:10,color:"#7B1FA2"}}>{"+"+(x.ops.length-5)}</span>}
        </div>
      </div>;})}
      <button onClick={function(){setView("agenda");}} style={{alignSelf:"flex-start",background:"#7B1FA2",color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer",marginTop:3}}>Ver Agenda →</button>
    </>,"#7B1FA2")}
  </div>}

  {despHoje.length>0&&<div style={{background:"var(--amber-soft)",border:"2px solid #FF9800",borderRadius:10,padding:"10px 14px",cursor:"pointer"}} onClick={function(){setView("desp");}}>
    <div style={{fontWeight:700,color:"#E65100",fontSize:13,marginBottom:4}}>{"💸 "+despHoje.length+" despesa(s) vence(m) hoje!"}</div>
    {despHoje.slice(0,3).map(function(e,i){return <div key={i} style={{fontSize:12,color:"#E65100"}}>{"• "+(e.desc||"")+" — "+(Number(e.value||0)>0?cur(Number(e.value)):"preencher valor")}</div>;})}
    {despHoje.length>3&&<div style={{fontSize:11,color:"#E65100",marginTop:2}}>{"+ "+(despHoje.length-3)+" mais..."}</div>}
    <div style={{fontSize:11,color:"#BF360C",marginTop:4,fontWeight:600}}>{"Toque para ver Despesas →"}</div>
  </div>}

  {bdayAll.length===0&&faltOntem.length===0&&prosPend.length===0&&stkBaixo.length===0&&cir.length===0&&despHoje.length===0&&encaixes.length===0&&<div style={{background:G.card,borderRadius:12,padding:24,textAlign:"center",color:G.muted,fontSize:13,boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>✅ Tudo em dia! Nenhuma pendência hoje.</div>}

</div>;
}

// ══════════════════════════════════════════════════════════
// WA PREVIEW MODAL - global, shown before sending
// ══════════════════════════════════════════════════════════

function WaPreview({data,onClose}){
if(!data)return null;
const {ph,msg}=data;
const n=(ph||"").replace(/\D/g,"");
const url=`https://wa.me/${n.startsWith("55")?n:"55"+n}?text=${encodeURIComponent(msg)}`;
const copy=()=>{ navigator.clipboard?.writeText(msg).then(()=>alert("Mensagem copiada!")).catch(()=>alert("Copie manualmente:\n\n"+msg)); };
return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0 0 0 0"}}>

<div style={{background:"var(--surface)",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:560,boxShadow:"0 -8px 32px rgba(0,0,0,.18)",overflow:"hidden"}}>
{/* Header */}
<div style={{background:"#25D366",padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}>
<span style={{fontSize:24}}>📱</span>
<div style={{flex:1}}>
<div style={{fontWeight:700,color:"#fff",fontSize:15}}>Prévia da Mensagem WhatsApp</div>
<div style={{fontSize:11,color:"rgba(255,255,255,.8)"}}>Para: {ph}</div>
</div>
<button onClick={onClose} style={{border:"none",background:"rgba(255,255,255,.2)",borderRadius:8,color:"#fff",fontSize:18,cursor:"pointer",padding:"5px 10px"}}>✕</button>
</div>
{/* Message preview -- like WhatsApp bubble */}
<div style={{background:"var(--amber-soft)",padding:"16px",maxHeight:"45vh",overflowY:"auto"}}>
<div style={{background:"var(--surface)",borderRadius:"0 12px 12px 12px",padding:"10px 14px",maxWidth:"85%",boxShadow:"0 1px 3px rgba(0,0,0,.1)",display:"inline-block",fontSize:13,lineHeight:1.6,whiteSpace:"pre-wrap",color:"var(--text)",wordBreak:"break-word"}}>
{msg}
</div>
</div>
{/* Actions */}
<div style={{padding:"14px 18px",display:"flex",gap:10,borderTop:"1px solid #eee"}}>
<button onClick={copy} style={{flex:1,background:"var(--surface-2)",color:"var(--text)",border:"none",borderRadius:10,padding:"11px",fontSize:13,fontWeight:700,cursor:"pointer"}}>📋 Copiar Texto</button>
<a href={url} target="_blank" rel="noreferrer" onClick={onClose} style={{flex:2,background:"#25D366",color:"#fff",border:"none",borderRadius:10,padding:"11px",fontSize:14,fontWeight:700,cursor:"pointer",textAlign:"center",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
<span>📲</span> Abrir no WhatsApp
</a>
</div>
<div style={{padding:"0 18px 14px",fontSize:11,color:"var(--muted)",textAlign:"center"}}>
Clique em "Abrir no WhatsApp" para enviar. O texto já estará preenchido.
</div>
</div>

  </div>;
}

// ══════════════════════════════════════════════════════════
// RECEITUÁRIO
// ══════════════════════════════════════════════════════════
var MEDS_BASE=[
// ── ANTIBIOTICOS ──────────────────────────────────
{id:"amox500",cat:"Antibiótico",name:"Amoxicilina 500mg",pos:"1 cápsula de 8/8h por 7 dias",qty:"21 cápsulas"},
{id:"amox500susp",cat:"Antibiótico",name:"Amoxicilina 250mg suspensão",pos:"5ml de 8/8h por 7 dias",qty:"1 frasco"},
{id:"amox500profilax",cat:"Antibiótico",name:"Amoxicilina 500mg (profilaxia cirúrgica)",pos:"4 comprimidos 1h antes do procedimento, após 1 comp. de 8/8h por 7 dias",qty:"1 Cx"},
{id:"amox875",cat:"Antibiótico",name:"Amoxicilina 875mg",pos:"1 cápsula de 12/12h por 7 dias",qty:"14 cápsulas"},
{id:"amoxclav875",cat:"Antibiótico",name:"Clavulin / Sigma Clav 875mg+125mg",pos:"1 comprimido de 12/12h por 7 dias. Iniciar pela manhã no dia da cirurgia",qty:"1 Cx"},
{id:"amoxclavbd",cat:"Antibiótico",name:"Clavulin BD 875mg",pos:"1 comprimido de 12/12h por 7 dias",qty:"1 Cx"},
{id:"azitro500",cat:"Antibiótico",name:"Azitromicina 500mg",pos:"1 comprimido ao dia por 3 dias",qty:"3 comprimidos"},
{id:"azitro200susp",cat:"Antibiótico",name:"Azitromicina 200mg suspensão",pos:"5ml por dia por 3 dias",qty:"1 frasco"},
{id:"clinda300",cat:"Antibiótico",name:"Clindamicina 300mg",pos:"1 comprimido de 6/6h por 7 dias",qty:"28 comprimidos"},
{id:"metro400",cat:"Antibiótico",name:"Metronidazol (Flagyl) 400mg",pos:"1 comprimido de 8/8h por 7 dias",qty:"21 comprimidos"},
{id:"flagylped",cat:"Antibiótico",name:"Flagyl Pediátrico suspensão",pos:"5ml (1 colher de chá) 3x ao dia por 5 dias",qty:"1 frasco"},
{id:"cefalex500",cat:"Antibiótico",name:"Cefalexina 500mg",pos:"1 comprimido de 8/8h por 7 dias",qty:"21 comprimidos"},
{id:"cefalex500cir",cat:"Antibiótico",name:"Cefalexina 500mg (pré-cirúrgica)",pos:"4 comprimidos 1h antes da cirurgia, após 1 comp. de 8/8h por 7 dias",qty:"1 Cx"},
{id:"penveoral",cat:"Antibiótico",name:"Pen-Ve-Oral 50000Ui",pos:"4 comprimidos 1h antes da intervenção, após 1 comp. de 8/8h por 5 dias",qty:"2 Cx"},
{id:"benectrin",cat:"Antibiótico",name:"Benectrin (Sulfametoxazol+Trimetoprima) 200+40mg",pos:"10ml de 12/12h por 7 dias",qty:"1 frasco"},
{id:"cipro500",cat:"Antibiótico",name:"Ciprofloxacino 500mg",pos:"1 comprimido de 12/12h por 7 dias",qty:"14 comprimidos"},
// ── ANALGESICOS ───────────────────────────────────
{id:"dipiro500comp",cat:"Analgésico",name:"Dipirona 500mg comprimido",pos:"1 comprimido de 4/4h enquanto houver dor",qty:"20 comprimidos"},
{id:"dipiro1g",cat:"Analgésico",name:"Dipirona 1g comprimido",pos:"1 comprimido de 6/6h enquanto houver dor",qty:"10 comprimidos"},
{id:"dipirogotas",cat:"Analgésico",name:"Dipirona gotas",pos:"30 gotas de 4/4h enquanto houver dor",qty:"1 frasco"},
{id:"lisador",cat:"Analgésico",name:"Lisador gotas",pos:"40 gotas de 4/4h se houver dor",qty:"1 frasco"},
{id:"paracet500",cat:"Analgésico",name:"Paracetamol 500mg",pos:"1 comprimido de 6/6h enquanto houver dor",qty:"20 comprimidos"},
{id:"paracetgotas",cat:"Analgésico",name:"Paracetamol 200mg gotas",pos:"30 gotas de 4/4h enquanto houver dor",qty:"1 frasco"},
{id:"tylex30",cat:"Analgésico",name:"Tylex 30mg (codeína+paracetamol)",pos:"1 comprimido de 8/8h enquanto houver dor",qty:"1 Cx"},
{id:"tramal50",cat:"Analgésico",name:"Tramal 50mg",pos:"1 comprimido de 8/8h durante a dor",qty:"1 Cx"},
{id:"toragesic",cat:"Analgésico",name:"Toragesic / Deocil SL 10mg (sublingual)",pos:"1 comprimido sublingual de 6/6h quando houver dor",qty:"1 Cx"},
// ── ANTI-INFLAMATORIOS ────────────────────────────
{id:"ibupr300",cat:"Anti-inflamatório",name:"Ibuprofeno 300mg",pos:"1 comprimido de 4/4h enquanto houver dor",qty:"1 Cx"},
{id:"ibupr600",cat:"Anti-inflamatório",name:"Ibuprofeno 600mg",pos:"1 comprimido de 8/8h por 3 dias após refeições",qty:"9 comprimidos"},
{id:"ibuprgotas",cat:"Anti-inflamatório",name:"Ibuprofeno 50mg gotas (pediátrico)",pos:"20 gotas de 8/8h por 5 dias",qty:"1 frasco"},
{id:"alivium100",cat:"Anti-inflamatório",name:"Alivium 100mg gotas",pos:"1 gota por kg de 8/8h por 3 a 5 dias",qty:"1 frasco"},
{id:"nimes100",cat:"Anti-inflamatório",name:"Nimesulida 100mg",pos:"1 comprimido de 12/12h por 5 dias após refeições",qty:"10 comprimidos"},
{id:"nimesretard",cat:"Anti-inflamatório",name:"Arflex Retard (Nimesulida 200mg)",pos:"1 comprimido por dia por 5 dias",qty:"1 Cx"},
{id:"artrosil",cat:"Anti-inflamatório",name:"Artrosil 160mg",pos:"1 comprimido de 12/12h por 5 dias",qty:"1 Cx"},
{id:"biprofenid150",cat:"Anti-inflamatório",name:"Biprofenid 150mg",pos:"1 comprimido de 12/12h por 5 dias",qty:"1 Cx"},
{id:"cetoprof500",cat:"Anti-inflamatório",name:"Cetoprofeno 500mg",pos:"1 comprimido de 12/12h por 5 dias",qty:"1 Cx"},
{id:"profenidretard",cat:"Anti-inflamatório",name:"Profenid Retard 200mg",pos:"1 comprimido ao dia por 5 dias",qty:"1 Cx"},
{id:"diclofenac50",cat:"Anti-inflamatório",name:"Diclofenaco de Potássio 50mg",pos:"1 comprimido de 8/8h por 5 dias",qty:"15 comprimidos"},
{id:"piroxican20",cat:"Anti-inflamatório",name:"Piroxicam 20mg",pos:"1 comprimido de 12/12h por 5 dias",qty:"10 comprimidos"},
{id:"trilax",cat:"Anti-inflamatório",name:"Trilax",pos:"1 comprimido de 8/8h por 5 dias",qty:"1 Cx"},
// ── CORTICOIDES ───────────────────────────────────
{id:"dexa4_2x",cat:"Corticóide",name:"Decadron (Dexametasona) 4mg - 2 comp/dia",pos:"2 comprimidos 1 vez ao dia por 3 dias",qty:"6 comprimidos"},
{id:"dexa4_1x",cat:"Corticóide",name:"Decadron (Dexametasona) 4mg - 1 comp/dia",pos:"1 comprimido de 12/12h por 3 dias",qty:"6 comprimidos"},
{id:"predni5mg",cat:"Corticóide",name:"Prednisolona 5ml/dia",pos:"5ml por dia por 5 dias",qty:"1 frasco 60ml"},
{id:"predni20mg",cat:"Corticóide",name:"Prednisolona 20mg comprimido",pos:"1 comprimido 2x ao dia por 8 dias",qty:"1 frasco 20ml"},
// ── ANTISSEPTICOS / USO EXTERNO ───────────────────
{id:"clorex012",cat:"Antisséptico",name:"Clorexidina 0,12% Bochecho (Periogard)",pos:"Bochechar 2x ao dia por 7 dias - Não engolir",qty:"1 frasco"},
{id:"peroxil",cat:"Antisséptico",name:"Peroxil bochecho",pos:"Bochechar 3x ao dia",qty:"1 frasco"},
{id:"aguaox",cat:"Antisséptico",name:"Água Oxigenada 10 volumes",pos:"Bochechar 3x ao dia por 7 dias",qty:"1 frasco"},
{id:"nistatina",cat:"Antisséptico",name:"Nistatina suspensão oral",pos:"Bochechar com 10ml de 6/6h por 15 dias",qty:"1 frasco"},
{id:"fluoreto05",cat:"Antisséptico",name:"Fluoreto de Sódio 0,5%",pos:"Bochechar 3x ao dia após escovação. Não comer/beber por 30 min",qty:"1 litro"},
{id:"orthogard",cat:"Antisséptico",name:"OrthoGard Fluoreto de Sódio 0,04%",pos:"Bochechar 3x ao dia após escovação. Não comer/beber por 30 min",qty:"1 frasco"},
{id:"aciclovircreme",cat:"Antisséptico",name:"Aciclovir creme",pos:"Aplicar no local 4x ao dia por 7 dias",qty:"1 bisnaga"},
{id:"aciclovir200",cat:"Antisséptico",name:"Aciclovir 200mg comprimido",pos:"1 comprimido de 8/8h por 10 dias",qty:"1 Cx"},
{id:"ocilon",cat:"Antisséptico",name:"Ocilon A em Oral Base pomada",pos:"Aplicar a pomada na região afetada",qty:"1 bisnaga"},
{id:"gengilone",cat:"Antisséptico",name:"Gengilone pomada 10g",pos:"Aplicar pequena quantidade no local afetado 3 a 6 vezes por dia",qty:"1 bisnaga"},
{id:"colgsens",cat:"Antisséptico",name:"Colgate Sensitive Pró-Alívio pasta",pos:"Movimento circular na região sensível por 1 min, 1 a 2x ao dia",qty:"1 tubo"},
// ── PROTETOR GASTRICO ─────────────────────────────
{id:"omepra20",cat:"Protetor Gástrico",name:"Omeprazol 20mg",pos:"1 cápsula em jejum 30 min antes das refeições por 7 dias",qty:"10 cápsulas"},
// ── ANTIALERGICOS ─────────────────────────────────
{id:"lorata10",cat:"Antialérgico",name:"Loratadina 10mg",pos:"1 comprimido ao dia",qty:"1 frasco"},
{id:"loratasusp",cat:"Antialérgico",name:"Loratadina 1mg/mL xarope",pos:"5ml uma vez ao dia",qty:"1 frasco 100ml"},
{id:"dexclorf",cat:"Antialérgico",name:"Dexclorfeniramina (Polaramine) 2mg/5ml",pos:"5ml 3x ao dia por 5 dias",qty:"1 frasco 120ml"},
// ── OUTROS ────────────────────────────────────────
{id:"hemoblock",cat:"Hemostático",name:"Hemoblock 250mg",pos:"1 comprimido de 12/12h",qty:"1 Cx"},
{id:"floratil",cat:"Probiótico",name:"Floratil 200mg",pos:"1 cápsula ao dia por 5 dias",qty:"1 Cx"},
{id:"florent200",cat:"Probiótico",name:"Florent 200mg",pos:"1 cápsula ao dia por 6 dias",qty:"1 Cx"},
{id:"dimenid",cat:"Antiemético",name:"Dimenidrinato (Dramin) 100mg",pos:"1 comprimido 1h antes da consulta",qty:"1 Cx"},
{id:"complexob",cat:"Vitamínico",name:"Complexo B",pos:"1 comprimido de 12/12h por 30 dias",qty:"1 Cx"},
{id:"citoneurin",cat:"Vitamínico",name:"Citoneurin (Vitamina B12)",pos:"1 comprimido de 12/12h por 10 dias",qty:"1 Cx"},
{id:"carbamaz",cat:"Neurológico",name:"Carbamazepina 200mg",pos:"1 comprimido via oral por 30 dias",qty:"1 Cx"},
{id:"etna",cat:"Neurológico",name:"Etna",pos:"1 comprimido de 12/12h por 30 dias",qty:"1 Cx"},
{id:"diprospan",cat:"Corticóide Injetável",name:"Diprospan 1 ampola IM",pos:"Aplicar 1 ampola intramuscular",qty:"1 ampola"},
{id:"protese_corega",cat:"Prótese",name:"Ultra Corega / Corega Gel",pos:"Aplicar na parte interna posterior da prótese",qty:"1 bisnaga"},
{id:"listerine",cat:"Antisséptico",name:"Listerine Cool Blue",pos:"Bochechar após a escovação",qty:"1 frasco"},
];

function Receituario({pats,dents,user}){
var [patId,setPatId]=useState("");
var [dentId,setDentId]=useState(String(user.level===1&&user.dentistId?user.dentistId:dents[0]&&dents[0].id||""));
var [cat,setCat]=useState("Todos");
var [busca,setBusca]=useState("");
var [sel,setSel]=useState([]);
var [extra,setExtra]=useState([]);
var [addMod,setAddMod]=useState(false);
var [mf,setMf]=useState({name:"",cat:"Outros",pos:"",qty:""});
var [obs,setObs]=useState("");
var pat=pats.find(function(p){return p.id===Number(patId);});
var dent=dents.find(function(d){return d.id===Number(dentId);})||dents[0];
var allMeds=MEDS_BASE.concat(extra);
var cats=["Todos"].concat([...new Set(allMeds.map(function(m){return m.cat;}))]);
var filt=allMeds.filter(function(m){var okCat=cat==="Todos"||m.cat===cat;var q=busca.toLowerCase().trim();var okBusca=!q||m.name.toLowerCase().indexOf(q)>=0;return okCat&&okBusca;});
var tog=function(med){setSel(function(prev){return prev.find(function(m){return m.id===med.id;})?prev.filter(function(m){return m.id!==med.id;}):[...prev,{...med,posEdit:med.pos,qtyEdit:med.qty}];});};
var updSel=function(id,k,v){setSel(function(prev){return prev.map(function(m){return m.id===id?{...m,[k]:v}:m;});});};
var saveExtra=function(){
if(!mf.name||!mf.pos){alert("Informe nome e posologia");return;}
setExtra(function(prev){return[...prev,{...mf,id:"x_"+Date.now()}];});
setAddMod(false);setMf({name:"",cat:"Outros",pos:"",qty:""});
};
var [showPrint,setShowPrint]=useState(false);

var doPrint=function(){
if(!sel.length&&!obs){return;}
setShowPrint(true);
};

return (

<div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
<h2 style={{fontFamily:"'Cormorant Garamond'",fontSize:26,margin:0}}>Receituário</h2>
<Btn ch="+ Nova Medicação" sm onClick={function(){setAddMod(true);}}/>
</div>

{addMod&&(

<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
<div style={{background:"var(--surface)",borderRadius:16,width:"100%",maxWidth:460,boxShadow:"0 16px 48px rgba(0,0,0,.2)"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:"1px solid "+G.border}}>
<span style={{fontWeight:700,fontSize:16}}>Nova Medicação</span>
<button onClick={function(){setAddMod(false);}} style={{border:"none",background:"none",fontSize:22,cursor:"pointer",color:G.muted}}>{"×"}</button>
</div>
<div style={{padding:18,display:"flex",flexDirection:"column",gap:11}}>
<Inp lb="Nome *" val={mf.name} set={function(v){setMf(function(p){return{...p,name:v};});}} ph="Ex: Amoxicilina 500mg"/>
<Sel lb="Categoria" val={mf.cat} set={function(v){setMf(function(p){return{...p,cat:v};});}} opts={["Antibiótico","Anti-inflamatório","Analgésico","Corticóide","Antisséptico","Protetor Gástrico","Outros"].map(function(c){return{v:c,l:c};})}/>
<div style={{display:"flex",flexDirection:"column",gap:4}}>
<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Posologia *</label>
<textarea value={mf.pos} onChange={function(e){setMf(function(p){return{...p,pos:e.target.value};});}} rows={2} placeholder="Ex: 1 comprimido de 8/8h por 7 dias" style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"8px 11px",fontSize:13,outline:"none",resize:"vertical",fontFamily:"'Manrope'"}}/>
</div>
<Inp lb="Quantidade" val={mf.qty} set={function(v){setMf(function(p){return{...p,qty:v};});}} ph="Ex: 21 comprimidos"/>
<div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:"1px solid "+G.border}}>
<Btn ch="Cancelar" v="g" onClick={function(){setAddMod(false);}}/>
<Btn ch="Salvar" onClick={saveExtra}/>
</div>
</div>
</div>
</div>
)}

<R2 a={<PatSearch lb="Paciente" val={patId} set={setPatId} pats={pats}/>} b={<Sel lb="Dentista" val={dentId} set={setDentId} opts={dents.map(function(d){return{v:String(d.id),l:d.name};})}/>}/>

  <div style={{display:"flex",flexDirection:"column",gap:4}}>
    <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Buscar medicação</label>
    <div style={{position:"relative"}}>
      <input value={busca} onChange={function(e){setBusca(e.target.value);}} placeholder="🔍 Digite o nome (ex: amoxicilina)..." style={{width:"100%",border:"1.5px solid "+(busca?G.primary:G.border),borderRadius:10,padding:"10px 38px 10px 13px",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
      {busca&&<button onClick={function(){setBusca("");}} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",border:"none",background:G.border,borderRadius:"50%",width:22,height:22,color:G.muted,cursor:"pointer",fontSize:13,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>{"✕"}</button>}
    </div>
  </div>

  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
    {cats.map(function(c){return(
      <button key={c} onClick={function(){setCat(c);}} style={{border:"2px solid "+(cat===c?G.primary:G.border),background:cat===c?G.primary:"var(--card)",color:cat===c?"#fff":G.muted,borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{c}</button>
    );})}
  </div>

  <div style={{display:"flex",flexDirection:"column",gap:6}}>
    {filt.length===0&&<div style={{textAlign:"center",padding:"24px",color:G.muted,fontSize:13,background:G.bg,borderRadius:10}}>Nenhuma medicação encontrada para "{busca}"</div>}
    {filt.map(function(med){
      var s=sel.find(function(m){return m.id===med.id;});
      var isX=extra.some(function(m){return m.id===med.id;});
      return(
        <div key={med.id} style={{background:s?G.primary+"12":G.bg,border:"1.5px solid "+(s?G.primary:G.border),borderRadius:10,padding:"9px 13px"}}>
          <div style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}} onClick={function(){tog(med);}}>
            <input type="checkbox" checked={!!s} onChange={function(){}} style={{accentColor:G.primary,width:16,height:16,flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13,color:s?G.primary:G.text}}>
                {med.name}
                {isX&&<span style={{fontSize:10,background:G.blue+"20",color:G.blue,borderRadius:10,padding:"1px 7px",marginLeft:6,fontWeight:700}}>personalizado</span>}
              </div>
              <div style={{fontSize:11,color:G.muted}}>{med.cat}</div>
            </div>
            {isX&&<button onClick={function(e){e.stopPropagation();setExtra(function(prev){return prev.filter(function(m){return m.id!==med.id;});});setSel(function(prev){return prev.filter(function(m){return m.id!==med.id;});});}} style={{border:"none",background:G.red,color:"#fff",borderRadius:6,padding:"2px 7px",fontSize:10,cursor:"pointer"}}>{"✕"}</button>}
          </div>
          {s&&(
            <div style={{marginTop:9,display:"flex",flexDirection:"column",gap:6}} onClick={function(e){e.stopPropagation();}}>
              <label style={{fontSize:11,fontWeight:700,color:G.muted}}>POSOLOGIA (editável):</label>
              <textarea value={s.posEdit} onChange={function(e){updSel(med.id,"posEdit",e.target.value);}} rows={2} style={{border:"1.5px solid "+G.primary,borderRadius:7,padding:"6px 10px",fontSize:12,outline:"none",resize:"vertical",fontFamily:"'Manrope'"}}/>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:11,fontWeight:700,color:G.muted,flexShrink:0}}>QTD:</span>
                <input value={s.qtyEdit} onChange={function(e){updSel(med.id,"qtyEdit",e.target.value);}} style={{border:"1.5px solid "+G.border,borderRadius:7,padding:"5px 9px",fontSize:12,outline:"none",flex:1}}/>
              </div>
            </div>
          )}
        </div>
      );
    })}
  </div>

  <div style={{display:"flex",flexDirection:"column",gap:4}}>
    <label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Observações adicionais</label>
    <textarea value={obs} onChange={function(e){setObs(e.target.value);}} rows={2} placeholder="Orientações extras..." style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"8px 11px",fontSize:13,outline:"none",resize:"vertical",fontFamily:"'Manrope'"}}/>
  </div>

{sel.length>0&&(

<div style={{background:G.accent,borderRadius:10,padding:"10px 14px"}}>
<div style={{fontWeight:700,fontSize:12,color:G.primary,marginBottom:5}}>{"Selecionados: "+sel.length}</div>
{sel.map(function(m){return <div key={m.id} style={{fontSize:12,color:G.text,marginBottom:2}}>{"• "+m.name}</div>;})}
</div>
)}

{showPrint&&(function(){
var hoje=new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"});
var meds_int=sel.filter(function(m){return m.cat!=="Antisséptico";});
var meds_ext=sel.filter(function(m){return m.cat==="Antisséptico";});
var nomePac=pat&&pat.name||"--";
var nomeDent=dent&&dent.name||"Dr. Diego Affonso";
var croDent="CRO "+(dent&&dent.cro||"SP-72.278");
return(

<div style={{position:"fixed",inset:0,zIndex:9999,background:"var(--amber-soft)",overflowY:"auto",display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 16px"}}>
  {/* Print styles injected */}
  <style dangerouslySetInnerHTML={{__html:"@media print{@page{size:A4 portrait;margin:0} *{-webkit-print-color-adjust:exact;print-color-adjust:exact} .no-print{display:none!important} .print-page{box-shadow:none!important;max-width:100%!important;width:100%!important;padding:20mm 25mm!important;min-height:297mm!important;box-sizing:border-box!important} body,html{margin:0!important;padding:0!important;height:auto!important} .print-wrapper{padding:0!important;margin:0!important;background:none!important}}"}}/>
  {/* Action buttons - hidden on print */}
  <div className="no-print" style={{display:"flex",gap:12,marginBottom:20,width:"100%",maxWidth:520}}>
    <button onClick={function(){setShowPrint(false);}} style={{flex:1,padding:"12px",border:"1.5px solid #ccc",borderRadius:10,background:"var(--surface)",fontSize:14,fontWeight:700,cursor:"pointer"}}>← Voltar</button>
    <button onClick={function(){
  var nomePac2=pat&&pat.name||"--";
  var nomeDent2=dent&&dent.name||"Dr. Diego Affonso";
  var cro2="CRO "+(dent&&dent.cro||"SP-72.278");
  var hoje2=new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"});
  var meds_int2=sel.filter(function(m){return m.cat!=="Antisséptico";});
  var meds_ext2=sel.filter(function(m){return m.cat==="Antisséptico";});
  var html="<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width'><style>";
  html+="@page{size:A4 portrait;margin:15mm 20mm}";
  html+="*{box-sizing:border-box;margin:0;padding:0}";
  html+="body{font-family:Georgia,serif;background:#fff;color:#222;-webkit-print-color-adjust:exact}";
  html+="a,a:link{display:none!important}";
  html+=".page{width:100%;min-height:227mm;display:flex;flex-direction:column;padding:0}";
  html+=".header{text-align:center;margin-bottom:18px}";
  html+=".header h1{font-size:14pt;letter-spacing:4px;color:#8B6914;text-transform:uppercase;font-weight:normal;margin-bottom:4px}";
  html+=".header h2{font-size:9pt;letter-spacing:3px;color:#999;text-transform:uppercase;font-weight:normal}";
  html+=".header hr{border:none;border-top:1.5px solid #C9A84C;margin:10px 0}";
  html+=".para{font-size:12pt;margin-bottom:16px}";
  html+=".section-title{font-size:9pt;font-weight:700;letter-spacing:2px;color:#8B6914;text-transform:uppercase;margin-bottom:8px}";
  html+=".section-hr{border:none;border-top:0.5px solid #C9A84C;margin-bottom:14px}";
  html+=".med{display:flex;gap:8px;margin-bottom:16px}";
  html+=".med-num{font-size:13pt;font-weight:700;color:#8B6914;min-width:22px}";
  html+=".med-name{font-size:13pt;font-weight:700;color:#111}";
  html+=".med-qty{font-size:11pt;color:#888;margin-left:8px}";
  html+=".med-pos{font-size:12pt;color:#444;margin-top:5px;line-height:1.5}";
  html+=".obs{background:#f9f6ef;border-left:3px solid #C9A84C;padding:10px 14px;margin-top:12px;font-size:11pt}";
  html+=".footer{margin-top:auto;padding-top:60px;text-align:center;border-top:1.5px solid #C9A84C}";
  html+=".footer .dent-name{font-size:15pt;font-weight:700;color:#222;margin-bottom:5px}";
  html+=".footer .cro{font-size:12pt;color:#888;margin-bottom:8px}";
  html+=".footer .date{font-size:13pt;color:#666;font-style:italic}";
  html+=".footer .addr{font-size:10pt;color:#aaa;margin-top:6px}";
  html+="</style></head><body><div class='page'>";
  html+="<div class='header'><h1>Affonso Odontologia</h1><h2>Clinica Especializada</h2><hr/></div>";
  html+="<div class='para'>Para: <strong>"+nomePac2+"</strong></div>";
  if(meds_int2.length>0){
    html+="<div class='section-title'>Uso Interno</div><hr class='section-hr'/>";
    meds_int2.forEach(function(m,i){
      html+="<div class='med'><div class='med-num'>"+(i+1)+".</div><div><span class='med-name'>"+m.name+"</span>";
      if(m.qtyEdit)html+="<span class='med-qty'>-- "+m.qtyEdit+"</span>";
      html+="<div class='med-pos'>"+m.posEdit+"</div></div></div>";
    });
  }
  if(meds_ext2.length>0){
    html+="<div class='section-title' style='margin-top:16px'>Uso Externo</div><hr class='section-hr'/>";
    meds_ext2.forEach(function(m,i){
      html+="<div class='med'><div class='med-num'>"+(i+1)+".</div><div><span class='med-name'>"+m.name+"</span>";
      if(m.qtyEdit)html+="<span class='med-qty'>-- "+m.qtyEdit+"</span>";
      html+="<div class='med-pos'>"+m.posEdit+"</div></div></div>";
    });
  }
  if(obs)html+="<div class='obs'>"+obs+"</div>";
  html+="<div class='footer'><div class='dent-name'>"+nomeDent2+"</div><div class='cro'>"+cro2+"</div><div class='date'>Sao Paulo, "+hoje2+"</div><div class='addr'>Rua Sabbado D Angelo, 1980 - Itaquera | Tel. 2524-9975</div></div>";
  html+="</div></body></html>";
  var blob=new Blob([html],{type:"text/html"});
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");
  a.href=url;a.target="_blank";a.rel="noreferrer";
  document.body.appendChild(a);a.click();
  setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},1000);
}} style={{flex:2,padding:"12px",background:"var(--primary)",color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer"}}>{"🖨️ Imprimir — desmarque Cabeçalhos e rodapés"}</button>
  </div>
  {/* Receipt page */}
  <div className="print-page" style={{background:"var(--card)",width:"100%",maxWidth:794,padding:"32px 48px",borderRadius:4,boxShadow:"0 2px 20px rgba(0,0,0,.1)",minHeight:1050,display:"flex",flexDirection:"column"}}>
    {/* Header */}
    <div style={{textAlign:"center",marginBottom:20}}>
      <div style={{fontSize:14,letterSpacing:4,color:"#8B6914",textTransform:"uppercase",marginBottom:6}}>Affonso Odontologia</div>
      <div style={{fontSize:12,letterSpacing:3,color:"var(--muted)",textTransform:"uppercase"}}>Clínica Especializada</div>
      <hr style={{border:"1px solid #C9A84C",margin:"12px 0"}}/>
    </div>
    {/* Patient */}
    <div style={{marginBottom:16,fontSize:15}}>
      <span style={{color:"var(--muted)"}}>Para: </span>
      <strong>{nomePac}</strong>
    </div>
    {/* Uso Interno */}
    {meds_int.length>0&&<>
      <div style={{fontSize:13,fontWeight:700,letterSpacing:2,color:"#8B6914",marginBottom:14,textTransform:"uppercase"}}>USO INTERNO</div>
      <hr style={{border:".5px solid #C9A84C",marginBottom:16}}/>
      {meds_int.map(function(m,i){return(
        <div key={m.id} style={{marginBottom:20}}>
          <div style={{display:"flex",gap:8,alignItems:"baseline"}}>
            <span style={{fontSize:15,fontWeight:700,color:"#8B6914",minWidth:24}}>{i+1}.</span>
            <div>
              <span style={{fontSize:16,fontWeight:700,color:"var(--text)"}}>{m.name}</span>
              {m.qtyEdit&&<span style={{fontSize:14,color:"var(--muted)",marginLeft:10}}>-- {m.qtyEdit}</span>}
              <div style={{fontSize:14,color:"var(--text)",marginTop:5,lineHeight:1.6}}>{m.posEdit}</div>
            </div>
          </div>
        </div>
      );})}
    </>}
    {/* Uso Externo */}
    {meds_ext.length>0&&<>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:"#8B6914",margin:"16px 0 12px",textTransform:"uppercase"}}>USO EXTERNO</div>
      <hr style={{border:".5px solid #C9A84C",marginBottom:16}}/>
      {meds_ext.map(function(m,i){return(
        <div key={m.id} style={{marginBottom:20}}>
          <div style={{display:"flex",gap:8,alignItems:"baseline"}}>
            <span style={{fontSize:15,fontWeight:700,color:"#8B6914",minWidth:24}}>{i+1}.</span>
            <div>
              <span style={{fontSize:16,fontWeight:700,color:"var(--text)"}}>{m.name}</span>
              {m.qtyEdit&&<span style={{fontSize:14,color:"var(--muted)",marginLeft:10}}>-- {m.qtyEdit}</span>}
              <div style={{fontSize:14,color:"var(--text)",marginTop:5,lineHeight:1.6}}>{m.posEdit}</div>
            </div>
          </div>
        </div>
      );})}
    </>}
    {/* Obs */}
    {obs&&<div style={{background:"var(--amber-soft)",borderLeft:"3px solid #C9A84C",padding:"10px 14px",marginTop:12,fontSize:13,color:"var(--muted)"}}>{obs}</div>}
    {/* Footer */}
    <div style={{marginTop:"auto",paddingTop:50,paddingBottom:10,textAlign:"center",borderTop:"2px solid #C9A84C"}}>
      <div style={{fontSize:17,fontWeight:700,color:"var(--text)"}}>{nomeDent}</div>
      <div style={{fontSize:13,color:"var(--muted)",marginTop:5}}>{croDent}</div>
      <div style={{fontSize:14,color:"var(--muted)",marginTop:10,fontStyle:"italic"}}>{"São Paulo, "+hoje}</div>
    </div>
  </div>
</div>
);})()}
  <button onClick={doPrint} disabled={!sel.length&&!obs} style={{background:sel.length||obs?G.primary:"var(--muted)",color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:15,fontWeight:700,cursor:sel.length||obs?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
    {"📋 Enviar para Secretária"}
  </button>
</div>

);
}

// ══════════════════════════════════════════════════════════
// PAINEL RECEBIMENTOS DENTISTA
// Regras:
// 1. Dentista recebe 40% de comissao
// 2. Taxa cartao credito: 3.5% sobre a COMISSAO do dentista
// 3. Taxa cartao debito: 2% sobre a COMISSAO do dentista
// 4. Liberacao: procedimento CONCLUIDO + 100% do valor pago pela clinica
// 5. Amortizacao: pagamentos alocados do maior pro menor procedimento
//    ate cobrir 100% - so libera no mes em que o 100% e atingido
// ══════════════════════════════════════════════════════════
function PainelDentista({pats,dents,treats,user,setTreats}){
var isDent=user.level===1;
var myDents=isDent?dents.filter(function(d){return d.id===user.dentistId;}):dents;
var [selDent,setSelDent]=useState(String(myDents[0]&&myDents[0].id||""));
var [mo,setMo]=useState(today().slice(0,7));
var dent=dents.find(function(d){return d.id===Number(selDent);})||dents[0];
var COMM=(dent&&dent.commission||40)/100;

// Coletar todos os procedimentos com baixa do dentista selecionado
var items=[];
(treats||[]).forEach(function(treat){
  var dentId=Number(selDent);
  (treat.items||[]).forEach(function(it,idx){
    if(!(it.done||it.paid))return;
    // Determinar de FORMA UNICA o dentista responsavel pela baixa
    var responsavelId=null;
    if(it.doneByDentistId!=null){
      responsavelId=Number(it.doneByDentistId);
    } else if(it.doneBy){
      var foundDent=dents.find(function(dd){return dd.name===it.doneBy;});
      if(foundDent)responsavelId=foundDent.id;
    } else if(treat.dentistId){
      // Fallback: itens antigos sem doneBy - usa dentistId do plano
      responsavelId=Number(treat.dentistId);
    }
    if(responsavelId!==dentId)return;
    var baixaDate=it.doneDate||"";
    var baixaMo=baixaDate.slice(0,7);
    var recebido=it.recebido||false;
    if(!baixaMo)return;
    if(baixaMo>mo)return;             // baixa em mes futuro: nao mostra
    if(baixaMo<mo&&recebido)return;   // mes anterior ja recebido: fica so no historico do mes dele
    var pat=pats.find(function(x){return x.id===treat.patientId;});
    var val=Number(it.value||0);
    items.push({
      key:treat.id+"-"+idx,
      treatId:treat.id,
      itemIdx:idx,
      patName:pat&&pat.name||"—",
      proc:it.desc||treat.name||"Procedimento",
      valor:val,
      comissao:val*COMM,
      baixaDate:baixaDate,
      baixaMo:baixaMo,
      atrasado:baixaMo<mo,
      pago:it.recebido||false,
      pagoDate:it.recebidoDate||"",
    });
  });
});

items.sort(function(a,b){return (a.patName||"").localeCompare(b.patName||"","pt");});

var totalComissao=items.reduce(function(s,i){return s+i.comissao;},0);
var totalPago=items.filter(function(i){return i.pago;}).reduce(function(s,i){return s+i.comissao;},0);
var totalPendente=totalComissao-totalPago;

var marcarPago=function(key,pago){
  var parts=key.split("-");
  var treatId=Number(parts[0]);
  var itemIdx=Number(parts[1]);
  var hoje=today();
  setTreats(function(prev){return prev.map(function(t){
    if(t.id!==treatId)return t;
    return {...t,_ts:Date.now(),items:t.items.map(function(it,i){
      if(i!==itemIdx)return it;
      return {...it,recebido:pago,recebidoDate:pago?hoje:""};
    })};
  });});
};

return(
<div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
    <h2 style={{fontFamily:"'Cormorant Garamond'",fontSize:26,margin:0}}>{"💰 Recebimentos"}</h2>
    {!isDent&&<select value={selDent} onChange={function(e){setSelDent(e.target.value);}} style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"8px 12px",fontSize:13,outline:"none",background:"var(--surface)"}}>
      {myDents.map(function(d){return <option key={d.id} value={String(d.id)}>{d.name}</option>;})}
    </select>}
  </div>

  <div style={{display:"flex",gap:8,alignItems:"center"}}>
    <input type="month" value={mo} onChange={function(e){setMo(e.target.value);}}
      style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"8px 12px",fontSize:14,outline:"none",flex:1}}/>
  </div>

  {/* Resumo */}
  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
    {[["Total Comissão",totalComissao,G.primary],["Pago",totalPago,G.success],["Pendente",totalPendente,G.red]].map(function(row){return(
      <div key={row[0]} style={{background:G.card,borderRadius:12,padding:"11px 8px",textAlign:"center",borderTop:"3px solid "+row[2],boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
        <div style={{fontSize:9,color:G.muted,fontWeight:700,textTransform:"uppercase",marginBottom:3}}>{row[0]}</div>
        <div style={{fontSize:16,fontWeight:700,color:row[2]}}>{cur(row[1])}</div>
      </div>
    );})}
  </div>

  {/* Lista de procedimentos */}
  {items.length===0&&<div style={{background:G.card,borderRadius:12,padding:30,textAlign:"center",color:G.muted,fontSize:13,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
    Nenhum procedimento realizado neste mês
  </div>}

  <div style={{display:"flex",flexDirection:"column",gap:8}}>
    {items.map(function(item){return(
      <div key={item.key} style={{background:G.card,borderRadius:12,padding:"13px 15px",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",borderLeft:"4px solid "+(item.pago?G.success:item.atrasado?G.red:G.orange),opacity:item.pago?0.75:1}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {/* Checkbox admin */}
          {!isDent&&<div onClick={function(){marcarPago(item.key,!item.pago);}}
            style={{width:26,height:26,borderRadius:6,border:"2px solid "+(item.pago?G.success:G.border),background:item.pago?G.success:"var(--card)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,transition:"all .15s"}}>
            {item.pago&&<span style={{color:"#fff",fontSize:14,fontWeight:700}}>✓</span>}
          </div>}
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><span style={{fontWeight:700,fontSize:14,color:G.text}}>{item.patName}</span>{item.atrasado&&<span style={{background:G.red+"20",color:G.red,borderRadius:6,padding:"1px 7px",fontSize:10,fontWeight:700}}>{"⚠ Mês anterior"}</span>}</div>
            <div style={{fontSize:13,color:G.primary,fontWeight:600,marginTop:1}}>{item.proc}</div>
            <div style={{fontSize:11,color:item.atrasado?G.red:G.muted,marginTop:2,fontWeight:item.atrasado?700:400}}>{"Baixa: "+fmt(item.baixaDate)+(item.atrasado?" (pendente)":"")}</div>
            {item.pago&&item.pagoDate&&<div style={{fontSize:11,color:G.success,fontWeight:600,marginTop:2}}>{"✓ Pago em "+fmt(item.pagoDate)}</div>}
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:11,color:G.muted}}>{"Valor: "+cur(item.valor)}</div>
            <div style={{fontSize:17,fontWeight:700,color:item.pago?G.success:G.primary}}>{cur(item.comissao)}</div>
            <div style={{fontSize:10,color:G.muted}}>{"40% comissão"}</div>
          </div>
        </div>
      </div>
    );})}
  </div>

  {items.length>0&&<div style={{background:G.primary,borderRadius:12,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
    <span style={{color:"#fff",fontWeight:700,fontSize:14}}>{"Total "+mo}</span>
    <span style={{color:"#fff",fontWeight:700,fontSize:20}}>{cur(totalComissao)}</span>
  </div>}
</div>
);
}
function WAAnamneseModal({pat,onClose}){
const [sent,setSent]=useState(false);
const send=function(){
const link=(window.location.origin+window.location.pathname)+"?anam="+encodeURIComponent(btoa("orbe:"+pat.id));
const msg="Ola, "+pat.name+"! 😊\n\nPara seu atendimento na Affonso Odontologia, clique no link abaixo e preencha sua ficha de saude. Sao perguntas com botoes SIM e NAO, leva menos de 2 minutos!\n\n"+link+"\n\nObrigado! 🦷 Affonso Odontologia";
wa(pat.phone,msg);setSent(true);
};
return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>

<div style={{background:"var(--surface)",borderRadius:18,width:"100%",maxWidth:420,boxShadow:"0 8px 32px rgba(0,0,0,.2)"}}>
<div style={{background:"#075E54",borderRadius:"18px 18px 0 0",padding:"14px 18px",display:"flex",alignItems:"center",gap:10}}>
<span style={{fontSize:20}}>{"📋"}</span>
<div style={{flex:1}}><div style={{fontWeight:700,color:"#fff",fontSize:14}}>Anamnese por WhatsApp</div><div style={{fontSize:11,color:"rgba(255,255,255,.8)"}}>{pat.name}</div></div>
<button onClick={onClose} style={{border:"none",background:"rgba(255,255,255,.2)",borderRadius:8,color:"#fff",cursor:"pointer",padding:"5px 10px",fontSize:16}}>{"X"}</button>
</div>
<div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
{!sent?<div style={{display:"flex",flexDirection:"column",gap:12}}>
<p style={{fontSize:13,color:"var(--muted)",margin:0}}>Envia um link para <strong>{pat.name}</strong> preencher a ficha de saude pelo celular com botoes SIM e NAO.</p>
<div style={{background:"var(--green-soft)",borderRadius:10,padding:"10px 12px",fontSize:11,color:"var(--primary)",wordBreak:"break-all",fontWeight:600}}>{(window.location.origin+window.location.pathname)+"?anam="+encodeURIComponent(btoa("orbe:"+pat.id))}</div>
<button onClick={send} style={{background:"#25D366",color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:15,fontWeight:700,cursor:"pointer"}}>{"📱 Enviar por WhatsApp"}</button>
<button onClick={onClose} style={{background:"none",border:"1.5px solid #ddd",borderRadius:10,padding:"10px",fontSize:13,cursor:"pointer",color:"var(--muted)"}}>Cancelar</button>
</div>:<div style={{textAlign:"center",display:"flex",flexDirection:"column",gap:12}}>
<div style={{fontSize:48}}>{"✅"}</div>
<div style={{fontWeight:700,fontSize:16,color:"#27AE60"}}>Link enviado!</div>
<div style={{fontSize:13,color:"var(--muted)"}}>O paciente recebeu o link. Quando preencher, marque as respostas na aba Anamnese.</div>
<button onClick={onClose} style={{background:"var(--primary)",color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:15,fontWeight:700,cursor:"pointer"}}>Fechar</button>
</div>}
</div>
</div>

  </div>;
}

function IARX({pat,onClose}){
const [img,setImg]=useState(null);
const [imgData,setImgData]=useState(null);
const [result,setResult]=useState("");
const [loading,setLoading]=useState(false);
const onFile=function(e){
const f=e.target.files[0];if(!f)return;
const r=new FileReader();
r.onload=function(ev){setImgData(ev.target.result.split(",")[1]);setImg(ev.target.result);};
r.readAsDataURL(f);
};
const analyze=async function(){
if(!imgData)return;setLoading(true);setResult("");
try{
const resp=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,system:"Você é especialista em radiologia odontológica. Analise o raio-X e descreva: estruturas visíveis, achados e sugestões clínicas.",messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:"image/jpeg",data:imgData}},{type:"text",text:"Analise este RX do paciente "+(pat&&pat.name||"")+"."}]}]})});
const data=await resp.json();
setResult(data.content&&data.content[0]&&data.content[0].text||"Não foi possível analisar.");
}catch(e){setResult("Erro de conexão.");}
setLoading(false);
};
return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>

<div style={{background:"var(--surface)",borderRadius:18,width:"100%",maxWidth:460,maxHeight:"90vh",overflow:"auto"}}>
<div style={{background:G.primary,borderRadius:"18px 18px 0 0",padding:"14px 18px",display:"flex",alignItems:"center",gap:10}}>
<span style={{fontSize:20}}>{"🦷"}</span>
<div style={{flex:1}}><div style={{fontWeight:700,color:"#fff",fontSize:14}}>{"Análise de RX com IA"}</div><div style={{fontSize:11,color:"rgba(255,255,255,.8)"}}>{pat&&pat.name}</div></div>
<button onClick={onClose} style={{border:"none",background:"rgba(255,255,255,.2)",borderRadius:8,color:"#fff",cursor:"pointer",padding:"5px 10px",fontSize:16}}>{"x"}</button>
</div>
<div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
<div style={{border:"2px dashed "+G.border,borderRadius:12,padding:20,textAlign:"center",cursor:"pointer",background:G.bg}} onClick={function(){document.getElementById("rx-up").click();}}>
{img?<img src={img} style={{maxWidth:"100%",maxHeight:180,borderRadius:8}} alt="RX"/>:<div><div style={{fontSize:32}}>{"📷"}</div><div style={{fontSize:13,color:G.muted}}>{"Toque para selecionar o RX"}</div></div>}
</div>
<input id="rx-up" type="file" accept="image/*" style={{display:"none"}} onChange={onFile}/>
{img&&!result&&<button onClick={analyze} disabled={loading} style={{background:G.primary,color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:15,fontWeight:700,cursor:"pointer",opacity:loading?.7:1}}>{loading?"Analisando...":"Analisar com IA"}</button>}
{result&&<div style={{background:G.bg,borderRadius:12,padding:"14px 16px"}}><div style={{fontWeight:700,fontSize:13,color:G.primary,marginBottom:8}}>{"Resultado:"}</div><div style={{fontSize:13,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{result}</div></div>}
</div>
</div>

  </div>;
}

function CancelWA({appt,pat,onCancel,onClose}){
const [done,setDone]=useState(false);
const doIt=function(){
onCancel(appt.id);
wa(pat.phone,"Olá, "+pat.name+"! Sua consulta de "+fmt(appt.date)+" às "+appt.time+" foi cancelada. Gostaria de reagendar? Responda SIM que entraremos em contato. Affonso Odontologia");
setDone(true);
};
return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>

<div style={{background:"var(--surface)",borderRadius:18,width:"100%",maxWidth:380}}>
<div style={{background:G.red,borderRadius:"18px 18px 0 0",padding:"14px 18px",display:"flex",alignItems:"center",gap:10}}>
<span style={{fontSize:20}}>{"❌"}</span>
<div style={{flex:1,fontWeight:700,color:"#fff",fontSize:14}}>Cancelar Consulta</div>
<button onClick={onClose} style={{border:"none",background:"rgba(255,255,255,.2)",borderRadius:8,color:"#fff",cursor:"pointer",padding:"5px 10px",fontSize:16}}>{"x"}</button>
</div>
<div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
{!done?<div style={{display:"flex",flexDirection:"column",gap:12}}>
<div style={{background:G.bg,borderRadius:10,padding:"10px 12px"}}><div style={{fontWeight:700,fontSize:13}}>{pat&&pat.name}</div><div style={{fontSize:12,color:G.muted}}>{fmt(appt&&appt.date)+" às "+(appt&&appt.time)+" · "+(appt&&appt.procedure)}</div></div>
<div style={{fontSize:12}}><div>{"✅ Desmarca da agenda"}</div><div>{"📱 Envia WA perguntando se quer reagendar"}</div><div>{"🔔 Recepcionista contata se responder SIM"}</div></div>
<button onClick={doIt} style={{background:G.red,color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:15,fontWeight:700,cursor:"pointer"}}>Confirmar</button>
<button onClick={onClose} style={{background:"none",border:"1.5px solid "+G.border,borderRadius:10,padding:"10px",fontSize:13,cursor:"pointer",color:G.muted}}>Voltar</button>
</div>:<div style={{textAlign:"center",display:"flex",flexDirection:"column",gap:12,padding:"10px 0"}}>
<div style={{fontSize:48}}>{"✅"}</div>
<div style={{fontWeight:700,fontSize:16,color:G.success}}>Cancelado!</div>
<div style={{fontSize:13,color:G.muted}}>WA enviado. Se responder SIM a recepcionista entra em contato.</div>
<button onClick={onClose} style={{background:G.primary,color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:15,fontWeight:700,cursor:"pointer"}}>Fechar</button>
</div>}
</div>
</div>

  </div>;
}

function RemarcarModal({appt,pats,dents,onSave,onClose}){
var p=pats.find(function(x){return x.id===appt.patientId;});
var d=dents.find(function(x){return x.id===appt.dentistId;})||dents[0];
var [motivo,setMotivo]=useState("");
var [outro,setOutro]=useState("");
return(

<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
<div style={{background:"var(--surface)",borderRadius:18,width:"100%",maxWidth:420,boxShadow:"0 8px 32px rgba(0,0,0,.2)"}}>
<div style={{background:G.red,borderRadius:"18px 18px 0 0",padding:"14px 18px",display:"flex",alignItems:"center",gap:10}}>
<span style={{fontSize:20}}>{"📋"}</span>
<div style={{flex:1,color:"#fff"}}><div style={{fontWeight:700,fontSize:14}}>Motivo do Não Agendamento</div><div style={{fontSize:11,opacity:.8}}>{p&&p.name}</div></div>
<button onClick={onClose} style={{border:"none",background:"rgba(255,255,255,.2)",borderRadius:8,color:"#fff",cursor:"pointer",padding:"5px 10px"}}>{"X"}</button>
</div>
<div style={{padding:20,display:"flex",flexDirection:"column",gap:10}}>
<div style={{fontSize:12,color:G.muted}}>{(appt.status==="missed"?"Faltou":"Cancelou")+" em "+fmt(appt.date)+" · "+appt.procedure}</div>
{MOTIVOS_REM.map(function(m){return(
<button key={m} onClick={function(){setMotivo(m);}} style={{border:"2px solid "+(motivo===m?G.red:G.border),background:motivo===m?"var(--red-soft)":"var(--card)",borderRadius:10,padding:"10px 14px",fontSize:13,fontWeight:motivo===m?700:400,cursor:"pointer",textAlign:"left",color:motivo===m?G.red:G.text}}>
{(motivo===m?"✓ ":"")+m}
</button>
);})}
{motivo==="Outros"&&<textarea value={outro} onChange={function(e){setOutro(e.target.value);}} rows={2} placeholder="Descreva o motivo..."
style={{border:"1.5px solid "+G.border,borderRadius:10,padding:"10px",fontSize:13,outline:"none",resize:"none",fontFamily:"sans-serif"}}/>}
<button onClick={function(){if(!motivo)return;onSave(motivo==="Outros"?outro||"Outros":motivo);onClose();}}
disabled={!motivo||(motivo==="Outros"&&!outro.trim())}
style={{background:motivo?G.primary:"var(--muted)",color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:15,fontWeight:700,cursor:motivo?"pointer":"not-allowed",marginTop:4}}>
{"Salvar Motivo"}
</button>
</div>
</div>
</div>
);
}

function RemarcarView({appts,setAppts,pats,dents,remarcar,setRemarcar,abrirFicha}){
var t=today();
var [selMot,setSelMot]=useState(null);
var [outroTxt,setOutroTxt]=useState("");
var [selRet,setSelRet]=useState(null); // V229: contatar depois
var [retData,setRetData]=useState("");
var [retMotivo,setRetMotivo]=useState("");
var pendentes=appts.filter(function(a){
if(a.status!=="cancelled"&&a.status!=="missed"&&a.status!=="rescheduled")return false;
if(a.noRebook)return false;
if(a.retorno&&a.retorno.date&&a.retorno.date>t)return false; // V229: retorno futuro sai dos pendentes
return !appts.some(function(b){return b.patientId===a.patientId&&b.id!==a.id&&b.date>a.date&&b.status!=="cancelled"&&b.status!=="missed"&&b.status!=="rescheduled";});
}).sort(function(a,b){var ra=(a.retorno&&a.retorno.date&&a.retorno.date<=t)?1:0;var rb=(b.retorno&&b.retorno.date&&b.retorno.date<=t)?1:0;if(ra!==rb)return rb-ra;return b.date.localeCompare(a.date);}); // V229: retorno vencido vai pro topo
// V229: lista de retornos agendados (contatar depois)
var retornos=appts.filter(function(a){
if(a.status!=="cancelled"&&a.status!=="missed"&&a.status!=="rescheduled")return false;
if(a.noRebook)return false;
if(!(a.retorno&&a.retorno.date))return false;
return !appts.some(function(b){return b.patientId===a.patientId&&b.id!==a.id&&b.date>a.date&&b.status!=="cancelled"&&b.status!=="missed"&&b.status!=="rescheduled";});
}).sort(function(a,b){return a.retorno.date.localeCompare(b.retorno.date);});
var historico=remarcar.sort(function(a,b){return b.date.localeCompare(a.date);});
var [aba,setAba]=useState("pendentes");
function setRet(apptId,dataRet,motivo){setAppts(function(prev){return prev.map(function(x){return x.id===apptId?{...x,_ts:Date.now(),retorno:{date:dataRet,motivo:(motivo||"").trim(),set:t}}:x;});});setSelRet(null);setRetData("");setRetMotivo("");} // V229
function clearRet(apptId){setAppts(function(prev){return prev.map(function(x){if(x.id!==apptId)return x;var y={...x,_ts:Date.now()};delete y.retorno;return y;});});setSelRet(null);} // V229
function addDias(n){var d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);} // V229
function diasAte(ds){return Math.round((new Date(ds+"T12:00:00")-new Date(t+"T12:00:00"))/86400000);} // V229
function marcarRem(apptId){setAppts(function(prev){return prev.map(function(x){return x.id===apptId?{...x,_ts:Date.now(),noRebook:true}:x;});});} // V234: carimbo _ts p/ a baixa vencer no mergeAppts
function registrar(appt,motivo){
var p=pats.find(function(x){return x.id===appt.patientId;});
setRemarcar(function(prev){return [...prev,{id:nid(),apptId:appt.id,patId:appt.patientId,patName:p&&p.name,proc:appt.procedure,apptDate:appt.date,status:appt.status,motivo:motivo,date:t}];});
marcarRem(appt.id);
}
function doWA(ph,msg){var a=document.createElement("a");a.href="https://wa.me/55"+ph.replace(/[^0-9]/g,"")+"?text="+encodeURIComponent(msg);a.target="_blank";document.body.appendChild(a);a.click();document.body.removeChild(a);}
return(

<div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">
<div style={{display:"flex",gap:4,background:G.bg,borderRadius:12,padding:4}}>
<button onClick={function(){setAba("pendentes");}} style={{flex:1,border:"none",borderRadius:9,padding:"9px 4px",fontSize:12,fontWeight:700,cursor:"pointer",background:aba==="pendentes"?"var(--card)":G.bg,color:aba==="pendentes"?G.red:G.muted,boxShadow:aba==="pendentes"?"0 1px 4px rgba(0,0,0,.1)":"none",position:"relative"}}>
{"⏳ Pendentes"}
{pendentes.length>0&&<span style={{position:"absolute",top:-3,right:4,background:G.red,color:"#fff",borderRadius:20,fontSize:9,fontWeight:700,padding:"1px 5px"}}>{pendentes.length}</span>}
</button>
<button onClick={function(){setAba("retornos");}} style={{flex:1,border:"none",borderRadius:9,padding:"9px 4px",fontSize:12,fontWeight:700,cursor:"pointer",background:aba==="retornos"?"var(--card)":G.bg,color:aba==="retornos"?"#1f5d8a":G.muted,boxShadow:aba==="retornos"?"0 1px 4px rgba(0,0,0,.1)":"none",position:"relative"}}>
{"⏰ Retornos"}
{retornos.length>0&&<span style={{position:"absolute",top:-3,right:4,background:"#1f5d8a",color:"#fff",borderRadius:20,fontSize:9,fontWeight:700,padding:"1px 5px"}}>{retornos.length}</span>}
</button>
<button onClick={function(){setAba("historico");}} style={{flex:1,border:"none",borderRadius:9,padding:"9px 4px",fontSize:12,fontWeight:700,cursor:"pointer",background:aba==="historico"?"var(--card)":G.bg,color:aba==="historico"?G.primary:G.muted,boxShadow:aba==="historico"?"0 1px 4px rgba(0,0,0,.1)":"none"}}>
{"📊 Histórico"}
</button>
</div>
{aba==="pendentes"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
{pendentes.length===0&&<div style={{textAlign:"center",padding:30,color:G.muted,fontSize:13,background:G.card,borderRadius:14}}>{"✅ Nenhum paciente pendente!"}</div>}
{pendentes.map(function(a){
var p=pats.find(function(x){return x.id===a.patientId;});
var d=dents&&dents.find(function(x){return x.id===a.dentistId;})||{name:"--"};
if(!p)return null;
var isMot=selMot===a.id;
return(
<div key={a.id} style={{background:G.card,borderRadius:14,padding:"12px 14px",boxShadow:"0 2px 8px rgba(0,0,0,.06)",borderLeft:"4px solid "+(a.retorno&&a.retorno.date&&a.retorno.date<=t?"#1f5d8a":a.status==="missed"?G.red:"#FF9800")}}>
<div onClick={function(){abrirFicha&&abrirFicha(p);}} title="Abrir ficha clínica" style={{fontWeight:700,fontSize:14,color:G.primary,cursor:"pointer",textDecoration:"underline",display:"inline-block"}}>{p.name}</div>
<div style={{fontSize:12,color:G.muted,marginTop:2}}>{a.procedure+" · "+d.name}</div>
<div style={{fontSize:11,fontWeight:600,color:a.status==="missed"?G.red:"#FF9800",marginBottom:10}}>{(a.status==="missed"?"🚫 Faltou":a.status==="rescheduled"?"🔄 Desmarcou":"❌ Cancelou")+" em "+fmt(a.date)}</div>
{a.retorno&&a.retorno.date&&a.retorno.date<=t&&<div style={{background:"#1f5d8a15",border:"1px solid #1f5d8a40",borderRadius:9,padding:"6px 10px",fontSize:11.5,fontWeight:700,color:"#1f5d8a",marginBottom:10}}>{"🔔 Retorno agendado pra "+(a.retorno.date===t?"HOJE":fmt(a.retorno.date))+(a.retorno.motivo?" · \""+a.retorno.motivo+"\"":"")}</div>}
{!isMot&&selRet!==a.id&&<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
{p.phone&&<button onClick={function(){doWA(p.phone,"Olá, "+p.name+"! Notamos que sua consulta de "+fmt(a.date)+" não foi realizada. Gostaria de remarcar? Responda SIM! Affonso Odontologia.");}} style={{background:"#25D366",color:"#fff",border:"none",borderRadius:8,padding:"6px 11px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{"📱 WA"}</button>}
<button onClick={function(){marcarRem(a.id);}} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"6px 11px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{"✅ Remarcado"}</button>
<button onClick={function(){registrar(a,"Tratamento finalizado");}} style={{background:"#00897B",color:"#fff",border:"none",borderRadius:8,padding:"6px 11px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{"🎓 Finalizou tratamento"}</button>
<button onClick={function(){setSelMot(a.id);setOutroTxt("");}} style={{background:"#FF9800",color:"#fff",border:"none",borderRadius:8,padding:"6px 11px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{"📝 Registrar Motivo"}</button>
<button onClick={function(){setSelMot(null);setSelRet(a.id);setRetData(addDias(14));setRetMotivo(a.retorno&&a.retorno.motivo||"");}} style={{background:"#4a7fa5",color:"#fff",border:"none",borderRadius:8,padding:"6px 11px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{a.retorno?"⏰ Adiar de novo":"⏰ Contatar depois"}</button>
</div>}
{selRet===a.id&&<div style={{display:"flex",flexDirection:"column",gap:6,marginTop:4}}>
<div style={{fontSize:12,fontWeight:700,color:G.muted}}>{"⏰ Contatar novamente em:"}</div>
<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
{[["+1 sem",7],["+2 sem",14],["+3 sem",21],["+1 mês",30]].map(function(ch){var dv=addDias(ch[1]);var on=retData===dv;return <button key={ch[1]} onClick={function(){setRetData(dv);}} style={{border:"1.5px solid "+(on?"#4a7fa5":G.border),background:on?"#4a7fa518":"var(--card)",color:on?"#1f5d8a":G.text,borderRadius:10,padding:"7px 11px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{ch[0]}</button>;})}
</div>
<input type="date" value={retData} min={t} onChange={function(e){setRetData(e.target.value);}} style={{border:"1.5px solid "+G.border,borderRadius:10,padding:"9px 10px",fontSize:13,outline:"none",fontFamily:"sans-serif",background:"var(--card)",color:G.text}}/>
<input type="text" value={retMotivo} onChange={function(e){setRetMotivo(e.target.value);}} placeholder="Motivo (opcional): viajando, cirurgia, pediu p/ mês que vem..." style={{border:"1.5px solid "+G.border,borderRadius:10,padding:"9px 10px",fontSize:13,outline:"none",fontFamily:"sans-serif",background:"var(--card)",color:G.text}}/>
<button onClick={function(){if(retData&&retData>t)setRet(a.id,retData,retMotivo);}} style={{background:"#4a7fa5",color:"#fff",border:"none",borderRadius:10,padding:"9px",fontSize:13,fontWeight:700,cursor:"pointer",opacity:retData&&retData>t?1:.5}}>{"Salvar → aba ⏰ Retornos"}</button>
<button onClick={function(){setSelRet(null);}} style={{background:"none",border:"none",color:G.muted,fontSize:12,cursor:"pointer",marginTop:2}}>Cancelar</button>
</div>}
{isMot&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
<div style={{fontSize:12,fontWeight:700,color:G.muted}}>Por que não será remarcado?</div>
{MOTIVOS_REM.map(function(m){return(
<button key={m} onClick={function(){if(m!=="Outros"){registrar(a,m);}else{setOutroTxt(" ");}}} style={{border:"1.5px solid "+(outroTxt&&m==="Outros"?G.red:G.border),background:outroTxt&&m==="Outros"?"var(--red-soft)":"var(--card)",borderRadius:10,padding:"8px 12px",fontSize:12,cursor:"pointer",textAlign:"left",color:G.text,fontWeight:400}}>
{m}
</button>
);})}
{outroTxt!==undefined&&outroTxt!==""&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
<textarea value={outroTxt.trim()===""?"":outroTxt} onChange={function(e){setOutroTxt(e.target.value);}} rows={2} placeholder="Descreva o motivo..."
style={{border:"1.5px solid "+G.border,borderRadius:10,padding:"10px",fontSize:13,outline:"none",resize:"none",fontFamily:"sans-serif"}}/>
<button onClick={function(){if(outroTxt.trim())registrar(a,outroTxt.trim());}} style={{background:G.primary,color:"#fff",border:"none",borderRadius:10,padding:"9px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Salvar</button>
</div>}
<button onClick={function(){setSelMot(null);}} style={{background:"none",border:"none",color:G.muted,fontSize:12,cursor:"pointer",marginTop:2}}>Cancelar</button>
</div>}
</div>
);
})}
</div>}
{aba==="retornos"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
<div style={{fontSize:11,color:G.muted,textAlign:"center",padding:"0 6px"}}>{"Ordenado pela data mais próxima · quando chega o dia, o paciente volta pros Pendentes destacado no topo"}</div>
{retornos.length===0&&<div style={{textAlign:"center",padding:30,color:G.muted,fontSize:13,background:G.card,borderRadius:14}}>{"Nenhum retorno agendado. Use ⏰ Contatar depois nos Pendentes."}</div>}
{retornos.map(function(a){
var p=pats.find(function(x){return x.id===a.patientId;});
var d=dents&&dents.find(function(x){return x.id===a.dentistId;})||{name:"--"};
if(!p)return null;
var dd=diasAte(a.retorno.date);
return(
<div key={"ret"+a.id} style={{background:G.card,borderRadius:14,padding:"12px 14px",boxShadow:"0 2px 8px rgba(0,0,0,.06)",borderLeft:"4px solid #1f5d8a"}}>
<div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
<div onClick={function(){abrirFicha&&abrirFicha(p);}} title="Abrir ficha clínica" style={{fontWeight:700,fontSize:14,color:G.primary,cursor:"pointer",textDecoration:"underline",display:"inline-block"}}>{p.name}</div>
<span style={{fontSize:10.5,fontWeight:800,color:dd<=0?"#fff":"#1f5d8a",background:dd<=0?"#1f5d8a":"#1f5d8a20",borderRadius:20,padding:"2px 9px"}}>{dd<0?("atrasado "+(-dd)+"d 🔔"):dd===0?"HOJE 🔔":("faltam "+dd+(dd===1?" dia":" dias"))}</span>
</div>
<div style={{fontSize:12,color:G.muted,marginTop:2}}>{a.procedure+" · "+d.name}</div>
<div style={{fontSize:11,fontWeight:600,color:"#1f5d8a",marginBottom:a.retorno.motivo?4:10}}>{"⏰ Contatar em "+fmt(a.retorno.date)+" · "+(a.status==="missed"?"faltou":a.status==="rescheduled"?"desmarcou":"cancelou")+" em "+fmt(a.date)}</div>
{a.retorno.motivo&&<div style={{fontSize:12,color:G.muted,background:G.bg,borderRadius:9,padding:"6px 10px",marginBottom:10}}>{"💬 "+a.retorno.motivo}</div>}
{selRet!==a.id&&<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
{p.phone&&<button onClick={function(){doWA(p.phone,"Olá, "+p.name+"! Conforme combinado, estamos entrando em contato para agendarmos sua consulta. Podemos marcar? 😊 Affonso Odontologia");}} style={{background:"#25D366",color:"#fff",border:"none",borderRadius:8,padding:"6px 11px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{"📱 WA"}</button>}
<button onClick={function(){marcarRem(a.id);}} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"6px 11px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{"✅ Remarcado"}</button>
<button onClick={function(){setSelRet(a.id);setRetData(addDias(14));setRetMotivo(a.retorno.motivo||"");}} style={{background:"#4a7fa5",color:"#fff",border:"none",borderRadius:8,padding:"6px 11px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{"⏰ Adiar de novo"}</button>
<button onClick={function(){clearRet(a.id);}} style={{background:"var(--surface-2)",color:G.text,border:"1.5px solid "+G.border,borderRadius:8,padding:"6px 11px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{"↩️ Voltar p/ Pendentes"}</button>
</div>}
{selRet===a.id&&<div style={{display:"flex",flexDirection:"column",gap:6,marginTop:4}}>
<div style={{fontSize:12,fontWeight:700,color:G.muted}}>{"⏰ Nova data de contato:"}</div>
<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
{[["+1 sem",7],["+2 sem",14],["+3 sem",21],["+1 mês",30]].map(function(ch){var dv=addDias(ch[1]);var on=retData===dv;return <button key={ch[1]} onClick={function(){setRetData(dv);}} style={{border:"1.5px solid "+(on?"#4a7fa5":G.border),background:on?"#4a7fa518":"var(--card)",color:on?"#1f5d8a":G.text,borderRadius:10,padding:"7px 11px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{ch[0]}</button>;})}
</div>
<input type="date" value={retData} min={t} onChange={function(e){setRetData(e.target.value);}} style={{border:"1.5px solid "+G.border,borderRadius:10,padding:"9px 10px",fontSize:13,outline:"none",fontFamily:"sans-serif",background:"var(--card)",color:G.text}}/>
<input type="text" value={retMotivo} onChange={function(e){setRetMotivo(e.target.value);}} placeholder="Motivo (opcional)" style={{border:"1.5px solid "+G.border,borderRadius:10,padding:"9px 10px",fontSize:13,outline:"none",fontFamily:"sans-serif",background:"var(--card)",color:G.text}}/>
<button onClick={function(){if(retData&&retData>t)setRet(a.id,retData,retMotivo);}} style={{background:"#4a7fa5",color:"#fff",border:"none",borderRadius:10,padding:"9px",fontSize:13,fontWeight:700,cursor:"pointer",opacity:retData&&retData>t?1:.5}}>Salvar</button>
<button onClick={function(){setSelRet(null);}} style={{background:"none",border:"none",color:G.muted,fontSize:12,cursor:"pointer",marginTop:2}}>Cancelar</button>
</div>}
</div>
);
})}
</div>}
{aba==="historico"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
{historico.length===0&&<div style={{textAlign:"center",padding:30,color:G.muted,fontSize:13,background:G.card,borderRadius:14}}>{"Nenhum registro ainda"}</div>}
{historico.map(function(r){return(
<div key={r.id} style={{background:G.card,borderRadius:12,padding:"10px 14px",boxShadow:"0 1px 5px rgba(0,0,0,.06)"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
<div>
<div style={{fontWeight:700,fontSize:13}}>{r.patName}</div>
<div style={{fontSize:11,color:G.muted}}>{r.proc+" · "+(r.status==="missed"?"Faltou":"Cancelou")+" em "+fmt(r.apptDate)}</div>
<div style={{fontSize:12,color:G.red,fontWeight:600,marginTop:4}}>{"Motivo: "+r.motivo}</div>
</div>
<button onClick={function(){setRemarcar(function(prev){return prev.filter(function(x){return x.id!==r.id;});});}} style={{background:"none",border:"none",color:G.muted,fontSize:16,cursor:"pointer"}}>{"✕"}</button>
</div>
</div>
);})}
</div>}
</div>
);
}

function EsperaModal({pats,dents,onSave,onClose}){
var [patId,setPatId]=useState("");
var [dentId,setDentId]=useState(dents&&dents[0]?String(dents[0].id):"");
var [proc,setProc]=useState("");
var [tempo,setTempo]=useState("60");
var [valido,setValido]=useState("");
var [dias,setDias]=useState([]);
var [horaIni,setHoraIni]=useState("08:00");
var [horaFim,setHoraFim]=useState("18:00");
var [slots,setSlots]=useState([]);
var DIAS_SEM=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
var HORAS=["07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00"];
var togDia=function(d){
setDias(function(prev){return prev.indexOf(d)>=0?prev.filter(function(x){return x!==d;}):[...prev,d].sort();});
};
var addSlot=function(){
if(dias.length===0){alert("Selecione pelo menos um dia para adicionar");return;}
setSlots(function(prev){return[...prev,{dias:[...dias],ini:horaIni,fim:horaFim}];});
setDias([]);
};
var pat=pats.find(function(p){return p.id===Number(patId);});
var canSave=pat&&proc&&valido;
return(

<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto"}}>
<div style={{background:"var(--surface)",borderRadius:18,width:"100%",maxWidth:480,boxShadow:"0 8px 32px rgba(0,0,0,.2)"}}>
<div style={{background:"#7B1FA2",borderRadius:"18px 18px 0 0",padding:"14px 18px",display:"flex",alignItems:"center",gap:10}}>
<span style={{fontSize:20}}>{"⏳"}</span>
<div style={{flex:1,color:"#fff",fontWeight:700,fontSize:14}}>Nova Lista de Espera</div>
<button onClick={onClose} style={{border:"none",background:"rgba(255,255,255,.2)",borderRadius:8,color:"#fff",cursor:"pointer",padding:"5px 10px"}}>{"X"}</button>
</div>
<div style={{padding:20,display:"flex",flexDirection:"column",gap:12,maxHeight:"75vh",overflowY:"auto"}}>
<div>
<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",display:"block",marginBottom:4}}>Paciente</label>
<PatSearch lb="Buscar paciente" val={patId} set={setPatId} pats={pats}/>
</div>
<div>
<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",display:"block",marginBottom:4}}>Dentista</label>
<Sel lb="Dentista" val={dentId} set={setDentId} opts={dents.map(function(d){return{v:String(d.id),l:d.name};})}/>
</div>
<Inp lb="Procedimento" val={proc} set={setProc} ph="Ex: Consulta, Extração, Implante..."/>
<div>
<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",display:"block",marginBottom:4}}>Tempo necessário</label>
<Sel lb="Duração" val={tempo} set={setTempo} opts={[{v:"30",l:"30 minutos"},{v:"60",l:"1 hora"},{v:"90",l:"1h 30min"},{v:"120",l:"2 horas"},{v:"180",l:"3 horas"}]}/>
</div>
<Inp lb="Válido até (data limite)" val={valido} set={setValido} type="date"/>
<div>
<div style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",marginBottom:6}}>Disponibilidade do paciente</div>
<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
{DIAS_SEM.map(function(d,i){var at=dias.indexOf(i)>=0;return(
<button key={i} onClick={function(){togDia(i);}} style={{border:"2px solid "+(at?"#7B1FA2":G.border),background:at?"#7B1FA2":"var(--card)",color:at?"#fff":G.muted,borderRadius:8,padding:"5px 8px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{d}</button>
);})}
</div>
<div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
<Sel lb="De" val={horaIni} set={setHoraIni} opts={HORAS.map(function(h){return{v:h,l:h};})}/>
<span style={{color:G.muted,fontSize:12}}>às</span>
<Sel lb="Até" val={horaFim} set={setHoraFim} opts={HORAS.map(function(h){return{v:h,l:h};})}/>
<button onClick={addSlot} style={{background:"#7B1FA2",color:"#fff",border:"none",borderRadius:8,padding:"8px 12px",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>{"+ Add"}</button>
</div>
{slots.map(function(s,i){return(
<div key={i} style={{background:"var(--purple-soft)",borderRadius:8,padding:"6px 10px",fontSize:12,marginBottom:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<span style={{color:"#7B1FA2",fontWeight:600}}>{s.dias.map(function(d){return DIAS_SEM[d];}).join(", ")+" · "+s.ini+" às "+s.fim}</span>
<button onClick={function(){setSlots(function(prev){return prev.filter(function(_,j){return j!==i;});});}} style={{background:"none",border:"none",color:G.muted,cursor:"pointer",fontSize:14}}>{"✕"}</button>
</div>
);})}
</div>
<button onClick={function(){if(!canSave)return;onSave({id:nid(),patientId:Number(patId),patName:pat.name,patPhone:pat.phone||"",dentId:Number(dentId),dentName:(dents.find(function(d){return d.id===Number(dentId);})||{name:""}).name,proc:proc,tempo:Number(tempo),valido:valido,slots:slots,criado:today()});onClose();}}
disabled={!canSave} style={{background:canSave?"#7B1FA2":"var(--muted)",color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:15,fontWeight:700,cursor:canSave?"pointer":"not-allowed"}}>
{"Adicionar à Lista de Espera"}
</button>
</div>
</div>
</div>
);
}

function ImplantesConsig({implCat,setImplCat,implMov,setImplMov,pats,dents,addLog,user}){
var t=today();
var [aba,setAba]=useState("estoque");
var [showCat,setShowCat]=useState(false);
var [showMov,setShowMov]=useState(false);
var [editCat,setEditCat]=useState(null);
var [catF,setCatF]=useState({tipo:"Implante",marca:"Titaniofix",desc:"",codigo:"",estoque_min:2,preco:"",qtdIni:""});
var [movF,setMovF]=useState({tipo:"entrada",itemId:"",qty:1,patId:"",dente:"",dentId:"",obs:"",date:t});
var [filtMes,setFiltMes]=useState(t.slice(0,7));
var TIPOS_ITEM=["Implante","Componente","UCLA","Cicatrizador","Pilar","Coping","Outro"];
var stockMap={};
implMov.forEach(function(m){if(!stockMap[m.itemId])stockMap[m.itemId]=0;if(m.tipo==="entrada")stockMap[m.itemId]+=Number(m.qty);else stockMap[m.itemId]-=Number(m.qty);});
var movsDoMes=implMov.filter(function(m){return m.date.startsWith(filtMes);});
var totalUsado=movsDoMes.filter(function(m){return m.tipo==="saida"&&!m.ajuste;}).reduce(function(s,m){return s+Number(m.qty);},0);
var totalPagarMes=movsDoMes.filter(function(m){return m.tipo==="saida"&&!m.ajuste;}).reduce(function(s,m){var it=implCat.find(function(x){return x.id===m.itemId;});return s+(it?Number(it.preco||0):0)*Number(m.qty);},0);
var saveCat=function(){
if(!catF.desc.trim())return;
var obj={...catF,preco:pmoney(catF.preco)};
delete obj.qtdIni;
var qtdAtualEdit=obj.qtdAtual;delete obj.qtdAtual;// V213 ajuste de quantidade (admin)
if(editCat){setImplCat(function(prev){return prev.map(function(x){return x.id===editCat.id?{...obj,id:x.id,_ts:Date.now()}:x;});});// V238 _ts restaurado
if(user&&user.level>=3&&qtdAtualEdit!==undefined&&qtdAtualEdit!==null&&String(qtdAtualEdit).trim()!==""){
var atualQ=stockMap[editCat.id]||0;var novaQ=Number(qtdAtualEdit);
if(!isNaN(novaQ)&&novaQ>=0&&novaQ!==atualQ){
var diffQ=novaQ-atualQ;
setImplMov(function(prev){return[...prev,{id:nid(),_ts:Date.now(),tipo:diffQ>0?"entrada":"saida",itemId:editCat.id,qty:Math.abs(diffQ),patId:null,dentId:null,obs:"Ajuste manual (admin)",date:t,itemName:obj.desc,patName:"Ajuste manual",dente:"-",ajuste:true}];});
if(addLog)addLog("estoque","Ajuste manual: "+obj.desc+" de "+atualQ+" para "+novaQ+" un","");
}
}
}
else{
var newId=nid();
setImplCat(function(prev){return[...prev,{...obj,id:newId,_ts:Date.now()}];});
var qIni=Number(catF.qtdIni||0);
if(qIni>0){setImplMov(function(prev){return[...prev,{id:nid(),_ts:Date.now(),tipo:"entrada",itemId:newId,qty:qIni,patId:null,dentId:null,obs:"Estoque inicial",date:t,itemName:obj.desc}];});}
}
setShowCat(false);setEditCat(null);setCatF({tipo:"Implante",marca:"Titaniofix",desc:"",codigo:"",estoque_min:2,preco:"",qtdIni:""});
};
var saveMov=function(){
if(!movF.itemId||!movF.qty)return;
if(movF.tipo==="saida"&&(!movF.patId||!movF.dente)){alert("Informe paciente e dente");return;}
var item=implCat.find(function(x){return x.id===Number(movF.itemId);});
var pat=pats.find(function(x){return x.id===Number(movF.patId);});
var dent=dents.find(function(x){return x.id===Number(movF.dentId);});
var entry={...movF,id:nid(),_ts:Date.now(),itemId:Number(movF.itemId),qty:Number(movF.qty),patId:Number(movF.patId)||null,dentId:Number(movF.dentId)||null,itemName:item&&item.desc,patName:pat&&pat.name,dentName:dent&&dent.name};// V238 _ts restaurado
setImplMov(function(prev){return[...prev,entry];});
if(addLog){if(movF.tipo==="saida")addLog("estoque","Saida: "+entry.itemName+" paciente "+entry.patName+" dente "+movF.dente,entry.patName);else addLog("estoque","Entrada: "+entry.qty+"x "+(item&&item.desc)+" Titaniofix","");}
setShowMov(false);setMovF({tipo:"entrada",itemId:"",qty:1,patId:"",dente:"",dentId:"",obs:"",date:t});
};
return(

<div style={{display:"flex",flexDirection:"column",gap:12}}>
<div style={{display:"flex",gap:4,background:G.bg,borderRadius:12,padding:4}}>
{[["estoque","📦 Estoque"],["movs","Movimentacoes"],["relatorio","Relatorio"]].map(function(tb){return(
<button key={tb[0]} onClick={function(){setAba(tb[0]);}} style={{flex:1,border:"none",borderRadius:9,padding:"8px 2px",fontSize:11,fontWeight:700,cursor:"pointer",background:aba===tb[0]?"var(--card)":G.bg,color:aba===tb[0]?G.primary:G.muted,boxShadow:aba===tb[0]?"0 1px 4px rgba(0,0,0,.1)":"none"}}>
{tb[1]}
</button>
);})}
</div>
{aba==="estoque"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div style={{fontSize:11,color:G.muted}}>Fornecedor: Titaniofix</div>
<div style={{display:"flex",gap:5}}>
<button onClick={function(){setShowMov(true);setMovF(function(p){return{...p,tipo:"entrada"};});}} style={{background:"#27AE60",color:"#fff",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{"+ Entrada"}</button>
<button onClick={function(){setShowMov(true);setMovF(function(p){return{...p,tipo:"saida"};});}} style={{background:G.red,color:"#fff",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{"- Saida"}</button>
<button onClick={function(){setShowCat(true);}} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{"+ Item"}</button>
</div>
</div>
{implCat.length===0&&<div style={{textAlign:"center",padding:24,color:G.muted,fontSize:13,background:G.card,borderRadius:12}}>Nenhum item. Clique em + Item para cadastrar.</div>}
{implCat.map(function(item){var qty=stockMap[item.id]||0;var baixo=qty<=item.estoque_min;return(
<div key={item.id} style={{background:G.card,borderRadius:12,padding:"12px 14px",borderLeft:"4px solid "+(baixo?G.red:G.primary)}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div>
<div style={{display:"flex",gap:5,marginBottom:3}}>
<span style={{fontSize:10,background:G.primary+"20",color:G.primary,borderRadius:5,padding:"1px 6px",fontWeight:700}}>{item.tipo}</span>
{baixo&&<span style={{fontSize:10,background:"var(--red-soft)",color:G.red,borderRadius:5,padding:"1px 6px",fontWeight:700}}>Estoque baixo!</span>}
</div>
<div style={{fontWeight:700,fontSize:13}}>{item.desc}</div>
<div style={{fontSize:11,color:G.muted}}>{item.marca+(item.codigo?" · Cód: "+item.codigo:"")}</div>
{Number(item.preco)>0&&<div style={{fontSize:11,color:G.primary,fontWeight:700,marginTop:2}}>{cur(item.preco)+" / un"}</div>}
</div>
<div style={{textAlign:"right"}}>
<div style={{fontSize:24,fontWeight:800,color:baixo?G.red:G.primary}}>{qty}</div>
<div style={{fontSize:10,color:G.muted}}>{"min: "+item.estoque_min}</div>
</div>
</div>
<div style={{display:"flex",gap:5,marginTop:8,flexWrap:"wrap"}}>
<button onClick={function(){setEditCat(item);setCatF({tipo:item.tipo,marca:item.marca,desc:item.desc,codigo:item.codigo||"",estoque_min:item.estoque_min,preco:item.preco!=null?String(item.preco):"",qtdAtual:String(stockMap[item.id]||0)});setShowCat(true);}} style={{background:G.bg,border:"1px solid "+G.border,borderRadius:7,padding:"4px 8px",fontSize:11,cursor:"pointer",color:G.muted}}>{"Editar"}</button>
<button onClick={function(){setShowMov(true);setMovF({tipo:"entrada",itemId:String(item.id),qty:1,patId:"",dente:"",dentId:"",obs:"",date:t});}} style={{background:"var(--green-soft)",border:"1px solid #27AE60",borderRadius:7,padding:"4px 8px",fontSize:11,cursor:"pointer",color:"#1E7D45",fontWeight:700}}>{"+ Entrada"}</button>
<button onClick={function(){setShowMov(true);setMovF({tipo:"saida",itemId:String(item.id),qty:1,patId:"",dente:"",dentId:"",obs:"",date:t});}} style={{background:"var(--red-soft)",border:"1px solid "+G.red,borderRadius:7,padding:"4px 8px",fontSize:11,cursor:"pointer",color:G.red,fontWeight:700}}>{"- Saida"}</button>
<button onClick={function(){if(window.confirm("Excluir "+item.desc+"? Esta acao nao pode ser desfeita."))setImplCat(function(prev){return prev.filter(function(x){return x.id!==item.id;});});}} style={{background:"var(--surface)",border:"1px solid "+G.red,borderRadius:7,padding:"4px 8px",fontSize:11,cursor:"pointer",color:G.red,fontWeight:700,marginLeft:"auto"}}>{"🗑 Excluir"}</button>
</div>
</div>
);})}
</div>}
{aba==="movs"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
<input type="month" value={filtMes} onChange={function(e){setFiltMes(e.target.value);}} style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"6px 10px",fontSize:12,outline:"none"}}/>
{movsDoMes.length===0&&<div style={{textAlign:"center",padding:20,color:G.muted,fontSize:13}}>Nenhuma movimentacao neste mes</div>}
{movsDoMes.sort(function(a,b){return b.date.localeCompare(a.date);}).map(function(m){return(
<div key={m.id} style={{background:G.card,borderRadius:10,padding:"10px 12px",borderLeft:"4px solid "+(m.tipo==="entrada"?"#27AE60":G.red)}}>
<div style={{display:"flex",justifyContent:"space-between",gap:8}}>
<div style={{flex:1}}>
<div style={{fontSize:12,fontWeight:700,color:m.tipo==="entrada"?"#27AE60":G.red}}>{(m.tipo==="entrada"?"Entrada":"Saida")+" "+m.qty+"x "+m.itemName}</div>
{m.tipo==="saida"&&<div style={{fontSize:11,color:G.muted}}>{m.patName+" - Dente "+m.dente+(m.dentName?" - "+m.dentName:"")}</div>}
</div>
<div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0}}>
<div style={{fontSize:11,color:G.muted}}>{fmt(m.date)}</div>
{user&&user.level>=3&&<button onClick={function(){if(window.confirm("Excluir esta movimentacao? O estoque sera corrigido automaticamente."))setImplMov(function(prev){return prev.filter(function(x){return x.id!==m.id;});});}} style={{border:"none",background:G.red,color:"#fff",borderRadius:6,padding:"3px 9px",fontSize:10,fontWeight:700,cursor:"pointer"}}>{"Excluir"}</button>}
</div>
</div>
</div>
);})}
</div>}
{aba==="relatorio"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
<div style={{display:"flex",alignItems:"center",gap:8}}>
<input type="month" value={filtMes} onChange={function(e){setFiltMes(e.target.value);}} style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"6px 10px",fontSize:12,outline:"none"}}/>
<span style={{fontSize:12,fontWeight:700,color:G.primary}}>Fechamento Titaniofix</span>
</div>
<div style={{background:"var(--green-soft)",border:"2px solid #A5D6A7",borderRadius:12,padding:"12px 16px",textAlign:"center"}}>
<div style={{fontSize:12,color:G.muted}}>Total usado no mes</div>
<div style={{fontSize:28,fontWeight:800,color:"#2E7D32"}}>{totalUsado}</div>
<div style={{fontSize:11,color:G.muted}}>peca(s) a pagar</div>
{totalPagarMes>0&&<div style={{fontSize:18,fontWeight:800,color:"#2E7D32",marginTop:6,borderTop:"1px solid #A5D6A7",paddingTop:6}}>{"Total: "+cur(totalPagarMes)}</div>}
</div>
{implCat.map(function(item){
var saidas=movsDoMes.filter(function(m){return m.tipo==="saida"&&m.itemId===item.id&&!m.ajuste;});
if(saidas.length===0)return null;
var qtdTotal=saidas.reduce(function(s,m){return s+Number(m.qty||0);},0);
return(
<div key={item.id} style={{background:G.card,borderRadius:12,padding:"12px 14px"}}>
<div style={{display:"flex",justifyContent:"space-between",marginBottom:6,alignItems:"center",gap:8}}>
<div style={{fontWeight:700,fontSize:13,flex:1}}>{item.desc}</div>
<div style={{textAlign:"right"}}><div style={{fontWeight:800,color:G.red}}>{qtdTotal+"x"}</div>{Number(item.preco)>0&&<div style={{fontSize:11,color:G.primary,fontWeight:700}}>{cur(item.preco*qtdTotal)}</div>}</div>
</div>
{saidas.map(function(s){return(
<div key={s.id} style={{fontSize:11,color:G.muted,padding:"4px 0",borderBottom:"1px solid "+G.border,display:"flex",justifyContent:"space-between",alignItems:"center",gap:6}}>
<span style={{flex:1}}>{fmt(s.date)+" - "+s.patName+" - Dente "+s.dente+(s.dentName?" - "+s.dentName:"")+(Number(s.qty)>1?" ("+s.qty+" pecas)":"")}</span>
{user&&user.level>=3&&<button onClick={function(){if(window.confirm("Excluir esta movimentacao? O estoque sera corrigido automaticamente."))setImplMov(function(prev){return prev.filter(function(x){return x.id!==s.id;});});}} style={{border:"none",background:G.red,color:"#fff",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700,cursor:"pointer",flexShrink:0}}>{"Excluir"}</button>}
</div>
);})}
</div>
);
})}
</div>}
{showCat&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
<div style={{background:"var(--surface)",borderRadius:18,width:"100%",maxWidth:400}}>
<div style={{background:G.primary,borderRadius:"18px 18px 0 0",padding:"14px 18px",display:"flex",alignItems:"center",gap:10}}>
<div style={{flex:1,color:"#fff",fontWeight:700,fontSize:14}}>{editCat?"Editar Item":"Novo Item"}</div>
<button onClick={function(){setShowCat(false);setEditCat(null);}} style={{border:"none",background:"rgba(255,255,255,.2)",borderRadius:8,color:"#fff",cursor:"pointer",padding:"5px 10px"}}>{"X"}</button>
</div>
<div style={{padding:20,display:"flex",flexDirection:"column",gap:10}}>
<div>
<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",display:"block",marginBottom:4}}>Tipo</label>
<select value={catF.tipo} onChange={function(e){setCatF(function(p){return{...p,tipo:e.target.value};});}} style={{width:"100%",border:"1.5px solid "+G.border,borderRadius:8,padding:"8px 10px",fontSize:13,outline:"none"}}>
{TIPOS_ITEM.map(function(t){return <option key={t} value={t}>{t}</option>;})}
</select>
</div>
<Inp lb="Descricao" val={catF.desc} set={function(v){setCatF(function(p){return{...p,desc:v};});}} ph="Ex: Conemorse 3.5x8, UCLA, Cicatrizador..."/>
<Inp lb="Codigo do implante" val={catF.codigo||""} set={function(v){setCatF(function(p){return{...p,codigo:v};});}} ph="Ex: TF-3508, CM-456..."/>
<Inp lb="Marca" val={catF.marca} set={function(v){setCatF(function(p){return{...p,marca:v};});}} ph="Titaniofix"/>
<Inp lb="Estoque minimo" val={String(catF.estoque_min)} set={function(v){setCatF(function(p){return{...p,estoque_min:Number(v)};});}} type="number"/>
<Inp lb="Preco unitario (R$)" val={String(catF.preco||"")} set={function(v){setCatF(function(p){return{...p,preco:v};});}} type="number" ph="0,00"/>
{!editCat&&<Inp lb="Quantidade atual" val={String(catF.qtdIni||"")} set={function(v){setCatF(function(p){return{...p,qtdIni:v};});}} type="number" ph="0"/>}
{editCat&&user&&user.level>=3&&<div style={{background:G.primary+"12",border:"1.5px solid "+G.primary+"55",borderRadius:10,padding:"10px 12px"}}>
<Inp lb="Quantidade em estoque (admin)" val={String(catF.qtdAtual!=null?catF.qtdAtual:"")} set={function(v){setCatF(function(p){return{...p,qtdAtual:v};});}} type="number" ph="0"/>
<div style={{fontSize:10,color:G.muted,marginTop:4}}>Se alterar, o sistema registra um ajuste automático nas movimentações (fora do fechamento Titaniofix).</div>
</div>}
<button onClick={saveCat} style={{background:G.primary,color:"#fff",border:"none",borderRadius:12,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer"}}>{"Salvar"}</button>
</div>
</div>
</div>}
{showMov&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
<div style={{background:"var(--surface)",borderRadius:18,width:"100%",maxWidth:420,maxHeight:"90vh",overflowY:"auto"}}>
<div style={{background:movF.tipo==="entrada"?"#27AE60":G.red,borderRadius:"18px 18px 0 0",padding:"14px 18px",display:"flex",alignItems:"center",gap:10}}>
<div style={{flex:1,color:"#fff",fontWeight:700,fontSize:14}}>{movF.tipo==="entrada"?"Registrar Entrada":"Registrar Saida (Uso)"}</div>
<button onClick={function(){setShowMov(false);}} style={{border:"none",background:"rgba(255,255,255,.2)",borderRadius:8,color:"#fff",cursor:"pointer",padding:"5px 10px"}}>{"X"}</button>
</div>
<div style={{padding:20,display:"flex",flexDirection:"column",gap:10}}>
<div style={{display:"flex",gap:6}}>
{["entrada","saida"].map(function(tp){return(
<button key={tp} onClick={function(){setMovF(function(p){return{...p,tipo:tp};});}} style={{flex:1,border:"2px solid "+(movF.tipo===tp?(tp==="entrada"?"#27AE60":G.red):G.border),background:movF.tipo===tp?(tp==="entrada"?"var(--green-soft)":"var(--red-soft)"):"var(--card)",borderRadius:8,padding:"8px",fontSize:12,fontWeight:700,cursor:"pointer",color:movF.tipo===tp?(tp==="entrada"?"#27AE60":G.red):G.muted}}>
{tp==="entrada"?"Entrada Titaniofix":"Saida (Uso)"}
</button>
);})}
</div>
<div>
<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",display:"block",marginBottom:4}}>Item</label>
<select value={movF.itemId} onChange={function(e){setMovF(function(p){return{...p,itemId:e.target.value};});}} style={{width:"100%",border:"1.5px solid "+G.border,borderRadius:8,padding:"8px 10px",fontSize:13,outline:"none"}}>
<option value="">Selecione...</option>
{implCat.map(function(item){return <option key={item.id} value={String(item.id)}>{item.tipo+" - "+item.desc+(item.codigo?" ("+item.codigo+")":"")}</option>;})}
</select>
</div>
<Inp lb="Quantidade" val={String(movF.qty)} set={function(v){setMovF(function(p){return{...p,qty:v};});}} type="number"/>
{movF.tipo==="saida"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
<div>
<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",display:"block",marginBottom:4}}>Paciente</label>
<PatSearch lb="Buscar paciente" val={String(movF.patId)} set={function(v){setMovF(function(p){return{...p,patId:v};});}} pats={pats}/>
</div>
<Inp lb="Numero do dente" val={movF.dente} set={function(v){setMovF(function(p){return{...p,dente:v};});}} ph="Ex: 36, 11, 21..."/>
<div>
<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",display:"block",marginBottom:4}}>Dentista</label>
<select value={movF.dentId} onChange={function(e){setMovF(function(p){return{...p,dentId:e.target.value};});}} style={{width:"100%",border:"1.5px solid "+G.border,borderRadius:8,padding:"8px 10px",fontSize:13,outline:"none"}}>
<option value="">Selecione...</option>
{dents.map(function(d){return <option key={d.id} value={String(d.id)}>{d.name}</option>;})}
</select>
</div>
</div>}
<Inp lb="Observacao" val={movF.obs} set={function(v){setMovF(function(p){return{...p,obs:v};});}} ph="Opcional..."/>
<Inp lb="Data" val={movF.date} set={function(v){setMovF(function(p){return{...p,date:v};});}} type="date"/>
<button onClick={saveMov} style={{background:G.primary,color:"#fff",border:"none",borderRadius:12,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer"}}>Salvar</button>
</div>
</div>
</div>}
</div>
);
}

// ══════════════════════════════════════════════════════════
// WHATSAPP AUTO — integração com servidor Railway (templates Meta)
// ══════════════════════════════════════════════════════════
// ── LISTA DE ESPERA: encontrar encaixes em horários vagos ──
function esperaSlotLivre(appts,dent,dateStr,slot){
var d=new Date(dateStr+"T12:00");var wd=d.getDay();
var dias=dent.dias||[1,2,3,4,5];
if(dias.indexOf(wd)<0)return false;
var ent=dent.entrada||"08:00";var sai=dent.saida||"18:00";
if(slot<ent||slot>=sai)return false;
var alI=(dent.almoco&&dent.almoco.ini)||"";var alF=(dent.almoco&&dent.almoco.fim)||"";
if(alI&&alF&&slot>=alI&&slot<alF)return false;
var occ=(appts||[]).some(function(a){
if(!a||a.date!==dateStr||a.dentistId!==dent.id)return false;
if(a.status==="cancelled"||a.status==="rescheduled"||a.status==="missed")return false;
if(a.time===slot)return true;
if((a.extraSlots||[]).indexOf(slot)>=0)return true;
return false;
});
return !occ;
}
function esperaMatchDia(espera,appts,dents,dateStr){
var t=today();var out=[];
if(!dateStr||dateStr<t)return out;
var d=new Date(dateStr+"T12:00");var wd=d.getDay();
(espera||[]).forEach(function(e){
if(!e||!e.slots||!e.slots.length)return;
if(e.valido&&(e.valido<t||dateStr>e.valido))return;
var dent=(dents||[]).find(function(x){return x.id===Number(e.dentId);});
if(!dent)return;
var need=Math.max(1,Math.ceil(Number(e.tempo||30)/30));
var times=[];
e.slots.forEach(function(sl){
if((sl.dias||[]).indexOf(wd)<0)return;
SLOTS.forEach(function(slot,idx){
if(slot<(sl.ini||"00:00")||slot>=(sl.fim||"23:59"))return;
var ok=true;
for(var i=0;i<need;i++){
var s2=SLOTS[idx+i];
if(!s2||!esperaSlotLivre(appts,dent,dateStr,s2)){ok=false;break;}
}
if(ok&&times.indexOf(slot)<0)times.push(slot);
});
});
if(times.length)out.push({esp:e,dent:dent,times:times.sort()});
});
return out;
}

function _newerWa(a,b){if(!b)return a;if(!a)return b;return ((b._ts||0)>((a._ts)||0))?b:a;}
const RAILWAY_URL="https://whatsapp-webhook-production-d5be.up.railway.app";
const WA_DISPARO_KEY="affonso2025";
const PCIR_WA=["extra","exodont","cirurg","implante","enxerto","sinus","frenectomia","apicectomia","biopsia","gengivo"];
const WA_TPL=[
{k:"confirmacao",tpl:"confirmacao_consulta",label:"Confirmação ao agendar",quando:"Na hora em que a consulta é criada na Agenda",sample:["Maria Silva","Diego Affonso","15/06/2026","14:00"]},
{k:"vespera",tpl:"lembrete_vespera",label:"Lembrete de véspera",quando:"Um dia antes, para consultas Pendentes ou Confirmadas",sample:["Maria Silva","15/06/2026","14:00","Diego Affonso"]},
{k:"aniversario",tpl:"aniversario_paciente",label:"Aniversário",quando:"No dia do aniversário do paciente",sample:["Maria Silva"]},
{k:"semestral",tpl:"controle_semestral",label:"Controle semestral",quando:"6 meses após o último atendimento, se não tiver consulta futura",sample:["Maria Silva","Diego Affonso"]},
{k:"reagendamento",tpl:"falta_cancelamento",label:"Reagendamento (falta/cancelamento)",quando:"Quando a consulta é marcada como Faltou, Cancelou ou Desmarcou",sample:["Maria Silva","Cancelou","Diego Affonso"]},
{k:"poscirurgia",tpl:"pos__procedimento_",label:"Pós-cirurgia",quando:"No dia seguinte a procedimentos cirúrgicos",sample:["Maria Silva","Diego Affonso","Extração"]},
{k:"posconsulta",tpl:"pos__consulta",label:"Pós-consulta",quando:"No dia seguinte a uma consulta Realizada (não cirúrgica) — no máx. 1x a cada 6 meses por paciente",sample:["Maria Silva","Diego Affonso"]},
{k:"orcamento",tpl:"orcamento_pendente",label:"Orçamento pendente",quando:"3 dias após criar um orçamento que continua Em espera",sample:["Maria Silva","Diego Affonso"]},
];
async function dispararWA(template,fone,params){
try{
var n=String(fone||"").replace(/\D/g,"");
if(n.length===11||n.length===10)n="55"+n;
var r=await fetch(RAILWAY_URL+"/api/disparar",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":WA_DISPARO_KEY},body:JSON.stringify({template:template,telefone:n,params:params||[]})});
var d=await r.json().catch(function(){return{};});
if(d&&d.ok)return{ok:true};
return{ok:false,err:(d&&(d.error||d.err))||("HTTP "+r.status)};
}catch(e){return{ok:false,err:"sem conexão com o servidor"};}
}
function WaAutoTab({waAuto,setWaAuto,waAutoLog}){
var cfg=waAuto||{};
var [testStatus,setTestStatus]=useState("");
var [testFone,setTestFone]=useState("");
var [testTpl,setTestTpl]=useState(WA_TPL[0].k);
var [sendingTest,setSendingTest]=useState(false);
var tog=function(k){setWaAuto(function(prev){var n=Object.assign({},prev||{});n[k]=!n[k];n._ts=Date.now();return n;});};
var testarConexao=async function(){
setTestStatus("testando...");
try{var r=await fetch(RAILWAY_URL+"/api/disparar",{method:"OPTIONS"});setTestStatus(r.ok?"✅ Servidor ativo e pronto para envios":"❌ Erro HTTP "+r.status);}catch(e){setTestStatus("❌ Sem conexão com o servidor");}
};
var enviarTeste=async function(){
if(!testFone||testFone.replace(/\D/g,"").length<10){alert("Digite um número válido com DDD");return;}
var t=WA_TPL.find(function(x){return x.k===testTpl;});
setSendingTest(true);
var r=await dispararWA(t.tpl,testFone,t.sample);
setSendingTest(false);
alert(r.ok?"✅ Mensagem de teste enviada! Confira o WhatsApp.":"❌ Erro: "+(r.err||"desconhecido"));
};
var Sw=function(props){
var on=!!props.on;
return <button onClick={props.onClick} style={{border:"none",width:46,height:26,borderRadius:20,background:on?G.success:"var(--muted)",position:"relative",cursor:"pointer",flexShrink:0,transition:"background .15s"}}>
<span style={{position:"absolute",top:3,left:on?23:3,width:20,height:20,borderRadius:"50%",background:"var(--surface)",boxShadow:"0 1px 3px rgba(0,0,0,.3)",transition:"left .15s"}}/>
</button>;
};
return <div style={{display:"flex",flexDirection:"column",gap:14}}>
<div style={{background:G.accent,borderRadius:12,padding:"12px 14px",fontSize:12,color:G.primary,lineHeight:1.5}}>
{"🤖 Mensagens automáticas pelo WhatsApp oficial da clínica (+55 11 2524-9975). Tudo começa DESLIGADO — o sistema continua como está até você ligar. Ligue o interruptor geral e depois só os tipos que quiser automatizar."}
</div>
<div style={{background:"var(--amber-soft)",border:"1.5px solid #FFD54F",borderRadius:10,padding:"9px 13px",fontSize:11,color:"#8a6d00",lineHeight:1.5}}>
{"⚠️ Importante: mensagens de template (fora da janela de 24h) são cobradas pela Meta por conversa. Para evitar custo alto e bloqueio, o sistema envia no máximo 25 mensagens por dia de cada tipo — o restante sai nos dias seguintes. Os envios diários acontecem com o sistema aberto, entre 8h e 19h."}
</div>
<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
<button onClick={testarConexao} style={{background:G.blue,color:"#fff",border:"none",borderRadius:8,padding:"7px 13px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{"📡 Testar conexão com o servidor"}</button>
{testStatus&&<span style={{fontSize:12,fontWeight:600,color:testStatus.indexOf("✅")===0?G.success:G.red}}>{testStatus}</span>}
</div>
<div style={{background:cfg.master?G.success+"15":G.bg,border:"2px solid "+(cfg.master?G.success:G.border),borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:11}}>
<div style={{flex:1}}>
<div style={{fontWeight:700,fontSize:14,color:cfg.master?G.success:G.text}}>{"Disparos automáticos "+(cfg.master?"LIGADOS":"desligados")}</div>
<div style={{fontSize:11,color:G.muted}}>{"Interruptor geral. Desligado = nada é enviado automaticamente."}</div>
</div>
<Sw on={cfg.master} onClick={function(){tog("master");}}/>
</div>
<div style={{display:"flex",flexDirection:"column",gap:8,opacity:cfg.master?1:.55}}>
{WA_TPL.map(function(t){
return <div key={t.k} style={{background:G.card,borderRadius:11,padding:"11px 13px",boxShadow:"0 1px 4px rgba(0,0,0,.06)",display:"flex",alignItems:"center",gap:11,borderLeft:"4px solid "+(cfg[t.k]?G.success:G.border)}}>
<div style={{flex:1}}>
<div style={{fontWeight:700,fontSize:13}}>{t.label}</div>
<div style={{fontSize:11,color:G.muted,marginTop:1}}>{t.quando}</div>
<div style={{fontSize:10,color:G.blue,marginTop:2}}>{"Template: "+t.tpl}</div>
</div>
<Sw on={cfg[t.k]} onClick={function(){tog(t.k);}}/>
</div>;
})}
</div>
<Div lb="Enviar mensagem de teste"/>
<div style={{background:G.bg,borderRadius:11,padding:"11px 13px",display:"flex",flexDirection:"column",gap:9}}>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
<Inp lb="Seu WhatsApp (com DDD)" val={testFone} set={setTestFone} ph="11999990000"/>
<div style={{display:"flex",flexDirection:"column",gap:4}}>
<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Template</label>
<select value={testTpl} onChange={function(e){setTestTpl(e.target.value);}} style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"8px 11px",fontSize:13,outline:"none",background:"var(--surface)"}}>
{WA_TPL.map(function(t){return <option key={t.k} value={t.k}>{t.label}</option>;})}
</select>
</div>
</div>
<button onClick={enviarTeste} disabled={sendingTest} style={{background:"#25D366",color:"#fff",border:"none",borderRadius:9,padding:"10px",fontSize:13,fontWeight:700,cursor:sendingTest?"wait":"pointer",opacity:sendingTest?.7:1}}>{sendingTest?"Enviando...":"📱 Enviar teste (dados fictícios)"}</button>
</div>
<Div lb="Últimos envios automáticos"/>
{(!waAutoLog||waAutoLog.length===0)&&<div style={{background:G.bg,borderRadius:10,padding:16,textAlign:"center",color:G.muted,fontSize:12}}>{"Nenhum envio automático ainda"}</div>}
{(waAutoLog||[]).slice(0,60).map(function(l,i){
var dt=new Date(l.ts);
return <div key={i} style={{background:G.card,borderRadius:9,padding:"8px 12px",display:"flex",gap:8,alignItems:"center",borderLeft:"3px solid "+(l.ok?G.success:G.red),boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
<div style={{flex:1}}>
<div style={{fontSize:12,fontWeight:700}}>{(l.ok?"✅ ":"❌ ")+l.tipo+" — "+(l.pat||"")}</div>
<div style={{fontSize:10,color:G.muted}}>{(l.fone||"")+(l.err?" · Erro: "+l.err:"")}</div>
</div>
<div style={{fontSize:10,color:G.muted,textAlign:"right",flexShrink:0}}>{dt.toLocaleDateString("pt-BR")+" "+dt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div>
</div>;
})}
</div>;
}

// ══════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════
function Login({users,onLogin}){
const [l,sl]=useState("");const [p,sp]=useState("");const [e,se]=useState("");const [sw,ssw]=useState(false);
const go=async function(){se("");if(!l||!p){se("Preencha login e senha");return;}var ok=false;try{ok=await __signIn(l,p);}catch(err){se("Erro de conexao. Tente novamente.");return;}if(!ok){se(__lastAuthErr==="network"?"Sem conexão com o servidor de login. Teste em navegador real (não no preview).":(__lastAuthErr==="server"?"Servidor de login indisponível. Tente novamente.":"Login ou senha inválidos"));return;}var found=null;try{var us=(await supabase.loadUsersOnly())||users;found=us.find(function(u){return String(u.login).trim().toLowerCase()===String(l).trim().toLowerCase()&&u.active;});}catch(e){}if(!found)found=users.find(function(u){return String(u.login).trim().toLowerCase()===String(l).trim().toLowerCase()&&u.active;});if(!found){se("Usuário sem cadastro ativo nesta clínica.");return;}onLogin(found);};
const STY=`
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');
.aff-login *{box-sizing:border-box;margin:0;padding:0;}
.aff-login{--bg-glow:#f1f7f1;--bg-1:#dce8de;--bg-2:#c6d8cb;--bg-3:#b1c6b6;--vignette:rgba(15,56,38,.22);--card:#ffffff;--card-2:#f6faf6;--field:#eef3ee;--field-br:#d9e3da;--pine:#163d2a;--green:#2c6b4b;--green-2:#225a3e;--eucalyptus:#5e8a6e;--titanium:#9aa7ac;--titanium-lt:#d2dadd;--ink:#14241b;--label:#5c6f64;--muted:#7e8f84;position:relative;min-height:100vh;font-family:'Manrope',sans-serif;color:var(--ink);display:flex;align-items:center;justify-content:center;padding:28px 20px;overflow-x:hidden;-webkit-font-smoothing:antialiased;background:radial-gradient(115% 80% at 50% 20%, var(--bg-glow) 0%, rgba(241,247,241,0) 50%),radial-gradient(140% 120% at 50% 52%, rgba(15,56,38,0) 56%, var(--vignette) 100%),linear-gradient(180deg, var(--bg-1) 0%, var(--bg-2) 56%, var(--bg-3) 100%);}
.aff-login .amb{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden;}
.aff-login .amb span{position:absolute;border-radius:50%;filter:blur(46px);}
.aff-login .amb .a1{top:-90px;left:-70px;width:340px;height:340px;background:radial-gradient(circle,rgba(44,107,75,.34),transparent 70%);animation:affDrift 16s ease-in-out infinite, affPulse 8s ease-in-out infinite;}
.aff-login .amb .a2{top:30%;right:-110px;width:320px;height:320px;background:radial-gradient(circle,rgba(120,170,140,.30),transparent 70%);animation:affDrift2 19s ease-in-out infinite, affPulse 11s ease-in-out infinite;}
.aff-login .amb .a3{bottom:-120px;left:24%;width:380px;height:380px;background:radial-gradient(circle,rgba(22,80,56,.22),transparent 70%);animation:affDrift 22s ease-in-out infinite;}
.aff-login .grain{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.05;mix-blend-mode:overlay;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");}
.aff-login .screen{position:relative;z-index:1;width:100%;max-width:412px;display:flex;flex-direction:column;align-items:center;padding:8px 6px 0;}
.aff-login .brand{display:flex;flex-direction:column;align-items:center;animation:affRise .8s cubic-bezier(.2,.7,.2,1) both;}
.aff-login .logo{position:relative;width:188px;height:176px;margin-bottom:12px;display:flex;align-items:center;justify-content:center;animation:affFloat 6.5s ease-in-out infinite;}
.aff-login .logo .halo{position:absolute;width:230px;height:182px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.78),rgba(255,255,255,0) 64%);filter:blur(6px);}
.aff-login .logo .halo::after{content:"";position:absolute;inset:18px 6px;border-radius:50%;box-shadow:0 0 0 1px rgba(94,138,110,.18);}
.aff-login .logo svg{position:relative;width:184px;height:175px;filter:drop-shadow(0 18px 22px rgba(28,58,40,.30));}
.aff-login .logosvg{position:relative;display:flex;align-items:center;justify-content:center;}
.aff-login .title{font-family:'Playfair Display',serif;font-weight:600;font-size:30px;line-height:1.06;letter-spacing:.004em;text-align:center;color:#172d20;}
.aff-login .eyebrow{font-size:10.5px;font-weight:700;letter-spacing:.4em;color:#6f8377;margin-top:11px;padding-left:.4em;text-transform:uppercase;}
.aff-login .rule{display:flex;align-items:center;gap:9px;margin:16px 0 24px;}
.aff-login .rule i{display:block;width:46px;height:1px;}
.aff-login .rule i:first-child{background:linear-gradient(90deg,transparent,var(--titanium));}
.aff-login .rule i:last-child{background:linear-gradient(90deg,var(--titanium),transparent);}
.aff-login .rule b{width:6px;height:6px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,var(--titanium) 80%);box-shadow:0 0 8px rgba(94,138,110,.55),0 0 0 1px rgba(255,255,255,.6);}
.aff-login .card{position:relative;width:100%;background:linear-gradient(180deg,#ffffff 0%,#f4f9f4 68%,#eaf2eb 100%);border-radius:28px;padding:28px 26px 26px;box-shadow:0 2px 4px rgba(20,46,32,.06),0 8px 16px -6px rgba(20,46,32,.14),0 22px 38px -14px rgba(20,46,32,.26),0 48px 74px -30px rgba(20,46,32,.36),inset 0 1px 0 rgba(255,255,255,1),inset 0 -18px 32px -22px rgba(20,46,32,.13);border:1px solid rgba(204,219,207,.95);animation:affRise .85s cubic-bezier(.2,.7,.2,1) both;animation-delay:.08s;}
.aff-login .card::before{content:"";position:absolute;left:24px;right:24px;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(154,167,172,.55),transparent);}
.aff-login .grp + .grp{margin-top:17px;}
.aff-login label{display:block;font-size:11px;font-weight:700;letter-spacing:.2em;color:var(--label);margin-bottom:9px;}
.aff-login .field{position:relative;display:flex;align-items:center;}
.aff-login .ficon{position:absolute;left:15px;top:50%;transform:translateY(-50%);color:#8aa093;pointer-events:none;transition:color .15s ease;}
.aff-login input{width:100%;border:none;outline:none;background:var(--field);border-radius:15px;padding:15px 16px 15px 45px;font-size:15px;font-family:inherit;color:#21302a;box-shadow:inset 0 2px 5px rgba(20,46,32,.07), inset 0 0 0 1px var(--field-br);transition:box-shadow .18s ease, background .18s ease;}
.aff-login input.pw{padding-right:48px;}
.aff-login input::placeholder{color:#8a9b90;opacity:1;}
.aff-login input:hover{background:#ecf2ec;}
.aff-login input:focus{background:#fff;box-shadow:inset 0 2px 5px rgba(20,46,32,.06), inset 0 0 0 1.6px var(--green),0 0 0 4px rgba(44,107,75,.10);}
.aff-login .field:focus-within .ficon{color:var(--green);}
.aff-login .toggle{position:absolute;right:7px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:9px;display:flex;border-radius:10px;color:#7c8c82;transition:color .15s ease, background .15s ease;}
.aff-login .toggle:hover{color:var(--green);background:rgba(44,107,75,.08);}
.aff-login .err{margin-top:14px;background:rgba(193,53,53,.08);border:1px solid rgba(193,53,53,.22);color:#a93636;border-radius:12px;padding:11px 14px;font-size:12.5px;font-weight:600;text-align:center;letter-spacing:.01em;}
.aff-login .btn{position:relative;overflow:hidden;margin-top:24px;width:100%;border:none;cursor:pointer;border-radius:17px;padding:16px;font-size:15px;font-weight:700;font-family:inherit;color:#fff;letter-spacing:.02em;display:flex;align-items:center;justify-content:center;gap:6px;background:linear-gradient(180deg,var(--green),var(--pine));box-shadow:0 18px 30px -12px rgba(22,61,42,.6), inset 0 1px 0 rgba(255,255,255,.26);transition:transform .12s ease, box-shadow .12s ease;}
.aff-login .btn .arrow{width:0;opacity:0;transform:translateX(-4px);overflow:hidden;transition:width .22s ease, opacity .22s ease, transform .22s ease;}
.aff-login .btn:hover{box-shadow:0 22px 36px -12px rgba(22,61,42,.66), inset 0 1px 0 rgba(255,255,255,.3);}
.aff-login .btn:hover .arrow{width:18px;opacity:1;transform:translateX(0);}
.aff-login .btn:active{transform:translateY(1px);box-shadow:0 9px 18px -10px rgba(22,61,42,.6), inset 0 1px 0 rgba(255,255,255,.26);}
.aff-login .btn::before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 38%,rgba(255,255,255,.28) 50%,transparent 62%);transform:translateX(-120%);transition:transform .6s ease;}
.aff-login .btn:hover::before{transform:translateX(120%);}
.aff-login .foot{margin-top:24px;font-size:11px;color:var(--muted);letter-spacing:.04em;text-align:center;animation:affRise .9s ease both;animation-delay:.16s;}
.aff-login .foot b{font-weight:600;color:#6c7d71;}
.aff-login .btn:focus-visible,.aff-login .toggle:focus-visible{outline:2px solid var(--pine);outline-offset:2px;}
@keyframes affDrift{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(22px,-18px) scale(1.16);}}
@keyframes affDrift2{0%,100%{transform:translate(0,0) scale(1.06);}50%{transform:translate(-20px,16px) scale(.9);}}
@keyframes affPulse{0%,100%{opacity:.42;}50%{opacity:.85;}}
@keyframes affFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-7px);}}
@keyframes affRise{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
@media (max-width:380px){.aff-login .logo{width:160px;height:150px;}.aff-login .logo svg{width:158px;height:150px;}.aff-login .title{font-size:29px;}.aff-login .card{padding:24px 20px;}}
@media (prefers-reduced-motion: reduce){.aff-login *{animation:none !important;transition:none !important;}.aff-login .btn .arrow{width:18px;opacity:1;transform:none;}}
`;
const LOGO=`<svg viewBox="0 0 210 200" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="en" x1="0.3" y1="0" x2="0.72" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.45" stop-color="#f2f5f2"/><stop offset="0.78" stop-color="#e3e9e3"/><stop offset="1" stop-color="#ccd4cb"/></linearGradient>
            <radialGradient id="gl" cx="0.36" cy="0.26" r="0.6"><stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
            <linearGradient id="met" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cdd6da"/><stop offset="0.18" stop-color="#ffffff"/><stop offset="0.42" stop-color="#aab4b9"/><stop offset="0.62" stop-color="#849096"/><stop offset="0.82" stop-color="#aeb8bc"/><stop offset="1" stop-color="#7c878c"/></linearGradient>
            <filter id="bl" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.2"/></filter>
            <clipPath id="crownN"><path d="M28 44 C29 26 43 18 58 18 C73 18 87 26 88 44 C88 70 80 96 58 100 C36 96 28 70 28 44 Z"/></clipPath>
            <clipPath id="toothN"><path d="M28 44 C29 26 43 18 58 18 C73 18 87 26 88 44 C88 64 85 82 81 96 C83 124 84 150 81 167 C80 177 73 178 70 168 C66 150 62 130 59 114 C57 108 53 108 51 114 C49 130 45 150 42 167 C39 178 32 177 31 167 C29 150 28 124 30 96 C26 82 27 64 28 44 Z"/></clipPath>
            <clipPath id="crownI"><path d="M120 44 C120 25 134 17 150 17 C166 17 180 25 180 44 C180 71 173 92 159 98 C153 101 147 101 141 98 C127 92 120 71 120 44 Z"/></clipPath>
            <clipPath id="post"><path d="M134 116 L166 116 L165 150 C164 166 158 184 150 189 C142 184 136 166 135 150 Z"/></clipPath>
          </defs>

          <!-- DENTE NATURAL -->
          <path d="M28 44 C29 26 43 18 58 18 C73 18 87 26 88 44 C88 64 85 82 81 96 C83 124 84 150 81 167 C80 177 73 178 70 168 C66 150 62 130 59 114 C57 108 53 108 51 114 C49 130 45 150 42 167 C39 178 32 177 31 167 C29 150 28 124 30 96 C26 82 27 64 28 44 Z" fill="url(#en)"/>
          <g clip-path="url(#toothN)">
            <ellipse cx="76" cy="120" rx="26" ry="58" fill="#a6b6a8" opacity="0.30" filter="url(#bl)"/>
            <path d="M55 100 C55 128 54 150 53 166" stroke="#93a394" stroke-opacity="0.42" stroke-width="3" fill="none" filter="url(#bl)"/>
            <path d="M37 104 C36 128 36 150 37 166" stroke="#aebcae" stroke-opacity="0.3" stroke-width="2" fill="none" filter="url(#bl)"/>
          </g>
          <g clip-path="url(#crownN)">
            <ellipse cx="74" cy="74" rx="30" ry="34" fill="#a6b6a8" opacity="0.36" filter="url(#bl)"/>
            <ellipse cx="46" cy="38" rx="20" ry="24" fill="url(#gl)" filter="url(#bl)"/>
            <path d="M52 26 C51 38 51 50 52 60" stroke="#9aaa9b" stroke-opacity="0.4" stroke-width="2.2" fill="none" filter="url(#bl)"/>
            <path d="M65 26 C66 38 66 50 65 60" stroke="#9aaa9b" stroke-opacity="0.4" stroke-width="2.2" fill="none" filter="url(#bl)"/>
          </g>
          <ellipse cx="43" cy="32" rx="5" ry="8" fill="#ffffff" opacity="0.9" transform="rotate(-20 43 32)"/>

          <!-- IMPLANTE -->
          <path d="M134 116 L166 116 L165 150 C164 166 158 184 150 189 C142 184 136 166 135 150 Z" fill="url(#met)"/>
          <g clip-path="url(#post)">
            <path d="M132 124 Q150 129 168 124" fill="none" stroke="#73807f" stroke-width="2.4" stroke-opacity="0.6"/>
            <path d="M132 122 Q150 127 168 122" fill="none" stroke="#ffffff" stroke-width="1.3" stroke-opacity="0.55"/>
            <path d="M132 134 Q150 139 168 134" fill="none" stroke="#73807f" stroke-width="2.4" stroke-opacity="0.6"/>
            <path d="M132 132 Q150 137 168 132" fill="none" stroke="#ffffff" stroke-width="1.3" stroke-opacity="0.55"/>
            <path d="M132 144 Q150 149 168 144" fill="none" stroke="#73807f" stroke-width="2.4" stroke-opacity="0.6"/>
            <path d="M132 142 Q150 147 168 142" fill="none" stroke="#ffffff" stroke-width="1.3" stroke-opacity="0.55"/>
            <path d="M134 154 Q150 159 166 154" fill="none" stroke="#73807f" stroke-width="2.4" stroke-opacity="0.6"/>
            <path d="M134 152 Q150 157 166 152" fill="none" stroke="#ffffff" stroke-width="1.3" stroke-opacity="0.55"/>
            <path d="M137 164 Q150 168 163 164" fill="none" stroke="#73807f" stroke-width="2.2" stroke-opacity="0.6"/>
            <path d="M137 162 Q150 166 163 162" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-opacity="0.5"/>
            <path d="M141 174 Q150 177 159 174" fill="none" stroke="#73807f" stroke-width="2" stroke-opacity="0.55"/>
          </g>
          <rect x="129" y="99" width="42" height="17" rx="5" fill="url(#met)"/>
          <rect x="129" y="99" width="42" height="4" rx="2.5" fill="#ffffff" opacity="0.5"/>
          <rect x="129" y="112" width="42" height="3.5" rx="1.8" fill="#5f6c6c" opacity="0.45"/>
          <path d="M120 44 C120 25 134 17 150 17 C166 17 180 25 180 44 C180 71 173 92 159 98 C153 101 147 101 141 98 C127 92 120 71 120 44 Z" fill="url(#en)"/>
          <g clip-path="url(#crownI)">
            <ellipse cx="166" cy="74" rx="30" ry="36" fill="#a6b6a8" opacity="0.38" filter="url(#bl)"/>
            <ellipse cx="138" cy="36" rx="20" ry="24" fill="url(#gl)" filter="url(#bl)"/>
            <path d="M144 24 C143 36 143 48 144 58" stroke="#9aaa9b" stroke-opacity="0.4" stroke-width="2.2" fill="none" filter="url(#bl)"/>
            <path d="M157 24 C158 36 158 48 157 58" stroke="#9aaa9b" stroke-opacity="0.4" stroke-width="2.2" fill="none" filter="url(#bl)"/>
          </g>
          <ellipse cx="135" cy="30" rx="5" ry="8" fill="#ffffff" opacity="0.9" transform="rotate(-20 135 30)"/>
        </svg>`;
return(
<div className="aff-login">
<style dangerouslySetInnerHTML={{__html:STY}} />
<div className="amb"><span className="a1"/><span className="a2"/><span className="a3"/></div>
<div className="grain"/>
<main className="screen">
<div className="brand">
<div className="logo"><div className="halo"/><div className="logosvg" dangerouslySetInnerHTML={{__html:LOGO}}/></div>
<h1 className="title">Affonso Odontologia</h1>
<div className="eyebrow">Sistema de Gestão</div>
<div className="rule"><i/><b/><i/></div>
</div>
<div className="card">
<div className="grp">
<label htmlFor="aff-user">USUÁRIO</label>
<div className="field">
<svg className="ficon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 19.5c.6-3.4 3.3-5.2 6.5-5.2s5.9 1.8 6.5 5.2"/></svg>
<input id="aff-user" value={l} onChange={function(ev){sl(ev.target.value);}} onKeyDown={function(ev){if(ev.key==="Enter")go();}} type="text" placeholder="Digite seu usuário" autoComplete="username"/>
</div>
</div>
<div className="grp">
<label htmlFor="aff-pass">SENHA</label>
<div className="field">
<svg className="ficon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2.4"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>
<input id="aff-pass" className="pw" value={p} onChange={function(ev){sp(ev.target.value);}} onKeyDown={function(ev){if(ev.key==="Enter")go();}} type={sw?"text":"password"} placeholder="Sua senha" autoComplete="current-password"/>
<button type="button" className="toggle" onClick={function(){ssw(!sw);}} aria-label="Mostrar senha"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7"><ellipse cx="12" cy="12" rx="9" ry="6"/><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"/></svg></button>
</div>
</div>
{e&&<div className="err">{e}</div>}
<button type="button" className="btn" onClick={go}><span>Entrar</span><svg className="arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg></button>
</div>
<div className="foot">Acesso restrito à equipe · <b>Affonso Odontologia</b> © 2026</div>
</main>
</div>
);
}

// ══════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
// PIX DENTISTAS
// ══════════════════════════════════════════════════════════
function PixDentistas({recs,setRecs,dents,pats,user}){
var isAdmin=user.level>=2;
var [selDentId,setSelDentId]=useState(isAdmin?(dents[0]&&dents[0].id||null):user.dentistId);
var [selMo,setSelMo]=useState(today().slice(0,7));
var dent=dents.find(function(d){return d.id===selDentId;})||dents[0];

var MONTHS_PT=["Janeiro","Fevereiro","Marco","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
var fmtMo=function(mo){var p=mo.split("-");return(MONTHS_PT[Number(p[1])-1]||p[1])+" de "+p[0];};

var isDentPay=function(payment,d){
  if(!payment||!d)return false;
  var sn=dentShortName(d).toLowerCase();
  var p=payment.toLowerCase();
  return (p.startsWith("pix ")||p.startsWith("cartao ")||p.startsWith("cartão "))&&p.indexOf(sn)>=0;
};

var dentRecs=recs.filter(function(r){return isDentPay(r.payment,dent);}).sort(function(a,b){return b.date.localeCompare(a.date);});

var byMonth={};
dentRecs.forEach(function(r){
  var mo=r.date.slice(0,7);
  if(!byMonth[mo])byMonth[mo]={pix:0,card:0,total:0,recs:[]};
  var p=(r.payment||"").toLowerCase();
  var v=Number(r.value||r.paid||0);
  if(p.startsWith("pix"))byMonth[mo].pix+=v;
  else if(p.startsWith("cart"))byMonth[mo].card+=v;
  byMonth[mo].total+=v;
  byMonth[mo].recs.push(r);
});
var months=Object.keys(byMonth).sort(function(a,b){return b.localeCompare(a);});

// Mes ativo - se o mes selecionado nao tem dados, usar o mais recente
var moAtivo=selMo;
var moData=byMonth[moAtivo]||{pix:0,card:0,total:0,recs:[]};

var [showRecs,setShowRecs]=useState(false);

return <div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">

{/* Header igual ao Gastos */}
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
  <h2 style={{fontFamily:"'Cormorant Garamond'",fontSize:26}}>{"Pix Dentistas"}</h2>
  {/* Seletor de mes - igual ao input month do Gastos */}
  <input type="month" value={moAtivo} onChange={function(e){setSelMo(e.target.value);setShowRecs(false);}}
    style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"7px 11px",fontSize:14,outline:"none"}}/>
</div>

{/* Abas de dentistas - igual abas Clinica/Pessoal */}
{isAdmin&&<div style={{display:"flex",borderBottom:"2px solid "+G.border,flexWrap:"wrap"}}>
  {dents.map(function(d){
    var dtotal=recs.filter(function(r){return isDentPay(r.payment,d)&&r.date&&r.date.startsWith(moAtivo);}).reduce(function(s,r){return s+Number(r.value||r.paid||0);},0);
    var sel=selDentId===d.id;
    return <button key={d.id} onClick={function(){setSelDentId(d.id);setShowRecs(false);}}
      style={{border:"none",background:"none",padding:"9px 16px",fontWeight:700,fontSize:12,cursor:"pointer",
              color:sel?G.primary:G.muted,borderBottom:"3px solid "+(sel?G.primary:"transparent"),
              marginBottom:-2,fontFamily:"'Manrope'",whiteSpace:"nowrap"}}>
      {d.name.replace("Dr. ","").replace("Dra. ","")}
      {dtotal>0&&<span style={{marginLeft:6,fontSize:11,color:sel?G.primary:G.muted}}>{"("+cur(dtotal)+")"}</span>}
    </button>;
  })}
</div>}

{/* Totais do mes - igual Gastos */}
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
  {[["Total Geral",moData.total,G.primary],["PIX",moData.pix,G.success],["Cartao",moData.card,"#1565C0"]].map(function([l,v,c]){return(
    <div key={l} style={{background:G.card,borderRadius:10,padding:"12px",textAlign:"center",borderTop:"3px solid "+c,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
      <div style={{fontSize:10,color:G.muted,fontWeight:700}}>{l}</div>
      <div style={{fontSize:18,fontWeight:700,color:c,marginTop:4}}>{cur(v)}</div>
    </div>
  );})}
</div>

{/* Lista de pagamentos do mes */}
{moData.recs.length===0
  ?<div style={{background:G.card,borderRadius:12,padding:24,textAlign:"center",color:G.muted,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>{"Nenhum pagamento em "+fmtMo(moAtivo)}</div>
  :<div style={{display:"flex",flexDirection:"column",gap:8}}>
    <div style={{fontSize:11,color:G.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".5px",paddingLeft:2}}>{fmtMo(moAtivo)+" · "+moData.recs.length+" pagamento(s)"}</div>
    {moData.recs.slice().sort(function(a,b){var ka=a.ts||((a.date||"")+"T00:00:00");var kb=b.ts||((b.date||"")+"T00:00:00");if(ka<kb)return -1;if(ka>kb)return 1;return (Number(a.id)||0)-(Number(b.id)||0);}).map(function(r){
      var pat=pats.find(function(p){return p.id===r.patientId;});
      var isPix=(r.payment||"").toLowerCase().startsWith("pix");
      var horaPg=r.ts?new Date(r.ts).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):"";
      return <div key={r.id} style={{background:G.card,borderRadius:11,padding:"12px 14px",display:"flex",alignItems:"center",gap:10,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:13}}>{pat&&pat.name||"—"}</div>
          <div style={{fontSize:11,color:G.muted,marginTop:2}}>{fmt(r.date)+(horaPg?" \u00b7 "+horaPg:"")}</div>
        </div>
        <Bdg l={isPix?"PIX":"Cartao"} col={isPix?G.success:"#1565C0"} sm/>
        <span style={{fontWeight:700,fontSize:14,color:isPix?G.success:"#1565C0",minWidth:80,textAlign:"right"}}>{cur(Number(r.value||r.paid||0))}</span>
      </div>;
    })}
  </div>
}

{/* Total geral todos os meses */}
{months.length>0&&<div style={{background:G.primary,borderRadius:12,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
  <span style={{color:"#fff",fontWeight:700,fontSize:13}}>{(dent&&dent.name||"")+" · todos os meses"}</span>
  <span style={{color:"#fff",fontWeight:700,fontSize:18}}>{cur(dentRecs.reduce(function(s,r){return s+Number(r.value||r.paid||0);},0))}</span>
</div>}

</div>;
}

// ══════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
// PIX DENTISTAS
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// AUDITORIA — central de controle (só Admin, leitura)
// ══════════════════════════════════════════════════════════
function Auditoria({pats,appts,recs,treats,setTreats,pros,espera,stock,implCat,implMov,rems,users,dents,pacsTicks,waSent,remarcar,setView,user,auditDismiss,setAuditDismiss}){
var [audOpen,setAudOpen]=useState({});
var audToggle=function(id){setAudOpen(function(p){var n=Object.assign({},p);n[id]=!n[id];return n;});};
// V228: mensagens WhatsApp p/ secao "Conversas sem resposta" (reusa cache economico V196, 1 carga por abertura)
var [waMsgsAud,setWaMsgsAud]=useState([]);
useEffect(function(){var ativo=true;try{supabase.loadWaMessagesLite().then(function(rows){if(ativo)setWaMsgsAud(Array.isArray(rows)?rows:[]);}).catch(function(){});}catch(e){}return function(){ativo=false;};},[]);
if(user.level<3)return <div style={{background:G.card,borderRadius:13,padding:30,textAlign:"center",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff"}}><p style={{color:G.red,fontSize:15}}>🔒 Acesso restrito ao Administrador</p></div>;
var t=today();var ont=yest();
function daysAgo(n){var d=new Date(t+"T12:00");d.setDate(d.getDate()-n);return d.toISOString().split("T")[0];}
function daysAhead(n){var d=new Date(t+"T12:00");d.setDate(d.getDate()+n);return d.toISOString().split("T")[0];}
var d30=daysAgo(30);var d14=daysAgo(14);var amanha=daysAhead(1);var per=t.slice(0,7);
var PCIR=["exodontia","extracao","extração","implante","cirurgia","enxerto","sinus","gengivoplastia","apicectomia","frenectomia","biopsia"];
function isCir(proc){var s=(proc||"").toLowerCase();return PCIR.some(function(k){return s.indexOf(k)>=0;});}
function hasAnam(p){var a=p.anamnese;if(!a)return false;if(a.signedAt||a.signature)return true;var ks=Object.keys(a);for(var i=0;i<ks.length;i++){var v=a[ks[i]];if(v===true)return true;if(typeof v==="string"&&v.trim()&&ks[i]!=="_imp")return true;}return false;}
function bdayDone(p){var k1=pacsTicks&&pacsTicks["bday_month_"+p.id+"_"+per];var k2=pacsTicks&&pacsTicks["bday_week_"+p.id+"_"+per];return !!((k1&&k1.done)||(k2&&k2.done));}
function isBdayOn(p,ds){return p.dob&&ds&&p.dob.slice(5)===ds.slice(5);}
function diasDe(ds){return Math.floor((new Date(t+"T12:00")-new Date(ds+"T12:00"))/86400000);}
function nomeP(id){var p=pats.find(function(x){return x.id===id;});return p?p.name:"Paciente";}

// 1. Aniversariantes sem parabéns (ontem/hoje)
var aniv=pats.filter(function(p){return (isBdayOn(p,t)||isBdayOn(p,ont))&&!bdayDone(p);}).map(function(p){return {nome:p.name,det:"Aniversário "+(p.dob?fmt(p.dob).slice(0,5):"")+(isBdayOn(p,t)?" · hoje 🎉":" · ontem"),key:"aniv_"+p.id};});

// 2. Anamnese pendente (passou em consulta sem anamnese)
var seenAn={};var anamPend=[];
appts.filter(function(a){return a.date<=ont&&a.date>=d14&&a.status!=="cancelled"&&a.status!=="missed"&&a.status!=="rescheduled"&&!a.blocked;}).sort(function(a,b){return b.date.localeCompare(a.date);}).forEach(function(a){var p=pats.find(function(x){return x.id===a.patientId;});if(p&&!hasAnam(p)&&!seenAn[p.id]){seenAn[p.id]=1;anamPend.push({nome:p.name,det:"Consulta em "+fmt(a.date)+" · sem anamnese",key:"anam_"+p.id});}});

// 3. Próteses atrasadas
var protAtras=pros.filter(function(pr){return pr.status==="waiting"&&pr.due&&pr.due<t;}).sort(function(a,b){return a.due.localeCompare(b.due);}).map(function(pr){return {nome:nomeP(pr.patientId),det:(pr.type||"Prótese")+" · previsão "+fmt(pr.due)+" · "+diasDe(pr.due)+" dia(s) atrasada",key:"prot_"+pr.id};});

// 4. Faltas/cancelamentos sem remarcar nem motivo
var remApptIds={};(remarcar||[]).forEach(function(r){if(r.apptId)remApptIds[r.apptId]=1;});
var seenRm={};var remarcarPend=[];
appts.filter(function(a){if(a.status!=="cancelled"&&a.status!=="missed"&&a.status!=="rescheduled")return false;if(a.noRebook)return false;if(a.retorno&&a.retorno.date&&a.retorno.date>t)return false;if(a.date<d30)return false;if(remApptIds[a.id])return false;var fut=appts.some(function(b){return b.patientId===a.patientId&&b.id!==a.id&&b.date>=t&&b.status!=="cancelled"&&b.status!=="missed"&&b.status!=="rescheduled";});return !fut;}).sort(function(a,b){return b.date.localeCompare(a.date);}).forEach(function(a){if(seenRm[a.patientId])return;seenRm[a.patientId]=1;remarcarPend.push({nome:nomeP(a.patientId),det:(a.status==="missed"?"Faltou":a.status==="rescheduled"?"Desmarcou":"Cancelou")+" em "+fmt(a.date)+" · sem remarcar",key:"remarcar_"+a.id});});

// 5. Confirmações pendentes (hoje/amanhã ainda "Pendente")
var confPend=appts.filter(function(a){return (a.date===t||a.date===amanha)&&a.status==="pending";}).sort(function(a,b){return (a.date+a.time).localeCompare(b.date+b.time);}).map(function(a){return {nome:nomeP(a.patientId),det:(a.date===t?"Hoje":"Amanhã")+" "+a.time+" · "+(a.procedure||"")+" · não confirmada",key:"conf_"+a.id};});

// 6. Baixas financeiras em aberto (atendimento feito sem pagamento)
function hasBaixa(a){return recs.some(function(r){return (r.apptId===a.id)||(r.patientId===a.patientId&&r.date===a.date&&Number(r.paid)>0);});}
// Total ja pago por paciente: baixas diretas (recs sem fromTreat) + pagamentos lancados em planos de tratamento
var _pagoByPac={};
recs.forEach(function(r){if(r&&r.patientId!=null&&Number(r.paid)>0&&!r.fromTreat){_pagoByPac[r.patientId]=(_pagoByPac[r.patientId]||0)+Number(r.paid);}});
treats.forEach(function(tt){if(tt&&tt.patientId!=null&&tt.payments){tt.payments.forEach(function(pp){if(pp&&Number(pp.value)>0){_pagoByPac[tt.patientId]=(_pagoByPac[tt.patientId]||0)+Number(pp.value);}});}});
// Total realizado por paciente: consultas feitas (done) com valor
var _realByPac={};
appts.forEach(function(a){if(a&&a.status==="done"&&Number(a.value)>0){_realByPac[a.patientId]=(_realByPac[a.patientId]||0)+Number(a.value);}});
// Paciente coberto: ja pagou (inclusive via plano) pelo menos tanto quanto realizou -> nao esta em debito
function pacCoberto(pid){return (_pagoByPac[pid]||0)>=((_realByPac[pid]||0)-0.5);}
var baixaPend=appts.filter(function(a){return a.status==="done"&&Number(a.value)>0&&a.date<=ont&&a.date>=d14&&!hasBaixa(a)&&!pacCoberto(a.patientId);}).sort(function(a,b){return b.date.localeCompare(a.date);}).map(function(a){return {nome:nomeP(a.patientId),det:(a.procedure||"Atendimento")+" em "+fmt(a.date)+" · "+cur(a.value)+" sem baixa",key:"baixa_"+a.id};});

// 7. Controle semestral (+6 meses sem consulta, sem agendamento)
var semestral=pats.filter(function(p){var last=recs.filter(function(r){return r.patientId===p.id&&Number(r.paid)>0;}).sort(function(a,b){return b.date.localeCompare(a.date);})[0];if(!last)return false;if(retDue(p,last.date)>t)return false;var fut=appts.some(function(a){return a.patientId===p.id&&a.date>=t&&a.status!=="cancelled"&&a.status!=="missed"&&a.status!=="rescheduled";});return !fut;}).map(function(p){var last=recs.filter(function(r){return r.patientId===p.id&&Number(r.paid)>0;}).sort(function(a,b){return b.date.localeCompare(a.date);})[0];return {nome:p.name,det:(retLabel(p,last.date)!=="Semestral"?retLabel(p,last.date)+" · ":"")+"Último atend.: "+fmt(last.date)+" · "+diasDe(last.date)+" dias",key:"sem_"+p.id};});

// 8. Lista de espera vencendo/vencida
var esperaVenc=(espera||[]).filter(function(e){return e.valido&&e.valido<=amanha;}).sort(function(a,b){return a.valido.localeCompare(b.valido);}).map(function(e){return {nome:e.patName||nomeP(e.patientId),det:(e.proc||"")+" · "+(e.valido<t?"VENCIDO em "+fmt(e.valido):e.valido===t?"vence HOJE":"vence amanhã"),key:"espera_"+(e.id||e.patientId)};});

// 9. Estoque baixo (material + implantes)
var estBaixo=[];
stock.filter(function(s){return Number(s.qty)<=Number(s.min);}).forEach(function(s){estBaixo.push({nome:s.name,det:"Material · "+s.qty+" "+(s.unit||"un")+" (mín "+s.min+")",key:"estM_"+s.id});});
var implStock={};(implMov||[]).forEach(function(m){if(!implStock[m.itemId])implStock[m.itemId]=0;if(m.tipo==="entrada")implStock[m.itemId]+=Number(m.qty);else implStock[m.itemId]-=Number(m.qty);});
(implCat||[]).forEach(function(it){var q=implStock[it.id]||0;if(q<=Number(it.estoque_min||0))estBaixo.push({nome:it.desc,det:"Implante · "+q+" un (mín "+(it.estoque_min||0)+")",key:"estI_"+it.id});});

// 10. Pós-cirúrgico (cirurgia ontem, sem contato automático)
var posCir=appts.filter(function(a){return a.date===ont&&(a.status==="done"||a.status==="confirmed")&&isCir(a.procedure)&&!(waSent&&waSent["pc_"+a.id]);}).map(function(a){return {nome:nomeP(a.patientId),det:(a.procedure||"Cirurgia")+" ontem · sem contato",key:"poscir_"+a.id};});

// 11. Orçamentos lançados e não enviados/impressos
var orcPend=treats.filter(function(tt){var st=tt.orcStatus||"espera";return st==="espera"&&!tt.orcEnviado&&tt.start&&tt.start<=ont&&tt.start>=d30;}).sort(function(a,b){return b.start.localeCompare(a.start);}).map(function(tt){return {nome:nomeP(tt.patientId),det:(tt.name||"Plano")+" · lançado em "+fmt(tt.start),key:"orc_"+tt.id,tid:tt.id};});

// 12. Recados/tarefas não cumpridos
function nomeFunc(uid){var u=users.find(function(x){return x.id===uid;});return u?u.name.split(" ")[0]:"Geral";}
var recados=(rems||[]).filter(function(r){return !r.done&&r.date&&r.date<t;}).sort(function(a,b){return a.date.localeCompare(b.date);}).map(function(r){return {nome:r.title,det:"Para "+nomeFunc(r.assignedUserId)+" · "+fmt(r.date)+" · "+diasDe(r.date)+" dia(s) parado"+(r.patientId?" · "+nomeP(r.patientId):""),key:"recado_"+r.id};});

// V228 - 13. Consultas passadas sem status definido
function nomeD(id){var d=dents.find(function(x){return x.id===id;});return d?d.name:"";}
var semStatus=appts.filter(function(a){return !a.blocked&&a.date<=ont&&a.date>=d30&&(a.status==="pending"||a.status==="confirmed"||a.status==="waiting");}).sort(function(a,b){return b.date.localeCompare(a.date);}).map(function(a){return {nome:nomeP(a.patientId),det:fmt(a.date)+" "+(a.time||"")+" \u00b7 "+(a.procedure||"Consulta")+(nomeD(a.dentistId)?" \u00b7 "+nomeD(a.dentistId):"")+" \u00b7 sem status"+(a._by?" \u00b7 \ud83d\udd75\ufe0f agendou: "+String(a._by).split(" ")[0]:""),key:"semst_"+a.id};});

// V228 - 14. Fichas novas sem "como nos conheceu"
var origemPend=pats.filter(function(p){return !p.origem&&p.since&&p.since>=d30&&p.since<=t;}).sort(function(a,b){return (b.since||"").localeCompare(a.since||"");}).map(function(p){return {nome:p.name,det:"Cadastro em "+fmt(p.since)+" \u00b7 campo em branco",key:"origem_"+p.id};});

// V228 - 15. Conversas com paciente aguardando resposta ha 2h+ (mesmo criterio do V214: ultima msg e do paciente, nao e botao 1/2)
var chatPend=[];
(function(){
var soDigA=function(s){return (s||"").replace(/\D/g,"");};
var seenWA={};var gr={};
(waMsgsAud||[]).forEach(function(m){var w=m.wamid;if(w&&seenWA[w])return;if(w)seenWA[w]=1;var ph=soDigA(m.phone);if(!ph)return;if(!gr[ph])gr[ph]=[];gr[ph].push(m);});
Object.keys(gr).forEach(function(ph){
var ms=gr[ph];ms.sort(function(a,b){return (a.id||0)-(b.id||0);});
var lastM=ms[ms.length-1];if(!lastM||lastM.direction!=="in")return;
var tx=(lastM.body||"").trim();if(tx==="1"||tx==="2")return;
var ts=lastM.ts||lastM.created_at;if(!ts)return;
var hrs=Math.floor((Date.now()-new Date(ts).getTime())/3600000);if(hrs<2)return;
var l8=soDigA(ph).slice(-8);var pac=l8.length>=8?pats.find(function(p){return soDigA(p.phone).slice(-8)===l8;}):null;
var nome=pac?pac.name:(ms.map(function(m){return m.patient_name;}).filter(Boolean)[0]||("+"+ph));
var snip=tx.length>42?tx.slice(0,42)+"\u2026":tx;
chatPend.push({nome:nome,det:"\""+snip+"\" \u00b7 sem resposta h\u00e1 "+(hrs>=48?Math.floor(hrs/24)+" dia(s)":hrs+"h"),key:"chat_"+ph+"_"+(lastM.id||0),_h:hrs});
});
chatPend.sort(function(a,b){return b._h-a._h;});
})();

var SEC=[
{id:"semst",ic:"\ud83d\udcdd",t:"Consultas sem status",col:G.red,view:"agenda",items:semStatus},
{id:"origem",ic:"\ud83c\udd95",t:"Fichas sem \"como nos conheceu\"",col:G.gold,view:"pacs",items:origemPend},
{id:"chat",ic:"\ud83d\udcac",t:"Conversas sem resposta",col:"#128C7E",view:"conversas",items:chatPend},
{id:"conf",ic:"📲",t:"Confirmações pendentes",col:G.blue,view:"agenda",items:confPend},
{id:"remarcar",ic:"🔄",t:"Faltas/cancelamentos sem remarcar",col:G.red,view:"remarcar",items:remarcarPend},
{id:"baixa",ic:"💰",t:"Baixas financeiras em aberto",col:G.red,view:"fin",items:baixaPend},
{id:"prot",ic:"🏥",t:"Próteses atrasadas",col:G.orange,view:"pros",items:protAtras},
{id:"anam",ic:"📋",t:"Anamnese pendente",col:G.purple,view:"pacs",items:anamPend},
{id:"aniv",ic:"🎂",t:"Aniversariantes sem parabéns",col:G.gold,view:"lems",items:aniv},
{id:"poscir",ic:"🔴",t:"Pós-cirúrgico sem contato",col:G.red,view:"lems",items:posCir},
{id:"orc",ic:"📄",t:"Orçamentos lançados e não enviados",col:G.primary,view:"pacs",items:orcPend},
{id:"recados",ic:"📌",t:"Recados/tarefas não cumpridos",col:G.purple,view:"lems",items:recados},
{id:"espera",ic:"⏳",t:"Lista de espera vencendo",col:"#7B1FA2",view:"lems",items:esperaVenc},
{id:"semestral",ic:"📅",t:"Controle semestral pendente",col:G.orange,view:"lems",items:semestral},
{id:"estoque",ic:"📦",t:"Estoque baixo",col:G.red,view:"stk",items:estBaixo},
];
SEC=SEC.map(function(s){return Object.assign({},s,{items:s.items.filter(function(it){return !(auditDismiss&&it.key&&auditDismiss[it.key]&&auditDismiss[it.key].done);})});});
var nExcl=Object.keys(auditDismiss||{}).filter(function(k){return auditDismiss[k]&&auditDismiss[k].done;}).length;
var total=SEC.reduce(function(s,x){return s+x.items.length;},0);
var SecRow=function(props){
var sec=props.sec;
var op=props.open;
var n=sec.items.length;
var capped=sec.items.slice(0,60);
return <div style={{background:G.card,borderRadius:12,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",overflow:"hidden",borderLeft:"4px solid "+(n>0?sec.col:G.border)}}>
<div onClick={function(){if(n>0)props.toggle(sec.id);}} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",cursor:n>0?"pointer":"default"}}>
<span style={{fontSize:18}}>{sec.ic}</span>
<span style={{flex:1,fontWeight:700,fontSize:13.5,color:n>0?G.text:G.muted}}>{sec.t}</span>
{n>0
?<span style={{background:sec.col,color:"#fff",borderRadius:12,padding:"2px 11px",fontSize:13,fontWeight:700,minWidth:30,textAlign:"center"}}>{n}</span>
:<span style={{color:G.success,fontSize:12,fontWeight:700}}>✓ em dia</span>}
{n>0&&<span style={{color:G.muted,fontSize:14,transform:op?"rotate(90deg)":"none",transition:"transform .2s"}}>▶</span>}
</div>
{op&&n>0&&<div style={{padding:"0 14px 12px"}}>
<div style={{borderTop:"1px solid "+G.border,paddingTop:8,display:"flex",flexDirection:"column",gap:6}}>
{capped.map(function(it,i){return <div key={i} style={{display:"flex",gap:9,alignItems:"flex-start",background:G.bg,borderRadius:8,padding:"8px 11px"}}>
<span style={{color:sec.col,fontSize:13,fontWeight:700,marginTop:1}}>•</span>
<div style={{flex:1}}>
<div style={{fontWeight:700,fontSize:12.5}}>{it.nome}</div>
<div style={{fontSize:11,color:G.muted,marginTop:1}}>{it.det}</div>
</div>
{it.tid&&<button onClick={function(){setTreats&&setTreats(function(prev){return prev.map(function(x){return x.id!==it.tid?x:Object.assign({},x,{_ts:Date.now(),orcEnviado:true,orcEnviadoAt:today()});});});}} title="Marcar orçamento como enviado ao paciente" style={{border:"none",background:G.success,color:"#fff",cursor:"pointer",fontSize:11,fontWeight:700,borderRadius:8,padding:"4px 10px",flexShrink:0,alignSelf:"flex-start",whiteSpace:"nowrap"}}>{"📤 Enviado"}</button>}
{it.key&&<button onClick={function(){setAuditDismiss(function(prev){var nn=Object.assign({},prev||{});nn[it.key]={done:true,ts:Date.now(),by:(user&&user.name)||""};return nn;});}} title="Excluir da auditoria" style={{border:"none",background:"none",color:G.muted,cursor:"pointer",fontSize:16,lineHeight:1,padding:"2px 4px",flexShrink:0,alignSelf:"flex-start"}}>✕</button>}
</div>;})}
{n>capped.length&&<div style={{fontSize:11,color:G.muted,textAlign:"center",padding:"4px 0"}}>{"+ "+(n-capped.length)+" outro(s)"}</div>}
<button onClick={function(){setView(sec.view);}} style={{alignSelf:"flex-start",background:"none",border:"1px solid "+G.border,borderRadius:8,padding:"5px 12px",fontSize:11,fontWeight:700,color:G.muted,cursor:"pointer",marginTop:2}}>{"Abrir tela →"}</button>
</div>
</div>}
</div>;
};
return <div style={{display:"flex",flexDirection:"column",gap:12}} className="fi">
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
<div>
<h2 style={{fontFamily:"'Cormorant Garamond'",fontSize:26,margin:0}}>🔍 Auditoria</h2>
<div style={{fontSize:12,color:G.muted}}>Pendências de ontem + acumuladas</div>
</div>
</div>
{total===0
?<div style={{background:"var(--green-soft)",border:"2px solid #A5D6A7",borderRadius:14,padding:"22px 16px",textAlign:"center"}}>
<div style={{fontSize:40,marginBottom:6}}>✅</div>
<div style={{fontWeight:700,fontSize:16,color:"#2E7D32"}}>Tudo em dia!</div>
<div style={{fontSize:12,color:G.muted,marginTop:3}}>Nenhuma pendência encontrada.</div>
</div>
:<div style={{background:G.red+"12",border:"2px solid "+G.red,borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
<span style={{fontSize:30}}>🔴</span>
<div>
<div style={{fontWeight:700,fontSize:16,color:G.red}}>{total+" pendência(s) precisam de atenção"}</div>
<div style={{fontSize:12,color:G.muted,marginTop:2}}>Toque em cada tópico para ver os casos.</div>
</div>
</div>}
{SEC.map(function(sec){return <SecRow key={sec.id} sec={sec} open={!!audOpen[sec.id]} toggle={audToggle}/>;})}
{nExcl>0&&<div style={{display:"flex",justifyContent:"center"}}><button onClick={function(){setAuditDismiss({});}} style={{background:"none",border:"1px solid "+G.border,borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,color:G.muted,cursor:"pointer"}}>{"↩ Restaurar "+nExcl+" excluido(s)"}</button></div>}
<div style={{fontSize:11,color:G.muted,textAlign:"center",padding:"6px 0 2px"}}>Auditoria é apenas para acompanhamento. As ações são executadas nas telas de cada setor.</div>
</div>;
}


// ══════════════════════════════════════════════════════════
// ORIENTAÇÕES — recomendações ao paciente (todos)
// ══════════════════════════════════════════════════════════
var ORIENT_DEFAULT=[
{id:"o_posexo",ic:"🦷",titulo:"Pós-operatório de extração (geral)",texto:"Olá, {nome}! Seguem as orientações após a extração do dente:\n\n• Morda a gaze por 30 a 40 minutos. Se o sangramento continuar, troque por outra gaze limpa e morda novamente.\n• Nas primeiras 24h: NÃO cuspa com força, não faça bochechos, não use canudo e não fume — isso pode soltar o coágulo e atrasar a cicatrização.\n• Faça compressa de gelo na região do rosto (20 min com pano, 20 min sem) nas primeiras horas para reduzir o inchaço.\n• Prefira alimentos frios ou mornos e pastosos no primeiro dia (sopas, purês, iogurte). Evite alimentos quentes e duros.\n• Não pratique esforço físico nas primeiras 48h.\n• Tome os medicamentos conforme a receita.\n• A partir do dia seguinte, faça bochechos suaves com água morna e sal (1 colher de chá em 1 copo) após as refeições.\n\nInchaço e leve desconforto são normais nos primeiros dias. Em caso de sangramento intenso, dor forte que não passa com o remédio ou febre, entre em contato conosco.\n\nAffonso Odontologia 🦷"},
{id:"o_presiso",ic:"⚠️",titulo:"Pré-cirurgia de siso (incl. parestesia)",texto:"Olá, {nome}! Orientações antes da cirurgia de extração do siso:\n\n• Alimente-se bem antes do procedimento (não venha em jejum, salvo orientação contrária).\n• Tome os medicamentos pré-operatórios se foram prescritos.\n• Venha acompanhado(a) e use roupas confortáveis.\n• Avise-nos se fizer uso de algum medicamento, anticoagulante ou se tiver alergia.\n\nIMPORTANTE — sobre riscos: a extração de sisos é um procedimento seguro, mas como o dente fica próximo a um nervo, existe a possibilidade (pequena e geralmente temporária) de PARESTESIA — uma dormência ou formigamento no lábio, língua ou queixo. Na maioria dos casos isso é passageiro e se recupera com o tempo. Estamos à disposição para esclarecer qualquer dúvida antes da cirurgia.\n\nApós a cirurgia, entregaremos as orientações de pós-operatório.\n\nAffonso Odontologia 🦷"},
{id:"o_implante",ic:"🔩",titulo:"Cuidados após instalar implante",texto:"Olá, {nome}! Cuidados após a colocação do implante:\n\n• Nas primeiras 24h evite bochechos, cuspir com força, canudo e cigarro.\n• Faça compressa de gelo no rosto nas primeiras horas para diminuir o inchaço.\n• Alimentação fria/morna e pastosa nos primeiros dias; evite mastigar do lado operado.\n• Mantenha a higiene da boca, mas com delicadeza na região do implante. A partir do dia seguinte, bochechos suaves com água morna e sal após as refeições.\n• Tome os medicamentos conforme a receita.\n• Evite esforço físico nas primeiras 48h.\n• Não mexa na região com a língua ou os dedos.\n\nO implante precisa de um período de cicatrização (osseointegração) para se fixar ao osso — por isso é fundamental comparecer aos retornos. Em caso de dor intensa, inchaço que aumenta ou mobilidade, entre em contato.\n\nAffonso Odontologia 🦷"},
{id:"o_aparelho",ic:"😬",titulo:"Orientações com aparelho ortodôntico",texto:"Olá, {nome}! Cuidados com seu aparelho ortodôntico:\n\n• Escove os dentes após TODAS as refeições — o aparelho acumula mais restos de comida. Use escova específica e capriche ao redor de cada bracket.\n• Use o fio dental diariamente (com passa-fio se necessário).\n• Evite alimentos duros (gelo, castanhas, balas duras), pegajosos (chicletes, caramelos) e morder coisas com os dentes da frente (maçã e sanduíches: corte em pedaços).\n• Se um bracket soltar ou um fio machucar, use a cera ortodôntica e entre em contato para reagendar.\n• Não falte às consultas de manutenção — o tratamento depende dos ajustes no tempo certo.\n\nUm leve incômodo após os ajustes é normal e passa em poucos dias.\n\nAffonso Odontologia 🦷"},
{id:"o_contencao",ic:"🦷",titulo:"Uso da contenção (pós-aparelho)",texto:"Olá, {nome}! Agora que você terminou o tratamento ortodôntico, a CONTENÇÃO é essencial:\n\n• Os dentes têm uma tendência natural de voltar à posição antiga. A contenção é o que mantém seu sorriso alinhado.\n• Use a contenção exatamente como orientado (geralmente à noite para dormir, ou conforme indicação).\n• Contenção removível: retire para comer e para escovar; guarde sempre no estojo (nunca enrolada em guardanapo — é o jeito mais comum de perder ou quebrar).\n• Limpe a contenção diariamente com escova e água; evite água quente (deforma).\n• Contenção fixa (fio atrás dos dentes): mantenha a higiene com fio dental e passa-fio.\n• Compareça aos retornos para verificarmos a contenção.\n\nUsar a contenção é para a vida toda em algum nível — é o que protege todo o investimento do seu tratamento.\n\nAffonso Odontologia 🦷"},
{id:"o_semestral",ic:"📅",titulo:"Importância do controle semestral",texto:"Olá, {nome}! Lembrete sobre a importância da sua revisão semestral:\n\n• Visitar o dentista a cada 6 meses permite identificar problemas no início — quando o tratamento é mais simples, rápido e barato.\n• Na consulta de controle fazemos a limpeza profissional (remoção de tártaro), avaliamos cáries, gengiva, restaurações antigas e a saúde geral da boca.\n• Muitos problemas (cárie inicial, gengivite, fissuras) não doem no começo — só um exame profissional detecta a tempo.\n• Prevenir é sempre melhor (e mais econômico) do que tratar.\n\nJá faz um tempo desde sua última visita? Entre em contato e vamos agendar sua revisão! Seu sorriso agradece. 😊\n\nAffonso Odontologia 🦷"},
{id:"o_escovacao",ic:"🪥",titulo:"Escovação e fio dental",texto:"Olá, {nome}! Orientações de higiene bucal:\n\n• Escove os dentes pelo menos 3x ao dia (de manhã, e principalmente antes de dormir).\n• Use uma escova de cerdas macias e troque a cada 3 meses (ou quando as cerdas abrirem).\n• Coloque uma quantidade de pasta com flúor do tamanho de um grão de ervilha.\n• Escove com movimentos suaves, inclinando a escova em direção à gengiva. Não esqueça da parte de trás dos dentes e da língua.\n• Use o FIO DENTAL todos os dias — a escova não alcança entre os dentes, onde mais se formam cáries e tártaro.\n• Evite escovar com força excessiva: machuca a gengiva e desgasta o dente.\n\nUma boa higiene é o segredo para evitar cáries, mau hálito e problemas na gengiva.\n\nAffonso Odontologia 🦷"},
{id:"o_clareamento",ic:"✨",titulo:"Clareamento dental (o que evitar)",texto:"Olá, {nome}! Para o seu clareamento dar certo, atenção nestes cuidados:\n\nNos primeiros dias (e durante o tratamento), EVITE alimentos e bebidas que mancham os dentes:\n• Café, chá preto/mate, refrigerantes de cola\n• Vinho tinto, suco de uva, açaí\n• Molho de tomate, molho shoyu, curry, beterraba\n• Frutas vermelhas (amora, morango em excesso)\n• Cigarro (mancha muito e prejudica o resultado)\n\nDicas:\n• Prefira alimentos claros (a chamada \"dieta branca\"): frango, arroz, batata, peixe, leite, queijo branco.\n• Se consumir algo colorido, escove os dentes ou enxágue logo depois.\n• Uma sensibilidade leve nos dentes durante o clareamento é normal e passageira.\n• Siga o tempo de uso das placas/gel exatamente como orientado.\n\nO resultado depende muito desses cuidados. Capriche! 😁\n\nAffonso Odontologia 🦷"},
{id:"o_poscanal",ic:"🩹",titulo:"Após canal / restauração",texto:"Olá, {nome}! Cuidados após o tratamento de canal/restauração:\n\n• Espere o efeito da anestesia passar antes de comer, para não morder a bochecha ou a língua.\n• Evite mastigar do lado tratado nas primeiras horas.\n• Uma sensibilidade leve ao mastigar nos primeiros dias é normal, principalmente após canal.\n• Mantenha a higiene normal na região.\n• No caso de canal, o dente pode precisar de uma coroa/proteção depois — não deixe de concluir o tratamento, pois o dente fica mais frágil.\n• Se sentir dor forte, inchaço ou a restauração \"alta\" (atrapalhando a mordida), entre em contato para um ajuste.\n\nAffonso Odontologia 🦷"},
{id:"o_gengiva",ic:"🩸",titulo:"Sangramento gengival / gengivite",texto:"Olá, {nome}! Orientações sobre o sangramento na gengiva:\n\n• Gengiva que sangra ao escovar geralmente é sinal de gengivite — inflamação causada pelo acúmulo de placa e tártaro.\n• Ao contrário do que muitos pensam, NÃO se deve parar de escovar o local que sangra — é justamente a falta de higiene que causa o problema.\n• Escove suavemente e capriche no fio dental diariamente: em poucos dias a gengiva tende a parar de sangrar.\n• A limpeza profissional no consultório remove o tártaro que a escova não tira.\n• Se o sangramento persistir mesmo com boa higiene, agende uma avaliação.\n\nGengiva saudável é rosada e firme, e não sangra. Cuide dela! 😊\n\nAffonso Odontologia 🦷"},
];
function Orientacoes({pats,orientacoes,setOrientacoes,user}){
var [patId,setPatId]=useState("");
var [openId,setOpenId]=useState(null);
var [editId,setEditId]=useState(null);
var [ef,setEf]=useState({titulo:"",texto:""});
var [addMod,setAddMod]=useState(false);
var [af,setAf]=useState({titulo:"",texto:""});
var lista=orientacoes&&orientacoes.length?orientacoes:ORIENT_DEFAULT;
var pat=pats.find(function(p){return p.id===Number(patId);});
var nome=pat?pat.name.split(" ")[0]:"paciente";
function pers(txt){return (txt||"").replace(/{nome}/g,nome);}
function enviarWA(o){
if(!pat){alert("Selecione o paciente primeiro para enviar pelo WhatsApp.");return;}
if(!pat.phone){alert("Este paciente não tem telefone cadastrado.");return;}
wa(pat.phone,pers(o.texto));
}
function imprimir(o){
var hoje=new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"});
var corpo=pers(o.texto).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>");
var h="<!DOCTYPE html><html><head><meta charset='utf-8'><title>Orientacao</title>";
h+="<style>@page{size:A4;margin:18mm 16mm;}*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Georgia,'Times New Roman',serif;color:#1a2420;}";
h+=".hd{text-align:center;border-bottom:3px solid rgb(47,93,73);padding-bottom:14px;margin-bottom:22px;}";
h+=".logo{font-size:34px;}.cnome{font-size:26px;font-weight:700;color:rgb(47,93,73);letter-spacing:.5px;margin-top:2px;}";
h+=".csub{font-size:12px;color:#666;letter-spacing:2px;text-transform:uppercase;margin-top:3px;}";
h+=".pac{font-size:14px;margin-bottom:6px;}.data{font-size:13px;color:#666;margin-bottom:24px;}";
h+=".titulo{font-size:21px;font-weight:700;color:rgb(47,93,73);margin-bottom:14px;border-left:5px solid rgb(47,93,73);padding-left:12px;}";
h+=".corpo{font-size:15px;line-height:1.85;text-align:justify;white-space:normal;}";
h+=".foot{position:fixed;bottom:14mm;left:16mm;right:16mm;text-align:center;border-top:1px solid #ccc;padding-top:10px;font-size:11px;color:#777;}";
h+="</style></head><body>";
h+="<div class='hd'><div class='logo'>🦷</div><div class='cnome'>"+CLINICA_INFO.nome+"</div><div class='csub'>Orientacoes ao Paciente</div></div>";
h+="<div class='pac'><strong>Paciente:</strong> "+(pat?pat.name:"_______________________________")+"</div>";
h+="<div class='data'>Sao Paulo, "+hoje+"</div>";
h+="<div class='titulo'>"+o.titulo+"</div>";
h+="<div class='corpo'>"+corpo+"</div>";
h+="<div class='foot'>"+CLINICA_INFO.nome+" &nbsp;|&nbsp; "+CLINICA_INFO.endereco+" &nbsp;|&nbsp; Tel. "+CLINICA_INFO.telefone+"</div>";
h+="</body></html>";
var w=window.open("","_blank");
if(!w){alert("Permita pop-ups para imprimir.");return;}
w.document.write(h);w.document.close();
setTimeout(function(){w.focus();w.print();},400);
}
function salvarEdit(){
if(!ef.titulo.trim()||!ef.texto.trim()){alert("Preencha título e texto.");return;}
setOrientacoes(lista.map(function(o){return o.id===editId?{...o,_ts:Date.now(),titulo:ef.titulo,texto:ef.texto}:o;}));
setEditId(null);
}
function salvarNova(){
if(!af.titulo.trim()||!af.texto.trim()){alert("Preencha título e texto.");return;}
setOrientacoes([...lista,{id:"o_"+Date.now(),_ts:Date.now(),ic:"📄",titulo:af.titulo,texto:af.texto}]);
setAddMod(false);setAf({titulo:"",texto:""});
}
function excluir(o){
if(!window.confirm("Excluir a orientação \""+o.titulo+"\"?"))return;
setOrientacoes(lista.filter(function(x){return x.id!==o.id;}));
}
return <div style={{display:"flex",flexDirection:"column",gap:14}} className="fi">
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
<h2 style={{fontFamily:"'Cormorant Garamond'",fontSize:26,margin:0}}>📖 Orientações</h2>
<Btn ch="+ Nova Orientação" sm onClick={function(){setAf({titulo:"",texto:""});setAddMod(true);}}/>
</div>
<div style={{background:G.accent,borderRadius:12,padding:"10px 14px",fontSize:12,color:G.primary}}>
Escolha o paciente para personalizar com o nome dele, depois abra a orientação e envie por WhatsApp ou imprima.
</div>
<PatSearch lb="Paciente (opcional)" val={patId} set={setPatId} pats={pats} optional/>
{pat&&<div style={{fontSize:12,color:G.muted}}>Personalizado para: <strong style={{color:G.primary}}>{pat.name}</strong></div>}
<div style={{display:"flex",flexDirection:"column",gap:9}}>
{lista.map(function(o){
var op=openId===o.id;
var ed=editId===o.id;
return <div key={o.id} style={{background:G.card,borderRadius:12,boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",overflow:"hidden",borderLeft:"4px solid "+G.primary}}>
<div onClick={function(){setOpenId(op?null:o.id);setEditId(null);}} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",cursor:"pointer"}}>
<span style={{fontSize:18}}>{o.ic}</span>
<span style={{flex:1,fontWeight:700,fontSize:13.5}}>{o.titulo}</span>
<span style={{color:G.muted,fontSize:14,transform:op?"rotate(90deg)":"none",transition:"transform .2s"}}>▶</span>
</div>
{op&&<div style={{padding:"0 14px 14px"}}>
{!ed?<>
<div style={{background:G.bg,borderRadius:10,padding:"12px 14px",fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap",color:G.text,borderTop:"1px solid "+G.border}}>{pers(o.texto)}</div>
<div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:10}}>
<button onClick={function(){enviarWA(o);}} style={{background:"#25D366",color:"#fff",border:"none",borderRadius:8,padding:"7px 13px",fontSize:12,fontWeight:700,cursor:"pointer"}}>📱 WhatsApp</button>
<button onClick={function(){imprimir(o);}} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"7px 13px",fontSize:12,fontWeight:700,cursor:"pointer"}}>🖨️ Imprimir</button>
<button onClick={function(){setEditId(o.id);setEf({titulo:o.titulo,texto:o.texto});}} style={{background:"var(--surface)",color:G.primary,border:"1.5px solid "+G.primary,borderRadius:8,padding:"7px 13px",fontSize:12,fontWeight:700,cursor:"pointer"}}>✏️ Editar</button>
<button onClick={function(){excluir(o);}} style={{background:"var(--surface)",color:G.red,border:"1px solid "+G.red,borderRadius:8,padding:"7px 11px",fontSize:12,fontWeight:700,cursor:"pointer"}}>🗑️</button>
</div>
</>:<div style={{display:"flex",flexDirection:"column",gap:9,borderTop:"1px solid "+G.border,paddingTop:12}}>
<Inp lb="Título" val={ef.titulo} set={function(v){setEf(function(p){return {...p,titulo:v};});}}/>
<div style={{display:"flex",flexDirection:"column",gap:4}}>
<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Texto (use {"{nome}"} para o nome do paciente)</label>
<textarea value={ef.texto} onChange={function(e){setEf(function(p){return {...p,texto:e.target.value};});}} rows={12} style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"10px 12px",fontSize:13,outline:"none",resize:"vertical",fontFamily:"'Manrope'",lineHeight:1.6}}/>
</div>
<div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
<button onClick={function(){setEditId(null);}} style={{border:"1.5px solid "+G.primary,background:"transparent",color:G.primary,borderRadius:8,padding:"8px 15px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
<button onClick={salvarEdit} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:700,cursor:"pointer"}}>💾 Salvar</button>
</div>
</div>}
</div>}
</div>;
})}
</div>
{addMod&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
<div style={{background:G.card,borderRadius:16,width:"100%",maxWidth:560,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 22px 55px rgba(30,45,38,.30),inset 0 1px 0 rgba(251,255,247,.55)"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid "+G.border}}>
<span style={{fontFamily:"'Cormorant Garamond'",fontSize:20}}>Nova Orientação</span>
<button onClick={function(){setAddMod(false);}} style={{border:"none",background:"none",fontSize:24,cursor:"pointer",color:G.muted}}>×</button>
</div>
<div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
<Inp lb="Título" val={af.titulo} set={function(v){setAf(function(p){return {...p,titulo:v};});}} ph="Ex: Cuidados após clareamento"/>
<div style={{display:"flex",flexDirection:"column",gap:4}}>
<label style={{fontSize:11,fontWeight:700,color:G.muted,textTransform:"uppercase",letterSpacing:".4px"}}>Texto (use {"{nome}"} para o nome do paciente)</label>
<textarea value={af.texto} onChange={function(e){setAf(function(p){return {...p,texto:e.target.value};});}} rows={12} placeholder={"Olá, {nome}! ..."} style={{border:"1.5px solid "+G.border,borderRadius:8,padding:"10px 12px",fontSize:13,outline:"none",resize:"vertical",fontFamily:"'Manrope'",lineHeight:1.6}}/>
</div>
<div style={{display:"flex",gap:9,justifyContent:"flex-end",paddingTop:12,borderTop:"1px solid "+G.border}}>
<button onClick={function(){setAddMod(false);}} style={{border:"1.5px solid "+G.primary,background:"transparent",color:G.primary,borderRadius:8,padding:"8px 16px",fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
<button onClick={salvarNova} style={{background:G.primary,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:14,fontWeight:700,cursor:"pointer"}}>💾 Salvar</button>
</div>
</div>
</div>
</div>}
</div>;
}


function Conversas({pats,user,waSeenRef,onSeen,abrirFicha}){
const [msgs,setMsgs]=useState([]);
const [filtroTipo,setFiltroTipo]=useState(null); // V214: filtro por tipo de mensagem

const [loading,setLoading]=useState(true);
const [sel,setSel]=useState(null);
const [q,setQ]=useState("");
const [txt,setTxt]=useState("");
const [sending,setSending]=useState(false);
const [erro,setErro]=useState("");
const bottomRef=useRef(null);
const load=function(){
supabase.loadWaMessagesLite().then(function(rows){ // V196: poll economico (delta por id)
setMsgs(rows);setLoading(false);
var maxId=0;rows.forEach(function(m){if((m.id||0)>maxId)maxId=m.id;});
if(onSeen)onSeen(maxId);
});
};
useEffect(function(){load();var t=setInterval(load,15000);return function(){clearInterval(t);};},[]);
useEffect(function(){if(sel&&bottomRef.current)bottomRef.current.scrollTop=bottomRef.current.scrollHeight;},[sel,msgs]);
var soDig=function(s){return (s||"").replace(/\D/g,"");};
var last8=function(s){var d=soDig(s);return d.slice(-8);};
var acharPac=function(phone){var l8=last8(phone);if(l8.length<8)return null;return pats.find(function(p){return last8(p.phone)===l8;});};
var fmtHora=function(ts){if(!ts)return "";try{var d=new Date(ts);var h=new Date();if(d.toDateString()===h.toDateString())return d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});return d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"});}catch(e){return "";}};
var tick=function(s){if(s==="read"||s==="delivered")return "\u2713\u2713";if(s==="sent")return "\u2713";return "";};
// V214: classificacao da conversa pelo texto da ultima mensagem
var WA_TIPOS={responder:{cor:"#c0392b",label:"AGUARDANDO RESPOSTA",emo:"\ud83d\udcac"},agendamento:{cor:"#3b6ea5",label:"AGENDAMENTO",emo:"\ud83d\udcc5"},vespera:{cor:"#7c5cbf",label:"V\u00c9SPERA",emo:"\ud83d\udd14"},confirmou:{cor:"#2f8f5f",label:"CONFIRMOU",emo:"\u2705"},poscir:{cor:"#c2703d",label:"P\u00d3S-CIR\u00daRGICO",emo:"\ud83c\udfe5"},aniversario:{cor:"#c25b8a",label:"ANIVERS\u00c1RIO",emo:"\ud83c\udf82"},orcamento:{cor:"#d4930d",label:"OR\u00c7AMENTO",emo:"\ud83d\udcb0"},outros:{cor:"#b7950b",label:"AUTOM\u00c1TICO",emo:"\ud83d\udce8"},neutro:{cor:null,label:null,emo:null}};
var waTipo=function(g){
var nb=function(s){return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");};
var b=nb(g.lastBody);var t=(g.lastBody||"").trim();
if(g.lastDir==="in"){
if(t==="1")return Object.assign({k:"confirmou"},WA_TIPOS.confirmou);
if(t==="2")return Object.assign({k:"outros"},WA_TIPOS.outros,{label:"CANCELOU"});
return Object.assign({k:"responder"},WA_TIPOS.responder);
}
if(b.indexOf("presenca confirmada")>=0)return Object.assign({k:"confirmou"},WA_TIPOS.confirmou);
if(b.indexOf("vespera")>=0||b.indexOf("amanha")>=0||b.indexOf("lembrete de confirmacao")>=0||b.indexOf("lembrete:")>=0)return Object.assign({k:"vespera"},WA_TIPOS.vespera);
if(b.indexOf("apos o procedimento")>=0||b.indexOf("se sentindo")>=0||b.indexOf("pos-cirurg")>=0||b.indexOf("pos cirurg")>=0||b.indexOf("pos-operatorio")>=0||b.indexOf("pos operatorio")>=0)return Object.assign({k:"poscir"},WA_TIPOS.poscir);
if(b.indexOf("aniversario")>=0||b.indexOf("parabens")>=0)return Object.assign({k:"aniversario"},WA_TIPOS.aniversario);
if(b.indexOf("agendad")>=0||b.indexOf("agendamento")>=0)return Object.assign({k:"agendamento"},WA_TIPOS.agendamento);
if(b.indexOf("6 meses")>=0||b.indexOf("seis meses")>=0||b.indexOf("controle")>=0)return Object.assign({k:"outros"},WA_TIPOS.outros,{label:"CONTROLE SEMESTRAL"});
if(b.indexOf("orcamento")>=0)return Object.assign({k:"orcamento"},WA_TIPOS.orcamento);
if(b.indexOf("reagendar")>=0||b.indexOf("faltou")>=0||b.indexOf("desmarc")>=0||b.indexOf("cancelamento")>=0)return Object.assign({k:"outros"},WA_TIPOS.outros,{label:"REAGENDAMENTO"});
if(b.indexOf("bem-vindo")>=0||b.indexOf("bem vindo")>=0||b.indexOf("bem-vinda")>=0||b.indexOf("bem vinda")>=0)return Object.assign({k:"outros"},WA_TIPOS.outros,{label:"BOAS-VINDAS"});
if(b.indexOf("pesquisa")>=0||b.indexOf("avalie")>=0||b.indexOf("nota de 0")>=0)return Object.assign({k:"outros"},WA_TIPOS.outros,{label:"PESQUISA"});
return Object.assign({k:"neutro"},WA_TIPOS.neutro);
};
var seenW={};var msgsD=[];
msgs.forEach(function(m){var w=m.wamid;if(w&&seenW[w])return;if(w)seenW[w]=1;msgsD.push(m);});
var grupos={};
msgsD.forEach(function(m){var ph=soDig(m.phone);if(!ph)return;if(!grupos[ph])grupos[ph]={phone:ph,msgs:[]};grupos[ph].msgs.push(m);});
var seen=(waSeenRef&&waSeenRef.current)||0;
var lista=Object.keys(grupos).map(function(ph){
var g=grupos[ph];
g.msgs.sort(function(a,b){return (a.id||0)-(b.id||0);});
var lastM=g.msgs[g.msgs.length-1];
g.lastTs=lastM.ts||lastM.created_at||"";
g.lastBody=lastM.body||"";
g.lastDir=lastM.direction;
var pac=acharPac(ph);g.pac=pac;
g.name=pac?pac.name:(g.msgs.map(function(m){return m.patient_name;}).filter(Boolean)[0]||("+"+ph));
g.unread=g.msgs.filter(function(m){return m.direction==="in"&&(m.id||0)>seen;}).length;
g.tipo=waTipo(g); // V214
return g;
}).sort(function(a,b){return (b.lastTs||"").localeCompare(a.lastTs||"");});
var norm=function(s){return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");};
// V214: fix buscador (telefone so conta se a busca tiver digitos) + filtro por tipo
var listaF=q?lista.filter(function(g){var qd=soDig(q);var okNome=norm(g.name).indexOf(norm(q))>=0;var okFone=qd.length>0&&g.phone.indexOf(qd)>=0;return okNome||okFone;}):lista;
if(filtroTipo)listaF=listaF.filter(function(g){return g.tipo&&g.tipo.k===filtroTipo;});
var selGroup=sel?grupos[sel]:null;
var selPac=selGroup?acharPac(selGroup.phone):null;
var selName=selGroup?(selPac?selPac.name:(selGroup.msgs.map(function(m){return m.patient_name;}).filter(Boolean)[0]||("+"+selGroup.phone))):"";
if(selGroup){
var selMsgs=selGroup.msgs.slice().sort(function(a,b){return (a.id||0)-(b.id||0);});
var ultimaIn=null;for(var _i=selMsgs.length-1;_i>=0;_i--){if(selMsgs[_i].direction==="in"){ultimaIn=selMsgs[_i];break;}}
var ultimaInTs=ultimaIn?(ultimaIn.ts||ultimaIn.created_at):null;
var janelaAberta=false;
if(ultimaInTs){var _dif=Date.now()-new Date(ultimaInTs).getTime();janelaAberta=(_dif>=0&&_dif<86400000);}
var abrirZap=function(){try{var n=String(selGroup.phone||"").replace(/\D/g,"");if(n.indexOf("55")!==0)n="55"+n;var u="https://wa.me/"+n+(txt?("?text="+encodeURIComponent(txt)):"");var a=document.createElement("a");a.href=u;a.target="_blank";document.body.appendChild(a);a.click();document.body.removeChild(a);}catch(e){}};
var responderWA=async function(fone,texto){try{var n=String(fone||"").replace(/\D/g,"");if(n.length===11||n.length===10)n="55"+n;var r=await fetch("https://whatsapp-webhook-production-d5be.up.railway.app/api/responder",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":"affonso2025"},body:JSON.stringify({telefone:n,texto:texto})});var d=await r.json().catch(function(){return {};});if(d&&d.ok)return {ok:true,wamid:d.wamid||d.id||null};return {ok:false,err:(d&&(d.error||d.err))||("HTTP "+r.status)};}catch(e){return {ok:false,err:"sem conexao com o servidor"};}};
var enviar=async function(){var t=(txt||"").trim();if(!t||sending)return;setSending(true);setErro("");var res=await responderWA(selGroup.phone,t);setSending(false);if(res&&res.ok){setTxt("");var w=res.wamid||("tmp_"+Date.now());setMsgs(function(prev){return prev.concat([{id:"tmp_"+Date.now(),phone:selGroup.phone,body:t,direction:"out",status:"sent",wamid:w,ts:new Date().toISOString(),patient_name:selName}]);});setTimeout(load,1500);}else{setErro((res&&res.err)||"Falha ao enviar");}};
return (
<div className="fi" style={{display:"flex",flexDirection:"column",gap:0}}>
<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
<button onClick={function(){setSel(null);}} style={{border:"none",background:G.accent,borderRadius:8,padding:"7px 12px",cursor:"pointer",color:G.primary,fontWeight:700,fontSize:14}}>{"← Voltar"}</button>
<div style={{flex:1,minWidth:0}}>
<div style={{fontWeight:700,fontSize:15,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{selName}</div>
<div style={{fontSize:11,color:G.muted}}>{"+"+selGroup.phone}</div>
</div>
{selPac&&<Btn ch={"📋 Ficha"} v="g" sm onClick={function(){abrirFicha(selPac);}}/>}
</div>
<div ref={bottomRef} style={{background:"var(--amber-soft)",borderRadius:12,padding:"12px 10px",display:"flex",flexDirection:"column",gap:7,maxHeight:"68vh",overflowY:"auto"}}>
{selMsgs.map(function(m,mi){var out=m.direction==="out";
/* V227: separador de data entre dias (Hoje / Ontem / dd/mm/aaaa) */
var dtM=new Date(m.ts||m.created_at);
var diaM=isNaN(dtM.getTime())?"":dtM.toLocaleDateString("pt-BR");
var mPrev=mi>0?selMsgs[mi-1]:null;
var dtP=mPrev?new Date(mPrev.ts||mPrev.created_at):null;
var diaP=(dtP&&!isNaN(dtP.getTime()))?dtP.toLocaleDateString("pt-BR"):"";
var rotDia=diaM===new Date().toLocaleDateString("pt-BR")?"Hoje":(diaM===new Date(Date.now()-86400000).toLocaleDateString("pt-BR")?"Ontem":diaM);
return (
<Fragment key={m.id}>
{diaM&&diaM!==diaP&&<div style={{alignSelf:"center",background:"var(--card)",borderRadius:12,padding:"3px 12px",fontSize:10,fontWeight:700,color:"var(--muted)",boxShadow:"0 1px 2px rgba(0,0,0,.10)",margin:"5px 0 2px"}}>{rotDia}</div>}
<div style={{alignSelf:out?"flex-end":"flex-start",maxWidth:"86%",background:out?"var(--green-soft)":"var(--card)",borderRadius:out?"12px 12px 2px 12px":"12px 12px 12px 2px",padding:"7px 11px",boxShadow:"0 1px 1px rgba(0,0,0,.13)"}}>
<div style={{fontSize:13,lineHeight:1.5,whiteSpace:"pre-wrap",wordBreak:"break-word",color:"var(--text)"}}>{m.body||""}</div>
<div style={{display:"flex",gap:4,justifyContent:"flex-end",alignItems:"center",marginTop:3}}>
<span style={{fontSize:9,color:"var(--muted)"}}>{fmtHora(m.ts||m.created_at)}</span>
{out&&<span style={{fontSize:11,color:m.status==="read"?"#34B7F1":"var(--muted)"}}>{tick(m.status)}</span>}
</div>
</div>
</Fragment>
);})}
</div>
{janelaAberta?(
<div style={{marginTop:9}}>
<div style={{marginBottom:8}}><span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11.5,fontWeight:700,borderRadius:20,padding:"5px 12px",background:"rgba(47,143,95,.13)",color:G.success}}><span style={{width:7,height:7,borderRadius:"50%",background:G.success,boxShadow:"0 0 0 3px rgba(47,143,95,.18)"}}></span>{"Janela aberta · resposta gratuita"}</span></div>
{erro&&<div style={{fontSize:11.5,color:G.red,marginBottom:7,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><span>{"⚠️ "+erro}</span><button onClick={abrirZap} style={{border:"none",background:"transparent",color:G.primary,fontWeight:700,fontSize:11.5,cursor:"pointer",textDecoration:"underline",padding:0}}>{"Abrir no WhatsApp"}</button></div>}
<div style={{display:"flex",gap:9,alignItems:"flex-end"}}>
<textarea value={txt} onChange={function(e){setTxt(e.target.value);e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";}} onKeyDown={function(e){if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();enviar();}}} rows={1} placeholder={"Escreva uma resposta…"} style={{flex:1,resize:"none",fontSize:13.5,lineHeight:1.45,padding:"11px 14px",maxHeight:120}}/>
<button onClick={enviar} disabled={sending||!txt.trim()} style={{flexShrink:0,width:46,height:46,border:"none",borderRadius:"50%",background:(sending||!txt.trim())?"#9fc8ad":"#25D366",color:"#fff",fontSize:20,cursor:(sending||!txt.trim())?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:(sending||!txt.trim())?"none":"0 4px 12px rgba(37,211,102,.4)"}}>{sending?<i className="ph ph-circle-notch" style={{animation:"nmpulse 1s linear infinite"}}></i>:<i className="ph-fill ph-paper-plane-right"></i>}</button>
</div>
</div>
):(
<div style={{marginTop:9}}>
<div style={{marginBottom:8}}><span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11.5,fontWeight:700,borderRadius:20,padding:"5px 12px",background:"rgba(183,149,11,.14)",color:G.gold}}><i className="ph-fill ph-lock-simple"></i>{"Janela de 24h fechada"}</span></div>
<div style={{background:"rgba(183,149,11,.10)",border:"1.5px solid rgba(183,149,11,.35)",borderRadius:13,padding:"13px 14px",display:"flex",flexDirection:"column",gap:10}}>
<div style={{display:"flex",gap:9,alignItems:"flex-start"}}><i className="ph-fill ph-clock-countdown" style={{fontSize:19,color:G.gold,marginTop:1,flexShrink:0}}></i><div style={{fontSize:12.3,lineHeight:1.5,color:"#5d5320"}}>{"Passou de 24h desde a última mensagem do paciente. Para responder por texto livre sem custo, ele precisa te escrever de novo — ou inicie um modelo aprovado pelo WhatsApp."}</div></div>
<button onClick={abrirZap} style={{alignSelf:"flex-start",background:"#25D366",color:"#fff",border:"none",borderRadius:10,padding:"9px 15px",fontSize:12.5,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:7}}><i className="ph-fill ph-whatsapp-logo"></i>{"Abrir no WhatsApp"}</button>
</div>
</div>
)}
</div>
);
}
return (
<div className="fi" style={{display:"flex",flexDirection:"column",gap:10}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
<h2 style={{fontFamily:"'Cormorant Garamond'",fontSize:26}}>{"💬 Conversas"}</h2>
<Btn ch={"↻ Atualizar"} v="g" sm onClick={load}/>
</div>
<Inp val={q} set={setQ} ph={"🔍 Buscar por nome ou telefone"}/>
{/* V214: legenda de cores + filtro por tipo */}
<style>{"@keyframes waResp{0%,100%{box-shadow:0 0 0 0 rgba(192,57,43,.4)}50%{box-shadow:0 0 0 6px rgba(192,57,43,0)}}@keyframes waOrc{0%,100%{box-shadow:0 0 0 0 rgba(212,147,13,.45)}50%{box-shadow:0 0 0 6px rgba(212,147,13,0)}}"}</style>
<div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,WebkitOverflowScrolling:"touch"}}>
{[["responder","\ud83d\udcac Responder","#c0392b"],["orcamento","\ud83d\udcb0 Or\u00e7amento","#d4930d"],["agendamento","\ud83d\udcc5 Agendamento","#3b6ea5"],["vespera","\ud83d\udd14 V\u00e9spera","#7c5cbf"],["confirmou","\u2705 Confirmou","#2f8f5f"],["poscir","\ud83c\udfe5 P\u00f3s-cir\u00fargico","#c2703d"],["aniversario","\ud83c\udf82 Anivers\u00e1rio","#c25b8a"],["outros","\ud83d\udce8 Outros","#b7950b"]].map(function(ch){
var atv=filtroTipo===ch[0];
var qtd=lista.filter(function(g){return g.tipo&&g.tipo.k===ch[0];}).length;
return (<button key={ch[0]} onClick={function(){setFiltroTipo(atv?null:ch[0]);}} style={{flexShrink:0,display:"inline-flex",alignItems:"center",gap:5,fontSize:10.5,fontWeight:700,borderRadius:20,padding:"5px 10px",background:atv?"#dfe7e0":(ch[0]==="responder"?"rgba(192,57,43,.10)":(ch[0]==="orcamento"?"rgba(212,147,13,.12)":G.card)),border:atv?("1.5px solid "+G.primary):(ch[0]==="responder"?"1.5px solid rgba(192,57,43,.45)":(ch[0]==="orcamento"?"1.5px solid rgba(212,147,13,.5)":"1.5px solid transparent")),color:ch[0]==="responder"?"#c0392b":(ch[0]==="orcamento"?"#a9750a":G.text),whiteSpace:"nowrap",cursor:"pointer",boxShadow:"3px 3px 7px var(--nm-dark),-3px -3px 7px #ffffff",fontFamily:"'Manrope'"}}>
<span style={{width:9,height:9,borderRadius:"50%",background:ch[2],flexShrink:0}}></span>{ch[1]}{qtd>0?(" \u00b7 "+qtd):""}
</button>);
})}
</div>
{filtroTipo&&<div style={{fontSize:11,color:G.muted,display:"flex",alignItems:"center",gap:8}}><span>{"Mostrando apenas: "+filtroTipo}</span><button onClick={function(){setFiltroTipo(null);}} style={{border:"none",background:"transparent",color:G.primary,fontWeight:700,fontSize:11,cursor:"pointer",textDecoration:"underline",padding:0}}>{"limpar filtro"}</button></div>}
{loading&&<div style={{textAlign:"center",padding:20,color:G.muted,fontSize:13}}>{"Carregando..."}</div>}
{!loading&&listaF.length===0&&<div style={{background:G.card,borderRadius:12,padding:24,textAlign:"center",color:G.muted,fontSize:13}}>{q?"Nenhuma conversa encontrada.":"Nenhuma conversa ainda. As mensagens trocadas pelo WhatsApp aparecerao aqui."}</div>}
{listaF.map(function(g){return (
<div key={g.phone} onClick={function(){setSel(g.phone);}} style={Object.assign({background:G.card,borderRadius:12,padding:"11px 14px",boxShadow:"6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff",display:"flex",gap:11,alignItems:"center",cursor:"pointer",borderLeft:(g.tipo&&g.tipo.cor)?("5px solid "+g.tipo.cor):(g.unread>0?("4px solid "+G.success):"4px solid transparent")},(g.tipo&&g.tipo.k==="responder")?{border:"1.5px solid rgba(192,57,43,.5)",borderLeft:"5px solid #c0392b",background:"linear-gradient(90deg,rgba(192,57,43,.07),"+G.card+" 60%)",boxShadow:"0 0 0 3px rgba(192,57,43,.10),6px 6px 15px var(--nm-dark)"}:((g.tipo&&g.tipo.k==="orcamento")?{border:"1.5px solid rgba(212,147,13,.55)",borderLeft:"5px solid #d4930d",background:"linear-gradient(90deg,rgba(212,147,13,.10),"+G.card+" 60%)",boxShadow:"0 0 0 3px rgba(212,147,13,.12),6px 6px 15px var(--nm-dark)"}:{}))}>
<div style={{width:44,height:44,borderRadius:"50%",background:(g.tipo&&g.tipo.cor)?g.tipo.cor:(g.unread>0?G.success:G.accent),display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:(g.tipo&&g.tipo.cor)?"#fff":(g.unread>0?"#fff":G.primary),flexShrink:0,fontWeight:700}}>{((g.name||"?")[0]||"?").toUpperCase()}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{display:"flex",justifyContent:"space-between",gap:6,alignItems:"center"}}>
<span style={{fontWeight:700,fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{g.name}</span>
<span style={{fontSize:10,color:G.muted,flexShrink:0}}>{fmtHora(g.lastTs)}</span>
</div>
<div style={{display:"flex",justifyContent:"space-between",gap:6,alignItems:"center",marginTop:2}}>
<span style={{fontSize:12,color:g.unread>0?G.text:G.muted,fontWeight:g.unread>0?600:400,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{(g.lastDir==="out"?"Voce: ":"")+(g.lastBody||"").slice(0,55)}</span>
{g.unread>0&&<span style={{background:(g.tipo&&g.tipo.k==="responder")?"#c0392b":G.success,color:"#fff",borderRadius:20,minWidth:19,height:19,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,padding:"0 5px",flexShrink:0}}>{g.unread}</span>}
</div>
{g.tipo&&g.tipo.label&&<div style={{marginTop:5}}><span style={g.tipo.k==="responder"?{display:"inline-flex",alignItems:"center",gap:4,fontSize:9.5,fontWeight:800,borderRadius:6,padding:"2px 7px",color:"#fff",letterSpacing:".3px",background:"#c0392b",animation:"waResp 1.6s ease-in-out infinite"}:(g.tipo.k==="orcamento"?{display:"inline-flex",alignItems:"center",gap:4,fontSize:9.5,fontWeight:800,borderRadius:6,padding:"2px 7px",color:"#fff",letterSpacing:".3px",background:"#d4930d",animation:"waOrc 1.6s ease-in-out infinite"}:{display:"inline-flex",alignItems:"center",gap:4,fontSize:9.5,fontWeight:800,borderRadius:6,padding:"2px 7px",color:"#fff",letterSpacing:".3px",background:g.tipo.cor})}>{g.tipo.emo+" "+g.tipo.label}</span></div>}
</div>
</div>
);})}
<div style={{textAlign:"center",fontSize:11,color:G.muted,marginTop:4,padding:"0 16px"}}>{"💬 Toque em uma conversa para ler e responder pelo sistema."}</div>
</div>
);
}

function Satisfacao({pats,user,pacsTicks,setPacsTicks,abrirFicha}){
const [msgs,setMsgs]=useState([]);
const [loading,setLoading]=useState(true);
const [per,setPer]=useState(30);
const load=function(){supabase.loadWaMessagesLite().then(function(rows){setMsgs(Array.isArray(rows)?rows:[]);setLoading(false);});}; // V196: poll economico
useEffect(function(){load();var t=setInterval(load,30000);return function(){clearInterval(t);};},[]);
var soDig=function(s){return (s||"").replace(/\D/g,"");};
var last8=function(s){var d=soDig(s);return d.slice(-8);};
var acharPac=function(phone){var l8=last8(phone);if(l8.length<8)return null;return pats.find(function(p){return last8(p.phone)===l8;});};
var norm=function(s){return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();};
var notaDe=function(body){var b=norm(body);if(b==="otimo")return "otimo";if(b==="boa")return "boa";if(b==="insatisfatorio"||b==="insatisfeito")return "insat";return null;};
var fmtData=function(ts){if(!ts)return "";try{var d=new Date(ts);var h=new Date();var hh=function(x){return x.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});};var sd=d.toDateString();if(sd===h.toDateString())return "Hoje, "+hh(d);var on=new Date(h.getTime()-864e5);if(sd===on.toDateString())return "Ontem, "+hh(d);return d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit"});}catch(e){return "";}};
var seenW={};var avals=[];
msgs.forEach(function(m){if(m.direction!=="in")return;var w=m.wamid;if(w&&seenW[w])return;if(w)seenW[w]=1;var nota=notaDe(m.body);if(!nota)return;avals.push({id:m.id,phone:soDig(m.phone),nota:nota,ts:m.ts||m.created_at||"",pname:m.patient_name||""});});
avals.sort(function(a,b){return (b.ts||"").localeCompare(a.ts||"");});
var lim=per>0?(Date.now()-per*864e5):0;
var inPer=function(ts){if(!lim)return true;var d=ts?new Date(ts).getTime():0;return d>=lim;};
var avalsF=avals.filter(function(a){return inPer(a.ts);});
var cO=0,cB=0,cI=0;avalsF.forEach(function(a){if(a.nota==="otimo")cO++;else if(a.nota==="boa")cB++;else cI++;});
var tot=cO+cB+cI;var pct=tot?Math.round((cO+cB)/tot*100):0;
var wO=tot?(cO/tot*100):0,wB=tot?(cB/tot*100):0,wI=tot?(cI/tot*100):0;
var ticks=pacsTicks||{};
var pend=avalsF.filter(function(a){return a.nota==="insat"&&!((ticks["aval_"+a.id]||{}).done);});
var nomeDe=function(a){var p=acharPac(a.phone);return p?p.name:(a.pname||("+"+a.phone));};
var corNota=function(n){return n==="otimo"?G.success:(n==="boa"?G.yellow:G.red);};
var lblNota=function(n){return n==="otimo"?"Ótimo":(n==="boa"?"Boa":"Insatisfatório");};
var resolver=function(id){setPacsTicks(function(prev){var n=Object.assign({},prev||{});n["aval_"+id]={done:true,by:(user&&user.name)||"",date:today(),ts:Date.now()};return n;});};
var SH="6px 6px 15px var(--nm-dark),-6px -6px 15px #ffffff";
var SHsm="4px 4px 10px var(--nm-dark),-4px -4px 10px #ffffff";
var perBtn=function(v,lb){return <button onClick={function(){setPer(v);}} style={{border:"none",borderRadius:20,padding:"8px 16px",fontSize:12.5,fontWeight:700,cursor:"pointer",background:per===v?G.primary:G.card,color:per===v?"#fff":G.muted,boxShadow:per===v?"inset 2px 2px 5px #234738,inset -2px -2px 5px #3b7259":SHsm}}>{lb}</button>;};
return (
<div className="fi" style={{display:"flex",flexDirection:"column",gap:0}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
<h2 style={{fontFamily:"'Cormorant Garamond'",fontSize:26}}>{"😊 Satisfação"}</h2>
<Btn ch={"↻ Atualizar"} v="g" sm onClick={load}/>
</div>
<div style={{fontSize:12.5,color:G.muted,marginTop:2,lineHeight:1.5}}>{"As respostas dos pacientes à pesquisa de pós-consulta, reunidas num só lugar."}</div>
<div style={{display:"flex",gap:8,marginTop:14}}>{perBtn(30,"30 dias")}{perBtn(90,"90 dias")}{perBtn(0,"Tudo")}</div>
{loading&&<div style={{textAlign:"center",padding:20,color:G.muted,fontSize:13}}>{"Carregando..."}</div>}
{!loading&&<>
<div style={{background:G.card,borderRadius:18,boxShadow:SH,padding:18,marginTop:14}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:14}}>
<div>
<div style={{fontFamily:"'Cormorant Garamond'",fontWeight:700,fontSize:44,color:tot?G.success:G.muted,lineHeight:.9}}>{tot?pct:"—"}<span style={{fontSize:18,color:G.muted}}>{tot?"%":""}</span></div>
<div style={{fontSize:12,color:G.muted,fontWeight:600,marginTop:4}}>{"satisfação geral"}</div>
</div>
<div style={{fontSize:12.5,color:G.muted,textAlign:"right",maxWidth:150,lineHeight:1.45}}>{tot+" "+(tot===1?"avaliação respondida":"avaliações respondidas")+" "+(per===0?"no total":("nos últimos "+per+" dias"))}</div>
</div>
<div style={{display:"flex",height:16,borderRadius:10,overflow:"hidden",boxShadow:"inset 3px 3px 7px var(--nm-dark),inset -3px -3px 7px #ffffff",background:G.accentDark}}>
{wO>0&&<span style={{width:wO+"%",background:G.success}}></span>}
{wB>0&&<span style={{width:wB+"%",background:G.yellow}}></span>}
{wI>0&&<span style={{width:wI+"%",background:G.red}}></span>}
</div>
<div style={{display:"flex",gap:16,marginTop:14,flexWrap:"wrap"}}>
<div style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:12,height:12,borderRadius:4,background:G.success}}></span><div><div style={{fontWeight:800,fontSize:17,color:G.success}}>{cO}</div><div style={{fontSize:11.5,color:G.muted}}>{"Ótimo"}</div></div></div>
<div style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:12,height:12,borderRadius:4,background:G.yellow}}></span><div><div style={{fontWeight:800,fontSize:17,color:G.yellow}}>{cB}</div><div style={{fontSize:11.5,color:G.muted}}>{"Boa"}</div></div></div>
<div style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:12,height:12,borderRadius:4,background:G.red}}></span><div><div style={{fontWeight:800,fontSize:17,color:G.red}}>{cI}</div><div style={{fontSize:11.5,color:G.muted}}>{"Insatisfatório"}</div></div></div>
</div>
</div>
<div style={{background:G.card,borderRadius:18,boxShadow:SH,padding:18,marginTop:14}}>
<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
<h2 style={{fontFamily:"'Cormorant Garamond'",fontSize:21,color:G.primary,margin:0}}>{"🚩 Precisam de atenção"}</h2>
{pend.length>0&&<span style={{background:G.red,color:"#fff",fontSize:11,fontWeight:800,borderRadius:20,padding:"3px 10px"}}>{pend.length}</span>}
</div>
{pend.length===0&&<div style={{textAlign:"center",padding:"18px 10px",color:G.muted,fontSize:13,lineHeight:1.55}}>{"Nenhum paciente insatisfeito no período. 🎉"}<br/>{"Quando alguém avaliar como insatisfeito, aparece aqui para você dar retorno."}</div>}
{pend.map(function(a){var pac=acharPac(a.phone);return (
<div key={a.id} style={{display:"flex",alignItems:"flex-start",gap:11,background:G.card,borderRadius:14,boxShadow:SHsm,padding:12,marginBottom:10,borderLeft:"4px solid "+G.red}}>
<div style={{width:42,height:42,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:17,color:"#fff",background:G.red}}>{(nomeDe(a)[0]||"?").toUpperCase()}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontWeight:700,fontSize:14}}>{nomeDe(a)}</div>
<div style={{fontSize:11.5,color:G.muted,marginTop:1}}>{"Avaliou "}<b style={{color:G.red}}>{"Insatisfatório"}</b>{" · "+fmtData(a.ts)}</div>
<div style={{display:"flex",gap:7,marginTop:9,flexWrap:"wrap"}}>
<button onClick={function(){window.open("https://wa.me/"+a.phone,"_blank");}} style={{border:"none",borderRadius:9,padding:"8px 12px",fontSize:12,fontWeight:700,cursor:"pointer",background:"#25D366",color:"#fff"}}>{"💬 Abrir conversa"}</button>
{pac&&<button onClick={function(){abrirFicha(pac);}} style={{border:"none",borderRadius:9,padding:"8px 12px",fontSize:12,fontWeight:700,cursor:"pointer",background:G.accent,color:G.primary}}>{"📋 Ficha"}</button>}
<button onClick={function(){resolver(a.id);}} style={{border:"none",borderRadius:9,padding:"8px 12px",fontSize:12,fontWeight:700,cursor:"pointer",background:"transparent",color:G.muted,boxShadow:SHsm}}>{"✓ Resolvido"}</button>
</div>
</div>
</div>
);})}
</div>
<div style={{background:G.card,borderRadius:18,boxShadow:SH,padding:18,marginTop:14}}>
<h2 style={{fontFamily:"'Cormorant Garamond'",fontSize:21,color:G.primary,margin:"0 0 8px"}}>{"🕒 Avaliações recentes"}</h2>
{avalsF.length===0&&<div style={{textAlign:"center",padding:"18px 10px",color:G.muted,fontSize:13,lineHeight:1.55}}>{"Ainda não há respostas no período selecionado."}<br/>{"Assim que os pacientes responderem a pesquisa, as avaliações aparecem aqui."}</div>}
{avalsF.map(function(a){return (
<div key={a.id} style={{display:"flex",alignItems:"center",gap:11,padding:"11px 2px",borderBottom:"1px solid "+G.border}}>
<div style={{width:40,height:40,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:15,color:G.primary,background:G.accent}}>{(nomeDe(a)[0]||"?").toUpperCase()}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontWeight:700,fontSize:13.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{nomeDe(a)}</div>
<div style={{fontSize:11,color:G.muted,marginTop:1}}>{fmtData(a.ts)}</div>
</div>
<span style={{fontSize:11.5,fontWeight:800,borderRadius:20,padding:"5px 12px",whiteSpace:"nowrap",flexShrink:0,background:corNota(a.nota)+"29",color:corNota(a.nota)}}>{lblNota(a.nota)}</span>
</div>
);})}
</div>
<div style={{textAlign:"center",fontSize:11,color:G.muted,marginTop:18,lineHeight:1.5}}>{"📵 Tela de leitura. O botão abre a conversa no WhatsApp para você responder."}</div>
</>}
</div>
);
}

try{document.documentElement.setAttribute("data-theme",localStorage.getItem("orbe_theme")||"light");}catch(e){}
export default function App(){
const [user,setUser]=useState(null);const [theme,setTheme]=useState(function(){try{return localStorage.getItem("orbe_theme")||"light";}catch(e){return "light";}});useEffect(function(){try{document.documentElement.setAttribute("data-theme",theme);localStorage.setItem("orbe_theme",theme);}catch(e){}},[theme]);const [view,setView]=useState("dash");
const [agendaSelDate,setAgendaSelDate]=useState(today());
const [pats,setPats]=useState(PATS0);const [appts,setAppts]=useState(APPTS0);const [remarcar,setRemarcar]=useState([]);const [showRemModal,setShowRemModal]=useState(null);const [espera,setEspera]=useState([]);const [logs,setLogs]=useState([]);
const [waTemplates,setWaTemplates]=useState({});
const [orientacoes,setOrientacoes]=useState(ORIENT_DEFAULT);
const orientDirtyRef=useRef(false);
const [semTicks,setSemTicks]=useState({});
const [anivTicks,setAnivTicks]=useState({});
const [pacsTicks,setPacsTicks]=useState({});const [auditDismiss,setAuditDismiss]=useState({});
const [waAuto,setWaAuto]=useState({});const [waSent,setWaSent]=useState({});const [waAutoLog,setWaAutoLog]=useState([]);
const [orcResp,setOrcResp]=useState({}); // V232: classificacao manual das respostas de orcamento (admin)
const [recs,setRecs]=useState(RECS0);const [treats,setTreats]=useState(TREATS0);
const [pros,setPros]=useState(PROS0);const [rems,setRems]=useState(REMS0);
const [budgets,setBudgets]=useState(BUDGETS0);
const [users,setUsers]=useState(USERS0);const [dents,setDents]=useState(DENTS0);const [perms,setPerms]=useState(PERMS0);
const [labs,setLabs]=useState(LABS0);const [procs,setProcs]=useState(PROCS0);
const [stock,setStock]=useState(STOCK0);const [impl,setImpl]=useState(IMPL_DATA_SEED);const [implCat,setImplCat]=useState([]);const [implMov,setImplMov]=useState([]);
const [prosProcs,setProsProcs]=useState(PROS_PROCS0);
const [expenses,setExpenses]=useState(EXPENSES0);
const [gastos,setGastos]=useState({clinica:[],pessoal:[]});
const [pontos,setPontos]=useState([]);const [caixa,setCaixa]=useState([]);
const [pontoCfg,setPontoCfg]=useState({lat:null,lng:null,raio:150,ativo:true,entradaPadrao:"08:00",saidaPadrao:"18:00",cargaSemanal:44,intervalo:60});
const [acessoCfg,setAcessoCfg]=useState({restringir:true,segIni:"07:00",segFim:"21:00",sabIni:"07:00",sabFim:"13:00",domOn:false,domIni:"08:00",domFim:"12:00"});
const [sideOpen,setSideOpen]=useState(false);
const [fichaPat,setFichaPat]=useState(null);
const [waUnread,setWaUnread]=useState(0);
const waSeenRef=useRef((function(){try{return Number(localStorage.getItem("waSeenId")||0);}catch(e){return 0;}})());
useEffect(function(){
if(!user)return;
var ativo=true;
var checar=function(){
fetch(SUPA_URL+"/rest/v1/wa_messages?direction=eq.in&id=gt."+(waSeenRef.current||0)+"&select=id",{headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+__authTok(),"Prefer":"count=exact","Range":"0-0"}}).then(function(r){var cr=r.headers.get("content-range")||"";var tot=cr.split("/")[1];if(ativo)setWaUnread(tot?Number(tot):0);}).catch(function(){});
};
checar();
var t=setInterval(checar,25000);
return function(){ativo=false;clearInterval(t);};
},[user]);
const abrirFicha=function(p){if(!p)return;var pp=(p&&typeof p==="object")?p:pats.find(function(x){return x.id===Number(p);});if(pp)setFichaPat(pp);};
const [saveStatus,setSaveStatus]=useState("idle");
const saveTimer=useRef(null);
const initialized=useRef(false);
const isSaving=useRef(false);
const lastSaved=useRef("");
const gastosEditRef=useRef(0);
const waAutoSrvRef=useRef(null);
const patTableOk=useRef(false);
const lastSavedPats=useRef({});
const patSaveTimer=useRef(null);
const patSaving=useRef(false);
const patPending=useRef(false);
const patsRef=useRef([]);
const lastPatPollTs=useRef(null);
const anamSeenRef=useRef({});
const anamPullRef=useRef(0);
// V225: Realtime - assina mudancas de clinic_data e patients e dispara o sync existente na hora.
// Carrega supabase-js via CDN em tempo de execucao (sem mudar build). Falhou? Polls seguem como hoje.
useEffect(function(){
  if(!user)return;
  var canal=null,cliente=null,vivo=true;
  (async function(){
    try{
      var mod=await import(/* @vite-ignore */ "https://esm.sh/@supabase/supabase-js@2");
      if(!vivo||!mod||!mod.createClient)return;
      cliente=mod.createClient(SUPA_URL,SUPA_KEY,{realtime:{params:{eventsPerSecond:5}}});
      try{if(__ACCESS)cliente.realtime.setAuth(__ACCESS);}catch(e){}
      canal=cliente.channel("relevo-sync")
        .on("broadcast",{event:"mudou"},function(msg){ // V226: aviso leve enviado por quem salvou (contorna limite de 1MB do postgres_changes)
          rtLastEvtRef.current=Date.now();
          try{var k=msg&&msg.payload&&msg.payload.k;if(k==="pats"){patPollNowRef.current="force";}else{if(doPollNowRef.current)doPollNowRef.current();}}catch(e){}
        })
        .on("postgres_changes",{event:"*",schema:"public",table:"clinic_data"},function(){
          rtLastEvtRef.current=Date.now();
          try{if(doPollNowRef.current)doPollNowRef.current();}catch(e){}
        })
        .on("postgres_changes",{event:"*",schema:"public",table:"patients"},function(){
          rtLastEvtRef.current=Date.now();
          patPollNowRef.current="force"; // proximo tick do poll de pacientes roda sem espera adaptativa
        })
        .subscribe(function(status){
          if(status==="SUBSCRIBED"){rtOkRef.current=true;rtLastEvtRef.current=Date.now();}
          else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"||status==="CLOSED"){rtOkRef.current=false;}
        });
      rtCanalRef.current=canal; // V226
      var hb=setInterval(function(){ // V226: renova a "vida" do RT apenas se o canal segue conectado de verdade
        try{if(rtOkRef.current&&canal&&canal.state==="joined"){rtLastEvtRef.current=Math.max(rtLastEvtRef.current,Date.now()-60000);}else{rtOkRef.current=false;}}catch(e){rtOkRef.current=false;}
      },30000);
      canal.__hb=hb;
    }catch(e){rtOkRef.current=false;}
  })();
  return function(){vivo=false;rtOkRef.current=false;rtCanalRef.current=null;try{if(canal&&canal.__hb)clearInterval(canal.__hb);}catch(e){}try{if(cliente&&canal)cliente.removeChannel(canal);}catch(e){}};
},[user]);
useEffect(function(){
  var _patTick=0;
  var pp=setInterval(async function(){
    if(!initialized.current||document.hidden)return;
    if(!patTableOk.current)return;
    _patTick++; // V225: adaptativo - RT saudavel: ~60s; RT fora: 20s (igual hoje)
    var _rtVivo=rtOkRef.current&&(Date.now()-(rtLastEvtRef.current||0)<120000);
    if(_rtVivo&&(_patTick%3)!==0&&patPollNowRef.current!=="force")return;
    if(Date.now()-lastLocalChangeTs.current<12000)return;
    if(patSaving.current||patPending.current)return;
    if(patPollNowRef.current==="force")patPollNowRef.current=null; // V225: consome o gatilho
    try{
      if(!lastPatPollTs.current){lastPatPollTs.current=new Date().toISOString();return;}
      var chg=await supabase.loadPatientsSince(lastPatPollTs.current);
      if(!chg||!chg.length)return;
      var maxTs=lastPatPollTs.current;
      chg.forEach(function(c){if(c&&c.ts&&c.ts>maxTs)maxTs=c.ts;});
      lastPatPollTs.current=maxTs;
      var _dpT={};(delPatsRef.current||[]).forEach(function(i){_dpT[i]=true;}); // V197
      setPats(function(prev){
        prev=prev||[];
        var idx={};prev.forEach(function(p,i){if(p&&p.id!=null)idx[p.id]=i;});
        var next=prev.slice();var mut=false;
        chg.forEach(function(c){
          if(!c||c.id==null||!c.data)return;
          if(_dpT[c.id])return; // V197: excluido, nao ressuscitar
          var sj=JSON.stringify(c.data);
          if(idx[c.id]!=null){if(JSON.stringify(next[idx[c.id]])!==sj){next[idx[c.id]]=c.data;mut=true;}}
          else{next.push(c.data);mut=true;}
        });
        if(!mut)return prev;
        var mm=lastSavedPats.current||{};
        chg.forEach(function(c){if(c&&c.id!=null&&c.data)mm[c.id]=JSON.stringify(c.data);});
        lastSavedPats.current=mm;
        return next;
      });
    }catch(e){}
  },20000);
  return function(){clearInterval(pp);};
},[]);

// ── AUTO-IMPORTACAO de anamneses enviadas pelos pacientes ──
useEffect(function(){
  var puxarAnam=async function(){
    if(!SUPA_URL)return;
    if(Date.now()-anamPullRef.current<25000)return;
    anamPullRef.current=Date.now();
    try{
      var rows=await supabase.fetchAnamTokens(); // V200: poll leve - so token+created_at (payload nao trafega aqui)
      if(!rows||!rows.length)return;
      var cur=patsRef.current||[];
      var byId={};cur.forEach(function(p){if(p&&p.id!=null)byId[String(p.id)]=p;});
      var seen=anamSeenRef.current||{};
      var updates=[];
      var novos=[];var pidsNoLote={};
      rows.forEach(function(row){
        if(!row||!row.token)return;
        var pid="";try{pid=atob(row.token).replace("orbe:","");}catch(e){pid="";}
        if(!pid)return;
        var p=byId[pid];if(!p)return;
        var sig=pid+"|"+(row.created_at||"");
        if(seen[pid]===sig)return; // ja vista nesta sessao
        if(pidsNoLote[pid])return; // ordem desc: 1a linha do pid ja e a mais recente
        pidsNoLote[pid]=true;
        novos.push({token:row.token,pid:pid,created_at:row.created_at||"",sig:sig});
      });
      // V200: payload (~20KB) so e baixado para fichas realmente novas, uma a uma
      for(var ni=0;ni<novos.length;ni++){
        var nv=novos[ni];
        var pay=null;try{pay=await supabase.fetchAnam(nv.token);}catch(e3){pay=null;}
        if(!pay)continue; // falhou: nao marca como vista - o recuo de 15min do cursor permite nova tentativa no proximo poll
        seen[nv.pid]=nv.sig;
        var p2=byId[nv.pid];if(!p2)continue;
        // assinatura da ficha que o paciente acabou de enviar
        var nova=(pay.signedAt||nv.created_at||"")+"|"+((pay.signature||"").slice(0,12));
        // assinatura ja gravada no paciente
        var atual=(p2.anamnese&&(p2.anamnese.signedAt||p2.anamnese._imp))?((p2.anamnese.signedAt||p2.anamnese._imp||"")+"|"+((p2.anamnese.signature||"").slice(0,12))):"";
        if(atual===nova&&atual!=="")continue; // mesma ficha ja importada
        updates.push({pid:nv.pid,payload:pay,sig:nova});
      }
      anamSeenRef.current=seen;
      if(updates.length){
        setPats(function(prev){
          return (prev||[]).map(function(p){
            var u=updates.find(function(x){return String(p.id)===x.pid;});
            if(!u)return p;
            return Object.assign({},p,{anamnese:Object.assign({},p.anamnese||{},u.payload,{_imp:u.sig}),anamPend:true});
          });
        });
      }
    }catch(e){}
  };
  var t0=setTimeout(function(){if(initialized.current&&!document.hidden)puxarAnam();},8000);
  var iv=setInterval(function(){if(initialized.current&&!document.hidden)puxarAnam();},30000);
  return function(){clearTimeout(t0);clearInterval(iv);};
},[]);

// ── CARREGAR do Supabase ──
useEffect(()=>{
if(!user)return;
(async function(){ // V198: cache do banco - compara so o timestamp (bytes) antes de baixar tudo
  var full=null;
  try{
    var cached=await idb.get("blob_v1");
    if(cached&&cached.updated_at&&cached.data){
      var ts=await supabase.getTimestamp();
      if(ts&&ts===cached.updated_at)full={data:cached.data,updated_at:cached.updated_at};
    }
  }catch(e){}
  if(!full){
    full=await supabase.loadFull();
    if(full){try{idb.set("blob_v1",{data:full.data,updated_at:full.updated_at});}catch(e){}}
  }
  return full;
})().then(full=>{
const data=full?full.data:null;
if(full)lastServerTs.current=full.updated_at;
if(data){
try{
if(data.appts?.length)setAppts(data.appts.map(function(a){return a&&a.time?Object.assign({},a,{time:pad2(a.time)}):a;}));
{var _ai={};(data.appts||[]).forEach(function(a){if(a&&a.id!=null)_ai[a.id]=true;});lastSavedApptIds.current=_ai;}
delAptsRef.current=data.delApts||[];
delPatsRef.current=data.delPats||[]; // V197
try{ // V199: base para comparacao de carimbos por chave
  blobVersRef.current=(data&&data._vers&&typeof data._vers==="object")?Object.assign({},data._vers):{};
  var _lkj={};
  if(data){Object.keys(data).forEach(function(k){if(k==="_vers")return;try{_lkj[k]=JSON.stringify(data[k]);}catch(e){}});}
  lastSavedKeyJsonRef.current=_lkj;
}catch(e){lastSavedKeyJsonRef.current={};}
lastSavedGastosKeys.current=_gKeys(data.gastos);
delGastosRef.current=data.delGastos||[];
lastSavedItemKeys.current=_itemKeys({recs:data.recs,budgets:data.budgets,treats:data.treats,pros:data.pros,rems:data.rems,implMov:data.implMov,implCat:data.implCat,impl:data.impl,orientacoes:data.orientacoes});
delItemsRef.current=data.delItems||[];
if(data.recs?.length)setRecs(data.recs);
if(data.treats?.length){
var treatsmig=data.treats.map(function(t){
  if(!t.items)return t;
  return Object.assign({},t,{items:t.items.map(function(it){
    if((it.done||it.paid)&&it.doneBy&&it.doneByDentistId==null&&data.dents){
      var foundDent=data.dents.find(function(dd){return dd.name===it.doneBy;});
      if(foundDent)return Object.assign({},it,{doneByDentistId:foundDent.id});
    }
    return it;
  })});
});
setTreats(treatsmig);
}
if(data.pros?.length)setPros(data.pros);
if(data.rems?.length)setRems(data.rems);
if(data.budgets?.length)setBudgets(data.budgets);
if(data.users?.length)setUsers(data.users);
if(data.dents?.length)setDents(data.dents);
if(data.perms)setPerms(data.perms);
if(data.labs?.length)setLabs(data.labs);
if(data.procs?.length)setProcs(data.procs);
if(data.stock?.length)setStock(data.stock);
if(data.impl?.length&&data.impl.length>10)setImpl(data.impl);else setImpl(IMPL_DATA_SEED);
if(data.semTicks)setSemTicks(data.semTicks);
if(data.anivTicks)setAnivTicks(data.anivTicks);
if(data.waTemplates)setWaTemplates(data.waTemplates);
if(data.orientacoes){setOrientacoes(data.orientacoes);orientDirtyRef.current=false;}
if(data.pacsTicks)setPacsTicks(data.pacsTicks);if(data.auditDismiss)setAuditDismiss(data.auditDismiss);
if(data.waAuto)setWaAuto(data.waAuto);
if(data.waSent)setWaSent(data.waSent);
if(data.orcResp)setOrcResp(data.orcResp); // V232
if(data.waAutoLog)setWaAutoLog(data.waAutoLog);
if(data.expenses)setExpenses(data.expenses);
if(data.gastos)setGastos(data.gastos);
if(data.pontos?.length)setPontos(data.pontos);
if(data.caixa?.length)setCaixa(data.caixa);
if(data.pontoCfg)setPontoCfg(Object.assign({raio:150,ativo:true,entradaPadrao:"08:00",saidaPadrao:"18:00",cargaSemanal:44,intervalo:60},data.pontoCfg));
if(data.acessoCfg)setAcessoCfg(Object.assign({restringir:true,segIni:"07:00",segFim:"21:00",sabIni:"07:00",sabFim:"13:00",domOn:false,domIni:"08:00",domFim:"12:00"},data.acessoCfg));
if(data.logs?.length)setLogs(data.logs);
if(data.remarcar?.length)setRemarcar(data.remarcar);
if(data.espera?.length)setEspera(data.espera);
if(data.prosProcs?.length)setProsProcs(data.prosProcs);
if(data.implCat?.length)setImplCat(data.implCat);
if(data.implMov?.length)setImplMov(data.implMov);
lastSaved.current=JSON.stringify(data);
// V234: rascunho anti-perda - reaplica edicoes que ficaram sem salvar (ex.: iPhone fechou no meio do "Salvando...")
try{idb.get("draft_v1").then(function(_dft){
  if(!_dft||!_dft.ts||(Date.now()-_dft.ts)>7*86400000)return;
  var _dfDel={};(delItemsRef.current||[]).forEach(function(k){_dfDel[k]=true;});
  var _dfSkip={};(delAptsRef.current||[]).forEach(function(id){_dfSkip[id]=true;});
  if(_dft.appts&&_dft.appts.length)setAppts(function(prev){var m=mergeAppts(prev,_dft.appts,_dfSkip);return JSON.stringify(m)===JSON.stringify(prev)?prev:m;});
  if(_dft.orientacoes&&_dft.orientacoes.length)setOrientacoes(function(prev){var m=mergeOrient(prev,_dft.orientacoes,_dfDel);return JSON.stringify(m)===JSON.stringify(prev)?prev:m;});
  if(_dft.remarcar&&_dft.remarcar.length)setRemarcar(function(prev){prev=prev||[];var ids={};prev.forEach(function(r){if(r&&r.id!=null)ids[r.id]=1;});var add=_dft.remarcar.filter(function(r){return r&&r.id!=null&&!ids[r.id];});return add.length?prev.concat(add):prev;});
});}catch(e){}
}catch(err){}
}
// === PACIENTES: tabela propria (migracao automatica + fallback seguro) ===
var oldPats=(data&&data.pats)||[];
(async function(){ // V198: pacientes do cache na hora + baixar so o que mudou desde entao
  try{
    var cp=await idb.get("pats_v1");
    var cts=await idb.get("pats_ts_v1");
    if(cp&&cp.length&&cts){
      var _dpc={};(delPatsRef.current||[]).forEach(function(i){_dpc[i]=true;});
      cp=cp.filter(function(p){return !(p&&p.id!=null&&_dpc[p.id]);});
      patTableOk.current=true;
      setPats(cp);
      var mmc={};cp.forEach(function(p){if(p&&p.id!=null)mmc[p.id]=JSON.stringify(p);});lastSavedPats.current=mmc;
      lastPatPollTs.current=cts;
      try{
        var chg=await supabase.loadPatientsSince(cts);
        if(chg&&chg.length){
          var maxTs=cts;chg.forEach(function(c){if(c&&c.ts&&c.ts>maxTs)maxTs=c.ts;});
          lastPatPollTs.current=maxTs;
          setPats(function(prev){
            prev=prev||[];
            var idx={};prev.forEach(function(p,i){if(p&&p.id!=null)idx[p.id]=i;});
            var next=prev.slice();
            chg.forEach(function(c){
              if(!c||c.id==null||!c.data)return;
              if(_dpc[c.id])return;
              if(idx[c.id]!=null)next[idx[c.id]]=c.data;else next.push(c.data);
            });
            var mm2=lastSavedPats.current||{};
            chg.forEach(function(c){if(c&&c.id!=null&&c.data&&!_dpc[c.id])mm2[c.id]=JSON.stringify(c.data);});
            lastSavedPats.current=mm2;
            return next;
          });
        }
      }catch(e){}
      return; // cache valido: nao faz a carga completa
    }
  }catch(e){}
  // 1a vez neste aparelho (ou cache indisponivel): carga completa como sempre
  supabase.loadPatients().then(function(tp){
if(tp===null){patTableOk.current=false;if(oldPats.length)setPats(oldPats);return;}
if(tp.length>0){patTableOk.current=true;var _dpi={};(delPatsRef.current||[]).forEach(function(i){_dpi[i]=true;});tp=tp.filter(function(p){return !(p&&p.id!=null&&_dpi[p.id]);}); // V197
setPats(tp);var mm={};tp.forEach(function(p){if(p&&p.id!=null)mm[p.id]=JSON.stringify(p);});lastSavedPats.current=mm;
try{idb.set("pats_v1",tp);idb.set("pats_ts_v1",new Date(Date.now()-10*60000).toISOString());}catch(e){} // V198
}
else if(oldPats.length>0){setPats(oldPats);supabase.upsertPatients(oldPats).then(function(res){if(res&&res.ok){var mm={};oldPats.forEach(function(p){if(p&&p.id!=null)mm[p.id]=JSON.stringify(p);});lastSavedPats.current=mm;patTableOk.current=true;}else{patTableOk.current=false;}});}
else{patTableOk.current=true;lastSavedPats.current={};}
});
})(); // V198
setTimeout(()=>{initialized.current=true;},1000);
// Salvar imediatamente ao sair/esconder a pagina
var flushSave=function(){
  if(!initialized.current)return;
  if(dirtyRef.current&&draftStateRef.current){try{idb.set("draft_v1",Object.assign({ts:Date.now()},draftStateRef.current));}catch(e){}} // V234: rascunho anti-perda (iOS pode matar o save ao sair do app)
  if(isSaving.current)return;
  if(!dirtyRef.current)return; // V210: nada pendente, nada a fazer
  if(saveTimer.current){clearTimeout(saveTimer.current);saveTimer.current=null;}
  try{if(runSaveRef.current)runSaveRef.current();}catch(e){} // V210: dispara o save real (com anti-sobrescrita e merge)
};
document.addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden")flushSave();});
});
},[user]);

// ── SALVAR no Supabase (robusto com retry + fila + anti-sobrescrita) ──
const pendingSave=useRef(false);
const lastServerTs=useRef(null);
const lastLocalChangeTs=useRef(0);
const lastSaveFailed=useRef(false);
const delAptsRef=useRef([]);
const delPatsRef=useRef([]); // V197: tombstone de pacientes excluidos
const blobVersRef=useRef({}); // V199: carimbo de versao por chave do blob
const rtOkRef=useRef(false); // V225: Realtime conectado?
const rtLastEvtRef=useRef(0); // V225: ultimo evento/heartbeat recebido
const doPollNowRef=useRef(null); // V225: gatilho imediato do sync do blob
const patPollNowRef=useRef(null); // V225: gatilho imediato do sync de pacientes
const rtTickRef=useRef(0); // V225: contador p/ poll adaptativo
const rtCanalRef=useRef(null); // V226: canal p/ broadcast 'mudou'
const lastSavedKeyJsonRef=useRef(null); // V199: JSON por chave da ultima gravacao/leitura
const delGastosRef=useRef([]);
const lastSavedGastosKeys=useRef(null);
const delItemsRef=useRef([]);
const mergeLoopRef=useRef(0);
const lastSavedItemKeys=useRef(null);
const lastSavedApptIds=useRef(null);
const dirtyRef=useRef(false);
const runSaveRef=useRef(null); // V210: ponte p/ disparar o save de fora do efeito
const draftStateRef=useRef(null); // V234: espelho do estado pendente p/ rascunho anti-perda
// V197: exclusao real de paciente no servidor. So remove localmente apos confirmacao (padrao V190/Ponto).
const delPatServer=async function(id){
  if(id==null)return {ok:false,msg:"ID invalido"};
  if(patTableOk.current){
    var r=await supabase.deletePatients([id]);
    if(!(r&&r.ok))return r||{ok:false,msg:"Falha na exclusao"};
  }
  var dp=delPatsRef.current||[];if(dp.indexOf(id)<0)dp.push(id);delPatsRef.current=dp.length>3000?dp.slice(-3000):dp;
  try{if(lastSavedPats.current)delete lastSavedPats.current[id];}catch(e){}
  lastLocalChangeTs.current=Date.now();
  return {ok:true};
};
// V199: busca so as chaves do blob que mudaram (comparando carimbos _vers).
// Retorna {data,updated_at,partial}. Em QUALQUER anormalidade, cai no loadFull antigo.
const BLOB_TOMB_KEYS=["delApts","delPats","delGastos","delItems"];
const fetchBlobDelta=async function(){
  try{
    if(lastSavedKeyJsonRef.current){
      var v=await supabase.loadVers();
      if(v&&v.updated_at&&v.vers&&typeof v.vers==="object"&&!Array.isArray(v.vers)){
        var lv=blobVersRef.current||{};
        var changed=[];
        Object.keys(v.vers).forEach(function(k){if(k==="_vers"||k==="pats")return;if(v.vers[k]!==lv[k])changed.push(k);});
        if(!changed.length)return {data:{},updated_at:v.updated_at,partial:true};
        BLOB_TOMB_KEYS.forEach(function(k){if(changed.indexOf(k)<0)changed.push(k);});
        var part=await supabase.loadKeys(changed);
        if(part&&part.updated_at){
          var sd={};
          changed.forEach(function(k){
            if(part[k]!==undefined&&part[k]!==null){
              sd[k]=part[k];
              if(v.vers[k]!=null)blobVersRef.current[k]=v.vers[k];
              try{lastSavedKeyJsonRef.current[k]=JSON.stringify(part[k]);}catch(e){}
            }
          });
          return {data:sd,updated_at:part.updated_at,partial:true};
        }
      }
    }
  }catch(e){}
  // fallback: comportamento identico ao anterior (download completo)
  var fresh=await supabase.loadFull();
  if(fresh&&fresh.data){
    try{if(fresh.data._vers&&typeof fresh.data._vers==="object")blobVersRef.current=Object.assign({},fresh.data._vers);}catch(e){}
    return {data:fresh.data,updated_at:fresh.updated_at,partial:false};
  }
  return null;
};
// Merge aditivo de "ticks" (aniversario/contatos): nunca perde uma marcação local.
// União das chaves; em conflito, vence o ts mais novo; sem ts, vence "done:true".
function mergeTicks(local,server){
  if(!server)return local||{};
  if(!local)return server;
  var out={},k,keys={};
  for(k in local)keys[k]=1;
  for(k in server)keys[k]=1;
  for(k in keys){
    var a=local[k],b=server[k];
    if(a===undefined||a===null){out[k]=b;continue;}
    if(b===undefined||b===null){out[k]=a;continue;}
    var ta=(a&&a.ts)||0,tb=(b&&b.ts)||0;
    if(ta||tb){out[k]=tb>ta?b:a;}
    else{out[k]=(a&&a.done)?a:((b&&b.done)?b:a);}
  }
  return out;
}
// Timestamp da ultima confirmacao/cancelamento via WhatsApp de uma consulta (string ISO; "" se nenhum)
function _gKeys(g){var o={};if(g){["clinica","pessoal"].forEach(function(t){(g[t]||[]).forEach(function(e){if(e&&e.id!=null)o[t+":"+e.id]=true;});});}return o;}
function _mgList(localList,serverList,prefix,delSet){
  localList=localList||[];serverList=serverList||[];
  var byId={};
  localList.forEach(function(e){if(e&&e.id!=null)byId[e.id]=e;});
  serverList.forEach(function(srv){
    if(!srv||srv.id==null)return;
    var l=byId[srv.id];
    if(!l){byId[srv.id]=srv;return;}
    var lt=l._ts||0,st=srv._ts||0;
    if(st>lt)byId[srv.id]=srv;
  });
  var out=[];Object.keys(byId).forEach(function(k){if(!delSet[prefix+":"+k])out.push(byId[k]);});
  return out;
}
function mergeGastos(local,server,delSet){
  local=local||{};server=server||{};delSet=delSet||{};
  return {clinica:_mgList(local.clinica,server.clinica,"clinica",delSet),pessoal:_mgList(local.pessoal,server.pessoal,"pessoal",delSet)};
}
function _itemKeys(map){var o={};if(map){Object.keys(map).forEach(function(t){(map[t]||[]).forEach(function(e){if(e&&e.id!=null)o[t+":"+e.id]=true;});});}return o;}
function _waTs(a){if(!a)return "";var c=a.confirmadoWAts||"";var x=a.canceladoWAts||"";return c>x?c:x;}
// Merge de consultas SEGURO: mantem o local (nao reverte mudancas manuais), adiciona consultas novas do servidor,
// e adota o status do servidor SO quando ha confirmacao/cancelamento do WhatsApp mais recente (webhook) -> nao perde confirmacao nem reverte.
// V190: entre duas versoes de config (pontoCfg), vence a de carimbo _ts mais novo
function _newerCfg(a,b){if(!a)return b;if(!b)return a;return (b._ts||0)>(a._ts||0)?b:a;}
// V239: merge item-a-item de cadastros (usuarios/dentistas). Vence o registro de carimbo _ts
// mais novo; quem so existe de um lado e mantido. Antes o save regravava a copia velha da
// memoria por cima e desfazia a edicao feita em outro aparelho.
function mergeCad(localArr,serverArr,delSet,prefix){
  localArr=localArr||[];serverArr=serverArr||[];delSet=delSet||{};
  var morto=function(id){return prefix?!!delSet[prefix+":"+id]:false;};
  var srvById={};serverArr.forEach(function(s){if(s&&s.id!=null)srvById[s.id]=s;});
  var out=[],visto={};
  localArr.forEach(function(l){
    if(!l||l.id==null||visto[l.id]||morto(l.id))return;
    var s=srvById[l.id];
    out.push(s&&(s._ts||0)>(l._ts||0)?s:l);
    visto[l.id]=true;
  });
  serverArr.forEach(function(s){
    if(!s||s.id==null||visto[s.id]||morto(s.id))return;
    out.push(s);visto[s.id]=true;
  });
  return out;
}
function mergeAppts(localArr,serverArr,delSet){
  localArr=localArr||[];serverArr=serverArr||[];delSet=delSet||{};
  var byId={};
  localArr.forEach(function(a){if(a&&a.id!=null)byId[a.id]=a;});
  serverArr.forEach(function(s){
    if(!s||s.id==null)return;
    var l=byId[s.id];
    if(!l){byId[s.id]=s;return;}
    var lM=l.statusTs||"",sM=s.statusTs||"";
    if(sM>lM){byId[s.id]=s;return;}
    // V189: edicoes (troca de paciente, horario etc.) carimbam _ts; o mais recente vence
    var lE=l._ts||0,sE=s._ts||0;
    if(sE>lE){byId[s.id]=s;return;}
    if(lE>sE)return;
    if(lM)return;
    var sW=_waTs(s),lW=_waTs(l);
    if(sW&&sW>lW)byId[s.id]=s;
  });
  var out=[];Object.keys(byId).forEach(function(k){if(!delSet[k])out.push(byId[k]);});
  return out;
}
// V234: MERGE de ORIENTACOES item-a-item - _ts mais novo vence; exclusoes via tombstone delItems ("orientacoes:id")
function mergeOrient(localArr,serverArr,delSet){
  localArr=localArr||[];serverArr=serverArr||[];delSet=delSet||{};
  var byId={},order=[];
  localArr.forEach(function(o){if(o&&o.id!=null&&!delSet["orientacoes:"+o.id]){byId[o.id]=o;order.push(o.id);}});
  serverArr.forEach(function(s){
    if(!s||s.id==null||delSet["orientacoes:"+s.id])return;
    var l=byId[s.id];
    if(!l){byId[s.id]=s;order.push(s.id);return;}
    if((s._ts||0)>(l._ts||0))byId[s.id]=s;
  });
  return order.map(function(id){return byId[id];});
}
// ── MERGE de PLANOS item-a-item: baixa (done) nunca se perde; pagamentos unidos por id ──
function _treatItemDone(it){return !!(it&&(it.done||it.paid));}
function _mergeOneTreat(local,server){
if(!local)return server;
if(!server)return local;
var lt=local._ts||0,st=server._ts||0;
var newer=st>lt?server:local;
var out=Object.assign({},newer);
var la=local.items||[],sa=server.items||[];
var items;
if(la.length===sa.length){
items=[];
for(var i=0;i<la.length;i++){
var a=la[i],b=sa[i];
if(!a){items.push(b);continue;}
if(!b){items.push(a);continue;}
var at=a._dts||0,bt=b._dts||0;
if(at!==bt)items.push(at>bt?a:b);
else items.push(st>lt?b:a);
}
}else{
items=(newer.items||[]).slice();
}
out.items=items;
var itemPmt={};
la.concat(sa).forEach(function(it){if(it&&it.pmtId!=null)itemPmt[it.pmtId]=true;});
var pById={};
(local.payments||[]).forEach(function(p){if(p&&p.id!=null&&!pById[p.id])pById[p.id]=p;});
(server.payments||[]).forEach(function(p){if(p&&p.id!=null&&!pById[p.id])pById[p.id]=p;});
var newerPays=(st>lt?server:local).payments||[];
var pays=[],used={};
items.forEach(function(it){if(it&&_treatItemDone(it)&&it.pmtId!=null&&pById[it.pmtId]&&!used[it.pmtId]){pays.push(pById[it.pmtId]);used[it.pmtId]=true;}});
newerPays.forEach(function(p){if(!p||p.id==null||used[p.id])return;if(p._b||itemPmt[p.id])return;pays.push(p);used[p.id]=true;});
if(local.payments||server.payments)out.payments=pays;
return out;
}
function mergeTreats(localArr,serverArr,delSet){
localArr=localArr||[];serverArr=serverArr||[];delSet=delSet||{};
var byId={};
localArr.forEach(function(t){if(t&&t.id!=null)byId[t.id]={local:t,server:null};});
serverArr.forEach(function(t){if(t&&t.id!=null){if(byId[t.id])byId[t.id].server=t;else byId[t.id]={local:null,server:t};}});
var out=[],seen={};
localArr.forEach(function(t){if(!t||t.id==null||seen[t.id])return;if(delSet["treats:"+t.id])return;var e=byId[t.id];out.push(_mergeOneTreat(e.local,e.server));seen[t.id]=true;});
serverArr.forEach(function(t){if(!t||t.id==null||seen[t.id])return;if(delSet["treats:"+t.id])return;out.push(t);seen[t.id]=true;});
return out;
}
useEffect(function(){
  if(!initialized.current)return;
  lastLocalChangeTs.current=Date.now();
  dirtyRef.current=true;
  draftStateRef.current={appts:appts,remarcar:remarcar,orientacoes:orientacoes}; // V234
  if(saveTimer.current)clearTimeout(saveTimer.current);
  setSaveStatus("saving");
  var doSave=async function(force){
    var _editAtStart=lastLocalChangeTs.current;
    // detectar exclusoes/recriacoes de agendamentos desde a ultima sincronizacao
    if(lastSavedApptIds.current){
      var _cur={};(appts||[]).forEach(function(a){if(a&&a.id!=null)_cur[a.id]=true;});
      var _dl=delAptsRef.current||[];
      Object.keys(lastSavedApptIds.current).forEach(function(id){if(!_cur[id]){var ni=Number(id);if(_dl.indexOf(ni)<0)_dl.push(ni);}});
      _dl=_dl.filter(function(id){return !_cur[id];});
      delAptsRef.current=_dl.length>3000?_dl.slice(-3000):_dl;
    }
    // detectar exclusoes de gastos desde a ultima sincronizacao
    if(lastSavedGastosKeys.current){
      var _cg=_gKeys(gastos);
      var _dg=delGastosRef.current||[];
      Object.keys(lastSavedGastosKeys.current).forEach(function(k){if(!_cg[k]&&_dg.indexOf(k)<0)_dg.push(k);});
      _dg=_dg.filter(function(k){return !_cg[k];});
      delGastosRef.current=_dg.length>3000?_dg.slice(-3000):_dg;
    }
    // detectar exclusoes de planos/registros desde a ultima sincronizacao
    if(lastSavedItemKeys.current){
      var _ik=_itemKeys({recs:recs,budgets:budgets,treats:treats,pros:pros,rems:rems,implMov:implMov,implCat:implCat,impl:impl,orientacoes:orientacoes});
      var _di=delItemsRef.current||[];
      Object.keys(lastSavedItemKeys.current).forEach(function(k){if(!_ik[k]&&_di.indexOf(k)<0)_di.push(k);});
      _di=_di.filter(function(k){return !_ik[k];});
      delItemsRef.current=_di.length>5000?_di.slice(-5000):_di;
    }
    // ANTI-SOBRESCRITA: verificar se servidor tem versao mais nova que a nossa
    if(!force){try{
      var serverTs=await supabase.getTimestamp();
      if(serverTs&&lastServerTs.current&&serverTs!==lastServerTs.current){
        // Outro computador salvou! Recarregar antes de gravar para nao perder dados
        var fresh=await fetchBlobDelta(); // V199: baixa so o que mudou
        if(fresh&&fresh.data){
          var sd=fresh.data;
          // unir exclusoes do servidor com as nossas
          if(sd.delApts&&sd.delApts.length){var _dd=delAptsRef.current||[];sd.delApts.forEach(function(id){if(_dd.indexOf(id)<0)_dd.push(id);});delAptsRef.current=_dd.length>3000?_dd.slice(-3000):_dd;}
          if(sd.delPats&&sd.delPats.length){var _dpp=delPatsRef.current||[];sd.delPats.forEach(function(id){if(_dpp.indexOf(id)<0)_dpp.push(id);});delPatsRef.current=_dpp.length>3000?_dpp.slice(-3000):_dpp;} // V197
          if(delPatsRef.current&&delPatsRef.current.length){var _dpmA={};delPatsRef.current.forEach(function(i){_dpmA[i]=true;});setPats(function(prev){prev=prev||[];var n=prev.filter(function(p){return !(p&&p.id!=null&&_dpmA[p.id]);});return n.length===prev.length?prev:n;});} // V197
          if(sd.delGastos&&sd.delGastos.length){var _dgs=delGastosRef.current||[];sd.delGastos.forEach(function(k){if(_dgs.indexOf(k)<0)_dgs.push(k);});delGastosRef.current=_dgs.length>3000?_dgs.slice(-3000):_dgs;}
          if(sd.delItems&&sd.delItems.length){var _dis=delItemsRef.current||[];sd.delItems.forEach(function(k){if(_dis.indexOf(k)<0)_dis.push(k);});delItemsRef.current=_dis.length>5000?_dis.slice(-5000):_dis;}
          var _diSet={};(delItemsRef.current||[]).forEach(function(k){_diSet[k]=true;});
          var _skip={};(delAptsRef.current||[]).forEach(function(id){_skip[id]=true;});
          // Merge automatico: adicionar registros que nao temos localmente (menos os apagados)
          var mergeArr=function(localArr,serverArr,setter,prefix){
            setter(function(prev){
              prev=prev||[];
              var changed=false,base=prev;
              if(prefix){base=prev.filter(function(x){return !(x&&x.id!=null&&_diSet[prefix+":"+x.id]);});if(base.length!==prev.length)changed=true;}
              if(serverArr&&serverArr.length){
                var srvById={};serverArr.forEach(function(x){if(x&&x.id!=null)srvById[x.id]=x;});
                base=base.map(function(x){if(x&&x.id!=null&&srvById[x.id]&&(srvById[x.id]._ts||0)>(x._ts||0)){changed=true;return srvById[x.id];}return x;});
                var localIds={};base.forEach(function(x){if(x&&x.id!=null)localIds[x.id]=true;});
                var missing=serverArr.filter(function(x){return x&&x.id!=null&&!localIds[x.id]&&!(prefix&&_diSet[prefix+":"+x.id]);});
                if(missing.length){base=base.concat(missing);changed=true;}
              }
              return changed?base:prev;
            });
          };
          setAppts(function(prev){var arr=mergeAppts(prev,sd.appts,_skip);return JSON.stringify(arr)===JSON.stringify(prev)?prev:arr;});
          mergeArr(recs,sd.recs,setRecs,"recs");
          mergeArr(budgets,sd.budgets,setBudgets,"budgets");
          setTreats(function(prev){var _a=mergeTreats(prev,sd.treats,_diSet);return JSON.stringify(_a)===JSON.stringify(prev)?prev:_a;});
          mergeArr(pros,sd.pros,setPros,"pros");
          mergeArr(rems,sd.rems,setRems,"rems");
          mergeArr(logs,sd.logs,setLogs);
          mergeArr(implMov,sd.implMov,setImplMov,"implMov");
          mergeArr(implCat,sd.implCat,setImplCat,"implCat");
          mergeArr(impl,sd.impl,setImpl,"impl");
          mergeArr(pontos,sd.pontos,setPontos);
          mergeArr(caixa,sd.caixa,setCaixa);
          // V239: cadastros passam a entrar no merge antes de gravar (antes o save levava a copia velha da memoria e desfazia edicao de outro aparelho)
          if(sd.users)setUsers(function(prev){var m=mergeCad(prev,sd.users,_diSet,"users");return JSON.stringify(m)===JSON.stringify(prev)?prev:m;});
          if(sd.dents)setDents(function(prev){var m=mergeCad(prev,sd.dents,_diSet,"dents");return JSON.stringify(m)===JSON.stringify(prev)?prev:m;});
          if(sd.acessoCfg)setAcessoCfg(function(prev){var n=_newerCfg(prev,sd.acessoCfg);return n===prev?prev:n;});
          if(sd.pontoCfg)setPontoCfg(function(prev){var n=_newerCfg(prev,sd.pontoCfg);return n===prev?prev:n;}); // V190
          if(sd.waAuto){waAutoSrvRef.current=_newerWa(waAutoSrvRef.current,sd.waAuto);setWaAuto(function(prev){var w=_newerWa(prev,sd.waAuto);return JSON.stringify(prev)===JSON.stringify(w)?prev:w;});}
          if(sd.pacsTicks)setPacsTicks(function(prev){return mergeTicks(prev,sd.pacsTicks);});
          if(sd.orcResp)setOrcResp(function(prev){return mergeTicks(prev,sd.orcResp);}); // V232
          if(sd.orientacoes)setOrientacoes(function(prev){var m=mergeOrient(prev,sd.orientacoes,_diSet);return JSON.stringify(m)===JSON.stringify(prev)?prev:m;}); // V234: item-a-item, nao perde edicao local nem remota
          if(sd.gastos){var _dgm={};(delGastosRef.current||[]).forEach(function(k){_dgm[k]=true;});setGastos(function(prev){var m=mergeGastos(prev,sd.gastos,_dgm);return JSON.stringify(m)===JSON.stringify(prev)?prev:m;});}
          lastServerTs.current=fresh.updated_at;
          if(fresh.partial===false){try{idb.set("blob_v1",{data:fresh.data,updated_at:fresh.updated_at});}catch(e){}} // V198+V199: cache so quando completo
          // Cancelar este save - o useEffect vai disparar de novo com o estado mergeado
          return "merged";
        }
      }
    }catch(e){}}
    const payload={appts,recs,treats,pros,rems,budgets,users,dents,perms,labs,procs,stock,impl,expenses,logs,remarcar,espera,prosProcs,implCat,implMov,semTicks,anivTicks,waTemplates,orientacoes,pacsTicks,auditDismiss,waAuto:_newerWa(waAuto,waAutoSrvRef.current),waSent,waAutoLog,gastos,delApts:delAptsRef.current,delPats:delPatsRef.current,delGastos:delGastosRef.current,delItems:delItemsRef.current,pontos,caixa,pontoCfg,acessoCfg,orcResp};
    if(!patTableOk.current)payload.pats=pats;
    try{ // V199: carimbo de versao so nas chaves cujo conteudo mudou
      if(!lastSavedKeyJsonRef.current)lastSavedKeyJsonRef.current={};
      var _vNow=new Date().toISOString();
      Object.keys(payload).forEach(function(k){
        var _js;try{_js=JSON.stringify(payload[k]);}catch(e){_js=null;}
        if(_js===null)return;
        if(lastSavedKeyJsonRef.current[k]!==_js||!blobVersRef.current[k]){blobVersRef.current[k]=_vNow;lastSavedKeyJsonRef.current[k]=_js;}
      });
      payload._vers=Object.assign({},blobVersRef.current);
    }catch(e){}
    var ok=false;
    for(var i=0;i<3&&!ok;i++){
      try{
        var saved=await supabase.save(payload);
        if(saved!==false){
          lastSaved.current=JSON.stringify(payload);
          {var _ai2={};(appts||[]).forEach(function(a){if(a&&a.id!=null)_ai2[a.id]=true;});lastSavedApptIds.current=_ai2;}
          lastSavedGastosKeys.current=_gKeys(gastos);
          lastSavedItemKeys.current=_itemKeys({recs:recs,budgets:budgets,treats:treats,pros:pros,rems:rems,implMov:implMov,implCat:implCat,impl:impl,orientacoes:orientacoes});
          // Atualizar timestamp do servidor para o nosso
          var newTs=await supabase.getTimestamp();
          if(newTs)lastServerTs.current=newTs;
          if(newTs){try{idb.set("blob_v1",{data:payload,updated_at:newTs});}catch(e){}} // V198
          try{if(rtCanalRef.current&&rtCanalRef.current.state==="joined")rtCanalRef.current.send({type:"broadcast",event:"mudou",payload:{k:"blob"}});}catch(e){} // V226: aviso instantaneo aos outros aparelhos
          if(lastLocalChangeTs.current===_editAtStart)dirtyRef.current=false;
          if(lastLocalChangeTs.current===_editAtStart)orientDirtyRef.current=false;
          if(lastLocalChangeTs.current===_editAtStart){try{idb.set("draft_v1",null);}catch(e){}} // V234: salvo com sucesso, limpa o rascunho
          ok=true;
        }
      }catch(e){}
      if(!ok&&i<2)await new Promise(function(r){setTimeout(r,1200);});
    }
    return ok;
  };
  var runSave=async function runSave(){
    if(isSaving.current){ pendingSave.current=true; return; }
    isSaving.current=true;
    var ok=await doSave(false);
    var _mtry=0;
    while(ok==="merged"&&_mtry<3){_mtry++;ok=await doSave(false);}
    if(ok==="merged"){
      mergeLoopRef.current++;
      if(mergeLoopRef.current>=2){
        // Servidor mudando sem parar (outro aparelho/aba aberto): forcar gravacao para nao travar
        mergeLoopRef.current=0;
        ok=await doSave(true);
      }
      if(ok==="merged"){
        isSaving.current=false;
        saveTimer.current=setTimeout(runSave,2500);
        return;
      }
    }
    if(ok!=="merged")mergeLoopRef.current=0;
    setSaveStatus(ok?"saved":"error");
    lastSaveFailed.current=!ok;
    setTimeout(function(){setSaveStatus("idle");},ok?2000:4000);
    isSaving.current=false;
    saveTimer.current=null;
    if(pendingSave.current){
      pendingSave.current=false;
      isSaving.current=true;
      var ok2=await doSave();
      if(ok2!=="merged"){
        lastSaveFailed.current=!ok2;
        setSaveStatus(ok2?"saved":"error");
        setTimeout(function(){setSaveStatus("idle");},ok2?2000:4000);
      }
      isSaving.current=false;
    }
  };
  runSaveRef.current=runSave; // V210
  saveTimer.current=setTimeout(runSave,800);
},[pats,appts,recs,treats,pros,rems,budgets,users,dents,perms,labs,procs,stock,impl,expenses,logs,remarcar,espera,prosProcs,implCat,implMov,semTicks,anivTicks,waTemplates,orientacoes,pacsTicks,auditDismiss,gastos,waAuto,waSent,waAutoLog,pontos,caixa,pontoCfg,acessoCfg,orcResp]);

// ── SALVAR PACIENTES na tabela propria (apenas os que mudaram) ──
patsRef.current=pats;
useEffect(function(){
  if(!initialized.current||!patTableOk.current)return;
  if(patSaveTimer.current)clearTimeout(patSaveTimer.current);
  patSaveTimer.current=setTimeout(async function syncPats(){
    if(patSaving.current){patPending.current=true;return;}
    patSaving.current=true;
    do{
      patPending.current=false;
      var cur=patsRef.current||[];
      var prev=lastSavedPats.current||{};
      var changed=[];
      cur.forEach(function(p){if(!p||p.id==null)return;var sj=JSON.stringify(p);if(prev[p.id]!==sj)changed.push(p);});
      var okAll=true;
      if(changed.length){var r=await supabase.upsertPatients(changed);if(!(r&&r.ok))okAll=false;}
      if(okAll){var mm={};cur.forEach(function(p){if(p&&p.id!=null)mm[p.id]=JSON.stringify(p);});lastSavedPats.current=mm;}
    }while(patPending.current);
    try{idb.set("pats_v1",patsRef.current||[]);idb.set("pats_ts_v1",new Date(Date.now()-10*60000).toISOString());}catch(e){} // V198: ts com folga de 10min p/ nunca perder mudanca de outro aparelho
    patSaving.current=false;
  },1000);
},[pats]);

// ── SINCRONIZACAO entre dispositivos: polling a cada 15s ──
useEffect(function(){
  var doPoll=async function(){
    if(!initialized.current||isSaving.current||pendingSave.current||lastSaveFailed.current||document.hidden)return;
    if(dirtyRef.current)return;
    if(Date.now()-lastLocalChangeTs.current<12000)return;
    try{
      var serverTs=await supabase.getTimestamp();
      if(!serverTs)return;
      if(lastServerTs.current===null){lastServerTs.current=serverTs;return;}
      if(serverTs===lastServerTs.current)return;
      // Servidor mudou - carregar e fazer merge
      var fresh=await fetchBlobDelta(); // V199: baixa so o que mudou
      if(!fresh||!fresh.data)return;
      var sd=fresh.data;
      // re-checa: se o usuario mexeu durante o carregamento, nao sobrescreve
      if(Date.now()-lastLocalChangeTs.current<12000)return;
      // une exclusoes do servidor com as nossas
      if(sd.delApts&&sd.delApts.length){var _pd=delAptsRef.current||[];sd.delApts.forEach(function(id){if(_pd.indexOf(id)<0)_pd.push(id);});delAptsRef.current=_pd.length>3000?_pd.slice(-3000):_pd;}
      if(sd.delPats&&sd.delPats.length){var _pdp=delPatsRef.current||[];sd.delPats.forEach(function(id){if(_pdp.indexOf(id)<0)_pdp.push(id);});delPatsRef.current=_pdp.length>3000?_pdp.slice(-3000):_pdp;} // V197
      if(delPatsRef.current&&delPatsRef.current.length){var _dpmB={};delPatsRef.current.forEach(function(i){_dpmB[i]=true;});setPats(function(prev){prev=prev||[];var n=prev.filter(function(p){return !(p&&p.id!=null&&_dpmB[p.id]);});return n.length===prev.length?prev:n;});} // V197
      if(sd.delItems&&sd.delItems.length){var _pdi=delItemsRef.current||[];sd.delItems.forEach(function(k){if(_pdi.indexOf(k)<0)_pdi.push(k);});delItemsRef.current=_pdi.length>5000?_pdi.slice(-5000):_pdi;}
      // adota a versao do servidor (reflete exclusoes). itens novos ainda nao salvos
      // estao protegidos pelas travas (12s recente / save pendente / falha de save) acima.
      var mergeArr=function(serverArr,setter){
        if(!serverArr)return;
        setter(function(prev){
          prev=prev||[];
          return JSON.stringify(serverArr)===JSON.stringify(prev)?prev:serverArr.slice();
        });
      };
      // === SINCRONIZACAO SEGURA (nao perde dados locais) ===
      var _delP={};(delAptsRef.current||[]).forEach(function(id){_delP[id]=true;});
      var _diSetP={};(delItemsRef.current||[]).forEach(function(k){_diSetP[k]=true;});
      // ADITIVO: mantem tudo que e local; so traz do servidor o que ainda nao temos.
      var addArr=function(serverArr,setter,prefix){
        setter(function(prev){
          prev=prev||[];
          var changed=false,base=prev;
          if(prefix){base=prev.filter(function(x){return !(x&&x.id!=null&&_diSetP[prefix+":"+x.id]);});if(base.length!==prev.length)changed=true;}
          if(serverArr&&serverArr.length){
            var srvById={};serverArr.forEach(function(x){if(x&&x.id!=null)srvById[x.id]=x;});
            base=base.map(function(x){if(x&&x.id!=null&&srvById[x.id]&&(srvById[x.id]._ts||0)>(x._ts||0)){changed=true;return srvById[x.id];}return x;});
            var ids={};base.forEach(function(x){if(x&&x.id!=null)ids[x.id]=true;});
            var miss=serverArr.filter(function(x){return x&&x.id!=null&&!ids[x.id]&&!(prefix&&_diSetP[prefix+":"+x.id]);});
            if(miss.length){base=base.concat(miss);changed=true;}
          }
          return changed?base:prev;
        });
      };
      // AGENDA: servidor manda no status (reflete confirmacoes do WhatsApp), mas mantem consultas locais que o servidor ainda nao tem e remove as apagadas.
      var apptArr=function(serverArr,setter){
        if(!serverArr)return;
        setter(function(prev){
          prev=prev||[];
          var arr=mergeAppts(prev,serverArr,_delP);
          var fin=JSON.stringify(arr)===JSON.stringify(prev)?prev:arr;
          var _ai={};fin.forEach(function(a){if(a&&a.id!=null)_ai[a.id]=true;});lastSavedApptIds.current=_ai;
          return fin;
        });
      };
      apptArr(sd.appts,setAppts);
      addArr(sd.recs,setRecs,"recs");
      addArr(sd.budgets,setBudgets,"budgets");
      setTreats(function(prev){var _a=mergeTreats(prev,sd.treats,_diSetP);return JSON.stringify(_a)===JSON.stringify(prev)?prev:_a;});
      addArr(sd.pros,setPros,"pros");
      addArr(sd.rems,setRems,"rems");
      addArr(sd.logs,setLogs);
      addArr(sd.pontos,setPontos);
      addArr(sd.caixa,setCaixa); // V190: caixa agora sincroniza no poll
      if(sd.pontoCfg)setPontoCfg(function(prev){var n=_newerCfg(prev,sd.pontoCfg);return n===prev?prev:n;}); // V190
      if(sd.expenses)setExpenses(function(prev){return JSON.stringify(prev)===JSON.stringify(sd.expenses)?prev:sd.expenses;});
      if(sd.gastos){var _dgp={};(delGastosRef.current||[]).forEach(function(k){_dgp[k]=true;});setGastos(function(prev){var m=mergeGastos(prev,sd.gastos,_dgp);return JSON.stringify(m)===JSON.stringify(prev)?prev:m;});}
      if(sd.waAuto){waAutoSrvRef.current=_newerWa(waAutoSrvRef.current,sd.waAuto);setWaAuto(function(prev){var w=_newerWa(prev,sd.waAuto);return JSON.stringify(prev)===JSON.stringify(w)?prev:w;});}
      if(sd.waSent)setWaSent(function(prev){return JSON.stringify(prev)===JSON.stringify(sd.waSent)?prev:sd.waSent;});
      if(sd.orcResp)setOrcResp(function(prev){var m=mergeTicks(prev,sd.orcResp);return JSON.stringify(prev)===JSON.stringify(m)?prev:m;}); // V232
      if(sd.waAutoLog)setWaAutoLog(function(prev){return JSON.stringify(prev)===JSON.stringify(sd.waAutoLog)?prev:sd.waAutoLog;});
      if(sd.users)setUsers(function(prev){var m=mergeCad(prev,sd.users,_diSetP,"users");return JSON.stringify(m)===JSON.stringify(prev)?prev:m;}); // V239: item-a-item, nao sobrescreve edicao local recente
      if(sd.dents)setDents(function(prev){var m=mergeCad(prev,sd.dents,_diSetP,"dents");return JSON.stringify(m)===JSON.stringify(prev)?prev:m;}); // V239
      if(sd.acessoCfg)setAcessoCfg(function(prev){var n=_newerCfg(prev,sd.acessoCfg);return n===prev?prev:n;}); // V239: antes nem sincronizava
      if(sd.perms)setPerms(function(prev){return JSON.stringify(prev)===JSON.stringify(sd.perms)?prev:sd.perms;});
      if(sd.labs)setLabs(function(prev){return JSON.stringify(prev)===JSON.stringify(sd.labs)?prev:sd.labs;});
      if(sd.procs&&sd.procs.length)setProcs(function(prev){return JSON.stringify(prev)===JSON.stringify(sd.procs)?prev:sd.procs;});
      if(sd.stock)setStock(function(prev){return JSON.stringify(prev)===JSON.stringify(sd.stock)?prev:sd.stock;});
      if(sd.impl)addArr(sd.impl,setImpl,"impl");
      if(sd.prosProcs)setProsProcs(function(prev){return JSON.stringify(prev)===JSON.stringify(sd.prosProcs)?prev:sd.prosProcs;});
      if(sd.espera)setEspera(function(prev){return JSON.stringify(prev)===JSON.stringify(sd.espera)?prev:sd.espera;});
      if(sd.remarcar)setRemarcar(function(prev){return JSON.stringify(prev)===JSON.stringify(sd.remarcar)?prev:sd.remarcar;});
      if(sd.pacsTicks)setPacsTicks(function(prev){var m=mergeTicks(prev,sd.pacsTicks);return JSON.stringify(prev)===JSON.stringify(m)?prev:m;});if(sd.auditDismiss)setAuditDismiss(function(prev){return JSON.stringify(prev)===JSON.stringify(sd.auditDismiss)?prev:sd.auditDismiss;});
      if(sd.semTicks)setSemTicks(function(prev){return JSON.stringify(prev)===JSON.stringify(sd.semTicks)?prev:sd.semTicks;});
      if(sd.anivTicks)setAnivTicks(function(prev){return JSON.stringify(prev)===JSON.stringify(sd.anivTicks)?prev:sd.anivTicks;});
      if(sd.implCat)addArr(sd.implCat,setImplCat,"implCat");// V238 merge aditivo - nao sobrescreve mais
      if(sd.implMov)addArr(sd.implMov,setImplMov,"implMov");// V238 merge aditivo - nao sobrescreve mais
      if(sd.orientacoes)setOrientacoes(function(prev){var m=mergeOrient(prev,sd.orientacoes,_diSetP);return JSON.stringify(m)===JSON.stringify(prev)?prev:m;}); // V234: item-a-item, _ts mais novo vence
      lastServerTs.current=fresh.updated_at;
      if(fresh.partial===false){try{idb.set("blob_v1",{data:fresh.data,updated_at:fresh.updated_at});}catch(e){}} // V198+V199: cache so quando completo
    }catch(e){}
  };
  doPollNowRef.current=doPoll; // V225: Realtime dispara o mesmo sync
  var poll=setInterval(function(){ // V225: adaptativo - RT saudavel: ~64s; RT fora: 8s (igual hoje)
    rtTickRef.current=(rtTickRef.current||0)+1;
    var rtVivo=rtOkRef.current&&(Date.now()-(rtLastEvtRef.current||0)<120000);
    if(rtVivo&&(rtTickRef.current%8)!==0)return;
    doPoll();
  },8000); // V189: 15s -> 8s
  var _onVis=function(){if(document.hidden)return;if(dirtyRef.current&&!isSaving.current&&!saveTimer.current&&runSaveRef.current){saveTimer.current=setTimeout(runSaveRef.current,300);} doPoll();}; // V189+V210: re-arma save pendente e sincroniza ao voltar
  document.addEventListener("visibilitychange",_onVis);
  return function(){clearInterval(poll);document.removeEventListener("visibilitychange",_onVis);};
},[]);

// Polling removido - causava race condition sobrescrevendo dados locais;

const portalToken=(function(){try{return new URLSearchParams(window.location.search).get("portal");}catch(e){return null;}})();
if(portalToken)return <PatientPortal token={portalToken}/>;
const anamToken=(function(){try{return new URLSearchParams(window.location.search).get("anam");}catch(e){return null;}})();
if(anamToken)return <PublicAnamnese token={anamToken}/>;
const contratoToken=(function(){try{return new URLSearchParams(window.location.search).get("contrato");}catch(e){return null;}})();
if(contratoToken)return <PublicContrato token={contratoToken}/>;
// === PORTAL DO PACIENTE: (a) recalcula pat._portal  (b) reconcilia confirmacoes de presenca ===
useEffect(function(){
  var changed=[];
  (pats||[]).forEach(function(p){
    if(!p||!p.portalToken)return;
    var summ=buildPortal(p,appts,treats,budgets,dents);
    var a=p._portal?JSON.stringify(Object.assign({},p._portal,{updatedAt:0})):"";
    var b=JSON.stringify(Object.assign({},summ,{updatedAt:0}));
    if(a!==b)changed.push({id:p.id,summ:summ});
  });
  if(changed.length){
    setPats(function(prev){return prev.map(function(p){var c=changed.find(function(x){return x.id===p.id;});return c?Object.assign({},p,{_portal:c.summ}):p;});});
  }
},[pats,appts,treats,budgets,dents]);
useEffect(function(){
  if(!SUPA_URL)return;
  var iv=setInterval(function(){
    supabase.fetchPortalActions().then(function(acts){
      if(!acts||!acts.length)return;
      var conf={};
      acts.forEach(function(a){var ac=a&&a.action;if(ac&&ac.type==="confirm"&&ac.apptId!=null)conf[ac.apptId]=true;});
      if(!Object.keys(conf).length)return;
      setAppts(function(prev){var hit=false;var nx=(prev||[]).map(function(ap){if(ap&&conf[ap.id]&&ap.status!=="confirmed"){hit=true;return Object.assign({},ap,{status:"confirmed",portalConfirmed:true});}return ap;});return hit?nx:prev;});
    }).catch(function(){});
  },20000);
  return function(){clearInterval(iv);};
},[]);
// === WHATSAPP AUTO: eventos + motor diário ===
const waRef=useRef({});
useEffect(function(){waRef.current={appts:appts,pats:pats,recs:recs,budgets:budgets,treats:treats,dents:dents,user:user,waAuto:waAuto,waSent:waSent,waAutoLog:waAutoLog};});
const waPushLog=function(entry){setWaAutoLog(function(prev){return [entry].concat(prev||[]).slice(0,300);});};
const waEvent=function(tipo,info){
try{
var cfg=waAuto||{};if(!cfg.master)return;
var a=info.appt,p=info.pat;if(!a||!p||!p.phone)return;
var d=dents.find(function(x){return x.id===Number(a.dentistId);})||dents[0]||{name:"Diego Affonso"};
var sent=waSent||{};
if(tipo==="confirmacao"&&cfg.confirmacao){
var k="c_"+a.id;if(sent[k])return;
setWaSent(function(prev){var n=Object.assign({},prev);n[k]=today();return n;});
dispararWA("confirmacao_consulta",p.phone,[p.name,d.name,fmt(a.date),a.time]).then(function(r){waPushLog({ts:new Date().toISOString(),tipo:"Confirmação",pat:p.name,fone:p.phone,ok:r.ok,err:r.err||""});});
}
if(tipo==="reagendamento"&&cfg.reagendamento){
var k2="r_"+a.id;if(sent[k2])return;
setWaSent(function(prev){var n=Object.assign({},prev);n[k2]=today();return n;});
var acao=info.st==="missed"?"Faltou":(info.st==="rescheduled"?"Desmarcou":"Cancelou");
dispararWA("falta_cancelamento",p.phone,[p.name,acao,d.name]).then(function(r){waPushLog({ts:new Date().toISOString(),tipo:"Reagendamento",pat:p.name,fone:p.phone,ok:r.ok,err:r.err||""});});
}
}catch(e){}
};
useEffect(function(){
var running=false;
var run=async function(){
if(running)return;running=true;
try{
var D=waRef.current||{};var cfg=D.waAuto||{};var u=D.user;
if(!cfg.master||!u||u.level<2){running=false;return;}
// V205: os envios automaticos DIARIOS (vespera, aniversario, semestral, pos-cirurgia,
// pos-consulta, orcamento) passaram a sair pelo SERVIDOR (Railway) todo dia as 12h,
// com varredura de vespera de hora em hora (13h-20h). O app nao dispara mais esses --
// evita adiantar/duplicar. Os imediatos (confirmacao ao agendar e reagendamento)
// continuam pelo app via waEvent. Para reativar aqui, remova a linha abaixo.
// V215: ORCAMENTO PENDENTE via PLANO DE TRATAMENTO. O disparo do servidor cobre
// apenas a lista "Orcamentos" da ficha (que a clinica nao usa); os orcamentos reais
// sao feitos como planos de tratamento. Este bloco roda no app (nivel 2+, horario
// comercial): plano com status efetivo "Em espera", sem pagamento, criado/enviado
// ha 3+ dias (e no maximo 30, para nao resgatar planos antigos), envia 1x o template
// orcamento_pendente. Dedupe por chave "ot_"+id no waSent.
if(false){ // V217: DESATIVADO. Envio de orcamento pelo app causou duplicidade
// (multi-dispositivo + race do waSent). Sera reimplementado no SERVIDOR (index.js).
try{
var hOrc=new Date().getHours();
if(hOrc>=9&&hOrc<19){
var tOrc=today();
var sentOrc=Object.assign({},D.waSent||{});
var dOfOrc=function(id){return (D.dents||[]).find(function(x){return x.id===Number(id);})||(D.dents||[])[0]||{name:"Diego Affonso"};};
var filaOrc=[];
(D.treats||[]).forEach(function(tr){
if(filaOrc.length>=10)return;
if(!tr||tr.orcEnviado===undefined&&tr.orcStatus===undefined&&!tr.start)return;
var st=tr.orcStatus||"espera";
var pago=(tr.payments||[]).reduce(function(s,pg){return s+(Number(pg.value)||0);},0);
if(st!=="espera"||pago>0)return;
var ref=tr.orcEnviadoAt||tr.start||"";
if(!ref)return;
var dias=Math.floor((new Date(tOrc+"T12:00")-new Date(String(ref).slice(0,10)+"T12:00"))/86400000);
if(!(dias>=3&&dias<=30))return;
var key="ot_"+tr.id;
if(sentOrc[key])return;
var p=(D.pats||[]).find(function(x){return x.id===tr.patientId;});
if(!p||!p.phone)return;
var d=dOfOrc(tr.dentistId);
sentOrc[key]=tOrc;
filaOrc.push({key:key,fone:p.phone,params:[p.name,d.name],patName:p.name});
});
if(filaOrc.length){
setWaSent(function(prev){var n=Object.assign({},prev);filaOrc.forEach(function(j){n[j.key]=tOrc;});return n;});
for(var iOrc=0;iOrc<filaOrc.length;iOrc++){
var jOrc=filaOrc[iOrc];
var rOrc=await dispararWA("orcamento_pendente",jOrc.fone,jOrc.params);
waPushLog({ts:new Date().toISOString(),tipo:"Or\u00e7amento",pat:jOrc.patName,fone:jOrc.fone,ok:rOrc.ok,err:rOrc.err||""});
await new Promise(function(res){setTimeout(res,1300);});
}
}
}
}catch(eOrc){}
}
running=false;return;
var h=new Date().getHours();
if(h<8||h>=19){running=false;return;}
var t=today();
var sent=Object.assign({},D.waSent||{});
// limpeza de chaves antigas
var keep={};var purged=false;
Object.keys(sent).forEach(function(k){
var ds=sent[k];var days=Math.floor((new Date(t+"T12:00")-new Date(ds+"T12:00"))/86400000);
var max=k.slice(0,3)==="ps_"?190:(k.slice(0,2)==="a_"?400:(k.slice(0,2)==="s_"?200:120));
if(days<=max)keep[k]=ds;else purged=true;
});
if(purged){sent=keep;setWaSent(keep);}
var logHoje={};(D.waAutoLog||[]).forEach(function(l){if((l.ts||"").slice(0,10)===t)logHoje[l.tipo]=(logHoje[l.tipo]||0)+1;});
var fila=[];
var addJob=function(tipoLabel,key,template,fone,params,patName){
if(sent[key])return;
if((logHoje[tipoLabel]||0)>=25)return;
logHoje[tipoLabel]=(logHoje[tipoLabel]||0)+1;
sent[key]=t;
fila.push({tipoLabel:tipoLabel,key:key,template:template,fone:fone,params:params,patName:patName});
};
var dOf=function(id){return (D.dents||[]).find(function(x){return x.id===Number(id);})||(D.dents||[])[0]||{name:"Diego Affonso"};};
if(cfg.vespera){
var tm=tom();
(D.appts||[]).forEach(function(a){
if(a.date!==tm||a.blocked)return;
if(a.status!=="pending"&&a.status!=="confirmed")return;
var p=(D.pats||[]).find(function(x){return x.id===a.patientId;});if(!p||!p.phone)return;
var d=dOf(a.dentistId);
addJob("Véspera","v_"+a.id+"_"+a.date,"lembrete_vespera",p.phone,[p.name,fmt(a.date),a.time,d.name],p.name);
});
}
if(cfg.aniversario){
var ano=t.slice(0,4);
(D.pats||[]).forEach(function(p){
if(!p.dob||p.dob.slice(5)!==t.slice(5))return;
if(!p.phone)return;
addJob("Aniversário","a_"+p.id+"_"+ano,"aniversario_paciente",p.phone,[p.name],p.name);
});
}
if(cfg.semestral){
(D.pats||[]).forEach(function(p){
if(!p.phone)return;
var last=(D.recs||[]).filter(function(r){return r.patientId===p.id&&r.paid>0;}).sort(function(a,b){return b.date.localeCompare(a.date);})[0];
if(!last)return;
if(retDue(p,last.date)>t)return;
var fut=(D.appts||[]).find(function(a){return a.patientId===p.id&&a.date>=t&&a.status!=="cancelled"&&a.status!=="missed";});
if(fut)return;
var d=dOf(last.dentistId);
addJob("Semestral","s_"+p.id,"controle_semestral",p.phone,[p.name,d.name],p.name);
});
}
if(cfg.poscirurgia||cfg.posconsulta){
var y=yest();
(D.appts||[]).forEach(function(a){
if(a.date!==y||a.blocked)return;
var okSt=a.status==="done"||a.status==="confirmed";
if(!okSt)return;
var p=(D.pats||[]).find(function(x){return x.id===a.patientId;});if(!p||!p.phone)return;
var isCir=PCIR_WA.some(function(w){return (a.procedure||"").toLowerCase().indexOf(w)>=0;});
var d=dOf(a.dentistId);
if(isCir&&cfg.poscirurgia)addJob("Pós-cirurgia","pc_"+a.id,"pos__procedimento_",p.phone,[p.name,d.name,a.procedure||"procedimento"],p.name);
else if(!isCir&&cfg.posconsulta&&a.status==="done"){var psk="ps_"+p.id;var psLast=sent[psk];var psDias=psLast?Math.floor((new Date(t+"T12:00")-new Date(psLast+"T12:00"))/86400000):99999;if(psDias>=180){if(psLast)delete sent[psk];addJob("Pós-consulta",psk,"pos__consulta",p.phone,[p.name,d.name],p.name);}}
});
}
if(cfg.orcamento){
var lim=new Date(t+"T12:00");lim.setDate(lim.getDate()-3);
var limS=lim.toISOString().split("T")[0];
(D.budgets||[]).forEach(function(b){
if(b.status!=="pending")return;
if((b.date||"")>limS)return;
var p=(D.pats||[]).find(function(x){return x.id===b.patientId;});if(!p||!p.phone)return;
var d=dOf(b.dentistId);
addJob("Orçamento","o_"+b.id,"orcamento_pendente",p.phone,[p.name,d.name],p.name);
});
}
if(fila.length){
setWaSent(function(prev){var n=Object.assign({},prev);fila.forEach(function(j){n[j.key]=t;});return n;});
for(var i=0;i<fila.length;i++){
var j=fila[i];
var r=await dispararWA(j.template,j.fone,j.params);
waPushLog({ts:new Date().toISOString(),tipo:j.tipoLabel,pat:j.patName,fone:j.fone,ok:r.ok,err:r.err||""});
await new Promise(function(res){setTimeout(res,1300);});
}
}
}catch(e){}
running=false;
};
var t0=setTimeout(run,45000+Math.floor(Math.random()*90000));
var iv=setInterval(run,10*60*1000);
return function(){clearTimeout(t0);clearInterval(iv);};
},[]);

if(!user)return <Login users={users} onLogin={u=>{setUser(u);setView(u.level>=3?"dash":"agenda");}}/>

// Bloqueio de horário de acesso para nível 2 (Recepção/Secretária) - configurável em Administrativo > Acessos
if(user.level===2){
  var _ac=acessoCfg||{};
  if(_ac.restringir!==false){
    var _now=new Date();
    var _dow=_now.getDay();
    var _hm=_now.getHours()*60+_now.getMinutes();
    var _toMin=function(s){var p=String(s||"0:0").split(":");return (Number(p[0])||0)*60+(Number(p[1])||0);};
    var _janela=function(d){
      if(d>=1&&d<=5)return {on:true,ini:_ac.segIni||"07:00",fim:_ac.segFim||"21:00"};
      if(d===6)return {on:true,ini:_ac.sabIni||"07:00",fim:_ac.sabFim||"13:00"};
      if(d===0)return _ac.domOn?{on:true,ini:_ac.domIni||"08:00",fim:_ac.domFim||"12:00"}:{on:false};
      return {on:false};
    };
    var _j=_janela(_dow);
    var _dentro=_j.on&&_hm>=_toMin(_j.ini)&&_hm<_toMin(_j.fim);
    if(!_dentro){
      var _DIAS=["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
      var _prox="em breve";
      for(var _i=0;_i<8;_i++){
        var _d=(_dow+_i)%7;var _w=_janela(_d);if(!_w.on)continue;
        var _wi=_toMin(_w.ini);
        if(_i===0){ if(_hm<_wi){_prox="hoje às "+(_w.ini);break;} continue; }
        _prox=(_i===1?"amanhã":_DIAS[_d])+" às "+(_w.ini);break;
      }
      return(
        <div style={{minHeight:"100vh",background:"linear-gradient(160deg,var(--primary),#0a2e1e)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"rgba(255,255,255,.08)",borderRadius:20,padding:"36px 28px",maxWidth:360,width:"100%",textAlign:"center",border:"1px solid rgba(255,255,255,.12)"}}>
            <div style={{fontSize:52,marginBottom:16}}>🔒</div>
            <div style={{fontFamily:"'Cormorant Garamond'",fontSize:26,color:"#fff",marginBottom:8}}>Fora do Horário</div>
            <div style={{fontSize:14,color:"rgba(255,255,255,.7)",marginBottom:20,lineHeight:1.6}}>
              O sistema está disponível:<br/>
              <strong style={{color:"#fff"}}>Seg–Sex: {_ac.segIni||"07:00"} às {_ac.segFim||"21:00"}</strong><br/>
              <strong style={{color:"#fff"}}>Sábado: {_ac.sabIni||"07:00"} às {_ac.sabFim||"13:00"}</strong>
              {_ac.domOn?<span><br/><strong style={{color:"#fff"}}>Domingo: {_ac.domIni||"08:00"} às {_ac.domFim||"12:00"}</strong></span>:null}
            </div>
            <div style={{background:"rgba(255,255,255,.1)",borderRadius:10,padding:"10px 16px",fontSize:13,color:"rgba(255,255,255,.6)",marginBottom:24}}>
              Próximo acesso: <strong style={{color:"#fff"}}>{_prox}</strong>
            </div>
            <button onClick={()=>(__signOut(),setUser(null))} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.2)",borderRadius:10,padding:"10px 24px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>
              🚪 Sair
            </button>
          </div>
        </div>
      );
    }
  }
};

const remBadge=(user.level===1)
?rems.filter(r=>!r.done&&(r.assignedUserId===user.id||!r.assignedUserId)&&r.date<=today()).length
:rems.filter(r=>!r.done&&r.date<=today()).length+autoActionableCount(pats,recs,appts,pacsTicks,semTicks,user);
const prosBadge=pros.filter(p=>p.due===today()&&p.status==="waiting").length;

const ALL_NAV=[
// Rotina
{id:"dash",l:"Visão Geral",ic:"ph-house",lv:3,grp:"Rotina"},{id:"agenda",l:"Agenda",ic:"ph-calendar-blank",lv:1,grp:"Rotina"},{id:"pacs",l:"Pacientes",ic:"ph-users",lv:1,grp:"Rotina"},
{id:"lems",l:"Lembretes",ic:"ph-bell",lv:1,b:remBadge,grp:"Rotina"},{id:"conversas",l:"Conversas",ic:"ph-chat-circle",lv:2,b:waUnread,grp:"Rotina"},{id:"remarcar",l:"Remarcar",ic:"ph-arrows-clockwise",lv:2,grp:"Rotina"},
{id:"satisf",l:"Satisfação",ic:"ph-smiley",lv:2,grp:"Rotina"},{id:"rec",l:"Receituário",ic:"ph-clipboard-text",lv:1,grp:"Rotina"},{id:"orient",l:"Orientações",ic:"ph-book-open",lv:1,grp:"Rotina"},{id:"ponto",l:"Ponto",ic:"ph-clock",lv:1,grp:"Rotina"},
// Clínico
{id:"pros",l:"Próteses",ic:"ph-first-aid-kit",lv:2,b:prosBadge,grp:"Clínico"},{id:"impl",l:"Implantes",ic:"ph-syringe",lv:2,grp:"Clínico"},{id:"stk",l:"Estoque",ic:"ph-package",lv:2,grp:"Clínico"},
// Financeiro
{id:"caixa",l:"Caixa",ic:"ph-cash-register",lv:2,grp:"Financeiro"},{id:"fin",l:"Financeiro",ic:"ph-wallet",lv:3,grp:"Financeiro"},{id:"pixdent",l:"Pix Dentistas",ic:"ph-hand-coins",lv:1,grp:"Financeiro"},{id:"pdent",l:"Recebimentos",ic:"ph-currency-dollar",lv:1,grp:"Financeiro"},{id:"desp",l:"Gastos",ic:"ph-receipt",lv:3,grp:"Financeiro"},
// Gestão
{id:"rel",l:"Relatórios",ic:"ph-chart-bar",lv:2,grp:"Gestão"},{id:"audit",l:"Auditoria",ic:"ph-magnifying-glass",lv:3,grp:"Gestão"},{id:"adm",l:"Administrativo",ic:"ph-gear",lv:3,grp:"Gestão"},
];
const NAV=ALL_NAV.filter(n=>n.lv<=user.level);
const go=v=>{
const n=ALL_NAV.find(x=>x.id===v)||{lv:1};
if(n.lv>user.level){alert("Acesso não autorizado.");return;}
setView(v);
setSideOpen(false); // close menu on mobile after navigation
};
const cp={pats,dents,procs,user,espera:espera,waEvent:waEvent,addLog:function(tipo,desc,pat){mkLog(logs,setLogs,user,tipo,desc,pat);}};

// Bottom nav shortcuts (most used)
const BOTTOM_NAV=user.level>=3
?[{id:"dash",icon:"ph-house"},{id:"agenda",icon:"ph-calendar-blank"},{id:"pacs",icon:"ph-users"},{id:"pixdent",icon:"ph-hand-coins"},{id:"adm",icon:"ph-gear"},{id:"ponto",icon:"ph-clock"}]
:user.level===2
?[{id:"agenda",icon:"ph-calendar-blank"},{id:"pacs",icon:"ph-users"},{id:"pixdent",icon:"ph-hand-coins"},{id:"lems",icon:"ph-bell",b:remBadge},{id:"rel",icon:"ph-chart-bar"},{id:"ponto",icon:"ph-clock"}]
:[{id:"agenda",icon:"ph-calendar-blank"},{id:"pacs",icon:"ph-users"},{id:"pixdent",icon:"ph-hand-coins"},{id:"lems",icon:"ph-bell",b:remBadge},{id:"rec",icon:"ph-clipboard-text"},{id:"ponto",icon:"ph-clock"}];

const RESPONSIVE_CSS=`@media(min-width:640px){.sidebar-overlay{display:none!important;}.sidebar{position:relative!important;transform:none!important;width:195px!important;flex-shrink:0;}.bottom-nav{display:none!important;}.main-content{padding-bottom:16px!important;}.mobile-topbar{display:none!important;}}@media(max-width:639px){.sidebar{position:fixed!important;top:0!important;left:0!important;height:100vh!important;z-index:500!important;width:240px!important;transition:transform .25s ease!important;}.sidebar.closed{transform:translateX(-100%)!important;}.main-content{padding-bottom:70px!important;}}.sidebar-scroll::-webkit-scrollbar{width:6px;}.sidebar-scroll::-webkit-scrollbar-thumb{background:var(--nm-dark);border-radius:4px;}.sidebar-scroll::-webkit-scrollbar-track{background:transparent;}/* V221: barra de rolagem do painel principal (Agenda e demais telas) mais visivel */:root{--sb-thumb:#2f5d49;--sb-thumb-hover:#244639;--sb-track:#dfe4db;}html[data-theme="dark"]{--sb-thumb:#e7ece7;--sb-thumb-hover:#ffffff;--sb-track:#333c37;}.main-content{scrollbar-color:var(--sb-thumb) var(--sb-track);}.main-content::-webkit-scrollbar{width:14px;}.main-content::-webkit-scrollbar-track{background:var(--sb-track);}.main-content::-webkit-scrollbar-thumb{background:var(--sb-thumb);border-radius:8px;border:2px solid var(--sb-track);background-clip:padding-box;}.main-content::-webkit-scrollbar-thumb:hover{background:var(--sb-thumb-hover);}.app-shell{height:100dvh!important;}`;

return <>

<style>{CSS+RESPONSIVE_CSS}</style>

{saveStatus!=="idle"&&<div style={{position:"fixed",bottom:80,right:16,zIndex:9999,borderRadius:12,padding:"8px 14px",fontSize:12,fontWeight:700,boxShadow:"0 2px 8px rgba(0,0,0,.15)",background:saveStatus==="saved"?"var(--green-soft)":saveStatus==="error"?"var(--red-soft)":"var(--amber-soft)",color:saveStatus==="saved"?"#2E7D32":saveStatus==="error"?"#C62828":"#E65100",border:"1.5px solid "+(saveStatus==="saved"?"#A5D6A7":saveStatus==="error"?"#EF9A9A":"#E65100")}}>{saveStatus==="saving"?"💾 Salvando... aguarde":saveStatus==="saved"?"✅ Dados salvos!":"❌ Erro ao salvar"}</div>}
{/* Overlay for mobile sidebar */}
{sideOpen&&<div className="sidebar-overlay" onClick={()=>setSideOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.18)",zIndex:499}}/>}

<div className="app-shell" style={{display:"flex",height:"100vh",overflow:"hidden",background:"var(--bg)"}}>
  {/* Sidebar */}
  <div className={`sidebar${sideOpen?"":" closed"}`} style={{background:"var(--surface)",borderRight:"none",borderRadius:"0 18px 18px 0",boxShadow:"inset -9px 0 18px -12px var(--nm-dark)",display:"flex",flexDirection:"column",padding:"14px 10px",gap:2,flexShrink:0}}>
    {/* Header with close button on mobile */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"6px 4px 14px",flexShrink:0}}>
      <div>
        <div style={{fontFamily:"'Cormorant Garamond'",fontSize:19,color:"var(--text)",lineHeight:1.2,fontWeight:700,display:"flex",alignItems:"center",gap:7}}><i className="ph-fill ph-tooth" style={{color:"var(--primary)",fontSize:20}}></i>Affonso</div>
        <div style={{fontFamily:"'Cormorant Garamond'",fontSize:12,color:"var(--muted)"}}>Dr. Diego Affonso</div>
      </div>
      <button onClick={()=>setSideOpen(false)} style={{border:"none",background:"var(--surface)",boxShadow:"3px 3px 7px var(--nm-dark),-3px -3px 7px var(--nm-light)",borderRadius:8,color:"var(--text)",fontSize:15,cursor:"pointer",padding:"5px 9px",lineHeight:1}} className="sidebar-close-btn"><i className="ph ph-x"></i></button>
    </div>
    <div className="sidebar-scroll" style={{flex:1,overflowY:"auto",minHeight:0,display:"flex",flexDirection:"column",gap:2}}>
    {NAV.map((n,i)=>[
      (i===0||NAV[i-1].grp!==n.grp)&&n.grp?<div key={"grp_"+n.grp} style={{fontSize:10,fontWeight:700,letterSpacing:".6px",textTransform:"uppercase",color:"var(--muted)",padding:i===0?"2px 8px 4px 6px":"12px 8px 4px 6px",display:"flex",alignItems:"center",gap:7}}><span style={{width:4,height:4,borderRadius:"50%",background:"var(--primary)",opacity:.55,flexShrink:0}}></span>{n.grp}<span style={{flex:1,height:1,background:"var(--border)"}}></span></div>:null,
      <button key={n.id} onClick={()=>go(n.id)} style={{background:"var(--surface)",boxShadow:view===n.id?"inset 4px 4px 9px var(--nm-dark),inset -4px -4px 9px var(--nm-light)":"none",border:"none",borderRadius:11,padding:"10px 12px",cursor:"pointer",color:view===n.id?"var(--primary)":"var(--text)",fontFamily:"'Manrope'",fontWeight:view===n.id?700:600,fontSize:12.5,display:"flex",alignItems:"center",gap:10,textAlign:"left",transition:"box-shadow .15s"}}>
      <i className={(view===n.id?"ph-fill ":"ph-light ")+n.ic} style={{fontSize:17,color:view===n.id?"var(--primary)":"var(--text)"}}></i><span style={{flex:1}}>{n.l}</span>
      {n.b>0&&<span style={{background:G.red,color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:9,fontWeight:700}}>{n.b}</span>}
    </button>
    ])}
    </div>
    <div style={{flexShrink:0,borderTop:"1px solid var(--border)",paddingTop:10,marginTop:6}}>
      <div style={{fontSize:10,color:"var(--muted)",marginBottom:4,paddingLeft:3}}>{user.name}</div>
      <div style={{fontSize:9,color:"var(--muted)",paddingLeft:3,marginBottom:6}}>{["","Básico","Intermediário","Total"][user.level]}</div><div style={{display:"flex",gap:4,background:"var(--bg)",borderRadius:10,padding:3,marginTop:8,marginBottom:8,boxShadow:"inset 2px 2px 5px var(--nm-dark),inset -2px -2px 5px var(--nm-light)"}}>{[["light","ph-sun","Claro"],["dark","ph-moon","Escuro"]].map(function(o){var tv=o[0],ic=o[1],tl=o[2];var on=theme===tv;return <button key={tv} onClick={function(){setTheme(tv);}} style={{flex:1,border:"none",cursor:"pointer",borderRadius:8,padding:"7px 4px",fontSize:10.5,fontFamily:"'Manrope'",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:5,color:on?"var(--primary)":"var(--muted)",background:on?"var(--card)":"transparent",boxShadow:on?"2px 2px 5px var(--nm-dark),-2px -2px 5px var(--nm-light)":"none",transition:"all .15s"}}><i className={(on?"ph-fill ":"ph-light ")+ic} style={{fontSize:14,color:on?"var(--primary)":"var(--muted)"}}></i>{tl}</button>;})}</div>
      <button onClick={()=>(__signOut(),setUser(null))} style={{border:"none",background:"var(--surface)",boxShadow:"3px 3px 7px var(--nm-dark),-3px -3px 7px var(--nm-light)",borderRadius:9,padding:"8px 12px",color:"var(--text)",fontSize:11.5,fontWeight:600,cursor:"pointer",width:"100%",textAlign:"left",display:"flex",alignItems:"center",gap:8}}><i className="ph-light ph-sign-out"></i>Sair</button>
    </div>
  </div>

{/* Main content */}

  <div className="main-content" style={{flex:1,overflowY:"auto",minWidth:0,background:"var(--bg)"}}>
    {/* Mobile top bar */}
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:"var(--surface)",position:"sticky",top:0,zIndex:100,boxShadow:"0 7px 14px -9px var(--nm-dark),inset 0 -1px 0 var(--border)"}} className="mobile-topbar">
      <button onClick={()=>setSideOpen(true)} style={{border:"none",background:"var(--accent)",boxShadow:"3px 3px 7px var(--nm-dark),-3px -3px 7px var(--nm-light)",borderRadius:9,color:"var(--primary)",fontSize:18,cursor:"pointer",padding:"7px 11px",lineHeight:1,flexShrink:0}}><i className="ph-bold ph-list"></i></button>
      <div style={{flex:1,fontFamily:"'Cormorant Garamond'",fontSize:17,color:"var(--text)",fontWeight:700}}>
        {NAV.find(n=>n.id===view)?.l||"Visão Geral"}
      </div>
      {user.level>=2&&waUnread>0&&<button onClick={()=>go("conversas")} style={{background:"#25D366",color:"#fff",border:"none",borderRadius:10,padding:"3px 9px",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:3,flexShrink:0}}><i className="ph-fill ph-whatsapp-logo"></i> {waUnread}</button>}
      {remBadge>0&&<span style={{background:G.red,color:"#fff",borderRadius:10,padding:"2px 8px",fontSize:10,fontWeight:700}}>{remBadge}</span>}
    </div>
    <div style={{padding:"16px",paddingTop:view==="agenda"?"84px":"16px"}}>
      {view==="dash"&&user.level>=3&&<Dashboard appts={appts} pats={pats} recs={recs} rems={rems} pros={pros} dents={dents} setView={go} user={user} gastos={gastos} stock={stock} labs={labs} pacsTicks={pacsTicks} setPacsTicks={setPacsTicks} espera={espera} waSent={waSent}/>}
      {view==="agenda"&&<Agenda appts={appts} setAppts={setAppts} {...cp} setPats={setPats} recs={recs} setRecs={setRecs} treats={treats} setTreats={setTreats} budgets={budgets} setBudgets={setBudgets} logs={logs} agendaSelDate={agendaSelDate} setAgendaSelDate={setAgendaSelDate}/>}
      {view==="pacs"&&<Pacientes pats={pats} setPats={setPats} recs={recs} setRecs={setRecs} treats={treats} setTreats={setTreats} budgets={budgets} setBudgets={setBudgets} appts={appts} dents={dents} procs={procs} user={user} addLog={function(tipo,desc,pat){mkLog(logs,setLogs,user,tipo,desc,pat);}} delPat={delPatServer}/>}
      {view==="pros"&&<Proteses pros={pros} setPros={setPros} pats={pats} dents={dents} labs={labs} prosProcs={prosProcs} setProsProcs={setProsProcs} user={user}/>}
      {view==="impl"&&<Implantes impl={impl} setImpl={setImpl} pats={pats} appts={appts}/>}
      {view==="lems"&&<Lembretes rems={rems} setRems={setRems} recs={recs} appts={appts} users={users} pats={pats} espera={espera} setEspera={setEspera} dents={dents} user={user} semTicks={semTicks} setSemTicks={setSemTicks} anivTicks={anivTicks} setAnivTicks={setAnivTicks} pacsTicks={pacsTicks} setPacsTicks={setPacsTicks} waSent={waSent}/>}
      {view==="remarcar"&&<RemarcarView appts={appts} setAppts={setAppts} pats={pats} dents={dents} remarcar={remarcar} setRemarcar={setRemarcar} abrirFicha={abrirFicha}/>}
      {view==="conversas"&&<Conversas pats={pats} user={user} waSeenRef={waSeenRef} onSeen={function(maxId){if(maxId>(waSeenRef.current||0)){waSeenRef.current=maxId;try{localStorage.setItem("waSeenId",String(maxId));}catch(e){}}setWaUnread(0);}} abrirFicha={abrirFicha}/>}
      {view==="satisf"&&<Satisfacao pats={pats} user={user} pacsTicks={pacsTicks} setPacsTicks={setPacsTicks} abrirFicha={abrirFicha}/>}
      {view==="fin"&&<Financeiro recs={recs} setRecs={setRecs} pats={pats} dents={dents} expenses={expenses} gastos={gastos} treats={treats} user={user}/>}
      {view==="rel"&&<Relatorios recs={recs} setRecs={setRecs} treats={treats} budgets={budgets} appts={appts} pros={pros} pats={pats} dents={dents} labs={labs} expenses={expenses} gastos={gastos} user={user} waTemplates={waTemplates} setWaTemplates={setWaTemplates} pacsTicks={pacsTicks} setPacsTicks={setPacsTicks} abrirFicha={abrirFicha} waSent={waSent} orcResp={orcResp} setOrcResp={setOrcResp}/>}
      {view==="desp"&&<Gastos gastos={gastos} setGastos={function(v){gastosEditRef.current=Date.now();setGastos(v);}} user={user}/>}
      {view==="caixa"&&<Caixa caixa={caixa} setCaixa={setCaixa} user={user}/>}
      {view==="stk"&&<Estoque stock={stock} setStock={setStock} implCat={implCat} setImplCat={setImplCat} implMov={implMov} setImplMov={setImplMov} pats={pats} dents={dents} addLog={cp.addLog} user={user}/>}
      {view==="pixdent"&&<PixDentistas recs={recs} setRecs={setRecs} dents={dents} pats={pats} user={user}/>}
      {view==="pdent"&&<PainelDentista pats={pats} dents={dents} treats={treats} setTreats={setTreats} user={user}/>}
    {view==="rec"&&<Receituario pats={pats} dents={dents} user={user}/>}
    {view==="ponto"&&<Ponto pontos={pontos} setPontos={setPontos} pontoCfg={pontoCfg} setPontoCfg={setPontoCfg} user={user} users={users}/>}
    {view==="orient"&&<Orientacoes pats={pats} orientacoes={orientacoes} setOrientacoes={function(v){orientDirtyRef.current=true;setOrientacoes(v);}} user={user}/>}
    {view==="audit"&&<Auditoria pats={pats} appts={appts} recs={recs} treats={treats} setTreats={setTreats} pros={pros} espera={espera} stock={stock} implCat={implCat} implMov={implMov} rems={rems} users={users} dents={dents} pacsTicks={pacsTicks} waSent={waSent} remarcar={remarcar} setView={go} user={user} auditDismiss={auditDismiss} setAuditDismiss={setAuditDismiss}/>}
    {view==="adm"&&<Admin users={users} setUsers={setUsers} procs={procs} setProcs={setProcs} dents={dents} setDents={setDents} labs={labs} setLabs={setLabs} perms={perms} setPerms={setPerms} logs={logs} setLogs={setLogs} user={user} pats={pats} setPats={setPats} appts={appts} setAppts={setAppts} recs={recs} setRecs={setRecs} treats={treats} setTreats={setTreats} budgets={budgets} setBudgets={setBudgets} pros={pros} setPros={setPros} rems={rems} setRems={setRems} stock={stock} setStock={setStock} expenses={expenses} setExpenses={setExpenses} impl={impl} setImpl={setImpl} waAuto={waAuto} setWaAuto={setWaAuto} waAutoLog={waAutoLog} acessoCfg={acessoCfg} setAcessoCfg={setAcessoCfg}/>}
    </div>
  </div>
</div>

{view==="agenda"&&(function(){
  var d=new Date((agendaSelDate||today())+"T12:00");
  var dias=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
  var meses=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return <div style={{position:"fixed",top:48,left:0,right:0,background:"#164436",color:"rgba(255,255,255,.92)",padding:"5px 16px",fontSize:12,fontWeight:700,textAlign:"center",zIndex:98,boxShadow:"0 2px 6px rgba(0,0,0,.2)"}}>
    {"📅 "+dias[d.getDay()]+", "+d.getDate()+" de "+meses[d.getMonth()]+" · "+d.getFullYear()}
  </div>;
})()}

{/* Bottom navigation bar - mobile only */}

<div className="bottom-nav" style={{position:"fixed",bottom:0,left:0,right:0,background:"var(--surface)",borderTop:`1.5px solid ${G.border}`,display:"flex",zIndex:400,boxShadow:"0 -6px 14px -8px var(--nm-dark)"}}>
  {BOTTOM_NAV.map(n=>{
    if(n.id==="menu")return <button key="menu" onClick={()=>setSideOpen(true)} style={{flex:1,border:"none",background:"transparent",padding:"10px 0 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer",color:G.muted}}>
      <i className="ph-light ph-list" style={{fontSize:21}}></i>
      <span style={{fontSize:9,fontWeight:700}}>Menu</span>
    </button>;
    const active=view===n.id;
    return <button key={n.id} onClick={()=>go(n.id)} style={{flex:1,border:"none",background:"transparent",padding:"10px 0 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer",color:active?G.primary:G.muted,position:"relative"}}>
      {n.b>0&&<span style={{position:"absolute",top:6,right:"18%",background:G.red,color:"#fff",borderRadius:10,padding:"0 4px",fontSize:8,fontWeight:700}}>{n.b}</span>}
      <i className={(active?"ph-fill ":"ph-light ")+n.icon} style={{fontSize:21}}></i>
      <span style={{fontSize:9,fontWeight:700}}>{NAV.find(x=>x.id===n.id)?.l||""}</span>
      {active&&<div style={{position:"absolute",bottom:0,left:"20%",right:"20%",height:3,background:G.primary,borderRadius:"3px 3px 0 0"}}/>}
    </button>;
  })}
</div>

{fichaPat&&<PatientFolder pat={fichaPat} pats={pats} setPats={setPats} recs={recs} setRecs={setRecs} treats={treats} setTreats={setTreats} budgets={budgets} setBudgets={setBudgets} appts={appts} dents={dents} procs={procs} user={user} onClose={function(){setFichaPat(null);}}/>}

</>;
}
