import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import OpenAI from "openai";

const app = express();

app.use(express.json({ limit: "1mb" }));

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
  const value = answers[key];
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

function buildSlackText(intake) {
  const lines = [
    "*問診要約*",
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

  lines.push("", "*SOAP S*", "```", intake.summary.soapSubjective || "発言なし", "```");
  return lines.join("\n");
}

async function notifySlack(intake) {
  if (!process.env.SLACK_WEBHOOK_URL) {
    return { status: "not_configured", notifiedAt: "" };
  }

  const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: buildSlackText(intake) })
  });

  if (!response.ok) {
    throw new Error(`Slack通知に失敗しました: ${response.status}`);
  }

  return { status: "sent", notifiedAt: new Date().toISOString() };
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
    aiModel: meta.aiModel || "",
    source: "liff-intake"
  };
}

app.get("/api/config", (req, res) => {
  res.json({
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    slackConfigured: Boolean(process.env.SLACK_WEBHOOK_URL),
    liffId: process.env.LIFF_ID || "",
    textModel: process.env.OPENAI_TEXT_MODEL || "gpt-5.4-mini"
  });
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
      slack = { status: `failed: ${slackError.message}`, notifiedAt: "" };
    }

    const intake = {
      ...intakeBase,
      slackStatus: slack.status,
      slackNotifiedAt: slack.notifiedAt
    };

    res.json({
      intake,
      summary: result.summary,
      meta: {
        ...result.meta,
        slackStatus: slack.status,
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
