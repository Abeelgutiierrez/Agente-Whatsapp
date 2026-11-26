import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { getStore } from "@/server/db";
import { availability } from "@/domain/availability";
import {
  createBooking,
  changeBooking,
  publicBooking,
  lookupBooking,
  updateClient,
  updateConfig,
  simulateMessage,
  DomainError,
} from "@/domain/operations";
import { dayKey, nextDay } from "@/domain/time";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
function failure(error: unknown) {
  if (error instanceof ZodError)
    return json({ error: error.issues.map((i) => i.message).join(" ") }, 400);
  if (error instanceof DomainError)
    return json({ error: error.message }, error.status);
  console.error(
    "Error local de aplicación:",
    error instanceof Error ? error.message : "Error desconocido",
  );
  return json(
    {
      error:
        "No hemos podido guardar el cambio. Inténtalo de nuevo; tus datos no se han borrado.",
    },
    500,
  );
}
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const path = (await context.params).path.join("/");
    const state = getStore().read();
    const q = request.nextUrl.searchParams;
    if (path === "config")
      return json({
        business: state.business,
        meta: state.meta,
        services: state.services.filter((s) => s.active),
        professionals: state.professionals.filter((p) => p.active),
      });
    if (path === "business")
      return json(
        q.get("revision") === String(state.meta.revision)
          ? { unchanged: true }
          : { ...state, operations: [] },
      );
    if (path === "availability" || path === "business-availability") {
      const serviceId = z.string().min(1).parse(q.get("serviceId"));
      const from = z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .parse(q.get("from") || dayKey(state.meta.now));
      const days = z.coerce
        .number()
        .int()
        .min(1)
        .max(61)
        .parse(q.get("days") || 7);
      // Exclusión de la cita en gestión solo después de verificar localizador y teléfono.
      const existing =
        path === "business-availability"
          ? state.bookings.find((b) => b.id === q.get("bookingId"))
          : q.get("code")
            ? lookupBooking(state, q.get("code")!, q.get("phone") || "")
            : undefined;
      return json(
        Array.from({ length: days }, (_, i) =>
          availability(
            state,
            serviceId,
            nextDay(from, i),
            q.get("professionalId") || undefined,
            existing?.id,
            existing,
          ),
        ),
      );
    }
    return json({ error: "No encontramos esa página." }, 404);
  } catch (error) {
    return failure(error);
  }
}
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== request.headers.get("host"))
      return json({ error: "Abre esta acción desde la aplicación." }, 403);
    const path = (await context.params).path.join("/");
    const body = await request.json();
    const store = getStore();
    if (path === "bookings")
      return json(
        store.mutate((state) =>
          publicBooking(state, createBooking(state, body)),
        ),
        201,
      );
    if (path === "manage") {
      const credentials = z
        .object({
          code: z.string(),
          phone: z.string(),
          action: z.enum(["lookup", "change", "cancel"]).default("lookup"),
        })
        .parse(body);
      if (credentials.action === "lookup") {
        const state = store.read();
        return json(
          publicBooking(
            state,
            lookupBooking(state, credentials.code, credentials.phone),
          ),
        );
      }
      return json(
        store.mutate((state) => {
          const original = lookupBooking(
            state,
            credentials.code,
            credentials.phone,
          );
          return publicBooking(
            state,
            changeBooking(
              state,
              {
                ...body.change,
                id: original.id,
                ...(credentials.action === "cancel"
                  ? { status: "cancelada" }
                  : {}),
              },
              "Cliente",
            ),
          );
        }),
      );
    }
    if (path === "admin") {
      if (body.action === "reset") {
        if (body.confirmation !== "RESTABLECER")
          throw new DomainError(
            "Escribe RESTABLECER para recuperar los datos iniciales.",
          );
        return json(store.reset());
      }
      return json(
        store.mutate((state) => {
          if (body.action === "book")
            return createBooking(state, body.data, "Negocio");
          if (body.action === "change") return changeBooking(state, body.data);
          if (body.action === "client") return updateClient(state, body.data);
          if (body.action === "config") return updateConfig(state, body.data);
          if (body.action === "message")
            return simulateMessage(state, body.data);
          throw new DomainError("Esta acción no está disponible.");
        }),
      );
    }
    return json({ error: "Acción no encontrada." }, 404);
  } catch (error) {
    return failure(error);
  }
}
