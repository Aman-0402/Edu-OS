import Swal from 'sweetalert2'

const base = {
  confirmButtonColor: '#2563eb',
  cancelButtonColor: '#64748b',
  buttonsStyling: true,
  customClass: {
    popup: '!rounded-2xl !font-sans',
    confirmButton: '!rounded-xl !text-sm !font-semibold !px-5 !py-2.5',
    cancelButton: '!rounded-xl !text-sm !font-semibold !px-5 !py-2.5',
  },
}

export async function confirmDelete(message = 'This cannot be undone.') {
  const result = await Swal.fire({
    ...base,
    title: 'Are you sure?',
    text: message,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete',
    cancelButtonText: 'Cancel',
    reverseButtons: true,
  })
  return result.isConfirmed
}

export async function confirmAction(title, text, confirmText = 'Confirm') {
  const result = await Swal.fire({
    ...base,
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancel',
    reverseButtons: true,
  })
  return result.isConfirmed
}
