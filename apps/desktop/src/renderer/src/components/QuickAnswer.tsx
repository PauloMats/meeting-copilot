import { answerPreview, type Answer } from "@meeting-copilot/contracts";
import { AsyncIconButton } from "./AsyncIconButton";

export function QuickAnswer({
  answer,
  labels,
  copied,
  pinned,
  expanded,
  model,
  onCopy,
  onPin,
  onDiscard
}: {
  answer: Answer;
  labels: {
    sayThis: string;
    supportPoints: string;
    copy: string;
    copied: string;
    pin: string;
    unpin: string;
    discard: string;
    details: string;
    example: string;
    assumptions: string;
    followUps: string;
    model: string;
  };
  copied: boolean;
  pinned: boolean;
  expanded: boolean;
  model: string | undefined;
  onCopy: () => void | Promise<void>;
  onPin: () => void;
  onDiscard: () => void;
}) {
  const preview = answerPreview(answer);

  return (
    <article className="quick-answer" aria-label={labels.sayThis}>
      <div className="answer-actions">
        <AsyncIconButton label={copied ? labels.copied : labels.copy} onClick={onCopy}>
          {copied ? "✓" : "⧉"}
        </AsyncIconButton>
        <AsyncIconButton
          label={pinned ? labels.unpin : labels.pin}
          pressed={pinned}
          onClick={onPin}
        >
          {pinned ? "◆" : "◇"}
        </AsyncIconButton>
        <AsyncIconButton label={labels.discard} onClick={onDiscard}>
          ×
        </AsyncIconButton>
      </div>
      <p className="answer-kicker">{labels.sayThis}</p>
      <p className="say-this" tabIndex={0}>
        {answer.sayThis}
      </p>
      {preview.keyPoints.length > 0 && (
        <section className="support-points">
          <h3>{labels.supportPoints}</h3>
          <ul>
            {preview.keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
      )}
      {expanded && (
        <div className="answer-details">
          {answer.details && (
            <details>
              <summary>{labels.details}</summary>
              <p>{answer.details}</p>
            </details>
          )}
          {answer.example && (
            <details>
              <summary>{labels.example}</summary>
              <pre>
                <code>{answer.example}</code>
              </pre>
            </details>
          )}
          {answer.assumptions.length > 0 && (
            <details>
              <summary>{labels.assumptions}</summary>
              <ul>
                {answer.assumptions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </details>
          )}
          {answer.followUps.length > 0 && (
            <details>
              <summary>{labels.followUps}</summary>
              <ul>
                {answer.followUps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </details>
          )}
          {model && (
            <p className="model-line">
              {labels.model}: {model} · {answer.confidence}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
