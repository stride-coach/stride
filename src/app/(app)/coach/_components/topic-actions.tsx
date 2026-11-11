"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCheckIcon,
  EllipsisIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { deleteFailures, topicFailures } from "@/features/coach/stream";
import { topicTitleSchema } from "@/features/coach/topics";
import {
  closeCoachTopic,
  deleteCoachThread,
  renameCoachTopic,
} from "@/server/coaching/actions";

type Dialogs = "rename" | "close" | "delete" | null;

function RenameDialog({
  open,
  onOpenChange,
  title,
  pending,
  onRename,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  pending: boolean;
  onRename: (title: string) => void;
}) {
  const [value, setValue] = useState(title);
  const [invalid, setInvalid] = useState(false);
  const fieldId = useId();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setValue(title);
        setInvalid(false);
        onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-110">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = topicTitleSchema.safeParse(value);
            if (!parsed.success) {
              setInvalid(true);
              return;
            }
            onRename(parsed.data);
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-body-lg">
              Renommer le sujet
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <label htmlFor={fieldId} className="text-label font-medium">
              Nom du sujet
            </label>
            <Input
              id={fieldId}
              value={value}
              maxLength={120}
              autoComplete="off"
              aria-invalid={invalid || undefined}
              onChange={(event) => {
                setValue(event.target.value);
                setInvalid(false);
              }}
            />
            {invalid && (
              <p className="text-label text-destructive">
                Donne un nom à ce sujet.
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {pending ? "Enregistrement…" : "Renommer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CloseTopicDialog({
  threadId,
  open,
  onOpenChange,
}: {
  threadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();

  function close() {
    startTransition(async () => {
      const result = await closeCoachTopic({ threadId });
      onOpenChange(false);
      if (result.status === "done") {
        toast.success("Sujet clos. Son résumé est dans le fil principal.", {
          id: "coach-topic",
        });
        return;
      }
      toast.error(topicFailures[result.status] ?? topicFailures.error, {
        id: "coach-topic",
      });
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clore le sujet ?</AlertDialogTitle>
          <AlertDialogDescription>
            Le staff en garde un résumé dans le fil principal, avec les
            décisions prises. Le sujet reste lisible, mais tu ne pourras plus y
            écrire.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            aria-busy={pending}
            onClick={(event) => {
              event.preventDefault();
              close();
            }}
          >
            {pending ? "Clôture…" : "Clore le sujet"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TopicActions({
  threadId,
  title,
  closed,
  busy,
}: {
  threadId: string;
  title: string;
  closed: boolean;
  busy: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialogs>(null);
  const [pending, startTransition] = useTransition();
  const opened = (name: Exclude<Dialogs, null>) => (next: boolean) =>
    setDialog(next ? name : null);

  function rename(next: string) {
    startTransition(async () => {
      const result = await renameCoachTopic({ threadId, title: next });
      if (result.status === "done") {
        setDialog(null);
        toast.success("Sujet renommé.", { id: "coach-topic" });
        return;
      }
      toast.error(topicFailures[result.status] ?? topicFailures.error, {
        id: "coach-topic",
      });
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteCoachThread({ threadId });
      setDialog(null);
      if (result.status === "deleted") {
        toast.success("Sujet supprimé.", { id: "coach-topic" });
        startTransition(() => router.push("/coach"));
        return;
      }
      toast.error(deleteFailures[result.status] ?? deleteFailures.error, {
        id: "coach-topic",
      });
    });
  }

  if (closed) return null;

  return (
    <>
      <div className="flex gap-2 max-md:hidden">
        <Button
          variant="outline"
          disabled={busy || pending}
          onClick={() => setDialog("rename")}
        >
          Renommer
        </Button>
        <Button
          variant="outline"
          disabled={busy || pending}
          onClick={() => setDialog("close")}
        >
          Clore le sujet
        </Button>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label="Plus d’options"
            className="max-md:size-control-touch"
          >
            <EllipsisIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuItem
            disabled={busy || pending}
            onSelect={() => setDialog("rename")}
            className="min-h-10 gap-2.5"
          >
            <PencilIcon aria-hidden="true" />
            Renommer
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={busy || pending}
            onSelect={() => setDialog("close")}
            className="min-h-10 gap-2.5"
          >
            <CheckCheckIcon aria-hidden="true" />
            Clore le sujet
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={busy || pending}
            onSelect={() => setDialog("delete")}
            className="min-h-10 gap-2.5 text-destructive focus:text-destructive"
          >
            <Trash2Icon aria-hidden="true" className="text-destructive" />
            Supprimer le sujet
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RenameDialog
        open={dialog === "rename"}
        onOpenChange={opened("rename")}
        title={title}
        pending={pending}
        onRename={rename}
      />
      <CloseTopicDialog
        threadId={threadId}
        open={dialog === "close"}
        onOpenChange={opened("close")}
      />
      <AlertDialog open={dialog === "delete"} onOpenChange={opened("delete")}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le sujet ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le sujet et ses messages seront supprimés définitivement. Les
              propositions du staff restent dans l’historique du plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              aria-busy={pending}
              onClick={(event) => {
                event.preventDefault();
                remove();
              }}
            >
              {pending ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
