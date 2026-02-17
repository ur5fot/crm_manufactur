import { ref, computed, watch } from "vue";
import { api } from "../api";

export function useEmployeePhoto(form, savedFormSnapshot, selectedId) {
  const photoUploading = ref(false);
  const photoError = ref("");
  const photoInputRef = ref(null);
  const photoVersion = ref(0);

  const photoUrl = computed(() => {
    const p = form.photo;
    if (!p) return '';
    const base = import.meta.env.VITE_API_URL || '';
    return `${base ? base + '/' : ''}${p}?v=${photoVersion.value}`;
  });

  // Clear photo error when switching employees
  watch(selectedId, () => {
    photoError.value = "";
  });

  function sidebarPhotoUrl(photoPath) {
    const base = import.meta.env.VITE_API_URL || '';
    return `${base ? base + '/' : ''}${photoPath}?v=${photoVersion.value}`;
  }

  function triggerPhotoUpload() {
    photoInputRef.value?.click();
  }

  async function handlePhotoUpload(event, loadEmployees) {
    const file = event.target.files?.[0];
    if (!file || !form.employee_id) return;

    photoUploading.value = true;
    photoError.value = "";
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const result = await api.uploadEmployeePhoto(form.employee_id, formData);
      form.photo = result?.path || '';
      photoVersion.value++;
      // Only update photo in snapshot to preserve dirty state for other fields
      if (savedFormSnapshot.value) {
        savedFormSnapshot.value.photo = form.photo;
      }
      await loadEmployees(true);
    } catch (error) {
      photoError.value = error.message;
    } finally {
      photoUploading.value = false;
      // Reset input so same file can be re-selected
      if (photoInputRef.value) photoInputRef.value.value = '';
    }
  }

  async function deletePhoto(loadEmployees) {
    if (!form.employee_id || !form.photo) return;
    const confirmed = window.confirm("Видалити фото співробітника?");
    if (!confirmed) return;

    photoUploading.value = true;
    photoError.value = "";
    try {
      await api.deleteEmployeePhoto(form.employee_id);
      form.photo = '';
      photoVersion.value++;
      // Only update photo in snapshot to preserve dirty state for other fields
      if (savedFormSnapshot.value) {
        savedFormSnapshot.value.photo = form.photo;
      }
      await loadEmployees(true);
    } catch (error) {
      photoError.value = error.message;
    } finally {
      photoUploading.value = false;
    }
  }

  return {
    photoUploading,
    photoError,
    photoInputRef,
    photoVersion,
    photoUrl,
    sidebarPhotoUrl,
    triggerPhotoUpload,
    handlePhotoUpload,
    deletePhoto,
  };
}
