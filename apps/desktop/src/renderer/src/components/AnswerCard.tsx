import type { Answer } from "@meeting-copilot/contracts";

export function AnswerCard({ answer }: { answer: Answer }) {
  return (
    <article className="answer-card">
      <header>
        <span className={`confidence confidence-${answer.confidence}`}>
          {answer.confidence} confidence
        </span>
      </header>
      <section className="direct-answer">
        <h2>Answer</h2>
        <p>{answer.direct_answer}</p>
      </section>
      <details open>
        <summary>Why</summary>
        <p>{answer.detailed_explanation}</p>
      </details>
      {answer.example && (
        <details open>
          <summary>Example</summary>
          <pre>
            <code>{answer.example}</code>
          </pre>
        </details>
      )}
      {answer.assumptions.length > 0 && (
        <details>
          <summary>Assumptions and risks</summary>
          <ul>
            {answer.assumptions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
