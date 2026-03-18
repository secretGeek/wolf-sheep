import { useEffect, useRef, useState } from 'react'
import { drawWorld } from './render'
import {
  applyModeAtCell,
  CELL,
  CellInspection,
  createEmptyStats,
  createWorld,
  getStats,
  H,
  inspectCell,
  Mode,
  SHEEP_REPRODUCTION_CHANCE,
  SHEEP_REPRODUCTION_ENERGY_TRANSFER,
  Speed,
  tickDelay,
  tickWorld,
  W,
  WOLF_REPRODUCTION_CHANCE,
  WOLF_REPRODUCTION_ENERGY_TRANSFER,
  World,
} from './simulation'

function formatInspection(inspection: CellInspection): string {
  const animalLines = inspection.animals.length === 0
    ? ['animals: none']
    : inspection.animals.map((animal) =>
        `${animal.kind}#${animal.id} state=${animal.state} age=${animal.age} energy=${animal.energy.toFixed(1)} facing=(${animal.facingRow},${animal.facingCol}) deadTicks=${animal.deadTicks} reproductionChance=${animal.reproductionChance.toFixed(3)} reproductionEnergyTransfer=${animal.reproductionEnergyTransfer}`
      )

  return [
    `inspect cell (${inspection.row}, ${inspection.col})`,
    `grass: ${inspection.grass.toFixed(1)}%`,
    ...animalLines,
  ].join('\n')
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<World>(createWorld())
  const isPaintingRef = useRef(false)
  const lastPaintedRef = useRef<string | null>(null)
  const [mode, setMode] = useState<Mode>('mud')
  const [speed, setSpeed] = useState<Speed>(1)
  const [stats, setStats] = useState(createEmptyStats())
  const [inspection, setInspection] = useState<CellInspection | null>(null)

  function refresh() {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    drawWorld(ctx, worldRef.current)
    setStats(getStats(worldRef.current))
  }

  useEffect(() => {
    refresh()

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    function scheduleNextTick() {
      if (cancelled) {
        return
      }
      if (speed === 0) {
        return
      }

      timeoutId = setTimeout(() => {
        tickWorld(worldRef.current)
        refresh()
        scheduleNextTick()
      }, tickDelay(speed))
    }

    scheduleNextTick()

    return () => {
      cancelled = true
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }
    }
  }, [speed])

  useEffect(() => {
    function stopPainting() {
      isPaintingRef.current = false
      lastPaintedRef.current = null
    }

    window.addEventListener('mouseup', stopPainting)
    return () => window.removeEventListener('mouseup', stopPainting)
  }, [])

  function paintCell(row: number, col: number) {
    if (mode === 'inspect') {
      setInspection(inspectCell(worldRef.current, row, col))
      return
    }

    const paintKey = `${row},${col}`
    if (paintKey === lastPaintedRef.current) {
      return
    }

    if (applyModeAtCell(worldRef.current, row, col, mode)) {
      lastPaintedRef.current = paintKey
      refresh()
    }
  }

  function eventToCell(e: React.MouseEvent<HTMLCanvasElement>): { row: number; col: number } {
    const rect = canvasRef.current!.getBoundingClientRect()
    const col = Math.floor((e.clientX - rect.left) / CELL)
    const row = Math.floor((e.clientY - rect.top) / CELL)
    return { row, col }
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    isPaintingRef.current = true
    const { row, col } = eventToCell(e)
    paintCell(row, col)
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isPaintingRef.current) {
      return
    }

    const { row, col } = eventToCell(e)
    paintCell(row, col)
  }

  function handleMouseUp() {
    isPaintingRef.current = false
    lastPaintedRef.current = null
  }

  function handleMouseLeave() {
    isPaintingRef.current = false
    lastPaintedRef.current = null
  }

  return (
    <div style={{ fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ border: '1px solid #ccc', cursor: 'crosshair' }}
      />

      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <span>Add:</span>
        <button type="button" onClick={() => setMode('mud')} style={{ padding: '0.4rem 0.8rem', border: '1px solid #888', background: mode === 'mud' ? '#ddd' : '#fff', cursor: 'pointer' }}>mud</button>
        <button type="button" onClick={() => setMode('grass')} style={{ padding: '0.4rem 0.8rem', border: '1px solid #888', background: mode === 'grass' ? '#ddd' : '#fff', cursor: 'pointer' }}>grass</button>
        <button type="button" onClick={() => setMode('wall')} style={{ padding: '0.4rem 0.8rem', border: '1px solid #888', background: mode === 'wall' ? '#ddd' : '#fff', cursor: 'pointer' }}>wall</button>
        <button type="button" onClick={() => setMode('sheep')} style={{ padding: '0.4rem 0.8rem', border: '1px solid #888', background: mode === 'sheep' ? '#ddd' : '#fff', cursor: 'pointer' }}>sheep</button>
        <button type="button" onClick={() => setMode('wolf')} style={{ padding: '0.4rem 0.8rem', border: '1px solid #888', background: mode === 'wolf' ? '#ddd' : '#fff', cursor: 'pointer' }}>wolf</button>
        <button type="button" onClick={() => setMode('inspect')} style={{ padding: '0.4rem 0.8rem', border: '1px solid #888', background: mode === 'inspect' ? '#ddd' : '#fff', cursor: 'pointer' }}>inspect</button>
      </div>

      <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <span>speed</span>
        <button type="button" onClick={() => setSpeed(0)} style={{ padding: '0.4rem 0.8rem', border: '1px solid #888', background: speed === 0 ? '#ddd' : '#fff', cursor: 'pointer' }}>0</button>
        <button type="button" onClick={() => setSpeed(1)} style={{ padding: '0.4rem 0.8rem', border: '1px solid #888', background: speed === 1 ? '#ddd' : '#fff', cursor: 'pointer' }}>1</button>
        <button type="button" onClick={() => setSpeed(2)} style={{ padding: '0.4rem 0.8rem', border: '1px solid #888', background: speed === 2 ? '#ddd' : '#fff', cursor: 'pointer' }}>2</button>
        <button type="button" onClick={() => setSpeed(3)} style={{ padding: '0.4rem 0.8rem', border: '1px solid #888', background: speed === 3 ? '#ddd' : '#fff', cursor: 'pointer' }}>3</button>
        <button type="button" onClick={() => setSpeed(4)} style={{ padding: '0.4rem 0.8rem', border: '1px solid #888', background: speed === 4 ? '#ddd' : '#fff', cursor: 'pointer' }}>4</button>
        <button type="button" onClick={() => setSpeed(5)} style={{ padding: '0.4rem 0.8rem', border: '1px solid #888', background: speed === 5 ? '#ddd' : '#fff', cursor: 'pointer' }}>5</button>
      </div>

      <div style={{ marginTop: '0.6rem', fontSize: '0.95rem' }}>
        sheep live: {stats.sheepLiveCount} | sheep dead: {stats.sheepDeadCount} | sheep deaths: {stats.sheepDeaths} | sheep avg energy: {stats.sheepAvgEnergy.toFixed(1)}
      </div>
      <div style={{ marginTop: '0.2rem', fontSize: '0.95rem' }}>
        wolves live: {stats.wolfLiveCount} | wolves dead: {stats.wolfDeadCount} | wolf deaths: {stats.wolfDeaths} | wolf avg energy: {stats.wolfAvgEnergy.toFixed(1)}
      </div>
      <div style={{ marginTop: '0.2rem', fontSize: '0.9rem', color: '#444' }}>
        sheep reproduce: {(SHEEP_REPRODUCTION_CHANCE * 100).toFixed(0)}% | transfer: {SHEEP_REPRODUCTION_ENERGY_TRANSFER}
      </div>
      <div style={{ marginTop: '0.2rem', fontSize: '0.9rem', color: '#444' }}>
        wolves reproduce: {(WOLF_REPRODUCTION_CHANCE * 100).toFixed(0)}% | transfer: {WOLF_REPRODUCTION_ENERGY_TRANSFER}
      </div>

      <div style={{ marginTop: '0.6rem', fontSize: '0.9rem', color: '#222', width: '100%', maxWidth: '820px' }}>
        {inspection ? (
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
            {formatInspection(inspection)}
          </pre>
        ) : (
          <div>inspect: select inspect mode and click a cell to view details.</div>
        )}
      </div>
    </div>
  )
}
