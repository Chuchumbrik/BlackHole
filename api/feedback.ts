/**
 * Serverless-эндпоинт обратной связи (Vercel). Принимает обращение из игры и
 * создаёт GitHub Issue. Токен GitHub живёт ТОЛЬКО в env Vercel (`GITHUB_TOKEN`),
 * никогда не попадает в клиентский бандл.
 *
 * ENV: GITHUB_TOKEN (PAT/GitHub App, scope repo issues),
 *      GITHUB_REPO (вида "owner/repo", по умолчанию Chuchumbrik/BlackHole).
 *
 * Антиспам MVP: honeypot + жёсткие лимиты длины + только POST + CORS со своего
 * домена. Полноценный rate-limit — через Vercel KV/Upstash (TODO).
 */

const MAX_TITLE = 120;
const MAX_DESC = 4000;
const MIN_TITLE = 4;
const MIN_DESC = 10;
const MAX_BODY_BYTES = 20_000;

const TYPE_LABEL: Record<string, string> = {
  bug: "bug",
  improvement: "enhancement",
  other: "feedback",
};
const TYPE_TITLE: Record<string, string> = {
  bug: "Баг",
  improvement: "Улучшение",
  other: "Обращение",
};

function clampStr(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Экранируем потенциально опасное для разметки/упоминаний в issue. */
function sanitizeForMarkdown(s: string): string {
  return s.replace(/@/g, "@​").replace(/\r\n/g, "\n");
}

// Минимальный тип, чтобы не тянуть @vercel/node.
type Req = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};
type Res = {
  status: (code: number) => Res;
  json: (data: unknown) => void;
  setHeader: (k: string, v: string) => void;
};

export default async function handler(req: Req, res: Res): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).json({});
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO ?? "Chuchumbrik/BlackHole";
  if (!token) {
    res.status(500).json({ ok: false, error: "server_not_configured" });
    return;
  }

  let body: Record<string, unknown> = {};
  try {
    body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : ((req.body as Record<string, unknown>) ?? {});
  } catch {
    res.status(400).json({ ok: false, error: "bad_json" });
    return;
  }

  // Honeypot: реальные пользователи это поле не видят и не заполняют.
  if (clampStr(body.company, 50)) {
    res.status(200).json({ ok: true, url: null }); // тихо игнорируем бота
    return;
  }

  const type = ["bug", "improvement", "other"].includes(String(body.type))
    ? String(body.type)
    : "other";
  const title = clampStr(body.title, MAX_TITLE);
  const description = clampStr(body.description, MAX_DESC);
  const context = clampStr(body.context, 2000);

  if (title.length < MIN_TITLE || description.length < MIN_DESC) {
    res.status(422).json({ ok: false, error: "validation" });
    return;
  }

  const issueTitle = `[${TYPE_TITLE[type]}] ${title}`;
  const issueBody = sanitizeForMarkdown(
    [
      `**Тип:** ${TYPE_TITLE[type]}`,
      "",
      "### Описание",
      description,
      context ? "\n### Контекст\n```\n" + context + "\n```" : "",
      "\n---\n_Отправлено из игры через форму обратной связи._",
    ].join("\n"),
  ).slice(0, MAX_BODY_BYTES);

  try {
    const ghRes = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "cosmoblackhole-feedback",
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels: [TYPE_LABEL[type] ?? "feedback"],
      }),
    });
    if (!ghRes.ok) {
      res.status(502).json({ ok: false, error: "github_error" });
      return;
    }
    const data = (await ghRes.json()) as { html_url?: string };
    res.status(200).json({ ok: true, url: data.html_url ?? null });
  } catch {
    res.status(502).json({ ok: false, error: "network" });
  }
}
