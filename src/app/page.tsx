import { StackList } from "@/components/stack-list";
import { listMyProductLinks, listRecentStacks } from "@/server/stacks";
import { getViewer } from "@/server/viewer";

export default async function HomePage() {
  const viewer = await getViewer();
  const [stacks, mine] = await Promise.all([
    listRecentStacks(),
    viewer ? listMyProductLinks(viewer.id) : Promise.resolve([]),
  ]);

  return (
    <>
      <h1>지금 먹는 영양제</h1>
      {mine.length > 0 ? (
        <nav className="mine" aria-label="내가 체크한 제품">
          {mine.map((product) => (
            <a key={product.id} href={`/products/${product.id}`}>
              {product.name}
            </a>
          ))}
        </nav>
      ) : null}
      {stacks.length === 0 ? (
        <div>
          <p>아직 공개된 스택이 없다</p>
          <a className="button" href="/me">
            내 스택 만들기
          </a>
        </div>
      ) : (
        <StackList stacks={stacks} />
      )}
    </>
  );
}
