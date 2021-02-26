import React, { useCallback } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import './index.css'

const InfoModal = (props) => {
  return (
    <div className="modal-overlay">
      <div className="modal-wrapper">
        <div className="close-btn" onClick={() => props.onCloseModal()}></div>
        <div className={`modal-icon-${props.type} modal-icon`}></div>
        <div className={`modal-text-${props.type} modal-text`}>{props.text}</div>
        { props.detail ? <div className="modal-detail">{props.detail}</div> : null }
        <div className="modal-extra-text">
        {
          props.extraLink ? (
            <a className="transaction-link" target="_blank" rel="noreferrer" href={props.extraLink}>{props.extraText}</a>
          ) : props.extraText
        }
        </div>
      </div>
    </div>
  )
}

const Modal = (props) => {
  const { infoModal } = useMappedState((state) => ({
    infoModal: state.modal.infoModal
  }))
  const dispatch = useDispatch()
  const setModal = useCallback((modalType, modalDetail) => dispatch({ type: 'SET_MODAL', modalType, modalDetail }), [])

  const onCloseInfoModal = () => {
    setModal('infoModal', Object.assign({}, infoModal, { show: false }))
  }

  const buildModals = () => {
    const modals = []
    if (infoModal.show) {
      modals.push(<InfoModal {...infoModal} onCloseModal={() => onCloseInfoModal()} />)
    }
    return modals
  }

  return (
    <div className="modal-container">
      {buildModals()}
    </div>
  )
}

export default Modal