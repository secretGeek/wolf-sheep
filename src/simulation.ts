export const COLS = 30
export const ROWS = 30
export const CELL = 30
export const W = COLS * CELL
export const H = ROWS * CELL

// Constants for world simulation - Sheep
export const SHEEP_MAX_AGE = 100
export const SHEEP_REPRODUCTION_MIN_AGE = 10
export const SHEEP_MAX_ENERGY = 200
export const SHEEP_START_ENERGY = 50
export const SHEEP_ENERGY_REQUIREMENTS = 30
export const SHEEP_MOVEMENT_ENERGY = 10
export const SHEEP_INITIAL_MAX_AGE = 30
export const SHEEP_STATIONARY_AGE_INCREMENT = 3
export const DEAD_SHEEP_DECAY_TICKS = 5

// Constants for world simulation - Wolf
export const WOLF_MAX_AGE = 100
export const WOLF_REPRODUCTION_MIN_AGE = 10
export const WOLF_MAX_ENERGY = 200
export const WOLF_INITIAL_MAX_AGE = 30
export const WOLF_MOVEMENT_ENERGY = 1.3
export const WOLF_MOVES_PER_TICK = 1
export const WOLF_START_ENERGY = 200
export const DEAD_WOLF_DECAY_TICKS = 5

// Evolvable constants for tuning: Sheep
export const SHEEP_REPRODUCTION_CHANCE = 0.2
export const SHEEP_REPRODUCTION_ENERGY_TRANSFER = 40.0

// Evolvable constants for tuning: Wolf
export const WOLF_REPRODUCTION_CHANCE = 0.3
export const WOLF_REPRODUCTION_ENERGY_TRANSFER = 100.0

// Mutation magnitude used for inherited breeding traits.
export const MUTATION_RATE = 0.02

export type Speed = 0 | 1 | 2 | 3 | 4 | 5
export type Mode = 'mud' | 'grass' | 'sheep' | 'wolf' | 'wall' | 'inspect'
export type CreatureState = 'alive' | 'dead'

export interface Sheep {
  id: number
  row: number
  col: number
  energy: number
  age: number
  state: CreatureState
  deadTicks: number
  facingRow: number
  facingCol: number
  reproductionChance: number
  reproductionEnergyTransfer: number
}

export interface Wolf {
  id: number
  row: number
  col: number
  energy: number
  age: number
  state: CreatureState
  deadTicks: number
  facingRow: number
  facingCol: number
  reproductionChance: number
  reproductionEnergyTransfer: number
}

export interface Stats {
  sheepLiveCount: number
  sheepDeadCount: number
  sheepDeaths: number
  sheepAvgEnergy: number
  wolfLiveCount: number
  wolfDeadCount: number
  wolfDeaths: number
  wolfAvgEnergy: number
}

export interface World {
  grid: number[][]
  walls: boolean[][]
  sheep: Sheep[]
  wolves: Wolf[]
  nextSheepId: number
  nextWolfId: number
  sheepDeaths: number
  wolfDeaths: number
}

export interface CellAnimalDetails {
  kind: 'sheep' | 'wolf'
  id: number
  state: CreatureState
  row: number
  col: number
  age: number
  energy: number
  deadTicks: number
  facingRow: number
  facingCol: number
  reproductionChance: number
  reproductionEnergyTransfer: number
}

export interface CellInspection {
  row: number
  col: number
  grass: number
  animals: CellAnimalDetails[]
}

const DIRECTIONS = [
  { facingRow: -1, facingCol: -1 },
  { facingRow: -1, facingCol: 0 },
  { facingRow: -1, facingCol: 1 },
  { facingRow: 0, facingCol: -1 },
  { facingRow: 0, facingCol: 1 },
  { facingRow: 1, facingCol: -1 },
  { facingRow: 1, facingCol: 0 },
  { facingRow: 1, facingCol: 1 },
]

function makeGrid(): number[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => Math.random() * 100)
  )
}

function randomFacing(): { facingRow: number; facingCol: number } {
  return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS
}

function movementCost(fromRow: number, fromCol: number, toRow: number, toCol: number): number {
  const rowDelta = Math.abs(toRow - fromRow)
  const colDelta = Math.abs(toCol - fromCol)

  if (rowDelta === 0 && colDelta === 0) {
    return 0
  }

  if (rowDelta === 1 && colDelta === 1) {
    return Math.SQRT2 * SHEEP_MOVEMENT_ENERGY
  }

  return SHEEP_MOVEMENT_ENERGY
}

function energyToGrass(energy: number): number {
  return Math.max(0, Math.min(100, energy))
}

function inheritWithMutation(parentA: number, parentB: number): number {
  const inheritedBase = Math.random() < 0.5 ? parentA : parentB
  const mutationFactor = 1 + (Math.random() * 2 - 1) * MUTATION_RATE
  return inheritedBase * mutationFactor
}

function inheritReproductionChance(parentA: number, parentB: number): number {
  return Math.max(0, Math.min(1, inheritWithMutation(parentA, parentB)))
}

function inheritReproductionEnergyTransfer(parentA: number, parentB: number): number {
  return Math.max(1, inheritWithMutation(parentA, parentB))
}

function markSheepDead(world: World, sheep: Sheep) {
  if (sheep.state === 'alive') {
    sheep.state = 'dead'
    sheep.deadTicks = 0
    sheep.energy = Math.max(0, sheep.energy)
    world.sheepDeaths += 1
  }
}

function markWolfDead(world: World, wolf: Wolf) {
  if (wolf.state === 'alive') {
    wolf.state = 'dead'
    wolf.deadTicks = 0
    wolf.energy = Math.max(0, wolf.energy)
    world.wolfDeaths += 1
  }
}

export function createWorld(): World {
  return {
    grid: makeGrid(),
    walls: Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => false)),
    sheep: [],
    wolves: [],
    nextSheepId: 1,
    nextWolfId: 1,
    sheepDeaths: 0,
    wolfDeaths: 0,
  }
}

export function createEmptyStats(): Stats {
  return {
    sheepLiveCount: 0,
    sheepDeadCount: 0,
    sheepDeaths: 0,
    sheepAvgEnergy: 0,
    wolfLiveCount: 0,
    wolfDeadCount: 0,
    wolfDeaths: 0,
    wolfAvgEnergy: 0,
  }
}

export function getStats(world: World): Stats {
  const liveSheep = world.sheep.filter((s) => s.state === 'alive')
  const deadSheep = world.sheep.filter((s) => s.state === 'dead')
  const sheepLiveCount = liveSheep.length
  const sheepDeadCount = deadSheep.length
  const sheepTotalEnergy = liveSheep.reduce((sum, sheep) => sum + sheep.energy, 0)
  const sheepAvgEnergy = sheepLiveCount > 0 ? sheepTotalEnergy / sheepLiveCount : 0

  const liveWolves = world.wolves.filter((w) => w.state === 'alive')
  const deadWolves = world.wolves.filter((w) => w.state === 'dead')
  const wolfLiveCount = liveWolves.length
  const wolfDeadCount = deadWolves.length
  const wolfTotalEnergy = liveWolves.reduce((sum, wolf) => sum + wolf.energy, 0)
  const wolfAvgEnergy = wolfLiveCount > 0 ? wolfTotalEnergy / wolfLiveCount : 0

  return {
    sheepLiveCount,
    sheepDeadCount,
    sheepDeaths: world.sheepDeaths,
    sheepAvgEnergy,
    wolfLiveCount,
    wolfDeadCount,
    wolfDeaths: world.wolfDeaths,
    wolfAvgEnergy,
  }
}

export function tickDelay(speed: Speed): number {
  switch (speed) {
    case 0:
      return 0
    case 1:
      return 1000
    case 2:
      return 500
    case 3:
      return 250
    case 4:
      return 125
    case 5:
      return 0
  }
}

export function applyModeAtCell(world: World, row: number, col: number, mode: Mode): boolean {
  if (!inBounds(row, col)) {
    return false
  }

  if (mode === 'inspect') {
    return false
  }

  if (mode === 'mud') {
    world.grid[row][col] = 0
    world.walls[row][col] = false
    return true
  }

  if (mode === 'grass') {
    world.grid[row][col] = 100
    world.walls[row][col] = false
    return true
  }

  if (mode === 'wall') {
    world.walls[row][col] = true
    world.sheep = world.sheep.filter((s) => !(s.row === row && s.col === col))
    world.wolves = world.wolves.filter((w) => !(w.row === row && w.col === col))
    return true
  }

  if (mode === 'sheep') {
    const occupiedBySheep = world.sheep.some((s) => s.row === row && s.col === col)
    const occupiedByWolf = world.wolves.some((w) => w.row === row && w.col === col)
    if (occupiedBySheep || occupiedByWolf || world.walls[row][col]) {
      return false
    }

    const facing = randomFacing()
    world.sheep.push({
      id: world.nextSheepId++,
      row,
      col,
      energy: SHEEP_START_ENERGY,
      age: Math.floor(Math.random() * (SHEEP_INITIAL_MAX_AGE + 1)),
      state: 'alive',
      deadTicks: 0,
      facingRow: facing.facingRow,
      facingCol: facing.facingCol,
      reproductionChance: SHEEP_REPRODUCTION_CHANCE,
      reproductionEnergyTransfer: SHEEP_REPRODUCTION_ENERGY_TRANSFER,
    })
    return true
  }

  const occupiedByWolf = world.wolves.some((w) => w.row === row && w.col === col)
  if (occupiedByWolf || world.walls[row][col]) {
    return false
  }

  const facing = randomFacing()
  world.wolves.push({
    id: world.nextWolfId++,
    row,
    col,
    energy: WOLF_START_ENERGY,
    age: Math.floor(Math.random() * (WOLF_INITIAL_MAX_AGE + 1)),
    state: 'alive',
    deadTicks: 0,
    facingRow: facing.facingRow,
    facingCol: facing.facingCol,
    reproductionChance: WOLF_REPRODUCTION_CHANCE,
    reproductionEnergyTransfer: WOLF_REPRODUCTION_ENERGY_TRANSFER,
  })
  return true
}

export function inspectCell(world: World, row: number, col: number): CellInspection | null {
  if (!inBounds(row, col)) {
    return null
  }

  const animals: CellAnimalDetails[] = []

  for (const sheep of world.sheep) {
    if (sheep.row === row && sheep.col === col) {
      animals.push({
        kind: 'sheep',
        id: sheep.id,
        state: sheep.state,
        row: sheep.row,
        col: sheep.col,
        age: sheep.age,
        energy: sheep.energy,
        deadTicks: sheep.deadTicks,
        facingRow: sheep.facingRow,
        facingCol: sheep.facingCol,
        reproductionChance: sheep.reproductionChance,
        reproductionEnergyTransfer: sheep.reproductionEnergyTransfer,
      })
    }
  }

  for (const wolf of world.wolves) {
    if (wolf.row === row && wolf.col === col) {
      animals.push({
        kind: 'wolf',
        id: wolf.id,
        state: wolf.state,
        row: wolf.row,
        col: wolf.col,
        age: wolf.age,
        energy: wolf.energy,
        deadTicks: wolf.deadTicks,
        facingRow: wolf.facingRow,
        facingCol: wolf.facingCol,
        reproductionChance: wolf.reproductionChance,
        reproductionEnergyTransfer: wolf.reproductionEnergyTransfer,
      })
    }
  }

  return {
    row,
    col,
    grass: world.grid[row][col],
    animals,
  }
}

export function tickWorld(world: World) {
  const grid = world.grid
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      grid[row][col] = Math.min(100, grid[row][col] + 1)
    }
  }

  const nextSheep: Sheep[] = []
  const sheep = world.sheep
  for (const currentSheep of sheep) {
    if (currentSheep.state === 'dead') {
      currentSheep.deadTicks += 1
      if (currentSheep.deadTicks >= DEAD_SHEEP_DECAY_TICKS) {
        grid[currentSheep.row][currentSheep.col] = energyToGrass(currentSheep.energy)
        currentSheep.energy = 0
        continue
      }

      nextSheep.push(currentSheep)
      continue
    }

    if (currentSheep.energy < SHEEP_MAX_ENERGY) {
      const roomLeft = SHEEP_MAX_ENERGY - currentSheep.energy
      const eaten = Math.min(SHEEP_ENERGY_REQUIREMENTS, grid[currentSheep.row][currentSheep.col], roomLeft)
      grid[currentSheep.row][currentSheep.col] -= eaten
      currentSheep.energy += eaten
    }

    if (currentSheep.energy <= 0) {
      currentSheep.age += SHEEP_STATIONARY_AGE_INCREMENT
      if (currentSheep.age >= SHEEP_MAX_AGE) {
        markSheepDead(world, currentSheep)
      }
      nextSheep.push(currentSheep)
      continue
    }

    const options: Array<{ row: number; col: number }> = []
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = currentSheep.row + dr
        const nc = currentSheep.col + dc
        if (!inBounds(nr, nc)) continue
        if (world.walls[nr][nc]) continue

        const occupiedByOther = sheep.some(
          (other) => other.id !== currentSheep.id && other.row === nr && other.col === nc
        )
        if (occupiedByOther) continue

        const occupiedByWolfNearby = world.wolves.some((wolf) => wolf.row === nr && wolf.col === nc)
        if (occupiedByWolfNearby) continue

        if (movementCost(currentSheep.row, currentSheep.col, nr, nc) > currentSheep.energy) continue

        options.push({ row: nr, col: nc })
      }
    }

    let bestGrass = -1
    const winners: Array<{ row: number; col: number }> = []
    for (const option of options) {
      const amount = grid[option.row][option.col]
      if (amount > bestGrass) {
        bestGrass = amount
        winners.length = 0
        winners.push(option)
      } else if (amount === bestGrass) {
        winners.push(option)
      }
    }

    if (winners.length > 0) {
      const pick = winners[Math.floor(Math.random() * winners.length)]
      const previousRow = currentSheep.row
      const previousCol = currentSheep.col
      const cost = movementCost(currentSheep.row, currentSheep.col, pick.row, pick.col)
      currentSheep.energy -= cost
      currentSheep.age += cost === 0 ? SHEEP_STATIONARY_AGE_INCREMENT : 1
      currentSheep.row = pick.row
      currentSheep.col = pick.col
      if (cost > 0) {
        currentSheep.facingRow = pick.row - previousRow
        currentSheep.facingCol = pick.col - previousCol
      }
    } else {
      currentSheep.age += SHEEP_STATIONARY_AGE_INCREMENT
    }

    if (currentSheep.age >= SHEEP_MAX_AGE) {
      markSheepDead(world, currentSheep)
      nextSheep.push(currentSheep)
      continue
    }

    const eligibleAdjacentSheep = sheep.filter((other) => {
      if (other.id === currentSheep.id || other.state !== 'alive') return false
      if (other.age < SHEEP_REPRODUCTION_MIN_AGE) return false
      const dr = Math.abs(other.row - currentSheep.row)
      const dc = Math.abs(other.col - currentSheep.col)
      return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0)
    })

    const canReproduce =
      currentSheep.age >= SHEEP_REPRODUCTION_MIN_AGE &&
      eligibleAdjacentSheep.length > 0 &&
      currentSheep.energy >= currentSheep.reproductionEnergyTransfer &&
      Math.random() < currentSheep.reproductionChance

    if (canReproduce) {
      const mate = eligibleAdjacentSheep[Math.floor(Math.random() * eligibleAdjacentSheep.length)]

      const freeAdjacentCells: Array<{ row: number; col: number }> = []
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          const nr = currentSheep.row + dr
          const nc = currentSheep.col + dc
          if (!inBounds(nr, nc)) continue
          if (world.walls[nr][nc]) continue
          const occupiedBySheep = sheep.some((other) => other.row === nr && other.col === nc)
          if (occupiedBySheep) continue

          const occupiedByWolf = world.wolves.some((wolf) => wolf.row === nr && wolf.col === nc)
          if (occupiedByWolf) continue

          freeAdjacentCells.push({ row: nr, col: nc })
        }
      }

      if (
        freeAdjacentCells.length > 0 &&
        currentSheep.energy >= currentSheep.reproductionEnergyTransfer
      ) {
        const birthCell = freeAdjacentCells[Math.floor(Math.random() * freeAdjacentCells.length)]
        const facing = randomFacing()
        const babyReproductionChance = inheritReproductionChance(
          currentSheep.reproductionChance,
          mate.reproductionChance
        )
        const babyReproductionEnergyTransfer = inheritReproductionEnergyTransfer(
          currentSheep.reproductionEnergyTransfer,
          mate.reproductionEnergyTransfer
        )
        currentSheep.energy -= currentSheep.reproductionEnergyTransfer
        nextSheep.push({
          id: world.nextSheepId++,
          row: birthCell.row,
          col: birthCell.col,
          energy: Math.min(SHEEP_MAX_ENERGY, currentSheep.reproductionEnergyTransfer),
          age: 0,
          state: 'alive',
          deadTicks: 0,
          facingRow: facing.facingRow,
          facingCol: facing.facingCol,
          reproductionChance: babyReproductionChance,
          reproductionEnergyTransfer: babyReproductionEnergyTransfer,
        })
      }
    }

    nextSheep.push(currentSheep)
  }

  world.sheep = nextSheep

  const wolves = world.wolves
  const nextWolves: Wolf[] = []
  for (const currentWolf of wolves) {
    if (currentWolf.state === 'dead') {
      currentWolf.deadTicks += 1
      if (currentWolf.deadTicks >= DEAD_WOLF_DECAY_TICKS) {
        grid[currentWolf.row][currentWolf.col] = energyToGrass(currentWolf.energy)
        currentWolf.energy = 0
        continue
      }
      nextWolves.push(currentWolf)
      continue
    }

    if (currentWolf.energy <= 0) {
      markWolfDead(world, currentWolf)
      nextWolves.push(currentWolf)
      continue
    }

    currentWolf.age += 1
    if (currentWolf.age >= WOLF_MAX_AGE) {
      markWolfDead(world, currentWolf)
      nextWolves.push(currentWolf)
      continue
    }

    for (let step = 0; step < WOLF_MOVES_PER_TICK; step++) {
      if (currentWolf.energy < WOLF_MOVEMENT_ENERGY) {
        break
      }

      currentWolf.energy -= WOLF_MOVEMENT_ENERGY
      if (currentWolf.energy <= 0) {
        markWolfDead(world, currentWolf)
        break
      }

      const canHuntSheep = currentWolf.energy < WOLF_MAX_ENERGY
      const liveAdjacentSheep = canHuntSheep
        ? world.sheep.filter((sheepItem) => {
            if (sheepItem.state !== 'alive') return false
            const dr = Math.abs(sheepItem.row - currentWolf.row)
            const dc = Math.abs(sheepItem.col - currentWolf.col)
            return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0)
          })
        : []

      let destination: { row: number; col: number } | null = null

      if (liveAdjacentSheep.length > 0) {
        const target = liveAdjacentSheep[Math.floor(Math.random() * liveAdjacentSheep.length)]
        destination = { row: target.row, col: target.col }
      } else {
        const options: Array<{ row: number; col: number }> = []
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue
            const nr = currentWolf.row + dr
            const nc = currentWolf.col + dc
            if (!inBounds(nr, nc)) continue
            if (world.walls[nr][nc]) continue
            const wolfOccupied = wolves.some(
              (other) => other.id !== currentWolf.id && other.row === nr && other.col === nc
            )
            if (wolfOccupied) continue

            if (!canHuntSheep) {
              const hasLiveSheep = world.sheep.some(
                (sheepItem) =>
                  sheepItem.state === 'alive' && sheepItem.row === nr && sheepItem.col === nc
              )
              if (hasLiveSheep) continue
            }

            options.push({ row: nr, col: nc })
          }
        }

        if (options.length > 0) {
          const weighted = options.map((option) => {
            const grass = grid[option.row][option.col]
            const weight = (100 - grass) + 1
            return { option, weight }
          })

          const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0)
          let roll = Math.random() * totalWeight
          for (const item of weighted) {
            roll -= item.weight
            if (roll <= 0) {
              destination = item.option
              break
            }
          }

          if (!destination) {
            destination = weighted[weighted.length - 1].option
          }
        }
      }

      if (!destination) {
        continue
      }

      const fromRow = currentWolf.row
      const fromCol = currentWolf.col
      currentWolf.row = destination.row
      currentWolf.col = destination.col

      const dr = destination.row - fromRow
      const dc = destination.col - fromCol
      if (dr !== 0 || dc !== 0) {
        currentWolf.facingRow = dr
        currentWolf.facingCol = dc
      }

      const sheepAtDestination = world.sheep.find(
        (sheepItem) => sheepItem.row === destination.row && sheepItem.col === destination.col
      )

      if (canHuntSheep && sheepAtDestination && sheepAtDestination.state === 'alive') {
        currentWolf.energy = Math.min(WOLF_MAX_ENERGY, currentWolf.energy + sheepAtDestination.energy)
        markSheepDead(world, sheepAtDestination)
      }
    }

    if (currentWolf.state === 'alive') {
      const eligibleAdjacentWolves = wolves.filter((other) => {
        if (other.id === currentWolf.id || other.state !== 'alive') return false
        if (other.age < WOLF_REPRODUCTION_MIN_AGE) return false
        const dr = Math.abs(other.row - currentWolf.row)
        const dc = Math.abs(other.col - currentWolf.col)
        return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0)
      })

      const canReproduce =
        currentWolf.age >= WOLF_REPRODUCTION_MIN_AGE &&
        eligibleAdjacentWolves.length > 0 &&
        currentWolf.energy >= currentWolf.reproductionEnergyTransfer &&
        Math.random() < currentWolf.reproductionChance

      if (canReproduce) {
        const mate = eligibleAdjacentWolves[Math.floor(Math.random() * eligibleAdjacentWolves.length)]

        const freeAdjacentCells: Array<{ row: number; col: number }> = []
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue
            const nr = currentWolf.row + dr
            const nc = currentWolf.col + dc
            if (!inBounds(nr, nc)) continue
            if (world.walls[nr][nc]) continue
            const occupiedByWolf = wolves.some((other) => other.row === nr && other.col === nc)
            if (occupiedByWolf) continue

            const occupiedBySheep = world.sheep.some((sheepItem) => sheepItem.row === nr && sheepItem.col === nc)
            if (occupiedBySheep) continue

            freeAdjacentCells.push({ row: nr, col: nc })
          }
        }

        if (
          freeAdjacentCells.length > 0 &&
          currentWolf.energy >= currentWolf.reproductionEnergyTransfer
        ) {
          const birthCell = freeAdjacentCells[Math.floor(Math.random() * freeAdjacentCells.length)]
          const facing = randomFacing()
          const babyReproductionChance = inheritReproductionChance(
            currentWolf.reproductionChance,
            mate.reproductionChance
          )
          const babyReproductionEnergyTransfer = inheritReproductionEnergyTransfer(
            currentWolf.reproductionEnergyTransfer,
            mate.reproductionEnergyTransfer
          )
          currentWolf.energy -= currentWolf.reproductionEnergyTransfer
          nextWolves.push({
            id: world.nextWolfId++,
            row: birthCell.row,
            col: birthCell.col,
            energy: Math.min(WOLF_MAX_ENERGY, currentWolf.reproductionEnergyTransfer),
            age: 0,
            state: 'alive',
            deadTicks: 0,
            facingRow: facing.facingRow,
            facingCol: facing.facingCol,
            reproductionChance: babyReproductionChance,
            reproductionEnergyTransfer: babyReproductionEnergyTransfer,
          })
        }
      }
    }

    nextWolves.push(currentWolf)
  }

  world.wolves = nextWolves
}