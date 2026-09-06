// 구미 응급실 중계 API — Vercel 서울(icn1)
// http/https, 여러 엔드포인트를 순서대로 시도 + 실패 시 원인 상세 보고

const KEY = '1ae147a1907296a5c5fd16751a21b2f146381a4727784592ae9c235d8ac0263d';
const PATH = '/B552657/ErmctInfoInqireService/getEmrrmRltmUsefulSckbdInfoInqire';
const Q = `?serviceKey=${KEY}&STAGE1=%EA%B2%BD%EC%83%81%EB%B6%81%EB%8F%84&pageNo=1&numOfRows=100`;

// 여러 경로를 순서대로 시도 (http가 뚫리는 경우가 많음)
const CANDIDATES = [
  { name: 'https/apis', url: `https://apis.data.go.kr${PATH}${Q}` },
  { name: 'http/apis',  url: `http://apis.data.go.kr${PATH}${Q}` },
  { name: 'http/api',   url: `http://api.data.go.kr${PATH}${Q}` },
  { name: 'https/api',  url: `https://api.data.go.kr${PATH}${Q}` },
];

function num(s) { const v = parseInt(s); return isNaN(v) ? null : v; }

function parse(txt) {
  if (!txt || txt.indexOf('<item>') === -1) return null;
  const items = txt.split('<item>').slice(1).map(s => s.split('</item>')[0]);
  const g = (blk, tag) => {
    const m = blk.match(new RegExp('<' + tag + '>([^<]*)</' + tag + '>'));
    return m ? m[1].trim() : '';
  };
  const H = {};
  for (const it of items) {
    const name = g(it, 'dutyName').replace(/\s/g, '');
    let key = null;
    if (name.includes('구미차') || name.includes('차의과학')) key = 'cha';
    else if (name.includes('강동')) key = 'gangdong';
    else if (name.includes('순천향') && name.includes('구미')) key = 'sch';
    if (!key) continue;
    H[key] = {
      a: num(g(it, 'hvec')), t: num(g(it, 'hvs01')),
      pa: num(g(it, 'hv28')), pt: num(g(it, 'hvs02')),
      d: g(it, 'hvidate') || null
    };
  }
  return H.cha ? H : null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');

  const tried = [];

  for (const c of CANDIDATES) {
    const t0 = Date.now();
    try {
      const r = await fetch(c.url, {
        signal: AbortSignal.timeout(6000),
        headers: { 'Accept': 'application/xml, text/xml, */*', 'User-Agent': 'Mozilla/5.0' }
      });
      const txt = await r.text();
      const ms = Date.now() - t0;

      if (!r.ok) { tried.push(`${c.name}: HTTP ${r.status} (${ms}ms)`); continue; }

      const H = parse(txt);
      if (H) {
        res.status(200).json({ collected: new Date().toISOString(), h: H, via: c.name });
        return;
      }
      // 데이터는 왔는데 형식이 다름 → 앞부분을 그대로 보고 (에러코드 확인용)
      tried.push(`${c.name}: 내용이상 (${ms}ms) ${txt.slice(0, 160).replace(/\s+/g, ' ')}`);
    } catch (e) {
      tried.push(`${c.name}: ${e.name || 'Error'} ${(e.message || '').slice(0, 60)} (${Date.now() - t0}ms)`);
    }
  }

  res.status(502).json({ error: 'all_failed', tried });
};
