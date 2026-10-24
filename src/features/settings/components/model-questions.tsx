import { ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import type { AthleteModelQuestion } from "@/features/settings/athlete-model";

const visibleQuestions = 3;

function QuestionList({ questions }: { questions: AthleteModelQuestion[] }) {
  return (
    <ul className="flex flex-col">
      {questions.map((question) => (
        <li key={question.key} className="border-t border-border">
          <Link
            href={question.href}
            className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-0.5 py-2.5 md:hidden"
          >
            <strong className="text-sm font-semibold">
              {question.question}
            </strong>
            <ChevronRightIcon
              aria-hidden
              className="row-span-2 size-3 text-muted-foreground"
            />
            <span className="text-xs leading-snug text-muted-foreground">
              {question.impact}
            </span>
          </Link>
          <div className="hidden grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-1 py-3 md:grid">
            <strong className="text-sm font-semibold">
              {question.question}
            </strong>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="row-span-2 h-10 px-3.5 text-meta font-normal"
            >
              <Link
                href={question.href}
                aria-label={`${question.action} : ${question.question}`}
              >
                {question.action}
              </Link>
            </Button>
            <span className="text-meta text-muted-foreground">
              {question.impact}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ModelQuestions({
  questions,
}: {
  questions: AthleteModelQuestion[];
}) {
  if (questions.length === 0) return null;
  const rest = questions.slice(visibleQuestions);
  return (
    <div className="flex flex-col pt-1">
      <h3 className="pb-2 font-mono text-micro font-normal tracking-wider text-muted-foreground uppercase md:text-label">
        {questions.length} {questions.length > 1 ? "questions" : "question"}
        <span className="md:hidden">
          {questions.length > 1 ? " l’affineraient" : " l’affinerait"}
        </span>
        <span className="hidden md:inline">
          {questions.length > 1
            ? " affineraient ton modèle"
            : " affinerait ton modèle"}
        </span>
      </h3>
      <QuestionList questions={questions.slice(0, visibleQuestions)} />
      {rest.length > 0 && (
        <details className="group border-t border-border">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm text-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
            <ChevronRightIcon
              aria-hidden
              className="size-3.5 transition-transform group-open:rotate-90 motion-reduce:transition-none"
            />
            <span className="group-open:hidden">
              Voir {rest.length > 1 ? `les ${rest.length} autres` : "l’autre"}
            </span>
            <span className="hidden group-open:inline">Masquer</span>
          </summary>
          <QuestionList questions={rest} />
        </details>
      )}
    </div>
  );
}
