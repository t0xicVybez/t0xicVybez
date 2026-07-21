/**
 * Regenerates the auto-updating parts of README.md.
 *
 * Everything between a START/END marker pair is replaced; the rest of the file
 * is hand-written and left alone. Run by .github/workflows/readme.yml on a
 * schedule, so a newly created repository shows up on the profile without any
 * manual editing.
 *
 *   node scripts/build-readme.mjs          # rewrite README.md in place
 *   node scripts/build-readme.mjs --check  # exit 1 if it would change (CI)
 *
 * Live counters (stars, forks, downloads) are rendered as shields.io badges
 * rather than baked-in numbers, so they stay current between scheduled runs.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const USER = 't0xicVybez';
const README = 'README.md';

/** Repos to surface first, in this order. Anything else is listed by recency. */
const FEATURED = ['ArkenBot', 'GameQuery', 'GamingCommunity'];

/** Repos never shown (the profile repo itself, scratch work). */
const HIDDEN = new Set([USER]);

/**
 * Published packages, keyed by the repo they come from. Add an entry here when
 * you publish a new one — everything else on the profile is automatic.
 */
const PACKAGES = {
  GameQuery: [
    { kind: 'npm', name: '@t0xicvybez/gamequery' },
    { kind: 'packagist', name: 't0xicvybez/gamequery' },
  ],
};

const gh = async (path) => {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': `${USER}-profile-readme`,
      ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
};

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();

/** Language chip colours, so the table reads at a glance. */
const LANG_COLOUR = {
  TypeScript: '3178C6', JavaScript: 'F7DF1E', PHP: '777BB4', Python: '3776AB',
  'C++': '00599C', HTML: 'E34C26', CSS: '1572B6', Shell: '89E051', Go: '00ADD8', Rust: 'DEA584',
};
const langBadge = (l) =>
  l ? `![${l}](https://img.shields.io/badge/${encodeURIComponent(l)}-${LANG_COLOUR[l] ?? '6E7681'}?style=flat-square&labelColor=0d1117)` : '';

const starBadge = (r) =>
  `[![Stars](https://img.shields.io/github/stars/${USER}/${r.name}?style=flat-square&labelColor=0d1117&color=39d353)](https://github.com/${USER}/${r.name}/stargazers)`;
const forkBadge = (r) =>
  `[![Forks](https://img.shields.io/github/forks/${USER}/${r.name}?style=flat-square&labelColor=0d1117&color=39d353)](https://github.com/${USER}/${r.name}/forks)`;

function packageBadges(repoName) {
  return (PACKAGES[repoName] ?? [])
    .map(({ kind, name }) =>
      kind === 'npm'
        ? `[![npm downloads](https://img.shields.io/npm/dm/${name}?style=flat-square&logo=npm&logoColor=white&label=npm&labelColor=0d1117&color=39d353)](https://www.npmjs.com/package/${name})`
        : `[![Packagist](https://img.shields.io/packagist/dt/${name}?style=flat-square&logo=packagist&logoColor=white&label=installs&labelColor=0d1117&color=39d353)](https://packagist.org/packages/${name})`,
    )
    .join(' ');
}

function renderFeatured(repos) {
  const picked = FEATURED.map((n) => repos.find((r) => r.name === n)).filter(Boolean);
  if (!picked.length) return '_No featured projects yet._';

  return picked
    .map((r) => {
      const pkgs = packageBadges(r.name);
      const site = r.homepage ? ` &nbsp;·&nbsp; [**Live**](${r.homepage})` : '';
      return [
        `<table><tr><td width="100%">`,
        ``,
        `#### [${r.name}](${r.html_url})${site}`,
        ``,
        `${esc(r.description) || '_No description._'}`,
        ``,
        `${[langBadge(r.language), starBadge(r), forkBadge(r), pkgs].filter(Boolean).join(' ')}`,
        ``,
        `</td></tr></table>`,
      ].join('\n');
    })
    .join('\n\n');
}

function renderTable(repos) {
  const rest = repos.filter((r) => !FEATURED.includes(r.name));
  if (!rest.length) return '_Nothing else public yet._';

  const rows = rest.map((r) => {
    const name = `[**${r.name}**](${r.html_url})`;
    const desc = esc(r.description) || '—';
    const lang = r.language ? `\`${r.language}\`` : '—';
    // Only show counters once they mean something; a column of zeroes is noise.
    const stats = [r.stargazers_count ? `★ ${r.stargazers_count}` : '', r.forks_count ? `⑂ ${r.forks_count}` : '']
      .filter(Boolean)
      .join(' · ') || '—';
    return `| ${name} | ${desc} | ${lang} | ${stats} |`;
  });

  return ['| Project | What it does | Stack | |', '|---|---|---|---|', ...rows].join('\n');
}

function renderPackages(repos) {
  const entries = Object.entries(PACKAGES).filter(([repo]) => repos.some((r) => r.name === repo));
  if (!entries.length) return '';

  const rows = entries.flatMap(([repo, pkgs]) =>
    pkgs.map(({ kind, name }) => {
      const registry = kind === 'npm' ? 'npm' : 'Packagist';
      const url = kind === 'npm' ? `https://www.npmjs.com/package/${name}` : `https://packagist.org/packages/${name}`;
      const badge =
        kind === 'npm'
          ? `![v](https://img.shields.io/npm/v/${name}?style=flat-square&labelColor=0d1117&color=39d353) ![dm](https://img.shields.io/npm/dm/${name}?style=flat-square&label=downloads%2Fmo&labelColor=0d1117&color=39d353)`
          : `![v](https://img.shields.io/packagist/v/${name}?style=flat-square&labelColor=0d1117&color=39d353) ![dt](https://img.shields.io/packagist/dt/${name}?style=flat-square&label=installs&labelColor=0d1117&color=39d353)`;
      return `| ${registry} | [\`${name}\`](${url}) | [${repo}](https://github.com/${USER}/${repo}) | ${badge} |`;
    }),
  );

  return ['| Registry | Package | Source | |', '|---|---|---|---|', ...rows].join('\n');
}

function replaceBlock(text, key, body) {
  const start = `<!-- ${key}:START -->`;
  const end = `<!-- ${key}:END -->`;
  const i = text.indexOf(start);
  const j = text.indexOf(end);
  if (i === -1 || j === -1) throw new Error(`marker ${key} not found in ${README}`);
  return `${text.slice(0, i + start.length)}\n${body}\n${text.slice(j)}`;
}

// ── build ───────────────────────────────────────────────────────────────────
const all = await gh(`/users/${USER}/repos?per_page=100&type=owner&sort=pushed`);
const repos = all
  .filter((r) => !r.private && !r.fork && !r.archived && !HIDDEN.has(r.name))
  .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));

let out = readFileSync(README, 'utf8');
out = replaceBlock(out, 'FEATURED', renderFeatured(repos));
out = replaceBlock(out, 'PROJECTS', renderTable(repos));
out = replaceBlock(out, 'PACKAGES', renderPackages(repos));
out = replaceBlock(
  out,
  'UPDATED',
  `<sub>${repos.length} public projects · list refreshed automatically ${new Date().toISOString().slice(0, 10)}</sub>`,
);

if (process.argv.includes('--check')) {
  const changed = out !== readFileSync(README, 'utf8');
  console.log(changed ? 'README is stale' : 'README is current');
  process.exit(changed ? 1 : 0);
}

writeFileSync(README, out);
console.log(`README updated — ${repos.length} repos, ${Object.keys(PACKAGES).length} package source(s)`);
