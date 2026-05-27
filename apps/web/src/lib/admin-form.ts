import { z } from "zod";

export class AdminFormError extends Error {
  constructor(
    public readonly code: "VALIDATION_ERROR" | "BUSINESS_RULE_ERROR" | "NOT_FOUND",
    message: string,
  ) {
    super(message);
  }
}

export function parseAdminForm<T extends z.ZodType>(schema: T, formData: FormData): z.infer<T> {
  const raw = Object.fromEntries(formData.entries());
  const result = schema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join("; ") || "Dữ liệu không hợp lệ.";
    throw new AdminFormError("VALIDATION_ERROR", message);
  }
  return result.data;
}

export const optionalText = z.preprocess((value) => {
  const text = String(value || "").trim();
  return text || null;
}, z.string().nullable());

export const requiredText = z.preprocess(
  (value) => String(value || "").trim(),
  z.string().min(1, "Thiếu dữ liệu bắt buộc."),
);

export const moneyValue = z.preprocess((value) => {
  const numeric = Number(String(value || "0").replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}, z.number().min(0, "Số tiền không hợp lệ."));

export const positiveMoneyValue = z.preprocess((value) => {
  const numeric = Number(String(value || "0").replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}, z.number().positive("Số tiền phải lớn hơn 0."));

export const positiveIntValue = z.preprocess((value) => {
  const numeric = Math.floor(Number(value || 0));
  return Number.isFinite(numeric) ? numeric : 0;
}, z.number().int().positive("Số lượng phải lớn hơn 0."));

export const nonNegativeIntValue = z.preprocess((value) => {
  const numeric = Math.floor(Number(value || 0));
  return Number.isFinite(numeric) ? numeric : 0;
}, z.number().int().min(0, "Số lượng không hợp lệ."));
