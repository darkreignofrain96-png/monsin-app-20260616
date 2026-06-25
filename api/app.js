import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import OpenAI from "openai";

const app = express();
const appVersion = "2026-06-25-slack-upload-form";

app.use(express.json({ limit: "3mb" }));

const answerLabels = {
  visitType: "診療区分",
  patientId: "患者ID",
  chiefComplaint: "主訴",
  onset: "発症時期",
  location: "部位",
  bodySchemaMarks: "シェーマ",
  severity: "症状の強さ",
  trigger: "きっかけ",
  injuryMechanism: "受傷機転",
  aggravating: "悪化する動作",
  relieving: "軽くなる条件",
  associatedSymptoms: "関連症状",
  redFlagCheck: "緊急確認",
  job: "仕事",
  sportsHistory: "スポーツ歴",
  medicalHistory: "既往歴",
  medication: "服薬歴",
  allergy: "アレルギー",
  course: "経過",
  fever: "発熱",
  respiratorySymptoms: "呼吸器症状",
  digestiveSymptoms: "消化器症状",
  urinarySymptoms: "泌尿器症状",
  neurologicSymptoms: "神経症状",
  exposureHistory: "感染・接触歴",
  pregnancyPossibility: "妊娠可能性",
  interests: "興味項目",
  additionalConsultation: "他に相談したいこと"
};

const summarySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "chiefComplaint",
    "presentIllness",
    "pmh",
    "med",
    "allergy",
    "sports",
    "job",
    "redFlags",
    "urgencyLevel",
    "interests",
    "additionalConsultation",
    "soapSubjective"
  ],
  properties: {
    chiefComplaint: { type: "string" },
    presentIllness: { type: "string" },
    pmh: { type: "string" },
    med: { type: "string" },
    allergy: { type: "string" },
    sports: { type: "string" },
    job: { type: "string" },
    redFlags: { type: "string" },
    urgencyLevel: { type: "string", enum: ["通常", "要確認", "緊急確認"] },
    interests: { type: "string" },
    additionalConsultation: { type: "string" },
    soapSubjective: { type: "string" }
  }
};

function answerValue(answers = {}, key, fallback = "発言なし") {
  const value = answers?.[key];
  if (Array.isArray(value)) return value.length ? value.join("、") : fallback;
  if (value === null || value === undefined || String(value).trim() === "") return fallback;
  return String(value).trim();
}

function parseBodySchema(value) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return {
      marks: Array.isArray(parsed?.marks) ? parsed.marks : [],
      note: parsed?.note || ""
    };
  } catch {
    return { marks: [], note: "" };
  }
}

function describeBodySchema(value) {
  const schema = parseBodySchema(value);
  const marks = schema.marks.length ? `${schema.marks.length}か所に印あり` : "印なし";
  return schema.note ? `${marks}、補足: ${schema.note}` : marks;
}

function compactAnswers(answers = {}) {
  return Object.fromEntries(
    Object.entries(answers).map(([key, value]) => [
      key,
      key === "bodySchemaMarks" ? describeBodySchema(value) : Array.isArray(value) ? value.join("、") : String(value ?? "")
    ])
  );
}

function buildPrompt(answers = {}) {
  const compact = compactAnswers(answers);
  const lines = Object.entries(answerLabels).map(([key, label]) => `${label}: ${compact[key] || "発言なし"}`);

  return `あなたは医療者向けの問診要約アシスタントです。
患者の回答を、正式記録の下書きとして使えるようにSOAPのS部分へ要約してください。

ルール:
- 日本語で出力する。
- 口語を医学用語へ変換する。
- 回答にない情報は推測せず、「発言なし」と書く。
- 氏名、住所、勤務先、地名、電話番号などの個人情報が含まれる場合は [個人情報] とマスキングする。
- S) には主訴と現病歴を簡潔にまとめる。
- PMHは既往歴、Medは服薬歴、Allergyはアレルギー、Sportsはスポーツ歴、Jobは仕事を記載する。
- 緊急確認事項がある場合は redFlags と urgencyLevel に反映する。
- soapSubjective は必ず次の形式で作る。

S)
PMH：
Med：
Allergy：
Sports：
Job：

回答:
${lines.join("\n")}`;
}

function buildFallbackSummary(answers = {}) {
  const visitType = answerValue(answers, "visitType");
  const chiefComplaint = answerValue(answers, "chiefComplaint");
  const onset = answerValue(answers, "onset");
  const location = answerValue(answers, "location");
  const severity = answerValue(answers, "severity");
  const course = answerValue(answers, "course");
  const trigger = answerValue(answers, "trigger");
  const injuryMechanism = answerValue(answers, "injuryMechanism");
  const aggravating = answerValue(answers, "aggravating");
  const relieving = answerValue(answers, "relieving");
  const associatedSymptoms = answerValue(answers, "associatedSymptoms");
  const schema = describeBodySchema(answers.bodySchemaMarks);
  const redFlags = answerValue(answers, "redFlagCheck");
  const pmh = answerValue(answers, "medicalHistory");
  const med = answerValue(answers, "medication");
  const allergy = answerValue(answers, "allergy");
  const sports = answerValue(answers, "sportsHistory");
  const job = answerValue(answers, "job");
  const interests = answerValue(answers, "interests", "なし");
  const additionalConsultation = answerValue(answers, "additionalConsultation", "なし");

  const presentIllness =
    visitType === "内科・その他"
      ? `${chiefComplaint}を主訴に相談。${onset}より症状あり。経過は${course}。症状の強さはNRS ${severity}/10。発熱: ${answerValue(
          answers,
          "fever"
        )}。呼吸器症状: ${answerValue(answers, "respiratorySymptoms")}。消化器症状: ${answerValue(
          answers,
          "digestiveSymptoms"
        )}。泌尿器症状: ${answerValue(answers, "urinarySymptoms")}。神経症状: ${answerValue(
          answers,
          "neurologicSymptoms"
        )}。感染・接触歴: ${answerValue(answers, "exposureHistory")}。妊娠可能性: ${answerValue(
          answers,
          "pregnancyPossibility"
        )}。`
      : `${chiefComplaint}を主訴に相談。${onset}より${location}に症状あり。シェーマ: ${schema}。症状の強さはNRS ${severity}/10。きっかけ: ${trigger}。受傷機転: ${injuryMechanism}。悪化因子: ${aggravating}。軽減因子: ${relieving}。関連症状: ${associatedSymptoms}。`;

  return {
    chiefComplaint,
    presentIllness,
    pmh,
    med,
    allergy,
    sports,
    job,
    redFlags,
    urgencyLevel: redFlags === "発言なし" || redFlags === "なし" ? "通常" : "要確認",
    interests,
    additionalConsultation,
    soapSubjective: `S) ${presentIllness}
PMH：${pmh}
Med：${med}
Allergy：${allergy}
Sports：${sports}
Job：${job}`
  };
}

function parseOutputJson(response) {
  if (response.output_text) return JSON.parse(response.output_text);

  const text = response.output
    ?.flatMap((item) => item.content || [])
    ?.map((content) => content.text || "")
    ?.join("");

  if (!text) throw new Error("AI要約の結果が空でした。");
  return JSON.parse(text);
}

async function summarizeAnswers(answers = {}) {
  const textModel = process.env.OPENAI_TEXT_MODEL || "gpt-5.4-mini";

  if (!process.env.OPENAI_API_KEY) {
    return {
      summary: buildFallbackSummary(answers),
      meta: {
        aiModel: "demo",
        message: "OPENAI_API_KEYが未設定のため、デモ用の要約を返しました。"
      }
    };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.responses.create({
    model: textModel,
    input: buildPrompt(answers),
    text: {
      format: {
        type: "json_schema",
        name: "intake_subjective",
        strict: true,
        schema: summarySchema
      }
    }
  });

  return {
    summary: parseOutputJson(response),
    meta: {
      aiModel: textModel,
      message: ""
    }
  };
}

function hashLineUserId(lineUserId = "") {
  if (!lineUserId) return "";
  const secret = process.env.LINE_USER_HASH_SECRET || "local-dev-secret";
  return crypto.createHmac("sha256", secret).update(lineUserId).digest("hex");
}

function slackCodeBlock(text) {
  return String(text || "発言なし").replace(/```/g, "'''").trim();
}

function buildSlackText(intake) {
  const copyText = slackCodeBlock(intake.summary.soapSubjective);
  const lines = [
    "*問診要約*",
    "*コピペ用S（この枠内だけコピー）*",
    "```",
    copyText,
    "```",
    "",
    "*確認用情報*",
    `診療区分: ${intake.visitType || "未入力"}`,
    `患者ID: ${intake.patientId || "未入力"}`,
    `緊急度: ${intake.summary.urgencyLevel || "通常"}`,
    `主訴: ${intake.summary.chiefComplaint || "発言なし"}`,
    `興味項目: ${intake.summary.interests || "なし"}`,
    `他に相談したいこと: ${intake.summary.additionalConsultation || "なし"}`
  ];

  if (intake.summary.redFlags && !["なし", "発言なし"].includes(intake.summary.redFlags)) {
    lines.push(`緊急確認事項: ${intake.summary.redFlags}`);
  }

  return lines.join("\n");
}

function envValue(name) {
  return String(process.env[name] || "").trim();
}

function hasSlackWebhookConfig() {
  return Boolean(envValue("SLACK_WEBHOOK_URL"));
}

function hasSlackFileUploadConfig() {
  return Boolean(envValue("SLACK_BOT_TOKEN") && envValue("SLACK_CHANNEL_ID"));
}

function slackConfigState() {
  const hasWebhook = hasSlackWebhookConfig();
  const hasBotToken = Boolean(envValue("SLACK_BOT_TOKEN"));
  const hasChannelId = Boolean(envValue("SLACK_CHANNEL_ID"));
  const hasFileUpload = hasBotToken && hasChannelId;
  const missingForText = hasWebhook || hasFileUpload
    ? []
    : ["SLACK_WEBHOOK_URL", "または SLACK_BOT_TOKEN + SLACK_CHANNEL_ID"];
  const missingForImage = hasFileUpload
    ? []
    : [
        hasBotToken ? "" : "SLACK_BOT_TOKEN",
        hasChannelId ? "" : "SLACK_CHANNEL_ID"
      ].filter(Boolean);

  return {
    slackConfigured: hasWebhook || hasFileUpload,
    slackImageConfigured: hasFileUpload,
    slackMode: hasFileUpload ? "bot" : hasWebhook ? "webhook" : "none",
    slackMissing: missingForText,
    slackImageMissing: missingForImage
  };
}

function schemaImageBuffer(dataUrl = "") {
  if (!dataUrl) return null;

  const match = String(dataUrl).match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;

  const buffer = Buffer.from(match[1], "base64");
  if (!buffer.length) return null;
  if (buffer.length > 2 * 1024 * 1024) {
    throw new Error("シェーマ画像が大きすぎます。");
  }
  return buffer;
}

async function slackApiRaw(method, body = {}) {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${envValue("SLACK_BOT_TOKEN")}`,
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  return { response, data };
}

function responseScopes(response, headerName) {
  return String(response.headers.get(headerName) || "")
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function slackMethodResult(method, response, data) {
  return {
    method,
    ok: Boolean(response.ok && data.ok),
    error: data.ok ? "" : data.error || `Slack API error: ${response.status}`,
    needed: data.needed || "",
    provided: data.provided || "",
    acceptedScopes: responseScopes(response, "x-accepted-oauth-scopes"),
    currentScopes: responseScopes(response, "x-oauth-scopes")
  };
}

function throwSlackApiError(method, response, data) {
  const details = [data.error || `Slack API error: ${response.status}`];
  if (data.needed) details.push(`needed=${data.needed}`);
  if (data.provided) details.push(`provided=${data.provided}`);

  const messages = data.response_metadata?.messages;
  if (Array.isArray(messages) && messages.length) {
    details.push(`details=${messages.join(", ")}`);
  }

  const acceptedScopes = response.headers.get("x-accepted-oauth-scopes");
  const currentScopes = response.headers.get("x-oauth-scopes");
  if (acceptedScopes) details.push(`accepted=${acceptedScopes}`);
  if (currentScopes) details.push(`current=${currentScopes}`);

  throw new Error(`${method}: ${details.join(" / ")}`);
}

async function slackApi(method, body) {
  const { response, data } = await slackApiRaw(method, body);
  if (!response.ok || !data.ok) {
    throwSlackApiError(method, response, data);
  }
  return data;
}

async function slackFormApi(method, fields) {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${envValue("SLACK_BOT_TOKEN")}`,
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
    },
    body: new URLSearchParams(
      Object.entries(fields).map(([key, value]) => [key, String(value)])
    ).toString()
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throwSlackApiError(method, response, data);
  }
  return data;
}

async function slackDiagnostics() {
  const config = slackConfigState();
  const token = envValue("SLACK_BOT_TOKEN");
  const requiredScopes = ["chat:write", "files:write"];

  if (!token) {
    return {
      ...config,
      appVersion,
      tokenConfigured: false,
      tokenType: "none",
      authenticated: false,
      authError: "SLACK_BOT_TOKEN is not configured",
      currentScopes: [],
      requiredScopes,
      missingScopes: requiredScopes
    };
  }

  const [
    { response: authResponse, data: authData },
    { response: messageResponse, data: messageData },
    { response: fileResponse, data: fileData }
  ] = await Promise.all([
    slackApiRaw("auth.test"),
    slackApiRaw("chat.postMessage"),
    slackApiRaw("files.getUploadURLExternal")
  ]);
  const methodChecks = [
    slackMethodResult("chat.postMessage", messageResponse, messageData),
    slackMethodResult("files.getUploadURLExternal", fileResponse, fileData)
  ];
  const currentScopes = [
    ...new Set([
      ...responseScopes(authResponse, "x-oauth-scopes"),
      ...methodChecks.flatMap((check) => check.currentScopes)
    ])
  ];

  return {
    ...config,
    appVersion,
    tokenConfigured: true,
    tokenType: token.startsWith("xoxb-") ? "bot" : "unexpected",
    authenticated: Boolean(authResponse.ok && authData.ok),
    authError: authData.ok ? "" : authData.error || `Slack API error: ${authResponse.status}`,
    currentScopes,
    requiredScopes,
    missingScopes: requiredScopes.filter((scope) => !currentScopes.includes(scope)),
    methodChecks
  };
}

async function postSlackWebhook(text) {
  const response = await fetch(envValue("SLACK_WEBHOOK_URL"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    throw new Error(`Slack通知に失敗しました: ${response.status}`);
  }
}

async function postSlackMessage(text) {
  await slackApi("chat.postMessage", {
    channel: envValue("SLACK_CHANNEL_ID"),
    text
  });
}

async function uploadSlackSchemaImage({ buffer, intake, initialComment }) {
  const fileId = String(intake.patientId || intake.intakeId || "unknown")
    .replace(/[^A-Za-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  const filename = `intake-schema-${fileId || "unknown"}.png`;
  const title = `問診シェーマ ${intake.patientId || ""}`.trim();
  const uploadTicket = await slackFormApi("files.getUploadURLExternal", {
    filename,
    length: buffer.length
  });

  const uploadResponse = await fetch(uploadTicket.upload_url, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: buffer
  });

  if (!uploadResponse.ok) {
    throw new Error(`Slack画像アップロードに失敗しました: ${uploadResponse.status}`);
  }

  await slackApi("files.completeUploadExternal", {
    channel_id: envValue("SLACK_CHANNEL_ID"),
    initial_comment: initialComment,
    files: [{ id: uploadTicket.file_id, title }]
  });
}

async function notifySlack(intake) {
  const text = buildSlackText(intake);
  const imageBuffer = schemaImageBuffer(intake.schemaImageDataUrl);

  if (imageBuffer && hasSlackFileUploadConfig()) {
    try {
      await uploadSlackSchemaImage({ buffer: imageBuffer, intake, initialComment: text });
      return { status: "sent", imageStatus: "sent", notifiedAt: new Date().toISOString() };
    } catch (imageError) {
      if (!hasSlackWebhookConfig()) throw imageError;

      await postSlackWebhook(
        `${text}\n\n※シェーマ画像の送信に失敗しました: ${imageError.message}`
      );
      return {
        status: "sent",
        imageStatus: `failed: ${imageError.message}`,
        notifiedAt: new Date().toISOString()
      };
    }
  }

  if (hasSlackWebhookConfig()) {
    const imageNote =
      imageBuffer && !hasSlackFileUploadConfig()
        ? "\n\n※シェーマ画像をSlackに添付するには、SLACK_BOT_TOKEN と SLACK_CHANNEL_ID の設定が必要です。"
        : "";
    await postSlackWebhook(`${text}${imageNote}`);
    return {
      status: "sent",
      imageStatus: imageBuffer ? "not_configured" : "none",
      notifiedAt: new Date().toISOString()
    };
  }

  if (hasSlackFileUploadConfig()) {
    await postSlackMessage(text);
    return {
      status: "sent",
      imageStatus: imageBuffer ? "failed: no_image_upload" : "none",
      notifiedAt: new Date().toISOString()
    };
  }

  return { status: "not_configured", imageStatus: imageBuffer ? "not_configured" : "none", notifiedAt: "" };
}

function buildIntake({ body, summary, meta }) {
  const answers = compactAnswers(body.answers || {});
  return {
    intakeId: body.intakeId || crypto.randomUUID(),
    patientId: answerValue(body.answers, "patientId", ""),
    lineUserIdHash: hashLineUserId(body.lineUserId),
    visitType: answerValue(body.answers, "visitType", ""),
    startedAt: body.startedAt || "",
    completedAt: new Date().toISOString(),
    clinicNoticeShown: Boolean(body.clinicNoticeShown),
    answers,
    summary,
    schemaImageDataUrl: typeof body.schemaImage === "string" ? body.schemaImage : "",
    aiModel: meta.aiModel || "",
    source: "liff-intake"
  };
}

app.get("/api/config", (req, res) => {
  const slackConfig = slackConfigState();
  res.json({
    appVersion,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    ...slackConfig,
    liffId: process.env.LIFF_ID || "",
    textModel: process.env.OPENAI_TEXT_MODEL || "gpt-5.4-mini"
  });
});

app.get("/api/slack/diagnostics", async (req, res, next) => {
  try {
    res.json(await slackDiagnostics());
  } catch (error) {
    next(error);
  }
});

app.post("/api/intake/complete", async (req, res, next) => {
  try {
    const patientId = answerValue(req.body.answers, "patientId", "");
    if (!patientId) {
      res.status(400).json({ error: "患者IDを入力してください。" });
      return;
    }

    const result = await summarizeAnswers(req.body.answers || {});
    const intakeBase = buildIntake({
      body: req.body,
      summary: result.summary,
      meta: result.meta
    });

    let slack;
    try {
      slack = await notifySlack(intakeBase);
    } catch (slackError) {
      slack = { status: `failed: ${slackError.message}`, imageStatus: "failed", notifiedAt: "" };
    }

    const { schemaImageDataUrl, ...publicIntakeBase } = intakeBase;
    const intake = {
      ...publicIntakeBase,
      schemaImageAttached: slack.imageStatus === "sent",
      slackStatus: slack.status,
      slackImageStatus: slack.imageStatus,
      slackNotifiedAt: slack.notifiedAt
    };

    res.json({
      intake,
      summary: result.summary,
      meta: {
        ...result.meta,
        slackStatus: slack.status,
        slackImageStatus: slack.imageStatus,
        deliveryTarget: "slack",
        sheetStored: false,
        spreadsheetStored: false
      }
    });
  } catch (error) {
    next(error);
  }
});

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  console.error(error);
  res.status(500).json({
    error: error.message || "サーバー処理に失敗しました。"
  });
});

export default app;
