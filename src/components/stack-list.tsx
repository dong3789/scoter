import { formatQuantity } from "@/domain/format";
import { TIME_LABEL } from "@/domain/time";
import type { TimeSlot } from "@/domain/time";

export function StackList({
  stacks,
}: {
  stacks: {
    userId: string;
    displayName: string;
    items: {
      productId: string;
      productName: string;
      servings: number;
      timeSlot: TimeSlot;
    }[];
  }[];
}) {
  return (
    <ol className="stacks">
      {stacks.map((stack) => (
        <li key={stack.userId}>
          <a className="person" href={`/stacks/${stack.userId}`}>
            {stack.displayName}
          </a>
          <ul className="products">
            {stack.items.map((item) => (
              <li key={item.productId}>
                <a href={`/products/${item.productId}`}>{item.productName}</a>
                <span>1회 × {formatQuantity(item.servings)}</span>
                <span className="when">{TIME_LABEL[item.timeSlot]}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
