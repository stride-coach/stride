import {
  ActivityIcon,
  ChartNoAxesColumnIcon,
  FlagIcon,
  TrendingUpIcon,
} from "lucide-react";
import { StaffAvatar } from "@/features/coach/components/staff-avatar";
import { staff, staffAgents } from "@/features/coach/staff";
import {
  starterPrompts,
  type StarterPrompt,
} from "@/features/coach/suggested-replies";
import { cn } from "@/lib/utils";

const starterIcons: Record<StarterPrompt["key"], React.ReactNode> = {
  week: <ChartNoAxesColumnIcon />,
  fatigue: <TrendingUpIcon />,
  race: <FlagIcon />,
  missed: <ActivityIcon />,
};

function StaffWelcome({ onStart }: { onStart: (text: string) => void }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4.5 px-5 py-10 text-center md:py-15">
      <span aria-hidden="true" className="flex">
        {staffAgents.map((agent, index) => (
          <StaffAvatar
            key={agent}
            agent={agent}
            size={30}
            decorative
            className={cn(index > 0 && "-ml-2")}
          />
        ))}
      </span>
      <div className="flex max-w-110 flex-col gap-2">
        <h2 className="text-verdict font-semibold md:text-2xl md:leading-tight md:tracking-[-0.03em]">
          Ton staff est là
        </h2>
        <p className="text-body-lg text-secondary-foreground">
          Écris comme à un coach. Il te répond et fait intervenir le bon
          spécialiste quand il le faut. Tout se passe dans cette conversation.
        </p>
      </div>
      <ul
        aria-label="Pour commencer"
        className="grid w-full max-w-140 gap-2.5 text-left md:grid-cols-2"
      >
        {starterPrompts.map((starter) => (
          <li key={starter.key} className="flex">
            <button
              type="button"
              onClick={() => onStart(starter.title)}
              className="grid w-full grid-cols-[20px_minmax(0,1fr)] items-start gap-2.5 rounded-lg border border-border bg-card px-3.5 py-3 text-left transition-colors duration-150 ease-stride hover:border-control-border hover:bg-muted motion-reduce:transition-none"
            >
              <span
                aria-hidden="true"
                className="flex pt-0.5 text-muted-foreground [&_svg]:size-3.75"
              >
                {starterIcons[starter.key]}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">{starter.title}</span>
                <span className="text-label text-muted-foreground">
                  {starter.subtitle}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EmptyConversation({
  kind,
  title,
  plan,
  onStart,
}: {
  kind: "main" | "topic";
  title: string | null;
  plan: boolean;
  onStart: (text: string) => void;
}) {
  if (kind === "main" && !plan) return <StaffWelcome onStart={onStart} />;
  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-3 px-4 pt-8 md:px-5 md:pt-12">
      <StaffAvatar agent="coach" size={48} />
      <h2 className="text-verdict font-semibold">
        {kind === "topic" ? title : `Demande ton plan ${staff.coach.to}`}
      </h2>
      <p className="max-w-140 text-body-lg text-secondary-foreground">
        {kind === "topic"
          ? "Écris ta première question. Le staff garde le fil de ce sujet jusqu’à ce que tu le closes."
          : `${staff.coach.subject} construit ton plan à partir de tes objectifs, de tes disponibilités et de ton historique, puis te le propose. Rien n’est enregistré sans ton accord.`}
      </p>
    </div>
  );
}
