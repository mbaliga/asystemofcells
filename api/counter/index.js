import { dispatch } from './_router.js'

// The signature on the Razorpay webhook covers the exact bytes, and every route reads its own body, so the
// platform must not parse it first.
export const config = { api: { bodyParser: false } }

export default function handler(req, res) { return dispatch(req, res) }
