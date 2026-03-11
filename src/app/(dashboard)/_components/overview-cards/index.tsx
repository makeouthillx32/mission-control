import { compactFormat } from "@/lib/format-number";
import { getOverviewData } from "../fetch";
import { OverviewCard } from "./card";
import * as icons from "./icons";

export async function OverviewCards() {
  const data = await getOverviewData();

  return (
    <>
      <OverviewCard
        label="Views"
        data={{
          ...data.views,
          value: compactFormat(data.views.value),
        }}
        Icon={icons.Views}
      />

      <OverviewCard
        label="Profit"
        data={{
          ...data.profit,
          value: compactFormat(data.profit.value),
        }}
        Icon={icons.Profit}
      />

      <OverviewCard
        label="Products"
        data={{
          ...data.products,
          value: compactFormat(data.products.value),
        }}
        Icon={icons.Products}
      />

      <OverviewCard
        label="Users"
        data={{
          ...data.users,
          value: compactFormat(data.users.value),
        }}
        Icon={icons.Users}
      />
    </>
  );
}