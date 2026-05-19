import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { ref, set, onValue } from "firebase/database";

const API_URL = "https://api.anthropic.com/v1/messages";
const COLORS = ["#FF6B6B","#FFD93D","#6BCB77","#4D96FF","#FF6FC8","#FF9A3C","#A78BFA"];

function Confetti({ active }) {
  const pieces = useRef(Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: COLORS[i % COLORS.length],
    duration: 1.8 + Math.random() * 1.5,
    delay: Math.random() * 0.8,
    size: 6 + Math.random() * 6,
    isCircle: Math.random() > 0.5,
    rotate: Math.random() * 360,
  }))).current;
  if (!active) return null;
  return (
    <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:0 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position:"absolute", left:`${p.left}%`, top:"-10px",
          width:p.size, height:p.size, background:p.color,
          borderRadius:p.isCircle?"50%":"2px",
          transform:`rotate(${p.rotate}deg)`,
          animation:`confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
        }}/>
      ))}
      <style>{`@keyframes confettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(500px) rotate(720deg);opacity:0}}`}</style>
    </div>
  );
}

function LoadingDots() {
  return (
    <div style={{ display:"flex", gap:5, justifyContent:"center", marginTop:16 }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width:7, height:7, borderRadius:"50%", background:"#c9a84c",
          animation:`dotBounce 1.1s ${i*0.18}s infinite ease-in-out`,
        }}/>
      ))}
      <style>{`@keyframes dotBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-9px)}}`}</style>
    </div>
  );
}

const bg = "#1a1510";
const card = "#26211a";
const border = "#3d342a";
const gold = "#c9a84c";
const goldLight = "#e8c76a";
const cream = "#f5ead8";
const muted = "#8a7a68";

const globalStyle = `*{box-sizing:border-box;margin:0;padding:0}::placeholder{color:#5a4e42}textarea:focus{outline:none;border-color:${gold}!important}button:active{transform:scale(0.97)}`;

export default function ElPermitido() {
  const [who, setWho] = useState(null);
  const [votos, setVotos] = useState({ timo: null, gabi: null });
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const checkingRef = useRef(false);
  const matchVersionRef = useRef(0);

  useEffect(() => {
    const votosRef = ref(db, "votos");
    const unsub = onValue(votosRef, (snapshot) => {
      setVotos(snapshot.val() || { timo: null, gabi: null });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const resultRef = ref(db, "result");
    const unsub = onValue(resultRef, (snapshot) => {
      const data = snapshot.val();
      setResult(data || null);
      if (data) checkingRef.current = false;
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (votos.timo && votos.gabi && !result && !checkingRef.current) {
      checkingRef.current = true;
      const version = ++matchVersionRef.current;
      checkMatch(votos.timo, votos.gabi, version);
    }
  }, [votos, result]);

  function selectIdentity(id) {
    setWho(id);
    setError("");
    setInput("");
  }

  function changeIdentity() {
    setWho(null);
    setError("");
    setInput("");
  }

  async function checkMatch(v1, v2, version) {
    setChecking(true);
    setError("");
    try {
      const res = await fetch(API_URL, {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:150,
          messages:[{
            role:"user",
            content:`Sos el árbitro del juego "El Permitido". Dos personas eligieron qué quieren comer hoy. Hay COINCIDENCIA si es la misma categoría o platos similares. Sé generoso: pizza + pizza distinta = coincidencia. Sushi + asado = no coincide.

Pedido de Timo: "${v1}"
Pedido de Gabi: "${v2}"

Respondé SOLO con JSON sin markdown:
{"coincidencia": true, "razon": "frase corta y divertida en español rioplatense"}`
          }]
        })
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.content?.[0]?.text?.replace(/```json|```/g,"").trim() || "";
      const parsed = JSON.parse(text);
      if (matchVersionRef.current !== version) return;
      await set(ref(db, "result"), { match: parsed.coincidencia, reason: parsed.razon, voto1: v1, voto2: v2 });
    } catch(e) {
      setError("Error consultando la IA: " + e.message);
      checkingRef.current = false;
    }
    setChecking(false);
  }

  async function submitVote() {
    const val = input.trim();
    if (!val) { setError("Escribí qué querés comer."); return; }
    setError("");
    await set(ref(db, "votos"), { ...votos, [who]: val });
    setInput("");
  }

  async function clearVote() {
    try {
      matchVersionRef.current++;
      await set(ref(db, "votos"), { ...votos, [who]: null });
      await set(ref(db, "result"), null);
      checkingRef.current = false;
      setError("");
    } catch(e) {
      setError("Error al limpiar voto: " + e.message);
    }
  }

  async function fullReset() {
    try {
      matchVersionRef.current++;
      await set(ref(db, "votos"), { timo: null, gabi: null });
      await set(ref(db, "result"), null);
      checkingRef.current = false;
      setError("");
      setInput("");
    } catch(e) {
      setError("Error al resetear: " + e.message);
    }
  }

  // Pantalla 1: elegir identidad
  if (!who) {
    return (
      <div style={{ fontFamily:"Georgia,'Times New Roman',serif", background:bg, minHeight:"100vh", color:cream, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <style>{globalStyle}</style>
        <div style={{ maxWidth:380, width:"100%", padding:"2rem 1.5rem", textAlign:"center" }}>
          <h1 style={{ fontSize:42, fontWeight:"normal", color:cream, letterSpacing:"0.05em", marginBottom:8 }}>
            El Permitido
          </h1>
          <p style={{ fontSize:13, color:muted, marginBottom:"3.5rem", fontStyle:"italic" }}>
            Si coinciden, se lo merecen
          </p>
          <p style={{ fontSize:14, color:muted, marginBottom:"1.25rem" }}>¿Quién sos?</p>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <button onClick={() => selectIdentity("timo")} style={{
              padding:18, background:gold, color:"#1a1510",
              border:"none", borderRadius:12, fontSize:18,
              fontFamily:"Georgia,serif", cursor:"pointer", fontWeight:600,
              letterSpacing:"0.03em",
            }}>Soy Timo</button>
            <button onClick={() => selectIdentity("gabi")} style={{
              padding:18, background:"transparent", color:cream,
              border:`1.5px solid ${border}`, borderRadius:12, fontSize:18,
              fontFamily:"Georgia,serif", cursor:"pointer",
            }}>Soy Gabi</button>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla 2: votar
  const myVote = votos[who];
  const otherWho = who === "timo" ? "gabi" : "timo";
  const otherVote = votos[otherWho];
  const otherLabel = otherWho === "timo" ? "Timo" : "Gabi";
  const myLabel = who === "timo" ? "Timo" : "Gabi";

  return (
    <div style={{ fontFamily:"Georgia,'Times New Roman',serif", background:bg, minHeight:"100vh", color:cream }}>
      <style>{globalStyle}</style>

      <div style={{ maxWidth:400, margin:"0 auto", padding:"1.5rem 1rem 3rem" }}>

        <div style={{ textAlign:"center", marginBottom:"2rem" }}>
          <h1 style={{ fontSize:38, fontWeight:"normal", color:cream, letterSpacing:"0.05em" }}>
            El Permitido
          </h1>
          <p style={{ fontSize:13, color:muted, marginTop:6, fontStyle:"italic" }}>
            Si coinciden, se lo merecen
          </p>
          <p style={{ fontSize:12, color:muted, marginTop:10 }}>
            Hola, <strong style={{ color:goldLight }}>{myLabel}</strong>
            {" · "}
            <button onClick={changeIdentity} style={{
              background:"none", border:"none", color:muted, fontSize:12,
              cursor:"pointer", textDecoration:"underline", fontFamily:"inherit", padding:0,
            }}>No soy yo</button>
          </p>
        </div>

        <div style={{ background:card, border:`0.5px solid ${border}`, borderRadius:10, padding:"12px 16px", marginBottom:"1.5rem" }}>
          {[["timo","Timo"],["gabi","Gabi"]].map(([id, label]) => (
            <div key={id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 0" }}>
              <span style={{ fontSize:13, color:muted }}>{label}</span>
              <span style={{ fontSize:12, display:"flex", alignItems:"center", gap:5 }}>
                <span style={{
                  width:7, height:7, borderRadius:"50%", display:"inline-block",
                  background: votos[id] ? "#4ade80" : "#f59e0b",
                  boxShadow: votos[id] ? "0 0 5px #4ade8077" : "none",
                }}/>
                <span style={{ color: votos[id] ? "#4ade80" : "#f59e0b" }}>
                  {votos[id] ? "Ya eligió" : "Esperando..."}
                </span>
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background:"#3d1a1a", border:"0.5px solid #7a3333", borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:13, color:"#f87171" }}>
            {error}
          </div>
        )}

        {result ? (
          <div style={{
            position:"relative",
            background: result.match ? "#152415" : card,
            border: `2px solid ${result.match ? "#4ade80" : border}`,
            borderRadius:16, padding:"2rem 1.5rem",
            textAlign:"center", overflow:"hidden",
          }}>
            <Confetti active={result.match} />
            <div style={{ position:"relative", zIndex:1 }}>
              <div style={{ fontSize:56, marginBottom:12 }}>{result.match ? "🎉" : "🥗"}</div>
              <div style={{ fontSize:22, fontWeight:"normal", marginBottom:10, color: result.match ? "#4ade80" : muted }}>
                {result.match ? "¡HAY COINCIDENCIA!" : "Lo siento, no hay coincidencia :("}
              </div>
              <p style={{ fontSize:14, color: result.match ? "#86efac" : muted, fontStyle:"italic", marginBottom:16 }}>
                {result.reason}
              </p>
              <div style={{ fontSize:12, color:muted, borderTop:`0.5px solid ${border}`, paddingTop:12 }}>
                Timo: <strong style={{color:cream}}>{result.voto1}</strong>
                <span style={{margin:"0 8px"}}>·</span>
                Gabi: <strong style={{color:cream}}>{result.voto2}</strong>
              </div>
            </div>
          </div>

        ) : checking ? (
          <div style={{ background:card, border:`0.5px solid ${border}`, borderRadius:16, padding:"2rem", textAlign:"center" }}>
            <div style={{ fontSize:15, color:cream }}>La IA está deliberando...</div>
            <div style={{ fontSize:13, color:muted, marginTop:6, fontStyle:"italic" }}>¿Habrá match hoy?</div>
            <LoadingDots />
          </div>

        ) : myVote ? (
          <div style={{ background:card, border:`0.5px solid ${border}`, borderRadius:14, padding:"2rem 1.5rem", textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:14 }}>🤫</div>
            <p style={{ fontSize:16, color:cream, marginBottom:8 }}>Ya elegiste tu plato</p>
            <p style={{ fontSize:13, color: otherVote ? "#4ade80" : "#f59e0b" }}>
              {otherVote
                ? `${otherLabel} también eligió. Analizando...`
                : `Esperando a ${otherLabel}...`}
            </p>
            <button onClick={clearVote} style={{
              marginTop:16, padding:"7px 18px", background:"transparent",
              border:`0.5px solid ${border}`, borderRadius:6, color:muted,
              fontSize:12, fontFamily:"inherit", cursor:"pointer",
            }}>Cambiar mi pedido</button>
          </div>

        ) : (
          <div>
            {otherVote && (
              <div style={{ background:"#152415", border:"0.5px solid #2d4a2d", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:13, color:"#86efac", textAlign:"center" }}>
                {otherLabel} ya eligió algo. ¡Cargá el tuyo sin hacer trampa!
              </div>
            )}
            <div style={{ background:card, border:`0.5px solid ${border}`, borderRadius:14, padding:"1.25rem", marginBottom:12 }}>
              <label style={{ fontSize:13, color:muted, display:"block", marginBottom:8, fontStyle:"italic" }}>
                ¿Qué querés comer hoy?
              </label>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); submitVote(); }}}
                placeholder="pizza, sushi, empanadas, asado..."
                style={{
                  width:"100%", border:`0.5px solid ${border}`, borderRadius:8,
                  padding:"10px 12px", fontSize:15, fontFamily:"Georgia,serif",
                  resize:"none", height:80, background:bg, color:cream,
                }}
              />
            </div>
            <button onClick={submitVote} style={{
              width:"100%", padding:14, background:gold, color:"#1a1510",
              border:"none", borderRadius:10, fontSize:16, fontFamily:"Georgia,serif",
              cursor:"pointer", fontWeight:600, letterSpacing:"0.03em",
            }}>
              Cargar mi pedido
            </button>
          </div>
        )}

        <div style={{ textAlign:"center", marginTop:"1.5rem" }}>
          <button onClick={fullReset} style={{
            padding:"6px 16px", background:"transparent",
            border:`0.5px solid ${border}`, borderRadius:6,
            color:muted, fontSize:12, fontFamily:"inherit", cursor:"pointer",
          }}>Resetear el día</button>
        </div>

      </div>
    </div>
  );
}
