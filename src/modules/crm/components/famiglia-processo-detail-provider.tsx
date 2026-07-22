import type { ReactNode } from "react"

import {
  FamigliaProcessoDetailContext,
  type FamigliaProcessoDetailContextValue,
} from "./famiglia-processo-detail-context"

export function FamigliaProcessoDetailProvider({
  value,
  children,
}: {
  value: FamigliaProcessoDetailContextValue
  children: ReactNode
}) {
  return (
    <FamigliaProcessoDetailContext.Provider value={value}>
      {children}
    </FamigliaProcessoDetailContext.Provider>
  )
}
