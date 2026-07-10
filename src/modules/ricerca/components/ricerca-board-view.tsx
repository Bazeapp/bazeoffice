import {
  useRicercaBoardView,
  type RicercaBoardViewProps,
} from "../hooks/use-ricerca-board-view"
import { RicercaBoardViewBoard } from "./ricerca-board-view-board"
import { RicercaBoardViewError } from "./ricerca-board-view-error"
import { RicercaBoardViewHeader } from "./ricerca-board-view-header"

export type { RicercaBoardViewProps } from "../hooks/use-ricerca-board-view"

export function RicercaBoardView(props: RicercaBoardViewProps) {
  const { asyncState, header, board } = useRicercaBoardView(props)

  return (
    <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col gap-3 overflow-hidden">
      {asyncState.error ? <RicercaBoardViewError error={asyncState.error} /> : null}
      <RicercaBoardViewHeader {...header} />
      <RicercaBoardViewBoard loading={asyncState.loading} {...board} />
    </section>
  )
}
