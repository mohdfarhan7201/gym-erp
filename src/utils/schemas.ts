import { z } from "zod";

export const phoneSchema = z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");
export const optionalPhone = z.string().trim().refine((v) => !v || /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit mobile number").optional();
export const optionalEmail = z.string().trim().refine((v) => !v || z.string().email().safeParse(v).success, "Enter a valid email").optional();
export const amountSchema = z.coerce.number({ invalid_type_error: "Enter an amount" }).min(0, "Can't be negative");

export const memberProfileSchema = z.object({
  photo: z.string().nullable().optional(),
  name: z.string().trim().min(3, "Full name must be at least 3 characters").max(60),
  phone: phoneSchema,
  email: optionalEmail,
  gender: z.enum(["male", "female", "other"], { required_error: "Select gender" }),
  dob: z.string().optional(),
  address: z.string().trim().min(5, "Address is required"),
  bloodGroup: z.string().optional(),
  emergencyContact: optionalPhone,
  occupation: z.string().optional(),
  notes: z.string().max(300).optional(),
});
