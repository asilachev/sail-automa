/**
 * The Scenario Book (docs/reference/sail-scenarios.pdf): where each scenario puts its tokens on
 * the ocean board, and the storm columns the ship must clear. Cells are the board's labels: a
 * row letter A to G and a column number. docs/rules.md → Scenarios.
 *
 * The app doesn't move the ship (the table keeps the board); setup lists the tokens to place,
 * and the storm checks name the columns.
 */

export type ScenarioId = 'learning' | 1 | 2 | 3 | 4 | 5

export interface Scenario {
  readonly id: ScenarioId
  /** The book's page: 1 holds Learning, 1 and 2; 2 holds 3, 4 and 5. */
  readonly page: 1 | 2
  readonly start: string
  readonly islands: readonly string[]
  readonly kraken: readonly string[]
  readonly end: readonly string[]
  /**
   * The storm columns, checked at the end of rounds II and IV in turn. The Learning scenario has
   * one storm, which the ship must pass before round III (its page says so).
   */
  readonly storms: readonly number[]
}

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'learning',
    page: 1,
    start: 'D1',
    islands: ['D3', 'A8', 'G8', 'A10', 'G10'],
    kraken: ['A4', 'G6', 'D7'],
    end: ['C10', 'E10', 'D11'],
    storms: [5],
  },
  {
    id: 1,
    page: 1,
    start: 'D1',
    islands: ['D3', 'G6', 'C10', 'G10', 'G12', 'A16', 'G16'],
    kraken: ['G4', 'A6', 'C8', 'C12', 'A14', 'F15'],
    end: ['C16', 'E16', 'D17'],
    storms: [5, 12],
  },
  {
    id: 2,
    page: 1,
    start: 'D1',
    islands: ['D3', 'G8', 'A10', 'E10', 'B11', 'A12', 'D15', 'A18', 'G18'],
    kraken: ['G4', 'A6', 'D7', 'E12', 'A16', 'F17'],
    end: ['C18', 'E18', 'D19'],
    storms: [5, 14],
  },
  {
    id: 3,
    page: 2,
    start: 'D1',
    islands: ['D3', 'G6', 'G8', 'A10', 'E10', 'B11', 'A12', 'D15', 'C18', 'A20', 'G20'],
    kraken: ['G4', 'A6', 'D7', 'E12', 'A16', 'G16', 'F19'],
    end: ['C20', 'E20', 'D21'],
    storms: [5, 14],
  },
  {
    id: 4,
    page: 2,
    start: 'D1',
    islands: ['D3', 'E6', 'C10', 'G10', 'G12', 'A14', 'B15', 'A16', 'D17', 'D19', 'A22', 'G22'],
    kraken: ['A4', 'C8', 'E10', 'D13', 'G14', 'A20', 'F21'],
    end: ['C22', 'E22', 'D23'],
    storms: [9, 18],
  },
  {
    id: 5,
    page: 2,
    start: 'D1',
    islands: ['D3', 'E6', 'C10', 'G10', 'G12', 'A14', 'B15', 'A16', 'D17', 'D19', 'C22'],
    kraken: ['A4', 'C8', 'E10', 'D13', 'G14', 'A20', 'G20', 'F23'],
    end: ['C24', 'E24', 'D25'],
    storms: [9, 18],
  },
]

export function scenario(id: ScenarioId): Scenario {
  const found = SCENARIOS.find((s) => s.id === id)
  if (!found) throw new Error(`Unknown scenario ${String(id)}`)
  return found
}
