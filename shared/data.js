export const cases = {
  "lyrelink": {
    "title": "LyreLink",
    "lead": "A shared setlist. The right part for every musician. Enough resilience to keep practicing when the connection disappears.",
    "role": "Co-founder & Software Engineer",
    "date": "Jul. 2026–Present",
    "stack": "TypeScript · React · Next.js · Ably · Redis · Azure Blob Storage · Vitest · Playwright",
    "sections": [
      {
        "title": "The problem",
        "text": "A director needs to move an ensemble through a set, while each musician needs a different instrument part. Keeping everyone on the same song becomes harder when devices lose connectivity or a cached PDF no longer belongs to the current session."
      },
      {
        "title": "What I built",
        "bullets": [
          "Co-developed the application with my co-founder, using Ably for real-time updates, Redis for shared state, and private Azure Blob storage for sheet music.",
          "Implemented up to seven days of offline practice using service workers and session- and version-scoped PDF caching.",
          "Fixed cache races so stale tabs cannot recreate private files after a purge.",
          "Built customizable director setlists and PDF tools to rotate, combine, and duplicate pages."
        ]
      },
      {
        "title": "A decision that mattered",
        "text": "Offline support is also a data-lifecycle problem. A successful fetch should not be allowed to write a private file after the session that requested it has been purged. I worked on the boundaries around those writes and added regression coverage for the failure paths."
      },
      {
        "title": "Verification",
        "text": "Added Vitest and Playwright coverage for offline recovery, private-cache behavior, and shared-state workflows. Improved test isolation and CI execution so those checks could run reliably."
      }
    ],
    "callout": "Offline should feel dependable. Private should stay private.",
    "flow": [
      "Director changes song",
      "→",
      "Shared state",
      "→",
      "Each musician’s part"
    ],
    "note": "This portfolio includes the public LyreLink About-page demo, with a director phone and two member screens. It runs locally in the browser and uses the same published demonstration scores. It does not connect to a live band."
  },
  "production": {
    "title": "The systems behind the play",
    "lead": "Production engineering across Typing Agent and Yeti Academy: real-time games, durable student progress, and interfaces more students can use.",
    "role": "Full-Stack Software Engineer · Contract",
    "date": "Mar. 2026–Present",
    "stack": "PHP · Yii2 · MySQL · JavaScript · Node.js · Socket.IO · GitHub Actions",
    "sections": [
      {
        "title": "Real-time, with boundaries",
        "text": "Built Node.js and Socket.IO lobbies for three multiplayer games, including JWT-authenticated class isolation, reconnect handling, and persistent scores. For Battleship, I enforced rules on the server to protect hidden boards."
      },
      {
        "title": "Making progress saves dependable",
        "text": "Hardened MySQL progress saves with receipt-based idempotency and bounded deadlock recovery. Integration regressions cover concurrent submissions and lost-response retries, where a client cannot safely assume whether its previous request committed."
      },
      {
        "title": "Making failures actionable",
        "text": "Implemented JavaScript and PHP error monitoring with sanitized diagnostics, release-tagged errors, and a ranked dashboard. That connects a reported failure to the information needed to reproduce and prioritize it."
      },
      {
        "title": "A reusable foundation",
        "bullets": [
          "Designed and shipped Blizzard Defense, then built reusable integrations for 11 additional student games.",
          "Created a shared accessibility library with screen-reader support, high contrast, English/Spanish localization, and saved preferences.",
          "Improved large-district workflows with server-side roster pagination and filtering, plus history-table indexes.",
          "Built GitHub Actions automation and browser regression checks for repeatable testing and release verification."
        ]
      }
    ],
    "callout": "A game can be playful. The boundary around student data has to be precise.",
    "flow": [
      "Authenticated player",
      "→",
      "Authorized class room",
      "→",
      "Server-validated event"
    ],
    "note": "Images include official public product marketing and local standalone/practice game captures. The engineering described here covers my scoped work across Typing Agent and Yeti Academy."
  },
  "tennis": {
    "title": "CourtSide Analytics",
    "lead": "A Streamlit dashboard and CLI for analyzing SwingVision match exports, from single-match review to player comparisons and multi-match timelines.",
    "role": "Independent software project",
    "date": "CourtSide Analytics",
    "stack": "Python · Streamlit · Pandas · Plotly · Excel / CSV",
    "sections": [
      {
        "title": "The input",
        "text": "The app accepts SwingVision Excel workbooks and CSV exports. It normalizes column aliases and reconstructs point-level facts from shot records, with an aggregate Stats/Settings fallback when needed."
      },
      {
        "title": "Useful match context",
        "text": "The dashboard analyzes serving and returning, plus-one transitions, double faults and rally-length outcomes. Player comparisons, filename-based date filters and multi-match timelines make these metrics explorable."
      },
      {
        "title": "One analysis core, two entry points",
        "text": "The Streamlit dashboard and command-line workflow use the same analysis functions. Filtered summaries export to CSV or Excel, while content-keyed disk caching avoids repeating unchanged file analysis."
      },
      {
        "title": "Verification",
        "text": "The repository includes unit coverage for normalization, serve attempts, aggregated denominators, point facts, returns, double faults and plus-one outcomes. The portfolio review ran all 23 existing tests successfully."
      }
    ],
    "callout": "Reconstruct the point. Recompute the rate from its counts.",
    "flow": [
      "SwingVision Excel / CSV",
      "→",
      "Point-level facts",
      "→",
      "Dashboard or CLI"
    ],
    "note": "This project analyzes file-based match exports. It does not track live video or plot shot landing coordinates. Any demonstration capture uses synthetic data."
  }
};
