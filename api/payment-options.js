// GET /api/payment-options: tells the payment page which checkout to show.
// Public on purpose: it reveals only whether the card simulator is on.
import { apiHandler, send } from './_lib/http.js';
import { cardSimulatorEnabled } from './_lib/config.js';

export default apiHandler('/payment-options', ['GET'], async (req, res) => {
  send(res, 200, { cardSimulator: cardSimulatorEnabled() });
});
