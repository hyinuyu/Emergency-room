// 구미 응급실 중계 API — Vercel 서울(icn1)에서 실행
// 한국 IP로 공공데이터를 받아서, CORS 열고, 3개 병원만 골라 작게 응답

const API = 'https://apis.data.go.kr/B552657/ErmctInfoInqireService/getEmrrmRltmUsefulSckbdInfoInqire?serviceKey=1ae147a1907296a5c5fd16751a21b2f146381a4727784592ae9c235d8ac0263d&STAGE1=%EA%B2%BD%EC%83%81%EB%B6%81%EB%8F%84&pageNo=1&numOfRows=100';

function num(s) { const v = parseInt(s); return isNaN(v) ? null : v; }

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Vercel CDN이 60초간 결과를 캐시 → 방문자가 많아도 API는 분당 1회만 호출됨
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  try {
    const r = await fetch(API, { signal: AbortSignal.timeout(9000) });
    const txt = await r.text();
    if (!txt.includes('<item>')) throw new Error('no items: ' + txt.slice(0, 120));

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
        a: num(g(it, 'hvec')),
        t: num(g(it, 'hvs01')),
        pa: num(g(it, 'hv28')),
        pt: num(g(it, 'hvs02')),
        d: g(it, 'hvidate') || null
      };
    }

    if (!H.cha) throw new Error('cha missing');
    res.status(200).json({ collected: new Date().toISOString(), h: H });
  } catch (e) {
    res.status(502).json({ error: String((e && e.message) || e) });
  }
};
