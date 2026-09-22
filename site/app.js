/* ============ Ishimwe portfolio — app ============ */
(function () {
  "use strict";

  const LANG_COLORS = {
    Python: "#3572A5",
    JavaScript: "#f1e05a",
    TypeScript: "#3178c6",
    HTML: "#e34c26",
    CSS: "#663399",
    SCSS: "#c6538c",
    Java: "#b07219",
    "Jupyter Notebook": "#DA5B0B",
    Shell: "#89e051",
    C: "#555555",
    "C++": "#f34b7d",
    Go: "#00ADD8",
    Rust: "#dea584"
  };
  const FALLBACK_LANG = "#8b96b3";

  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));

  function rel(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return days + " days ago";
    if (days < 30) return Math.floor(days / 7) + "w ago";
    if (days < 365) return Math.floor(days / 30) + "mo ago";
    return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }

  function since(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  }

  /* ---------- rendering ---------- */

  function renderProfile(p) {
    $("nav-avatar").src = p.avatar_url;
    $("nav-avatar").alt = "Avatar of " + p.login;
    const av = $("avatar");
    av.src = p.avatar_url;
    av.alt = "Avatar of " + p.name;

    $("name").textContent = p.name || p.login;

    const sub = [];
    sub.push('<span class="handle">@' + esc(p.login) + "</span>");
    if (p.location) sub.push(esc(p.location));
    if (p.company) sub.push("at " + esc(p.company));
    if (p.created_at) sub.push("on GitHub since " + esc(since(p.created_at)));
    $("sub").innerHTML = sub.join('<span class="dot">·</span>');

    $("bio").textContent = p.bio || "";

    const actions = [];
    actions.push('<a class="btn btn-primary" href="' + esc(p.html_url) + '" target="_blank" rel="noopener">View GitHub profile</a>');
    if (p.twitter_username)
      actions.push('<a class="btn btn-ghost" href="https://x.com/' + esc(p.twitter_username) + '" target="_blank" rel="noopener">X / Twitter</a>');
    if (p.blog)
      actions.push('<a class="btn btn-ghost" href="' + esc(p.blog) + '" target="_blank" rel="noopener">Blog</a>');
    if (p.email)
      actions.push('<a class="btn btn-ghost" href="mailto:' + esc(p.email) + '">Email</a>');
    $("actions").innerHTML = actions.join("");

    const stats = [
      [p.public_repos, "Public repos"],
      [p.followers, "Followers"],
      [p.following, "Following"],
      ["", ""]
    ];
    if (p.created_at) stats[3] = [dYear(p.created_at), "Member since"];
    $("stats").innerHTML = stats
      .map(([v, l]) => '<div class="stat"><b>' + esc(v) + "</b><span>" + esc(l) + "</span></div>")
      .join("");
  }

  function dYear(iso) {
    const d = new Date(iso);
    return isNaN(d) ? "—" : String(d.getFullYear());
  }

  function repoCard(r) {
    const badge = r.fork
      ? '<span class="card-badge badge-fork">fork</span>'
      : '<span class="card-badge badge-original">original</span>';
    const desc = r.description
      ? '<p class="card-desc">' + esc(r.description) + "</p>"
      : '<p class="card-desc">No description yet.</p>';
    const lang = r.language
      ? '<span class="lang"><span class="lang-dot" style="background:' +
        (LANG_COLORS[r.language] || FALLBACK_LANG) + '"></span>' + esc(r.language) + "</span>"
      : '<span class="lang" style="opacity:.7">—</span>';
    return (
      '<a class="card reveal" href="' + esc(r.html_url) + '" target="_blank" rel="noopener">' +
        '<div class="card-top"><span class="card-name"><span class="repo-icon">◈</span>' + esc(r.name) + "</span>" + badge + "</div>" +
        desc +
        '<div class="card-meta">' +
          lang +
          '<span class="meta-item" title="Stars">★ ' + esc(r.stargazers_count || 0) + "</span>" +
          '<span class="meta-item" title="Forks">⑂ ' + esc(r.forks_count || 0) + "</span>" +
          '<span class="meta-item" title="Last push">⏱ ' + esc(rel(r.pushed_at)) + "</span>" +
        "</div>" +
      "</a>"
    );
  }

  function renderRepos(repos) {
    const originals = repos.filter((r) => !r.fork).sort(byPushed);
    const forks = repos.filter((r) => r.fork).sort(byPushed);
    $("repos").innerHTML = originals.concat(forks).map(repoCard).join("");

    if (originals.length) {
      const top = originals[0];
      $("now-repo").textContent = top.name;
      $("now-repo").href = top.html_url;
      $("now-date").textContent = "Last pushed " + rel(top.pushed_at);
    }
    observeReveals();
  }

  function byPushed(a, b) {
    return new Date(b.pushed_at) - new Date(a.pushed_at);
  }

  function renderChips(skills) {
    $("chips").innerHTML = (skills || [])
      .map((s) => "<li>" + esc(s) + "</li>")
      .join("");
  }

  /* ---------- live refresh ---------- */

  async function fetchJson(url) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { Accept: "application/vnd.github+json" }
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }

  function setBadge(mode, text) {
    const b = $("live-badge");
    b.className = "live-badge " + mode;
    b.textContent = text;
  }

  async function refreshLive() {
    try {
      const [profile, repos] = await Promise.all([
        fetchJson("https://api.github.com/users/Etchebbeari"),
        fetchJson("https://api.github.com/users/Etchebbeari/repos?per_page=100&sort=pushed")
      ]);
      renderProfile({
        login: profile.login,
        name: profile.name,
        bio: profile.bio,
        company: profile.company,
        location: profile.location,
        blog: profile.blog,
        twitter_username: profile.twitter_username,
        email: profile.email,
        html_url: profile.html_url,
        avatar_url: profile.avatar_url,
        public_repos: profile.public_repos,
        followers: profile.followers,
        following: profile.following,
        created_at: profile.created_at
      });
      renderRepos(
        repos.map((r) => ({
          name: r.name,
          full_name: r.full_name,
          description: r.description,
          language: r.language,
          stargazers_count: r.stargazers_count,
          forks_count: r.forks_count,
          open_issues_count: r.open_issues_count,
          fork: r.fork,
          html_url: r.html_url,
          homepage: r.homepage,
          pushed_at: r.pushed_at
        }))
      );
      setBadge("ok", "Live data from GitHub");
    } catch (e) {
      setBadge("off", "Snapshot · " + since(window.SNAPSHOT.fetchedAt));
    }
  }

  /* ---------- scroll reveal ---------- */

  let observer = null;
  function observeReveals() {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("visible"));
      return;
    }
    if (!observer) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              en.target.classList.add("visible");
              observer.unobserve(en.target);
            }
          });
        },
        { threshold: 0.08 }
      );
    }
    document.querySelectorAll(".reveal:not(.visible)").forEach((el) => observer.observe(el));
  }

  /* ---------- init ---------- */

  const snap = window.SNAPSHOT;
  renderProfile(snap.profile);
  renderRepos(snap.repos);
  renderChips(snap.skills);
  observeReveals();
  refreshLive();
})();
