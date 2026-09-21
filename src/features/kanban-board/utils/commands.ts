import type { BoardCommand, BoardState, Card, CardPosition, ColumnId } from '../types'
import { attach, detach } from './board'
import { columnTitle } from './columns'

export function addCardCommand(card: Card, column: ColumnId): BoardCommand {
  return {
    label: `新增「${card.title}」到「${columnTitle(column)}」`,
    do(state) {
      state.cards[card.id] = card
      attach(state.columns, card.id, { column, index: state.columns[column].length })
    },
    undo(state) {
      detach(state.columns, card.id)
      delete state.cards[card.id]
    },
  }
}

export function editCardCommand(id: string, from: string, to: string): BoardCommand {
  const setTitle = (title: string) => (state: BoardState) => {
    const card = state.cards[id]
    if (card) card.title = title
  }
  return { label: `將「${from}」改為「${to}」`, do: setTitle(to), undo: setTitle(from) }
}

export function removeCardCommand(card: Card, from: CardPosition): BoardCommand {
  return {
    label: `刪除「${card.title}」`,
    do(state) {
      detach(state.columns, card.id)
      delete state.cards[card.id]
    },
    undo(state) {
      state.cards[card.id] = card
      attach(state.columns, card.id, from)
    },
  }
}

export function moveCardCommand(card: Pick<Card, 'id' | 'title'>, from: CardPosition, to: CardPosition): BoardCommand {
  return {
    label: `移動「${card.title}」到「${columnTitle(to.column)}」第 ${to.index + 1} 張`,
    do(state) {
      detach(state.columns, card.id)
      attach(state.columns, card.id, to)
    },
    undo(state) {
      detach(state.columns, card.id)
      attach(state.columns, card.id, from)
    },
  }
}
