import * as service from './print.service.js';
import { wrapController } from '../../utils/asyncHandler.js';

export default wrapController({
  render: async (req, res) => {
    const html = await service.render(req.user, req.params.resource, req.params.id, req.query.autoprint);
    // Inline script (window.print) needs a relaxed CSP on this response only.
    res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src https: data:");
    res.type('html').send(html);
  },
});
