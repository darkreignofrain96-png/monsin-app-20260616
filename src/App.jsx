import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clipboard,
  Eraser,
  Loader2,
  MessageCircle,
  RotateCcw,
  Send,
  Undo2
} from "lucide-react";

const departmentOptions = ["整形外科", "内科・その他"];

const interestOptions = [
  "再生医療",
  "予防リハビリ",
  "ダイエットプログラム",
  "美容・疲労回復点滴"
];

const clinicNotices = [
  "他の患者の診察があとにも控えているため、一回の診察では原則一部位としております。",
  "診察時間が長くなる場合は、次回診察に持ち越す場合がございます。",
  "当院ではまず最初に問診内容からレントゲン撮影を実施してから診察となりますので、ご了承ください。"
];

const openingQuestions = [
  {
    key: "visitType",
    label: "診療区分",
    question: "今回のご相談内容に近いものを選んでください。",
    required: true,
    type: "singleSelect",
    options: departmentOptions
  },
  {
    key: "patientId",
    label: "患者ID",
    question: "患者IDを入力してください。",
    required: true,
    placeholder: "例: P-00123"
  }
];

const orthopedicQuestions = [
  {
    key: "chiefComplaint",
    label: "主訴",
    question: "今日はどのような症状・お悩みで相談されますか？",
    required: true,
    placeholder: "例: 右膝が痛い、肩が上がりにくい"
  },
  {
    key: "onset",
    label: "発症時期",
    question: "その症状はいつ頃からありますか？",
    required: true,
    placeholder: "例: 3日前から、1か月前から"
  },
  {
    key: "location",
    label: "部位",
    question: "症状がある場所を教えてください。",
    required: true,
    placeholder: "例: 右膝、左肩、首から腕"
  },
  {
    key: "bodySchemaMarks",
    label: "シェーマ",
    question: "シェーマ上で症状のある部位に印をつけてください。",
    type: "bodySchema"
  },
  {
    key: "severity",
    label: "症状の強さ",
    question: "症状の強さを0から10で表すとどれくらいですか？",
    required: true,
    type: "scale"
  },
  {
    key: "trigger",
    label: "きっかけ",
    question: "思い当たるきっかけはありますか？",
    placeholder: "例: 重い物を持った、運動後、特にない"
  },
  {
    key: "injuryMechanism",
    label: "受傷機転",
    question: "けがや痛みが出た瞬間の状況があれば教えてください。",
    placeholder: "例: 足をひねった、転倒した、接触でぶつけた"
  },
  {
    key: "aggravating",
    label: "悪化する動作",
    question: "どのような時に症状が悪化しますか？",
    placeholder: "例: 歩行時、階段、座っている時、起床時"
  },
  {
    key: "relieving",
    label: "軽くなる条件",
    question: "楽になる姿勢や対処はありますか？",
    placeholder: "例: 横になる、冷やす、温める、安静"
  },
  {
    key: "associatedSymptoms",
    label: "関連症状",
    question: "しびれ、発熱、めまい、脱力など、他に気になる症状はありますか？",
    placeholder: "例: 右足にしびれあり、特にない"
  },
  {
    key: "redFlagCheck",
    label: "緊急確認",
    question:
      "強い痛み、麻痺、ろれつが回らない、排尿・排便障害、急な激痛などがあれば入力してください。",
    placeholder: "例: なし、排尿しづらい、強い頭痛"
  },
  {
    key: "job",
    label: "仕事",
    question: "お仕事の内容や、症状に関係しそうな姿勢・動作を教えてください。",
    placeholder: "例: デスクワーク、立ち仕事、重量物を扱う"
  },
  {
    key: "sportsHistory",
    label: "スポーツ歴",
    question: "現在または過去のスポーツ歴・運動習慣を教えてください。",
    placeholder: "例: 週2回ランニング、学生時代サッカー、特になし"
  },
  {
    key: "medicalHistory",
    label: "既往歴",
    question: "これまでの病気、けが、手術歴があれば教えてください。",
    placeholder: "例: 高血圧、腰椎椎間板ヘルニア、特になし"
  },
  {
    key: "medication",
    label: "服薬歴",
    question: "現在飲んでいる薬やサプリがあれば教えてください。",
    placeholder: "例: 降圧薬、痛み止め、特になし"
  },
  {
    key: "allergy",
    label: "アレルギー",
    question: "薬や食品などのアレルギーはありますか？",
    placeholder: "例: なし、ペニシリン"
  }
];

const internalMedicineQuestions = [
  {
    key: "chiefComplaint",
    label: "主訴",
    question: "今日はどのような内科症状・体調不良で相談されますか？",
    required: true,
    placeholder: "例: 発熱、咳、腹痛、倦怠感、めまい"
  },
  {
    key: "onset",
    label: "発症時期",
    question: "その症状はいつ頃からありますか？",
    required: true,
    placeholder: "例: 昨夜から、3日前から、1週間前から"
  },
  {
    key: "course",
    label: "経過",
    question: "症状の経過を教えてください。悪化・改善・波があるなども入力してください。",
    placeholder: "例: 徐々に悪化、朝は軽いが夜に悪化、解熱剤で一時的に改善"
  },
  {
    key: "severity",
    label: "つらさ",
    question: "現在のつらさを0から10で表すとどれくらいですか？",
    required: true,
    type: "scale"
  },
  {
    key: "fever",
    label: "発熱",
    question: "発熱はありますか？最高体温が分かれば教えてください。",
    placeholder: "例: 38.2度、発熱なし、測っていない"
  },
  {
    key: "respiratorySymptoms",
    label: "呼吸器症状",
    question: "咳、痰、喉の痛み、鼻水、息苦しさ、胸痛はありますか？",
    placeholder: "例: 咳と咽頭痛あり、息苦しさなし"
  },
  {
    key: "digestiveSymptoms",
    label: "消化器症状",
    question: "腹痛、吐き気、嘔吐、下痢、便秘、食欲低下はありますか？",
    placeholder: "例: 下痢が3回、吐き気あり、腹痛なし"
  },
  {
    key: "urinarySymptoms",
    label: "泌尿器症状",
    question: "排尿時痛、頻尿、血尿、背中の痛みはありますか？",
    placeholder: "例: 排尿時痛なし、頻尿あり"
  },
  {
    key: "neurologicSymptoms",
    label: "神経症状",
    question: "強い頭痛、めまい、しびれ、麻痺、ろれつが回らないなどはありますか？",
    placeholder: "例: めまいあり、麻痺なし、ろれつ問題なし"
  },
  {
    key: "redFlagCheck",
    label: "緊急確認",
    question:
      "強い胸痛、強い息苦しさ、意識がぼんやりする、片側の麻痺、激しい頭痛、血便・吐血などがあれば入力してください。",
    placeholder: "例: なし、強い胸痛あり"
  },
  {
    key: "exposureHistory",
    label: "感染・接触歴",
    question: "周囲に同じ症状の方はいますか？最近の旅行、会食、感染症の診断歴があれば教えてください。",
    placeholder: "例: 家族が発熱、職場でインフルエンザ、特になし"
  },
  {
    key: "pregnancyPossibility",
    label: "妊娠可能性",
    question: "妊娠中、授乳中、または妊娠の可能性はありますか？該当しなければ「該当なし」と入力してください。",
    placeholder: "例: 該当なし、妊娠の可能性あり、授乳中"
  },
  {
    key: "job",
    label: "仕事・生活への影響",
    question: "お仕事や日常生活への影響があれば教えてください。",
    placeholder: "例: 仕事を休んでいる、食事が取れない、睡眠が妨げられる"
  },
  {
    key: "sportsHistory",
    label: "スポーツ歴",
    question: "現在または過去のスポーツ歴・運動習慣を教えてください。",
    placeholder: "例: 週2回ジム、学生時代野球、特になし"
  },
  {
    key: "medicalHistory",
    label: "既往歴",
    question: "これまでの病気、通院中の病気、手術歴があれば教えてください。",
    placeholder: "例: 高血圧、糖尿病、喘息、特になし"
  },
  {
    key: "medication",
    label: "服薬歴",
    question: "現在飲んでいる薬、サプリ、市販薬があれば教えてください。",
    placeholder: "例: 降圧薬、解熱剤、漢方、特になし"
  },
  {
    key: "allergy",
    label: "アレルギー",
    question: "薬や食品などのアレルギーはありますか？",
    placeholder: "例: なし、ペニシリン、NSAIDs"
  }
];

const closingQuestions = [
  {
    key: "interests",
    label: "興味がある項目",
    question: "以下の項目で興味があるものを選択してください。",
    type: "multiSelect",
    options: interestOptions
  },
  {
    key: "additionalConsultation",
    label: "他に相談したいこと",
    question: "他に相談したいことがあれば自由に入力してください。",
    placeholder: "例: 治療期間、費用、仕事復帰、競技復帰について相談したい"
  }
];

function getQuestions(answers = {}) {
  if (!answers.visitType) return [openingQuestions[0]];
  const branch = answers.visitType === "内科・その他" ? internalMedicineQuestions : orthopedicQuestions;
  return [...openingQuestions, ...branch, ...closingQuestions];
}

function defaultDraft(question) {
  if (!question) return "";
  if (question.type === "multiSelect") return [];
  if (question.type === "bodySchema") return JSON.stringify({ marks: [], note: "" });
  return "";
}

function isEmptyAnswer(value) {
  if (Array.isArray(value)) return value.length === 0;
  if (value === null || value === undefined) return true;
  return String(value).trim() === "";
}

async function apiJson(path, { method = "GET", body } = {}) {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "処理に失敗しました。");
  return data;
}

function loadLiffSdk() {
  if (window.liff) return Promise.resolve(window.liff);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-liff-sdk]");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.liff));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
    script.async = true;
    script.dataset.liffSdk = "true";
    script.onload = () => resolve(window.liff);
    script.onerror = reject;
    document.head.appendChild(script);
  });
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

function bodySchemaLabel(value) {
  const schema = parseBodySchema(value);
  const marks = schema.marks.length ? `${schema.marks.length}か所に印` : "印なし";
  return schema.note ? `${marks}、補足: ${schema.note}` : marks;
}

function renderAnswer(question, value) {
  if (question.type === "multiSelect") {
    return Array.isArray(value) && value.length ? value.join("、") : "なし";
  }
  if (question.type === "bodySchema") return bodySchemaLabel(value);
  return value || "なし";
}

function slackStatusLabel(status) {
  if (status === "sent") return "送信済み";
  if (status === "not_configured") return "Slack未設定";
  if (status?.startsWith("failed")) return "送信失敗";
  return "未送信";
}

function IntakeBubble({ type, children }) {
  return <div className={`intake-bubble ${type}`}>{children}</div>;
}

function StatusChip({ ok, children }) {
  return (
    <span className={ok ? "status-chip ok" : "status-chip warn"}>
      {ok ? <Check size={14} /> : <AlertCircle size={14} />}
      {children}
    </span>
  );
}

function BodySchemaCanvas({ value, onChange }) {
  const schema = parseBodySchema(value);

  const update = (next) => {
    onChange(JSON.stringify(next));
  };

  const addMark = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    update({
      ...schema,
      marks: [...schema.marks, { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) }]
    });
  };

  return (
    <div className="schema-panel">
      <div className="schema-toolbar" aria-label="シェーマ操作">
        <button type="button" onClick={() => update({ ...schema, marks: schema.marks.slice(0, -1) })} disabled={!schema.marks.length}>
          <Undo2 size={16} />
          <span>戻す</span>
        </button>
        <button type="button" onClick={() => update({ ...schema, marks: [] })} disabled={!schema.marks.length}>
          <Eraser size={16} />
          <span>消す</span>
        </button>
      </div>

      <button type="button" className="schema-canvas" onClick={addMark} aria-label="症状部位をシェーマに追加">
        <img src="/intake-schema.png" alt="症状のある部位に印をつけるための人体シェーマ" />
        {schema.marks.map((mark, index) => (
          <span
            key={`${mark.x}-${mark.y}-${index}`}
            className="schema-mark"
            style={{ left: `${mark.x}%`, top: `${mark.y}%` }}
          />
        ))}
      </button>

      <label className="schema-note">
        <span>補足</span>
        <textarea
          value={schema.note}
          onChange={(event) => update({ ...schema, note: event.target.value })}
          placeholder="例: 右膝内側を中心に痛い"
          rows={2}
        />
      </label>
    </div>
  );
}

function IntakeAnswerInput({ question, value, setValue, onSubmit, onSkip, busy }) {
  if (question.type === "singleSelect") {
    return (
      <div className="choice-grid">
        {question.options.map((option) => (
          <button key={option} type="button" className="choice-button" onClick={() => onSubmit(option)} disabled={busy}>
            {option}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "multiSelect") {
    const selected = Array.isArray(value) ? value : [];
    const toggle = (option) => {
      setValue(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
    };

    return (
      <>
        <div className="choice-grid">
          {question.options.map((option) => (
            <button
              key={option}
              type="button"
              className={selected.includes(option) ? "choice-button selected" : "choice-button"}
              onClick={() => toggle(option)}
              disabled={busy}
            >
              {selected.includes(option) && <Check size={16} />}
              <span>{option}</span>
            </button>
          ))}
        </div>
        <div className="intake-actions">
          <button className="secondary-button" type="button" onClick={onSkip} disabled={busy}>
            なし
          </button>
          <button className="primary-button" type="button" onClick={() => onSubmit(selected)} disabled={busy}>
            次へ
          </button>
        </div>
      </>
    );
  }

  if (question.type === "scale") {
    return (
      <>
        <div className="scale-grid">
          {Array.from({ length: 11 }, (_, index) => (
            <button
              key={index}
              type="button"
              className={String(value) === String(index) ? "scale-button selected" : "scale-button"}
              onClick={() => setValue(String(index))}
              disabled={busy}
            >
              {index}
            </button>
          ))}
        </div>
        <div className="intake-actions">
          <button className="primary-button" type="button" onClick={() => onSubmit(value)} disabled={busy || isEmptyAnswer(value)}>
            次へ
          </button>
        </div>
      </>
    );
  }

  if (question.type === "bodySchema") {
    return (
      <>
        <BodySchemaCanvas value={value} onChange={setValue} />
        <div className="intake-actions">
          <button className="secondary-button" type="button" onClick={onSkip} disabled={busy}>
            スキップ
          </button>
          <button className="primary-button" type="button" onClick={() => onSubmit(value)} disabled={busy}>
            次へ
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <textarea
        className="answer-textarea"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={question.placeholder || "入力してください"}
        rows={4}
        disabled={busy}
      />
      <div className="intake-actions">
        {!question.required && (
          <button className="secondary-button" type="button" onClick={onSkip} disabled={busy}>
            なし
          </button>
        )}
        <button className="primary-button" type="button" onClick={() => onSubmit(value)} disabled={busy}>
          次へ
        </button>
      </div>
    </>
  );
}

function IntakeApp() {
  const [config, setConfig] = useState(null);
  const [liffProfile, setLiffProfile] = useState(null);
  const [startedAt] = useState(new Date().toISOString());
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const questions = useMemo(() => getQuestions(answers), [answers]);
  const currentQuestion = questions[step];
  const completed = step >= questions.length;

  useEffect(() => {
    setDraft(defaultDraft(currentQuestion));
  }, [currentQuestion?.key]);

  useEffect(() => {
    let active = true;

    async function boot() {
      try {
        const data = await apiJson("/api/config");
        if (!active) return;
        setConfig(data);

        if (data.liffId) {
          const liff = await loadLiffSdk();
          await liff.init({ liffId: data.liffId });
          if (!liff.isLoggedIn()) {
            liff.login({ redirectUri: window.location.href });
            return;
          }
          const profile = await liff.getProfile();
          if (active) {
            setLiffProfile({
              mode: liff.isInClient() ? "line" : "browser",
              userId: profile.userId,
              displayName: profile.displayName
            });
          }
        } else {
          setLiffProfile({ mode: "preview", displayName: "プレビュー" });
        }
      } catch (bootError) {
        if (active) setError(bootError.message || "問診画面の起動に失敗しました。");
      }
    }

    boot();
    return () => {
      active = false;
    };
  }, []);

  const answerQuestion = (value) => {
    if (!currentQuestion) return;
    const normalized = Array.isArray(value) ? value : String(value ?? "").trim();
    setError("");

    if (currentQuestion.required && isEmptyAnswer(normalized)) {
      setError(`${currentQuestion.label}を入力してください。`);
      return;
    }

    setAnswers((current) => ({
      ...current,
      [currentQuestion.key]: isEmptyAnswer(normalized) ? "なし" : normalized
    }));
    setStep((current) => current + 1);
  };

  const goBack = () => {
    setError("");
    setStep((current) => Math.max(0, current - 1));
    const previous = questions[Math.max(0, step - 1)];
    if (previous) {
      setDraft(answers[previous.key] ?? defaultDraft(previous));
    }
  };

  const reset = () => {
    setAnswers({});
    setStep(0);
    setResult(null);
    setError("");
  };

  const submitIntake = async () => {
    setSubmitting(true);
    setError("");

    try {
      const data = await apiJson("/api/intake/complete", {
        method: "POST",
        body: {
          answers,
          startedAt,
          clinicNoticeShown: true,
          lineUserId: liffProfile?.userId || ""
        }
      });
      setResult(data);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copySummary = async () => {
    const text = result?.summary?.soapSubjective || result?.intake?.soapSubjective || "";
    if (text) await navigator.clipboard.writeText(text);
  };

  const progress = Math.round((Math.min(step, questions.length) / questions.length) * 100);
  const slackStatus = result?.meta?.slackStatus || "";
  const slackSent = slackStatus === "sent";

  return (
    <div className="intake-shell">
      <header className="intake-header">
        <div>
          <div className="brand">
            <MessageCircle size={24} />
            <span>事前問診</span>
          </div>
          <p>回答内容を医学的に要約し、SOAPのS形式でスタッフへ共有します。</p>
        </div>
        <div className="header-status">
          <StatusChip ok={Boolean(config?.openaiConfigured)}>AI</StatusChip>
          <StatusChip ok={Boolean(config?.slackConfigured)}>Slack</StatusChip>
          <span className="mode-chip">{config?.liffId ? "LINE" : "プレビュー"}</span>
        </div>
      </header>

      <div className="progress-track" aria-label={`進捗 ${progress}%`}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <main className="intake-main">
        {!result && (
          <div className="chat-panel">
            <IntakeBubble type="bot">こんにちは。症状について順番にお伺いします。</IntakeBubble>

            {questions.slice(0, step).map((question) => (
              <div key={question.key} className="intake-turn">
                <IntakeBubble type="bot">{question.question}</IntakeBubble>
                <IntakeBubble type="user">{renderAnswer(question, answers[question.key])}</IntakeBubble>
              </div>
            ))}

            {!completed && currentQuestion && (
              <div className="intake-turn">
                <IntakeBubble type="bot">{currentQuestion.question}</IntakeBubble>
                <div className="input-panel">
                  <IntakeAnswerInput
                    question={currentQuestion}
                    value={draft}
                    setValue={setDraft}
                    onSubmit={answerQuestion}
                    onSkip={() => answerQuestion("なし")}
                    busy={submitting}
                  />
                </div>
              </div>
            )}

            {completed && (
              <section className="review-panel">
                <h1>確認</h1>
                <div className="review-list">
                  {questions.map((question) => (
                    <div key={question.key} className="review-row">
                      <span>{question.label}</span>
                      <strong>{renderAnswer(question, answers[question.key])}</strong>
                    </div>
                  ))}
                </div>

                <div className="notice-panel">
                  <h2>当院の注意事項</h2>
                  {clinicNotices.map((notice) => (
                    <p key={notice}>{notice}</p>
                  ))}
                </div>

                <div className="intake-actions sticky-actions">
                  <button className="secondary-button" type="button" onClick={goBack} disabled={submitting}>
                    <ArrowLeft size={17} />
                    戻る
                  </button>
                  <button className="primary-button large" type="button" onClick={submitIntake} disabled={submitting}>
                    {submitting ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
                    送信
                  </button>
                </div>
              </section>
            )}
          </div>
        )}

        {result && (
          <section className="result-panel">
            <div className={slackSent ? "result-icon ok" : "result-icon warn"}>
              {slackSent ? <Check size={28} /> : <AlertCircle size={28} />}
            </div>
            <h1>{slackSent ? "問診要約をSlackに送信しました" : "問診要約を作成しました"}</h1>
            <p>
              Slack通知: {slackStatusLabel(slackStatus)}
              {!slackSent ? "。Slackの環境変数を確認してください。" : ""}
            </p>

            <div className="summary-box">
              <pre>{result.summary?.soapSubjective || result.intake?.soapSubjective}</pre>
            </div>

            <div className="intake-actions">
              <button className="secondary-button" type="button" onClick={copySummary}>
                <Clipboard size={17} />
                要約をコピー
              </button>
              <button className="primary-button" type="button" onClick={reset}>
                <RotateCcw size={17} />
                新しく問診
              </button>
            </div>
          </section>
        )}

        {step > 0 && !completed && !result && (
          <button className="back-link" type="button" onClick={goBack}>
            <ArrowLeft size={16} />
            前の質問へ
          </button>
        )}

        {error && <p className="error-message">{error}</p>}
      </main>
    </div>
  );
}

export default function App() {
  return <IntakeApp />;
}
