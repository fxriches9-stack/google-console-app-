// helper: check auth
async function whoami(){
  const r = await fetch('https://your-backend-url.com/api/whoami', {credentials:'include'});
  return r.json();
}

// get properties
async function getProperties(){
  const r = await fetch('https://your-backend-url.com/api/properties', {credentials:'include'});
  if (!r.ok) throw new Error(await r.text());
  const j = await r.json();
  return j.sites; // [{siteUrl, permissionLevel}, ...]
}

// get performance
async function getPerformance(siteUrl, startDate, endDate){
  const r = await fetch('https://your-backend-url.com/api/performance', {
    method:'POST',
    credentials:'include',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({siteUrl, startDate, endDate, dimension: 'query', rowLimit: 50})
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json(); // {rows: [...]}
}
