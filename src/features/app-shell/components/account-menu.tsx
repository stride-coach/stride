"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeMenuGroup } from "@/features/theme/components/theme-menu-group";
import type { ShellAthlete } from "../shell";
import { GarminSince } from "./garmin-since";
import { ShortcutHelpMenuItem } from "./shortcut-help";
import { SignOutMenuItem } from "./sign-out-menu-item";

const itemClass = "min-h-8 gap-2 px-2.5 text-body";

function AccountMenuItems({
  athlete,
  modelDetail,
}: {
  athlete: ShellAthlete;
  modelDetail: string;
}) {
  return (
    <>
      <div className="flex items-center gap-2.5 px-2.5 pt-2 pb-2.5">
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-full border border-control-border bg-muted text-label font-semibold"
        >
          {athlete.initials}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{athlete.name}</span>
          <span className="truncate text-label text-muted-foreground">
            {athlete.detail}
          </span>
        </span>
      </div>
      <DropdownMenuSeparator className="my-1" />
      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/profile">
          Modèle d’athlète
          <span className="ml-auto text-label text-muted-foreground">
            {modelDetail}
          </span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings">
          Réglages
          <DropdownMenuShortcut className="max-md:hidden">
            ⌘,
          </DropdownMenuShortcut>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/connections">
          Connexions
          <GarminSince />
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/activities/gear">Matériel</Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className={itemClass}>
        <Link href="/settings/privacy">Données et confidentialité</Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator className="my-1" />
      <ThemeMenuGroup />
      <ShortcutHelpMenuItem />
      <SignOutMenuItem />
    </>
  );
}

export function AccountAvatarMenu({
  athlete,
  modelDetail,
}: {
  athlete: ShellAthlete;
  modelDetail: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Compte de ${athlete.name}, ${modelDetail}`}
        className="relative grid size-6.5 shrink-0 place-items-center rounded-full border border-control-border bg-muted text-micro font-semibold text-foreground transition-colors duration-150 ease-stride after:absolute after:-inset-2 hover:border-muted-foreground aria-expanded:border-muted-foreground md:after:hidden"
      >
        {athlete.initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-70 rounded-xl bg-background p-1.5 shadow-float"
      >
        <AccountMenuItems athlete={athlete} modelDetail={modelDetail} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
