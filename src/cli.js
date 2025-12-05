
import { config } from './config.js';
import { fetchStatsForMany, fetchCoverageForMany } from './services/batch.js';

const cmd = process.argv[2];
const idsArg = (process.argv[3] || '').split(',').map(s => s.trim()).filter(Boolean);
const ids = idsArg.length ? idsArg : config.userIds;

async function main() {
  try {
    if (cmd === 'stats') {
      const data = await fetchStatsForMany(ids);
      // Print per-user lines
      for (const r of data) {
        if (r.error) {
          console.log(`[ERROR] ${r.item}: ${r.error}`);
        } else {
          console.log(`${r.userId} | sq:${r.squadrats} | sqinho:${r.squadratinhos} | yard:${r.yard} | yardinho:${r.yardinho} | uber:${r.ubersquadrat} | uberinho:${r.ubersquadratinho}`);
        }
      }
    } else if (cmd === 'coverage') {
      const data = await fetchCoverageForMany(ids);
      for (const r of data) {
        if (r.error) console.log(`[ERROR] ${r.item}: ${r.error}`);
        else console.log(`${r.userId ?? 'unknown'} | features: ${(r.features?.length) ?? 'N/A'}`);
      }
    } else {
      console.log('Usage: npm run cli -- <stats|coverage> [id1,id2,...]');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌', err.message);
    process.exit(1);
  }
}
main();
