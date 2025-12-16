import { apiClient } from './client';
import type { AttachmentCreateRequest } from '../types';

export const uploadsApi = {
  upload: async (files: File[]): Promise<AttachmentCreateRequest[]> => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));

    const response = await apiClient.post<AttachmentCreateRequest[]>('/uploads', form, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },
};
