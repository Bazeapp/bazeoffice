/**
 * Placeholder for the Pagamenti mode (BAZ-100 / plan U6). Reminder da fare /
 * fatti + bulk reminder land in a later unit — this only makes the mode tab
 * reachable and stable so U4's shell wiring (Board / Controlli / Pagamenti)
 * is complete without pulling forward U6 scope.
 */
export function CedoliniPagamentiView() {
  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center px-4 py-10 text-center">
      <div className="max-w-sm">
        <h2 className="text-foreground-strong text-lg font-semibold">Pagamenti</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          I promemoria di pagamento in blocco sono in arrivo.
        </p>
      </div>
    </div>
  )
}
