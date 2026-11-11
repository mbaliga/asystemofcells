// The order state machine (08 §2). Pure. `status` on the order file changes
// only through advance(); the event log records why.

export const STATES = ['placed', 'reviewing', 'accepted', 'paid', 'in_production', 'finishing', 'dispatched', 'delivered', 'rejected', 'cancelled', 'expired', 'refunded']

const PRE_PAID = ['placed', 'reviewing', 'accepted']

export function allowed(kind, from) {
  const out = []
  if (from === 'placed') out.push('reviewing', 'rejected', 'cancelled', 'expired')
  // A cabinet order has no file to review; the owner accepts it straight from placed.
  if (from === 'placed' && kind === 'cabinet') out.push('accepted')
  if (from === 'reviewing') out.push('accepted', 'rejected', 'cancelled')
  if (from === 'accepted') out.push('paid', 'expired', 'cancelled', 'rejected')
  if (from === 'paid') out.push(kind === 'print' ? 'in_production' : 'dispatched', 'refunded')
  if (from === 'in_production') out.push('finishing', 'refunded')
  if (from === 'finishing') out.push('dispatched', 'refunded')
  if (from === 'dispatched') out.push('delivered', 'refunded')
  if (from === 'delivered') out.push('refunded')
  return out
}

export const canTransition = (kind, from, to) => allowed(kind, from).includes(to)
export const isPrePaid = (status) => PRE_PAID.includes(status)
/** States that end a cabinet reservation without a sale. */
export const releasesReservation = (to) => ['rejected', 'expired', 'cancelled'].includes(to)
/** States in which the uploaded model may be deleted at once. */
export const deletesModel = (to) => ['rejected', 'expired', 'cancelled'].includes(to)
export const isOpen = (status) => !['delivered', 'rejected', 'cancelled', 'expired', 'refunded'].includes(status)

/** What the owner must do next, for the app's inbox and counters.json. */
export function nextAction(order) {
  switch (order.status) {
    case 'placed': return order.kind === 'print' ? 'wait-for-model' : 'decide'
    case 'reviewing': return 'decide'
    case 'accepted': return 'waiting-for-payment'
    case 'paid': return order.kind === 'print' ? 'make' : 'pack'
    case 'in_production': case 'finishing': return 'make'
    case 'dispatched': return 'sent'
    default: return null
  }
}
