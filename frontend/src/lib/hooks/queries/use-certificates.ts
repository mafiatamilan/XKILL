import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Certificate {
  id: string;
  title: string;
  recipientName: string;
  issueDate: string;
  verificationCode: string;
  pdfUrl?: string;
}

export function useMyCertificates() {
  return useQuery({
    queryKey: ["my-certificates"],
    queryFn: () => api.get<{ data: Certificate[] }>("/certificates/me").then((r) => r.data.data),
  });
}

export function useIssueCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; recipientEmail: string }) => api.post("/certificates", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-certificates"] }),
  });
}

export function useVerifyCertificate(code: string) {
  return useQuery({
    queryKey: ["verify-certificate", code],
    queryFn: () => api.get<Certificate>(`/certificates/verify/${code}`).then((r) => r.data),
    enabled: !!code,
  });
}

export function useDownloadCertificatePdf() {
  return useMutation({
    mutationFn: (id: string) => api.get(`/certificates/${id}/pdf`, { responseType: "blob" }).then((r) => r.data),
  });
}

export function useShareToLinkedin() {
  return useMutation({
    mutationFn: (id: string) => api.post(`/certificates/${id}/share/linkedin`).then((r) => r.data),
  });
}
