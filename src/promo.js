import { parseSync, stringifySync } from 'subtitle';

export const PROMO_TEXT = 'Downloaded with subcinode - https://github.com/alexis89x/subcinode';

const MIN_GAP_MS = 3000; // only fill gaps longer than this
const PROMO_PADDING_MS = 500; // keep clear of the surrounding cues
const MAX_PROMO_MS = 5000; // a promo caption lasts at most this long

/**
 * Inserts a short promo caption into wide silent gaps of an SRT document, starting a
 * quarter of the way in. Faithful port of the original tool's behaviour, on top of the
 * maintained `subtitle` parser (cue numbering is regenerated on serialization).
 *
 * @param {string} srtContent raw SRT text
 * @param {{ text?: string }} [options]
 * @returns {string} the re-serialized SRT (always returned, even if nothing was inserted)
 */
export function insertPromoSub(srtContent, options = {}) {
  const text = options.text || PROMO_TEXT;
  const nodes = parseSync(srtContent);

  const headers = nodes.filter((node) => node.type !== 'cue');
  const cues = nodes.filter((node) => node.type === 'cue');

  if (cues.length < 2) {
    return stringifySync(nodes, { format: 'srt' });
  }

  const startPos = Math.floor(cues.length / 4);
  const out = [];

  for (let i = 0; i < cues.length; i++) {
    out.push(cues[i]);

    if (i < startPos || i === cues.length - 1) {
      continue;
    }

    const gap = cues[i + 1].data.start - cues[i].data.end;
    if (gap > MIN_GAP_MS) {
      const start = cues[i].data.end + PROMO_PADDING_MS;
      let end = cues[i + 1].data.start - PROMO_PADDING_MS;
      if (end - start > MAX_PROMO_MS) {
        end = start + MAX_PROMO_MS;
      }
      out.push({ type: 'cue', data: { start, end, text } });
    }
  }

  return stringifySync([...headers, ...out], { format: 'srt' });
}

export default insertPromoSub;
