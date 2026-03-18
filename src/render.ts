import {
  CELL,
  COLS,
  ROWS,
  World,
} from './simulation'

const BROWN = [101, 67, 33]
const GREEN = [56, 142, 60]

function grassColor(pct: number): string {
  const t = pct / 100
  const r = Math.round(BROWN[0] + t * (GREEN[0] - BROWN[0]))
  const g = Math.round(BROWN[1] + t * (GREEN[1] - BROWN[1]))
  const b = Math.round(BROWN[2] + t * (GREEN[2] - BROWN[2]))
  return `rgb(${r},${g},${b})`
}

function eyeColorForEnergy(energy: number): string {
  const intensity = Math.max(0, Math.min(1, energy / 100))
  const red = Math.round(255 * intensity)
  return `rgb(${red},0,0)`
}

export function drawWorld(ctx: CanvasRenderingContext2D, world: World) {
  const scale = CELL / 10

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      ctx.fillStyle = grassColor(world.grid[row][col])
      ctx.fillRect(col * CELL, row * CELL, CELL, CELL)
    }
  }

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (world.walls[row][col]) {
        ctx.fillStyle = '#6b6b6b'
        ctx.fillRect(col * CELL, row * CELL, CELL, CELL)
        ctx.fillStyle = '#888888'
        ctx.fillRect(col * CELL + 1, row * CELL + 1, CELL - 2, CELL / 2 - 1)
        ctx.fillRect(col * CELL + 1, row * CELL + CELL / 2 + 1, CELL - 2, CELL / 2 - 2)
      }
    }
  }

  for (const sheep of world.sheep) {
    const x = sheep.col * CELL + CELL / 2
    const y = sheep.row * CELL + CELL / 2
    const headX = x + sheep.facingCol * (2.5 * scale)
    const headY = y + sheep.facingRow * (2.5 * scale)

    ctx.fillStyle = sheep.state === 'dead' ? '#000000' : '#d9d9d9'
    ctx.beginPath()
    ctx.arc(x, y + (1 * scale), 3 * scale, 0, 2 * Math.PI)
    ctx.fill()

    ctx.fillStyle = sheep.state === 'dead' ? '#000000' : '#f5f5f5'
    ctx.beginPath()
    ctx.arc(headX, headY, 1.8 * scale, 0, 2 * Math.PI)
    ctx.fill()
  }

  for (const wolf of world.wolves) {
    const x = wolf.col * CELL + CELL / 2
    const y = wolf.row * CELL + CELL / 2

    const dirXRaw = wolf.facingCol
    const dirYRaw = wolf.facingRow
    const dirLen = Math.hypot(dirXRaw, dirYRaw) || 1
    const dirX = dirXRaw / dirLen
    const dirY = dirYRaw / dirLen
    const perpX = -dirY
    const perpY = dirX

    const bodyTipX = x + dirX * (4.8 * scale)
    const bodyTipY = y + dirY * (4.8 * scale)
    const bodyBaseCenterX = x - dirX * (2.0 * scale)
    const bodyBaseCenterY = y - dirY * (2.0 * scale)
    const bodyHalfBase = 2.6 * scale

    ctx.fillStyle = wolf.state === 'dead' ? '#000000' : '#4a4a4a'
    ctx.beginPath()
    ctx.moveTo(bodyTipX, bodyTipY)
    ctx.lineTo(bodyBaseCenterX + perpX * bodyHalfBase, bodyBaseCenterY + perpY * bodyHalfBase)
    ctx.lineTo(bodyBaseCenterX - perpX * bodyHalfBase, bodyBaseCenterY - perpY * bodyHalfBase)
    ctx.closePath()
    ctx.fill()

    const headTipX = x + dirX * (7.2 * scale)
    const headTipY = y + dirY * (7.2 * scale)
    const headBaseCenterX = x + dirX * (2.8 * scale)
    const headBaseCenterY = y + dirY * (2.8 * scale)
    const headHalfBase = 1.8 * scale

    ctx.fillStyle = wolf.state === 'dead' ? '#000000' : '#5a5a5a'
    ctx.beginPath()
    ctx.moveTo(headTipX, headTipY)
    ctx.lineTo(headBaseCenterX + perpX * headHalfBase, headBaseCenterY + perpY * headHalfBase)
    ctx.lineTo(headBaseCenterX - perpX * headHalfBase, headBaseCenterY - perpY * headHalfBase)
    ctx.closePath()
    ctx.fill()

    const eyeCenterX = x + dirX * (4.6 * scale)
    const eyeCenterY = y + dirY * (4.6 * scale)
    const eyeOffset = 0.8 * scale

    ctx.fillStyle = wolf.state === 'dead' ? '#000000' : eyeColorForEnergy(wolf.energy)
    ctx.beginPath()
    ctx.arc(eyeCenterX + perpX * eyeOffset, eyeCenterY + perpY * eyeOffset, 0.6 * scale, 0, 2 * Math.PI)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(eyeCenterX - perpX * eyeOffset, eyeCenterY - perpY * eyeOffset, 0.6 * scale, 0, 2 * Math.PI)
    ctx.fill()
  }
}