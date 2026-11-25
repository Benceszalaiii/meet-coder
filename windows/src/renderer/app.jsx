import { render } from 'preact';
import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'preact/hooks';
import { ICONS } from './icons.js';
import { getVideo, getStream, onStreamChange, startCapture, stopCapture, snapshot } from './capture.js';

const api = window.api;
const act = (name, ...args) => api.act(name, ...args);

const head = (s, n) => { const a = Array.from(s); return a.length > n ? a.slice(0, n).join('') : s; };
const stackLabel = p => {
  const names = { next: 'Next.js', node: 'Express / Node', laravel: 'Laravel', csharp: 'C#' };
  const k = [...new Set(p.services.map(s => s.kind))].sort();
  return k.length === 0 ? 'unknown stack' : k.map(x => names[x] || x).join(' + ');
};

// ---------- primitives ----------

function Icon({ name, size = 12, style, className = '' }) {
  const d = ICONS[name];
  if (!d) return null;
  const s = Math.round(size * 1.15 * 10) / 10;
  return (
    <svg class={'icon ' + className} viewBox="0 0 24 24" width={s} height={s} style={style}
      fill={d.fill ? 'currentColor' : 'none'} stroke="currentColor" stroke-width={d.sw || (d.fill ? 1.5 : 2)}
      stroke-linecap="round" stroke-linejoin="round" dangerouslySetInnerHTML={{ __html: d.body }} />
  );
}

function Card({ title, icon, tint = 'var(--dim)', trailing, children, style, className = '' }) {
  return (
    <div class={'card ' + className} style={style}>
      <div class="card-head">
        <Icon name={icon} size={11} style={{ color: tint }} />
        <span class="card-title">{title}</span>
        <span class="card-spacer" />
        {trailing}
      </div>
      <div class="card-body">{children}</div>
    </div>
  );
}

function Chip({ icon, text, tint = '#fff' }) {
  return (
    <span class="chip">
      <Icon name={icon} size={10.5} style={{ color: tint }} />
      <span>{text}</span>
    </span>
  );
}

function PulseDot({ color, active }) {
  return <span class={'pulse' + (active ? ' active' : '')} style={{ background: color, '--c': color }} />;
}

function Spinner({ size = 'small' }) { return <span class={'spinner ' + size} />; }

function IconButton({ icon, help, onClick }) {
  return <button class="icon-btn" title={help} onClick={onClick}><Icon name={icon} size={12} /></button>;
}

function Menu({ label, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    if (!open) return;
    const close = e => { if (!ref.current || !ref.current.contains(e.target)) setOpen(false); };
    const key = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', key); };
  }, [open]);
  return (
    <div class="menu-wrap" ref={ref}>
      <button onClick={() => setOpen(o => !o)}>{label}</button>
      {open && (
        <div class="popover">
          {items.map((it, i) => it.divider ? <div class="menu-div" key={i} />
            : it.text ? <div class="menu-text" key={i}>{it.text}</div>
            : <button class="menu-item" key={i} onClick={() => { setOpen(false); it.onClick(); }}>{it.label}</button>)}
        </div>
      )}
    </div>
  );
}

/** Single line, ellipsis in the middle (SwiftUI .truncationMode(.middle)). */
function MidText({ text, class: cls = '' }) {
  const ref = useRef();
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chars = Array.from(text);
    el.textContent = text;
    if (el.scrollWidth <= el.clientWidth) return;
    let lo = 0, hi = chars.length;
    const make = k => chars.slice(0, Math.ceil(k / 2)).join('') + '…' + chars.slice(chars.length - Math.floor(k / 2)).join('');
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      el.textContent = make(mid);
      if (el.scrollWidth <= el.clientWidth) lo = mid; else hi = mid - 1;
    }
    el.textContent = make(lo);
  }, [text, w]);
  return <span ref={ref} class={'mid ' + cls} />;
}

// ---------- Dashboard ----------

function Dashboard({ st }) {
  const [compact, setCompact] = useState(() => { try { return localStorage.getItem('compact') === '1'; } catch { return false; } });
  const [showSettings, setShowSettings] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    try { localStorage.setItem('compact', compact ? '1' : '0'); } catch {}
    act('setCompact', compact, !first.current);
    first.current = false;
  }, [compact]);
  return (
    <div class={'dash' + (compact ? ' compact' : '')}>
      <TopBar st={st} compact={compact} setCompact={setCompact} openSettings={() => setShowSettings(true)} />
      {compact ? (
        <div class="compact-stack">
          <StreamCard st={st} style={{ height: '230px', flex: 'none' }} />
          <NowCodingCard st={st} className="fill" />
        </div>
      ) : (
        <div class="main">
          <div class="col col1">
            <StreamCard st={st} className="fill" style={{ minHeight: '250px' }} />
            <NowCodingCard st={st} style={{ height: '250px', flex: 'none' }} />
          </div>
          <div class="col col2">
            <ChangeLogCard st={st} className="fill" />
            <DevCard st={st} style={{ height: 'clamp(260px, calc((100% - 12px) / 2), 360px)', flex: 'none' }} />
          </div>
          <div class="col col3">
            <NotesCard st={st} className="fill" />
          </div>
        </div>
      )}
      <StatusBar st={st} />
      {showSettings && <SettingsSheet st={st} close={() => setShowSettings(false)} />}
    </div>
  );
}

function TopBar({ st, compact, setCompact, openSettings }) {
  const c = st.core;
  const cap = c.capture;
  return (
    <div class="topbar">
      <div class="brand">
        <Icon name="sparkles.rectangle.stack.fill" size={13} style={{ color: 'var(--accent)' }} />
        <span>MeetCoder</span>
      </div>
      <button class={'pill-btn start-btn' + (c.running ? ' running' : '')} onClick={() => act(c.running ? 'stop' : 'start')}>
        <Icon name={c.running ? 'stop.fill' : 'play.fill'} size={10} />
        <span>{c.running ? 'Leállítás' : 'Indítás'}</span>
      </button>

      {!compact && (
        <>
          <Menu
            label={<Chip icon="macwindow" text={cap.active ? head(cap.windowTitle, 34) : 'Ablak kiválasztása'} />}
            items={[
              ...cap.windows.map(w => ({ label: head(w.name, 60), onClick: () => act('switchWindow', w.id) })),
              { divider: true },
              { label: 'Ablaklista frissítése', onClick: () => act('refreshWindows') },
            ]} />
          <Chip icon="person.fill" text={c.presenter || 'Nincs megosztó'} tint={c.presenter ? 'var(--ai)' : 'var(--dim)'} />
        </>
      )}

      <Menu
        label={<Chip icon="folder.fill" text={c.current ? c.current.name : 'Projekt: még nem dőlt el'} tint={c.current ? 'var(--accent)' : 'var(--warn)'} />}
        items={[
          ...c.projects.map(p => ({ label: `${p.name} — ${stackLabel(p)}`, onClick: () => act('setCurrent', p.path) })),
          ...(c.projects.length === 0 ? [{ text: 'Nincs projekt a mappában' }] : []),
          { divider: true },
          { label: 'Projektek újraolvasása', onClick: () => act('rescan') },
        ]} />

      <span class="grow" />

      {!compact && (
        <button class="pill-btn grab-btn" disabled={c.grabbing} onClick={() => act('grab')}>
          {c.grabbing ? <Spinner /> : <Icon name="externaldrive.fill.badge.plus" size={11} />}
          <span>Projektfájlok letöltése (T:)</span>
        </button>
      )}
      <IconButton icon={compact ? 'arrow.up.left.and.arrow.down.right' : 'pip'} help={compact ? 'Teljes nézet' : 'Kompakt nézet'} onClick={() => setCompact(!compact)} />
      <IconButton icon="gearshape.fill" help="Beállítások" onClick={openSettings} />
    </div>
  );
}

// ---------- Stream ----------

function StreamCard({ st, style, className }) {
  const c = st.core;
  const cap = c.capture;
  const vref = useRef();
  useEffect(() => {
    const apply = s => { const v = vref.current; if (v && v.srcObject !== s) { v.srcObject = s; if (s) v.play().catch(() => {}); } };
    apply(getStream());
    return onStreamChange(apply);
  }, [cap.active]);
  const showVideo = cap.active;
  return (
    <Card title="Élő közvetítés" icon="dot.radiowaves.left.and.right" tint={cap.active ? 'var(--del)' : 'var(--dim)'} style={style} className={className}
      trailing={
        <span class="live-badge" style={{ color: cap.active ? 'var(--del)' : 'var(--dim)' }}>
          <PulseDot color="var(--del)" active={cap.active} />
          <span>{cap.active ? 'ÉLŐ' : 'SZÜNET'}</span>
        </span>
      }>
      <div class="stream-box">
        {showVideo ? <video ref={vref} muted autoplay playsinline />
          : (
            <div class={'stream-empty' + (cap.error ? ' err' : '')}>
              <Icon name="rectangle.dashed.badge.record" size={28} style={{ color: 'var(--dim)' }} />
              <span>{cap.error || 'Nyomd meg az Indítás gombot a Meet ablak figyeléséhez.'}</span>
            </div>
          )}
        {c.lastKeptAt && <div class="flash" key={c.lastKeptAt} />}
        {c.analysing && (
          <div class="analysing"><Spinner size="mini" /><span>Sonnet elemez…</span></div>
        )}
      </div>
      <div class="stream-foot">
        <span>{c.framesKept} változás észlelve · {c.framesAnalysed} elemezve</span>
        <span class="card-spacer" />
        <button class="link-btn accent" disabled={!c.running || c.analysing} onClick={() => act('analyseNow')}>Elemzés most</button>
      </div>
    </Card>
  );
}

// ---------- Now coding ----------

function NowCodingCard({ st, style, className }) {
  const c = st.core;
  const [manual, setManual] = useState('');
  const submit = () => { act('submitManual', manual); setManual(''); };
  const a = c.agent;
  return (
    <Card title="Most ezen dolgozunk" icon="hammer.fill" tint={a.active ? 'var(--accent)' : 'var(--dim)'} style={style} className={className}
      trailing={a.active ? <button class="link-btn del" onClick={() => act('stopAgent')}>Megszakítás</button> : null}>
      <div class="area-title" key={c.teacherArea}>
        {c.teacherArea === '' ? (c.current ? 'Várakozás a tanár képernyőjére…' : 'A projekt még nem dőlt el — csak jegyzetelek') : c.teacherArea}
      </div>
      {c.hint && !c.current && (
        <div class="hint"><Icon name="questionmark.folder" size={11.5} /><span>A képernyőn látott projekt: {c.hint}</span></div>
      )}
      <div class="agent-box">
        {a.active ? <Spinner /> : <Icon name="moon.zzz.fill" size={11} style={{ color: 'var(--dim)' }} />}
        <div>
          <span class="t nowrap">{a.active ? a.title : 'Az ügynök tétlen'}</span>
          <MidText text={a.step} class="mono s" />
        </div>
      </div>
      {a.files.length > 0 && (
        <div class="hscroll file-chips">
          {a.files.map(f => <span key={f} class={'file-chip mono' + (f === a.area ? ' area' : '')}>{f}</span>)}
        </div>
      )}
      {c.queued && (
        <div class="queued">
          <span class="lbl"><Icon name="clock" size={11.5} /><span>Sorban: {c.queued.title}</span></span>
          {!a.active && <button class="link-btn accent" style={{ fontSize: '11.5px', fontWeight: 600 }} onClick={() => act('runQueued')}>Futtatás</button>}
        </div>
      )}
      <span class="card-spacer" />
      <div class="manual">
        <input type="text" value={manual} placeholder="Saját utasítás, pl. „valósítsd meg, ami most a képernyőn van”"
          onInput={e => setManual(e.currentTarget.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
        <button onClick={submit} style={{ color: manual === '' ? 'var(--dim)' : 'var(--accent)' }}><Icon name="arrow.up.circle.fill" size={18} /></button>
      </div>
    </Card>
  );
}

// ---------- Change log ----------

function ChangeLogCard({ st, className }) {
  const [expanded, setExpanded] = useState(null);
  const changes = st.changes;
  return (
    <Card title="Változásnapló" icon="list.bullet.rectangle.fill" tint="var(--ai)" className={className}
      trailing={<span class="dim" style={{ fontSize: '11px' }}>{changes.length} módosítás</span>}>
      {changes.length === 0 ? (
        <div class="empty-col">
          <Icon name="wand.and.stars" size={26} style={{ color: 'var(--dim)' }} />
          <span>Itt jelennek meg a módosítások, MI által írt címekkel.</span>
          {st.core.feed[0] && <span class="sub">{st.core.feed[0].text}</span>}
        </div>
      ) : (
        <div class="scroll">
          <div class="rows">
            {changes.map(ch => <ChangeRow key={ch.id} entry={ch} expanded={expanded === ch.id} toggle={() => setExpanded(expanded === ch.id ? null : ch.id)} />)}
          </div>
        </div>
      )}
    </Card>
  );
}

const sumOf = (files, k) => files.reduce((n, f) => n + f[k], 0);

function ChangeRow({ entry, expanded, toggle }) {
  const time = new Date(entry.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return (
    <div class={'row' + (expanded ? ' open' : '')} onClick={toggle}>
      <div class="row-top">
        <Icon name="sparkle" size={10} style={{ color: 'var(--ai)' }} />
        <span class={'h' + (entry.undone ? ' undone' : '')} style={{ color: entry.undone ? 'var(--dim)' : '#fff' }}>{entry.header}</span>
        <span class="time">{time}</span>
      </div>
      <div class="row-meta">
        <span class="proj">{entry.project}</span>
        <span class="dim">{entry.files.length} fájl</span>
        <span class="mono add">+{sumOf(entry.files, 'added')}</span>
        <span class="mono del">−{sumOf(entry.files, 'removed')}</span>
        <span class="card-spacer" />
        {entry.undone
          ? <span style={{ color: 'var(--warn)' }}>visszavonva</span>
          : <button class="link-btn dim" onClick={e => { e.stopPropagation(); act('undo', entry.id); }}>Visszavonás</button>}
        <Icon name="chevron.down" size={10} className={'chev' + (expanded ? ' open' : '')} style={{ color: 'var(--dim)' }} />
      </div>
      {expanded && (
        <>
          {entry.summary !== '' && <div class="row-summary">{entry.summary}</div>}
          <div class="row-files">
            {entry.files.map(f => (
              <div class="row-file" key={f.path}>
                <span class="mono p">{f.path}</span>
                <span class="mono add">+{f.added}</span>
                <span class="mono del">−{f.removed}</span>
              </div>
            ))}
          </div>
          <DiffView diff={entry.diff} />
        </>
      )}
    </div>
  );
}

function DiffView({ diff }) {
  const lines = diff.split('\n').slice(0, 400);
  const color = l => {
    if (l.startsWith('+++') || l.startsWith('---') || l.startsWith('diff ') || l.startsWith('index ')) return 'var(--dim)';
    if (l.startsWith('@@')) return 'var(--ai)';
    if (l.startsWith('+')) return 'var(--add)';
    if (l.startsWith('-')) return 'var(--del)';
    return 'rgba(255,255,255,0.75)';
  };
  return (
    <div class="diff sel mono" onClick={e => e.stopPropagation()}>
      <div class="diff-in">
        {lines.map((l, i) => (
          <div key={i} class={'diff-line' + (l.startsWith('+') && !l.startsWith('+++') ? ' a' : (l.startsWith('-') && !l.startsWith('---') ? ' d' : ''))}
            style={{ color: color(l) }}>{l === '' ? ' ' : l}</div>
        ))}
      </div>
    </div>
  );
}

// ---------- Dev server ----------

function WebPreview({ url, token }) {
  const ref = useRef();
  const last = useRef({ url: null, token: 0 });
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const l = last.current;
    if (l.url !== url) { l.url = url; if (url) v.setAttribute('src', url); }
    else if (l.token !== token) { try { v.reload(); } catch {} }
    l.token = token;
  }, [url, token]);
  return <div class="preview"><webview ref={ref} /></div>;
}

function DevCard({ st, style }) {
  const dev = st.dev;
  const [tab, setTab] = useState(0);
  const logRef = useRef();
  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [dev.lines.length, tab]);
  return (
    <Card title="Fejlesztői szerver" icon="server.rack" tint={dev.running ? 'var(--accent)' : 'var(--dim)'} style={style}
      trailing={
        <div class="dev-head">
          <PulseDot color="var(--accent)" active={dev.running} />
          <span class="mono url">{dev.url || dev.status}</span>
          <span class="seg">
            <button class={tab === 0 ? 'on' : ''} onClick={() => setTab(0)}>Előnézet</button>
            <button class={tab === 1 ? 'on' : ''} onClick={() => setTab(1)}>Kimenet</button>
          </span>
          {st.core.current && (
            <button class="link-btn accent" onClick={() => act('devToggle')}>{dev.running ? 'Leállítás' : 'Indítás'}</button>
          )}
        </div>
      }>
      {tab === 0 ? (
        dev.url ? <WebPreview url={dev.url} token={dev.reloadToken} />
          : (
            <div class="empty-col">
              <Icon name="globe" size={24} style={{ color: 'var(--dim)' }} />
              <span>{!st.core.current ? 'A szerver a projekt felismerése után indul.' : dev.status}</span>
            </div>
          )
      ) : (
        <div class="log sel mono" ref={logRef}>
          <div class="log-in">
            {dev.lines.map((l, i) => <div class="log-line" key={i}>{l === '' ? ' ' : l}</div>)}
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------- Notes ----------

/** Inline markdown only (bold, italic, code, strike, links); everything else is kept as written. */
function inlineMd(line) {
  const re = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|~~[^~]+~~|\*[^*\s][^*]*\*|_[^_\s][^_]*_|\[[^\]]+\]\([^)]+\))/g;
  const out = [];
  let last = 0, m, k = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**') || t.startsWith('__')) out.push(<b key={k++}>{t.slice(2, -2)}</b>);
    else if (t.startsWith('`')) out.push(<code key={k++}>{t.slice(1, -1)}</code>);
    else if (t.startsWith('~~')) out.push(<s key={k++}>{t.slice(2, -2)}</s>);
    else if (t.startsWith('[')) { const mm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(t); out.push(<a key={k++} href={mm[2]}>{mm[1]}</a>); }
    else out.push(<i key={k++}>{t.slice(1, -1)}</i>);
    last = m.index + t.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

function NoteLine({ l }) {
  if (l.startsWith('### ')) return <div class="n-h3">{l.slice(4)}</div>;
  if (l.startsWith('#')) return <div class="n-h">{l.replace(/^[# ]+/, '')}</div>;
  if (l.startsWith('```')) return null;
  if (l.startsWith('    ') || l.startsWith('\t')) return <div class="n-code">{l}</div>;
  return <div class="n-p">{inlineMd(l)}</div>;
}

function NotesCard({ st, className, home }) {
  const { notes, notesFile } = st.notes;
  const lines = notes.split('\n').slice(-200);
  const ref = useRef();
  useEffect(() => { const el = ref.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); }, [notes]);
  const shown = st.home && notesFile.startsWith(st.home) ? '~' + notesFile.slice(st.home.length) : notesFile;
  return (
    <Card title="Jegyzetek" icon="note.text" tint="var(--warn)" className={className}
      trailing={<button class="dim" title="Megnyitás a Fájlkezelőben" onClick={() => act('revealNotes')}><Icon name="arrow.up.forward.square" size={12} /></button>}>
      <div class="mono notes-path"><bdo dir="ltr">{shown}</bdo></div>
      {notes === '' ? (
        <div class="empty-col"><span>A jegyzetek itt frissülnek, ahogy a tanár képernyője változik.</span></div>
      ) : (
        <div class="scroll sel" ref={ref}>
          <div class="note-lines">{lines.map((l, i) => <NoteLine key={i} l={l} />)}</div>
        </div>
      )}
    </Card>
  );
}

// ---------- Status bar ----------

function StatusBar({ st }) {
  const c = st.core;
  const f = c.feed[0];
  return (
    <div class="status">
      <span class="grp"><PulseDot color="var(--accent)" active={c.running} /><span>{c.running ? 'Figyelés aktív' : 'Leállítva'}</span></span>
      <span class="model">Sonnet 5.5 · közepes</span>
      {c.current && <span class="nowrap" style={{ flex: 'none' }}>{stackLabel(c.current)}</span>}
      {f && <span class="feed"><Icon name={f.icon} size={11} /><span>{f.text}</span></span>}
      <span class="card-spacer" />
      <span class={'cost' + (c.capped ? ' capped' : '')} style={{ whiteSpace: 'nowrap' }}>
        {`Költség: $${c.cost.toFixed(2)} / $${Math.round(c.settings.costCap)}`}
      </span>
    </div>
  );
}

// ---------- Settings ----------

function SettingsSheet({ st, close }) {
  const s = st.core.settings;
  const [groups, setGroups] = useState(s.groups.join(', '));
  const [tPath, setTPath] = useState(s.tPath);
  const [root, setRoot] = useState(s.projectsRoot);
  const [interval, setIntervalSec] = useState(s.intervalSec);
  const [cap, setCap] = useState(s.costCap);
  const set = patch => act('setSettings', patch);
  const done = useCallback(() => { act('bootstrap'); close(); }, [close]);
  useEffect(() => {
    const k = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [close]);
  return (
    <div class="overlay" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      <div class="sheet">
        <h1>Beállítások</h1>
        <div class="field">
          <label>T: meghajtó helye</label>
          <input type="text" value={tPath} onInput={e => { setTPath(e.currentTarget.value); set({ tPath: e.currentTarget.value }); }} />
          <span class="hint2">A megosztott tanári meghajtó csatolási pontja.</span>
        </div>
        <div class="field">
          <label>Csoportnevek a T: meghajtón</label>
          <input type="text" value={groups} placeholder="pl. 13A, 13ab, 11A_Web"
            onInput={e => { const v = e.currentTarget.value; setGroups(v); set({ groups: v.split(',').map(x => x.trim()).filter(x => x !== '') }); }} />
          <span class="hint2">Vesszővel elválasztva. A tanár mappájában ezeket a mappaneveket keresem.</span>
        </div>
        <div class="field">
          <label>Projektek mappája</label>
          <input type="text" value={root} onInput={e => { setRoot(e.currentTarget.value); set({ projectsRoot: e.currentTarget.value }); }} />
          <span class="hint2">Ide kerülnek a letöltött projektek és a napi jegyzetek.</span>
        </div>
        <label class="check"><input type="checkbox" checked={s.autoRun} onChange={e => set({ autoRun: e.currentTarget.checked })} />Önálló kódolás (jóváhagyás nélkül)</label>
        <label class="check"><input type="checkbox" checked={s.autoGrab} onChange={e => set({ autoGrab: e.currentTarget.checked })} />Projektfájlok automatikus letöltése, ha a projekt nincs meg</label>
        <div class="slider-row">
          <label>Elemzés gyakorisága</label>
          <input type="range" min="15" max="180" step="15" value={interval} onInput={e => { const v = Number(e.currentTarget.value); setIntervalSec(v); set({ intervalSec: v }); }} />
          <span class="val">{Math.round(interval)} mp</span>
        </div>
        <div class="slider-row">
          <label>Költségkeret alkalmanként</label>
          <input type="range" min="1" max="30" step="1" value={cap} onInput={e => { const v = Number(e.currentTarget.value); setCap(v); set({ costCap: v }); }} />
          <span class="val">{`$${Math.round(cap)}`}</span>
        </div>
        <div class="sheet-foot"><button class="primary" autofocus onClick={done}>Kész</button></div>
      </div>
    </div>
  );
}

// ---------- boot ----------

function App() {
  const [st, setSt] = useState(null);
  useEffect(() => {
    api.onRequest(async (channel, payload) => {
      if (channel === 'capture:start') { await startCapture(); return { ok: true }; }
      if (channel === 'capture:stop') { await stopCapture(); return { ok: true }; }
      if (channel === 'snapshot') return snapshot(payload.oldSig);
      return null;
    });
    api.onState((group, data) => setSt(s => (s ? { ...s, [group]: data } : s)));
    api.init().then(i => setSt(i));
  }, []);
  if (!st) return null;
  return <Dashboard st={st} />;
}

render(<App />, document.getElementById('root'));
