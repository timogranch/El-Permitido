import { useState, useEffect, useRef, useMemo } from "react";
import { db } from "./firebase";
import { ref, set, onValue } from "firebase/database";

const API_URL = "https://api.anthropic.com/v1/messages";

const C = {
  bg:      '#F7F1EA',
  bg2:     '#FCF7F1',
  ink:     '#1F1A14',
  inkSoft: '#56504A',
  inkMute: '#9C9389',
  rule:    '#EADFD2',
  card:    '#FFFFFF',
  coral:   '#E76A47',
  coralLo: '#FBE2D4',
  sage:    '#5B8C7A',
  sageLo:  '#DAE7DD',
  butter:  '#F4C95D',
  rose:    '#C66B7F',
  roseLo:  '#F3DDE2',
};

const sans = `'Outfit', -apple-system, system-ui, sans-serif`;

const globalStyle = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:${C.bg}}
  textarea:focus{outline:none}
  button:active{transform:scale(0.97)}
  ::placeholder{color:${C.inkMute}}
`;

function Avatar({ initial, color, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, color: '#FFF',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 600, fontSize: size * 0.42, letterSpacing: '-0.02em',
      flexShrink: 0,
    }}>{initial}</div>
  );
}

function TopBar({ user, onChangeIdentity }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 14, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 9,
          background: C.coral, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#FFF', fontWeight: 700, fontSize: 15,
        }}>P</div>
        <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em' }}>El Permitido</div>
      </div>
      {user && (
        <button onClick={onChangeIdentity} style={{
          appearance: 'none', cursor: 'pointer', border: 'none',
          display: 'flex', alignItems: 'center', gap: 8,
          background: C.card, padding: '5px 12px 5px 5px', borderRadius: 999,
          boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.04)',
          fontFamily: sans,
        }}>
          <Avatar initial={user[0].toUpperCase()} color={user === 'timo' ? C.coral : C.sage} size={22} />
          <span style={{ fontSize: 12, fontWeight: 500, color: C.ink }}>No soy yo</span>
        </button>
      )}
    </div>
  );
}

function PlayerCard({ name, color, ready }) {
  return (
    <div style={{
      flex: 1, background: C.card, borderRadius: 18,
      padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 1px 0 rgba(0,0,0,0.03), 0 6px 18px -10px rgba(0,0,0,0.1)',
      minWidth: 0,
    }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Avatar initial={name[0]} color={color} size={36} />
        <div style={{
          position: 'absolute', bottom: -2, right: -2,
          width: 14, height: 14, borderRadius: '50%',
          background: ready ? C.sage : C.butter,
          border: `2px solid ${C.card}`,
        }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1 }}>{name}</div>
        <div style={{ fontSize: 11, color: ready ? C.sage : C.inkMute, marginTop: 3 }}>
          {ready ? 'Eligió' : 'Pensando…'}
        </div>
      </div>
    </div>
  );
}

function ResetButton({ onClick }) {
  return (
    <div style={{ marginTop: 'auto', paddingTop: 14, textAlign: 'center', flexShrink: 0 }}>
      <button onClick={onClick} style={{
        appearance: 'none', border: 'none', cursor: 'pointer',
        background: 'transparent', color: C.inkMute, fontSize: 12,
        fontFamily: sans, letterSpacing: '0.02em',
      }}>↺ Resetear el día</button>
    </div>
  );
}

function Confetti({ active }) {
  const pieces = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: [C.coral, C.sage, C.butter, '#E89BBA', '#7BAAD1'][i % 5],
    duration: 1.8 + Math.random() * 1.5,
    delay: Math.random() * 0.8,
    size: 6 + Math.random() * 6,
    isCircle: Math.random() > 0.5,
    rotate: Math.random() * 360,
  })), []);
  if (!active) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.left}%`, top: '-10px',
          width: p.size, height: p.size, background: p.color,
          borderRadius: p.isCircle ? '50%' : '2px',
          transform: `rotate(${p.rotate}deg)`,
          animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
      <style>{`@keyframes confettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(600px) rotate(720deg);opacity:0}}`}</style>
    </div>
  );
}

function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 12 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: '50%', background: C.sage,
          opacity: 0.3 + i * 0.25,
          animation: `dotBounce 1.1s ${i * 0.18}s infinite ease-in-out`,
        }} />
      ))}
      <style>{`@keyframes dotBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-7px)}}`}</style>
    </div>
  );
}

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
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 150,
          messages: [{
            role: "user",
            content: `Sos el árbitro del juego "El Permitido". Dos personas eligieron qué quieren comer hoy. Hay COINCIDENCIA si es la misma categoría o platos similares. Sé generoso: pizza + pizza distinta = coincidencia. Sushi + asado = no coincide.

Pedido de Timo: "${v1}"
Pedido de Gabi: "${v2}"

Respondé SOLO con JSON sin markdown:
{"coincidencia": true, "razon": "frase corta y divertida en español rioplatense"}`
          }],
        }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.content?.[0]?.text?.replace(/```json|```/g, "").trim() || "";
      const parsed = JSON.parse(text);
      if (matchVersionRef.current !== version) return;
      await set(ref(db, "result"), { match: parsed.coincidencia, reason: parsed.razon, voto1: v1, voto2: v2 });
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
      setError("Error al resetear: " + e.message);
    }
  }

  const frame = {
    width: '100%', minHeight: '100vh', background: C.bg,
    fontFamily: sans, color: C.ink,
    padding: '20px 18px 18px',
    display: 'flex', flexDirection: 'column', gap: 0,
    boxSizing: 'border-box', maxWidth: 430, margin: '0 auto',
  };

  // Pantalla 1: elegir identidad
  if (!who) {
    return (
      <div style={{ ...frame, justifyContent: 'flex-start' }}>
        <style>{globalStyle}</style>
        <TopBar />

        <div style={{ marginTop: 2, flexShrink: 0 }}>
          <h1 style={{ margin: 0, fontWeight: 500, fontSize: 32, lineHeight: 1.05, letterSpacing: '-0.035em', color: C.ink }}>
            Antes de pedir,<br />
            <span style={{ fontStyle: 'italic', fontWeight: 400, color: C.coral }}>¿quién sos?</span>
          </h1>
          <p style={{ margin: '12px 0 0', fontSize: 13, color: C.inkSoft, lineHeight: 1.45 }}>
            Si los dos coinciden en qué comer, se ganan el permitido del día.
          </p>
        </div>

        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
          {[['T', 'Soy Timo', 'timo', C.coral, C.coralLo], ['G', 'Soy Gabi', 'gabi', C.sage, C.sageLo]].map(([init, label, id, color, colorLo]) => (
            <button key={id} onClick={() => selectIdentity(id)} style={{
              appearance: 'none', cursor: 'pointer', textAlign: 'left',
              background: C.card, border: 'none', borderRadius: 20,
              padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 10px 24px -12px rgba(0,0,0,0.12)',
              fontFamily: sans,
            }}>
              <Avatar initial={init} color={color} size={40} />
              <div style={{ flex: 1, fontWeight: 600, fontSize: 18, letterSpacing: '-0.01em', color: C.ink }}>{label}</div>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', background: colorLo,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: color, fontSize: 15,
              }}>→</div>
            </button>
          ))}
        </div>

        <div style={{
          marginTop: 'auto', paddingTop: 24, padding: '10px 12px', borderRadius: 12,
          background: C.bg2, border: `1px solid ${C.rule}`,
          display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, marginTop: 24,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 9, background: C.butter + '55',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, flexShrink: 0,
          }}>✶</div>
          <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.35 }}>
            Eligen sin verse. La IA decide si coincidieron.
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
  const myColor = who === "timo" ? C.coral : C.sage;
  const otherColor = who === "timo" ? C.sage : C.coral;

  const bgColor = result
    ? (result.match ? C.coralLo : C.roseLo)
    : C.bg;

  return (
    <div style={{ ...frame, background: bgColor, minHeight: '100vh' }}>
      <style>{globalStyle}</style>
      <TopBar user={who} onChangeIdentity={changeIdentity} />

      {error && (
        <div style={{
          background: C.roseLo, border: `1px solid ${C.rose}44`, borderRadius: 12,
          padding: '10px 14px', marginBottom: 12, fontSize: 13, color: C.rose,
        }}>
          {error}
        </div>
      )}

      {result ? (
        <>
          <div style={{
            position: 'relative', background: C.card, borderRadius: 24,
            padding: '20px 20px 22px', overflow: 'hidden',
            boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 18px 40px -18px rgba(0,0,0,0.22)',
            flexShrink: 0,
          }}>
            <Confetti active={result.match} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'inline-block',
                background: result.match ? C.sageLo : C.roseLo,
                color: result.match ? C.sage : C.rose,
                padding: '3px 10px', borderRadius: 999,
                fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                marginBottom: 8,
              }}>● {result.match ? 'Match' : 'Sin match'}</div>
              <h2 style={{ margin: 0, fontWeight: 500, fontSize: 30, letterSpacing: '-0.035em', lineHeight: 1, color: C.ink }}>
                {result.match ? <>¡Hay<br/>coincidencia!</> : <>Hoy no<br/>coincidieron.</>}
              </h2>
              <p style={{ margin: '8px 0 12px', fontSize: 13, color: C.inkSoft, lineHeight: 1.4, fontStyle: 'italic' }}>
                "{result.reason}"
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {[['T', C.coral, 'Timo', result.voto1], ['G', C.sage, 'Gabi', result.voto2]].map(([init, color, name, dish]) => (
                  <div key={init} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', background: C.bg, borderRadius: 12,
                  }}>
                    <Avatar initial={init} color={color} size={26} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 10, color: C.inkMute }}>{name}</div>
                      <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dish}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center', fontSize: 48, lineHeight: 1 }}>
                {result.match ? '🎉' : '🥲'}
              </div>
            </div>
          </div>
          <ResetButton onClick={fullReset} />
        </>

      ) : checking ? (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexShrink: 0 }}>
            <PlayerCard name="Timo" color={C.coral} ready={!!votos.timo} />
            <PlayerCard name="Gabi" color={C.sage} ready={!!votos.gabi} />
          </div>
          <div style={{
            background: C.card, borderRadius: 24, padding: '30px 22px 24px',
            textAlign: 'center',
            boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 14px 32px -16px rgba(0,0,0,0.14)',
            flexShrink: 0,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: C.coralLo, color: C.coral,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, marginBottom: 12,
            }}>✦</div>
            <h3 style={{ margin: 0, fontWeight: 500, fontSize: 20, letterSpacing: '-0.025em' }}>
              La IA está deliberando…
            </h3>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: C.inkSoft }}>¿Habrá match hoy?</p>
            <LoadingDots />
          </div>
          <ResetButton onClick={fullReset} />
        </>

      ) : myVote ? (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexShrink: 0 }}>
            <PlayerCard name="Timo" color={C.coral} ready={!!votos.timo} />
            <PlayerCard name="Gabi" color={C.sage} ready={!!votos.gabi} />
          </div>
          <div style={{
            background: C.card, borderRadius: 24, padding: '30px 22px 24px',
            textAlign: 'center',
            boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 14px 32px -16px rgba(0,0,0,0.14)',
            flexShrink: 0,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: C.coralLo, color: C.coral,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, marginBottom: 12,
            }}>✓</div>
            <h3 style={{ margin: 0, fontWeight: 500, fontSize: 22, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
              Tu pedido<br />está guardado
            </h3>
            <p style={{ margin: '10px 0 16px', fontSize: 13, color: C.inkSoft, lineHeight: 1.4 }}>
              {otherVote
                ? `${otherLabel} también eligió. La IA decide.`
                : `Cuando ${otherLabel} mande el suyo,\nla IA decide.`}
            </p>
            {!otherVote && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '6px 12px', background: C.bg, borderRadius: 999,
                fontSize: 12, color: C.inkSoft, marginBottom: 16,
              }}>
                <Avatar initial={otherLabel[0]} color={otherColor} size={18} />
                Esperando a {otherLabel}
                <span style={{ display: 'flex', gap: 3, marginLeft: 2 }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: 4, height: 4, borderRadius: '50%', background: C.sage,
                      opacity: 0.3 + i * 0.25,
                    }} />
                  ))}
                </span>
              </div>
            )}
            <div>
              <button onClick={clearVote} style={{
                appearance: 'none', cursor: 'pointer',
                background: 'transparent', color: C.coral,
                border: `1.5px solid ${C.coralLo}`, borderRadius: 999,
                padding: '7px 14px', fontFamily: sans, fontSize: 12, fontWeight: 500,
              }}>Cambiar mi pedido</button>
            </div>
          </div>
          <ResetButton onClick={fullReset} />
        </>

      ) : (
        <>
          <div style={{ marginBottom: 12, flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: myColor, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              Tu turno, {myLabel}
            </div>
            <h2 style={{ margin: 0, fontWeight: 500, fontSize: 26, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
              ¿Qué se te canta<br />esta noche?
            </h2>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexShrink: 0 }}>
            <PlayerCard name="Timo" color={C.coral} ready={!!votos.timo} />
            <PlayerCard name="Gabi" color={C.sage} ready={!!votos.gabi} />
          </div>

          {otherVote && (
            <div style={{
              background: C.sageLo, color: '#2D5446', borderRadius: 14,
              padding: '10px 14px', marginBottom: 12, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', background: C.sage,
                color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600, flexShrink: 0,
              }}>✓</div>
              <span>{otherLabel} ya eligió. Sin espiar.</span>
            </div>
          )}

          <div style={{
            background: C.card, borderRadius: 20, padding: '16px 16px 12px',
            boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 12px 28px -14px rgba(0,0,0,0.12)',
            flexShrink: 0,
          }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitVote(); } }}
              placeholder="pizza, sushi, milanesa con puré…"
              style={{
                width: '100%', border: 'none', resize: 'none',
                minHeight: 90, fontSize: 16, color: C.ink,
                fontWeight: 400, lineHeight: 1.4, fontFamily: sans,
                background: 'transparent',
              }}
            />
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              paddingTop: 10, borderTop: `1px solid ${C.rule}`,
            }}>
              <span style={{ fontSize: 11, color: C.inkMute }}>↵ Enter para enviar</span>
              <button onClick={submitVote} style={{
                appearance: 'none', border: 'none', cursor: 'pointer',
                background: C.coral, color: '#FFF',
                borderRadius: 999, padding: '9px 16px',
                fontFamily: sans, fontWeight: 600, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>Enviar <span style={{ fontSize: 15 }}>→</span></button>
            </div>
          </div>

          <ResetButton onClick={fullReset} />
        </>
      )}
    </div>
  );
}
