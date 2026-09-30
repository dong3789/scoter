import { redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { TimeFields } from "@/components/time-fields";
import { formatQuantity } from "@/domain/format";
import { TIME_LABEL, type TimeSlot } from "@/domain/time";
import { addProduct, checkProduct, setDisplayName, setStackPublic, uncheckProduct } from "@/server/actions";
import { getStack, searchProducts } from "@/server/stacks";
import { getViewer } from "@/server/viewer";

export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?callbackUrl=/me");
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const results = query ? await searchProducts(query) : [];
  const stack = await getStack(viewer.id);

  return (
    <>
      <h1>내 스택</h1>
      <Notice code={params.error} />
      <form action={setDisplayName}>
        <label>
          표시 이름
          <input name="displayName" defaultValue={viewer.displayName ?? ""} required maxLength={30} />
        </label>
        <button type="submit">이름 저장</button>
      </form>
      <form action={setStackPublic}>
        <label>
          <span>카드를 공개</span>
          <input type="checkbox" name="stackPublic" defaultChecked={viewer.stackPublic} />
        </label>
        <button type="submit">공개 설정 저장</button>
      </form>
      <h2>체크한 제품</h2>
      {stack && stack.items.length > 0 ? (
        <ul className="plain">
          {stack.items.map((item) => (
            <li key={item.id} className="row">
              <span>
                <a href={`/products/${item.productId}`}>{item.productName}</a>
                <span className="meta">
                  {" "}
                  1회 × {formatQuantity(item.servings)} {TIME_LABEL[item.timeSlot as TimeSlot]}
                </span>
              </span>
              <form action={uncheckProduct}>
                <input type="hidden" name="productId" value={item.productId} />
                <button className="quiet" type="submit">
                  해제
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p>체크한 제품이 없습니다.</p>
      )}
      {stack && stack.items.length > 0 ? (
        <p>
          <a href={`/stacks/${viewer.id}`}>내 카드 보기</a>
        </p>
      ) : null}
      <h2>제품 검색</h2>
      <form action="/me">
        <label>
          제품명 또는 제조사
          <input name="q" defaultValue={query} />
        </label>
        <button type="submit">검색</button>
      </form>
      {query && results.length === 0 ? (
        <>
          <p>검색 결과가 없습니다.</p>
          <form action={addProduct}>
            <label>
              제품명
              <input name="name" defaultValue={query} required />
            </label>
            <label>
              제조사
              <input name="manufacturer" />
            </label>
            <label>
              1회 분량
              <input name="servingText" placeholder="2캡슐" />
            </label>
            {[1, 2, 3].map((index) => (
              <div className="nutrient-line" key={index}>
                <label>
                  성분
                  <input name={`nutrientName${index}`} />
                </label>
                <label>
                  함량
                  <input name={`amount${index}`} type="number" min="0.0001" step="any" />
                </label>
                <label>
                  단위
                  <input name={`unit${index}`} />
                </label>
              </div>
            ))}
            <TimeFields />
            <button type="submit">제품 추가하고 체크</button>
          </form>
        </>
      ) : null}
      {results.map((product) => {
        const current = stack?.items.find((item) => item.productId === product.id);
        return (
          <form className="check-card" key={product.id} action={checkProduct}>
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="q" value={query} />
            <strong>{product.name}</strong>
            <p className="meta">
              {[product.manufacturer, product.servingText, product.registrationNo].filter(Boolean).join(" / ")}
            </p>
            <TimeFields
              servings={String(current?.servings ?? 1)}
              timeSlot={current?.timeSlot ?? "morning"}
            />
            <button type="submit">체크</button>
          </form>
        );
      })}
    </>
  );
}
