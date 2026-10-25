import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccountAuth } from "@/integrations/auth-supabase/auth-middleware";

const BUCKET = "issue-report-files";
const MAX_FILES = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
]);

const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(180),
  size: z.number().int().positive().max(MAX_FILE_BYTES),
  type: z.string().trim().toLowerCase().max(100),
});

const ticketSchema = z.object({
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(10).max(5000),
  files: z.array(attachmentSchema).max(MAX_FILES),
  website: z.string().max(200).default(""),
});

function safeExtension(name: string): string {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return /^[a-z0-9]{1,10}$/.test(extension) ? `.${extension}` : "";
}

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as {
    from: (table: string) => any;
    storage: typeof supabaseAdmin.storage;
  };
}

export const createReportUploadsFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((input: unknown) => ticketSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.website) return { id: crypto.randomUUID(), uploads: [], accepted: true };

    if (data.files.some((file) => !ALLOWED_TYPES.has(file.type))) {
      throw new Error("Lampiran hanya boleh berupa JPG, PNG, WebP, PDF, atau TXT.");
    }
    if (data.files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) {
      throw new Error("Total ukuran lampiran maksimal 25 MB.");
    }

    const db = await adminClient();
    const id = crypto.randomUUID();
    const attachments: Array<{
      path: string;
      name: string;
      size: number;
      type: string;
    }> = [];
    const uploads: Array<{ path: string; token: string }> = [];

    for (const file of data.files) {
      const path = `${id}/${crypto.randomUUID()}${safeExtension(file.name)}`;
      const { data: signed, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
      if (error || !signed) {
        throw new Error(error?.message || "Gagal menyiapkan unggahan lampiran.");
      }
      uploads.push({ path, token: signed.token });
      attachments.push({
        path,
        name: file.name,
        size: file.size,
        type: file.type,
      });
    }

    const { error } = await db.from("issue_reports").insert({
      id,
      user_id: context.userId,
      email: data.email,
      subject: data.subject,
      message: data.message,
      attachments,
      status: "pending_upload",
    });
    if (error) {
      await db.storage.from(BUCKET).remove(attachments.map((file) => file.path));
      throw new Error(error.message);
    }

    return { id, uploads, accepted: false };
  });

export const submitReportFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminClient();
    const { data: row, error } = await db
      .from("issue_reports")
      .select("attachments, status")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !row || row.status !== "pending_upload") {
      throw new Error("Tiket tidak ditemukan atau sudah diproses.");
    }

    const attachments = row.attachments as Array<{ path: string }>;
    if (attachments.length > 0) {
      const { data: objects, error: listError } = await db.storage
        .from(BUCKET)
        .list(data.id, { limit: MAX_FILES });
      if (listError) throw new Error(listError.message);
      const uploadedPaths = new Set(
        (objects ?? []).map((object: { name: string }) => `${data.id}/${object.name}`),
      );
      if (attachments.some((file) => !uploadedPaths.has(file.path))) {
        throw new Error("Belum semua lampiran berhasil diunggah. Coba kirim ulang.");
      }
    }

    const { error: updateError } = await db
      .from("issue_reports")
      .update({ status: "open", updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .eq("status", "pending_upload");
    if (updateError) throw new Error(updateError.message);
    return { ok: true };
  });

export const abandonReportFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminClient();
    const { data: row } = await db
      .from("issue_reports")
      .select("attachments")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .eq("status", "pending_upload")
      .maybeSingle();
    if (!row) return { ok: true };

    const attachments = row.attachments as Array<{ path: string }>;
    if (attachments.length > 0) {
      await db.storage.from(BUCKET).remove(attachments.map((file) => file.path));
    }
    await db
      .from("issue_reports")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .eq("status", "pending_upload");
    return { ok: true };
  });

export const listMyReportsFn = createServerFn({ method: "GET" })
  .middleware([requireAccountAuth])
  .handler(async ({ context }) => {
    const db = await adminClient();
    const { data, error } = await db
      .from("issue_reports")
      .select(
        "id, email, subject, message, attachments, status, admin_note, created_at, updated_at",
      )
      .eq("user_id", context.userId)
      .neq("status", "pending_upload")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listReportTicketsFn = createServerFn({ method: "GET" })
  .middleware([requireAccountAuth])
  .handler(async ({ context }) => {
    const { requireAdmin } = await import("@/lib/account.server");
    await requireAdmin(context.userId);
    const db = await adminClient();
    const { data, error } = await db
      .from("issue_reports")
      .select(
        "id, user_id, email, subject, message, attachments, status, admin_note, created_at, updated_at",
      )
      .neq("status", "pending_upload")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return Promise.all(
      (data ?? []).map(async (row: Record<string, unknown> & { attachments?: unknown }) => ({
        ...row,
        attachments: await Promise.all(
          ((row.attachments ?? []) as Array<Record<string, unknown> & { path: string }>).map(
            async (file) => {
              const { data: signed } = await db.storage
                .from(BUCKET)
                .createSignedUrl(file.path, 60 * 60);
              return { ...file, download_url: signed?.signedUrl ?? null };
            },
          ),
        ),
      })),
    );
  });

const updateTicketSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "in_progress", "resolved"]),
  admin_note: z.string().trim().max(5000).default(""),
});

export const updateReportTicketFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((input: unknown) => updateTicketSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { requireAdmin } = await import("@/lib/account.server");
    await requireAdmin(context.userId);
    const db = await adminClient();
    const { error } = await db
      .from("issue_reports")
      .update({
        status: data.status,
        admin_note: data.admin_note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .neq("status", "pending_upload");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
