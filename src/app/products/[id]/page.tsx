import { notFound } from "next/navigation";
import { Notice } from "@/components/notice";
import { StackList } from "@/components/stack-list";
import { formatQuantity } from "@/domain/format";
import { addNutrient, correctNutrient } from "@/server/actions";
import { getProductRoom } from "@/server/stacks";
import { getViewer } from "@/server/viewer";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const room = await getProductRoom(id);
  if (!room) notFound();
  const viewer = await getViewer();

  return (
    <>
      <h1>{room.name}</h1>
      <p className="meta">
        {[room.manufacturer, room.servingText ? `1회 ${room.servingText}` : null, room.registrationNo]
          .filter(Boolean)
          .join(" / ")}
      </p>
      <Notice code={query.error} />
      {room.nutrients.length > 0 ? (
        <ul className="plain">
          {room.nutrients.map((nutrient) => (
            <li key={nutrient.id} className="row">
              <span>
                {nutrient.displayName} {formatQuantity(nutrient.amount)} {nutrient.unit}
              </span>
              {viewer?.displayName ? (
                <form className="inline" action={correctNutrient}>
                  <input type="hidden" name="productId" value={room.id} />
                  <input type="hidden" name="nutrientId" value={nutrient.id} />
                  <input name="amount" type="number" min="0.0001" step="any" defaultValue={nutrient.amount} aria-label={`${nutrient.displayName} 함량`} />
                  <button className="quiet" type="submit">
                    함량 고치기
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="meta">적힌 함량이 없습니다.</p>
      )}
      {viewer?.displayName ? (
        <form action={addNutrient}>
          <input type="hidden" name="productId" value={room.id} />
          <div className="nutrient-line">
            <label>
              성분
              <input name="nutrientName" />
            </label>
            <label>
              함량
              <input name="amount" type="number" min="0.0001" step="any" />
            </label>
            <label>
              단위
              <input name="unit" />
            </label>
          </div>
          <button type="submit">함량 추가</button>
        </form>
      ) : null}
      <h2>이 제품을 체크한 스택</h2>
      {room.stacks.length === 0 ? <p>아직 체크한 사람이 없습니다.</p> : <StackList stacks={room.stacks} />}
    </>
  );
}
