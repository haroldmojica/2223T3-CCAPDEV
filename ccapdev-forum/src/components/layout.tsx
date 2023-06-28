import type { PropsWithChildren } from "react";
import { Left, Right } from ".";

export const PageLayout = (props: PropsWithChildren) => {
  return (
    <main className="flex justify-between">
      <div><Left className="h-96 w-64"/></div>
      <div>
        <main className="overflow-y-auto flex flex-col min-h-screen justify-center textColor">
        <div className="flex-1 w-full max-w-4xl mx-auto border-x border-slate-400 p">
          {props.children}
        </div>
        </main>
      </div>
      <div><Right className="h-96 w-64"/></div>
    </main>
  );
};
