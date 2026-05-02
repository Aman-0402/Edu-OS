import { toast } from 'react-toastify'

const opts = { position: 'top-right', autoClose: 3000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true }

export const toastSuccess = (msg) => toast.success(msg, opts)
export const toastError   = (msg) => toast.error(msg, opts)
export const toastInfo    = (msg) => toast.info(msg, opts)
