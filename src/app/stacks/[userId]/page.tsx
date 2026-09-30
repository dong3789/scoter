import { notFound } from "next/navigation";
import { Notice } from "@/components/notice";
import { formatQuantity } from "@/domain/format";
import { TIME_LABEL } from "@/domain/time";
import { addQuestion, deleteQuestion } from "@/server/actions";
import { canDeleteQuestion } from "@/server/questions";
import { getStack } from "@/server/stacks";
import { dailyTotals } from "@/server/totals";
import { getViewer } from "@/server/viewer";

export default async function StackPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { userId } = await params;
  const query = await searchParams;
  const stack = await getStack(userId);
  if (!stack) notFound();

  const viewer = await getViewer();
  const canSee = stack.stackPublic || viewer?.id === stack.userId || viewer?.role === "admin";
  if (!canSee) notFound();

  const totals = dailyTotals(stack.items.map((item) => ({ servings: item.servings, nutrients: item.nutrients })));

  return (
    <>
      <h1>{stack.displayName ?? "이름 없음"}</h1>
      {!stack.stackPublic ? <p className="meta">이 카드는 공개되어 있지 않습니다.</p> : null}
      <Notice code={query.error} />
      <ul className="products">
        {stack.items.map((item) => (
          <li key={item.id}>
            <a href={`/products/${item.productId}`}>{item.productName}</a>
            <span>1회 × {formatQuantity(item.servings)}</span>
            <span className="when">{TIME_LABEL[item.timeSlot]}</span>
          </li>
        ))}
      </ul>
      {totals.length > 0 ? (
        <>
          <h2>오늘 함량</h2>
          <ul className="totals plain">
            {totals.map((line) => (
              <li key={`${line.key}:${line.unit}`}>
                {line.displayName} {formatQuantity(line.amount)} {line.unit}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <h2>질문</h2>
      <ul className="plain">
        {stack.questions.map((question) => (
          <li key={question.id} className="row">
            <span>
              <strong>{question.authorName}</strong> {question.body}
            </span>
            {viewer && canDeleteQuestion(viewer, { authorId: question.authorId }) ? (
              <form action={deleteQuestion}>
                <input type="hidden" name="stackUserId" value={stack.userId} />
                <input type="hidden" name="questionId" value={question.id} />
                <button className="danger" type="submit">
                  지우기
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      {viewer?.displayName ? (
        <form action={addQuestion}>
          <input type="hidden" name="stackUserId" value={stack.userId} />
          <label>
            질문
            <textarea name="body" maxLength={200} required />
          </label>
          <button type="submit">질문 남기기</button>
        </form>
      ) : (
        <p>
          <a href={`/login?callbackUrl=${encodeURIComponent(`/stacks/${stack.userId}`)}`}>로그인</a>
          하면 질문을 남길 수 있습니다.
        </p>
      )}
    </>
  );
}
