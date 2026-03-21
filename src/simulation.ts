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

const RNG_MODULUS = 0x100000000
let seededRngState: number | null = null

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
  wall: boolean
  animals: CellAnimalDetails[]
}

interface CellPosition {
  row: number
  col: number
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
    Array.from({ length: COLS }, () => randomUnit() * 100)
  )
}

function randomFacing(): { facingRow: number; facingCol: number } {
  return DIRECTIONS[Math.floor(randomUnit() * DIRECTIONS.length)]
}

function randomUnit(): number {
  if (seededRngState === null) {
    return Math.random()
  }

  // LCG parameters from Numerical Recipes.
  seededRngState = (1664525 * seededRngState + 1013904223) >>> 0
  return seededRngState / RNG_MODULUS
}

export function setRandomSeed(seed: number | null) {
  if (seed === null) {
    seededRngState = null
    return
  }

  const normalized = Math.floor(seed) >>> 0
  seededRngState = normalized
}

export function getRandomSeed(): number | null {
  return seededRngState
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
  const inheritedBase = randomUnit() < 0.5 ? parentA : parentB
  const mutationFactor = 1 + (randomUnit() * 2 - 1) * MUTATION_RATE
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
      age: Math.floor(randomUnit() * (SHEEP_INITIAL_MAX_AGE + 1)),
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
    age: Math.floor(randomUnit() * (WOLF_INITIAL_MAX_AGE + 1)),
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
    wall: world.walls[row][col],
    animals,
  }
}

function regrowGrass(world: World) {
  const grid = world.grid
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      grid[row][col] = Math.min(100, grid[row][col] + 1)
    }
  }
}

function adjacentCells(row: number, col: number): CellPosition[] {
  const cells: CellPosition[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = row + dr
      const nc = col + dc
      if (!inBounds(nr, nc)) continue
      cells.push({ row: nr, col: nc })
    }
  }
  return cells
}

function chooseRandomItem<T>(items: T[]): T {
  return items[Math.floor(randomUnit() * items.length)]
}

function findFreeAdjacentCells(
  world: World,
  row: number,
  col: number,
  isOccupied: (row: number, col: number) => boolean
): CellPosition[] {
  return adjacentCells(row, col).filter((cell) => {
    if (world.walls[cell.row][cell.col]) return false
    return !isOccupied(cell.row, cell.col)
  })
}

function updateDeadSheepDecay(world: World, currentSheep: Sheep, nextSheep: Sheep[]): boolean {
  if (currentSheep.state !== 'dead') {
    return false
  }

  currentSheep.deadTicks += 1
  if (currentSheep.deadTicks >= DEAD_SHEEP_DECAY_TICKS) {
    world.grid[currentSheep.row][currentSheep.col] = energyToGrass(currentSheep.energy)
    currentSheep.energy = 0
    return true
  }

  nextSheep.push(currentSheep)
  return true
}

function feedSheep(world: World, currentSheep: Sheep) {
  if (currentSheep.energy < SHEEP_MAX_ENERGY) {
    const roomLeft = SHEEP_MAX_ENERGY - currentSheep.energy
    const eaten = Math.min(
      SHEEP_ENERGY_REQUIREMENTS,
      world.grid[currentSheep.row][currentSheep.col],
      roomLeft
    )
    world.grid[currentSheep.row][currentSheep.col] -= eaten
    currentSheep.energy += eaten
  }
}

function moveSheep(world: World, currentSheep: Sheep, sheep: Sheep[]) {
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
    const amount = world.grid[option.row][option.col]
    if (amount > bestGrass) {
      bestGrass = amount
      winners.length = 0
      winners.push(option)
    } else if (amount === bestGrass) {
      winners.push(option)
    }
  }

  if (winners.length > 0) {
    const pick = winners[Math.floor(randomUnit() * winners.length)]
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
    return
  }

  currentSheep.age += SHEEP_STATIONARY_AGE_INCREMENT
}

function maybeReproduceSheep(world: World, currentSheep: Sheep, sheep: Sheep[], nextSheep: Sheep[]) {
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
    randomUnit() < currentSheep.reproductionChance

  if (!canReproduce) {
    return
  }

  const mate = chooseRandomItem(eligibleAdjacentSheep)

  const freeAdjacentCells = findFreeAdjacentCells(
    world,
    currentSheep.row,
    currentSheep.col,
    (row, col) => {
      const occupiedBySheep = sheep.some((other) => other.row === row && other.col === col)
      if (occupiedBySheep) return true

      const occupiedByWolf = world.wolves.some((wolf) => wolf.row === row && wolf.col === col)
      return occupiedByWolf
    }
  )

  if (freeAdjacentCells.length === 0 || currentSheep.energy < currentSheep.reproductionEnergyTransfer) {
    return
  }

  const birthCell = chooseRandomItem(freeAdjacentCells)
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

function updateSheepPopulation(world: World) {
  const sheep = world.sheep
  const nextSheep: Sheep[] = []

  for (const currentSheep of sheep) {
    if (updateDeadSheepDecay(world, currentSheep, nextSheep)) {
      continue
    }

    feedSheep(world, currentSheep)

    if (currentSheep.energy <= 0) {
      currentSheep.age += SHEEP_STATIONARY_AGE_INCREMENT
      if (currentSheep.age >= SHEEP_MAX_AGE) {
        markSheepDead(world, currentSheep)
      }
      nextSheep.push(currentSheep)
      continue
    }

    moveSheep(world, currentSheep, sheep)

    if (currentSheep.age >= SHEEP_MAX_AGE) {
      markSheepDead(world, currentSheep)
      nextSheep.push(currentSheep)
      continue
    }

    maybeReproduceSheep(world, currentSheep, sheep, nextSheep)
    nextSheep.push(currentSheep)
  }

  world.sheep = nextSheep
}

function updateDeadWolfDecay(world: World, currentWolf: Wolf, nextWolves: Wolf[]): boolean {
  if (currentWolf.state !== 'dead') {
    return false
  }

  currentWolf.deadTicks += 1
  if (currentWolf.deadTicks >= DEAD_WOLF_DECAY_TICKS) {
    world.grid[currentWolf.row][currentWolf.col] = energyToGrass(currentWolf.energy)
    currentWolf.energy = 0
    return true
  }

  nextWolves.push(currentWolf)
  return true
}

function chooseWolfDestination(
  world: World,
  currentWolf: Wolf,
  wolves: Wolf[],
  canHuntSheep: boolean
): { row: number; col: number } | null {
  const liveAdjacentSheep = canHuntSheep
    ? world.sheep.filter((sheepItem) => {
        if (sheepItem.state !== 'alive') return false
        const dr = Math.abs(sheepItem.row - currentWolf.row)
        const dc = Math.abs(sheepItem.col - currentWolf.col)
        return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0)
      })
    : []

  if (liveAdjacentSheep.length > 0) {
    const target = chooseRandomItem(liveAdjacentSheep)
    return { row: target.row, col: target.col }
  }

  const options = adjacentCells(currentWolf.row, currentWolf.col).filter((cell) => {
    if (world.walls[cell.row][cell.col]) return false

    const wolfOccupied = wolves.some(
      (other) => other.id !== currentWolf.id && other.row === cell.row && other.col === cell.col
    )
    if (wolfOccupied) return false

    if (!canHuntSheep) {
      const hasLiveSheep = world.sheep.some(
        (sheepItem) =>
          sheepItem.state === 'alive' && sheepItem.row === cell.row && sheepItem.col === cell.col
      )
      if (hasLiveSheep) return false
    }

    return true
  })

  if (options.length === 0) {
    return null
  }

  const weighted = options.map((option) => {
    const grass = world.grid[option.row][option.col]
    const weight = (100 - grass) + 1
    return { option, weight }
  })

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0)
  let roll = randomUnit() * totalWeight
  for (const item of weighted) {
    roll -= item.weight
    if (roll <= 0) {
      return item.option
    }
  }

  return weighted[weighted.length - 1].option
}

function moveAndHuntWolf(world: World, currentWolf: Wolf, wolves: Wolf[]) {
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
    const destination = chooseWolfDestination(world, currentWolf, wolves, canHuntSheep)
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
}

function maybeReproduceWolf(world: World, currentWolf: Wolf, wolves: Wolf[], nextWolves: Wolf[]) {
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
    randomUnit() < currentWolf.reproductionChance

  if (!canReproduce) {
    return
  }

  const mate = chooseRandomItem(eligibleAdjacentWolves)

  const freeAdjacentCells = findFreeAdjacentCells(
    world,
    currentWolf.row,
    currentWolf.col,
    (row, col) => {
      const occupiedByWolf = wolves.some((other) => other.row === row && other.col === col)
      if (occupiedByWolf) return true

      const occupiedBySheep = world.sheep.some((sheepItem) => sheepItem.row === row && sheepItem.col === col)
      return occupiedBySheep
    }
  )

  if (freeAdjacentCells.length === 0 || currentWolf.energy < currentWolf.reproductionEnergyTransfer) {
    return
  }

  const birthCell = chooseRandomItem(freeAdjacentCells)
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

function updateWolfPopulation(world: World) {
  const wolves = world.wolves
  const nextWolves: Wolf[] = []

  for (const currentWolf of wolves) {
    if (updateDeadWolfDecay(world, currentWolf, nextWolves)) {
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

    moveAndHuntWolf(world, currentWolf, wolves)

    if (currentWolf.state === 'alive') {
      maybeReproduceWolf(world, currentWolf, wolves, nextWolves)
    }

    nextWolves.push(currentWolf)
  }

  world.wolves = nextWolves
}

export function tickWorld(world: World) {
  regrowGrass(world)
  updateSheepPopulation(world)
  updateWolfPopulation(world)
}