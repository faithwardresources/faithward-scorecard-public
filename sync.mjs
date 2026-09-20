import { mkdir, writeFile, rm } from "node:fs/promises";

const source = process.env.SCORECARD_SOURCE || "https://faithward-advisor-productivity.bob-nayden-8521.chatgpt.site/scorecard.json";
const response = await fetch(source, {headers:{accept:"application/json","user-agent":"FaithwardScorecardMirror/1.0"}});
if (!response.ok) throw new Error("Scorecard source returned " + response.status);
const data = await response.json();
if (!data?.schema_version || !Array.isArray(data?.advisors) || !data?.team_rollup) throw new Error("Scorecard payload is incomplete");

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = value => value === null || value === undefined ? "Unavailable" : new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(value);
const pct = value => value === null || value === undefined ? "Unavailable" : Number(value).toFixed(1) + "%";
const shell = (title,body) => '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><title>' + esc(title) + '</title><style>body{margin:0;background:#071822;color:#edf7f6;font:16px/1.55 Arial,sans-serif}main{max-width:1180px;margin:auto;padding:32px 20px 64px}a{color:#67ddd2}h1,h2,h3{font-family:Georgia,serif;color:#fff}section,article{background:#0d2530;border:1px solid #294651;border-radius:14px;padding:20px;margin:20px 0}table{width:100%;border-collapse:collapse;display:block;overflow-x:auto}th,td{text-align:left;padding:9px;border-bottom:1px solid #294651;white-space:nowrap}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#071822;padding:14px;border-radius:8px}.meta{color:#9fb9bf}</style></head><body><main>' + body + '</main></body></html>';
const methodology = () => '<section><h2>Methodology and definitions</h2>' + Object.entries(data.methodology||{}).map(([k,v])=>'<h3>'+esc(k.replaceAll("_"," "))+'</h3><p>'+esc(typeof v==="object"?JSON.stringify(v):v)+'</p>').join("") + '</section>';
const advisorPage = row => shell(row.advisor_name + " — Advisor Scorecard", '<p><a href="../../scorecard-readable/">All advisors</a> · <a href="../../team-rollup/">Team Roll-Up</a> · <a href="../'+esc(row.slug)+'.json">JSON</a></p><h1>'+esc(row.advisor_name)+' — Advisor Scorecard</h1><p class="meta">Schema '+esc(row.schema_version)+' · Data refreshed '+esc(row.data_refresh_timestamp??"Unavailable")+'</p><article><table><tbody><tr><th>Gross AUM MTD</th><td>'+money(row.gross_aum_mtd)+'</td></tr><tr><th>Gross AUM YTD</th><td>'+money(row.gross_aum_ytd)+'</td></tr><tr><th>Annual goal</th><td>'+money(row.annual_gross_aum_goal)+'</td></tr><tr><th>Percent to goal</th><td>'+pct(row.percent_to_goal)+'</td></tr><tr><th>Weighted pipeline</th><td>'+money(row.weighted_pipeline)+'</td></tr><tr><th>Projected year-end</th><td>'+money(row.projected_year_end_production)+'</td></tr><tr><th>Outlook</th><td>'+esc(row.goal_outlook??"Unavailable")+'</td></tr></tbody></table><h2>Complete advisor dataset</h2><pre>'+esc(JSON.stringify(row,null,2))+'</pre></article>'+methodology());
const teamRows = data.team_rollup.advisor_rows.map(row=>'<tr><td>'+esc(row.rank)+'</td><td><a href="../advisor/'+esc(row.slug)+'/">'+esc(row.advisor_name)+'</a></td><td>'+money(row.gross_aum_mtd)+'</td><td>'+money(row.gross_aum_ytd)+'</td><td>'+money(row.weighted_pipeline)+'</td><td>'+money(row.projected_year_end)+'</td><td>'+money(row.annual_goal)+'</td><td>'+pct(row.percent_to_goal)+'</td><td>'+esc(row.goal_outlook??"Unavailable")+'</td></tr>').join("");
const teamPage = shell("Faithward Team Roll-Up",'<p><a href="../scorecard-readable/">All advisors</a> · <a href="../team-rollup.json">JSON</a></p><h1>Team Roll-Up</h1><p class="meta">Schema '+esc(data.team_rollup.schema_version)+' · Data refreshed '+esc(data.team_rollup.data_refresh_timestamp??"Unavailable")+'</p><section><table><thead><tr><th>Rank</th><th>Advisor</th><th>Gross AUM MTD</th><th>Gross AUM YTD</th><th>Weighted Pipeline</th><th>Projected YE</th><th>Annual Goal</th><th>% to Goal</th><th>Outlook</th></tr></thead><tbody>'+teamRows+'</tbody></table><h2>Complete Team Roll-Up dataset</h2><pre>'+esc(JSON.stringify(data.team_rollup,null,2))+'</pre></section>'+methodology());
const links = data.advisors.map(row=>'<li><a href="../advisor/'+esc(row.slug)+'/">'+esc(row.advisor_name)+'</a> · <a href="../advisor/'+esc(row.slug)+'.json">JSON</a></li>').join("");
const fullPage = shell("Faithward Advisor Productivity Scorecard — Readable Data",'<h1>'+esc(data.title)+' — Readable Data</h1><p class="meta">Schema '+esc(data.schema_version)+' · Data refreshed '+esc(data.data_refresh_timestamp??"Unavailable")+'</p><section><h2>Pages</h2><ul><li><a href="../team-rollup/">Team Roll-Up</a> · <a href="../team-rollup.json">JSON</a></li>'+links+'</ul></section>'+data.advisors.map(row=>'<article><h2>'+esc(row.advisor_name)+'</h2><pre>'+esc(JSON.stringify(row,null,2))+'</pre></article>').join("")+methodology());

await rm("public",{recursive:true,force:true});
for (const dir of ["public/scorecard-readable","public/team-rollup",...data.advisors.map(row=>"public/advisor/"+row.slug)]) await mkdir(dir,{recursive:true});
await writeFile("public/index.html",shell("Faithward Advisor Productivity Scorecard",'<h1>Faithward Advisor Productivity Scorecard</h1><p><a href="scorecard-readable/">Readable scorecard</a></p><p><a href="scorecard.json">Complete JSON dataset</a></p>'));
await writeFile("public/scorecard-readable/index.html",fullPage);
await writeFile("public/scorecard.json",JSON.stringify(data,null,2));
await writeFile("public/team-rollup/index.html",teamPage);
await writeFile("public/team-rollup.json",JSON.stringify(data.team_rollup,null,2));
for (const row of data.advisors) {
  await writeFile("public/advisor/"+row.slug+"/index.html",advisorPage(row));
  await writeFile("public/advisor/"+row.slug+".json",JSON.stringify(row,null,2));
}
await writeFile("public/.nojekyll","");
await writeFile("public/robots.txt","User-agent: *\\nAllow: /\\n");
console.log("Generated " + data.advisors.length + " advisor pages from schema " + data.schema_version);
