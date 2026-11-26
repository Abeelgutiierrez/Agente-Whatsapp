"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X, LoaderCircle, ArrowUpRight, Check } from "lucide-react";
import type { ReactNode } from "react";
import type { Status } from "@/domain/types";
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className={`modal ${wide ? "modal-wide" : ""}`}>
          <div className="modal-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>
                {description ||
                  "Gestiona los datos y guarda los cambios cuando estén listos."}
              </Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label="Cerrar">
              <X size={20} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Badge({ status }: { status: Status }) {
  return (
    <span className={`badge status-${status.replace(" ", "-")}`}>
      <span aria-hidden="true">
        {status === "confirmada" || status === "atendida"
          ? "✓"
          : status === "cancelada"
            ? "×"
            : status === "no presentada"
              ? "!"
              : "◷"}
      </span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
export function ErrorBox({ error }: { error: string }) {
  return error ? (
    <div className="error-box" role="alert">
      {error}
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" /> Preparando tu espacio…
    </div>
  );
}
export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-symbol">✧</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Metric({
  label,
  value,
  help,
  detail,
}: {
  label: string;
  value: string | number;
  help: string;
  detail?: string;
}) {
  return (
    <div className="metric">
      <div className="metric-label">
        {label}
        <details className="help">
          <summary aria-label={`Cómo se calcula: ${label}`}>i</summary>
          <p>{help}</p>
        </details>
      </div>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
export function TextLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowUpRight size={15} />
    </button>
  );
}
export function Success({ text }: { text: string }) {
  return (
    <div className="success-note" role="status">
      <Check size={16} />
      {text}
    </div>
  );
}
