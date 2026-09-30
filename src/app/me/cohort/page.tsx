import { redirect } from "next/navigation";
import { StackList } from "@/components/stack-list";
import { evaluateCohort } from "@/server/cohort";
import { loadCohortPeople } from "@/server/stacks";
import { getViewer } from "@/server/viewer";

export default async function CohortPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?callbackUrl=/me/cohort");
  if (!viewer.displayName) redirect("/me?error=name");

  const { me, others } = await loadCohortPeople(viewer.id);
  if (!me || me.items.length === 0) {
    return (
      <>
        <h1>겹치는 스택</h1>
        <p>체크한 제품이 있으면 여기서 겹치는 스택을 계산합니다.</p>
        <a className="button" href="/me">
          내 스택으로
        </a>
      </>
    );
  }

  const view = evaluateCohort(me, others);

  return (
    <>
      <h1>겹치는 스택</h1>
      <p>성분이 3개 이상 같은 사람 {view.people.length}명</p>
      {view.showPercents ? (
        <>
          <h2>이 군은 먹고 내 스택에는 없는 성분</h2>
          {view.missing.length === 0 ? (
            <p>해당 성분이 없습니다.</p>
          ) : (
            <ul className="sentences plain">
              {view.missing.map((nutrient) => (
                <li key={nutrient.key}>{nutrient.sentence}</li>
              ))}
            </ul>
          )}
          <h2>내 스택에만 있는 성분</h2>
          {view.onlyMine.length === 0 ? (
            <p>해당 성분이 없습니다.</p>
          ) : (
            <ul className="sentences plain">
              {view.onlyMine.map((nutrient) => (
                <li key={nutrient.key}>{nutrient.sentence}</li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p>20명이 되면 성분 비율을 보여 줍니다.</p>
      )}
      {view.people.length === 0 ? <p>성분이 3개 이상 겹치는 스택이 없습니다.</p> : <StackList stacks={view.people} />}
    </>
  );
}
