"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { productCatalogue } from "../catalogue";
import {
  productInputSchema,
  productKindLabels,
  productKinds,
  productName,
  type NutritionProduct,
  type ProductKind,
} from "../products";
import {
  addCatalogueProduct,
  archiveProduct,
  saveProduct,
  type ProductActionResult,
} from "@/server/fueling/actions";

function failure(result: ProductActionResult) {
  switch (result.status) {
    case "invalid":
      return "Vérifie les valeurs du produit et réessaie.";
    case "conflict":
      return "Ce produit a changé entre-temps. Recharge la page et réessaie.";
    case "session-expired":
      return "Ta session a expiré. Connecte-toi à nouveau.";
    default:
      return "Impossible d’enregistrer le produit pour le moment. Réessaie.";
  }
}

type Draft = {
  name: string;
  brand: string;
  kind: ProductKind;
  carbsG: string;
  sodiumMg: string;
  caffeineMg: string;
  servingLabel: string;
  servingMl: string;
  tested: boolean;
  testedNote: string;
};

function draftOf(product: NutritionProduct | null): Draft {
  return {
    name: product?.name ?? "",
    brand: product?.brand ?? "",
    kind: product?.kind ?? "gel",
    carbsG: product ? String(product.carbsG) : "",
    sodiumMg: product ? String(product.sodiumMg) : "0",
    caffeineMg: product ? String(product.caffeineMg) : "0",
    servingLabel: product?.servingLabel ?? "",
    servingMl: product?.servingMl ? String(product.servingMl) : "",
    tested: product?.tested ?? false,
    testedNote: product?.testedNote ?? "",
  };
}

function integer(value: string) {
  const text = value.trim();
  if (!text) return null;
  const number = Number(text.replace(",", "."));
  return Number.isInteger(number) ? number : Number.NaN;
}

function ProductForm({
  product,
  onDone,
}: {
  product: NutritionProduct | null;
  onDone: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(() => draftOf(product));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const set = <Key extends keyof Draft>(key: Key, value: Draft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setMessage("");
  };
  const input = {
    name: draft.name,
    brand: draft.brand,
    kind: draft.kind,
    carbsG: integer(draft.carbsG),
    sodiumMg: integer(draft.sodiumMg) ?? 0,
    caffeineMg: integer(draft.caffeineMg) ?? 0,
    servingLabel: draft.servingLabel,
    servingMl: integer(draft.servingMl),
    tested: draft.tested,
    testedNote: draft.tested ? draft.testedNote : "",
  };

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!productInputSchema.safeParse(input).success) {
      setMessage(
        "Indique un nom, des glucides entre 0 et 200 g, du sodium jusqu’à 3 000 mg et de la caféine jusqu’à 400 mg, en nombres entiers.",
      );
      return;
    }
    startTransition(async () => {
      const result = await saveProduct(
        product?.id ?? null,
        product?.revision ?? null,
        input,
      );
      if (result.status !== "saved") {
        toast.error(failure(result), { id: "nutrition-product" });
        return;
      }
      toast.success(product ? "Produit mis à jour." : "Produit ajouté.", {
        id: "nutrition-product",
      });
      onDone();
    });
  }

  function remove() {
    if (!product) return;
    startTransition(async () => {
      const result = await archiveProduct(product.id, product.revision);
      if (result.status !== "saved") {
        toast.error(failure(result), { id: "nutrition-product" });
        return;
      }
      toast.success("Produit retiré de tes produits.", {
        id: "nutrition-product",
      });
      onDone();
    });
  }

  const number = (
    key: "carbsG" | "sodiumMg" | "caffeineMg" | "servingMl",
    label: string,
  ) => (
    <Field>
      <FieldLabel htmlFor={`${id}-${key}`}>{label}</FieldLabel>
      <Input
        id={`${id}-${key}`}
        inputMode="numeric"
        autoComplete="off"
        value={draft[key]}
        onChange={(event) => set(key, event.target.value)}
      />
    </Field>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${id}-name`}>Nom</FieldLabel>
          <Input
            id={`${id}-name`}
            autoComplete="off"
            value={draft.name}
            onChange={(event) => set("name", event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-brand`}>Marque</FieldLabel>
          <Input
            id={`${id}-brand`}
            autoComplete="off"
            value={draft.brand}
            onChange={(event) => set("brand", event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-kind`}>Type</FieldLabel>
          <Select
            value={draft.kind}
            onValueChange={(value) => set("kind", value as ProductKind)}
          >
            <SelectTrigger id={`${id}-kind`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {productKinds.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {productKindLabels[kind]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-serving`}>Portion</FieldLabel>
          <Input
            id={`${id}-serving`}
            autoComplete="off"
            placeholder="40 g"
            value={draft.servingLabel}
            onChange={(event) => set("servingLabel", event.target.value)}
          />
        </Field>
        {number("carbsG", "Glucides par portion (g)")}
        {number("sodiumMg", "Sodium (mg)")}
        {number("caffeineMg", "Caféine (mg)")}
        {draft.kind === "drink" &&
          number("servingMl", "Volume d’une dose (ml)")}
      </div>
      <Label className="flex items-center gap-2.5 text-meta">
        <Checkbox
          checked={draft.tested}
          onCheckedChange={(checked) => set("tested", checked === true)}
        />
        Testé à l’entraînement
      </Label>
      {draft.tested && (
        <Field>
          <FieldLabel htmlFor={`${id}-note`}>Où tu l’as testé</FieldLabel>
          <Input
            id={`${id}-note`}
            autoComplete="off"
            placeholder="Sortie longue 3h, 12 oct."
            value={draft.testedNote}
            onChange={(event) => set("testedNote", event.target.value)}
          />
        </Field>
      )}
      {message && (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      )}
      <DialogFooter className="gap-2">
        {product && (
          <Button
            type="button"
            variant="ghost"
            size="md"
            className="mr-auto text-danger"
            disabled={pending}
            onClick={remove}
          >
            Retirer
          </Button>
        )}
        <Button type="submit" size="md" disabled={pending} aria-busy={pending}>
          {product ? "Enregistrer" : "Ajouter le produit"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function Catalogue({ added }: { added: ReadonlySet<string> }) {
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState<string | null>(null);
  const add = (key: string, name: string) =>
    startTransition(async () => {
      setRunning(key);
      const result = await addCatalogueProduct(key);
      setRunning(null);
      if (result.status !== "saved") {
        toast.error(failure(result), { id: "nutrition-product" });
        return;
      }
      toast.success(`${name} ajouté à tes produits.`, {
        id: "nutrition-product",
      });
    });
  return (
    <div className="flex flex-col">
      <ul className="flex max-h-[min(60vh,28rem)] flex-col overflow-y-auto">
        {productCatalogue.map((item) => {
          const name = productName(item);
          const done = added.has(item.key);
          return (
            <li
              key={item.key}
              className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium">{name}</span>
                <span className="text-xs text-muted-foreground">
                  {productKindLabels[item.kind]} · {item.carbsG} g glucides
                  {item.sodiumMg > 0 && ` · ${item.sodiumMg} mg sodium`}
                  {item.caffeineMg > 0 && ` · ${item.caffeineMg} mg caféine`}
                  {` · ${item.servingLabel}`}
                </span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={done || pending}
                aria-busy={running === item.key}
                aria-label={done ? `${name} déjà ajouté` : `Ajouter ${name}`}
                onClick={() => add(item.key, name)}
              >
                {done ? "Ajouté" : "Ajouter"}
              </Button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        Valeurs indicatives par portion : vérifie l’étiquette de ton produit et
        corrige-les si besoin.
      </p>
    </div>
  );
}

export function AddProductButton({
  added,
  className,
}: {
  added: string[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="md"
        className={cn("rounded-surface text-meta", className)}
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">+</span>
        <span className="max-sm:hidden">Ajouter un produit</span>
        <span className="sm:hidden">Ajouter</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-140">
          <DialogTitle>Ajouter un produit</DialogTitle>
          <DialogDescription>
            Choisis une marque courante ou saisis ton produit.
          </DialogDescription>
          <Tabs defaultValue="catalogue" className="gap-3">
            <TabsList>
              <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
              <TabsTrigger value="manual">Saisie libre</TabsTrigger>
            </TabsList>
            <TabsContent value="catalogue">
              <Catalogue added={new Set(added)} />
            </TabsContent>
            <TabsContent value="manual">
              <ProductForm product={null} onDone={() => setOpen(false)} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function EditProductButton({
  product,
  className,
}: {
  product: NutritionProduct;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const name = productName(product);
  return (
    <>
      <button
        type="button"
        className={cn(
          "rounded-tag text-left font-medium decoration-dim underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring",
          className,
        )}
        onClick={() => setOpen(true)}
      >
        {name}
        <span className="sr-only">, modifier</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-140">
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>
            Corrige les valeurs ou indique si tu l’as testé.
          </DialogDescription>
          <ProductForm product={product} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
