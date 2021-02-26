
import { useCallback } from 'react'
import { useDispatch } from 'redux-react-hook'
import { TRANSACTION_BASE_URL, TRANSACTION_AFTERFIX } from '../config'

export const useSetInfoModal = (type, transaction, detail) => {
  const dispatch = useDispatch()
  const setModal = useCallback((modalType, modalDetail) => dispatch({ type: 'SET_MODAL', modalType, modalDetail }), [])

  setModal('infoModal', {
    show: true,
    type,
    text: type === 'success' ? 'Transaction Successful' : 'Transaction Failed',
    detail,
    extraText: type === 'success' ? 'View Transaction' : '',
    extraLink: type === 'success' ? `${TRANSACTION_BASE_URL}${transaction}${TRANSACTION_AFTERFIX}` : ''
  })

  return null
}